// Gamma Exposure (GEX) Engine
// Estimates net gamma exposure for major ETFs (SPY, QQQ, IWM)
// Uses Alpha Vantage options data when available, falls back to synthetic estimation
//
// Extended: trigger cascade levels, scenario modeler, OPEX gamma clock,
// flow divergence detection, cross-asset regime analysis

import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getQuote } from "@/lib/market-data/alpha-vantage";
import { getPutCallRatio } from "@/lib/market-data/options-flow";

const AV_BASE = "https://www.alphavantage.co/query";
const GEX_TICKERS = ["SPY", "QQQ", "IWM"] as const;
type GEXTicker = (typeof GEX_TICKERS)[number];

// ── Types ──

export interface GEXLevel {
  strike: number;
  callGamma: number;
  putGamma: number;
  netGamma: number;
  callOI: number;
  putOI: number;
}

export interface TriggerLevel {
  price: number;
  label: string;
  type: "support" | "resistance" | "acceleration" | "magnet" | "flip";
  intensity: number; // 0-1 strength of the level
  dealerAction: string; // what dealers do here
}

export interface ScenarioPoint {
  spotDelta: number; // % change from current spot (-5 to +5)
  spotPrice: number;
  netGEX: number;
  regime: "dampening" | "amplifying" | "neutral";
}

export interface OpexData {
  nextOpex: string; // ISO date
  daysUntil: number;
  type: "weekly" | "monthly" | "quarterly";
  gammaConcentration: number; // 0-1 how much gamma expires
  expectedImpact: string;
}

export interface FlowDivergence {
  detected: boolean;
  type: "bullish_into_negative" | "bearish_into_positive" | "none";
  severity: number; // 0-1
  description: string;
}

export interface GEXSummary {
  ticker: string;
  spotPrice: number;
  netGEX: number;
  gexSign: "positive" | "negative";
  zeroGammaLevel: number;
  putWall: number;
  callWall: number;
  regime: "dampening" | "amplifying" | "neutral";
  flipDistance: number;
  levels: GEXLevel[];
  dataSource: "live" | "estimated";
  confidence: number;
  // Extended fields
  triggerLevels: TriggerLevel[];
  scenarioProfile: ScenarioPoint[];
  flowDivergence: FlowDivergence;
  dealerPositionBias: "long" | "short" | "flat";
  impliedMove1Day: number; // estimated 1-day move in % based on gamma
}

export interface GEXSnapshot {
  summaries: GEXSummary[];
  aggregateRegime: "dampening" | "amplifying" | "neutral";
  lastUpdated: string;
  opex: OpexData;
  crossAssetSignal: string; // narrative summary of cross-asset regime
}

// ── Cache ──

let snapshotCache: { data: GEXSnapshot; expiry: number } | null = null;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// ── API Key Resolution ──

async function getApiKey(): Promise<string> {
  try {
    const rows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "alpha_vantage_api_key"));
    if (rows[0]?.value) return rows[0].value;
  } catch {
    // ignore db errors
  }
  return process.env.ALPHA_VANTAGE_API_KEY || "";
}

// ── Options Chain Fetch (Alpha Vantage) ──

interface AVOptionContract {
  contractID: string;
  symbol: string;
  expiration: string;
  strike: string;
  type: string; // "call" | "put"
  last: string;
  bid: string;
  ask: string;
  volume: string;
  open_interest: string;
  implied_volatility: string;
  delta: string;
  gamma: string;
  theta: string;
  vega: string;
}

