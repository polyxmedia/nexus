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
        claim: schema.predictions.claim,
        category: schema.predictions.category,
        confidence: schema.predictions.confidence,
        outcome: schema.predictions.outcome,
        score: schema.predictions.score,
        resolvedAt: schema.predictions.resolvedAt,
        createdAt: schema.predictions.createdAt,
        direction: schema.predictions.direction,
        directionCorrect: schema.predictions.directionCorrect,
      })
      .from(schema.predictions)
      .where(isNotNull(schema.predictions.outcome))
      .orderBy(desc(schema.predictions.resolvedAt))
      .limit(20);

    return NextResponse.json({ predictions: resolved });
  } catch (error) {
    console.error("Recent resolved predictions error:", error);
    return NextResponse.json({ error: "Failed to fetch predictions" }, { status: 500 });
  }
}
