"use client";

import React, { useState, useEffect } from "react";
import { AdminService } from "@/lib/admin/admin-service";
import { useAdmin } from "@/lib/admin/admin-context";
import type { VehicleAdmin } from "@/lib/admin/types";
import { adminUpsertVehicleAction } from "@/lib/actions/admin-ops";
import { Plus, Edit2, Users, Briefcase, EyeOff, Eye } from "lucide-react";

export function VehiclesView() {
  const { currentAdmin, hasPermission, requestReasonModal, toast, refreshOperationalData } = useAdmin();
  const [vehicles, setVehicles] = useState<VehicleAdmin[]>(() =>
    AdminService.getVehicles()
  );
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<VehicleAdmin>>({});

  const canWrite = hasPermission("catalog_write");
  const refresh = () => setVehicles(AdminService.getVehicles());

  useEffect(() => {
    return AdminService.subscribe(refresh);
  }, []);

  const handleToggleActive = (veh: VehicleAdmin) => {
    if (!canWrite) {
      toast("Catalog Manager or Super Admin role required", "error");
      return;
    }
    const nextVal = !veh.is_active;
    requestReasonModal(
      nextVal ? "Activate Vehicle" : "Disable Vehicle",
      `${nextVal ? "Restore" : "Disable"} ${veh.name} (${veh.type}) from active fleet.`,
      async (reason) => {
        AdminService.updateVehicle(currentAdmin, veh.id, { is_active: nextVal }, reason);
        await adminUpsertVehicleAction({
          id: veh.id,
          name: veh.name,
          type: veh.type,
          pricePerDay: veh.price_per_day,
          isActive: nextVal,
          reason,
        });
        toast(`Vehicle ${veh.name} is now ${nextVal ? "active" : "disabled"}.`, "success");
        refresh();
        await refreshOperationalData();
      }
    );
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.type) {
      toast("Name and vehicle type are required", "error");
      return;
    }

    if (formData.type === "bus" && (!formData.capacity || formData.capacity < 10)) {
      toast("Bus vehicle requires valid capacity (minimum 10 seats)", "error");
      return;
    }

    requestReasonModal(
      formData.id ? "Update Vehicle" : "Add Vehicle",
      `Save modifications to fleet vehicle ${formData.name}.`,
      async (reason) => {
        await adminUpsertVehicleAction({
          id: formData.id,
          name: formData.name!,
          type: formData.type!,
          subtitle: formData.subtitle || "",
          description: formData.description || "",
          capacity: Number(formData.capacity) || (formData.type === "bus" ? 45 : 4),
          luggageCapacity: Number(formData.luggage_capacity) || 2,
          features: formData.features || ["Air Conditioning", "Commercial Permit"],
          fuelPolicy: formData.fuel_policy || "Driver Provided · Fuel Included in Base",
          driverType: formData.driver_type?.toLowerCase().includes("self") ? "self_drive" : "chauffeur",
          pricePerDay: Number(formData.price_per_day) || 3000,
          imageUrl: formData.image_url || "/images/placeholder.jpg",
          isActive: formData.is_active ?? true,
          reason,
        });

        if (formData.id) {
          AdminService.updateVehicle(currentAdmin, formData.id, formData, reason);
          toast(`Updated vehicle ${formData.name}`, "success");
        } else {
          AdminService.createVehicle(
            currentAdmin,
            {
              type: formData.type!,
              name: formData.name!,
              subtitle: formData.subtitle || "",
              capacity: Number(formData.capacity) || 4,
              luggage_capacity: Number(formData.luggage_capacity) || 2,
              features: formData.features || ["Air Conditioning", "Commercial Permit"],
              fuel_policy: formData.fuel_policy || "Driver Provided · Fuel Included in Base",
              driver_type: formData.driver_type || "Professional Chauffeur",
              price_per_day: Number(formData.price_per_day) || 3000,
              image_url: formData.image_url || "/images/placeholder.jpg",
              is_active: true,
            },
            reason
          );
          toast(`Added vehicle ${formData.name}`, "success");
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
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Fleet & Transport Catalog</h1>
          <p className="text-xs text-slate-500">
            Configure cars, bikes, and commercial corporate luxury buses (§3.B)
          </p>
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={() => {
              setFormData({
                name: "",
                type: "car",
                subtitle: "Compact Sedan · AC",
                capacity: 4,
                luggage_capacity: 2,
                price_per_day: 2500,
                driver_type: "Professional Chauffeur",
                fuel_policy: "Driver Provided · Fuel Included",
                features: ["Air Conditioning", "Commercial Permit"],
              });
              setIsEditing(true);
            }}
            className="flex items-center gap-2 rounded-2xl bg-primary-600 hover:bg-primary-700 px-4 py-2 text-xs font-bold text-white shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Vehicle</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {vehicles.map((v) => (
          <div
            key={v.id}
            className={`rounded-3xl border bg-white p-5 shadow-xs flex flex-col justify-between ${
              v.is_active ? "border-slate-200" : "border-slate-200 opacity-75 bg-slate-50/50"
            }`}
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-black text-slate-900">{v.name}</span>
                  </div>
                  <span className="inline-block mt-0.5 rounded-md bg-slate-100 text-slate-700 px-2 py-0.5 text-[10px] font-extrabold uppercase">
                    {v.type}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                    v.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {v.is_active ? "Active" : "Disabled"}
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-600 line-clamp-2">{v.subtitle}</p>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div className="rounded-xl bg-slate-50 p-2 border border-slate-100 flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-400" />
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Capacity</span>
                    <span className="font-bold text-slate-900">{v.capacity} Seats</span>
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-2 border border-slate-100 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-slate-400" />
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Luggage</span>
                    <span className="font-bold text-slate-900">{v.luggage_capacity} Bags</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {v.features.map((f, i) => (
                  <span
                    key={i}
                    className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600"
                  >
                    {f}
                  </span>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
                <span className="text-slate-400 font-semibold">{v.driver_type}</span>
                <span className="text-sm font-black text-slate-900">
                  ₹{v.price_per_day.toLocaleString("en-IN")}{" "}
                  <span className="text-[10px] text-slate-400 font-normal">/day</span>
                </span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setFormData(v);
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
                onClick={() => handleToggleActive(v)}
                disabled={!canWrite}
                className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  v.is_active
                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                } disabled:opacity-50`}
              >
                {v.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                <span>{v.is_active ? "Disable" : "Enable"}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-black text-slate-900">
                {formData.id ? `Edit Vehicle: ${formData.name}` : "Add Fleet Vehicle"}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle Name</label>
                  <input
                    type="text"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category Type</label>
                  <select
                    value={formData.type || "car"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as "car" | "bike" | "bus",
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold"
                  >
                    <option value="car">Car (Sedan/SUV)</option>
                    <option value="bike">Bike / Cruiser</option>
                    <option value="bus">Luxury Bus / Coach (Commercial Fleet)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subtitle / Summary</label>
                <input
                  type="text"
                  value={formData.subtitle || ""}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                  placeholder="e.g. Premium SUV · Captain Seats · AC"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Seat Capacity {formData.type === "bus" ? "(Req)" : ""}
                  </label>
                  <input
                    type="number"
                    value={formData.capacity || 4}
                    onChange={(e) =>
                      setFormData({ ...formData, capacity: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Luggage Capacity</label>
                  <input
                    type="number"
                    value={formData.luggage_capacity || 2}
                    onChange={(e) =>
                      setFormData({ ...formData, luggage_capacity: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rate Per Day (₹)</label>
                  <input
                    type="number"
                    value={formData.price_per_day || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, price_per_day: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
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
                  Save Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
