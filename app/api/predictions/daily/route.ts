import { NextResponse } from "next/server";
import { generatePredictions, resolvePredictions } from "@/lib/predictions/engine";
import { db, schema } from "@/lib/db";
import { desc, and, gte, lt } from "drizzle-orm";

export async function POST() {
  try {
    // Step 1: Resolve any overdue predictions first
    const resolved = await resolvePredictions();

    // Step 2: Check if we already generated predictions today
    const today = new Date().toISOString().split("T");
    const todayStart = `${today}T00:00:00`;
    const todayEnd = `${today}T23:59:59`;

    const todaysPredictionsAll = await db.select().from(schema.predictions).where(
      and(
        gte(schema.predictions.createdAt, todayStart),
        lt(schema.predictions.createdAt, todayEnd + "Z")
      )
    );
    const todaysPredictions = todaysPredictionsAll.filter((p) => !p.outcome);

    let generated: Awaited<ReturnType<typeof generatePredictions>> = [];
    if (todaysPredictions.length === 0) {
      generated = await generatePredictions();
    }

    return NextResponse.json({
      resolved: { count: resolved.length, results: resolved },
      generated: { count: generated.length, predictions: generated },
      alreadyGenerated: todaysPredictions.length > 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const today = new Date().toISOString().split("T");
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
