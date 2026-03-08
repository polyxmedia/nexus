"use client";

interface SystemicRiskData {
  timestamp?: string;
  absorptionRatio?: number;
  absorptionRatioZScore?: number;
  turbulenceIndex?: number;
  turbulencePercentile?: number;
  compositeStress?: number;
  regime?: "stable" | "elevated" | "fragile" | "critical";
  assetCoverage?: number;
  topEigenvaluePct?: number;
  eigenvalueConcentration?: number;
  interpretation?: string;
  warnings?: string[];
  error?: string;
}

function regimeColor(regime: string): string {
  switch (regime) {
    case "critical": return "#f43f5e";
    case "fragile": return "#f59e0b";
    case "elevated": return "#06b6d4";
    default: return "#10b981";
  }
}

function stressColor(stress: number): string {
  if (stress >= 75) return "#f43f5e";
  if (stress >= 50) return "#f59e0b";
  if (stress >= 30) return "#06b6d4";
  return "#10b981";
}

function StressGauge({ stress }: { stress: number }) {
  const color = stressColor(stress);
  return (
    <div className="relative">
      <div className="h-2 w-full bg-navy-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${stress}%`, backgroundColor: color, opacity: 0.9 }}
        />
      </div>
      <div className="flex justify-between font-mono text-[9px] text-navy-700 mt-1">
        <span>stable</span>
        <span>elevated</span>
        <span>fragile</span>
        <span>critical</span>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
      <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-1">{label}</div>
      <div className="font-mono text-sm font-semibold" style={{ color: color || "#d4d4d4" }}>
        {value}
      </div>
      {sub && <div className="font-mono text-[10px] text-navy-500 mt-0.5">{sub}</div>}
    </div>
  );
}

export function SystemicRiskWidget({ data }: { data: SystemicRiskData }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  const {
    timestamp,
    absorptionRatio = 0,
    absorptionRatioZScore = 0,
    turbulenceIndex = 0,
    turbulencePercentile = 0,
    compositeStress = 0,
    regime = "stable",
    assetCoverage = 0,
    topEigenvaluePct = 0,
    eigenvalueConcentration = 0,
    interpretation,
    warnings = [],
  } = data;

  const color = regimeColor(regime);

  return (
    <div className="my-2 space-y-3">
      {/* Header */}
      <div className="border border-navy-700/40 rounded bg-navy-900/60 p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-1">
              Systemic Risk Assessment
            </div>
            <div className="font-mono text-xl font-bold uppercase" style={{ color }}>
              {regime}
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
            <div className="font-mono text-2xl font-bold" style={{ color: stressColor(compositeStress) }}>
              {compositeStress}
            </div>
            <div className="font-mono text-[9px] text-navy-600">composite stress</div>
          </div>
        </div>

        <StressGauge stress={compositeStress} />
      </div>

      {/* Core Metrics */}
      <div className="grid grid-cols-3 gap-2">
        <MetricCard
          label="Absorption Ratio"
          value={absorptionRatio.toFixed(3)}
          sub={`z-score: ${absorptionRatioZScore >= 0 ? "+" : ""}${absorptionRatioZScore.toFixed(2)}`}
          color={absorptionRatio >= 0.85 ? "#f43f5e" : absorptionRatio >= 0.7 ? "#f59e0b" : "#10b981"}
        />
        <MetricCard
          label="Turbulence Index"
          value={turbulenceIndex.toFixed(3)}
          sub={`${turbulencePercentile.toFixed(0)}th percentile`}
          color={turbulencePercentile >= 90 ? "#f43f5e" : turbulencePercentile >= 70 ? "#f59e0b" : "#10b981"}
        />
        <MetricCard
          label="Market Coupling"
          value={`${(topEigenvaluePct * 100).toFixed(1)}%`}
          sub={`HHI: ${eigenvalueConcentration.toFixed(3)}`}
          color={topEigenvaluePct >= 0.5 ? "#f59e0b" : "#10b981"}
        />
      </div>

      {/* Methodology */}
      <div className="grid grid-cols-2 gap-2">
        <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-1.5">
            Absorption Ratio
          </div>
          <div className="h-1 w-full bg-navy-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${absorptionRatio * 100}%`,
                backgroundColor: absorptionRatio >= 0.85 ? "#f43f5e" : absorptionRatio >= 0.7 ? "#f59e0b" : "#10b981",
                opacity: 0.85,
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="font-mono text-[9px] text-navy-600">0</span>
            <span className="font-mono text-[9px] text-navy-600">fragile threshold (0.85)</span>
            <span className="font-mono text-[9px] text-navy-600">1</span>
          </div>
        </div>

        <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-1.5">
            Turbulence Percentile
          </div>
          <div className="h-1 w-full bg-navy-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${turbulencePercentile}%`,
                backgroundColor: turbulencePercentile >= 90 ? "#f43f5e" : turbulencePercentile >= 70 ? "#f59e0b" : "#10b981",
                opacity: 0.85,
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="font-mono text-[9px] text-navy-600">0th</span>
            <span className="font-mono text-[9px] text-navy-600">alert threshold (90th)</span>
            <span className="font-mono text-[9px] text-navy-600">100th</span>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="border border-accent-amber/20 rounded bg-accent-amber/5 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-accent-amber/70 mb-2">
            Warnings ({warnings.length})
          </div>
          <div className="space-y-1.5">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="shrink-0 mt-1 w-1 h-1 rounded-full bg-accent-amber" />
                <span className="font-mono text-[10px] text-accent-amber/80">{w}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interpretation */}
      {interpretation && (
        <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-1.5">
            Interpretation
          </div>
          <div className="font-mono text-[10px] text-navy-400 leading-relaxed">
            {interpretation}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-1">
        <span className="font-mono text-[9px] text-navy-600">
          {assetCoverage} cross-asset returns analyzed
        </span>
        <span className="font-mono text-[9px] text-navy-700">
          Kritzman et al. (2011) methodology
        </span>
      </div>
    </div>
  );
}
