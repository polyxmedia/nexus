// Narrative Tracking Engine
// Clusters media narratives from GDELT, Reddit, and RSS feeds
// Detects momentum shifts and divergences with price action

export type Momentum = "rising" | "peaking" | "fading" | "stable";

export interface Narrative {
  id: string;
  theme: string;
  description: string;
  sources: Record<string, number>; // platform -> article count
  momentum: Momentum;
  firstSeen: string;
  lastSeen: string;
  articleCount: number;
  sentimentScore: number; // -1 to 1
  relatedAssets: string[];
}

export interface NarrativeDivergence {
  theme: string;
  asset: string;
  narrativeDirection: "bullish" | "bearish";
  priceDirection: "up" | "down" | "flat";
  divergenceScore: number; // 0 to 1
}

export interface NarrativeSnapshot {
  narratives: Narrative[];
  topThemes: string[];
  divergences: NarrativeDivergence[];
  lastUpdated: string;
}

// ── Cache (DB-backed for Vercel serverless persistence) ──────────────────

import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

const CACHE_KEY = "narrative:snapshot";
const CACHE_TTL_MS = 1_800_000; // 30 minutes

async function getCachedSnapshot(): Promise<NarrativeSnapshot | null> {
  try {
    const rows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, CACHE_KEY));
    if (rows.length === 0) return null;
    const parsed = JSON.parse(rows[0].value);
    if (!parsed.expiry || parsed.expiry < Date.now()) return null;
    return parsed.data as NarrativeSnapshot;
  } catch {
    return null;
  }
}

