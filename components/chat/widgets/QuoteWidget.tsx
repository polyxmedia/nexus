"use client";

import { Metric } from "@/components/ui/metric";
import { Badge } from "@/components/ui/badge";

interface QuoteData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  error?: string;
}

export function QuoteWidget({ data }: { data: QuoteData }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  const positive = data.change >= 0;

  return (
    <div className="my-2 border border-navy-700 rounded bg-navy-900/80 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] uppercase tracking-wider text-navy-500 font-mono">
          Live Quote
        </span>
        <Badge variant="category">{data.symbol}</Badge>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Metric
          label="Price"
          value={data.price?.toFixed(2) ?? "N/A"}
        />
        <Metric
          label="Change"
          value={`${positive ? "+" : ""}${data.change?.toFixed(2)}`}
          change={`${positive ? "+" : ""}${data.changePercent?.toFixed(2)}%`}
          changeColor={positive ? "green" : "red"}
        />
        <Metric
          label="Volume"
          value={data.volume?.toLocaleString() ?? "N/A"}
        />
        <Metric
          label="Timestamp"
          value={new Date(data.timestamp).toLocaleTimeString()}
        />
      </div>
    </div>
  );
}
