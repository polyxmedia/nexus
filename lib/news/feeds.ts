export type PoliticalBias = "far-left" | "left" | "center-left" | "center" | "center-right" | "right" | "far-right" | "unknown";

export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  date: string;
  category: "world" | "markets" | "conflict" | "energy";
  imageUrl?: string;
  description?: string;
  bias: PoliticalBias;
}

// In-memory cache (same pattern as alpha-vantage.ts)
const cache = new Map<string, { data: NewsArticle[]; expiry: number }>();
const CACHE_TTL_MS = 600_000; // 10 minutes (more sources = slower fetches, cache longer)

const RSS_FEEDS = [
  // Center / Wire Services
  { url: "https://feeds.reuters.com/reuters/topNews", source: "Reuters" },
  { url: "https://feeds.apnews.com/rss/topnews", source: "AP News" },
  // Center-left / Intl public broadcasters
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC World" },
  { url: "https://www.france24.com/en/rss", source: "France 24" },
  { url: "https://rss.dw.com/rdf/rss-en-all", source: "Deutsche Welle" },
  { url: "https://www.aljazeera.com/xml/rss/all.xml", source: "Al Jazeera" },
  // Center-left / Western press
  { url: "https://www.theguardian.com/world/rss", source: "The Guardian" },
  // Center-right / Business
  { url: "https://feeds.content.dowjones.io/public/rss/mw_bulletins", source: "MarketWatch" },
  { url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", source: "CNBC" },
  // Center-right
  { url: "https://feeds.skynews.com/feeds/rss/world.xml", source: "Sky News" },
  // Specialist: geopolitics / foreign policy
  { url: "https://foreignpolicy.com/feed/", source: "Foreign Policy" },
  // Specialist: Middle East
  { url: "https://www.timesofisrael.com/feed/", source: "Times of Israel" },
  // Specialist: energy
  { url: "https://oilprice.com/rss/main", source: "OilPrice" },
  // Specialist: defense
  { url: "https://www.defenseone.com/rss/all/", source: "Defense One" },
  // Asia-Pacific
  { url: "https://www.scmp.com/rss/91/feed", source: "SCMP" },
];

const ENERGY_KEYWORDS = [
  "oil", "energy", "opec", "crude", "natural gas", "lng", "petroleum",
  "pipeline", "refinery", "solar", "wind power", "nuclear energy",
  "brent", "wti", "barrel",
];

const CONFLICT_KEYWORDS = [
  "war", "military", "strike", "missile", "bomb", "attack", "troops",
  "invasion", "conflict", "combat", "drone", "artillery", "ceasefire",
  "sanctions", "nato", "defense", "weapon", "siege", "airstrike",
  "casualties", "insurgent", "militia",
];

const MARKETS_KEYWORDS = [
  "stock", "market", "fed", "interest rate", "inflation", "gdp",
  "earnings", "dow", "nasdaq", "s&p", "bond", "yield", "treasury",
  "recession", "central bank", "forex", "currency", "trade deficit",
  "ipo", "wall street", "federal reserve", "ecb", "boe",
];

// Source-level political bias based on AllSides / Ad Fontes media bias ratings.
// Keys are lowercase partial domain or source name matches.
const SOURCE_BIAS: Record<string, PoliticalBias> = {
  // Center
  "reuters": "center",
  "ap news": "center",
  "apnews": "center",
  "associated press": "center",
  "bbc": "center",
  "pbs": "center",
  "npr": "center-left",
  "the hill": "center",
  "usa today": "center",
  "abc news": "center",
  "bloomberg": "center",
  "financial times": "center",
  "economist": "center",
  "wall street journal": "center-right",
  "wsj": "center-right",
  // Left / Center-left
  "cnn": "left",
  "msnbc": "left",
  "nbc news": "center-left",
  "nbcnews": "center-left",
  "cbs news": "center-left",
  "cbsnews": "center-left",
  "new york times": "center-left",
  "nytimes": "center-left",
  "washington post": "center-left",
  "washingtonpost": "center-left",
  "guardian": "center-left",
  "politico": "center-left",
  "vox": "left",
  "huffpost": "left",
  "huffington": "left",
  "slate": "left",
  "the atlantic": "center-left",
  "buzzfeed": "left",
  "vice": "left",
  "al jazeera": "center-left",
  "intercept": "far-left",
  "jacobin": "far-left",
  "mother jones": "left",
  // Right / Center-right
  "fox news": "right",
  "foxnews": "right",
  "fox business": "right",
  "daily mail": "right",
  "dailymail": "right",
  "new york post": "right",
  "nypost": "right",
  "washington times": "right",
  "washingtontimes": "right",
  "national review": "right",
  "daily wire": "right",
  "dailywire": "right",
  "breitbart": "far-right",
  "newsmax": "far-right",
  "oan": "far-right",
  "epoch times": "far-right",
  "daily caller": "right",
  "dailycaller": "right",
  "washington examiner": "center-right",
  "forbes": "center-right",
  // International
  "rt.com": "far-right",
  "sputnik": "far-right",
  "xinhua": "far-left",
  "cgtn": "far-left",
  "south china morning post": "center",
  "scmp": "center",
  "france24": "center",
  "france 24": "center",
  "dw.com": "center",
  "deutsche welle": "center",
  "haaretz": "center-left",
  "times of israel": "center",
  "sky news": "center-right",
  // Business / Specialist
  "cnbc": "center",
  "marketwatch": "center",
  "oilprice": "center",
  "defense one": "center",
  "defenseone": "center",
  "foreign policy": "center-left",
  "foreignpolicy": "center-left",
};

function detectBias(source: string, domain?: string): PoliticalBias {
  const check = `${source} ${domain || ""}`.toLowerCase();
  for (const [key, bias] of Object.entries(SOURCE_BIAS)) {
    if (check.includes(key)) return bias;
  }
  return "unknown";
}

function categorize(title: string, description?: string): NewsArticle["category"] {
  const text = `${title} ${description || ""}`.toLowerCase();

  for (const kw of ENERGY_KEYWORDS) {
    if (text.includes(kw)) return "energy";
  }
  for (const kw of CONFLICT_KEYWORDS) {
    if (text.includes(kw)) return "conflict";
  }
  for (const kw of MARKETS_KEYWORDS) {
    if (text.includes(kw)) return "markets";
  }

  return "world";
}

function parseRssItems(xml: string, source: string): NewsArticle[] {
  const articles: NewsArticle[] = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];

    const title = extractTag(itemXml, "title");
    const link = extractTag(itemXml, "link");
    const pubDate = extractTag(itemXml, "pubDate");
    const description = extractTag(itemXml, "description");

    if (!title || !link) continue;

    // Try to find image URL from media:content, media:thumbnail, or enclosure
    let imageUrl: string | undefined;
    const mediaMatch = itemXml.match(/(?:media:content|media:thumbnail)[^>]*url="([^"]+)"/i);
    if (mediaMatch) {
      imageUrl = mediaMatch[1];
    } else {
      const enclosureMatch = itemXml.match(/<enclosure[^>]*url="([^"]+)"[^>]*type="image/i);
      if (enclosureMatch) {
        imageUrl = enclosureMatch[1];
      }
    }

    const cleanTitle = stripCdata(stripHtml(title)).trim();
    const cleanLink = stripCdata(link).trim();
    const cleanDescription = description ? stripCdata(stripHtml(description)).trim() : undefined;

    // Skip empty/junk articles
    if (!cleanTitle || cleanTitle.length < 5 || !cleanLink || !cleanLink.startsWith("http")) continue;

    articles.push({
      title: cleanTitle,
      url: cleanLink,
      source,
      date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      category: categorize(cleanTitle, cleanDescription),
      imageUrl,
      description: cleanDescription && cleanDescription.length > 10 ? cleanDescription.slice(0, 200) : undefined,
      bias: detectBias(source),
    });
  }

  return articles;
}

