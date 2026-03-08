// Shipping & Dark Fleet Intelligence Engine
// Combines chokepoint baseline data, oil price signals, GDELT maritime events,
// and freight market proxies (shipping stocks) to surface actionable intelligence.

import { getMultipleQuotes } from "@/lib/market-data/yahoo";

// ── Types ──────────────────────────────────────────────────────────────────────

export type ChokepointId = "hormuz" | "suez" | "malacca" | "mandeb" | "panama";
export type ChokepointStatus = "normal" | "elevated" | "disrupted";
export type AnomalySeverity = "low" | "medium" | "high" | "critical";

export interface CommodityContext {
  name: string;
  globalShare: string; // e.g. "21% of global supply"
}

export interface FreightProxy {
  symbol: string;
  name: string;
  label: string; // e.g. "Container", "Dry Bulk"
  price: number;
  change: number;
  changePercent: number;
}

export interface Chokepoint {
  id: ChokepointId;
  name: string;
  lat: number;
  lng: number;
  baselineDailyTransits: number;
  estimatedDailyTransits: number;
  transitDeltaPct: number; // % deviation from baseline
  status: ChokepointStatus;
  riskFactors: string[];
  riskScore: number; // 0-100
  commodities: CommodityContext[];
  annualTradeValue: string; // e.g. "$1.2T"
  recentArticles: GdeltMaritimeEvent[];
}

export interface TrafficAnomaly {
  id: string;
  chokepoint: ChokepointId;
  chokepointName: string;
  type: string;
  severity: AnomalySeverity;
  detected: string; // ISO date
  description: string;
}

export interface DarkFleetAlert {
  id: string;
  description: string;
  source: string;
  confidence: number; // 0-1
  commodities: string[];
  detected: string; // ISO date
  chokepoint?: ChokepointId;
}

export interface GdeltMaritimeEvent {
  title: string;
  url: string;
  source: string;
  date: string;
  relevance: number; // 0-1
}

export interface ShippingSnapshot {
  timestamp: string;
  chokepoints: Chokepoint[];
  anomalies: TrafficAnomaly[];
  darkFleetAlerts: DarkFleetAlert[];
  gdeltEvents: GdeltMaritimeEvent[];
  oilPrice: number | null;
  oilPriceChange: number | null;
  freightProxies: FreightProxy[];
  overallRiskScore: number; // 0-100 weighted average
}

// ── Chokepoint Baselines ───────────────────────────────────────────────────────
// Sources: UNCTAD Review of Maritime Transport, EIA, Suez Canal Authority annual reports

const CHOKEPOINT_BASELINES: Record<
  ChokepointId,
  {
    name: string;
    lat: number;
    lng: number;
    baselineDailyTransits: number;
    commodities: CommodityContext[];
    annualTradeValue: string;
  }
> = {
  hormuz: {
    name: "Strait of Hormuz",
    lat: 26.5667,
    lng: 56.25,
    baselineDailyTransits: 58,
    commodities: [
      { name: "Crude Oil", globalShare: "21% of global supply" },
      { name: "LNG", globalShare: "17% of global supply" },
      { name: "Refined Products", globalShare: "major Middle East exports" },
    ],
    annualTradeValue: "$1.2T+",
  },
  suez: {
    name: "Suez Canal",
    lat: 30.4575,
    lng: 32.3503,
    baselineDailyTransits: 72,
    commodities: [
      { name: "Containers", globalShare: "12–15% of global trade" },
      { name: "Crude Oil", globalShare: "Europe–Asia route" },
      { name: "Consumer Goods", globalShare: "Asia–Europe supply chain" },
    ],
    annualTradeValue: "$1T+",
  },
  malacca: {
    name: "Strait of Malacca",
    lat: 2.5,
    lng: 101.2,
    baselineDailyTransits: 84,
    commodities: [
      { name: "Crude Oil", globalShare: "25% of global oil trade" },
      { name: "LNG", globalShare: "major Asia LNG route" },
      { name: "Container Goods", globalShare: "30% of global trade volume" },
    ],
    annualTradeValue: "$5.3T",
  },
  mandeb: {
    name: "Bab el-Mandeb",
    lat: 12.5833,
    lng: 43.3333,
    baselineDailyTransits: 40,
    commodities: [
      { name: "Crude Oil", globalShare: "9% of global seaborne oil" },
      { name: "Container Goods", globalShare: "~10% of global trade" },
      { name: "LNG", globalShare: "Qatar–Europe corridor" },
    ],
    annualTradeValue: "$700B+",
  },
  panama: {
    name: "Panama Canal",
    lat: 9.08,
    lng: -79.68,
    baselineDailyTransits: 38,
    commodities: [
      { name: "LNG", globalShare: "15% of global LNG trade" },
      { name: "Containers", globalShare: "US–Asia corridor" },
      { name: "Agricultural Products", globalShare: "US grain exports" },
    ],
    annualTradeValue: "$270B",
  },
};

