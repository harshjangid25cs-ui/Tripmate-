import { unstable_cache } from "next/cache";

/**
 * Canonical cache tags and TTL constants for public catalog ISR caching.
 */
export const CATALOG_TAGS = {
  ALL: "catalog",
  DESTINATIONS: "catalog:destinations",
  CIRCUITS: "catalog:circuits",
  HOTELS: "catalog:hotels",
  VEHICLES: "catalog:vehicles",
  STOPS: "catalog:stops",
} as const;

export const PUBLIC_CATALOG_TTL_SECONDS = 300; // 5 minutes tagged ISR

/**
 * Safe wrapper around Next.js unstable_cache with automatic fallback for
 * Vitest unit tests and non-Next runtime environments.
 */
export function createCachedCatalogReader<Args extends unknown[], Return>(
  fetcher: (...args: Args) => Promise<Return>,
  keyParts: string[],
  options: {
    revalidate?: number;
    tags?: string[];
  }
): (...args: Args) => Promise<Return> {
  // In Vitest or non-Next test environments, execute fetcher directly to prevent invariant errors
  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    return fetcher;
  }

  try {
    const cached = unstable_cache(fetcher, keyParts, {
      revalidate: options.revalidate ?? PUBLIC_CATALOG_TTL_SECONDS,
      tags: options.tags ?? [CATALOG_TAGS.ALL],
    });

    return async (...args: Args): Promise<Return> => {
      try {
        return (await cached(...args)) as Return;
      } catch {
        // Graceful fallback to raw fetcher on cache layer transient error
        return await fetcher(...args);
      }
    };
  } catch {
    return fetcher;
  }
}
