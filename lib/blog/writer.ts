/**
 * Blog Writer Engine
 *
 * Uses Claude + NEXUS intelligence tools to generate deep-form analysis articles
 * around predictions, market events, and geopolitical developments.
 *
 * Writes in the style of an academic research desk with financial rigour,
 * embedding widget directives for rich inline content (charts, quotes, tables).
 */

import Anthropic from "@anthropic-ai/sdk";
import { db, schema } from "@/lib/db";
import { eq, desc, and } from "drizzle-orm";
import { getMultipleQuotes, type QuoteData } from "@/lib/market-data/yahoo";

interface WriterContext {
  prediction?: {
    id: number;
    claim: string;
    category: string;
    confidence: number;
    deadline: string;
    direction: string | null;
    priceTarget: number | null;
    referenceSymbol: string | null;
    outcome: string | null;
    outcomeNotes: string | null;
    score: number | null;
    regimeAtCreation: string | null;
    createdAt: string;
    resolvedAt: string | null;
  };
  signals: { title: string; intensity: number; category: string; description: string }[];
  recentPredictions: { claim: string; confidence: number; outcome: string | null; category: string }[];
  topic?: string;
}

const WRITER_SYSTEM = `You are the NEXUS Research Desk, producing institutional-grade intelligence analysis articles. Your writing style is that of a senior research analyst at a geopolitical risk consultancy or macro hedge fund.

VOICE:
- Academic precision with financial practitioner edge. You cite specific numbers, reference historical parallels, and ground every claim in observable data.
- Authoritative but not arrogant. You acknowledge uncertainty ranges and alternative scenarios.
- Dense with insight, not padded with filler. Every paragraph advances the argument.
- Use first person plural ("we") as the research desk voice.
- No emojis ever.

CRITICAL - DATA INTEGRITY:
- The source data includes LIVE MARKET DATA with real current prices. When referencing any instrument, currency pair, index, or commodity, you MUST use the exact price levels from this live data section. Do NOT guess or recall prices from training data.
- ONLY use statistics, percentages, price levels, contract values, and financial figures that are explicitly provided in the source data below. If a number is not in the source data, DO NOT invent it. Use directional language ("elevated", "significant increase", "multi-year highs") instead of fabricating specific values.
- NEVER fabricate GDP percentages, contract values, order book growth rates, spending figures, or currency movements unless they appear verbatim in the source data.
- For {{metric}} widgets: the value and change fields MUST come from the source data (especially the LIVE MARKET DATA section). If you cannot find a specific number in the source data, do NOT use a {{metric}} widget, just describe the trend in prose.
- Do not fabricate historical parallels. Only reference historical events if the connection is well-established and obvious (e.g. "oil embargo" only if the current situation directly involves oil supply disruption). Do not invent "anniversary windows" or forced historical connections.
- Do not present analysis as if reporting from a future date. Use present tense for current conditions.

ABSOLUTE PROHIBITIONS:
- NEVER use em dashes (the — character). Use commas instead. This is non-negotiable.
- NEVER reference celestial events, astrology, planetary conjunctions, Mars-Jupiter alignments, zodiac, lunar cycles, solar cycles, solstices, equinoxes, or any astrological/celestial concepts. Ground all analysis in observable economic, political, and market data only.
- NEVER use antithesis constructions ("It's not about X, it's about Y", "Less about X, more about Y").

STRUCTURE:
Write articles in markdown with these conventions:
- Open with a sharp thesis statement, no preamble or warm-up
- Use ## headers for major sections
- Include specific data points: percentages, price levels, dates, historical comparisons
- Reference regime context (peacetime/wartime/transitional)
- Include risk scenarios and alternative outcomes
- Close with a forward-looking assessment, not a summary

WIDGET DIRECTIVES:
You can embed rich widgets inline using these directives. Place them on their own line:

{{quote|symbol=TICKER}} - Embeds a live price quote widget for the given symbol
{{chart|symbol=TICKER|period=6M}} - Embeds a price chart (periods: 1M, 3M, 6M, 1Y, 5Y)
{{prediction|id=N}} - Embeds the prediction card with live status
{{signal|category=CAT}} - Shows recent signals for a category (market, geopolitical, etc.)
{{metric|label=LABEL|value=VALUE|change=+X%}} - Inline metric badge
{{callout|type=TYPE}} content {{/callout}} - Callout box (types: warning, insight, risk, bullish, bearish)
{{scenario-matrix}} JSON {{/scenario-matrix}} - Rich scenario matrix. The JSON must be an array of scenario objects:
[
  {"name":"Base Case","probability":"55%","description":"Brief description","indicators":["indicator 1","indicator 2"],"positioning":"What to do","color":"amber"},
  {"name":"Bull Case","probability":"25%","description":"Brief description","indicators":["indicator 1"],"positioning":"What to do","color":"emerald"},
  {"name":"Bear Case","probability":"20%","description":"Brief description","indicators":["indicator 1"],"positioning":"What to do","color":"rose"}
]
Valid colors: amber, emerald, rose, cyan. Use this for scenario frameworks instead of plain text bullets. Always include 2-4 scenarios with probabilities that sum to ~100%.

Use widgets where they add value, not decoratively. A price chart next to a price target discussion, a quote widget when referencing a specific instrument, a prediction card when building on a prior call. ALWAYS use {{scenario-matrix}} for scenario/outlook sections.

ARTICLE LENGTH:
Target 800-1500 words. Dense, no padding. Every section should earn its place.

RESPONSE FORMAT:
Return a JSON object:
{
  "title": "Article title (compelling, specific, not clickbait)",
  "excerpt": "2-3 sentence summary for the blog listing page",
  "body": "Full article in markdown with widget directives",
  "category": "market|geopolitical|macro|energy|commodities",
  "tags": ["tag1", "tag2", "tag3"],
  "readingTime": 6
}`;

