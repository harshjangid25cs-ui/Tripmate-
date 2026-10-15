import { describe, it, expect } from "vitest";
import {
  adminUpdateBookingStatusAction,
  adminAssignDriverOrVehicleAction,
  adminResolveApprovalAction,
  fetchAdminOperationalSnapshot,
} from "@/lib/actions/admin-ops";
import {
  mapDatabaseTripToAdminBooking,
  mapDatabaseCommercialToAdminApproval,
  mapDatabaseCircuitToAdminTrip,
} from "@/lib/admin/mappers";
import {
  adminUpdateBookingStatusSchema,
  adminAssignDriverSchema,
  adminResolveApprovalSchema,
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
});
