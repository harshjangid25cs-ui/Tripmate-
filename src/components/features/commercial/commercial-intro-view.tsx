"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CompanyMembershipInfo } from "@/lib/data/commercial-types";
import { createCommercialDraftAction } from "@/lib/actions/commercial";

interface CommercialIntroViewProps {
  membership: CompanyMembershipInfo | null;
}

const HERO_IMAGE_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC7sdCrw1CAzc8hF3PTdwYkZgwwHRRsKV1pBmZ9P-m0daXIs9v8sJ4t_WP8YZXMaeNhgESlM-WC3i03xuogve6IojBMjxfqK1cn2LUEBgYrdTCoLCMZBh39_k9RtMiLqCBJ68z1DWy-kwVTYxhsWyL3Gr_hPCpmhsQNBecvRXprVN7_rbBZfyYkm7pWuxXo9R3S--Hul7SPlvpjpFZkhI6uOAWd6H5v6As-KHt0V7qN";

export function CommercialIntroView({ membership }: CommercialIntroViewProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleStartBooking = async () => {
    setIsCreating(true);
    setErrorMessage(null);
    try {
      const res = await createCommercialDraftAction(membership?.company.id);
      if (res.ok && res.tripId) {
        router.push(`/commercial/${res.tripId}/setup`);
      } else {
        setErrorMessage(res.error || "Failed to initialize commercial booking.");
        setIsCreating(false);
      }
    } catch {
      setErrorMessage("Something went wrong while starting the commercial booking.");
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-surface font-body-md text-text-primary min-h-screen flex flex-col antialiased">
      {/* Top Header */}
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(20,21,26,0.04)]">
        <div className="h-16 px-margin-mobile flex items-center justify-between gap-space-sm max-w-md mx-auto">
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded-xl bg-primary-container flex items-center justify-center text-on-primary font-bold text-sm shadow-sm">
              M
            </div>
            <div className="flex flex-col justify-center">
              <span className="font-title-md text-title-md text-text-primary tracking-tight leading-none font-bold">
                Tripmate
              </span>
              <span className="font-label-md text-[11px] text-text-secondary leading-none mt-1">
                B2B Commercial Trip
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {membership?.company && (
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-surface-container text-[11px] font-semibold text-text-secondary">
                {membership.company.name}
              </span>
            )}
            <Link
              href="/profile"
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-sm"
              aria-label="Profile"
            >
              <span className="material-symbols-outlined text-[18px]">person</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-md mx-auto px-margin-mobile pt-20 pb-32">
        <div className="flex flex-col gap-space-lg">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-error/10 border border-error/20 text-xs text-error font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Membership Check — Non-Members Empty State */}
          {!membership ? (
            <div className="w-full bg-card-surface rounded-2xl p-6 border border-border-hairline shadow-sm flex flex-col items-center text-center gap-4 mt-4">
              <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-text-secondary">
                <span className="material-symbols-outlined text-[28px]">corporate_fare</span>
              </div>
              <div>
                <h2 className="font-headline-sm text-lg font-bold text-text-primary">
                  Enterprise Membership Required
                </h2>
                <p className="font-body-md text-xs text-text-secondary mt-1.5 leading-relaxed">
                  Your account is not currently affiliated with a verified corporate organization on Tripmate. Commercial charters require corporate membership for GST ITC billing and centralized compliance.
                </p>
              </div>
              <div className="w-full p-3.5 rounded-xl bg-surface-container-low text-[11px] text-text-secondary text-left flex flex-col gap-1">
                <span className="font-bold text-text-primary">Need corporate access?</span>
                <span>Contact your company travel desk to receive an invitation, or email us at enterprise@tripmate.io.</span>
              </div>
              <Link
                href="/home"
                className="w-full h-11 rounded-xl bg-surface-container hover:bg-surface-variant text-text-primary font-label-md text-xs font-semibold flex items-center justify-center transition-colors"
              >
                Browse Personal Trips
              </Link>
            </div>
          ) : (
            <>
              {/* Screen 17: Hero Banner Card */}
              <div className="relative w-full rounded-xl overflow-hidden shadow-sm bg-surface-dark">
                <div className="w-full aspect-[4/3] relative">
                  <Image
                    src={HERO_IMAGE_URL}
                    alt="Diverse corporate business team walking through airport terminal"
                    fill
                    className="object-cover opacity-80"
                    priority
                  />
                  {/* Flat dark scrim overlay */}
                  <div className="absolute inset-0 bg-surface-dark/55 flex flex-col justify-between p-space-md">
                    {/* Top Badge */}
                    <div className="flex items-center">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-dark/70 text-on-primary font-label-badge text-[11px] backdrop-blur-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
                        ENTERPRISE MOBILITY &amp; OFF-SITES
                      </span>
                    </div>
                    {/* Hero Copy */}
                    <div className="flex flex-col gap-1 text-on-primary">
                      <h1 className="font-headline-md text-xl font-bold leading-tight text-on-primary">
                        Commercial Trips, Made Simple
                      </h1>
                      <p className="font-body-md text-xs text-on-primary/90 leading-snug">
                        Book and manage group business travel for your company with total peace of mind.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Corporate Advantage Horizontal Scroll */}
              <div className="flex flex-col gap-space-sm">
                <div className="flex items-center justify-between">
                  <span className="font-title-md text-sm font-bold text-text-primary">
                    Corporate Advantage
                  </span>
                  <span className="font-label-md text-[11px] text-text-secondary">
                    Affiliated: {membership.company.name}
                  </span>
                </div>
                <div className="flex gap-space-sm overflow-x-auto pb-1 -mx-margin-mobile px-margin-mobile scrollbar-none snap-x snap-mandatory">
                  {/* Card 1 */}
                  <div className="snap-start min-w-[220px] max-w-[220px] bg-card-surface rounded-xl p-space-md flex flex-col gap-space-sm shadow-sm border border-border-hairline">
                    <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-text-primary">
                      <span className="material-symbols-outlined text-[20px]">apartment</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-title-md text-sm font-bold text-text-primary">
                        500+ Companies
                      </span>
                      <span className="font-body-sm text-[11px] text-text-secondary leading-snug">
                        Trust Tripmate for quarterly offsites and team travel.
                      </span>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="snap-start min-w-[220px] max-w-[220px] bg-card-surface rounded-xl p-space-md flex flex-col gap-space-sm shadow-sm border border-border-hairline">
                    <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-success-green">
                      <span className="material-symbols-outlined text-[20px]">trending_down</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-title-md text-sm font-bold text-text-primary">
                        Avg. 20% Savings
                      </span>
                      <span className="font-body-sm text-[11px] text-text-secondary leading-snug">
                        Volume corporate rates &amp; direct GST ITC credit pass-through.
                      </span>
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="snap-start min-w-[220px] max-w-[220px] bg-card-surface rounded-xl p-space-md flex flex-col gap-space-sm shadow-sm border border-border-hairline">
                    <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary-container">
                      <span className="material-symbols-outlined text-[20px]">support_agent</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-title-md text-sm font-bold text-text-primary">
                        24/7 Dedicated Desk
                      </span>
                      <span className="font-body-sm text-[11px] text-text-secondary leading-snug">
                        Assigned travel coordinator &amp; proactive fleet tracking.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* How It Works Section */}
              <div className="flex flex-col gap-space-sm">
                <div className="flex flex-col gap-0.5">
                  <h2 className="font-headline-sm text-base font-bold text-text-primary">
                    How it works
                  </h2>
                  <p className="font-body-sm text-xs text-text-secondary">
                    A seamless 3-step booking flow designed for group travel organizers
                  </p>
                </div>
                <div className="flex flex-col gap-2.5">
                  {/* Step 1 */}
                  <div className="bg-card-surface rounded-xl p-3.5 flex gap-3 items-start shadow-sm border border-border-hairline">
                    <div className="w-7 h-7 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-xs shrink-0">
                      1
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-title-md text-xs font-bold text-text-primary">
                        Set trip details
                      </span>
                      <span className="font-body-sm text-[11px] text-text-secondary leading-snug">
                        Choose travel dates, origin, destination, and passenger headcount.
                      </span>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="bg-card-surface rounded-xl p-3.5 flex gap-3 items-start shadow-sm border border-border-hairline">
                    <div className="w-7 h-7 rounded-full bg-surface-dark text-on-primary flex items-center justify-center font-bold text-xs shrink-0">
                      2
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-title-md text-xs font-bold text-text-primary">
                        Choose your bus &amp; fleet
                      </span>
                      <span className="font-body-sm text-[11px] text-text-secondary leading-snug">
                        Select luxury Volvo coaches, tempo travellers, or executive multi-car fleets.
                      </span>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="bg-card-surface rounded-xl p-3.5 flex gap-3 items-start shadow-sm border border-border-hairline">
                    <div className="w-7 h-7 rounded-full bg-surface-dark text-on-primary flex items-center justify-center font-bold text-xs shrink-0">
                      3
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-title-md text-xs font-bold text-text-primary">
                        Confirm &amp; share tickets
                      </span>
                      <span className="font-body-sm text-[11px] text-text-secondary leading-snug">
                        Generate automated itineraries, centralized GST invoices, and employee passes in one tap.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trust & Compliance Micro-Banner */}
              <div className="bg-surface-container-low rounded-xl p-3.5 flex items-center gap-3 border border-border-hairline shadow-sm">
                <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-text-primary shrink-0">
                  <span className="material-symbols-outlined text-[18px]">verified_user</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-lg text-xs font-bold text-text-primary">
                    100% GST ITC Compliant
                  </span>
                  <span className="font-body-sm text-[11px] text-text-secondary">
                    Centralized enterprise invoicing ({membership.company.gst_number || "Verified"}) &amp; certified operators
                  </span>
                </div>
              </div>

              {/* Bottom Actions Area */}
              <div className="flex flex-col gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleStartBooking}
                  disabled={isCreating}
                  className="w-full h-12 bg-primary-container active:bg-primary hover:opacity-95 text-on-primary rounded-xl font-label-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-60"
                >
                  {isCreating ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating Booking...</span>
                    </span>
                  ) : (
                    <>
                      <span>Start New Commercial Booking</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </>
                  )}
                </button>

                <Link
                  href="/trips?kind=commercial"
                  className="w-full py-2.5 text-center font-label-lg text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                  View Past Bookings
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
