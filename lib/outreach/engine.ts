/**
 * Outreach Prospect Engine
 *
 * Discovers, scores, and tracks potential NEXUS users from Twitter.
 * Runs on scheduler, feeds prospects into the reply engine, and
 * tracks the full pipeline: discovered -> engaged -> replied -> visited -> converted.
 *
 * Scoring is keyword-based on bio + tweet content. No AI calls.
 * The reply engine (lib/twitter/replies.ts) handles the actual engagement.
 */

import { db, schema } from "../db";
import { eq, desc, sql, and, not, inArray } from "drizzle-orm";
import { searchTweets, type SearchedTweet } from "../twitter/client";

// ── Scoring Config ──

const BIO_KEYWORDS: Record<string, number> = {
  // High-value: direct target audience
  "macro": 15, "geopolitical": 15, "geopolitics": 15, "risk analyst": 20,
  "macro trader": 20, "macro strategist": 18, "portfolio manager": 18,
  "hedge fund": 15, "asset management": 12, "risk management": 15,
  "intelligence analyst": 20, "osint": 15, "political risk": 18,
  "sovereign wealth": 20, "institutional": 12, "commodity trader": 15,
  "energy trader": 15, "fx trader": 12, "rates trader": 12,
  "chief investment": 18, "cio": 15, "cro": 15, "head of risk": 18,
  "geopolitical risk": 20, "country risk": 18, "strategic intelligence": 20,
  "defense analyst": 15, "national security": 15, "conflict": 12,
  "due diligence": 15, "investigations": 12, "compliance": 10,

  // Medium-value: adjacent audience
  "fintwit": 8, "markets": 6, "trading": 6, "investor": 6,
  "analyst": 8, "economics": 8, "economist": 10, "strategist": 10,
  "research": 6, "quant": 10, "quantitative": 10, "systematic": 8,
  "ai finance": 10, "machine learning": 6, "data science": 5,

  // Low-value: broad interest
  "stocks": 3, "crypto": 2, "bitcoin": 2, "forex": 4,
};

const ENGAGEMENT_QUERIES = [
  "geopolitical risk market impact -is:retweet lang:en",
  "macro analysis VIX regime -is:retweet lang:en",
  "OPEC production oil supply -is:retweet lang:en",
  "\"political risk\" OR \"country risk\" analysis -is:retweet lang:en",
  "Iran oil sanctions Hormuz -is:retweet lang:en",
  "\"signal detection\" OR \"early warning\" geopolitical -is:retweet lang:en",
  "intelligence analysis OSINT market -is:retweet lang:en",
  "\"game theory\" geopolitics OR markets -is:retweet lang:en",
  "macro trader positioning risk-off -is:retweet lang:en",
  "Bayesian prediction calibration forecast -is:retweet lang:en",
];

// ── Scoring ──

function scoreProspect(username: string, bio: string, followers: number, tweetText?: string): { score: number; tags: string[] } {
  const text = `${bio} ${tweetText || ""}`.toLowerCase();
  const tags: string[] = [];
  let score = 0;

  for (const [keyword, points] of Object.entries(BIO_KEYWORDS)) {
    if (text.includes(keyword)) {
      score += points;
      // Extract category tags
      if (points >= 15) {
        const tag = keyword.replace(/\s+/g, "-");
        if (!tags.includes(tag)) tags.push(tag);
      }
    }
  }

  // Follower multiplier (log scale so 100K followers doesn't dominate)
  if (followers >= 50000) score *= 1.5;
  else if (followers >= 10000) score *= 1.3;
  else if (followers >= 5000) score *= 1.15;
  else if (followers >= 1000) score *= 1.0;
  else if (followers >= 500) score *= 0.8;
  else score *= 0.5; // < 500 followers, probably not influential

  // Penalize likely bots or spam
  if (bio.length < 10) score *= 0.3;
  if (username.match(/\d{6,}/)) score *= 0.5; // lots of numbers in username

  return { score: Math.round(score * 10) / 10, tags };
}

// ── Discovery ──

