/**
 * YouTube Data API v3 integration for partner discovery.
 * Searches channels, fetches stats, and extracts contact info.
 */

const BASE_URL = "https://www.googleapis.com/youtube/v3";

function getApiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY not set");
  return key;
}

export interface YouTubeChannel {
  channelId: string;
  channelName: string;
  channelUrl: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  description: string;
  thumbnailUrl: string;
  contactEmail: string | null;
  topics: string[];
}

interface SearchItem {
  id: { channelId: string };
  snippet: {
    channelId: string;
    title: string;
    description: string;
    thumbnails: { medium?: { url: string }; default?: { url: string } };
  };
}

interface ChannelItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    customUrl: string;
    thumbnails: { medium?: { url: string }; default?: { url: string } };
  };
  statistics: {
    subscriberCount: string;
    videoCount: string;
    viewCount: string;
  };
  topicDetails?: {
    topicCategories?: string[];
  };
  brandingSettings?: {
    channel?: {
      description?: string;
    };
  };
}

/**
 * Search YouTube channels by query.
 */
export async function searchChannels(
  query: string,
  maxResults = 10
): Promise<YouTubeChannel[]> {
  const apiKey = getApiKey();

  // Step 1: Search for channels
  const searchUrl = `${BASE_URL}/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=${maxResults}&key=${apiKey}`;
  const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(15_000) });
  if (!searchRes.ok) throw new Error(`YouTube search failed: ${searchRes.status}`);
  const searchData = await searchRes.json();

  const channelIds = (searchData.items as SearchItem[])
    .map((item) => item.id.channelId || item.snippet.channelId)
    .filter(Boolean);

  if (channelIds.length === 0) return [];

  // Step 2: Get detailed channel info
  return getChannelDetails(channelIds);
}

/**
 * Get detailed info for specific channel IDs.
 */
export async function getChannelDetails(channelIds: string[]): Promise<YouTubeChannel[]> {
  const apiKey = getApiKey();

  const detailUrl = `${BASE_URL}/channels?part=snippet,statistics,topicDetails,brandingSettings&id=${channelIds.join(",")}&key=${apiKey}`;
  const detailRes = await fetch(detailUrl, { signal: AbortSignal.timeout(15_000) });
  if (!detailRes.ok) throw new Error(`YouTube channel detail failed: ${detailRes.status}`);
  const detailData = await detailRes.json();

  return (detailData.items as ChannelItem[]).map((ch) => {
    const desc = ch.brandingSettings?.channel?.description || ch.snippet.description || "";
    return {
      channelId: ch.id,
      channelName: ch.snippet.title,
      channelUrl: ch.snippet.customUrl
        ? `https://youtube.com/${ch.snippet.customUrl}`
        : `https://youtube.com/channel/${ch.id}`,
      subscriberCount: parseInt(ch.statistics.subscriberCount || "0", 10),
      videoCount: parseInt(ch.statistics.videoCount || "0", 10),
      viewCount: parseInt(ch.statistics.viewCount || "0", 10),
      description: desc,
      thumbnailUrl: ch.snippet.thumbnails?.medium?.url || ch.snippet.thumbnails?.default?.url || "",
      contactEmail: extractEmail(desc),
      topics: (ch.topicDetails?.topicCategories || []).map((url) => {
        const parts = url.split("/");
        return parts[parts.length - 1].replace(/_/g, " ");
      }),
    };
  });
}

/**
 * Extract email from channel description (common for business enquiries).
 */
function extractEmail(text: string): string | null {
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : null;
}

/**
 * Format subscriber count for display.
 */
export function formatSubscribers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}
