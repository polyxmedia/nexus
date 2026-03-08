"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

function signalColor(signal: string): string {
  if (signal === "contrarian_bullish") return "#10b981";
  if (signal === "contrarian_bearish") return "#f43f5e";
  return "#f59e0b";
}

export function ShortInterestWidget({ data }: { data: any }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  const {
    entries = [],
    bySector = [],
    aggregateRatio = 0,
    aggregateSignal = "neutral",
    zscore52w = 0,
  } = data;

  return (
    <div className="my-2 space-y-3">
      {/* Header */}
      <div className="border border-navy-700/40 rounded bg-navy-900/60 p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-1">
              Short Interest Monitor
            </div>
            <div className="font-mono text-xl font-bold" style={{ color: signalColor(aggregateSignal) }}>
              {aggregateSignal.replace(/_/g, " ")}
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[9px] text-navy-600">Aggregate Ratio</div>
            <div className="font-mono text-lg font-bold text-navy-300">{aggregateRatio.toFixed(2)}</div>
            <div className="font-mono text-[9px]" style={{ color: Math.abs(zscore52w) > 1.5 ? "#f59e0b" : "#06b6d4" }}>
              z: {zscore52w >= 0 ? "+" : ""}{zscore52w.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* By Sector */}
      {bySector.length > 0 && (
        <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-2">
            By Sector
          </div>
          <div className="space-y-2">
            {bySector.map((s: any, i: number) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-navy-300">{s.sector}</span>
                    {s.signal && s.signal !== "neutral" && (
                      <span className="font-mono text-[8px]" style={{ color: signalColor(s.signal) }}>
                        {s.signal.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-navy-400">
                    {s.avgShortPercent?.toFixed(1)}%
                  </span>
                </div>
                <div className="h-1 w-full bg-navy-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (s.avgShortPercent || 0) * 5)}%`,
                      backgroundColor: signalColor(s.signal || "neutral"),
                      opacity: 0.6,
                    }}
                  />
                </div>
                {(s.tickers || []).length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {s.tickers.slice(0, 5).map((t: string) => (
                      <span key={t} className="font-mono text-[8px] text-navy-600">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Individual entries */}
      {entries.length > 0 && bySector.length === 0 && (
        <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-2">Entries</div>
          {entries.slice(0, 10).map((e: any, i: number) => (
            <div key={i} className="flex items-center justify-between py-1 border-b border-navy-800/50 last:border-0">
              <span className="font-mono text-[10px] text-accent-cyan">{e.ticker}</span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[9px] text-navy-400">{e.shortPercentFloat?.toFixed(1)}% float</span>
                <span className="font-mono text-[9px]" style={{ color: (e.change || 0) > 0 ? "#f43f5e" : "#10b981" }}>
                  {e.change > 0 ? "+" : ""}{e.change?.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
