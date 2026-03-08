import { NextResponse } from "next/server";
import {
  parseTleData,
  propagatePosition,
  extractNoradId,
  classifySatellite,
} from "@/lib/warroom/satellite-utils";
import type { SatellitePosition, SatelliteResponse } from "@/lib/warroom/types";
import { requireTier } from "@/lib/auth/require-tier";

// ── In-memory TLE cache (TLEs update ~daily, cache for 2h) ──

interface TleCache {
  data: Map<string, { name: string; line1: string; line2: string; group: string }[]>;
  timestamp: number;
}

let tleCache: TleCache | null = null;
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours

// CelesTrak TLE groups to fetch
const TLE_GROUPS: { group: string; url: string; limit: number }[] = [
  {
    group: "stations",
    url: "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle",
    limit: 10,
  },
  {
    group: "military",
    url: "https://celestrak.org/NORAD/elements/gp.php?GROUP=military&FORMAT=tle",
    limit: 80,
  },
  {
    group: "geo",
    url: "https://celestrak.org/NORAD/elements/gp.php?GROUP=geo&FORMAT=tle",
    limit: 40,
  },
  {
    group: "gps-ops",
    url: "https://celestrak.org/NORAD/elements/gp.php?GROUP=gps-ops&FORMAT=tle",
    limit: 32,
  },
  {
    group: "glo-ops",
    url: "https://celestrak.org/NORAD/elements/gp.php?GROUP=glo-ops&FORMAT=tle",
    limit: 24,
  },
  {
    group: "galileo",
    url: "https://celestrak.org/NORAD/elements/gp.php?GROUP=galileo&FORMAT=tle",
    limit: 30,
  },
  {
    group: "weather",
    url: "https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=tle",
    limit: 30,
  },
  {
    group: "starlink",
    url: "https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle",
    limit: 50,
  },
];

async function fetchTleGroup(
  group: string,
  url: string,
  limit: number
): Promise<{ name: string; line1: string; line2: string; group: string }[]> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      headers: { "User-Agent": "Nexus-WarRoom/1.0" },
    });
    if (!res.ok) return [];

    const text = await res.text();
    const records = parseTleData(text);

    return records.slice(0, limit).map((r) => ({
      ...r,
      group,
    }));
  } catch {
    return [];
  }
}

async function getAllTles(): Promise<
  { name: string; line1: string; line2: string; group: string }[]
> {
  // Check cache
  if (tleCache && Date.now() - tleCache.timestamp < CACHE_TTL) {
    const all: { name: string; line1: string; line2: string; group: string }[] = [];
    for (const records of tleCache.data.values()) {
      all.push(...records);
    }
    return all;
  }

  // Fetch all groups in parallel
  const results = await Promise.all(
    TLE_GROUPS.map((g) => fetchTleGroup(g.group, g.url, g.limit))
  );

  // Build cache
  const data = new Map<string, { name: string; line1: string; line2: string; group: string }[]>();
  TLE_GROUPS.forEach((g, i) => {
    data.set(g.group, results[i]);
  });

  tleCache = { data, timestamp: Date.now() };

  const all: { name: string; line1: string; line2: string; group: string }[] = [];
  for (const records of data.values()) {
    all.push(...records);
  }
  return all;
}

export async function GET() {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const tles = await getAllTles();
    const now = new Date();
    const satellites: SatellitePosition[] = [];

    for (const tle of tles) {
      const pos = propagatePosition(tle, now);
      if (!pos) continue;
      // Skip positions that are clearly wrong
      if (Math.abs(pos.lat) > 90 || pos.alt < 100 || pos.alt > 50000) continue;

      const noradId = extractNoradId(tle.line1);
      const { satCategory, country } = classifySatellite(tle.name, tle.group);

      satellites.push({
        name: tle.name,
        noradId,
        lat: pos.lat,
        lng: pos.lng,
        altKm: Math.round(pos.alt),
        velocityKmS: Math.round(pos.velocity * 100) / 100,
        category: satCategory,
        country,
      });
    }

    const militaryCount = satellites.filter((s) => s.category === "military").length;

    const response: SatelliteResponse = {
      satellites,
      timestamp: now.getTime(),
      totalCount: satellites.length,
      militaryCount,
    };

    return NextResponse.json(response);
  } catch {
    const empty: SatelliteResponse = {
      satellites: [],
      timestamp: Date.now(),
      totalCount: 0,
      militaryCount: 0,
    };
    return NextResponse.json(empty);
  }
}
