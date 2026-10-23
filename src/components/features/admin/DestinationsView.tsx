"use client";

import React, { useState, useEffect } from "react";
import { AdminService } from "@/lib/admin/admin-service";
import { useAdmin } from "@/lib/admin/admin-context";
import type { DestinationAdmin, DestinationHighlight } from "@/lib/admin/types";
import {
  adminUpsertDestinationAction,
  adminDeleteDestinationAction,
  adminToggleDestinationStatusAction,
  adminUpsertDestinationHighlightAction,
  adminDeleteDestinationHighlightAction,
  adminUpsertHotelAction,
  adminUpsertStopAction,
} from "@/lib/actions/admin-ops";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Navigation,
  Sparkles,
  Building,
  Milestone,
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

  // Sub-items inside modal: Highlights & Matrix
  const [modalHighlights, setModalHighlights] = useState<DestinationHighlight[]>([]);
  const [newHighTitle, setNewHighTitle] = useState("");
  const [newHighCategory, setNewHighCategory] = useState("Sightseeing");
  const newHighDuration = "2 Hours";
  const [newHighBadge, setNewHighBadge] = useState("");
  const [newHighDesc, setNewHighDesc] = useState("");
  const [newHighPhoto, setNewHighPhoto] = useState("");
  const [isSavingHighlight, setIsSavingHighlight] = useState(false);

  const allHotels = AdminService.getHotels();
  const allStops = AdminService.getStops();

  const canWrite = hasPermission("catalog_write");

  const refresh = () => {
    setDestinations(AdminService.getDestinations());
  };

  useEffect(() => {
    return AdminService.subscribe(refresh);
  }, []);

  // When opening edit modal, populate highlights
  useEffect(() => {
    if (formData.id) {
      const highs = AdminService.getHighlightsForDestination(formData.id);
      setModalHighlights(highs.length > 0 ? highs : formData.highlights || []);
    } else {
      setModalHighlights([]);
    }
  }, [formData.id, formData.highlights]);

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

  const handleDeleteDestination = (dest: DestinationAdmin) => {
    if (!canWrite) {
      toast("Restricted: Catalog Manager or Super Admin role required", "error");
      return;
    }
    requestReasonModal(
      "Delete Destination",
      `Are you sure you want to delete destination '${dest.name}' (${dest.slug})? Circuits linked to this destination will need reassignment.`,
      async (reason) => {
        AdminService.deleteDestination(currentAdmin, dest.id, reason);
        await adminDeleteDestinationAction({ destinationId: dest.id, reason });
        toast(`Destination ${dest.name} deleted.`, "success");
        if (isEditing && formData.id === dest.id) {
          setIsEditing(false);
        }
        refresh();
        await refreshOperationalData();
      }
    );
  };

  const handleToggleActive = (dest: DestinationAdmin) => {
    if (!canWrite) {
      toast("Restricted: Catalog Manager or Super Admin role required", "error");
      return;
    }
    const nextVal = !dest.is_active;
    requestReasonModal(
      nextVal ? "Activate Destination" : "Deactivate Destination",
      `${nextVal ? "Activate" : "Deactivate"} ${dest.name} in catalog.`,
      async (reason) => {
        AdminService.updateDestination(currentAdmin, dest.id, { is_active: nextVal }, reason);
        await adminToggleDestinationStatusAction({ destinationId: dest.id, isActive: nextVal, reason });
        toast(`Destination ${dest.name} is now ${nextVal ? "active" : "inactive"}.`, "success");
        refresh();
        await refreshOperationalData();
      }
    );
  };

  const handleAutoFillCoords = () => {
    const slug = (formData.slug || "").toLowerCase();
    const name = (formData.name || "").toLowerCase();
    
    if (slug.includes("jaipur") || name.includes("jaipur")) {
      setFormData((prev) => ({ ...prev, latitude: 26.9124, longitude: 75.7873, local_radius_km: 40 }));
      toast("Auto-filled coordinates for Jaipur (26.9124°N, 75.7873°E)", "success");
      return;
    }
    if (slug.includes("udaipur") || name.includes("udaipur")) {
      setFormData((prev) => ({ ...prev, latitude: 24.5854, longitude: 73.7125, local_radius_km: 40 }));
      toast("Auto-filled coordinates for Udaipur (24.5854°N, 73.7125°E)", "success");
      return;
    }
    if (slug.includes("jaisalmer") || name.includes("jaisalmer")) {
      setFormData((prev) => ({ ...prev, latitude: 26.9157, longitude: 70.9083, local_radius_km: 50 }));
      toast("Auto-filled coordinates for Jaisalmer (26.9157°N, 70.9083°E)", "success");
      return;
    }
    if (slug.includes("jodhpur") || name.includes("jodhpur")) {
      setFormData((prev) => ({ ...prev, latitude: 26.2389, longitude: 73.0243, local_radius_km: 40 }));
      toast("Auto-filled coordinates for Jodhpur (26.2389°N, 73.0243°E)", "success");
      return;
    }

    if (typeof window !== "undefined" && navigator.geolocation) {
      toast("Detecting live coordinates from GPS...", "info");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData((prev) => ({
            ...prev,
            latitude: Number(pos.coords.latitude.toFixed(6)),
            longitude: Number(pos.coords.longitude.toFixed(6)),
            local_radius_km: 40,
          }));
          toast(`Detected GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`, "success");
        },
        () => {
          setFormData((prev) => ({ ...prev, latitude: 26.9124, longitude: 75.7873, local_radius_km: 40 }));
          toast("Defaulted to Jaipur hub coordinates (26.9124, 75.7873)", "info");
        }
      );
    } else {
      setFormData((prev) => ({ ...prev, latitude: 26.9124, longitude: 75.7873, local_radius_km: 40 }));
      toast("Set to Jaipur hub coordinates", "info");
    }
  };

  const handleAddHighlight = async () => {
    if (!formData.id) {
      toast("Please save the destination first before adding highlights", "error");
      return;
    }
    if (!newHighTitle.trim()) {
      toast("Highlight title is required", "error");
      return;
    }

    setIsSavingHighlight(true);
    try {
      const res = await adminUpsertDestinationHighlightAction({
        destinationId: formData.id,
        title: newHighTitle.trim(),
        category: newHighCategory,
        durationText: newHighDuration,
        badge: newHighBadge.trim() || null,
        description: newHighDesc.trim() || null,
        sortOrder: modalHighlights.length + 1,
      });

      if (res.ok) {
        toast(`Added attraction '${newHighTitle}'`, "success");
        setNewHighTitle("");
        setNewHighDesc("");
        setNewHighBadge("");
        setNewHighPhoto("");
        await refreshOperationalData();
        if (formData.id) {
          setModalHighlights(AdminService.getHighlightsForDestination(formData.id));
        }
      } else {
        toast(res.error || "Failed to save attraction", "error");
      }
    } finally {
      setIsSavingHighlight(false);
    }
  };

  const handleDeleteHighlight = async (hId: string, title: string) => {
    const res = await adminDeleteDestinationHighlightAction({ id: hId });
    if (res.ok) {
      AdminService.deleteHighlight(currentAdmin, hId);
      setModalHighlights((prev) => prev.filter((h) => h.id !== hId));
      toast(`Deleted highlight '${title}'`, "success");
      await refreshOperationalData();
    } else {
      toast("Failed to delete highlight", "error");
    }
  };

  const handleToggleHotel = async (hotelId: string, currentAssigned: boolean) => {
    if (!formData.id) {
      toast("Please save this destination first before assigning hotels.", "error");
      return;
    }
    const nextDestId = currentAssigned ? null : formData.id;
    const hotel = allHotels.find((h) => h.id === hotelId);
    if (!hotel) return;

    const res = await adminUpsertHotelAction({
      id: hotel.id,
      destinationId: nextDestId ?? "",
      name: hotel.name,
      description: "",
      neighborhood: hotel.neighborhood,
      distanceText: hotel.distance_text,
      pricePerNight: hotel.price_per_night,
      rating: hotel.rating,
      badge: hotel.badge,
      amenities: hotel.amenities,
      imageUrl: hotel.image_url,
      isActive: hotel.is_active,
    });
    if (res.ok) {
      // Optimistically update local in-memory state so checkbox re-renders immediately
      hotel.destination_id = nextDestId || "";
      toast(`${hotel.name} ${nextDestId ? "assigned to" : "removed from"} this destination`, "success");
      refresh();
    } else {
      toast(res.error || `Failed to ${nextDestId ? "assign" : "remove"} hotel`, "error");
    }
  };

  const handleToggleStop = async (stopId: string, currentAssigned: boolean) => {
    if (!formData.id) {
      toast("Please save this destination first before assigning highway stops.", "error");
      return;
    }
    const nextDestId = currentAssigned ? null : formData.id;
    const stop = allStops.find((s) => s.id === stopId);
    if (!stop) return;

    const res = await adminUpsertStopAction({
      id: stop.id,
      destinationId: nextDestId,
      name: stop.name,
      price: stop.price,
      pricingUnit: stop.pricing_unit,
      distanceText: stop.distance_text,
      turnaroundText: stop.turnaround_text,
      amenities: stop.amenities,
      isActive: stop.is_active,
    });
    if (res.ok) {
      // Optimistically update local in-memory state so checkbox re-renders immediately
      stop.destination_id = nextDestId || "";
      toast(`${stop.name} ${nextDestId ? "assigned to" : "removed from"} this destination`, "success");
      refresh();
    } else {
      toast(res.error || `Failed to ${nextDestId ? "assign" : "remove"} stop`, "error");
    }
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
          heroImagePath: formData.hero_image_path || "",
          isBookable: Boolean(formData.is_bookable),
          isActive: formData.is_active ?? true,
          isFeatured: Boolean(formData.is_featured),
          latitude: formData.latitude !== null && formData.latitude !== undefined ? Number(formData.latitude) : null,
          longitude: formData.longitude !== null && formData.longitude !== undefined ? Number(formData.longitude) : null,
          localRadiusKm: Number(formData.local_radius_km) || 40,
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
              hero_image_path: formData.hero_image_path || "",
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
              latitude: formData.latitude !== null && formData.latitude !== undefined ? Number(formData.latitude) : null,
              longitude: formData.longitude !== null && formData.longitude !== undefined ? Number(formData.longitude) : null,
              local_radius_km: Number(formData.local_radius_km) || 40,
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
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Destinations Catalog</h1>
          <p className="text-xs text-text-secondary">
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
            className="flex items-center gap-2 rounded-xl bg-primary-container hover:bg-primary-hover px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors"
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
      <div className="rounded-xl border border-[#E5E3DF] bg-[#FFFFFF] shadow-xs overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-[#E5E3DF] bg-[#FFFFFF] shrink-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#1F1F1E] uppercase tracking-wider">Destinations Catalog</span>
            <span className="rounded-full bg-[#1F1F1E] px-2 py-0.5 text-[11px] font-bold text-white">
              {destinations.length}
            </span>
          </div>
          <span className="text-xs text-[#6E6D68]">Showing catalog cards · scroll inside box</span>
        </div>

        <div className="max-h-[420px] overflow-y-auto custom-scrollbar admin-scroll p-4 overscroll-contain">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {destinations.map((dest) => {
          const readiness = AdminService.checkPublishReadiness(dest.id);

          return (
            <div
              key={dest.id}
              className="rounded-2xl border border-border-hairline bg-card-surface p-5 shadow-xs flex flex-col justify-between hover:border-text-primary/30 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-bold text-text-primary">{dest.name}</span>
                      <span className="text-xs text-text-secondary">({dest.slug})</span>
                    </div>
                    <p className="text-xs font-medium text-text-secondary mt-0.5">{dest.region} · {dest.tagline}</p>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border ${
                      dest.is_bookable
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-surface-container text-text-secondary border-border-hairline"
                    }`}
                  >
                    {dest.is_bookable ? "Bookable" : "Draft / Hidden"}
                  </span>
                </div>

                <p className="mt-3 text-xs text-text-secondary line-clamp-2 leading-relaxed">
                  {dest.description}
                </p>

                {/* Specs Pill List */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-text-secondary">
                  <div className="rounded-xl bg-surface p-2 border border-border-hairline">
                    <span className="text-text-secondary/70 block text-[9px] uppercase font-bold">Starting Price</span>
                    <span className="font-bold text-text-primary tabular-nums">
                      {dest.starting_price ? `₹${dest.starting_price.toLocaleString("en-IN")}` : "Not Set"}
                    </span>
                  </div>
                  <div className="rounded-xl bg-surface p-2 border border-border-hairline">
                    <span className="text-text-secondary/70 block text-[9px] uppercase font-bold">Recommended</span>
                    <span className="font-bold text-text-primary">{dest.recommended_days}</span>
                  </div>
                  <div className="rounded-xl bg-surface p-2 border border-border-hairline">
                    <span className="text-text-secondary/70 block text-[9px] uppercase font-bold">Distance / Drive</span>
                    <span className="font-bold text-text-primary tabular-nums">
                      {dest.drive_km} km ({dest.drive_hours}h)
                    </span>
                  </div>
                  <div className="rounded-xl bg-surface p-2 border border-border-hairline">
                    <span className="text-text-secondary/70 block text-[9px] uppercase font-bold">Transport Flags</span>
                    <span className="font-bold text-text-primary">
                      {dest.allow_car ? "Car" : ""}{dest.allow_bike ? " · Bike" : ""}
                      {!dest.vehicle_required ? " (Opt)" : ""}
                    </span>
                  </div>
                </div>

                {/* Readiness status */}
                <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-text-secondary">
                  <span>Publish Checklist:</span>
                  <span
                    className={`flex items-center gap-1 ${
                      readiness.canPublish ? "text-emerald-700 font-bold" : "text-amber-700 font-bold"
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
              <div className="mt-5 pt-3 border-t border-border-hairline/60 flex items-center justify-between gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setFormData(dest);
                    setIsEditing(true);
                  }}
                  disabled={!canWrite}
                  className={`flex items-center gap-1.5 rounded-xl border border-border-hairline bg-surface hover:bg-card-surface hover:border-text-primary px-3 py-1.5 text-xs font-bold text-text-primary transition-colors ${
                    !canWrite ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(dest)}
                    disabled={!canWrite}
                    className={`rounded-xl px-2.5 py-1.5 text-xs font-bold transition-colors ${
                      dest.is_active ? "bg-surface-container text-text-primary hover:bg-surface-container-high border border-border-hairline" : "bg-emerald-600 text-white hover:bg-emerald-700"
                    }`}
                    title={dest.is_active ? "Deactivate" : "Activate"}
                  >
                    {dest.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMakeBookable(dest, dest.is_bookable)}
                    disabled={!canWrite}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors shadow-xs ${
                      dest.is_bookable
                        ? "bg-surface-container text-text-primary hover:bg-surface-container-high border border-border-hairline"
                        : "bg-primary-container text-white hover:bg-primary-hover"
                    } ${!canWrite ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {dest.is_bookable ? "Unpublish" : "Make Bookable"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteDestination(dest)}
                    disabled={!canWrite}
                    className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50"
                    title="Delete Destination"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
          </div>
        </div>

        <div className="px-4 py-2.5 border-t border-[#E5E3DF] bg-[#FBF9F5] text-xs text-[#6E6D68] shrink-0 flex items-center justify-between">
          <span>Showing {destinations.length} destination itineraries (scroll inside box for more)</span>
          <span className="font-mono text-[11px] text-[#8C8A85]">Catalog Operations</span>
        </div>
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

              <CatalogImageUpload
                value={formData.hero_image_path || ""}
                onChange={(url) => setFormData({ ...formData, hero_image_path: url })}
                label="Destination Hero Image"
                helperText="Uploaded to Supabase catalog-images bucket and displayed on customer cards."
              />

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

              {/* Geo-Coordinates & Local Sightseeing Radius */}
              <div className="rounded-2xl bg-surface-container-low p-4 border border-border-hairline">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-muted">
                      Geo-Coordinates & Local Sightseeing Radius
                    </h4>
                    <p className="text-[11px] text-text-secondary">
                      Required for real-world distance calculation and local-in-city pricing scoping.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoFillCoords}
                    className="flex items-center gap-1.5 rounded-xl border border-border-hairline bg-surface px-3 py-1.5 text-xs font-bold text-text-primary hover:bg-surface-container transition-colors"
                  >
                    <Navigation className="h-3 w-3 text-primary-container" />
                    <span>Auto-Fill / Use GPS</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary mb-1">Latitude (°N)</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={formData.latitude ?? ""}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value === "" ? null : Number(e.target.value) })}
                      className="w-full rounded-xl border border-border-hairline bg-surface p-2 text-xs font-mono tabular-nums text-text-primary"
                      placeholder="e.g. 26.912400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary mb-1">Longitude (°E)</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={formData.longitude ?? ""}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value === "" ? null : Number(e.target.value) })}
                      className="w-full rounded-xl border border-border-hairline bg-surface p-2 text-xs font-mono tabular-nums text-text-primary"
                      placeholder="e.g. 75.787300"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary mb-1">Local Sightseeing Radius (km)</label>
                    <input
                      type="number"
                      value={formData.local_radius_km ?? 40}
                      onChange={(e) => setFormData({ ...formData, local_radius_km: Number(e.target.value) })}
                      className="w-full rounded-xl border border-border-hairline bg-surface p-2 text-xs font-mono tabular-nums text-text-primary"
                      placeholder="40"
                    />
                  </div>
                </div>
              </div>

              {/* Destination Highlights Manager */}
              <div className="rounded-2xl bg-surface-container-low p-4 border border-border-hairline space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary-container" />
                      Destination Highlights & Attractions ({modalHighlights.length})
                    </h4>
                    <p className="text-[11px] text-text-secondary">
                      Sub-places and attractions displayed to customers on destination explore cards.
                    </p>
                  </div>
                </div>

                {formData.id ? (
                  <div className="space-y-3">
                    {modalHighlights.length > 0 ? (
                      <div className="space-y-2 max-h-[240px] overflow-y-auto custom-scrollbar admin-scroll overscroll-contain pr-1">
                        {modalHighlights.map((h) => (
                          <div key={h.id} className="flex items-center justify-between rounded-xl border border-border-hairline bg-surface p-2.5 text-xs">
                            <div className="flex-1 min-w-0 pr-3">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-text-primary truncate">{h.title}</span>
                                {h.category && (
                                  <span className="rounded-md bg-surface-container px-1.5 py-0.5 text-[10px] font-bold text-text-secondary">
                                    {h.category}
                                  </span>
                                )}
                              </div>
                              {h.description && (
                                <p className="text-[11px] text-text-secondary line-clamp-1">{h.description}</p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteHighlight(h.id, h.title)}
                              className="text-rose-600 hover:text-rose-800 p-1 rounded-lg"
                              title="Delete Highlight"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-text-muted italic">No highlights added yet for this destination.</p>
                    )}

                    <div className="rounded-xl border border-dashed border-border-hairline bg-surface p-3 space-y-2">
                      <span className="text-[11px] font-bold text-text-primary">Add New Attraction / Highlight</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={newHighTitle}
                          onChange={(e) => setNewHighTitle(e.target.value)}
                          placeholder="Attraction Title (e.g. Amber Fort)"
                          className="rounded-lg border border-border-hairline bg-surface p-2 text-xs text-text-primary"
                        />
                        <input
                          type="text"
                          value={newHighCategory}
                          onChange={(e) => setNewHighCategory(e.target.value)}
                          placeholder="Category (e.g. Heritage, Fort)"
                          className="rounded-lg border border-border-hairline bg-surface p-2 text-xs text-text-primary"
                        />
                      </div>
                      <input
                        type="text"
                        value={newHighDesc}
                        onChange={(e) => setNewHighDesc(e.target.value)}
                        placeholder="Short description..."
                        className="w-full rounded-lg border border-border-hairline bg-surface p-2 text-xs text-text-primary"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={newHighPhoto}
                          onChange={(e) => setNewHighPhoto(e.target.value)}
                          placeholder="Photo URL (optional)"
                          className="w-2/3 rounded-lg border border-border-hairline bg-surface p-2 text-xs text-text-primary"
                        />
                        <button
                          type="button"
                          onClick={handleAddHighlight}
                          disabled={isSavingHighlight || !newHighTitle.trim()}
                          className="rounded-lg bg-primary-container text-white px-3 py-2 text-xs font-bold hover:bg-primary-hover disabled:opacity-50"
                        >
                          {isSavingHighlight ? "Adding..." : "+ Add"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-text-muted">Save the destination first to manage highlights and attractions.</p>
                )}
              </div>

              {/* Assigned Hotels & Stops Quick-Matrix */}
              <div className="rounded-2xl bg-surface-container-low p-4 border border-border-hairline space-y-3">
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-muted">
                    Destination Hotels & Highway Stops Matrix
                  </h4>
                  <p className="text-[11px] text-text-secondary">
                    Quickly link or unlink inventory to this destination hub.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Hotels checklist */}
                  <div className="rounded-xl border border-border-hairline bg-surface p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                        <Building className="h-3.5 w-3.5 text-primary-container" />
                        Hotels ({allHotels.filter(h => h.destination_id === formData.id).length} linked)
                      </span>
                    </div>
                    <div className="max-h-[240px] overflow-y-auto custom-scrollbar admin-scroll overscroll-contain space-y-1.5 pr-1">
                      {allHotels.map((h) => {
                        const isLinked = h.destination_id === formData.id;
                        return (
                          <label key={h.id} className="flex items-center gap-2 text-xs text-text-primary cursor-pointer hover:bg-surface-container-low p-1 rounded-lg">
                            <input
                              type="checkbox"
                              checked={isLinked}
                            onChange={() => handleToggleHotel(h.id, isLinked)}
                              className="rounded text-primary-600"
                            />
                            <span className="truncate">{h.name}</span>
                            <span className="text-[10px] text-text-muted tabular-nums ml-auto">₹{h.price_per_night}/n</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stops checklist */}
                  <div className="rounded-xl border border-border-hairline bg-surface p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                        <Milestone className="h-3.5 w-3.5 text-primary-container" />
                        Highway Stops ({allStops.filter(s => s.destination_id === formData.id).length} linked)
                      </span>
                    </div>
                    <div className="max-h-[240px] overflow-y-auto custom-scrollbar admin-scroll overscroll-contain space-y-1.5 pr-1">
                      {allStops.map((s) => {
                        const isLinked = s.destination_id === formData.id;
                        return (
                          <label key={s.id} className="flex items-center gap-2 text-xs text-text-primary cursor-pointer hover:bg-surface-container-low p-1 rounded-lg">
                            <input
                              type="checkbox"
                              checked={isLinked}
                            onChange={() => handleToggleStop(s.id, isLinked)}
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
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                {formData.id ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteDestination(formData as DestinationAdmin)}
                    disabled={!canWrite}
                    className="flex items-center gap-1 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Destination</span>
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
                    Save & Validate
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
