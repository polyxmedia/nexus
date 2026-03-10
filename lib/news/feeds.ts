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

// In-memory cache
const cache = new Map<string, { data: NewsArticle[]; expiry: number }>();
const CACHE_TTL_MS = 600_000; // 10 minutes

// ── RSS Feeds (verified working March 2026) ──

const RSS_FEEDS = [
  // Wire / Center
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC World" },
  { url: "https://feeds.bbci.co.uk/news/business/rss.xml", source: "BBC Business" },
  { url: "https://rss.dw.com/rdf/rss-en-all", source: "Deutsche Welle" },
  // Center-left
  { url: "https://www.theguardian.com/world/rss", source: "The Guardian" },
  { url: "https://www.theguardian.com/business/economics/rss", source: "Guardian Economics" },
  { url: "https://www.aljazeera.com/xml/rss/all.xml", source: "Al Jazeera" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", source: "New York Times" },
  { url: "http://rss.cnn.com/rss/edition_world.rss", source: "CNN" },
  { url: "https://feeds.npr.org/1001/rss.xml", source: "NPR" },
  { url: "https://feeds.nbcnews.com/nbcnews/public/world", source: "NBC News" },
  // Markets / Business
  { url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", source: "CNBC" },
  { url: "https://feeds.content.dowjones.io/public/rss/mw_bulletins", source: "MarketWatch" },
  { url: "https://feeds.bloomberg.com/politics/news.rss", source: "Bloomberg" },
  // Center-right
  { url: "https://feeds.skynews.com/feeds/rss/world.xml", source: "Sky News" },
  { url: "https://feeds.content.dowjones.io/public/rss/wsj/latest/world", source: "Wall Street Journal" },
  { url: "https://www.washingtontimes.com/rss/headlines/news/world/", source: "Washington Times" },
  { url: "https://www.washingtonexaminer.com/section/news/feed", source: "Washington Examiner" },
  // Right
  { url: "https://moxie.foxnews.com/google-publisher/world.xml", source: "Fox News" },
  { url: "https://www.foxbusiness.com/feeds/rss/latest.xml", source: "Fox Business" },
  { url: "https://nypost.com/feed/", source: "New York Post" },
  { url: "https://feeds.dailycaller.com/dailycaller/home", source: "Daily Caller" },
  { url: "https://www.dailywire.com/feeds/rss.xml", source: "Daily Wire" },
  { url: "https://www.nationalreview.com/feed/", source: "National Review" },
  { url: "https://www.dailymail.co.uk/articles.rss", source: "Daily Mail" },
  { url: "https://www.telegraph.co.uk/rss.xml", source: "The Telegraph" },
  { url: "https://www.newsmax.com/rss/Newsfront/1/", source: "Newsmax" },
  // Wire aggregators
  { url: "https://feedx.net/rss/ap.xml", source: "AP News" },
  // Specialist: energy
  { url: "https://oilprice.com/rss/main", source: "OilPrice" },
  // Specialist: Middle East
  { url: "https://www.timesofisrael.com/feed/", source: "Times of Israel" },
  // Specialist: defense
  { url: "https://www.defenseone.com/rss/all/", source: "Defense One" },
  // Asia-Pacific
  { url: "https://www.scmp.com/rss/91/feed", source: "SCMP" },
  // Google News (aggregates many sources, good diversity)
  { url: "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en", source: "Google News World" },
  { url: "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en", source: "Google News Business" },
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
  "the hill": "center",
  "usa today": "center",
  "abc news": "center",
  "bloomberg": "center",
  "financial times": "center",
  "economist": "center",
  // Center-left
  "npr": "center-left",
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
  "aljazeera": "center-left",
  "intercept": "far-left",
  "jacobin": "far-left",
  "mother jones": "left",
  // Center-right
  "wall street journal": "center-right",
  "wsj": "center-right",
  "forbes": "center-right",
  "washington examiner": "center-right",
  // Right
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
  "daily caller": "right",
  "dailycaller": "right",
  "the telegraph": "center-right",
  "telegraph": "center-right",
  // Far-right
  "breitbart": "far-right",
  "newsmax": "right",
  "oan": "far-right",
  "epoch times": "far-right",
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

// ── Google News source extraction ──
// Google News RSS wraps articles from other outlets. The <source> tag contains
// the real outlet name and the <link> redirects to the original article.

function extractGoogleNewsSource(itemXml: string): string | null {
  const sourceMatch = itemXml.match(/<source[^>]*>([^<]+)<\/source>/i);
  return sourceMatch ? stripCdata(sourceMatch[1]).trim() : null;
}

// ── RSS parsing ──

function extractImageUrl(itemXml: string, description?: string): string | undefined {
  // 1. media:content or media:thumbnail with url attribute
  const mediaMatch = itemXml.match(/(?:media:content|media:thumbnail)[^>]*url="([^"]+)"/i);
  if (mediaMatch) return mediaMatch[1];

  // 2. enclosure with image type
  const enclosureMatch = itemXml.match(/<enclosure[^>]*url="([^"]+)"[^>]*type="image/i);
  if (enclosureMatch) return enclosureMatch[1];

  // 3. enclosure with image URL (type attr may come before url)
  const enclosureAlt = itemXml.match(/<enclosure[^>]*type="image[^"]*"[^>]*url="([^"]+)"/i);
  if (enclosureAlt) return enclosureAlt[1];

  // 4. media:group > media:content
  const mediaGroup = itemXml.match(/media:content[^>]*url="([^"]+)"/i);
  if (mediaGroup) return mediaGroup[1];

  // 5. img tag inside description/content (common in RSS)
  const imgMatch = (description || itemXml).match(/<img[^>]*src="([^"]+)"/i);
  if (imgMatch) return imgMatch[1];

  return undefined;
}

