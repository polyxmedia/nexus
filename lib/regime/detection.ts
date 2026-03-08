// Market Regime Detection Engine
// Classifies current market environment across multiple dimensions
// and detects regime shifts that generate signals.

import { getFredSeries } from "@/lib/market-data/fred";
import { saveRegimeState, loadRegimeState, appendToHistory } from "./store";

export interface RegimeDimension {
  regime: string;
  score: number; // -1 (bearish/tight) to +1 (bullish/loose)
  confidence: number; // 0-1
  inputs: Record<string, { value: number | null; weight: number; source: string }>;
}

export interface RegimeState {
  timestamp: string;
  volatility: RegimeDimension & { vix: number | null; percentile: string };
  growth: RegimeDimension & { direction: string };
  monetary: RegimeDimension & { fedFunds: number | null; direction: string };
  riskAppetite: RegimeDimension & { creditSpread: number | null };
  dollar: RegimeDimension & { dxy: number | null; trend: string };
  commodity: RegimeDimension & { oil: number | null; gold: number | null };
  composite: string;
  compositeScore: number; // -1 (max risk-off) to +1 (max risk-on)
}

export interface RegimeShift {
  dimension: string;
  from: string;
  to: string;
  magnitude: number; // absolute score change
  interpretation: string;
  marketImplication: string;
  timestamp: string;
}

// Helper: safely fetch latest FRED value
async function fredLatest(seriesId: string): Promise<number | null> {
  try {
    const points = await getFredSeries(seriesId, 5);
    return points.length > 0 ? points[points.length - 1].value : null;
  } catch {
    return null;
  }
}

// Helper: get direction from recent values
async function fredDirection(seriesId: string): Promise<"rising" | "falling" | "stable"> {
  try {
    const points = await getFredSeries(seriesId, 10);
    if (points.length < 3) return "stable";
    const recent = points.slice(-3);
    const first = recent[0].value;
    const last = recent[recent.length - 1].value;
    const pctChange = ((last - first) / Math.abs(first || 1)) * 100;
    if (pctChange > 2) return "rising";
    if (pctChange < -2) return "falling";
    return "stable";
  } catch {
    return "stable";
  }
}

function classifyVolatility(vix: number | null): { regime: string; score: number; percentile: string } {
  if (vix === null) return { regime: "unknown", score: 0, percentile: "unknown" };
  if (vix < 13) return { regime: "suppressed", score: 0.8, percentile: "low" };
  if (vix < 17) return { regime: "low-vol", score: 0.5, percentile: "below-avg" };
  if (vix < 22) return { regime: "normal", score: 0, percentile: "average" };
  if (vix < 30) return { regime: "elevated", score: -0.5, percentile: "above-avg" };
  if (vix < 40) return { regime: "high-vol", score: -0.8, percentile: "high" };
  return { regime: "crisis", score: -1, percentile: "extreme" };
}

function classifyGrowth(
  gdp: number | null,
  claims: number | null,
  indpro: number | null,
  sentiment: number | null
): { regime: string; score: number; direction: string } {
  let score = 0;
  let signals = 0;

  if (gdp !== null) {
    signals++;
    if (gdp > 3) score += 1;
    else if (gdp > 1.5) score += 0.5;
    else if (gdp > 0) score += 0;
    else score -= 1;
  }

  if (claims !== null) {
    signals++;
    if (claims < 220000) score += 0.8;
    else if (claims < 280000) score += 0.3;
    else if (claims < 350000) score -= 0.3;
    else score -= 0.8;
  }

  if (sentiment !== null) {
    signals++;
    if (sentiment > 80) score += 0.6;
    else if (sentiment > 60) score += 0.2;
    else if (sentiment > 50) score -= 0.2;
    else score -= 0.6;
  }

  const avg = signals > 0 ? score / signals : 0;
  const clamped = Math.max(-1, Math.min(1, avg));

  let regime: string;
  let direction: string;
  if (clamped > 0.5) { regime = "expansion"; direction = "accelerating"; }
  else if (clamped > 0) { regime = "growth"; direction = "stable"; }
  else if (clamped > -0.5) { regime = "slowdown"; direction = "decelerating"; }
  else { regime = "contraction"; direction = "contracting"; }

  return { regime, score: clamped, direction };
}

