"use client";

import * as React from "react";
import {
  KNOWN_CITIES,
  detectBrowserLocation,
  calculateRoadDistanceKm,
  findNearestCity,
  type GeoCoordinate,
} from "@/lib/geo/distance";
import { updateTripTransitAction } from "@/lib/actions/trips";

interface LocationCoverageScopeBarProps {
  tripId?: string;
  destinationName: string;
  destinationLat?: number | null;
  destinationLng?: number | null;
  initialTransitMode?: "local_only" | "live_origin_to_destination" | null;
  initialOriginName?: string | null;
  initialCalculatedKm?: number | null;
  onDistanceChange?: (km: number, mode: "local_only" | "live_origin_to_destination") => void;
}

export function LocationCoverageScopeBar({
  tripId,
  destinationName,
  destinationLat = 26.9124,
  destinationLng = 75.7873,
  initialTransitMode = "local_only",
  initialOriginName = "Local City Scope",
  initialCalculatedKm = 0,
  onDistanceChange,
}: LocationCoverageScopeBarProps) {
  const [transitMode, setTransitMode] = React.useState<"local_only" | "live_origin_to_destination">(
    initialTransitMode || "local_only"
  );
  const [originName, setOriginName] = React.useState<string>(initialOriginName || "Delhi NCR");
  const [distanceKm, setDistanceKm] = React.useState<number>(initialCalculatedKm || 0);
  const [isDetecting, setIsDetecting] = React.useState(false);
  const [statusMsg, setStatusMsg] = React.useState<string | null>(null);

  const destCoord: GeoCoordinate = React.useMemo(() => ({
    lat: Number(destinationLat) || 26.9124,
    lng: Number(destinationLng) || 75.7873,
  }), [destinationLat, destinationLng]);

  // Compute road distance whenever origin or destination changes
  const computeAndSaveDistance = async (
    mode: "local_only" | "live_origin_to_destination",
    selectedOrigin: string,
    originCoord?: GeoCoordinate
  ) => {
    let km = 0;
    let lat: number | undefined;
    let lng: number | undefined;

    if (mode === "live_origin_to_destination") {
      let coord = originCoord;
      if (!coord) {
        const cityKey = selectedOrigin.toLowerCase().replace(/[^a-z]/g, "");
        const matched = KNOWN_CITIES[cityKey] || Object.values(KNOWN_CITIES).find(
          (c) => c.name.toLowerCase() === selectedOrigin.toLowerCase()
        );
        if (matched) {
          coord = { lat: matched.lat, lng: matched.lng };
        }
      }

      if (coord) {
        lat = coord.lat;
        lng = coord.lng;
        km = calculateRoadDistanceKm(coord, destCoord);
      } else {
        // Default highway estimate if city not in dictionary
        km = 275;
      }
    }

    setDistanceKm(km);
    setTransitMode(mode);
    setOriginName(selectedOrigin);
    if (onDistanceChange) onDistanceChange(km, mode);

    if (tripId) {
      try {
        await updateTripTransitAction({
          tripId,
          originName: mode === "live_origin_to_destination" ? selectedOrigin : `${destinationName} Local`,
          originLat: lat,
          originLng: lng,
          calculatedDistanceKm: km,
          transitMode: mode,
        });
      } catch {
        // Non-blocking UI update
      }
    }
  };

  const handleDetectLocation = async () => {
    setIsDetecting(true);
    setStatusMsg(null);
    try {
      const coord = await detectBrowserLocation();
      if (!coord) {
        setStatusMsg("Location access denied or timed out. Please choose your origin city.");
        setIsDetecting(false);
        return;
      }
      const nearest = findNearestCity(coord.lat, coord.lng);
      const label = `${nearest.name} (Live GPS)`;
      setStatusMsg(`Detected coordinates: near ${nearest.name}`);
      await computeAndSaveDistance("live_origin_to_destination", label, coord);
    } catch {
      setStatusMsg("Could not detect location. Using manual selector.");
    } finally {
      setIsDetecting(false);
    }
  };

  const handleCitySelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setStatusMsg(null);
    await computeAndSaveDistance("live_origin_to_destination", selected);
  };

  return (
    <div className="bg-card-surface border border-border-hairline rounded-2xl p-4 shadow-sm my-3 flex flex-col gap-3">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 border-b border-border-hairline pb-2.5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-primary">
            near_me
          </span>
          <span className="font-title-sm text-sm font-bold text-text-primary">
            Location &amp; Coverage Scope
          </span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-surface-container text-text-secondary text-[10px] font-bold uppercase tracking-wider">
          Dynamic Pricing
        </span>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="grid grid-cols-2 gap-2 bg-surface-container-low p-1 rounded-xl">
        <button
          type="button"
          onClick={() => computeAndSaveDistance("local_only", `${destinationName} Local Scope`)}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            transitMode === "local_only"
              ? "bg-primary-container text-on-primary shadow-sm"
              : "bg-transparent text-text-secondary hover:text-text-primary"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">
            holiday_village
          </span>
          <span>Destination Local Only</span>
        </button>

        <button
          type="button"
          onClick={() => computeAndSaveDistance("live_origin_to_destination", originName || "Delhi NCR")}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            transitMode === "live_origin_to_destination"
              ? "bg-primary-container text-on-primary shadow-sm"
              : "bg-transparent text-text-secondary hover:text-text-primary"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">
            navigation
          </span>
          <span>Live Origin / Transit</span>
        </button>
      </div>

      {/* Mode A Description */}
      {transitMode === "local_only" ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5">
          <span className="material-symbols-outlined text-emerald-700 text-[18px] shrink-0 mt-0.5">
            check_circle
          </span>
          <div className="text-xs text-emerald-900 leading-relaxed">
            <span className="font-bold">Mode A: {destinationName} Local City Package</span> — Price strictly covers local {destinationName} stay &amp; local sightseeing. No arbitrary or inflated outstation highway kilometer charges applied!
          </div>
        </div>
      ) : (
        /* Mode B Origin Selector & GPS Detector */
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-col gap-2.5">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-amber-700 text-[18px] shrink-0 mt-0.5">
              route
            </span>
            <div className="text-xs text-amber-900 leading-relaxed">
              <span className="font-bold">Mode B: Live Outstation Transit</span> — Highway transit from your current city to {destinationName}. Accurate road mileage computed via Haversine &amp; highway multipliers.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              disabled={isDetecting}
              onClick={handleDetectLocation}
              className="py-2 px-3 rounded-xl bg-surface-dark hover:bg-black text-card-surface text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[16px]">
                my_location
              </span>
              <span>{isDetecting ? "Detecting GPS..." : "Detect My Live Location"}</span>
            </button>

            <select
              value={Object.values(KNOWN_CITIES).some((c) => c.name === originName) ? originName : "Delhi NCR"}
              onChange={handleCitySelect}
              className="py-2 px-3 rounded-xl border border-border-hairline bg-card-surface text-text-primary text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="Delhi NCR">Delhi NCR (~275 km)</option>
              <option value="Labana">Labana, Rajasthan (~32 km)</option>
              <option value="Gurugram">Gurugram (~250 km)</option>
              <option value="Noida">Noida (~285 km)</option>
              <option value="Ajmer">Ajmer (~135 km)</option>
              <option value="Kota">Kota (~250 km)</option>
              <option value="Agra">Agra (~240 km)</option>
              <option value="Ahmedabad">Ahmedabad (~650 km)</option>
              <option value="Mumbai">Mumbai (~1,150 km)</option>
              <option value="Jodhpur">Jodhpur (~335 km)</option>
              <option value="Udaipur">Udaipur (~395 km)</option>
            </select>
          </div>

          {statusMsg && (
            <div className="text-[11px] text-amber-800 font-medium">
              {statusMsg}
            </div>
          )}

          {distanceKm > 0 && (
            <div className="flex items-center justify-between text-xs font-bold text-amber-950 bg-amber-100/70 px-3 py-1.5 rounded-lg border border-amber-200/80">
              <span>Road Distance:</span>
              <span>
                {originName} &rarr; {destinationName}: ~{distanceKm} km
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
