/**
 * Reference Class Forecasting Engine
 *
 * Academic basis: Kahneman & Tversky (1977), Tetlock/GJP.
 * Classifies prediction claims into structured reference classes and
 * computes empirical hit rates from resolved predictions in the same class.
 *
 * Replaces coarse category-level base rates with fine-grained reference
 * class data: claimType + category + timeframe + magnitude + direction.
 *
 * Fallback hierarchy ensures usable stats even with small samples:
 *   1. Exact match (all dimensions)
 *   2. Drop magnitude bucket
 *   3. Drop direction
 *   4. claimType + category only
 *   5. Category-level fallback (equivalent to old system)
 */

import { db, schema } from "@/lib/db";
import { isNull, sql } from "drizzle-orm";

// ── Types ────────────────────────────────────────────────────────────────

export type ClaimType =
  | "percentage_threshold"
  | "price_level"
  | "day_count"
  | "relative_performance"
  | "binary_event"
  | "policy_action";

export type TimeframeBucket = "short" | "medium" | "long";
export type MagnitudeBucket = "small" | "medium" | "large";

export interface ReferenceClass {
  claimType: ClaimType;
  category: string;
  timeframeBucket: TimeframeBucket;
  magnitudeBucket: MagnitudeBucket | null;
  direction: "up" | "down" | null;
}

export interface ConfidenceInterval {
  lower: number;
  upper: number;
  width: number;
}

export interface ReferenceClassStats {
  referenceClass: ReferenceClass;
  totalPredictions: number;
  hitRate: number;
  avgStatedConfidence: number;
  calibrationGap: number;
  brierScore: number;
  sufficient: boolean;
  fallbackLevel: "exact" | "no_magnitude" | "no_direction" | "broad" | "category";
  confidenceInterval: ConfidenceInterval;
}

const MIN_SAMPLES = 5;
const MIN_BROAD_SAMPLES = 3;

// ── Claim Type Detection ─────────────────────────────────────────────────

export function detectClaimType(claim: string): ClaimType {
  const lower = claim.toLowerCase();

  // percentage_threshold: "gain/lose/rise/fall/decline/drop N%", "more than N%"
  if (
    /(gain|lose|rise|fall|decline|drop|surge|crash|grow|shrink|weaken|strengthen)\s+(more\s+than\s+|at\s+least\s+|by\s+)?\d+(\.\d+)?%/i.test(lower) ||
    /(more\s+than|at\s+least|exceed|by)\s+\d+(\.\d+)?\s*(%|percent)/i.test(lower)
  ) {
    return "percentage_threshold";
  }

  // day_count: "at least N days", "N consecutive days", "N of M trading days"
  // Must check before price_level because day_count claims often contain prices
  if (
    /at\s+least\s+\d+\s+(trading\s+)?days?/i.test(lower) ||
    /\bfor\s+\d+\s+(consecutive|trading)\s+days?/i.test(lower) ||
    /\d+\s+consecutive\s+(trading\s+)?days?/i.test(lower) ||
    /on\s+\d+\s+(of|out\s+of)\s+\d+/i.test(lower) ||
    /on\s+at\s+least\s+\d+\s+trading\s+days?/i.test(lower)
  ) {
    return "day_count";
  }

  // relative_performance: "outperform", "underperform", "relative to"
  if (/outperform|underperform|relative\s+to|compared\s+to/i.test(lower)) {
    return "relative_performance";
  }

  // price_level: "$X", "above/below X"
  if (
    /\$[\d,]+/i.test(lower) ||
    /\b(above|below|break|breach|reach|touch|trade\s+above|trade\s+below|close\s+above|close\s+below)\s+\$?[\d,]+/i.test(lower)
  ) {
    return "price_level";
  }

  // policy_action: institutional actors + policy-specific verbs (not general verbs like "will")
  if (
    /\b(fed|ecb|boj|pboc|rba|boe|opec|congress|parliament|senate|white\s+house)\b/i.test(lower) &&
    /\b(announce|implement|impose|enact|ratify|cut|raise|hold|approve|vote)\b/i.test(lower)
  ) {
    return "policy_action";
  }

  // policy_action: specific policy keywords
  if (/\b(announce|implement|impose|sanction|tariff|embargo|ratify|enact)\b/i.test(lower)) {
    return "policy_action";
  }

  return "binary_event";
}

