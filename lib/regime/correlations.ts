// Correlation Monitoring Engine
// Tracks rolling correlations between asset pairs and detects
// when correlations break from historical norms.

import { getDailySeries, type DailyBar } from "@/lib/market-data/provider";
import { getFredSeries } from "@/lib/market-data/fred";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { saveRegimeState, loadRegimeState, appendToHistory } from "./store";

export interface CorrelationPair {
  pair: [string, string];
  labels: [string, string];
  current20d: number | null;
  current60d: number | null;
  historicalMean: number;
  historicalStd: number;
  deviation: number; // in standard deviations from mean
  significance: "normal" | "notable" | "significant" | "extreme";
  interpretation: string;
  normalRange: string; // e.g. "normally -0.6 to -0.3"
}

export interface CorrelationMatrix {
  timestamp: string;
  pairs: CorrelationPair[];
  breaks: CorrelationBreak[];
  overallStress: number; // 0-100, how many correlations are breaking
}

export interface CorrelationBreak {
  pair: [string, string];
  labels: [string, string];
  current: number;
  historical: number;
  deviation: number;
  significance: "notable" | "significant" | "extreme";
  interpretation: string;
}

// Predefined correlation pairs with historical norms
const CORRELATION_PAIRS: Array<{
  symbols: [string, string];
  labels: [string, string];
  source: "alpha-vantage" | "fred";
  fredIds?: [string, string];
  historicalMean: number;
  historicalStd: number;
  normalInterpretation: string;
  breakInterpretation: string;
}> = [
  {
    symbols: ["SPY", "TLT"],
    labels: ["S&P 500", "Long Treasuries"],
    source: "alpha-vantage",
    historicalMean: -0.35,
    historicalStd: 0.25,
    normalInterpretation: "Equity-bond negative correlation provides portfolio diversification",
    breakInterpretation: "Equity-bond correlation turning positive signals potential regime shift. Both assets falling together indicates inflation fears or liquidity crisis. Both rising together suggests goldilocks conditions.",
  },
  {
    symbols: ["GLD", "DXY"],
    labels: ["Gold", "US Dollar"],
    source: "fred",
    fredIds: ["GOLDAMGBD228NLBM", "DTWEXBGS"],
    historicalMean: -0.4,
    historicalStd: 0.2,
    normalInterpretation: "Gold and dollar move inversely as competing safe havens",
    breakInterpretation: "Gold and dollar rising together is an extreme risk-off signal. Markets seeking safety in both hard assets and reserve currency simultaneously.",
  },
  {
    symbols: ["USO", "XLE"],
    labels: ["Crude Oil", "Energy Stocks"],
    source: "alpha-vantage",
    historicalMean: 0.7,
    historicalStd: 0.15,
    normalInterpretation: "Energy stocks track oil prices closely",
    breakInterpretation: "Energy stocks diverging from oil signals either supply disruption fears (oil up, stocks down) or structural energy transition concerns.",
  },
  {
    symbols: ["VIX", "SPY"],
    labels: ["VIX", "S&P 500"],
    source: "alpha-vantage",
    historicalMean: -0.78,
    historicalStd: 0.12,
    normalInterpretation: "Strong inverse relationship between fear gauge and equities",
    breakInterpretation: "Weakening VIX-SPY correlation indicates complacency. Market rising while VIX stays elevated signals underlying stress not reflected in equity prices.",
  },
  {
    symbols: ["EEM", "SPY"],
    labels: ["Emerging Markets", "S&P 500"],
    source: "alpha-vantage",
    historicalMean: 0.65,
    historicalStd: 0.2,
    normalInterpretation: "EM and US equities generally move together in risk-on/off cycles",
    breakInterpretation: "EM decoupling from US equities signals dollar stress, capital flight from emerging markets, or regional crisis. Watch for contagion risk.",
  },
  {
    symbols: ["GDX", "GLD"],
    labels: ["Gold Miners", "Gold"],
    source: "alpha-vantage",
    historicalMean: 0.75,
    historicalStd: 0.15,
    normalInterpretation: "Miners provide leveraged exposure to gold price",
    breakInterpretation: "Miners lagging gold suggests equity market stress overriding gold beta. Miners leading gold suggests speculative momentum building.",
  },
  {
    symbols: ["HYG", "TLT"],
    labels: ["High Yield Bonds", "Treasuries"],
    source: "alpha-vantage",
    historicalMean: -0.2,
    historicalStd: 0.3,
    normalInterpretation: "Credit and duration have mild negative correlation in normal conditions",
    breakInterpretation: "Both HY and treasuries falling signals broad fixed income liquidation. Both rising indicates aggressive rate-cut expectations alongside credit improvement.",
  },
  {
    symbols: ["COPPER", "OIL"],
    labels: ["Copper", "Crude Oil"],
    source: "fred",
    fredIds: ["PCOPPUSDM", "DCOILWTICO"],
    historicalMean: 0.5,
    historicalStd: 0.25,
    normalInterpretation: "Industrial metals and energy commodities track global demand",
    breakInterpretation: "Copper falling while oil rises signals supply-side oil shock rather than demand-driven move. Copper leading oil down signals global slowdown.",
  },
];

