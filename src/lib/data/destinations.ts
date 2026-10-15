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

// Fixed fallback catalog matching DATABASE.md §8 and seed.sql
const FALLBACK_DESTINATIONS: Destination[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    slug: "jaipur",
    name: "Jaipur",
    region: "Rajasthan",
    tagline: "The Pink City",
    description:
      "Historic desert capital famed for pink-sandstone palaces, formidable hill forts, vibrant bazaars, and opulent royal heritage.",
    heroImagePath: null,
    startingPrice: 12499,
    rating: 4.85,
    reviewCount: 1420,
    recommendedDays: "3–4 Days",
    bestSeason: "Oct–Mar",
    badge: "Trending this week",
    categories: ["popular", "heritage"],
    originLabel: "Delhi NCR",
    driveHours: 6.5,
    driveKm: 270,
    isFeatured: true,
    isBookable: true,
    isActive: true,
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    slug: "udaipur",
    name: "Udaipur",
    region: "Rajasthan",
    tagline: "City of Lakes",
    description:
      "Romantic lake city nestled in the Aravalli hills, known for shimmering waters, marble palaces, and sunset boat rides.",
    heroImagePath: null,
    startingPrice: 14800,
    rating: 4.9,
    reviewCount: 980,
    recommendedDays: "3–4 Days",
    bestSeason: "Sep–Mar",
    badge: "High demand today",
    categories: ["heritage", "weekend_getaways"],
    originLabel: "Delhi NCR",
    driveHours: 11.5,
    driveKm: 660,
    isFeatured: false,
    isBookable: false,
    isActive: true,
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    slug: "munnar",
    name: "Munnar",
    region: "Kerala",
    tagline: "Verdant Tea Hills",
    description:
      "Misty hill station surrounded by sprawling emerald tea plantations, cool mountain air, and scenic winding roads.",
    heroImagePath: null,
    startingPrice: 9200,
    rating: 4.75,
    reviewCount: 650,
    recommendedDays: "3–4 Days",
    bestSeason: "Sep–May",
    badge: "Popular in Monsoon",
    categories: ["nature", "hidden_gems"],
    originLabel: "Delhi NCR",
    driveHours: 38.0,
    driveKm: 2300,
    isFeatured: false,
    isBookable: false,
    isActive: true,
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    slug: "hampi",
    name: "Hampi",
    region: "Karnataka",
    tagline: "Boulders & Ancient Ruins",
    description:
      "UNESCO World Heritage landscape of boulder-strewn hills and magnificent 14th-century Vijayanagara Empire stone ruins.",
    heroImagePath: null,
    startingPrice: 7500,
    rating: 4.8,
    reviewCount: 510,
    recommendedDays: "2–3 Days",
    bestSeason: "Nov–Feb",
    badge: "Ancient Wonder",
    categories: ["heritage", "less_discovered"],
    originLabel: "Delhi NCR",
    driveHours: 34.0,
    driveKm: 1950,
    isFeatured: false,
    isBookable: false,
    isActive: true,
  },
];

const FALLBACK_HIGHLIGHTS: DestinationHighlight[] = [
  {
    id: "aaaa1111-1111-1111-1111-111111111111",
    destinationId: "11111111-1111-1111-1111-111111111111",
    title: "Hawa Mahal & Old City Walk",
    category: "Heritage",
    durationText: "2.5 hrs",
    badge: "Must Visit",
    sortOrder: 1,
  },
  {
    id: "aaaa2222-2222-2222-2222-222222222222",
    destinationId: "11111111-1111-1111-1111-111111111111",
    title: "Amber Palace & Elephant Route",
    category: "Iconic Fort",
    durationText: "4.0 hrs",
    badge: "Iconic",
    sortOrder: 2,
  },
  {
    id: "aaaa3333-3333-3333-3333-333333333333",
    destinationId: "11111111-1111-1111-1111-111111111111",
    title: "Nahargarh Sunset Point",
    category: "Viewpoint & Cafe",
    durationText: "2.0 hrs",
    badge: "Scenic",
    sortOrder: 3,
  },
  {
    id: "aaaa4444-4444-4444-4444-444444444444",
    destinationId: "11111111-1111-1111-1111-111111111111",
    title: "Johari Bazaar Textile & Gems",
    category: "Local Market",
    durationText: "3.0 hrs",
    badge: "Local Life",
    sortOrder: 4,
  },
];

