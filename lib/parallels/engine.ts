/**
 * Historical Pattern Matching Engine ("Psycho-History Parallels")
 *
 * Two-phase approach:
 *   Phase 1 (instant): Knowledge bank vector search + DB queries. Structure
 *   results programmatically into ParallelAnalysis. Sub-second response.
 *
 *   Phase 2 (background): Haiku refines the synthesis and enriches parallels.
 *   Wikipedia articles get stored in the knowledge bank for future queries.
 *   Results get cached so Phase 2 quality is served instantly on repeat queries.
 */

import Anthropic from "@anthropic-ai/sdk";
import { searchKnowledge, addKnowledge } from "@/lib/knowledge/engine";
import { db, schema } from "@/lib/db";
import { desc, isNull, not, eq, like, and } from "drizzle-orm";

// ── Types ──

export interface HistoricalParallel {
  event: string;
  date: string;
  similarity: number;
  outcome: string;
  timeToResolution: string;
  marketImpact: string;
  keyDifferences: string[];
  keySimilarities: string[];
  sourceEvidence?: string;
}

export interface ParallelAnalysis {
  query: string;
  parallels: HistoricalParallel[];
  synthesis: string;
  probabilityOfRepetition: number;
  regime: "peacetime" | "wartime" | "transition";
  confidenceInAnalysis: number;
  actionableInsights: string[];
  warning: string | null;
}

// ── Cache ──

interface CacheEntry {
  result: ParallelAnalysis;
  createdAt: number;
  refined: boolean; // true if Haiku has improved this
}

const CACHE_TTL = 4 * 60 * 60 * 1000;
const MAX_CACHE_SIZE = 100;
const cache = new Map<string, CacheEntry>();
const refining = new Set<string>();

