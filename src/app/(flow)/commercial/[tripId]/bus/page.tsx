import * as React from "react";
import { redirect } from "next/navigation";
import {
  getCommercialDraftDetails,
  getBusInventory,
  FALLBACK_COMPANY,
  FALLBACK_BUSES,
} from "@/lib/data/commercial";
import { CommercialBusSeatingView } from "@/components/features/commercial/commercial-bus-seating-view";

interface CommercialBusPageProps {
  params: {
    tripId: string;
  };
}

export default async function CommercialBusPage({ params }: CommercialBusPageProps) {
  const { tripId } = params;
  const [draft, buses] = await Promise.all([
    getCommercialDraftDetails(tripId),
    getBusInventory(),
  ]);

  if (!draft) {
    // Fallback mode for offline preview
    const fallbackDraft = {
      trip: {
        id: tripId,
        booking_ref: "TM-008821",
        user_id: "demo-user",
        booking_kind: "commercial" as const,
        group_type: null,
        title: "Engineering Offsite Q4 — Jaipur",
        destination_id: null,
        circuit_id: null,
        from_location: "Delhi NCR",
        to_location: "Jaipur Heritage Circuit",
        start_date: "2026-11-20",
        end_date: "2026-11-24",
        total_days: 5,
        traveler_count: 28,
        status: "draft" as const,
        subtotal_amount: 192500,
        service_fee: 0,
        tax_amount: 34650,
        discount_amount: 0,
        coupon_code: null,
        total_amount: 227150,
        currency: "INR",
        confirmed_at: null,
        cancelled_at: null,
        cancellation_reason: null,
        refund_amount: null,
        origin_name: null,
        origin_lat: null,
        origin_lng: null,
        calculated_distance_km: 0,
        transit_mode: "local_only" as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      commercialBooking: {
        id: "cb-demo",
        trip_id: tripId,
        company_id: FALLBACK_COMPANY.id,
        booking_time: "07:30:00",
        trip_purpose: "Engineering Offsite Q4 — Jaipur",
        policy_id: null,
        approval_status: "not_required" as const,
        reviewed_by: null,
        reviewed_at: null,
        review_note: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      company: FALLBACK_COMPANY,
      selectedVehicle: null,
      passengers: [],
    };
    return <CommercialBusSeatingView draft={fallbackDraft} buses={buses.length > 0 ? buses : FALLBACK_BUSES} />;
  }

  // Guard: if already confirmed or pending approval, redirect to confirmed screen
  if (draft.trip.status === "confirmed" || draft.trip.status === "pending_approval") {
    redirect(`/commercial/${tripId}/confirmed`);
  }

  // Step guard (FLOWS §2): Requires start_date, end_date, traveler_count, from_location, to_location
  if (
    !draft.trip.start_date ||
    !draft.trip.end_date ||
    !draft.trip.traveler_count ||
    !draft.trip.from_location ||
    !draft.trip.to_location
  ) {
    redirect(`/commercial/${tripId}/setup`);
  }

  return (
    <CommercialBusSeatingView
      draft={draft}
      buses={buses.length > 0 ? buses : FALLBACK_BUSES}
    />
  );
}
