/**
 * Wikipedia Bulk Ingest
 *
 * Uses Wikipedia's API to fetch articles by category. Targets geopolitical,
 * conflict, economics, and intelligence-relevant domains. Articles are stored
 * in the knowledge bank with source="wikipedia" for deduplication.
 *
 * Categories are walked recursively (1 level deep) to get good coverage
 * without pulling all of Wikipedia.
 */

import { addKnowledge } from "./engine";
import { db, schema } from "@/lib/db";
import { eq, and, like } from "drizzle-orm";

// ── Target Categories ──

const WIKIPEDIA_CATEGORIES = [
  // Geopolitics & International Relations
  "International_relations",
  "Geopolitics",
  "Foreign_relations_of_the_United_States",
  "Foreign_relations_of_China",
  "Foreign_relations_of_Russia",
  "Foreign_policy_doctrines",
  "Diplomatic_incidents",
  "International_sanctions",
  "Economic_sanctions",
  // Conflicts & Military
  "Wars_involving_the_United_States",
  "Wars_involving_Russia",
  "Wars_involving_Israel",
  "Proxy_wars",
  "Cold_War",
  "War_on_terror",
  "Cyberwarfare",
  "Nuclear_weapons",
  "Military_alliances",
  "NATO",
  // Economics & Trade
  "Financial_crises",
  "Trade_wars",
  "Economic_crises",
  "Oil_crises",
  "Currency_crises",
  "Stock_market_crashes",
  "Recessions",
  "Central_banks",
  // Energy & Resources
  "Petroleum_politics",
  "OPEC",
  "Energy_security",
  "Strategic_petroleum_reserves",
  // Intelligence & Security
  "Intelligence_agencies",
  "Espionage",
  "Covert_operations",
  "State-sponsored_terrorism",
  // Key Regions
  "Middle_East_conflicts",
  "South_China_Sea",
  "Taiwan_Strait",
  "Korean_conflict",
  "European_Union_foreign_relations",
];

// Map Wikipedia categories to knowledge bank categories
function mapCategory(wikiCategory: string): string {
  const lower = wikiCategory.toLowerCase();
  if (lower.includes("war") || lower.includes("conflict") || lower.includes("military") || lower.includes("nato")) return "geopolitical";
  if (lower.includes("econom") || lower.includes("financial") || lower.includes("trade") || lower.includes("crisis") || lower.includes("crash") || lower.includes("recession") || lower.includes("bank")) return "market";
  if (lower.includes("intelligence") || lower.includes("espionage") || lower.includes("covert")) return "actor_intelligence";
  if (lower.includes("energy") || lower.includes("petroleum") || lower.includes("opec")) return "market";
  return "geopolitical";
}

// ── Wikipedia API Helpers ──

interface WikiArticle {
  title: string;
  extract: string;
  pageid: number;
}

/**
 * Get article titles from a Wikipedia category.
 */
async function getCategoryMembers(category: string, limit = 50): Promise<string[]> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:${encodeURIComponent(category)}&cmtype=page&cmlimit=${limit}&format=json&origin=*`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) return [];
  const data = await res.json();
  const members = data?.query?.categorymembers || [];
  return members.map((m: { title: string }) => m.title);
}

/**
 * Fetch article extracts in batches of 20 (Wikipedia API limit).
 */
async function fetchArticles(titles: string[]): Promise<WikiArticle[]> {
  const articles: WikiArticle[] = [];
  // Wikipedia API supports up to 20 titles per request
  for (let i = 0; i < titles.length; i += 20) {
    const batch = titles.slice(i, i + 20);
    const titlesParam = batch.join("|");
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=false&explaintext&exlimit=${batch.length}&titles=${encodeURIComponent(titlesParam)}&format=json&origin=*`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) continue;
      const data = await res.json();
      const pages = data?.query?.pages || {};
      for (const page of Object.values(pages) as Array<{ title: string; extract?: string; pageid?: number }>) {
        if (page.extract && page.extract.length > 200 && page.pageid) {
          articles.push({
            title: page.title,
            extract: page.extract,
            pageid: page.pageid,
          });
        }
      }
    } catch {
      // Skip failed batches
    }
    // Small delay between batches to be respectful to Wikipedia API
    if (i + 20 < titles.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  return articles;
}

