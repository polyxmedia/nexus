// Oil-SPX Premarket Divergence Detector
//
// Detects when oil futures (WTI) drop while SPX holds or rises,
// signaling a potential relief rally at open. This correlation
// is regime-dependent: strongest when oil acts as a geopolitical
// thermometer (active conflict, sanctions, supply disruption fears).
//
// Based on observed pattern: oil futures down premarket → SPX
// opens with upward momentum in first 30 minutes.

import { getFredSeries, type FredDataPoint } from "@/lib/market-data/fred";
import { getDailySeries, type DailyBar } from "@/lib/market-data/provider";
import { saveRegimeState, loadRegimeState } from "@/lib/regime/store";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export interface OilSpxReading {
  date: string;
  oilPrice: number;
  oilChange: number;       // % change from prior close
  oilTrend: "down" | "flat" | "up";
  spxPrice: number;
  spxChange: number;       // % change from prior close
  spxTrend: "down" | "flat" | "up";
  divergent: boolean;       // oil down while SPX flat/up
}

export interface OilSpxSignal {
  timestamp: string;
  currentReading: OilSpxReading | null;
  signalActive: boolean;
  signalStrength: "none" | "weak" | "moderate" | "strong";
  regime: "geopolitical_proxy" | "demand_driven" | "neutral";
  regimeContext: string;

  // Historical pattern stats
  history: OilSpxReading[];
  stats: {
    totalDivergences: number;
    divergenceRate: number;       // % of days with divergence
    avgSpxMoveAfterOilDrop: number; // avg SPX % move on oil-down days
    avgOilDropMagnitude: number;
    winRate: number;              // % of oil-down days where SPX was positive
    sampleSize: number;
  };

  // Correlation metrics
  correlation: {
    rolling20d: number;
    rolling60d: number;
    historicalMean: number;
    deviation: number;    // in standard deviations
    significance: "normal" | "notable" | "significant" | "extreme";
  };

  interpretation: string;
  tradingImplication: string;
}

// Classification thresholds
const OIL_DOWN_THRESHOLD = -0.3;    // % - oil must drop more than this
const OIL_UP_THRESHOLD = 0.3;
const SPX_FLAT_THRESHOLD = 0.15;    // % - within this is "flat"
const HISTORICAL_CORR_MEAN = 0.25;  // oil-SPX daily return correlation (weaker than USO-XLE)
const HISTORICAL_CORR_STD = 0.30;

function classifyTrend(changePct: number, downThreshold: number, upThreshold: number): "down" | "flat" | "up" {
  if (changePct <= downThreshold) return "down";
  if (changePct >= upThreshold) return "up";
  return "flat";
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 5) return 0;
  const xs = x.slice(-n);
  const ys = y.slice(-n);
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const den = Math.sqrt(dx2 * dy2);
  return den === 0 ? 0 : num / den;
}

function toReturns(values: number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] !== 0) r.push(((values[i] - values[i - 1]) / Math.abs(values[i - 1])) * 100);
  }
  return r;
}

async function getAlphaVantageKey(): Promise<string | null> {
  try {
    const rows = await db.select().from(schema.settings).where(eq(schema.settings.key, "alpha_vantage_api_key")).limit(1);
    return rows[0]?.value || process.env.ALPHA_VANTAGE_API_KEY || null;
  } catch {
    return process.env.ALPHA_VANTAGE_API_KEY || null;
  }
}

function classifySignificance(dev: number): "normal" | "notable" | "significant" | "extreme" {
  const abs = Math.abs(dev);
  if (abs < 1) return "normal";
  if (abs < 1.5) return "notable";
  if (abs < 2.5) return "significant";
  return "extreme";
}

