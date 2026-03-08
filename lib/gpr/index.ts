// Geopolitical Risk Index Engine
// Data: Official GPR daily index (Caldara & Iacoviello) + GDELT regional proxies

import * as XLSX from "xlsx";

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

// --- Cache ---

let cachedSnapshot: GPRSnapshot | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// --- Region config ---

const REGIONS: {
  name: string;
  query: string;
  assetExposure: string[];
}[] = [
  {
    name: "Middle East",
    query: "conflict OR military OR sanctions OR war",
    assetExposure: ["OIL", "DEFENSE", "GOLD"],
  },
  {
    name: "East Asia",
    query: "Taiwan OR China OR semiconductor OR military",
    assetExposure: ["SEMICONDUCTORS", "TECH", "CNY"],
  },
  {
    name: "Europe",
    query: "NATO OR Russia OR Ukraine OR sanctions",
    assetExposure: ["EUR", "DEFENSE", "NATURAL GAS"],
  },
  {
    name: "South Asia",
    query: "India OR Pakistan OR Kashmir OR nuclear",
    assetExposure: ["INR", "COMMODITIES"],
  },
  {
    name: "Africa",
    query: "coup OR conflict OR militia OR sanctions",
    assetExposure: ["MINING", "RARE EARTH", "OIL"],
  },
];

// --- XLS Parser ---

function parseGPRXLS(buffer: ArrayBuffer): GPRReading[] {
  try {
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    if (rows.length === 0) return [];

    // Find column names (case-insensitive)
    const firstRow = rows[0];
    const keys = Object.keys(firstRow);

    const dateKey = keys.find((k) => k.toLowerCase() === "date");
    const compositeKey = keys.find(
      (k) => k.toLowerCase() === "gprd" || k.toLowerCase() === "gpr_daily"
    );
    const threatsKey = keys.find(
      (k) =>
        k.toLowerCase() === "gprd_threats" ||
        k.toLowerCase() === "gpr_daily_threats" ||
        k.toLowerCase().includes("threat")
    );
    const actsKey = keys.find(
      (k) =>
        k.toLowerCase() === "gprd_acts" ||
        k.toLowerCase() === "gpr_daily_acts" ||
        k.toLowerCase().includes("act")
    );

    if (!dateKey || !compositeKey) {
      console.error("[GPR] Missing required columns. Available:", keys);
      return [];
    }

    const readings: GPRReading[] = [];

    for (const row of rows) {
      const dateRaw = row[dateKey];
      let dateStr: string;

      if (typeof dateRaw === "number") {
        // Excel serial date number
        const excelDate = XLSX.SSF.parse_date_code(dateRaw);
        dateStr = `${excelDate.y}-${String(excelDate.m).padStart(2, "0")}-${String(excelDate.d).padStart(2, "0")}`;
      } else if (typeof dateRaw === "string") {
        const d = new Date(dateRaw);
        dateStr = !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : dateRaw;
      } else {
        continue;
      }

      const composite = Number(row[compositeKey]);
      if (isNaN(composite)) continue;

      const threats = threatsKey ? Number(row[threatsKey]) || 0 : 0;
      const acts = actsKey ? Number(row[actsKey]) || 0 : 0;
      const ratio = acts > 0 ? threats / acts : threats > 0 ? 999 : 1;

      readings.push({
        date: dateStr,
        composite: Math.round(composite * 100) / 100,
        threats: Math.round(threats * 100) / 100,
        acts: Math.round(acts * 100) / 100,
        threatsToActsRatio: Math.round(ratio * 100) / 100,
      });
    }

    return readings;
  } catch (err) {
    console.error("[GPR] XLS parse error:", err);
    return [];
  }
}

// --- GPR XLS Fetch ---

