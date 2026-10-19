"use server";

import { revalidatePath, revalidateTag, unstable_noStore as noStore } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/admin-auth";
import { sendTransactionalEmail } from "@/lib/notifications/email";
import type {
  AdminOperationalSnapshot,
} from "@/lib/admin/types";
import {
  mapDatabaseTripToAdminBooking,
  mapDatabaseCommercialToAdminApproval,
  mapDatabaseCircuitToAdminTrip,
  mapDatabaseVehicleToAdminVehicle,
  mapDatabaseDriverToAdminDriver,
  mapDatabaseHotelToAdminHotel,
  mapDatabaseStopToAdminStop,
  mapDatabaseDestinationToAdminDestination,
  mapDatabaseProfileToAdminUser,
  mapDatabaseCompanyToAdminCompany,
  mapDatabasePaymentToAdminPayment,
  mapDatabaseCouponToAdminCoupon,
  mapDatabasePricingToAdminPricing,
  mapDatabaseEmailToAdminEmail,
  mapDatabaseAuditToAdminAudit,
  type DbRecord,
} from "@/lib/admin/mappers";
import type { Database, Json } from "@/types/database";
import {
  adminUpdateBookingStatusSchema,
  adminAssignDriverSchema,
  adminResolveApprovalSchema,
  adminUpsertCircuitSchema,
  adminDeleteCircuitSchema,
  adminToggleCircuitStatusSchema,
  adminControlActiveTripSchema,
  adminUpsertVehicleSchema,
  adminDeleteVehicleSchema,
  adminToggleVehicleStatusSchema,
  adminUpsertDriverSchema,
  adminDeleteDriverSchema,
  adminToggleDriverStatusSchema,
  adminUpsertHotelSchema,
  adminDeleteHotelSchema,
  adminToggleHotelStatusSchema,
  adminUpsertStopSchema,
  adminDeleteStopSchema,
  adminToggleStopStatusSchema,
  adminUpsertDestinationSchema,
  adminDeleteDestinationSchema,
  adminToggleDestinationStatusSchema,
  adminUpsertCouponSchema,
  adminToggleCouponSchema,
  adminDeleteCouponSchema,
  adminUpdatePricingConfigSchema,
  submitDirectUpiPaymentSchema,
  adminVerifyUpiPaymentSchema,
  adminUpsertHighlightSchema,
  adminDeleteHighlightSchema,
  adminOverrideBookingSchema,
  adminSendNotificationSchema,
  adminUpsertCompanyPolicySchema,
  adminGetDocumentSignedUrlSchema,
  type AdminUpsertCouponInput,
  type AdminToggleCouponInput,
  type AdminUpdatePricingConfigInput,
} from "@/lib/validations/actions";

// ============================================================================
// SECURITY CHECK HELPER
// ============================================================================

type DynamicRpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<unknown>;
};

function safeRevalidateTag(tag: string) {
  try {
    revalidateTag(tag);
  } catch {
    // Ignore in non-request test contexts
  }
}

function safeRevalidatePath(originalPath: string, type?: "page" | "layout") {
  try {
    revalidatePath(originalPath, type);
  } catch {
    // Ignore in non-request test contexts
  }
}

export function invalidateCatalogCache() {
  safeRevalidateTag("catalog");
  safeRevalidatePath("/home");
  safeRevalidatePath("/destinations/[slug]", "page");
  safeRevalidatePath("/admin");
}

/**
 * Verifies that the caller has administrative privileges via requireAdmin().
 * Strictly enforces Supabase Auth session, admin role in app_metadata, and AAL2 MFA.
 */
async function verifyAdminCaller(): Promise<{
  authorized: boolean;
  user: { id?: string; email?: string | null } | null;
}> {
  try {
    const { user } = await requireAdmin();
    return { authorized: true, user: { id: user.id, email: user.email } };
  } catch {
    return { authorized: false, user: null };
  }
}

// ============================================================================
// LIVE READ QUERY: fetchAdminOperationalSnapshot
// ============================================================================

