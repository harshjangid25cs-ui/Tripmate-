"use client";

import React from "react";
import { CatalogImage } from "@/components/ui/CatalogImage";
import Link from "next/link";
import type { NotificationItem, UserProfileData } from "@/lib/data/profile-types";

export interface ProfileSecondaryModalsProps {
  isEditOpen: boolean;
  setIsEditOpen: (open: boolean) => void;
  editFullName: string;
  setEditFullName: (val: string) => void;
  editPhone: string;
  setEditPhone: (val: string) => void;
  editAvatarUrl: string;
  setEditAvatarUrl: (val: string) => void;
  editError: string | null;
  isSavingProfile: boolean;
  handleSaveProfile: (e: React.FormEvent) => void;

  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (open: boolean) => void;
  notifications: NotificationItem[];
  unreadCount: number;
  handleMarkAllRead: () => void;
  handleMarkNotificationRead: (id: string) => void;

  isSavedDestinationsOpen: boolean;
  setIsSavedDestinationsOpen: (open: boolean) => void;
  savedDestinations: UserProfileData["savedDestinations"];

  isCorporateModalOpen: boolean;
  setIsCorporateModalOpen: (open: boolean) => void;
  companyMembership: UserProfileData["companyMembership"];

  isPaymentModalOpen: boolean;
  setIsPaymentModalOpen: (open: boolean) => void;

  isPreferencesModalOpen: boolean;
  setIsPreferencesModalOpen: (open: boolean) => void;

  isHelpModalOpen: boolean;
  setIsHelpModalOpen: (open: boolean) => void;

  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (open: boolean) => void;

  legalModal: "terms" | "privacy" | null;
  setLegalModal: (val: "terms" | "privacy" | null) => void;

  showToast: (msg: string) => void;
}

export function ProfileSecondaryModals({
  isEditOpen,
  setIsEditOpen,
  editFullName,
  setEditFullName,
  editPhone,
  setEditPhone,
  editAvatarUrl,
  setEditAvatarUrl,
  editError,
  isSavingProfile,
  handleSaveProfile,

  isNotificationsOpen,
  setIsNotificationsOpen,
  notifications,
  unreadCount,
  handleMarkAllRead,
  handleMarkNotificationRead,

  isSavedDestinationsOpen,
  setIsSavedDestinationsOpen,
  savedDestinations,

  isCorporateModalOpen,
  setIsCorporateModalOpen,
  companyMembership,

  isPaymentModalOpen,
  setIsPaymentModalOpen,

  isPreferencesModalOpen,
  setIsPreferencesModalOpen,

  isHelpModalOpen,
  setIsHelpModalOpen,

  isSettingsModalOpen,
  setIsSettingsModalOpen,

  legalModal,
  setLegalModal,

  showToast,
}: ProfileSecondaryModalsProps) {
  return (
    <>
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
                    <p className="text-xs text-text-secondary mt-1">{n.message}</p>
                    <span className="text-[10px] text-text-secondary mt-2 block">
                      {new Date(n.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
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
          <div className="w-full max-w-sm bg-card-surface border border-border-hairline rounded-2xl shadow-xl p-5 flex flex-col gap-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-border-hairline pb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-headline-sm text-base font-bold text-text-primary">
                  Saved Destinations
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-surface-container text-text-secondary text-[10px] font-bold">
                  {savedDestinations.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsSavedDestinationsOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto pr-1">
              {savedDestinations.length === 0 ? (
                <div className="text-center py-8 text-xs text-text-secondary">
                  No saved destinations yet.
                </div>
              ) : (
                savedDestinations.map((d) => (
                  <div
                    key={d.id}
                    className="p-3 rounded-xl border border-border-hairline bg-surface flex items-center gap-3"
                  >
                    <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 relative bg-surface-container">
                      <CatalogImage
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
                ))
              )}
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
                  {companyMembership?.companyName || "Acme Tech Pvt Ltd"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-secondary">GSTIN</span>
                <span className="font-mono font-bold text-text-primary">
                  {companyMembership?.gstNumber || "07AABCA1234F1Z5"}
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
                  {companyMembership?.role || "Member"} (
                  {companyMembership?.designation || "Tech Lead"})
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
    </>
  );
}

export default ProfileSecondaryModals;
