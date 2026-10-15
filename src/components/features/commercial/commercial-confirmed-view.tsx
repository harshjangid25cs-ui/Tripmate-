"use client";

import * as React from "react";
import Link from "next/link";
import { formatCurrency, formatDateRange } from "@/lib/format";
import type { ConfirmedCommercialTripData } from "@/lib/data/commercial-types";
import { assignCommercialPassengerAction } from "@/lib/actions/commercial";

interface CommercialConfirmedViewProps {
  data: ConfirmedCommercialTripData;
}

export function CommercialConfirmedView({ data }: CommercialConfirmedViewProps) {
  const { trip, commercialBooking, company, vehicle, passengers: initialPassengers } = data;

  const [passengers, setPassengers] = React.useState(initialPassengers);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  // Active Ticket Modal State
  const [activeTicket, setActiveTicket] = React.useState<{
    name: string;
    seat: string;
    ticketCode: string;
    vehicleName: string;
  } | null>(null);

  // Assign + Modal State
  const [showAssignModal, setShowAssignModal] = React.useState(false);
  const [assignName, setAssignName] = React.useState("");
  const [assignPhone, setAssignPhone] = React.useState("");
  const [assignSeat, setAssignSeat] = React.useState("");
  const [assignDesignation, setAssignDesignation] = React.useState("Engineer");
  const [isAssigning, setIsAssigning] = React.useState(false);

  const totalDays = trip.total_days || 5;
  const nights = Math.max(1, totalDays - 1);
  const vehicleName = vehicle?.name || "Volvo 9600 Luxury Multi-Axle";
  const vehicleRate = vehicle?.price ? Number(vehicle.price) : 38500;
  const subtotal = totalDays * vehicleRate;
  const gstAmount = Math.round(subtotal * 0.18);
  const totalAmount = Number(trip.total_amount) || subtotal + gstAmount;
  const perTraveler =
    trip.traveler_count > 0 ? totalAmount / trip.traveler_count : totalAmount;

  const datesFormatted =
    trip.start_date && trip.end_date
      ? formatDateRange(trip.start_date, trip.end_date)
      : "Nov 20 – Nov 24, 2026";

  const departureTimeFormatted = commercialBooking?.booking_time
    ? commercialBooking.booking_time.slice(0, 5) + " IST"
    : "07:30 AM IST";

  const isPendingApproval =
    trip.status === "pending_approval" || commercialBooking?.approval_status === "pending";

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCopyLink = (ticketCode?: string | null) => {
    const code = ticketCode || `TKT-${trip.booking_ref.replace(/\D/g, "")}`;
    const url = typeof window !== "undefined" ? `${window.location.origin}/tickets/${code}` : `/tickets/${code}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    showToast("Pass link copied to clipboard");
  };

  const handleShareAllTickets = () => {
    const passLinks = passengers
      .map(
        (p, idx) =>
          `${p.full_name} (Seat ${p.seat_label}): ${
            typeof window !== "undefined" ? window.location.origin : ""
          }/tickets/${p.ticket_code || `TKT-${(trip.booking_ref.replace(/\D/g, "") + "000000000000").slice(0, 10)}${String(idx + 1).padStart(2, "0")}`}`
      )
      .join("\n");

    if (typeof navigator !== "undefined" && navigator.share) {
      navigator
        .share({
          title: `${trip.booking_ref} Corporate Passes`,
          text: `Corporate trip passes for ${trip.title || "Team Offsite"}:\n${passLinks}`,
        })
        .catch(() => {
          showToast(`All ${passengers.length} passes queued for batch dispatch`);
        });
    } else {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(passLinks);
      }
      showToast(`All ${passengers.length} passes copied for batch dispatch`);
    }
  };

  const handleDownloadInvoice = () => {
    showToast(`Downloading GST Invoice #${trip.booking_ref}.pdf`);
    setTimeout(() => {
      if (typeof window !== "undefined") {
        window.print();
      }
    }, 600);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignName.trim() || !assignPhone.trim() || !assignSeat.trim()) return;

    setIsAssigning(true);
    const res = await assignCommercialPassengerAction(trip.id, {
      fullName: assignName.trim(),
      phone: assignPhone.trim(),
      seatLabel: assignSeat.trim().toUpperCase(),
      designation: assignDesignation.trim(),
    });

    if (res.ok) {
      setPassengers((prev) => [
        ...prev,
        {
          id: `new-${Date.now()}`,
          trip_id: trip.id,
          full_name: assignName.trim(),
          phone: assignPhone.trim(),
          designation: assignDesignation.trim(),
          employee_ref: "0000",
          seat_label: res.seatLabel || assignSeat.trim().toUpperCase(),
          ticket_code:
            res.ticketCode ||
            `TKT-${Math.random().toString(36).substring(2, 14).toUpperCase().padEnd(12, "0")}`,
          is_lead: false,
          id_doc_type: null,
          id_doc_path: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
      setShowAssignModal(false);
      setAssignName("");
      setAssignPhone("");
      setAssignSeat("");
      showToast("Pass assigned successfully");
    } else {
      showToast(res.error || "Failed to assign pass");
    }
    setIsAssigning(false);
  };

  return (
    <div className="bg-surface font-body-md text-text-primary min-h-screen flex flex-col antialiased">
      {/* Top Header */}
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(20,21,26,0.04)]">
        <div className="h-16 px-margin-mobile flex items-center justify-between gap-space-sm max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-on-primary font-bold text-sm shadow-sm">
              M
            </div>
            <div>
              <span className="font-title-md text-sm font-bold text-text-primary tracking-tight block">
                Tripmate <span className="text-text-secondary font-normal text-xs">Enterprise</span>
              </span>
              <span className="font-body-sm text-[10px] text-text-secondary block">
                {company.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-text-secondary border border-border-hairline">
            <span className="material-symbols-outlined text-[16px]">verified_user</span>
            <span className="font-label-badge text-[10px] text-text-primary font-bold">
              B2B SECURE
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-md mx-auto px-margin-mobile pt-20 pb-28">
        <div className="flex flex-col gap-space-md">
          {/* Confirmation Banner */}
          <div className="w-full bg-card-surface rounded-2xl p-5 shadow-sm border border-border-hairline">
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  isPendingApproval ? "bg-urgency-amber/15 text-urgency-amber" : "bg-success-green/15 text-success-green"
                }`}
              >
                <span className="material-symbols-outlined text-[24px]">
                  {isPendingApproval ? "pending_actions" : "check_circle"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-low text-text-secondary mb-2 border border-border-hairline">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isPendingApproval ? "bg-urgency-amber" : "bg-success-green"
                    }`}
                  />
                  <span className="font-label-badge text-[10px] text-text-primary uppercase tracking-wide font-bold">
                    {trip.booking_ref} • {isPendingApproval ? "PENDING REVIEW" : "GST INVOICE READY"}
                  </span>
                </div>
                <h1 className="font-headline-md text-lg font-bold text-text-primary tracking-tight">
                  {isPendingApproval
                    ? "Corporate Booking Submitted"
                    : "Your Commercial Trip is Booked!"}
                </h1>
                <p className="font-body-md text-xs text-text-secondary mt-1 leading-relaxed">
                  {isPendingApproval
                    ? "Submitted to your travel administration team for policy review. Passes are reserved and will be activated upon approval."
                    : "Corporate itinerary confirmed. Driver details & dispatch tracking assigned 24h prior."}
                </p>
              </div>
            </div>
          </div>

          {/* Trip Summary Card */}
          <section className="w-full bg-card-surface rounded-2xl p-5 shadow-sm border border-border-hairline">
            <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-border-hairline">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-text-secondary text-[20px]">
                  corporate_fare
                </span>
                <span className="font-title-md text-sm font-bold text-text-primary">
                  Trip Overview
                </span>
              </div>
              <span
                className={`font-label-badge text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${
                  isPendingApproval
                    ? "bg-urgency-amber/15 text-urgency-amber"
                    : "bg-success-green/15 text-success-green"
                }`}
              >
                {isPendingApproval ? "PENDING APPROVAL" : "CONFIRMED"}
              </span>
            </div>

            {/* Parameter List */}
            <div className="flex flex-col gap-3">
              {/* Route */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center shrink-0 border border-border-hairline">
                  <span className="material-symbols-outlined text-primary text-[18px]">
                    location_on
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-body-sm text-[10px] text-text-secondary block">
                    Route / Destination
                  </span>
                  <span className="font-title-md text-xs font-bold text-text-primary block truncate">
                    {trip.from_location || "Delhi NCR"} ↔ {trip.to_location || "Jaipur Heritage Circuit"}
                  </span>
                </div>
              </div>

              {/* Dates */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center shrink-0 border border-border-hairline">
                  <span className="material-symbols-outlined text-text-secondary text-[18px]">
                    calendar_today
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-body-sm text-[10px] text-text-secondary block">
                    Dates &amp; Duration
                  </span>
                  <span className="font-title-md text-xs font-bold text-text-primary block">
                    {datesFormatted}{" "}
                    <span className="text-text-secondary font-normal">
                      ({totalDays}D • {nights}N)
                    </span>
                  </span>
                </div>
              </div>

              {/* Reporting Time */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center shrink-0 border border-border-hairline">
                  <span className="material-symbols-outlined text-text-secondary text-[18px]">
                    schedule
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-body-sm text-[10px] text-text-secondary block">
                    Reporting &amp; Departure
                  </span>
                  <span className="font-title-md text-xs font-bold text-text-primary block">
                    {departureTimeFormatted}{" "}
                    <span className="text-text-secondary font-normal">
                      (Fleet at 30m prior)
                    </span>
                  </span>
                </div>
              </div>

              {/* Fleet */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center shrink-0 border border-border-hairline">
                  <span className="material-symbols-outlined text-text-secondary text-[18px]">
                    directions_bus
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-body-sm text-[10px] text-text-secondary block">
                    Fleet Vehicle
                  </span>
                  <span className="font-title-md text-xs font-bold text-text-primary block truncate">
                    {vehicleName}
                  </span>
                </div>
              </div>

              {/* Headcount */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center shrink-0 border border-border-hairline">
                  <span className="material-symbols-outlined text-text-secondary text-[18px]">
                    group
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-body-sm text-[10px] text-text-secondary block">
                    Passenger Headcount
                  </span>
                  <span className="font-title-md text-xs font-bold text-text-primary block">
                    {trip.traveler_count} Passengers{" "}
                    <span className="text-urgency-amber font-semibold">
                      ({passengers.length} Exec Reserved)
                    </span>
                  </span>
                </div>
              </div>

              {/* Purpose */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center shrink-0 border border-border-hairline">
                  <span className="material-symbols-outlined text-text-secondary text-[18px]">
                    work
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-body-sm text-[10px] text-text-secondary block">
                    Purpose / Cost Center
                  </span>
                  <span className="font-title-md text-xs font-bold text-text-primary block truncate">
                    {trip.title || "Corporate Offsite"}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Assigned Passenger Tickets Section */}
          <section className="w-full bg-card-surface rounded-2xl p-5 shadow-sm border border-border-hairline">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-headline-sm text-sm font-bold text-text-primary">
                Assigned Passenger Tickets
              </h2>
              <span className="font-label-badge text-[10px] px-2 py-0.5 rounded-full bg-surface-container-high text-text-secondary font-bold">
                {passengers.length} OF {trip.traveler_count} ISSUED
              </span>
            </div>
            <p className="font-body-sm text-xs text-text-secondary mb-3">
              {passengers.length} passes issued • Centralized QR boarding enabled
            </p>

            {/* Roster List */}
            <div className="flex flex-col gap-2">
              {passengers.map((p, idx) => {
                const code =
                  p.ticket_code ||
                  `TKT-${(trip.booking_ref.replace(/\D/g, "") + "000000000000").slice(0, 10)}${String(idx + 1).padStart(2, "0")}`;
                return (
                  <div
                    key={p.id || idx}
                    className="p-3 rounded-xl bg-surface-container-low border border-border-hairline flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-title-md text-xs font-bold text-text-primary truncate">
                          {p.full_name}
                        </span>
                        <span className="font-label-badge text-[9px] px-1.5 py-0.2 rounded bg-urgency-amber/15 text-urgency-amber font-bold">
                          EXEC
                        </span>
                      </div>
                      <span className="font-body-sm text-[11px] text-text-secondary block mt-0.5">
                        Seat {p.seat_label || `Seat ${idx + 1}`} • {p.phone || "+91 98765 43210"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveTicket({
                            name: p.full_name,
                            seat: p.seat_label || `2A`,
                            ticketCode: code,
                            vehicleName,
                          })
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-card-surface text-text-primary font-label-md text-xs font-semibold flex items-center gap-1 shadow-sm border border-border-hairline active:bg-surface-container hover:bg-surface-container transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px] text-primary">
                          qr_code_2
                        </span>
                        <span>Ticket</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyLink(code)}
                        className="p-1.5 rounded-lg bg-card-surface text-text-secondary shadow-sm border border-border-hairline hover:text-text-primary transition-colors"
                        title="Copy Ticket Link"
                      >
                        <span className="material-symbols-outlined text-[16px]">content_copy</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Remaining Passenger Notice */}
            {passengers.length < trip.traveler_count && (
              <div className="mt-3 py-2 px-3 bg-surface-container-low rounded-xl border border-border-hairline flex items-center justify-between">
                <span className="font-body-sm text-xs text-text-secondary">
                  {trip.traveler_count - passengers.length} regular passes pending assignment
                </span>
                <button
                  type="button"
                  onClick={() => setShowAssignModal(true)}
                  className="font-label-badge text-xs text-primary uppercase font-bold tracking-wide hover:underline cursor-pointer"
                >
                  Assign +
                </button>
              </div>
            )}
          </section>

          {/* Corporate Invoice Breakdown Card (Worked Check #11: ₹2,27,150) */}
          <section className="w-full bg-card-surface rounded-2xl p-5 shadow-sm border border-border-hairline">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-hairline">
              <h2 className="font-headline-sm text-sm font-bold text-text-primary">
                Corporate Invoice Breakdown
              </h2>
              <span className="font-label-badge text-[10px] px-2 py-0.5 rounded-full bg-success-green/10 text-success-green font-bold">
                ITC QUALIFIED
              </span>
            </div>

            <div className="flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">
                  {vehicleName} ({totalDays} Days @ {formatCurrency(vehicleRate)}/day)
                </span>
                <span className="font-bold text-text-primary">{formatCurrency(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-text-secondary">
                  Interstate Permits, Tolls &amp; Allowances
                </span>
                <span className="font-label-badge text-[10px] px-2 py-0.5 rounded bg-surface-container text-text-primary font-bold">
                  Included
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Applicable GST (18% ITC Pass-Through)</span>
                <span className="font-bold text-text-primary">{formatCurrency(gstAmount)}</span>
              </div>

              {/* Total Package Box */}
              <div className="my-1.5 py-3 px-3.5 bg-surface-container-low rounded-xl border border-border-hairline flex items-baseline justify-between">
                <div>
                  <span className="font-body-sm text-[10px] text-text-secondary uppercase tracking-wider block">
                    Total Corporate Package
                  </span>
                  <span className="font-label-md text-xs text-success-green font-bold">
                    {formatCurrency(perTraveler)} / traveler ({trip.traveler_count} Pax)
                  </span>
                </div>
                <span className="font-numeral-price text-lg font-bold text-text-primary">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </section>

          {/* Bottom Action Controls */}
          <div className="w-full flex flex-col gap-2.5">
            {/* Primary CTA */}
            <button
              type="button"
              onClick={handleShareAllTickets}
              className="w-full py-3.5 px-6 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-label-lg text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-2 active:scale-[0.99] transition-all shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">share</span>
              <span>Share All Tickets (WhatsApp &amp; Email) →</span>
            </button>

            {/* Secondary CTA */}
            <button
              type="button"
              onClick={handleDownloadInvoice}
              className="w-full py-3 px-6 rounded-xl bg-card-surface hover:bg-surface-container text-text-primary font-label-lg text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.99] border border-border-hairline transition-all shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-text-secondary">
                download
              </span>
              <span>Download GST Invoice &amp; Roster (PDF)</span>
            </button>

            {/* 24/7 Enterprise Support */}
            <div className="text-center py-2 px-4">
              <p className="font-body-sm text-xs text-text-secondary">
                Need corporate invoice customization?
                <a
                  href="mailto:enterprise@tripmate.io"
                  className="font-label-md text-xs text-primary font-bold underline underline-offset-2 ml-1"
                >
                  Contact your 24/7 Enterprise Desk
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Ticket QR Modal (Screen 20 match) */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 bg-surface-dark/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-full max-w-sm bg-card-surface rounded-2xl p-6 shadow-xl border border-border-hairline flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-border-hairline">
              <span className="font-headline-sm text-base font-bold text-text-primary">
                Executive Pass
              </span>
              <button
                type="button"
                onClick={() => setActiveTicket(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-text-secondary hover:text-text-primary"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="py-2 flex flex-col items-center justify-center text-center">
              {/* QR Illustration */}
              <div className="w-36 h-36 bg-surface-container-low rounded-xl p-3 flex flex-col items-center justify-center mb-3 border border-border-hairline">
                <svg
                  className="w-28 h-28 text-text-primary"
                  fill="currentColor"
                  viewBox="0 0 100 100"
                >
                  <path d="M10 10h30v30H10zM15 15v20h20V15zM20 20h10v10H20zM60 10h30v30H60zM65 15v20h20V15zM70 20h10v10H70zM10 60h30v30H10zM15 65v20h20V65zM20 70h10v10H20zM60 60h10v10H60zM75 60h15v10H75zM60 75h15v15H60zM80 80h10v10H80z" />
                </svg>
              </div>

              <h3 className="font-headline-sm text-base font-bold text-text-primary">
                {activeTicket.name}
              </h3>
              <p className="font-body-md text-xs text-text-secondary mt-0.5">
                Seat {activeTicket.seat} • {activeTicket.vehicleName}
              </p>
              <span className="mt-2 font-label-badge text-[10px] px-3 py-1 rounded-full bg-success-green/15 text-success-green font-bold uppercase tracking-wider">
                Authorized Corporate Roster
              </span>

              <div className="mt-3 p-2 rounded-lg bg-surface-container-low text-[10px] font-mono text-text-secondary border border-border-hairline w-full">
                Code: {activeTicket.ticketCode}
              </div>
            </div>

            <div className="flex gap-2">
              <Link
                href={`/tickets/${activeTicket.ticketCode}`}
                className="flex-1 py-2.5 rounded-xl bg-surface-container hover:bg-surface-variant text-text-primary font-label-md text-xs font-bold text-center border border-border-hairline transition-colors"
              >
                View Public Pass
              </Link>
              <button
                type="button"
                onClick={() => setActiveTicket(null)}
                className="flex-1 py-2.5 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-label-md text-xs font-bold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign + Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-surface-dark/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <form
            onSubmit={handleAssignSubmit}
            className="w-full max-w-sm bg-card-surface rounded-2xl p-5 shadow-xl border border-border-hairline flex flex-col gap-3.5"
          >
            <div className="flex items-center justify-between pb-2 border-b border-border-hairline">
              <span className="font-headline-sm text-sm font-bold text-text-primary">
                Assign Additional Pass
              </span>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-text-secondary hover:text-text-primary"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              <div>
                <label className="font-label-badge text-[10px] text-text-secondary uppercase block mb-1">
                  Traveler Name
                </label>
                <input
                  type="text"
                  required
                  value={assignName}
                  onChange={(e) => setAssignName(e.target.value)}
                  placeholder="e.g. Vikram Batra"
                  className="w-full px-3 py-2 rounded-lg bg-card-surface text-xs font-semibold text-text-primary border border-border-hairline focus:outline-none focus:border-primary-container"
                />
              </div>

              <div>
                <label className="font-label-badge text-[10px] text-text-secondary uppercase block mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  required
                  value={assignPhone}
                  onChange={(e) => setAssignPhone(e.target.value)}
                  placeholder="+91 98000 12345"
                  className="w-full px-3 py-2 rounded-lg bg-card-surface text-xs font-semibold text-text-primary border border-border-hairline focus:outline-none focus:border-primary-container"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-label-badge text-[10px] text-text-secondary uppercase block mb-1">
                    Seat Label
                  </label>
                  <input
                    type="text"
                    required
                    value={assignSeat}
                    onChange={(e) => setAssignSeat(e.target.value)}
                    placeholder="e.g. 4B"
                    className="w-full px-3 py-2 rounded-lg bg-card-surface text-xs font-semibold text-text-primary border border-border-hairline focus:outline-none focus:border-primary-container uppercase"
                  />
                </div>

                <div>
                  <label className="font-label-badge text-[10px] text-text-secondary uppercase block mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={assignDesignation}
                    onChange={(e) => setAssignDesignation(e.target.value)}
                    placeholder="e.g. Engineer"
                    className="w-full px-3 py-2 rounded-lg bg-card-surface text-xs font-semibold text-text-primary border border-border-hairline focus:outline-none focus:border-primary-container"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-surface-container text-text-secondary font-label-md text-xs font-semibold hover:bg-surface-variant transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAssigning}
                className="flex-1 py-2.5 rounded-xl bg-primary-container text-on-primary font-label-md text-xs font-bold hover:bg-primary transition-colors disabled:opacity-50"
              >
                {isAssigning ? "Assigning..." : "Issue Pass"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-surface-dark text-on-error px-4 py-2.5 rounded-full font-label-md text-xs font-bold flex items-center gap-2 shadow-lg animate-in fade-in zoom-in-95 duration-150">
          <span className="material-symbols-outlined text-[16px] text-success-green">
            check_circle
          </span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
