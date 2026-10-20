export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { NextResponse, type NextRequest } from "next/server";
import { verifyRazorpayWebhookSignature } from "@/lib/payments/razorpay";
import { executePaymentConfirmation } from "@/lib/payments/completion";

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

  // Cryptographic signature check against the raw request body (DAT-01 / SEC-07)
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
            currency?: string;
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

      if (tripId && payment?.id) {
        const rawMethod = payment.method || "card";
        const validMethod = (["upi", "card", "netbanking", "emi"].includes(rawMethod)
          ? rawMethod
          : "card") as "upi" | "card" | "netbanking" | "emi";

        // Idempotent execution: confirms payment, marks trip confirmed, and creates invoice inside one flow
        await executePaymentConfirmation({
          tripId,
          provider: "razorpay",
          providerReference: payment.id,
          method: validMethod,
          amount: payment.amount ? payment.amount / 100 : undefined,
          currency: payment.currency || "INR",
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error handling webhook";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
