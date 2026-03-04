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
import type { ActorWithGeo, ScenarioWithAnalysis, AircraftState, VesselState, OsintEvent, WarRoomLayerVisibility } from "@/lib/warroom/types";
import type { AllianceLink, ConflictZone, StrategicLocation } from "@/lib/warroom/geo-constants";
import { ACTOR_COORDS } from "@/lib/warroom/geo-constants";
import { AircraftLayer } from "./aircraft-layer";
import { VesselLayer } from "./vessel-layer";
import { OsintMarkersLayer } from "./osint-markers-layer";
import { ConflictHeatmapLayer } from "./conflict-heatmap-layer";
import { MapTileUpdater } from "./map-tile-updater";

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
}

const ESCALATION_COLORS: Record<number, string> = {
  1: "#3b82f6",
  2: "#22c55e",
  3: "#eab308",
  4: "#f97316",
  5: "#ef4444",
};

function diamondIcon(color: string) {
  return L.divIcon({
    html: `<div style="width:8px;height:8px;background:${color};transform:rotate(45deg);border:1px solid rgba(255,255,255,0.3);"></div>`,
    className: "",
    iconSize: [8, 8],
    iconAnchor: [4, 4],
  });
}

function FlyToZone({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5 });
  }, [map, center, zoom]);
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
      style={{ background: "#0a0a0a" }}
    >
      <MapTileUpdater tileUrl={tileUrl} attribution={tileAttribution} />

      {selectedZone && (
        <FlyToZone
          center={[selectedZone.center.lat, selectedZone.center.lng]}
          zoom={5}
        />
      )}

      {/* Conflict Heatmap Layer (below markers) */}
      {layerVisibility.conflictHeatmap && osintEvents.length > 0 && (
        <ConflictHeatmapLayer events={osintEvents} />
      )}

      {/* Conflict Zones */}
      {conflictZones.map((zone) => {
        const color = ESCALATION_COLORS[zone.escalationLevel] || "#3b82f6";
        const isSelected = selectedScenarioId === zone.scenarioId;
        return (
          <Circle
            key={zone.id}
            center={[zone.center.lat, zone.center.lng]}
            radius={zone.radiusKm * 1000}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: isSelected ? 0.2 : 0.08,
              weight: isSelected ? 2 : 1,
              dashArray: isSelected ? undefined : "4 4",
              className: zone.escalationLevel >= 4 ? "warroom-pulse" : zone.escalationLevel >= 3 ? "warroom-pulse-slow" : "",
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
              <span className="font-mono text-[10px]">
                {zone.name} [SIGNAL-{zone.escalationLevel}]
              </span>
            </Tooltip>
          </Circle>
        );
      })}

      {/* Alliance/Adversary Lines */}
      {visibleLinks.map((link) => {
        const fromCoords = ACTOR_COORDS[link.from];
        const toCoords = ACTOR_COORDS[link.to];
        if (!fromCoords || !toCoords) return null;
        const color = link.type === "alliance" ? "#06b6d4" : "#f43f5e";
        return (
          <Polyline
            key={`${link.from}-${link.to}`}
            positions={[
              [fromCoords.lat, fromCoords.lng],
              [toCoords.lat, toCoords.lng],
            ]}
            pathOptions={{
              color,
              weight: 1.5,
              opacity: 0.6,
              dashArray: "6 4",
            }}
          />
        );
      })}

      {/* Actor Markers */}
      {actors.map((actor) => {
        const isActive = activeActorId === actor.id;
        return (
          <CircleMarker
            key={actor.id}
            center={[actor.coords.lat, actor.coords.lng]}
            radius={isActive ? 10 : 7}
            pathOptions={{
              color: actor.color,
              fillColor: actor.color,
              fillOpacity: isActive ? 0.9 : 0.7,
              weight: isActive ? 2 : 1,
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
              <span className="font-mono text-[10px] uppercase tracking-wider">
                {actor.shortName}
              </span>
            </Tooltip>
          </CircleMarker>
        );
      })}

      {/* Strategic Locations */}
      {strategicLocations.map((loc) => {
        const color = loc.type === "chokepoint" ? "#f59e0b" : "#94a3b8";
        return (
          <Marker
            key={loc.id}
            position={[loc.coords.lat, loc.coords.lng]}
            icon={diamondIcon(color)}
          >
            <Tooltip direction="top" className="warroom-tooltip">
              <span className="font-mono text-[10px]">{loc.name}</span>
            </Tooltip>
          </Marker>
        );
      })}

      {/* Vessel Layer */}
      {layerVisibility.vessels && vessels.length > 0 && (
        <VesselLayer vessels={vessels} onVesselClick={onVesselClick} />
      )}

      {/* Aircraft Layer */}
      {layerVisibility.aircraft && aircraft.length > 0 && (
        <AircraftLayer aircraft={aircraft} onAircraftClick={onAircraftClick} />
      )}

      {/* OSINT Markers Layer */}
      {layerVisibility.osintMarkers && osintEvents.length > 0 && (
        <OsintMarkersLayer events={osintEvents} onEventClick={onOsintEventClick} />
      )}
    </MapContainer>
  );
}
