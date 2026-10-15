"use client";

import React, { useState, useEffect } from "react";
import { AdminService } from "@/lib/admin/admin-service";
import { useAdmin } from "@/lib/admin/admin-context";
import type { DriverAdmin } from "@/lib/admin/types";
import { adminUpsertDriverAction } from "@/lib/actions/admin-ops";
import { Plus, Edit2, Star, EyeOff, Eye, Lock } from "lucide-react";

export function DriversView() {
  const { currentAdmin, currentRole, hasPermission, requestReasonModal, toast, refreshOperationalData } = useAdmin();
  const [drivers, setDrivers] = useState<DriverAdmin[]>(() => AdminService.getDrivers());
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<DriverAdmin>>({});

  const canWrite = hasPermission("catalog_write");
  const isOpsOrSuper = currentRole === "ops_manager" || currentRole === "super_admin";

  const refresh = () => setDrivers(AdminService.getDrivers());

  useEffect(() => {
    return AdminService.subscribe(refresh);
  }, []);

  const maskPhone = (phone: string) => {
    if (isOpsOrSuper) return phone;
    // Sensitive data protection per §8.4
    return phone.replace(/^(\+91\s?\d{2})\d{5}(\d{3})$/, "$1*****$2");
  };

  const handleToggleActive = (drv: DriverAdmin) => {
    if (!canWrite) {
      toast("Catalog Manager or Super Admin role required", "error");
      return;
    }
    const nextVal = !drv.is_active;
    requestReasonModal(
      nextVal ? "Activate Driver" : "Deactivate Driver",
      `${nextVal ? "Re-enable" : "Deactivate"} driver ${drv.name} for fleet assignment.`,
      async (reason) => {
        AdminService.updateDriver(currentAdmin, drv.id, { is_active: nextVal }, reason);
        await adminUpsertDriverAction({
          id: drv.id,
          name: drv.name,
          phone: drv.phone,
          licensePlate: drv.license_plate,
          rating: drv.rating,
          isActive: nextVal,
          reason,
        });
        toast(`Driver ${drv.name} is now ${nextVal ? "active" : "deactivated"}.`, "success");
        refresh();
        await refreshOperationalData();
      }
    );
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.license_plate) {
      toast("All driver details are required", "error");
      return;
    }

    requestReasonModal(
      formData.id ? "Update Driver" : "Register Driver",
      `Save modifications to driver profile ${formData.name}.`,
      async (reason) => {
        await adminUpsertDriverAction({
          id: formData.id,
          name: formData.name!,
          phone: formData.phone!,
          licensePlate: formData.license_plate!.toUpperCase(),
          rating: Number(formData.rating) || 4.9,
          isActive: formData.is_active ?? true,
          reason,
        });

        if (formData.id) {
          AdminService.updateDriver(currentAdmin, formData.id, formData, reason);
          toast(`Updated driver ${formData.name}`, "success");
        } else {
          AdminService.createDriver(
            currentAdmin,
            {
              name: formData.name!,
              phone: formData.phone!,
              license_plate: formData.license_plate!.toUpperCase(),
              rating: Number(formData.rating) || 4.9,
              is_active: true,
            },
            reason
          );
          toast(`Registered driver ${formData.name}`, "success");
        }
        setIsEditing(false);
        refresh();
        await refreshOperationalData();
      }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Verified Drivers Roster</h1>
          <p className="text-xs text-slate-500">
            Professional chauffeurs and commercial coach operators (§3.B, §8.4 phone protection)
          </p>
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={() => {
              setFormData({
                name: "",
                phone: "+91 ",
                license_plate: "DL 1Y ",
                rating: 4.95,
              });
              setIsEditing(true);
            }}
            className="flex items-center gap-2 rounded-2xl bg-primary-600 hover:bg-primary-700 px-4 py-2 text-xs font-bold text-white shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Driver</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {drivers.map((d) => (
          <div
            key={d.id}
            className={`rounded-3xl border bg-white p-5 shadow-xs flex flex-col justify-between ${
              d.is_active ? "border-slate-200" : "border-slate-200 opacity-75 bg-slate-50/50"
            }`}
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white font-bold text-sm">
                    {d.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">{d.name}</h3>
                    <p className="text-xs font-mono font-bold text-slate-500 mt-0.5">
                      {d.license_plate}
                    </p>
                  </div>
                </div>

                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                    d.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {d.is_active ? "Active" : "Deactivated"}
                </span>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 p-3 border border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                    Phone Contact:
                  </span>
                  <span className="font-mono font-bold text-slate-800 flex items-center gap-1">
                    {!isOpsOrSuper && <Lock className="h-3 w-3 text-slate-400" />}
                    {maskPhone(d.phone)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-[11px] font-medium text-slate-400">Driver Rating:</span>
                  <span className="font-bold text-amber-600 flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" /> {d.rating} / 5.0
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setFormData(d);
                  setIsEditing(true);
                }}
                disabled={!canWrite}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Edit</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleActive(d)}
                disabled={!canWrite}
                className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  d.is_active
                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                } disabled:opacity-50`}
              >
                {d.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                <span>{d.is_active ? "Deactivate" : "Activate"}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-black text-slate-900">
                {formData.id ? `Edit Driver: ${formData.name}` : "Add Driver"}
              </h2>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number (Personal Data)</label>
                <input
                  type="text"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-mono"
                  placeholder="+91 98765 43210"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle Plate</label>
                  <input
                    type="text"
                    value={formData.license_plate || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, license_plate: e.target.value.toUpperCase() })
                    }
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-mono uppercase"
                    placeholder="DL 1Y AA 4088"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rating</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max="5"
                    value={formData.rating || 4.9}
                    onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary-600 hover:bg-primary-700 px-5 py-2 text-xs font-bold text-white shadow-sm"
                >
                  Save Driver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