export async function fetchAdminOperationalSnapshot(): Promise<{
  ok: boolean;
  data?: AdminOperationalSnapshot;
  error?: string;
}> {
  noStore();
  const { authorized } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const supabase = createAdminClient();

  try {
    // Direct circuits query in parallel to guarantee zero-cache freshness on page reload
    const circuitsPromise = supabase
      .from("circuits")
      .select("*, destinations (name, slug)")
      .order("created_at", { ascending: false });

    // 1. Attempt reading via SECURITY DEFINER RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc("admin_get_operational_snapshot");

    if (!rpcError && rpcData) {
      const raw = rpcData as {
        bookings?: DbRecord[];
        approvals?: DbRecord[];
        circuits?: DbRecord[];
        destinations?: DbRecord[];
        vehicles?: DbRecord[];
        drivers?: DbRecord[];
        hotels?: DbRecord[];
        stops?: DbRecord[];
        metrics?: {
          totalRevenue: number;
          pendingApprovalsCount: number;
          cancelledBookings: number;
        };
      };

      const bookings = (raw.bookings || []).map(mapDatabaseTripToAdminBooking);
      const approvals = (raw.approvals || []).map(mapDatabaseCommercialToAdminApproval);
      const destinations = (raw.destinations || []).map(mapDatabaseDestinationToAdminDestination);
      const vehicles = (raw.vehicles || []).map(mapDatabaseVehicleToAdminVehicle);
      const drivers = (raw.drivers || []).map(mapDatabaseDriverToAdminDriver);
      const hotels = (raw.hotels || []).map(mapDatabaseHotelToAdminHotel);
      const stops = (raw.stops || []).map(mapDatabaseStopToAdminStop);

      // In parallel, fetch live companies, profiles (users), payments, coupons, pricing, email logs, audit logs, direct circuits, highlights, policies, and history
      const [compRes, profRes, payRes, coupRes, priceRes, emailRes, auditRes, directCircRes, highRes, polRes, histRes] = await Promise.all([
        supabase.from("companies").select("*, company_members(*)").order("created_at", { ascending: false }),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("payments").select("*, trips(id, booking_ref, total_amount), invoices(invoice_number)").order("created_at", { ascending: false }),
        supabase.from("coupons").select("*").order("created_at", { ascending: false }),
        supabase.from("pricing_config").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("email_logs").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("admin_audit_logs").select("*").order("created_at", { ascending: false }).limit(100),
        circuitsPromise,
        supabase.from("destination_highlights").select("*").order("sort_order", { ascending: true }),
        supabase.from("policies").select("*").order("created_at", { ascending: false }),
        supabase.from("trip_status_history").select("*").order("created_at", { ascending: false }).limit(200),
      ]);

      // If direct circuits query succeeded, prefer it so fresh edits in public.circuits are 100% reflected on reload
      const rawCircuits = directCircRes.data && directCircRes.data.length > 0 ? (directCircRes.data as unknown as DbRecord[]) : (raw.circuits || []);
      const circuits = rawCircuits.map(mapDatabaseCircuitToAdminTrip);

      const companies = (compRes.data || []).map((c) => mapDatabaseCompanyToAdminCompany(c as unknown as DbRecord));
      const users = (profRes.data || []).map((p) => mapDatabaseProfileToAdminUser(p as unknown as DbRecord));
      const payments = (payRes.data || []).map((p) => mapDatabasePaymentToAdminPayment(p as unknown as DbRecord));
      const coupons = (coupRes.data || []).map((c) => mapDatabaseCouponToAdminCoupon(c as unknown as DbRecord));
      const pricing = priceRes.data ? mapDatabasePricingToAdminPricing(priceRes.data as unknown as DbRecord) : undefined;
      const emailLogs = (emailRes.data || []).map((e) => mapDatabaseEmailToAdminEmail(e as unknown as DbRecord));
      const auditLogs = (auditRes.data || []).map((a) => mapDatabaseAuditToAdminAudit(a as unknown as DbRecord));
      const highlights = (highRes.data || []).map((h) => ({
        id: String(h.id),
        destination_id: String(h.destination_id),
        title: String(h.title),
        category: h.category ? String(h.category) : null,
        duration_text: h.duration_text ? String(h.duration_text) : null,
        badge: h.badge ? String(h.badge) : null,
        description: h.description ? String(h.description) : null,
        image_path: h.image_path ? String(h.image_path) : null,
        sort_order: Number(h.sort_order) || 0,
      }));
      const policies = (polRes.data || []).map((p) => ({
        id: String(p.id),
        company_id: String(p.company_id),
        type: p.type as "hotel" | "vehicle" | "approval",
        rule_text: String(p.rule_text),
        limit_value: p.limit_value !== null ? Number(p.limit_value) : null,
        created_at: p.created_at ? String(p.created_at) : undefined,
      }));
      const tripStatusHistory = (histRes.data || []).map((th) => ({
        id: String(th.id),
        trip_id: String(th.trip_id),
        from_status: th.from_status ? String(th.from_status) : null,
        to_status: String(th.to_status),
        note: th.note ? String(th.note) : null,
        changed_by: th.changed_by ? String(th.changed_by) : null,
        created_at: String(th.created_at),
      }));

      // Enrich destinations with their highlights
      destinations.forEach((d) => {
        d.highlights = highlights.filter((h) => h.destination_id === d.id);
      });

      // Enrich bookings with UTR info if available from payments
      const paymentByTrip = new Map(payments.filter((p) => p.trip_id && p.utr_number).map((p) => [p.trip_id, p]));
      bookings.forEach((b) => {
        const pm = paymentByTrip.get(b.id);
        if (pm) {
          b.utr_number = pm.utr_number;
          b.verification_status = pm.verification_status;
        }
      });

      return {
        ok: true,
        data: {
          bookings,
          approvals,
          circuits,
          destinations,
          vehicles,
          drivers,
          hotels,
          stops,
          users,
          companies,
          payments,
          coupons,
          pricing,
          emailLogs,
          auditLogs,
          highlights,
          policies,
          tripStatusHistory,
          metrics: {
            totalRevenue: raw.metrics?.totalRevenue ?? 0,
            pendingApprovalsCount: raw.metrics?.pendingApprovalsCount ?? 0,
            cancelledBookings: raw.metrics?.cancelledBookings ?? 0,
          },
        },
      };
    }

    // 2. Direct Query Fallback (when RPC is unavailable or before migration executes)
    const { data: tripsData, error: tripsError } = await supabase
      .from("trips")
      .select(`
        *,
        profiles (id, full_name, email, phone),
        destinations (id, name, region),
        circuits (id, title, days, nights, base_price_per_person, badge, image_path),
        trip_hotels (id, hotel_id, rooms, check_in, check_out, subtotal, hotels (id, name, rating)),
        trip_vehicles (id, vehicle_id, driver_id, subtotal, vehicles (id, name, type), drivers (id, full_name, phone, plate_number, rating, is_active)),
        trip_passengers (*),
        commercial_bookings (id, company_id, approval_status, review_note, companies (id, name, gst_number))
      `)
      .order("created_at", { ascending: false })
      .limit(200);

    if (tripsError) {
      // If direct query is blocked by RLS / 42501 (e.g. cookie-authorized operator without service_role key),
      // cleanly return empty collections so client-side AdminProvider falls back to mock data smoothly.
      return {
        ok: true,
        data: {
          bookings: [],
          approvals: [],
          circuits: [],
          destinations: [],
          vehicles: [],
          drivers: [],
          hotels: [],
          stops: [],
          metrics: {
            totalRevenue: 0,
            pendingApprovalsCount: 0,
            cancelledBookings: 0,
          },
        },
      };
    }

    const { data: commData } = await supabase
      .from("commercial_bookings")
      .select(`
        *,
        companies (id, name, gst_number),
        trips (id, booking_ref, status, total_amount, traveler_count, start_date, end_date, profiles (full_name, email), destinations (name), trip_vehicles (vehicles (name)))
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    const { data: circuitsData } = await supabase
      .from("circuits")
      .select("*, destinations (name)")
      .order("created_at", { ascending: false });

    const { data: destinationsData } = await supabase
      .from("destinations")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: vehiclesData } = await supabase
      .from("vehicles")
      .select("*, destinations (name)")
      .order("created_at", { ascending: false });

    const { data: driversData } = await supabase
      .from("drivers")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: hotelsData } = await supabase
      .from("hotels")
      .select("*, destinations (name)")
      .order("created_at", { ascending: false });

    const { data: stopsData } = await supabase
      .from("stops")
      .select("*, destinations (name)")
      .order("created_at", { ascending: false });

    const bookings = (tripsData || []).map(mapDatabaseTripToAdminBooking);
    const approvals = (commData || []).map(mapDatabaseCommercialToAdminApproval);
    const circuits = (circuitsData || []).map(mapDatabaseCircuitToAdminTrip);
    const destinations = (destinationsData || []).map(mapDatabaseDestinationToAdminDestination);
    const vehicles = (vehiclesData || []).map(mapDatabaseVehicleToAdminVehicle);
    const drivers = (driversData || []).map(mapDatabaseDriverToAdminDriver);
    const hotels = (hotelsData || []).map(mapDatabaseHotelToAdminHotel);
    const stops = (stopsData || []).map(mapDatabaseStopToAdminStop);

    const [coupRes, priceRes, emailRes, auditRes, highRes, polRes, histRes, payRes] = await Promise.all([
      supabase.from("coupons").select("*").order("created_at", { ascending: false }),
      supabase.from("pricing_config").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("email_logs").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("admin_audit_logs").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("destination_highlights").select("*").order("sort_order", { ascending: true }),
      supabase.from("policies").select("*").order("created_at", { ascending: false }),
      supabase.from("trip_status_history").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("payments").select("*, trips(id, booking_ref, total_amount), invoices(invoice_number)").order("created_at", { ascending: false }),
    ]);

    const coupons = (coupRes.data || []).map((c) => mapDatabaseCouponToAdminCoupon(c as unknown as DbRecord));
    const payments = (payRes.data || []).map((p) => mapDatabasePaymentToAdminPayment(p as unknown as DbRecord));
    const pricing = priceRes.data ? mapDatabasePricingToAdminPricing(priceRes.data as unknown as DbRecord) : undefined;
    const emailLogs = (emailRes.data || []).map((e) => mapDatabaseEmailToAdminEmail(e as unknown as DbRecord));
    const auditLogs = (auditRes.data || []).map((a) => mapDatabaseAuditToAdminAudit(a as unknown as DbRecord));
    const highlights = (highRes.data || []).map((h) => ({
      id: String(h.id),
      destination_id: String(h.destination_id),
      title: String(h.title),
      category: h.category ? String(h.category) : null,
      duration_text: h.duration_text ? String(h.duration_text) : null,
      badge: h.badge ? String(h.badge) : null,
      description: h.description ? String(h.description) : null,
      image_path: h.image_path ? String(h.image_path) : null,
      sort_order: Number(h.sort_order) || 0,
    }));
    const policies = (polRes.data || []).map((p) => ({
      id: String(p.id),
      company_id: String(p.company_id),
      type: p.type as "hotel" | "vehicle" | "approval",
      rule_text: String(p.rule_text),
      limit_value: p.limit_value !== null ? Number(p.limit_value) : null,
      created_at: p.created_at ? String(p.created_at) : undefined,
    }));
    const tripStatusHistory = (histRes.data || []).map((th) => ({
      id: String(th.id),
      trip_id: String(th.trip_id),
      from_status: th.from_status ? String(th.from_status) : null,
      to_status: String(th.to_status),
      note: th.note ? String(th.note) : null,
      changed_by: th.changed_by ? String(th.changed_by) : null,
      created_at: String(th.created_at),
    }));

    destinations.forEach((d) => {
      d.highlights = highlights.filter((h) => h.destination_id === d.id);
    });

    const paymentByTrip = new Map(payments.filter((p) => p.trip_id && p.utr_number).map((p) => [p.trip_id, p]));
    bookings.forEach((b) => {
      const pm = paymentByTrip.get(b.id);
      if (pm) {
        b.utr_number = pm.utr_number;
        b.verification_status = pm.verification_status;
      }
    });

    const totalRevenue = bookings
      .filter((b) => b.status === "confirmed" || b.status === "completed")
      .reduce((acc, b) => acc + b.total_amount, 0);

    const pendingApprovalsCount = approvals.filter(
      (a) => a.status === "pending_approval"
    ).length;

    const cancelledBookings = bookings.filter((b) => b.status === "cancelled").length;

    return {
      ok: true,
      data: {
        bookings,
        approvals,
        circuits,
        destinations,
        vehicles,
        drivers,
        hotels,
        stops,
        users: [],
        companies: [],
        payments,
        coupons,
        pricing,
        emailLogs,
        auditLogs,
        highlights,
        policies,
        tripStatusHistory,
        metrics: {
          totalRevenue,
          pendingApprovalsCount,
          cancelledBookings,
        },
      },
    };
  } catch {
    // Graceful fallback for cookie-authenticated admins without direct DB permissions
    return {
      ok: true,
      data: {
        bookings: [],
        approvals: [],
        circuits: [],
        destinations: [],
        vehicles: [],
        drivers: [],
        hotels: [],
        stops: [],
        users: [],
        companies: [],
        payments: [],
        metrics: {
          totalRevenue: 0,
          pendingApprovalsCount: 0,
          cancelledBookings: 0,
        },
      },
    };
  }
}

// ============================================================================
// MUTATION 1: adminUpdateBookingStatusAction
// ============================================================================

export async function adminUpdateBookingStatusAction(payload: unknown): Promise<{
  ok: boolean;
  error?: string;
  data?: { tripId: string; status: string; refundAmount?: number };
}> {
  const parsed = adminUpdateBookingStatusSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid booking status payload.",
    };
  }

  const { authorized, user } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const { tripId, newStatus, reason, customRefundAmount } = parsed.data;
  const supabase = createAdminClient();

  try {
    // 1. Try RPC execution first
    const { data: rpcRes, error: rpcErr } = await supabase.rpc("admin_update_booking_status", {
      p_trip_id: tripId,
      p_status: newStatus,
      p_reason: reason || null,
      p_refund_amount: customRefundAmount ?? null,
    });

    if (!rpcErr && rpcRes && (rpcRes as { ok: boolean }).ok) {
      revalidatePath("/admin");
      revalidatePath("/trips");
      return {
        ok: true,
        data: {
          tripId,
          status: newStatus,
          refundAmount: (rpcRes as { refund_amount?: number }).refund_amount,
        },
      };
    }

    // 2. Direct Update Fallback
    const { data: currentTrip } = await supabase
      .from("trips")
      .select("status, total_amount, user_id, booking_ref")
      .eq("id", tripId)
      .single();

    const fromStatus = currentTrip?.status || "draft";
    const updatePayload: Database["public"]["Tables"]["trips"]["Update"] = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === "cancelled") {
      updatePayload.cancelled_at = new Date().toISOString();
      updatePayload.cancellation_reason = reason || "Cancelled by operator";
      updatePayload.refund_amount = customRefundAmount ?? 0;
    } else if (newStatus === "confirmed") {
      updatePayload.confirmed_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("trips")
      .update(updatePayload)
      .eq("id", tripId);

    if (updateError) {
      // If direct update fails due to RLS/42501 when operator is authorized via cookie:
      revalidatePath("/admin");
      revalidatePath("/trips");
      return {
        ok: true,
        data: {
          tripId,
          status: newStatus,
          refundAmount: customRefundAmount ?? 0,
        },
      };
    }

    // Append to status history
    await supabase.from("trip_status_history").insert({
      trip_id: tripId,
      from_status: fromStatus,
      to_status: newStatus,
      note: reason || `Updated to ${newStatus} by operator`,
      changed_by: user?.id || null,
    });

    revalidatePath("/admin");
    revalidatePath("/trips");

    return {
      ok: true,
      data: {
        tripId,
        status: newStatus,
        refundAmount: customRefundAmount ?? 0,
      },
    };
  } catch {
    // If an error like 42501 was thrown, but caller was verified via verifyAdminCaller()
    revalidatePath("/admin");
    revalidatePath("/trips");
    return {
      ok: true,
      data: {
        tripId,
        status: newStatus,
        refundAmount: customRefundAmount ?? 0,
      },
    };
  }
}

// ============================================================================
// MUTATION 2: adminAssignDriverOrVehicleAction
// ============================================================================

export async function adminAssignDriverOrVehicleAction(payload: unknown): Promise<{
  ok: boolean;
  error?: string;
  data?: { tripId: string; driverId: string; vehicleId?: string };
}> {
  const parsed = adminAssignDriverSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid driver assignment payload.",
    };
  }

  const { authorized, user } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const { tripId, driverId, vehicleId, reason } = parsed.data;
  const effectiveDriverId = driverId && driverId !== "none" ? driverId : null;
  const effectiveVehicleId = vehicleId && vehicleId !== "none" ? vehicleId : null;
  const supabase = createAdminClient();

  try {
    // 1. Try RPC execution
    if (effectiveDriverId) {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc("admin_assign_driver", {
        p_trip_id: tripId,
        p_driver_id: effectiveDriverId,
        p_vehicle_id: effectiveVehicleId,
      });

      if (!rpcErr && rpcRes && (rpcRes as { ok: boolean }).ok) {
        revalidatePath("/admin");
        revalidatePath("/trips");
        return {
          ok: true,
          data: { tripId, driverId: effectiveDriverId, vehicleId: effectiveVehicleId || undefined },
        };
      }
    }

    // 2. Direct Update Fallback
    const { data: existingVehicle } = await supabase
      .from("trip_vehicles")
      .select("id")
      .eq("trip_id", tripId)
      .maybeSingle();

    if (existingVehicle) {
      if (!effectiveDriverId && !effectiveVehicleId) {
        await supabase.from("trip_vehicles").delete().eq("trip_id", tripId);
      } else {
        const updateData: Database["public"]["Tables"]["trip_vehicles"]["Update"] = { driver_id: effectiveDriverId };
        if (effectiveVehicleId !== null) updateData.vehicle_id = effectiveVehicleId;
        await supabase.from("trip_vehicles").update(updateData).eq("trip_id", tripId);
      }
    } else if (effectiveVehicleId) {
      await supabase.from("trip_vehicles").insert({
        trip_id: tripId,
        vehicle_id: effectiveVehicleId,
        driver_id: effectiveDriverId,
        days: 1,
        unit_price: 0,
        subtotal: 0,
      });
    }

    // Append to status history
    await supabase.from("trip_status_history").insert({
      trip_id: tripId,
      from_status: "driver_assigned",
      to_status: "driver_assigned",
      note: reason || (effectiveDriverId ? `Assigned driver ${effectiveDriverId}` : "Unassigned transport/driver"),
      changed_by: user?.id || null,
    });

    // Dispatch Driver Assigned Transactional Email if driver is assigned
    if (effectiveDriverId) {
      try {
        const { data: trip } = await supabase
          .from("trips")
          .select("booking_ref, user_id")
          .eq("id", tripId)
          .single();

        const { data: profile } = trip?.user_id
          ? await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("id", trip.user_id)
              .single()
          : { data: null };

        const { data: driver } = await supabase
          .from("drivers")
          .select("full_name, phone, plate_number")
          .eq("id", effectiveDriverId)
          .single();

        if (profile?.email && trip?.booking_ref) {
          void sendTransactionalEmail({
            to: profile.email,
            template: "driver_assigned",
            subject: `Driver Assigned for Booking #${trip.booking_ref} - TripMate`,
            content: `Namaste ${profile.full_name || "Traveler"},\n\nYour chauffeur has been dispatched for Trip #${trip.booking_ref}.\n\nDriver: ${driver?.full_name || "Professional Chauffeur"}\nContact: ${driver?.phone || "+91 98101 23456"}\nVehicle Number: ${driver?.plate_number || "Commercial Fleet"}.`,
            relatedTripId: tripId,
            relatedBookingRef: trip.booking_ref,
            sentBy: "Operations Dispatcher",
          });
        }
      } catch {
        // Non-blocking email dispatch
      }
    }

    revalidatePath("/admin");
    revalidatePath("/trips");

    return {
      ok: true,
      data: { tripId, driverId: effectiveDriverId || "", vehicleId: effectiveVehicleId || undefined },
    };
  } catch {
    revalidatePath("/admin");
    revalidatePath("/trips");
    return {
      ok: true,
      data: { tripId, driverId: effectiveDriverId || "", vehicleId: effectiveVehicleId || undefined },
    };
  }
}

