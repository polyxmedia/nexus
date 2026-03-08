"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { OsintEvent, OsintEventType } from "@/lib/warroom/types";

interface OsintMarkersLayerProps {
  events: OsintEvent[];
  onEventClick: (event: OsintEvent) => void;
}

const EVENT_STYLES: Record<OsintEventType, { color: string; label: string; svgIcon: string }> = {
  battles: {
    color: "#ef4444",
    label: "KINETIC",
    // Crosshair icon
    svgIcon: `<circle cx="10" cy="10" r="3.5" fill="none" stroke="white" stroke-width="1.5"/><line x1="10" y1="3" x2="10" y2="7" stroke="white" stroke-width="1.3"/><line x1="10" y1="13" x2="10" y2="17" stroke="white" stroke-width="1.3"/><line x1="3" y1="10" x2="7" y2="10" stroke="white" stroke-width="1.3"/><line x1="13" y1="10" x2="17" y2="10" stroke="white" stroke-width="1.3"/>`,
  },
  explosions: {
    color: "#f97316",
    label: "DETONATION",
    // Explosion/burst icon
    svgIcon: `<polygon points="10,2 12,7 17,5 14,9 19,10 14,12 17,16 12,13 10,18 8,13 3,16 6,12 1,10 6,9 3,5 8,7" fill="white"/>`,
  },
  violence_against_civilians: {
    color: "#f43f5e",
    label: "ATROCITY",
    // Alert triangle icon
    svgIcon: `<path d="M10 3L18 17H2L10 3Z" fill="none" stroke="white" stroke-width="1.5" stroke-linejoin="round"/><line x1="10" y1="8" x2="10" y2="12" stroke="white" stroke-width="1.5" stroke-linecap="round"/><circle cx="10" cy="14.5" r="0.8" fill="white"/>`,
  },
  protests: {
    color: "#eab308",
    label: "CIVIL UNREST",
    // Raised fist / people icon
    svgIcon: `<circle cx="10" cy="5" r="2.5" fill="white"/><path d="M5 18L7 11H13L15 18" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round"/><line x1="10" y1="8" x2="10" y2="14" stroke="white" stroke-width="1.5"/>`,
  },
  riots: {
    color: "#f59e0b",
    label: "RIOT",
    // Flame icon
    svgIcon: `<path d="M10 2C10 2 5 8 5 12C5 15.3 7.2 18 10 18C12.8 18 15 15.3 15 12C15 8 10 2 10 2Z" fill="white"/><path d="M10 8C10 8 7.5 11 7.5 13C7.5 14.7 8.6 16 10 16C11.4 16 12.5 14.7 12.5 13C12.5 11 10 8 10 8Z" fill="${"#f59e0b"}"/>`,
  },
  strategic_developments: {
    color: "#06b6d4",
    label: "INTEL",
    // Signal/radio icon
    svgIcon: `<circle cx="10" cy="14" r="2" fill="white"/><path d="M6 10C7 8.5 8.4 7.5 10 7.5C11.6 7.5 13 8.5 14 10" fill="none" stroke="white" stroke-width="1.3" stroke-linecap="round"/><path d="M3.5 7C5.5 4.5 7.6 3 10 3C12.4 3 14.5 4.5 16.5 7" fill="none" stroke="white" stroke-width="1.3" stroke-linecap="round"/>`,
  },
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
  const op = recent ? 1 : 0.7;
  const glow = severe
    ? `filter:drop-shadow(0 0 8px ${style.color}99);`
    : recent
    ? `filter:drop-shadow(0 0 4px ${style.color}66);`
    : `filter:drop-shadow(0 0 2px rgba(0,0,0,0.5));`;

  // Map pin with icon inside
  icon = L.divIcon({
    html: `<div style="position:relative;width:${size}px;height:${size + 8}px;${glow}opacity:${op}">
      <svg viewBox="0 0 20 28" width="${size}" height="${size + 8}">
        <path d="M10 27L10 27C10 27 1 16.5 1 10C1 5 5 1 10 1C15 1 19 5 19 10C19 16.5 10 27 10 27Z" fill="${style.color}" stroke="rgba(255,255,255,0.3)" stroke-width="0.8"/>
        <circle cx="10" cy="10" r="7.5" fill="rgba(0,0,0,0.25)"/>
      </svg>
      <svg viewBox="0 0 20 20" width="${size * 0.65}" height="${size * 0.65}" style="position:absolute;top:${size * 0.05}px;left:${size * 0.175}px">
        ${style.svgIcon}
      </svg>
    </div>`,
    className: "",
    iconSize: [size, size + 8],
    iconAnchor: [half, size + 8],
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
