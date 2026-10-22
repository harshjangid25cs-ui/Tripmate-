export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getValidatedDraftTrip } from "@/lib/data/booking-guards";
import { getHotelsForDestination } from "@/lib/data/booking";
import { HotelSelectionView } from "@/components/features/booking/hotel-selection-view";

interface PageProps {
  params: {
    tripId: string;
  };
}

export default async function HotelSelectionPage({ params }: PageProps) {
  const tripData = await getValidatedDraftTrip(params.tripId, "hotel");
  const circuit = tripData.circuit;
  const allowedHotelIds = circuit?.included_hotel_ids ?? null;
  const hotels = await getHotelsForDestination(
    tripData.trip.destination_id,
    tripData.trip.id,
    { circuitId: tripData.trip.circuit_id, allowedHotelIds }
  );

  return <HotelSelectionView tripData={tripData} hotels={hotels} />;
}
