"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

function corrColor(corr: number): string {
  if (corr >= 0.7) return "#10b981";
  if (corr >= 0.3) return "#06b6d4";
  if (corr >= -0.3) return "#d4d4d4";
  if (corr >= -0.7) return "#f59e0b";
  return "#f43f5e";
}

function sigColor(sig: string | number): string {
  const s = typeof sig === "string" ? sig : sig > 2 ? "high" : sig > 1 ? "moderate" : "low";
  if (s === "high" || s === "extreme") return "#f43f5e";
  if (s === "moderate") return "#f59e0b";
  return "#06b6d4";
}

export function CorrelationWidget({ data }: { data: any }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  const { pairs = [], breaks = [], overallStress = 0, timestamp } = data;

  return (
    <div className="my-2 space-y-3">
      {/* Header */}
      <div className="border border-navy-700/40 rounded bg-navy-900/60 p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-1">
              Correlation Monitor
            </div>
            <div className="font-mono text-sm text-navy-300">{pairs.length} cross-asset pairs</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[9px] text-navy-600">Stress</div>
            <div className="font-mono text-xl font-bold" style={{ color: overallStress >= 70 ? "#f43f5e" : overallStress >= 40 ? "#f59e0b" : "#10b981" }}>
              {overallStress}
            </div>
          </div>
        </div>
        <div className="h-1.5 w-full bg-navy-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${overallStress}%`,
              backgroundColor: overallStress >= 70 ? "#f43f5e" : overallStress >= 40 ? "#f59e0b" : "#10b981",
              opacity: 0.9,
            }}
          />
        </div>
      </div>

      {/* Breaks */}
      {breaks.length > 0 && (
        <div className="border border-accent-amber/20 rounded bg-accent-amber/5 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-accent-amber/70 mb-2">
            Correlation Breaks ({breaks.length})
          </div>
          {breaks.slice(0, 5).map((b: any, i: number) => (
            <div key={i} className="py-1.5 border-b border-navy-800/30 last:border-0">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-navy-300">
                  {(b.labels || b.pair || []).join(" / ")}
                </span>
                <span className="font-mono text-[9px]" style={{ color: sigColor(b.significance) }}>
                  {typeof b.deviation === "number" ? `${b.deviation.toFixed(1)}s` : b.significance}
                </span>
              </div>
              <div className="font-mono text-[9px] text-navy-500 mt-0.5">
                current {b.current?.toFixed(2)} vs hist {b.historical?.toFixed(2)}
              </div>
              {b.interpretation && (
                <div className="font-mono text-[9px] text-navy-600 mt-0.5 truncate">{b.interpretation}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pair grid */}
      <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
        <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-2">Pairs</div>
        <div className="space-y-1.5">
          {pairs.slice(0, 8).map((p: any, i: number) => (
            <div key={i} className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-navy-300">
                {(p.labels || p.pair || []).join(" / ")}
              </span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[9px]" style={{ color: corrColor(p.current20d) }}>
                  20d: {p.current20d?.toFixed(2)}
                </span>
                <span className="font-mono text-[9px] text-navy-500">
                  60d: {p.current60d?.toFixed(2)}
                </span>
                {p.deviation != null && Math.abs(p.deviation) > 1 && (
                  <span className="font-mono text-[9px]" style={{ color: sigColor(Math.abs(p.deviation)) }}>
                    {p.deviation > 0 ? "+" : ""}{p.deviation.toFixed(1)}s
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {timestamp && (
        <div className="font-mono text-[9px] text-navy-700 px-1">
          {new Date(timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        </div>
      )}
    </div>
  );
}
