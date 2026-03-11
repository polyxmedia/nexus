import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { resolvePredictions } from "@/lib/predictions/engine";

/**
 * POST /api/predictions/[id]/resolve
 * Trigger AI resolution for a single overdue prediction.
 * Requires authenticated session (any logged-in user).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const predictionId = parseInt(id, 10);
  if (isNaN(predictionId)) {
    return NextResponse.json({ error: "Invalid prediction ID" }, { status: 400 });
  }

  // Check prediction exists and is unresolved
  const [prediction] = await db
    .select()
    .from(schema.predictions)
    .where(eq(schema.predictions.id, predictionId));

  if (!prediction) {
    return NextResponse.json({ error: "Prediction not found" }, { status: 404 });
  }

  if (prediction.outcome) {
    return NextResponse.json({
      message: "Already resolved",
      outcome: prediction.outcome,
      score: prediction.score,
    });
  }

  const today = new Date().toISOString().split("T")[0];
  if (prediction.deadline > today) {
    return NextResponse.json({ error: "Prediction deadline has not passed yet" }, { status: 400 });
  }

  try {
    // Run the full AI resolver - it processes all due predictions
    // This is the same function used by the scheduled resolver
    const results = await resolvePredictions();

    // Find our specific prediction in the results
    const result = results.find((r) => r.id === predictionId);

    if (result) {
      return NextResponse.json({
        resolved: true,
        outcome: result.outcome,
        score: result.score,
        notes: result.notes,
      });
    }

    // If the resolver didn't pick it up, check if it was resolved by autoExpirePastDeadline
    const [updated] = await db
      .select()
      .from(schema.predictions)
      .where(eq(schema.predictions.id, predictionId));

    if (updated?.outcome) {
      return NextResponse.json({
        resolved: true,
        outcome: updated.outcome,
        score: updated.score,
        notes: updated.outcomeNotes,
      });
    }

    return NextResponse.json({ error: "Resolution did not produce a result for this prediction" }, { status: 500 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Failed to resolve prediction ${predictionId}:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
