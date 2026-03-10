/**
 * VIP Aircraft Database
 * Loads plane-alert-db CSV from GitHub and provides in-memory lookup.
 * Categories of interest: Dictator Alert, Head of State, Oligarch, Governments,
 * Da Comrade, Royal Aircraft, Agency, Intelligence.
 */

export interface VipAircraftEntry {
  icao24: string;
  registration: string;
  operator: string;
  type: string;
  icaoType: string;
  cmpg: string; // Civ | Gov | Mil
  tag1: string;
  tag2: string;
  tag3: string;
  category: string;
  link: string;
}

const VIP_CATEGORIES = new Set([
  "Dictator Alert",
  "Head of State",
  "Oligarch",
  "Governments",
  "Da Comrade",
  "Royal Aircraft",
  "Agency",
  "Joe Airlines",
  "Khaki",
  "Nuclear",
  "Special Forces",
  "Ukraine",
]);

let cachedDb: Map<string, VipAircraftEntry> | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const CSV_URL =
  "https://raw.githubusercontent.com/sdr-enthusiasts/plane-alert-db/main/plane-alert-db.csv";

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

export async function getVipDatabase(): Promise<Map<string, VipAircraftEntry>> {
  const now = Date.now();
  if (cachedDb && now - lastFetchTime < CACHE_TTL) {
    return cachedDb;
  }

  try {
    const res = await fetch(CSV_URL, { next: { revalidate: 86400 } });
    if (!res.ok) {
      if (cachedDb) return cachedDb;
      return new Map();
    }

    const text = await res.text();
    const lines = text.split("\n");
    const db = new Map<string, VipAircraftEntry>();

    // Skip header (line 0)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const fields = parseCsvLine(line);
      if (fields.length < 10) continue;

      const category = fields[9] || "";
      if (!VIP_CATEGORIES.has(category)) continue;

      const icao24 = fields[0].toLowerCase();
      db.set(icao24, {
        icao24,
        registration: fields[1] || "",
        operator: fields[2] || "",
        type: fields[3] || "",
        icaoType: fields[4] || "",
        cmpg: fields[5] || "",
        tag1: fields[6] || "",
        tag2: fields[7] || "",
        tag3: fields[8] || "",
        category,
        link: fields[10] || "",
      });
    }

    cachedDb = db;
    lastFetchTime = now;
    console.log(`[VIP-DB] Loaded ${db.size} VIP aircraft from plane-alert-db`);
    return db;
  } catch (err) {
    console.error("[VIP-DB] Failed to load database:", err);
    if (cachedDb) return cachedDb;
    return new Map();
  }
}

/** Get a human-readable label for the VIP aircraft owner */
export function getVipLabel(entry: VipAircraftEntry): string {
  // tag2 often has the person's name for Dictator Alert / Oligarch
  if (entry.tag2 && entry.category === "Dictator Alert") return entry.tag2;
  if (entry.tag2 && entry.category === "Oligarch") return entry.tag2;
  if (entry.tag2 && entry.category === "Head of State") return entry.tag2;
  if (entry.operator) return entry.operator;
  return entry.tag1 || entry.category;
}

/** Get the priority/importance of a VIP category (lower = more important) */
export function getVipPriority(category: string): number {
  switch (category) {
    case "Head of State": return 1;
    case "Dictator Alert": return 2;
    case "Oligarch": return 3;
    case "Royal Aircraft": return 4;
    case "Governments": return 5;
    case "Da Comrade": return 6;
    case "Agency": return 7;
    default: return 10;
  }
}
