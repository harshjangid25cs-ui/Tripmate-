import { createAdminClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail } from "@/lib/notifications/email";

export interface ExecutePaymentConfirmationInput {
  tripId: string;
  provider: "razorpay" | "demo";
  providerReference: string;
  method?: "upi" | "card" | "netbanking" | "emi";
  amount?: number;
  currency?: string;
}

export interface ExecutePaymentConfirmationResult {
  ok: boolean;
  tripId?: string;
  bookingRef?: string;
  invoiceNumber?: string;
  paymentId?: string;
  alreadyProcessed?: boolean;
  error?: string;
}

/**
 * executePaymentConfirmation()
 * Delegates the core transactional payment confirmation to ONE atomic Postgres RPC
 * (confirm_payment_and_finalize_trip).
 *
 * In a single database transaction, the RPC:
 * 1. Locks the trip row exclusively (SELECT ... FOR UPDATE)
 * 2. Verifies the paid amount equals the trip total
 * 3. Records the payment (ON CONFLICT DO NOTHING)
 * 4. Sets trip status to confirmed and executes finalize_booking
 * 5. Generates the invoice only if none exists, using a DB sequence (invoice_number_seq)
 * 6. Returns booking_ref, invoice_number, and already_processed flag
 *
 * This guarantees strict idempotency, eliminates race conditions between simultaneous
 * webhooks and client callbacks, and ensures invoice numbers are never regenerated.
 */
export async function executePaymentConfirmation(
  input: ExecutePaymentConfirmationInput
): Promise<ExecutePaymentConfirmationResult> {
  const { tripId, provider, providerReference, method = "card", amount, currency } = input;

  if (!tripId || !providerReference) {
    return { ok: false, error: "Trip ID and provider reference are required." };
  }

  const supabase = createAdminClient();

  const validMethod = (["upi", "card", "netbanking", "emi"].includes(method)
    ? method
    : "card") as "upi" | "card" | "netbanking" | "emi";

  try {
    // 1. Call the single atomic Postgres RPC transaction
    const { data: rpcData, error: rpcErr } = await (
      supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{
        data: {
          ok: boolean;
          trip_id: string;
          booking_ref: string;
          invoice_number: string;
          payment_id: string;
          already_processed: boolean;
        } | null;
        error: { message: string } | null;
      }>
    )("confirm_payment_and_finalize_trip", {
      p_trip_id: tripId,
      p_provider: provider,
      p_provider_reference: providerReference,
      p_method: validMethod,
      p_amount: amount !== undefined ? amount : null,
      p_currency: currency || "INR",
    });

    if (rpcErr || !rpcData) {
      return {
        ok: false,
        error: rpcErr?.message || "Failed to confirm payment transaction.",
      };
    }

    // 2. Send transactional confirmation email once (only for fresh processing)
    if (!rpcData.already_processed) {
      const { data: trip } = await supabase
        .from("trips")
        .select("user_id")
        .eq("id", tripId)
        .maybeSingle();

      if (trip?.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", trip.user_id)
          .maybeSingle();

        if (profile?.email) {
          await sendTransactionalEmail({
            to: profile.email,
            template: "booking_confirmed",
            subject: `Booking Confirmed #${rpcData.booking_ref} - TripMate`,
            content: `Namaste ${profile.full_name || "Traveler"},\n\nYour TripMate journey #${rpcData.booking_ref} is confirmed. Invoice #${rpcData.invoice_number}.`,
            relatedTripId: rpcData.trip_id,
            relatedBookingRef: rpcData.booking_ref,
            sentBy: "TripMate Payment Engine",
          });
        }
      }
    }

    return {
      ok: true,
      tripId: rpcData.trip_id,
      bookingRef: rpcData.booking_ref,
      invoiceNumber: rpcData.invoice_number,
      paymentId: rpcData.payment_id,
      alreadyProcessed: rpcData.already_processed,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error executing payment confirmation.";
    return { ok: false, error: message };
  }
}