function classifyRegime(
  oilReturns: number[],
  spxReturns: number[],
  corr20d: number
): { regime: OilSpxSignal["regime"]; context: string } {
  // When oil-SPX correlation becomes strongly negative, oil is acting as
  // a fear proxy (geopolitical thermometer). Normally they're weakly positive
  // (both track growth expectations).
  if (corr20d < -0.15) {
    return {
      regime: "geopolitical_proxy",
      context: "Oil is acting as a geopolitical thermometer. Negative oil-SPX correlation indicates oil price is driven by conflict/supply fears, making the divergence signal most reliable.",
    };
  }
  if (corr20d > 0.5) {
    return {
      regime: "demand_driven",
      context: "Oil and SPX are moving together, suggesting both track growth expectations. Oil declines in this regime signal demand destruction, not geopolitical relief. Divergence signal is less reliable.",
    };
  }
  return {
    regime: "neutral",
    context: "Oil-SPX relationship is in a neutral regime. The divergence signal carries moderate conviction. Watch for geopolitical catalysts that could strengthen the correlation.",
  };
}

export async function computeOilSpxDivergence(): Promise<OilSpxSignal> {
  const apiKey = await getAlphaVantageKey();

  // Fetch oil (FRED WTI) and SPX (Alpha Vantage SPY)
  const [oilPoints, spxBars] = await Promise.all([
    getFredSeries("DCOILWTICO", 100),
    apiKey ? getDailySeries("SPY", apiKey) : ([] as DailyBar[]),
  ]);

  if (oilPoints.length < 10 || spxBars.length < 10) {
    return {
      timestamp: new Date().toISOString(),
      currentReading: null,
      signalActive: false,
      signalStrength: "none",
      regime: "neutral",
      regimeContext: "Insufficient data to compute oil-SPX divergence.",
      history: [],
      stats: { totalDivergences: 0, divergenceRate: 0, avgSpxMoveAfterOilDrop: 0, avgOilDropMagnitude: 0, winRate: 0, sampleSize: 0 },
      correlation: { rolling20d: 0, rolling60d: 0, historicalMean: HISTORICAL_CORR_MEAN, deviation: 0, significance: "normal" },
      interpretation: "Insufficient data.",
      tradingImplication: "No actionable signal.",
    };
  }

  // Align dates: create return series
  const oilPrices = oilPoints.map(p => p.value);
  const spxPrices = spxBars.slice(-oilPoints.length).map(b => b.close);
  const oilReturns = toReturns(oilPrices);
  const spxReturns = toReturns(spxPrices);

  // Correlation
  const corr20d = pearsonCorrelation(oilReturns.slice(-20), spxReturns.slice(-20));
  const corr60d = pearsonCorrelation(oilReturns.slice(-60), spxReturns.slice(-60));
  const deviation = HISTORICAL_CORR_STD > 0 ? (corr20d - HISTORICAL_CORR_MEAN) / HISTORICAL_CORR_STD : 0;
  const significance = classifySignificance(deviation);

  // Regime classification
  const { regime, context: regimeContext } = classifyRegime(oilReturns, spxReturns, corr20d);

  // Build history of readings (last 60 trading days)
  const minLen = Math.min(oilReturns.length, spxReturns.length, 60);
  const history: OilSpxReading[] = [];

  for (let i = oilReturns.length - minLen; i < oilReturns.length; i++) {
    const spxIdx = spxReturns.length - (oilReturns.length - i);
    if (spxIdx < 0 || spxIdx >= spxReturns.length) continue;

    const oilRet = oilReturns[i];
    const spxRet = spxReturns[spxIdx];
    const oilIdx = i + 1; // +1 because returns start at index 1
    const spxBarIdx = spxBars.length - (oilReturns.length - i);

    const reading: OilSpxReading = {
      date: oilPoints[oilIdx]?.date || spxBars[spxBarIdx]?.date || "",
      oilPrice: oilPrices[oilIdx] || 0,
      oilChange: Math.round(oilRet * 100) / 100,
      oilTrend: classifyTrend(oilRet, OIL_DOWN_THRESHOLD, OIL_UP_THRESHOLD),
      spxPrice: spxPrices[oilIdx] || 0,
      spxChange: Math.round(spxRet * 100) / 100,
      spxTrend: classifyTrend(spxRet, -SPX_FLAT_THRESHOLD, SPX_FLAT_THRESHOLD),
      divergent: oilRet <= OIL_DOWN_THRESHOLD && spxRet > -SPX_FLAT_THRESHOLD,
    };

    history.push(reading);
  }

  // Stats on oil-down days
  const oilDownDays = history.filter(r => r.oilTrend === "down");
  const oilDownSpxUp = oilDownDays.filter(r => r.spxChange > 0);
  const divergentDays = history.filter(r => r.divergent);

  const stats = {
    totalDivergences: divergentDays.length,
    divergenceRate: history.length > 0 ? Math.round((divergentDays.length / history.length) * 100) : 0,
    avgSpxMoveAfterOilDrop: oilDownDays.length > 0
      ? Math.round(oilDownDays.reduce((s, r) => s + r.spxChange, 0) / oilDownDays.length * 100) / 100
      : 0,
    avgOilDropMagnitude: oilDownDays.length > 0
      ? Math.round(oilDownDays.reduce((s, r) => s + r.oilChange, 0) / oilDownDays.length * 100) / 100
      : 0,
    winRate: oilDownDays.length > 0
      ? Math.round((oilDownSpxUp.length / oilDownDays.length) * 100)
      : 0,
    sampleSize: oilDownDays.length,
  };

  // Current reading (latest)
  const currentReading = history.length > 0 ? history[history.length - 1] : null;

  // Signal assessment
  const signalActive = currentReading?.divergent === true && regime === "geopolitical_proxy";

  let signalStrength: OilSpxSignal["signalStrength"] = "none";
  if (currentReading?.divergent) {
    if (regime === "geopolitical_proxy" && Math.abs(currentReading.oilChange) > 1) {
      signalStrength = "strong";
    } else if (regime === "geopolitical_proxy") {
      signalStrength = "moderate";
    } else if (currentReading.oilChange < -0.5) {
      signalStrength = "weak";
    }
  }

  // Interpretation
  let interpretation = "";
  if (signalActive) {
    interpretation = `Oil down ${currentReading!.oilChange.toFixed(2)}% while oil-SPX correlation is negative (${corr20d.toFixed(2)}), indicating oil is acting as a geopolitical fear gauge. Historically, when oil drops in this regime, SPX shows positive opening momentum ${stats.winRate}% of the time (n=${stats.sampleSize}).`;
  } else if (currentReading?.divergent) {
    interpretation = `Oil-SPX divergence detected but regime is ${regime}, reducing signal reliability. The divergence pattern is strongest when oil is a geopolitical proxy (negative correlation regime).`;
  } else {
    interpretation = `No active divergence. Oil is ${currentReading?.oilTrend || "unknown"} (${currentReading?.oilChange?.toFixed(2) || "?"}%) and SPX is ${currentReading?.spxTrend || "unknown"} (${currentReading?.spxChange?.toFixed(2) || "?"}%).`;
  }

  let tradingImplication = "";
  if (signalStrength === "strong") {
    tradingImplication = "Strong signal: oil drop in geopolitical proxy regime suggests opening rally potential. Historical win rate supports 0DTE call entries in first 30 minutes. Exit by 10:00 AM due to theta decay. Confirm with overnight news flow and options positioning.";
  } else if (signalStrength === "moderate") {
    tradingImplication = "Moderate signal: divergence present in correct regime but oil move is small. Consider reduced position size or wait for additional confirmation from overnight geopolitical developments.";
  } else if (signalStrength === "weak") {
    tradingImplication = "Weak signal: divergence detected but regime does not strongly support the pattern. Monitor only, do not trade on this signal alone.";
  } else {
    tradingImplication = "No actionable signal. Watch for oil-SPX divergence to develop, particularly during active geopolitical tensions involving oil-producing nations.";
  }

  const signal: OilSpxSignal = {
    timestamp: new Date().toISOString(),
    currentReading,
    signalActive,
    signalStrength,
    regime,
    regimeContext,
    history: history.slice(-20), // last 20 for display
    stats,
    correlation: {
      rolling20d: Math.round(corr20d * 1000) / 1000,
      rolling60d: Math.round(corr60d * 1000) / 1000,
      historicalMean: HISTORICAL_CORR_MEAN,
      deviation: Math.round(deviation * 100) / 100,
      significance,
    },
    interpretation,
    tradingImplication,
  };

  await saveRegimeState("oil-spx-divergence:latest", signal);
  return signal;
}

export async function getLatestOilSpxDivergence(): Promise<OilSpxSignal | null> {
  return loadRegimeState<OilSpxSignal>("oil-spx-divergence:latest");
}
