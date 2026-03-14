import { NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { evaluateRules } from "@/lib/execution/engine";
import { headers } from "next/headers";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST() {
  // Allow CRON_SECRET for scheduled evaluation of all users
  const headerStore = await headers();
  const authHeader = headerStore.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    // Evaluate all users with enabled rules
    const allRules = await db.select().from(schema.executionRules).where(eq(schema.executionRules.enabled, 1));
    const userIds = Array.from(new Set(allRules.map(r => r.userId))) as string[];

    const results: Record<string, unknown> = {};
    for (const userId of userIds) {
      results[userId] = await evaluateRules(userId);
    }
    return NextResponse.json({ evaluatedUsers: userIds.length, results });
  }

  // Otherwise require operator tier
  const check = await requireTier("operator");
  if ("response" in check) return check.response;

  const results = await evaluateRules(check.result.username);
  return NextResponse.json({ results });
}
