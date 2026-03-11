"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  Target,
  Globe,
  BarChart3,
  Star,
  Activity,
  Calendar,
  ExternalLink,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import { CommentSection } from "@/components/social/comment-section";

interface Prediction {
  id: number;
  uuid: string;
  claim: string;
  timeframe: string;
  deadline: string;
  confidence: number;
  category: string;
  outcome: string | null;
  outcomeNotes: string | null;
  score: number | null;
  metrics: string | null;
  signalId: number | null;
  analysisId: number | null;
  createdAt: string;
  resolvedAt: string | null;
}

interface Signal {
  id: number;
  uuid: string;
  title: string;
  description: string;
  date: string;
  intensity: number;
  category: string;
  status: string;
  layers: string;
  marketSectors: string | null;
}

interface Analysis {
  id: number;
  summary: string;
  confidence: number;
  escalationProbability: number | null;
  marketImpact: string;
  tradeRecommendations: string;
  reasoning: string;
  riskFactors: string;
  createdAt: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; border: string; bg: string; icon: typeof Globe }> = {
  market: { label: "Market", color: "text-accent-cyan", border: "border-accent-cyan/30", bg: "bg-accent-cyan/8", icon: BarChart3 },
  geopolitical: { label: "Geopolitical", color: "text-accent-rose", border: "border-accent-rose/30", bg: "bg-accent-rose/8", icon: Globe },
  celestial: { label: "Astronomical", color: "text-accent-amber", border: "border-accent-amber/30", bg: "bg-accent-amber/8", icon: Star },
};

const OUTCOME_CONFIG: Record<string, { icon: typeof CheckCircle2; label: string; color: string; bg: string; border: string; description: string }> = {
  confirmed: { icon: CheckCircle2, label: "HIT", color: "text-accent-emerald", bg: "bg-accent-emerald/8", border: "border-accent-emerald/25", description: "This prediction was confirmed by real-world events." },
  denied: { icon: XCircle, label: "MISS", color: "text-accent-rose", bg: "bg-accent-rose/8", border: "border-accent-rose/25", description: "This prediction was not supported by real-world events." },
  partial: { icon: MinusCircle, label: "PARTIAL", color: "text-accent-amber", bg: "bg-accent-amber/8", border: "border-accent-amber/25", description: "This prediction was partially confirmed. Some elements materialized while others did not." },
  expired: { icon: Clock, label: "EXPIRED", color: "text-navy-400", bg: "bg-navy-800/40", border: "border-navy-700/30", description: "This prediction reached its deadline without sufficient data to confirm or deny." },
};

