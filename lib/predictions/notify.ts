// ── Prediction Generation Notification ──
// Notifies users via Telegram + in-app alert history when new predictions are created.

import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { broadcastAlert, formatNewPredictionsAlert } from "@/lib/telegram/alerts";
import { tweetNewPredictions } from "@/lib/twitter/predictions";

interface GeneratedPrediction {
  id?: number;
  claim: string;
  category: string;
  confidence: number;
  deadline: string;
  direction?: string | null;
}

const SYSTEM_ALERT_NAME = "system:prediction_generated";

/**
 * Get or create the system-level alert record used as parent for prediction notification history.
 */
async function getSystemAlertId(): Promise<number> {
  const existing = await db
    .select()
    .from(schema.alerts)
    .where(eq(schema.alerts.name, SYSTEM_ALERT_NAME));

  if (existing.length > 0) return existing[0].id;

  // Create system alert for prediction generation notifications
  const rows = await db
    .insert(schema.alerts)
    .values({
      userId: null,
      name: SYSTEM_ALERT_NAME,
      type: "custom",
      condition: JSON.stringify({ type: "prediction_generated" }),
      enabled: 1,
      cooldownMinutes: 0,
      notifyTelegram: 0,
      notifySms: 0,
    })
    .returning();

  return rows[0].id;
}

/**
 * Notify all subscribed users about newly generated predictions.
 * Creates an in-app alert history entry and broadcasts via Telegram.
 */
export async function notifyNewPredictions(predictions: GeneratedPrediction[]): Promise<number> {
  if (predictions.length === 0) return 0;

  const title = `${predictions.length} new prediction${predictions.length !== 1 ? "s" : ""} generated`;
  const topPredictions = [...predictions]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
  const message = topPredictions
    .map((p) => `${p.claim.slice(0, 60)}${p.claim.length > 60 ? "..." : ""} (${(p.confidence * 100).toFixed(0)}%)`)
    .join("; ");

  // Create in-app alert history entry for the platform notification bell
  try {
    const alertId = await getSystemAlertId();
    await db.insert(schema.alertHistory).values({
      alertId,
      title,
      message,
      severity: 2,
      data: JSON.stringify({
        type: "prediction_generated",
        count: predictions.length,
        predictionIds: predictions.map((p) => p.id).filter(Boolean),
        categories: [...new Set(predictions.map((p) => p.category))],
      }),
    });
  } catch (err) {
    console.error("[predictions] Failed to create in-app notification:", err);
  }

  // Post to Twitter/X
  try {
    await tweetNewPredictions(predictions);
  } catch (err) {
    console.error("[predictions] Twitter notification failed:", err);
  }

  // Broadcast via Telegram to all subscribers
  try {
    const telegramMessage = formatNewPredictionsAlert(predictions);
    const sent = await broadcastAlert("prediction_generated", telegramMessage);
    if (sent > 0) {
      console.log(`[predictions] Notified ${sent} user${sent !== 1 ? "s" : ""} about ${predictions.length} new predictions`);
    }
    return sent;
  } catch (err) {
    console.error("[predictions] Telegram notification failed:", err);
    return 0;
  }
}
