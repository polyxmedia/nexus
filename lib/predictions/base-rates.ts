/**
 * Dynamic base rates for prediction anchoring.
 *
 * Implements Tetlock's "Fermi-ize" principle: start from outside-view
 * base rates before applying inside-view adjustments.
 *
 * Base rates are stored in the DB and auto-update from resolved predictions.
 * Falls back to hardcoded defaults if DB is unavailable.
 */

import { db } from "../db";
import { sql, eq, isNull, not } from "drizzle-orm";

// ── DB Row Type ──

interface BaseRateRow {
  id: number;
  category: string;
  pattern: string;
  label: string;
  timeframe: string;
  base_rate: number;
  observed_rate: number | null;
  sample_count: number;
  last_updated: string;
  keywords: string;
}

// ── Cache (refreshed every 10 min) ──

let cachedRates: BaseRateRow[] = [];
let cacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 min

async function loadRates(): Promise<BaseRateRow[]> {
  if (cachedRates.length > 0 && Date.now() - cacheTime < CACHE_TTL) {
    return cachedRates;
  }
  try {
    const rows = await db.execute(sql`SELECT * FROM prediction_base_rates ORDER BY category, pattern`);
    cachedRates = (rows.rows || []) as unknown as BaseRateRow[];
    cacheTime = Date.now();
    return cachedRates;
  } catch {
    return cachedRates; // return stale cache on error
  }
}

// ── Public: Get Best Matching Base Rate ──

/**
 * Finds the best matching base rate for a claim by keyword scoring.
 * Returns the effective rate (observed_rate if enough samples, otherwise base_rate).
 */
export async function getBaseRate(category: string, claim: string): Promise<{ rate: number; pattern: string; sampleCount: number }> {
  const rates = await loadRates();
  const lower = claim.toLowerCase();

  // Score each rate by keyword matches
  const candidates = rates
    .filter((r) => r.category === category)
    .map((r) => {
      const keywords = r.keywords.split(",").map((k) => k.trim()).filter(Boolean);
      let score = 0;
      for (const kw of keywords) {
        if (lower.includes(kw)) score++;
      }
      return { ...r, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    return { rate: 0.10, pattern: "default", sampleCount: 0 };
  }

  const best = candidates[0];
  // Use observed rate if we have enough samples (5+), otherwise use the prior
  const effectiveRate = best.observed_rate != null && best.sample_count >= 5
    ? best.observed_rate
    : best.base_rate;

  return { rate: effectiveRate, pattern: best.pattern, sampleCount: best.sample_count };
}

// ── Public: Update Observed Rates from Resolved Predictions ──

/**
 * Recomputes observed hit rates from all resolved predictions and updates the DB.
 * Called after each resolution batch.
 */
export async function updateObservedRates(): Promise<number> {
  const rates = await loadRates();
  let updated = 0;

  // Fetch all resolved non-expired predictions
  const resolved = await db.execute(sql`
    SELECT claim, category, outcome FROM predictions
    WHERE outcome IS NOT NULL AND outcome != 'expired'
  `);
  const predictions = (resolved.rows || []) as Array<{ claim: string; category: string; outcome: string }>;

  if (predictions.length === 0) return 0;

  for (const rate of rates) {
    const keywords = rate.keywords.split(",").map((k) => k.trim()).filter(Boolean);
    if (keywords.length === 0) continue;

    // Find predictions matching this rate's keywords and category
    const matching = predictions.filter((p) => {
      if (p.category !== rate.category) return false;
      const lower = p.claim.toLowerCase();
      return keywords.some((kw) => lower.includes(kw));
    });

    if (matching.length === 0) continue;

    const hits = matching.filter((p) => p.outcome === "confirmed" || p.outcome === "partial").length;
    const observedRate = hits / matching.length;

    // Blend: weighted average of prior (base_rate) and observed, with more weight on observed as sample grows
    // At 5 samples: 50/50 blend. At 20+: 90% observed.
    const observedWeight = Math.min(0.9, matching.length / (matching.length + 5));
    const blendedRate = (1 - observedWeight) * rate.base_rate + observedWeight * observedRate;

    await db.execute(sql`
      UPDATE prediction_base_rates
      SET observed_rate = ${Math.round(blendedRate * 10000) / 10000},
          sample_count = ${matching.length},
          last_updated = ${new Date().toISOString().split("T")[0]}
      WHERE id = ${rate.id}
    `);
    updated++;
  }

  // Invalidate cache
  cacheTime = 0;
  return updated;
}

// ── Public: Get Context for Prompt Injection ──

/**
 * Returns formatted base rate context for the generation prompt.
 */
export async function getBaseRateContext(): Promise<string> {
  const rates = await loadRates();
  const lines: string[] = ["EMPIRICAL BASE RATES (outside-view anchors - auto-updated from resolved predictions):"];

  const categories = [...new Set(rates.map((r) => r.category))];

  for (const category of categories) {
    const catRates = rates.filter((r) => r.category === category);
    lines.push("");
    lines.push(`[${category.toUpperCase()}]`);

    for (const r of catRates) {
      const effectiveRate = r.observed_rate != null && r.sample_count >= 5
        ? r.observed_rate
        : r.base_rate;
      const pct = effectiveRate * 100;
      const formatted = pct < 1 ? pct.toFixed(1) : Math.round(pct);
      const source = r.observed_rate != null && r.sample_count >= 5
        ? `observed from ${r.sample_count} predictions`
        : "prior estimate";
      lines.push(`- ${r.label}: ${formatted}% per ${r.timeframe} (${source})`);
    }
  }

  lines.push("");
  lines.push("Start from these anchors. Adjust based on specific evidence, but document WHY your estimate diverges from the base rate. Large divergences (>30pp) require strong justification.");

  return lines.join("\n");
}

// ── Log-Odds Adjustment ──

function toLogOdds(p: number): number {
  const clamped = Math.max(0.001, Math.min(0.999, p));
  return Math.log(clamped / (1 - clamped));
}

function fromLogOdds(lo: number): number {
  return 1 / (1 + Math.exp(-lo));
}

/**
 * Adjusts a stated confidence toward the base rate using log-odds
 * weighted averaging. Evidence strength controls pull from base rate.
 */
export function adjustForBaseRate(
  statedConfidence: number,
  baseRate: number,
  evidenceStrength: number
): number {
  const clampedStrength = Math.max(1, Math.min(5, evidenceStrength));
  const modelWeight = clampedStrength <= 4
    ? clampedStrength * 0.2
    : 0.9;
  const baseWeight = 1 - modelWeight;

  const baseLO = toLogOdds(baseRate);
  const modelLO = toLogOdds(statedConfidence);
  const adjustedLO = baseWeight * baseLO + modelWeight * modelLO;

  return fromLogOdds(adjustedLO);
}
