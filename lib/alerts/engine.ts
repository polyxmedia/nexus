import { db, schema } from "../db";
import { eq, and, desc } from "drizzle-orm";

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
}

export async function getAlerts() {
  return await db.select().from(schema.alerts).orderBy(desc(schema.alerts.createdAt));
}

export async function getAlert(id: number) {
  return await db.select().from(schema.alerts).where(eq(schema.alerts.id, id));
}

export async function createAlert(values: {
  name: string;
  type: string;
  condition: AlertCondition;
  cooldownMinutes?: number;
}) {
  return await db.insert(schema.alerts).values({
    name: values.name,
    type: values.type,
    condition: JSON.stringify(values.condition),
    cooldownMinutes: values.cooldownMinutes || 60,
  }).returning();
}

export async function updateAlert(id: number, values: Partial<{
  name: string;
  type: string;
  condition: AlertCondition;
  enabled: number;
  cooldownMinutes: number;
}>) {
  const set: Record<string, unknown> = {};
  if (values.name !== undefined) set.name = values.name;
  if (values.type !== undefined) set.type = values.type;
  if (values.condition !== undefined) set.condition = JSON.stringify(values.condition);
  if (values.enabled !== undefined) set.enabled = values.enabled;
  if (values.cooldownMinutes !== undefined) set.cooldownMinutes = values.cooldownMinutes;

  await db.update(schema.alerts).set(set).where(eq(schema.alerts.id, id));
  return await getAlert(id);
}

export async function deleteAlert(id: number) {
  await db.delete(schema.alerts).where(eq(schema.alerts.id, id));
}

export async function getAlertHistory(limit: number = 50) {
  return await db.select().from(schema.alertHistory)
    .orderBy(desc(schema.alertHistory.triggeredAt))
    .limit(limit)
    ;
}

export async function dismissAlertHistory(id: number) {
  await db.update(schema.alertHistory)
    .set({ dismissed: 1 })
    .where(eq(schema.alertHistory.id, id))
    ;
}

export async function getUndismissedAlerts() {
  return await db.select().from(schema.alertHistory)
    .where(eq(schema.alertHistory.dismissed, 0))
    .orderBy(desc(schema.alertHistory.triggeredAt))
    ;
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
    // Check cooldown
    if (alert.lastTriggered) {
      const lastTime = new Date(alert.lastTriggered).getTime();
      const cooldownMs = (alert.cooldownMinutes || 60) * 60 * 1000;
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
        const signals = await db.select().from(schema.signals);
        const intense = signals.filter(s => s.intensity >= (condition.minIntensity || 4));
        if (intense.length > 0) {
          const latest = intense[intense.length - 1];
          shouldTrigger = true;
          title = `High-intensity signal: ${latest.title}`;
          message = `Signal "${latest.title}" has intensity ${latest.intensity}/5 (threshold: ${condition.minIntensity || 4})`;
          severity = latest.intensity >= 5 ? 5 : 4;
          data = { signalId: latest.id, intensity: latest.intensity };
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

      triggered++;
    }
  }

  return triggered;
}
