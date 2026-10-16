"use client";

import React, { useState, useEffect } from "react";
import { AdminService } from "@/lib/admin/admin-service";
import { useAdmin } from "@/lib/admin/admin-context";
import type { VehicleAdmin } from "@/lib/admin/types";
import { adminUpsertVehicleAction, adminDeleteVehicleAction } from "@/lib/actions/admin-ops";
import { Plus, Edit2, Users, Briefcase, EyeOff, Eye, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";

const CatalogImageUpload = dynamic(
  () => import("./CatalogImageUpload").then((m) => m.CatalogImageUpload),
  {
    loading: () => (
      <div className="h-32 rounded-xl border border-dashed border-border-hairline bg-surface-container flex items-center justify-center text-xs text-text-secondary">
        Loading image uploader...
      </div>
    ),
  }
);

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

  const handleDeleteVehicle = (veh: VehicleAdmin) => {
    if (!canWrite) {
      toast("Catalog Manager or Super Admin role required", "error");
      return;
    }
    requestReasonModal(
      "Delete Vehicle",
      `Are you sure you want to delete ${veh.name} (${veh.type})?`,
      async (reason) => {
        AdminService.deleteVehicle(currentAdmin, veh.id, reason);
        await adminDeleteVehicleAction({ vehicleId: veh.id, reason });
        toast(`Vehicle ${veh.name} deleted.`, "success");
        if (isEditing && formData.id === veh.id) {
          setIsEditing(false);
        }
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
          <h1 className="text-xl font-black text-text-primary tracking-tight">Fleet & Transport Catalog</h1>
          <p className="text-xs text-text-secondary">
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
            className="flex items-center gap-2 rounded-xl bg-primary-container hover:bg-primary-container/90 px-4 py-2 text-xs font-bold text-white shadow-xs"
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
            className={`rounded-2xl border bg-card-surface p-5 shadow-xs flex flex-col justify-between ${
              v.is_active ? "border-border-hairline" : "border-border-hairline opacity-75 bg-surface/50"
            }`}
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-black text-text-primary">{v.name}</span>
                  </div>
                  <span className="inline-block mt-0.5 rounded-md bg-surface text-text-secondary border border-border-hairline px-2 py-0.5 text-[10px] font-extrabold uppercase">
                    {v.type}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase border ${
                    v.is_active
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-surface text-text-secondary border-border-hairline"
                  }`}
                >
                  {v.is_active ? "Active" : "Disabled"}
                </span>
              </div>

              <p className="mt-2 text-xs text-text-secondary line-clamp-2">{v.subtitle}</p>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-text-secondary">
                <div className="rounded-xl bg-surface p-2.5 border border-border-hairline flex items-center gap-2">
                  <Users className="h-4 w-4 text-text-secondary/70" />
                  <div>
                    <span className="text-[10px] text-text-secondary/70 block uppercase font-bold">Capacity</span>
                    <span className="font-bold text-text-primary">{v.capacity} Seats</span>
                  </div>
                </div>
                <div className="rounded-xl bg-surface p-2.5 border border-border-hairline flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-text-secondary/70" />
                  <div>
                    <span className="text-[10px] text-text-secondary/70 block uppercase font-bold">Luggage</span>
                    <span className="font-bold text-text-primary">{v.luggage_capacity} Bags</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {v.features.map((f, i) => (
                  <span
                    key={i}
                    className="rounded-md bg-surface px-1.5 py-0.5 text-[9px] font-semibold text-text-secondary border border-border-hairline"
                  >
                    {f}
                  </span>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-border-hairline">
                <span className="text-text-secondary font-semibold">{v.driver_type}</span>
                <span className="text-sm font-black text-text-primary font-mono">
                  ₹{v.price_per_day.toLocaleString("en-IN")}{" "}
                  <span className="text-[10px] text-text-secondary font-normal font-sans">/day</span>
                </span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-border-hairline flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setFormData(v);
                  setIsEditing(true);
                }}
                disabled={!canWrite}
                className="flex items-center gap-1.5 rounded-xl border border-border-hairline bg-surface px-3 py-1.5 text-xs font-bold text-text-primary hover:bg-card-surface disabled:opacity-50"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Edit</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleActive(v)}
                  disabled={!canWrite}
                  className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
                    v.is_active
                      ? "bg-surface text-text-primary border-border-hairline hover:bg-surface-container-low"
                      : "bg-emerald-700 text-white border-emerald-800 hover:bg-emerald-800"
                  } disabled:opacity-50`}
                >
                  {v.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  <span>{v.is_active ? "Disable" : "Enable"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteVehicle(v)}
                  disabled={!canWrite}
                  className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-all disabled:opacity-50"
                  title="Delete Vehicle"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-card-surface p-6 shadow-xl border border-border-hairline">
            <div className="flex items-center justify-between pb-3 border-b border-border-hairline">
              <h2 className="text-lg font-black text-text-primary">
                {formData.id ? `Edit Vehicle: ${formData.name}` : "Add Fleet Vehicle"}
              </h2>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-text-secondary hover:text-text-primary rounded-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Vehicle Name</label>
                  <input
                    type="text"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-border-hairline bg-surface p-2.5 text-xs text-text-primary focus:bg-card-surface"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Category Type</label>
                  <select
                    value={formData.type || "car"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as "car" | "bike" | "bus",
                      })
                    }
                    className="w-full rounded-xl border border-border-hairline bg-surface p-2.5 text-xs font-bold text-text-primary focus:bg-card-surface"
                  >
                    <option value="car">Car (Sedan/SUV)</option>
                    <option value="bike">Bike / Cruiser</option>
                    <option value="bus">Luxury Bus / Coach (Commercial Fleet)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">Subtitle / Summary</label>
                <input
                  type="text"
                  value={formData.subtitle || ""}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full rounded-xl border border-border-hairline bg-surface p-2.5 text-xs text-text-primary focus:bg-card-surface"
                  placeholder="e.g. Premium SUV · Captain Seats · AC"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Seat Capacity {formData.type === "bus" ? "(Req)" : ""}
                  </label>
                  <input
                    type="number"
                    value={formData.capacity || 4}
                    onChange={(e) =>
                      setFormData({ ...formData, capacity: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-border-hairline bg-surface p-2 text-xs text-text-primary focus:bg-card-surface"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Luggage Capacity</label>
                  <input
                    type="number"
                    value={formData.luggage_capacity || 2}
                    onChange={(e) =>
                      setFormData({ ...formData, luggage_capacity: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-border-hairline bg-surface p-2 text-xs text-text-primary focus:bg-card-surface"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Rate Per Day (₹)</label>
                  <input
                    type="number"
                    value={formData.price_per_day || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, price_per_day: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-border-hairline bg-surface p-2 text-xs text-text-primary focus:bg-card-surface font-mono"
                    required
                  />
                </div>
              </div>

              <CatalogImageUpload
                value={formData.image_url || ""}
                onChange={(url) => setFormData({ ...formData, image_url: url })}
                label="Vehicle Photo"
                helperText="Uploaded to Supabase catalog-images bucket and displayed on fleet cards."
              />

              <div className="flex items-center justify-between pt-3 border-t border-border-hairline">
                {formData.id ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteVehicle(formData as VehicleAdmin)}
                    disabled={!canWrite}
                    className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Vehicle</span>
                  </button>
                ) : <div />}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="rounded-xl border border-border-hairline bg-surface px-4 py-2 text-xs font-bold text-text-primary hover:bg-card-surface"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-primary-container hover:bg-primary-container/90 px-5 py-2 text-xs font-bold text-white shadow-xs"
                  >
                    Save Vehicle
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
