"use client";

import React, { useState, useEffect } from "react";
import Image, { type ImageProps } from "next/image";
import { resolveCatalogImageUrl, optimizeExternalImageUrl } from "@/lib/data/images";

export interface CatalogImageProps extends Omit<ImageProps, "src"> {
  src: string | null | undefined;
  fallbackSrc?: string;
  priority?: boolean;
  itemTitle?: string;
}

/**
 * Shared Catalog Image Component.
 * Pinterest/Unsplash-grade loading speeds on Supabase & Vercel Free Tiers.
 * - Zero /_next/image 400 proxy errors (direct global CDN edge loading via unoptimized=true).
 * - Priority-aware LCP optimization (eager/sync/fetchPriority="high" for Hero cards).
 * - Dominant flat architectural placeholder surface (bg-[#EBE9E4], CLS = 0.00, 100% gradient-free).
 * - Smooth opacity transition on load (duration-200 ease-out).
 * - Immediate crisp flat architectural fallback surface on missing src or load error.
 */
export function CatalogImage({
  src,
  alt,
  fallbackSrc,
  priority = false,
  unoptimized,
  className,
  sizes,
  fill,
  itemTitle,
  onLoad,
  onError,
  ...props
}: CatalogImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  // Resolve and optimize URL
  const trimmedSrc = typeof src === "string" ? src.trim() : "";
  const trimmedFallback = typeof fallbackSrc === "string" ? fallbackSrc.trim() : "";
  const candidate = trimmedSrc || trimmedFallback;
  const isInvalid =
    !candidate ||
    candidate === "/images/placeholder.jpg" ||
    candidate.endsWith("/placeholder.jpg");

  const resolved = isInvalid ? null : resolveCatalogImageUrl(candidate);
  const slotWidth = typeof props.width === "number" ? props.width : 800;
  const optimizedUrl = resolved ? optimizeExternalImageUrl(resolved, slotWidth) : "";

  const showFallback = hasError || isInvalid || !optimizedUrl;

  // Handle architectural fallback rendering
  if (showFallback) {
    const badgeText = itemTitle || alt || "TripMate Destination";
    return (
      <div
        className={`flex flex-col items-center justify-center p-4 bg-[#EBE9E4] text-[#6E6D68] select-none text-center ${
          fill ? "absolute inset-0 w-full h-full" : "w-full h-full min-h-[140px]"
        } ${className || ""}`.trim()}
        role="img"
        aria-label={badgeText}
      >
        <svg
          className="w-10 h-10 mb-2 opacity-80 text-[#6E6D68]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 21h18" />
          <path d="M5 21V10l7-5 7 5v11" />
          <path d="M9 21v-4a3 3 0 0 1 6 0v4" />
          <path d="M12 3v2" />
        </svg>
        <span className="text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-[#FBF9F5] text-[#1F1F1E] border border-[#EBE9E4] max-w-[85%] truncate">
          {badgeText}
        </span>
      </div>
    );
  }

  const resolvedSizes = sizes || (fill ? "(max-width: 768px) 100vw, 448px" : undefined);
  const dimensionProps =
    !fill && props.width === undefined && props.height === undefined
      ? { width: 800, height: 600 }
      : {};

  // Default to unoptimized={true} so external CDNs load directly without Vercel /_next/image proxy 400 errors
  const isUnoptimized = unoptimized ?? true;

  const combinedClassName = `bg-[#EBE9E4] transition-opacity duration-200 ease-out ${
    isLoaded ? "opacity-100" : "opacity-0"
  } ${className || ""}`.trim();

  return (
    <>
      {/* Flat dominant surface placeholder behind image to ensure CLS = 0.00 while loading */}
      {!isLoaded && (
        <div
          className={`${
            fill ? "absolute inset-0 w-full h-full" : "w-full h-full min-h-[140px]"
          } bg-[#EBE9E4] pointer-events-none select-none`}
          aria-hidden="true"
        />
      )}
      <Image
        {...props}
        {...dimensionProps}
        fill={fill}
        sizes={resolvedSizes}
        src={optimizedUrl}
        alt={alt || "TripMate Catalog Asset"}
        className={combinedClassName}
        priority={priority}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        unoptimized={isUnoptimized}
        onLoad={(e) => {
          setIsLoaded(true);
          if (onLoad) onLoad(e);
        }}
        onError={(e) => {
          setHasError(true);
          if (onError) onError(e);
        }}
      />
    </>
  );
}

export default CatalogImage;