/**
 * Check if a Wikipedia article already exists in the knowledge bank.
 */
async function articleExists(title: string): Promise<boolean> {
  const existing = await db
    .select({ id: schema.knowledge.id })
    .from(schema.knowledge)
    .where(
      and(
        eq(schema.knowledge.source, "wikipedia"),
        like(schema.knowledge.title, `%${title.slice(0, 60)}%`)
      )
    )
    .limit(1);
  return existing.length > 0;
}

// ── Main Ingest ──

export interface WikiIngestResult {
  ingested: number;
  skipped: number;
  errors: number;
  categories: number;
  details: Array<{ category: string; fetched: number; ingested: number }>;
}

/**
 * Ingest Wikipedia articles from target categories into the knowledge bank.
 * Fetches articles via API, deduplicates, and stores with embeddings.
 *
 * @param maxPerCategory - Max articles to fetch per category (default 30)
 * @param categories - Optional override of categories to ingest
 */
export async function ingestWikipedia(
  maxPerCategory = 30,
  categories?: string[],
): Promise<WikiIngestResult> {
  const targetCategories = categories || WIKIPEDIA_CATEGORIES;
  let totalIngested = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  const details: Array<{ category: string; fetched: number; ingested: number }> = [];

  // Load all existing Wikipedia titles in one query upfront
  const existingRows = await db
    .select({ title: schema.knowledge.title })
    .from(schema.knowledge)
    .where(eq(schema.knowledge.source, "wikipedia"));
  const existingTitles = new Set(
    existingRows.map((r) => r.title.replace(/^Wikipedia:\s*/i, "").toLowerCase())
  );

  for (const category of targetCategories) {
    try {
      // Get article titles from category
      const titles = await getCategoryMembers(category, maxPerCategory);
      if (titles.length === 0) {
        details.push({ category, fetched: 0, ingested: 0 });
        continue;
      }

      // Filter out titles we already have BEFORE fetching content
      const newTitles = titles.filter((t) => !existingTitles.has(t.toLowerCase()));
      if (newTitles.length === 0) {
        totalSkipped += titles.length;
        details.push({ category, fetched: 0, ingested: 0 });
        continue;
      }
      totalSkipped += titles.length - newTitles.length;

      // Fetch article content only for new titles
      const articles = await fetchArticles(newTitles);
      let categoryIngested = 0;

      for (const article of articles) {
        try {

          // Chunk long articles - max 3000 chars per entry for good embeddings
          const content = article.extract.slice(0, 3000);
          const kbCategory = mapCategory(category);

          await addKnowledge({
            title: `Wikipedia: ${article.title}`,
            content,
            category: kbCategory,
            tags: JSON.stringify(["wikipedia", category.toLowerCase().replace(/_/g, "-")]),
            source: "wikipedia",
            confidence: 0.75,
            status: "active",
            validFrom: new Date().toISOString(),
            metadata: JSON.stringify({
              wikipediaPageId: article.pageid,
              wikipediaCategory: category,
              fullLength: article.extract.length,
              truncated: article.extract.length > 3000,
              ingestedAt: new Date().toISOString(),
            }),
          });

          existingTitles.add(article.title.toLowerCase());
          categoryIngested++;
          totalIngested++;
        } catch {
          totalErrors++;
        }
      }

      details.push({ category, fetched: articles.length, ingested: categoryIngested });

      // Small delay between categories
      await new Promise((r) => setTimeout(r, 300));
    } catch {
      totalErrors++;
      details.push({ category, fetched: 0, ingested: 0 });
    }
  }

  return {
    ingested: totalIngested,
    skipped: totalSkipped,
    errors: totalErrors,
    categories: targetCategories.length,
    details,
  };
}

export const WIKIPEDIA_CATEGORY_COUNT = WIKIPEDIA_CATEGORIES.length;
