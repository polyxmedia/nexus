"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  Swords,
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  ChevronRight,
  Target,
  Zap,
  Users,
  BarChart3,
  ArrowRight,
  Globe,
} from "lucide-react";
import Link from "next/link";
import { UpgradeGate } from "@/components/subscription/upgrade-gate";

// ── Types ──

interface ActorRef {
  id: string;
  name: string;
  shortName: string;
}

interface MarketImpact {
  direction: "bullish" | "bearish" | "mixed" | "neutral";
  magnitude: "low" | "medium" | "high";
  sectors: string[];
  description?: string;
}

interface NashEquilibrium {
  strategies: Record<string, string>;
  payoffs: Record<string, number>;
  stability: "stable" | "unstable" | "mixed";
  marketImpact: MarketImpact;
}

interface SchellingPoint {
  strategy: Record<string, string>;
  reasoning: string;
  probability: number;
}

interface EscalationStep {
  level: number;
  description: string;
  trigger: string;
  probability: number;
  marketImpact: MarketImpact;
}

interface ScenarioData {
  id: string;
  title: string;
  description: string;
  actors: ActorRef[];
  strategies: Record<string, string[]>;
  marketSectors: string[];
  timeHorizon: string;
}

interface AnalysisData {
  scenarioId: string;
  nashEquilibria: NashEquilibrium[];
  schellingPoints: SchellingPoint[];
  escalationLadder: EscalationStep[];
  dominantStrategies: Record<string, string | null>;
  marketAssessment: {
    mostLikelyOutcome: string;
    direction: "bullish" | "bearish" | "mixed" | "neutral";
    confidence: number;
    keySectors: string[];
  };
}

interface ScenarioAnalysis {
  scenario: ScenarioData;
  analysis: AnalysisData;
}

// ── Helpers ──

const DIRECTION_CONFIG = {
  bullish: { label: "Bullish", color: "#10b981", icon: TrendingUp },
  bearish: { label: "Bearish", color: "#f43f5e", icon: TrendingDown },
  mixed: { label: "Mixed", color: "#f59e0b", icon: Minus },
  neutral: { label: "Neutral", color: "#64748b", icon: Minus },
};

const STABILITY_CONFIG = {
  stable: { label: "Stable", color: "#10b981" },
  unstable: { label: "Unstable", color: "#f43f5e" },
  mixed: { label: "Mixed", color: "#f59e0b" },
};

const ESCALATION_COLORS = [
  "#10b981", "#06b6d4", "#f59e0b", "#f97316", "#ef4444"
];

const HORIZON_LABELS: Record<string, string> = {
  short_term: "1-3 months",
  medium_term: "3-12 months",
  long_term: "1-3 years",
};

function DirectionBadge({ direction, size = "sm" }: { direction: string; size?: "sm" | "md" }) {
  const cfg = DIRECTION_CONFIG[direction as keyof typeof DIRECTION_CONFIG] || DIRECTION_CONFIG.neutral;
  const Icon = cfg.icon;
  const isMd = size === "md";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-mono uppercase tracking-wider ${
        isMd ? "px-2 py-1 text-[11px]" : "px-1.5 py-0.5 text-[10px]"
      }`}
      style={{ color: cfg.color, backgroundColor: `${cfg.color}15`, border: `1px solid ${cfg.color}30` }}
    >
      <Icon className={isMd ? "h-3 w-3" : "h-2.5 w-2.5"} />
      {cfg.label}
    </span>
  );
}

function ConfidenceBar({ value, color = "#06b6d4", label }: { value: number; color?: string; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-[9px] font-mono text-navy-500 uppercase tracking-wider w-12 shrink-0">{label}</span>}
      <div className="flex-1 h-1.5 bg-navy-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value * 100}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-mono text-navy-400 w-8 text-right">{(value * 100).toFixed(0)}%</span>
    </div>
  );
}

function MagnitudePips({ magnitude }: { magnitude: string }) {
  const level = magnitude === "high" ? 3 : magnitude === "medium" ? 2 : 1;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-1.5 h-3 rounded-sm ${i <= level ? (level === 3 ? "bg-accent-rose" : level === 2 ? "bg-accent-amber" : "bg-navy-400") : "bg-navy-800"}`}
        />
      ))}
    </div>
  );
}

type Tab = "assessment" | "nash" | "escalation" | "schelling" | "matrix";

