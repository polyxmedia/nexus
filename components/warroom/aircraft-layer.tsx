"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { AircraftState } from "@/lib/warroom/types";
import { decodeCallsign } from "@/lib/warroom/callsign-decode";

interface AircraftLayerProps {
  aircraft: AircraftState[];
  onAircraftClick?: (aircraft: AircraftState) => void;
}

// ── Projection (single point, minimal trig) ──

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const R_KM = 6371;

function project(
  lat: number,
  lng: number,
  bearingDeg: number,
  distKm: number
): [number, number] {
  const d = distKm / R_KM;
  const brng = bearingDeg * DEG2RAD;
  const lat1 = lat * DEG2RAD;
  const cosD = Math.cos(d);
  const sinD = Math.sin(d);
  const sinLat1 = Math.sin(lat1);
  const cosLat1 = Math.cos(lat1);

  const lat2 = Math.asin(sinLat1 * cosD + cosLat1 * sinD * Math.cos(brng));
  const lng2 =
    lng * DEG2RAD +
    Math.atan2(Math.sin(brng) * sinD * cosLat1, cosD - sinLat1 * Math.sin(lat2));

  return [lat2 * RAD2DEG, lng2 * RAD2DEG];
}

// ── Altitude bands ──

function altBand(m: number): { label: string; opacity: number } {
  if (m < 300) return { label: "GND", opacity: 0.4 };
  if (m < 3000) return { label: "LOW", opacity: 0.6 };
  if (m < 10000) return { label: "MID", opacity: 0.8 };
  return { label: "HIGH", opacity: 1.0 };
}

// ── Icon cache (bucket heading to 5-deg steps → max 72 × 2 × 4 = 576 entries) ──

const iconCache = new Map<string, L.DivIcon>();

// Plane silhouette SVG path (top-down view, pointing up in a 24x24 viewBox)
const PLANE_PATH = "M12,2 L12,8 L4,14 L4,16 L12,13 L12,18 L9,20 L9,22 L12,21 L15,22 L15,20 L12,18 L12,13 L20,16 L20,14 L12,8 Z";

function getIcon(heading: number, isMilitary: boolean, altMeters: number): L.DivIcon {
  const hBucket = Math.round(heading / 5) * 5;
  const { opacity } = altBand(altMeters);
  const oBucket = Math.round(opacity * 10); // 4,6,8,10
  const key = `${isMilitary ? 1 : 0}-${hBucket}-${oBucket}`;

  let icon = iconCache.get(key);
  if (icon) return icon;

  const color = isMilitary ? "#f43f5e" : "#94a3b8";
  const glow = isMilitary
    ? "filter:drop-shadow(0 0 5px rgba(244,63,94,0.6));"
    : "filter:drop-shadow(0 0 2px rgba(148,163,184,0.4));";
  const size = isMilitary ? 38 : 32;
  const half = size / 2;
  const op = oBucket / 10;

  icon = L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;cursor:pointer;padding:2px"><svg viewBox="0 0 24 24" width="${size}" height="${size}" style="transform:rotate(${hBucket}deg);${glow}"><path d="${PLANE_PATH}" fill="${color}" opacity="${op}" stroke="${isMilitary ? "rgba(244,63,94,0.4)" : "rgba(148,163,184,0.3)"}" stroke-width="0.5"/></svg></div>`,
    className: "",
    iconSize: [size + 4, size + 4],
    iconAnchor: [half + 2, half + 2],
  });

  iconCache.set(key, icon);
  return icon;
}

// ── Tooltip (built lazily on first hover) ──

