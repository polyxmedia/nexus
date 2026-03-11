import { NextRequest, NextResponse } from "next/server";
import { generatePredictions, resolvePredictions, resolveByData, autoExpirePastDeadline, invalidateOnRegimeChange } from "@/lib/predictions/engine";
import { runWartimeCheck } from "@/lib/game-theory/wartime";
import { notifyNewPredictions } from "@/lib/predictions/notify";
import { tweetResolutions } from "@/lib/twitter/predictions";
import { db, schema } from "@/lib/db";
import { desc, gte } from "drizzle-orm";
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
        // Fetch full prediction data for resolved items
        const resolvedIds = allResolved.map((r) => r.id);
        const resolvedPredictions = await db.select().from(schema.predictions).where(
          gte(schema.predictions.id, Math.min(...resolvedIds))
        );
        const resolvedFull = resolvedPredictions
          .filter((p) => resolvedIds.includes(p.id) && p.outcome)
          .map((p) => ({
            id: p.id,
            claim: p.claim,
            category: p.category,
            confidence: p.confidence,
            outcome: p.outcome!,
            score: p.score,
            direction: p.direction,
            directionCorrect: p.directionCorrect,
            priceTarget: p.priceTarget,
            referenceSymbol: p.referenceSymbol,
            outcomeNotes: p.outcomeNotes,
          }));
        await tweetResolutions(resolvedFull);
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
    const allPredictions = await db.select().from(schema.predictions).orderBy(desc(schema.predictions.id));

    const todaysPredictions = allPredictions.filter(
      (p) => p.createdAt >= todayStart && !p.outcome
    );

    const resolvedToday = allPredictions.filter(
      (p) => p.resolvedAt && p.resolvedAt >= todayStart
    );

    const allResolved = allPredictions.filter((p) => p.outcome);
    const confirmed = allResolved.filter((p) => p.outcome === "confirmed").length;
    const denied = allResolved.filter((p) => p.outcome === "denied").length;
    const partial = allResolved.filter((p) => p.outcome === "partial").length;
    const expired = allResolved.filter((p) => p.outcome === "expired").length;
    const totalResolved = allResolved.length;
    const avgScore = totalResolved > 0
      ? allResolved.reduce((sum, p) => sum + (p.score || 0), 0) / totalResolved
      : 0;

    let streak = 0;
    const sortedResolved = allResolved
      .sort((a, b) => (b.resolvedAt || "").localeCompare(a.resolvedAt || ""));
    for (const p of sortedResolved) {
      if (p.outcome === "confirmed") streak++;
      else break;
    }

    const calibration: Array<{ bucket: string; predicted: number; actual: number; count: number }> = [];
    const buckets = [
      { label: "30-50%", min: 0.3, max: 0.5 },
      { label: "50-70%", min: 0.5, max: 0.7 },
      { label: "70-95%", min: 0.7, max: 0.95 },
    ];
    for (const bucket of buckets) {
      const inBucket = allResolved.filter(
        (p) => p.confidence >= bucket.min && p.confidence < bucket.max
      );
      if (inBucket.length > 0) {
        const confirmedInBucket = inBucket.filter((p) => p.outcome === "confirmed").length;
        calibration.push({
          bucket: bucket.label,
          predicted: (bucket.min + bucket.max) / 2,
          actual: confirmedInBucket / inBucket.length,
          count: inBucket.length,
        });
      }
    }

    const byCategory: Record<string, { total: number; confirmed: number; avgScore: number }> = {};
    for (const p of allResolved) {
      if (!byCategory[p.category]) byCategory[p.category] = { total: 0, confirmed: 0, avgScore: 0 };
      byCategory[p.category].total++;
      if (p.outcome === "confirmed") byCategory[p.category].confirmed++;
      byCategory[p.category].avgScore += p.score || 0;
    }
    for (const cat of Object.keys(byCategory)) {
      byCategory[cat].avgScore = byCategory[cat].avgScore / byCategory[cat].total;
    }

    return NextResponse.json({
      today: todaysPredictions,
      resolvedToday,
      stats: {
        totalPredictions: allPredictions.length,
        totalResolved,
        confirmed,
        denied,
        partial,
        expired,
        accuracy: totalResolved > 0 ? confirmed / totalResolved : 0,
        avgScore,
        streak,
        pendingCount: allPredictions.filter((p) => !p.outcome).length,
        calibration,
        byCategory,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
