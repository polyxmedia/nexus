"use client";

import { useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
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

export default function ParallelsPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParallelAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const regimeColor = (regime: string) => {
    switch (regime) {
      case "wartime":
        return "text-red-400";
      case "transition":
        return "text-amber-400";
      default:
        return "text-emerald-400";
    }
  };

  const similarityColor = (s: number) => {
    if (s >= 0.8) return "text-red-400";
    if (s >= 0.6) return "text-amber-400";
    if (s >= 0.4) return "text-cyan-400";
    return "text-neutral-400";
  };

  return (
    <PageContainer title="Psycho-History Parallels">
      <div className="space-y-6">
        {/* Search Bar */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
          <div className="mb-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
              Historical Pattern Matching Engine
            </span>
          </div>
          <p className="text-sm text-neutral-400 mb-4">
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
          <div className="rounded-lg border border-red-800/50 bg-red-950/30 p-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Synthesis Header */}
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                  Synthesis
                </span>
                <div className="flex items-center gap-4">
                  <span
                    className={`text-[10px] font-mono uppercase tracking-wider ${regimeColor(result.regime)}`}
                  >
                    {result.regime} regime
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500">
                    Confidence:{" "}
                    {(result.confidenceInAnalysis * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <p className="text-sm text-neutral-200 leading-relaxed mb-4">
                {result.synthesis}
              </p>

              {/* Probability Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                    Probability of Pattern Repetition
                  </span>
                  <span className="text-sm font-mono text-amber-400">
                    {(result.probabilityOfRepetition * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${result.probabilityOfRepetition * 100}%`,
                      backgroundColor:
                        result.probabilityOfRepetition > 0.7
                          ? "#f87171"
                          : result.probabilityOfRepetition > 0.4
                            ? "#fbbf24"
                            : "#22d3ee",
                    }}
                  />
                </div>
              </div>

              {/* Warning */}
              {result.warning && (
                <div className="rounded border border-amber-800/50 bg-amber-950/20 p-3 mt-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <span className="text-xs text-amber-300">
                      {result.warning}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Actionable Insights */}
            {result.actionableInsights.length > 0 && (
              <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                  Actionable Insights
                </span>
                <ul className="mt-3 space-y-2">
                  {result.actionableInsights.map((insight, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-neutral-300"
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Parallels List */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                Historical Parallels ({result.parallels.length})
              </span>
              <div className="mt-3 space-y-3">
                {result.parallels.map((parallel, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-neutral-800 bg-neutral-900/50 overflow-hidden"
                  >
                    {/* Header */}
                    <button
                      onClick={() =>
                        setExpanded(expanded === i ? null : i)
                      }
                      className="w-full flex items-center justify-between p-4 hover:bg-neutral-800/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <History className="w-4 h-4 text-neutral-500" />
                        <div className="text-left">
                          <div className="text-sm font-medium text-neutral-200">
                            {parallel.event}
                          </div>
                          <div className="text-xs text-neutral-500 mt-0.5">
                            {parallel.date}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span
                          className={`text-sm font-mono ${similarityColor(parallel.similarity)}`}
                        >
                          {(parallel.similarity * 100).toFixed(0)}% match
                        </span>
                        {expanded === i ? (
                          <ChevronDown className="w-4 h-4 text-neutral-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-neutral-500" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Detail */}
                    {expanded === i && (
                      <div className="border-t border-neutral-800 p-4 space-y-4">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                            Outcome
                          </span>
                          <p className="text-sm text-neutral-300 mt-1">
                            {parallel.outcome}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                              Time to Resolution
                            </span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Clock className="w-3.5 h-3.5 text-neutral-500" />
                              <span className="text-sm text-neutral-300">
                                {parallel.timeToResolution}
                              </span>
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                              Market Impact
                            </span>
                            <p className="text-sm text-neutral-300 mt-1">
                              {parallel.marketImpact}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-500 text-[10px]">
                              Similarities
                            </span>
                            <ul className="mt-1 space-y-1">
                              {parallel.keySimlarities.map((s, j) => (
                                <li
                                  key={j}
                                  className="text-xs text-neutral-400"
                                >
                                  + {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-rose-500">
                              Differences
                            </span>
                            <ul className="mt-1 space-y-1">
                              {parallel.keyDifferences.map((d, j) => (
                                <li
                                  key={j}
                                  className="text-xs text-neutral-400"
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
          <div className="rounded-lg border border-neutral-800/50 bg-neutral-900/30 p-12 text-center">
            <History className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
            <p className="text-sm text-neutral-500">
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
                  className="text-xs px-3 py-1.5 rounded-full border border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-500 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
