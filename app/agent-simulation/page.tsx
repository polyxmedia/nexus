"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Play,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronRight,
  Clock,
  Target,
  LayoutList,
  Network,
} from "lucide-react";
import { SimulationGraph } from "@/components/simulation/simulation-graph";

interface AgentResult {
  personaId: string;
  personaName: string;
  role: string;
  stance: string;
  confidence: number;
  reasoning: string;
  keyFactors: string[];
  dissent: string | null;
}

interface Simulation {
  id: number;
  uuid: string;
  context: string;
  status: string;
  convergenceScore: number | null;
  convergenceLabel: string | null;
  dominantStance: string | null;
  agentResults: string | AgentResult[];
  summary: string | null;
  createdAt: string;
}

const PRESET_SCENARIOS = [
  {
    label: "Oil Shock",
    context: "Iran has closed the Strait of Hormuz after US sanctions escalation. Brent crude spiked 18% overnight. OPEC emergency meeting called for tomorrow. US Strategic Petroleum Reserve at 30-year lows. China importing record Russian crude via shadow fleet.",
  },
  {
    label: "Fed Pivot",
    context: "Fed surprised markets with a 50bp rate cut citing deteriorating labor market. Unemployment jumped to 4.8%. CPI still at 3.2%. Bond market pricing in 200bp of cuts over next 12 months. Dollar index falling sharply. Gold at all-time highs.",
  },
  {
    label: "China-Taiwan",
    context: "PLA conducting live-fire exercises within 12nm of Taiwan. TSMC share price down 22%. US carrier strike group transiting Philippine Sea. Japan raised defense readiness. Semiconductor supply chain in crisis mode. VIX spiked to 45.",
  },
  {
    label: "AI Bubble Pop",
    context: "Nvidia missed earnings by 30%, guidance slashed. Major cloud providers reporting AI capex pullback. Several AI startups defaulting on GPU leases. Nasdaq down 8% in 3 sessions. Rotation into value and defensive sectors accelerating.",
  },
  {
    label: "Banking Crisis",
    context: "Three regional US banks failed this week. Commercial real estate defaults accelerating. Credit spreads widening rapidly. Fed opened emergency lending facility. Bank ETF (KBE) down 25% this month. Deposit flight to money market funds and T-bills.",
  },
  {
    label: "Crypto Black Swan",
    context: "Tether depegged to $0.92 after reserve audit revealed $8B shortfall. Bitcoin crashed 35% in 24 hours. Major crypto exchange halted withdrawals. Contagion spreading to DeFi protocols. Congressional hearing on stablecoin regulation announced for next week.",
  },
];

const STANCE_CONFIG: Record<string, { color: string; bg: string; icon: typeof TrendingUp }> = {
  strongly_bullish: { color: "text-accent-emerald", bg: "bg-accent-emerald/10", icon: TrendingUp },
  bullish: { color: "text-accent-emerald/70", bg: "bg-accent-emerald/5", icon: TrendingUp },
  neutral: { color: "text-navy-400", bg: "bg-navy-800/40", icon: Minus },
  bearish: { color: "text-accent-rose/70", bg: "bg-accent-rose/5", icon: TrendingDown },
  strongly_bearish: { color: "text-accent-rose", bg: "bg-accent-rose/10", icon: TrendingDown },
};

function StanceIcon({ stance }: { stance: string }) {
  const config = STANCE_CONFIG[stance] || STANCE_CONFIG.neutral;
  const Icon = config.icon;
  return <Icon className={`h-3.5 w-3.5 ${config.color}`} />;
}

