"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

import { useEffect } from "react";
import {
  MapContainer,
  CircleMarker,
  Circle,
  Polyline,
  Tooltip,
  Marker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { ActorWithGeo, ScenarioWithAnalysis, AircraftState, VesselState, VipAircraftState, OsintEvent, WarRoomLayerVisibility } from "@/lib/warroom/types";
import type { AllianceLink, ConflictZone, StrategicLocation } from "@/lib/warroom/geo-constants";
import { ACTOR_COORDS } from "@/lib/warroom/geo-constants";
import { AircraftLayer } from "./aircraft-layer";
import { VesselLayer } from "./vessel-layer";
import { OsintMarkersLayer } from "./osint-markers-layer";
import { ConflictHeatmapLayer } from "./conflict-heatmap-layer";
import { MapTileUpdater } from "./map-tile-updater";
import { CountryClickLayer } from "./country-click-layer";
import { VesselTrailLayer } from "./vessel-trail-layer";
import { VipAircraftLayer } from "./vip-aircraft-layer";
import type { VesselTrailPoint } from "@/lib/warroom/use-vessel-tracker";

interface WarRoomMapProps {
  actors: ActorWithGeo[];
  conflictZones: ConflictZone[];
  allianceLinks: AllianceLink[];
  strategicLocations: StrategicLocation[];
  scenarios: ScenarioWithAnalysis[];
  selectedActorId: string | null;
  hoveredActorId: string | null;
  selectedScenarioId: string | null;
  onActorClick: (id: string) => void;
  onActorHover: (id: string | null) => void;
  onConflictZoneClick: (scenarioId: string) => void;
  aircraft: AircraftState[];
  vessels: VesselState[];
  osintEvents: OsintEvent[];
  layerVisibility: WarRoomLayerVisibility;
  tileUrl: string;
  tileAttribution: string;
  onOsintEventClick: (event: OsintEvent) => void;
  onAircraftClick?: (aircraft: AircraftState) => void;
  onVesselClick?: (vessel: VesselState) => void;
  onCountryClick?: (code: string) => void;
  onChokepointClick?: (id: string) => void;
  vesselTrails?: Map<string, VesselTrailPoint[]>;
  vipAircraft?: VipAircraftState[];
  onVipAircraftClick?: (aircraft: VipAircraftState) => void;
}

const ESCALATION_COLORS: Record<number, string> = {
  1: "#3b82f6",
  2: "#22c55e",
  3: "#eab308",
  4: "#f97316",
  5: "#ef4444",
};

const ESCALATION_FILL: Record<number, string> = {
  1: "#3b82f620",
  2: "#22c55e15",
  3: "#eab30818",
  4: "#f9731620",
  5: "#ef444425",
};

function strategicIcon(type: string) {
  const isChokepoint = type === "chokepoint";

  if (isChokepoint) {
    // Anchor-style icon with pulsing ring for chokepoints
    const size = 22;
    const svg = `<svg viewBox="0 0 22 22" width="${size}" height="${size}">
      <circle cx="11" cy="11" r="10" fill="none" stroke="#f59e0b" stroke-width="1" opacity="0.3">
        <animate attributeName="r" values="7;10;7" dur="3s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.4;0.1;0.4" dur="3s" repeatCount="indefinite"/>
      </circle>
      <circle cx="11" cy="11" r="5" fill="#f59e0b" opacity="0.15"/>
      <circle cx="11" cy="11" r="2" fill="#f59e0b" opacity="0.9"/>
      <line x1="11" y1="5" x2="11" y2="3" stroke="#f59e0b" stroke-width="1.2" opacity="0.7"/>
      <line x1="11" y1="17" x2="11" y2="19" stroke="#f59e0b" stroke-width="1.2" opacity="0.7"/>
      <line x1="5" y1="11" x2="3" y2="11" stroke="#f59e0b" stroke-width="1.2" opacity="0.7"/>
      <line x1="17" y1="11" x2="19" y2="11" stroke="#f59e0b" stroke-width="1.2" opacity="0.7"/>
    </svg>`;
    return L.divIcon({
      html: svg,
      className: "chokepoint-marker",
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }

  // Institutions: small square
  const size = 14;
  const svg = `<svg viewBox="0 0 14 14" width="${size}" height="${size}"><rect x="3" y="3" width="8" height="8" fill="#94a3b8" opacity="0.5"/></svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function FlyToZone({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.panTo(center, { animate: true, duration: 0.8 });
  }, [map, center]);
  return null;
}

export default function WarRoomMap({
  actors,
  conflictZones,
  allianceLinks,
  strategicLocations,
  scenarios,
  selectedActorId,
  hoveredActorId,
  selectedScenarioId,
  onActorClick,
  onActorHover,
  onConflictZoneClick,
  aircraft,
  vessels,
  osintEvents,
  layerVisibility,
  tileUrl,
  tileAttribution,
  onOsintEventClick,
  onAircraftClick,
  onVesselClick,
  onCountryClick,
  onChokepointClick,
  vesselTrails,
  vipAircraft,
  onVipAircraftClick,
}: WarRoomMapProps) {
  const activeActorId = hoveredActorId || selectedActorId;

  const visibleLinks = activeActorId
    ? allianceLinks.filter(
        (l) => l.from === activeActorId || l.to === activeActorId
      )
    : [];

  const selectedZone = selectedScenarioId
    ? conflictZones.find((z) => z.scenarioId === selectedScenarioId)
    : null;

  return (
    <MapContainer
      center={[25, 45]}
      zoom={3}
      minZoom={2}
      maxZoom={8}
      className="h-full w-full"
      zoomControl={true}
      attributionControl={false}
      style={{ background: "var(--color-navy-950)" }}
    >
      <MapTileUpdater tileUrl={tileUrl} attribution={tileAttribution} />

      {/* Country click detection */}
      {onCountryClick && <CountryClickLayer onCountryClick={onCountryClick} />}

      {selectedZone && (
        <FlyToZone
          center={[selectedZone.center.lat, selectedZone.center.lng]}
        />
      )}

      {/* Conflict Heatmap Layer (below markers) */}
      {layerVisibility.conflictHeatmap && osintEvents.length > 0 && (
        <ConflictHeatmapLayer events={osintEvents} />
      )}

      {/* Conflict Zones - outer ring + fill */}
      {conflictZones.map((zone) => {
        const color = ESCALATION_COLORS[zone.escalationLevel] || "#3b82f6";
        const isSelected = selectedScenarioId === zone.scenarioId;
        const isHot = zone.escalationLevel >= 4;
        return (
          <span key={zone.id}>
            {/* Outer threat radius - dashed perimeter */}
            <Circle
              center={[zone.center.lat, zone.center.lng]}
              radius={zone.radiusKm * 1000}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: isSelected ? 0.12 : 0.04,
                weight: isSelected ? 1.5 : 0.8,
                dashArray: "8 6",
                opacity: isSelected ? 0.8 : 0.4,
                className: isHot ? "warroom-zone-pulse" : "",
              }}
              eventHandlers={{
                click: () => onConflictZoneClick(zone.scenarioId),
              }}
            >
              <Tooltip
                direction="top"
                className="warroom-tooltip"
                permanent={false}
              >
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                    <span style={{ color, fontWeight: 700, fontSize: "9px", letterSpacing: "0.08em" }}>
                      THREAT LVL {zone.escalationLevel}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, color: "#e5e5e5" }}>{zone.name}</div>
                </div>
              </Tooltip>
            </Circle>

            {/* Inner core zone - solid, tighter */}
            <Circle
              center={[zone.center.lat, zone.center.lng]}
              radius={zone.radiusKm * 400}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: isSelected ? 0.18 : 0.08,
                weight: 0.5,
                opacity: 0.5,
              }}
              interactive={false}
            />

            {/* Center point marker */}
            <CircleMarker
              center={[zone.center.lat, zone.center.lng]}
              radius={isSelected ? 4 : 3}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.9,
                weight: 0,
              }}
              interactive={false}
            />
          </span>
        );
      })}

      {/* Alliance/Adversary Lines */}
      {visibleLinks.map((link) => {
        const fromCoords = ACTOR_COORDS[link.from];
        const toCoords = ACTOR_COORDS[link.to];
        if (!fromCoords || !toCoords) return null;
        const isAlliance = link.type === "alliance";
        const color = isAlliance ? "#06b6d4" : "#f43f5e";
        return (
          <Polyline
            key={`${link.from}-${link.to}`}
            positions={[
              [fromCoords.lat, fromCoords.lng],
              [toCoords.lat, toCoords.lng],
            ]}
            pathOptions={{
              color,
              weight: 1,
              opacity: 0.5,
              dashArray: isAlliance ? "6 4" : "3 3",
            }}
          />
        );
      })}

      {/* Actor Markers - tactical style */}
      {actors.map((actor) => {
        const isActive = activeActorId === actor.id;
        return (
          <span key={actor.id}>
            {/* Outer ring on hover/select */}
            {isActive && (
              <CircleMarker
                center={[actor.coords.lat, actor.coords.lng]}
                radius={14}
                pathOptions={{
                  color: actor.color,
                  fillColor: "transparent",
                  fillOpacity: 0,
                  weight: 1,
                  opacity: 0.4,
                  dashArray: "3 3",
                }}
                interactive={false}
              />
            )}
            <CircleMarker
              center={[actor.coords.lat, actor.coords.lng]}
              radius={isActive ? 6 : 4}
              pathOptions={{
                color: actor.color,
                fillColor: actor.color,
                fillOpacity: isActive ? 1 : 0.8,
                weight: isActive ? 2 : 1.5,
              }}
              eventHandlers={{
                click: () => onActorClick(actor.id),
                mouseover: () => onActorHover(actor.id),
                mouseout: () => onActorHover(null),
              }}
            >
              <Tooltip
                direction="top"
                offset={[0, -8]}
                className="warroom-tooltip"
              >
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px" }}>
                  <span style={{ fontWeight: 700, letterSpacing: "0.08em", fontSize: "9px", color: actor.color }}>
                    {actor.shortName}
                  </span>
                </div>
              </Tooltip>
            </CircleMarker>
          </span>
        );
      })}

      {/* Strategic Locations */}
      {strategicLocations.map((loc) => (
        <Marker
          key={loc.id}
          position={[loc.coords.lat, loc.coords.lng]}
          icon={strategicIcon(loc.type)}
          eventHandlers={loc.type === "chokepoint" && onChokepointClick ? {
            click: () => onChokepointClick(loc.id),
          } : undefined}
        >
          <Tooltip direction="top" className="warroom-tooltip">
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "1px" }}>
                <span style={{ color: loc.type === "chokepoint" ? "#f59e0b" : "#94a3b8", fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em" }}>
                  {loc.type === "chokepoint" ? "CHOKEPOINT" : "STRATEGIC"}
                </span>
              </div>
              <span style={{ fontWeight: 600, color: "#e5e5e5" }}>{loc.name}</span>
              {loc.type === "chokepoint" && (
                <div style={{ fontSize: "8px", color: "#737373", marginTop: "2px" }}>Click for intel</div>
              )}
            </div>
          </Tooltip>
        </Marker>
      ))}

      {/* Vessel Layer */}
      {layerVisibility.vessels && vessels.length > 0 && (
        <VesselLayer vessels={vessels} onVesselClick={onVesselClick} />
      )}

      {/* Vessel Trail Layer */}
      {vesselTrails && vesselTrails.size > 0 && (
        <VesselTrailLayer trails={vesselTrails} />
      )}

      {/* Aircraft Layer */}
      {layerVisibility.aircraft && aircraft.length > 0 && (
        <AircraftLayer aircraft={aircraft} onAircraftClick={onAircraftClick} />
      )}

      {/* VIP Aircraft Layer */}
      {layerVisibility.vipAircraft && vipAircraft && vipAircraft.length > 0 && (
        <VipAircraftLayer aircraft={vipAircraft} onAircraftClick={onVipAircraftClick} />
      )}

      {/* OSINT Markers Layer */}
      {layerVisibility.osintMarkers && osintEvents.length > 0 && (
        <OsintMarkersLayer events={osintEvents} onEventClick={onOsintEventClick} />
      )}
    </MapContainer>
  );
}
