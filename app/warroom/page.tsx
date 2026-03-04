"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { StatusDot } from "@/components/ui/status-dot";
import { ScenarioPanel } from "@/components/warroom/scenario-panel";
import { IntelPanel } from "@/components/warroom/intel-panel";
import { ActorDetailModal } from "@/components/warroom/actor-detail-modal";
import { OsintEventModal } from "@/components/warroom/osint-event-modal";
import { AircraftDetailModal } from "@/components/warroom/aircraft-detail-modal";
import { VesselDetailModal } from "@/components/warroom/vessel-detail-modal";
import { WatchlistPanel } from "@/components/warroom/watchlist-panel";
import type { WatchlistItem } from "@/components/warroom/watchlist-panel";
import { LayerToggle } from "@/components/warroom/layer-toggle";
import { MapTypeSelector, MAP_TILES } from "@/components/warroom/map-type-selector";
import type { MapTileType } from "@/components/warroom/map-type-selector";
import { ViewModeToggle } from "@/components/warroom/view-mode-toggle";
import type { ViewMode } from "@/components/warroom/view-mode-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { useAircraftData } from "@/lib/warroom/use-aircraft-data";
import { useVesselData } from "@/lib/warroom/use-vessel-data";
import { useOsintData } from "@/lib/warroom/use-osint-data";
import { useSatelliteData } from "@/lib/warroom/use-satellite-data";
import type { WarRoomData, WarRoomLayerVisibility, OsintEvent, AircraftState, VesselState } from "@/lib/warroom/types";

const WarRoomMap = dynamic(
  () => import("@/components/warroom/war-room-map"),
  { ssr: false }
);

const GlobeView = dynamic(
  () => import("@/components/warroom/globe-view"),
  { ssr: false }
);

const THREAT_COLORS: Record<number, string> = {
  1: "bg-signal-1/20 text-signal-1 border-signal-1/30",
  2: "bg-signal-2/20 text-signal-2 border-signal-2/30",
  3: "bg-signal-3/20 text-signal-3 border-signal-3/30",
  4: "bg-signal-4/20 text-signal-4 border-signal-4/30",
  5: "bg-signal-5/20 text-signal-5 border-signal-5/30",
};

