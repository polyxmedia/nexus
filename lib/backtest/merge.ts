import "server-only";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

interface ChunkMetrics {
  accuracy: number;
  brierScore: number;
  sampleCount: number;
  correct: number;
  total: number;
}

interface MergedResult {
  predictions: unknown[];
  metrics: {
    accuracy: number;
    brierScore: number;
    sampleCount: number;
    calibration: Array<{ bucket: string; predicted: number; observed: number; count: number }>;
  };
}

/**
 * Merge results from all complete chunks of a distributed run.
 */
export async function mergeChunkResults(runId: string): Promise<MergedResult> {
  const chunks = await db.select().from(schema.backtestChunks)
    .where(eq(schema.backtestChunks.runId, runId));

  const completeChunks = chunks.filter(c => c.status === "complete");

  if (completeChunks.length === 0) {
    return {
      predictions: [],
      metrics: { accuracy: 0, brierScore: 0, sampleCount: 0, calibration: [] },
    };
  }

  // Merge predictions
  const allPredictions: unknown[] = [];
  let totalCorrect = 0;
  let totalSamples = 0;
  let weightedBrier = 0;

  const calibrationBuckets = new Map<string, { predicted: number; observed: number; count: number }>();
  const bucketNames = ["0.0-0.2", "0.2-0.4", "0.4-0.6", "0.6-0.8", "0.8-1.0"];
  bucketNames.forEach(b => calibrationBuckets.set(b, { predicted: 0, observed: 0, count: 0 }));

  for (const chunk of completeChunks) {
    if (chunk.predictions) {
      const preds = JSON.parse(chunk.predictions);
      if (Array.isArray(preds)) allPredictions.push(...preds);
    }

    if (chunk.metrics) {
      const metrics = JSON.parse(chunk.metrics) as ChunkMetrics;
      totalCorrect += metrics.correct || 0;
      totalSamples += metrics.total || metrics.sampleCount || 0;
      weightedBrier += (metrics.brierScore || 0) * (metrics.sampleCount || 0);
    }
  }

  const accuracy = totalSamples > 0 ? totalCorrect / totalSamples : 0;
  const brierScore = totalSamples > 0 ? weightedBrier / totalSamples : 0;

  // Build calibration from merged predictions
  for (const pred of allPredictions as Array<{ confidence?: number; correct?: boolean }>) {
    if (pred.confidence === undefined) continue;
    const bucketIdx = Math.min(Math.floor(pred.confidence / 0.2), 4);
    const bucketName = bucketNames[bucketIdx];
    const bucket = calibrationBuckets.get(bucketName)!;
    bucket.predicted += pred.confidence;
    bucket.observed += pred.correct ? 1 : 0;
    bucket.count++;
  }

  const calibration = bucketNames.map(name => {
    const bucket = calibrationBuckets.get(name)!;
    return {
      bucket: name,
      predicted: bucket.count > 0 ? Math.round((bucket.predicted / bucket.count) * 1000) / 1000 : 0,
      observed: bucket.count > 0 ? Math.round((bucket.observed / bucket.count) * 1000) / 1000 : 0,
      count: bucket.count,
    };
  });

  return {
    predictions: allPredictions,
    metrics: {
      accuracy: Math.round(accuracy * 1000) / 1000,
      brierScore: Math.round(brierScore * 1000) / 1000,
      sampleCount: totalSamples,
      calibration,
    },
  };
}
