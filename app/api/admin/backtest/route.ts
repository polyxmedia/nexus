import { NextRequest, NextResponse } from "next/server";
import { startBacktest, getAllBacktestRuns } from "@/lib/backtest/engine";
import type { BacktestConfig } from "@/lib/backtest/types";

const DEFAULT_INSTRUMENTS = [
  "SPY",   // S&P 500
  "QQQ",   // Nasdaq
  "IWM",   // Russell 2000
  "EFA",   // International Developed
  "GLD",   // Gold
  "USO",   // Oil
  "TLT",   // 20+ Year Treasuries
];

const FX_INSTRUMENTS = [
  "EUR/USD", "GBP/USD", "USD/JPY",
];

const CRYPTO_INSTRUMENTS = [
  "BTC", "ETH",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const config: BacktestConfig = {
      startDate: body.startDate || "2015-01-01",
      endDate: body.endDate || "2025-06-30",
      instruments: body.instruments || [
        ...DEFAULT_INSTRUMENTS,
        ...(body.includeFx ? FX_INSTRUMENTS : []),
        ...(body.includeCrypto ? CRYPTO_INSTRUMENTS : []),
      ],
      convergenceThreshold: body.convergenceThreshold || 3,
      timeframes: body.timeframes || [7, 14, 30],
      layers: body.layers || [
        "celestial",
        "hebrew",
        "islamic",
        "geopolitical",
        "economic",
        "esoteric",
      ],
      stepDays: body.stepDays || 7,
      initialCapital: body.initialCapital || 100000,
      positionSizePct: body.positionSizePct || 0.05,
      tradingCostBps: body.tradingCostBps || 10,
    };

    const id = await startBacktest(config);

    return NextResponse.json({ id, status: "started" });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const runs = await getAllBacktestRuns();

    // Return summaries (not full prediction arrays)
    const summaries = runs.map((r) => ({
      id: r.id,
      status: r.status,
      progress: r.progress,
      progressMessage: r.progressMessage,
      config: r.config,
      predictionCount: r.predictions.length,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
      error: r.error,
      hasResults: !!r.results,
    }));

    return NextResponse.json(summaries);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
