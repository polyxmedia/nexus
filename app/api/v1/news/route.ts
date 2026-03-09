import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/with-api-auth";
import { apiSuccess, apiError } from "@/lib/api/response";

// Re-use internal news fetch logic
async function fetchInternalNews(limit: number): Promise<unknown[]> {
  try {
    // Use the internal API route directly via fetch to localhost
    // This keeps the news aggregation logic in one place
    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(`${base}/api/news?limit=${limit}`, {
      headers: { cookie: "" }, // no auth needed for internal call
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.articles || data.items || [];
  } catch {
    return [];
  }
}

export const GET = withApiAuth(async (request: NextRequest, ctx) => {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 100);

  const articles = await fetchInternalNews(limit);

  return apiSuccess(
    { articles, pagination: { limit, count: articles.length } },
    { tier: ctx.tier },
  );
}, { minTier: "analyst", scope: "news" });
