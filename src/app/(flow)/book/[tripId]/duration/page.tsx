export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getValidatedDraftTrip } from "@/lib/data/booking-guards";
import { TripDurationView } from "@/components/features/booking/trip-duration-view";

interface PageProps {
  params: {
    tripId: string;
  };
}

export default async function TripDurationPage({ params }: PageProps) {
  const tripData = await getValidatedDraftTrip(params.tripId, "duration");
  return <TripDurationView tripData={tripData} />;
}
