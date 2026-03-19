/**
 * Proactive Analyst Intelligence
 * ================================
 * The analyst doesn't just wait for questions. It monitors for noteworthy
 * events and surfaces them when the user opens chat.
 *
 * Checks:
 * - New high-intensity signals since last visit
 * - Predictions resolved since last visit
 * - Regime shifts
 * - Cross-stream convergence alerts
 *
 * Returns a proactive opening message if there's something worth saying.
 * Returns null if nothing noteworthy happened (don't say anything boring).
 */

import { db, schema } from "@/lib/db";
import { desc, gte, eq } from "drizzle-orm";

export interface ProactiveInsight {
  message: string;
  priority: "low" | "medium" | "high" | "critical";
  sources: string[];
}

/**
 * Check for noteworthy events since the user's last activity.
 * Returns a natural-language opening message, or null if nothing interesting.
 */
export async function getProactiveInsights(username: string): Promise<ProactiveInsight | null> {
  // Get user's last activity timestamp
  const lastActivityKey = `${username}:last_chat_activity`;
  const lastRows = await db.select().from(schema.settings)
    .where(eq(schema.settings.key, lastActivityKey));

  const lastActivity = lastRows[0]?.value || new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  const since = lastActivity;

  // Update last activity to now
  const now = new Date().toISOString();
  await db.insert(schema.settings).values({ key: lastActivityKey, value: now, updatedAt: now })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value: now, updatedAt: now } })
    .catch(() => {});

  // Gather events since last visit
  const [newSignals, resolvedPredictions, activeThesis] = await Promise.all([
    // High-intensity signals since last visit
    db.select({ title: schema.signals.title, intensity: schema.signals.intensity, category: schema.signals.category })
      .from(schema.signals)
      .where(gte(schema.signals.createdAt, since))
      .orderBy(desc(schema.signals.intensity))
      .limit(5)
      .catch(() => []),

    // Predictions resolved since last visit
    db.select({ claim: schema.predictions.claim, outcome: schema.predictions.outcome, confidence: schema.predictions.confidence })
      .from(schema.predictions)
      .where(gte(schema.predictions.resolvedAt, since))
      .orderBy(desc(schema.predictions.resolvedAt))
      .limit(5)
      .catch(() => []),

    // Latest thesis for regime info
    db.select({ marketRegime: schema.theses.marketRegime, executiveSummary: schema.theses.executiveSummary })
      .from(schema.theses)
      .where(eq(schema.theses.status, "active"))
      .orderBy(desc(schema.theses.generatedAt))
      .limit(1)
      .catch(() => []),
  ]);

  const highSignals = newSignals.filter(s => s.intensity >= 4);
  const hits = resolvedPredictions.filter(p => p.outcome === "confirmed");
  const misses = resolvedPredictions.filter(p => p.outcome === "denied");

  // Decide if there's anything worth saying
  const parts: string[] = [];
  const sources: string[] = [];
  let priority: ProactiveInsight["priority"] = "low";

  // Critical: high-intensity signals
  if (highSignals.length > 0) {
    priority = highSignals.some(s => s.intensity >= 5) ? "critical" : "high";
    if (highSignals.length === 1) {
      parts.push(`A high-intensity signal fired while you were away: "${highSignals[0].title}" (intensity ${highSignals[0].intensity}/5).`);
    } else {
      parts.push(`${highSignals.length} high-intensity signals fired since you were last here. The strongest: "${highSignals[0].title}" at ${highSignals[0].intensity}/5.`);
    }
    sources.push("signals");
  }

  // Predictions resolved
  if (resolvedPredictions.length > 0) {
    if (priority === "low") priority = "medium";
    if (hits.length > 0 && misses.length > 0) {
      parts.push(`${resolvedPredictions.length} predictions resolved, ${hits.length} confirmed, ${misses.length} denied.`);
    } else if (hits.length > 0) {
      parts.push(`${hits.length} prediction${hits.length > 1 ? "s" : ""} confirmed since last time. "${hits[0].claim.slice(0, 80)}" came through at ${(hits[0].confidence * 100).toFixed(0)}% confidence.`);
    } else if (misses.length > 0) {
      parts.push(`${misses.length} prediction${misses.length > 1 ? "s" : ""} were denied. Worth reviewing what the model missed.`);
    }
    sources.push("predictions");
  }

  // New signals (not high intensity but still noteworthy)
  if (newSignals.length > 0 && highSignals.length === 0) {
    if (priority === "low" && newSignals.length >= 3) priority = "medium";
    parts.push(`${newSignals.length} new signals detected across ${new Set(newSignals.map(s => s.category)).size} categories.`);
    sources.push("signals");
  }

  // Nothing interesting
  if (parts.length === 0) return null;

  // Build natural message
  const greeting = getTimeGreeting();
  const message = `${greeting}. ${parts.join(" ")} Want me to dig into any of this?`;

  return { message, priority, sources };
}

function getTimeGreeting(): string {
  const hour = new Date().getUTCHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
