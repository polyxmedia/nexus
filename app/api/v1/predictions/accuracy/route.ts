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

  const filtered = await db
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

  return apiSuccess(
    {
      totalResolved: filtered.length,
      brierScore,
      accuracyRate,
      directionAccuracy,
      levelAccuracy,
      byOutcome,
      byCategory,
      byRegime,
      calibration,
      preEventCount: filtered.filter((p) => p.preEvent === 1).length,
      postEventCount: filtered.filter((p) => p.preEvent === 0 || p.preEvent === null).length,
    },
    { tier: ctx.tier },
  );
}, { minTier: "analyst", scope: "predictions" });
