/**
 * Public chart data endpoint for blog widget embeds.
 * Returns daily OHLCV bars for a given symbol, limited to what's needed for a chart.
 * No auth required - data is publicly available market prices.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDailySeries } from "@/lib/market-data/provider";

const PERIOD_DAYS: Record<string, number> = {
  "1M": 22,
  "3M": 66,
  "6M": 132,
  "1Y": 252,
  "5Y": 1260,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol")?.toUpperCase();
    const period = searchParams.get("period") || "3M";

    if (!symbol || symbol.length > 10) {
      return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
    }

    const days = PERIOD_DAYS[period] || 66;
    const full = days > 132;
    const bars = await getDailySeries(symbol, undefined, full ? "full" : "compact");

    const trimmed = bars.slice(0, days).reverse().map((b) => ({
      d: b.date,
      c: b.close,
      h: b.high,
      l: b.low,
      v: b.volume,
    }));

    return NextResponse.json({ bars: trimmed }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
