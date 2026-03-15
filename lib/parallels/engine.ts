/**
 * Historical Pattern Matching Engine ("Psycho-History Parallels")
 *
 * Searches Wikipedia, knowledge bank, resolved predictions, and signal history
 * for structurally similar past situations. Uses Claude to synthesize structured
 * analysis with probability assessments grounded in real historical data.
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

// ── Wikipedia Search ──

interface WikiSearchResult {
  title: string;
  snippet: string;
  extract?: string;
}

/**
 * Search Wikipedia for relevant historical articles and fetch their introductions.
 */
async function searchWikipedia(query: string): Promise<WikiSearchResult[]> {
  try {
    // Step 1: Search for relevant articles
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query + " history conflict")}&srlimit=5&format=json&origin=*`;
    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(6_000) });
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();
    const hits: Array<{ title: string; snippet: string }> = searchData?.query?.search || [];
    if (hits.length === 0) return [];

    // Step 2: Fetch introductory extracts for top results
    const titles = hits.slice(0, 4).map((h) => h.title).join("|");
    const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&exlimit=4&titles=${encodeURIComponent(titles)}&format=json&origin=*`;
    const extractRes = await fetch(extractUrl, { signal: AbortSignal.timeout(6_000) });
    if (!extractRes.ok) return hits.map((h) => ({ title: h.title, snippet: h.snippet }));
    const extractData = await extractRes.json();
    const pages = extractData?.query?.pages || {};

    const results: WikiSearchResult[] = [];
    for (const page of Object.values(pages) as Array<{ title: string; extract?: string }>) {
      if (page.extract) {
        results.push({
          title: page.title,
          snippet: "",
          extract: page.extract.slice(0, 800),
        });
      }
    }
    return results.length > 0 ? results : hits.map((h) => ({ title: h.title, snippet: h.snippet }));
  } catch {
    return [];
  }
}

// ── Core Engine ──

const PARALLELS_MODEL = "claude-sonnet-4-6";

const PARALLELS_PROMPT = `You are a historical pattern matching engine for the NEXUS intelligence platform.

Your job: given a current geopolitical/market event and reference material (Wikipedia articles, knowledge bank entries, signals, predictions), identify the closest VERIFIED historical parallels and produce a structured JSON analysis.

RULES:
1. ONLY cite historical events that are documented in the provided Wikipedia/knowledge context OR that you are certain occurred. Prefer events from the provided context.
2. NEVER fabricate dates, market impacts, or outcomes. Use "approximately" if exact figures are unavailable.
3. Return 2-5 parallels. Focus on STRUCTURAL parallels: similar actor constellations, escalation dynamics, economic conditions, alliance structures. Ignore superficial similarities.
4. For each parallel, the "sourceEvidence" field MUST reference the Wikipedia article, knowledge bank entry, or signal that grounds it.
5. Set confidenceInAnalysis proportional to evidence quality: 0.2-0.4 with minimal context, 0.4-0.6 with moderate context, 0.6-0.85 with strong evidence.
6. The "synthesis" should be 2-4 sentences connecting the parallels to the current situation with explicit uncertainty language.
7. "regime" reflects the current state: "peacetime" (diplomatic tensions, no active conflict), "wartime" (active military operations), "transition" (escalation trajectory, mobilisation, proxy conflicts).

You MUST respond with ONLY valid JSON. No markdown, no code fences, no commentary outside the JSON. Use this exact structure:
{
  "parallels": [
    {
      "event": "descriptive name",
      "date": "date or date range",
      "similarity": 0.0,
      "outcome": "what happened",
      "timeToResolution": "duration",
      "marketImpact": "market effects",
      "keyDifferences": ["diff 1"],
      "keySimilarities": ["sim 1"],
      "sourceEvidence": "Wikipedia: Article Title / Knowledge Bank: entry / Signal: title"
    }
  ],
  "synthesis": "synthesis text",
  "probabilityOfRepetition": 0.0,
  "regime": "peacetime",
  "confidenceInAnalysis": 0.0,
  "actionableInsights": ["insight 1"],
  "warning": null
}`;

/**
 * Attempt to parse JSON from Claude's response, with retry.
 */
