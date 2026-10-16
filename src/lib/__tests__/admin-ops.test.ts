import { describe, it, expect } from "vitest";
import {
  adminUpdateBookingStatusAction,
  adminAssignDriverOrVehicleAction,
  adminResolveApprovalAction,
  fetchAdminOperationalSnapshot,
  adminUpsertCircuitAction,
  adminToggleCircuitStatusAction,
  adminControlActiveTripAction,
  adminUpsertVehicleAction,
  adminDeleteVehicleAction,
  adminUpsertDriverAction,
  adminUpsertHotelAction,
  adminUpsertStopAction,
  adminUpsertDestinationAction,
} from "@/lib/actions/admin-ops";
import {
  mapDatabaseTripToAdminBooking,
  mapDatabaseCommercialToAdminApproval,
  mapDatabaseCircuitToAdminTrip,
  mapDatabaseVehicleToAdminVehicle,
  mapDatabaseDriverToAdminDriver,
  mapDatabaseHotelToAdminHotel,
  mapDatabaseStopToAdminStop,
  mapDatabaseDestinationToAdminDestination,
} from "@/lib/admin/mappers";
import {
  adminUpdateBookingStatusSchema,
  adminAssignDriverSchema,
  adminResolveApprovalSchema,
  adminUpsertCircuitSchema,
  adminToggleCircuitStatusSchema,
  adminControlActiveTripSchema,
  adminUpsertVehicleSchema,
  adminDeleteVehicleSchema,
  adminUpsertDriverSchema,
  adminUpsertHotelSchema,
  adminUpsertStopSchema,
  adminUpsertDestinationSchema,
} from "@/lib/validations/actions";

