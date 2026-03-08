"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

function regimeColor(regime: string): string {
  if (regime === "dampening") return "#10b981";
  if (regime === "amplifying") return "#f43f5e";
  return "#f59e0b";
}

export function GammaExposureWidget({ data }: { data: any }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  const { summaries = [], aggregateRegime = "neutral" } = data;

  return (
    <div className="my-2 space-y-3">
      {/* Header */}
      <div className="border border-navy-700/40 rounded bg-navy-900/60 p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-1">
              Gamma Exposure (GEX)
            </div>
            <div className="font-mono text-lg font-bold" style={{ color: regimeColor(aggregateRegime) }}>
              {aggregateRegime}
            </div>
          </div>
          <div className="font-mono text-[9px] text-navy-600">
            {summaries.length} tickers
          </div>
        </div>
      </div>

      {/* Per-ticker */}
      {summaries.map((s: any) => (
        <div key={s.ticker} className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="font-mono text-sm text-accent-cyan font-semibold">{s.ticker}</div>
              <div className="font-mono text-[9px] text-navy-500">Spot: ${s.spotPrice?.toFixed(2)}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm font-bold" style={{ color: regimeColor(s.regime) }}>
                {s.regime}
              </div>
              <div className="font-mono text-[9px] text-navy-500">
                {s.gexSign === "positive" ? "+" : "-"} gamma
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-2">
            <div>
              <div className="font-mono text-[9px] text-navy-600">Net GEX</div>
              <div className="font-mono text-[10px] text-navy-300">
                {s.netGEX != null ? `$${(s.netGEX / 1e9).toFixed(2)}B` : "n/a"}
              </div>
            </div>
            <div>
              <div className="font-mono text-[9px] text-navy-600">Zero Gamma</div>
              <div className="font-mono text-[10px] text-navy-300">
                ${s.zeroGammaLevel?.toFixed(0)}
              </div>
            </div>
            <div>
              <div className="font-mono text-[9px] text-navy-600">Flip Dist</div>
              <div className="font-mono text-[10px]" style={{ color: Math.abs(s.flipDistance || 0) < 2 ? "#f59e0b" : "#10b981" }}>
                {s.flipDistance?.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Put/Call walls */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-[9px] text-accent-rose/60">Put Wall</div>
              <div className="font-mono text-[10px] text-navy-300">${s.putWall?.toFixed(0)}</div>
            </div>
            <div className="flex-1 mx-3 h-1 bg-navy-800 rounded-full overflow-hidden relative">
              {s.putWall && s.callWall && s.spotPrice && (
                <>
                  <div
                    className="absolute top-0 h-full w-1 bg-accent-rose rounded-full"
                    style={{ left: `${((s.putWall - s.putWall) / (s.callWall - s.putWall)) * 100}%` }}
                  />
                  <div
                    className="absolute top-0 h-full w-1.5 bg-white rounded-full"
                    style={{ left: `${Math.max(0, Math.min(100, ((s.spotPrice - s.putWall) / (s.callWall - s.putWall)) * 100))}%` }}
                  />
                  <div
                    className="absolute top-0 h-full w-1 bg-accent-emerald rounded-full"
                    style={{ left: "100%" }}
                  />
                </>
              )}
            </div>
            <div className="text-right">
              <div className="font-mono text-[9px] text-accent-emerald/60">Call Wall</div>
              <div className="font-mono text-[10px] text-navy-300">${s.callWall?.toFixed(0)}</div>
            </div>
          </div>

          {s.confidence && (
            <div className="font-mono text-[8px] text-navy-600 mt-1">
              confidence: {s.confidence} | source: {s.dataSource}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
