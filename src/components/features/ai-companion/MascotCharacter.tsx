"use client";

import React, { useState } from "react";
import Image from "next/image";

export type MascotState = "idle" | "listening" | "guiding" | "success" | "thinking" | "speaking";

export interface MascotCharacterProps {
  state?: MascotState;
  size?: "sm" | "md" | "lg" | number;
  className?: string;
  showRings?: boolean;
  showSpeechBubble?: boolean;
  preferImage?: boolean;
}

const FALLBACK_IMAGES: Record<"idle" | "listening" | "guiding" | "success", string> = {
  idle: "/images/mascot-idle.png",
  listening: "/images/mascot-listening.png",
  guiding: "/images/mascot-guiding.png",
  success: "/images/mascot-success.png",
};

export function MascotCharacter({
  state = "idle",
  size = "md",
  className = "",
  showRings = true,
  showSpeechBubble = true,
  preferImage = false,
}: MascotCharacterProps) {
  const [imageError, setImageError] = useState(false);

  // Normalize state: map thinking/speaking to guiding
  const normalizedState: "idle" | "listening" | "guiding" | "success" =
    state === "thinking" || state === "speaking" ? "guiding" : state;

  const pixelSize =
    typeof size === "number"
      ? size
      : size === "sm"
      ? 36
      : size === "lg"
      ? 84
      : 64;

  // Animation classes mapped to the state specs
  const stateAnimationClasses = {
    idle: "animate-[bounce-slow_3s_infinite_ease-in-out]",
    listening: "-rotate-2 scale-[1.03] transition-transform duration-200",
    guiding: "animate-[wave_1s_infinite] transition-transform duration-200",
    success: "animate-[scale-up_0.4s_ease-out]",
  }[normalizedState];

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${stateAnimationClasses} ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
      role="img"
      aria-label={`TripMate AI Mascot Matey - ${normalizedState}`}
      data-testid={`mascot-character-${normalizedState}`}
    >
      {/* Listening Aqua/Cyan Ripple Rings projecting around the bulky headphones */}
      {normalizedState === "listening" && showRings && (
        <div className="absolute inset-[-14%] flex items-center justify-between pointer-events-none" aria-hidden="true">
          {/* Left Headphone Ripple Ring 1 */}
          <span
            className="absolute left-[-8px] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 border-[#22D3EE] opacity-75 animate-ping"
            style={{ animationDuration: "2s" }}
          />
          {/* Left Headphone Ripple Ring 2 */}
          <span
            className="absolute left-[-16px] top-1/2 -translate-y-1/2 w-12 h-12 rounded-full border border-[#06B6D4] opacity-50 animate-ping"
            style={{ animationDuration: "2s", animationDelay: "300ms" }}
          />
          {/* Right Headphone Ripple Ring 1 */}
          <span
            className="absolute right-[-8px] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 border-[#22D3EE] opacity-75 animate-ping"
            style={{ animationDuration: "2s" }}
          />
          {/* Right Headphone Ripple Ring 2 */}
          <span
            className="absolute right-[-16px] top-1/2 -translate-y-1/2 w-12 h-12 rounded-full border border-[#06B6D4] opacity-50 animate-ping"
            style={{ animationDuration: "2s", animationDelay: "300ms" }}
          />
        </div>
      )}

      {/* Sparkly Star Patterns for Success State */}
      {normalizedState === "success" && (
        <div className="absolute inset-0 pointer-events-none z-10" aria-hidden="true">
          {/* Top Left Star */}
          <span
            className="absolute -top-2 -left-2 text-[#FBBF24] text-xs animate-[bounce-in_0.3s_ease-out] select-none"
            style={{ animationDelay: "50ms" }}
          >
            ✦
          </span>
          {/* Top Right Big Star */}
          <span
            className="absolute -top-3 -right-2 text-[#F59E0B] text-base animate-[bounce-in_0.3s_ease-out] select-none"
            style={{ animationDelay: "150ms" }}
          >
            ✦
          </span>
          {/* Mid Right Small Star */}
          <span
            className="absolute bottom-1 -right-3 text-[#FBBF24] text-xs animate-[bounce-in_0.3s_ease-out] select-none"
            style={{ animationDelay: "250ms" }}
          >
            ✦
          </span>
        </div>
      )}

      {/* Mini Speech Bubble for Guiding State: "Let's go explore!" */}
      {normalizedState === "guiding" && showSpeechBubble && (
        <div
          className="absolute -top-7 -right-14 z-20 bg-[#FFFFFF] border border-[#1F1F1E] text-[#1F1F1E] text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md whitespace-nowrap animate-bounce-in flex items-center gap-1"
          role="status"
        >
          <span>Let&apos;s go explore!</span>
        </div>
      )}

      {/* Image Fallback Mode (Next.js Image) if preferred and not errored */}
      {preferImage && !imageError ? (
        <Image
          src={FALLBACK_IMAGES[normalizedState]}
          alt={`Matey ${normalizedState}`}
          width={pixelSize}
          height={pixelSize}
          className="w-full h-full object-contain"
          onError={() => setImageError(true)}
          priority={normalizedState === "idle"}
        />
      ) : (
        /* High-Fidelity 3D Plush Mascot Vector Representation (Image 5 Reference Match) */
        <svg
          viewBox="0 0 256 256"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-sm overflow-visible"
        >
          {/* Drop Shadow Underneath */}
          <ellipse cx="128" cy="226" rx="64" ry="12" fill="#000000" fillOpacity="0.12" />

          {/* Off-White Fluffy Headband Arch across top */}
          <path
            d="M 46 112 C 46 56 82 28 128 28 C 174 28 210 56 210 112"
            stroke="#F5F3ED"
            strokeWidth="24"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 46 112 C 46 56 82 28 128 28 C 174 28 210 56 210 112"
            stroke="#EBE7DE"
            strokeWidth="18"
            strokeLinecap="round"
            fill="none"
          />

          {/* Character Body & Paws */}
          <g transform={normalizedState === "guiding" ? "rotate(2 128 140)" : ""}>
            {/* Main Round Plush Blue Body */}
            <circle cx="128" cy="142" r="76" fill="#1650DD" />
            <circle cx="128" cy="138" r="72" fill="#2563EB" />
            <ellipse cx="128" cy="98" rx="42" ry="24" fill="#3B82F6" fillOpacity="0.5" />

            {/* Left Plush Hand */}
            <circle cx="56" cy="180" r="18" fill="#1D4ED8" />
            <circle cx="56" cy="178" r="16" fill="#2563EB" />

            {/* Right Plush Hand (Waving when guiding) */}
            {normalizedState === "guiding" ? (
              <g transform="translate(196, 142) rotate(-35)">
                <ellipse cx="0" cy="0" rx="16" ry="22" fill="#1D4ED8" />
                <ellipse cx="-2" cy="-2" rx="14" ry="19" fill="#2563EB" />
              </g>
            ) : (
              <g>
                <circle cx="200" cy="180" r="18" fill="#1D4ED8" />
                <circle cx="200" cy="178" r="16" fill="#2563EB" />
              </g>
            )}

            {/* Face Expressions */}
            {normalizedState === "success" ? (
              // Joyful Curved Eyes (^ ^)
              <g>
                <path
                  d="M 96 136 Q 106 122 116 136"
                  stroke="#1F1F1E"
                  strokeWidth="6"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M 140 136 Q 150 122 160 136"
                  stroke="#1F1F1E"
                  strokeWidth="6"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M 116 150 Q 128 166 140 150"
                  stroke="#1F1F1E"
                  strokeWidth="5"
                  strokeLinecap="round"
                  fill="#FF5E1E"
                />
              </g>
            ) : (
              // Glossy Black Bead Eyes
              <g>
                {/* Left Eye */}
                <circle cx="106" cy="134" r="14" fill="#1F1F1E" />
                <circle cx="111" cy="129" r="5" fill="#FFFFFF" />
                <circle cx="103" cy="138" r="2.5" fill="#FFFFFF" />

                {/* Right Eye */}
                <circle cx="150" cy="134" r="14" fill="#1F1F1E" />
                <circle cx="155" cy="129" r="5" fill="#FFFFFF" />
                <circle cx="147" cy="138" r="2.5" fill="#FFFFFF" />

                {/* Mouth Expression */}
                {normalizedState === "guiding" ? (
                  // Open Cheerful Talking Smile
                  <g>
                    <path d="M 120 152 Q 128 168 136 152 Z" fill="#1F1F1E" />
                    <path d="M 123 158 Q 128 166 133 158 Z" fill="#FF5E1E" />
                  </g>
                ) : normalizedState === "listening" ? (
                  // Attentive Listening Small O-Mouth
                  <ellipse cx="128" cy="154" rx="6" ry="7" fill="#1F1F1E" />
                ) : (
                  // Gentle Happy Smile
                  <path
                    d="M 118 152 Q 128 162 138 152"
                    stroke="#1F1F1E"
                    strokeWidth="5"
                    strokeLinecap="round"
                    fill="none"
                  />
                )}
              </g>
            )}

            {/* Cheeks Warm Coral Blush */}
            <circle cx="86" cy="150" r="10" fill="#FF8A65" fillOpacity="0.6" />
            <circle cx="170" cy="150" r="10" fill="#FF8A65" fillOpacity="0.6" />
          </g>

          {/* Bulky Fluffy Cream Fleece Earmuffs (Left & Right) */}
          {/* Left Earmuff */}
          <g>
            <ellipse cx="44" cy="122" rx="28" ry="36" fill="#DAD5C8" />
            <ellipse cx="44" cy="120" rx="26" ry="34" fill="#EBE7DE" />
            <ellipse cx="44" cy="118" rx="22" ry="30" fill="#F5F3ED" />
            <circle cx="28" cy="104" r="9" fill="#F5F3ED" />
            <circle cx="24" cy="120" r="10" fill="#F5F3ED" />
            <circle cx="28" cy="136" r="9" fill="#F5F3ED" />
            <circle cx="58" cy="104" r="8" fill="#F5F3ED" />
            <circle cx="62" cy="120" r="9" fill="#F5F3ED" />
            <circle cx="58" cy="136" r="8" fill="#F5F3ED" />
          </g>

          {/* Right Earmuff */}
          <g>
            <ellipse cx="212" cy="122" rx="28" ry="36" fill="#DAD5C8" />
            <ellipse cx="212" cy="120" rx="26" ry="34" fill="#EBE7DE" />
            <ellipse cx="212" cy="118" rx="22" ry="30" fill="#F5F3ED" />
            <circle cx="228" cy="104" r="9" fill="#F5F3ED" />
            <circle cx="232" cy="120" r="10" fill="#F5F3ED" />
            <circle cx="228" cy="136" r="9" fill="#F5F3ED" />
            <circle cx="198" cy="104" r="8" fill="#F5F3ED" />
            <circle cx="194" cy="120" r="9" fill="#F5F3ED" />
            <circle cx="198" cy="136" r="8" fill="#F5F3ED" />
          </g>
        </svg>
      )}
    </div>
  );
}
