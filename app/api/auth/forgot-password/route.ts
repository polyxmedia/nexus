import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db, schema } from "@/lib/db";
import { eq, like } from "drizzle-orm";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { passwordResetEmail } from "@/lib/email/templates";
import { validateOrigin } from "@/lib/security/csrf";

export async function POST(request: Request) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(`forgot-password:${ip}`, 5, 15 * 60 * 1000);
    if (!rl.allowed) {
      // Always return success to avoid leaking info
      return NextResponse.json({ ok: true });
    }

    const { identifier } = await request.json();
    if (!identifier || typeof identifier !== "string" || identifier.trim().length === 0) {
      return NextResponse.json({ ok: true });
    }

    const trimmed = identifier.trim().toLowerCase();

    // Look up user by username or email
    let username: string | null = null;
    let email: string | null = null;

    // Try direct username match first
    const directMatch = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, `user:${trimmed}`));

    if (directMatch.length > 0) {
      username = trimmed;
      try {
        const data = JSON.parse(directMatch[0].value);
        email = data.email || null;
      } catch { /* */ }
    } else {
      // Search all users for email match
      const allUsers = await db
        .select()
        .from(schema.settings)
        .where(like(schema.settings.key, "user:%"));

      for (const row of allUsers) {
        try {
          const data = JSON.parse(row.value);
          if (data.email && data.email.toLowerCase() === trimmed) {
            username = row.key.replace("user:", "");
            email = data.email;
            break;
          }
        } catch { /* */ }
      }
    }

    // If no user found or no email, still return success (don't leak existence)
    if (!username || !email) {
      return NextResponse.json({ ok: true });
    }

    // Generate secure token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    // Delete any existing tokens for this user
    await db
      .delete(schema.passwordResets)
      .where(eq(schema.passwordResets.username, username));

    // Store new token
    await db.insert(schema.passwordResets).values({
      username,
      token,
      expiresAt,
    });

    // Send email
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;
    const { subject, html } = passwordResetEmail(username, resetUrl);

    await sendEmail({ to: email, subject, html, type: "password_reset" }).catch((err) => {
      console.error("[forgot-password] email send failed:", err);
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[forgot-password] error:", error);
    // Always return success
    return NextResponse.json({ ok: true });
  }
}
