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
];

// ── Strategic Locations ──

export interface StrategicLocation {
  id: string;
  name: string;
  type: "institution" | "chokepoint";
  coords: { lat: number; lng: number };
}

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
