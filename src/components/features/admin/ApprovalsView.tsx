"use client";

import React, { useState } from "react";
import { AdminService } from "@/lib/admin/admin-service";
import { useAdmin } from "@/lib/admin/admin-context";
import type { CommercialApprovalItem } from "@/lib/admin/types";
import { adminResolveApprovalAction } from "@/lib/actions/admin-ops";
import { Building2, CheckCircle2 } from "lucide-react";

export function ApprovalsView() {
  const { currentAdmin, hasPermission, requestReasonModal, toast, refreshOperationalData } = useAdmin();
  const [approvals, setApprovals] = useState<CommercialApprovalItem[]>(() =>
    AdminService.getCommercialApprovals()
  );
  const [isMutating, setIsMutating] = useState(false);

  const canApprove = hasPermission("commercial_approval");
  const refresh = () => setApprovals(AdminService.getCommercialApprovals());

  const handleDecision = (
    item: CommercialApprovalItem,
    decision: "approved" | "rejected"
  ) => {
    if (!canApprove) {
      toast("Restricted: Ops Manager or Super Admin role required", "error");
      return;
    }

    requestReasonModal(
      decision === "approved" ? "Approve Commercial Fleet Booking" : "Reject Commercial Fleet Booking",
      `Override approval decision for corporate reservation ${item.company_name} (Total: ₹${item.total_amount.toLocaleString(
        "en-IN"
      )}). Note will be transmitted to company administrators.`,
      async (note) => {
        setIsMutating(true);
        try {
          const res = AdminService.decideCommercialApproval(
            currentAdmin,
            item.trip_id,
            decision,
            note
          );

          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.trip_id);
          if (isUuid) {
            const serverRes = await adminResolveApprovalAction({
              tripId: item.trip_id,
              decision,
              notes: note,
            });
            if (!serverRes.ok) {
              toast(serverRes.error || "Server action failed", "error");
              return;
            }
          }

          if (res.ok) {
            toast(`Commercial booking ${decision} successfully`, "success");
            refresh();
            await refreshOperationalData();
          } else {
            toast(res.error || "Decision failed", "error");
          }
        } catch (err: unknown) {
          toast(err instanceof Error ? err.message : "Decision failed", "error");
        } finally {
          setIsMutating(false);
        }
      }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Commercial Fleet Approvals Queue
          </h1>
          <p className="text-xs text-slate-500">
            Corporate road trip packages exceeding company policy thresholds (§3.D, §4 W5)
          </p>
        </div>

        <div className="rounded-2xl bg-purple-50 px-3.5 py-1.5 border border-purple-200 text-xs font-bold text-purple-900 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-purple-700" />
          <span>Acme Tech & Corporate Fleet Roster</span>
        </div>
      </div>

      {approvals.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
          <h3 className="mt-3 text-base font-bold text-slate-900">All Approvals Cleared</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            No commercial bookings are currently pending corporate budget authorization.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {approvals.map((item) => (
            <div
              key={item.id}
              className="rounded-3xl border border-purple-200 bg-white p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="rounded-xl bg-purple-100 text-purple-800 px-2.5 py-1 text-xs font-extrabold uppercase">
                    Commercial Policy Trigger
                  </span>
                  <span className="text-xs font-mono text-slate-400">GST: {item.gst_number}</span>
                </div>

                <h3 className="text-lg font-black text-slate-900">
                  {item.company_name} — {item.destination_name}
                </h3>

                <p className="text-xs text-slate-600">
                  Booked by <strong>{item.booker_name}</strong> ({item.booker_email}) · Travel Dates:{" "}
                  <strong>{item.dates}</strong>
                </p>

                <div className="flex flex-wrap gap-3 text-xs text-slate-600 pt-1">
                  <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-bold">
                    Fleet: {item.vehicle_name}
                  </span>
                  <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-bold">
                    Headcount: {item.passenger_count} Pax
                  </span>
                  <span className="rounded-lg bg-rose-50 text-rose-800 px-2 py-0.5 font-bold border border-rose-200">
                    Exceeds Limit: ₹{item.total_amount.toLocaleString("en-IN")} &gt; ₹
                    {item.approval_limit.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                <div className="text-right sm:pr-4">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Total Amount
                  </span>
                  <span className="text-xl font-black text-slate-900 font-mono">
                    ₹{item.total_amount.toLocaleString("en-IN")}
                  </span>
                </div>

                {canApprove && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isMutating}
                      onClick={() => handleDecision(item, "rejected")}
                      className="rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-4 py-2 text-xs font-bold transition-all disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={isMutating}
                      onClick={() => handleDecision(item, "approved")}
                      className="rounded-xl bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isMutating && <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                      <span>Authorize & Confirm</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
