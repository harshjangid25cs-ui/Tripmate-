import { createAdminClient } from "@/lib/supabase/admin";

export interface TransactionalEmailInput {
  to: string;
  template:
    | "booking_confirmed"
    | "gst_invoice_ready"
    | "driver_assigned"
    | "booking_cancelled"
    | string;
  subject: string;
  content: string;
  relatedTripId?: string;
  relatedBookingRef?: string;
  sentBy?: string;
}

/**
 * Dispatches transactional notifications via Resend REST API (if configured)
 * and guarantees immutable logging to public.email_logs in Supabase.
 */
export async function sendTransactionalEmail(input: TransactionalEmailInput): Promise<{
  ok: boolean;
  messageId?: string;
  error?: string;
}> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.TRANSACTIONAL_FROM_EMAIL || "TripMate Concierge <bookings@tripmate.in>";
  let providerMessageId: string | undefined;
  let status: "sent" | "failed" = "sent";
  let errorMessage: string | undefined;

  // 1. Dispatch real email via Resend API if API key is present
  if (resendApiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [input.to],
          subject: input.subject,
          text: input.content,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { id?: string };
        providerMessageId = data.id;
        status = "sent";
      } else {
        const errData = await res.text();
        status = "failed";
        errorMessage = errData || "Resend API rejected email dispatch.";
      }
    } catch (err: unknown) {
      status = "failed";
      errorMessage = err instanceof Error ? err.message : "Network error contacting email provider.";
    }
  } else {
    // OPS-01: When RESEND_API_KEY is missing, log status as "failed", NEVER "sent"
    status = "failed";
    errorMessage = "RESEND_API_KEY is missing. Email dispatch skipped.";
  }

  // 2. Always persist transactional log to public.email_logs in Supabase
  try {
    const supabase = createAdminClient();
    await supabase.from("email_logs").insert({
      to_email: input.to,
      template: input.template,
      subject: input.subject,
      content: input.content,
      related_trip_id: input.relatedTripId || null,
      related_booking_ref: input.relatedBookingRef || null,
      sent_by: input.sentBy || "system",
      status,
      provider_message_id: providerMessageId || null,
      error: errorMessage || null,
    });
  } catch {
    // Non-blocking for notification log failure
  }

  return {
    ok: status === "sent",
    messageId: providerMessageId,
    error: errorMessage,
  };
}
