import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const projects = await db.select().from(schema.chatProjects).orderBy(desc(schema.chatProjects.createdAt));
    return NextResponse.json({ projects });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, color } = await req.json();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const [project] = await db.insert(schema.chatProjects).values({ name, color: color || "#06b6d4", createdAt: new Date().toISOString() }).returning();
    return NextResponse.json({ project });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, name, color } = await req.json();
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    const updates: Record<string, string> = {};
    if (name) updates.name = name;
    if (color) updates.color = color;
    await db.update(schema.chatProjects).set(updates).where(eq(schema.chatProjects.id, id));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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
