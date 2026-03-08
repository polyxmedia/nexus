"use client";

interface GPRReading {
  date: string;
  composite: number;
  threats: number;
  acts: number;
  threatsToActsRatio: number;
}

interface RegionalGPR {
  region: string;
  score: number;
  trend: "rising" | "falling" | "stable";
  topEvents: string[];
  assetExposure: string[];
}

interface ThresholdCrossing {
  date: string;
  level: "elevated" | "crisis" | "extreme";
  value: number;
  direction: "crossed_above" | "crossed_below";
}

interface GPRData {
  current?: GPRReading;
  history?: GPRReading[];
  regional?: RegionalGPR[];
  thresholdCrossings?: ThresholdCrossing[];
  lastUpdated?: string;
  error?: string;
}

function gprColor(value: number): string {
  if (value >= 300) return "#f43f5e";
  if (value >= 200) return "#f59e0b";
  if (value >= 150) return "#06b6d4";
  return "#10b981";
}

function trendColor(trend: string): string {
  if (trend === "rising") return "#f43f5e";
  if (trend === "falling") return "#10b981";
  return "#06b6d4";
}

function trendArrow(trend: string): string {
  if (trend === "rising") return "^";
  if (trend === "falling") return "v";
  return "-";
}

function levelColor(level: string): string {
  if (level === "extreme") return "#f43f5e";
  if (level === "crisis") return "#f59e0b";
  return "#06b6d4";
}

export function GPRWidget({ data }: { data: GPRData }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  const { current, history = [], regional = [], thresholdCrossings = [], lastUpdated } = data;

  if (!current) {
    return (
      <div className="my-2 border border-navy-700 rounded bg-navy-900/60 px-3 py-2 text-xs text-navy-500 font-mono">
        No GPR data available
      </div>
    );
  }

  const color = gprColor(current.composite);

  // Simple sparkline from history
  const sparklineHistory = history.slice(0, 20).reverse();
  const maxVal = Math.max(...sparklineHistory.map(h => h.composite), 1);

  return (
    <div className="my-2 space-y-3">
      {/* Header */}
      <div className="border border-navy-700/40 rounded bg-navy-900/60 p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-1">
              Geopolitical Risk Index
            </div>
            <div className="font-mono text-3xl font-bold" style={{ color }}>
              {current.composite.toFixed(0)}
            </div>
            <div className="font-mono text-[10px] text-navy-500 mt-0.5">
              {current.date}
            </div>
          </div>
          <div className="text-right">
            {lastUpdated && (
              <div className="font-mono text-[9px] text-navy-600 mb-2">
                {new Date(lastUpdated).toLocaleDateString("en-GB", {
                  day: "numeric", month: "short",
                })}
              </div>
            )}
            {/* Mini sparkline */}
            {sparklineHistory.length > 2 && (
              <div className="flex items-end gap-px h-6">
                {sparklineHistory.map((h, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-t"
                    style={{
                      height: `${(h.composite / maxVal) * 100}%`,
                      backgroundColor: gprColor(h.composite),
                      opacity: 0.7,
                      minHeight: "1px",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Threats vs Acts decomposition */}
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div>
            <div className="font-mono text-[9px] text-navy-600">Threats</div>
            <div className="font-mono text-sm text-navy-300">{current.threats.toFixed(1)}</div>
          </div>
          <div>
            <div className="font-mono text-[9px] text-navy-600">Acts</div>
            <div className="font-mono text-sm text-navy-300">{current.acts.toFixed(1)}</div>
          </div>
          <div>
            <div className="font-mono text-[9px] text-navy-600">Threats/Acts</div>
            <div className="font-mono text-sm" style={{ color: current.threatsToActsRatio > 2 ? "#f59e0b" : "#10b981" }}>
              {current.threatsToActsRatio.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Threshold bar */}
        <div className="mt-3">
          <div className="relative h-1.5 w-full bg-navy-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, (current.composite / 400) * 100)}%`,
                backgroundColor: color,
                opacity: 0.9,
              }}
            />
          </div>
          <div className="flex justify-between mt-1 font-mono text-[8px] text-navy-700">
            <span>0</span>
            <span className="text-accent-cyan/50">150</span>
            <span className="text-accent-amber/50">200</span>
            <span className="text-accent-rose/50">300</span>
            <span>400</span>
          </div>
        </div>
      </div>

      {/* Regional GPR */}
      {regional.length > 0 && (
        <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-2">
            Regional Breakdown
          </div>
          <div className="space-y-2">
            {regional.map((r) => (
              <div key={r.region}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-navy-300">{r.region}</span>
                    <span
                      className="font-mono text-[9px]"
                      style={{ color: trendColor(r.trend) }}
                    >
                      {trendArrow(r.trend)} {r.trend}
                    </span>
                  </div>
                  <span className="font-mono text-[10px]" style={{ color: gprColor(r.score) }}>
                    {r.score}
                  </span>
                </div>
                <div className="h-1 w-full bg-navy-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (r.score / 200) * 100)}%`,
                      backgroundColor: gprColor(r.score),
                      opacity: 0.7,
                    }}
                  />
                </div>
                {r.assetExposure.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {r.assetExposure.map((a) => (
                      <span key={a} className="font-mono text-[8px] text-navy-600 border border-navy-800 rounded px-1 py-0.5">
                        {a}
                      </span>
                    ))}
                  </div>
                )}
                {r.topEvents.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {r.topEvents.map((e, i) => (
                      <div key={i} className="font-mono text-[9px] text-navy-500 truncate">
                        {e}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Threshold Crossings */}
      {thresholdCrossings.length > 0 && (
        <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-2">
            Threshold Crossings
          </div>
          <div className="space-y-1.5">
            {thresholdCrossings.slice(0, 5).map((tc, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded border"
                    style={{
                      color: levelColor(tc.level),
                      borderColor: `${levelColor(tc.level)}40`,
                      backgroundColor: `${levelColor(tc.level)}08`,
                    }}
                  >
                    {tc.level}
                  </span>
                  <span className="font-mono text-[10px] text-navy-400">
                    {tc.direction === "crossed_above" ? "crossed above" : "fell below"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-navy-300">{tc.value.toFixed(0)}</span>
                  <span className="font-mono text-[9px] text-navy-600">{tc.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="font-mono text-[9px] text-navy-700 px-1">
        Caldara-Iacoviello GPR Index + GDELT regional proxies
      </div>
    </div>
  );
}
