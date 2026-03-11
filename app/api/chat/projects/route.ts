import { NextRequest, NextResponse } from "next/server";
import { getEffectiveUsername } from "@/lib/auth/effective-user";
import { db, schema } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import { validateOrigin } from "@/lib/security/csrf";

export async function GET() {
  const user = await getEffectiveUsername();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const projects = await db
      .select()
      .from(schema.chatProjects)
      .where(eq(schema.chatProjects.userId, user))
      .orderBy(desc(schema.chatProjects.createdAt));
    return NextResponse.json({ projects });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const user = await getEffectiveUsername();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { name, color, instructions } = await req.json();
    if (!name || typeof name !== "string" || name.length > 200) {
      return NextResponse.json({ error: "Name is required (max 200 chars)" }, { status: 400 });
    }
    if (color && (typeof color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(color))) {
      return NextResponse.json({ error: "Invalid color format" }, { status: 400 });
    }
    if (instructions && typeof instructions !== "string") {
      return NextResponse.json({ error: "Instructions must be a string" }, { status: 400 });
    }
    if (instructions && instructions.length > 10000) {
      return NextResponse.json({ error: "Instructions too long (max 10,000 chars)" }, { status: 400 });
    }
    const [project] = await db.insert(schema.chatProjects).values({
      name,
      color: color || "#06b6d4",
      userId: user,
      instructions: instructions || null,
      createdAt: new Date().toISOString(),
    }).returning();
    return NextResponse.json({ project });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const user = await getEffectiveUsername();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id, name, color, instructions } = await req.json();
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    if (name && (typeof name !== "string" || name.length > 200)) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }
    if (color && (typeof color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(color))) {
      return NextResponse.json({ error: "Invalid color format" }, { status: 400 });
    }
    if (instructions !== undefined && instructions !== null && typeof instructions !== "string") {
      return NextResponse.json({ error: "Instructions must be a string" }, { status: 400 });
    }
    const updates: Record<string, string | null> = { updatedAt: new Date().toISOString() };
    if (name) updates.name = name;
    if (color) updates.color = color;
    if (instructions !== undefined) updates.instructions = instructions;
    await db.update(schema.chatProjects).set(updates).where(eq(schema.chatProjects.id, id));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const user = await getEffectiveUsername();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await db.update(schema.chatSessions).set({ projectId: null }).where(eq(schema.chatSessions.projectId, id));
    await db.delete(schema.chatProjects).where(eq(schema.chatProjects.id, id));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
