import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getEffectiveUsername } from "./effective-user";
import { db, schema } from "../db";
import { eq } from "drizzle-orm";

// ── In-memory tier cache (60s TTL, no external deps) ──
const TIER_CACHE_TTL = 60_000; // 60 seconds
const tierCache = new Map<string, { tier: string; isAdmin: boolean; expires: number }>();

function getCachedTier(username: string) {
  const entry = tierCache.get(username);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    tierCache.delete(username);
    return null;
  }
  return entry;
}

function setCachedTier(username: string, tier: string, isAdmin: boolean) {
  // Prune expired entries on write (keeps map from growing unbounded)
  const now = Date.now();
  tierCache.forEach((val, key) => {
    if (now > val.expires) tierCache.delete(key);
  });
  tierCache.set(username, { tier, isAdmin, expires: now + TIER_CACHE_TTL });
}

/** Invalidate cache for a specific user (call after subscription changes). */
export function invalidateTierCache(username: string) {
  tierCache.delete(username);
}

// Tier hierarchy: free < analyst < operator < institution
const TIER_LEVELS: Record<string, number> = {
  free: 0,
  analyst: 1,
  operator: 2,
  institution: 3,
};

export interface TierLimits {
  chatMessages: number; // -1 = unlimited
  monthlyCredits: number; // -1 = unlimited, 0 = none
  warRoomAccess: "none" | "view" | "full";
  tradingIntegration: boolean;
  apiAccess: boolean;
  customSignalLayers: boolean;
}

const DEFAULT_LIMITS: TierLimits = {
  chatMessages: 0,
  monthlyCredits: 0,
  warRoomAccess: "view",
  tradingIntegration: false,
  apiAccess: false,
  customSignalLayers: false,
};

export interface TierCheckResult {
  authorized: boolean;
  tier: string;
  tierLevel: number;
  limits: TierLimits;
  username: string;
}

/**
 * Check if the current user meets the minimum tier requirement.
 * Returns null + sends 403 response if not authorized.
 * Returns TierCheckResult if authorized.
 */
export async function requireTier(
  minTier: "free" | "analyst" | "operator" | "institution"
): Promise<{ result: TierCheckResult } | { response: NextResponse }> {
  // Allow internal scheduler calls via CRON_SECRET bearer token
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const headerStore = await headers();
    const authHeader = headerStore.get("authorization");
    if (authHeader === `Bearer ${cronSecret}`) {
      return {
        result: {
          authorized: true,
          tier: "institution",
          tierLevel: 3,
          limits: {
            chatMessages: -1,
            monthlyCredits: -1,
            warRoomAccess: "full",
            tradingIntegration: true,
            apiAccess: true,
            customSignalLayers: true,
          },
          username: "__scheduler__",
        },
      };
    }
  }

  const username = await getEffectiveUsername();
  if (!username) {
    return {
      response: NextResponse.json(
        { error: "Unauthorized", upgrade: true },
        { status: 401 }
      ),
    };
  }

  // Check in-memory cache first
  let userTier = "free";
  let isAdmin = false;
  let userSettings: { key: string; value: string }[] = [];

  const cached = getCachedTier(username);
  if (cached) {
    userTier = cached.tier;
    isAdmin = cached.isAdmin;
  } else {
    // Cache miss: hit DB
    userSettings = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, `user:${username}`));

    if (userSettings.length > 0) {
      try {
        const data = JSON.parse(userSettings[0].value);
        userTier = data.tier || "free";
        isAdmin = data.role === "admin";
      } catch {
        // bad JSON, treat as free
      }
    }
    setCachedTier(username, userTier, isAdmin);
  }

  // Admin bypasses all tier checks
  if (isAdmin) {
    return {
      result: {
        authorized: true,
        tier: userTier || "institution",
        tierLevel: 3,
        limits: {
          chatMessages: -1,
          monthlyCredits: -1,
          warRoomAccess: "full",
          tradingIntegration: true,
          apiAccess: true,
          customSignalLayers: true,
        },
        username,
      },
    };
  }

  const requiredLevel = TIER_LEVELS[minTier] ?? 1;

  // Check subscription from DB (authoritative source of tier)
  let limits: TierLimits = DEFAULT_LIMITS;
  const subs = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.userId, username));

  // Honor access for canceled subscriptions that still have time remaining on their period
  const isCanceledButPaid = subs.length > 0
    && subs[0].status === "canceled"
    && subs[0].currentPeriodEnd
    && new Date(subs[0].currentPeriodEnd) > new Date();

  if (subs.length > 0 && (subs[0].status === "active" || subs[0].status === "trialing" || isCanceledButPaid)) {
    // Check if comped subscription has expired
    const isComped = !subs[0].stripeSubscriptionId || subs[0].stripeSubscriptionId?.startsWith("comped_");
    if (isComped && subs[0].currentPeriodEnd) {
      const expiry = new Date(subs[0].currentPeriodEnd);
      if (expiry < new Date()) {
        // Auto-expire: mark as canceled and downgrade tier
        await db
          .update(schema.subscriptions)
          .set({ status: "canceled", updatedAt: new Date().toISOString() })
          .where(eq(schema.subscriptions.userId, username));

        // Re-fetch settings if needed (cache path may not have them)
        const freshSettings = userSettings.length > 0
          ? userSettings
          : await db.select().from(schema.settings).where(eq(schema.settings.key, `user:${username}`));
        const userData = freshSettings.length > 0 ? JSON.parse(freshSettings[0].value) : {};
        userData.tier = "free";
        delete userData.compedGrant;
        await db
          .update(schema.settings)
          .set({ value: JSON.stringify(userData) })
          .where(eq(schema.settings.key, `user:${username}`));

        // Invalidate cache after downgrade
        invalidateTierCache(username);

        return {
          response: NextResponse.json(
            {
              error: `Your comped access has expired. Subscribe to continue using ${minTier} features.`,
              requiredTier: minTier,
              currentTier: "free",
              upgrade: true,
            },
            { status: 403 }
          ),
        };
      }
    }

    // Derive tier from the subscription's tier record (authoritative)
    const tiers = await db
      .select()
      .from(schema.subscriptionTiers)
      .where(eq(schema.subscriptionTiers.id, subs[0].tierId));

    if (tiers.length > 0) {
      const subTierName = tiers[0].name?.toLowerCase() || "free";
      // Subscription tier takes precedence over settings JSON
      if ((TIER_LEVELS[subTierName] ?? 0) > (TIER_LEVELS[userTier] ?? 0)) {
        userTier = subTierName;
      }
      if (tiers[0].limits) {
        try {
          limits = JSON.parse(tiers[0].limits) as TierLimits;
        } catch {
          // bad JSON
        }
      }
    }
  }

  const userLevel = TIER_LEVELS[userTier] ?? 0;

  if (userLevel < requiredLevel) {
    return {
      response: NextResponse.json(
        {
          error: `This feature requires a ${minTier} subscription or higher`,
          requiredTier: minTier,
          currentTier: userTier,
          upgrade: true,
        },
        { status: 403 }
      ),
    };
  }

  return {
    result: {
      authorized: true,
      tier: userTier,
      tierLevel: userLevel,
      limits,
      username,
    },
  };
}

