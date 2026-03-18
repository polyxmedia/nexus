"use client";

import { AlertTriangle, Shield, Globe, BookOpen, Flame, Users } from "lucide-react";

interface Programme {
  actor: string;
  name: string;
  theology: string;
  mandate: string;
  targetGeography: string;
  policyInfluence: string;
  rigidity: string;
  calendarElevation?: number;
}

interface Convergence {
  actors: string[];
  programmes: string[];
  sharedGeography: string;
  incompatibility: string;
  amplificationFactor: number;
  compositeRigidity: string;
  significance: string;
  marketSectors: string[];
  seldonClassification: string;
}

interface SingleActorData {
  actor: string;
  programme: {
    name: string;
    theology: string;
    mandate: string;
    targetGeography: string;
    doctrinalBasis: string[];
    operationalIndicators: string[];
    policyInfluence: string;
    rigidity: string;
  };
  calendarTriggers: Array<{
    event: string;
    system: string;
    activationMultiplier: number;
    historicalBasis: string;
    confidence: number;
  }>;
  incompatibilities: string[];
}

interface LandscapeData {
  activeProgrammes: Programme[];
  convergences: Convergence[];
  highestAmplification: number;
  noOffRampPairs: number;
  seldonCrisisCount: number;
  seldonApproachingCount: number;
  calendarEventsChecked: string[];
}

type EschatologicalData = SingleActorData | LandscapeData;

function isLandscape(data: EschatologicalData): data is LandscapeData {
  return "activeProgrammes" in data;
}

const RIGIDITY_COLOR: Record<string, string> = {
  absolute: "text-accent-rose",
  high: "text-accent-amber",
  moderate: "text-navy-300",
  low: "text-accent-emerald",
};

const SELDON_COLOR: Record<string, string> = {
  crisis: "bg-accent-rose/15 text-accent-rose border-accent-rose/30",
  approaching: "bg-accent-amber/15 text-accent-amber border-accent-amber/30",
  stable: "bg-accent-emerald/15 text-accent-emerald border-accent-emerald/30",
};