/**
 * Hard-strip celestial/astrological content that should never appear in published articles.
 * This is a safety net in case the LLM fails to remove it.
 */
const CELESTIAL_PATTERNS = [
  /\b(?:Mars|Jupiter|Saturn|Venus|Mercury|Neptune|Uranus|Pluto)[\s-]+(?:conjunction|opposition|trine|square|sextile|alignment|transit|retrograde)\b/gi,
  /\b(?:conjunction|opposition|trine|square|sextile)\s+(?:with|of|between)\s+(?:Mars|Jupiter|Saturn|Venus|Mercury|Neptune|Uranus|Pluto)\b/gi,
  /\bplanetary\s+(?:alignment|conjunction|transit|cycle|configuration)\b/gi,
  /\bastrological\b/gi,
  /\bastrology\b/gi,
  /\bcelestial\s+(?:event|signal|indicator|pattern|alignment|cycle|convergence)\b/gi,
  /\bMars[\s-]+Jupiter\b/gi,
  /\blunar\s+(?:cycle|phase|node)\b/gi,
  /\bsolar\s+(?:cycle|return)\b/gi,
  /\bzodiac\b/gi,
  /\bhoroscop\w+\b/gi,
  /\b(?:Chanukah|Hanukkah)\s+(?:convergence|signal|correlation|effect)\b/gi,
  /\b(?:celestial|planetary|astrological)\s+convergence\b/gi,
  /\b(?:Winter|Summer)\s+Solstice\b/gi,
  /\b(?:Spring|Autumn|Vernal|Autumnal)\s+Equinox\b/gi,
  /\bsolstice\b/gi,
  /\bequinox\b/gi,
];

function stripCelestialContent(text: string): string {
  let result = text;
  for (const pattern of CELESTIAL_PATTERNS) {
    // Remove entire sentences containing celestial references
    result = result.replace(new RegExp(`[^.!?\\n]*${pattern.source}[^.!?\\n]*[.!?]?\\s*`, pattern.flags), "");
  }
  // Strip em dashes (replace with commas)
  result = result.replace(/\s*—\s*/g, ", ");
  // Clean up any double spaces or empty lines left behind
  result = result.replace(/\n{3,}/g, "\n\n").replace(/  +/g, " ").trim();
  return result;
}

/**
 * Strip celestial content from source data lines.
 * Removes entire bullet points/lines that contain celestial references
 * so the LLM never sees them in the first place.
 */
function sanitizeSourceData(text: string): string {
  const lines = text.split("\n");
  const filtered = lines.filter((line) => {
    if (/\b(?:mars[\s-]+jupiter|planetary|astrological|astrology|celestial|zodiac|horoscop|solstice|equinox)\b/i.test(line)) return false;
    if (/\b(?:conjunction|opposition|trine|square|sextile)\b/i.test(line) && /\b(?:mars|jupiter|saturn|venus|mercury|neptune|uranus|pluto)\b/i.test(line)) return false;
    if (/\b(?:lunar|solar)\s+(?:cycle|phase|node|return)\b/i.test(line)) return false;
    if (/\b(?:chanukah|hanukkah)\s+(?:convergence|signal|correlation)\b/i.test(line)) return false;
    if (/\b(?:winter|summer)\s+solstice\b/i.test(line)) return false;
    if (/\b(?:spring|autumn|vernal|autumnal)\s+equinox\b/i.test(line)) return false;
    return true;
  });
  return filtered.join("\n");
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)
    .replace(/-$/, "");
}

async function gatherContext(predictionId?: number, topic?: string): Promise<WriterContext> {
  const ctx: WriterContext = {
    signals: [],
    recentPredictions: [],
    topic,
  };

  // Fetch prediction if specified
  if (predictionId) {
    const rows = await db.select().from(schema.predictions).where(eq(schema.predictions.id, predictionId));
    if (rows.length > 0) {
      const p = rows[0];
      ctx.prediction = {
        id: p.id,
        claim: p.claim,
        category: p.category,
        confidence: p.confidence,
        deadline: p.deadline,
        direction: p.direction,
        priceTarget: p.priceTarget,
        referenceSymbol: p.referenceSymbol,
        outcome: p.outcome,
        outcomeNotes: p.outcomeNotes,
        score: p.score,
        regimeAtCreation: p.regimeAtCreation,
        createdAt: p.createdAt,
        resolvedAt: p.resolvedAt,
      };
    }
  }

  // Recent signals
  const signals = await db.select().from(schema.signals).orderBy(desc(schema.signals.id)).limit(10);
  ctx.signals = signals.map((s) => ({
    title: s.title,
    intensity: s.intensity,
    category: s.category,
    description: s.description.slice(0, 200),
  }));

  // Recent predictions for context
  const preds = await db.select().from(schema.predictions).orderBy(desc(schema.predictions.id)).limit(15);
  ctx.recentPredictions = preds.map((p) => ({
    claim: p.claim,
    confidence: p.confidence,
    outcome: p.outcome,
    category: p.category,
  }));

  return ctx;
}

