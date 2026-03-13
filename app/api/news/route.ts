import { NextRequest, NextResponse } from "next/server";
import { getCachedNews } from "@/lib/news/sync";
import { requireTier } from "@/lib/auth/require-tier";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const limit = parseInt(searchParams.get("limit") || "30", 10);

    const articles = await getCachedNews(category, limit);

    return NextResponse.json(articles, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