export function EschatologicalWidget({ data }: { data: EschatologicalData }) {
  if (!data || ("error" in data && data.error)) {
    return (
      <div className="text-xs text-navy-500 italic py-2">
        {(data as { error: string })?.error || "No data available"}
      </div>
    );
  }

  if (!isLandscape(data)) {
    // Single actor profile
    const d = data;
    return (
      <div className="space-y-3">
        {/* Actor Header */}
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-accent-rose" />
          <span className="text-xs font-mono font-bold text-navy-100 uppercase tracking-wider">{d.actor}</span>
          <span className={`text-[9px] font-mono ${RIGIDITY_COLOR[d.programme.rigidity] || "text-navy-400"}`}>
            {d.programme.rigidity} rigidity
          </span>
        </div>

        {/* Programme */}
        <div className="border border-navy-700/40 rounded bg-navy-900/60 p-3 space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-accent-amber">{d.programme.name}</div>
          <div className="text-[11px] text-navy-300 leading-relaxed">{d.programme.theology}</div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <div className="text-[9px] font-mono text-navy-500 uppercase">Mandate</div>
              <div className="text-[10px] text-navy-300">{d.programme.mandate}</div>
            </div>
            <div>
              <div className="text-[9px] font-mono text-navy-500 uppercase">Geography</div>
              <div className="text-[10px] text-navy-300">{d.programme.targetGeography}</div>
            </div>
          </div>
          <div className="text-[9px] font-mono text-navy-500 uppercase mt-2">Policy Influence</div>
          <div className="text-[10px] text-navy-300">{d.programme.policyInfluence}</div>
        </div>

        {/* Calendar Triggers */}
        {d.calendarTriggers.length > 0 && (
          <div>
            <div className="text-[9px] font-mono text-navy-500 uppercase tracking-wider mb-1.5">Calendar Triggers</div>
            <div className="space-y-1">
              {d.calendarTriggers.map((t, i) => (
                <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 border border-navy-800 rounded bg-navy-900/40">
                  <Flame className={`h-3 w-3 shrink-0 ${t.activationMultiplier >= 1.5 ? "text-accent-rose" : t.activationMultiplier >= 1.2 ? "text-accent-amber" : "text-navy-500"}`} />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-navy-200">{t.event}</span>
                    <span className="text-[9px] text-navy-600 ml-2">{t.system}</span>
                  </div>
                  <span className="text-[9px] font-mono text-accent-amber shrink-0">{t.activationMultiplier}x</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Incompatibilities */}
        {d.incompatibilities.length > 0 && (
          <div>
            <div className="text-[9px] font-mono text-navy-500 uppercase tracking-wider mb-1">Incompatibilities</div>
            <div className="flex flex-wrap gap-1">
              {d.incompatibilities.map((inc, i) => (
                <span key={i} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-accent-rose/10 text-accent-rose border border-accent-rose/20">
                  {inc}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Landscape view
  const d = data;

  return (
    <div className="space-y-3">
      {/* Header Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="border border-navy-700/40 rounded bg-navy-900/60 p-2 text-center">
          <div className="text-lg font-bold font-mono text-navy-100">{d.activeProgrammes.length}</div>
          <div className="text-[9px] font-mono text-navy-500 uppercase">Programmes</div>
        </div>
        <div className="border border-navy-700/40 rounded bg-navy-900/60 p-2 text-center">
          <div className="text-lg font-bold font-mono text-accent-amber">{d.convergences.length}</div>
          <div className="text-[9px] font-mono text-navy-500 uppercase">Convergences</div>
        </div>
        <div className={`border rounded p-2 text-center ${d.seldonCrisisCount > 0 ? "border-accent-rose/40 bg-accent-rose/5" : "border-navy-700/40 bg-navy-900/60"}`}>
          <div className={`text-lg font-bold font-mono ${d.seldonCrisisCount > 0 ? "text-accent-rose" : "text-navy-100"}`}>{d.seldonCrisisCount}</div>
          <div className="text-[9px] font-mono text-navy-500 uppercase">Seldon Crises</div>
        </div>
        <div className="border border-navy-700/40 rounded bg-navy-900/60 p-2 text-center">
          <div className="text-lg font-bold font-mono text-accent-rose">{d.noOffRampPairs}</div>
          <div className="text-[9px] font-mono text-navy-500 uppercase">No Off-Ramp</div>
        </div>
      </div>

      {/* Convergences (most important) */}
      {d.convergences.length > 0 && (
        <div>
          <div className="text-[9px] font-mono text-navy-500 uppercase tracking-wider mb-1.5">Convergence Zones</div>
          <div className="space-y-2">
            {d.convergences.map((c, i) => (
              <div key={i} className="border border-navy-700/40 rounded bg-navy-900/60 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className={`h-3.5 w-3.5 shrink-0 ${c.amplificationFactor >= 2 ? "text-accent-rose" : "text-accent-amber"}`} />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {c.actors.map((a) => (
                      <span key={a} className="text-[10px] font-mono text-navy-200 px-1.5 py-0.5 rounded bg-navy-800 border border-navy-700/40">{a}</span>
                    ))}
                  </div>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ml-auto shrink-0 ${SELDON_COLOR[c.seldonClassification] || SELDON_COLOR.stable}`}>
                    {c.seldonClassification}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-navy-500">Geography:</span>
                    <span className="text-navy-300 ml-1">{c.sharedGeography}</span>
                  </div>
                  <div>
                    <span className="text-navy-500">Amplification:</span>
                    <span className={`ml-1 font-mono ${c.amplificationFactor >= 2 ? "text-accent-rose" : "text-accent-amber"}`}>{c.amplificationFactor.toFixed(1)}x</span>
                  </div>
                </div>
                <div className="text-[10px] text-navy-400 mt-1">{c.incompatibility}</div>
                {c.marketSectors.length > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <Globe className="h-2.5 w-2.5 text-navy-600" />
                    <div className="flex flex-wrap gap-1">
                      {c.marketSectors.map((s) => (
                        <span key={s} className="text-[8px] font-mono px-1 py-0.5 rounded bg-navy-800/50 text-navy-400">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Programmes */}
      {d.activeProgrammes.length > 0 && (
        <div>
          <div className="text-[9px] font-mono text-navy-500 uppercase tracking-wider mb-1.5">Active Programmes</div>
          <div className="space-y-1">
            {d.activeProgrammes.map((p, i) => (
              <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 border border-navy-800 rounded bg-navy-900/40">
                <Users className="h-3 w-3 text-navy-500 shrink-0" />
                <span className="text-[10px] font-mono text-navy-300 w-28 shrink-0">{p.actor}</span>
                <span className="text-[10px] text-navy-200 flex-1 truncate">{p.name}</span>
                <span className={`text-[9px] font-mono shrink-0 ${RIGIDITY_COLOR[p.rigidity] || "text-navy-400"}`}>{p.rigidity}</span>
                {p.calendarElevation != null && p.calendarElevation > 0 && (
                  <span className="text-[9px] font-mono text-accent-amber shrink-0">+{(p.calendarElevation * 100).toFixed(0)}%</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
