// Background job scheduler for periodic intelligence tasks
// Uses simple interval-based scheduling (no cron dependency needed at runtime)

import * as Sentry from "@sentry/nextjs";
import { db, schema } from "@/lib/db";
import { eq, like } from "drizzle-orm";

/** Number of consecutive failures before escalating to Sentry */
const FAILURE_ALERT_THRESHOLD = 3;
/** After this many consecutive failures, disable the job until manual restart */
const CIRCUIT_BREAKER_THRESHOLD = 10;

type JobFn = () => Promise<void>;

interface JobOptions {
  ai?: boolean;
}

interface ScheduledJob {
  name: string;
  intervalMs: number;
  defaultIntervalMs: number;
  fn: JobFn;
  timer?: ReturnType<typeof setInterval>;
  lastRun?: Date;
  running: boolean;
  errors: number;
  ai?: boolean;
  disabled?: boolean;
}

const jobs = new Map<string, ScheduledJob>();
let started = false;
let aiEnabledFlag = true;
const INTERVAL_SETTING_PREFIX = "scheduler:interval:";
const AI_ENABLED_SETTING_KEY = "scheduler:ai_enabled";

export function registerJob(name: string, intervalMs: number, fn: JobFn, options?: JobOptions) {
  jobs.set(name, {
    name,
    intervalMs,
    defaultIntervalMs: intervalMs,
    fn,
    running: false,
    errors: 0,
    ai: options?.ai,
  });
}

async function runJob(job: ScheduledJob) {
  if (job.running || job.disabled) return;
  job.running = true;
  try {
    await job.fn();
    job.lastRun = new Date();
    job.errors = 0;
  } catch (err) {
    job.errors++;
    console.error(`[scheduler] Job "${job.name}" failed (${job.errors} consecutive):`, err);

    // Circuit breaker: disable job after too many consecutive failures
    if (job.errors >= CIRCUIT_BREAKER_THRESHOLD) {
      job.disabled = true;
      if (job.timer) {
        clearInterval(job.timer);
        job.timer = undefined;
      }
      console.error(
        `[scheduler] CIRCUIT BREAKER: Job "${job.name}" disabled after ${job.errors} consecutive failures. Restart scheduler to re-enable.`
      );
    }

    // After N consecutive failures, escalate to Sentry so it shows in monitoring
    if (job.errors >= FAILURE_ALERT_THRESHOLD) {
      const error = err instanceof Error ? err : new Error(String(err));
      Sentry.withScope((scope) => {
        scope.setTag("scheduler.job", job.name);
        scope.setExtra("consecutiveFailures", job.errors);
        scope.setExtra("intervalMs", job.intervalMs);
        scope.setExtra("lastSuccessfulRun", job.lastRun?.toISOString() || "never");
        scope.setExtra("disabled", job.disabled || false);
        scope.setLevel("error");
        Sentry.captureException(error);
      });
      console.warn(
        `[scheduler] ALERT: Job "${job.name}" has failed ${job.errors} consecutive times. Reported to Sentry.`
      );
    }
  } finally {
    job.running = false;
  }
}

export async function startScheduler() {
  if (started) return;
  started = true;
  await applySchedulerOverrides();
  console.log(`[scheduler] Starting ${jobs.size} jobs (AI ${aiEnabled() ? "ENABLED" : "DISABLED"})`);

  for (const job of jobs.values()) {
    // Reset circuit breaker on restart
    job.disabled = false;
    job.errors = 0;
    if (job.intervalMs <= 0) continue;
    runJob(job);
    job.timer = setInterval(() => runJob(job), job.intervalMs);
  }
}

export function stopScheduler() {
  for (const job of jobs.values()) {
    if (job.timer) clearInterval(job.timer);
    job.timer = undefined;
  }
  started = false;
}

