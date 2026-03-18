import { ACTORS } from "@/lib/game-theory/actors";

// ── Actor Capital Coordinates ──

export const ACTOR_COORDS: Record<string, { lat: number; lng: number }> = {
  us: { lat: 38.8977, lng: -77.0365 }, // Washington, DC
  china: { lat: 39.9042, lng: 116.4074 }, // Beijing
  russia: { lat: 55.7558, lng: 37.6173 }, // Moscow
  iran: { lat: 35.6892, lng: 51.389 }, // Tehran
  israel: { lat: 31.7683, lng: 35.2137 }, // Jerusalem
  saudi: { lat: 24.7136, lng: 46.6753 }, // Riyadh
  eu: { lat: 50.8503, lng: 4.3517 }, // Brussels
  dprk: { lat: 39.0392, lng: 125.7625 }, // Pyongyang
};

// ── Actor Colors ──

export type ActorColorGroup = "ally" | "adversary" | "neutral";

export const ACTOR_COLORS: Record<string, { color: string; group: ActorColorGroup }> = {
  us: { color: "#06b6d4", group: "ally" }, // cyan
  eu: { color: "#06b6d4", group: "ally" }, // cyan
  israel: { color: "#06b6d4", group: "ally" }, // cyan
  saudi: { color: "#f59e0b", group: "neutral" }, // amber
  china: { color: "#f43f5e", group: "adversary" }, // rose
  russia: { color: "#f43f5e", group: "adversary" }, // rose
  iran: { color: "#f43f5e", group: "adversary" }, // rose
  dprk: { color: "#f43f5e", group: "adversary" }, // rose
};

// ── Conflict Zones ──

export interface ConflictZone {
  id: string;
  name: string;
  scenarioId: string;
  center: { lat: number; lng: number };
  radiusKm: number;
  escalationLevel: number; // 1-5
}

export const CONFLICT_ZONES: ConflictZone[] = [
  {
    id: "taiwan-strait",
    name: "Taiwan Strait",
    scenarioId: "taiwan-strait",
    center: { lat: 24.0, lng: 120.0 },
    radiusKm: 300,
    escalationLevel: 4,
  },
  {
    id: "hormuz",
    name: "Strait of Hormuz",
    scenarioId: "iran-nuclear",
    center: { lat: 26.5, lng: 56.25 },
    radiusKm: 200,
    escalationLevel: 3,
  },
  {
    id: "persian-gulf",
    name: "Persian Gulf",
    scenarioId: "iran-nuclear",
    center: { lat: 27.0, lng: 51.0 },
    radiusKm: 350,
    escalationLevel: 3,
  },
  {
    id: "ukraine",
    name: "Ukraine Conflict Zone",
    scenarioId: "taiwan-strait", // closest proxy
    center: { lat: 48.3794, lng: 31.1656 },
    radiusKm: 400,
    escalationLevel: 5,
  },
  {
    id: "korean-peninsula",
    name: "Korean Peninsula",
    scenarioId: "taiwan-strait",
    center: { lat: 37.5665, lng: 126.978 },
    radiusKm: 250,
    escalationLevel: 2,
  },
  // Additional strategic monitoring zones
  {
    id: "south-china-sea",
    name: "South China Sea",
    scenarioId: "taiwan-strait",
    center: { lat: 14.5, lng: 114.0 },
    radiusKm: 500,
    escalationLevel: 3,
  },
  {
    id: "baltic-sea",
    name: "Baltic Sea / Kaliningrad",
    scenarioId: "taiwan-strait",
    center: { lat: 55.7, lng: 20.5 },
    radiusKm: 300,
    escalationLevel: 3,
  },
  {
    id: "red-sea",
    name: "Red Sea / Houthi Zone",
    scenarioId: "iran-nuclear",
    center: { lat: 15.5, lng: 42.0 },
    radiusKm: 400,
    escalationLevel: 5,
  },
  {
    id: "east-med",
    name: "Eastern Mediterranean",
    scenarioId: "iran-nuclear",
    center: { lat: 34.0, lng: 34.0 },
    radiusKm: 300,
    escalationLevel: 3,
  },
  {
    id: "arctic",
    name: "Arctic / Northern Sea Route",
    scenarioId: "taiwan-strait",
    center: { lat: 72.0, lng: 40.0 },
    radiusKm: 500,
    escalationLevel: 1,
  },
];

// ── Strategic Locations ──

export interface StrategicLocation {
  id: string;
  name: string;
  type: "institution" | "chokepoint";
  coords: { lat: number; lng: number };
}