/**
 * Fetch existing blog post titles for dedup checking.
 */
async function getExistingTitles(): Promise<string[]> {
  const rows = await db.select({ title: schema.blogPosts.title }).from(schema.blogPosts);
  return rows.map((r) => r.title.toLowerCase());
}

function buildPrompt(ctx: WriterContext, existingTitles: string[]): string {
  const lines: string[] = [];

  if (ctx.prediction) {
    const p = ctx.prediction;
    lines.push(`FOCUS: Write an analysis article centred on this prediction:\n`);
    lines.push(`Claim: ${p.claim}`);
    lines.push(`Confidence: ${(p.confidence * 100).toFixed(0)}%`);
    lines.push(`Category: ${p.category}`);
    lines.push(`Direction: ${p.direction || "N/A"}`);
    if (p.referenceSymbol) lines.push(`Reference: ${p.referenceSymbol}`);
    if (p.priceTarget) lines.push(`Price target: $${p.priceTarget}`);
    lines.push(`Deadline: ${p.deadline}`);
    lines.push(`Regime at creation: ${p.regimeAtCreation || "unknown"}`);
    if (p.outcome) {
      lines.push(`\nOUTCOME: ${p.outcome}`);
      if (p.outcomeNotes) lines.push(`Notes: ${p.outcomeNotes}`);
      if (p.score != null) lines.push(`Brier score: ${p.score.toFixed(3)}`);
      lines.push(`\nWrite a post-mortem analysis. What happened, why, what it means going forward.`);
    } else {
      lines.push(`\nThis prediction is ACTIVE. Write a forward-looking analysis.`);
      lines.push(`Use {{prediction|id=${p.id}}} to embed the live prediction card.`);
    }
    if (p.referenceSymbol) {
      lines.push(`\nEmbed {{quote|symbol=${p.referenceSymbol}}} and {{chart|symbol=${p.referenceSymbol}|period=3M}} where relevant.`);
    }
  } else if (ctx.topic) {
    lines.push(`TOPIC: Write an analysis article about: ${ctx.topic}\n`);
    lines.push(`Draw on the signals and predictions below for context and data points.`);
  } else {
    // Auto-topic mode: let Claude pick the most compelling topic
    lines.push(`TASK: Based on the current signals and predictions below, identify the single most compelling and timely topic that readers interested in geopolitics, macro, and markets would want to read about RIGHT NOW. Then write a deep analysis article on that topic.\n`);
    lines.push(`Choose something specific and actionable, not generic. Focus on what is unfolding, why it matters, and what comes next. Reference specific data points, instruments, and predictions where relevant.`);
  }

  if (ctx.signals.length > 0) {
    lines.push(`\nACTIVE SIGNALS:`);
    for (const s of ctx.signals.slice(0, 6)) {
      lines.push(`- [${s.category}] ${s.title} (intensity ${s.intensity}/5): ${s.description}`);
    }
  }

  if (ctx.recentPredictions.length > 0) {
    lines.push(`\nRECENT PREDICTIONS:`);
    for (const p of ctx.recentPredictions.slice(0, 8)) {
      const status = p.outcome ? `[${p.outcome}]` : "[active]";
      lines.push(`- ${status} ${p.claim.slice(0, 100)} (${(p.confidence * 100).toFixed(0)}%) [${p.category}]`);
    }
  }

  // Dedup: provide existing titles so Claude avoids overlap
  if (existingTitles.length > 0) {
    lines.push(`\nEXISTING ARTICLES (do NOT duplicate these topics, find a fresh angle):`);
    for (const t of existingTitles.slice(0, 20)) {
      lines.push(`- ${t}`);
    }
  }

  lines.push(`\nToday: ${new Date().toISOString().split("T")[0]}`);

  return lines.join("\n");
}

export interface GenerateArticleResult {
  id: number;
  slug: string;
  title: string;
  status: string;
}

/** Cost tracking for article generation pipeline. */
export interface GenerationCost {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  model: string;
  calls: { step: string; inputTokens: number; outputTokens: number; costUsd: number }[];
}

// Opus 4.6 pricing: $15/M input, $75/M output
const OPUS_INPUT_PER_TOKEN = 15 / 1_000_000;
const OPUS_OUTPUT_PER_TOKEN = 75 / 1_000_000;

function trackUsage(
  cost: GenerationCost,
  step: string,
  response: { usage: { input_tokens: number; output_tokens: number } }
) {
  const inp = response.usage.input_tokens;
  const out = response.usage.output_tokens;
  const stepCost = inp * OPUS_INPUT_PER_TOKEN + out * OPUS_OUTPUT_PER_TOKEN;
  cost.totalInputTokens += inp;
  cost.totalOutputTokens += out;
  cost.totalCostUsd += stepCost;
  cost.calls.push({ step, inputTokens: inp, outputTokens: out, costUsd: stepCost });
}

function newCost(): GenerationCost {
  return { totalInputTokens: 0, totalOutputTokens: 0, totalCostUsd: 0, model: "claude-opus-4-6", calls: [] };
}

