/**
 * Twitter/X API v2 client for posting tweets.
 *
 * Uses OAuth 2.0 User Context tokens stored in the database (platform-wide).
 * Tokens are set via admin OAuth flow at /admin#integrations.
 * Automatically refreshes expired tokens.
 */

import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { decrypt, encrypt } from "@/lib/encryption";

interface TweetResult {
  id: string;
  text: string;
}

/**
 * Get the stored OAuth 2.0 access token, refreshing if expired.
 */
async function getAccessToken(): Promise<string | null> {
  const rows = await db.select().from(schema.settings).where(
    eq(schema.settings.key, "twitter_oauth_access_token")
  );
  if (rows.length === 0) return null;

  const accessToken = decrypt(rows[0].value);

  // Check if expired
  const expiryRows = await db.select().from(schema.settings).where(
    eq(schema.settings.key, "twitter_oauth_expires_at")
  );
  if (expiryRows.length > 0) {
    const expiresAt = Number(expiryRows[0].value);
    // Refresh 5 minutes before expiry
    if (Date.now() > expiresAt - 5 * 60 * 1000) {
      const refreshed = await tryRefreshToken();
      if (refreshed) return refreshed;
    }
  }

  return accessToken;
}

async function tryRefreshToken(): Promise<string | null> {
  try {
    const refreshRows = await db.select().from(schema.settings).where(
      eq(schema.settings.key, "twitter_oauth_refresh_token")
    );
    if (refreshRows.length === 0) return null;

    const refreshToken = decrypt(refreshRows[0].value);
    const { refreshAccessToken } = await import("./oauth");
    const tokens = await refreshAccessToken(refreshToken);
    const expiresAt = Date.now() + tokens.expires_in * 1000;

    // Store new tokens
    const updates = [
      { key: "twitter_oauth_access_token", value: encrypt(tokens.access_token) },
      { key: "twitter_oauth_refresh_token", value: encrypt(tokens.refresh_token) },
      { key: "twitter_oauth_expires_at", value: String(expiresAt) },
    ];

    for (const entry of updates) {
      await db.insert(schema.settings).values(entry)
        .onConflictDoUpdate({
          target: schema.settings.key,
          set: { value: entry.value },
        });
    }

    return tokens.access_token;
  } catch (err) {
    console.error("[twitter] Token refresh failed:", err);
    return null;
  }
}

/**
 * Post a tweet. Returns the tweet ID and text, or null if Twitter is not configured.
 */
export async function postTweet(text: string): Promise<TweetResult | null> {
  const token = await getAccessToken();
  if (!token) return null;

  // X API enforces 280 character limit
  const truncated = text.length > 280 ? text.slice(0, 277) + "..." : text;

  const url = "https://api.x.com/2/tweets";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: truncated }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[twitter] Failed to post tweet (${res.status}): ${body}`);
    return null;
  }

  const data = await res.json();
  return { id: data.data.id, text: data.data.text };
}

/**
 * Post a thread (multiple tweets in reply chain).
 */
export async function postThread(tweets: string[]): Promise<TweetResult[]> {
  const token = await getAccessToken();
  if (!token) return [];

  const results: TweetResult[] = [];
  let replyToId: string | undefined;

  for (const text of tweets) {
    const truncated = text.length > 280 ? text.slice(0, 277) + "..." : text;
    const url = "https://api.x.com/2/tweets";

    const body: Record<string, unknown> = { text: truncated };
    if (replyToId) {
      body.reply = { in_reply_to_tweet_id: replyToId };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[twitter] Thread tweet failed (${res.status}): ${errBody}`);
      break;
    }

    const data = await res.json();
    const result = { id: data.data.id, text: data.data.text };
    results.push(result);
    replyToId = result.id;
  }

  return results;
}

/**
 * Quote tweet - post a tweet that references another tweet.
 * Uses the X API v2 quote_tweet_id parameter.
 */
export async function quoteTweet(text: string, quotedTweetId: string): Promise<TweetResult | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const truncated = text.length > 280 ? text.slice(0, 277) + "..." : text;

  const res = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: truncated,
      quote_tweet_id: quotedTweetId,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[twitter] Failed to quote tweet ${quotedTweetId} (${res.status}): ${body}`);
    return null;
  }

  const data = await res.json();
  return { id: data.data.id, text: data.data.text };
}

/**
 * Log a tweet to the twitter_posts table for admin visibility.
 */
export async function logTweet(opts: {
  tweetId: string;
  tweetType: "prediction" | "resolution" | "analyst" | "reply";
  content: string;
  predictionId?: number;
  quoteTweetId?: string;
}): Promise<void> {
  try {
    await db.insert(schema.twitterPosts).values({
      tweetId: opts.tweetId,
      tweetType: opts.tweetType,
      content: opts.content,
      predictionId: opts.predictionId || null,
      quoteTweetId: opts.quoteTweetId || null,
    });
  } catch (err) {
    console.error("[twitter] Failed to log tweet:", err);
  }
}

/**
 * Reply to a specific tweet.
 */
export async function replyToTweet(tweetId: string, text: string): Promise<TweetResult | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const truncated = text.length > 280 ? text.slice(0, 277) + "..." : text;

  const res = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: truncated,
      reply: { in_reply_to_tweet_id: tweetId },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[twitter] Failed to reply to ${tweetId} (${res.status}): ${body}`);
    return null;
  }

  const data = await res.json();
  return { id: data.data.id, text: data.data.text };
}

export interface SearchedTweet {
  id: string;
  text: string;
  authorId: string;
  authorUsername: string;
  createdAt: string;
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
  };
}

/**
 * Search recent tweets matching a query. Returns up to maxResults tweets.
 * Uses Twitter API v2 recent search (last 7 days).
 */
export async function searchTweets(query: string, maxResults: number = 10): Promise<SearchedTweet[]> {
  const token = await getAccessToken();
  if (!token) return [];

  const params = new URLSearchParams({
    query,
    max_results: String(Math.min(Math.max(maxResults, 10), 100)),
    "tweet.fields": "created_at,public_metrics,author_id",
    expansions: "author_id",
    "user.fields": "username",
  });

  const res = await fetch(`https://api.x.com/2/tweets/search/recent?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[twitter] Search failed (${res.status}): ${body}`);
    return [];
  }

  const json = await res.json();
  const tweets = json.data || [];
  const users: Record<string, string> = {};
  for (const u of json.includes?.users || []) {
    users[u.id] = u.username;
  }

  return tweets.map((t: Record<string, unknown>) => ({
    id: t.id as string,
    text: t.text as string,
    authorId: t.author_id as string,
    authorUsername: users[t.author_id as string] || "unknown",
    createdAt: t.created_at as string,
    metrics: {
      likes: (t.public_metrics as Record<string, number>)?.like_count || 0,
      retweets: (t.public_metrics as Record<string, number>)?.retweet_count || 0,
      replies: (t.public_metrics as Record<string, number>)?.reply_count || 0,
    },
  }));
}

/**
 * Check if Twitter is configured by looking for stored tokens.
 */
export async function isTwitterConfigured(): Promise<boolean> {
  const rows = await db.select().from(schema.settings).where(
    eq(schema.settings.key, "twitter_oauth_access_token")
  );
  return rows.length > 0;
}
