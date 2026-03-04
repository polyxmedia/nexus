"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import type { OsintEvent, OsintEventType } from "@/lib/warroom/types";

// Extend L to include heatLayer
declare module "leaflet" {
  function heatLayer(
    latlngs: Array<[number, number, number]>,
    options?: Record<string, unknown>
  ): L.Layer;
}

interface ConflictHeatmapLayerProps {
  events: OsintEvent[];
}

const EVENT_WEIGHTS: Record<OsintEventType, number> = {
  battles: 1.0,
  explosions: 0.85,
  violence_against_civilians: 0.75,
  riots: 0.45,
  strategic_developments: 0.35,
  protests: 0.2,
};

// Recency multiplier: events in last 7 days get boosted
function recencyBoost(dateStr: string): number {
  const ageMs = Date.now() - new Date(dateStr).getTime();
  const ageDays = ageMs / (24 * 60 * 60 * 1000);
  if (ageDays < 1) return 1.5;
  if (ageDays < 3) return 1.2;
  if (ageDays < 7) return 1.0;
  return 0.7;
}

// Fatality intensity boost
function fatalityBoost(fatalities: number): number {
  if (fatalities >= 50) return 1.4;
  if (fatalities >= 10) return 1.2;
  if (fatalities >= 1) return 1.05;
  return 1.0;
}

export function ConflictHeatmapLayer({ events }: ConflictHeatmapLayerProps) {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (!map) return;

    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }

    const points: Array<[number, number, number]> = events.map((e) => {
      const baseWeight = EVENT_WEIGHTS[e.eventType] || 0.3;
      const weight = Math.min(1.0, baseWeight * recencyBoost(e.date) * fatalityBoost(e.fatalities));
      return [e.lat, e.lng, weight];
    });

    if (points.length === 0) return;

    const heat = L.heatLayer(points, {
      radius: 45,
      blur: 25,
      maxZoom: 6,
      max: 0.3,
      minOpacity: 0.2,
      gradient: {
        0.0: "#0a0a2e",
        0.2: "#1e3a8a",
        0.35: "#3b82f6",
        0.5: "#eab308",
        0.65: "#f97316",
        0.8: "#ef4444",
        0.9: "#dc2626",
        1.0: "#991b1b",
      },
    });

    heat.addTo(map);
    layerRef.current = heat;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, events]);

  return null;
}
