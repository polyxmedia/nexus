import { NextRequest, NextResponse } from "next/server";
import type { AircraftState, AircraftResponse } from "@/lib/warroom/types";
import { requireTier } from "@/lib/auth/require-tier";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

const MILITARY_CALLSIGN_PREFIXES = [
  "RCH",    // USAF Air Mobility Command
  "RRR",    // RAF
  "CNV",    // US Navy
  "FORTE",  // RQ-4 Global Hawk
  "JAKE",   // RC-135 Rivet Joint
  "NATO",   // NATO
  "DUKE",   // USAF Special Ops
  "EVAC",   // Medical Evacuation
  "CASA",   // Spanish Air Force
  "IAM",    // Italian Air Force
  "GAF",    // German Air Force
  "FAF",    // French Air Force
  "PLF",    // Polish Air Force
  "TUAF",   // Turkish Air Force
  "SHF",    // Swedish Air Force
  "HRZ",    // Croatian Air Force
  "BAF",    // Belgian Air Force
  "HAF",    // Hellenic Air Force
  "RFR",    // French Air Force (alt)
  "LAGR",   // USAF tanker
  "NCHO",   // NATO AWACS
  "HOMER",  // P-8 Poseidon
  "TOPCAT", // E-6B Mercury
];

// Strategic bounding boxes covering key military/geopolitical regions
// OpenSky /states/all?lamin=..&lomin=..&lamax=..&lomax=.. returns much smaller payloads
const REGIONS: Array<{ name: string; lamin: number; lomin: number; lamax: number; lomax: number }> = [
  { name: "europe",     lamin: 35, lomin: -12, lamax: 72, lomax: 45 },
  { name: "middle-east", lamin: 12, lomin: 25,  lamax: 42, lomax: 65 },
  { name: "east-asia",  lamin: 18, lomin: 95,  lamax: 50, lomax: 150 },
  { name: "north-america", lamin: 24, lomin: -130, lamax: 55, lomax: -60 },
];

function isMilitaryCallsign(callsign: string): boolean {
  const cs = callsign.trim().toUpperCase();
  return MILITARY_CALLSIGN_PREFIXES.some((prefix) => cs.startsWith(prefix));
}

const EMPTY_RESPONSE: AircraftResponse = {
  aircraft: [],
  timestamp: Date.now(),
  totalCount: 0,
  militaryCount: 0,
};

// ── OpenSky Basic Auth ──
// Without auth, Vercel shared IPs get rate-limited or rejected.
// Authenticated requests get 4,000+ credits/day.
// OpenSky uses HTTP Basic Authentication (username:password), not OAuth2.

function getOpenSkyAuth(): string | null {
  const username = process.env.OPENSKY_USERNAME;
  const password = process.env.OPENSKY_PASSWORD;
  if (!username || !password) return null;
  return Buffer.from(`${username}:${password}`).toString("base64");
}

function openSkyHeaders(auth: string | null): Record<string, string> {
  if (!auth) return {};
  return { Authorization: `Basic ${auth}` };
}

// DB-backed cache (survives Vercel serverless cold starts)
const CACHE_KEY = "warroom:aircraft:cache";
const CACHE_TTL = 120_000; // 2 minutes

// In-memory hot layer (avoids DB read on every request within same instance)
let memCache: { data: AircraftResponse; timestamp: number } | null = null;

async function getCachedAircraft(): Promise<AircraftResponse | null> {
  // Check memory first
  if (memCache && Date.now() - memCache.timestamp < CACHE_TTL) {
    return memCache.data;
  }
  // Check DB
  try {
    const rows = await db.select().from(schema.settings).where(eq(schema.settings.key, CACHE_KEY));
    if (rows.length === 0) return null;
    const parsed = JSON.parse(rows[0].value);
    if (!parsed.timestamp || Date.now() - parsed.timestamp > CACHE_TTL) return null;
    memCache = { data: parsed.data, timestamp: parsed.timestamp };
    return parsed.data as AircraftResponse;
  } catch {
    return null;
  }
}

async function setCachedAircraft(data: AircraftResponse): Promise<void> {
  memCache = { data, timestamp: Date.now() };
  const value = JSON.stringify({ data, timestamp: Date.now() });
  try {
    await db.insert(schema.settings)
      .values({ key: CACHE_KEY, value, updatedAt: new Date().toISOString() })
      .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date().toISOString() } });
  } catch {
    // Cache write failure is non-critical
  }
}

