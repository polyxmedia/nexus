/**
 * Knowledge Bank
 * ═══════════════
 * The Encyclopedia Galactica
 *
 * In Foundation, the Encyclopedia was the overt purpose of the First
 * Foundation: preserve all human knowledge so civilisation could rebuild
 * faster after the fall. The real purpose was to create a community
 * capable of adapting to Seldon Crises.
 *
 * The NEXUS knowledge bank serves both functions. Overtly, it stores
 * theses, actor profiles, event analyses, and market intelligence as
 * vector-embedded entries searchable by semantic similarity. Structurally,
 * it provides the institutional memory that lets the system recognise
 * patterns across time: the same actor, the same calendar, the same
 * geography, different year, same outcome.
 */
import { db, schema } from "@/lib/db";
import { eq, like, and, or, desc, sql } from "drizzle-orm";
import type { KnowledgeEntry, NewKnowledgeEntry } from "@/lib/db/schema";
import { embedKnowledgeEntry, semanticSearch, embedAllKnowledge } from "./embeddings";

// ── Core Operations ──

export async function addKnowledge(entry: Omit<NewKnowledgeEntry, "id" | "createdAt">): Promise<KnowledgeEntry> {
  const rows = await db
    .insert(schema.knowledge)
    .values(entry)
    .returning();
  const row = rows[0];

  // Generate embedding in background (don't block the insert)
  embedKnowledgeEntry(row.id).catch((err) =>
    console.error(`Failed to embed knowledge ${row.id}:`, err)
  );

  return row;
}

export async function updateKnowledge(
  id: number,
  updates: Partial<Omit<NewKnowledgeEntry, "id" | "createdAt">>
): Promise<KnowledgeEntry | undefined> {
  const rows = await db
    .update(schema.knowledge)
    .set({ ...updates, updatedAt: new Date().toISOString() })
    .where(eq(schema.knowledge.id, id))
    .returning();
  const row = rows[0];

  // Re-embed if title or content changed
  if (row && (updates.title || updates.content)) {
    embedKnowledgeEntry(id).catch((err) =>
      console.error(`Failed to re-embed knowledge ${id}:`, err)
    );
  }

  return row;
}

export async function archiveKnowledge(id: number): Promise<KnowledgeEntry | undefined> {
  return updateKnowledge(id, { status: "archived" });
}

export async function supersedeKnowledge(
  oldId: number,
  newEntry: Omit<NewKnowledgeEntry, "id" | "createdAt">
): Promise<KnowledgeEntry> {
  const created = await addKnowledge(newEntry);
  await db.update(schema.knowledge)
    .set({
      status: "superseded",
      supersededBy: created.id,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.knowledge.id, oldId));
  return created;
}

// ── Retrieval ──

export async function getKnowledgeById(id: number): Promise<KnowledgeEntry | undefined> {
  const rows = await db
    .select()
    .from(schema.knowledge)
    .where(eq(schema.knowledge.id, id));
  return rows[0];
}

export async function getKnowledgeByCategory(category: string): Promise<KnowledgeEntry[]> {
  return db
    .select()
    .from(schema.knowledge)
    .where(
      and(
        eq(schema.knowledge.category, category),
        eq(schema.knowledge.status, "active")
      )
    )
    .orderBy(desc(schema.knowledge.createdAt));
}

export async function getActiveKnowledge(): Promise<KnowledgeEntry[]> {
  return db
    .select()
    .from(schema.knowledge)
    .where(eq(schema.knowledge.status, "active"))
    .orderBy(desc(schema.knowledge.createdAt));
}

// ── Search ──

export interface SearchOptions {
  category?: string;
  status?: string;
  tags?: string[];
  limit?: number;
  useVector?: boolean;
}

/**
 * Search knowledge base. Uses vector similarity search when available,
 * falls back to LIKE matching if embeddings aren't ready.
 */
export async function searchKnowledge(query: string, options?: SearchOptions): Promise<KnowledgeEntry[]> {
  const useVector = options?.useVector !== false;

  // Try vector search first
  if (useVector) {
    try {
      const results = await semanticSearch(query, {
        limit: options?.limit ?? 20,
        category: options?.category,
        status: options?.status,
      });

      if (results.length > 0) {
        let filtered = results;
        if (options?.tags && options.tags.length > 0) {
          filtered = results.filter((r) => {
            if (!r.tags) return false;
            try {
              const rowTags = JSON.parse(r.tags) as string[];
              return options.tags!.some((t) => rowTags.includes(t));
            } catch {
              return false;
            }
          });
        }

        return filtered.map((r) => ({
          id: r.id,
          title: r.title,
          content: r.content,
          category: r.category,
          tags: r.tags,
          source: null,
          confidence: r.confidence,
          status: r.status,
          supersededBy: null,
          validFrom: null,
          validUntil: null,
          metadata: null,
          createdAt: "",
          updatedAt: null,
        })) as KnowledgeEntry[];
      }
    } catch (err) {
      console.warn("Vector search unavailable, falling back to text search:", err instanceof Error ? err.message : err);
    }
  }

  return textSearch(query, options);
}

