export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { getCachedSentiment, getAllCachedSentiments, getTrackedTopics, needsScan, runSentimentScan } from "@/lib/sentiment/aggregator";

/**
 * GET /api/sentiment/social?topic=Gold
 * Returns cached social sentiment. If no topic, returns all cached.
 * If cache is empty, triggers a background scan.
 */
export async function GET(req: NextRequest) {
  const tierCheck = await requireTier("free");
  if ("response" in tierCheck) return tierCheck.response;

  const { searchParams } = new URL(req.url);
  const topic = searchParams.get("topic");

  // If cache is empty, run scan with a timeout guard so we don't blow Vercel limits
  if (await needsScan()) {
    try {
      await Promise.race([
        runSentimentScan(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Scan timeout")), 50_000)),
      ]);
    } catch (err) {
      console.error("[sentiment] Scan failed or timed out:", err instanceof Error ? err.message : err);
    }
  }

  if (topic) {
    const cached = await getCachedSentiment(topic);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "Cache-Control": "private, s-maxage=60, stale-while-revalidate=300" },
      });
    }
    return NextResponse.json({ error: "No data yet for this topic. Background scan in progress." }, { status: 202 });
  }

  const all = await getAllCachedSentiments();
  return NextResponse.json({
    topics: all,
    trackedTopics: getTrackedTopics(),
    count: all.length,
  }, {
    headers: { "Cache-Control": "private, s-maxage=30, stale-while-revalidate=120" },
  });
}
