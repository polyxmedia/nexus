import { db, schema } from "../db";
import { eq, desc, like, and } from "drizzle-orm";
import { sendMessage } from "@/lib/telegram/bot";
import { sendSms, getUserPhone } from "@/lib/sms";

// ── Alert Decay Suppression ──
// Escalating cooldown: first trigger fires immediately, subsequent triggers
// get progressively longer suppression to prevent alert fatigue.
// Decay tiers in hours: [0, 6, 12, 24]
const DECAY_TIERS_HOURS = [0, 6, 12, 24];

/**
 * Calculate effective cooldown using decay suppression.
 * As triggerCount increases, the cooldown multiplier escalates.
 * tierIndex = min(triggerCount, DECAY_TIERS_HOURS.length - 1)
 * effectiveCooldown = max(baseCooldown, decayTierHours * 60)
 */
function getEffectiveCooldownMs(baseCooldownMinutes: number, triggerCount: number): number {
  const tierIndex = Math.min(triggerCount, DECAY_TIERS_HOURS.length - 1);
  const decayMinutes = DECAY_TIERS_HOURS[tierIndex] * 60;
  const effectiveMinutes = Math.max(baseCooldownMinutes, decayMinutes);
  return effectiveMinutes * 60 * 1000;
}

// ── Signal Delta Tracking ──
// Stores the last known intensity per signal to detect transitions.
// Key: signalId, Value: { intensity, timestamp }
const signalIntensityCache = new Map<number, { intensity: number; timestamp: number }>();
const SIGNAL_CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

// GEX regime tracking - detect flips between dampening/amplifying
// Includes timestamp so stale readings (>30min) are ignored after gaps
let lastGexRegime: { regime: string; timestamp: number } | null = null;
const GEX_REGIME_TTL = 30 * 60 * 1000; // 30 minutes

// BOCPD change points already triggered - avoid duplicates
const bocpdSeenPoints = new Set<string>();

export interface AlertCondition {
  // price_threshold
  ticker?: string;
  direction?: "above" | "below";
  threshold?: number;
  // vix_level
  vixLevel?: number;
  // signal_intensity
  minIntensity?: number;
  // prediction_due
  daysBeforeDeadline?: number;
  // osint_keyword
  keywords?: string[];
  // geofence
  lat?: number;
  lng?: number;
  radiusKm?: number;
  // custom
  expression?: string;
  // gex_flip
  gexTickers?: string[];
  // change_point
  streams?: string[];
  minProbability?: number;
}

export async function getAlerts(userId?: string) {
  if (userId) {
    return await db.select().from(schema.alerts)
      .where(eq(schema.alerts.userId, userId))
      .orderBy(desc(schema.alerts.createdAt));
  }
  return await db.select().from(schema.alerts).orderBy(desc(schema.alerts.createdAt));
}

export async function getAlert(id: number) {
  return await db.select().from(schema.alerts).where(eq(schema.alerts.id, id));
}

export async function createAlert(values: {
  userId?: string;
  name: string;
  type: string;
  condition: AlertCondition;
  cooldownMinutes?: number;
  notifyTelegram?: number;
  notifySms?: number;
}) {
  return await db.insert(schema.alerts).values({
    userId: values.userId || null,
    name: values.name,
    type: values.type,
    condition: JSON.stringify(values.condition),
    cooldownMinutes: values.cooldownMinutes || 60,
    notifyTelegram: values.notifyTelegram || 0,
    notifySms: values.notifySms || 0,
  }).returning();
}

export async function updateAlert(id: number, values: Partial<{
  name: string;
  type: string;
  condition: AlertCondition;
  enabled: number;
  cooldownMinutes: number;
  notifyTelegram: number;
  notifySms: number;
}>) {
  const set: Record<string, unknown> = {};
  if (values.name !== undefined) set.name = values.name;
  if (values.type !== undefined) set.type = values.type;
  if (values.condition !== undefined) set.condition = JSON.stringify(values.condition);
  if (values.enabled !== undefined) set.enabled = values.enabled;
  if (values.cooldownMinutes !== undefined) set.cooldownMinutes = values.cooldownMinutes;
  if (values.notifyTelegram !== undefined) set.notifyTelegram = values.notifyTelegram;
  if (values.notifySms !== undefined) set.notifySms = values.notifySms;

  await db.update(schema.alerts).set(set).where(eq(schema.alerts.id, id));
  return await getAlert(id);
}

