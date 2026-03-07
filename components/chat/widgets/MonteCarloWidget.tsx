"use client";

import { Metric } from "@/components/ui/metric";
import { Badge } from "@/components/ui/badge";

interface MonteCarloData {
  symbol: string;
  currentPrice: number;
  horizonDays: number;
  simulations: number;
  percentiles: {
    p5: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
  };
  probabilities: {
    probHigher: number;
    probDown10pct: number;
    probUp10pct: number;
  };
  expectedReturn: string;
  error?: string;
}

export function MonteCarloWidget({ data }: { data: MonteCarloData }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  const p = data.percentiles;
  const prob = data.probabilities;

  return (
    <div className="my-2 border border-navy-700 rounded bg-navy-900/80 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] uppercase tracking-wider text-navy-500 font-mono">
          Monte Carlo Simulation
        </span>
        <Badge variant="category">{data.symbol}</Badge>
        <span className="text-[10px] text-navy-500 font-mono">
          {data.horizonDays}d / {data.simulations?.toLocaleString()} sims
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Metric
          label="Current Price"
          value={data.currentPrice?.toFixed(2) ?? "N/A"}
        />
        <Metric
          label="Median (P50)"
          value={p.p50?.toFixed(2) ?? "N/A"}
        />
        <Metric
          label="Expected Return"
          value={data.expectedReturn}
        />
      </div>

      <div className="grid grid-cols-5 gap-4 mt-2">
        <Metric label="P5" value={p.p5?.toFixed(2) ?? "N/A"} />
        <Metric label="P25" value={p.p25?.toFixed(2) ?? "N/A"} />
        <Metric label="P50" value={p.p50?.toFixed(2) ?? "N/A"} />
        <Metric label="P75" value={p.p75?.toFixed(2) ?? "N/A"} />
        <Metric label="P95" value={p.p95?.toFixed(2) ?? "N/A"} />
      </div>

      <div className="grid grid-cols-3 gap-4 mt-2">
        <Metric
          label="Prob Higher"
          value={`${(prob.probHigher * 100)?.toFixed(1)}%`}
          changeColor="green"
          change="upside"
        />
        <Metric
          label="Prob Down 10%+"
          value={`${(prob.probDown10pct * 100)?.toFixed(1)}%`}
          changeColor="red"
          change="risk"
        />
        <Metric
          label="Prob Up 10%+"
          value={`${(prob.probUp10pct * 100)?.toFixed(1)}%`}
          changeColor="green"
          change="opportunity"
        />
      </div>
    </div>
  );
}
