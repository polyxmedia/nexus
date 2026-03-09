import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { requireTier } from "@/lib/auth/require-tier";
import { getAlpacaOAuthConfig, getAuthorizationUrl } from "@/lib/alpaca/oauth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// GET: Return Alpaca OAuth authorization URL
export async function GET() {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { configured } = getAlpacaOAuthConfig();
  if (!configured) {
    return NextResponse.json({ error: "Alpaca OAuth not configured" }, { status: 500 });
  }

  const state = crypto.randomBytes(32).toString("hex");
  const stateKey = `alpaca_oauth_state:${session.user.name}`;

  await db.insert(schema.settings).values({
    key: stateKey,
    value: `${state}:${Date.now()}`,
  }).onConflictDoUpdate({
    target: schema.settings.key,
    set: { value: `${state}:${Date.now()}`, updatedAt: new Date().toISOString() },
  });

  const url = getAuthorizationUrl(state);
  return NextResponse.json({ url });
}

// DELETE: Disconnect Alpaca
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const username = session.user.name;
  const keysToDelete = [
    `alpaca_oauth_access_token:${username}`,
    `alpaca_oauth_state:${username}`,
  ];

  for (const key of keysToDelete) {
    await db.delete(schema.settings).where(eq(schema.settings.key, key));
  }

  return NextResponse.json({ success: true });
}
