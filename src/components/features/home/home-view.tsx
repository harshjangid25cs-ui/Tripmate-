"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import type { Destination, Circuit } from "@/lib/data/destinations";
import { getDestinationImageUrl, getCircuitImageUrl } from "@/lib/data/images";
import { formatCurrency } from "@/lib/format";
import { toggleSavedItem } from "@/lib/data/saved-items";
import { useRealtimeTableSync } from "@/lib/supabase/use-realtime-sync";

interface HomeViewProps {
  initialDestinations: Destination[];
  initialCircuits: Circuit[];
  featuredCircuits: Circuit[];
  initialQuery?: string;
  initialCategory?: string;
}

const CATEGORIES = [
  { id: "popular", label: "Popular", icon: "whatshot" },
  { id: "heritage", label: "Heritage", icon: "castle" },
  { id: "hidden_gems", label: "Hidden Gems", icon: "explore" },
  { id: "less_discovered", label: "Less Discovered", icon: "map" },
  { id: "nature", label: "Nature", icon: "forest" },
  { id: "weekend_getaways", label: "Weekend Getaways", icon: "weekend" },
];

export function HomeView({
  initialDestinations,
  initialCircuits,
  featuredCircuits,
  initialQuery = "",
  initialCategory = "popular",
}: HomeViewProps) {
  const [searchQuery, setSearchQuery] = React.useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = React.useState(initialCategory);
  const [sortBy, setSortBy] = React.useState<"Best Match" | "Duration" | "Price: Low">("Best Match");
  const [isSortOpen, setIsSortOpen] = React.useState(false);
  const [savedIds, setSavedIds] = React.useState<Set<string>>(new Set());
  const [comingSoonToast, setComingSoonToast] = React.useState<string | null>(null);
  const [showNotifications, setShowNotifications] = React.useState(false);

  // Live Supabase Realtime synchronization for catalog additions/edits
  const realtimeTables = React.useMemo(() => ["destinations", "circuits"], []);
  useRealtimeTableSync(realtimeTables);

  // Sync with search/filter
  const isSearchActive = searchQuery.trim().length > 0;

  // Filtered circuits when searching
  const filteredCircuits = React.useMemo(() => {
    let list = [...initialCircuits];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.summary.toLowerCase().includes(q) ||
          (c.destinationName && c.destinationName.toLowerCase().includes(q))
      );
    }
    if (selectedCategory && selectedCategory !== "popular" && selectedCategory !== "all") {
      list = list.filter((c) =>
        c.categories.some((cat) => cat.toLowerCase() === selectedCategory)
      );
    }
    if (sortBy === "Price: Low") {
      list.sort((a, b) => a.basePricePerPerson - b.basePricePerPerson);
    } else if (sortBy === "Duration") {
      list.sort((a, b) => a.days - b.days);
    } else {
      list.sort((a, b) => b.rating - a.rating);
    }
    return list;
  }, [initialCircuits, searchQuery, selectedCategory, sortBy]);

  // Filtered destinations when on default screen
  const filteredDestinations = React.useMemo(() => {
    if (selectedCategory === "popular" || selectedCategory === "all") {
      return initialDestinations;
    }
    return initialDestinations.filter((d) =>
      d.categories.some((c) => c.toLowerCase() === selectedCategory)
    );
  }, [initialDestinations, selectedCategory]);

  const handleWishlistToggle = async (e: React.MouseEvent, type: "destination" | "circuit", id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const isSaved = savedIds.has(id);
    const nextSet = new Set(savedIds);
    if (isSaved) {
      nextSet.delete(id);
    } else {
      nextSet.add(id);
    }
    setSavedIds(nextSet);
    await toggleSavedItem(type, id);
  };

  const handleNonBookableClick = (name: string) => {
    setComingSoonToast(`${name} will be bookable soon! Only Jaipur is bookable in v1.`);
    setTimeout(() => {
      setComingSoonToast(null);
    }, 3500);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("popular");
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 pt-3 pb-8 flex flex-col gap-4">
      {/* Top Header */}
      <header className="flex items-center justify-between py-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center text-on-primary font-bold text-lg shadow-sm">
            M
          </div>
          <div className="flex flex-col">
            <span className="font-headline-sm text-base text-text-primary font-extrabold tracking-tight">
              Tripmate
            </span>
            <span className="font-label-md text-xs text-text-secondary">Home</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Notifications Button */}
          <div className="relative">
            <button
              type="button"
              aria-label="Notifications"
              onClick={() => setShowNotifications((prev) => !prev)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">
                notifications
              </span>
            </button>

            {/* Simple Notifications Sheet/Popover */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 bg-card-surface border border-border-hairline rounded-2xl shadow-xl p-4 z-50">
                <div className="flex items-center justify-between mb-3 border-b border-border-hairline pb-2">
                  <span className="font-headline-sm text-xs font-bold text-text-primary">
                    Notifications
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    className="text-text-secondary hover:text-text-primary"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
                <div className="flex flex-col gap-2.5 text-xs">
                  <div className="p-2 rounded-xl bg-surface-container-low border border-border-hairline/50">
                    <p className="font-semibold text-text-primary">Welcome to TripMate!</p>
                    <p className="text-text-secondary text-[11px] mt-0.5">
                      Explore Jaipur royal heritage circuit with verified chauffeurs.
                    </p>
                  </div>
                  <div className="p-2 rounded-xl bg-surface-container-low border border-border-hairline/50">
                    <p className="font-semibold text-text-primary">Trip Assurance Guarantee</p>
                    <p className="text-text-secondary text-[11px] mt-0.5">
                      100% refund on cancellations made at least 48 hours prior.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar Link */}
          <Link
            href="/profile"
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary hover:opacity-90 transition-opacity"
            aria-label="View Profile"
          >
            <span className="material-symbols-outlined text-[18px]">person</span>
          </Link>
        </div>
      </header>

      {/* Coming Soon Alert Toast */}
      {comingSoonToast && (
        <div
          role="status"
          className="fixed top-20 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm z-50 p-3 bg-surface-dark text-on-primary rounded-2xl shadow-2xl flex items-center gap-2 border border-white/10"
        >
          <span className="material-symbols-outlined text-urgency-amber text-lg">info</span>
          <span className="font-body-sm text-xs flex-1">{comingSoonToast}</span>
          <button
            type="button"
            onClick={() => setComingSoonToast(null)}
            className="text-text-secondary hover:text-white"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}

      {/* Interactive Sticky Search & Filter Bar Section */}
      <section className="flex flex-col gap-2.5">
        {/* Search Bar */}
        <div className="relative w-full flex items-center bg-card-surface rounded-2xl border border-border-hairline shadow-sm px-3.5 h-12">
          <span className="material-symbols-outlined text-text-secondary text-[20px] mr-2 shrink-0">
            search
          </span>
          <input
            id="search-input"
            type="text"
            aria-label="Search destination, theme, or travel circuit"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search destination, theme or circuit..."
            className="w-full bg-transparent font-body-md text-sm text-text-primary focus:outline-none placeholder:text-text-secondary"
          />
          {searchQuery && (
            <button
              type="button"
              id="clear-search-btn"
              aria-label="Clear destination search"
              onClick={() => setSearchQuery("")}
              className="w-7 h-7 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary bg-surface-container shrink-0 transition-colors ml-1"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        {/* Category Filter Chips Row (Horizontal Scroll) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-4 px-4">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`filter-chip shrink-0 px-4 py-2 rounded-full font-label-md text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm border ${
                  isSelected
                    ? "bg-primary-container text-on-primary border-transparent"
                    : "bg-card-surface border-border-hairline text-text-primary hover:bg-surface-container-low"
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">
                  {cat.icon}
                </span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* STATE 1: SEARCH ACTIVE & RESULTS FOUND */}
      {isSearchActive && filteredCircuits.length > 0 && (
        <section className="flex flex-col gap-4">
          {/* Results Count & Sorting Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1">
              <span className="font-headline-sm text-base font-bold text-text-primary">
                {filteredCircuits.length} Curated Trips
              </span>
              <span className="font-body-sm text-xs text-text-secondary">
                for &quot;{searchQuery}&quot;
              </span>
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <button
                type="button"
                id="sort-menu-btn"
                onClick={() => setIsSortOpen((prev) => !prev)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-card-surface border border-border-hairline shadow-sm font-label-md text-xs font-semibold text-text-primary"
              >
                <span className="material-symbols-outlined text-[16px] text-text-secondary">
                  swap_vert
                </span>
                <span>{sortBy}</span>
                <span className="material-symbols-outlined text-[16px] text-text-secondary">
                  expand_more
                </span>
              </button>

              {isSortOpen && (
                <div
                  id="sort-dropdown"
                  className="absolute right-0 mt-1 w-36 bg-card-surface border border-border-hairline rounded-xl shadow-xl py-1 z-30"
                >
                  {(["Best Match", "Duration", "Price: Low"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setSortBy(opt);
                        setIsSortOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 font-label-md text-xs font-medium transition-colors ${
                        sortBy === opt
                          ? "text-primary-container bg-surface-container-low font-bold"
                          : "text-text-primary hover:bg-surface-container-low"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Circuit Cards List */}
          <div className="flex flex-col gap-4">
            {filteredCircuits.map((circuit) => {
              const isSaved = savedIds.has(circuit.id);
              const imageUrl = getCircuitImageUrl(circuit.id, circuit.imagePath);
              return (
                <article
                  key={circuit.id}
                  className="w-full bg-card-surface border border-border-hairline rounded-2xl overflow-hidden shadow-sm flex flex-col"
                >
                  {/* 4:3 Image Container with Overlays */}
                  <div className="relative w-full aspect-[4/3] overflow-hidden bg-surface-container-high">
                    <Image
                      src={imageUrl}
                      alt={circuit.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 448px"
                    />

                    {/* Badge */}
                    {circuit.badge && (
                      <div className="absolute top-3 left-3 flex items-center gap-1 bg-urgency-amber px-2.5 py-1 rounded-full shadow-md">
                        <span className="font-label-badge text-[11px] font-bold text-on-primary flex items-center gap-1">
                          🔥 {circuit.badge}
                        </span>
                      </div>
                    )}

                    {/* Wishlist Heart */}
                    <button
                      type="button"
                      aria-label="Save to wishlist"
                      onClick={(e) => handleWishlistToggle(e, "circuit", circuit.id)}
                      className="wishlist-btn absolute top-3 right-3 w-9 h-9 rounded-full bg-surface-dark/50 backdrop-blur-md flex items-center justify-center text-on-primary transition-transform active:scale-90"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {isSaved ? "favorite" : "favorite_border"}
                      </span>
                    </button>

                    {/* Bottom Dark Glass Title Tag */}
                    <div className="absolute bottom-3 left-3 right-3 px-3 py-2 rounded-xl bg-surface-dark/75 backdrop-blur-md flex items-center justify-between text-on-primary">
                      <h3 className="font-title-md text-sm font-bold truncate pr-2">
                        {circuit.title}
                      </h3>
                      <span className="shrink-0 flex items-center gap-0.5 text-urgency-amber font-label-md text-xs font-bold">
                        <span className="material-symbols-outlined text-[14px]">
                          star
                        </span>
                        <span className="text-on-primary">{circuit.rating}</span>
                      </span>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-text-secondary font-body-sm text-xs">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px]">
                          calendar_today
                        </span>
                        {circuit.days} Days / {circuit.nights} Nights
                      </span>
                      <span className="w-1 h-1 rounded-full bg-text-secondary" />
                      <span className="flex items-center gap-1 truncate">
                        <span className="material-symbols-outlined text-[15px]">
                          hotel
                        </span>
                        {circuit.summary}
                      </span>
                    </div>

                    <p className="font-body-sm text-xs text-text-secondary line-clamp-1">
                      {circuit.description}
                    </p>

                    {/* Bottom Shelf */}
                    <div className="pt-2 flex items-center justify-between mt-1 border-t border-border-hairline/60">
                      <div className="flex flex-col">
                        <span className="font-body-sm text-[11px] text-text-secondary">
                          From
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="font-numeral-price text-base font-bold text-text-primary">
                            {formatCurrency(circuit.basePricePerPerson)}
                          </span>
                          <span className="font-body-sm text-[11px] text-text-secondary">
                            / person
                          </span>
                        </div>
                      </div>

                      <Link
                        href={`/destinations/${circuit.destinationSlug || "jaipur"}`}
                        className="px-4 py-2 rounded-xl bg-primary-container hover:bg-primary active:bg-surface-tint text-on-primary font-label-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                      >
                        <span>Plan This Trip</span>
                        <span className="material-symbols-outlined text-[16px]">
                          arrow_forward
                        </span>
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* STATE 2: SEARCH ACTIVE & ZERO RESULTS (EMPTY STATE) */}
      {isSearchActive && filteredCircuits.length === 0 && (
        <section className="flex flex-col items-center text-center mt-4 mb-6 px-2">
          {/* Subdued Geometric Icon */}
          <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center mb-3 text-text-primary">
            <span className="material-symbols-outlined text-[26px]">explore_off</span>
          </div>

          <h2 className="font-headline-md text-lg font-bold text-text-primary mb-1 tracking-tight">
            No destinations match this filter yet
          </h2>

          <p className="font-body-md text-xs text-text-secondary max-w-sm mb-5 leading-relaxed">
            Try adjusting your dates, removing specific filter tags, or exploring all popular circuits across India.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-xs justify-center">
            <button
              type="button"
              id="clear-all-filters-btn"
              onClick={clearFilters}
              className="w-full min-h-[44px] bg-primary-container text-on-primary font-label-lg text-xs font-bold py-2.5 px-4 rounded-xl tracking-tight transition-transform active:scale-[0.98] shadow-sm hover:bg-primary"
            >
              Clear all filters
            </button>
            <button
              type="button"
              id="browse-popular-btn"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("popular");
              }}
              className="w-full min-h-[44px] bg-card-surface border border-border-hairline text-text-primary font-label-lg text-xs font-semibold py-2.5 px-4 rounded-xl tracking-tight shadow-sm hover:bg-surface-container transition-colors"
            >
              Browse All Circuits
            </button>
          </div>

          {/* Trending Alternatives */}
          <div className="w-full flex flex-col gap-3 mt-8 text-left">
            <div className="flex items-baseline justify-between">
              <div>
                <h3 className="font-headline-sm text-sm font-bold text-text-primary">
                  Trending Alternatives
                </h3>
                <p className="font-body-sm text-xs text-text-secondary">
                  Readily confirmed circuits with peak winter availability
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {featuredCircuits.slice(0, 2).map((alt) => {
                const altImage = getCircuitImageUrl(alt.id, alt.imagePath);
                return (
                  <Link
                    key={alt.id}
                    href={`/destinations/${alt.destinationSlug || "jaipur"}`}
                    className="bg-card-surface border border-border-hairline rounded-2xl overflow-hidden shadow-sm flex flex-col group cursor-pointer"
                  >
                    <div className="relative w-full aspect-[4/3] bg-surface-container-high overflow-hidden">
                      <Image
                        src={altImage}
                        alt={alt.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        sizes="(max-width: 768px) 100vw, 220px"
                      />
                      <div className="absolute top-2.5 left-2.5 bg-urgency-amber text-on-primary font-label-badge text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">bolt</span>
                        <span>Fast Selling</span>
                      </div>
                      <div className="absolute bottom-2.5 right-2.5 bg-surface-dark/70 backdrop-blur-md text-on-primary px-2 py-0.5 rounded-full font-label-md text-[11px] font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px] text-urgency-amber">
                          star
                        </span>
                        <span>{alt.rating}</span>
                      </div>
                    </div>
                    <div className="p-3 flex flex-col flex-1 justify-between gap-2">
                      <div>
                        <h4 className="font-headline-sm text-sm font-bold text-text-primary leading-snug">
                          {alt.title}
                        </h4>
                        <p className="font-body-sm text-[11px] text-text-secondary mt-0.5">
                          {alt.days} Days, {alt.nights} Nights • {alt.summary}
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-border-hairline/60">
                        <div>
                          <span className="font-body-sm text-[10px] text-text-secondary">
                            Starting from
                          </span>
                          <div className="font-numeral-price text-sm font-bold text-text-primary">
                            {formatCurrency(alt.basePricePerPerson)}
                            <span className="font-body-sm text-[10px] text-text-secondary font-normal">
                              {" "}
                              /person
                            </span>
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-text-primary group-hover:bg-primary-container group-hover:text-on-primary transition-colors">
                          <span className="material-symbols-outlined text-[18px]">
                            arrow_forward
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* STATE 3: DEFAULT (BROWSE DESTINATIONS) */}
      {!isSearchActive && (
        <section className="flex flex-col gap-4">
          {/* Section Header */}
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="font-headline-sm text-base font-bold text-text-primary tracking-tight">
                India&apos;s Most Popular Destinations
              </h2>
              <p className="font-body-sm text-xs text-text-secondary mt-0.5">
                Handpicked iconic gateways curated for your next adventure
              </p>
            </div>
          </div>

          {/* Cards Vertical Grid */}
          <div className="flex flex-col gap-4">
            {filteredDestinations.map((dest) => {
              const imageUrl = getDestinationImageUrl(dest.slug, dest.heroImagePath);
              const isSaved = savedIds.has(dest.id);
              return (
                <article
                  key={dest.id}
                  className="w-full bg-card-surface border border-border-hairline rounded-2xl overflow-hidden shadow-sm flex flex-col"
                >
                  {/* 4:3 Image Container with Overlays */}
                  <div className="relative w-full aspect-[4/3] bg-surface-container-highest overflow-hidden">
                    <Image
                      src={imageUrl}
                      alt={dest.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 448px"
                    />

                    {/* Urgency Badge */}
                    {dest.badge && (
                      <div className="absolute top-3 left-3 bg-urgency-amber px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                        <span className="text-on-primary font-label-badge text-[11px] font-bold tracking-wide">
                          🔥 {dest.badge}
                        </span>
                      </div>
                    )}

                    {/* Wishlist Button */}
                    <button
                      type="button"
                      aria-label={`Save ${dest.name} to wishlist`}
                      onClick={(e) => handleWishlistToggle(e, "destination", dest.id)}
                      className="wishlist-btn absolute top-3 right-3 w-9 h-9 rounded-full bg-surface-dark/50 backdrop-blur-md flex items-center justify-center text-on-primary transition-transform active:scale-90"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {isSaved ? "favorite" : "favorite_border"}
                      </span>
                    </button>

                    {/* Overlaid Dark-Glass Tag */}
                    <div className="absolute bottom-3 left-3 right-3 bg-surface-dark/75 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2 flex flex-col justify-center text-on-primary">
                      <span className="font-title-md text-sm font-bold tracking-tight">
                        {dest.name}
                      </span>
                      <span className="font-body-sm text-xs text-on-primary/90">
                        {dest.tagline} • {dest.recommendedDays} recommended
                      </span>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="p-4 flex items-center justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <span className="font-body-sm text-[11px] text-text-secondary truncate">
                        Starting package
                      </span>
                      <span className="font-numeral-price text-base font-bold text-text-primary">
                        From {formatCurrency(dest.startingPrice)}
                        <span className="text-xs font-normal text-text-secondary">
                          /person
                        </span>
                      </span>
                    </div>

                    {dest.isBookable ? (
                      <Link
                        href={`/destinations/${dest.slug}`}
                        className="min-h-[44px] px-3.5 py-2 rounded-xl bg-primary-container hover:bg-primary active:bg-surface-tint text-on-primary font-label-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all active:scale-95 shrink-0"
                      >
                        <span className="whitespace-nowrap">Plan This Trip</span>
                        <span className="material-symbols-outlined text-[16px]">
                          arrow_forward
                        </span>
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleNonBookableClick(dest.name)}
                        className="min-h-[44px] px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-text-secondary font-label-lg text-xs font-semibold flex items-center gap-1 transition-colors shrink-0"
                      >
                        <span className="whitespace-nowrap">Coming soon</span>
                        <span className="material-symbols-outlined text-[16px]">
                          schedule
                        </span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
