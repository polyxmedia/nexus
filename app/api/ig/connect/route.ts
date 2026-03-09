import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { requireTier } from "@/lib/auth/require-tier";
import { validateOrigin } from "@/lib/security/csrf";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { encrypt } from "@/lib/encryption";

const IG_BASE = {
  demo: "https://demo-api.ig.com/gateway/deal",
  live: "https://api.ig.com/gateway/deal",
};

// POST: Authenticate with IG and store only API key + tokens (not password)
export async function POST(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { username, password, accountId, environment } = await req.json();

    if (!username || typeof username !== "string" || username.length > 100) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length > 200) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    // API key is platform-level, never asked from users
    const apiKey = process.env.IG_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "IG not configured" }, { status: 500 });
    }

    const env = environment === "live" ? "live" : "demo";
    const baseUrl = IG_BASE[env];

    // Authenticate with IG API v3 to get OAuth tokens
    const authRes = await fetch(`${baseUrl}/session`, {
      method: "POST",
      headers: {
        "X-IG-API-KEY": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json; charset=UTF-8",
        Version: "3",
      },
      body: JSON.stringify({ identifier: username, password }),
    });

    if (!authRes.ok) {
      const text = await authRes.text();
      return NextResponse.json(
        { error: `IG authentication failed (${authRes.status}): ${text}` },
        { status: 400 }
      );
    }

    const authData = await authRes.json();
    const accessToken = authData.oauthToken?.access_token || authData.access_token;
    const refreshToken = authData.oauthToken?.refresh_token || authData.refresh_token;
    const expiresIn = authData.oauthToken?.expires_in || authData.expires_in || 60;
    const resolvedAccountId = accountId || authData.currentAccountId || authData.accountId;

    if (!accessToken || !refreshToken) {
      return NextResponse.json({ error: "IG did not return valid tokens" }, { status: 500 });
    }

    // Store only tokens (encrypted), never credentials
    const settingsToStore = [
      { key: "ig_oauth_access_token", value: encrypt(accessToken) },
      { key: "ig_oauth_refresh_token", value: encrypt(refreshToken) },
      { key: "ig_oauth_expires_at", value: String(Date.now() + expiresIn * 1000) },
    ];

    if (resolvedAccountId) {
      settingsToStore.push({ key: "ig_account_id", value: encrypt(resolvedAccountId) });
    }

    for (const entry of settingsToStore) {
      await db.insert(schema.settings).values(entry)
        .onConflictDoUpdate({
          target: schema.settings.key,
          set: { value: entry.value, updatedAt: new Date().toISOString() },
        });
    }

    // Clean up legacy credential storage if it exists
    for (const legacyKey of ["ig_username", "ig_password"]) {
      await db.delete(schema.settings).where(eq(schema.settings.key, legacyKey));
    }

    return NextResponse.json({
      connected: true,
      accountId: resolvedAccountId,
      environment: env,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Disconnect IG
export async function DELETE(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keysToDelete = [
    "ig_api_key",
    "ig_username",
    "ig_password",
    "ig_account_id",
    "ig_oauth_access_token",
    "ig_oauth_refresh_token",
    "ig_oauth_expires_at",
  ];

  for (const key of keysToDelete) {
    await db.delete(schema.settings).where(eq(schema.settings.key, key));
  }

  return NextResponse.json({ success: true });
}

// GET: Check IG connection status
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const rows = await db.select().from(schema.settings).where(eq(schema.settings.key, "ig_oauth_access_token"));
    const hasToken = rows.length > 0 && !!rows[0].value;

    return NextResponse.json({ connected: hasToken });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
