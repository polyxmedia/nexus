import type { GeopoliticalActor, GameTheoryAnalysis, StrategicScenario } from "@/lib/thesis/types";
import type { AllianceLink, ConflictZone, StrategicLocation } from "./geo-constants";

export interface ActorWithGeo extends GeopoliticalActor {
  coords: { lat: number; lng: number };
  color: string;
  colorGroup: "ally" | "adversary" | "neutral";
}

export interface BayesianSummary {
  bargainingRange: number;
  fearonAssessment: string;
  escalationProbability: number;
  dominantTypes: Record<string, { type: string; probability: number }>;
  equilibriaCount: number;
  marketDirection: "bullish" | "bearish" | "mixed";
  marketConfidence: number;
  coalitions: { name: string; stability: number; fractureRisk: string }[];
  audienceCostConstraints: Record<string, string[]>;
}

export interface ScenarioWithAnalysis {
  scenario: StrategicScenario;
  analysis: GameTheoryAnalysis;
  bayesian?: BayesianSummary;
}

export interface WarRoomSignal {
  id: number;
  uuid: string;
  title: string;
  date: string;
  intensity: number;
  category: string;
  status: string;
  marketSectors: string[];
}

export interface WarRoomThesis {
  id: number;
  uuid: string;
  title: string;
  marketRegime: string;
  volatilityOutlook: string;
  convergenceDensity: number;
  overallConfidence: number;
  executiveSummary: string;
}

export interface GlobalMetrics {
  maxEscalation: number;
  convergenceDensity: number;
  marketRegime: string;
  volatilityOutlook: string;
  activeSignalCount: number;
  highIntensityCount: number;
}

export interface WarRoomData {
  actors: ActorWithGeo[];
  scenarios: ScenarioWithAnalysis[];
  signals: WarRoomSignal[];
  thesis: WarRoomThesis | null;
  allianceLinks: AllianceLink[];
  conflictZones: ConflictZone[];
  strategicLocations: StrategicLocation[];
  metrics: GlobalMetrics;
}

// ── Live Aircraft Tracking ──

export interface AircraftState {
  icao24: string;
  callsign: string;
  originCountry: string;
  lat: number;
  lng: number;
  altitude: number;
  velocity: number;
  heading: number;
  onGround: boolean;
  isMilitary: boolean;
}

export interface AircraftResponse {
  aircraft: AircraftState[];
  timestamp: number;
  totalCount: number;
  militaryCount: number;
}

// ── OSINT Events ──

export type OsintEventType =
  | "battles"
  | "explosions"
  | "violence_against_civilians"
  | "protests"
  | "riots"
  | "strategic_developments";

export interface OsintEvent {
  id: string;
  date: string;
  eventType: OsintEventType;
  actors: string;
  location: string;
  country: string;
  lat: number;
  lng: number;
  fatalities: number;
  notes: string;
  source: string;
  sourceUrl: string;
  tone?: number;
}

export interface OsintResponse {
  events: OsintEvent[];
  timestamp: number;
  totalCount: number;
}

// ── Satellite Tracking ──

export type SatelliteCategory = "military" | "navigation" | "weather" | "comms" | "science" | "other";

export interface SatellitePosition {
  name: string;
  noradId: string;
  lat: number;
  lng: number;
  altKm: number;
  velocityKmS: number;
  category: SatelliteCategory;
  country: string;
}

export interface SatelliteResponse {
  satellites: SatellitePosition[];
  timestamp: number;
  totalCount: number;
  militaryCount: number;
}

// ── VIP Aircraft Tracking ──

export interface VipAircraftState {
  icao24: string;
  callsign: string;
  registration: string;
  lat: number;
  lng: number;
  altitude: number;
  velocity: number;
  heading: number;
  onGround: boolean;
  owner: string;
  operator: string;
  category: string;
  aircraftType: string;
  icaoType: string;
  cmpg: string;
  tag1: string;
  tag2: string;
  priority: number;
}

export interface VipAircraftResponse {
  aircraft: VipAircraftState[];
  timestamp: number;
  totalCount: number;
}

// ── Fire Detection (NASA FIRMS) ──

export interface FireDetection {
  id: string;
  lat: number;
  lng: number;
  brightness: number;
  confidence: "low" | "nominal" | "high";
  frp: number; // fire radiative power (MW)
  satellite: string;
  acquiredAt: string;
  dayNight: "D" | "N";
  military?: {
    baseName: string;
    baseType: string;
    distanceKm: number;
  };
}

export interface FireResponse {
  fires: FireDetection[];
  timestamp: number;
  totalCount: number;
  highConfidenceCount: number;
  militaryCount: number;
  days: number; // how many days of history
}

// ── Radiation Monitoring ──

export interface RadiationReading {
  id: string;
  lat: number;
  lng: number;
  value: number; // CPM (counts per minute)
  unit: string;
  deviceId: string;
  capturedAt: string;
  locationName: string;
}

export interface RadiationResponse {
  readings: RadiationReading[];
  timestamp: number;
  totalCount: number;
  elevatedCount: number;
}

// ── Sweep Delta ──

export type DeltaChangeType = "new" | "escalated" | "deescalated" | "resolved";

export interface SweepDeltaItem {
  id: string;
  layer: "osint" | "fire" | "radiation" | "aircraft" | "vessel";
  changeType: DeltaChangeType;
  summary: string;
  lat: number;
  lng: number;
  timestamp: string;
  severity: "routine" | "priority" | "flash";
}

export interface SweepDeltaResponse {
  deltas: SweepDeltaItem[];
  sweepTime: string;
  previousSweepTime: string | null;
  totalChanges: number;
  flashCount: number;
}

// ── Layer Visibility ──

export interface WarRoomLayerVisibility {
  aircraft: boolean;
  vessels: boolean;
  osintMarkers: boolean;
  conflictHeatmap: boolean;
  satellites: boolean;
  vipAircraft: boolean;
  fires: boolean;
  fireMilitaryOnly: boolean;
  radiation: boolean;
}

// -- Live Vessel Tracking (AIS) --

export type VesselType = "cargo" | "tanker" | "military" | "passenger" | "fishing" | "other";

export interface VesselState {
  mmsi: string;
  name: string;
  lat: number;
  lng: number;
  speed: number; // knots
  course: number; // degrees
  heading: number;
  vesselType: VesselType;
  flag: string;
  destination: string;
  lastUpdate: number; // unix timestamp
}

export interface VesselResponse {
  vessels: VesselState[];
  timestamp: number;
  totalCount: number;
  militaryCount: number;
}
