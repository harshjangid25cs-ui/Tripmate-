"use client";

import React, { useState } from "react";
import Image, { type ImageProps } from "next/image";
import { resolveCatalogImageUrl } from "@/lib/data/images";

export interface CatalogImageProps extends Omit<ImageProps, "src"> {
  src: string | null | undefined;
  fallbackSrc?: string;
  priority?: boolean;
}

/**
 * Shared Catalog Image component.
 * Automatically resolves Supabase storage paths vs external/direct URLs.
 * Sets unoptimized={true} and fast loading on external URLs to avoid proxy delay
 * and domain configuration blocking.
 * Supports smart priority, lazy loading, async decoding, and flat background placeholder to prevent CLS.
 */
export function CatalogImage({
  src,
  alt,
  fallbackSrc = "/images/placeholder.jpg",
  priority = false,
  unoptimized,
  className,
  onError,
  ...props
}: CatalogImageProps) {
  const [hasError, setHasError] = useState(false);

  const rawUrl = hasError || !src ? fallbackSrc : src;
  const resolvedUrl = resolveCatalogImageUrl(rawUrl) || rawUrl || fallbackSrc;
  const isExternal =
    typeof resolvedUrl === "string" &&
    (resolvedUrl.startsWith("http://") || resolvedUrl.startsWith("https://"));

  const combinedClassName = `bg-slate-100 ${className || ""}`.trim();

  return (
    <Image
      {...props}
      src={resolvedUrl}
      alt={alt || "TripMate Catalog Asset"}
      className={combinedClassName}
      priority={priority}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      unoptimized={unoptimized ?? isExternal}
      onError={(e) => {
        setHasError(true);
        if (onError) onError(e);
      }}
    />
  );
}

export default CatalogImage;
