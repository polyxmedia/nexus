// Background news sync job
// Fetches from all external sources and caches in the news_articles table.
// The /api/news endpoint reads from this table for instant page loads.

import { db, schema } from "@/lib/db";
import { eq, desc, lt } from "drizzle-orm";
import { getNewsFeed } from "./feeds";

/** Max age of articles before they get pruned (48 hours) */
const MAX_AGE_MS = 48 * 60 * 60 * 1000;

/**
 * Fetch news from all external sources and upsert into news_articles table.
 * Called by the scheduler every 10 minutes.
 */
export async function syncNewsToDb(): Promise<{ inserted: number; pruned: number }> {
  let inserted = 0;

  // Fetch all categories in parallel
  const articles = await getNewsFeed(undefined, 200);

  for (const article of articles) {
    try {
      await db
        .insert(schema.newsArticles)
        .values({
          title: article.title,
          url: article.url,
          source: article.source,
          category: article.category,
          description: article.description || null,
          imageUrl: article.imageUrl || null,
          bias: article.bias || null,
          publishedAt: article.date,
          fetchedAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: schema.newsArticles.url,
          set: {
            title: article.title,
            category: article.category,
            description: article.description || null,
            imageUrl: article.imageUrl || null,
            bias: article.bias || null,
            fetchedAt: new Date().toISOString(),
          },
        });
      inserted++;
    } catch {
      // Skip duplicates or other insert errors
    }
  }

  // Prune old articles (older than 48h)
  const cutoff = new Date(Date.now() - MAX_AGE_MS).toISOString();
  const pruned = await db
    .delete(schema.newsArticles)
    .where(lt(schema.newsArticles.publishedAt, cutoff))
    .returning({ id: schema.newsArticles.id });

  console.log(`[news-sync] ${inserted} upserted, ${pruned.length} pruned`);
  return { inserted, pruned: pruned.length };
}

/**
 * Read cached news from DB. Instant response, no external fetches.
 */
export async function getCachedNews(
  category?: string,
  limit: number = 30
): Promise<Array<{
  title: string;
  url: string;
  source: string;
  category: string;
  description: string | null;
  imageUrl: string | null;
  bias: string | null;
  date: string;
}>> {
  let query = db
    .select()
    .from(schema.newsArticles)
    .orderBy(desc(schema.newsArticles.publishedAt))
    .limit(limit);

  if (category && ["world", "markets", "conflict", "energy"].includes(category)) {
    query = db
      .select()
      .from(schema.newsArticles)
      .where(eq(schema.newsArticles.category, category))
      .orderBy(desc(schema.newsArticles.publishedAt))
      .limit(limit);
  }

  const rows = await query;

  return rows.map((r) => ({
    title: r.title,
    url: r.url,
    source: r.source,
    category: r.category,
    description: r.description,
    imageUrl: r.imageUrl,
    bias: r.bias,
    date: r.publishedAt,
  }));
}
