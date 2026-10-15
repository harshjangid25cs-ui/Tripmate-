import { getValidatedDraftTrip } from "@/lib/data/booking-guards";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { TripReviewView } from "@/components/features/booking/trip-review-view";

interface PageProps {
  params: {
    tripId: string;
  };
}

export default async function TripReviewPage({ params }: PageProps) {
  const tripData = await getValidatedDraftTrip(params.tripId, "review");
  const { highlights } = await getDestinationBySlug(
    tripData.destination?.slug ?? "jaipur"
  );

  return <TripReviewView tripData={tripData} highlights={highlights} />;
}