// ── Timeframe Bucketing ──────────────────────────────────────────────────

export function getTimeframeBucket(timeframe: string): TimeframeBucket {
  const lower = timeframe.toLowerCase();
  const dayMatch = lower.match(/(\d+)\s*d/);
  const hourMatch = lower.match(/(\d+)\s*h/);

  let days = 14; // default
  if (dayMatch) {
    days = parseInt(dayMatch[1], 10);
  } else if (hourMatch) {
    days = Math.ceil(parseInt(hourMatch[1], 10) / 24);
  } else if (lower.includes("week")) {
    const weekMatch = lower.match(/(\d+)\s*week/);
    days = weekMatch ? parseInt(weekMatch[1], 10) * 7 : 7;
  } else if (lower.includes("month")) {
    days = 30;
  }

  if (days <= 7) return "short";
  if (days <= 21) return "medium";
  return "long";
}

// ── Magnitude Bucketing ──────────────────────────────────────────────────

export function getMagnitudeBucket(
  claim: string,
  priceTarget: number | null,
  referencePrice: number | null
): MagnitudeBucket | null {
  let pctMove: number | null = null;

  // Extract explicit percentage from claim
  const pctMatch = claim.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pctMatch) {
    pctMove = parseFloat(pctMatch[1]);
  }

  // Compute from price target vs reference price
  if (pctMove === null && priceTarget != null && referencePrice != null && referencePrice > 0) {
    pctMove = Math.abs((priceTarget - referencePrice) / referencePrice) * 100;
  }

  if (pctMove === null) return null;
  if (pctMove <= 3) return "small";
  if (pctMove <= 10) return "medium";
  return "large";
}

// ── Main Classification ──────────────────────────────────────────────────

export function classifyClaim(
  claim: string,
  category: string,
  timeframe: string,
  direction: string | null,
  priceTarget: number | null,
  referencePrice: number | null
): ReferenceClass {
  return {
    claimType: detectClaimType(claim),
    category,
    timeframeBucket: getTimeframeBucket(timeframe),
    magnitudeBucket: getMagnitudeBucket(claim, priceTarget, referencePrice),
    direction: direction === "up" || direction === "down" ? direction : null,
  };
}

// ── Reference Class Matching ─────────────────────────────────────────────

type MatchLevel = "exact" | "no_magnitude" | "no_direction" | "broad" | "category";

function matchesReferenceClass(
  candidate: ReferenceClass,
  target: ReferenceClass,
  level: MatchLevel
): boolean {
  if (level === "category") {
    return candidate.category === target.category;
  }
  if (level === "broad") {
    return candidate.claimType === target.claimType && candidate.category === target.category;
  }
  if (level === "no_direction") {
    return (
      candidate.claimType === target.claimType &&
      candidate.category === target.category &&
      candidate.timeframeBucket === target.timeframeBucket
    );
  }
  if (level === "no_magnitude") {
    return (
      candidate.claimType === target.claimType &&
      candidate.category === target.category &&
      candidate.timeframeBucket === target.timeframeBucket &&
      candidate.direction === target.direction
    );
  }
  // exact
  return (
    candidate.claimType === target.claimType &&
    candidate.category === target.category &&
    candidate.timeframeBucket === target.timeframeBucket &&
    candidate.magnitudeBucket === target.magnitudeBucket &&
    candidate.direction === target.direction
  );
}

// ── Stats Computation ────────────────────────────────────────────────────

interface ResolvedPrediction {
  claim: string;
  category: string;
  timeframe: string;
  direction: string | null;
  priceTarget: number | null;
  referenceSymbol: string | null;
  confidence: number;
  outcome: string;
  referencePrices: string | null;
}

/**
 * Wilson score interval for binomial proportions.
 * Standard method for small-sample confidence intervals (Gneiting & Raftery 2007).
 */
