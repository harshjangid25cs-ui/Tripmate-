import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

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

export const FALLBACK_HOTELS: Hotel[] = [
  {
    id: "b1111111-1111-1111-1111-111111111111",
    destinationId: "11111111-1111-1111-1111-111111111111",
    name: "Shahpura Haveli & Heritage Suites",
    description:
      "Regal 300-year-old restored royal mansion featuring traditional pink sandstone courtyards, marble suites, and rooftop terrace views.",
    rating: 4.82,
    reviewCount: 320,
    neighborhood: "Amer Road",
    distanceText: "2.1 km from center",
    badge: "Only 2 rooms left",
    pricePerNight: 4200,
    imagePaths: [],
    amenities: [
      "Free WiFi",
      "Heritage Pool",
      "Royal Breakfast",
      "Valet Parking",
      "AC",
    ],
    isActive: true,
  },
  {
    id: "b2222222-2222-2222-2222-222222222222",
    destinationId: "11111111-1111-1111-1111-111111111111",
    name: "Diggi Palace Heritage Hotel",
    description:
      "Peaceful heritage oasis with sprawling banyan gardens, resident peacocks, and vintage Rajasthani architecture in central Jaipur.",
    rating: 4.7,
    reviewCount: 210,
    neighborhood: "C-Scheme",
    distanceText: "1.5 km from center",
    badge: "High Demand",
    pricePerNight: 3600,
    imagePaths: [],
    amenities: ["Free WiFi", "Garden Restaurant", "AC", "Room Service"],
    isActive: true,
  },
  {
    id: "b3333333-3333-3333-3333-333333333333",
    destinationId: "11111111-1111-1111-1111-111111111111",
    name: "Alsisar Haveli",
    description:
      "Opulent heritage mansion adorned with intricate multi-foil arches, royal fresco murals, chandeliers, and canopy beds.",
    rating: 4.88,
    reviewCount: 450,
    neighborhood: "Sansar Chandra Road",
    distanceText: "1.2 km from center",
    badge: "Boutique",
    pricePerNight: 5400,
    imagePaths: [],
    amenities: [
      "Free WiFi",
      "Heritage Pool",
      "Multi-cuisine Dining",
      "Bar",
      "Spa",
    ],
    isActive: true,
  },
];

export const FALLBACK_VEHICLES: Vehicle[] = [
  {
    id: "e1111111-1111-1111-1111-111111111111",
    type: "car",
    name: "Maruti Suzuki Dzire",
    subtitle: "AC Sedan • Dedicated Commercial Fleet",
    description:
      "Comfortable and fuel-efficient 4-passenger sedan ideal for highway cruising and city navigation.",
    capacity: 4,
    luggageCapacity: 2,
    features: [
      "Air Conditioning",
      "Chauffeur Driven",
      "Sanitized",
      "Toll Passes",
    ],
    fuelPolicy: "Fuel included",
    driverType: "chauffeur",
    rating: 4.75,
    badge: "Economical",
    price: 1899,
    imagePath: null,
    isActive: true,
  },
  {
    id: "e2222222-2222-2222-2222-222222222222",
    type: "car",
    name: "Toyota Innova Crysta",
    subtitle: "Premium MPV • Spacious Captain Seats",
    description:
      "Spacious 7-seater luxury highway cruiser with plush captain chairs, rear AC vents, and generous luggage volume.",
    capacity: 7,
    luggageCapacity: 4,
    features: [
      "Captain Chairs",
      "Chauffeur Driven",
      "Mineral Water Onboard",
      "High Clearance",
    ],
    fuelPolicy: "Fuel included",
    driverType: "chauffeur",
    rating: 4.9,
    badge: "Most Popular",
    price: 1899,
    imagePath: null,
    isActive: true,
  },
  {
    id: "e3333333-3333-3333-3333-333333333333",
    type: "bike",
    name: "Royal Enfield Classic 350",
    subtitle: "Iconic Cruiser • Highway Touring",
    description:
      "Timeless thumper motorcycle designed for leisurely road exploration, featuring dual-channel ABS and comfortable cruiser ergonomics.",
    capacity: 2,
    luggageCapacity: 1,
    features: [
      "Dual ABS",
      "Helmets Provided",
      "Phone Mount",
      "Roadside Assistance",
    ],
    fuelPolicy: "Full to Full",
    driverType: "self_drive",
    rating: 4.8,
    badge: "Adventure",
    price: 899,
    imagePath: null,
    isActive: true,
  },
];

