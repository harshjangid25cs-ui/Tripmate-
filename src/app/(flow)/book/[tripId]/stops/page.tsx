export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getValidatedDraftTrip } from "@/lib/data/booking-guards";
import { getStopsForDestination } from "@/lib/data/booking";
import { StopsSelectionView } from "@/components/features/booking/stops-selection-view";

interface PageProps {
  params: {
    tripId: string;
  };
}

export default async function StopsSelectionPage({ params }: PageProps) {
  const tripData = await getValidatedDraftTrip(params.tripId, "stops");
  const stops = await getStopsForDestination(tripData.trip.destination_id, tripData.trip.id);

  return <StopsSelectionView tripData={tripData} stops={stops} />;
}
