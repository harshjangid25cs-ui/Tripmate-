import crypto from "crypto";
import type { PaymentProvider } from "./provider";
import { createRazorpayOrderAction, verifyRazorpayPaymentAction } from "@/lib/actions/razorpay";

export { createRazorpayOrderAction, verifyRazorpayPaymentAction };

/**
 * Pure HMAC-SHA256 signature verification helper for webhooks
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    return (
      expected.length === signature.length &&
      crypto.timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(signature, "utf8"))
    );
  } catch {
    return false;
  }
}

/**
 * Razorpay Payment Provider implementing PaymentProvider
 */
export class RazorpayPaymentProvider implements PaymentProvider {
  readonly id = "razorpay" as const;

  async pay(input: {
    tripId: string;
    method: string;
    simulate?: "success" | "failure";
  }): Promise<{ ok: true; bookingRef: string } | { ok: false; reason: string }> {
    if (input.simulate === "failure") {
      return { ok: false, reason: "Payment rejected by gateway." };
    }
    const orderRes = await createRazorpayOrderAction(input.tripId);
    if (!orderRes.ok) {
      return { ok: false, reason: orderRes.error || "Failed to initialize Razorpay payment." };
    }
    return { ok: true, bookingRef: orderRes.orderId || "TM-RZP" };
  }
}
