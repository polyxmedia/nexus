import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requireTier } from "@/lib/auth/require-tier";
import { runAlertChain } from "@/lib/alerts/chains";
import { validateOrigin } from "@/lib/security/csrf";

export async function POST(request: Request) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const enabledAlerts = await db
      .select()
      .from(schema.alerts)
      .where(eq(schema.alerts.enabled, 1))
      ;

    const triggered: Array<{ alertId: number; title: string; message: string }> = [];
    const chainResults: Array<{ signalId: number; predictionsCreated: number; emailsSent: number }> = [];
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let chainSignal: any = null;

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
              chainSignal = highIntensity[highIntensity.length - 1]; // latest high-intensity
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

        // Run alert chain for signal_intensity triggers
        if (alert.type === "signal_intensity" && chainSignal) {
          try {
            const cr = await runAlertChain(
              chainSignal.id,
              chainSignal.title,
              chainSignal.intensity,
              chainSignal.category,
              chainSignal.date,
              chainSignal.marketSectors
            );
            chainResults.push({
              signalId: cr.signalId,
              predictionsCreated: cr.predictionsCreated,
              emailsSent: cr.emailsSent,
            });
          } catch (chainErr) {
            console.error("[alert-check] Alert chain failed:", chainErr);
          }
        }
      }
    }

    return NextResponse.json({ checked: enabledAlerts.length, triggered, chains: chainResults });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
