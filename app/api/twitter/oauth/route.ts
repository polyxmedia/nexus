import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getAuthorizationUrl, getTwitterOAuthConfig, generatePKCE } from "@/lib/twitter/oauth";
import { requireAdmin, isNextResponse } from "@/lib/auth/session";
import crypto from "crypto";

// GET - initiate Twitter OAuth 2.0 flow (admin only, platform-wide integration)
export async function GET() {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  const config = getTwitterOAuthConfig();
  if (!config) {
    return NextResponse.json({ error: "Twitter OAuth not configured on server" }, { status: 501 });
  }

  // Generate CSRF state + PKCE
  const state = crypto.randomBytes(32).toString("hex");
  const { codeVerifier, codeChallenge } = generatePKCE();

  // Store state + verifier (platform-wide, not per-user)
  await db.insert(schema.settings).values({
    key: "twitter_oauth_state",
    value: JSON.stringify({ state, codeVerifier, createdAt: Date.now() }),
  }).onConflictDoUpdate({
    target: schema.settings.key,
    set: { value: JSON.stringify({ state, codeVerifier, createdAt: Date.now() }) },
  });

  const authUrl = getAuthorizationUrl(state, codeChallenge);
  return NextResponse.json({ url: authUrl });
}

// DELETE - disconnect Twitter
export async function DELETE() {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  const keysToDelete = [
    "twitter_oauth_access_token",
    "twitter_oauth_refresh_token",
    "twitter_oauth_expires_at",
    "twitter_oauth_state",
  ];

  for (const key of keysToDelete) {
    await db.delete(schema.settings).where(eq(schema.settings.key, key));
  }

  return NextResponse.json({ success: true });
}
