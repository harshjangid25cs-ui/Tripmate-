export const dynamic = "force-dynamic";
export const revalidate = 0;

import * as React from "react";
import { redirect } from "next/navigation";
import { getCommercialDraftDetails, FALLBACK_COMPANY } from "@/lib/data/commercial";
import { CommercialSetupView } from "@/components/features/commercial/commercial-setup-view";

interface CommercialSetupPageProps {
  params: {
    tripId: string;
  };
}

export default async function CommercialSetupPage({ params }: CommercialSetupPageProps) {
  const { tripId } = params;
  const draft = await getCommercialDraftDetails(tripId);

  if (!draft) {
    // In dev / test offline mode, provide fallback draft structure
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
    return <CommercialSetupView draft={fallbackDraft} />;
  }

  // Guard: if already confirmed or pending approval, redirect to confirmed screen
  if (draft.trip.status === "confirmed" || draft.trip.status === "pending_approval") {
    redirect(`/commercial/${tripId}/confirmed`);
  }

  return <CommercialSetupView draft={draft} />;
}
