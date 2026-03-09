/**
 * Credit system for AI usage metering.
 *
 * 1 credit = $0.001 (a tenth of a cent).
 * Credits are granted monthly per tier and debited per API call.
 * Tracks input/output tokens for transparency.
 *
 * Monthly grants are defined in the subscription_tiers.limits JSON
 * (monthlyCredits field), configurable via admin panel.
 * Fallback defaults are used if the DB value is missing.
 */

import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

// ── Cost rates: credits per 1K tokens ──
// Reflects actual Anthropic pricing ratios
const MODEL_RATES: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5-20251001": { input: 1, output: 4 },
  "claude-sonnet-4-20250514": { input: 3, output: 15 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-opus-4-6": { input: 15, output: 75 },
};

// ── Fallback monthly credit grants (used when tier limits not in DB) ──
export const TIER_CREDITS: Record<string, number> = {
  free: 0,
  analyst: 50_000,
  operator: 250_000,
  institution: -1, // unlimited
};

/**
 * Resolve the monthly credit grant for a user by checking their subscription tier's
 * limits.monthlyCredits in the DB. Falls back to TIER_CREDITS if not found.
 */
async function resolveMonthlyGrant(userId: string, tierName: string): Promise<number> {
  try {
    const subs = await db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.userId, userId));

    if (subs.length > 0 && subs[0].status === "active") {
      const tiers = await db
        .select()
        .from(schema.subscriptionTiers)
        .where(eq(schema.subscriptionTiers.id, subs[0].tierId));

      if (tiers.length > 0 && tiers[0].limits) {
        const limits = JSON.parse(tiers[0].limits);
        if (typeof limits.monthlyCredits === "number") {
          return limits.monthlyCredits;
        }
      }
    }
  } catch {
    // Fall through to default
  }
  return TIER_CREDITS[tierName.toLowerCase()] ?? 0;
}

export interface CreditBalance {
  period: string;
  creditsGranted: number;
  creditsUsed: number;
  creditsRemaining: number;
  unlimited: boolean;
}

function currentPeriod(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Calculate credit cost for an API call.
 */
export function calculateCredits(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const rates = MODEL_RATES[model] || MODEL_RATES["claude-sonnet-4-20250514"];
  return Math.ceil(inputTokens / 1000) * rates.input + Math.ceil(outputTokens / 1000) * rates.output;
}

/**
 * Get the current credit balance for a user.
 * Handles monthly rollover: if the stored period doesn't match the current month,
 * resets usage and grants fresh credits.
 */
export async function getBalance(
  userId: string,
  tierName?: string
): Promise<CreditBalance> {
  const period = currentPeriod();
  const tier = (tierName || "free").toLowerCase();
  const grant = await resolveMonthlyGrant(userId, tier);
  const unlimited = grant === -1;

  const rows = await db
    .select()
    .from(schema.creditBalances)
    .where(eq(schema.creditBalances.userId, userId));

  if (rows.length === 0) {
    // First time: create balance row
    await db.insert(schema.creditBalances).values({
      userId,
      period,
      creditsGranted: unlimited ? 0 : grant,
      creditsUsed: 0,
    });
    return { period, creditsGranted: grant, creditsUsed: 0, creditsRemaining: unlimited ? Infinity : grant, unlimited };
  }

  const bal = rows[0];

  // Monthly rollover
  if (bal.period !== period) {
    await db
      .update(schema.creditBalances)
      .set({ period, creditsGranted: unlimited ? 0 : grant, creditsUsed: 0, updatedAt: new Date().toISOString() })
      .where(eq(schema.creditBalances.userId, userId));
    return { period, creditsGranted: grant, creditsUsed: 0, creditsRemaining: unlimited ? Infinity : grant, unlimited };
  }

  // Update grant if tier changed mid-month (keep used, update granted)
  if (!unlimited && bal.creditsGranted !== grant) {
    await db
      .update(schema.creditBalances)
      .set({ creditsGranted: grant, updatedAt: new Date().toISOString() })
      .where(eq(schema.creditBalances.userId, userId));
  }

  const used = bal.creditsUsed;
  const granted = unlimited ? 0 : Math.max(grant, bal.creditsGranted);
  return {
    period,
    creditsGranted: granted,
    creditsUsed: used,
    creditsRemaining: unlimited ? Infinity : Math.max(0, granted - used),
    unlimited,
  };
}

/**
 * Check if user has enough credits. Returns true if allowed.
 */
export async function hasCredits(
  userId: string,
  tierName?: string,
  isAdmin?: boolean
): Promise<{ allowed: boolean; balance: CreditBalance }> {
  if (isAdmin) {
    return { allowed: true, balance: { period: currentPeriod(), creditsGranted: 0, creditsUsed: 0, creditsRemaining: Infinity, unlimited: true } };
  }
  const balance = await getBalance(userId, tierName);
  return { allowed: balance.unlimited || balance.creditsRemaining > 0, balance };
}

/**
 * Debit credits for an API call. Records in ledger and updates balance.
 */
export async function debitCredits(
  userId: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  reason: string = "chat_request",
  sessionId?: string
): Promise<{ creditsUsed: number; balance: CreditBalance }> {
  const period = currentPeriod();
  const cost = calculateCredits(model, inputTokens, outputTokens);
  if (cost === 0) return { creditsUsed: 0, balance: await getBalance(userId) };

  // Update balance
  const rows = await db
    .select()
    .from(schema.creditBalances)
    .where(eq(schema.creditBalances.userId, userId));

  let newUsed: number;
  if (rows.length === 0) {
    newUsed = cost;
    await db.insert(schema.creditBalances).values({
      userId,
      period,
      creditsGranted: 0,
      creditsUsed: cost,
    });
  } else {
    newUsed = rows[0].creditsUsed + cost;
    await db
      .update(schema.creditBalances)
      .set({ creditsUsed: newUsed, updatedAt: new Date().toISOString() })
      .where(eq(schema.creditBalances.userId, userId));
  }

  // Record in ledger
  await db.insert(schema.creditLedger).values({
    userId,
    amount: -cost,
    balanceAfter: rows.length > 0 ? Math.max(0, rows[0].creditsGranted - newUsed) : -cost,
    reason,
    model,
    inputTokens,
    outputTokens,
    sessionId: sessionId || null,
    period,
  });

  const balance = await getBalance(userId);
  return { creditsUsed: cost, balance };
}
