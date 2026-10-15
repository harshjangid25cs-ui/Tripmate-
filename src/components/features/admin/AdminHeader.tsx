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
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur">
      {/* Brand & Area */}
      <div className="flex items-center gap-4">
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white font-black text-lg shadow-sm">
            T
          </div>
          <div>
            <span className="text-base font-black tracking-tight text-slate-900">TripMate</span>
            <span className="ml-1.5 rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-amber-400 uppercase">
              Operations Center
            </span>
          </div>
        </Link>

        <span className="hidden md:inline-block text-xs font-medium text-slate-400">|</span>

        {/* Customer App Link */}
        <Link
          href="/home"
          target="_blank"
          className="hidden md:inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-primary-600 transition-colors"
        >
          Customer App <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {/* Center / Security Status */}
      <div className="hidden lg:flex items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          <span>RLS & Functions Enforced</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-800 border border-purple-200">
          <Shield className="h-3.5 w-3.5 text-purple-600" />
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
            className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all shadow-sm ${
              activeRoleInfo?.badgeColor || "bg-slate-100 text-slate-800 border-slate-300"
            }`}
          >
            <span className="flex h-2 w-2 rounded-full bg-current animate-pulse" />
            <span>Role: {activeRoleInfo?.label}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Switch Admin Perspective
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
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
                        ? "bg-slate-100 font-bold text-slate-900"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{role.label}</span>
                      {currentRole === role.id && (
                        <span className="text-[10px] text-primary-600 font-bold">ACTIVE</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500 font-normal leading-relaxed">
                      {role.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Operator Profile */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-xs">
            {currentAdmin.full_name.charAt(0)}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-slate-900 leading-none">{currentAdmin.full_name}</p>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-none">{currentAdmin.email}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