function classifyMonetary(
  fedFunds: number | null,
  direction: "rising" | "falling" | "stable"
): { regime: string; score: number; direction: string } {
  if (fedFunds === null) return { regime: "unknown", score: 0, direction: "unknown" };

  let score = 0;
  if (fedFunds > 5) score = -0.8;
  else if (fedFunds > 3) score = -0.4;
  else if (fedFunds > 1) score = 0;
  else score = 0.6;

  // Direction matters more than level
  if (direction === "rising") score -= 0.3;
  if (direction === "falling") score += 0.3;

  score = Math.max(-1, Math.min(1, score));

  let regime: string;
  if (direction === "rising" && fedFunds > 3) regime = "tightening";
  else if (direction === "falling") regime = "easing";
  else if (fedFunds < 1) regime = "emergency";
  else regime = "neutral";

  return { regime, score, direction };
}

function classifyRiskAppetite(
  creditSpread: number | null,
  vix: number | null,
  yieldCurve: number | null
): { regime: string; score: number } {
  let score = 0;
  let signals = 0;

  if (creditSpread !== null) {
    signals++;
    if (creditSpread < 3) score += 0.6;
    else if (creditSpread < 4.5) score += 0.1;
    else if (creditSpread < 7) score -= 0.5;
    else score -= 1;
  }

  if (vix !== null) {
    signals++;
    if (vix < 15) score += 0.5;
    else if (vix < 22) score += 0;
    else if (vix < 30) score -= 0.4;
    else score -= 0.8;
  }

  if (yieldCurve !== null) {
    signals++;
    if (yieldCurve > 0.5) score += 0.3;
    else if (yieldCurve > -0.5) score += 0;
    else score -= 0.5;
  }

  const avg = signals > 0 ? score / signals : 0;
  const clamped = Math.max(-1, Math.min(1, avg));

  let regime: string;
  if (clamped > 0.4) regime = "risk-on";
  else if (clamped > -0.2) regime = "neutral";
  else if (clamped > -0.6) regime = "risk-off";
  else regime = "panic";

  return { regime, score: clamped };
}

function classifyDollar(
  dxy: number | null,
  direction: "rising" | "falling" | "stable"
): { regime: string; score: number; trend: string } {
  if (dxy === null) return { regime: "unknown", score: 0, trend: "unknown" };

  let score = 0;
  // Strong dollar is risk-off for EM / commodities
  if (dxy > 108) score = -0.6;
  else if (dxy > 103) score = -0.2;
  else if (dxy > 97) score = 0.1;
  else score = 0.5;

  if (direction === "rising") score -= 0.2;
  if (direction === "falling") score += 0.2;

  score = Math.max(-1, Math.min(1, score));

  let regime: string;
  if (direction === "rising" && dxy > 105) regime = "strengthening";
  else if (direction === "falling" && dxy < 100) regime = "weakening";
  else if (dxy > 110) regime = "dollar-crisis";
  else regime = "stable";

  return { regime, score, trend: direction };
}

function classifyCommodity(
  oil: number | null,
  gold: number | null
): { regime: string; score: number } {
  let score = 0;
  let signals = 0;

  if (oil !== null) {
    signals++;
    if (oil > 100) score += 0.5; // supply shock or demand boom
    else if (oil > 75) score += 0.2;
    else if (oil > 55) score -= 0.1;
    else score -= 0.5;
  }

  if (gold !== null) {
    signals++;
    // Gold above 2000 indicates safe-haven demand (risk-off signal)
    if (gold > 2500) score -= 0.4;
    else if (gold > 2000) score -= 0.1;
    else score += 0.2;
  }

  const avg = signals > 0 ? score / signals : 0;
  const clamped = Math.max(-1, Math.min(1, avg));

  let regime: string;
  if (clamped > 0.3) regime = "supercycle-up";
  else if (clamped > -0.2) regime = "stable";
  else if (clamped > -0.5) regime = "deflation";
  else regime = "supply-shock";

  return { regime, score: clamped };
}

