import { redirect } from "next/navigation";
import * as React from "react";
import { unstable_noStore as noStore } from "next/cache";

const safeCache = <Args extends unknown[], Return>(
  fn: (...args: Args) => Promise<Return>
): ((...args: Args) => Promise<Return>) => {
  if (typeof React.cache === "function") {
    return React.cache(fn);
  }
  return fn;
};
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

async function fetchValidatedDraftTrip(
  tripId: string,
  targetStep: BookingStep
): Promise<ValidatedDraftTrip> {
  try {
    noStore();
  } catch {
    // Ignore in non-request test contexts
  }

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

  // Consolidated parallel batch: Fetch trip with joined destination & circuit and child relations concurrently
  const [
    tripRes,
    hotelRes,
    vehicleRes,
    stopsRes,
    passengersRes,
  ] = await Promise.all([
    supabase
      .from("trips")
      .select("*, destination:destinations(*), circuit:circuits(*)")
      .eq("id", tripId)
      .single(),
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
  ]);

  if (tripRes.error || !tripRes.data) {
    redirect("/home");
  }

  const rawTrip = tripRes.data as unknown as TripRow & {
    destination?: DestinationRow | null;
    circuit?: CircuitRow | null;
  };
  const trip = rawTrip as TripRow;

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

  const hotel = (hotelRes.data ?? null) as unknown as (TripHotelRow & { hotel?: HotelRow | null }) | null;
  const vehicle = (vehicleRes.data ?? null) as unknown as (TripVehicleRow & { vehicle?: VehicleRow | null }) | null;
  const stops = (stopsRes.data ?? []) as unknown as (TripStopRow & { stop?: StopRow | null })[];
  const passengers = (passengersRes.data ?? []) as unknown as TripPassengerRow[];
  const destination = (rawTrip.destination ?? null) as DestinationRow | null;
  const circuit = (rawTrip.circuit ?? null) as CircuitRow | null;

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

export const getValidatedDraftTrip = safeCache(fetchValidatedDraftTrip);
