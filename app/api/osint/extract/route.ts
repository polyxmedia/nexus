import { NextRequest, NextResponse } from "next/server";
import { extractEntities, processOsintArticles, linkEntitiesToGraph } from "@/lib/osint/entity-extractor";
import { requireTier } from "@/lib/auth/require-tier";

export async function GET(req: NextRequest) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  const query = req.nextUrl.searchParams.get("q") || "";

  try {
    // Fetch recent OSINT from GDELT
    const gdeltUrl = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query || "conflict OR crisis OR military OR sanctions")}&mode=ArtList&maxrecords=25&format=json&sort=DateDesc&timespan=3d`;
    const res = await fetch(gdeltUrl, { signal: AbortSignal.timeout(10000) });

    if (!res.ok) {
      return NextResponse.json({ error: `GDELT fetch failed: ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    const articles = (data.articles || []).map((a: Record<string, unknown>) => ({
      title: a.title as string,
      url: a.url as string,
      date: a.seendate as string,
      tone: a.tone as number,
    }));

    // Extract entities from all articles
    const extracted = await processOsintArticles(articles);

    // Link to graph
    let totalEntities = 0;
    let totalRelationships = 0;
    const today = new Date().toISOString().split("T")[0];

    for (const item of extracted) {
      if (item.actors.length > 0 || item.tickers.length > 0) {
        const { entitiesCreated, relationshipsCreated } = await linkEntitiesToGraph(
          item,
          item.title,
          today
        );
        totalEntities += entitiesCreated;
        totalRelationships += relationshipsCreated;
      }
    }

    // Aggregate stats
    const actorCounts: Record<string, number> = {};
    const topicCounts: Record<string, number> = {};
    const tickerCounts: Record<string, number> = {};
    const scenarioCounts: Record<string, number> = {};

    for (const item of extracted) {
      for (const a of item.actors) actorCounts[a] = (actorCounts[a] || 0) + 1;
      for (const t of item.topics) topicCounts[t] = (topicCounts[t] || 0) + 1;
      for (const t of item.tickers) tickerCounts[t] = (tickerCounts[t] || 0) + 1;
      for (const s of item.scenarios) scenarioCounts[s] = (scenarioCounts[s] || 0) + 1;
    }

    const criticalItems = extracted.filter(e => e.urgency === "critical" || e.urgency === "high");
    const negativeItems = extracted.filter(e => e.sentiment === "negative");

    return NextResponse.json({
      articlesProcessed: articles.length,
      entitiesCreated: totalEntities,
      relationshipsCreated: totalRelationships,
      summary: {
        actorMentions: Object.entries(actorCounts).sort((a, b) => b[1] - a[1]),
        topicMentions: Object.entries(topicCounts).sort((a, b) => b[1] - a[1]),
        tickerExposure: Object.entries(tickerCounts).sort((a, b) => b[1] - a[1]),
        scenarioMatches: Object.entries(scenarioCounts).sort((a, b) => b[1] - a[1]),
        criticalCount: criticalItems.length,
        negativeCount: negativeItems.length,
        sentimentBreakdown: {
          positive: extracted.filter(e => e.sentiment === "positive").length,
          neutral: extracted.filter(e => e.sentiment === "neutral").length,
          negative: negativeItems.length,
        },
      },
      criticalArticles: criticalItems.map(item => ({
        title: item.title,
        actors: item.actors,
        topics: item.topics,
        tickers: item.tickers,
        scenarios: item.scenarios,
        urgency: item.urgency,
        sentiment: item.sentiment,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
