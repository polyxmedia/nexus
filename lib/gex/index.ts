// Gamma Exposure (GEX) Engine
// Estimates net gamma exposure for major ETFs (SPY, QQQ, IWM)
// Uses Alpha Vantage options data when available, falls back to synthetic estimation

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
}

export interface GEXSnapshot {
  summaries: GEXSummary[];
  aggregateRegime: "dampening" | "amplifying" | "neutral";
  lastUpdated: string;
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
  const levels: GEXLevel[] = [];
  let totalNetGEX = 0;
  let maxPutOI = 0;
  let putWall = spotPrice;
  let maxCallOI = 0;
  let callWall = spotPrice;

  for (const [strike, data] of strikeMap.entries()) {
    const netGamma = data.callGamma - data.putGamma;
    totalNetGEX += netGamma;

    levels.push({
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

  levels.sort((a, b) => a.strike - b.strike);

  // Find zero-gamma level (where cumulative gamma flips sign)
  let cumGamma = 0;
  let zeroGammaLevel = spotPrice;
  for (const level of levels) {
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

  // Filter to key strikes around spot (20 strikes above and below)
  const nearSpot = levels.filter(
    (l) =>
      l.strike >= spotPrice * 0.9 && l.strike <= spotPrice * 1.1
  );

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
    levels: nearSpot.length > 0 ? nearSpot : levels.slice(0, 30),
    dataSource: "live",
    confidence: 0.9,
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
    levels: levels.filter(
      (l) => l.strike >= spotPrice * 0.9 && l.strike <= spotPrice * 1.1
    ),
    dataSource: "estimated",
    confidence,
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
  };

  if (!singleTicker) {
    snapshotCache = { data: snapshot, expiry: Date.now() + CACHE_TTL };
  }

  return snapshot;
}