/** Progress events emitted during article generation for real-time UI updates. */
export type GenerationEvent =
  | { type: "premise"; premise: string; angle: string; suggestedTitle: string }
  | { type: "draft"; article: { title: string; excerpt: string; body: string; category: string } }
  | { type: "validating"; iteration: number; maxIterations: number }
  | { type: "validated"; iteration: number; score: number; verdict: string; scores: Record<string, number>; issues: string[]; suggestions: string[]; strengths: string[] }
  | { type: "fixing"; iteration: number; issueCount: number; suggestionCount: number }
  | { type: "fixed"; iteration: number; article: { title: string; excerpt: string; body: string; category: string } }
  | { type: "complete"; id: number; slug: string; title: string; score: number; cost: GenerationCost }
  | { type: "error"; message: string };

interface ArticleJSON {
  title: string;
  excerpt: string;
  body: string;
  category: string;
  tags: string[];
  readingTime: number;
}

function parseArticleJSON(text: string): ArticleJSON {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse article JSON from response");
  return JSON.parse(jsonMatch[0]);
}

const REWRITE_SYSTEM = `You are the NEXUS Research Desk editor. You are given a draft article and a list of issues found by a fact-checker. Rewrite the article to fix ALL issues while maintaining the voice and structure.

RULES:
- The source data includes LIVE MARKET DATA with real current prices. ALL price levels, exchange rates, and index values in the article MUST match the live data. If the article cites a wrong price (e.g. says a pair is at 0.88 when live data shows 0.79), correct it to the real value.
- Remove or correct any hallucinated data points. If a statistic, percentage, dollar amount, contract value, or growth rate cannot be found verbatim in the provided source data, REMOVE the entire sentence. Replace with directional analysis ("elevated levels", "significant increase") rather than fabricating numbers.
- For {{metric}} widgets: if the value or change% is not in the source data, remove the widget entirely and describe the trend in prose instead.
- Remove ALL celestial/astrological references completely, including solstice, equinox, and any calendar-spiritual terms. Delete them, do not rephrase.
- Replace EVERY em dash (—) with a comma. Search the entire article for — and fix all instances.
- Remove any antithesis constructions ("It's not about X, it's about Y", "Less about X, more about Y").
- Remove forced historical parallels that are not directly relevant (e.g. "1973 Oil Embargo anniversary" unless discussing an actual current oil embargo).
- Do not add new speculative claims. Only state what the source data supports.
- Do not present analysis as if writing from a future date. Use present tense.
- Keep the same JSON response format as the original article.
- Maintain the NEXUS Research Desk voice: academic precision, first person plural, dense with insight.

Respond with the corrected article as a JSON object:
{
  "title": "...",
  "excerpt": "...",
  "body": "...",
  "category": "...",
  "tags": [...],
  "readingTime": N
}`;

const PREMISE_SYSTEM = `You are a senior research strategist at NEXUS Intelligence. Your job is to identify the single most compelling, timely, and genuinely interesting premise for an intelligence analysis article based on real-time data.

RULES:
- Analyze the provided signals, predictions, and context to find a NON-OBVIOUS angle that connects multiple data points into a coherent thesis.
- The premise must be grounded in the provided data. Do not invent data points.
- Avoid generic topics ("markets are volatile", "geopolitical tensions rising"). Find something specific and surprising.
- The premise should have clear implications for positioning, risk, or decision-making.
- NEVER involve celestial events, astrology, planetary conjunctions, zodiac, or any astrological concepts. Ignore any such data in the source.

Respond with JSON:
{
  "premise": "One paragraph describing the core thesis and why it matters right now",
  "angle": "The specific non-obvious connection or insight that makes this interesting",
  "dataPoints": ["specific data point 1 from source", "specific data point 2 from source"],
  "category": "market|geopolitical|macro|energy|commodities",
  "suggestedTitle": "Working title"
}`;

const ANALYSIS_SYSTEM = `You are a senior editorial quality assessor for an intelligence research publication. Rate the given article with academic and scientific rigour.

SCORING (1-10 for each, be STRICT):
- accuracy: Are ALL claims, statistics, percentages, and assertions grounded in the provided source data? Check EVERY number in the article against source data. ANY fabricated statistic, percentage, dollar amount, or metric value = max score 4. ANY celestial/astrological reference = max score 2. ANY forced/fabricated historical parallel = deduct 2 points.
- depth: Does the article provide genuine analytical insight beyond surface-level reporting? Non-obvious connections, well-grounded second-order effects?
- clarity: Is the structure logical? Do sections flow naturally? Dense without being confusing?
- voice: Senior research analyst at a macro hedge fund. First person plural, no filler, no clickbait, no emojis. CHECK FOR: em dashes (the — character, NOT hyphens) = deduct 1 point. Antithesis constructions ("It's not about X, it's about Y", "Less about X, more about Y") = deduct 1 point. Overly dramatic titles or phrasing = deduct 1 point. Note: if the prose reads with authority, density, and professional tone, voice should score 8+ even with minor stylistic issues.
- actionability: Does the reader leave knowing what to watch, what might happen, and how to position?

SPECIFIC CHECKS:
- Search the article for the — character (em dash). If found even once, voice score cannot exceed 5.
- Check all {{metric}} widget values against source data. If the value or change% is not in the source, flag as fabricated.
- Check ALL price levels, exchange rates, and index values against the LIVE MARKET DATA in the source. If the article cites a price that contradicts the live data (e.g. says USD/CHF is at 0.88 when live data shows 0.79), accuracy cannot exceed 3. This is the most critical check.
- Check for celestial/astrological terms: solstice, equinox, conjunction, planetary, zodiac, lunar cycle, Mars-Jupiter. If found, accuracy = 2.

VERDICT:
- "publish": overallScore 9+ AND all individual scores 8+
- "needs-work": any score below 8
- "reject": any score below 5, or major factual problems

Be extremely rigorous. A 9/10 article should be publishable in a professional research note. Most articles need multiple revision rounds to reach this bar.

Respond with JSON:
{
  "overallScore": N,
  "scores": { "accuracy": N, "depth": N, "clarity": N, "voice": N, "actionability": N },
  "verdict": "publish|needs-work|reject",
  "issues": ["specific issue 1", "specific issue 2"],
  "strengths": ["what works well"],
  "suggestions": ["specific improvement 1"]
}`;

