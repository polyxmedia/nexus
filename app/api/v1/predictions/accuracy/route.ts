import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/with-api-auth";
import { apiSuccess, apiError } from "@/lib/api/response";
import { db, schema } from "@/lib/db";
import { and, isNotNull, eq, gte } from "drizzle-orm";

const VALID_CATEGORIES = ["market", "geopolitical", "celestial"];

function groupByField<T>(
  items: T[],
  keyFn: (item: T) => string,
  scoreFn: (item: T) => number | null,
): Record<string, { count: number; avgBrier: number | null }> {
  const groups = new Map<string, { count: number; scores: number[] }>();
  for (const item of items) {
    const key = keyFn(item);
    if (!groups.has(key)) groups.set(key, { count: 0, scores: [] });
    const g = groups.get(key)!;
    g.count++;
    const s = scoreFn(item);
    if (s !== null) g.scores.push(s);
  }
  const result: Record<string, { count: number; avgBrier: number | null }> = {};
  for (const [key, { count, scores }] of groups) {
    result[key] = {
      count,
      avgBrier: scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : null,
    };
  }
  return result;
}

export const GET = withApiAuth(async (request: NextRequest, ctx) => {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const since = searchParams.get("since"); // ISO date string, e.g. 2025-03-13

  if (category && !VALID_CATEGORIES.includes(category)) {
    return apiError(
      "invalid_category",
      `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}`,
      400,
    );
  }

  // Build WHERE conditions
  const conditions = [isNotNull(schema.predictions.outcome)];
  if (category) {
    conditions.push(eq(schema.predictions.category, category));
  }
  // Default to last 12 months if no since param
  const sinceDate = since || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  conditions.push(gte(schema.predictions.createdAt, sinceDate));

  const filtered: (typeof schema.predictions.$inferSelect)[] = await db
    .select()
    .from(schema.predictions)
    .where(and(...conditions));

  if (filtered.length === 0) {
    return apiSuccess(
      {
        totalResolved: 0,
        brierScore: null,
        accuracyRate: null,
        byOutcome: {},
        byCategory: {},
        byRegime: {},
        directionAccuracy: null,
        levelAccuracy: null,
        calibration: [],
      },
      { tier: ctx.tier },
    );
  }

  // Brier score: average of all scored predictions
  const scored = filtered.filter((p) => p.score !== null);
  const brierScore = scored.length > 0
    ? scored.reduce((sum, p) => sum + (p.score ?? 0), 0) / scored.length
    : null;

  // Outcome breakdown
  const byOutcome: Record<string, number> = {};
  for (const p of filtered) {
    const o = p.outcome || "unknown";
    byOutcome[o] = (byOutcome[o] || 0) + 1;
  }

  const byCategory = groupByField(
    filtered,
    (p) => p.category || "uncategorized",
    (p) => p.score,
  );

  const byRegime = groupByField(
    filtered,
    (p) => p.regimeAtCreation || "unknown",
    (p) => p.score,
  );

  // Direction vs level accuracy
  const withDirection = filtered.filter((p) => p.directionCorrect !== null);
  const directionAccuracy = withDirection.length > 0
    ? withDirection.filter((p) => p.directionCorrect === 1).length / withDirection.length
    : null;

  const withLevel = filtered.filter((p) => p.levelCorrect !== null);
  const levelAccuracy = withLevel.length > 0
    ? withLevel.filter((p) => p.levelCorrect === 1).length / withLevel.length
    : null;

  // Accuracy rate (confirmed / total resolved, excluding expired)
  const nonExpired = filtered.filter((p) => p.outcome !== "expired" && p.outcome !== "post_event");
  const confirmed = nonExpired.filter((p) => p.outcome === "confirmed");
  const accuracyRate = nonExpired.length > 0
    ? confirmed.length / nonExpired.length
    : null;

  // Calibration buckets (group by confidence decile)
  const buckets = new Map<number, { total: number; correct: number }>();
  for (const p of nonExpired) {
    const bucket = Math.floor((p.confidence ?? 0.5) * 10) / 10; // 0.0, 0.1, ... 0.9
    if (!buckets.has(bucket)) buckets.set(bucket, { total: 0, correct: 0 });
    const b = buckets.get(bucket)!;
    b.total++;
    if (p.outcome === "confirmed") b.correct++;
  }

  const calibration = Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([confidence, { total, correct }]) => ({
      confidenceBucket: confidence,
      predictions: total,
      actualRate: total > 0 ? correct / total : 0,
    }));

  // BSS computation
  const DEFAULT_BASE_RATE = 0.30;
  const scoreableForBss = nonExpired.filter((p) => p.preEvent === 1);
  let brierSkillScore: number | null = null;
  let brierBaseline: number | null = null;

  if (scoreableForBss.length >= 3) {
    const systemBrier = scoreableForBss.reduce((sum, p) => {
      const actual = p.outcome === "confirmed" ? 1 : p.outcome === "partial" ? 0.5 : 0;
      return sum + Math.pow(p.confidence - actual, 2);
    }, 0) / scoreableForBss.length;

    const baselineBrier = scoreableForBss.reduce((sum, p) => {
      const br = p.baseRateAtCreation ?? DEFAULT_BASE_RATE;
      const actual = p.outcome === "confirmed" ? 1 : p.outcome === "partial" ? 0.5 : 0;
      return sum + Math.pow(br - actual, 2);
    }, 0) / scoreableForBss.length;

    brierBaseline = baselineBrier;
    if (baselineBrier > 0) {
      brierSkillScore = 1 - (systemBrier / baselineBrier);
    }
  }

  // Difficulty tiers
  type TierKey = "easy" | "medium" | "hard";
  function classifyDifficulty(baseRate: number): TierKey {
    if (baseRate > 0.8 || baseRate < 0.2) return "easy";
    if (baseRate >= 0.4 && baseRate <= 0.6) return "hard";
    return "medium";
  }

  let difficultyTiers: Record<TierKey, { count: number; brier: number; bss: number | null }> | null = null;
  if (scoreableForBss.length >= 3) {
    const tierBuckets: Record<TierKey, Array<{ confidence: number; outcome: string; baseRate: number }>> = { easy: [], medium: [], hard: [] };
    for (const p of scoreableForBss) {
      const br = p.baseRateAtCreation ?? DEFAULT_BASE_RATE;
      const tier = classifyDifficulty(br);
      tierBuckets[tier].push({ confidence: p.confidence, outcome: p.outcome!, baseRate: br });
    }
    function tierStats(preds: Array<{ confidence: number; outcome: string; baseRate: number }>) {
      if (preds.length === 0) return { count: 0, brier: 0, bss: null as number | null };
      const b = preds.reduce((s, p) => {
        const actual = p.outcome === "confirmed" ? 1 : p.outcome === "partial" ? 0.5 : 0;
        return s + Math.pow(p.confidence - actual, 2);
      }, 0) / preds.length;
      const bl = preds.reduce((s, p) => {
        const actual = p.outcome === "confirmed" ? 1 : p.outcome === "partial" ? 0.5 : 0;
        return s + Math.pow(p.baseRate - actual, 2);
      }, 0) / preds.length;
      return { count: preds.length, brier: b, bss: bl > 0 ? 1 - (b / bl) : null };
    }
    difficultyTiers = { easy: tierStats(tierBuckets.easy), medium: tierStats(tierBuckets.medium), hard: tierStats(tierBuckets.hard) };
  }

  // Rolling Brier (30/60/90 days)
  const now = new Date();
  function rollingBrierForWindow(days: number): number | null {
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
    const inWindow = scoreableForBss.filter((p) => p.resolvedAt && p.resolvedAt >= cutoff);
    if (inWindow.length < 2) return null;
    return inWindow.reduce((s, p) => {
      const actual = p.outcome === "confirmed" ? 1 : p.outcome === "partial" ? 0.5 : 0;
      return s + Math.pow(p.confidence - actual, 2);
    }, 0) / inWindow.length;
  }
  const rollingBrier = scoreableForBss.length >= 3 ? {
    days30: rollingBrierForWindow(30),
    days60: rollingBrierForWindow(60),
    days90: rollingBrierForWindow(90),
  } : null;

  return apiSuccess(
    {
      totalResolved: filtered.length,
      brierScore,
      brierSkillScore,
      brierBaseline,
      accuracyRate,
      directionAccuracy,
      levelAccuracy,
      byOutcome,
      byCategory,
      byRegime,
      calibration,
      difficultyTiers,
      rollingBrier,
      preEventCount: filtered.filter((p) => p.preEvent === 1).length,
      postEventCount: filtered.filter((p) => p.preEvent === 0 || p.preEvent === null).length,
    },
    { tier: ctx.tier },
  );
}, { minTier: "analyst", scope: "predictions" });
