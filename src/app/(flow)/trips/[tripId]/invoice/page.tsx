export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getConfirmedTripDetails } from "@/lib/data/booking";
import { TripInvoiceView } from "@/components/features/trips/trip-invoice-view";

interface TripInvoicePageProps {
  params: {
    tripId: string;
  };
}

export default async function TripInvoicePage({ params }: TripInvoicePageProps) {
  const details = await getConfirmedTripDetails(params.tripId);

  return <TripInvoiceView details={details} />;
}
