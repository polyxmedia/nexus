// Geopolitical Risk Index Engine
// GPR readings are pre-ingested into the gpr_readings table via /api/gpr/ingest.
// This module reads from postgres (fast) and fetches GDELT regional proxies (cached).

import { db, schema } from "@/lib/db";
import { desc } from "drizzle-orm";

export interface GPRReading {
  date: string;
  composite: number;
  threats: number;
  acts: number;
  threatsToActsRatio: number;
}

export interface RegionalGPR {
  region: string;
  score: number;
  trend: "rising" | "falling" | "stable";
  topEvents: string[];
  assetExposure: string[];
}

export interface ThresholdCrossing {
  date: string;
  level: "elevated" | "crisis" | "extreme";
  value: number;
  direction: "crossed_above" | "crossed_below";
}

export interface GPRSnapshot {
  current: GPRReading;
  history: GPRReading[];
  regional: RegionalGPR[];
  thresholdCrossings: ThresholdCrossing[];
  lastUpdated: string;
}

// --- GDELT Cache ---

let cachedRegional: RegionalGPR[] | null = null;
let regionalCacheTimestamp = 0;
const REGIONAL_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// --- Region config ---

const REGIONS: {
  name: string;
  query: string;
  assetExposure: string[];
}[] = [
  {
    name: "Middle East",
    query: "(Iran OR Iraq OR Syria OR Israel OR Gaza OR Yemen OR Saudi OR Lebanon) (conflict OR military OR sanctions OR war OR strike)",
    assetExposure: ["OIL", "DEFENSE", "GOLD"],
  },
  {
    name: "East Asia",
    query: "(Taiwan OR China OR Japan OR Korea) (military OR semiconductor OR trade OR sanctions OR navy)",
    assetExposure: ["SEMICONDUCTORS", "TECH", "CNY"],
  },
  {
    name: "Europe",
    query: "(NATO OR Russia OR Ukraine OR EU) (war OR sanctions OR military OR energy OR frontline)",
    assetExposure: ["EUR", "DEFENSE", "NATURAL GAS"],
  },
  {
    name: "South Asia",
    query: "(India OR Pakistan OR Kashmir) (military OR nuclear OR border OR tensions)",
    assetExposure: ["INR", "COMMODITIES"],
  },
  {
    name: "Africa",
    query: "(Sudan OR Niger OR Mali OR Congo OR Ethiopia OR Libya) (coup OR conflict OR militia OR war OR sanctions)",
    assetExposure: ["MINING", "RARE EARTH", "OIL"],
  },
];

// --- GDELT Regional Proxy ---

