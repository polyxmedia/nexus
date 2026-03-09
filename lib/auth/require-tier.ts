import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { authOptions } from "./auth";
import { db, schema } from "../db";
import { eq } from "drizzle-orm";

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
  chatMessages: 10,
  monthlyCredits: 0,
  warRoomAccess: "none",
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
  minTier: "analyst" | "operator" | "institution"
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

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return {
      response: NextResponse.json(
        { error: "Unauthorized", upgrade: true },
        { status: 401 }
      ),
    };
  }

  const username = session.user.name;

  // Admin always has full access
  const userSettings = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, `user:${username}`));

  let userTier = "free";
  let isAdmin = false;

  if (userSettings.length > 0) {
    try {
      const data = JSON.parse(userSettings[0].value);
      userTier = data.tier || "free";
      isAdmin = data.role === "admin";
    } catch {
      // bad JSON, treat as free
    }
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

  const userLevel = TIER_LEVELS[userTier] ?? 0;
  const requiredLevel = TIER_LEVELS[minTier] ?? 1;

  // Get tier limits from DB
  let limits: TierLimits = DEFAULT_LIMITS;
  if (userLevel > 0) {
    const subs = await db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.userId, username));

    if (subs.length > 0 && subs[0].status === "active") {
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

          const userData = userSettings.length > 0 ? JSON.parse(userSettings[0].value) : {};
          userData.tier = "free";
          delete userData.compedGrant;
          await db
            .update(schema.settings)
            .set({ value: JSON.stringify(userData) })
            .where(eq(schema.settings.key, `user:${username}`));

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

      const tiers = await db
        .select()
        .from(schema.subscriptionTiers)
        .where(eq(schema.subscriptionTiers.id, subs[0].tierId));

      if (tiers.length > 0 && tiers[0].limits) {
        try {
          limits = JSON.parse(tiers[0].limits) as TierLimits;
        } catch {
          // bad JSON
        }
      }
    } else {
      // No active subscription, treat as free
      return {
        response: NextResponse.json(
          {
            error: `This feature requires a ${minTier} subscription or higher`,
            requiredTier: minTier,
            currentTier: "free",
            upgrade: true,
          },
          { status: 403 }
        ),
      };
    }
  }

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
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return { tier: "free", tierLevel: 0, limits: DEFAULT_LIMITS, isAdmin: false, username: null };
  }

  const username = session.user.name;
  const userSettings = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, `user:${username}`));

  let userTier = "free";
  let isAdmin = false;

  if (userSettings.length > 0) {
    try {
      const data = JSON.parse(userSettings[0].value);
      userTier = data.tier || "free";
      isAdmin = data.role === "admin";
    } catch {
      // treat as free
    }
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

  if (subs.length > 0 && subs[0].status === "active") {
    const tiers = await db
      .select()
      .from(schema.subscriptionTiers)
      .where(eq(schema.subscriptionTiers.id, subs[0].tierId));

    if (tiers.length > 0 && tiers[0].limits) {
      try {
        limits = JSON.parse(tiers[0].limits) as TierLimits;
      } catch {
        // bad JSON
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
