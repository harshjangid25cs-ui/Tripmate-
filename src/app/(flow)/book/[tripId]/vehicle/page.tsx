import { getValidatedDraftTrip } from "@/lib/data/booking-guards";
import { getVehicles } from "@/lib/data/booking";
import { VehicleSelectionView } from "@/components/features/booking/vehicle-selection-view";

interface PageProps {
  params: {
    tripId: string;
  };
}

export default async function VehicleSelectionPage({ params }: PageProps) {
  const tripData = await getValidatedDraftTrip(params.tripId, "vehicle");
  const vehicles = await getVehicles();

  return <VehicleSelectionView tripData={tripData} vehicles={vehicles} />;
}
