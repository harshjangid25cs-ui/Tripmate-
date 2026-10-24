"use client";

import React from "react";

export type MascotState = "idle" | "listening" | "thinking" | "speaking";

interface MascotAvatarProps {
  state?: MascotState;
  size?: "sm" | "md" | "lg" | number;
  className?: string;
  showRings?: boolean;
}

export function MascotAvatar({
  state = "idle",
  size = "md",
  className = "",
  showRings = true,
}: MascotAvatarProps) {
  // Compute pixel dimensions based on size prop
  const pixelSize =
    typeof size === "number"
      ? size
      : size === "sm"
      ? 36
      : size === "lg"
      ? 72
      : 52;

  // Animation classes per state
  const stateContainerClasses = {
    idle: "animate-[pulse_3s_ease-in-out_infinite] motion-safe:translate-y-0.5",
    listening: "ring-4 ring-[#FF5E1E]/40 animate-pulse",
    thinking: "-rotate-6 transition-transform duration-300",
    speaking: "scale-105 transition-transform duration-200",
  }[state];

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${stateContainerClasses} ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
      role="img"
      aria-label={`TripMate AI Companion Mascot - ${state}`}
    >
      {/* Listening Outer Ripple Rings */}
      {state === "listening" && showRings && (
        <span
          className="absolute inset-0 rounded-full border-2 border-[#FF5E1E] opacity-75 animate-ping"
          style={{ animationDuration: "1.5s" }}
        />
      )}

      {/* Thinking Floating Bouncing Dots */}
      {state === "thinking" && (
        <div className="absolute -top-3 right-0 flex items-center gap-1 bg-[#1F1F1E] text-white px-1.5 py-0.5 rounded-full shadow-md z-10 text-[9px]">
          <span className="w-1 h-1 rounded-full bg-[#FF5E1E] animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-1 h-1 rounded-full bg-[#FFFFFF] animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-1 h-1 rounded-full bg-[#FF5E1E] animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      )}

      {/* SVG Vector Mascot Representation (Figma Node 8-2 Plush Blue Mascot) */}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm overflow-visible"
      >
        {/* Plush Ears */}
        {/* Left Ear */}
        <circle cx="28" cy="24" r="14" fill="#2563EB" />
        <circle cx="28" cy="24" r="8" fill="#1D4ED8" />
        <path
          d="M 22 17 Q 28 13 34 17"
          stroke="#93C5FD"
          strokeWidth="1.5"
          strokeDasharray="2 2"
          fill="none"
        />

        {/* Right Ear */}
        <circle cx="72" cy="24" r="14" fill="#2563EB" />
        <circle cx="72" cy="24" r="8" fill="#1D4ED8" />
        <path
          d="M 66 17 Q 72 13 78 17"
          stroke="#93C5FD"
          strokeWidth="1.5"
          strokeDasharray="2 2"
          fill="none"
        />

        {/* Mascot Main Head / Body (Soft Plush Blue #3B82F6) */}
        <ellipse cx="50" cy="54" rx="38" ry="36" fill="#3B82F6" />
        {/* Bottom plush volume tone */}
        <path
          d="M 18 56 C 20 78 34 88 50 88 C 66 88 80 78 82 56 C 74 62 62 65 50 65 C 38 65 26 62 18 56 Z"
          fill="#2563EB"
        />

        {/* Tactile Plush Stitching on forehead */}
        <path
          d="M 42 22 Q 50 20 58 22"
          stroke="#93C5FD"
          strokeWidth="1.5"
          strokeDasharray="2.5 2.5"
          fill="none"
        />

        {/* Cheeks Blush (Warm Coral Blush) */}
        <circle cx="27" cy="58" r="6" fill="#FF8A65" fillOpacity="0.85" />
        <circle cx="73" cy="58" r="6" fill="#FF8A65" fillOpacity="0.85" />

        {/* Expressive Glossy Dark Eyes */}
        {/* Left Eye */}
        <circle cx="37" cy="46" r="6.5" fill="#1F1F1E" />
        <circle cx="39" cy="44" r="2.2" fill="#FFFFFF" />
        <circle cx="35" cy="48" r="1" fill="#FFFFFF" />

        {/* Right Eye */}
        <circle cx="63" cy="46" r="6.5" fill="#1F1F1E" />
        <circle cx="65" cy="44" r="2.2" fill="#FFFFFF" />
        <circle cx="61" cy="48" r="1" fill="#FFFFFF" />

        {/* Button Nose */}
        <ellipse cx="50" cy="50" rx="3.5" ry="2.5" fill="#1D4ED8" />

        {/* Mouth / Speaking Expression */}
        {state === "speaking" ? (
          // Animated Speaking Waveform Mouth
          <g>
            <path
              d="M 43 56 Q 50 64 57 56"
              fill="#FF5E1E"
              stroke="#1F1F1E"
              strokeWidth="2"
            />
            {/* Mini sound waveform bars inside or below mouth */}
            <line x1="46" y1="58" x2="46" y2="61" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="50" y1="57" x2="50" y2="63" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="54" y1="58" x2="54" y2="61" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        ) : state === "listening" ? (
          // Attentive "O" listening mouth
          <circle cx="50" cy="58" r="3.5" fill="#1F1F1E" />
        ) : (
          // Gentle plush smile
          <path
            d="M 44 56 Q 50 61 56 56"
            stroke="#1F1F1E"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* Tactile Travel Bandana / Scarf in TripMate Orange (#FF5E1E) */}
        <path
          d="M 28 78 Q 50 94 72 78 Q 62 88 50 89 Q 38 88 28 78 Z"
          fill="#FF5E1E"
        />
        {/* Bandana Knot and travel badge */}
        <circle cx="50" cy="85" r="3.5" fill="#FF5E1E" stroke="#FFFFFF" strokeWidth="1" />
        {/* Small gold compass star on bandana */}
        <path
          d="M 50 83 L 51 84.5 L 52.5 85 L 51 85.5 L 50 87 L 49 85.5 L 47.5 85 L 49 84.5 Z"
          fill="#FFFFFF"
        />
      </svg>
    </div>
  );
}
