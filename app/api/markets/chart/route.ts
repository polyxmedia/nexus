import { NextRequest, NextResponse } from "next/server";
import { getHistoricalData, getQuoteData } from "@/lib/market-data/yahoo";
import { computeTechnicalSnapshot } from "@/lib/market-data/indicators";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    const range = searchParams.get("range");
    const period = (range || searchParams.get("period") || "6mo") as "3mo" | "6mo" | "1y" | "2y" | "5y";

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

    // Compute technical snapshot from bars
    let technicals = null;
    try {
      const ohlcv = chartBars.map((b: { date: string; open: number; high: number; low: number; close: number; volume: number }) => ({
        date: b.date, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume,
      }));
      const snap = computeTechnicalSnapshot(ohlcv);
      technicals = {
        rsi: snap.rsi,
        trend: snap.trend,
        momentum: snap.momentum,
        sma20: snap.sma20,
        sma50: snap.sma50,
        macdLine: snap.macd?.line,
        macdSignal: snap.macd?.signal,
        bollingerUpper: snap.bollingerBands?.upper,
        bollingerLower: snap.bollingerBands?.lower,
        atr: snap.atr,
        volatilityRegime: snap.volatilityRegime,
      };
    } catch { /* non-critical */ }

    return NextResponse.json({ symbol, bars: chartBars, quote: quoteData, technicals });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
