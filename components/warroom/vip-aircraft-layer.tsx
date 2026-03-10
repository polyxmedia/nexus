"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { VipAircraftState } from "@/lib/warroom/types";

interface VipAircraftLayerProps {
  aircraft: VipAircraftState[];
  onAircraftClick?: (aircraft: VipAircraftState) => void;
}

// ── Category colors ──

const CATEGORY_COLORS: Record<string, string> = {
  "Head of State": "#fbbf24",   // amber-400
  "Dictator Alert": "#f97316",  // orange-500
  "Oligarch": "#a78bfa",        // violet-400
  "Royal Aircraft": "#fbbf24",  // amber-400
  "Governments": "#38bdf8",     // sky-400
  "Da Comrade": "#f87171",      // red-400
  "Agency": "#34d399",          // emerald-400
  "Nuclear": "#ef4444",         // red-500
  "Special Forces": "#f43f5e",  // rose-500
  "Ukraine": "#facc15",         // yellow-400
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || "#fbbf24";
}

// ── Icon cache ──

const iconCache = new Map<string, L.DivIcon>();

function getVipIcon(heading: number, category: string): L.DivIcon {
  const bucket = Math.round(heading / 10) * 10;
  const key = `${category}-${bucket}`;
  const cached = iconCache.get(key);
  if (cached) return cached;

  const color = getCategoryColor(category);
  const size = 28;
  const svg = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" style="transform:rotate(${bucket}deg);filter:drop-shadow(0 0 6px ${color})drop-shadow(0 0 12px ${color}40)">
    <path d="M12 2L8 10l-6 2 6 2 4 8 4-8 6-2-6-2z" fill="${color}" stroke="${color}" stroke-width="0.5" opacity="0.95"/>
  </svg>`;

  const icon = L.divIcon({
    html: svg,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

  iconCache.set(key, icon);
  return icon;
}

// ── Layer Component ──

export function VipAircraftLayer({ aircraft, onAircraftClick }: VipAircraftLayerProps) {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  const handleClick = useCallback(
    (ac: VipAircraftState) => {
      if (onAircraftClick) {
        map.flyTo([ac.lat, ac.lng], Math.max(map.getZoom(), 6), { duration: 0.8 });
        onAircraftClick(ac);
      }
    },
    [map, onAircraftClick]
  );

  useEffect(() => {
    if (!layerRef.current) {
      layerRef.current = L.layerGroup().addTo(map);
    }

    const layer = layerRef.current;
    const existing = markersRef.current;
    const currentIds = new Set<string>();

    for (const ac of aircraft) {
      if (ac.onGround) continue;
      currentIds.add(ac.icao24);

      const icon = getVipIcon(ac.heading, ac.category);
      const existingMarker = existing.get(ac.icao24);

      const tooltipContent = `
        <div style="font-family:monospace;font-size:10px;line-height:1.4;min-width:160px">
          <div style="color:${getCategoryColor(ac.category)};font-weight:bold;font-size:11px;margin-bottom:2px">${ac.owner}</div>
          <div style="color:#a3a3a3;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px">${ac.category}</div>
          ${ac.callsign ? `<div style="color:#e5e5e5">${ac.callsign} / ${ac.registration || ac.icao24}</div>` : `<div style="color:#e5e5e5">${ac.registration || ac.icao24}</div>`}
          <div style="color:#737373">${ac.aircraftType || ac.icaoType}</div>
          <div style="color:#737373">${ac.operator}</div>
          <div style="color:#525252;margin-top:3px">ALT ${Math.round(ac.altitude * 3.281)}ft | SPD ${Math.round(ac.velocity * 1.944)}kts | HDG ${Math.round(ac.heading)}</div>
        </div>
      `;

      if (existingMarker) {
        existingMarker.setLatLng([ac.lat, ac.lng]);
        existingMarker.setIcon(icon);
        existingMarker.getTooltip()?.setContent(tooltipContent);
      } else {
        const marker = L.marker([ac.lat, ac.lng], {
          icon,
          zIndexOffset: 1000 - ac.priority * 100, // Higher priority = higher z
        })
          .bindTooltip(tooltipContent, {
            direction: "top",
            offset: [0, -14],
            className: "vip-tooltip",
            opacity: 0.95,
          })
          .on("click", () => handleClick(ac));

        layer.addLayer(marker);
        existing.set(ac.icao24, marker);
      }
    }

    // Remove stale markers
    for (const [id, marker] of existing) {
      if (!currentIds.has(id)) {
        layer.removeLayer(marker);
        existing.delete(id);
      }
    }

    return () => {};
  }, [aircraft, map, handleClick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (layerRef.current) {
        layerRef.current.clearLayers();
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      markersRef.current.clear();
    };
  }, [map]);

  return null;
}
