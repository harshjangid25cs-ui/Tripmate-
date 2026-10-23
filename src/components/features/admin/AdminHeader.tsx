"use client";

import React from "react";
import Link from "next/link";
import { useAdmin } from "@/lib/admin/admin-context";
import { ADMIN_ROLES } from "@/lib/admin/permissions";
import { Shield, ChevronDown, CheckCircle2, ExternalLink } from "lucide-react";

export function AdminHeader() {
  const { currentAdmin, currentRole, switchRole, isMfaVerified } = useAdmin();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const activeRoleInfo = ADMIN_ROLES.find((r) => r.id === currentRole);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full shrink-0 items-center justify-between border-b border-[#E5E3DF] bg-[#FFFFFF] px-6">
      {/* Brand & Area */}
      <div className="flex items-center gap-4">
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-container text-white font-black text-lg shadow-xs">
            T
          </div>
          <div>
            <span className="text-base font-black tracking-tight text-text-primary">TripMate</span>
            <span className="ml-2 rounded-md bg-surface-dark px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-400 uppercase">
              Operations Center
            </span>
          </div>
        </Link>

        <span className="hidden md:inline-block text-xs font-medium text-text-secondary/40">|</span>

        {/* Customer App Link */}
        <Link
          href="/home"
          target="_blank"
          className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-primary-container transition-colors"
        >
          <span>Customer App</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {/* Center / Security Status */}
      <div className="hidden lg:flex items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
          <span>RLS & Functions Enforced</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-800 border border-purple-200">
          <Shield className="h-3.5 w-3.5 text-purple-700" />
          <span>{isMfaVerified ? "AAL2 TOTP Verified" : "AAL1 Session"}</span>
        </div>
      </div>

      {/* Right Controls: Role Switcher & Profile */}
      <div className="flex items-center gap-4">
        {/* Role Switcher Pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-xl border border-border-hairline bg-surface hover:bg-surface-container-low px-3 py-1.5 text-xs font-bold text-text-primary transition-all shadow-xs"
          >
            <span className="flex h-2 w-2 rounded-full bg-primary-container" />
            <span>Role: {activeRoleInfo?.label}</span>
            <ChevronDown className="h-3.5 w-3.5 text-text-secondary" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-border-hairline bg-card-surface p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-2 border-b border-border-hairline">
                <p className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Switch Admin Perspective
                </p>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  Test the §2 Role & Permissions Matrix live across all 5 operational roles:
                </p>
              </div>
              <div className="mt-1 space-y-1">
                {ADMIN_ROLES.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => {
                      switchRole(role.id);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left rounded-xl p-2.5 transition-all text-xs ${
                      currentRole === role.id
                        ? "bg-surface-dark font-bold text-white shadow-xs"
                        : "hover:bg-surface-container-low text-text-primary"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{role.label}</span>
                      {currentRole === role.id && (
                        <span className="text-[10px] text-primary-container font-bold">ACTIVE</span>
                      )}
                    </div>
                    <p
                      className={`mt-0.5 text-[11px] font-normal leading-relaxed ${
                        currentRole === role.id ? "text-slate-300" : "text-text-secondary"
                      }`}
                    >
                      {role.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Operator Profile */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-border-hairline">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-dark text-white font-bold text-xs">
            {currentAdmin.full_name.charAt(0)}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-text-primary leading-none">{currentAdmin.full_name}</p>
            <p className="text-[10px] text-text-secondary mt-0.5 leading-none">{currentAdmin.email}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
