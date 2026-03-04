"use client";

import { Badge } from "@/components/ui/badge";

interface ScenarioResult {
  scenario: { id: string; title: string; description: string };
  analysis: {
    scenarioId: string;
    nashEquilibria: Array<{
      strategies: Record<string, string>;
      payoffs: Record<string, number>;
      stability: string;
      marketImpact: {
        direction: string;
        magnitude: string;
        sectors: string[];
      };
    }>;
    dominantStrategies: Record<string, string | null>;
    marketAssessment: {
      mostLikelyOutcome: string;
      direction: string;
      confidence: number;
      keySectors: string[];
    };
  };
}

interface GameTheoryData {
  scenario?: ScenarioResult["scenario"];
  analysis?: ScenarioResult["analysis"];
  scenarios?: ScenarioResult[];
  error?: string;
}

const directionColor: Record<string, string> = {
  bullish: "bg-accent-emerald/20 text-accent-emerald border-accent-emerald/30",
  bearish: "bg-accent-rose/20 text-accent-rose border-accent-rose/30",
  mixed: "bg-accent-amber/20 text-accent-amber border-accent-amber/30",
};

function ScenarioCard({ data }: { data: ScenarioResult }) {
  const { scenario, analysis } = data;
  const ma = analysis.marketAssessment;

  return (
    <div className="border border-navy-700 rounded bg-navy-900/60 p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-navy-200 font-mono">
          {scenario.title}
        </span>
        <Badge className={directionColor[ma.direction] || ""}>
          {ma.direction}
        </Badge>
      </div>

      <div className="text-xs text-navy-300 mb-2">{ma.mostLikelyOutcome}</div>

      <div className="flex items-center gap-4 text-[10px] text-navy-400 font-mono">
        <span>
          Nash: {analysis.nashEquilibria.length} equilibri
          {analysis.nashEquilibria.length === 1 ? "um" : "a"}
        </span>
        <span>Confidence: {(ma.confidence * 100).toFixed(0)}%</span>
        <span>Sectors: {ma.keySectors.join(", ")}</span>
      </div>
    </div>
  );
}

export function GameTheoryWidget({ data }: { data: GameTheoryData }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  // Single scenario
  if (data.scenario && data.analysis) {
    return (
      <div className="my-2">
        <div className="text-[10px] uppercase tracking-wider text-navy-500 font-mono mb-1.5">
          Game Theory Analysis
        </div>
        <ScenarioCard data={{ scenario: data.scenario, analysis: data.analysis }} />
      </div>
    );
  }

  // Multiple scenarios
  if (data.scenarios) {
    return (
      <div className="my-2">
        <div className="text-[10px] uppercase tracking-wider text-navy-500 font-mono mb-1.5">
          Game Theory Analysis ({data.scenarios.length} scenarios)
        </div>
        <div className="space-y-2">
          {data.scenarios.map((s) => (
            <ScenarioCard key={s.scenario.id} data={s} />
          ))}
        </div>
      </div>
    );
  }

  return null;
}