export async function deleteAlert(id: number) {
  await db.delete(schema.alerts).where(eq(schema.alerts.id, id));
}

export async function getAlertHistory(limit: number = 50, userId?: string) {
  if (userId) {
    return await db.select({ alertHistory: schema.alertHistory })
      .from(schema.alertHistory)
      .innerJoin(schema.alerts, eq(schema.alertHistory.alertId, schema.alerts.id))
      .where(eq(schema.alerts.userId, userId))
      .orderBy(desc(schema.alertHistory.triggeredAt))
      .limit(limit)
      .then(rows => rows.map(r => r.alertHistory));
  }
  return await db.select().from(schema.alertHistory)
    .orderBy(desc(schema.alertHistory.triggeredAt))
    .limit(limit);
}

export async function getAlertHistoryItem(uid: string) {
  const rows = await db.select({
    history: schema.alertHistory,
    alert: schema.alerts,
  })
    .from(schema.alertHistory)
    .innerJoin(schema.alerts, eq(schema.alertHistory.alertId, schema.alerts.id))
    .where(eq(schema.alertHistory.uid, uid))
    .limit(1);
  if (rows.length === 0) return null;
  return rows[0];
}

export async function dismissAlertHistoryByUid(uid: string) {
  await db.update(schema.alertHistory)
    .set({ dismissed: 1 })
    .where(eq(schema.alertHistory.uid, uid));
}

export async function dismissAlertHistory(id: number) {
  await db.update(schema.alertHistory)
    .set({ dismissed: 1 })
    .where(eq(schema.alertHistory.id, id))
    ;
}

export async function getUndismissedAlerts(userId?: string) {
  if (userId) {
    return await db.select({ alertHistory: schema.alertHistory })
      .from(schema.alertHistory)
      .innerJoin(schema.alerts, eq(schema.alertHistory.alertId, schema.alerts.id))
      .where(and(eq(schema.alertHistory.dismissed, 0), eq(schema.alerts.userId, userId)))
      .orderBy(desc(schema.alertHistory.triggeredAt))
      .then(rows => rows.map(r => r.alertHistory));
  }
  return await db.select().from(schema.alertHistory)
    .where(eq(schema.alertHistory.dismissed, 0))
    .orderBy(desc(schema.alertHistory.triggeredAt));
}

function safeParse(json: string | null): unknown {
  if (!json) return {};
  try { return JSON.parse(json); } catch { return {}; }
}

