"use client";

import React, { useState } from "react";
import { AdminService } from "@/lib/admin/admin-service";
import { useAdmin } from "@/lib/admin/admin-context";
import type { UserAdmin } from "@/lib/admin/types";
import { Search, KeyRound, Bell } from "lucide-react";
import { adminSendCustomerNotificationAction } from "@/lib/actions/admin-ops";

export function UsersView() {
  const { currentAdmin, hasPermission, requestReasonModal, toast } = useAdmin();
  const [users, setUsers] = useState<UserAdmin[]>(() => AdminService.getUsers());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserAdmin | null>(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifType, setNotifType] = useState<"booking" | "system" | "offer">("system");
  const [isSending, setIsSending] = useState(false);

  const canSuspend = hasPermission("users_suspend");
  const refresh = () => setUsers(AdminService.getUsers());

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !notifTitle.trim() || !notifMessage.trim()) return;

    setIsSending(true);
    try {
      const res = await adminSendCustomerNotificationAction({
        userId: selectedUser.id,
        title: notifTitle.trim(),
        message: notifMessage.trim(),
        type: notifType,
      });

      if (res.ok) {
        toast(`Live notification broadcasted to ${selectedUser.full_name}`, "success");
        setIsNotifOpen(false);
        setNotifTitle("");
        setNotifMessage("");
      } else {
        toast(res.error || "Failed to send notification", "error");
      }
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Error sending notification", "error");
    } finally {
      setIsSending(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    return !q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.phone.includes(q);
  });

  const handleToggleSuspend = (user: UserAdmin) => {
    if (!canSuspend) {
      toast("Ops Manager or Super Admin role required", "error");
      return;
    }

    const nextVal = !user.is_suspended;
    requestReasonModal(
      nextVal ? "Suspend Customer Account" : "Unsuspend Account",
      nextVal
        ? `Suspending ${user.full_name} (${user.email}) will block new bookings and show a suspension notice. Reason is required.`
        : `Restore full booking access for ${user.full_name}.`,
      (reason) => {
        const res = AdminService.setUserSuspended(currentAdmin, user.id, nextVal, reason);
        if (res.ok) {
          toast(`User ${user.full_name} is now ${nextVal ? "suspended" : "active"}.`, "success");
          refresh();
        } else {
          toast(res.error || "Action failed", "error");
        }
      }
    );
  };

  const handleSendResetEmail = (user: UserAdmin) => {
    requestReasonModal(
      "Send Password Reset Email",
      `Send secure password reset link to ${user.email}. No password is ever visible.`,
      () => {
        AdminService.sendEmail(
          currentAdmin,
          user.email,
          "custom_message",
          "Reset Your TripMate Account Password",
          `Hello ${user.full_name}, a password reset request was initiated by our support team. Please follow the instructions on our secure portal.`
        );
        toast(`Password reset email dispatched to ${user.email}`, "success");
      }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-text-primary tracking-tight">Customer Accounts & Users</h1>
          <p className="text-xs text-text-secondary">
            View customer profiles, total spend, suspension controls, and reset triggers (§3.F, §4 W8)
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, phone..."
            className="w-64 rounded-xl border border-border-hairline bg-surface pl-8 pr-3 py-2 text-xs text-text-primary focus:bg-card-surface focus:outline-hidden"
          />
        </div>
      </div>

      <div className="rounded-xl border border-[#E5E3DF] bg-[#FFFFFF] shadow-xs overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-[#E5E3DF] bg-[#FFFFFF] shrink-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#1F1F1E] uppercase tracking-wider">Customer Directory</span>
            <span className="rounded-full bg-[#1F1F1E] px-2 py-0.5 text-[11px] font-bold text-white">
              {filteredUsers.length}
            </span>
          </div>
          <span className="text-xs text-[#6E6D68]">Up to 5 visible · scroll inside table</span>
        </div>

        <div className="overflow-y-auto overflow-x-auto max-h-[360px] custom-scrollbar admin-scroll overscroll-contain">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-[#FBF9F5] border-b border-[#E5E3DF]">
              <tr className="text-[10px] font-extrabold uppercase tracking-wider text-[#6E6D68]">
                <th className="py-2.5 px-4">User</th>
                <th className="py-2.5 px-4">Phone</th>
                <th className="py-2.5 px-4">Bookings</th>
                <th className="py-2.5 px-4">Lifetime Spend</th>
                <th className="py-2.5 px-4">Account State</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E3DF]">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-surface-container-low/40">
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-text-primary">{u.full_name}</p>
                    <p className="text-[11px] text-text-secondary">{u.email}</p>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-text-secondary">{u.phone}</td>

                  <td className="py-3.5 px-4 font-bold text-text-primary font-mono">{u.total_bookings} trips</td>

                  <td className="py-3.5 px-4 font-black text-text-primary font-mono">
                    ₹{u.total_spent.toLocaleString("en-IN")}
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase border ${
                        u.is_suspended ? "bg-rose-50 text-rose-800 border-rose-200" : "bg-emerald-50 text-emerald-800 border-emerald-200"
                      }`}
                    >
                      {u.is_suspended ? "Suspended" : "Active"}
                    </span>
                    {u.suspended_reason && (
                      <span className="block text-[10px] text-rose-700 truncate max-w-xs mt-0.5">
                        {u.suspended_reason}
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUser(u);
                          setNotifTitle("TripMate Notification");
                          setNotifMessage("");
                          setIsNotifOpen(true);
                        }}
                        className="rounded-xl border border-border-hairline bg-surface px-2.5 py-1.5 text-xs font-semibold text-text-primary hover:bg-card-surface flex items-center gap-1"
                        title="Send Live In-App Notification"
                      >
                        <Bell className="h-3.5 w-3.5 text-primary-container" />
                        <span className="hidden sm:inline">Notify</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendResetEmail(u)}
                        className="rounded-xl border border-border-hairline bg-surface px-2.5 py-1.5 text-xs font-semibold text-text-primary hover:bg-card-surface flex items-center gap-1"
                        title="Send Password Reset Email"
                      >
                        <KeyRound className="h-3.5 w-3.5 text-text-secondary" />
                        <span className="hidden sm:inline">Reset</span>
                      </button>

                      {canSuspend && (
                        <button
                          type="button"
                          onClick={() => handleToggleSuspend(u)}
                          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
                            u.is_suspended
                              ? "bg-surface text-text-primary border-border-hairline hover:bg-surface-container-low"
                              : "bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200"
                          }`}
                        >
                          {u.is_suspended ? "Unsuspend" : "Suspend"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2.5 border-t border-[#E5E3DF] bg-[#FBF9F5] text-xs text-[#6E6D68] shrink-0 flex items-center justify-between">
          <span>Showing {filteredUsers.length} customer accounts (scroll inside box for more)</span>
          <span className="font-mono text-[11px] text-[#8C8A85]">Customer Directory §3.F</span>
        </div>
      </div>

      {/* Send Live Notification Modal */}
      {isNotifOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-2xl border border-border-hairline">
            <div className="flex items-center justify-between pb-3 border-b border-border-hairline">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary-container" />
                <span>Send Live Notification</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsNotifOpen(false)}
                className="text-text-muted hover:text-text-primary rounded-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendNotification} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Recipient
                </label>
                <p className="text-xs font-bold text-text-primary">
                  {selectedUser.full_name} ({selectedUser.email})
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Type
                </label>
                <select
                  value={notifType}
                  onChange={(e) => setNotifType(e.target.value as "booking" | "system" | "offer")}
                  className="w-full rounded-xl border border-border-hairline bg-surface p-2 text-xs text-text-primary"
                >
                  <option value="system">System Notice</option>
                  <option value="booking">Booking / Itinerary Update</option>
                  <option value="offer">Special Offer / Promotion</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  className="w-full rounded-xl border border-border-hairline bg-surface p-2 text-xs text-text-primary"
                  placeholder="e.g. Important update regarding your upcoming trip"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Message
                </label>
                <textarea
                  rows={3}
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  className="w-full rounded-xl border border-border-hairline bg-surface p-2 text-xs text-text-primary"
                  placeholder="Write your live message..."
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border-hairline">
                <button
                  type="button"
                  onClick={() => setIsNotifOpen(false)}
                  className="rounded-xl border border-border-hairline px-4 py-2 text-xs font-bold text-text-secondary hover:bg-surface-container"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="rounded-xl bg-primary-container text-white px-5 py-2 text-xs font-bold hover:bg-primary-hover disabled:opacity-50"
                >
                  Broadcast Live Notification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
