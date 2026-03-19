"use client";

import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { UpgradeGate } from "@/components/subscription/upgrade-gate";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, TrendingUp, TrendingDown, ChevronDown, ChevronRight } from "lucide-react";

interface BenchmarkScore {
  source: string;
  totalResolved: number;
  nexusBrier: number;
  crowdBrier: number;
  nexusAdvantage: number;
  nexusWins: number;
  crowdWins: number;
  ties: number;
}

interface BenchmarkItem {
  question: string;
  source: string;
  nexusProbability: number | null;
  crowdProbability: number | null;
  outcome: number | null;
  nexusBrier: number | null;
  crowdBrier: number | null;
}

interface BenchmarkData {
  overall: BenchmarkScore;
  bySource: BenchmarkScore[];
  recentBenchmarks: BenchmarkItem[];
}

export default function BenchmarksPage() {
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/predictions/benchmarks")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = data?.recentBenchmarks.filter(
    (b) => !activeSource || b.source === activeSource
  ) || [];

  return (
    <PageContainer title="Prediction Benchmarks" subtitle="NEXUS vs prediction markets">
      <UpgradeGate minTier="analyst" feature="Prediction benchmarks">

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : !data || data.overall.totalResolved === 0 ? (
        <div className="border border-navy-700/30 border-dashed rounded-lg p-12 text-center">
          <Target className="h-8 w-8 text-navy-600 mx-auto mb-3" />
          <p className="text-sm text-navy-400 mb-1">No resolved benchmarks yet</p>
          <p className="text-[10px] text-navy-500">
            Benchmarks are synced from Metaculus, Polymarket, and Manifold Markets.
            NEXUS generates predictions against external questions to eliminate selection bias.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="border border-navy-700/40 rounded-lg bg-navy-950/60 p-4">
              <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Benchmarks Resolved</span>
              <div className="text-2xl font-mono font-bold text-navy-100 mt-1">{data.overall.totalResolved}</div>
            </div>
            <div className="border border-navy-700/40 rounded-lg bg-navy-950/60 p-4">
              <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">NEXUS Brier</span>
              <div className="text-2xl font-mono font-bold text-navy-100 mt-1">{data.overall.nexusBrier.toFixed(3)}</div>
              <span className="text-[9px] font-mono text-navy-600">lower is better</span>
            </div>
            <div className="border border-navy-700/40 rounded-lg bg-navy-950/60 p-4">
              <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Crowd Brier</span>
              <div className="text-2xl font-mono font-bold text-navy-100 mt-1">{data.overall.crowdBrier.toFixed(3)}</div>
              <span className="text-[9px] font-mono text-navy-600">prediction market avg</span>
            </div>
            <div className={`border rounded-lg p-4 ${data.overall.nexusAdvantage > 0 ? "border-accent-emerald/30 bg-accent-emerald/5" : data.overall.nexusAdvantage < 0 ? "border-accent-rose/30 bg-accent-rose/5" : "border-navy-700/40 bg-navy-950/60"}`}>
              <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">NEXUS Edge</span>
              <div className={`text-2xl font-mono font-bold mt-1 flex items-center gap-1 ${data.overall.nexusAdvantage > 0 ? "text-accent-emerald" : data.overall.nexusAdvantage < 0 ? "text-accent-rose" : "text-navy-100"}`}>
                {data.overall.nexusAdvantage > 0 && <TrendingUp className="h-4 w-4" />}
                {data.overall.nexusAdvantage < 0 && <TrendingDown className="h-4 w-4" />}
                {data.overall.nexusAdvantage > 0 ? "+" : ""}{(data.overall.nexusAdvantage * 100).toFixed(1)}%
              </div>
              <span className="text-[9px] font-mono text-navy-600">
                {data.overall.nexusWins}W / {data.overall.crowdWins}L / {data.overall.ties}T
              </span>
            </div>
          </div>

          {/* Source Tabs */}
          <div className="flex items-center gap-1 border-b border-navy-800 pb-2 overflow-x-auto">
            <button
              onClick={() => setActiveSource(null)}
              className={`px-3 py-1.5 rounded-t text-[10px] font-mono uppercase tracking-wider transition-colors ${
                !activeSource ? "bg-navy-800/60 text-navy-100 border border-b-0 border-navy-700/40" : "text-navy-500 hover:text-navy-300"
              }`}
            >
              All ({data.overall.totalResolved})
            </button>
            {data.bySource.map((s) => (
              <button
                key={s.source}
                onClick={() => setActiveSource(activeSource === s.source ? null : s.source)}
                className={`px-3 py-1.5 rounded-t text-[10px] font-mono uppercase tracking-wider transition-colors ${
                  activeSource === s.source ? "bg-navy-800/60 text-navy-100 border border-b-0 border-navy-700/40" : "text-navy-500 hover:text-navy-300"
                }`}
              >
                {s.source} ({s.totalResolved})
              </button>
            ))}
          </div>

          {/* Source stats when filtered */}
          {activeSource && (() => {
            const s = data.bySource.find((x) => x.source === activeSource);
            if (!s) return null;
            return (
              <div className="grid grid-cols-3 gap-3">
                <div className="border border-navy-700/30 rounded bg-navy-950/40 p-3 text-center">
                  <span className="text-[10px] font-mono text-navy-500 uppercase tracking-wider">NEXUS Brier</span>
                  <div className="text-lg font-mono font-bold text-navy-100">{s.nexusBrier.toFixed(3)}</div>
                </div>
                <div className="border border-navy-700/30 rounded bg-navy-950/40 p-3 text-center">
                  <span className="text-[10px] font-mono text-navy-500 uppercase tracking-wider">Crowd Brier</span>
                  <div className="text-lg font-mono font-bold text-navy-100">{s.crowdBrier.toFixed(3)}</div>
                </div>
                <div className={`border rounded p-3 text-center ${s.nexusAdvantage > 0 ? "border-accent-emerald/20 bg-accent-emerald/5" : "border-accent-rose/20 bg-accent-rose/5"}`}>
                  <span className="text-[10px] font-mono text-navy-500 uppercase tracking-wider">Record</span>
                  <div className={`text-lg font-mono font-bold ${s.nexusAdvantage > 0 ? "text-accent-emerald" : "text-accent-rose"}`}>
                    {s.nexusWins}-{s.crowdWins}-{s.ties}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Benchmark List */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
                {filtered.length} benchmark{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>
            {filtered.map((b, i) => {
              const nexusWon = b.nexusBrier != null && b.crowdBrier != null && b.nexusBrier < b.crowdBrier - 0.001;
              const crowdWon = b.nexusBrier != null && b.crowdBrier != null && b.crowdBrier < b.nexusBrier - 0.001;
              return (
                <div key={i} className="border border-navy-700/30 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpanded(expanded === i ? null : i)}
                    className={`w-full flex items-center gap-3 p-3 text-left hover:bg-navy-800/20 transition-colors ${
                      nexusWon ? "border-l-2 border-l-accent-emerald" : crowdWon ? "border-l-2 border-l-accent-rose" : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-navy-200 truncate">{b.question}</p>
                      <span className="text-[9px] font-mono text-navy-600 uppercase">{b.source}</span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-[10px] font-mono">
                      <div className="text-center">
                        <div className="text-navy-500">NEXUS</div>
                        <div className="text-navy-200">{b.nexusProbability != null ? `${(b.nexusProbability * 100).toFixed(0)}%` : "-"}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-navy-500">Crowd</div>
                        <div className="text-navy-200">{b.crowdProbability != null ? `${(b.crowdProbability * 100).toFixed(0)}%` : "-"}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-navy-500">Winner</div>
                        <div className={nexusWon ? "text-accent-emerald" : crowdWon ? "text-accent-rose" : "text-navy-400"}>
                          {nexusWon ? "NEXUS" : crowdWon ? "Crowd" : "Tie"}
                        </div>
                      </div>
                    </div>
                    {expanded === i ? <ChevronDown className="h-3.5 w-3.5 text-navy-500 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-navy-500 shrink-0" />}
                  </button>
                  {expanded === i && (
                    <div className="border-t border-navy-700/30 p-3 bg-navy-950/40">
                      <p className="text-xs text-navy-300 mb-3">{b.question}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px] font-mono">
                        <div>
                          <span className="text-navy-500">NEXUS Prob</span>
                          <div className="text-navy-200">{b.nexusProbability != null ? `${(b.nexusProbability * 100).toFixed(1)}%` : "N/A"}</div>
                        </div>
                        <div>
                          <span className="text-navy-500">Crowd Prob</span>
                          <div className="text-navy-200">{b.crowdProbability != null ? `${(b.crowdProbability * 100).toFixed(1)}%` : "N/A"}</div>
                        </div>
                        <div>
                          <span className="text-navy-500">NEXUS Brier</span>
                          <div className={nexusWon ? "text-accent-emerald" : "text-navy-200"}>{b.nexusBrier?.toFixed(4) ?? "N/A"}</div>
                        </div>
                        <div>
                          <span className="text-navy-500">Crowd Brier</span>
                          <div className={crowdWon ? "text-accent-emerald" : "text-navy-200"}>{b.crowdBrier?.toFixed(4) ?? "N/A"}</div>
                        </div>
                      </div>
                      {b.outcome != null && (
                        <div className="mt-2 text-[10px] font-mono text-navy-400">
                          Outcome: <span className="text-navy-200">{b.outcome === 1 ? "Yes" : "No"}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-[11px] text-navy-600 text-center py-6">No benchmarks for this source yet</p>
            )}
          </div>
        </div>
      )}
      </UpgradeGate>
    </PageContainer>
  );
}