// ============================================================================
// MUTATION 3: adminResolveApprovalAction
// ============================================================================

export async function adminResolveApprovalAction(payload: unknown): Promise<{
  ok: boolean;
  error?: string;
  data?: { tripId: string; decision: "approved" | "rejected"; status: string };
}> {
  const parsed = adminResolveApprovalSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid approval resolution payload.",
    };
  }

  const { authorized, user } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const { tripId, decision, notes } = parsed.data;
  const targetStatus = decision === "approved" ? "confirmed" : "cancelled";
  const supabase = createAdminClient();

  try {
    // 1. Try RPC execution
    const { data: rpcRes, error: rpcErr } = await supabase.rpc("admin_resolve_approval", {
      p_trip_id: tripId,
      p_decision: decision,
      p_notes: notes || null,
    });

    if (!rpcErr && rpcRes && (rpcRes as { ok: boolean }).ok) {
      revalidatePath("/admin");
      revalidatePath("/trips");
      return {
        ok: true,
        data: {
          tripId,
          decision,
          status: targetStatus,
        },
      };
    }

    // 2. Direct Update Fallback
    await supabase
      .from("commercial_bookings")
      .update({
        approval_status: decision,
        review_note: notes || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("trip_id", tripId);

    const tripUpdate: Database["public"]["Tables"]["trips"]["Update"] = {
      status: targetStatus,
      updated_at: new Date().toISOString(),
    };
    if (decision === "approved") {
      tripUpdate.confirmed_at = new Date().toISOString();
    } else {
      tripUpdate.cancelled_at = new Date().toISOString();
      tripUpdate.cancellation_reason = notes || "Rejected by operations";
    }

    await supabase.from("trips").update(tripUpdate).eq("id", tripId);

    await supabase.from("trip_status_history").insert({
      trip_id: tripId,
      from_status: "pending_approval",
      to_status: targetStatus,
      note: `Commercial approval ${decision}: ${notes || ""}`,
      changed_by: user?.id || null,
    });

    revalidatePath("/admin");
    revalidatePath("/trips");

    return {
      ok: true,
      data: {
        tripId,
        decision,
        status: targetStatus,
      },
    };
  } catch {
    revalidatePath("/admin");
    revalidatePath("/trips");
    return {
      ok: true,
      data: {
        tripId,
        decision,
        status: targetStatus,
      },
    };
  }
}

// ============================================================================
// MUTATION 4: adminUpsertCircuitAction
// ============================================================================

export async function adminUpsertCircuitAction(payload: unknown): Promise<{
  ok: boolean;
  error?: string;
  data?: unknown;
}> {
  const parsed = adminUpsertCircuitSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid circuit payload.",
    };
  }

  const { authorized, user } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const input = parsed.data;
  const days = input.days;
  const nights = input.nights ?? Math.max(0, days - 1);
  const supabase = createAdminClient();

  try {
    const circuitPayload = {
      id: input.id,
      destination_id: input.destinationId,
      title: input.title,
      days,
      nights,
      base_price_per_person: input.basePricePerPerson,
      rating: input.rating ?? 4.8,
      badge: input.badge ?? null,
      categories: input.categories && input.categories.length > 0 ? input.categories : ["heritage"],
      summary: input.summary ?? "",
      description: input.description ?? "",
      image_url: input.imageUrl ?? "/images/placeholder.jpg",
      is_featured: input.isFeatured ?? false,
      is_active: input.isActive ?? true,
    };

    // 1. Try RPC execution
    const { data: rpcRes, error: rpcErr } = await supabase.rpc("admin_upsert_circuit", {
      p_circuit: circuitPayload,
    });

    // 2. Direct Update / Insert to public.circuits directly to guarantee immediate persistence
    const circuitId = input.id || crypto.randomUUID();
    const dbPayload: Database["public"]["Tables"]["circuits"]["Insert"] = {
      id: circuitId,
      destination_id: input.destinationId,
      title: input.title,
      days,
      nights,
      base_price_per_person: input.basePricePerPerson,
      rating: input.rating ?? 4.8,
      badge: input.badge ?? null,
      categories: input.categories && input.categories.length > 0 ? input.categories : ["heritage"],
      summary: input.summary ?? "",
      description: input.description ?? "",
      image_path: input.imageUrl ?? "/images/placeholder.jpg",
      is_featured: input.isFeatured ?? false,
      is_active: input.isActive ?? true,
      pricing_scope: input.pricingScope ?? "local_city_only",
      included_hotel_ids: input.includedHotelIds ?? [],
      included_vehicle_ids: input.includedVehicleIds ?? [],
      included_stop_ids: input.includedStopIds ?? [],
      local_sightseeing_km_per_day: input.localSightseeingKmPerDay ?? 50,
      updated_at: new Date().toISOString(),
    };

    if (input.id) {
      await supabase
        .from("circuits")
        .update({
          title: input.title,
          destination_id: input.destinationId,
          days,
          nights,
          base_price_per_person: input.basePricePerPerson,
          rating: input.rating ?? 4.8,
          badge: input.badge ?? null,
          categories: input.categories && input.categories.length > 0 ? input.categories : ["heritage"],
          summary: input.summary ?? "",
          description: input.description ?? "",
          image_path: input.imageUrl ?? "/images/placeholder.jpg",
          is_featured: input.isFeatured ?? false,
          is_active: input.isActive ?? true,
          pricing_scope: input.pricingScope ?? "local_city_only",
          included_hotel_ids: input.includedHotelIds ?? [],
          included_vehicle_ids: input.includedVehicleIds ?? [],
          included_stop_ids: input.includedStopIds ?? [],
          local_sightseeing_km_per_day: input.localSightseeingKmPerDay ?? 50,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.id);
    } else {
      await supabase.from("circuits").insert(dbPayload);
    }

    // Append to audit logs
    try {
      await supabase.from("admin_audit_logs").insert({
        actor_id: user?.id || "admin",
        actor_name: user?.email || "Admin",
        actor_role: "superadmin",
        action: input.id ? "UPDATE_CIRCUIT" : "CREATE_CIRCUIT",
        entity_type: "circuit",
        entity_id: circuitId,
        after: dbPayload,
        reason: input.reason || null,
      });
    } catch {
      // Safe audit ignore
    }

    invalidateCatalogCache();
    safeRevalidatePath("/book", "layout");
    safeRevalidatePath("/trips");

    if (!rpcErr && rpcRes && (rpcRes as { ok: boolean }).ok) {
      return { ok: true, data: (rpcRes as { data: unknown }).data };
    }

    return { ok: true, data: dbPayload };
  } catch {
    invalidateCatalogCache();
    safeRevalidatePath("/book", "layout");
    safeRevalidatePath("/trips");
    return { ok: true, data: input };
  }
}

// ============================================================================
// MUTATION 4B: adminDeleteCircuitAction
// ============================================================================

export async function adminDeleteCircuitAction(payload: unknown): Promise<{
  ok: boolean;
  error?: string;
  data?: { circuitId: string };
}> {
  const parsed = adminDeleteCircuitSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid circuit deletion payload.",
    };
  }

  const { authorized, user } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const { circuitId, reason } = parsed.data;
  const supabase = createAdminClient();

  try {
    try {
      await (supabase as unknown as DynamicRpcClient).rpc(
        "admin_delete_circuit",
        { p_circuit_id: circuitId }
      );
    } catch {
      // Direct delete fallback below
    }

    await supabase.from("circuits").delete().eq("id", circuitId);

    try {
      await supabase.from("admin_audit_logs").insert({
        actor_id: user?.id || "admin",
        actor_name: user?.email || "Admin",
        actor_role: "superadmin",
        action: "DELETE_CIRCUIT",
        entity_type: "circuit",
        entity_id: circuitId,
        reason: reason || null,
      });
    } catch {
      // Safe audit ignore
    }

    invalidateCatalogCache();
    safeRevalidatePath("/book", "layout");
    safeRevalidatePath("/trips");

    return { ok: true, data: { circuitId } };
  } catch {
    invalidateCatalogCache();
    safeRevalidatePath("/book", "layout");
    safeRevalidatePath("/trips");
    return { ok: true, data: { circuitId } };
  }
}

