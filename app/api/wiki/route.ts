import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and, like, desc, sql } from "drizzle-orm";
import { searchKnowledge, addKnowledge } from "@/lib/knowledge/engine";
import { requireTier } from "@/lib/auth/require-tier";

/**
 * GET /api/wiki - Search and browse Wikipedia knowledge bank entries
 *
 * Query params:
 *   ?q=search+term       - Semantic search (vector)
 *   ?category=geopolitical - Filter by knowledge category
 *   ?id=123              - Get single article by ID
 *   ?browse=true         - Browse mode: list recent Wikipedia entries
 *   ?limit=20            - Max results (default 20)
 *   ?offset=0            - Pagination offset
 */
export async function GET(request: NextRequest) {
  const tierCheck = await requireTier("observer");
  if ("response" in tierCheck) return tierCheck.response;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const category = searchParams.get("category");
  const idParam = searchParams.get("id");
  const browse = searchParams.get("browse");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const offset = parseInt(searchParams.get("offset") || "0");

  try {
    // Single article by ID
    if (idParam) {
      const id = parseInt(idParam, 10);
      const rows = await db
        .select()
        .from(schema.knowledge)
        .where(and(eq(schema.knowledge.id, id), eq(schema.knowledge.source, "wikipedia")))
        .limit(1);

      if (rows.length === 0) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const entry = rows[0];
      // If article is truncated, try to fetch full content from Wikipedia
      let metadata: Record<string, unknown> = {};
      try { metadata = JSON.parse(entry.metadata || "{}"); } catch { /* noop */ }
      if (metadata.truncated && metadata.wikipediaPageId) {
        const fullContent = await fetchFullArticle(entry.title.replace(/^Wikipedia:\s*/i, ""));
        if (fullContent && fullContent.length > entry.content.length) {
          // Update the stored content with full version
          await db
            .update(schema.knowledge)
            .set({
              content: fullContent.slice(0, 10000),
              metadata: JSON.stringify({ ...metadata, truncated: fullContent.length > 10000, fullLength: fullContent.length }),
              updatedAt: new Date().toISOString(),
            })
            .where(eq(schema.knowledge.id, id));
          entry.content = fullContent.slice(0, 10000);
        }
      }

      // Fetch image from Wikipedia
      const cleanTitle = entry.title.replace(/^Wikipedia:\s*/i, "");
      const images = await fetchArticleImage(cleanTitle);

      return NextResponse.json({ entry, ...images }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" } });
    }

    // Semantic search
    if (q) {
      const results = await searchKnowledge(q, {
        limit,
        useVector: true,
        ...(category ? { category } : {}),
      });
      // Filter to Wikipedia entries only
      const wikiResults = results.filter((r) => r.source === "wikipedia");
      return NextResponse.json({ entries: wikiResults, total: wikiResults.length }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
    }

    // Browse mode - list Wikipedia entries
    const conditions = [eq(schema.knowledge.source, "wikipedia")];
    if (category) conditions.push(eq(schema.knowledge.category, category));

    const entries = await db
      .select({
        id: schema.knowledge.id,
        title: schema.knowledge.title,
        category: schema.knowledge.category,
        tags: schema.knowledge.tags,
        confidence: schema.knowledge.confidence,
        createdAt: schema.knowledge.createdAt,
        content: schema.knowledge.content,
      })
      .from(schema.knowledge)
      .where(and(...conditions))
      .orderBy(desc(schema.knowledge.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.knowledge)
      .where(and(...conditions));
    const total = Number(countResult[0]?.count || 0);

    // Get category breakdown
    const categoryBreakdown = await db
      .select({
        category: schema.knowledge.category,
        count: sql<number>`count(*)`,
      })
      .from(schema.knowledge)
      .where(eq(schema.knowledge.source, "wikipedia"))
      .groupBy(schema.knowledge.category);

    // Fetch thumbnails for list entries (batch via Wikipedia API)
    const titlesForImages = entries
      .map((e) => e.title.replace(/^Wikipedia:\s*/i, ""))
      .slice(0, 20);
    const thumbnails = await fetchBatchThumbnails(titlesForImages);

    return NextResponse.json({
      entries: entries.map((e) => {
        const clean = e.title.replace(/^Wikipedia:\s*/i, "");
        return { ...e, content: e.content.slice(0, 200), thumbnail: thumbnails[clean] || null };
      }),
      total,
      categories: categoryBreakdown,
    });
  } catch (error) {
    console.error("Wiki API error:", error);
    return NextResponse.json({ error: "Failed to fetch wiki data" }, { status: 500 });
  }
}

/**
 * Fetch full article content from Wikipedia API.
 */
/**
 * Fetch thumbnail and main image from Wikipedia for a single article.
 */
async function fetchArticleImage(title: string): Promise<{ thumbnail: string | null; image: string | null }> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=thumbnail|original&pithumbsize=600&titles=${encodeURIComponent(title)}&format=json&origin=*`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6_000) });
    if (!res.ok) return { thumbnail: null, image: null };
    const data = await res.json();
    const pages = data?.query?.pages || {};
    for (const page of Object.values(pages) as Array<{ thumbnail?: { source: string }; original?: { source: string } }>) {
      return {
        thumbnail: page.thumbnail?.source || null,
        image: page.original?.source || null,
      };
    }
    return { thumbnail: null, image: null };
  } catch {
    return { thumbnail: null, image: null };
  }
}

/**
 * Fetch thumbnails for multiple articles in one API call (max 50).
 */
async function fetchBatchThumbnails(titles: string[]): Promise<Record<string, string>> {
  if (titles.length === 0) return {};
  try {
    const titlesParam = titles.join("|");
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=thumbnail&pithumbsize=120&titles=${encodeURIComponent(titlesParam)}&format=json&origin=*`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return {};
    const data = await res.json();
    const pages = data?.query?.pages || {};
    const result: Record<string, string> = {};
    for (const page of Object.values(pages) as Array<{ title: string; thumbnail?: { source: string } }>) {
      if (page.thumbnail?.source) {
        result[page.title] = page.thumbnail.source;
      }
    }
    return result;
  } catch {
    return {};
  }
}

async function fetchFullArticle(title: string): Promise<string | null> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext&titles=${encodeURIComponent(title)}&format=json&origin=*`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data?.query?.pages || {};
    for (const page of Object.values(pages) as Array<{ extract?: string }>) {
      if (page.extract) return page.extract;
    }
    return null;
  } catch {
    return null;
  }
}