const FALLBACK_CIRCUITS: Circuit[] = [
  {
    id: "c1111111-1111-1111-1111-111111111111",
    destinationId: "11111111-1111-1111-1111-111111111111",
    destinationName: "Jaipur",
    destinationSlug: "jaipur",
    title: "Jaipur Heritage & Forts Circuit",
    days: 4,
    nights: 3,
    summary: "Heritage Havelis & Cab",
    description:
      "Amber Palace sunrise, City Palace museum pass, private sedan & local culinary trail.",
    basePricePerPerson: 12499,
    rating: 4.9,
    badge: "Trending this week",
    categories: ["heritage", "popular"],
    isFeatured: true,
    imagePath: null,
    isActive: true,
  },
  {
    id: "c2222222-2222-2222-2222-222222222222",
    destinationId: "11111111-1111-1111-1111-111111111111",
    destinationName: "Jaipur",
    destinationSlug: "jaipur",
    title: "Amer & Nahargarh Valley Escape",
    days: 3,
    nights: 2,
    summary: "Chauffeur SUV & Fort Villa",
    description:
      "Nahargarh sunset drinks, stepwell tour at Panna Meena Ka Kund & stargazing camp.",
    basePricePerPerson: 9800,
    rating: 4.8,
    badge: "High demand for winter",
    categories: ["heritage"],
    isFeatured: false,
    imagePath: null,
    isActive: true,
  },
  {
    id: "c3333333-3333-3333-3333-333333333333",
    destinationId: "11111111-1111-1111-1111-111111111111",
    destinationName: "Jaipur",
    destinationSlug: "jaipur",
    title: "Pink City Culture & Johari Bazaar",
    days: 3,
    nights: 2,
    summary: "Artisan Markets & Textile Trails",
    description:
      "Immerse in Johari Bazaar jewelry, blue pottery workshops, and candlelit royal haveli dining.",
    basePricePerPerson: 8200,
    rating: 4.75,
    badge: "Curated",
    categories: ["heritage", "hidden_gems"],
    isFeatured: false,
    imagePath: null,
    isActive: true,
  },
  {
    id: "c4444444-4444-4444-4444-444444444444",
    destinationId: "11111111-1111-1111-1111-111111111111",
    destinationName: "Jaipur",
    destinationSlug: "jaipur",
    title: "Samode Palace & Aravali Foothills",
    days: 4,
    nights: 3,
    summary: "Luxury Haveli & Rural Trails",
    description:
      "Historic Sheesh Mahal suites, peaceful pool overlooking rugged Aravalli foothills.",
    basePricePerPerson: 14500,
    rating: 4.95,
    badge: "Exclusive",
    categories: ["heritage", "nature"],
    isFeatured: false,
    imagePath: null,
    isActive: true,
  },
  {
    id: "c5555555-5555-5555-5555-555555555555",
    destinationId: "22222222-2222-2222-2222-222222222222",
    destinationName: "Udaipur",
    destinationSlug: "udaipur",
    title: "Udaipur Lakeside Retreat",
    days: 4,
    nights: 3,
    summary: "Palaces & Sunset Cruises",
    description:
      "City Palace overlooking serene Lake Pichola, glowing lanterns, and sunset cruises.",
    basePricePerPerson: 12200,
    rating: 4.95,
    badge: "Curated Luxe",
    categories: ["heritage", "weekend_getaways"],
    isFeatured: true,
    imagePath: null,
    isActive: true,
  },
];

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
      return filterFallbackDestinations(category);
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
    return filterFallbackDestinations(category);
  }
}

function filterFallbackDestinations(category?: string): Destination[] {
  if (!category || category === "all" || category === "popular") {
    return FALLBACK_DESTINATIONS;
  }
  const cleanCategory = category.toLowerCase().replace(/\s+/g, "_");
  return FALLBACK_DESTINATIONS.filter((d) =>
    d.categories.some((c) => c.toLowerCase() === cleanCategory)
  );
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

    if (error || !d) {
      if (error) console.error(`Error fetching destination ${slug}:`, error.message);
      const fallback = FALLBACK_DESTINATIONS.find(
        (item) => item.slug === slug.toLowerCase()
      ) ?? null;
      const highlights = fallback
        ? FALLBACK_HIGHLIGHTS.filter((h) => h.destinationId === fallback.id)
        : [];
      return { destination: fallback, highlights };
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
    const fallback = FALLBACK_DESTINATIONS.find(
      (item) => item.slug === slug.toLowerCase()
    ) ?? null;
    const highlights = fallback
      ? FALLBACK_HIGHLIGHTS.filter((h) => h.destinationId === fallback.id)
      : [];
    return { destination: fallback, highlights };
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
      return filterFallbackCircuits(params);
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
    return filterFallbackCircuits(params);
  }
}

function filterFallbackCircuits(params: {
  query?: string;
  category?: string;
  sort?: string;
}): Circuit[] {
  let list = [...FALLBACK_CIRCUITS];
  const { query, category, sort } = params;

  if (query) {
    const q = query.toLowerCase();
    list = list.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q) ||
        (c.destinationName && c.destinationName.toLowerCase().includes(q))
    );
  }

  if (category && category !== "all") {
    const cat = category.toLowerCase().replace(/\s+/g, "_");
    list = list.filter((c) =>
      c.categories.some((item) => item.toLowerCase() === cat)
    );
  }

  if (sort === "Price: Low") {
    list.sort((a, b) => a.basePricePerPerson - b.basePricePerPerson);
  } else if (sort === "Duration") {
    list.sort((a, b) => a.days - b.days);
  } else {
    list.sort((a, b) => b.rating - a.rating);
  }

  return list;
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
      return FALLBACK_CIRCUITS.filter((c) => c.isFeatured);
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
    return FALLBACK_CIRCUITS.filter((c) => c.isFeatured);
  }
}