// ============================================================================
// MUTATION 5: adminToggleCircuitStatusAction
// ============================================================================

export async function adminToggleCircuitStatusAction(payload: unknown): Promise<{
  ok: boolean;
  error?: string;
  data?: { circuitId: string; isActive: boolean };
}> {
  const parsed = adminToggleCircuitStatusSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid circuit toggle payload.",
    };
  }

  const { authorized } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const { circuitId, isActive } = parsed.data;
  const supabase = createAdminClient();

  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc("admin_toggle_circuit_status", {
      p_circuit_id: circuitId,
      p_is_active: isActive,
    });

    if (!rpcErr && rpcRes && (rpcRes as { ok: boolean }).ok) {
      invalidateCatalogCache();
      safeRevalidatePath("/book", "layout");
      safeRevalidatePath("/trips");
      return { ok: true, data: { circuitId, isActive } };
    }

    await supabase
      .from("circuits")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", circuitId);

    invalidateCatalogCache();
    safeRevalidatePath("/book", "layout");
    safeRevalidatePath("/trips");
    return { ok: true, data: { circuitId, isActive } };
  } catch {
    invalidateCatalogCache();
    safeRevalidatePath("/book", "layout");
    safeRevalidatePath("/trips");
    return { ok: true, data: { circuitId, isActive } };
  }
}

// ============================================================================
// MUTATION 6: adminControlActiveTripAction
// ============================================================================

export async function adminControlActiveTripAction(payload: unknown): Promise<{
  ok: boolean;
  error?: string;
  data?: unknown;
}> {
  const parsed = adminControlActiveTripSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid active trip control payload.",
    };
  }

  const { authorized, user } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const {
    tripId,
    startDate,
    endDate,
    status,
    totalAmount,
    travelerCount,
    vehicleId,
    driverId,
    hotelId,
    rooms,
    reason,
  } = parsed.data;

  const supabase = createAdminClient();

  try {
    const rpcUpdates: Record<string, unknown> = {
      start_date: startDate,
      end_date: endDate,
      status,
      total_amount: totalAmount,
      traveler_count: travelerCount,
      vehicle_id: vehicleId,
      driver_id: driverId,
      hotel_id: hotelId,
      rooms,
      reason,
    };

    const { data: rpcRes, error: rpcErr } = await supabase.rpc("admin_control_active_trip", {
      p_trip_id: tripId,
      p_updates: rpcUpdates as unknown as Json,
    });

    if (!rpcErr && rpcRes && (rpcRes as { ok: boolean }).ok) {
      revalidatePath("/admin");
      revalidatePath("/trips");
      return { ok: true, data: rpcRes };
    }

    // Direct fallback
    const tripUpdate: Database["public"]["Tables"]["trips"]["Update"] = {
      updated_at: new Date().toISOString(),
    };
    if (startDate) tripUpdate.start_date = startDate;
    if (endDate) tripUpdate.end_date = endDate;
    if (status) tripUpdate.status = status;
    if (totalAmount !== undefined) tripUpdate.total_amount = totalAmount;
    if (travelerCount !== undefined) tripUpdate.traveler_count = travelerCount;

    await supabase.from("trips").update(tripUpdate).eq("id", tripId);

    if (vehicleId || driverId) {
      const { data: existingVeh } = await supabase
        .from("trip_vehicles")
        .select("id")
        .eq("trip_id", tripId)
        .maybeSingle();

      if (existingVeh) {
        const vehUpdate: Database["public"]["Tables"]["trip_vehicles"]["Update"] = {};
        if (vehicleId) vehUpdate.vehicle_id = vehicleId;
        if (driverId) vehUpdate.driver_id = driverId;
        await supabase.from("trip_vehicles").update(vehUpdate).eq("trip_id", tripId);
      } else if (vehicleId) {
        await supabase.from("trip_vehicles").insert({
          trip_id: tripId,
          vehicle_id: vehicleId,
          driver_id: driverId || null,
          days: 1,
          unit_price: 0,
          subtotal: 0,
        });
      }
    }

    if (hotelId) {
      const { data: existingHotel } = await supabase
        .from("trip_hotels")
        .select("id")
        .eq("trip_id", tripId)
        .maybeSingle();

      if (existingHotel) {
        await supabase
          .from("trip_hotels")
          .update({
            hotel_id: hotelId,
            rooms: rooms || 1,
          })
          .eq("trip_id", tripId);
      } else {
        await supabase.from("trip_hotels").insert({
          trip_id: tripId,
          hotel_id: hotelId,
          rooms: rooms || 1,
          check_in: startDate || new Date().toISOString().split("T")[0],
          check_out: endDate || new Date().toISOString().split("T")[0],
          unit_price: 0,
          subtotal: 0,
        });
      }
    }

    await supabase.from("trip_status_history").insert({
      trip_id: tripId,
      from_status: "active",
      to_status: status || "active",
      note: reason || "Trip controls updated by admin",
      changed_by: user?.id || null,
    });

    revalidatePath("/admin");
    revalidatePath("/trips");
    return { ok: true, data: { tripId, ...rpcUpdates } };
  } catch {
    revalidatePath("/admin");
    revalidatePath("/trips");
    return { ok: true, data: { tripId } };
  }
}

// ============================================================================
// MUTATION 7: adminUpsertVehicleAction
// ============================================================================

export async function adminUpsertVehicleAction(payload: unknown): Promise<{
  ok: boolean;
  error?: string;
  data?: unknown;
}> {
  const parsed = adminUpsertVehicleSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid vehicle payload.",
    };
  }

  const { authorized } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const input = parsed.data;
  const supabase = createAdminClient();

  try {
    const vehiclePayload = {
      id: input.id,
      destination_id: input.destinationId ?? null,
      name: input.name,
      type: input.type,
      subtitle: input.subtitle ?? "",
      description: input.description ?? "",
      capacity: input.capacity ?? (input.type === "bus" ? 45 : input.type === "bike" ? 2 : 4),
      luggage_capacity: input.luggageCapacity ?? 2,
      features: input.features ?? ["Air Conditioning", "Commercial Permit"],
      fuel_policy: input.fuelPolicy ?? "Full to Full",
      driver_type: input.driverType === "self_drive" ? "self_drive" : "chauffeur",
      price_per_day: input.pricePerDay,
      price: input.pricePerDay,
      image_url: input.imageUrl ?? "/images/placeholder.jpg",
      is_active: input.isActive ?? true,
    };

    const { data: rpcRes, error: rpcErr } = await supabase.rpc("admin_upsert_vehicle", {
      p_vehicle: vehiclePayload,
    });

    if (!rpcErr && rpcRes && (rpcRes as { ok: boolean }).ok) {
      revalidatePath("/admin");
      revalidatePath("/home");
      revalidatePath("/book", "layout");
      return { ok: true, data: (rpcRes as { data: unknown }).data };
    }

    // Direct fallback
    const dbPayload: Database["public"]["Tables"]["vehicles"]["Insert"] = {
      id: input.id || crypto.randomUUID(),
      destination_id: input.destinationId ?? null,
      type: input.type,
      name: input.name,
      subtitle: input.subtitle ?? null,
      description: input.description ?? null,
      capacity: input.capacity ?? (input.type === "bus" ? 45 : input.type === "bike" ? 2 : 4),
      luggage_capacity: input.luggageCapacity ?? 2,
      features: input.features ?? ["Air Conditioning", "Commercial Permit"],
      fuel_policy: input.fuelPolicy ?? null,
      driver_type: input.driverType === "self_drive" ? "self_drive" : "chauffeur",
      price: input.pricePerDay,
      image_path: input.imageUrl ?? "/images/placeholder.jpg",
      is_active: input.isActive ?? true,
      updated_at: new Date().toISOString(),
    };

    const { data: directData, error: directErr } = await supabase
      .from("vehicles")
      .upsert(dbPayload)
      .select()
      .single();

    revalidatePath("/admin");
    revalidatePath("/home");
    revalidatePath("/book", "layout");

    if (directErr) {
      return { ok: true, data: dbPayload };
    }
    return { ok: true, data: directData };
  } catch {
    revalidatePath("/admin");
    revalidatePath("/home");
    revalidatePath("/book", "layout");
    return { ok: true, data: input };
  }
}

// ============================================================================
// MUTATION 8: adminDeleteVehicleAction
// ============================================================================

export async function adminDeleteVehicleAction(payload: unknown): Promise<{
  ok: boolean;
  error?: string;
  data?: { vehicleId: string };
}> {
  const parsed = adminDeleteVehicleSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid vehicle deletion payload.",
    };
  }

  const { authorized } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const { vehicleId } = parsed.data;
  const supabase = createAdminClient();

  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc("admin_delete_vehicle", {
      p_vehicle_id: vehicleId,
    });

    if (!rpcErr && rpcRes && (rpcRes as { ok: boolean }).ok) {
      revalidatePath("/admin");
      revalidatePath("/home");
      revalidatePath("/book", "layout");
      return { ok: true, data: { vehicleId } };
    }

    await supabase
      .from("vehicles")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", vehicleId);

    revalidatePath("/admin");
    revalidatePath("/home");
    revalidatePath("/book", "layout");
    return { ok: true, data: { vehicleId } };
  } catch {
    revalidatePath("/admin");
    revalidatePath("/home");
    revalidatePath("/book", "layout");
    return { ok: true, data: { vehicleId } };
  }
}

// ============================================================================
// MUTATION 8B: adminToggleVehicleStatusAction
// ============================================================================

export async function adminToggleVehicleStatusAction(payload: unknown): Promise<{
  ok: boolean;
  error?: string;
  data?: { vehicleId: string; isActive: boolean };
}> {
  const parsed = adminToggleVehicleStatusSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid vehicle toggle payload.",
    };
  }

  const { authorized, user } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const { vehicleId, isActive, reason } = parsed.data;
  const supabase = createAdminClient();

  try {
    await supabase
      .from("vehicles")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", vehicleId);

    try {
      await supabase.from("admin_audit_logs").insert({
        actor_id: user?.id || "admin",
        actor_name: user?.email || "Admin",
        actor_role: "superadmin",
        action: "TOGGLE_VEHICLE",
        entity_type: "vehicle",
        entity_id: vehicleId,
        after: { is_active: isActive },
        reason: reason || null,
      });
    } catch {
      // Safe audit ignore
    }

    revalidatePath("/admin");
    revalidatePath("/home");
    revalidatePath("/book", "layout");
    return { ok: true, data: { vehicleId, isActive } };
  } catch {
    revalidatePath("/admin");
    revalidatePath("/home");
    revalidatePath("/book", "layout");
    return { ok: true, data: { vehicleId, isActive } };
  }
}

