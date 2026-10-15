"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ONBOARDING_COOKIE_NAME } from "@/lib/auth-guard";

export default function SplashScreen() {
  const router = useRouter();
  const [progressWidth, setProgressWidth] = React.useState("0%");

  const handleNavigate = React.useCallback(() => {
    // Check if onboarding was already completed
    const hasCompletedOnboarding =
      typeof document !== "undefined" &&
      document.cookie
        .split("; ")
        .some((item) => item.startsWith(`${ONBOARDING_COOKIE_NAME}=true`));

    if (hasCompletedOnboarding) {
      router.replace("/login");
    } else {
      router.replace("/onboarding");
    }
  }, [router]);

  React.useEffect(() => {
    // Smooth progress bar animations
    const t1 = setTimeout(() => {
      setProgressWidth("65%");
    }, 150);

    const t2 = setTimeout(() => {
      setProgressWidth("100%");
    }, 850);

    const t3 = setTimeout(() => {
      handleNavigate();
    }, 1400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [handleNavigate]);

  return (
    <main
      onClick={handleNavigate}
      className="w-full min-h-screen bg-surface-dark text-on-primary flex flex-col justify-between select-none overflow-hidden cursor-pointer relative"
    >
      {/* Ambient micro-grid metadata */}
      <header className="w-full flex justify-between items-center px-6 pt-6 text-text-secondary z-10">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse" />
          <span className="font-label-badge text-label-badge tracking-widest uppercase text-surface-variant/70">
            SYS.READY
          </span>
        </div>
        <span className="font-label-badge text-label-badge tracking-widest text-surface-variant/60">
          V2.4
        </span>
      </header>

      {/* Central Brand Emblem & Identity */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 z-10">
        <div className="flex flex-col items-center text-center transform transition-all duration-700 ease-out translate-y-0 opacity-100">
          {/* Brand Icon Badge */}
          <div className="w-20 h-20 rounded-xl bg-primary-container flex items-center justify-center shadow-xl mb-6">
            <svg
              className="w-11 h-11 text-on-primary"
              fill="none"
              viewBox="0 0 44 44"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="TripMate Emblem"
            >
              <path
                d="M9 34V10L22 23.5L35 10V34"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="4.5"
              />
            </svg>
          </div>

          {/* App Logotype */}
          <h1 className="font-display-lg-mobile text-display-lg-mobile md:text-display-lg text-on-primary tracking-tight font-extrabold mb-1">
            Tripmate
          </h1>

          {/* Brand Micro Sub-label */}
          <div className="flex items-center gap-2 mt-1">
            <span className="font-label-badge text-label-badge uppercase tracking-widest text-surface-container-highest px-2 py-0.5 rounded bg-surface-dark/90">
              Trip OS
            </span>
          </div>

          {/* Editorial Philosophy Tagline */}
          <p className="font-label-lg text-label-lg text-secondary-fixed-dim mt-4 tracking-wider uppercase font-semibold">
            Plan. Ride. Stay.
          </p>
        </div>
      </div>

      {/* Progress Meter & Status Bottom Dock */}
      <footer className="w-full px-6 pb-8 flex flex-col items-center z-10">
        {/* Micro-bar */}
        <div className="w-36 h-1 bg-surface-container/20 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-primary-container rounded-full transition-all duration-1000 ease-out"
            style={{ width: progressWidth }}
          />
        </div>

        <div className="flex items-center gap-1.5 text-text-secondary font-label-badge text-label-badge tracking-widest uppercase">
          <span>Syncing Itinerary Assets</span>
          <span className="inline-flex gap-0.5">
            <span className="inline-block animate-bounce">.</span>
            <span className="inline-block animate-bounce delay-100">.</span>
            <span className="inline-block animate-bounce delay-200">.</span>
          </span>
        </div>
      </footer>
    </main>
  );
}
