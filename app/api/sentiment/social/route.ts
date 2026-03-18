import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { getCachedSentiment, getAllCachedSentiments, getTrackedTopics, scanCustomTopic, needsScan, runSentimentScan } from "@/lib/sentiment/aggregator";

/**
 * GET /api/sentiment/social?topic=Gold
 * Returns cached social sentiment. If no topic, returns all cached.
 * If cache is empty, triggers a background scan.
 */
export async function GET(req: NextRequest) {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  const { searchParams } = new URL(req.url);
  const topic = searchParams.get("topic");

  // If cache is totally empty, trigger a scan (first load only)
  if (needsScan()) {
    // Non-blocking: kick off scan but return immediately with whatever we have
    runSentimentScan().catch(() => {});
  }

  if (topic) {
    const cached = getCachedSentiment(topic);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "Cache-Control": "private, s-maxage=60, stale-while-revalidate=300" },
      });
    }
    return NextResponse.json({ error: "No data yet for this topic. Background scan in progress." }, { status: 202 });
  }

  const all = getAllCachedSentiments();
  return NextResponse.json({
    topics: all,
    trackedTopics: getTrackedTopics(),
    count: all.length,
  }, {
    headers: { "Cache-Control": "private, s-maxage=30, stale-while-revalidate=120" },
  });
}