function ConvergenceMeter({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    score >= 0.85 ? "bg-accent-emerald" :
    score >= 0.65 ? "bg-accent-cyan" :
    score >= 0.45 ? "bg-accent-amber" :
    "bg-accent-rose";

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500">Convergence</span>
        <span className="text-[10px] font-mono text-navy-300 tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 bg-navy-800/50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function AgentCard({ agent, index }: { agent: AgentResult; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const config = STANCE_CONFIG[agent.stance] || STANCE_CONFIG.neutral;

  return (
    <div
      className="border border-navy-700/30 rounded-lg bg-navy-900/20 overflow-hidden transition-colors hover:border-navy-700/50"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center gap-3 text-left"
      >
        <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
          <StanceIcon stance={agent.stance} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-navy-200">{agent.personaName}</span>
            <span className="text-[9px] font-mono text-navy-600">{agent.role}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] font-mono uppercase tracking-wider ${config.color}`}>
              {agent.stance.replace(/_/g, " ")}
            </span>
            <span className="text-[9px] font-mono text-navy-600">
              {Math.round(agent.confidence * 100)}% conf
            </span>
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-navy-600 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-navy-600 shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-3 border-t border-navy-800/30 pt-3 space-y-2">
          <p className="text-[11px] text-navy-300 font-sans leading-relaxed">{agent.reasoning}</p>

          {agent.keyFactors.length > 0 && (
            <div className="space-y-1">
              <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500">Key Factors</span>
              <div className="flex flex-wrap gap-1.5">
                {agent.keyFactors.map((f, i) => (
                  <span key={i} className="text-[9px] font-mono text-navy-400 px-1.5 py-0.5 rounded bg-navy-800/40">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {agent.dissent && (
            <div className="space-y-1">
              <span className="text-[9px] font-mono uppercase tracking-wider text-accent-amber/60">Dissent</span>
              <p className="text-[10px] text-accent-amber/80 font-sans leading-relaxed">{agent.dissent}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SimulationHistoryCard({ sim, onClick }: { sim: Simulation; onClick: () => void }) {
  const agents: AgentResult[] = typeof sim.agentResults === "string"
    ? JSON.parse(sim.agentResults || "[]")
    : sim.agentResults || [];

  const stanceConfig = STANCE_CONFIG[sim.dominantStance || "neutral"] || STANCE_CONFIG.neutral;
  const contextPreview = sim.context.length > 100 ? sim.context.slice(0, 100) + "..." : sim.context;

  return (
    <button
      onClick={onClick}
      className="w-full text-left border border-navy-700/30 rounded-lg bg-navy-900/20 p-3 hover:border-navy-700/50 transition-colors"
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono uppercase tracking-wider ${stanceConfig.color}`}>
            {(sim.dominantStance || "neutral").replace(/_/g, " ")}
          </span>
          {sim.convergenceScore !== null && (
            <span className="text-[9px] font-mono text-navy-500 tabular-nums">
              {Math.round(sim.convergenceScore * 100)}% conv
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-navy-600">
          <Clock className="h-2.5 w-2.5" />
          <span className="text-[9px] font-mono">
            {new Date(sim.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>
      <p className="text-[10px] text-navy-500 line-clamp-2 font-sans">{contextPreview}</p>
      <div className="flex items-center gap-1 mt-1.5">
        <Users className="h-2.5 w-2.5 text-navy-600" />
        <span className="text-[9px] font-mono text-navy-600">{agents.length} agents</span>
        {sim.convergenceLabel && (
          <>
            <span className="text-navy-700">|</span>
            <span className="text-[9px] font-mono text-navy-500">{sim.convergenceLabel}</span>
          </>
        )}
      </div>
    </button>
  );
}

export default function AgentSimulationPage() {
  const router = useRouter();
  const [context, setContext] = useState("");
  const [swarmSize, setSwarmSize] = useState(7);
  const [running, setRunning] = useState(false);
  const [currentResult, setCurrentResult] = useState<Simulation | null>(null);
  const [history, setHistory] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "graph">("graph");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/agent-simulation?limit=20");
      if (res.status === 403) {
        router.push("/dashboard");
        return;
      }
      if (res.ok) {
        setIsAdmin(true);
        const data = await res.json();
        setHistory(Array.isArray(data) ? data : []);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleRun = async () => {
    if (!context.trim() || context.length < 10) return;
    setRunning(true);
    setError(null);

    try {
      const res = await fetch("/api/agent-simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, swarmSize }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Simulation failed");
        setRunning(false);
        return;
      }

      const data = await res.json();
      const sim: Simulation = {
        id: data.id,
        uuid: data.uuid,
        context,
        status: "complete",
        convergenceScore: data.convergenceScore,
        convergenceLabel: data.convergenceLabel,
        dominantStance: data.dominantStance,
        agentResults: data.agentResults,
        summary: data.summary,
        createdAt: new Date().toISOString(),
      };
      setCurrentResult(sim);
      setHistory((prev) => [sim, ...prev]);
      setContext("");
    } catch {
      setError("Failed to run simulation");
    }
    setRunning(false);
  };

  const viewHistorical = (sim: Simulation) => {
    const agents = typeof sim.agentResults === "string"
      ? JSON.parse(sim.agentResults || "[]")
      : sim.agentResults || [];
    setCurrentResult({ ...sim, agentResults: agents });
  };

  const agents: AgentResult[] = currentResult
    ? typeof currentResult.agentResults === "string"
      ? JSON.parse(currentResult.agentResults as string || "[]")
      : (currentResult.agentResults as AgentResult[]) || []
    : [];

  const stanceDistribution = agents.reduce<Record<string, number>>((acc, a) => {
    acc[a.stance] = (acc[a.stance] || 0) + 1;
    return acc;
  }, {});

  if (!isAdmin) return null;

  return (
    <PageContainer title="Agent Simulation" subtitle="Multi-persona convergence analysis">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input + History */}
        <div className="lg:col-span-4 space-y-4">
          <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Target className="h-3 w-3 text-navy-500" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
                Simulation Context
              </span>
            </div>

            {/* Preset scenarios */}
            <div className="mb-3">
              <span className="text-[9px] font-mono uppercase tracking-wider text-navy-600 block mb-1.5">Presets</span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_SCENARIOS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setContext(p.context)}
                    className="text-[9px] font-mono px-2 py-1 rounded border border-navy-700/30 text-navy-400 hover:text-navy-200 hover:border-navy-600/50 hover:bg-navy-800/40 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Describe the scenario you want the agent swarm to analyze, or pick a preset above..."
              rows={6}
              maxLength={5000}
              className="w-full rounded bg-navy-900/40 border border-navy-700/40 text-[11px] font-mono text-navy-300 placeholder:text-navy-600 focus:outline-none focus:border-navy-600 transition-colors p-3 resize-none"
            />

            {/* Swarm size */}
            <div className="flex items-center gap-3 mt-3 mb-2">
              <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500">Swarm Size</span>
              <div className="flex items-center gap-1.5">
                {[3, 5, 7, 10, 15].map((n) => (
                  <button
                    key={n}
                    onClick={() => setSwarmSize(n)}
                    className={`text-[10px] font-mono px-2 py-1 rounded transition-colors ${
                      swarmSize === n
                        ? "bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30"
                        : "text-navy-500 border border-navy-700/30 hover:text-navy-300 hover:border-navy-600/50"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <span className="text-[9px] font-mono text-navy-600">agents</span>
            </div>

            <div className="flex items-center justify-between mt-2">
              <span className="text-[9px] font-mono text-navy-600 tabular-nums">
                {context.length}/5000
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRun}
                disabled={running || context.length < 10}
              >
                {running ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Running {swarmSize} agents...
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 mr-1" />
                    Run Simulation
                  </>
                )}
              </Button>
            </div>
            {error && (
              <p className="text-[10px] font-mono text-accent-rose mt-2">{error}</p>
            )}
          </div>

          {/* History */}
          <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Clock className="h-3 w-3 text-navy-500" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
                History
              </span>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-navy-800/20 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <p className="text-[10px] text-navy-600 font-mono">No simulations yet. Run your first one above.</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {history.map((sim) => (
                  <SimulationHistoryCard key={sim.id} sim={sim} onClick={() => viewHistorical(sim)} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-8 space-y-4">
          {!currentResult ? (
            <div className="border border-navy-700/30 border-dashed rounded-lg p-16 text-center">
              <Users className="h-8 w-8 text-navy-700 mx-auto mb-3" />
              <p className="text-sm text-navy-400 mb-1">No simulation results yet</p>
              <p className="text-[10px] text-navy-600">
                Enter context and run a simulation to see how 7 independent AI agents assess the situation.
              </p>
            </div>
          ) : (
            <>
              {/* View toggle + Summary Row */}
              <div className="flex items-center justify-between">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 mr-3">
                  <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 px-3 py-2.5">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500">Agents</span>
                    <div className="text-xl font-mono font-bold text-navy-100 tabular-nums">{agents.length}</div>
                  </div>
                  <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 px-3 py-2.5">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500">Convergence</span>
                    <div className="text-xl font-mono font-bold text-navy-100 tabular-nums">
                      {currentResult.convergenceScore !== null ? `${Math.round(currentResult.convergenceScore * 100)}%` : "-"}
                    </div>
                    <div className="text-[9px] font-mono text-navy-600">{currentResult.convergenceLabel}</div>
                  </div>
                  <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 px-3 py-2.5">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500">Dominant</span>
                    <div className={`text-sm font-mono font-bold uppercase ${(STANCE_CONFIG[currentResult.dominantStance || "neutral"] || STANCE_CONFIG.neutral).color}`}>
                      {(currentResult.dominantStance || "neutral").replace(/_/g, " ")}
                    </div>
                  </div>
                  <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 px-3 py-2.5">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500">Distribution</span>
                    <div className="flex items-center gap-1 mt-1">
                      {["strongly_bullish", "bullish", "neutral", "bearish", "strongly_bearish"].map((s) => (
                        <div
                          key={s}
                          className="flex-1 rounded-sm transition-all"
                          style={{
                            height: `${Math.max(4, (stanceDistribution[s] || 0) / agents.length * 28)}px`,
                            backgroundColor: s.includes("bullish")
                              ? "#10b981"
                              : s.includes("bearish")
                              ? "#f43f5e"
                              : "#6b7280",
                            opacity: stanceDistribution[s] ? 0.8 : 0.15,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                {/* View toggle */}
                <div className="flex border border-navy-700/30 rounded-lg overflow-hidden shrink-0">
                  <button
                    onClick={() => setViewMode("graph")}
                    className={`px-2.5 py-2 flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider transition-colors ${
                      viewMode === "graph"
                        ? "bg-navy-800/60 text-navy-200"
                        : "text-navy-600 hover:text-navy-400"
                    }`}
                  >
                    <Network className="h-3 w-3" />
                    Graph
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`px-2.5 py-2 flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider transition-colors ${
                      viewMode === "list"
                        ? "bg-navy-800/60 text-navy-200"
                        : "text-navy-600 hover:text-navy-400"
                    }`}
                  >
                    <LayoutList className="h-3 w-3" />
                    List
                  </button>
                </div>
              </div>

              {/* Graph View */}
              {viewMode === "graph" && (
                <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 overflow-hidden" style={{ height: 560 }}>
                  <SimulationGraph
                    agents={agents}
                    convergenceScore={currentResult.convergenceScore}
                    dominantStance={currentResult.dominantStance}
                    onAgentClick={(id) => setSelectedAgentId(selectedAgentId === id ? null : id)}
                  />
                </div>
              )}

              {/* Agent Detail Panel (graph click) */}
              {viewMode === "graph" && selectedAgentId && (() => {
                const agent = agents.find((a) => a.personaId === selectedAgentId);
                if (!agent) return null;
                const config = STANCE_CONFIG[agent.stance] || STANCE_CONFIG.neutral;
                return (
                  <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}>
                          <StanceIcon stance={agent.stance} />
                        </div>
                        <div>
                          <span className="text-xs font-medium text-navy-200">{agent.personaName}</span>
                          <span className="text-[9px] font-mono text-navy-600 ml-2">{agent.role}</span>
                        </div>
                      </div>
                      <button onClick={() => setSelectedAgentId(null)} className="text-navy-600 hover:text-navy-400 text-xs font-mono">
                        Close
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-mono uppercase tracking-wider ${config.color}`}>
                        {agent.stance.replace(/_/g, " ")}
                      </span>
                      <span className="text-[9px] font-mono text-navy-600">
                        {Math.round(agent.confidence * 100)}% confidence
                      </span>
                    </div>
                    <p className="text-[11px] text-navy-300 font-sans leading-relaxed">{agent.reasoning}</p>
                    {agent.keyFactors.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500">Key Factors</span>
                        <div className="flex flex-wrap gap-1.5">
                          {agent.keyFactors.map((f, i) => (
                            <span key={i} className="text-[9px] font-mono text-navy-400 px-1.5 py-0.5 rounded bg-navy-800/40">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {agent.dissent && (
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-accent-amber/60">Dissent</span>
                        <p className="text-[10px] text-accent-amber/80 font-sans leading-relaxed">{agent.dissent}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* List View */}
              {viewMode === "list" && (
                <>
                  {/* Convergence Meter */}
                  {currentResult.convergenceScore !== null && (
                    <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 px-4 py-3">
                      <ConvergenceMeter score={currentResult.convergenceScore} />
                    </div>
                  )}

                  {/* Summary */}
                  {currentResult.summary && (
                    <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 px-4 py-3">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 block mb-1.5">Summary</span>
                      <p className="text-[11px] text-navy-300 font-sans leading-relaxed">{currentResult.summary}</p>
                    </div>
                  )}

                  {/* Agent Cards */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3 w-3 text-navy-500" />
                      <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
                        Agent Panel
                      </span>
                    </div>
                    {agents.map((agent, i) => (
                      <AgentCard key={agent.personaId} agent={agent} index={i} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
