import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq, like } from "drizzle-orm";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sendEmail, notifyAdmin } from "@/lib/email";
import { welcomeEmail, adminNewUserEmail } from "@/lib/email/templates";
import { validateOrigin } from "@/lib/security/csrf";

export async function POST(request: Request) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  // Rate limit: 5 registrations per IP per hour
  const ip = getClientIp(request);
  const rl = await rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many registration attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const { username, password, email, referralCode } = await request.json();

    if (!username || !password || !email) {
      return NextResponse.json(
        { error: "Username, email and password are required" },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const usernameRegex = /^[a-zA-Z0-9_]{3,32}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { error: "Username must be 3-32 characters, letters, numbers and underscores only" },
        { status: 400 }
      );
    }

    if (password.length < 10) {
      return NextResponse.json(
        { error: "Password must be at least 10 characters" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, `user:${username}`));

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 409 }
      );
    }

    // Check if email is already registered
    const allUsers = await db
      .select()
      .from(schema.settings)
      .where(like(schema.settings.key, "user:%"));

    const emailTaken = allUsers.some((row) => {
      try {
        const data = JSON.parse(row.value);
        return data.email?.toLowerCase() === email.toLowerCase();
      } catch {
        return false;
      }
    });

    if (emailTaken) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // Create user
    const hashed = await hashPassword(password);
    const userPayload: Record<string, string> = { password: hashed, role: "user", email };

    // Track referral if code provided
    if (referralCode) {
      userPayload.referredBy = referralCode;
    }

    await db.insert(schema.settings).values({
      key: `user:${username}`,
      value: JSON.stringify(userPayload),
      updatedAt: new Date().toISOString(),
    });

    // Create referral record if valid code
    if (referralCode) {
      try {
        const codeRows = await db
          .select()
          .from(schema.referralCodes)
          .where(eq(schema.referralCodes.code, referralCode));

        if (codeRows.length > 0 && codeRows[0].isActive) {
          await db.insert(schema.referrals).values({
            referralCodeId: codeRows[0].id,
            referrerId: codeRows[0].userId,
            referredUserId: `user:${username}`,
            status: "signed_up",
            createdAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        // Don't block registration if referral tracking fails
        console.error("Referral tracking error:", err);
      }
    }

    // Send welcome email (non-blocking)
    const baseUrl = process.env.NEXTAUTH_URL || "https://nexushq.xyz";
    const template = welcomeEmail(username, `${baseUrl}/login`);
    sendEmail({ to: email, ...template }).catch((err) =>
      console.error("Welcome email failed:", err)
    );

    // Notify admin of new registration
    notifyAdmin(adminNewUserEmail(username, email)).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[register] error:", err);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
