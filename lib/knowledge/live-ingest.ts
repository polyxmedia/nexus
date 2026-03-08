// Live Knowledge Ingestion Engine
// Pulls real-time geopolitical intelligence from GDELT and news sources,
// clusters articles by topic/region, and synthesizes them into knowledge entries.
// Runs as a scheduled background job to keep the knowledge base current.

import { db, schema } from "@/lib/db";
import { eq, and, like, desc } from "drizzle-orm";
import { extractEntities, type ExtractedEntities } from "@/lib/osint/entity-extractor";
import { addKnowledge, searchKnowledge } from "./engine";

// Topics to actively monitor with GDELT queries
const MONITOR_QUERIES = [
  { query: "strait hormuz iran oil", tags: ["hormuz", "iran", "oil", "chokepoint"], category: "geopolitical" as const },
  { query: "taiwan china military", tags: ["taiwan", "china", "military"], category: "geopolitical" as const },
  { query: "russia ukraine war", tags: ["russia", "ukraine", "conflict"], category: "geopolitical" as const },
  { query: "opec oil production cut", tags: ["opec", "oil", "energy"], category: "market" as const },
  { query: "federal reserve interest rate", tags: ["fed", "rates", "monetary-policy"], category: "market" as const },
  { query: "china economy trade", tags: ["china", "trade", "economy"], category: "market" as const },
  { query: "north korea nuclear missile", tags: ["north-korea", "nuclear", "missile"], category: "geopolitical" as const },
  { query: "israel iran hezbollah hamas", tags: ["israel", "iran", "middle-east"], category: "geopolitical" as const },
  { query: "red sea houthi shipping", tags: ["red-sea", "houthis", "shipping"], category: "geopolitical" as const },
  { query: "sanctions russia china iran", tags: ["sanctions", "geopolitical-risk"], category: "geopolitical" as const },
  { query: "NATO military europe defense", tags: ["nato", "europe", "defense"], category: "geopolitical" as const },
  { query: "saudi arabia oil energy", tags: ["saudi", "oil", "energy"], category: "market" as const },
  { query: "gold price safe haven", tags: ["gold", "safe-haven", "commodities"], category: "market" as const },
  { query: "cyber attack infrastructure", tags: ["cyber", "infrastructure", "security"], category: "geopolitical" as const },
  { query: "election political instability", tags: ["election", "political-risk"], category: "event" as const },
  { query: "supply chain disruption semiconductor", tags: ["supply-chain", "semiconductors"], category: "market" as const },
];

interface GdeltArticle {
  title: string;
  url: string;
  domain: string;
  seendate: string;
  socialimage?: string;
  tone?: number;
}

interface ArticleCluster {
  query: typeof MONITOR_QUERIES[number];
  articles: GdeltArticle[];
  entities: ExtractedEntities;
  avgTone: number;
}

// Fetch articles from GDELT for a given query
async function fetchGdeltForQuery(query: string, maxRecords = 15): Promise<GdeltArticle[]> {
  try {
    const encoded = encodeURIComponent(query);
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encoded}&mode=ArtList&maxrecords=${maxRecords}&format=json&sort=DateDesc`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return [];
    const json = await res.json();
    const articles = json?.articles || [];
    return articles.filter((a: GdeltArticle) => {
      const t = (a.title || "").trim();
      return t.length >= 10 && (a.url || "").startsWith("http");
    });
  } catch {
    return [];
  }
}

// Parse GDELT date format
function parseGdeltDate(seendate: string): string {
  if (!seendate) return new Date().toISOString();
  try {
    return new Date(
      seendate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, "$1-$2-$3T$4:$5:$6Z")
    ).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

// Synthesize a cluster of articles into a knowledge entry content block
function synthesizeCluster(cluster: ArticleCluster): string {
  const { articles, entities, avgTone, query } = cluster;
  const lines: string[] = [];

  lines.push(`## Live Intelligence: ${formatQueryTitle(query.query)}`);
  lines.push(`Last updated: ${new Date().toISOString().split("T")[0]}`);
  lines.push(`Sources analyzed: ${articles.length} recent articles`);
  lines.push("");

  // Key developments from article titles
  lines.push("### Recent Developments");
  const uniqueTitles = Array.from(new Set(articles.map(a => a.title.trim())));
  for (const title of uniqueTitles.slice(0, 8)) {
    lines.push(`- ${title}`);
  }
  lines.push("");

  // Extracted intelligence
  if (entities.actors.length > 0) {
    lines.push(`**Key Actors:** ${entities.actors.join(", ")}`);
  }
  if (entities.locations.length > 0) {
    lines.push(`**Locations:** ${entities.locations.join(", ")}`);
  }
  if (entities.topics.length > 0) {
    lines.push(`**Topics:** ${entities.topics.join(", ")}`);
  }
  if (entities.tickers.length > 0) {
    lines.push(`**Market Impact (tickers):** ${entities.tickers.join(", ")}`);
  }
  if (entities.scenarios.length > 0) {
    lines.push(`**Active Scenarios:** ${entities.scenarios.join(", ")}`);
  }
  lines.push("");

  // Sentiment and urgency
  lines.push(`**Sentiment:** ${entities.sentiment} (avg tone: ${avgTone.toFixed(1)})`);
  lines.push(`**Urgency:** ${entities.urgency}`);
  lines.push("");

  // Source diversity
  const domains = Array.from(new Set(articles.map(a => a.domain)));
  lines.push(`**Sources:** ${domains.slice(0, 6).join(", ")}${domains.length > 6 ? ` (+${domains.length - 6} more)` : ""}`);

  return lines.join("\n");
}

