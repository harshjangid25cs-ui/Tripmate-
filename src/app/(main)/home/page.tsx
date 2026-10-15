import {
  getDestinations,
  searchCircuits,
  getFeaturedCircuits,
} from "@/lib/data/destinations";
import { HomeView } from "@/components/features/home/home-view";

interface HomePageProps {
  searchParams?: {
    q?: string;
    category?: string;
    sort?: string;
  };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const query = searchParams?.q ?? "";
  const category = searchParams?.category ?? "popular";

  const [destinations, circuits, featuredCircuits] = await Promise.all([
    getDestinations(),
    searchCircuits({ query }),
    getFeaturedCircuits(),
  ]);

  return (
    <HomeView
      initialDestinations={destinations}
      initialCircuits={circuits}
      featuredCircuits={featuredCircuits}
      initialQuery={query}
      initialCategory={category}
    />
  );
}
