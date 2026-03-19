/**
 * Background AI Usage Tracker
 * ============================
 * Tracks token usage from background jobs (twitter, blog, agents, etc.)
 * that don't go through the credit system. Stores monthly totals in
 * settings for the cost dashboard.
 */

import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

interface UsageEntry {
  inputTokens: number;
  outputTokens: number;
  model: string;
  source: string; // "twitter-analyst", "blog-writer", "prediction-resolve", etc.
}

/**
 * Log background AI usage for cost monitoring.
 * Non-blocking, fire-and-forget.
 */
export async function trackBackgroundAIUsage(entry: UsageEntry): Promise<void> {
  try {
    const period = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}`;
    const key = `bg_ai_usage:${period}`;

    const rows = await db.select().from(schema.settings).where(eq(schema.settings.key, key));
    const existing = rows[0] ? JSON.parse(rows[0].value) : { calls: 0, inputTokens: 0, outputTokens: 0, bySource: {} };

    existing.calls += 1;
    existing.inputTokens += entry.inputTokens;
    existing.outputTokens += entry.outputTokens;
    if (!existing.bySource[entry.source]) existing.bySource[entry.source] = { calls: 0, inputTokens: 0, outputTokens: 0 };
    existing.bySource[entry.source].calls += 1;
    existing.bySource[entry.source].inputTokens += entry.inputTokens;
    existing.bySource[entry.source].outputTokens += entry.outputTokens;

    const value = JSON.stringify(existing);
    const now = new Date().toISOString();

    if (rows[0]) {
      await db.update(schema.settings).set({ value, updatedAt: now }).where(eq(schema.settings.key, key));
    } else {
      await db.insert(schema.settings).values({ key, value, updatedAt: now });
    }
  } catch {
    // Non-critical, don't fail the job
  }
}
