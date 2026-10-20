"use client";

import * as React from "react";
import { CatalogImage } from "@/components/ui/CatalogImage";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { UserTripSummary } from "@/lib/data/trips-list";
import { cancelTripBooking } from "@/lib/actions/trips";
import { formatCurrency, formatDateRange } from "@/lib/format";
import { getHotelImageUrl } from "@/lib/data/images";
import { useRealtimeTableSync } from "@/lib/supabase/use-realtime-sync";

interface RecentTripsViewProps {
  initialTrips: UserTripSummary[];
}

export function RecentTripsView({ initialTrips }: RecentTripsViewProps) {
  const searchParams = useSearchParams();
  const [trips, setTrips] = React.useState<UserTripSummary[]>(initialTrips);

  // Sync state whenever server re-renders fresh initialTrips
  React.useEffect(() => {
    setTrips(initialTrips);
  }, [initialTrips]);

  // Realtime subscription for immediate cross-screen status changes
  const realtimeTables = React.useMemo(() => ["trips", "trip_vehicles"], []);
  useRealtimeTableSync(realtimeTables);

  // Filter state: All, Upcoming, Completed, Cancelled (DECISIONS D17)
  const [statusFilter, setStatusFilter] = React.useState<"all" | "upcoming" | "completed" | "cancelled">("all");

  // Kind filter: all vs commercial (DECISIONS D16 / FLOWS.md)
  const initialKind = searchParams.get("kind") === "commercial" ? "commercial" : "all";
  const [kindFilter, setKindFilter] = React.useState<"all" | "commercial">(initialKind);

  // Cancellation Modal state
  const [cancellingTrip, setCancellingTrip] = React.useState<UserTripSummary | null>(null);
  const [cancelReason, setCancelReason] = React.useState("Change of travel dates");
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [cancelToast, setCancelToast] = React.useState<string | null>(null);

  // Auto-open cancel modal if ?cancel=[tripId] is in URL
  React.useEffect(() => {
    const cancelId = searchParams.get("cancel");
    if (cancelId) {
      const match = trips.find((t) => t.id === cancelId);
      if (match && match.canCancel) {
        setCancellingTrip(match);
      }
    }
  }, [searchParams, trips]);

  // Filtered trips
  const filteredTrips = trips.filter((t) => {
    // Kind filter
    if (kindFilter === "commercial" && t.bookingKind !== "commercial") return false;

    // Status filter
    if (statusFilter === "all") return true;
    if (statusFilter === "upcoming") return t.derivedStatus === "Upcoming" || t.derivedStatus === "Ongoing";
    if (statusFilter === "completed") return t.derivedStatus === "Completed";
    if (statusFilter === "cancelled") return t.derivedStatus === "Cancelled";
    return true;
  });

  // Counts for filter pills
  const counts = {
    all: trips.filter((t) => (kindFilter === "commercial" ? t.bookingKind === "commercial" : true)).length,
    upcoming: trips.filter(
      (t) =>
        (kindFilter === "commercial" ? t.bookingKind === "commercial" : true) &&
        (t.derivedStatus === "Upcoming" || t.derivedStatus === "Ongoing")
    ).length,
    completed: trips.filter(
      (t) =>
        (kindFilter === "commercial" ? t.bookingKind === "commercial" : true) &&
        t.derivedStatus === "Completed"
    ).length,
    cancelled: trips.filter(
      (t) =>
        (kindFilter === "commercial" ? t.bookingKind === "commercial" : true) &&
        t.derivedStatus === "Cancelled"
    ).length,
  };

  const handleConfirmCancellation = async () => {
    if (!cancellingTrip) return;
    setIsCancelling(true);

    try {
      const res = await cancelTripBooking({
        tripId: cancellingTrip.id,
        reason: cancelReason,
      });

      if (!res.ok) {
        setCancelToast(res.error ?? "Failed to cancel booking.");
        setIsCancelling(false);
        return;
      }

      const refund = res.refundAmount ?? 0;
      // Update local state to reflect cancellation immediately
      setTrips((prev) =>
        prev.map((t) =>
          t.id === cancellingTrip.id
            ? {
                ...t,
                status: "cancelled",
                derivedStatus: "Cancelled",
                canCancel: false,
                refundAmount: refund,
                cancellationReason: cancelReason,
              }
            : t
        )
      );

      setCancelToast(
        refund > 0
          ? `Booking cancelled. 100% refund of ${formatCurrency(refund)} has been processed.`
          : "Booking cancelled. Non-refundable per 48-hour policy."
      );
      setCancellingTrip(null);
    } catch {
      setCancelToast("Network error cancelling booking.");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="bg-surface font-body-md text-text-primary min-h-screen flex flex-col antialiased">
      {/* Top App Header */}
      <header className="fixed top-0 w-full z-40 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(20,21,26,0.04)]">
        <div className="h-16 px-margin-mobile flex items-center justify-between gap-space-sm max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-container text-on-primary font-bold text-base flex items-center justify-center shadow-sm">
              M
            </div>
            <div>
              <span className="font-headline-sm text-base font-extrabold tracking-tight text-text-primary block leading-none">
                Tripmate
              </span>
              <span className="font-label-sm text-[11px] text-text-secondary">
                Recent Trips
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-text-primary hover:bg-surface-container-high transition-colors"
              aria-label="View Profile"
            >
              <span className="material-symbols-outlined text-[20px]">person</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-md mx-auto w-full px-margin-mobile pt-20 pb-28">
        <div className="flex flex-col gap-space-md">
          {/* Section Heading & Subtitle */}
          <div className="pt-2">
            <div className="flex items-center justify-between">
              <h1 className="font-headline-sm text-xl font-bold text-text-primary">
                My Trips
              </h1>
              {kindFilter === "commercial" && (
                <button
                  type="button"
                  onClick={() => setKindFilter("all")}
                  className="text-xs font-semibold text-primary-container hover:underline"
                >
                  Show All Trips
                </button>
              )}
            </div>
            <p className="font-body-sm text-xs text-text-secondary mt-0.5 leading-relaxed">
              Keep track of your past adventures and upcoming booked itineraries.
            </p>
          </div>

          {/* Toast Notification */}
          {cancelToast && (
            <div className="p-3 rounded-xl bg-primary-container/10 border border-primary-container/20 text-xs text-primary-container font-medium flex items-center justify-between gap-2 animate-in fade-in">
              <span>{cancelToast}</span>
              <button
                type="button"
                onClick={() => setCancelToast(null)}
                className="font-bold hover:underline"
              >
                ✕
              </button>
            </div>
          )}

          {/* Filter Chips per DECISIONS D17 */}
          <div className="-mx-margin-mobile px-margin-mobile overflow-x-auto no-scrollbar py-1">
            <div className="flex items-center gap-2 w-max">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`min-h-[38px] px-4 py-2 rounded-full font-label-md text-xs font-semibold transition-all ${
                  statusFilter === "all"
                    ? "bg-primary-container text-on-primary shadow-sm"
                    : "bg-card-surface text-text-secondary hover:bg-surface-container border border-border-hairline"
                }`}
              >
                All Trips ({counts.all})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("upcoming")}
                className={`min-h-[38px] px-4 py-2 rounded-full font-label-md text-xs font-semibold transition-all ${
                  statusFilter === "upcoming"
                    ? "bg-primary-container text-on-primary shadow-sm"
                    : "bg-card-surface text-text-secondary hover:bg-surface-container border border-border-hairline"
                }`}
              >
                Upcoming ({counts.upcoming})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("completed")}
                className={`min-h-[38px] px-4 py-2 rounded-full font-label-md text-xs font-semibold transition-all ${
                  statusFilter === "completed"
                    ? "bg-primary-container text-on-primary shadow-sm"
                    : "bg-card-surface text-text-secondary hover:bg-surface-container border border-border-hairline"
                }`}
              >
                Completed ({counts.completed})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("cancelled")}
                className={`min-h-[38px] px-4 py-2 rounded-full font-label-md text-xs font-semibold transition-all ${
                  statusFilter === "cancelled"
                    ? "bg-primary-container text-on-primary shadow-sm"
                    : "bg-card-surface text-text-secondary hover:bg-surface-container border border-border-hairline"
                }`}
              >
                Cancelled ({counts.cancelled})
              </button>
            </div>
          </div>

          {/* Trip Cards List */}
          {filteredTrips.length === 0 ? (
            /* Empty State */
            <div className="bg-card-surface rounded-2xl p-8 border border-border-hairline text-center flex flex-col items-center gap-3 my-4">
              <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-text-secondary">
                <span className="material-symbols-outlined text-[30px]">luggage</span>
              </div>
              <div>
                <h3 className="font-title-md text-base font-bold text-text-primary">
                  No trips found
                </h3>
                <p className="font-body-sm text-xs text-text-secondary mt-1 max-w-xs">
                  You have no trips under the &quot;{statusFilter}&quot; filter category yet.
                </p>
              </div>
              <Link
                href="/home"
                className="mt-2 py-2.5 px-5 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-label-md text-xs font-bold active:scale-95 transition-all shadow-sm"
              >
                Plan a New Journey
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredTrips.map((t) => {
                const datesText =
                  t.startDate && t.endDate
                    ? `${formatDateRange(t.startDate, t.endDate)} • ${t.totalDays} Days / ${t.nights} Nights`
                    : `${t.totalDays} Days Trip`;

                return (
                  <article
                    key={t.id}
                    className="bg-card-surface rounded-2xl overflow-hidden border border-border-hairline shadow-sm flex flex-col"
                  >
                    {/* Card Cover Image with Status Overlay */}
                    <div className="relative h-44 w-full bg-surface-container">
                      <CatalogImage
                        src={getHotelImageUrl(t.destinationSlug)}
                        alt={t.title}
                        fill
                        className="object-cover"
                      />
                      {/* Solid overlay adhering to zero gradient rule */}
                      <div className="absolute inset-0 bg-black/40" />

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-full font-label-badge text-[11px] font-bold uppercase tracking-wider ${
                            t.derivedStatus === "Upcoming"
                              ? "bg-amber-500 text-white"
                              : t.derivedStatus === "Ongoing"
                              ? "bg-primary-container text-white"
                              : t.derivedStatus === "Cancelled"
                              ? "bg-error text-white"
                              : "bg-success-green text-white"
                          }`}
                        >
                          {t.derivedStatus === "Upcoming" && "● "}
                          {t.derivedStatus}
                        </span>

                        {t.daysRemainingText && (
                          <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[11px] font-bold">
                            {t.daysRemainingText}
                          </span>
                        )}

                        {t.derivedStatus === "Cancelled" && t.refundAmount !== null && (
                          <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[11px] font-bold">
                            {t.refundAmount > 0 ? "100% Refunded" : "0% Refund"}
                          </span>
                        )}
                      </div>

                      {/* Bottom Image Metadata */}
                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <span className="text-[11px] font-medium text-white/90 block">
                          {datesText}
                        </span>
                        <h2 className="font-title-md text-base font-bold text-white mt-0.5 truncate">
                          {t.title}
                        </h2>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 flex flex-col gap-3">
                      {/* Inclusion Pills */}
                      <div className="flex flex-wrap gap-1.5">
                        {t.inclusions.map((inc, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-surface-container text-text-secondary text-[11px] font-medium"
                          >
                            {inc}
                          </span>
                        ))}
                      </div>

                      {/* Price & Booking Reference Row */}
                      <div className="flex items-center justify-between pt-2 border-t border-border-hairline/80 text-xs">
                        <div>
                          <span className="text-text-secondary text-[10px] uppercase font-semibold block">
                            {t.derivedStatus === "Completed" ? "Paid in Full" : "Total Package"}
                          </span>
                          <span className="font-bold text-sm text-text-primary">
                            {formatCurrency(t.totalAmount)}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-text-secondary">
                          #{t.bookingRef}
                        </span>
                      </div>

                      {/* Actions Strip */}
                      <div className="flex items-center gap-2 pt-1">
                        <Link
                          href={`/trips/${t.id}`}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-label-md text-xs font-semibold text-center active:scale-[0.98] transition-all shadow-sm"
                        >
                          {t.derivedStatus === "Completed" ? "View Details" : "Manage Itinerary"}
                        </Link>

                        <Link
                          href={`/trips/${t.id}/invoice`}
                          className="py-2.5 px-3 rounded-xl bg-surface hover:bg-surface-container text-text-primary border border-border-hairline font-label-md text-xs font-semibold flex items-center justify-center gap-1 active:scale-[0.98] transition-all"
                          title="View Invoice"
                        >
                          <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                        </Link>

                        {/* Cancel Button if cancellable (D8) */}
                        {t.canCancel && (
                          <button
                            type="button"
                            onClick={() => setCancellingTrip(t)}
                            className="py-2.5 px-3 rounded-xl bg-error/10 hover:bg-error/20 text-error font-label-md text-xs font-semibold active:scale-[0.98] transition-all"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Travel Memories Card per Screen 15 */}
          <section className="bg-card-surface rounded-2xl p-4 border border-border-hairline shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary-container text-on-secondary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">auto_stories</span>
              </div>
              <div>
                <h3 className="font-title-sm text-xs font-bold text-text-primary">
                  Travel Memories
                </h3>
                <p className="font-body-sm text-[11px] text-text-secondary">
                  Download PDF memory book of your trips
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => alert("Travel memory book generated! Ready for download.")}
              className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-text-primary transition-colors shrink-0"
              aria-label="Download travel memories"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
            </button>
          </section>
        </div>
      </main>

      {/* Cancellation Modal with 48-Hour Refund Preview (DECISIONS D8) */}
      {cancellingTrip && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 border border-border-hairline shadow-xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-title-lg text-lg font-bold text-text-primary">
                  Cancel Booking
                </h3>
                <p className="font-body-sm text-xs text-text-secondary mt-0.5">
                  Ref: #{cancellingTrip.bookingRef} • {cancellingTrip.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCancellingTrip(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-text-secondary hover:text-text-primary"
              >
                ✕
              </button>
            </div>

            {/* 48-Hour Refund Policy Evaluation Card */}
            <div
              className={`p-3.5 rounded-xl border flex flex-col gap-1.5 ${
                cancellingTrip.isFullRefundEligible
                  ? "bg-success-green/10 border-success-green/30 text-success-green"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-label-md text-xs font-bold uppercase tracking-wider">
                  {cancellingTrip.isFullRefundEligible
                    ? "Eligible for 100% Full Refund"
                    : "0% Refund (Inside 48h Window)"}
                </span>
                <span className="font-headline-sm text-base font-bold">
                  {cancellingTrip.isFullRefundEligible
                    ? formatCurrency(cancellingTrip.totalAmount)
                    : formatCurrency(0)}
                </span>
              </div>
              <p className="font-body-sm text-[11px] leading-relaxed">
                {cancellingTrip.isFullRefundEligible
                  ? "Your departure is more than 48 hours away. Full amount will be credited back via demo payment provider."
                  : "Cancellations made within 48 hours of journey departure are non-refundable per TripMate policy (DECISIONS D8)."}
              </p>
            </div>

            {/* Reason Selector */}
            <div>
              <label className="font-label-sm text-xs font-semibold text-text-primary block mb-1.5">
                Reason for Cancellation
              </label>
              <div className="flex flex-col gap-1.5">
                {[
                  "Change of travel dates",
                  "Personal / family emergency",
                  "Transport or weather delay",
                  "Found alternative itinerary",
                  "Other reason",
                ].map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      cancelReason === reason
                        ? "bg-primary-container/5 border-primary-container font-semibold text-text-primary"
                        : "border-border-hairline text-text-secondary hover:bg-surface-container"
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancel_reason"
                      value={reason}
                      checked={cancelReason === reason}
                      onChange={() => setCancelReason(reason)}
                      className="text-primary-container accent-primary-container"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-border-hairline">
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setCancellingTrip(null)}
                className="flex-1 py-3 rounded-xl bg-surface hover:bg-surface-container border border-border-hairline font-label-md text-xs font-semibold text-text-secondary"
              >
                Keep My Booking
              </button>

              <button
                type="button"
                disabled={isCancelling}
                onClick={handleConfirmCancellation}
                className="flex-1 py-3 rounded-xl bg-error hover:bg-error/90 text-white font-label-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
              >
                {isCancelling ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">
                      progress_activity
                    </span>
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Confirm Cancellation</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
