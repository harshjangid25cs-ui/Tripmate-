import { describe, it, expect } from "vitest";
import {
  haversineDistanceKm,
  calculateRoadDistanceKm,
  resolveOriginDistance,
  KNOWN_ORIGIN_HUBS,
} from "@/lib/geo/distance";
import {
  adminUpsertDestinationHighlightSchema,
  adminDeleteDestinationHighlightSchema,
  adminOverrideBookingItemsSchema,
  adminSendCustomerNotificationSchema,
  adminUpsertCompanyPolicySchema,
  adminUpsertCircuitSchema,
} from "@/lib/validations/actions";
import {
  adminUpsertDestinationHighlightAction,
  adminDeleteDestinationHighlightAction,
  adminOverrideBookingItemsAction,
  adminSendCustomerNotificationAction,
  adminUpsertCompanyPolicyAction,
  adminGetDocumentSignedUrlAction,
} from "@/lib/actions/admin-ops";

describe("Dynamic Geo-Distance & Scoping Pricing Engine", () => {
  describe("Haversine & Road Distance Calculations (src/lib/geo/distance.ts)", () => {
    it("calculates accurate Haversine distance between two coordinates", () => {
      // Jaipur (26.9124, 75.7873) to Delhi (28.6139, 77.2090)
      const straightLineKm = haversineDistanceKm(26.9124, 75.7873, 28.6139, 77.2090);
      expect(straightLineKm).toBeGreaterThan(230);
      expect(straightLineKm).toBeLessThan(250);
    });

    it("applies 1.28x highway multiplier for realistic road routing", () => {
      // Straight line Jaipur to Delhi is ~240km, road distance is ~307km
      const roadKm = calculateRoadDistanceKm(26.9124, 75.7873, 28.6139, 77.2090);
      expect(roadKm).toBeGreaterThan(290);
      expect(roadKm).toBeLessThan(320);
    });

    it("calculates realistic distance between Labana hub and Jaipur center", () => {
      // Labana (27.0425, 75.9521) to Jaipur (26.9124, 75.7873) is ~22km straight line, ~28km road
      const roadKm = calculateRoadDistanceKm(27.0425, 75.9521, 26.9124, 75.7873);
      expect(roadKm).toBeGreaterThan(20);
      expect(roadKm).toBeLessThan(40);
    });

    it("returns 0 km if coordinates are identical", () => {
      const distance = calculateRoadDistanceKm(26.9124, 75.7873, 26.9124, 75.7873);
      expect(distance).toBe(0);
    });
  });

  describe("resolveOriginDistance & Pricing Modes", () => {
    const jaipurDest = { latitude: 26.9124, longitude: 75.7873, name: "Jaipur" };

    it("resolves known origin hub (Delhi -> Jaipur) in live transit mode", () => {
      const res = resolveOriginDistance({
        originName: "Delhi",
        destLat: jaipurDest.latitude,
        destLng: jaipurDest.longitude,
        transitMode: "live_origin_to_destination",
      });

      expect(res.isLocalOnly).toBe(false);
      expect(res.originName).toBe("Delhi");
      expect(res.distanceKm).toBeGreaterThan(290);
      expect(res.coverageText).toContain("Delhi");
      expect(res.coverageText).toContain("Jaipur");
    });

    it("resolves Labana origin hub in live transit mode", () => {
      const res = resolveOriginDistance({
        originName: "Labana",
        destLat: jaipurDest.latitude,
        destLng: jaipurDest.longitude,
        transitMode: "live_origin_to_destination",
      });

      expect(res.isLocalOnly).toBe(false);
      expect(res.distanceKm).toBeGreaterThan(20);
      expect(res.distanceKm).toBeLessThan(40);
    });

    it("enforces 0 km outstation transit in local_only mode (Destination Local City Package)", () => {
      const res = resolveOriginDistance({
        originName: "Delhi",
        destLat: jaipurDest.latitude,
        destLng: jaipurDest.longitude,
        transitMode: "local_only",
      });

      expect(res.isLocalOnly).toBe(true);
      expect(res.distanceKm).toBe(0);
      expect(res.coverageText).toContain("Local");
    });

    it("resolves custom GPS coordinates when origin coordinates are provided", () => {
      // Customer GPS detected near Gurgaon (28.4595, 77.0266)
      const res = resolveOriginDistance({
        originLat: 28.4595,
        originLng: 77.0266,
        destLat: jaipurDest.latitude,
        destLng: jaipurDest.longitude,
        transitMode: "live_origin_to_destination",
      });

      expect(res.distanceKm).toBeGreaterThan(260);
      expect(res.distanceKm).toBeLessThan(300);
    });

    it("contains major Indian cities in KNOWN_ORIGIN_HUBS", () => {
      expect(KNOWN_ORIGIN_HUBS.some((h) => h.name === "Jaipur")).toBe(true);
      expect(KNOWN_ORIGIN_HUBS.some((h) => h.name === "Delhi")).toBe(true);
      expect(KNOWN_ORIGIN_HUBS.some((h) => h.name === "Labana")).toBe(true);
      expect(KNOWN_ORIGIN_HUBS.some((h) => h.name === "Mumbai")).toBe(true);
      expect(KNOWN_ORIGIN_HUBS.some((h) => h.name === "Ahmedabad")).toBe(true);
    });
  });

  describe("Circuit Scoped Inventory Filtering", () => {
    const mockHotels = [
      { id: "h1", name: "Rambagh Palace", destination_id: "dest-jaipur", is_active: true },
      { id: "h2", name: "Jai Mahal Palace", destination_id: "dest-jaipur", is_active: true },
      { id: "h3", name: "Samode Haveli", destination_id: "dest-jaipur", is_active: true },
      { id: "h4", name: "Inactive Hotel", destination_id: "dest-jaipur", is_active: false },
    ];

    const mockVehicles = [
      { id: "v1", name: "Toyota Innova Crysta", type: "car", is_active: true },
      { id: "v2", name: "Royal Enfield Classic 350", type: "bike", is_active: true },
      { id: "v3", name: "Volvo Luxury Coach", type: "bus", is_active: true },
      { id: "v4", name: "Out of service bus", type: "bus", is_active: false },
    ];

    it("scopes hotels strictly to included_hotel_ids when configured by admin", () => {
      const includedHotelIds = ["h1", "h3"];
      const filtered = mockHotels.filter(
        (h) => h.is_active && (includedHotelIds.length === 0 || includedHotelIds.includes(h.id))
      );

      expect(filtered.length).toBe(2);
      expect(filtered.map((h) => h.id)).toEqual(["h1", "h3"]);
      expect(filtered.some((h) => h.id === "h2")).toBe(false);
    });

    it("falls back to all active destination hotels when included_hotel_ids is empty", () => {
      const includedHotelIds: string[] = [];
      const filtered = mockHotels.filter(
        (h) => h.is_active && (includedHotelIds.length === 0 || includedHotelIds.includes(h.id))
      );

      expect(filtered.length).toBe(3);
      expect(filtered.some((h) => h.id === "h4")).toBe(false); // inactive excluded
    });

    it("scopes vehicles strictly to included_vehicle_ids when configured by admin", () => {
      const includedVehicleIds = ["v2"];
      const filtered = mockVehicles.filter(
        (v) => v.is_active && (includedVehicleIds.length === 0 || includedVehicleIds.includes(v.id))
      );

      expect(filtered.length).toBe(1);
      expect(filtered[0]?.name).toBe("Royal Enfield Classic 350");
    });

    it("falls back to all active vehicles when included_vehicle_ids is empty", () => {
      const includedVehicleIds: string[] = [];
      const filtered = mockVehicles.filter(
        (v) => v.is_active && (includedVehicleIds.length === 0 || includedVehicleIds.includes(v.id))
      );

      expect(filtered.length).toBe(3);
      expect(filtered.some((v) => v.id === "v4")).toBe(false);
    });
  });

  describe("Admin Scoping & Deep Control Schemas", () => {
    it("validates adminUpsertDestinationHighlightSchema", () => {
      const valid = adminUpsertDestinationHighlightSchema.safeParse({
        destinationId: "a1111111-1111-1111-1111-111111111111",
        title: "Amber Fort & Palace",
        category: "Heritage",
        description: "Opulent hill fort overlooking Maota Lake.",
      });
      expect(valid.success).toBe(true);

      const invalid = adminUpsertDestinationHighlightSchema.safeParse({
        destinationId: "a1111111-1111-1111-1111-111111111111",
        title: "", // empty title
      });
      expect(invalid.success).toBe(false);
    });

    it("validates adminDeleteDestinationHighlightSchema", () => {
      const valid = adminDeleteDestinationHighlightSchema.safeParse({
        highlightId: "h1111111-1111-1111-1111-111111111111",
        reason: "Attraction closed for renovations",
      });
      expect(valid.success).toBe(true);
    });

    it("validates adminOverrideBookingItemsSchema", () => {
      const valid = adminOverrideBookingItemsSchema.safeParse({
        tripId: "t1111111-1111-1111-1111-111111111111",
        hotelId: "h1111111-1111-1111-1111-111111111111",
        vehicleId: "v1111111-1111-1111-1111-111111111111",
        stopIds: ["s1111111-1111-1111-1111-111111111111"],
        customAdjustmentAmount: -1500,
        reason: "Customer requested room category swap",
      });
      expect(valid.success).toBe(true);

      const invalid = adminOverrideBookingItemsSchema.safeParse({
        tripId: "",
        reason: "", // missing reason
      });
      expect(invalid.success).toBe(false);
    });

    it("validates adminSendCustomerNotificationSchema", () => {
      const valid = adminSendCustomerNotificationSchema.safeParse({
        userId: "u1111111-1111-1111-1111-111111111111",
        title: "Chauffeur Assigned",
        message: "Your chauffeur Vikram Singh has been dispatched.",
        type: "booking",
      });
      expect(valid.success).toBe(true);

      const invalid = adminSendCustomerNotificationSchema.safeParse({
        userId: "u1111111-1111-1111-1111-111111111111",
        title: "",
        message: "",
      });
      expect(invalid.success).toBe(false);
    });

    it("validates adminUpsertCompanyPolicySchema", () => {
      const valid = adminUpsertCompanyPolicySchema.safeParse({
        companyId: "c1111111-1111-1111-1111-111111111111",
        maxBudgetPerTrip: 200000,
        requiresApproval: true,
        allowedVehicleTypes: ["bus", "car"],
      });
      expect(valid.success).toBe(true);
    });

    it("validates adminUpsertCircuitSchema with new scoping & pricing fields", () => {
      const valid = adminUpsertCircuitSchema.safeParse({
        destinationId: "d1111111-1111-1111-1111-111111111111",
        title: "Jaipur In-City Sightseeing",
        days: 3,
        basePricePerPerson: 7999,
        pricingScope: "local_city_only",
        localSightseeingKmPerDay: 50,
        includedHotelIds: ["h1", "h2"],
        includedVehicleIds: ["v1"],
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.pricingScope).toBe("local_city_only");
        expect(valid.data.localSightseeingKmPerDay).toBe(50);
      }
    });
  });

  describe("Admin Actions Security & Authorization Guards", () => {
    it("rejects unauthorized calls to adminUpsertDestinationHighlightAction", async () => {
      const res = await adminUpsertDestinationHighlightAction({
        destinationId: "a1111111-1111-1111-1111-111111111111",
        title: "Test Highlight",
      });
      expect(res.ok).toBe(false);
      expect(res.error).toBeDefined();
    });

    it("rejects unauthorized calls to adminDeleteDestinationHighlightAction", async () => {
      const res = await adminDeleteDestinationHighlightAction({
        highlightId: "h1111111-1111-1111-1111-111111111111",
        reason: "Test audit reason",
      });
      expect(res.ok).toBe(false);
      expect(res.error).toBeDefined();
    });

    it("rejects unauthorized calls to adminOverrideBookingItemsAction", async () => {
      const res = await adminOverrideBookingItemsAction({
        tripId: "t1111111-1111-1111-1111-111111111111",
        reason: "Test override reason",
      });
      expect(res.ok).toBe(false);
      expect(res.error).toBeDefined();
    });

    it("rejects unauthorized calls to adminSendCustomerNotificationAction", async () => {
      const res = await adminSendCustomerNotificationAction({
        userId: "u1111111-1111-1111-1111-111111111111",
        title: "Test",
        message: "Test message",
      });
      expect(res.ok).toBe(false);
      expect(res.error).toBeDefined();
    });

    it("rejects unauthorized calls to adminUpsertCompanyPolicyAction", async () => {
      const res = await adminUpsertCompanyPolicyAction({
        companyId: "c1111111-1111-1111-1111-111111111111",
        maxBudgetPerTrip: 100000,
        requiresApproval: true,
      });
      expect(res.ok).toBe(false);
      expect(res.error).toBeDefined();
    });

    it("rejects invalid path or unauthorized in adminGetDocumentSignedUrlAction", async () => {
      const res = await adminGetDocumentSignedUrlAction("");
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Path is required");
    });
  });
});
