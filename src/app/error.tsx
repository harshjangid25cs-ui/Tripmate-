"use client";

import * as React from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("TripMate Global Application Error:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-surface flex flex-col items-center justify-center px-4 py-12 text-center antialiased selection:bg-primary-container selection:text-white">
      <div className="w-full max-w-md mx-auto flex flex-col items-center gap-6">
        {/* Error Badge */}
        <div className="w-16 h-16 rounded-2xl bg-error/10 border border-error/20 flex items-center justify-center text-error font-bold text-2xl shadow-sm">
          <span className="material-symbols-outlined text-[32px]">
            warning
          </span>
        </div>

        {/* Headings */}
        <div className="flex flex-col items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-error-container text-on-error-container font-label-badge text-xs font-bold uppercase tracking-wider">
            System Notice
          </span>
          <h1 className="font-headline-lg text-2xl font-bold text-text-primary tracking-tight mt-1">
            Something Went Off-Track
          </h1>
          <p className="font-body-md text-sm text-text-secondary max-w-xs leading-relaxed">
            We encountered an unexpected roadblock processing this view. Your booking drafts and itinerary data remain safely preserved.
          </p>
        </div>

        {/* Error Details Card */}
        {error.message && (
          <div className="w-full bg-card-surface border border-border-hairline rounded-2xl p-4 shadow-sm text-left">
            <p className="font-label-md text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
              Diagnostic Context
            </p>
            <p className="font-mono text-xs text-text-primary bg-surface-container-low p-2.5 rounded-xl break-words">
              {error.message.slice(0, 200)}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full py-3.5 px-6 rounded-xl bg-primary-container hover:bg-primary text-white font-label-lg text-sm font-bold shadow-sm transition-all active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">
              refresh
            </span>
            <span>Try Again</span>
          </button>

          <Link
            href="/home"
            className="w-full py-3 px-6 rounded-xl bg-card-surface hover:bg-surface-container-low border border-border-hairline text-text-primary font-label-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">
              home
            </span>
            <span>Return to Safe Home</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
