import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  // Rate limit: 5 registrations per IP per hour
  const ip = getClientIp(request);
  const rl = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many registration attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const { username, password, referralCode } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
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

    // Create user
    const hashed = await hashPassword(password);
    const userPayload: Record<string, string> = { password: hashed, role: "user" };

    // Track referral if code provided
    if (referralCode) {
      userPayload.referredBy = referralCode;
    }

    await db.insert(schema.settings).values({
      key: `user:${username}`,
      value: JSON.stringify(userPayload),
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

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
