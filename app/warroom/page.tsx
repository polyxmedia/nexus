"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
// Status indicators are inline in the top bar
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
import { UpgradeGate } from "@/components/subscription/upgrade-gate";

const WarRoomMap = dynamic(
  () => import("@/components/warroom/war-room-map"),
  { ssr: false }
);

const GlobeView = dynamic(
  () => import("@/components/warroom/globe-view"),
  { ssr: false }
);


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
      <div className="ml-48 h-screen flex flex-col overflow-hidden bg-[#050505]">
        <div className="h-9 border-b border-[#1a1a1a] bg-[#080808]/95 flex items-center px-3 gap-0 font-mono">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-2 px-3 h-full border-r border-[#1a1a1a]">
              <Skeleton className="h-3 w-8 rounded-sm" />
              <Skeleton className="h-3 w-6 rounded-sm" />
            </div>
          ))}
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 px-3">
            <span className="w-1 h-1 rounded-full bg-navy-600" style={{ animation: "wr-dot-pulse 1.2s infinite 0ms" }} />
            <span className="w-1 h-1 rounded-full bg-navy-600" style={{ animation: "wr-dot-pulse 1.2s infinite 200ms" }} />
            <span className="w-1 h-1 rounded-full bg-navy-600" style={{ animation: "wr-dot-pulse 1.2s infinite 400ms" }} />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-accent-cyan animate-pulse" />
            <span className="text-[10px] text-navy-600 uppercase tracking-[0.2em] font-mono">
              Initializing
            </span>
          </div>
        </div>
      </div>
    );
  }

  const { metrics } = data;

  return (
    <div className="ml-48 h-screen flex flex-col overflow-hidden bg-[#050505]">
      <UpgradeGate minTier="operator" feature="War room with OSINT, aircraft tracking, and vessel monitoring" blur>
      {/* Top Bar - COP Status */}
      <div className="h-9 border-b border-[#1a1a1a] bg-[#080808]/95 backdrop-blur-sm flex items-center px-3 gap-0 shrink-0 z-20 font-mono">
        {/* Threat Level */}
        <div className="flex items-center gap-2 px-3 h-full border-r border-[#1a1a1a]">
          <span className="text-[8px] text-navy-600 uppercase tracking-[0.15em]">THREAT</span>
          <span className={`text-[10px] font-bold tabular-nums ${
            metrics.maxEscalation >= 4 ? "text-signal-5" :
            metrics.maxEscalation >= 3 ? "text-signal-4" :
            "text-signal-2"
          }`}>
            {metrics.maxEscalation}/5
          </span>
        </div>

        {/* Regime */}
        <div className="flex items-center gap-2 px-3 h-full border-r border-[#1a1a1a]">
          <span className="text-[8px] text-navy-600 uppercase tracking-[0.15em]">REGIME</span>
          <div className="flex items-center gap-1.5">
            <div className={`h-1.5 w-1.5 rounded-full ${
              metrics.marketRegime === "risk_off" ? "bg-accent-rose" :
              metrics.marketRegime === "risk_on" ? "bg-accent-emerald" :
              "bg-accent-amber"
            }`} />
            <span className={`text-[10px] font-medium uppercase ${
              metrics.marketRegime === "risk_off" ? "text-accent-rose" :
              metrics.marketRegime === "risk_on" ? "text-accent-emerald" :
              "text-accent-amber"
            }`}>
              {metrics.marketRegime.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Convergence */}
        <div className="flex items-center gap-2 px-3 h-full border-r border-[#1a1a1a]">
          <span className="text-[8px] text-navy-600 uppercase tracking-[0.15em]">CONV</span>
          <span className="text-[10px] text-navy-300 font-medium tabular-nums">
            {metrics.convergenceDensity.toFixed(1)}
          </span>
        </div>

        {/* Volatility */}
        <div className="flex items-center gap-2 px-3 h-full border-r border-[#1a1a1a]">
          <span className="text-[8px] text-navy-600 uppercase tracking-[0.15em]">VOL</span>
          <span className="text-[10px] text-navy-300 font-medium uppercase">
            {metrics.volatilityOutlook}
          </span>
        </div>

        {/* Signals */}
        <div className="flex items-center gap-2 px-3 h-full border-r border-[#1a1a1a]">
          <span className="text-[8px] text-navy-600 uppercase tracking-[0.15em]">SIG</span>
          <span className="text-[10px] text-navy-300 font-medium tabular-nums">
            {metrics.activeSignalCount}
          </span>
        </div>

        {/* High Intensity */}
        <div className="flex items-center gap-2 px-3 h-full border-r border-[#1a1a1a]">
          <span className="text-[8px] text-navy-600 uppercase tracking-[0.15em]">HIGH</span>
          <span className="text-[10px] text-accent-rose font-bold tabular-nums">
            {metrics.highIntensityCount}
          </span>
        </div>

        {/* Spacer + timestamp */}
        <div className="flex-1" />
        <div className="flex items-center gap-3 px-3 h-full">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-accent-emerald animate-pulse" />
            <span className="text-[8px] text-navy-600 uppercase tracking-wider">LIVE</span>
          </div>
          <span className="text-[9px] text-navy-600 tabular-nums">
            {new Date().toISOString().slice(0, 16).replace("T", " ")} UTC
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
      </UpgradeGate>
    </div>
  );
}