function buildTooltipHtml(ac: AircraftState): string {
  const altFt = Math.round(ac.altitude * 3.281);
  const speedKts = Math.round(ac.velocity * 1.944);
  const { label } = altBand(ac.altitude);
  const decoded = ac.isMilitary ? decodeCallsign(ac.callsign) : null;

  const milBadge = ac.isMilitary
    ? '<div style="color:#f43f5e;font-weight:700;font-size:9px;letter-spacing:.05em;margin-bottom:2px">MILITARY</div>'
    : "";
  const unitLine = decoded
    ? `<div style="color:#f59e0b;font-size:9px;margin-bottom:1px">${decoded.unit}</div>`
    : "";
  const platformLine = decoded?.platform
    ? `<div style="color:#06b6d4;font-size:9px;font-weight:600;margin-bottom:3px">${decoded.platform}</div>`
    : "";
  const icaoLine = ac.callsign && ac.callsign !== ac.icao24
    ? `<span style="color:#555;font-size:8px;margin-left:4px">${ac.icao24}</span>`
    : "";

  return `<div style="font-family:'IBM Plex Mono',monospace;font-size:10px;line-height:1.5;min-width:150px">${milBadge}<div style="font-weight:700;font-size:11px;margin-bottom:2px;color:#e5e5e5">${ac.callsign || ac.icao24}${icaoLine}</div>${unitLine}${platformLine}<div style="color:#888;font-size:9px;margin-bottom:4px">${ac.originCountry}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;color:#aaa;font-size:9px"><span style="color:#666">ALT</span><span>${altFt.toLocaleString()} ft <span style="color:#555">${label}</span></span><span style="color:#666">SPD</span><span>${speedKts} kts</span><span style="color:#666">HDG</span><span>${Math.round(ac.heading)}&deg;</span></div></div>`;
}

// ── Component ──

