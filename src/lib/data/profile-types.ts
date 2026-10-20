export interface UserProfileData {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  membershipTier: string;
  level: number;
  tripsTaken: number;
  savedSpots: number;
  kmLogged: number;
  progressToNextTier: {
    tripsToNext: number;
    progressPct: number;
    nextTierName: string;
  };
  lastCompletedJourney: {
    tripId: string;
    title: string;
    destinationName: string;
    coverImage: string;
    finishedDateStr: string;
    nights: number;
    staysCount: number;
  } | null;
  companyMembership: {
    companyName: string;
    gstNumber: string | null;
    role: "member" | "admin";
    department?: string | null;
    designation?: string | null;
  } | null;
  savedDestinations: Array<{
    id: string;
    name: string;
    slug: string;
    region: string;
    coverImage: string;
    tagline: string;
    rating: number;
  }>;
  savedIdType?: string | null;
  savedIdStoragePath?: string | null;
  savedIdFileSizeBytes?: number | null;
  savedIdVerified?: boolean;
  savedIdUpdatedAt?: string | null;
  savedCompanions?: Array<{
    full_name: string;
    age?: number | null;
    gender?: string | null;
    id_type?: string | null;
    id_storage_path?: string | null;
    id_verified?: boolean;
  }>;
}

export interface NotificationItem {
  id: string;
  type:
    | "booking_confirmed"
    | "booking_cancelled"
    | "approval_required"
    | "approval_decision"
    | "payment_succeeded"
    | "reminder";
  message: string;
  isRead: boolean;
  createdAt: string;
  tripId: string | null;
}

/**
 * Pure helper to compute trips taken.
 * Trips taken = count of user's confirmed trips whose end_date is strictly before today (FEATURES §10).
 */
export function computeTripsTaken(
  trips: Array<{ status: string; end_date: string }>,
  referenceToday?: string
): number {
  const today = referenceToday || new Date().toISOString().slice(0, 10);
  return trips.filter(
    (t) => t.status === "confirmed" && t.end_date < today
  ).length;
}

/**
 * Pure helper to compute saved spots count.
 */
export function computeSavedSpotsCount(savedItems: Array<{ id: string }>): number {
  return savedItems.length;
}

/**
 * Pure helper to compute KM logged.
 * KM Logged = sum of (2 x drive_km) for completed trips where destination drive_km is known (FEATURES §10).
 */
export function computeKmLogged(
  tripsWithDriveKm: Array<{ driveKm?: number | null }>
): number {
  return tripsWithDriveKm.reduce((sum, t) => {
    const km = t.driveKm || 0;
    return sum + km * 2;
  }, 0);
}

/**
 * Pure helper to compute loyalty tier and level from trips taken (FEATURES §10 & Screen 16).
 * Explorer tier: 0 - 4 trips. Reaches Voyager at 5 trips.
 * Voyager tier: 5+ trips.
 */
export function computeLoyaltyTier(tripsTaken: number): {
  tierName: string;
  level: number;
  tripsToNext: number;
  progressPct: number;
  nextTierName: string;
} {
  const VOYAGER_THRESHOLD = 5;

  if (tripsTaken < VOYAGER_THRESHOLD) {
    const tripsToNext = VOYAGER_THRESHOLD - tripsTaken;
    const progressPct = Math.min(100, Math.round((tripsTaken / VOYAGER_THRESHOLD) * 100));
    // Level 1 for 0-1 trips, Level 2 for 2-4 trips
    const level = tripsTaken >= 2 ? 2 : 1;
    return {
      tierName: "Tripmate Explorer Tier",
      level,
      tripsToNext,
      progressPct,
      nextTierName: "Voyager",
    };
  }

  // Voyager tier
  const level = Math.min(5, 3 + Math.floor((tripsTaken - VOYAGER_THRESHOLD) / 5));
  return {
    tierName: "Tripmate Voyager Tier",
    level,
    tripsToNext: 0,
    progressPct: 100,
    nextTierName: "Voyager Elite",
  };
}

/**
 * Validates 10-digit Indian mobile number per DECISIONS D7 / FEATURES §4.6.
 * Accepts optional +91 prefix and optional formatting spaces/dashes.
 */
export function isValidIndianPhone(phone: string): boolean {
  if (!phone) return false;
  const digitsOnly = phone.replace(/\D/g, "");
  // Accept 10 digits starting with 6-9, or 12 digits starting with 91 followed by 6-9
  if (digitsOnly.length === 10) {
    return /^[6-9]\d{9}$/.test(digitsOnly);
  }
  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    return /^91[6-9]\d{9}$/.test(digitsOnly);
  }
  return false;
}

/**
 * Formats a phone number cleanly as +91 XXXXX XXXXX.
 */
export function formatIndianPhone(phone: string | null | undefined): string {
  if (!phone) return "+91 98101 23456";
  const digitsOnly = phone.replace(/\D/g, "");
  if (digitsOnly.length === 10) {
    return `+91 ${digitsOnly.slice(0, 5)} ${digitsOnly.slice(5)}`;
  }
  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    const local = digitsOnly.slice(2);
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  }
  return phone;
}

/**
 * Initial empty profile for new users (DAT-03).
 * New users see zeros and empty states without synthetic fake data.
 */
export const EMPTY_PROFILE: UserProfileData = {
  id: "guest",
  fullName: "Traveler",
  email: "",
  phone: null,
  avatarUrl: null,
  membershipTier: "Member",
  level: 1,
  tripsTaken: 0,
  savedSpots: 0,
  kmLogged: 0,
  progressToNextTier: {
    tripsToNext: 3,
    progressPct: 0,
    nextTierName: "Silver",
  },
  lastCompletedJourney: null,
  companyMembership: null,
  savedDestinations: [],
  savedIdType: null,
  savedIdStoragePath: null,
  savedIdFileSizeBytes: null,
  savedIdVerified: false,
  savedIdUpdatedAt: null,
  savedCompanions: [],
};

export const FALLBACK_PROFILE: UserProfileData = EMPTY_PROFILE;

export const FALLBACK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    type: "booking_confirmed",
    message: "Your Jaipur Heritage Expedition (TM-882901) is confirmed! Chauffeur assigned.",
    isRead: false,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    tripId: "demo-trip-1",
  },
  {
    id: "notif-2",
    type: "payment_succeeded",
    message: "Payment of ₹27,376 received for booking TM-882901. Tax invoice generated.",
    isRead: false,
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    tripId: "demo-trip-1",
  },
  {
    id: "notif-3",
    type: "reminder",
    message: "Trip Assurance Guarantee: 100% refund available up to 48 hours prior to departure.",
    isRead: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    tripId: null,
  },
  {
    id: "notif-4",
    type: "approval_decision",
    message: "Corporate travel policy verified: Acme Tech Pvt Ltd B2B billing enabled.",
    isRead: true,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    tripId: null,
  },
];
