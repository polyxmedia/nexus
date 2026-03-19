"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  Globe,
  BarChart3,
  Target,
  TrendingUp,
  TrendingDown,
  Loader2,
} from "lucide-react";
import { EmailCapture } from "@/components/public/email-capture";

// ── Types ──

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
  createdAt: string;
  resolvedAt: string | null;
  direction: string | null;
  priceTarget: number | null;
  referenceSymbol: string | null;
  directionCorrect: number | null;
  levelCorrect: number | null;
  regimeAtCreation: string | null;
}

interface RelatedPrediction {
  id: number;
  uuid: string;
  claim: string;
  confidence: number;
  outcome: string | null;
  category: string;
}

// ── Config ──

const OUTCOME_CONFIG: Record<string, { icon: typeof CheckCircle2; label: string; color: string; bg: string; border: string }> = {
  confirmed: { icon: CheckCircle2, label: "HIT", color: "text-accent-emerald", bg: "bg-accent-emerald/8", border: "border-accent-emerald/30" },
  denied: { icon: XCircle, label: "MISS", color: "text-accent-rose", bg: "bg-accent-rose/8", border: "border-accent-rose/30" },
  partial: { icon: MinusCircle, label: "PARTIAL", color: "text-accent-amber", bg: "bg-accent-amber/8", border: "border-accent-amber/30" },
  expired: { icon: Clock, label: "EXPIRED", color: "text-navy-500", bg: "bg-navy-800/40", border: "border-navy-700/30" },
};

const CATEGORY_CONFIG: Record<string, { icon: typeof Globe; color: string; label: string }> = {
  market: { icon: BarChart3, color: "text-accent-cyan", label: "Market" },
  geopolitical: { icon: Globe, color: "text-accent-rose", label: "Geopolitical" },
};

function parseGrounding(metrics: string | null): string | null {
  if (!metrics) return null;
  try { return JSON.parse(metrics).grounding || null; } catch { return null; }
}

