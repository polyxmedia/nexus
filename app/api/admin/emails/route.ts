import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getEmailLog, sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import {
  welcomeEmail,
  subscriptionActiveEmail,
  subscriptionCanceledEmail,
  paymentFailedEmail,
  signalAlertEmail,
} from "@/lib/email/templates";

async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return false;
  const rows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, `user:${session.user.name}`));
  if (rows.length === 0) return false;
  const userData = JSON.parse(rows[0].value);
  return userData.role === "admin";
}

// GET — return email log
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  const rl = await rateLimit(`admin:emails:get:${session!.user!.name}`, 60, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  const log = await getEmailLog();
  return NextResponse.json({ emails: log });
}

// POST — send a test email or resend
export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  const rl = await rateLimit(`admin:emails:post:${session!.user!.name}`, 10, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  const body = await request.json();
  const { action } = body;

  if (action === "test") {
    const { templateId, to } = body;
    if (!to || !templateId) {
      return NextResponse.json({ error: "Missing 'to' or 'templateId'" }, { status: 400 });
    }

    const baseUrl = process.env.NEXTAUTH_URL || "https://nexushq.xyz";
    let template: { subject: string; html: string };

    switch (templateId) {
      case "welcome":
        template = welcomeEmail("test_user", `${baseUrl}/login`);
        break;
      case "subscription_active":
        template = subscriptionActiveEmail("test_user", "Analyst", `${baseUrl}/dashboard`);
        break;
      case "subscription_canceled":
        template = subscriptionCanceledEmail("test_user");
        break;
      case "payment_failed":
        template = paymentFailedEmail("test_user", `${baseUrl}/settings`);
        break;
      case "signal_alert":
        template = signalAlertEmail(
          "Test Convergence Signal",
          4,
          "convergence",
          new Date().toLocaleDateString(),
          `${baseUrl}/signals/1`
        );
        break;
      default:
        return NextResponse.json({ error: `Unknown template: ${templateId}` }, { status: 400 });
    }

    try {
      await sendEmail({ to, ...template, type: `test:${templateId}` });
      return NextResponse.json({ success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (action === "resend") {
    const { emailId } = body;
    if (!emailId) {
      return NextResponse.json({ error: "Missing emailId" }, { status: 400 });
    }

    const log = await getEmailLog();
    const original = log.find((e) => e.id === emailId);
    if (!original) {
      return NextResponse.json({ error: "Email not found in log" }, { status: 404 });
    }

    // We don't have the original HTML stored, so we can only resend template-based emails
    return NextResponse.json(
      { error: "Resend not available. Use the test function to send a fresh copy." },
      { status: 400 }
    );
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
