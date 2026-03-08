"use client";

interface RegimeDimension {
  regime: string;
  score: number;
  confidence: number;
  inputs: Record<string, { value: number | null; weight: number; source: string }>;
}

interface RegimeState {
  timestamp: string;
  volatility: RegimeDimension & { vix: number | null; percentile: string };
  growth: RegimeDimension & { direction: string };
  monetary: RegimeDimension & { fedFunds: number | null; direction: string };
  riskAppetite: RegimeDimension & { creditSpread: number | null };
  dollar: RegimeDimension & { dxy: number | null; trend: string };
  commodity: RegimeDimension & { oil: number | null; gold: number | null };
  composite: string;
  compositeScore: number;
}

interface RegimeShift {
  dimension: string;
  from: string;
  to: string;
  magnitude: number;
  interpretation: string;
  marketImplication: string;
  timestamp: string;
}

interface MarketRegimeData {
  regime?: RegimeState;
  shifts?: RegimeShift[];
  note?: string;
  error?: string;
}

function scoreColor(score: number): string {
  if (score > 0.3) return "#10b981";
  if (score < -0.3) return "#f43f5e";
  return "#f59e0b";
}

function compositeColor(score: number): string {
  if (score > 0.3) return "#10b981";
  if (score < -0.3) return "#f43f5e";
  return "#f59e0b";
}

function ScoreBar({ score }: { score: number }) {
  // Fills from center: 0 = 50%, +1 = 100%, -1 = 0%
  const pct = ((score + 1) / 2) * 100;
  const color = scoreColor(score);
  return (
    <div className="h-1 w-full bg-navy-800 rounded-full overflow-hidden mt-1.5">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.85 }}
      />
    </div>
  );
}

function ConfidenceDots({ confidence }: { confidence: number }) {
  const filled = Math.round(confidence * 5);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className="inline-block w-1 h-1 rounded-full"
          style={{ backgroundColor: i < filled ? "#6b7280" : "#1f2937" }}
        />
      ))}
    </div>
  );
}

function DimensionCard({
  label,
  dim,
  extra,
}: {
  label: string;
  dim: RegimeDimension;
  extra?: React.ReactNode;
}) {
  return (
    <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
      <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-1">{label}</div>
      <div className="font-mono text-sm font-semibold" style={{ color: scoreColor(dim.score) }}>
        {dim.regime}
      </div>
      {extra && <div className="font-mono text-[10px] text-navy-500 mt-0.5">{extra}</div>}
      <ScoreBar score={dim.score} />
      <div className="flex items-center justify-between mt-1.5">
        <ConfidenceDots confidence={dim.confidence} />
        <span className="font-mono text-[9px] text-navy-600">
          {dim.score >= 0 ? "+" : ""}{dim.score.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

export function MarketRegimeWidget({ data }: { data: MarketRegimeData }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  const { regime, shifts = [], note } = data;

  if (!regime) {
    return (
      <div className="my-2 border border-navy-700 rounded bg-navy-900/60 px-3 py-2 text-xs text-navy-500 font-mono">
        No regime data available
      </div>
    );
  }

  const compColor = compositeColor(regime.compositeScore);
  const compPct = ((regime.compositeScore + 1) / 2) * 100;

  return (
    <div className="my-2 space-y-3">
      {/* Header */}
      <div className="border border-navy-700/40 rounded bg-navy-900/60 p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-1">Market Regime</div>
            <div className="font-mono text-xl font-bold" style={{ color: compColor }}>
              {regime.composite}
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[9px] text-navy-600 mb-1">
              {new Date(regime.timestamp).toLocaleDateString("en-GB", {
                day: "numeric", month: "short", year: "numeric"
              })}
            </div>
            <div className="font-mono text-lg font-bold" style={{ color: compColor }}>
              {regime.compositeScore >= 0 ? "+" : ""}{regime.compositeScore.toFixed(2)}
            </div>
            <div className="font-mono text-[9px] text-navy-600">composite score</div>
          </div>
        </div>

        {/* Composite bar */}
        <div className="relative">
          <div className="h-1.5 w-full bg-navy-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${compPct}%`, backgroundColor: compColor, opacity: 0.9 }}
            />
          </div>
          {/* Center marker */}
          <div className="absolute top-0 left-1/2 h-1.5 w-px bg-navy-600" />
          <div className="flex justify-between font-mono text-[9px] text-navy-700 mt-1">
            <span>risk-off</span>
            <span>neutral</span>
            <span>risk-on</span>
          </div>
        </div>
      </div>

      {/* Dimension grid */}
      <div className="grid grid-cols-3 gap-2">
        <DimensionCard
          label="Volatility"
          dim={regime.volatility}
          extra={regime.volatility.vix != null
            ? `VIX ${regime.volatility.vix.toFixed(1)} · ${regime.volatility.percentile}`
            : regime.volatility.percentile}
        />
        <DimensionCard
          label="Growth"
          dim={regime.growth}
          extra={regime.growth.direction}
        />
        <DimensionCard
          label="Monetary"
          dim={regime.monetary}
          extra={regime.monetary.fedFunds != null
            ? `Fed funds ${regime.monetary.fedFunds.toFixed(2)}% · ${regime.monetary.direction}`
            : regime.monetary.direction}
        />
        <DimensionCard
          label="Risk Appetite"
          dim={regime.riskAppetite}
          extra={regime.riskAppetite.creditSpread != null
            ? `Credit spread ${regime.riskAppetite.creditSpread.toFixed(0)}bp`
            : undefined}
        />
        <DimensionCard
          label="Dollar"
          dim={regime.dollar}
          extra={regime.dollar.dxy != null
            ? `DXY ${regime.dollar.dxy.toFixed(1)} · ${regime.dollar.trend}`
            : regime.dollar.trend}
        />
        <DimensionCard
          label="Commodities"
          dim={regime.commodity}
          extra={
            regime.commodity.oil != null || regime.commodity.gold != null
              ? [
                  regime.commodity.oil != null ? `Oil $${regime.commodity.oil.toFixed(0)}` : null,
                  regime.commodity.gold != null ? `Gold $${regime.commodity.gold.toFixed(0)}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : undefined
          }
        />
      </div>

      {/* Regime shifts */}
      {shifts.length > 0 && (
        <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-2">
            Recent Shifts ({shifts.length})
          </div>
          <div className="space-y-2">
            {shifts.map((shift, i) => (
              <div key={i} className="flex items-start gap-3 pb-2 border-b border-navy-800 last:border-0 last:pb-0">
                <div className="shrink-0 mt-0.5">
                  <div
                    className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border"
                    style={{
                      color: shift.magnitude > 0.5 ? "#f59e0b" : "#6b7280",
                      borderColor: shift.magnitude > 0.5 ? "#f59e0b40" : "#374151",
                      backgroundColor: shift.magnitude > 0.5 ? "#f59e0b08" : "transparent",
                    }}
                  >
                    {shift.dimension}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="font-mono text-[10px] text-navy-300">
                    <span className="text-navy-500">{shift.from}</span>
                    <span className="text-navy-600 mx-1.5">→</span>
                    <span>{shift.to}</span>
                    <span className="text-navy-600 ml-2">(mag {shift.magnitude.toFixed(2)})</span>
                  </div>
                  <div className="font-mono text-[10px] text-navy-500 mt-0.5 truncate">{shift.interpretation}</div>
                  {shift.marketImplication && (
                    <div className="font-mono text-[10px] text-accent-cyan/70 mt-0.5 truncate">{shift.marketImplication}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {note && (
        <div className="font-mono text-[10px] text-navy-600 px-1">{note}</div>
      )}
    </div>
  );
}
