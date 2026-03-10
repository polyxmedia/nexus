// Background job scheduler for periodic intelligence tasks
// Uses simple interval-based scheduling (no cron dependency needed at runtime)

type JobFn = () => Promise<void>;

interface ScheduledJob {
  name: string;
  intervalMs: number;
  fn: JobFn;
  timer?: ReturnType<typeof setInterval>;
  lastRun?: Date;
  running: boolean;
  errors: number;
}

const jobs = new Map<string, ScheduledJob>();
let started = false;

export function registerJob(name: string, intervalMs: number, fn: JobFn) {
  jobs.set(name, { name, intervalMs, fn, running: false, errors: 0 });
}

async function runJob(job: ScheduledJob) {
  if (job.running) return;
  job.running = true;
  try {
    await job.fn();
    job.lastRun = new Date();
    job.errors = 0;
  } catch (err) {
    job.errors++;
    console.error(`[scheduler] Job "${job.name}" failed (${job.errors} consecutive):`, err);
  } finally {
    job.running = false;
  }
}

export function startScheduler() {
  if (started) return;
  started = true;
  console.log(`[scheduler] Starting ${jobs.size} jobs (AI ${aiEnabled() ? "ENABLED" : "DISABLED"})`);

  for (const job of jobs.values()) {
    // Run immediately on start
    runJob(job);
    // Then schedule at interval
    job.timer = setInterval(() => runJob(job), job.intervalMs);
  }
}

export function stopScheduler() {
  for (const job of jobs.values()) {
    if (job.timer) clearInterval(job.timer);
  }
  started = false;
}

export function getJobStatus() {
  return Array.from(jobs.values()).map((j) => ({
    name: j.name,
    intervalMs: j.intervalMs,
    lastRun: j.lastRun?.toISOString() || null,
    running: j.running,
    errors: j.errors,
  }));
}

// AI kill switch: set SCHEDULER_AI_ENABLED=false to disable all AI-consuming jobs
// This saves ~$1-2/day in API costs while keeping data collection running
function aiEnabled(): boolean {
  const val = process.env.SCHEDULER_AI_ENABLED;
  if (val === undefined || val === null) return true; // default: on
  return val === "true" || val === "1";
}

// ── Default Jobs ──

registerJob("portfolio-snapshot", 5 * 60_000, async () => {
  // Snapshot portfolio every 5 minutes during market hours
  const hour = new Date().getUTCHours();
  if (hour < 13 || hour > 21) return; // ~8am-4pm ET
  const res = await fetch(`${getBaseUrl()}/api/portfolio`, { headers: internalHeaders() });
  if (!res.ok) throw new Error(`Portfolio fetch failed: ${res.status}`);
});

registerJob("signal-refresh", 60 * 60_000, async () => {
  // Refresh signals hourly
  const res = await fetch(`${getBaseUrl()}/api/signals/generate`, { method: "POST", headers: internalHeaders() });
  if (!res.ok) throw new Error(`Signal generation failed: ${res.status}`);
});

registerJob("osint-entity-extraction", 15 * 60_000, async () => {
  // Extract OSINT entities every 15 minutes
  const res = await fetch(`${getBaseUrl()}/api/osint/extract`, { headers: internalHeaders() });
  if (!res.ok) throw new Error(`OSINT extraction failed: ${res.status}`);
});

registerJob("alert-check", 60_000, async () => {
  // Check alert conditions every minute
  const res = await fetch(`${getBaseUrl()}/api/alerts/check`, { method: "POST", headers: internalHeaders() });
  if (!res.ok && res.status !== 404) throw new Error(`Alert check failed: ${res.status}`);
});

registerJob("monitor-sweep", 5 * 60_000, async () => {
  if (!aiEnabled()) return; // AI kill switch (prediction resolution uses Claude)
  // Master monitoring sweep every 5 minutes: alerts + prediction resolution
  const res = await fetch(`${getBaseUrl()}/api/scheduler/monitor`, { method: "POST", headers: internalHeaders() });
  if (!res.ok) throw new Error(`Monitor sweep failed: ${res.status}`);
});

registerJob("intelligence-cycle", 15 * 60_000, async () => {
  if (!aiEnabled()) return; // AI kill switch
  // Three-brain intelligence cycle: Sentinel -> Analyst -> Executor
  const res = await fetch(`${getBaseUrl()}/api/agents/cycle`, { method: "POST", headers: internalHeaders() });
  if (!res.ok) throw new Error(`Intelligence cycle failed: ${res.status}`);
});

