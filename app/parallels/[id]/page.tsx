"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Clock,
  History,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

interface ParallelDetail {
  id: number;
  uuid: string;
  query: string;
  synthesis: string;
  probabilityOfRepetition: number;
  regime: string;
  confidenceInAnalysis: number;
  warning: string | null;
  actionableInsights: string[];
  parallels: HistoricalParallel[];
  createdAt: string;
  createdBy: string | null;
}

export default function ParallelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<ParallelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(0);

  useEffect(() => {
    fetch(`/api/parallels/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <PageContainer
      title="Historical Parallel"
      subtitle={data?.query}
      actions={
        <button
          onClick={() => router.push("/parallels")}
          className="flex items-center gap-1.5 text-[10px] font-mono text-navy-400 hover:text-navy-200 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Back
        </button>
      }
    >
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-accent-rose/30 bg-accent-rose/5 p-6 text-center">
          <AlertTriangle className="h-6 w-6 text-accent-rose mx-auto mb-2" />
          <p className="text-sm text-accent-rose">{error}</p>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Synthesis */}
          <div className="rounded-lg border border-navy-700/20 bg-navy-900/40 p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Synthesis</span>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-mono uppercase tracking-wider text-navy-400">{data.regime} regime</span>
                <span className="text-[10px] font-mono text-navy-500">Confidence: {(data.confidenceInAnalysis * 100).toFixed(0)}%</span>
              </div>
            </div>
            <p className="text-[13px] text-navy-200 leading-relaxed mb-4">{data.synthesis}</p>

            {/* Probability */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Probability of Pattern Repetition</span>
                <span className="text-sm font-mono text-navy-300">{(data.probabilityOfRepetition * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden">
                <div className="h-full bg-navy-400 rounded-full" style={{ width: `${data.probabilityOfRepetition * 100}%` }} />
              </div>
            </div>

            {data.warning && (
              <div className="rounded border border-navy-700/30 bg-navy-800/30 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-navy-400 mt-0.5 shrink-0" />
                  <span className="text-[11px] text-navy-300">{data.warning}</span>
                </div>
              </div>
            )}

            {/* Meta */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-navy-800/40 text-[10px] font-mono text-navy-600">
              <span>{new Date(data.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              {data.createdBy && <span>by {data.createdBy}</span>}
              <span className="text-navy-700">{data.uuid.slice(0, 8)}</span>
            </div>
          </div>

          {/* Actionable Insights */}
          {data.actionableInsights.length > 0 && (
            <div className="rounded-lg border border-navy-700/20 bg-navy-900/40 p-6">
              <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Actionable Insights</span>
              <ul className="mt-3 space-y-2">
                {data.actionableInsights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-navy-300 leading-relaxed">
                    <TrendingUp className="w-3.5 h-3.5 text-navy-500 mt-1 shrink-0" />
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Parallels List */}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
              Historical Parallels ({data.parallels.length})
            </span>
            <div className="mt-3 space-y-3">
              {data.parallels.map((parallel, i) => (
                <div key={i} className="rounded-lg border border-navy-700/20 bg-navy-900/40 overflow-hidden">
                  <button
                    onClick={() => setExpanded(expanded === i ? null : i)}
                    className="w-full flex items-center justify-between p-4 hover:bg-navy-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <History className="w-4 h-4 text-navy-500" />
                      <div className="text-left">
                        <div className="text-[13px] font-medium text-navy-200">{parallel.event}</div>
                        <div className="text-[11px] text-navy-500 mt-0.5">{parallel.date}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-mono text-navy-300">{(parallel.similarity * 100).toFixed(0)}% match</span>
                      {expanded === i ? <ChevronDown className="w-4 h-4 text-navy-500" /> : <ChevronRight className="w-4 h-4 text-navy-500" />}
                    </div>
                  </button>

                  {expanded === i && (
                    <div className="border-t border-navy-800/40 p-5 space-y-4">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Outcome</span>
                        <p className="text-[13px] text-navy-300 mt-1 leading-relaxed">{parallel.outcome}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Time to Resolution</span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Clock className="w-3 h-3 text-navy-500" />
                            <span className="text-[11px] text-navy-300">{parallel.timeToResolution}</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Market Impact</span>
                          <p className="text-[11px] text-navy-300 mt-1">{parallel.marketImpact}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-accent-emerald/70">Similarities</span>
                          <ul className="mt-1 space-y-1">
                            {(parallel.keySimlarities || []).map((s, j) => (
                              <li key={j} className="text-[11px] text-navy-300 flex items-start gap-1.5">
                                <span className="text-navy-600 mt-0.5">+</span>
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-accent-rose/70">Differences</span>
                          <ul className="mt-1 space-y-1">
                            {(parallel.keyDifferences || []).map((d, j) => (
                              <li key={j} className="text-[11px] text-navy-300 flex items-start gap-1.5">
                                <span className="text-navy-600 mt-0.5">-</span>
                                {d}
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
      ) : null}
    </PageContainer>
  );
}
