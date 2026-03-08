"use client";

interface InputValue {
  value: number | null;
  weight: number;
  source: string;
}

interface NowcastData {
  timestamp?: string;
  gdp?: {
    estimate: number;
    confidence: [number, number];
    vsLastOfficial: number | null;
    direction: string;
    inputs: Record<string, InputValue>;
  };
  inflation?: {
    estimate: number;
    vsLastOfficial: number | null;
    direction: string;
    inputs: Record<string, InputValue>;
  };
  employment?: {
    strength: string;
    claimsDirection: string;
    inputs: Record<string, InputValue>;
  };
  financialConditions?: {
    score: number;
    label: string;
    vsLastMonth: string;
    inputs: Record<string, InputValue>;
  };
  consumer?: {
    strength: string;
    direction: string;
    inputs: Record<string, InputValue>;
  };
  globalTrade?: {
    momentum: string;
    direction: string;
    inputs: Record<string, InputValue>;
  };
  composite?: {
    label: string;
    riskScore: number;
    recessionProbability: number;
  };
  error?: string;
}

function directionColor(dir: string): string {
  if (["accelerating", "expanding", "improving", "rising", "strong", "robust", "loose", "very-loose", "healthy"].includes(dir)) return "#10b981";
  if (["contracting", "deteriorating", "worsening", "stressed", "very-tight", "tight"].includes(dir)) return "#f43f5e";
  if (["decelerating", "weak", "cautious", "falling"].includes(dir)) return "#f59e0b";
  return "#06b6d4";
}

function riskColor(score: number): string {
  if (score >= 70) return "#f43f5e";
  if (score >= 50) return "#f59e0b";
  if (score >= 30) return "#06b6d4";
  return "#10b981";
}

