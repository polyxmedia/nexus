export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { validateOrigin } from "@/lib/security/csrf";
import { getSettingValue } from "@/lib/settings/get-setting";
import { getModel } from "@/lib/ai/model";
import {
  syncExternalQuestions,
  generateNexusPrediction,
  resolveFromSource,
  getBenchmarkScores,
} from "@/lib/predictions/benchmarks";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

/**
 * GET /api/predictions/benchmarks
 * Returns benchmark scores and recent questions
 */
export async function GET() {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const scores = await getBenchmarkScores();
    return NextResponse.json(scores, { headers: { "Cache-Control": "private, s-maxage=300, stale-while-revalidate=600" } });
  } catch (error) {
    console.error("[benchmarks] GET error:", error);
    return NextResponse.json({ error: "Failed to load benchmarks" }, { status: 500 });
  }
}

/**
 * POST /api/predictions/benchmarks
 * Actions: sync, predict, resolve
 *
 * - sync: Pull latest questions from prediction markets
 * - predict: Generate NEXUS prediction for a specific benchmark
 * - predict-batch: Generate predictions for all unpredicted benchmarks
 * - resolve: Check for resolutions on all unresolved benchmarks
 */
export async function POST(request: NextRequest) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const { action, benchmarkId } = await request.json();

    if (action === "sync") {
      const result = await syncExternalQuestions();
      return NextResponse.json(result);
    }

    if (action === "predict" && benchmarkId) {
      const apiKey = await getSettingValue("anthropic_api_key", process.env.ANTHROPIC_API_KEY);
      if (!apiKey) return NextResponse.json({ error: "API key not configured" }, { status: 400 });

      const model = await getModel();
      const result = await generateNexusPrediction(benchmarkId, apiKey, model);
      if (!result) return NextResponse.json({ error: "Prediction failed or already exists" }, { status: 400 });
      return NextResponse.json(result);
    }

    if (action === "predict-batch") {
      const apiKey = await getSettingValue("anthropic_api_key", process.env.ANTHROPIC_API_KEY);
      if (!apiKey) return NextResponse.json({ error: "API key not configured" }, { status: 400 });

      const model = await getModel();

      // Find all benchmarks without a NEXUS prediction
      const unpredicted = await db
        .select()
        .from(schema.predictionBenchmarks)
        .where(eq(schema.predictionBenchmarks.resolved, 0));

      const needPrediction = unpredicted.filter(b => b.nexusProbability == null);
      let predicted = 0;
      const maxBatch = 10; // Rate limit: max 10 per call

      for (const b of needPrediction.slice(0, maxBatch)) {
        const result = await generateNexusPrediction(b.id, apiKey, model);
        if (result) predicted++;
      }

      return NextResponse.json({
        predicted,
        remaining: Math.max(0, needPrediction.length - maxBatch),
      });
    }

    if (action === "resolve") {
      const unresolved = await db
        .select()
        .from(schema.predictionBenchmarks)
        .where(eq(schema.predictionBenchmarks.resolved, 0));

      let resolved = 0;
      for (const b of unresolved) {
        const outcome = await resolveFromSource(b.id);
        if (outcome !== null) resolved++;
      }

      return NextResponse.json({ resolved, checked: unresolved.length });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[benchmarks] POST error:", error);
    return NextResponse.json({ error: "Benchmark operation failed" }, { status: 500 });
  }
}
