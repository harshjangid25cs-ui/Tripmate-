/**
 * distance.ts — Real-World Geospatial & Road Routing Distance Engine
 * Computes exact distances between origins and tourist destinations using
 * Haversine geodesics + 1.28x Indian highway road-winding multiplier.
 * Replaces hardcoded fixed trip kilometers with dynamic coordinates.
 */

export interface GeoCoordinate {
  lat: number;
  lng: number;
}

export interface GeoLocation extends GeoCoordinate {
  name: string;
  state?: string;
  radiusKm?: number;
}

export const ROAD_WINDING_FACTOR = 1.28;

/**
 * Curated geographic database of major Indian origins and tourist destinations
 */
export const KNOWN_CITIES: Record<string, GeoLocation> = {
  jaipur: { name: "Jaipur", lat: 26.9124, lng: 75.7873, state: "Rajasthan", radiusKm: 40 },
  labana: { name: "Labana", lat: 27.0425, lng: 75.9521, state: "Rajasthan", radiusKm: 25 },
  delhi: { name: "Delhi", lat: 28.6139, lng: 77.209, state: "Delhi", radiusKm: 50 },
  delhincr: { name: "Delhi NCR", lat: 28.6139, lng: 77.209, state: "Delhi", radiusKm: 50 },
  gurugram: { name: "Gurugram", lat: 28.4595, lng: 77.0266, state: "Haryana", radiusKm: 35 },
  noida: { name: "Noida", lat: 28.5355, lng: 77.391, state: "Uttar Pradesh", radiusKm: 35 },
  mumbai: { name: "Mumbai", lat: 19.076, lng: 72.8777, state: "Maharashtra", radiusKm: 50 },
  ahmedabad: { name: "Ahmedabad", lat: 23.0225, lng: 72.5714, state: "Gujarat", radiusKm: 40 },
  ajmer: { name: "Ajmer", lat: 26.4499, lng: 74.6399, state: "Rajasthan", radiusKm: 30 },
  kota: { name: "Kota", lat: 25.2138, lng: 75.8648, state: "Rajasthan", radiusKm: 30 },
  jodhpur: { name: "Jodhpur", lat: 26.2389, lng: 73.0243, state: "Rajasthan", radiusKm: 40 },
  udaipur: { name: "Udaipur", lat: 24.5854, lng: 73.7125, state: "Rajasthan", radiusKm: 40 },
  jaisalmer: { name: "Jaisalmer", lat: 26.9157, lng: 70.9083, state: "Rajasthan", radiusKm: 40 },
  munnar: { name: "Munnar", lat: 10.0889, lng: 77.0595, state: "Kerala", radiusKm: 30 },
  hampi: { name: "Hampi", lat: 15.335, lng: 76.46, state: "Karnataka", radiusKm: 35 },
  bikaner: { name: "Bikaner", lat: 28.0229, lng: 73.3119, state: "Rajasthan", radiusKm: 35 },
  agra: { name: "Agra", lat: 27.1767, lng: 78.0081, state: "Uttar Pradesh", radiusKm: 35 },
  chandigarh: { name: "Chandigarh", lat: 30.7333, lng: 76.7794, state: "Punjab", radiusKm: 30 },
};

/**
 * Computes great-circle distance between two points on Earth using Haversine formula
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Computes realistic road travel distance applying highway winding factor (1.28x)
 * Supports either 2 coordinate objects or 4 numeric arguments (lat1, lon1, lat2, lon2).
 */
export function calculateRoadDistanceKm(
  arg1: GeoCoordinate | number,
  arg2: GeoCoordinate | number,
  arg3?: number,
  arg4?: number,
  arg5?: number
): number {
  if (typeof arg1 === "number" && typeof arg2 === "number" && typeof arg3 === "number" && typeof arg4 === "number") {
    const lat1 = arg1;
    const lon1 = arg2;
    const lat2 = arg3;
    const lon2 = arg4;
    const mult = typeof arg5 === "number" ? arg5 : ROAD_WINDING_FACTOR;
    const geodesic = haversineDistanceKm(lat1, lon1, lat2, lon2);
    if (geodesic === 0) return 0;
    return Math.max(1, Math.round(geodesic * mult));
  }

  const coord1 = arg1 as GeoCoordinate;
  const coord2 = arg2 as GeoCoordinate;
  const multiplier = typeof arg3 === "number" ? arg3 : ROAD_WINDING_FACTOR;
  const geodesic = haversineDistanceKm(coord1.lat, coord1.lng, coord2.lat, coord2.lng);
  if (geodesic === 0) return 0;
  return Math.max(1, Math.round(geodesic * multiplier));
}

/**
 * Curated list of known origin hubs
 */
