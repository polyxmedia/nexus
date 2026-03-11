import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getAuthorizationUrl, getCoinbaseOAuthConfig } from "@/lib/coinbase/oauth";
import crypto from "crypto";
import { validateOrigin } from "@/lib/security/csrf";

// GET - initiate OAuth flow (returns auth URL)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = getCoinbaseOAuthConfig();
  if (!config) {
    return NextResponse.json({ error: "Coinbase OAuth not configured on server" }, { status: 501 });
  }

  // Generate CSRF state token and store it
  const state = crypto.randomBytes(32).toString("hex");
  const username = session.user.name;

  // Store state temporarily in settings (expires check in callback)
  await db.insert(schema.settings).values({
    key: `coinbase_oauth_state:${username}`,
    value: JSON.stringify({ state, createdAt: Date.now() }),
  }).onConflictDoUpdate({
    target: schema.settings.key,
    set: { value: JSON.stringify({ state, createdAt: Date.now() }) },
  });

  const authUrl = getAuthorizationUrl(state);
  return NextResponse.json({ url: authUrl });
}

// DELETE - disconnect Coinbase OAuth
export async function DELETE(request: Request) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const username = session.user.name;
  const keysToDelete = [
    `coinbase_oauth_access_token:${username}`,
    `coinbase_oauth_refresh_token:${username}`,
    `coinbase_oauth_expires_at:${username}`,
    `coinbase_oauth_state:${username}`,
  ];

  for (const key of keysToDelete) {
    await db.delete(schema.settings).where(eq(schema.settings.key, key));
  }

  return NextResponse.json({ success: true });
}
