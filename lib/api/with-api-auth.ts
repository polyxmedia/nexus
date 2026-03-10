// Higher-order function that wraps API v1 route handlers.
// Handles: Bearer token extraction -> key hash lookup -> user resolution ->
// tier enforcement -> scope check -> rate limiting -> handler invocation.
//
// Usage:
//   export const GET = withApiAuth(async (req, ctx) => {
//     return apiSuccess(data, { tier: ctx.tier });
//   }, { minTier: "analyst", scope: "signals" });

import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and, isNull } from "drizzle-orm";
import { hashApiKey, isValidKeyFormat } from "./keys";
import { apiError } from "./response";
import { rateLimit } from "@/lib/rate-limit";
import { createHash } from "crypto";
import type { TierLimits } from "@/lib/auth/require-tier";

// ── Tier hierarchy ──

const TIER_LEVELS: Record<string, number> = {
  free: 0,
  analyst: 1,
  operator: 2,
  institution: 3,
};

const ADMIN_LIMITS: TierLimits = {
  chatMessages: -1,
  monthlyCredits: -1,
  warRoomAccess: "full",
  tradingIntegration: true,
  apiAccess: true,
  customSignalLayers: true,
};

const DEFAULT_LIMITS: TierLimits = {
  chatMessages: 10,
  monthlyCredits: 0,
  warRoomAccess: "none",
  tradingIntegration: false,
  apiAccess: false,
  customSignalLayers: false,
};

// ── Rate limit tiers (per-minute / per-hour / per-day) ──

const API_RATE_LIMITS: Record<string, { perMinute: number; perHour: number; perDay: number }> = {
  analyst:     { perMinute: 30,  perHour: 500,   perDay: 5_000 },
  operator:    { perMinute: 120, perHour: 2_000,  perDay: 20_000 },
  institution: { perMinute: 600, perHour: 10_000, perDay: 100_000 },
};

// ── Types ──

export interface ApiAuthContext {
  username: string;
  tier: string;
  tierLevel: number;
  limits: TierLimits;
  keyId: number;
}

interface WithApiAuthOptions {
  minTier?: "analyst" | "operator" | "institution";
  scope?: string;
}

type ApiHandler = (
  request: NextRequest,
  ctx: ApiAuthContext,
) => Promise<NextResponse>;

// ── Key fingerprint for audit logging ──

function fingerprint(raw: string): string {
  return createHash("sha256").update(raw).digest("hex").slice(0, 12);
}

// ── Resolve user tier from username (shared logic with requireTier) ──

async function resolveUserTier(username: string): Promise<{
  tier: string;
  tierLevel: number;
  limits: TierLimits;
  isAdmin: boolean;
  blocked: boolean;
} | null> {
  const rows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, `user:${username}`));

  if (rows.length === 0) return null;

  let userData: Record<string, unknown>;
  try {
    userData = JSON.parse(rows[0].value);
  } catch {
    return null;
  }

  if (userData.blocked) {
    return { tier: "free", tierLevel: 0, limits: DEFAULT_LIMITS, isAdmin: false, blocked: true };
  }

  const isAdmin = userData.role === "admin";
  const userTier = (userData.tier as string) || "free";

  if (isAdmin) {
    return {
      tier: userTier || "institution",
      tierLevel: 3,
      limits: ADMIN_LIMITS,
      isAdmin: true,
      blocked: false,
    };
  }

  const tierLevel = TIER_LEVELS[userTier] ?? 0;
  let limits: TierLimits = DEFAULT_LIMITS;

  if (tierLevel > 0) {
    const subs = await db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.userId, username));

    if (subs.length > 0 && subs[0].status === "active") {
      // Check comped subscription expiry
      const isComped = !subs[0].stripeSubscriptionId || subs[0].stripeSubscriptionId?.startsWith("comped_");
      if (isComped && subs[0].currentPeriodEnd) {
        const expiry = new Date(subs[0].currentPeriodEnd);
        if (expiry < new Date()) {
          return { tier: "free", tierLevel: 0, limits: DEFAULT_LIMITS, isAdmin: false, blocked: false };
        }
      }

      const tiers = await db
        .select()
        .from(schema.subscriptionTiers)
        .where(eq(schema.subscriptionTiers.id, subs[0].tierId));

      if (tiers.length > 0 && tiers[0].limits) {
        try {
          limits = JSON.parse(tiers[0].limits) as TierLimits;
        } catch { /* use defaults */ }
      }
    } else {
      // No active subscription
      return { tier: "free", tierLevel: 0, limits: DEFAULT_LIMITS, isAdmin: false, blocked: false };
    }
  }

  return { tier: userTier, tierLevel, limits, isAdmin, blocked: false };
}

// ── Multi-window rate limit check ──