/**
 * Full synthesis pipeline for article generation:
 *
 * 1. PREMISE: Identify genuinely interesting angle from latest data
 * 2. DRAFT: Generate article grounded in the premise + source data
 * 3. VALIDATE: Academic/scientific rigour check with scoring
 * 4. FIX: Rewrite addressing every issue + incorporating suggestions
 * 5. VALIDATE again
 * 6. Repeat fix/validate loop until overallScore >= 9 (max 4 iterations)
 * 7. Hard sanitize + persist
 */
function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  return new Anthropic({ apiKey });
}

// Key instruments to fetch live prices for article grounding
const MARKET_WATCHLIST = [
  "SPY", "QQQ", "DIA",           // US indices
  "VIX",                          // Volatility
  "GLD", "SLV", "PPLT",          // Precious metals
  "USO", "BNO",                   // Oil (WTI, Brent proxy)
  "UNG",                          // Natural gas
  "EUR/USD", "USD/JPY", "USD/CHF", "GBP/USD", "USD/CAD", "AUD/USD",  // Major FX
  "USD/ZAR", "USD/TRY", "USD/MXN", // EM FX
  "BTC", "ETH",                    // Crypto
  "TLT", "HYG",                   // Bonds
  "EWH",                          // Hong Kong (Hang Seng proxy)
  "EWZ", "EWJ",                   // Brazil, Japan
  "DXY",                          // Dollar index (UUP as proxy)
];

async function fetchLiveMarketData(): Promise<string> {
  try {
    const quotes = await getMultipleQuotes(MARKET_WATCHLIST);
    if (quotes.length === 0) return "";

    const lines = ["LIVE MARKET DATA (as of " + new Date().toISOString().split("T")[0] + "):", "Use ONLY these real prices when referencing market levels. Do NOT invent prices.", ""];
    for (const q of quotes) {
      const dir = q.change >= 0 ? "+" : "";
      lines.push(`${q.symbol}: $${q.price.toFixed(q.price < 10 ? 4 : 2)} (${dir}${q.changePercent.toFixed(2)}%)${q.high52w ? ` | 52w: $${q.low52w?.toFixed(2)}-$${q.high52w.toFixed(2)}` : ""}`);
    }
    return lines.join("\n");
  } catch (err) {
    console.error("[blog] Failed to fetch live market data:", err);
    return "";
  }
}

async function getSourceData(predictionId?: number, topic?: string): Promise<{ ctx: WriterContext; sourceData: string }> {
  const [ctx, existingTitles, marketData] = await Promise.all([
    gatherContext(predictionId, topic),
    getExistingTitles(),
    fetchLiveMarketData(),
  ]);
  const rawPrompt = buildPrompt(ctx, existingTitles);
  // Strip celestial content from source data so the LLM never sees it
  const sourceData = sanitizeSourceData(marketData + "\n\n" + rawPrompt);
  return { ctx, sourceData };
}

