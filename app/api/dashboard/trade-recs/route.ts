import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { desc, isNotNull } from "drizzle-orm";
import { creditGate } from "@/lib/credits/gate";

export interface TradeRec {
  ticker: string;
  direction: "BUY" | "SELL" | "SHORT" | "HOLD";
  rationale: string;
  signalTitle: string;
  signalId: number;
  analysedAt: string;
}

export async function GET() {
  try {
    const gate = await creditGate();
    if (gate.response) return gate.response;

    // Pull latest analyses that have trade recommendations
    const rows = await db
      .select({
        tradeRecommendations: schema.analyses.tradeRecommendations,
        signalId: schema.analyses.signalId,
        createdAt: schema.analyses.createdAt,
      })
      .from(schema.analyses)
      .where(isNotNull(schema.analyses.tradeRecommendations))
      .orderBy(desc(schema.analyses.createdAt))
      .limit(10);

    // Get signal titles for context
    const signalIds = [...new Set(rows.map((r) => r.signalId))];
    const signals = signalIds.length > 0
      ? await db
          .select({ id: schema.signals.id, title: schema.signals.title })
          .from(schema.signals)
          .limit(50)
      : [];
    const signalMap = new Map(signals.map((s) => [s.id, s.title]));

    // Flatten and deduplicate by ticker (keep most recent)
    const seen = new Set<string>();
    const recs: TradeRec[] = [];

    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.tradeRecommendations);
        if (!Array.isArray(parsed)) continue;

        for (const rec of parsed) {
          if (!rec.ticker || seen.has(rec.ticker)) continue;
          seen.add(rec.ticker);
          recs.push({
            ticker: rec.ticker,
            direction: rec.direction || "BUY",
            rationale: rec.rationale || "",
            signalTitle: String(signalMap.get(row.signalId) ?? "Signal Analysis"),
            signalId: row.signalId,
            analysedAt: row.createdAt,
          });
        }
      } catch {
        continue;
      }
    }

    return NextResponse.json({ recs: recs.slice(0, 8) });
  } catch (error) {
    console.error("Trade recs error:", error);
    return NextResponse.json({ recs: [] });
  }
}
