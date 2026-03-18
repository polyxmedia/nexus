/**
 * Context-Aware Alert Scanner
 *
 * Automatically monitors news for events relevant to the user's:
 * - Manual positions (tickers they hold)
 * - Watchlist items (tickers they track)
 * - Active theses (symbols, sectors, themes)
 * - Recent chat conversations (extracted topics)
 * - Analyst memory (stored thesis/portfolio context)
 *
 * No manual alert creation needed. If you hold oil, talk about oil,
 * or have an oil thesis, you get alerted when something moves oil.
 */

import { db, schema } from "../db";
import { eq, desc, like, and, sql } from "drizzle-orm";
import { getNewsFeed, type NewsArticle } from "../news/feeds";
import { sendMessage } from "@/lib/telegram/bot";
import { sendSms } from "@/lib/sms";

// In-memory cache for fast lookups, backed by DB persistence
const alertedArticlesCache = new Set<string>();
let cacheLoaded = false;

// Settings key for persisted article hashes
const ALERTED_KEY = "system:context_scan_alerted";
const DAILY_COUNT_KEY_PREFIX = "system:context_scan_daily_";
const MAX_PERSISTED_HASHES = 1000;
const MAX_DAILY_CONTEXT_ALERTS = 10;

/**
 * Load persisted article hashes from DB into memory cache.
 * Only runs once per server session, then stays in sync.
 */
async function ensureCacheLoaded() {
  if (cacheLoaded) return;
  try {
    const row = await db.select().from(schema.settings)
      .where(eq(schema.settings.key, ALERTED_KEY))
      .then(rows => rows[0]);
    if (row?.value) {
      const hashes: string[] = JSON.parse(row.value);
      for (const h of hashes) alertedArticlesCache.add(h);
    }
  } catch { /* table might not exist */ }
  cacheLoaded = true;
}

/**
 * Upsert a setting by key (atomic, no read-then-write).
 */
async function upsertSetting(key: string, value: string) {
  const now = new Date().toISOString();
  await db.insert(schema.settings)
    .values({ key, value, updatedAt: now })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: now } });
}

/**
 * Persist current article hash cache to DB.
 */
async function persistCache() {
  const hashes = [...alertedArticlesCache];
  const trimmed = hashes.slice(-MAX_PERSISTED_HASHES);
  try {
    await upsertSetting(ALERTED_KEY, JSON.stringify(trimmed));
  } catch { /* silent */ }
}

/**
 * Get daily alert count from DB (persists across restarts).
 */
async function getDailyAlertCount(): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const key = `${DAILY_COUNT_KEY_PREFIX}${today}`;
  try {
    const row = await db.select().from(schema.settings)
      .where(eq(schema.settings.key, key))
      .then(rows => rows[0]);
    return row?.value ? parseInt(row.value, 10) : 0;
  } catch { return 0; }
}

/**
 * Increment daily alert count in DB (atomic via SQL).
 */
async function incrementDailyAlertCount() {
  const today = new Date().toISOString().split("T")[0];
  const key = `${DAILY_COUNT_KEY_PREFIX}${today}`;
  try {
    // Try to increment existing row first
    const result = await db.update(schema.settings)
      .set({
        value: sql`CAST(CAST(${schema.settings.value} AS INTEGER) + 1 AS TEXT)`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.settings.key, key))
      .returning();
    // If no row existed, insert with value "1"
    if (result.length === 0) {
      await upsertSetting(key, "1");
    }
  } catch { /* silent */ }
}