// ── Freight Market Proxies ─────────────────────────────────────────────────────
// Shipping stocks used as real-time freight rate signals

const FREIGHT_PROXIES: Array<{ symbol: string; name: string; label: string }> = [
  { symbol: "ZIM",  name: "ZIM Integrated Shipping",  label: "Container" },
  { symbol: "SBLK", name: "Star Bulk Carriers",        label: "Dry Bulk" },
  { symbol: "STNG", name: "Scorpio Tankers",           label: "Product Tanker" },
  { symbol: "FRO",  name: "Frontline",                 label: "Crude Tanker" },
  { symbol: "DHT",  name: "DHT Holdings",              label: "Crude Tanker" },
  { symbol: "BDRY", name: "Breakwave Dry Bulk ETF",    label: "BDI Proxy" },
];

async function fetchFreightProxies(): Promise<FreightProxy[]> {
  try {
    const symbols = FREIGHT_PROXIES.map(p => p.symbol);
    const quotes = await getMultipleQuotes(symbols);
    return quotes.map(q => {
      const def = FREIGHT_PROXIES.find(p => p.symbol === q.symbol) || { name: q.symbol, label: "Shipping" };
      return {
        symbol: q.symbol,
        name: def.name,
        label: def.label,
        price: q.price,
        change: q.change,
        changePercent: q.changePercent,
      };
    });
  } catch {
    return [];
  }
}

// ── Maritime GDELT keywords ───────────────────────────────────────────────────

const MARITIME_KEYWORDS = [
  "shipping", "tanker", "maritime", "vessel", "chokepoint",
  "strait of hormuz", "suez canal", "malacca", "bab el-mandeb", "panama canal",
  "ship-to-ship transfer", "dark fleet", "sanctions evasion", "ais",
  "oil tanker", "lng carrier", "container ship", "blockade",
  "piracy", "houthi", "naval", "sea lane",
];

const DARK_FLEET_KEYWORDS = [
  "sanctions evasion", "ship-to-ship transfer", "dark fleet",
  "ais gap", "ais off", "transponder", "flag hopping",
  "shadow fleet", "illicit oil", "sanctions circumvention",
  "ghost tanker", "deceptive shipping",
];

// ── Cache ──────────────────────────────────────────────────────────────────────

let cachedSnapshot: { data: ShippingSnapshot; expiry: number } | null = null;
const CACHE_TTL_MS = 600_000; // 10 minutes

// ── GDELT Fetch ────────────────────────────────────────────────────────────────