export async function discoverProspects(): Promise<{ discovered: number; updated: number }> {
  let discovered = 0;
  let updated = 0;

  // Rotate through queries (2 per run to stay within rate limits)
  const queryIndex = Math.floor(Date.now() / (30 * 60 * 1000)) % ENGAGEMENT_QUERIES.length;
  const queries = [
    ENGAGEMENT_QUERIES[queryIndex],
    ENGAGEMENT_QUERIES[(queryIndex + 1) % ENGAGEMENT_QUERIES.length],
  ];

  for (const query of queries) {
    const tweets = await searchTweets(query, 30).catch(() => [] as SearchedTweet[]);

    for (const tweet of tweets) {
      if (!tweet.authorUsername || tweet.authorUsername === "unknown") continue;

      const { score, tags } = scoreProspect(
        tweet.authorUsername,
        "", // We don't get bio from search results, will be empty until enriched
        tweet.metrics.likes + tweet.metrics.retweets, // Proxy for influence
        tweet.text
      );

      // Skip low-value prospects
      if (score < 5) continue;

      // Upsert prospect
      try {
        const existing = await db.select({ id: schema.outreachProspects.id, score: schema.outreachProspects.score })
          .from(schema.outreachProspects)
          .where(eq(schema.outreachProspects.twitterId, tweet.authorId))
          .limit(1);

        if (existing.length > 0) {
          // Update score if higher
          if (score > existing[0].score) {
            await db.update(schema.outreachProspects).set({
              score,
              tags: JSON.stringify(tags),
              updatedAt: new Date().toISOString(),
            }).where(eq(schema.outreachProspects.id, existing[0].id));
            updated++;
          }
        } else {
          await db.insert(schema.outreachProspects).values({
            twitterId: tweet.authorId,
            username: tweet.authorUsername,
            followers: tweet.metrics.likes + tweet.metrics.retweets, // Proxy
            score,
            tags: JSON.stringify(tags),
          });
          discovered++;
        }
      } catch {
        // Duplicate or DB error, skip
      }
    }

    // Pause between queries
    if (queries.indexOf(query) < queries.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  return { discovered, updated };
}

// ── Pipeline Stats ──

export async function getProspectStats(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  topProspects: Array<{
    id: number;
    username: string;
    displayName: string | null;
    bio: string | null;
    followers: number;
    score: number;
    tags: string[];
    status: string;
    engagedAt: string | null;
    notes: string | null;
    createdAt: string;
  }>;
  recentlyEngaged: number;
}> {
  const [countResult, statusResult, topRows] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(schema.outreachProspects),
    db.execute(sql`
      SELECT status, count(*)::int as count
      FROM outreach_prospects
      GROUP BY status
      ORDER BY count DESC
    `),
    db.select().from(schema.outreachProspects)
      .orderBy(desc(schema.outreachProspects.score))
      .limit(50),
  ]);

  const byStatus: Record<string, number> = {};
  for (const row of statusResult.rows as Array<{ status: string; count: number }>) {
    byStatus[row.status] = row.count;
  }

  const recentlyEngaged = (statusResult.rows as Array<{ status: string; count: number }>)
    .filter((r) => r.status !== "discovered" && r.status !== "ignored")
    .reduce((s, r) => s + r.count, 0);

  return {
    total: countResult[0]?.count || 0,
    byStatus,
    topProspects: topRows.map((p) => ({
      id: p.id,
      username: p.username,
      displayName: p.displayName,
      bio: p.bio,
      followers: p.followers,
      score: p.score,
      tags: p.tags ? JSON.parse(p.tags) : [],
      status: p.status,
      engagedAt: p.engagedAt,
      notes: p.notes,
      createdAt: p.createdAt,
    })),
    recentlyEngaged,
  };
}

// ── Status Updates ──

export async function updateProspectStatus(id: number, status: string, notes?: string): Promise<boolean> {
  const setValues: Record<string, unknown> = { status, updatedAt: new Date().toISOString() };
  if (notes !== undefined) setValues.notes = notes;
  if (status === "engaged") setValues.engagedAt = new Date().toISOString();
  if (status === "visited") setValues.visitedAt = new Date().toISOString();

  const rows = await db.update(schema.outreachProspects).set(setValues)
    .where(eq(schema.outreachProspects.id, id)).returning();
  return rows.length > 0;
}

export async function deleteProspect(id: number): Promise<boolean> {
  const rows = await db.delete(schema.outreachProspects).where(eq(schema.outreachProspects.id, id)).returning();
  return rows.length > 0;
}