function formatQueryTitle(query: string): string {
  return query
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Calculate confidence based on article count and source diversity
function calculateConfidence(articles: GdeltArticle[]): number {
  const domains = new Set(articles.map(a => a.domain));
  const articleScore = Math.min(articles.length / 10, 1); // max at 10 articles
  const diversityScore = Math.min(domains.size / 5, 1); // max at 5 unique sources
  return Math.round((0.4 + articleScore * 0.3 + diversityScore * 0.3) * 100) / 100;
}

// Find existing knowledge entry for a given monitor query
async function findExistingEntry(query: typeof MONITOR_QUERIES[number]): Promise<number | null> {
  const title = `Live: ${formatQueryTitle(query.query)}`;
  const rows = await db
    .select()
    .from(schema.knowledge)
    .where(
      and(
        like(schema.knowledge.title, `Live: ${formatQueryTitle(query.query)}%`),
        eq(schema.knowledge.status, "active")
      )
    )
    .orderBy(desc(schema.knowledge.createdAt))
    .limit(1);
  return rows[0]?.id ?? null;
}

// Main ingestion function - called by scheduler
export async function refreshLiveKnowledge(): Promise<{
  queriesProcessed: number;
  entriesCreated: number;
  entriesUpdated: number;
  articlesAnalyzed: number;
  errors: number;
}> {
  let entriesCreated = 0;
  let entriesUpdated = 0;
  let totalArticles = 0;
  let errors = 0;
  let queriesProcessed = 0;

  for (const monitorQuery of MONITOR_QUERIES) {
    try {
      // Stagger requests to avoid rate limiting
      if (queriesProcessed > 0) {
        await new Promise(r => setTimeout(r, 1500));
      }

      const articles = await fetchGdeltForQuery(monitorQuery.query);
      if (articles.length === 0) continue;

      totalArticles += articles.length;
      queriesProcessed++;

      // Extract entities from all article titles combined
      const combinedText = articles.map(a => a.title).join(". ");
      const entities = extractEntities(combinedText);

      // Calculate average tone
      const tones = articles.filter(a => a.tone !== undefined).map(a => a.tone!);
      const avgTone = tones.length > 0 ? tones.reduce((a, b) => a + b, 0) / tones.length : 0;

      const cluster: ArticleCluster = { query: monitorQuery, articles, entities, avgTone };
      const content = synthesizeCluster(cluster);
      const title = `Live: ${formatQueryTitle(monitorQuery.query)}`;
      const confidence = calculateConfidence(articles);
      const now = new Date();
      const validUntil = new Date(now.getTime() + 2 * 60 * 60_000).toISOString(); // valid 2 hours

      // Check for existing entry
      const existingId = await findExistingEntry(monitorQuery);

      if (existingId) {
        // Update existing entry
        await db
          .update(schema.knowledge)
          .set({
            content,
            confidence,
            tags: JSON.stringify([...monitorQuery.tags, ...entities.actors.map(a => a.toLowerCase()), ...entities.topics]),
            validUntil,
            metadata: JSON.stringify({
              articleCount: articles.length,
              sources: Array.from(new Set(articles.map(a => a.domain))),
              sentiment: entities.sentiment,
              urgency: entities.urgency,
              lastArticleDate: parseGdeltDate(articles[0]?.seendate),
              tickers: entities.tickers,
              scenarios: entities.scenarios,
            }),
            updatedAt: now.toISOString(),
          })
          .where(eq(schema.knowledge.id, existingId));
        entriesUpdated++;
      } else {
        // Create new entry
        await addKnowledge({
          title,
          content,
          category: monitorQuery.category,
          tags: JSON.stringify([...monitorQuery.tags, ...entities.actors.map(a => a.toLowerCase()), ...entities.topics]),
          source: "live-ingest",
          confidence,
          status: "active",
          validFrom: now.toISOString(),
          validUntil,
          metadata: JSON.stringify({
            articleCount: articles.length,
            sources: Array.from(new Set(articles.map(a => a.domain))),
            sentiment: entities.sentiment,
            urgency: entities.urgency,
            lastArticleDate: parseGdeltDate(articles[0]?.seendate),
            tickers: entities.tickers,
            scenarios: entities.scenarios,
          }),
        });
        entriesCreated++;
      }
    } catch (err) {
      errors++;
      console.error(`[live-ingest] Failed for query "${monitorQuery.query}":`, err);
    }
  }

  console.log(
    `[live-ingest] Done: ${queriesProcessed} queries, ${totalArticles} articles, ${entriesCreated} created, ${entriesUpdated} updated, ${errors} errors`
  );

  return { queriesProcessed, entriesCreated, entriesUpdated, articlesAnalyzed: totalArticles, errors };
}

// Expire stale knowledge entries whose validUntil has passed
export async function expireStaleKnowledge(): Promise<number> {
  const now = new Date().toISOString();
  const active = await db
    .select()
    .from(schema.knowledge)
    .where(
      and(
        eq(schema.knowledge.source, "live-ingest"),
        eq(schema.knowledge.status, "active")
      )
    );

  let expired = 0;
  for (const entry of active) {
    if (entry.validUntil && entry.validUntil < now) {
      // Don't archive, just mark stale so it gets superseded on next refresh
      // If it hasn't been updated in 6+ hours, archive it
      const updatedAt = entry.updatedAt ? new Date(entry.updatedAt).getTime() : 0;
      const sixHoursAgo = Date.now() - 6 * 60 * 60_000;
      if (updatedAt < sixHoursAgo) {
        await db
          .update(schema.knowledge)
          .set({ status: "archived", updatedAt: now })
          .where(eq(schema.knowledge.id, entry.id));
        expired++;
      }
    }
  }

  return expired;
}
