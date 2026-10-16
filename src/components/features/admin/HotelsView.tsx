"use client";

import React, { useState, useEffect } from "react";
import { AdminService } from "@/lib/admin/admin-service";
import { useAdmin } from "@/lib/admin/admin-context";
import type { HotelAdmin } from "@/lib/admin/types";
import { adminUpsertHotelAction } from "@/lib/actions/admin-ops";
import { Plus, Edit2, Star, EyeOff, Eye, AlertCircle } from "lucide-react";
import { CatalogImageUpload } from "./CatalogImageUpload";

export function HotelsView() {
  const { currentAdmin, hasPermission, requestReasonModal, toast, refreshOperationalData } = useAdmin();
  const [hotels, setHotels] = useState<HotelAdmin[]>(() => AdminService.getHotels());
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<HotelAdmin>>({});

  const destinations = AdminService.getDestinations();
  const canWrite = hasPermission("catalog_write");

  const refresh = () => setHotels(AdminService.getHotels());

  useEffect(() => {
    return AdminService.subscribe(refresh);
  }, []);

  const handleToggleActive = (hotel: HotelAdmin) => {
    if (!canWrite) {
      toast("Catalog Manager or Super Admin role required", "error");
      return;
    }
    const nextVal = !hotel.is_active;
    requestReasonModal(
      nextVal ? "Enable Hotel" : "Disable Hotel",
      `${nextVal ? "Restore" : "Disable"} hotel ${hotel.name}. ${
        !nextVal ? "Existing drafts will remove it on next visit; confirmed bookings are unaffected." : ""
      }`,
      async (reason) => {
        AdminService.updateHotel(currentAdmin, hotel.id, { is_active: nextVal }, reason);
        await adminUpsertHotelAction({
          id: hotel.id,
          destinationId: hotel.destination_id,
          name: hotel.name,
          pricePerNight: hotel.price_per_night,
          isActive: nextVal,
          reason,
        });
        toast(`Hotel ${hotel.name} is now ${nextVal ? "active" : "disabled"}.`, "success");
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
      formData.id ? "Update Hotel" : "Add Hotel",
      `Save modifications to hotel ${formData.name}. Price edits affect new bookings only.`,
      async (reason) => {
        await adminUpsertHotelAction({
          id: formData.id,
          destinationId: formData.destination_id!,
          name: formData.name!,
          rating: Number(formData.rating) || 4.8,
          neighborhood: formData.neighborhood || "",
          distanceText: formData.distance_text || "",
          pricePerNight: Number(formData.price_per_night) || 3500,
          amenities: formData.amenities || ["Free Wi-Fi", "Swimming Pool"],
          imageUrl: formData.image_url || "/images/placeholder.jpg",
          badge: formData.badge || null,
          isActive: formData.is_active ?? true,
          reason,
        });

        if (formData.id) {
          AdminService.updateHotel(currentAdmin, formData.id, formData, reason);
          toast(`Updated hotel ${formData.name}`, "success");
        } else {
          AdminService.createHotel(
            currentAdmin,
            {
              destination_id: formData.destination_id!,
              destination_name: destName,
              name: formData.name!,
              rating: Number(formData.rating) || 4.8,
              neighborhood: formData.neighborhood || "",
              distance_text: formData.distance_text || "",
              price_per_night: Number(formData.price_per_night) || 3500,
              amenities: formData.amenities || ["Free Wi-Fi", "Swimming Pool"],
              image_url: formData.image_url || "/images/placeholder.jpg",
              badge: formData.badge || null,
              is_active: true,
            },
            reason
          );
          toast(`Added hotel ${formData.name}`, "success");
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
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Hotels & Heritage Stays</h1>
          <p className="text-xs text-slate-500">
            Manage hotel inventory, per-night rates, amenities, and catalog status (§3.B)
          </p>
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={() => {
              setFormData({
                name: "",
                destination_id: destinations[0]?.id || "",
                rating: 4.8,
                neighborhood: "Old City",
                distance_text: "2.0 km from city center",
                price_per_night: 4200,
                amenities: ["Free Wi-Fi", "Swimming Pool", "Heritage Dining"],
              });
              setIsEditing(true);
            }}
            className="flex items-center gap-2 rounded-2xl bg-primary-600 hover:bg-primary-700 px-4 py-2 text-xs font-bold text-white shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Hotel</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {hotels.map((h) => (
          <div
            key={h.id}
            className={`rounded-3xl border bg-white p-5 shadow-xs flex flex-col justify-between ${
              h.is_active ? "border-slate-200" : "border-slate-200 opacity-75 bg-slate-50/50"
            }`}
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900">{h.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {h.destination_name} · {h.neighborhood}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                    h.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {h.is_active ? "Active" : "Disabled"}
                </span>
              </div>

              {h.badge && (
                <span className="inline-block mt-2 rounded-md bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 text-[10px] font-bold">
                  ★ {h.badge}
                </span>
              )}

              <p className="mt-2 text-xs text-slate-500">{h.distance_text}</p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {h.amenities.map((a, i) => (
                  <span
                    key={i}
                    className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                  >
                    {a}
                  </span>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
                <span className="flex items-center gap-1 font-bold text-amber-600">
                  <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" /> {h.rating}
                </span>
                <span className="text-sm font-black text-slate-900">
                  ₹{h.price_per_night.toLocaleString("en-IN")}{" "}
                  <span className="text-[10px] text-slate-400 font-normal">/night</span>
                </span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setFormData(h);
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
                onClick={() => handleToggleActive(h)}
                disabled={!canWrite}
                className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  h.is_active
                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                } disabled:opacity-50`}
              >
                {h.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                <span>{h.is_active ? "Disable" : "Enable"}</span>
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
                {formData.id ? `Edit Hotel: ${formData.name}` : "Add Hotel"}
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Hotel Name</label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:ring-2 focus:ring-primary-500/20"
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Price Per Night (₹)</label>
                  <input
                    type="number"
                    value={formData.price_per_night || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, price_per_night: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Neighborhood</label>
                  <input
                    type="text"
                    value={formData.neighborhood || ""}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                    placeholder="e.g. C-Scheme, Jaipur"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Distance Text</label>
                  <input
                    type="text"
                    value={formData.distance_text || ""}
                    onChange={(e) => setFormData({ ...formData, distance_text: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                    placeholder="e.g. 2.5 km from City Palace"
                  />
                </div>
              </div>

              <CatalogImageUpload
                value={formData.image_url || ""}
                onChange={(url) => setFormData({ ...formData, image_url: url })}
                label="Hotel Photo"
                helperText="Uploaded to Supabase catalog-images bucket and displayed on customer hotel cards."
              />

              <div className="rounded-2xl bg-amber-50 p-3 border border-amber-200 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-700 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-amber-800 leading-snug">
                  Rule §3.B: Price adjustments apply to newly initiated booking drafts only. Confirmed bookings maintain immutable price snapshots.
                </p>
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
                  Save Hotel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
