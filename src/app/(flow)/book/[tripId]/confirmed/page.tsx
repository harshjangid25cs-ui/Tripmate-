export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getConfirmedTripDetails } from "@/lib/data/booking";
import { BookingConfirmationView } from "@/components/features/booking/booking-confirmation-view";

interface ConfirmedPageProps {
  params: {
    tripId: string;
  };
}

export default async function ConfirmedPage({ params }: ConfirmedPageProps) {
  const details = await getConfirmedTripDetails(params.tripId);

  return <BookingConfirmationView details={details} />;
}
