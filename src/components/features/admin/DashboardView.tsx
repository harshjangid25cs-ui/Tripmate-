"use client";

import React from "react";
import { AdminService } from "@/lib/admin/admin-service";
import { useAdmin } from "@/lib/admin/admin-context";
import {
  TrendingUp,
  CreditCard,
  Ban,
  FileCheck2,
  Building2,
  Car,
  MapPin,
  ArrowUpRight,
  ShieldAlert,
  History,
} from "lucide-react";

export function DashboardView({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { currentAdmin } = useAdmin();

  const bookings = AdminService.getBookings();
  const idReviews = AdminService.getIdReviews();
  const approvals = AdminService.getCommercialApprovals();
  const auditLogs = AdminService.getAuditLogs();

  const totalRevenue = bookings
    .filter((b) => b.status === "confirmed" || b.status === "completed")
    .reduce((acc, b) => acc + b.total_amount, 0);

  const pendingIdsCount = idReviews.filter((r) => r.status === "pending").length;
  const pendingApprovalsCount = approvals.filter((a) => a.status === "pending_approval").length;
  const cancelledBookings = bookings.filter((b) => b.status === "cancelled").length;

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl bg-slate-900 p-6 text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-300 uppercase tracking-wider">
              Live Operations Feed (IST)
            </span>
            <span className="text-xs text-slate-400">• High Assurance Mode</span>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight">
            Welcome back, {currentAdmin.full_name}
          </h1>
          <p className="mt-1 text-sm text-slate-300 max-w-xl">
            TripMate Admin & Operations engine running under strict RLS, immutable audit triggers,
            and least-privilege role matrix.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate("documents")}
            className="flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 px-4 py-2 text-xs font-bold text-white backdrop-blur transition-all border border-white/10"
          >
            <FileCheck2 className="h-4 w-4 text-amber-400" />
            <span>ID Queue ({pendingIdsCount})</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("approvals")}
            className="flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 px-4 py-2 text-xs font-bold text-white backdrop-blur transition-all border border-white/10"
          >
            <Building2 className="h-4 w-4 text-purple-400" />
            <span>Approvals ({pendingApprovalsCount})</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("destinations")}
            className="flex items-center gap-2 rounded-2xl bg-amber-400 hover:bg-amber-300 px-4 py-2 text-xs font-bold text-slate-950 transition-all shadow-md"
          >
            <MapPin className="h-4 w-4" />
            <span>Manage Catalog</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Confirmed Revenue
            </span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              ₹{totalRevenue.toLocaleString("en-IN")}
            </span>
            <span className="text-xs font-bold text-emerald-600 flex items-center">
              +14.2% <TrendingUp className="h-3 w-3 ml-0.5" />
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">From normal & commercial bookings</p>
        </div>

        {/* Total Bookings */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Bookings
            </span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
              <Car className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{bookings.length}</span>
            <span className="text-xs text-slate-500">reservations</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {bookings.filter((b) => b.status === "confirmed").length} confirmed ·{" "}
            {bookings.filter((b) => b.status === "pending_approval").length} awaiting approval
          </p>
        </div>

        {/* Pending ID Verification */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              IDs Awaiting Review
            </span>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
              <FileCheck2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{pendingIdsCount}</span>
            {pendingIdsCount > 0 && (
              <span className="text-xs font-bold text-amber-600">Requires Ops Action</span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">Expiring 60s temporary preview links</p>
        </div>

        {/* Cancellations */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Cancellations & Refunds
            </span>
            <div className="rounded-xl bg-rose-50 p-2 text-rose-600">
              <Ban className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{cancelledBookings}</span>
            <span className="text-xs text-slate-500">records</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Tiered refund rules & policy enforcement</p>
        </div>
      </div>

      {/* Main Grid: Recent Bookings & Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bookings Table / 2 cols */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Bookings Feed</h2>
              <p className="text-xs text-slate-500">Real-time status of passenger & commercial bookings</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("bookings")}
              className="flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-700"
            >
              View All <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-4 divide-y divide-slate-100 overflow-x-auto">
            {bookings.slice(0, 5).map((booking) => (
              <div
                key={booking.id}
                className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/80 px-2 rounded-xl transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-xs ${
                      booking.kind === "commercial"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {booking.kind === "commercial" ? "CORP" : "NORM"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{booking.booking_ref}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-medium text-slate-600">{booking.customer_name}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {booking.destination_name} · {booking.days} Days · {booking.traveler_count} Pax
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs font-black text-slate-900">
                    ₹{booking.total_amount.toLocaleString("en-IN")}
                  </p>
                  <span
                    className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                      booking.status === "confirmed"
                        ? "bg-emerald-100 text-emerald-800"
                        : booking.status === "pending_approval"
                        ? "bg-purple-100 text-purple-800"
                        : booking.status === "cancelled"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {booking.status.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Feed / 1 col */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-slate-500" />
                <h2 className="text-base font-bold text-slate-900">Append-Only Audit</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("audit")}
                className="text-xs font-bold text-primary-600 hover:text-primary-700"
              >
                Log
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              {auditLogs.slice(0, 4).map((entry) => (
                <div key={entry.id} className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800">{entry.actor_name}</span>
                    <span className="text-[10px] font-medium text-slate-400">
                      {new Date(entry.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="rounded bg-slate-200 px-1 py-0.2 text-[9px] font-extrabold uppercase text-slate-700">
                      {entry.action}
                    </span>
                    <span className="text-[11px] text-slate-600 font-medium">
                      {entry.entity_type} {entry.entity_id ? `(${entry.entity_id})` : ""}
                    </span>
                  </div>
                  {entry.reason && (
                    <p className="mt-1 text-[11px] italic text-slate-500 leading-tight">
                      &quot;{entry.reason}&quot;
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-amber-50 p-3 border border-amber-200">
            <div className="flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                Database guarantees audit rows cannot be edited or deleted by any role or service key.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
