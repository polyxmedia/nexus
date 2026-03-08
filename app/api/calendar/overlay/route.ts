import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireTier } from "@/lib/auth/require-tier";

export async function GET() {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const allSignals = await db.select().from(schema.signals);
    const allPredictions = await db.select().from(schema.predictions);

    const signals: Record<string, { id: number; title: string; intensity: number; category: string; status: string }[]> = {};
    for (const s of allSignals) {
      const date = s.date.split("T");
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
      const date = p.deadline.split("T");
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

    return NextResponse.json({ signals, predictions });
  } catch (error) {
    console.error("Calendar overlay error:", error);
    return NextResponse.json({ signals: {}, predictions: {} });
  }
}
