/**
 * Twitter Reply Engine
 *
 * Finds relevant threads about geopolitics, markets, macro, and risk,
 * then replies with genuine analytical value using NEXUS intelligence.
 * Tracks every reply in the database so we never respond to the same
 * tweet twice and never spam.
 *
 * Runs every 2 hours via scheduler. Posts at most 3 replies per run.
 */

import Anthropic from "@anthropic-ai/sdk";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { searchTweets, replyToTweet, isTwitterConfigured, type SearchedTweet } from "./client";
import { detectCurrentRegime } from "@/lib/regime/detection";
import type { RegimeState } from "@/lib/regime/detection";
import { getCachedNews } from "@/lib/news/sync";

// ── Search queries rotated each run ──
// These target conversations where NEXUS analysis genuinely adds value.
// We avoid generic finance keywords to stay in our lane.

const SEARCH_QUERIES = [
  // Geopolitical risk & markets intersection
  '"geopolitical risk" (markets OR stocks OR portfolio) -is:retweet -is:reply lang:en',
  '(sanctions OR tariffs OR "trade war") (impact OR markets OR economy) -is:retweet -is:reply lang:en',
  '"risk off" (regime OR environment OR positioning) -is:retweet -is:reply lang:en',

  // Macro analysis
  '("yield curve" OR "credit spreads" OR "VIX") (signal OR warning OR elevated) -is:retweet -is:reply lang:en',
  '("fed rate" OR "interest rate") (prediction OR forecast OR outlook) -is:retweet -is:reply lang:en',
  '(inflation OR CPI OR "consumer prices") (data OR reading OR surprise) -is:retweet -is:reply lang:en',

  // Geopolitical events
  '(conflict OR escalation OR "military") (oil OR energy OR commodities) -is:retweet -is:reply lang:en',
  '("Middle East" OR "Red Sea" OR "Taiwan Strait") (risk OR shipping OR trade) -is:retweet -is:reply lang:en',
  '("NATO" OR "defense spending") (europe OR alliance) -is:retweet -is:reply lang:en',

  // Intelligence / OSINT community
  '(OSINT OR "open source intelligence") (geopolitical OR conflict OR tracking) -is:retweet -is:reply lang:en',

  // Prediction / forecasting
  '("prediction market" OR "forecast accuracy" OR "brier score") -is:retweet -is:reply lang:en',
  '("base rate" OR calibration) (forecast OR prediction) -is:retweet -is:reply lang:en',

  // Risk analysis
  '("systemic risk" OR "tail risk" OR "black swan") (market OR financial) -is:retweet -is:reply lang:en',
  '("regime change" OR "regime shift") (market OR monetary OR fiscal) -is:retweet -is:reply lang:en',

  // Energy & commodities geopolitics
  '(OPEC OR "oil price" OR "crude oil") (geopolitics OR supply OR cut) -is:retweet -is:reply lang:en',
  '("gold price" OR "safe haven") (uncertainty OR risk OR flight) -is:retweet -is:reply lang:en',
];

// Our own account -- never reply to ourselves
const OWN_USERNAME = "nexaboratorio";

// Minimum engagement to reply to (avoid talking to empty rooms)
const MIN_LIKES = 3;
const MIN_ENGAGEMENT = 5; // likes + retweets + replies

// Max replies per run to avoid spam
const MAX_REPLIES_PER_RUN = 3;

// How many queries to run per cycle (rotate through them)
const QUERIES_PER_RUN = 4;

const REPLY_PROMPT = `You are the senior analyst behind NEXUS Intelligence Platform (@nexaboratorio). Someone posted a tweet about a topic you have genuine analytical insight on. Write a reply that adds real value.

RULES:
- Add substance they can't get elsewhere. Reference specific data points, regime states, historical parallels, or framework-level thinking
- Never self-promote. Do not mention NEXUS, the platform, or link to anything. Pure analytical value only
- Match the tone of the conversation. If they're casual, be conversational. If they're technical, go deep
- Keep it under 260 characters. Dense insight, not filler
- No emojis ever
- No "great point" or "interesting thread" or any sycophantic opener. Just add your take
- If you cannot add genuine analytical value to this specific tweet, return null. Do NOT force a reply
- Never hedge with "it depends" or "time will tell". State your view with the data behind it
- Do not start with "I" or "@"

RESPONSE FORMAT:
Return exactly one JSON object:
{ "reply": "your reply text" }
Or if this tweet isn't worth replying to:
{ "reply": null, "reason": "brief reason" }`;

