import { NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { db, schema } from "@/lib/db";
import { desc, eq, gte } from "drizzle-orm";
import { analyzeSentiment } from "@/lib/nlp/sentiment-engine";

export async function GET(request: Request) {
  const check = await requireTier("free");
  if ("response" in check) return check.response;

  const url = new URL(request.url);
  const sourceType = url.searchParams.get("sourceType");
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const hours = parseInt(url.searchParams.get("hours") || "24");

  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  let query = db.select().from(schema.sentimentAnalyses)
    .where(gte(schema.sentimentAnalyses.createdAt, since))
    .orderBy(desc(schema.sentimentAnalyses.createdAt))
    .limit(limit);

  const results = await query;

  // Filter by sourceType in memory if specified (avoids complex query builder)
  const filtered = sourceType
    ? results.filter(r => r.sourceType === sourceType)
    : results;

  return NextResponse.json(filtered);
}

export async function POST(request: Request) {
  const check = await requireTier("operator");
  if ("response" in check) return check.response;

  try {
    const { text, sourceType, sourceTitle, sourceUrl } = await request.json();
    if (!text || !sourceType) {
      return NextResponse.json({ error: "text and sourceType required" }, { status: 400 });
    }

    const result = await analyzeSentiment(text, sourceType, sourceTitle, sourceUrl);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
