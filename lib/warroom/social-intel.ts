/**
 * Social Intelligence Layer
 *
 * Geolocated posts for the war room map.
 * Sources: Twitter/X search for conflict/geopolitical keywords,
 * geocoded by location mentions in text.
 *
 * Does NOT call GDELT separately (OSINT events already cover that).
 * This layer adds social media context on top of the existing OSINT feed.
 */

import { searchTweets, isTwitterConfigured } from "@/lib/twitter/client";

export interface SocialPost {
  id: string;
  source: "twitter" | "news";
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
  category: string;
}

export interface SocialIntelResponse {
  posts: SocialPost[];
  timestamp: number;
  totalCount: number;
}

// ── Cache ──
let socialCache: { data: SocialPost[]; timestamp: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// ── Twitter/X ──

const TWITTER_QUERIES = [
  "(OSINT OR #OSINT) (strike OR attack OR military OR conflict) -is:retweet lang:en",
  "(#breaking OR breaking) (missile OR airstrike OR drone OR explosion) -is:retweet lang:en",
  "(war OR conflict) (Ukraine OR Iran OR Taiwan OR Gaza OR Hormuz) -is:retweet lang:en",
];

async function fetchTwitterPosts(): Promise<SocialPost[]> {
  const configured = await isTwitterConfigured();
  if (!configured) return [];

  const posts: SocialPost[] = [];

  for (const query of TWITTER_QUERIES) {
    try {
      const tweets = await searchTweets(query, 20);

      for (const tweet of tweets) {
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
          category: categorizeText(tweet.text),
        });
      }
    } catch {
      // Twitter search can fail, non-critical
    }
  }

  return posts;
}

// ── Geocoding from text ──

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
  { pattern: /\b(pakistan|islamabad|karachi)\b/i, lat: 33.7, lng: 73.1 },
  { pattern: /\b(afghanistan|kabul)\b/i, lat: 34.5, lng: 69.2 },
  { pattern: /\b(saudi|riyadh)\b/i, lat: 24.7, lng: 46.7 },
  { pattern: /\b(turkey|ankara|istanbul)\b/i, lat: 39.9, lng: 32.9 },
  { pattern: /\b(egypt|cairo|suez)\b/i, lat: 30.0, lng: 31.2 },
  { pattern: /\b(libya|tripoli|benghazi)\b/i, lat: 32.9, lng: 13.2 },
  { pattern: /\b(sudan|khartoum)\b/i, lat: 15.6, lng: 32.5 },
  { pattern: /\b(somalia|mogadishu)\b/i, lat: 2.0, lng: 45.3 },
  { pattern: /\b(red sea|bab.?el.?mandeb)\b/i, lat: 12.6, lng: 43.3 },
  { pattern: /\b(hormuz|strait of hormuz)\b/i, lat: 26.6, lng: 56.3 },
  { pattern: /\b(black sea|crimea|sevastopol)\b/i, lat: 44.6, lng: 33.5 },
  { pattern: /\b(pentagon|washington)\b/i, lat: 38.9, lng: -77.0 },
  { pattern: /\b(nato|brussels)\b/i, lat: 50.8, lng: 4.4 },
  { pattern: /\b(uk|london|britain)\b/i, lat: 51.5, lng: -0.1 },
  { pattern: /\b(france|paris)\b/i, lat: 48.9, lng: 2.3 },
  { pattern: /\b(germany|berlin)\b/i, lat: 52.5, lng: 13.4 },
  { pattern: /\b(poland|warsaw)\b/i, lat: 52.2, lng: 21.0 },
  { pattern: /\b(nigeria|lagos|abuja)\b/i, lat: 9.1, lng: 7.5 },
  { pattern: /\b(congo|kinshasa)\b/i, lat: -4.3, lng: 15.3 },
  { pattern: /\b(myanmar|burma)\b/i, lat: 19.8, lng: 96.2 },
  { pattern: /\b(india|delhi|mumbai)\b/i, lat: 28.6, lng: 77.2 },
  { pattern: /\b(japan|tokyo)\b/i, lat: 35.7, lng: 139.7 },
];

function extractLocationFromText(text: string): { lat: number; lng: number } | null {
  for (const { pattern, lat, lng } of LOCATION_PATTERNS) {
    if (pattern.test(text)) {
      return {
        lat: lat + (Math.random() - 0.5) * 1.5,
        lng: lng + (Math.random() - 0.5) * 1.5,
      };
    }
  }
  return null;
}

function categorizeText(text: string): string {
  const lower = text.toLowerCase();
  if (/strike|missile|bomb|airstrike|drone|attack|killed|casualties/.test(lower)) return "conflict";
  if (/troops|deploy|mobiliz|navy|army|air force|fighter/.test(lower)) return "military";
  if (/protest|riot|unrest|demonstrat/.test(lower)) return "unrest";
  if (/sanction|embargo|trade war|tariff|blockade/.test(lower)) return "economy";
  if (/nuclear|escalat|weapon|arms/.test(lower)) return "escalation";
  return "politics";
}

// ── Public API ──

export async function fetchSocialIntel(): Promise<SocialPost[]> {
  if (socialCache && Date.now() - socialCache.timestamp < CACHE_TTL) {
    return socialCache.data;
  }

  const posts = await fetchTwitterPosts().catch(() => [] as SocialPost[]);

  const sorted = posts
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 100);

  socialCache = { data: sorted, timestamp: Date.now() };
  return sorted;
}