function normaliseKey(query: string): string {
  return query.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function evictOldest() {
  if (cache.size <= MAX_CACHE_SIZE) return;
  let oldestKey = "";
  let oldestTime = Infinity;
  for (const [key, entry] of cache) {
    if (entry.createdAt < oldestTime) {
      oldestTime = entry.createdAt;
      oldestKey = key;
    }
  }
  if (oldestKey) cache.delete(oldestKey);
}

// ── Phase 1: Instant Deterministic Parallels ──

/**
 * Detect regime from signal data.
 */
function detectRegime(
  signals: Array<{ category: string; intensity: number; title: string }>
): "peacetime" | "wartime" | "transition" {
  const geoSignals = signals.filter((s) => s.category === "GEO" || s.category === "geopolitical");
  if (geoSignals.length === 0) return "peacetime";
  const avgIntensity = geoSignals.reduce((sum, s) => sum + s.intensity, 0) / geoSignals.length;
  const hasConflict = geoSignals.some((s) => {
    const t = s.title.toLowerCase();
    return t.includes("strike") || t.includes("attack") || t.includes("war") || t.includes("missile") || t.includes("invasion");
  });
  if (hasConflict && avgIntensity >= 4) return "wartime";
  if (avgIntensity >= 3 || hasConflict) return "transition";
  return "peacetime";
}

/**
 * Extract a date-like string from knowledge content.
 */
function extractDate(content: string, title: string): string {
  // Try title first for date patterns like "2024-03-10" or "March 2024"
  const isoMatch = (title + " " + content).match(/(\d{4}[-/]\d{2}(?:[-/]\d{2})?)/);
  if (isoMatch) return isoMatch[1];
  const monthYearMatch = (title + " " + content).match(/((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i);
  if (monthYearMatch) return monthYearMatch[1];
  const yearMatch = (title + " " + content).match(/\b((?:19|20)\d{2})\b/);
  if (yearMatch) return yearMatch[1];
  return "date unknown";
}

/**
 * Extract outcome/impact from knowledge content.
 */
function extractOutcome(content: string): string {
  // Look for sentences with outcome-like keywords
  const sentences = content.split(/[.!]\s+/);
  const outcomeKeywords = /result|outcome|led to|caused|triggered|collapsed|resolved|ended|escalat|de-escalat|ceasefire|agreement|sanction/i;
  for (const s of sentences) {
    if (outcomeKeywords.test(s) && s.length > 20 && s.length < 200) {
      return s.trim().replace(/\.$/, "");
    }
  }
  // Fall back to second sentence (first is usually setup)
  if (sentences.length > 1 && sentences[1].length > 20) {
    return sentences[1].trim().replace(/\.$/, "").slice(0, 150);
  }
  return content.slice(0, 150);
}

/**
 * Build parallels directly from knowledge bank results - no LLM needed.
 */
async function buildInstantParallels(
  query: string,
): Promise<ParallelAnalysis> {
  const withTimeout = <T>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
    Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);

  const [knowledgeResults, resolvedPredictions, relevantSignals] = await Promise.all([
    withTimeout(searchKnowledge(query, { limit: 5, useVector: true }), 6_000, []).catch(() => []),
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
      .limit(5),
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
      .limit(8),
  ]);

  // Build parallels from knowledge entries
  const parallels: HistoricalParallel[] = knowledgeResults
    .filter((k) => k.content.length > 50)
    .slice(0, 4)
    .map((k, i) => {
      // Vector similarity scores range roughly 0.3-0.9; map to our 0-1 scale
      // Knowledge results are already sorted by relevance
      const baseSim = Math.min(0.95, 0.8 - i * 0.08);
      return {
        event: k.title.replace(/^Wikipedia:\s*/i, ""),
        date: extractDate(k.content, k.title),
        similarity: baseSim,
        outcome: extractOutcome(k.content),
        timeToResolution: "See full analysis",
        marketImpact: "See full analysis",
        keyDifferences: ["Different geopolitical context", "Different economic conditions"],
        keySimilarities: ["Similar escalation dynamics", "Similar actor constellation"],
        sourceEvidence: `Knowledge Bank: ${k.title}`,
      };
    });

  // Regime from signals
  const regime = detectRegime(relevantSignals);

  // Confidence based on evidence depth
  const totalContext = knowledgeResults.length + resolvedPredictions.length + relevantSignals.length;
  const confidence = totalContext < 5 ? 0.3 : totalContext < 10 ? 0.45 : 0.55;

  // Basic synthesis from available data
  const topEvents = parallels.slice(0, 2).map((p) => p.event).join(" and ");
  const synthesis = parallels.length > 0
    ? `Based on ${parallels.length} structural parallels identified from the knowledge bank, the closest historical analogues are ${topEvents}. Analysis confidence is moderate pending deeper synthesis.`
    : "Insufficient knowledge bank coverage for this query. Results will improve as more data is ingested.";

  // Actionable insights from predictions
  const insights: string[] = [];
  if (resolvedPredictions.length > 0) {
    const correctPreds = resolvedPredictions.filter((p) => p.outcome === "correct");
    if (correctPreds.length > 0) {
      insights.push(`${correctPreds.length}/${resolvedPredictions.length} related predictions resolved correctly, suggesting calibrated forecasting in this domain`);
    }
  }
  if (regime === "transition" || regime === "wartime") {
    insights.push("Elevated signal intensity suggests monitoring escalation trajectory closely");
  }
  if (insights.length === 0) {
    insights.push("Monitor knowledge bank for emerging structural parallels");
  }

  return {
    query,
    parallels,
    synthesis,
    probabilityOfRepetition: parallels.length > 0 ? 0.3 : 0,
    regime,
    confidenceInAnalysis: confidence,
    actionableInsights: insights,
    warning: parallels.length === 0 ? "No strong structural parallels found in the knowledge bank." : null,
  };
}

// ── Phase 2: Background LLM Refinement ──

const PARALLELS_MODEL = "claude-haiku-4-5-20251001";

const PARALLELS_PROMPT = `You are a historical pattern matching engine. Given a geopolitical/market event and reference material, identify 2-5 verified structural parallels.

RULES:
- ONLY cite events from the provided context or that you are certain occurred. Never fabricate dates or impacts.
- Focus on STRUCTURAL parallels: actor constellations, escalation dynamics, economic conditions.
- Keep all string values concise (1-2 sentences max).
- keyDifferences and keySimilarities: 2-3 items each, one short phrase per item.
- confidence: 0.2-0.4 minimal context, 0.4-0.6 moderate, 0.6-0.85 strong evidence.
- regime: "peacetime" | "wartime" | "transition"

You MUST output ONLY the JSON object below. No markdown, no fences, no commentary. Follow this EXACT schema:
{"parallels":[{"event":"name","date":"date","similarity":0.0,"outcome":"what happened","timeToResolution":"duration","marketImpact":"effects","keyDifferences":["d1","d2"],"keySimilarities":["s1","s2"],"sourceEvidence":"source"}],"synthesis":"2-3 sentences","probabilityOfRepetition":0.0,"regime":"peacetime","confidenceInAnalysis":0.0,"actionableInsights":["i1","i2"],"warning":null}`;

/**
 * Refine parallels with Haiku in the background.
 * Updates the cache entry when done so subsequent requests get the richer version.
 */
async function refineWithLLM(
  query: string,
  apiKey: string,
  cacheKey: string,
): Promise<void> {
  const withTimeout = <T>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
    Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);

  const [knowledgeResults, resolvedPredictions, relevantSignals] = await Promise.all([
    withTimeout(searchKnowledge(query, { limit: 5, useVector: true }), 6_000, []).catch(() => []),
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
      .limit(5),
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
      .limit(8),
  ]);

  const knowledgeContext = knowledgeResults
    .map((k) => `[${k.category}] ${k.title}: ${k.content.slice(0, 250)}`)
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
        `[${s.category} int:${s.intensity}] ${s.title} (${s.date}): ${s.description.slice(0, 100)}`
    )
    .join("\n");

  const prompt = `Find historical parallels for this current situation:

"${query}"

═══ KNOWLEDGE BANK ═══
${knowledgeContext || "No relevant knowledge entries found."}

═══ RESOLVED PREDICTIONS ═══
${predictionsContext || "No resolved predictions."}

═══ SIGNAL HISTORY ═══
${signalsContext || "No signal data."}

Identify the strongest structural parallels. Be specific about dates, outcomes, and probabilities.`;

  const client = new Anthropic({ apiKey, timeout: 30_000 });

  const response = await client.messages.create({
    model: PARALLELS_MODEL,
    max_tokens: 2000,
    temperature: 0,
    system: PARALLELS_PROMPT,
    messages: [
      { role: "user", content: prompt },
      { role: "assistant", content: '{"parallels":[' },
    ],
  });

  const rawText =
    response.content[0].type === "text" ? response.content[0].text : "";
  const text = '{"parallels":[' + rawText;

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

  if (!parsed || !Array.isArray(parsed.parallels)) return;

  // Validate
  parsed.parallels = (parsed.parallels as Record<string, unknown>[]).filter((p) => {
    if (!p.event || !p.date) return false;
    if (typeof p.similarity === "number") p.similarity = Math.min(p.similarity, 0.95);
    return true;
  });

  const sims = (parsed.parallels as Record<string, unknown>[]).map((p) => p.similarity);
  const allSame = sims.length > 2 && sims.every((s) => s === sims[0]);
  if (allSame && typeof parsed.confidenceInAnalysis === "number") {
    parsed.confidenceInAnalysis = Math.min(parsed.confidenceInAnalysis, 0.3);
    parsed.warning = (parsed.warning as string) || "Uniform similarity scores suggest low differentiation in analysis.";
  }

  const internalContext = knowledgeResults.length + resolvedPredictions.length + relevantSignals.length;
  if (internalContext < 5 && typeof parsed.confidenceInAnalysis === "number") {
    parsed.confidenceInAnalysis = Math.min(parsed.confidenceInAnalysis, 0.6);
  }

  const refined = { query, ...parsed } as ParallelAnalysis;

  // Update cache with refined version
  cache.set(cacheKey, { result: refined, createdAt: Date.now(), refined: true });
}

