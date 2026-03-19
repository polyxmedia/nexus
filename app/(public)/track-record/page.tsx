"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  Target,
  Activity,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  Globe,
  BarChart3,
} from "lucide-react";
import { useReveal, anim, hidden, shown, Ruled, SectionHead } from "@/components/public/reveal";
import { EmailCapture } from "@/components/public/email-capture";

// ── Types ──

interface ResolvedPrediction {
  id: number;
  uuid: string;
  claim: string;
  category: string;
  confidence: number;
  outcome: string;
  outcomeNotes: string | null;
  score: number | null;
  resolvedAt: string | null;
  createdAt: string;
  deadline: string;
  direction: string | null;
  directionCorrect: number | null;
  referenceSymbol: string | null;
}

interface FeedbackReport {
  brierScore: number;
  binaryAccuracy: number;
  avgConfidence: number;
  calibrationGap: number;
  totalResolved: number;
  sampleSufficient: boolean;
  recentTrend: { recentBrier: number; priorBrier: number; improving: boolean } | null;
  directionLevel: { totalWithDirection: number; directionCorrectRate: number; totalWithLevel: number; levelCorrectRate: number };
  byCategory: Array<{ category: string; total: number; confirmed: number; brierScore: number; reliable: boolean }>;
}

// ── Config ──

const OUTCOME_CONFIG: Record<string, { icon: typeof CheckCircle2; label: string; color: string; bg: string }> = {
  confirmed: { icon: CheckCircle2, label: "HIT", color: "text-accent-emerald", bg: "bg-accent-emerald/10" },
  denied: { icon: XCircle, label: "MISS", color: "text-accent-rose", bg: "bg-accent-rose/10" },
  partial: { icon: MinusCircle, label: "PARTIAL", color: "text-accent-amber", bg: "bg-accent-amber/10" },
  expired: { icon: Clock, label: "EXPIRED", color: "text-navy-500", bg: "bg-navy-800/40" },
};

const CATEGORY_CONFIG: Record<string, { icon: typeof Globe; color: string; label: string }> = {
  market: { icon: BarChart3, color: "text-accent-cyan", label: "Market" },
  geopolitical: { icon: Globe, color: "text-accent-rose", label: "Geopolitical" },
};

