"use client";

import { useCallback, useEffect, useState } from "react";
import nextDynamic from "next/dynamic";
// Status indicators are inline in the top bar
import { ScenarioPanel } from "@/components/warroom/scenario-panel";
import { IntelPanel } from "@/components/warroom/intel-panel";
import { ActorDetailModal } from "@/components/warroom/actor-detail-modal";
import { OsintEventModal } from "@/components/warroom/osint-event-modal";
import { AircraftDetailModal } from "@/components/warroom/aircraft-detail-modal";
import { VipAircraftModal } from "@/components/warroom/vip-aircraft-modal";
import { VesselDetailModal } from "@/components/warroom/vessel-detail-modal";
import { ChokepointDetailModal } from "@/components/warroom/chokepoint-detail-modal";
import { CHOKEPOINT_INTEL } from "@/lib/warroom/geo-constants";
import { CountryDetailPanel } from "@/components/warroom/country-detail-panel";
import { WatchlistPanel } from "@/components/warroom/watchlist-panel";
import { SourcesPanel } from "@/components/warroom/sources-panel";
import type { WatchlistItem } from "@/components/warroom/watchlist-panel";
import { LayerToggle } from "@/components/warroom/layer-toggle";
import { MapTypeSelector, MAP_TILES } from "@/components/warroom/map-type-selector";
import type { MapTileType } from "@/components/warroom/map-type-selector";
import { ViewModeToggle } from "@/components/warroom/view-mode-toggle";
import type { ViewMode } from "@/components/warroom/view-mode-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/lib/hooks/useTheme";
import { useAircraftData } from "@/lib/warroom/use-aircraft-data";
import { useVesselData } from "@/lib/warroom/use-vessel-data";
import { useOsintData } from "@/lib/warroom/use-osint-data";
import { useSatelliteData } from "@/lib/warroom/use-satellite-data";
import { useVipAircraftData } from "@/lib/warroom/use-vip-aircraft-data";
import { useFireData } from "@/lib/warroom/use-fire-data";
import { useRadiationData } from "@/lib/warroom/use-radiation-data";
import { useSweepDelta } from "@/lib/warroom/use-sweep-delta";
import { SweepDeltaPanel } from "@/components/warroom/sweep-delta-panel";
import type { WarRoomData, WarRoomLayerVisibility, OsintEvent, AircraftState, VesselState, VipAircraftState } from "@/lib/warroom/types";
import { UpgradeGate } from "@/components/subscription/upgrade-gate";
import { useVesselTracker } from "@/lib/warroom/use-vessel-tracker";

const WarRoomMap = nextDynamic(
  () => import("@/components/warroom/war-room-map"),
  { ssr: false }
);

const GlobeView = nextDynamic(
  () => import("@/components/warroom/globe-view"),
  { ssr: false }
);


const BOOT_LINES = [
  "ESTABLISHING SECURE CHANNEL",
  "LOADING GEOSPATIAL DATA",
  "CONNECTING OSINT FEEDS",
  "SYNCING THREAT ASSESSMENT",
  "INITIALISING COMMON OPERATING PICTURE",
];

