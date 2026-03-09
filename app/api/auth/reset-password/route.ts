import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { hashPassword } from "@/lib/auth/auth";

// GET — validate token
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const rl = rateLimit(`reset-validate:${ip}`, 20, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ valid: false }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ valid: false });
  }

  try {
    const rows = await db
      .select()
      .from(schema.passwordResets)
      .where(eq(schema.passwordResets.token, token));

    if (rows.length === 0) {
      return NextResponse.json({ valid: false });
    }

    const reset = rows[0];
    if (new Date(reset.expiresAt) < new Date()) {
      // Expired — clean up
      await db.delete(schema.passwordResets).where(eq(schema.passwordResets.token, token));
      return NextResponse.json({ valid: false });
    }

    return NextResponse.json({ valid: true, username: reset.username });
  } catch (error) {
    console.error("[reset-password] validate error:", error);
    return NextResponse.json({ valid: false });
  }
}

// POST — reset password
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`reset-password:${ip}`, 10, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }

    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Missing token or password" }, { status: 400 });
    }

    if (typeof password !== "string" || password.length < 10) {
      return NextResponse.json({ error: "Password must be at least 10 characters" }, { status: 400 });
    }

    // Look up token
    const rows = await db
      .select()
      .from(schema.passwordResets)
      .where(eq(schema.passwordResets.token, token));

    if (rows.length === 0) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    const reset = rows[0];
    if (new Date(reset.expiresAt) < new Date()) {
      await db.delete(schema.passwordResets).where(eq(schema.passwordResets.token, token));
      return NextResponse.json({ error: "Reset link has expired" }, { status: 400 });
    }

    // Hash new password and update user
    const userKey = `user:${reset.username}`;
    const userRows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, userKey));

    if (userRows.length === 0) {
      return NextResponse.json({ error: "Account not found" }, { status: 400 });
    }

    const userData = JSON.parse(userRows[0].value);
    userData.password = await hashPassword(password);
    userData.passwordResetAt = new Date().toISOString();

    await db
      .update(schema.settings)
      .set({ value: JSON.stringify(userData), updatedAt: new Date().toISOString() })
      .where(eq(schema.settings.key, userKey));

    // Delete all tokens for this user (one-time use)
    await db
      .delete(schema.passwordResets)
      .where(eq(schema.passwordResets.username, reset.username));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[reset-password] error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
