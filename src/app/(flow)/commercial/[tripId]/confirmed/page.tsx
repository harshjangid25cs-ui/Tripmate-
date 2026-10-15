import * as React from "react";
import { getConfirmedCommercialTrip, FALLBACK_COMPANY, FALLBACK_BUSES } from "@/lib/data/commercial";
import { CommercialConfirmedView } from "@/components/features/commercial/commercial-confirmed-view";

interface CommercialConfirmedPageProps {
  params: {
    tripId: string;
  };
}

export default async function CommercialConfirmedPage({
  params,
}: CommercialConfirmedPageProps) {
  const { tripId } = params;
  const data = await getConfirmedCommercialTrip(tripId);

  if (!data) {
    // Provide fallback matching Screen 20 for development / preview
    const fallbackBus = FALLBACK_BUSES[0]!;
    const fallbackConfirmed = {
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
        status: "confirmed" as const,
        subtotal_amount: 192500,
        service_fee: 0,
        tax_amount: 34650,
        discount_amount: 0,
        coupon_code: null,
        total_amount: 227150,
        currency: "INR",
        confirmed_at: new Date().toISOString(),
        cancelled_at: null,
        cancellation_reason: null,
        refund_amount: null,
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
      vehicle: {
        id: fallbackBus.id,
        type: "bus" as const,
        name: fallbackBus.name,
        subtitle: fallbackBus.subtitle,
        description: fallbackBus.description,
        capacity: fallbackBus.capacity,
        luggage_capacity: fallbackBus.luggageCapacity,
        features: fallbackBus.features,
        fuel_policy: "Driver & Fuel Included",
        driver_type: "chauffeur" as const,
        rating: fallbackBus.rating,
        badge: fallbackBus.badge,
        price: fallbackBus.pricePerDay,
        image_path: fallbackBus.imagePath,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      passengers: [
        {
          id: "pax-1",
          trip_id: tripId,
          full_name: "Aarav Sharma",
          phone: "+91 98765 43210",
          designation: "VP Engineering",
          employee_ref: "0412",
          seat_label: "2A",
          ticket_code: "TKT-A4F79C01B234",
          is_lead: true,
          id_doc_type: null,
          id_doc_path: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "pax-2",
          trip_id: tripId,
          full_name: "Priya Nair",
          phone: "+91 98112 34567",
          designation: "Lead Architect",
          employee_ref: "0789",
          seat_label: "2B",
          ticket_code: "TKT-B8E21D07C567",
          is_lead: false,
          id_doc_type: null,
          id_doc_path: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "pax-3",
          trip_id: tripId,
          full_name: "Rohan Verma",
          phone: "+91 99887 65432",
          designation: "Product Director",
          employee_ref: "0104",
          seat_label: "3A",
          ticket_code: "TKT-C3D94A10E890",
          is_lead: false,
          id_doc_type: null,
          id_doc_path: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "pax-4",
          trip_id: tripId,
          full_name: "Sneha Kapoor",
          phone: "+91 97110 98765",
          designation: "VP Marketing",
          employee_ref: "0230",
          seat_label: "3B",
          ticket_code: "TKT-D7B56E23F123",
          is_lead: false,
          id_doc_type: null,
          id_doc_path: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "pax-5",
          trip_id: tripId,
          full_name: "Devansh Mehta",
          phone: "+91 98223 34455",
          designation: "Senior Staff Engineer",
          employee_ref: "0540",
          seat_label: "4A",
          ticket_code: "TKT-E1C87F54A456",
          is_lead: false,
          id_doc_type: null,
          id_doc_path: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      invoice: {
        id: "inv-comm-1",
        trip_id: tripId,
        invoice_number: "INV-2026-008821",
        subtotal: 192500,
        service_fee: 0,
        tax_amount: 34650,
        discount_amount: 0,
        total_amount: 227150,
        issued_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    };

    return <CommercialConfirmedView data={fallbackConfirmed} />;
  }

  return <CommercialConfirmedView data={data} />;
}
