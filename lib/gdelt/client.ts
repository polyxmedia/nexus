// Centralized GDELT API client
// Replaces scattered fetch calls across the codebase with a single, typed interface
// covering DOC 2.0, GEO 2.0, Context 2.0, and TV 2.0 APIs.

const BASE = "https://api.gdeltproject.org/api/v2";
const DEFAULT_TIMEOUT = 10_000;

// ── Types ──

export interface GdeltArticle {
  title: string;
  url: string;
  url_mobile?: string;
  seendate?: string;
  socialimage?: string;
  domain?: string;
  language?: string;
  sourcecountry?: string;
  tone?: number;
  // geo fields (when available in ArtList)
  actiongeo_lat?: number;
  actiongeo_long?: number;
  actiongeo_countrycode?: string;
  actiongeo_name?: string;
}

export interface GdeltGeoFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    name: string;
    count: number;
    shareimage?: string;
    html?: string;
    url?: string;
  };
}

export interface GdeltGeoResponse {
  type: "FeatureCollection";
  features: GdeltGeoFeature[];
}

export interface GdeltTimelinePoint {
  date: string;
  value: number;
}

export interface GdeltTimelineSeries {
  series: Array<{ name?: string; data: GdeltTimelinePoint[] }>;
}

export interface GdeltContextItem {
  name: string;
  value: number;
}

export interface GdeltTVResult {
  station: string;
  show?: string;
  date: string;
  snippet: string;
  url?: string;
  preview_url?: string;
}

// ── Shared fetch with content-type guard ──

async function gdeltFetch<T>(url: string, timeoutMs = DEFAULT_TIMEOUT): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;

    const ct = res.headers.get("content-type") || "";
    // GDELT returns HTML error pages on rate limit or bad queries
    if (ct.includes("text/html")) {
      const text = await res.text();
      if (!text.trimStart().startsWith("{") && !text.trimStart().startsWith("[")) return null;
      return JSON.parse(text) as T;
    }

    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ── DOC 2.0 API ──

type DocMode =
  | "ArtList"        // article listings
  | "TimelineVol"    // volume over time
  | "TimelineVolRaw" // raw volume (not normalized)
  | "TimelineTone"   // average tone over time
  | "TimelineLang"   // language breakdown over time
  | "TimelineSourceCountry"; // source country breakdown

export interface DocSearchOptions {
  query: string;
  mode?: DocMode;
  maxRecords?: number;
  timespan?: string;       // e.g. "7d", "30d", "3m"
  startDate?: string;      // YYYYMMDDHHMMSS
  endDate?: string;        // YYYYMMDDHHMMSS
  sourceLang?: string;     // e.g. "english", "arabic" - empty = all 65 languages
  sourceCountry?: string;  // e.g. "US", "RU"
  theme?: string;          // GDELT GKG theme
  tone?: "positive" | "negative"; // filter by tone
  timeoutMs?: number;
}

export async function docSearch(opts: DocSearchOptions): Promise<GdeltArticle[]> {
  const mode = opts.mode || "ArtList";
  const max = opts.maxRecords || 50;
  const params = new URLSearchParams({
    query: opts.query,
    mode,
    maxrecords: String(max),
    format: "json",
    sort: "DateDesc",
  });
  if (opts.timespan) params.set("timespan", opts.timespan);
  if (opts.startDate) params.set("startdatetime", opts.startDate);
  if (opts.endDate) params.set("enddatetime", opts.endDate);
  if (opts.sourceLang) params.set("sourcelang", opts.sourceLang);
  if (opts.sourceCountry) params.set("sourcecountry", opts.sourceCountry);
  if (opts.theme) params.set("theme", opts.theme);
  if (opts.tone === "positive") params.set("toneabs", "5");
  if (opts.tone === "negative") params.set("toneabsunder", "-5");

  const url = `${BASE}/doc/doc?${params}`;
  const data = await gdeltFetch<{ articles?: GdeltArticle[] }>(url, opts.timeoutMs);
  return data?.articles || [];
}

/**
 * Timeline queries return volume/tone over time instead of article lists.
 */
export async function docTimeline(
  query: string,
  mode: "TimelineVol" | "TimelineVolRaw" | "TimelineTone" | "TimelineSourceCountry" = "TimelineVol",
  opts?: { timespan?: string; sourceLang?: string; timeoutMs?: number }
): Promise<GdeltTimelineSeries | null> {
  const params = new URLSearchParams({
    query,
    mode,
    format: "json",
  });
  if (opts?.timespan) params.set("timespan", opts.timespan);
  if (opts?.sourceLang) params.set("sourcelang", opts.sourceLang);

  const url = `${BASE}/doc/doc?${params}`;
  return gdeltFetch<GdeltTimelineSeries>(url, opts?.timeoutMs);
}

// ── GEO 2.0 API ──

export interface GeoSearchOptions {
  query: string;
  mode?: "PointData" | "PointHeat";
  timespan?: string;      // default "7d"
  sourceLang?: string;
  sourceCountry?: string;
  timeoutMs?: number;
}

/**
 * Returns GeoJSON FeatureCollection of locations mentioned alongside search terms.
 * Updated every 15 minutes. Covers all 65 machine-translated languages.
 */
