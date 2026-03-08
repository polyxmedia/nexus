import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rows = await db
      .select()
      .from(schema.predictions)
      .where(eq(schema.predictions.uuid, id));

    if (!rows[0]) {
      return NextResponse.json({ error: "Prediction not found" }, { status: 404 });
    }

    const prediction = rows[0];

    // Fetch linked signal if exists
    let signal = null;
    if (prediction.signalId) {
      const signalRows = await db
        .select()
        .from(schema.signals)
        .where(eq(schema.signals.id, prediction.signalId));
      signal = signalRows[0] || null;
    }

    // Fetch linked analysis if exists
    let analysis = null;
    if (prediction.analysisId) {
      const analysisRows = await db
        .select()
        .from(schema.analyses)
        .where(eq(schema.analyses.id, prediction.analysisId));
      analysis = analysisRows[0] || null;
    }

    // Fetch related predictions (same category, similar timeframe)
    const relatedRows = await db
      .select()
      .from(schema.predictions)
      .where(eq(schema.predictions.category, prediction.category));
    const related = relatedRows
      .filter((r: { id: number }) => r.id !== prediction.id)
      .slice(0, 5);

    return NextResponse.json({ prediction, signal, analysis, related });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
