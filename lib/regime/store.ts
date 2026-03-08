// Regime state persistence via settings table

import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function saveRegimeState(key: string, data: unknown): Promise<void> {
  const fullKey = `regime:${key}`;
  const value = JSON.stringify(data);
  const now = new Date().toISOString();

  const existing = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, fullKey))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(schema.settings)
      .set({ value, updatedAt: now })
      .where(eq(schema.settings.key, fullKey));
  } else {
    await db.insert(schema.settings).values({ key: fullKey, value, updatedAt: now });
  }
}

export async function loadRegimeState<T>(key: string): Promise<T | null> {
  const fullKey = `regime:${key}`;
  const rows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, fullKey))
    .limit(1);

  if (rows.length === 0 || !rows[0].value) return null;

  try {
    return JSON.parse(rows[0].value) as T;
  } catch {
    return null;
  }
}

export async function appendToHistory<T>(key: string, entry: T, maxEntries = 90): Promise<void> {
  const historyKey = `${key}:history`;
  const existing = await loadRegimeState<T[]>(historyKey);
  const history = existing || [];
  history.push(entry);

  // Keep only last maxEntries
  const trimmed = history.slice(-maxEntries);
  await saveRegimeState(historyKey, trimmed);
}
