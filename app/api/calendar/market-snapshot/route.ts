import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { requireTier } from "@/lib/auth/require-tier";

const yf = new YahooFinance();

const SYMBOLS: Record<string, string> = {
  SPY: "SPY",
  QQQ: "QQQ",
  VIX: "^VIX",
  GOLD: "GC=F",
  OIL: "CL=F",
  DXY: "DX-Y.NYB",
};

export async function GET(request: NextRequest) {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "date parameter required (YYYY-MM-DD)" }, { status: 400 });
    }

    const dateStr: string = date;
    const targetDate = new Date(dateStr + "T12:00:00Z");
    const period1 = new Date(targetDate);
    period1.setDate(period1.getDate() - 5);
    const period2 = new Date(targetDate);
    period2.setDate(period2.getDate() + 2);

    const markets: Record<string, { close: number; change: number; changePercent: number }> = {};

    const results = await Promise.allSettled(
      Object.entries(SYMBOLS).map(async ([label, ticker]) => {
        const result = await yf.chart(ticker, {
          period1,
          period2,
          interval: "1d",
        });

        const quotes = result.quotes as { date: Date; close: number | null }[];
        if (!quotes || quotes.length === 0) return { label, data: null };

        // Find the bar closest to target date (on or before)
        let targetBar: { close: number } | null = null;
        let prevBar: { close: number } | null = null;

        for (let i = 0; i < quotes.length; i++) {
          const q = quotes[i];
          if (!q.close) continue;
          const qDate = new Date(q.date).toISOString().split("T")[0];
          if (qDate <= dateStr) {
            prevBar = targetBar;
            targetBar = { close: q.close };
          }
        }

        if (!targetBar) return { label, data: null };

        const change = prevBar ? targetBar.close - prevBar.close : 0;
        const changePercent = prevBar && prevBar.close > 0 ? (change / prevBar.close) * 100 : 0;

        return {
          label,
          data: {
            close: targetBar.close,
            change,
            changePercent,
          },
        };
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value.data) {
        markets[r.value.label] = r.value.data;
      }
    }

    if (Object.keys(markets).length === 0) {
      return NextResponse.json({ error: "No market data for this date" }, { status: 404 });
    }

    return NextResponse.json({ date, markets });
  } catch (error) {
    console.error("Market snapshot error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