function computeComposite(state: Omit<RegimeState, "composite" | "compositeScore" | "timestamp">): { label: string; score: number } {
  // Weighted average of all dimensions
  const weights = {
    volatility: 0.2,
    growth: 0.25,
    monetary: 0.15,
    riskAppetite: 0.2,
    dollar: 0.1,
    commodity: 0.1,
  };

  const score =
    state.volatility.score * weights.volatility +
    state.growth.score * weights.growth +
    state.monetary.score * weights.monetary +
    state.riskAppetite.score * weights.riskAppetite +
    state.dollar.score * weights.dollar +
    state.commodity.score * weights.commodity;

  const clamped = Math.max(-1, Math.min(1, score));

  // Generate human-readable label
  const riskLabel = clamped > 0.3 ? "Risk-On" : clamped > -0.3 ? "Neutral" : "Risk-Off";
  const growthLabel = state.growth.regime;
  const volLabel = state.volatility.regime !== "unknown" ? `, ${state.volatility.regime} vol` : "";

  return {
    label: `${riskLabel} ${growthLabel}${volLabel}`,
    score: Math.round(clamped * 100) / 100,
  };
}

export async function detectCurrentRegime(): Promise<RegimeState> {
  // Fetch all inputs in parallel where possible
  const [
    vix, fedFunds, gdp, claims, sentiment, creditSpread,
    yieldCurve, dxy, oil, gold, indpro,
    fedDir, dxyDir,
  ] = await Promise.all([
    fredLatest("VIXCLS"),
    fredLatest("FEDFUNDS"),
    fredLatest("A191RL1Q225SBEA"),
    fredLatest("ICSA"),
    fredLatest("UMCSENT"),
    fredLatest("BAMLH0A0HYM2"),
    fredLatest("T10Y2Y"),
    fredLatest("DTWEXBGS"),
    fredLatest("DCOILWTICO"),
    fredLatest("GOLDAMGBD228NLBM"),
    fredLatest("INDPRO"),
    fredDirection("FEDFUNDS"),
    fredDirection("DTWEXBGS"),
  ]);

  const volClass = classifyVolatility(vix);
  const growthClass = classifyGrowth(gdp, claims, indpro, sentiment);
  const monetaryClass = classifyMonetary(fedFunds, fedDir);
  const riskClass = classifyRiskAppetite(creditSpread, vix, yieldCurve);
  const dollarClass = classifyDollar(dxy, dxyDir);
  const commodityClass = classifyCommodity(oil, gold);

  const dimensions = {
    volatility: {
      ...volClass,
      vix,
      confidence: vix !== null ? 0.9 : 0.3,
      inputs: {
        VIX: { value: vix, weight: 1.0, source: "FRED:VIXCLS" },
      },
    },
    growth: {
      ...growthClass,
      confidence: [gdp, claims, sentiment].filter(v => v !== null).length / 3,
      inputs: {
        "GDP Growth": { value: gdp, weight: 0.4, source: "FRED:A191RL1Q225SBEA" },
        "Initial Claims": { value: claims, weight: 0.3, source: "FRED:ICSA" },
        "Consumer Sentiment": { value: sentiment, weight: 0.2, source: "FRED:UMCSENT" },
        "Industrial Production": { value: indpro, weight: 0.1, source: "FRED:INDPRO" },
      },
    },
    monetary: {
      ...monetaryClass,
      fedFunds,
      confidence: fedFunds !== null ? 0.9 : 0.3,
      inputs: {
        "Fed Funds": { value: fedFunds, weight: 0.7, source: "FRED:FEDFUNDS" },
        "Direction": { value: fedDir === "rising" ? 1 : fedDir === "falling" ? -1 : 0, weight: 0.3, source: "FRED:FEDFUNDS" },
      },
    },
    riskAppetite: {
      ...riskClass,
      creditSpread,
      confidence: [creditSpread, vix, yieldCurve].filter(v => v !== null).length / 3,
      inputs: {
        "HY Credit Spread": { value: creditSpread, weight: 0.4, source: "FRED:BAMLH0A0HYM2" },
        "VIX": { value: vix, weight: 0.3, source: "FRED:VIXCLS" },
        "Yield Curve 2s10s": { value: yieldCurve, weight: 0.3, source: "FRED:T10Y2Y" },
      },
    },
    dollar: {
      ...dollarClass,
      dxy,
      confidence: dxy !== null ? 0.8 : 0.3,
      inputs: {
        "Trade-Weighted Dollar": { value: dxy, weight: 0.8, source: "FRED:DTWEXBGS" },
        "Direction": { value: dxyDir === "rising" ? 1 : dxyDir === "falling" ? -1 : 0, weight: 0.2, source: "FRED:DTWEXBGS" },
      },
    },
    commodity: {
      ...commodityClass,
      oil,
      gold,
      confidence: [oil, gold].filter(v => v !== null).length / 2,
      inputs: {
        "WTI Crude": { value: oil, weight: 0.5, source: "FRED:DCOILWTICO" },
        "Gold": { value: gold, weight: 0.5, source: "FRED:GOLDAMGBD228NLBM" },
      },
    },
  };

  const { label, score } = computeComposite(dimensions);

  const state: RegimeState = {
    timestamp: new Date().toISOString(),
    ...dimensions,
    composite: label,
    compositeScore: score,
  };

  // Persist
  const previous = await loadRegimeState<RegimeState>("latest");
  await saveRegimeState("latest", state);
  await appendToHistory("state", state);

  // Detect shifts
  if (previous) {
    const shifts = detectRegimeShifts(state, previous);
    if (shifts.length > 0) {
      await saveRegimeState("latest-shifts", shifts);
    }
  }

  return state;
}

