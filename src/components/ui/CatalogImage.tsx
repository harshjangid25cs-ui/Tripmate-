"use client";

import React, { useState } from "react";
import Image, { type ImageProps } from "next/image";
import { resolveCatalogImageUrl } from "@/lib/data/images";

export interface CatalogImageProps extends Omit<ImageProps, "src"> {
  src: string | null | undefined;
  fallbackSrc?: string;
}

/**
 * Shared Catalog Image component.
 * Automatically resolves Supabase storage paths vs external/direct URLs.
 * Sets unoptimized={true} and fast loading on external URLs to avoid proxy delay
 * and domain configuration blocking.
 */
export function CatalogImage({
  src,
  alt,
  fallbackSrc = "/images/placeholder.jpg",
  unoptimized,
  onError,
  ...props
}: CatalogImageProps) {
  const [hasError, setHasError] = useState(false);

  const rawUrl = hasError || !src ? fallbackSrc : src;
  const resolvedUrl = resolveCatalogImageUrl(rawUrl) || rawUrl || fallbackSrc;
  const isExternal =
    typeof resolvedUrl === "string" &&
    (resolvedUrl.startsWith("http://") || resolvedUrl.startsWith("https://"));

  return (
    <Image
      {...props}
      src={resolvedUrl}
      alt={alt || "TripMate Catalog Asset"}
      unoptimized={unoptimized ?? isExternal}
      onError={(e) => {
        setHasError(true);
        if (onError) onError(e);
      }}
    />
  );
}

export default CatalogImage;
