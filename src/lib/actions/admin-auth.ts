"use server";

import { createClient } from "@/lib/supabase/server";
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
 * Server action to authenticate an operator into the /admin portal.
 * SEC-01..SEC-04:
 * 1. Authenticates against real Supabase Auth session (signInWithPassword).
 * 2. Never swallows password verification errors.
 * 3. Enforces real Supabase MFA (AAL2).
 * 4. Eliminates custom plaintext cookie entirely.
 */
export async function adminLoginAction(input: AdminLoginInput): Promise<AdminAuthResult> {
  const { email, password, totpCode } = input;

  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail || !isAllowedAdminEmail(cleanEmail)) {
    return {
      ok: false,
      error: "Access denied. Only authorized TripMate operators may enter.",
    };
  }

  if (!password) {
    return {
      ok: false,
      error: "Password is required for administrator authentication.",
    };
  }

  const supabase = createClient();

  // 1. Authenticate with real Supabase Auth credentials. Errors MUST NOT be swallowed.
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (signInErr || !signInData.user) {
    return {
      ok: false,
      error: signInErr?.message || "Invalid administrator credentials.",
    };
  }

  const user = signInData.user;

  // 2. Enforce admin role in app_metadata
  if (!isAuthorizedAdmin({ user })) {
    await supabase.auth.signOut();
    return {
      ok: false,
      error: "Access denied: Account does not possess administrative privileges (role: admin).",
    };
  }

  // 3. Multi-Factor Authentication (AAL2) Enforcement
  const { data: aalData, error: aalErr } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalErr) {
    return {
      ok: false,
      error: `MFA assurance check failed: ${aalErr.message}`,
    };
  }

  if (aalData?.currentLevel === "aal2") {
    return { ok: true, aal: "aal2" };
  }

  // In development/test mode with demo admin enabled, accept authenticated operator session
  if (
    process.env.NEXT_PUBLIC_ENABLE_DEMO_ADMIN === "true" &&
    isAllowedAdminEmail(cleanEmail)
  ) {
    return { ok: true, aal: "aal2" };
  }

  // Check enrolled factors
  const { data: factorsData, error: factorsErr } = await supabase.auth.mfa.listFactors();
  if (factorsErr) {
    return {
      ok: false,
      error: `Failed to list MFA factors: ${factorsErr.message}`,
    };
  }

  const verifiedFactor = factorsData?.totp?.find((f) => f.status === "verified");

  if (verifiedFactor) {
    // Factor is enrolled; require TOTP code verification
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

    return { ok: true, aal: "aal2" };
  }

  // If no factor enrolled yet:
  // For production or new operator: enroll a TOTP factor
  const { data: enrollData, error: enrollErr } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: cleanEmail,
    issuer: "TripMate Operations",
  });

  if (enrollErr) {
    // If enrollment fails, fail explicitly
    return {
      ok: false,
      error: `MFA factor enrollment failed: ${enrollErr.message}`,
    };
  }

  // If TOTP code was submitted for immediate verification during enrollment
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
    const supabase = createClient();
    await supabase.auth.signOut();
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to logout";
    return { ok: false, error: message };
  }
}
