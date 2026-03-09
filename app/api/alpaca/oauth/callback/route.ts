import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { encrypt } from "@/lib/encryption";
import { exchangeCodeForTokens } from "@/lib/alpaca/oauth";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const settingsUrl = new URL("/settings?tab=connections", req.url);
  const username = session.user.name;

  if (error) {
    settingsUrl.searchParams.set("alpaca_error", error);
    return NextResponse.redirect(settingsUrl);
  }

  if (!code || !state) {
    settingsUrl.searchParams.set("alpaca_error", "missing_params");
    return NextResponse.redirect(settingsUrl);
  }

  // Verify CSRF state
  const stateKey = `alpaca_oauth_state:${username}`;
  const stateRows = await db.select().from(schema.settings).where(eq(schema.settings.key, stateKey));
  const storedState = stateRows[0]?.value;

  if (!storedState) {
    settingsUrl.searchParams.set("alpaca_error", "invalid_state");
    return NextResponse.redirect(settingsUrl);
  }

  const [savedState, timestamp] = storedState.split(":");
  const stateMatch = savedState.length === state.length &&
    crypto.timingSafeEqual(Buffer.from(savedState), Buffer.from(state));

  if (!stateMatch || Date.now() - parseInt(timestamp) > 600_000) {
    settingsUrl.searchParams.set("alpaca_error", "expired_state");
    return NextResponse.redirect(settingsUrl);
  }

  // Clean up state token
  await db.delete(schema.settings).where(eq(schema.settings.key, stateKey));

  try {
    const tokenData = await exchangeCodeForTokens(code);

    if (!tokenData.access_token) {
      settingsUrl.searchParams.set("alpaca_error", "no_token");
      return NextResponse.redirect(settingsUrl);
    }

    // Alpaca tokens don't have refresh, store with a note about 15-min expiry
    await db.insert(schema.settings).values({
      key: `alpaca_oauth_access_token:${username}`,
      value: encrypt(tokenData.access_token),
    }).onConflictDoUpdate({
      target: schema.settings.key,
      set: { value: encrypt(tokenData.access_token), updatedAt: new Date().toISOString() },
    });

    settingsUrl.searchParams.set("alpaca_connected", "true");
    return NextResponse.redirect(settingsUrl);
  } catch (err) {
    console.error("[Alpaca OAuth] Error:", err);
    settingsUrl.searchParams.set("alpaca_error", "token_exchange_failed");
    return NextResponse.redirect(settingsUrl);
  }
}