// Ticker -> common name / sector mapping for keyword expansion
const TICKER_KEYWORDS: Record<string, string[]> = {
  // Energy
  USO: ["oil", "crude", "wti", "brent", "opec", "petroleum", "barrel", "spr", "strategic reserve"],
  XLE: ["energy sector", "oil", "exxon", "chevron", "energy stocks"],
  XOP: ["oil exploration", "shale", "drilling", "oil producer"],
  OIH: ["oil services", "halliburton", "schlumberger"],
  UNG: ["natural gas", "lng", "henry hub"],
  // Precious metals
  GLD: ["gold", "bullion", "precious metals", "safe haven"],
  SLV: ["silver"],
  GDX: ["gold miners", "gold mining"],
  // Defense
  ITA: ["defense", "military", "weapons", "arms", "pentagon", "lockheed", "raytheon"],
  LMT: ["lockheed", "defense contract", "f-35", "military"],
  RTX: ["raytheon", "missile", "defense", "patriot"],
  NOC: ["northrop", "b-21", "defense"],
  // Broad market
  SPY: ["s&p 500", "s&p", "stock market", "wall street", "fed", "federal reserve"],
  QQQ: ["nasdaq", "tech stocks", "technology sector", "big tech"],
  DIA: ["dow jones", "dow", "industrial"],
  IWM: ["russell", "small cap"],
  // Bonds / rates
  TLT: ["treasury", "bond", "interest rate", "yield", "fed rate"],
  HYG: ["high yield", "junk bond", "credit spread"],
  // Crypto
  BTC: ["bitcoin", "btc", "crypto", "cryptocurrency", "digital asset"],
  ETH: ["ethereum", "eth", "defi", "smart contract"],
  XRP: ["ripple", "xrp"],
  SOL: ["solana"],
  // Commodities
  DBA: ["agriculture", "wheat", "corn", "soybean", "food price"],
  WEAT: ["wheat", "grain", "food supply"],
  URA: ["uranium", "nuclear"],
  COPX: ["copper", "industrial metal"],
  // Shipping / trade
  BDRY: ["shipping", "dry bulk", "freight", "supply chain", "trade route"],
  // China
  FXI: ["china", "chinese", "beijing", "xi jinping", "ccp"],
  KWEB: ["chinese tech", "alibaba", "tencent", "china internet"],
  // Volatility
  VIX: ["vix", "volatility", "fear index", "cboe"],
  UVXY: ["volatility", "vix"],
  // Currency
  UUP: ["dollar", "usd", "dollar index", "dxy"],
  FXE: ["euro", "eur", "ecb", "european central bank"],
  FXY: ["yen", "japan", "boj", "bank of japan"],
  // Individual stocks (common ones)
  AAPL: ["apple"],
  MSFT: ["microsoft"],
  GOOGL: ["google", "alphabet"],
  AMZN: ["amazon"],
  NVDA: ["nvidia", "gpu", "ai chip"],
  TSLA: ["tesla", "ev", "electric vehicle"],
  META: ["meta", "facebook", "instagram"],
  JPM: ["jpmorgan", "jp morgan"],
  BAC: ["bank of america"],
  GS: ["goldman sachs"],
  XOM: ["exxon", "exxonmobil"],
  CVX: ["chevron"],
  BA: ["boeing"],
};

// Sector -> keywords for thesis sector matching
const SECTOR_KEYWORDS: Record<string, string[]> = {
  energy: ["oil", "gas", "crude", "opec", "petroleum", "barrel", "refinery", "pipeline", "lng", "wti", "brent", "spr", "strategic reserve", "energy"],
  defense: ["military", "defense", "weapon", "missile", "war", "conflict", "nato", "pentagon", "arms"],
  technology: ["tech", "ai", "semiconductor", "chip", "software", "cloud", "cyber"],
  "precious metals": ["gold", "silver", "platinum", "bullion", "precious metal"],
  shipping: ["shipping", "freight", "vessel", "port", "supply chain", "trade route", "suez", "strait"],
  "broad market": ["market", "s&p", "dow", "nasdaq", "recession", "rally", "crash", "correction"],
  crypto: ["bitcoin", "crypto", "ethereum", "blockchain", "digital asset", "defi"],
  agriculture: ["wheat", "corn", "soybean", "food", "agriculture", "crop", "drought", "famine"],
  finance: ["bank", "interest rate", "fed", "central bank", "inflation", "treasury", "bond", "yield", "credit"],
  geopolitical: ["sanction", "tariff", "embargo", "diplomacy", "summit", "treaty", "alliance", "invasion"],
};

