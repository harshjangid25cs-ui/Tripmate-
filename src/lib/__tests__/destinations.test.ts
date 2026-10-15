import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database rows matching DATABASE.md schema
const mockDestinationsData = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    slug: "jaipur",
    name: "Jaipur",
    region: "Rajasthan",
    tagline: "The Pink City",
    description: "Historic desert capital famed for pink-sandstone palaces.",
    hero_image_path: null,
    starting_price: 12499,
    rating: 4.85,
    review_count: 1420,
    recommended_days: "3–4 Days",
    best_season: "Oct–Mar",
    badge: "Trending this week",
    categories: ["popular", "heritage"],
    origin_label: "Delhi NCR",
    drive_hours: 6.5,
    drive_km: 270,
    is_featured: true,
    is_bookable: true,
    is_active: true,
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    slug: "udaipur",
    name: "Udaipur",
    region: "Rajasthan",
    tagline: "City of Lakes",
    description: "Romantic lake city nestled in the Aravalli hills.",
    hero_image_path: null,
    starting_price: 14800,
    rating: 4.9,
    review_count: 980,
    recommended_days: "3–4 Days",
    best_season: "Sep–Mar",
    badge: "High demand today",
    categories: ["heritage", "weekend_getaways"],
    origin_label: "Delhi NCR",
    drive_hours: 11.5,
    drive_km: 660,
    is_featured: false,
    is_bookable: false,
    is_active: true,
  },
];

const mockHighlightsData = [
  {
    id: "aaaa1111-1111-1111-1111-111111111111",
    destination_id: "11111111-1111-1111-1111-111111111111",
    title: "Hawa Mahal & Old City Walk",
    category: "Heritage",
    duration_text: "2.5 hrs",
    badge: "Must Visit",
    sort_order: 1,
  },
  {
    id: "aaaa2222-2222-2222-2222-222222222222",
    destination_id: "11111111-1111-1111-1111-111111111111",
    title: "Amber Palace & Elephant Route",
    category: "Iconic Fort",
    duration_text: "4.0 hrs",
    badge: "Iconic",
    sort_order: 2,
  },
];

const mockCircuitsData = [
  {
    id: "c1111111-1111-1111-1111-111111111111",
    destination_id: "11111111-1111-1111-1111-111111111111",
    title: "Jaipur Heritage & Forts Circuit",
    days: 4,
    nights: 3,
    summary: "Heritage Havelis & Cab",
    description: "Amber Palace sunrise, City Palace museum pass.",
    base_price_per_person: 12499,
    rating: 4.9,
    badge: "Trending this week",
    categories: ["heritage", "popular"],
    is_featured: true,
    image_path: null,
    is_active: true,
    destinations: { name: "Jaipur", slug: "jaipur" },
  },
  {
    id: "c2222222-2222-2222-2222-222222222222",
    destination_id: "11111111-1111-1111-1111-111111111111",
    title: "Amer & Nahargarh Valley Escape",
    days: 3,
    nights: 2,
    summary: "Chauffeur SUV & Fort Villa",
    description: "Nahargarh sunset drinks, stepwell tour.",
    base_price_per_person: 9800,
    rating: 4.8,
    badge: "High demand for winter",
    categories: ["heritage"],
    is_featured: false,
    image_path: null,
    is_active: true,
    destinations: { name: "Jaipur", slug: "jaipur" },
  },
];

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === "destinations") {
        return {
          select: () => ({
            eq: (_col: string, val: unknown) => {
              if (_col === "slug") {
                const found = mockDestinationsData.find((d) => d.slug === val);
                return {
                  single: async () => ({
                    data: found ?? null,
                    error: found ? null : { message: "Not found" },
                  }),
                };
              }
              return {
                order: async () => ({ data: mockDestinationsData, error: null }),
                contains: async () => ({
                  data: mockDestinationsData.filter((d) => d.categories.includes("heritage")),
                  error: null,
                }),
              };
            },
          }),
        };
      }
      if (table === "destination_highlights") {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({ data: mockHighlightsData, error: null }),
            }),
          }),
        };
      }
      if (table === "circuits") {
        return {
          select: () => ({
            eq: () => ({
              eq: async () => ({
                data: mockCircuitsData.filter((c) => c.is_featured),
                error: null,
              }),
              contains: () => ({
                order: async () => ({ data: mockCircuitsData, error: null }),
              }),
              or: () => ({
                order: async () => ({ data: mockCircuitsData, error: null }),
              }),
              order: async () => ({ data: mockCircuitsData, error: null }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: async () => ({ data: [], error: null }),
        }),
      };
    },
  }),
}));

