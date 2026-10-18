import { createClient } from "@/lib/supabase/server";
import {
  type UserProfileData,
  type NotificationItem,
  EMPTY_PROFILE,
  computeTripsTaken,
  computeSavedSpotsCount,
  computeKmLogged,
  computeLoyaltyTier,
  formatIndianPhone,
} from "./profile-types";

export * from "./profile-types";

interface DestinationJoin {
  id: string;
  name: string;
  slug: string;
  hero_image_path: string | null;
  drive_km: number | null;
  tagline: string | null;
  region: string | null;
  rating: number | null;
}

interface TripRow {
  id: string;
  title: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  destination_id: string | null;
  destinations?: DestinationJoin | null;
}

export async function getUserProfileData(): Promise<UserProfileData> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return EMPTY_PROFILE;
    }

    // 1. Fetch user profile row
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    const fullName =
      (profileRow?.full_name as string) ||
      (user.user_metadata?.["full_name"] as string) ||
      user.email?.split("@")[0] ||
      "Traveler";

    const email = (profileRow?.email as string) || user.email || "";
    const phone = (profileRow?.phone as string) || user.user_metadata?.["phone"] || null;
    const avatarUrl = (profileRow?.avatar_url as string) || null;

    // 2. Fetch user trips for metrics & last completed journey
    const today = new Date().toISOString().slice(0, 10);
    const { data: tripsData } = await supabase
      .from("trips")
      .select(
        "id, title, status, start_date, end_date, destination_id, destinations(id, name, slug, hero_image_path, drive_km, tagline, region, rating)"
      )
      .eq("user_id", user.id);

    const trips: TripRow[] = (tripsData as unknown as TripRow[]) || [];

    const completedTrips = trips.filter(
      (t) => t.status === "confirmed" && t.end_date && t.end_date < today
    );

    const tripsTaken =
      completedTrips.length > 0
        ? computeTripsTaken(
            trips.map((t) => ({ status: t.status, end_date: t.end_date || "" })),
            today
          )
        : 0;

    const kmLogged =
      completedTrips.length > 0
        ? computeKmLogged(
            completedTrips.map((t) => ({ driveKm: t.destinations?.drive_km }))
          )
        : 0;

    const loyalty = computeLoyaltyTier(tripsTaken);

    // 3. Compute last completed journey
    let lastCompletedJourney: UserProfileData["lastCompletedJourney"] = null;
    if (completedTrips.length > 0) {
      // Sort newest completed first
      const sorted = [...completedTrips].sort((a, b) => {
        return (b.end_date || "").localeCompare(a.end_date || "");
      });
      const latest = sorted[0];
      if (latest) {
        const start = latest.start_date ? new Date(latest.start_date) : null;
        const end = latest.end_date ? new Date(latest.end_date) : null;
        const nights =
          start && end
            ? Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
            : 3;
        const finishedStr = end
          ? `Finished ${end.toLocaleDateString("en-US", { day: "numeric", month: "short" })}`
          : "Finished recently";

        const defaultCover =
          "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80";

        lastCompletedJourney = {
          tripId: latest.id,
          title: latest.title || `${latest.destinations?.name || "Expedition"} Journey`,
          destinationName: latest.destinations?.name || "Destination",
          coverImage: latest.destinations?.hero_image_path || defaultCover,
          finishedDateStr: finishedStr,
          nights,
          staysCount: 1,
        };
      }
    }

    // 4. Fetch saved items
    const { data: savedData } = await supabase
      .from("saved_items")
      .select("id, item_type, item_id")
      .eq("profile_id", user.id);

    const savedItems = (savedData as Array<{ id: string; item_type: string; item_id: string }>) || [];
    const savedSpots =
      savedItems.length > 0
        ? computeSavedSpotsCount(savedItems)
        : 0;

    // Fetch saved destinations
    let savedDestinations: UserProfileData["savedDestinations"] = [];
    const destItemIds = savedItems
      .filter((i) => i.item_type === "destination")
      .map((i) => i.item_id);

    if (destItemIds.length > 0) {
      const { data: destList } = await supabase
        .from("destinations")
        .select("id, name, slug, region, hero_image_path, tagline, rating")
        .in("id", destItemIds);

      if (destList && destList.length > 0) {
        const fallbackCover =
          "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80";

        savedDestinations = (destList as Array<{
          id: string;
          name: string;
          slug: string;
          region: string | null;
          hero_image_path: string | null;
          tagline: string | null;
          rating: number | null;
        }>).map((d) => ({
          id: d.id,
          name: d.name,
          slug: d.slug,
          region: d.region || "India",
          coverImage: d.hero_image_path || fallbackCover,
          tagline: d.tagline || "Discover authentic heritage",
          rating: Number(d.rating || 4.8),
        }));
      }
    }

    // 5. Fetch company membership
    const { data: memberData } = await supabase
      .from("company_members")
      .select("role, department, designation, companies(name, gst_number)")
      .eq("profile_id", user.id)
      .maybeSingle();

    let companyMembership: UserProfileData["companyMembership"] = null;
    if (memberData) {
      const comp = memberData.companies as unknown as { name: string; gst_number: string | null } | null;
      if (comp) {
        companyMembership = {
          companyName: comp.name,
          gstNumber: comp.gst_number,
          role: (memberData.role as "member" | "admin") || "member",
          department: memberData.department || null,
          designation: memberData.designation || null,
        };
      }
    }

    return {
      id: user.id,
      fullName,
      email,
      phone: formatIndianPhone(phone),
      avatarUrl,
      membershipTier: loyalty.tierName,
      level: loyalty.level,
      tripsTaken,
      savedSpots,
      kmLogged,
      progressToNextTier: {
        tripsToNext: loyalty.tripsToNext,
        progressPct: loyalty.progressPct,
        nextTierName: loyalty.nextTierName,
      },
      lastCompletedJourney,
      companyMembership,
      savedDestinations,
    };
  } catch (error) {
    console.error("Error fetching user profile data:", error);
    return EMPTY_PROFILE;
  }
}

export async function getUserNotifications(): Promise<NotificationItem[]> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data: rows, error } = await supabase
      .from("notifications")
      .select("id, type, message, is_read, created_at, trip_id")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false });

    if (error || !rows || rows.length === 0) {
      return [];
    }

    return (rows as Array<{
      id: string;
      type: NotificationItem["type"];
      message: string;
      is_read: boolean;
      created_at: string;
      trip_id: string | null;
    }>).map((r) => ({
      id: r.id,
      type: r.type,
      message: r.message,
      isRead: r.is_read,
      createdAt: r.created_at,
      tripId: r.trip_id,
    }));
  } catch (err) {
    console.error("Error loading notifications:", err);
    return [];
  }
}
