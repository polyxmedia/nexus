import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq, like } from "drizzle-orm";
import { ingestWikipedia, WIKIPEDIA_CATEGORY_COUNT } from "@/lib/knowledge/ingest-wikipedia";

async function isAdmin(username: string): Promise<boolean> {
  const users = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, `user:${username}`));
  if (users.length === 0) return false;
  const userData = JSON.parse(users[0].value);
  return userData.role === "admin";
}

/**
 * POST /api/wiki/ingest - Trigger Wikipedia bulk ingest
 *
 * Body (optional):
 *   { maxPerCategory?: number, categories?: string[] }
 *
 * Admin only. Returns ingest results.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await isAdmin(session.user.name))) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    let maxPerCategory = 50;
    let categories: string[] | undefined;

    try {
      const body = await request.json();
      if (body.maxPerCategory) maxPerCategory = Math.min(body.maxPerCategory, 100);
      if (body.categories) categories = body.categories;
    } catch {
      // No body is fine, use defaults
    }

    console.log(`[Wiki Ingest] Starting: ${maxPerCategory} per category, ${categories?.length || WIKIPEDIA_CATEGORY_COUNT} categories`);

    const result = await ingestWikipedia(maxPerCategory, categories);

    console.log(`[Wiki Ingest] Done: ${result.ingested} ingested, ${result.skipped} skipped, ${result.errors} errors`);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Wiki ingest error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/wiki/ingest - Get ingest status (count of Wikipedia articles)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await db
      .select({ id: schema.knowledge.id })
      .from(schema.knowledge)
      .where(eq(schema.knowledge.source, "wikipedia"));

    return NextResponse.json({
      totalArticles: result.length,
      availableCategories: WIKIPEDIA_CATEGORY_COUNT,
    });
  } catch {
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 });
  }
}
