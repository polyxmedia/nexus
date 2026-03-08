import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getTradingSnapshot } from "@/lib/congressional-trading";
import { getModel } from "@/lib/ai/model";
import { db, schema } from "@/lib/db";
import { eq, desc, and, like } from "drizzle-orm";

async function getApiKey(): Promise<string | null> {
  try {
    if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
    const rows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "anthropic_api_key"));
    return rows[0]?.value || null;
  } catch {
    return process.env.ANTHROPIC_API_KEY || null;
  }
}

export async function GET() {
  try {
    // Check for recent saved analysis first (within last 6h)
    try {
      const saved = await db
        .select()
        .from(schema.knowledge)
        .where(
          and(
            eq(schema.knowledge.category, "congressional_trading"),
            like(schema.knowledge.title, "Congressional Trading Analysis:%")
          )
        )
        .orderBy(desc(schema.knowledge.id))
        .limit(1);

      if (saved[0]) {
        const age = Date.now() - new Date(saved[0].createdAt).getTime();
        if (age < 6 * 3600_000) {
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

    const congressional = snapshot.congressional;
    const insider = snapshot.insider;

    // Build a concise data summary for the AI
    const topBuyers = congressional.topBuys.slice(0, 15).map((t) => ({
      name: t.name,
      party: t.party,
      chamber: t.chamber,
      ticker: t.ticker,
      amount: t.amount,
      date: t.transactionDate,
      excessReturn: t.excessReturn,
    }));

    const topSellers = congressional.topSells.slice(0, 15).map((t) => ({
      name: t.name,
      party: t.party,
      chamber: t.chamber,
      ticker: t.ticker,
      amount: t.amount,
      date: t.transactionDate,
    }));

    // Find members with most trades
    const memberCounts = new Map<string, { buys: number; sells: number; tickers: Set<string>; party: string }>();
    for (const t of congressional.recent) {
      const existing = memberCounts.get(t.name) || { buys: 0, sells: 0, tickers: new Set<string>(), party: t.party || "" };
      if (t.transactionType === "purchase") existing.buys++;
      else if (t.transactionType === "sale") existing.sells++;
      existing.tickers.add(t.ticker);
      memberCounts.set(t.name, existing);
    }

    const mostActive = Array.from(memberCounts.entries())
      .map(([name, data]) => ({
        name,
        party: data.party,
        buys: data.buys,
        sells: data.sells,
        uniqueTickers: data.tickers.size,
        tickers: Array.from(data.tickers).slice(0, 8),
      }))
      .sort((a, b) => (b.buys + b.sells) - (a.buys + a.sells))
      .slice(0, 10);

    // Find most traded tickers
    const tickerCounts = new Map<string, { buys: number; sells: number; members: Set<string> }>();
    for (const t of congressional.recent) {
      const existing = tickerCounts.get(t.ticker) || { buys: 0, sells: 0, members: new Set<string>() };
      if (t.transactionType === "purchase") existing.buys++;
      else if (t.transactionType === "sale") existing.sells++;
      existing.members.add(t.name);
      tickerCounts.set(t.ticker, existing);
    }

    const hotTickers = Array.from(tickerCounts.entries())
      .map(([ticker, data]) => ({
        ticker,
        buys: data.buys,
        sells: data.sells,
        uniqueMembers: data.members.size,
      }))
      .sort((a, b) => (b.buys + b.sells) - (a.buys + a.sells))
      .slice(0, 10);

    const prompt = `You are a congressional trading analyst for an intelligence platform. Analyze the following congressional and insider trading data and produce a concise intelligence briefing.

DATA:
- Total filings: ${congressional.recent.length} (Senate: ${congressional.byChamber.senate}, House: ${congressional.byChamber.house})
- Party breakdown: Democrats: ${congressional.byParty.democrat}, Republicans: ${congressional.byParty.republican}, Independent: ${congressional.byParty.independent}
- Insider buy ratio: ${(insider.buyRatio * 100).toFixed(1)}%
- Cluster buy alerts: ${insider.clusterBuys.length}

TOP BUYS:
${JSON.stringify(topBuyers, null, 1)}

TOP SELLS:
${JSON.stringify(topSellers, null, 1)}

MOST ACTIVE MEMBERS:
${JSON.stringify(mostActive, null, 1)}

HOTTEST TICKERS:
${JSON.stringify(hotTickers, null, 1)}

CLUSTER BUYS (multiple insiders buying same stock):
${JSON.stringify(insider.clusterBuys.slice(0, 5), null, 1)}

Produce a JSON response with this exact structure:
{
  "headline": "One-line summary (max 80 chars)",
  "sentiment": "bullish" | "bearish" | "mixed",
  "keyFindings": ["finding1", "finding2", "finding3", "finding4"],
  "potentialConflicts": ["Any notable patterns suggesting potential conflicts of interest"],
  "sectorFocus": ["Top sectors/industries being traded"],
  "riskFlags": ["Any unusual patterns, timing anomalies, or concentration risks"],
  "outlook": "1-2 sentence forward-looking assessment"
}

Be direct, analytical, and flag anything that looks unusual. Focus on patterns, not individual trades.`;

    const client = new Anthropic({ apiKey });
    const model = await getModel();

    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse analysis" }, { status: 500 });
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Save analysis to knowledge bank for persistence
    try {
      await db.insert(schema.knowledge).values({
        title: `Congressional Trading Analysis: ${analysis.headline || new Date().toISOString().split("T")[0]}`,
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
    console.error("Congressional analysis error:", error);
    const message = error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
