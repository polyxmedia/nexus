// Oil-SPX Premarket Divergence Detector
//
// Detects when oil futures (WTI) drop while SPX holds or rises,
// signaling a potential relief rally at open. This correlation
// is regime-dependent: strongest when oil acts as a geopolitical
// thermometer (active conflict, sanctions, supply disruption fears).
//
// Based on observed pattern: oil futures down premarket → SPX
// opens with upward momentum in first 30 minutes.

import { getFredSeries } from "@/lib/market-data/fred";
import { getDailySeries, type DailyBar } from "@/lib/market-data/provider";
import { saveRegimeState, loadRegimeState } from "@/lib/regime/store";
import { pearsonCorrelation, classifySignificance, getAlphaVantageKey } from "@/lib/regime/correlations";
import { getGEXSnapshot, type GEXSummary } from "@/lib/gex";
import { getPutCallRatio, type PutCallData } from "@/lib/market-data/options-flow";

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

  // Confirmation filters (from the article's 3 additional checks)
  confirmations: {
    gammaRegime: {
      regime: "dampening" | "amplifying" | "neutral" | "unavailable";
      spyNetGEX: number | null;
      zeroGammaLevel: number | null;
      spotPrice: number | null;
      confirms: boolean;  // negative gamma = price can move freely = confirms
      note: string;
    };
    optionsFlow: {
      putCallRatio: number | null;
      signal: string | null;   // extreme_fear | fear | neutral | greed | extreme_greed
      confirms: boolean;  // greed/extreme_greed (call-heavy) confirms bullish opening
      note: string;
    };
    confirmationCount: number;  // 0-2, how many filters confirm
  };

  interpretation: string;
  tradingImplication: string;
}

// Classification thresholds
const OIL_DOWN_THRESHOLD = -0.3;    // % - oil must drop more than this
const OIL_UP_THRESHOLD = 0.3;
const SPX_FLAT_THRESHOLD = 0.15;    // % - within this is "flat"

function classifyTrend(changePct: number, downThreshold: number, upThreshold: number): "down" | "flat" | "up" {
  if (changePct <= downThreshold) return "down";
  if (changePct >= upThreshold) return "up";
  return "flat";
}

function toReturns(values: number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] !== 0) r.push(((values[i] - values[i - 1]) / Math.abs(values[i - 1])) * 100);
  }
  return r;
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

function computeBaselineCorrelation(oilReturns: number[], spxReturns: number[]): { mean: number; std: number } {
  // Compute rolling 20d correlations across the full history to establish baseline
  const correlations: number[] = [];
  const windowSize = 20;
  const n = Math.min(oilReturns.length, spxReturns.length);
  for (let i = windowSize; i <= n; i++) {
    const c = pearsonCorrelation(oilReturns.slice(i - windowSize, i), spxReturns.slice(i - windowSize, i));
    correlations.push(c);
  }
  if (correlations.length < 3) return { mean: 0.25, std: 0.30 }; // fallback only if truly no data
  const mean = correlations.reduce((a, b) => a + b, 0) / correlations.length;
  const variance = correlations.reduce((s, c) => s + (c - mean) ** 2, 0) / correlations.length;
  return { mean: Math.round(mean * 1000) / 1000, std: Math.round(Math.sqrt(variance) * 1000) / 1000 || 0.01 };
}