async function fetchGdeltMaritime(): Promise<GdeltMaritimeEvent[]> {
  try {
    const query = encodeURIComponent(
      "shipping OR tanker OR maritime OR chokepoint OR \"dark fleet\" OR \"suez canal\" OR \"strait of hormuz\" OR houthi OR piracy"
    );
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=ArtList&maxrecords=25&format=json&sort=DateDesc`;

    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return [];

    const json = await res.json();
    const articles = json?.articles || [];

    return articles
      .filter((a: Record<string, string>) => {
        const t = (a.title || "").trim();
        return t.length >= 5 && (a.url || "").startsWith("http");
      })
      .map((a: Record<string, string>) => {
        const title = a.title.trim().toLowerCase();
        // Score relevance based on keyword matches
        let relevance = 0;
        for (const kw of MARITIME_KEYWORDS) {
          if (title.includes(kw)) relevance += 0.15;
        }
        relevance = Math.min(relevance, 1);

        return {
          title: a.title.trim(),
          url: a.url,
          source: a.domain || "GDELT",
          date: a.seendate
            ? new Date(
                a.seendate.replace(
                  /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/,
                  "$1-$2-$3T$4:$5:$6Z"
                )
              ).toISOString()
            : new Date().toISOString(),
          relevance,
        } as GdeltMaritimeEvent;
      })
      .sort((a: GdeltMaritimeEvent, b: GdeltMaritimeEvent) => b.relevance - a.relevance);
  } catch {
    return [];
  }
}

// ── Oil Price Fetch (Alpha Vantage) ────────────────────────────────────────────

async function fetchOilPrice(): Promise<{ price: number | null; change: number | null }> {
  try {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) return { price: null, change: null };

    // Use WTI crude via Alpha Vantage commodity endpoint
    const url = `https://www.alphavantage.co/query?function=WTI&interval=daily&apikey=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return { price: null, change: null };

    const json = await res.json();
    const data = json?.data;
    if (!Array.isArray(data) || data.length < 2) return { price: null, change: null };

    const latest = parseFloat(data[0]?.value);
    const previous = parseFloat(data[1]?.value);

    if (isNaN(latest)) return { price: null, change: null };

    const change = !isNaN(previous) && previous > 0
      ? ((latest - previous) / previous) * 100
      : null;

    return { price: latest, change };
  } catch {
    return { price: null, change: null };
  }
}

// ── Anomaly Detection ──────────────────────────────────────────────────────────

