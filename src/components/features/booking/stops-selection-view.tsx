"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ValidatedDraftTrip } from "@/lib/data/booking-guards";
import type { Stop } from "@/lib/data/booking";
import { getStopImageUrl } from "@/lib/data/images";
import { formatCurrency } from "@/lib/format";
import { toggleTripStop } from "@/lib/actions/trips";
import { useRealtimeTableSync } from "@/lib/supabase/use-realtime-sync";

interface StopsSelectionViewProps {
  tripData: ValidatedDraftTrip;
  stops: Stop[];
}

export function StopsSelectionView({ tripData, stops }: StopsSelectionViewProps) {
  const router = useRouter();
  const { trip, stops: selectedTripStops, destination } = tripData;

  const realtimeTables = React.useMemo(() => ["stops"], []);
  useRealtimeTableSync(realtimeTables);

  const [selectedStopIds, setSelectedStopIds] = React.useState<Set<string>>(
    new Set(selectedTripStops.map((s) => s.stop_id))
  );
  const [togglingId, setTogglingId] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const driveHours = destination?.drive_hours ? Number(destination.drive_hours) : 6.5;
  const driveKm = destination?.drive_km ?? 270;
  const originLabel = destination?.origin_label ?? "Delhi NCR";

  const handleToggleStop = async (stopId: string) => {
    setTogglingId(stopId);
    setErrorMsg(null);
    try {
      const res = await toggleTripStop({
        tripId: trip.id,
        stopId,
      });

      if (res.ok) {
        setSelectedStopIds((prev) => {
          const next = new Set(prev);
          if (res.added) next.add(stopId);
          else next.delete(stopId);
          return next;
        });
      } else {
        setErrorMsg(res.error ?? "Failed to toggle stop.");
      }
    } catch {
      setErrorMsg("Network error updating stop.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleProceed = () => {
    setIsSubmitting(true);
    router.push(`/book/${trip.id}/review`);
  };

  return (
    <div className="bg-surface font-body-md text-text-primary min-h-screen flex flex-col antialiased">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(20,21,26,0.04)]">
        <div className="h-16 px-margin-mobile flex items-center justify-between gap-space-sm max-w-md mx-auto">
          <div className="flex items-center gap-space-sm">
            <button
              type="button"
              aria-label="Go Back"
              className="w-11 h-11 -ml-2 rounded-full flex items-center justify-center text-text-primary hover:bg-surface-container transition-colors active:scale-95"
              onClick={() => router.push(`/book/${trip.id}/vehicle`)}
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
              Rest Stop
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
        <div className="flex flex-col w-full max-w-md mx-auto px-margin-mobile pb-32">
          {/* Route Indicator Header */}
          <div className="pt-space-md pb-space-sm flex flex-col gap-1">
            <div className="flex items-center gap-space-xs text-text-secondary font-label-badge text-label-badge uppercase tracking-wider">
              <span className="inline-block w-2 h-2 rounded-full bg-urgency-amber" />
              {/* Header label Step 4 of 4 per DECISIONS D19 */}
              Step 4 of 4 • Long Drive Advisory
            </div>
            <div className="flex items-center justify-between">
              <p className="font-headline-sm text-headline-sm text-text-primary">
                {originLabel} → {destination?.name ?? "Jaipur"} Expedition
              </p>
              <span className="font-label-badge text-label-badge px-2 py-0.5 rounded-full bg-surface-container-highest text-text-primary font-semibold">
                {driveHours} hrs drive
              </span>
            </div>
          </div>

          {/* Route Visual Progress Line */}
          <div className="py-space-sm">
            <div className="w-full bg-surface-container-high rounded-full h-1.5 relative overflow-hidden">
              <div className="bg-primary-container h-1.5 rounded-full w-1/2" />
            </div>
            <div className="flex justify-between items-center text-text-secondary font-body-sm text-body-sm mt-1.5">
              <span>{originLabel.split(" ")[0]} (0 km)</span>
              <span className="font-label-badge text-label-badge text-primary-container flex items-center gap-0.5 font-semibold">
                <span className="material-symbols-outlined text-[14px]">bed</span>{" "}
                Halfway Rest Window
              </span>
              <span>
                {destination?.name ?? "Jaipur"} ({driveKm} km)
              </span>
            </div>
          </div>

          {/* Glassmorphic Callout Banner (when driveHours > 6 per FEATURES §4.4) */}
          {driveHours > 6 && (
            <section className="mt-space-sm mb-space-lg rounded-[20px] p-5 shadow-[0_4px_24px_rgba(20,21,26,0.08)] bg-white border border-border-hairline">
              <div className="flex items-start gap-space-md">
                <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center shrink-0 text-primary-container">
                  <span className="material-symbols-outlined text-[24px]">
                    local_cafe
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <h2 className="font-headline-sm text-headline-sm text-text-primary">
                    Break up your {driveHours} hr road journey
                  </h2>
                  <p className="font-body-md text-body-md text-text-secondary leading-relaxed">
                    Your total drive exceeds 6 hours. We recommend a verified rest stop or midway boutique stay halfway along NH48 to recharge before arriving in {destination?.name ?? "Jaipur"}.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Recommended Stays & Rest Stops Header */}
          <div className="flex items-center justify-between mb-space-md">
            <div>
              <h3 className="font-headline-sm text-headline-sm text-text-primary">
                Recommended Along Route
              </h3>
              <p className="font-body-sm text-body-sm text-text-secondary">
                Handpicked spots directly accessible from NH48
              </p>
            </div>
            <span className="font-label-badge text-label-badge bg-surface-container-high text-text-primary px-2.5 py-1 rounded-full font-semibold">
              {stops.length} Stops Verified
            </span>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-error-container/30 text-error text-xs font-semibold flex items-center gap-2 border border-error/20">
              <span className="material-symbols-outlined text-[16px]">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Cards Container */}
          <div className="flex flex-col gap-space-lg">
            {stops.map((stop) => {
              const isSelected = selectedStopIds.has(stop.id);
              const isBusy = togglingId === stop.id;
              const stopImg = getStopImageUrl(stop.name, stop.imagePath);

              return (
                <article
                  key={stop.id}
                  className={`bg-card-surface rounded-[16px] overflow-hidden flex flex-col border transition-all ${
                    isSelected
                      ? "ring-2 ring-primary-container border-transparent shadow-md"
                      : "border-border-hairline shadow-sm hover:shadow-md"
                  }`}
                >
                  <div className="relative w-full aspect-[4/3] bg-surface-container overflow-hidden">
                    <Image
                      src={stopImg}
                      alt={stop.name}
                      fill
                      priority
                      unoptimized
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 448px"
                    />
                    {stop.badge && (
                      <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-urgency-amber text-on-error font-label-badge text-label-badge flex items-center gap-1 shadow-sm uppercase font-semibold">
                        <span className="material-symbols-outlined text-[13px]">
                          local_fire_department
                        </span>
                        <span>{stop.badge}</span>
                      </div>
                    )}
                    {stop.turnaroundText && (
                      <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-surface-dark/75 backdrop-blur-[12px] text-white font-label-badge text-label-badge flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">
                          timer
                        </span>
                        <span>{stop.turnaroundText}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex flex-col gap-space-sm">
                    <div>
                      <h4 className="font-headline-sm text-headline-sm text-text-primary">
                        {stop.name}
                      </h4>
                      {stop.distanceText && (
                        <p className="font-body-sm text-body-sm text-text-secondary mt-0.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px] text-text-secondary">
                            directions_car
                          </span>
                          <span>{stop.distanceText} • Highway direct access</span>
                        </p>
                      )}
                    </div>

                    {/* Tags / Highlights */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {stop.amenities.map((amenity, idx) => (
                        <span
                          key={idx}
                          className="font-label-badge text-label-badge bg-surface-container-low text-text-secondary px-2 py-1 rounded-md flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[13px] text-success-green">
                            check_circle
                          </span>{" "}
                          {amenity}
                        </span>
                      ))}
                    </div>

                    <div className="h-px w-full bg-border-hairline my-1" />

                    {/* Bottom Shelf: Price + Action */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex flex-col">
                        <span className="font-body-sm text-body-sm text-text-secondary">
                          Day Pass from
                        </span>
                        <span className="font-numeral-price text-numeral-price text-text-primary">
                          {formatCurrency(stop.price)}{" "}
                          <span className="font-body-sm text-body-sm text-text-secondary font-normal">
                            {stop.pricingUnit === "per_person" ? "/ person" : "flat"}
                          </span>
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleToggleStop(stop.id)}
                        className={`px-5 py-2.5 rounded-[12px] font-label-lg text-label-lg active:scale-95 transition-all shadow-sm flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-success-green text-white font-bold"
                            : "bg-primary-container text-on-primary font-semibold hover:bg-primary"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {isSelected ? "check" : "add"}
                        </span>
                        <span>{isSelected ? "Added to Trip" : "Add Rest Stop"}</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Highway Note Banner */}
          <div className="mt-space-lg p-3.5 rounded-[12px] bg-surface-container-low flex items-center gap-3 border border-border-hairline/40">
            <span className="material-symbols-outlined text-text-secondary text-[20px] shrink-0">
              info
            </span>
            <p className="font-body-sm text-body-sm text-text-secondary">
              Rest stops automatically sync with your live route navigation and pre-reserve dedicated express vehicle parking.
            </p>
          </div>

          {/* Bottom Action Shelf */}
          <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-40 p-3 bg-white/95 backdrop-blur-[16px] rounded-[16px] flex items-center gap-3 shadow-[0_8px_32px_rgba(20,21,26,0.12)] border border-border-hairline">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleProceed()}
              className="flex-1 py-3.5 px-4 rounded-[12px] bg-surface text-text-secondary font-label-lg text-label-lg text-center active:bg-surface-container transition-colors border border-border-hairline"
            >
              Skip Rest Stop
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleProceed()}
              className="flex-[1.4] py-3.5 px-4 rounded-[12px] bg-primary-container hover:bg-primary text-on-primary font-label-lg text-label-lg text-center flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm"
            >
              <span>Continue to Review</span>
              <span className="material-symbols-outlined text-[18px]">
                arrow_forward
              </span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
