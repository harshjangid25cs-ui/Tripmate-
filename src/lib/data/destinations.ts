import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type DestinationRow = Database["public"]["Tables"]["destinations"]["Row"];
type HighlightRow = Database["public"]["Tables"]["destination_highlights"]["Row"];
type CircuitRow = Database["public"]["Tables"]["circuits"]["Row"];

export interface Destination {
  id: string;
  slug: string;
  name: string;
  region: string;
  tagline: string;
  description: string;
  heroImagePath: string | null;
  startingPrice: number;
  rating: number;
  reviewCount: number;
  recommendedDays: string;
  bestSeason: string;
  badge: string;
  categories: string[];
  originLabel: string;
  driveHours: number;
  driveKm: number;
  isFeatured: boolean;
  isBookable: boolean;
  isActive: boolean;
}

export interface DestinationHighlight {
  id: string;
  destinationId: string;
  title: string;
  category: string;
  durationText: string;
  badge: string;
  sortOrder: number;
}

export interface Circuit {
  id: string;
  destinationId: string;
  destinationName?: string;
  destinationSlug?: string;
  title: string;
  days: number;
  nights: number;
  summary: string;
  description: string;
  basePricePerPerson: number;
  rating: number;
  badge: string;
  categories: string[];
  isFeatured: boolean;
  imagePath: string | null;
  isActive: boolean;
}

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs = 5000): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
      if (typeof (timer as unknown as { unref?: () => void }).unref === "function") {
        (timer as unknown as { unref: () => void }).unref();
      }
    }),
  ]);
}

export async function getDestinations(category?: string): Promise<Destination[]> {
  try {
    const supabase = createClient();
    let query = supabase
      .from("destinations")
      .select(
        "id, slug, name, region, tagline, description, hero_image_path, starting_price, rating, review_count, recommended_days, best_season, badge, categories, origin_label, drive_hours, drive_km, is_featured, is_bookable, is_active"
      )
      .eq("is_active", true)
      .order("is_bookable", { ascending: false });

    if (category && category !== "all" && category !== "popular") {
      query = query.contains("categories", [category.toLowerCase()]);
    }

    const { data, error } = await withTimeout(query, 5000);
    if (error || !data || (data as unknown[]).length === 0) {
      if (error) console.error("Error fetching destinations:", error.message);
      return [];
    }

    const rows = data as unknown as DestinationRow[];
    return rows.map((d) => ({
      id: d.id,
      slug: d.slug,
      name: d.name,
      region: d.region ?? "",
      tagline: d.tagline ?? "",
      description: d.description ?? "",
      heroImagePath: d.hero_image_path,
      startingPrice: Number(d.starting_price ?? 0),
      rating: Number(d.rating ?? 0),
      reviewCount: d.review_count,
      recommendedDays: d.recommended_days ?? "3–4 Days",
      bestSeason: d.best_season ?? "Oct–Mar",
      badge: d.badge ?? "",
      categories: d.categories,
      originLabel: d.origin_label ?? "Delhi NCR",
      driveHours: Number(d.drive_hours ?? 0),
      driveKm: d.drive_km ?? 0,
      isFeatured: d.is_featured,
      isBookable: d.is_bookable,
      isActive: d.is_active,
    }));
  } catch (err) {
    console.error("Failed to query destinations from Supabase:", err);
    return [];
  }
}

export async function getDestinationBySlug(
  slug: string
): Promise<{ destination: Destination | null; highlights: DestinationHighlight[] }> {
  try {
    const supabase = createClient();
    const { data: rawD, error } = await withTimeout(
      supabase
        .from("destinations")
        .select(
          "id, slug, name, region, tagline, description, hero_image_path, starting_price, rating, review_count, recommended_days, best_season, badge, categories, origin_label, drive_hours, drive_km, is_featured, is_bookable, is_active"
        )
        .eq("slug", slug.toLowerCase())
        .single(),
      5000
    );

    const d = rawD as unknown as DestinationRow | null;

    if (error || !d || d.is_active === false) {
      if (error && error.code !== "PGRST116") {
        console.error(`Error fetching destination ${slug}:`, error.message);
      }
      return { destination: null, highlights: [] };
    }

    const { data: rawHighlights } = await withTimeout(
      supabase
        .from("destination_highlights")
        .select("id, destination_id, title, category, duration_text, badge, sort_order")
        .eq("destination_id", d.id)
        .order("sort_order", { ascending: true }),
      5000
    );

    const highlightRows = (rawHighlights ?? []) as unknown as HighlightRow[];

    const destination: Destination = {
      id: d.id,
      slug: d.slug,
      name: d.name,
      region: d.region ?? "",
      tagline: d.tagline ?? "",
      description: d.description ?? "",
      heroImagePath: d.hero_image_path,
      startingPrice: Number(d.starting_price ?? 0),
      rating: Number(d.rating ?? 0),
      reviewCount: d.review_count,
      recommendedDays: d.recommended_days ?? "3–4 Days",
      bestSeason: d.best_season ?? "Oct–Mar",
      badge: d.badge ?? "",
      categories: d.categories,
      originLabel: d.origin_label ?? "Delhi NCR",
      driveHours: Number(d.drive_hours ?? 0),
      driveKm: d.drive_km ?? 0,
      isFeatured: d.is_featured,
      isBookable: d.is_bookable,
      isActive: d.is_active,
    };

    const highlights: DestinationHighlight[] = highlightRows.map((h) => ({
      id: h.id,
      destinationId: h.destination_id,
      title: h.title,
      category: h.category ?? "",
      durationText: h.duration_text ?? "",
      badge: h.badge ?? "",
      sortOrder: h.sort_order,
    }));

    return { destination, highlights };
  } catch (err) {
    console.error(`Failed to query destination by slug ${slug}:`, err);
    return { destination: null, highlights: [] };
  }
}

