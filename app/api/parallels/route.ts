import { NextRequest, NextResponse } from "next/server";
import { findHistoricalParallels } from "@/lib/parallels/engine";
import { creditGate } from "@/lib/credits/gate";
import { getSettingValue } from "@/lib/settings/get-setting";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";

export async function POST(request: Request) {
  try {
    const gate = await creditGate();
    if (gate.response) return gate.response;
    const { query } = await request.json();
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query string is required" }, { status: 400 });
    }

    const apiKey = await getSettingValue("anthropic_api_key", process.env.ANTHROPIC_API_KEY) || "";
    if (!apiKey) {
      return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
    }

    const session = await getServerSession(authOptions);
    const result = await findHistoricalParallels(query, apiKey);

    // Persist to DB so it's linkable via UUID
    const [row] = await db.insert(schema.parallelAnalyses).values({
      query,
      synthesis: result.synthesis || "",
      probabilityOfRepetition: result.probabilityOfRepetition || 0,
      regime: result.regime || "peacetime",
      confidence: result.confidenceInAnalysis || 0,
      warning: result.warning || null,
      actionableInsights: JSON.stringify(result.actionableInsights || []),
      parallels: JSON.stringify(result.parallels || []),
      createdBy: session?.user?.name || null,
    }).returning();

    return NextResponse.json({ ...result, uuid: row.uuid, id: row.id });
  } catch (error) {
    console.error("Parallels API error:", error);
    return NextResponse.json({ error: "Failed to find historical parallels" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

  try {
    const rows = await db.select({
      id: schema.parallelAnalyses.id,
      uuid: schema.parallelAnalyses.uuid,
      query: schema.parallelAnalyses.query,
      synthesis: schema.parallelAnalyses.synthesis,
      probabilityOfRepetition: schema.parallelAnalyses.probabilityOfRepetition,
      regime: schema.parallelAnalyses.regime,
      confidence: schema.parallelAnalyses.confidence,
      createdAt: schema.parallelAnalyses.createdAt,
    }).from(schema.parallelAnalyses)
      .orderBy(desc(schema.parallelAnalyses.id))
      .limit(limit);

    return NextResponse.json({ analyses: rows }, {
      headers: { "Cache-Control": "private, s-maxage=30, stale-while-revalidate=120" },
    });
  } catch (error) {
    console.error("Parallels list error:", error);
    return NextResponse.json({ analyses: [] });
  }
}
