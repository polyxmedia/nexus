"use client";

import { Metric } from "@/components/ui/metric";
import { Badge } from "@/components/ui/badge";

interface SnapshotData {
  symbol?: string;
  snapshot?: {
    price: number;
    rsi14: number | null;
    macd: { line: number; signal: number; histogram: number } | null;
    bollingerBands: { upper: number; middle: number; lower: number } | null;
    atr14: number | null;
    trend: string;
    momentum: string;
    volatilityRegime: string;
    sma20: number | null;
    sma50: number | null;
    sma200: number | null;
  };
  cachedAt?: string;
  error?: string;
}

const trendColor = {
  bullish: "green" as const,
  bearish: "red" as const,
  neutral: "neutral" as const,
};

export function SnapshotWidget({ data }: { data: SnapshotData }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  const s = data.snapshot!;

  return (
    <div className="my-2 border border-navy-700 rounded bg-navy-900/80 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] uppercase tracking-wider text-navy-500 font-mono">
          Technical Snapshot
        </span>
        <Badge variant="category">{data.symbol}</Badge>
        <Badge
          className={
            s.trend === "bullish"
              ? "bg-accent-emerald/20 text-accent-emerald border-accent-emerald/30"
              : s.trend === "bearish"
                ? "bg-accent-rose/20 text-accent-rose border-accent-rose/30"
                : ""
          }
        >
          {s.trend}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Metric
          label="Price"
          value={s.price?.toFixed(2) ?? "N/A"}
        />
        <Metric
          label="RSI (14)"
          value={s.rsi14?.toFixed(1) ?? "N/A"}
          change={
            s.rsi14
              ? s.rsi14 > 70
                ? "Overbought"
                : s.rsi14 < 30
                  ? "Oversold"
                  : "Normal"
              : undefined
          }
          changeColor={
            s.rsi14
              ? s.rsi14 > 70
                ? "red"
                : s.rsi14 < 30
                  ? "green"
                  : "neutral"
              : "neutral"
          }
        />
        <Metric
          label="ATR (14)"
          value={s.atr14?.toFixed(2) ?? "N/A"}
        />
      </div>

      <div className="grid grid-cols-3 gap-4 mt-2">
        <Metric
          label="MACD"
          value={s.macd?.histogram?.toFixed(3) ?? "N/A"}
          change={
            s.macd
              ? s.macd.histogram > 0
                ? "Bullish"
                : "Bearish"
              : undefined
          }
          changeColor={
            s.macd
              ? s.macd.histogram > 0
                ? "green"
                : "red"
              : "neutral"
          }
        />
        <Metric
          label="Bollinger"
          value={
            s.bollingerBands
              ? `${s.bollingerBands.lower.toFixed(0)}-${s.bollingerBands.upper.toFixed(0)}`
              : "N/A"
          }
        />
        <Metric label="Vol Regime" value={s.volatilityRegime} />
      </div>

      {data.cachedAt && (
        <div className="mt-2 text-[10px] text-navy-600">
          Cached: {new Date(data.cachedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}