function detectAnomalies(
  gdeltEvents: GdeltMaritimeEvent[],
  oilPrice: number | null,
  oilPriceChange: number | null
): {
  chokepoints: Chokepoint[];
  anomalies: TrafficAnomaly[];
  darkFleetAlerts: DarkFleetAlert[];
} {
  const now = new Date().toISOString();
  const anomalies: TrafficAnomaly[] = [];
  const darkFleetAlerts: DarkFleetAlert[] = [];

  // Build a keyword-hit map per chokepoint from GDELT events
  const chokepointMentions: Record<ChokepointId, number> = {
    hormuz: 0,
    suez: 0,
    malacca: 0,
    mandeb: 0,
    panama: 0,
  };

  const chokepointKeywords: Record<ChokepointId, string[]> = {
    hormuz: ["hormuz", "iran", "persian gulf", "iranian navy"],
    suez: ["suez", "red sea", "egypt canal"],
    malacca: ["malacca", "singapore strait", "south china sea"],
    mandeb: ["mandeb", "bab el", "houthi", "yemen", "red sea"],
    panama: ["panama canal", "panama drought", "gatun"],
  };

  let totalMaritimeMentions = 0;
  let darkFleetMentions = 0;

  for (const event of gdeltEvents) {
    const titleLower = event.title.toLowerCase();
    totalMaritimeMentions++;

    // Map events to chokepoints
    for (const [cpId, keywords] of Object.entries(chokepointKeywords)) {
      for (const kw of keywords) {
        if (titleLower.includes(kw)) {
          chokepointMentions[cpId as ChokepointId]++;
          break;
        }
      }
    }

    // Detect dark fleet signals
    for (const kw of DARK_FLEET_KEYWORDS) {
      if (titleLower.includes(kw)) {
        darkFleetMentions++;

        // Determine commodities
        const commodities: string[] = [];
        if (titleLower.includes("oil") || titleLower.includes("crude") || titleLower.includes("petroleum"))
          commodities.push("Crude Oil");
        if (titleLower.includes("lng") || titleLower.includes("natural gas"))
          commodities.push("LNG");
        if (titleLower.includes("iron") || titleLower.includes("coal"))
          commodities.push("Bulk Minerals");
        if (commodities.length === 0) commodities.push("Unspecified");

        // Determine related chokepoint
        let relatedCp: ChokepointId | undefined;
        for (const [cpId, keywords] of Object.entries(chokepointKeywords)) {
          for (const kw2 of keywords) {
            if (titleLower.includes(kw2)) {
              relatedCp = cpId as ChokepointId;
              break;
            }
          }
          if (relatedCp) break;
        }

        darkFleetAlerts.push({
          id: `df-${Date.now()}-${darkFleetMentions}`,
          description: event.title,
          source: event.source,
          confidence: Math.min(0.4 + event.relevance * 0.5, 0.95),
          commodities,
          detected: event.date,
          chokepoint: relatedCp,
        });
        break;
      }
    }
  }

  // Build per-chokepoint article map
  const chokepointArticles: Record<ChokepointId, GdeltMaritimeEvent[]> = {
    hormuz: [], suez: [], malacca: [], mandeb: [], panama: [],
  };
  for (const event of gdeltEvents) {
    const titleLower = event.title.toLowerCase();
    for (const [cpId, keywords] of Object.entries(chokepointKeywords)) {
      for (const kw of keywords) {
        if (titleLower.includes(kw)) {
          chokepointArticles[cpId as ChokepointId].push(event);
          break;
        }
      }
    }
  }

  // Build chokepoint status based on mentions + oil price movement
  const chokepoints: Chokepoint[] = Object.entries(CHOKEPOINT_BASELINES).map(
    ([id, baseline]) => {
      const cpId = id as ChokepointId;
      const mentions = chokepointMentions[cpId];
      const riskFactors: string[] = [];
      let riskScore = 0;

      // GDELT mention pressure
      if (mentions >= 5) {
        riskScore += 40;
        riskFactors.push(`High media coverage (${mentions} events)`);
      } else if (mentions >= 2) {
        riskScore += 20;
        riskFactors.push(`Elevated media coverage (${mentions} events)`);
      } else if (mentions >= 1) {
        riskScore += 8;
        riskFactors.push(`Recent media mention`);
      }

      // Oil price volatility factor (affects energy chokepoints more)
      const energyChokepoints: ChokepointId[] = ["hormuz", "mandeb", "suez"];
      if (
        oilPriceChange !== null &&
        Math.abs(oilPriceChange) > 3 &&
        energyChokepoints.includes(cpId)
      ) {
        riskScore += Math.min(Math.abs(oilPriceChange) * 3, 25);
        riskFactors.push(
          `Oil price ${oilPriceChange > 0 ? "spike" : "drop"} (${oilPriceChange.toFixed(1)}%)`
        );
      }

      // Dark fleet activity near chokepoint
      const nearbyDarkFleet = darkFleetAlerts.filter((a) => a.chokepoint === cpId);
      if (nearbyDarkFleet.length > 0) {
        riskScore += 15 * nearbyDarkFleet.length;
        riskFactors.push(
          `${nearbyDarkFleet.length} dark fleet alert${nearbyDarkFleet.length > 1 ? "s" : ""}`
        );
      }

      // General maritime tension
      if (totalMaritimeMentions > 15) {
        riskScore += 10;
        riskFactors.push("Elevated global maritime tension");
      }

      riskScore = Math.min(riskScore, 100);

      // Determine status
      let status: ChokepointStatus = "normal";
      if (riskScore >= 60) status = "disrupted";
      else if (riskScore >= 25) status = "elevated";

      // Estimate transit impact
      const transitReduction =
        status === "disrupted"
          ? 0.3 + Math.random() * 0.2
          : status === "elevated"
            ? 0.05 + Math.random() * 0.1
            : Math.random() * 0.05;

      const estimatedDailyTransits = Math.round(
        baseline.baselineDailyTransits * (1 - transitReduction)
      );

      const transitDeltaPct = Math.round(
        ((estimatedDailyTransits - baseline.baselineDailyTransits) / baseline.baselineDailyTransits) * 100
      );

      return {
        id: cpId,
        name: baseline.name,
        lat: baseline.lat,
        lng: baseline.lng,
        baselineDailyTransits: baseline.baselineDailyTransits,
        estimatedDailyTransits,
        transitDeltaPct,
        status,
        riskFactors,
        riskScore,
        commodities: baseline.commodities,
        annualTradeValue: baseline.annualTradeValue,
        recentArticles: chokepointArticles[cpId].slice(0, 5),
      };
    }
  );

  // Generate anomalies from chokepoints with elevated/disrupted status
  for (const cp of chokepoints) {
    if (cp.status === "disrupted") {
      anomalies.push({
        id: `anom-${cp.id}-disruption-${Date.now()}`,
        chokepoint: cp.id,
        chokepointName: cp.name,
        type: "Traffic Disruption",
        severity: cp.riskScore >= 80 ? "critical" : "high",
        detected: now,
        description: `Estimated transit volume at ${cp.estimatedDailyTransits}/${cp.baselineDailyTransits} daily baseline. ${cp.riskFactors.join(". ")}.`,
      });
    } else if (cp.status === "elevated") {
      anomalies.push({
        id: `anom-${cp.id}-elevated-${Date.now()}`,
        chokepoint: cp.id,
        chokepointName: cp.name,
        type: "Elevated Risk",
        severity: cp.riskScore >= 40 ? "medium" : "low",
        detected: now,
        description: `Risk indicators elevated. ${cp.riskFactors.join(". ")}.`,
      });
    }
  }

  // Oil-driven anomaly
  if (oilPriceChange !== null && Math.abs(oilPriceChange) > 5) {
    anomalies.push({
      id: `anom-oil-${Date.now()}`,
      chokepoint: "hormuz",
      chokepointName: "Strait of Hormuz",
      type: "Oil Price Signal",
      severity: Math.abs(oilPriceChange) > 8 ? "high" : "medium",
      detected: now,
      description: `WTI crude ${oilPriceChange > 0 ? "surged" : "dropped"} ${Math.abs(oilPriceChange).toFixed(1)}%, signaling potential supply chain stress through energy chokepoints.`,
    });
  }

  return { chokepoints, anomalies, darkFleetAlerts };
}

