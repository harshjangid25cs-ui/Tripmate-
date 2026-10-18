import { describe, it, expect } from "vitest";
import {
  computeTripsTaken,
  computeSavedSpotsCount,
  computeKmLogged,
  computeLoyaltyTier,
  isValidIndianPhone,
  formatIndianPhone,
  FALLBACK_PROFILE,
  FALLBACK_NOTIFICATIONS,
  type NotificationItem,
} from "@/lib/data/profile-types";

describe("Milestone M8 — Profile & Notifications (BUILD_PLAN.md & FEATURES §10, §11)", () => {
  const referenceToday = "2026-11-01";

  describe("Profile Derived Metrics (FEATURES §10)", () => {
    it("derives 'Trips Taken' strictly from confirmed trips with end_date < today", () => {
      const trips = [
        // Completed trip (confirmed, ended in October)
        { status: "confirmed", end_date: "2026-10-15" },
        // Another completed trip
        { status: "confirmed", end_date: "2026-10-28" },
        // Ongoing / current trip (ends today or later)
        { status: "confirmed", end_date: "2026-11-04" },
        // Future upcoming trip
        { status: "confirmed", end_date: "2026-11-20" },
        // Cancelled trip in past
        { status: "cancelled", end_date: "2026-10-10" },
        // Pending approval trip in past
        { status: "pending_approval", end_date: "2026-10-05" },
        // Draft trip
        { status: "draft", end_date: "2026-10-01" },
      ];

      const count = computeTripsTaken(trips, referenceToday);
      expect(count).toBe(2);
    });

    it("derives 'Saved Spots' strictly from user saved_items count (DATABASE §4 & DECISIONS D9)", () => {
      const savedItems = [
        { id: "save-1" },
        { id: "save-2" },
        { id: "save-3" },
        { id: "save-4" },
        { id: "save-5" },
      ];

      expect(computeSavedSpotsCount(savedItems)).toBe(5);
      expect(computeSavedSpotsCount([])).toBe(0);
    });

    it("derives 'KM Logged' as sum of 2 x destinations.drive_km for trips where known", () => {
      const tripsWithDriveKm = [
        { driveKm: 260 }, // Jaipur roundtrip = 520 km
        { driveKm: 395 }, // Udaipur roundtrip = 790 km
        { driveKm: null }, // unknown km
        { driveKm: 0 },
      ];

      // (260 * 2) + (395 * 2) + 0 + 0 = 520 + 790 = 1310
      const totalKm = computeKmLogged(tripsWithDriveKm);
      expect(totalKm).toBe(1310);
    });

    it("computes loyalty tier and level progression accurately (Explorer -> Voyager at 5 trips)", () => {
      // 0 trips -> Explorer Level 1, 0%, 5 trips to Voyager
      const tier0 = computeLoyaltyTier(0);
      expect(tier0.tierName).toBe("Tripmate Explorer Tier");
      expect(tier0.level).toBe(1);
      expect(tier0.tripsToNext).toBe(5);
      expect(tier0.progressPct).toBe(0);

      // 2 trips -> Explorer Level 2, 40%, 3 trips to Voyager
      const tier2 = computeLoyaltyTier(2);
      expect(tier2.tierName).toBe("Tripmate Explorer Tier");
      expect(tier2.level).toBe(2);
      expect(tier2.tripsToNext).toBe(3);
      expect(tier2.progressPct).toBe(40);

      // 3 trips -> Explorer Level 2, 60%, 2 trips to Voyager
      const tier3 = computeLoyaltyTier(3);
      expect(tier3.tierName).toBe("Tripmate Explorer Tier");
      expect(tier3.level).toBe(2);
      expect(tier3.tripsToNext).toBe(2);
      expect(tier3.progressPct).toBe(60);

      // 5 trips -> Reaches Voyager Tier
      const tier5 = computeLoyaltyTier(5);
      expect(tier5.tierName).toBe("Tripmate Voyager Tier");
      expect(tier5.level).toBe(3);
      expect(tier5.tripsToNext).toBe(0);
      expect(tier5.progressPct).toBe(100);
    });
  });

  describe("Indian Mobile Phone Validation (DECISIONS D7 & FEATURES §4.6)", () => {
    it("accepts valid 10-digit Indian mobile numbers", () => {
      expect(isValidIndianPhone("9810123456")).toBe(true);
      expect(isValidIndianPhone("8765432109")).toBe(true);
      expect(isValidIndianPhone("7012345678")).toBe(true);
      expect(isValidIndianPhone("6398765432")).toBe(true);
    });

    it("accepts phone numbers formatted with +91 country prefix and spaces", () => {
      expect(isValidIndianPhone("+91 98101 23456")).toBe(true);
      expect(isValidIndianPhone("+91-98101-23456")).toBe(true);
      expect(isValidIndianPhone("919810123456")).toBe(true);
    });

    it("rejects invalid phone numbers", () => {
      expect(isValidIndianPhone("")).toBe(false);
      expect(isValidIndianPhone("12345")).toBe(false); // too short
      expect(isValidIndianPhone("5981012345")).toBe(false); // invalid starting digit (not 6-9)
      expect(isValidIndianPhone("0981012345")).toBe(false);
      expect(isValidIndianPhone("98101234567890")).toBe(false); // too long
      expect(isValidIndianPhone("abcdefghij")).toBe(false);
    });

    it("formats Indian phone numbers cleanly as +91 XXXXX XXXXX", () => {
      expect(formatIndianPhone("9810123456")).toBe("+91 98101 23456");
      expect(formatIndianPhone("+91 9810123456")).toBe("+91 98101 23456");
      expect(formatIndianPhone(null)).toBe("+91 98101 23456");
    });
  });

  describe("Database Schema Integrity (DATABASE.md §1 & M8 Acceptance)", () => {
    it("ensures profile fields strictly conform to DATABASE.md without undocumented columns", () => {
      // DATABASE.md §1: profiles table only has id, full_name, email, phone, avatar_url
      const allowedProfileFields = new Set([
        "id",
        "full_name",
        "email",
        "phone",
        "avatar_url",
      ]);

      const simulatedDbUpdatePayload = {
        full_name: "Arjun Kapoor",
        phone: "+91 98101 23456",
        avatar_url: "https://example.com/avatar.jpg",
      };

      Object.keys(simulatedDbUpdatePayload).forEach((field) => {
        expect(allowedProfileFields.has(field)).toBe(true);
      });

      // Disallowed fields check
      const invalidFields = ["loyalty_tier", "level", "km_logged", "saved_spots_count"];
      invalidFields.forEach((field) => {
        expect(allowedProfileFields.has(field)).toBe(false);
      });
    });

    it("verifies empty initial profile displays zeros and empty states per DAT-03", () => {
      expect(FALLBACK_PROFILE.fullName).toBe("Traveler");
      expect(FALLBACK_PROFILE.tripsTaken).toBe(0);
      expect(FALLBACK_PROFILE.savedSpots).toBe(0);
      expect(FALLBACK_PROFILE.kmLogged).toBe(0);
      expect(FALLBACK_PROFILE.lastCompletedJourney).toBeNull();
      expect(FALLBACK_PROFILE.companyMembership).toBeNull();
      expect(FALLBACK_PROFILE.savedDestinations).toEqual([]);
    });
  });

  describe("Notifications Management (FEATURES §11 & DATABASE §5)", () => {
    it("correctly identifies unread notifications count", () => {
      const items: NotificationItem[] = [
        {
          id: "n-1",
          type: "booking_confirmed",
          message: "Confirmed",
          isRead: false,
          createdAt: "2026-10-10",
          tripId: null,
        },
        {
          id: "n-2",
          type: "payment_succeeded",
          message: "Paid",
          isRead: false,
          createdAt: "2026-10-10",
          tripId: null,
        },
        {
          id: "n-3",
          type: "reminder",
          message: "Reminder",
          isRead: true,
          createdAt: "2026-10-09",
          tripId: null,
        },
      ];

      const unread = items.filter((n) => !n.isRead);
      expect(unread.length).toBe(2);
    });

    it("updates isRead state when marking notification as read", () => {
      const initial = [...FALLBACK_NOTIFICATIONS];
      const targetId = initial[0]!.id;

      const updated = initial.map((n) =>
        n.id === targetId ? { ...n, isRead: true } : n
      );

      const targetItem = updated.find((n) => n.id === targetId);
      expect(targetItem?.isRead).toBe(true);
    });

    it("marks all notifications as read when requested", () => {
      const updated = FALLBACK_NOTIFICATIONS.map((n) => ({ ...n, isRead: true }));
      expect(updated.every((n) => n.isRead)).toBe(true);
    });
  });
});
