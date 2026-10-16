"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserProfileData, NotificationItem } from "@/lib/data/profile-types";
import {
  updateUserProfileAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/lib/actions/profile";

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
      await supabase.auth.signOut();
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
      showToast("Profile updated successfully!");
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Error saving profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle notification read
  const handleMarkNotificationRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    await markNotificationReadAction(id);
  };

  // Handle mark all notifications read
  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await markAllNotificationsReadAction();
    showToast("All notifications marked as read.");
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
                <Image
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
            <Image
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

          {/* 5. Help & Support */}
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

      {/* ================= MODALS & DRAWERS ================= */}

      {/* 1. Edit Profile Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-card-surface border border-border-hairline rounded-2xl shadow-xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border-hairline pb-3">
              <h3 className="font-headline-sm text-base font-bold text-text-primary">
                Edit Profile
              </h3>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary"
              >
                <span className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-3.5">
              {editError && (
                <div className="p-3 rounded-xl bg-error/10 border border-error/30 text-error text-xs font-medium">
                  {editError}
                </div>
              )}

              {/* Full Name */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-text-primary">
                  Full Name <span className="text-primary-container">*</span>
                </label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="e.g. Arjun Kapoor"
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-border-hairline bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-container"
                />
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-text-primary">
                  Phone (Indian Mobile)
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+91 98101 23456"
                  className="w-full px-3 py-2.5 rounded-xl border border-border-hairline bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-container"
                />
                <span className="text-[10px] text-text-secondary">
                  10-digit mobile number for concierge updates
                </span>
              </div>

              {/* Avatar URL */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-text-primary">
                  Avatar Image URL (Optional)
                </label>
                <input
                  type="url"
                  value={editAvatarUrl}
                  onChange={(e) => setEditAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 rounded-xl border border-border-hairline bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-container"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-hairline">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  disabled={isSavingProfile}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-5 py-2.5 rounded-xl bg-primary-container text-white text-xs font-bold shadow-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSavingProfile ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Notifications Modal */}
      {isNotificationsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-card-surface border border-border-hairline rounded-2xl shadow-xl p-5 flex flex-col gap-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-border-hairline pb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-headline-sm text-base font-bold text-text-primary">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-primary-container text-white text-[10px] font-bold">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-semibold text-primary-container hover:underline"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsNotificationsOpen(false)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    close
                  </span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-xs text-text-secondary">
                  No notifications yet.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleMarkNotificationRead(n.id)}
                    className={`p-3 rounded-xl border transition-colors cursor-pointer ${
                      n.isRead
                        ? "bg-surface border-border-hairline/60"
                        : "bg-surface-container-low border-primary-container/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-xs text-text-primary">
                        {n.type === "booking_confirmed"
                          ? "Booking Confirmed"
                          : n.type === "payment_succeeded"
                          ? "Payment Successful"
                          : n.type === "approval_decision"
                          ? "Corporate Approval"
                          : "Trip Reminder"}
                      </span>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-primary-container shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-text-secondary text-xs mt-1 leading-relaxed">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-text-secondary/70 mt-1.5">
                      {new Date(n.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Saved Destinations Modal */}
      {isSavedDestinationsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-card-surface border border-border-hairline rounded-2xl shadow-xl p-5 flex flex-col gap-4 max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-border-hairline pb-3">
              <div>
                <h3 className="font-headline-sm text-base font-bold text-text-primary">
                  Saved Destinations
                </h3>
                <p className="text-xs text-text-secondary">
                  {profile.savedDestinations.length} places bookmarked
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSavedDestinationsOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary"
              >
                <span className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto pr-1">
              {profile.savedDestinations.map((d) => (
                <div
                  key={d.id}
                  className="p-3 rounded-xl border border-border-hairline bg-surface flex items-center gap-3"
                >
                  <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 relative bg-surface-container">
                    <Image
                      src={d.coverImage}
                      alt={d.name}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-title-md text-xs font-bold text-text-primary truncate">
                        {d.name}
                      </p>
                      <span className="text-[11px] font-bold text-urgency-amber flex items-center gap-0.5">
                        <span
                          className="material-symbols-outlined text-[12px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>
                        {d.rating}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary truncate mt-0.5">
                      {d.tagline}
                    </p>
                    <Link
                      href={`/destinations/${d.slug}`}
                      className="text-[11px] text-primary-container font-bold hover:underline mt-1 inline-block"
                    >
                      Plan Trip →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. GST & Corporate Profiles Modal */}
      {isCorporateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-card-surface border border-border-hairline rounded-2xl shadow-xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border-hairline pb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-headline-sm text-base font-bold text-text-primary">
                  Corporate Profile
                </h3>
                <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant text-[10px] font-bold">
                  B2B
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCorporateModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary"
              >
                <span className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-surface-container-low border border-border-hairline flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-secondary">Company Name</span>
                <span className="font-bold text-text-primary">
                  {profile.companyMembership?.companyName || "Acme Tech Pvt Ltd"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-secondary">GSTIN</span>
                <span className="font-mono font-bold text-text-primary">
                  {profile.companyMembership?.gstNumber || "07AABCA1234F1Z5"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-secondary">Tax Credit</span>
                <span className="font-bold text-success-green flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">
                    verified
                  </span>
                  ITC Qualified
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-secondary">Role</span>
                <span className="font-semibold text-text-primary capitalize">
                  {profile.companyMembership?.role || "Member"} (
                  {profile.companyMembership?.designation || "Tech Lead"})
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Link
                href="/commercial"
                className="w-full py-2.5 rounded-xl bg-primary-container text-white text-xs font-bold text-center shadow-sm hover:opacity-90"
              >
                Open Corporate Portal
              </Link>
              <button
                type="button"
                onClick={() => setIsCorporateModalOpen(false)}
                className="w-full py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Payment Methods Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-card-surface border border-border-hairline rounded-2xl shadow-xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border-hairline pb-3">
              <h3 className="font-headline-sm text-base font-bold text-text-primary">
                Saved Payment Methods
              </h3>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary"
              >
                <span className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>
            </div>

            <div className="flex flex-col gap-2 text-xs">
              <div className="p-3 rounded-xl bg-surface border border-border-hairline flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[20px] text-primary-container">
                    account_balance
                  </span>
                  <div>
                    <p className="font-bold text-text-primary">UPI • arjun@okaxis</p>
                    <p className="text-text-secondary text-[11px]">Primary UPI handle</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-success-green/10 text-success-green font-bold text-[10px]">
                  Active
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-border-hairline flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[20px] text-primary-container">
                    credit_card
                  </span>
                  <div>
                    <p className="font-bold text-text-primary">HDFC Regalia •••• 4092</p>
                    <p className="text-text-secondary text-[11px]">Exp 09/28 • Tokenized</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-surface-container-high text-text-secondary font-bold text-[10px]">
                  Saved
                </span>
              </div>
            </div>

            <p className="text-[11px] text-text-secondary italic text-center">
              Per RBI mandate, all cards are stored as secure network tokens.
            </p>

            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-text-primary"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* 6. Trip Preferences Modal */}
      {isPreferencesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-card-surface border border-border-hairline rounded-2xl shadow-xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border-hairline pb-3">
              <h3 className="font-headline-sm text-base font-bold text-text-primary">
                Trip Preferences
              </h3>
              <button
                type="button"
                onClick={() => setIsPreferencesModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary"
              >
                <span className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <p className="font-bold text-text-primary mb-1.5">Stay Preferences</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-full bg-primary-container text-white font-semibold">
                    Heritage Haveli
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-surface-container text-text-secondary font-semibold">
                    Luxury Resort
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-surface-container text-text-secondary font-semibold">
                    Boutique Homestay
                  </span>
                </div>
              </div>

              <div>
                <p className="font-bold text-text-primary mb-1.5">Vehicle Preference</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-full bg-primary-container text-white font-semibold">
                    Chauffeur Driven SUV
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-surface-container text-text-secondary font-semibold">
                    Self-Drive Sedan
                  </span>
                </div>
              </div>

              <div>
                <p className="font-bold text-text-primary mb-1.5">Rest Stop Priorities</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-full bg-primary-container text-white font-semibold">
                    Sanitized Restrooms
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-primary-container text-white font-semibold">
                    Artisanal Chai
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsPreferencesModalOpen(false);
                showToast("Trip preferences saved!");
              }}
              className="w-full py-2.5 rounded-xl bg-primary-container text-white text-xs font-bold shadow-sm"
            >
              Save Preferences
            </button>
          </div>
        </div>
      )}

      {/* 7. Help & Support Modal */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-card-surface border border-border-hairline rounded-2xl shadow-xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border-hairline pb-3">
              <h3 className="font-headline-sm text-base font-bold text-text-primary">
                24/7 Concierge Support
              </h3>
              <button
                type="button"
                onClick={() => setIsHelpModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary"
              >
                <span className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>
            </div>

            <div className="flex flex-col gap-2.5 text-xs">
              <a
                href="tel:18001234567"
                className="p-3 rounded-xl bg-surface border border-border-hairline flex items-center gap-3 hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[22px] text-primary-container">
                  call
                </span>
                <div>
                  <p className="font-bold text-text-primary">Toll-Free Helpline</p>
                  <p className="text-text-secondary text-[11px]">1800 123 4567 (24x7 India)</p>
                </div>
              </a>

              <a
                href="https://wa.me/919810123456"
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl bg-surface border border-border-hairline flex items-center gap-3 hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[22px] text-success-green">
                  chat
                </span>
                <div>
                  <p className="font-bold text-text-primary">WhatsApp On-Trip Assist</p>
                  <p className="text-text-secondary text-[11px]">Live support for ongoing journeys</p>
                </div>
              </a>

              <div className="p-3 rounded-xl bg-surface-container-low border border-border-hairline/60">
                <p className="font-bold text-text-primary mb-1">Trip Assurance Guarantee</p>
                <p className="text-text-secondary text-[11px] leading-relaxed">
                  Need to cancel or modify? Enjoy 100% refund on cancellations made at least 48 hours prior to trip start.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsHelpModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-surface-container text-xs font-semibold text-text-primary"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 8. Settings & Privacy Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-card-surface border border-border-hairline rounded-2xl shadow-xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border-hairline pb-3">
              <h3 className="font-headline-sm text-base font-bold text-text-primary">
                Settings &amp; Privacy
              </h3>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary"
              >
                <span className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-border-hairline">
                <div>
                  <p className="font-bold text-text-primary">Push Notifications</p>
                  <p className="text-text-secondary text-[11px]">Trip status &amp; chauffeur alerts</p>
                </div>
                <span className="w-9 h-5 rounded-full bg-success-green flex items-center px-0.5 justify-end">
                  <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border-hairline">
                <div>
                  <p className="font-bold text-text-primary">WhatsApp Updates</p>
                  <p className="text-text-secondary text-[11px]">Boarding pass &amp; invoices</p>
                </div>
                <span className="w-9 h-5 rounded-full bg-success-green flex items-center px-0.5 justify-end">
                  <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="font-bold text-text-primary">Privacy Mode</p>
                  <p className="text-text-secondary text-[11px]">Mask identity on shared manifests</p>
                </div>
                <span className="w-9 h-5 rounded-full bg-surface-container-highest flex items-center px-0.5">
                  <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsSettingsModalOpen(false);
                showToast("Settings updated!");
              }}
              className="w-full py-2.5 rounded-xl bg-primary-container text-white text-xs font-bold shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* 9. Legal Modal (Terms / Privacy) */}
      {legalModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-card-surface border border-border-hairline rounded-2xl shadow-xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border-hairline pb-3">
              <h3 className="font-headline-sm text-base font-bold text-text-primary">
                {legalModal === "terms" ? "Terms of Service" : "Privacy Policy"}
              </h3>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary"
              >
                <span className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>
            </div>

            <div className="text-xs text-text-secondary leading-relaxed max-h-60 overflow-y-auto pr-1 flex flex-col gap-2">
              {legalModal === "terms" ? (
                <>
                  <p>
                    <strong>Trip Assurance Guarantee:</strong> Cancellations made at least 48 hours prior to trip commencement are entitled to a 100% full refund credited to the original source.
                  </p>
                  <p>
                    <strong>Chauffeur & Fleet Standards:</strong> All vehicles are commercial licensed with verified drivers and GPS tracking.
                  </p>
                  <p>
                    <strong>Corporate Billing:</strong> GST registered invoices with SAC 998555 comply with Indian taxation statutes.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <strong>Data Privacy & Security:</strong> TripMate adheres strictly to data minimization standards. ID documents are uploaded securely and ID numbers are never permanently stored.
                  </p>
                  <p>
                    <strong>Public Tickets:</strong> Passenger boarding passes display only voyage essentials and never reveal phone numbers, ID records, or financial information.
                  </p>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setLegalModal(null)}
              className="w-full py-2.5 rounded-xl bg-surface-container text-xs font-semibold text-text-primary"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
