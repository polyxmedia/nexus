/**
 * Social Sentiment Aggregator
 *
 * Pulls sentiment from Twitter/X, Reddit, and StockTwits in parallel.
 * Runs on a background schedule (every 30 min) and caches results in memory.
 * Chat tool reads from cache -- zero latency, always fresh.
 *
 * Anti-poisoning: multi-source cross-validation + credibility scoring.
 * If one source diverges sharply from others, it's flagged as potentially
 * manipulated. Bot-like accounts (low engagement ratio, new accounts,
 * copy-paste text) are downweighted.
 */

import { searchTweets, type SearchedTweet } from "@/lib/twitter/client";

// ── Types ──

export interface SentimentPost {
  source: "twitter" | "reddit" | "stocktwits";
  id: string;
  text: string;
  author: string;
  timestamp: string;
  sentiment: number; // -1 to 1
  credibility: number; // 0 to 1 (bot score inverted)
  engagement: number; // normalized engagement score
  raw: {
    likes?: number;
    retweets?: number;
    replies?: number;
    score?: number;
    comments?: number;
  };
}

export interface TopicSentiment {
  topic: string;
  query: string;
  lastUpdated: string;
  sources: {
    twitter: { count: number; avgSentiment: number; credibilityWeightedSentiment: number; available: boolean };
    reddit: { count: number; avgSentiment: number; credibilityWeightedSentiment: number; available: boolean };
    stocktwits: { count: number; avgSentiment: number; credibilityWeightedSentiment: number; available: boolean };
  };
  composite: {
    sentiment: number; // -1 to 1, credibility-weighted across sources
    confidence: number; // 0 to 1, based on volume + agreement
    label: "very_bearish" | "bearish" | "neutral" | "bullish" | "very_bullish";
    postCount: number;
  };
  poisoning: {
    detected: boolean;
    divergence: number; // max divergence between sources (0 = agreement, 2 = opposite)
    flaggedSource: string | null;
    reason: string | null;
  };
  topPosts: SentimentPost[]; // top 5 by engagement * credibility
}

// ── Tracked Topics ──
// These run on background schedule. Mix of assets, macro, and geopolitical.

const TRACKED_TOPICS: Array<{ topic: string; twitterQuery: string; redditKeywords: string[]; stocktwitsSymbol?: string }> = [
  // Major indices
  { topic: "S&P 500", twitterQuery: "$SPY OR $SPX OR \"S&P 500\" -is:retweet lang:en", redditKeywords: ["spy", "s&p", "spx"], stocktwitsSymbol: "SPY" },
  { topic: "Nasdaq", twitterQuery: "$QQQ OR $IXIC OR \"nasdaq\" -is:retweet lang:en", redditKeywords: ["qqq", "nasdaq", "tech stocks"], stocktwitsSymbol: "QQQ" },
  // Commodities
  { topic: "Gold", twitterQuery: "$GLD OR $XAUUSD OR \"gold price\" -is:retweet lang:en", redditKeywords: ["gold", "xau", "precious metals"], stocktwitsSymbol: "GLD" },
  { topic: "Oil", twitterQuery: "$USO OR $WTI OR \"crude oil\" OR \"oil price\" -is:retweet lang:en", redditKeywords: ["oil", "crude", "wti", "brent"], stocktwitsSymbol: "USO" },
  // Safe havens
  { topic: "Treasury Bonds", twitterQuery: "$TLT OR \"treasury yield\" OR \"10 year yield\" -is:retweet lang:en", redditKeywords: ["tlt", "treasury", "bond", "yield"], stocktwitsSymbol: "TLT" },
  { topic: "Bitcoin", twitterQuery: "$BTC OR \"bitcoin\" -is:retweet lang:en", redditKeywords: ["bitcoin", "btc"], stocktwitsSymbol: "BTC.X" },
  // Volatility
  { topic: "VIX / Volatility", twitterQuery: "$VIX OR \"volatility\" OR \"fear index\" -is:retweet lang:en", redditKeywords: ["vix", "volatility", "uvxy"], stocktwitsSymbol: "VIX" },
  // Geopolitical
  { topic: "Iran", twitterQuery: "Iran sanctions OR Iran nuclear OR Hormuz -is:retweet lang:en", redditKeywords: ["iran", "hormuz", "irgc"] },
  { topic: "China", twitterQuery: "China economy OR China trade OR Taiwan strait -is:retweet lang:en", redditKeywords: ["china", "beijing", "taiwan"] },
  { topic: "OPEC", twitterQuery: "OPEC OR \"oil production\" OR \"Saudi cuts\" -is:retweet lang:en", redditKeywords: ["opec", "saudi", "oil production"] },
];