export function detectRegimeShifts(current: RegimeState, previous: RegimeState): RegimeShift[] {
  const shifts: RegimeShift[] = [];
  const dims: Array<{ key: keyof Pick<RegimeState, "volatility" | "growth" | "monetary" | "riskAppetite" | "dollar" | "commodity">; label: string }> = [
    { key: "volatility", label: "Volatility" },
    { key: "growth", label: "Growth" },
    { key: "monetary", label: "Monetary Policy" },
    { key: "riskAppetite", label: "Risk Appetite" },
    { key: "dollar", label: "US Dollar" },
    { key: "commodity", label: "Commodities" },
  ];

  const interpretations: Record<string, Record<string, string>> = {
    volatility: {
      "suppressed->elevated": "Volatility spike from complacent levels. Often precedes significant drawdowns.",
      "normal->crisis": "Rapid volatility expansion. Flight to safety in progress.",
      "elevated->normal": "Volatility normalizing. Risk appetite returning.",
      "crisis->elevated": "Peak fear may be passing. Watch for bear market rallies.",
    },
    growth: {
      "expansion->slowdown": "Growth deceleration underway. Defensive positioning warranted.",
      "slowdown->contraction": "Economy tipping into contraction. Recession risk elevated.",
      "contraction->growth": "Recovery emerging. Cyclical assets likely to outperform.",
    },
    monetary: {
      "tightening->neutral": "Fed pivoting. Historically bullish for risk assets.",
      "neutral->easing": "Rate cuts beginning. Bonds rally, equities follow with lag.",
      "easing->tightening": "Hawkish shift. Duration and growth stocks under pressure.",
    },
    riskAppetite: {
      "risk-on->risk-off": "Risk appetite deteriorating. Reduce equity exposure, add hedges.",
      "risk-off->panic": "Capitulation phase. Contrarian opportunities emerging.",
      "panic->risk-off": "Worst may be over. Selective re-entry into quality assets.",
      "risk-off->risk-on": "Risk appetite returning. Credit and equities rally.",
    },
  };

  for (const dim of dims) {
    const curr = current[dim.key];
    const prev = previous[dim.key];
    if (curr.regime !== prev.regime) {
      const transitionKey = `${prev.regime}->${curr.regime}`;
      const interp = interpretations[dim.key]?.[transitionKey] || `${dim.label} regime shifted from ${prev.regime} to ${curr.regime}.`;

      shifts.push({
        dimension: dim.label,
        from: prev.regime,
        to: curr.regime,
        magnitude: Math.abs(curr.score - prev.score),
        interpretation: interp,
        marketImplication: curr.score > prev.score ? "Bullish shift" : "Bearish shift",
        timestamp: current.timestamp,
      });
    }
  }

  return shifts;
}

export async function getRegimeHistory(): Promise<RegimeState[]> {
  return (await loadRegimeState<RegimeState[]>("state:history")) || [];
}

export async function getLatestShifts(): Promise<RegimeShift[]> {
  return (await loadRegimeState<RegimeShift[]>("latest-shifts")) || [];
}
