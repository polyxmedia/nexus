/**
 * Alert Chains: Automated Signal → Prediction → Trade Recommendation pipeline.
 *
 * When a high-intensity signal triggers an alert, this module:
 * 1. Auto-generates a prediction linked to the signal
 * 2. Runs thesis generation for affected symbols
 * 3. Sends email notification to all users with email addresses
 * 4. Records the full chain in alert history
 */

import { db, schema } from "../db";
import { eq, like } from "drizzle-orm";
import { sendEmail } from "../email";
import { signalAlertEmail } from "../email/templates";

const BASE_URL = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || "http://localhost:3000";

interface ChainResult {
  signalId: number;
  signalTitle: string;
  intensity: number;
  predictionsCreated: number;
  emailsSent: number;
  thesisTriggered: boolean;
}

/**
 * Run after alert evaluation detects high-intensity signals.
 * Called from the alert check route when signal_intensity alerts fire.
 */
export async function runAlertChain(
  signalId: number,
  signalTitle: string,
  intensity: number,
  category: string,
  date: string,
  marketSectors: string | null
): Promise<ChainResult> {
  const result: ChainResult = {
    signalId,
    signalTitle,
    intensity,
    predictionsCreated: 0,
    emailsSent: 0,
    thesisTriggered: false,
  };

  // ── Step 1: Auto-generate prediction for intensity 4+ signals ──
  if (intensity >= 4) {
    try {
      const sectors = marketSectors ? JSON.parse(marketSectors) : [];
      const sectorText = sectors.length > 0 ? ` affecting ${sectors.join(", ")}` : "";
      const deadline = new Date(Date.now() + 14 * 86_400_000).toISOString().split("T")[0];

      await db.insert(schema.predictions).values({
        signalId,
        claim: `Signal "${signalTitle}" (L${intensity}) will produce measurable market impact${sectorText} within 14 days`,
        confidence: intensity === 5 ? 0.75 : 0.6,
        category: category === "convergence" ? "market" : category === "geopolitical" ? "geopolitical" : "market",
        timeframe: "14 days",
        deadline,
        direction: "down", // high-intensity signals typically signal risk
        regimeAtCreation: "transitional",
        preEvent: 1,
        createdBy: "system",
      });
      result.predictionsCreated = 1;
    } catch (err) {
      console.error("[alert-chain] Failed to auto-create prediction:", err);
    }
  }

  // ── Step 2: Trigger thesis generation for intensity 5 signals ──
  if (intensity >= 5) {
    try {
      const sectors = marketSectors ? JSON.parse(marketSectors) : [];
      // Map sectors to symbols for thesis generation
      const symbolMap: Record<string, string> = {
        energy: "USO",
        defense: "ITA",
        technology: "QQQ",
        "precious metals": "GLD",
        shipping: "BDRY",
        "broad market": "SPY",
        crypto: "BTC",
      };
      const symbols = sectors
        .map((s: string) => symbolMap[s.toLowerCase()])
        .filter(Boolean);
      if (symbols.length === 0) symbols.push("SPY");

      // Fire-and-forget thesis generation via API
      fetch(`${BASE_URL}/api/thesis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols }),
      }).catch(() => {});
      result.thesisTriggered = true;
    } catch {
      // Non-critical
    }
  }

  // ── Step 3: Email notification for intensity 4+ ──
  // Respects: blocked users are skipped, only users with email addresses are notified.
  // Also dispatches Telegram alerts to subscribers of signal_convergence.
  if (intensity >= 4) {
    try {
      // Get all user emails from settings
      const userSettings = await db
        .select({ key: schema.settings.key, value: schema.settings.value })
        .from(schema.settings)
        .where(like(schema.settings.key, "user:%"));

      const emails: string[] = [];
      for (const row of userSettings) {
        try {
          const userData = JSON.parse(row.value);
          // Skip blocked users
          if (userData.blocked) continue;
          if (userData.email && typeof userData.email === "string") {
            emails.push(userData.email);
          }
        } catch {
          // Not a JSON user record
        }
      }

      if (emails.length > 0) {
        const signalUrl = `${BASE_URL}/signals/${signalId}`;
        // Look up UUID for the signal URL
        const [sig] = await db
          .select({ uuid: schema.signals.uuid })
          .from(schema.signals)
          .where(eq(schema.signals.id, signalId))
          .limit(1);

        const url = sig ? `${BASE_URL}/signals/${sig.uuid}` : signalUrl;
        const template = signalAlertEmail(signalTitle, intensity, category, date, url);

        for (const email of emails) {
          try {
            await sendEmail({
              to: email,
              subject: template.subject,
              html: template.html,
              type: "signal_alert",
            });
            result.emailsSent++;
          } catch {
            // Individual send failure
          }
        }
      }

      // Dispatch Telegram alert to signal_convergence subscribers
      try {
        const { broadcastAlert, formatSignalAlert } = await import("../telegram/alerts");
        const layers = marketSectors ? JSON.parse(marketSectors) : [category];
        const telegramMsg = formatSignalAlert({ title: signalTitle, intensity, layers, category });
        await broadcastAlert("signal_convergence", telegramMsg);
      } catch {
        // Telegram not configured or failed, non-critical
      }
    } catch (err) {
      console.error("[alert-chain] Email delivery failed:", err);
    }
  }

  return result;
}
