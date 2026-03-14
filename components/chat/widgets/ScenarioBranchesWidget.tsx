"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown, Minus, Calendar, AlertTriangle } from "lucide-react";

interface Catalyst {
  name: string;
  date: string;
  category: string;
  importance: string;
  consensus: string;
  affectedTickers: string[];
}

interface Branch {
  scenario: string;
  probability: string;
  condition: string;
  regimeShift: string;
  volShift: string;
  actionOverrides: number;
  narrative: string;
  marketExpectations: string[];
}

interface BranchSet {
  catalyst: string;
  catalystDate: string;
  baseThesisId: string;
  branchCount: number;
  branches: Branch[];
}

interface ScenarioBranchesData {
  upcomingCatalysts?: Catalyst[];
  preComputedBranches?: BranchSet[];
  totalPendingBranches?: number;
  error?: string;
}

const importanceColor: Record<string, string> = {
  critical: "text-accent-rose",
  high: "text-accent-amber",
  medium: "text-accent-cyan",
  low: "text-navy-400",
};

function probToNumber(prob: string): number {
  return parseInt(prob.replace("%", ""), 10) || 0;
}

function ProbBar({ probability }: { probability: string }) {
  const pct = probToNumber(probability);
  const color = pct >= 60 ? "bg-accent-emerald" : pct >= 30 ? "bg-accent-amber" : "bg-accent-rose";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-navy-800 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-navy-300">{probability}</span>
    </div>
  );
}

function ShiftBadge({ label, value }: { label: string; value: string }) {
  if (!value || value === "none") return null;
  const isUp = value.toLowerCase().includes("up") || value.toLowerCase().includes("bull") || value.toLowerCase().includes("high");
  const isDown = value.toLowerCase().includes("down") || value.toLowerCase().includes("bear") || value.toLowerCase().includes("low");
  const color = isUp ? "text-accent-emerald border-accent-emerald/30" : isDown ? "text-accent-rose border-accent-rose/30" : "text-accent-amber border-accent-amber/30";
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-mono uppercase ${color}`}>
      <Icon className="h-2.5 w-2.5" />
      {label}: {value}
    </span>
  );
}

function BranchCard({ branch }: { branch: Branch }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-navy-700/60 rounded bg-navy-900/40 p-2.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-2 text-left"
      >
        <span className="mt-0.5 flex-shrink-0">
          {expanded ? <ChevronDown className="h-3 w-3 text-navy-500" /> : <ChevronRight className="h-3 w-3 text-navy-500" />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-navy-200 truncate">{branch.scenario}</span>
            <ProbBar probability={branch.probability} />
          </div>
          <div className="text-[10px] text-navy-400 mt-0.5 truncate">{branch.condition}</div>
        </div>
      </button>

      {expanded && (
        <div className="mt-2 ml-5 space-y-2">
          <p className="text-[11px] text-navy-300 leading-relaxed">{branch.narrative}</p>

          <div className="flex flex-wrap gap-1.5">
            <ShiftBadge label="Regime" value={branch.regimeShift} />
            <ShiftBadge label="Vol" value={branch.volShift} />
            {branch.actionOverrides > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-mono uppercase text-accent-cyan border-accent-cyan/30">
                <AlertTriangle className="h-2.5 w-2.5" />
                {branch.actionOverrides} action override{branch.actionOverrides !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {branch.marketExpectations.length > 0 && (
            <div className="space-y-0.5">
              <div className="text-[9px] uppercase tracking-wider text-navy-500 font-mono">Market expectations</div>
              {branch.marketExpectations.map((me, i) => {
                const isPositive = me.includes("+");
                return (
                  <div key={i} className={`text-[10px] font-mono ${isPositive ? "text-accent-emerald" : "text-accent-rose"}`}>
                    {me}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BranchSetCard({ branchSet }: { branchSet: BranchSet }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="border border-navy-700 rounded bg-navy-900/60">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        {expanded ? <ChevronDown className="h-3 w-3 text-navy-500" /> : <ChevronRight className="h-3 w-3 text-navy-500" />}
        <Calendar className="h-3 w-3 text-accent-cyan" />
        <span className="text-xs font-medium text-navy-200 flex-1">{branchSet.catalyst}</span>
        <span className="text-[10px] font-mono text-navy-500">{branchSet.catalystDate}</span>
        <span className="text-[10px] font-mono text-navy-400 ml-2">{branchSet.branchCount} branch{branchSet.branchCount !== 1 ? "es" : ""}</span>
      </button>

      {expanded && (
        <div className="px-3 pb-2 space-y-1.5">
          {branchSet.branches.map((b, i) => (
            <BranchCard key={i} branch={b} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ScenarioBranchesWidget({ data }: { data: ScenarioBranchesData }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  const catalysts = data.upcomingCatalysts || [];
  const branches = data.preComputedBranches || [];
  const total = data.totalPendingBranches || 0;

  return (
    <div className="my-2 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-navy-500 font-mono">
          Scenario Branches
        </div>
        {total > 0 && (
          <span className="text-[10px] font-mono text-accent-cyan">{total} total branches</span>
        )}
      </div>

      {/* Upcoming catalysts */}
      {catalysts.length > 0 && (
        <div className="border border-navy-700 rounded bg-navy-900/60 p-3">
          <div className="text-[9px] uppercase tracking-wider text-navy-500 font-mono mb-2">Upcoming catalysts</div>
          <div className="space-y-1.5">
            {catalysts.map((c, i) => (
              <div key={i} className="flex items-center gap-3 text-[11px]">
                <span className="font-mono text-navy-500 w-20 flex-shrink-0">{c.date}</span>
                <span className={`font-medium ${importanceColor[c.importance] || "text-navy-300"}`}>{c.name}</span>
                <span className="text-[9px] font-mono uppercase text-navy-500 px-1 py-0.5 border border-navy-700 rounded">{c.category}</span>
                {c.affectedTickers?.length > 0 && (
                  <span className="text-[10px] font-mono text-navy-400">{c.affectedTickers.join(", ")}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Branch sets */}
      {branches.length > 0 && (
        <div className="space-y-2">
          {branches.map((bs, i) => (
            <BranchSetCard key={i} branchSet={bs} />
          ))}
        </div>
      )}

      {catalysts.length === 0 && branches.length === 0 && (
        <div className="border border-navy-700 rounded bg-navy-900/60 px-3 py-4 text-center text-xs text-navy-500">
          No scenario branches computed yet. Active theses with upcoming catalysts will generate branches automatically.
        </div>
      )}
    </div>
  );
}