export default function PredictionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [signal, setSignal] = useState<Signal | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [related, setRelated] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/predictions/${id}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      setPrediction(data.prediction);
      setSignal(data.signal || null);
      setAnalysis(data.analysis || null);
      setRelated(data.related || []);
    } catch {
      // silent
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <PageContainer title="Prediction" subtitle="Loading...">
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (!prediction) {
    return (
      <PageContainer title="Prediction Not Found">
        <p className="text-xs text-navy-500">Prediction #{id} not found.</p>
        <Link href="/predictions" className="text-xs text-accent-cyan hover:underline mt-2 inline-block">
          Back to predictions
        </Link>
      </PageContainer>
    );
  }

  const catConfig = CATEGORY_CONFIG[prediction.category] || CATEGORY_CONFIG.market;
  const CatIcon = catConfig.icon;
  const isResolved = !!prediction.outcome;
  const outcomeConfig = prediction.outcome ? OUTCOME_CONFIG[prediction.outcome] || OUTCOME_CONFIG.expired : null;
  const OutcomeIcon = outcomeConfig?.icon || Clock;

  const today = new Date().toISOString().split("T")[0];
  const isOverdue = !isResolved && prediction.deadline <= today;
  const daysUntilDeadline = Math.ceil((new Date(prediction.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  // Parse metrics JSON
  let metrics: Record<string, unknown> = {};
  if (prediction.metrics) {
    try { metrics = JSON.parse(prediction.metrics); } catch { /* empty */ }
  }

  // Parse analysis fields
  let tradeRecs: Array<{ ticker: string; direction: string; rationale: string }> = [];
  let riskFactors: string[] = [];
  let marketImpact: { direction?: string; magnitude?: string; sectors?: string[] } = {};
  if (analysis) {
    try { tradeRecs = JSON.parse(analysis.tradeRecommendations); } catch { /* empty */ }
    try { riskFactors = JSON.parse(analysis.riskFactors); } catch { /* empty */ }
    try { marketImpact = JSON.parse(analysis.marketImpact); } catch { /* empty */ }
  }

  const brierScore = prediction.score != null && prediction.outcome
    ? Math.pow(prediction.confidence - (prediction.outcome === "confirmed" ? 1 : 0), 2)
    : null;

  return (
    <PageContainer
      title="Prediction Detail"
      subtitle={`#${prediction.id} - ${catConfig.label}`}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const res = await fetch("/api/chat/sessions", { method: "POST" });
              const data = await res.json();
              if (data.session?.uuid) {
                const prompt = `Analyze prediction #${prediction.id}: "${prediction.claim}" (confidence: ${(prediction.confidence * 100).toFixed(0)}%, deadline: ${prediction.deadline}, outcome: ${prediction.outcome || "pending"}). What is your assessment?`;
                router.push(`/chat/${data.session.uuid}?prompt=${encodeURIComponent(prompt)}`);
              }
            }}
            className="text-accent-cyan border-accent-cyan/30 hover:bg-accent-cyan/10"
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            Discuss
          </Button>
          <Button variant="ghost" size="sm" onClick={() => router.push("/predictions")}>
            <ArrowLeft className="h-3 w-3 mr-1" />
            Back
          </Button>
        </div>
      }
    >
      {/* Outcome Banner */}
      {isResolved && outcomeConfig && (
        <div className={`rounded-lg border ${outcomeConfig.border} ${outcomeConfig.bg} p-5 mb-6`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${outcomeConfig.bg} border ${outcomeConfig.border}`}>
              <OutcomeIcon className={`h-8 w-8 ${outcomeConfig.color}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span className={`text-lg font-bold font-mono uppercase tracking-wider ${outcomeConfig.color}`}>
                  {outcomeConfig.label}
                </span>
                {prediction.score != null && (
                  <span className={`text-lg font-bold font-mono ${prediction.score >= 0.7 ? "text-accent-emerald" : prediction.score >= 0.4 ? "text-accent-amber" : "text-accent-rose"}`}>
                    {(prediction.score * 100).toFixed(0)}% score
                  </span>
                )}
              </div>
              <p className="text-xs text-navy-400 font-sans leading-relaxed">{outcomeConfig.description}</p>
              {prediction.resolvedAt && (
                <span className="text-[10px] text-navy-500 font-mono mt-1 block">
                  Resolved {new Date(prediction.resolvedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </span>
              )}
            </div>
          </div>
          {prediction.outcomeNotes && (
            <div className="mt-4 pt-4 border-t border-navy-700/30">
              <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500 block mb-1.5">Resolution Notes</span>
              <p className="text-sm text-navy-300 font-sans leading-relaxed">{prediction.outcomeNotes}</p>
            </div>
          )}
        </div>
      )}

      {/* Overdue Warning */}
      {isOverdue && (
        <div className="rounded-lg border border-accent-rose/25 bg-accent-rose/5 p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-accent-rose flex-shrink-0" />
          <div className="flex-1">
            <span className="text-sm font-medium text-accent-rose">Overdue</span>
            <p className="text-xs text-navy-400 mt-0.5">
              {Math.abs(daysUntilDeadline) === 0
                ? "This prediction is at its deadline and awaiting resolution."
                : `This prediction is ${Math.abs(daysUntilDeadline)} day${Math.abs(daysUntilDeadline) === 1 ? "" : "s"} past its deadline and awaiting resolution.`}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={resolving}
            onClick={async () => {
              setResolving(true);
              try {
                const res = await fetch(`/api/predictions/${id}/resolve`, { method: "POST" });
                const data = await res.json();
                if (res.ok && data.resolved) {
                  fetchData();
                }
              } catch {
                // silent
              }
              setResolving(false);
            }}
            className="text-accent-rose border-accent-rose/30 hover:bg-accent-rose/10 flex-shrink-0"
          >
            {resolving ? (
              <Clock className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Target className="h-3 w-3 mr-1" />
            )}
            {resolving ? "Resolving..." : "Resolve Now"}
          </Button>
        </div>
      )}

      {/* Claim Card */}
      <div className="border border-navy-700/40 rounded-lg p-5 bg-navy-900/30 mb-6">
        <div className="flex items-start gap-3 mb-4">
          <CatIcon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${catConfig.color}`} />
          <div className="flex-1">
            <span className={`text-[10px] font-mono uppercase tracking-wider ${catConfig.color} block mb-2`}>
              {catConfig.label} Prediction
            </span>
            <p className="text-base text-navy-100 font-sans leading-relaxed">{prediction.claim}</p>
          </div>
        </div>

        {typeof metrics.grounding === "string" && metrics.grounding && (
          <div className="ml-7 mt-2 mb-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500 block mb-1">Grounding</span>
            <p className="text-xs text-navy-400 font-sans italic leading-relaxed">{metrics.grounding}</p>
          </div>
        )}

        {/* Key Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="border border-navy-700/30 rounded p-3 bg-navy-950/40">
            <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500 block mb-1">Confidence</span>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-navy-700/50 overflow-hidden">
                <div
                  className={`h-full rounded-full ${prediction.confidence >= 0.7 ? "bg-accent-emerald" : prediction.confidence >= 0.5 ? "bg-accent-amber" : "bg-navy-400"}`}
                  style={{ width: `${prediction.confidence * 100}%` }}
                />
              </div>
              <span className="text-sm font-bold font-mono text-navy-100">{(prediction.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>
          <div className="border border-navy-700/30 rounded p-3 bg-navy-950/40">
            <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500 block mb-1">Timeframe</span>
            <span className="text-sm font-mono text-navy-200">{prediction.timeframe}</span>
          </div>
          <div className="border border-navy-700/30 rounded p-3 bg-navy-950/40">
            <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500 block mb-1">Deadline</span>
            <span className={`text-sm font-mono ${isOverdue ? "text-accent-rose" : "text-navy-200"}`}>
              {new Date(prediction.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            {!isResolved && (
              <span className={`text-[10px] font-mono block mt-0.5 ${isOverdue ? "text-accent-rose" : "text-navy-500"}`}>
                {isOverdue ? `${Math.abs(daysUntilDeadline)}d overdue` : daysUntilDeadline === 0 ? "today" : `${daysUntilDeadline}d remaining`}
              </span>
            )}
          </div>
          <div className="border border-navy-700/30 rounded p-3 bg-navy-950/40">
            <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500 block mb-1">Created</span>
            <span className="text-sm font-mono text-navy-200">
              {new Date(prediction.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
        </div>

        {/* Scoring Details */}
        {isResolved && prediction.score != null && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <div className="border border-navy-700/30 rounded p-3 bg-navy-950/40">
              <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500 block mb-1">AI Score</span>
              <span className={`text-lg font-bold font-mono ${prediction.score >= 0.7 ? "text-accent-emerald" : prediction.score >= 0.4 ? "text-accent-amber" : "text-accent-rose"}`}>
                {(prediction.score * 100).toFixed(0)}%
              </span>
            </div>
            {brierScore != null && (
              <div className="border border-navy-700/30 rounded p-3 bg-navy-950/40">
                <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500 block mb-1">Brier Score</span>
                <span className={`text-lg font-bold font-mono ${brierScore < 0.2 ? "text-accent-emerald" : brierScore < 0.3 ? "text-accent-amber" : "text-accent-rose"}`}>
                  {brierScore.toFixed(3)}
                </span>
                <span className="text-[9px] text-navy-600 block">
                  {brierScore < 0.1 ? "excellent" : brierScore < 0.2 ? "good" : brierScore < 0.25 ? "baseline" : "poor"}
                </span>
              </div>
            )}
            <div className="border border-navy-700/30 rounded p-3 bg-navy-950/40">
              <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500 block mb-1">Calibration</span>
              <span className="text-xs text-navy-300 font-sans">
                {prediction.confidence >= 0.7 && prediction.outcome === "confirmed" ? "Well calibrated - high confidence confirmed" :
                 prediction.confidence >= 0.7 && prediction.outcome === "denied" ? "Overconfident - high confidence denied" :
                 prediction.confidence < 0.4 && prediction.outcome === "confirmed" ? "Underconfident - low confidence confirmed" :
                 prediction.confidence < 0.4 && prediction.outcome === "denied" ? "Well calibrated - low confidence denied" :
                 "Moderate calibration"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Linked Signal */}
      {signal && (
        <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 mb-6">
          <div className="px-5 py-3 border-b border-navy-700/30 flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-navy-500" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-navy-400">Source Signal</span>
          </div>
          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <Link href={`/signals/${signal.uuid}`} className="text-sm text-navy-200 hover:text-accent-cyan transition-colors font-sans">
                  {signal.title}
                  <ExternalLink className="h-3 w-3 inline ml-1.5 opacity-50" />
                </Link>
                <p className="text-xs text-navy-500 mt-1.5 line-clamp-2">{signal.description}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[10px] font-mono text-navy-500">
                    {new Date(signal.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <span className={`text-[10px] font-mono ${signal.intensity >= 4 ? "text-accent-rose" : signal.intensity >= 3 ? "text-accent-amber" : "text-navy-400"}`}>
                    Intensity {signal.intensity}/5
                  </span>
                  <span className="text-[10px] font-mono text-navy-500 capitalize">{signal.status}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Linked Analysis */}
      {analysis && (
        <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 mb-6">
          <div className="px-5 py-3 border-b border-navy-700/30 flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-navy-500" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-navy-400">AI Analysis</span>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-navy-200 font-sans leading-relaxed">{analysis.summary}</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="border border-navy-700/30 rounded p-3 bg-navy-950/40">
                <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500 block mb-1">Analysis Confidence</span>
                <span className="text-sm font-bold font-mono text-navy-100">{(analysis.confidence * 100).toFixed(0)}%</span>
              </div>
              {analysis.escalationProbability != null && (
                <div className="border border-navy-700/30 rounded p-3 bg-navy-950/40">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500 block mb-1">Escalation Probability</span>
                  <span className={`text-sm font-bold font-mono ${analysis.escalationProbability >= 0.6 ? "text-accent-rose" : "text-navy-100"}`}>
                    {(analysis.escalationProbability * 100).toFixed(0)}%
                  </span>
                </div>
              )}
              {marketImpact.direction && (
                <div className="border border-navy-700/30 rounded p-3 bg-navy-950/40">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500 block mb-1">Market Direction</span>
                  <span className="text-sm font-bold font-mono text-navy-100 uppercase">{marketImpact.direction}</span>
                  {marketImpact.magnitude && (
                    <span className="text-[10px] text-navy-500 block">{marketImpact.magnitude}</span>
                  )}
                </div>
              )}
            </div>

            {analysis.reasoning && (
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500 block mb-1.5">Reasoning</span>
                <p className="text-xs text-navy-400 font-sans leading-relaxed">{analysis.reasoning}</p>
              </div>
            )}

            {tradeRecs.length > 0 && (
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500 block mb-2">Trade Recommendations</span>
                <div className="space-y-1.5">
                  {tradeRecs.map((rec, i) => (
                    <div key={i} className="flex items-center gap-3 border border-navy-700/30 rounded px-3 py-2 bg-navy-950/40">
                      <span className={`text-[10px] font-bold font-mono uppercase px-1.5 py-0.5 rounded ${rec.direction === "long" ? "bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20" : "bg-accent-rose/10 text-accent-rose border border-accent-rose/20"}`}>
                        {rec.direction}
                      </span>
                      <span className="text-xs font-mono text-navy-200">{rec.ticker}</span>
                      <span className="text-xs text-navy-500 font-sans flex-1">{rec.rationale}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {riskFactors.length > 0 && (
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500 block mb-1.5">Risk Factors</span>
                <ul className="space-y-1">
                  {riskFactors.map((risk, i) => (
                    <li key={i} className="text-xs text-navy-400 font-sans flex items-start gap-2">
                      <span className="text-accent-rose mt-0.5 flex-shrink-0">-</span>
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Related Predictions */}
      {related.length > 0 && (
        <div className="border border-navy-700/40 rounded-lg bg-navy-900/30">
          <div className="px-5 py-3 border-b border-navy-700/30 flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-navy-500" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-navy-400">
              Related Predictions
            </span>
            <span className="ml-auto text-[10px] font-mono text-navy-600">{related.length}</span>
          </div>
          <div className="divide-y divide-navy-700/30">
            {related.map((r) => {
              const rOutcome = r.outcome ? OUTCOME_CONFIG[r.outcome] || OUTCOME_CONFIG.expired : null;
              const RIcon = rOutcome?.icon || Clock;
              return (
                <Link
                  key={r.id}
                  href={`/predictions/${r.uuid}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-navy-800/30 transition-colors group"
                >
                  {rOutcome ? (
                    <RIcon className={`h-3.5 w-3.5 flex-shrink-0 ${rOutcome.color}`} />
                  ) : (
                    <Clock className="h-3.5 w-3.5 flex-shrink-0 text-navy-500" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-navy-300 truncate group-hover:text-navy-100 transition-colors">{r.claim}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] font-mono text-navy-500">
                        {new Date(r.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      <span className="text-[10px] font-mono text-navy-600">{(r.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  {rOutcome && (
                    <span className={`text-[9px] font-bold font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${rOutcome.color} ${rOutcome.bg} border ${rOutcome.border}`}>
                      {rOutcome.label}
                    </span>
                  )}
                  {!r.outcome && (
                    <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 px-1.5 py-0.5 rounded border border-navy-700/30 bg-navy-800/30">
                      Pending
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Discussion */}
      {prediction && <CommentSection targetType="prediction" targetId={prediction.id} />}
    </PageContainer>
  );
}