function InputsTable({ inputs }: { inputs: Record<string, InputValue> }) {
  return (
    <div className="mt-2 space-y-1">
      {Object.entries(inputs).map(([name, inp]) => (
        <div key={name} className="flex items-center justify-between">
          <span className="font-mono text-[9px] text-navy-500">{name}</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-navy-400">
              {inp.value !== null ? (typeof inp.value === "number" && Math.abs(inp.value) > 100
                ? inp.value.toLocaleString()
                : inp.value.toFixed?.(2) ?? inp.value) : "n/a"}
            </span>
            <div className="w-8 h-0.5 bg-navy-800 rounded-full overflow-hidden">
              <div className="h-full bg-navy-500 rounded-full" style={{ width: `${inp.weight * 100}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DimensionCard({
  label,
  primary,
  secondary,
  color,
  inputs,
  expanded,
}: {
  label: string;
  primary: string;
  secondary?: string;
  color: string;
  inputs?: Record<string, InputValue>;
  expanded?: boolean;
}) {
  return (
    <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
      <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-1">{label}</div>
      <div className="font-mono text-sm font-semibold" style={{ color }}>
        {primary}
      </div>
      {secondary && (
        <div className="font-mono text-[10px] text-navy-500 mt-0.5">{secondary}</div>
      )}
      {expanded && inputs && <InputsTable inputs={inputs} />}
    </div>
  );
}

export function NowcastWidget({ data }: { data: NowcastData }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  const { timestamp, gdp, inflation, employment, financialConditions, consumer, globalTrade, composite } = data;

  if (!composite) {
    return (
      <div className="my-2 border border-navy-700 rounded bg-navy-900/60 px-3 py-2 text-xs text-navy-500 font-mono">
        No nowcast data available
      </div>
    );
  }

  const recPct = Math.round(composite.recessionProbability * 100);

  return (
    <div className="my-2 space-y-3">
      {/* Header */}
      <div className="border border-navy-700/40 rounded bg-navy-900/60 p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-1">
              Economic Nowcast
            </div>
            <div className="font-mono text-base text-navy-300">
              {composite.label}
            </div>
          </div>
          <div className="text-right">
            {timestamp && (
              <div className="font-mono text-[9px] text-navy-600 mb-1">
                {new Date(timestamp).toLocaleDateString("en-GB", {
                  day: "numeric", month: "short", year: "numeric",
                })}
              </div>
            )}
          </div>
        </div>

        {/* Risk score + Recession probability side by side */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="font-mono text-[9px] text-navy-600 mb-1">Risk Score</div>
            <div className="flex items-end gap-2">
              <span className="font-mono text-2xl font-bold" style={{ color: riskColor(composite.riskScore) }}>
                {composite.riskScore}
              </span>
              <span className="font-mono text-[9px] text-navy-600 mb-1">/100</span>
            </div>
            <div className="h-1.5 w-full bg-navy-800 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full rounded-full"
                style={{ width: `${composite.riskScore}%`, backgroundColor: riskColor(composite.riskScore), opacity: 0.9 }}
              />
            </div>
          </div>
          <div>
            <div className="font-mono text-[9px] text-navy-600 mb-1">Recession Probability</div>
            <div className="flex items-end gap-2">
              <span className="font-mono text-2xl font-bold" style={{ color: recPct >= 30 ? "#f43f5e" : recPct >= 15 ? "#f59e0b" : "#10b981" }}>
                {recPct}%
              </span>
            </div>
            <div className="h-1.5 w-full bg-navy-800 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${recPct}%`,
                  backgroundColor: recPct >= 30 ? "#f43f5e" : recPct >= 15 ? "#f59e0b" : "#10b981",
                  opacity: 0.9,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dimension cards */}
      <div className="grid grid-cols-3 gap-2">
        {gdp && (
          <DimensionCard
            label="GDP Growth"
            primary={`${gdp.estimate >= 0 ? "+" : ""}${gdp.estimate.toFixed(1)}%`}
            secondary={`${gdp.direction} | CI [${gdp.confidence[0]}, ${gdp.confidence[1]}]`}
            color={directionColor(gdp.direction)}
            inputs={gdp.inputs}
            expanded
          />
        )}
        {inflation && (
          <DimensionCard
            label="Inflation"
            primary={`${inflation.estimate.toFixed(1)}%`}
            secondary={`${inflation.direction}${inflation.vsLastOfficial != null ? ` | official: ${inflation.vsLastOfficial.toFixed(1)}%` : ""}`}
            color={directionColor(inflation.direction)}
            inputs={inflation.inputs}
            expanded
          />
        )}
        {financialConditions && (
          <DimensionCard
            label="Financial Conditions"
            primary={financialConditions.label.replace(/-/g, " ")}
            secondary={`score: ${financialConditions.score >= 0 ? "+" : ""}${financialConditions.score.toFixed(2)} | ${financialConditions.vsLastMonth}`}
            color={directionColor(financialConditions.label)}
            inputs={financialConditions.inputs}
            expanded
          />
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {employment && (
          <DimensionCard
            label="Employment"
            primary={employment.strength}
            secondary={`claims ${employment.claimsDirection}`}
            color={directionColor(employment.strength)}
            inputs={employment.inputs}
            expanded
          />
        )}
        {consumer && (
          <DimensionCard
            label="Consumer"
            primary={consumer.strength}
            secondary={consumer.direction}
            color={directionColor(consumer.strength)}
            inputs={consumer.inputs}
            expanded
          />
        )}
        {globalTrade && (
          <DimensionCard
            label="Global Trade"
            primary={globalTrade.momentum}
            secondary={globalTrade.direction}
            color={directionColor(globalTrade.momentum)}
            inputs={globalTrade.inputs}
            expanded
          />
        )}
      </div>

      {/* Footer */}
      <div className="font-mono text-[9px] text-navy-700 px-1">
        Sources: FRED (BEA, BLS, Treasury, CBOE). High-frequency proxy nowcast, not a forecast.
      </div>
    </div>
  );
}
