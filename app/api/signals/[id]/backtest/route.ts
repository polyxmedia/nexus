import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getDailySeries } from "@/lib/market-data/alpha-vantage";

// Map market sectors to sector ETF tickers
const SECTOR_ETF_MAP: Record<string, { ticker: string; label: string }> = {
  technology: { ticker: "XLK", label: "Tech (XLK)" },
  semiconductors: { ticker: "SMH", label: "Semis (SMH)" },
  energy: { ticker: "XLE", label: "Energy (XLE)" },
  defense: { ticker: "ITA", label: "Defense (ITA)" },
  finance: { ticker: "XLF", label: "Finance (XLF)" },
  airlines: { ticker: "JETS", label: "Airlines (JETS)" },
  shipping: { ticker: "SLX", label: "Shipping (SLX)" },
  consumer: { ticker: "XLY", label: "Consumer (XLY)" },
  transportation: { ticker: "IYT", label: "Transport (IYT)" },
  trade: { ticker: "EFA", label: "Intl (EFA)" },
};

interface BacktestSeries {
  ticker: string;
  label: string;
  data: Array<{
    date: string;
    close: number;
    normalizedReturn: number; // % change from signal date
  }>;
  signalDatePrice: number | null;
  changes: {
    d7: number | null;
    d14: number | null;
    d30: number | null;
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get signal
    const signal = await db
      .select()
      .from(signals)
      .where(eq(signals.uuid, id))
      .limit(1);

    if (signal.length === 0) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }

    const s = signal[0];
    const signalDate = new Date(s.date);

    // Only backtest past signals
    if (signalDate > new Date()) {
      return NextResponse.json({ error: "Signal is in the future" }, { status: 400 });
    }

    const sectors: string[] = s.marketSectors ? JSON.parse(s.marketSectors) : [];
    if (sectors.length === 0) {
      return NextResponse.json({ error: "No market sectors to backtest" }, { status: 400 });
    }

    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Alpha Vantage API key not configured" }, { status: 500 });
    }

    // Get ETF tickers for the signal's sectors (max 3 to avoid rate limits)
    const etfEntries = sectors
      .map((sector) => SECTOR_ETF_MAP[sector])
      .filter(Boolean)
      .slice(0, 3);

    if (etfEntries.length === 0) {
      return NextResponse.json({ error: "No matching ETFs for sectors" }, { status: 400 });
    }

    const signalDateStr = s.date.split("T")[0];

    // Fetch price data for each ETF
    const results: BacktestSeries[] = [];

    for (const etf of etfEntries) {
      try {
        const bars = await getDailySeries(etf.ticker, apiKey, "full");

        // Find bars +/- 30 trading days around signal date
        const signalIdx = bars.findIndex((b) => b.date >= signalDateStr);
        if (signalIdx === -1) continue;

        const startIdx = Math.max(0, signalIdx - 30);
        const endIdx = Math.min(bars.length - 1, signalIdx + 30);
        const window = bars.slice(startIdx, endIdx + 1);

        // Find closest bar to signal date
        const signalBar = bars.find((b) => b.date >= signalDateStr);
        const signalPrice = signalBar?.close ?? null;

        if (!signalPrice) continue;

        const data = window.map((bar) => ({
          date: bar.date,
          close: bar.close,
          normalizedReturn:
            ((bar.close - signalPrice) / signalPrice) * 100,
        }));

        // Calculate changes at specific intervals
        const getChangeAtOffset = (offset: number): number | null => {
          const targetIdx = signalIdx + offset;
          if (targetIdx >= 0 && targetIdx < bars.length) {
            return (
              ((bars[targetIdx].close - signalPrice) / signalPrice) * 100
            );
          }
          return null;
        };

        results.push({
          ticker: etf.ticker,
          label: etf.label,
          data,
          signalDatePrice: signalPrice,
          changes: {
            d7: getChangeAtOffset(7),
            d14: getChangeAtOffset(14),
            d30: getChangeAtOffset(30),
          },
        });
      } catch {
        // Skip this ETF if fetch fails
        continue;
      }
    }

    return NextResponse.json({
      signalDate: signalDateStr,
      series: results,
    });
  } catch (error) {
    console.error("Backtest error:", error);
    return NextResponse.json({ error: "Backtest failed" }, { status: 500 });
  }
}
