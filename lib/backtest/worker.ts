import "server-only";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { claimChunk, completeChunk, failChunk } from "./coordinator";

/**
 * Register a worker in the workers table.
 */
export async function registerWorker(workerId: string): Promise<void> {
  const existing = await db.select().from(schema.backtestWorkers)
    .where(eq(schema.backtestWorkers.workerId, workerId));

  if (existing.length > 0) {
    await db.update(schema.backtestWorkers).set({
      status: "idle",
      lastHeartbeat: new Date().toISOString(),
    }).where(eq(schema.backtestWorkers.workerId, workerId));
  } else {
    await db.insert(schema.backtestWorkers).values({
      workerId,
      status: "idle",
      lastHeartbeat: new Date().toISOString(),
    });
  }
}

/**
 * Update worker heartbeat.
 */
export async function heartbeat(workerId: string): Promise<void> {
  await db.update(schema.backtestWorkers).set({
    lastHeartbeat: new Date().toISOString(),
  }).where(eq(schema.backtestWorkers.workerId, workerId));
}

/**
 * Process a single chunk by generating predictions for its date range.
 * This is a simplified version - production would call the full backtest engine.
 */
async function processChunk(chunk: typeof schema.backtestChunks.$inferSelect): Promise<{
  predictions: unknown[];
  metrics: { accuracy: number; brierScore: number; sampleCount: number; correct: number; total: number };
}> {
  // Fetch predictions that were created in this chunk's date range
  const { dateStart, dateEnd } = chunk;
  if (!dateStart || !dateEnd) {
    return { predictions: [], metrics: { accuracy: 0, brierScore: 0, sampleCount: 0, correct: 0, total: 0 } };
  }

  const predictions = await db.select().from(schema.predictions)
    .where(eq(schema.predictions.preEvent, 1));

  // Filter to chunk's date range
  const chunkPredictions = predictions.filter(p => {
    const created = p.createdAt;
    return created >= dateStart && created <= dateEnd && p.outcome !== null;
  });

  const total = chunkPredictions.length;
  const correct = chunkPredictions.filter(p => p.directionCorrect === 1).length;
  const accuracy = total > 0 ? correct / total : 0;

  // Compute Brier score
  let brierSum = 0;
  for (const p of chunkPredictions) {
    const outcome = p.directionCorrect === 1 ? 1 : 0;
    brierSum += Math.pow(p.confidence - outcome, 2);
  }
  const brierScore = total > 0 ? brierSum / total : 0;

  return {
    predictions: chunkPredictions.map(p => ({
      id: p.id,
      claim: p.claim,
      confidence: p.confidence,
      correct: p.directionCorrect === 1,
      outcome: p.outcome,
    })),
    metrics: { accuracy, brierScore, sampleCount: total, correct, total },
  };
}

/**
 * Run a worker loop: claim chunks, process them, mark complete.
 * Returns when no more chunks are available.
 */
export async function runWorker(workerId: string): Promise<{ processed: number; errors: number }> {
  await registerWorker(workerId);
  let processed = 0;
  let errors = 0;

  while (true) {
    await heartbeat(workerId);

    // Update worker status
    await db.update(schema.backtestWorkers).set({ status: "busy" })
      .where(eq(schema.backtestWorkers.workerId, workerId));

    const chunk = await claimChunk(workerId);
    if (!chunk) {
      // No more chunks
      await db.update(schema.backtestWorkers).set({ status: "idle", currentRunId: null, currentChunk: null })
        .where(eq(schema.backtestWorkers.workerId, workerId));
      break;
    }

    // Update worker tracking
    await db.update(schema.backtestWorkers).set({
      currentRunId: chunk.runId,
      currentChunk: chunk.chunkIndex,
    }).where(eq(schema.backtestWorkers.workerId, workerId));

    try {
      const result = await processChunk(chunk);
      await completeChunk(chunk.id, result.predictions, result.metrics);
      processed++;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      await failChunk(chunk.id, errorMsg);
      errors++;
    }
  }

  return { processed, errors };
}
