/**
 * Long-Form Narrative Report Generator
 *
 * Generates structured intelligence briefings / lecture scripts by pulling
 * all active signals, parallels, game theory, predictions, and thesis data
 * into a single coherent narrative.
 */

import Anthropic from "@anthropic-ai/sdk";
import { db, schema } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import { searchKnowledge } from "@/lib/knowledge/engine";

// ── Types ──

export interface NarrativeReport {
  title: string;
  generatedAt: string;
  readingTime: string; // e.g. "12 minutes"
  regime: "peacetime" | "wartime" | "transition";
  sections: ReportSection[];
  keyTakeaways: string[];
  riskMatrix: RiskEntry[];
}

export interface ReportSection {
  heading: string;
  content: string;
  dataPoints: string[];
}

export interface RiskEntry {
  scenario: string;
  probability: number;
  impact: "low" | "medium" | "high" | "critical";
  timeframe: string;
}

// ── Engine ──

const REPORT_MODEL = "claude-sonnet-4-20250514";

const REPORT_PROMPT = `You are a long-form intelligence report generator for the NEXUS platform.

Your job is to synthesize all provided data into a coherent, structured intelligence briefing that reads like a lecture script. The reader should be able to read this aloud and it should flow naturally for 10-15 minutes.

Structure the report as:
1. Situation Overview (current state, regime assessment)
2. Primary Signal Analysis (what the data layers are showing)
3. Historical Parallels (if provided, what past events suggest)
4. Game Theory Assessment (actor dynamics, equilibria)
5. Forward Outlook (predictions, probabilities, timeline)
6. Risk Matrix (scenarios with probabilities and impact)

Rules:
- Write in analytical prose, not bullet points (sections can reference data points separately)
- Be specific with numbers, dates, probabilities
- Connect the dots between layers, that's the whole point
- State assessments directly, no hedging
- Include contrarian scenarios (what if the base case is wrong?)

Respond in this JSON structure:
{
  "title": "descriptive report title",
  "readingTime": "X minutes",
  "regime": "peacetime"|"wartime"|"transition",
  "sections": [
    { "heading": "section title", "content": "multi-paragraph prose", "dataPoints": ["specific data reference 1"] }
  ],
  "keyTakeaways": ["takeaway 1", "takeaway 2"],
  "riskMatrix": [
    { "scenario": "description", "probability": 0.0-1.0, "impact": "low"|"medium"|"high"|"critical", "timeframe": "time range" }
  ]
}`;

export async function generateNarrativeReport(
  topic: string | null,
  apiKey: string
): Promise<NarrativeReport> {
  // Gather all data layers
  const [signals, predictions, thesis, knowledge] = await Promise.all([
    db
      .select()
      .from(schema.signals)
      .orderBy(desc(schema.signals.date))
      .then((rows) => rows.slice(0, 30)),
    db
      .select()
      .from(schema.predictions)
      .orderBy(desc(schema.predictions.createdAt))
      .then((rows) => rows.slice(0, 25)),
    db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "active_thesis"))
      .then((rows) => rows[0]?.value || null),
    topic
      ? searchKnowledge(topic, { limit: 15, useVector: true })
      : searchKnowledge("current thesis geopolitical", {
          limit: 10,
          useVector: true,
        }),
  ]);

  const signalsSummary = signals
    .map(
      (s) =>
        `[${s.category} int:${s.intensity}] ${s.title} (${s.date}): ${s.description.slice(0, 300)}`
    )
    .join("\n");

  const activePredictions = predictions.filter((p) => !p.outcome);
  const resolvedPredictions = predictions.filter((p) => p.outcome);

  const predictionsSummary =
    activePredictions
      .map(
        (p) =>
          `[ACTIVE ${p.category}] "${p.claim}" (${(p.confidence * 100).toFixed(0)}% conf, due ${p.deadline})`
      )
      .join("\n") || "No active predictions";

  const resolvedSummary =
    resolvedPredictions
      .slice(0, 10)
      .map(
        (p) =>
          `[${p.outcome?.toUpperCase()}] "${p.claim}" (was ${(p.confidence * 100).toFixed(0)}%)`
      )
      .join("\n") || "No resolved predictions";

  const knowledgeSummary = knowledge
    .map((k) => `[${k.category}] ${k.title}: ${k.content.slice(0, 400)}`)
    .join("\n\n");

  const prompt = `Generate a comprehensive intelligence briefing.${topic ? ` Focus area: "${topic}"` : ""}

═══ ACTIVE THESIS ═══
${thesis || "No active thesis set."}

═══ SIGNALS (${signals.length} total) ═══
${signalsSummary || "No signals."}

═══ ACTIVE PREDICTIONS ═══
${predictionsSummary}

═══ RECENT OUTCOMES ═══
${resolvedSummary}

═══ KNOWLEDGE BANK ═══
${knowledgeSummary || "No relevant knowledge."}

Synthesize all layers into a coherent briefing.`;

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: REPORT_MODEL,
    max_tokens: 4000,
    system: REPORT_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    return {
      title: "Report Generation Failed",
      generatedAt: new Date().toISOString(),
      readingTime: "0 minutes",
      regime: "peacetime",
      sections: [],
      keyTakeaways: ["Report generation failed. Try again."],
      riskMatrix: [],
    };
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    ...parsed,
    generatedAt: new Date().toISOString(),
  } as NarrativeReport;
}
