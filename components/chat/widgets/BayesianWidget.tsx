"use client";

import { Badge } from "@/components/ui/badge";

// ── Types matching BayesianAnalysis output ──

interface BayesianEquilibrium {
  strategyProfile: Record<string, string>;
  expectedPayoffs: Record<string, number>;
  typeConditions: Record<string, string>;
  probability: number;
  stability: "stable" | "unstable" | "fragile";
  bargainingRange: number;
  fearonCondition: "agreement_possible" | "narrow_range" | "no_agreement";
  marketImpact: {
    direction: "bullish" | "bearish" | "mixed";
    magnitude: "low" | "medium" | "high";
    sectors: string[];
  };
}

interface SequentialPath {
  moves: { actor: string; strategy: string; round: number }[];
  terminalPayoffs: Record<string, number>;
  probability: number;
  isSubgamePerfect: boolean;
}

interface CoalitionAssessment {
  coalitionId: string;
  name: string;
  currentStability: number;
  fractureRisk: "low" | "medium" | "high" | "critical";
  vulnerabilities: string[];
  holdingFactors: string[];
}

interface BayesianAnalysis {
  equilibria: BayesianEquilibrium[];
  sequentialPaths: SequentialPath[];
  coalitionAssessment: CoalitionAssessment[];
  audienceCostConstraints: Record<string, string[]>;
  bargainingRange: number;
  fearonAssessment: string;
  dominantTypes: Record<string, { type: string; probability: number }>;
  escalationProbability: number;
  marketAssessment: {
    mostLikelyOutcome: string;
    direction: "bullish" | "bearish" | "mixed";
    confidence: number;
    keySectors: string[];
    timeframe: string;
  };
}

interface ScenarioData {
  id: string;
  title: string;
  description: string;
  actors: string[];
  moveOrder: string[];
  coalitions?: Array<{ id: string; name: string; members: string[]; stability: number }>;
  marketSectors?: string[];
  timeHorizon?: string;
}

interface LiveDataSources {
  dbSignals: number;
  gdeltArticles: number;
  manualSignals: number;
  totalSignalUpdates: number;
}

interface ScenarioResult {
  scenario: ScenarioData;
  analysis: BayesianAnalysis;
  liveDataSources?: LiveDataSources;
}

interface BayesianWidgetData {
  scenario?: ScenarioData;
  analysis?: BayesianAnalysis;
  liveDataSources?: LiveDataSources;
  scenarios?: ScenarioResult[];
  count?: number;
  error?: string;
}

// ── Style maps ──

const directionColor: Record<string, string> = {
  bullish: "bg-accent-emerald/20 text-accent-emerald border-accent-emerald/30",
  bearish: "bg-accent-rose/20 text-accent-rose border-accent-rose/30",
  mixed: "bg-accent-amber/20 text-accent-amber border-accent-amber/30",
};

const stabilityColor: Record<string, string> = {
  stable: "text-accent-emerald",
  fragile: "text-accent-amber",
  unstable: "text-accent-rose",
};

const fearonColor: Record<string, string> = {
  agreement_possible: "text-accent-emerald",
  narrow_range: "text-accent-amber",
  no_agreement: "text-accent-rose",
};

const fractureColor: Record<string, string> = {
  low: "text-accent-emerald",
  medium: "text-accent-amber",
  high: "text-accent-rose",
  critical: "text-signal-5",
};

const fearonLabel: Record<string, string> = {
  agreement_possible: "Agreement Possible",
  narrow_range: "Narrow Range",
  no_agreement: "Bargaining Failure",
};

// ── Sub-components ──

function EscalationBar({ probability }: { probability: number }) {
  const pct = Math.round(probability * 100);
  const color =
    pct >= 70 ? "bg-accent-rose" : pct >= 40 ? "bg-accent-amber" : "bg-accent-emerald";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-navy-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-navy-300">{pct}%</span>
    </div>
  );
}

