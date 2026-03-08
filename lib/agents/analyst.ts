import Anthropic from "@anthropic-ai/sdk";
import type { AnalystContext, AnalystBriefing } from "./types";

const ANALYST_MODEL = "claude-sonnet-4-20250514";

const ANALYST_PROMPT = `You are ANALYST, the deep reasoning brain of NEXUS intelligence platform.

YOUR ROLE: Multi-layer convergence analysis. Thesis generation. Historical pattern matching. Stress-testing.
You are woken up by SENTINEL when something significant is detected. Your analysis will be passed to EXECUTOR for action.

Your analytical framework:
1. CONVERGENCE ANALYSIS: How many PRIMARY data layers are aligning? (geopolitical, market, OSINT, systemic risk). Calendar/celestial are narrative overlay only, not independent layers.
2. REGIME DETECTION: Is this wartime, peacetime, or transition? This changes everything about how to model outcomes. Check wartime thresholds.
3. THESIS IMPACT: Does this new information reinforce, challenge, or have no effect on the active thesis?
4. ACTION ITEMS: What should be done? Be specific. Tag urgency.

Rules:
- No hedging. State assessments directly with probabilities.
- Reference specific data points from the context.
- If the active thesis needs updating, say so clearly.
- Convergence score: 0-10 based on how many primary layers are aligning. Narrative overlays (calendar/celestial) add actor-belief context but no convergence weight.

Respond in this exact JSON structure:
{
  "summary": "2-4 sentence intelligence briefing",
  "confidence": 0.0-1.0,
  "thesisImpact": "reinforces"|"challenges"|"neutral",
  "actionItems": [
    { "type": "trade"|"alert"|"thesis_update", "description": "specific action", "urgency": "immediate"|"soon"|"monitor" }
  ],
  "convergenceScore": 0-10,
  "regime": "wartime"|"peacetime"|"transition"
}`;

export async function analystDeepDive(
  context: AnalystContext,
  apiKey: string
): Promise<AnalystBriefing> {
  const client = new Anthropic({ apiKey });

  const alertsSummary = context.sentinelAlerts
    .map((a) => `[${a.type.toUpperCase()} sev:${a.severity}] ${a.title}: ${a.summary}`)
    .join("\n");

  const signalsSummary = context.signals
    .map((s) => `- ${s.title} (intensity ${s.intensity}/5, ${s.category}, layers: ${s.layers})`)
    .join("\n");

  const predictionsSummary = context.predictions
    .slice(0, 10)
    .map((p) => `- [${p.category}] "${p.claim.slice(0, 80)}" (${(p.confidence * 100).toFixed(0)}%, due ${p.deadline})`)
    .join("\n");

  const gameTheorySummary = context.gameTheory
    .map((g) => `- ${g.title}: ${g.analysis.slice(0, 200)}`)
    .join("\n");

  const thesisSummary = context.activeThesis
    ? `Regime: ${context.activeThesis.regime}\nConfidence: ${(context.activeThesis.confidence * 100).toFixed(0)}%\nSummary: ${context.activeThesis.summary}\nRisks: ${context.activeThesis.riskScenarios}`
    : "No active thesis";

  const prompt = `SENTINEL TRIGGERED ANALYSIS. Evaluate the following:

═══ SENTINEL ALERTS (why you were woken up) ═══
${alertsSummary}

═══ ACTIVE THESIS ═══
${thesisSummary}

═══ SIGNALS ═══
${signalsSummary || "No active signals"}

═══ PREDICTIONS ═══
${predictionsSummary || "None pending"}

═══ GAME THEORY ═══
${gameTheorySummary || "No scenarios"}

═══ KNOWLEDGE CONTEXT ═══
${context.knowledgeContext || "No relevant knowledge"}

Provide your deep analysis.`;

  const response = await client.messages.create({
    model: ANALYST_MODEL,
    max_tokens: 1500,
    system: ANALYST_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      summary: "Analysis could not be completed.",
      confidence: 0.5,
      thesisImpact: "neutral",
      actionItems: [],
      convergenceScore: 0,
      regime: "peacetime",
    };
  }

  return JSON.parse(jsonMatch[0]) as AnalystBriefing;
}
