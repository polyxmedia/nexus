/**
 * Admin blog management API.
 * GET - list all posts (all statuses)
 * POST - generate article, update post, publish/unpublish, delete
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { generateArticle, refineArticle, analyzeArticle, fixFromAnalysis, craftArticleThread, listAllPosts } from "@/lib/blog/writer";
import { postThread, logTweet, isTwitterConfigured } from "@/lib/twitter/client";

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

export async function POST(req: NextRequest) {
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

        // Auto-post Twitter thread in background (don't block the publish response)
        (async () => {
          try {
            if (!(await isTwitterConfigured())) return;
            const rows = await db.select().from(schema.blogPosts).where(eq(schema.blogPosts.id, id));
            if (rows.length === 0) return;
            const post = rows[0];
            const tweets = await craftArticleThread({
              title: post.title,
              excerpt: post.excerpt,
              body: post.body,
              slug: post.slug,
              category: post.category,
            });
            if (tweets.length === 0) return;
            const results = await postThread(tweets);
            if (results.length > 0) {
              await logTweet({
                tweetId: results[0].id,
                tweetType: "analyst",
                content: tweets.join("\n---\n"),
              });
              console.log(`[admin/blog] Posted Twitter thread (${results.length} tweets) for article ${id}`);
            }
          } catch (err) {
            console.error("[admin/blog] Twitter thread failed:", err);
          }
        })();

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

      case "refine": {
        const { title, excerpt, body: articleBody } = body;
        const refined = await refineArticle({ title, excerpt, body: articleBody });
        return NextResponse.json({ ok: true, refined });
      }

      case "analyze": {
        const { title, excerpt, body: articleBody } = body;
        const analysis = await analyzeArticle({ title, excerpt, body: articleBody });
        return NextResponse.json({ ok: true, analysis });
      }

      case "fix-from-analysis": {
        const { title, excerpt, body: articleBody, issues, suggestions } = body;
        if (!Array.isArray(issues) || !Array.isArray(suggestions)) {
          return NextResponse.json({ error: "issues and suggestions must be arrays" }, { status: 400 });
        }
        const fixed = await fixFromAnalysis({ title, excerpt, body: articleBody, issues, suggestions });
        return NextResponse.json({ ok: true, fixed });
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
