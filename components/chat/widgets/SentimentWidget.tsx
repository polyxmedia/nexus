"use client";

import { Metric } from "@/components/ui/metric";

interface SentimentData {
  vixLevel?: number | null;
  vixRegime?: string | null;
  fearGreedComposite?: number;
  fearGreedLabel?: string;
  sectorRotation?: Array<{
    sector: string;
    etf: string;
    relativeStrength: number;
    trend: string;
  }>;
  thesisGeneratedAt?: string;
  error?: string;
}

const labelColor: Record<string, "green" | "red" | "neutral"> = {
  extreme_greed: "green",
  greed: "green",
  neutral: "neutral",
  fear: "red",
  extreme_fear: "red",
};

export function SentimentWidget({ data }: { data: SentimentData }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  return (
    <div className="my-2 border border-navy-700 rounded bg-navy-900/80 p-4">
      <div className="text-[10px] uppercase tracking-wider text-navy-500 font-mono mb-3">
        Market Sentiment
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Metric
          label="VIX"
          value={data.vixLevel?.toFixed(1) ?? "N/A"}
          change={data.vixRegime ?? undefined}
          changeColor={
            data.vixRegime === "panic" || data.vixRegime === "elevated"
              ? "red"
              : data.vixRegime === "complacent"
                ? "green"
                : "neutral"
          }
        />
        <Metric
          label="Fear & Greed"
          value={data.fearGreedComposite ?? "N/A"}
          change={data.fearGreedLabel?.replace("_", " ") ?? undefined}
          changeColor={
            labelColor[data.fearGreedLabel ?? "neutral"] ?? "neutral"
          }
        />
        <Metric
          label="Sectors Tracked"
          value={data.sectorRotation?.length ?? 0}
        />
      </div>

      {data.sectorRotation && data.sectorRotation.length > 0 && (
        <div className="mt-3 space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-navy-500 mb-1">
            Sector Rotation
          </div>
          {data.sectorRotation.map((s) => (
            <div
              key={s.etf}
              className="flex items-center justify-between text-xs font-mono"
            >
              <span className="text-navy-300">{s.sector}</span>
              <span
                className={
                  s.relativeStrength > 0
                    ? "text-accent-emerald"
                    : s.relativeStrength < 0
                      ? "text-accent-rose"
                      : "text-navy-400"
                }
              >
                {s.relativeStrength > 0 ? "+" : ""}
                {s.relativeStrength.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {data.thesisGeneratedAt && (
        <div className="mt-2 text-[10px] text-navy-600">
          From thesis: {new Date(data.thesisGeneratedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}
