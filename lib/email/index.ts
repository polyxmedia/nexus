import { Resend } from "resend";
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

const FROM_ADDRESS = process.env.EMAIL_FROM || "Nexus <noreply@nexusintel.io>";

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

export async function sendEmail({ to, subject, html, text, replyTo, type }: SendEmailOptions) {
  const toArr = Array.isArray(to) ? to : [to];
  const logEntry: EmailLogEntry = {
    id: crypto.randomUUID(),
    to: toArr.join(", "),
    subject,
    type: type || inferType(subject),
    status: "sent",
    sentAt: new Date().toISOString(),
  };

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
      throw new Error(result.error.message);
    }

    logEntry.resendId = result.data?.id;
    await logEmail(logEntry);
    return result.data;
  } catch (err) {
    if (logEntry.status !== "failed") {
      logEntry.status = "failed";
      logEntry.error = err instanceof Error ? err.message : String(err);
      await logEmail(logEntry);
    }
    throw err;
  }
}

function inferType(subject: string): string {
  const s = subject.toLowerCase();
  if (s.includes("welcome")) return "welcome";
  if (s.includes("subscription active") || s.includes("subscription confirmed")) return "subscription_active";
  if (s.includes("canceled") || s.includes("cancelled")) return "subscription_canceled";
  if (s.includes("payment failed")) return "payment_failed";
  if (s.startsWith("[l")) return "signal_alert";
  return "other";
}

export { getResend as resend };
