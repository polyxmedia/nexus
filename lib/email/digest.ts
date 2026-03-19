import { db, schema } from "@/lib/db";
import { gte, like, desc, eq, and, isNotNull } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { weeklyDigestEmail, type WeeklyDigestData } from "@/lib/email/templates";

export async function generateAndSendDigests(): Promise<{ sent: number; failed: number }> {
  // Get all users
  const userRows = await db.select().from(schema.settings)
    .where(like(schema.settings.key, "user:%"));

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRange = `${weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} - ${now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;

  // Query shared data once
  const [signals, predictions, theses] = await Promise.all([
    db.select().from(schema.signals)
      .where(gte(schema.signals.date, oneWeekAgo))
      .orderBy(desc(schema.signals.intensity)),
    db.select().from(schema.predictions)
      .where(gte(schema.predictions.createdAt, oneWeekAgo)),
    db.select().from(schema.theses)
      .where(eq(schema.theses.status, "active")),
  ]);

  const resolvedThisWeek = predictions.filter((p) => p.resolvedAt && p.resolvedAt >= oneWeekAgo);
  const brierScores = resolvedThisWeek.filter((p) => p.score != null).map((p) => p.score!);
  const avgBrier = brierScores.length > 0 ? brierScores.reduce((a, b) => a + b, 0) / brierScores.length : null;

  // Get latest regime from theses
  const latestThesis = theses[0];
  const regime = latestThesis?.regimeAtCreation || null;

  const digestData: WeeklyDigestData = {
    dateRange,
    signalsCount: signals.length,
    highestIntensity: signals.length > 0 ? signals[0].intensity : 0,
    predictionsCreated: predictions.length,
    predictionsResolved: resolvedThisWeek.length,
    avgBrier,
    activeTheses: theses.length,
    regime,
  };

  // Skip if nothing happened this week
  if (digestData.signalsCount === 0 && digestData.predictionsCreated === 0 && digestData.activeTheses === 0) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  const sendPromises = userRows.map(async (row) => {
    try {
      const userData = JSON.parse(row.value);
      if (!userData.email) return;

      // Check if user opted out
      const username = row.key.replace("user:", "");
      const digestSetting = await db.select().from(schema.settings)
        .where(eq(schema.settings.key, `${username}:digest_enabled`));
      if (digestSetting.length > 0 && digestSetting[0].value === "false") return;

      const { subject, html } = weeklyDigestEmail(username, digestData);
      await sendEmail({ to: userData.email, subject, html });
      sent++;
    } catch {
      failed++;
    }
  });

  await Promise.allSettled(sendPromises);
  return { sent, failed };
}