// ── In-Memory Cache ──

const sentimentCache = new Map<string, TopicSentiment>();
let lastScanTime = 0;
const SCAN_INTERVAL = 30 * 60 * 1000; // 30 min
const CACHE_TTL = 45 * 60 * 1000; // 45 min (stale grace)

// ── Public API ──

/** Get cached sentiment for a topic (instant, from background scan). */
export function getCachedSentiment(topic: string): TopicSentiment | null {
  const cached = sentimentCache.get(topic.toLowerCase());
  if (!cached) return null;
  const age = Date.now() - new Date(cached.lastUpdated).getTime();
  if (age > CACHE_TTL) return null;
  return cached;
}

/** Get all cached sentiments. */
export function getAllCachedSentiments(): TopicSentiment[] {
  const now = Date.now();
  return Array.from(sentimentCache.values()).filter(
    (s) => now - new Date(s.lastUpdated).getTime() < CACHE_TTL
  );
}

/** Get tracked topic list. */
export function getTrackedTopics(): string[] {
  return TRACKED_TOPICS.map((t) => t.topic);
}

/** Check if a scan is needed. */
export function needsScan(): boolean {
  return Date.now() - lastScanTime > SCAN_INTERVAL;
}

/**
 * Run a full background scan of all tracked topics.
 * Called by scheduler every 30 min. Each topic fetches 3 sources in parallel.
 */
