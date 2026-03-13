import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";

async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return false;
  const rows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, `user:${session.user.name}`));
  if (rows.length === 0) return false;
  const userData = JSON.parse(rows[0].value);
  return userData.role === "admin";
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
  const type = url.searchParams.get("type"); // prediction | resolution | analyst | reply

  try {
    let query = db
      .select()
      .from(schema.twitterPosts)
      .orderBy(desc(schema.twitterPosts.createdAt))
      .limit(limit);

    if (type) {
      query = db
        .select()
        .from(schema.twitterPosts)
        .where(eq(schema.twitterPosts.tweetType, type))
        .orderBy(desc(schema.twitterPosts.createdAt))
        .limit(limit);
    }

    const posts = await query;

    // Also get reply stats
    const replies = await db
      .select()
      .from(schema.twitterReplies)
      .orderBy(desc(schema.twitterReplies.createdAt))
      .limit(20);

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const repliesToday = replies.filter((r) => r.createdAt >= todayStart.toISOString() && r.replyText !== "[SKIPPED]").length;

    return NextResponse.json({
      posts,
      stats: {
        total: posts.length,
        repliesToday,
        byType: {
          prediction: posts.filter((p) => p.tweetType === "prediction").length,
          resolution: posts.filter((p) => p.tweetType === "resolution").length,
          analyst: posts.filter((p) => p.tweetType === "analyst").length,
          reply: posts.filter((p) => p.tweetType === "reply").length,
        },
      },
    });
  } catch (err) {
    console.error("[admin/twitter-activity] Error:", err);
    return NextResponse.json({ posts: [], stats: { total: 0, repliesToday: 0, byType: {} } });
  }
}
