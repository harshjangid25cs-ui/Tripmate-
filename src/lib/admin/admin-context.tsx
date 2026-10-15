"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import type { AdminRole, AdminUser, AdminCapability } from "./types";
import { hasAdminPermission, ADMIN_ROLES } from "./permissions";
import { AdminService } from "./admin-service";

interface AdminContextType {
  currentAdmin: AdminUser;
  currentRole: AdminRole;
  switchRole: (role: AdminRole) => void;
  hasPermission: (cap: AdminCapability) => boolean;
  isMfaVerified: boolean;
  verifyMfa: (code: string) => boolean;
  requestReasonModal: (
    title: string,
    description: string,
    onConfirm: (reason: string) => void | Promise<void>
  ) => void;
  toast: (message: string, type?: "success" | "error" | "info") => void;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [admins, setAdmins] = useState<AdminUser[]>(() => AdminService.getAdmins());
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser>(
    () => admins[0] ?? {
      id: "admin-1",
      email: "superadmin@tripmate.in",
      full_name: "Aaditya Singhania",
      role: "super_admin",
      is_active: true,
      mfa_enabled: true,
      created_at: new Date().toISOString(),
    }
  );
  const [currentRole, setCurrentRole] = useState<AdminRole>(currentAdmin.role);
  const [isMfaVerified, setIsMfaVerified] = useState(true);

  // Modal reason dialog state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalDesc, setModalDesc] = useState("");
  const [modalReason, setModalReason] = useState("");
  const [modalError, setModalError] = useState("");
  const [modalCallback, setModalCallback] = useState<
    ((reason: string) => void | Promise<void>) | null
  >(null);

  // Toast notification state
  const [toasts, setToasts] = useState<
    Array<{ id: string; message: string; type: "success" | "error" | "info" }>
  >([]);

  useEffect(() => {
    return AdminService.subscribe(() => {
      setAdmins(AdminService.getAdmins());
    });
  }, []);

  const switchRole = (newRole: AdminRole) => {
    setCurrentRole(newRole);
    // Find matching admin or temporary switch
    const match = admins.find((a) => a.role === newRole);
    if (match) {
      setCurrentAdmin(match);
    } else {
      setCurrentAdmin((prev) => ({ ...prev, role: newRole }));
    }
    toast(`Switched perspective to ${ADMIN_ROLES.find((r) => r.id === newRole)?.label || newRole}`, "info");
  };

  const hasPermission = (cap: AdminCapability) => {
    return hasAdminPermission(currentRole, cap);
  };

  const verifyMfa = (code: string) => {
    if (code.trim().length === 6) {
      setIsMfaVerified(true);
      return true;
    }
    return false;
  };

  const toast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const requestReasonModal = (
    title: string,
    description: string,
    onConfirm: (reason: string) => void | Promise<void>
  ) => {
    setModalTitle(title);
    setModalDesc(description);
    setModalReason("");
    setModalError("");
    setModalCallback(() => onConfirm);
    setModalOpen(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalReason.trim()) {
      setModalError("A detailed rationale is strictly mandatory for audit logging.");
      return;
    }
    try {
      if (modalCallback) {
        await modalCallback(modalReason.trim());
      }
      setModalOpen(false);
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Action failed");
    }
  };

  return (
    <AdminContext.Provider
      value={{
        currentAdmin,
        currentRole,
        switchRole,
        hasPermission,
        isMfaVerified,
        verifyMfa,
        requestReasonModal,
        toast,
      }}
    >
      {children}

      {/* Mandatory Reason Modal for Destructive/Money Actions */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">{modalTitle}</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                ✕
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-600">{modalDesc}</p>
            <form onSubmit={handleModalSubmit} className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Audit Reason / Justification <span className="text-red-500">*</span>
              </label>
              <textarea
                value={modalReason}
                onChange={(e) => {
                  setModalReason(e.target.value);
                  setModalError("");
                }}
                rows={3}
                placeholder="Enter formal justification (e.g., 'Customer called requesting cancellation due to medical emergency')..."
                className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-slate-800"
                autoFocus
              />
              {modalError && (
                <p className="mt-1 text-xs text-red-600 font-medium">{modalError}</p>
              )}
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary-600 hover:bg-primary-700 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all"
                >
                  Confirm & Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast Alerts */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between rounded-xl px-4 py-3 shadow-lg border text-sm font-medium transition-all ${
              t.type === "error"
                ? "bg-red-50 text-red-900 border-red-200"
                : t.type === "info"
                ? "bg-blue-50 text-blue-900 border-blue-200"
                : "bg-emerald-50 text-emerald-900 border-emerald-200"
            }`}
          >
            <span>{t.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="ml-3 text-xs opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return ctx;
}