export interface ChokepointIntel {
  id: string;
  name: string;
  coords: { lat: number; lng: number };
  widthKm: number;
  depthM: number;
  dailyTraffic: string;
  oilFlowMbpd: number;
  globalTradeShare: string;
  controlledBy: string[];
  contestedBy: string[];
  threats: string[];
  commodities: string[];
  alternatives: string;
  recentEvents: string[];
  significance: string;
  threatLevel: 1 | 2 | 3 | 4 | 5;
}

export const CHOKEPOINT_INTEL: Record<string, ChokepointIntel> = {
  "hormuz-choke": {
    id: "hormuz-choke",
    name: "Strait of Hormuz",
    coords: { lat: 26.5667, lng: 56.25 },
    widthKm: 33,
    depthM: 60,
    dailyTraffic: "~80 vessels/day",
    oilFlowMbpd: 21,
    globalTradeShare: "~21% of global oil consumption",
    controlledBy: ["Iran", "Oman"],
    contestedBy: ["Iran (IRGCN)", "US Fifth Fleet"],
    threats: [
      "Iranian mine-laying capability via fast attack craft",
      "IRGC naval swarm tactics and anti-ship cruise missiles",
      "Periodic seizure of commercial tankers by IRGCN",
      "Proximity to Iranian Bandar Abbas naval base (30km)",
      "Drone and UAV surveillance from Iranian islands",
    ],
    commodities: ["Crude oil", "LNG", "Refined petroleum products", "Petrochemicals"],
    alternatives: "Saudi East-West Pipeline (5 mbpd capacity), UAE Habshan-Fujairah (1.5 mbpd). Neither replaces full strait volume.",
    recentEvents: [
      "IRGC seized commercial tankers in 2023-2024",
      "US-Iran naval standoffs recurrent since 2019",
      "Increased drone surveillance from Abu Musa and Tunb islands",
      "Houthi attacks in adjacent Gulf of Oman corridor",
    ],
    significance: "The world's most critical oil chokepoint. Closure would remove ~21 mbpd from global supply, triggering immediate oil price spikes above $150/bbl. No combination of alternatives can replace this throughput. US Fifth Fleet maintains permanent carrier presence in response.",
    threatLevel: 4,
  },
  "malacca-choke": {
    id: "malacca-choke",
    name: "Strait of Malacca",
    coords: { lat: 2.5, lng: 101.8 },
    widthKm: 2.8,
    depthM: 25,
    dailyTraffic: "~200 vessels/day",
    oilFlowMbpd: 16,
    globalTradeShare: "~25-30% of global maritime trade",
    controlledBy: ["Malaysia", "Indonesia", "Singapore"],
    contestedBy: ["China (claims influence)", "US Navy (FON operations)"],
    threats: [
      "Narrowest navigable point only 2.8km at Phillips Channel",
      "Piracy remains persistent despite trilateral patrols",
      "Collision risk from extreme traffic density",
      "Chinese naval expansion in South China Sea approaches",
      "Potential blockade scenario in Taiwan contingency",
    ],
    commodities: ["Crude oil", "LNG", "Container goods", "Electronics", "Raw materials"],
    alternatives: "Lombok Strait adds 2-3 days transit. Sunda Strait has depth limits. Neither handles VLCC traffic efficiently.",
    recentEvents: [
      "Piracy incidents continue at ~50/year despite MSTC patrols",
      "Chinese naval assets increasingly transiting to Indian Ocean",
      "Singapore expanding Changi Naval Base capacity",
      "Traffic density hitting physical capacity limits",
    ],
    significance: "The busiest maritime chokepoint on Earth. Connects the Indian and Pacific Oceans, carrying the bulk of East Asian energy imports and manufactured exports. A blockade during a Taiwan crisis would cripple Japanese, Korean, and Chinese economies within weeks.",
    threatLevel: 3,
  },
  "suez-choke": {
    id: "suez-choke",
    name: "Suez Canal",
    coords: { lat: 30.4574, lng: 32.3498 },
    widthKm: 0.205,
    depthM: 24,
    dailyTraffic: "~70 vessels/day",
    oilFlowMbpd: 5.5,
    globalTradeShare: "~12-15% of global trade, ~30% of container traffic",
    controlledBy: ["Egypt (Suez Canal Authority)"],
    contestedBy: [],
    threats: [
      "Single-point failure: one grounding blocks global trade (cf. Ever Given 2021)",
      "Houthi attacks in Red Sea forcing rerouting via Cape of Good Hope",
      "Egyptian political instability could affect operations",
      "Capacity constrained despite 2015 expansion",
      "Terrorist targeting risk (Sinai insurgency proximity)",
    ],
    commodities: ["Container goods", "Crude oil", "LNG", "Grain", "Manufactured goods"],
    alternatives: "Cape of Good Hope adds 10-14 days and $1M+ per transit in fuel costs. No realistic alternative for time-sensitive cargo.",
    recentEvents: [
      "Houthi Red Sea campaign (2023-present) diverted 60%+ of traffic",
      "Ever Given grounding (2021) blocked canal for 6 days, $9.6B daily trade impact",
      "Egypt raised transit fees multiple times since 2022",
      "Insurance premiums for Red Sea transit surged 10x",
    ],
    significance: "The gateway between Europe and Asia. Houthi attacks have already demonstrated how disruption cascades globally: container rates surged 300%, European supply chains stretched, and Egyptian revenue dropped sharply. Permanent closure would restructure global trade routes.",
    threatLevel: 5,
  },
  "bab-el-mandeb": {
    id: "bab-el-mandeb",
    name: "Bab el-Mandeb",
    coords: { lat: 12.583, lng: 43.333 },
    widthKm: 26,
    depthM: 310,
    dailyTraffic: "~60 vessels/day",
    oilFlowMbpd: 6.2,
    globalTradeShare: "~10% of global seaborne oil trade",
    controlledBy: ["Djibouti", "Yemen", "Eritrea"],
    contestedBy: ["Houthi forces (Ansar Allah)", "US/UK naval coalition", "Iran (proxy influence)"],
    threats: [
      "Active Houthi anti-ship missile and drone campaign",
      "Iranian-supplied cruise missiles and UAVs targeting transits",
      "Proximity to Yemeni coastline (within ASCM range)",
      "Multiple foreign military bases in Djibouti create friction",
      "Piracy spillover from Somali coast",
    ],
    commodities: ["Crude oil", "LNG", "Container goods", "Grain"],
    alternatives: "Cape of Good Hope bypass adds 10+ days. Rerouting negates Suez Canal value entirely.",
    recentEvents: [
      "Houthi campaign hit 100+ commercial vessels since late 2023",
      "US/UK Operation Prosperity Guardian ongoing",
      "Multiple cargo and tanker vessels struck by missiles/drones",
      "Insurance war-risk premiums at historic highs for Red Sea transit",
    ],
    significance: "The southern gate to the Suez Canal. Currently the most actively contested chokepoint on Earth. Houthi attacks have effectively weaponized commercial shipping lanes, forcing the largest rerouting of global trade since WWII. Control of Bab el-Mandeb is control of Europe-Asia connectivity.",
    threatLevel: 5,
  },
};

