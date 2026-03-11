import { NextRequest, NextResponse } from "next/server";
import { getPutCallRatio, estimateOptionsMetrics } from "@/lib/market-data/options-flow";
import { getDailySeries, getQuote } from "@/lib/market-data/provider";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requireTier } from "@/lib/auth/require-tier";

export async function GET(req: NextRequest) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  const action = req.nextUrl.searchParams.get("action");
  const symbol = req.nextUrl.searchParams.get("symbol");

  try {
    if (action === "pcr" || !action) {
      const pcr = await getPutCallRatio();
      return NextResponse.json(pcr || { error: "Could not fetch put/call data" });
    }

    if (action === "activity" && symbol) {
      const apiKeySetting = await db.select().from(schema.settings)
        .where(eq(schema.settings.key, "alpha_vantage_api_key"));
      const apiKey = apiKeySetting?.value || process.env.ALPHA_VANTAGE_API_KEY;
      if (!apiKey) return NextResponse.json({ error: "Alpha Vantage key not configured" }, { status: 500 });

      const [quote, bars] = await Promise.all([
        getQuote(symbol.toUpperCase(), apiKey),
        getDailySeries(symbol.toUpperCase(), apiKey, "compact"),
      ]);

      const closes = bars.map(b => b.close);
      const returns = closes.slice(1).map((c, i) => (c - closes[i]) / closes[i]);
      const volumes = bars.map(b => b.volume);
      const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;

      const metrics = estimateOptionsMetrics(
        symbol.toUpperCase(),
        quote.price,
        returns,
        quote.volume,
        avgVolume
      );

      return NextResponse.json(metrics);
    }

    return NextResponse.json({ error: "Invalid action. Use ?action=pcr or ?action=activity&symbol=SPY" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
