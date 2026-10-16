import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type BookingStep =
  | "duration"
  | "hotel"
  | "vehicle"
  | "stops"
  | "review"
  | "travellers"
  | "checkout";

type TripRow = Database["public"]["Tables"]["trips"]["Row"];
type TripHotelRow = Database["public"]["Tables"]["trip_hotels"]["Row"];
type TripVehicleRow = Database["public"]["Tables"]["trip_vehicles"]["Row"];
type TripStopRow = Database["public"]["Tables"]["trip_stops"]["Row"];
type TripPassengerRow = Database["public"]["Tables"]["trip_passengers"]["Row"];
type DestinationRow = Database["public"]["Tables"]["destinations"]["Row"];
type CircuitRow = Database["public"]["Tables"]["circuits"]["Row"];
type HotelRow = Database["public"]["Tables"]["hotels"]["Row"];
type VehicleRow = Database["public"]["Tables"]["vehicles"]["Row"];
type StopRow = Database["public"]["Tables"]["stops"]["Row"];

export interface ValidatedDraftTrip {
  trip: TripRow;
  hotel: (TripHotelRow & { hotel?: HotelRow | null }) | null;
  vehicle: (TripVehicleRow & { vehicle?: VehicleRow | null }) | null;
  stops: (TripStopRow & { stop?: StopRow | null })[];
  passengers: TripPassengerRow[];
  destination: DestinationRow | null;
  circuit: CircuitRow | null;
}

export function determineEarliestIncompleteStep({
  trip,
  hotel,
  vehicle,
  passengers,
}: {
  trip: Pick<TripRow, "start_date" | "end_date" | "traveler_count">;
  hotel: unknown | null;
  vehicle: unknown | null;
  passengers: Pick<TripPassengerRow, "full_name" | "phone" | "is_lead">[];
}): BookingStep {
  if (!trip.start_date || !trip.end_date || !trip.traveler_count) {
    return "duration";
  }
  if (!hotel) {
    return "hotel";
  }
  if (!vehicle) {
    return "vehicle";
  }
  // If hotel and vehicle are chosen, stops can be visited or skipped to review
  // For checkout, passengers must be complete
  const validLead = passengers.find(
    (p) => p.is_lead && Boolean(p.full_name?.trim()) && Boolean(p.phone?.trim())
  );
  if (passengers.length < trip.traveler_count || !validLead) {
    return "travellers";
  }
  return "checkout";
}

export async function getValidatedDraftTrip(
  tripId: string,
  targetStep: BookingStep
): Promise<ValidatedDraftTrip> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    // If running in an environment without cookies, redirect or fallback
    redirect("/home");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch trip
  const { data: tripData, error: tripError } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .single();

  if (tripError || !tripData) {
    redirect("/home");
  }

  const trip = tripData as TripRow;

  // Verify ownership
  if (trip.user_id !== user.id) {
    redirect("/home");
  }

  // If not draft, redirect according to FLOWS.md §2
  if (trip.status !== "draft") {
    if (trip.status === "confirmed" || trip.status === "pending_approval") {
      redirect(`/trips/${tripId}`);
    }
    redirect("/home");
  }

  // Fetch child relations
  const [
    hotelRes,
    vehicleRes,
    stopsRes,
    passengersRes,
    destinationRes,
    circuitRes,
  ] = await Promise.all([
    supabase
      .from("trip_hotels")
      .select("*, hotel:hotels(*)")
      .eq("trip_id", tripId)
      .maybeSingle(),
    supabase
      .from("trip_vehicles")
      .select("*, vehicle:vehicles(*)")
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
    trip.destination_id
      ? supabase
          .from("destinations")
          .select("*")
          .eq("id", trip.destination_id)
          .single()
      : Promise.resolve({ data: null }),
    trip.circuit_id
      ? supabase
          .from("circuits")
          .select("*")
          .eq("id", trip.circuit_id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const hotel = (hotelRes.data ?? null) as unknown as (TripHotelRow & { hotel?: HotelRow | null }) | null;
  const vehicle = (vehicleRes.data ?? null) as unknown as (TripVehicleRow & { vehicle?: VehicleRow | null }) | null;
  const stops = (stopsRes.data ?? []) as unknown as (TripStopRow & { stop?: StopRow | null })[];
  const passengers = (passengersRes.data ?? []) as unknown as TripPassengerRow[];
  const destination = (destinationRes.data ?? null) as DestinationRow | null;
  const circuit = (circuitRes.data ?? null) as CircuitRow | null;

  // Step guards enforcement
  if (targetStep === "hotel") {
    if (!trip.start_date || !trip.end_date || !trip.traveler_count) {
      redirect(`/book/${tripId}/duration`);
    }
  } else if (targetStep === "vehicle") {
    if (!trip.start_date || !trip.end_date || !trip.traveler_count) {
      redirect(`/book/${tripId}/duration`);
    }
    if (!hotel) {
      redirect(`/book/${tripId}/hotel`);
    }
  } else if (targetStep === "stops") {
    if (!trip.start_date || !trip.end_date || !trip.traveler_count) {
      redirect(`/book/${tripId}/duration`);
    }
    if (!hotel) {
      redirect(`/book/${tripId}/hotel`);
    }
    // Vehicle selection is optional (customer may bring own vehicle or skip)
  } else if (targetStep === "review") {
    if (!trip.start_date || !trip.end_date || !trip.traveler_count) {
      redirect(`/book/${tripId}/duration`);
    }
    if (!hotel) {
      redirect(`/book/${tripId}/hotel`);
    }
    // Vehicle selection is optional (customer may bring own vehicle or skip)
  } else if (targetStep === "travellers") {
    if (!trip.start_date || !trip.end_date || !trip.traveler_count) {
      redirect(`/book/${tripId}/duration`);
    }
    if (!hotel) {
      redirect(`/book/${tripId}/hotel`);
    }
  } else if (targetStep === "checkout") {
    if (!trip.start_date || !trip.end_date || !trip.traveler_count) {
      redirect(`/book/${tripId}/duration`);
    }
    if (!hotel) {
      redirect(`/book/${tripId}/hotel`);
    }
    const validLead = passengers.find(
      (p) => p.is_lead && Boolean(p.full_name?.trim()) && Boolean(p.phone?.trim())
    );
    if (passengers.length < trip.traveler_count || !validLead) {
      redirect(`/book/${tripId}/travellers`);
    }
  }

  return {
    trip,
    hotel,
    vehicle,
    stops,
    passengers,
    destination,
    circuit,
  };
}
