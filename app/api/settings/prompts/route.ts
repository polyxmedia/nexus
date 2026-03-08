import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { PROMPT_REGISTRY } from "@/lib/prompts/registry";
import { loadPrompt, savePrompt, deletePromptOverride, hasPromptOverride } from "@/lib/prompts/loader";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return null;
  const username = session.user.name;
  const rows = await db.select().from(schema.settings).where(eq(schema.settings.key, `user:${username}`));
  if (!rows[0]) return null;
  try {
    const data = JSON.parse(rows[0].value);
    return data.role === "admin" ? username : null;
  } catch { return null; }
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const prompts = await Promise.all(
      PROMPT_REGISTRY.map(async (def) => ({
        key: def.key,
        label: def.label,
        description: def.description,
        category: def.category,
        value: await loadPrompt(def.key),
        isOverridden: hasPromptOverride(def.key),
        defaultValue: def.defaultValue,
      }))
    );
    return NextResponse.json(prompts);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { key, value } = await request.json();
    if (!key || value === undefined) {
      return NextResponse.json({ error: "key and value are required" }, { status: 400 });
    }
    const def = PROMPT_REGISTRY.find((p) => p.key === key);
    if (!def) {
      return NextResponse.json({ error: "Unknown prompt key" }, { status: 400 });
    }
    savePrompt(key, value);
    return NextResponse.json({ success: true, key });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { key } = await request.json();
    if (!key) {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }
    deletePromptOverride(key);
    return NextResponse.json({ success: true, key });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