/** Run one or more jobs by name (used by Vercel Crons). */
export async function runJobsByName(names: string[]) {
  const results: { name: string; ok: boolean; error?: string }[] = [];
  for (const name of names) {
    const job = jobs.get(name);
    if (!job) {
      results.push({ name, ok: false, error: "unknown job" });
      continue;
    }
    if (job.ai && !aiEnabled()) {
      results.push({ name, ok: true, error: "skipped (AI disabled)" });
      continue;
    }
    try {
      await job.fn();
      job.lastRun = new Date();
      job.errors = 0;
      results.push({ name, ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      job.errors++;
      results.push({ name, ok: false, error: msg.slice(0, 200) });
    }
  }
  return results;
}

export function getJobStatus() {
  return Array.from(jobs.values()).map((j) => ({
    name: j.name,
    intervalMs: j.intervalMs,
    defaultIntervalMs: j.defaultIntervalMs,
    lastRun: j.lastRun?.toISOString() || null,
    running: j.running,
    errors: j.errors,
    ai: j.ai || false,
    enabled: j.intervalMs > 0 && !j.disabled,
    disabled: j.disabled || false,
  }));
}

// AI kill switch: set SCHEDULER_AI_ENABLED=false to disable all AI-consuming jobs
// This saves ~$1-2/day in API costs while keeping data collection running
function aiEnabled(): boolean {
  return aiEnabledFlag;
}

function envAiEnabled(): boolean {
  const val = process.env.SCHEDULER_AI_ENABLED;
  if (val === undefined || val === null) return true;
  return val === "true" || val === "1";
}

async function applySchedulerOverrides() {
  let aiOverride: boolean | undefined;
  const intervalOverrides = new Map<string, number>();

  try {
    const aiRows = await db.select().from(schema.settings).where(eq(schema.settings.key, AI_ENABLED_SETTING_KEY));
    if (aiRows[0]?.value) {
      const value = aiRows[0].value.toLowerCase();
      aiOverride = value === "true" || value === "1" || value === "yes";
    }

    const rows = await db.select().from(schema.settings).where(like(schema.settings.key, `${INTERVAL_SETTING_PREFIX}%`));
    for (const row of rows) {
      const jobName = row.key.slice(INTERVAL_SETTING_PREFIX.length);
      const minutes = Number(row.value);
      if (!Number.isFinite(minutes)) continue;
      intervalOverrides.set(jobName, minutes);
    }
  } catch (err) {
    console.warn("[scheduler] Failed to load scheduler overrides:", err);
  }

  aiEnabledFlag = aiOverride ?? envAiEnabled();

  for (const job of jobs.values()) {
    const overrideMinutes = intervalOverrides.get(job.name);
    if (overrideMinutes !== undefined) {
      job.intervalMs = Math.max(0, overrideMinutes) * 60_000;
    } else {
      job.intervalMs = job.defaultIntervalMs;
    }
  }
}

// ── Default Jobs ──

registerJob("portfolio-snapshot", 5 * 60_000, async () => {
  // Snapshot portfolio every 5 minutes during market hours
  const hour = new Date().getUTCHours();
  if (hour < 13 || hour > 21) return; // ~8am-4pm ET
  const res = await internalFetch(`${getBaseUrl()}/api/portfolio`, { headers: internalHeaders() });
  if (!res.ok) throw new Error(`Portfolio fetch failed: ${res.status}`);
});

registerJob("signal-refresh", 60 * 60_000, async () => {
  // Refresh signals hourly
  const res = await internalFetch(`${getBaseUrl()}/api/signals/generate`, { method: "POST", headers: internalHeaders() });
  if (!res.ok) throw new Error(`Signal generation failed: ${res.status}`);
});

registerJob("osint-entity-extraction", 15 * 60_000, async () => {
  // Extract OSINT entities every 15 minutes
  const res = await internalFetch(`${getBaseUrl()}/api/osint/extract`, { headers: internalHeaders() });
  if (!res.ok) throw new Error(`OSINT extraction failed: ${res.status}`);
});

registerJob("alert-check", 5 * 60_000, async () => {
  // Check alert conditions every 5 minutes
  const res = await internalFetch(`${getBaseUrl()}/api/alerts/check`, { method: "POST", headers: internalHeaders() });
  if (!res.ok && res.status !== 404) throw new Error(`Alert check failed: ${res.status}`);
});

registerJob("monitor-sweep", 5 * 60_000, async () => {
  if (!aiEnabled()) return; // AI kill switch (prediction resolution uses Claude)
  // Master monitoring sweep every 5 minutes: alerts + prediction resolution
  const res = await internalFetch(`${getBaseUrl()}/api/scheduler/monitor`, { method: "POST", headers: internalHeaders() });
  if (!res.ok) throw new Error(`Monitor sweep failed: ${res.status}`);
}, { ai: true });

registerJob("intelligence-cycle", 15 * 60_000, async () => {
  if (!aiEnabled()) return; // AI kill switch
  // Three-brain intelligence cycle: Sentinel -> Analyst -> Executor
  const res = await internalFetch(`${getBaseUrl()}/api/agents/cycle`, { method: "POST", headers: internalHeaders() });
  if (!res.ok) throw new Error(`Intelligence cycle failed: ${res.status}`);
}, { ai: true });

registerJob("prediction-fast-resolve", 30 * 60_000, async () => {
  // Fast data-driven resolution every 30 min (no AI, just market data)
  const res = await internalFetch(`${getBaseUrl()}/api/predictions/fast-resolve`, { method: "POST", headers: internalHeaders() });
  if (!res.ok) throw new Error(`Fast prediction resolve failed: ${res.status}`);
});

registerJob("prediction-cycle", 3 * 60 * 60_000, async () => {
  if (!aiEnabled()) return; // AI kill switch
  // AI resolve complex predictions + generate new ones every 3 hours
  const res = await internalFetch(`${getBaseUrl()}/api/predictions/daily`, { method: "POST", headers: internalHeaders() });
  if (!res.ok) throw new Error(`Prediction cycle failed: ${res.status}`);
}, { ai: true });

registerJob("knowledge-live-ingest", 30 * 60_000, async () => {
  // Refresh live knowledge base with real-time geopolitical intelligence every 30 minutes
  const res = await internalFetch(`${getBaseUrl()}/api/knowledge/refresh`, { method: "POST", headers: internalHeaders() });
  if (!res.ok) throw new Error(`Knowledge live ingest failed: ${res.status}`);
});

registerJob("iw-auto-detect", 15 * 60_000, async () => {
  // Auto-detect I&W indicators from OSINT feeds every 15 minutes
  const res = await internalFetch(`${getBaseUrl()}/api/iw/evaluate`, { method: "POST", headers: internalHeaders() });
  if (!res.ok) throw new Error(`I&W auto-detect failed: ${res.status}`);
});

registerJob("regime-detection", 60 * 60_000, async () => {
  // Evaluate market regime and correlations hourly
  const res = await internalFetch(`${getBaseUrl()}/api/regime`, { method: "POST", headers: internalHeaders() });
  if (!res.ok) throw new Error(`Regime detection failed: ${res.status}`);
});

registerJob("nowcast-update", 4 * 60 * 60_000, async () => {
  // Generate economic nowcast every 4 hours
  const res = await internalFetch(`${getBaseUrl()}/api/nowcast`, { method: "POST", headers: internalHeaders() });
  if (!res.ok) throw new Error(`Nowcast update failed: ${res.status}`);
});

registerJob("context-alert-scan", 60 * 60_000, async () => {
  // Context-aware alert scan: match news against positions, watchlist, theses, chat topics (hourly)
  const res = await internalFetch(`${getBaseUrl()}/api/alerts/context-scan`, { method: "POST", headers: internalHeaders() });
  if (!res.ok) throw new Error(`Context alert scan failed: ${res.status}`);
});

registerJob("thesis-branch-generation", 6 * 60 * 60_000, async () => {
  // Pre-compute thesis branches for upcoming catalysts every 6 hours
  const res = await internalFetch(`${getBaseUrl()}/api/thesis/branches`, { method: "POST", headers: internalHeaders() });
  if (!res.ok) throw new Error(`Thesis branch generation failed: ${res.status}`);
});

registerJob("collection-gaps-check", 2 * 60 * 60_000, async () => {
  // Check intelligence collection gaps every 2 hours
  const res = await internalFetch(`${getBaseUrl()}/api/collection-gaps`, { headers: internalHeaders() });
  if (!res.ok) throw new Error(`Collection gaps check failed: ${res.status}`);
});

registerJob("systemic-risk-check", 2 * 60 * 60_000, async () => {
  // Compute systemic risk (absorption ratio + turbulence) every 2 hours during market hours
  const hour = new Date().getUTCHours();
  if (hour < 13 || hour > 21) return; // ~8am-4pm ET
  const res = await internalFetch(`${getBaseUrl()}/api/risk/systemic`, { method: "POST", headers: internalHeaders() });
  if (!res.ok) throw new Error(`Systemic risk check failed: ${res.status}`);
});

registerJob("actor-profile-update", 6 * 60 * 60_000, async () => {
  if (!aiEnabled()) return; // AI kill switch
  // Update actor profiles from GDELT/news every 6 hours
  const res = await internalFetch(`${getBaseUrl()}/api/actors/update`, { method: "POST", headers: internalHeaders() });
  if (!res.ok) throw new Error(`Actor profile update failed: ${res.status}`);
}, { ai: true });

registerJob("ig-token-refresh", 45 * 60_000, async () => {
  // IG OAuth tokens expire after 60s, but refresh tokens last longer.
  // Proactively refresh to keep the connection alive.
  try {
    const { db, schema } = await import("@/lib/db");
    const { eq } = await import("drizzle-orm");
    const { decrypt, encrypt } = await import("@/lib/encryption");

    const rows = await db.select().from(schema.settings).where(eq(schema.settings.key, "ig_oauth_refresh_token"));
    if (rows.length === 0) return; // IG not connected

    const refreshToken = decrypt(rows[0].value);
    if (!refreshToken) return;

    const apiKeyRows = await db.select().from(schema.settings).where(eq(schema.settings.key, "ig_api_key"));
    const apiKey = apiKeyRows.length > 0 ? decrypt(apiKeyRows[0].value) : process.env.IG_API_KEY;
    if (!apiKey) return;

    const envRows = await db.select().from(schema.settings).where(eq(schema.settings.key, "trading_environment"));
    const env = envRows.length > 0 ? decrypt(envRows[0].value) : (process.env.IG_ENVIRONMENT || "demo");
    const baseUrl = env === "live" ? "https://api.ig.com/gateway/deal" : "https://demo-api.ig.com/gateway/deal";

    const res = await fetch(`${baseUrl}/session/refresh-token`, {
      method: "POST",
      headers: {
        "X-IG-API-KEY": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json; charset=UTF-8",
        Version: "1",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error(`[scheduler] IG token refresh failed: ${res.status}`);
      return;
    }

    const data = await res.json();
    if (!data.access_token || !data.refresh_token) {
      console.error("[scheduler] IG token refresh returned incomplete data:", Object.keys(data));
      return;
    }

    const updates = [
      { key: "ig_oauth_access_token", value: encrypt(data.access_token) },
      { key: "ig_oauth_refresh_token", value: encrypt(data.refresh_token) },
      { key: "ig_oauth_expires_at", value: String(Date.now() + (data.expires_in || 60) * 1000) },
    ];

    for (const entry of updates) {
      await db.insert(schema.settings).values(entry).onConflictDoUpdate({
        target: schema.settings.key,
        set: { value: entry.value, updatedAt: new Date().toISOString() },
      });
    }
  } catch (err) {
    // Don't throw - IG may not be configured for all users
    console.error("[scheduler] IG token refresh error:", err);
  }
});

registerJob("twitter-analyst", 4 * 60 * 60_000, async () => {
  if (!aiEnabled()) return; // AI kill switch
  // Generate and post analyst commentary tweet every 4 hours
  const res = await internalFetch(`${getBaseUrl()}/api/twitter/analyst`, { method: "POST", headers: internalHeaders() });
  if (!res.ok) throw new Error(`Twitter analyst tweet failed: ${res.status}`);
}, { ai: true });

registerJob("twitter-replies", 2 * 60 * 60_000, async () => {
  if (!aiEnabled()) return; // AI kill switch
  // Find relevant threads and reply with analytical value every 2 hours
  const res = await internalFetch(`${getBaseUrl()}/api/twitter/replies`, { method: "POST", headers: internalHeaders() });
  if (!res.ok) throw new Error(`Twitter replies failed: ${res.status}`);
}, { ai: true });

registerJob("news-sync", 10 * 60_000, async () => {
  // Fetch news from RSS/GDELT/NewsData and cache in DB every 10 minutes
  const { syncNewsToDb } = await import("@/lib/news/sync");
  await syncNewsToDb();
});

registerJob("data-retention", 24 * 60 * 60_000, async () => {
  // Daily data hygiene: purge old analytics/alerts/timeline, archive expired knowledge
  const { runRetentionCleanup } = await import("@/lib/cleanup/retention");
  await runRetentionCleanup();
});

function getBaseUrl() {
  return process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
}

function internalHeaders(): HeadersInit {
  const secret = process.env.CRON_SECRET;
  if (secret) return { Authorization: `Bearer ${secret}` };
  return {};
}

/**
 * Fetch wrapper for internal scheduler calls.
 * Uses redirect: "manual" to prevent silent 307 -> /login -> 405 chains
 * when CRON_SECRET is missing or mismatched in the middleware.
 */
async function internalFetch(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, { ...init, redirect: "manual" });
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location") || "unknown";
    throw new Error(
      `Redirected to ${location} (${res.status}). Check that CRON_SECRET is set in environment variables.`
    );
  }
  return res;
}
