import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type TripRow = Database["public"]["Tables"]["trips"]["Row"];
export type DestinationRow = Database["public"]["Tables"]["destinations"]["Row"];
export type HotelRow = Database["public"]["Tables"]["hotels"]["Row"];
export type VehicleRow = Database["public"]["Tables"]["vehicles"]["Row"];
export type StopRow = Database["public"]["Tables"]["stops"]["Row"];

export type DerivedTripStatus = "Upcoming" | "Ongoing" | "Completed" | "Cancelled" | "Pending Approval";

export interface UserTripSummary {
  id: string;
  bookingRef: string;
  title: string;
  bookingKind: "normal" | "commercial";
  status: "draft" | "pending_approval" | "confirmed" | "cancelled" | "completed";
  derivedStatus: DerivedTripStatus;
  startDate: string | null;
  endDate: string | null;
  totalDays: number;
  nights: number;
  travelerCount: number;
  totalAmount: number;
  refundAmount: number | null;
  cancellationReason: string | null;
  destinationName: string;
  destinationSlug: string;
  imagePath: string;
  inclusions: string[];
  daysRemainingText: string | null;
  isFullRefundEligible: boolean;
  canCancel: boolean;
}

export function computeDerivedStatus(
  status: string,
  startDate: string | null,
  endDate: string | null,
  todayStr: string = new Date().toISOString().split("T")[0] || ""
): DerivedTripStatus {
  if (status === "cancelled") return "Cancelled";
  if (status === "pending_approval") return "Pending Approval";
  if (!startDate || !endDate) return "Upcoming";
  if (endDate < todayStr) return "Completed";
  if (startDate <= todayStr && todayStr <= endDate) return "Ongoing";
  return "Upcoming";
}

export function check48HourRefundEligibility(
  startDate: string | null,
  nowMs: number = Date.now()
): { isFullRefund: boolean; hoursRemaining: number } {
  if (!startDate) return { isFullRefund: false, hoursRemaining: 0 };
  const departureTs = new Date(`${startDate}T00:00:00+05:30`).getTime();
  const hoursRemaining = (departureTs - nowMs) / (1000 * 60 * 60);
  return {
    isFullRefund: hoursRemaining >= 48,
    hoursRemaining,
  };
}

interface RawTripWithRelations extends TripRow {
  destinations?: DestinationRow | null;
  trip_hotels?: { hotels?: HotelRow | null }[];
  trip_vehicles?: { vehicles?: VehicleRow | null }[];
  trip_stops?: { stops?: StopRow | null }[];
}

export async function getUserTrips(
  kindFilter?: "all" | "commercial" | "normal"
): Promise<UserTripSummary[]> {
  const todayStr = new Date().toISOString().split("T")[0] || "";

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    let query = supabase
      .from("trips")
      .select("*, destinations(*), trip_hotels(*, hotels(*)), trip_vehicles(*, vehicles(*)), trip_stops(*, stops(*))")
      .eq("user_id", user.id)
      .neq("status", "draft")
      .order("created_at", { ascending: false });

    if (kindFilter && kindFilter !== "all") {
      query = query.eq("booking_kind", kindFilter);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return [];
    }

    const rows = data as unknown as RawTripWithRelations[];

    const mapped: UserTripSummary[] = rows.map((trip) => {
      const derivedStatus = computeDerivedStatus(
        trip.status,
        trip.start_date,
        trip.end_date,
        todayStr
      );

      const refundEligibility = check48HourRefundEligibility(trip.start_date);

      // Only confirmed and upcoming trips can be cancelled by user (D8)
      const canCancel =
        trip.status === "confirmed" &&
        (derivedStatus === "Upcoming" || derivedStatus === "Ongoing");

      // Extract inclusions from child records
      const inclusions: string[] = [];
      if (trip.trip_hotels?.[0]?.hotels?.name) {
        inclusions.push(trip.trip_hotels[0].hotels.name);
      }
      if (trip.trip_vehicles?.[0]?.vehicles?.name) {
        inclusions.push(trip.trip_vehicles[0].vehicles.name);
      }
      if (trip.trip_stops && trip.trip_stops.length > 0) {
        const stopName = trip.trip_stops[0]?.stops?.name;
        if (stopName) inclusions.push(stopName);
      }

      // Compute days remaining text
      let daysRemainingText: string | null = null;
      if (derivedStatus === "Upcoming" && trip.start_date) {
        const diffDays = Math.ceil(
          (new Date(`${trip.start_date}T00:00:00+05:30`).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        );
        if (diffDays > 0) {
          daysRemainingText = `In ${diffDays} Day${diffDays > 1 ? "s" : ""}`;
        }
      }

      const totalDays = trip.start_date && trip.end_date
        ? Math.max(
            1,
            Math.ceil(
              (new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) /
                (1000 * 60 * 60 * 24)
            ) + 1
          )
        : 3;

      return {
        id: trip.id,
        bookingRef: trip.booking_ref,
        title: trip.title || "Custom Rajasthan Tour",
        bookingKind: trip.booking_kind as "normal" | "commercial",
        status: trip.status as UserTripSummary["status"],
        derivedStatus,
        startDate: trip.start_date,
        endDate: trip.end_date,
        totalDays,
        nights: Math.max(1, totalDays - 1),
        travelerCount: trip.traveler_count,
        totalAmount: Number(trip.total_amount),
        refundAmount: trip.refund_amount ? Number(trip.refund_amount) : null,
        cancellationReason: trip.cancellation_reason,
        destinationName: trip.destinations?.name || "Rajasthan",
        destinationSlug: trip.destinations?.slug || "jaipur",
        imagePath: trip.destinations?.hero_image_path || "destinations/jaipur.jpg",
        inclusions,
        daysRemainingText,
        isFullRefundEligible: refundEligibility.isFullRefund,
        canCancel,
      };
    });

    return mapped;
  } catch {
    return [];
  }
}
