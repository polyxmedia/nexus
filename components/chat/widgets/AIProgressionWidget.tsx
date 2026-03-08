"use client";

import { Badge } from "@/components/ui/badge";
import { Metric } from "@/components/ui/metric";

interface RLIModel {
  name: string;
  automationRate: number;
}

interface METRTimeHorizon {
  model: string;
  fiftyPctHorizon: string;
  eightyPctHorizon: string;
  date: string;
}

interface SectorRisk {
  sector: string;
  automationRisk: number;
  aiAdoption: number;
  jobsAtRisk: string;
  timeframe: string;
  trend: "accelerating" | "stable" | "early";
}

interface AI2027Milestone {
  date: string;
  title: string;
  description: string;
  status: "passed" | "on_track" | "upcoming" | "delayed";
  category: string;
}

interface AIProgressionData {
  // Full snapshot
  compositeScore?: number;
  regime?: string;
  rli?: {
    benchmark: string;
    models: RLIModel[];
    bestRate: number;
    totalWorkHours: number;
    totalValue: number;
    source: string;
  };
  metr?: {
    description: string;
    doublingTimeDays: number;
    latestModels: METRTimeHorizon[];
    source: string;
  };
  ai2027?: {
    milestones: AI2027Milestone[];
    progressPace: number;
    adjustedTimeline: string;
    source: string;
  };
  sectors?: SectorRisk[];
  displacement?: {
    aiReplacementRate: number;
    routineJobDecline: number;
    technicalJobGrowth: number;
    aiWorkPercentage: number;
    enterpriseAdoption: number;
    productivityGain: number;
  };
  // Individual focus results (when tool returns just one section)
  benchmark?: string;
  models?: RLIModel[];
  bestRate?: number;
  latestModels?: METRTimeHorizon[];
  milestones?: AI2027Milestone[];
  error?: string;
}

const trendColors: Record<string, string> = {
  accelerating: "text-accent-rose",
  stable: "text-accent-amber",
  early: "text-navy-400",
};

const statusColors: Record<string, string> = {
  passed: "bg-accent-emerald/20 text-accent-emerald border-accent-emerald/30",
  on_track: "bg-accent-cyan/20 text-accent-cyan border-accent-cyan/30",
  upcoming: "bg-navy-800 text-navy-400 border-navy-700",
  delayed: "bg-accent-rose/20 text-accent-rose border-accent-rose/30",
};

const regimeColors: Record<string, string> = {
  nascent: "text-navy-400",
  accelerating: "text-accent-amber",
  inflection: "text-accent-cyan",
  displacement: "text-accent-rose",
  transformation: "text-accent-rose",
};