async function fetchGPRDaily(): Promise<GPRReading[]> {
  try {
    const res = await fetch(
      "https://www.matteoiacoviello.com/gpr_files/data_gpr_daily_recent.xls",
      { next: { revalidate: 1800 } }
    );
    if (!res.ok) throw new Error(`GPR XLS fetch failed: ${res.status}`);
    const buffer = await res.arrayBuffer();
    return parseGPRXLS(buffer);
  } catch (err) {
    console.error("[GPR] Failed to fetch daily XLS:", err);
    return [];
  }
}

// --- GDELT Regional Proxy ---

async function fetchRegionalGPR(): Promise<RegionalGPR[]> {
  const results: RegionalGPR[] = [];

  for (const region of REGIONS) {
    try {
      const encodedQuery = encodeURIComponent(
        `(${region.query}) sourcelang:eng`
      );
      const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodedQuery}&mode=ArtList&maxrecords=50&format=json&timespan=7d`;

      const res = await fetch(url, {
        signal: AbortSignal.timeout(10000),
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

      // Score: normalized event count (50 articles in 7d = ~100 GPR proxy score)
      const score = Math.round((articleCount / 50) * 100);

      // Extract top event titles
      const topEvents = articles
        .slice(0, 3)
        .map((a: { title?: string }) => a.title || "Unknown event")
        .map((t: string) =>
          t.length > 80 ? t.substring(0, 77) + "..." : t
        );

      // Trend: compare first-half vs second-half of articles by date
      let trend: "rising" | "falling" | "stable" = "stable";
      if (articles.length >= 10) {
        const mid = Math.floor(articles.length / 2);
        const recentHalf = articles.slice(0, mid).length;
        const olderHalf = articles.slice(mid).length;
        if (recentHalf > olderHalf * 1.3) trend = "rising";
        else if (recentHalf < olderHalf * 0.7) trend = "falling";
      }

      results.push({
        region: region.name,
        score,
        trend,
        topEvents,
        assetExposure: region.assetExposure,
      });
    } catch (err) {
      console.error(`[GPR] GDELT fetch failed for ${region.name}:`, err);
      results.push({
        region: region.name,
        score: 0,
        trend: "stable",
        topEvents: [],
        assetExposure: region.assetExposure,
      });
    }
  }

  return results;
}

// --- Threshold Detection ---

function detectThresholdCrossings(readings: GPRReading[]): ThresholdCrossing[] {
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

  // Return most recent crossings first
  return crossings.reverse().slice(0, 10);
}

// --- Main Function ---

export async function getGPRSnapshot(): Promise<GPRSnapshot> {
  // Check cache
  if (cachedSnapshot && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedSnapshot;
  }

  // Fetch GPR CSV and GDELT in parallel
  const [gprReadings, regional] = await Promise.all([
    fetchGPRDaily(),
    fetchRegionalGPR(),
  ]);

  let history: GPRReading[];
  let current: GPRReading;

  if (gprReadings.length > 0) {
    // Sort by date descending for display, take last 30
    const sorted = [...gprReadings].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    history = sorted.slice(0, 30);
    current = history[0];
  } else {
    // Fallback: synthesize from GDELT regional scores
    const avgScore =
      regional.length > 0
        ? Math.round(
            regional.reduce((sum, r) => sum + r.score, 0) / regional.length
          )
        : 0;

    current = {
      date: new Date().toISOString().split("T")[0],
      composite: avgScore,
      threats: Math.round(avgScore * 0.6),
      acts: Math.round(avgScore * 0.4),
      threatsToActsRatio:
        avgScore > 0 ? Math.round((0.6 / 0.4) * 100) / 100 : 1,
    };
    history = [current];
  }

  const thresholdCrossings = detectThresholdCrossings(
    [...history].reverse()
  );

  const snapshot: GPRSnapshot = {
    current,
    history,
    regional,
    thresholdCrossings,
    lastUpdated: new Date().toISOString(),
  };

  cachedSnapshot = snapshot;
  cacheTimestamp = Date.now();

  return snapshot;
}
