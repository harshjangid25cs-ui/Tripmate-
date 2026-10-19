export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getValidatedDraftTrip } from "@/lib/data/booking-guards";
import { TripCheckoutView } from "@/components/features/booking/trip-checkout-view";
import { getLivePaymentConfig } from "@/lib/data/booking";

interface CheckoutPageProps {
  params: {
    tripId: string;
  };
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const tripData = await getValidatedDraftTrip(params.tripId, "checkout");
  const paymentConfig = await getLivePaymentConfig();

  return (
    <TripCheckoutView
      trip={tripData.trip}
      tripData={tripData}
      paymentConfig={paymentConfig}
      pricingConfig={paymentConfig}
    />
  );
}
