"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Crosshair, Shield, Swords, Target } from "lucide-react";

interface Actor {
  id: string;
  name: string;
  shortName: string;
}

interface PayoffEntry {
  strategies: Record<string, string>;
  payoffs: Record<string, number>;
  marketImpact: {
    direction: string;
    magnitude: string;
    sectors: string[];
    description: string;
  };
}

interface NashEquilibrium {
  strategies: Record<string, string>;
  payoffs: Record<string, number>;
  stability: string;
  marketImpact: {
    direction: string;
    magnitude: string;
    sectors: string[];
  };
}

interface SchellingPoint {
  strategies: Record<string, string>;
  payoffs: Record<string, number>;
  convergenceProbability: number;
  rationale: string;
}

interface EscalationStep {
  level: number;
  strategies: Record<string, string>;
  payoffs: Record<string, number>;
  marketImpact: { direction: string; magnitude: string; sectors: string[] };
}

interface CustomGameTheoryData {
  scenario: {
    id: string;
    title: string;
    description: string;
    actors: Actor[];
    strategies: Record<string, string[]>;
    marketSectors: string[];
    timeHorizon: string;
  };
  analysis: {
    scenarioId: string;
    nashEquilibria: NashEquilibrium[];
    dominantStrategies: Record<string, string | null>;
    schellingPoints?: SchellingPoint[];
    escalationLadder?: EscalationStep[];
    marketAssessment: {
      mostLikelyOutcome: string;
      direction: string;
      confidence: number;
      keySectors: string[];
    };
    payoffMatrix?: PayoffEntry[];
  };
  custom: boolean;
  error?: string;
}

const DIRECTION_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  bullish: { bg: "bg-accent-emerald/10", text: "text-accent-emerald", border: "border-accent-emerald/20" },
  bearish: { bg: "bg-accent-rose/10", text: "text-accent-rose", border: "border-accent-rose/20" },
  mixed: { bg: "bg-accent-amber/10", text: "text-accent-amber", border: "border-accent-amber/20" },
  neutral: { bg: "bg-navy-700/30", text: "text-navy-400", border: "border-navy-700" },
};

const MAGNITUDE_STYLES: Record<string, string> = {
  high: "text-accent-rose",
  medium: "text-accent-amber",
  low: "text-navy-400",
  extreme: "text-accent-rose font-bold",
};

const STABILITY_STYLES: Record<string, { bg: string; text: string }> = {
  stable: { bg: "bg-accent-emerald/10", text: "text-accent-emerald" },
  unstable: { bg: "bg-accent-rose/10", text: "text-accent-rose" },
  mixed: { bg: "bg-accent-amber/10", text: "text-accent-amber" },
};

