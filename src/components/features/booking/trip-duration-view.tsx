"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ValidatedDraftTrip } from "@/lib/data/booking-guards";
import { getDurationHeroImageUrl } from "@/lib/data/images";
import { formatCurrency } from "@/lib/format";
import { updateTripDuration } from "@/lib/actions/trips";

interface TripDurationViewProps {
  tripData: ValidatedDraftTrip;
}

export function TripDurationView({ tripData }: TripDurationViewProps) {
  const router = useRouter();
  const { trip, destination, circuit } = tripData;

  // Initialize duration days (default 4 per Stitch export, or existing total_days)
  const initialDays = trip.total_days && trip.total_days >= 2 ? trip.total_days : 4;
  const [days, setDays] = React.useState<number>(initialDays);

  // Initialize travelers count (default 2 per Stitch export, or trip.traveler_count)
  const [travelerCount, setTravelerCount] = React.useState<number>(
    trip.traveler_count && trip.traveler_count >= 1 ? trip.traveler_count : 2
  );

  // Calculate start and end date (start date >= today per D20)
  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Use existing start_date or today + 5 days
  const defaultStartDate = React.useMemo(() => {
    if (trip.start_date) {
      const parsed = new Date(trip.start_date);
      if (parsed >= today) return parsed;
    }
    const d = new Date(today);
    d.setDate(d.getDate() + 5);
    return d;
  }, [trip.start_date, today]);

  const [startDate, setStartDate] = React.useState<Date>(defaultStartDate);

  // Current calendar month view state
  const [viewMonthDate, setViewMonthDate] = React.useState<Date>(
    new Date(defaultStartDate.getFullYear(), defaultStartDate.getMonth(), 1)
  );

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Computed end date = start_date + days - 1 per D20
  const endDate = React.useMemo(() => {
    const end = new Date(startDate);
    end.setDate(end.getDate() + (days - 1));
    return end;
  }, [startDate, days]);

  const nights = Math.max(1, days - 1);

  // Pricing calculations
  const startingRate = circuit?.base_price_per_person
    ? Number(circuit.base_price_per_person)
    : destination?.starting_price ? Number(destination.starting_price) : 12499;

  // Scaled estimate per day count
  const estimatedPricePerPerson = Math.round(
    startingRate + (days - 4) * 2800
  );
  const totalBaseEstimate = estimatedPricePerPerson * travelerCount;

  // Format helper for YYYY-MM-DD
  const formatYMD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Month navigation
  const prevMonth = () => {
    setViewMonthDate((prev) => {
      const target = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      // Don't navigate before current month
      const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return target >= currentMonth ? target : prev;
    });
  };

  const nextMonth = () => {
    setViewMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Calendar dates matrix for viewMonthDate
  const calendarDays = React.useMemo(() => {
    const year = viewMonthDate.getFullYear();
    const month = viewMonthDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const items: Array<{
      date: Date;
      isCurrentMonth: boolean;
      isPast: boolean;
      isInRange: boolean;
      isRangeStart: boolean;
      isRangeEnd: boolean;
    }> = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      items.push({
        date: d,
        isCurrentMonth: false,
        isPast: d < today,
        isInRange: false,
        isRangeStart: false,
        isRangeEnd: false,
      });
    }

    // Current month days
    for (let dNum = 1; dNum <= daysInMonth; dNum++) {
      const d = new Date(year, month, dNum);
      const isPast = d < today;
      const isStart =
        d.getFullYear() === startDate.getFullYear() &&
        d.getMonth() === startDate.getMonth() &&
        d.getDate() === startDate.getDate();
      const isEnd =
        d.getFullYear() === endDate.getFullYear() &&
        d.getMonth() === endDate.getMonth() &&
        d.getDate() === endDate.getDate();
      const inRange = d >= startDate && d <= endDate;

      items.push({
        date: d,
        isCurrentMonth: true,
        isPast,
        isInRange: inRange,
        isRangeStart: isStart,
        isRangeEnd: isEnd,
      });
    }

    // Next month padding to fill grid to multiple of 7
    const remaining = 7 - (items.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month + 1, i);
        items.push({
          date: d,
          isCurrentMonth: false,
          isPast: false,
          isInRange: false,
          isRangeStart: false,
          isRangeEnd: false,
        });
      }
    }

    return items;
  }, [viewMonthDate, startDate, endDate, today]);

  const handleSelectStartDate = (selected: Date) => {
    if (selected < today) return;
    setStartDate(selected);
  };

  const handleContinue = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await updateTripDuration({
        tripId: trip.id,
        startDate: formatYMD(startDate),
        endDate: formatYMD(endDate),
        travelerCount,
      });

      if (res.ok) {
        router.push(`/book/${trip.id}/hotel`);
      } else {
        setErrorMsg(res.error ?? "Failed to save duration.");
        setIsSubmitting(false);
      }
    } catch {
      setErrorMsg("An unexpected network error occurred.");
      setIsSubmitting(false);
    }
  };

  const heroImage = getDurationHeroImageUrl(destination?.slug ?? "jaipur");

  const monthHeader = viewMonthDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const checkInFormatted = startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const checkOutFormatted = endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const windowFormatted = `${startDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })} – ${endDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })}`;

  return (
    <div className="bg-surface font-body-md text-text-primary min-h-screen flex flex-col antialiased">
      {/* Fixed Header */}
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(20,21,26,0.04)]">
        <div className="h-16 px-margin-mobile flex items-center justify-between gap-space-sm max-w-md mx-auto">
          <div className="flex items-center gap-space-sm">
            <button
              type="button"
              aria-label="Go Back"
              className="w-11 h-11 -ml-2 rounded-full flex items-center justify-center text-text-primary hover:bg-surface-container transition-colors active:scale-95"
              onClick={() => router.push(`/destinations/${destination?.slug ?? "jaipur"}`)}
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
            <h1 className="font-headline-sm text-headline-sm text-text-primary tracking-tight truncate max-w-[150px] ml-1">
              Trip Duration
            </h1>
          </div>
          <div className="flex items-center gap-space-sm">
            <button
              type="button"
              aria-label="Trip Info"
              className="w-10 h-10 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">info</span>
            </button>
            <Link
              href="/profile"
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center"
              aria-label="Profile"
            >
              <span className="material-symbols-outlined text-on-primary text-[18px]">
                person
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full bg-surface pt-16 pb-safe">
        <div className="flex flex-col w-full max-w-md mx-auto">
          {/* Top Context Header */}
          <div className="px-margin-mobile pt-space-md pb-space-sm">
            <div className="flex items-center gap-space-xs text-text-secondary font-label-md text-label-md">
              <span className="material-symbols-outlined text-[16px] text-primary-container">
                location_on
              </span>
              <span className="truncate">
                Customizing trip to{" "}
                <strong className="text-text-primary font-semibold">
                  {destination?.name ?? "Jaipur"}, {destination?.region ?? "Rajasthan"}
                </strong>
              </span>
            </div>
          </div>

          {/* Step & Title Section */}
          <div className="px-margin-mobile pt-space-xs pb-space-md">
            <div className="flex items-center gap-space-xs mb-space-xs">
              <span className="bg-surface-container-high text-text-secondary px-2 py-0.5 rounded-full font-label-badge text-label-badge uppercase tracking-wider">
                Step 1 of 4
              </span>
              <span className="text-text-secondary font-body-sm text-body-sm">
                • Itinerary Horizon
              </span>
            </div>
            <h2 className="font-display-lg-mobile text-display-lg-mobile text-text-primary tracking-tight">
              How many days is your trip?
            </h2>
            <p className="font-body-md text-body-md text-text-secondary mt-1">
              We recommend 3–5 days to explore {destination?.name ?? "Jaipur"} comfortably without rushing.
            </p>
          </div>

          {/* Hero Visual Destination Snippet with Scarcity Badge */}
          <div className="px-margin-mobile pb-space-lg">
            <div className="relative w-full h-36 rounded-xl overflow-hidden bg-surface-container shadow-sm">
              <Image
                src={heroImage}
                alt={`${destination?.name ?? "Jaipur"} heritage landmark`}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 448px"
              />
              <div className="absolute inset-0 bg-surface-dark/20" />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-urgency-amber text-white font-label-badge text-label-badge px-2.5 py-1 rounded-full shadow-sm">
                <span className="material-symbols-outlined text-[13px]">
                  local_fire_department
                </span>
                <span>High Season: 78% of heritage stays booked</span>
              </div>
              <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end text-white">
                <div>
                  <span className="font-label-badge text-label-badge uppercase tracking-widest opacity-90 block">
                    Featured Circuit
                  </span>
                  <span className="font-headline-sm text-headline-sm text-white">
                    {circuit?.title ?? "Pink City Heritage & Forts"}
                  </span>
                </div>
                <div className="bg-surface-dark/75 backdrop-blur-md px-2.5 py-1 rounded-lg text-right">
                  <span className="font-label-badge text-label-badge text-zinc-300 block">
                    Ideal Pace
                  </span>
                  <span className="font-title-md text-title-md text-white">
                    {days} Full Days
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Day Selector Horizontal Chips */}
          <div className="px-margin-mobile mb-space-md">
            <label className="font-label-lg text-label-lg text-text-primary block mb-2 font-semibold">
              Select Duration
            </label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {[2, 3, 4, 5, 6].map((d) => {
                const label = d === 6 ? "6+ Days" : `${d} Days`;
                const isSelected = d === 6 ? days >= 6 : days === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    className={`flex-shrink-0 px-4 py-2.5 rounded-full font-label-md text-label-md transition-all active:scale-95 ${
                      isSelected
                        ? "bg-primary-container text-white shadow-sm font-bold"
                        : "bg-card-surface text-text-primary shadow-sm hover:bg-surface-container"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Precision Steppers: Duration & Guests */}
          <div className="px-margin-mobile mb-space-lg flex flex-col gap-3">
            {/* Duration Stepper */}
            <div className="bg-card-surface rounded-xl p-space-md flex items-center justify-between shadow-sm">
              <div className="flex flex-col">
                <span className="font-title-md text-title-md text-text-primary">
                  Fine-tune Duration
                </span>
                <span className="font-body-sm text-body-sm text-text-secondary">
                  {nights} Nights accommodation needed
                </span>
              </div>
              <div className="flex items-center gap-3 bg-surface-container-low px-2 py-1.5 rounded-lg">
                <button
                  type="button"
                  aria-label="Decrease day count"
                  disabled={days <= 2}
                  onClick={() => setDays((prev) => Math.max(2, prev - 1))}
                  className="w-9 h-9 rounded-md bg-card-surface text-text-primary flex items-center justify-center font-title-md shadow-sm active:scale-95 transition-transform hover:bg-surface-container disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[18px]">remove</span>
                </button>
                <span className="font-headline-sm text-headline-sm text-text-primary min-w-[65px] text-center">
                  {days} Days
                </span>
                <button
                  type="button"
                  aria-label="Increase day count"
                  disabled={days >= 14}
                  onClick={() => setDays((prev) => Math.min(14, prev + 1))}
                  className="w-9 h-9 rounded-md bg-card-surface text-text-primary flex items-center justify-center font-title-md shadow-sm active:scale-95 transition-transform hover:bg-surface-container disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </button>
              </div>
            </div>

            {/* Guests Stepper (FEATURES §4.1) */}
            <div className="bg-card-surface rounded-xl p-space-md flex items-center justify-between shadow-sm">
              <div className="flex flex-col">
                <span className="font-title-md text-title-md text-text-primary">
                  Travelers / Guests
                </span>
                <span className="font-body-sm text-body-sm text-text-secondary">
                  {travelerCount === 1
                    ? "Solo explorer"
                    : `${travelerCount} Guests travelling`}
                </span>
              </div>
              <div className="flex items-center gap-3 bg-surface-container-low px-2 py-1.5 rounded-lg">
                <button
                  type="button"
                  aria-label="Decrease traveler count"
                  disabled={travelerCount <= 1}
                  onClick={() => setTravelerCount((prev) => Math.max(1, prev - 1))}
                  className="w-9 h-9 rounded-md bg-card-surface text-text-primary flex items-center justify-center font-title-md shadow-sm active:scale-95 transition-transform hover:bg-surface-container disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[18px]">remove</span>
                </button>
                <span className="font-headline-sm text-headline-sm text-text-primary min-w-[65px] text-center">
                  {travelerCount} {travelerCount === 1 ? "Guest" : "Guests"}
                </span>
                <button
                  type="button"
                  aria-label="Increase traveler count"
                  disabled={travelerCount >= 20}
                  onClick={() => setTravelerCount((prev) => Math.min(20, prev + 1))}
                  className="w-9 h-9 rounded-md bg-card-surface text-text-primary flex items-center justify-center font-title-md shadow-sm active:scale-95 transition-transform hover:bg-surface-container disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Calendar Visualizer */}
          <div className="px-margin-mobile mb-space-lg">
            <div className="bg-card-surface rounded-xl p-space-md shadow-sm">
              <div className="flex items-center justify-between mb-space-md">
                <div>
                  <span className="font-label-badge text-label-badge uppercase tracking-wider text-text-secondary block">
                    Select Travel Dates
                  </span>
                  <h3 className="font-headline-sm text-headline-sm text-text-primary">
                    {monthHeader}
                  </h3>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={prevMonth}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-container-high transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      chevron_left
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label="Next month"
                    onClick={nextMonth}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-container-high transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      chevron_right
                    </span>
                  </button>
                </div>
              </div>

              {/* Day Initials */}
              <div className="grid grid-cols-7 text-center font-label-badge text-label-badge text-text-secondary pb-2">
                <span>S</span>
                <span>M</span>
                <span>T</span>
                <span>W</span>
                <span>T</span>
                <span>F</span>
                <span>S</span>
              </div>

              {/* Calendar Dates Grid */}
              <div className="grid grid-cols-7 gap-y-1.5 text-center font-body-md text-body-md">
                {calendarDays.map((item, index) => {
                  const dayNum = item.date.getDate();

                  if (!item.isCurrentMonth) {
                    return (
                      <span
                        key={index}
                        className="py-2 text-surface-dim select-none font-body-sm"
                      >
                        {dayNum}
                      </span>
                    );
                  }

                  if (item.isPast) {
                    return (
                      <span
                        key={index}
                        className="py-2 text-surface-dim select-none font-body-sm line-through opacity-40"
                      >
                        {dayNum}
                      </span>
                    );
                  }

                  if (item.isRangeStart) {
                    return (
                      <div
                        key={index}
                        className="relative py-1 flex items-center justify-center bg-primary-fixed rounded-l-lg"
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectStartDate(item.date)}
                          className="w-8 h-8 rounded-full bg-primary-container text-white font-title-md text-title-md flex items-center justify-center z-10 shadow-sm active:scale-95"
                        >
                          {dayNum}
                        </button>
                      </div>
                    );
                  }

                  if (item.isRangeEnd) {
                    return (
                      <div
                        key={index}
                        className="relative py-1 flex items-center justify-center bg-primary-fixed rounded-r-lg"
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectStartDate(item.date)}
                          className="w-8 h-8 rounded-full bg-primary-container text-white font-title-md text-title-md flex items-center justify-center z-10 shadow-sm active:scale-95"
                        >
                          {dayNum}
                        </button>
                      </div>
                    );
                  }

                  if (item.isInRange) {
                    return (
                      <div
                        key={index}
                        className="py-1 flex items-center justify-center bg-primary-fixed text-text-primary font-title-md text-title-md"
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectStartDate(item.date)}
                          className="w-8 h-8 flex items-center justify-center"
                        >
                          {dayNum}
                        </button>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelectStartDate(item.date)}
                      className="py-2 rounded-lg text-text-secondary hover:bg-surface-container-high active:scale-95 transition-colors font-medium"
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>

              {/* Check-in / Check-out Tag Callout */}
              <div className="mt-space-md pt-3 flex items-center justify-between bg-surface-container-low p-2.5 rounded-lg border border-border-hairline/60">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary-container" />
                  <div>
                    <span className="font-label-badge text-label-badge text-text-secondary block uppercase">
                      Check-in
                    </span>
                    <span className="font-title-md text-title-md text-text-primary">
                      {checkInFormatted}
                    </span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[18px] text-text-secondary">
                  arrow_forward
                </span>
                <div className="flex items-center gap-2 text-right">
                  <div>
                    <span className="font-label-badge text-label-badge text-text-secondary block uppercase">
                      Check-out
                    </span>
                    <span className="font-title-md text-title-md text-text-primary">
                      {checkOutFormatted}
                    </span>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-primary-container" />
                </div>
              </div>
            </div>
          </div>

          {/* Live Updating Date Summary Card */}
          <div className="px-margin-mobile mb-space-md">
            <div className="bg-card-surface rounded-xl p-space-md shadow-sm">
              <div className="flex items-center justify-between pb-space-sm mb-space-sm bg-surface-container-low/50 -mx-4 -mt-4 px-4 pt-4 rounded-t-xl">
                <span className="font-headline-sm text-headline-sm text-text-primary">
                  Trip Itinerary Estimate
                </span>
                <span className="font-label-badge text-label-badge px-2 py-0.5 rounded-full bg-success-green/10 text-success-green flex items-center gap-1 font-semibold">
                  <span className="material-symbols-outlined text-[13px]">bolt</span>{" "}
                  Best Value
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-body-md text-body-md text-text-secondary flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-text-secondary">
                      date_range
                    </span>
                    Trip Window:
                  </span>
                  <span className="font-title-md text-title-md text-text-primary font-semibold">
                    {windowFormatted}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-body-md text-body-md text-text-secondary flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-text-secondary">
                      schedule
                    </span>
                    Duration:
                  </span>
                  <span className="font-title-md text-title-md text-text-primary font-semibold">
                    {days} Days / {nights} Nights
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-body-md text-body-md text-text-secondary flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-text-secondary">
                      payments
                    </span>
                    Estimated Base Package:
                  </span>
                  <div className="text-right">
                    <span className="font-numeral-price text-numeral-price text-primary-container">
                      {formatCurrency(totalBaseEstimate)}
                    </span>
                    <span className="font-body-sm text-body-sm text-text-secondary block -mt-1">
                      {travelerCount > 1
                        ? `for ${travelerCount} guests`
                        : "/ person"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trust Pill Badge */}
          <div className="px-margin-mobile mb-space-xl">
            <div className="bg-surface-container-low px-space-md py-2.5 rounded-full flex items-center justify-center gap-2 text-center shadow-none border border-border-hairline/40">
              <span
                className="material-symbols-outlined text-[18px] text-success-green"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified_user
              </span>
              <span className="font-label-badge text-label-badge text-text-primary">
                Tripmate Guarantee: Free date changes up to 48 hrs before departure
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="mx-margin-mobile mb-4 p-3 rounded-xl bg-error-container/30 text-error text-xs font-semibold flex items-center gap-2 border border-error/20">
              <span className="material-symbols-outlined text-[16px]">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Sticky Bottom Bar CTA */}
          <div className="sticky bottom-0 w-full bg-card-surface/95 backdrop-blur-xl p-space-md shadow-lg flex flex-col gap-2 z-40 border-t border-border-hairline/60">
            <div className="flex items-center justify-between px-1 text-text-secondary font-label-md text-label-md">
              <span>
                Base price lock expires in{" "}
                <strong className="text-urgency-amber">14:59</strong>
              </span>
              <span className="text-primary-container font-semibold">
                Taxes included
              </span>
            </div>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleContinue}
              className="w-full bg-primary-container hover:bg-primary text-white font-title-md text-title-md py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-[20px] animate-spin">
                    progress_activity
                  </span>
                  <span>Saving Dates...</span>
                </>
              ) : (
                <>
                  <span>Continue to Hotels</span>
                  <span className="material-symbols-outlined text-[20px]">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
