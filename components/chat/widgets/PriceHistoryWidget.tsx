"use client";

import { Metric } from "@/components/ui/metric";
import { Badge } from "@/components/ui/badge";

interface PriceHistoryData {
  symbol: string;
  bars: number;
  latest: { date: string; open: number; high: number; low: number; close: number; volume: number };
  oldest: { date: string; open: number; high: number; low: number; close: number; volume: number };
  stats: {
    avgDailyReturn: number;
    dailyVolatility: number;
    annualizedVol: number;
    high52w: number;
    low52w: number;
    rangePercent: number;
  };
  recentBars: Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }>;
  error?: string;
}

function num(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function fmt(v: unknown, decimals = 2): string {
  const n = num(v);
  return n.toFixed(decimals);
}

export function PriceHistoryWidget({ data }: { data: PriceHistoryData }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  const s = data.stats || {} as PriceHistoryData["stats"];
  const avgReturn = num(s.avgDailyReturn);

  return (
    <div className="my-2 border border-navy-700 rounded bg-navy-900/80 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] uppercase tracking-wider text-navy-500 font-mono">
          Price History
        </span>
        <Badge variant="category">{data.symbol}</Badge>
        <span className="text-[10px] text-navy-500 font-mono">
          {data.bars} bars
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Metric
          label="Latest Close"
          value={fmt(data.latest?.close)}
        />
        <Metric
          label="52W High"
          value={fmt(s.high52w)}
        />
        <Metric
          label="52W Low"
          value={fmt(s.low52w)}
        />
      </div>

      <div className="grid grid-cols-3 gap-4 mt-2">
        <Metric
          label="Annualized Vol"
          value={`${fmt(num(s.annualizedVol) * 100, 1)}%`}
        />
        <Metric
          label="Avg Daily Return"
          value={`${fmt(avgReturn * 100, 3)}%`}
          changeColor={avgReturn >= 0 ? "green" : "red"}
          change={avgReturn >= 0 ? "Positive" : "Negative"}
        />
        <Metric
          label="52W Range %"
          value={`${fmt(s.rangePercent, 1)}%`}
        />
      </div>
    </div>
  );
}