registerJob("prediction-fast-resolve", 30 * 60_000, async () => {
  // Fast data-driven resolution every 30 min (no AI, just market data)
  const res = await fetch(`${getBaseUrl()}/api/predictions/fast-resolve`, { method: "POST", headers: internalHeaders() });
  if (!res.ok) throw new Error(`Fast prediction resolve failed: ${res.status}`);
});

registerJob("prediction-daily", 6 * 60 * 60_000, async () => {
  if (!aiEnabled()) return; // AI kill switch
  // AI resolve complex predictions + generate new ones every 6 hours
  const res = await fetch(`${getBaseUrl()}/api/predictions/daily`, { method: "POST", headers: internalHeaders() });
  if (!res.ok) throw new Error(`Prediction daily cycle failed: ${res.status}`);
});

registerJob("knowledge-live-ingest", 30 * 60_000, async () => {
  // Refresh live knowledge base with real-time geopolitical intelligence every 30 minutes
  const res = await fetch(`${getBaseUrl()}/api/knowledge/refresh`, { method: "POST", headers: internalHeaders() });
  if (!res.ok) throw new Error(`Knowledge live ingest failed: ${res.status}`);
});

registerJob("iw-auto-detect", 15 * 60_000, async () => {
  // Auto-detect I&W indicators from OSINT feeds every 15 minutes
  const res = await fetch(`${getBaseUrl()}/api/iw/evaluate`, { method: "POST", headers: internalHeaders() });
  if (!res.ok) throw new Error(`I&W auto-detect failed: ${res.status}`);
});

registerJob("regime-detection", 60 * 60_000, async () => {
  // Evaluate market regime and correlations hourly
  const res = await fetch(`${getBaseUrl()}/api/regime`, { method: "POST", headers: internalHeaders() });
  if (!res.ok) throw new Error(`Regime detection failed: ${res.status}`);
});

registerJob("nowcast-update", 4 * 60 * 60_000, async () => {
  // Generate economic nowcast every 4 hours
  const res = await fetch(`${getBaseUrl()}/api/nowcast`, { method: "POST", headers: internalHeaders() });
  if (!res.ok) throw new Error(`Nowcast update failed: ${res.status}`);
});

registerJob("context-alert-scan", 15 * 60_000, async () => {
  // Context-aware alert scan: match news against positions, watchlist, theses, chat topics
  const res = await fetch(`${getBaseUrl()}/api/alerts/context-scan`, { method: "POST", headers: internalHeaders() });
  if (!res.ok) throw new Error(`Context alert scan failed: ${res.status}`);
});

registerJob("thesis-branch-generation", 6 * 60 * 60_000, async () => {
  // Pre-compute thesis branches for upcoming catalysts every 6 hours
  const res = await fetch(`${getBaseUrl()}/api/thesis/branches`, { method: "POST", headers: internalHeaders() });
  if (!res.ok) throw new Error(`Thesis branch generation failed: ${res.status}`);
});

registerJob("collection-gaps-check", 2 * 60 * 60_000, async () => {
  // Check intelligence collection gaps every 2 hours
  const res = await fetch(`${getBaseUrl()}/api/collection-gaps`, { headers: internalHeaders() });
  if (!res.ok) throw new Error(`Collection gaps check failed: ${res.status}`);
});

registerJob("systemic-risk-check", 2 * 60 * 60_000, async () => {
  // Compute systemic risk (absorption ratio + turbulence) every 2 hours during market hours
  const hour = new Date().getUTCHours();
  if (hour < 13 || hour > 21) return; // ~8am-4pm ET
  const res = await fetch(`${getBaseUrl()}/api/risk/systemic`, { method: "POST", headers: internalHeaders() });
  if (!res.ok) throw new Error(`Systemic risk check failed: ${res.status}`);
});

registerJob("actor-profile-update", 6 * 60 * 60_000, async () => {
  if (!aiEnabled()) return; // AI kill switch
  // Update actor profiles from GDELT/news every 6 hours
  const res = await fetch(`${getBaseUrl()}/api/actors/update`, { method: "POST", headers: internalHeaders() });
  if (!res.ok) throw new Error(`Actor profile update failed: ${res.status}`);
});

function getBaseUrl() {
  return process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
}

function internalHeaders(): HeadersInit {
  const secret = process.env.CRON_SECRET;
  if (secret) return { Authorization: `Bearer ${secret}` };
  return {};
}
