export interface PaymentProvider {
  readonly id: "demo" | "razorpay";
  pay(input: {
    tripId: string;
    method: string;
    simulate?: "success" | "failure";
  }): Promise<{ ok: true; bookingRef: string } | { ok: false; reason: string }>;
}
