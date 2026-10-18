/**
 * admin-auth.ts — Server-side Admin Authorization & AAL2 MFA Verification
 * Enforces role-based platform access control per ADMIN.md §1 & §8 and SEC-01..SEC-04.
 */

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { AdminRole } from "./types";

export const DEFAULT_ADMIN_EMAILS = [
  "tripmateoffical007@gmail.com",
  "superadmin@tripmate.in",
  "catalog@tripmate.in",
  "ops@tripmate.in",
  "finance@tripmate.in",
  "support@tripmate.in",
] as const;

export interface RequireAdminResult {
  user: User;
  role: AdminRole;
  aal: "aal2";
}

/**
 * Checks whether an email belongs to the predefined platform admin allowlist.
 */
export function isAllowedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();

  const envAdmins = process.env.ADMIN_EMAILS
    ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase())
    : [];

  if (envAdmins.includes(normalized)) {
    return true;
  }

  return DEFAULT_ADMIN_EMAILS.some((e) => e.toLowerCase() === normalized);
}

/**
 * Verifies whether a Supabase user object possesses administrative privileges.
 * Strictly verifies tamper-proof app_metadata.role (or configured allowlist for test environments).
 */
export function isAuthorizedAdmin({
  user,
}: {
  user?: {
    email?: string | null;
    app_metadata?: Record<string, unknown> | null;
    user_metadata?: Record<string, unknown> | null;
  } | null;
}): boolean {
  if (!user) return false;

  const appRole = user.app_metadata?.role;
  if (appRole === "admin" || appRole === "super_admin") {
    return true;
  }

  // Fallback for development/test environment if explicitly configured
  if (
    process.env.NEXT_PUBLIC_ENABLE_DEMO_ADMIN === "true" &&
    user.email &&
    isAllowedAdminEmail(user.email)
  ) {
    return true;
  }

  return false;
}

/**
 * requireAdmin()
 * ONE shared server-side function that enforces:
 * 1. Active Supabase Auth session via getUser()
 * 2. Administrative role (app_metadata.role === 'admin' | 'super_admin')
 * 3. AAL2 Multi-Factor Authentication via getAuthenticatorAssuranceLevel()
 * 
 * Used at the top of EVERY admin Server Action and admin route.
 */
export async function requireAdmin(options: { redirectOnFail?: boolean } = {}): Promise<RequireAdminResult> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    if (options.redirectOnFail) {
      redirect("/admin/login");
    }
    throw new Error("Unauthorized: Active admin authentication session required.");
  }

  if (!isAuthorizedAdmin({ user })) {
    if (options.redirectOnFail) {
      redirect("/home");
    }
    throw new Error("Forbidden: Elevated administrative privileges (role: admin) required.");
  }

  // Check Authenticator Assurance Level (AAL2)
  const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalError) {
    if (options.redirectOnFail) {
      redirect("/admin/login?error=mfa_check_failed");
    }
    throw new Error(`Forbidden: Failed to verify MFA assurance level: ${aalError.message}`);
  }

  if (aalData?.currentLevel !== "aal2") {
    // If running in development/test demo mode without factors yet, allow elevated bypass only if explicitly enabled
    if (
      process.env.NEXT_PUBLIC_ENABLE_DEMO_ADMIN === "true" &&
      isAllowedAdminEmail(user.email)
    ) {
      // In demo test mode, session is accepted as AAL2 equivalent
    } else {
      if (options.redirectOnFail) {
        redirect("/admin/login?mfa=required");
      }
      throw new Error("Forbidden: Multi-Factor Authentication (AAL2) assurance level required.");
    }
  }

  const appRole = (user.app_metadata?.role as string) || "ops_manager";
  const role: AdminRole = appRole === "super_admin" ? "super_admin" : "ops_manager";

  return {
    user,
    role,
    aal: "aal2",
  };
}
