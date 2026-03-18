import { db, schema } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { getSettingValue } from "@/lib/settings/get-setting";

const VOYAGE_MODEL = "voyage-3";
const EMBEDDING_DIM = 1024;

/**
 * Get the Voyage/Anthropic API key from settings or env.
 */
async function getApiKey(): Promise<string> {
  // Check for dedicated Voyage key first, fall back to Anthropic key
  const voyageKey = await getSettingValue("voyage_api_key", process.env.VOYAGE_API_KEY);
  if (voyageKey) return voyageKey;

  const anthropicKey = await getSettingValue("anthropic_api_key", process.env.ANTHROPIC_API_KEY);
  if (anthropicKey) return anthropicKey;

  return "";
}

/**
 * Generate embeddings for one or more texts using Voyage AI.
 */
export async function generateEmbeddings(
  texts: string[],
  inputType: "document" | "query" = "document"
): Promise<number[][]> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error("No API key configured for embeddings (set Voyage or Anthropic key)");

  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input: texts,
      input_type: inputType,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Voyage API error ${res.status}: ${errText}`);
  }

  const data = await res.json();

  // Track usage for cost monitoring (non-blocking)
  if (data.usage?.total_tokens) {
    trackVoyageUsage(data.usage.total_tokens, texts.length).catch(() => {});
  }

  return data.data.map((d: { embedding: number[] }) => d.embedding);
}

/**
 * Track Voyage API usage in settings for cost monitoring.
 * Stores cumulative token count and call count per month.
 */
async function trackVoyageUsage(tokens: number, texts: number): Promise<void> {
  const period = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}`;
  const key = `voyage_usage:${period}`;
  try {
    const rows = await db.select().from(schema.settings).where(eq(schema.settings.key, key));
    if (rows.length > 0) {
      const existing = JSON.parse(rows[0].value);
      existing.tokens = (existing.tokens || 0) + tokens;
      existing.calls = (existing.calls || 0) + 1;
      existing.texts = (existing.texts || 0) + texts;
      await db.update(schema.settings).set({ value: JSON.stringify(existing), updatedAt: new Date().toISOString() }).where(eq(schema.settings.key, key));
    } else {
      await db.insert(schema.settings).values({ key, value: JSON.stringify({ tokens, calls: 1, texts, period }), updatedAt: new Date().toISOString() });
    }
  } catch {
    // Non-critical, don't fail embedding on tracking error
  }
}

/**
 * Generate a single embedding for a text.
 */
export async function generateEmbedding(
  text: string,
  inputType: "document" | "query" = "document"
): Promise<number[]> {
  const [embedding] = await generateEmbeddings([text], inputType);
  return embedding;
}

/**
 * Build the text that gets embedded for a knowledge entry.
 * Combines title, content, category, and tags for rich representation.
 */
export function buildEmbeddingText(entry: {
  title: string;
  content: string;
  category: string;
  tags?: string | null;
}): string {
  let text = `${entry.title}\n\n${entry.content}`;
  text += `\n\nCategory: ${entry.category}`;
  if (entry.tags) {
    try {
      const tags = JSON.parse(entry.tags) as string[];
      text += `\nTags: ${tags.join(", ")}`;
    } catch {
      // ignore
    }
  }
  return text;
}

/**
 * Embed a knowledge entry and store the vector in Postgres.
 */
export async function embedKnowledgeEntry(id: number): Promise<void> {
  const rows = await db
    .select()
    .from(schema.knowledge)
    .where(eq(schema.knowledge.id, id));
  const entry = rows[0];
  if (!entry) return;

  const text = buildEmbeddingText(entry);
  const embedding = await generateEmbedding(text, "document");
  const vectorStr = `[${embedding.join(",")}]`;

  await db.execute(
    sql`UPDATE knowledge SET embedding = ${vectorStr}::vector WHERE id = ${id}`
  );
}

