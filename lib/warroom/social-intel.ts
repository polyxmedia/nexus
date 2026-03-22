/**
 * Social Intelligence Layer
 *
 * Geolocated news and social media posts for the war room map.
 * Sources: GDELT GeoJSON (news articles with coordinates + images),
 * plus Twitter/X search for conflict/geopolitical keywords.
 */

import { searchTweets, isTwitterConfigured } from "@/lib/twitter/client";

export interface SocialPost {
  id: string;
  source: "gdelt" | "twitter";
  lat: number;
  lng: number;
  text: string;
  author: string;
  authorHandle?: string;
  timestamp: string;
  imageUrl?: string;
  sourceUrl?: string;
  engagement?: {
    likes: number;
    retweets: number;
    replies: number;
  };
  category: string; // conflict, military, politics, economy
}

export interface SocialIntelResponse {
  posts: SocialPost[];
  timestamp: number;
  totalCount: number;
}

// ── Cache ──
let socialCache: { data: SocialPost[]; timestamp: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// ── GDELT GeoJSON ──
// Returns geolocated articles with lat/lng, title, image, source URL

const GDELT_QUERIES = [
  "military strike OR airstrike OR missile",
  "conflict OR war OR combat",
  "protest OR riot OR unrest",
  "sanctions OR embargo OR blockade",
  "nuclear OR escalation OR mobilization",
];

interface GdeltGeoArticle {
  url: string;
  title: string;
  seendate: string;
  domain: string;
  language: string;
  sourcecountry: string;
  socialimage?: string;
  sharingimage?: string;
  // Geo fields from the context endpoint
  lat?: number;
  lng?: number;
}

async function fetchGdeltGeo(): Promise<SocialPost[]> {
  const posts: SocialPost[] = [];

  // Use GDELT DOC API with geo mode for articles with coordinates
  const query = GDELT_QUERIES.join(" OR ");
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=ArtList&maxrecords=50&format=json&sort=DateDesc&timespan=1d`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
    if (!res.ok) return [];

    const text = await res.text();
    if (!text.startsWith("{") && !text.startsWith("[")) return [];
    const json = JSON.parse(text);
    const articles = (json?.articles || []) as GdeltGeoArticle[];

    for (const article of articles) {
      // Skip articles without meaningful geo data
      // GDELT articles don't have lat/lng directly in ArtList mode,
      // so we'll try to extract from the contextual location data
      if (!article.title) continue;

      // Extract geo from the source country as a rough location
      // (GDELT's geo API is more complex but this gives us coverage)
      const geo = countryToCoords(article.sourcecountry);
      if (!geo) continue;

      // Add some jitter so posts don't stack on the exact same point
      const jitterLat = geo.lat + (Math.random() - 0.5) * 2;
      const jitterLng = geo.lng + (Math.random() - 0.5) * 2;

      const imageUrl = article.socialimage || article.sharingimage || undefined;

      posts.push({
        id: `gdelt-${article.url.slice(-20).replace(/[^a-z0-9]/gi, "")}`,
        source: "gdelt",
        lat: jitterLat,
        lng: jitterLng,
        text: article.title,
        author: article.domain,
        timestamp: article.seendate
          ? formatGdeltDate(article.seendate)
          : new Date().toISOString(),
        imageUrl,
        sourceUrl: article.url,
        category: categorizeArticle(article.title),
      });
    }
  } catch (err) {
    console.error("[SocialIntel] GDELT fetch error:", err);
  }

  return posts;
}

// ── Twitter/X ──

const TWITTER_QUERIES = [
  "(OSINT OR #OSINT) (strike OR attack OR military OR conflict) -is:retweet lang:en",
  "(#breaking OR breaking) (missile OR airstrike OR drone OR explosion) -is:retweet lang:en",
  "(war OR conflict) (Ukraine OR Iran OR Taiwan OR Gaza) -is:retweet lang:en",
];

async function fetchTwitterGeo(): Promise<SocialPost[]> {
  const configured = await isTwitterConfigured();
  if (!configured) return [];

  const posts: SocialPost[] = [];

  for (const query of TWITTER_QUERIES) {
    try {
      const tweets = await searchTweets(query, 15);

      for (const tweet of tweets) {
        // Geocode from tweet text (extract location mentions)
        const geo = extractLocationFromText(tweet.text);
        if (!geo) continue;

        posts.push({
          id: `tw-${tweet.id}`,
          source: "twitter",
          lat: geo.lat,
          lng: geo.lng,
          text: tweet.text,
          author: tweet.authorUsername,
          authorHandle: tweet.authorUsername,
          timestamp: tweet.createdAt,
          engagement: tweet.metrics,
          category: categorizeArticle(tweet.text),
        });
      }
    } catch {
      // Twitter search can fail, non-critical
    }
  }

  return posts;
}

// ── Geocoding helpers ──

const LOCATION_PATTERNS: Array<{ pattern: RegExp; lat: number; lng: number }> = [
  { pattern: /\b(ukraine|kyiv|kiev|kharkiv|odesa|zaporizhzhia)\b/i, lat: 49.0, lng: 32.0 },
  { pattern: /\b(gaza|hamas|palestinian)\b/i, lat: 31.5, lng: 34.47 },
  { pattern: /\b(israel|tel aviv|jerusalem|haifa)\b/i, lat: 31.8, lng: 34.8 },
  { pattern: /\b(iran|tehran|isfahan)\b/i, lat: 32.4, lng: 53.7 },
  { pattern: /\b(lebanon|beirut|hezbollah)\b/i, lat: 33.9, lng: 35.5 },
  { pattern: /\b(syria|damascus|aleppo|idlib)\b/i, lat: 35.0, lng: 38.0 },
  { pattern: /\b(iraq|baghdad|mosul|erbil)\b/i, lat: 33.3, lng: 44.4 },
  { pattern: /\b(yemen|houthi|sanaa|aden)\b/i, lat: 15.4, lng: 44.2 },
  { pattern: /\b(taiwan|taipei)\b/i, lat: 23.7, lng: 121.0 },
  { pattern: /\b(china|beijing|shanghai)\b/i, lat: 39.9, lng: 116.4 },
  { pattern: /\b(russia|moscow|kremlin)\b/i, lat: 55.8, lng: 37.6 },
  { pattern: /\b(north korea|pyongyang|dprk)\b/i, lat: 39.0, lng: 125.7 },
  { pattern: /\b(south korea|seoul)\b/i, lat: 37.6, lng: 127.0 },
  { pattern: /\b(japan|tokyo)\b/i, lat: 35.7, lng: 139.7 },
  { pattern: /\b(india|delhi|mumbai)\b/i, lat: 28.6, lng: 77.2 },
  { pattern: /\b(pakistan|islamabad|karachi)\b/i, lat: 33.7, lng: 73.1 },
  { pattern: /\b(afghanistan|kabul)\b/i, lat: 34.5, lng: 69.2 },
  { pattern: /\b(saudi|riyadh|jeddah)\b/i, lat: 24.7, lng: 46.7 },
  { pattern: /\b(turkey|ankara|istanbul)\b/i, lat: 39.9, lng: 32.9 },
  { pattern: /\b(egypt|cairo|suez)\b/i, lat: 30.0, lng: 31.2 },
  { pattern: /\b(libya|tripoli|benghazi)\b/i, lat: 32.9, lng: 13.2 },
  { pattern: /\b(sudan|khartoum)\b/i, lat: 15.6, lng: 32.5 },
  { pattern: /\b(somalia|mogadishu)\b/i, lat: 2.0, lng: 45.3 },
  { pattern: /\b(ethiopia|addis ababa)\b/i, lat: 9.0, lng: 38.7 },
  { pattern: /\b(red sea|bab.?el.?mandeb)\b/i, lat: 12.6, lng: 43.3 },
  { pattern: /\b(hormuz|strait of hormuz)\b/i, lat: 26.6, lng: 56.3 },
  { pattern: /\b(malacca|strait of malacca)\b/i, lat: 2.5, lng: 101.5 },
  { pattern: /\b(black sea|crimea|sevastopol)\b/i, lat: 44.6, lng: 33.5 },
  { pattern: /\b(baltic|kaliningrad)\b/i, lat: 56.9, lng: 20.5 },
  { pattern: /\b(nato|brussels)\b/i, lat: 50.8, lng: 4.4 },
  { pattern: /\b(pentagon|washington)\b/i, lat: 38.9, lng: -77.0 },
  { pattern: /\b(uk|london|britain)\b/i, lat: 51.5, lng: -0.1 },
  { pattern: /\b(france|paris)\b/i, lat: 48.9, lng: 2.3 },
  { pattern: /\b(germany|berlin)\b/i, lat: 52.5, lng: 13.4 },
  { pattern: /\b(poland|warsaw)\b/i, lat: 52.2, lng: 21.0 },
  { pattern: /\b(romania|bucharest)\b/i, lat: 44.4, lng: 26.1 },
  { pattern: /\b(venezuela|caracas)\b/i, lat: 10.5, lng: -66.9 },
  { pattern: /\b(mexico|mexico city)\b/i, lat: 19.4, lng: -99.1 },
  { pattern: /\b(colombia|bogota)\b/i, lat: 4.7, lng: -74.1 },
  { pattern: /\b(nigeria|lagos|abuja)\b/i, lat: 9.1, lng: 7.5 },
  { pattern: /\b(south africa|johannesburg|cape town)\b/i, lat: -33.9, lng: 18.4 },
  { pattern: /\b(congo|kinshasa)\b/i, lat: -4.3, lng: 15.3 },
  { pattern: /\b(myanmar|burma|naypyidaw)\b/i, lat: 19.8, lng: 96.2 },
];

function extractLocationFromText(text: string): { lat: number; lng: number } | null {
  for (const { pattern, lat, lng } of LOCATION_PATTERNS) {
    if (pattern.test(text)) {
      // Add jitter so overlapping tweets spread out
      return {
        lat: lat + (Math.random() - 0.5) * 1.5,
        lng: lng + (Math.random() - 0.5) * 1.5,
      };
    }
  }
  return null;
}

const COUNTRY_COORDS: Record<string, { lat: number; lng: number }> = {
  "United States": { lat: 38.9, lng: -77.0 },
  "United Kingdom": { lat: 51.5, lng: -0.1 },
  "Russia": { lat: 55.8, lng: 37.6 },
  "China": { lat: 39.9, lng: 116.4 },
  "India": { lat: 28.6, lng: 77.2 },
  "Israel": { lat: 31.8, lng: 34.8 },
  "Iran": { lat: 35.7, lng: 51.4 },
  "Ukraine": { lat: 50.4, lng: 30.5 },
  "Turkey": { lat: 39.9, lng: 32.9 },
  "France": { lat: 48.9, lng: 2.3 },
  "Germany": { lat: 52.5, lng: 13.4 },
  "Japan": { lat: 35.7, lng: 139.7 },
  "South Korea": { lat: 37.6, lng: 127.0 },
  "Saudi Arabia": { lat: 24.7, lng: 46.7 },
  "Egypt": { lat: 30.0, lng: 31.2 },
  "Pakistan": { lat: 33.7, lng: 73.1 },
  "Iraq": { lat: 33.3, lng: 44.4 },
  "Syria": { lat: 33.5, lng: 36.3 },
  "Lebanon": { lat: 33.9, lng: 35.5 },
  "Yemen": { lat: 15.4, lng: 44.2 },
  "Libya": { lat: 32.9, lng: 13.2 },
  "Sudan": { lat: 15.6, lng: 32.5 },
  "Nigeria": { lat: 9.1, lng: 7.5 },
  "South Africa": { lat: -33.9, lng: 18.4 },
  "Australia": { lat: -33.9, lng: 151.2 },
  "Brazil": { lat: -15.8, lng: -47.9 },
  "Canada": { lat: 45.4, lng: -75.7 },
  "Mexico": { lat: 19.4, lng: -99.1 },
  "Poland": { lat: 52.2, lng: 21.0 },
  "Taiwan": { lat: 25.0, lng: 121.5 },
};

function countryToCoords(country: string): { lat: number; lng: number } | null {
  if (!country) return null;
  return COUNTRY_COORDS[country] || null;
}

function categorizeArticle(text: string): string {
  const lower = text.toLowerCase();
  if (/strike|missile|bomb|airstrike|drone|attack|military|combat|killed|casualties/.test(lower)) return "conflict";
  if (/troops|deploy|mobiliz|navy|army|air force|fighter/.test(lower)) return "military";
  if (/protest|riot|unrest|demonstrat/.test(lower)) return "unrest";
  if (/sanction|embargo|trade war|tariff|blockade/.test(lower)) return "economy";
  if (/nuclear|escalat|weapon|arms/.test(lower)) return "escalation";
  return "politics";
}

function formatGdeltDate(seendate: string): string {
  try {
    // GDELT dates: "20260321T143000Z" format
    const match = seendate.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z`;
    }
    return new Date().toISOString();
  } catch {
    return new Date().toISOString();
  }
}

// ── Public API ──

export async function fetchSocialIntel(): Promise<SocialPost[]> {
  if (socialCache && Date.now() - socialCache.timestamp < CACHE_TTL) {
    return socialCache.data;
  }

  const [gdeltPosts, twitterPosts] = await Promise.all([
    fetchGdeltGeo(),
    fetchTwitterGeo().catch(() => [] as SocialPost[]),
  ]);

  const posts = [...twitterPosts, ...gdeltPosts]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 100);

  socialCache = { data: posts, timestamp: Date.now() };
  return posts;
}
