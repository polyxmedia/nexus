"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Target,
  BarChart3,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Shield,
  Eye,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

// ── Types ──

interface CalibrationBucket {
  range: string;
  midpoint: number;
  count: number;
  confirmedRate: number;
  brierContribution?: number;
  reliable: boolean;
}

interface CategoryRow {
  category: string;
  total: number;
  confirmed: number;
  denied: number;
  partial?: number;
  expired?: number;
  brierScore: number;
  avgConfidence: number;
  calibrationGap: number;
  reliable: boolean;
}

interface FeedbackReport {
  brierScore: number;
  logLoss: number;
  binaryAccuracy: number;
  avgConfidence: number;
  calibrationGap: number;
  totalResolved: number;
  sampleSufficient: boolean;
  calibration: CalibrationBucket[];
  byCategory: CategoryRow[];
  timeframeAccuracy: Record<string, { count: number; brierScore: number; binaryAccuracy: number; reliable: boolean }>;
  recentTrend: { recentBrier: number; priorBrier: number; improving: boolean; windowSize: number } | null;
  failurePatterns: { pattern: string; frequency: number }[];
  bin: { bias: number; noise: number; information: number; biasDirection: string; interpretation: string } | null;
  directionLevel: { totalWithDirection: number; directionCorrectRate: number; totalWithLevel: number; levelCorrectRate: number; partialRate?: number } | null;
  regimeInvalidatedCount: number;
  postEventCount: number;
  brierSkillScore: number | null;
  brierBaseline: number | null;
  difficultyTiers: {
    easy: { count: number; brier: number; bss: number | null };
    medium: { count: number; brier: number; bss: number | null };
    hard: { count: number; brier: number; bss: number | null };
  } | null;
  rollingBrier: {
    days30: number | null;
    days60: number | null;
    days90: number | null;
  } | null;
}

interface ResolvedPrediction {
  id: number;
  claim: string;
  category: string;
  confidence: number;
  outcome: string;
  score: number | null;
  resolvedAt: string | null;
  createdAt: string;
  direction: string | null;
  directionCorrect: number | null;
}

// ── Scroll reveal ──

function useReveal(threshold = 0.12) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ── Helpers ──

function brierColor(score: number): string {
  if (score < 0.15) return "text-accent-emerald";
  if (score <= 0.25) return "text-accent-cyan";
  return "text-accent-amber";
}

function brierLabel(score: number): string {
  if (score < 0.1) return "Excellent";
  if (score < 0.2) return "Good";
  if (score < 0.3) return "Fair";
  return "Poor";
}

function bssColor(score: number | null): string {
  if (score === null) return "text-navy-500";
  if (score > 0.2) return "text-accent-emerald";
  if (score > 0) return "text-accent-cyan";
  return "text-accent-rose";
}

function bssLabel(score: number | null): string {
  if (score === null) return "N/A";
  if (score > 0.3) return "Strong skill";
  if (score > 0.1) return "Moderate skill";
  if (score > 0) return "Marginal skill";
  return "No skill";
}

