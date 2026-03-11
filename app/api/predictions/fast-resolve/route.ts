import { NextRequest, NextResponse } from "next/server";
import { resolveByData } from "@/lib/predictions/engine";
import { requireCronOrAdmin } from "@/lib/auth/require-cron";
import { tweetResolutions } from "@/lib/twitter/predictions";
import { db, schema } from "@/lib/db";
import { gte } from "drizzle-orm";

// Fast data-driven resolution - no AI, just market data comparison
// Safe to run frequently (every 30 min)
export async function POST(req: NextRequest) {
  const denied = await requireCronOrAdmin(req);
  if (denied) return denied;

  try {
    const results = await resolveByData();

    // Tweet resolutions
    if (results.length > 0) {
      try {
        const resolvedIds = results.map((r) => r.id);
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
        console.error("[fast-resolve] Twitter notification failed:", err);
      }
    }

    return NextResponse.json({
      resolved: results.length,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
