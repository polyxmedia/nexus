"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { OsintEvent, OsintEventType } from "@/lib/warroom/types";

interface OsintMarkersLayerProps {
  events: OsintEvent[];
  onEventClick: (event: OsintEvent) => void;
}

const EVENT_STYLES: Record<OsintEventType, { color: string; label: string }> = {
  battles: { color: "#ef4444", label: "KINETIC" },
  explosions: { color: "#f97316", label: "DETONATION" },
  violence_against_civilians: { color: "#f43f5e", label: "ATROCITY" },
  protests: { color: "#eab308", label: "CIVIL UNREST" },
  riots: { color: "#f59e0b", label: "RIOT" },
  strategic_developments: { color: "#06b6d4", label: "INTEL" },
};

function getMarkerSize(fatalities: number, recent: boolean): number {
  if (fatalities >= 50) return 28;
  if (fatalities >= 10) return 24;
  if (recent) return 22;
  return 20;
}

function isRecent(dateStr: string): boolean {
  const eventDate = new Date(dateStr).getTime();
  return Date.now() - eventDate < 24 * 60 * 60 * 1000;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "< 1h ago";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Icon cache
const osintIconCache = new Map<string, L.DivIcon>();

function getOsintIcon(eventType: OsintEventType, fatalities: number, recent: boolean): L.DivIcon {
  const severe = fatalities >= 10;
  const key = `${eventType}-${severe ? "s" : "n"}-${recent ? "r" : "o"}`;

  let icon = osintIconCache.get(key);
  if (icon) return icon;

  const style = EVENT_STYLES[eventType] || EVENT_STYLES.strategic_developments;
  const size = getMarkerSize(fatalities, recent);
  const half = size / 2;
  const op = recent ? 0.9 : 0.55;
  const glow = severe
    ? `filter:drop-shadow(0 0 4px ${style.color}66);`
    : "";

  // Clean minimal diamond marker
  icon = L.divIcon({
    html: `<svg viewBox="0 0 20 20" width="${size}" height="${size}" style="${glow}"><polygon points="10,2 18,10 10,18 2,10" fill="${style.color}" opacity="${op}"/></svg>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [half, half],
  });

  osintIconCache.set(key, icon);
  return icon;
}

function buildTooltipHtml(event: OsintEvent): string {
  const style = EVENT_STYLES[event.eventType] || EVENT_STYLES.strategic_developments;
  const recent = isRecent(event.date);

  const actorsHtml = event.actors
    ? `<div style="color:#888;font-size:9px;margin-bottom:4px;border-top:1px solid #1f1f1f;padding-top:4px">${event.actors}</div>`
    : "";

  const fatalitiesHtml = event.fatalities > 0
    ? `<div style="display:flex;align-items:center;gap:4px;color:#ef4444;font-weight:600;font-size:9px"><span style="width:4px;height:4px;border-radius:50%;background:#ef4444;display:inline-block"></span>${event.fatalities} confirmed fatalities</div>`
    : "";

  return `<div style="font-family:'IBM Plex Mono',monospace;font-size:10px;line-height:1.6;min-width:160px;max-width:220px"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px"><span style="color:${style.color};font-weight:700;font-size:8px;letter-spacing:0.1em">${style.label}</span><span style="color:${recent ? "#ef4444" : "#555"};font-size:8px;font-weight:500">${formatTimeAgo(event.date)}</span></div><div style="font-weight:600;font-size:11px;color:#e5e5e5;margin-bottom:2px">${event.location}</div><div style="color:#666;font-size:9px;margin-bottom:4px">${event.country}</div>${actorsHtml}${fatalitiesHtml}</div>`;
}

export function OsintMarkersLayer({ events, onEventClick }: OsintMarkersLayerProps) {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);
  const prevKeyRef = useRef("");

  useEffect(() => {
    if (!map) return;

    const dataKey = events.length + ":" + (events[0]?.id ?? "") + (events[events.length - 1]?.id ?? "");
    if (dataKey === prevKeyRef.current && layerRef.current) return;
    prevKeyRef.current = dataKey;

    if (layerRef.current) map.removeLayer(layerRef.current);

    const group = L.layerGroup();

    for (const event of events) {
      const recent = isRecent(event.date);
      const icon = getOsintIcon(event.eventType, event.fatalities, recent);

      const marker = L.marker([event.lat, event.lng], {
        icon,
        zIndexOffset: event.fatalities >= 10 ? 300 : recent ? 200 : 100,
      });

      // Lazy tooltip
      let tooltipBound = false;
      marker.on("mouseover", () => {
        if (!tooltipBound) {
          marker.bindTooltip(buildTooltipHtml(event), {
            direction: "top",
            offset: [0, -12],
            className: "warroom-tooltip",
          });
          tooltipBound = true;
          marker.openTooltip();
        }
      });

      marker.on("click", () => {
        map.flyTo([event.lat, event.lng], Math.max(map.getZoom(), 6), { duration: 0.6 });
        onEventClick(event);
      });

      group.addLayer(marker);
    }

    group.addTo(map);
    layerRef.current = group;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, events, onEventClick]);

  return null;
}
