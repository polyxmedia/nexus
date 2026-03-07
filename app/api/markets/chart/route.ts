import { NextRequest, NextResponse } from "next/server";
import { getHistoricalData, getQuoteData } from "@/lib/market-data/yahoo";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    const period = (searchParams.get("period") || "6mo") as "3mo" | "6mo" | "1y" | "2y" | "5y";

    if (!symbol) {
      return NextResponse.json({ error: "symbol parameter required" }, { status: 400 });
    }

    const [bars, quote] = await Promise.allSettled([
      getHistoricalData(symbol, period),
      getQuoteData(symbol),
    ]);

    const chartBars = bars.status === "fulfilled" ? bars.value : [];
    const quoteData = quote.status === "fulfilled" ? quote.value : null;

    if (chartBars.length === 0) {
      const errorMsg = bars.status === "rejected" ? bars.reason?.message : "No data available";
      return NextResponse.json({ error: errorMsg }, { status: 404 });
    }

    return NextResponse.json({ symbol, bars: chartBars, quote: quoteData });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
