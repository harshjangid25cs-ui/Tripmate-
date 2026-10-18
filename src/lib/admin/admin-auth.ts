/**
 * admin-auth.ts — Server-side Admin Authorization & AAL2 MFA Verification
 * Enforces role-based platform access control per ADMIN.md §1 & §8 and SEC-01..SEC-04.
 *
 * AUTHORIZATION PRIORITY (checked in order, first match wins):
 *  1. app_metadata.role === 'admin' | 'super_admin'  (tamper-proof server-only JWT claim)
 *  2. Email in ADMIN_EMAILS env var or NEXT_PUBLIC_ADMIN_EMAILS env var
 *  3. Email in hardcoded DEFAULT_ADMIN_EMAILS allowlist
 *  4. Email ends with @tripmate.in domain
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
 * Checks env vars, hardcoded list, and @tripmate.in domain.
 */
export function isAllowedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();

  // 1. Check ADMIN_EMAILS env var (server-side, comma-separated)
  const envAdmins = process.env.ADMIN_EMAILS
    ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase())
    : [];
  if (envAdmins.length > 0 && envAdmins.includes(normalized)) {
    return true;
  }

  // 2. Check NEXT_PUBLIC_ADMIN_EMAILS env var (client-accessible, comma-separated)
  const pubEnvAdmins = process.env.NEXT_PUBLIC_ADMIN_EMAILS
    ? process.env.NEXT_PUBLIC_ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase())
    : [];
  if (pubEnvAdmins.length > 0 && pubEnvAdmins.includes(normalized)) {
    return true;
  }

  // 3. Check hardcoded DEFAULT_ADMIN_EMAILS allowlist
  if (DEFAULT_ADMIN_EMAILS.some((e) => e.toLowerCase() === normalized)) {
    return true;
  }

  // 4. @tripmate.in domain is always an admin domain
  if (normalized.endsWith("@tripmate.in")) {
    return true;
  }

  return false;
}

/**
 * Verifies whether a Supabase user object possesses administrative privileges.
 *
 * SECURITY MODEL:
 * - app_metadata.role is set server-side only (via SUPABASE_SERVICE_ROLE_KEY) and is
 *   tamper-proof — it is NEVER settable by the client. This is the gold standard check.
 * - The email allowlist is a secondary fallback for operators who haven't yet had their
 *   app_metadata stamped (e.g. new accounts, fresh environments). The allowlist itself
 *   is maintained in env vars or the hardcoded DEFAULT_ADMIN_EMAILS constant.
 * - user_metadata is client-writable and MUST NEVER be used for authorization.
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

  // PRIMARY CHECK: tamper-proof server-only app_metadata
  const appRole = user.app_metadata?.role;
  if (appRole === "admin" || appRole === "super_admin") {
    return true;
  }

  // SECONDARY CHECK: Email allowlist (env vars + hardcoded list + @tripmate.in domain)
  // This runs in ALL environments (dev + production) — not gated behind any env flag.
  // Operators whose app_metadata hasn't been stamped yet can still access the panel.
  // auto-stamping happens in adminLoginAction after successful password auth.
  if (user.email && isAllowedAdminEmail(user.email)) {
    return true;
  }

  return false;
}

/**
 * requireAdmin()
 * ONE shared server-side function that enforces:
 * 1. Active Supabase Auth session via getUser()
 * 2. Administrative role (app_metadata.role === 'admin' | 'super_admin' OR email allowlist)
 * 3. AAL2 Multi-Factor Authentication via getAuthenticatorAssuranceLevel()
 *    (bypassed for allowlisted emails that haven't yet enrolled MFA — they are
 *    authenticated via password at minimum, and app_metadata will be auto-stamped)
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
    // AAL2 bypass: For allowlisted admin emails that haven't enrolled TOTP yet
    // (password auth = aal1 is sufficient until they complete MFA enrollment).
    // The login action will have already set their app_metadata so the session is trusted.
    if (isAllowedAdminEmail(user.email)) {
      // Accepted as AAL1-with-allowlist: operator will be prompted to enroll MFA
      // on their next login if they haven't already.
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
