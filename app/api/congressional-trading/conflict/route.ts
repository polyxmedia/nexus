import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getTradingSnapshot } from "@/lib/congressional-trading";
import { HAIKU_MODEL } from "@/lib/ai/model";
import { db, schema } from "@/lib/db";
import { eq, desc, and, like } from "drizzle-orm";
import { creditGate } from "@/lib/credits/gate";
import { getSettingValue } from "@/lib/settings/get-setting";

export const maxDuration = 30;

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

    let snapshot;
    try {
      snapshot = await getTradingSnapshot();
    } catch (err) {
      console.error("Conflict analysis: getTradingSnapshot failed:", err);
      return NextResponse.json({ error: "Failed to fetch trading data" }, { status: 502 });
    }

    // Match by case-insensitive substring to handle partial/variant names from the UI
    const memberLower = memberName.toLowerCase();
    const memberTrades = snapshot.congressional.recent.filter(
      (t) => t.name.toLowerCase() === memberLower ||
             t.name.toLowerCase().includes(memberLower) ||
             memberLower.includes(t.name.toLowerCase())
    );

    if (memberTrades.length === 0) {
      return NextResponse.json(
        { error: `No recent trades found for "${memberName}". This member may not have disclosed trades in the current reporting window.` },
        { status: 404 }
      );
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

Return ONLY valid JSON, no markdown fences:
{
  "member": "${memberName}",
  "party": "${party}",
  "chamber": "${chamber}",
  "totalTrades": ${memberTrades.length},
  "riskScore": <number 1-10>,
  "committees": ["Known or likely committee assignments based on your knowledge"],
  "conflicts": [
    {
      "ticker": "TICKER",
      "type": "committee_overlap | legislative_timing | industry_concentration | excess_return | filing_delay",
      "severity": "high | medium | low",
      "explanation": "Brief explanation of the potential conflict"
    }
  ],
  "tradingPattern": "Brief summary of their overall trading pattern",
  "notableFindings": ["Key findings worth investigating"],
  "disclaimer": "This is automated analysis based on public data and should not be taken as evidence of wrongdoing."
}

Be thorough but fair. Flag genuine patterns, not speculative connections. Keep explanations concise to fit within response limits.`;

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    await gate.debit(HAIKU_MODEL, response.usage.input_tokens, response.usage.output_tokens, "conflict_analysis");

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    // Strip markdown fences if present
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error("Conflict analysis: failed to extract JSON from response:", text.slice(0, 300));
      return NextResponse.json({ error: "Failed to parse conflict analysis" }, { status: 500 });
    }

    let analysis;
    try {
      analysis = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error("Conflict analysis: JSON parse failed:", parseErr, "Raw:", jsonMatch[0].slice(0, 300));
      return NextResponse.json({ error: "Analysis returned malformed data" }, { status: 500 });
    }

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
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
