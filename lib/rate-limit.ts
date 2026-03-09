// In-memory rate limiter — works for single-server deployments.
// IMPORTANT: For multi-server (Vercel serverless), swap the Map for Redis.
// Rate limits reset on cold start and are not shared across instances.

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const MAX_STORE_SIZE = 50_000;
const store = new Map<string, RateLimitEntry>();

// Lazy cleanup — runs after first rateLimit() call
let cleanupScheduled = false;
function scheduleCleanup() {
  if (cleanupScheduled || typeof setInterval === "undefined") return;
  cleanupScheduled = true;
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

function evictIfNeeded() {
  if (store.size <= MAX_STORE_SIZE) return;
  const now = Date.now();
  // First pass: remove expired entries
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key);
  }
  // If still over limit, remove oldest entries
  if (store.size > MAX_STORE_SIZE) {
    const entries = [...store.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
    const toRemove = Math.ceil(entries.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      store.delete(entries[i][0]);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check and increment a rate limit bucket.
 * @param key      Unique key (e.g. "register:127.0.0.1")
 * @param limit    Max requests allowed in the window
 * @param windowMs Window duration in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  scheduleCleanup();
  evictIfNeeded();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  entry.count++;
  const allowed = entry.count <= limit;
  return { allowed, remaining: Math.max(0, limit - entry.count), resetAt: entry.resetAt };
}

/** Extract a safe IP identifier from a Next.js request */
export function getClientIp(request: Request): string {
  const headers = (request as { headers: { get(k: string): string | null } }).headers;
  return (
    headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
