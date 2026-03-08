"use client";

import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, TrendingUp, AlertTriangle, CheckCircle2, Clock, Zap } from "lucide-react";

// ── Types ──

interface RLIModel {
  name: string;
  automationRate: number;
}

interface METRModel {
  model: string;
  fiftyPctHorizon: string;
  eightyPctHorizon: string;
  date: string;
}

interface Milestone {
  date: string;
  title: string;
  description: string;
  status: "passed" | "on_track" | "upcoming" | "delayed";
  category: "capability" | "governance" | "deployment" | "risk";
}

interface SectorRisk {
  sector: string;
  automationRisk: number;
  aiAdoption: number;
  jobsAtRisk: string;
  timeframe: string;
  trend: "accelerating" | "stable" | "early";
}

interface Snapshot {
  rli: {
    benchmark: string;
    description: string;
    totalWorkHours: number;
    totalValue: number;
    models: RLIModel[];
    bestRate: number;
    source: string;
    lastUpdated: string;
  } | null;
  metr: {
    description: string;
    doublingTimeDays: number;
    latestModels: METRModel[];
    source: string;
  } | null;
  ai2027: {
    milestones: Milestone[];
    progressPace: number;
    adjustedTimeline: string;
    source: string;
  } | null;
  sectors: SectorRisk[];
  displacement: {
    aiReplacementRate: number;
    routineJobDecline: number;
    technicalJobGrowth: number;
    aiWorkPercentage: number;
    enterpriseAdoption: number;
    productivityGain: number;
  } | null;
  compositeScore: number;
  regime: string;
}

// ── Page ──

