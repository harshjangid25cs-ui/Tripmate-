"use client";

import * as React from "react";
import { CatalogImage } from "@/components/ui/CatalogImage";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

const ProfileSecondaryModals = dynamic(
  () => import("./ProfileSecondaryModals").then((m) => m.ProfileSecondaryModals),
  { ssr: false }
);
import { createClient } from "@/lib/supabase/client";
import type { UserProfileData, NotificationItem } from "@/lib/data/profile-types";
import {
  updateUserProfileAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/lib/actions/profile";
import { PwaInstallButton } from "@/components/features/pwa/PwaInstallManager";

interface ProfileViewProps {
  initialProfile: UserProfileData;
  initialNotifications: NotificationItem[];
}

export function ProfileView({
  initialProfile,
  initialNotifications,
}: ProfileViewProps) {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);

  // State
  const [profile, setProfile] = React.useState<UserProfileData>(initialProfile);
  const [notifications, setNotifications] =
    React.useState<NotificationItem[]>(initialNotifications);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  // Modal states
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [isSavedDestinationsOpen, setIsSavedDestinationsOpen] =
    React.useState(false);
  const [isCorporateModalOpen, setIsCorporateModalOpen] = React.useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] =
    React.useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = React.useState(false);
  const [isIdVaultModalOpen, setIsIdVaultModalOpen] = React.useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = React.useState(false);
  const [legalModal, setLegalModal] = React.useState<
    "terms" | "privacy" | null
  >(null);

  // Edit form state
  const [editFullName, setEditFullName] = React.useState(profile.fullName);
  const [editPhone, setEditPhone] = React.useState(profile.phone || "");
  const [editAvatarUrl, setEditAvatarUrl] = React.useState(
    profile.avatarUrl || ""
  );
  const [editError, setEditError] = React.useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Derive initials
  const initials = React.useMemo(() => {
    const parts = (profile.fullName || "User").trim().split(" ");
    const firstInitial = parts[0]?.[0] || "T";
    const secondInitial = parts[1]?.[0] || "";
    if (secondInitial) {
      return (firstInitial + secondInitial).toUpperCase();
    }
    return (profile.fullName || "TM").slice(0, 2).toUpperCase();
  }, [profile.fullName]);

  // Unread notifications count
  const unreadCount = React.useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  // Handle Logout
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.clear();
        // Clear user-specific storage keys
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (
            key &&
            (key.startsWith("sb-") ||
              key.includes("supabase") ||
              key.includes("user") ||
              key.includes("trip"))
          ) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => window.localStorage.removeItem(k));
      }
      setNotifications([]);
      await Promise.allSettled([
        supabase.auth.signOut(),
        fetch("/api/auth/logout", { method: "POST" }),
      ]);
      if (typeof document !== "undefined") {
        document.cookie = "wa_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      }
      router.replace("/login");
      router.refresh();
    } catch {
      setIsLoggingOut(false);
    }
  };

  // Handle Edit Submit
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    setIsSavingProfile(true);

    try {
      const res = await updateUserProfileAction({
        fullName: editFullName,
        phone: editPhone,
        avatarUrl: editAvatarUrl || undefined,
      });

      if (!res.ok) {
        setEditError(res.error || "Failed to update profile.");
        setIsSavingProfile(false);
        return;
      }

      setProfile((prev) => ({
        ...prev,
        fullName: res.data?.fullName || editFullName,
        phone: res.data?.phone || editPhone,
        avatarUrl: res.data?.avatarUrl || null,
      }));

      setIsEditOpen(false);
      router.refresh();
      showToast("Profile updated successfully!");
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Error saving profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle notification read with optimistic update and rollback
  const handleMarkNotificationRead = async (id: string) => {
    const prevNotifications = [...notifications];
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    try {
      const res = await markNotificationReadAction(id);
      if (!res.ok) {
        setNotifications(prevNotifications);
        showToast("Failed to mark notification as read.");
      }
    } catch {
      setNotifications(prevNotifications);
      showToast("Failed to mark notification as read.");
    }
  };

  // Handle mark all notifications read with optimistic update and rollback
  const handleMarkAllRead = async () => {
    const prevNotifications = [...notifications];
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      const res = await markAllNotificationsReadAction();
      if (!res.ok) {
        setNotifications(prevNotifications);
        showToast("Failed to mark all as read.");
      } else {
        showToast("All notifications marked as read.");
      }
    } catch {
      setNotifications(prevNotifications);
      showToast("Failed to mark all as read.");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 pt-3 pb-24 flex flex-col gap-5 antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-surface-dark text-on-primary px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in zoom-95">
          <span className="material-symbols-outlined text-[16px] text-success-green">
            check_circle
          </span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header matching exported screen */}
      <header className="flex items-center justify-between py-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center text-on-primary font-bold text-lg shadow-sm">
            M
          </div>
          <div className="flex flex-col">
            <span className="font-headline-sm text-base text-text-primary font-extrabold tracking-tight">
              Tripmate
            </span>
            <span className="font-label-md text-xs text-text-secondary">
              Profile
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* 1-Tap PWA App Install Button */}
          <PwaInstallButton />

          {/* Notifications Bell */}
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => setIsNotificationsOpen(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-container transition-colors relative"
          >
            <span className="material-symbols-outlined text-[22px]">
              notifications
            </span>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary-container ring-2 ring-surface" />
            )}
          </button>

          {/* Avatar Icon */}
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-xs">
            {initials}
          </div>
        </div>
      </header>

      {/* Top Sub-Header & Stats Overview */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="font-headline-md text-xl font-bold text-text-primary tracking-tight">
            My Profile
          </h1>
          <p className="font-body-sm text-xs text-text-secondary mt-0.5">
            Manage your travels, accounts, and preferences
          </p>
        </div>
        <button
          type="button"
          aria-label="Edit Profile"
          onClick={() => {
            setEditFullName(profile.fullName);
            setEditPhone(profile.phone || "");
            setEditAvatarUrl(profile.avatarUrl || "");
            setEditError(null);
            setIsEditOpen(true);
          }}
          className="h-9 px-3.5 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors flex items-center gap-1.5 text-text-primary text-xs font-semibold"
        >
          <span className="material-symbols-outlined text-[16px]">edit</span>
          <span>Edit</span>
        </button>
      </div>

      {/* User Profile Hero Card */}
      <section className="w-full bg-card-surface border border-border-hairline rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col gap-4">
        <div className="flex items-start gap-4">
          {/* Avatar with initials & status dot */}
          <div className="relative shrink-0">
            {profile.avatarUrl ? (
              <div className="w-16 h-16 rounded-full overflow-hidden bg-surface-dark border-2 border-border-hairline">
                <CatalogImage
                  src={profile.avatarUrl}
                  alt={profile.fullName}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-surface-dark text-on-primary flex items-center justify-center font-headline-sm text-lg font-bold tracking-wider">
                {initials}
              </div>
            )}
            <span
              className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-success-green ring-2 ring-white"
              title="Active Wanderer"
            />
          </div>

          {/* Name, Contact and Badges */}
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-headline-sm text-base font-bold text-text-primary truncate">
                {profile.fullName}
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high text-text-primary font-label-badge text-[10px] font-bold">
                <span
                  className="material-symbols-outlined text-[13px] text-urgency-amber"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
                <span>Level {profile.level}</span>
              </span>
            </div>
            <p className="font-body-sm text-xs text-text-secondary mt-1 truncate">
              {profile.email}
            </p>
            <p className="font-body-sm text-xs text-text-secondary truncate mt-0.5">
              {profile.phone || "+91 98101 23456"}
            </p>
          </div>
        </div>

        {/* Quick Metrics Strip */}
        <div className="grid grid-cols-3 gap-2 pt-3 bg-surface-container-low rounded-xl p-3 border border-border-hairline/40">
          <div className="flex flex-col items-center justify-center text-center">
            <span className="font-numeral-price text-lg font-bold text-text-primary">
              {profile.tripsTaken}
            </span>
            <span className="font-label-md text-[11px] text-text-secondary mt-0.5">
              Trips Taken
            </span>
          </div>
          <div className="flex flex-col items-center justify-center text-center">
            <span className="font-numeral-price text-lg font-bold text-text-primary">
              {profile.savedSpots}
            </span>
            <span className="font-label-md text-[11px] text-text-secondary mt-0.5">
              Saved Spots
            </span>
          </div>
          <div className="flex flex-col items-center justify-center text-center">
            <span className="font-numeral-price text-lg font-bold text-primary-container">
              {profile.kmLogged.toLocaleString("en-IN")}
            </span>
            <span className="font-label-md text-[11px] text-text-secondary mt-0.5">
              KM Logged
            </span>
          </div>
        </div>

        {/* Membership Progress Bar Indicator */}
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-label-md text-xs text-text-primary font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-primary-container">
                workspace_premium
              </span>
              {profile.membershipTier}
            </span>
            <span className="text-text-secondary font-label-badge text-[10px]">
              {profile.progressToNextTier.tripsToNext > 0
                ? `${profile.progressToNextTier.tripsToNext} trips to ${profile.progressToNextTier.nextTierName}`
                : `${profile.progressToNextTier.nextTierName} Member`}
            </span>
          </div>
          <div className="w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
            <div
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={profile.progressToNextTier.progressPct}
              className="bg-primary-container h-full rounded-full transition-all duration-500"
              style={{ width: `${profile.progressToNextTier.progressPct}%` }}
              role="progressbar"
            />
          </div>
        </div>
      </section>

      {/* Recent Trip Vignette Spotlight */}
      {profile.lastCompletedJourney ? (
        <div className="w-full bg-card-surface border border-border-hairline rounded-2xl overflow-hidden shadow-sm p-4 flex items-center gap-3">
          <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-surface-container relative">
            <CatalogImage
              src={profile.lastCompletedJourney.coverImage}
              alt={profile.lastCompletedJourney.title}
              fill
              className="object-cover"
              sizes="64px"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 text-primary-container font-label-badge text-[10px] font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-[13px]">
                route
              </span>
              <span>Last Completed Journey</span>
            </div>
            <p className="font-title-md text-sm font-bold text-text-primary truncate mt-0.5">
              {profile.lastCompletedJourney.title}
            </p>
            <p className="font-body-sm text-xs text-text-secondary truncate mt-0.5">
              {profile.lastCompletedJourney.finishedDateStr} •{" "}
              {profile.lastCompletedJourney.nights} nights •{" "}
              {profile.lastCompletedJourney.staysCount} Stays
            </p>
          </div>
          <Link
            href="/trips"
            aria-label="View Completed Journey"
            className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-text-primary shrink-0 hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">
              chevron_right
            </span>
          </Link>
        </div>
      ) : (
        <div className="w-full bg-card-surface border border-border-hairline rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-text-secondary">
              <span className="material-symbols-outlined text-[20px]">
                luggage
              </span>
            </div>
            <div>
              <p className="font-title-md text-xs font-bold text-text-primary">
                No journeys completed yet
              </p>
              <p className="font-body-sm text-[11px] text-text-secondary">
                Your first royal adventure awaits!
              </p>
            </div>
          </div>
          <Link
            href="/home"
            className="px-3 py-1.5 rounded-lg bg-surface-container text-xs font-semibold text-text-primary hover:bg-surface-container-high"
          >
            Explore
          </Link>
        </div>
      )}

      {/* Account & Preferences Menu (6 items matching Screen 16) */}
      <section className="flex flex-col gap-2">
        <h3 className="font-label-lg text-xs text-text-secondary uppercase tracking-wider px-1 font-semibold">
          Account &amp; Preferences
        </h3>
        <div className="bg-card-surface border border-border-hairline rounded-2xl shadow-sm overflow-hidden divide-y divide-border-hairline">
          {/* 1. Saved Destinations */}
          <button
            type="button"
            onClick={() => setIsSavedDestinationsOpen(true)}
            className="w-full text-left flex items-center gap-3.5 p-4 hover:bg-surface-container-low transition-colors group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center shrink-0 text-primary-container">
              <span
                className="material-symbols-outlined text-[22px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                favorite
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-title-md text-sm font-semibold text-text-primary group-hover:text-primary-container transition-colors">
                Saved Destinations
              </p>
              <p className="font-body-sm text-xs text-text-secondary truncate mt-0.5">
                {profile.savedSpots} destinations bookmarked
              </p>
            </div>
            <span className="material-symbols-outlined text-text-secondary text-[20px]">
              chevron_right
            </span>
          </button>

          {/* 2. Payment Methods */}
          <button
            type="button"
            onClick={() => setIsPaymentModalOpen(true)}
            className="w-full text-left flex items-center gap-3.5 p-4 hover:bg-surface-container-low transition-colors group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center shrink-0 text-primary-container">
              <span className="material-symbols-outlined text-[22px]">
                credit_card
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-title-md text-sm font-semibold text-text-primary group-hover:text-primary-container transition-colors">
                Payment Methods
              </p>
              <p className="font-body-sm text-xs text-text-secondary truncate mt-0.5">
                2 UPI IDs, 1 Saved Card
              </p>
            </div>
            <span className="material-symbols-outlined text-text-secondary text-[20px]">
              chevron_right
            </span>
          </button>

          {/* 3. Trip Preferences */}
          <button
            type="button"
            onClick={() => setIsPreferencesModalOpen(true)}
            className="w-full text-left flex items-center gap-3.5 p-4 hover:bg-surface-container-low transition-colors group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center shrink-0 text-primary-container">
              <span className="material-symbols-outlined text-[22px]">
                tune
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-title-md text-sm font-semibold text-text-primary group-hover:text-primary-container transition-colors">
                Trip Preferences
              </p>
              <p className="font-body-sm text-xs text-text-secondary truncate mt-0.5">
                Stays, vehicle types, rest stop preferences
              </p>
            </div>
            <span className="material-symbols-outlined text-text-secondary text-[20px]">
              chevron_right
            </span>
          </button>

          {/* 4. GST & Corporate Profiles */}
          <button
            type="button"
            onClick={() => setIsCorporateModalOpen(true)}
            className="w-full text-left flex items-center gap-3.5 p-4 hover:bg-surface-container-low transition-colors group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center shrink-0 text-primary-container">
              <span className="material-symbols-outlined text-[22px]">
                apartment
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-title-md text-sm font-semibold text-text-primary group-hover:text-primary-container transition-colors">
                  GST &amp; Corporate Profiles
                </p>
                <span className="px-1.5 py-0.2 rounded bg-surface-container-high text-on-surface-variant font-label-badge text-[10px] font-bold">
                  B2B
                </span>
              </div>
              <p className="font-body-sm text-xs text-text-secondary truncate mt-0.5">
                {profile.companyMembership?.companyName || "Acme Tech Pvt Ltd"}
              </p>
            </div>
            <span className="material-symbols-outlined text-text-secondary text-[20px]">
              chevron_right
            </span>
          </button>

          {/* 5. Reusable ID Vault & Companions */}
          <button
            type="button"
            onClick={() => setIsIdVaultModalOpen(true)}
            className="w-full text-left flex items-center gap-3.5 p-4 hover:bg-surface-container-low transition-colors group cursor-pointer border-t border-border-hairline/30"
          >
            <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center shrink-0 text-primary-container">
              <span className="material-symbols-outlined text-[22px]">
                badge
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-title-md text-sm font-semibold text-text-primary group-hover:text-primary-container transition-colors">
                  Reusable ID Vault &amp; Companions
                </p>
                <span className="px-1.5 py-0.2 rounded bg-[#1F1F1E] text-[#FBF9F5] font-label-badge text-[10px] font-bold">
                  AUTO-APPLY
                </span>
              </div>
              <p className="font-body-sm text-xs text-text-secondary truncate mt-0.5">
                {profile.savedIdStoragePath
                  ? `✓ ID on file (${profile.savedIdType?.toUpperCase() || "GOV ID"}) • ${profile.savedCompanions?.length || 0} Saved Companions`
                  : `Upload Once, Auto-Apply Everywhere • ${profile.savedCompanions?.length || 0} Companions`}
              </p>
            </div>
            <span className="material-symbols-outlined text-text-secondary text-[20px]">
              chevron_right
            </span>
          </button>

          {/* 6. Help & Support */}
          <button
            type="button"
            onClick={() => setIsHelpModalOpen(true)}
            className="w-full text-left flex items-center gap-3.5 p-4 hover:bg-surface-container-low transition-colors group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center shrink-0 text-primary-container">
              <span className="material-symbols-outlined text-[22px]">
                support_agent
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-title-md text-sm font-semibold text-text-primary group-hover:text-primary-container transition-colors">
                Help &amp; Support
              </p>
              <p className="font-body-sm text-xs text-text-secondary truncate mt-0.5">
                24/7 on-trip concierge &amp; FAQs
              </p>
            </div>
            <span className="material-symbols-outlined text-text-secondary text-[20px]">
              chevron_right
            </span>
          </button>

          {/* 6. Settings & Privacy */}
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="w-full text-left flex items-center gap-3.5 p-4 hover:bg-surface-container-low transition-colors group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center shrink-0 text-primary-container">
              <span className="material-symbols-outlined text-[22px]">
                verified_user
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-title-md text-sm font-semibold text-text-primary group-hover:text-primary-container transition-colors">
                Settings &amp; Privacy
              </p>
              <p className="font-body-sm text-xs text-text-secondary truncate mt-0.5">
                Account security, notifications
              </p>
            </div>
            <span className="material-symbols-outlined text-text-secondary text-[20px]">
              chevron_right
            </span>
          </button>
        </div>
      </section>

      {/* Logout Action Card */}
      <div className="w-full">
        <button
          id="logoutBtn"
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full bg-card-surface border border-border-hairline hover:bg-surface-container-low rounded-2xl p-4 shadow-sm flex items-center justify-center gap-2 text-primary-container font-bold text-sm transition-all active:scale-[0.99] disabled:opacity-50"
        >
          {isLoggingOut ? (
            <>
              <span className="material-symbols-outlined animate-spin text-[20px]">
                progress_activity
              </span>
              <span>Logging out...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[20px]">logout</span>
              <span>Log Out</span>
            </>
          )}
        </button>
      </div>

      {/* App Version & Footnote */}
      <div className="flex flex-col items-center justify-center pt-2 text-center">
        <p className="font-body-sm text-[11px] text-text-secondary">
          Tripmate Customer v2.4.0 (Build 8829) • Made in India
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 mt-2 text-[11px] text-text-secondary">
          <Link href="/terms" className="hover:text-text-primary hover:underline">
            Terms of Service
          </Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-text-primary hover:underline">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="/refund-policy" className="hover:text-text-primary hover:underline">
            Refund Policy
          </Link>
          <span>•</span>
          <Link href="/contact" className="hover:text-text-primary hover:underline">
            Contact Us
          </Link>
        </div>
      </div>

      {/* Dynamic Off-Screen Modals & Drawers */}
      {(isEditOpen || isNotificationsOpen || isSavedDestinationsOpen || isCorporateModalOpen || isPaymentModalOpen || isPreferencesModalOpen || isHelpModalOpen || isSettingsModalOpen || legalModal) && (
        <ProfileSecondaryModals
          isEditOpen={isEditOpen}
          setIsEditOpen={setIsEditOpen}
          editFullName={editFullName}
          setEditFullName={setEditFullName}
          editPhone={editPhone}
          setEditPhone={setEditPhone}
          editAvatarUrl={editAvatarUrl}
          setEditAvatarUrl={setEditAvatarUrl}
          editError={editError}
          isSavingProfile={isSavingProfile}
          handleSaveProfile={handleSaveProfile}
          isNotificationsOpen={isNotificationsOpen}
          setIsNotificationsOpen={setIsNotificationsOpen}
          notifications={notifications}
          unreadCount={unreadCount}
          handleMarkAllRead={handleMarkAllRead}
          handleMarkNotificationRead={handleMarkNotificationRead}
          isSavedDestinationsOpen={isSavedDestinationsOpen}
          setIsSavedDestinationsOpen={setIsSavedDestinationsOpen}
          savedDestinations={profile.savedDestinations}
          isCorporateModalOpen={isCorporateModalOpen}
          setIsCorporateModalOpen={setIsCorporateModalOpen}
          companyMembership={profile.companyMembership}
          isPaymentModalOpen={isPaymentModalOpen}
          setIsPaymentModalOpen={setIsPaymentModalOpen}
          isPreferencesModalOpen={isPreferencesModalOpen}
          setIsPreferencesModalOpen={setIsPreferencesModalOpen}
          isHelpModalOpen={isHelpModalOpen}
          setIsHelpModalOpen={setIsHelpModalOpen}
          isSettingsModalOpen={isSettingsModalOpen}
          setIsSettingsModalOpen={setIsSettingsModalOpen}
          legalModal={legalModal}
          setLegalModal={setLegalModal}
          showToast={showToast}
        />
      )}

      {/* Reusable ID Vault & Companions Modal */}
      {isIdVaultModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-[#FFFFFF] rounded-2xl shadow-xl border border-border-hairline overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 bg-[#1F1F1E] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#FF5E1E] text-[22px]">
                  verified_user
                </span>
                <div>
                  <h3 className="font-headline-sm text-base font-bold text-[#FBF9F5]">
                    Reusable ID Vault &amp; Companions
                  </h3>
                  <p className="text-[11px] text-[#EBE9E4]/80">
                    Upload Once, Auto-Apply Everywhere
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsIdVaultModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white transition-colors"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto flex flex-col gap-4 bg-[#FBF9F5]">
              {/* Lead KYC Vault Card */}
              <div className="bg-[#FFFFFF] rounded-xl p-4 border border-border-hairline shadow-sm flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
                    Primary Traveller KYC Vault
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#1F1F1E] text-[#FBF9F5] text-[10px] font-bold">
                    STRICTLY &lt;= 300 KB
                  </span>
                </div>

                {profile.savedIdStoragePath ? (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#EBE9E4]/50 border border-border-hairline/60">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#FF5E1E] text-[24px]">
                        description
                      </span>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-text-primary">
                          {profile.savedIdType ? profile.savedIdType.toUpperCase() : "GOVERNMENT ID"}
                        </span>
                        <span className="text-[11px] text-text-secondary">
                          Encrypted Copy • {profile.savedIdFileSizeBytes ? `${Math.round(profile.savedIdFileSizeBytes / 1024)} KB` : "Auto-Compressed"}
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] text-success-green font-semibold">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      Active on file
                    </span>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-[#EBE9E4]/30 border border-dashed border-border-hairline text-center text-xs text-text-secondary">
                    No KYC document uploaded yet. When you complete your next booking, your document will be compressed to &lt;= 300 KB and securely saved here for 1-click reuse.
                  </div>
                )}
              </div>

              {/* Saved Companions Card */}
              <div className="bg-[#FFFFFF] rounded-xl p-4 border border-border-hairline shadow-sm flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
                    Saved Companions &amp; Co-Travellers
                  </span>
                  <span className="text-xs text-text-secondary font-medium">
                    {profile.savedCompanions?.length || 0} Saved
                  </span>
                </div>

                {profile.savedCompanions && profile.savedCompanions.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {profile.savedCompanions.map((c, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-[#EBE9E4]/40 border border-border-hairline/50 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="material-symbols-outlined text-text-secondary text-[20px]">
                            person
                          </span>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-text-primary">
                              {c.full_name}
                            </span>
                            <span className="text-[10px] text-text-secondary uppercase">
                              {c.id_type || "Government ID"} {c.id_storage_path ? "• ID on file" : ""}
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-[#1F1F1E] text-[#FBF9F5] text-[10px] font-bold">
                          Quick-Fill Ready
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-[#EBE9E4]/30 border border-dashed border-border-hairline text-center text-xs text-text-secondary">
                    No companions saved yet. Add co-travellers during checkout to automatically save family and friends for instant 1-click quick-fill.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#FFFFFF] border-t border-border-hairline flex justify-end">
              <button
                type="button"
                onClick={() => setIsIdVaultModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#1F1F1E] text-[#FBF9F5] text-xs font-semibold hover:bg-black transition-colors"
              >
                Close Vault
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