function EquilibriumCard({ eq, index }: { eq: BayesianEquilibrium; index: number }) {
  return (
    <div className="border border-navy-700/60 rounded bg-navy-900/40 p-2.5">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] font-mono text-navy-500">BNE-{index + 1}</span>
        <Badge className={stabilityColor[eq.stability] + " bg-transparent border-none text-[10px]"}>
          {eq.stability}
        </Badge>
        <Badge className={fearonColor[eq.fearonCondition] + " bg-transparent border-none text-[10px]"}>
          {fearonLabel[eq.fearonCondition] || eq.fearonCondition}
        </Badge>
        <span className="text-[10px] font-mono text-navy-400 ml-auto">
          P={(eq.probability * 100).toFixed(0)}%
        </span>
      </div>

      {/* Strategy profile */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-1.5">
        {Object.entries(eq.strategyProfile).map(([actor, strategy], i) => (
          <span key={`${actor}-${i}`} className="text-[10px] font-mono">
            <span className="text-navy-400">{actor}:</span>{" "}
            <span className="text-navy-200">{strategy}</span>
          </span>
        ))}
      </div>

      {/* Market impact */}
      <div className="flex items-center gap-2 text-[10px] font-mono text-navy-400">
        <Badge className={directionColor[eq.marketImpact.direction] + " text-[9px]"}>
          {eq.marketImpact.direction} / {eq.marketImpact.magnitude}
        </Badge>
        <span>{eq.marketImpact.sectors.join(", ")}</span>
      </div>
    </div>
  );
}

function CoalitionRow({ c }: { c: CoalitionAssessment }) {
  const stabPct = Math.round(c.currentStability * 100);
  return (
    <div className="flex items-center gap-3 text-[10px] font-mono py-1 border-b border-navy-800/50 last:border-0">
      <span className="text-navy-200 min-w-[120px]">{c.name}</span>
      <div className="flex items-center gap-1.5 flex-1">
        <div className="w-16 h-1 bg-navy-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-cyan rounded-full"
            style={{ width: `${stabPct}%` }}
          />
        </div>
        <span className="text-navy-400">{stabPct}%</span>
      </div>
      <span className={fractureColor[c.fractureRisk]}>
        {c.fractureRisk} risk
      </span>
    </div>
  );
}

