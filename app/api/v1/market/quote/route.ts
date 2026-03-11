import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/with-api-auth";
import { apiSuccess, apiError } from "@/lib/api/response";
import { getQuote } from "@/lib/market-data/provider";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

async function getAlphaVantageKey(): Promise<string> {
  const rows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "alpha_vantage_api_key"));
  return rows[0]?.value || process.env.ALPHA_VANTAGE_API_KEY || "";
}

export const GET = withApiAuth(async (request: NextRequest, ctx) => {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.toUpperCase();

  if (!symbol || symbol.length > 10) {
    return apiError("invalid_symbol", "A valid symbol parameter is required", 400);
  }

  // Sanitize: only alphanumeric and common delimiters
  if (!/^[A-Z0-9.=^-]+$/.test(symbol)) {
    return apiError("invalid_symbol", "Symbol contains invalid characters", 400);
  }

  const apiKey = await getAlphaVantageKey();
  if (!apiKey) {
    return apiError("config_error", "Market data API key not configured", 503);
  }

  try {
    const quote = await getQuote(symbol, apiKey);
    if (!quote) {
      return apiError("quote_not_found", `No quote data for ${symbol}`, 404);
    }
    return apiSuccess({ symbol, quote }, { tier: ctx.tier });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch quote";
    if (message.includes("rate limit")) {
      return apiError("rate_limited", "Market data provider rate limit reached. Try again shortly.", 429);
    }
    return apiError("quote_not_found", `No quote data for ${symbol}`, 404);
  }
}, { minTier: "analyst", scope: "market" });
