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
  const [, setTick] = React.useState(0);

  React.useEffect(() => {
    return AdminService.subscribe(() => {
      setTick((t) => t + 1);
    });
  }, []);

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
    <div className="space-y-6 animate-in fade-in">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl bg-surface-dark p-6 text-white border border-border-hairline shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-300 uppercase tracking-wider">
              Live Operations Feed (IST)
            </span>
            <span className="text-xs text-slate-300">• High Assurance Mode</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
            Welcome back, {currentAdmin.full_name}
          </h1>
          <p className="mt-1 text-xs text-slate-300 max-w-xl">
            TripMate Admin & Operations engine running under strict RLS, immutable audit triggers,
            and least-privilege role matrix.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate("documents")}
            className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-xs font-bold text-white transition-colors border border-white/15"
          >
            <FileCheck2 className="h-4 w-4 text-amber-400" />
            <span>ID Queue ({pendingIdsCount})</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("approvals")}
            className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-xs font-bold text-white transition-colors border border-white/15"
          >
            <Building2 className="h-4 w-4 text-purple-300" />
            <span>Approvals ({pendingApprovalsCount})</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("destinations")}
            className="flex items-center gap-2 rounded-xl bg-primary-container hover:bg-primary-hover px-4 py-2.5 text-xs font-bold text-white transition-colors shadow-xs"
          >
            <MapPin className="h-4 w-4" />
            <span>Manage Catalog</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <div className="rounded-2xl border border-border-hairline bg-card-surface p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              Total Confirmed Revenue
            </span>
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2 text-emerald-700">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-text-primary tabular-nums">
              ₹{totalRevenue.toLocaleString("en-IN")}
            </span>
            <span className="text-xs font-bold text-emerald-700 flex items-center">
              +14.2% <TrendingUp className="h-3 w-3 ml-0.5" />
            </span>
          </div>
          <p className="mt-1 text-xs text-text-secondary">From normal & commercial bookings</p>
        </div>

        {/* Total Bookings */}
        <div className="rounded-2xl border border-border-hairline bg-card-surface p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              Active Bookings
            </span>
            <div className="rounded-xl bg-surface-container-low border border-border-hairline p-2 text-text-primary">
              <Car className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-text-primary tabular-nums">{bookings.length}</span>
            <span className="text-xs font-medium text-text-secondary">reservations</span>
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            {bookings.filter((b) => b.status === "confirmed").length} confirmed ·{" "}
            {bookings.filter((b) => b.status === "pending_approval").length} awaiting approval
          </p>
        </div>

        {/* Pending ID Verification */}
        <div className="rounded-2xl border border-border-hairline bg-card-surface p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              IDs Awaiting Review
            </span>
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-2 text-amber-700">
              <FileCheck2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-text-primary tabular-nums">{pendingIdsCount}</span>
            {pendingIdsCount > 0 && (
              <span className="text-xs font-bold text-amber-700">Requires Ops Action</span>
            )}
          </div>
          <p className="mt-1 text-xs text-text-secondary">Expiring 60s temporary preview links</p>
        </div>

        {/* Cancellations */}
        <div className="rounded-2xl border border-border-hairline bg-card-surface p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              Cancellations & Refunds
            </span>
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-2 text-rose-700">
              <Ban className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-text-primary tabular-nums">{cancelledBookings}</span>
            <span className="text-xs font-medium text-text-secondary">records</span>
          </div>
          <p className="mt-1 text-xs text-text-secondary">Tiered refund rules & policy enforcement</p>
        </div>
      </div>

      {/* Main Grid: Recent Bookings & Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bookings Table / 2 cols */}
        <div className="lg:col-span-2 rounded-2xl border border-border-hairline bg-card-surface p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-border-hairline">
            <div>
              <h2 className="text-base font-bold text-text-primary">Recent Bookings Feed</h2>
              <p className="text-xs text-text-secondary">Real-time status of passenger & commercial bookings</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("bookings")}
              className="flex items-center gap-1 text-xs font-bold text-primary-container hover:text-primary-hover transition-colors"
            >
              <span>View All</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-4 divide-y divide-border-hairline/60 overflow-x-auto">
            {bookings.slice(0, 5).map((booking) => (
              <div
                key={booking.id}
                className="py-3.5 flex items-center justify-between gap-4 hover:bg-surface-container-low/50 px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-xs border ${
                      booking.kind === "commercial"
                        ? "bg-purple-50 text-purple-800 border-purple-200"
                        : "bg-surface-container-low text-text-primary border-border-hairline"
                    }`}
                  >
                    {booking.kind === "commercial" ? "CORP" : "NORM"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-text-primary">{booking.booking_ref}</span>
                      <span className="text-xs text-text-secondary/60">•</span>
                      <span className="text-xs font-medium text-text-secondary">{booking.customer_name}</span>
                    </div>
                    <p className="text-[11px] text-text-secondary mt-0.5">
                      {booking.destination_name} · {booking.days} Days · {booking.traveler_count} Pax
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs font-bold text-text-primary tabular-nums">
                    ₹{booking.total_amount.toLocaleString("en-IN")}
                  </p>
                  <span
                    className={`inline-block mt-0.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize border ${
                      booking.status === "confirmed"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : booking.status === "pending_approval"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : booking.status === "cancelled"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-surface-container-low text-text-secondary border-border-hairline"
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
        <div className="rounded-2xl border border-border-hairline bg-card-surface p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-border-hairline">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-text-secondary" />
                <h2 className="text-base font-bold text-text-primary">Append-Only Audit</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("audit")}
                className="text-xs font-bold text-primary-container hover:text-primary-hover transition-colors"
              >
                Log
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {auditLogs.slice(0, 4).map((entry) => (
                <div key={entry.id} className="rounded-xl bg-surface p-3 border border-border-hairline">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-text-primary">{entry.actor_name}</span>
                    <span className="text-[10px] font-medium text-text-secondary">
                      {new Date(entry.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="rounded bg-surface-container px-1.5 py-0.5 text-[9px] font-bold uppercase text-text-primary border border-border-hairline/60">
                      {entry.action}
                    </span>
                    <span className="text-[11px] text-text-secondary font-medium truncate">
                      {entry.entity_type} {entry.entity_id ? `(${entry.entity_id})` : ""}
                    </span>
                  </div>
                  {entry.reason && (
                    <p className="mt-1 text-[11px] italic text-text-secondary leading-tight">
                      &quot;{entry.reason}&quot;
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-amber-50 p-3 border border-amber-200">
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