export async function generateArticle(opts: {
  predictionId?: number;
  topic?: string;
  autoPublish?: boolean;
  onProgress?: (event: GenerationEvent) => void;
}): Promise<GenerateArticleResult> {
  const client = getClient();
  const { sourceData } = await getSourceData(opts.predictionId, opts.topic);
  const emit = opts.onProgress || (() => {});
  const cost = newCost();

  // ── Step 1: Establish premise ──
  let premisePrompt = sourceData;
  if (!opts.predictionId && !opts.topic) {
    console.log("[blog] Step 1: Establishing premise...");
    const premiseRes = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      system: PREMISE_SYSTEM,
      messages: [{ role: "user", content: sourceData }],
    });
    trackUsage(cost, "premise", premiseRes);
    const premiseText = premiseRes.content[0].type === "text" ? premiseRes.content[0].text : "";
    try {
      const match = premiseText.match(/\{[\s\S]*\}/);
      if (match) {
        const premise = JSON.parse(match[0]);
        premisePrompt = `${sourceData}\n\nESTABLISHED PREMISE (write the article around this):\n${premise.premise}\n\nANGLE: ${premise.angle}\n\nGROUNDED DATA POINTS (use ONLY these numbers):\n${(premise.dataPoints || []).map((d: string) => `- ${d}`).join("\n")}\n\nSuggested category: ${premise.category}`;
        console.log(`[blog] Premise established: ${premise.suggestedTitle}`);
        emit({ type: "premise", premise: premise.premise, angle: premise.angle, suggestedTitle: premise.suggestedTitle || "" });
      }
    } catch {
      console.warn("[blog] Premise parse failed, using auto-topic mode");
    }
  }

  // ── Step 2: Generate draft ──
  console.log("[blog] Step 2: Generating draft...");
  const draftRes = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    system: WRITER_SYSTEM,
    messages: [{ role: "user", content: premisePrompt }],
  });

  trackUsage(cost, "draft", draftRes);
  const draftText = draftRes.content[0].type === "text" ? draftRes.content[0].text : "";
  let article = parseArticleJSON(draftText);
  emit({ type: "draft", article: { title: article.title, excerpt: article.excerpt, body: article.body, category: article.category } });

  // ── Step 3-6: Validate/Fix loop until 9/10 or max iterations ──
  const MAX_ITERATIONS = 6;
  let lastAnalysis: ArticleAnalysis | null = null;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    // Hard sanitize before each validation
    article.body = stripCelestialContent(article.body);
    article.excerpt = stripCelestialContent(article.excerpt);
    article.title = stripCelestialContent(article.title);

    // Validate
    emit({ type: "validating", iteration: i + 1, maxIterations: MAX_ITERATIONS });
    console.log(`[blog] Validating (iteration ${i + 1}/${MAX_ITERATIONS})...`);
    const analysisRes = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      system: ANALYSIS_SYSTEM,
      messages: [{
        role: "user",
        content: `SOURCE DATA (ground truth):\n${sourceData}\n\nARTICLE TO ASSESS:\nTitle: ${article.title}\nExcerpt: ${article.excerpt}\n\n${article.body}`,
      }],
    });

    trackUsage(cost, `validate-${i + 1}`, analysisRes);
    const analysisText = analysisRes.content[0].type === "text" ? analysisRes.content[0].text : "";
    try {
      const match = analysisText.match(/\{[\s\S]*\}/);
      if (match) lastAnalysis = JSON.parse(match[0]);
    } catch {
      lastAnalysis = null;
    }

    if (!lastAnalysis) {
      console.warn(`[blog] Validation parse failed on iteration ${i + 1}, continuing`);
      continue;
    }

    console.log(`[blog] Score: ${lastAnalysis.overallScore}/10 (${lastAnalysis.verdict})`);
    emit({
      type: "validated",
      iteration: i + 1,
      score: lastAnalysis.overallScore,
      verdict: lastAnalysis.verdict,
      scores: lastAnalysis.scores,
      issues: lastAnalysis.issues || [],
      suggestions: lastAnalysis.suggestions || [],
      strengths: lastAnalysis.strengths || [],
    });

    // If we've crossed the publishable threshold (8/10), stop
    if (lastAnalysis.overallScore >= 8) {
      console.log(`[blog] Passed publishable threshold (${lastAnalysis.overallScore}/10) at iteration ${i + 1}`);
      break;
    }

    // If last iteration, don't fix (we'll use what we have)
    if (i === MAX_ITERATIONS - 1) {
      console.log(`[blog] Max iterations reached, using best version (score: ${lastAnalysis.overallScore})`);
      break;
    }

    // Fix issues
    const issues = lastAnalysis.issues || [];
    const suggestions = lastAnalysis.suggestions || [];
    if (issues.length === 0 && suggestions.length === 0) break;

    emit({ type: "fixing", iteration: i + 1, issueCount: issues.length, suggestionCount: suggestions.length });
    console.log(`[blog] Fixing ${issues.length} issues, ${suggestions.length} suggestions...`);
    const fixRes = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      system: REWRITE_SYSTEM,
      messages: [{
        role: "user",
        content: `SOURCE DATA:\n${sourceData}\n\nCURRENT ARTICLE (JSON):\n${JSON.stringify(article, null, 2)}\n\nCURRENT SCORE: ${lastAnalysis.overallScore}/10 (scores: ${JSON.stringify(lastAnalysis.scores)})\nTARGET: 9/10 minimum. Fix EVERY issue below to push the score up.\n\nISSUES TO FIX:\n${issues.map((issue, idx) => `${idx + 1}. ${issue}`).join("\n")}\n\nSUGGESTIONS TO INCORPORATE:\n${suggestions.map((sug, idx) => `${idx + 1}. ${sug}`).join("\n")}`,
      }],
    });

    trackUsage(cost, `fix-${i + 1}`, fixRes);
    const fixText = fixRes.content[0].type === "text" ? fixRes.content[0].text : "";
    try {
      article = parseArticleJSON(fixText);
      emit({ type: "fixed", iteration: i + 1, article: { title: article.title, excerpt: article.excerpt, body: article.body, category: article.category } });
    } catch {
      console.warn(`[blog] Fix parse failed on iteration ${i + 1}, keeping previous version`);
    }
  }

  // ── Final hard sanitize ──
  article.body = stripCelestialContent(article.body);
  article.excerpt = stripCelestialContent(article.excerpt);
  article.title = stripCelestialContent(article.title);

  // ── Persist ──
  const slug = slugify(article.title) + "-" + Date.now().toString(36);
  const status = opts.autoPublish ? "published" : "draft";
  const publishedAt = opts.autoPublish ? new Date().toISOString() : null;

  const rows = await db.insert(schema.blogPosts).values({
    slug,
    title: article.title,
    excerpt: article.excerpt,
    body: article.body,
    category: article.category,
    predictionId: opts.predictionId || null,
    status,
    readingTime: article.readingTime || 6,
    tags: JSON.stringify(article.tags || []),
    publishedAt,
  }).returning();

  const finalScore = lastAnalysis?.overallScore ?? 0;
  console.log(`[blog] Article persisted: "${article.title}" (score: ${finalScore}/10, status: ${status}, cost: $${cost.totalCostUsd.toFixed(4)}, tokens: ${cost.totalInputTokens}in/${cost.totalOutputTokens}out, calls: ${cost.calls.length})`);

  emit({ type: "complete", id: rows[0].id, slug: rows[0].slug, title: rows[0].title, score: finalScore, cost });

  return {
    id: rows[0].id,
    slug: rows[0].slug,
    title: rows[0].title,
    status: rows[0].status,
  };
}

