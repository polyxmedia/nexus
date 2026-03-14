import "server-only";
import { db, schema } from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";

export interface ChunkConfig {
  runId: string;
  totalChunks: number;
  dateRanges: Array<{ start: string; end: string }>;
}

/**
 * Split a backtest run into chunks and create DB records.
 */
export async function createDistributedRun(
  runId: string,
  config: {
    startDate: string;
    endDate: string;
    instruments?: string[];
    chunksCount?: number;
  },
): Promise<ChunkConfig> {
  const { startDate, endDate, instruments, chunksCount = 4 } = config;

  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const totalMs = end - start;
  const chunkMs = totalMs / chunksCount;

  const dateRanges: Array<{ start: string; end: string }> = [];

  for (let i = 0; i < chunksCount; i++) {
    const chunkStart = new Date(start + i * chunkMs).toISOString().split("T")[0];
    const chunkEnd = new Date(start + (i + 1) * chunkMs).toISOString().split("T")[0];
    dateRanges.push({ start: chunkStart, end: chunkEnd });
  }

  // Create chunk records
  for (let i = 0; i < dateRanges.length; i++) {
    await db.insert(schema.backtestChunks).values({
      runId,
      chunkIndex: i,
      dateStart: dateRanges[i].start,
      dateEnd: dateRanges[i].end,
      instruments: instruments ? JSON.stringify(instruments) : null,
      status: "pending",
    });
  }

  return { runId, totalChunks: chunksCount, dateRanges };
}

/**
 * Get progress of a distributed run.
 */
export async function getRunProgress(runId: string) {
  const chunks = await db.select().from(schema.backtestChunks)
    .where(eq(schema.backtestChunks.runId, runId));

  return {
    total: chunks.length,
    complete: chunks.filter(c => c.status === "complete").length,
    failed: chunks.filter(c => c.status === "failed").length,
    pending: chunks.filter(c => c.status === "pending").length,
    processing: chunks.filter(c => c.status === "processing").length,
  };
}

/**
 * Check if a run is complete.
 */
export async function isRunComplete(runId: string): Promise<boolean> {
  const progress = await getRunProgress(runId);
  return progress.pending === 0 && progress.processing === 0;
}

/**
 * Claim the next pending chunk for processing.
 * Uses atomic update to prevent race conditions.
 */
export async function claimChunk(workerId: string): Promise<typeof schema.backtestChunks.$inferSelect | null> {
  // Atomic claim: update first pending chunk
  const result = await db.execute(sql`
    UPDATE backtest_chunks
    SET status = 'processing', worker_id = ${workerId}
    WHERE id = (
      SELECT id FROM backtest_chunks
      WHERE status = 'pending'
      ORDER BY chunk_index ASC
      LIMIT 1
    )
    RETURNING *
  `);

  if (result.rows.length === 0) return null;
  return result.rows[0] as typeof schema.backtestChunks.$inferSelect;
}

/**
 * Mark a chunk as complete with results.
 */
export async function completeChunk(
  chunkId: number,
  predictions: unknown,
  metrics: unknown,
): Promise<void> {
  await db.update(schema.backtestChunks).set({
    status: "complete",
    predictions: JSON.stringify(predictions),
    metrics: JSON.stringify(metrics),
    completedAt: new Date().toISOString(),
  }).where(eq(schema.backtestChunks.id, chunkId));
}

/**
 * Mark a chunk as failed.
 */
export async function failChunk(chunkId: number, error: string): Promise<void> {
  await db.update(schema.backtestChunks).set({
    status: "failed",
    error,
    completedAt: new Date().toISOString(),
  }).where(eq(schema.backtestChunks.id, chunkId));
}
