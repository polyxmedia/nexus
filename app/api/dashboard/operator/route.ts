import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { desc, eq, isNull } from "drizzle-orm";
import { requireTier } from "@/lib/auth/require-tier";

export async function GET() {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    // Parallel data fetches
    const [
      recentSignals,
      activeTheses,
      openPredictions,
      recentAlerts,
      latestSnapshot,
      recentTrades,
    ] = await Promise.all([
      // Last 10 signals, newest first
      db.select().from(schema.signals).orderBy(desc(schema.signals.id)).limit(10),
      // Active theses
      db.select().from(schema.theses).where(eq(schema.theses.status, "active")).orderBy(desc(schema.theses.id)).limit(5),
      // Unresolved predictions
      db.select().from(schema.predictions).where(isNull(schema.predictions.outcome)).orderBy(desc(schema.predictions.id)).limit(10),
      // Recent alert history (last 20)
      db.select().from(schema.alertHistory).orderBy(desc(schema.alertHistory.id)).limit(20),
      // Latest portfolio snapshot
      db.select().from(schema.portfolioSnapshots).orderBy(desc(schema.portfolioSnapshots.id)).limit(1),
      // Recent trades
      db.select().from(schema.trades).orderBy(desc(schema.trades.id)).limit(10),
    ]);

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
          positions: JSON.parse(latestSnapshot[0].positions || "[]"),
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

    // Prediction stats
    const allPredictions = await db.select().from(schema.predictions);
    const resolved = allPredictions.filter((p) => p.outcome);
    const avgScore = resolved.length > 0
      ? resolved.reduce((sum, p) => sum + (p.score || 0), 0) / resolved.length
      : null;

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
        layers: JSON.parse(s.layers || "[]"),
      })),
      intensityCounts,
      theses: activeTheses.map((t) => ({
        id: t.id,
        title: t.title,
        regime: t.marketRegime,
        confidence: t.overallConfidence,
        validUntil: t.validUntil,
        summary: t.executiveSummary.slice(0, 200),
      })),
      predictions: {
        open: openPredictions.map((p) => ({
          id: p.id,
          claim: p.claim,
          confidence: p.confidence,
          deadline: p.deadline,
          category: p.category,
        })),
        totalResolved: resolved.length,
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
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
