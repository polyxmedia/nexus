"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

function trendColor(trend: string): string {
  if (trend === "up") return "#10b981";
  if (trend === "down") return "#f43f5e";
  return "#d4d4d4";
}

function strengthColor(s: string): string {
  if (s === "strong") return "#f43f5e";
  if (s === "moderate") return "#f59e0b";
  if (s === "weak") return "#06b6d4";
  return "#555555";
}

function regimeColor(r: string): string {
  if (r === "geopolitical_proxy") return "#f43f5e";
  if (r === "demand_driven") return "#06b6d4";
  return "#555555";
}

function regimeLabel(r: string): string {
  if (r === "geopolitical_proxy") return "GEO PROXY";
  if (r === "demand_driven") return "DEMAND";
  return "NEUTRAL";
}

export function OilDivergenceWidget({ data }: { data: any }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  const {
    currentReading,
    signalActive,
    signalStrength,
    regime,
    regimeContext,
    history = [],
    stats = {},
    correlation = {},
    interpretation,
    tradingImplication,
    timestamp,
  } = data;

  // Mini sparkline of oil vs SPX returns
  const sparkData = (history as any[]).slice(-15);

  return (
    <div className="my-2 space-y-3">
      {/* Header: Signal Status */}
      <div className="border border-navy-700/40 rounded bg-navy-900/60 p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-1">
              Oil-SPX Divergence Monitor
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: signalActive ? "#f43f5e" : "#555555" }}
              />
              <span className="font-mono text-sm" style={{ color: signalActive ? "#f43f5e" : "#888888" }}>
                {signalActive ? "SIGNAL ACTIVE" : "No Signal"}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[9px] text-navy-600">Strength</div>
            <div
              className="font-mono text-lg font-bold uppercase"
              style={{ color: strengthColor(signalStrength) }}
            >
              {signalStrength}
            </div>
          </div>
        </div>

        {/* Current reading */}
        {currentReading && (
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="border border-navy-700/30 rounded p-2.5 bg-navy-900/40">
              <div className="font-mono text-[9px] text-navy-500 uppercase tracking-wider mb-1">WTI Crude</div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-sm text-navy-200">${currentReading.oilPrice?.toFixed(2)}</span>
                <span className="font-mono text-[11px]" style={{ color: trendColor(currentReading.oilTrend) }}>
                  {currentReading.oilChange > 0 ? "+" : ""}{currentReading.oilChange?.toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="border border-navy-700/30 rounded p-2.5 bg-navy-900/40">
              <div className="font-mono text-[9px] text-navy-500 uppercase tracking-wider mb-1">SPX (SPY)</div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-sm text-navy-200">${currentReading.spxPrice?.toFixed(2)}</span>
                <span className="font-mono text-[11px]" style={{ color: trendColor(currentReading.spxTrend) }}>
                  {currentReading.spxChange > 0 ? "+" : ""}{currentReading.spxChange?.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Regime & Correlation */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="font-mono text-[9px] text-navy-500 uppercase tracking-wider mb-1.5">Regime</div>
          <div className="font-mono text-sm font-bold" style={{ color: regimeColor(regime) }}>
            {regimeLabel(regime)}
          </div>
          <div className="font-mono text-[9px] text-navy-600 mt-1 leading-relaxed">
            {regimeContext?.slice(0, 120)}{regimeContext?.length > 120 ? "..." : ""}
          </div>
        </div>
        <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="font-mono text-[9px] text-navy-500 uppercase tracking-wider mb-1.5">Oil-SPX Correlation</div>
          <div className="flex items-baseline gap-3">
            <div>
              <div className="font-mono text-[9px] text-navy-600">20d</div>
              <div className="font-mono text-sm text-navy-200">{correlation.rolling20d?.toFixed(3)}</div>
            </div>
            <div>
              <div className="font-mono text-[9px] text-navy-600">60d</div>
              <div className="font-mono text-sm text-navy-400">{correlation.rolling60d?.toFixed(3)}</div>
            </div>
            <div>
              <div className="font-mono text-[9px] text-navy-600">Dev</div>
              <div className="font-mono text-sm" style={{ color: Math.abs(correlation.deviation || 0) > 1.5 ? "#f59e0b" : "#888" }}>
                {correlation.deviation > 0 ? "+" : ""}{correlation.deviation?.toFixed(1)}s
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Stats */}
      <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
        <div className="font-mono text-[9px] text-navy-500 uppercase tracking-wider mb-2">
          Pattern Statistics (60d window)
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <div className="font-mono text-[9px] text-navy-600">Win Rate</div>
            <div className="font-mono text-sm font-bold" style={{ color: (stats.winRate || 0) > 60 ? "#10b981" : "#f59e0b" }}>
              {stats.winRate || 0}%
            </div>
          </div>
          <div>
            <div className="font-mono text-[9px] text-navy-600">Sample</div>
            <div className="font-mono text-sm text-navy-200">{stats.sampleSize || 0}</div>
          </div>
          <div>
            <div className="font-mono text-[9px] text-navy-600">Avg SPX Move</div>
            <div className="font-mono text-sm" style={{ color: (stats.avgSpxMoveAfterOilDrop || 0) > 0 ? "#10b981" : "#f43f5e" }}>
              {(stats.avgSpxMoveAfterOilDrop || 0) > 0 ? "+" : ""}{stats.avgSpxMoveAfterOilDrop?.toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="font-mono text-[9px] text-navy-600">Avg Oil Drop</div>
            <div className="font-mono text-sm text-accent-rose">
              {stats.avgOilDropMagnitude?.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* Recent History - visual bar chart */}
      {sparkData.length > 0 && (
        <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="font-mono text-[9px] text-navy-500 uppercase tracking-wider mb-2">
            Recent Oil vs SPX Returns
          </div>
          <div className="space-y-1">
            {sparkData.map((r: any, i: number) => {
              const maxAbs = Math.max(
                ...sparkData.map((d: any) => Math.max(Math.abs(d.oilChange || 0), Math.abs(d.spxChange || 0))),
                0.5
              );
              const oilWidth = Math.abs(r.oilChange || 0) / maxAbs * 45;
              const spxWidth = Math.abs(r.spxChange || 0) / maxAbs * 45;

              return (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="font-mono text-[8px] text-navy-600 w-14 shrink-0 text-right">
                    {r.date?.slice(5)}
                  </span>
                  {/* Oil bar */}
                  <div className="flex-1 flex items-center justify-end">
                    <div
                      className="h-2 rounded-sm"
                      style={{
                        width: `${oilWidth}%`,
                        backgroundColor: r.oilChange < 0 ? "#f43f5e" : "#10b981",
                        opacity: 0.7,
                        minWidth: r.oilChange !== 0 ? 2 : 0,
                      }}
                    />
                  </div>
                  <div className="w-px h-3 bg-navy-700 shrink-0" />
                  {/* SPX bar */}
                  <div className="flex-1 flex items-center">
                    <div
                      className="h-2 rounded-sm"
                      style={{
                        width: `${spxWidth}%`,
                        backgroundColor: r.spxChange < 0 ? "#f43f5e" : "#10b981",
                        opacity: 0.7,
                        minWidth: r.spxChange !== 0 ? 2 : 0,
                      }}
                    />
                  </div>
                  {/* Divergence dot */}
                  {r.divergent && (
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-amber shrink-0" title="Divergence" />
                  )}
                </div>
              );
            })}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="w-14 shrink-0" />
              <div className="flex-1 text-right font-mono text-[8px] text-navy-600">OIL</div>
              <div className="w-px shrink-0" />
              <div className="flex-1 font-mono text-[8px] text-navy-600">SPX</div>
              <div className="w-1.5 shrink-0" />
            </div>
          </div>
        </div>
      )}

      {/* Interpretation */}
      {interpretation && (
        <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="font-mono text-[9px] text-navy-500 uppercase tracking-wider mb-1">Analysis</div>
          <div className="font-mono text-[10px] text-navy-300 leading-relaxed">{interpretation}</div>
        </div>
      )}

      {/* Trading implication */}
      {tradingImplication && signalStrength !== "none" && (
        <div
          className="border rounded p-3"
          style={{
            borderColor: signalActive ? "rgba(244,63,94,0.2)" : "rgba(100,100,100,0.2)",
            backgroundColor: signalActive ? "rgba(244,63,94,0.03)" : "transparent",
          }}
        >
          <div className="font-mono text-[9px] uppercase tracking-wider mb-1" style={{ color: signalActive ? "#f43f5e" : "#555" }}>
            Trading Implication
          </div>
          <div className="font-mono text-[10px] text-navy-300 leading-relaxed">{tradingImplication}</div>
        </div>
      )}

      {timestamp && (
        <div className="font-mono text-[9px] text-navy-700 px-1">
          {new Date(timestamp).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </div>
      )}
    </div>
  );
}