export async function searchCircuits(params: {
  query?: string;
  category?: string;
  sort?: string;
}): Promise<Circuit[]> {
  const { query, category, sort } = params;
  try {
    const supabase = createClient();
    let dbQuery = supabase
      .from("circuits")
      .select(
        "id, destination_id, title, days, nights, summary, description, base_price_per_person, rating, badge, categories, is_featured, image_path, is_active, destinations (name, slug)"
      )
      .eq("is_active", true);

    if (category && category !== "all") {
      dbQuery = dbQuery.contains("categories", [category.toLowerCase()]);
    }

    if (query) {
      dbQuery = dbQuery.or(`title.ilike.%${query}%,summary.ilike.%${query}%`);
    }

    if (sort === "Price: Low") {
      dbQuery = dbQuery.order("base_price_per_person", { ascending: true });
    } else if (sort === "Duration") {
      dbQuery = dbQuery.order("days", { ascending: true });
    } else {
      dbQuery = dbQuery.order("rating", { ascending: false });
    }

    const { data, error } = await withTimeout(dbQuery, 5000);
    if (error || !data || (data as unknown[]).length === 0) {
      return [];
    }

    type RawCircuitWithDest = CircuitRow & {
      destinations: { name: string; slug: string } | null;
    };

    const rows = data as unknown as RawCircuitWithDest[];
    return rows.map((c) => ({
      id: c.id,
      destinationId: c.destination_id,
      destinationName: c.destinations?.name ?? "Jaipur",
      destinationSlug: c.destinations?.slug ?? "jaipur",
      title: c.title,
      days: c.days,
      nights: c.nights,
      summary: c.summary ?? "",
      description: c.description ?? "",
      basePricePerPerson: Number(c.base_price_per_person),
      rating: Number(c.rating ?? 0),
      badge: c.badge ?? "",
      categories: c.categories,
      isFeatured: c.is_featured,
      imagePath: c.image_path,
      isActive: c.is_active,
    }));
  } catch (err) {
    console.error("Failed to query circuits from Supabase:", err);
    return [];
  }
}

export async function getFeaturedCircuits(): Promise<Circuit[]> {
  try {
    const supabase = createClient();
    const { data, error } = await withTimeout(
      supabase
        .from("circuits")
        .select(
          "id, destination_id, title, days, nights, summary, description, base_price_per_person, rating, badge, categories, is_featured, image_path, is_active, destinations (name, slug)"
        )
        .eq("is_active", true)
        .eq("is_featured", true),
      5000
    );

    if (error || !data || (data as unknown[]).length === 0) {
      return [];
    }

    type RawCircuitWithDest = CircuitRow & {
      destinations: { name: string; slug: string } | null;
    };

    const rows = data as unknown as RawCircuitWithDest[];
    return rows.map((c) => ({
      id: c.id,
      destinationId: c.destination_id,
      destinationName: c.destinations?.name ?? "Jaipur",
      destinationSlug: c.destinations?.slug ?? "jaipur",
      title: c.title,
      days: c.days,
      nights: c.nights,
      summary: c.summary ?? "",
      description: c.description ?? "",
      basePricePerPerson: Number(c.base_price_per_person),
      rating: Number(c.rating ?? 0),
      badge: c.badge ?? "",
      categories: c.categories,
      isFeatured: c.is_featured,
      imagePath: c.image_path,
      isActive: c.is_active,
    }));
  } catch {
    return [];
  }
}