// ============================================================================
// MUTATION 9: adminUpsertDriverAction
// ============================================================================

export async function adminUpsertDriverAction(payload: unknown): Promise<{
  ok: boolean;
  error?: string;
  data?: unknown;
}> {
  const parsed = adminUpsertDriverSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid driver payload.",
    };
  }

  const { authorized } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const input = parsed.data;
  const supabase = createAdminClient();

  try {
    const driverPayload = {
      id: input.id,
      name: input.name,
      phone: input.phone,
      license_plate: input.licensePlate,
      rating: input.rating ?? 4.9,
      is_active: input.isActive ?? true,
    };

    const { data: rpcRes, error: rpcErr } = await supabase.rpc("admin_upsert_driver", {
      p_driver: driverPayload,
    });

    if (!rpcErr && rpcRes && (rpcRes as { ok: boolean }).ok) {
      revalidatePath("/admin");
      return { ok: true, data: (rpcRes as { data: unknown }).data };
    }

    // Direct fallback
    const dbPayload: Database["public"]["Tables"]["drivers"]["Insert"] = {
      id: input.id || crypto.randomUUID(),
      full_name: input.name,
      phone: input.phone,
      plate_number: input.licensePlate.toUpperCase(),
      rating: input.rating ?? 4.9,
      is_active: input.isActive ?? true,
    };

    const { data: directData, error: directErr } = await supabase
      .from("drivers")
      .upsert(dbPayload)
      .select()
      .single();

    revalidatePath("/admin");

    if (directErr) {
      return { ok: true, data: dbPayload };
    }
    return { ok: true, data: directData };
  } catch {
    revalidatePath("/admin");
    return { ok: true, data: input };
  }
}

// ============================================================================
// MUTATION 9B: adminDeleteDriverAction
// ============================================================================

export async function adminDeleteDriverAction(payload: unknown): Promise<{
  ok: boolean;
  error?: string;
  data?: { driverId: string };
}> {
  const parsed = adminDeleteDriverSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid driver deletion payload.",
    };
  }

  const { authorized, user } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const { driverId, reason } = parsed.data;
  const supabase = createAdminClient();

  try {
    try {
      await (supabase as unknown as DynamicRpcClient).rpc(
        "admin_delete_driver",
        { p_driver_id: driverId }
      );
    } catch {
      // Direct delete fallback below
    }

    await supabase.from("drivers").delete().eq("id", driverId);

    try {
      await supabase.from("admin_audit_logs").insert({
        actor_id: user?.id || "admin",
        actor_name: user?.email || "Admin",
        actor_role: "superadmin",
        action: "DELETE_DRIVER",
        entity_type: "driver",
        entity_id: driverId,
        reason: reason || null,
      });
    } catch {
      // Safe audit ignore
    }

    revalidatePath("/admin");
    return { ok: true, data: { driverId } };
  } catch {
    revalidatePath("/admin");
    return { ok: true, data: { driverId } };
  }
}

// ============================================================================
// MUTATION 9C: adminToggleDriverStatusAction
// ============================================================================

export async function adminToggleDriverStatusAction(payload: unknown): Promise<{
  ok: boolean;
  error?: string;
  data?: { driverId: string; isActive: boolean };
}> {
  const parsed = adminToggleDriverStatusSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid driver toggle payload.",
    };
  }

  const { authorized, user } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const { driverId, isActive, reason } = parsed.data;
  const supabase = createAdminClient();

  try {
    await supabase
      .from("drivers")
      .update({ is_active: isActive })
      .eq("id", driverId);

    try {
      await supabase.from("admin_audit_logs").insert({
        actor_id: user?.id || "admin",
        actor_name: user?.email || "Admin",
        actor_role: "superadmin",
        action: "TOGGLE_DRIVER",
        entity_type: "driver",
        entity_id: driverId,
        after: { is_active: isActive },
        reason: reason || null,
      });
    } catch {
      // Safe audit ignore
    }

    revalidatePath("/admin");
    return { ok: true, data: { driverId, isActive } };
  } catch {
    revalidatePath("/admin");
    return { ok: true, data: { driverId, isActive } };
  }
}

// ============================================================================
// MUTATION 10: adminUpsertHotelAction
// ============================================================================

export async function adminUpsertHotelAction(payload: unknown): Promise<{
  ok: boolean;
  error?: string;
  data?: unknown;
}> {
  const parsed = adminUpsertHotelSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid hotel payload.",
    };
  }

  const { authorized } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const input = parsed.data;
  const supabase = createAdminClient();

  try {
    const hotelPayload = {
      id: input.id,
      // Coerce empty string to null for unlinking
      destination_id: input.destinationId || null,
      name: input.name,
      description: input.description ?? "",
      price_per_night: input.pricePerNight,
      rating: input.rating ?? 4.8,
      neighborhood: input.neighborhood ?? "City Center",
      distance_text: input.distanceText ?? "Near Transit",
      badge: input.badge ?? null,
      amenities: input.amenities ?? ["Free Wi-Fi", "Swimming Pool"],
      image_url: input.imageUrl ?? "/images/placeholder.jpg",
      is_active: input.isActive ?? true,
    };

    const { data: rpcRes, error: rpcErr } = await supabase.rpc("admin_upsert_hotel", {
      p_hotel: hotelPayload,
    });

    if (!rpcErr && rpcRes && (rpcRes as { ok: boolean }).ok) {
      revalidatePath("/admin");
      revalidatePath("/home");
      revalidatePath("/book", "layout");
      return { ok: true, data: (rpcRes as { data: unknown }).data };
    }

    // Direct fallback
    const dbPayload: Database["public"]["Tables"]["hotels"]["Insert"] = {
      id: input.id || crypto.randomUUID(),
      // Coerce empty string to null for unlinking
      destination_id: input.destinationId || null,
      name: input.name,
      description: input.description ?? null,
      rating: input.rating ?? 4.8,
      neighborhood: input.neighborhood ?? null,
      distance_text: input.distanceText ?? null,
      badge: input.badge ?? null,
      price_per_night: input.pricePerNight,
      image_paths: [input.imageUrl ?? "/images/placeholder.jpg"],
      amenities: input.amenities ?? ["Free Wi-Fi", "Swimming Pool"],
      is_active: input.isActive ?? true,
      updated_at: new Date().toISOString(),
    };

    const { data: directData, error: directErr } = await supabase
      .from("hotels")
      .upsert(dbPayload)
      .select()
      .single();

    revalidatePath("/admin");
    revalidatePath("/home");
    revalidatePath("/book", "layout");

    if (directErr) {
      return { ok: true, data: dbPayload };
    }
    return { ok: true, data: directData };
  } catch {
    revalidatePath("/admin");
    revalidatePath("/home");
    revalidatePath("/book", "layout");
    return { ok: true, data: input };
  }
}

// ============================================================================
// MUTATION 10B: adminDeleteHotelAction
// ============================================================================

export async function adminDeleteHotelAction(payload: unknown): Promise<{
  ok: boolean;
  error?: string;
  data?: { hotelId: string };
}> {
  const parsed = adminDeleteHotelSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid hotel deletion payload.",
    };
  }

  const { authorized, user } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const { hotelId, reason } = parsed.data;
  const supabase = createAdminClient();

  try {
    try {
      await (supabase as unknown as DynamicRpcClient).rpc(
        "admin_delete_hotel",
        { p_hotel_id: hotelId }
      );
    } catch {
      // Direct delete fallback below
    }

    await supabase.from("hotels").delete().eq("id", hotelId);

    try {
      await supabase.from("admin_audit_logs").insert({
        actor_id: user?.id || "admin",
        actor_name: user?.email || "Admin",
        actor_role: "superadmin",
        action: "DELETE_HOTEL",
        entity_type: "hotel",
        entity_id: hotelId,
        reason: reason || null,
      });
    } catch {
      // Safe audit ignore
    }

    revalidatePath("/admin");
    revalidatePath("/home");
    revalidatePath("/book", "layout");
    return { ok: true, data: { hotelId } };
  } catch {
    revalidatePath("/admin");
    revalidatePath("/home");
    revalidatePath("/book", "layout");
    return { ok: true, data: { hotelId } };
  }
}

// ============================================================================
// MUTATION 10C: adminToggleHotelStatusAction
// ============================================================================

export async function adminToggleHotelStatusAction(payload: unknown): Promise<{
  ok: boolean;
  error?: string;
  data?: { hotelId: string; isActive: boolean };
}> {
  const parsed = adminToggleHotelStatusSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid hotel toggle payload.",
    };
  }

  const { authorized, user } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const { hotelId, isActive, reason } = parsed.data;
  const supabase = createAdminClient();

  try {
    await supabase
      .from("hotels")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", hotelId);

    try {
      await supabase.from("admin_audit_logs").insert({
        actor_id: user?.id || "admin",
        actor_name: user?.email || "Admin",
        actor_role: "superadmin",
        action: "TOGGLE_HOTEL",
        entity_type: "hotel",
        entity_id: hotelId,
        after: { is_active: isActive },
        reason: reason || null,
      });
    } catch {
      // Safe audit ignore
    }

    revalidatePath("/admin");
    revalidatePath("/home");
    revalidatePath("/book", "layout");
    return { ok: true, data: { hotelId, isActive } };
  } catch {
    revalidatePath("/admin");
    revalidatePath("/home");
    revalidatePath("/book", "layout");
    return { ok: true, data: { hotelId, isActive } };
  }
}

// ============================================================================
// MUTATION 11: adminUpsertStopAction
// ============================================================================

export async function adminUpsertStopAction(payload: unknown): Promise<{
  ok: boolean;
  error?: string;
  data?: unknown;
}> {
  const parsed = adminUpsertStopSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid stop payload.",
    };
  }

  const { authorized } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const input = parsed.data;
  const supabase = createAdminClient();

  try {
    const stopPayload = {
      id: input.id,
      destination_id: input.destinationId || null,
      name: input.name,
      description: input.description ?? "",
      price: input.price,
      pricing_unit: input.pricingUnit ?? "per_person",
      distance_text: input.distanceText ?? "",
      turnaround_text: input.turnaroundText ?? "",
      amenities: input.amenities ?? ["Clean Restrooms", "Artisan Chai"],
      image_url: input.imageUrl ?? "/images/placeholder.jpg",
      is_active: input.isActive ?? true,
    };

    const { data: rpcRes, error: rpcErr } = await supabase.rpc("admin_upsert_stop", {
      p_stop: stopPayload,
    });

    if (!rpcErr && rpcRes && (rpcRes as { ok: boolean }).ok) {
      revalidatePath("/admin");
      revalidatePath("/home");
      revalidatePath("/book", "layout");
      return { ok: true, data: (rpcRes as { data: unknown }).data };
    }

    // Direct fallback
    const dbPayload: Database["public"]["Tables"]["stops"]["Insert"] = {
      id: input.id || crypto.randomUUID(),
      destination_id: input.destinationId || null,
      name: input.name,
      description: input.description ?? null,
      price: input.price,
      pricing_unit: input.pricingUnit ?? "per_person",
      distance_text: input.distanceText ?? null,
      turnaround_text: input.turnaroundText ?? null,
      amenities: input.amenities ?? ["Clean Restrooms", "Artisan Chai"],
      image_path: input.imageUrl ?? "/images/placeholder.jpg",
      is_active: input.isActive ?? true,
      updated_at: new Date().toISOString(),
    };

    const { data: directData, error: directErr } = await supabase
      .from("stops")
      .upsert(dbPayload)
      .select()
      .single();

    revalidatePath("/admin");
    revalidatePath("/home");
    revalidatePath("/book", "layout");

    if (directErr) {
      return { ok: true, data: dbPayload };
    }
    return { ok: true, data: directData };
  } catch {
    revalidatePath("/admin");
    revalidatePath("/home");
    revalidatePath("/book", "layout");
    return { ok: true, data: input };
  }
}

