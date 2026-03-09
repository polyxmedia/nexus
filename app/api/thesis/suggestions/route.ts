import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db, schema } from "@/lib/db";
import { eq, desc, gte } from "drizzle-orm";
import { creditGate } from "@/lib/credits/gate";

export interface ThesisSuggestion {
  title: string;
  symbols: string[];
  rationale: string;
  angle: "geopolitical" | "macro" | "celestial" | "technical" | "convergence";
}

export async function GET() {
  try {
    const gate = await creditGate();
    if (gate.response) return gate.response;

    const anthropicKeyRows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "anthropic_api_key"));
    const apiKey = anthropicKeyRows[0]?.value || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ suggestions: [] });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [signals, predictions, theses, trades] = await Promise.all([
      db.select().from(schema.signals).orderBy(desc(schema.signals.createdAt)).limit(15),
      db.select().from(schema.predictions).where(gte(schema.predictions.createdAt, sevenDaysAgo)).limit(10),
      db.select().from(schema.theses).orderBy(desc(schema.theses.generatedAt)).limit(3),
      db.select().from(schema.trades).orderBy(desc(schema.trades.createdAt)).limit(10),
    ]);

    const recentSignals = signals.map(s => ({
      title: s.title,
      category: s.category,
      intensity: s.intensity,
      date: s.date,
    }));

    const recentPredictions = predictions.map(p => ({
      claim: p.claim.slice(0, 120),
      category: p.category,
      confidence: p.confidence,
      outcome: p.outcome,
    }));

    const recentTheses = theses.map(t => ({
      title: t.title,
      symbols: JSON.parse(t.symbols),
      marketRegime: t.marketRegime,
      status: t.status,
    }));

    const recentTrades = trades.map(t => ({
      ticker: t.ticker,
      direction: t.direction,
      status: t.status,
    }));

    const contextBlock = JSON.stringify({
      signals: recentSignals,
      predictions: recentPredictions,
      recentTheses,
      recentTrades,
    }, null, 2);

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: `You are an intelligence analyst for a geopolitical-market convergence platform. Based on the following system context, suggest 4 thesis opportunities the user should consider generating next.

Each suggestion should identify a specific market angle that the signals and geopolitical context point to — not generic advice.

Context:
${contextBlock}

Respond with a JSON array of exactly 4 objects with this structure:
[
  {
    "title": "Concise thesis title (max 10 words)",
    "symbols": ["TICKER1", "TICKER2"],
    "rationale": "One sentence explaining why this thesis is timely given the context",
    "angle": "geopolitical" | "macro" | "celestial" | "technical" | "convergence"
  }
]

Rules:
- Symbols must be real US equity or ETF tickers relevant to the thesis
- Do not repeat symbols from recentTheses if status is active
- Prioritize signals with high intensity or multiple converging signals
- Return only the JSON array, no other text`,
        },
      ],
    });

    await gate.debit("claude-haiku-4-5-20251001", response.usage.input_tokens, response.usage.output_tokens, "thesis_suggestions");

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ suggestions: [] });
    }

    const suggestions: ThesisSuggestion[] = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Thesis suggestions error:", error);
    return NextResponse.json({ suggestions: [] });
  }
}