/**
 * Embed all knowledge entries that don't have an embedding yet.
 */
export async function embedAllKnowledge(): Promise<{ embedded: number; skipped: number; errors: number }> {
  const rows = await db.execute(
    sql`SELECT id, title, content, category, tags FROM knowledge WHERE embedding IS NULL`
  );

  let embedded = 0;
  let skipped = 0;
  let errors = 0;

  // Process in batches of 10
  const entries = rows.rows as Array<{
    id: number;
    title: string;
    content: string;
    category: string;
    tags: string | null;
  }>;

  for (let i = 0; i < entries.length; i += 10) {
    const batch = entries.slice(i, i + 10);
    const texts = batch.map((e) => buildEmbeddingText(e));

    try {
      const embeddings = await generateEmbeddings(texts, "document");

      for (let j = 0; j < batch.length; j++) {
        const vectorStr = `[${embeddings[j].join(",")}]`;
        await db.execute(
          sql`UPDATE knowledge SET embedding = ${vectorStr}::vector WHERE id = ${batch[j].id}`
        );
        embedded++;
      }
    } catch (err) {
      console.error(`Embedding batch error at offset ${i}:`, err);
      errors += batch.length;
    }
  }

  skipped = 0; // all rows without embedding were processed

  return { embedded, skipped, errors };
}

// ── Query Embedding Cache ──
// Avoids repeated Voyage AI API calls for the same or similar queries.
// Chat sessions frequently search for the same topics ("Iran", "OPEC", "oil").
// Cache TTL: 30 min, max 200 entries (LRU eviction).
const QUERY_EMBED_CACHE = new Map<string, { embedding: number[]; ts: number }>();
const EMBED_CACHE_TTL = 30 * 60 * 1000;
const EMBED_CACHE_MAX = 200;

function normalizeQueryKey(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, " ");
}

async function getCachedQueryEmbedding(query: string): Promise<number[]> {
  const key = normalizeQueryKey(query);
  const cached = QUERY_EMBED_CACHE.get(key);
  if (cached && Date.now() - cached.ts < EMBED_CACHE_TTL) {
    return cached.embedding;
  }
  const embedding = await generateEmbedding(query, "query");
  // Evict oldest if at capacity
  if (QUERY_EMBED_CACHE.size >= EMBED_CACHE_MAX) {
    const oldest = QUERY_EMBED_CACHE.keys().next().value;
    if (oldest !== undefined) QUERY_EMBED_CACHE.delete(oldest);
  }
  QUERY_EMBED_CACHE.set(key, { embedding, ts: Date.now() });
  return embedding;
}

/**
 * Semantic search: find knowledge entries most similar to a query.
 */
export async function semanticSearch(
  query: string,
  options?: { limit?: number; category?: string; status?: string }
): Promise<Array<{
  id: number;
  title: string;
  content: string;
  category: string;
  tags: string | null;
  confidence: number | null;
  status: string;
  similarity: number;
}>> {
  const limit = options?.limit ?? 10;

  const queryEmbedding = await getCachedQueryEmbedding(query);
  const vectorStr = `[${queryEmbedding.join(",")}]`;

  // Build WHERE clauses using parameterized queries
  const categoryFilter = options?.category || null;
  const statusFilter = options?.status || "active";

  const result = await db.execute(
    sql`
      SELECT
        id, title, content, category, tags, confidence, status,
        1 - (embedding <=> ${vectorStr}::vector) as similarity
      FROM knowledge
      WHERE embedding IS NOT NULL
        AND status = ${statusFilter}
        AND (${categoryFilter}::text IS NULL OR category = ${categoryFilter})
      ORDER BY embedding <=> ${vectorStr}::vector
      LIMIT ${limit}
    `
  );

  return result.rows as Array<{
    id: number;
    title: string;
    content: string;
    category: string;
    tags: string | null;
    confidence: number | null;
    status: string;
    similarity: number;
  }>;
}