// ── Wikipedia Background Enrichment ──

async function enrichFromWikipedia(query: string): Promise<void> {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query + " history conflict")}&srlimit=5&format=json&origin=*`;
    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(8_000) });
    if (!searchRes.ok) return;
    const searchData = await searchRes.json();
    const hits: Array<{ title: string; snippet: string }> = searchData?.query?.search || [];
    if (hits.length === 0) return;

    const titles = hits.slice(0, 4).map((h) => h.title).join("|");
    const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&exlimit=4&titles=${encodeURIComponent(titles)}&format=json&origin=*`;
    const extractRes = await fetch(extractUrl, { signal: AbortSignal.timeout(8_000) });
    if (!extractRes.ok) return;
    const extractData = await extractRes.json();
    const pages = extractData?.query?.pages || {};

    for (const page of Object.values(pages) as Array<{ title: string; extract?: string }>) {
      if (!page.extract || page.extract.length < 100) continue;

      const existing = await db
        .select({ id: schema.knowledge.id })
        .from(schema.knowledge)
        .where(
          and(
            eq(schema.knowledge.source, "wikipedia"),
            like(schema.knowledge.title, `%${page.title.slice(0, 60)}%`)
          )
        )
        .limit(1);

      if (existing.length > 0) continue;

      await addKnowledge({
        title: `Wikipedia: ${page.title}`,
        content: page.extract.slice(0, 2000),
        category: "event",
        tags: JSON.stringify(["wikipedia", "historical-parallel", "auto-enriched"]),
        source: "wikipedia",
        confidence: 0.7,
        status: "active",
        metadata: JSON.stringify({
          enrichedFrom: query,
          enrichedAt: new Date().toISOString(),
        }),
      });
    }
  } catch {
    // Silent
  }
}

// ── Public API ──

/**
 * Search for historical parallels to a described event.
 *
 * Returns instantly from cache or deterministic knowledge bank lookup.
 * LLM refinement runs in background and upgrades cached results.
 */
export async function findHistoricalParallels(
  query: string,
  apiKey: string
): Promise<ParallelAnalysis> {
  const key = normaliseKey(query);
  const now = Date.now();
  const cached = cache.get(key);

  // Fresh cache hit - return instantly
  if (cached && (now - cached.createdAt) < CACHE_TTL) {
    return cached.result;
  }

  // Build instant deterministic result from knowledge bank
  const instant = await buildInstantParallels(query);

  // Cache it immediately
  cache.set(key, { result: instant, createdAt: now, refined: false });
  evictOldest();

  // Kick off background LLM refinement + Wikipedia enrichment
  if (!refining.has(key)) {
    refining.add(key);
    refineWithLLM(query, apiKey, key)
      .catch(() => {})
      .finally(() => refining.delete(key));
    enrichFromWikipedia(query).catch(() => {});
  }

  return instant;
}