export const KNOWN_ORIGIN_HUBS: GeoLocation[] = [
  { name: "Jaipur", lat: 26.9124, lng: 75.7873, state: "Rajasthan", radiusKm: 40 },
  { name: "Labana", lat: 27.0425, lng: 75.9521, state: "Rajasthan", radiusKm: 25 },
  { name: "Delhi", lat: 28.6139, lng: 77.209, state: "Delhi", radiusKm: 50 },
  { name: "Delhi NCR", lat: 28.6139, lng: 77.209, state: "Delhi", radiusKm: 50 },
  { name: "Gurugram", lat: 28.4595, lng: 77.0266, state: "Haryana", radiusKm: 35 },
  { name: "Noida", lat: 28.5355, lng: 77.391, state: "Uttar Pradesh", radiusKm: 35 },
  { name: "Mumbai", lat: 19.076, lng: 72.8777, state: "Maharashtra", radiusKm: 50 },
  { name: "Ahmedabad", lat: 23.0225, lng: 72.5714, state: "Gujarat", radiusKm: 40 },
  { name: "Ajmer", lat: 26.4499, lng: 74.6399, state: "Rajasthan", radiusKm: 30 },
  { name: "Kota", lat: 25.2138, lng: 75.8648, state: "Rajasthan", radiusKm: 30 },
  { name: "Jodhpur", lat: 26.2389, lng: 73.0243, state: "Rajasthan", radiusKm: 40 },
  { name: "Udaipur", lat: 24.5854, lng: 73.7125, state: "Rajasthan", radiusKm: 40 },
  { name: "Jaisalmer", lat: 26.9157, lng: 70.9083, state: "Rajasthan", radiusKm: 40 },
];

/**
 * Resolves a city name or coordinate to known geographic location
 */
export function resolveLocation(input: string | GeoCoordinate): GeoLocation | null {
  if (typeof input === "string") {
    const hubMatch = KNOWN_ORIGIN_HUBS.find(
      (h) => h.name.toLowerCase() === input.trim().toLowerCase()
    );
    if (hubMatch) return hubMatch;
    const key = input.trim().toLowerCase().replace(/[^a-z]/g, "");
    if (KNOWN_CITIES[key]) return KNOWN_CITIES[key]!;
    const match = Object.values(KNOWN_CITIES).find(
      (c) => c.name.toLowerCase() === input.trim().toLowerCase()
    );
    if (match) return match;
    return null;
  }
  if (typeof input === "object" && typeof input.lat === "number" && typeof input.lng === "number") {
    return {
      name: "Custom Location",
      lat: input.lat,
      lng: input.lng,
    };
  }
  return null;
}

/**
 * Resolves origin distance and pricing mode parameters
 */
export interface ResolveOriginDistanceParams {
  originName?: string;
  originLat?: number;
  originLng?: number;
  destLat: number;
  destLng: number;
  transitMode: "local_only" | "live_origin_to_destination";
}

export interface ResolveOriginDistanceResult {
  isLocalOnly: boolean;
  distanceKm: number;
  originName: string;
  coverageText: string;
}

export function resolveOriginDistance(params: ResolveOriginDistanceParams): ResolveOriginDistanceResult {
  const { originName, originLat, originLng, destLat, destLng, transitMode } = params;

  if (transitMode === "local_only") {
    return {
      isLocalOnly: true,
      distanceKm: 0,
      originName: originName || "Local City Scope",
      coverageText: "Local Destination Package — sightseeing and stay covered, zero highway charges",
    };
  }

  let resolvedCoord: GeoCoordinate | null = null;
  let resolvedName = originName || "Custom Origin";

  if (typeof originLat === "number" && typeof originLng === "number") {
    resolvedCoord = { lat: originLat, lng: originLng };
  } else if (originName) {
    const loc = resolveLocation(originName);
    if (loc) {
      resolvedCoord = { lat: loc.lat, lng: loc.lng };
      resolvedName = originName;
    }
  }

  if (!resolvedCoord) {
    return {
      isLocalOnly: false,
      distanceKm: 0,
      originName: resolvedName,
      coverageText: `Transit to Destination (${resolvedName})`,
    };
  }

  const distanceKm = calculateRoadDistanceKm(resolvedCoord.lat, resolvedCoord.lng, destLat, destLng);
  const destCity = findNearestCity(destLat, destLng);
  const destLabel = destCity ? destCity.name : "Destination";
  return {
    isLocalOnly: false,
    distanceKm,
    originName: resolvedName,
    coverageText: `${resolvedName} -> ${destLabel} (${distanceKm} km transit)`,
  };
}

/**
 * Computes road distance between two points, either by name or coordinate
 */
export function calculateDistanceBetween(
  origin: string | GeoCoordinate,
  destination: string | GeoCoordinate
): number {
  const p1 = resolveLocation(origin);
  const p2 = resolveLocation(destination);
  if (!p1 || !p2) return 0;
  return calculateRoadDistanceKm(p1, p2);
}

/**
 * Finds the nearest known city to a given latitude/longitude
 */
export function findNearestCity(lat: number, lng: number): GeoLocation {
  let nearest: GeoLocation = KNOWN_ORIGIN_HUBS[0]!;
  let minDistance = Infinity;

  for (const city of Object.values(KNOWN_CITIES)) {
    const d = haversineDistanceKm(lat, lng, city.lat, city.lng);
    if (d < minDistance) {
      minDistance = d;
      nearest = city;
    }
  }
  return nearest;
}

/**
 * Browser-safe geolocation resolver
 */
export async function detectBrowserLocation(): Promise<GeoCoordinate | null> {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    return null;
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        resolve(null);
      },
      { timeout: 7000, enableHighAccuracy: true }
    );
  });
}