async function fetchOptionsChain(
  ticker: string,
  apiKey: string
): Promise<AVOptionContract[] | null> {
  try {
    const url = `${AV_BASE}?function=HISTORICAL_OPTIONS&symbol=${ticker}&apikey=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;

    const json = await res.json();

    // Check for rate limiting or errors
    if (json["Note"] || json["Information"] || json["Error Message"]) {
      return null;
    }

    const contracts: AVOptionContract[] = json.data || json.optionChain || [];
    if (!Array.isArray(contracts) || contracts.length === 0) return null;

    return contracts;
  } catch {
    return null;
  }
}

// ── OPEX Calculation ──

function getNextOpex(): OpexData {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Monthly OPEX = 3rd Friday of the month
  // Quarterly OPEX = 3rd Friday of Mar/Jun/Sep/Dec
  // Weekly OPEX = every Friday

  // Find next Friday
  const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
  const nextFriday = new Date(now);
  nextFriday.setDate(now.getDate() + daysUntilFriday);
  nextFriday.setHours(16, 0, 0, 0); // Market close

  // Find 3rd Friday of current month
  const firstDay = new Date(year, month, 1);
  const firstFridayOffset = (5 - firstDay.getDay() + 7) % 7;
  const thirdFriday = new Date(year, month, 1 + firstFridayOffset + 14);

  // If 3rd Friday has passed, get next month's
  let monthlyOpex = thirdFriday;
  if (thirdFriday <= now) {
    const nextMonth = month + 1;
    const nextFirstDay = new Date(year, nextMonth, 1);
    const nextFirstFridayOffset = (5 - nextFirstDay.getDay() + 7) % 7;
    monthlyOpex = new Date(year, nextMonth, 1 + nextFirstFridayOffset + 14);
  }

  const isQuarterlyMonth = [2, 5, 8, 11].includes(monthlyOpex.getMonth());
  const daysUntilMonthly = Math.ceil(
    (monthlyOpex.getTime() - now.getTime()) / 86400000
  );
  const daysUntilWeekly = Math.ceil(
    (nextFriday.getTime() - now.getTime()) / 86400000
  );

  // Gamma concentrates more near monthly/quarterly OPEX
  // Peak concentration in last 3 days before OPEX
  let gammaConcentration = 0.2; // baseline weekly
  let type: OpexData["type"] = "weekly";
  let daysUntil = daysUntilWeekly;
  let opexDate = nextFriday;

  if (daysUntilMonthly <= 7) {
    type = isQuarterlyMonth ? "quarterly" : "monthly";
    daysUntil = daysUntilMonthly;
    opexDate = monthlyOpex;
    gammaConcentration = isQuarterlyMonth ? 0.85 : 0.6;

    // Gamma spikes in final days
    if (daysUntil <= 1) gammaConcentration = Math.min(gammaConcentration + 0.15, 1);
    else if (daysUntil <= 3) gammaConcentration = Math.min(gammaConcentration + 0.1, 1);
  }

  const impactDescriptions: Record<string, string> = {
    quarterly: "Quarterly OPEX. Maximum gamma pinning and rebalancing. Expect significant dealer hedging flow.",
    monthly: "Monthly OPEX. Elevated gamma decay driving delta-hedging activity. Pin risk around major strikes.",
    weekly: "Weekly expiry. Modest gamma concentration. 0DTE effects may spike intraday.",
  };

  return {
    nextOpex: opexDate.toISOString(),
    daysUntil: Math.max(0, daysUntil),
    type,
    gammaConcentration: +gammaConcentration.toFixed(2),
    expectedImpact: impactDescriptions[type],
  };
}

// ── Trigger Level Calculation ──

function computeTriggerLevels(
  levels: GEXLevel[],
  spotPrice: number,
  putWall: number,
  callWall: number,
  zeroGammaLevel: number,
  regime: "dampening" | "amplifying" | "neutral"
): TriggerLevel[] {
  const triggers: TriggerLevel[] = [];

  // 1. Zero-gamma flip point
  triggers.push({
    price: zeroGammaLevel,
    label: "Zero Gamma",
    type: "flip",
    intensity: 0.95,
    dealerAction:
      regime === "dampening"
        ? "Below this level, dealer hedging flips from stabilizing to destabilizing. Moves accelerate."
        : "Above this level, dealer hedging shifts to stabilizing. Moves get absorbed.",
  });

  // 2. Put wall (major support from dealer hedging)
  triggers.push({
    price: putWall,
    label: "Put Wall",
    type: "support",
    intensity: 0.8,
    dealerAction:
      "Maximum put open interest. Dealers are short puts here. In positive gamma regimes, net hedging flow is supportive. In negative gamma, this level can break and trigger cascading dealer selling.",
  });

  // 3. Call wall (major resistance from dealer hedging)
  triggers.push({
    price: callWall,
    label: "Call Wall",
    type: "resistance",
    intensity: 0.8,
    dealerAction:
      "Maximum call open interest. Dealers are short calls here. Delta-hedging forces dealers to sell into rallies toward this level. Acts as a ceiling on price until open interest rolls or expires.",
  });

  // 4. Gamma magnet (highest absolute gamma strike near spot)
  const nearSpotLevels = levels.filter(
    (l) => l.strike >= spotPrice * 0.97 && l.strike <= spotPrice * 1.03
  );
  if (nearSpotLevels.length > 0) {
    const magnetStrike = nearSpotLevels.reduce((max, l) =>
      Math.abs(l.netGamma) > Math.abs(max.netGamma) ? l : max
    );
    if (Math.abs(magnetStrike.strike - spotPrice) > spotPrice * 0.002) {
      triggers.push({
        price: magnetStrike.strike,
        label: "Gamma Magnet",
        type: "magnet",
        intensity: 0.7,
        dealerAction:
          "Highest gamma concentration near spot. Price tends to gravitate here during positive gamma regimes.",
      });
    }
  }

  // 5. Acceleration zones (where cumulative gamma is most negative)
  let cumGamma = 0;
  let worstCumGamma = 0;
  let worstStrike = spotPrice;
  const sortedBelow = levels
    .filter((l) => l.strike < spotPrice)
    .sort((a, b) => b.strike - a.strike); // high to low

  for (const level of sortedBelow) {
    cumGamma += level.netGamma;
    if (cumGamma < worstCumGamma) {
      worstCumGamma = cumGamma;
      worstStrike = level.strike;
    }
  }

  if (
    worstStrike < spotPrice * 0.99 &&
    worstStrike > spotPrice * 0.9
  ) {
    triggers.push({
      price: worstStrike,
      label: "Acceleration Zone",
      type: "acceleration",
      intensity: 0.85,
      dealerAction:
        "Maximum negative cumulative gamma below spot. A break through this level triggers cascading dealer selling.",
    });
  }

  // 6. Secondary support (2nd highest put OI below spot)
  const putsBelow = levels
    .filter((l) => l.strike < putWall && l.strike < spotPrice * 0.98)
    .sort((a, b) => b.putOI - a.putOI);

  if (putsBelow.length > 0) {
    triggers.push({
      price: putsBelow[0].strike,
      label: "Secondary Support",
      type: "support",
      intensity: 0.5,
      dealerAction:
        "Secondary put concentration. If the primary put wall breaks, dealers defend here next.",
    });
  }

  return triggers.sort((a, b) => b.price - a.price);
}

// ── Scenario Profile ──
// Precompute net GEX at different spot levels for interactive slider

function computeScenarioProfile(
  levels: GEXLevel[],
  spotPrice: number
): ScenarioPoint[] {
  const points: ScenarioPoint[] = [];

  // From -5% to +5% in 0.5% steps
  for (let delta = -5; delta <= 5; delta += 0.5) {
    const newSpot = spotPrice * (1 + delta / 100);

    // Recompute net GEX at this spot level
    // Gamma effect scales inversely with distance from strike
    let netGEX = 0;
    for (const level of levels) {
      const dist = Math.abs(level.strike - newSpot) / newSpot;
      // Gamma decays ~exponentially with distance (simplified Black-Scholes behavior)
      const proximityScale = Math.exp(-dist * 30);
      netGEX += level.netGamma * proximityScale;
    }

    const regime =
      netGEX > 0 ? "dampening" : netGEX < 0 ? "amplifying" : "neutral";

    points.push({
      spotDelta: delta,
      spotPrice: +newSpot.toFixed(2),
      netGEX: +netGEX.toFixed(0),
      regime,
    });
  }

  return points;
}

// ── Flow Divergence Detection ──

function detectFlowDivergence(
  regime: "dampening" | "amplifying" | "neutral",
  spotPrice: number,
  putWall: number,
  callWall: number,
  zeroGammaLevel: number
): FlowDivergence {
  // Price rallying while in negative gamma = unsustainable, dealers chasing
  if (regime === "amplifying" && spotPrice > callWall * 0.98) {
    return {
      detected: true,
      type: "bullish_into_negative",
      severity: 0.8,
      description:
        "Price approaching call wall in amplifying regime. Rally is being amplified by dealer hedging but becomes unstable near resistance. Elevated reversal risk.",
    };
  }

  // Price near put wall during positive gamma = strong support
  if (regime === "dampening" && spotPrice < putWall * 1.02) {
    return {
      detected: true,
      type: "bearish_into_positive",
      severity: 0.5,
      description:
        "Price testing put wall in dampening regime. Dealer hedging provides strong support here. Bounce probability elevated.",
    };
  }

  // Price beyond zero gamma in wrong direction
  if (regime === "dampening" && spotPrice < zeroGammaLevel) {
    return {
      detected: true,
      type: "bearish_into_positive",
      severity: 0.7,
      description:
        "Price has broken below zero-gamma level. Regime may be shifting to amplifying. Monitor for acceleration.",
    };
  }

  return { detected: false, type: "none", severity: 0, description: "No divergence detected. Price action consistent with gamma positioning." };
}

// ── Cross-Asset Regime Narrative ──

function buildCrossAssetNarrative(summaries: GEXSummary[]): string {
  if (summaries.length < 3) {
    const s = summaries[0];
    return `${s.ticker} in ${s.regime} regime. Cross-asset analysis requires all three indices (SPY, QQQ, IWM).`;
  }

  const regimes = Object.fromEntries(summaries.map((s) => [s.ticker, s.regime]));
  const spy = regimes["SPY"];
  const qqq = regimes["QQQ"];
  const iwm = regimes["IWM"];

  // All aligned
  if (spy === qqq && qqq === iwm) {
    if (spy === "dampening") {
      return "Uniform dampening across all indices. Broad market stability. Dealer hedging suppresses moves in large-caps, tech, and small-caps alike. Low probability of outsized moves.";
    }
    if (spy === "amplifying") {
      return "Uniform amplifying across all indices. Maximum market fragility. Any directional catalyst will be amplified across the entire equity complex. Elevated tail risk.";
    }
    return "All indices at neutral gamma. Market at inflection point. Watch for positioning shifts that could push into a directional regime.";
  }

  // Divergences
  if (spy === "dampening" && iwm === "amplifying") {
    return "Large-cap stability masking small-cap fragility. SPY dampening while IWM amplifies suggests rotation risk. Small-caps vulnerable to outsized moves while large-caps absorb shocks.";
  }

  if (spy === "amplifying" && qqq === "dampening") {
    return "Broad market fragile but tech hedged. Sector divergence suggests flows concentrating in tech as a safe haven. Non-tech sectors more vulnerable to directional moves.";
  }

  if (qqq === "amplifying" && spy === "dampening") {
    return "Tech-specific fragility. QQQ in amplifying regime while SPY dampens. Any tech-sector catalyst (earnings, regulation, AI narrative) will be amplified while broad market absorbs.";
  }

  // Mixed
  const ampCount = summaries.filter((s) => s.regime === "amplifying").length;
  if (ampCount >= 2) {
    const outlier = summaries.find((s) => s.regime !== "amplifying");
    const outlierDesc = outlier?.regime === "dampening" ? "provides dampening stability" : "sits at neutral";
    return `Majority amplifying regime. Market structurally positioned for large moves. Only ${outlier?.ticker} ${outlierDesc}. Broad fragility elevated.`;
  }

  return "Mixed regime across indices. Partial hedging stability with pockets of amplification. Directional moves likely contained but watch for regime convergence.";
}

// ── Implied 1-Day Move ──

function estimateImplied1DayMove(
  netGEX: number,
  spotPrice: number,
  regime: "dampening" | "amplifying" | "neutral"
): number {
  // In dampening: gamma suppresses moves, implied daily move shrinks
  // In amplifying: gamma accelerates moves, implied daily move expands
  // Base: ~1% daily move for SPY-class instruments
  const baseDailyMove = 1.0;
  const gammaFactor = Math.abs(netGEX) / (spotPrice * 100000); // normalize

  if (regime === "dampening") {
    return +(baseDailyMove * Math.max(0.3, 1 - gammaFactor * 2)).toFixed(2);
  }
  if (regime === "amplifying") {
    return +(baseDailyMove * Math.min(3.0, 1 + gammaFactor * 3)).toFixed(2);
  }
  return +baseDailyMove.toFixed(2);
}

// ── GEX Calculation from Real Options Data ──

function calculateGEXFromChain(
  contracts: AVOptionContract[],
  spotPrice: number,
  ticker: string
): GEXSummary {
  // Group by strike
  const strikeMap = new Map<
    number,
    { callGamma: number; putGamma: number; callOI: number; putOI: number }
  >();

  for (const c of contracts) {
    const strike = parseFloat(c.strike);
    if (isNaN(strike) || strike <= 0) continue;

    const gamma = parseFloat(c.gamma) || 0;
    const oi = parseInt(c.open_interest, 10) || 0;
    const isCall = c.type?.toLowerCase() === "call";

    const existing = strikeMap.get(strike) || {
      callGamma: 0,
      putGamma: 0,
      callOI: 0,
      putOI: 0,
    };

    // GEX per strike = gamma * OI * 100 (contract multiplier) * spot
    const gexContribution = gamma * oi * 100 * spotPrice;

    if (isCall) {
      existing.callGamma += gexContribution;
      existing.callOI += oi;
    } else {
      existing.putGamma += gexContribution;
      existing.putOI += oi;
    }

    strikeMap.set(strike, existing);
  }

  // Build levels (calls positive, puts negative)
  const allLevels: GEXLevel[] = [];
  let totalNetGEX = 0;
  let maxPutOI = 0;
  let putWall = spotPrice;
  let maxCallOI = 0;
  let callWall = spotPrice;

  for (const [strike, data] of strikeMap.entries()) {
    const netGamma = data.callGamma - data.putGamma;
    totalNetGEX += netGamma;

    allLevels.push({
      strike,
      callGamma: data.callGamma,
      putGamma: -data.putGamma,
      netGamma,
      callOI: data.callOI,
      putOI: data.putOI,
    });

    if (data.putOI > maxPutOI) {
      maxPutOI = data.putOI;
      putWall = strike;
    }
    if (data.callOI > maxCallOI) {
      maxCallOI = data.callOI;
      callWall = strike;
    }
  }

  allLevels.sort((a, b) => a.strike - b.strike);

  // Find zero-gamma level (where cumulative gamma flips sign)
  let cumGamma = 0;
  let zeroGammaLevel = spotPrice;
  for (const level of allLevels) {
    const prevCum = cumGamma;
    cumGamma += level.netGamma;
    if (prevCum <= 0 && cumGamma > 0) {
      zeroGammaLevel = level.strike;
      break;
    }
    if (prevCum >= 0 && cumGamma < 0) {
      zeroGammaLevel = level.strike;
      break;
    }
  }

  const gexSign = totalNetGEX >= 0 ? "positive" : "negative";
  const regime =
    totalNetGEX > 0 ? "dampening" : totalNetGEX < 0 ? "amplifying" : "neutral";
  const flipDistance =
    spotPrice > 0
      ? +((Math.abs(zeroGammaLevel - spotPrice) / spotPrice) * 100).toFixed(2)
      : 0;

  // Filter to key strikes around spot
  const nearSpot = allLevels.filter(
    (l) => l.strike >= spotPrice * 0.9 && l.strike <= spotPrice * 1.1
  );
  const displayLevels = nearSpot.length > 0 ? nearSpot : allLevels.slice(0, 30);

  // Compute extended analytics
  const triggerLevels = computeTriggerLevels(
    allLevels, spotPrice, putWall, callWall, zeroGammaLevel, regime
  );
  const scenarioProfile = computeScenarioProfile(allLevels, spotPrice);
  const flowDivergence = detectFlowDivergence(regime, spotPrice, putWall, callWall, zeroGammaLevel);
  const dealerPositionBias = totalNetGEX > 0 ? "long" : totalNetGEX < 0 ? "short" : "flat";
  const impliedMove1Day = estimateImplied1DayMove(totalNetGEX, spotPrice, regime);

  return {
    ticker,
    spotPrice,
    netGEX: +totalNetGEX.toFixed(0),
    gexSign,
    zeroGammaLevel,
    putWall,
    callWall,
    regime,
    flipDistance,
    levels: displayLevels,
    dataSource: "live",
    confidence: 0.9,
    triggerLevels,
    scenarioProfile,
    flowDivergence,
    dealerPositionBias,
    impliedMove1Day,
  };
}

// ── Synthetic GEX Estimation ──
// When real options data is unavailable, estimate from VIX and put/call ratio

async function estimateSyntheticGEX(
  ticker: string,
  spotPrice: number,
  apiKey: string
): Promise<GEXSummary> {
  // Get put/call ratio for sentiment context
  const pcr = await getPutCallRatio();
  const pcrValue = pcr?.totalPCRatio ?? 0.7;

  // Get VIX for volatility context
  let vixLevel = 20;
  try {
    const vixQuote = await getQuote("VIXY", apiKey);
    // VIXY roughly tracks VIX, use as proxy
    vixLevel = vixQuote.price > 0 ? vixQuote.price * 1.5 : 20;
  } catch {
    // use default
  }

  // Estimation logic:
  // High VIX + high PCR = negative gamma (dealers short puts, amplifying)
  // Low VIX + low PCR = positive gamma (dealers long calls, dampening)
  const gammaScore = (30 - vixLevel) / 30 + (0.7 - pcrValue);

  const isPositive = gammaScore > 0;
  const regime = gammaScore > 0.2 ? "dampening" : gammaScore < -0.2 ? "amplifying" : "neutral";

  // Estimate walls based on round numbers around spot
  const strikeInterval = spotPrice > 200 ? 5 : spotPrice > 50 ? 1 : 0.5;
  const roundSpot = Math.round(spotPrice / strikeInterval) * strikeInterval;

  // Put wall typically 3-5% below spot, call wall 3-5% above
  const putWall = Math.round((spotPrice * 0.96) / strikeInterval) * strikeInterval;
  const callWall = Math.round((spotPrice * 1.04) / strikeInterval) * strikeInterval;

  // Zero gamma typically 1-2% from spot toward put wall when positive gamma
  const zeroGammaOffset = isPositive ? -0.015 : 0.01;
  const zeroGammaLevel =
    Math.round((spotPrice * (1 + zeroGammaOffset)) / strikeInterval) * strikeInterval;

  const flipDistance = +(
    (Math.abs(zeroGammaLevel - spotPrice) / spotPrice) *
    100
  ).toFixed(2);

  // Generate synthetic strike levels
  const levels: GEXLevel[] = [];
  const numStrikes = 20;
  const startStrike = roundSpot - numStrikes * strikeInterval;
  const endStrike = roundSpot + numStrikes * strikeInterval;

  for (let s = startStrike; s <= endStrike; s += strikeInterval) {
    const distFromSpot = (s - spotPrice) / spotPrice;
    // Gamma peaks near the money and decays
    const proximityFactor = Math.exp(-Math.abs(distFromSpot) * 20);

    const baseGamma = spotPrice * 1000 * proximityFactor;
    const callGamma = baseGamma * (1 + distFromSpot * 2);
    const putGamma = baseGamma * (1 - distFromSpot * 2);

    // OI estimate: higher near round numbers, higher at put/call walls
    const isRound = s % (strikeInterval * 10) === 0;
    const oiMultiplier = isRound ? 3 : 1;
    const callOI = Math.round(5000 * proximityFactor * oiMultiplier);
    const putOI = Math.round(5000 * proximityFactor * oiMultiplier * pcrValue);

    levels.push({
      strike: s,
      callGamma: +callGamma.toFixed(0),
      putGamma: +(-putGamma).toFixed(0),
      netGamma: +(callGamma - putGamma).toFixed(0),
      callOI,
      putOI,
    });
  }

  // Net GEX: scaled estimate
  const netGEX = +(gammaScore * spotPrice * 100000).toFixed(0);

  // Confidence based on data availability
  const confidence = pcr ? 0.5 : 0.3;

  const displayLevels = levels.filter(
    (l) => l.strike >= spotPrice * 0.9 && l.strike <= spotPrice * 1.1
  );

  // Compute extended analytics
  const triggerLevels = computeTriggerLevels(
    levels, spotPrice, putWall, callWall, zeroGammaLevel, regime
  );
  const scenarioProfile = computeScenarioProfile(levels, spotPrice);
  const flowDivergence = detectFlowDivergence(regime, spotPrice, putWall, callWall, zeroGammaLevel);
  const dealerPositionBias = isPositive ? "long" : "short";
  const impliedMove1Day = estimateImplied1DayMove(netGEX, spotPrice, regime);

  return {
    ticker,
    spotPrice,
    netGEX,
    gexSign: isPositive ? "positive" : "negative",
    zeroGammaLevel,
    putWall,
    callWall,
    regime,
    flipDistance,
    levels: displayLevels,
    dataSource: "estimated",
    confidence,
    triggerLevels,
    scenarioProfile,
    flowDivergence,
    dealerPositionBias,
    impliedMove1Day,
  };
}

// ── Main Entry Point ──

async function getTickerGEX(
  ticker: GEXTicker,
  apiKey: string
): Promise<GEXSummary> {
  // Get spot price
  let spotPrice: number;
  try {
    const quote = await getQuote(ticker, apiKey);
    spotPrice = quote.price;
  } catch {
    // Fallback spot prices (will be stale but allows estimation)
    const fallbacks: Record<string, number> = {
      SPY: 500,
      QQQ: 430,
      IWM: 200,
    };
    spotPrice = fallbacks[ticker] || 100;
  }

  // Try real options chain first
  const chain = await fetchOptionsChain(ticker, apiKey);
  if (chain && chain.length > 0) {
    return calculateGEXFromChain(chain, spotPrice, ticker);
  }

  // Fallback to synthetic estimation
  return estimateSyntheticGEX(ticker, spotPrice, apiKey);
}

export async function getGEXSnapshot(
  singleTicker?: string
): Promise<GEXSnapshot> {
  // Check cache (only for full snapshots)
  if (!singleTicker && snapshotCache && snapshotCache.expiry > Date.now()) {
    return snapshotCache.data;
  }

  const apiKey = await getApiKey();
  const tickers = singleTicker
    ? ([singleTicker.toUpperCase()] as GEXTicker[])
    : [...GEX_TICKERS];

  const summaries = await Promise.all(
    tickers.map((t) => getTickerGEX(t, apiKey))
  );

  // Aggregate regime: majority vote
  const regimeCounts = { dampening: 0, amplifying: 0, neutral: 0 };
  for (const s of summaries) {
    regimeCounts[s.regime]++;
  }
  const aggregateRegime =
    regimeCounts.dampening >= 2
      ? "dampening"
      : regimeCounts.amplifying >= 2
        ? "amplifying"
        : "neutral";

  const snapshot: GEXSnapshot = {
    summaries,
    aggregateRegime,
    lastUpdated: new Date().toISOString(),
    opex: getNextOpex(),
    crossAssetSignal: buildCrossAssetNarrative(summaries),
  };

  if (!singleTicker) {
    snapshotCache = { data: snapshot, expiry: Date.now() + CACHE_TTL };
  }

  return snapshot;
}
