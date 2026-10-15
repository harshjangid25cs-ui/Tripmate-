"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ValidatedDraftTrip } from "@/lib/data/booking-guards";
import type { Hotel } from "@/lib/data/booking";
import { getHotelImageUrl } from "@/lib/data/images";
import { formatCurrency } from "@/lib/format";
import { toggleSavedItem } from "@/lib/data/saved-items";
import { selectTripHotel } from "@/lib/actions/trips";

interface HotelSelectionViewProps {
  tripData: ValidatedDraftTrip;
  hotels: Hotel[];
}

type FilterKey = "all" | "price" | "rating" | "haveli" | "pool" | "budget";

export function HotelSelectionView({ tripData, hotels }: HotelSelectionViewProps) {
  const router = useRouter();
  const { trip, hotel: selectedTripHotel, destination } = tripData;

  const [activeFilter, setActiveFilter] = React.useState<FilterKey>("all");
  const [selectedHotelId, setSelectedHotelId] = React.useState<string | null>(
    selectedTripHotel?.hotel_id ?? hotels[0]?.id ?? null
  );
  const [bookmarkedIds, setBookmarkedIds] = React.useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const nights = Math.max(
    1,
    trip.start_date && trip.end_date
      ? Math.round(
          (new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : trip.total_days ? trip.total_days - 1 : 3
  );

  const travelers = trip.traveler_count ?? 1;
  const defaultRooms =
    trip.group_type === "solo" ? 1 : Math.ceil(travelers / 2);

  const datesSubtext = React.useMemo(() => {
    if (!trip.start_date || !trip.end_date) return "";
    const start = new Date(trip.start_date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const end = new Date(trip.end_date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return `${start} – ${end} (${trip.total_days ?? nights + 1} Days, ${nights} Nights) • ${travelers} ${
      travelers === 1 ? "Guest" : "Guests"
    }`;
  }, [trip.start_date, trip.end_date, trip.total_days, nights, travelers]);

  // Client-side filtering & sorting
  const filteredHotels = React.useMemo(() => {
    let list = [...hotels];

    if (activeFilter === "price") {
      list.sort((a, b) => a.pricePerNight - b.pricePerNight);
    } else if (activeFilter === "rating") {
      list = list.filter((h) => h.rating >= 4.5);
      list.sort((a, b) => b.rating - a.rating);
    } else if (activeFilter === "haveli") {
      list = list.filter(
        (h) =>
          h.name.toLowerCase().includes("haveli") ||
          h.amenities.some((a) => a.toLowerCase().includes("heritage"))
      );
    } else if (activeFilter === "pool") {
      list = list.filter((h) =>
        h.amenities.some((a) => a.toLowerCase().includes("pool"))
      );
    } else if (activeFilter === "budget") {
      list = list.filter((h) => h.pricePerNight <= 5000);
    }

    return list;
  }, [hotels, activeFilter]);

  const selectedHotel = hotels.find((h) => h.id === selectedHotelId);

  const handleSelectHotel = async (hotelId: string) => {
    setSelectedHotelId(hotelId);
    setErrorMsg(null);
    try {
      const res = await selectTripHotel({
        tripId: trip.id,
        hotelId,
        rooms: defaultRooms,
      });
      if (!res.ok) {
        setErrorMsg(res.error ?? "Failed to save hotel selection.");
      }
    } catch {
      setErrorMsg("Failed to update hotel selection.");
    }
  };

  const handleNext = async () => {
    if (!selectedHotelId) {
      setErrorMsg("Please select a hotel to continue.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      // Ensure selected hotel is persisted
      const res = await selectTripHotel({
        tripId: trip.id,
        hotelId: selectedHotelId,
        rooms: defaultRooms,
      });

      if (res.ok) {
        router.push(`/book/${trip.id}/vehicle`);
      } else {
        setErrorMsg(res.error ?? "Failed to proceed to transport.");
        setIsSubmitting(false);
      }
    } catch {
      setErrorMsg("An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  const toggleBookmark = async (id: string) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    try {
      await toggleSavedItem("hotel", id);
    } catch {
      // Ignored
    }
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
              onClick={() => router.push(`/book/${trip.id}/duration`)}
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
              Hotel Selection
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
        <div className="flex flex-col w-full max-w-md mx-auto pb-32">
          {/* Context Intro Header */}
          <div className="px-margin-mobile pt-space-sm pb-space-md flex flex-col gap-1">
            <div className="flex items-center gap-space-xs text-text-secondary">
              <span className="material-symbols-outlined text-[16px] text-primary-container">
                location_on
              </span>
              <p className="font-label-md text-label-md text-text-secondary tracking-normal uppercase">
                Step 2 of 4: Stay
              </p>
            </div>
            <p className="font-headline-sm text-headline-sm text-text-primary tracking-tight">
              {destination?.name ?? "Jaipur"} Stays
            </p>
            {datesSubtext && (
              <p className="font-body-sm text-body-sm text-text-secondary">
                {datesSubtext}
              </p>
            )}
          </div>

          {/* Filter Pills */}
          <div className="w-full overflow-x-auto no-scrollbar px-margin-mobile pb-space-md flex items-center gap-space-sm">
            {[
              { id: "all", label: "Recommended" },
              { id: "price", label: "Price: Low to High" },
              { id: "rating", label: "Rating: 4.5+" },
              { id: "haveli", label: "Heritage Haveli" },
              { id: "pool", label: "Swimming Pool" },
              { id: "budget", label: "Under ₹5,000" },
            ].map((f) => {
              const active = activeFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFilter(f.id as FilterKey)}
                  className={`filter-pill whitespace-nowrap px-4 py-2 rounded-full font-label-md text-label-md transition-colors shadow-sm active:scale-95 ${
                    active
                      ? "bg-surface-dark text-card-surface"
                      : "bg-card-surface text-text-primary hover:bg-surface-container"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {errorMsg && (
            <div className="mx-margin-mobile mb-4 p-3 rounded-xl bg-error-container/30 text-error text-xs font-semibold flex items-center gap-2 border border-error/20">
              <span className="material-symbols-outlined text-[16px]">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Hotel Cards Stack */}
          <div className="px-margin-mobile flex flex-col gap-space-lg">
            {filteredHotels.map((hotel) => {
              const isSelected = selectedHotelId === hotel.id;
              const isBookmarked = bookmarkedIds.has(hotel.id);
              const stayTotal = hotel.pricePerNight * nights * defaultRooms;
              const hotelImg = getHotelImageUrl(hotel.name, hotel.imagePaths[0]);

              return (
                <div
                  key={hotel.id}
                  className={`hotel-card bg-card-surface rounded-2xl shadow-sm flex flex-col overflow-hidden transition-all duration-200 border ${
                    isSelected
                      ? "ring-2 ring-primary-container border-transparent shadow-md"
                      : "border-border-hairline hover:shadow-md"
                  }`}
                >
                  {/* Image & Badges */}
                  <div className="relative w-full aspect-[4/3] bg-surface-container overflow-hidden">
                    <Image
                      src={hotelImg}
                      alt={hotel.name}
                      fill
                      priority
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 448px"
                    />
                    {hotel.badge && (
                      <div className="absolute top-3 left-3 bg-urgency-amber text-card-surface px-3 py-1 rounded-full font-label-badge text-label-badge tracking-wider uppercase flex items-center gap-1 shadow-sm">
                        <span className="material-symbols-outlined text-[13px]">
                          hourglass_top
                        </span>
                        <span>{hotel.badge}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      aria-label="Save to Wishlist"
                      onClick={() => toggleBookmark(hotel.id)}
                      className={`wishlist-btn absolute top-3 right-3 w-9 h-9 rounded-full bg-surface-dark/50 backdrop-blur-md flex items-center justify-center active:scale-95 transition-transform ${
                        isBookmarked ? "text-primary-container" : "text-card-surface"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {isBookmarked ? "favorite" : "favorite_border"}
                      </span>
                    </button>
                  </div>

                  {/* Details Block */}
                  <div className="p-space-md flex flex-col gap-space-sm">
                    <div className="flex flex-col gap-0.5">
                      <h3 className="font-headline-sm text-headline-sm text-text-primary leading-snug">
                        {hotel.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-text-secondary mt-1">
                        <span className="inline-flex items-center gap-0.5 bg-surface-dark text-card-surface px-1.5 py-0.5 rounded font-label-badge text-label-badge">
                          <span
                            className="material-symbols-outlined text-[12px] text-urgency-amber"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            star
                          </span>
                          {hotel.rating.toFixed(1)}
                        </span>
                        <span className="font-body-sm text-body-sm text-text-secondary">
                          ({hotel.reviewCount} reviews)
                        </span>
                        {hotel.neighborhood && (
                          <>
                            <span className="text-text-secondary">•</span>
                            <span className="font-body-sm text-body-sm text-text-secondary truncate">
                              {hotel.neighborhood}{" "}
                              {hotel.distanceText ? `(${hotel.distanceText})` : ""}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Amenity Badges */}
                    <div className="flex items-center gap-space-xs flex-wrap py-1">
                      {hotel.amenities.slice(0, 3).map((amenity, idx) => (
                        <span
                          key={idx}
                          className="bg-surface-container px-2.5 py-1 rounded-md font-body-sm text-body-sm text-text-secondary"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>

                    {/* Bottom Pricing & Action */}
                    <div className="pt-space-xs mt-1 flex items-end justify-between">
                      <div className="flex flex-col">
                        <div className="flex items-baseline gap-1">
                          <span className="font-numeral-price text-numeral-price text-primary-container">
                            {formatCurrency(hotel.pricePerNight)}
                          </span>
                          <span className="font-body-sm text-body-sm text-text-secondary">
                            / night
                          </span>
                        </div>
                        {/* Wording "+ taxes" per DECISIONS D6 */}
                        <span className="font-body-sm text-body-sm text-text-secondary">
                          {formatCurrency(stayTotal)} for {nights} nights • + taxes
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectHotel(hotel.id)}
                        className={`select-room-btn px-5 py-2.5 rounded-xl font-label-lg text-label-lg active:scale-95 transition-all ${
                          isSelected
                            ? "bg-primary-container text-card-surface shadow-sm font-semibold flex items-center gap-1"
                            : "bg-surface-dark hover:bg-black text-card-surface font-medium"
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <span className="material-symbols-outlined text-[16px]">
                              check
                            </span>
                            <span>Selected</span>
                          </>
                        ) : (
                          "Select Room"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Fixed Bottom Bar */}
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-card-surface/90 backdrop-blur-xl px-margin-mobile py-space-md shadow-[0_-4px_20px_rgba(20,21,26,0.06)] pb-safe border-t border-border-hairline/60">
            <div className="max-w-md mx-auto flex items-center justify-between gap-space-md">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-success-green animate-pulse" />
                  <span className="font-title-md text-title-md text-text-primary truncate">
                    {selectedHotel ? "1 Hotel Selected" : "Choose Hotel"}
                  </span>
                </div>
                <span className="font-body-sm text-body-sm text-text-secondary truncate">
                  {selectedHotel?.name ?? "Select your stay in Jaipur"}
                </span>
              </div>
              <button
                type="button"
                disabled={!selectedHotelId || isSubmitting}
                onClick={handleNext}
                className="shrink-0 bg-primary-container text-card-surface px-6 py-3.5 rounded-xl font-label-lg text-label-lg uppercase tracking-wider flex items-center gap-1.5 shadow-md active:bg-primary transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{isSubmitting ? "Saving..." : "Next: Transport"}</span>
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
