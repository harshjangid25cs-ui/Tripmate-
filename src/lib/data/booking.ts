import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { haversineDistanceKm, KNOWN_CITIES } from "@/lib/geo/distance";

export type HotelRow = Database["public"]["Tables"]["hotels"]["Row"];
export type VehicleRow = Database["public"]["Tables"]["vehicles"]["Row"];
export type StopRow = Database["public"]["Tables"]["stops"]["Row"];
export type TripRow = Database["public"]["Tables"]["trips"]["Row"];
export type TripHotelRow = Database["public"]["Tables"]["trip_hotels"]["Row"];
export type TripVehicleRow = Database["public"]["Tables"]["trip_vehicles"]["Row"];
export type TripStopRow = Database["public"]["Tables"]["trip_stops"]["Row"];
export type TripPassengerRow = Database["public"]["Tables"]["trip_passengers"]["Row"];
export type DestinationRow = Database["public"]["Tables"]["destinations"]["Row"];
export type CircuitRow = Database["public"]["Tables"]["circuits"]["Row"];
export type DriverRow = Database["public"]["Tables"]["drivers"]["Row"];
export type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];
export type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
export type ItineraryItemRow = Database["public"]["Tables"]["itinerary_items"]["Row"];

export interface Hotel {
  id: string;
  destinationId: string;
  name: string;
  description: string | null;
  rating: number;
  reviewCount: number;
  neighborhood: string | null;
  distanceText: string | null;
  badge: string | null;
  pricePerNight: number;
  imagePaths: string[];
  amenities: string[];
  isActive: boolean;
}

export interface Vehicle {
  id: string;
  destinationId?: string | null;
  destinationName?: string | null;
  city?: string | null;
  type: "car" | "bike" | "bus";
  name: string;
  subtitle: string | null;
  description: string | null;
  capacity: number | null;
  luggageCapacity: number | null;
  features: string[];
  fuelPolicy: string | null;
  driverType: "chauffeur" | "self_drive" | null;
  rating: number;
  badge: string | null;
  price: number;
  imagePath: string | null;
  isActive: boolean;
}

export interface Stop {
  id: string;
  destinationId: string | null;
  name: string;
  description: string | null;
  locationText: string | null;
  distanceText: string | null;
  amenities: string[];
  badge: string | null;
  turnaroundText: string | null;
  imagePath: string | null;
  price: number;
  pricingUnit: "per_person" | "flat";
  isActive: boolean;
}





const KNOWN_HOTEL_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // Sansar Chandra Road / Alsisar Haveli (~1.2 km from MI Road / Ajmeri Gate center)
  "alsisar haveli": { lat: 26.9219, lng: 75.795 },
  "sansar chandra road": { lat: 26.9219, lng: 75.795 },
  // C-Scheme / Diggi Palace (~1.5 km from center)
  "diggi palace": { lat: 26.906, lng: 75.798 },
  "diggi palace heritage hotel": { lat: 26.906, lng: 75.798 },
  "c-scheme": { lat: 26.906, lng: 75.798 },
  // Bani Park / Shahpura Haveli (~1.8 km from center)
  "shahpura haveli": { lat: 26.927, lng: 75.7925 },
  "shahpura haveli & heritage suites": { lat: 26.927, lng: 75.7925 },
  "bani park": { lat: 26.927, lng: 75.7925 },
  // Amer Road / Amber (~8.5 km from center)
  "amer": { lat: 26.9855, lng: 75.8513 },
  "amer road": { lat: 26.95, lng: 75.83 },
  // Civil Lines (~2.5 km from center)
  "civil lines": { lat: 26.902, lng: 75.778 },
};

function calculateHotelCenterDistance(
  hotel: HotelRow,
  destLat: number,
  destLng: number
): number {
  const nameKey = hotel.name.toLowerCase().trim();
  const hoodKey = (hotel.neighborhood || "").toLowerCase().trim();
  const coord = KNOWN_HOTEL_COORDINATES[nameKey] || KNOWN_HOTEL_COORDINATES[hoodKey];
  if (coord) {
    return haversineDistanceKm(destLat, destLng, coord.lat, coord.lng);
  }
  if (hotel.distance_text) {
    const match = hotel.distance_text.match(/([\d.]+)\s*km/i);
    if (match && match[1]) {
      const parsed = parseFloat(match[1]);
      if (!isNaN(parsed)) return parsed;
    }
  }
  return 5.0;
}

