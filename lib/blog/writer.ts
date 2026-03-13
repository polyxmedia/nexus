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
import { eq, desc, and, isNotNull } from "drizzle-orm";

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
- Never use em dashes. Use commas instead.
- Never use antithesis constructions ("It's not about X, it's about Y").
- No emojis ever.

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

Use widgets where they add value, not decoratively. A price chart next to a price target discussion, a quote widget when referencing a specific instrument, a prediction card when building on a prior call.

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

function buildPrompt(ctx: WriterContext): string {
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

  lines.push(`\nToday: ${new Date().toISOString().split("T")[0]}`);

  return lines.join("\n");
}

export interface GenerateArticleResult {
  id: number;
  slug: string;
  title: string;
  status: string;
}

/**
 * Generate a blog article using Claude, grounded in NEXUS intelligence.
 * Returns the created post metadata.
 */
export async function generateArticle(opts: {
  predictionId?: number;
  topic?: string;
  autoPublish?: boolean;
}): Promise<GenerateArticleResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const ctx = await gatherContext(opts.predictionId, opts.topic);
  if (!ctx.prediction && !ctx.topic) {
    throw new Error("Must provide a predictionId or topic");
  }

  const client = new Anthropic({ apiKey });
  const prompt = buildPrompt(ctx);

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: WRITER_SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse article from Claude response");

  let article: {
    title: string;
    excerpt: string;
    body: string;
    category: string;
    tags: string[];
    readingTime: number;
  };
  try {
    article = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error("Invalid JSON in Claude response");
  }

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

  return {
    id: rows[0].id,
    slug: rows[0].slug,
    title: rows[0].title,
    status: rows[0].status,
  };
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
 * Get a single post by slug (public).
 */
export async function getPostBySlug(slug: string) {
  const rows = await db.select().from(schema.blogPosts).where(
    and(eq(schema.blogPosts.slug, slug), eq(schema.blogPosts.status, "published"))
  );
  return rows[0] || null;
}

/**
 * List all posts for admin (all statuses).
 */
export async function listAllPosts() {
  return db.select().from(schema.blogPosts).orderBy(desc(schema.blogPosts.id));
}
