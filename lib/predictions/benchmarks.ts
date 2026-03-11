/**
 * External Prediction Benchmarks
 *
 * Pulls prediction questions from public prediction markets and generates
 * NEXUS predictions against them. Tracks head-to-head accuracy vs crowd consensus.
 *
 * This eliminates the "self-selected predictions" critique: the question set
 * is determined externally, not by NEXUS.
 *
 * Sources:
 * - Metaculus (metaculus.com) — public API, geopolitical + science questions
 * - Polymarket (polymarket.com) — prediction market with real money
 * - Manifold Markets (manifold.markets) — play money prediction market
 */

import { db, schema } from "../db";
import { eq, sql } from "drizzle-orm";

// ── Types ──

export interface ExternalQuestion {
  source: "metaculus" | "polymarket" | "manifold";
  externalId: string;
  externalUrl: string;
  question: string;
  category: string;
  resolutionDate: string | null;
  crowdProbability: number;
}

export interface BenchmarkScore {
  source: string;
  totalResolved: number;
  nexusBrier: number;
  crowdBrier: number;
  nexusAdvantage: number; // negative = NEXUS is better (lower Brier = better)
  nexusWins: number;
  crowdWins: number;
  ties: number;
}

// ── Fetch from prediction markets ──

export async function fetchMetaculusQuestions(limit = 20): Promise<ExternalQuestion[]> {
  try {
    const res = await fetch(
      `https://www.metaculus.com/api/questions/?limit=${limit}&type=forecast&status=open&order_by=-activity`,
      {
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.results || [])
      .filter((q: Record<string, unknown>) =>
        q.type === "binary" && q.community_prediction != null
      )
      .map((q: Record<string, unknown>) => ({
        source: "metaculus" as const,
        externalId: String(q.id),
        externalUrl: `https://www.metaculus.com/questions/${q.id}/`,
        question: String(q.title || ""),
        category: categorizeQuestion(String(q.title || "")),
        resolutionDate: q.scheduled_close_time
          ? String(q.scheduled_close_time).split("T")[0]
          : null,
        crowdProbability: Number(
          ((q.community_prediction as Record<string, unknown>)?.full as Record<string, unknown>)?.q2 ??
          q.community_prediction ?? 0.5
        ),
      }));
  } catch {
    return [];
  }
}

export async function fetchPolymarketQuestions(limit = 20): Promise<ExternalQuestion[]> {
  try {
    const res = await fetch(
      `https://gamma-api.polymarket.com/markets?limit=${limit}&active=true&closed=false&order=volume&ascending=false`,
      {
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (Array.isArray(data) ? data : [])
      .filter((m: Record<string, unknown>) => m.outcomePrices != null)
      .map((m: Record<string, unknown>) => {
        let prob = 0.5;
        try {
          const prices = JSON.parse(String(m.outcomePrices || "[]"));
          if (Array.isArray(prices) && prices.length > 0) prob = Number(prices[0]);
        } catch { /* use default */ }

        return {
          source: "polymarket" as const,
          externalId: String(m.conditionId || m.id || ""),
          externalUrl: `https://polymarket.com/event/${m.slug || m.id}`,
          question: String(m.question || m.title || ""),
          category: categorizeQuestion(String(m.question || m.title || "")),
          resolutionDate: m.endDate
            ? String(m.endDate).split("T")[0]
            : null,
          crowdProbability: prob,
        };
      });
  } catch {
    return [];
  }
}

export async function fetchManifoldQuestions(limit = 20): Promise<ExternalQuestion[]> {
  try {
    const res = await fetch(
      `https://api.manifold.markets/v0/search-markets?limit=${limit}&sort=liquidity&filter=open&contractType=BINARY`,
      {
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (Array.isArray(data) ? data : [])
      .filter((m: Record<string, unknown>) => m.probability != null)
      .map((m: Record<string, unknown>) => ({
        source: "manifold" as const,
        externalId: String(m.id || ""),
        externalUrl: `https://manifold.markets/${m.creatorUsername}/${m.slug}`,
        question: String(m.question || ""),
        category: categorizeQuestion(String(m.question || "")),
        resolutionDate: m.closeTime
          ? new Date(Number(m.closeTime)).toISOString().split("T")[0]
          : null,
        crowdProbability: Number(m.probability || 0.5),
      }));
  } catch {
    return [];
  }
}

// ── Question categorization ──

function categorizeQuestion(title: string): string {
  const lower = title.toLowerCase();
  if (/war|military|conflict|invasion|nato|nuclear|sanction|missile/.test(lower)) return "geopolitical";
  if (/election|president|congress|vote|poll|party|democrat|republican|trump|biden/.test(lower)) return "politics";
  if (/gdp|inflation|recession|fed|rate|market|stock|s&p|nasdaq|oil|crypto|bitcoin/.test(lower)) return "market";
  if (/ai\b|artificial intelligence|gpt|model|agi|compute|robot/.test(lower)) return "technology";
  if (/climate|vaccine|virus|pandemic|health|disease/.test(lower)) return "science";
  return "general";
}

// ── Sync questions into DB ──

export async function syncExternalQuestions(): Promise<{
  fetched: number;
  newQuestions: number;
  updated: number;
}> {
  const [metaculus, polymarket, manifold] = await Promise.all([
    fetchMetaculusQuestions(20),
    fetchPolymarketQuestions(20),
    fetchManifoldQuestions(20),
  ]);

  const allQuestions = [...metaculus, ...polymarket, ...manifold]
    .filter(q => q.externalId && q.question);
  const now = new Date().toISOString();

  // Batch-fetch existing keys to partition inserts vs updates
  const existing = await db
    .select({
      source: schema.predictionBenchmarks.source,
      externalId: schema.predictionBenchmarks.externalId,
    })
    .from(schema.predictionBenchmarks);

  const existingKeys = new Set(existing.map(e => `${e.source}:${e.externalId}`));

  let newQuestions = 0;
  let updated = 0;

  for (const q of allQuestions) {
    const key = `${q.source}:${q.externalId}`;
    const isNew = !existingKeys.has(key);

    await db
      .insert(schema.predictionBenchmarks)
      .values({
        source: q.source,
        externalId: q.externalId,
        externalUrl: q.externalUrl,
        question: q.question,
        category: q.category,
        resolutionDate: q.resolutionDate,
        crowdProbability: q.crowdProbability,
        lastSyncedAt: now,
      })
      .onConflictDoUpdate({
        target: [schema.predictionBenchmarks.source, schema.predictionBenchmarks.externalId],
        set: {
          crowdProbability: q.crowdProbability,
          lastSyncedAt: now,
        },
      });

    if (isNew) {
      existingKeys.add(key);
      newQuestions++;
    } else {
      updated++;
    }
  }

  return { fetched: allQuestions.length, newQuestions, updated };
}

// ── Generate NEXUS prediction for a benchmark question ──

export async function generateNexusPrediction(
  benchmarkId: number,
  apiKey: string,
  model: string
): Promise<{ probability: number; reasoning: string } | null> {
  const [benchmark] = await db
    .select()
    .from(schema.predictionBenchmarks)
    .where(eq(schema.predictionBenchmarks.id, benchmarkId));

  if (!benchmark || benchmark.nexusProbability != null) return null;

  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system: `You are a calibrated forecaster. Given a prediction question, estimate the probability of the outcome being YES. Use base rates, reference classes, and specific evidence. Be precise and calibrated. Respond ONLY in this exact JSON format: {"probability": 0.XX, "reasoning": "Brief reasoning here"}`,
    messages: [{
      role: "user",
      content: `Question: "${benchmark.question}"\nCategory: ${benchmark.category}\nResolution date: ${benchmark.resolutionDate || "unspecified"}\nCurrent crowd/market probability: ${((benchmark.crowdProbability || 0.5) * 100).toFixed(0)}%\n\nProvide your independent probability estimate. Do not anchor to the crowd probability. Use your own analysis.`,
    }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const parsed = JSON.parse(text);
    const probability = Math.max(0.01, Math.min(0.99, Number(parsed.probability)));
    const reasoning = String(parsed.reasoning || "").slice(0, 500);

    await db
      .update(schema.predictionBenchmarks)
      .set({
        nexusProbability: probability,
        nexusReasoning: reasoning,
        nexusPredictedAt: new Date().toISOString(),
        crowdProbabilityAtPrediction: benchmark.crowdProbability,
      })
      .where(eq(schema.predictionBenchmarks.id, benchmarkId));

    return { probability, reasoning };
  } catch {
    return null;
  }
}

// ── Resolve benchmarks ──

export async function resolveFromSource(
  benchmarkId: number
): Promise<boolean | null> {
  const [benchmark] = await db
    .select()
    .from(schema.predictionBenchmarks)
    .where(eq(schema.predictionBenchmarks.id, benchmarkId));

  if (!benchmark || benchmark.resolved === 1) return null;

  // Try to fetch resolution from source
  let outcome: boolean | null = null;

  try {
    if (benchmark.source === "metaculus") {
      const res = await fetch(
        `https://www.metaculus.com/api/questions/${benchmark.externalId}/`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.resolution != null) {
          outcome = data.resolution === 1 || data.resolution === true;
        }
      }
    } else if (benchmark.source === "manifold") {
      const res = await fetch(
        `https://api.manifold.markets/v0/market/${benchmark.externalId}`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.resolution === "YES") outcome = true;
        else if (data.resolution === "NO") outcome = false;
      }
    } else if (benchmark.source === "polymarket") {
      // Polymarket resolution requires checking the specific market
      // For now, skip automatic resolution (manual or via webhook)
      return null;
    }
  } catch {
    return null;
  }

  if (outcome === null) return null;

  const outcomeNum = outcome ? 1 : 0;
  const nexusBrier = benchmark.nexusProbability != null
    ? Math.pow((benchmark.nexusProbability || 0.5) - outcomeNum, 2)
    : null;
  const crowdBrier = benchmark.crowdProbabilityAtPrediction != null
    ? Math.pow((benchmark.crowdProbabilityAtPrediction || 0.5) - outcomeNum, 2)
    : null;

  await db
    .update(schema.predictionBenchmarks)
    .set({
      resolved: 1,
      outcome: outcomeNum,
      resolvedAt: new Date().toISOString(),
      nexusBrier,
      crowdBrier,
    })
    .where(eq(schema.predictionBenchmarks.id, benchmarkId));

  return outcome;
}

// ── Scoring ──

export async function getBenchmarkScores(): Promise<{
  overall: BenchmarkScore;
  bySource: BenchmarkScore[];
  recentBenchmarks: Array<{
    question: string;
    source: string;
    nexusProbability: number | null;
    crowdProbability: number | null;
    outcome: number | null;
    nexusBrier: number | null;
    crowdBrier: number | null;
  }>;
}> {
  const resolved = await db
    .select()
    .from(schema.predictionBenchmarks)
    .where(eq(schema.predictionBenchmarks.resolved, 1));

  const scored = resolved.filter(r => r.nexusBrier != null && r.crowdBrier != null);

  function computeScore(items: typeof scored, source: string): BenchmarkScore {
    if (items.length === 0) {
      return { source, totalResolved: 0, nexusBrier: 0.25, crowdBrier: 0.25, nexusAdvantage: 0, nexusWins: 0, crowdWins: 0, ties: 0 };
    }
    const nexusBrier = items.reduce((s, i) => s + (i.nexusBrier || 0), 0) / items.length;
    const crowdBrier = items.reduce((s, i) => s + (i.crowdBrier || 0), 0) / items.length;
    let nexusWins = 0, crowdWins = 0, ties = 0;
    for (const i of items) {
      if ((i.nexusBrier || 0) < (i.crowdBrier || 0) - 0.001) nexusWins++;
      else if ((i.crowdBrier || 0) < (i.nexusBrier || 0) - 0.001) crowdWins++;
      else ties++;
    }
    return {
      source,
      totalResolved: items.length,
      nexusBrier,
      crowdBrier,
      nexusAdvantage: crowdBrier - nexusBrier, // positive = NEXUS better
      nexusWins,
      crowdWins,
      ties,
    };
  }

  const overall = computeScore(scored, "all");
  const sources = ["metaculus", "polymarket", "manifold"];
  const bySource = sources.map(s => computeScore(scored.filter(i => i.source === s), s));

  // Recent benchmarks for display
  const recent = await db
    .select()
    .from(schema.predictionBenchmarks)
    .orderBy(sql`created_at DESC`)
    .limit(20);

  const recentBenchmarks = recent.map(r => ({
    question: r.question,
    source: r.source,
    nexusProbability: r.nexusProbability,
    crowdProbability: r.crowdProbability,
    outcome: r.outcome,
    nexusBrier: r.nexusBrier,
    crowdBrier: r.crowdBrier,
  }));

  return { overall, bySource, recentBenchmarks };
}
