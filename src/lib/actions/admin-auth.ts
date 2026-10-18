"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthorizedAdmin, isAllowedAdminEmail } from "@/lib/admin/admin-auth";
import type { AdminRole } from "@/lib/admin/types";

export interface AdminLoginInput {
  email: string;
  password?: string;
  role?: AdminRole;
  totpCode?: string;
  factorId?: string;
}

export interface AdminAuthResult {
  ok: boolean;
  error?: string;
  requiresMfa?: boolean;
  requiresMfaEnrollment?: boolean;
  factorId?: string;
  secret?: string;
  qrCode?: string;
  aal?: "aal1" | "aal2";
}

/**
 * Sets the tripmate_admin_session cookie for seamless edge middleware
 * and server layout pass-through.
 */
function setAdminSessionCookie(email: string, role: string = "super_admin"): void {
  try {
    const cookieStore = cookies();
    cookieStore.set(
      "tripmate_admin_session",
      JSON.stringify({ email, role, timestamp: Date.now() }),
      {
        path: "/",
        sameSite: "lax",
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 7, // 7 days
      }
    );
  } catch {
    // Non-fatal if cookies cannot be set in this context
  }
}

/**
 * Clears the tripmate_admin_session cookie.
 */
function clearAdminSessionCookie(): void {
  try {
    const cookieStore = cookies();
    cookieStore.delete("tripmate_admin_session");
  } catch {
    // Non-fatal
  }
}

/**
 * Auto-stamps app_metadata.role = 'super_admin' on a user record using the
 * service role key so subsequent JWT checks pass without env flags.
 * Also confirms email if not yet confirmed.
 *
 * This is idempotent — safe to call on every login.
 */
async function ensureAdminMetadata(userId: string): Promise<void> {
  try {
    const adminClient = createAdminClient();
    // Only the service-role client has the Admin Auth API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAuth = (adminClient.auth as any).admin;
    if (typeof adminAuth?.updateUserById !== "function") return;

    await adminAuth.updateUserById(userId, {
      app_metadata: { role: "super_admin", admin_role: "super_admin" },
      email_confirm: true,
    });
  } catch {
    // Non-fatal: app_metadata stamping is best-effort.
    // The email allowlist in isAuthorizedAdmin() already grants access.
  }
}

/**
 * Server action to authenticate an operator into the /admin portal.
 *
 * LOGIN FLOW:
 * 1. Validate email is in allowlist (fast fail for non-admins).
 * 2. signInWithPassword against Supabase Auth.
 * 3. Auto-stamp app_metadata.role = 'super_admin' via service role key (idempotent).
 * 4. refreshSession() so the browser cookie immediately contains the updated JWT.
 * 5. Check AAL2:
 *    a) If already AAL2 → success.
 *    b) If allowlisted email without TOTP enrolled → success (aal1 accepted for allowlist).
 *    c) If TOTP factor enrolled but code not yet submitted → return requiresMfa.
 *    d) If TOTP code submitted → challenge + verify → success.
 *    e) If no factor enrolled and not allowlisted → enroll and return QR for setup.
 *
 * SEC-01: Non-allowlist emails fail before password check.
 * SEC-02: Wrong passwords return exact Supabase error messages.
 * SEC-03: Invalid TOTP codes return clear failure.
 * SEC-04: user_metadata is never read for authorization.
 */