async function checkRateLimit(keyId: number, tier: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: number;
  window: string;
}> {
  const limits = API_RATE_LIMITS[tier] || API_RATE_LIMITS.analyst;

  const windows = [
    { key: `apiv1:${keyId}:min`,  limit: limits.perMinute, ms: 60_000,     label: "per-minute" },
    { key: `apiv1:${keyId}:hour`, limit: limits.perHour,   ms: 3_600_000,  label: "per-hour" },
    { key: `apiv1:${keyId}:day`,  limit: limits.perDay,    ms: 86_400_000, label: "per-day" },
  ];

  let tightestRemaining = Infinity;
  let tightestResetAt = 0;

  for (const w of windows) {
    const result = await rateLimit(w.key, w.limit, w.ms);
    if (!result.allowed) {
      return { allowed: false, remaining: 0, resetAt: result.resetAt, window: w.label };
    }
    if (result.remaining < tightestRemaining) {
      tightestRemaining = result.remaining;
      tightestResetAt = result.resetAt;
    }
  }

  return { allowed: true, remaining: tightestRemaining, resetAt: tightestResetAt, window: "per-minute" };
}

// ── The HOF ──

export function withApiAuth(handler: ApiHandler, options?: WithApiAuthOptions) {
  const minTier = options?.minTier ?? "analyst";
  const requiredLevel = TIER_LEVELS[minTier] ?? 1;
  const scope = options?.scope;

  return async (request: NextRequest): Promise<NextResponse> => {
    // 1. Extract Bearer token
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return apiError(
        "missing_api_key",
        "Authorization header required. Use: Authorization: Bearer sk-nxs-...",
        401,
      );
    }

    const rawKey = authHeader.slice(7).trim();
    if (!isValidKeyFormat(rawKey)) {
      return apiError("invalid_api_key", "Malformed API key", 401);
    }

    // 2. Hash and look up
    const keyHash = hashApiKey(rawKey);
    const keys = await db
      .select()
      .from(schema.apiKeys)
      .where(and(eq(schema.apiKeys.keyHash, keyHash), isNull(schema.apiKeys.revokedAt)));

    if (keys.length === 0) {
      return apiError("invalid_api_key", "Invalid or revoked API key", 401);
    }

    const apiKey = keys[0];

    // 3. Check scope
    if (scope && apiKey.scopes) {
      try {
        const allowed: string[] = JSON.parse(apiKey.scopes);
        if (!allowed.includes(scope)) {
          return apiError(
            "insufficient_scope",
            `This API key does not have the "${scope}" scope`,
            403,
            { requiredScope: scope, keyScopes: allowed },
          );
        }
      } catch {
        // Invalid JSON in scopes - deny access as a safe default
        return apiError("invalid_scopes", "API key has malformed scope configuration", 403);
      }
    }

    // 4. Resolve user
    const user = await resolveUserTier(apiKey.userId);
    if (!user) {
      return apiError("user_not_found", "API key owner account not found", 401);
    }
    if (user.blocked) {
      return apiError("account_blocked", "Account has been suspended", 403);
    }

    // 5. Check apiAccess flag
    if (!user.limits.apiAccess && !user.isAdmin) {
      return apiError(
        "api_access_disabled",
        "API access is not included in your subscription tier",
        403,
        { currentTier: user.tier, upgrade: true },
      );
    }

    // 6. Check tier
    if (user.tierLevel < requiredLevel) {
      return apiError(
        "insufficient_tier",
        `This endpoint requires a ${minTier} subscription or higher`,
        403,
        { requiredTier: minTier, currentTier: user.tier, upgrade: true },
      );
    }

    // 7. Rate limiting
    const rl = await checkRateLimit(apiKey.id, user.tier);
    if (!rl.allowed) {
      const res = apiError(
        "rate_limited",
        `Rate limit exceeded (${rl.window}). Try again later.`,
        429,
        { retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
      );
      res.headers.set("Retry-After", String(Math.ceil((rl.resetAt - Date.now()) / 1000)));
      res.headers.set("X-RateLimit-Remaining", "0");
      res.headers.set("X-RateLimit-Reset", String(Math.floor(rl.resetAt / 1000)));
      return res;
    }

    // 8. Fire-and-forget: update last_used_at
    db.update(schema.apiKeys)
      .set({ lastUsedAt: new Date().toISOString() })
      .where(eq(schema.apiKeys.id, apiKey.id))
      .then(() => {})
      .catch((err) => console.error("[ApiAuth] update last_used_at failed:", err));

    // 9. Build context and call handler
    const ctx: ApiAuthContext = {
      username: apiKey.userId,
      tier: user.tier,
      tierLevel: user.tierLevel,
      limits: user.limits,
      keyId: apiKey.id,
    };

    try {
      const response = await handler(request, ctx);

      // Inject rate limit headers into successful responses
      response.headers.set("X-RateLimit-Remaining", String(rl.remaining));
      response.headers.set("X-RateLimit-Reset", String(Math.floor(rl.resetAt / 1000)));

      return response;
    } catch (err) {
      console.error(`[API v1] Handler error (key: ${fingerprint(rawKey)}):`, err);
      return apiError("internal_error", "An internal error occurred", 500);
    }
  };
}