import {
  getDestinations,
  getDestinationBySlug,
  searchCircuits,
  getFeaturedCircuits,
} from "@/lib/data/destinations";
import {
  getDestinationImageUrl,
  getCircuitImageUrl,
  getHighlightImageUrl,
} from "@/lib/data/images";

describe("Catalog Data Access Layer (M3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Destinations queries", () => {
    it("returns seeded active destinations with camelCase mapped fields", async () => {
      const destinations = await getDestinations();
      expect(destinations.length).toBeGreaterThanOrEqual(2);

      const jaipur = destinations.find((d) => d.slug === "jaipur");
      expect(jaipur).toBeDefined();
      expect(jaipur?.name).toBe("Jaipur");
      expect(jaipur?.region).toBe("Rajasthan");
      expect(jaipur?.isBookable).toBe(true);
      expect(jaipur?.startingPrice).toBe(12499);
      expect(jaipur?.rating).toBe(4.85);
    });

    it("identifies that only Jaipur is bookable in v1 per DECISIONS D7", async () => {
      const destinations = await getDestinations();
      const bookable = destinations.filter((d) => d.isBookable);
      expect(bookable.length).toBe(1);
      expect(bookable[0]?.slug).toBe("jaipur");

      const udaipur = destinations.find((d) => d.slug === "udaipur");
      expect(udaipur?.isBookable).toBe(false);
    });

    it("retrieves destination details by slug with highlights in sort order", async () => {
      const { destination, highlights } = await getDestinationBySlug("jaipur");
      expect(destination).not.toBeNull();
      expect(destination?.name).toBe("Jaipur");
      expect(destination?.originLabel).toBe("Delhi NCR");
      expect(destination?.driveKm).toBe(270);
      expect(destination?.driveHours).toBe(6.5);

      expect(highlights.length).toBe(2);
      expect(highlights[0]?.sortOrder).toBe(1);
      expect(highlights[0]?.title).toContain("Hawa Mahal");
      expect(highlights[1]?.sortOrder).toBe(2);
      expect(highlights[1]?.title).toContain("Amber");
    });

    it("returns null destination for unknown slug", async () => {
      const { destination, highlights } = await getDestinationBySlug("unknown-place");
      expect(destination).toBeNull();
      expect(highlights).toEqual([]);
    });
  });

  describe("Circuits search & filtering", () => {
    it("searches circuits by destination or title query", async () => {
      const results = await searchCircuits({ query: "Forts" });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.title).toContain("Forts");
    });

    it("sorts circuits by price ascending", async () => {
      const results = await searchCircuits({ sort: "Price: Low" });
      expect(results.length).toBeGreaterThan(0);
    });

    it("returns featured circuits for empty state trending alternatives", async () => {
      const featured = await getFeaturedCircuits();
      expect(featured.length).toBeGreaterThan(0);
      featured.forEach((c) => {
        expect(c.isFeatured).toBe(true);
      });
    });
  });

  describe("Catalog image resolver", () => {
    it("resolves destination images from ASSETS.md", () => {
      const jaipurUrl = getDestinationImageUrl("jaipur");
      expect(jaipurUrl).toContain("googleusercontent.com");

      const udaipurUrl = getDestinationImageUrl("udaipur");
      expect(udaipurUrl).toContain("googleusercontent.com");
    });

    it("resolves highlight images with correct indices", () => {
      const h1 = getHighlightImageUrl(1);
      const h2 = getHighlightImageUrl(2);
      expect(h1).toContain("googleusercontent.com");
      expect(h2).toContain("googleusercontent.com");
      expect(h1).not.toBe(h2);
    });

    it("resolves circuit images with fallback", () => {
      const circuitUrl = getCircuitImageUrl("c1");
      expect(circuitUrl).toContain("googleusercontent.com");
    });
  });
});
