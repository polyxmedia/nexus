"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import type { VesselState, VesselType } from "@/lib/warroom/types";

interface VesselLayerProps {
  vessels: VesselState[];
  onVesselClick?: (vessel: VesselState) => void;
}

// ── Projection ──

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

function project(
  lat: number,
  lng: number,
  bearingDeg: number,
  distKm: number
): [number, number] {
  const d = distKm / 6371;
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

// ── Vessel palette ──

const PALETTE: Record<VesselType, { fill: string; stroke: string; label: string }> = {
  military: { fill: "#ef4444", stroke: "#fca5a5", label: "MILITARY" },
  tanker: { fill: "#f59e0b", stroke: "#fcd34d", label: "TANKER" },
  cargo: { fill: "#06b6d4", stroke: "#67e8f9", label: "CARGO" },
  passenger: { fill: "#22c55e", stroke: "#86efac", label: "PASSENGER" },
  fishing: { fill: "#94a3b8", stroke: "#cbd5e1", label: "FISHING" },
  other: { fill: "#64748b", stroke: "#94a3b8", label: "VESSEL" },
};

// ── Vessel silhouettes (distinct profiles per type, like Monopoly pieces) ──

const SILHOUETTES: Record<VesselType, { path: string; vbox: string; size: number }> = {
  // Warship: destroyer profile with superstructure, radar mast, gun turret
  military: {
    path: `<path d="M16 2L18 5L19 8L18.5 9L19 10L18 11L17 10.5L17 13L18 14L18 17L16 19L4 19L2 17L2 14L3 13L3 10.5L2 11L1 10L1.5 9L1 8L2 5L4 2Z" /><rect x="6" y="5" width="8" height="3" rx="0.5" opacity="0.5"/><rect x="8" y="3" width="4" height="3" rx="0.3" opacity="0.4"/><line x1="10" y1="1" x2="10" y2="4" stroke-width="0.8" opacity="0.6"/>`,
    vbox: "0 0 20 20",
    size: 16,
  },
  // Tanker: wide bulky hull, low profile, pipe structures on deck
  tanker: {
    path: `<path d="M10 1L14 4L15 7L15 15L14 18L10 20L6 18L5 15L5 7L6 4Z" /><rect x="7" y="5" width="6" height="2" rx="0.5" opacity="0.35"/><rect x="7" y="8" width="6" height="2" rx="0.5" opacity="0.35"/><rect x="7" y="11" width="6" height="2" rx="0.5" opacity="0.35"/><circle cx="10" cy="15.5" r="1.5" opacity="0.4"/>`,
    vbox: "0 0 20 21",
    size: 13,
  },
  // Cargo: container ship with stacked containers, bridge at stern
  cargo: {
    path: `<path d="M10 1L14 4L15 8L15 16L13 19L7 19L5 16L5 8L6 4Z" /><rect x="7" y="4" width="6" height="3" rx="0.3" opacity="0.4"/><rect x="7.5" y="8" width="2.2" height="2" opacity="0.3"/><rect x="10.3" y="8" width="2.2" height="2" opacity="0.3"/><rect x="7.5" y="10.5" width="2.2" height="2" opacity="0.25"/><rect x="10.3" y="10.5" width="2.2" height="2" opacity="0.25"/><rect x="8" y="14" width="4" height="3" rx="0.5" opacity="0.45"/>`,
    vbox: "0 0 20 20",
    size: 12,
  },
  // Passenger: cruise ship with multiple decks, funnel
  passenger: {
    path: `<path d="M10 1L13 3L14 6L14 16L12 19L8 19L6 16L6 6L7 3Z" /><rect x="7.5" y="4" width="5" height="2" rx="0.8" opacity="0.35"/><rect x="7.5" y="7" width="5" height="2" rx="0.8" opacity="0.35"/><rect x="7.5" y="10" width="5" height="2" rx="0.8" opacity="0.35"/><path d="M9 2L9 4L11 4L11 2" opacity="0.5"/><circle cx="10" cy="15" r="1" opacity="0.3"/>`,
    vbox: "0 0 20 20",
    size: 12,
  },
  // Fishing: small trawler with boom/crane arms
  fishing: {
    path: `<path d="M10 3L13 6L13 14L12 17L8 17L7 14L7 6Z" /><line x1="10" y1="2" x2="10" y2="6" stroke-width="0.8" opacity="0.6"/><line x1="10" y1="4" x2="5" y2="8" stroke-width="0.6" opacity="0.4"/><line x1="10" y1="4" x2="15" y2="8" stroke-width="0.6" opacity="0.4"/><rect x="8.5" y="8" width="3" height="2" rx="0.3" opacity="0.35"/>`,
    vbox: "0 0 20 18",
    size: 10,
  },
  // Other: simple generic vessel
  other: {
    path: `<path d="M10 2L13 5L13 14L11 17L9 17L7 14L7 5Z" /><rect x="8.5" y="5" width="3" height="2" rx="0.5" opacity="0.35"/>`,
    vbox: "0 0 20 18",
    size: 10,
  },
};

// ── Icon cache (course bucketed to 10-deg, 36 × 6 types × 2 moving states = 432 max) ──

const iconCache = new Map<string, L.DivIcon>();

function getIcon(course: number, vesselType: VesselType, speed: number): L.DivIcon {
  const cBucket = Math.round(course / 10) * 10;
  const moving = speed > 0.5 ? 1 : 0;
  const key = `${vesselType}-${cBucket}-${moving}`;

  let icon = iconCache.get(key);
  if (icon) return icon;

  const { fill, stroke } = PALETTE[vesselType];
  const sil = SILHOUETTES[vesselType];
  const size = sil.size;
  const half = size / 2;
  const isMil = vesselType === "military";
  const glow = isMil ? "filter:drop-shadow(0 0 5px rgba(239,68,68,0.6));" : "";
  const op = moving ? 1 : 0.4;

  icon = L.divIcon({
    html: `<svg viewBox="${sil.vbox}" width="${size}" height="${size}" style="transform:rotate(${cBucket}deg);${glow}" fill="${fill}" stroke="${stroke}" stroke-width="0.5" opacity="${op}">${sil.path}</svg>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [half, half],
  });

  iconCache.set(key, icon);
  return icon;
}

// ── Cluster icon ──

function clusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const count = cluster.getChildCount();
  const markers = cluster.getAllChildMarkers();
  let milCount = 0;
  for (let i = 0; i < markers.length; i++) {
    if ((markers[i].options as { vesselType?: VesselType }).vesselType === "military") milCount++;
  }
  const hasMil = milCount > 0;

  const bg = hasMil ? "rgba(239,68,68,0.12)" : "rgba(6,182,212,0.08)";
  const border = hasMil ? "rgba(239,68,68,0.4)" : "rgba(6,182,212,0.3)";
  const textColor = hasMil ? "#ef4444" : "#06b6d4";
  const size = count > 100 ? 34 : count > 20 ? 30 : 26;
  const glow = hasMil ? "box-shadow:0 0 6px rgba(239,68,68,0.2);" : "";
  const milLabel = milCount > 0
    ? `<div style="font-size:7px;color:#ef4444;margin-top:1px">${milCount} MIL</div>`
    : "";

  return L.divIcon({
    html: `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:1px solid ${border};${glow}font-family:'IBM Plex Mono',monospace;font-size:9px;color:${textColor};font-weight:600">${count > 999 ? Math.round(count / 1000) + "k" : count}${milLabel}</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// ── Tooltip (lazy) ──

function buildTooltip(v: VesselState): string {
  const p = PALETTE[v.vesselType];
  const mil = v.vesselType === "military"
    ? '<div style="color:#ef4444;font-weight:700;font-size:9px;letter-spacing:.05em;margin-bottom:2px">MILITARY</div>'
    : "";
  const dest = v.destination ? `<div style="margin-top:4px;color:#888;font-size:9px">&rarr; ${v.destination}</div>` : "";
  return `<div style="font-family:'IBM Plex Mono',monospace;font-size:10px;line-height:1.5;min-width:140px">${mil}<div style="font-weight:700;font-size:11px;margin-bottom:3px;color:#e5e5e5">${v.name || v.mmsi}</div><div style="display:flex;gap:6px;margin-bottom:4px"><span style="color:${p.fill};font-size:9px;font-weight:600">${p.label}</span>${v.flag ? `<span style="color:#666;font-size:9px">${v.flag}</span>` : ""}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;color:#aaa;font-size:9px"><span style="color:#666">SPD</span><span>${v.speed.toFixed(1)} kts</span><span style="color:#666">CRS</span><span>${Math.round(v.course)}&deg;</span></div>${dest}</div>`;
}

// ── Component ──

export function VesselLayer({ vessels, onVesselClick }: VesselLayerProps) {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const pathRef = useRef<L.LayerGroup | null>(null);
  const prevKeyRef = useRef("");

  const rebuildPaths = useCallback(
    (vList: VesselState[], zoom: number) => {
      if (!map) return;
      if (pathRef.current) map.removeLayer(pathRef.current);

      if (zoom < 4) {
        pathRef.current = null;
        return;
      }

      const group = L.layerGroup();
      const bounds = map.getBounds().pad(0.3);

      for (const v of vList) {
        if (v.speed < 0.5) continue;
        if (!v.vesselType || (v.vesselType !== "military" && zoom < 6)) continue;
        if (!bounds.contains([v.lat, v.lng])) continue;

        const color = PALETTE[v.vesselType].fill;
        const isMil = v.vesselType === "military";
        const wakeLenKm = Math.max(2, Math.min(40, v.speed * 1.852 * (5 / 60)));

        // Wake behind
        const wake = project(v.lat, v.lng, (v.course + 180) % 360, wakeLenKm);
        group.addLayer(
          L.polyline([wake, [v.lat, v.lng]], {
            color,
            weight: isMil ? 1 : 0.6,
            opacity: 0.18,
            interactive: false,
          })
        );

        // Forward projected course
        const fwdKm = Math.max(4, Math.min(60, v.speed * 1.852 * (8 / 60)));
        const fwd = project(v.lat, v.lng, v.course, fwdKm);
        group.addLayer(
          L.polyline([[v.lat, v.lng], fwd], {
            color,
            weight: isMil ? 1 : 0.6,
            opacity: 0.22,
            dashArray: "4 8",
            interactive: false,
          })
        );
      }

      group.addTo(map);
      pathRef.current = group;
    },
    [map]
  );

  useEffect(() => {
    if (!map) return;

    const dataKey =
      vessels.length +
      ":" +
      (vessels[0]?.mmsi ?? "") +
      (vessels[vessels.length - 1]?.mmsi ?? "");
    if (dataKey === prevKeyRef.current && clusterRef.current) {
      rebuildPaths(vessels, map.getZoom());
      return;
    }
    prevKeyRef.current = dataKey;

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

    const markers: L.Marker[] = new Array(vessels.length);

    for (let i = 0; i < vessels.length; i++) {
      const v = vessels[i];
      const marker = L.marker([v.lat, v.lng], {
        icon: getIcon(v.course, v.vesselType, v.speed),
        vesselType: v.vesselType,
        zIndexOffset: v.vesselType === "military" ? 400 : 0,
      } as L.MarkerOptions & { vesselType: VesselType });

      let tooltipBound = false;
      marker.on("mouseover", () => {
        if (!tooltipBound) {
          marker.bindTooltip(buildTooltip(v), {
            direction: "top",
            offset: [0, -8],
            className: "warroom-tooltip",
          });
          tooltipBound = true;
          marker.openTooltip();
        }
      });

      marker.on("click", () => {
        onVesselClick?.(v);
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

    rebuildPaths(vessels, map.getZoom());

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
  }, [map, vessels, rebuildPaths]);

  useEffect(() => {
    if (!map) return;
    const onViewChange = () => rebuildPaths(vessels, map.getZoom());
    map.on("zoomend", onViewChange);
    map.on("moveend", onViewChange);
    return () => {
      map.off("zoomend", onViewChange);
      map.off("moveend", onViewChange);
    };
  }, [map, vessels, rebuildPaths]);

  return null;
}