function wilsonInterval(successes: number, total: number, z = 1.96): ConfidenceInterval {
  if (total === 0) return { lower: 0, upper: 1, width: 1 };
  const p = successes / total;
  const denom = 1 + z * z / total;
  const center = (p + z * z / (2 * total)) / denom;
  const spread = (z / denom) * Math.sqrt(p * (1 - p) / total + z * z / (4 * total * total));
  const lower = Math.max(0, center - spread);
  const upper = Math.min(1, center + spread);
  return {
    lower: Math.round(lower * 1000) / 1000,
    upper: Math.round(upper * 1000) / 1000,
    width: Math.round((upper - lower) * 1000) / 1000,
  };
}

function computeStats(
  preds: ResolvedPrediction[],
  refClass: ReferenceClass,
  fallbackLevel: MatchLevel
): ReferenceClassStats {
  if (preds.length === 0) {
    return {
      referenceClass: refClass,
      totalPredictions: 0,
      hitRate: 0.30,
      avgStatedConfidence: 0.50,
      calibrationGap: 0.20,
      brierScore: 0.25,
      sufficient: false,
      fallbackLevel,
      confidenceInterval: { lower: 0, upper: 1, width: 1 },
    };
  }

  const hits = preds.filter((p) => p.outcome === "confirmed" || p.outcome === "partial").length;
  const hitRate = hits / preds.length;
  const avgConf = preds.reduce((s, p) => s + p.confidence, 0) / preds.length;
  const brier =
    preds.reduce((s, p) => {
      const actual = p.outcome === "confirmed" ? 1 : p.outcome === "partial" ? 0.5 : 0;
      return s + Math.pow(p.confidence - actual, 2);
    }, 0) / preds.length;
  const ci = wilsonInterval(hits, preds.length);

  return {
    referenceClass: refClass,
    totalPredictions: preds.length,
    hitRate: Math.round(hitRate * 1000) / 1000,
    avgStatedConfidence: Math.round(avgConf * 1000) / 1000,
    calibrationGap: Math.round((avgConf - hitRate) * 1000) / 1000,
    brierScore: Math.round(brier * 1000) / 1000,
    sufficient: preds.length >= MIN_SAMPLES,
    fallbackLevel,
    confidenceInterval: ci,
  };
}

