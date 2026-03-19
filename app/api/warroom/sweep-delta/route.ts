import { NextResponse } from "next/server";
import type { SweepDeltaItem, SweepDeltaResponse } from "@/lib/warroom/types";
import { requireTier } from "@/lib/auth/require-tier";

// In-memory state for delta computation between sweeps
interface SweepSnapshot {
  osintIds: Set<string>;
  fireIds: Set<string>;
  radiationElevated: Set<string>;
  militaryAircraftCount: number;
  militaryVesselCount: number;
  timestamp: string;
}

let previousSnapshot: SweepSnapshot | null = null;
let currentDeltas: SweepDeltaItem[] = [];
let lastSweepTime: string | null = null;

async function fetchLayerData() {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const headers: Record<string, string> = {};

  // Fetch all layers in parallel
  const [osintRes, fireRes, radiationRes, aircraftRes, vesselRes] = await Promise.allSettled([
    fetch(`${baseUrl}/api/warroom/osint`, { signal: AbortSignal.timeout(10_000), headers }).then((r) => r.ok ? r.json() : null),
    fetch(`${baseUrl}/api/warroom/fires`, { signal: AbortSignal.timeout(10_000), headers }).then((r) => r.ok ? r.json() : null),
    fetch(`${baseUrl}/api/warroom/radiation`, { signal: AbortSignal.timeout(10_000), headers }).then((r) => r.ok ? r.json() : null),
    fetch(`${baseUrl}/api/warroom/aircraft`, { signal: AbortSignal.timeout(10_000), headers }).then((r) => r.ok ? r.json() : null),
    fetch(`${baseUrl}/api/warroom/vessels`, { signal: AbortSignal.timeout(10_000), headers }).then((r) => r.ok ? r.json() : null),
  ]);

  return {
    osint: osintRes.status === "fulfilled" ? osintRes.value : null,
    fires: fireRes.status === "fulfilled" ? fireRes.value : null,
    radiation: radiationRes.status === "fulfilled" ? radiationRes.value : null,
    aircraft: aircraftRes.status === "fulfilled" ? aircraftRes.value : null,
    vessels: vesselRes.status === "fulfilled" ? vesselRes.value : null,
  };
}

function computeDeltas(prev: SweepSnapshot, curr: SweepSnapshot, layerData: Awaited<ReturnType<typeof fetchLayerData>>): SweepDeltaItem[] {
  const deltas: SweepDeltaItem[] = [];
  const now = new Date().toISOString();

  // New OSINT events
  if (layerData.osint?.events) {
    for (const event of layerData.osint.events) {
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
  }

  // New fire detections
  if (layerData.fires?.fires) {
    for (const fire of layerData.fires.fires) {
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
  }

  // New elevated radiation
  if (layerData.radiation?.readings) {
    for (const reading of layerData.radiation.readings) {
      if (reading.value > 100 && !prev.radiationElevated.has(reading.id)) {
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
  }

  // Military aircraft count changes
  if (layerData.aircraft) {
    const milDiff = curr.militaryAircraftCount - prev.militaryAircraftCount;
    if (Math.abs(milDiff) >= 3) {
      deltas.push({
        id: `delta-mil-air-${Date.now()}`,
        layer: "aircraft",
        changeType: milDiff > 0 ? "escalated" : "deescalated",
        summary: `Military aircraft ${milDiff > 0 ? "+" : ""}${milDiff} (now ${curr.militaryAircraftCount} tracked)`,
        lat: 0,
        lng: 0,
        timestamp: now,
        severity: Math.abs(milDiff) >= 10 ? "priority" : "routine",
      });
    }
  }

  // Military vessel count changes
  if (layerData.vessels) {
    const milDiff = curr.militaryVesselCount - prev.militaryVesselCount;
    if (Math.abs(milDiff) >= 2) {
      deltas.push({
        id: `delta-mil-sea-${Date.now()}`,
        layer: "vessel",
        changeType: milDiff > 0 ? "escalated" : "deescalated",
        summary: `Military vessels ${milDiff > 0 ? "+" : ""}${milDiff} (now ${curr.militaryVesselCount} tracked)`,
        lat: 0,
        lng: 0,
        timestamp: now,
        severity: Math.abs(milDiff) >= 5 ? "priority" : "routine",
      });
    }
  }

  // Sort: flash first, then priority, then routine
  const severityOrder = { flash: 0, priority: 1, routine: 2 };
  deltas.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return deltas.slice(0, 50); // Cap at 50 delta items
}

export async function GET() {
  const tierCheck = await requireTier("free");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const layerData = await fetchLayerData();
    const now = new Date().toISOString();

    // Build current snapshot
    const snapshot: SweepSnapshot = {
      osintIds: new Set<string>(),
      fireIds: new Set<string>(),
      radiationElevated: new Set<string>(),
      militaryAircraftCount: 0,
      militaryVesselCount: 0,
      timestamp: now,
    };

    if (layerData.osint?.events) {
      for (const e of layerData.osint.events) snapshot.osintIds.add(e.id);
    }
    if (layerData.fires?.fires) {
      for (const f of layerData.fires.fires) snapshot.fireIds.add(f.id);
    }
    if (layerData.radiation?.readings) {
      for (const r of layerData.radiation.readings) {
        if (r.value > 100) snapshot.radiationElevated.add(r.id);
      }
    }
    snapshot.militaryAircraftCount = layerData.aircraft?.militaryCount ?? 0;
    snapshot.militaryVesselCount = layerData.vessels?.militaryCount ?? 0;

    // Compute deltas if we have a previous snapshot
    if (previousSnapshot) {
      currentDeltas = computeDeltas(previousSnapshot, snapshot, layerData);
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
