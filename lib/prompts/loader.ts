import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getDefaultPrompt } from "./registry";

const PROMPT_PREFIX = "prompt:";

export async function loadPrompt(key: string): Promise<string> {
  const settingsKey = PROMPT_PREFIX + key;
  try {
    const rows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, settingsKey));
    const row = rows[0];
    if (row?.value) return row.value;
  } catch {
    // DB not available, fall through to default
  }
  return getDefaultPrompt(key) ?? "";
}

export async function savePrompt(key: string, value: string): Promise<void> {
  const settingsKey = PROMPT_PREFIX + key;
  const now = new Date().toISOString();
  const rows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, settingsKey));
  const existing = rows[0];

  if (existing) {
    await db.update(schema.settings)
      .set({ value, updatedAt: now })
      .where(eq(schema.settings.key, settingsKey));
  } else {
    await db.insert(schema.settings)
      .values({ key: settingsKey, value, updatedAt: now });
  }
}

export async function deletePromptOverride(key: string): Promise<void> {
  const settingsKey = PROMPT_PREFIX + key;
  await db.delete(schema.settings)
    .where(eq(schema.settings.key, settingsKey));
}

export async function hasPromptOverride(key: string): Promise<boolean> {
  const settingsKey = PROMPT_PREFIX + key;
  const rows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, settingsKey));
  return rows.length > 0;
}