function outcomeIcon(outcome: string) {
  switch (outcome) {
    case "confirmed": return <CheckCircle2 className="w-3.5 h-3.5 text-accent-emerald" />;
    case "denied": return <XCircle className="w-3.5 h-3.5 text-accent-rose" />;
    case "partial": return <MinusCircle className="w-3.5 h-3.5 text-accent-amber" />;
    case "expired": return <Clock className="w-3.5 h-3.5 text-navy-500" />;
    default: return <AlertTriangle className="w-3.5 h-3.5 text-navy-500" />;
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── Live pulse ──

function LivePulse({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-emerald opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-emerald" />
      </span>
      {label && <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-accent-emerald">{label}</span>}
    </span>
  );
}

// ── Refresh interval ──
const REFRESH_INTERVAL = 300_000; // 5min - reduced from 60s

// ════════════════════════════════════════════════
// ── PAGE ──
// ════════════════════════════════════════════════

export default function PredictionAccuracyPage() {
  const [report, setReport] = useState<FeedbackReport | null>(null);
  const [predictions, setPredictions] = useState<ResolvedPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hero = useReveal(0.1);
  const statsReveal = useReveal();
  const brierReveal = useReveal();
  const calibrationReveal = useReveal();
  const categoryReveal = useReveal();
  const trendReveal = useReveal();
  const scorecardReveal = useReveal();
  const transparencyReveal = useReveal();
  const relatedReveal = useReveal();

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [feedbackRes, recentRes] = await Promise.all([
        fetch("/api/predictions/feedback"),
        fetch("/api/predictions/recent-resolved"),
      ]);
      const feedbackData = await feedbackRes.json();
      const recentData = await recentRes.json();
      if (feedbackData.report) setReport(feedbackData.report);
      if (recentData.predictions) setPredictions(recentData.predictions);
      setLastUpdated(new Date());
    } catch {
      // Silently fail on refresh
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const startPolling = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (document.visibilityState === "visible") {
        intervalRef.current = setInterval(() => fetchData(true), REFRESH_INTERVAL);
      }
    };
    startPolling();
    document.addEventListener("visibilitychange", startPolling);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", startPolling);
    };
  }, [fetchData]);

  const insufficient = !loading && (!report || !report.sampleSufficient);

  return (
    <main className="min-h-screen">
      {/* ── Hero ── */}
      <section className="relative pt-28 pb-16 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        </div>

        <div ref={hero.ref} className="relative max-w-5xl mx-auto">
          <div className={`transition-all duration-700 ${hero.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 max-w-12 bg-navy-500/30" />
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-navy-400">Research / Prediction Accuracy</span>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-navy-100 max-w-2xl">
                Live Prediction Record
              </h1>
              <LivePulse label="Live" />
            </div>

            <p className="mt-3 font-sans text-base text-navy-400 leading-relaxed max-w-2xl">
              Every NEXUS prediction is timestamped, tracked, and scored against real-world outcomes. This page pulls directly from the live database. No curation, no editing, no deletion. The failures sit right next to the successes.
            </p>

            {/* Last updated + refresh */}
            <div className="mt-4 flex items-center gap-4">
              {lastUpdated && (
                <span className="font-mono text-[10px] text-navy-500">
                  Last updated: {lastUpdated.toLocaleTimeString()} (auto-refreshes every 60s)
                </span>
              )}
              <button
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-navy-400 hover:text-navy-200 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Loading state ── */}
      {loading && (
        <section className="px-6 pb-16">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-navy-500 animate-spin" />
              <span className="font-mono text-[11px] text-navy-500">Loading live prediction data...</span>
            </div>
          </div>
        </section>
      )}

      {/* ── Insufficient data state ── */}
      {insufficient && !loading && (
        <section className="px-6 pb-16">
          <div className="max-w-5xl mx-auto">
            <div className="border border-navy-800/60 rounded-lg p-8 text-center">
              <AlertTriangle className="w-6 h-6 text-navy-500 mx-auto mb-3" />
              <p className="font-mono text-[11px] uppercase tracking-wider text-navy-400 mb-2">Insufficient Data</p>
              <p className="font-sans text-sm text-navy-500 max-w-md mx-auto">
                The system requires a minimum of 5 resolved predictions to generate meaningful accuracy metrics. Predictions are being generated and tracked, results will appear here once enough data has accumulated.
              </p>
              {report && (
                <p className="font-mono text-[10px] text-navy-600 mt-3">
                  Currently tracking {report.totalResolved} resolved prediction{report.totalResolved !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Live data sections ── */}
      {report && report.sampleSufficient && (
        <>
          {/* ── Sample warning ── */}
          {report.totalResolved < 50 && (
            <section className="px-6 pb-6">
              <div className="max-w-5xl mx-auto">
                <div className="flex items-center gap-3 px-4 py-3 border border-accent-amber/20 rounded-lg bg-accent-amber/[0.04]">
                  <AlertTriangle className="w-4 h-4 text-accent-amber flex-shrink-0" />
                  <p className="font-mono text-[10px] text-accent-amber/80">
                    Metrics are not yet statistically meaningful (n={report.totalResolved}, need 50+). Treat all figures as preliminary estimates.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* ── Stats ── */}
          <section className="px-6 pb-16">
            <div ref={statsReveal.ref} className="max-w-5xl mx-auto">
              <div className={`grid grid-cols-2 lg:grid-cols-5 gap-x-8 gap-y-6 transition-all duration-700 ${statsReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                {([
                  { label: "Brier Skill Score", value: report.brierSkillScore != null ? report.brierSkillScore.toFixed(3) : "N/A", color: bssColor(report.brierSkillScore), sub: report.brierSkillScore != null ? bssLabel(report.brierSkillScore) : undefined },
                  { label: "Brier Score", value: report.brierScore.toFixed(3), color: brierColor(report.brierScore), sub: brierLabel(report.brierScore) },
                  { label: "Brier Baseline", value: report.brierBaseline != null ? report.brierBaseline.toFixed(3) : "N/A", color: "text-navy-300", sub: "Base rate reference" },
                  { label: "Predictions Resolved", value: report.totalResolved.toLocaleString(), color: "text-navy-100" },
                  { label: "Calibration Gap", value: (report.calibrationGap * 100).toFixed(1) + "%", color: report.calibrationGap < 0.05 ? "text-accent-emerald" : report.calibrationGap < 0.1 ? "text-accent-cyan" : "text-accent-amber" },
                ] as Array<{ label: string; value: string; color: string; sub?: string }>).map((stat, i) => (
                  <div key={stat.label} className="transition-all duration-700" style={{ transitionDelay: `${i * 80}ms` }}>
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-navy-500 mb-2">
                      {stat.label}
                    </p>
                    <p className={`font-mono text-3xl font-bold ${stat.color}`}>
                      {stat.value}
                    </p>
                    {stat.sub && (
                      <p className="font-mono text-[9px] text-navy-500 mt-1">{stat.sub}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>


          {/* ── Brier Score ── */}
          <section className="px-6 py-16">
            <div ref={brierReveal.ref} className="max-w-5xl mx-auto">
              <div className={`transition-all duration-700 ${brierReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-px w-8 bg-navy-700" />
                  <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">01 / Brier Score</h2>
                  <LivePulse />
                </div>
              </div>

              <div className={`mt-6 grid grid-cols-1 md:grid-cols-12 gap-8 transition-all duration-700 delay-100 ${brierReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                <div className="md:col-span-7 space-y-3 font-sans text-sm leading-relaxed text-navy-400">
                  <p>
                    The Brier score is the primary metric NEXUS uses to evaluate
                    prediction quality. It measures the mean squared difference
                    between predicted probabilities and actual outcomes. A score of
                    0.0 represents perfect prediction, while 1.0 represents the worst
                    possible score.
                  </p>
                  <p>
                    For each resolved prediction, the Brier score is calculated as
                    (forecast probability - outcome)&#178;, where outcome is 1 if the
                    event occurred and 0 if it did not. A model that assigns 0.9
                    probability to an event that occurs receives a Brier contribution
                    of 0.01, while assigning 0.9 to an event that does not occur
                    yields 0.81.
                  </p>
                  {report.bin && (
                    <div className="mt-4 p-4 border border-navy-800/40 rounded-lg">
                      <div className="font-mono text-[9px] uppercase tracking-wider text-navy-500 mb-3">BIN Decomposition (Live)</div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="font-mono text-[9px] text-navy-500">Bias</div>
                          <div className="font-mono text-sm text-navy-200">{report.bin.bias.toFixed(3)}</div>
                          <div className="font-mono text-[9px] text-navy-600">{report.bin.biasDirection}</div>
                        </div>
                        <div>
                          <div className="font-mono text-[9px] text-navy-500">Noise</div>
                          <div className="font-mono text-sm text-navy-200">{report.bin.noise.toFixed(3)}</div>
                        </div>
                        <div>
                          <div className="font-mono text-[9px] text-navy-500">Information</div>
                          <div className="font-mono text-sm text-navy-200">{report.bin.information.toFixed(3)}</div>
                        </div>
                      </div>
                      <p className="font-sans text-[11px] text-navy-500 mt-2 leading-relaxed">{report.bin.interpretation}</p>
                    </div>
                  )}
                </div>

                <div className="md:col-span-5">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-navy-500 mb-4">Brier Scale Reference</div>
                  <div className="space-y-3">
                    {[
                      { range: "0.00 - 0.10", label: "Excellent", color: "#10b981" },
                      { range: "0.10 - 0.20", label: "Good", color: "#06b6d4" },
                      { range: "0.20 - 0.30", label: "Fair", color: "#f59e0b" },
                      { range: "0.30+", label: "Poor", color: "#ef4444" },
                    ].map((item) => (
                      <div key={item.range} className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="font-mono text-[11px] text-navy-300 w-24">{item.range}</span>
                        <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: item.color }}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 pt-4 border-t border-navy-800/60">
                    <div className="flex items-center gap-2">
                      <div className="font-mono text-[9px] uppercase tracking-wider text-navy-500">NEXUS Current (Live)</div>
                      <LivePulse />
                    </div>
                    <div className={`font-mono text-2xl font-bold mt-1 ${brierColor(report.brierScore)}`}>
                      {report.brierScore.toFixed(3)}
                    </div>
                    <div className={`font-mono text-[10px] mt-1 ${brierColor(report.brierScore)}`}>
                      {brierLabel(report.brierScore)} / {report.totalResolved} resolved predictions
                    </div>
                  </div>

                  {report.brierSkillScore != null && (
                    <div className="mt-4 pt-4 border-t border-navy-800/60">
                      <div className="font-mono text-[9px] uppercase tracking-wider text-navy-500 mb-1">Brier Skill Score (Live)</div>
                      <div className={`font-mono text-2xl font-bold ${bssColor(report.brierSkillScore)}`}>
                        {report.brierSkillScore.toFixed(3)}
                      </div>
                      <div className={`font-mono text-[10px] mt-1 ${bssColor(report.brierSkillScore)}`}>
                        {bssLabel(report.brierSkillScore)}
                      </div>
                      <p className="font-sans text-[10px] text-navy-500 mt-2 leading-relaxed">
                        BSS measures improvement over base rate guessing. Positive = genuine skill. Zero or negative = no better than always predicting the base rate.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ── Difficulty Tiers ── */}
          {report.difficultyTiers && (
            <>
                  <section className="px-6 py-16">
                <div className="max-w-5xl mx-auto">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-px w-8 bg-navy-700" />
                    <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">Skill by Difficulty</h2>
                    <LivePulse />
                  </div>
                  <p className="mt-4 font-sans text-sm text-navy-400 leading-relaxed max-w-3xl mb-8">
                    Predictions classified by base rate proximity to 50%. Easy predictions (base rate near 0 or 1) should have low Brier scores regardless. Genuine skill shows in hard predictions where outcomes are inherently uncertain.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {(["easy", "medium", "hard"] as const).map((tier) => {
                      const data = report.difficultyTiers![tier];
                      const tierLabel = tier === "easy" ? "Easy (BR < 0.2 or > 0.8)" : tier === "medium" ? "Medium (BR 0.2-0.4, 0.6-0.8)" : "Hard (BR 0.4-0.6)";
                      return (
                        <div key={tier} className="border border-navy-800/60 rounded-lg p-5">
                          <div className="font-mono text-[9px] uppercase tracking-wider text-navy-500 mb-3">{tierLabel}</div>
                          <div className="space-y-3">
                            <div>
                              <div className="font-mono text-[9px] text-navy-600">Count</div>
                              <div className="font-mono text-lg font-bold text-navy-200">{data.count}</div>
                            </div>
                            <div>
                              <div className="font-mono text-[9px] text-navy-600">Brier</div>
                              <div className={`font-mono text-lg font-bold ${data.count > 0 ? brierColor(data.brier) : "text-navy-600"}`}>
                                {data.count > 0 ? data.brier.toFixed(3) : "-"}
                              </div>
                            </div>
                            <div>
                              <div className="font-mono text-[9px] text-navy-600">BSS</div>
                              <div className={`font-mono text-lg font-bold ${bssColor(data.bss)}`}>
                                {data.bss != null ? data.bss.toFixed(3) : "-"}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

                </>
          )}

          {/* ── Rolling Brier Trend ── */}
          {report.rollingBrier && (
            <>
              <section className="px-6 py-16">
                <div className="max-w-5xl mx-auto">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-px w-8 bg-navy-700" />
                    <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">Rolling Brier Trend</h2>
                    <LivePulse />
                  </div>
                  <p className="mt-4 font-sans text-sm text-navy-400 leading-relaxed max-w-3xl mb-8">
                    Brier score computed over 30, 60, and 90 day rolling windows of resolved predictions.
                  </p>
                  <div className="grid grid-cols-3 gap-8">
                    {([
                      { label: "30 Days", value: report.rollingBrier.days30 },
                      { label: "60 Days", value: report.rollingBrier.days60 },
                      { label: "90 Days", value: report.rollingBrier.days90 },
                    ] as const).map((window) => (
                      <div key={window.label}>
                        <div className="font-mono text-[9px] uppercase tracking-wider text-navy-500 mb-2">{window.label}</div>
                        <div className={`font-mono text-2xl font-bold ${window.value != null ? brierColor(window.value) : "text-navy-600"}`}>
                          {window.value != null ? window.value.toFixed(3) : "N/A"}
                        </div>
                        {window.value != null && (
                          <div className={`font-mono text-[9px] mt-1 ${brierColor(window.value)}`}>
                            {brierLabel(window.value)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>

                </>
          )}

          {/* ── Calibration ── */}
          {report.calibration.length > 0 && (
          <section className="px-6 py-16">
            <div ref={calibrationReveal.ref} className="max-w-5xl mx-auto">
              <div className={`transition-all duration-700 ${calibrationReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-px w-8 bg-navy-700" />
                  <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">02 / Calibration</h2>
                  <LivePulse />
                </div>
              </div>

              <div className={`mt-6 space-y-3 font-sans text-sm leading-relaxed text-navy-400 max-w-3xl transition-all duration-700 delay-100 ${calibrationReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                <p>
                  A well-calibrated prediction system produces forecasts whose
                  stated probabilities match observed frequencies. When NEXUS
                  assigns a 70% probability to a class of events, those events
                  should occur approximately 70% of the time across a sufficient
                  sample.
                </p>
                <p>
                  The calibration gap of {(report.calibrationGap * 100).toFixed(1)}% represents the mean absolute
                  deviation between predicted and observed frequencies across all
                  probability bins. Lower is better.
                </p>
              </div>

              {/* Live calibration bins */}
              {report.calibration.length > 0 && (
                <div className={`mt-8 transition-all duration-700 delay-200 ${calibrationReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-navy-500 mb-4">Calibration by Probability Bin (Live Data)</div>
                  <div className="space-y-2">
                    {report.calibration.map((bucket) => {
                      const deviation = Math.abs(bucket.confirmedRate - bucket.midpoint / 100);
                      const isOverconfident = bucket.confirmedRate < bucket.midpoint / 100;
                      const barColor = !bucket.reliable
                        ? "#3d3d3d"
                        : deviation < 0.05
                          ? "#10b981"
                          : isOverconfident
                            ? "#f59e0b"
                            : "#06b6d4";

                      return (
                        <div key={bucket.range} className="grid grid-cols-12 gap-3 items-center">
                          <div className="col-span-2 font-mono text-[10px] text-navy-400 text-right">{bucket.range}</div>
                          <div className="col-span-6 relative h-5">
                            {/* Expected (faint) */}
                            <div
                              className="absolute top-0 left-0 h-full bg-navy-800/40 rounded-sm"
                              style={{ width: `${bucket.midpoint}%` }}
                            />
                            {/* Actual */}
                            <div
                              className="absolute top-0 left-0 h-full rounded-sm transition-all duration-500"
                              style={{ width: `${(bucket.confirmedRate * 100)}%`, backgroundColor: barColor, opacity: 0.7 }}
                            />
                            {/* Midpoint marker */}
                            <div
                              className="absolute top-0 h-full w-px bg-navy-400/40"
                              style={{ left: `${bucket.midpoint}%` }}
                            />
                          </div>
                          <div className="col-span-2 font-mono text-[10px] text-navy-300">
                            {(bucket.confirmedRate * 100).toFixed(1)}%
                          </div>
                          <div className="col-span-2 font-mono text-[9px] text-navy-500">
                            n={bucket.count}{!bucket.reliable && " *"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-navy-500 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent-emerald/70" />
                      <span className="font-mono text-[9px] uppercase tracking-wider">Well calibrated</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400/70" />
                      <span className="font-mono text-[9px] uppercase tracking-wider">Overconfident</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan/70" />
                      <span className="font-mono text-[9px] uppercase tracking-wider">Underconfident</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-navy-700" />
                      <span className="font-mono text-[9px] uppercase tracking-wider">* Low sample</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
          )}

          {/* ── Category Breakdown ── */}
          {(report.byCategory.length > 0 || report.directionLevel) && (
          <>
          <section className="px-6 py-16">
            <div ref={categoryReveal.ref} className="max-w-5xl mx-auto">
              <div className={`transition-all duration-700 ${categoryReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-px w-8 bg-navy-700" />
                  <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">03 / Category Breakdown</h2>
                  <LivePulse />
                </div>
              </div>

              <p className={`mt-6 font-sans text-sm leading-relaxed text-navy-400 max-w-3xl transition-all duration-700 delay-100 ${categoryReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                Prediction accuracy varies by domain. Market signals benefit from
                higher data density and faster feedback loops. Geopolitical
                predictions operate on longer timelines with more confounding
                variables.
              </p>

              {report.byCategory.length > 0 && (
                <div className={`mt-8 transition-all duration-700 delay-200 ${categoryReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-4 pb-3 border-b border-navy-700/30">
                    <div className="col-span-3 font-mono text-[9px] uppercase tracking-wider text-navy-500">Category</div>
                    <div className="col-span-1 font-mono text-[9px] uppercase tracking-wider text-navy-500">Total</div>
                    <div className="col-span-2 font-mono text-[9px] uppercase tracking-wider text-navy-500">Accuracy</div>
                    <div className="col-span-2 font-mono text-[9px] uppercase tracking-wider text-navy-500">Brier Score</div>
                    <div className="col-span-2 font-mono text-[9px] uppercase tracking-wider text-navy-500">Cal Gap</div>
                    <div className="col-span-2 font-mono text-[9px] uppercase tracking-wider text-navy-500">Reliable</div>
                  </div>

                  {report.byCategory.map((cat, i) => {
                    const accuracy = cat.total > 0 ? cat.confirmed / cat.total : 0;
                    return (
                      <div
                        key={cat.category}
                        className={`grid grid-cols-12 gap-4 py-3.5 ${i < report.byCategory.length - 1 ? "border-b border-navy-800/60" : ""}`}
                      >
                        <div className="col-span-3 font-mono text-[11px] font-medium text-navy-200 capitalize">{cat.category}</div>
                        <div className="col-span-1 font-mono text-[11px] text-navy-400">{cat.total}</div>
                        <div className="col-span-2 font-mono text-[11px] text-navy-100">{(accuracy * 100).toFixed(1)}%</div>
                        <div className={`col-span-2 font-mono text-[11px] ${brierColor(cat.brierScore)}`}>{cat.brierScore.toFixed(3)}</div>
                        <div className="col-span-2 font-mono text-[11px] text-navy-400">{(cat.calibrationGap * 100).toFixed(1)}%</div>
                        <div className="col-span-2">
                          <span className={`font-mono text-[9px] uppercase tracking-wider ${cat.reliable ? "text-accent-emerald" : "text-navy-600"}`}>
                            {cat.reliable ? "Yes" : "Low n"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Direction / Level accuracy */}
              {report.directionLevel && (
                <div className={`mt-8 grid grid-cols-2 md:grid-cols-4 gap-6 transition-all duration-700 delay-300 ${categoryReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-wider text-navy-500 mb-1">Direction Accuracy</div>
                    <div className="font-mono text-lg font-bold text-navy-100">{(report.directionLevel.directionCorrectRate * 100).toFixed(1)}%</div>
                    <div className="font-mono text-[9px] text-navy-600">n={report.directionLevel.totalWithDirection}</div>
                  </div>
                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-wider text-navy-500 mb-1">Level Accuracy</div>
                    <div className="font-mono text-lg font-bold text-navy-100">{(report.directionLevel.levelCorrectRate * 100).toFixed(1)}%</div>
                    <div className="font-mono text-[9px] text-navy-600">n={report.directionLevel.totalWithLevel}</div>
                  </div>
                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-wider text-navy-500 mb-1">Regime Invalidated</div>
                    <div className="font-mono text-lg font-bold text-navy-400">{report.regimeInvalidatedCount}</div>
                    <div className="font-mono text-[9px] text-navy-600">Excluded from scoring</div>
                  </div>
                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-wider text-navy-500 mb-1">Post-Event Filtered</div>
                    <div className="font-mono text-lg font-bold text-navy-400">{report.postEventCount}</div>
                    <div className="font-mono text-[9px] text-navy-600">Excluded from scoring</div>
                  </div>
                </div>
              )}
            </div>
          </section>
          </>
          )}

          {/* ── Trend ── */}
          {report.recentTrend && (
            <>
                  <section className="px-6 py-16">
                <div ref={trendReveal.ref} className="max-w-5xl mx-auto">
                  <div className={`transition-all duration-700 ${trendReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-px w-8 bg-navy-700" />
                      <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">04 / Performance Trend</h2>
                      <LivePulse />
                    </div>
                  </div>

                  <div className={`mt-6 grid grid-cols-1 md:grid-cols-12 gap-8 transition-all duration-700 delay-100 ${trendReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                    <div className="md:col-span-7 space-y-3 font-sans text-sm leading-relaxed text-navy-400">
                      <p>
                        The system continuously tracks its own accuracy over time and surfaces
                        trends in performance. The feedback loop operates on multiple timescales,
                        adjusting confidence modifiers, recalibrating bin-level curves, and
                        updating base rates.
                      </p>
                      {report.failurePatterns.length > 0 && (
                        <div className="mt-4">
                          <div className="font-mono text-[9px] uppercase tracking-wider text-navy-500 mb-2">Identified Failure Patterns</div>
                          <div className="space-y-1.5">
                            {report.failurePatterns.map((fp) => (
                              <div key={fp.pattern} className="flex items-center gap-2">
                                <AlertTriangle className="w-3 h-3 text-accent-amber flex-shrink-0" />
                                <span className="font-sans text-[11px] text-navy-400">{fp.pattern}</span>
                                <span className="font-mono text-[9px] text-navy-600">({fp.frequency}x)</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-5">
                      <div className="font-mono text-[9px] uppercase tracking-wider text-navy-500 mb-4">Rolling Comparison (Last {report.recentTrend.windowSize} predictions)</div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-mono text-[9px] uppercase tracking-wider text-navy-500">Prior Window</div>
                          <div className="font-mono text-lg text-navy-400">{report.recentTrend.priorBrier.toFixed(3)}</div>
                        </div>
                        {report.recentTrend.improving ? (
                          <TrendingUp className="w-4 h-4 text-accent-emerald" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-accent-rose" />
                        )}
                        <div className="text-right">
                          <div className="font-mono text-[9px] uppercase tracking-wider text-navy-500">Recent Window</div>
                          <div className={`font-mono text-lg ${report.recentTrend.improving ? "text-accent-emerald" : "text-accent-rose"}`}>
                            {report.recentTrend.recentBrier.toFixed(3)}
                          </div>
                        </div>
                      </div>
                      {(() => {
                        const pctChange = ((report.recentTrend!.recentBrier - report.recentTrend!.priorBrier) / report.recentTrend!.priorBrier * 100);
                        return (
                          <div className={`font-mono text-[9px] mt-2 text-center ${report.recentTrend!.improving ? "text-accent-emerald" : "text-accent-rose"}`}>
                            {pctChange > 0 ? "+" : ""}{pctChange.toFixed(1)}% {report.recentTrend!.improving ? "improvement" : "degradation"}
                          </div>
                        );
                      })()}

                      {/* Timeframe accuracy */}
                      {Object.keys(report.timeframeAccuracy).length > 0 && (
                        <div className="mt-6 pt-4 border-t border-navy-800/60">
                          <div className="font-mono text-[9px] uppercase tracking-wider text-navy-500 mb-3">By Timeframe</div>
                          <div className="space-y-2">
                            {Object.entries(report.timeframeAccuracy).map(([tf, data]) => (
                              <div key={tf} className="flex items-center justify-between">
                                <span className="font-mono text-[10px] text-navy-300">{tf}</span>
                                <div className="flex items-center gap-3">
                                  <span className={`font-mono text-[10px] ${brierColor(data.brierScore)}`}>{data.brierScore.toFixed(3)}</span>
                                  <span className="font-mono text-[9px] text-navy-600">n={data.count}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>

                </>
          )}

          {/* ── Recent Predictions Scorecard ── */}
          {predictions.length > 0 && (
            <>
              <section className="px-6 py-16">
                <div ref={scorecardReveal.ref} className="max-w-5xl mx-auto">
                  <div className={`transition-all duration-700 ${scorecardReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-px w-8 bg-navy-700" />
                      <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">
                        {report.recentTrend ? "05" : "04"} / Recent Resolved Predictions
                      </h2>
                      <LivePulse />
                    </div>
                    <p className="mt-2 ml-11 font-mono text-[10px] text-navy-500">
                      Last {predictions.length} resolved predictions, pulled live from the database
                    </p>
                  </div>

                  {/* Summary row */}
                  <div className={`mt-8 flex flex-wrap gap-x-10 gap-y-4 transition-all duration-700 delay-100 ${scorecardReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                    {(() => {
                      const confirmed = predictions.filter(p => p.outcome === "confirmed").length;
                      const denied = predictions.filter(p => p.outcome === "denied").length;
                      const partial = predictions.filter(p => p.outcome === "partial").length;
                      const expired = predictions.filter(p => p.outcome === "expired").length;
                      return [
                        { label: "Shown", value: String(predictions.length), color: "text-navy-100" },
                        { label: "Confirmed", value: String(confirmed), color: "text-accent-emerald" },
                        { label: "Denied", value: String(denied), color: "text-accent-rose" },
                        { label: "Partial", value: String(partial), color: "text-accent-amber" },
                        { label: "Expired", value: String(expired), color: "text-navy-400" },
                      ].map(s => (
                        <div key={s.label}>
                          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-navy-500 mb-1">{s.label}</div>
                          <div className={`font-mono text-xl font-bold ${s.color}`}>{s.value}</div>
                        </div>
                      ));
                    })()}
                  </div>

                  {/* Predictions table */}
                  <div className={`mt-8 transition-all duration-700 delay-200 ${scorecardReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                    <div className="grid grid-cols-12 gap-4 pb-3 border-b border-navy-700/30">
                      <div className="col-span-5 font-mono text-[9px] uppercase tracking-wider text-navy-500">Prediction</div>
                      <div className="col-span-2 font-mono text-[9px] uppercase tracking-wider text-navy-500">Category</div>
                      <div className="col-span-1 font-mono text-[9px] uppercase tracking-wider text-navy-500">Conf</div>
                      <div className="col-span-1 font-mono text-[9px] uppercase tracking-wider text-navy-500">Result</div>
                      <div className="col-span-1 font-mono text-[9px] uppercase tracking-wider text-navy-500">Score</div>
                      <div className="col-span-2 font-mono text-[9px] uppercase tracking-wider text-navy-500">Resolved</div>
                    </div>

                    {predictions.map((row, i) => (
                      <div
                        key={row.id}
                        className={`grid grid-cols-12 gap-4 py-3 items-center ${i < predictions.length - 1 ? "border-b border-navy-800/60" : ""}`}
                      >
                        <div className="col-span-5 font-sans text-[11px] text-navy-300 leading-relaxed line-clamp-2">{row.claim}</div>
                        <div className="col-span-2 font-mono text-[9px] uppercase tracking-wider text-navy-500">{row.category}</div>
                        <div className="col-span-1 font-mono text-[11px] text-navy-100">{(row.confidence * 100).toFixed(0)}%</div>
                        <div className="col-span-1 flex items-center gap-1">
                          {outcomeIcon(row.outcome)}
                        </div>
                        <div className={`col-span-1 font-mono text-[11px] ${row.score !== null ? (row.score > 0.3 ? "text-accent-rose" : row.score > 0.15 ? "text-amber-400" : "text-accent-emerald") : "text-navy-600"}`}>
                          {row.score !== null ? row.score.toFixed(3) : "-"}
                        </div>
                        <div className="col-span-2 font-mono text-[9px] text-navy-500">
                          {row.resolvedAt ? timeAgo(row.resolvedAt) : "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

                </>
          )}

          {/* ── Transparency ── */}
          <section className="px-6 py-16">
            <div ref={transparencyReveal.ref} className="max-w-5xl mx-auto">
              <div className={`transition-all duration-700 ${transparencyReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-px w-8 bg-navy-700" />
                  <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">Transparency</h2>
                </div>
              </div>

              <div className={`mt-6 grid grid-cols-1 md:grid-cols-3 gap-8 transition-all duration-700 delay-100 ${transparencyReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                {[
                  { icon: Eye, title: "Immutable Logging", body: "Every prediction is logged with timestamp, stated confidence, reasoning chain, contributing signal IDs, and eventual outcome. No record can be retroactively modified or deleted." },
                  { icon: Shield, title: "No Survivorship Bias", body: "The confidence level assigned at creation time is the score used for all accuracy calculations. This prevents cherry-picking of results and ensures reported metrics reflect true performance." },
                  { icon: Target, title: "Live Data, Not Samples", body: "Every number on this page is computed from the live prediction database in real-time. There are no hardcoded figures, no curated samples. What you see is what the system has actually produced." },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title}>
                      <div className="flex items-center gap-2 mb-3">
                        <Icon className="w-4 h-4 text-navy-400" />
                        <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-navy-200">{item.title}</h3>
                      </div>
                      <p className="font-sans text-sm text-navy-400 leading-relaxed">{item.body}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

        </>
      )}

      {/* ── Related Research (always show) ── */}
      <section className="px-6 py-16">
        <div ref={relatedReveal.ref} className="max-w-5xl mx-auto">
          <div className={`transition-all duration-700 ${relatedReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px w-8 bg-navy-700" />
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">Related Research</h2>
            </div>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 transition-all duration-700 delay-100 ${relatedReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            {[
              { href: "/research/methodology", title: "Methodology", desc: "How NEXUS detects, scores, and synthesises intelligence from four primary signal layers plus narrative overlay." },
              { href: "/research/signal-theory", title: "Signal Theory", desc: "Deep dive into signal detection, intensity scoring, decay functions, and cross-layer amplification." },
              { href: "/research/game-theory", title: "Game Theory Models", desc: "Nash equilibria, Schelling focal points, and escalation ladders applied to geopolitical scenario modelling." },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="group">
                <h3 className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-200 group-hover:text-navy-100 transition-colors mb-2">{link.title}</h3>
                <p className="font-sans text-[12px] text-navy-500 leading-relaxed mb-3">{link.desc}</p>
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-accent-cyan group-hover:text-accent-cyan/80 transition-colors">
                  Read more <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto text-center py-12">
          <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-navy-200 mb-3">Query the full prediction log</h3>
          <p className="font-sans text-sm text-navy-400 mb-6 max-w-lg mx-auto">
            Every NEXUS prediction is logged with full audit trails. Access the platform to query predictions by category, confidence, timeframe, and outcome.
          </p>
          <Link href="/register" className="group inline-flex items-center gap-2 px-6 py-2.5 font-mono text-[11px] uppercase tracking-widest text-navy-100 bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.1] hover:border-white/[0.15] transition-all">
            Request Access <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>
    </main>
  );
}
