import type { FireDetection } from "./types";
import { getAllBaseCoordinates } from "./military-bases";

// NASA FIRMS provides near-real-time fire data from MODIS and VIIRS satellites
// Free API: https://firms.modaps.eosdis.nasa.gov/api/

const FIRMS_BASE = "https://firms.modaps.eosdis.nasa.gov/api/area/csv";
const MAP_KEY = process.env.NASA_FIRMS_KEY || "FIRMS_MAP_KEY";
const MILITARY_RADIUS_KM = 2; // fires within 2km of base center = military

// In-memory cache (fire data updates ~every 3 hours from satellite passes)
let fireCache: { data: FireDetection[]; timestamp: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Military base coordinates cache (refreshed with fire data)
let baseCoordsCache: Array<{ lat: number; lng: number; name: string; type: string }> | null = null;
let baseCoordsTimestamp = 0;
const BASE_CACHE_TTL = 60 * 60 * 1000; // 1 hour

function parseConfidence(val: string | number): "low" | "nominal" | "high" {
  if (typeof val === "number") {
    if (val >= 80) return "high";
    if (val >= 50) return "nominal";
    return "low";
  }
  const lower = val.toLowerCase();
  if (lower === "h" || lower === "high") return "high";
  if (lower === "n" || lower === "nominal") return "nominal";
  return "low";
}

function buildHeaderIndex(headers: string[]): Map<string, number> {
  const index = new Map<string, number>();
  for (let i = 0; i < headers.length; i++) {
    index.set(headers[i], i);
  }
  return index;
}

function parseCsvRow(headerIndex: Map<string, number>, row: string): FireDetection | null {
  const cols = row.split(",");

  const get = (name: string) => {
    const idx = headerIndex.get(name);
    return idx !== undefined ? (cols[idx]?.trim() || "") : "";
  };

  if (!headerIndex.has("latitude") || !headerIndex.has("longitude")) return null;

  const lat = parseFloat(get("latitude"));
  const lng = parseFloat(get("longitude"));
  if (isNaN(lat) || isNaN(lng)) return null;

  const brightness = parseFloat(get("bright_ti4") || get("brightness")) || 0;
  const frp = parseFloat(get("frp")) || 0;
  const confidence = parseConfidence(get("confidence"));
  const acqDate = get("acq_date") || "";
  const acqTime = get("acq_time") || "0000";
  const satellite = get("satellite") || "VIIRS";
  const rawDayNight = (get("daynight") || "D").toUpperCase();
  const dayNight: "D" | "N" = rawDayNight === "N" ? "N" : "D";

  const acquiredAt = acqDate
    ? `${acqDate}T${acqTime.slice(0, 2)}:${acqTime.slice(2)}:00Z`
    : new Date().toISOString();

  return {
    id: `fire-${lat.toFixed(3)}-${lng.toFixed(3)}-${acqDate}-${acqTime}`,
    lat,
    lng,
    brightness,
    confidence,
    frp,
    satellite,
    acquiredAt,
    dayNight,
  };
}

// ── Haversine distance (km) ──

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Military base matching ──

async function getBaseCoords(): Promise<Array<{ lat: number; lng: number; name: string; type: string }>> {
  if (baseCoordsCache && Date.now() - baseCoordsTimestamp < BASE_CACHE_TTL) {
    return baseCoordsCache;
  }
  try {
    baseCoordsCache = await getAllBaseCoordinates();
    baseCoordsTimestamp = Date.now();
    return baseCoordsCache;
  } catch {
    return baseCoordsCache ?? [];
  }
}

function matchMilitaryBase(
  fire: FireDetection,
  bases: Array<{ lat: number; lng: number; name: string; type: string }>
): FireDetection["military"] | undefined {
  // Quick lat/lng bounding box pre-filter (~0.018 degrees ≈ 2km)
  const margin = 0.025;
  let closest: { name: string; type: string; dist: number } | null = null;

  for (const base of bases) {
    if (Math.abs(fire.lat - base.lat) > margin || Math.abs(fire.lng - base.lng) > margin) continue;
    const dist = haversineKm(fire.lat, fire.lng, base.lat, base.lng);
    if (dist <= MILITARY_RADIUS_KM && (!closest || dist < closest.dist)) {
      closest = { name: base.name, type: base.type, dist };
    }
  }

  if (!closest) return undefined;
  return {
    baseName: closest.name,
    baseType: closest.type,
    distanceKm: Math.round(closest.dist * 100) / 100,
  };
}

// ── Main fetch ──

export async function fetchFirmsData(days = 10): Promise<FireDetection[]> {
  if (fireCache && Date.now() - fireCache.timestamp < CACHE_TTL) {
    return fireCache.data;
  }

  // Clamp to FIRMS API max of 10 days
  const dayParam = Math.min(10, Math.max(1, days));
  const url = `${FIRMS_BASE}/${MAP_KEY}/VIIRS_SNPP_NRT/world/${dayParam}`;

  try {
    const [res, bases] = await Promise.all([
      fetch(url, {
        signal: AbortSignal.timeout(30_000),
        headers: { "User-Agent": "Nexus-WarRoom/1.0" },
      }),
      getBaseCoords(),
    ]);

    if (!res.ok) {
      console.error(`FIRMS API error: ${res.status}`);
      return fireCache?.data ?? [];
    }

    const text = await res.text();
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return fireCache?.data ?? [];

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const headerIndex = buildHeaderIndex(headers);
    const fires: FireDetection[] = [];

    for (let i = 1; i < lines.length && fires.length < 2000; i++) {
      const fire = parseCsvRow(headerIndex, lines[i]);
      if (!fire) continue;
      if (fire.confidence === "low") continue;

      // Cross-reference against military bases
      if (bases.length > 0) {
        fire.military = matchMilitaryBase(fire, bases);
      }

      fires.push(fire);
    }

    fireCache = { data: fires, timestamp: Date.now() };
    return fires;
  } catch (err) {
    console.error("FIRMS fetch error:", err);
    return fireCache?.data ?? [];
  }
}

export const SEED_FIRES: FireDetection[] = [
  { id: "seed-fire-1", lat: 36.2, lng: 36.8, brightness: 340, confidence: "high", frp: 45.2, satellite: "VIIRS", acquiredAt: new Date().toISOString(), dayNight: "D" },
  { id: "seed-fire-2", lat: -2.5, lng: 28.8, brightness: 310, confidence: "nominal", frp: 22.1, satellite: "VIIRS", acquiredAt: new Date().toISOString(), dayNight: "D" },
  { id: "seed-fire-3", lat: 48.3, lng: 37.8, brightness: 380, confidence: "high", frp: 78.5, satellite: "VIIRS", acquiredAt: new Date().toISOString(), dayNight: "N" },
  { id: "seed-fire-4", lat: -8.5, lng: -63.0, brightness: 330, confidence: "high", frp: 55.0, satellite: "VIIRS", acquiredAt: new Date().toISOString(), dayNight: "D" },
  { id: "seed-fire-5", lat: 15.4, lng: 32.5, brightness: 295, confidence: "nominal", frp: 18.3, satellite: "VIIRS", acquiredAt: new Date().toISOString(), dayNight: "D" },
  { id: "seed-fire-6", lat: 34.0, lng: 44.3, brightness: 350, confidence: "high", frp: 62.0, satellite: "VIIRS", acquiredAt: new Date().toISOString(), dayNight: "N" },
  { id: "seed-fire-7", lat: -15.5, lng: 28.3, brightness: 300, confidence: "nominal", frp: 25.0, satellite: "VIIRS", acquiredAt: new Date().toISOString(), dayNight: "D" },
  { id: "seed-fire-8", lat: 51.5, lng: 39.2, brightness: 320, confidence: "high", frp: 40.0, satellite: "VIIRS", acquiredAt: new Date().toISOString(), dayNight: "N" },
  { id: "seed-fire-9", lat: 10.0, lng: -67.0, brightness: 285, confidence: "nominal", frp: 15.0, satellite: "VIIRS", acquiredAt: new Date().toISOString(), dayNight: "D" },
  { id: "seed-fire-10", lat: 31.5, lng: 34.5, brightness: 370, confidence: "high", frp: 70.0, satellite: "VIIRS", acquiredAt: new Date().toISOString(), dayNight: "N" },
];
