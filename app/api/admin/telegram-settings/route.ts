import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { validateOrigin } from "@/lib/security/csrf";

const SETTINGS_KEYS = {
  aiEnabled: "telegram_ai_enabled",
  rateLimit: "telegram_ai_rate_limit",
  model: "telegram_ai_model",
} as const;

async function isAdmin(username: string): Promise<boolean> {
  const users = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, `user:${username}`));
  if (users.length === 0) return false;
  const userData = JSON.parse(users[0].value);
  return userData.role === "admin";
}

async function getSetting(key: string): Promise<string | null> {
  const rows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, key));
  return rows[0]?.value ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  const now = new Date().toISOString();
  const rows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, key));
  if (rows.length > 0) {
    await db
      .update(schema.settings)
      .set({ value, updatedAt: now })
      .where(eq(schema.settings.key, key));
  } else {
    await db.insert(schema.settings).values({ key, value, updatedAt: now });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name || !(await isAdmin(session.user.name))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const [aiEnabled, rateLimit, model] = await Promise.all([
      getSetting(SETTINGS_KEYS.aiEnabled),
      getSetting(SETTINGS_KEYS.rateLimit),
      getSetting(SETTINGS_KEYS.model),
    ]);

    return NextResponse.json({
      aiEnabled: aiEnabled !== "false",
      rateLimit: rateLimit ? parseInt(rateLimit, 10) : 10,
      model: model || "claude-haiku-4-5-20251001",
    });
  } catch {
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name || !(await isAdmin(session.user.name))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { aiEnabled, rateLimit, model } = body;

    const validModels = [
      "claude-haiku-4-5-20251001",
      "claude-sonnet-4-20250514",
      "claude-sonnet-4-6",
    ];

    await Promise.all([
      setSetting(SETTINGS_KEYS.aiEnabled, String(aiEnabled ?? true)),
      setSetting(SETTINGS_KEYS.rateLimit, String(Math.max(1, Math.min(100, parseInt(rateLimit, 10) || 10)))),
      setSetting(SETTINGS_KEYS.model, validModels.includes(model) ? model : "claude-haiku-4-5-20251001"),
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
