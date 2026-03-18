"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { UpgradeGate } from "@/components/subscription/upgrade-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Loader2,
  History,
  AlertTriangle,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface HistoricalParallel {
  event: string;
  date: string;
  similarity: number;
  outcome: string;
  timeToResolution: string;
  marketImpact: string;
  keyDifferences: string[];
  keySimlarities: string[];
}

interface ParallelAnalysis {
  query: string;
  parallels: HistoricalParallel[];
  synthesis: string;
  probabilityOfRepetition: number;
  regime: "peacetime" | "wartime" | "transition";
  confidenceInAnalysis: number;
  actionableInsights: string[];
  warning: string | null;
}

interface PastAnalysis {
  id: number;
  uuid: string;
  query: string;
  synthesis: string;
  probabilityOfRepetition: number;
  regime: string;
  confidence: number;
  createdAt: string;
}

export default function ParallelsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<(ParallelAnalysis & { uuid?: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [pastAnalyses, setPastAnalyses] = useState<PastAnalysis[]>([]);
  const [loadingPast, setLoadingPast] = useState(true);

  useEffect(() => {
    fetch("/api/parallels?limit=10")
      .then((r) => r.json())
      .then((data) => setPastAnalyses(data.analyses || []))
      .catch(() => {})
      .finally(() => setLoadingPast(false));
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/parallels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to search");
      }

      const data = await res.json();
      setResult(data);
      // Navigate to the persisted detail page
      if (data.uuid) {
        router.push(`/parallels/${data.uuid}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="Psycho-History Parallels">
      <UpgradeGate minTier="analyst" feature="Historical parallels analysis" blur>
      <div className="space-y-6">
        {/* Search Bar */}
        <div className="rounded-lg border border-navy-700/30 bg-navy-900/20 p-6">
          <div className="mb-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
              Historical Pattern Matching Engine
            </span>
          </div>
          <p className="text-sm text-navy-400 mb-4">
            Describe a current event or scenario. The engine searches the
            knowledge bank, resolved predictions, and signal history for
            structurally similar past situations.
          </p>
          <div className="flex gap-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Iran war + red heifer timing, Taiwan strait military exercises..."
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={loading || !query.trim()}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span className="ml-2">Search</span>
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-navy-700/30 bg-navy-900/20 p-4">
            <div className="flex items-center gap-2 text-accent-rose">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Synthesis Header */}
            <div className="rounded-lg border border-navy-700/30 bg-navy-900/20 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
                  Synthesis
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-navy-400">
                    {result.regime} regime
                  </span>
                  <span className="text-[10px] font-mono text-navy-500">
                    Confidence:{" "}
                    {(result.confidenceInAnalysis * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <p className="text-sm text-navy-200 leading-relaxed mb-4">
                {result.synthesis}
              </p>

              {/* Probability Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
                    Probability of Pattern Repetition
                  </span>
                  <span className="text-sm font-mono text-navy-300">
                    {(result.probabilityOfRepetition * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-navy-400 rounded-full transition-all duration-500"
                    style={{
                      width: `${result.probabilityOfRepetition * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Warning */}
              {result.warning && (
                <div className="rounded border border-navy-700/30 bg-navy-800/30 p-3 mt-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-navy-400 mt-0.5 shrink-0" />
                    <span className="text-xs text-navy-300">
                      {result.warning}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Actionable Insights */}
            {result.actionableInsights.length > 0 && (
              <div className="rounded-lg border border-navy-700/30 bg-navy-900/20 p-6">
                <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
                  Actionable Insights
                </span>
                <ul className="mt-3 space-y-2">
                  {result.actionableInsights.map((insight, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-navy-300"
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-navy-500 mt-0.5 shrink-0" />
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Parallels List */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
                Historical Parallels ({result.parallels.length})
              </span>
              <div className="mt-3 space-y-3">
                {result.parallels.map((parallel, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-navy-700/30 bg-navy-900/20 overflow-hidden"
                  >
                    {/* Header */}
                    <button
                      onClick={() =>
                        setExpanded(expanded === i ? null : i)
                      }
                      className="w-full flex items-center justify-between p-4 hover:bg-navy-800/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <History className="w-4 h-4 text-navy-500" />
                        <div className="text-left">
                          <div className="text-sm font-medium text-navy-200">
                            {parallel.event}
                          </div>
                          <div className="text-xs text-navy-500 mt-0.5">
                            {parallel.date}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-mono text-navy-300">
                          {(parallel.similarity * 100).toFixed(0)}% match
                        </span>
                        {expanded === i ? (
                          <ChevronDown className="w-4 h-4 text-navy-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-navy-500" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Detail */}
                    {expanded === i && (
                      <div className="border-t border-navy-700/30 p-4 space-y-4">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
                            Outcome
                          </span>
                          <p className="text-sm text-navy-300 mt-1">
                            {parallel.outcome}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
                              Time to Resolution
                            </span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Clock className="w-3.5 h-3.5 text-navy-500" />
                              <span className="text-sm text-navy-300">
                                {parallel.timeToResolution}
                              </span>
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
                              Market Impact
                            </span>
                            <p className="text-sm text-navy-300 mt-1">
                              {parallel.marketImpact}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
                              Similarities
                            </span>
                            <ul className="mt-1 space-y-1">
                              {parallel.keySimlarities.map((s, j) => (
                                <li
                                  key={j}
                                  className="text-xs text-navy-400"
                                >
                                  + {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
                              Differences
                            </span>
                            <ul className="mt-1 space-y-1">
                              {parallel.keyDifferences.map((d, j) => (
                                <li
                                  key={j}
                                  className="text-xs text-navy-400"
                                >
                                  - {d}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !result && !error && (
          <div className="rounded-lg border border-navy-700/30 border-dashed bg-navy-900/10 p-12 text-center">
            <History className="w-8 h-8 text-navy-600 mx-auto mb-3" />
            <p className="text-sm text-navy-500">
              Enter a current event to search for historical parallels
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {[
                "Iran-Israel escalation",
                "Taiwan strait exercises",
                "Oil price shock + Hormuz",
                "US election + market volatility",
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setQuery(example)}
                  className="text-xs px-3 py-1.5 rounded-full border border-navy-700/40 text-navy-400 hover:text-navy-200 hover:border-navy-700 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Past Analyses */}
        {!result && (
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
              Recent Analyses
            </span>
            <div className="mt-3 space-y-2">
              {loadingPast ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
                </div>
              ) : pastAnalyses.length === 0 ? (
                <p className="text-[11px] text-navy-600 py-4">No analyses yet. Run a search above to get started.</p>
              ) : (
                pastAnalyses.map((a) => (
                  <button
                    key={a.uuid}
                    onClick={() => router.push(`/parallels/${a.uuid}`)}
                    className="w-full rounded-lg border border-navy-700/20 bg-navy-900/40 p-4 text-left hover:bg-navy-900/70 hover:border-navy-600/30 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <History className="h-3.5 w-3.5 text-navy-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[13px] text-navy-200 truncate">{a.query}</p>
                          <p className="text-[10px] text-navy-500 mt-0.5 line-clamp-1">{a.synthesis.slice(0, 120)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <span className="text-[10px] font-mono text-navy-400">{(a.probabilityOfRepetition * 100).toFixed(0)}%</span>
                        <span className="text-[10px] font-mono text-navy-600">{a.regime}</span>
                        <span className="text-[9px] font-mono text-navy-700">
                          {new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      </UpgradeGate>
    </PageContainer>
  );
}
