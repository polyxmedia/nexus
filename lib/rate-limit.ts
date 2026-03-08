// In-memory rate limiter — works for single-server deployments.
// For multi-server, swap the Map for Redis.

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes to prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

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