function mapHotel(row: HotelRow, computedDistKm?: number): Hotel {
  let distanceText = row.distance_text;
  if (!distanceText && computedDistKm !== undefined) {
    distanceText = `${computedDistKm.toFixed(1)} km from center`;
  }
  return {
    id: row.id,
    destinationId: row.destination_id,
    name: row.name,
    description: row.description,
    rating: Number(row.rating ?? 4.8),
    reviewCount: row.review_count ?? 0,
    neighborhood: row.neighborhood,
    distanceText,
    badge: row.badge,
    pricePerNight: Number(row.price_per_night),
    imagePaths: row.image_paths ?? [],
    amenities: row.amenities ?? [],
    isActive: row.is_active,
  };
}

function mapVehicle(
  row: VehicleRow & { destinations?: { name?: string | null } | null }
): Vehicle {
  const destName = row.destinations?.name ?? "Jaipur";
  return {
    id: row.id,
    destinationId: row.destination_id ?? null,
    destinationName: destName,
    city: destName,
    type: row.type as "car" | "bike" | "bus",
    name: row.name,
    subtitle: row.subtitle,
    description: row.description,
    capacity: row.capacity,
    luggageCapacity: row.luggage_capacity,
    features: row.features ?? [],
    fuelPolicy: row.fuel_policy,
    driverType: (row.driver_type as "chauffeur" | "self_drive") ?? null,
    rating: Number(row.rating ?? 4.8),
    badge: row.badge,
    price: Number(row.price),
    imagePath: row.image_path,
    isActive: row.is_active,
  };
}

function mapStop(row: StopRow): Stop {
  return {
    id: row.id,
    destinationId: row.destination_id,
    name: row.name,
    description: row.description,
    locationText: row.location_text,
    distanceText: row.distance_text,
    amenities: row.amenities ?? [],
    badge: row.badge,
    turnaroundText: row.turnaround_text,
    imagePath: row.image_path,
    price: Number(row.price),
    pricingUnit: (row.pricing_unit as "per_person" | "flat") ?? "per_person",
    isActive: row.is_active,
  };
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

export async function getHotelsForDestination(
  destinationId?: string | null,
  tripId?: string | null
): Promise<Hotel[]> {
  noStore();
  try {
    const supabase = await createClient();
    let allowedHotelIds: string[] | null = null;
    let resolvedDestId = destinationId;

    if (tripId) {
      const { data: trip } = await supabase
        .from("trips")
        .select("destination_id, circuit_id")
        .eq("id", tripId)
        .maybeSingle();
      if (trip?.destination_id && !resolvedDestId) {
        resolvedDestId = trip.destination_id;
      }
      if (trip?.circuit_id) {
        const { data: circuit } = await supabase
          .from("circuits")
          .select("destination_id, included_hotel_ids")
          .eq("id", trip.circuit_id)
          .maybeSingle();
        if (circuit?.destination_id && !resolvedDestId) {
          resolvedDestId = circuit.destination_id;
        }
        if (circuit?.included_hotel_ids && circuit.included_hotel_ids.length > 0) {
          allowedHotelIds = circuit.included_hotel_ids;
        }
      }
    }

    // Resolve destination center coordinates for Haversine distance calculations
    let destLat = KNOWN_CITIES.jaipur?.lat ?? 26.9124;
    let destLng = KNOWN_CITIES.jaipur?.lng ?? 75.7873;

    if (resolvedDestId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedDestId);
      const destQuery = supabase.from("destinations").select("id, name, latitude, longitude");
      const { data: dest } = isUuid
        ? await destQuery.eq("id", resolvedDestId).maybeSingle()
        : await destQuery.ilike("slug", resolvedDestId).maybeSingle();

      if (dest) {
        resolvedDestId = dest.id;
        if (typeof dest.latitude === "number" && typeof dest.longitude === "number") {
          destLat = dest.latitude;
          destLng = dest.longitude;
        }
      }
    }

    let query = supabase.from("hotels").select("*").eq("is_active", true);
    if (resolvedDestId) {
      query = query.eq("destination_id", resolvedDestId);
    }
    if (allowedHotelIds && allowedHotelIds.length > 0) {
      query = query.in("id", allowedHotelIds);
    }
    const { data, error } = await withTimeout(query, 5000);
    if (error || !data || data.length === 0) {
      return [];
    }

    const rawHotels = data as HotelRow[];

    // Calculate Haversine distance and sort closest to city center / landmark first
    const hotelsWithDistance = rawHotels.map((h) => {
      const dist = calculateHotelCenterDistance(h, destLat, destLng);
      return {
        hotel: mapHotel(h, dist),
        distanceKm: dist,
      };
    });

    hotelsWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);

    return hotelsWithDistance.map((item) => item.hotel);
  } catch {
    return [];
  }
}