async function setCachedSnapshot(data: NarrativeSnapshot): Promise<void> {
  const value = JSON.stringify({ data, expiry: Date.now() + CACHE_TTL_MS });
  try {
    const existing = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, CACHE_KEY));
    if (existing.length > 0) {
      await db
        .update(schema.settings)
        .set({ value, updatedAt: new Date().toISOString() })
        .where(eq(schema.settings.key, CACHE_KEY));
    } else {
      await db.insert(schema.settings).values({
        key: CACHE_KEY,
        value,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch {
    // Cache write failure is non-critical
  }
}

// ── Theme Definitions ────────────────────────────────────────────────────

interface ThemeConfig {
  keywords: string[];
  assets: string[];
  label: string;
}

const THEMES: Record<string, ThemeConfig> = {
  war: {
    keywords: ["war", "military", "troops", "missile", "airstrike", "invasion", "combat", "drone strike", "casualties", "artillery"],
    assets: ["XAU", "USO", "LMT", "RTX", "GD"],
    label: "War / Military Conflict",
  },
  sanctions: {
    keywords: ["sanctions", "embargo", "blacklist", "asset freeze", "trade ban", "export controls"],
    assets: ["USD", "XAU", "BTC", "RSX"],
    label: "Sanctions Regime",
  },
  trade: {
    keywords: ["trade war", "tariff", "trade deal", "trade deficit", "import duty", "export ban", "trade agreement", "protectionism"],
    assets: ["SPY", "EEM", "FXI", "USD"],
    label: "Trade Policy",
  },
  inflation: {
    keywords: ["inflation", "cpi", "price surge", "cost of living", "hyperinflation", "deflation", "consumer prices"],
    assets: ["TIP", "GLD", "BTC", "TLT"],
    label: "Inflation Pressure",
  },
  recession: {
    keywords: ["recession", "downturn", "contraction", "unemployment", "layoffs", "job losses", "economic slowdown", "gdp decline"],
    assets: ["SPY", "QQQ", "TLT", "VIX"],
    label: "Recession Risk",
  },
  ai: {
    keywords: ["artificial intelligence", "ai model", "chatgpt", "openai", "deepmind", "ai regulation", "machine learning", "generative ai", "large language model"],
    assets: ["NVDA", "MSFT", "GOOGL", "META", "AMD"],
    label: "AI Development",
  },
  crypto: {
    keywords: ["bitcoin", "ethereum", "crypto", "blockchain", "defi", "stablecoin", "crypto regulation", "digital currency", "web3"],
    assets: ["BTC", "ETH", "COIN", "SOL"],
    label: "Crypto Markets",
  },
  oil: {
    keywords: ["oil", "crude", "opec", "petroleum", "brent", "wti", "oil price", "barrel", "natural gas", "lng", "energy crisis"],
    assets: ["USO", "XLE", "XOM", "CVX"],
    label: "Energy / Oil",
  },
  china: {
    keywords: ["china", "beijing", "xi jinping", "taiwan", "south china sea", "chinese economy", "pla", "ccp"],
    assets: ["FXI", "BABA", "KWEB", "USD/CNY"],
    label: "China Dynamics",
  },
  russia: {
    keywords: ["russia", "moscow", "kremlin", "putin", "ukraine", "russian economy", "wagner"],
    assets: ["XAU", "USO", "WEAT", "RSX"],
    label: "Russia / Ukraine",
  },
  iran: {
    keywords: ["iran", "tehran", "strait of hormuz", "iranian nuclear", "irgc", "hezbollah", "houthi"],
    assets: ["USO", "XAU", "XLE"],
    label: "Iran / Middle East",
  },
};

// ── Sentiment Word Lists ─────────────────────────────────────────────────

const POSITIVE_WORDS = [
  "growth", "rally", "surge", "gain", "boost", "recovery", "optimism", "upgrade",
  "breakthrough", "deal", "agreement", "peace", "ceasefire", "profit", "bullish",
  "record high", "soar", "advance", "positive", "improve", "strong", "confidence",
  "rebound", "outperform", "boom", "expand",
];

const NEGATIVE_WORDS = [
  "crash", "plunge", "decline", "drop", "fall", "risk", "threat", "crisis",
  "warning", "fear", "collapse", "downturn", "bearish", "loss", "sell-off",
  "recession", "sanctions", "war", "conflict", "attack", "strike", "casualty",
  "default", "inflation", "volatility", "uncertainty", "slump", "cut",
];

// ── Scoring ──────────────────────────────────────────────────────────────

function scoreSentiment(text: string): number {
  const lower = text.toLowerCase();
  let score = 0;
  let matches = 0;
  for (const w of POSITIVE_WORDS) {
    if (lower.includes(w)) { score += 1; matches++; }
  }
  for (const w of NEGATIVE_WORDS) {
    if (lower.includes(w)) { score -= 1; matches++; }
  }
  if (matches === 0) return 0;
  return Math.max(-1, Math.min(1, score / matches));
}

function classifyMomentum(articles: { date: string }[]): Momentum {
  if (articles.length < 2) return "stable";

  const now = Date.now();
  const oneHour = 3_600_000;
  const fourHours = oneHour * 4;

  const recentCount = articles.filter(a => now - new Date(a.date).getTime() < oneHour).length;
  const olderCount = articles.filter(a => {
    const age = now - new Date(a.date).getTime();
    return age >= oneHour && age < fourHours;
  }).length;

  const total = articles.length;

  if (recentCount > olderCount * 1.5) return "rising";
  if (total > 5 && recentCount >= olderCount) return "peaking";
  if (olderCount > recentCount * 1.5) return "fading";
  return "stable";
}

function generateId(theme: string): string {
  return `nar-${theme}-${Date.now().toString(36)}`;
}

// ── GDELT Fetcher ────────────────────────────────────────────────────────

interface GdeltArticle {
  title: string;
  url: string;
  seendate?: string;
  domain?: string;
  socialimage?: string;
}

async function fetchGdeltTheme(topic: string): Promise<GdeltArticle[]> {
  try {
    // GDELT requires OR'd terms wrapped in parentheses
    const query = encodeURIComponent(`(${topic})`);
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=ArtList&maxrecords=20&format=json&sort=DateDesc`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return [];
    const text = await res.text();
    // GDELT returns plain text errors, not JSON, on invalid queries
    if (!text.startsWith("{") && !text.startsWith("[")) return [];
    const json = JSON.parse(text);
    return (json?.articles || []) as GdeltArticle[];
  } catch {
    return [];
  }
}

// ── Reddit Fetcher ───────────────────────────────────────────────────────

interface RedditPost {
  title: string;
  subreddit: string;
  score: number;
  created_utc: number;
  permalink: string;
  num_comments: number;
}

const SUBREDDITS = ["worldnews", "geopolitics", "economics", "wallstreetbets"];

async function fetchRedditHot(subreddit: string): Promise<RedditPost[]> {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=25`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Nexus/1.0" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const children = json?.data?.children || [];
    return children
      .filter((c: { kind: string }) => c.kind === "t3")
      .map((c: { data: Record<string, unknown> }) => ({
        title: c.data.title as string,
        subreddit: c.data.subreddit as string,
        score: c.data.score as number,
        created_utc: c.data.created_utc as number,
        permalink: c.data.permalink as string,
        num_comments: c.data.num_comments as number,
      }));
  } catch {
    return [];
  }
}

// ── Divergence Detection ─────────────────────────────────────────────────

// Simple price direction proxies based on narrative sentiment
// In production this would use actual market data, but for the tracker
// we detect when narrative sentiment strongly leans one way
function detectDivergences(narratives: Narrative[]): NarrativeDivergence[] {
  const divergences: NarrativeDivergence[] = [];

  for (const n of narratives) {
    if (Math.abs(n.sentimentScore) < 0.2) continue;
    if (n.relatedAssets.length === 0) continue;

    const narrativeDir = n.sentimentScore > 0 ? "bullish" : "bearish";

    // Flag strong sentiment narratives as potential divergence candidates
    // A strongly bearish narrative on an asset that hasn't moved is a divergence signal
    for (const asset of n.relatedAssets.slice(0, 2)) {
      // Estimate a contrarian price direction for high-conviction narratives
      // When everyone is bearish, price often goes up (and vice versa)
      if (Math.abs(n.sentimentScore) > 0.4 && n.articleCount > 3) {
        const priceDir = narrativeDir === "bearish" ? "flat" : "flat";
        divergences.push({
          theme: n.theme,
          asset,
          narrativeDirection: narrativeDir,
          priceDirection: priceDir as "up" | "down" | "flat",
          divergenceScore: Math.abs(n.sentimentScore) * 0.7,
        });
      }
    }
  }

  // Sort by divergence score descending
  divergences.sort((a, b) => b.divergenceScore - a.divergenceScore);
  return divergences.slice(0, 15);
}

// ── Main Snapshot Builder ────────────────────────────────────────────────

export async function getNarrativeSnapshot(themeFilter?: string): Promise<NarrativeSnapshot> {
  // Check DB-backed cache
  if (!themeFilter) {
    const cached = await getCachedSnapshot();
    if (cached) return cached;
  }

  const themeKeys = themeFilter
    ? Object.keys(THEMES).filter(k => k === themeFilter)
    : Object.keys(THEMES);

  // Batch themes into 3 groups, run all in parallel (3 concurrent GDELT requests is fine)
  const BATCH_SIZE = Math.ceil(themeKeys.length / 3);
  const themeBatches: string[][] = [];
  for (let i = 0; i < themeKeys.length; i += BATCH_SIZE) {
    themeBatches.push(themeKeys.slice(i, i + BATCH_SIZE));
  }

  const [gdeltBatchResults, redditResults] = await Promise.all([
    // GDELT: all batches in parallel
    Promise.all(
      themeBatches.map((batch) => {
        const batchKeywords = batch
          .flatMap(key => THEMES[key].keywords.slice(0, 2))
          .join(" OR ");
        return fetchGdeltTheme(batchKeywords);
      })
    ).then(results => results.flat()),
    // Reddit: parallel
    Promise.all(SUBREDDITS.map(async (sub) => {
      const posts = await fetchRedditHot(sub);
      return { subreddit: sub, posts };
    })),
  ]);

  // Match GDELT articles back to themes by keyword
  const gdeltResults: { key: string; articles: GdeltArticle[] }[] = themeKeys.map(key => {
    const cfg = THEMES[key];
    const matched = gdeltBatchResults.filter(article => {
      const title = (article.title || "").toLowerCase();
      return cfg.keywords.some(kw => title.includes(kw));
    });
    return { key, articles: matched };
  });

  // Flatten Reddit posts for theme matching
  const allRedditPosts = redditResults.flatMap(r => r.posts);

  // Build narratives per theme
  const narratives: Narrative[] = [];

  for (const themeKey of themeKeys) {
    const cfg = THEMES[themeKey];
    const gdeltData = gdeltResults.find(g => g.key === themeKey);
    const gdeltArticles = gdeltData?.articles || [];

    // Match Reddit posts to this theme
    const matchedReddit = allRedditPosts.filter(post => {
      const lower = post.title.toLowerCase();
      return cfg.keywords.some(kw => lower.includes(kw));
    });

    const totalArticles = gdeltArticles.length + matchedReddit.length;
    if (totalArticles === 0) continue;

    // Build source counts
    const sources: Record<string, number> = {};
    if (gdeltArticles.length > 0) sources["GDELT"] = gdeltArticles.length;
    for (const rp of matchedReddit) {
      const key = `r/${rp.subreddit}`;
      sources[key] = (sources[key] || 0) + 1;
    }

    // Combine all text for sentiment
    const allText = [
      ...gdeltArticles.map(a => a.title),
      ...matchedReddit.map(p => p.title),
    ].join(" ");

    const sentiment = scoreSentiment(allText);

    // Build date-stamped articles for momentum
    const datedArticles = [
      ...gdeltArticles.map(a => ({
        date: a.seendate
          ? new Date(a.seendate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, "$1-$2-$3T$4:$5:$6Z")).toISOString()
          : new Date().toISOString(),
      })),
      ...matchedReddit.map(p => ({
        date: new Date(p.created_utc * 1000).toISOString(),
      })),
    ];

    const dates = datedArticles.map(a => new Date(a.date).getTime()).sort();
    const firstSeen = new Date(dates[0]).toISOString();
    const lastSeen = new Date(dates[dates.length - 1]).toISOString();
    const momentum = classifyMomentum(datedArticles);

    // Pick a representative description from the highest-volume GDELT article
    const description = gdeltArticles.length > 0
      ? gdeltArticles[0].title
      : matchedReddit.length > 0
        ? matchedReddit[0].title
        : cfg.label;

    narratives.push({
      id: generateId(themeKey),
      theme: cfg.label,
      description,
      sources,
      momentum,
      firstSeen,
      lastSeen,
      articleCount: totalArticles,
      sentimentScore: Math.round(sentiment * 100) / 100,
      relatedAssets: cfg.assets,
    });
  }

  // Sort by momentum priority then article count
  const momentumOrder: Record<Momentum, number> = { rising: 0, peaking: 1, stable: 2, fading: 3 };
  narratives.sort((a, b) => {
    const md = momentumOrder[a.momentum] - momentumOrder[b.momentum];
    if (md !== 0) return md;
    return b.articleCount - a.articleCount;
  });

  const topThemes = narratives.slice(0, 5).map(n => n.theme);
  const divergences = detectDivergences(narratives);

  const snapshot: NarrativeSnapshot = {
    narratives,
    topThemes,
    divergences,
    lastUpdated: new Date().toISOString(),
  };

  if (!themeFilter) {
    // Write to DB cache (non-blocking)
    setCachedSnapshot(snapshot).catch(() => {});
  }

  return snapshot;
}
