// Rate limiter with Upstash Redis for production (Vercel serverless) and
// in-memory fallback for local development.
//
// When UPSTASH_REDIS_REST_URL is set, limits are shared across all serverless
// instances via Redis. Without it, falls back to a per-process Map.

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

// ── Upstash Redis (production) ──

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// Cache of Ratelimit instances keyed by "limit:windowMs"
const limiters = new Map<string, Ratelimit>();

function getUpstashLimiter(limit: number, windowMs: number): Ratelimit {
  const cacheKey = `${limit}:${windowMs}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      prefix: "rl",
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

// ── In-memory fallback (local dev) ──

interface MemEntry {
  count: number;
  resetAt: number;
}

const MAX_STORE_SIZE = 50_000;
const store = new Map<string, MemEntry>();

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
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key);
  }
  if (store.size > MAX_STORE_SIZE) {
    const entries = [...store.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
    const toRemove = Math.ceil(entries.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      store.delete(entries[i][0]);
    }
  }
}

function memoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
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

// ── Public API ──

/**
 * Check and increment a rate limit bucket.
 * Uses Upstash Redis in production, in-memory fallback for local dev.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  if (redis) {
    try {
      const limiter = getUpstashLimiter(limit, windowMs);
      const result = await limiter.limit(key);
      return {
        allowed: result.success,
        remaining: result.remaining,
        resetAt: result.reset,
      };
    } catch {
      // Redis unavailable — fall back to in-memory
      return memoryRateLimit(key, limit, windowMs);
    }
  }
  return memoryRateLimit(key, limit, windowMs);
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
