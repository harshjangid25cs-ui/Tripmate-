import { NextResponse, type NextRequest } from "next/server";
import { verifyRazorpayWebhookSignature } from "@/lib/payments/razorpay";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail } from "@/lib/notifications/email";

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook secret is not configured on the server." },
      { status: 500 }
    );
  }

  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing x-razorpay-signature header." },
      { status: 400 }
    );
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { error: "Failed to read request payload." },
      { status: 400 }
    );
  }

  const isValid = verifyRazorpayWebhookSignature(rawBody, signature, webhookSecret);
  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid webhook cryptographic signature." },
      { status: 401 }
    );
  }

  try {
    const event = JSON.parse(rawBody) as {
      event: string;
      payload?: {
        payment?: {
          entity?: {
            id: string;
            amount: number;
            method?: string;
            notes?: { tripId?: string; bookingRef?: string };
            email?: string;
            contact?: string;
          };
        };
        order?: {
          entity?: {
            id: string;
            notes?: { tripId?: string; bookingRef?: string };
          };
        };
      };
    };

    if (event.event === "payment.captured" || event.event === "order.paid") {
      const payment = event.payload?.payment?.entity;
      const order = event.payload?.order?.entity;
      const tripId = payment?.notes?.tripId || order?.notes?.tripId;

      if (tripId) {
        const supabase = createAdminClient();

        // 1. Fetch trip
        const { data: trip } = await supabase
          .from("trips")
          .select("id, booking_ref, total_amount, currency, user_id")
          .eq("id", tripId)
          .single();

        if (trip) {
          const { data: profile } = trip.user_id
            ? await supabase
                .from("profiles")
                .select("full_name, email")
                .eq("id", trip.user_id)
                .single()
            : { data: null };

          // 2. Mark confirmed
          await supabase
            .from("trips")
            .update({
              status: "confirmed",
              confirmed_at: new Date().toISOString(),
            })
            .eq("id", tripId);

          // 3. Record payment
          if (payment?.id) {
            const rawMethod = payment.method || "card";
            const validMethod = (["upi", "card", "netbanking", "emi"].includes(rawMethod)
              ? rawMethod
              : "card") as "upi" | "card" | "netbanking" | "emi";

            await supabase.from("payments").insert({
              trip_id: tripId,
              user_id: trip.user_id,
              amount: Number(trip.total_amount),
              currency: trip.currency || "INR",
              method: validMethod,
              provider: "razorpay",
              status: "succeeded",
              provider_reference: payment.id,
            });
          }

          // 4. Send email
          if (profile?.email) {
            await sendTransactionalEmail({
              to: profile.email,
              template: "booking_confirmed",
              subject: `Booking Confirmed #${trip.booking_ref} - TripMate`,
              content: `Namaste ${profile.full_name || "Traveler"},\n\nYour TripMate journey #${trip.booking_ref} has been confirmed via Razorpay Webhook.`,
              relatedTripId: trip.id,
              relatedBookingRef: trip.booking_ref,
              sentBy: "Razorpay Webhook Handler",
            });
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error handling webhook";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
