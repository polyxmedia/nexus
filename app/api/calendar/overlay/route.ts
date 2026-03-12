import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { desc } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    // Limit to last 200 signals and 300 predictions for calendar overlay
    const [allSignals, allPredictions] = await Promise.all([
      db.select({
        id: schema.signals.id,
        title: schema.signals.title,
        date: schema.signals.date,
        intensity: schema.signals.intensity,
        category: schema.signals.category,
        status: schema.signals.status,
      }).from(schema.signals).orderBy(desc(schema.signals.date)).limit(200),
      db.select({
        id: schema.predictions.id,
        claim: schema.predictions.claim,
        confidence: schema.predictions.confidence,
        deadline: schema.predictions.deadline,
        outcome: schema.predictions.outcome,
        category: schema.predictions.category,
      }).from(schema.predictions).orderBy(desc(schema.predictions.deadline)).limit(300),
    ]);

    const signals: Record<string, { id: number; title: string; intensity: number; category: string; status: string }[]> = {};
    for (const s of allSignals) {
      const date = s.date.split("T")[0];
      if (!signals[date]) signals[date] = [];
      signals[date].push({
        id: s.id,
        title: s.title,
        intensity: s.intensity,
        category: s.category,
        status: s.status,
      });
    }

    const predictions: Record<string, { id: number; claim: string; confidence: number; deadline: string; outcome: string | null; category: string }[]> = {};
    for (const p of allPredictions) {
      const date = p.deadline.split("T")[0];
      if (!predictions[date]) predictions[date] = [];
      predictions[date].push({
        id: p.id,
        claim: p.claim,
        confidence: p.confidence,
        deadline: p.deadline,
        outcome: p.outcome,
        category: p.category,
      });
    }

    return NextResponse.json({ signals, predictions }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("Calendar overlay error:", error);
    return NextResponse.json({ signals: {}, predictions: {} });
  }
}
