import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { HAIKU_MODEL } from "@/lib/ai/model";
import { requireTier } from "@/lib/auth/require-tier";
import { creditGate } from "@/lib/credits/gate";

export async function GET() {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;
  const gate = await creditGate();
  if (gate.response) return gate.response;
  try {
    // Gather current signals (active + upcoming, intensity >= 2)
    const allSignals = await db
      .select()
      .from(schema.signals)
      .orderBy(desc(schema.signals.intensity))
      .limit(30);
    const signals = allSignals.filter((s) => s.status !== "passed");

    // Get existing alerts so AI doesn't duplicate
    const existingAlerts = await db
      .select()
      .from(schema.alerts);

    // Get recent predictions for context
    const allPredictions = await db
      .select()
      .from(schema.predictions)
      .orderBy(desc(schema.predictions.createdAt))
      .limit(10);
    const predictions = allPredictions.filter((p) => !p.outcome);

    if (signals.length === 0 && predictions.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    const client = new Anthropic();

    const signalSummary = signals.map((s) => ({
      title: s.title,
      intensity: s.intensity,
      category: s.category,
      date: s.date,
      description: s.description?.slice(0, 200),
      marketSectors: s.marketSectors,
    }));

    const existingAlertSummary = existingAlerts.map((a) => ({
      name: a.name,
      type: a.type,
      condition: a.condition,
    }));

    const predictionSummary = predictions.map((p) => ({
      claim: p.claim,
      confidence: p.confidence,
      deadline: p.deadline,
      category: p.category,
    }));

    const response = await client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `You are the NEXUS intelligence platform alert advisor. Based on the current active signals, open predictions, and existing alert rules, suggest 4-6 new alert rules the user should create.

CURRENT SIGNALS (${signals.length} active/upcoming):
${JSON.stringify(signalSummary, null, 2)}

OPEN PREDICTIONS (${predictions.length}):
${JSON.stringify(predictionSummary, null, 2)}

EXISTING ALERTS (avoid duplicating these):
${JSON.stringify(existingAlertSummary, null, 2)}

AVAILABLE ALERT TYPES:
- price_threshold: Monitor a ticker crossing a price level. Condition: { ticker, direction: "above"|"below", threshold }
- vix_level: VIX exceeding a level. Condition: { vixLevel }
- signal_intensity: High-intensity signal detection. Condition: { minIntensity: 1-5 }
- prediction_due: Predictions approaching deadline. Condition: { daysBeforeDeadline }
- osint_keyword: Monitor GDELT news for keywords. Condition: { keywords: string[] }

Return JSON array of suggestions. Each suggestion must have:
- name: Short descriptive name
- type: One of the alert types above
- condition: The condition object matching the type
- cooldownMinutes: Suggested cooldown (30-1440)
- reasoning: 1-2 sentences explaining why this alert matters given current signals
- urgency: "high" | "medium" | "low"
- relatedSignals: Array of signal titles this relates to

Focus on actionable, specific alerts that connect to current geopolitical/market conditions. Think like a hedge fund risk manager.

Respond with ONLY the JSON array, no markdown fencing.`,
        },
      ],
    });

    await gate.debit(HAIKU_MODEL, response.usage.input_tokens, response.usage.output_tokens, "alert_suggestions");

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    let suggestions;
    try {
      // Handle potential markdown fencing
      const cleaned = text.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      suggestions = JSON.parse(cleaned);
    } catch {
      suggestions = [];
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Alert suggestions error:", error);
    return NextResponse.json({ suggestions: [], error: "Failed to generate suggestions" });
  }
}
