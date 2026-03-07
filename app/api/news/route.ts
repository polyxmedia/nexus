import { NextRequest, NextResponse } from "next/server";
import { getNewsFeed } from "@/lib/news/feeds";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const limit = parseInt(searchParams.get("limit") || "30", 10);

    const articles = await getNewsFeed(category, limit);

    return NextResponse.json(articles);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