function parseRssItems(xml: string, feedSource: string): NewsArticle[] {
  const articles: NewsArticle[] = [];
  // Match both <item> and <item rdf:about="..."> (RDF format used by DW)
  const itemRegex = /<item[\s>][\s\S]*?<\/item>/gi;
  let match: RegExpExecArray | null;

  const isGoogleNews = feedSource.startsWith("Google News");

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[0];

    const title = extractTag(itemXml, "title");
    const link = extractTag(itemXml, "link");
    // Support both <pubDate> (RSS 2.0) and <dc:date> (RDF/Dublin Core)
    const pubDate = extractTag(itemXml, "pubDate") || extractTag(itemXml, "dc:date") || extractTag(itemXml, "published");
    const description = extractTag(itemXml, "description") || extractTag(itemXml, "content:encoded");

    if (!title || !link) continue;

    // For Google News, extract the real source outlet
    const realSource = isGoogleNews ? extractGoogleNewsSource(itemXml) : null;
    const source = realSource || feedSource;

    const imageUrl = extractImageUrl(itemXml, description);

    const cleanTitle = stripCdata(stripHtml(title)).trim();
    const cleanLink = stripCdata(link).trim();
    const cleanDescription = description ? stripCdata(stripHtml(description)).trim() : undefined;

    // Skip empty/junk articles
    if (!cleanTitle || cleanTitle.length < 5 || !cleanLink || !cleanLink.startsWith("http")) continue;

    // Extract domain for bias detection
    let domain: string | undefined;
    try { domain = new URL(cleanLink).hostname; } catch { /* ignore */ }

    articles.push({
      title: cleanTitle,
      url: cleanLink,
      source,
      date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      category: categorize(cleanTitle, cleanDescription),
      imageUrl,
      description: cleanDescription && cleanDescription.length > 10 ? cleanDescription.slice(0, 200) : undefined,
      bias: detectBias(source, domain),
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
  return decodeEntities(text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")).trim();
}

function stripHtml(text: string): string {
  return decodeEntities(text.replace(/<[^>]*>/g, "")).trim();
}

/** Decode HTML/XML entities and clean stray unicode artifacts from RSS feeds. */
function decodeEntities(text: string): string {
  // Named entities
  const named: Record<string, string> = {
    "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'",
    "&nbsp;": " ", "&ndash;": "-", "&mdash;": "-", "&lsquo;": "'",
    "&rsquo;": "'", "&ldquo;": '"', "&rdquo;": '"', "&hellip;": "...",
    "&bull;": "-", "&middot;": "-", "&copy;": "(c)", "&reg;": "(R)",
    "&trade;": "(TM)", "&euro;": "EUR", "&pound;": "GBP", "&yen;": "JPY",
    "&cent;": "c", "&sect;": "S", "&deg;": "deg", "&times;": "x",
    "&divide;": "/", "&shy;": "", "&zwj;": "", "&zwnj;": "",
  };

  let result = text;

  // Named entities (case-insensitive)
  result = result.replace(/&[a-zA-Z]+;/g, (match) => named[match.toLowerCase()] ?? match);

  // Numeric decimal entities: &#8217; &#169; etc.
  result = result.replace(/&#(\d+);/g, (_match, code) => {
    const cp = parseInt(code, 10);
    return safeChar(cp);
  });

  // Numeric hex entities: &#x2019; &#xA9; etc.
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_match, hex) => {
    const cp = parseInt(hex, 16);
    return safeChar(cp);
  });

  // Replace common stray unicode that slips through RSS feeds
  result = result
    .replace(/[\u2018\u2019\u201A\uFF07]/g, "'")   // smart single quotes
    .replace(/[\u201C\u201D\u201E\uFF02]/g, '"')    // smart double quotes
    .replace(/[\u2013\u2014\uFE58]/g, "-")           // en/em dashes
    .replace(/\u2026/g, "...")                        // ellipsis
    .replace(/\u00A0/g, " ")                          // non-breaking space
    .replace(/[\u200B-\u200F\u2028\u2029\uFEFF]/g, "") // zero-width and line/paragraph separators
    .replace(/\u00AD/g, "");                          // soft hyphen

  return result;
}

