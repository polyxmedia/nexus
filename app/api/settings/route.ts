import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq, not, like } from "drizzle-orm";
import { encrypt, decrypt } from "@/lib/encryption";
import { validateOrigin } from "@/lib/security/csrf";

// Keys that are global (not per-user) and readable by any authenticated user
const GLOBAL_READABLE_KEYS = new Set([
  "system_prompt",
  "trading_environment",
  "ai_model",
  "ai_chat_model",
  "jiang_mode",
  "max_order_size",
  "daily_trade_limit",
  "position_concentration_pct",
  "default_stop_loss_pct",
  "default_take_profit_pct",
  "news_polling_interval",
  "osint_polling_interval",
  "aircraft_polling_interval",
  "market_refresh_interval",
  "prediction_auto_resolve",
  "admin_notification_email",
]);

// Keys that are global and only writable by admins
const GLOBAL_ADMIN_KEYS = new Set([
  "system_prompt",
  "admin_notification_email",
]);

const SENSITIVE_KEYS = new Set([
  "anthropic_api_key",
  "t212_api_key",
  "t212_api_secret",
  "alpha_vantage_api_key",
  "coinbase_api_key",
  "coinbase_api_secret",
  "fred_api_key",
  "acled_api_key",
  "voyage_api_key",
  "trading212_api_key",
  "trading212_api_secret",
  "polymarket_private_key",
  "kalshi_api_key_id",
  "kalshi_private_key",
]);

function maskValue(key: string, rawValue: string): string {
  const baseKey = key.includes(":") ? key.split(":").slice(1).join(":") : key;
  // Decrypt before masking so we show the real last-4 (not ciphertext last-4)
  const value = SENSITIVE_KEYS.has(baseKey) ? (() => { try { return decrypt(rawValue); } catch { return rawValue; } })() : rawValue;
  if (SENSITIVE_KEYS.has(baseKey)) {
    if (value.length <= 4) return "****";
    return "****" + value.slice(-4);
  }
  return value;
}

async function getSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return null;
  return session;
}

async function isAdmin(username: string): Promise<boolean> {
  const rows = await db.select().from(schema.settings).where(eq(schema.settings.key, `user:${username}`));
  if (!rows[0]) return false;
  try {
    const data = JSON.parse(rows[0].value);
    return data.role === "admin";
  } catch { return false; }
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const username = session.user!.name!;
  const admin = await isAdmin(username);

  try {
    let rows;
    if (admin) {
      // Admins can see all non-user-account settings
      rows = await db.select().from(schema.settings)
        .where(not(like(schema.settings.key, "user:%")));
    } else {
      // Regular users only see their own scoped settings + global readable keys
      const allRows = await db.select().from(schema.settings)
        .where(not(like(schema.settings.key, "user:%")));
      rows = allRows.filter(r =>
        r.key.startsWith(`${username}:`) ||
        GLOBAL_READABLE_KEYS.has(r.key)
      );
    }

    const masked = rows.map((s) => ({
      ...s,
      value: maskValue(s.key, s.value),
    }));

    return NextResponse.json(masked);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const username = session.user!.name!;
  const admin = await isAdmin(username);

  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: "key and value are required" }, { status: 400 });
    }

    // Enforce key scoping: non-admins can only write their own keys or allowed globals
    if (!admin) {
      if (GLOBAL_ADMIN_KEYS.has(key)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      // Allow global settings that are user-configurable (like trading_environment, api keys)
      // but prevent writing keys that belong to other users
      if (key.includes(":") && !key.startsWith(`${username}:`)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Encrypt sensitive keys before storing
    const baseKey = key.includes(":") ? key.split(":").slice(1).join(":") : key;
    const storedValue = SENSITIVE_KEYS.has(baseKey) ? encrypt(String(value)) : String(value);

    const existingRows = await db.select().from(schema.settings).where(eq(schema.settings.key, key));

    if (existingRows.length > 0) {
      await db.update(schema.settings)
        .set({ value: storedValue, updatedAt: new Date().toISOString() })
        .where(eq(schema.settings.key, key));
    } else {
      await db.insert(schema.settings).values({ key, value: storedValue, updatedAt: new Date().toISOString() });
    }

    return NextResponse.json({ success: true, key });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const username = session.user!.name!;
  const admin = await isAdmin(username);

  try {
    const body = await request.json();
    const { key } = body;

    if (!key) {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }

    // Admins can delete any non-user-account key
    // Regular users can only delete their own keys
    if (!admin) {
      if (key.startsWith("user:") || GLOBAL_ADMIN_KEYS.has(key)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (key.includes(":") && !key.startsWith(`${username}:`)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    await db.delete(schema.settings).where(eq(schema.settings.key, key));
    return NextResponse.json({ success: true, key });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
