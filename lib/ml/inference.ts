import "server-only";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getLatestFeatures } from "./feature-store";
import { type TreeNode, predictTree } from "./tree";

interface ModelArtifact {
  trees: TreeNode[];
  initialPrediction: number;
  learningRate: number;
  featureNames: string[];
}

function predictEnsemble(artifact: ModelArtifact, features: Record<string, number>): number {
  let prediction = artifact.initialPrediction;
  for (const tree of artifact.trees) {
    prediction += artifact.learningRate * predictTree(tree, features);
  }
  return 1 / (1 + Math.exp(-prediction));
}

export async function loadModel(modelId: number): Promise<ModelArtifact | null> {
  const [model] = await db.select().from(schema.mlModels).where(eq(schema.mlModels.id, modelId));
  if (!model || !model.artifact) return null;
  return JSON.parse(model.artifact) as ModelArtifact;
}

export async function predict(
  modelId: number,
  features: Record<string, number>,
): Promise<{ predictedClass: string; confidence: number }> {
  const artifact = await loadModel(modelId);
  if (!artifact) throw new Error("Model not found");

  const probability = predictEnsemble(artifact, features);
  const predictedClass = probability > 0.5 ? "up" : "down";
  const confidence = Math.abs(probability - 0.5) * 2; // 0-1 scale

  return {
    predictedClass,
    confidence: Math.round(confidence * 1000) / 1000,
  };
}

export async function predictAndStore(
  modelId: number,
  symbol?: string,
): Promise<{ predictedClass: string; confidence: number; predictionId: number }> {
  const featureVector = await getLatestFeatures(symbol);
  const result = await predict(modelId, featureVector.features);

  const [prediction] = await db.insert(schema.mlPredictions).values({
    modelId,
    predictionDate: new Date().toISOString(),
    targetSymbol: symbol || null,
    predictedClass: result.predictedClass,
    confidence: result.confidence,
    featuresSnapshot: JSON.stringify(featureVector.features),
  }).returning();

  return { ...result, predictionId: prediction.id };
}

export async function getActiveModel(target: string) {
  const [model] = await db.select().from(schema.mlModels)
    .where(and(eq(schema.mlModels.target, target), eq(schema.mlModels.status, "active")));
  return model || null;
}
