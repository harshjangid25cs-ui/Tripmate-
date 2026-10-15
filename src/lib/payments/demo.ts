import type { PaymentProvider } from "./provider";

/**
 * Demo Payment Provider
 * Implements simulated payments for demo mode without real gateways.
 * Under M5 this handles simulated checkout authorization and references.
 */
export class DemoPaymentProvider implements PaymentProvider {
  readonly id = "demo" as const;

  async pay(input: {
    tripId: string;
    method: string;
    simulate?: "success" | "failure";
  }): Promise<{ ok: true; bookingRef: string } | { ok: false; reason: string }> {
    if (input.simulate === "failure") {
      return {
        ok: false,
        reason: "Simulated payment failure (Demo mode test)",
      };
    }

    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    return {
      ok: true,
      bookingRef: `TM-${randomSuffix}`,
    };
  }
}

export const demoPaymentProvider = new DemoPaymentProvider();

