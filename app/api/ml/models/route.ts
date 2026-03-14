import { NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { db, schema } from "@/lib/db";
import { desc } from "drizzle-orm";
import { trainModel } from "@/lib/ml/train";

export async function GET() {
  const check = await requireTier("operator");
  if ("response" in check) return check.response;

  const models = await db.select({
    id: schema.mlModels.id,
    name: schema.mlModels.name,
    modelType: schema.mlModels.modelType,
    target: schema.mlModels.target,
    status: schema.mlModels.status,
    sampleCount: schema.mlModels.sampleCount,
    metrics: schema.mlModels.metrics,
    trainingDate: schema.mlModels.trainingDate,
    createdAt: schema.mlModels.createdAt,
  }).from(schema.mlModels).orderBy(desc(schema.mlModels.createdAt));

  return NextResponse.json(models.map(m => ({
    ...m,
    metrics: m.metrics ? JSON.parse(m.metrics) : null,
  })));
}

export async function POST(request: Request) {
  const check = await requireTier("institution");
  if ("response" in check) return check.response;

  try {
    const config = await request.json();
    if (!config.name || !config.startDate || !config.endDate) {
      return NextResponse.json({ error: "name, startDate, endDate required" }, { status: 400 });
    }

    // Default features if not specified
    if (!config.features || config.features.length === 0) {
      config.features = [
        "signal_count_7d", "signal_intensity_avg", "signal_intensity_max",
        "convergence_count", "prediction_accuracy_30d", "prediction_confidence_avg",
        "brier_score_30d", "active_predictions",
      ];
    }
    if (!config.target) config.target = "direction";

    const result = await trainModel(config);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Training failed" },
      { status: 500 }
    );
  }
}
