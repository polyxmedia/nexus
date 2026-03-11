import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { requireTier } from "@/lib/auth/require-tier";
import crypto from "crypto";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

// IG OAuth 2.0 authorization endpoint
// Users authenticate on IG's site directly, never enter credentials in our app
const IG_AUTH_URL = "https://identity.ig.com/login";

export async function GET() {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.IG_OAUTH_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "IG OAuth not configured. Set IG_OAUTH_CLIENT_ID in environment." },
      { status: 500 }
    );
  }

  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/ig/oauth/callback`;

  // Generate CSRF state token, store it so we can verify on callback
  const state = crypto.randomBytes(32).toString("hex");
  await db.insert(schema.settings).values({
    key: `ig_oauth_state:${session.user.name}`,
    value: `${state}:${Date.now()}`,
  }).onConflictDoUpdate({
    target: schema.settings.key,
    set: { value: `${state}:${Date.now()}`, updatedAt: new Date().toISOString() },
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "api",
    state,
  });

  return NextResponse.json({ url: `${IG_AUTH_URL}?${params.toString()}` });
}
