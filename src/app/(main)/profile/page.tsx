import * as React from "react";
import { getUserProfileData, getUserNotifications } from "@/lib/data/profile";
import { ProfileView } from "@/components/features/profile/profile-view";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const [profile, notifications] = await Promise.all([
    getUserProfileData(),
    getUserNotifications(),
  ]);

  return (
    <ProfileView
      initialProfile={profile}
      initialNotifications={notifications}
    />
  );
}
