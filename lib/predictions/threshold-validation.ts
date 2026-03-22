/**
 * Threshold Validation Gate
 *
 * Academic basis: Reference class forecasting applied to the threshold itself
 * (Kahneman & Tversky 1977). "How often has a move of this magnitude occurred?"
 *
 * Computes the percentile rank of a predicted threshold against historical
 * asset-class distributions, then applies a graduated confidence discount.
 *
 * Uses smooth cosine interpolation (no step functions) to avoid discontinuities.
 */

// ── Types ────────────────────────────────────────────────────────────────

export interface ThresholdValidation {
  percentileRank: number;
  discountMultiplier: number;
  hasBeenAchieved: boolean;
  sampleSize: number;
  reason: string;
}

// ── Magnitude Profiles (same data as engine.ts, extracted for reuse) ─────

interface MagnitudeProfile {
  median: number;
  p90: number;
  p99: number;
}

const MAGNITUDE_PROFILES: Record<string, Record<number, MagnitudeProfile>> = {
  equity_index: {
    7:  { median: 1.5, p90: 4.0, p99: 8.0 },
    14: { median: 2.2, p90: 5.5, p99: 11.0 },
    30: { median: 3.5, p90: 8.0, p99: 16.0 },
    90: { median: 6.0, p90: 14.0, p99: 25.0 },
  },
  leveraged: {
    7:  { median: 8.0, p90: 20.0, p99: 50.0 },
    14: { median: 12.0, p90: 30.0, p99: 70.0 },
    30: { median: 18.0, p90: 45.0, p99: 90.0 },
    90: { median: 30.0, p90: 70.0, p99: 95.0 },
  },
  sector: {
    7:  { median: 2.0, p90: 5.0, p99: 10.0 },
    14: { median: 3.0, p90: 7.0, p99: 14.0 },
    30: { median: 4.5, p90: 10.0, p99: 20.0 },
    90: { median: 8.0, p90: 18.0, p99: 30.0 },
  },
  commodity: {
    7:  { median: 2.5, p90: 6.0, p99: 12.0 },
    14: { median: 3.5, p90: 8.0, p99: 16.0 },
    30: { median: 5.0, p90: 12.0, p99: 22.0 },
    90: { median: 9.0, p90: 20.0, p99: 35.0 },
  },
  stock: {
    7:  { median: 3.0, p90: 8.0, p99: 18.0 },
    14: { median: 4.5, p90: 11.0, p99: 22.0 },
    30: { median: 6.5, p90: 15.0, p99: 30.0 },
    90: { median: 12.0, p90: 25.0, p99: 45.0 },
  },
};

// ── Asset Classification ─────────────────────────────────────────────────

// Synced with engine.ts ticker sets to avoid classification inconsistencies
const LEVERAGED_TICKERS = new Set([
  "UVXY", "VXX", "VIXY", "SVXY", "SVIX",
  "SQQQ", "TQQQ", "SPXU", "SPXS", "UPRO",
  "TZA", "TNA", "SOXS", "SOXL", "LABU", "LABD",
  "NUGT", "DUST", "JNUG", "JDST", "ERX", "ERY",
  "FAS", "FAZ", "YANG", "YINN",
]);
const EQUITY_INDEX_TICKERS = new Set([
  "SPY", "QQQ", "IWM", "DIA", "VOO", "VTI", "IVV",
  "EFA", "EEM", "VEA", "VWO", "ACWI", "IEMG", "DAX",
]);
const SECTOR_TICKERS = new Set([
  "XLK", "XLF", "XLE", "XLV", "XLI", "XLB", "XLP", "XLU", "XLY", "XLRE",
  "XLC", "XBI", "XHB", "XRT", "XME", "XOP", "KRE", "SMH", "SOXX", "IGV",
  "HYG", "IEF", "TLT", "LQD",
]);
const COMMODITY_TICKERS = new Set([
  "USO", "GLD", "SLV", "UNG", "WEAT", "CPER", "DBA", "DBC", "PDBC",
  "GDX", "GDXJ", "IAU", "PPLT",
]);

function getAssetClass(ticker: string | null): string {
  if (!ticker) return "stock";
  const upper = ticker.toUpperCase();
  if (LEVERAGED_TICKERS.has(upper)) return "leveraged";
  if (EQUITY_INDEX_TICKERS.has(upper)) return "equity_index";
  if (SECTOR_TICKERS.has(upper)) return "sector";
  if (COMMODITY_TICKERS.has(upper)) return "commodity";
  return "stock";
}