export async function computeOilSpxDivergence(): Promise<OilSpxSignal> {
  const apiKey = await getAlphaVantageKey();

  // Fetch oil (FRED WTI), SPX (Alpha Vantage SPY), and confirmation data in parallel
  const [oilPoints, spxBars, gexSnapshot, pcrData] = await Promise.allSettled([
    getFredSeries("DCOILWTICO", 100),
    apiKey ? getDailySeries("SPY", apiKey) : ([] as DailyBar[]),
    getGEXSnapshot(),
    getPutCallRatio(),
  ]);

  const oil = oilPoints.status === "fulfilled" ? oilPoints.value : [];
  const spx = spxBars.status === "fulfilled" ? spxBars.value : [];
  const gex = gexSnapshot.status === "fulfilled" ? gexSnapshot.value : null;
  const pcr = pcrData.status === "fulfilled" ? pcrData.value : null;

  const emptyConfirmations: OilSpxSignal["confirmations"] = {
    gammaRegime: { regime: "unavailable", spyNetGEX: null, zeroGammaLevel: null, spotPrice: null, confirms: false, note: "Data unavailable" },
    optionsFlow: { putCallRatio: null, signal: null, confirms: false, note: "Data unavailable" },
    confirmationCount: 0,
  };

  if (oil.length < 10 || spx.length < 10) {
    return {
      timestamp: new Date().toISOString(),
      currentReading: null,
      signalActive: false,
      signalStrength: "none",
      regime: "neutral",
      regimeContext: "Insufficient data to compute oil-SPX divergence.",
      history: [],
      stats: { totalDivergences: 0, divergenceRate: 0, avgSpxMoveAfterOilDrop: 0, avgOilDropMagnitude: 0, winRate: 0, sampleSize: 0 },
      correlation: { rolling20d: 0, rolling60d: 0, historicalMean: 0, deviation: 0, significance: "normal" },
      confirmations: emptyConfirmations,
      interpretation: "Insufficient data.",
      tradingImplication: "No actionable signal.",
    };
  }

  // Align by date (FRED and Alpha Vantage have different trading day gaps)
  const oilByDate = new Map(oil.map(p => [p.date, p.value]));
  const spxByDate = new Map(spx.map(b => [b.date, b.close]));
  const commonDates = [...oilByDate.keys()].filter(d => spxByDate.has(d)).sort();

  if (commonDates.length < 10) {
    return {
      timestamp: new Date().toISOString(),
      currentReading: null,
      signalActive: false,
      signalStrength: "none",
      regime: "neutral",
      regimeContext: "Insufficient overlapping dates between oil and SPX data.",
      history: [],
      stats: { totalDivergences: 0, divergenceRate: 0, avgSpxMoveAfterOilDrop: 0, avgOilDropMagnitude: 0, winRate: 0, sampleSize: 0 },
      correlation: { rolling20d: 0, rolling60d: 0, historicalMean: 0, deviation: 0, significance: "normal" },
      confirmations: emptyConfirmations,
      interpretation: "Insufficient overlapping data.",
      tradingImplication: "No actionable signal.",
    };
  }

  const alignedOil = commonDates.map(d => oilByDate.get(d)!);
  const alignedSpx = commonDates.map(d => spxByDate.get(d)!);
  const oilReturns = toReturns(alignedOil);
  const spxReturns = toReturns(alignedSpx);
  const returnDates = commonDates.slice(1);

  // Correlation: compute baseline from actual data, not hardcoded
  const baseline = computeBaselineCorrelation(oilReturns, spxReturns);
  const corr20d = pearsonCorrelation(oilReturns.slice(-20), spxReturns.slice(-20));
  const corr60d = pearsonCorrelation(oilReturns.slice(-60), spxReturns.slice(-60));
  const deviation = baseline.std > 0 ? (corr20d - baseline.mean) / baseline.std : 0;
  const significance = classifySignificance(deviation);

  // Regime classification
  const { regime, context: regimeContext } = classifyRegime(oilReturns, spxReturns, corr20d);

  // Build history of readings (last 60 trading days)
  const startIdx = Math.max(0, oilReturns.length - 60);
  const history: OilSpxReading[] = [];

  for (let i = startIdx; i < oilReturns.length; i++) {
    const oilRet = oilReturns[i];
    const spxRet = spxReturns[i];
    const date = returnDates[i];
    // Price indices are offset by 1 from returns (returns[i] = price[i+1] / price[i])
    const priceIdx = i + 1;

    const reading: OilSpxReading = {
      date,
      oilPrice: alignedOil[priceIdx] || 0,
      oilChange: Math.round(oilRet * 100) / 100,
      oilTrend: classifyTrend(oilRet, OIL_DOWN_THRESHOLD, OIL_UP_THRESHOLD),
      spxPrice: alignedSpx[priceIdx] || 0,
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

  // ── Confirmation filter 1: Gamma regime (negative gamma = price moves freely) ──
  const spyGex: GEXSummary | undefined = gex?.summaries?.find((s) => s.ticker === "SPY");
  const gammaRegime: OilSpxSignal["confirmations"]["gammaRegime"] = spyGex
    ? {
        regime: spyGex.regime,
        spyNetGEX: spyGex.netGEX,
        zeroGammaLevel: spyGex.zeroGammaLevel,
        spotPrice: spyGex.spotPrice,
        confirms: spyGex.regime === "amplifying", // negative gamma amplifies moves
        note: spyGex.regime === "amplifying"
          ? `SPY in negative gamma (${spyGex.regime}). Dealers will amplify directional moves. Zero-gamma at ${spyGex.zeroGammaLevel.toFixed(0)}, spot at ${spyGex.spotPrice.toFixed(0)}.`
          : spyGex.regime === "dampening"
          ? `SPY in positive gamma (${spyGex.regime}). Dealers dampen moves, reducing breakout potential. Less favorable for momentum trades.`
          : `SPY gamma regime is neutral. No strong dealer positioning bias.`,
      }
    : { regime: "unavailable", spyNetGEX: null, zeroGammaLevel: null, spotPrice: null, confirms: false, note: "GEX data unavailable. Cannot assess dealer positioning." };

  // ── Confirmation filter 2: Options flow (bullish flow confirms relief rally) ──
  const optionsFlow: OilSpxSignal["confirmations"]["optionsFlow"] = pcr
    ? {
        putCallRatio: pcr.totalPCRatio,
        signal: pcr.signal,
        confirms: pcr.signal === "greed" || pcr.signal === "extreme_greed",
        note: pcr.signal === "greed" || pcr.signal === "extreme_greed"
          ? `P/C ratio ${pcr.totalPCRatio.toFixed(2)} shows call-heavy flow (${pcr.signal}). Bullish options positioning supports opening rally thesis.`
          : pcr.signal === "extreme_fear" || pcr.signal === "fear"
          ? `P/C ratio ${pcr.totalPCRatio.toFixed(2)} shows put-heavy flow (${pcr.signal}). Hedging activity is elevated, which could cap upside despite oil divergence.`
          : `P/C ratio ${pcr.totalPCRatio.toFixed(2)} is neutral. No strong directional bias from options flow.`,
      }
    : { putCallRatio: null, signal: null, confirms: false, note: "Options flow data unavailable." };

  const confirmationCount = (gammaRegime.confirms ? 1 : 0) + (optionsFlow.confirms ? 1 : 0);
  const confirmations: OilSpxSignal["confirmations"] = { gammaRegime, optionsFlow, confirmationCount };

  // ── Signal assessment (incorporates confirmations) ──
  const signalActive = currentReading?.divergent === true && regime === "geopolitical_proxy";

  let signalStrength: OilSpxSignal["signalStrength"] = "none";
  if (currentReading?.divergent) {
    if (regime === "geopolitical_proxy" && Math.abs(currentReading.oilChange) > 1) {
      signalStrength = confirmationCount >= 1 ? "strong" : "moderate";
    } else if (regime === "geopolitical_proxy") {
      signalStrength = confirmationCount >= 2 ? "strong" : "moderate";
    } else if (currentReading.oilChange < -0.5) {
      signalStrength = "weak";
    }
  }

  // Interpretation
  let interpretation = "";
  if (signalActive) {
    interpretation = `Oil down ${currentReading!.oilChange.toFixed(2)}% while oil-SPX correlation is negative (${corr20d.toFixed(2)}), indicating oil is acting as a geopolitical fear gauge. Historically, when oil drops in this regime, SPX shows positive opening momentum ${stats.winRate}% of the time (n=${stats.sampleSize}). ${confirmationCount}/2 confirmation filters active.`;
  } else if (currentReading?.divergent) {
    interpretation = `Oil-SPX divergence detected but regime is ${regime}, reducing signal reliability. The divergence pattern is strongest when oil is a geopolitical proxy (negative correlation regime).`;
  } else {
    interpretation = `No active divergence. Oil is ${currentReading?.oilTrend || "unknown"} (${currentReading?.oilChange?.toFixed(2) || "?"}%) and SPX is ${currentReading?.spxTrend || "unknown"} (${currentReading?.spxChange?.toFixed(2) || "?"}%).`;
  }

  let tradingImplication = "";
  if (signalStrength === "strong") {
    tradingImplication = `Strong signal: oil drop in geopolitical proxy regime with ${confirmationCount}/2 confirmations. ${gammaRegime.confirms ? "Negative gamma amplifies moves." : ""} ${optionsFlow.confirms ? "Call-heavy flow supports bullish opening." : ""} Historical win rate ${stats.winRate}% supports 0DTE call entries in first 30 minutes. Exit by 10:00 AM due to theta decay.`.trim();
  } else if (signalStrength === "moderate") {
    tradingImplication = `Moderate signal: divergence present in correct regime but ${confirmationCount === 0 ? "no confirmation filters active" : "only partial confirmation"}. Consider reduced position size or wait for gamma/flow confirmation.`;
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
    history: history.slice(-20),
    stats,
    correlation: {
      rolling20d: Math.round(corr20d * 1000) / 1000,
      rolling60d: Math.round(corr60d * 1000) / 1000,
      historicalMean: baseline.mean,
      deviation: Math.round(deviation * 100) / 100,
      significance,
    },
    confirmations,
    interpretation,
    tradingImplication,
  };

  await saveRegimeState("oil-spx-divergence:latest", signal);
  return signal;
}

export async function getLatestOilSpxDivergence(): Promise<OilSpxSignal | null> {
  return loadRegimeState<OilSpxSignal>("oil-spx-divergence:latest");
}
