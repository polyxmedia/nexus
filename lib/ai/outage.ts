import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

/**
 * Flag an AI outage (billing/auth failure from Anthropic).
 * Writes to settings table so the status API + banner can pick it up.
 */
export async function flagAIOutage(reason: string) {
  try {
    const key = "system:ai_outage";
    const value = JSON.stringify({
      message: "AI services are temporarily unavailable. Our team has been notified and is working on it.",
      reason,
      timestamp: Date.now(),
    });

    const existing = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, key))
      .limit(1);

    if (existing[0]) {
      await db.update(schema.settings).set({ value }).where(eq(schema.settings.key, key));
    } else {
      await db.insert(schema.settings).values({ key, value });
    }

    console.error(`[AI OUTAGE] Flagged: ${reason}`);
  } catch (err) {
    console.error("[AI OUTAGE] Failed to flag outage:", err);
  }
}

/**
 * Clear the AI outage flag (call after a successful API response).
 */
export async function clearAIOutage() {
  try {
    await db.delete(schema.settings).where(eq(schema.settings.key, "system:ai_outage"));
  } catch {
    // Non-critical
  }
}

/**
 * Check if an Anthropic error is a billing/credit exhaustion issue.
 */
export function isBillingError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  const name = (err as { status?: number }).status;

  // Anthropic SDK throws with status codes
  if (name === 401 || name === 402) return true;

  // Check message patterns
  return (
    msg.includes("insufficient") ||
    msg.includes("billing") ||
    msg.includes("payment required") ||
    msg.includes("credit") ||
    msg.includes("quota") ||
    msg.includes("exceeded your current") ||
    msg.includes("organization has been disabled")
  );
}
