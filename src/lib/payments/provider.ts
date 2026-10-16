import { demoPaymentProvider } from "./demo";
import { RazorpayPaymentProvider } from "./razorpay";

export interface PaymentProvider {
  readonly id: "demo" | "razorpay";
  pay(input: {
    tripId: string;
    method: string;
    simulate?: "success" | "failure";
  }): Promise<{ ok: true; bookingRef: string } | { ok: false; reason: string }>;
}

export function getActivePaymentProvider(): PaymentProvider {
  if (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    return new RazorpayPaymentProvider();
  }
  return demoPaymentProvider;
}
