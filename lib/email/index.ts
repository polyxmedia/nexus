import { Resend } from "resend";
import * as Sentry from "@sentry/nextjs";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

// Lazy init — avoids crash when RESEND_API_KEY is not set (dev/test)
let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM_ADDRESS = process.env.EMAIL_FROM || "Nexus <noreply@email.nexushq.xyz>";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  /** Email type for logging (e.g. "welcome", "subscription_active") */
  type?: string;
}

export interface EmailLogEntry {
  id: string;
  to: string;
  subject: string;
  type: string;
  status: "sent" | "failed";
  resendId?: string;
  error?: string;
  sentAt: string;
}

const EMAIL_LOG_KEY = "email:log";

async function logEmail(entry: EmailLogEntry) {
  try {
    const rows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, EMAIL_LOG_KEY));

    let log: EmailLogEntry[] = [];
    if (rows.length > 0) {
      try { log = JSON.parse(rows[0].value); } catch { log = []; }
    }

    // Keep last 500 entries
    log.unshift(entry);
    if (log.length > 500) log = log.slice(0, 500);

    const value = JSON.stringify(log);
    if (rows.length > 0) {
      await db.update(schema.settings).set({ value }).where(eq(schema.settings.key, EMAIL_LOG_KEY));
    } else {
      await db.insert(schema.settings).values({ key: EMAIL_LOG_KEY, value });
    }
  } catch (err) {
    console.error("Email log write failed:", err);
  }
}

export async function getEmailLog(): Promise<EmailLogEntry[]> {
  const rows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, EMAIL_LOG_KEY));
  if (rows.length === 0) return [];
  try { return JSON.parse(rows[0].value); } catch { return []; }
}

// ── Rate Limiting + Dedup ─────────────────────────────────────────────────
// Resend free tier: 2 emails/second. We enforce 1/second with a queue.
// Dedup: same (type + recipient) within 10 minutes is suppressed.

const EMAIL_QUEUE: Array<() => Promise<void>> = [];
let queueProcessing = false;
const SEND_INTERVAL_MS = 1000; // 1 email per second max

// In-memory dedup cache: key = "type:recipient" -> timestamp
const recentlySent = new Map<string, number>();
const DEDUP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function isDuplicate(emailType: string, recipient: string): boolean {
  const key = `${emailType}:${recipient}`;
  const lastSent = recentlySent.get(key);
  if (lastSent && Date.now() - lastSent < DEDUP_WINDOW_MS) {
    return true;
  }
  recentlySent.set(key, Date.now());
  // Clean old entries periodically
  if (recentlySent.size > 200) {
    const now = Date.now();
    for (const [k, ts] of recentlySent) {
      if (now - ts > DEDUP_WINDOW_MS) recentlySent.delete(k);
    }
  }
  return false;
}

async function processEmailQueue() {
  if (queueProcessing) return;
  queueProcessing = true;
  while (EMAIL_QUEUE.length > 0) {
    const task = EMAIL_QUEUE.shift();
    if (task) {
      try { await task(); } catch { /* logged inside task */ }
    }
    if (EMAIL_QUEUE.length > 0) {
      await new Promise((r) => setTimeout(r, SEND_INTERVAL_MS));
    }
  }
  queueProcessing = false;
}

export async function sendEmail({ to, subject, html, text, replyTo, type }: SendEmailOptions) {
  const toArr = Array.isArray(to) ? to : [to];
  const emailType = type || inferType(subject);

  // Dedup: suppress identical email type to same recipient within window
  const primaryRecipient = toArr[0];
  if (isDuplicate(emailType, primaryRecipient)) {
    console.log(`[email] Suppressed duplicate: ${emailType} to ${primaryRecipient} (sent within last 10m)`);
    return { id: "suppressed-duplicate" };
  }

  const logEntry: EmailLogEntry = {
    id: crypto.randomUUID(),
    to: toArr.join(", "),
    subject,
    type: emailType,
    status: "sent",
    sentAt: new Date().toISOString(),
  };

  // Queue the actual send to respect rate limits
  return new Promise<{ id: string } | undefined>((resolve, reject) => {
    EMAIL_QUEUE.push(async () => {
      try {
        const result = await getResend().emails.send({
          from: FROM_ADDRESS,
          to: toArr,
          subject,
          html,
          ...(text ? { text } : {}),
          ...(replyTo ? { replyTo } : {}),
        });

        if (result.error) {
          logEntry.status = "failed";
          logEntry.error = result.error.message;
          await logEmail(logEntry);
          reject(new Error(result.error.message));
          return;
        }

        logEntry.resendId = result.data?.id;
        await logEmail(logEntry);
        resolve(result.data);
      } catch (err) {
        if (logEntry.status !== "failed") {
          logEntry.status = "failed";
          logEntry.error = err instanceof Error ? err.message : String(err);
          await logEmail(logEntry);
        }
        Sentry.withScope((scope) => {
          scope.setTag("email.type", logEntry.type);
          scope.setTag("email.to", logEntry.to);
          scope.setExtra("subject", logEntry.subject);
          scope.setLevel("error");
          Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
        });
        reject(err);
      }
    });
    processEmailQueue();
  });
}

/** Look up a user's email from the settings table. userId is "user:{username}" */
export async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const rows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, userId));
    if (rows.length === 0) return null;
    const data = JSON.parse(rows[0].value);
    return data.email || null;
  } catch {
    return null;
  }
}

function inferType(subject: string): string {
  const s = subject.toLowerCase();
  if (s.includes("welcome")) return "welcome";
  if (s.includes("subscription active") || s.includes("subscription confirmed")) return "subscription_active";
  if (s.includes("canceled") || s.includes("cancelled")) return "subscription_canceled";
  if (s.includes("payment failed")) return "payment_failed";
  if (s.startsWith("[l")) return "signal_alert";
  if (s.includes("support ticket") && s.includes("received")) return "ticket_opened";
  if (s.startsWith("re: nexus support")) return "ticket_reply";
  if (s.includes("support ticket") && s.includes("closed")) return "ticket_closed";
  if (s.includes("password reset")) return "password_reset";
  return "other";
}

/** Fire-and-forget admin notification. No-ops if admin email is not configured. */
export async function notifyAdmin(opts: Omit<SendEmailOptions, "to">) {
  try {
    const rows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "admin_notification_email"));
    if (rows.length === 0 || !rows[0].value) return;
    const adminEmail = rows[0].value.trim();
    if (!adminEmail) return;
    await sendEmail({ to: adminEmail, ...opts });
  } catch (err) {
    console.error("Admin notification failed:", err);
  }
}

export { getResend as resend };
