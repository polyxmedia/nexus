"use client";

import { Metric } from "@/components/ui/metric";
import { Badge } from "@/components/ui/badge";
import { CollapsibleCard } from "./CollapsibleCard";

interface QuoteData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  currency?: string;
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
  const currencyLabel = data.currency === "GBp" ? "p" : data.currency === "GBP" ? "£" : data.currency === "USD" ? "$" : data.currency === "EUR" ? "€" : "";
  const priceDisplay = data.currency === "GBp"
    ? `${data.price?.toFixed(2)}p`
    : `${currencyLabel}${data.price?.toFixed(2) ?? "N/A"}`;

  return (
    <CollapsibleCard
      title="Live Quote"
      badge={<Badge variant="category">{data.symbol}</Badge>}
    >
      <div className="grid grid-cols-4 gap-4">
        <Metric
          label="Price"
          value={priceDisplay}
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
    </CollapsibleCard>
  );
}
