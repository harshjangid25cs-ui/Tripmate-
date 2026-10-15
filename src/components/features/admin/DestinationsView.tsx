"use client";

import React, { useState, useEffect } from "react";
import { AdminService } from "@/lib/admin/admin-service";
import { useAdmin } from "@/lib/admin/admin-context";
import type { DestinationAdmin } from "@/lib/admin/types";
import { adminUpsertDestinationAction } from "@/lib/actions/admin-ops";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Edit2,
} from "lucide-react";

export function DestinationsView() {
  const { currentAdmin, hasPermission, requestReasonModal, toast, refreshOperationalData } = useAdmin();
  const [destinations, setDestinations] = useState<DestinationAdmin[]>(() =>
    AdminService.getDestinations()
  );
  const [isEditing, setIsEditing] = useState(false);
  const [checklistResults, setChecklistResults] = useState<{
    id: string;
    canPublish: boolean;
    missingItems: string[];
  } | null>(null);

  // Edit / Create Form state
  const [formData, setFormData] = useState<Partial<DestinationAdmin>>({});

  const canWrite = hasPermission("catalog_write");

  const refresh = () => {
    setDestinations(AdminService.getDestinations());
  };

  useEffect(() => {
    return AdminService.subscribe(refresh);
  }, []);

  const handleMakeBookable = (dest: DestinationAdmin, currentVal: boolean) => {
    if (!canWrite) {
      toast("Restricted: Catalog Manager or Super Admin role required", "error");
      return;
    }

    const nextVal = !currentVal;

    if (nextVal) {
      const check = AdminService.checkPublishReadiness(dest.id);
      if (!check.canPublish) {
        setChecklistResults({
          id: dest.id,
          canPublish: false,
          missingItems: check.missingItems,
        });
        toast("Publish checklist failed. Review missing criteria.", "error");
        return;
      }
    }

    requestReasonModal(
      nextVal ? "Make Destination Bookable" : "Unpublish Destination",
      nextVal
        ? `Enable customer bookings for ${dest.name}. Requires verified checklist passing.`
        : `Disable customer bookings for ${dest.name}. Existing bookings remain active.`,
      async (reason) => {
        const res = AdminService.setDestinationBookable(
          currentAdmin,
          dest.id,
          nextVal,
          reason
        );
        if (res.ok) {
          await adminUpsertDestinationAction({
            id: dest.id,
            slug: dest.slug,
            name: dest.name,
            region: dest.region,
            isBookable: nextVal,
            isActive: dest.is_active,
            reason,
          });
          toast(
            nextVal
              ? `Destination ${dest.name} is now bookable on customer app!`
              : `Destination ${dest.name} is now hidden from new booking plans.`,
            "success"
          );
          setChecklistResults(null);
          refresh();
          await refreshOperationalData();
        } else {
          toast(res.missing?.join(", ") || "Failed to update", "error");
        }
      }
    );
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.slug) {
      toast("Name and slug are required", "error");
      return;
    }

    requestReasonModal(
      formData.id ? "Update Destination" : "Create Destination",
      `Save modifications to catalog item ${formData.name}.`,
      async (reason) => {
        await adminUpsertDestinationAction({
          id: formData.id,
          slug: formData.slug!,
          name: formData.name!,
          region: formData.region || "Rajasthan",
          tagline: formData.tagline || "",
          description: formData.description || "",
          startingPrice: Number(formData.starting_price) || 0,
          rating: Number(formData.rating) || 4.8,
          badge: formData.badge || null,
          categories: formData.categories || ["heritage"],
          heroImagePath: formData.hero_image_path || "/images/placeholder.jpg",
          isBookable: Boolean(formData.is_bookable),
          isActive: formData.is_active ?? true,
          isFeatured: Boolean(formData.is_featured),
          reason,
        });

        if (formData.id) {
          AdminService.updateDestination(
            currentAdmin,
            formData.id,
            formData,
            reason
          );
          toast(`Updated destination ${formData.name}`, "success");
        } else {
          AdminService.createDestination(
            currentAdmin,
            {
              slug: formData.slug!,
              name: formData.name!,
              region: formData.region || "North India",
              tagline: formData.tagline || "",
              description: formData.description || "",
              hero_image_path: formData.hero_image_path || "/images/placeholder.jpg",
              starting_price: Number(formData.starting_price) || 0,
              rating: Number(formData.rating) || 4.8,
              review_count: 0,
              recommended_days: formData.recommended_days || "3–4 Days",
              best_season: formData.best_season || "Oct–Mar",
              badge: formData.badge || null,
              categories: formData.categories || ["heritage"],
              origin_label: formData.origin_label || "Delhi NCR",
              drive_hours: Number(formData.drive_hours) || 5,
              drive_km: Number(formData.drive_km) || 250,
              is_featured: Boolean(formData.is_featured),
              is_bookable: false,
              is_active: true,
              allow_car: formData.allow_car ?? true,
              allow_bike: formData.allow_bike ?? true,
              vehicle_required: formData.vehicle_required ?? true,
              min_days: Number(formData.min_days) || 2,
              max_days: Number(formData.max_days) || 7,
              max_travellers: Number(formData.max_travellers) || 10,
            },
            reason
          );
          toast(`Created destination ${formData.name}`, "success");
        }
        setIsEditing(false);
        refresh();
        await refreshOperationalData();
      }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Destinations Catalog</h1>
          <p className="text-xs text-slate-500">
            Control destination parameters, availability rules, and the W1 Publish Checklist
          </p>
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={() => {
              setFormData({
                name: "",
                slug: "",
                region: "Rajasthan",
                tagline: "",
                description: "",
                starting_price: 8500,
                recommended_days: "3–4 Days",
                best_season: "Oct–Mar",
                allow_car: true,
                allow_bike: true,
                vehicle_required: true,
                min_days: 2,
                max_days: 7,
                max_travellers: 10,
                origin_label: "Delhi NCR",
                drive_hours: 6,
                drive_km: 260,
                hero_image_path: "/images/new-hero.jpg",
              });
              setIsEditing(true);
            }}
            className="flex items-center gap-2 rounded-2xl bg-primary-600 hover:bg-primary-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Add Destination</span>
          </button>
        )}
      </div>

      {/* Publish Checklist Banner if Triggered */}
      {checklistResults && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm animate-in fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-700 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-amber-900">
                  Publish Readiness Checklist Incomplete (W1 §4)
                </h3>
                <p className="mt-0.5 text-xs text-amber-800">
                  A destination cannot be set to <strong>is_bookable = true</strong> until all of the following
                  operational criteria are satisfied:
                </p>
                <ul className="mt-2 space-y-1 text-xs text-amber-900">
                  {checklistResults.missingItems.map((item, i) => (
                    <li key={i} className="flex items-center gap-1.5 font-medium">
                      <XCircle className="h-3.5 w-3.5 text-rose-600 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <button
              onClick={() => setChecklistResults(null)}
              className="text-amber-800 text-xs font-bold hover:underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Destinations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {destinations.map((dest) => {
          const readiness = AdminService.checkPublishReadiness(dest.id);

          return (
            <div
              key={dest.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-black text-slate-900">{dest.name}</span>
                      <span className="text-xs text-slate-400">({dest.slug})</span>
                    </div>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">{dest.region} · {dest.tagline}</p>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                      dest.is_bookable
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {dest.is_bookable ? "Bookable" : "Draft / Hidden"}
                  </span>
                </div>

                <p className="mt-3 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {dest.description}
                </p>

                {/* Specs Pill List */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Starting Price</span>
                    <span className="font-bold text-slate-900">
                      {dest.starting_price ? `₹${dest.starting_price.toLocaleString("en-IN")}` : "Not Set"}
                    </span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Recommended</span>
                    <span className="font-bold text-slate-900">{dest.recommended_days}</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Distance / Drive</span>
                    <span className="font-bold text-slate-900">
                      {dest.drive_km} km ({dest.drive_hours}h)
                    </span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Transport Flags</span>
                    <span className="font-bold text-slate-900">
                      {dest.allow_car ? "Car" : ""}{dest.allow_bike ? " · Bike" : ""}
                      {!dest.vehicle_required ? " (Opt)" : ""}
                    </span>
                  </div>
                </div>

                {/* Readiness status */}
                <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                  <span>Publish Checklist:</span>
                  <span
                    className={`flex items-center gap-1 ${
                      readiness.canPublish ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {readiness.canPublish ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Ready for Customer App
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3.5 w-3.5" /> {readiness.missingItems.length} items missing
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormData(dest);
                    setIsEditing(true);
                  }}
                  disabled={!canWrite}
                  className={`flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 ${
                    !canWrite ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMakeBookable(dest, dest.is_bookable)}
                  disabled={!canWrite}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-xs ${
                    dest.is_bookable
                      ? "bg-slate-100 text-slate-800 hover:bg-slate-200"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                  } ${!canWrite ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {dest.is_bookable ? "Unpublish" : "Make Bookable"}
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
                {formData.id ? `Edit ${formData.name}` : "Create New Destination"}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:ring-2 focus:ring-primary-500/20"
                    placeholder="e.g. Jaipur"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Slug (Unique)</label>
                  <input
                    type="text"
                    value={formData.slug || ""}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:ring-2 focus:ring-primary-500/20"
                    placeholder="e.g. jaipur"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Region</label>
                  <input
                    type="text"
                    value={formData.region || ""}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                    placeholder="e.g. Rajasthan"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tagline</label>
                  <input
                    type="text"
                    value={formData.tagline || ""}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                    placeholder="e.g. The Pink City"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                  placeholder="Detailed overview shown in detail card..."
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Starting Price (₹)</label>
                  <input
                    type="number"
                    value={formData.starting_price || 0}
                    onChange={(e) => setFormData({ ...formData, starting_price: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Drive Km</label>
                  <input
                    type="number"
                    value={formData.drive_km || 0}
                    onChange={(e) => setFormData({ ...formData, drive_km: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Drive Hours</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.drive_hours || 0}
                    onChange={(e) => setFormData({ ...formData, drive_hours: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                  />
                </div>
              </div>

              {/* Availability & Trip Limits (§3.B) */}
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3">
                  Availability & Traveller Limits (§3.B)
                </h4>
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={formData.allow_car ?? true}
                      onChange={(e) => setFormData({ ...formData, allow_car: e.target.checked })}
                      className="rounded text-primary-600"
                    />
                    <span>Allow Cars</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={formData.allow_bike ?? true}
                      onChange={(e) => setFormData({ ...formData, allow_bike: e.target.checked })}
                      className="rounded text-primary-600"
                    />
                    <span>Allow Bikes</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={formData.vehicle_required ?? true}
                      onChange={(e) => setFormData({ ...formData, vehicle_required: e.target.checked })}
                      className="rounded text-primary-600"
                    />
                    <span>Vehicle Required</span>
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Min Days</label>
                    <input
                      type="number"
                      value={formData.min_days || 2}
                      onChange={(e) => setFormData({ ...formData, min_days: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-300 p-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Max Days</label>
                    <input
                      type="number"
                      value={formData.max_days || 7}
                      onChange={(e) => setFormData({ ...formData, max_days: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-300 p-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Max Travellers</label>
                    <input
                      type="number"
                      value={formData.max_travellers || 10}
                      onChange={(e) => setFormData({ ...formData, max_travellers: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-300 p-1.5 text-xs"
                    />
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
                  Save & Validate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
