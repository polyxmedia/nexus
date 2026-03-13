import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { desc, eq, isNull, sql } from "drizzle-orm";
import { requireTier } from "@/lib/auth/require-tier";

function safeParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try { return JSON.parse(json); } catch { return fallback; }
}

export async function GET() {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    // Parallel data fetches via allSettled so one failure doesn't kill the rest
    const results = await Promise.allSettled([
      db.select().from(schema.signals).orderBy(desc(schema.signals.id)).limit(10),
      db.select().from(schema.theses).where(eq(schema.theses.status, "active")).orderBy(desc(schema.theses.id)).limit(5),
      db.select().from(schema.predictions).where(isNull(schema.predictions.outcome)).orderBy(desc(schema.predictions.id)).limit(10),
      db.select().from(schema.alertHistory).orderBy(desc(schema.alertHistory.id)).limit(20),
      db.select().from(schema.portfolioSnapshots).orderBy(desc(schema.portfolioSnapshots.id)).limit(1),
      db.select().from(schema.trades).orderBy(desc(schema.trades.id)).limit(10),
    ]);

    const val = <T>(r: PromiseSettledResult<T>, fallback: T): T =>
      r.status === "fulfilled" ? r.value : fallback;

    const recentSignals = val(results[0], []);
    const activeTheses = val(results[1], []);
    const openPredictions = val(results[2], []);
    const recentAlerts = val(results[3], []);
    const latestSnapshot = val(results[4], []);
    const recentTrades = val(results[5], []);

    // Compute regime from latest thesis
    const latestThesis = activeTheses[0] || null;
    const regime = latestThesis
      ? {
          market: latestThesis.marketRegime,
          volatility: latestThesis.volatilityOutlook,
          confidence: latestThesis.overallConfidence,
          convergence: latestThesis.convergenceDensity,
        }
      : null;

    // Portfolio summary
    const portfolio = latestSnapshot[0]
      ? {
          totalValue: latestSnapshot[0].totalValue,
          cash: latestSnapshot[0].cash,
          invested: latestSnapshot[0].invested,
          pnl: latestSnapshot[0].pnl,
          pnlPercent: latestSnapshot[0].pnlPercent,
          positions: safeParse(latestSnapshot[0].positions, []),
          environment: latestSnapshot[0].environment,
        }
      : null;

    // Signal intensity distribution
    const intensityCounts = [0, 0, 0, 0, 0];
    for (const s of recentSignals) {
      if (s.intensity >= 1 && s.intensity <= 5) {
        intensityCounts[s.intensity - 1]++;
      }
    }

    // Highest active threat
    const maxIntensity = recentSignals.reduce((max, s) => Math.max(max, s.intensity), 0);

    // Undismissed alert count
    const activeAlertCount = recentAlerts.filter((a) => a.dismissed === 0).length;

    // Prediction stats (use DB aggregation instead of fetching all rows)
    let totalResolved = 0;
    let avgScore: number | null = null;
    try {
      const resolvedRows = await db.select({
        count: sql<number>`count(*)::int`,
        avgScore: sql<number>`avg(score)`,
      }).from(schema.predictions).where(sql`outcome IS NOT NULL`);
      totalResolved = resolvedRows[0]?.count ?? 0;
      avgScore = resolvedRows[0]?.avgScore ?? null;
    } catch { /* table may not exist on prod */ }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      regime,
      threatLevel: maxIntensity,
      portfolio,
      signals: recentSignals.map((s) => ({
        id: s.id,
        title: s.title,
        intensity: s.intensity,
        category: s.category,
        status: s.status,
        date: s.date,
        layers: safeParse(s.layers, []),
      })),
      intensityCounts,
      theses: activeTheses.map((t) => ({
        id: t.id,
        title: t.title,
        regime: t.marketRegime,
        confidence: t.overallConfidence,
        validUntil: t.validUntil,
        summary: (t.executiveSummary || "").slice(0, 200),
      })),
      predictions: {
        open: openPredictions.map((p) => ({
          id: p.id,
          claim: p.claim,
          confidence: p.confidence,
          deadline: p.deadline,
          category: p.category,
        })),
        totalResolved,
        avgScore,
      },
      alerts: {
        active: activeAlertCount,
        recent: recentAlerts.slice(0, 10).map((a) => ({
          id: a.id,
          title: a.title,
          message: a.message,
          severity: a.severity,
          triggeredAt: a.triggeredAt,
          dismissed: a.dismissed === 1,
        })),
      },
      trades: recentTrades.map((t) => ({
        id: t.id,
        ticker: t.ticker,
        direction: t.direction,
        quantity: t.quantity,
        status: t.status,
        filledPrice: t.filledPrice,
        environment: t.environment,
        createdAt: t.createdAt,
      })),
    }, { headers: { "Cache-Control": "private, s-maxage=60, stale-while-revalidate=30" } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
