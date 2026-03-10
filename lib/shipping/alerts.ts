// Chokepoint status change detection and Telegram alert dispatch
import { db, schema } from "@/lib/db";
import { like } from "drizzle-orm";
import { sendMessage } from "@/lib/telegram/bot";
import type { ChokepointId, ChokepointStatus, Chokepoint } from "./index";

// In-memory cache of last known status per chokepoint
const lastKnownStatus = new Map<ChokepointId, ChokepointStatus>();

const CHOKEPOINT_NAMES: Record<ChokepointId, string> = {
  hormuz: "Strait of Hormuz",
  suez: "Suez Canal",
  malacca: "Strait of Malacca",
  mandeb: "Bab el-Mandeb",
  panama: "Panama Canal",
};

const STATUS_SEVERITY: Record<ChokepointStatus, number> = {
  normal: 0,
  elevated: 1,
  disrupted: 2,
};

function formatChokepointAlert(cp: Chokepoint, prevStatus: ChokepointStatus): string {
  const direction = STATUS_SEVERITY[cp.status] > STATUS_SEVERITY[prevStatus] ? "ESCALATION" : "DE-ESCALATION";
  return [
    `<b>CHOKEPOINT ${direction}</b>`,
    ``,
    `<b>${cp.name}</b>`,
    `Status: ${prevStatus.toUpperCase()} -> ${cp.status.toUpperCase()}`,
    `Risk Score: ${cp.riskScore}/100`,
    `Transits: ${cp.estimatedDailyTransits}/${cp.baselineDailyTransits} (${cp.transitDeltaPct >= 0 ? "+" : ""}${cp.transitDeltaPct}%)`,
    cp.riskFactors.length > 0 ? `Factors: ${cp.riskFactors.slice(0, 3).join("; ")}` : "",
    ``,
    `<a href="https://nexushq.xyz/shipping">View in NEXUS</a>`,
  ].filter(Boolean).join("\n");
}

/**
 * Check for chokepoint status changes and alert subscribed users.
 * Called after each shipping snapshot refresh.
 */
export async function checkAndAlertStatusChanges(chokepoints: Chokepoint[]): Promise<void> {
  try {
    for (const cp of chokepoints) {
      const prev = lastKnownStatus.get(cp.id);
      lastKnownStatus.set(cp.id, cp.status);

      // Skip on first run (no previous status) or no change
      if (!prev || prev === cp.status) continue;

      // Status changed - find subscribers for this chokepoint
      const chatIdRows = await db.select().from(schema.settings)
        .where(like(schema.settings.key, "%:telegram_chat_id"));

      for (const row of chatIdRows) {
        const username = row.key.split(":")[0];
        if (!username || !row.value) continue;

        // Check if user has chokepoint_status in their telegram_alerts
        const alertPrefRows = await db.select().from(schema.settings)
          .where(like(schema.settings.key, `${username}:telegram_alerts`));
        let alertPrefs: string[] = [];
        if (alertPrefRows.length > 0) {
          try { alertPrefs = JSON.parse(alertPrefRows[0].value); } catch { /* skip */ }
        }
        if (!alertPrefs.includes("chokepoint_status")) continue;

        // Check if user is subscribed to this specific chokepoint
        const cpAlertRows = await db.select().from(schema.settings)
          .where(like(schema.settings.key, `${username}:chokepoint_alerts`));
        let cpSubscriptions: string[] = [];
        if (cpAlertRows.length > 0) {
          try { cpSubscriptions = JSON.parse(cpAlertRows[0].value); } catch { /* skip */ }
        }
        if (!cpSubscriptions.includes(cp.id)) continue;

        // Send alert
        const message = formatChokepointAlert(cp, prev);
        await sendMessage({ chatId: row.value, text: message }).catch((err) => console.error("[Shipping] chokepoint alert send failed:", err));
      }
    }
  } catch (err) {
    console.error("Chokepoint alert check failed:", err);
  }
}
