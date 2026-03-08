import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { desc, eq, like, or } from "drizzle-orm";

async function getUsername(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.name ?? null;
}

export async function GET(req: NextRequest) {
  const username = await getUsername();
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const tag = searchParams.get("tag");
    const search = searchParams.get("search");

    let sessions = await db.select().from(schema.chatSessions)
      .where(or(eq(schema.chatSessions.userId, username), eq(schema.chatSessions.userId, "legacy")))
      .orderBy(desc(schema.chatSessions.updatedAt));

    if (projectId) {
      const pid = parseInt(projectId);
      sessions = sessions.filter((s) => s.projectId === pid);
    }
    if (tag) {
      sessions = sessions.filter((s) => {
        if (!s.tags) return false;
        const tags: string[] = JSON.parse(s.tags);
        return tags.includes(tag);
      });
    }
    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      const titleMatches = sessions.filter((s) => s.title.toLowerCase().includes(term));
      const msgMatches = await db.select({ sessionId: schema.chatMessages.sessionId })
        .from(schema.chatMessages)
        .where(like(schema.chatMessages.content, `%${term}%`));
      const msgSessionIds = new Set(msgMatches.map((m) => m.sessionId));
      const matchedIds = new Set([...titleMatches.map((s) => s.id), ...msgSessionIds]);
      sessions = sessions.filter((s) => matchedIds.has(s.id));
    }

    return NextResponse.json({ sessions });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const username = await getUsername();
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    let body: { projectId?: number } = {};
    try { body = await req.json(); } catch { /* empty body is ok */ }
    const now = new Date().toISOString();
    const rows = await db.insert(schema.chatSessions).values({
      title: "New Chat",
      userId: username,
      projectId: body.projectId || null,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return NextResponse.json({ session: rows[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const username = await getUsername();
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, projectId, tags, title } = await req.json();
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    // Verify ownership
    const [existing] = await db.select().from(schema.chatSessions)
      .where(eq(schema.chatSessions.id, id));
    if (!existing || (existing.userId !== username && existing.userId !== "legacy")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (projectId !== undefined) updates.projectId = projectId;
    if (tags !== undefined) updates.tags = JSON.stringify(tags);
    if (title !== undefined) updates.title = title;

    await db.update(schema.chatSessions).set(updates).where(eq(schema.chatSessions.id, id));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const username = await getUsername();
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    // Verify ownership
    const [existing] = await db.select().from(schema.chatSessions)
      .where(eq(schema.chatSessions.id, id));
    if (!existing || (existing.userId !== username && existing.userId !== "legacy")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.delete(schema.chatMessages).where(eq(schema.chatMessages.sessionId, id));
    await db.delete(schema.chatSessions).where(eq(schema.chatSessions.id, id));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