// Evaluate all enabled alerts against current data
export async function evaluateAlerts(): Promise<number> {
  const alerts = await db.select().from(schema.alerts)
    .where(eq(schema.alerts.enabled, 1))
    ;

  let triggered = 0;

  for (const alert of alerts) {
    // Check cooldown with decay suppression
    if (alert.lastTriggered) {
      const lastTime = new Date(alert.lastTriggered).getTime();
      const cooldownMs = getEffectiveCooldownMs(
        alert.cooldownMinutes || 60,
        alert.triggerCount || 0
      );
      if (Date.now() - lastTime < cooldownMs) continue;
    }

    const condition = safeParse(alert.condition) as AlertCondition;
    let shouldTrigger = false;
    let title = "";
    let message = "";
    let severity = 3;
    let data: Record<string, unknown> = {};

    switch (alert.type) {
      case "signal_intensity": {
        const signals = await db.select().from(schema.signals)
          .where(eq(schema.signals.status, "active"));
        const minIntensity = condition.minIntensity || 4;
        const intense = signals.filter(s => s.intensity >= minIntensity);
        if (intense.length > 0) {
          // Delta detection: only trigger if a signal's intensity just crossed
          // the threshold or increased since last check
          const now = Date.now();
          let deltaSignal: (typeof intense)[number] | null = null;
          for (const s of intense) {
            const cached = signalIntensityCache.get(s.id);
            if (!cached || cached.intensity < minIntensity || s.intensity > cached.intensity) {
              // This signal either: just appeared above threshold, or intensity increased
              deltaSignal = s;
              break;
            }
          }

          if (deltaSignal) {
            // Read previous intensity BEFORE updating cache
            const prevCached = signalIntensityCache.get(deltaSignal.id);
            const previousIntensity = prevCached ? prevCached.intensity : 0;
            shouldTrigger = true;
            title = `Signal intensity change: ${deltaSignal.title}`;
            message = previousIntensity > 0
              ? `Signal "${deltaSignal.title}" intensity changed ${previousIntensity} -> ${deltaSignal.intensity}/5 (threshold: ${minIntensity})`
              : `Signal "${deltaSignal.title}" has intensity ${deltaSignal.intensity}/5 (threshold: ${minIntensity})`;
            severity = deltaSignal.intensity >= 5 ? 5 : 4;
            data = {
              signalId: deltaSignal.id,
              intensity: deltaSignal.intensity,
              previousIntensity,
              delta: deltaSignal.intensity - previousIntensity,
            };
          }

          // Update cache for all signals after reading previous values
          for (const s of signals) {
            signalIntensityCache.set(s.id, { intensity: s.intensity, timestamp: now });
          }
          // Prune stale cache entries
          for (const [id, entry] of signalIntensityCache) {
            if (now - entry.timestamp > SIGNAL_CACHE_TTL) signalIntensityCache.delete(id);
          }
        }
        break;
      }

      case "prediction_due": {
        const predictions = await db.select().from(schema.predictions);
        const now = new Date();
        const daysThreshold = condition.daysBeforeDeadline || 3;
        const upcoming = predictions.filter(p => {
          if (p.outcome) return false;
          const deadline = new Date(p.deadline);
          const daysLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          return daysLeft >= 0 && daysLeft <= daysThreshold;
        });
        if (upcoming.length > 0) {
          shouldTrigger = true;
          title = `${upcoming.length} prediction(s) due soon`;
          message = upcoming.map(p => `"${p.claim.slice(0, 50)}" due ${p.deadline}`).join("; ");
          severity = 3;
          data = { predictionIds: upcoming.map(p => p.id), count: upcoming.length };
        }
        break;
      }

      case "osint_keyword": {
        if (!condition.keywords || condition.keywords.length === 0) break;
        try {
          const kw = condition.keywords.join(" OR ");
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          const res = await fetch(
            `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(kw)}&mode=artlist&maxrecords=5&format=json`,
            { signal: controller.signal }
          );
          clearTimeout(timeout);
          if (res.ok) {
            const json = await res.json();
            const articles = json.articles || [];
            if (articles.length > 0) {
              shouldTrigger = true;
              title = `OSINT keyword match: ${condition.keywords.join(", ")}`;
              message = articles.slice(0, 3).map((a: { title: string }) => a.title).join("; ");
              severity = 3;
              data = { articles: articles.slice(0, 3), keywords: condition.keywords };
            }
          }
        } catch {
          // GDELT unavailable
        }
        break;
      }

      case "price_threshold": {
        if (!condition.ticker || !condition.threshold) break;
        const apiKey = process.env.ALPHA_VANTAGE_KEY;
        if (!apiKey) break;
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          const res = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${condition.ticker}&apikey=${apiKey}`,
            { signal: controller.signal }
          );
          clearTimeout(timeout);
          if (res.ok) {
            const json = await res.json();
            const quote = json["Global Quote"];
            if (quote) {
              const price = parseFloat(quote["05. price"]);
              const dir = condition.direction || "above";
              if ((dir === "above" && price >= condition.threshold) ||
                  (dir === "below" && price <= condition.threshold)) {
                shouldTrigger = true;
                title = `${condition.ticker} ${dir} $${condition.threshold}`;
                message = `${condition.ticker} is at $${price.toFixed(2)} (${dir} threshold $${condition.threshold})`;
                severity = 4;
                data = { ticker: condition.ticker, price, threshold: condition.threshold };
              }
            }
          }
        } catch {
          // Alpha Vantage unavailable
        }
        break;
      }

      case "vix_level": {
        const apiKey = process.env.ALPHA_VANTAGE_KEY;
        if (!apiKey || !condition.vixLevel) break;
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          const res = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=VIX&apikey=${apiKey}`,
            { signal: controller.signal }
          );
          clearTimeout(timeout);
          if (res.ok) {
            const json = await res.json();
            const quote = json["Global Quote"];
            if (quote) {
              const vix = parseFloat(quote["05. price"]);
              if (vix >= condition.vixLevel) {
                shouldTrigger = true;
                title = `VIX above ${condition.vixLevel}`;
                message = `VIX is at ${vix.toFixed(2)} (threshold: ${condition.vixLevel})`;
                severity = vix >= 30 ? 5 : vix >= 25 ? 4 : 3;
                data = { vix, threshold: condition.vixLevel };
              }
            }
          }
        } catch {
          // unavailable
        }
        break;
      }

      case "gex_flip": {
        try {
          const { getGEXSnapshot } = await import("@/lib/gex");
          const ticker = Array.isArray(condition.gexTickers) ? condition.gexTickers[0] : condition.gexTickers;
          const snapshot = await getGEXSnapshot(ticker || "SPY");
          if (snapshot && snapshot.aggregateRegime) {
            const currentRegime = snapshot.aggregateRegime;
            const now = Date.now();
            const isStale = lastGexRegime && (now - lastGexRegime.timestamp > GEX_REGIME_TTL);
            if (lastGexRegime && !isStale && currentRegime !== lastGexRegime.regime) {
              shouldTrigger = true;
              title = `Gamma regime flipped to ${currentRegime.toUpperCase()}`;
              message = currentRegime === "amplifying"
                ? "Dealers now net short gamma. Moves will be amplified by hedging flows. Expect increased volatility."
                : "Dealers now net long gamma. Expect range compression and mean reversion.";
              severity = currentRegime === "amplifying" ? 4 : 3;
              data = { previousRegime: lastGexRegime.regime, currentRegime, tickers: condition.gexTickers || ["SPY", "QQQ", "IWM"] };
            }
            lastGexRegime = { regime: currentRegime, timestamp: now };
          }
        } catch { /* GEX unavailable */ }
        break;
      }

      case "change_point": {
        try {
          const { getBOCPDSnapshot } = await import("@/lib/bocpd");
          const targetStreams = condition.streams || ["vix", "gold", "oil", "us10y", "dxy"];
          const minProb = condition.minProbability || 0.7;
          for (const stream of targetStreams) {
            const snapshot = await getBOCPDSnapshot(stream);
            if (!snapshot?.recentChangePoints) continue;
            for (const cp of snapshot.recentChangePoints) {
              if (cp.probability < minProb) continue;
              const key = `${stream}:${cp.date}`;
              if (bocpdSeenPoints.has(key)) continue;
              bocpdSeenPoints.add(key);
              shouldTrigger = true;
              const isHighPriority = ["vix", "oil"].includes(stream);
              title = `Structural break detected in ${stream.toUpperCase()}`;
              message = `Change-point probability: ${(cp.probability * 100).toFixed(0)}%. Run length: ${cp.runLength ?? "unknown"} days.`;
              severity = isHighPriority ? 4 : 3;
              data = { stream, probability: cp.probability, runLength: cp.runLength, date: cp.date };
              break; // one trigger per evaluation cycle
            }
            if (shouldTrigger) break;
          }
        } catch { /* BOCPD unavailable */ }
        break;
      }
    }

    // Reset decay when the condition clears so alerts aren't permanently suppressed
    if (!shouldTrigger && (alert.triggerCount || 0) > 0) {
      await db.update(schema.alerts).set({ triggerCount: 0 }).where(eq(schema.alerts.id, alert.id));
    }

    if (shouldTrigger) {
      // Record trigger
      await db.update(schema.alerts).set({
        lastTriggered: new Date().toISOString(),
        triggerCount: (alert.triggerCount || 0) + 1,
      }).where(eq(schema.alerts.id, alert.id));

      // Record history
      await db.insert(schema.alertHistory).values({
        alertId: alert.id,
        title,
        message,
        severity,
        data: JSON.stringify(data),
      });

      // Send Telegram notification if enabled
      if (alert.notifyTelegram) {
        const chatIdRows = await db.select().from(schema.settings)
          .where(like(schema.settings.key, "%:telegram_chat_id"));
        for (const row of chatIdRows) {
          if (!row.value) continue;
          const text = [
            `<b>ALERT TRIGGERED</b>`,
            ``,
            `<b>${title}</b>`,
            message,
            `Severity: ${severity}/5`,
            ``,
            `<a href="https://nexushq.xyz/alerts">View in NEXUS</a>`,
          ].join("\n");
          sendMessage({ chatId: row.value, text }).catch((err) => console.error("[Alerts] Telegram notification send failed:", err));
        }
      }

      // Send SMS notification if enabled
      if (alert.notifySms) {
        const phoneRows = await db.select().from(schema.settings)
          .where(like(schema.settings.key, "%:sms_phone"));
        for (const row of phoneRows) {
          if (!row.value) continue;
          const smsText = `NEXUS ALERT: ${title} - ${message} (Severity ${severity}/5)`;
          sendSms(row.value, smsText).catch((err) => console.error("[Alerts] SMS notification send failed:", err));
        }
      }

      triggered++;
    }
  }

  return triggered;
}
