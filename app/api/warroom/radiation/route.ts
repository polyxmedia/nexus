import { NextResponse } from "next/server";
import type { RadiationReading, RadiationResponse } from "@/lib/warroom/types";
import { requireTier } from "@/lib/auth/require-tier";

// Safecast API - open radiation monitoring data
// https://api.safecast.org/

const SAFECAST_API = "https://api.safecast.org/measurements.json";

// In-memory cache (radiation data doesn't change rapidly)
let radiationCache: { data: RadiationReading[]; timestamp: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface SafecastMeasurement {
  id: number;
  latitude: number | string | null;
  longitude: number | string | null;
  value: number | string | null;
  unit: string;
  device_id: number | null;
  captured_at: string;
  location_name: string | null;
}

function parseSafecastReading(m: SafecastMeasurement): RadiationReading | null {
  const lat = typeof m.latitude === "string" ? parseFloat(m.latitude) : m.latitude;
  const lng = typeof m.longitude === "string" ? parseFloat(m.longitude) : m.longitude;
  const value = typeof m.value === "string" ? parseFloat(m.value) : m.value;

  if (lat == null || lng == null || value == null) return null;
  if (isNaN(lat) || isNaN(lng) || isNaN(value)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  return {
    id: `rad-${m.id}`,
    lat,
    lng,
    value,
    unit: m.unit || "cpm",
    deviceId: String(m.device_id || "unknown"),
    capturedAt: m.captured_at || new Date().toISOString(),
    locationName: m.location_name || "",
  };
}

// Normal background radiation is ~30-50 CPM
// Elevated readings are anything above 100 CPM
const ELEVATED_THRESHOLD = 100;

async function fetchSafecastData(): Promise<RadiationReading[]> {
  if (radiationCache && Date.now() - radiationCache.timestamp < CACHE_TTL) {
    return radiationCache.data;
  }

  try {
    // Fetch recent measurements, ordered by captured_at descending
    const url = `${SAFECAST_API}?order=captured_at+desc&per_page=200`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      headers: { "User-Agent": "Nexus-WarRoom/1.0" },
    });

    if (!res.ok) {
      console.error(`Safecast API error: ${res.status}`);
      return radiationCache?.data ?? [];
    }

    const measurements: SafecastMeasurement[] = await res.json();
    const readings: RadiationReading[] = [];

    for (const m of measurements) {
      const reading = parseSafecastReading(m);
      if (reading) readings.push(reading);
    }

    radiationCache = { data: readings, timestamp: Date.now() };
    return readings;
  } catch (err) {
    console.error("Safecast fetch error:", err);
    return radiationCache?.data ?? [];
  }
}

// Seed data for when the API is unavailable - global monitoring stations
const SEED_READINGS: RadiationReading[] = [
  { id: "rad-seed-1", lat: 37.42, lng: 141.03, value: 42, unit: "cpm", deviceId: "bGeigie-1001", capturedAt: new Date().toISOString(), locationName: "Fukushima Prefecture, Japan" },
  { id: "rad-seed-2", lat: 51.39, lng: 30.10, value: 55, unit: "cpm", deviceId: "bGeigie-2001", capturedAt: new Date().toISOString(), locationName: "Chernobyl Exclusion Zone, Ukraine" },
  { id: "rad-seed-3", lat: 48.86, lng: 2.35, value: 28, unit: "cpm", deviceId: "bGeigie-3001", capturedAt: new Date().toISOString(), locationName: "Paris, France" },
  { id: "rad-seed-4", lat: 35.68, lng: 139.69, value: 35, unit: "cpm", deviceId: "bGeigie-4001", capturedAt: new Date().toISOString(), locationName: "Tokyo, Japan" },
  { id: "rad-seed-5", lat: 40.71, lng: -74.01, value: 30, unit: "cpm", deviceId: "bGeigie-5001", capturedAt: new Date().toISOString(), locationName: "New York, USA" },
  { id: "rad-seed-6", lat: 55.75, lng: 37.62, value: 38, unit: "cpm", deviceId: "bGeigie-6001", capturedAt: new Date().toISOString(), locationName: "Moscow, Russia" },
  { id: "rad-seed-7", lat: 51.51, lng: -0.13, value: 25, unit: "cpm", deviceId: "bGeigie-7001", capturedAt: new Date().toISOString(), locationName: "London, UK" },
  { id: "rad-seed-8", lat: 37.57, lng: 126.98, value: 32, unit: "cpm", deviceId: "bGeigie-8001", capturedAt: new Date().toISOString(), locationName: "Seoul, South Korea" },
  { id: "rad-seed-9", lat: 39.91, lng: 116.40, value: 34, unit: "cpm", deviceId: "bGeigie-9001", capturedAt: new Date().toISOString(), locationName: "Beijing, China" },
  { id: "rad-seed-10", lat: 28.61, lng: 77.21, value: 40, unit: "cpm", deviceId: "bGeigie-10001", capturedAt: new Date().toISOString(), locationName: "New Delhi, India" },
  { id: "rad-seed-11", lat: 33.68, lng: 73.05, value: 36, unit: "cpm", deviceId: "bGeigie-11001", capturedAt: new Date().toISOString(), locationName: "Islamabad, Pakistan" },
  { id: "rad-seed-12", lat: 35.70, lng: 51.42, value: 33, unit: "cpm", deviceId: "bGeigie-12001", capturedAt: new Date().toISOString(), locationName: "Tehran, Iran" },
];

export async function GET() {
  const tierCheck = await requireTier("free");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const readings = await fetchSafecastData();
    const data = readings.length > 0 ? readings : SEED_READINGS;
    const elevatedCount = data.filter((r) => r.value > ELEVATED_THRESHOLD).length;

    const response: RadiationResponse = {
      readings: data,
      timestamp: Date.now(),
      totalCount: data.length,
      elevatedCount,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Radiation API error:", error);
    return NextResponse.json({
      readings: SEED_READINGS,
      timestamp: Date.now(),
      totalCount: SEED_READINGS.length,
      elevatedCount: 0,
    } as RadiationResponse);
  }
}
