import { notFound } from "next/navigation";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { DestinationDetailView } from "./destination-detail-view";

interface DestinationPageProps {
  params: {
    slug: string;
  };
}

export default async function DestinationPage({
  params,
}: DestinationPageProps) {
  const { destination, highlights } = await getDestinationBySlug(params.slug);

  if (!destination) {
    notFound();
  }

  return (
    <DestinationDetailView
      destination={destination}
      highlights={highlights}
    />
  );
}