async function fetchRegionalGPR(): Promise<RegionalGPR[]> {
  // Return cache if fresh
  if (cachedRegional && Date.now() - regionalCacheTimestamp < REGIONAL_CACHE_TTL) {
    return cachedRegional;
  }

  const results: RegionalGPR[] = [];

  for (let idx = 0; idx < REGIONS.length; idx++) {
    const region = REGIONS[idx];

    if (idx > 0) {
      await new Promise((resolve) => setTimeout(resolve, 5500));
    }

    try {
      const encodedQuery = encodeURIComponent(
        `(${region.query}) sourcelang:eng`
      );
      const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodedQuery}&mode=ArtList&maxrecords=50&format=json&timespan=7d`;

      const res = await fetch(url, {
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        results.push({
          region: region.name,
          score: 0,
          trend: "stable",
          topEvents: [],
          assetExposure: region.assetExposure,
        });
        continue;
      }

      const data = await res.json();
      const articles = data?.articles || [];
      const articleCount = articles.length;
      const score = Math.round((articleCount / 50) * 100);

      const topEvents = articles
        .slice(0, 3)
        .map((a: { title?: string }) => a.title || "Unknown event")
        .map((t: string) =>
          t.length > 80 ? t.substring(0, 77) + "..." : t
        );

      let trend: "rising" | "falling" | "stable" = "stable";
      if (articles.length >= 6) {
        const mid = Math.floor(articles.length / 2);
        const recentArticles = articles.slice(0, mid);
        const olderArticles = articles.slice(mid);
        const recentTone =
          recentArticles.reduce(
            (s: number, a: { tone?: number }) => s + (a.tone ?? 0),
            0
          ) / recentArticles.length;
        const olderTone =
          olderArticles.reduce(
            (s: number, a: { tone?: number }) => s + (a.tone ?? 0),
            0
          ) / olderArticles.length;
        if (recentTone < olderTone - 1) trend = "rising";
        else if (recentTone > olderTone + 1) trend = "falling";
      }

      results.push({
        region: region.name,
        score,
        trend,
        topEvents,
        assetExposure: region.assetExposure,
      });
    } catch {
      results.push({
        region: region.name,
        score: 0,
        trend: "stable",
        topEvents: [],
        assetExposure: region.assetExposure,
      });
    }
  }

  cachedRegional = results;
  regionalCacheTimestamp = Date.now();
  return results;
}

// --- Threshold Detection ---

function detectThresholdCrossings(
  readings: GPRReading[]
): ThresholdCrossing[] {
  const thresholds = [
    { level: "elevated" as const, value: 150 },
    { level: "crisis" as const, value: 200 },
    { level: "extreme" as const, value: 300 },
  ];

  const crossings: ThresholdCrossing[] = [];

  for (let i = 1; i < readings.length; i++) {
    const prev = readings[i - 1];
    const curr = readings[i];

    for (const t of thresholds) {
      if (prev.composite < t.value && curr.composite >= t.value) {
        crossings.push({
          date: curr.date,
          level: t.level,
          value: curr.composite,
          direction: "crossed_above",
        });
      } else if (prev.composite >= t.value && curr.composite < t.value) {
        crossings.push({
          date: curr.date,
          level: t.level,
          value: curr.composite,
          direction: "crossed_below",
        });
      }
    }
  }

  return crossings.reverse().slice(0, 10);
}

// --- Main Function ---

export async function getGPRSnapshot(): Promise<GPRSnapshot> {
  // Read last 30 days from postgres (fast indexed query)
  // Regional GDELT proxies use cached data if available, otherwise return empty
  // (the sequential GDELT fetches take 22s+ on cold cache which blows past chat timeouts)
  const rows = await db
    .select()
    .from(schema.gprReadings)
    .orderBy(desc(schema.gprReadings.date))
    .limit(30);

  // Use cached regional data if we have it, otherwise return empty and trigger background refresh
  let regional: RegionalGPR[];
  if (cachedRegional && Date.now() - regionalCacheTimestamp < REGIONAL_CACHE_TTL) {
    regional = cachedRegional;
  } else {
    // Return empty for now, kick off background refresh
    regional = REGIONS.map((r) => ({
      region: r.name,
      score: 0,
      trend: "stable" as const,
      topEvents: [],
      assetExposure: r.assetExposure,
    }));
    fetchRegionalGPR().catch(() => {});
  }

  let history: GPRReading[];
  let current: GPRReading;

  if (rows.length > 0) {
    history = rows.map((r) => ({
      date: r.date,
      composite: r.composite,
      threats: r.threats,
      acts: r.acts,
      threatsToActsRatio: r.threatsToActsRatio,
    }));
    current = history[0];
  } else {
    // No data ingested yet - return empty state
    current = {
      date: new Date().toISOString().split("T")[0],
      composite: 0,
      threats: 0,
      acts: 0,
      threatsToActsRatio: 1,
    };
    history = [current];
  }

  const thresholdCrossings = detectThresholdCrossings([...history].reverse());

  return {
    current,
    history,
    regional,
    thresholdCrossings,
    lastUpdated: rows[0]?.createdAt || new Date().toISOString(),
  };
}