/** Convert a unicode codepoint to a safe ASCII-range char, or the original char if printable. */
function safeChar(cp: number): string {
  // Common smart punctuation codepoints -> ASCII
  if (cp === 8216 || cp === 8217 || cp === 8218) return "'";  // single quotes
  if (cp === 8220 || cp === 8221 || cp === 8222) return '"';  // double quotes
  if (cp === 8211 || cp === 8212) return "-";                  // dashes
  if (cp === 8230) return "...";                               // ellipsis
  if (cp === 160) return " ";                                  // nbsp
  if (cp === 8226) return "-";                                 // bullet
  if (cp === 183) return "-";                                  // middle dot
  // Printable ASCII and basic Latin supplement are fine
  if (cp >= 32 && cp <= 126) return String.fromCodePoint(cp);
  // Accented Latin characters (common in names) are fine
  if (cp >= 192 && cp <= 687) return String.fromCodePoint(cp);
  // Other printable unicode - pass through
  if (cp >= 128) return String.fromCodePoint(cp);
  return "";
}

async function fetchRssFeed(feedUrl: string, source: string): Promise<NewsArticle[]> {
  try {
    const res = await fetch(feedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Nexus/1.0; +https://nexushq.xyz)",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });

    if (!res.ok) return [];

    const xml = await res.text();
    return parseRssItems(xml, source);
  } catch {
    return [];
  }
}

// ── GDELT (broad global coverage, diverse sources) ──

async function fetchGdeltArticles(): Promise<NewsArticle[]> {
  try {
    const query = encodeURIComponent("conflict OR geopolitical OR energy OR markets");
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=ArtList&maxrecords=50&format=json&sort=DateDesc`;

    const res = await fetch(url, {
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
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
        const title = decodeEntities(a.title.trim());
        const domain = a.domain || "GDELT";
        return {
          title,
          url: a.url,
          source: prettifyDomain(domain),
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

// ── NewsData.io API (optional, needs NEWSDATA_API_KEY env var) ──

async function fetchNewsDataArticles(): Promise<NewsArticle[]> {
  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) return [];

  try {
    const url = `https://newsdata.io/api/1/latest?apikey=${apiKey}&language=en&size=50&image=1&removeduplicate=1`;

    const res = await fetch(url, {
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });

    if (!res.ok) return [];

    const json = await res.json();
    const results = json?.results || [];

    return results
      .filter((a: Record<string, unknown>) => {
        const t = ((a.title as string) || "").trim();
        const u = ((a.link as string) || "").trim();
        return t.length >= 5 && u.startsWith("http");
      })
      .map((a: Record<string, unknown>) => {
        const title = decodeEntities((a.title as string).trim());
        const sourceName = (a.source_name as string) || (a.source_id as string) || "Unknown";
        const domain = (a.source_url as string) || "";

        return {
          title,
          url: a.link as string,
          source: sourceName,
          date: a.pubDate ? new Date(a.pubDate as string).toISOString() : new Date().toISOString(),
          category: categorize(title, (a.description as string) || ""),
          imageUrl: (a.image_url as string) || undefined,
          description: a.description ? (a.description as string).slice(0, 200) : undefined,
          bias: detectBias(sourceName, domain),
        } as NewsArticle;
      });
  } catch {
    return [];
  }
}

// Turn a domain like "nytimes.com" into "New York Times" for display/bias
function prettifyDomain(domain: string): string {
  const map: Record<string, string> = {
    "nytimes.com": "New York Times",
    "washingtonpost.com": "Washington Post",
    "cnn.com": "CNN",
    "foxnews.com": "Fox News",
    "bbc.com": "BBC",
    "bbc.co.uk": "BBC",
    "theguardian.com": "The Guardian",
    "reuters.com": "Reuters",
    "apnews.com": "AP News",
    "aljazeera.com": "Al Jazeera",
    "cnbc.com": "CNBC",
    "bloomberg.com": "Bloomberg",
    "wsj.com": "Wall Street Journal",
    "ft.com": "Financial Times",
    "politico.com": "Politico",
    "npr.org": "NPR",
    "nbcnews.com": "NBC News",
    "cbsnews.com": "CBS News",
    "abcnews.go.com": "ABC News",
    "nypost.com": "New York Post",
    "dailymail.co.uk": "Daily Mail",
    "forbes.com": "Forbes",
    "skynews.com": "Sky News",
    "france24.com": "France 24",
    "dw.com": "Deutsche Welle",
    "scmp.com": "SCMP",
    "timesofisrael.com": "Times of Israel",
    "haaretz.com": "Haaretz",
    "rt.com": "RT",
    "breitbart.com": "Breitbart",
    "newsmax.com": "Newsmax",
    "dailycaller.com": "Daily Caller",
    "dailywire.com": "Daily Wire",
    "nationalreview.com": "National Review",
    "washingtontimes.com": "Washington Times",
    "washingtonexaminer.com": "Washington Examiner",
    "telegraph.co.uk": "The Telegraph",
    "foxbusiness.com": "Fox Business",
    "feedx.net": "AP News",
    "moxie.foxnews.com": "Fox News",
  };
  const clean = domain.replace(/^www\./, "");
  return map[clean] || clean;
}

// ── Main export ──

export async function getNewsFeed(
  category?: string,
  limit: number = 30
): Promise<NewsArticle[]> {
  const cacheKey = `news:${category || "all"}:${limit}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  // Fetch all sources in parallel
  const results = await Promise.all([
    ...RSS_FEEDS.map((feed) => fetchRssFeed(feed.url, feed.source)),
    fetchGdeltArticles(),
    fetchNewsDataArticles(),
  ]);

  let articles = results.flat();

  // Deduplicate by URL
  const seen = new Set<string>();
  articles = articles.filter((a) => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });

  // Also deduplicate by title similarity (different URLs same headline)
  const seenTitles = new Set<string>();
  articles = articles.filter((a) => {
    const normalized = a.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);
    if (seenTitles.has(normalized)) return false;
    seenTitles.add(normalized);
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