function brierQuality(score: number): { label: string; color: string } {
  if (score < 0.1) return { label: "Excellent", color: "text-accent-emerald" };
  if (score < 0.2) return { label: "Good", color: "text-accent-cyan" };
  if (score < 0.25) return { label: "Fair", color: "text-navy-300" };
  return { label: "Poor", color: "text-accent-rose" };
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ── Page ──

export default function TrackRecordPage() {
  const heroReveal = useReveal(0.05);
  const statsReveal = useReveal();
  const listReveal = useReveal(0.05);
  const ctaReveal = useReveal(0.2);

  const [predictions, setPredictions] = useState<ResolvedPrediction[]>([]);
  const [report, setReport] = useState<FeedbackReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [predRes, feedbackRes] = await Promise.all([
        fetch("/api/predictions/recent-resolved"),
        fetch("/api/predictions/feedback"),
      ]);
      const predData = await predRes.json();
      const feedbackData = await feedbackRes.json();
      setPredictions(predData.predictions || []);
      setReport(feedbackData.report || null);
    } catch {
      // Non-critical, fail silently
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const hits = predictions.filter(p => p.outcome === "confirmed");
  const misses = predictions.filter(p => p.outcome === "denied");
  const partials = predictions.filter(p => p.outcome === "partial");

  const filtered = activeFilter
    ? predictions.filter(p => p.outcome === activeFilter)
    : predictions;

  return (
    <main className="min-h-screen selection:bg-accent-cyan/20">
      {/* Grid background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
      </div>

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-16 px-6 overflow-hidden">
        <div className="absolute top-20 right-1/4 w-[500px] h-[300px] bg-accent-emerald/[0.02] rounded-full blur-[120px] pointer-events-none" />

        <div ref={heroReveal.ref} className="relative max-w-5xl mx-auto">
          <div className={`${anim} ${heroReveal.visible ? shown : hidden}`}>
            <div className="flex items-center gap-3 mb-8">
              <span className="font-mono text-[10px] text-navy-600 tabular-nums">00</span>
              <div className="h-px w-6 bg-navy-600/50" />
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-navy-500">
                Live Data / No Curation
              </span>
            </div>
          </div>

          <h1
            className={`font-sans text-[2.5rem] md:text-[3.25rem] font-light leading-[1.1] tracking-tight text-navy-100 max-w-3xl ${anim} ${heroReveal.visible ? shown : hidden}`}
            style={{ transitionDelay: "100ms" }}
          >
            Track Record
          </h1>

          <p
            className={`mt-8 font-sans text-base md:text-lg text-navy-400 leading-relaxed max-w-2xl ${anim} ${heroReveal.visible ? shown : hidden}`}
            style={{ transitionDelay: "200ms" }}
          >
            Every prediction NEXUS generates is tracked, auto-resolved against
            market data, and scored using proper scoring rules. No
            cherry-picking. No retroactive edits. What you see below is the
            actual performance of a live system.
          </p>

          <div
            className={`mt-6 flex items-center gap-4 ${anim} ${heroReveal.visible ? shown : hidden}`}
            style={{ transitionDelay: "300ms" }}
          >
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-accent-emerald animate-pulse" />
              <span className="text-[10px] font-mono text-navy-500 uppercase tracking-wider">Live</span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-[10px] font-mono text-navy-600 hover:text-navy-400 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      <Ruled maxWidth="max-w-5xl" />

      {/* ── STATS ── */}
      <section className="px-6 py-16">
        <div ref={statsReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="01" label="Performance Summary" visible={statsReveal.visible} />

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-navy-600 text-xs">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading live data...
            </div>
          ) : report ? (
            <>
              <div
                className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-8 ${anim} ${statsReveal.visible ? shown : hidden}`}
                style={{ transitionDelay: "100ms" }}
              >
                {[
                  {
                    label: "Brier Score",
                    value: report.brierScore.toFixed(3),
                    note: brierQuality(report.brierScore).label,
                    color: brierQuality(report.brierScore).color,
                  },
                  {
                    label: "Hit Rate",
                    value: `${(report.binaryAccuracy * 100).toFixed(0)}%`,
                    note: `${hits.length} hits / ${predictions.length} resolved`,
                    color: report.binaryAccuracy >= 0.5 ? "text-accent-emerald" : "text-navy-300",
                  },
                  {
                    label: "Avg Confidence",
                    value: `${(report.avgConfidence * 100).toFixed(0)}%`,
                    note: "Mean stated probability",
                    color: "text-navy-100",
                  },
                  {
                    label: "Calibration Gap",
                    value: `${report.calibrationGap > 0 ? "+" : ""}${(report.calibrationGap * 100).toFixed(0)}pp`,
                    note: Math.abs(report.calibrationGap) > 0.1
                      ? report.calibrationGap > 0 ? "Overconfident" : "Underconfident"
                      : "Well calibrated",
                    color: Math.abs(report.calibrationGap) > 0.1 ? "text-accent-amber" : "text-accent-emerald",
                  },
                  {
                    label: "Total Resolved",
                    value: report.totalResolved.toString(),
                    note: report.sampleSufficient ? "Statistically meaningful" : "Building sample",
                    color: "text-navy-100",
                  },
                ].map((stat) => (
                  <div key={stat.label} className="border border-navy-800/60 rounded-lg bg-navy-900/30 p-4">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-navy-600 block mb-2">
                      {stat.label}
                    </span>
                    <span className={`text-xl font-mono font-light tabular-nums ${stat.color}`}>
                      {stat.value}
                    </span>
                    <span className="text-[10px] text-navy-600 block mt-1">{stat.note}</span>
                  </div>
                ))}
              </div>

              {/* Trend + Direction */}
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 ${anim} ${statsReveal.visible ? shown : hidden}`}
                style={{ transitionDelay: "200ms" }}
              >
                {report.recentTrend && (
                  <div className="border border-navy-800/60 rounded-lg bg-navy-900/30 p-4 flex items-center gap-4">
                    {report.recentTrend.improving ? (
                      <TrendingUp className="h-5 w-5 text-accent-emerald shrink-0" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-accent-rose shrink-0" />
                    )}
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-navy-600 block">Trend</span>
                      <span className={`text-sm font-mono ${report.recentTrend.improving ? "text-accent-emerald" : "text-accent-rose"}`}>
                        {report.recentTrend.improving ? "Improving" : "Declining"}
                      </span>
                      <span className="text-[10px] text-navy-600 block mt-0.5">
                        Recent: {report.recentTrend.recentBrier.toFixed(3)} vs prior: {report.recentTrend.priorBrier.toFixed(3)}
                      </span>
                    </div>
                  </div>
                )}

                {report.directionLevel.totalWithDirection > 0 && (
                  <div className="border border-navy-800/60 rounded-lg bg-navy-900/30 p-4">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-navy-600 block mb-2">Direction Accuracy</span>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-xl font-mono font-light ${report.directionLevel.directionCorrectRate >= 0.55 ? "text-accent-emerald" : "text-navy-300"}`}>
                        {(report.directionLevel.directionCorrectRate * 100).toFixed(0)}%
                      </span>
                      <span className="text-[10px] text-navy-600">
                        correct on {report.directionLevel.totalWithDirection} directional calls
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Outcome counts */}
              <div
                className={`flex flex-wrap gap-2 mb-4 ${anim} ${statsReveal.visible ? shown : hidden}`}
                style={{ transitionDelay: "300ms" }}
              >
                <button
                  onClick={() => setActiveFilter(null)}
                  className={`px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider border transition-colors ${
                    activeFilter === null ? "border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan" : "border-navy-800 text-navy-500 hover:text-navy-300"
                  }`}
                >
                  All ({predictions.length})
                </button>
                {[
                  { key: "confirmed", count: hits.length },
                  { key: "denied", count: misses.length },
                  { key: "partial", count: partials.length },
                ].filter(o => o.count > 0).map(({ key, count }) => {
                  const cfg = OUTCOME_CONFIG[key];
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveFilter(activeFilter === key ? null : key)}
                      className={`px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider border transition-colors ${
                        activeFilter === key ? `${cfg.bg} ${cfg.color} border-current/30` : "border-navy-800 text-navy-500 hover:text-navy-300"
                      }`}
                    >
                      {cfg.label} ({count})
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="border border-navy-800/60 rounded-lg bg-navy-900/30 p-8 text-center">
              <Target className="h-6 w-6 text-navy-700 mx-auto mb-3" />
              <p className="text-sm text-navy-500">Prediction engine is building its track record.</p>
              <p className="text-[10px] text-navy-600 mt-1">Check back once predictions have resolved.</p>
            </div>
          )}
        </div>
      </section>

      <Ruled maxWidth="max-w-5xl" />

      {/* ── PREDICTION LIST ── */}
      <section className="px-6 py-16">
        <div ref={listReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="02" label="Resolved Predictions" visible={listReveal.visible} />

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 rounded-lg bg-navy-900/30 border border-navy-800/60 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Activity className="h-6 w-6 text-navy-700 mx-auto mb-3" />
              <p className="text-sm text-navy-500">No resolved predictions yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((p, i) => {
                const cfg = OUTCOME_CONFIG[p.outcome] || OUTCOME_CONFIG.expired;
                const Icon = cfg.icon;
                const catCfg = CATEGORY_CONFIG[p.category];
                const CatIcon = catCfg?.icon || Globe;
                const brier = p.score != null ? Math.pow(p.confidence - (p.outcome === "confirmed" ? 1 : p.outcome === "partial" ? 0.5 : 0), 2) : null;

                return (
                  <Link
                    key={p.id}
                    href={`/predictions/${p.uuid}`}
                    className={`block border border-navy-800/60 rounded-lg bg-navy-900/30 hover:bg-navy-900/50 hover:border-navy-700/50 transition-all ${anim} ${listReveal.visible ? shown : hidden}`}
                    style={{ transitionDelay: `${Math.min(i * 50, 500)}ms` }}
                  >
                    <div className="px-4 sm:px-5 py-3 sm:py-4">
                      {/* Outcome + claim */}
                      <div className="flex items-start gap-2 sm:gap-3">
                        <div className="flex items-center gap-1.5 pt-0.5 shrink-0">
                          <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                          <span className={`text-[10px] font-mono font-medium uppercase tracking-wider ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-[13px] text-navy-200 leading-relaxed flex-1">{p.claim}</p>
                      </div>

                      {/* Resolution notes */}
                      {p.outcomeNotes && (
                        <p className="text-[10px] text-navy-500 mt-2 sm:ml-[4.5rem] line-clamp-2 leading-relaxed">
                          {p.outcomeNotes}
                        </p>
                      )}

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3 pt-2 border-t border-navy-800/30 sm:ml-[4.5rem]">
                        <div className="flex items-center gap-1.5">
                          <CatIcon className={`h-3 w-3 ${catCfg?.color || "text-navy-500"}`} />
                          <span className="text-[10px] font-mono text-navy-500 uppercase">{p.category}</span>
                        </div>

                        {/* Confidence */}
                        <div className="flex items-center gap-1.5">
                          <div className="w-10 h-1 rounded-full bg-navy-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-navy-500"
                              style={{ width: `${p.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-navy-500 font-mono">{(p.confidence * 100).toFixed(0)}%</span>
                        </div>

                        {/* Direction */}
                        {p.direction && (
                          <span className={`text-[10px] font-mono ${
                            p.directionCorrect === 1 ? "text-accent-emerald" : p.directionCorrect === 0 ? "text-accent-rose" : "text-navy-500"
                          }`}>
                            {p.direction === "up" ? "LONG" : p.direction === "down" ? "SHORT" : "FLAT"}
                            {p.directionCorrect != null && (p.directionCorrect === 1 ? " correct" : " wrong")}
                          </span>
                        )}

                        {/* Symbol */}
                        {p.referenceSymbol && (
                          <span className="text-[10px] font-mono text-accent-cyan">{p.referenceSymbol}</span>
                        )}

                        {/* Brier */}
                        {brier != null && (
                          <span className={`text-[10px] font-mono ${brierQuality(brier).color}`}>
                            Brier {brier.toFixed(3)}
                          </span>
                        )}

                        <div className="flex-1 hidden sm:block" />

                        {/* Date */}
                        <span className="text-[10px] font-mono text-navy-600">
                          {p.resolvedAt ? timeAgo(p.resolvedAt) : ""}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Deep link */}
          {predictions.length > 0 && (
            <div className={`mt-8 text-center ${anim} ${listReveal.visible ? shown : hidden}`} style={{ transitionDelay: "400ms" }}>
              <Link
                href="/research/prediction-accuracy"
                className="font-mono text-[11px] uppercase tracking-widest text-navy-500 hover:text-accent-cyan transition-colors"
              >
                View full calibration analysis and methodology
              </Link>
            </div>
          )}
        </div>
      </section>

      <Ruled maxWidth="max-w-5xl" />

      {/* ── CTA ── */}
      <section className="px-6 py-20">
        <div ref={ctaReveal.ref} className="max-w-3xl mx-auto text-center">
          <h2
            className={`font-sans text-2xl md:text-3xl font-light text-navy-100 mb-6 ${anim} ${ctaReveal.visible ? shown : hidden}`}
          >
            The predictions are public.
            <br />
            <span className="text-navy-400">The intelligence behind them is not.</span>
          </h2>

          <p
            className={`text-sm text-navy-500 leading-relaxed max-w-lg mx-auto mb-10 ${anim} ${ctaReveal.visible ? shown : hidden}`}
            style={{ transitionDelay: "100ms" }}
          >
            Every prediction you see above was generated from multi-layer signal convergence,
            AI synthesis, and regime-aware calibration. Get access to the full system.
          </p>

          <div
            className={`flex flex-wrap items-center justify-center gap-5 mb-12 ${anim} ${ctaReveal.visible ? shown : hidden}`}
            style={{ transitionDelay: "200ms" }}
          >
            <Link
              href="/register"
              className="group inline-flex items-center gap-2.5 px-6 py-2.5 font-mono text-[11px] uppercase tracking-widest text-navy-950 bg-navy-100 hover:bg-white rounded-lg transition-all"
            >
              Start Free Trial
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/why-nexus"
              className="font-mono text-[11px] uppercase tracking-widest text-navy-500 hover:text-navy-300 transition-colors"
            >
              Why NEXUS
            </Link>
          </div>

          <EmailCapture className="max-w-md mx-auto" />
        </div>
      </section>
    </main>
  );
}
