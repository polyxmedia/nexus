"use client";

import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { UpgradeGate } from "@/components/subscription/upgrade-gate";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

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

interface FREDDataPoint {
  value: number;
  date: string;
}

interface FREDLaborData {
  unemploymentRate: FREDDataPoint | null;
  initialClaims: FREDDataPoint | null;
  nonfarmPayrolls: FREDDataPoint | null;
  laborForceParticipation: FREDDataPoint | null;
  source: string;
  lastFetched: string;
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
  fred: FREDLaborData | null;
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
      <PageContainer title="AI Progression" subtitle="Capability tracking and labor displacement analysis">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded" />)}
        </div>
      </PageContainer>
    );
  }

  if (!data) {
    return (
      <PageContainer title="AI Progression" subtitle="Capability tracking and labor displacement analysis">
        <p className="text-sm text-navy-500">Failed to load AI progression data.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="AI Progression"
      subtitle="Capability tracking and labor displacement analysis"
    >
      <UpgradeGate minTier="operator" feature="AI progression tracking" blur>
      {/* ── Composite Score ── */}
      <div className="border border-navy-800/60 rounded bg-navy-950/80 p-5 mb-8">
        <div className="flex items-end justify-between mb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600">Composite Score</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-mono font-light text-navy-100 tabular-nums">{data.compositeScore}</span>
              <span className="text-sm font-mono text-navy-600">/100</span>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-navy-500 border border-navy-800/60 px-2.5 py-1 rounded">{data.regime}</span>
        </div>
        <div className="h-px bg-navy-800/60 mb-4" />
        <div className="h-1 bg-navy-900 rounded-full overflow-hidden">
          <div className="h-full bg-navy-500/40 rounded-full transition-all duration-700" style={{ width: `${data.compositeScore}%` }} />
        </div>
      </div>

      {/* ── Key Displacement Figures ── */}
      {data.displacement && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-navy-800/30 rounded overflow-hidden mb-8">
          {[
            { label: "Enterprise Adoption", value: `${data.displacement.enterpriseAdoption}%`, delta: "up" },
            { label: "Replacing Workers", value: `${data.displacement.aiReplacementRate}%`, delta: "up" },
            { label: "Productivity Gain", value: `${data.displacement.productivityGain}h/wk`, delta: "neutral" },
            { label: "Routine Job Decline", value: `${data.displacement.routineJobDecline}%`, delta: "down" },
            { label: "Technical Job Growth", value: `+${data.displacement.technicalJobGrowth}%`, delta: "up" },
            { label: "AI-Assisted Work", value: `${data.displacement.aiWorkPercentage}%`, delta: "up" },
          ].map((m, i) => (
            <div key={i} className="bg-navy-950/80 p-4">
              <span className="text-[9px] font-mono uppercase tracking-wider text-navy-600 block mb-1">{m.label}</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-mono font-light text-navy-200 tabular-nums">{m.value}</span>
                {m.delta === "up" && <ArrowUpRight className="h-3 w-3 text-navy-500" />}
                {m.delta === "down" && <ArrowDownRight className="h-3 w-3 text-navy-500" />}
                {m.delta === "neutral" && <Minus className="h-3 w-3 text-navy-600" />}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── FRED Labor Market ── */}
      {data.fred && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600">Labor Market (FRED)</span>
            <a href={data.fred.source} target="_blank" rel="noopener noreferrer" className="text-[9px] font-mono text-navy-600 hover:text-navy-400 transition-colors flex items-center gap-1">
              Source <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-navy-800/30 rounded overflow-hidden">
            {[
              {
                label: "Unemployment",
                value: data.fred.unemploymentRate ? `${data.fred.unemploymentRate.value.toFixed(1)}%` : "--",
                series: "UNRATE",
                date: data.fred.unemploymentRate?.date,
              },
              {
                label: "Initial Claims",
                value: data.fred.initialClaims ? `${(data.fred.initialClaims.value / 1000).toFixed(0)}K` : "--",
                series: "ICSA",
                date: data.fred.initialClaims?.date,
              },
              {
                label: "Nonfarm Payrolls",
                value: data.fred.nonfarmPayrolls ? `${(data.fred.nonfarmPayrolls.value / 1000).toFixed(1)}M` : "--",
                series: "PAYEMS",
                date: data.fred.nonfarmPayrolls?.date,
              },
              {
                label: "Participation Rate",
                value: data.fred.laborForceParticipation ? `${data.fred.laborForceParticipation.value.toFixed(1)}%` : "--",
                series: "CIVPART",
                date: data.fred.laborForceParticipation?.date,
              },
            ].map((m) => (
              <div key={m.series} className="bg-navy-950/80 p-4">
                <span className="text-[9px] font-mono uppercase tracking-wider text-navy-600 block mb-1">{m.label}</span>
                <span className="text-lg font-mono font-light text-navy-200 tabular-nums block">{m.value}</span>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[8px] font-mono text-navy-700">{m.series}</span>
                  {m.date && <span className="text-[8px] font-mono text-navy-700">{m.date}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Left Column ── */}
        <div className="space-y-8">
          {/* Remote Labor Index */}
          {data.rli && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600">Remote Labor Index</span>
                <a href={data.rli.source} target="_blank" rel="noopener noreferrer" className="text-[9px] font-mono text-navy-600 hover:text-navy-400 transition-colors flex items-center gap-1">
                  remotelabor.ai <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>

              <div className="border border-navy-800/60 rounded bg-navy-950/80 p-4">
                <p className="text-[11px] text-navy-500 mb-4 leading-relaxed">{data.rli.description}</p>

                <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 pb-4 border-b border-navy-800/40">
                  <div>
                    <span className="text-[9px] font-mono text-navy-600 block mb-0.5">Best Rate</span>
                    <span className="text-xl font-mono font-light text-navy-200 tabular-nums">{data.rli.bestRate.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-navy-600 block mb-0.5">Work Hours</span>
                    <span className="text-sm font-mono text-navy-300 tabular-nums">{data.rli.totalWorkHours.toLocaleString()}+</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-navy-600 block mb-0.5">Project Value</span>
                    <span className="text-sm font-mono text-navy-300 tabular-nums">${(data.rli.totalValue / 1000).toFixed(0)}K+</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {data.rli.models.map((m) => (
                    <div key={m.name} className="flex items-center gap-3">
                      <span className="text-[10px] text-navy-400 w-24 sm:w-36 truncate">{m.name}</span>
                      <div className="flex-1 h-1 bg-navy-800/60 rounded-full overflow-hidden">
                        <div className="h-full bg-navy-500/50 rounded-full transition-all duration-500" style={{ width: `${Math.min(m.automationRate * 10, 100)}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-navy-400 w-10 text-right tabular-nums">{m.automationRate.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* METR Time Horizons */}
          {data.metr && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600">METR Time Horizons</span>
                <a href={data.metr.source} target="_blank" rel="noopener noreferrer" className="text-[9px] font-mono text-navy-600 hover:text-navy-400 transition-colors flex items-center gap-1">
                  metr.org <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>

              <div className="border border-navy-800/60 rounded bg-navy-950/80 p-4">
                <p className="text-[11px] text-navy-500 mb-4 leading-relaxed">{data.metr.description}</p>

                <div className="mb-4 pb-4 border-b border-navy-800/40">
                  <span className="text-[9px] font-mono text-navy-600 block mb-0.5">Capability Doubling Time</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-mono font-light text-navy-200 tabular-nums">{data.metr.doublingTimeDays}</span>
                    <span className="text-xs font-mono text-navy-500">days</span>
                  </div>
                </div>

                <table className="w-full">
                  <thead>
                    <tr className="border-b border-navy-800/40">
                      <th className="text-left text-[9px] font-mono font-normal text-navy-600 uppercase tracking-wider pb-2">Model</th>
                      <th className="text-right text-[9px] font-mono font-normal text-navy-600 uppercase tracking-wider pb-2">50% Horizon</th>
                      <th className="text-right text-[9px] font-mono font-normal text-navy-600 uppercase tracking-wider pb-2">80% Horizon</th>
                      <th className="text-right text-[9px] font-mono font-normal text-navy-600 uppercase tracking-wider pb-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.metr.latestModels.map((m) => (
                      <tr key={m.model} className="border-b border-navy-800/20 last:border-0">
                        <td className="text-[10px] text-navy-300 py-2">{m.model}</td>
                        <td className="text-[10px] font-mono text-navy-300 text-right py-2 tabular-nums">{m.fiftyPctHorizon}</td>
                        <td className="text-[10px] font-mono text-navy-400 text-right py-2 tabular-nums">{m.eightyPctHorizon}</td>
                        <td className="text-[10px] font-mono text-navy-600 text-right py-2">{m.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Column ── */}
        <div className="space-y-8">
          {/* AI 2027 Timeline */}
          {data.ai2027 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600">AI 2027 Scenario Timeline</span>
                <a href={data.ai2027.source} target="_blank" rel="noopener noreferrer" className="text-[9px] font-mono text-navy-600 hover:text-navy-400 transition-colors flex items-center gap-1">
                  ai-2027.com <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>

              <div className="border border-navy-800/60 rounded bg-navy-950/80 p-4">
                <div className="mb-4 pb-4 border-b border-navy-800/40">
                  <span className="text-[9px] font-mono text-navy-600 block mb-0.5">Progress vs Prediction</span>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-xl font-mono font-light text-navy-200 tabular-nums">{data.ai2027.progressPace}%</span>
                    <span className="text-[10px] font-mono text-navy-600">{data.ai2027.adjustedTimeline}</span>
                  </div>
                  <div className="h-1 bg-navy-800/60 rounded-full overflow-hidden">
                    <div className="h-full bg-navy-500/50 rounded-full" style={{ width: `${data.ai2027.progressPace}%` }} />
                  </div>
                </div>

                <div className="space-y-0">
                  {data.ai2027.milestones.map((m, i) => {
                    const dotColor = m.status === "passed" ? "bg-navy-400"
                      : m.status === "on_track" ? "bg-navy-500"
                      : m.status === "delayed" ? "bg-accent-amber/60"
                      : "bg-navy-700";

                    return (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-2 h-2 rounded-full ${dotColor} shrink-0 mt-1.5`} />
                          {i < data.ai2027!.milestones.length - 1 && <div className="w-px flex-1 bg-navy-800/40 min-h-[16px]" />}
                        </div>
                        <div className="pb-4 min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-mono text-navy-600 tabular-nums">{m.date}</span>
                            <span className="text-[8px] font-mono uppercase text-navy-600 border border-navy-800/40 px-1.5 py-0.5 rounded">{m.category}</span>
                            {m.status === "passed" && <span className="text-[8px] font-mono text-navy-500 ml-auto">PASSED</span>}
                            {m.status === "delayed" && <span className="text-[8px] font-mono text-accent-amber/70 ml-auto">DELAYED</span>}
                          </div>
                          <span className="text-[11px] text-navy-300 block">{m.title}</span>
                          <span className="text-[10px] text-navy-500 leading-relaxed block mt-0.5">{m.description}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Sector Automation Risk ── */}
      {data.sectors.length > 0 && (
        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600">Sector Automation Risk</span>
            <div className="flex items-center gap-4 text-[9px] font-mono text-navy-600">
              <span>Accelerating</span>
              <span>Stable</span>
              <span>Early</span>
            </div>
          </div>

          <div className="border border-navy-800/60 rounded bg-navy-950/80 overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-navy-800/40">
                  <th className="text-left text-[9px] font-mono font-normal text-navy-600 uppercase tracking-wider px-4 py-2.5 w-48">Sector</th>
                  <th className="text-left text-[9px] font-mono font-normal text-navy-600 uppercase tracking-wider px-4 py-2.5">Automation Risk</th>
                  <th className="text-right text-[9px] font-mono font-normal text-navy-600 uppercase tracking-wider px-4 py-2.5">Adoption</th>
                  <th className="text-right text-[9px] font-mono font-normal text-navy-600 uppercase tracking-wider px-4 py-2.5">Jobs at Risk</th>
                  <th className="text-right text-[9px] font-mono font-normal text-navy-600 uppercase tracking-wider px-4 py-2.5">Timeframe</th>
                  <th className="text-right text-[9px] font-mono font-normal text-navy-600 uppercase tracking-wider px-4 py-2.5">Trend</th>
                </tr>
              </thead>
              <tbody>
                {data.sectors.map((s) => (
                  <tr key={s.sector} className="border-b border-navy-800/20 last:border-0 hover:bg-navy-900/40 transition-colors">
                    <td className="text-[11px] text-navy-300 px-4 py-2.5">{s.sector}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-navy-800/60 rounded-full overflow-hidden max-w-[120px]">
                          <div
                            className="h-full bg-navy-400/40 rounded-full"
                            style={{ width: `${s.automationRisk}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-navy-400 tabular-nums w-8 text-right">{s.automationRisk}%</span>
                      </div>
                    </td>
                    <td className="text-[10px] font-mono text-navy-400 text-right px-4 py-2.5 tabular-nums">{s.aiAdoption}%</td>
                    <td className="text-[10px] text-navy-500 text-right px-4 py-2.5">{s.jobsAtRisk}</td>
                    <td className="text-[10px] font-mono text-navy-600 text-right px-4 py-2.5">{s.timeframe}</td>
                    <td className="text-right px-4 py-2.5">
                      <span className={`text-[9px] font-mono uppercase ${s.trend === "accelerating" ? "text-navy-300" : s.trend === "stable" ? "text-navy-500" : "text-navy-600"}`}>
                        {s.trend}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </UpgradeGate>
    </PageContainer>
  );
}