function PayoffMatrix({ actors, strategies, matrix }: {
  actors: Actor[];
  strategies: Record<string, string[]>;
  matrix: PayoffEntry[];
}) {
  const a1 = actors[0];
  const a2 = actors[1];
  const s1List = strategies[a1.id] || [];
  const s2List = strategies[a2.id] || [];

  const getCell = (s1: string, s2: string) =>
    matrix.find((m) => m.strategies[a1.id] === s1 && m.strategies[a2.id] === s2);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="px-2 py-1.5 text-left text-[10px] font-mono uppercase tracking-wider text-navy-500 border-b border-navy-700">
              {a1.name} \ {a2.name}
            </th>
            {s2List.map((s2) => (
              <th key={s2} className="px-2 py-1.5 text-center text-[10px] font-mono uppercase tracking-wider text-accent-cyan/70 border-b border-navy-700 min-w-[120px]">
                {s2}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {s1List.map((s1) => (
            <tr key={s1} className="border-b border-navy-800/50">
              <td className="px-2 py-2 text-[10px] font-mono uppercase tracking-wider text-accent-cyan/70 font-semibold">
                {s1}
              </td>
              {s2List.map((s2) => {
                const cell = getCell(s1, s2);
                if (!cell) return <td key={s2} className="px-2 py-2 text-center text-navy-600">-</td>;
                const dir = DIRECTION_STYLES[cell.marketImpact.direction] || DIRECTION_STYLES.neutral;
                const mag = MAGNITUDE_STYLES[cell.marketImpact.magnitude] || "text-navy-400";
                return (
                  <td key={s2} className={`px-2 py-2 ${dir.bg} border ${dir.border}`}>
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-mono text-navy-200 font-semibold">
                        {cell.payoffs[a1.id] > 0 ? "+" : ""}{cell.payoffs[a1.id]}
                      </span>
                      <span className="text-navy-600">/</span>
                      <span className="font-mono text-navy-200 font-semibold">
                        {cell.payoffs[a2.id] > 0 ? "+" : ""}{cell.payoffs[a2.id]}
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <span className={`text-[9px] font-mono ${dir.text}`}>{cell.marketImpact.direction}</span>
                      <span className={`text-[9px] font-mono ${mag}`}>{cell.marketImpact.magnitude}</span>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({ title, icon: Icon, children, defaultOpen = true }: {
  title: string;
  icon: typeof Swords;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-navy-800/50">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-navy-800/20 transition-colors"
      >
        <Icon className="w-3 h-3 text-navy-500" />
        <span className="text-[10px] font-mono uppercase tracking-wider text-navy-400 flex-1 text-left">{title}</span>
        {open ? <ChevronUp className="w-3 h-3 text-navy-600" /> : <ChevronDown className="w-3 h-3 text-navy-600" />}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

export function CustomGameTheoryWidget({ data }: { data: CustomGameTheoryData }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  const { scenario, analysis } = data;
  const ma = analysis.marketAssessment;
  const dirStyle = DIRECTION_STYLES[ma.direction] || DIRECTION_STYLES.neutral;

  return (
    <div className="my-2 border border-navy-700/50 rounded-lg bg-navy-900/40 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 flex items-center gap-2">
        <Swords className="w-4 h-4 text-accent-cyan" />
        <div className="flex-1">
          <div className="text-xs font-semibold text-navy-100">{scenario.title}</div>
          <div className="text-[10px] text-navy-500 font-mono mt-0.5">
            {scenario.actors.map((a) => a.name).join(" vs ")} | {scenario.timeHorizon.replace("_", " ")}
          </div>
        </div>
        <div className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${dirStyle.bg} ${dirStyle.text} border ${dirStyle.border}`}>
          {ma.direction} | {(ma.confidence * 100).toFixed(0)}%
        </div>
      </div>

      {/* Market Assessment */}
      <div className="px-3 pb-2.5 border-b border-navy-800/50">
        <p className="text-xs text-navy-300">{ma.mostLikelyOutcome}</p>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {ma.keySectors.map((s) => (
            <span key={s} className="text-[9px] font-mono text-navy-500 bg-navy-800/50 px-1.5 py-0.5 rounded">{s}</span>
          ))}
        </div>
      </div>

      {/* Payoff Matrix */}
      {analysis.payoffMatrix && analysis.payoffMatrix.length > 0 && (
        <Section title="Payoff Matrix" icon={Target} defaultOpen={true}>
          <PayoffMatrix actors={scenario.actors} strategies={scenario.strategies} matrix={analysis.payoffMatrix} />
          <div className="flex items-center gap-3 mt-2 text-[9px] font-mono text-navy-600">
            <span>Values: {scenario.actors[0].name} / {scenario.actors[1].name}</span>
            <span>|</span>
            <span>Positive = favourable outcome</span>
          </div>
        </Section>
      )}

      {/* Nash Equilibria */}
      {analysis.nashEquilibria.length > 0 && (
        <Section title={`Nash Equilibria (${analysis.nashEquilibria.length})`} icon={Crosshair}>
          <div className="space-y-2">
            {analysis.nashEquilibria.map((ne, i) => {
              const stability = STABILITY_STYLES[ne.stability] || STABILITY_STYLES.mixed;
              const neDir = DIRECTION_STYLES[ne.marketImpact.direction] || DIRECTION_STYLES.neutral;
              return (
                <div key={i} className="border border-navy-700/50 rounded p-2.5 bg-navy-900/30">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${stability.bg} ${stability.text}`}>
                      {ne.stability}
                    </span>
                    <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${neDir.bg} ${neDir.text}`}>
                      {ne.marketImpact.direction} | {ne.marketImpact.magnitude}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {Object.entries(ne.strategies || {}).map(([actorId, strategy]) => {
                      const actor = scenario.actors.find((a) => a.id === actorId);
                      return (
                        <div key={actorId} className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-navy-500">{actor?.name || actorId}:</span>
                          <span className="text-navy-200 font-medium">{strategy}</span>
                          <span className="text-[10px] font-mono text-navy-500">
                            ({ne.payoffs[actorId] > 0 ? "+" : ""}{ne.payoffs[actorId]})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Dominant Strategies */}
      {Object.values(analysis.dominantStrategies).some(Boolean) && (
        <Section title="Dominant Strategies" icon={Shield} defaultOpen={false}>
          <div className="space-y-1.5">
            {Object.entries(analysis.dominantStrategies || {}).map(([actorId, strategy]) => {
              const actor = scenario.actors.find((a) => a.id === actorId);
              return (
                <div key={actorId} className="flex items-center gap-2 text-xs">
                  <span className="text-[10px] font-mono text-navy-500 uppercase tracking-wider">{actor?.name || actorId}:</span>
                  {strategy ? (
                    <span className="text-accent-cyan font-medium">{strategy}</span>
                  ) : (
                    <span className="text-navy-600 italic">No dominant strategy</span>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Schelling Points */}
      {analysis.schellingPoints && analysis.schellingPoints.length > 0 && (
        <Section title={`Schelling Points (${analysis.schellingPoints.length})`} icon={Target} defaultOpen={false}>
          <div className="space-y-2">
            {analysis.schellingPoints.map((sp, i) => (
              <div key={i} className="border border-navy-700/50 rounded p-2.5 bg-navy-900/30">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex flex-wrap gap-x-3 text-xs">
                    {Object.entries(sp.strategies || {}).map(([actorId, strategy]) => {
                      const actor = scenario.actors.find((a) => a.id === actorId);
                      return (
                        <span key={actorId}>
                          <span className="text-navy-500 font-mono text-[10px]">{actor?.name || actorId}: </span>
                          <span className="text-navy-200">{strategy}</span>
                        </span>
                      );
                    })}
                  </div>
                  <span className="text-[10px] font-mono text-accent-amber">
                    {(sp.convergenceProbability * 100).toFixed(0)}% convergence
                  </span>
                </div>
                <p className="text-[11px] text-navy-400 italic">{sp.rationale}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Escalation Ladder */}
      {analysis.escalationLadder && analysis.escalationLadder.length > 0 && (
        <Section title={`Escalation Ladder (${analysis.escalationLadder.length} levels)`} icon={Swords} defaultOpen={false}>
          <div className="space-y-1">
            {analysis.escalationLadder.map((step) => {
              const stepDir = DIRECTION_STYLES[step.marketImpact.direction] || DIRECTION_STYLES.neutral;
              return (
                <div key={step.level} className="flex items-center gap-2 py-1.5 border-b border-navy-800/30 last:border-0">
                  <span className={`text-[10px] font-mono w-5 h-5 flex items-center justify-center rounded ${
                    step.level >= 4 ? "bg-accent-rose/10 text-accent-rose" :
                    step.level >= 2 ? "bg-accent-amber/10 text-accent-amber" :
                    "bg-navy-700/30 text-navy-400"
                  }`}>
                    {step.level}
                  </span>
                  <div className="flex-1 flex flex-wrap gap-x-3 text-[11px]">
                    {Object.entries(step.strategies || {}).map(([actorId, strategy]) => {
                      const actor = scenario.actors.find((a) => a.id === actorId);
                      return (
                        <span key={actorId}>
                          <span className="text-navy-500 font-mono text-[10px]">{actor?.name || actorId}: </span>
                          <span className="text-navy-300">{strategy}</span>
                        </span>
                      );
                    })}
                  </div>
                  <span className={`text-[9px] font-mono ${stepDir.text}`}>
                    {step.marketImpact.direction}
                  </span>
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}
