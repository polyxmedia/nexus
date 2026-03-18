import { db, schema } from "@/lib/db";
import { sql } from "drizzle-orm";

interface PredictionStats {
  accuracy: string;
  totalResolved: number;
  toolCount: string;
  tierCount: string;
}

export async function getLivePredictionStats(): Promise<PredictionStats> {
  try {
    const rows = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE outcome IS NOT NULL AND outcome NOT IN ('expired', 'post_event'))::int as resolved,
        COUNT(*) FILTER (WHERE outcome = 'confirmed')::int as confirmed
      FROM predictions
      WHERE pre_event = 1 AND regime_invalidated = 0
    `);

    const row = (rows.rows[0] || {}) as Record<string, number>;
    const resolved = row.resolved || 0;
    const confirmed = row.confirmed || 0;
    const accuracy = resolved >= 5 ? Math.round((confirmed / resolved) * 100) : 0;

    return {
      accuracy: resolved >= 5 ? `${accuracy}%` : "Calibrating",
      totalResolved: resolved,
      toolCount: "20+",
      tierCount: "3",
    };
  } catch {
    return { accuracy: "Calibrating", totalResolved: 0, toolCount: "20+", tierCount: "3" };
  }
}
