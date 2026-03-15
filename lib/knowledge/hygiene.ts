// Knowledge Hygiene Engine
// Scores staleness of knowledge entries and applies grace periods
// for entries that haven't been accessed within their category shelf life.
// Non-AI, pure data-driven. Runs daily after data-retention.
//
// Uses last_hygiene_check to skip recently-checked healthy entries.
// Only re-evaluates an entry if:
//   1. It has never been checked, OR
//   2. It was accessed since last check (freshness anchor may have changed), OR
//   3. Enough time has passed that it *could* have crossed the staleness threshold

import { db, schema } from "@/lib/db";
import { eq, sql, and, isNull } from "drizzle-orm";

// Shelf life in days per category (how long an unaccessed entry stays active)
const SHELF_LIFE_DAYS: Record<string, number> = {
  market: 30,
  event: 45,
  geopolitical: 90,
  actor: 90,
  thesis: 120,
  model: 180,
  technical: 180,
};

const DEFAULT_SHELF_LIFE_DAYS = 90;

// High-confidence entries get extended shelf life
const HIGH_CONFIDENCE_MULTIPLIER = 1.5;
const HIGH_CONFIDENCE_THRESHOLD = 0.85;

// Grace period before archival (days)
const GRACE_PERIOD_DAYS = 14;

// Sources exempt from hygiene (they have their own lifecycle)
const EXEMPT_SOURCES = ["live-ingest"];

// Re-check interval: only re-evaluate healthy entries after this many days
// (unless they were accessed, which resets the check window)
const RECHECK_INTERVAL_DAYS = 7;

export interface HygieneResult {
  totalActive: number;
  reviewed: number;
  skipped: number;
  graceApplied: number;
  alreadyGraced: number;
  healthy: number;
  exempted: number;
  errors: string[];
}

interface TrackedEntry {
  id: number;
  title: string;
  category: string;
  confidence: number | null;
  source: string | null;
  createdAt: string;
  updatedAt: string | null;
  validUntil: string | null;
  lastAccessedAt: string | null;
  accessCount: number;
  lastHygieneCheck: string | null;
}

function getShelfLifeDays(category: string, confidence: number | null): number {
  const base = SHELF_LIFE_DAYS[category] ?? DEFAULT_SHELF_LIFE_DAYS;
  const conf = confidence ?? 0.8;
  return conf >= HIGH_CONFIDENCE_THRESHOLD ? Math.round(base * HIGH_CONFIDENCE_MULTIPLIER) : base;
}

function getFreshnessAnchor(entry: TrackedEntry): number {
  const lastAccess = entry.lastAccessedAt ? new Date(entry.lastAccessedAt).getTime() : 0;
  const lastUpdate = entry.updatedAt ? new Date(entry.updatedAt).getTime() : 0;
  const created = new Date(entry.createdAt).getTime();
  return Math.max(lastAccess, lastUpdate, created);
}

function isStale(entry: TrackedEntry, now: Date): boolean {
  const shelfLifeMs = getShelfLifeDays(entry.category, entry.confidence) * 24 * 60 * 60_000;
  return (now.getTime() - getFreshnessAnchor(entry)) > shelfLifeMs;
}

function needsRecheck(entry: TrackedEntry, now: Date): boolean {
  // Never checked: must check
  if (!entry.lastHygieneCheck) return true;

  const lastCheck = new Date(entry.lastHygieneCheck).getTime();
  const recheckMs = RECHECK_INTERVAL_DAYS * 24 * 60 * 60_000;

  // Accessed since last check: re-evaluate (anchor may have shifted)
  if (entry.lastAccessedAt) {
    const accessed = new Date(entry.lastAccessedAt).getTime();
    if (accessed > lastCheck) return true;
  }

  // Updated since last check: re-evaluate
  if (entry.updatedAt) {
    const updated = new Date(entry.updatedAt).getTime();
    if (updated > lastCheck) return true;
  }

  // Enough time has passed that staleness status could have changed
  if ((now.getTime() - lastCheck) > recheckMs) return true;

  return false;
}