async function fetchRegion(
  region: { name: string; lamin: number; lomin: number; lamax: number; lomax: number },
  token: string | null
): Promise<unknown[][] | null> {
  const url = `https://opensky-network.org/api/states/all?lamin=${region.lamin}&lomin=${region.lomin}&lamax=${region.lamax}&lomax=${region.lomax}`;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: openSkyHeaders(token),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.error(`[Aircraft] OpenSky ${region.name} returned ${res.status}`);
      return null;
    }
    const data = await res.json();
    return data.states || [];
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const tierCheck = await requireTier("free");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    // Check if client sent a specific bounding box
    const { searchParams } = new URL(request.url);
    const lamin = searchParams.get("lamin");
    const lomin = searchParams.get("lomin");
    const lamax = searchParams.get("lamax");
    const lomax = searchParams.get("lomax");

    // Serve from cache if fresh (protects against OpenSky rate limiting on Vercel shared IPs)
    if (!lamin) {
      const cached = await getCachedAircraft();
      if (cached) return NextResponse.json(cached);
    }

    // Get Basic Auth credentials (falls back to anonymous if not configured)
    const auth = getOpenSkyAuth();

    let allStates: unknown[][] = [];

    if (lamin && lomin && lamax && lomax) {
      // Client-specified viewport bounds, single request
      const url = `https://opensky-network.org/api/states/all?lamin=${encodeURIComponent(lamin)}&lomin=${encodeURIComponent(lomin)}&lamax=${encodeURIComponent(lamax)}&lomax=${encodeURIComponent(lomax)}`;
      const res = await fetch(url, {
        cache: "no-store",
        headers: openSkyHeaders(auth),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        return NextResponse.json({ ...EMPTY_RESPONSE, error: "upstream_unavailable" });
      }
      const data = await res.json();
      allStates = data.states || [];
    } else {
      // No bounds specified, fetch strategic regions in parallel
      const results = await Promise.allSettled(REGIONS.map((r) => fetchRegion(r, auth)));

      // Deduplicate by icao24 (index 0) since regions may overlap
      const seen = new Set<string>();
      for (const result of results) {
        if (result.status !== "fulfilled" || !result.value) continue;
        for (const s of result.value) {
          const icao = s[0] as string;
          if (!seen.has(icao)) {
            seen.add(icao);
            allStates.push(s);
          }
        }
      }

      // If all regions failed, try the global endpoint as fallback
      if (allStates.length === 0) {
        try {
          const res = await fetch("https://opensky-network.org/api/states/all", {
            cache: "no-store",
            headers: openSkyHeaders(auth),
            signal: AbortSignal.timeout(20_000),
          });
          if (res.ok) {
            const data = await res.json();
            allStates = data.states || [];
          }
        } catch {
          // Global fallback also failed
        }
      }
    }

    if (allStates.length === 0) {
      // Serve stale DB cache if available, better than empty map
      try {
        const rows = await db.select().from(schema.settings).where(eq(schema.settings.key, CACHE_KEY));
        if (rows.length > 0) {
          const stale = JSON.parse(rows[0].value);
          if (stale.data) return NextResponse.json({ ...stale.data, stale: true });
        }
      } catch { /* fall through */ }
      return NextResponse.json({ ...EMPTY_RESPONSE, error: "upstream_unavailable" });
    }

    const aircraft: AircraftState[] = [];
    let militaryCount = 0;

    for (const s of allStates) {
      const lat = s[6] as number | null;
      const lng = s[5] as number | null;
      const onGround = s[8] as boolean;
      const callsign = ((s[1] as string) || "").trim();

      if (lat == null || lng == null || onGround) continue;

      const mil = isMilitaryCallsign(callsign);
      if (mil) militaryCount++;

      aircraft.push({
        icao24: s[0] as string,
        callsign,
        originCountry: (s[2] as string) || "",
        lat,
        lng,
        altitude: (s[7] as number) || 0,
        velocity: (s[9] as number) || 0,
        heading: (s[10] as number) || 0,
        onGround: false,
        isMilitary: mil,
      });
    }

    const response: AircraftResponse = {
      aircraft,
      timestamp: Date.now(),
      totalCount: aircraft.length,
      militaryCount,
    };

    // Cache to DB (survives Vercel cold starts)
    if (!lamin) {
      setCachedAircraft(response).catch(() => {});
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Aircraft API error:", error);
    return NextResponse.json({ ...EMPTY_RESPONSE, error: "fetch_failed" });
  }
}
