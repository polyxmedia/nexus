"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
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
    : "";
  const size = isMilitary ? 30 : 24;
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

// ── Cluster icon ──

function clusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const count = cluster.getChildCount();
  const markers = cluster.getAllChildMarkers();
  let hasMil = false;
  let milCount = 0;
  for (let i = 0; i < markers.length; i++) {
    if ((markers[i].options as { isMilitary?: boolean }).isMilitary) {
      hasMil = true;
      milCount++;
    }
  }

  const bg = hasMil ? "rgba(244,63,94,0.15)" : "rgba(168,168,168,0.1)";
  const border = hasMil ? "rgba(244,63,94,0.45)" : "rgba(168,168,168,0.25)";
  const textColor = hasMil ? "#f43f5e" : "#8a8a8a";
  const size = count > 100 ? 34 : count > 20 ? 30 : 26;
  const glow = hasMil ? "box-shadow:0 0 6px rgba(244,63,94,0.25);" : "";
  const milLabel = milCount > 0
    ? `<div style="font-size:7px;color:#f43f5e;margin-top:1px">${milCount} MIL</div>`
    : "";

  return L.divIcon({
    html: `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:1px solid ${border};${glow}font-family:'IBM Plex Mono',monospace;font-size:9px;color:${textColor};font-weight:600">${count > 999 ? Math.round(count / 1000) + "k" : count}${milLabel}</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
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
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
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

  // Rebuild markers when data changes
  useEffect(() => {
    if (!map) return;

    // Quick identity check to avoid unnecessary rebuilds
    const dataKey =
      aircraft.length +
      ":" +
      (aircraft[0]?.icao24 ?? "") +
      (aircraft[aircraft.length - 1]?.icao24 ?? "");
    if (dataKey === prevDataRef.current && clusterRef.current) {
      // Data hasn't actually changed, just rebuild paths for viewport
      rebuildPaths(aircraft, map.getZoom());
      return;
    }
    prevDataRef.current = dataKey;

    // Tear down previous
    if (clusterRef.current) map.removeLayer(clusterRef.current);
    if (pathRef.current) map.removeLayer(pathRef.current);

    const cluster = L.markerClusterGroup({
      maxClusterRadius: 55,
      disableClusteringAtZoom: 7,
      spiderfyOnMaxZoom: false,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: false,
      iconCreateFunction: clusterIcon,
      animate: false,
      chunkedLoading: true,
      chunkInterval: 100,
      chunkDelay: 10,
      removeOutsideVisibleBounds: true,
    });

    const markers: L.Marker[] = new Array(aircraft.length);

    for (let i = 0; i < aircraft.length; i++) {
      const ac = aircraft[i];
      const marker = L.marker([ac.lat, ac.lng], {
        icon: getIcon(ac.heading, ac.isMilitary, ac.altitude),
        isMilitary: ac.isMilitary,
        zIndexOffset: ac.isMilitary ? 500 : 0,
      } as L.MarkerOptions & { isMilitary: boolean });

      // Lazy tooltip: bind HTML only on first mouseover
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

      // Click to zoom and open detail modal
      marker.on("click", () => {
        map.flyTo([ac.lat, ac.lng], Math.max(map.getZoom(), 6), { duration: 0.6 });
        onAircraftClick?.(ac);
      });

      markers[i] = marker;
    }

    // Save current view to prevent zoom change when adding global markers
    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();

    cluster.addLayers(markers);
    map.addLayer(cluster);
    clusterRef.current = cluster;

    // Restore view if it changed
    map.setView(currentCenter, currentZoom, { animate: false });

    // Build paths for current zoom
    rebuildPaths(aircraft, map.getZoom());

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
  }, [map, aircraft, rebuildPaths]);

  // Rebuild paths on zoom change (cheap, only visible viewport)
  useEffect(() => {
    if (!map) return;

    const onZoom = () => {
      const z = map.getZoom();
      const wasVisible = pathVisibleRef.current;
      const shouldShow = z >= 4;

      // Only rebuild if visibility threshold crossed or we're zoomed in
      if (wasVisible !== shouldShow || shouldShow) {
        zoomRef.current = z;
        rebuildPaths(aircraft, z);
      }
    };

    map.on("zoomend", onZoom);
    map.on("moveend", onZoom);

    return () => {
      map.off("zoomend", onZoom);
      map.off("moveend", onZoom);
    };
  }, [map, aircraft, rebuildPaths]);

  return null;
}