function extractTag(xml: string, tag: string): string | undefined {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : undefined;
}

function stripCdata(text: string): string {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "").trim();
}

async function fetchRssFeed(feedUrl: string, source: string): Promise<NewsArticle[]> {
  try {
    const res = await fetch(feedUrl, {
      headers: { "User-Agent": "Nexus/1.0" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return [];

    const xml = await res.text();
    return parseRssItems(xml, source);
  } catch {
    return [];
  }
}

async function fetchGdeltArticles(): Promise<NewsArticle[]> {
  try {
    const query = encodeURIComponent("conflict OR geopolitical OR energy OR markets");
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=ArtList&maxrecords=30&format=json&sort=DateDesc`;

    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return [];

    const json = await res.json();
    const rawArticles = json?.articles || [];

    return rawArticles
      .filter((a: Record<string, string>) => {
        const t = (a.title || "").trim();
        const u = (a.url || "").trim();
        return t.length >= 5 && u.startsWith("http");
      })
      .map((a: Record<string, string>) => {
        const title = a.title.trim();
        const domain = a.domain || "GDELT";
        return {
          title,
          url: a.url,
          source: domain,
          date: a.seendate
            ? new Date(a.seendate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, "$1-$2-$3T$4:$5:$6Z")).toISOString()
            : new Date().toISOString(),
          category: categorize(title),
          imageUrl: a.socialimage || undefined,
          bias: detectBias(domain, a.url),
        } as NewsArticle;
      });
  } catch {
    return [];
  }
}

export async function getNewsFeed(
  category?: string,
  limit: number = 30
): Promise<NewsArticle[]> {
  const cacheKey = `news:${category || "all"}:${limit}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  // Fetch all sources in parallel - if one fails, others still return
  const results = await Promise.all([
    ...RSS_FEEDS.map((feed) => fetchRssFeed(feed.url, feed.source)),
    fetchGdeltArticles(),
  ]);

  let articles = results.flat();

  // Deduplicate by URL
  const seen = new Set<string>();
  articles = articles.filter((a) => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });

  // Filter by category if specified
  if (category && ["world", "markets", "conflict", "energy"].includes(category)) {
    articles = articles.filter((a) => a.category === category);
  }

  // Sort by date descending
  articles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Limit results
  articles = articles.slice(0, limit);

  cache.set(cacheKey, { data: articles, expiry: Date.now() + CACHE_TTL_MS });
  return articles;
}
