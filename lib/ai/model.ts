import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

const DEFAULT_MODEL = "claude-sonnet-4-6";

// Cost-optimised models for automated/scheduled tasks (not user-facing)
export const SONNET_MODEL = "claude-sonnet-4-20250514";
export const HAIKU_MODEL = "claude-haiku-4-5-20251001";

const MODEL_OPTIONS = [
  { id: "claude-opus-4-6", label: "Opus 4.6", tier: "flagship", description: "Most capable model. Best for critical analysis, predictions, and complex reasoning." },
  { id: "claude-sonnet-4-6", label: "Sonnet 4.6", tier: "balanced", description: "Fast and capable. Great balance of quality and cost." },
  { id: "claude-sonnet-4-20250514", label: "Sonnet 4", tier: "balanced", description: "Previous generation Sonnet. Reliable and cost-effective." },
  { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5", tier: "fast", description: "Fastest model. Best for simple, non-critical tasks." },
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

export async function getChatModel(override?: string): Promise<string> {
  // Allow per-request model override from client
  if (override) {
    const valid = MODEL_OPTIONS.some((m) => m.id === override);
    if (valid) return override;
  }
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
