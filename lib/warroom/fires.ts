import type { FireDetection } from "./types";

// NASA FIRMS provides near-real-time fire data from MODIS and VIIRS satellites
// Free API: https://firms.modaps.eosdis.nasa.gov/api/

const FIRMS_BASE = "https://firms.modaps.eosdis.nasa.gov/api/area/csv";
const MAP_KEY = process.env.NASA_FIRMS_KEY || "FIRMS_MAP_KEY";

// In-memory cache (fire data updates ~every 3 hours from satellite passes)
let fireCache: { data: FireDetection[]; timestamp: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

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

export async function fetchFirmsData(): Promise<FireDetection[]> {
  if (fireCache && Date.now() - fireCache.timestamp < CACHE_TTL) {
    return fireCache.data;
  }

  const url = `${FIRMS_BASE}/${MAP_KEY}/VIIRS_SNPP_NRT/world/1`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(20_000),
      headers: { "User-Agent": "Nexus-WarRoom/1.0" },
    });

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

    for (let i = 1; i < lines.length && fires.length < 500; i++) {
      const fire = parseCsvRow(headerIndex, lines[i]);
      if (!fire) continue;
      if (fire.confidence === "low") continue;
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
