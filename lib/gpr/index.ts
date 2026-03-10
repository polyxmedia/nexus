// Geopolitical Risk Index Engine
// Data: Official GPR daily index (Caldara & Iacoviello) + GDELT regional proxies

import ExcelJS from "exceljs";

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

// --- XLS Parser ---

async function parseGPRXLS(buffer: ArrayBuffer): Promise<GPRReading[]> {
  try {
    const workbook = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(Buffer.from(buffer) as any);
    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount === 0) return [];

    // Read header row to find column indices
    const headerRow = sheet.getRow(1);
    const headers: Record<string, number> = {};
    headerRow.eachCell((cell, colNumber) => {
      const val = String(cell.value || "").trim();
      headers[val.toLowerCase()] = colNumber;
    });

    const dateCol = headers["date"];
    const compositeCol = headers["gprd"] ?? headers["gpr_daily"];
    const threatsCol = headers["gprd_threats"] ?? headers["gpr_daily_threats"] ??
      Object.entries(headers).find(([k]) => k.includes("threat"))?.[1];
    const actsCol = headers["gprd_acts"] ?? headers["gpr_daily_acts"] ??
      Object.entries(headers).find(([k]) => k.includes("act"))?.[1];

    if (!dateCol || !compositeCol) {
      console.error("[GPR] Missing required columns. Available:", Object.keys(headers));
      return [];
    }

    const readings: GPRReading[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header

      const dateRaw = row.getCell(dateCol).value;
      let dateStr: string;

      if (dateRaw instanceof Date) {
        dateStr = dateRaw.toISOString().split("T")[0];
      } else if (typeof dateRaw === "number") {
        // Excel serial date: days since 1900-01-01 (with off-by-one for Lotus bug)
        const epoch = new Date(1899, 11, 30);
        const d = new Date(epoch.getTime() + dateRaw * 86400000);
        dateStr = d.toISOString().split("T")[0];
      } else if (typeof dateRaw === "string") {
        const d = new Date(dateRaw);
        dateStr = !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : dateRaw;
      } else {
        return;
      }

      const composite = Number(row.getCell(compositeCol).value);
      if (isNaN(composite)) return;

      const threats = threatsCol ? Number(row.getCell(threatsCol).value) || 0 : 0;
      const acts = actsCol ? Number(row.getCell(actsCol).value) || 0 : 0;
      const ratio = acts > 0 ? threats / acts : threats > 0 ? 999 : 1;

      readings.push({
        date: dateStr,
        composite: Math.round(composite * 100) / 100,
        threats: Math.round(threats * 100) / 100,
        acts: Math.round(acts * 100) / 100,
        threatsToActsRatio: Math.round(ratio * 100) / 100,
      });
    });

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
    return await parseGPRXLS(buffer);
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
        console.warn(`[GPR] GDELT ${region.name} returned ${res.status}`);
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

      // Trend: compare article tone between recent and older halves
      let trend: "rising" | "falling" | "stable" = "stable";
      if (articles.length >= 6) {
        const mid = Math.floor(articles.length / 2);
        const recentArticles = articles.slice(0, mid);
        const olderArticles = articles.slice(mid);
        // Use negative tone as proxy for escalation (lower tone = more negative = rising risk)
        const recentTone = recentArticles.reduce((s: number, a: { tone?: number }) => s + (a.tone ?? 0), 0) / recentArticles.length;
        const olderTone = olderArticles.reduce((s: number, a: { tone?: number }) => s + (a.tone ?? 0), 0) / olderArticles.length;
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
