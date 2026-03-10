import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { requireTier } from "@/lib/auth/require-tier";
import { db, schema } from "@/lib/db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

// GET: List comments for a target, or get counts
export async function GET(req: NextRequest) {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view");
  const targetType = searchParams.get("targetType");

  // Comment counts mode: /api/comments?view=counts&targetType=signal&ids=1,2,3
  if (view === "counts" && targetType) {
    const idsParam = searchParams.get("ids");
    if (!idsParam) return NextResponse.json({ counts: {} });
    const ids = idsParam.split(",").map(Number).filter(Boolean);
    if (ids.length === 0) return NextResponse.json({ counts: {} });

    try {
      const rows = await db
        .select({
          targetId: schema.comments.targetId,
          count: sql<number>`count(*)::int`,
        })
        .from(schema.comments)
        .where(
          and(
            eq(schema.comments.targetType, targetType),
            inArray(schema.comments.targetId, ids)
          )
        )
        .groupBy(schema.comments.targetId);

      const counts: Record<number, number> = {};
      for (const row of rows) {
        counts[row.targetId] = row.count;
      }
      return NextResponse.json({ counts });
    } catch {
      return NextResponse.json({ counts: {} });
    }
  }

  const targetId = searchParams.get("targetId");

  if (!targetType || !targetId) {
    return NextResponse.json({ error: "targetType and targetId required" }, { status: 400 });
  }

  try {
    const rows = await db
      .select()
      .from(schema.comments)
      .where(
        and(
          eq(schema.comments.targetType, targetType),
          eq(schema.comments.targetId, parseInt(targetId))
        )
      )
      .orderBy(desc(schema.comments.createdAt));

    // Look up profile images for all commenters
    const uniqueUserIds = [...new Set(rows.map((r) => r.userId))];
    const profileImages: Record<string, string | null> = {};
    if (uniqueUserIds.length > 0) {
      const userRows = await db
        .select()
        .from(schema.settings)
        .where(
          inArray(
            schema.settings.key,
            uniqueUserIds.map((u) => `user:${u}`)
          )
        );
      for (const row of userRows) {
        try {
          const data = JSON.parse(row.value);
          const username = row.key.replace("user:", "");
          profileImages[username] = data.profileImage || null;
        } catch (err) { console.error("[Comments] profile image parse failed:", err); }
      }
    }

    const comments = rows.map((r) => ({
      ...r,
      profileImage: profileImages[r.userId] || null,
    }));

    return NextResponse.json({ comments });
  } catch {
    return NextResponse.json({ comments: [] });
  }
}

// POST: Create a comment
export async function POST(req: NextRequest) {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { targetType, targetId, content, parentId } = body;

    if (!targetType || !targetId || !content?.trim()) {
      return NextResponse.json({ error: "targetType, targetId, and content required" }, { status: 400 });
    }

    if (!["signal", "prediction", "thesis"].includes(targetType)) {
      return NextResponse.json({ error: "Invalid targetType" }, { status: 400 });
    }

    // Max comment length
    if (content.length > 2000) {
      return NextResponse.json({ error: "Comment too long (max 2000 chars)" }, { status: 400 });
    }

    const [comment] = await db.insert(schema.comments).values({
      userId: session.user.name,
      targetType,
      targetId: parseInt(targetId),
      content: content.trim(),
      parentId: parentId ? parseInt(parentId) : undefined,
    }).returning();

    return NextResponse.json({ comment });
  } catch (err) {
    console.error("[Comments] Error:", err);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}

// DELETE: Delete own comment
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Accept id from body or query params
  const { searchParams } = new URL(req.url);
  let commentId = searchParams.get("id");
  if (!commentId) {
    try {
      const body = await req.json();
      commentId = body.id ? String(body.id) : null;
    } catch (err) { console.error("[Comments] request body parse failed:", err); }
  }

  if (!commentId) {
    return NextResponse.json({ error: "Comment id required" }, { status: 400 });
  }

  try {
    const [comment] = await db
      .select()
      .from(schema.comments)
      .where(eq(schema.comments.id, parseInt(commentId)));

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Only own comments or admin can delete
    if (comment.userId !== session.user.name) {
      // Check if admin
      const userRows = await db.select().from(schema.settings)
        .where(eq(schema.settings.key, `user:${session.user.name}`));
      const userData = userRows[0] ? JSON.parse(userRows[0].value) : null;
      if (userData?.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    await db.delete(schema.comments).where(eq(schema.comments.id, parseInt(commentId)));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Comments] Delete error:", err);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
