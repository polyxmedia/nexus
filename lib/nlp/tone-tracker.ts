import "server-only";
import { db, schema } from "@/lib/db";
import { desc, gte, sql } from "drizzle-orm";

export interface ToneShiftAlert {
  entity: string;
  currentTone: number;
  previousTone: number;
  shift: number;
  direction: "more_positive" | "more_negative";
  significance: "minor" | "notable" | "significant";
  windowHours: number;
}

export interface SentimentTimelinePoint {
  date: string;
  score: number;
  source: string;
  title: string | null;
}

/**
 * Track tone shifts for a specific entity over time.
 * Detects significant shifts (>0.3 change in 48h).
 */
export async function trackToneShift(
  entity: string,
  windowDays = 7,
): Promise<ToneShiftAlert | null> {
  if (!entity || entity.length < 2 || entity.length > 100) return null;

  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

  // Use word boundary pattern to avoid partial matches (e.g. "US" matching "RUSSIA")
  const pattern = `%"${entity}"%`;

  // Find all analyses mentioning this entity (entities_mentioned is JSON array)
  const analyses = await db.execute(sql`
    SELECT sentiment_score, created_at
    FROM sentiment_analyses
    WHERE entities_mentioned ILIKE ${pattern}
    AND created_at >= ${since}
    ORDER BY created_at DESC
  `);

  const rows = analyses.rows as Array<{ sentiment_score: number; created_at: string }>;
  if (rows.length < 2) return null;

  // Split into recent 48h and older
  const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const recent = rows.filter(r => r.created_at >= cutoff48h);
  const older = rows.filter(r => r.created_at < cutoff48h);

  if (recent.length === 0 || older.length === 0) return null;

  const recentAvg = recent.reduce((s, r) => s + r.sentiment_score, 0) / recent.length;
  const olderAvg = older.reduce((s, r) => s + r.sentiment_score, 0) / older.length;
  const shift = recentAvg - olderAvg;

  if (Math.abs(shift) < 0.1) return null;

  return {
    entity,
    currentTone: Math.round(recentAvg * 1000) / 1000,
    previousTone: Math.round(olderAvg * 1000) / 1000,
    shift: Math.round(shift * 1000) / 1000,
    direction: shift > 0 ? "more_positive" : "more_negative",
    significance: Math.abs(shift) > 0.3 ? "significant" : Math.abs(shift) > 0.2 ? "notable" : "minor",
    windowHours: 48,
  };
}

/**
 * Get sentiment timeline for an entity.
 */
export async function getSentimentTimeline(
  entity: string,
  days = 30,
): Promise<SentimentTimelinePoint[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const pattern = `%"${entity}"%`;

  const results = await db.execute(sql`
    SELECT sentiment_score, source_type, source_title, created_at
    FROM sentiment_analyses
    WHERE entities_mentioned ILIKE ${pattern}
    AND created_at >= ${since}
    ORDER BY created_at ASC
  `);

  return (results.rows as Array<{ sentiment_score: number; source_type: string; source_title: string | null; created_at: string }>).map(r => ({
    date: r.created_at,
    score: r.sentiment_score,
    source: r.source_type,
    title: r.source_title,
  }));
}
