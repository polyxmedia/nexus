// Data retention cleanup jobs
// Runs daily to purge old rows from high-volume tables and archive expired knowledge

import { sql } from "drizzle-orm";

export async function runRetentionCleanup(): Promise<RetentionResult> {
  const { db } = await import("@/lib/db");

  const now = new Date();
  const results: RetentionResult = {
    analyticsEventsDeleted: 0,
    alertHistoryDeleted: 0,
    timelineEventsDeleted: 0,
    knowledgeExpired: 0,
    errors: [],
  };

  // 1. Analytics events older than 90 days
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60_000).toISOString();
  try {
    const res = await db.execute(
      sql`DELETE FROM analytics_events WHERE created_at < ${ninetyDaysAgo}`
    );
    results.analyticsEventsDeleted = Number(res.rowCount ?? 0);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.errors.push(`analytics_events: ${msg}`);
    console.error("[retention] analytics_events cleanup failed:", msg);
  }

  // 2. Alert history older than 90 days
  try {
    const res = await db.execute(
      sql`DELETE FROM alert_history WHERE triggered_at < ${ninetyDaysAgo}`
    );
    results.alertHistoryDeleted = Number(res.rowCount ?? 0);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.errors.push(`alert_history: ${msg}`);
    console.error("[retention] alert_history cleanup failed:", msg);
  }

  // 3. Timeline events older than 180 days
  const oneEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60_000).toISOString();
  try {
    const res = await db.execute(
      sql`DELETE FROM timeline_events WHERE created_at < ${oneEightyDaysAgo}`
    );
    results.timelineEventsDeleted = Number(res.rowCount ?? 0);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.errors.push(`timeline_events: ${msg}`);
    console.error("[retention] timeline_events cleanup failed:", msg);
  }

  // 4. Expire ALL knowledge entries with valid_until in the past (any source)
  //    The live-ingest expiry only covers source='live-ingest'. This catches everything else.
  //    Archives entries whose valid_until has passed and that are still active.
  try {
    const nowIso = now.toISOString();
    const res = await db.execute(
      sql`UPDATE knowledge
          SET status = 'archived', updated_at = ${nowIso}
          WHERE status = 'active'
            AND valid_until IS NOT NULL
            AND valid_until < ${nowIso}`
    );
    results.knowledgeExpired = Number(res.rowCount ?? 0);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.errors.push(`knowledge expiry: ${msg}`);
    console.error("[retention] knowledge expiry failed:", msg);
  }

  console.log(
    `[retention] Cleanup complete: analytics=${results.analyticsEventsDeleted}, ` +
    `alertHistory=${results.alertHistoryDeleted}, timeline=${results.timelineEventsDeleted}, ` +
    `knowledgeExpired=${results.knowledgeExpired}, errors=${results.errors.length}`
  );

  return results;
}

export interface RetentionResult {
  analyticsEventsDeleted: number;
  alertHistoryDeleted: number;
  timelineEventsDeleted: number;
  knowledgeExpired: number;
  errors: string[];
}
