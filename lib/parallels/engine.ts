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
import { desc, isNull, not } from "drizzle-orm";

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
  sourceEvidence?: string; // what grounded this parallel
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

const PARALLELS_MODEL = "claude-haiku-4-5-20251001";

const PARALLELS_PROMPT = `You are a historical pattern matching engine for the NEXUS intelligence platform.

ANTI-HALLUCINATION RULES (ABSOLUTE, NON-NEGOTIABLE):
1. ONLY cite historical events you are certain occurred. If unsure, OMIT the event entirely.
2. NEVER fabricate dates, market impacts, or outcomes. If you cannot recall exact figures, say "approximately" or omit.
3. If the provided context is insufficient, return FEWER parallels (even 0-1). An empty parallels array with a honest warning is better than invented history.
4. Say "insufficient data" in the warning field when context is thin. Do not fill gaps with speculation.
5. Set confidenceInAnalysis proportional to evidence quality: 0.1-0.2 with no context, 0.3-0.5 with partial context, 0.6+ only with strong supporting evidence.
6. For each parallel, you MUST include a "sourceEvidence" field explaining what grounded this parallel (knowledge bank entry, signal data, or your verified training knowledge). If you cannot point to evidence, do not include the parallel.

Given a current event description and a set of knowledge bank entries / historical data:
1. Identify the closest VERIFIED historical parallels (0-5 events, zero is acceptable)
2. Score similarity (0-1) based on structural similarity, not surface-level keywords
3. Note what happened after each parallel - only verifiable facts
4. Synthesize a probability assessment with explicit uncertainty
5. Flag key differences that could change the outcome

Focus on STRUCTURAL parallels: similar actor constellations, escalation dynamics, economic conditions. Ignore superficial similarities.

Respond in this exact JSON structure:
{
  "parallels": [
    {
      "event": "descriptive name of historical event",
      "date": "approximate date or date range",
      "similarity": 0.0-1.0,
      "outcome": "what actually happened",
      "timeToResolution": "how long it took to resolve",
      "marketImpact": "specific market effects with approximate figures",
      "keyDifferences": ["difference 1", "difference 2"],
      "keySimilarities": ["similarity 1", "similarity 2"],
      "sourceEvidence": "what evidence supports this parallel (knowledge bank entry title, signal, or 'verified historical record')"
    }
  ],
  "synthesis": "2-4 sentence synthesis with explicit uncertainty language",
  "probabilityOfRepetition": 0.0-1.0,
  "regime": "peacetime"|"wartime"|"transition",
  "confidenceInAnalysis": 0.0-1.0,
  "actionableInsights": ["insight 1", "insight 2"],
  "warning": "null or a string if there's a critical caveat or insufficient data"
}`;

/**
 * Search for historical parallels to a described event.
 */
export async function findHistoricalParallels(
  query: string,
  apiKey: string
): Promise<ParallelAnalysis> {
  // 1. Run all data queries in parallel with timeouts
  const withTimeout = <T>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
    Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);

  const [knowledgeResults, resolvedPredictions, relevantSignals] = await Promise.all([
    withTimeout(searchKnowledge(query, { limit: 5, useVector: true }), 8_000, []).catch(() => []),
    db
      .select({
        category: schema.predictions.category,
        outcome: schema.predictions.outcome,
        claim: schema.predictions.claim,
        confidence: schema.predictions.confidence,
        deadline: schema.predictions.deadline,
      })
      .from(schema.predictions)
      .where(not(isNull(schema.predictions.outcome)))
      .orderBy(desc(schema.predictions.resolvedAt))
      .limit(10),
    db
      .select({
        category: schema.signals.category,
        intensity: schema.signals.intensity,
        title: schema.signals.title,
        date: schema.signals.date,
        description: schema.signals.description,
      })
      .from(schema.signals)
      .orderBy(desc(schema.signals.date))
      .limit(15),
  ]);

  // 2. Build context for Claude (truncated to keep prompt fast)
  const knowledgeContext = knowledgeResults
    .map((k) => `[${k.category}] ${k.title}: ${k.content.slice(0, 200)}`)
    .join("\n\n");

  const predictionsContext = resolvedPredictions
    .map(
      (p) =>
        `[${p.category} | ${p.outcome}] "${p.claim}" (conf: ${(p.confidence * 100).toFixed(0)}%, dl: ${p.deadline})`
    )
    .join("\n");

  const signalsContext = relevantSignals
    .map(
      (s) =>
        `[${s.category} int:${s.intensity}] ${s.title} (${s.date}): ${s.description.slice(0, 150)}`
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

  // 3. Call Claude for synthesis (with 25s timeout)
  const client = new Anthropic({ apiKey, timeout: 25_000 });

  const response = await client.messages.create({
    model: PARALLELS_MODEL,
    max_tokens: 1200,
    temperature: 0,
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

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return {
      query,
      parallels: [],
      synthesis: "Could not parse parallel analysis.",
      probabilityOfRepetition: 0,
      regime: "peacetime",
      confidenceInAnalysis: 0,
      actionableInsights: [],
      warning: "Analysis returned malformed JSON.",
    };
  }

  // 4. Post-generation validation: sanitise suspicious outputs
  if (Array.isArray(parsed.parallels)) {
    // Remove parallels with no source evidence or suspiciously high similarity
    parsed.parallels = parsed.parallels.filter((p: Record<string, unknown>) => {
      if (!p.event || !p.date) return false;
      // Clamp similarity to reasonable range
      if (typeof p.similarity === "number") {
        p.similarity = Math.min(p.similarity, 0.95);
      }
      return true;
    });

    // If all parallels scored identically, confidence is likely inflated
    const sims = parsed.parallels.map((p: Record<string, unknown>) => p.similarity);
    const allSame = sims.length > 2 && sims.every((s: number) => s === sims[0]);
    if (allSame && typeof parsed.confidenceInAnalysis === "number") {
      parsed.confidenceInAnalysis = Math.min(parsed.confidenceInAnalysis, 0.3);
      parsed.warning = parsed.warning || "Uniform similarity scores suggest low differentiation in analysis.";
    }

    // Cap confidence when context was thin
    const contextEntries = knowledgeResults.length + resolvedPredictions.length + relevantSignals.length;
    if (contextEntries < 5 && typeof parsed.confidenceInAnalysis === "number") {
      parsed.confidenceInAnalysis = Math.min(parsed.confidenceInAnalysis, 0.4);
    }
  }

  return { query, ...parsed } as ParallelAnalysis;
}
