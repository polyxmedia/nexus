"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { IntensityIndicator, Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ScenarioWithAnalysis } from "@/lib/warroom/types";

interface ScenarioPanelProps {
  scenarios: ScenarioWithAnalysis[];
  selectedScenarioId: string | null;
  onSelectScenario: (id: string | null) => void;
}

const ESCALATION_COLORS: Record<number, string> = {
  1: "text-signal-1",
  2: "text-signal-2",
  3: "text-signal-3",
  4: "text-signal-4",
  5: "text-signal-5",
};

const ESCALATION_BG: Record<number, string> = {
  1: "bg-signal-1/20 border-signal-1/30",
  2: "bg-signal-2/20 border-signal-2/30",
  3: "bg-signal-3/20 border-signal-3/30",
  4: "bg-signal-4/20 border-signal-4/30",
  5: "bg-signal-5/20 border-signal-5/30",
};

export function ScenarioPanel({
  scenarios,
  selectedScenarioId,
  onSelectScenario,
}: ScenarioPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Collapse toggle - outside panel so it's always visible */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 z-40 w-4 h-10 flex items-center justify-center bg-[#0a0a0a]/95 border border-[#1a1a1a] rounded-r text-navy-600 hover:text-navy-300 hover:bg-[#111] transition-all duration-300 pointer-events-auto",
          collapsed ? "left-0 border-l-0" : "left-80 border-l-0"
        )}
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 bg-[#080808]/95 backdrop-blur-sm border-r border-[#1a1a1a] z-30 pointer-events-auto wr-panel-left transition-all duration-300 ease-in-out overflow-hidden",
          collapsed ? "w-0 border-r-0" : "w-80 overflow-y-auto"
        )}
      >
      <div className="p-4">
        <h2 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-3 pb-2 border-b border-navy-700/20">
          Active Scenarios
        </h2>

        <div className="space-y-2">
          {scenarios.map(({ scenario, analysis }) => {
            const isSelected = selectedScenarioId === scenario.id;
            const maxLevel = analysis.escalationLadder.length > 0
              ? Math.max(...analysis.escalationLadder.map((s) => s.level))
              : 1;
            const confidence = (analysis.marketAssessment.confidence * 100).toFixed(0);

            return (
              <div key={scenario.id}>
                {/* Card */}
                <button
                  onClick={() =>
                    onSelectScenario(isSelected ? null : scenario.id)
                  }
                  className={cn(
                    "w-full text-left rounded-md border p-3 transition-all duration-200 wr-card",
                    isSelected
                      ? "bg-navy-800/80 border-navy-600 wr-shadow-sm"
                      : "bg-navy-900/60 border-navy-700/30 hover:border-navy-600/40"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-navy-200 truncate mr-2">
                      {scenario.title}
                    </span>
                    <IntensityIndicator intensity={maxLevel} />
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-navy-400">
                      {scenario.actors.join(" vs ").toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      className={cn(
                        "text-[10px]",
                        analysis.marketAssessment.direction === "bearish"
                          ? "bg-accent-rose/20 text-accent-rose border-accent-rose/30"
                          : analysis.marketAssessment.direction === "bullish"
                            ? "bg-accent-emerald/20 text-accent-emerald border-accent-emerald/30"
                            : "bg-accent-amber/20 text-accent-amber border-accent-amber/30"
                      )}
                    >
                      {analysis.marketAssessment.direction.toUpperCase()}
                    </Badge>
                    <span className="text-[10px] text-navy-400">
                      {confidence}% conf
                    </span>
                  </div>
                </button>

                {/* Expanded Detail */}
                {isSelected && (
                  <div className="mt-2 space-y-3 px-1">
                    {/* Escalation Ladder */}
                    <div>
                      <h4 className="text-[10px] uppercase tracking-wider text-navy-500 mb-2 pb-1 border-b border-navy-700/20">
                        Escalation Ladder
                      </h4>
                      <div className="space-y-1">
                        {analysis.escalationLadder
                          .filter((step, i, arr) => {
                            return i === 0 || step.level !== arr[i - 1].level;
                          })
                          .slice(0, 5)
                          .map((step, i) => (
                            <div
                              key={i}
                              className={cn(
                                "rounded-md border px-2 py-1.5 text-[10px]",
                                ESCALATION_BG[step.level] || "bg-navy-800"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <span className={cn("font-medium", ESCALATION_COLORS[step.level])}>
                                  LEVEL {step.level}
                                </span>
                                <span className="text-navy-400">
                                  {(step.probability * 100).toFixed(0)}%
                                </span>
                              </div>
                              <p className="text-navy-300 mt-0.5 leading-tight">
                                {step.trigger}
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Nash Equilibria */}
                    {analysis.nashEquilibria.length > 0 && (
                      <div>
                        <h4 className="text-[10px] uppercase tracking-wider text-navy-500 mb-2 pb-1 border-b border-navy-700/20">
                          Nash Equilibria
                        </h4>
                        <div className="space-y-1">
                          {analysis.nashEquilibria.map((eq, i) => (
                            <div
                              key={i}
                              className="rounded-md border border-navy-700/30 bg-navy-800/50 px-2 py-1.5 text-[10px]"
                            >
                              <div className="flex items-center gap-2 mb-0.5">
                                <span
                                  className={cn(
                                    "px-1 py-0.5 rounded text-[10px] uppercase font-medium",
                                    eq.stability === "stable"
                                      ? "bg-accent-emerald/20 text-accent-emerald"
                                      : eq.stability === "unstable"
                                        ? "bg-accent-rose/20 text-accent-rose"
                                        : "bg-accent-amber/20 text-accent-amber"
                                  )}
                                >
                                  {eq.stability}
                                </span>
                              </div>
                              <p className="text-navy-300 leading-tight">
                                {Object.entries(eq.strategies)
                                  .map(([id, s]) => `${id.toUpperCase()}: ${s}`)
                                  .join(" / ")}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dominant Strategies */}
                    {Object.values(analysis.dominantStrategies).some(Boolean) && (
                      <div>
                        <h4 className="text-[10px] uppercase tracking-wider text-navy-500 mb-2 pb-1 border-b border-navy-700/20">
                          Dominant Strategies
                        </h4>
                        <div className="space-y-1">
                          {Object.entries(analysis.dominantStrategies)
                            .filter(([, strat]) => strat)
                            .map(([actorId, strat]) => (
                              <div
                                key={actorId}
                                className="text-[10px] text-navy-300"
                              >
                                <span className="text-navy-400 uppercase">
                                  {actorId}:
                                </span>{" "}
                                {strat}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Market Assessment */}
                    <div>
                      <h4 className="text-[10px] uppercase tracking-wider text-navy-500 mb-2 pb-1 border-b border-navy-700/20">
                        Market Assessment
                      </h4>
                      <p className="text-[10px] text-navy-300 leading-relaxed mb-2">
                        {analysis.marketAssessment.mostLikelyOutcome}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {analysis.marketAssessment.keySectors.map((sector) => (
                          <Badge
                            key={sector}
                            variant="category"
                            className="text-[10px]"
                          >
                            {sector}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
    </>
  );
}
