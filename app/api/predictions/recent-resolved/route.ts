import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { desc, isNotNull } from "drizzle-orm";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`public:predictions:${ip}`, 30, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  try {
    const resolved = await db
      .select({
        id: schema.predictions.id,
        uuid: schema.predictions.uuid,
        claim: schema.predictions.claim,
        category: schema.predictions.category,
        confidence: schema.predictions.confidence,
        outcome: schema.predictions.outcome,
        outcomeNotes: schema.predictions.outcomeNotes,
        score: schema.predictions.score,
        resolvedAt: schema.predictions.resolvedAt,
        createdAt: schema.predictions.createdAt,
        deadline: schema.predictions.deadline,
        direction: schema.predictions.direction,
        directionCorrect: schema.predictions.directionCorrect,
        referenceSymbol: schema.predictions.referenceSymbol,
      })
      .from(schema.predictions)
      .where(isNotNull(schema.predictions.outcome))
      .orderBy(desc(schema.predictions.resolvedAt))
      .limit(40);

    return NextResponse.json({ predictions: resolved }, { headers: { "Cache-Control": "private, s-maxage=60, stale-while-revalidate=120" } });
  } catch (error) {
    console.error("Recent resolved predictions error:", error);
    return NextResponse.json({ error: "Failed to fetch predictions" }, { status: 500 });
  }
}