function getClosestTimeframe(days: number): number {
  const timeframes = [7, 14, 30, 90];
  return timeframes.reduce((prev, curr) =>
    Math.abs(curr - days) < Math.abs(prev - days) ? curr : prev
  );
}

// ── Percentile Computation ───────────────────────────────────────────────

/**
 * Compute the percentile rank of a percentage move for a given asset class
 * and timeframe. Uses linear interpolation between known quantiles:
 *   0% → 0th percentile
 *   median → 50th percentile
 *   p90 → 90th percentile
 *   p99 → 99th percentile
 *   >p99 → 99+
 */
export function computeMovePercentile(
  assetClass: string,
  percentageMove: number,
  timeframeDays: number
): number {
  const profiles = MAGNITUDE_PROFILES[assetClass] || MAGNITUDE_PROFILES.stock;
  const tf = getClosestTimeframe(timeframeDays);
  const profile = profiles[tf];
  const absMove = Math.abs(percentageMove);

  if (absMove <= 0) return 0;
  if (absMove <= profile.median) {
    return (absMove / profile.median) * 50;
  }
  if (absMove <= profile.p90) {
    return 50 + ((absMove - profile.median) / (profile.p90 - profile.median)) * 40;
  }
  if (absMove <= profile.p99) {
    return 90 + ((absMove - profile.p90) / (profile.p99 - profile.p90)) * 9;
  }
  // Beyond p99: extrapolate linearly but cap at 100
  const beyondP99 = 99 + ((absMove - profile.p99) / profile.p99) * 10;
  return Math.min(100, beyondP99);
}

// ── Discount Function ────────────────────────────────────────────────────

/**
 * Graduated confidence discount based on percentile rank.
 * Uses smooth cosine interpolation (no discontinuities).
 *
 *   percentile <= 75: multiplier 1.0 (no discount)
 *   percentile 75-99: smooth curve from 1.0 to 0.30
 *   percentile >= 99: multiplier 0.30
 */
export function percentileToDiscount(percentile: number): number {
  if (percentile <= 75) return 1.0;
  if (percentile >= 99) return 0.30;

  const t = (percentile - 75) / (99 - 75);
  const cosineT = (1 - Math.cos(t * Math.PI)) / 2;
  return 1.0 - cosineT * 0.70;
}

// ── Main Validation Function ─────────────────────────────────────────────

/**
 * Validate a prediction's threshold against historical feasibility.
 * Extracts the implied percentage move from claim text, price targets,
 * or reference prices and computes a graduated discount.
 */
export function validateThreshold(
  claim: string,
  referenceSymbol: string | null,
  priceTarget: number | null,
  referencePrice: number | null,
  timeframeDays: number,
): ThresholdValidation {
  // Extract the implied percentage move
  let impliedMove: number | null = null;

  // 1. Explicit percentage in claim
  const pctMatch = claim.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pctMatch) {
    impliedMove = parseFloat(pctMatch[1]);
  }

  // 2. Compute from price target vs reference price
  if (impliedMove === null && priceTarget != null && referencePrice != null && referencePrice > 0) {
    impliedMove = Math.abs((priceTarget - referencePrice) / referencePrice) * 100;
  }

  // If we can't determine the move, no discount
  if (impliedMove === null || impliedMove <= 0) {
    return {
      percentileRank: 0,
      discountMultiplier: 1.0,
      hasBeenAchieved: true,
      sampleSize: 0,
      reason: "No quantifiable threshold to validate",
    };
  }

  const assetClass = getAssetClass(referenceSymbol);
  const percentile = computeMovePercentile(assetClass, impliedMove, timeframeDays);
  const discount = percentileToDiscount(percentile);

  const profiles = MAGNITUDE_PROFILES[assetClass] || MAGNITUDE_PROFILES.stock;
  const tf = getClosestTimeframe(timeframeDays);
  const profile = profiles[tf];

  return {
    percentileRank: Math.round(percentile * 10) / 10,
    discountMultiplier: Math.round(discount * 1000) / 1000,
    hasBeenAchieved: impliedMove <= profile.p99,
    sampleSize: 1, // Based on empirical profiles, not individual samples
    reason: percentile <= 75
      ? `${impliedMove.toFixed(1)}% move is within normal range for ${assetClass} (${timeframeDays}d)`
      : percentile <= 90
        ? `${impliedMove.toFixed(1)}% move is above median but achievable for ${assetClass} (p${Math.round(percentile)})`
        : `${impliedMove.toFixed(1)}% move is in the ${Math.round(percentile)}th percentile for ${assetClass} — historically rare`,
  };
}
