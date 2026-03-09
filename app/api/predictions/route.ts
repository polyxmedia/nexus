import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, asc } from "drizzle-orm";
import { requireTier } from "@/lib/auth/require-tier";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";

export async function GET(request: NextRequest) {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const results = await db.select().from(schema.predictions).orderBy(asc(schema.predictions.deadline));
    let filtered = results;
    if (status) {
      if (status === "pending") filtered = filtered.filter((p) => !p.outcome);
      else if (status === "resolved") filtered = filtered.filter((p) => !!p.outcome);
    }
    return NextResponse.json(filtered);
  } catch (error) { const message = error instanceof Error ? error.message : "Unknown error"; return NextResponse.json({ error: message }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { claim, timeframe, deadline, confidence, category, signalId, analysisId, metrics, direction, priceTarget, referenceSymbol } = body;
    if (!claim || !timeframe || !deadline || confidence === undefined || !category) return NextResponse.json({ error: "claim, timeframe, deadline, confidence, and category are required" }, { status: 400 });
    const session = await getServerSession(authOptions);
    const createdBy = session?.user?.name || null;
    const rows = await db.insert(schema.predictions).values({
      claim, timeframe, deadline, confidence, category,
      signalId: signalId || null, analysisId: analysisId || null,
      metrics: metrics ? JSON.stringify(metrics) : null,
      direction: direction || null,
      priceTarget: priceTarget || null,
      referenceSymbol: referenceSymbol || null,
      createdBy,
    }).returning();
    return NextResponse.json(rows[0]);
  } catch (error) { const message = error instanceof Error ? error.message : "Unknown error"; return NextResponse.json({ error: message }, { status: 500 }); }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, uuid: predictionUuid, outcome, outcomeNotes, score } = body;
    const lookupUuid = predictionUuid || null;
    const lookupId = id || null;
    if (!lookupUuid && !lookupId) return NextResponse.json({ error: "uuid (or id) and outcome are required" }, { status: 400 });
    if (!outcome) return NextResponse.json({ error: "outcome is required" }, { status: 400 });
    const existingRows = lookupUuid
      ? await db.select().from(schema.predictions).where(eq(schema.predictions.uuid, lookupUuid))
      : await db.select().from(schema.predictions).where(eq(schema.predictions.id, lookupId));
    if (!existingRows[0]) return NextResponse.json({ error: "Prediction not found" }, { status: 404 });
    const updatedRows = await db.update(schema.predictions).set({ outcome, outcomeNotes: outcomeNotes || null, score: score !== undefined ? score : null, resolvedAt: new Date().toISOString() }).where(eq(schema.predictions.id, existingRows[0].id)).returning();
    return NextResponse.json(updatedRows[0]);
  } catch (error) { const message = error instanceof Error ? error.message : "Unknown error"; return NextResponse.json({ error: message }, { status: 500 }); }
}
