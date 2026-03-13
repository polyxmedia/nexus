/**
 * Admin blog management API.
 * GET - list all posts (all statuses)
 * POST - generate article, update post, publish/unpublish, delete
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { generateArticle, listAllPosts } from "@/lib/blog/writer";

async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return false;
  const rows = await db.select().from(schema.settings).where(
    eq(schema.settings.key, `user:${session.user.name}`)
  );
  if (rows.length === 0) return false;
  try {
    const data = JSON.parse(rows[0].value);
    return data.role === "admin";
  } catch {
    return false;
  }
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const posts = await listAllPosts();
    return NextResponse.json({ posts });
  } catch (err) {
    console.error("[admin/blog] Failed to list posts:", err);
    return NextResponse.json({ posts: [] });
  }
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "generate": {
        const { predictionId, topic, autoPublish } = body;
        const result = await generateArticle({ predictionId, topic, autoPublish });
        return NextResponse.json({ ok: true, post: result });
      }

      case "publish": {
        const { id } = body;
        await db.update(schema.blogPosts).set({
          status: "published",
          publishedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }).where(eq(schema.blogPosts.id, id));
        return NextResponse.json({ ok: true });
      }

      case "unpublish": {
        const { id } = body;
        await db.update(schema.blogPosts).set({
          status: "draft",
          updatedAt: new Date().toISOString(),
        }).where(eq(schema.blogPosts.id, id));
        return NextResponse.json({ ok: true });
      }

      case "archive": {
        const { id } = body;
        await db.update(schema.blogPosts).set({
          status: "archived",
          updatedAt: new Date().toISOString(),
        }).where(eq(schema.blogPosts.id, id));
        return NextResponse.json({ ok: true });
      }

      case "update": {
        const { id, title, excerpt, body: postBody, category, tags, author } = body;
        const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
        if (title != null) updates.title = title;
        if (excerpt != null) updates.excerpt = excerpt;
        if (postBody != null) updates.body = postBody;
        if (category != null) updates.category = category;
        if (tags != null) updates.tags = JSON.stringify(tags);
        if (author != null) updates.author = author;
        await db.update(schema.blogPosts).set(updates).where(eq(schema.blogPosts.id, id));
        return NextResponse.json({ ok: true });
      }

      case "delete": {
        const { id } = body;
        await db.delete(schema.blogPosts).where(eq(schema.blogPosts.id, id));
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[admin/blog] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
