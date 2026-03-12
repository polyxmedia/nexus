import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { exchangeCodeForTokens } from "@/lib/twitter/oauth";
import { encrypt } from "@/lib/encryption";
import crypto from "crypto";

// GET - OAuth callback from Twitter/X
// Note: No session check here. The redirect from Twitter may not carry the
// session cookie (SameSite policy). The CSRF state token validated below
// already proves this callback originated from an admin-initiated flow.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/admin?twitter=denied#integrations", req.url));
  }

  if (!code || !state) {
    console.error("[twitter] OAuth callback missing code or state");
    return NextResponse.redirect(new URL("/admin?twitter=error&reason=missing_params#integrations", req.url));
  }

  // Validate CSRF state
  const stateRows = await db.select().from(schema.settings)
    .where(eq(schema.settings.key, "twitter_oauth_state"));

  if (stateRows.length === 0) {
    console.error("[twitter] OAuth state not found in DB (expired or already used)");
    return NextResponse.redirect(new URL("/admin?twitter=error&reason=state_missing#integrations", req.url));
  }

  // Invalidate state immediately to prevent replay
  await db.delete(schema.settings)
    .where(eq(schema.settings.key, "twitter_oauth_state"));

  let codeVerifier: string;

  try {
    const stored = JSON.parse(stateRows[0].value);

    // Timing-safe state comparison + 10-minute expiry window
    const storedBuf = Buffer.from(stored.state || "");
    const receivedBuf = Buffer.from(state);
    const stateMatch = storedBuf.length === receivedBuf.length &&
      crypto.timingSafeEqual(storedBuf, receivedBuf);

    if (!stateMatch) {
      console.error("[twitter] OAuth state mismatch");
      return NextResponse.redirect(new URL("/admin?twitter=error&reason=state_mismatch#integrations", req.url));
    }

    if (Date.now() - stored.createdAt > 10 * 60 * 1000) {
      console.error("[twitter] OAuth state expired");
      return NextResponse.redirect(new URL("/admin?twitter=error&reason=state_expired#integrations", req.url));
    }

    codeVerifier = stored.codeVerifier;
  } catch (err) {
    console.error("[twitter] OAuth state validation failed:", err);
    return NextResponse.redirect(new URL("/admin?twitter=error&reason=state_invalid#integrations", req.url));
  }

  // Exchange code for tokens
  try {
    const tokens = await exchangeCodeForTokens(code, codeVerifier, req.nextUrl.origin);
    const expiresAt = Date.now() + tokens.expires_in * 1000;

    // Store tokens encrypted (platform-wide, not per-user)
    const tokenEntries = [
      { key: "twitter_oauth_access_token", value: encrypt(tokens.access_token) },
      { key: "twitter_oauth_refresh_token", value: encrypt(tokens.refresh_token) },
      { key: "twitter_oauth_expires_at", value: String(expiresAt) },
    ];

    for (const entry of tokenEntries) {
      await db.insert(schema.settings).values(entry)
        .onConflictDoUpdate({
          target: schema.settings.key,
          set: { value: entry.value },
        });
    }

    return NextResponse.redirect(new URL("/admin?twitter=connected#integrations", req.url));
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[twitter] OAuth token exchange or storage failed:", errMsg);
    return NextResponse.redirect(
      new URL(`/admin?twitter=error&reason=token_exchange&detail=${encodeURIComponent(errMsg)}#integrations`, req.url)
    );
  }
}