function safeParse(json: string | null, fallback: unknown): unknown {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

// ── Reference Class Stats (DB-backed) ────────────────────────────────────

let resolvedCache: { data: ResolvedPrediction[]; fetchedAt: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000;

async function getResolvedPredictions(): Promise<ResolvedPrediction[]> {
  if (resolvedCache && Date.now() - resolvedCache.fetchedAt < CACHE_TTL) {
    return resolvedCache.data;
  }

  try {
    const rows = await db
      .select({
        claim: schema.predictions.claim,
        category: schema.predictions.category,
        timeframe: schema.predictions.timeframe,
        direction: schema.predictions.direction,
        priceTarget: schema.predictions.priceTarget,
        referenceSymbol: schema.predictions.referenceSymbol,
        confidence: schema.predictions.confidence,
        outcome: schema.predictions.outcome,
        referencePrices: schema.predictions.referencePrices,
      })
      .from(schema.predictions)
      .where(
        sql`${schema.predictions.outcome} IS NOT NULL
            AND ${schema.predictions.outcome} NOT IN ('expired', 'post_event')
            AND ${schema.predictions.preEvent} = 1`
      );

    const data = rows as unknown as ResolvedPrediction[];
    resolvedCache = { data, fetchedAt: Date.now() };
    return data;
  } catch {
    return resolvedCache?.data || [];
  }
}

export async function getReferenceClassStats(
  refClass: ReferenceClass
): Promise<ReferenceClassStats> {
  const resolved = await getResolvedPredictions();

  // Classify each resolved prediction
  const classified = resolved.map((p) => {
    const refPrices = safeParse(p.referencePrices, {}) as Record<string, number>;
    const refPrice = p.referenceSymbol ? refPrices[p.referenceSymbol] ?? null : null;
    const rc = classifyClaim(p.claim, p.category, p.timeframe || "14 days", p.direction, p.priceTarget, refPrice);
    return { prediction: p, rc };
  });

  // Try each fallback level
  const levels: MatchLevel[] = ["exact", "no_magnitude", "no_direction", "broad", "category"];
  const thresholds = [MIN_SAMPLES, MIN_SAMPLES, MIN_SAMPLES, MIN_BROAD_SAMPLES, 0];

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    const threshold = thresholds[i];
    const matches = classified
      .filter(({ rc }) => matchesReferenceClass(rc, refClass, level))
      .map(({ prediction }) => prediction);

    if (matches.length >= threshold) {
      return computeStats(matches, refClass, level);
    }
  }

  // Should never reach here (category matches with threshold 0), but just in case
  return computeStats([], refClass, "category");
}

// ── Context for Prompt Injection ─────────────────────────────────────────

export async function getReferenceClassContext(
  claims?: Array<{ claim: string; category: string; timeframe: string; direction: string | null; priceTarget: number | null; referencePrice: number | null }>
): Promise<string> {
  if (!claims || claims.length === 0) {
    // Aggregate context: show stats by claim type
    const resolved = await getResolvedPredictions();
    if (resolved.length === 0) {
      return "REFERENCE CLASS DATA: No resolved predictions yet. Use base rate priors.";
    }

    const byType: Record<string, { total: number; hits: number; avgConf: number }> = {};
    for (const p of resolved) {
      const refPrices = safeParse(p.referencePrices, {}) as Record<string, number>;
      const refPrice = p.referenceSymbol ? refPrices[p.referenceSymbol] ?? null : null;
      const rc = classifyClaim(p.claim, p.category, p.timeframe || "14 days", p.direction, p.priceTarget, refPrice);
      const key = `${rc.claimType}/${rc.category}`;
      if (!byType[key]) byType[key] = { total: 0, hits: 0, avgConf: 0 };
      byType[key].total++;
      if (p.outcome === "confirmed" || p.outcome === "partial") byType[key].hits++;
      byType[key].avgConf += p.confidence;
    }

    const lines = [
      "REFERENCE CLASS DATA (your track record by prediction type):",
      "",
    ];
    for (const [key, data] of Object.entries(byType).sort((a, b) => b[1].total - a[1].total)) {
      const hitRate = data.total > 0 ? (data.hits / data.total * 100).toFixed(0) : "N/A";
      const avgConf = data.total > 0 ? (data.avgConf / data.total * 100).toFixed(0) : "N/A";
      const gap = data.total > 0 ? ((data.avgConf / data.total - data.hits / data.total) * 100).toFixed(0) : "0";
      const ci = data.total > 0 ? wilsonInterval(data.hits, data.total) : null;
      const ciStr = ci ? ` [95% CI: ${(ci.lower * 100).toFixed(0)}-${(ci.upper * 100).toFixed(0)}%]` : "";
      lines.push(`  ${key}: hit rate ${hitRate}%${ciStr} (n=${data.total}), avg confidence ${avgConf}%, gap ${Number(gap) > 0 ? "+" : ""}${gap}pp`);
    }
    lines.push("");
    lines.push("Start from the reference class hit rate as your anchor. Adjust based on specific evidence, but document why your estimate diverges.");

    return lines.join("\n");
  }

  // Per-prediction context (not used in batch prompt, available for future use)
  const results: string[] = [];
  for (const c of claims) {
    const rc = classifyClaim(c.claim, c.category, c.timeframe, c.direction, c.priceTarget, c.referencePrice);
    const stats = await getReferenceClassStats(rc);
    results.push(
      `[${rc.claimType}/${rc.category}/${rc.timeframeBucket}] hit rate: ${(stats.hitRate * 100).toFixed(0)}% (n=${stats.totalPredictions}), avg confidence: ${(stats.avgStatedConfidence * 100).toFixed(0)}%, gap: ${stats.calibrationGap > 0 ? "+" : ""}${(stats.calibrationGap * 100).toFixed(0)}pp (${stats.fallbackLevel})`
    );
  }
  return "REFERENCE CLASS DATA:\n" + results.join("\n");
}

// ── Cache Reset (for testing) ────────────────────────────────────────────

export function _resetCache(): void {
  resolvedCache = null;
}