export async function getVehicles(
  type?: "car" | "bike",
  tripId?: string | null,
  destinationId?: string | null
): Promise<Vehicle[]> {
  noStore();
  try {
    const supabase = await createClient();
    let allowedVehicleIds: string[] | null = null;
    let resolvedDestId = destinationId;

    if (tripId) {
      const { data: trip } = await supabase
        .from("trips")
        .select("destination_id, circuit_id")
        .eq("id", tripId)
        .maybeSingle();
      if (trip?.destination_id && !resolvedDestId) {
        resolvedDestId = trip.destination_id;
      }
      if (trip?.circuit_id) {
        const { data: circuit } = await supabase
          .from("circuits")
          .select("destination_id, included_vehicle_ids")
          .eq("id", trip.circuit_id)
          .maybeSingle();
        if (circuit?.destination_id && !resolvedDestId) {
          resolvedDestId = circuit.destination_id;
        }
        if (circuit?.included_vehicle_ids && circuit.included_vehicle_ids.length > 0) {
          allowedVehicleIds = circuit.included_vehicle_ids;
        }
      }
    }

    // Resolve destination UUID if slug passed
    if (resolvedDestId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedDestId)) {
      const { data: dest } = await supabase
        .from("destinations")
        .select("id")
        .ilike("slug", resolvedDestId)
        .maybeSingle();
      if (dest?.id) {
        resolvedDestId = dest.id;
      }
    }

    let query = supabase.from("vehicles").select("*, destinations(name)").eq("is_active", true);
    if (type) {
      query = query.eq("type", type);
    } else {
      query = query.in("type", ["car", "bike"]);
    }
    if (resolvedDestId) {
      query = query.or(`destination_id.eq.${resolvedDestId},destination_id.is.null`);
    }
    if (allowedVehicleIds && allowedVehicleIds.length > 0) {
      query = query.in("id", allowedVehicleIds);
    }
    const { data, error } = await withTimeout(query, 5000);
    if (error || !data || data.length === 0) {
      return [];
    }
    return (data as (VehicleRow & { destinations?: { name?: string | null } | null })[]).map(mapVehicle);
  } catch {
    return [];
  }
}

export async function getStopsForDestination(
  destinationId?: string | null,
  tripId?: string | null
): Promise<Stop[]> {
  noStore();
  try {
    const supabase = await createClient();
    let allowedStopIds: string[] | null = null;
    if (tripId) {
      const { data: trip } = await supabase
        .from("trips")
        .select("circuit_id")
        .eq("id", tripId)
        .maybeSingle();
      if (trip?.circuit_id) {
        const { data: circuit } = await supabase
          .from("circuits")
          .select("included_stop_ids")
          .eq("id", trip.circuit_id)
          .maybeSingle();
        if (circuit?.included_stop_ids && circuit.included_stop_ids.length > 0) {
          allowedStopIds = circuit.included_stop_ids;
        }
      }
    }

    let query = supabase.from("stops").select("*").eq("is_active", true);
    if (allowedStopIds && allowedStopIds.length > 0) {
      query = query.in("id", allowedStopIds);
    }
    const { data, error } = await withTimeout(query, 5000);
    if (error || !data || data.length === 0) {
      return [];
    }
    const mapped = (data as StopRow[]).map(mapStop);
    if (destinationId && (!allowedStopIds || allowedStopIds.length === 0)) {
      return mapped.filter(
        (s) => s.destinationId === destinationId || s.destinationId === null
      );
    }
    return mapped;
  } catch {
    return [];
  }
}


