export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  const circuit = tripData.circuit;
  const allowedVehicleIds = circuit?.included_vehicle_ids ?? null;
  const vehicles = await getVehicles(
    undefined,
    tripData.trip.id,
    tripData.trip.destination_id,
    { circuitId: tripData.trip.circuit_id, allowedVehicleIds }
  );

  return <VehicleSelectionView tripData={tripData} vehicles={vehicles} />;
}
