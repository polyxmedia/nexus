import { db, schema } from "@/lib/db";
import { like, inArray } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { founderFollowUpEmail } from "@/lib/email/templates";

const FOLLOWUP_DELAY_MS = 2 * 24 * 60 * 60 * 1000; // 2 days after signup

/**
 * Send a personal founder follow-up email to users who:
 * 1. Signed up more than 2 days ago
 * 2. Have an email address
 * 3. Have NOT subscribed to any paid tier
 * 4. Have NOT already received this follow-up
 *
 * Runs daily via scheduler. Each user gets this email at most once.
 */
export async function sendFounderFollowUps(): Promise<{ sent: number; skipped: number }> {
  const userRows = await db.select().from(schema.settings)
    .where(like(schema.settings.key, "user:%"));

  // Get all users who already received the follow-up
  const sentRows = await db.select().from(schema.settings)
    .where(like(schema.settings.key, "%:founder_followup_sent"));
  const alreadySent = new Set(sentRows.map((r) => r.key.replace(":founder_followup_sent", "")));

  // Get all active subscriptions
  const subscriptions = await db.select().from(schema.subscriptions);
  const subscribedUsers = new Set(
    subscriptions
      .filter((s) => s.status === "active" || s.status === "trialing")
      .map((s) => s.userId)
  );

  let sent = 0;
  let skipped = 0;
  const now = Date.now();

  for (const row of userRows) {
    try {
      const username = row.key.replace("user:", "");
      const userData = JSON.parse(row.value);

      // Skip: no email
      if (!userData.email) { skipped++; continue; }

      // Skip: already sent
      if (alreadySent.has(username)) { skipped++; continue; }

      // Skip: already subscribed
      if (subscribedUsers.has(username)) { skipped++; continue; }

      // Skip: admin users
      if (userData.role === "admin") { skipped++; continue; }

      // Skip: signed up less than 2 days ago
      const createdAt = userData.createdAt ? new Date(userData.createdAt).getTime() : 0;
      if (now - createdAt < FOLLOWUP_DELAY_MS) { skipped++; continue; }

      // Send the email
      const { subject, html } = founderFollowUpEmail(username);
      await sendEmail({ to: userData.email, subject, html, replyTo: "andre@nexushq.xyz" });

      // Mark as sent so we never send again
      await db.insert(schema.settings).values({
        key: `${username}:founder_followup_sent`,
        value: new Date().toISOString(),
      }).onConflictDoNothing();

      sent++;
    } catch {
      skipped++;
    }
  }

  return { sent, skipped };
}
