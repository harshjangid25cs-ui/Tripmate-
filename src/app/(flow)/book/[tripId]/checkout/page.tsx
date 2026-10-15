import { getValidatedDraftTrip } from "@/lib/data/booking-guards";
import { TripCheckoutView } from "@/components/features/booking/trip-checkout-view";

interface CheckoutPageProps {
  params: {
    tripId: string;
  };
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const tripData = await getValidatedDraftTrip(params.tripId, "checkout");

  return <TripCheckoutView tripData={tripData} />;
}
