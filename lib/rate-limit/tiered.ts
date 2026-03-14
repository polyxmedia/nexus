import "server-only";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { rateLimit, type RateLimitResult } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { getUserTier } from "@/lib/auth/require-tier";

// In-memory cache for rate limit configs (60s TTL)
const configCache = new Map<string, { configs: Map<string, { limit: number; windowMs: number }>; expires: number }>();
const CONFIG_CACHE_TTL = 60_000;

async function getConfigsForTier(tier: string): Promise<Map<string, { limit: number; windowMs: number }>> {
  const cached = configCache.get(tier);
  if (cached && cached.expires > Date.now()) return cached.configs;

  const rows = await db.select().from(schema.rateLimitConfig)
    .where(eq(schema.rateLimitConfig.tier, tier));

  const configs = new Map<string, { limit: number; windowMs: number }>();
  for (const row of rows) {
    configs.set(row.routePattern, {
      limit: row.requestsPerWindow,
      windowMs: row.windowMs,
    });
  }

  configCache.set(tier, { configs, expires: Date.now() + CONFIG_CACHE_TTL });
  return configs;
}

function matchRoute(routeKey: string, pattern: string): boolean {
  if (pattern === "*") return true;
  if (pattern.endsWith("/*")) {
    return routeKey.startsWith(pattern.slice(0, -2));
  }
  return routeKey === pattern;
}

/**
 * Check tier-specific rate limit for a user and route.
 */
export async function tieredRateLimit(
  username: string,
  tier: string,
  routeKey: string,
): Promise<RateLimitResult> {
  const configs = await getConfigsForTier(tier);

  // Find most specific matching config
  let limit = 60; // default
  let windowMs = 60000;
  let matched = false;

  // Check specific route first, then wildcard patterns, then default
  for (const [pattern, config] of configs) {
    if (matchRoute(routeKey, pattern) && pattern !== "*") {
      limit = config.limit;
      windowMs = config.windowMs;
      matched = true;
      break;
    }
  }

  if (!matched) {
    const defaultConfig = configs.get("*");
    if (defaultConfig) {
      limit = defaultConfig.limit;
      windowMs = defaultConfig.windowMs;
    }
  }

  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, remaining: 999999, resetAt: Date.now() + windowMs };
  }

  // 0 means blocked
  if (limit === 0) {
    return { allowed: false, remaining: 0, resetAt: Date.now() + windowMs };
  }

  return rateLimit(`tier:${tier}:${username}:${routeKey}`, limit, windowMs);
}

/**
 * Get standard rate limit response headers.
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": new Date(result.resetAt).toISOString(),
  };
}

/**
 * Higher-order function to wrap route handlers with tier-based rate limiting.
 */
export function withTierRateLimit(routeKey: string) {
  return async function checkLimit(): Promise<NextResponse | null> {
    const { tier, username } = await getUserTier();
    if (!username) return null; // No user = no rate limit (auth will handle it)

    const result = await tieredRateLimit(username, tier, routeKey);

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
          tier,
          limit: routeKey,
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
            ...getRateLimitHeaders(result),
          },
        },
      );
    }

    return null; // Allowed
  };
}