function num(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

export function AIProgressionWidget({ data }: { data: AIProgressionData }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  const isSnapshot = data.compositeScore !== undefined;
  const rli = data.rli || (data.benchmark ? data as unknown as AIProgressionData["rli"] : null);
  const metr = data.metr || (data.latestModels ? data as unknown as AIProgressionData["metr"] : null);
  const ai2027 = data.ai2027 || (data.milestones && !data.compositeScore ? data as unknown as AIProgressionData["ai2027"] : null);
  const sectors = data.sectors || (Array.isArray(data) ? data as unknown as SectorRisk[] : null);
  const displacement = data.displacement;

  return (
    <div className="my-2 border border-navy-700 rounded bg-navy-900/80 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-navy-500 font-mono">
          AI Progression
        </span>
        {isSnapshot && data.regime && (
          <Badge className={`text-[9px] ${regimeColors[data.regime] || "text-navy-400"} bg-navy-800 border-navy-700`}>
            {data.regime}
          </Badge>
        )}
        {isSnapshot && (
          <span className="text-[10px] font-mono text-navy-500">
            Score: {data.compositeScore}/100
          </span>
        )}
      </div>

      {/* Composite Score Bar */}
      {isSnapshot && (
        <div className="space-y-1">
          <div className="h-2 rounded-full bg-navy-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${num(data.compositeScore)}%`,
                background: num(data.compositeScore) < 40
                  ? "rgb(var(--color-accent-amber))"
                  : num(data.compositeScore) < 60
                  ? "rgb(var(--color-accent-cyan))"
                  : "rgb(var(--color-accent-rose))",
              }}
            />
          </div>
        </div>
      )}

      {/* RLI Section */}
      {rli && rli.models && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-navy-500 font-mono mb-2">
            Remote Labor Index
          </div>
          <div className="space-y-1.5">
            {rli.models.map((m) => (
              <div key={m.name} className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-navy-300 w-36 truncate">
                  {m.name}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-navy-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent-cyan"
                    style={{ width: `${Math.min(num(m.automationRate) * 10, 100)}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-navy-400 w-10 text-right">
                  {num(m.automationRate).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* METR Section */}
      {metr && metr.latestModels && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-navy-500 font-mono mb-2">
            METR Time Horizons
          </div>
          <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-navy-500 mb-1 px-1">
            <span>Model</span>
            <span className="text-center">50% Horizon</span>
            <span className="text-right">80% Horizon</span>
          </div>
          <div className="space-y-1">
            {metr.latestModels.map((m) => (
              <div key={m.model} className="grid grid-cols-3 gap-1 text-[11px] font-mono px-1">
                <span className="text-navy-300 truncate">{m.model}</span>
                <span className="text-accent-cyan text-center">{m.fiftyPctHorizon}</span>
                <span className="text-navy-400 text-right">{m.eightyPctHorizon}</span>
              </div>
            ))}
          </div>
          {metr.doublingTimeDays && (
            <div className="text-[10px] text-navy-500 font-mono mt-1.5">
              Doubling time: {metr.doublingTimeDays} days
            </div>
          )}
        </div>
      )}

      {/* AI 2027 Timeline */}
      {ai2027 && ai2027.milestones && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-wider text-navy-500 font-mono">
              AI 2027 Timeline
            </span>
            {ai2027.progressPace && (
              <span className="text-[10px] font-mono text-navy-500">
                {ai2027.progressPace}% of predicted pace
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            {ai2027.milestones.map((m, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[10px] font-mono text-navy-500 w-16 shrink-0 pt-0.5">
                  {m.date}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-mono text-navy-200 truncate">
                      {m.title}
                    </span>
                    <Badge className={`shrink-0 text-[8px] ${statusColors[m.status] || statusColors.upcoming}`}>
                      {m.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {ai2027.adjustedTimeline && (
            <div className="text-[10px] text-navy-500 font-mono mt-1.5">
              {ai2027.adjustedTimeline}
            </div>
          )}
        </div>
      )}

      {/* Sector Automation Risk */}
      {sectors && sectors.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-navy-500 font-mono mb-2">
            Sector Automation Risk
          </div>
          <div className="space-y-1.5">
            {sectors.map((s) => (
              <div key={s.sector} className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-navy-300 w-36 truncate">
                  {s.sector}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-navy-800 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${num(s.automationRisk)}%`,
                      background: num(s.automationRisk) > 60
                        ? "rgb(var(--color-accent-rose))"
                        : num(s.automationRisk) > 40
                        ? "rgb(var(--color-accent-amber))"
                        : "rgb(var(--color-accent-cyan))",
                    }}
                  />
                </div>
                <span className={`text-[10px] font-mono w-8 text-right ${trendColors[s.trend] || "text-navy-400"}`}>
                  {num(s.automationRisk)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Displacement Stats */}
      {displacement && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-navy-500 font-mono mb-2">
            Labor Displacement
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Metric label="AI Replacement" value={`${num(displacement.aiReplacementRate)}%`} />
            <Metric label="Enterprise Adoption" value={`${num(displacement.enterpriseAdoption)}%`} />
            <Metric label="Productivity Gain" value={`${num(displacement.productivityGain)}h/wk`} />
          </div>
          <div className="grid grid-cols-3 gap-3 mt-2">
            <Metric
              label="Routine Job Decline"
              value={`${num(displacement.routineJobDecline)}%`}
              changeColor="red"
              change="Declining"
            />
            <Metric
              label="Technical Job Growth"
              value={`${num(displacement.technicalJobGrowth)}%`}
              changeColor="green"
              change="Growing"
            />
            <Metric
              label="AI Work Time"
              value={`${num(displacement.aiWorkPercentage)}%`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
