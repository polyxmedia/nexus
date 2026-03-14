import "server-only";
import { db, schema } from "@/lib/db";
import { desc, sql, gte } from "drizzle-orm";
import { analyzeSentiment } from "./sentiment-engine";

/**
 * Analyze recent unanalyzed news articles in batches.
 */
export async function analyzeRecentArticles(limit = 20): Promise<{ analyzed: number; errors: number }> {
  // Find articles without sentiment analysis (LEFT JOIN where sentiment is null)
  const unanalyzed = await db.execute(sql`
    SELECT n.id, n.title, n.url, n.source, n.category, n.description
    FROM news_articles n
    LEFT JOIN sentiment_analyses s ON s.source_url = n.url
    WHERE s.id IS NULL AND n.description IS NOT NULL AND n.description != ''
    ORDER BY n.fetched_at DESC
    LIMIT ${limit}
  `);

  let analyzed = 0;
  let errors = 0;
  const rows = unanalyzed.rows as Array<{ title: string; url: string; source: string; category: string; description: string }>;

  // Process in batches of 5
  for (let i = 0; i < rows.length; i += 5) {
    const batch = rows.slice(i, i + 5);
    const promises = batch.map(async (article) => {
      try {
        const text = `${article.title}\n\n${article.description}`;
        await analyzeSentiment(text, "news", article.title, article.url);
        analyzed++;
      } catch {
        errors++;
      }
    });
    await Promise.all(promises);
  }

  return { analyzed, errors };
}

/**
 * Get aggregated sentiment by category over a time window.
 */
export async function getAggregatedSentiment(
  category?: string,
  hours = 24,
): Promise<{
  avgSentiment: number;
  articleCount: number;
  trendDirection: "improving" | "deteriorating" | "stable";
  byCategory: Record<string, { avg: number; count: number }>;
}> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const results = await db.select().from(schema.sentimentAnalyses)
    .where(gte(schema.sentimentAnalyses.createdAt, since))
    .orderBy(desc(schema.sentimentAnalyses.createdAt));

  if (results.length === 0) {
    return { avgSentiment: 0, articleCount: 0, trendDirection: "stable", byCategory: {} };
  }

  const avgSentiment = results.reduce((s, r) => s + (r.sentimentScore || 0), 0) / results.length;

  // Split into first half and second half for trend detection
  const midpoint = Math.floor(results.length / 2);
  const recentHalf = results.slice(0, midpoint);
  const olderHalf = results.slice(midpoint);

  const recentAvg = recentHalf.length > 0
    ? recentHalf.reduce((s, r) => s + (r.sentimentScore || 0), 0) / recentHalf.length
    : 0;
  const olderAvg = olderHalf.length > 0
    ? olderHalf.reduce((s, r) => s + (r.sentimentScore || 0), 0) / olderHalf.length
    : 0;

  const shift = recentAvg - olderAvg;
  const trendDirection = shift > 0.1 ? "improving" : shift < -0.1 ? "deteriorating" : "stable";

  // Group by source type
  const byCategory: Record<string, { avg: number; count: number }> = {};
  for (const r of results) {
    const cat = r.sourceType;
    if (!byCategory[cat]) byCategory[cat] = { avg: 0, count: 0 };
    byCategory[cat].avg += r.sentimentScore || 0;
    byCategory[cat].count++;
  }
  for (const cat of Object.keys(byCategory)) {
    byCategory[cat].avg = Math.round((byCategory[cat].avg / byCategory[cat].count) * 1000) / 1000;
  }

  return {
    avgSentiment: Math.round(avgSentiment * 1000) / 1000,
    articleCount: results.length,
    trendDirection,
    byCategory,
  };
}
