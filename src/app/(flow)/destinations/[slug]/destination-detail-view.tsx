"use client";

import * as React from "react";
import Link from "next/link";
import { CatalogImage } from "@/components/ui/CatalogImage";
import { useRouter } from "next/navigation";
import type { Destination, DestinationHighlight } from "@/lib/data/destinations";
import { getDestinationImageUrl, getHighlightImageUrl } from "@/lib/data/images";
import { formatCurrency } from "@/lib/format";
import { toggleSavedItem } from "@/lib/data/saved-items";
import { createNormalTripDraft } from "@/lib/actions/trips";
import { LocationCoverageScopeBar } from "@/components/features/booking/LocationCoverageScopeBar";

interface DestinationDetailViewProps {
  destination: Destination;
  highlights: DestinationHighlight[];
}

export function DestinationDetailView({
  destination,
  highlights,
}: DestinationDetailViewProps) {
  const router = useRouter();
  const [isBookmarked, setIsBookmarked] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [groupType, setGroupType] = React.useState<"Solo" | "Family" | "Other">("Solo");
  const [showGroupChooser, setShowGroupChooser] = React.useState(false);
  const [isCreatingDraft, setIsCreatingDraft] = React.useState(false);
  const [draftError, setDraftError] = React.useState<string | null>(null);

  const heroImage = getDestinationImageUrl(destination.slug, destination.heroImagePath);

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${destination.name} - ${destination.tagline} on Tripmate`,
          text: `Check out this curated road trip package to ${destination.name}, ${destination.region}.`,
          url: window.location.href,
        });
      } catch {
        // Share cancelled or failed
      }
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleBookmarkToggle = async () => {
    setIsBookmarked((prev) => !prev);
    await toggleSavedItem("destination", destination.id);
  };

  const handleStartTrip = () => {
    if (!destination.isBookable) return;
    // For M3/M4 transition: open group selector or proceed
    setShowGroupChooser(true);
  };

  return (
    <div className="min-h-screen bg-surface font-sans text-text-primary antialiased selection:bg-primary-container selection:text-white flex flex-col items-center">
      {/* Top Header */}
      <header className="fixed top-0 w-full z-40 bg-surface/85 backdrop-blur-xl border-b border-border-hairline">
        <div className="h-16 px-4 max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Go back"
              onClick={() => router.back()}
              className="w-10 h-10 -ml-1 flex items-center justify-center text-text-primary hover:text-primary transition-colors rounded-full"
            >
              <span className="material-symbols-outlined text-[24px]">
                arrow_back
              </span>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary-container flex items-center justify-center text-on-primary font-bold text-sm">
                M
              </div>
              <h1 className="font-headline-sm text-sm text-text-primary font-bold tracking-tight truncate max-w-[170px]">
                Trip Itinerary Detail
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Share trip"
              onClick={handleShare}
              className="w-10 h-10 flex items-center justify-center text-text-secondary hover:text-text-primary rounded-full transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">
                {copiedLink ? "check" : "share"}
              </span>
            </button>
            <Link
              href="/profile"
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary"
              aria-label="View Profile"
            >
              <span className="material-symbols-outlined text-[18px]">
                person
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Scroll Content */}
      <main className="w-full max-w-md mx-auto pt-16 pb-28 flex flex-col">
        {/* Hero Section */}
        <div className="relative w-full aspect-[4/3] bg-surface-container overflow-hidden">
          <CatalogImage
            src={heroImage}
            alt={`${destination.name} - ${destination.tagline}`}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 448px"
          />
          <div className="absolute inset-0 bg-surface-dark/20 pointer-events-none" />

          {/* Top-Left Explore Pill */}
          <div className="absolute top-4 left-4 z-10">
            <button
              type="button"
              aria-label="Explore more"
              onClick={() => router.push("/home")}
              className="h-10 px-3.5 rounded-full flex items-center justify-center gap-1.5 bg-surface-dark/65 backdrop-blur-md text-on-primary border border-white/10 active:scale-95 transition-transform shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">
                arrow_back
              </span>
              <span className="font-label-md text-xs font-semibold">Explore</span>
            </button>
          </div>

          {/* Top-Right Action Pills */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <button
              type="button"
              aria-label="Share destination"
              onClick={handleShare}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-dark/65 backdrop-blur-md text-on-primary border border-white/10 active:scale-95 transition-transform shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">
                {copiedLink ? "check" : "share"}
              </span>
            </button>
            <button
              type="button"
              aria-label="Bookmark destination"
              onClick={handleBookmarkToggle}
              className={`w-10 h-10 rounded-full flex items-center justify-center bg-surface-dark/65 backdrop-blur-md border border-white/10 active:scale-95 transition-transform shadow-sm ${
                isBookmarked ? "text-primary-container" : "text-on-primary"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {isBookmarked ? "bookmark" : "bookmark_border"}
              </span>
            </button>
          </div>

          {/* Bottom-Left Urgency Badge */}
          {destination.badge && (
            <div className="absolute bottom-3 left-4">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-urgency-amber text-on-primary font-label-badge text-xs font-bold shadow-sm">
                <span className="material-symbols-outlined text-[14px]">
                  local_fire_department
                </span>
                <span>{destination.badge}</span>
              </span>
            </div>
          )}
        </div>

        {/* Destination Title & Highlights */}
        <div className="px-4 pt-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-lg text-2xl font-extrabold text-text-primary tracking-tight">
              {destination.name}, {destination.region}
            </h2>
            <span className="inline-flex items-center gap-1 text-success-green font-label-badge text-[11px] font-bold bg-surface-container-low px-2 py-1 rounded-full border border-border-hairline">
              <span className="material-symbols-outlined text-[14px]">
                verified
              </span>
              <span>Tripmate Verified</span>
            </span>
          </div>

          <p className="font-body-md text-sm text-text-secondary leading-relaxed">
            {destination.description}
          </p>

          {/* Quick Metrics Strip (Horizontal Scroll) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card-surface border border-border-hairline rounded-full flex-shrink-0">
              <span className="material-symbols-outlined text-[16px] text-urgency-amber">
                star
              </span>
              <span className="font-label-md text-xs font-bold text-text-primary">
                {destination.rating}
              </span>
              <span className="font-body-sm text-[11px] text-text-secondary">
                ({destination.reviewCount > 1000 ? `${(destination.reviewCount / 1000).toFixed(1)}k` : destination.reviewCount})
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card-surface border border-border-hairline rounded-full flex-shrink-0">
              <span className="material-symbols-outlined text-[16px] text-text-secondary">
                calendar_today
              </span>
              <span className="font-label-md text-xs font-semibold text-text-primary">
                {destination.recommendedDays}
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card-surface border border-border-hairline rounded-full flex-shrink-0">
              <span className="material-symbols-outlined text-[16px] text-text-secondary">
                wb_sunny
              </span>
              <span className="font-label-md text-xs font-semibold text-text-primary">
                {destination.bestSeason}
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card-surface border border-border-hairline rounded-full flex-shrink-0">
              <span className="material-symbols-outlined text-[16px] text-text-secondary">
                near_me
              </span>
              <span className="font-label-md text-xs font-semibold text-text-primary">
                {destination.driveKm} km • {destination.driveHours}h
              </span>
            </div>
          </div>
        </div>

        {/* Location & Coverage Scope Bar */}
        <div className="w-full px-4 pt-1">
          <LocationCoverageScopeBar
            destinationName={destination.name}
            destinationLat={destination.latitude ? Number(destination.latitude) : 26.9124}
            destinationLng={destination.longitude ? Number(destination.longitude) : 75.7873}
            initialTransitMode="local_only"
            initialOriginName="Local City Scope"
            initialCalculatedKm={0}
          />
        </div>

        {/* Things to see & experience carousel */}
        <div className="mt-5 flex flex-col">
          <div className="px-4 flex items-center justify-between mb-3">
            <h3 className="font-headline-sm text-base font-bold text-text-primary">
              Things to see &amp; experience
            </h3>
            <span className="font-label-md text-xs text-text-secondary">
              {highlights.length} highlights
            </span>
          </div>

          <div className="flex gap-3 overflow-x-auto px-4 no-scrollbar pb-2">
            {highlights.map((h) => {
              const hImage = getHighlightImageUrl(h.sortOrder);
              return (
                <div
                  key={h.id}
                  className="w-[72%] max-w-[280px] flex-shrink-0 bg-card-surface rounded-2xl border border-border-hairline overflow-hidden flex flex-col shadow-sm"
                >
                  <div className="relative w-full aspect-[4/3] bg-surface-container">
                    <CatalogImage
                      src={hImage}
                      alt={h.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 72vw, 280px"
                    />
                    {h.badge && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-surface-dark/70 backdrop-blur-sm text-on-primary font-label-badge text-[10px] font-bold">
                        {h.badge}
                      </span>
                    )}
                  </div>
                  <div className="p-3.5 flex flex-col justify-between flex-1">
                    <div>
                      <h4 className="font-title-md text-sm font-bold text-text-primary line-clamp-1">
                        {h.title}
                      </h4>
                      <p className="font-body-sm text-xs text-text-secondary mt-1">
                        {h.category} • {h.durationText}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-border-hairline">
                      <span className="font-label-badge text-[10px] text-text-secondary uppercase font-semibold">
                        Verified halt
                      </span>
                      <span className="material-symbols-outlined text-[18px] text-text-primary">
                        arrow_forward
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Typical Trip Composition */}
        <div className="px-4 mt-6 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-sm text-base font-bold text-text-primary">
              Typical Trip Composition
            </h3>
            <span className="font-label-badge text-[10px] text-primary-container bg-primary-fixed px-2 py-0.5 rounded-full font-bold">
              Included In Package
            </span>
          </div>

          <div className="bg-card-surface rounded-2xl border border-border-hairline p-4 flex flex-col gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center flex-shrink-0 text-text-primary">
                <span className="material-symbols-outlined text-[20px]">villa</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-title-md text-sm font-bold text-text-primary truncate">
                  Heritage Haveli Stay
                </p>
                <p className="font-body-sm text-xs text-text-secondary truncate">
                  Traditional courtyards, breakfast included
                </p>
              </div>
              <span className="material-symbols-outlined text-success-green text-[20px]">
                check_circle
              </span>
            </div>

            <div className="h-px bg-border-hairline w-full" />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center flex-shrink-0 text-text-primary">
                <span className="material-symbols-outlined text-[20px]">
                  directions_car
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-title-md text-sm font-bold text-text-primary truncate">
                  Dedicated Cab / Rental
                </p>
                <p className="font-body-sm text-xs text-text-secondary truncate">
                  Private AC sedan with local certified chauffeur
                </p>
              </div>
              <span className="material-symbols-outlined text-success-green text-[20px]">
                check_circle
              </span>
            </div>

            <div className="h-px bg-border-hairline w-full" />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center flex-shrink-0 text-text-primary">
                <span className="material-symbols-outlined text-[20px]">
                  restaurant
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-title-md text-sm font-bold text-text-primary truncate">
                  Curated Dhaba &amp; Fort Rest Stops
                </p>
                <p className="font-body-sm text-xs text-text-secondary truncate">
                  Authentic meal voucher at verified clean highway halts
                </p>
              </div>
              <span className="font-label-badge text-[10px] text-text-secondary bg-surface-container px-2 py-0.5 rounded-full font-bold">
                Optional
              </span>
            </div>
          </div>
        </div>

        {/* Tripmate Guarantee Card */}
        <div className="px-4 mt-5">
          <div className="rounded-2xl bg-surface-container border border-border-hairline p-4 flex items-center gap-3 shadow-sm">
            <span className="material-symbols-outlined text-primary-container text-[24px]">
              verified_user
            </span>
            <div className="flex flex-col">
              <span className="font-title-md text-sm font-bold text-text-primary">
                Tripmate Guarantee
              </span>
              <span className="font-body-sm text-xs text-text-secondary">
                Free cancellation up to 48 hours prior to departure date.
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 w-full max-w-md mx-auto bg-card-surface/90 backdrop-blur-xl border-t border-border-hairline p-4 shadow-[0_-4px_24px_rgba(20,21,26,0.06)]">
        <div className="w-full flex items-center justify-between gap-3">
          <div className="flex flex-col flex-shrink-0">
            <span className="font-body-sm text-[11px] text-text-secondary">
              Starting from
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-numeral-price text-lg font-bold text-text-primary">
                {formatCurrency(destination.startingPrice)}
              </span>
              <span className="font-body-sm text-xs text-text-secondary">
                / person
              </span>
            </div>
          </div>

          {destination.isBookable ? (
            <button
              type="button"
              id="planTripBtn"
              onClick={handleStartTrip}
              className="flex-1 min-w-0 h-12 bg-primary-container hover:bg-primary active:scale-[0.98] text-on-primary font-label-lg text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm px-3"
            >
              <span className="truncate">Plan This Trip</span>
              <span className="material-symbols-outlined text-[18px] flex-shrink-0">
                east
              </span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="flex-1 min-w-0 h-12 bg-surface-container text-text-secondary font-label-lg text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed px-3"
            >
              <span>Coming soon</span>
              <span className="material-symbols-outlined text-[18px]">
                schedule
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Group Type Selector Modal (FEATURES §3) */}
      {showGroupChooser && (
        <div className="fixed inset-0 z-50 bg-surface-dark/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-card-surface rounded-3xl border border-border-hairline p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-headline-sm text-base font-bold text-text-primary">
                  Choose Group Type
                </h3>
                <p className="font-body-sm text-xs text-text-secondary mt-0.5">
                  Who are you travelling with?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGroupChooser(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-text-secondary hover:text-text-primary"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(["Solo", "Family", "Other"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setGroupType(type)}
                  className={`py-3 px-2 rounded-2xl flex flex-col items-center gap-1.5 border text-xs font-bold transition-all ${
                    groupType === type
                      ? "bg-primary-container text-on-primary border-primary-container shadow-sm"
                      : "bg-surface-container-low border-border-hairline text-text-primary hover:bg-surface-container"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {type === "Solo" ? "person" : type === "Family" ? "group" : "diversity_3"}
                  </span>
                  <span>{type}</span>
                </button>
              ))}
            </div>

            {draftError && (
              <div className="p-3 rounded-xl bg-error-container/30 text-xs text-error font-medium border border-error/20 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{draftError}</span>
              </div>
            )}

            <button
              type="button"
              disabled={isCreatingDraft}
              onClick={async () => {
                setIsCreatingDraft(true);
                setDraftError(null);
                const res = await createNormalTripDraft({
                  destinationId: destination.id,
                  groupType: groupType.toLowerCase() as "solo" | "family" | "other",
                });
                if (res.ok && res.tripId) {
                  router.push(`/book/${res.tripId}/duration`);
                } else {
                  setDraftError(res.error ?? "Failed to initialize trip.");
                  setIsCreatingDraft(false);
                }
              }}
              className="w-full h-11 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-label-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
            >
              {isCreatingDraft ? (
                <>
                  <span className="material-symbols-outlined text-base animate-spin">
                    progress_activity
                  </span>
                  <span>Initializing Trip...</span>
                </>
              ) : (
                <>
                  <span>Continue to Dates</span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
