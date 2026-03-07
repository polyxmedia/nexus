import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { getQuote, getDailySeries } from "@/lib/market-data/alpha-vantage";
import { computeTechnicalSnapshot } from "@/lib/market-data/indicators";
import { getMarketSentiment } from "@/lib/market-data/sentiment";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const symbol = searchParams.get("symbol");

    const apiKeySetting = db.select().from(schema.settings).where(eq(schema.settings.key, "alpha_vantage_api_key"));

    const apiKey = apiKeySetting?.value || process.env.ALPHA_VANTAGE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Alpha Vantage API key not configured" },
        { status: 400 }
      );
    }

    if (type === "sentiment") {
      const sentiment = await getMarketSentiment(apiKey);
      return NextResponse.json({ sentiment });
    }

    if (type === "chart") {
      if (!symbol) {
        return NextResponse.json({ error: "symbol parameter required" }, { status: 400 });
      }
      const full = searchParams.get("full") === "true";
      const dailyData = await getDailySeries(symbol, apiKey, full ? "full" : "compact");
      return NextResponse.json({ bars: dailyData });
    }

    if (type === "snapshot") {
      if (!symbol) {
        return NextResponse.json(
          { error: "symbol parameter required for snapshot type" },
          { status: 400 }
        );
      }

      const dailyData = await getDailySeries(symbol, apiKey);
      const ohlcv = dailyData.map((d) => ({
        date: d.date,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume,
      }));
      const snapshot = computeTechnicalSnapshot(symbol, ohlcv);

      // Cache it
      db.insert(schema.marketSnapshots).values({ symbol, snapshot: JSON.stringify(snapshot) });

      return NextResponse.json({ snapshot });
    }

    // Default: simple quote
    if (!symbol) {
      return NextResponse.json(
        { error: "symbol query parameter is required" },
        { status: 400 }
      );
    }

    const quote = await getQuote(symbol, apiKey);
    return NextResponse.json({ quote });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
