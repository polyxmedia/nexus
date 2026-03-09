import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { encrypt } from "@/lib/encryption";

// IG OAuth token endpoint
const IG_TOKEN_URL = "https://identity.ig.com/token";

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

  // User denied or IG returned an error
  if (error) {
    settingsUrl.searchParams.set("ig_error", error);
    return NextResponse.redirect(settingsUrl);
  }

  if (!code || !state) {
    settingsUrl.searchParams.set("ig_error", "missing_params");
    return NextResponse.redirect(settingsUrl);
  }

  // Verify CSRF state token
  const stateRows = await db.select().from(schema.settings).where(eq(schema.settings.key, "ig_oauth_state"));
  const storedState = stateRows[0]?.value;
  if (!storedState) {
    settingsUrl.searchParams.set("ig_error", "invalid_state");
    return NextResponse.redirect(settingsUrl);
  }

  const [savedState, timestamp] = storedState.split(":");
  // State expires after 10 minutes
  if (savedState !== state || Date.now() - parseInt(timestamp) > 600_000) {
    settingsUrl.searchParams.set("ig_error", "expired_state");
    return NextResponse.redirect(settingsUrl);
  }

  // Clean up the state token
  await db.delete(schema.settings).where(eq(schema.settings.key, "ig_oauth_state"));

  // Exchange authorization code for tokens
  const clientId = process.env.IG_OAUTH_CLIENT_ID;
  const clientSecret = process.env.IG_OAUTH_CLIENT_SECRET;
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/ig/oauth/callback`;

  if (!clientId || !clientSecret) {
    settingsUrl.searchParams.set("ig_error", "not_configured");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const tokenRes = await fetch(IG_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error("[IG OAuth] Token exchange failed:", tokenRes.status, text);
      settingsUrl.searchParams.set("ig_error", "token_exchange_failed");
      return NextResponse.redirect(settingsUrl);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 60;
    const accountId = tokenData.account_id || tokenData.sub;

    if (!accessToken) {
      settingsUrl.searchParams.set("ig_error", "no_token");
      return NextResponse.redirect(settingsUrl);
    }

    // Store encrypted tokens
    const settingsToStore = [
      { key: "ig_oauth_access_token", value: encrypt(accessToken) },
      ...(refreshToken ? [{ key: "ig_oauth_refresh_token", value: encrypt(refreshToken) }] : []),
      { key: "ig_oauth_expires_at", value: String(Date.now() + expiresIn * 1000) },
      ...(accountId ? [{ key: "ig_account_id", value: encrypt(accountId) }] : []),
    ];

    for (const entry of settingsToStore) {
      await db.insert(schema.settings).values(entry)
        .onConflictDoUpdate({
          target: schema.settings.key,
          set: { value: entry.value, updatedAt: new Date().toISOString() },
        });
    }

    // Clean up any legacy credential storage
    for (const legacyKey of ["ig_username", "ig_password", "ig_api_key"]) {
      await db.delete(schema.settings).where(eq(schema.settings.key, legacyKey));
    }

    settingsUrl.searchParams.set("ig_connected", "true");
    return NextResponse.redirect(settingsUrl);
  } catch (err) {
    console.error("[IG OAuth] Error:", err);
    settingsUrl.searchParams.set("ig_error", "unknown");
    return NextResponse.redirect(settingsUrl);
  }
}
