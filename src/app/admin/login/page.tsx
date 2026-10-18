"use client";

import React, { useState } from "react";
import { useAdmin } from "@/lib/admin/admin-context";
import { Shield, CheckCircle2, QrCode } from "lucide-react";
import { adminLoginAction } from "@/lib/actions/admin-auth";

export default function AdminLoginPage() {
  const { switchRole, verifyMfa, toast } = useAdmin();

  const [step, setStep] = useState<"credentials" | "mfa">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [loading, setLoading] = useState(false);

  // MFA Enrollment details returned from server if no factor is yet enrolled
  const [isEnrollment, setIsEnrollment] = useState(false);
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast("Please enter your administrator email and password", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await adminLoginAction({
        email: email.trim(),
        password,
      });

      if (!res.ok) {
        if (res.requiresMfaEnrollment) {
          setIsEnrollment(true);
          setMfaQrCode(res.qrCode || null);
          setMfaSecret(res.secret || null);
          setStep("mfa");
          toast("MFA setup required. Scan the QR code to enroll.", "info");
          return;
        }

        if (res.requiresMfa) {
          setIsEnrollment(false);
          setStep("mfa");
          return;
        }

        toast(res.error || "Authentication failed", "error");
        return;
      }

      switchRole("super_admin");
      toast("AAL2 MFA Verified. Welcome to TripMate Operations.", "success");
      window.location.href = "/admin";
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode || totpCode.trim().length !== 6) {
      toast("Please enter a 6-digit TOTP code", "error");
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
        toast(res.error || "MFA Verification failed", "error");
        return;
      }

      switchRole("super_admin");
      verifyMfa(totpCode.trim());
      toast("AAL2 MFA Verified. Welcome to TripMate Operations.", "success");
      window.location.href = "/admin";
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
              }}
              className="w-full text-center text-[11px] text-text-secondary hover:text-text-primary transition-colors"
            >
              ← Back to credentials
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
