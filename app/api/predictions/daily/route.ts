import { NextRequest, NextResponse } from "next/server";
import { generatePredictions, resolvePredictions, resolveByData, autoExpirePastDeadline, invalidateOnRegimeChange } from "@/lib/predictions/engine";
import { runWartimeCheck } from "@/lib/game-theory/wartime";
import { notifyNewPredictions } from "@/lib/predictions/notify";
import { fetchAndTweetResolutions } from "@/lib/twitter/predictions";
import { db, schema } from "@/lib/db";
import { desc, gte, sql, isNull } from "drizzle-orm";
import { requireCronOrAdmin } from "@/lib/auth/require-cron";

export async function POST(req: NextRequest) {
  const denied = await requireCronOrAdmin(req);
  if (denied) return denied;

  try {
    // Step 0: Housekeeping — expire stale, invalidate on regime change, check wartime thresholds
    const autoExpired = await autoExpirePastDeadline();
    const regimeInvalidated = await invalidateOnRegimeChange();
    const wartimeCheck = await runWartimeCheck();

    // Step 1a: Fast data-driven resolution (market predictions with price targets)
    const dataResolved = await resolveByData();

    // Step 1b: AI resolution for remaining complex predictions
    const resolved = await resolvePredictions();

    // Step 1c: Tweet resolution results
    const allResolved = [...dataResolved, ...resolved];
    if (allResolved.length > 0) {
      try {
        await fetchAndTweetResolutions(allResolved.map((r) => r.id));
      } catch (err) {
        console.error("[predictions] Twitter resolution notification failed:", err);
      }
    }

    // Step 2: Check if we generated predictions in the last 3 hours
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60_000).toISOString();

    const recentPredictions = await db.select().from(schema.predictions).where(
      gte(schema.predictions.createdAt, threeHoursAgo)
    );
    const recentUnresolved = recentPredictions.filter((p) => !p.outcome);

    let generated: Awaited<ReturnType<typeof generatePredictions>> = [];
    let notified = 0;
    if (recentUnresolved.length === 0) {
      generated = await generatePredictions();
      if (generated.length > 0) {
        notified = await notifyNewPredictions(generated);
      }
    }

    return NextResponse.json({
      housekeeping: { autoExpired, regimeInvalidated, wartimeCheck },
      dataResolved: { count: dataResolved.length, results: dataResolved },
      resolved: { count: resolved.length, results: resolved },
      generated: { count: generated.length, predictions: generated, notified },
      alreadyGenerated: recentUnresolved.length > 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const todayStart = `${today}T00:00:00`;

    // Use DB aggregation instead of fetching all predictions into memory.
    // This was doing SELECT * on the entire predictions table with no limit.
    const [todaysPredictions, resolvedToday, statsResult, calibrationResult, categoryResult] = await Promise.all([
      // Today's pending predictions (small result set)
      db.select({
        id: schema.predictions.id,
        claim: schema.predictions.claim,
        confidence: schema.predictions.confidence,
        category: schema.predictions.category,
        deadline: schema.predictions.deadline,
        timeframe: schema.predictions.timeframe,
        createdAt: schema.predictions.createdAt,
      }).from(schema.predictions)
        .where(gte(schema.predictions.createdAt, todayStart))
        .orderBy(desc(schema.predictions.id))
        .limit(50),

      // Resolved today (small result set)
      db.select({
        id: schema.predictions.id,
        claim: schema.predictions.claim,
        outcome: schema.predictions.outcome,
        score: schema.predictions.score,
        resolvedAt: schema.predictions.resolvedAt,
      }).from(schema.predictions)
        .where(gte(schema.predictions.resolvedAt, todayStart))
        .orderBy(desc(schema.predictions.id))
        .limit(50),

      // Aggregate stats computed in DB
      db.execute(sql`
        SELECT
          COUNT(*)::int as total_predictions,
          COUNT(*) FILTER (WHERE outcome IS NOT NULL)::int as total_resolved,
          COUNT(*) FILTER (WHERE outcome = 'confirmed')::int as confirmed,
          COUNT(*) FILTER (WHERE outcome = 'denied')::int as denied,
          COUNT(*) FILTER (WHERE outcome = 'partial')::int as partial_count,
          COUNT(*) FILTER (WHERE outcome = 'expired')::int as expired,
          COUNT(*) FILTER (WHERE outcome IS NULL)::int as pending_count,
          AVG(score) FILTER (WHERE outcome IS NOT NULL) as avg_score
        FROM predictions
      `),

      // Calibration buckets computed in DB
      db.execute(sql`
        SELECT
          CASE
            WHEN confidence >= 0.3 AND confidence < 0.5 THEN '30-50%'
            WHEN confidence >= 0.5 AND confidence < 0.7 THEN '50-70%'
            WHEN confidence >= 0.7 AND confidence < 0.95 THEN '70-95%'
          END as bucket,
          AVG(confidence) as predicted,
          AVG(CASE WHEN outcome = 'confirmed' THEN 1.0 ELSE 0.0 END) as actual,
          COUNT(*)::int as count
        FROM predictions
        WHERE outcome IS NOT NULL AND outcome != 'expired'
          AND confidence >= 0.3 AND confidence < 0.95
        GROUP BY 1
        HAVING COUNT(*) > 0
        ORDER BY MIN(confidence)
      `),

      // Category breakdown computed in DB
      db.execute(sql`
        SELECT
          category,
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE outcome = 'confirmed')::int as confirmed,
          AVG(score) as avg_score
        FROM predictions
        WHERE outcome IS NOT NULL AND outcome != 'expired'
        GROUP BY category
      `),
    ]);

    const stats = (statsResult.rows[0] || {}) as Record<string, number | null>;
    const totalResolved = stats.total_resolved || 0;
    const confirmed = stats.confirmed || 0;

    const calibration = (calibrationResult.rows || []).map((r: Record<string, unknown>) => ({
      bucket: r.bucket as string,
      predicted: r.predicted as number,
      actual: r.actual as number,
      count: r.count as number,
    }));

    const byCategory: Record<string, { total: number; confirmed: number; avgScore: number }> = {};
    for (const r of categoryResult.rows || []) {
      const row = r as Record<string, unknown>;
      byCategory[row.category as string] = {
        total: row.total as number,
        confirmed: row.confirmed as number,
        avgScore: (row.avg_score as number) || 0,
      };
    }

    return NextResponse.json({
      today: todaysPredictions.filter(p => !p.outcome),
      resolvedToday,
      stats: {
        totalPredictions: stats.total_predictions || 0,
        totalResolved,
        confirmed,
        denied: stats.denied || 0,
        partial: stats.partial_count || 0,
        expired: stats.expired || 0,
        accuracy: totalResolved > 0 ? confirmed / totalResolved : 0,
        avgScore: stats.avg_score || 0,
        streak: 0, // Streak requires ordered scan, not worth the full table load
        pendingCount: stats.pending_count || 0,
        calibration,
        byCategory,
      },
    }, {
      headers: { "Cache-Control": "private, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
