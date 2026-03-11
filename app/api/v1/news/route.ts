import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/with-api-auth";
import { apiSuccess } from "@/lib/api/response";
import { getNewsFeed } from "@/lib/news/feeds";

export const GET = withApiAuth(async (request: NextRequest, ctx) => {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 100);

  try {
    const articles = await getNewsFeed(category, limit);

    return apiSuccess(
      { articles, pagination: { limit, count: articles.length } },
      { tier: ctx.tier },
    );
  } catch {
    return apiSuccess(
      { articles: [], pagination: { limit, count: 0 } },
      { tier: ctx.tier },
    );
  }
}, { minTier: "analyst", scope: "news" });
