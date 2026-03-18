import { NextRequest, NextResponse } from "next/server";
import { getEffectiveUsername } from "@/lib/auth/effective-user";
import { db, schema } from "@/lib/db";
import { desc, eq, like, and, lt, sql } from "drizzle-orm";
import { validateOrigin } from "@/lib/security/csrf";

const PAGE_SIZE = 30;

export async function GET(req: NextRequest) {
  const username = await getEffectiveUsername();
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const tag = searchParams.get("tag");
    const search = searchParams.get("search");
    const cursor = searchParams.get("cursor"); // updatedAt cursor for infinite scroll
    const limit = Math.min(parseInt(searchParams.get("limit") || String(PAGE_SIZE), 10), 100);

    // Build query conditions
    const conditions = [eq(schema.chatSessions.userId, username)];
    if (projectId) conditions.push(eq(schema.chatSessions.projectId, parseInt(projectId)));
    if (cursor) conditions.push(lt(schema.chatSessions.updatedAt, cursor));

    let sessions = await db.select().from(schema.chatSessions)
      .where(and(...conditions))
      .orderBy(desc(schema.chatSessions.updatedAt))
      .limit(limit + 1); // fetch one extra to detect hasMore

    // Tag filtering (JSON field, must filter in JS)
    if (tag) {
      sessions = sessions.filter((s) => {
        if (!s.tags) return false;
        try { return (JSON.parse(s.tags) as string[]).includes(tag); } catch { return false; }
      });
    }

    // Search: title match + message content match
    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      const titleMatches = sessions.filter((s) => s.title.toLowerCase().includes(term));
      const sessionIds = sessions.map((s) => s.id);
      const msgMatches = sessionIds.length > 0
        ? await db.select({ sessionId: schema.chatMessages.sessionId })
            .from(schema.chatMessages)
            .where(and(
              like(schema.chatMessages.content, `%${term}%`),
              sql`session_id = ANY(${sessionIds}::int[])`
            ))
        : [];
      const msgSessionIds = new Set(msgMatches.map((m) => m.sessionId));
      const matchedIds = new Set([...titleMatches.map((s) => s.id), ...msgSessionIds]);
      sessions = sessions.filter((s) => matchedIds.has(s.id));
    }

    const hasMore = sessions.length > limit;
    if (hasMore) sessions = sessions.slice(0, limit);
    const nextCursor = hasMore && sessions.length > 0
      ? sessions[sessions.length - 1].updatedAt
      : null;

    return NextResponse.json(
      { sessions, hasMore, nextCursor },
      { headers: { "Cache-Control": "private, s-maxage=30, stale-while-revalidate=120" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const username = await getEffectiveUsername();
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
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const username = await getEffectiveUsername();
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, projectId, tags, title } = await req.json();
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    // Verify ownership
    const [existing] = await db.select().from(schema.chatSessions)
      .where(eq(schema.chatSessions.id, id));
    if (!existing || (existing.userId !== username)) {
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
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const username = await getEffectiveUsername();
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    // Verify ownership
    const [existing] = await db.select().from(schema.chatSessions)
      .where(eq(schema.chatSessions.id, id));
    if (!existing || (existing.userId !== username)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.delete(schema.chatMessages).where(eq(schema.chatMessages.sessionId, id));
    await db.delete(schema.documents).where(eq(schema.documents.sessionId, id));
    await db.delete(schema.chatSessions).where(eq(schema.chatSessions.id, id));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
