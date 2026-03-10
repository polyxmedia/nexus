/**
 * Credit gate: reusable middleware for AI endpoints that consume tokens.
 * Checks auth, resolves tier, verifies credits, and provides a debit callback.
 *
 * Usage:
 *   const gate = await creditGate();
 *   if (gate.response) return gate.response; // 401 or 429
 *   // ... do AI work ...
 *   await gate.debit(model, inputTokens, outputTokens, reason);
 */

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { hasCredits, debitCredits } from "@/lib/credits";

export interface CreditGateResult {
  response?: NextResponse;
  username: string;
  tier: string;
  isAdmin: boolean;
  debit: (model: string, inputTokens: number, outputTokens: number, reason?: string) => Promise<void>;
}

export async function creditGate(): Promise<CreditGateResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      username: "",
      tier: "free",
      isAdmin: false,
      debit: async () => {},
    };
  }

  const username = session.user.name;

  // Resolve tier
  let tier = "free";
  let isAdmin = false;
  try {
    const rows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, `user:${username}`));
    if (rows.length > 0) {
      const data = JSON.parse(rows[0].value);
      tier = data.tier || "free";
      isAdmin = data.role === "admin";
    }
  } catch {
    // treat as free
  }

  // Admins and institution tier bypass credit checks
  const effectiveTier = isAdmin ? "institution" : tier;

  // Check credits
  const check = await hasCredits(username, effectiveTier, isAdmin);
  if (!check.allowed) {
    return {
      response: NextResponse.json(
        {
          error: "Monthly credits exhausted. Upgrade your plan or buy more credits to continue.",
          upgrade: true,
          topup: true,
          creditsRemaining: 0,
        },
        { status: 429 }
      ),
      username,
      tier,
      isAdmin,
      debit: async () => {},
    };
  }

  return {
    username,
    tier,
    isAdmin,
    debit: async (model: string, inputTokens: number, outputTokens: number, reason = "ai_request") => {
      await debitCredits(username, model, inputTokens, outputTokens, reason).catch((err) => console.error("[Credits] debit failed:", err));
    },
  };
}