// Calculate Pearson correlation coefficient
export function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 5) return 0;

  const xSlice = x.slice(-n);
  const ySlice = y.slice(-n);

  const meanX = xSlice.reduce((a, b) => a + b, 0) / n;
  const meanY = ySlice.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = xSlice[i] - meanX;
    const dy = ySlice[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

// Convert daily bars to return series
function toReturns(bars: DailyBar[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    if (bars[i - 1].close !== 0) {
      returns.push((bars[i].close - bars[i - 1].close) / bars[i - 1].close);
    }
  }
  return returns;
}

// Get FRED series as returns
function fredToReturns(points: Array<{ value: number }>): number[] {
  const returns: number[] = [];
  for (let i = 1; i < points.length; i++) {
    if (points[i - 1].value !== 0) {
      returns.push((points[i].value - points[i - 1].value) / Math.abs(points[i - 1].value));
    }
  }
  return returns;
}

// Get API key from settings
async function getAlphaVantageKey(): Promise<string | null> {
  try {
    const rows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "alpha_vantage_api_key"))
      .limit(1);
    return rows[0]?.value || process.env.ALPHA_VANTAGE_API_KEY || null;
  } catch {
    return process.env.ALPHA_VANTAGE_API_KEY || null;
  }
}

async function fetchPairData(
  pair: typeof CORRELATION_PAIRS[number]
): Promise<{ returns1: number[]; returns2: number[] } | null> {
  try {
    if (pair.source === "fred" && pair.fredIds) {
      const [data1, data2] = await Promise.all([
        getFredSeries(pair.fredIds[0], 100),
        getFredSeries(pair.fredIds[1], 100),
      ]);
      return {
        returns1: fredToReturns(data1),
        returns2: fredToReturns(data2),
      };
    }

    const apiKey = await getAlphaVantageKey();
    if (!apiKey) return null;

    // Stagger to avoid rate limits
    const bars1 = await getDailySeries(pair.symbols[0], apiKey);
    await new Promise(r => setTimeout(r, 1500));
    const bars2 = await getDailySeries(pair.symbols[1], apiKey);

    return {
      returns1: toReturns(bars1),
      returns2: toReturns(bars2),
    };
  } catch {
    return null;
  }
}

function classifySignificance(deviation: number): "normal" | "notable" | "significant" | "extreme" {
  const abs = Math.abs(deviation);
  if (abs < 1) return "normal";
  if (abs < 1.5) return "notable";
  if (abs < 2.5) return "significant";
  return "extreme";
}

export async function computeCorrelationMatrix(): Promise<CorrelationMatrix> {
  const pairs: CorrelationPair[] = [];
  const breaks: CorrelationBreak[] = [];

  for (let i = 0; i < CORRELATION_PAIRS.length; i++) {
    const pairDef = CORRELATION_PAIRS[i];

    // Rate limit between AV fetches
    if (i > 0 && pairDef.source === "alpha-vantage") {
      await new Promise(r => setTimeout(r, 2000));
    }

    const data = await fetchPairData(pairDef);

    if (!data || data.returns1.length < 10 || data.returns2.length < 10) {
      pairs.push({
        pair: pairDef.symbols,
        labels: pairDef.labels,
        current20d: null,
        current60d: null,
        historicalMean: pairDef.historicalMean,
        historicalStd: pairDef.historicalStd,
        deviation: 0,
        significance: "normal",
        interpretation: `Data unavailable for ${pairDef.labels[0]} vs ${pairDef.labels[1]}`,
        normalRange: `${(pairDef.historicalMean - pairDef.historicalStd).toFixed(2)} to ${(pairDef.historicalMean + pairDef.historicalStd).toFixed(2)}`,
      });
      continue;
    }

    const corr20 = pearsonCorrelation(
      data.returns1.slice(-20),
      data.returns2.slice(-20)
    );
    const corr60 = pearsonCorrelation(
      data.returns1.slice(-60),
      data.returns2.slice(-60)
    );

    const deviation = pairDef.historicalStd > 0
      ? (corr20 - pairDef.historicalMean) / pairDef.historicalStd
      : 0;

    const significance = classifySignificance(deviation);

    const interpretation = significance === "normal"
      ? pairDef.normalInterpretation
      : pairDef.breakInterpretation;

    const pairResult: CorrelationPair = {
      pair: pairDef.symbols,
      labels: pairDef.labels,
      current20d: Math.round(corr20 * 1000) / 1000,
      current60d: Math.round(corr60 * 1000) / 1000,
      historicalMean: pairDef.historicalMean,
      historicalStd: pairDef.historicalStd,
      deviation: Math.round(deviation * 100) / 100,
      significance,
      interpretation,
      normalRange: `${(pairDef.historicalMean - pairDef.historicalStd).toFixed(2)} to ${(pairDef.historicalMean + pairDef.historicalStd).toFixed(2)}`,
    };

    pairs.push(pairResult);

    if (significance !== "normal") {
      breaks.push({
        pair: pairDef.symbols,
        labels: pairDef.labels,
        current: corr20,
        historical: pairDef.historicalMean,
        deviation: Math.round(deviation * 100) / 100,
        significance: significance as "notable" | "significant" | "extreme",
        interpretation,
      });
    }
  }

  // Stress score: percentage of pairs showing notable+ breaks, weighted by severity
  const stressWeights = { notable: 0.3, significant: 0.7, extreme: 1.0 };
  const totalStress = breaks.reduce((sum, b) => sum + (stressWeights[b.significance] || 0), 0);
  const overallStress = Math.min(100, Math.round((totalStress / CORRELATION_PAIRS.length) * 100));

  const matrix: CorrelationMatrix = {
    timestamp: new Date().toISOString(),
    pairs,
    breaks,
    overallStress,
  };

  await saveRegimeState("correlations:latest", matrix);
  await appendToHistory("correlations", matrix);

  return matrix;
}

export async function getLatestCorrelations(): Promise<CorrelationMatrix | null> {
  return loadRegimeState<CorrelationMatrix>("correlations:latest");
}

export async function getCorrelationHistory(): Promise<CorrelationMatrix[]> {
  return (await loadRegimeState<CorrelationMatrix[]>("correlations:history")) || [];
}