export const STRATEGIC_LOCATIONS: StrategicLocation[] = [
  { id: "un-hq", name: "UN HQ", type: "institution", coords: { lat: 40.7489, lng: -73.968 } },
  { id: "opec-vienna", name: "OPEC Vienna", type: "institution", coords: { lat: 48.2082, lng: 16.3738 } },
  { id: "nato-hq", name: "NATO HQ", type: "institution", coords: { lat: 50.8766, lng: 4.4219 } },
  { id: "hormuz-choke", name: "Strait of Hormuz", type: "chokepoint", coords: { lat: 26.5667, lng: 56.25 } },
  { id: "malacca-choke", name: "Strait of Malacca", type: "chokepoint", coords: { lat: 2.5, lng: 101.8 } },
  { id: "suez-choke", name: "Suez Canal", type: "chokepoint", coords: { lat: 30.4574, lng: 32.3498 } },
  { id: "bab-el-mandeb", name: "Bab el-Mandeb", type: "chokepoint", coords: { lat: 12.583, lng: 43.333 } },
];

// ── Alliance Link Generation ──

export interface AllianceLink {
  from: string;
  to: string;
  type: "alliance" | "adversary";
}

export function getAllianceLinks(): AllianceLink[] {
  const seen = new Set<string>();
  const links: AllianceLink[] = [];

  for (const actor of ACTORS) {
    for (const allyId of actor.alliances) {
      const key = [actor.id, allyId].sort().join("-");
      if (!seen.has(key)) {
        seen.add(key);
        links.push({ from: actor.id, to: allyId, type: "alliance" });
      }
    }
    for (const advId of actor.adversaries) {
      const key = [actor.id, advId].sort().join("-");
      if (!seen.has(key)) {
        seen.add(key);
        links.push({ from: actor.id, to: advId, type: "adversary" });
      }
    }
  }

  return links;
}
