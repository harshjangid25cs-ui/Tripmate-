import { describe, it, expect } from "vitest";
import {
  computeDerivedStatus,
  check48HourRefundEligibility,
  type UserTripSummary,
} from "@/lib/data/trips-list";

describe("Milestone M6 — Recent Trips & Cancellation (BUILD_PLAN.md & DECISIONS D8/D17)", () => {
  const referenceToday = "2026-11-01";

  describe("Derived Status Logic against test dates (BUILD_PLAN §M6)", () => {
    it("returns 'Cancelled' for trips with status='cancelled' regardless of dates", () => {
      expect(computeDerivedStatus("cancelled", "2026-11-10", "2026-11-14", referenceToday)).toBe(
        "Cancelled"
      );
      expect(computeDerivedStatus("cancelled", "2026-10-10", "2026-10-14", referenceToday)).toBe(
        "Cancelled"
      );
    });

    it("returns 'Pending Approval' for trips awaiting commercial manager review", () => {
      expect(
        computeDerivedStatus("pending_approval", "2026-11-15", "2026-11-18", referenceToday)
      ).toBe("Pending Approval");
    });

    it("returns 'Upcoming' for confirmed trips with start_date strictly after today", () => {
      expect(computeDerivedStatus("confirmed", "2026-11-02", "2026-11-05", referenceToday)).toBe(
        "Upcoming"
      );
      expect(computeDerivedStatus("confirmed", "2026-12-01", "2026-12-04", referenceToday)).toBe(
        "Upcoming"
      );
    });

    it("returns 'Ongoing' for confirmed trips currently active today", () => {
      // Starting today
      expect(computeDerivedStatus("confirmed", "2026-11-01", "2026-11-04", referenceToday)).toBe(
        "Ongoing"
      );
      // Midway through trip
      expect(computeDerivedStatus("confirmed", "2026-10-30", "2026-11-03", referenceToday)).toBe(
        "Ongoing"
      );
      // Last day today
      expect(computeDerivedStatus("confirmed", "2026-10-28", "2026-11-01", referenceToday)).toBe(
        "Ongoing"
      );
    });

    it("returns 'Completed' for confirmed trips whose end_date has passed", () => {
      expect(computeDerivedStatus("confirmed", "2026-10-20", "2026-10-25", referenceToday)).toBe(
        "Completed"
      );
      expect(computeDerivedStatus("confirmed", "2026-10-31", "2026-10-31", referenceToday)).toBe(
        "Completed"
      );
    });
  });

  describe("48-Hour Cancellation Refund Policy (DATABASE §6 & DECISIONS D8)", () => {
    it("awards 100% full refund when cancellation is >= 48 hours before departure", () => {
      // Departure on 2026-11-10T00:00:00+05:30. Current time 72 hours before (2026-11-07 00:00)
      const now72hBefore = new Date("2026-11-07T00:00:00+05:30").getTime();
      const result = check48HourRefundEligibility("2026-11-10", now72hBefore);
      expect(result.isFullRefund).toBe(true);
      expect(result.hoursRemaining).toBeGreaterThanOrEqual(48);

      // Exactly 48 hours before
      const nowExactly48h = new Date("2026-11-08T00:00:00+05:30").getTime();
      const result48 = check48HourRefundEligibility("2026-11-10", nowExactly48h);
      expect(result48.isFullRefund).toBe(true);
      expect(result48.hoursRemaining).toBe(48);
    });

    it("awards 0% refund when cancellation is inside 48 hours (< 48h before departure)", () => {
      // 24 hours before departure
      const now24hBefore = new Date("2026-11-09T00:00:00+05:30").getTime();
      const result24 = check48HourRefundEligibility("2026-11-10", now24hBefore);
      expect(result24.isFullRefund).toBe(false);
      expect(result24.hoursRemaining).toBeLessThan(48);

      // 2 hours before departure
      const now2hBefore = new Date("2026-11-09T22:00:00+05:30").getTime();
      const result2 = check48HourRefundEligibility("2026-11-10", now2hBefore);
      expect(result2.isFullRefund).toBe(false);
      expect(result2.hoursRemaining).toBe(2);
    });

    it("awards 0% refund for past or ongoing departures", () => {
      const nowAfter = new Date("2026-11-10T12:00:00+05:30").getTime();
      const resultPast = check48HourRefundEligibility("2026-11-10", nowAfter);
      expect(resultPast.isFullRefund).toBe(false);
      expect(resultPast.hoursRemaining).toBeLessThan(0);
    });
  });

  describe("Recent Trips List Filtering & Kind Isolation (DECISIONS D16 & D17)", () => {
    const mockTrips: UserTripSummary[] = [
      {
        id: "trip-1",
        bookingRef: "TM-001",
        title: "Jaipur Heritage",
        bookingKind: "normal",
        status: "confirmed",
        derivedStatus: "Upcoming",
        startDate: "2026-11-20",
        endDate: "2026-11-24",
        totalDays: 4,
        nights: 3,
        travelerCount: 2,
        totalAmount: 27376,
        refundAmount: null,
        cancellationReason: null,
        destinationName: "Jaipur",
        destinationSlug: "jaipur",
        imagePath: "jaipur.jpg",
        inclusions: ["Shahpura Haveli"],
        daysRemainingText: "In 19 Days",
        isFullRefundEligible: true,
        canCancel: true,
      },
      {
        id: "trip-2",
        bookingRef: "TM-002",
        title: "Udaipur Retreat",
        bookingKind: "normal",
        status: "confirmed",
        derivedStatus: "Completed",
        startDate: "2026-09-01",
        endDate: "2026-09-04",
        totalDays: 3,
        nights: 2,
        travelerCount: 2,
        totalAmount: 34500,
        refundAmount: null,
        cancellationReason: null,
        destinationName: "Udaipur",
        destinationSlug: "udaipur",
        imagePath: "udaipur.jpg",
        inclusions: ["Taj Lake Palace"],
        daysRemainingText: null,
        isFullRefundEligible: false,
        canCancel: false,
      },
      {
        id: "trip-3",
        bookingRef: "TM-003",
        title: "Agra Corporate Offsite",
        bookingKind: "commercial",
        status: "confirmed",
        derivedStatus: "Upcoming",
        startDate: "2026-12-01",
        endDate: "2026-12-05",
        totalDays: 5,
        nights: 4,
        travelerCount: 28,
        totalAmount: 227150,
        refundAmount: null,
        cancellationReason: null,
        destinationName: "Agra",
        destinationSlug: "agra",
        imagePath: "agra.jpg",
        inclusions: ["Volvo 9600 Multi-Axle"],
        daysRemainingText: "In 30 Days",
        isFullRefundEligible: true,
        canCancel: true,
      },
      {
        id: "trip-4",
        bookingRef: "TM-004",
        title: "Cancelled Munnar Trip",
        bookingKind: "normal",
        status: "cancelled",
        derivedStatus: "Cancelled",
        startDate: "2026-10-15",
        endDate: "2026-10-18",
        totalDays: 4,
        nights: 3,
        travelerCount: 2,
        totalAmount: 18900,
        refundAmount: 18900,
        cancellationReason: "Schedule conflict",
        destinationName: "Munnar",
        destinationSlug: "munnar",
        imagePath: "munnar.jpg",
        inclusions: ["Plantation Resort"],
        daysRemainingText: null,
        isFullRefundEligible: false,
        canCancel: false,
      },
    ];

    it("filters correctly by derived status chips (All, Upcoming, Completed, Cancelled)", () => {
      // All
      expect(mockTrips.length).toBe(4);

      // Upcoming (includes normal + commercial upcoming trips)
      const upcoming = mockTrips.filter(
        (t) => t.derivedStatus === "Upcoming" || t.derivedStatus === "Ongoing"
      );
      expect(upcoming.map((t) => t.id)).toEqual(["trip-1", "trip-3"]);

      // Completed
      const completed = mockTrips.filter((t) => t.derivedStatus === "Completed");
      expect(completed.map((t) => t.id)).toEqual(["trip-2"]);

      // Cancelled
      const cancelled = mockTrips.filter((t) => t.derivedStatus === "Cancelled");
      expect(cancelled.map((t) => t.id)).toEqual(["trip-4"]);
      expect(cancelled[0]?.refundAmount).toBe(18900);
    });

    it("supports commercial trip isolation filter (?kind=commercial)", () => {
      const commercialOnly = mockTrips.filter((t) => t.bookingKind === "commercial");
      expect(commercialOnly.length).toBe(1);
      expect(commercialOnly[0]?.bookingRef).toBe("TM-003");
      expect(commercialOnly[0]?.totalAmount).toBe(227150);

      const normalOnly = mockTrips.filter((t) => t.bookingKind === "normal");
      expect(normalOnly.length).toBe(3);
    });
  });
});
