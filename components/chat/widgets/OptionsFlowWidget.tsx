"use client";

import { Metric } from "@/components/ui/metric";
import { Badge } from "@/components/ui/badge";

interface OptionsFlowData {
  putCallRatio?: {
    date: string;
    totalPCRatio: number;
    equityPCRatio: number;
    indexPCRatio: number;
    interpretation: string;
    signal: string;
  };
  symbolMetrics?: Record<string, unknown>;
  error?: string;
}

const signalColor = (signal: string) => {
  const s = signal?.toLowerCase();
  if (s?.includes("bullish")) return "green" as const;
  if (s?.includes("bearish")) return "red" as const;
  return "neutral" as const;
};

const signalBadgeClass = (signal: string) => {
  const s = signal?.toLowerCase();
  if (s?.includes("bullish"))
    return "bg-accent-emerald/20 text-accent-emerald border-accent-emerald/30";
  if (s?.includes("bearish"))
    return "bg-accent-rose/20 text-accent-rose border-accent-rose/30";
  return "";
};

export function OptionsFlowWidget({ data }: { data: OptionsFlowData }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  const pcr = data.putCallRatio;
  if (!pcr) return null;

  return (
    <div className="my-2 border border-navy-700 rounded bg-navy-900/80 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] uppercase tracking-wider text-navy-500 font-mono">
          Options Flow
        </span>
        <Badge variant="category">{pcr.date}</Badge>
        {pcr.signal && (
          <Badge className={signalBadgeClass(pcr.signal)}>
            {pcr.signal}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Metric
          label="Total P/C Ratio"
          value={pcr.totalPCRatio?.toFixed(2) ?? "N/A"}
          change={
            pcr.totalPCRatio > 1
              ? "Put-heavy"
              : pcr.totalPCRatio < 0.7
                ? "Call-heavy"
                : "Balanced"
          }
          changeColor={signalColor(pcr.signal)}
        />
        <Metric
          label="Equity P/C"
          value={pcr.equityPCRatio?.toFixed(2) ?? "N/A"}
        />
        <Metric
          label="Index P/C"
          value={pcr.indexPCRatio?.toFixed(2) ?? "N/A"}
        />
      </div>

      {pcr.interpretation && (
        <div className="mt-3 text-xs text-navy-300 leading-relaxed">
          {pcr.interpretation}
        </div>
      )}

      {data.symbolMetrics && Object.keys(data.symbolMetrics).length > 0 && (
        <div className="mt-3 border-t border-navy-700 pt-3">
          <span className="text-[10px] uppercase tracking-wider text-navy-500 font-mono">
            Symbol Metrics
          </span>
          <div className="grid grid-cols-3 gap-4 mt-1">
            {Object.entries(data.symbolMetrics).map(([key, val]) => (
              <Metric
                key={key}
                label={key}
                value={
                  typeof val === "number"
                    ? val.toFixed(2)
                    : String(val ?? "N/A")
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