function BootSequence() {
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    if (lineIndex >= BOOT_LINES.length) return;
    const line = BOOT_LINES[lineIndex];
    if (charIndex < line.length) {
      const t = setTimeout(() => setCharIndex((c) => c + 1), 25 + Math.random() * 30);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setLineIndex((l) => l + 1);
      setCharIndex(0);
    }, 400);
    return () => clearTimeout(t);
  }, [lineIndex, charIndex]);

  return (
    <div className="flex flex-col items-center gap-1 min-h-[80px]">
      {BOOT_LINES.slice(0, lineIndex + 1).map((line, i) => {
        const done = i < lineIndex;
        const text = done ? line : line.slice(0, charIndex);
        return (
          <div key={i} className="flex items-center gap-2">
            {done ? (
              <span className="text-accent-emerald/70 text-[9px]">OK</span>
            ) : (
              <span className="w-1 h-3 bg-accent-cyan/60 animate-pulse" />
            )}
            <span className={`text-[9px] font-mono tracking-[0.15em] ${done ? "text-navy-600" : "text-navy-400"}`}>
              {text}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function WarRoomPage() {
  const [data, setData] = useState<WarRoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const [hoveredActorId, setHoveredActorId] = useState<string | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [modalActorId, setModalActorId] = useState<string | null>(null);
  const [selectedOsintEvent, setSelectedOsintEvent] = useState<OsintEvent | null>(null);
  const [selectedAircraft, setSelectedAircraft] = useState<AircraftState | null>(null);
  const [selectedVipAircraft, setSelectedVipAircraft] = useState<VipAircraftState | null>(null);
  const [selectedVessel, setSelectedVessel] = useState<VesselState | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [selectedChokepointId, setSelectedChokepointId] = useState<string | null>(null);
  const [newsArticles, setNewsArticles] = useState<{ title: string; url: string; source: string; date: string }[]>([]);
  const [trackedVessels, setTrackedVessels] = useState<Set<string>>(new Set());
  const { record, snapshot, getPointCount, clear } = useVesselTracker();

  const { theme } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>("2d");
  const [mapTileType, setMapTileType] = useState<MapTileType>("dark");

  // Sync default map tile with theme
  useEffect(() => {
    if (theme === "light" || theme === "soft") {
      setMapTileType("hybrid");
    } else {
      setMapTileType("dark");
    }
  }, [theme]);

  const [layerVisibility, setLayerVisibility] = useState<WarRoomLayerVisibility>({
    aircraft: false,
    vessels: false,
    osintMarkers: true,
    conflictHeatmap: false,
    satellites: false,
    vipAircraft: false,
    fires: false,
    radiation: false,
  });

  const { data: aircraftData } = useAircraftData(layerVisibility.aircraft);
  const { data: vesselData } = useVesselData(layerVisibility.vessels);
  const { data: osintData } = useOsintData();
  const { data: satelliteData } = useSatelliteData(layerVisibility.satellites);
  const { data: vipAircraftData } = useVipAircraftData(layerVisibility.vipAircraft);
  const { data: fireData } = useFireData(layerVisibility.fires);
  const { data: radiationData } = useRadiationData(layerVisibility.radiation);
  const { data: sweepDeltaData, loading: sweepDeltaLoading } = useSweepDelta();

  useEffect(() => {
    fetch("/api/warroom")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error("War room fetch error:", err);
        setError(err.message || "Failed to load war room data");
        setLoading(false);
      });
  }, []);

  // Record vessel positions for tracked vessels
  useEffect(() => {
    if (trackedVessels.size === 0 || !vesselData?.vessels?.length) return;
    record(vesselData.vessels, trackedVessels);
  }, [vesselData, trackedVessels, record]);

  const handleTrackVessel = useCallback((v: VesselState) => {
    setTrackedVessels((prev) => {
      const next = new Set(prev);
      if (next.has(v.mmsi)) {
        next.delete(v.mmsi);
        clear(v.mmsi);
      } else {
        next.add(v.mmsi);
      }
      return next;
    });
  }, [clear]);

  // Fetch news once for the country panel
  useEffect(() => {
    fetch("/api/news?limit=100")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        if (Array.isArray(data)) setNewsArticles(data);
      })
      .catch((err) => console.error("[WarRoom] news fetch failed:", err));
  }, []);

  const handleCountryClick = useCallback((code: string) => {
    setSelectedCountryCode((prev) => (prev === code ? null : code));
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

  const handleVipAircraftClick = useCallback((ac: VipAircraftState) => {
    setSelectedVipAircraft(ac);
  }, []);

  const handleChokepointClick = useCallback((id: string) => {
    setSelectedChokepointId((prev) => (prev === id ? null : id));
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

  if (loading || (!data && !error)) {
    return (
      <div className="ml-0 md:ml-48 h-screen flex flex-col overflow-hidden bg-navy-950 pt-12 md:pt-0">
        <UpgradeGate minTier="free" feature="War room with OSINT, aircraft tracking, and vessel monitoring" blur>
        <div className="flex-1 flex items-center justify-center relative">
          {/* Animated grid background */}
          <div className="absolute inset-0 overflow-hidden opacity-[0.07]">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(6,182,212,0.3) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(6,182,212,0.3) 1px, transparent 1px)
                `,
                backgroundSize: "60px 60px",
                animation: "wr-grid-scroll 20s linear infinite",
              }}
            />
          </div>

          {/* Scanning rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="absolute rounded-full border border-accent-cyan/20"
                style={{
                  width: `${200 + i * 140}px`,
                  height: `${200 + i * 140}px`,
                  animation: `wr-ring-pulse 3s ease-out infinite ${i * 0.8}s`,
                }}
              />
            ))}
          </div>

          {/* Center content */}
          <div className="relative z-10 flex flex-col items-center gap-6">
            {/* Crosshair reticle */}
            <div className="relative w-20 h-20">
              {/* Outer rotating ring */}
              <div
                className="absolute inset-0 rounded-full border border-accent-cyan/40"
                style={{ animation: "wr-rotate 8s linear infinite" }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-px w-2 h-1 bg-accent-cyan/60" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-px w-2 h-1 bg-accent-cyan/60" />
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-px w-1 h-2 bg-accent-cyan/60" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-px w-1 h-2 bg-accent-cyan/60" />
              </div>
              {/* Inner counter-rotating ring */}
              <div
                className="absolute inset-3 rounded-full border border-accent-cyan/25"
                style={{ animation: "wr-rotate-reverse 5s linear infinite" }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-px w-1.5 h-0.5 bg-accent-cyan/40" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-px w-1.5 h-0.5 bg-accent-cyan/40" />
              </div>
              {/* Center dot */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
              </div>
            </div>

            {/* Status text */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] text-accent-cyan/80 uppercase tracking-[0.3em] font-mono">
                War Room
              </span>
              <BootSequence />
            </div>
          </div>
        </div>

        {/* CSS animations */}
        <style jsx>{`
          @keyframes wr-grid-scroll {
            0% { transform: translate(0, 0); }
            100% { transform: translate(60px, 60px); }
          }
          @keyframes wr-ring-pulse {
            0% { transform: scale(0.8); opacity: 0.6; }
            50% { opacity: 0.15; }
            100% { transform: scale(1.4); opacity: 0; }
          }
          @keyframes wr-rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes wr-rotate-reverse {
            from { transform: rotate(0deg); }
            to { transform: rotate(-360deg); }
          }
        `}</style>
        </UpgradeGate>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="ml-0 md:ml-48 h-screen flex flex-col overflow-hidden bg-navy-950 pt-12 md:pt-0">
        <UpgradeGate minTier="free" feature="War room with OSINT, aircraft tracking, and vessel monitoring" blur>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-accent-rose" />
            <span className="text-[10px] text-accent-rose/80 uppercase tracking-[0.3em] font-mono">
              Connection Failed
            </span>
            <span className="text-[10px] text-navy-500 font-mono max-w-xs text-center">
              {error || "Unable to establish secure channel"}
            </span>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                fetch("/api/warroom")
                  .then((r) => {
                    if (!r.ok) throw new Error(`HTTP ${r.status}`);
                    return r.json();
                  })
                  .then((d) => {
                    setData(d);
                    setLoading(false);
                  })
                  .catch((err) => {
                    setError(err.message || "Failed to load war room data");
                    setLoading(false);
                  });
              }}
              className="mt-2 px-4 py-1.5 text-[10px] font-mono uppercase tracking-wider text-accent-cyan border border-accent-cyan/30 hover:bg-accent-cyan/10 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        </div>
        </UpgradeGate>
      </div>
    );
  }

  const { metrics } = data;

  return (
    <div className="ml-0 md:ml-48 h-screen flex flex-col overflow-hidden bg-navy-950 pt-12 md:pt-0">
      <UpgradeGate minTier="free" feature="War room with OSINT, aircraft tracking, and vessel monitoring" blur>
      {/* Top Bar - COP Status */}
      <div className="h-9 border-b border-navy-700 bg-navy-900/95 backdrop-blur-sm flex items-center px-3 gap-0 shrink-0 z-20 font-mono">
        {/* Threat Level */}
        <div className="flex items-center gap-2 px-3 h-full border-r border-navy-700">
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
        <div className="flex items-center gap-2 px-3 h-full border-r border-navy-700">
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
        <div className="flex items-center gap-2 px-3 h-full border-r border-navy-700">
          <span className="text-[8px] text-navy-600 uppercase tracking-[0.15em]">CONV</span>
          <span className="text-[10px] text-navy-300 font-medium tabular-nums">
            {metrics.convergenceDensity.toFixed(1)}
          </span>
        </div>

        {/* Volatility */}
        <div className="flex items-center gap-2 px-3 h-full border-r border-navy-700">
          <span className="text-[8px] text-navy-600 uppercase tracking-[0.15em]">VOL</span>
          <span className="text-[10px] text-navy-300 font-medium uppercase">
            {metrics.volatilityOutlook}
          </span>
        </div>

        {/* Signals */}
        <div className="flex items-center gap-2 px-3 h-full border-r border-navy-700">
          <span className="text-[8px] text-navy-600 uppercase tracking-[0.15em]">SIG</span>
          <span className="text-[10px] text-navy-300 font-medium tabular-nums">
            {metrics.activeSignalCount}
          </span>
        </div>

        {/* High Intensity */}
        <div className="flex items-center gap-2 px-3 h-full border-r border-navy-700">
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
              onCountryClick={handleCountryClick}
              onChokepointClick={handleChokepointClick}
              vesselTrails={snapshot}
              vipAircraft={vipAircraftData?.aircraft ?? []}
              onVipAircraftClick={handleVipAircraftClick}
              fires={fireData?.fires ?? []}
              radiation={radiationData?.readings ?? []}
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
              onAircraftClick={handleAircraftClick}
            />
          )}
        </div>

        {/* Bottom Control Bar */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex items-center gap-2">
          <ViewModeToggle mode={viewMode} onModeChange={handleViewModeChange} />
          {viewMode === "2d" && (
            <MapTypeSelector
              activeType={mapTileType}
              onTypeChange={handleMapTypeChange}
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
          vipCount={vipAircraftData?.totalCount ?? 0}
          fireCount={fireData?.totalCount ?? 0}
          fireHighCount={fireData?.highConfidenceCount ?? 0}
          radiationCount={radiationData?.totalCount ?? 0}
          radiationElevatedCount={radiationData?.elevatedCount ?? 0}
        />

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

        {/* VIP Aircraft Modal */}
        <VipAircraftModal
          aircraft={selectedVipAircraft}
          onClose={() => setSelectedVipAircraft(null)}
        />

        {/* Vessel Detail Modal */}
        <VesselDetailModal
          vessel={selectedVessel}
          onClose={() => setSelectedVessel(null)}
          onWatch={handleWatchVessel}
          isWatched={!!selectedVessel && watchlist.some((w) => w.id === selectedVessel.mmsi)}
          onTrack={handleTrackVessel}
          isTracked={!!selectedVessel && trackedVessels.has(selectedVessel.mmsi)}
          trackPointCount={selectedVessel ? getPointCount(selectedVessel.mmsi) : 0}
        />

        {/* Chokepoint Detail Modal */}
        <ChokepointDetailModal
          chokepoint={selectedChokepointId ? CHOKEPOINT_INTEL[selectedChokepointId] || null : null}
          onClose={() => setSelectedChokepointId(null)}
        />

        {/* Country Detail Panel */}
        <CountryDetailPanel
          countryCode={selectedCountryCode}
          onClose={() => setSelectedCountryCode(null)}
          osintEvents={osintData?.events ?? []}
          aircraft={aircraftData?.aircraft ?? []}
          vessels={vesselData?.vessels ?? []}
          newsArticles={newsArticles}
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

        {/* Sweep Delta Panel */}
        <SweepDeltaPanel data={sweepDeltaData} loading={sweepDeltaLoading} />

        {/* Sources Panel (bottom) */}
        <SourcesPanel />
      </div>
      </UpgradeGate>
    </div>
  );
}
