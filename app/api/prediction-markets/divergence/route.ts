import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getPredictionMarkets } from "@/lib/prediction-markets";
import {
  detectDivergences,
  computeDivergenceStats,
} from "@/lib/prediction-markets/divergence";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Fetch prediction markets and NEXUS predictions in parallel
    const [snapshot, predictions] = await Promise.all([
      getPredictionMarkets(),
      db
        .select()
        .from(schema.predictions)
        .where(eq(schema.predictions.outcome, "pending"))
        .catch(() => [] as (typeof schema.predictions.$inferSelect)[]),
    ]);

    // Map DB predictions to the format expected by divergence detector
    const nexusPredictions = predictions
      .filter((p) => p.outcome === null || p.outcome === "pending")
      .map((p) => ({
        id: p.id,
        claim: p.claim,
        confidence: p.confidence,
        category: p.category,
        timeframe: p.timeframe,
        deadline: p.deadline,
      }));

    const divergences = detectDivergences(snapshot.markets, nexusPredictions);
    const stats = computeDivergenceStats(divergences);

    return NextResponse.json({
      divergences,
      stats,
      marketsAnalyzed: snapshot.markets.length,
      predictionsAnalyzed: nexusPredictions.length,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Divergence detection error:", error);

    // Try to still return market data even if predictions fail
    try {
      const snapshot = await getPredictionMarkets();
      return NextResponse.json({
        divergences: [],
        stats: {
          count: 0,
          avgDivergence: 0,
          maxDivergence: 0,
          nexusHigherCount: 0,
          nexusLowerCount: 0,
          arbitrageOpportunities: 0,
        },
        marketsAnalyzed: snapshot.markets.length,
        predictionsAnalyzed: 0,
        lastUpdated: new Date().toISOString(),
      });
    } catch {
      return NextResponse.json({
        divergences: [],
        stats: {
          count: 0,
          avgDivergence: 0,
          maxDivergence: 0,
          nexusHigherCount: 0,
          nexusLowerCount: 0,
          arbitrageOpportunities: 0,
        },
        marketsAnalyzed: 0,
        predictionsAnalyzed: 0,
        lastUpdated: new Date().toISOString(),
      });
    }
  }
}