/**
 * Refine an existing article: fact-check and rewrite to improve quality.
 */
export async function refineArticle(opts: {
  title: string;
  excerpt: string;
  body: string;
}): Promise<{ title: string; excerpt: string; body: string }> {
  const client = getClient();
  const { sourceData } = await getSourceData();

  const refineRes = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    system: `You are the NEXUS Research Desk editor performing a refinement pass on an existing article.

CRITICAL - MUST DO:
- SCAN THE ENTIRE ARTICLE for any mention of: celestial events, planetary conjunctions, Mars, Jupiter, Saturn, Venus, Mercury, Neptune, Uranus, Pluto (in astrological context), astrology, zodiac, lunar cycles, solar cycles, celestial signals, planetary alignments, convergence signals involving planets, or ANY astrological/celestial concepts. DELETE every sentence containing these. No exceptions. These are internal model inputs that must never appear in published content. Replace the deleted sentences with analysis grounded in economic or political data instead.
- Remove ANY em dashes. Replace with commas.
- Remove ANY antithesis constructions ("It's not about X, it's about Y").

QUALITY:
- Tighten the prose. Remove filler, redundancy, and vague claims.
- Verify all data points against the source data. Remove anything not grounded in the provided signals/predictions.
- Strengthen the analysis: sharpen the thesis, improve transitions, make conclusions more actionable.
- Do NOT change the core argument or topic, just improve execution.
- Maintain first person plural voice ("we").
- No emojis.

Respond with a JSON object:
{
  "title": "refined title",
  "excerpt": "refined excerpt",
  "body": "refined body in markdown"
}`,
    messages: [{
      role: "user",
      content: `SOURCE DATA:\n${sourceData}\n\nARTICLE TO REFINE:\nTitle: ${opts.title}\nExcerpt: ${opts.excerpt}\n\nBody:\n${opts.body}\n\nREMINDER: Search the ENTIRE body for ANY celestial/astrological references and remove them. This is the most important requirement.`,
    }],
  });

  const text = refineRes.content[0].type === "text" ? refineRes.content[0].text : "";
  const parsed = parseArticleJSON(text);

  // Hard sanitize as safety net
  return {
    title: stripCelestialContent(parsed.title),
    excerpt: stripCelestialContent(parsed.excerpt),
    body: stripCelestialContent(parsed.body),
  };
}

export interface ArticleAnalysis {
  overallScore: number; // 1-10
  scores: {
    accuracy: number;    // 1-10: are claims grounded in data?
    depth: number;       // 1-10: analytical depth and insight density
    clarity: number;     // 1-10: structure, flow, readability
    voice: number;       // 1-10: adherence to research desk voice
    actionability: number; // 1-10: does the reader walk away knowing what to do?
  };
  verdict: "publish" | "needs-work" | "reject";
  issues: string[];
  strengths: string[];
  suggestions: string[];
}

/**
 * Analyze an article for quality, accuracy, and publishability.
 * Uses the same strict ANALYSIS_SYSTEM as the generation pipeline (9/10 threshold).
 */
export async function analyzeArticle(opts: {
  title: string;
  excerpt: string;
  body: string;
}): Promise<ArticleAnalysis> {
  const client = getClient();
  const { sourceData } = await getSourceData();

  const res = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 2048,
    system: ANALYSIS_SYSTEM,
    messages: [{
      role: "user",
      content: `SOURCE DATA (ground truth for accuracy checking):\n${sourceData}\n\nARTICLE TO ASSESS:\nTitle: ${opts.title}\nExcerpt: ${opts.excerpt}\n\n${opts.body}`,
    }],
  });

  const text = res.content[0].type === "text" ? res.content[0].text : "";
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch {}

  return {
    overallScore: 0,
    scores: { accuracy: 0, depth: 0, clarity: 0, voice: 0, actionability: 0 },
    verdict: "needs-work",
    issues: ["Analysis failed to parse"],
    strengths: [],
    suggestions: [],
  };
}

/**
 * Fix an article based on analysis feedback (issues + suggestions).
 * Used in the analysis feedback loop to iteratively improve quality.
 */
