"use client";

import React, { useState } from "react";
import Image, { type ImageProps } from "next/image";
import { resolveCatalogImageUrl } from "@/lib/data/images";

export interface CatalogImageProps extends Omit<ImageProps, "src"> {
  src: string | null | undefined;
  fallbackSrc?: string;
  priority?: boolean;
}

function isConfiguredDomain(url: string): boolean {
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
 * Enables Next.js AVIF/WebP image optimization and responsive srcset on configured domains,
 * while safely falling back to unoptimized on unknown origins to prevent build errors.
 * Uses theme surface token to eliminate Cumulative Layout Shift (CLS < 0.1).
 */
export function CatalogImage({
  src,
  alt,
  fallbackSrc = "/images/placeholder.jpg",
  priority = false,
  unoptimized,
  className,
  sizes,
  fill,
  onError,
  ...props
}: CatalogImageProps) {
  const [hasError, setHasError] = useState(false);

  const rawUrl = hasError || !src ? fallbackSrc : src;
  const resolvedUrl = resolveCatalogImageUrl(rawUrl) || rawUrl || fallbackSrc;
  
  const shouldOptimize =
    typeof resolvedUrl === "string" && isConfiguredDomain(resolvedUrl);

  const combinedClassName = `bg-surface-container transition-opacity duration-300 ${className || ""}`.trim();
  const resolvedSizes = sizes || (fill ? "(max-width: 768px) 100vw, 448px" : undefined);

  return (
    <Image
      {...props}
      fill={fill}
      sizes={resolvedSizes}
      src={resolvedUrl}
      alt={alt || "TripMate Catalog Asset"}
      className={combinedClassName}
      priority={priority}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      unoptimized={unoptimized ?? !shouldOptimize}
      onError={(e) => {
        setHasError(true);
        if (onError) onError(e);
      }}
    />
  );
}

export default CatalogImage;