export async function geoSearch(opts: GeoSearchOptions): Promise<GdeltGeoFeature[]> {
  const params = new URLSearchParams({
    query: opts.query,
    format: "GeoJSON",
    mode: opts.mode || "PointData",
  });
  if (opts.timespan) params.set("timespan", opts.timespan);
  if (opts.sourceLang) params.set("sourcelang", opts.sourceLang);
  if (opts.sourceCountry) params.set("sourcecountry", opts.sourceCountry);

  const url = `${BASE}/geo/geo?${params}`;
  const data = await gdeltFetch<GdeltGeoResponse>(url, opts.timeoutMs);
  return data?.features || [];
}

// ── Context 2.0 API ──

export interface ContextSearchOptions {
  query: string;
  mode?: "ContextualThemes" | "ContextualOrganizations" | "ContextualPersons" | "ContextualLocations";
  timespan?: string;
  timeoutMs?: number;
}

/**
 * Returns contextual information around search terms, what else is being
 * discussed alongside your keywords. Useful for detecting narrative shifts
 * and emerging topics.
 */
export async function contextSearch(opts: ContextSearchOptions): Promise<GdeltContextItem[]> {
  const mode = opts.mode || "ContextualThemes";
  const params = new URLSearchParams({
    query: opts.query,
    mode,
    format: "json",
  });
  if (opts.timespan) params.set("timespan", opts.timespan);

  const url = `${BASE}/context/context?${params}`;
  const data = await gdeltFetch<GdeltContextItem[]>(url, opts.timeoutMs);
  return data || [];
}

// ── TV 2.0 API ──

export interface TVSearchOptions {
  query: string;
  mode?: "ClipList" | "TimelineVol" | "TimelineVolNorm";
  timespan?: string;       // default "7d"
  maxRecords?: number;
  station?: string;        // e.g. "CNN", "FOXNEWS", "MSNBC", "BBCNEWS"
  timeoutMs?: number;
}

/**
 * Search US and international television news broadcasts.
 * Different signal source from print/online media.
 */
export async function tvSearch(opts: TVSearchOptions): Promise<GdeltTVResult[]> {
  const mode = opts.mode || "ClipList";
  const max = opts.maxRecords || 25;
  const params = new URLSearchParams({
    query: opts.query,
    mode,
    maxrecords: String(max),
    format: "json",
  });
  if (opts.timespan) params.set("timespan", opts.timespan);
  if (opts.station) params.set("station", opts.station);

  const url = `${BASE}/tv/tv?${params}`;
  const data = await gdeltFetch<{ clips?: GdeltTVResult[] }>(url, opts.timeoutMs);
  return data?.clips || [];
}

// ── Convenience: Multi-language search ──

/**
 * Search across all 65 GDELT-translated languages with English keywords.
 * Returns articles from non-English sources that match the query.
 */
export async function multiLangSearch(
  query: string,
  opts?: { maxRecords?: number; timespan?: string; timeoutMs?: number }
): Promise<GdeltArticle[]> {
  // GDELT translates all articles into English by default.
  // Setting sourcelang to empty searches across ALL languages.
  // To get specifically non-English sources, we exclude English.
  const params = new URLSearchParams({
    query,
    mode: "ArtList",
    maxrecords: String(opts?.maxRecords || 50),
    format: "json",
    sort: "DateDesc",
    sourcelangNot: "english",
  });
  if (opts?.timespan) params.set("timespan", opts.timespan);

  const url = `${BASE}/doc/doc?${params}`;
  const data = await gdeltFetch<{ articles?: GdeltArticle[] }>(url, opts?.timeoutMs);
  return data?.articles || [];
}

// ── Convenience: Tone extraction from articles ──

/**
 * Fetch articles and return with tone data extracted.
 * GDELT DOC 2.0 includes tone values in article responses when available.
 */
export async function searchWithTone(
  query: string,
  opts?: { maxRecords?: number; timespan?: string; timeoutMs?: number }
): Promise<Array<GdeltArticle & { toneValue: number }>> {
  const articles = await docSearch({
    query,
    maxRecords: opts?.maxRecords || 50,
    timespan: opts?.timespan,
    timeoutMs: opts?.timeoutMs,
  });

  return articles
    .filter((a) => a.tone != null)
    .map((a) => ({ ...a, toneValue: a.tone as number }));
}

// ── Convenience: Geographic clustering ──

/**
 * Cluster GEO API results by proximity to detect geographic convergence.
 * Returns clusters where multiple independent articles mention locations
 * within the given radius (km).
 */
export function clusterGeoFeatures(
  features: GdeltGeoFeature[],
  radiusKm = 50
): Array<{ center: [number, number]; count: number; totalMentions: number; features: GdeltGeoFeature[] }> {
  const clusters: Array<{ center: [number, number]; count: number; totalMentions: number; features: GdeltGeoFeature[] }> = [];

  for (const feature of features) {
    const [lng, lat] = feature.geometry.coordinates;
    let merged = false;

    for (const cluster of clusters) {
      const dist = haversineKm(lat, lng, cluster.center[1], cluster.center[0]);
      if (dist <= radiusKm) {
        cluster.features.push(feature);
        cluster.count++;
        cluster.totalMentions += feature.properties.count || 1;
        merged = true;
        break;
      }
    }

    if (!merged) {
      clusters.push({
        center: [lng, lat],
        count: 1,
        totalMentions: feature.properties.count || 1,
        features: [feature],
      });
    }
  }

  return clusters.sort((a, b) => b.totalMentions - a.totalMentions);
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
