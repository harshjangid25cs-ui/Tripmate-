"use client";

import React, { useState } from "react";
import { AdminService } from "@/lib/admin/admin-service";
import { useAdmin } from "@/lib/admin/admin-context";
import type { StopAdmin } from "@/lib/admin/types";
import { Plus, Edit2, EyeOff, Eye } from "lucide-react";

export function StopsView() {
  const { currentAdmin, hasPermission, requestReasonModal, toast } = useAdmin();
  const [stops, setStops] = useState<StopAdmin[]>(() => AdminService.getStops());
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<StopAdmin>>({});

  const destinations = AdminService.getDestinations();
  const canWrite = hasPermission("catalog_write");
  const refresh = () => setStops(AdminService.getStops());

  const handleToggleActive = (stop: StopAdmin) => {
    if (!canWrite) {
      toast("Catalog Manager or Super Admin role required", "error");
      return;
    }
    const nextVal = !stop.is_active;
    requestReasonModal(
      nextVal ? "Activate Stop" : "Disable Stop",
      `${nextVal ? "Restore" : "Disable"} highway stop ${stop.name}.`,
      (reason) => {
        AdminService.updateStop(currentAdmin, stop.id, { is_active: nextVal }, reason);
        toast(`Stop ${stop.name} is now ${nextVal ? "active" : "disabled"}.`, "success");
        refresh();
      }
    );
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.destination_id) {
      toast("Name and destination are required", "error");
      return;
    }

    const dest = destinations.find((d) => d.id === formData.destination_id);
    const destName = dest ? dest.name : "Jaipur";

    requestReasonModal(
      formData.id ? "Update Stop" : "Add Highway Stop",
      `Save modifications to stop ${formData.name}.`,
      (reason) => {
        if (formData.id) {
          AdminService.updateStop(currentAdmin, formData.id, formData, reason);
          toast(`Updated stop ${formData.name}`, "success");
        } else {
          AdminService.createStop(
            currentAdmin,
            {
              destination_id: formData.destination_id!,
              destination_name: destName,
              name: formData.name!,
              price: Number(formData.price) || 500,
              pricing_unit: formData.pricing_unit || "per_person",
              distance_text: formData.distance_text || "",
              turnaround_text: formData.turnaround_text || "",
              amenities: formData.amenities || ["Clean Restrooms", "Artisan Chai Lounge"],
              is_active: true,
            },
            reason
          );
          toast(`Added stop ${formData.name}`, "success");
        }
        setIsEditing(false);
        refresh();
      }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Mid-Journey Highway Stops</h1>
          <p className="text-xs text-slate-500">
            Curated highway havens, royal stepwells, and food courts (§3.B)
          </p>
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={() => {
              setFormData({
                name: "",
                destination_id: destinations[0]?.id || "",
                price: 1850,
                pricing_unit: "per_person",
                distance_text: "120 km from origin",
                turnaround_text: "Direct entry ramp from highway",
                amenities: ["Gourmet Buffet", "Spotless Restrooms"],
              });
              setIsEditing(true);
            }}
            className="flex items-center gap-2 rounded-2xl bg-primary-600 hover:bg-primary-700 px-4 py-2 text-xs font-bold text-white shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Stop</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {stops.map((s) => (
          <div
            key={s.id}
            className={`rounded-3xl border bg-white p-5 shadow-xs flex flex-col justify-between ${
              s.is_active ? "border-slate-200" : "border-slate-200 opacity-75 bg-slate-50/50"
            }`}
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900">{s.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{s.destination_name} Highway Corridor</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                    s.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {s.is_active ? "Active" : "Disabled"}
                </span>
              </div>

              <div className="mt-3 space-y-1 text-xs text-slate-600">
                <p>{s.distance_text}</p>
                <p className="text-[11px] text-slate-400 italic">{s.turnaround_text}</p>
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {s.amenities.map((a, i) => (
                  <span
                    key={i}
                    className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
                  >
                    {a}
                  </span>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">
                  {s.pricing_unit.replace("_", " ")}
                </span>
                <span className="text-sm font-black text-slate-900">
                  ₹{s.price.toLocaleString("en-IN")}{" "}
                  <span className="text-[10px] text-slate-400 font-normal">
                    {s.pricing_unit === "per_person" ? "/pax" : "flat"}
                  </span>
                </span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setFormData(s);
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
                onClick={() => handleToggleActive(s)}
                disabled={!canWrite}
                className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  s.is_active
                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                } disabled:opacity-50`}
              >
                {s.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                <span>{s.is_active ? "Disable" : "Enable"}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-black text-slate-900">
                {formData.id ? `Edit Stop: ${formData.name}` : "Add Highway Stop"}
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Stop Name</label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Destination</label>
                  <select
                    value={formData.destination_id || ""}
                    onChange={(e) => setFormData({ ...formData, destination_id: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                    required
                  >
                    {destinations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pricing Unit</label>
                  <select
                    value={formData.pricing_unit || "per_person"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pricing_unit: e.target.value as "per_person" | "flat",
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold"
                  >
                    <option value="per_person">Per Person</option>
                    <option value="flat">Flat Vehicle Charge</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Price (₹)</label>
                <input
                  type="number"
                  value={formData.price || 0}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                  required
                />
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
                  Save Stop
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
