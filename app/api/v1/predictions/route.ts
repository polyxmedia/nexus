import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/with-api-auth";
import { apiSuccess } from "@/lib/api/response";
import { db, schema } from "@/lib/db";
import { desc, eq } from "drizzle-orm";

export const GET = withApiAuth(async (request: NextRequest, ctx) => {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const outcome = searchParams.get("outcome"); // confirmed | denied | partial | expired

  let predictions;
  if (outcome) {
    predictions = await db
      .select()
      .from(schema.predictions)
      .where(eq(schema.predictions.outcome, outcome))
      .orderBy(desc(schema.predictions.createdAt))
      .limit(limit)
      .offset(offset);
  } else {
    predictions = await db
      .select()
      .from(schema.predictions)
      .orderBy(desc(schema.predictions.createdAt))
      .limit(limit)
      .offset(offset);
  }

  return apiSuccess(
    {
      predictions: predictions.map((p) => ({
        id: p.uuid,
        claim: p.claim,
        timeframe: p.timeframe,
        deadline: p.deadline,
        confidence: p.confidence,
        category: p.category,
        direction: p.direction,
        priceTarget: p.priceTarget,
        referenceSymbol: p.referenceSymbol,
        outcome: p.outcome,
        outcomeNotes: p.outcomeNotes,
        score: p.score,
        directionCorrect: p.directionCorrect,
        levelCorrect: p.levelCorrect,
        regimeAtCreation: p.regimeAtCreation,
        preEvent: p.preEvent === 1,
        resolvedAt: p.resolvedAt,
        createdAt: p.createdAt,
      })),
      pagination: { limit, offset, count: predictions.length },
    },
    { tier: ctx.tier },
  );
}, { minTier: "analyst", scope: "predictions" });
