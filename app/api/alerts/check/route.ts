import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";

export async function POST() {
  try {
    const enabledAlerts = await db
      .select()
      .from(schema.alerts)
      .where(eq(schema.alerts.enabled, 1))
      ;

    const triggered: Array<{ alertId: number; title: string; message: string }> = [];
    const now = new Date();

    for (const alert of enabledAlerts) {
      // Check cooldown
      if (alert.lastTriggered) {
        const lastTrigger = new Date(alert.lastTriggered);
        const cooldownMs = alert.cooldownMinutes * 60_000;
        if (now.getTime() - lastTrigger.getTime() < cooldownMs) continue;
      }

      const condition = JSON.parse(alert.condition);
      let shouldTrigger = false;
      let message = "";

      try {
        switch (alert.type) {
          case "signal_intensity": {
            const signals = await db
              .select()
              .from(schema.signals)
              .where(eq(schema.signals.status, "active"))
              ;
            const highIntensity = signals.filter((s: { intensity: number }) => s.intensity >= (condition.threshold || 4));
            if (highIntensity.length > 0) {
              shouldTrigger = true;
              message = `${highIntensity.length} active signal(s) at intensity ${condition.threshold || 4}+: ${highIntensity.map((s: { title: string }) => s.title).join(", ")}`;
            }
            break;
          }
          case "prediction_due": {
            const allPreds = await db
              .select()
              .from(schema.predictions);
            const predictions = allPreds.filter((p: { outcome: string | null; deadline: string }) => !p.outcome && new Date(p.deadline) <= new Date(Date.now() + 24 * 60 * 60_000));
            if (predictions.length > 0) {
              shouldTrigger = true;
              message = `${predictions.length} prediction(s) due within 24h`;
            }
            break;
          }
          default:
            break;
        }
      } catch {
        continue;
      }

      if (shouldTrigger) {
        // Record trigger
        await db.update(schema.alerts)
          .set({
            lastTriggered: now.toISOString(),
            triggerCount: alert.triggerCount + 1,
          })
          .where(eq(schema.alerts.id, alert.id))
          ;

        await db.insert(schema.alertHistory)
          .values({
            alertId: alert.id,
            title: alert.name,
            message,
            severity: condition.severity || 3,
            data: JSON.stringify(condition),
          })
          ;

        triggered.push({ alertId: alert.id, title: alert.name, message });
      }
    }

    return NextResponse.json({ checked: enabledAlerts.length, triggered });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
