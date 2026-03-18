import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { simulateScenarioImpacts, simulateCustomShock } from "@/lib/portfolio/scenario-impact";
import { validateOrigin } from "@/lib/security/csrf";

/**
 * GET: Run all game theory scenarios against the user's portfolio.
 * Returns impact estimates sorted by biggest risk.
 * Zero AI calls, pure computation.
 */
export async function GET() {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  const { username } = tierCheck.result;

  try {
    const positions = await getUserPositions(username);
    if (positions.length === 0) {
      return NextResponse.json({ scenarios: [], message: "No positions found. Add positions to your portfolio to see scenario impacts." });
    }

    const scenarios = simulateScenarioImpacts(positions);
    return NextResponse.json({ scenarios, positionCount: positions.length, portfolioValue: positions.reduce((s, p) => s + p.value, 0) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST: Run a custom "what if" scenario.
 * Body: { name: string, description: string, shocks: Record<string, number> }
 * e.g., { name: "Oil to $100", shocks: { CL: 0.25, XLE: 0.15, DAL: -0.20 } }
 */
export async function POST(request: NextRequest) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  const { username } = tierCheck.result;

  try {
    const { name, description, shocks } = await request.json();
    if (!name || typeof name !== "string" || !shocks || typeof shocks !== "object" || Array.isArray(shocks)) {
      return NextResponse.json({ error: "name (string) and shocks (object) required" }, { status: 400 });
    }
    // Validate shock values are numbers in reasonable range
    const validatedShocks: Record<string, number> = {};
    for (const [ticker, value] of Object.entries(shocks)) {
      if (typeof ticker !== "string" || ticker.length > 10) continue;
      const num = Number(value);
      if (isNaN(num) || num < -1 || num > 2) continue;
      validatedShocks[ticker.toUpperCase()] = num;
    }
    if (Object.keys(validatedShocks).length === 0) {
      return NextResponse.json({ error: "No valid shocks provided. Values must be numbers between -1 and 2." }, { status: 400 });
    }

    const positions = await getUserPositions(username);
    if (positions.length === 0) {
      return NextResponse.json({ error: "No positions found" }, { status: 400 });
    }

    const result = simulateCustomShock(positions, name, description || name, validatedShocks);
    return NextResponse.json({ scenario: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Get user positions from all sources (manual + unified).
 */
async function getUserPositions(username: string): Promise<Array<{ ticker: string; value: number }>> {
  const positions: Array<{ ticker: string; value: number }> = [];

  // Manual positions
  const manual = await db.select().from(schema.manualPositions)
    .where(eq(schema.manualPositions.userId, username));
  for (const p of manual) {
    if (!p.closedAt && p.quantity && p.avgCost) {
      positions.push({ ticker: p.ticker, value: p.quantity * p.avgCost });
    }
  }

  // Unified positions (from broker sync)
  const unified = await db.select().from(schema.unifiedPositions)
    .where(eq(schema.unifiedPositions.userId, username));
  for (const p of unified) {
    if (p.marketValue && p.marketValue > 0) {
      positions.push({ ticker: p.normalizedSymbol || p.symbol, value: p.marketValue });
    }
  }

  return positions;
}