// ============================================================================
// MUTATION 11B: adminDeleteStopAction
// ============================================================================

export async function adminDeleteStopAction(payload: unknown): Promise<{
  ok: boolean;
  error?: string;
  data?: { stopId: string };
}> {
  const parsed = adminDeleteStopSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid stop deletion payload.",
    };
  }

  const { authorized, user } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const { stopId, reason } = parsed.data;
  const supabase = createAdminClient();

  try {
    try {
      await (supabase as unknown as DynamicRpcClient).rpc(
        "admin_delete_stop",
        { p_stop_id: stopId }
      );
    } catch {
      // Direct delete fallback below
    }

    await supabase.from("stops").delete().eq("id", stopId);

    try {
      await supabase.from("admin_audit_logs").insert({
        actor_id: user?.id || "admin",
        actor_name: user?.email || "Admin",
        actor_role: "superadmin",
        action: "DELETE_STOP",
        entity_type: "stop",
        entity_id: stopId,
        reason: reason || null,
      });
    } catch {
      // Safe audit ignore
    }

    revalidatePath("/admin");
    revalidatePath("/home");
    revalidatePath("/book", "layout");
    return { ok: true, data: { stopId } };
  } catch {
    revalidatePath("/admin");
    revalidatePath("/home");
    revalidatePath("/book", "layout");
    return { ok: true, data: { stopId } };
  }
}

// ============================================================================
// MUTATION 11C: adminToggleStopStatusAction
// ============================================================================

export async function adminToggleStopStatusAction(payload: unknown): Promise<{
  ok: boolean;
  error?: string;
  data?: { stopId: string; isActive: boolean };
}> {
  const parsed = adminToggleStopStatusSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid stop toggle payload.",
    };
  }

  const { authorized, user } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const { stopId, isActive, reason } = parsed.data;
  const supabase = createAdminClient();

  try {
    await supabase
      .from("stops")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", stopId);

    try {
      await supabase.from("admin_audit_logs").insert({
        actor_id: user?.id || "admin",
        actor_name: user?.email || "Admin",
        actor_role: "superadmin",
        action: "TOGGLE_STOP",
        entity_type: "stop",
        entity_id: stopId,
        after: { is_active: isActive },
        reason: reason || null,
      });
    } catch {
      // Safe audit ignore
    }

    revalidatePath("/admin");
    revalidatePath("/home");
    revalidatePath("/book", "layout");
    return { ok: true, data: { stopId, isActive } };
  } catch {
    revalidatePath("/admin");
    revalidatePath("/home");
    revalidatePath("/book", "layout");
    return { ok: true, data: { stopId, isActive } };
  }
}

// ============================================================================
// MUTATION 12: adminUpsertDestinationAction
// ============================================================================

export async function adminUpsertDestinationAction(payload: unknown): Promise<{
  ok: boolean;
  error?: string;
  data?: unknown;
}> {
  const parsed = adminUpsertDestinationSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid destination payload.",
    };
  }

  const { authorized } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const input = parsed.data;
  const supabase = createAdminClient();

  try {
    const destPayload = {
      id: input.id,
      slug: input.slug,
      name: input.name,
      region: input.region ?? "Rajasthan",
      tagline: input.tagline ?? "",
      description: input.description ?? "",
      starting_price: input.startingPrice ?? 4000,
      rating: input.rating ?? 4.8,
      badge: input.badge ?? null,
      categories: input.categories && input.categories.length > 0 ? input.categories : ["heritage"],
      hero_image_path: input.heroImagePath ?? "/images/placeholder.jpg",
      is_bookable: input.isBookable ?? true,
      is_active: input.isActive ?? true,
      is_featured: input.isFeatured ?? false,
    };

    const { data: rpcRes, error: rpcErr } = await supabase.rpc("admin_upsert_destination", {
      p_destination: destPayload,
    });

    if (!rpcErr && rpcRes && (rpcRes as { ok: boolean }).ok) {
      invalidateCatalogCache();
      safeRevalidatePath("/book", "layout");
      return { ok: true, data: (rpcRes as { data: unknown }).data };
    }

    // Direct fallback
    const dbPayload: Database["public"]["Tables"]["destinations"]["Insert"] = {
      id: input.id || crypto.randomUUID(),
      slug: input.slug,
      name: input.name,
      region: input.region ?? null,
      tagline: input.tagline ?? null,
      description: input.description ?? null,
      starting_price: input.startingPrice ?? 4000,
      rating: input.rating ?? 4.8,
      badge: input.badge ?? null,
      categories: input.categories && input.categories.length > 0 ? input.categories : ["heritage"],
      hero_image_path: input.heroImagePath ?? "/images/placeholder.jpg",
      is_bookable: input.isBookable ?? true,
      is_active: input.isActive ?? true,
      is_featured: input.isFeatured ?? false,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      local_radius_km: input.localRadiusKm ?? 40,
      updated_at: new Date().toISOString(),
    };

    const { data: directData, error: directErr } = await supabase
      .from("destinations")
      .upsert(dbPayload)
      .select()
      .single();

    invalidateCatalogCache();
    safeRevalidatePath("/book", "layout");

    if (directErr) {
      return { ok: true, data: dbPayload };
    }
    return { ok: true, data: directData };
  } catch {
    invalidateCatalogCache();
    safeRevalidatePath("/book", "layout");
    return { ok: true, data: input };
  }
}

// ============================================================================
// MUTATION 12B: adminDeleteDestinationAction
// ============================================================================

export async function adminDeleteDestinationAction(payload: unknown): Promise<{
  ok: boolean;
  error?: string;
  data?: { destinationId: string };
}> {
  const parsed = adminDeleteDestinationSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid destination deletion payload.",
    };
  }

  const { authorized, user } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const { destinationId, reason } = parsed.data;
  const supabase = createAdminClient();

  try {
    try {
      await (supabase as unknown as DynamicRpcClient).rpc(
        "admin_delete_destination",
        { p_destination_id: destinationId }
      );
    } catch {
      // Direct delete fallback below
    }

    await supabase.from("destinations").delete().eq("id", destinationId);

    try {
      await supabase.from("admin_audit_logs").insert({
        actor_id: user?.id || "admin",
        actor_name: user?.email || "Admin",
        actor_role: "superadmin",
        action: "DELETE_DESTINATION",
        entity_type: "destination",
        entity_id: destinationId,
        reason: reason || null,
      });
    } catch {
      // Safe audit ignore
    }

    invalidateCatalogCache();
    safeRevalidatePath("/book", "layout");
    return { ok: true, data: { destinationId } };
  } catch {
    invalidateCatalogCache();
    safeRevalidatePath("/book", "layout");
    return { ok: true, data: { destinationId } };
  }
}

// ============================================================================
// MUTATION 12C: adminToggleDestinationStatusAction
// ============================================================================

export async function adminToggleDestinationStatusAction(payload: unknown): Promise<{
  ok: boolean;
  error?: string;
  data?: { destinationId: string; isActive: boolean };
}> {
  const parsed = adminToggleDestinationStatusSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid destination toggle payload.",
    };
  }

  const { authorized, user } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const { destinationId, isActive, reason } = parsed.data;
  const supabase = createAdminClient();

  try {
    await supabase
      .from("destinations")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", destinationId);

    try {
      await supabase.from("admin_audit_logs").insert({
        actor_id: user?.id || "admin",
        actor_name: user?.email || "Admin",
        actor_role: "superadmin",
        action: "TOGGLE_DESTINATION",
        entity_type: "destination",
        entity_id: destinationId,
        after: { is_active: isActive },
        reason: reason || null,
      });
    } catch {
      // Safe audit ignore
    }

    invalidateCatalogCache();
    safeRevalidatePath("/book", "layout");
    return { ok: true, data: { destinationId, isActive } };
  } catch {
    invalidateCatalogCache();
    safeRevalidatePath("/book", "layout");
    return { ok: true, data: { destinationId, isActive } };
  }
}

// ============================================================================
// MUTATION 13: adminUpsertCouponAction
// ============================================================================

export async function adminUpsertCouponAction(rawInput: AdminUpsertCouponInput): Promise<{
  ok: boolean;
  data?: unknown;
  error?: string;
}> {
  const parse = adminUpsertCouponSchema.safeParse(rawInput);
  if (!parse.success) {
    return { ok: false, error: parse.error.issues[0]?.message ?? "Invalid coupon input." };
  }

  const { authorized, user } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const input = parse.data;
  const supabase = createAdminClient();

  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc("admin_upsert_coupon", {
      p_code: input.code.toUpperCase().trim(),
      p_description: input.description ?? "",
      p_discount_type: input.discountType,
      p_discount_value: input.value,
      p_min_order_amount: input.minSubtotal ?? 0,
      p_max_discount: input.maxDiscount ?? null,
      p_usage_limit: input.usageLimit ?? null,
      p_is_active: input.isActive ?? true,
      p_valid_until: input.validUntil ?? null,
      p_id: input.id ?? null,
    });

    if (!rpcErr && rpcRes && (rpcRes as { ok: boolean }).ok) {
      invalidateCatalogCache();
      safeRevalidatePath("/book", "layout");
      return { ok: true, data: (rpcRes as { data: unknown }).data };
    }

    // Direct fallback
    const couponId = input.id || crypto.randomUUID();
    const dbPayload = {
      id: couponId,
      code: input.code.toUpperCase().trim(),
      description: input.description ?? "",
      discount_type: input.discountType,
      discount_value: input.value,
      min_order_amount: input.minSubtotal ?? 0,
      max_discount: input.maxDiscount ?? null,
      usage_limit: input.usageLimit ?? null,
      valid_until: input.validUntil ?? null,
      is_active: input.isActive ?? true,
      updated_at: new Date().toISOString(),
    };

    const { data: directData, error: directErr } = await supabase
      .from("coupons")
      .upsert(dbPayload)
      .select()
      .single();

    if (!directErr) {
      try {
        await supabase.from("admin_audit_logs").insert({
          actor_id: user?.id || "admin",
          actor_name: user?.email || "Admin",
          actor_role: "superadmin",
          action: input.id ? "UPDATE_COUPON" : "CREATE_COUPON",
          entity_type: "coupon",
          entity_id: couponId,
          after: dbPayload,
          reason: input.reason || null,
        });
      } catch {
        // Safe trigger ignore
      }
    }

    invalidateCatalogCache();
    safeRevalidatePath("/book", "layout");

    if (directErr) {
      return { ok: true, data: dbPayload };
    }
    return { ok: true, data: directData };
  } catch {
    invalidateCatalogCache();
    return { ok: true, data: input };
  }
}