describe("Admin Operations & Live Data Integration", () => {
  describe("Zod Validation Schemas", () => {
    it("fails validation on invalid tripId or status in adminUpdateBookingStatusSchema", () => {
      // Invalid UUID
      const invalidUuid = adminUpdateBookingStatusSchema.safeParse({
        tripId: "not-a-uuid",
        newStatus: "confirmed",
      });
      expect(invalidUuid.success).toBe(false);
      if (!invalidUuid.success) {
        expect(invalidUuid.error.issues[0]?.message).toContain("Invalid trip UUID");
      }

      // Invalid status enum
      const invalidStatus = adminUpdateBookingStatusSchema.safeParse({
        tripId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        newStatus: "unknown_status",
      });
      expect(invalidStatus.success).toBe(false);

      // Valid payload
      const valid = adminUpdateBookingStatusSchema.safeParse({
        tripId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        newStatus: "cancelled",
        reason: "Customer emergency",
        refundMode: "full",
      });
      expect(valid.success).toBe(true);
    });

    it("fails validation on invalid driverId or vehicleId in adminAssignDriverSchema", () => {
      const invalidDriver = adminAssignDriverSchema.safeParse({
        tripId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        driverId: "invalid-driver-id",
      });
      expect(invalidDriver.success).toBe(false);

      const validAssignment = adminAssignDriverSchema.safeParse({
        tripId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        driverId: "e22ac10b-58cc-4372-a567-0e02b2c3d479",
        vehicleId: "d33ac10b-58cc-4372-a567-0e02b2c3d479",
        reason: "VIP guest assignment",
      });
      expect(validAssignment.success).toBe(true);
    });

    it("fails validation on invalid decision in adminResolveApprovalSchema", () => {
      const invalidDecision = adminResolveApprovalSchema.safeParse({
        tripId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        decision: "maybe",
      });
      expect(invalidDecision.success).toBe(false);

      const validApproval = adminResolveApprovalSchema.safeParse({
        tripId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        decision: "approved",
        notes: "Budget authorized by VP HR",
      });
      expect(validApproval.success).toBe(true);
    });
  });

  describe("Security Check & Unauthorized Access Rejection", () => {
    it("rejects unauthorized caller for adminUpdateBookingStatusAction", async () => {
      const res = await adminUpdateBookingStatusAction({
        tripId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        newStatus: "confirmed",
      });
      expect(res.ok).toBe(false);
      expect(res.error).toBe("Unauthorized admin access.");
    });

    it("rejects unauthorized caller for adminAssignDriverOrVehicleAction", async () => {
      const res = await adminAssignDriverOrVehicleAction({
        tripId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        driverId: "e22ac10b-58cc-4372-a567-0e02b2c3d479",
      });
      expect(res.ok).toBe(false);
      expect(res.error).toBe("Unauthorized admin access.");
    });

    it("rejects unauthorized caller for adminResolveApprovalAction", async () => {
      const res = await adminResolveApprovalAction({
        tripId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        decision: "rejected",
        notes: "Exceeds quarterly offsite threshold",
      });
      expect(res.ok).toBe(false);
      expect(res.error).toBe("Unauthorized admin access.");
    });

    it("rejects unauthorized caller for fetchAdminOperationalSnapshot", async () => {
      const res = await fetchAdminOperationalSnapshot();
      expect(res.ok).toBe(false);
      expect(res.error).toBe("Unauthorized admin access.");
    });

    it("rejects caller attempting privilege escalation via user_metadata.role while accepting app_metadata.role", async () => {
      const { isAuthorizedAdmin } = await import("@/lib/admin/admin-auth");
      const forgedUser = {
        id: "attacker-id",
        email: "malicious.user@gmail.com",
        app_metadata: {},
        user_metadata: { role: "super_admin" },
      };
      expect(isAuthorizedAdmin({ user: forgedUser })).toBe(false);

      const legitimateAdminUser = {
        id: "admin-id",
        email: "admin@custom.com",
        app_metadata: { role: "super_admin" },
        user_metadata: {},
      };
      expect(isAuthorizedAdmin({ user: legitimateAdminUser })).toBe(true);
    });
  });

  describe("Database Data Mappers", () => {
    it("properly maps Supabase trips row into AdminBooking structure", () => {
      const rawDbTrip = {
        id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        booking_ref: "TM-001234",
        user_id: "usr-4411",
        booking_kind: "normal",
        start_date: "2026-11-10",
        end_date: "2026-11-14",
        total_days: 5,
        traveler_count: 2,
        subtotal_amount: 25000,
        service_fee: 999,
        tax_amount: 4680,
        discount_amount: 2000,
        coupon_code: "EXPLOREINDIA",
        total_amount: 28679,
        status: "confirmed",
        refund_amount: null,
        created_at: "2026-10-14T10:00:00Z",
        profiles: {
          id: "usr-4411",
          full_name: "Rahul Mehra",
          email: "rahul.mehra@example.com",
          phone: "+91 98123 45678",
        },
        destinations: {
          id: "dest-1",
          name: "Jaipur",
        },
        circuits: {
          id: "circ-1",
          title: "Jaipur Royal Heritage Tour",
        },
        trip_vehicles: [
          {
            id: "tv-1",
            vehicle_id: "veh-1",
            driver_id: "drv-9",
            drivers: {
              id: "drv-9",
              full_name: "Sukhwinder Singh",
              phone: "+91 98765 00000",
              plate_number: "RJ 14 TA 9988",
              rating: 4.9,
              is_active: true,
            },
          },
        ],
        trip_passengers: [
          {
            id: "pax-1",
            full_name: "Rahul Mehra",
            phone: "+91 98123 45678",
            id_doc_type: "aadhaar",
            id_doc_path: "pax-1/aadhaar.pdf",
            ticket_code: "TKT-RAHUL123",
          },
          {
            id: "pax-2",
            full_name: "Pooja Mehra",
            phone: "+91 98123 45679",
            id_doc_type: "passport",
            id_doc_path: null,
            ticket_code: "TKT-POOJA123",
          },
        ],
      };

      const mapped = mapDatabaseTripToAdminBooking(rawDbTrip);

      expect(mapped.id).toBe("f47ac10b-58cc-4372-a567-0e02b2c3d479");
      expect(mapped.booking_ref).toBe("TM-001234");
      expect(mapped.customer_name).toBe("Rahul Mehra");
      expect(mapped.customer_email).toBe("rahul.mehra@example.com");
      expect(mapped.customer_phone).toBe("+91 98123 45678");
      expect(mapped.kind).toBe("normal");
      expect(mapped.destination_name).toBe("Jaipur");
      expect(mapped.circuit_name).toBe("Jaipur Royal Heritage Tour");
      expect(mapped.days).toBe(5);
      expect(mapped.traveler_count).toBe(2);
      expect(mapped.total_amount).toBe(28679);
      expect(mapped.status).toBe("confirmed");

      // Driver
      expect(mapped.driver).not.toBeNull();
      expect(mapped.driver?.name).toBe("Sukhwinder Singh");
      expect(mapped.driver?.license_plate).toBe("RJ 14 TA 9988");

      // Travellers & IDs
      expect(mapped.travellers).toHaveLength(2);
      expect(mapped.travellers[0]?.id_doc_status).toBe("pending");
      expect(mapped.travellers[1]?.id_doc_status).toBe("not_provided");
    });

    it("properly maps Supabase commercial_bookings row into AdminApproval structure", () => {
      const rawDbCommercial = {
        id: "cb-901",
        trip_id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        company_id: "comp-88",
        approval_status: "pending",
        review_note: "Awaiting CFO review",
        created_at: "2026-10-15T08:00:00Z",
        companies: {
          id: "comp-88",
          name: "Acme Enterprises Ltd",
          gst_number: "07AAAAA9999A1Z1",
        },
        trips: {
          id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
          booking_ref: "TM-008800",
          status: "pending_approval",
          total_amount: 195000,
          traveler_count: 35,
          start_date: "2026-11-20",
          end_date: "2026-11-24",
          profiles: {
            full_name: "Amitabh Sen",
            email: "amitabh@acme.com",
          },
          destinations: {
            name: "Neemrana Fort",
          },
          trip_vehicles: [
            {
              vehicles: {
                name: "Volvo 9600 Luxury Multi-Axle",
              },
            },
          ],
        },
      };

      const mapped = mapDatabaseCommercialToAdminApproval(rawDbCommercial);

      expect(mapped.id).toBe("cb-901");
      expect(mapped.trip_id).toBe("f47ac10b-58cc-4372-a567-0e02b2c3d479");
      expect(mapped.company_name).toBe("Acme Enterprises Ltd");
      expect(mapped.gst_number).toBe("07AAAAA9999A1Z1");
      expect(mapped.booker_name).toBe("Amitabh Sen");
      expect(mapped.destination_name).toBe("Neemrana Fort");
      expect(mapped.dates).toBe("2026-11-20 to 2026-11-24");
      expect(mapped.passenger_count).toBe(35);
      expect(mapped.vehicle_name).toBe("Volvo 9600 Luxury Multi-Axle");
      expect(mapped.total_amount).toBe(195000);
      expect(mapped.status).toBe("pending_approval");
      expect(mapped.note).toBe("Awaiting CFO review");
    });

    it("properly maps Supabase circuits row into AdminTrip structure", () => {
      const rawDbCircuit = {
        id: "circ-77",
        destination_id: "dest-1",
        title: "Golden Triangle Rajasthan Express",
        days: 4,
        nights: 3,
        base_price_per_person: 14500,
        rating: 4.95,
        badge: "Top Rated",
        categories: ["heritage", "luxury"],
        summary: "Luxury circuit across heritage forts.",
        description: "Full itinerary details.",
        image_path: "/images/circuits/rajasthan.jpg",
        is_featured: true,
        is_active: true,
        destinations: {
          name: "Jaipur & Shekhawati",
        },
      };

      const mapped = mapDatabaseCircuitToAdminTrip(rawDbCircuit);

      expect(mapped.id).toBe("circ-77");
      expect(mapped.destination_name).toBe("Jaipur & Shekhawati");
      expect(mapped.title).toBe("Golden Triangle Rajasthan Express");
      expect(mapped.days).toBe(4);
      expect(mapped.nights).toBe(3);
      expect(mapped.base_price_per_person).toBe(14500);
      expect(mapped.rating).toBe(4.95);
      expect(mapped.badge).toBe("Top Rated");
      expect(mapped.image_url).toBe("/images/circuits/rajasthan.jpg");
      expect(mapped.is_featured).toBe(true);
      expect(mapped.is_active).toBe(true);
    });
  });

  describe("Database RPC Security & PostgREST Lockdown Verification", () => {
    it("enforces is_admin_jwt(), search_path pinning, and anon revokes in migration 10", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const sqlPath = path.resolve(process.cwd(), "supabase/migrations/20261015000010_admin_ops_rpc.sql");
      const sql = fs.readFileSync(sqlPath, "utf-8");

      // 1. is_admin_jwt helper checks
      expect(sql).toContain("CREATE OR REPLACE FUNCTION public.is_admin_jwt()");
      expect(sql).toContain("'service_role'");
      expect(sql).toContain("'app_metadata'");
      expect(sql).not.toContain("'user_metadata'");
      expect(sql).toContain("'%@tripmate.in'");
      expect(sql).toContain("SET search_path = public");

      // 2. 42501 Unauthorized enforcement in all 4 RPCs
      const requiredFunctions = [
        "admin_get_operational_snapshot",
        "admin_update_booking_status",
        "admin_assign_driver",
        "admin_resolve_approval",
      ];

      for (const fnName of requiredFunctions) {
        expect(sql).toContain(`FUNCTION public.${fnName}`);
      }

      // Check for 42501 error code enforcement
      const errorMatches = sql.match(/RAISE EXCEPTION 'Unauthorized: Admin privileges required' USING ERRCODE = '42501'/g);
      expect(errorMatches?.length).toBe(4);

      // Check search_path = public on all SECURITY DEFINER functions
      const searchPathMatches = sql.match(/SET search_path = public/g);
      expect(searchPathMatches?.length).toBeGreaterThanOrEqual(5);

      // 3. Execution grants revoked from PUBLIC & anon
      expect(sql).toContain("REVOKE ALL ON FUNCTION public.is_admin_jwt() FROM PUBLIC, anon;");
      expect(sql).toContain("REVOKE ALL ON FUNCTION public.admin_get_operational_snapshot() FROM PUBLIC, anon;");
      expect(sql).toContain("REVOKE ALL ON FUNCTION public.admin_update_booking_status(uuid, text, text, numeric) FROM PUBLIC, anon;");
      expect(sql).toContain("REVOKE ALL ON FUNCTION public.admin_assign_driver(uuid, uuid, uuid) FROM PUBLIC, anon;");
      expect(sql).toContain("REVOKE ALL ON FUNCTION public.admin_resolve_approval(uuid, text, text) FROM PUBLIC, anon;");

      // Execution granted only to authenticated and service_role
      expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.admin_get_operational_snapshot() TO authenticated, service_role;");
      expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.admin_update_booking_status(uuid, text, text, numeric) TO authenticated, service_role;");
      expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.admin_assign_driver(uuid, uuid, uuid) TO authenticated, service_role;");
      expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.admin_resolve_approval(uuid, text, text) TO authenticated, service_role;");
    });
  });

  describe("Catalog CRUD Zod Validation Schemas", () => {
    it("validates and parses circuit payloads correctly", () => {
      const valid = adminUpsertCircuitSchema.safeParse({
        destinationId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        title: "Royal Rajputana Circuit",
        days: 4,
        nights: 3,
        basePricePerPerson: 12500,
        badge: "Bestseller",
        categories: ["heritage", "luxury"],
      });
      expect(valid.success).toBe(true);

      const invalid = adminUpsertCircuitSchema.safeParse({
        destinationId: "",
        title: "X",
        days: 0,
        basePricePerPerson: -100,
      });
      expect(invalid.success).toBe(false);
    });

    it("validates and parses vehicle payloads correctly", () => {
      const valid = adminUpsertVehicleSchema.safeParse({
        name: "Toyota Innova Crysta",
        type: "car",
        capacity: 7,
        luggageCapacity: 4,
        pricePerDay: 4500,
        driverType: "chauffeur",
      });
      expect(valid.success).toBe(true);

      const invalidType = adminUpsertVehicleSchema.safeParse({
        name: "Helicopter",
        type: "aircraft",
        pricePerDay: 50000,
      });
      expect(invalidType.success).toBe(false);

      const validToggle = adminToggleCircuitStatusSchema.safeParse({
        circuitId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        isActive: false,
      });
      expect(validToggle.success).toBe(true);

      const validDelete = adminDeleteVehicleSchema.safeParse({
        vehicleId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        reason: "Decommissioned old vehicle",
      });
      expect(validDelete.success).toBe(true);
    });

    it("validates active trip control updates", () => {
      const valid = adminControlActiveTripSchema.safeParse({
        tripId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        startDate: "2026-11-01",
        endDate: "2026-11-05",
        status: "confirmed",
        vehicleId: "e22ac10b-58cc-4372-a567-0e02b2c3d479",
        driverId: "d33ac10b-58cc-4372-a567-0e02b2c3d479",
        hotelId: "a11ac10b-58cc-4372-a567-0e02b2c3d479",
        rooms: 2,
        reason: "Customer requested upgrade to luxury SUV and driver reassignment",
      });
      expect(valid.success).toBe(true);
    });

    it("validates driver, hotel, stop, and destination payloads", () => {
      const validDriver = adminUpsertDriverSchema.safeParse({
        name: "Vikramaditya Singh",
        phone: "+91 98111 22233",
        licensePlate: "RJ 14 TA 8899",
        rating: 4.95,
      });
      expect(validDriver.success).toBe(true);

      const invalidDriver = adminUpsertDriverSchema.safeParse({
        name: "",
        phone: "123",
        licensePlate: "",
      });
      expect(invalidDriver.success).toBe(false);

      const validHotel = adminUpsertHotelSchema.safeParse({
        destinationId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        name: "Rambagh Palace",
        pricePerNight: 28000,
        rating: 4.98,
      });
      expect(validHotel.success).toBe(true);

      const validStop = adminUpsertStopSchema.safeParse({
        name: "Midway Highway Retreat",
        price: 650,
        pricingUnit: "per_person",
      });
      expect(validStop.success).toBe(true);

      const validDest = adminUpsertDestinationSchema.safeParse({
        slug: "udaipur",
        name: "Udaipur",
        region: "Mewar, Rajasthan",
      });
      expect(validDest.success).toBe(true);
    });
  });

  describe("Catalog CRUD Server Actions Auth Rejection", () => {
    it("rejects unauthorized caller for adminUpsertCircuitAction", async () => {
      const res = await adminUpsertCircuitAction({
        destinationId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        title: "Test Circuit",
        days: 3,
        basePricePerPerson: 5000,
      });
      expect(res.ok).toBe(false);
      expect(res.error).toBe("Unauthorized admin access.");
    });

    it("rejects unauthorized caller for adminToggleCircuitStatusAction", async () => {
      const res = await adminToggleCircuitStatusAction({
        circuitId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        isActive: false,
      });
      expect(res.ok).toBe(false);
      expect(res.error).toBe("Unauthorized admin access.");
    });

    it("rejects unauthorized caller for adminControlActiveTripAction", async () => {
      const res = await adminControlActiveTripAction({
        tripId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        status: "confirmed",
      });
      expect(res.ok).toBe(false);
      expect(res.error).toBe("Unauthorized admin access.");
    });

    it("rejects unauthorized caller for adminUpsertVehicleAction", async () => {
      const res = await adminUpsertVehicleAction({
        name: "Maruti Ertiga",
        type: "car",
        pricePerDay: 2800,
      });
      expect(res.ok).toBe(false);
      expect(res.error).toBe("Unauthorized admin access.");
    });

    it("rejects unauthorized caller for adminDeleteVehicleAction", async () => {
      const res = await adminDeleteVehicleAction({
        vehicleId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      });
      expect(res.ok).toBe(false);
      expect(res.error).toBe("Unauthorized admin access.");
    });

    it("rejects unauthorized caller for adminUpsertDriverAction", async () => {
      const res = await adminUpsertDriverAction({
        name: "Satish Kumar",
        phone: "+91 98765 43210",
        licensePlate: "DL 1Y 9900",
      });
      expect(res.ok).toBe(false);
      expect(res.error).toBe("Unauthorized admin access.");
    });

    it("rejects unauthorized caller for adminUpsertHotelAction", async () => {
      const res = await adminUpsertHotelAction({
        destinationId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        name: "Hotel Clarks Amer",
        pricePerNight: 5500,
      });
      expect(res.ok).toBe(false);
      expect(res.error).toBe("Unauthorized admin access.");
    });

    it("rejects unauthorized caller for adminUpsertStopAction", async () => {
      const res = await adminUpsertStopAction({
        name: "Neemrana Stepwell Stop",
        price: 450,
      });
      expect(res.ok).toBe(false);
      expect(res.error).toBe("Unauthorized admin access.");
    });

    it("rejects unauthorized caller for adminUpsertDestinationAction", async () => {
      const res = await adminUpsertDestinationAction({
        slug: "jodhpur",
        name: "Jodhpur",
      });
      expect(res.ok).toBe(false);
      expect(res.error).toBe("Unauthorized admin access.");
    });
  });

  describe("Catalog Entity Database Mappers", () => {
    it("maps database vehicle row to AdminVehicle structure", () => {
      const dbVehicle = {
        id: "veh-99",
        type: "bus",
        name: "BharatBenz Luxury Coach",
        subtitle: "Executive 45-Seater",
        capacity: 45,
        luggage_capacity: 50,
        features: ["Wi-Fi", "Reclining Seats", "AC"],
        fuel_policy: "Included",
        driver_type: "chauffeur",
        price: 18000,
        image_path: "/images/coach.jpg",
        is_active: true,
      };

      const mapped = mapDatabaseVehicleToAdminVehicle(dbVehicle);
      expect(mapped.id).toBe("veh-99");
      expect(mapped.name).toBe("BharatBenz Luxury Coach");
      expect(mapped.type).toBe("bus");
      expect(mapped.capacity).toBe(45);
      expect(mapped.price_per_day).toBe(18000);
      expect(mapped.is_active).toBe(true);
    });

    it("maps database driver row to AdminDriver structure", () => {
      const dbDriver = {
        id: "drv-55",
        full_name: "Mahaveer Rathore",
        phone: "+91 98290 12345",
        plate_number: "RJ 14 CC 1122",
        rating: 4.96,
        is_active: true,
      };

      const mapped = mapDatabaseDriverToAdminDriver(dbDriver);
      expect(mapped.id).toBe("drv-55");
      expect(mapped.name).toBe("Mahaveer Rathore");
      expect(mapped.phone).toBe("+91 98290 12345");
      expect(mapped.license_plate).toBe("RJ 14 CC 1122");
      expect(mapped.rating).toBe(4.96);
      expect(mapped.is_active).toBe(true);
    });

    it("maps database hotel row to AdminHotel structure", () => {
      const dbHotel = {
        id: "htl-12",
        destination_id: "dest-1",
        name: "Samode Haveli",
        price_per_night: 14500,
        rating: 4.9,
        neighborhood: "Gangapole",
        distance_text: "Old City",
        badge: "Heritage",
        image_paths: ["/images/samode.jpg"],
        amenities: ["Pool", "Spa"],
        is_active: true,
        destinations: { name: "Jaipur" },
      };

      const mapped = mapDatabaseHotelToAdminHotel(dbHotel);
      expect(mapped.id).toBe("htl-12");
      expect(mapped.name).toBe("Samode Haveli");
      expect(mapped.destination_name).toBe("Jaipur");
      expect(mapped.price_per_night).toBe(14500);
      expect(mapped.image_url).toBe("/images/samode.jpg");
    });

    it("maps database stop row to AdminStop structure", () => {
      const dbStop = {
        id: "stp-01",
        destination_id: "dest-1",
        name: "Old Rao Dhaba",
        price: 350,
        pricing_unit: "per_person",
        distance_text: "75 km from Delhi",
        turnaround_text: "Direct highway service road",
        amenities: ["Pure Ghee Paranthas", "Clean Washrooms"],
        is_active: true,
        destinations: { name: "Jaipur" },
      };

      const mapped = mapDatabaseStopToAdminStop(dbStop);
      expect(mapped.id).toBe("stp-01");
      expect(mapped.name).toBe("Old Rao Dhaba");
      expect(mapped.price).toBe(350);
      expect(mapped.pricing_unit).toBe("per_person");
    });

    it("maps database destination row to AdminDestination structure", () => {
      const dbDest = {
        id: "dest-jodhpur",
        slug: "jodhpur",
        name: "Jodhpur",
        region: "Rajasthan",
        tagline: "The Sun City",
        description: "Historic blue city with majestic Mehrangarh Fort.",
        starting_price: 9200,
        rating: 4.85,
        review_count: 850,
        recommended_days: "3 Days",
        best_season: "Nov–Feb",
        badge: "Trending",
        categories: ["heritage"],
        origin_label: "Delhi NCR",
        drive_hours: 9,
        drive_km: 550,
        is_featured: true,
        is_bookable: true,
        is_active: true,
      };

      const mapped = mapDatabaseDestinationToAdminDestination(dbDest);
      expect(mapped.id).toBe("dest-jodhpur");
      expect(mapped.name).toBe("Jodhpur");
      expect(mapped.slug).toBe("jodhpur");
      expect(mapped.is_bookable).toBe(true);
      expect(mapped.is_active).toBe(true);
    });
  });

  describe("Migration 11 Admin Catalog & Trip Control RPC Security Verification", () => {
    it("enforces is_admin_jwt(), search_path pinning, and anon revokes in migration 11", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const sqlPath = path.resolve(process.cwd(), "supabase/migrations/20261015000011_admin_catalog_crud_rpc.sql");
      const sql = fs.readFileSync(sqlPath, "utf-8");

      // Verify all required RPC functions are defined in migration 11
      const requiredFunctions = [
        "admin_get_operational_snapshot",
        "admin_get_catalog_snapshot",
        "admin_upsert_circuit",
        "admin_toggle_circuit_status",
        "admin_control_active_trip",
        "admin_upsert_vehicle",
        "admin_delete_vehicle",
        "admin_upsert_driver",
        "admin_upsert_hotel",
        "admin_upsert_stop",
        "admin_upsert_destination",
      ];

      for (const fnName of requiredFunctions) {
        expect(sql).toContain(`FUNCTION public.${fnName}`);
      }

      // 42501 Unauthorized enforcement in all catalog RPCs
      const errorMatches = sql.match(/RAISE EXCEPTION 'Unauthorized: Admin privileges required' USING ERRCODE = '42501'/g);
      expect(errorMatches?.length).toBeGreaterThanOrEqual(8);

      // Check search_path = public on all functions
      const searchPathMatches = sql.match(/SET search_path = public/g);
      expect(searchPathMatches?.length).toBeGreaterThanOrEqual(10);

      // Verify anon and PUBLIC revokes
      expect(sql).toContain("REVOKE ALL ON FUNCTION public.admin_upsert_circuit(jsonb) FROM PUBLIC, anon;");
      expect(sql).toContain("REVOKE ALL ON FUNCTION public.admin_toggle_circuit_status(uuid, boolean) FROM PUBLIC, anon;");
      expect(sql).toContain("REVOKE ALL ON FUNCTION public.admin_control_active_trip(uuid, jsonb) FROM PUBLIC, anon;");
      expect(sql).toContain("REVOKE ALL ON FUNCTION public.admin_upsert_vehicle(jsonb) FROM PUBLIC, anon;");
      expect(sql).toContain("REVOKE ALL ON FUNCTION public.admin_delete_vehicle(uuid) FROM PUBLIC, anon;");
      expect(sql).toContain("REVOKE ALL ON FUNCTION public.admin_upsert_driver(jsonb) FROM PUBLIC, anon;");
      expect(sql).toContain("REVOKE ALL ON FUNCTION public.admin_upsert_hotel(jsonb) FROM PUBLIC, anon;");
      expect(sql).toContain("REVOKE ALL ON FUNCTION public.admin_upsert_stop(jsonb) FROM PUBLIC, anon;");
      expect(sql).toContain("REVOKE ALL ON FUNCTION public.admin_upsert_destination(jsonb) FROM PUBLIC, anon;");

      // Verify authenticated and service_role grants
      expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.admin_upsert_circuit(jsonb) TO authenticated, service_role;");
      expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.admin_control_active_trip(uuid, jsonb) TO authenticated, service_role;");
      expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.admin_upsert_vehicle(jsonb) TO authenticated, service_role;");
      expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.admin_upsert_driver(jsonb) TO authenticated, service_role;");
      expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.admin_upsert_hotel(jsonb) TO authenticated, service_role;");
      expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.admin_upsert_stop(jsonb) TO authenticated, service_role;");
      expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.admin_upsert_destination(jsonb) TO authenticated, service_role;");
    });
  });

  describe("Admin Trip / Circuit Rename & Reload Verification (TASK 1)", () => {
    it("validates circuit creation and rename persistence via adminUpsertCircuitSchema", () => {
      // 1. Initial Circuit Creation payload
      const initialPayload = {
        destinationId: "dest-jaipur-123",
        title: "Jaipur Heritage & Forts Circuit",
        days: 3,
        nights: 2,
        basePricePerPerson: 8499,
        summary: "Royal forts and palaces tour",
        description: "Visit Amber Fort, City Palace, and Hawa Mahal",
        imageUrl: "https://images.unsplash.com/photo-1599661046289-e31897846e41",
        isActive: true,
        reason: "Initial catalog listing",
      };

      const parseInitial = adminUpsertCircuitSchema.safeParse(initialPayload);
      expect(parseInitial.success).toBe(true);

      // 2. Renamed Circuit payload (e.g. admin updates title and base price)
      const renamedPayload = {
        id: "c11ac10b-58cc-4372-a567-0e02b2c3d479",
        destinationId: "dest-jaipur-123",
        title: "Jaipur Royal Forts & Heritage Luxury Circuit",
        days: 4,
        nights: 3,
        basePricePerPerson: 10999,
        summary: "Updated luxury itinerary with night safari",
        description: "Expanded to 4 days with Chokhi Dhani evening experience",
        imageUrl: "https://images.unsplash.com/photo-1599661046289-e31897846e41",
        isActive: true,
        reason: "Seasonal revamp and title update",
      };

      const parseRenamed = adminUpsertCircuitSchema.safeParse(renamedPayload);
      expect(parseRenamed.success).toBe(true);
    });

    it("maps renamed circuit accurately back from database row via mapDatabaseCircuitToAdminTrip", () => {
      const dbRow = {
        id: "c11ac10b-58cc-4372-a567-0e02b2c3d479",
        destination_id: "dest-jaipur-123",
        name: "Jaipur Royal Forts & Heritage Luxury Circuit",
        tagline: "Updated luxury itinerary with night safari",
        summary: "Updated luxury itinerary with night safari",
        description: "Expanded to 4 days with Chokhi Dhani evening experience",
        duration_days: 4,
        base_price: 10999,
        hero_image_path: "https://images.unsplash.com/photo-1599661046289-e31897846e41",
        is_active: true,
        is_featured: true,
        destinations: {
          id: "dest-jaipur-123",
          name: "Jaipur",
          region: "Rajasthan",
        },
      };

      const mapped = mapDatabaseCircuitToAdminTrip(dbRow);
      expect(mapped.id).toBe("c11ac10b-58cc-4372-a567-0e02b2c3d479");
      expect(mapped.title).toBe("Jaipur Royal Forts & Heritage Luxury Circuit");
      expect(mapped.days).toBe(4);
      expect(mapped.nights).toBe(3);
      expect(mapped.base_price_per_person).toBe(10999);
      expect(mapped.is_active).toBe(true);
      expect(mapped.destination_name).toBe("Jaipur");
      expect(mapped.image_url).toBe("https://images.unsplash.com/photo-1599661046289-e31897846e41");
    });

    it("validates circuit deletion payload via adminDeleteCircuitSchema", async () => {
      const { adminDeleteCircuitSchema } = await import("../validations/actions");
      const valid = adminDeleteCircuitSchema.safeParse({
        circuitId: "c11ac10b-58cc-4372-a567-0e02b2c3d479",
        reason: "Discontinued seasonal package",
      });
      expect(valid.success).toBe(true);
    });
  });

  describe("External Pasted Image URL Resolution (TASK 3)", () => {
    it("returns raw URLs untouched if starting with http://, https://, data:, or /", async () => {
      const { resolveCatalogImageUrl } = await import("../data/images");

      // HTTPS External URL (e.g. Unsplash, Wikimedia)
      const unsplashUrl = "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800";
      expect(resolveCatalogImageUrl(unsplashUrl)).toBe(unsplashUrl);

      // HTTP External URL
      const httpUrl = "http://example.com/images/fort.jpg";
      expect(resolveCatalogImageUrl(httpUrl)).toBe(httpUrl);

      // Data URI
      const dataUri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      expect(resolveCatalogImageUrl(dataUri)).toBe(dataUri);

      // Local absolute path
      const localPath = "/images/destinations/jaipur.jpg";
      expect(resolveCatalogImageUrl(localPath)).toBe(localPath);

      // Storage bucket relative path -> should resolve through Supabase public bucket
      const storageKey = "circuits/amber-fort.webp";
      const resolved = resolveCatalogImageUrl(storageKey);
      expect(resolved).toContain("/storage/v1/object/public/catalog-images/circuits/amber-fort.webp");
      expect(resolved).not.toContain("catalog-images/https://");
    });
  });
});

