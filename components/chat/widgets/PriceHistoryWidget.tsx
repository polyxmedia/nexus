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

export function PriceHistoryWidget({ data }: { data: PriceHistoryData }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  const s = data.stats;

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
          value={data.latest?.close?.toFixed(2) ?? "N/A"}
        />
        <Metric
          label="52W High"
          value={s.high52w?.toFixed(2) ?? "N/A"}
        />
        <Metric
          label="52W Low"
          value={s.low52w?.toFixed(2) ?? "N/A"}
        />
      </div>

      <div className="grid grid-cols-3 gap-4 mt-2">
        <Metric
          label="Annualized Vol"
          value={`${(s.annualizedVol * 100)?.toFixed(1)}%`}
        />
        <Metric
          label="Avg Daily Return"
          value={`${(s.avgDailyReturn * 100)?.toFixed(3)}%`}
          changeColor={s.avgDailyReturn >= 0 ? "green" : "red"}
          change={s.avgDailyReturn >= 0 ? "Positive" : "Negative"}
        />
        <Metric
          label="52W Range %"
          value={`${s.rangePercent?.toFixed(1)}%`}
        />
      </div>
    </div>
  );
}