export default function AIProgressionPage() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ai-progression")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <PageContainer title="AI Progression" subtitle="Tracking AI capability and labor displacement">
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded" />)}
        </div>
      </PageContainer>
    );
  }

  if (!data) {
    return (
      <PageContainer title="AI Progression" subtitle="Tracking AI capability and labor displacement">
        <p className="text-sm text-navy-500">Failed to load AI progression data.</p>
      </PageContainer>
    );
  }

  const regimeColor = data.regime === "transformation" ? "text-accent-rose"
    : data.regime === "displacement" ? "text-accent-amber"
    : data.regime === "inflection" ? "text-accent-cyan"
    : data.regime === "accelerating" ? "text-accent-emerald"
    : "text-navy-400";

  const scoreBarColor = data.compositeScore > 60 ? "bg-accent-rose" : data.compositeScore > 40 ? "bg-accent-amber" : "bg-accent-cyan";

  return (
    <PageContainer
      title="AI Progression"
      subtitle="Remote Labor Index, METR time horizons, AI 2027 timeline, sector automation risk"
    >
      {/* Score Header */}
      <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-navy-500">AI Progression Score</span>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-4xl font-mono font-bold text-navy-100">{data.compositeScore}</span>
              <span className="text-lg font-mono text-navy-400">/100</span>
              <span className={`text-sm font-mono font-bold uppercase ${regimeColor}`}>{data.regime}</span>
            </div>
          </div>
          <div className="text-right space-y-1">
            {data.displacement && (
              <>
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-[10px] text-navy-500">Enterprise AI adoption</span>
                  <span className="text-sm font-mono text-accent-emerald font-bold">{data.displacement.enterpriseAdoption}%</span>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-[10px] text-navy-500">Companies replacing workers</span>
                  <span className="text-sm font-mono text-accent-rose font-bold">{data.displacement.aiReplacementRate}%</span>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-[10px] text-navy-500">Hours saved/worker/week</span>
                  <span className="text-sm font-mono text-accent-cyan font-bold">{data.displacement.productivityGain}</span>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${scoreBarColor}`} style={{ width: `${data.compositeScore}%` }} />
        </div>
      </div>

      {/* Key Metrics */}
      {data.displacement && (
        <div className="grid grid-cols-6 gap-3 mb-6">
          {[
            { label: "Companies replacing workers", value: `${data.displacement.aiReplacementRate}%`, color: "text-accent-rose" },
            { label: "Routine job decline", value: `-${data.displacement.routineJobDecline}%`, color: "text-accent-rose" },
            { label: "Technical job growth", value: `+${data.displacement.technicalJobGrowth}%`, color: "text-accent-emerald" },
            { label: "AI-assisted work time", value: `${data.displacement.aiWorkPercentage}%`, color: "text-accent-cyan" },
            { label: "Enterprise adoption", value: `${data.displacement.enterpriseAdoption}%`, color: "text-accent-emerald" },
            { label: "Productivity gain", value: `${data.displacement.productivityGain}h/wk`, color: "text-accent-cyan" },
          ].map((m, i) => (
            <div key={i} className="border border-navy-700/30 rounded-md bg-navy-900/60 p-3 text-center">
              <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 block">{m.label}</span>
              <span className={`text-lg font-mono font-bold ${m.color}`}>{m.value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Remote Labor Index */}
          {data.rli && (
            <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-mono uppercase tracking-widest text-navy-500">Remote Labor Index</h3>
                <a href={data.rli.source} target="_blank" rel="noopener noreferrer" className="text-[9px] text-accent-cyan hover:text-accent-cyan/80 flex items-center gap-1">
                  remotelabor.ai <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
              <p className="text-[11px] text-navy-400 mb-3 leading-relaxed">{data.rli.description}</p>

              <div className="flex items-center gap-4 mb-3 pb-3 border-b border-navy-700/20">
                <div>
                  <span className="text-[9px] text-navy-500 block">Best Rate</span>
                  <span className="text-2xl font-mono text-accent-cyan font-bold">{data.rli.bestRate.toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-[9px] text-navy-500 block">Work Hours</span>
                  <span className="text-sm font-mono text-navy-200">{data.rli.totalWorkHours.toLocaleString()}+</span>
                </div>
                <div>
                  <span className="text-[9px] text-navy-500 block">Project Value</span>
                  <span className="text-sm font-mono text-navy-200">${(data.rli.totalValue / 1000).toFixed(0)}K+</span>
                </div>
              </div>

              <div className="space-y-2">
                {data.rli.models.map((m) => (
                  <div key={m.name} className="flex items-center gap-3">
                    <span className="text-[10px] text-navy-300 w-36 truncate">{m.name}</span>
                    <div className="flex-1 h-2 bg-navy-700/30 rounded-full overflow-hidden">
                      <div className="h-full bg-accent-cyan/50 rounded-full transition-all duration-500" style={{ width: `${Math.min(m.automationRate * 10, 100)}%` }} />
                    </div>
                    <span className="text-[11px] font-mono text-navy-200 w-10 text-right">{m.automationRate.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* METR Time Horizons */}
          {data.metr && (
            <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-mono uppercase tracking-widest text-navy-500">METR Time Horizons</h3>
                <a href={data.metr.source} target="_blank" rel="noopener noreferrer" className="text-[9px] text-accent-cyan hover:text-accent-cyan/80 flex items-center gap-1">
                  metr.org <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
              <p className="text-[11px] text-navy-400 mb-3 leading-relaxed">{data.metr.description}</p>

              <div className="flex items-center gap-4 mb-3 pb-3 border-b border-navy-700/20">
                <div>
                  <span className="text-[9px] text-navy-500 block">Capability Doubling Time</span>
                  <span className="text-2xl font-mono text-accent-amber font-bold">{data.metr.doublingTimeDays}</span>
                  <span className="text-sm font-mono text-navy-400 ml-1">days</span>
                </div>
              </div>

              <div className="border border-navy-700/20 rounded overflow-hidden">
                <div className="grid grid-cols-4 gap-2 px-3 py-1.5 bg-navy-800/40">
                  <span className="text-[9px] font-mono text-navy-500 uppercase">Model</span>
                  <span className="text-[9px] font-mono text-navy-500 uppercase text-right">50% Horizon</span>
                  <span className="text-[9px] font-mono text-navy-500 uppercase text-right">80% Horizon</span>
                  <span className="text-[9px] font-mono text-navy-500 uppercase text-right">Date</span>
                </div>
                {data.metr.latestModels.map((m) => (
                  <div key={m.model} className="grid grid-cols-4 gap-2 px-3 py-2 border-t border-navy-700/10">
                    <span className="text-[10px] text-navy-200">{m.model}</span>
                    <span className="text-[11px] font-mono text-accent-cyan text-right">{m.fiftyPctHorizon}</span>
                    <span className="text-[11px] font-mono text-navy-300 text-right">{m.eightyPctHorizon}</span>
                    <span className="text-[10px] font-mono text-navy-500 text-right">{m.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* AI 2027 Timeline */}
          {data.ai2027 && (
            <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-mono uppercase tracking-widest text-navy-500">AI 2027 Scenario Timeline</h3>
                <a href={data.ai2027.source} target="_blank" rel="noopener noreferrer" className="text-[9px] text-accent-cyan hover:text-accent-cyan/80 flex items-center gap-1">
                  ai-2027.com <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>

              <div className="flex items-center gap-4 mb-3 pb-3 border-b border-navy-700/20">
                <div>
                  <span className="text-[9px] text-navy-500 block">Progress vs Prediction</span>
                  <span className="text-2xl font-mono text-accent-amber font-bold">{data.ai2027.progressPace}%</span>
                </div>
                <div className="flex-1">
                  <div className="h-2 bg-navy-700/30 rounded-full overflow-hidden">
                    <div className="h-full bg-accent-amber/50 rounded-full" style={{ width: `${data.ai2027.progressPace}%` }} />
                  </div>
                  <span className="text-[9px] text-navy-500 mt-1 block">{data.ai2027.adjustedTimeline}</span>
                </div>
              </div>

              <div className="space-y-0">
                {data.ai2027.milestones.map((m, i) => {
                  const StatusIcon = m.status === "passed" ? CheckCircle2
                    : m.status === "on_track" ? TrendingUp
                    : m.status === "delayed" ? AlertTriangle
                    : Clock;
                  const statusColor = m.status === "passed" ? "text-accent-emerald bg-accent-emerald"
                    : m.status === "on_track" ? "text-accent-cyan bg-accent-cyan"
                    : m.status === "delayed" ? "text-accent-rose bg-accent-rose"
                    : "text-navy-500 bg-navy-600";
                  const catColor = m.category === "risk" ? "text-accent-rose"
                    : m.category === "governance" ? "text-accent-amber"
                    : m.category === "capability" ? "text-accent-cyan"
                    : "text-navy-400";

                  return (
                    <div key={i} className="flex gap-3 group">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${statusColor.split(" ")[1]}/30 border-2 border-current ${statusColor.split(" ")[0]} shrink-0 mt-1`} />
                        {i < data.ai2027!.milestones.length - 1 && <div className="w-px flex-1 bg-navy-700/30 min-h-[16px]" />}
                      </div>
                      <div className="pb-4 min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-mono text-navy-500 font-bold">{m.date}</span>
                          <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded ${catColor} bg-navy-800/60`}>{m.category}</span>
                          <StatusIcon className={`h-3 w-3 ml-auto ${statusColor.split(" ")[0]}`} />
                        </div>
                        <span className="text-[11px] text-navy-200 font-medium block">{m.title}</span>
                        <span className="text-[10px] text-navy-400 leading-relaxed block mt-0.5">{m.description}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sector Automation Risk - Full Width */}
      {data.sectors.length > 0 && (
        <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-mono uppercase tracking-widest text-navy-500">Sector Automation Risk</h3>
            <div className="flex items-center gap-3 text-[9px] font-mono text-navy-500">
              <span className="flex items-center gap-1"><Zap className="h-2.5 w-2.5 text-accent-rose" /> Accelerating</span>
              <span className="flex items-center gap-1"><TrendingUp className="h-2.5 w-2.5 text-accent-amber" /> Stable</span>
              <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5 text-navy-400" /> Early</span>
            </div>
          </div>

          <div className="border border-navy-700/20 rounded overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-navy-800/40">
              <span className="col-span-3 text-[9px] font-mono text-navy-500 uppercase">Sector</span>
              <span className="col-span-3 text-[9px] font-mono text-navy-500 uppercase">Automation Risk</span>
              <span className="col-span-2 text-[9px] font-mono text-navy-500 uppercase text-right">AI Adoption</span>
              <span className="col-span-1 text-[9px] font-mono text-navy-500 uppercase text-right">Jobs at Risk</span>
              <span className="col-span-1 text-[9px] font-mono text-navy-500 uppercase text-right">Timeframe</span>
              <span className="col-span-2 text-[9px] font-mono text-navy-500 uppercase text-right">Trend</span>
            </div>

            {data.sectors.map((s) => {
              const riskColor = s.automationRisk >= 70 ? "bg-accent-rose" : s.automationRisk >= 50 ? "bg-accent-amber" : s.automationRisk >= 30 ? "bg-accent-cyan" : "bg-navy-600";
              const trendIcon = s.trend === "accelerating" ? Zap : s.trend === "stable" ? TrendingUp : Clock;
              const trendColor = s.trend === "accelerating" ? "text-accent-rose" : s.trend === "stable" ? "text-accent-amber" : "text-navy-400";
              const TrendIcon = trendIcon;

              return (
                <div key={s.sector} className="grid grid-cols-12 gap-2 px-4 py-2.5 border-t border-navy-700/10 hover:bg-navy-800/20 transition-colors">
                  <div className="col-span-3 flex items-center">
                    <span className="text-[11px] text-navy-200">{s.sector}</span>
                  </div>
                  <div className="col-span-3 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-navy-700/30 rounded-full overflow-hidden">
                      <div className={`h-full ${riskColor}/50 rounded-full`} style={{ width: `${s.automationRisk}%` }} />
                    </div>
                    <span className="text-[11px] font-mono text-navy-200 w-8 text-right">{s.automationRisk}%</span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end">
                    <span className="text-[11px] font-mono text-navy-300">{s.aiAdoption}%</span>
                  </div>
                  <div className="col-span-1 flex items-center justify-end">
                    <span className="text-[10px] text-navy-400">{s.jobsAtRisk}</span>
                  </div>
                  <div className="col-span-1 flex items-center justify-end">
                    <span className="text-[10px] font-mono text-navy-500">{s.timeframe}</span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    <TrendIcon className={`h-3 w-3 ${trendColor}`} />
                    <span className={`text-[10px] font-mono uppercase ${trendColor}`}>{s.trend}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
