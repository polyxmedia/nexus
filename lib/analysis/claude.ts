import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, buildAnalysisPrompt } from "./prompts";
import type { Signal, NewAnalysis } from "../db/schema";

const MODEL = "claude-sonnet-4-20250514";

export async function analyzeSignal(
  signal: Signal,
  apiKey: string
): Promise<NewAnalysis> {
  const client = new Anthropic({ apiKey });

  const prompt = buildAnalysisPrompt({
    title: signal.title,
    description: signal.description,
    date: signal.date,
    intensity: signal.intensity,
    layers: signal.layers,
    marketSectors: signal.marketSectors || "[]",
    historicalPrecedent: signal.historicalPrecedent,
    hebrewHoliday: signal.hebrewHoliday,
    celestialType: signal.celestialType,
    geopoliticalContext: signal.geopoliticalContext,
  });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse structured analysis from Claude response");
  }

  const analysis = JSON.parse(jsonMatch[0]);

  return {
    signalId: signal.id,
    summary: analysis.summary,
    confidence: analysis.confidence,
    escalationProbability: analysis.escalation_probability ?? null,
    marketImpact: JSON.stringify(analysis.market_impact),
    tradeRecommendations: JSON.stringify(analysis.trade_recommendations),
    reasoning: text,
    hebrewCalendarAnalysis: analysis.hebrew_calendar_analysis || null,
    celestialAnalysis: analysis.celestial_analysis || null,
    historicalParallels: analysis.historical_parallels || null,
    riskFactors: JSON.stringify(analysis.risk_factors || []),
    modelUsed: MODEL,
  };
}
