import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getTradingSnapshot } from "@/lib/congressional-trading";
import { HAIKU_MODEL } from "@/lib/ai/model";
import { db, schema } from "@/lib/db";
import { eq, desc, and, like } from "drizzle-orm";
import { creditGate } from "@/lib/credits/gate";
import { getSettingValue } from "@/lib/settings/get-setting";

async function getApiKey(): Promise<string | null> {
  try {
    return await getSettingValue("anthropic_api_key", process.env.ANTHROPIC_API_KEY) || null;
  } catch {
    return process.env.ANTHROPIC_API_KEY || null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const gate = await creditGate();
    if (gate.response) return gate.response;
    const memberName = req.nextUrl.searchParams.get("member");
    if (!memberName) {
      return NextResponse.json({ error: "Member name required" }, { status: 400 });
    }

    // Check for recent saved analysis first (within last 24h)
    try {
      const saved = await db
        .select()
        .from(schema.knowledge)
        .where(
          and(
            eq(schema.knowledge.category, "congressional_trading"),
            like(schema.knowledge.title, `Conflict Analysis: ${memberName}%`)
          )
        )
        .orderBy(desc(schema.knowledge.id))
        .limit(1);

      if (saved[0]) {
        const age = Date.now() - new Date(saved[0].createdAt).getTime();
        // Return cached if less than 24h old, or if explicitly requesting cached
        if (age < 86400_000 || req.nextUrl.searchParams.get("cached") === "true") {
          return NextResponse.json(JSON.parse(saved[0].content));
        }
      }
    } catch {
      // Continue to generate fresh analysis
    }

    const apiKey = await getApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: "No API key configured" }, { status: 500 });
    }

    const snapshot = await getTradingSnapshot();
    const memberTrades = snapshot.congressional.recent.filter(
      (t) => t.name.toLowerCase() === memberName.toLowerCase()
    );

    if (memberTrades.length === 0) {
      return NextResponse.json({ error: "No trades found for this member" }, { status: 404 });
    }

    const party = memberTrades[0].party || "Unknown";
    const chamber = memberTrades[0].chamber;

    const tradesSummary = memberTrades.map((t) => ({
      ticker: t.ticker,
      asset: t.asset,
      type: t.transactionType,
      amount: t.amount,
      date: t.transactionDate,
      filed: t.filingDate,
      excessReturn: t.excessReturn,
    }));

    const prompt = `You are an investigative congressional trading analyst. Analyze the trading activity of ${memberName} (${party}, ${chamber}) for potential conflicts of interest.

THEIR TRADES:
${JSON.stringify(tradesSummary, null, 1)}

Using your knowledge of this congress member's committee assignments, legislative activities, and public positions, analyze their trades for:

1. Committee conflicts: Do any trades align with sectors/companies they oversee?
2. Legislative timing: Were trades made near relevant votes, hearings, or policy announcements?
3. Industry patterns: Do their trades cluster in industries where they have regulatory influence?
4. Excess returns: Do they consistently outperform the market? (check excessReturn fields)
5. Filing delays: Large gaps between trade and filing dates?

Return JSON:
{
  "member": "${memberName}",
  "party": "${party}",
  "chamber": "${chamber}",
  "totalTrades": ${memberTrades.length},
  "riskScore": 1-10,
  "committees": ["Known or likely committee assignments based on your knowledge"],
  "conflicts": [
    {
      "ticker": "TICKER",
      "type": "committee_overlap" | "legislative_timing" | "industry_concentration" | "excess_return" | "filing_delay",
      "severity": "high" | "medium" | "low",
      "explanation": "Brief explanation of the potential conflict"
    }
  ],
  "tradingPattern": "Brief summary of their overall trading pattern",
  "notableFindings": ["Key findings worth investigating"],
  "disclaimer": "This is automated analysis based on public data and should not be taken as evidence of wrongdoing."
}

Be thorough but fair. Flag genuine patterns, not speculative connections.`;

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    await gate.debit(HAIKU_MODEL, response.usage.input_tokens, response.usage.output_tokens, "conflict_analysis");

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse conflict analysis" }, { status: 500 });
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Save analysis to knowledge bank for persistence
    try {
      await db.insert(schema.knowledge).values({
        title: `Conflict Analysis: ${memberName}`,
        content: JSON.stringify(analysis),
        category: "congressional_trading",
        source: "ai_analysis",
        status: "active",
      });
    } catch {
      // Non-critical: continue even if save fails
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Conflict analysis error:", error);
    const message = error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