export function AircraftLayer({ aircraft, onAircraftClick }: AircraftLayerProps) {
  const map = useMap();
  const clusterRef = useRef<L.LayerGroup | null>(null);
  const pathRef = useRef<L.LayerGroup | null>(null);
  const prevDataRef = useRef<string>("");

  // Listen for zoom changes to toggle path visibility
  const zoomRef = useRef(map?.getZoom() ?? 3);
  const pathVisibleRef = useRef(false);

  const rebuildPaths = useCallback(
    (acList: AircraftState[], zoom: number) => {
      if (!map) return;
      if (pathRef.current) map.removeLayer(pathRef.current);

      // Only draw paths when zoomed in enough to see them
      if (zoom < 4) {
        pathRef.current = null;
        pathVisibleRef.current = false;
        return;
      }

      const group = L.layerGroup();
      const bounds = map.getBounds().pad(0.3); // viewport + 30% padding

      for (const ac of acList) {
        // Only draw paths for military or when zoomed in close
        if (!ac.isMilitary && zoom < 6) continue;
        if (ac.onGround) continue;

        const speedKmH = ac.velocity * 3.6;
        if (speedKmH < 50) continue;

        // Skip aircraft outside viewport
        if (!bounds.contains([ac.lat, ac.lng])) continue;

        const pathKm = Math.max(8, Math.min(150, speedKmH * (2 / 60)));
        const color = ac.isMilitary ? "#f43f5e" : "#555";

        // Single forward line (2 points, not 4)
        const fwd = project(ac.lat, ac.lng, ac.heading, pathKm);
        group.addLayer(
          L.polyline([[ac.lat, ac.lng], fwd], {
            color,
            weight: ac.isMilitary ? 1.2 : 0.7,
            opacity: 0.3,
            dashArray: "3 6",
            interactive: false,
          })
        );

        // Single trail line behind
        const trail = project(ac.lat, ac.lng, (ac.heading + 180) % 360, pathKm * 0.35);
        group.addLayer(
          L.polyline([trail, [ac.lat, ac.lng]], {
            color,
            weight: ac.isMilitary ? 0.9 : 0.5,
            opacity: 0.18,
            interactive: false,
          })
        );
      }

      group.addTo(map);
      pathRef.current = group;
      pathVisibleRef.current = true;
    },
    [map]
  );

  // ── Density sampling: show more aircraft as you zoom in ──
  // Military always visible. Civilians sampled by zoom level.
  // Uses a stable hash so the same aircraft stay visible as you pan.

  function sampleForZoom(all: AircraftState[], zoom: number): AircraftState[] {
    // Military always shown
    const military = all.filter((a) => a.isMilitary);
    const civilian = all.filter((a) => !a.isMilitary);

    // Progressive reveal: zoom 2-3 = ~8%, zoom 4 = ~15%, zoom 5 = ~30%, zoom 6 = ~50%, zoom 7+ = 100%
    let fraction: number;
    if (zoom >= 7) fraction = 1;
    else if (zoom >= 6) fraction = 0.5;
    else if (zoom >= 5) fraction = 0.3;
    else if (zoom >= 4) fraction = 0.15;
    else fraction = 0.08;

    if (fraction >= 1) return all;

    const count = Math.max(15, Math.ceil(civilian.length * fraction));

    // Sort by engagement-proxy (higher altitude + speed = more interesting) for stable sampling
    // Use icao24 hash for spatial stability so icons don't jump on pan
    const sampled = civilian
      .sort((a, b) => {
        // Prioritise high-altitude, fast-moving aircraft (more visible/interesting)
        const scoreA = a.altitude + a.velocity * 10;
        const scoreB = b.altitude + b.velocity * 10;
        return scoreB - scoreA;
      })
      .slice(0, count);

    return [...military, ...sampled];
  }

  // Build markers for current zoom level
  const buildMarkers = useCallback((acList: AircraftState[], zoom: number) => {
    if (!map) return;

    // Tear down previous
    if (clusterRef.current) map.removeLayer(clusterRef.current);
    if (pathRef.current) map.removeLayer(pathRef.current);

    const visible = sampleForZoom(acList, zoom);

    const group = L.layerGroup();

    for (const ac of visible) {
      const marker = L.marker([ac.lat, ac.lng], {
        icon: getIcon(ac.heading, ac.isMilitary, ac.altitude),
        zIndexOffset: ac.isMilitary ? 500 : 0,
      });

      // Lazy tooltip
      let tooltipBound = false;
      marker.on("mouseover", () => {
        if (!tooltipBound) {
          marker.bindTooltip(buildTooltipHtml(ac), {
            direction: "top",
            offset: [0, -12],
            className: "warroom-tooltip",
          });
          tooltipBound = true;
          marker.openTooltip();
        }
      });

      marker.on("click", () => {
        map.flyTo([ac.lat, ac.lng], Math.max(map.getZoom(), 8), { duration: 0.6 });
        onAircraftClick?.(ac);
      });

      group.addLayer(marker);
    }

    group.addTo(map);
    clusterRef.current = group;

    rebuildPaths(acList, zoom);
  }, [map, onAircraftClick, rebuildPaths]);

  // Rebuild when data changes
  useEffect(() => {
    if (!map || aircraft.length === 0) return;

    const dataKey =
      aircraft.length +
      ":" +
      (aircraft[0]?.icao24 ?? "") +
      (aircraft[aircraft.length - 1]?.icao24 ?? "");
    if (dataKey === prevDataRef.current && clusterRef.current) {
      return;
    }
    prevDataRef.current = dataKey;

    buildMarkers(aircraft, map.getZoom());

    return () => {
      if (clusterRef.current) {
        map.removeLayer(clusterRef.current);
        clusterRef.current = null;
      }
      if (pathRef.current) {
        map.removeLayer(pathRef.current);
        pathRef.current = null;
      }
    };
  }, [map, aircraft, buildMarkers]);

  // Rebuild on zoom/pan (re-sample density + paths)
  useEffect(() => {
    if (!map || aircraft.length === 0) return;

    const onZoomEnd = () => {
      const z = map.getZoom();
      if (z !== zoomRef.current) {
        zoomRef.current = z;
        prevDataRef.current = ""; // force rebuild with new sample
        buildMarkers(aircraft, z);
      }
    };

    const onMoveEnd = () => {
      rebuildPaths(aircraft, map.getZoom());
    };

    map.on("zoomend", onZoomEnd);
    map.on("moveend", onMoveEnd);

    return () => {
      map.off("zoomend", onZoomEnd);
      map.off("moveend", onMoveEnd);
    };
  }, [map, aircraft, buildMarkers, rebuildPaths]);

  return null;
}
