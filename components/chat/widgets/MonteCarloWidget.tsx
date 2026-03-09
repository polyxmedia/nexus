"use client";

import { useEffect, useRef } from "react";
import { Metric } from "@/components/ui/metric";
import { Badge } from "@/components/ui/badge";
import { CollapsibleCard } from "./CollapsibleCard";

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
    probHigher: number | string;
    probDown10pct: number | string;
    probUp10pct: number | string;
  };
  expectedReturn: string | number;
  distribution?: Array<{ price: number; count: number }>;
  error?: string;
}

function pctVal(v: number | string): string {
  if (typeof v === "string") return v.includes("%") ? v : `${v}%`;
  return `${(v * 100).toFixed(1)}%`;
}

function DistributionChart({
  distribution,
  currentPrice,
  p50,
}: {
  distribution: Array<{ price: number; count: number }>;
  currentPrice: number;
  p50: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !distribution.length) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const maxCount = Math.max(...distribution.map(d => d.count));
    const padding = { top: 20, right: 12, bottom: 30, left: 12 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    const barW = chartW / distribution.length - 1;

    ctx.clearRect(0, 0, w, h);

    // Draw bars
    distribution.forEach((d, i) => {
      const barH = (d.count / maxCount) * chartH;
      const x = padding.left + i * (barW + 1);
      const y = padding.top + chartH - barH;

      const isAbove = d.price >= currentPrice;
      ctx.fillStyle = isAbove ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.4)";
      ctx.fillRect(x, y, barW, barH);
    });

    // Current price line
    const priceMin = distribution[0].price;
    const priceMax = distribution[distribution.length - 1].price;
    const priceRange = priceMax - priceMin;

    const drawPriceLine = (price: number, color: string, label: string) => {
      const pct = (price - priceMin) / priceRange;
      const x = padding.left + pct * chartW;
      if (x < padding.left || x > padding.left + chartW) return;

      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartH);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = color;
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(label, x, padding.top - 4);
    };

    drawPriceLine(currentPrice, "#06b6d4", `Now $${currentPrice.toFixed(0)}`);
    drawPriceLine(p50, "#f59e0b", `P50 $${p50.toFixed(0)}`);

    // Price labels on X axis
    ctx.fillStyle = "#6b7280";
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    const labelCount = 5;
    for (let i = 0; i <= labelCount; i++) {
      const pct = i / labelCount;
      const price = priceMin + pct * priceRange;
      const x = padding.left + pct * chartW;
      ctx.fillText(`$${price.toFixed(0)}`, x, h - 8);
    }
  }, [distribution, currentPrice, p50]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      style={{ height: 180 }}
    />
  );
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
  const hasDist = data.distribution && data.distribution.length > 0;

  return (
    <CollapsibleCard
      title="Monte Carlo Simulation"
      badge={
        <div className="flex items-center gap-2">
          <Badge variant="category">{data.symbol}</Badge>
          <span className="text-[10px] text-navy-500 font-mono">
            {data.horizonDays}d / {data.simulations?.toLocaleString()} sims
          </span>
        </div>
      }
    >
      {/* Distribution chart */}
      {hasDist && (
        <div className="mb-3 -mx-4 border-b border-navy-700/30 px-2">
          <DistributionChart
            distribution={data.distribution!}
            currentPrice={data.currentPrice}
            p50={p.p50}
          />
        </div>
      )}

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
          value={String(data.expectedReturn)}
        />
      </div>

      {/* Percentile range visualization */}
      <div className="mt-3 mb-1">
        <div className="flex items-center justify-between text-[9px] font-mono text-navy-500 mb-1">
          <span>P5: ${p.p5?.toFixed(0)}</span>
          <span>P25: ${p.p25?.toFixed(0)}</span>
          <span>P50: ${p.p50?.toFixed(0)}</span>
          <span>P75: ${p.p75?.toFixed(0)}</span>
          <span>P95: ${p.p95?.toFixed(0)}</span>
        </div>
        <div className="relative h-2 rounded-full bg-navy-800 overflow-hidden">
          {/* P5-P95 range */}
          <div className="absolute inset-y-0 bg-navy-600/40 rounded-full" style={{ left: "0%", right: "0%" }} />
          {/* P25-P75 range */}
          <div className="absolute inset-y-0 bg-accent-cyan/20 rounded-full" style={{
            left: `${((p.p25 - p.p5) / (p.p95 - p.p5)) * 100}%`,
            width: `${((p.p75 - p.p25) / (p.p95 - p.p5)) * 100}%`,
          }} />
          {/* Current price marker */}
          <div className="absolute inset-y-0 w-0.5 bg-accent-cyan" style={{
            left: `${Math.max(0, Math.min(100, ((data.currentPrice - p.p5) / (p.p95 - p.p5)) * 100))}%`,
          }} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-2">
        <Metric
          label="Prob Higher"
          value={pctVal(prob.probHigher)}
          changeColor="green"
          change="upside"
        />
        <Metric
          label="Prob Down 10%+"
          value={pctVal(prob.probDown10pct)}
          changeColor="red"
          change="risk"
        />
        <Metric
          label="Prob Up 10%+"
          value={pctVal(prob.probUp10pct)}
          changeColor="green"
          change="opportunity"
        />
      </div>
    </CollapsibleCard>
  );
}
