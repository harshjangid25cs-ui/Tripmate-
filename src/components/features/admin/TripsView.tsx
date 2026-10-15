"use client";

import React, { useState } from "react";
import { AdminService } from "@/lib/admin/admin-service";
import { useAdmin } from "@/lib/admin/admin-context";
import type { CircuitAdmin } from "@/lib/admin/types";
import {
  Plus,
  Edit2,
  Hotel,
  Car,
  Compass,
  EyeOff,
  Eye,
} from "lucide-react";

export function TripsView() {
  const { currentAdmin, hasPermission, requestReasonModal, toast } = useAdmin();
  const [circuits, setCircuits] = useState<CircuitAdmin[]>(() =>
    AdminService.getCircuits()
  );
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<CircuitAdmin>>({});

  const destinations = AdminService.getDestinations();
  const allHotels = AdminService.getHotels();
  const allVehicles = AdminService.getVehicles();

  const canWrite = hasPermission("catalog_write");

  const refresh = () => {
    setCircuits(AdminService.getCircuits());
  };

  const handleToggleActive = (circuit: CircuitAdmin) => {
    if (!canWrite) {
      toast("Restricted: Catalog Manager or Super Admin role required", "error");
      return;
    }
    const nextVal = !circuit.is_active;
    requestReasonModal(
      nextVal ? "Activate Circuit" : "Hide Circuit",
      `${nextVal ? "Publish" : "Deactivate"} circuit ${circuit.title} from customer catalog.`,
      (reason) => {
        AdminService.updateCircuit(
          currentAdmin,
          circuit.id,
          { is_active: nextVal },
          reason
        );
        toast(
          `Circuit ${circuit.title} is now ${nextVal ? "visible" : "hidden"}.`,
          "success"
        );
        refresh();
      }
    );
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.destination_id) {
      toast("Title and destination are required", "error");
      return;
    }

    const dest = destinations.find((d) => d.id === formData.destination_id);
    const destName = dest ? dest.name : "Custom";

    requestReasonModal(
      formData.id ? "Update Circuit" : "Create Circuit",
      `Save modifications to circuit '${formData.title}'.`,
      (reason) => {
        if (formData.id) {
          AdminService.updateCircuit(
            currentAdmin,
            formData.id,
            formData,
            reason
          );
          toast(`Updated circuit ${formData.title}`, "success");
        } else {
          AdminService.createCircuit(
            currentAdmin,
            {
              destination_id: formData.destination_id!,
              destination_name: destName,
              title: formData.title!,
              days: Number(formData.days) || 3,
              nights: Math.max(1, (Number(formData.days) || 3) - 1),
              base_price_per_person: Number(formData.base_price_per_person) || 5000,
              rating: Number(formData.rating) || 4.9,
              badge: formData.badge || null,
              categories: formData.categories || ["heritage"],
              summary: formData.summary || "",
              description: formData.description || "",
              image_url: formData.image_url || "/images/placeholder.jpg",
              is_featured: Boolean(formData.is_featured),
              is_active: true,
              allow_car: formData.allow_car ?? null,
              allow_bike: formData.allow_bike ?? null,
              vehicle_required: formData.vehicle_required ?? null,
              hotel_ids: formData.hotel_ids || [],
              vehicle_ids: formData.vehicle_ids || [],
              stop_ids: formData.stop_ids || [],
            },
            reason
          );
          toast(`Created circuit ${formData.title}`, "success");
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
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Circuits & Trips Catalog
          </h1>
          <p className="text-xs text-slate-500">
            Configure circuit offerings, days/nights, base prices, and per-trip availability bindings (§3.B)
          </p>
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={() => {
              setFormData({
                title: "",
                destination_id: destinations[0]?.id || "",
                days: 3,
                base_price_per_person: 8499,
                badge: "Best Seller",
                summary: "",
                description: "",
                hotel_ids: [],
                vehicle_ids: [],
                stop_ids: [],
              });
              setIsEditing(true);
            }}
            className="flex items-center gap-2 rounded-2xl bg-primary-600 hover:bg-primary-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Create Circuit</span>
          </button>
        )}
      </div>

      {/* Circuits List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {circuits.map((circ) => {
          return (
            <div
              key={circ.id}
              className={`rounded-3xl border bg-white p-5 shadow-xs flex flex-col justify-between transition-all ${
                circ.is_active ? "border-slate-200" : "border-slate-200 bg-slate-50/50 opacity-80"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-black text-slate-900">{circ.title}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">
                      {circ.destination_name} · {circ.days}D / {circ.nights}N
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                      circ.is_active
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {circ.is_active ? "Active" : "Hidden"}
                  </span>
                </div>

                {circ.badge && (
                  <span className="inline-block mt-2 rounded-md bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 text-[10px] font-bold">
                    ★ {circ.badge}
                  </span>
                )}

                <p className="mt-2 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {circ.summary || circ.description}
                </p>

                {/* Per-trip availability badges (§3.B) */}
                <div className="mt-4 rounded-2xl bg-slate-50 p-3 border border-slate-100 space-y-2 text-[11px]">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1">
                      <Hotel className="h-3 w-3 text-slate-400" /> Hotels Offered:
                    </span>
                    <span className="font-bold text-slate-800">
                      {circ.hotel_ids.length > 0
                        ? `${circ.hotel_ids.length} Specific`
                        : "All Destination Hotels"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1">
                      <Car className="h-3 w-3 text-slate-400" /> Fleet Offered:
                    </span>
                    <span className="font-bold text-slate-800">
                      {circ.vehicle_ids.length > 0
                        ? `${circ.vehicle_ids.length} Vehicles`
                        : "All Cars & Bikes"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1">
                      <Compass className="h-3 w-3 text-slate-400" /> Highway Stops:
                    </span>
                    <span className="font-bold text-slate-800">
                      {circ.stop_ids.length > 0
                        ? `${circ.stop_ids.length} Stops`
                        : "Destination Stops"}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Base Price:</span>
                  <span className="text-sm font-black text-slate-900">
                    ₹{circ.base_price_per_person.toLocaleString("en-IN")}{" "}
                    <span className="text-[10px] text-slate-400 font-normal">/person</span>
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setFormData(circ);
                    setIsEditing(true);
                  }}
                  disabled={!canWrite}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Configure</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleActive(circ)}
                  disabled={!canWrite}
                  className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    circ.is_active
                      ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                  } disabled:opacity-50`}
                >
                  {circ.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  <span>{circ.is_active ? "Hide" : "Activate"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit / Create Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-black text-slate-900">
                {formData.id ? `Configure Circuit: ${formData.title}` : "New Circuit"}
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Circuit Title</label>
                <input
                  type="text"
                  value={formData.title || ""}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:ring-2 focus:ring-primary-500/20"
                  placeholder="e.g. Jaipur Heritage & Forts Circuit"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        {d.name} ({d.region})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Days Duration (Nights = Days − 1)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="14"
                    value={formData.days || 3}
                    onChange={(e) => {
                      const d = Number(e.target.value);
                      setFormData({ ...formData, days: d, nights: Math.max(1, d - 1) });
                    }}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Base Price Per Person (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.base_price_per_person || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, base_price_per_person: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Badge</label>
                  <input
                    type="text"
                    value={formData.badge || ""}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                    placeholder="e.g. Best Seller, Trending"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Summary</label>
                <input
                  type="text"
                  value={formData.summary || ""}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                  placeholder="One sentence overview..."
                />
              </div>

              {/* Per-trip availability selectors (§3.B) */}
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Per-Trip Availability Matrix (§3.B)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Select specific items offered for this circuit. If empty, it falls back to all active items for the destination.
                </p>

                {/* Hotels checkbox list */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Hotels Offered:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-white rounded-xl border border-slate-200">
                    {allHotels.map((h) => {
                      const isChecked = (formData.hotel_ids || []).includes(h.id);
                      return (
                        <label key={h.id} className="flex items-center gap-2 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const current = formData.hotel_ids || [];
                              const next = e.target.checked
                                ? [...current, h.id]
                                : current.filter((id) => id !== h.id);
                              setFormData({ ...formData, hotel_ids: next });
                            }}
                            className="rounded text-primary-600"
                          />
                          <span className="truncate">{h.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Vehicles checkbox list */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Fleet Vehicles Offered:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-white rounded-xl border border-slate-200">
                    {allVehicles.map((v) => {
                      const isChecked = (formData.vehicle_ids || []).includes(v.id);
                      return (
                        <label key={v.id} className="flex items-center gap-2 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const current = formData.vehicle_ids || [];
                              const next = e.target.checked
                                ? [...current, v.id]
                                : current.filter((id) => id !== v.id);
                              setFormData({ ...formData, vehicle_ids: next });
                            }}
                            className="rounded text-primary-600"
                          />
                          <span className="truncate">{v.name} ({v.type})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary-600 hover:bg-primary-700 px-5 py-2 text-xs font-bold text-white shadow-sm"
                >
                  Save Circuit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