export async function runKnowledgeHygiene(): Promise<HygieneResult> {
  const now = new Date();
  const nowIso = now.toISOString();
  const result: HygieneResult = {
    totalActive: 0,
    reviewed: 0,
    skipped: 0,
    graceApplied: 0,
    alreadyGraced: 0,
    healthy: 0,
    exempted: 0,
    errors: [],
  };

  try {
    // Single query: all active entries with their tracking columns
    const rows = await db.execute(
      sql`SELECT id, title, category, confidence, source, created_at,
                 updated_at, valid_until, last_accessed_at, access_count,
                 last_hygiene_check
          FROM knowledge
          WHERE status = 'active'`
    );

    const entries: TrackedEntry[] = (rows.rows as Array<{
      id: number;
      title: string;
      category: string;
      confidence: number | null;
      source: string | null;
      created_at: string;
      updated_at: string | null;
      valid_until: string | null;
      last_accessed_at: string | null;
      access_count: number;
      last_hygiene_check: string | null;
    }>).map(r => ({
      id: r.id,
      title: r.title,
      category: r.category,
      confidence: r.confidence,
      source: r.source,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      validUntil: r.valid_until,
      lastAccessedAt: r.last_accessed_at,
      accessCount: r.access_count ?? 0,
      lastHygieneCheck: r.last_hygiene_check,
    }));

    result.totalActive = entries.length;

    // Batch: collect IDs to stamp as checked
    const checkedIds: number[] = [];

    for (const entry of entries) {
      // Already has validUntil (graced or live-ingest managed)
      if (entry.validUntil) {
        if (entry.source !== "live-ingest") {
          result.alreadyGraced++;
        }
        continue;
      }

      // Exempt sources
      if (entry.source && EXEMPT_SOURCES.includes(entry.source)) {
        result.exempted++;
        continue;
      }

      // Skip if recently checked and nothing changed
      if (!needsRecheck(entry, now)) {
        result.skipped++;
        continue;
      }

      result.reviewed++;

      if (isStale(entry, now)) {
        const graceUntil = new Date(now.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60_000).toISOString();
        const shelfDays = getShelfLifeDays(entry.category, entry.confidence);
        try {
          // Preserve existing metadata, add hygiene fields
          await db.execute(
            sql`UPDATE knowledge
                SET valid_until = ${graceUntil},
                    updated_at = ${nowIso},
                    last_hygiene_check = ${nowIso},
                    metadata = jsonb_set(
                      COALESCE(metadata::jsonb, '{}'::jsonb),
                      '{hygiene}',
                      ${JSON.stringify({
                        gracedAt: nowIso,
                        reason: `No access within ${shelfDays}-day shelf life`,
                        graceExpires: graceUntil,
                      })}::jsonb
                    )::text
                WHERE id = ${entry.id}`
          );
          result.graceApplied++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          result.errors.push(`Grace ${entry.id} (${entry.title.slice(0, 50)}): ${msg}`);
        }
      } else {
        result.healthy++;
        checkedIds.push(entry.id);
      }
    }

    // Batch-stamp healthy entries as checked
    if (checkedIds.length > 0) {
      try {
        await db.execute(
          sql`UPDATE knowledge
              SET last_hygiene_check = ${nowIso}
              WHERE id = ANY(${checkedIds})`
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`Batch stamp failed: ${msg}`);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Hygiene scan failed: ${msg}`);
    console.error("[knowledge-hygiene] Fatal error:", msg);
  }

  console.log(
    `[knowledge-hygiene] Done: active=${result.totalActive}, reviewed=${result.reviewed}, ` +
    `skipped=${result.skipped}, graced=${result.graceApplied}, healthy=${result.healthy}, ` +
    `exempted=${result.exempted}, errors=${result.errors.length}`
  );

  return result;
}

// Bump access tracking when an entry is retrieved in search
export async function trackAccess(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const now = new Date().toISOString();
  try {
    await db.execute(
      sql`UPDATE knowledge
          SET last_accessed_at = ${now},
              access_count = access_count + 1
          WHERE id = ANY(${ids})`
    );
  } catch (err) {
    // Non-critical, don't break search flow
    console.warn("[knowledge-hygiene] Failed to track access:", err);
  }
}

// Rescue an entry from grace period (e.g. if it gets accessed during grace)
// Called when a graced entry is retrieved in search - removes the validUntil
export async function rescueFromGrace(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    await db.execute(
      sql`UPDATE knowledge
          SET valid_until = NULL,
              last_hygiene_check = ${new Date().toISOString()}
          WHERE id = ANY(${ids})
            AND valid_until IS NOT NULL
            AND status = 'active'`
    );
  } catch (err) {
    console.warn("[knowledge-hygiene] Failed to rescue from grace:", err);
  }
}

// Get hygiene status overview
export async function getHygieneStatus(): Promise<{
  totalActive: number;
  healthy: number;
  graced: number;
  staleUngraced: number;
  neverAccessed: number;
  neverChecked: number;
  categoryBreakdown: Record<string, { total: number; stale: number; avgAccessCount: number; shelfLifeDays: number }>;
}> {
  const now = new Date();

  const rows = await db.execute(
    sql`SELECT id, category, confidence, source, created_at,
               updated_at, valid_until, last_accessed_at, access_count,
               last_hygiene_check
        FROM knowledge
        WHERE status = 'active'`
  );

  const entries: TrackedEntry[] = (rows.rows as Array<{
    id: number;
    title: string;
    category: string;
    confidence: number | null;
    source: string | null;
    created_at: string;
    updated_at: string | null;
    valid_until: string | null;
    last_accessed_at: string | null;
    access_count: number;
    last_hygiene_check: string | null;
  }>).map(r => ({
    id: r.id,
    title: r.title ?? "",
    category: r.category,
    confidence: r.confidence,
    source: r.source,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    validUntil: r.valid_until,
    lastAccessedAt: r.last_accessed_at,
    accessCount: r.access_count ?? 0,
    lastHygieneCheck: r.last_hygiene_check,
  }));

  let healthy = 0;
  let graced = 0;
  let staleUngraced = 0;
  let neverAccessed = 0;
  let neverChecked = 0;
  const categoryBreakdown: Record<string, { total: number; stale: number; totalAccessCount: number }> = {};

  for (const entry of entries) {
    const cat = entry.category;
    if (!categoryBreakdown[cat]) {
      categoryBreakdown[cat] = { total: 0, stale: 0, totalAccessCount: 0 };
    }
    categoryBreakdown[cat].total++;
    categoryBreakdown[cat].totalAccessCount += entry.accessCount;

    if (entry.accessCount === 0 && !entry.lastAccessedAt) neverAccessed++;
    if (!entry.lastHygieneCheck) neverChecked++;

    if (entry.source && EXEMPT_SOURCES.includes(entry.source)) {
      healthy++;
      continue;
    }

    if (entry.validUntil) {
      graced++;
      continue;
    }

    if (isStale(entry, now)) {
      staleUngraced++;
      categoryBreakdown[cat].stale++;
    } else {
      healthy++;
    }
  }

  const formattedBreakdown: Record<string, { total: number; stale: number; avgAccessCount: number; shelfLifeDays: number }> = {};
  for (const [cat, data] of Object.entries(categoryBreakdown)) {
    formattedBreakdown[cat] = {
      total: data.total,
      stale: data.stale,
      avgAccessCount: data.total > 0 ? Math.round((data.totalAccessCount / data.total) * 10) / 10 : 0,
      shelfLifeDays: SHELF_LIFE_DAYS[cat] ?? DEFAULT_SHELF_LIFE_DAYS,
    };
  }

  return {
    totalActive: entries.length,
    healthy,
    graced,
    staleUngraced,
    neverAccessed,
    neverChecked,
    categoryBreakdown: formattedBreakdown,
  };
}
