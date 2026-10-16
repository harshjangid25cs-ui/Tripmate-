"use client";

import React, { useState } from "react";
import { AdminService } from "@/lib/admin/admin-service";
import { useAdmin } from "@/lib/admin/admin-context";
import type { UserAdmin } from "@/lib/admin/types";
import { Search, KeyRound } from "lucide-react";

export function UsersView() {
  const { currentAdmin, hasPermission, requestReasonModal, toast } = useAdmin();
  const [users, setUsers] = useState<UserAdmin[]>(() => AdminService.getUsers());
  const [searchQuery, setSearchQuery] = useState("");

  const canSuspend = hasPermission("users_suspend");
  const refresh = () => setUsers(AdminService.getUsers());

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

      <div className="rounded-2xl border border-border-hairline bg-card-surface p-6 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-hairline text-[10px] font-extrabold uppercase tracking-wider text-text-secondary">
                <th className="py-2.5">User</th>
                <th className="py-2.5">Phone</th>
                <th className="py-2.5">Bookings</th>
                <th className="py-2.5">Lifetime Spend</th>
                <th className="py-2.5">Account State</th>
                <th className="py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-surface-container-low/40">
                  <td className="py-3.5">
                    <p className="font-bold text-text-primary">{u.full_name}</p>
                    <p className="text-[11px] text-text-secondary">{u.email}</p>
                  </td>

                  <td className="py-3.5 font-mono text-text-secondary">{u.phone}</td>

                  <td className="py-3.5 font-bold text-text-primary font-mono">{u.total_bookings} trips</td>

                  <td className="py-3.5 font-black text-text-primary font-mono">
                    ₹{u.total_spent.toLocaleString("en-IN")}
                  </td>

                  <td className="py-3.5">
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

                  <td className="py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
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
      </div>
    </div>
  );
}
