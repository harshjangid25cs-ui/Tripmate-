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
  const hotels = await getHotelsForDestination(tripData.trip.destination_id);

  return <HotelSelectionView tripData={tripData} hotels={hotels} />;
}