export default function WarRoomPage() {
  const [data, setData] = useState<WarRoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const [hoveredActorId, setHoveredActorId] = useState<string | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [modalActorId, setModalActorId] = useState<string | null>(null);
  const [selectedOsintEvent, setSelectedOsintEvent] = useState<OsintEvent | null>(null);
  const [selectedAircraft, setSelectedAircraft] = useState<AircraftState | null>(null);
  const [selectedVessel, setSelectedVessel] = useState<VesselState | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);

  const [viewMode, setViewMode] = useState<ViewMode>("2d");
  const [mapTileType, setMapTileType] = useState<MapTileType>("dark");

  const [layerVisibility, setLayerVisibility] = useState<WarRoomLayerVisibility>({
    aircraft: false,
    vessels: false,
    osintMarkers: true,
    conflictHeatmap: false,
    satellites: false,
  });

  const { data: aircraftData } = useAircraftData(layerVisibility.aircraft);
  const { data: vesselData } = useVesselData(layerVisibility.vessels);
  const { data: osintData } = useOsintData();
  const { data: satelliteData } = useSatelliteData(layerVisibility.satellites);

  useEffect(() => {
    fetch("/api/warroom")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleActorClick = (id: string) => {
    setSelectedActorId(id);
    setModalActorId(id);
  };

  const handleConflictZoneClick = (scenarioId: string) => {
    setSelectedScenarioId(
      selectedScenarioId === scenarioId ? null : scenarioId
    );
  };

  const handleLayerToggle = useCallback((layer: keyof WarRoomLayerVisibility) => {
    setLayerVisibility((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  const handleOsintEventClick = useCallback((event: OsintEvent) => {
    setSelectedOsintEvent(event);
  }, []);

  const handleMapTypeChange = useCallback((type: MapTileType) => {
    setMapTileType(type);
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  const handleAircraftClick = useCallback((ac: AircraftState) => {
    setSelectedAircraft(ac);
  }, []);

  const handleVesselClick = useCallback((v: VesselState) => {
    setSelectedVessel(v);
  }, []);

  const handleWatchAircraft = useCallback((ac: AircraftState) => {
    setWatchlist((prev) => {
      const exists = prev.find((w) => w.id === ac.icao24);
      if (exists) return prev.filter((w) => w.id !== ac.icao24);
      return [...prev, { type: "aircraft" as const, id: ac.icao24, label: ac.callsign || ac.icao24 }];
    });
  }, []);

  const handleWatchVessel = useCallback((v: VesselState) => {
    setWatchlist((prev) => {
      const exists = prev.find((w) => w.id === v.mmsi);
      if (exists) return prev.filter((w) => w.id !== v.mmsi);
      return [...prev, { type: "vessel" as const, id: v.mmsi, label: v.name }];
    });
  }, []);

  const handleWatchlistRemove = useCallback((id: string) => {
    setWatchlist((prev) => prev.filter((w) => w.id !== id));
  }, []);

  if (loading || !data) {
    return (
      <div className="ml-56 h-screen flex flex-col overflow-hidden bg-navy-950">
        <div className="h-10 border-b border-navy-700/30 bg-navy-900/90 flex items-center px-4 gap-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-6 w-20 rounded" />
          ))}
          <div className="ml-auto flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-navy-500" style={{ animation: "wr-dot-pulse 1.2s infinite 0ms" }} />
            <span className="w-1 h-1 rounded-full bg-navy-500" style={{ animation: "wr-dot-pulse 1.2s infinite 200ms" }} />
            <span className="w-1 h-1 rounded-full bg-navy-500" style={{ animation: "wr-dot-pulse 1.2s infinite 400ms" }} />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-xs text-navy-500 uppercase tracking-wider animate-pulse">
            Initializing War Room...
          </div>
        </div>
      </div>
    );
  }

  const { metrics } = data;

  return (
    <div className="ml-56 h-screen flex flex-col overflow-hidden bg-navy-950">
      {/* Top Bar */}
      <div className="h-10 border-b border-navy-700/30 bg-navy-900/90 backdrop-blur-sm flex items-center px-4 gap-3 shrink-0 z-20">
        <div className="flex items-center gap-2 bg-navy-800/50 rounded px-2 py-1">
          <span className="text-[10px] text-navy-500 uppercase tracking-wider">
            Threat
          </span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${THREAT_COLORS[metrics.maxEscalation] || THREAT_COLORS[1]}`}
          >
            {metrics.maxEscalation}/5
          </span>
        </div>

        <div className="flex items-center gap-2 bg-navy-800/50 rounded px-2 py-1">
          <span className="text-[10px] text-navy-500 uppercase tracking-wider">
            Regime
          </span>
          <StatusDot
            color={
              metrics.marketRegime === "risk_off"
                ? "red"
                : metrics.marketRegime === "risk_on"
                  ? "green"
                  : "amber"
            }
            label={metrics.marketRegime.replace("_", " ")}
          />
        </div>

        <div className="flex items-center gap-2 bg-navy-800/50 rounded px-2 py-1">
          <span className="text-[10px] text-navy-500 uppercase tracking-wider">
            Convergence
          </span>
          <span className="text-[10px] text-navy-200 font-medium">
            {metrics.convergenceDensity.toFixed(1)}
          </span>
        </div>

        <div className="flex items-center gap-2 bg-navy-800/50 rounded px-2 py-1">
          <span className="text-[10px] text-navy-500 uppercase tracking-wider">
            Volatility
          </span>
          <span className="text-[10px] text-navy-200 font-medium">
            {metrics.volatilityOutlook}
          </span>
        </div>

        <div className="flex items-center gap-2 bg-navy-800/50 rounded px-2 py-1">
          <span className="text-[10px] text-navy-500 uppercase tracking-wider">
            Active
          </span>
          <span className="text-[10px] text-navy-200 font-medium">
            {metrics.activeSignalCount}
          </span>
        </div>

        <div className="flex items-center gap-2 bg-navy-800/50 rounded px-2 py-1">
          <span className="text-[10px] text-navy-500 uppercase tracking-wider">
            High Int.
          </span>
          <span className="text-[10px] text-accent-rose font-medium">
            {metrics.highIntensityCount}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 relative overflow-hidden">
        {/* Scenario Panel (left) */}
        <ScenarioPanel
          scenarios={data.scenarios}
          selectedScenarioId={selectedScenarioId}
          onSelectScenario={setSelectedScenarioId}
        />

        {/* Map / Globe (fills entire area, panels overlay) */}
        <div className="absolute inset-0 z-0">
          {viewMode === "2d" ? (
            <WarRoomMap
              actors={data.actors}
              conflictZones={data.conflictZones}
              allianceLinks={data.allianceLinks}
              strategicLocations={data.strategicLocations}
              scenarios={data.scenarios}
              selectedActorId={selectedActorId}
              hoveredActorId={hoveredActorId}
              selectedScenarioId={selectedScenarioId}
              onActorClick={handleActorClick}
              onActorHover={setHoveredActorId}
              onConflictZoneClick={handleConflictZoneClick}
              aircraft={aircraftData?.aircraft ?? []}
              vessels={vesselData?.vessels ?? []}
              osintEvents={osintData?.events ?? []}
              layerVisibility={layerVisibility}
              tileUrl={MAP_TILES[mapTileType].url}
              tileAttribution={MAP_TILES[mapTileType].attribution}
              onOsintEventClick={handleOsintEventClick}
              onAircraftClick={handleAircraftClick}
              onVesselClick={handleVesselClick}
            />
          ) : (
            <GlobeView
              actors={data.actors}
              conflictZones={data.conflictZones}
              allianceLinks={data.allianceLinks}
              strategicLocations={data.strategicLocations}
              scenarios={data.scenarios}
              aircraft={aircraftData?.aircraft ?? []}
              vessels={vesselData?.vessels ?? []}
              osintEvents={osintData?.events ?? []}
              satellites={satelliteData?.satellites ?? []}
              layerVisibility={layerVisibility}
              onActorClick={handleActorClick}
              onOsintEventClick={handleOsintEventClick}
            />
          )}
        </div>

        {/* Layer Toggle */}
        <LayerToggle
          visibility={layerVisibility}
          onToggle={handleLayerToggle}
          aircraftCount={aircraftData?.totalCount ?? 0}
          militaryCount={aircraftData?.militaryCount ?? 0}
          vesselCount={vesselData?.totalCount ?? 0}
          vesselMilitaryCount={vesselData?.militaryCount ?? 0}
          osintCount={osintData?.totalCount ?? 0}
          satelliteCount={satelliteData?.totalCount ?? 0}
          satelliteMilitaryCount={satelliteData?.militaryCount ?? 0}
        />

        {/* View Mode Toggle */}
        <ViewModeToggle mode={viewMode} onModeChange={handleViewModeChange} />

        {/* Map Type Selector (only in 2D mode) */}
        {viewMode === "2d" && (
          <MapTypeSelector
            activeType={mapTileType}
            onTypeChange={handleMapTypeChange}
          />
        )}

        {/* Intel Panel (right) */}
        <IntelPanel
          signals={data.signals}
          thesis={data.thesis}
          osintData={osintData}
          onOsintEventClick={handleOsintEventClick}
        />

        {/* Actor Detail Modal */}
        <ActorDetailModal
          actorId={modalActorId}
          actors={data.actors}
          onClose={() => {
            setModalActorId(null);
            setSelectedActorId(null);
          }}
        />

        {/* OSINT Event Modal */}
        <OsintEventModal
          event={selectedOsintEvent}
          onClose={() => setSelectedOsintEvent(null)}
        />

        {/* Aircraft Detail Modal */}
        <AircraftDetailModal
          aircraft={selectedAircraft}
          onClose={() => setSelectedAircraft(null)}
          onWatch={handleWatchAircraft}
          isWatched={!!selectedAircraft && watchlist.some((w) => w.id === selectedAircraft.icao24)}
        />

        {/* Vessel Detail Modal */}
        <VesselDetailModal
          vessel={selectedVessel}
          onClose={() => setSelectedVessel(null)}
          onWatch={handleWatchVessel}
          isWatched={!!selectedVessel && watchlist.some((w) => w.id === selectedVessel.mmsi)}
        />

        {/* Watchlist Panel */}
        <WatchlistPanel
          items={watchlist}
          aircraft={aircraftData?.aircraft ?? []}
          vessels={vesselData?.vessels ?? []}
          onRemove={handleWatchlistRemove}
          onSelectAircraft={handleAircraftClick}
          onSelectVessel={handleVesselClick}
        />
      </div>
    </div>
  );
}
