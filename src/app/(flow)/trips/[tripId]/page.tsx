import { redirect } from "next/navigation";
import { getConfirmedTripDetails } from "@/lib/data/booking";
import { TripItineraryDetailView } from "@/components/features/trips/trip-itinerary-detail-view";

interface TripDetailPageProps {
  params: {
    tripId: string;
  };
}

export default async function TripDetailPage({ params }: TripDetailPageProps) {
  const details = await getConfirmedTripDetails(params.tripId);

  // If commercial booking, render the dedicated commercial itinerary & ticket roster (FEATURES §6 & §9.4)
  if (details.trip.booking_kind === "commercial") {
    redirect(`/commercial/${params.tripId}/confirmed`);
  }

  return <TripItineraryDetailView details={details} />;
}
