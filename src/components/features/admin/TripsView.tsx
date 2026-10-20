"use client";

import React, { useState, useEffect } from "react";
import { AdminService } from "@/lib/admin/admin-service";
import { useAdmin } from "@/lib/admin/admin-context";
import type { CircuitAdmin } from "@/lib/admin/types";
import {
  adminUpsertCircuitAction,
  adminToggleCircuitStatusAction,
  adminDeleteCircuitAction,
} from "@/lib/actions/admin-ops";
import {
  Plus,
  Edit2,
  Trash2,
  Hotel,
  Car,
  Compass,
  EyeOff,
  Eye,
} from "lucide-react";
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

export function TripsView() {
  const { currentAdmin, hasPermission, requestReasonModal, toast, refreshOperationalData } = useAdmin();
  const [circuits, setCircuits] = useState<CircuitAdmin[]>(() =>
    AdminService.getCircuits()
  );
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<CircuitAdmin>>({});

  const destinations = AdminService.getDestinations();
  const allHotels = AdminService.getHotels();
  const allVehicles = AdminService.getVehicles();
  const allStops = AdminService.getStops();

  const canWrite = hasPermission("catalog_write");

  const refresh = () => {
    setCircuits(AdminService.getCircuits());
  };

  useEffect(() => {
    return AdminService.subscribe(refresh);
  }, []);

  const handleAddNewTrip = () => {
    if (!canWrite) {
      toast("Restricted: Catalog Manager or Super Admin role required", "error");
      return;
    }
    setFormData({
      title: "",
      destination_id: destinations[0]?.id || "",
      days: 3,
      nights: 2,
      base_price_per_person: 8499,
      badge: "Best Seller",
      summary: "",
      description: "",
      image_url: "",
      is_active: true,
      pricing_scope: "local_city_only",
      local_sightseeing_km_per_day: 50,
      vehicle_required: true,
      hotel_ids: [],
      vehicle_ids: [],
      stop_ids: [],
      included_hotel_ids: [],
      included_vehicle_ids: [],
      included_stop_ids: [],
    });
    setIsEditing(true);
  };

  const handleDeleteCircuit = (circuit: CircuitAdmin) => {
    if (!canWrite) {
      toast("Restricted: Catalog Manager or Super Admin role required", "error");
      return;
    }
    requestReasonModal(
      "Delete Trip / Circuit",
      `Are you sure you want to permanently delete circuit '${circuit.title}'? This action cannot be undone.`,
      async (reason) => {
        AdminService.deleteCircuit(currentAdmin, circuit.id, reason);
        await adminDeleteCircuitAction({ circuitId: circuit.id, reason });
        toast(`Trip ${circuit.title} has been deleted.`, "success");
        if (isEditing && formData.id === circuit.id) {
          setIsEditing(false);
        }
        refresh();
        await refreshOperationalData();
      }
    );
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
      async (reason) => {
        AdminService.updateCircuit(
          currentAdmin,
          circuit.id,
          { is_active: nextVal },
          reason
        );
        await adminToggleCircuitStatusAction({
          circuitId: circuit.id,
          isActive: nextVal,
          reason,
        });
        toast(
          `Circuit ${circuit.title} is now ${nextVal ? "visible" : "hidden"}.`,
          "success"
        );
        refresh();
        await refreshOperationalData();
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
      async (reason) => {
        const days = Number(formData.days) || 3;
        const nights = Math.max(0, days - 1);
        const pricingScope = formData.pricing_scope || "local_city_only";
        const localSightseeingKmPerDay = Number(formData.local_sightseeing_km_per_day) || 50;
        const hotelIds = formData.included_hotel_ids ?? formData.hotel_ids ?? [];
        const vehicleIds = formData.included_vehicle_ids ?? formData.vehicle_ids ?? [];
        const stopIds = formData.included_stop_ids ?? formData.stop_ids ?? [];

        await adminUpsertCircuitAction({
          id: formData.id,
          destinationId: formData.destination_id!,
          title: formData.title!,
          days,
          nights,
          basePricePerPerson: Number(formData.base_price_per_person) || 5000,
          rating: Number(formData.rating) || 4.8,
          badge: formData.badge || null,
          categories: formData.categories || ["heritage"],
          summary: formData.summary || "",
          description: formData.description || "",
          imageUrl: formData.image_url || "",
          isFeatured: Boolean(formData.is_featured),
          isActive: formData.is_active ?? true,
          pricingScope,
          includedHotelIds: hotelIds,
          includedVehicleIds: vehicleIds,
          includedStopIds: stopIds,
          localSightseeingKmPerDay,
          reason,
        });

        const circuitData = {
          ...formData,
          days,
          nights,
          pricing_scope: pricingScope,
          local_sightseeing_km_per_day: localSightseeingKmPerDay,
          included_hotel_ids: hotelIds,
          included_vehicle_ids: vehicleIds,
          included_stop_ids: stopIds,
          hotel_ids: hotelIds,
          vehicle_ids: vehicleIds,
          stop_ids: stopIds,
        };

        if (formData.id) {
          AdminService.updateCircuit(
            currentAdmin,
            formData.id,
            circuitData,
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
              days,
              nights,
              base_price_per_person: Number(formData.base_price_per_person) || 5000,
              rating: Number(formData.rating) || 4.9,
              badge: formData.badge || null,
              categories: formData.categories || ["heritage"],
              summary: formData.summary || "",
              description: formData.description || "",
              image_url: formData.image_url || "",
              is_featured: Boolean(formData.is_featured),
              is_active: formData.is_active ?? true,
              pricing_scope: pricingScope,
              local_sightseeing_km_per_day: localSightseeingKmPerDay,
              included_hotel_ids: hotelIds,
              included_vehicle_ids: vehicleIds,
              included_stop_ids: stopIds,
              allow_car: formData.allow_car ?? null,
              allow_bike: formData.allow_bike ?? null,
              vehicle_required: formData.vehicle_required ?? null,
              hotel_ids: hotelIds,
              vehicle_ids: vehicleIds,
              stop_ids: stopIds,
            },
            reason
          );
          toast(`Created circuit ${formData.title}`, "success");
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
          <h1 className="text-xl font-bold text-text-primary tracking-tight">
            Circuits & Trips Catalog
          </h1>
          <p className="text-xs text-text-secondary">
            Configure circuit offerings, days/nights, base prices, and per-trip availability bindings (§3.B)
          </p>
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={handleAddNewTrip}
            className="flex items-center gap-2 rounded-xl bg-primary-container hover:bg-primary-hover px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>+ Add New Trip</span>
          </button>
        )}
      </div>

      {/* Circuits List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {circuits.map((circ) => {
          return (
            <div
              key={circ.id}
              className={`rounded-2xl border bg-card-surface p-5 shadow-xs flex flex-col justify-between transition-all ${
                circ.is_active ? "border-border-hairline" : "border-border-hairline bg-surface/50 opacity-75"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-bold text-text-primary">{circ.title}</span>
                    </div>
                    <p className="text-xs font-medium text-text-secondary mt-0.5">
                      {circ.destination_name} · {circ.days}D / {circ.nights}N
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border ${
                      circ.is_active
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-surface-container text-text-secondary border-border-hairline"
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

                <p className="mt-2 text-xs text-text-secondary line-clamp-2 leading-relaxed">
                  {circ.summary || circ.description}
                </p>

                {/* Per-trip availability badges (§3.B) */}
                <div className="mt-4 rounded-xl bg-surface p-3 border border-border-hairline space-y-2 text-[11px]">
                  <div className="flex items-center justify-between text-text-secondary">
                    <span className="flex items-center gap-1">
                      <Hotel className="h-3 w-3 text-text-secondary/60" /> Hotels Offered:
                    </span>
                    <span className="font-bold text-text-primary">
                      {circ.hotel_ids.length > 0
                        ? `${circ.hotel_ids.length} Specific`
                        : "All Destination Hotels"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-text-secondary">
                    <span className="flex items-center gap-1">
                      <Car className="h-3 w-3 text-text-secondary/60" /> Fleet Offered:
                    </span>
                    <span className="font-bold text-text-primary">
                      {circ.vehicle_ids.length > 0
                        ? `${circ.vehicle_ids.length} Vehicles`
                        : "All Cars & Bikes"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-text-secondary">
                    <span className="flex items-center gap-1">
                      <Compass className="h-3 w-3 text-text-secondary/60" /> Highway Stops:
                    </span>
                    <span className="font-bold text-text-primary">
                      {circ.stop_ids.length > 0
                        ? `${circ.stop_ids.length} Stops`
                        : "Destination Stops"}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-text-secondary font-medium">Base Price:</span>
                  <span className="text-sm font-bold text-text-primary tabular-nums">
                    ₹{circ.base_price_per_person.toLocaleString("en-IN")}{" "}
                    <span className="text-[10px] text-text-secondary font-normal">/person</span>
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-5 pt-3 border-t border-border-hairline/60 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormData(circ);
                    setIsEditing(true);
                  }}
                  disabled={!canWrite}
                  className="flex items-center gap-1.5 rounded-xl border border-border-hairline bg-surface hover:bg-card-surface hover:border-text-primary px-3 py-1.5 text-xs font-bold text-text-primary disabled:opacity-50 transition-colors"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Configure</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(circ)}
                    disabled={!canWrite}
                    className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                      circ.is_active
                        ? "bg-surface-container text-text-primary hover:bg-surface-container-high border border-border-hairline"
                        : "bg-emerald-600 text-white hover:bg-emerald-700"
                    } disabled:opacity-50`}
                  >
                    {circ.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    <span>{circ.is_active ? "Hide" : "Activate"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteCircuit(circ)}
                    disabled={!canWrite}
                    className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50"
                    title="Delete Circuit"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
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
                {formData.title && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    URL Slug: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">/{formData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}</code>
                  </p>
                )}
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Route Highlights & Description</label>
                <textarea
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                  placeholder="Key highlights, itinerary notes, recommended stops..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="circuit-active-status"
                  checked={formData.is_active ?? true}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="circuit-active-status" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Active (visible in public customer catalog)
                </label>
              </div>

              <CatalogImageUpload
                value={formData.image_url || ""}
                onChange={(url) => setFormData({ ...formData, image_url: url })}
                label="Circuit Featured Image"
                helperText="Uploaded to Supabase catalog-images bucket and displayed on the trip card."
              />

              {/* Pricing & KM Scope Configuration */}
              <div className="rounded-2xl bg-surface-container-low p-4 border border-border-hairline space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-muted">
                  Pricing Scope & Transit Distance Engine
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary mb-1">
                      Coverage & KM Scope
                    </label>
                    <select
                      value={formData.pricing_scope || "local_city_only"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pricing_scope: e.target.value as "local_city_only" | "origin_transit_included",
                        })
                      }
                      className="w-full rounded-xl border border-border-hairline bg-surface p-2 text-xs text-text-primary"
                    >
                      <option value="local_city_only">
                        Destination Local Only (No highway KM)
                      </option>
                      <option value="origin_transit_included">
                        Outstation Transit (Origin to destination)
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary mb-1">
                      Local Sightseeing Allowance (km/day)
                    </label>
                    <input
                      type="number"
                      value={formData.local_sightseeing_km_per_day ?? 50}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          local_sightseeing_km_per_day: Number(e.target.value),
                        })
                      }
                      className="w-full rounded-xl border border-border-hairline bg-surface p-2 text-xs font-mono tabular-nums text-text-primary"
                      placeholder="50"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-text-secondary">
                  When set to &quot;Destination Local Only&quot;, the base price covers local destination sightseeing and hotel stay without charging arbitrary outstation transit kilometers.
                </p>
              </div>

              {/* Per-trip availability selectors (§3.B) */}
              <div className="rounded-2xl bg-surface-container-low p-4 border border-border-hairline space-y-4">
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-muted">
                    Trip-Scoped Inventory Matrix (§3.B)
                  </h4>
                  <p className="text-[11px] text-text-secondary">
                    Select specific items offered for this circuit. If empty, all active destination items are bookable.
                  </p>
                </div>

                {/* Hotels checkbox list */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-text-secondary flex items-center gap-1.5">
                      <Hotel className="h-3 w-3 text-primary-container" />
                      Hotels Allowed ({formData.included_hotel_ids?.length || formData.hotel_ids?.length || 0} selected)
                    </label>
                    <span className="text-[10px] text-text-muted">Filtered for destination</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2.5 bg-surface rounded-xl border border-border-hairline">
                    {allHotels
                      .filter((h) => !formData.destination_id || h.destination_id === formData.destination_id)
                      .map((h) => {
                        const current = formData.included_hotel_ids || formData.hotel_ids || [];
                        const isChecked = current.includes(h.id);
                        return (
                          <label key={h.id} className="flex items-center gap-2 text-xs text-text-primary cursor-pointer hover:bg-surface-container-low p-1 rounded-lg">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...current, h.id]
                                  : current.filter((id) => id !== h.id);
                                setFormData({ ...formData, included_hotel_ids: next, hotel_ids: next });
                              }}
                              className="rounded text-primary-600"
                            />
                            <span className="truncate">{h.name}</span>
                            <span className="text-[10px] text-text-muted tabular-nums ml-auto">₹{h.price_per_night}/n</span>
                          </label>
                        );
                      })}
                  </div>
                </div>

                {/* Vehicles checkbox list */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-text-secondary flex items-center gap-1.5">
                      <Car className="h-3 w-3 text-primary-container" />
                      Fleet Vehicles Allowed ({formData.included_vehicle_ids?.length || formData.vehicle_ids?.length || 0} selected)
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-text-primary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!(formData.vehicle_required ?? true)}
                        onChange={(e) => setFormData({ ...formData, vehicle_required: !e.target.checked })}
                        className="rounded text-primary-600"
                      />
                      <span>Allow Own Transport / No Vehicle</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2.5 bg-surface rounded-xl border border-border-hairline">
                    {allVehicles.map((v) => {
                      const current = formData.included_vehicle_ids || formData.vehicle_ids || [];
                      const isChecked = current.includes(v.id);
                      return (
                        <label key={v.id} className="flex items-center gap-2 text-xs text-text-primary cursor-pointer hover:bg-surface-container-low p-1 rounded-lg">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...current, v.id]
                                : current.filter((id) => id !== v.id);
                              setFormData({ ...formData, included_vehicle_ids: next, vehicle_ids: next });
                            }}
                            className="rounded text-primary-600"
                          />
                          <span className="truncate">{v.name} ({v.type})</span>
                          <span className="text-[10px] text-text-muted tabular-nums ml-auto">₹{v.price_per_day}/d</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Highway Stops checkbox list */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-text-secondary flex items-center gap-1.5">
                      <Compass className="h-3 w-3 text-primary-container" />
                      Highway Stops Offered ({formData.included_stop_ids?.length || formData.stop_ids?.length || 0} selected)
                    </label>
                    <span className="text-[10px] text-text-muted">Selectable in Step 4</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2.5 bg-surface rounded-xl border border-border-hairline">
                    {allStops
                      .filter((s) => !formData.destination_id || s.destination_id === formData.destination_id)
                      .map((s) => {
                        const current = formData.included_stop_ids || formData.stop_ids || [];
                        const isChecked = current.includes(s.id);
                        return (
                          <label key={s.id} className="flex items-center gap-2 text-xs text-text-primary cursor-pointer hover:bg-surface-container-low p-1 rounded-lg">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...current, s.id]
                                  : current.filter((id) => id !== s.id);
                                setFormData({ ...formData, included_stop_ids: next, stop_ids: next });
                              }}
                              className="rounded text-primary-600"
                            />
                            <span className="truncate">{s.name}</span>
                            <span className="text-[10px] text-text-muted tabular-nums ml-auto">{s.turnaround_text || s.distance_text || "Stop"}</span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                {formData.id ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteCircuit(formData as CircuitAdmin)}
                    disabled={!canWrite}
                    className="flex items-center gap-1 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Trip</span>
                  </button>
                ) : <div />}
                <div className="flex items-center gap-3">
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
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
