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

  let userProfile: {
    fullName?: string | null;
    phone?: string | null;
    savedIdType?: string | null;
    savedIdStoragePath?: string | null;
    savedIdFileSizeBytes?: number | null;
    savedIdVerified?: boolean;
    savedCompanions?: Array<{
      full_name: string;
      age?: number | null;
      gender?: string | null;
      id_type?: string | null;
      id_storage_path?: string | null;
      id_verified?: boolean;
    }>;
  } | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: rawProfile } = await supabase
        .from("profiles")
        .select("full_name, phone, saved_id_type, saved_id_storage_path, saved_id_file_size_bytes, saved_id_verified, saved_companions")
        .eq("id", user.id)
        .maybeSingle();

      const profile = rawProfile as unknown as {
        full_name: string | null;
        phone: string | null;
        saved_id_type: string | null;
        saved_id_storage_path: string | null;
        saved_id_file_size_bytes: number | null;
        saved_id_verified: boolean | null;
        saved_companions: Array<{
          full_name: string;
          age?: number | null;
          gender?: string | null;
          id_type?: string | null;
          id_storage_path?: string | null;
          id_verified?: boolean;
        }> | null;
      } | null;

      if (profile) {
        userProfile = {
          fullName: profile.full_name,
          phone: profile.phone,
          savedIdType: profile.saved_id_type,
          savedIdStoragePath: profile.saved_id_storage_path,
          savedIdFileSizeBytes: profile.saved_id_file_size_bytes,
          savedIdVerified: Boolean(profile.saved_id_verified),
          savedCompanions: Array.isArray(profile.saved_companions) ? profile.saved_companions : [],
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
