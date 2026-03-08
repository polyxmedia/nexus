"use client";

import { Badge } from "@/components/ui/badge";

interface IWScenario {
  id: string;
  name: string;
  region: string;
  escalationLevel: number;
  escalationName: string;
  score: number;
  activeIndicators: number;
  totalIndicators: number;
  marketSectors: string[];
  marketImpact: string;
}

interface IWStatusData {
  scenarios?: IWScenario[];
  highestEscalation?: number;
  // Single scenario detail
  scenarioId?: string;
  name?: string;
  escalationLevel?: number;
  escalationName?: string;
  score?: number;
  error?: string;
}

const escalationStyles: Record<number, { bg: string; text: string; border: string; bar: string }> = {
  0: { bg: "bg-navy-800/50", text: "text-navy-400", border: "border-navy-700", bar: "bg-navy-600" },
  1: { bg: "bg-accent-cyan/5", text: "text-accent-cyan", border: "border-accent-cyan/20", bar: "bg-accent-cyan" },
  2: { bg: "bg-accent-emerald/5", text: "text-accent-emerald", border: "border-accent-emerald/20", bar: "bg-accent-emerald" },
  3: { bg: "bg-accent-amber/5", text: "text-accent-amber", border: "border-accent-amber/20", bar: "bg-accent-amber" },
  4: { bg: "bg-accent-rose/5", text: "text-accent-rose", border: "border-accent-rose/20", bar: "bg-accent-rose" },
  5: { bg: "bg-accent-rose/10", text: "text-accent-rose", border: "border-accent-rose/40", bar: "bg-accent-rose" },
};

function getStyle(level: number) {
  return escalationStyles[Math.min(level, 5)] || escalationStyles[0];
}

function num(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

export function IWStatusWidget({ data }: { data: IWStatusData }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  const scenarios = data.scenarios || [];
  const highestEsc = num(data.highestEscalation);
  const topStyle = getStyle(highestEsc);

  return (
    <div className="my-2 border border-navy-700 rounded bg-navy-900/80 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-navy-500 font-mono">
          Indications &amp; Warnings
        </span>
        <Badge className={`text-[9px] ${topStyle.bg} ${topStyle.text} ${topStyle.border}`}>
          Threat Level {highestEsc}
        </Badge>
        <span className="text-[10px] font-mono text-navy-500">
          {scenarios.length} scenario{scenarios.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Scenario Cards */}
      <div className="space-y-2">
        {scenarios
          .sort((a, b) => num(b.escalationLevel) - num(a.escalationLevel))
          .map((s) => {
            const style = getStyle(num(s.escalationLevel));
            const pct = num(s.score);
            const active = num(s.activeIndicators);
            const total = num(s.totalIndicators);

            return (
              <div
                key={s.id}
                className={`border rounded p-3 ${style.border} ${style.bg}`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-[11px] font-mono font-bold ${style.text}`}>
                      {s.name}
                    </span>
                    <Badge className="text-[8px] bg-navy-800/60 text-navy-400 border-navy-700">
                      {s.region}
                    </Badge>
                  </div>
                  <Badge className={`shrink-0 text-[9px] ${style.bg} ${style.text} ${style.border}`}>
                    {s.escalationName || `Level ${s.escalationLevel}`}
                  </Badge>
                </div>

                {/* Score Bar */}
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex-1 h-1.5 rounded-full bg-navy-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${style.bar}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-mono ${style.text} w-8 text-right`}>
                    {pct}%
                  </span>
                </div>

                {/* Details */}
                <div className="flex items-center gap-3 text-[10px] font-mono text-navy-500">
                  <span>
                    {active}/{total} indicators active
                  </span>
                  {s.marketImpact && (
                    <span className={
                      s.marketImpact === "severe" ? "text-accent-rose" :
                      s.marketImpact === "high" ? "text-accent-amber" :
                      s.marketImpact === "moderate" ? "text-accent-cyan" :
                      "text-navy-400"
                    }>
                      {s.marketImpact} impact
                    </span>
                  )}
                </div>

                {/* Market Sectors */}
                {s.marketSectors && s.marketSectors.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {s.marketSectors.map((sector) => (
                      <span
                        key={sector}
                        className="text-[9px] font-mono text-navy-500 bg-navy-800/60 rounded px-1.5 py-0.5"
                      >
                        {sector}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
