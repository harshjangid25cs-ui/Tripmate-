"use client";

import React, { useState, useEffect } from "react";
import { AdminService } from "@/lib/admin/admin-service";
import { useAdmin } from "@/lib/admin/admin-context";
import type { BookingAdmin } from "@/lib/admin/types";
import {
  adminUpdateBookingStatusAction,
  adminAssignDriverOrVehicleAction,
  adminOverrideBookingItemsAction,
  adminSendCustomerNotificationAction,
} from "@/lib/actions/admin-ops";
import {
  Search,
  Eye,
  Ban,
  MessageSquare,
  CheckCircle2,
  Hotel,
  Compass,
  Clock,
  Bell,
  Sliders,
} from "lucide-react";

export function BookingsView() {
  const { currentAdmin, hasPermission, requestReasonModal, toast, refreshOperationalData } = useAdmin();
  const [bookings, setBookings] = useState<BookingAdmin[]>(() => AdminService.getBookings());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedBooking, setSelectedBooking] = useState<BookingAdmin | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  // Driver & Vehicle Assignment dialog state
  const [isAssigningDriver, setIsAssigningDriver] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");

  // Override Items (Hotel, Stops, Adjustments) state
  const [isOverridingItems, setIsOverridingItems] = useState(false);
  const [overrideHotelId, setOverrideHotelId] = useState("");
  const [overrideStopIds, setOverrideStopIds] = useState<string[]>([]);
  const [overrideAdjustment, setOverrideAdjustment] = useState<number>(0);
  const [overrideReason, setOverrideReason] = useState("");

  // Live Notification state
  const [isSendingNotif, setIsSendingNotif] = useState(false);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifType, setNotifType] = useState<"booking" | "system" | "offer">("booking");

  // Cancel Booking dialog state
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelRefundMode, setCancelRefundMode] = useState<"policy" | "full" | "none" | "custom">("policy");
  const [customRefundAmount, setCustomRefundAmount] = useState<number>(0);
  const [cancelReason, setCancelReason] = useState("");

  // Internal Note state
  const [newNote, setNewNote] = useState("");

  const drivers = AdminService.getDrivers().filter((d) => d.is_active);
  const vehicles = AdminService.getVehicles().filter((v) => v.is_active);
  const allHotels = AdminService.getHotels();
  const allStops = AdminService.getStops();

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

  useEffect(() => {
    return AdminService.subscribe(refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleUpdateStatus = (newStatus: "confirmed" | "completed" | "cancelled") => {
    if (!selectedBooking) return;
    requestReasonModal(
      `Mark Booking as ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
      `Update booking status of ${selectedBooking.booking_ref} to ${newStatus}.`,
      async (reason) => {
        setIsMutating(true);
        try {
          AdminService.updateBookingStatus(currentAdmin, selectedBooking.id, newStatus, reason);
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedBooking.id);
          if (isUuid) {
            await adminUpdateBookingStatusAction({
              tripId: selectedBooking.id,
              newStatus,
              reason,
            });
          }
          toast(`Booking marked as ${newStatus}`, "success");
          refresh();
          await refreshOperationalData();
        } catch (err: unknown) {
          toast(err instanceof Error ? err.message : "Failed to update status", "error");
        } finally {
          setIsMutating(false);
        }
      }
    );
  };

  const handleAssignDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;

    requestReasonModal(
      "Confirm Dispatch Assignment",
      `Update verified driver and fleet vehicle assignment for booking ${selectedBooking.booking_ref}.`,
      async (reason) => {
        setIsMutating(true);
        try {
          const res = AdminService.assignDriver(
            currentAdmin,
            selectedBooking.id,
            selectedDriverId === "none" ? "" : selectedDriverId,
            reason
          );

          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedBooking.id);
          const isDriverUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedDriverId);
          const isVehicleUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedVehicleId);

          if (isUuid) {
            const serverRes = await adminAssignDriverOrVehicleAction({
              tripId: selectedBooking.id,
              driverId: selectedDriverId === "none" ? null : (isDriverUuid ? selectedDriverId : null),
              vehicleId: selectedVehicleId === "none" ? null : (isVehicleUuid ? selectedVehicleId : null),
              reason,
            });
            if (!serverRes.ok) {
              toast(serverRes.error || "Failed to sync driver assignment to server.", "error");
            }
          }

          if (res.ok) {
            toast("Driver & transport dispatch updated", "success");
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

  const handleOpenDetails = (b: BookingAdmin) => {
    setSelectedBooking(b);
    const initialHotelId = b.hotel_id || (b.hotel && "id" in b.hotel ? (b.hotel as { id: string }).id : "") || "";
    setOverrideHotelId(initialHotelId);
    setOverrideStopIds(b.stops?.map((s) => s.id) || []);
    setOverrideAdjustment(0);
    setOverrideReason("");
    setIsOverridingItems(false);
    setIsAssigningDriver(false);
  };

  const handleOverrideItems = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    if (!overrideReason.trim()) {
      toast("Mandatory: Reason required for booking item override", "error");
      return;
    }

    setIsMutating(true);
    try {
      const res = await adminOverrideBookingItemsAction({
        tripId: selectedBooking.id,
        hotelId: overrideHotelId || undefined,
        stopIds: overrideStopIds,
        customAdjustment: overrideAdjustment || 0,
        reason: overrideReason.trim(),
      });

      if (!res.ok) {
        toast(res.error || "Failed to override booking items", "error");
      } else {
        toast("Booking items updated & total recalculated via trigger", "success");
        setIsOverridingItems(false);
        refresh();
        await refreshOperationalData();
      }
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Error overriding booking items", "error");
    } finally {
      setIsMutating(false);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    if (!notifTitle.trim() || !notifMessage.trim()) {
      toast("Notification title and message are required", "error");
      return;
    }

    setIsMutating(true);
    try {
      const validNotifTypes = ["booking_confirmed", "booking_cancelled", "approval_required", "approval_decision", "payment_succeeded", "reminder"] as const;
      const typeVal = validNotifTypes.includes(notifType as (typeof validNotifTypes)[number])
        ? (notifType as (typeof validNotifTypes)[number])
        : "reminder";

      const res = await adminSendCustomerNotificationAction({
        profileId: selectedBooking.user_id || selectedBooking.customer_id || "",
        message: `${notifTitle.trim()}: ${notifMessage.trim()}`,
        type: typeVal,
        tripId: selectedBooking.id,
      });

      if (res.ok) {
        toast(`Live notification broadcasted to ${selectedBooking.customer_name}`, "success");
        setIsSendingNotif(false);
        setNotifTitle("");
        setNotifMessage("");
      } else {
        toast(res.error || "Failed to send notification", "error");
      }
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Notification error", "error");
    } finally {
      setIsMutating(false);
    }
  };

  const handleQuickUnassign = () => {
    if (!selectedBooking) return;
    requestReasonModal(
      "Unassign Driver & Vehicle",
      `Set chauffeur and vehicle to Unassigned for booking ${selectedBooking.booking_ref}.`,
      async (reason) => {
        setIsMutating(true);
        try {
          AdminService.assignDriver(currentAdmin, selectedBooking.id, "", reason);
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedBooking.id);
          if (isUuid) {
            await adminAssignDriverOrVehicleAction({
              tripId: selectedBooking.id,
              driverId: null,
              vehicleId: null,
              reason,
            });
          }
          toast("Driver & vehicle set to Unassigned", "success");
          refresh();
          await refreshOperationalData();
        } catch (err: unknown) {
          toast(err instanceof Error ? err.message : "Unassign failed", "error");
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
          <h1 className="text-xl font-bold text-text-primary tracking-tight">
            Bookings & Fleet Dispatch
          </h1>
          <p className="text-xs text-text-secondary">
            Search reservations, assign drivers, add internal notes, and process policy-backed cancellations (§3.D)
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference, email, pax..."
              className="w-64 rounded-xl border border-border-hairline bg-card-surface pl-8 pr-3 py-2 text-xs font-medium text-text-primary placeholder:text-text-secondary/60 focus:border-text-primary focus:outline-none transition-colors"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-border-hairline bg-card-surface px-3 py-2 text-xs font-semibold text-text-primary focus:border-text-primary focus:outline-none transition-colors"
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="rounded-2xl border border-border-hairline bg-card-surface p-6 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-hairline text-[11px] font-bold uppercase tracking-wider text-text-secondary">
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
            <tbody className="divide-y divide-border-hairline/60">
              {filteredBookings.map((b) => (
                <tr key={b.id} className="hover:bg-surface-container-low/40 transition-colors">
                  <td className="py-3.5">
                    <span className="font-mono font-bold text-text-primary bg-surface px-2 py-0.5 rounded-lg border border-border-hairline">
                      {b.booking_ref}
                    </span>
                    <span className="block text-[10px] text-text-secondary mt-1 uppercase font-semibold">
                      {b.kind}
                    </span>
                  </td>

                  <td className="py-3.5">
                    <p className="font-bold text-text-primary">{b.customer_name}</p>
                    <p className="text-[11px] text-text-secondary">{b.customer_email}</p>
                    <span className="text-[10px] text-text-secondary font-medium">
                      {b.traveler_count} {b.traveler_count === 1 ? "Traveller" : "Travellers"}
                    </span>
                  </td>

                  <td className="py-3.5">
                    <p className="font-bold text-text-primary">{b.destination_name}</p>
                    <p className="text-[11px] text-text-secondary truncate max-w-xs">{b.circuit_name}</p>
                  </td>

                  <td className="py-3.5 text-text-secondary font-medium">
                    {b.start_date} <span className="text-text-secondary/50">to</span> {b.end_date}
                    <span className="block text-[10px] text-text-secondary/80">({b.days} Days)</span>
                  </td>

                  <td className="py-3.5">
                    <span className="font-bold text-text-primary tabular-nums">
                      ₹{b.total_amount.toLocaleString("en-IN")}
                    </span>
                    {b.coupon_code && (
                      <span className="block text-[10px] text-emerald-700 font-bold">
                        Coupon: {b.coupon_code} (−₹{b.discount_amount})
                      </span>
                    )}
                    {b.refund_amount !== undefined && b.refund_amount > 0 && (
                      <span className="block text-[10px] text-rose-700 font-bold">
                        Refunded: ₹{b.refund_amount.toLocaleString("en-IN")}
                      </span>
                    )}
                  </td>

                  <td className="py-3.5">
                    {b.driver ? (
                      <div>
                        <span className="font-bold text-text-primary flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-700" /> {b.driver.name}
                        </span>
                        <span className="text-[10px] font-mono text-text-secondary">
                          {b.driver.license_plate}
                        </span>
                      </div>
                    ) : (
                      <span className="text-amber-700 font-bold text-[11px]">Unassigned</span>
                    )}
                  </td>

                  <td className="py-3.5">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border ${
                        b.status === "confirmed"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : b.status === "pending_approval"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : b.status === "cancelled"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-surface-container-low text-text-secondary border-border-hairline"
                      }`}
                    >
                      {b.status.replace(/_/g, " ")}
                    </span>
                  </td>

                  <td className="py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleOpenDetails(b)}
                      className="flex items-center gap-1.5 rounded-xl border border-border-hairline bg-surface hover:bg-card-surface hover:border-text-primary px-3 py-1.5 text-xs font-bold text-text-primary ml-auto transition-colors"
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

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setNotifTitle(`Update regarding booking ${selectedBooking.booking_ref}`);
                    setNotifMessage("");
                    setIsSendingNotif(true);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-border-hairline bg-surface hover:bg-surface-container px-3 py-1.5 text-xs font-bold text-text-primary transition-all"
                >
                  <Bell className="h-3.5 w-3.5 text-primary-container" />
                  <span>Notify Customer</span>
                </button>

                {selectedBooking.status !== "confirmed" && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus("confirmed")}
                    disabled={isMutating}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 text-xs font-bold transition-all disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Mark Confirmed</span>
                  </button>
                )}
                {selectedBooking.status !== "completed" && selectedBooking.status !== "cancelled" && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus("completed")}
                    disabled={isMutating}
                    className="flex items-center gap-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 text-xs font-bold transition-all disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Mark Completed</span>
                  </button>
                )}
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

                {/* Booking Inventory Items & Dynamic Override */}
                <div className="rounded-2xl border border-border-hairline p-4 bg-surface-container-low space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                        <Sliders className="h-3.5 w-3.5 text-primary-container" />
                        Booking Items & Scoped Inventory
                      </h3>
                      <p className="text-[11px] text-text-secondary">
                        Swap assigned hotel, highway stops, or apply manual price adjustments.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsOverridingItems(!isOverridingItems)}
                      className="flex items-center gap-1 rounded-xl border border-border-hairline bg-surface px-3 py-1.5 text-xs font-bold text-text-primary hover:bg-surface-container transition-colors"
                    >
                      <Sliders className="h-3.5 w-3.5" />
                      <span>{isOverridingItems ? "Close" : "Override Items"}</span>
                    </button>
                  </div>

                  {/* Current assigned summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-border-hairline bg-surface p-3">
                      <div className="flex items-center gap-2 font-bold text-text-primary mb-1">
                        <Hotel className="h-3.5 w-3.5 text-primary-container" />
                        <span>Assigned Hotel</span>
                      </div>
                      <p className="text-text-secondary font-medium truncate">
                        {selectedBooking.hotel?.name || selectedBooking.hotel_name || "No hotel selected"}
                      </p>
                      {Boolean(selectedBooking.hotel && selectedBooking.hotel.price_per_night) && (
                        <p className="text-[11px] text-text-muted tabular-nums">
                          ₹{selectedBooking.hotel?.price_per_night}/night
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl border border-border-hairline bg-surface p-3">
                      <div className="flex items-center gap-2 font-bold text-text-primary mb-1">
                        <Compass className="h-3.5 w-3.5 text-primary-container" />
                        <span>Assigned Highway Stops</span>
                      </div>
                      <p className="text-text-secondary font-medium">
                        {selectedBooking.stops && selectedBooking.stops.length > 0
                          ? selectedBooking.stops.map((s) => s.name).join(", ")
                          : "Direct route (No stops)"}
                      </p>
                    </div>
                  </div>

                  {isOverridingItems && (
                    <form onSubmit={handleOverrideItems} className="rounded-xl border border-border-hairline bg-surface p-4 space-y-3 animate-in fade-in">
                      <h4 className="text-xs font-bold text-text-primary">Operational Item Override</h4>

                      <div>
                        <label className="block text-[11px] font-bold text-text-secondary mb-1">
                          Swap Assigned Hotel
                        </label>
                        <select
                          value={overrideHotelId}
                          onChange={(e) => setOverrideHotelId(e.target.value)}
                          className="w-full rounded-xl border border-border-hairline bg-surface p-2 text-xs text-text-primary"
                        >
                          <option value="">No Hotel / Remove Hotel</option>
                          {allHotels
                            .filter((h) => !selectedBooking.destination_id || h.destination_id === selectedBooking.destination_id)
                            .map((h) => (
                              <option key={h.id} value={h.id}>
                                {h.name} (₹{h.price_per_night}/n, {h.rating}★)
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-text-secondary mb-1">
                          Select Highway Stops
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-surface-container-low rounded-xl border border-border-hairline">
                          {allStops
                            .filter((s) => !selectedBooking.destination_id || s.destination_id === selectedBooking.destination_id)
                            .map((s) => {
                              const isChecked = overrideStopIds.includes(s.id);
                              return (
                                <label key={s.id} className="flex items-center gap-2 text-xs text-text-primary cursor-pointer hover:bg-surface p-1 rounded-lg">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const next = e.target.checked
                                        ? [...overrideStopIds, s.id]
                                        : overrideStopIds.filter((id) => id !== s.id);
                                      setOverrideStopIds(next);
                                    }}
                                    className="rounded text-primary-600"
                                  />
                                  <span className="truncate">{s.name} ({s.turnaround_text || s.distance_text || "Stop"})</span>
                                </label>
                              );
                            })}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-text-secondary mb-1">
                          Custom Price Adjustment (₹ positive or negative)
                        </label>
                        <input
                          type="number"
                          value={overrideAdjustment}
                          onChange={(e) => setOverrideAdjustment(Number(e.target.value))}
                          className="w-full rounded-xl border border-border-hairline bg-surface p-2 text-xs font-mono tabular-nums text-text-primary"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-text-secondary mb-1">
                          Mandatory Audit Reason <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                          placeholder="e.g. Swapped hotel upon customer request"
                          className="w-full rounded-xl border border-border-hairline bg-surface p-2 text-xs text-text-primary"
                          required
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-border-hairline">
                        <button
                          type="button"
                          onClick={() => setIsOverridingItems(false)}
                          className="rounded-xl border border-border-hairline px-3 py-1.5 text-xs font-bold text-text-secondary hover:bg-surface-container"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isMutating}
                          className="rounded-xl bg-primary-container text-white px-4 py-1.5 text-xs font-bold hover:bg-primary-hover disabled:opacity-50"
                        >
                          Save & Recalculate Total
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Driver Assignment Block */}
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      Assigned Driver (§3.D)
                    </h3>
                    <div className="flex items-center gap-2">
                      {canAssignDriver && (
                        <button
                          type="button"
                          onClick={handleQuickUnassign}
                          disabled={isMutating}
                          className="text-[11px] font-bold text-text-muted hover:text-rose-600 transition-colors"
                        >
                          Unassign All
                        </button>
                      )}
                      {canAssignDriver && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDriverId(selectedBooking.driver_id || "none");
                            setSelectedVehicleId(selectedBooking.vehicle_id || "none");
                            setIsAssigningDriver(!isAssigningDriver);
                          }}
                          className="text-xs font-bold text-primary-600 hover:underline"
                        >
                          {selectedBooking.driver ? "Reassign" : "Assign Driver"}
                        </button>
                      )}
                    </div>
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
                    <form onSubmit={handleAssignDriver} className="mt-3 space-y-2">
                      <div className="flex flex-col sm:flex-row items-center gap-2">
                        <select
                          value={selectedDriverId}
                          onChange={(e) => setSelectedDriverId(e.target.value)}
                          className="rounded-xl border border-slate-300 p-2 text-xs flex-1 font-semibold w-full"
                        >
                          <option value="none">None (No Chauffeur / Unassigned)</option>
                          {drivers.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.license_plate}) - Rating {d.rating} ★
                            </option>
                          ))}
                        </select>
                        <select
                          value={selectedVehicleId}
                          onChange={(e) => setSelectedVehicleId(e.target.value)}
                          className="rounded-xl border border-slate-300 p-2 text-xs flex-1 font-semibold w-full"
                        >
                          <option value="none">None (No Fleet Vehicle / Unassigned)</option>
                          {vehicles.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name} ({v.type})
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          disabled={isMutating}
                          className="rounded-xl bg-primary-600 text-white px-4 py-2 text-xs font-bold hover:bg-primary-700 w-full sm:w-auto"
                        >
                          Save
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              {/* Right Col: Timeline & Notes */}
              <div className="space-y-4">
                {/* Live Status Timeline */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200">
                    <Clock className="h-4 w-4 text-slate-500" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                      Status History & Audit Timeline
                    </h3>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {AdminService.getStatusHistory(selectedBooking.id).length === 0 ? (
                      <div className="text-xs text-slate-400 italic p-1">
                        <span>Current status: </span>
                        <span className="font-bold text-slate-700 capitalize">{selectedBooking.status}</span>
                        <p className="text-[10px] text-slate-400 mt-0.5">No prior transitions logged.</p>
                      </div>
                    ) : (
                      AdminService.getStatusHistory(selectedBooking.id).map((item) => (
                        <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 capitalize">{item.new_status || item.to_status}</span>
                            <span className="text-[10px] text-slate-400 tabular-nums">
                              {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          {(item.reason || item.note) && (
                            <p className="text-[11px] text-slate-600 mt-1">{item.reason || item.note}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 flex flex-col justify-between">
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

      {/* Send Customer Notification Dialog */}
      {isSendingNotif && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary-600" />
                <span>Send Live Customer Notification</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsSendingNotif(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendNotification} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Recipient
                </label>
                <p className="text-xs font-bold text-slate-900">
                  {selectedBooking.customer_name} ({selectedBooking.customer_email})
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Notification Type
                </label>
                <select
                  value={notifType}
                  onChange={(e) => setNotifType(e.target.value as "booking" | "system" | "offer")}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 font-medium"
                >
                  <option value="booking">Booking Update</option>
                  <option value="system">System Notice</option>
                  <option value="offer">Special Offer / Voucher</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 font-medium"
                  placeholder="e.g. Chauffeur Assigned to your Jaipur Trip"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Message
                </label>
                <textarea
                  rows={3}
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 font-medium"
                  placeholder="Write your live message to the customer..."
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSendingNotif(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMutating}
                  className="rounded-xl bg-primary-600 text-white px-5 py-2 text-xs font-bold hover:bg-primary-700 disabled:opacity-50"
                >
                  Broadcast Notification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
