import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

const DEFAULT_MODEL = "claude-opus-4-6";

const MODEL_OPTIONS = [
  { id: "claude-opus-4-6", label: "Claude Opus 4.6", tier: "flagship", description: "Most capable model. Best for critical analysis, predictions, and complex reasoning." },
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", tier: "balanced", description: "Fast and capable. Good for routine tasks and chat." },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", tier: "fast", description: "Fastest model. Use only for simple, non-critical tasks." },
] as const;

export { MODEL_OPTIONS };

export async function getModel(): Promise<string> {
  try {
    const rows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "ai_model"));
    const setting = rows[0];
    if (setting?.value) {
      const valid = MODEL_OPTIONS.some((m) => m.id === setting.value);
      if (valid) return setting.value;
    }
  } catch {
    // DB not ready or other error
  }
  return DEFAULT_MODEL;
}

export async function getChatModel(): Promise<string> {
  try {
    const rows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "ai_chat_model"));
    const setting = rows[0];
    if (setting?.value) {
      const valid = MODEL_OPTIONS.some((m) => m.id === setting.value);
      if (valid) return setting.value;
    }
  } catch {
    // fallthrough
  }
  return getModel();
}
