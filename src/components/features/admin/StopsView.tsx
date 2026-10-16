"use client";

import React, { useState, useEffect } from "react";
import { AdminService } from "@/lib/admin/admin-service";
import { useAdmin } from "@/lib/admin/admin-context";
import type { StopAdmin } from "@/lib/admin/types";
import { adminUpsertStopAction, adminDeleteStopAction } from "@/lib/actions/admin-ops";
import { Plus, Edit2, EyeOff, Eye, Trash2 } from "lucide-react";
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

export function StopsView() {
  const { currentAdmin, hasPermission, requestReasonModal, toast, refreshOperationalData } = useAdmin();
  const [stops, setStops] = useState<StopAdmin[]>(() => AdminService.getStops());
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<StopAdmin>>({});

  const destinations = AdminService.getDestinations();
  const canWrite = hasPermission("catalog_write");
  const refresh = () => setStops(AdminService.getStops());

  useEffect(() => {
    return AdminService.subscribe(refresh);
  }, []);

  const handleToggleActive = (stop: StopAdmin) => {
    if (!canWrite) {
      toast("Catalog Manager or Super Admin role required", "error");
      return;
    }
    const nextVal = !stop.is_active;
    requestReasonModal(
      nextVal ? "Activate Stop" : "Disable Stop",
      `${nextVal ? "Restore" : "Disable"} highway stop ${stop.name}.`,
      async (reason) => {
        AdminService.updateStop(currentAdmin, stop.id, { is_active: nextVal }, reason);
        await adminUpsertStopAction({
          id: stop.id,
          name: stop.name,
          price: stop.price,
          isActive: nextVal,
          reason,
        });
        toast(`Stop ${stop.name} is now ${nextVal ? "active" : "disabled"}.`, "success");
        refresh();
        await refreshOperationalData();
      }
    );
  };

  const handleDeleteStop = (stop: StopAdmin) => {
    if (!canWrite) {
      toast("Catalog Manager or Super Admin role required", "error");
      return;
    }
    requestReasonModal(
      "Delete Stop",
      `Are you sure you want to delete ${stop.name}?`,
      async (reason) => {
        AdminService.deleteStop(currentAdmin, stop.id, reason);
        await adminDeleteStopAction({ stopId: stop.id, reason });
        toast(`Stop ${stop.name} deleted.`, "success");
        if (isEditing && formData.id === stop.id) {
          setIsEditing(false);
        }
        refresh();
        await refreshOperationalData();
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
      async (reason) => {
        await adminUpsertStopAction({
          id: formData.id,
          destinationId: formData.destination_id || null,
          name: formData.name!,
          price: Number(formData.price) || 500,
          pricingUnit: formData.pricing_unit === "flat" ? "flat" : "per_person",
          distanceText: formData.distance_text || "",
          turnaroundText: formData.turnaround_text || "",
          amenities: formData.amenities || ["Clean Restrooms", "Artisan Chai Lounge"],
          isActive: formData.is_active ?? true,
          reason,
        });

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
        await refreshOperationalData();
      }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-text-primary tracking-tight">Mid-Journey Highway Stops</h1>
          <p className="text-xs text-text-secondary">
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
            className="flex items-center gap-2 rounded-xl bg-primary-container hover:bg-primary-container/90 px-4 py-2 text-xs font-bold text-white shadow-xs"
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
            className={`rounded-2xl border bg-card-surface p-5 shadow-xs flex flex-col justify-between ${
              s.is_active ? "border-border-hairline" : "border-border-hairline opacity-75 bg-surface/50"
            }`}
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-black text-text-primary">{s.name}</h3>
                  <p className="text-xs text-text-secondary mt-0.5">{s.destination_name} Highway Corridor</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase border ${
                    s.is_active
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-surface text-text-secondary border-border-hairline"
                  }`}
                >
                  {s.is_active ? "Active" : "Disabled"}
                </span>
              </div>

              <div className="mt-3 space-y-1 text-xs text-text-secondary">
                <p>{s.distance_text}</p>
                <p className="text-[11px] text-text-secondary/70 italic">{s.turnaround_text}</p>
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {s.amenities.map((a, i) => (
                  <span
                    key={i}
                    className="rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-medium text-text-secondary border border-border-hairline"
                  >
                    {a}
                  </span>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-border-hairline">
                <span className="text-text-secondary font-semibold uppercase text-[10px]">
                  {s.pricing_unit.replace("_", " ")}
                </span>
                <span className="text-sm font-black text-text-primary font-mono">
                  ₹{s.price.toLocaleString("en-IN")}{" "}
                  <span className="text-[10px] text-text-secondary font-normal font-sans">
                    {s.pricing_unit === "per_person" ? "/pax" : "flat"}
                  </span>
                </span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-border-hairline flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setFormData(s);
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
                  onClick={() => handleToggleActive(s)}
                  disabled={!canWrite}
                  className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
                    s.is_active
                      ? "bg-surface text-text-primary border-border-hairline hover:bg-surface-container-low"
                      : "bg-emerald-700 text-white border-emerald-800 hover:bg-emerald-800"
                  } disabled:opacity-50`}
                >
                  {s.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  <span>{s.is_active ? "Disable" : "Enable"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteStop(s)}
                  disabled={!canWrite}
                  className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-all disabled:opacity-50"
                  title="Delete Stop"
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
          <div className="w-full max-w-lg rounded-2xl bg-card-surface p-6 shadow-xl border border-border-hairline">
            <div className="flex items-center justify-between pb-3 border-b border-border-hairline">
              <h2 className="text-lg font-black text-text-primary">
                {formData.id ? `Edit Stop: ${formData.name}` : "Add Highway Stop"}
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
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">Stop Name</label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-border-hairline bg-surface p-2.5 text-xs text-text-primary focus:bg-card-surface"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Destination</label>
                  <select
                    value={formData.destination_id || ""}
                    onChange={(e) => setFormData({ ...formData, destination_id: e.target.value })}
                    className="w-full rounded-xl border border-border-hairline bg-surface p-2.5 text-xs text-text-primary focus:bg-card-surface"
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
                  <label className="block text-xs font-bold text-text-secondary mb-1">Pricing Unit</label>
                  <select
                    value={formData.pricing_unit || "per_person"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pricing_unit: e.target.value as "per_person" | "flat",
                      })
                    }
                    className="w-full rounded-xl border border-border-hairline bg-surface p-2.5 text-xs font-bold text-text-primary focus:bg-card-surface"
                  >
                    <option value="per_person">Per Person</option>
                    <option value="flat">Flat Vehicle Charge</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">Price (₹)</label>
                <input
                  type="number"
                  value={formData.price || 0}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full rounded-xl border border-border-hairline bg-surface p-2.5 text-xs text-text-primary focus:bg-card-surface font-mono"
                  required
                />
              </div>

              <CatalogImageUpload
                value={formData.image_url || ""}
                onChange={(url) => setFormData({ ...formData, image_url: url })}
                label="Stop Photo"
                helperText="Uploaded to Supabase catalog-images bucket and displayed on highway rest stop cards."
              />

              <div className="flex items-center justify-between pt-3 border-t border-border-hairline">
                {formData.id ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteStop(formData as StopAdmin)}
                    disabled={!canWrite}
                    className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Stop</span>
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
                    Save Stop
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
