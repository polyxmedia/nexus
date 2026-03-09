/**
 * Historical Pattern Matching Engine ("Psycho-History Parallels")
 *
 * Searches knowledge bank + GDELT for historical situations similar to
 * a user-described current event. Uses semantic search to find parallels,
 * then Claude to synthesize structured analysis with probability assessments.
 */

import Anthropic from "@anthropic-ai/sdk";
import { searchKnowledge } from "@/lib/knowledge/engine";
import { db, schema } from "@/lib/db";
import { desc } from "drizzle-orm";

// ── Types ──

export interface HistoricalParallel {
  event: string;
  date: string;
  similarity: number; // 0-1 how closely it maps
  outcome: string;
  timeToResolution: string;
  marketImpact: string;
  keyDifferences: string[];
  keySimilarities: string[];
}

export interface ParallelAnalysis {
  query: string;
  parallels: HistoricalParallel[];
  synthesis: string;
  probabilityOfRepetition: number; // 0-1
  regime: "peacetime" | "wartime" | "transition";
  confidenceInAnalysis: number; // 0-1
  actionableInsights: string[];
  warning: string | null;
}

// ── Core Engine ──

const PARALLELS_MODEL = "claude-sonnet-4-20250514";

const PARALLELS_PROMPT = `You are a historical pattern matching engine for the NEXUS intelligence platform.

Given a current event description and a set of knowledge bank entries / historical data, your job is to:
1. Identify the closest historical parallels (3-7 events)
2. Score similarity (0-1) based on structural similarity, not surface-level keywords
3. Note what happened after each parallel event (outcome, timeline, market impact)
4. Synthesize a probability of the current event following the same pattern
5. Flag key differences that could change the outcome

Focus on STRUCTURAL parallels: similar actor constellations, similar escalation dynamics, similar economic conditions. Ignore superficial similarities.

Respond in this exact JSON structure:
{
  "parallels": [
    {
      "event": "descriptive name of historical event",
      "date": "approximate date or date range",
      "similarity": 0.0-1.0,
      "outcome": "what actually happened",
      "timeToResolution": "how long it took to resolve",
      "marketImpact": "specific market effects",
      "keyDifferences": ["difference 1", "difference 2"],
      "keySimilarities": ["similarity 1", "similarity 2"]
    }
  ],
  "synthesis": "2-4 sentence synthesis of what the parallels suggest for the current situation",
  "probabilityOfRepetition": 0.0-1.0,
  "regime": "peacetime"|"wartime"|"transition",
  "confidenceInAnalysis": 0.0-1.0,
  "actionableInsights": ["insight 1", "insight 2"],
  "warning": "null or a string if there's a critical caveat"
}`;

/**
 * Search for historical parallels to a described event.
 */
export async function findHistoricalParallels(
  query: string,
  apiKey: string
): Promise<ParallelAnalysis> {
  // 1. Search knowledge bank for relevant entries
  const knowledgeResults = await searchKnowledge(query, {
    limit: 15,
    useVector: true,
  });

  // 2. Search for related predictions (resolved ones are historical data)
  const predictions = await db
    .select()
    .from(schema.predictions)
    .orderBy(desc(schema.predictions.createdAt));

  const resolvedPredictions = predictions
    .filter((p) => p.outcome)
    .slice(0, 20);

  // 3. Search for related signals
  const signals = await db
    .select()
    .from(schema.signals)
    .orderBy(desc(schema.signals.date));

  const relevantSignals = signals.slice(0, 30);

  // 4. Build context for Claude
  const knowledgeContext = knowledgeResults
    .map((k) => `[${k.category}] ${k.title}: ${k.content.slice(0, 500)}`)
    .join("\n\n");

  const predictionsContext = resolvedPredictions
    .map(
      (p) =>
        `[${p.category} | ${p.outcome}] "${p.claim}" (confidence: ${(p.confidence * 100).toFixed(0)}%, deadline: ${p.deadline})`
    )
    .join("\n");

  const signalsContext = relevantSignals
    .map(
      (s) =>
        `[${s.category} int:${s.intensity}] ${s.title} (${s.date}): ${s.description.slice(0, 200)}`
    )
    .join("\n");

  const prompt = `Find historical parallels for this current situation:

"${query}"

═══ KNOWLEDGE BANK (semantic matches) ═══
${knowledgeContext || "No relevant knowledge entries found."}

═══ RESOLVED PREDICTIONS (historical outcomes) ═══
${predictionsContext || "No resolved predictions."}

═══ SIGNAL HISTORY ═══
${signalsContext || "No signal data."}

Identify the strongest structural parallels. Be specific about dates, outcomes, and probabilities.`;

  // 5. Call Claude for synthesis
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: PARALLELS_MODEL,
    max_tokens: 2000,
    system: PARALLELS_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    return {
      query,
      parallels: [],
      synthesis: "Could not generate parallel analysis.",
      probabilityOfRepetition: 0,
      regime: "peacetime",
      confidenceInAnalysis: 0,
      actionableInsights: [],
      warning: "Analysis generation failed.",
    };
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return { query, ...parsed } as ParallelAnalysis;
}