/**
 * Basic text search using LIKE matching (fallback).
 */
async function textSearch(query: string, options?: SearchOptions): Promise<KnowledgeEntry[]> {
  const q = `%${query}%`;

  let allRows = await db
    .select()
    .from(schema.knowledge)
    .where(
      or(
        like(schema.knowledge.title, q),
        like(schema.knowledge.content, q),
        like(schema.knowledge.tags, q)
      )
    )
    .orderBy(desc(schema.knowledge.createdAt));

  if (options?.category) {
    allRows = allRows.filter((r) => r.category === options.category);
  }

  if (options?.status) {
    allRows = allRows.filter((r) => r.status === options.status);
  } else {
    allRows = allRows.filter((r) => r.status === "active");
  }

  if (options?.tags && options.tags.length > 0) {
    allRows = allRows.filter((r) => {
      if (!r.tags) return false;
      try {
        const rowTags = JSON.parse(r.tags) as string[];
        return options.tags!.some((t) => rowTags.includes(t));
      } catch {
        return false;
      }
    });
  }

  const lowerQuery = query.toLowerCase();
  allRows.sort((a, b) => {
    const aTitle = a.title.toLowerCase().includes(lowerQuery) ? 0 : 1;
    const bTitle = b.title.toLowerCase().includes(lowerQuery) ? 0 : 1;
    if (aTitle !== bTitle) return aTitle - bTitle;
    return (b.confidence ?? 0.8) - (a.confidence ?? 0.8);
  });

  const limit = options?.limit ?? 20;
  return allRows.slice(0, limit);
}

export async function getRelevantKnowledge(topics: string[], limit = 10): Promise<KnowledgeEntry[]> {
  const seen = new Set<number>();
  const results: KnowledgeEntry[] = [];

  for (const topic of topics) {
    const matches = await searchKnowledge(topic, { limit: 5 });
    for (const m of matches) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        results.push(m);
      }
    }
  }

  results.sort((a, b) => (b.confidence ?? 0.8) - (a.confidence ?? 0.8));
  return results.slice(0, limit);
}

// ── List with filters (for API) ──

export async function listKnowledge(filters: {
  category?: string;
  status?: string;
  search?: string;
  tags?: string[];
}): Promise<KnowledgeEntry[]> {
  if (filters.search) {
    return searchKnowledge(filters.search, {
      category: filters.category,
      status: filters.status,
      tags: filters.tags,
    });
  }

  let rows: KnowledgeEntry[];

  if (filters.category) {
    rows = await db
      .select()
      .from(schema.knowledge)
      .where(eq(schema.knowledge.category, filters.category))
      .orderBy(desc(schema.knowledge.createdAt));
  } else {
    rows = await db
      .select()
      .from(schema.knowledge)
      .orderBy(desc(schema.knowledge.createdAt));
  }

  if (filters.status) {
    rows = rows.filter((r) => r.status === filters.status);
  }

  if (filters.tags && filters.tags.length > 0) {
    rows = rows.filter((r) => {
      if (!r.tags) return false;
      try {
        const rowTags = JSON.parse(r.tags) as string[];
        return filters.tags!.some((t) => rowTags.includes(t));
      } catch {
        return false;
      }
    });
  }

  return rows;
}

// ── Stats ──

export async function getKnowledgeStats() {
  const all = await db.select().from(schema.knowledge);

  const embeddedResult = await db.execute(
    sql`SELECT COUNT(*) as count FROM knowledge WHERE embedding IS NOT NULL`
  );
  const embeddedCount = Number((embeddedResult.rows as Array<{ count: number }>)[0]?.count ?? 0);

  const categories: Record<string, number> = {};
  let active = 0;
  let archived = 0;
  let superseded = 0;

  for (const row of all) {
    categories[row.category] = (categories[row.category] || 0) + 1;
    if (row.status === "active") active++;
    else if (row.status === "archived") archived++;
    else if (row.status === "superseded") superseded++;
  }

  return {
    total: all.length,
    active,
    archived,
    superseded,
    embedded: embeddedCount,
    categories,
  };
}

// ── Embedding Management ──

export { embedKnowledgeEntry, embedAllKnowledge };
