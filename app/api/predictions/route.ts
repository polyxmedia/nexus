import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, asc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const results = db
      .select()
      .from(schema.predictions)
      .orderBy(asc(schema.predictions.deadline))
      .all();

    let filtered = results;

    if (status) {
      if (status === "pending") {
        filtered = filtered.filter((p) => !p.outcome);
      } else if (status === "resolved") {
        filtered = filtered.filter((p) => !!p.outcome);
      }
    }

    return NextResponse.json(filtered);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { claim, timeframe, deadline, confidence, category, signalId, analysisId, metrics } = body;

    if (!claim || !timeframe || !deadline || confidence === undefined || !category) {
      return NextResponse.json(
        { error: "claim, timeframe, deadline, confidence, and category are required" },
        { status: 400 }
      );
    }

    const prediction = db
      .insert(schema.predictions)
      .values({
        claim,
        timeframe,
        deadline,
        confidence,
        category,
        signalId: signalId || null,
        analysisId: analysisId || null,
        metrics: metrics ? JSON.stringify(metrics) : null,
      })
      .returning()
      .get();

    return NextResponse.json(prediction);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, outcome, outcomeNotes, score } = body;

    if (!id || !outcome) {
      return NextResponse.json(
        { error: "id and outcome are required" },
        { status: 400 }
      );
    }

    const existing = db
      .select()
      .from(schema.predictions)
      .where(eq(schema.predictions.id, id))
      .get();

    if (!existing) {
      return NextResponse.json({ error: "Prediction not found" }, { status: 404 });
    }

    const updated = db
      .update(schema.predictions)
      .set({
        outcome,
        outcomeNotes: outcomeNotes || null,
        score: score !== undefined ? score : null,
        resolvedAt: new Date().toISOString(),
      })
      .where(eq(schema.predictions.id, id))
      .returning()
      .get();

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
