"use client";

import React, { useState } from "react";
import { AdminService } from "@/lib/admin/admin-service";
import { useAdmin } from "@/lib/admin/admin-context";
import type { AppSettings } from "@/lib/admin/types";
import { ShieldCheck } from "lucide-react";

export function SettingsView() {
  const { currentAdmin, hasPermission, requestReasonModal, toast } = useAdmin();
  const [settings, setSettings] = useState<AppSettings>(() => AdminService.getSettings());

  const canWrite = hasPermission("app_settings");
  const refresh = () => setSettings(AdminService.getSettings());

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) {
      toast("Restricted: Super Admin role required to adjust global settings", "error");
      return;
    }

    requestReasonModal(
      "Update System Feature Flags",
      "Adjust critical operational flags including booking gateway status and maintenance broadcast.",
      () => {
        AdminService.updateSettings(currentAdmin, settings);
        toast("Application flags successfully updated and synchronized", "success");
        refresh();
      }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-text-primary tracking-tight">
            Application Settings & Global Flags
          </h1>
          <p className="text-xs text-text-secondary">
            Emergency maintenance mode, ID retention schedules, and customer contacts (§3.F, §11.1)
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl bg-purple-50 px-3.5 py-1.5 border border-purple-200 text-xs font-bold text-purple-900">
          <ShieldCheck className="h-4 w-4 text-purple-700" />
          <span>Super Admin Access Only</span>
        </div>
      </div>

      <div className="rounded-2xl border border-border-hairline bg-card-surface p-6 shadow-xs max-w-3xl">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Toggles */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-text-secondary">
              Gateway & Feature Toggles
            </h3>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface border border-border-hairline">
              <div>
                <p className="text-xs font-bold text-text-primary">Standard Bookings Enabled</p>
                <p className="text-[11px] text-text-secondary">
                  When toggled off, customers see a notice and cannot initiate or checkout bookings.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.booking_enabled}
                onChange={(e) => setSettings({ ...settings, booking_enabled: e.target.checked })}
                disabled={!canWrite}
                className="h-5 w-5 rounded accent-primary-container focus:ring-primary-container"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface border border-border-hairline">
              <div>
                <p className="text-xs font-bold text-text-primary">Commercial Fleet Enabled</p>
                <p className="text-[11px] text-text-secondary">
                  Allow corporate clients to book bus fleet and multi-day packages.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.commercial_enabled}
                onChange={(e) => setSettings({ ...settings, commercial_enabled: e.target.checked })}
                disabled={!canWrite}
                className="h-5 w-5 rounded accent-primary-container focus:ring-primary-container"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface border border-border-hairline">
              <div>
                <p className="text-xs font-bold text-text-primary">Mandatory Government ID Verification</p>
                <p className="text-[11px] text-text-secondary">
                  Require passenger document upload before boarding pass can be generated.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.require_id_verification}
                onChange={(e) =>
                  setSettings({ ...settings, require_id_verification: e.target.checked })
                }
                disabled={!canWrite}
                className="h-5 w-5 rounded accent-primary-container focus:ring-primary-container"
              />
            </div>
          </div>

          {/* Maintenance Broadcast Banner */}
          <div className="space-y-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-text-secondary">
              Maintenance Broadcast Message
            </h3>
            <textarea
              rows={2}
              value={settings.maintenance_message || ""}
              onChange={(e) =>
                setSettings({ ...settings, maintenance_message: e.target.value || null })
              }
              disabled={!canWrite}
              placeholder="e.g. Scheduled gateway upgrade from 02:00 to 04:00 IST. Existing reservations remain active."
              className="w-full rounded-xl border border-border-hairline bg-surface p-3 text-xs text-text-primary focus:bg-card-surface disabled:opacity-60"
            />
            <p className="text-[11px] text-text-secondary">
              Leave blank if operating under normal scheduled conditions. If set, an announcement banner appears in customer header.
            </p>
          </div>

          {/* Data Retention & Privacy (§8.4) */}
          <div className="space-y-4 pt-3 border-t border-border-hairline">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-text-secondary">
              Data Retention & Contacts (§8.4)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  ID Retention Period (Days)
                </label>
                <input
                  type="number"
                  value={settings.id_retention_days}
                  onChange={(e) =>
                    setSettings({ ...settings, id_retention_days: Number(e.target.value) })
                  }
                  disabled={!canWrite}
                  className="w-full rounded-xl border border-border-hairline bg-surface p-2 text-xs font-bold font-mono text-text-primary focus:bg-card-surface"
                />
                <span className="text-[10px] text-text-secondary block mt-0.5">Default 90 days after trip</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">Support Email</label>
                <input
                  type="email"
                  value={settings.support_email}
                  onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                  disabled={!canWrite}
                  className="w-full rounded-xl border border-border-hairline bg-surface p-2 text-xs font-medium text-text-primary focus:bg-card-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">Support Phone</label>
                <input
                  type="text"
                  value={settings.support_phone}
                  onChange={(e) => setSettings({ ...settings, support_phone: e.target.value })}
                  disabled={!canWrite}
                  className="w-full rounded-xl border border-border-hairline bg-surface p-2 text-xs font-mono font-medium text-text-primary focus:bg-card-surface"
                />
              </div>
            </div>
          </div>

          {canWrite && (
            <div className="pt-3 border-t border-border-hairline flex justify-end">
              <button
                type="submit"
                className="rounded-xl bg-primary-container hover:bg-primary-container/90 px-6 py-2.5 text-xs font-bold text-white shadow-xs transition-all"
              >
                Save & Synchronize Flags
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
