import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, asc, desc, isNull, not } from "drizzle-orm";
import { requireTier } from "@/lib/auth/require-tier";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { validateOrigin } from "@/lib/security/csrf";

export async function GET(request: NextRequest) {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    // Push status filtering to DB and cap results
    let results;
    if (status === "pending") {
      results = await db.select().from(schema.predictions)
        .where(isNull(schema.predictions.outcome))
        .orderBy(asc(schema.predictions.deadline))
        .limit(200);
    } else if (status === "resolved") {
      results = await db.select().from(schema.predictions)
        .where(not(isNull(schema.predictions.outcome)))
        .orderBy(desc(schema.predictions.deadline))
        .limit(200);
    } else {
      results = await db.select().from(schema.predictions)
        .orderBy(desc(schema.predictions.deadline))
        .limit(300);
    }

    return NextResponse.json(results, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" },
    });
  } catch (error) { const message = error instanceof Error ? error.message : "Unknown error"; return NextResponse.json({ error: message }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

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
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

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

    // Broadcast resolution via Telegram
    try {
      const { broadcastAlert, formatPredictionAlert } = await import("@/lib/telegram/alerts");
      const pred = updatedRows[0];
      const outcomeMap: Record<string, "correct" | "incorrect" | "partial"> = { confirmed: "correct", denied: "incorrect", partial: "partial" };
      const mapped = outcomeMap[outcome] || "incorrect";
      const msg = formatPredictionAlert({ title: pred.claim, outcome: mapped, confidence: pred.confidence, brierScore: pred.score ?? undefined });
      broadcastAlert("prediction_resolved", msg).catch(() => {});
    } catch { /* non-critical */ }

    return NextResponse.json(updatedRows[0]);
  } catch (error) { const message = error instanceof Error ? error.message : "Unknown error"; return NextResponse.json({ error: message }, { status: 500 }); }
}
