import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { desc, isNotNull } from "drizzle-orm";

export async function GET() {
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
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