async function parseOrRetry(
  text: string,
  client: Anthropic,
  query: string
): Promise<Record<string, unknown> | null> {
  // Try direct parse first (response should be pure JSON)
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // noop
  }

  // Try extracting JSON from markdown fences or surrounding text
  const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/) || trimmed.match(/(\{[\s\S]*\})/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {
      // noop
    }
  }

  // Retry: ask Claude to fix the malformed JSON
  try {
    const fixResponse = await client.messages.create({
      model: PARALLELS_MODEL,
      max_tokens: 2000,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: `The following text was supposed to be valid JSON for a historical parallels analysis of "${query}" but it's malformed. Extract and fix it into valid JSON. Return ONLY the corrected JSON, nothing else:\n\n${text.slice(0, 3000)}`,
        },
      ],
    });
    const fixText = fixResponse.content[0].type === "text" ? fixResponse.content[0].text : "";
    const fixTrimmed = fixText.trim();
    try {
      return JSON.parse(fixTrimmed);
    } catch {
      const fixMatch = fixTrimmed.match(/(\{[\s\S]*\})/);
      if (fixMatch) return JSON.parse(fixMatch[1]);
    }
  } catch {
    // noop
  }

  return null;
}

/**
 * Search for historical parallels to a described event.
 */
export async function findHistoricalParallels(
  query: string,
  apiKey: string
): Promise<ParallelAnalysis> {
  const withTimeout = <T>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
    Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);

  // 1. Run all data queries in parallel (Wikipedia + knowledge bank + DB)
  const [wikiResults, knowledgeResults, resolvedPredictions, relevantSignals] = await Promise.all([
    searchWikipedia(query),
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

  // 2. Build context sections
  const wikiContext = wikiResults
    .map((w) => `### ${w.title}\n${w.extract || w.snippet}`)
    .join("\n\n");

  const knowledgeContext = knowledgeResults
    .map((k) => `[${k.category}] ${k.title}: ${k.content.slice(0, 300)}`)
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

═══ WIKIPEDIA (historical reference) ═══
${wikiContext || "No Wikipedia results found."}

═══ KNOWLEDGE BANK (semantic matches) ═══
${knowledgeContext || "No relevant knowledge entries found."}

═══ RESOLVED PREDICTIONS (historical outcomes) ═══
${predictionsContext || "No resolved predictions."}

═══ SIGNAL HISTORY ═══
${signalsContext || "No signal data."}

Identify the strongest structural parallels. Ground each parallel in the provided reference material. Be specific about dates, outcomes, and probabilities.`;

  // 3. Call Claude for synthesis
  const client = new Anthropic({ apiKey, timeout: 30_000 });

  const response = await client.messages.create({
    model: PARALLELS_MODEL,
    max_tokens: 2000,
    temperature: 0,
    system: PARALLELS_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // 4. Parse JSON (skip retry to stay within tool timeout)
  let parsed: Record<string, unknown> | null = null;
  const trimmed = text.trim();
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/) || trimmed.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      try { parsed = JSON.parse(jsonMatch[1]); } catch { /* noop */ }
    }
  }

  if (!parsed) {
    return {
      query,
      parallels: [],
      synthesis: "Analysis generation failed. Please try again.",
      probabilityOfRepetition: 0,
      regime: "peacetime",
      confidenceInAnalysis: 0,
      actionableInsights: [],
      warning: "Could not generate structured analysis.",
    };
  }

  // 5. Post-generation validation
  if (Array.isArray(parsed.parallels)) {
    parsed.parallels = (parsed.parallels as Record<string, unknown>[]).filter((p) => {
      if (!p.event || !p.date) return false;
      if (typeof p.similarity === "number") {
        p.similarity = Math.min(p.similarity, 0.95);
      }
      return true;
    });

    const sims = (parsed.parallels as Record<string, unknown>[]).map((p) => p.similarity);
    const allSame = sims.length > 2 && sims.every((s) => s === sims[0]);
    if (allSame && typeof parsed.confidenceInAnalysis === "number") {
      parsed.confidenceInAnalysis = Math.min(parsed.confidenceInAnalysis, 0.3);
      parsed.warning = (parsed.warning as string) || "Uniform similarity scores suggest low differentiation in analysis.";
    }

    // Cap confidence when context was thin (excluding Wikipedia which is always available)
    const internalContext = knowledgeResults.length + resolvedPredictions.length + relevantSignals.length;
    if (internalContext < 5 && typeof parsed.confidenceInAnalysis === "number") {
      parsed.confidenceInAnalysis = Math.min(parsed.confidenceInAnalysis, 0.6);
    }
  }

  return { query, ...parsed } as ParallelAnalysis;
}
