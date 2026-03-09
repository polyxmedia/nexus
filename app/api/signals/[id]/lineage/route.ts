import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: uuid } = await params;

    // Look up signal by UUID
    const [signal] = await db
      .select({
        id: schema.signals.id,
        uuid: schema.signals.uuid,
        title: schema.signals.title,
        date: schema.signals.date,
        intensity: schema.signals.intensity,
        category: schema.signals.category,
        status: schema.signals.status,
      })
      .from(schema.signals)
      .where(eq(schema.signals.uuid, uuid))
      .limit(1);

    if (!signal) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }

    // Fetch predictions linked to this signal
    const predictions = await db
      .select({
        id: schema.predictions.id,
        uuid: schema.predictions.uuid,
        claim: schema.predictions.claim,
        confidence: schema.predictions.confidence,
        deadline: schema.predictions.deadline,
        direction: schema.predictions.direction,
        referenceSymbol: schema.predictions.referenceSymbol,
        priceTarget: schema.predictions.priceTarget,
        outcome: schema.predictions.outcome,
        score: schema.predictions.score,
        directionCorrect: schema.predictions.directionCorrect,
        levelCorrect: schema.predictions.levelCorrect,
        resolvedAt: schema.predictions.resolvedAt,
        createdAt: schema.predictions.createdAt,
      })
      .from(schema.predictions)
      .where(eq(schema.predictions.signalId, signal.id));

    // Fetch trades linked to this signal
    const trades = await db
      .select({
        id: schema.trades.id,
        ticker: schema.trades.ticker,
        direction: schema.trades.direction,
        orderType: schema.trades.orderType,
        quantity: schema.trades.quantity,
        filledPrice: schema.trades.filledPrice,
        limitPrice: schema.trades.limitPrice,
        status: schema.trades.status,
        environment: schema.trades.environment,
        predictionId: schema.trades.predictionId,
        t212OrderId: schema.trades.t212OrderId,
        createdAt: schema.trades.createdAt,
      })
      .from(schema.trades)
      .where(eq(schema.trades.signalId, signal.id));

    // Compute summary
    const resolved = predictions.filter((p) => p.outcome);
    const scored = resolved.filter((p) => p.score != null);
    const dirChecked = resolved.filter((p) => p.directionCorrect != null);
    const filled = trades.filter((t) => t.status === "filled");

    const summary = {
      totalPredictions: predictions.length,
      resolvedPredictions: resolved.length,
      avgBrierScore:
        scored.length > 0
          ? scored.reduce((s, p) => s + (p.score ?? 0), 0) / scored.length
          : null,
      directionAccuracy:
        dirChecked.length > 0
          ? dirChecked.filter((p) => p.directionCorrect === 1).length /
            dirChecked.length
          : null,
      totalTrades: trades.length,
      filledTrades: filled.length,
    };

    return NextResponse.json({
      signal,
      predictions,
      trades,
      summary,
    });
  } catch {
    return NextResponse.json({ predictions: [], trades: [], summary: null });
  }
}