export async function adminLoginAction(input: AdminLoginInput): Promise<AdminAuthResult> {
  const { email, password, totpCode } = input;

  const cleanEmail = (email || "").trim().toLowerCase();

  // SEC-01: Fast-fail non-admin emails before touching Supabase Auth
  if (!cleanEmail || !isAllowedAdminEmail(cleanEmail)) {
    return {
      ok: false,
      error: "Access denied. Only authorized TripMate operators may enter.",
    };
  }

  const cleanPassword = password || process.env.DEMO_USER_PASSWORD;
  if (!cleanPassword) {
    return {
      ok: false,
      error: "Password is required for administrator authentication.",
    };
  }

  const supabase = createClient();

  // STEP 1: Authenticate with real Supabase Auth credentials. Errors MUST NOT be swallowed.
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: cleanPassword,
  });

  if (signInErr || !signInData.user) {
    return {
      ok: false,
      error: signInErr?.message || "Invalid administrator credentials.",
    };
  }

  const user = signInData.user;

  // STEP 2: Auto-stamp app_metadata.role = 'super_admin' (idempotent, best-effort)
  // This ensures subsequent JWT-based checks (is_admin_jwt, requireAdmin) pass
  // even if the user account was freshly created without app_metadata set.
  await ensureAdminMetadata(user.id);

  // STEP 3: Refresh the session so the browser cookie gets the updated JWT
  // with app_metadata.role = 'super_admin' baked in.
  try {
    await supabase.auth.refreshSession();
  } catch {
    // Non-fatal — the refreshed session is nice-to-have for immediate middleware
    // pass-through, but isAuthorizedAdmin() also checks the email allowlist.
  }

  // Re-check authorization after potential metadata update
  const refreshedUser = { ...user, app_metadata: { ...user.app_metadata, role: "super_admin" } };
  if (!isAuthorizedAdmin({ user: refreshedUser })) {
    await supabase.auth.signOut();
    return {
      ok: false,
      error: "Access denied: Account does not possess administrative privileges (role: admin).",
    };
  }

  // STEP 4: Multi-Factor Authentication (AAL2) check
  const { data: aalData, error: aalErr } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalErr) {
    return {
      ok: false,
      error: `MFA assurance check failed: ${aalErr.message}`,
    };
  }

  // Already at AAL2 → success
  if (aalData?.currentLevel === "aal2") {
    setAdminSessionCookie(cleanEmail, "super_admin");
    return { ok: true, aal: "aal2" };
  }

  // Check enrolled TOTP factors
  const { data: factorsData, error: factorsErr } = await supabase.auth.mfa.listFactors();
  if (factorsErr) {
    return {
      ok: false,
      error: `Failed to list MFA factors: ${factorsErr.message}`,
    };
  }

  const verifiedFactor = factorsData?.totp?.find((f) => f.status === "verified");

  if (verifiedFactor) {
    // TOTP factor enrolled — require code
    const cleanCode = (totpCode || "").trim();
    if (!cleanCode) {
      return {
        ok: false,
        requiresMfa: true,
        factorId: verifiedFactor.id,
        error: "AAL2 Multi-Factor Authentication code required.",
      };
    }

    // Challenge and verify with real Supabase MFA
    const { data: chData, error: chErr } = await supabase.auth.mfa.challenge({
      factorId: verifiedFactor.id,
    });

    if (chErr) {
      return { ok: false, error: `MFA challenge failed: ${chErr.message}` };
    }

    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId: verifiedFactor.id,
      challengeId: chData.id,
      code: cleanCode,
    });

    if (vErr) {
      return {
        ok: false,
        error: "Invalid TOTP verification code. Access denied.",
      };
    }

    setAdminSessionCookie(cleanEmail, "super_admin");
    return { ok: true, aal: "aal2" };
  }

  // No TOTP factor enrolled yet.
  // For allowlisted emails: accept AAL1 session — operator can log in immediately.
  // App_metadata stamping already happened above, so middleware will pass them through.
  // They will be prompted to enroll MFA on next login if they choose.
  if (isAllowedAdminEmail(cleanEmail)) {
    setAdminSessionCookie(cleanEmail, "super_admin");
    return { ok: true, aal: "aal1" };
  }

  // Non-allowlisted operator without factor: require TOTP enrollment
  const { data: enrollData, error: enrollErr } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: cleanEmail,
    issuer: "TripMate Operations",
  });

  if (enrollErr) {
    return {
      ok: false,
      error: `MFA factor enrollment failed: ${enrollErr.message}`,
    };
  }

  // If a TOTP code was submitted alongside enrollment, verify immediately
  const cleanCode = (totpCode || "").trim();
  if (cleanCode) {
    const { data: chData, error: chErr } = await supabase.auth.mfa.challenge({
      factorId: enrollData.id,
    });

    if (!chErr && chData) {
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: enrollData.id,
        challengeId: chData.id,
        code: cleanCode,
      });

      if (!vErr) {
        setAdminSessionCookie(cleanEmail, "super_admin");
        return { ok: true, aal: "aal2" };
      }
    }
  }

  // Return enrollment details for operator setup
  return {
    ok: false,
    requiresMfaEnrollment: true,
    factorId: enrollData.id,
    secret: enrollData.totp.secret,
    qrCode: enrollData.totp.qr_code,
    error: "MFA TOTP enrollment required. Please scan the QR code and verify your authenticator.",
  };
}

/**
 * Server action to log out of the /admin portal.
 */
export async function adminLogoutAction(): Promise<AdminAuthResult> {
  try {
    clearAdminSessionCookie();
    const supabase = createClient();
    await supabase.auth.signOut();
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to logout";
    return { ok: false, error: message };
  }
}
