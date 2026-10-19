"use client";

import React, { useState, useEffect } from "react";
import Image, { type ImageProps } from "next/image";
import { resolveCatalogImageUrl } from "@/lib/data/images";

export interface CatalogImageProps extends Omit<ImageProps, "src"> {
  src: string | null | undefined;
  fallbackSrc?: string;
  priority?: boolean;
}

const DEFAULT_FALLBACK_SRC = "/placeholder.svg";

/**
 * Solid flat data URI fallback (matching design.md #FBF9F5 with zero gradients).
 * Used if static placeholder asset is unreachable or triggers network error.
 */
const SOLID_FALLBACK_DATA_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600' width='800' height='600'%3E%3Crect width='100%25' height='100%25' fill='%23FBF9F5'/%3E%3Ccircle cx='400' cy='240' r='48' fill='%23E8E2D8'/%3E%3Cpath d='M200 440 L340 280 L440 380 L520 300 L640 440 Z' fill='%23D5C3B2'/%3E%3Cpath d='M160 480 L300 340 L400 430 L480 360 L600 480 Z' fill='%23E8E2D8' opacity='0.6'/%3E%3Ctext x='400' y='520' text-anchor='middle' font-family='sans-serif' font-size='16' font-weight='600' fill='%238D7B68' letter-spacing='1'%3ETRIPMATE%3C/text%3E%3C/svg%3E";

function isConfiguredDomain(url: string): boolean {
  if (!url) return false;
  // SVGs, data URIs, and placeholder assets must NEVER be routed to Next.js /_next/image (causes 400 Bad Request)
  if (
    url.startsWith("data:") ||
    url.toLowerCase().endsWith(".svg") ||
    url.toLowerCase().includes(".svg?") ||
    url.includes("placeholder")
  ) {
    return false;
  }
  if (url.startsWith("/")) return true;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (
      host === "images.unsplash.com" ||
      host === "lh3.googleusercontent.com" ||
      host.endsWith(".supabase.co") ||
      host === "127.0.0.1" ||
      host === "localhost"
    ) {
      return true;
    }
    const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (envUrl) {
      const envHost = new URL(envUrl).hostname.toLowerCase();
      if (host === envHost) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Shared Catalog Image component.
 * Automatically resolves Supabase storage paths vs external/direct URLs.
 * Enables Next.js AVIF/WebP image optimization on configured domains,
 * while safely falling back to unoptimized on unknown origins, missing assets,
 * or broken URLs to prevent 400/500 errors in the Network tab.
 * Renders a solid flat design surface (bg-slate-100 / #FBF9F5 matching design.md)
 * to guarantee zero Cumulative Layout Shift (CLS < 0.1).
 */
export function CatalogImage({
  src,
  alt,
  fallbackSrc = DEFAULT_FALLBACK_SRC,
  priority = false,
  unoptimized,
  className,
  sizes,
  fill,
  onError,
  ...props
}: CatalogImageProps) {
  const [imgSrc, setImgSrc] = useState<string | null | undefined>(src);
  const [hasError, setHasError] = useState(false);

  // Synchronize internal state when src prop updates
  useEffect(() => {
    setImgSrc(src);
    setHasError(false);
  }, [src]);

  const isMissing = !imgSrc || (typeof imgSrc === "string" && !imgSrc.trim());
  const effectiveFallback = fallbackSrc || DEFAULT_FALLBACK_SRC;
  const isFallbackActive = hasError || isMissing;

  const rawUrl = isFallbackActive ? effectiveFallback : imgSrc;
  const resolvedUrl =
    (isFallbackActive ? rawUrl : resolveCatalogImageUrl(rawUrl) || rawUrl) ||
    effectiveFallback;

  // Next.js Image optimization check:
  // SVGs, data URIs, placeholders, and unconfigured external domains must bypass /_next/image proxy
  const isDomainConfigured =
    typeof resolvedUrl === "string" && isConfiguredDomain(resolvedUrl);
  const shouldOptimize = !isFallbackActive && isDomainConfigured;
  const isUnoptimized = isFallbackActive || (unoptimized ?? !shouldOptimize);

  // Flat design surface background matching design.md (bg-slate-100 / #FBF9F5)
  const combinedClassName =
    `bg-slate-100 bg-[#FBF9F5] bg-surface-container transition-opacity duration-300 ${className || ""}`.trim();
  const resolvedSizes =
    sizes || (fill ? "(max-width: 768px) 100vw, 448px" : undefined);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true);
    // If the primary fallback asset itself fails, switch to inline data URI to prevent endless loop
    if (imgSrc === effectiveFallback) {
      setImgSrc(SOLID_FALLBACK_DATA_URI);
    } else {
      setImgSrc(effectiveFallback);
    }
    if (onError) onError(e);
  };

  // Safe dimension fallback: if neither fill nor explicit width/height is passed,
  // supply sensible defaults to prevent Next.js image validation crashes.
  const dimensionProps =
    !fill && props.width === undefined && props.height === undefined
      ? { width: 800, height: 600 }
      : {};

  return (
    <Image
      {...props}
      {...dimensionProps}
      fill={fill}
      sizes={resolvedSizes}
      src={resolvedUrl}
      alt={alt || "TripMate Catalog Asset"}
      className={combinedClassName}
      priority={priority}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      unoptimized={isUnoptimized}
      onError={handleError}
    />
  );
}

export default CatalogImage;
