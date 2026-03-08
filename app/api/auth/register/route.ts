import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { username, password, referralCode } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
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
