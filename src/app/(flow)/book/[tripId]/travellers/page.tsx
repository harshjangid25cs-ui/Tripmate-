export const dynamic = "force-dynamic";
export const revalidate = 0;

import { createClient } from "@/lib/supabase/server";
import { getValidatedDraftTrip } from "@/lib/data/booking-guards";
import { TravellerDetailsView } from "@/components/features/booking/traveller-details-view";

interface PageProps {
  params: {
    tripId: string;
  };
}

export default async function TravellerDetailsPage({ params }: PageProps) {
  const tripData = await getValidatedDraftTrip(params.tripId, "travellers");

  let userProfile: { fullName?: string | null; phone?: string | null } | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: rawProfile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .maybeSingle();

      const profile = rawProfile as unknown as {
        full_name: string | null;
        phone: string | null;
      } | null;

      if (profile) {
        userProfile = {
          fullName: profile.full_name,
          phone: profile.phone,
        };
      }
    }
  } catch {
    // Non-blocking fallback
  }

  return (
    <TravellerDetailsView
      tripData={tripData}
      userProfile={userProfile}
    />
  );
}
