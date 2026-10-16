"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import type { ConfirmedTripDetails } from "@/lib/data/booking";
import { getHotelImageUrl } from "@/lib/data/images";
import { formatCurrency, formatDateRange } from "@/lib/format";

interface BookingConfirmationViewProps {
  details: ConfirmedTripDetails;
}

export function BookingConfirmationView({ details }: BookingConfirmationViewProps) {
  const { trip, hotel, vehicle, stops, destination } = details;
  const [copied, setCopied] = React.useState(false);

  const handleCopyRef = () => {
    navigator.clipboard?.writeText(trip.booking_ref);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalDays = trip.total_days || 4;
  const nights = Math.max(1, totalDays - 1);
  const destinationName = destination?.name || "Jaipur";
  const stateName = destination?.region || "Rajasthan";
  const hotelName = hotel?.hotel?.name || "Shahpura Haveli & Heritage Suites";
  const vehicleName = vehicle?.vehicle?.name || "No vehicle selected (Own/Independent Transport)";
  const driverName = vehicle?.driver?.full_name || null;
  const driverPhone = vehicle?.driver?.phone || null;
  const primaryStop = stops[0]?.stop?.name || "Neemrana Fort-Palace Day Pass";
  const roomsCount = hotel?.rooms || 1;

  const datesFormatted =
    trip.start_date && trip.end_date
      ? formatDateRange(trip.start_date, trip.end_date)
      : "Upcoming Trip";

  return (
    <div className="bg-surface font-body-md text-text-primary min-h-screen flex flex-col antialiased">
      {/* Top Header */}
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(20,21,26,0.04)]">
        <div className="h-16 px-margin-mobile flex items-center justify-between gap-space-sm max-w-md mx-auto">
          <div className="flex items-center gap-space-sm">
            <Link
              href="/home"
              className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-text-primary hover:bg-surface-container active:scale-95 transition-colors"
              aria-label="Home"
            >
              <span className="material-symbols-outlined text-[24px]">home</span>
            </Link>
            <h1 className="font-title-md text-title-md font-semibold text-text-primary">
              Confirmation
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-success-green animate-pulse" />
            <span className="font-label-badge text-xs font-bold text-success-green uppercase">
              CONFIRMED
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-md mx-auto w-full px-margin-mobile pt-24 pb-20">
        <div className="flex flex-col gap-space-md">
          {/* Success Banner & Hero Check */}
          <div className="text-center py-4 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-success-green/15 text-success-green flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[36px]">check_circle</span>
            </div>
            <h2 className="font-headline-sm text-headline-sm font-bold text-text-primary">
              Booking Confirmed!
            </h2>
            <p className="font-body-sm text-xs text-text-secondary max-w-xs mt-1 leading-relaxed">
              Your expedition to {destinationName} is locked and confirmed. We have dispatched digital vouchers and tickets to your registered email &amp; WhatsApp.
            </p>
          </div>

          {/* Booking Confirmation Code Card */}
          <section className="bg-card-surface rounded-xl p-space-md border border-border-hairline shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-label-sm text-[10px] text-text-secondary uppercase tracking-widest font-semibold">
                Booking Reference Code
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-success-green">
                <span className="w-1.5 h-1.5 rounded-full bg-success-green" />
                Confirmed &amp; Paid
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 bg-surface-container-low p-3 rounded-lg border border-border-hairline">
              <span className="font-mono text-base font-bold tracking-wider text-text-primary">
                {trip.booking_ref}
              </span>
              <button
                type="button"
                onClick={handleCopyRef}
                className="px-3 py-1.5 rounded-md bg-surface border border-border-hairline hover:bg-surface-container text-xs font-semibold text-text-primary flex items-center gap-1 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[15px]">
                  {copied ? "check" : "content_copy"}
                </span>
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </section>

          {/* Itinerary Recap Card */}
          <section className="bg-card-surface rounded-xl overflow-hidden border border-border-hairline shadow-sm">
            {/* Banner Image */}
            <div className="relative h-44 w-full bg-surface-container">
              <Image
                src={getHotelImageUrl(hotel?.hotel_id ?? "shahpura-haveli")}
                alt={destinationName}
                fill
                priority
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/40" />
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider">
                  {totalDays} Days / {nights} Nights
                </span>
                <h3 className="font-title-lg text-lg font-bold mt-1 text-white">
                  {destinationName}, {stateName}
                </h3>
                <p className="text-xs text-white/90 font-medium">
                  {datesFormatted}
                </p>
              </div>
            </div>

            {/* Inclusions List */}
            <div className="p-space-md flex flex-col gap-3 text-xs divide-y divide-border-hairline/60">
              {/* Hotel */}
              <div className="flex items-start gap-2.5 pt-1">
                <span className="material-symbols-outlined text-[20px] text-primary-container shrink-0 mt-0.5">
                  hotel
                </span>
                <div className="flex-1">
                  <span className="font-semibold text-text-primary block">
                    {hotelName}
                  </span>
                  <span className="text-text-secondary text-[11px]">
                    {roomsCount} Room(s) • Heritage Breakfast Included
                  </span>
                </div>
              </div>

              {/* Transport & Chauffeur */}
              <div className="flex items-start gap-2.5 pt-3">
                <span className="material-symbols-outlined text-[20px] text-primary-container shrink-0 mt-0.5">
                  directions_car
                </span>
                <div className="flex-1">
                  <span className="font-semibold text-text-primary block">
                    {vehicle ? vehicleName : "No vehicle selected (Own/Independent Transport)"}
                  </span>
                  <span className="text-text-secondary text-[11px]">
                    {vehicle && driverName
                      ? `Chauffeur: ${driverName} • ${driverPhone || "Assigned on dispatch"}`
                      : "Self-arranged / independent travel to destination"}
                  </span>
                </div>
              </div>

              {/* Rest Stop */}
              {stops.length > 0 && (
                <div className="flex items-start gap-2.5 pt-3">
                  <span className="material-symbols-outlined text-[20px] text-primary-container shrink-0 mt-0.5">
                    storefront
                  </span>
                  <div className="flex-1">
                    <span className="font-semibold text-text-primary block">
                      {primaryStop}
                    </span>
                    <span className="text-text-secondary text-[11px]">
                      Midway heritage rest stop pass for {trip.traveler_count} guest(s)
                    </span>
                  </div>
                </div>
              )}

              {/* Total Paid Strip */}
              <div className="pt-3 flex items-center justify-between gap-2">
                <div>
                  <span className="font-label-md text-xs font-bold text-text-primary block">
                    Total Paid: {formatCurrency(trip.total_amount)}
                  </span>
                  <span className="text-text-secondary text-[11px]">
                    All taxes, highway toll &amp; fuel included
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-success-green/10 text-success-green font-bold text-[10px]">
                  PAID
                </span>
              </div>
            </div>
          </section>

          {/* Concierge Support Strip */}
          <div className="bg-surface-container rounded-xl p-3 flex items-center gap-3 text-xs">
            <span className="material-symbols-outlined text-primary-container text-[24px] shrink-0">
              support_agent
            </span>
            <div className="flex-1">
              <span className="font-semibold text-text-primary block">
                24x7 Tripmate On-Trip Concierge
              </span>
              <span className="text-text-secondary text-[11px]">
                Dedicated live coordinator on standby via WhatsApp for route and stay coordination.
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col gap-2.5 pt-2">
            <Link
              href={`/trips/${trip.id}`}
              className="w-full py-3.5 px-4 rounded-[12px] bg-primary-container hover:bg-primary text-on-primary font-label-lg text-label-lg font-semibold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[18px]">calendar_month</span>
              <span>View Itinerary &amp; Tickets</span>
            </Link>

            <Link
              href={`/trips/${trip.id}/invoice`}
              className="w-full py-3.5 px-4 rounded-[12px] bg-card-surface hover:bg-surface-container text-text-primary font-label-lg text-label-lg font-semibold flex items-center justify-center gap-2 border border-border-hairline transition-all active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
              <span>Download Tax Invoice</span>
            </Link>

            <Link
              href="/home"
              className="w-full py-2.5 text-center text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
