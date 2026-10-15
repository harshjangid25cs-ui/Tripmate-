"use client";

import * as React from "react";
import Link from "next/link";
import type { ConfirmedTripDetails } from "@/lib/data/booking";
import { formatCurrency, formatDateRange } from "@/lib/format";

interface TripItineraryDetailViewProps {
  details: ConfirmedTripDetails;
}

export function TripItineraryDetailView({ details }: TripItineraryDetailViewProps) {
  const { trip, hotel, vehicle, passengers, destination, invoice, itineraryItems } = details;

  const [activeDay, setActiveDay] = React.useState(1);
  const [copiedLink, setCopiedLink] = React.useState(false);

  const totalDays = trip.total_days || 4;
  const nights = Math.max(1, totalDays - 1);
  const destinationName = destination?.name || "Jaipur";
  const hotelName = hotel?.hotel?.name || "Shahpura Haveli & Heritage Suites";
  const vehicleName = vehicle?.vehicle?.name || "Maruti Suzuki Dzire";
  const driverName = vehicle?.driver?.full_name || "Rajesh Kumar";
  const driverPlate = vehicle?.driver?.plate_number || "DL 1Y AA 4088";
  const driverRating = vehicle?.driver?.rating ? Number(vehicle?.driver?.rating).toFixed(2) : "4.96";

  // Derived status calculation (DATABASE.md §3 & BUILD_PLAN.md)
  const todayStr = new Date().toISOString().split("T")[0] || "";
  let derivedStatus: "Upcoming" | "Ongoing" | "Completed" | "Cancelled" = "Upcoming";
  if (trip.status === "cancelled") {
    derivedStatus = "Cancelled";
  } else if (trip.start_date && trip.end_date) {
    if (trip.end_date < todayStr) {
      derivedStatus = "Completed";
    } else if (trip.start_date <= todayStr && todayStr <= trip.end_date) {
      derivedStatus = "Ongoing";
    } else {
      derivedStatus = "Upcoming";
    }
  }

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard?.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const datesFormatted =
    trip.start_date && trip.end_date
      ? formatDateRange(trip.start_date, trip.end_date)
      : "Upcoming Dates";

  // Filter items for the active day
  const dayItems = itineraryItems.filter((i) => i.day_number === activeDay);

  return (
    <div className="bg-surface font-body-md text-text-primary min-h-screen flex flex-col antialiased">
      {/* Top Header */}
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(20,21,26,0.04)]">
        <div className="h-16 px-margin-mobile flex items-center justify-between gap-space-sm max-w-md mx-auto">
          <div className="flex items-center gap-space-sm">
            <Link
              href="/trips"
              className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-text-primary hover:bg-surface-container active:scale-95 transition-colors"
              aria-label="Back to Trips"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </Link>
            <h1 className="font-title-md text-title-md font-semibold text-text-primary">
              Trip Itinerary
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="w-10 h-10 rounded-full flex items-center justify-center text-text-primary hover:bg-surface-container active:scale-95 transition-colors"
              aria-label="Share itinerary"
            >
              <span className="material-symbols-outlined text-[20px]">
                {copiedLink ? "check" : "ios_share"}
              </span>
            </button>
            <Link
              href={`/trips/${trip.id}/invoice`}
              className="w-10 h-10 rounded-full flex items-center justify-center text-text-primary hover:bg-surface-container active:scale-95 transition-colors"
              aria-label="View Invoice"
              title="Tax Invoice"
            >
              <span className="material-symbols-outlined text-[20px]">receipt_long</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-md mx-auto w-full px-margin-mobile pt-24 pb-28">
        <div className="flex flex-col gap-space-md">
          {/* Trip Overview Card */}
          <section className="bg-card-surface rounded-xl p-space-md border border-border-hairline shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-mono text-xs font-bold text-text-secondary">
                #{trip.booking_ref}
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`px-2 py-0.5 rounded-full font-label-badge text-label-badge font-bold uppercase tracking-wider ${
                    derivedStatus === "Upcoming"
                      ? "bg-primary-container text-on-primary"
                      : derivedStatus === "Ongoing"
                      ? "bg-success-green/15 text-success-green"
                      : derivedStatus === "Cancelled"
                      ? "bg-error/15 text-error"
                      : "bg-surface-container text-text-secondary"
                  }`}
                >
                  {derivedStatus}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-success-green/15 text-success-green font-label-badge text-label-badge font-bold uppercase tracking-wider">
                  CONFIRMED
                </span>
              </div>
            </div>

            <h2 className="font-headline-sm text-headline-sm font-bold text-text-primary">
              {trip.title || `${destinationName} Heritage Circuit`}
            </h2>
            <p className="font-body-sm text-xs text-text-secondary mt-1">
              Delhi → Neemrana → {destinationName} • {totalDays}D / {nights}N
            </p>

            {/* Meta Tags */}
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border-hairline/60">
              <span className="px-2.5 py-1 rounded-full bg-surface-container text-text-primary text-xs font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">group</span>
                {trip.traveler_count} {trip.traveler_count === 1 ? "Traveler" : "Travelers"}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-surface-container text-text-primary text-xs font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                {datesFormatted}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-surface-container text-text-primary text-xs font-medium flex items-center gap-1 truncate max-w-[150px]">
                <span className="material-symbols-outlined text-[14px]">directions_car</span>
                {vehicleName.split("(")[0]}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-surface-container text-text-primary text-xs font-medium flex items-center gap-1 truncate max-w-[150px]">
                <span className="material-symbols-outlined text-[14px]">hotel</span>
                {hotelName.split("&")[0]}
              </span>
            </div>
          </section>

          {/* Passenger Digital Tickets Strip */}
          <section className="bg-card-surface rounded-xl p-space-md border border-border-hairline shadow-sm">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="font-title-md text-title-md font-bold text-text-primary flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[20px] text-primary-container">
                  confirmation_number
                </span>
                Passenger Tickets
              </h3>
              <span className="font-label-sm text-xs text-text-secondary">
                {passengers.length} Issued
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {passengers.map((p, idx) => {
                const ticketCode =
                  p.ticket_code ||
                  `TKT-${(trip.booking_ref.replace(/\D/g, "") + "000000000000").slice(0, 10)}${String(idx + 1).padStart(2, "0")}`;
                return (
                  <div
                    key={p.id || idx}
                    className="p-2.5 rounded-lg bg-surface-container-low border border-border-hairline flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-text-primary">
                          {p.full_name || `Passenger ${idx + 1}`}
                        </span>
                        {p.is_lead && (
                          <span className="px-1.5 py-0.2 rounded bg-primary-container/10 text-primary-container font-bold text-[9px]">
                            LEAD
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-text-secondary block mt-0.5">
                        Code: {ticketCode}
                      </span>
                    </div>

                    <Link
                      href={`/tickets/${ticketCode}`}
                      className="px-2.5 py-1.5 rounded-md bg-surface border border-border-hairline hover:bg-surface-container text-[11px] font-semibold text-text-primary flex items-center gap-1 active:scale-95 transition-all shrink-0"
                    >
                      <span>View Ticket</span>
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Assigned Fleet & Chauffeur Card (DECISIONS D13) */}
          <section className="bg-card-surface rounded-xl p-space-md border border-border-hairline shadow-sm">
            <h3 className="font-title-md text-title-md font-bold text-text-primary mb-2.5 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[20px] text-primary-container">
                badge
              </span>
              Assigned Chauffeur &amp; Vehicle
            </h3>
            <div className="flex items-start gap-3 bg-surface-container-low p-3 rounded-lg border border-border-hairline">
              <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-text-secondary shrink-0 font-bold text-sm">
                {driverName.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs text-text-primary">
                    {driverName}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-xs font-bold text-warning-orange">
                    <span className="material-symbols-outlined text-[14px]">star</span>
                    {driverRating} ★
                  </span>
                </div>
                <p className="font-body-sm text-[11px] text-text-secondary mt-0.5">
                  Plate: {driverPlate} • Verified Commercial Chauffeur (180+ trips)
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <a
                    href="tel:+919876543210"
                    className="px-2.5 py-1 rounded bg-surface border border-border-hairline text-[11px] font-semibold text-text-primary inline-flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[13px]">call</span>
                    Call Driver
                  </a>
                  <a
                    href="https://wa.me/919876543210"
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded bg-success-green/10 text-success-green text-[11px] font-semibold inline-flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[13px]">chat</span>
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Day Selector Horizontal Scroll */}
          <section className="-mx-margin-mobile px-margin-mobile overflow-x-auto no-scrollbar py-1">
            <div className="flex items-center gap-2 w-max">
              {Array.from({ length: totalDays }, (_, idx) => idx + 1).map((dayNum) => {
                const isSelected = activeDay === dayNum;
                const titles = [
                  "Arrival & Forts",
                  "Palaces & Bazaars",
                  "Nahargarh Sunset",
                  "Stepwells & Return",
                  "Craft Trails",
                  "Expedition",
                ];
                const subtitle = titles[dayNum - 1] ?? "Sightseeing Exploration";

                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => setActiveDay(dayNum)}
                    className={`min-h-[44px] px-4 py-2.5 rounded-full font-label-md text-label-md flex items-center gap-1.5 transition-all active:scale-95 ${
                      isSelected
                        ? "bg-primary-container text-on-primary shadow-sm font-semibold"
                        : "bg-card-surface text-text-secondary hover:bg-surface-container border border-border-hairline"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {dayNum === 1
                        ? "flight_land"
                        : dayNum === totalDays
                        ? "flight_takeoff"
                        : "explore"}
                    </span>
                    <span>
                      Day {dayNum}: {subtitle}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Day Timeline Items */}
          <section className="flex flex-col gap-space-sm">
            <div className="flex items-center justify-between pb-1">
              <h3 className="font-title-md text-title-md font-bold text-text-primary">
                Day {activeDay} Schedule
              </h3>
              <span className="font-label-sm text-xs text-text-secondary">
                {dayItems.length} Stops &amp; Activities
              </span>
            </div>

            <div className="relative pl-6 border-l-2 border-border-hairline ml-2 flex flex-col gap-4">
              {dayItems.map((item, idx) => (
                <article
                  key={item.id || idx}
                  className="relative bg-card-surface rounded-xl p-3.5 border border-border-hairline shadow-sm"
                >
                  {/* Timeline Bullet */}
                  <div className="absolute -left-[31px] top-4 w-4 h-4 rounded-full bg-surface border-2 border-primary-container flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
                  </div>

                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-primary-container">
                      {item.start_time ? item.start_time.slice(0, 5) : `${idx * 2 + 8}:00 AM`}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-surface-container text-text-secondary font-label-badge text-[9px] font-bold uppercase tracking-wider">
                      {item.item_type}
                    </span>
                  </div>

                  <h4 className="font-title-sm text-sm font-bold text-text-primary">
                    {item.title}
                  </h4>
                  {item.description && (
                    <p className="font-body-sm text-xs text-text-secondary mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>

          {/* Package Inclusions Grid */}
          <section className="bg-card-surface rounded-xl p-space-md border border-border-hairline shadow-sm">
            <h3 className="font-title-md text-title-md font-bold text-text-primary mb-3">
              Included in Your Trip
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-lg bg-surface-container-low border border-border-hairline flex flex-col gap-1">
                <span className="material-symbols-outlined text-[20px] text-primary-container">
                  directions_car
                </span>
                <span className="font-label-md text-xs font-semibold text-text-primary mt-1">
                  Private Fleet &amp; Fuel
                </span>
                <span className="font-body-sm text-[11px] text-text-secondary">
                  Dedicated {vehicleName.split("(")[0]} with toll passes
                </span>
              </div>

              <div className="p-3 rounded-lg bg-surface-container-low border border-border-hairline flex flex-col gap-1">
                <span className="material-symbols-outlined text-[20px] text-primary-container">
                  hotel
                </span>
                <span className="font-label-md text-xs font-semibold text-text-primary mt-1">
                  Heritage Haveli Stay
                </span>
                <span className="font-body-sm text-[11px] text-text-secondary">
                  {nights} Nights at {hotelName.split("&")[0]}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-surface-container-low border border-border-hairline flex flex-col gap-1">
                <span className="material-symbols-outlined text-[20px] text-primary-container">
                  confirmation_number
                </span>
                <span className="font-label-md text-xs font-semibold text-text-primary mt-1">
                  Monument Passes
                </span>
                <span className="font-body-sm text-[11px] text-text-secondary">
                  Fast-track QR entry vouchers
                </span>
              </div>

              <div className="p-3 rounded-lg bg-surface-container-low border border-border-hairline flex flex-col gap-1">
                <span className="material-symbols-outlined text-[20px] text-primary-container">
                  support_agent
                </span>
                <span className="font-label-md text-xs font-semibold text-text-primary mt-1">
                  24x7 Concierge
                </span>
                <span className="font-body-sm text-[11px] text-text-secondary">
                  Live trip support on standby
                </span>
              </div>
            </div>
          </section>

          {/* Pricing & Invoice Action Banner */}
          <section className="bg-card-surface rounded-xl p-space-md border border-border-hairline shadow-sm flex items-center justify-between gap-3">
            <div>
              <span className="font-label-sm text-[11px] text-text-secondary uppercase">
                Total Paid
              </span>
              <span className="font-headline-sm text-headline-sm font-bold text-text-primary block">
                {formatCurrency(trip.total_amount)}
              </span>
              <span className="text-[10px] text-text-secondary">
                Invoice #{invoice?.invoice_number || `INV-${trip.booking_ref}`}
              </span>
            </div>

            <Link
              href={`/trips/${trip.id}/invoice`}
              className="py-2.5 px-4 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-label-md text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-sm shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">receipt_long</span>
              <span>View Invoice</span>
            </Link>
          </section>

          {/* Free Cancellation 48-Hour Notice / Cancel Link (DECISIONS D8) */}
          <div className="p-3 rounded-xl bg-surface-container text-xs text-text-secondary flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-text-secondary">
                policy
              </span>
              <span className="text-[11px]">
                100% refund available up to 48 hours prior to trip start.
              </span>
            </div>
            <Link
              href={`/trips?cancel=${trip.id}`}
              className="text-[11px] font-semibold text-error hover:underline shrink-0"
            >
              Cancel booking
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
