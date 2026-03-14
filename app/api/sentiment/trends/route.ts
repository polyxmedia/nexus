import { NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { getAggregatedSentiment } from "@/lib/nlp/batch-analyzer";
import { trackToneShift, getSentimentTimeline } from "@/lib/nlp/tone-tracker";

export async function GET(request: Request) {
  const check = await requireTier("free");
  if ("response" in check) return check.response;

  const url = new URL(request.url);
  const entity = url.searchParams.get("entity");
  const days = parseInt(url.searchParams.get("days") || "7");
  const hours = parseInt(url.searchParams.get("hours") || "24");

  if (entity) {
    const [toneShift, timeline] = await Promise.all([
      trackToneShift(entity, days),
      getSentimentTimeline(entity, days),
    ]);
    return NextResponse.json({ entity, toneShift, timeline });
  }

  const aggregated = await getAggregatedSentiment(undefined, hours);
  return NextResponse.json(aggregated);
}
