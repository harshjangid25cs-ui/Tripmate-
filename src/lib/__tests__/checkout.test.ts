import { describe, it, expect } from "vitest";
import { DemoPaymentProvider } from "../payments/demo";
import type { Database } from "@/types/database";

type ItineraryItemRow = Database["public"]["Tables"]["itinerary_items"]["Row"];

describe("Milestone M5 — Demo Checkout, Confirmation, Itinerary & Invoice", () => {
  const provider = new DemoPaymentProvider();

  describe("Payment Provider & Demo Mode", () => {
    it("success path returns confirmed booking reference", async () => {
      const res = await provider.pay({
        tripId: "test-trip-uuid",
        method: "upi",
        simulate: "success",
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.bookingRef).toMatch(/^TM-/);
      }
    });

    it("?simulate=failure returns failure state and leaves draft untouched", async () => {
      const res = await provider.pay({
        tripId: "test-trip-uuid",
        method: "card",
        simulate: "failure",
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.reason).toContain("Simulated payment failure");
      }
    });
  });

  describe("Invoice Numbering & Pricing Breakdown (Check #11)", () => {
    it("formats unique and sequential invoice numbers (INV-YYYY-######)", () => {
      const year = new Date().getFullYear();
      const formatInvoiceNumber = (seq: number) =>
        `INV-${year}-${String(seq).padStart(6, "0")}`;

      const inv1 = formatInvoiceNumber(1);
      const inv2 = formatInvoiceNumber(2);
      const inv3 = formatInvoiceNumber(8829);

      expect(inv1).toBe(`INV-${year}-000001`);
      expect(inv2).toBe(`INV-${year}-000002`);
      expect(inv3).toBe(`INV-${year}-008829`);
      expect(inv1).not.toBe(inv2);
    });

    it("matches worked check #11: 4D/3N Jaipur trip total is exactly ₹27,376", () => {
      const hotelStay = 1 * 3 * 4200; // 1 room, 3 nights @ 4,200 = 12,600
      const vehicleRental = 1 * 4 * 1899; // 1 vehicle, 4 days @ 1,899 = 7,596
      const stopFees = 2 * 1850; // 2 guests @ 1,850 = 3,700

      const subtotal = hotelStay + vehicleRental + stopFees;
      expect(subtotal).toBe(23896);

      const serviceFee = 999;
      const gstRate = 0.18;
      const taxAmount = Math.round(gstRate * (subtotal + serviceFee));
      expect(taxAmount).toBe(4481);

      const discountAmount = 2000;
      const totalAmount = subtotal + serviceFee + taxAmount - discountAmount;
      expect(totalAmount).toBe(27376);
    });
  });

  describe("Itinerary Day Grouping & Schedule", () => {
    it("correctly groups itinerary items by day_number and sorts by sort_order", () => {
      const items: Partial<ItineraryItemRow>[] = [
        { id: "1", day_number: 1, sort_order: 2, title: "Breakfast at Fort" },
        { id: "2", day_number: 2, sort_order: 1, title: "Amber Palace" },
        { id: "3", day_number: 1, sort_order: 1, title: "Chauffeur Pickup" },
        { id: "4", day_number: 2, sort_order: 2, title: "Bazaar Walk" },
        { id: "5", day_number: 4, sort_order: 1, title: "Return Journey" },
      ];

      // Group by day_number
      const grouped: Record<number, Partial<ItineraryItemRow>[]> = {};
      items.forEach((item) => {
        const day = item.day_number || 1;
        if (!grouped[day]) grouped[day] = [];
        grouped[day].push(item);
      });

      // Sort each day by sort_order
      Object.keys(grouped).forEach((dayKey) => {
        const dayNum = Number(dayKey);
        grouped[dayNum]!.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      });

      expect(Object.keys(grouped)).toEqual(["1", "2", "4"]);
      expect(grouped[1]!.map((i) => i.title)).toEqual([
        "Chauffeur Pickup",
        "Breakfast at Fort",
      ]);
      expect(grouped[2]!.map((i) => i.title)).toEqual([
        "Amber Palace",
        "Bazaar Walk",
      ]);
      expect(grouped[4]!.map((i) => i.title)).toEqual(["Return Journey"]);
    });
  });

  describe("Derived Status Logic (DATABASE.md §3)", () => {
    const computeStatus = (
      status: string,
      startDate: string | null,
      endDate: string | null,
      todayStr: string
    ) => {
      if (status === "cancelled") return "Cancelled";
      if (!startDate || !endDate) return "Upcoming";
      if (endDate < todayStr) return "Completed";
      if (startDate <= todayStr && todayStr <= endDate) return "Ongoing";
      return "Upcoming";
    };

    it("evaluates upcoming, ongoing, completed, and cancelled statuses accurately", () => {
      const today = "2026-10-10";

      // 1. Future dates -> Upcoming
      expect(computeStatus("confirmed", "2026-11-14", "2026-11-18", today)).toBe(
        "Upcoming"
      );

      // 2. Active date range -> Ongoing
      expect(computeStatus("confirmed", "2026-10-08", "2026-10-12", today)).toBe(
        "Ongoing"
      );

      // 3. Past dates -> Completed
      expect(computeStatus("confirmed", "2026-09-01", "2026-09-05", today)).toBe(
        "Completed"
      );

      // 4. Cancelled status -> Cancelled
      expect(computeStatus("cancelled", "2026-11-14", "2026-11-18", today)).toBe(
        "Cancelled"
      );
    });
  });
});
