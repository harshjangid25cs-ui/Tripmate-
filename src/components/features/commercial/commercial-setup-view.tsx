"use client";

import * as React from "react";
import { CatalogImage } from "@/components/ui/CatalogImage";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getRecommendedBusText, type CommercialDraftData } from "@/lib/data/commercial-types";
import { saveCommercialSetupAction } from "@/lib/actions/commercial";

interface CommercialSetupViewProps {
  draft: CommercialDraftData;
}

const BANNER_IMAGE_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC4cxYC-3LehPGvYzCrN0ICLrhWOLeZcXFVEPXGyz_vLqhT0_W1LkszPIyR2KZXtm1ZB8EQRxSyCO6YeP0iKJ4E5LwNrenfhzwXHDuRbLKWThPFnNmDOZjmRpPb1HtwJUC_QCChr6xdMfZmkhgARHzjfj6VMADT-CD1F75fP2boPXG9m4rtZE09LVRJLQrUuo1sPG7FqcHCk_6-Lodn5UQbqQ0TgoZ65kixuImV3jWu";

export function CommercialSetupView({ draft }: CommercialSetupViewProps) {
  const router = useRouter();
  const { trip, commercialBooking } = draft;

  // Form State
  const [travelerCount, setTravelerCount] = React.useState<number>(
    trip.traveler_count || 28
  );

  // Default dates: start 14 days out, duration 5 days
  const defaultStart =
    trip.start_date ||
    new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0] ||
    "2026-11-20";
  const defaultEnd =
    trip.end_date ||
    new Date(new Date(defaultStart).getTime() + 4 * 86400000)
      .toISOString()
      .split("T")[0] ||
    "2026-11-24";

  const [startDate, setStartDate] = React.useState<string>(defaultStart);
  const [endDate, setEndDate] = React.useState<string>(defaultEnd);

  // From / To Locations (DECISIONS D4)
  const [fromLocation, setFromLocation] = React.useState<string>(
    trip.from_location || "Delhi NCR"
  );
  const [toLocation, setToLocation] = React.useState<string>(
    trip.to_location || "Jaipur Heritage Circuit"
  );

  // Departure Time
  const initialTime = commercialBooking?.booking_time
    ? commercialBooking.booking_time.slice(0, 5)
    : "07:30";
  const [timeValue, setTimeValue] = React.useState<string>(initialTime);
  const [ampm, setAmpm] = React.useState<"AM" | "PM">("AM");

  // Purpose
  const [tripPurpose, setTripPurpose] = React.useState<string>(
    commercialBooking?.trip_purpose || trip.title || "Engineering Offsite Q4 — Jaipur"
  );

  // Submission state
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Compute Days / Nights
  const diffDays = React.useMemo(() => {
    if (!startDate || !endDate) return 5;
    const s = new Date(startDate).getTime();
    const e = new Date(endDate).getTime();
    const days = Math.round((e - s) / 86400000) + 1;
    return Math.max(1, days);
  }, [startDate, endDate]);
  const nights = Math.max(1, diffDays - 1);

  // Stepper handlers
  const handleDec = () => setTravelerCount((prev) => Math.max(1, prev - 1));
  const handleInc = () => setTravelerCount((prev) => Math.min(120, prev + 1));

  // Time preset handler
  const handlePresetTime = (time: string, period: "AM" | "PM") => {
    setTimeValue(time);
    setAmpm(period);
  };

  // Quick purpose filler
  const handleFillPurpose = (text: string) => {
    setTripPurpose(text);
  };

  const handleContinue = async () => {
    if (!fromLocation.trim() || !toLocation.trim()) {
      setErrorMessage("Both Origin (From) and Destination (To) locations are required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    // Format 24-hr time for DB time column
    const [h, m] = timeValue.split(":");
    let hour = parseInt(h || "7", 10);
    if (ampm === "PM" && hour < 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
    const formattedTime = `${String(hour).padStart(2, "0")}:${m || "30"}:00`;

    const res = await saveCommercialSetupAction(trip.id, {
      travelerCount,
      startDate,
      endDate,
      bookingTime: formattedTime,
      fromLocation: fromLocation.trim(),
      toLocation: toLocation.trim(),
      tripPurpose: tripPurpose.trim(),
    });

    if (res.ok) {
      router.push(`/commercial/${trip.id}/bus`);
    } else {
      setErrorMessage(res.error || "Failed to save details. Please verify your inputs.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-surface font-body-md text-text-primary min-h-screen flex flex-col antialiased">
      {/* Top Header */}
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(20,21,26,0.04)]">
        <div className="h-16 px-margin-mobile flex items-center justify-between gap-space-sm max-w-md mx-auto">
          <div className="flex items-center gap-space-xs">
            <Link
              href="/commercial"
              className="w-10 h-10 -ml-2 rounded-lg flex items-center justify-center text-text-primary hover:bg-surface-container active:scale-95 transition-all"
              aria-label="Back to commercial intro"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </Link>
            <div className="w-7 h-7 rounded-lg bg-primary-container flex items-center justify-center text-on-primary font-bold text-xs">
              M
            </div>
            <span className="font-title-md text-title-md text-text-primary font-bold hidden sm:inline-block">
              Tripmate
            </span>
          </div>

          <div className="flex flex-col items-center justify-center text-center flex-1 min-w-0 px-space-xs">
            <span className="font-title-md text-sm font-bold text-text-primary truncate w-full">
              Commercial Trip Details
            </span>
            <span className="font-label-badge text-[10px] text-primary uppercase tracking-wider font-bold">
              Step 1 of 3
            </span>
          </div>

          <div className="flex items-center gap-space-xs">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 text-on-primary">
              <span className="material-symbols-outlined text-[18px]">person</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-md mx-auto px-margin-mobile pt-20 pb-36">
        <div className="flex flex-col gap-space-md">
          {/* Banner Photo Strip */}
          <div className="relative w-full h-28 rounded-xl overflow-hidden shadow-sm bg-surface-container">
            <CatalogImage
              src={BANNER_IMAGE_URL}
              alt="Panoramic corporate coach bus parked at glass headquarters"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-surface-dark/35 flex items-end p-space-sm">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-dark/75 backdrop-blur-md text-on-primary font-label-badge text-[10px] uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
                COMMERCIAL FLEET SETUP • STEP 01
              </span>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-error/10 border border-error/20 text-xs text-error font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Number of Travelers */}
          <section className="bg-card-surface rounded-xl p-space-md shadow-sm border border-border-hairline flex flex-col gap-space-sm">
            <div className="flex items-start justify-between gap-space-sm">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center shrink-0 text-text-primary">
                  <span className="material-symbols-outlined text-[20px]">groups</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <h2 className="font-headline-sm text-sm font-bold text-text-primary">
                    Number of Travelers
                  </h2>
                  <p className="font-body-sm text-xs text-text-secondary truncate">
                    For coach or fleet sizing (Min 1, Max 120)
                  </p>
                </div>
              </div>

              {/* Stepper Component */}
              <div className="flex items-center gap-2 shrink-0 bg-surface-container-low px-2 py-1 rounded-lg border border-border-hairline">
                <button
                  type="button"
                  onClick={handleDec}
                  aria-label="Decrease passenger count"
                  className="w-8 h-8 rounded bg-card-surface text-text-primary flex items-center justify-center active:scale-95 shadow-sm border border-border-hairline select-none hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">remove</span>
                </button>
                <span className="font-numeral-price text-base font-bold text-text-primary w-8 text-center select-none">
                  {travelerCount}
                </span>
                <button
                  type="button"
                  onClick={handleInc}
                  aria-label="Increase passenger count"
                  className="w-8 h-8 rounded bg-card-surface text-text-primary flex items-center justify-center active:scale-95 shadow-sm border border-border-hairline select-none hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </button>
              </div>
            </div>

            {/* Dynamic Recommendation */}
            <div className="mt-1 flex items-center gap-2 p-2.5 rounded-lg bg-surface-container-low border border-border-hairline">
              <span className="material-symbols-outlined text-primary-container text-[18px] shrink-0">
                directions_bus
              </span>
              <p className="font-body-sm text-xs text-text-primary font-medium">
                {getRecommendedBusText(travelerCount)}
              </p>
            </div>
          </section>

          {/* Section 2: Trip Duration & Dates */}
          <section className="bg-card-surface rounded-xl p-space-md shadow-sm border border-border-hairline flex flex-col gap-space-sm">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center shrink-0 text-text-primary">
                <span className="material-symbols-outlined text-[20px]">calendar_month</span>
              </div>
              <div className="flex flex-col">
                <h2 className="font-headline-sm text-sm font-bold text-text-primary">
                  Trip Duration &amp; Dates
                </h2>
                <p className="font-body-sm text-xs text-text-secondary">
                  Select departure and return schedule
                </p>
              </div>
            </div>

            {/* Date Inputs */}
            <div className="grid grid-cols-11 items-center gap-1.5 pt-1">
              {/* Start Date */}
              <div className="col-span-5 bg-surface-container-low p-2.5 rounded-lg flex flex-col border border-border-hairline">
                <span className="font-label-badge text-[10px] text-text-secondary uppercase">
                  Start Date
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent font-title-md text-xs font-bold text-text-primary mt-1 focus:outline-none"
                />
              </div>

              {/* Arrow Divider */}
              <div className="col-span-1 flex items-center justify-center text-text-secondary">
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </div>

              {/* End Date */}
              <div className="col-span-5 bg-surface-container-low p-2.5 rounded-lg flex flex-col border border-border-hairline">
                <span className="font-label-badge text-[10px] text-text-secondary uppercase">
                  End Date
                </span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent font-title-md text-xs font-bold text-text-primary mt-1 focus:outline-none"
                />
              </div>
            </div>

            {/* Calculated duration pill */}
            <div className="flex items-center justify-between mt-1 px-3 py-2 rounded-lg bg-surface border border-border-hairline">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-success-green text-[18px]">
                  check_circle
                </span>
                <span className="font-body-sm text-xs text-text-secondary font-medium">
                  Schedule verified
                </span>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-dark text-on-primary font-label-badge text-[10px] font-bold">
                {diffDays} Days • {nights} Nights
              </span>
            </div>
          </section>

          {/* Section 3: Origin & Destination (DECISIONS D4 Required Deviation) */}
          <section className="bg-card-surface rounded-xl p-space-md shadow-sm border border-border-hairline flex flex-col gap-space-sm">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center shrink-0 text-text-primary">
                <span className="material-symbols-outlined text-[20px]">alt_route</span>
              </div>
              <div className="flex flex-col">
                <h2 className="font-headline-sm text-sm font-bold text-text-primary">
                  Route &amp; Destination
                </h2>
                <p className="font-body-sm text-xs text-text-secondary">
                  Charter pickup and destination route
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <div>
                <label className="font-label-badge text-[10px] uppercase text-text-secondary block mb-1">
                  Origin / Pickup Location (Required)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={fromLocation}
                    onChange={(e) => setFromLocation(e.target.value)}
                    placeholder="e.g. Delhi NCR (Cyber City, Gurgaon)"
                    className="w-full px-3 py-2.5 rounded-lg bg-card-surface text-xs font-semibold text-text-primary border border-border-hairline focus:outline-none focus:border-primary-container"
                  />
                </div>
              </div>

              <div>
                <label className="font-label-badge text-[10px] uppercase text-text-secondary block mb-1">
                  Destination Location (Required)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={toLocation}
                    onChange={(e) => setToLocation(e.target.value)}
                    placeholder="e.g. Jaipur Heritage Circuit"
                    className="w-full px-3 py-2.5 rounded-lg bg-card-surface text-xs font-semibold text-text-primary border border-border-hairline focus:outline-none focus:border-primary-container"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Departure Time */}
          <section className="bg-card-surface rounded-xl p-space-md shadow-sm border border-border-hairline flex flex-col gap-space-sm">
            <div className="flex items-start gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center shrink-0 text-text-primary">
                <span className="material-symbols-outlined text-[20px]">schedule</span>
              </div>
              <div className="flex flex-col">
                <h2 className="font-headline-sm text-sm font-bold text-text-primary">
                  Departure Time
                </h2>
                <p className="font-body-sm text-xs text-text-secondary">
                  Fleet dispatch &amp; driver reporting time
                </p>
              </div>
            </div>

            {/* Time Display and AM/PM Toggle */}
            <div className="flex items-center justify-between bg-surface-container-low p-2.5 rounded-lg mt-1 border border-border-hairline">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-text-secondary text-[20px]">
                  alarm
                </span>
                <input
                  type="text"
                  value={timeValue}
                  onChange={(e) => setTimeValue(e.target.value)}
                  className="font-numeral-price text-base font-bold text-text-primary bg-transparent w-16 focus:outline-none"
                />
                <span className="font-body-sm text-xs text-text-secondary">IST</span>
              </div>

              {/* AM/PM Switch */}
              <div className="flex items-center p-0.5 bg-surface-variant rounded-lg">
                <button
                  type="button"
                  onClick={() => setAmpm("AM")}
                  className={`px-3 py-1 rounded font-label-badge text-xs font-bold transition-all ${
                    ampm === "AM"
                      ? "bg-surface-dark text-on-primary shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => setAmpm("PM")}
                  className={`px-3 py-1 rounded font-label-badge text-xs font-bold transition-all ${
                    ampm === "PM"
                      ? "bg-surface-dark text-on-primary shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  PM
                </button>
              </div>
            </div>

            {/* Quick Preset Chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => handlePresetTime("06:00", "AM")}
                className="px-3 py-1.5 rounded-full bg-card-surface font-label-md text-xs text-text-primary border border-border-hairline hover:bg-surface transition-all select-none"
              >
                06:00 AM <span className="text-text-secondary font-normal">Early</span>
              </button>
              <button
                type="button"
                onClick={() => handlePresetTime("07:30", "AM")}
                className="px-3 py-1.5 rounded-full bg-surface-dark font-label-md text-xs text-on-primary transition-all select-none font-bold"
              >
                07:30 AM <span className="text-text-secondary font-normal">Recommended</span>
              </button>
              <button
                type="button"
                onClick={() => handlePresetTime("09:00", "AM")}
                className="px-3 py-1.5 rounded-full bg-card-surface font-label-md text-xs text-text-primary border border-border-hairline hover:bg-surface transition-all select-none"
              >
                09:00 AM <span className="text-text-secondary font-normal">Standard</span>
              </button>
              <button
                type="button"
                onClick={() => handlePresetTime("10:30", "PM")}
                className="px-3 py-1.5 rounded-full bg-card-surface font-label-md text-xs text-text-primary border border-border-hairline hover:bg-surface transition-all select-none"
              >
                10:30 PM <span className="text-text-secondary font-normal">Overnight</span>
              </button>
            </div>
          </section>

          {/* Section 5: Trip Purpose (Optional) */}
          <section className="bg-card-surface rounded-xl p-space-md shadow-sm border border-border-hairline flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <label
                htmlFor="trip-purpose-input"
                className="font-headline-sm text-sm font-bold text-text-primary"
              >
                Trip Purpose / Event Name
              </label>
              <span className="font-body-sm text-xs text-text-secondary">(Optional)</span>
            </div>

            <div className="relative">
              <input
                id="trip-purpose-input"
                type="text"
                value={tripPurpose}
                onChange={(e) => setTripPurpose(e.target.value)}
                placeholder="e.g. Engineering Offsite Q4 — Jaipur"
                className="w-full px-3.5 py-3 rounded-xl bg-card-surface font-body-md text-xs text-text-primary placeholder:text-text-secondary border border-border-hairline focus:outline-none focus:border-primary-container transition-colors"
              />
            </div>

            {/* Quick Suggestion Tags */}
            <div className="flex flex-wrap gap-2 pt-1">
              {["Annual Offsite", "Client Visit", "Executive Summit", "Team Building"].map(
                (tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleFillPurpose(tag)}
                    className="px-2.5 py-1 rounded-full bg-surface-container-low text-text-primary font-body-sm text-xs hover:bg-surface-variant transition-colors border border-border-hairline"
                  >
                    + {tag}
                  </button>
                )
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Sticky Bottom Floating Shelf */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-card-surface/95 backdrop-blur-xl px-margin-mobile pt-3 pb-safe shadow-[0_-4px_20px_rgba(20,21,26,0.06)] border-t border-border-hairline">
        <div className="max-w-md mx-auto flex flex-col gap-2.5 pb-2">
          {/* Progress Tracker */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-primary-container" />
              <span className="w-2 h-2 rounded-full bg-surface-variant" />
              <span className="w-2 h-2 rounded-full bg-surface-variant" />
            </div>
            <span className="font-body-sm text-xs text-text-secondary font-medium">
              Step 1 of 3: Fleet sizing &amp; scheduling
            </span>
          </div>

          {/* Primary CTA */}
          <button
            type="button"
            onClick={handleContinue}
            disabled={isSubmitting}
            className="w-full py-3.5 px-6 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-label-lg text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-2 active:scale-[0.99] transition-all shadow-md disabled:opacity-60 cursor-pointer"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving Setup...</span>
              </span>
            ) : (
              <>
                <span>Continue to Bus Selection</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>

          {/* Trust note */}
          <div className="flex items-center justify-center gap-1.5 text-center">
            <span className="material-symbols-outlined text-text-secondary text-[14px]">
              receipt_long
            </span>
            <span className="font-body-sm text-[11px] text-text-secondary">
              Corporate billing &amp; GST invoice generated on confirmation
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
