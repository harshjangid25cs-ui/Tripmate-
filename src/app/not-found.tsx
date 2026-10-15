import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-surface flex flex-col items-center justify-center px-4 py-12 text-center antialiased selection:bg-primary-container selection:text-white">
      <div className="w-full max-w-md mx-auto flex flex-col items-center gap-6">
        {/* Brand Icon */}
        <div className="w-16 h-16 rounded-2xl bg-primary-container flex items-center justify-center text-on-primary font-bold text-2xl shadow-sm">
          M
        </div>

        {/* 404 Indicator & Headings */}
        <div className="flex flex-col items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-surface-container-high text-text-secondary font-label-badge text-xs font-bold uppercase tracking-wider">
            404 • Destination Not Found
          </span>
          <h1 className="font-headline-lg text-2xl font-bold text-text-primary tracking-tight mt-1">
            Off The Itinerary
          </h1>
          <p className="font-body-md text-sm text-text-secondary max-w-xs leading-relaxed">
            The page, destination, or ticket you are looking for doesn&apos;t exist or may have been relocated.
          </p>
        </div>

        {/* Quick Navigation Cards */}
        <div className="w-full bg-card-surface border border-border-hairline rounded-2xl p-4 shadow-sm flex flex-col gap-2 text-left">
          <p className="font-label-md text-xs font-bold text-text-secondary uppercase tracking-wider px-2">
            Explore TripMate
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/home"
              className="p-3 rounded-xl bg-surface hover:bg-surface-container border border-border-hairline/60 flex items-center gap-2.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px] text-primary-container">
                explore
              </span>
              <div className="flex flex-col">
                <span className="font-title-md text-xs font-bold text-text-primary">
                  Home
                </span>
                <span className="text-[10px] text-text-secondary">
                  Discover Stays
                </span>
              </div>
            </Link>

            <Link
              href="/trips"
              className="p-3 rounded-xl bg-surface hover:bg-surface-container border border-border-hairline/60 flex items-center gap-2.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px] text-primary-container">
                luggage
              </span>
              <div className="flex flex-col">
                <span className="font-title-md text-xs font-bold text-text-primary">
                  Trips
                </span>
                <span className="text-[10px] text-text-secondary">
                  Recent Bookings
                </span>
              </div>
            </Link>

            <Link
              href="/commercial"
              className="p-3 rounded-xl bg-surface hover:bg-surface-container border border-border-hairline/60 flex items-center gap-2.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px] text-primary-container">
                domain
              </span>
              <div className="flex flex-col">
                <span className="font-title-md text-xs font-bold text-text-primary">
                  Commercial
                </span>
                <span className="text-[10px] text-text-secondary">
                  Corporate B2B
                </span>
              </div>
            </Link>

            <Link
              href="/profile"
              className="p-3 rounded-xl bg-surface hover:bg-surface-container border border-border-hairline/60 flex items-center gap-2.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px] text-primary-container">
                person
              </span>
              <div className="flex flex-col">
                <span className="font-title-md text-xs font-bold text-text-primary">
                  Profile
                </span>
                <span className="text-[10px] text-text-secondary">
                  Preferences
                </span>
              </div>
            </Link>
          </div>
        </div>

        {/* Primary Action Button */}
        <Link
          href="/home"
          className="w-full py-3.5 px-6 rounded-xl bg-primary-container hover:bg-primary text-white font-label-lg text-sm font-bold shadow-sm transition-all active:scale-[0.99] flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">
            arrow_back
          </span>
          <span>Return to Home Discovery</span>
        </Link>
      </div>
    </main>
  );
}