/**
 * Quick check: get user's tier without enforcing.
 * Useful for soft-gating (show upgrade prompt but don't block).
 */
export async function getUserTier(): Promise<{
  tier: string;
  tierLevel: number;
  limits: TierLimits;
  isAdmin: boolean;
  username: string | null;
}> {
  const username = await getEffectiveUsername();
  if (!username) {
    return { tier: "free", tierLevel: 0, limits: DEFAULT_LIMITS, isAdmin: false, username: null };
  }

  // Check in-memory cache first
  let userTier = "free";
  let isAdmin = false;

  const cached = getCachedTier(username);
  if (cached) {
    userTier = cached.tier;
    isAdmin = cached.isAdmin;
  } else {
    const userSettings = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, `user:${username}`));

    if (userSettings.length > 0) {
      try {
        const data = JSON.parse(userSettings[0].value);
        userTier = data.tier || "free";
        isAdmin = data.role === "admin";
      } catch {
        // treat as free
      }
    }
    setCachedTier(username, userTier, isAdmin);
  }

  if (isAdmin) {
    return {
      tier: userTier || "institution",
      tierLevel: 3,
      limits: {
        chatMessages: -1,
        monthlyCredits: -1,
        warRoomAccess: "full",
        tradingIntegration: true,
        apiAccess: true,
        customSignalLayers: true,
      },
      isAdmin: true,
      username,
    };
  }

  let limits: TierLimits = DEFAULT_LIMITS;
  const subs = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.userId, username));

  if (subs.length > 0 && (subs[0].status === "active" || subs[0].status === "trialing")) {
    const tiers = await db
      .select()
      .from(schema.subscriptionTiers)
      .where(eq(schema.subscriptionTiers.id, subs[0].tierId));

    if (tiers.length > 0) {
      const subTierName = tiers[0].name?.toLowerCase() || "free";
      if ((TIER_LEVELS[subTierName] ?? 0) > (TIER_LEVELS[userTier] ?? 0)) {
        userTier = subTierName;
      }
      if (tiers[0].limits) {
        try {
          limits = JSON.parse(tiers[0].limits) as TierLimits;
        } catch {
          // bad JSON
        }
      }
    }
  }

  return {
    tier: userTier,
    tierLevel: TIER_LEVELS[userTier] ?? 0,
    limits,
    isAdmin,
    username,
  };
}
