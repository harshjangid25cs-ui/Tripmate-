"use client";

import React, { useState } from "react";
import { AdminService } from "@/lib/admin/admin-service";
import { useAdmin } from "@/lib/admin/admin-context";
import type { CommercialApprovalItem } from "@/lib/admin/types";
import { adminResolveApprovalAction } from "@/lib/actions/admin-ops";
import { Building2, CheckCircle2, Bus, Users } from "lucide-react";
import { generateBusSeatGrid } from "@/lib/data/commercial-types";

export function ApprovalsView() {
  const { currentAdmin, hasPermission, requestReasonModal, toast, refreshOperationalData } = useAdmin();
  const [approvals, setApprovals] = useState<CommercialApprovalItem[]>(() =>
    AdminService.getCommercialApprovals()
  );
  const [isMutating, setIsMutating] = useState(false);
  const [inspectingItem, setInspectingItem] = useState<CommercialApprovalItem | null>(null);

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
          <h1 className="text-xl font-bold text-text-primary tracking-tight">
            Commercial Fleet Approvals Queue
          </h1>
          <p className="text-xs text-text-secondary">
            Corporate road trip packages exceeding company policy thresholds (§3.D, §4 W5)
          </p>
        </div>

        <div className="rounded-xl bg-purple-50 px-3.5 py-1.5 border border-purple-200 text-xs font-bold text-purple-900 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-purple-700" />
          <span>Acme Tech & Corporate Fleet Roster</span>
        </div>
      </div>

      {approvals.length === 0 ? (
        <div className="rounded-2xl border border-border-hairline bg-card-surface p-12 text-center shadow-xs">
          <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
          <h3 className="mt-3 text-base font-bold text-text-primary">All Approvals Cleared</h3>
          <p className="mt-1 text-xs text-text-secondary max-w-sm mx-auto">
            No commercial bookings are currently pending corporate budget authorization.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {approvals.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-border-hairline bg-card-surface p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="rounded-full bg-purple-50 text-purple-800 border border-purple-200 px-2.5 py-0.5 text-[11px] font-bold uppercase">
                    Commercial Policy Trigger
                  </span>
                  <span className="text-xs font-mono text-text-secondary">GST: {item.gst_number}</span>
                </div>

                <h3 className="text-lg font-bold text-text-primary tracking-tight">
                  {item.company_name} — {item.destination_name}
                </h3>

                <p className="text-xs text-text-secondary">
                  Booked by <strong className="text-text-primary">{item.booker_name}</strong> ({item.booker_email}) · Travel Dates:{" "}
                  <strong className="text-text-primary">{item.dates}</strong>
                </p>

                <div className="flex flex-wrap gap-2.5 text-xs text-text-secondary pt-1">
                  <span className="rounded-lg bg-surface border border-border-hairline px-2.5 py-1 font-semibold text-text-primary">
                    Fleet: {item.vehicle_name}
                  </span>
                  <span className="rounded-lg bg-surface border border-border-hairline px-2.5 py-1 font-semibold text-text-primary">
                    Headcount: {item.passenger_count} Pax
                  </span>
                  <span className="rounded-lg bg-rose-50 text-rose-800 px-2.5 py-1 font-bold border border-rose-200">
                    Exceeds Limit: ₹{item.total_amount.toLocaleString("en-IN")} &gt; ₹
                    {item.approval_limit.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
                <div className="text-right sm:pr-4">
                  <span className="text-[10px] text-text-secondary uppercase font-bold block">
                    Total Amount
                  </span>
                  <span className="text-xl font-bold text-text-primary font-mono tabular-nums">
                    ₹{item.total_amount.toLocaleString("en-IN")}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setInspectingItem(item)}
                  className="flex items-center gap-1.5 rounded-xl border border-border-hairline bg-surface hover:bg-card-surface px-3 py-2 text-xs font-bold text-text-primary transition-colors"
                >
                  <Bus className="h-3.5 w-3.5 text-primary-container" />
                  <span>Inspect Manifest</span>
                </button>

                {canApprove && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isMutating}
                      onClick={() => handleDecision(item, "rejected")}
                      className="rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-4 py-2 text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={isMutating}
                      onClick={() => handleDecision(item, "approved")}
                      className="rounded-xl bg-primary-container hover:bg-primary-hover text-white px-5 py-2 text-xs font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
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

      {/* 2x2 Bus Seat Manifest Inspector Modal */}
      {inspectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card-surface p-6 shadow-xl border border-border-hairline">
            <div className="flex items-center justify-between pb-3 border-b border-border-hairline">
              <div>
                <h2 className="text-lg font-black text-text-primary flex items-center gap-2">
                  <Bus className="h-5 w-5 text-primary-container" />
                  <span>2x2 Bus Seating Manifest: {inspectingItem.company_name}</span>
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Fleet: {inspectingItem.vehicle_name} · {inspectingItem.passenger_count} Passenger Seats Assigned
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingItem(null)}
                className="text-text-secondary hover:text-text-primary rounded-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* Content: Bus Layout & Roster */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: 2x2 Bus Layout Visual */}
              <div className="rounded-xl border border-border-hairline bg-surface p-4">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-border-hairline text-xs font-bold text-text-secondary">
                  <span>Front of Bus / Driver</span>
                  <span className="text-[10px] uppercase text-text-muted">2x2 Luxury Configuration</span>
                </div>

                {/* 2x2 rows */}
                <div className="space-y-2">
                  {(() => {
                    const booking = AdminService.getBookings().find((b) => b.id === inspectingItem.trip_id);
                    const paxList = booking?.travellers || [];
                    const assignedSeatLabels = paxList.map((p) => p.seat_label).filter(Boolean) as string[];
                    const grid = generateBusSeatGrid(32, assignedSeatLabels, []);

                    return grid.map((row) => (
                      <div key={row.rowNumber} className="flex items-center justify-between gap-3 text-xs font-mono">
                        {/* Left seats A, B */}
                        <div className="flex gap-1.5 flex-1 justify-end">
                          {row.leftSeats.map((seat) => {
                            const pax = paxList.find((p) => p.seat_label === seat.label);
                            const isOccupied = Boolean(pax);
                            return (
                              <div
                                key={seat.label}
                                className={`h-8 w-10 rounded-lg flex flex-col items-center justify-center text-[10px] font-bold border transition-all ${
                                  isOccupied
                                    ? "bg-purple-100 text-purple-900 border-purple-300 shadow-2xs"
                                    : "bg-surface-container text-text-secondary border-border-hairline"
                                }`}
                                title={pax ? `${pax.full_name} (${seat.label})` : `Seat ${seat.label}: Available`}
                              >
                                <span>{seat.label}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Aisle */}
                        <div className="w-5 text-center text-[10px] text-text-muted">||</div>

                        {/* Right seats C, D */}
                        <div className="flex gap-1.5 flex-1 justify-start">
                          {row.rightSeats.map((seat) => {
                            const pax = paxList.find((p) => p.seat_label === seat.label);
                            const isOccupied = Boolean(pax);
                            return (
                              <div
                                key={seat.label}
                                className={`h-8 w-10 rounded-lg flex flex-col items-center justify-center text-[10px] font-bold border transition-all ${
                                  isOccupied
                                    ? "bg-purple-100 text-purple-900 border-purple-300 shadow-2xs"
                                    : "bg-surface-container text-text-secondary border-border-hairline"
                                }`}
                                title={pax ? `${pax.full_name} (${seat.label})` : `Seat ${seat.label}: Available`}
                              >
                                <span>{seat.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Right Column: Passenger Manifest Table */}
              <div className="rounded-xl border border-border-hairline bg-surface p-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-primary-container" />
                    <span>Passenger Manifest</span>
                  </h4>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1 text-xs">
                    {(() => {
                      const booking = AdminService.getBookings().find((b) => b.id === inspectingItem.trip_id);
                      const paxList = booking?.travellers || [];
                      if (paxList.length === 0) {
                        return <p className="text-text-muted italic">No passengers checked into this manifest yet.</p>;
                      }
                      return paxList.map((pax) => (
                        <div key={pax.id} className="rounded-lg border border-border-hairline bg-card-surface p-2 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-text-primary">{pax.full_name}</span>
                            <span className="text-[10px] text-text-secondary ml-1.5">
                              {pax.id_doc_status ? `ID: ${pax.id_doc_status}` : ""}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-[11px] rounded bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5">
                            Seat {pax.seat_label || "Unassigned"}
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                <div className="pt-3 border-t border-border-hairline flex justify-end">
                  <button
                    type="button"
                    onClick={() => setInspectingItem(null)}
                    className="rounded-xl border border-border-hairline px-4 py-1.5 text-xs font-bold text-text-secondary hover:bg-surface-container"
                  >
                    Close Manifest
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