interface InterestProfile {
  tickers: Set<string>;
  keywords: Set<string>;
  sources: {
    positions: string[];
    watchlist: string[];
    theses: string[];
    chat: string[];
    memory: string[];
  };
}

interface ContextMatch {
  article: NewsArticle;
  matchedKeywords: string[];
  matchedTickers: string[];
  relevanceScore: number; // 1-5
  sources: string[]; // which user context matched (positions, watchlist, theses, chat)
}

/**
 * Build an interest profile from all user context sources.
 */
export async function buildInterestProfile(userId?: string): Promise<InterestProfile> {
  const profile: InterestProfile = {
    tickers: new Set(),
    keywords: new Set(),
    sources: { positions: [], watchlist: [], theses: [], chat: [], memory: [] },
  };

  // 1. Manual positions
  try {
    const positions = userId
      ? await db.select().from(schema.manualPositions).where(
          and(eq(schema.manualPositions.userId, userId), eq(schema.manualPositions.closedAt, ""))
        ).catch(() => db.select().from(schema.manualPositions).where(eq(schema.manualPositions.userId, userId)))
      : await db.select().from(schema.manualPositions);

    // Filter to open positions (closedAt is null or empty)
    const openPositions = positions.filter(p => !p.closedAt);
    for (const pos of openPositions) {
      const ticker = pos.ticker.toUpperCase();
      profile.tickers.add(ticker);
      profile.sources.positions.push(ticker);
      // Expand ticker to keywords
      const expanded = TICKER_KEYWORDS[ticker];
      if (expanded) {
        expanded.forEach(kw => profile.keywords.add(kw.toLowerCase()));
      }
      // Also add the ticker name if available
      if (pos.name) {
        profile.keywords.add(pos.name.toLowerCase());
      }
    }
  } catch {
    // Table might not exist yet
  }

  // 2. Watchlist items
  try {
    const items = await db.select().from(schema.watchlistItems);
    for (const item of items) {
      const ticker = item.symbol.toUpperCase();
      profile.tickers.add(ticker);
      profile.sources.watchlist.push(ticker);
      const expanded = TICKER_KEYWORDS[ticker];
      if (expanded) {
        expanded.forEach(kw => profile.keywords.add(kw.toLowerCase()));
      }
    }
  } catch {
    // Table might not exist yet
  }

  // 3. Active theses
  try {
    const activeTheses = await db.select().from(schema.theses)
      .where(eq(schema.theses.status, "active"));

    for (const thesis of activeTheses) {
      // Extract symbols
      try {
        const symbols: string[] = JSON.parse(thesis.symbols || "[]");
        for (const sym of symbols) {
          const ticker = sym.toUpperCase();
          profile.tickers.add(ticker);
          profile.sources.theses.push(ticker);
          const expanded = TICKER_KEYWORDS[ticker];
          if (expanded) {
            expanded.forEach(kw => profile.keywords.add(kw.toLowerCase()));
          }
        }
      } catch { /* bad JSON */ }

      // Extract keywords from title and executive summary
      const thesisText = `${thesis.title} ${thesis.executiveSummary}`.toLowerCase();
      for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
        if (thesisText.includes(sector)) {
          keywords.forEach(kw => profile.keywords.add(kw));
          profile.sources.theses.push(`sector:${sector}`);
        }
      }

      // Extract trading action symbols
      try {
        const actions = JSON.parse(thesis.tradingActions || "[]");
        for (const action of actions) {
          if (action.symbol || action.ticker) {
            const ticker = (action.symbol || action.ticker).toUpperCase();
            profile.tickers.add(ticker);
            profile.sources.theses.push(ticker);
          }
        }
      } catch { /* bad JSON */ }
    }
  } catch {
    // Table might not exist
  }

  // 4. Recent chat conversations (last 24h)
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentMessages = await db.select().from(schema.chatMessages)
      .orderBy(desc(schema.chatMessages.createdAt))
      .limit(100);

    // Filter to recent messages
    const recent = recentMessages.filter(m => m.createdAt >= oneDayAgo && m.role === "user");

    // Extract keywords from user messages
    const chatText = recent.map(m => m.content).join(" ").toLowerCase();

    // Check for ticker mentions (uppercase 1-5 letter words that match known tickers)
    const tickerPattern = /\b([A-Z]{1,5})\b/g;
    const fullText = recent.map(m => m.content).join(" ");
    let tickerMatch;
    while ((tickerMatch = tickerPattern.exec(fullText)) !== null) {
      const potential = tickerMatch[1];
      if (TICKER_KEYWORDS[potential]) {
        profile.tickers.add(potential);
        profile.sources.chat.push(potential);
        TICKER_KEYWORDS[potential].forEach(kw => profile.keywords.add(kw.toLowerCase()));
      }
    }

    // Check for sector/topic mentions
    for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
      for (const kw of keywords) {
        if (chatText.includes(kw)) {
          profile.keywords.add(kw);
          // Add all related sector keywords
          keywords.forEach(k => profile.keywords.add(k));
          profile.sources.chat.push(`topic:${sector}`);
          break; // One match per sector is enough
        }
      }
    }
  } catch {
    // Chat tables might not exist
  }

  // 5. Analyst memory (thesis and portfolio categories)
  try {
    const memories = userId
      ? await db.select().from(schema.analystMemory)
          .where(eq(schema.analystMemory.userId, userId))
      : await db.select().from(schema.analystMemory).limit(50);

    for (const mem of memories) {
      if (mem.category === "thesis" || mem.category === "portfolio") {
        const text = `${mem.key} ${mem.value}`.toLowerCase();

        // Check for ticker mentions
        for (const ticker of Object.keys(TICKER_KEYWORDS)) {
          if (text.includes(ticker.toLowerCase())) {
            profile.tickers.add(ticker);
            profile.sources.memory.push(ticker);
            TICKER_KEYWORDS[ticker].forEach(kw => profile.keywords.add(kw.toLowerCase()));
          }
        }

        // Check for sector mentions
        for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
          if (text.includes(sector)) {
            keywords.forEach(kw => profile.keywords.add(kw));
            profile.sources.memory.push(`topic:${sector}`);
          }
        }
      }
    }
  } catch {
    // Table might not exist
  }

  return profile;
}

