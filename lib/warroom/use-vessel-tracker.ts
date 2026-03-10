import { useCallback, useRef, useState } from "react";
import type { VesselState } from "./types";

export interface VesselTrailPoint {
  lat: number;
  lng: number;
  ts: number;
}

const MAX_TRAIL_POINTS = 200;
const MIN_DISTANCE_M = 10; // minimum movement to record a new point

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Accumulates position history for tracked vessels.
 * Returns a state-driven snapshot so React re-renders on changes.
 */
export function useVesselTracker() {
  const trailsRef = useRef<Map<string, VesselTrailPoint[]>>(new Map());
  const [snapshot, setSnapshot] = useState<Map<string, VesselTrailPoint[]>>(new Map());

  const record = useCallback((vessels: VesselState[], trackedMmsis: Set<string>) => {
    const now = Date.now();
    let changed = false;

    for (const v of vessels) {
      if (!trackedMmsis.has(v.mmsi)) continue;

      let trail = trailsRef.current.get(v.mmsi);
      if (!trail) {
        trail = [];
        trailsRef.current.set(v.mmsi, trail);
      }

      const last = trail[trail.length - 1];
      if (last) {
        const dist = haversineM(last.lat, last.lng, v.lat, v.lng);
        if (dist < MIN_DISTANCE_M) continue;
      }

      trail.push({ lat: v.lat, lng: v.lng, ts: now });
      changed = true;

      if (trail.length > MAX_TRAIL_POINTS) {
        trail.splice(0, trail.length - MAX_TRAIL_POINTS);
      }
    }

    if (changed) {
      // Create a new Map reference so React detects the change
      setSnapshot(new Map(trailsRef.current));
    }
  }, []);

  const getPointCount = useCallback((mmsi: string): number => {
    return trailsRef.current.get(mmsi)?.length ?? 0;
  }, []);

  const clear = useCallback((mmsi: string) => {
    trailsRef.current.delete(mmsi);
    setSnapshot(new Map(trailsRef.current));
  }, []);

  return { record, snapshot, getPointCount, clear };
}