interface ReplyContext {
  regime: RegimeState;
  recentHeadlines: string[];
}

async function gatherReplyContext(): Promise<ReplyContext> {
  let regime: RegimeState;
  try {
    regime = await detectCurrentRegime();
  } catch {
    regime = { composite: "unknown", compositeScore: 0 } as RegimeState;
  }

  let recentHeadlines: string[] = [];
  try {
    const news = await getCachedNews(undefined, 20);
    recentHeadlines = news.map((n) => n.title);
  } catch {
    // fine without
  }

  return { regime, recentHeadlines };
}

function buildReplyPrompt(tweet: SearchedTweet, ctx: ReplyContext): string {
  const lines: string[] = [];

  lines.push(`TWEET TO REPLY TO:`);
  lines.push(`@${tweet.authorUsername}: "${tweet.text}"`);
  lines.push(`Engagement: ${tweet.metrics.likes} likes, ${tweet.metrics.retweets} RTs, ${tweet.metrics.replies} replies`);
  lines.push(``);

  lines.push(`YOUR CURRENT INTELLIGENCE:`);
  lines.push(`Market regime: ${ctx.regime.composite} (score: ${ctx.regime.compositeScore?.toFixed(2) || "N/A"})`);
  if (ctx.regime.volatility?.vix != null) {
    lines.push(`VIX: ${ctx.regime.volatility.vix.toFixed(1)}`);
  }
  if (ctx.regime.monetary?.fedFunds != null) {
    lines.push(`Fed Funds: ${ctx.regime.monetary.fedFunds.toFixed(2)}%`);
  }
  if (ctx.regime.dollar?.dxy != null) {
    lines.push(`DXY: ${ctx.regime.dollar.dxy.toFixed(1)}`);
  }
  if (ctx.regime.commodity?.oil != null) {
    lines.push(`Oil: $${ctx.regime.commodity.oil.toFixed(1)}`);
  }
  if (ctx.regime.commodity?.gold != null) {
    lines.push(`Gold: $${ctx.regime.commodity.gold.toFixed(0)}`);
  }
  lines.push(``);

  if (ctx.recentHeadlines.length > 0) {
    lines.push(`RECENT HEADLINES (for context):`);
    for (const h of ctx.recentHeadlines.slice(0, 10)) {
      lines.push(`- ${h}`);
    }
    lines.push(``);
  }

  lines.push(`Write a reply that adds genuine analytical value to this conversation. If you can't, return null.`);

  return lines.join("\n");
}

/**
 * Check if we've already replied to a tweet.
 */
async function hasReplied(tweetId: string): Promise<boolean> {
  const rows = await db
    .select({ id: schema.twitterReplies.id })
    .from(schema.twitterReplies)
    .where(eq(schema.twitterReplies.tweetId, tweetId))
    .limit(1);
  return rows.length > 0;
}

/**
 * Record a reply in the database.
 */
async function recordReply(
  tweetId: string,
  authorUsername: string,
  originalText: string,
  replyText: string,
  replyTweetId: string | null,
  query: string
) {
  await db.insert(schema.twitterReplies).values({
    tweetId,
    authorUsername,
    originalText: originalText.slice(0, 500),
    replyText,
    replyTweetId,
    query,
  });
}

/**
 * Get count of replies posted today to enforce daily limits.
 */
async function repliesToday(): Promise<number> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const rows = await db
    .select()
    .from(schema.twitterReplies)
    .orderBy(desc(schema.twitterReplies.createdAt));

  return rows.filter((r) => r.createdAt >= todayStart.toISOString()).length;
}

/**
 * Main entry point. Searches for relevant threads and replies with value.
 * Returns the number of replies posted.
 */