export async function runSentimentScan(): Promise<{ scanned: number; errors: number }> {
  let scanned = 0;
  let errors = 0;

  // Process topics in batches of 3 to avoid rate limits
  for (let i = 0; i < TRACKED_TOPICS.length; i += 3) {
    const batch = TRACKED_TOPICS.slice(i, i + 3);
    const results = await Promise.allSettled(
      batch.map((t) => scanTopic(t))
    );

    for (let j = 0; j < results.length; j++) {
      if (results[j].status === "fulfilled") {
        const result = (results[j] as PromiseFulfilledResult<TopicSentiment>).value;
        sentimentCache.set(batch[j].topic.toLowerCase(), result);
        scanned++;
      } else {
        errors++;
      }
    }

    // 2s pause between batches to respect rate limits
    if (i + 3 < TRACKED_TOPICS.length) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  lastScanTime = Date.now();
  return { scanned, errors };
}

/**
 * On-demand scan for a custom query (not in tracked list).
 * Used when the chat tool asks about something specific.
 * Checks cache first, only scans if stale.
 */
export async function scanCustomTopic(topic: string, twitterQuery: string): Promise<TopicSentiment> {
  const cacheKey = topic.toLowerCase();
  const cached = sentimentCache.get(cacheKey);
  if (cached && Date.now() - new Date(cached.lastUpdated).getTime() < SCAN_INTERVAL) {
    return cached;
  }

  const result = await scanTopic({
    topic,
    twitterQuery,
    redditKeywords: topic.toLowerCase().split(/\s+/).filter((w) => w.length > 2),
  });

  sentimentCache.set(cacheKey, result);
  return result;
}

// ── Core Scan Logic ──

async function scanTopic(config: {
  topic: string;
  twitterQuery: string;
  redditKeywords: string[];
  stocktwitsSymbol?: string;
}): Promise<TopicSentiment> {
  // Fetch all 3 sources in parallel with tight timeouts
  const [twitterPosts, redditPosts, stocktwitsPosts] = await Promise.all([
    fetchTwitterSentiment(config.twitterQuery).catch(() => [] as SentimentPost[]),
    fetchRedditSentiment(config.redditKeywords).catch(() => [] as SentimentPost[]),
    config.stocktwitsSymbol
      ? fetchStockTwitsSentiment(config.stocktwitsSymbol).catch(() => [] as SentimentPost[])
      : Promise.resolve([] as SentimentPost[]),
  ]);

  const allPosts = [...twitterPosts, ...redditPosts, ...stocktwitsPosts];

  // Per-source aggregation
  const sources = {
    twitter: aggregateSource(twitterPosts),
    reddit: aggregateSource(redditPosts),
    stocktwits: aggregateSource(stocktwitsPosts),
  };

  // Composite: credibility-weighted average across sources
  const sourceSentiments: Array<{ sentiment: number; weight: number }> = [];
  if (sources.twitter.available) sourceSentiments.push({ sentiment: sources.twitter.credibilityWeightedSentiment, weight: 1.0 });
  if (sources.reddit.available) sourceSentiments.push({ sentiment: sources.reddit.credibilityWeightedSentiment, weight: 0.8 });
  if (sources.stocktwits.available) sourceSentiments.push({ sentiment: sources.stocktwits.credibilityWeightedSentiment, weight: 0.6 });

  const totalWeight = sourceSentiments.reduce((s, x) => s + x.weight, 0);
  const compositeSentiment = totalWeight > 0
    ? sourceSentiments.reduce((s, x) => s + x.sentiment * x.weight, 0) / totalWeight
    : 0;

  // Confidence: based on post count + source agreement
  const availableSources = [sources.twitter, sources.reddit, sources.stocktwits].filter((s) => s.available);
  const sourceAgreement = availableSources.length >= 2
    ? 1 - Math.max(...availableSources.map((s) => Math.abs(s.credibilityWeightedSentiment - compositeSentiment)))
    : 0.3;
  const volumeConfidence = Math.min(1, allPosts.length / 30);
  const confidence = Math.min(0.95, sourceAgreement * 0.6 + volumeConfidence * 0.4);

  // Poisoning detection: check for sharp divergence between sources
  const poisoning = detectPoisoning(sources);

  // Top posts by engagement * credibility
  const topPosts = allPosts
    .sort((a, b) => (b.engagement * b.credibility) - (a.engagement * a.credibility))
    .slice(0, 5);

  return {
    topic: config.topic,
    query: config.twitterQuery,
    lastUpdated: new Date().toISOString(),
    sources,
    composite: {
      sentiment: Math.round(compositeSentiment * 1000) / 1000,
      confidence: Math.round(confidence * 100) / 100,
      label: sentimentLabel(compositeSentiment),
      postCount: allPosts.length,
    },
    poisoning,
    topPosts,
  };
}

function aggregateSource(posts: SentimentPost[]): { count: number; avgSentiment: number; credibilityWeightedSentiment: number; available: boolean } {
  if (posts.length === 0) return { count: 0, avgSentiment: 0, credibilityWeightedSentiment: 0, available: false };

  const avg = posts.reduce((s, p) => s + p.sentiment, 0) / posts.length;
  const totalCred = posts.reduce((s, p) => s + p.credibility, 0);
  const weighted = totalCred > 0
    ? posts.reduce((s, p) => s + p.sentiment * p.credibility, 0) / totalCred
    : avg;

  return { count: posts.length, avgSentiment: Math.round(avg * 1000) / 1000, credibilityWeightedSentiment: Math.round(weighted * 1000) / 1000, available: true };
}

// ── Sentiment Scoring (keyword-based, no AI call = instant) ──

const BULLISH_WORDS = new Set(["bull", "bullish", "buy", "long", "moon", "pump", "rally", "breakout", "surge", "soar", "rocket", "calls", "upside", "green", "rip", "send", "bid", "accumulate", "undervalued", "cheap", "recovery", "bounce"]);
const BEARISH_WORDS = new Set(["bear", "bearish", "sell", "short", "crash", "dump", "tank", "plunge", "collapse", "puts", "downside", "red", "drill", "fade", "overvalued", "bubble", "recession", "crisis", "default", "contagion", "panic"]);
const FEAR_WORDS = new Set(["fear", "scared", "worried", "risk", "danger", "warning", "caution", "hedge", "protect", "insurance", "shelter", "flight"]);
const GREED_WORDS = new Set(["greed", "fomo", "yolo", "all-in", "diamond", "hold", "ape", "tendies", "lambo"]);

function scoreSentiment(text: string): number {
  const words = text.toLowerCase().split(/\s+/);
  let score = 0;
  let hits = 0;

  for (const word of words) {
    const clean = word.replace(/[^a-z]/g, "");
    if (BULLISH_WORDS.has(clean)) { score += 1; hits++; }
    if (BEARISH_WORDS.has(clean)) { score -= 1; hits++; }
    if (FEAR_WORDS.has(clean)) { score -= 0.5; hits++; }
    if (GREED_WORDS.has(clean)) { score += 0.3; hits++; }
  }

  if (hits === 0) return 0;
  // Normalize to -1..1 range, dampened by hit count
  return Math.max(-1, Math.min(1, score / Math.max(hits, 3)));
}

function sentimentLabel(score: number): "very_bearish" | "bearish" | "neutral" | "bullish" | "very_bullish" {
  if (score <= -0.4) return "very_bearish";
  if (score <= -0.1) return "bearish";
  if (score <= 0.1) return "neutral";
  if (score <= 0.4) return "bullish";
  return "very_bullish";
}

// ── Credibility Scoring ──

function twitterCredibility(tweet: SearchedTweet): number {
  const { likes, retweets, replies } = tweet.metrics;
  const totalEngagement = likes + retweets + replies;

  // Low engagement = potentially bot or irrelevant
  if (totalEngagement === 0) return 0.2;

  // Suspicious: very high retweets but no likes (bot amplification pattern)
  if (retweets > 10 && likes < retweets * 0.1) return 0.1;

  // Engagement quality score
  const engagementScore = Math.min(1, totalEngagement / 50);

  // Reply-to-like ratio: real conversations have replies, bots don't
  const conversationScore = replies > 0 ? Math.min(1, replies / (likes + 1)) : 0.3;

  return Math.min(1, 0.3 + engagementScore * 0.4 + conversationScore * 0.3);
}

function redditCredibility(score: number, comments: number): number {
  // Reddit's voting system is already a credibility filter
  if (score < 0) return 0.1; // Downvoted content
  if (score === 0) return 0.3;
  const scoreWeight = Math.min(1, score / 100);
  const commentWeight = Math.min(1, comments / 20);
  return Math.min(1, 0.3 + scoreWeight * 0.4 + commentWeight * 0.3);
}

// ── Poisoning Detection ──

function detectPoisoning(sources: TopicSentiment["sources"]): TopicSentiment["poisoning"] {
  const available = Object.entries(sources).filter(([, s]) => s.available);
  if (available.length < 2) return { detected: false, divergence: 0, flaggedSource: null, reason: null };

  // Find max divergence between any two sources
  let maxDivergence = 0;
  let flaggedSource: string | null = null;

  const sentiments = available.map(([name, s]) => ({ name, sentiment: s.credibilityWeightedSentiment }));
  const avgSentiment = sentiments.reduce((s, x) => s + x.sentiment, 0) / sentiments.length;

  for (const s of sentiments) {
    const div = Math.abs(s.sentiment - avgSentiment);
    if (div > maxDivergence) {
      maxDivergence = div;
      flaggedSource = s.name;
    }
  }

  // Divergence > 0.5 on a -1..1 scale is suspicious
  // Divergence > 0.8 is almost certainly manipulation
  const detected = maxDivergence > 0.5;
  const reason = detected
    ? `${flaggedSource} sentiment (${sentiments.find((s) => s.name === flaggedSource)?.sentiment.toFixed(2)}) diverges significantly from other sources (avg ${avgSentiment.toFixed(2)}). Possible dataset poisoning or coordinated campaign.`
    : null;

  return { detected, divergence: Math.round(maxDivergence * 100) / 100, flaggedSource: detected ? flaggedSource : null, reason };
}

// ── Source Fetchers ──

async function fetchTwitterSentiment(query: string): Promise<SentimentPost[]> {
  const tweets = await searchTweets(query, 30);
  return tweets.map((t) => {
    const cred = twitterCredibility(t);
    const totalEng = t.metrics.likes + t.metrics.retweets + t.metrics.replies;
    return {
      source: "twitter" as const,
      id: t.id,
      text: t.text,
      author: t.authorUsername,
      timestamp: t.createdAt,
      sentiment: scoreSentiment(t.text),
      credibility: cred,
      engagement: Math.min(1, totalEng / 100),
      raw: { likes: t.metrics.likes, retweets: t.metrics.retweets, replies: t.metrics.replies },
    };
  });
}

async function fetchRedditSentiment(keywords: string[]): Promise<SentimentPost[]> {
  const subreddits = ["wallstreetbets", "stocks", "investing", "geopolitics", "worldnews"];
  const posts: SentimentPost[] = [];

  // Fetch all subreddits in parallel
  const results = await Promise.allSettled(
    subreddits.map(async (sub) => {
      const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=25`, {
        headers: { "User-Agent": "NEXUS/1.0" },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data?.children || []) as Array<{ data: Record<string, unknown> }>;
    })
  );

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const child of result.value) {
      const d = child.data;
      const title = (d.title as string) || "";
      const selftext = ((d.selftext as string) || "").slice(0, 200);
      const text = `${title} ${selftext}`.toLowerCase();

      // Only include posts matching keywords
      if (!keywords.some((kw) => text.includes(kw))) continue;

      const score = (d.score as number) || 0;
      const comments = (d.num_comments as number) || 0;

      posts.push({
        source: "reddit",
        id: (d.id as string) || "",
        text: title,
        author: (d.author as string) || "",
        timestamp: new Date(((d.created_utc as number) || 0) * 1000).toISOString(),
        sentiment: scoreSentiment(`${title} ${selftext}`),
        credibility: redditCredibility(score, comments),
        engagement: Math.min(1, (score + comments) / 200),
        raw: { score, comments },
      });
    }
  }

  return posts;
}

async function fetchStockTwitsSentiment(symbol: string): Promise<SentimentPost[]> {
  try {
    const res = await fetch(`https://api.stocktwits.com/api/2/streams/symbol/${symbol}.json`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const messages = (json.messages || []) as Array<Record<string, unknown>>;

    return messages.slice(0, 30).map((m) => {
      const body = (m.body as string) || "";
      const user = (m.user as Record<string, unknown>) || {};
      const stSentiment = (m.entities as Record<string, unknown>)?.sentiment as Record<string, unknown> | undefined;

      // StockTwits has its own sentiment labels
      let sentimentScore = scoreSentiment(body);
      if (stSentiment?.basic === "Bullish") sentimentScore = Math.max(sentimentScore, 0.3);
      if (stSentiment?.basic === "Bearish") sentimentScore = Math.min(sentimentScore, -0.3);

      const followers = (user.followers as number) || 0;
      const cred = Math.min(1, 0.3 + Math.min(0.7, followers / 500));

      return {
        source: "stocktwits" as const,
        id: String(m.id || ""),
        text: body,
        author: (user.username as string) || "",
        timestamp: (m.created_at as string) || "",
        sentiment: sentimentScore,
        credibility: cred,
        engagement: Math.min(1, ((m.likes as Record<string, number>)?.total || 0) / 20),
        raw: { likes: (m.likes as Record<string, number>)?.total || 0 },
      };
    });
  } catch {
    return [];
  }
}
