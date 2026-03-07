export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  date: string;
  category: "world" | "markets" | "conflict" | "energy";
  imageUrl?: string;
  description?: string;
}

// In-memory cache (same pattern as alpha-vantage.ts)
const cache = new Map<string, { data: NewsArticle[]; expiry: number }>();
const CACHE_TTL_MS = 300_000; // 5 minutes

const RSS_FEEDS = [
  { url: "https://feeds.reuters.com/reuters/topNews", source: "Reuters" },
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC World" },
  { url: "https://www.aljazeera.com/xml/rss/all.xml", source: "Al Jazeera" },
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

    const cleanTitle = stripCdata(stripHtml(title));
    const cleanDescription = description ? stripCdata(stripHtml(description)) : undefined;

    articles.push({
      title: cleanTitle,
      url: stripCdata(link),
      source,
      date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      category: categorize(cleanTitle, cleanDescription),
      imageUrl,
      description: cleanDescription?.slice(0, 200),
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

    return rawArticles.map((a: Record<string, string>) => {
      const title = a.title || "Untitled";
      return {
        title,
        url: a.url || "",
        source: a.domain || "GDELT",
        date: a.seendate
          ? new Date(a.seendate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, "$1-$2-$3T$4:$5:$6Z")).toISOString()
          : new Date().toISOString(),
        category: categorize(title),
        imageUrl: a.socialimage || undefined,
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
