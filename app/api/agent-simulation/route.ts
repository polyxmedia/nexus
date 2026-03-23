export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import { validateOrigin } from "@/lib/security/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { runAndPersistSimulation } from "@/lib/simulation/agent-engine";
import { creditGate } from "@/lib/credits/gate";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";

async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return (session?.user as { role?: string } | undefined)?.role === "admin";
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

    const results = await db
      .select()
      .from(schema.agentSimulations)
      .where(eq(schema.agentSimulations.status, "complete"))
      .orderBy(desc(schema.agentSimulations.createdAt))
      .limit(limit);

    return NextResponse.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const session = await getServerSession(authOptions);
  if ((session?.user as { role?: string } | undefined)?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const username = session?.user?.name;
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit: max 5 simulations per hour
  const rl = await rateLimit(`agent-simulation:run:${username}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many simulations. Max 5 per hour." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  // Credit gate
  const gate = await creditGate();
  if (gate.response) return gate.response;

  try {
    const body = await request.json();
    const { context, swarmSize: rawSwarmSize } = body;

    if (!context || typeof context !== "string" || context.length < 10 || context.length > 5000) {
      return NextResponse.json(
        { error: "context is required (10-5000 chars)" },
        { status: 400 }
      );
    }

    const swarmSize = Math.max(3, Math.min(15, Number(rawSwarmSize) || 7));

    // Get Anthropic API key from settings
    const apiKeySetting = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "anthropic_api_key"))
      .limit(1);

    const apiKey = apiKeySetting[0]?.value || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
    }

    const { id, uuid, result } = await runAndPersistSimulation(apiKey, context, swarmSize);

    // Debit credits for agent calls (~500 tokens each)
    await gate.debit("claude-sonnet-4-20250514", swarmSize * 500, swarmSize * 500, "agent_simulation");

    return NextResponse.json({
      id,
      uuid,
      convergenceScore: result.convergenceScore,
      convergenceLabel: result.convergenceLabel,
      dominantStance: result.dominantStance,
      summary: result.summary,
      agentResults: result.agentResults,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Agent Simulation] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
