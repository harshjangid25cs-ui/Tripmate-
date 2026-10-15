"use client";

import React, { useState } from "react";
import { AdminService } from "@/lib/admin/admin-service";
import { useAdmin } from "@/lib/admin/admin-context";
import type { BookingAdmin } from "@/lib/admin/types";
import {
  adminUpdateBookingStatusAction,
  adminAssignDriverOrVehicleAction,
} from "@/lib/actions/admin-ops";
import {
  Search,
  Eye,
  Ban,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";

export function BookingsView() {
  const { currentAdmin, hasPermission, requestReasonModal, toast, refreshOperationalData } = useAdmin();
  const [bookings, setBookings] = useState<BookingAdmin[]>(() => AdminService.getBookings());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedBooking, setSelectedBooking] = useState<BookingAdmin | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  // Driver Assignment dialog state
  const [isAssigningDriver, setIsAssigningDriver] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState("");

  // Cancel Booking dialog state
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelRefundMode, setCancelRefundMode] = useState<"policy" | "full" | "none" | "custom">("policy");
  const [customRefundAmount, setCustomRefundAmount] = useState<number>(0);
  const [cancelReason, setCancelReason] = useState("");

  // Internal Note state
  const [newNote, setNewNote] = useState("");

  const drivers = AdminService.getDrivers().filter((d) => d.is_active);

  const canCancelPolicy = hasPermission("cancel_by_policy");
  const canCancelDiscretionary = hasPermission("cancel_full_custom_none");
  const canAssignDriver = hasPermission("assign_driver");
  const canRevokeTicket = hasPermission("ticket_revoke_regenerate");
  const canAddNote = hasPermission("internal_notes");

  const refresh = () => {
    const list = AdminService.getBookings();
    setBookings(list);
    if (selectedBooking) {
      const updated = list.find((b) => b.id === selectedBooking.id);
      if (updated) setSelectedBooking(updated);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const query = searchQuery.toLowerCase().trim();
    const matchQuery =
      !query ||
      b.booking_ref.toLowerCase().includes(query) ||
      b.customer_name.toLowerCase().includes(query) ||
      b.customer_email.toLowerCase().includes(query) ||
      b.destination_name.toLowerCase().includes(query);

    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    return matchQuery && matchStatus;
  });

  const handleExecuteCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    if (!cancelReason.trim()) {
      toast("Mandatory: Provide cancellation reason for customer & audit log", "error");
      return;
    }

    setIsMutating(true);
    try {
      const res = AdminService.cancelBooking(
        currentAdmin,
        selectedBooking.id,
        cancelRefundMode,
        cancelRefundMode === "custom" ? customRefundAmount : null,
        cancelReason.trim()
      );

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedBooking.id);
      if (isUuid) {
        const serverRes = await adminUpdateBookingStatusAction({
          tripId: selectedBooking.id,
          newStatus: "cancelled",
          reason: cancelReason.trim(),
          refundMode: cancelRefundMode,
          customRefundAmount: cancelRefundMode === "custom" ? customRefundAmount : undefined,
        });

        if (!serverRes.ok) {
          toast(serverRes.error || "Failed to cancel booking on server.", "error");
          setIsMutating(false);
          return;
        }
      }

      if (res.ok) {
        toast(
          `Booking ${selectedBooking.booking_ref} cancelled. Refund amount: ₹${(
            res.refundAmount || 0
          ).toLocaleString("en-IN")}`,
          "success"
        );
        setIsCancelOpen(false);
        setCancelReason("");
        refresh();
        await refreshOperationalData();
      } else {
        toast(res.error || "Failed to cancel booking", "error");
      }
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Error cancelling booking", "error");
    } finally {
      setIsMutating(false);
    }
  };

  const handleAssignDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || !selectedDriverId) return;

    requestReasonModal(
      "Confirm Driver Assignment",
      `Assign verified driver to booking ${selectedBooking.booking_ref}. Customer will be emailed with driver contact details.`,
      async (reason) => {
        setIsMutating(true);
        try {
          const res = AdminService.assignDriver(
            currentAdmin,
            selectedBooking.id,
            selectedDriverId,
            reason
          );

          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedBooking.id);
          const isDriverUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedDriverId);

          if (isUuid && isDriverUuid) {
            const serverRes = await adminAssignDriverOrVehicleAction({
              tripId: selectedBooking.id,
              driverId: selectedDriverId,
              reason,
            });
            if (!serverRes.ok) {
              toast(serverRes.error || "Failed to sync driver assignment to server.", "error");
            }
          }

          if (res.ok) {
            toast("Driver assigned and notification dispatched", "success");
            setIsAssigningDriver(false);
            refresh();
            await refreshOperationalData();
          } else {
            toast(res.error || "Assignment failed", "error");
          }
        } catch (err: unknown) {
          toast(err instanceof Error ? err.message : "Assignment failed", "error");
        } finally {
          setIsMutating(false);
        }
      }
    );
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || !newNote.trim()) return;

    AdminService.addBookingNote(currentAdmin, selectedBooking.id, newNote.trim());
    toast("Internal operator note saved", "success");
    setNewNote("");
    refresh();
  };

  const handleRevokeTicket = (passengerId: string, paxName: string) => {
    if (!canRevokeTicket) {
      toast("Ops Manager or Super Admin role required", "error");
      return;
    }

    requestReasonModal(
      "Revoke Boarding Pass",
      `Revoke passenger ticket for ${paxName}. Public ticket verification URL will display as REVOKED.`,
      (reason) => {
        const res = AdminService.revokeTicket(currentAdmin, passengerId, reason);
        if (res.ok) {
          toast(`Ticket for ${paxName} has been revoked.`, "success");
          refresh();
        } else {
          toast(res.error || "Failed to revoke ticket", "error");
        }
      }
    );
  };

  const handleRegenerateTicket = (passengerId: string, paxName: string) => {
    if (!canRevokeTicket) {
      toast("Ops Manager or Super Admin role required", "error");
      return;
    }

    requestReasonModal(
      "Regenerate Boarding Pass",
      `Issue new secure ticket code for ${paxName}. Invalidates prior barcode/ticket.`,
      () => {
        const res = AdminService.regenerateTicket(currentAdmin, passengerId);
        if (res.ok) {
          toast(`New boarding pass issued: ${res.newCode}`, "success");
          refresh();
        } else {
          toast(res.error || "Failed to regenerate ticket", "error");
        }
      }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Bookings & Fleet Dispatch
          </h1>
          <p className="text-xs text-slate-500">
            Search reservations, assign drivers, add internal notes, and process policy-backed cancellations (§3.D)
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference, email, pax..."
              className="w-64 rounded-xl border border-slate-300 pl-8 pr-3 py-2 text-xs focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                <th className="py-2.5">Booking Ref</th>
                <th className="py-2.5">Customer & Pax</th>
                <th className="py-2.5">Trip Circuit</th>
                <th className="py-2.5">Travel Dates</th>
                <th className="py-2.5">Price Snapshot</th>
                <th className="py-2.5">Assigned Driver</th>
                <th className="py-2.5">Status</th>
                <th className="py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/50">
                  <td className="py-3.5">
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                      {b.booking_ref}
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-1 uppercase font-semibold">
                      {b.kind}
                    </span>
                  </td>

                  <td className="py-3.5">
                    <p className="font-bold text-slate-900">{b.customer_name}</p>
                    <p className="text-[11px] text-slate-500">{b.customer_email}</p>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {b.traveler_count} {b.traveler_count === 1 ? "Traveller" : "Travellers"}
                    </span>
                  </td>

                  <td className="py-3.5">
                    <p className="font-bold text-slate-800">{b.destination_name}</p>
                    <p className="text-[11px] text-slate-500 truncate max-w-xs">{b.circuit_name}</p>
                  </td>

                  <td className="py-3.5 text-slate-600 font-medium">
                    {b.start_date} <span className="text-slate-400">to</span> {b.end_date}
                    <span className="block text-[10px] text-slate-400">({b.days} Days)</span>
                  </td>

                  <td className="py-3.5">
                    <span className="font-black text-slate-900">
                      ₹{b.total_amount.toLocaleString("en-IN")}
                    </span>
                    {b.coupon_code && (
                      <span className="block text-[10px] text-emerald-600 font-bold">
                        Coupon: {b.coupon_code} (−₹{b.discount_amount})
                      </span>
                    )}
                    {b.refund_amount !== undefined && b.refund_amount > 0 && (
                      <span className="block text-[10px] text-rose-600 font-bold">
                        Refunded: ₹{b.refund_amount.toLocaleString("en-IN")}
                      </span>
                    )}
                  </td>

                  <td className="py-3.5">
                    {b.driver ? (
                      <div>
                        <span className="font-bold text-slate-900 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> {b.driver.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {b.driver.license_plate}
                        </span>
                      </div>
                    ) : (
                      <span className="text-amber-600 font-semibold text-[11px]">Unassigned</span>
                    )}
                  </td>

                  <td className="py-3.5">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                        b.status === "confirmed"
                          ? "bg-emerald-100 text-emerald-800"
                          : b.status === "pending_approval"
                          ? "bg-purple-100 text-purple-800"
                          : b.status === "cancelled"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {b.status.replace(/_/g, " ")}
                    </span>
                  </td>

                  <td className="py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedBooking(b)}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 ml-auto"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Details</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Details Full Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900">
                    Booking {selectedBooking.booking_ref}
                  </h2>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                      selectedBooking.status === "confirmed"
                        ? "bg-emerald-100 text-emerald-800"
                        : selectedBooking.status === "cancelled"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-purple-100 text-purple-800"
                    }`}
                  >
                    {selectedBooking.status.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Customer: {selectedBooking.customer_name} ({selectedBooking.customer_email},{" "}
                  {selectedBooking.customer_phone})
                </p>
              </div>

              <div className="flex items-center gap-2">
                {selectedBooking.status !== "cancelled" && (canCancelPolicy || canCancelDiscretionary) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCancelReason("");
                      setIsCancelOpen(true);
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 text-xs font-bold transition-all"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    <span>Cancel Booking</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Items snapshot & Travellers */}
              <div className="lg:col-span-2 space-y-6">
                {/* Price Breakdown Snapshot (§7) */}
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
                    Immutable Price Snapshot (§7)
                  </h3>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal (Catalog Items):</span>
                      <span className="font-mono font-bold text-slate-900">
                        ₹{selectedBooking.subtotal_amount.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Service Fee:</span>
                      <span className="font-mono font-bold text-slate-900">
                        ₹{selectedBooking.service_fee.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>GST Tax (18%):</span>
                      <span className="font-mono font-bold text-slate-900">
                        ₹{selectedBooking.tax_amount.toLocaleString("en-IN")}
                      </span>
                    </div>
                    {selectedBooking.discount_amount > 0 && (
                      <div className="flex justify-between text-emerald-600 font-bold">
                        <span>Coupon Discount ({selectedBooking.coupon_code || "Applied"}):</span>
                        <span className="font-mono">
                          −₹{selectedBooking.discount_amount.toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
                      <span>Total Paid:</span>
                      <span className="font-mono">
                        ₹{selectedBooking.total_amount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Travellers List */}
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      Passengers & ID Verification
                    </h3>
                    <span className="text-xs font-bold text-slate-600">
                      {selectedBooking.travellers.length} Travellers
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {selectedBooking.travellers.map((pax) => (
                      <div key={pax.id} className="py-3 flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">{pax.full_name}</span>
                            {pax.seat_label && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono font-bold text-slate-700">
                                Seat {pax.seat_label}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Doc: {pax.id_doc_type || "None"} · Status:{" "}
                            <span
                              className={`font-bold ${
                                pax.id_doc_status === "approved"
                                  ? "text-emerald-600"
                                  : pax.id_doc_status === "rejected"
                                  ? "text-rose-600"
                                  : "text-amber-600"
                              }`}
                            >
                              {pax.id_doc_status}
                            </span>
                          </p>
                          {pax.ticket_code && (
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                              Ticket Code: {pax.ticket_code}{" "}
                              {pax.ticket_revoked && (
                                <span className="font-bold text-rose-600 uppercase ml-1">
                                  [REVOKED]
                                </span>
                              )}
                            </p>
                          )}
                        </div>

                        {canRevokeTicket && pax.ticket_code && (
                          <div className="flex items-center gap-2">
                            {!pax.ticket_revoked ? (
                              <button
                                type="button"
                                onClick={() => handleRevokeTicket(pax.id, pax.full_name)}
                                className="rounded-lg border border-rose-200 px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50"
                              >
                                Revoke Pass
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRegenerateTicket(pax.id, pax.full_name)}
                                className="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                              >
                                Regenerate Pass
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Driver Assignment Block */}
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      Assigned Driver (§3.D)
                    </h3>
                    {canAssignDriver && (
                      <button
                        type="button"
                        onClick={() => setIsAssigningDriver(!isAssigningDriver)}
                        className="text-xs font-bold text-primary-600 hover:underline"
                      >
                        {selectedBooking.driver ? "Reassign" : "Assign Driver"}
                      </button>
                    )}
                  </div>

                  {selectedBooking.driver ? (
                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white font-bold">
                          {selectedBooking.driver.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{selectedBooking.driver.name}</p>
                          <p className="text-[11px] font-mono text-slate-500">
                            {selectedBooking.driver.license_plate} · Rating {selectedBooking.driver.rating} ★
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-700">
                        {selectedBooking.driver.phone}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-600 font-medium">No driver assigned yet.</p>
                  )}

                  {isAssigningDriver && (
                    <form onSubmit={handleAssignDriver} className="mt-3 flex items-center gap-2">
                      <select
                        value={selectedDriverId}
                        onChange={(e) => setSelectedDriverId(e.target.value)}
                        className="rounded-xl border border-slate-300 p-2 text-xs flex-1 font-semibold"
                        required
                      >
                        <option value="">Select verified active driver...</option>
                        {drivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.license_plate}) - Rating {d.rating} ★
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-xl bg-primary-600 text-white px-3 py-2 text-xs font-bold hover:bg-primary-700"
                      >
                        Save
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* Right Col: Internal Notes (Never shown to customer §3.D) */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200">
                      <MessageSquare className="h-4 w-4 text-slate-500" />
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                        Internal Notes (§3.D)
                      </h3>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">
                      Strictly internal. Never exposed on customer mobile or web app.
                    </p>

                    <div className="mt-3 space-y-2.5 max-h-60 overflow-y-auto">
                      {selectedBooking.notes.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No notes recorded yet.</p>
                      ) : (
                        selectedBooking.notes.map((n) => (
                          <div
                            key={n.id}
                            className="rounded-xl bg-white p-2.5 border border-slate-200 text-xs"
                          >
                            <p className="text-slate-800 leading-relaxed">{n.note}</p>
                            <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                              <span className="font-bold text-slate-600">{n.author_name}</span>
                              <span>
                                {new Date(n.created_at).toLocaleDateString([], {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {canAddNote && (
                    <form onSubmit={handleAddNote} className="mt-4 pt-3 border-t border-slate-200">
                      <textarea
                        rows={2}
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Add private operator note..."
                        className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-primary-500/20"
                        required
                      />
                      <button
                        type="submit"
                        className="mt-2 w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-1.5 text-xs font-bold"
                      >
                        Save Note
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Dialog (W2 §4) */}
      {isCancelOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-rose-900 flex items-center gap-2">
                <Ban className="h-5 w-5 text-rose-600" /> Cancel Booking {selectedBooking.booking_ref}
              </h3>
              <button
                type="button"
                onClick={() => setIsCancelOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteCancel} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Refund Mode (§3.D)</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-slate-800">
                    <input
                      type="radio"
                      name="refundMode"
                      value="policy"
                      checked={cancelRefundMode === "policy"}
                      onChange={() => setCancelRefundMode("policy")}
                      className="text-primary-600"
                    />
                    <span>By Refund Rules Policy</span>
                  </label>

                  {canCancelDiscretionary && (
                    <>
                      <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-slate-800">
                        <input
                          type="radio"
                          name="refundMode"
                          value="full"
                          checked={cancelRefundMode === "full"}
                          onChange={() => setCancelRefundMode("full")}
                          className="text-primary-600"
                        />
                        <span>100% Full Refund</span>
                      </label>
                      <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-slate-800">
                        <input
                          type="radio"
                          name="refundMode"
                          value="none"
                          checked={cancelRefundMode === "none"}
                          onChange={() => setCancelRefundMode("none")}
                          className="text-primary-600"
                        />
                        <span>No Refund (₹0)</span>
                      </label>
                      <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-slate-800">
                        <input
                          type="radio"
                          name="refundMode"
                          value="custom"
                          checked={cancelRefundMode === "custom"}
                          onChange={() => setCancelRefundMode("custom")}
                          className="text-primary-600"
                        />
                        <span>Custom Amount</span>
                      </label>
                    </>
                  )}
                </div>
              </div>

              {cancelRefundMode === "custom" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Custom Refund Amount (Max: ₹{selectedBooking.total_amount.toLocaleString("en-IN")})
                  </label>
                  <input
                    type="number"
                    max={selectedBooking.total_amount}
                    min={0}
                    value={customRefundAmount}
                    onChange={(e) => setCustomRefundAmount(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold font-mono"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mandatory Cancellation Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="State the formal operational or customer rationale..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:ring-2 focus:ring-primary-500/20"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCancelOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  disabled={isMutating}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50"
                >
                  Execute Cancellation & Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