/**
 * Normalize a title to a hash for dedup tracking.
 */
function titleHash(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 80);
}

/**
 * Score how relevant an article is to the user's interest profile.
 */
function scoreArticle(article: NewsArticle, profile: InterestProfile): ContextMatch | null {
  const text = `${article.title} ${article.description || ""}`.toLowerCase();
  const matchedKeywords: string[] = [];
  const matchedTickers: string[] = [];
  const sources = new Set<string>();

  // Check ticker matches
  for (const ticker of profile.tickers) {
    const tickerLower = ticker.toLowerCase();
    if (text.includes(tickerLower)) {
      matchedTickers.push(ticker);
      // Figure out which source this ticker came from
      if (profile.sources.positions.includes(ticker)) sources.add("positions");
      if (profile.sources.watchlist.includes(ticker)) sources.add("watchlist");
      if (profile.sources.theses.includes(ticker)) sources.add("theses");
      if (profile.sources.chat.includes(ticker)) sources.add("chat");
      if (profile.sources.memory.includes(ticker)) sources.add("memory");
    }
  }

  // Check keyword matches
  for (const keyword of profile.keywords) {
    if (keyword.length < 3) continue; // Skip very short keywords
    if (text.includes(keyword)) {
      matchedKeywords.push(keyword);
    }
  }

  // Need at least 2 keyword matches or 1 ticker match to be considered relevant
  if (matchedKeywords.length < 2 && matchedTickers.length === 0) return null;

  // If no source identified, infer from keywords
  if (sources.size === 0) {
    for (const src of ["positions", "watchlist", "theses", "chat", "memory"] as const) {
      const srcItems = profile.sources[src];
      for (const item of srcItems) {
        if (item.startsWith("topic:") || item.startsWith("sector:")) {
          const topic = item.split(":")[1];
          const sectorKws = SECTOR_KEYWORDS[topic];
          if (sectorKws && matchedKeywords.some(mk => sectorKws.includes(mk))) {
            sources.add(src);
          }
        }
      }
    }
    // Fallback
    if (sources.size === 0) sources.add("keywords");
  }

  // Calculate relevance score (1-5)
  let score = 1;
  // Position match is highest priority
  if (sources.has("positions")) score += 2;
  // Watchlist is high priority
  if (sources.has("watchlist")) score += 1;
  // Thesis match
  if (sources.has("theses")) score += 1;
  // Multiple keyword matches boost score
  if (matchedKeywords.length >= 5) score += 1;
  if (matchedTickers.length >= 2) score += 1;
  // Cap at 5
  score = Math.min(score, 5);

  return {
    article,
    matchedKeywords: [...new Set(matchedKeywords)].slice(0, 10),
    matchedTickers: [...new Set(matchedTickers)],
    relevanceScore: score,
    sources: [...sources],
  };
}

