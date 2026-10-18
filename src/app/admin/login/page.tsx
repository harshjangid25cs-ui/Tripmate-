"use client";

import React, { useState } from "react";
import { useAdmin } from "@/lib/admin/admin-context";
import { ADMIN_ROLES } from "@/lib/admin/permissions";
import type { AdminRole } from "@/lib/admin/types";
import { Shield, CheckCircle2, QrCode } from "lucide-react";
import { adminLoginAction } from "@/lib/actions/admin-auth";

const ROLE_EMAILS: Record<AdminRole, string> = {
  super_admin: "superadmin@tripmate.in",
  catalog_manager: "catalog@tripmate.in",
  ops_manager: "ops@tripmate.in",
  finance_manager: "finance@tripmate.in",
  support_agent: "support@tripmate.in",
};

export default function AdminLoginPage() {
  const { switchRole, verifyMfa, toast } = useAdmin();

  const [step, setStep] = useState<"credentials" | "mfa">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // MFA Enrollment details returned from server if no factor is yet enrolled
  const [isEnrollment, setIsEnrollment] = useState(false);
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    if (!email || !password) {
      const msg = "Please enter your administrator email and password";
      setErrorBanner(msg);
      toast(msg, "error");
      return;
    }
    setLoading(true);
    try {
      const res = await adminLoginAction({
        email: email.trim(),
        password,
      });

      // Success path: ok === true means authenticated (aal1 or aal2)
      if (res.ok) {
        switchRole("super_admin");
        const aalLabel = res.aal === "aal2" ? "AAL2 MFA Verified." : "Session authenticated.";
        toast(`${aalLabel} Welcome to TripMate Operations.`, "success");
        // Full navigation clears Next.js router cache and passes updated cookie to middleware
        window.location.assign("/admin");
        return;
      }

      // MFA enrollment required (non-allowlisted operator, first login)
      if (res.requiresMfaEnrollment) {
        setIsEnrollment(true);
        setMfaQrCode(res.qrCode || null);
        setMfaSecret(res.secret || null);
        setStep("mfa");
        toast("MFA setup required. Scan the QR code to enroll.", "info");
        return;
      }

      // TOTP challenge required (factor already enrolled, code not yet submitted)
      if (res.requiresMfa) {
        setIsEnrollment(false);
        setStep("mfa");
        return;
      }

      // Explicit error — show a high-contrast banner
      const errMsg = res.error || "Authentication failed. Check your credentials and try again.";
      setErrorBanner(errMsg);
      toast(errMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    if (!totpCode || totpCode.trim().length !== 6) {
      const msg = "Please enter a 6-digit TOTP code";
      setErrorBanner(msg);
      toast(msg, "error");
      return;
    }

    setLoading(true);
    try {
      const res = await adminLoginAction({
        email: email.trim(),
        password,
        totpCode: totpCode.trim(),
      });

      if (!res.ok) {
        const errMsg = res.error || "MFA Verification failed";
        setErrorBanner(errMsg);
        toast(errMsg, "error");
        return;
      }

      switchRole("super_admin");
      verifyMfa(totpCode.trim());
      toast("AAL2 MFA Verified. Welcome to TripMate Operations.", "success");
      window.location.assign("/admin");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: AdminRole) => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const targetEmail = ROLE_EMAILS[role] || "superadmin@tripmate.in";
      const res = await adminLoginAction({
        email: targetEmail,
        role,
        totpCode: "123456",
      });

      if (!res.ok) {
        const errMsg = res.error || "Quick login failed";
        setErrorBanner(errMsg);
        toast(errMsg, "error");
        return;
      }

      switchRole(role);
      verifyMfa("123456");
      toast(`Authenticated as ${ADMIN_ROLES.find((r) => r.id === role)?.label}`, "success");
      window.location.assign("/admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full items-center justify-center p-6 bg-surface">
      <div className="w-full max-w-md rounded-2xl bg-card-surface p-8 shadow-xs border border-border-hairline">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface-dark text-white shadow-xs">
            <Shield className="h-6 w-6 text-amber-400" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-text-primary tracking-tight">
            TripMate Admin Portal
          </h1>
          <p className="mt-1 text-xs text-text-secondary">
            Elevated access requires Multi-Factor Authentication (AAL2)
          </p>
        </div>

        {errorBanner && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-500/20 bg-red-50 p-3 text-xs font-semibold text-red-700"
          >
            {errorBanner}
          </div>
        )}

        {step === "credentials" ? (
          <form onSubmit={handleCredentialsSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                Administrator Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@tripmate.in"
                className="w-full rounded-xl border border-border-hairline bg-card-surface p-2.5 text-xs font-semibold text-text-primary focus:border-text-primary focus:outline-none transition-colors"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-border-hairline bg-card-surface p-2.5 text-xs font-semibold text-text-primary focus:border-text-primary focus:outline-none transition-colors"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-surface-dark hover:bg-black disabled:opacity-50 text-white py-2.5 text-xs font-bold transition-colors shadow-xs"
            >
              <span>{loading ? "Authenticating..." : "Continue to Operations"}</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleMfaSubmit} className="mt-6 space-y-4">
            {isEnrollment && (
              <div className="flex flex-col items-center justify-center p-4 bg-surface rounded-xl border border-border-hairline mb-2 text-center">
                <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary mb-2">
                  <QrCode className="h-4 w-4 text-primary" />
                  <span>Scan to Enroll Authenticator</span>
                </div>
                {mfaQrCode && (
                  mfaQrCode.startsWith("data:") ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={mfaQrCode}
                      alt="TOTP QR Code"
                      className="w-44 h-44 rounded-lg border border-border-hairline bg-white p-2"
                    />
                  ) : (
                    <div
                      className="w-44 h-44 bg-white p-2 rounded-lg border border-border-hairline flex items-center justify-center"
                      dangerouslySetInnerHTML={{ __html: mfaQrCode }}
                    />
                  )
                )}
                {mfaSecret && (
                  <p className="mt-2 text-[10px] font-mono text-text-secondary select-all">
                    Key: <span className="font-bold text-text-primary">{mfaSecret}</span>
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                {isEnrollment ? "Enter 6-Digit Code to Confirm Setup" : "6-Digit Authenticator Code"}
              </label>
              <input
                type="text"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-xl border border-border-hairline bg-card-surface p-3 text-center text-lg font-mono font-bold tracking-widest text-text-primary focus:border-text-primary focus:outline-none transition-colors"
                placeholder="123456"
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-surface-dark hover:bg-black disabled:opacity-50 text-white py-2.5 text-xs font-bold transition-colors shadow-xs"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>{loading ? "Verifying..." : isEnrollment ? "Verify & Complete Enrollment" : "Verify & Launch Operations"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("credentials");
                setIsEnrollment(false);
                setMfaQrCode(null);
                setMfaSecret(null);
                setErrorBanner(null);
              }}
              className="w-full text-center text-[11px] text-text-secondary hover:text-text-primary transition-colors"
            >
              ← Back to credentials
            </button>
          </form>
        )}

        {/* Quick Role Switcher for Pair Programming / Demonstration */}
        <div className="mt-8 pt-6 border-t border-border-hairline">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary text-center">
            Operator Fast Launch (Seeded Roles)
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {ADMIN_ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin(r.id)}
                className="rounded-xl border border-border-hairline bg-surface hover:bg-card-surface disabled:opacity-50 p-2.5 text-left transition-colors"
              >
                <span className="block text-xs font-bold text-text-primary leading-tight">
                  {r.label}
                </span>
                <span className="text-[10px] text-text-secondary truncate block mt-0.5">
                  Test §2 powers
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
