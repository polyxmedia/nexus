import "server-only";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function getFeatureImportance(modelId: number): Promise<Record<string, number>> {
  const [model] = await db.select().from(schema.mlModels).where(eq(schema.mlModels.id, modelId));
  if (!model || !model.metrics) return {};

  const metrics = JSON.parse(model.metrics);
  return metrics.featureImportance || {};
}

export async function getTopFeatures(
  modelId: number,
  n = 10,
): Promise<Array<{ feature: string; importance: number }>> {
  const importance = await getFeatureImportance(modelId);

  return Object.entries(importance)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([feature, importance]) => ({ feature, importance }));
}
