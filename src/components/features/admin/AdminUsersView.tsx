"use client";

import React, { useState } from "react";
import { AdminService } from "@/lib/admin/admin-service";
import { useAdmin } from "@/lib/admin/admin-context";
import { ADMIN_ROLES } from "@/lib/admin/permissions";
import type { AdminUser, AdminRole } from "@/lib/admin/types";
import { UserPlus, Key } from "lucide-react";

export function AdminUsersView() {
  const { currentAdmin, hasPermission, requestReasonModal, toast } = useAdmin();
  const [admins, setAdmins] = useState<AdminUser[]>(() => AdminService.getAdmins());
  const [isAdding, setIsAdding] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<AdminRole>("ops_manager");

  const canManage = hasPermission("manage_admins");
  const refresh = () => setAdmins(AdminService.getAdmins());

  const handleGrantRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newName.trim()) return;

    requestReasonModal(
      "Grant Admin Role",
      `Promote ${newEmail} to ${ADMIN_ROLES.find((r) => r.id === newRole)?.label || newRole}. User must authenticate with MFA.`,
      () => {
        const res = AdminService.grantAdminRole(
          currentAdmin,
          newEmail.trim(),
          newName.trim(),
          newRole
        );
        if (res.ok) {
          toast(`Granted role ${newRole} to ${newEmail}`, "success");
          setIsAdding(false);
          setNewEmail("");
          setNewName("");
          refresh();
        } else {
          toast(res.error || "Failed to grant role", "error");
        }
      }
    );
  };

  const handleDeactivate = (admin: AdminUser) => {
    requestReasonModal(
      "Deactivate Administrator",
      `Revoke all administrative access for ${admin.full_name} (${admin.email}). Sessions will be terminated immediately.`,
      (reason) => {
        const res = AdminService.deactivateAdmin(currentAdmin, admin.id, reason);
        if (res.ok) {
          toast(`Admin ${admin.full_name} has been deactivated.`, "success");
          refresh();
        } else {
          toast(res.error || "Action failed", "error");
        }
      }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-text-primary tracking-tight">
            Administrative Accounts & Governance
          </h1>
          <p className="text-xs text-text-secondary">
            Promote accounts, manage role permissions, and enforce mandatory MFA assurance (§3.G, §8.1)
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 rounded-xl bg-primary-container hover:bg-primary-container/90 px-4 py-2 text-xs font-bold text-white shadow-xs"
          >
            <UserPlus className="h-4 w-4" />
            <span>Grant Admin Role</span>
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-border-hairline bg-card-surface p-6 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-hairline text-[10px] font-extrabold uppercase tracking-wider text-text-secondary">
                <th className="py-2.5">Administrator</th>
                <th className="py-2.5">Designated Role</th>
                <th className="py-2.5">MFA Status</th>
                <th className="py-2.5">Provisioned (IST)</th>
                <th className="py-2.5">Status</th>
                <th className="py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline">
              {admins.map((a) => {
                const roleInfo = ADMIN_ROLES.find((r) => r.id === a.role);
                const isCurrent = a.id === currentAdmin.id;

                return (
                  <tr key={a.id} className="hover:bg-surface-container-low/40">
                    <td className="py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-dark text-white font-bold text-xs border border-border-hairline">
                          {a.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-text-primary flex items-center gap-1.5">
                            {a.full_name}
                            {isCurrent && (
                              <span className="rounded bg-primary-container/10 text-primary-container border border-primary-container/20 px-1.5 py-0.2 text-[9px] font-black">
                                YOU
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-text-secondary">{a.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5">
                      <span
                        className={`rounded-lg border px-2 py-0.5 text-[11px] font-bold ${
                          roleInfo?.badgeColor || "bg-surface text-text-primary border-border-hairline"
                        }`}
                      >
                        {roleInfo?.label || a.role}
                      </span>
                    </td>

                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-0.5 text-[10px]">
                        <Key className="h-3 w-3 text-emerald-700" /> AAL2 Enforced
                      </span>
                    </td>

                    <td className="py-3.5 text-text-secondary font-medium font-mono">
                      {new Date(a.created_at).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>

                    <td className="py-3.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase border ${
                          a.is_active ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"
                        }`}
                      >
                        {a.is_active ? "Active" : "Deactivated"}
                      </span>
                    </td>

                    <td className="py-3.5 text-right">
                      {canManage && a.is_active && !isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleDeactivate(a)}
                          className="rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1.5 text-xs font-bold transition-all"
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-card-surface p-6 shadow-xl border border-border-hairline">
            <div className="flex items-center justify-between pb-3 border-b border-border-hairline">
              <h2 className="text-lg font-black text-text-primary">Grant Administrative Role</h2>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-text-secondary hover:text-text-primary rounded-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGrantRole} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">Full Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full rounded-xl border border-border-hairline bg-surface p-2 text-xs font-semibold text-text-primary focus:bg-card-surface"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">Account Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="priya@tripmate.in"
                  className="w-full rounded-xl border border-border-hairline bg-surface p-2 text-xs font-semibold text-text-primary focus:bg-card-surface"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Role Assignment (§2 Matrix)
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as AdminRole)}
                  className="w-full rounded-xl border border-border-hairline bg-surface p-2 text-xs font-bold text-text-primary focus:bg-card-surface"
                >
                  {ADMIN_ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-text-secondary">
                  {ADMIN_ROLES.find((r) => r.id === newRole)?.description}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border-hairline">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="rounded-xl border border-border-hairline bg-surface px-4 py-2 text-xs font-bold text-text-primary hover:bg-card-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary-container hover:bg-primary-container/90 px-5 py-2 text-xs font-bold text-white shadow-xs"
                >
                  Grant Role & Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
