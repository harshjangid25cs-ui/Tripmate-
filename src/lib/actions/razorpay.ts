"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createRazorpayOrderSchema,
  verifyRazorpayPaymentSchema,
  type VerifyRazorpayPaymentInput,
} from "@/lib/validations/actions";
import { sendTransactionalEmail } from "@/lib/notifications/email";

/**
 * Creates an authorized Razorpay Order via Razorpay REST API
 */
export async function createRazorpayOrderAction(tripId: string): Promise<{
  ok: boolean;
  orderId?: string;
  amount?: number;
  currency?: string;
  keyId?: string;
  error?: string;
}> {
  const parse = createRazorpayOrderSchema.safeParse({ tripId });
  if (!parse.success) {
    return { ok: false, error: parse.error.issues[0]?.message ?? "Invalid trip ID." };
  }

  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return {
      ok: false,
      error: "Razorpay credentials are not configured. Falling back to Demo checkout.",
    };
  }

  try {
    const supabase = await createClient();
    const { data: trip, error: tripErr } = await supabase
      .from("trips")
      .select("id, booking_ref, total_amount, currency, user_id")
      .eq("id", tripId)
      .single();

    if (tripErr || !trip) {
      return { ok: false, error: "Trip not found." };
    }

    const amountInPaise = Math.round(Number(trip.total_amount) * 100);

    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt: trip.booking_ref || trip.id.slice(0, 10),
        notes: {
          tripId: trip.id,
          bookingRef: trip.booking_ref,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, error: `Razorpay Order creation failed: ${errText}` };
    }

    const orderData = (await res.json()) as { id: string; amount: number; currency: string };

    return {
      ok: true,
      orderId: orderData.id,
      amount: orderData.amount,
      currency: orderData.currency || "INR",
      keyId,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected error creating Razorpay order.";
    return { ok: false, error: msg };
  }
}

/**
 * Validates HMAC SHA-256 signature and confirms the trip booking
 */
export async function verifyRazorpayPaymentAction(
  rawInput: VerifyRazorpayPaymentInput
): Promise<{
  ok: boolean;
  bookingRef?: string;
  error?: string;
}> {
  const parse = verifyRazorpayPaymentSchema.safeParse(rawInput);
  if (!parse.success) {
    return { ok: false, error: parse.error.issues[0]?.message ?? "Invalid payment signature input." };
  }

  const { tripId, razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentMethod } = parse.data;

  // 1. Verify HMAC SHA-256 signature
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return { ok: false, error: "Razorpay Key Secret is missing on the server." };
  }

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "utf-8");
  const receivedBuffer = Buffer.from(razorpay_signature, "utf-8");

  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    return { ok: false, error: "Razorpay signature verification failed. Payment cannot be confirmed." };
  }

  // 2. Signature is authentic: execute trip confirmation in database
  const supabase = createAdminClient();

  try {
    const { data: trip, error: tripErr } = await supabase
      .from("trips")
      .select("id, booking_ref, total_amount, currency, user_id")
      .eq("id", tripId)
      .single();

    if (tripErr || !trip) {
      return { ok: false, error: "Trip record not found." };
    }

    const { data: profile } = trip.user_id
      ? await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", trip.user_id)
          .single()
      : { data: null };

    // Mark trip confirmed
    await supabase
      .from("trips")
      .update({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", tripId);

    // Record verified payment row
    const validMethod = (["upi", "card", "netbanking", "emi"].includes(paymentMethod)
      ? paymentMethod
      : "upi") as "upi" | "card" | "netbanking" | "emi";

    await supabase.from("payments").insert({
      trip_id: tripId,
      user_id: trip.user_id,
      amount: Number(trip.total_amount),
      currency: trip.currency || "INR",
      method: validMethod,
      provider: "razorpay",
      status: "succeeded",
      provider_reference: razorpay_payment_id,
    });

    // 3. Dispatch automated confirmation email & audit trail
    if (profile?.email) {
      await sendTransactionalEmail({
        to: profile.email,
        template: "booking_confirmed",
        subject: `Booking Confirmed #${trip.booking_ref} - TripMate`,
        content: `Namaste ${profile.full_name || "Traveler"},\n\nYour TripMate journey (Ref #${trip.booking_ref}) has been successfully confirmed. Payment ID: ${razorpay_payment_id}.\n\nAccess your live itinerary and driver assignment details in your profile.`,
        relatedTripId: tripId,
        relatedBookingRef: trip.booking_ref,
        sentBy: "Razorpay Payment Gateway",
      });
    }

    revalidatePath(`/book/${tripId}`, "layout");
    revalidatePath("/admin");

    return {
      ok: true,
      bookingRef: trip.booking_ref,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error recording verified payment.";
    return { ok: false, error: msg };
  }
}