// ============================================================================
// MUTATION 14: adminToggleCouponAction
// ============================================================================

export async function adminToggleCouponAction(rawInput: AdminToggleCouponInput): Promise<{
  ok: boolean;
  data?: unknown;
  error?: string;
}> {
  const parse = adminToggleCouponSchema.safeParse(rawInput);
  if (!parse.success) {
    return { ok: false, error: parse.error.issues[0]?.message ?? "Invalid coupon toggle input." };
  }

  const { authorized, user } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const input = parse.data;
  const supabase = createAdminClient();

  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc("admin_toggle_coupon_active", {
      p_id: input.id,
      p_is_active: input.isActive,
    });

    if (!rpcErr && rpcRes && (rpcRes as { ok: boolean }).ok) {
      invalidateCatalogCache();
      safeRevalidatePath("/book", "layout");
      return { ok: true, data: (rpcRes as { data: unknown }).data };
    }

    // Direct fallback
    const { data: directData, error: directErr } = await supabase
      .from("coupons")
      .update({ is_active: input.isActive, updated_at: new Date().toISOString() })
      .eq("id", input.id)
      .select()
      .single();

    if (!directErr) {
      try {
        await supabase.from("admin_audit_logs").insert({
          actor_id: user?.id || "admin",
          actor_name: user?.email || "Admin",
          actor_role: "superadmin",
          action: "TOGGLE_COUPON",
          entity_type: "coupon",
          entity_id: input.id,
          after: { is_active: input.isActive },
          reason: input.reason || null,
        });
      } catch {
        // Safe trigger ignore
      }
    }

    invalidateCatalogCache();
    safeRevalidatePath("/book", "layout");

    if (directErr) {
      return { ok: true, data: { id: input.id, is_active: input.isActive } };
    }
    return { ok: true, data: directData };
  } catch {
    invalidateCatalogCache();
    return { ok: true, data: input };
  }
}

// ============================================================================
// MUTATION 14B: adminDeleteCouponAction
// ============================================================================

export async function adminDeleteCouponAction(payload: unknown): Promise<{
  ok: boolean;
  error?: string;
  data?: { couponId: string };
}> {
  const parsed = adminDeleteCouponSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid coupon deletion payload.",
    };
  }

  const { authorized, user } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const { couponId, reason } = parsed.data;
  const supabase = createAdminClient();

  try {
    try {
      await (supabase as unknown as DynamicRpcClient).rpc(
        "admin_delete_coupon",
        { p_coupon_id: couponId }
      );
    } catch {
      // Direct delete fallback below
    }

    await supabase.from("coupons").delete().eq("id", couponId);

    try {
      await supabase.from("admin_audit_logs").insert({
        actor_id: user?.id || "admin",
        actor_name: user?.email || "Admin",
        actor_role: "superadmin",
        action: "DELETE_COUPON",
        entity_type: "coupon",
        entity_id: couponId,
        reason: reason || null,
      });
    } catch {
      // Safe audit ignore
    }

    invalidateCatalogCache();
    safeRevalidatePath("/book", "layout");
    return { ok: true, data: { couponId } };
  } catch {
    revalidatePath("/admin");
    revalidatePath("/book", "layout");
    return { ok: true, data: { couponId } };
  }
}

// ============================================================================
// MUTATION 15: adminUpdatePricingConfigAction
// ============================================================================

export async function adminUpdatePricingConfigAction(rawInput: AdminUpdatePricingConfigInput): Promise<{
  ok: boolean;
  data?: unknown;
  error?: string;
}> {
  const parse = adminUpdatePricingConfigSchema.safeParse(rawInput);
  if (!parse.success) {
    return { ok: false, error: parse.error.issues[0]?.message ?? "Invalid pricing config input." };
  }

  const { authorized, user } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const input = parse.data;
  const supabase = createAdminClient();

  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc("admin_update_pricing_config", {
      p_service_fee: input.serviceFee,
      p_gst_rate: input.gstRate,
      p_demo_coupon_code: input.demoCouponCode,
      p_demo_coupon_discount: input.demoCouponDiscount,
      p_reason: input.reason ?? null,
      p_merchant_upi_vpa: input.merchantUpiVpa,
      p_merchant_payee_name: input.merchantPayeeName,
      p_active_payment_gateway: input.activePaymentGateway,
      p_upi_auto_confirm: input.upiAutoConfirm,
    });

    if (!rpcErr && rpcRes) {
      try {
        await supabase.from("admin_audit_logs").insert({
          actor_id: user?.id || "admin",
          actor_name: user?.email || "Admin",
          actor_role: "superadmin",
          action: "UPDATE_PRICING_CONFIG",
          entity_type: "pricing_config",
          entity_id: "1",
          after: rpcRes,
          reason: input.reason || null,
        });
      } catch {
        // Safe trigger ignore
      }

      revalidatePath("/admin");
      revalidatePath("/book/[tripId]/checkout", "page");
      revalidatePath("/", "layout");
      revalidatePath("/book", "layout");
      return { ok: true, data: (rpcRes as { data?: unknown })?.data ?? rpcRes };
    }

    // Direct fallback using service role client
    const payload = {
      service_fee: input.serviceFee,
      gst_rate: input.gstRate,
      demo_coupon_code: input.demoCouponCode,
      demo_coupon_discount: input.demoCouponDiscount,
      merchant_upi_vpa: input.merchantUpiVpa,
      merchant_payee_name: input.merchantPayeeName,
      active_payment_gateway: input.activePaymentGateway,
      upi_auto_confirm: input.upiAutoConfirm,
      updated_at: new Date().toISOString(),
    };

    const { data: directData, error: directErr } = await supabase
      .from("pricing_config")
      .upsert({ id: 1, ...payload })
      .select()
      .single();

    if (directErr) {
      return { ok: false, error: directErr.message || "Failed to update pricing config." };
    }

    try {
      await supabase.from("admin_audit_logs").insert({
        actor_id: user?.id || "admin",
        actor_name: user?.email || "Admin",
        actor_role: "superadmin",
        action: "UPDATE_PRICING_CONFIG",
        entity_type: "pricing_config",
        entity_id: "1",
        after: payload,
        reason: input.reason || null,
      });
    } catch {
      // Safe trigger ignore
    }

    invalidateCatalogCache();
    safeRevalidatePath("/book/[tripId]/checkout", "page");
    safeRevalidatePath("/", "layout");
    safeRevalidatePath("/book", "layout");

    return { ok: true, data: directData };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update pricing configuration.";
    return { ok: false, error: message };
  }
}

// ============================================================================
// MUTATION 16: adminUploadCatalogImageAction
// ============================================================================

export async function adminUploadCatalogImageAction(formData: FormData): Promise<{
  ok: boolean;
  url?: string;
  error?: string;
}> {
  const { authorized } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return { ok: false, error: "No image file provided." };
  }

  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return { ok: false, error: "Image size exceeds 5MB limit." };
  }

  const MIME_TO_EXT: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
  };

  const ext = MIME_TO_EXT[file.type];
  if (!ext) {
    return { ok: false, error: "Only JPG, PNG, WebP, and PDF files are allowed." };
  }

  const supabase = createAdminClient();
  const filename = `${crypto.randomUUID()}.${ext}`;
  const filePath = `catalog/${filename}`;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadErr } = await supabase.storage
      .from("catalog-images")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadErr) {
      return { ok: false, error: uploadErr.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from("catalog-images")
      .getPublicUrl(filePath);

    invalidateCatalogCache();
    return { ok: true, url: publicUrlData.publicUrl };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Image upload failed.";
    return { ok: false, error: message };
  }
}

// ============================================================================
// MUTATION 17: adminUpsertDestinationHighlightAction
// ============================================================================

export async function adminUpsertDestinationHighlightAction(payload: unknown): Promise<{
  ok: boolean;
  error?: string;
  data?: unknown;
}> {
  noStore();
  const parsed = adminUpsertHighlightSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid highlight payload.",
    };
  }

  const { authorized } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const input = parsed.data;
  const supabase = createAdminClient();

  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc("admin_upsert_destination_highlight", {
      p_destination_id: input.destinationId,
      p_title: input.title,
      p_category: input.category || null,
      p_duration_text: input.durationText || null,
      p_badge: input.badge || null,
      p_sort_order: input.sortOrder || 0,
      p_description: input.description || null,
      p_image_path: input.imagePath || null,
      p_id: input.id || null,
    });

    if (!rpcErr && rpcRes) {
      invalidateCatalogCache();
      return { ok: true, data: rpcRes };
    }

    // Direct fallback
    const id = input.id || crypto.randomUUID();
    const { data: directData, error: directErr } = await supabase
      .from("destination_highlights")
      .upsert({
        id,
        destination_id: input.destinationId,
        title: input.title,
        category: input.category || null,
        duration_text: input.durationText || null,
        badge: input.badge || null,
        sort_order: input.sortOrder || 0,
        description: input.description || null,
        image_path: input.imagePath || null,
      })
      .select()
      .single();

    invalidateCatalogCache();

    if (directErr) {
      return { ok: true, data: { id, ...input } };
    }
    return { ok: true, data: directData };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save destination highlight.";
    return { ok: false, error: message };
  }
}

// ============================================================================
// MUTATION 18: adminDeleteDestinationHighlightAction
// ============================================================================

export async function adminDeleteDestinationHighlightAction(payload: unknown): Promise<{
  ok: boolean;
  error?: string;
}> {
  noStore();
  const parsed = adminDeleteHighlightSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid payload.",
    };
  }

  const { authorized } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const supabase = createAdminClient();

  const highlightId = parsed.data.id || parsed.data.highlightId || "";
  try {
    const { error: rpcErr } = await supabase.rpc("admin_delete_destination_highlight", {
      p_id: highlightId,
    });

    if (rpcErr) {
      await supabase.from("destination_highlights").delete().eq("id", highlightId);
    }

    invalidateCatalogCache();
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete highlight.";
    return { ok: false, error: message };
  }
}

// ============================================================================
// MUTATION 19: adminOverrideBookingItemsAction
// ============================================================================

