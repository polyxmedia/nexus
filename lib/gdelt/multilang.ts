/**
 * Multi-Language GDELT Intelligence
 * ===================================
 * Queries GDELT in key intelligence languages to catch regional news
 * before it hits English wire services.
 *
 * Supported languages: Arabic, Mandarin, Russian, Farsi, Turkish,
 * Hebrew, Hindi, Japanese, Korean, Spanish, French, Portuguese.
 *
 * GDELT already machine-translates all articles, so results come
 * back in English regardless of source language.
 */

import { docSearch, type GdeltArticle } from "./client";

// Intelligence-priority languages and their GDELT codes
const INTEL_LANGUAGES = [
  { code: "arabic", label: "Arabic", region: "Middle East", priority: 1 },
  { code: "mandarin", label: "Mandarin", region: "East Asia", priority: 1 },
  { code: "russian", label: "Russian", region: "Europe/Central Asia", priority: 1 },
  { code: "farsi", label: "Farsi", region: "Iran/Afghanistan", priority: 1 },
  { code: "turkish", label: "Turkish", region: "Turkey/Central Asia", priority: 2 },
  { code: "hebrew", label: "Hebrew", region: "Israel", priority: 2 },
  { code: "hindi", label: "Hindi", region: "South Asia", priority: 2 },
  { code: "japanese", label: "Japanese", region: "East Asia", priority: 2 },
  { code: "korean", label: "Korean", region: "Korean Peninsula", priority: 2 },
  { code: "spanish", label: "Spanish", region: "Americas", priority: 3 },
  { code: "french", label: "French", region: "Africa/Europe", priority: 3 },
  { code: "portuguese", label: "Portuguese", region: "Brazil/Africa", priority: 3 },
] as const;

export interface MultiLangResult {
  articles: Array<GdeltArticle & { sourceLanguage: string; sourceRegion: string }>;
  languageBreakdown: Array<{ language: string; region: string; count: number }>;
  totalArticles: number;
  languagesQueried: number;
}

/**
 * Search GDELT across multiple intelligence languages.
 * Returns deduplicated results with source language metadata.
 *
 * @param query Search query (GDELT handles translation)
 * @param options.maxPerLanguage Max articles per language (default 10)
 * @param options.priorityOnly Only query priority 1 languages (default false)
 * @param options.timespan GDELT timespan (default "3d")
 */
export async function multiLanguageSearch(
  query: string,
  options?: {
    maxPerLanguage?: number;
    priorityOnly?: boolean;
    timespan?: string;
  }
): Promise<MultiLangResult> {
  const maxPer = options?.maxPerLanguage || 10;
  const timespan = options?.timespan || "3d";
  const languages = options?.priorityOnly
    ? INTEL_LANGUAGES.filter(l => l.priority === 1)
    : INTEL_LANGUAGES;

  // Query all languages in parallel (GDELT handles rate limiting)
  const results = await Promise.allSettled(
    languages.map(async (lang) => {
      const articles = await docSearch({
        query,
        sourceLang: lang.code,
        maxRecords: maxPer,
        timespan,
        timeoutMs: 8000,
      });
      return { lang, articles };
    })
  );

  // Collect and deduplicate by URL
  const seen = new Set<string>();
  const allArticles: MultiLangResult["articles"] = [];
  const breakdown: Map<string, { region: string; count: number }> = new Map();

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const { lang, articles } = result.value;

    let langCount = 0;
    for (const article of articles) {
      if (seen.has(article.url)) continue;
      seen.add(article.url);
      allArticles.push({
        ...article,
        sourceLanguage: lang.label,
        sourceRegion: lang.region,
      });
      langCount++;
    }

    if (langCount > 0) {
      breakdown.set(lang.label, { region: lang.region, count: langCount });
    }
  }

  // Sort by date (newest first)
  allArticles.sort((a, b) => (b.seendate || "").localeCompare(a.seendate || ""));

  return {
    articles: allArticles,
    languageBreakdown: Array.from(breakdown.entries()).map(([language, data]) => ({
      language,
      region: data.region,
      count: data.count,
    })),
    totalArticles: allArticles.length,
    languagesQueried: languages.length,
  };
}

/**
 * Get regional intelligence summary by querying native-language sources
 * for a specific region.
 */
export async function getRegionalIntelligence(
  region: "middle_east" | "east_asia" | "europe" | "south_asia" | "americas",
  query: string,
  timespan = "3d"
): Promise<MultiLangResult> {
  const regionLanguages: Record<string, string[]> = {
    middle_east: ["arabic", "farsi", "hebrew", "turkish"],
    east_asia: ["mandarin", "japanese", "korean"],
    europe: ["russian", "french", "turkish"],
    south_asia: ["hindi"],
    americas: ["spanish", "portuguese"],
  };

  const langs = regionLanguages[region] || [];

  const results = await Promise.allSettled(
    langs.map(async (langCode) => {
      const lang = INTEL_LANGUAGES.find(l => l.code === langCode);
      if (!lang) return { lang: { label: langCode, region: "", code: langCode }, articles: [] as GdeltArticle[] };
      const articles = await docSearch({
        query,
        sourceLang: langCode,
        maxRecords: 15,
        timespan,
        timeoutMs: 8000,
      });
      return { lang, articles };
    })
  );

  const seen = new Set<string>();
  const allArticles: MultiLangResult["articles"] = [];
  const breakdown: Map<string, { region: string; count: number }> = new Map();

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const { lang, articles } = result.value;
    let langCount = 0;
    for (const article of articles) {
      if (seen.has(article.url)) continue;
      seen.add(article.url);
      allArticles.push({
        ...article,
        sourceLanguage: lang.label,
        sourceRegion: lang.region || "",
      });
      langCount++;
    }
    if (langCount > 0) {
      breakdown.set(lang.label, { region: lang.region || "", count: langCount });
    }
  }

  allArticles.sort((a, b) => (b.seendate || "").localeCompare(a.seendate || ""));

  return {
    articles: allArticles,
    languageBreakdown: Array.from(breakdown.entries()).map(([language, data]) => ({
      language, region: data.region, count: data.count,
    })),
    totalArticles: allArticles.length,
    languagesQueried: langs.length,
  };
}
