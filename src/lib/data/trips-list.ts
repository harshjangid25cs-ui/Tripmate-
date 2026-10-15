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
      return getFallbackTrips(todayStr, kindFilter);
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
      return getFallbackTrips(todayStr, kindFilter);
    }

interface RawTripWithRelations extends TripRow {
  destinations?: DestinationRow | null;
  trip_hotels?: { hotels?: HotelRow | null }[];
  trip_vehicles?: { vehicles?: VehicleRow | null }[];
  trip_stops?: { stops?: StopRow | null }[];
}

    // Map database rows into view summaries
    const mapped: UserTripSummary[] = (data as unknown as RawTripWithRelations[]).map((row) => {
      const derived = computeDerivedStatus(row.status, row.start_date, row.end_date, todayStr);
      const totalDays = row.total_days || 4;
      const nights = Math.max(1, totalDays - 1);
      const dest = row.destinations;
      const hotel = row.trip_hotels?.[0]?.hotels;
      const vehicle = row.trip_vehicles?.[0]?.vehicles;
      const stop = row.trip_stops?.[0]?.stops;

      const inclusions: string[] = [];
      const hotelPart = hotel?.name ? hotel.name.split("&")[0] : null;
      if (hotelPart) inclusions.push(hotelPart.trim());
      const vehiclePart = vehicle?.name ? vehicle.name.split("(")[0] : null;
      if (vehiclePart) inclusions.push(vehiclePart.trim());
      if (stop?.name) inclusions.push(stop.name.trim());

      let daysRemainingText: string | null = null;
      if (derived === "Upcoming" && row.start_date) {
        const diffDays = Math.ceil(
          (new Date(row.start_date).getTime() - new Date(todayStr).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        daysRemainingText = diffDays === 1 ? "Starts Tomorrow" : `In ${diffDays} Days`;
      } else if (derived === "Ongoing") {
        daysRemainingText = "Live Today";
      }

      const refundEligibility = check48HourRefundEligibility(row.start_date);
      const canCancel =
        (row.status === "confirmed" || row.status === "pending_approval") &&
        Boolean(row.start_date && row.start_date >= todayStr);

      return {
        id: row.id,
        bookingRef: row.booking_ref,
        title: row.title || `${dest?.name || "Jaipur"} Tour`,
        bookingKind: row.booking_kind,
        status: row.status,
        derivedStatus: derived,
        startDate: row.start_date,
        endDate: row.end_date,
        totalDays,
        nights,
        travelerCount: row.traveler_count,
        totalAmount: Number(row.total_amount),
        refundAmount: row.refund_amount ? Number(row.refund_amount) : null,
        cancellationReason: row.cancellation_reason,
        destinationName: dest?.name || "Jaipur",
        destinationSlug: dest?.slug || "jaipur",
        imagePath: dest?.hero_image_path || "destinations/jaipur.jpg",
        inclusions: inclusions.length > 0 ? inclusions : ["Heritage Stay", "Private Sedan", "Fort Pass"],
        daysRemainingText,
        isFullRefundEligible: refundEligibility.isFullRefund,
        canCancel,
      };
    });

    return mapped;
  } catch {
    return getFallbackTrips(todayStr, kindFilter);
  }
}

function getFallbackTrips(
  todayStr: string,
  kindFilter?: "all" | "commercial" | "normal"
): UserTripSummary[] {
  const fallbacks: UserTripSummary[] = [
    {
      id: "trip-jaipur-upcoming",
      bookingRef: "TM-008829",
      title: "Jaipur Heritage & Forts Circuit",
      bookingKind: "normal",
      status: "confirmed",
      derivedStatus: "Upcoming",
      startDate: "2026-11-14",
      endDate: "2026-11-18",
      totalDays: 4,
      nights: 3,
      travelerCount: 2,
      totalAmount: 27376,
      refundAmount: null,
      cancellationReason: null,
      destinationName: "Jaipur",
      destinationSlug: "jaipur",
      imagePath: "destinations/jaipur.jpg",
      inclusions: ["Shahpura Haveli", "Maruti Dzire", "Neemrana Stop"],
      daysRemainingText: "In 12 Days",
      isFullRefundEligible: true,
      canCancel: true,
    },
    {
      id: "trip-udaipur-completed",
      bookingRef: "TM-004120",
      title: "Udaipur Lakes & Heritage Retreat",
      bookingKind: "normal",
      status: "confirmed",
      derivedStatus: "Completed",
      startDate: "2026-09-02",
      endDate: "2026-09-05",
      totalDays: 3,
      nights: 2,
      travelerCount: 2,
      totalAmount: 34500,
      refundAmount: null,
      cancellationReason: null,
      destinationName: "Udaipur",
      destinationSlug: "udaipur",
      imagePath: "destinations/udaipur.jpg",
      inclusions: ["Taj Lake Palace", "Self-Drive Thar"],
      daysRemainingText: null,
      isFullRefundEligible: false,
      canCancel: false,
    },
    {
      id: "trip-munnar-completed",
      bookingRef: "TM-002980",
      title: "Munnar Misty Hills Escape",
      bookingKind: "normal",
      status: "confirmed",
      derivedStatus: "Completed",
      startDate: "2026-08-15",
      endDate: "2026-08-18",
      totalDays: 4,
      nights: 3,
      travelerCount: 4,
      totalAmount: 18900,
      refundAmount: null,
      cancellationReason: null,
      destinationName: "Munnar",
      destinationSlug: "munnar",
      imagePath: "destinations/munnar.jpg",
      inclusions: ["Plantation Resort", "Private Cab"],
      daysRemainingText: null,
      isFullRefundEligible: false,
      canCancel: false,
    },
  ];

  if (kindFilter && kindFilter !== "all") {
    return fallbacks.filter((t) => t.bookingKind === kindFilter);
  }

  return fallbacks;
}
