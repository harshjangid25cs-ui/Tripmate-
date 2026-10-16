export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getUserTrips } from "@/lib/data/trips-list";
import { RecentTripsView } from "@/components/features/trips/recent-trips-view";

interface TripsPageProps {
  searchParams?: {
    kind?: "all" | "commercial" | "normal";
    cancel?: string;
  };
}

export default async function TripsPage({ searchParams }: TripsPageProps) {
  const kindFilter = searchParams?.kind === "commercial" ? "commercial" : "all";
  const trips = await getUserTrips(kindFilter);

  return <RecentTripsView initialTrips={trips} />;
}
