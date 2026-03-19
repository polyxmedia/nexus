import { NextResponse } from "next/server";
import type { SweepDeltaItem, SweepDeltaResponse, OsintEvent, FireDetection, RadiationReading } from "@/lib/warroom/types";
import { requireTier } from "@/lib/auth/require-tier";
import { docSearch, type GdeltArticle } from "@/lib/gdelt/client";
import { fetchFirmsData } from "@/lib/warroom/fires";
import { fetchSafecastData, ELEVATED_THRESHOLD } from "@/lib/warroom/radiation";
import { generateVessels } from "@/lib/warroom/vessels";

// In-memory state for delta computation between sweeps
interface SweepSnapshot {
  osintIds: Set<string>;
  fireIds: Set<string>;
  radiationElevated: Set<string>;
  militaryVesselCount: number;
  timestamp: string;
}

let previousSnapshot: SweepSnapshot | null = null;
let currentDeltas: SweepDeltaItem[] = [];
let lastSweepTime: string | null = null;

interface LayerData {
  osintEvents: OsintEvent[];
  fires: FireDetection[];
  radiation: RadiationReading[];
  militaryVesselCount: number;
}

function gdeltToOsintId(article: GdeltArticle): string {
  const title = article.title || "";
  const seenDate = article.seendate || "";
  return `gdelt-${Buffer.from(title.slice(0, 50) + seenDate).toString("base64url").slice(0, 16)}`;
}

async function fetchLayerData(): Promise<LayerData> {
  const [articles, fires, radiation] = await Promise.allSettled([
    docSearch({ query: "conflict OR military OR attack OR bombing", maxRecords: 100, timespan: "7d", timeoutMs: 8000 }),
    fetchFirmsData(),
    fetchSafecastData(),
  ]);

  // Build lightweight OSINT events from GDELT articles (just need id, lat, lng, type for delta)
  const osintEvents: OsintEvent[] = [];
  if (articles.status === "fulfilled") {
    for (const article of articles.value) {
      const lat = article.actiongeo_lat;
      const lng = article.actiongeo_long;
      if (!lat || !lng || (lat === 0 && lng === 0)) continue;

      const title = (article.title || "").toLowerCase();
      const eventType = title.includes("explo") || title.includes("bomb") ? "explosions" as const
        : title.includes("protest") ? "protests" as const
        : "strategic_developments" as const;

      const fatalityMatch = title.match(/(\d+)\s*(?:killed|dead|die|fatalities)/i);

      osintEvents.push({
        id: gdeltToOsintId(article),
        date: new Date().toISOString(),
        eventType,
        actors: "",
        location: article.title || "",
        country: article.sourcecountry || "",
        lat,
        lng,
        fatalities: fatalityMatch ? parseInt(fatalityMatch[1], 10) : 0,
        notes: article.title || "",
        source: article.domain || "GDELT",
        sourceUrl: article.url || "",
      });
    }
  }

  // Vessels come from deterministic generation (no external API call)
  const vessels = generateVessels();
  const militaryVesselCount = vessels.filter((v) => v.vesselType === "military").length;

  return {
    osintEvents,
    fires: fires.status === "fulfilled" ? fires.value : [],
    radiation: radiation.status === "fulfilled" ? radiation.value : [],
    militaryVesselCount,
  };
}

function computeDeltas(prev: SweepSnapshot, data: LayerData): SweepDeltaItem[] {
  const deltas: SweepDeltaItem[] = [];
  const now = new Date().toISOString();

  // New OSINT events
  for (const event of data.osintEvents) {
    if (!prev.osintIds.has(event.id)) {
      const isHighIntensity = event.fatalities > 0 || event.eventType === "explosions";
      deltas.push({
        id: `delta-osint-${event.id}`,
        layer: "osint",
        changeType: "new",
        summary: `${event.eventType.replace(/_/g, " ").toUpperCase()}: ${event.location || event.country}`,
        lat: event.lat,
        lng: event.lng,
        timestamp: now,
        severity: isHighIntensity ? "priority" : "routine",
      });
    }
  }

  // New fire detections
  for (const fire of data.fires) {
    if (!prev.fireIds.has(fire.id)) {
      deltas.push({
        id: `delta-fire-${fire.id}`,
        layer: "fire",
        changeType: "new",
        summary: `Fire detected (${fire.confidence} conf, ${fire.frp.toFixed(0)} MW FRP) at ${fire.lat.toFixed(2)}, ${fire.lng.toFixed(2)}`,
        lat: fire.lat,
        lng: fire.lng,
        timestamp: now,
        severity: fire.confidence === "high" && fire.frp > 50 ? "priority" : "routine",
      });
    }
  }

  // New elevated radiation
  for (const reading of data.radiation) {
    if (reading.value > ELEVATED_THRESHOLD && !prev.radiationElevated.has(reading.id)) {
      deltas.push({
        id: `delta-rad-${reading.id}`,
        layer: "radiation",
        changeType: "escalated",
        summary: `Elevated radiation: ${reading.value} CPM at ${reading.locationName || `${reading.lat.toFixed(2)}, ${reading.lng.toFixed(2)}`}`,
        lat: reading.lat,
        lng: reading.lng,
        timestamp: now,
        severity: reading.value > 200 ? "flash" : "priority",
      });
    }
  }

  // Military vessel count changes
  const milDiff = data.militaryVesselCount - prev.militaryVesselCount;
  if (Math.abs(milDiff) >= 2) {
    deltas.push({
      id: `delta-mil-sea-${Date.now()}`,
      layer: "vessel",
      changeType: milDiff > 0 ? "escalated" : "deescalated",
      summary: `Military vessels ${milDiff > 0 ? "+" : ""}${milDiff} (now ${data.militaryVesselCount} tracked)`,
      lat: 0,
      lng: 0,
      timestamp: now,
      severity: Math.abs(milDiff) >= 5 ? "priority" : "routine",
    });
  }

  // Sort: flash first, then priority, then routine
  const severityOrder = { flash: 0, priority: 1, routine: 2 };
  deltas.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return deltas.slice(0, 50);
}

export async function GET() {
  const tierCheck = await requireTier("free");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const data = await fetchLayerData();
    const now = new Date().toISOString();

    // Build current snapshot
    const snapshot: SweepSnapshot = {
      osintIds: new Set(data.osintEvents.map((e) => e.id)),
      fireIds: new Set(data.fires.map((f) => f.id)),
      radiationElevated: new Set(
        data.radiation.filter((r) => r.value > ELEVATED_THRESHOLD).map((r) => r.id)
      ),
      militaryVesselCount: data.militaryVesselCount,
      timestamp: now,
    };

    if (previousSnapshot) {
      currentDeltas = computeDeltas(previousSnapshot, data);
    }

    const previousSweepTime = lastSweepTime;
    lastSweepTime = now;
    previousSnapshot = snapshot;

    const response: SweepDeltaResponse = {
      deltas: currentDeltas,
      sweepTime: now,
      previousSweepTime,
      totalChanges: currentDeltas.length,
      flashCount: currentDeltas.filter((d) => d.severity === "flash").length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Sweep delta error:", error);
    return NextResponse.json({
      deltas: [],
      sweepTime: new Date().toISOString(),
      previousSweepTime: null,
      totalChanges: 0,
      flashCount: 0,
    } as SweepDeltaResponse);
  }
}
