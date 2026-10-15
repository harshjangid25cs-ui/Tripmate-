"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ValidatedDraftTrip } from "@/lib/data/booking-guards";
import type { DestinationHighlight } from "@/lib/data/destinations";
import {
  getHotelImageUrl,
  getStopImageUrl,
  getHighlightImageUrl,
} from "@/lib/data/images";
import { formatCurrency } from "@/lib/format";

interface TripReviewViewProps {
  tripData: ValidatedDraftTrip;
  highlights: DestinationHighlight[];
}

export function TripReviewView({ tripData, highlights }: TripReviewViewProps) {
  const router = useRouter();
  const { trip, hotel, vehicle, stops, destination, circuit } = tripData;

  const totalDays = trip.total_days ?? 4;
  const nights = Math.max(1, totalDays - 1);
  const travelers = trip.traveler_count ?? 1;

  const [activeDay, setActiveDay] = React.useState<number>(1);
  const [copiedShare, setCopiedShare] = React.useState(false);

  // Compute dates string
  const datesText = React.useMemo(() => {
    if (!trip.start_date || !trip.end_date) return "Dec 14 – 17";
    const start = new Date(trip.start_date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const end = new Date(trip.end_date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${start} - ${end}`;
  }, [trip.start_date, trip.end_date]);

  // Breakdown figures from DB columns
  const staySubtotal = hotel ? Number(hotel.subtotal) : 12600;
  const vehicleSubtotal = vehicle ? Number(vehicle.subtotal) : 7596;
  const stopsSubtotal = stops.reduce((acc, s) => acc + Number(s.subtotal), 0);
  const serviceFee = Number(trip.service_fee ?? 999);
  const taxAmount = Number(trip.tax_amount ?? 4481);
  const discountAmount = Number(trip.discount_amount ?? 0);
  const totalAmount = Number(trip.total_amount ?? 27376);
  const perPerson = travelers > 0 ? Math.round(totalAmount / travelers) : totalAmount;

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const handleProceed = () => {
    router.push(`/book/${trip.id}/travellers`);
  };

  const vehicleName = vehicle?.vehicle?.name ?? "Maruti Suzuki Dzire";
  const hotelName = hotel?.hotel?.name ?? "Shahpura Haveli & Heritage Suites";
  const primaryStop = stops[0]?.stop ?? null;

  return (
    <div className="bg-surface text-on-surface font-body-md text-body-md antialiased min-h-screen flex flex-col">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 px-margin-mobile flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-space-sm">
            <button
              type="button"
              aria-label="Go back"
              className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container active:scale-95 transition-all -ml-2"
              onClick={() => router.push(`/book/${trip.id}/stops`)}
            >
              <span className="material-symbols-outlined text-[24px]">
                arrow_back
              </span>
            </button>
            <div className="flex items-center gap-1.5" aria-label="Tripmate Logo">
              <svg
                width="24"
                height="24"
                viewBox="0 0 28 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="shrink-0"
              >
                <rect width="28" height="28" rx="7" fill="#E11D2E" />
                <path
                  d="M7 20V8L14 14L21 8V20"
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-base font-bold tracking-tight text-neutral-900 leading-none">
                Tripmate
              </span>
            </div>
            <h1 className="font-headline-sm text-headline-sm text-on-surface select-none ml-1">
              Trip Itinerary
            </h1>
          </div>
          <div className="flex items-center gap-space-xs">
            <button
              type="button"
              aria-label="Share Itinerary"
              onClick={handleShare}
              className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">
                {copiedShare ? "check" : "ios_share"}
              </span>
            </button>
            <Link
              href="/profile"
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center ml-space-xs"
              aria-label="Profile"
            >
              <span className="material-symbols-outlined text-on-primary text-[18px]">
                person
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col relative w-full pt-16 pb-28 bg-surface">
        <div className="flex flex-col w-full max-w-[430px] mx-auto px-margin-mobile pb-space-xl">
          {/* Trip Overview Header Card */}
          <section className="mt-space-sm bg-card-surface rounded-xl p-space-md shadow-sm border border-border-hairline">
            <div className="flex items-center justify-between gap-space-xs mb-space-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success-green/10 text-success-green font-label-badge text-label-badge uppercase tracking-wider font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-success-green" />
                Curated Custom Itinerary
              </span>
              <span className="inline-flex items-center gap-1 text-urgency-amber font-label-badge text-label-badge bg-urgency-amber/10 px-2 py-0.5 rounded-full font-semibold">
                <span className="material-symbols-outlined text-[14px]">bolt</span>
                Instant Confirmation
              </span>
            </div>

            <h2 className="font-headline-md text-headline-md text-text-primary tracking-tight">
              {trip.title ?? circuit?.title ?? "Jaipur Heritage & Forts Circuit"}
            </h2>

            <div className="flex items-center gap-1.5 text-text-secondary font-label-md text-label-md mt-1">
              <span className="material-symbols-outlined text-[16px] text-primary-container">
                route
              </span>
              <span className="truncate">
                Delhi → {stops[0]?.stop?.name ? `${stops[0].stop.name} → ` : ""}
                {destination?.name ?? "Jaipur"}
              </span>
              <span className="text-text-secondary/40">•</span>
              <span className="whitespace-nowrap font-semibold text-text-primary">
                {totalDays}D / {nights}N
              </span>
            </div>

            {/* Quick Meta Chips */}
            <div className="flex flex-wrap gap-1.5 mt-space-sm">
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container text-on-surface font-body-sm text-body-sm">
                <span className="material-symbols-outlined text-[15px] text-text-secondary">
                  group
                </span>
                <span>
                  {travelers} {travelers === 1 ? "Traveler" : "Travelers"}
                </span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container text-on-surface font-body-sm text-body-sm">
                <span className="material-symbols-outlined text-[15px] text-text-secondary">
                  calendar_today
                </span>
                <span>{datesText}</span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container text-on-surface font-body-sm text-body-sm">
                <span className="material-symbols-outlined text-[15px] text-text-secondary">
                  directions_car
                </span>
                <span className="truncate max-w-[120px]">{vehicleName}</span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container text-on-surface font-body-sm text-body-sm">
                <span className="material-symbols-outlined text-[15px] text-text-secondary">
                  hotel
                </span>
                <span className="truncate max-w-[120px]">{hotelName}</span>
              </div>
            </div>
          </section>

          {/* Day Selector Horizontal Scroll */}
          <section className="mt-space-md -mx-margin-mobile px-margin-mobile overflow-x-auto no-scrollbar py-1">
            <div className="flex items-center gap-2 w-max">
              {Array.from({ length: totalDays }, (_, idx) => idx + 1).map((dayNum) => {
                const isSelected = activeDay === dayNum;
                const titles = [
                  "Arrival & Forts",
                  "Palaces & Bazaars",
                  "Nahargarh Sunset",
                  "Stepwells & Return",
                  "Local Craft Trails",
                  "Aravali Hills Expedition",
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
                        ? "wb_sunny"
                        : dayNum === 2
                        ? "fitbit_push_ups"
                        : dayNum === 3
                        ? "wb_twilight"
                        : "flight_takeoff"}
                    </span>
                    <span>
                      Day {dayNum}: {subtitle}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Day Schedule Timeline */}
          <section className="mt-space-md flex flex-col gap-space-sm">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-baseline gap-2">
                <span className="font-headline-sm text-headline-sm text-text-primary">
                  Day {activeDay} Itinerary
                </span>
                <span className="font-body-sm text-body-sm text-text-secondary">
                  {activeDay === 1 ? "Arrival & Exploration" : `Paced Horizon Day ${activeDay}`}
                </span>
              </div>
              <span className="font-label-badge text-label-badge text-primary-container bg-primary-fixed px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                {activeDay === 1 ? "5 Stops" : "4 Highlights"}
              </span>
            </div>

            {/* Timeline Wrapper */}
            <div className="relative pl-6 flex flex-col gap-space-md before:content-[''] before:absolute before:left-[11px] before:top-3 before:bottom-3 before:w-0.5 before:bg-surface-container-highest">
              {activeDay === 1 ? (
                <>
                  {/* Stop 1: Chauffeur Pickup */}
                  <article className="relative bg-card-surface rounded-xl p-space-md shadow-sm border border-border-hairline">
                    <div className="absolute -left-[30px] top-4 w-5 h-5 rounded-full bg-card-surface flex items-center justify-center border border-border-hairline">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary-container" />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-label-md text-label-md text-primary-container font-bold">
                          07:30 AM
                        </span>
                        <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-label-badge text-label-badge font-semibold">
                          DELHI NCR
                        </span>
                      </div>
                      <span className="font-body-sm text-body-sm text-text-secondary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">
                          schedule
                        </span>{" "}
                        3h drive
                      </span>
                    </div>
                    <h3 className="font-title-md text-title-md text-text-primary mt-1.5">
                      Private Chauffeur Pickup
                    </h3>
                    <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                      Doorstep pickup in sanitized {vehicleName}. Refreshing mint wet wipes &amp; chilled mineral water onboard.
                    </p>
                    <div className="mt-space-sm flex items-center gap-2 p-2 bg-surface rounded-lg border border-border-hairline/60">
                      <span className="material-symbols-outlined text-[20px] text-text-secondary">
                        local_taxi
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-label-md text-label-md text-text-primary truncate">
                          Assigned Chauffeur: Rajesh Kumar
                        </div>
                        <div className="font-body-sm text-body-sm text-text-secondary truncate">
                          DL 1Y AA 4088 • 4.96 ★ (180+ trips)
                        </div>
                      </div>
                    </div>
                  </article>

                  {/* Stop 2: En Route Rest Stop */}
                  {primaryStop && (
                    <article className="relative bg-card-surface rounded-xl overflow-hidden shadow-sm border border-border-hairline">
                      <div className="absolute -left-[30px] top-4 w-5 h-5 rounded-full bg-card-surface flex items-center justify-center border border-border-hairline z-10">
                        <span className="w-2.5 h-2.5 rounded-full bg-urgency-amber" />
                      </div>
                      <div className="relative h-36 w-full bg-surface-container">
                        <Image
                          src={getStopImageUrl(primaryStop.name, primaryStop.image_path)}
                          alt={primaryStop.name}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-urgency-amber text-on-primary font-label-badge text-label-badge flex items-center gap-1 shadow-sm font-semibold">
                          <span className="material-symbols-outlined text-[13px]">
                            restaurant
                          </span>
                          Heritage Rest Stop Included
                        </div>
                      </div>
                      <div className="p-space-md">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-label-md text-label-md text-text-primary font-bold">
                              10:30 AM
                            </span>
                            <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-label-badge text-label-badge font-semibold uppercase">
                              {primaryStop.name.split(" ")[0]}
                            </span>
                          </div>
                          <span className="font-body-sm text-body-sm text-text-secondary">
                            1h 15m stop
                          </span>
                        </div>
                        <h3 className="font-title-md text-title-md text-text-primary mt-1.5">
                          {primaryStop.name} Midway Breakfast
                        </h3>
                        <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                          Pre-reserved express table. Buffet refreshment, clean private washrooms, and EV fast-charging access.
                        </p>
                      </div>
                    </article>
                  )}

                  {/* Stop 3: Hotel Check-in */}
                  <article className="relative bg-card-surface rounded-xl overflow-hidden shadow-sm border border-border-hairline">
                    <div className="absolute -left-[30px] top-4 w-5 h-5 rounded-full bg-card-surface flex items-center justify-center border border-border-hairline z-10">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary-container" />
                    </div>
                    <div className="relative h-36 w-full bg-surface-container">
                      <Image
                        src={getHotelImageUrl(hotelName, hotel?.hotel?.image_paths?.[0])}
                        alt={hotelName}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-surface-dark/80 text-on-primary font-label-badge text-label-badge flex items-center gap-1 shadow-sm backdrop-blur-md">
                        <span className="material-symbols-outlined text-[13px]">
                          verified
                        </span>
                        {nights}-Night Stay Reserved
                      </div>
                    </div>
                    <div className="p-space-md">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-label-md text-label-md text-text-primary font-bold">
                            01:30 PM
                          </span>
                          <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-label-badge text-label-badge font-semibold">
                            JAIPUR
                          </span>
                        </div>
                        <span className="font-body-sm text-body-sm text-success-green font-semibold">
                          Priority Early Check-in
                        </span>
                      </div>
                      <h3 className="font-title-md text-title-md text-text-primary mt-1.5">
                        Check-in at {hotelName}
                      </h3>
                      <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                        Traditional Rajasthani royal welcome, marigold garlands, and chilled saffron cooler. Rest and unpack in your suite.
                      </p>
                    </div>
                  </article>

                  {/* Stop 4: Highlight Monument */}
                  <article className="relative bg-card-surface rounded-xl p-space-md shadow-sm border border-border-hairline">
                    <div className="absolute -left-[30px] top-4 w-5 h-5 rounded-full bg-card-surface flex items-center justify-center border border-border-hairline">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary-container" />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-label-md text-label-md text-text-primary font-bold">
                          04:00 PM
                        </span>
                        <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-label-badge text-label-badge font-semibold">
                          EXPLORATION
                        </span>
                      </div>
                      <span className="font-body-sm text-body-sm text-primary-container font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px]">
                          qr_code_2
                        </span>{" "}
                        Fast-Track Entry
                      </span>
                    </div>
                    <h3 className="font-title-md text-title-md text-text-primary mt-1.5">
                      {highlights[0]?.title ?? "Hawa Mahal & City Palace Walk"}
                    </h3>
                    <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                      Private heritage historian accompaniment. Includes skip-the-line QR vouchers for all travelers.
                    </p>
                    <div className="mt-2.5 flex items-center justify-between text-body-sm text-text-secondary bg-surface rounded-lg p-2 border border-border-hairline/60">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px] text-primary-container">
                          history_edu
                        </span>
                        <span>Private Historian: Dr. Arvind Rathore</span>
                      </div>
                      <span className="font-label-badge text-label-badge text-success-green font-bold">
                        VIP PASS
                      </span>
                    </div>
                  </article>
                </>
              ) : (
                <>
                  {/* Highlights for Subsequent Days */}
                  {highlights.slice(1).map((hl, idx) => (
                    <article
                      key={hl.id}
                      className="relative bg-card-surface rounded-xl overflow-hidden shadow-sm border border-border-hairline"
                    >
                      <div className="absolute -left-[30px] top-4 w-5 h-5 rounded-full bg-card-surface flex items-center justify-center border border-border-hairline z-10">
                        <span className="w-2.5 h-2.5 rounded-full bg-primary-container" />
                      </div>
                      <div className="relative h-32 w-full bg-surface-container">
                        <Image
                          src={getHighlightImageUrl(hl.sortOrder)}
                          alt={hl.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="p-space-md">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-label-md text-label-md text-primary-container font-bold">
                            {idx === 0 ? "09:30 AM" : "03:30 PM"}
                          </span>
                          <span className="font-label-badge text-label-badge bg-surface-container text-text-secondary px-2 py-0.5 rounded uppercase">
                            {hl.durationText}
                          </span>
                        </div>
                        <h3 className="font-title-md text-title-md text-text-primary mt-1">
                          {hl.title}
                        </h3>
                        <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                          Verified curated activity with pre-reserved monument passes and private vehicle coordination.
                        </p>
                      </div>
                    </article>
                  ))}
                </>
              )}
            </div>
          </section>

          {/* Inclusions Card */}
          <section className="mt-space-lg bg-card-surface rounded-xl p-space-md shadow-sm border border-border-hairline">
            <h3 className="font-title-md text-title-md text-text-primary mb-space-sm font-semibold">
              Included in Your Trip
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-lg bg-surface-container-low border border-border-hairline/60 flex flex-col gap-1">
                <span className="material-symbols-outlined text-[20px] text-primary-container">
                  directions_car
                </span>
                <span className="font-label-md text-xs font-semibold text-text-primary mt-1">
                  Private Fleet &amp; Fuel
                </span>
                <span className="font-body-sm text-[11px] text-text-secondary">
                  Dedicated {vehicleName} with toll passes
                </span>
              </div>
              <div className="p-3 rounded-lg bg-surface-container-low border border-border-hairline/60 flex flex-col gap-1">
                <span className="material-symbols-outlined text-[20px] text-primary-container">
                  hotel
                </span>
                <span className="font-label-md text-xs font-semibold text-text-primary mt-1">
                  Heritage Stay
                </span>
                <span className="font-body-sm text-[11px] text-text-secondary">
                  {nights} Nights at {hotelName.split("&")[0]}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-surface-container-low border border-border-hairline/60 flex flex-col gap-1">
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
              <div className="p-3 rounded-lg bg-surface-container-low border border-border-hairline/60 flex flex-col gap-1">
                <span className="material-symbols-outlined text-[20px] text-primary-container">
                  history_edu
                </span>
                <span className="font-label-md text-xs font-semibold text-text-primary mt-1">
                  Heritage Historian
                </span>
                <span className="font-body-sm text-[11px] text-text-secondary">
                  Certified guidance on royal landmarks
                </span>
              </div>
            </div>
          </section>

          {/* Transparent Cost Itemization Sheet */}
          <section className="mt-space-lg bg-card-surface rounded-xl p-space-md shadow-sm border border-border-hairline">
            <div className="flex items-center justify-between mb-space-sm">
              <h3 className="font-title-md text-title-md text-text-primary font-semibold">
                Transparent Price Breakdown
              </h3>
              <span className="font-label-badge text-label-badge text-text-secondary uppercase">
                All-inclusive
              </span>
            </div>

            <div className="flex flex-col gap-2 font-body-sm text-body-sm">
              <div className="flex justify-between items-center text-text-secondary">
                <span>Base Stay ({nights}N Stay &amp; Breakfasts)</span>
                <span className="font-semibold text-text-primary">
                  {formatCurrency(staySubtotal)}
                </span>
              </div>
              <div className="flex justify-between items-center text-text-secondary">
                <span>
                  {vehicleName} ({totalDays} Days)
                </span>
                <span className="font-semibold text-text-primary">
                  {formatCurrency(vehicleSubtotal)}
                </span>
              </div>
              {stopsSubtotal > 0 && (
                <div className="flex justify-between items-center text-text-secondary">
                  <span>Mid-journey Rest Passes</span>
                  <span className="font-semibold text-text-primary">
                    {formatCurrency(stopsSubtotal)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-text-secondary">
                <span>Monuments Fast-Track &amp; Guide Fees</span>
                <span className="font-semibold text-success-green">INCLUDED</span>
              </div>
              <div className="flex justify-between items-center text-text-secondary">
                <span>Tripmate Service Fee</span>
                <span className="font-semibold text-text-primary">
                  {formatCurrency(serviceFee)}
                </span>
              </div>
              <div className="flex justify-between items-center text-text-secondary">
                <span>Applicable GST &amp; Tourism Cess (18%)</span>
                <span className="font-semibold text-text-primary">
                  {formatCurrency(taxAmount)}
                </span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-text-secondary">
                  <span>Promotional Coupon ({trip.coupon_code ?? "DISCOUNT"})</span>
                  <span className="font-semibold text-success-green">
                    -{formatCurrency(discountAmount)}
                  </span>
                </div>
              )}

              <div className="h-px bg-surface-container-highest my-1" />

              <div className="flex justify-between items-baseline pt-1">
                <div>
                  <span className="font-headline-sm text-headline-sm text-text-primary">
                    Grand Total
                  </span>
                  <div className="font-body-sm text-body-sm text-text-secondary">
                    {formatCurrency(perPerson)} / person for {travelers} guests
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-numeral-price text-numeral-price text-primary-container">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Free Cancellation Guarantee */}
            <div className="mt-space-md p-2.5 rounded-lg bg-surface flex items-center gap-2 text-text-secondary font-body-sm text-body-sm border border-border-hairline/40">
              <span className="material-symbols-outlined text-success-green text-[18px]">
                verified_user
              </span>
              <span>
                Free modification or cancellation up to 48 hours prior to trip.
              </span>
            </div>

            {/* Actions */}
            <div className="mt-space-md flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleProceed}
                className="w-full min-h-[48px] px-6 py-3.5 bg-primary-container hover:bg-primary text-on-primary rounded-xl font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] font-bold"
              >
                <span>Confirm &amp; Proceed</span>
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </button>
              <button
                type="button"
                onClick={() => router.push(`/book/${trip.id}/duration`)}
                className="w-full min-h-[44px] py-2 text-text-secondary hover:text-text-primary font-label-md text-label-md flex items-center justify-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">tune</span>
                <span>Customize Stops / Edit Days</span>
              </button>
            </div>
          </section>
        </div>
      </main>

      {/* Fixed Bottom Aside Drawer */}
      <aside className="fixed bottom-0 w-full z-50 pb-safe bg-surface/95 backdrop-blur-xl shadow-[0_-4px_24px_rgba(20,21,26,0.08)] border-t border-border-hairline">
        <div className="max-w-md mx-auto px-margin-mobile py-space-sm flex items-center justify-between gap-gutter">
          <div className="flex flex-col">
            <span className="font-label-md text-label-md text-text-secondary uppercase tracking-wider">
              Total Estimate
            </span>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-numeral-price text-numeral-price text-text-primary font-bold">
                {formatCurrency(totalAmount)}
              </span>
              <span className="font-body-sm text-body-sm text-text-secondary">
                / {travelers} {travelers === 1 ? "guest" : "guests"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleProceed}
            className="min-h-[44px] h-12 px-space-lg bg-primary-container hover:bg-primary text-on-primary rounded-xl font-label-lg text-label-lg flex items-center justify-center gap-space-sm transition-all active:scale-[0.98] shadow-sm font-bold"
          >
            <span className="material-symbols-outlined text-[20px]">lock</span>
            <span>Confirm &amp; Proceed</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
