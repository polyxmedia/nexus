"use client";

import dynamic from "next/dynamic";
import { Metric } from "@/components/ui/metric";
import { Badge } from "@/components/ui/badge";
import { CollapsibleCard } from "./CollapsibleCard";

const CandlestickChart = dynamic(
  () => import("@/components/charts/candlestick-chart"),
  { ssr: false, loading: () => <div className="h-[300px] bg-navy-900/40 animate-pulse rounded" /> }
);

interface PriceHistoryData {
  symbol: string;
  bars: number;
  latest: { date: string; open: number; high: number; low: number; close: number; volume: number };
  oldest: { date: string; open: number; high: number; low: number; close: number; volume: number };
  stats: {
    avgDailyReturn: string | number;
    dailyVolatility: string | number;
    annualizedVol: string | number;
    high52w: number;
    low52w: number;
    rangePercent: string | number;
  };
  indicators?: {
    rsi14: number | null;
    macd: { line: number; signal: number; histogram: number } | null;
    bollingerBands: { upper: number; middle: number; lower: number } | null;
    atr14: number | null;
    sma20: number | null;
    sma50: number | null;
    sma200: number | null;
    trend: string;
    momentum: string;
    volatilityRegime: string;
  };
  chartBars?: Array<{ time: string; open: number; high: number; low: number; close: number; volume?: number }>;
  recentBars: Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }>;
  error?: string;
}

function num(v: unknown): number {
  if (typeof v === "string") {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function fmt(v: unknown, decimals = 2): string {
  return num(v).toFixed(decimals);
}

const trendColors: Record<string, string> = {
  bullish: "bg-accent-emerald/20 text-accent-emerald border-accent-emerald/30",
  bearish: "bg-accent-rose/20 text-accent-rose border-accent-rose/30",
  neutral: "",
};

export function PriceHistoryWidget({ data }: { data: PriceHistoryData }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  const s = data.stats || {} as PriceHistoryData["stats"];
  const ind = data.indicators;
  const hasChart = data.chartBars && data.chartBars.length > 0;

  return (
    <CollapsibleCard
      title="Price History & Technical Analysis"
      badge={
        <div className="flex items-center gap-2">
          <Badge variant="category">{data.symbol}</Badge>
          <span className="text-[10px] text-navy-500 font-mono">{data.bars} bars</span>
          {ind && (
            <Badge className={trendColors[ind.trend] || ""}>{ind.trend}</Badge>
          )}
        </div>
      }
    >
      {/* Chart */}
      {hasChart && (
        <div className="mb-3 -mx-4 border-b border-navy-700/30">
          <CandlestickChart
            data={data.chartBars!}
            symbol={data.symbol}
            height={300}
            showVolume
          />
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Metric label="Latest Close" value={fmt(data.latest?.close)} />
        <Metric label="52W High" value={fmt(s.high52w)} />
        <Metric label="52W Low" value={fmt(s.low52w)} />
      </div>

      <div className="grid grid-cols-3 gap-4 mt-2">
        <Metric label="Annualized Vol" value={String(s.annualizedVol)} />
        <Metric
          label="Avg Daily Return"
          value={String(s.avgDailyReturn)}
          changeColor={num(s.avgDailyReturn) >= 0 ? "green" : "red"}
          change={num(s.avgDailyReturn) >= 0 ? "Positive" : "Negative"}
        />
        <Metric label="52W Range %" value={String(s.rangePercent)} />
      </div>

      {/* Technical Indicators */}
      {ind && (
        <>
          <div className="border-t border-navy-700/30 mt-3 pt-3">
            <span className="text-[10px] uppercase tracking-wider text-navy-500 font-mono">
              Technical Indicators
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-2">
            <Metric
              label="RSI (14)"
              value={ind.rsi14?.toFixed(1) ?? "N/A"}
              change={
                ind.rsi14
                  ? ind.rsi14 > 70 ? "Overbought"
                  : ind.rsi14 < 30 ? "Oversold"
                  : "Normal"
                  : undefined
              }
              changeColor={
                ind.rsi14
                  ? ind.rsi14 > 70 ? "red"
                  : ind.rsi14 < 30 ? "green"
                  : "neutral"
                  : "neutral"
              }
            />
            <Metric
              label="MACD"
              value={ind.macd?.histogram?.toFixed(3) ?? "N/A"}
              change={
                ind.macd
                  ? ind.macd.histogram > 0 ? "Bullish" : "Bearish"
                  : undefined
              }
              changeColor={
                ind.macd
                  ? ind.macd.histogram > 0 ? "green" : "red"
                  : "neutral"
              }
            />
            <Metric
              label="ATR (14)"
              value={ind.atr14?.toFixed(2) ?? "N/A"}
            />
          </div>
          <div className="grid grid-cols-3 gap-4 mt-2">
            <Metric
              label="Bollinger"
              value={
                ind.bollingerBands
                  ? `${ind.bollingerBands.lower.toFixed(0)}-${ind.bollingerBands.upper.toFixed(0)}`
                  : "N/A"
              }
            />
            <Metric label="Momentum" value={ind.momentum} />
            <Metric label="Vol Regime" value={ind.volatilityRegime} />
          </div>
          {(ind.sma20 || ind.sma50 || ind.sma200) && (
            <div className="grid grid-cols-3 gap-4 mt-2">
              <Metric label="SMA 20" value={ind.sma20?.toFixed(2) ?? "N/A"} />
              <Metric label="SMA 50" value={ind.sma50?.toFixed(2) ?? "N/A"} />
              <Metric label="SMA 200" value={ind.sma200?.toFixed(2) ?? "N/A"} />
            </div>
          )}
        </>
      )}
    </CollapsibleCard>
  );
}
