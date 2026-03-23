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

// Clean top-down aircraft silhouette (jet airliner shape, 32x32 viewBox)
// Swept wings, tapered fuselage, tailfin - like FlightRadar24/Palantir style
const PLANE_PATH_CIV = "M16,1 L16,10 L28,18 L28,20 L16,16 L16,25 L20,28 L20,31 L16,29 L14,31 L14,28 L10,25 L10,16 L-2,20 L-2,18 L10,10 L10,1 Q10,-1 13,-1 Q16,-1 16,1 Z";
const PLANE_PATH_MIL = "M16,0 L16,9 L30,17 L30,18.5 L16,14.5 L16,24 L21,27 L21,30 L16,28 L14,30 L14,27 L9,24 L9,14.5 L-5,18.5 L-5,17 L9,9 L9,0 Q9,-2 12.5,-2 Q16,-2 16,0 Z";

function getIcon(heading: number, isMilitary: boolean, altMeters: number): L.DivIcon {
  const hBucket = Math.round(heading / 5) * 5;
  const { opacity } = altBand(altMeters);
  const oBucket = Math.round(opacity * 10); // 4,6,8,10
  const key = `${isMilitary ? 1 : 0}-${hBucket}-${oBucket}`;

  let icon = iconCache.get(key);
  if (icon) return icon;

  const color = isMilitary ? "#f43f5e" : "#06b6d4";
  const glowColor = isMilitary ? "rgba(244,63,94,0.7)" : "rgba(6,182,212,0.5)";
  const size = isMilitary ? 28 : 22;
  const half = size / 2;
  const op = oBucket / 10;
  const path = isMilitary ? PLANE_PATH_MIL : PLANE_PATH_CIV;

  icon = L.divIcon({
    html: `<svg viewBox="-6 -3 38 36" width="${size}" height="${size}" style="transform:rotate(${hBucket}deg);filter:drop-shadow(0 0 3px ${glowColor});cursor:pointer"><path d="${path}" fill="${color}" fill-opacity="${op}" stroke="${color}" stroke-opacity="${op * 0.5}" stroke-width="0.8" stroke-linejoin="round"/></svg>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [half, half],
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

  // ── Viewport-aware density sampling ──
  // Only render aircraft in viewport. Military always shown. Civilians sampled by zoom.

  function sampleForViewport(all: AircraftState[], zoom: number, bounds: L.LatLngBounds): AircraftState[] {
    // Filter to viewport first (with padding for aircraft near edges)
    const padded = bounds.pad(0.15);
    const inView = all.filter((a) => padded.contains([a.lat, a.lng]));

    const military = inView.filter((a) => a.isMilitary);
    const civilian = inView.filter((a) => !a.isMilitary);

    // Progressive reveal
    let fraction: number;
    if (zoom >= 7) fraction = 1;
    else if (zoom >= 6) fraction = 0.5;
    else if (zoom >= 5) fraction = 0.3;
    else if (zoom >= 4) fraction = 0.15;
    else fraction = 0.08;

    if (fraction >= 1) return inView;

    const count = Math.max(15, Math.ceil(civilian.length * fraction));

    const sampled = civilian
      .sort((a, b) => (b.altitude + b.velocity * 10) - (a.altitude + a.velocity * 10))
      .slice(0, count);

    return [...military, ...sampled];
  }

  // Build markers for current viewport
  const buildMarkers = useCallback((acList: AircraftState[], zoom: number) => {
    if (!map) return;

    // Tear down previous
    if (clusterRef.current) map.removeLayer(clusterRef.current);
    if (pathRef.current) map.removeLayer(pathRef.current);

    const bounds = map.getBounds();
    const visible = sampleForViewport(acList, zoom, bounds);

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

    rebuildPaths(visible, zoom);
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

  // Rebuild on zoom/pan - debounced to prevent lag
  useEffect(() => {
    if (!map || aircraft.length === 0) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const rebuild = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const z = map.getZoom();
        zoomRef.current = z;
        prevDataRef.current = "";
        buildMarkers(aircraft, z);
      }, 150);
    };

    map.on("zoomend", rebuild);
    map.on("moveend", rebuild);

    return () => {
      map.off("zoomend", rebuild);
      map.off("moveend", rebuild);
      if (timer) clearTimeout(timer);
    };
  }, [map, aircraft, buildMarkers]);

  return null;
}
