"use client";

import React, { useState } from "react";
import { useAdmin } from "@/lib/admin/admin-context";
import { ADMIN_ROLES } from "@/lib/admin/permissions";
import type { AdminRole } from "@/lib/admin/types";
import { Shield, Key, ArrowRight, CheckCircle2 } from "lucide-react";

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
  const [email, setEmail] = useState("superadmin@tripmate.in");
  const [password, setPassword] = useState("••••••••••••");
  const [totpCode, setTotpCode] = useState("123456");
  const [selectedRole, setSelectedRole] = useState<AdminRole>("super_admin");
  const [loading, setLoading] = useState(false);

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast("Please enter your admin email", "error");
      return;
    }
    // Proceed to MFA step (§8.1: MFA TOTP is mandatory for admin)
    setStep("mfa");
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = verifyMfa(totpCode);
    if (!ok) {
      toast("Please enter a 6-digit TOTP code", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await adminLoginAction({
        email,
        password,
        role: selectedRole,
        totpCode,
      });

      if (!res.ok) {
        toast(res.error || "Authentication failed", "error");
        return;
      }

      switchRole(selectedRole);
      toast("AAL2 MFA Verified. Welcome to TripMate Operations.", "success");
      window.location.href = "/admin";
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: AdminRole) => {
    setSelectedRole(role);
    setLoading(true);
    try {
      const targetEmail = ROLE_EMAILS[role] || "superadmin@tripmate.in";
      const res = await adminLoginAction({
        email: targetEmail,
        role,
        totpCode: "123456",
      });

      if (!res.ok) {
        toast(res.error || "Quick login failed", "error");
        return;
      }

      switchRole(role);
      verifyMfa("123456");
      toast(`Authenticated as ${ADMIN_ROLES.find((r) => r.id === role)?.label} (AAL2 Verified)`, "success");
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
            Elevated access requires Multi-Factor Authentication (AAL2) per §8.1
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
                className="w-full rounded-xl border border-border-hairline bg-card-surface p-2.5 text-xs font-semibold text-text-primary focus:border-text-primary focus:outline-none transition-colors"
                required
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
                className="w-full rounded-xl border border-border-hairline bg-card-surface p-2.5 text-xs font-semibold text-text-primary focus:border-text-primary focus:outline-none transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-surface-dark hover:bg-black text-white py-2.5 text-xs font-bold transition-colors shadow-xs"
            >
              <span>Next: MFA Challenge</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleMfaSubmit} className="mt-6 space-y-4 animate-in fade-in">
            <div className="rounded-xl bg-purple-50 p-3.5 border border-purple-200 text-center">
              <Key className="h-6 w-6 text-purple-700 mx-auto" />
              <p className="mt-1 text-xs font-bold text-purple-900">Enter 6-Digit TOTP Code</p>
              <p className="text-[11px] text-purple-700 mt-0.5">
                From Google Authenticator or hardware security key
              </p>
            </div>

            <div>
              <input
                type="text"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                className="w-full rounded-xl border border-border-hairline bg-card-surface p-3 text-center text-lg font-mono font-bold tracking-widest text-text-primary focus:border-text-primary focus:outline-none transition-colors"
                placeholder="123456"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary-container hover:bg-primary-hover disabled:opacity-50 text-white py-2.5 text-xs font-bold transition-colors shadow-xs"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{loading ? "Verifying..." : "Verify & Launch Operations"}</span>
            </button>

            <button
              type="button"
              onClick={() => setStep("credentials")}
              className="w-full text-center text-[11px] text-text-secondary hover:text-text-primary transition-colors"
            >
              ← Back to credentials
            </button>
          </form>
        )}

        {/* Quick Role Switcher for Non-Production & Playwright Testing */}
        {(process.env.NODE_ENV !== "production" ||
          process.env.NEXT_PUBLIC_ENABLE_DEMO_ADMIN === "true" ||
          (typeof window !== "undefined" &&
            (window.location.hostname === "localhost" ||
              window.location.hostname === "127.0.0.1"))) && (
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
                  className="rounded-xl border border-border-hairline bg-surface hover:bg-card-surface hover:border-text-primary disabled:opacity-50 p-2.5 text-left transition-colors"
                >
                  <span className="block text-[11px] font-bold text-text-primary leading-tight">
                    {r.label}
                  </span>
                  <span className="text-[9px] text-text-secondary truncate block mt-0.5">
                    Test §2 powers
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
