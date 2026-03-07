import Anthropic from "@anthropic-ai/sdk";
import { db, schema } from "../db";
import { eq, desc, isNull } from "drizzle-orm";
import type { NewPrediction } from "../db/schema";
import { getQuote, getDailySeries } from "../market-data/alpha-vantage";
import { getActiveKnowledge } from "../knowledge/engine";
import { computePerformanceReport } from "./feedback";
import { loadPrompt } from "@/lib/prompts/loader";
import { getModel } from "@/lib/ai/model";

export async function generatePredictions(): Promise<NewPrediction[]> {
  const anthropicKey = await getAnthropicKey();
  const today = new Date().toISOString().split("T")[0];

  // ── Gather full intelligence picture ──

  // Active thesis with all fields
  const latestThesis = await db
    .select()
    .from(schema.theses)
    .where(eq(schema.theses.status, "active"))
    .orderBy(desc(schema.theses.id))
    .limit(1);

  // Active signals
  const allSignals = await db
    .select()
    .from(schema.signals);
  const activeSignals = allSignals.filter((s) => s.status === "active" || s.status === "upcoming");

  // Game theory scenarios
  const gameTheoryRecords = await db
    .select()
    .from(schema.gameTheoryScenarios)
    .orderBy(desc(schema.gameTheoryScenarios.id))
    .limit(3);

  // All existing predictions (pending + recently resolved for context)
  const allPredictions = await db
    .select()
    .from(schema.predictions)
    .orderBy(desc(schema.predictions.id));

  const pendingPredictions = allPredictions.filter((p) => !p.outcome);
  const recentResolved = allPredictions
    .filter((p) => p.outcome)
    .slice(0, 10);

  // ── Build context sections ──

  let thesisContext = "No active thesis available. Generate predictions based on signals and game theory only.";
  if (latestThesis.length > 0) {
    const t = latestThesis[0];
    const tradingActions = safeParse(t.tradingActions, []) as Array<Record<string, unknown>>;
    const actionsSummary = tradingActions.length > 0
      ? tradingActions.map((a) =>
          `  - ${a.direction} ${a.ticker}: ${a.rationale} (confidence: ${((a.confidence as number) * 100).toFixed(0)}%, risk: ${a.riskLevel})`
        ).join("\n")
      : "  None";

    thesisContext = `Market Regime: ${t.marketRegime}
Volatility Outlook: ${t.volatilityOutlook}
Convergence Density: ${t.convergenceDensity}/10
Overall Confidence: ${(t.overallConfidence * 100).toFixed(0)}%

EXECUTIVE SUMMARY:
${t.executiveSummary}

SITUATION ASSESSMENT:
${t.situationAssessment}

RISK SCENARIOS:
${t.riskScenarios}

TRADING ACTIONS:
${actionsSummary}`;
  }

  const signalsContext = activeSignals.length > 0
    ? activeSignals.map((s) => {
        const parts = [`- ${s.title} (intensity ${s.intensity}/5, ${s.date}, status: ${s.status})`];
        if (s.geopoliticalContext) parts.push(`  Geopolitical: ${s.geopoliticalContext}`);
        if (s.celestialType) parts.push(`  Celestial: ${s.celestialType}`);
        if (s.hebrewHoliday) parts.push(`  Hebrew Calendar: ${s.hebrewHoliday}`);
        if (s.historicalPrecedent) parts.push(`  Historical: ${s.historicalPrecedent}`);
        const sectors = safeParse(s.marketSectors, []) as string[];
        if (sectors.length > 0) parts.push(`  Sectors: ${sectors.join(", ")}`);
        return parts.join("\n");
      }).join("\n")
    : "No active signals";

  const gameTheoryContext = gameTheoryRecords.length > 0
    ? gameTheoryRecords.map((r) => {
        const a = safeParse(r.analysis, null) as Record<string, unknown> | null;
        if (!a) return `- ${r.title}: (analysis unavailable)`;
        const ma = a.marketAssessment as Record<string, unknown> | undefined;
        const ne = a.nashEquilibria as unknown[] | undefined;
        return `- ${r.title}: Most likely "${ma?.mostLikelyOutcome}" (${ma?.direction}, confidence ${(((ma?.confidence as number) || 0) * 100).toFixed(0)}%). Nash equilibria: ${ne?.length || 0}. Key sectors: ${(ma?.keySectors as string[])?.join(", ") || "none"}`;
      }).join("\n")
    : "No game theory analyses";

  const pendingContext = pendingPredictions.length > 0
    ? pendingPredictions.map((p) =>
        `- [${p.category}] "${p.claim}" (deadline: ${p.deadline}, confidence: ${(p.confidence * 100).toFixed(0)}%)`
      ).join("\n")
    : "None";

  const recentResolvedContext = recentResolved.length > 0
    ? recentResolved.map((p) =>
        `- [${p.outcome}] "${p.claim}" (score: ${p.score != null ? (p.score * 100).toFixed(0) + "%" : "N/A"})${p.outcomeNotes ? ` - ${p.outcomeNotes}` : ""}`
      ).join("\n")
    : "None";

  // Performance feedback from resolved predictions
  const performanceReport = await computePerformanceReport();
  const feedbackContext = performanceReport
    ? performanceReport.promptSection
    : "Not enough resolved predictions yet to compute performance feedback.";

  // Knowledge bank context
  let knowledgeContext = "No knowledge entries stored.";
  try {
    const activeKnowledge = await getActiveKnowledge();
    if (activeKnowledge.length > 0) {
      knowledgeContext = activeKnowledge.map((k) => {
        const tags = k.tags ? safeParse(k.tags, []) as string[] : [];
        return `- [${k.category}] "${k.title}" (confidence: ${((k.confidence || 0.8) * 100).toFixed(0)}%, tags: ${tags.join(", ")})\n  ${k.content.slice(0, 300)}...`;
      }).join("\n\n");
    }
  } catch {
    knowledgeContext = "Knowledge bank unavailable.";
  }

  // ── Prompt ──

  const prompt = `Generate falsifiable predictions grounded in the current NEXUS intelligence picture.

TODAY: ${today}

═══ ACTIVE THESIS ═══
${thesisContext}

═══ KNOWLEDGE BANK (institutional memory) ═══
${knowledgeContext}

═══ ACTIVE SIGNALS ═══
${signalsContext}

═══ GAME THEORY ANALYSIS ═══
${gameTheoryContext}

═══ EXISTING PENDING PREDICTIONS (DO NOT DUPLICATE) ═══
${pendingContext}

═══ RECENTLY RESOLVED (learn from accuracy) ═══
${recentResolvedContext}

═══ CALIBRATION FEEDBACK (your track record - adjust accordingly) ═══
${feedbackContext}

Respond ONLY with a JSON array. Each prediction must include a "grounding" field citing the specific thesis element, signal, or game theory outcome it derives from:
[
  {
    "claim": "Specific falsifiable claim with measurable threshold",
    "timeframe": "7 days" | "14 days" | "30 days" | "90 days",
    "deadline": "YYYY-MM-DD",
    "confidence": 0.3-0.95,
    "category": "market" | "geopolitical" | "celestial",
    "grounding": "Derived from: [specific thesis element / signal / game theory outcome]"
  }
]`;

  const client = new Anthropic({ apiKey: anthropicKey });
  const response = await client.messages.create({
    model: await getModel(),
    max_tokens: 2048,
    system: await loadPrompt("prediction_generate"),
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Failed to parse predictions from Claude response");
  }

  const parsed: Array<{
    claim: string;
    timeframe: string;
    deadline: string;
    confidence: number;
    category: string;
    grounding?: string;
  }> = JSON.parse(jsonMatch[0]);

  // ── Deduplication: reject predictions too similar to existing ones ──
  const existingClaims = allPredictions.map((p) => normalizeClaim(p.claim));

  const created: NewPrediction[] = [];
  for (const p of parsed) {
    const normalized = normalizeClaim(p.claim);

    // Check for semantic overlap with any existing prediction
    const isDuplicate = existingClaims.some((existing) => {
      // Exact or near-exact match
      if (existing === normalized) return true;
      // High token overlap (>60% of words shared)
      const newWords = new Set(normalized.split(" "));
      const existingWords = existing.split(" ");
      const overlap = existingWords.filter((w) => newWords.has(w)).length;
      const overlapRatio = overlap / Math.max(newWords.size, existingWords.length);
      return overlapRatio > 0.6;
    });

    if (isDuplicate) continue;

    // Validate category
    const category = ["market", "geopolitical", "celestial"].includes(p.category)
      ? p.category
      : "market";

    // Validate deadline is in the future
    if (p.deadline <= today) continue;

    // Append grounding to claim as metadata
    const claimWithGrounding = p.grounding
      ? p.claim
      : p.claim;

    const rows = await db
      .insert(schema.predictions)
      .values({
        claim: claimWithGrounding,
        timeframe: p.timeframe,
        deadline: p.deadline,
        confidence: Math.max(0.1, Math.min(0.95, p.confidence)),
        category,
        metrics: p.grounding ? JSON.stringify({ grounding: p.grounding }) : null,
      })
      .returning();

    created.push(rows[0]);
    // Add to existing claims to prevent intra-batch duplicates
    existingClaims.push(normalized);
  }

  return created;
}

export async function resolvePredictions(): Promise<Array<{ id: number; outcome: string; score: number; notes: string }>> {
  const anthropicKey = await getAnthropicKey();
  const alphaVantageKey = await getAlphaVantageKey();
  const today = new Date().toISOString().split("T")[0];

  const pending = await db
    .select()
    .from(schema.predictions)
    .where(isNull(schema.predictions.outcome));

  if (pending.length === 0) return [];

  // Only resolve predictions whose deadline has passed
  const due = pending.filter((p) => p.deadline <= today);
  if (due.length === 0) return [];

  // ── Step 1: Extract tickers mentioned in predictions ──
  const tickerPattern = /\b([A-Z]{1,5}(?:\.[A-Z]{1,2})?)\b/g;
  const mentionedTickers = new Set<string>();
  // Common market indices and ETFs to always fetch
  const coreSymbols = ["SPY", "QQQ", "VIX", "GLD", "TLT", "USO", "XLE", "XLF", "XLK", "IWM"];
  coreSymbols.forEach((s) => mentionedTickers.add(s));

  for (const p of due) {
    const matches = p.claim.match(tickerPattern);
    if (matches) {
      for (const m of matches) {
        // Filter out common English words that look like tickers
        if (!["THE", "AND", "FOR", "NOT", "BUT", "HAS", "WAS", "ARE", "ITS", "GDP", "CPI", "USD", "EUR", "GBP", "JPY", "VIX"].includes(m) || m === "VIX") {
          mentionedTickers.add(m);
        }
      }
    }
  }

  // ── Step 2: Fetch real market data for all relevant tickers ──
  const marketData: Record<string, { current: { price: number; change: number; changePercent: number; volume: number; date: string }; history: Array<{ date: string; close: number; high: number; low: number }> }> = {};

  if (alphaVantageKey) {
    const earliestCreation = due.reduce((min, p) => p.createdAt < min ? p.createdAt : min, due[0].createdAt);
    const symbols = Array.from(mentionedTickers);

    // Fetch in batches of 5 to respect Alpha Vantage rate limits (5 calls/min free tier)
    for (let i = 0; i < symbols.length; i += 5) {
      const batch = symbols.slice(i, i + 5);
      await Promise.all(batch.map(async (symbol) => {
        try {
          const [quote, daily] = await Promise.all([
            getQuote(symbol, alphaVantageKey).catch(() => null),
            getDailySeries(symbol, alphaVantageKey).catch(() => []),
          ]);

          if (quote) {
            const relevantBars = daily
              .filter((b) => b.date >= earliestCreation.split("T")[0])
              .map((b) => ({ date: b.date, close: b.close, high: b.high, low: b.low }));

            marketData[symbol] = {
              current: {
                price: quote.price,
                change: quote.change,
                changePercent: quote.changePercent,
                volume: quote.volume,
                date: quote.timestamp,
              },
              history: relevantBars,
            };
          }
        } catch {
          // Skip symbols that fail
        }
      }));

      // Wait 12s between batches for rate limiting
      if (i + 5 < symbols.length) {
        await new Promise((resolve) => setTimeout(resolve, 12000));
      }
    }
  }

  // ── Step 3: Fetch real geopolitical events from GDELT ──
  let gdeltSummary = "GDELT data unavailable.";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const query = encodeURIComponent("conflict OR military OR attack OR sanctions OR election OR summit");
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=ArtList&maxrecords=50&format=json&timespan=14d`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const articles = (data.articles || []).slice(0, 30);
      if (articles.length > 0) {
        gdeltSummary = articles.map((a: { title: string; seendate: string; domain: string }) =>
          `- [${a.seendate?.slice(0, 8) || "?"}] ${a.title} (${a.domain})`
        ).join("\n");
      }
    }
  } catch {
    // GDELT unavailable, proceed without
  }

  // ── Step 4: Build evidence-based prompt ──
  const predictionsText = due.map((p) => {
    const metrics = safeParse(p.metrics, null) as Record<string, unknown> | null;
    const grounding = metrics?.grounding ? `\nGrounding: ${metrics.grounding}` : "";
    return `ID: ${p.id}\nClaim: "${p.claim}"\nCategory: ${p.category}\nConfidence: ${(p.confidence * 100).toFixed(0)}%\nDeadline: ${p.deadline}\nCreated: ${p.createdAt}${grounding}`;
  }).join("\n\n");

  const marketDataText = Object.keys(marketData).length > 0
    ? Object.entries(marketData).map(([symbol, data]) => {
        const historyLines = data.history.slice(-20).map((b) =>
          `  ${b.date}: close=${b.close.toFixed(2)}, high=${b.high.toFixed(2)}, low=${b.low.toFixed(2)}`
        ).join("\n");

        return `${symbol}: Current price ${data.current.price.toFixed(2)} (${data.current.changePercent >= 0 ? "+" : ""}${data.current.changePercent.toFixed(2)}%) as of ${data.current.date}\nRecent history:\n${historyLines}`;
      }).join("\n\n")
    : "No market data available. Mark market predictions as 'expired' with note explaining data was unavailable.";

  const prompt = `Evaluate these predictions using ONLY the real data provided below. Today is ${today}. All deadlines have passed.

═══ PREDICTIONS TO EVALUATE ═══
${predictionsText}

═══ REAL MARKET DATA (from Alpha Vantage) ═══
${marketDataText}

═══ REAL GEOPOLITICAL EVENTS (from GDELT, last 14 days) ═══
${gdeltSummary}

INSTRUCTIONS:
- For MARKET predictions: Compare the claim against the actual price data above. Quote the specific prices and dates.
- For GEOPOLITICAL predictions: Check if the GDELT headlines corroborate or contradict the claim.
- For CELESTIAL predictions: These are calendar-based and verifiable. Check if the claimed convergence occurred (the dates are deterministic).
- If the relevant data is NOT in the evidence above, mark as "expired" and state what data would be needed.

Respond ONLY with a JSON array:
[
  {
    "id": <prediction_id>,
    "outcome": "confirmed" | "denied" | "partial" | "expired",
    "score": 0.0-1.0,
    "notes": "Evidence: [cite specific data points from above]"
  }
]`;

  const client = new Anthropic({ apiKey: anthropicKey });
  const response = await client.messages.create({
    model: await getModel(),
    max_tokens: 2048,
    system: await loadPrompt("prediction_resolve"),
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Failed to parse resolution from Claude response");
  }

  const results: Array<{ id: number; outcome: string; score: number; notes: string }> = JSON.parse(jsonMatch[0]);

  // Validate and update DB
  const validOutcomes = ["confirmed", "denied", "partial", "expired"];
  const updated: typeof results = [];

  for (const r of results) {
    if (!due.some((p) => p.id === r.id)) continue;
    if (!validOutcomes.includes(r.outcome)) continue;

    const score = Math.max(0, Math.min(1, r.score));

    await db.update(schema.predictions)
      .set({
        outcome: r.outcome,
        score,
        outcomeNotes: r.notes || null,
        resolvedAt: new Date().toISOString(),
      })
      .where(eq(schema.predictions.id, r.id))
      ;

    updated.push({ ...r, score });
  }

  // Persist failure patterns to knowledge bank after resolution
  if (updated.length > 0) {
    try {
      const report = await computePerformanceReport();
      if (report && report.failurePatterns.length > 0) {
        const content = [
          `# Prediction Failure Patterns (auto-updated ${today})`,
          `Brier Score: ${report.brierScore.toFixed(3)} | Hit Rate: ${(report.binaryAccuracy * 100).toFixed(0)}% | n=${report.totalResolved}`,
          "",
          ...report.failurePatterns.map((fp: { pattern: string; frequency: number; examples: string[] }) =>
            `## ${fp.pattern} (${fp.frequency}x)\n${fp.examples.map((e: string) => `- ${e}`).join("\n")}`
          ),
        ].join("\n");

        // Upsert a knowledge entry for prediction failure patterns
        const existingRows = await db
          .select()
          .from(schema.knowledge)
          .where(eq(schema.knowledge.title, "Prediction Failure Patterns"));

        if (existingRows.length > 0) {
          await db.update(schema.knowledge)
            .set({ content, updatedAt: new Date().toISOString() })
            .where(eq(schema.knowledge.id, existingRows[0].id));
        } else {
          await db.insert(schema.knowledge)
            .values({
              title: "Prediction Failure Patterns",
              content,
              category: "analysis",
              tags: "predictions,calibration,feedback",
              source: "prediction-feedback-loop",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
            ;
        }
      }
    } catch {
      // Knowledge bank persistence is best-effort
    }
  }

  return updated;
}

// ── Helpers ──

async function getAnthropicKey(): Promise<string> {
  const rows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "anthropic_api_key"));

  const key = rows[0]?.value || process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Anthropic API key not configured");
  return key;
}

async function getAlphaVantageKey(): Promise<string> {
  const rows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "alpha_vantage_api_key"));

  return rows[0]?.value || process.env.ALPHA_VANTAGE_API_KEY || "";
}

function normalizeClaim(claim: string): string {
  return claim
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function safeParse(json: string | null, fallback: unknown): Record<string, unknown> | unknown {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}