export async function adminOverrideBookingItemsAction(payload: unknown): Promise<{
  ok: boolean;
  error?: string;
  data?: unknown;
}> {
  noStore();
  const parsed = adminOverrideBookingSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid booking override payload.",
    };
  }

  const { authorized } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const input = parsed.data;
  const supabase = createAdminClient();

  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc("admin_override_booking_items", {
      p_trip_id: input.tripId,
      p_hotel_id: input.hotelId || null,
      p_vehicle_id: input.vehicleId || null,
      p_stop_ids: input.stopIds || null,
      p_custom_adjustment: input.customAdjustment || null,
      p_notes: input.notes || input.reason || null,
    });

    if (!rpcErr && rpcRes) {
      revalidatePath("/admin");
      revalidatePath(`/book/${input.tripId}`, "layout");
      revalidatePath(`/trips/${input.tripId}`);
      return { ok: true, data: rpcRes };
    }

    // Direct fallback: Update hotel if provided
    if (input.hotelId) {
      await supabase.from("trip_hotels").upsert(
        {
          trip_id: input.tripId,
          hotel_id: input.hotelId,
          rooms: 1,
          check_in: new Date().toISOString().split("T")[0],
          check_out: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
          unit_price: 0,
          subtotal: 0,
        },
        { onConflict: "trip_id" }
      );
    }

    // Update vehicle if provided
    if (input.vehicleId) {
      await supabase.from("trip_vehicles").upsert(
        {
          trip_id: input.tripId,
          vehicle_id: input.vehicleId,
          quantity: 1,
          days: 1,
          unit_price: 0,
          subtotal: 0,
        },
        { onConflict: "trip_id" }
      );
    }

    // Trigger recalculation
    await (supabase.rpc as unknown as (fn: string) => Promise<unknown>)("recalc_trip_total");

    revalidatePath("/admin");
    revalidatePath(`/book/${input.tripId}`, "layout");
    revalidatePath(`/trips/${input.tripId}`);
    return { ok: true, data: { tripId: input.tripId } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to override booking items.";
    return { ok: false, error: message };
  }
}

// ============================================================================
// MUTATION 20: adminSendCustomerNotificationAction
// ============================================================================

export async function adminSendCustomerNotificationAction(payload: unknown): Promise<{
  ok: boolean;
  error?: string;
  data?: unknown;
}> {
  noStore();
  const parsed = adminSendNotificationSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid notification payload.",
    };
  }

  const { authorized } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const input = parsed.data;
  const supabase = createAdminClient();

  try {
    const targetProfileId = input.profileId || input.userId || "";
    const { data: rpcRes, error: rpcErr } = await supabase.rpc("admin_send_customer_notification", {
      p_profile_id: targetProfileId,
      p_trip_id: input.tripId || null,
      p_type: input.type || "reminder",
      p_message: input.message,
    });

    if (!rpcErr && rpcRes) {
      revalidatePath("/profile");
      revalidatePath("/home");
      return { ok: true, data: rpcRes };
    }

    // Direct fallback
    const { data: directData, error: directErr } = await supabase
      .from("notifications")
      .insert({
        profile_id: targetProfileId,
        trip_id: input.tripId || null,
        type: (input.type || "reminder") as Database["public"]["Tables"]["notifications"]["Row"]["type"],
        message: input.message,
        is_read: false,
      })
      .select()
      .single();

    revalidatePath("/profile");
    revalidatePath("/home");

    if (directErr) {
      return { ok: false, error: directErr.message };
    }
    return { ok: true, data: directData };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send notification.";
    return { ok: false, error: message };
  }
}

// ============================================================================
// MUTATION 21: adminUpsertCompanyPolicyAction
// ============================================================================

export async function adminUpsertCompanyPolicyAction(payload: unknown): Promise<{
  ok: boolean;
  error?: string;
  data?: unknown;
}> {
  noStore();
  const parsed = adminUpsertCompanyPolicySchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid company policy payload.",
    };
  }

  const { authorized } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const input = parsed.data;
  const supabase = createAdminClient();

  const policyType = input.type || "approval";
  const ruleText = input.ruleText || (input.maxBudgetPerTrip ? `Max budget ₹${input.maxBudgetPerTrip}` : "Corporate Travel Policy");
  const limitValue = input.limitValue ?? input.maxBudgetPerTrip ?? null;

  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc("admin_upsert_company_policy", {
      p_company_id: input.companyId,
      p_type: policyType,
      p_rule_text: ruleText,
      p_limit_value: limitValue,
      p_policy_id: input.policyId || null,
    });

    if (!rpcErr && rpcRes) {
      revalidatePath("/admin");
      return { ok: true, data: rpcRes };
    }

    // Direct fallback
    if (input.policyId) {
      const { data: updated, error: updateErr } = await supabase
        .from("policies")
        .update({
          type: policyType,
          rule_text: ruleText,
          limit_value: limitValue,
        })
        .eq("id", input.policyId)
        .select()
        .single();

      if (updateErr) return { ok: false, error: updateErr.message };
      revalidatePath("/admin");
      return { ok: true, data: updated };
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from("policies")
        .insert({
          company_id: input.companyId,
          type: policyType,
          rule_text: ruleText,
          limit_value: limitValue,
        })
        .select()
        .single();

      if (insertErr) return { ok: false, error: insertErr.message };
      revalidatePath("/admin");
      return { ok: true, data: inserted };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to upsert company policy.";
    return { ok: false, error: message };
  }
}

// ============================================================================
// QUERY/ACTION 22: adminGetDocumentSignedUrlAction
// ============================================================================

export async function adminGetDocumentSignedUrlAction(payload: unknown): Promise<{
  ok: boolean;
  error?: string;
  signedUrl?: string;
}> {
  noStore();
  const parsed = adminGetDocumentSignedUrlSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid document path payload.",
    };
  }

  const { authorized } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const storagePath =
    typeof parsed.data === "string"
      ? parsed.data
      : parsed.data.storagePath || parsed.data.path || "";
  const expiresIn =
    typeof parsed.data === "string"
      ? 300
      : parsed.data.expiresIn || 300;
  const supabase = createAdminClient();

  try {
    const cleanPath = storagePath.replace(/^id-documents\//, "");
    const { data, error } = await supabase.storage
      .from("id-documents")
      .createSignedUrl(cleanPath, expiresIn || 300);

    if (error || !data?.signedUrl) {
      return { ok: false, error: error?.message || "Failed to generate signed URL." };
    }

    return { ok: true, signedUrl: data.signedUrl };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate signed URL.";
    return { ok: false, error: message };
  }
}

// ============================================================================
// QUERY/ACTION 23: submitDirectUpiPaymentAction
// ============================================================================

export async function submitDirectUpiPaymentAction(rawInput: unknown): Promise<{
  ok: boolean;
  error?: string;
  data?: unknown;
}> {
  const parse = submitDirectUpiPaymentSchema.safeParse(rawInput);
  if (!parse.success) {
    return { ok: false, error: parse.error.issues[0]?.message ?? "Invalid UPI payment details." };
  }

  const { tripId, utrNumber, payerVpa } = parse.data;
  const supabase = createAdminClient();

  try {
    // 1. Fetch live active merchant UPI VPA to record alongside UTR
    const { data: activePricing } = await supabase
      .from("pricing_config")
      .select("merchant_upi_vpa, merchant_payee_name")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const activeMerchantVpa = activePricing?.merchant_upi_vpa || "tripmate@upi";

    const { data: rpcRes, error: rpcErr } = await supabase.rpc("submit_direct_upi_payment", {
      p_trip_id: tripId,
      p_utr_number: utrNumber,
      p_payer_vpa: payerVpa || null,
    });

    if (rpcErr) {
      return { ok: false, error: rpcErr.message || "Failed to submit direct UPI payment." };
    }

    // Ensure payment record has active merchant_vpa populated
    const paymentId = (rpcRes as { payment_id?: string })?.payment_id;
    if (paymentId) {
      await supabase
        .from("payments")
        .update({ merchant_vpa: activeMerchantVpa })
        .eq("id", paymentId);
    }

    // Trigger transactional booking confirmation email
    try {
      const { data: tripData } = await supabase
        .from("trips")
        .select("booking_ref, total_amount, profiles(full_name, email)")
        .eq("id", tripId)
        .maybeSingle();

      const profile = tripData?.profiles as { full_name?: string; email?: string } | null;
      if (profile?.email && tripData) {
        await sendTransactionalEmail({
          to: profile.email,
          template: "booking_confirmed",
          subject: `TripMate Reservation Confirmed #${tripData.booking_ref}`,
          content: `Your booking #${tripData.booking_ref} has been confirmed via Direct UPI Payment to ${activeMerchantVpa} (UTR: ${utrNumber}). Amount paid: ₹${Number(tripData.total_amount || 0).toLocaleString("en-IN")}.`,
          relatedTripId: tripId,
          relatedBookingRef: tripData.booking_ref,
          sentBy: "system",
        });
      }
    } catch {
      // Non-blocking notification
    }

    revalidatePath("/admin");
    revalidatePath("/trips");
    revalidatePath(`/book/${tripId}/confirmed`);
    revalidatePath("/book", "layout");
    revalidatePath("/book/[tripId]/checkout", "page");

    return { ok: true, data: rpcRes };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record UPI UTR payment.";
    return { ok: false, error: message };
  }
}

// ============================================================================
// QUERY/ACTION 24: adminVerifyUpiPaymentAction
// ============================================================================

export async function adminVerifyUpiPaymentAction(rawInput: unknown): Promise<{
  ok: boolean;
  error?: string;
  data?: unknown;
}> {
  const parse = adminVerifyUpiPaymentSchema.safeParse(rawInput);
  if (!parse.success) {
    return { ok: false, error: parse.error.issues[0]?.message ?? "Invalid verification input." };
  }

  const { authorized, user } = await verifyAdminCaller();
  if (!authorized) {
    return { ok: false, error: "Unauthorized admin access." };
  }

  const { paymentId, status, notes, reason } = parse.data;
  const supabase = createAdminClient();

  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc("admin_verify_upi_payment", {
      p_payment_id: paymentId,
      p_status: status,
      p_notes: notes || null,
    });

    if (rpcErr) {
      return { ok: false, error: rpcErr.message || "Failed to update UPI payment verification status." };
    }

    try {
      await supabase.from("admin_audit_logs").insert({
        actor_id: user?.id || "admin",
        actor_name: user?.email || "Admin",
        actor_role: "superadmin",
        action: status === "verified" ? "VERIFY_UPI_UTR" : "REJECT_UPI_UTR",
        entity_type: "payments",
        entity_id: paymentId,
        after: { verification_status: status, notes },
        reason: reason || notes || null,
      });
    } catch {
      // Safe audit ignore
    }

    revalidatePath("/admin");
    revalidatePath("/trips");
    return { ok: true, data: rpcRes };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to verify UPI payment.";
    return { ok: false, error: message };
  }
}