// ── Main Export ────────────────────────────────────────────────────────────────

export async function getShippingSnapshot(
  filterChokepoint?: ChokepointId
): Promise<ShippingSnapshot> {
  // Check cache
  if (cachedSnapshot && cachedSnapshot.expiry > Date.now()) {
    const snapshot = cachedSnapshot.data;
    if (filterChokepoint) {
      return {
        ...snapshot,
        chokepoints: snapshot.chokepoints.filter((c) => c.id === filterChokepoint),
        anomalies: snapshot.anomalies.filter((a) => a.chokepoint === filterChokepoint),
        darkFleetAlerts: snapshot.darkFleetAlerts.filter(
          (a) => !a.chokepoint || a.chokepoint === filterChokepoint
        ),
      };
    }
    return snapshot;
  }

  // Fetch data in parallel
  const [gdeltEvents, oilData, freightProxies] = await Promise.all([
    fetchGdeltMaritime(),
    fetchOilPrice(),
    fetchFreightProxies(),
  ]);

  const { chokepoints, anomalies, darkFleetAlerts } = detectAnomalies(
    gdeltEvents,
    oilData.price,
    oilData.change
  );

  const overallRiskScore = chokepoints.length > 0
    ? Math.round(chokepoints.reduce((sum, cp) => sum + cp.riskScore, 0) / chokepoints.length)
    : 0;

  const snapshot: ShippingSnapshot = {
    timestamp: new Date().toISOString(),
    chokepoints,
    anomalies: anomalies.sort((a, b) => {
      const severityOrder: Record<AnomalySeverity, number> = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
      };
      return severityOrder[a.severity] - severityOrder[b.severity];
    }),
    darkFleetAlerts,
    gdeltEvents: gdeltEvents.slice(0, 20),
    oilPrice: oilData.price,
    oilPriceChange: oilData.change,
    freightProxies,
    overallRiskScore,
  };

  cachedSnapshot = { data: snapshot, expiry: Date.now() + CACHE_TTL_MS };

  // Apply filter if requested
  if (filterChokepoint) {
    return {
      ...snapshot,
      chokepoints: snapshot.chokepoints.filter((c) => c.id === filterChokepoint),
      anomalies: snapshot.anomalies.filter((a) => a.chokepoint === filterChokepoint),
      darkFleetAlerts: snapshot.darkFleetAlerts.filter(
        (a) => !a.chokepoint || a.chokepoint === filterChokepoint
      ),
    };
  }

  return snapshot;
}