function SequentialPathRow({ path, index }: { path: SequentialPath; index: number }) {
  return (
    <div className="text-[10px] font-mono py-1.5 border-b border-navy-800/50 last:border-0">
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-navy-500">Path {index + 1}</span>
        {path.isSubgamePerfect && (
          <span className="text-accent-cyan text-[9px]">SPE</span>
        )}
        <span className="text-navy-400 ml-auto">
          P={(path.probability * 100).toFixed(0)}%
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {path.moves.map((m, i) => (
          <span key={i} className="inline-flex items-center">
            <span className="text-navy-400">{m.actor}</span>
            <span className="text-navy-600 mx-0.5">&rarr;</span>
            <span className="text-navy-200">{m.strategy}</span>
            {i < path.moves.length - 1 && (
              <span className="text-navy-700 mx-1">|</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main Scenario Card ──

function BayesianScenarioCard({ data }: { data: ScenarioResult }) {
  const { scenario, analysis } = data;
  const ma = analysis.marketAssessment;
  const topEquilibria = analysis.equilibria.slice(0, 3);
  const topPaths = analysis.sequentialPaths
    .filter((p) => p.probability > 0.05)
    .slice(0, 4);

  return (
    <div className="border border-navy-700 rounded bg-navy-900/60 p-3 space-y-3">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-navy-200 font-mono">
            {scenario.title}
          </span>
          <Badge className={directionColor[ma.direction] || ""}>
            {ma.direction}
          </Badge>
          {scenario.timeHorizon && (
            <span className="text-[9px] font-mono text-navy-500 ml-auto">
              {scenario.timeHorizon.replace("_", " ")}
            </span>
          )}
        </div>
        <div className="text-[10px] text-navy-400 leading-relaxed">
          {ma.mostLikelyOutcome}
        </div>
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-4 gap-2">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-navy-500 mb-0.5">Escalation</div>
          <EscalationBar probability={analysis.escalationProbability} />
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-navy-500 mb-0.5">Bargaining</div>
          <div className="text-xs font-mono text-navy-200">
            {(analysis.bargainingRange * 100).toFixed(0)}%
            <span className={`ml-1 text-[9px] ${analysis.bargainingRange < 0.2 ? "text-accent-rose" : analysis.bargainingRange < 0.5 ? "text-accent-amber" : "text-accent-emerald"}`}>
              range
            </span>
          </div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-navy-500 mb-0.5">Confidence</div>
          <div className="text-xs font-mono text-navy-200">
            {(ma.confidence * 100).toFixed(0)}%
          </div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-navy-500 mb-0.5">Equilibria</div>
          <div className="text-xs font-mono text-navy-200">
            {analysis.equilibria.length} BNE
          </div>
        </div>
      </div>

      {/* Fearon assessment */}
      <div className="bg-navy-800/40 rounded px-2.5 py-1.5">
        <div className="text-[9px] uppercase tracking-wider text-navy-500 mb-0.5">Fearon Assessment</div>
        <div className="text-[10px] text-navy-300 leading-relaxed">
          {analysis.fearonAssessment}
        </div>
      </div>

      {/* Dominant types */}
      <div>
        <div className="text-[9px] uppercase tracking-wider text-navy-500 mb-1">Actor Types</div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {Object.entries(analysis.dominantTypes).map(([actor, info], i) => (
            <span key={`${actor}-${i}`} className="text-[10px] font-mono">
              <span className="text-navy-400">{actor}:</span>{" "}
              <span className="text-accent-cyan">{info.type}</span>
              <span className="text-navy-500 ml-0.5">({(info.probability * 100).toFixed(0)}%)</span>
            </span>
          ))}
        </div>
      </div>

      {/* Equilibria */}
      {topEquilibria.length > 0 && (
        <div>
          <div className="text-[9px] uppercase tracking-wider text-navy-500 mb-1">
            Bayesian Nash Equilibria
          </div>
          <div className="space-y-1.5">
            {topEquilibria.map((eq, i) => (
              <EquilibriumCard key={i} eq={eq} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Sequential paths */}
      {topPaths.length > 0 && (
        <div>
          <div className="text-[9px] uppercase tracking-wider text-navy-500 mb-1">
            Sequential Paths
          </div>
          <div className="bg-navy-800/30 rounded px-2 py-1">
            {topPaths.map((p, i) => (
              <SequentialPathRow key={i} path={p} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Coalitions */}
      {analysis.coalitionAssessment.length > 0 && (
        <div>
          <div className="text-[9px] uppercase tracking-wider text-navy-500 mb-1">
            Coalition Stability
          </div>
          <div className="bg-navy-800/30 rounded px-2 py-1">
            {analysis.coalitionAssessment.map((c) => (
              <CoalitionRow key={c.coalitionId} c={c} />
            ))}
          </div>
        </div>
      )}

      {/* Live data + sectors footer */}
      <div className="flex items-center gap-3 text-[10px] font-mono text-navy-400 pt-1 border-t border-navy-800/50">
        {data.liveDataSources && data.liveDataSources.totalSignalUpdates > 0 && (
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse" />
            <span className="text-accent-emerald">
              {data.liveDataSources.totalSignalUpdates} live signals
            </span>
            <span className="text-navy-600">
              ({data.liveDataSources.dbSignals} db, {data.liveDataSources.gdeltArticles} osint)
            </span>
          </span>
        )}
        <span>Sectors: {ma.keySectors.join(", ")}</span>
        {ma.timeframe && <span className="ml-auto">{ma.timeframe}</span>}
      </div>
    </div>
  );
}

// ── Export ──

export function BayesianWidget({ data }: { data: BayesianWidgetData }) {
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
          Bayesian N-Player Analysis
        </div>
        <BayesianScenarioCard data={{ scenario: data.scenario, analysis: data.analysis, liveDataSources: data.liveDataSources }} />
      </div>
    );
  }

  // Multiple scenarios
  if (data.scenarios) {
    return (
      <div className="my-2">
        <div className="text-[10px] uppercase tracking-wider text-navy-500 font-mono mb-1.5">
          Bayesian N-Player Analysis ({data.scenarios.length} scenarios)
        </div>
        <div className="space-y-2">
          {data.scenarios.map((s) => (
            <BayesianScenarioCard key={s.scenario.id} data={s} />
          ))}
        </div>
      </div>
    );
  }

  return null;
}
