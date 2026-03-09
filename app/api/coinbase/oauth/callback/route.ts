import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { exchangeCodeForTokens } from "@/lib/coinbase/oauth";
import { encrypt } from "@/lib/encryption";
import crypto from "crypto";

// GET - OAuth callback from Coinbase
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const username = session.user.name;
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // User denied access
  if (error) {
    return NextResponse.redirect(new URL("/settings?coinbase=denied", req.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/settings?coinbase=error", req.url));
  }

  // Validate CSRF state
  const stateRows = await db.select().from(schema.settings)
    .where(eq(schema.settings.key, `coinbase_oauth_state:${username}`));

  if (stateRows.length === 0) {
    return NextResponse.redirect(new URL("/settings?coinbase=error", req.url));
  }

  // Invalidate state immediately to prevent replay
  await db.delete(schema.settings)
    .where(eq(schema.settings.key, `coinbase_oauth_state:${username}`));

  try {
    const stored = JSON.parse(stateRows[0].value);

    // Timing-safe state comparison + 5-minute expiry window
    const storedBuf = Buffer.from(stored.state || "");
    const receivedBuf = Buffer.from(state);
    const stateMatch = storedBuf.length === receivedBuf.length &&
      crypto.timingSafeEqual(storedBuf, receivedBuf);

    if (!stateMatch || Date.now() - stored.createdAt > 5 * 60 * 1000) {
      return NextResponse.redirect(new URL("/settings?coinbase=error", req.url));
    }
  } catch {
    return NextResponse.redirect(new URL("/settings?coinbase=error", req.url));
  }

  // Exchange code for tokens
  try {
    const tokens = await exchangeCodeForTokens(code);
    const expiresAt = Date.now() + tokens.expires_in * 1000;

    // Store tokens encrypted, keyed per user
    const tokenEntries = [
      { key: `coinbase_oauth_access_token:${username}`, value: encrypt(tokens.access_token) },
      { key: `coinbase_oauth_refresh_token:${username}`, value: encrypt(tokens.refresh_token) },
      { key: `coinbase_oauth_expires_at:${username}`, value: String(expiresAt) },
    ];

    for (const entry of tokenEntries) {
      await db.insert(schema.settings).values(entry)
        .onConflictDoUpdate({
          target: schema.settings.key,
          set: { value: entry.value },
        });
    }

    return NextResponse.redirect(new URL("/settings?coinbase=connected", req.url));
  } catch (err) {
    console.error("Coinbase OAuth token exchange failed:", err);
    return NextResponse.redirect(new URL("/settings?coinbase=error", req.url));
  }
}
