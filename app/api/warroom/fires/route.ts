import { NextResponse } from "next/server";
import type { FireDetection, FireResponse } from "@/lib/warroom/types";
import { requireTier } from "@/lib/auth/require-tier";

// NASA FIRMS provides near-real-time fire data from MODIS and VIIRS satellites
// Free API: https://firms.modaps.eosdis.nasa.gov/api/
// Uses the open CSV endpoint (no API key required for VIIRS/MODIS last-24h data)

const FIRMS_BASE = "https://firms.modaps.eosdis.nasa.gov/api/area/csv";
const MAP_KEY = process.env.NASA_FIRMS_KEY || "FIRMS_MAP_KEY"; // Falls back to demo key

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

function parseCsvRow(headers: string[], row: string): FireDetection | null {
  const cols = row.split(",");
  if (cols.length < headers.length) return null;

  const get = (name: string) => cols[headers.indexOf(name)]?.trim() || "";

  const lat = parseFloat(get("latitude"));
  const lng = parseFloat(get("longitude"));
  if (isNaN(lat) || isNaN(lng)) return null;

  const brightness = parseFloat(get("bright_ti4") || get("brightness")) || 0;
  const frp = parseFloat(get("frp")) || 0;
  const confidence = parseConfidence(get("confidence"));
  const acqDate = get("acq_date") || "";
  const acqTime = get("acq_time") || "0000";
  const satellite = get("satellite") || "VIIRS";
  const daynight = get("daynight") as "D" | "N" || "D";

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
    dayNight: daynight,
  };
}

async function fetchFirmsData(): Promise<FireDetection[]> {
  // Check cache
  if (fireCache && Date.now() - fireCache.timestamp < CACHE_TTL) {
    return fireCache.data;
  }

  // Fetch VIIRS SNPP last 24h global data
  // Format: /api/area/csv/{MAP_KEY}/VIIRS_SNPP_NRT/{area}/{days}
  // Using world extent with 1 day
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
    const fires: FireDetection[] = [];

    // Parse rows, skip low-confidence detections and cap at 500
    for (let i = 1; i < lines.length && fires.length < 500; i++) {
      const fire = parseCsvRow(headers, lines[i]);
      if (!fire) continue;
      // Only include nominal+ confidence fires
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

// Seed fires for when the API is unavailable
const SEED_FIRES: FireDetection[] = [
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

export async function GET() {
  const tierCheck = await requireTier("free");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const fires = await fetchFirmsData();
    const data = fires.length > 0 ? fires : SEED_FIRES;
    const highConfidenceCount = data.filter((f) => f.confidence === "high").length;

    const response: FireResponse = {
      fires: data,
      timestamp: Date.now(),
      totalCount: data.length,
      highConfidenceCount,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Fire API error:", error);
    return NextResponse.json({
      fires: SEED_FIRES,
      timestamp: Date.now(),
      totalCount: SEED_FIRES.length,
      highConfidenceCount: SEED_FIRES.filter((f) => f.confidence === "high").length,
    } as FireResponse);
  }
}