function ScenarioDetail({ item }: { item: ScenarioAnalysis }) {
  const [tab, setTab] = useState<Tab>("assessment");
  const { scenario, analysis } = item;
  const assessment = analysis.marketAssessment;

  const tabs: { id: Tab; label: string; icon: typeof Target; count?: number }[] = [
    { id: "assessment", label: "Assessment", icon: Target },
    { id: "matrix", label: "Payoff Matrix", icon: BarChart3 },
    { id: "nash", label: "Nash Equilibria", icon: Zap, count: analysis.nashEquilibria.length },
    { id: "escalation", label: "Escalation", icon: Swords, count: analysis.escalationLadder.length },
    { id: "schelling", label: "Focal Points", icon: Users, count: analysis.schellingPoints.length },
  ];

  // Build payoff grid for matrix view
  const actor1 = scenario.actors[0];
  const actor2 = scenario.actors[1];
  const strats1 = scenario.strategies[actor1?.id] || [];
  const strats2 = scenario.strategies[actor2?.id] || [];

  // Find the Nash equilibrium strategies for highlighting
  const nashStrategySets = analysis.nashEquilibria.map((eq) => eq.strategies);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Scenario header */}
      <div className="px-6 pt-5 pb-4 border-b border-navy-800/40">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <h2 className="text-base font-bold text-navy-100 leading-snug mb-1">{scenario.title}</h2>
            <p className="text-xs text-navy-400 leading-relaxed font-sans">{scenario.description}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <DirectionBadge direction={assessment.direction} size="md" />
            <span className="text-[10px] font-mono text-navy-500">
              {(assessment.confidence * 100).toFixed(0)}% confidence
            </span>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="border border-navy-700/30 rounded px-3 py-2 bg-navy-950/40">
            <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 block">Actors</span>
            <span className="text-xs text-navy-200">{scenario.actors.map(a => a.shortName).join(" vs ")}</span>
          </div>
          <div className="border border-navy-700/30 rounded px-3 py-2 bg-navy-950/40">
            <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 block">Horizon</span>
            <span className="text-xs text-navy-200">{HORIZON_LABELS[scenario.timeHorizon] || scenario.timeHorizon}</span>
          </div>
          <div className="border border-navy-700/30 rounded px-3 py-2 bg-navy-950/40">
            <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 block">Equilibria</span>
            <span className="text-xs text-navy-200">{analysis.nashEquilibria.length} found</span>
          </div>
          <div className="border border-navy-700/30 rounded px-3 py-2 bg-navy-950/40">
            <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 block">Sectors</span>
            <span className="text-xs text-navy-200 truncate block">{scenario.marketSectors.join(", ")}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 px-6 border-b border-navy-800/40 overflow-x-auto">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 pb-2.5 pt-3 px-3 text-[10px] font-mono uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id
                  ? "border-accent-cyan text-accent-cyan"
                  : "border-transparent text-navy-500 hover:text-navy-300"
              }`}
            >
              <Icon className="h-3 w-3" />
              {t.label}
              {t.count !== undefined && (
                <span className={`ml-0.5 text-[9px] ${tab === t.id ? "text-accent-cyan/60" : "text-navy-600"}`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="px-6 py-5">
        {/* ── Market Assessment ── */}
        {tab === "assessment" && (
          <div className="space-y-5">
            {/* Most likely outcome */}
            <div className="border border-navy-700/30 rounded-lg p-5 bg-navy-900/40">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-3.5 w-3.5 text-accent-cyan" />
                <span className="text-[10px] text-navy-500 uppercase tracking-wider font-mono">Most Likely Outcome</span>
              </div>
              <p className="text-sm text-navy-200 leading-relaxed font-sans mb-4">{assessment.mostLikelyOutcome}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] text-navy-600 font-mono block mb-1.5">Market Direction</span>
                  <DirectionBadge direction={assessment.direction} size="md" />
                </div>
                <div>
                  <span className="text-[9px] text-navy-600 font-mono block mb-1.5">Confidence</span>
                  <ConfidenceBar value={assessment.confidence} />
                </div>
              </div>
              {assessment.keySectors.length > 0 && (
                <div className="mt-4 pt-4 border-t border-navy-700/20">
                  <span className="text-[9px] text-navy-600 font-mono block mb-2">Affected Sectors</span>
                  <div className="flex flex-wrap gap-1.5">
                    {assessment.keySectors.map(s => (
                      <span key={s} className="text-[10px] font-mono px-2 py-1 rounded bg-accent-cyan/8 text-accent-cyan border border-accent-cyan/20">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Dominant Strategies */}
            {Object.keys(analysis.dominantStrategies).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-3.5 w-3.5 text-accent-amber" />
                  <span className="text-[10px] text-navy-500 uppercase tracking-wider font-mono">Dominant Strategies</span>
                </div>
                <div className="space-y-2">
                  {Object.entries(analysis.dominantStrategies).map(([actorId, strat]) => {
                    const actor = scenario.actors.find(a => a.id === actorId);
                    return (
                      <div key={actorId} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-navy-900/40 border border-navy-700/20">
                        <Shield className="h-3.5 w-3.5 text-navy-500 shrink-0" />
                        <span className="text-xs font-semibold text-navy-200 w-16 shrink-0">{actor?.shortName || actorId}</span>
                        <ArrowRight className="h-3 w-3 text-navy-600 shrink-0" />
                        {strat ? (
                          <span className="text-xs text-accent-cyan font-mono">{strat}</span>
                        ) : (
                          <span className="text-xs text-navy-600 font-mono italic">No dominant strategy</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actor Cards */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-3.5 w-3.5 text-navy-500" />
                <span className="text-[10px] text-navy-500 uppercase tracking-wider font-mono">Actors & Strategies</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {scenario.actors.map(actor => (
                  <div key={actor.id} className="border border-navy-700/30 rounded-lg p-4 bg-navy-900/30">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-full bg-navy-800 border border-navy-700/50 flex items-center justify-center">
                        <span className="text-[9px] font-bold font-mono text-navy-300">{actor.shortName.slice(0, 2)}</span>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-navy-200 block leading-tight">{actor.name}</span>
                        <span className="text-[9px] text-navy-500 font-mono">{(scenario.strategies[actor.id] || []).length} strategies</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {(scenario.strategies[actor.id] || []).map(s => {
                        const isDominant = analysis.dominantStrategies[actor.id] === s;
                        return (
                          <div
                            key={s}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-[11px] ${
                              isDominant
                                ? "bg-accent-cyan/8 text-accent-cyan border border-accent-cyan/20"
                                : "text-navy-400 bg-navy-950/40"
                            }`}
                          >
                            <ChevronRight className="h-2.5 w-2.5 shrink-0 opacity-50" />
                            <span className="font-sans">{s}</span>
                            {isDominant && <span className="ml-auto text-[8px] font-mono uppercase tracking-wider opacity-60">dominant</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Payoff Matrix ── */}
        {tab === "matrix" && actor1 && actor2 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-3.5 w-3.5 text-accent-cyan" />
              <span className="text-[10px] text-navy-500 uppercase tracking-wider font-mono">
                {actor1.shortName} vs {actor2.shortName} Payoff Matrix
              </span>
            </div>

            {/* Matrix table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 text-left">
                      <span className="text-[9px] font-mono text-navy-600 uppercase">
                        {actor1.shortName} \ {actor2.shortName}
                      </span>
                    </th>
                    {strats2.map(s2 => (
                      <th key={s2} className="p-2 text-center">
                        <span className="text-[10px] font-mono text-navy-400">{s2}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {strats1.map(s1 => (
                    <tr key={s1}>
                      <td className="p-2 border-t border-navy-800/30">
                        <span className="text-[10px] font-mono text-navy-400">{s1}</span>
                      </td>
                      {strats2.map(s2 => {
                        const isNash = nashStrategySets.some(
                          ns => ns[actor1.id] === s1 && ns[actor2.id] === s2
                        );
                        // Find the equilibrium for this cell to get its stability
                        const nashEq = isNash ? analysis.nashEquilibria.find(
                          eq => eq.strategies[actor1.id] === s1 && eq.strategies[actor2.id] === s2
                        ) : null;
                        const stabCfg = nashEq ? STABILITY_CONFIG[nashEq.stability] : null;
                        // Find the payoff entry from the analysis escalation or nash data
                        const nash = analysis.nashEquilibria.find(
                          eq => eq.strategies[actor1.id] === s1 && eq.strategies[actor2.id] === s2
                        );
                        // Approximate payoffs from escalation ladder or nash
                        const escStep = analysis.escalationLadder.find(
                          step => step.description.includes(s1) && step.description.includes(s2)
                        );
                        const payoff1 = nash?.payoffs[actor1.id];
                        const payoff2 = nash?.payoffs[actor2.id];
                        const impact = nash?.marketImpact || escStep?.marketImpact;

                        return (
                          <td
                            key={s2}
                            className={`p-2 border-t border-l border-navy-800/30 text-center ${
                              isNash ? "bg-accent-cyan/[0.06]" : ""
                            }`}
                          >
                            <div className={`rounded-lg p-2.5 border transition-colors ${
                              isNash
                                ? "border-accent-cyan/30 bg-accent-cyan/[0.04]"
                                : "border-navy-800/20 bg-navy-900/30 hover:border-navy-700/40"
                            }`}>
                              {payoff1 !== undefined && payoff2 !== undefined ? (
                                <div className="flex items-center justify-center gap-2 mb-1.5">
                                  <span className={`text-xs font-bold font-mono ${payoff1 > 0 ? "text-accent-emerald" : payoff1 < 0 ? "text-accent-rose" : "text-navy-400"}`}>
                                    {payoff1 > 0 ? "+" : ""}{payoff1}
                                  </span>
                                  <span className="text-[9px] text-navy-600">/</span>
                                  <span className={`text-xs font-bold font-mono ${payoff2 > 0 ? "text-accent-emerald" : payoff2 < 0 ? "text-accent-rose" : "text-navy-400"}`}>
                                    {payoff2 > 0 ? "+" : ""}{payoff2}
                                  </span>
                                </div>
                              ) : (
                                <div className="text-[10px] text-navy-600 mb-1.5 font-mono">--</div>
                              )}
                              {impact && (
                                <div className="flex items-center justify-center gap-1.5">
                                  <DirectionBadge direction={impact.direction} />
                                  <MagnitudePips magnitude={impact.magnitude} />
                                </div>
                              )}
                              {isNash && stabCfg && (
                                <div className="mt-1.5">
                                  <span
                                    className="text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded"
                                    style={{ color: stabCfg.color, backgroundColor: `${stabCfg.color}15` }}
                                  >
                                    Nash - {stabCfg.label}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-4 mt-4 text-[9px] text-navy-600 font-mono">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded border border-accent-cyan/30 bg-accent-cyan/[0.06]" />
                Nash Equilibrium
              </div>
              <span>Payoffs shown as {actor1.shortName} / {actor2.shortName}</span>
            </div>
          </div>
        )}

        {/* ── Nash Equilibria ── */}
        {tab === "nash" && (
          <div className="space-y-3">
            {analysis.nashEquilibria.length === 0 ? (
              <div className="text-center py-16">
                <Zap className="h-8 w-8 text-navy-700 mx-auto mb-3" />
                <p className="text-xs text-navy-500 font-sans">No Nash equilibria found for this scenario.</p>
                <p className="text-[10px] text-navy-600 font-sans mt-1">This may indicate a highly unstable strategic environment.</p>
              </div>
            ) : (
              analysis.nashEquilibria.map((eq, i) => {
                const stabCfg = STABILITY_CONFIG[eq.stability];
                return (
                  <div key={i} className="border border-navy-700/30 rounded-lg overflow-hidden">
                    {/* Equilibrium header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-navy-900/40 border-b border-navy-800/30">
                      <div className="flex items-center gap-2">
                        <Zap className="h-3.5 w-3.5 text-accent-cyan" />
                        <span className="text-[10px] font-mono uppercase tracking-wider text-navy-400">Equilibrium {i + 1}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-mono px-2 py-0.5 rounded"
                          style={{ color: stabCfg.color, backgroundColor: `${stabCfg.color}15`, border: `1px solid ${stabCfg.color}25` }}
                        >
                          {stabCfg.label}
                        </span>
                        <DirectionBadge direction={eq.marketImpact.direction} />
                        <MagnitudePips magnitude={eq.marketImpact.magnitude} />
                      </div>
                    </div>

                    <div className="p-4">
                      {/* Strategy + Payoff cards */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        {Object.entries(eq.strategies).map(([actorId, strat]) => {
                          const actor = scenario.actors.find(a => a.id === actorId);
                          const payoff = eq.payoffs[actorId];
                          return (
                            <div key={actorId} className="bg-navy-950/40 rounded-lg px-4 py-3 border border-navy-800/20">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] text-navy-500 font-mono uppercase tracking-wider">{actor?.shortName || actorId}</span>
                                <span className={`text-sm font-bold font-mono ${payoff > 0 ? "text-accent-emerald" : payoff < 0 ? "text-accent-rose" : "text-navy-400"}`}>
                                  {payoff > 0 ? "+" : ""}{payoff}
                                </span>
                              </div>
                              <span className="text-xs text-navy-200 font-sans">{strat}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Affected sectors */}
                      {eq.marketImpact.sectors.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] font-mono text-navy-600 uppercase tracking-wider">Sectors:</span>
                          {eq.marketImpact.sectors.map(s => (
                            <span key={s} className="text-[10px] font-mono text-navy-400 px-1.5 py-0.5 rounded bg-navy-800/40">{s}</span>
                          ))}
                        </div>
                      )}
                      {eq.marketImpact.description && (
                        <p className="text-[11px] text-navy-500 font-sans mt-2 italic">{eq.marketImpact.description}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Escalation Ladder ── */}
        {tab === "escalation" && (
          <div className="space-y-0">
            {analysis.escalationLadder.length === 0 ? (
              <div className="text-center py-16">
                <Swords className="h-8 w-8 text-navy-700 mx-auto mb-3" />
                <p className="text-xs text-navy-500 font-sans">No escalation steps identified.</p>
              </div>
            ) : (
              analysis.escalationLadder.map((step, i) => {
                const color = ESCALATION_COLORS[Math.min(step.level - 1, 4)];
                const isLast = i === analysis.escalationLadder.length - 1;
                return (
                  <div key={i} className="flex gap-4">
                    {/* Level indicator */}
                    <div className="flex flex-col items-center shrink-0 w-10">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold font-mono shrink-0"
                        style={{ backgroundColor: `${color}18`, color, border: `2px solid ${color}35` }}
                      >
                        {step.level}
                      </div>
                      {!isLast && (
                        <div className="w-px flex-1 my-1" style={{ backgroundColor: `${color}25` }} />
                      )}
                    </div>

                    {/* Step content */}
                    <div className={`flex-1 ${isLast ? "pb-0" : "pb-5"}`}>
                      <div className="border border-navy-700/20 rounded-lg p-4 bg-navy-900/30 hover:border-navy-700/40 transition-colors">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <span className="text-xs text-navy-200 font-medium leading-snug font-sans">{step.description}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <DirectionBadge direction={step.marketImpact.direction} />
                            <MagnitudePips magnitude={step.marketImpact.magnitude} />
                          </div>
                        </div>
                        <p className="text-[11px] text-navy-500 font-sans leading-relaxed mb-3">{step.trigger}</p>
                        <ConfidenceBar value={step.probability} color={color} label="Prob" />
                        {step.marketImpact.sectors.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {step.marketImpact.sectors.map(s => (
                              <span key={s} className="text-[9px] font-mono text-navy-500 px-1.5 py-0.5 rounded bg-navy-800/40">{s}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Schelling / Focal Points ── */}
        {tab === "schelling" && (
          <div className="space-y-3">
            {analysis.schellingPoints.length === 0 ? (
              <div className="text-center py-16">
                <Users className="h-8 w-8 text-navy-700 mx-auto mb-3" />
                <p className="text-xs text-navy-500 font-sans">No Schelling focal points identified.</p>
                <p className="text-[10px] text-navy-600 font-sans mt-1">Actors lack an obvious coordination point.</p>
              </div>
            ) : (
              analysis.schellingPoints.map((pt, i) => (
                <div key={i} className="border border-navy-700/30 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-navy-900/40 border-b border-navy-800/30">
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-accent-amber" />
                      <span className="text-[10px] font-mono uppercase tracking-wider text-navy-400">Focal Point {i + 1}</span>
                    </div>
                    <div className="w-40">
                      <ConfidenceBar value={pt.probability} color="#f59e0b" />
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-navy-400 leading-relaxed font-sans mb-4">{pt.reasoning}</p>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(pt.strategy).map(([actorId, strat]) => {
                        const actor = scenario.actors.find(a => a.id === actorId);
                        return (
                          <div key={actorId} className="bg-navy-950/40 rounded-lg px-4 py-3 border border-navy-800/20">
                            <span className="text-[10px] text-navy-500 font-mono uppercase tracking-wider block mb-1">{actor?.shortName || actorId}</span>
                            <span className="text-xs text-navy-200 font-sans">{strat}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──

export default function GameTheoryPage() {
  const [items, setItems] = useState<ScenarioAnalysis[]>([]);
  const [selected, setSelected] = useState<ScenarioAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchScenarios = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/game-theory");
      const data = await res.json();
      const scenarios: ScenarioAnalysis[] = data.scenarios || [];
      setItems(scenarios);
      if (scenarios.length > 0) setSelected(scenarios[0]);
    } catch { /* fail silently */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchScenarios(); }, [fetchScenarios]);

  return (
    <div className="ml-0 md:ml-48 h-screen flex flex-col bg-navy-950 pt-12 md:pt-0">
      <UpgradeGate minTier="analyst" feature="Game theory analysis" blur>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-navy-700/50 px-6 h-14 shrink-0">
        <div className="flex items-center gap-3">
          <Swords className="h-4 w-4 text-accent-rose" />
          <div>
            <h1 className="text-sm font-bold text-navy-100 tracking-wide">Game Theory</h1>
            <p className="text-[10px] text-navy-500 uppercase tracking-wider font-mono">
              {items.length} strategic scenario{items.length !== 1 ? "s" : ""} analysed
            </p>
          </div>
        </div>
        <Link
          href="/game-theory/global"
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-accent-cyan border border-accent-cyan/20 rounded hover:bg-accent-cyan/10 transition-colors"
        >
          <Globe className="h-3 w-3" />
          Global Scenario
        </Link>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-navy-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-xs font-mono">Analysing strategic scenarios...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Swords className="h-10 w-10 text-navy-700" />
          <p className="text-sm text-navy-500 font-sans">No scenarios configured</p>
          <p className="text-xs text-navy-600 font-sans">Strategic scenarios can be configured in the game theory module.</p>
        </div>
      ) : (
        <div className="flex-1 flex min-h-0">
          {/* Scenario list */}
          <div className="w-72 shrink-0 border-r border-navy-800/40 overflow-y-auto bg-navy-950">
            <div className="p-2 space-y-1">
              {items.map(item => {
                const isSelected = selected?.scenario.id === item.scenario.id;
                const assessment = item.analysis.marketAssessment;
                const dirCfg = DIRECTION_CONFIG[assessment.direction] || DIRECTION_CONFIG.neutral;
                const nashCount = item.analysis.nashEquilibria.length;
                const stableCount = item.analysis.nashEquilibria.filter(n => n.stability === "stable").length;
                return (
                  <button
                    key={item.scenario.id}
                    onClick={() => setSelected(item)}
                    className={`w-full text-left px-3.5 py-3 rounded-lg transition-all ${
                      isSelected
                        ? "bg-navy-900/80 border border-navy-700/40"
                        : "border border-transparent hover:bg-navy-900/40 hover:border-navy-800/30"
                    }`}
                  >
                    <div className="text-xs font-semibold text-navy-200 leading-snug mb-1.5">{item.scenario.title}</div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded"
                        style={{ color: dirCfg.color, backgroundColor: `${dirCfg.color}12` }}
                      >
                        {dirCfg.label}
                      </span>
                      <span className="text-[9px] text-navy-500 font-mono">
                        {(assessment.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-navy-600 font-mono">
                        {item.scenario.actors.map(a => a.shortName).join(" vs ")}
                      </span>
                      <span className="text-[9px] text-navy-600 font-mono">
                        {nashCount} eq{nashCount !== 1 ? "" : ""}{stableCount > 0 ? ` (${stableCount} stable)` : ""}
                      </span>
                    </div>
                    <div className="text-[9px] text-navy-600 font-mono mt-0.5">
                      {HORIZON_LABELS[item.scenario.timeHorizon] || item.scenario.timeHorizon}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detail panel */}
          {selected ? (
            <ScenarioDetail item={selected} />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Swords className="h-10 w-10 text-navy-700 mx-auto mb-3" />
                <p className="text-sm text-navy-500 font-sans">Select a scenario to analyse</p>
              </div>
            </div>
          )}
        </div>
      )}
      </UpgradeGate>
    </div>
  );
}
