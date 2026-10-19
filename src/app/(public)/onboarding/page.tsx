"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ONBOARDING_COOKIE_NAME } from "@/lib/auth-guard";

interface SlideData {
  pill: string;
  counter: string;
  heading: string;
  body: string;
  cta: string;
  tags: string[];
  imageSrc: string;
  imageAlt: string;
}

const SLIDES: SlideData[] = [
  {
    pill: "Curated Travel",
    counter: "01 / 03",
    heading: "Discover places worth finding",
    body: "Handpicked spots across India curated for road trippers and explorers.",
    cta: "Explore Trips",
    tags: ["Uncharted Valleys", "Off-Grid Maps", "Scenic Highway Viewpoints"],
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCE2wW1gBvSN4bniWkbHtZMfRVm0in9WPZ3sM0E8Z17MXt04DRhg6OZklHOIpYe6mBnS6TI8rikB2f_6_6TDK3OC6rt68-cA0KRYsr_sT1-ssqVRzz3fJlvFPxohWF_HprXPWdvNYVWViKfhFNhHlWMimnllUBQ9ZruDtNjAf_UIcoTE8UFog-crURCbPf_rN1GXIT0ooYJ84EPAKvhuovgmfZbjOZU392bEuQ9GWCSkTGXynkHgsxxCA",
    imageAlt:
      "Cinematic aerial photograph of a serene winding mountain highway in a Himalayan valley surrounded by dramatic peaks",
  },
  {
    pill: "Integrated Booking",
    counter: "02 / 03",
    heading: "Plan hotels, rides & rest stops in one go",
    body: "Book boutique heritage stays, verified chauffeurs, and midway highway pauses in a single seamless itinerary.",
    cta: "Preview Stays & Rides",
    tags: ["Heritage Haveli Stays", "Chauffeur-Driven SUVs", "Verified Food Stops"],
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBJ8Pn4e7CARpIV3WfYXWu492iSHQVXDdQCuzCxUYfG4nCveD6EXPldvMkN1bHofDGKiNNu3itjNDIK0NpuSwQMeomUY12-z12fNga2JwCdPc3VWaiQSmF2LUozq4P87duW2SJlHjMPFyMA-lccao2HIHjx29_f06zgtmp0V9gd5mnWvL5TUqm-vJn9F1nwjPRmHE3MkPzPKr_wv3JCsS7HBFNO53aaz6YWrq7gqwZJdeSCjU-VlkEzVA",
    imageAlt:
      "Breathtaking architectural view of a boutique heritage desert palace hotel in Rajasthan with warm courtyard and luxury vehicle",
  },
  {
    pill: "Assurance Guaranteed",
    counter: "03 / 03",
    heading: "Built for real trips, not just bookings",
    body: "Live concierge support, guaranteed clean stops, and verified corporate or solo routes.",
    cta: "Get Started",
    tags: ["24/7 Road Concierge", "Clean Restroom Seal", "Corporate-Ready Billing"],
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAJopFr3ayyM_hBFv-NF9d8oAJFfuNWq4MF-qpIJ59b58o6rduM1leWG5dwF4ASDpj6kSdUugG6ojcJenM9i8ebUer4mJZwxaYpp-J3FKtRKOZmkSx6C3z50lqCpoj0I90p2AwsOz94UEHH1C8a8QGFhk6DP_-SbrOHXZrzdBmRd0rQdweFKTBSqY-zcytMgOKOFYgjHvX7BLn8WpnaBEZWeyS6ApZKSgOx6oVGi1CN-l4ISVhA8z-WZQ",
    imageAlt:
      "Expansive scenic coastal cliff road in South India with a traveler overlooking the deep ocean and lush tropical groves",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = React.useState(0);

  React.useEffect(() => {
    router.prefetch("/login");
  }, [router]);

  const completeOnboardingAndNavigate = React.useCallback(() => {
    // Persist completion in cookie (1 year) and localStorage
    document.cookie = `${ONBOARDING_COOKIE_NAME}=true; path=/; max-age=31536000; SameSite=Lax`;
    try {
      localStorage.setItem(ONBOARDING_COOKIE_NAME, "true");
    } catch {
      // Ignore if localStorage unavailable
    }
    router.push("/login");
  }, [router]);

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      completeOnboardingAndNavigate();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const slide = SLIDES[currentSlide] ?? SLIDES[0]!;

  return (
    <main className="w-full min-h-screen bg-surface flex flex-col items-center justify-center relative overflow-hidden select-none">
      <div className="w-full max-w-md h-screen min-h-[640px] max-h-[920px] flex flex-col justify-between relative overflow-hidden shadow-2xl bg-surface-dark">
        {/* Background Slides */}
        {SLIDES.map((s, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 w-full h-full transition-opacity duration-700 ${
              idx === currentSlide
                ? "opacity-100 z-0"
                : "opacity-0 pointer-events-none -z-10"
            }`}
          >
            <Image
              src={s.imageSrc}
              alt={s.imageAlt}
              fill
              priority={idx === 0}
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 448px"
            />
            {/* Dark glass overlay */}
            <div className="absolute inset-0 bg-surface-dark/45" />
          </div>
        ))}

        {/* Foreground Content */}
        <div className="relative z-10 flex flex-col justify-between w-full h-full px-4 pt-6 pb-6">
          {/* Header */}
          <header className="flex items-center justify-between w-full">
            {/* Brand Mark Pill */}
            <div className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-surface-dark/60 backdrop-blur-md shadow-sm border border-white/10">
              <span className="material-symbols-outlined text-primary-container text-base font-bold">
                explore
              </span>
              <span className="font-headline-sm text-sm tracking-tight text-on-primary">
                Tripmate
              </span>
            </div>

            {/* Skip Action Button */}
            <button
              type="button"
              id="skip-btn"
              onClick={completeOnboardingAndNavigate}
              className="flex items-center px-4 py-1.5 rounded-full bg-surface-dark/60 backdrop-blur-md text-on-primary hover:bg-surface-dark/80 transition-colors shadow-sm border border-white/10"
            >
              <span className="font-label-lg text-xs text-on-primary font-semibold">
                Skip
              </span>
            </button>
          </header>

          {/* Slide Preview Quick Switchers (Interactive Top Indicator Pills) */}
          <div className="flex items-center justify-center gap-2 py-2">
            {["01 Discover", "02 Plan", "03 Journey"].map((label, idx) => {
              const isActive = idx === currentSlide;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentSlide(idx)}
                  className={`px-2.5 py-1 rounded-full backdrop-blur-md transition-all text-label-badge font-label-badge flex items-center gap-1.5 shadow-sm border ${
                    isActive
                      ? "bg-surface-dark/90 text-on-primary border-white/20"
                      : "bg-surface-dark/40 text-on-primary/60 hover:text-on-primary border-white/5"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full inline-block ${
                      isActive ? "bg-primary-container" : "bg-on-primary/40"
                    }`}
                  />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Bottom Presentation Area */}
          <div className="flex flex-col w-full gap-4 mt-auto">
            {/* Dark Glass Card */}
            <section className="w-full rounded-[20px] bg-surface-dark/75 backdrop-blur-xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between border border-white/10 text-on-primary">
              {/* Social Proof Pill + Step Counter */}
              <div className="flex items-center justify-between mb-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-dark/80 text-on-primary border border-white/10">
                  <span className="material-symbols-outlined text-urgency-amber text-xs">
                    verified
                  </span>
                  <span className="font-label-badge text-label-badge tracking-wider uppercase text-on-primary">
                    {slide.pill}
                  </span>
                </div>
                <span className="font-label-badge text-label-badge text-text-secondary tracking-widest uppercase">
                  {slide.counter}
                </span>
              </div>

              {/* Dynamic Text Content */}
              <div className="min-h-[120px] flex flex-col justify-center">
                <h2 className="font-headline-lg text-xl md:text-2xl text-on-primary tracking-tight transition-all duration-300">
                  {slide.heading}
                </h2>
                <p className="font-body-md text-xs md:text-sm text-surface-container-highest mt-1.5 leading-relaxed">
                  {slide.body}
                </p>
              </div>

              {/* Feature Tag Ribbon */}
              <div className="flex flex-wrap gap-1.5 mt-3 pt-1">
                {slide.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-0.5 rounded-full bg-surface-dark/80 text-surface-variant font-label-badge text-[11px] border border-white/5"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Pagination Dots + Arrows */}
              <div className="flex items-center justify-between w-full mt-4 pt-1">
                {/* 3 Indicator Dots */}
                <div
                  aria-label="Slide indicators"
                  className="flex items-center gap-2"
                  role="tablist"
                >
                  {SLIDES.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      aria-label={`Go to Slide ${idx + 1}`}
                      onClick={() => setCurrentSlide(idx)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        idx === currentSlide
                          ? "w-8 bg-primary-container"
                          : "w-2 bg-on-primary/40 hover:bg-on-primary/60"
                      }`}
                    />
                  ))}
                </div>

                {/* Navigation Arrows */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Previous Slide"
                    disabled={currentSlide === 0}
                    onClick={handlePrev}
                    className={`w-9 h-9 rounded-full bg-surface-dark/80 text-on-primary flex items-center justify-center transition-colors shadow-sm border border-white/10 ${
                      currentSlide === 0
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-surface-dark active:scale-95"
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">
                      arrow_back
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label="Next Slide"
                    onClick={handleNext}
                    className="w-9 h-9 rounded-full bg-surface-dark/80 hover:bg-surface-dark active:scale-95 text-on-primary flex items-center justify-center transition-colors shadow-sm border border-white/10"
                  >
                    <span className="material-symbols-outlined text-base">
                      arrow_forward
                    </span>
                  </button>
                </div>
              </div>
            </section>

            {/* Action Footer Stack */}
            <div className="flex flex-col w-full gap-2 items-center">
              {/* Primary Flat Red Button */}
              <button
                type="button"
                id="primary-cta-btn"
                onClick={handleNext}
                className="w-full py-3.5 px-6 rounded-xl bg-primary-container hover:bg-primary active:bg-surface-tint text-on-primary font-headline-sm text-sm uppercase tracking-wide flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99]"
              >
                <span>{slide.cta}</span>
                <span className="material-symbols-outlined text-base">
                  arrow_forward
                </span>
              </button>

              {/* Secondary CTA Link */}
              <button
                type="button"
                onClick={completeOnboardingAndNavigate}
                className="w-full py-2 text-center text-on-primary/80 hover:text-on-primary font-label-lg text-xs transition-colors focus:outline-none"
              >
                Already have an account?{" "}
                <span className="font-bold text-on-primary underline underline-offset-4 decoration-primary-container">
                  Log in
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
