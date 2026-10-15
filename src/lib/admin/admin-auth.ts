/**
 * admin-auth.ts — Server-side Admin Authorization & Session Verification
 * Enforces role-based platform access control per ADMIN.md §1 & §8.
 */

import type { AdminRole } from "./types";

export const ADMIN_SESSION_COOKIE = "tripmate_admin_session";

export const DEFAULT_ADMIN_EMAILS = [
  "tripmateoffical007@gmail.com",
  "superadmin@tripmate.in",
  "catalog@tripmate.in",
  "ops@tripmate.in",
  "finance@tripmate.in",
  "support@tripmate.in",
] as const;

export interface AdminSessionPayload {
  email: string;
  role: AdminRole;
  verifiedAt: number;
  exp: number;
}

/**
 * Checks whether an email belongs to the admin allowlist.
 */
export function isAllowedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();

  // Allow emails from environment variable if configured
  const envAdmins = process.env.ADMIN_EMAILS
    ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase())
    : [];

  if (envAdmins.includes(normalized)) {
    return true;
  }

  // Predefined platform operator emails
  if (DEFAULT_ADMIN_EMAILS.some((adminEmail) => adminEmail.toLowerCase() === normalized)) {
    return true;
  }

  // Domain-level fallback for operator domain
  if (normalized.endsWith("@tripmate.in")) {
    return true;
  }

  return false;
}

/**
 * Validates and decodes the admin session cookie string.
 */
export function parseAdminSessionCookie(cookieValue?: string | null): AdminSessionPayload | null {
  if (!cookieValue) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(cookieValue)) as AdminSessionPayload;
    if (
      parsed &&
      typeof parsed.email === "string" &&
      typeof parsed.role === "string" &&
      typeof parsed.exp === "number"
    ) {
      // Check expiration
      if (Date.now() > parsed.exp) {
        return null;
      }
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Creates a serialized admin session payload with a 12-hour expiration window.
 */
export function createAdminSessionPayload(email: string, role: AdminRole): string {
  const payload: AdminSessionPayload = {
    email,
    role,
    verifiedAt: Date.now(),
    exp: Date.now() + 12 * 60 * 60 * 1000, // 12 hours
  };
  return encodeURIComponent(JSON.stringify(payload));
}

/**
 * Pure check to verify if a caller has administrator privileges.
 */
export function isAuthorizedAdmin({
  user,
  adminSessionCookie,
}: {
  user?: {
    email?: string | null;
    app_metadata?: Record<string, unknown> | null;
    user_metadata?: Record<string, unknown> | null;
  } | null;
  adminSessionCookie?: string | null;
}): boolean {
  // 1. Check verified admin session cookie
  const session = parseAdminSessionCookie(adminSessionCookie);
  if (session && isAllowedAdminEmail(session.email)) {
    return true;
  }

  // 2. Check Supabase user attributes if authenticated
  if (user) {
    // Check app_metadata.role (tamper-proof, set via server/service role only)
    const appRole = user.app_metadata?.role;
    if (appRole === "admin" || appRole === "super_admin") {
      return true;
    }

    // Check email allowlist
    if (user.email && isAllowedAdminEmail(user.email)) {
      return true;
    }
  }

  return false;
}