export async function runThreadReplies(): Promise<{ searched: number; replied: number; skipped: number }> {
  if (!(await isTwitterConfigured())) {
    console.log("[twitter-replies] Twitter not configured, skipping");
    return { searched: 0, replied: 0, skipped: 0 };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[twitter-replies] No ANTHROPIC_API_KEY");
    return { searched: 0, replied: 0, skipped: 0 };
  }

  // Daily cap: max 8 replies per day total
  const todayCount = await repliesToday();
  if (todayCount >= 8) {
    console.log(`[twitter-replies] Daily limit reached (${todayCount}/8), skipping`);
    return { searched: 0, replied: 0, skipped: 0 };
  }

  const remainingToday = 8 - todayCount;
  const maxThisRun = Math.min(MAX_REPLIES_PER_RUN, remainingToday);

  // Rotate through queries so we don't hit the same ones every run
  const hourOfDay = new Date().getUTCHours();
  const startIdx = (Math.floor(hourOfDay / 2) * QUERIES_PER_RUN) % SEARCH_QUERIES.length;
  const queries: string[] = [];
  for (let i = 0; i < QUERIES_PER_RUN; i++) {
    queries.push(SEARCH_QUERIES[(startIdx + i) % SEARCH_QUERIES.length]);
  }

  const ctx = await gatherReplyContext();
  const client = new Anthropic({ apiKey });

  let totalSearched = 0;
  let totalReplied = 0;
  let totalSkipped = 0;

  for (const query of queries) {
    if (totalReplied >= maxThisRun) break;

    try {
      const tweets = await searchTweets(query, 15);
      totalSearched += tweets.length;

      // Filter candidates
      const candidates = [];
      for (const tweet of tweets) {
        // Skip our own tweets
        if (tweet.authorUsername.toLowerCase() === OWN_USERNAME) continue;

        // Skip low engagement (avoid empty rooms)
        const engagement = tweet.metrics.likes + tweet.metrics.retweets + tweet.metrics.replies;
        if (tweet.metrics.likes < MIN_LIKES || engagement < MIN_ENGAGEMENT) continue;

        // Skip if already replied
        if (await hasReplied(tweet.id)) {
          totalSkipped++;
          continue;
        }

        candidates.push(tweet);
      }

      // Sort by engagement (reply to the most visible conversations)
      candidates.sort((a, b) => {
        const engA = a.metrics.likes + a.metrics.retweets * 2;
        const engB = b.metrics.likes + b.metrics.retweets * 2;
        return engB - engA;
      });

      // Try to reply to top candidates
      for (const tweet of candidates.slice(0, 3)) {
        if (totalReplied >= maxThisRun) break;

        try {
          const prompt = buildReplyPrompt(tweet, ctx);
          const response = await client.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 400,
            system: REPLY_PROMPT,
            messages: [{ role: "user", content: prompt }],
          });

          const text = response.content[0].type === "text" ? response.content[0].text : "";
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) continue;

          const result = JSON.parse(jsonMatch[0]);
          if (!result.reply) {
            console.log(`[twitter-replies] Skipped @${tweet.authorUsername}: ${result.reason || "not worth replying"}`);
            // Record as skipped so we don't re-evaluate next run
            await recordReply(tweet.id, tweet.authorUsername, tweet.text, "[SKIPPED]", null, query);
            totalSkipped++;
            continue;
          }

          // Post the reply
          const posted = await replyToTweet(tweet.id, result.reply);
          await recordReply(
            tweet.id,
            tweet.authorUsername,
            tweet.text,
            result.reply,
            posted?.id || null,
            query
          );

          if (posted) {
            totalReplied++;
            console.log(`[twitter-replies] Replied to @${tweet.authorUsername} (${posted.id}): ${result.reply.slice(0, 80)}...`);
          }

          // Rate limit buffer between replies
          await new Promise((r) => setTimeout(r, 2000));
        } catch (err) {
          console.error(`[twitter-replies] Error processing tweet ${tweet.id}:`, err);
        }
      }

      // Buffer between search queries
      await new Promise((r) => setTimeout(r, 1500));
    } catch (err) {
      console.error(`[twitter-replies] Search error for query "${query.slice(0, 40)}...":`, err);
    }
  }

  console.log(`[twitter-replies] Done: searched=${totalSearched}, replied=${totalReplied}, skipped=${totalSkipped}`);
  return { searched: totalSearched, replied: totalReplied, skipped: totalSkipped };
}