export const FALLBACK_STOPS: Stop[] = [
  {
    id: "f1111111-1111-1111-1111-111111111111",
    destinationId: "11111111-1111-1111-1111-111111111111",
    name: "Neemrana Fort-Palace",
    description:
      "15th-century heritage midway fort on Delhi-Jaipur NH48 offering royal breakfast buffets, stepwells, and historic rampart walks.",
    locationText: "NH48, Neemrana, Rajasthan",
    distanceText: "122 km from Delhi (~2.5 hrs)",
    amenities: [
      "Royal Buffet",
      "Clean Restrooms",
      "Scenic Viewpoint",
      "Valet Parking",
    ],
    badge: "Heritage Stop",
    turnaroundText: "Quick 45m Turnaround",
    imagePath: null,
    price: 1850,
    pricingUnit: "per_person",
    isActive: true,
  },
  {
    id: "f2222222-2222-2222-2222-222222222222",
    destinationId: "11111111-1111-1111-1111-111111111111",
    name: "Highway King Boutique & Food Court",
    description:
      "Premium verified highway midway in Kotputli with multi-cuisine dining, sanitized modern washrooms, and EV fast-charging.",
    locationText: "NH48, Kotputli, Rajasthan",
    distanceText: "160 km from Delhi (~3.2 hrs)",
    amenities: [
      "Air Conditioned Food Court",
      "Clean Restroom Seal",
      "EV Fast Charger",
      "Fuel Station",
    ],
    badge: "Highway Partner",
    turnaroundText: "Quick 30m Turnaround",
    imagePath: null,
    price: 499,
    pricingUnit: "per_person",
    isActive: true,
  },
];

function mapHotel(row: HotelRow): Hotel {
  return {
    id: row.id,
    destinationId: row.destination_id,
    name: row.name,
    description: row.description,
    rating: Number(row.rating ?? 4.8),
    reviewCount: row.review_count ?? 0,
    neighborhood: row.neighborhood,
    distanceText: row.distance_text,
    badge: row.badge,
    pricePerNight: Number(row.price_per_night),
    imagePaths: row.image_paths ?? [],
    amenities: row.amenities ?? [],
    isActive: row.is_active,
  };
}

function mapVehicle(row: VehicleRow): Vehicle {
  return {
    id: row.id,
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
  destinationId?: string | null
): Promise<Hotel[]> {
  try {
    const supabase = await createClient();
    let query = supabase.from("hotels").select("*").eq("is_active", true);
    if (destinationId) {
      query = query.eq("destination_id", destinationId);
    }
    const { data, error } = await withTimeout(query, 5000);
    if (error || !data || data.length === 0) {
      return destinationId
        ? FALLBACK_HOTELS.filter((h) => h.destinationId === destinationId)
        : FALLBACK_HOTELS;
    }
    return (data as HotelRow[]).map(mapHotel);
  } catch {
    return destinationId
      ? FALLBACK_HOTELS.filter((h) => h.destinationId === destinationId)
      : FALLBACK_HOTELS;
  }
}

export async function getVehicles(
  type?: "car" | "bike"
): Promise<Vehicle[]> {
  try {
    const supabase = await createClient();
    let query = supabase.from("vehicles").select("*").eq("is_active", true);
    if (type) {
      query = query.eq("type", type);
    } else {
      query = query.in("type", ["car", "bike"]);
    }
    const { data, error } = await withTimeout(query, 5000);
    if (error || !data || data.length === 0) {
      return type
        ? FALLBACK_VEHICLES.filter((v) => v.type === type)
        : FALLBACK_VEHICLES.filter((v) => v.type === "car" || v.type === "bike");
    }
    return (data as VehicleRow[]).map(mapVehicle);
  } catch {
    return type
      ? FALLBACK_VEHICLES.filter((v) => v.type === type)
      : FALLBACK_VEHICLES.filter((v) => v.type === "car" || v.type === "bike");
  }
}

export async function getStopsForDestination(
  destinationId?: string | null
): Promise<Stop[]> {
  try {
    const supabase = await createClient();
    const query = supabase
      .from("stops")
      .select("*")
      .eq("is_active", true);
    const { data, error } = await withTimeout(query, 5000);
    if (error || !data || data.length === 0) {
      return FALLBACK_STOPS;
    }
    const mapped = (data as StopRow[]).map(mapStop);
    if (destinationId) {
      return mapped.filter(
        (s) => s.destinationId === destinationId || s.destinationId === null
      );
    }
    return mapped;
  } catch {
    return FALLBACK_STOPS;
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

