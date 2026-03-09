import { db, schema } from "@/lib/db";
import { and, eq, desc, sql } from "drizzle-orm";

export interface Memory {
  id: number;
  category: string;
  key: string;
  value: string;
  useCount: number;
  lastUsed: string | null;
  createdAt: string;
}

/**
 * Recall all active memories for a user, ordered by most recently used.
 * Optionally filter by category.
 */
export async function recallMemories(
  userId: string,
  category?: string,
  limit = 50
): Promise<Memory[]> {
  const conditions = [eq(schema.analystMemory.userId, userId)];
  if (category) {
    conditions.push(eq(schema.analystMemory.category, category));
  }

  const rows = await db
    .select()
    .from(schema.analystMemory)
    .where(and(...conditions))
    .orderBy(desc(schema.analystMemory.useCount))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    category: r.category,
    key: r.key,
    value: r.value,
    useCount: r.useCount,
    lastUsed: r.lastUsed,
    createdAt: r.createdAt,
  }));
}

/**
 * Save or update a memory. If a memory with the same key+category exists,
 * update it. Otherwise create a new one.
 */
export async function saveMemory(
  userId: string,
  category: string,
  key: string,
  value: string
): Promise<{ action: "created" | "updated"; id: number }> {
  // Check for existing memory with same key and category
  const existing = await db
    .select()
    .from(schema.analystMemory)
    .where(
      and(
        eq(schema.analystMemory.userId, userId),
        eq(schema.analystMemory.category, category),
        eq(schema.analystMemory.key, key)
      )
    );

  if (existing.length > 0) {
    await db
      .update(schema.analystMemory)
      .set({ value, updatedAt: new Date().toISOString() })
      .where(eq(schema.analystMemory.id, existing[0].id));
    return { action: "updated", id: existing[0].id };
  }

  const [row] = await db
    .insert(schema.analystMemory)
    .values({ userId, category, key, value })
    .returning();
  return { action: "created", id: row.id };
}

/**
 * Delete a memory by ID (only if owned by user).
 */
export async function deleteMemory(userId: string, memoryId: number): Promise<boolean> {
  const result = await db
    .delete(schema.analystMemory)
    .where(and(eq(schema.analystMemory.id, memoryId), eq(schema.analystMemory.userId, userId)));
  return true;
}

/**
 * Mark memories as used (bump use_count and last_used).
 * Called when memories are injected into the system prompt.
 */
export async function touchMemories(memoryIds: number[]): Promise<void> {
  if (memoryIds.length === 0) return;
  const now = new Date().toISOString();
  for (const id of memoryIds) {
    await db
      .update(schema.analystMemory)
      .set({
        useCount: sql`${schema.analystMemory.useCount} + 1`,
        lastUsed: now,
      })
      .where(eq(schema.analystMemory.id, id));
  }
}

/**
 * Build a context string from user memories for system prompt injection.
 */
export async function buildMemoryContext(userId: string): Promise<{ context: string; memoryIds: number[] }> {
  const memories = await recallMemories(userId, undefined, 30);
  if (memories.length === 0) return { context: "", memoryIds: [] };

  const grouped: Record<string, Memory[]> = {};
  for (const m of memories) {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push(m);
  }

  const lines: string[] = ["## User Memory (Persistent Context)", ""];
  const categoryLabels: Record<string, string> = {
    preference: "Preferences",
    thesis: "Active Theses",
    portfolio: "Portfolio Context",
    context: "Standing Context",
    instruction: "Standing Instructions",
  };

  for (const [cat, mems] of Object.entries(grouped)) {
    lines.push(`**${categoryLabels[cat] || cat}:**`);
    for (const m of mems) {
      lines.push(`- ${m.key}: ${m.value}`);
    }
    lines.push("");
  }

  return {
    context: lines.join("\n"),
    memoryIds: memories.map((m) => m.id),
  };
}