/**
 * Main context scan: build profile, fetch news, find matches, fire alerts.
 */
export async function runContextScan(): Promise<{
  profileSize: { tickers: number; keywords: number };
  articlesScanned: number;
  matchesFound: number;
  alertsFired: number;
}> {
  // Load persisted dedup cache
  await ensureCacheLoaded();

  // Build the interest profile
  const profile = await buildInterestProfile();

  if (profile.tickers.size === 0 && profile.keywords.size === 0) {
    return { profileSize: { tickers: 0, keywords: 0 }, articlesScanned: 0, matchesFound: 0, alertsFired: 0 };
  }

  // Fetch latest news (200 articles across all sources)
  const articles = await getNewsFeed(undefined, 200);

  // Score each article
  const matches: ContextMatch[] = [];
  for (const article of articles) {
    // Skip if we've already alerted on this article (persistent dedup)
    const hash = titleHash(article.title);
    if (alertedArticlesCache.has(hash)) continue;

    const match = scoreArticle(article, profile);
    if (match) {
      matches.push(match);
    }
  }

  // Sort by relevance (highest first)
  matches.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Only alert on relevance 3+ (skip low-confidence keyword-only matches)
  const highRelevance = matches.filter(m => m.relevanceScore >= 3);

  // Enforce daily cap (persisted) + max 2 per scan to prevent notification fatigue
  const dailyCount = await getDailyAlertCount();
  const dailyRemaining = Math.max(0, MAX_DAILY_CONTEXT_ALERTS - dailyCount);
  const toAlert = highRelevance.slice(0, Math.min(2, dailyRemaining));
  let alertsFired = 0;

  for (const match of toAlert) {
    const hash = titleHash(match.article.title);

    // Mark as alerted (persistent)
    alertedArticlesCache.add(hash);

    // Build alert context
    const sourceLabel = match.sources
      .map(s => {
        switch (s) {
          case "positions": return "YOUR POSITIONS";
          case "watchlist": return "YOUR WATCHLIST";
          case "theses": return "YOUR THESES";
          case "chat": return "RECENT ANALYSIS";
          case "memory": return "YOUR CONTEXT";
          default: return "TRACKED TOPIC";
        }
      })
      .join(" + ");

    const tickerLabel = match.matchedTickers.length > 0
      ? ` [${match.matchedTickers.join(", ")}]`
      : "";

    const title = `Context Alert: ${match.article.title.slice(0, 100)}`;
    const message = [
      `Relevant to: ${sourceLabel}${tickerLabel}`,
      `Keywords: ${match.matchedKeywords.slice(0, 5).join(", ")}`,
      `Source: ${match.article.source}`,
      `Category: ${match.article.category}`,
    ].join("\n");

    // Record in alert history (using a system-level alert or creating one)
    try {
      // Find or create the context-scan system alert
      let contextAlert = await db.select().from(schema.alerts)
        .where(eq(schema.alerts.name, "Context-Aware Scanner"))
        .then(rows => rows[0]);

      if (!contextAlert) {
        const [created] = await db.insert(schema.alerts).values({
          name: "Context-Aware Scanner",
          type: "context_scan",
          condition: JSON.stringify({ type: "auto" }),
          cooldownMinutes: 1, // Low cooldown since dedup is handled by article hash
          enabled: 1,
          notifyTelegram: 1,
          notifySms: 0,
        }).returning();
        contextAlert = created;
      }

      // Record history
      await db.insert(schema.alertHistory).values({
        alertId: contextAlert.id,
        title,
        message,
        severity: match.relevanceScore,
        data: JSON.stringify({
          articleTitle: match.article.title,
          articleUrl: match.article.url,
          articleSource: match.article.source,
          matchedKeywords: match.matchedKeywords,
          matchedTickers: match.matchedTickers,
          sources: match.sources,
          relevanceScore: match.relevanceScore,
        }),
      });

      // Send Telegram notification
      if (contextAlert.notifyTelegram) {
        const chatIdRows = await db.select().from(schema.settings)
          .where(like(schema.settings.key, "%:telegram_chat_id"));
        for (const row of chatIdRows) {
          if (!row.value) continue;
          const severityEmoji = match.relevanceScore >= 4 ? "!!" : match.relevanceScore >= 3 ? "!" : "";
          const text = [
            `<b>CONTEXT ALERT${severityEmoji}</b>`,
            ``,
            `<b>${match.article.title}</b>`,
            ``,
            `Relevant to: <b>${sourceLabel}</b>${tickerLabel}`,
            `Keywords: ${match.matchedKeywords.slice(0, 5).join(", ")}`,
            `Source: ${match.article.source} | Relevance: ${match.relevanceScore}/5`,
            ``,
            `<a href="${match.article.url}">Read article</a> | <a href="https://nexushq.xyz/alerts">View in NEXUS</a>`,
          ].join("\n");
          sendMessage({ chatId: row.value, text }).catch((err) => console.error("[ContextScan] Telegram alert send failed:", err));
        }
      }

      // Send SMS for high-relevance matches (4+)
      if (contextAlert.notifySms && match.relevanceScore >= 4) {
        const phoneRows = await db.select().from(schema.settings)
          .where(like(schema.settings.key, "%:sms_phone"));
        for (const row of phoneRows) {
          if (!row.value) continue;
          const smsText = `NEXUS: ${match.article.title.slice(0, 120)} | Affects: ${sourceLabel}${tickerLabel} (${match.relevanceScore}/5)`;
          sendSms(row.value, smsText).catch((err) => console.error("[ContextScan] SMS alert send failed:", err));
        }
      }

      alertsFired++;
      await incrementDailyAlertCount();
    } catch (err) {
      console.error("[context-scan] Failed to record alert:", err);
    }
  }

  // Persist dedup cache to DB so it survives server restarts
  if (alertsFired > 0) {
    await persistCache();
  }

  console.log(
    `[context-scan] Profile: ${profile.tickers.size} tickers, ${profile.keywords.size} keywords. ` +
    `Scanned ${articles.length} articles. ${matches.length} matches, ${alertsFired} alerts fired.`
  );

  return {
    profileSize: { tickers: profile.tickers.size, keywords: profile.keywords.size },
    articlesScanned: articles.length,
    matchesFound: matches.length,
    alertsFired,
  };
}
