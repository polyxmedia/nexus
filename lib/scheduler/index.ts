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
  console.log(`[scheduler] Starting ${jobs.size} jobs`);

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

// ── Default Jobs ──

registerJob("portfolio-snapshot", 5 * 60_000, async () => {
  // Snapshot portfolio every 5 minutes during market hours
  const hour = new Date().getUTCHours();
  if (hour < 13 || hour > 21) return; // ~8am-4pm ET
  const res = await fetch(`${getBaseUrl()}/api/portfolio`);
  if (!res.ok) throw new Error(`Portfolio fetch failed: ${res.status}`);
});

registerJob("signal-refresh", 60 * 60_000, async () => {
  // Refresh signals hourly
  const res = await fetch(`${getBaseUrl()}/api/signals/generate`, { method: "POST" });
  if (!res.ok) throw new Error(`Signal generation failed: ${res.status}`);
});

registerJob("osint-entity-extraction", 15 * 60_000, async () => {
  // Extract OSINT entities every 15 minutes
  const res = await fetch(`${getBaseUrl()}/api/osint/extract`);
  if (!res.ok) throw new Error(`OSINT extraction failed: ${res.status}`);
});

registerJob("alert-check", 60_000, async () => {
  // Check alert conditions every minute
  const res = await fetch(`${getBaseUrl()}/api/alerts/check`, { method: "POST" });
  if (!res.ok && res.status !== 404) throw new Error(`Alert check failed: ${res.status}`);
});

registerJob("prediction-daily", 6 * 60 * 60_000, async () => {
  // Run prediction lifecycle every 6 hours: resolve overdue, then generate new
  const res = await fetch(`${getBaseUrl()}/api/predictions/daily`, { method: "POST" });
  if (!res.ok) throw new Error(`Prediction daily cycle failed: ${res.status}`);
});

function getBaseUrl() {
  return process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
}