export interface ConfirmedTripDetails {
  trip: TripRow;
  hotel: (TripHotelRow & { hotel?: HotelRow | null }) | null;
  vehicle: (TripVehicleRow & { vehicle?: VehicleRow | null; driver?: DriverRow | null }) | null;
  stops: (TripStopRow & { stop?: StopRow | null })[];
  passengers: TripPassengerRow[];
  destination: DestinationRow | null;
  circuit: CircuitRow | null;
  invoice: InvoiceRow | null;
  payment: PaymentRow | null;
  itineraryItems: ItineraryItemRow[];
}

export async function getConfirmedTripDetails(
  tripId: string
): Promise<ConfirmedTripDetails> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    redirect("/home");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Consolidated parallel queries:
  // 1. Core trip with joined relational destination, circuit, invoices, payments, itinerary_items
  // 2. Child trip components: hotels, vehicles, stops, passengers
  const [tripRes, componentsRes] = await Promise.all([
    supabase
      .from("trips")
      .select(`
        *,
        destination:destinations(*),
        circuit:circuits(*),
        invoices(*),
        payments(*),
        itinerary_items(*)
      `)
      .eq("id", tripId)
      .single(),
    Promise.all([
      supabase
        .from("trip_hotels")
        .select("*, hotel:hotels(*)")
        .eq("trip_id", tripId)
        .maybeSingle(),
      supabase
        .from("trip_vehicles")
        .select("*, vehicle:vehicles(*), driver:drivers(*)")
        .eq("trip_id", tripId)
        .maybeSingle(),
      supabase
        .from("trip_stops")
        .select("*, stop:stops(*)")
        .eq("trip_id", tripId),
      supabase
        .from("trip_passengers")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: true }),
    ]),
  ]);

  if (tripRes.error || !tripRes.data) {
    redirect("/home");
  }

  const rawTrip = tripRes.data as unknown as TripRow & {
    destination?: DestinationRow | null;
    circuit?: CircuitRow | null;
    invoices?: InvoiceRow[] | null;
    payments?: PaymentRow[] | null;
    itinerary_items?: ItineraryItemRow[] | null;
  };

  const trip = rawTrip;

  // Ownership verification
  if (trip.user_id !== user.id) {
    redirect("/home");
  }

  // If still in draft, send back to checkout
  if (trip.status === "draft") {
    redirect(`/book/${tripId}/checkout`);
  }

  const [hotelRes, vehicleRes, stopsRes, passengersRes] = componentsRes;

  const hotel = (hotelRes.data ?? null) as unknown as (TripHotelRow & { hotel?: HotelRow | null }) | null;
  const vehicle = (vehicleRes.data ?? null) as unknown as (TripVehicleRow & { vehicle?: VehicleRow | null; driver?: DriverRow | null }) | null;
  const stops = (stopsRes.data ?? []) as unknown as (TripStopRow & { stop?: StopRow | null })[];
  const passengers = (passengersRes.data ?? []) as TripPassengerRow[];
  const destination = rawTrip.destination ?? null;
  const circuit = rawTrip.circuit ?? null;

  // Real invoice from database - do NOT synthesize fake tax invoice
  const invoice =
    (rawTrip.invoices && rawTrip.invoices.length > 0
      ? rawTrip.invoices[0]
      : null) ?? null;

  // Succeeded or latest payment
  const payment =
    rawTrip.payments?.find((p) => p.status === "succeeded") ??
    rawTrip.payments?.[0] ??
    null;

  let itineraryItems = (rawTrip.itinerary_items ?? []) as ItineraryItemRow[];
  if (itineraryItems.length > 0) {
    itineraryItems.sort(
      (a, b) =>
        (a.day_number || 1) - (b.day_number || 1) ||
        (a.sort_order || 0) - (b.sort_order || 0)
    );
  }

  // Fallback itinerary items if build_itinerary was not executed
  if (itineraryItems.length === 0) {
    const totalDays = trip.total_days || 4;
    const hotelName = hotel?.hotel?.name || "Shahpura Haveli & Heritage Suites";
    const stopName = stops[0]?.stop?.name || "Neemrana Fort-Palace";
    const vehicleName = vehicle?.vehicle?.name || "Maruti Suzuki Dzire";

    itineraryItems = [
      {
        id: "itin-1",
        trip_id: trip.id,
        day_number: 1,
        sort_order: 1,
        item_type: "vehicle",
        title: `Private Chauffeur Pickup (${vehicleName})`,
        description: "Doorstep pickup in sanitized AC vehicle with mint wet wipes and chilled spring water bottles onboard.",
        start_time: "07:30:00",
        trip_hotel_id: null,
        trip_vehicle_id: vehicle?.id ?? null,
        trip_stop_id: null,
        highlight_id: null,
        created_at: new Date().toISOString(),
      },
      {
        id: "itin-2",
        trip_id: trip.id,
        day_number: 1,
        sort_order: 2,
        item_type: "stop",
        title: `Courtyard Breakfast at ${stopName}`,
        description: "Pre-reserved open-air veranda table overlooking ramparts with buffet breakfast & artisanal coffee.",
        start_time: "10:30:00",
        trip_hotel_id: null,
        trip_vehicle_id: null,
        trip_stop_id: stops[0]?.id ?? null,
        highlight_id: null,
        created_at: new Date().toISOString(),
      },
      {
        id: "itin-3",
        trip_id: trip.id,
        day_number: 1,
        sort_order: 3,
        item_type: "hotel",
        title: `Priority Check-in at ${hotelName}`,
        description: "Traditional Rajasthani royal welcome with marigold garlands and chilled saffron-rose cooler.",
        start_time: "13:30:00",
        trip_hotel_id: hotel?.id ?? null,
        trip_vehicle_id: null,
        trip_stop_id: null,
        highlight_id: null,
        created_at: new Date().toISOString(),
      },
      {
        id: "itin-4",
        trip_id: trip.id,
        day_number: 1,
        sort_order: 4,
        item_type: "activity",
        title: "City Palace & Royal Astronomical Observatory",
        description: "Private heritage historian accompaniment with exclusive access to Chandra Mahal inner chambers.",
        start_time: "16:00:00",
        trip_hotel_id: null,
        trip_vehicle_id: null,
        trip_stop_id: null,
        highlight_id: null,
        created_at: new Date().toISOString(),
      },
      {
        id: "itin-5",
        trip_id: trip.id,
        day_number: 2,
        sort_order: 1,
        item_type: "activity",
        title: "Amber Palace & Elephant Ramparts Expedition",
        description: "Morning heritage exploration of the 16th-century fortress, Sheesh Mahal and Maota Lake panoramic view.",
        start_time: "09:30:00",
        trip_hotel_id: null,
        trip_vehicle_id: null,
        trip_stop_id: null,
        highlight_id: null,
        created_at: new Date().toISOString(),
      },
      {
        id: "itin-6",
        trip_id: trip.id,
        day_number: 2,
        sort_order: 2,
        item_type: "activity",
        title: "Johari & Bapu Bazaar Curated Textile Trail",
        description: "Guided artisan walkthrough for hand-block print textiles, blue pottery, and royal lac bangles.",
        start_time: "15:30:00",
        trip_hotel_id: null,
        trip_vehicle_id: null,
        trip_stop_id: null,
        highlight_id: null,
        created_at: new Date().toISOString(),
      },
      {
        id: "itin-7",
        trip_id: trip.id,
        day_number: totalDays,
        sort_order: 1,
        item_type: "note",
        title: "Hotel Check-out & Return Journey",
        description: "Complimentary gourmet breakfast, express luggage assistance and comfortable chauffeured return drive.",
        start_time: "11:00:00",
        trip_hotel_id: null,
        trip_vehicle_id: null,
        trip_stop_id: null,
        highlight_id: null,
        created_at: new Date().toISOString(),
      },
    ];
  }

  return {
    trip,
    hotel,
    vehicle,
    stops,
    passengers,
    destination,
    circuit,
    invoice,
    payment,
    itineraryItems,
  };
}