export async function fixFromAnalysis(opts: {
  title: string;
  excerpt: string;
  body: string;
  issues: string[];
  suggestions: string[];
}): Promise<{ title: string; excerpt: string; body: string }> {
  const client = getClient();
  const { sourceData } = await getSourceData();

  const issuesList = opts.issues.map((i, n) => `${n + 1}. ${i}`).join("\n");
  const suggestionsList = opts.suggestions.map((s, n) => `${n + 1}. ${s}`).join("\n");

  const res = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    system: `You are the NEXUS Research Desk editor. You are given an article and specific issues/suggestions from a quality analysis. Your job is to fix EVERY issue and incorporate EVERY suggestion to produce the best possible version.

RULES:
- Address EVERY issue listed. Do not skip any.
- Incorporate EVERY suggestion where it improves the article.
- Verify all data points against the source data. Remove anything not grounded in provided signals/predictions.
- Remove any celestial/astrological references completely.
- Remove any em dashes. Use commas instead.
- Remove any antithesis constructions.
- Maintain first person plural ("we") research desk voice.
- Dense with insight, no filler or padding.
- No emojis.
- Do NOT change the core topic or argument, just improve execution and fix the flagged problems.

Respond with a JSON object:
{
  "title": "improved title",
  "excerpt": "improved excerpt",
  "body": "improved body in markdown"
}`,
    messages: [{
      role: "user",
      content: `SOURCE DATA:\n${sourceData}\n\nARTICLE TO FIX:\nTitle: ${opts.title}\nExcerpt: ${opts.excerpt}\n\nBody:\n${opts.body}\n\nISSUES TO FIX:\n${issuesList}\n\nSUGGESTIONS TO INCORPORATE:\n${suggestionsList}`,
    }],
  });

  const text = res.content[0].type === "text" ? res.content[0].text : "";
  const parsed = parseArticleJSON(text);

  return {
    title: stripCelestialContent(parsed.title),
    excerpt: stripCelestialContent(parsed.excerpt),
    body: stripCelestialContent(parsed.body),
  };
}

/**
 * Craft a Twitter thread for a published article.
 * Returns an array of tweet texts (thread format).
 */
export async function craftArticleThread(opts: {
  title: string;
  excerpt: string;
  body: string;
  slug: string;
  category: string;
}): Promise<string[]> {
  const client = getClient();
  const articleUrl = `https://nexusintelligence.io/blog/${opts.slug}`;

  const res = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 2048,
    system: `You write Twitter threads for NEXUS Intelligence (@nexaboratorio). You're promoting an article we just published.

VOICE RULES:
- Write like speech. Chain thoughts with commas, flow naturally
- Comma splices fine. Contractions always
- No emojis ever. No em dashes (use commas). No ALL CAPS
- No exclamation marks. No sycophantic openers
- No "Let's dive in", "Here's the thing", "buckle up"
- No hashtags in the body text
- No formulaic antithesis
- Authoritative research desk tone, not hype

THREAD STRUCTURE (3-5 tweets):
1. Hook: the single most compelling insight or finding from the article. Make it stand alone as a strong take. Under 280 chars.
2-3. Supporting points: 1-2 key data points, regime context, or implications that make someone want to read more. Each under 280 chars.
4. Final tweet: brief sign-off with the article link and a follow CTA. Format: "[one sentence wrap-up]\n\nFull analysis: [URL]\n\nFollow @nexaboratorio for daily intelligence." Under 280 chars.

Respond with a JSON array of tweet strings:
["tweet 1", "tweet 2", "tweet 3", "tweet 4"]`,
    messages: [{
      role: "user",
      content: `ARTICLE:\nTitle: ${opts.title}\nCategory: ${opts.category}\nExcerpt: ${opts.excerpt}\n\n${opts.body.slice(0, 3000)}\n\nArticle URL: ${articleUrl}\nTwitter handle: @nexaboratorio`,
    }],
  });

  const text = res.content[0].type === "text" ? res.content[0].text : "";
  try {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      const tweets: string[] = JSON.parse(match[0]);
      return tweets.filter((t) => typeof t === "string" && t.length > 0);
    }
  } catch {}

  return [];
}

/**
 * List published blog posts for the public blog.
 */
export async function listPublishedPosts(limit = 20, offset = 0) {
  return db.select({
    id: schema.blogPosts.id,
    slug: schema.blogPosts.slug,
    title: schema.blogPosts.title,
    excerpt: schema.blogPosts.excerpt,
    category: schema.blogPosts.category,
    author: schema.blogPosts.author,
    readingTime: schema.blogPosts.readingTime,
    tags: schema.blogPosts.tags,
    publishedAt: schema.blogPosts.publishedAt,
  })
    .from(schema.blogPosts)
    .where(eq(schema.blogPosts.status, "published"))
    .orderBy(desc(schema.blogPosts.publishedAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get a single post by slug.
 * If allowUnpublished is true, returns drafts and archived posts too.
 */
export async function getPostBySlug(slug: string, allowUnpublished = false) {
  const conditions = [eq(schema.blogPosts.slug, slug)];
  if (!allowUnpublished) {
    conditions.push(eq(schema.blogPosts.status, "published"));
  }
  const rows = await db.select().from(schema.blogPosts).where(and(...conditions));
  return rows[0] || null;
}

/**
 * List all posts for admin (all statuses).
 */
export async function listAllPosts() {
  return db.select().from(schema.blogPosts).orderBy(desc(schema.blogPosts.id));
}