function daysUntilOrSince(dateStr: string): string {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d ago`;
  if (diff === 0) return "today";
  return `in ${diff}d`;
}

// ── Page ──

export default function PublicPredictionPage() {
  const params = useParams();
  const id = params.id as string;

  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [related, setRelated] = useState<RelatedPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/predictions/${id}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setPrediction(data.prediction || null);
        setRelated(data.related || []);
        if (!data.prediction) setNotFound(true);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-navy-600 text-xs">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading prediction...
        </div>
      </main>
    );
  }

  if (notFound || !prediction) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <Target className="h-8 w-8 text-navy-700 mx-auto mb-4" />
          <h1 className="text-lg text-navy-300 font-medium mb-2">Prediction not found</h1>
          <p className="text-sm text-navy-600 mb-6">This prediction may have been removed or the link is incorrect.</p>
          <Link
            href="/track-record"
            className="font-mono text-[11px] uppercase tracking-widest text-accent-cyan hover:text-accent-cyan/80 transition-colors"
          >
            View all predictions
          </Link>
        </div>
      </main>
    );
  }

  const p = prediction;
  const outcomeCfg = p.outcome ? OUTCOME_CONFIG[p.outcome] || OUTCOME_CONFIG.expired : null;
  const OutcomeIcon = outcomeCfg?.icon;
  const catCfg = CATEGORY_CONFIG[p.category];
  const CatIcon = catCfg?.icon || Globe;
  const grounding = parseGrounding(p.metrics);
  const brier = p.outcome && p.confidence != null
    ? Math.pow(p.confidence - (p.outcome === "confirmed" ? 1 : p.outcome === "partial" ? 0.5 : 0), 2)
    : null;
  const isResolved = !!p.outcome;

  return (
    <main className="min-h-screen selection:bg-accent-cyan/20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-20">
        {/* Back link */}
        <Link
          href="/track-record"
          className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-navy-600 hover:text-navy-400 transition-colors mb-8"
        >
          <ArrowLeft className="h-3 w-3" />
          Track Record
        </Link>

        {/* Outcome banner */}
        {isResolved && outcomeCfg && OutcomeIcon && (
          <div className={`border ${outcomeCfg.border} ${outcomeCfg.bg} rounded-lg px-5 py-4 mb-6`}>
            <div className="flex items-center gap-2.5 mb-2">
              <OutcomeIcon className={`h-5 w-5 ${outcomeCfg.color}`} />
              <span className={`text-sm font-mono font-bold uppercase tracking-wider ${outcomeCfg.color}`}>
                {outcomeCfg.label}
              </span>
              {brier != null && (
                <span className="text-[10px] font-mono text-navy-500 ml-auto">
                  Brier {brier.toFixed(3)}
                </span>
              )}
            </div>
            {p.outcomeNotes && (
              <p className="text-[12px] text-navy-400 leading-relaxed">{p.outcomeNotes}</p>
            )}
            {p.resolvedAt && (
              <p className="text-[10px] text-navy-600 font-mono mt-2">
                Resolved {new Date(p.resolvedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>
        )}

        {/* Claim card */}
        <div className="border border-navy-700/30 rounded-lg bg-navy-900/60 p-5 sm:p-6 mb-6">
          {/* Category + direction */}
          <div className="flex flex-wrap items-center gap-2.5 mb-4">
            <div className="flex items-center gap-1.5">
              <CatIcon className={`h-3.5 w-3.5 ${catCfg?.color || "text-navy-500"}`} />
              <span className={`text-[10px] font-mono uppercase tracking-widest ${catCfg?.color || "text-navy-500"}`}>
                {catCfg?.label || p.category}
              </span>
            </div>
            {p.direction && (
              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                p.direction === "up" ? "bg-accent-emerald/10 text-accent-emerald" :
                p.direction === "down" ? "bg-accent-rose/10 text-accent-rose" :
                "bg-navy-800/40 text-navy-500"
              }`}>
                {p.direction === "up" ? "LONG" : p.direction === "down" ? "SHORT" : "FLAT"}
                {p.directionCorrect != null && (p.directionCorrect === 1 ? " correct" : " wrong")}
              </span>
            )}
            {p.referenceSymbol && (
              <span className="text-[10px] font-mono text-accent-cyan">{p.referenceSymbol}</span>
            )}
            {!isResolved && (
              <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-navy-800/40 text-navy-500">
                <Clock className="h-2.5 w-2.5" />
                Pending
              </span>
            )}
          </div>

          {/* Claim text */}
          <h1 className="text-base sm:text-lg text-navy-100 leading-relaxed font-medium mb-4">
            {p.claim}
          </h1>

          {/* Grounding */}
          {grounding && (
            <p className="text-[12px] text-navy-500 leading-relaxed mb-4 border-l-2 border-navy-800 pl-3">
              {grounding}
            </p>
          )}

          {/* Metrics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-navy-800/40">
            <div>
              <span className="text-[9px] font-mono text-navy-600 uppercase tracking-wider block mb-1">Confidence</span>
              <div className="flex items-center gap-2">
                <div className="w-14 h-1.5 rounded-full bg-navy-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${p.confidence >= 0.7 ? "bg-accent-emerald" : p.confidence >= 0.5 ? "bg-accent-amber" : "bg-navy-500"}`}
                    style={{ width: `${p.confidence * 100}%` }}
                  />
                </div>
                <span className="text-sm font-mono text-navy-200">{(p.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
            <div>
              <span className="text-[9px] font-mono text-navy-600 uppercase tracking-wider block mb-1">Timeframe</span>
              <span className="text-sm font-mono text-navy-300">{p.timeframe}</span>
            </div>
            <div>
              <span className="text-[9px] font-mono text-navy-600 uppercase tracking-wider block mb-1">Deadline</span>
              <span className="text-sm font-mono text-navy-300">
                {new Date(p.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
              <span className="text-[10px] text-navy-600 ml-1.5">{daysUntilOrSince(p.deadline)}</span>
            </div>
            <div>
              <span className="text-[9px] font-mono text-navy-600 uppercase tracking-wider block mb-1">Created</span>
              <span className="text-sm font-mono text-navy-300">
                {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
          </div>

          {/* Price target + regime */}
          {(p.priceTarget || p.regimeAtCreation) && (
            <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-navy-800/30">
              {p.priceTarget && (
                <div>
                  <span className="text-[9px] font-mono text-navy-600 uppercase tracking-wider block mb-0.5">Price Target</span>
                  <span className="text-sm font-mono text-navy-300">${p.priceTarget.toLocaleString()}</span>
                </div>
              )}
              {p.regimeAtCreation && (
                <div>
                  <span className="text-[9px] font-mono text-navy-600 uppercase tracking-wider block mb-0.5">Regime</span>
                  <span className="text-sm font-mono text-navy-400">{p.regimeAtCreation}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Related predictions */}
        {related.length > 0 && (
          <div className="mb-8">
            <h3 className="text-[10px] font-mono uppercase tracking-widest text-navy-600 mb-3">Related Predictions</h3>
            <div className="space-y-2">
              {related.map((r) => {
                const rCfg = r.outcome ? OUTCOME_CONFIG[r.outcome] : null;
                const RIcon = rCfg?.icon || Clock;
                return (
                  <Link
                    key={r.id}
                    href={`/predictions/${r.uuid}`}
                    className="flex items-start gap-2.5 border border-navy-800/40 rounded-lg bg-navy-900/30 px-4 py-3 hover:bg-navy-900/50 transition-colors"
                  >
                    <RIcon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${rCfg?.color || "text-navy-600"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-navy-300 line-clamp-2">{r.claim}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-mono text-navy-600">{r.category}</span>
                        <span className="text-[9px] font-mono text-navy-600">{(r.confidence * 100).toFixed(0)}%</span>
                        {rCfg && <span className={`text-[9px] font-mono ${rCfg.color}`}>{rCfg.label}</span>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="border border-navy-700/30 rounded-lg bg-navy-900/40 p-6 text-center mb-8">
          <h2 className="text-sm text-navy-200 font-medium mb-2">
            See the full intelligence picture
          </h2>
          <p className="text-[12px] text-navy-500 mb-5 max-w-md mx-auto">
            This prediction was generated from multi-layer signal convergence.
            Access the full system to see the signals, analysis, and execution tools behind every call.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 px-5 py-2.5 font-mono text-[10px] uppercase tracking-widest text-navy-950 bg-navy-100 hover:bg-white rounded-lg transition-all"
            >
              Start Free Trial
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/track-record"
              className="font-mono text-[10px] uppercase tracking-widest text-navy-500 hover:text-navy-300 transition-colors"
            >
              View Track Record
            </Link>
          </div>
        </div>

        {/* Email capture */}
        <EmailCapture className="max-w-md mx-auto" />
      </div>
    </main>
  );
}
