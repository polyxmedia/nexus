"use client";

import { useState, useEffect, useRef, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import {
  ArrowRight,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ── Scroll Reveal ──

function useReveal(threshold = 0.12) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

const anim = "transition-all duration-700 ease-out";
const hidden = "opacity-0 translate-y-6";
const shown = "opacity-100 translate-y-0";

// ── Shared Components ──

function Ruled() {
  return (
    <div className="max-w-5xl mx-auto px-6">
      <div className="h-px bg-navy-800/60" />
    </div>
  );
}

function SectionHead({
  number,
  label,
  visible,
  delay = 0,
}: {
  number: string;
  label: string;
  visible: boolean;
  delay?: number;
}) {
  return (
    <div
      className={`flex items-center gap-4 mb-10 ${anim} ${visible ? shown : hidden}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <span className="font-mono text-[10px] text-navy-700 tabular-nums">
        {number}
      </span>
      <div className="h-px w-8 bg-navy-700/50" />
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-navy-500">
        {label}
      </span>
    </div>
  );
}

function ExpandableSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-navy-800/40 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-navy-900/30 transition-colors"
      >
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-navy-300 font-medium">
          {title}
        </span>
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-navy-500" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-navy-500" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-navy-800/30">
          {children}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════
// ── LIVE RESULTS TYPES & HELPERS ──
// ════════════════════════════════════════════════

interface CalibrationBucket {
  range: string;
  midpoint: number;
  count: number;
  confirmedRate: number;
  reliable: boolean;
}

interface CategoryRow {
  category: string;
  total: number;
  confirmed: number;
  denied: number;
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
  bin: { bias: number; noise: number; information: number; biasDirection: string; interpretation: string };
  directionLevel: { totalWithDirection: number; directionCorrectRate: number; totalWithLevel: number; levelCorrectRate: number } | null;
  regimeInvalidatedCount: number;
  postEventCount: number;
}

function brierColor(score: number): string {
  if (score < 0.15) return "text-accent-emerald";
  if (score <= 0.25) return "text-accent-cyan";
  return "text-accent-amber";
}

function fmt3(n: number): string {
  return n.toFixed(3);
}

function fmtPct(n: number): string {
  return (n * 100).toFixed(1) + "%";
}

// ════════════════════════════════════════════════
// ── LIVE RESULTS SECTION COMPONENT ──
// ════════════════════════════════════════════════

function LiveResultsSection({
  liveResultsReveal,
}: {
  liveResultsReveal: { ref: RefObject<HTMLDivElement | null>; visible: boolean };
}) {
  const [report, setReport] = useState<FeedbackReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/predictions/feedback")
      .then((r) => r.json())
      .then((data) => {
        setReport(data.report ?? null);
      })
      .catch(() => {
        setReport(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const insufficient = !loading && (!report || report.totalResolved < 5);

  return (
    <div ref={liveResultsReveal.ref} className="max-w-5xl mx-auto">
      <SectionHead number="22" label="Live Results and Prediction Record" visible={liveResultsReveal.visible} />

      {/* Intro text */}
      <div className={`mt-8 max-w-3xl space-y-6 ${anim} ${liveResultsReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
        <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
          Every prediction the system generates is timestamped, tracked, and resolved against real-world outcomes. The results below are published, not curated, meaning the failures are visible alongside the successes.
        </p>

        {/* Sample size warning */}
        <div className="border border-accent-amber/20 rounded-lg p-5 bg-accent-amber/[0.03]">
          <div className="font-mono text-[9px] uppercase tracking-wider text-accent-amber mb-2">Statistical Health Warning</div>
          <p className="font-sans text-[12px] text-navy-400 leading-[1.8]">
            The resolved prediction dataset is early-stage. At small sample sizes (n &lt; 50), aggregate metrics like Brier score and calibration gap carry wide confidence intervals and are dominated by noise. A Brier score above 0.25 at this stage does not necessarily indicate the system is worse than chance; it may reflect a small number of confidently-wrong predictions distorting a thin dataset. These numbers will become meaningful as the forward-looking dataset grows. Until then, treat them as directional indicators, not validated performance claims.
          </p>
        </div>

        <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
          One distinction matters when evaluating any aggregate metric: predictions generated after a triggering event has already begun are post-onset analysis, not prospective forecasts. The forward-looking record, predictions generated before the events they describe, is the only valid measure of forecasting skill. As the prospective dataset grows, the aggregate Brier score and calibration curves will become more meaningful.
        </p>

        {/* Link card */}
        <div className="border border-accent-cyan/20 rounded-lg p-6 bg-accent-cyan/[0.03]">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-accent-cyan" />
            </div>
            <div className="space-y-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-accent-cyan mb-1">Live Prediction Tracker</div>
                <p className="font-sans text-[13px] text-navy-300 leading-[1.7]">
                  The platform&apos;s prediction record is available to all subscribers. Every prediction includes the claim, confidence level, signal sources that triggered it, resolution date, and outcome. Aggregate metrics, including Brier score, log loss, and calibration curves, are computed continuously.
                </p>
              </div>
              <Link
                href="/predictions"
                className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-accent-cyan hover:text-accent-cyan/80 transition-colors"
              >
                View Prediction Record
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic data block */}
      <div className={`mt-8 space-y-6 ${anim} ${liveResultsReveal.visible ? shown : hidden}`} style={{ transitionDelay: "200ms" }}>

        {loading && (
          <div className="border border-navy-800/30 rounded-lg p-8 bg-navy-900/20 text-center">
            <div className="font-mono text-[10px] uppercase tracking-wider text-navy-600">Loading prediction data</div>
          </div>
        )}

        {insufficient && (
          <div className="border border-navy-800/30 rounded-lg p-8 bg-navy-900/20">
            <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-3">Dataset Status</div>
            <p className="font-sans text-[13px] text-navy-500 leading-[1.8]">
              The live prediction dataset is still building. Aggregate metrics, calibration curves, and category breakdowns will appear here once a minimum of five predictions have been resolved. This threshold exists to prevent spurious statistics from a small sample from being presented as meaningful signal.
            </p>
          </div>
        )}

        {!loading && report && report.totalResolved >= 5 && (
          <>
            {/* Top-line KPIs */}
            <div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-3">Top-Line Performance</div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="border border-navy-800/30 rounded-lg p-4 bg-navy-900/20">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-2">Brier Score</div>
                  <div className={`font-mono text-[18px] font-medium tabular-nums ${brierColor(report.brierScore)}`}>{fmt3(report.brierScore)}</div>
                  <div className="font-mono text-[9px] text-navy-700 mt-1">0 = perfect, 0.25 = coin flip</div>
                  {report.totalResolved < 50 && (
                    <div className="font-mono text-[8px] text-accent-amber/70 mt-1">n &lt; 50: not statistically robust</div>
                  )}
                </div>
                <div className="border border-navy-800/30 rounded-lg p-4 bg-navy-900/20">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-2">Binary Accuracy</div>
                  <div className="font-mono text-[18px] font-medium tabular-nums text-navy-200">{fmtPct(report.binaryAccuracy)}</div>
                  <div className="font-mono text-[9px] text-navy-700 mt-1">directional correct rate</div>
                </div>
                <div className="border border-navy-800/30 rounded-lg p-4 bg-navy-900/20">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-2">Calibration Gap</div>
                  <div className={`font-mono text-[18px] font-medium tabular-nums ${Math.abs(report.calibrationGap) < 0.05 ? "text-accent-emerald" : Math.abs(report.calibrationGap) < 0.12 ? "text-accent-cyan" : "text-accent-amber"}`}>
                    {report.calibrationGap >= 0 ? "+" : ""}{fmtPct(report.calibrationGap)}
                  </div>
                  <div className="font-mono text-[9px] text-navy-700 mt-1">+ = overconfident</div>
                </div>
                <div className="border border-navy-800/30 rounded-lg p-4 bg-navy-900/20">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-2">Avg Confidence</div>
                  <div className="font-mono text-[18px] font-medium tabular-nums text-navy-200">{fmtPct(report.avgConfidence)}</div>
                  <div className="font-mono text-[9px] text-navy-700 mt-1">mean stated confidence</div>
                </div>
                <div className="border border-navy-800/30 rounded-lg p-4 bg-navy-900/20">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-2">Total Resolved</div>
                  <div className="font-mono text-[18px] font-medium tabular-nums text-navy-200">{report.totalResolved}</div>
                  <div className="font-mono text-[9px] text-navy-700 mt-1">predictions scored</div>
                </div>
                <div className="border border-navy-800/30 rounded-lg p-4 bg-navy-900/20">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-2">Pre-Event Filter</div>
                  <div className="font-mono text-[18px] font-medium tabular-nums text-navy-500">
                    {report.regimeInvalidatedCount + report.postEventCount}
                  </div>
                  <div className="font-mono text-[9px] text-navy-700 mt-1">{report.regimeInvalidatedCount} regime + {report.postEventCount} post-event</div>
                </div>
              </div>
            </div>

            {/* BIN Decomposition */}
            {report.bin && (
              <div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-3">BIN Decomposition (Bias / Noise / Information)</div>
                <div className="border border-navy-800/30 rounded-lg p-5 bg-navy-900/20 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-1">Bias</div>
                      <div className={`font-mono text-[15px] font-medium tabular-nums ${report.bin.bias < 0.02 ? "text-accent-emerald" : report.bin.bias < 0.05 ? "text-accent-cyan" : "text-accent-amber"}`}>
                        {fmt3(report.bin.bias)}
                      </div>
                      <div className="font-mono text-[9px] text-navy-700 mt-0.5">{report.bin.biasDirection}</div>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-1">Noise</div>
                      <div className={`font-mono text-[15px] font-medium tabular-nums ${report.bin.noise < 0.05 ? "text-accent-emerald" : report.bin.noise < 0.12 ? "text-accent-cyan" : "text-accent-amber"}`}>
                        {fmt3(report.bin.noise)}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-1">Information</div>
                      <div className={`font-mono text-[15px] font-medium tabular-nums ${report.bin.information > 0.05 ? "text-accent-emerald" : "text-navy-400"}`}>
                        {fmt3(report.bin.information)}
                      </div>
                    </div>
                  </div>
                  <p className="font-sans text-[12px] text-navy-500 leading-[1.7] border-t border-navy-800/30 pt-3">
                    {report.bin.interpretation}
                  </p>
                </div>
              </div>
            )}

            {/* Calibration Buckets */}
            {report.calibration && report.calibration.length > 0 && (
              <div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-3">Calibration Buckets (Stated Confidence vs Actual Confirmed Rate)</div>
                <div className="border border-navy-800/30 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-navy-800/30 bg-navy-900/30">
                        <th className="px-4 py-2.5 font-mono text-[9px] uppercase tracking-wider text-navy-600">Range</th>
                        <th className="px-4 py-2.5 font-mono text-[9px] uppercase tracking-wider text-navy-600">Midpoint</th>
                        <th className="px-4 py-2.5 font-mono text-[9px] uppercase tracking-wider text-navy-600">Confirmed Rate</th>
                        <th className="px-4 py-2.5 font-mono text-[9px] uppercase tracking-wider text-navy-600">Count</th>
                        <th className="px-4 py-2.5 font-mono text-[9px] uppercase tracking-wider text-navy-600">Gap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.calibration.map((bucket) => {
                        const gap = bucket.confirmedRate - bucket.midpoint;
                        return (
                          <tr key={bucket.range} className="border-b border-navy-800/20 last:border-0 hover:bg-navy-900/10 transition-colors">
                            <td className="px-4 py-2.5 font-mono text-[10px] text-navy-400">{bucket.range}</td>
                            <td className="px-4 py-2.5 font-mono text-[10px] text-navy-400 tabular-nums">{fmtPct(bucket.midpoint)}</td>
                            <td className="px-4 py-2.5 font-mono text-[10px] tabular-nums">
                              {bucket.reliable ? (
                                <span className={Math.abs(gap) < 0.08 ? "text-accent-emerald" : Math.abs(gap) < 0.15 ? "text-accent-cyan" : "text-accent-amber"}>
                                  {fmtPct(bucket.confirmedRate)}
                                </span>
                              ) : (
                                <span className="text-navy-700">--</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-[10px] text-navy-500 tabular-nums">{bucket.count}</td>
                            <td className="px-4 py-2.5 font-mono text-[10px] tabular-nums">
                              {bucket.reliable ? (
                                <span className={Math.abs(gap) < 0.08 ? "text-accent-emerald" : "text-accent-amber"}>
                                  {gap >= 0 ? "+" : ""}{fmtPct(gap)}
                                </span>
                              ) : (
                                <span className="text-navy-700">N/A</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 font-mono text-[9px] text-navy-700">
                  Rows marked -- have insufficient sample count for reliable statistics. Gap = confirmed rate minus stated confidence midpoint.
                </div>
              </div>
            )}

            {/* Category Performance */}
            {report.byCategory && report.byCategory.length > 0 && (
              <div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-3">Performance by Category</div>
                <div className="border border-navy-800/30 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-navy-800/30 bg-navy-900/30">
                        <th className="px-4 py-2.5 font-mono text-[9px] uppercase tracking-wider text-navy-600">Category</th>
                        <th className="px-4 py-2.5 font-mono text-[9px] uppercase tracking-wider text-navy-600">Total</th>
                        <th className="px-4 py-2.5 font-mono text-[9px] uppercase tracking-wider text-navy-600">Confirmed</th>
                        <th className="px-4 py-2.5 font-mono text-[9px] uppercase tracking-wider text-navy-600">Brier</th>
                        <th className="px-4 py-2.5 font-mono text-[9px] uppercase tracking-wider text-navy-600">Cal Gap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.byCategory.map((cat) => (
                        <tr key={cat.category} className="border-b border-navy-800/20 last:border-0 hover:bg-navy-900/10 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-[10px] text-navy-300">{cat.category}</td>
                          <td className="px-4 py-2.5 font-mono text-[10px] text-navy-500 tabular-nums">{cat.total}</td>
                          <td className="px-4 py-2.5 font-mono text-[10px] text-navy-400 tabular-nums">
                            {cat.total > 0 ? fmtPct(cat.confirmed / cat.total) : "--"}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[10px] tabular-nums">
                            {cat.reliable ? (
                              <span className={brierColor(cat.brierScore)}>{fmt3(cat.brierScore)}</span>
                            ) : (
                              <span className="text-navy-700">--</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[10px] tabular-nums">
                            {cat.reliable ? (
                              <span className={Math.abs(cat.calibrationGap) < 0.08 ? "text-accent-emerald" : "text-accent-amber"}>
                                {cat.calibrationGap >= 0 ? "+" : ""}{fmtPct(cat.calibrationGap)}
                              </span>
                            ) : (
                              <span className="text-navy-700">N/A</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Direction vs Level */}
            {report.directionLevel && report.directionLevel.totalWithDirection > 0 && (
              <div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-3">Direction vs Level Accuracy</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-navy-800/30 rounded-lg p-4 bg-navy-900/20">
                    <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-2">Direction Correct Rate</div>
                    <div className="font-mono text-[20px] font-medium tabular-nums text-navy-200">
                      {fmtPct(report.directionLevel.directionCorrectRate)}
                    </div>
                    <div className="font-mono text-[9px] text-navy-700 mt-1">over {report.directionLevel.totalWithDirection} predictions</div>
                  </div>
                  {report.directionLevel.totalWithLevel > 0 && (
                    <div className="border border-navy-800/30 rounded-lg p-4 bg-navy-900/20">
                      <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-2">Level Correct Rate</div>
                      <div className="font-mono text-[20px] font-medium tabular-nums text-navy-200">
                        {fmtPct(report.directionLevel.levelCorrectRate)}
                      </div>
                      <div className="font-mono text-[9px] text-navy-700 mt-1">over {report.directionLevel.totalWithLevel} predictions</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recent Trend */}
            {report.recentTrend && (
              <div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-3">Recent Trend</div>
                <div className="border border-navy-800/30 rounded-lg p-5 bg-navy-900/20 flex items-center gap-6">
                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-1">Recent Brier</div>
                    <div className={`font-mono text-[15px] font-medium tabular-nums ${brierColor(report.recentTrend.recentBrier)}`}>
                      {fmt3(report.recentTrend.recentBrier)}
                    </div>
                  </div>
                  <div className="text-navy-700 font-mono text-[11px]">vs</div>
                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-1">Prior Brier</div>
                    <div className={`font-mono text-[15px] font-medium tabular-nums ${brierColor(report.recentTrend.priorBrier)}`}>
                      {fmt3(report.recentTrend.priorBrier)}
                    </div>
                  </div>
                  <div className={`ml-auto font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded border ${report.recentTrend.improving ? "border-accent-emerald/30 text-accent-emerald bg-accent-emerald/[0.05]" : "border-accent-amber/30 text-accent-amber bg-accent-amber/[0.05]"}`}>
                    {report.recentTrend.improving ? "Improving" : "Declining"}
                  </div>
                </div>
                <div className="mt-1.5 font-mono text-[9px] text-navy-700">
                  Window: last {report.recentTrend.windowSize} resolved predictions versus prior set.
                </div>
              </div>
            )}

            {/* Static methodology cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-navy-800/30 rounded-lg p-4 bg-navy-900/20">
                <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-2">Tracking Metrics</div>
                <div className="font-sans text-[12px] text-navy-400 leading-[1.7]">
                  Brier score, log loss, and calibration curves computed over all resolved predictions with segmentation by category and timeframe.
                </div>
              </div>
              <div className="border border-navy-800/30 rounded-lg p-4 bg-navy-900/20">
                <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-2">Feedback Integration</div>
                <div className="font-sans text-[12px] text-navy-400 leading-[1.7]">
                  Resolved predictions feed back into the engine with 0.5x damping to prevent overcorrection, continuously tuning the system&apos;s calibration.
                </div>
              </div>
              <div className="border border-navy-800/30 rounded-lg p-4 bg-navy-900/20">
                <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-2">Full Transparency</div>
                <div className="font-sans text-[12px] text-navy-400 leading-[1.7]">
                  No cherry-picking. The system publishes every prediction it makes, whether it resolves correctly or incorrectly. This is the standard it holds itself to.
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className={`mt-6 ${anim} ${liveResultsReveal.visible ? shown : hidden}`} style={{ transitionDelay: "300ms" }}>
        <p className="font-sans text-[13px] text-navy-500 leading-[1.8]">
          The prediction tracker exists so that the methodologies described in this paper can be evaluated against real outcomes, not theoretical ones. The dataset is young and the numbers will move. That is the point of publishing them.
        </p>
      </div>
    </div>
  );
}

// ── Table of Contents ──

const tocSections = [
  { id: "abstract", num: "00", label: "Executive Summary" },
  { id: "signal-detection", num: "01", label: "Multi-Layer Signal Detection" },
  { id: "convergence", num: "02", label: "Convergence Analysis" },
  { id: "synthesis", num: "03", label: "AI-Driven Intelligence Synthesis" },
  { id: "prediction", num: "04", label: "Prediction Engine and Calibration" },
  { id: "iw-framework", num: "05", label: "Indications and Warnings" },
  { id: "regime-detection", num: "06", label: "Market Regime Detection" },
  { id: "systemic-risk", num: "07", label: "Systemic Risk Monitoring" },
  { id: "bocpd", num: "08", label: "Bayesian Change Point Detection" },
  { id: "ach", num: "09", label: "Analysis of Competing Hypotheses" },
  { id: "source-reliability", num: "10", label: "NATO Admiralty Rating System" },
  { id: "nowcasting", num: "11", label: "Economic Nowcasting" },
  { id: "monte-carlo", num: "12", label: "Monte Carlo Simulation" },
  { id: "shipping", num: "13", label: "Maritime and Shipping Intelligence" },
  { id: "central-bank", num: "14", label: "Central Bank NLP Analysis" },
  { id: "narrative", num: "15", label: "Narrative Tracking and Divergence" },
  { id: "osint", num: "16", label: "OSINT Entity Extraction" },
  { id: "knowledge", num: "17", label: "Knowledge Bank and Embeddings" },
  { id: "ai-progression", num: "18", label: "AI Progression Tracking" },
  { id: "integration", num: "19", label: "System Integration Architecture" },
  { id: "academic", num: "20", label: "Academic Foundations & Peer-Reviewed Evidence" },
  { id: "limitations", num: "21", label: "Limitations and Known Constraints" },
  { id: "live-results", num: "22", label: "Live Results and Prediction Record" },
  { id: "parallels", num: "23", label: "Historical Pattern Matching" },
  { id: "actor-profiles", num: "24", label: "Actor-Belief Profile System" },
  { id: "narrative-reports", num: "25", label: "Narrative Report Generation" },
  { id: "appendix-a", num: "A", label: "Appendix A: Calendar / Celestial Context Layers" },
];

// ════════════════════════════════════════════════
// ── PAGE ──
// ════════════════════════════════════════════════

export default function WhitepaperPage() {
  const heroReveal = useReveal(0.05);
  const tocReveal = useReveal();
  const abstractReveal = useReveal();
  const signalReveal = useReveal();
  const convergenceReveal = useReveal();
  const synthesisReveal = useReveal();
  const predictionReveal = useReveal();

  const iwReveal = useReveal();
  const regimeReveal = useReveal();
  const systemicReveal = useReveal();
  const bocpdReveal = useReveal();
  const achReveal = useReveal();
  const sourceReveal = useReveal();
  const nowcastReveal = useReveal();
  const monteReveal = useReveal();
  const shippingReveal = useReveal();
  const centralReveal = useReveal();
  const narrativeReveal = useReveal();
  const osintReveal = useReveal();
  const knowledgeReveal = useReveal();
  const aiProgReveal = useReveal();
  const integrationReveal = useReveal();
  const academicReveal = useReveal();
  const limitationsReveal = useReveal();
  const liveResultsReveal = useReveal();
  const parallelsReveal = useReveal();
  const actorProfilesReveal = useReveal();
  const narrativeReportsReveal = useReveal();
  const ctaReveal = useReveal(0.2);

  return (
    <main className="min-h-screen selection:bg-accent-cyan/20">
      {/* Grid background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute inset-0 opacity-[0.012]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
      </div>

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="relative pt-32 pb-16 px-6 overflow-hidden">
        <div className="absolute top-20 left-1/4 w-[600px] h-[300px] bg-accent-cyan/[0.015] rounded-full blur-[140px] pointer-events-none" />

        <div ref={heroReveal.ref} className="relative max-w-5xl mx-auto">
          <div className={`${anim} ${heroReveal.visible ? shown : hidden}`}>
            <div className="flex items-center gap-3 mb-6">
              <span className="font-mono text-[10px] text-navy-700">
                WP-001
              </span>
              <div className="h-px w-6 bg-navy-700/50" />
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-navy-600">
                Technical White Paper
              </span>
            </div>
          </div>

          <h1
            className={`font-sans text-[2rem] md:text-[2.75rem] font-light leading-[1.15] tracking-tight text-navy-100 max-w-4xl ${anim} ${heroReveal.visible ? shown : hidden}`}
            style={{ transitionDelay: "100ms" }}
          >
            NEXUS Intelligence Platform:
            <br />
            <span className="text-navy-400">
              Methodologies, Algorithms, and Analytical Frameworks
            </span>
          </h1>

          <div
            className={`mt-8 flex flex-wrap items-center gap-6 ${anim} ${heroReveal.visible ? shown : hidden}`}
            style={{ transitionDelay: "200ms" }}
          >
            <div className="font-sans text-[13px] text-navy-400">
              Andre Figueira
            </div>
            <div className="font-mono text-[10px] text-navy-600">
              NEXUS Intelligence / Polyxmedia
            </div>
            <div className="font-mono text-[10px] text-navy-600">
              March 2026
            </div>
          </div>

          <p
            className={`mt-8 font-sans text-base text-navy-400 leading-relaxed max-w-3xl ${anim} ${heroReveal.visible ? shown : hidden}`}
            style={{ transitionDelay: "300ms" }}
          >
            A comprehensive technical document covering every analytical methodology,
            algorithm, and intelligence framework implemented in the NEXUS platform.
            From multi-layer signal detection through Bayesian change point analysis,
            game-theoretic scenario modelling, and NATO-standard source evaluation,
            this paper details the full engineering behind geopolitical-market
            convergence intelligence.
          </p>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          TABLE OF CONTENTS
      ══════════════════════════════════════════ */}
      <section className="px-6 py-16">
        <div ref={tocReveal.ref} className="max-w-5xl mx-auto">
          <div
            className={`font-mono text-[10px] uppercase tracking-[0.25em] text-navy-600 mb-6 ${anim} ${tocReveal.visible ? shown : hidden}`}
          >
            Contents
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
            {tocSections.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`flex items-center gap-3 py-1.5 group ${anim} ${tocReveal.visible ? shown : hidden}`}
                style={{ transitionDelay: `${50 + i * 30}ms` }}
              >
                <span className="font-mono text-[10px] text-navy-700 tabular-nums w-5">
                  {s.num}
                </span>
                <span className="font-sans text-[13px] text-navy-400 group-hover:text-navy-200 transition-colors">
                  {s.label}
                </span>
                <div className="flex-1 border-b border-dotted border-navy-800/40" />
              </a>
            ))}
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          00: ABSTRACT
      ══════════════════════════════════════════ */}
      <section id="abstract" className="px-6 py-20">
        <div ref={abstractReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="00" label="Executive Summary" visible={abstractReveal.visible} />
          <div className={`max-w-3xl ${anim} ${abstractReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              NEXUS detects conditions under which geopolitical events are likely to produce market dislocations. It fuses four independent signal layers (geopolitical event feeds, market microstructure, OSINT, and systemic risk metrics) through Bayesian posterior updating with dependency-adjusted likelihood ratios, then uses AI synthesis to generate timestamped, confidence-scored predictions that are tracked against real outcomes.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              The prediction record is early-stage. At the time of writing, the resolved dataset is small enough that aggregate metrics carry wide confidence intervals and should not be treated as statistically robust validation. The system publishes every prediction it makes, confirmed or denied, and the full record is available to subscribers. As the forward-looking dataset grows, the Brier-scored feedback loop will provide meaningful calibration data. Until then, the methodology described in this paper should be evaluated on its analytical reasoning, not its headline accuracy figures.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              This paper documents every analytical method currently running in production across 25+ external data sources and 105 analytical tools. Section 21 (Limitations) documents what the system cannot do, where the evidence is thin, and where parameters carry look-ahead bias. That section is as important as any other.
            </p>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          01: MULTI-LAYER SIGNAL DETECTION
      ══════════════════════════════════════════ */}
      <section id="signal-detection" className="px-6 py-20">
        <div ref={signalReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="01" label="Multi-Layer Signal Detection" visible={signalReveal.visible} />

          <div className={`max-w-3xl mb-10 ${anim} ${signalReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              The platform runs four independent primary signal layers: Geopolitical (GDELT, ACLED, Caldara-Iacoviello GPR), Market microstructure (options flow, GEX, VIX term structure), Systemic risk (Kritzman Absorption Ratio, BOCPD, Turbulence Index), and OSINT (shipping, aircraft tracking, sanctions, central-bank NLP). A fifth overlay, religious and celestial calendars, is maintained as narrative context to model how specific actors in power think and schedule decisions. These overlays receive no convergence bonus and are not treated as independent predictive signals. The independence of the four primary layers is a deliberate architectural decision. Correlated inputs produce correlated noise. Independent inputs produce meaningful convergence.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              Every signal layer normalises its output into a common schema: timestamp, category code, affected entities (actors, regions, tickers), geographic scope, and a preliminary intensity score on a 1-5 scale. This normalisation allows the convergence engine to operate on signals from fundamentally different domains without special-casing.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              Detection thresholds are dynamic. Baseline activity levels are recalculated on rolling windows so the system adapts to shifting environments. A troop movement during peacetime triggers differently than the same movement during an active conflict cycle. Signals below the noise floor are still recorded. They contribute to pattern recognition over longer time horizons even when they do not trigger immediate alerts.
            </p>
          </div>

          {/* Layer classification disclaimer */}
          <div className={`mb-8 border border-accent-amber/20 rounded-lg p-5 bg-accent-amber/[0.03] ${anim} ${signalReveal.visible ? shown : hidden}`} style={{ transitionDelay: "150ms" }}>
            <div className="font-mono text-[9px] uppercase tracking-wider text-accent-amber mb-2">Layer Classification</div>
            <p className="font-sans text-[12px] text-navy-400 leading-[1.8]">
              NEXUS has four primary signal layers (GEO, MKT, OSI, Systemic Risk) that drive convergence scoring. Calendar and celestial overlays (CAL / CEL) are narrative/actor-belief context only, capped at max 0.5 bonus. They do not generate independent alerts, do not receive convergence weight, and are not counted in base-rate calculations. Their purpose is interpretive framing for understanding why certain actors may behave differently around specific dates.
            </p>
          </div>

          {/* Signal Layers */}
          <div className={`space-y-4 ${anim} ${signalReveal.visible ? shown : hidden}`} style={{ transitionDelay: "200ms" }}>
            <ExpandableSection title="GEO / Geopolitical Events" defaultOpen>
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The geopolitical layer tracks conflict escalation patterns, sanctions regimes, diplomatic shifts, military posture changes, and regime instability indicators. Data is sourced from GDELT (Global Database of Events, Language, and Tone), which processes global news media in real-time and codes events using the CAMEO taxonomy.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  GDELT queries are constructed per-region with Boolean keyword combinations wrapped in parenthesised OR groups and filtered by source language. The system monitors 15+ geographic regions with customised query sets. Event data is cross-referenced against curated conflict anniversary databases, where historical patterns (e.g., military exercises that preceded past escalations) inform the weighting of current signals.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The Geopolitical Risk (GPR) Index, originally developed by Caldara and Iacoviello at the Federal Reserve Board, provides a macro-level risk baseline. NEXUS ingests the GPR daily index (sourced from upstream XLS data, parsed via the XLSX library with Excel serial date handling) and uses it as a contextual overlay for individual event scoring.
                </p>
                <div className="mt-4 border border-navy-800/30 rounded p-4 bg-navy-900/20">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-2">Data Sources</div>
                  <div className="font-sans text-[12px] text-navy-500 leading-relaxed">
                    GDELT Event API (5-min polling) / ACLED Conflict Data / GPR Daily Index (Caldara-Iacoviello) / Curated conflict anniversary database
                  </div>
                </div>
              </div>
            </ExpandableSection>

            <ExpandableSection title="CAL / Calendar Events — Narrative Context">
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The calendar layer has two distinct components with very different epistemic statuses: the Gregorian economic calendar (primary layer input) and religious / ceremonial calendars (narrative context only).
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The economic calendar monitors high-impact data releases (Non-Farm Payrolls, CPI prints, FOMC decisions, options expiry dates, fiscal quarter boundaries) with significance scoring based on historical volatility impact. Events are tagged with affected asset classes and expected volatility multipliers. This component is a genuine primary-layer input because scheduled macro releases have documented, measurable effects on market microstructure.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Religious and ceremonial calendars (Hebrew, Islamic, and other observances) are tracked exclusively as narrative context to model how specific actors in power think and time decisions. A government whose key decision-makers observe the Jewish or Islamic calendar may time announcements, ceasefires, or escalations around religious dates. This is actor-belief modelling, not market prediction. These events receive no convergence bonus and are not counted as independent signal-layer activations. See Appendix A for the full discussion.
                </p>
                <div className="mt-4 border border-accent-amber/20 rounded p-4 bg-accent-amber/[0.03]">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-accent-amber mb-2">Classification</div>
                  <div className="font-sans text-[12px] text-navy-500 leading-relaxed">
                    Economic calendar: primary layer input. Religious / celestial calendars: narrative context only, zero convergence weight.
                  </div>
                </div>
              </div>
            </ExpandableSection>

            <ExpandableSection title="CEL / Celestial Events — Narrative Context">
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The celestial layer tracks astronomical events including lunar phases, solar and lunar eclipses, and solar activity cycles. It is classified as a <span className="font-mono text-navy-300">narrative context layer</span> only. It does not drive alerts independently, receives no convergence bonus, and is not counted as a primary signal-layer activation.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The sole purpose of this layer is actor-belief modelling: some geopolitical and religious actors assign significance to astronomical events and may time decisions around them. Tracking celestial calendars helps model that decision-making context, not the markets directly.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The platform functions identically if this layer is removed from convergence calculations. It is maintained because the narrative context it provides is useful when interpreting clusters already identified by primary layers, not as evidence for or against any market call.
                </p>
                <div className="mt-4 border border-accent-amber/20 rounded p-4 bg-accent-amber/[0.03]">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-accent-amber mb-2">Note</div>
                  <div className="font-sans text-[12px] text-navy-500 leading-relaxed">
                    Academic literature on lunar and geomagnetic market correlations is reviewed in Appendix A, along with an honest assessment of its evidentiary weight.
                  </div>
                </div>
              </div>
            </ExpandableSection>

            <ExpandableSection title="MKT / Market Microstructure">
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The market layer monitors quantitative signals from options flow, volatility surfaces, cross-asset correlations, credit spreads, and macro indicator surprises. Data is sourced primarily from Alpha Vantage (equities and crypto, with automatic symbol type detection) and FRED (Federal Reserve Economic Data, covering 200+ series with series-specific lookback windows).
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Options flow analysis tracks unusual volume, put/call ratio deviations, and gamma exposure (GEX) to detect dealer hedging pressure. The GEX calculation aggregates open interest across strike prices, computes net gamma exposure, and identifies positive/negative gamma flip points where dealer hedging behaviour shifts from stabilising to destabilising.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Short interest tracking monitors aggregate short positions across markets, flagging unusual buildups that may indicate institutional positioning ahead of anticipated events. Combined with the options flow data, this provides a comprehensive view of institutional sentiment that often diverges from headline narratives.
                </p>
                <div className="mt-4 border border-navy-800/30 rounded p-4 bg-navy-900/20">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-2">Key Indicators</div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {[
                      "VIX term structure",
                      "Put/Call ratio",
                      "Gamma exposure (GEX)",
                      "HY credit spreads",
                      "Yield curve shape",
                      "DXY direction",
                      "Short interest shifts",
                      "Options flow anomalies",
                    ].map((item) => (
                      <div key={item} className="font-mono text-[10px] text-navy-500 flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-accent-cyan/40" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ExpandableSection>

            <ExpandableSection title="OSI / Open Source Intelligence">
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The OSINT layer processes open-source data from multiple real-time feeds: OpenSky Network for military and civilian aircraft tracking (polled every 20 seconds), GDELT for global event monitoring (5-minute intervals), AIS vessel tracking for maritime domain awareness, and social media signals for narrative momentum detection.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Aircraft tracking focuses on military transponder codes and unusual flight patterns. The system maintains a database of known military aircraft types and their typical operating areas. Deviations from normal patterns, such as tanker aircraft entering unusual airspace or reconnaissance platforms orbiting specific regions, generate signals.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Vessel tracking monitors global shipping lanes with emphasis on five critical chokepoints (Strait of Hormuz, Suez Canal, Malacca Strait, Bab el-Mandeb, Panama Canal). The system tracks dark fleet activity through AIS gap detection, where vessels disabling their transponders in sanctioned waters generate high-priority signals.
                </p>
              </div>
            </ExpandableSection>
          </div>

          {/* Intensity Scoring */}
          <div className={`mt-10 border border-navy-800/40 rounded-lg p-6 bg-navy-900/10 ${anim} ${signalReveal.visible ? shown : hidden}`} style={{ transitionDelay: "300ms" }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-navy-500 mb-4">
              Signal Intensity Scoring
            </div>
            <p className="font-sans text-[13px] text-navy-400 leading-[1.8] mb-4">
              Each signal receives a raw intensity score based on its individual significance. This score is then normalised to a 1-5 scale using the following classification:
            </p>
            <div className="grid grid-cols-5 gap-2">
              {[
                { level: "1", label: "Routine", color: "#06b6d4", desc: "Below-average significance" },
                { level: "2", label: "Notable", color: "#22c55e", desc: "Above-baseline activity" },
                { level: "3", label: "Significant", color: "#f59e0b", desc: "Clear anomaly detected" },
                { level: "4", label: "Critical", color: "#f97316", desc: "Major event in progress" },
                { level: "5", label: "Extreme", color: "#ef4444", desc: "Rare-event threshold" },
              ].map((l) => (
                <div key={l.level} className="text-center">
                  <div
                    className="font-mono text-lg font-bold mb-1"
                    style={{ color: l.color }}
                  >
                    {l.level}
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-navy-400 mb-1">
                    {l.label}
                  </div>
                  <div className="font-sans text-[10px] text-navy-600 leading-snug">
                    {l.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          02: CONVERGENCE ANALYSIS
      ══════════════════════════════════════════ */}
      <section id="convergence" className="px-6 py-20">
        <div ref={convergenceReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="02" label="Convergence Analysis" visible={convergenceReveal.visible} />

          <div className={`max-w-3xl mb-8 ${anim} ${convergenceReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              The convergence engine is the core differentiator of the NEXUS platform. Individual signals from any single layer are informative. Temporal and thematic overlap between independent layers is where the real analytical value emerges. The mathematics behind convergence scoring is designed to reward independence and penalise correlation.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              Signals are grouped into proximity clusters using a 3-day sliding window. Within each window, the system identifies all unique signal layers represented and performs Bayesian posterior updating across them. Each layer produces a likelihood ratio representing how much its evidence supports or contradicts a given scenario. Layers are processed in order of decreasing reliability, with correlated layers discounted via a conditional dependency matrix to prevent double-counting of shared information. The final posterior probability is mapped to a 1-5 intensity scale calibrated so that intensity 5 (posterior above 0.60) requires strong evidence from multiple independent layers.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              This Bayesian fusion approach, based on Martin 2026 (arXiv:2601.13362) and Hoegh et al. 2015 (Technometrics), replaces the earlier additive scoring system. The key advantage: correlated layers are handled rigorously through a dependency matrix rather than treated as independent. When geopolitical and OSINT signals fire simultaneously, they share underlying information (the same conflict drives both). The dependency matrix discounts the second layer&apos;s likelihood ratio by its independence factor (0.50 for geopolitical-OSINT), preventing the inflation that additive scoring produces from correlated inputs. Different scenario types (military escalation, economic crisis, diplomatic shift) carry different base-rate priors calibrated against historical frequencies, so the system starts from the right baseline before incorporating evidence.
            </p>
          </div>

          {/* Scoring Formula */}
          <div className={`border border-navy-800/40 rounded-lg p-6 bg-navy-900/10 mb-6 ${anim} ${convergenceReveal.visible ? shown : hidden}`} style={{ transitionDelay: "200ms" }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-navy-500 mb-4">
              Bayesian Fusion Scoring Algorithm
            </div>
            <div className="space-y-3">
              <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                <span className="font-mono text-accent-cyan">Scenario prior</span> selects a base-rate probability for the inferred scenario type. Each scenario class has a calibrated prior reflecting historical frequencies, anchoring the posterior against overconfidence on rare events (Tetlock&apos;s &quot;Fermi-ize&quot; principle).
              </p>
              <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                <span className="font-mono text-accent-cyan">Likelihood ratio</span> for each layer is computed from aggregate event significance using a proprietary exponential model. At zero significance, the ratio equals unity (no evidence). Each layer carries a reliability coefficient calibrated against historical predictive value and recalibrated continuously against resolved outcomes.
              </p>
              <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                <span className="font-mono text-accent-cyan">Dependency discounting</span> adjusts each layer&apos;s likelihood ratio based on its correlation with previously processed layers. A proprietary dependency matrix captures pairwise independence between layers. Highly correlated layers are aggressively discounted to prevent double-counting. Near-independent layers retain their full evidence contribution.
              </p>
              <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                <span className="font-mono text-accent-cyan">Sequential Bayesian update</span> applies each adjusted likelihood ratio to the running posterior using Bayes&apos; theorem. Layers are processed in a proprietary order that maximises evidence integrity.
              </p>
              <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                <span className="font-mono text-accent-cyan">Posterior to intensity</span> maps the final posterior to a 1-5 scale: below 0.15 = intensity 1, 0.15-0.25 = 2, 0.25-0.40 = 3, 0.40-0.60 = 4, above 0.60 = 5. These thresholds are calibrated so that a single moderate geopolitical signal produces intensity 2, while intensity 5 requires strong multi-layer evidence.
              </p>
            </div>
          </div>

          <div className={`border border-navy-800/40 rounded-lg p-6 bg-navy-900/10 mb-6 ${anim} ${convergenceReveal.visible ? shown : hidden}`} style={{ transitionDelay: "300ms" }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-navy-500 mb-3">
              Statistical Significance and Base Rates
            </div>
            <p className="font-sans text-[13px] text-navy-400 leading-[1.8] mb-3">
              A valid challenge to any convergence system is: how often do multiple layers fire simultaneously by chance? If three layers converge frequently, the signal is noise. If three layers converge rarely, the convergence is informative. The base rate matters.
            </p>
            <p className="font-sans text-[13px] text-navy-400 leading-[1.8] mb-3">
              NEXUS uses a 3-day sliding window for convergence clustering. Within any given window, each of the four primary signal layers either fires or does not. If layers were truly independent and each had a 30% daily firing probability (a generous baseline), the probability of 3+ layers firing in the same window is approximately 3.1%. All four primary layers: 0.3%. These are back-of-envelope estimates, but they illustrate the point: multi-layer convergence across primary layers is a genuinely rare event under the null hypothesis that layers are unrelated. Narrative overlays are excluded from this base-rate calculation.
            </p>
            <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
              The system tracks convergence level frequency distributions in production. As the dataset grows, these distributions will be published alongside prediction accuracy data, providing empirical base rates that can be validated independently.
            </p>
          </div>

          <div className={`border border-navy-800/40 rounded-lg p-6 bg-navy-900/10 ${anim} ${convergenceReveal.visible ? shown : hidden}`} style={{ transitionDelay: "400ms" }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-navy-500 mb-3">
              Design Principle
            </div>
            <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
              NEXUS does not predict events. It identifies conditions under which events become more probable. The distinction matters: prediction implies certainty, while convergence analysis surfaces elevated probability windows. The system flags when an unusual number of independent indicators are pointing in the same direction, within the same timeframe, affecting the same region or asset class. What you do with that information is a decision, not a directive.
            </p>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          03: AI-DRIVEN SYNTHESIS
      ══════════════════════════════════════════ */}
      <section id="synthesis" className="px-6 py-20">
        <div ref={synthesisReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="03" label="AI-Driven Intelligence Synthesis" visible={synthesisReveal.visible} />

          <div className={`max-w-3xl mb-8 ${anim} ${synthesisReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              Converged signal clusters are passed through a structured AI analysis pipeline powered by Anthropic&apos;s Claude. The synthesis layer does not generate generic market commentary. Every output is grounded in specific signal data that triggered it. The AI receives the full signal cluster, historical parallels, current market context, active knowledge base entries, and regime state as structured inputs.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              The prompt architecture is calibrated for precision over volume. The system favours a single high-confidence assessment over multiple hedged opinions. When confidence is genuinely low, it states this explicitly with reasoning. There is no incentive structure that rewards volume of output.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              Intelligence briefs are tagged with confidence levels, time horizons, and the specific signals that informed each conclusion. This creates full traceability from raw signal to final assessment. Every thesis can be deconstructed back to the data points that generated it.
            </p>
          </div>

          <div className={`space-y-4 ${anim} ${synthesisReveal.visible ? shown : hidden}`} style={{ transitionDelay: "200ms" }}>
            <div className="border border-navy-800/40 rounded-lg p-6 bg-navy-900/10">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-navy-500 mb-4">
                Synthesis Output Schema
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "Directional Assessment", desc: "Market impact direction (bullish/bearish/mixed) with magnitude estimate" },
                  { label: "Escalation Probability", desc: "Probability ranges for scenario evolution based on historical parallels" },
                  { label: "Affected Instruments", desc: "Specific tickers, sectors, and asset classes with expected impact" },
                  { label: "Historical Parallels", desc: "Past convergence events with similar signatures and their outcomes" },
                  { label: "Scenario Trees", desc: "Branching probability paths with weighted likelihood assignments" },
                  { label: "Confidence Tagging", desc: "Explicit confidence level, time horizon, and supporting signal references" },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan/40 mt-1.5 shrink-0" />
                    <div>
                      <div className="font-mono text-[10px] text-navy-300 mb-0.5">{item.label}</div>
                      <div className="font-sans text-[11px] text-navy-500 leading-relaxed">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          04: PREDICTION ENGINE
      ══════════════════════════════════════════ */}
      <section id="prediction" className="px-6 py-20">
        <div ref={predictionReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="04" label="Prediction Engine and Calibration" visible={predictionReveal.visible} />

          <div className={`max-w-3xl mb-8 ${anim} ${predictionReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              The prediction engine converts intelligence syntheses into falsifiable, time-bounded, binary-outcome predictions. Every prediction specifies a ticker or event, a directional claim, a confidence level, and a resolution timeframe. There are no vague calls. Either the prediction resolves as confirmed or denied, and the scoring is automatic.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              Uniqueness is strictly enforced at generation time. The system checks for duplicate tickers, assets, and events before generating new predictions. Post-generation deduplication uses text similarity matching (50%+ word overlap threshold) and ticker-level conflict checking to prevent redundancy.
            </p>
          </div>

          <div className={`space-y-4 ${anim} ${predictionReveal.visible ? shown : hidden}`} style={{ transitionDelay: "200ms" }}>
            <ExpandableSection title="Brier Scoring" defaultOpen>
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Predictions are scored using the Brier score (Brier, 1950), the standard metric for evaluating the accuracy of probabilistic forecasts. The Brier score is the mean squared error between the predicted probability and the actual outcome:
                </p>
                <div className="border border-navy-800/30 rounded p-4 bg-navy-950/50 font-mono text-[12px] text-accent-cyan text-center">
                  BS = (1/N) &Sigma; (f&#x1D62; - o&#x1D62;)&sup2;
                </div>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Where f&#x1D62; is the forecast probability and o&#x1D62; is the binary outcome (1 = confirmed, 0 = denied). The score ranges from 0 (perfect calibration) to 1 (maximally wrong). A Brier score of 0.25 corresponds to a naive 50/50 baseline. Anything below 0.25 indicates the system is adding predictive value.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The critical property of the Brier score is that it penalises overconfidence. A prediction assigned 95% confidence that turns out wrong receives a much larger penalty than a 60% prediction that turns out wrong. This creates a natural incentive toward well-calibrated probability estimates rather than extreme confidence.
                </p>
              </div>
            </ExpandableSection>

            <ExpandableSection title="Log Loss (Cross-Entropy)">
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  In addition to Brier scoring, the system computes log loss (cross-entropy) for each prediction. Log loss applies a logarithmic penalty that grows asymptotically as confidence approaches certainty, making it even more punishing for confident wrong predictions than the Brier score.
                </p>
                <div className="border border-navy-800/30 rounded p-4 bg-navy-950/50 font-mono text-[12px] text-accent-cyan text-center">
                  LL = -[o&middot;log(f) + (1-o)&middot;log(1-f)]
                </div>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  A prediction assigned 99% confidence that resolves as wrong produces a log loss of approximately 4.6, while a 60% prediction that resolves wrong produces a log loss of approximately 0.92. This 5x penalty ratio enforces epistemic humility at the extremes.
                </p>
              </div>
            </ExpandableSection>

            <ExpandableSection title="Calibration Buckets and Reliability Diagrams">
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Predictions are binned into five confidence bands: 0-35%, 35-50%, 50-65%, 65-80%, and 80-100%. For each band, the system tracks the actual resolution rate. A well-calibrated system should show resolution rates that match the bin midpoints, e.g., predictions in the 65-80% band should resolve as confirmed approximately 72.5% of the time.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Deviations from the calibration diagonal indicate systematic bias. If the 80-100% band shows only 60% confirmation, the system is overconfident at high levels. If the 35-50% band shows 70% confirmation, the system is underconfident at low levels. Both patterns are automatically detected and flagged.
                </p>
              </div>
            </ExpandableSection>

            <ExpandableSection title="Regime-Aware Tagging and Invalidation">
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Every prediction is tagged with the market regime at creation (peacetime, transitional, or wartime) along with reference prices for key benchmarks (SPY, USO, GLD). When the regime shifts significantly, predictions made under the previous regime are evaluated for invalidation. If reference prices have moved more than 20% from the values at prediction creation, the prediction is expired as regime-invalidated rather than scored, preventing stale peacetime calls from corrupting wartime accuracy metrics.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  When wartime thresholds fire (e.g., kinetic strikes, chokepoint closures), the game theory branch marks all pending predictions related to that scenario as POST_EVENT, removing them from Brier score calculations. This enforces pre-event filtering: only predictions made before the event are scored, eliminating post-hoc rationalization from the calibration loop.
                </p>
              </div>
            </ExpandableSection>

            <ExpandableSection title="Direction vs Level Split Scoring">
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Predictions that include directional claims (up/down/flat) and specific price targets are scored on two separate axes: direction_correct (did the asset move in the predicted direction?) and level_correct (did the asset reach the predicted price target?). This separation reveals whether the system is good at calling direction but poor at magnitude, or vice versa, enabling targeted calibration of each component.
                </p>
              </div>
            </ExpandableSection>

            <ExpandableSection title="Volume Cap and Auto-Expiry">
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The system enforces a maximum of 75 active (unresolved) predictions at any time. When this cap is exceeded, the lowest-confidence predictions are expired first, ensuring the active pool represents the system&apos;s highest-conviction calls. Predictions that pass 7 days beyond their stated deadline without resolution are automatically expired, preventing indefinite accumulation of stale predictions in the scoring pipeline.
                </p>
              </div>
            </ExpandableSection>

            <ExpandableSection title="Feedback Loops and Self-Correction">
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Resolved predictions generate feedback that flows upstream into every component. The system tracks performance breakdown by category (market, geopolitical, OSINT, systemic risk), by timeframe (7/14/30/90 days), and by signal combination to identify which convergence patterns produce accurate forecasts and which do not. Only pre-event, non-invalidated, non-expired predictions are included in Brier score calculations.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Failure pattern detection automatically identifies overconfident denials, category-specific weaknesses, and timeframe underperformance. When the system detects that its predictions in a specific category consistently underperform, it records the pattern as a knowledge entry and applies damped calibration corrections.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Calibration corrections are damped to prevent overcorrection. The system applies a maximum of 50% of the identified confidence gap per correction round, using exponential decay with a 60-day half-life so recent predictions carry more weight than older ones. Resolution bias detection compares LLM subjective scores against binary accuracy metrics, flagging systematic leniency or harshness in the resolution process itself.
                </p>
              </div>
            </ExpandableSection>

            <ExpandableSection title="Red Team Adversarial Challenge (Tetlock GJP)">
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Before generating predictions, the system runs a structured adversarial challenge based on Tetlock&apos;s Good Judgment Project research showing that structured disagreement outperforms consensus (Tetlock &amp; Gardner, 2015). A separate AI agent reviews the full intelligence picture and argues against the prevailing thesis direction, identifying the three strongest counterarguments, the weakest assumptions, and what would need to be true for the thesis to be completely wrong.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The red team output is injected into the main prediction generation prompt with explicit instructions to reduce confidence where the counterarguments are strong. This prevents the system from generating overconfident predictions based on confirmation bias in the signal layers. The adversarial step is best-effort: if it fails, predictions proceed without it, but when active it measurably reduces overconfidence on high-conviction calls.
                </p>
                <div className="mt-4 border border-navy-800/30 rounded p-4 bg-navy-900/20">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-2">Research Basis</div>
                  <div className="font-sans text-[12px] text-navy-500 leading-relaxed">
                    Tetlock, P. &amp; Gardner, D. (2015). &quot;Superforecasting.&quot; Crown. GJP data showed superforecasters who deliberately considered opposing views had 30-50% lower Brier scores than those who did not.
                  </div>
                </div>
              </div>
            </ExpandableSection>

            <ExpandableSection title="Base Rate Anchoring (Fermi-ize Principle)">
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Every prediction generation cycle injects empirical base rates into the prompt before asking the model to forecast. This implements Tetlock&apos;s &quot;Fermi-ize&quot; principle: start from the outside-view base rate and adjust inward based on specific evidence. Military operations launch in approximately 2% of weeks during active standoffs. VIX closes above 30 on approximately 8% of trading days. Ceasefires hold for 30 days approximately 40% of the time once announced. These anchors prevent the common failure mode where the model assigns 90% confidence to a 2% base rate event without proportionally strong evidence.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Post-generation, the system applies a log-odds weighted averaging adjustment to every confidence value. The model&apos;s stated confidence and the relevant base rate are both converted to log-odds space, then combined with weights determined by evidence strength (1-5). Weak evidence (strength 1) keeps the result anchored near the base rate with only 20% model weight. Very strong evidence (strength 5) allows 90% model weight but never fully abandons the base rate. This log-odds approach is mathematically correct for combining probabilities (additive in log-odds = multiplicative in odds) and avoids the pathological behavior of linear averaging in probability space.
                </p>
                <div className="mt-4 border border-navy-800/30 rounded p-4 bg-navy-900/20">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-2">Research Basis</div>
                  <div className="font-sans text-[12px] text-navy-500 leading-relaxed">
                    Tetlock, P. &amp; Gardner, D. (2015). &quot;Superforecasting.&quot; Crown. Mellers, B. et al. (2024). &quot;Human and Algorithmic Predictions.&quot; Extended GJP research. Superforecasters who started from base rates and adjusted outperformed those who used inside-view-only reasoning.
                  </div>
                </div>
              </div>
            </ExpandableSection>

            <ExpandableSection title="Incremental Belief Updating">
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  GJP data showed that the most accurate forecasters made frequent small adjustments (2-5% per cycle) rather than infrequent large revisions. NEXUS implements this through an incremental belief updating function that reviews existing pending predictions against new signals and adjusts confidence by small increments, capped at +/-5% per cycle with a 6-hour cooldown between updates to any single prediction.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  For each pending prediction, the system identifies relevant new signals through keyword matching (minimum 2 words with 3+ characters overlapping between claim and signal text), then uses a lightweight AI model to assess whether the new signal strengthens or weakens the prediction. The adjustment magnitude and direction are extracted from the AI response, clamped to the +/-5% cap, and applied to the stored confidence. A complete belief history is maintained in the prediction&apos;s metadata, tracking every adjustment with timestamp, signal trigger, and reasoning. This replaces the previous binary approach of either generating new predictions or ignoring existing ones.
                </p>
                <div className="mt-4 border border-navy-800/30 rounded p-4 bg-navy-900/20">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-2">Research Basis</div>
                  <div className="font-sans text-[12px] text-navy-500 leading-relaxed">
                    Mellers, B. et al. (2014). GJP data showing frequent small updates beat infrequent large revisions. Most accurate forecasters made 2-5% adjustments per update cycle.
                  </div>
                </div>
              </div>
            </ExpandableSection>

            <ExpandableSection title="BIN Decomposition (Bias-Information-Noise)">
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Beyond aggregate Brier scoring, the system implements the BIN decomposition framework from Satopaa et al. (2021) to diagnose the source of prediction errors. Every Brier score can be decomposed into three additive components: Bias (systematic over/underconfidence), Information (how well confidence tracks actual outcomes), and Noise (random scatter in confidence assignments). The decomposition follows the identity: Brier = Bias + Var(c) + Var(o) - 2&middot;Cov(c,o), where Bias = (mean_c - mean_o)&sup2;, Noise = Var(c), and Information = Cov(c,o).
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  This decomposition runs per-category (market, geopolitical, celestial), allowing the system to identify whether errors in a specific domain come from systematic bias (the model consistently overestimates geopolitical event probability), noise (predictions in a category are scattered without pattern), or information gaps (confidence doesn&apos;t track outcomes, meaning the model isn&apos;t extracting useful signal from the data). The diagnostic output feeds directly into the prediction generation prompt, telling the model exactly where its calibration is failing and recommending specific corrections.
                </p>
                <div className="mt-4 border border-navy-800/30 rounded p-4 bg-navy-900/20">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-2">Research Basis</div>
                  <div className="font-sans text-[12px] text-navy-500 leading-relaxed">
                    Satopaa, V. et al. (2021). &quot;Bias, Information, Noise: A BIN Model of Forecasting.&quot; Management Science. Provides the mathematical framework for decomposing forecast error into its constituent sources.
                  </div>
                </div>
              </div>
            </ExpandableSection>

            <ExpandableSection title="Actor-Belief Bayesian Typing">
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Calendar events are modelled not as direct convergence bonuses but as signals that update actor-type probability distributions. Instead of &quot;Tisha B&apos;Av = +1 convergence,&quot; the system maintains Bayesian profiles for geopolitical actors where each actor has a type distribution (cooperative/hawkish/unpredictable) and base action probabilities (provocative action, military escalation, diplomatic engagement, economic action). Calendar events act as multipliers on these base probabilities, calibrated from documented historical behaviour.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Seven actor profiles are maintained with 17 calendar behaviour modifiers across Hebrew, Islamic, Gregorian, and Chinese calendar systems. Each modifier specifies the affected action type, a posterior multiplier calibrated from historical data, a confidence level reflecting sample size, and historical basis documentation. The system uses confidence-damped multiplicative updates: effective_multiplier = 1 + (posterior_multiplier - 1) &times; confidence. This prevents low-confidence modifiers from producing extreme probability shifts. Multiple modifiers compound multiplicatively with a 0.95 probability cap, and the resulting actor-belief analysis is injected into the prediction generation prompt alongside signal and market data.
                </p>
                <div className="mt-4 border border-navy-800/30 rounded p-4 bg-navy-900/20">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-2">Research Basis</div>
                  <div className="font-sans text-[12px] text-navy-500 leading-relaxed">
                    Tahir, M. (2025). &quot;Computational Geopolitics: Bayesian Game Theory for State Actor Modeling.&quot; Calendar events as signals that update actor-type probabilities rather than direct convergence bonuses.
                  </div>
                </div>
              </div>
            </ExpandableSection>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          05: INDICATIONS AND WARNINGS
      ══════════════════════════════════════════ */}
      <section id="iw-framework" className="px-6 py-20">
        <div ref={iwReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="05" label="Indications and Warnings Framework" visible={iwReveal.visible} />

          <div className={`max-w-3xl mb-8 ${anim} ${iwReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              The Indications and Warnings (I&amp;W) framework is adapted from military intelligence methodology. Each threat scenario defines a tree of indicators, observable events that would be expected to occur if the threat were materialising. As indicators activate, the scenario&apos;s threat level escalates through a defined escalation ladder.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              Indicators carry individual weights reflecting their diagnostic value. A troop mobilisation carries more weight than a diplomatic statement. Each indicator has four possible states, each with a corresponding multiplier:
            </p>
          </div>

          <div className={`grid grid-cols-4 gap-3 mb-8 ${anim} ${iwReveal.visible ? shown : hidden}`} style={{ transitionDelay: "200ms" }}>
            {[
              { state: "Inactive", mult: "0.0x", color: "text-navy-500", bg: "bg-navy-900/30", border: "border-navy-800/40" },
              { state: "Watching", mult: "0.3x", color: "text-accent-cyan", bg: "bg-accent-cyan/5", border: "border-accent-cyan/20" },
              { state: "Active", mult: "0.7x", color: "text-accent-amber", bg: "bg-accent-amber/5", border: "border-accent-amber/20" },
              { state: "Confirmed", mult: "1.0x", color: "text-accent-rose", bg: "bg-accent-rose/5", border: "border-accent-rose/20" },
            ].map((s) => (
              <div key={s.state} className={`rounded-lg p-4 border ${s.bg} ${s.border} text-center`}>
                <div className={`font-mono text-sm font-bold ${s.color} mb-1`}>{s.mult}</div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-navy-400">{s.state}</div>
              </div>
            ))}
          </div>

          <div className={`max-w-3xl space-y-5 ${anim} ${iwReveal.visible ? shown : hidden}`} style={{ transitionDelay: "300ms" }}>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              The scenario score is the weighted sum of (indicator.weight &times; status_multiplier) across all indicators, normalised to a percentage. Escalation levels map to percentage thresholds: Level 1 (0-20%), Level 2 (20-40%), Level 3 (40-60%), Level 4 (60-80%), Level 5 (80-100%).
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              Auto-detection from OSINT feeds operates continuously. GDELT and news headlines are matched against detection queries defined for each indicator. Two or more keyword matches move an indicator to &quot;watching&quot; status. Five or more matches auto-activate the indicator. All threshold transitions are recorded with timestamps and triggering data for audit trail purposes.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              Each scenario maps escalation levels to affected market sectors (energy, defense, transportation, etc.) and estimates market impact severity. This feeds directly into the thesis generation system and portfolio risk assessment.
            </p>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          07: MARKET REGIME DETECTION
      ══════════════════════════════════════════ */}
      <section id="regime-detection" className="px-6 py-20">
        <div ref={regimeReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="06" label="Market Regime Detection" visible={regimeReveal.visible} />

          <div className={`max-w-3xl mb-8 ${anim} ${regimeReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              Market regime detection classifies the current environment across six dimensions, each tracked independently with its own data sources, thresholds, and state transitions. This multi-dimensional approach captures the reality that market conditions cannot be reduced to a single &quot;risk-on/risk-off&quot; toggle.
            </p>
          </div>

          <div className={`space-y-3 mb-8 ${anim} ${regimeReveal.visible ? shown : hidden}`} style={{ transitionDelay: "200ms" }}>
            {[
              { dim: "Volatility", indicator: "VIX", states: "Suppressed (<13) / Low (13-17) / Normal (17-22) / Elevated (22-30) / High (30-40) / Crisis (>40)", weight: "0.20" },
              { dim: "Growth", indicator: "GDP + Claims + Sentiment + Industrial Production", states: "Expansion / Growth / Slowdown / Contraction", weight: "0.25" },
              { dim: "Monetary Policy", indicator: "Fed Funds level + direction", states: "Tightening / Neutral / Easing / Emergency", weight: "0.15" },
              { dim: "Risk Appetite", indicator: "HY OAS + VIX + Yield Curve", states: "Risk-On / Neutral / Risk-Off / Panic", weight: "0.20" },
              { dim: "US Dollar", indicator: "Trade-weighted DXY + direction", states: "Strengthening / Stable / Weakening / Crisis", weight: "0.10" },
              { dim: "Commodities", indicator: "WTI + Gold", states: "Supercycle-Up / Stable / Deflation / Supply-Shock", weight: "0.10" },
            ].map((r) => (
              <div key={r.dim} className="border border-navy-800/40 rounded-lg p-4 bg-navy-900/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[11px] font-semibold text-navy-200 uppercase tracking-wider">{r.dim}</span>
                  <span className="font-mono text-[10px] text-accent-cyan">{r.weight} weight</span>
                </div>
                <div className="font-sans text-[11px] text-navy-500 mb-1">{r.indicator}</div>
                <div className="font-mono text-[10px] text-navy-600">{r.states}</div>
              </div>
            ))}
          </div>

          <div className={`max-w-3xl ${anim} ${regimeReveal.visible ? shown : hidden}`} style={{ transitionDelay: "300ms" }}>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              A composite score is computed as the weighted average across all dimensions, mapped to a -1 to +1 scale. Regime shifts are detected when any dimension transitions between states, with hardcoded interpretation rules (e.g., &quot;suppressed-to-elevated volatility often precedes drawdowns&quot;). Each transition generates market implications that feed into thesis generation. State history is persisted for trend analysis.
            </p>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          08: SYSTEMIC RISK
      ══════════════════════════════════════════ */}
      <section id="systemic-risk" className="px-6 py-20">
        <div ref={systemicReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="07" label="Systemic Risk Monitoring" visible={systemicReveal.visible} />

          <div className={`max-w-3xl mb-8 ${anim} ${systemicReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              The systemic risk module implements two complementary quantitative frameworks for detecting market-wide stress: the Absorption Ratio (Kritzman, Li, Page, and Rigobon, 2011) and the Turbulence Index (Mahalanobis distance from historical norms). Together, these metrics identify conditions where diversification is failing and markets are moving in lockstep, the exact conditions that precede systemic events.
            </p>
          </div>

          <div className={`space-y-4 ${anim} ${systemicReveal.visible ? shown : hidden}`} style={{ transitionDelay: "200ms" }}>
            <ExpandableSection title="Absorption Ratio" defaultOpen>
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The Absorption Ratio measures the fraction of total variance in a multi-asset basket that is explained by a small number of principal components. When markets are calm and diversification is working, risk is distributed across many independent factors. When systemic stress rises, correlations increase and a smaller number of factors absorb a larger share of total variance.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  NEXUS computes the Absorption Ratio from a 10-asset basket: SPY, QQQ, IWM, EEM, TLT, HYG, LQD, GLD, USO, UUP, plus VIX. The covariance matrix is decomposed via eigenvalue analysis, and the top K eigenvalues (K = ceil(N/5)) are summed to produce the absorption fraction.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  An Absorption Ratio above 0.85 indicates that markets are moving in lockstep, which historically precedes systemic drawdowns. The 2008 crisis, the 2020 COVID crash, and the 2022 rate shock all showed absorption ratios above 0.85 in the weeks prior.
                </p>
              </div>
            </ExpandableSection>

            <ExpandableSection title="Turbulence Index (Mahalanobis Distance)">
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The Turbulence Index measures how unusual current market returns are relative to historical norms, accounting for the correlation structure between assets. It uses the Mahalanobis distance, the covariance-weighted distance between the current return vector and the historical mean vector.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The distance is percentile-ranked within a trailing 120-day window. Readings above the 95th percentile indicate extreme market stress. The combination of high absorption and high turbulence is particularly diagnostic: it indicates that markets are both highly correlated (absorption) and experiencing unusual returns (turbulence).
                </p>
              </div>
            </ExpandableSection>

            <ExpandableSection title="Composite Stress Score and Regime Classification">
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The two metrics are combined into a composite stress score (0-100): the Absorption Ratio contributes up to 50 points ((AR - 0.5) &times; 100, capped at 50), the Turbulence Index contributes up to 50 points (percentile / 2), and a Z-score bonus of up to 20 points rewards rapid changes in the Absorption Ratio relative to its rolling mean.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The composite score maps to four regime labels: <span className="font-mono text-accent-emerald">Stable</span> (below 30), <span className="font-mono text-accent-cyan">Elevated</span> (30-50 or AR &ge;0.7 or Z-score &ge;1.5), <span className="font-mono text-accent-amber">Fragile</span> (50-75 or AR &ge;0.8 or turbulence &ge;80th), and <span className="font-mono text-accent-rose">Critical</span> (&ge;75 or AR &ge;0.85 with turbulence &ge;90th).
                </p>
              </div>
            </ExpandableSection>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          09: BOCPD
      ══════════════════════════════════════════ */}
      <section id="bocpd" className="px-6 py-20">
        <div ref={bocpdReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="08" label="Bayesian Online Change Point Detection" visible={bocpdReveal.visible} />

          <div className={`max-w-3xl ${anim} ${bocpdReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              NEXUS implements Bayesian Online Change Point Detection (BOCPD), following Adams and MacKay (2007). The algorithm detects structural breaks in time series data in real-time, identifying the moments where the underlying data-generating process changes, such as volatility regime shifts, trend reversals, or correlation breakdowns.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              The implementation uses a Student-t predictive distribution rather than Gaussian, providing greater robustness to the fat-tailed returns typical of financial data. Each run-length hypothesis maintains its own sufficient statistics (mean, variance, count), and the Bayesian update mixture combines predictions from all active run-length experts.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              Log-gamma approximations are used for computational efficiency, allowing the algorithm to run in real-time without accumulating prohibitive computational cost. The system monitors six key series (VIXY, GLD, USO, TLT, UUP, and a computed signal intensity stream) and outputs detected change points with date, probability, run length, magnitude, direction, and pre/post-change mean comparison.
            </p>
            <div className="border border-navy-800/30 rounded p-4 bg-navy-900/20">
              <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-2">Reference</div>
              <div className="font-sans text-[12px] text-navy-500 leading-relaxed">
                Adams, R.P. and MacKay, D.J.C. (2007). &quot;Bayesian Online Changepoint Detection.&quot; arXiv:0710.3742
              </div>
            </div>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          10: ACH
      ══════════════════════════════════════════ */}
      <section id="ach" className="px-6 py-20">
        <div ref={achReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="09" label="Analysis of Competing Hypotheses" visible={achReveal.visible} />

          <div className={`max-w-3xl mb-8 ${anim} ${achReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              The ACH module implements the structured analytic technique developed by Richards Heuer at the CIA (Heuer, 1999). ACH is designed to counteract cognitive biases, particularly confirmation bias, by forcing systematic evaluation of evidence against multiple hypotheses simultaneously.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              Each analysis defines a set of hypotheses and a set of evidence items. Every evidence item is rated against every hypothesis on a five-point consistency scale: Strongly Consistent (CC, +2), Consistent (C, +1), Neutral (N, 0), Inconsistent (I, -1), and Strongly Inconsistent (II, -2).
            </p>
          </div>

          <div className={`space-y-4 ${anim} ${achReveal.visible ? shown : hidden}`} style={{ transitionDelay: "200ms" }}>
            <div className="border border-navy-800/40 rounded-lg p-6 bg-navy-900/10">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-navy-500 mb-4">
                ACH Scoring Methodology
              </div>
              <div className="space-y-3">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  <span className="font-mono text-accent-cyan">Evidence weighting:</span> Each evidence item carries a credibility weight (high=1.0, medium=0.7, low=0.4) and a relevance weight (high=1.0, medium=0.7, low=0.4). The product of these weights scales the rating&apos;s contribution to the hypothesis score.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  <span className="font-mono text-accent-cyan">Inconsistency scoring:</span> Following Heuer&apos;s methodology, the focus is on inconsistency rather than consistency. The hypothesis with the least inconsistent evidence is considered most likely, because consistency can be fabricated or coincidental while genuine inconsistency is diagnostic.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  <span className="font-mono text-accent-cyan">Probability conversion:</span> Inconsistency scores are converted to probability distributions using the softmax function, providing normalised likelihoods across all hypotheses.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  <span className="font-mono text-accent-cyan">Diagnosticity analysis:</span> Evidence items are ranked by their diagnosticity, the variance in their ratings across hypotheses. High-variance evidence is diagnostic (it distinguishes between hypotheses). Low-variance evidence is non-diagnostic (it is consistent with everything and therefore tells you little).
                </p>
              </div>
            </div>

            <div className="border border-navy-800/40 rounded-lg p-6 bg-navy-900/10">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-navy-500 mb-3">
                AI-Assisted Analysis
              </div>
              <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                The ACH module integrates AI analysis that reviews the completed matrix and flags: missing hypotheses that should be considered, potential cognitive biases in the rating patterns, gaps where additional evidence would be most diagnostic, and a devil&apos;s advocate argument for the least likely hypothesis. The AI does not override the analyst&apos;s ratings. It provides a structured second opinion on the analytical process itself.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          11: NATO ADMIRALTY RATING
      ══════════════════════════════════════════ */}
      <section id="source-reliability" className="px-6 py-20">
        <div ref={sourceReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="10" label="NATO Admiralty Rating System" visible={sourceReveal.visible} />

          <div className={`max-w-3xl mb-8 ${anim} ${sourceReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              Every information source consumed by NEXUS is rated using the NATO/Admiralty system, a two-axis evaluation framework used by intelligence agencies worldwide. The first axis rates the source itself (A through F for reliability). The second axis rates the specific information (1 through 6 for accuracy).
            </p>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 ${anim} ${sourceReveal.visible ? shown : hidden}`} style={{ transitionDelay: "200ms" }}>
            <div className="border border-navy-800/40 rounded-lg p-5 bg-navy-900/10">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-navy-500 mb-4">
                Source Reliability (A-F)
              </div>
              <div className="space-y-2">
                {[
                  { grade: "A", label: "Completely Reliable", examples: "Reuters, AP, Bloomberg, FT, WSJ" },
                  { grade: "B", label: "Usually Reliable", examples: "NYT, Guardian, SCMP, Bellingcat, Janes, RAND" },
                  { grade: "C", label: "Fairly Reliable", examples: "CNN, Politico, Defense One, Naval News" },
                  { grade: "D", label: "Not Usually Reliable", examples: "Daily Mail, NY Post, Fox News" },
                  { grade: "E", label: "Unreliable / Propaganda", examples: "RT, Sputnik, CGTN, TASS, PressTV" },
                  { grade: "F", label: "Cannot Be Judged", examples: "Unknown or first-time sources" },
                ].map((g) => (
                  <div key={g.grade} className="flex items-start gap-3">
                    <span className="font-mono text-[11px] font-bold text-accent-cyan w-3">{g.grade}</span>
                    <div>
                      <div className="font-sans text-[11px] text-navy-300">{g.label}</div>
                      <div className="font-sans text-[10px] text-navy-600">{g.examples}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-navy-800/40 rounded-lg p-5 bg-navy-900/10">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-navy-500 mb-4">
                Information Accuracy (1-6)
              </div>
              <div className="space-y-2">
                {[
                  { grade: "1", label: "Confirmed", rule: "3+ sources including 2+ reliable, corroborated" },
                  { grade: "2", label: "Probably True", rule: "2+ sources including 1+ reliable, corroborated" },
                  { grade: "3", label: "Possibly True", rule: "Reliable source, unconfirmed" },
                  { grade: "4", label: "Doubtful", rule: "Fairly reliable source, no corroboration" },
                  { grade: "5", label: "Improbable", rule: "Only unreliable sources" },
                  { grade: "6", label: "Cannot Determine", rule: "Insufficient basis for assessment" },
                ].map((g) => (
                  <div key={g.grade} className="flex items-start gap-3">
                    <span className="font-mono text-[11px] font-bold text-accent-cyan w-3">{g.grade}</span>
                    <div>
                      <div className="font-sans text-[11px] text-navy-300">{g.label}</div>
                      <div className="font-sans text-[10px] text-navy-600">{g.rule}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`max-w-3xl ${anim} ${sourceReveal.visible ? shown : hidden}`} style={{ transitionDelay: "300ms" }}>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              Composite confidence is calculated as 40% source reliability + 60% information accuracy. The system maintains a curated database of 69 sources across six reliability tiers (10 A-rated, 18 B-rated, 17 C-rated, 10 D-rated, 10 E-rated, with a default F-profile for unknown sources), each with specialties, bias direction (left/center/right/state-aligned), geographic focus, and historical track record (0-1 scale). Source ratings directly influence how signals from those sources are weighted in the convergence engine.
            </p>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          12: ECONOMIC NOWCASTING
      ══════════════════════════════════════════ */}
      <section id="nowcasting" className="px-6 py-20">
        <div ref={nowcastReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="11" label="Economic Nowcasting" visible={nowcastReveal.visible} />

          <div className={`max-w-3xl mb-8 ${anim} ${nowcastReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              The nowcasting module produces real-time estimates of macroeconomic conditions using high-frequency proxy data, bridging the gap between quarterly GDP releases and the daily reality of economic activity. Six dimensions are tracked simultaneously.
            </p>
          </div>

          <div className={`space-y-3 ${anim} ${nowcastReveal.visible ? shown : hidden}`} style={{ transitionDelay: "200ms" }}>
            {[
              { label: "GDP Nowcast", desc: "Anchored to official GDP with adjustments from initial claims (scaled by 0.8: +0.24pp effective at 220k, -0.40pp at 300k), consumer sentiment, yield curve inversion penalty. Adjustments are averaged across active inputs. Output: point estimate with 0.8pp confidence band and direction classification." },
              { label: "Inflation Nowcast", desc: "Anchored to 5-year breakeven inflation. Adjusted for oil price pressure (+0.3 above $90, -0.3 below $55) and dollar strength deflation signal (-0.1 for rising DXY)." },
              { label: "Employment", desc: "Initial claims classified: strong (<220k), moderate (220-280k), weak (280-350k), deteriorating (>350k). Direction inferred from week-over-week change." },
              { label: "Financial Conditions", desc: "VIX + HY credit spread + Fed Funds + dollar strength composited into a -2 to +2 index. Labels: very-tight / tight / neutral / loose / very-loose." },
              { label: "Consumer Strength", desc: "Consumer sentiment score classification with trend direction from recent readings." },
              { label: "Global Trade", desc: "Oil price and dollar direction as proxies for trade momentum: expanding / stable / contracting." },
            ].map((item) => (
              <div key={item.label} className="border border-navy-800/40 rounded-lg p-4 bg-navy-900/10">
                <div className="font-mono text-[11px] text-navy-200 uppercase tracking-wider mb-2">{item.label}</div>
                <p className="font-sans text-[12px] text-navy-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className={`mt-6 max-w-3xl space-y-5 ${anim} ${nowcastReveal.visible ? shown : hidden}`} style={{ transitionDelay: "300ms" }}>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              A composite risk score (0-100) aggregates all dimensions. Recession probability is estimated via a rule-based heuristic: base 5%, escalating to 70% if GDP is negative (35% if below 1%, 15% if below 2%), with additive adjustments of +15% for very-tight financial conditions and +20% for deteriorating employment.
            </p>
            <div className="border border-navy-800/30 rounded-lg p-4 bg-navy-900/20">
              <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-2">Methodology Note</div>
              <p className="font-sans text-[12px] text-navy-400 leading-[1.8]">
                This is a hand-tuned decision tree, not an econometric model. It does not compete with formal nowcasting frameworks (Giannone, Reichlin, Small 2008) on point accuracy. Its role in NEXUS is narrower: providing a fast, interpretable macro context layer that feeds into convergence analysis. The thresholds are transparent so the analyst can see exactly where each adjustment comes from and override accordingly. If the convergence engine detects a macro regime shift, the analyst should know which specific indicators drove that classification rather than treating it as a black-box probability.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          13: MONTE CARLO
      ══════════════════════════════════════════ */}
      <section id="monte-carlo" className="px-6 py-20">
        <div ref={monteReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="12" label="Monte Carlo Simulation" visible={monteReveal.visible} />

          <div className={`max-w-3xl ${anim} ${monteReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              The Monte Carlo engine generates stochastic price paths using skewed-normal sampling (Azzalini method), jump processes for event-driven gaps, and optional mean reversion. The implementation is standard quantitative finance. The engine accepts multiple named scenarios, each with a probability weight and independent volatility/drift/jump parameters.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              Per-scenario outputs include 100 sample paths, percentile distributions (P5 through P95), expected return, maximum drawdown, and probability of profit. Multiple scenarios are blended by their probability weights into a composite outlook. Currently, scenario weights are set via analyst-defined presets or manual input. The architecture accepts dynamic weights from any source, and connecting the convergence engine&apos;s posterior probabilities to Monte Carlo scenario weights is a planned integration that would allow geopolitical signal analysis to parameterise quantitative risk distributions directly.
            </p>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          14: MARITIME / SHIPPING
      ══════════════════════════════════════════ */}
      <section id="shipping" className="px-6 py-20">
        <div ref={shippingReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="13" label="Maritime and Shipping Intelligence" visible={shippingReveal.visible} />

          <div className={`max-w-3xl mb-8 ${anim} ${shippingReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              The shipping intelligence module monitors global maritime trade through five critical chokepoints, tracking traffic volumes, anomalies, dark fleet activity, and freight market indicators. These waterways collectively handle trillions of dollars in annual trade, and disruption at any one of them creates immediate, measurable commodity price impacts.
            </p>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-5 gap-3 mb-8 ${anim} ${shippingReveal.visible ? shown : hidden}`} style={{ transitionDelay: "200ms" }}>
            {[
              { name: "Hormuz", daily: "58", value: "$1.2T", pct: "21% oil" },
              { name: "Suez", daily: "72", value: "$1T", pct: "12% trade" },
              { name: "Malacca", daily: "84", value: "$5.3T", pct: "25% oil" },
              { name: "Bab el-Mandeb", daily: "40", value: "$700B", pct: "9% oil" },
              { name: "Panama", daily: "38", value: "$270B", pct: "5% trade" },
            ].map((c) => (
              <div key={c.name} className="border border-navy-800/40 rounded p-3 bg-navy-900/10 text-center">
                <div className="font-mono text-[10px] text-navy-200 uppercase tracking-wider mb-2">{c.name}</div>
                <div className="font-mono text-[14px] font-bold text-accent-cyan">{c.daily}</div>
                <div className="font-sans text-[9px] text-navy-600">daily transits</div>
                <div className="font-mono text-[10px] text-navy-500 mt-1">{c.value}</div>
                <div className="font-sans text-[9px] text-navy-600">{c.pct}</div>
              </div>
            ))}
          </div>

          <div className={`max-w-3xl space-y-5 ${anim} ${shippingReveal.visible ? shown : hidden}`} style={{ transitionDelay: "300ms" }}>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              Risk scoring per chokepoint aggregates GDELT maritime event mentions (1 mention = +8 points, 2+ = +20, 5+ = +40), oil price volatility on energy-sensitive chokepoints (&gt;3% change = +3 &times; |change|, capped at 25), dark fleet activity (+15 per alert), and global maritime tension (+10 if &gt;15 total events system-wide).
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              Chokepoint status is classified as Normal (&lt;25% risk), Elevated (25-59%), or Disrupted (&ge;60%). At disruption level, the system estimates a 30% transit volume reduction. Six shipping equities (ZIM, SBLK, STNG, FRO, DHT, BDRY) are tracked as real-time freight rate proxies, providing market-side confirmation of maritime stress signals.
            </p>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          15: CENTRAL BANK NLP
      ══════════════════════════════════════════ */}
      <section id="central-bank" className="px-6 py-20">
        <div ref={centralReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="14" label="Central Bank NLP Analysis" visible={centralReveal.visible} />

          <div className={`max-w-3xl ${anim} ${centralReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              The central bank analysis module performs natural language processing on monetary policy statements, press conference transcripts, and minutes to extract hawkish/dovish sentiment, topic distribution, and rate path implications.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              Tokenisation is word-level with support for hyphenated compound terms (e.g., &quot;higher-for-longer&quot; is matched as a single token). The lexicon includes 46 hawkish terms (inflation, tightening, restrictive, overheating, vigilance, higher-for-longer, sustained, elevated, rate-hike, and others), 48 dovish terms (accommodative, easing, downside-risks, pivot, patience, growth-concerns, rate-cut, and others), and 21 uncertainty terms (data-dependent, conditional, balanced-risks, optionality, monitoring, evolving, and others), totalling 115 curated tokens.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              The net score is (hawkish_count - dovish_count) / total_words. A score above +0.005 implies a hiking bias. Below -0.005 implies a cutting bias. Between these thresholds, the system classifies the stance as pausing or uncertain depending on the uncertainty term density.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              Topic breakdown categorises tokens into inflation, employment, growth, and financial stability. Market implications are pre-computed per dimension: bonds (&gt;+0.003 = bearish, &lt;-0.003 = bullish), equities, dollar, and gold. Statement-to-statement comparison detects tone shifts and significant changes across dimensions, flagging moments where central bank communication is evolving.
            </p>
            <div className="mt-5 border border-navy-800/30 rounded p-4 bg-navy-900/20">
              <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-2">On Methodology Choice</div>
              <div className="font-sans text-[12px] text-navy-500 leading-relaxed">
                Dictionary-based sentiment analysis is a deliberate design choice. The Loughran-McDonald financial sentiment dictionary (Journal of Finance, 2011), used by the SEC and academic researchers worldwide, operates on the same bag-of-words principle with domain-specific lexicons. For central bank communication, which uses a deliberately narrow and stable vocabulary, dictionary methods outperform general-purpose models because the target language is small and precisely defined. The 115-token NEXUS lexicon is curated specifically for monetary policy discourse, where &quot;restrictive&quot; always means hawkish and &quot;accommodative&quot; always means dovish. Transformer-based models add complexity without proportional accuracy gains on this specific text type.
              </div>
            </div>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          16: NARRATIVE TRACKING
      ══════════════════════════════════════════ */}
      <section id="narrative" className="px-6 py-20">
        <div ref={narrativeReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="15" label="Narrative Tracking and Divergence Detection" visible={narrativeReveal.visible} />

          <div className={`max-w-3xl ${anim} ${narrativeReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              The narrative engine tracks media momentum across 11 thematic clusters: war, sanctions, trade, inflation, recession, AI, crypto, oil, China, Russia, and Iran. Data is sourced from GDELT and Reddit in parallel, with keyword matching per theme.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              Sentiment scoring uses curated positive (26 terms) and negative (28 terms) word lists, normalised by total match count. Momentum classification compares recent article volume to older volume: Rising (&gt;1.5x ratio), Peaking (stable, recent &ge; older), Fading (older &gt;1.5x recent), or Stable.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              The most valuable output of narrative tracking is divergence detection. When a narrative has high conviction (sentiment &gt;0.4, 3+ articles) and the implied price direction does not match actual market movement, the system flags a potential contrarian signal. Strong bearish narratives that fail to move prices downward often precede rallies. Strong bullish narratives that fail to lift prices often precede corrections. The divergence is the signal.
            </p>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          17: OSINT ENTITY EXTRACTION
      ══════════════════════════════════════════ */}
      <section id="osint" className="px-6 py-20">
        <div ref={osintReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="16" label="OSINT Entity Extraction and Graph" visible={osintReveal.visible} />

          <div className={`max-w-3xl ${anim} ${osintReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              The entity extraction pipeline processes raw OSINT text and structures it into a searchable graph of actors, locations, topics, and market instruments. The system maintains curated pattern databases: 16 geopolitical actors with keyword aliases (Iran, Russia, China, US, Israel, Saudi Arabia, Turkey, North Korea, Ukraine, Taiwan, EU, NATO, OPEC, Hezbollah, Hamas, Houthis), 13 strategic locations and chokepoints, 14 topic categories (nuclear, oil_supply, sanctions, military_exercise, missile_test, cyber_attack, etc.), and 13 market tickers mapped to geopolitical exposure.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              Pattern matching identifies entities in text and maps them to database records. Extracted entities are linked in a relationship graph with weighted edges that strengthen as more co-occurrences are detected. The graph enables traversal queries: &quot;show all entities connected to Iran within 2 hops&quot; or &quot;find all tickers mentioned in articles about Strait of Hormuz.&quot;
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              Scenario mapping triggers when specific keyword combinations appear together: nuclear-related terms with Iran trigger the &quot;Iran Nuclear&quot; scenario, military terms with Taiwan trigger the &quot;Taiwan Strait&quot; scenario. Sentiment classification (positive/negative/neutral) and urgency scoring (low/medium/high/critical) are applied to each processed document.
            </p>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          18: KNOWLEDGE BANK
      ══════════════════════════════════════════ */}
      <section id="knowledge" className="px-6 py-20">
        <div ref={knowledgeReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="17" label="Knowledge Bank and Vector Embeddings" visible={knowledgeReveal.visible} />

          <div className={`max-w-3xl ${anim} ${knowledgeReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              The knowledge bank is a semantic store containing structured intelligence entries. Each entry is embedded into a high-dimensional vector space, enabling semantic search that finds relevant knowledge based on meaning rather than keyword matching.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              Multiple ingestion pipelines feed the knowledge bank: deterministic (curated facts and relationships), advanced (multi-document synthesis), live (real-time OSINT-to-knowledge), deep thematic (geopolitical relationship mapping), and structural (entity relationship extraction). Active knowledge filtering applies confidence thresholds and recency weighting to ensure that stale or low-confidence entries do not contaminate current analysis.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              The knowledge bank serves as institutional memory for the AI synthesis layer. When generating analysis, the system queries the knowledge bank for semantically relevant entries, providing historical context, established relationships, and previously identified patterns. This prevents the AI from treating each analysis as if starting from scratch and enables the system to build on its own accumulated intelligence.
            </p>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          19: AI PROGRESSION
      ══════════════════════════════════════════ */}
      <section id="ai-progression" className="px-6 py-20">
        <div ref={aiProgReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="18" label="AI Progression Tracking" visible={aiProgReveal.visible} />

          <div className={`max-w-3xl ${anim} ${aiProgReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              The AI progression module tracks the advancement of artificial intelligence capabilities as a distinct signal layer, recognising that AI development is itself a geopolitical and market-moving force. Four data dimensions are tracked: the Remote Labor Index (RLI) from remotelabor.ai, METR time horizons, the AI 2027 scenario timeline, and sector-level automation risk assessment.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              The RLI benchmarks AI systems against real-world freelance work tasks (6,000+ hours, $140K+ value), measuring what percentage of remote labor AI can currently automate. METR time horizons track the task duration at which frontier AI agents succeed 50% and 80% of the time, with a measured doubling time of 131 days post-2023.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              Sector automation risk profiles 10 industries with automation risk scores (0-100), current AI adoption rates, estimated jobs at risk, timeframe, and trend classification (accelerating/stable/early). FRED labor market data (unemployment rate, initial claims, nonfarm payrolls, labor force participation) provides real-world employment context.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              A composite AI progression score (0-100) blends all dimensions: RLI performance (0-25), METR pace (0-25), enterprise adoption rate (0-25), and displacement indicators (0-25). The score maps to five regime labels: nascent, accelerating, inflection, displacement, and transformation.
            </p>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          20: SYSTEM INTEGRATION
      ══════════════════════════════════════════ */}
      <section id="integration" className="px-6 py-20">
        <div ref={integrationReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="19" label="System Integration Architecture" visible={integrationReveal.visible} />

          <div className={`max-w-3xl mb-10 ${anim} ${integrationReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              The individual methodologies documented above do not operate in isolation. The value of the platform comes from how they integrate. Every component consumes outputs from other components and produces outputs that feed downstream. The result is a self-reinforcing intelligence cycle where each iteration generates data that makes the next iteration sharper.
            </p>
          </div>

          <div className={`space-y-3 ${anim} ${integrationReveal.visible ? shown : hidden}`} style={{ transitionDelay: "200ms" }}>
            {[
              { from: "Signal Layers", to: "Convergence Engine", desc: "Independent signals are normalised and fed into the proximity clustering algorithm for convergence scoring." },
              { from: "Convergence Engine", to: "AI Synthesis", desc: "Converged signal clusters, along with regime state and knowledge bank context, inform structured intelligence generation." },
              { from: "AI Synthesis", to: "Prediction Engine", desc: "Intelligence theses generate falsifiable, time-bounded, scored predictions." },
              { from: "Prediction Engine", to: "Feedback Loop", desc: "Resolved predictions produce Brier scores and calibration data that flow upstream into detection thresholds, convergence weights, and synthesis prompts." },
              { from: "OSINT Feeds", to: "I&W Framework", desc: "GDELT headlines auto-trigger indicator status changes in threat scenarios." },
              { from: "Market Regime", to: "Thesis Generation", desc: "Current regime state informs positioning, sector allocation, and confidence calibration." },
              { from: "ACH Analysis", to: "Scenario Weighting", desc: "Hypothesis probability distributions inform geopolitical scenario weighting in game theory models." },
              { from: "Narrative Divergence", to: "Signal Layer", desc: "Media momentum divergences generate trading signals when narrative and price disagree." },
              { from: "Systemic Risk", to: "Risk Management", desc: "Absorption Ratio and Turbulence Index inform position sizing, hedging triggers, and portfolio-level risk assessment." },
              { from: "Knowledge Bank", to: "All Components", desc: "Semantic memory provides historical context, established patterns, and accumulated intelligence to every analytical module." },
            ].map((flow) => (
              <div key={flow.from + flow.to} className="flex items-start gap-4 border border-navy-800/30 rounded-lg p-4 bg-navy-900/10">
                <div className="shrink-0 flex items-center gap-2">
                  <span className="font-mono text-[10px] text-accent-cyan uppercase tracking-wider">{flow.from}</span>
                  <ArrowRight className="w-3 h-3 text-navy-600" />
                  <span className="font-mono text-[10px] text-navy-300 uppercase tracking-wider">{flow.to}</span>
                </div>
                <p className="font-sans text-[11px] text-navy-500 leading-relaxed">{flow.desc}</p>
              </div>
            ))}
          </div>

          <div className={`mt-10 max-w-3xl ${anim} ${integrationReveal.visible ? shown : hidden}`} style={{ transitionDelay: "300ms" }}>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              The platform currently processes data from 25+ external APIs and data feeds, runs 105 analytical tools accessible via the AI chat interface, and maintains a self-correcting feedback loop through Brier-scored prediction tracking. Every component described in this paper runs in production, processing real data, generating real predictions, and measuring real outcomes. The system is measured by what it produces, and the accuracy record is public.
            </p>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          21: ACADEMIC FOUNDATIONS
      ══════════════════════════════════════════ */}
      <section id="academic" className="px-6 py-20">
        <div ref={academicReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="20" label="Academic Foundations & Peer-Reviewed Evidence" visible={academicReveal.visible} />

          <div className={`max-w-3xl mb-10 ${anim} ${academicReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              Every signal layer in the NEXUS platform is grounded in peer-reviewed academic research. The convergence thesis, that combining independent, uncorrelated signals from disparate domains produces stronger predictions than any single-layer analysis, is supported by foundational work in ensemble learning, complexity economics, intelligence fusion, and behavioural finance. This section catalogues the key studies underpinning each component.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              We cite only published, peer-reviewed research from recognised journals and institutions. Where a study has been referenced inline in earlier sections, it is collected here with full bibliographic details for completeness.
            </p>
          </div>

          <div className={`space-y-4 ${anim} ${academicReveal.visible ? shown : hidden}`} style={{ transitionDelay: "200ms" }}>

            <ExpandableSection title="Geopolitical Risk" defaultOpen>
              <div className="pt-4 space-y-5">
                <div className="border-l-2 border-navy-700/40 pl-4">
                  <p className="font-sans text-[13px] text-navy-300 leading-[1.8] font-medium">Caldara, D. and Iacoviello, M. (2022). &quot;Measuring Geopolitical Risk.&quot;</p>
                  <p className="font-sans text-[12px] text-navy-500 leading-[1.7] mt-1">American Economic Review, 112(4), 1194-1225.</p>
                  <p className="font-sans text-[12px] text-navy-400 leading-[1.7] mt-2">Constructs a news-based Geopolitical Risk index from 10 newspapers since 1900. Higher geopolitical risk foreshadows lower investment, stock prices, and employment. The effect is driven by threats of geopolitical events rather than their realisation. NEXUS ingests the GPR daily index as a macro overlay for event scoring.</p>
                </div>
                <div className="border-l-2 border-navy-700/40 pl-4">
                  <p className="font-sans text-[13px] text-navy-300 leading-[1.8] font-medium">Baker, S.R., Bloom, N. and Davis, S.J. (2016). &quot;Measuring Economic Policy Uncertainty.&quot;</p>
                  <p className="font-sans text-[12px] text-navy-500 leading-[1.7] mt-1">Quarterly Journal of Economics, 131(4), 1593-1636.</p>
                  <p className="font-sans text-[12px] text-navy-400 leading-[1.7] mt-2">Developed the EPU index based on newspaper coverage frequency. Policy uncertainty is associated with greater stock price volatility and reduced investment in policy-sensitive sectors. Validates news-based signal detection as a predictive methodology.</p>
                </div>
              </div>
            </ExpandableSection>

            <ExpandableSection title="Calendar and Celestial Effects">
              <div className="pt-4 space-y-5">
                <div className="border-l-2 border-navy-700/40 pl-4">
                  <p className="font-sans text-[13px] text-navy-300 leading-[1.8] font-medium">Dichev, I.D. and Janes, T.D. (2003). &quot;Lunar Cycle Effects in Stock Returns.&quot;</p>
                  <p className="font-sans text-[12px] text-navy-500 leading-[1.7] mt-1">The Journal of Private Equity, 6(4), 8-29.</p>
                  <p className="font-sans text-[12px] text-navy-400 leading-[1.7] mt-2">Returns in 15-day periods around new moons are approximately double those around full moons. Pattern is pervasive across all major US stock indices over 100 years and across 24 other countries over 30 years.</p>
                </div>
                <div className="border-l-2 border-navy-700/40 pl-4">
                  <p className="font-sans text-[13px] text-navy-300 leading-[1.8] font-medium">Yuan, K., Zheng, L. and Zhu, Q. (2006). &quot;Are Investors Moonstruck? Lunar Phases and Stock Returns.&quot;</p>
                  <p className="font-sans text-[12px] text-navy-500 leading-[1.7] mt-1">Journal of Empirical Finance, 13(1), 1-23.</p>
                  <p className="font-sans text-[12px] text-navy-400 leading-[1.7] mt-2">Examined 48 countries. Stock returns are lower around full moons and higher around new moons by 3-5% per annum. The effect is independent of changes in volatility, trading volumes, macroeconomic announcements, or global shocks.</p>
                </div>
                <div className="border-l-2 border-navy-700/40 pl-4">
                  <p className="font-sans text-[13px] text-navy-300 leading-[1.8] font-medium">Krivelyova, A. and Robotti, C. (2003). &quot;Playing the Field: Geomagnetic Storms and the Stock Market.&quot;</p>
                  <p className="font-sans text-[12px] text-navy-500 leading-[1.7] mt-1">Federal Reserve Bank of Atlanta Working Paper 2003-5b.</p>
                  <p className="font-sans text-[12px] text-navy-400 leading-[1.7] mt-2">Found a 14% difference in annualised returns between normal days and days affected by geomagnetic storms on the NASDAQ (1972-2000). The mechanism: geomagnetic storms affect mood, which affects risk-taking behaviour. A Federal Reserve working paper validating solar/geomagnetic effects on market returns.</p>
                </div>
                <div className="border-l-2 border-navy-700/40 pl-4">
                  <p className="font-sans text-[13px] text-navy-300 leading-[1.8] font-medium">Bialkowski, J., Etebari, A. and Wisniewski, T.P. (2012). &quot;Piety and Profits: Stock Market Anomaly during the Muslim Holy Month.&quot;</p>
                  <p className="font-sans text-[12px] text-navy-500 leading-[1.7] mt-1">Research in International Business and Finance.</p>
                  <p className="font-sans text-[12px] text-navy-400 leading-[1.7] mt-2">Returns are higher during Ramadan with a decline in volatility across Muslim-majority market countries, consistent with positive investor sentiment during the holy month.</p>
                </div>
                <div className="border-l-2 border-navy-700/40 pl-4">
                  <p className="font-sans text-[13px] text-navy-300 leading-[1.8] font-medium">Frieder, L. and Subrahmanyam, A. &quot;Nonsecular Regularities in Returns and Volume.&quot;</p>
                  <p className="font-sans text-[12px] text-navy-500 leading-[1.7] mt-1">NYU Stern School of Business.</p>
                  <p className="font-sans text-[12px] text-navy-400 leading-[1.7] mt-2">Found measurable return effects around Rosh Hashana (higher returns before festive holidays) and Yom Kippur (lower returns before the solemn day) on US equity markets. Documented effects on volatility and liquidity during these periods.</p>
                </div>
              </div>
            </ExpandableSection>

            <ExpandableSection title="Sentiment, Narrative, and Alternative Data">
              <div className="pt-4 space-y-5">
                <div className="border-l-2 border-navy-700/40 pl-4">
                  <p className="font-sans text-[13px] text-navy-300 leading-[1.8] font-medium">Shiller, R.J. (2017). &quot;Narrative Economics.&quot;</p>
                  <p className="font-sans text-[12px] text-navy-500 leading-[1.7] mt-1">American Economic Review, 107(4), 967-1004. AER Presidential Address.</p>
                  <p className="font-sans text-[12px] text-navy-400 leading-[1.7] mt-2">Economic events are substantially driven by the contagious spread of oversimplified narratives, analogous to viral epidemics. Provides the academic foundation for why tracking narrative spread and divergence is predictive of market behaviour.</p>
                </div>
                <div className="border-l-2 border-navy-700/40 pl-4">
                  <p className="font-sans text-[13px] text-navy-300 leading-[1.8] font-medium">Tetlock, P.C. (2007). &quot;Giving Content to Investor Sentiment: The Role of Media in the Stock Market.&quot;</p>
                  <p className="font-sans text-[12px] text-navy-500 leading-[1.7] mt-1">Journal of Finance, 62(3), 1139-1168.</p>
                  <p className="font-sans text-[12px] text-navy-400 leading-[1.7] mt-2">High media pessimism predicts downward pressure on market prices followed by reversion to fundamentals. Unusually high or low pessimism predicts high trading volume. Results consistent with noise trader models.</p>
                </div>
                <div className="border-l-2 border-navy-700/40 pl-4">
                  <p className="font-sans text-[13px] text-navy-300 leading-[1.8] font-medium">Bollen, J., Mao, H. and Zeng, X. (2011). &quot;Twitter Mood Predicts the Stock Market.&quot;</p>
                  <p className="font-sans text-[12px] text-navy-500 leading-[1.7] mt-1">Journal of Computational Science, 2, 1-8.</p>
                  <p className="font-sans text-[12px] text-navy-400 leading-[1.7] mt-2">Achieved 86.7% accuracy predicting daily DJIA directional changes using Twitter mood analysis. Demonstrated that mood dimensions beyond simple positive/negative carry predictive power. Over 2,500 citations.</p>
                </div>
                <div className="border-l-2 border-navy-700/40 pl-4">
                  <p className="font-sans text-[13px] text-navy-300 leading-[1.8] font-medium">Katona, Z., Painter, M., Patatoukas, P.N. and Zeng, J. (2022). &quot;On the Capital Market Consequences of Big Data: Evidence from Outer Space.&quot;</p>
                  <p className="font-sans text-[12px] text-navy-500 leading-[1.7] mt-1">Journal of Financial and Quantitative Analysis.</p>
                  <p className="font-sans text-[12px] text-navy-400 leading-[1.7] mt-2">Satellite parking lot imagery across 44 major US retailers yields 4-5% returns in the three days around quarterly earnings announcements. Proves alternative data creates measurable, published alpha from non-standard data sources.</p>
                </div>
              </div>
            </ExpandableSection>

            <ExpandableSection title="Regime Detection and Change-Point Analysis">
              <div className="pt-4 space-y-5">
                <div className="border-l-2 border-navy-700/40 pl-4">
                  <p className="font-sans text-[13px] text-navy-300 leading-[1.8] font-medium">Adams, R.P. and MacKay, D.J.C. (2007). &quot;Bayesian Online Changepoint Detection.&quot;</p>
                  <p className="font-sans text-[12px] text-navy-500 leading-[1.7] mt-1">arXiv:0710.3742.</p>
                  <p className="font-sans text-[12px] text-navy-400 leading-[1.7] mt-2">The foundational paper for BOCPD. Enables real-time estimation of run-length distributions using message-passing, allowing online detection of change-points without requiring a predetermined number of regimes. NEXUS implements this algorithm for real-time market regime shift detection.</p>
                </div>
                <div className="border-l-2 border-navy-700/40 pl-4">
                  <p className="font-sans text-[13px] text-navy-300 leading-[1.8] font-medium">Hamilton, J.D. (1989). &quot;A New Approach to the Economic Analysis of Nonstationary Time Series and the Business Cycle.&quot;</p>
                  <p className="font-sans text-[12px] text-navy-500 leading-[1.7] mt-1">Econometrica, 57, 357-384.</p>
                  <p className="font-sans text-[12px] text-navy-400 leading-[1.7] mt-2">The seminal paper introducing Markov-switching models. Economic variables behave differently during downturns, and abrupt changes in financial data can be modelled as regime switches. Provides the theoretical basis for NEXUS&apos;s multi-regime signal analysis.</p>
                </div>
              </div>
            </ExpandableSection>

            <ExpandableSection title="Convergence Theory: Diversity, Ensemble Methods, and Complex Systems">
              <div className="pt-4 space-y-5">
                <div className="border border-accent-cyan/20 rounded p-4 bg-accent-cyan/[0.02] mb-2">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-accent-cyan mb-2">Addressing the Category Error Objection</div>
                  <p className="font-sans text-[12px] text-navy-400 leading-[1.8]">
                    A fair critique of the ensemble analogy is that Wolpert and Breiman describe supervised learning ensembles, trained classifiers with performance guarantees on held-out data, and signal layers are not classifiers. This is correct at the implementation level. The analogy is structural, not mechanical: the mathematical principle that combining diverse, uncorrelated inputs reduces aggregate error holds regardless of whether those inputs are ML models, human forecasters, or heterogeneous data streams. Hong and Page (2004) proved this rigorously for problem-solving groups that are not ML models, demonstrating that diversity of approach outperforms individual ability. The intelligence community&apos;s all-source fusion doctrine (RAND 2012) applies the same principle to heterogeneous collection disciplines. NEXUS extends this to four primary market-relevant signal domains; narrative overlays are not included in the ensemble calculation.
                  </p>
                </div>
                <div className="border-l-2 border-navy-700/40 pl-4">
                  <p className="font-sans text-[13px] text-navy-300 leading-[1.8] font-medium">Hong, L. and Page, S.E. (2004). &quot;Groups of Diverse Problem Solvers Can Outperform Groups of High-Ability Problem Solvers.&quot;</p>
                  <p className="font-sans text-[12px] text-navy-500 leading-[1.7] mt-1">Proceedings of the National Academy of Sciences, 101(46), 16385-16389.</p>
                  <p className="font-sans text-[12px] text-navy-400 leading-[1.7] mt-2">Proved mathematically that a randomly selected collection of diverse problem solvers outperforms a collection of the individually best problem solvers. The key condition is functional diversity, different approaches to the same problem. This is the direct theoretical justification for NEXUS&apos;s multi-layer architecture: four primary signal layers using fundamentally different data types and analytical methods constitute functionally diverse &quot;solvers&quot; applied to the same question (what is about to move markets?). The diversity theorem is domain-agnostic and does not require supervised learning to hold.</p>
                </div>
                <div className="border-l-2 border-navy-700/40 pl-4">
                  <p className="font-sans text-[13px] text-navy-300 leading-[1.8] font-medium">Wolpert, D.H. (1992). &quot;Stacked Generalization.&quot;</p>
                  <p className="font-sans text-[12px] text-navy-500 leading-[1.7] mt-1">Neural Networks, 5(2), 241-259.</p>
                  <p className="font-sans text-[12px] text-navy-400 leading-[1.7] mt-2">The foundational paper on stacking: combining multiple diverse learners produces results superior to any individual learner. Over 5,600 citations. While Wolpert describes ML model stacking, the underlying principle, that aggregation of uncorrelated estimates reduces error, is the same principle that makes multi-source intelligence fusion effective.</p>
                </div>
                <div className="border-l-2 border-navy-700/40 pl-4">
                  <p className="font-sans text-[13px] text-navy-300 leading-[1.8] font-medium">Breiman, L. (2001). &quot;Random Forests.&quot;</p>
                  <p className="font-sans text-[12px] text-navy-500 leading-[1.7] mt-1">Machine Learning, 45, 5-32.</p>
                  <p className="font-sans text-[12px] text-navy-400 leading-[1.7] mt-2">Demonstrated that ensemble performance depends on two conditions: diversity (low correlation between components) and individual competence (each component must outperform random chance). NEXUS&apos;s four primary signal layers satisfy both: geopolitical events, market microstructure, systemic risk, and OSINT are structurally uncorrelated, and each layer individually tracks documented phenomena with published academic support. Narrative overlays are excluded from the ensemble.</p>
                </div>
                <div className="border-l-2 border-navy-700/40 pl-4">
                  <p className="font-sans text-[13px] text-navy-300 leading-[1.8] font-medium">Arthur, W.B. (2021). Complexity Economics.</p>
                  <p className="font-sans text-[12px] text-navy-500 leading-[1.7] mt-1">Santa Fe Institute Press.</p>
                  <p className="font-sans text-[12px] text-navy-400 leading-[1.7] mt-2">Markets are not in equilibrium but are complex adaptive systems where agents constantly change their strategies in response to outcomes they mutually create. NEXUS&apos;s multi-layer monitoring reflects this view: emergent market behaviour arises from the interaction of multiple forces, not single-factor causation.</p>
                </div>
                <div className="border-l-2 border-navy-700/40 pl-4">
                  <p className="font-sans text-[13px] text-navy-300 leading-[1.8] font-medium">Lo, A.W. (2004). &quot;The Adaptive Markets Hypothesis.&quot;</p>
                  <p className="font-sans text-[12px] text-navy-500 leading-[1.7] mt-1">Journal of Portfolio Management.</p>
                  <p className="font-sans text-[12px] text-navy-400 leading-[1.7] mt-2">Reconciles efficient markets with behavioural finance using evolutionary principles. Market efficiency varies over time as participants adapt. The edge goes to whoever adapts fastest to new information configurations, precisely the purpose of NEXUS&apos;s real-time convergence detection.</p>
                </div>
                <div className="border-l-2 border-navy-700/40 pl-4">
                  <p className="font-sans text-[13px] text-navy-300 leading-[1.8] font-medium">Surowiecki, J. (2004). The Wisdom of Crowds.</p>
                  <p className="font-sans text-[12px] text-navy-500 leading-[1.7] mt-1">Doubleday.</p>
                  <p className="font-sans text-[12px] text-navy-400 leading-[1.7] mt-2">The three conditions for collective intelligence are diversity, independence, and decentralisation, building on Hong and Page&apos;s diversity theorem. Each of the four primary signal layers in NEXUS functions as an independent, diverse &quot;crowd member.&quot; The convergence of signals across uncorrelated primary layers satisfies all three conditions.</p>
                </div>
              </div>
            </ExpandableSection>

            <ExpandableSection title="Network Contagion and Cross-Domain Transmission">
              <div className="pt-4 space-y-5">
                <div className="border-l-2 border-navy-700/40 pl-4">
                  <p className="font-sans text-[13px] text-navy-300 leading-[1.8] font-medium">Elliott, M., Golub, B. and Jackson, M.O. (2014). &quot;Financial Networks and Contagion.&quot;</p>
                  <p className="font-sans text-[12px] text-navy-500 leading-[1.7] mt-1">American Economic Review, 104(10), 3115-3153.</p>
                  <p className="font-sans text-[12px] text-navy-400 leading-[1.7] mt-2">Diversification and integration have nonmonotonic effects on cascades: dense interconnections serve as both shock absorbers and shock propagators depending on shock magnitude. Explains why geopolitical shocks propagate to seemingly unrelated financial markets.</p>
                </div>
                <div className="border-l-2 border-navy-700/40 pl-4">
                  <p className="font-sans text-[13px] text-navy-300 leading-[1.8] font-medium">Acemoglu, D., Ozdaglar, A. and Tahbaz-Salehi, A. (2015). &quot;Systemic Risk and Stability in Financial Networks.&quot;</p>
                  <p className="font-sans text-[12px] text-navy-500 leading-[1.7] mt-1">American Economic Review, 105(2), 564-608.</p>
                  <p className="font-sans text-[12px] text-navy-400 leading-[1.7] mt-2">Financial contagion exhibits phase transitions: densely connected networks enhance stability for small shocks but become propagation mechanisms for large shocks. Cross-domain monitoring, as NEXUS implements, is necessary to detect these transmission events before they cascade.</p>
                </div>
              </div>
            </ExpandableSection>

            <ExpandableSection title="Superforecasting and Prediction Calibration">
              <div className="pt-4 space-y-5">
                <div className="border-l-2 border-navy-700/40 pl-4">
                  <p className="font-sans text-[13px] text-navy-300 leading-[1.8] font-medium">Tetlock, P. and Gardner, D. (2015). &quot;Superforecasting: The Art and Science of Prediction.&quot;</p>
                  <p className="font-sans text-[12px] text-navy-500 leading-[1.7] mt-1">Crown.</p>
                  <p className="font-sans text-[12px] text-navy-400 leading-[1.7] mt-2">The definitive work on calibrated probabilistic forecasting. Key techniques implemented in NEXUS: base rate anchoring (start from outside-view frequencies before adjusting), incremental belief updating (2-5% adjustments outperform large revisions), red team adversarial challenge (structured disagreement reduces overconfidence by 30-50%), and granular probability estimation. The Good Judgment Project data underpinning this work showed that these techniques are learnable and produce measurable calibration improvements.</p>
                </div>
                <div className="border-l-2 border-navy-700/40 pl-4">
                  <p className="font-sans text-[13px] text-navy-300 leading-[1.8] font-medium">Satopaa, V. et al. (2021). &quot;Bias, Information, Noise: A BIN Model of Forecasting.&quot;</p>
                  <p className="font-sans text-[12px] text-navy-500 leading-[1.7] mt-1">Management Science.</p>
                  <p className="font-sans text-[12px] text-navy-400 leading-[1.7] mt-2">Provides the mathematical decomposition framework for forecast error analysis. Brier score decomposes into Bias (systematic miscalibration), Information (covariance between confidence and outcomes), and Noise (random scatter). NEXUS implements the full BIN decomposition with per-category breakdowns and automated diagnostic recommendations.</p>
                </div>
                <div className="border-l-2 border-navy-700/40 pl-4">
                  <p className="font-sans text-[13px] text-navy-300 leading-[1.8] font-medium">Martin, C. (2026). &quot;Bayesian Networks for Geopolitical Forecasting.&quot;</p>
                  <p className="font-sans text-[12px] text-navy-500 leading-[1.7] mt-1">arXiv:2601.13362.</p>
                  <p className="font-sans text-[12px] text-navy-400 leading-[1.7] mt-2">Demonstrates that Bayesian networks with conditional dependencies between signal sources outperform naive additive models for geopolitical forecasting. Recommends conservative dependency discounting under uncertain correlation structures. NEXUS implements sequential Bayesian updating with a conditional dependency matrix directly based on this work.</p>
                </div>
                <div className="border-l-2 border-navy-700/40 pl-4">
                  <p className="font-sans text-[13px] text-navy-300 leading-[1.8] font-medium">Hoegh, A. et al. (2015). &quot;Bayesian Model Fusion for Civil Unrest Prediction.&quot;</p>
                  <p className="font-sans text-[12px] text-navy-500 leading-[1.7] mt-1">Technometrics.</p>
                  <p className="font-sans text-[12px] text-navy-400 leading-[1.7] mt-2">Introduces the &quot;selective superiority&quot; framework: each signal source dominates in certain scenario types but is subordinate in others. Layer reliability coefficients in NEXUS are informed by this framework, with geopolitical and OSINT layers weighted highest for conflict scenarios and market layers weighted highest for economic disruptions.</p>
                </div>
                <div className="border-l-2 border-navy-700/40 pl-4">
                  <p className="font-sans text-[13px] text-navy-300 leading-[1.8] font-medium">Tahir, M. (2025). &quot;Computational Geopolitics: Bayesian Game Theory for State Actor Modeling.&quot;</p>
                  <p className="font-sans text-[12px] text-navy-500 leading-[1.7] mt-1">Preprint.</p>
                  <p className="font-sans text-[12px] text-navy-400 leading-[1.7] mt-2">Models geopolitical actors as nodes in a dynamic graph with Bayesian type revision. Calendar events serve as signals that update actor-type probabilities rather than direct convergence inputs. NEXUS implements this approach with 7 actor profiles and 17 calendar behaviour modifiers across 4 calendar systems.</p>
                </div>
                <div className="border-l-2 border-navy-700/40 pl-4">
                  <p className="font-sans text-[13px] text-navy-300 leading-[1.8] font-medium">Mellers, B. et al. (2014). &quot;Psychological Strategies for Winning a Geopolitical Forecasting Tournament.&quot;</p>
                  <p className="font-sans text-[12px] text-navy-500 leading-[1.7] mt-1">Psychological Science, 25(5), 1106-1115.</p>
                  <p className="font-sans text-[12px] text-navy-400 leading-[1.7] mt-2">Extended GJP data showing that training in probabilistic reasoning, base rate usage, and frequent small updates produced forecasters who outperformed intelligence analysts with access to classified information. Validates the superforecasting methodology as effective for geopolitical prediction.</p>
                </div>
              </div>
            </ExpandableSection>

            <ExpandableSection title="Intelligence Fusion Methodology">
              <div className="pt-4 space-y-5">
                <div className="border-l-2 border-navy-700/40 pl-4">
                  <p className="font-sans text-[13px] text-navy-300 leading-[1.8] font-medium">RAND Corporation (2012). &quot;Military Intelligence Fusion for Complex Operations.&quot;</p>
                  <p className="font-sans text-[12px] text-navy-500 leading-[1.7] mt-1">RAND Occasional Paper OP-377.</p>
                  <p className="font-sans text-[12px] text-navy-400 leading-[1.7] mt-2">Military intelligence combines HUMINT, OSINT, SIGINT, imagery analysis, and sensor data into cross-referenced all-source analysis. The fusion product is superior to any single collection discipline. NEXUS applies the same all-source fusion methodology to financial markets.</p>
                </div>
              </div>
            </ExpandableSection>

          </div>

          <div className={`mt-10 max-w-3xl ${anim} ${academicReveal.visible ? shown : hidden}`} style={{ transitionDelay: "300ms" }}>
            <div className="border border-navy-800/30 rounded-lg p-5 bg-navy-900/20">
              <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-3">Summary</div>
              <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                Each of the four primary signal layers NEXUS runs has independent peer-reviewed validation. The convergence thesis, that combining diverse, uncorrelated inputs from independent domains reduces aggregate error and produces stronger predictions, is supported by Hong and Page&apos;s diversity theorem (PNAS 2004), foundational ensemble learning (Wolpert 1992, Breiman 2001), complexity economics (Arthur, Lo), network contagion theory (Elliott et al., Acemoglu et al.), and intelligence fusion methodology (RAND). The mathematical principle is domain-agnostic: it holds for ML classifiers, human forecasting teams, and heterogeneous signal streams alike. Narrative overlays (calendar, celestial) are not included in this claim.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          22. LIMITATIONS AND KNOWN CONSTRAINTS
      ══════════════════════════════════════════ */}
      <section id="limitations" className="relative px-6 py-20">
        <div ref={limitationsReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="21" label="Limitations and Known Constraints" visible={limitationsReveal.visible} />

          <div className={`mt-8 max-w-3xl space-y-6 ${anim} ${limitationsReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
              A methodology paper that only describes what works is marketing, and this is meant to be more than that. Every system has constraints, blind spots, and failure modes. Documenting them is how you build trust, and how you improve.
            </p>

            <div className="space-y-5">
              <div className="border border-navy-800/30 rounded-lg p-5 bg-navy-900/20">
                <div className="font-mono text-[9px] uppercase tracking-wider text-accent-amber mb-3">Celestial and Calendar — Narrative Context Layers</div>
                <p className="font-sans text-[12px] text-navy-400 leading-[1.8]">
                  The celestial and calendar layers are the most academically contentious components of NEXUS. They receive zero convergence weight and function as actor-belief context only. The evidence base is thin (see Appendix A for literature review and safeguards). If the feedback loop shows these layers are not adding predictive value, it will downweight them further. They sit at the bottom of the hierarchy and should never be the primary basis for any call.
                </p>
              </div>

              <div className="border border-navy-800/30 rounded-lg p-5 bg-navy-900/20">
                <div className="font-mono text-[9px] uppercase tracking-wider text-accent-amber mb-3">Bayesian Fusion Assumptions</div>
                <p className="font-sans text-[12px] text-navy-400 leading-[1.8]">
                  The Bayesian fusion engine replaced additive scoring with proper posterior updating via likelihood ratios and conditional dependency matrices. This is a significant improvement, but the dependency matrix values (independence factors between layer pairs) are currently set from domain reasoning rather than empirically calibrated from production data. As the resolved prediction dataset grows, these values should be updated to reflect observed conditional correlations. The exponential likelihood ratio model is a reasonable functional form but could be refined with production data showing the actual relationship between layer significance and posterior accuracy. The scenario priors (military escalation at 5%, market disruption at 12%, etc.) are defensible order-of-magnitude estimates but carry uncertainty that will narrow with more data.
                </p>
              </div>

              <div className="border border-navy-800/30 rounded-lg p-5 bg-navy-900/20">
                <div className="font-mono text-[9px] uppercase tracking-wider text-accent-amber mb-3">Prediction Track Record — Temporal Validity Constraint</div>
                <p className="font-sans text-[12px] text-navy-400 leading-[1.8]">
                  NEXUS publishes all predictions and their resolution outcomes. The dataset is growing and early-stage records carry wide confidence intervals. A Brier score over a few dozen predictions does not constitute statistically robust validation regardless of the headline accuracy figure.
                </p>
                <p className="font-sans text-[12px] text-navy-400 leading-[1.8] mt-3">
                  A more significant constraint applies to the initial prediction batch: predictions generated after a triggering event has already begun cannot be treated as prospective forecasts. They reflect the system reasoning about a developing situation after onset, not predicting it before the fact. Post-onset predictions test analytical coherence, not forecasting skill, and conflating the two inflates apparent track records. The only valid measure of genuine predictive capability is predictions generated in advance of the events they describe. Users evaluating platform performance should filter accordingly and the platform should make this distinction explicit in its reporting interface.
                </p>
                <p className="font-sans text-[12px] text-navy-400 leading-[1.8] mt-3">
                  Performance is tracked segmented by category, timeframe, and signal combination and published transparently for direct user evaluation. Resolved outcomes feed back through a damped correction loop, so calibration improves as the genuinely forward-looking dataset accumulates.
                </p>
              </div>

              <div className="border border-navy-800/30 rounded-lg p-5 bg-navy-900/20">
                <div className="font-mono text-[9px] uppercase tracking-wider text-accent-amber mb-3">Data Source Dependencies</div>
                <p className="font-sans text-[12px] text-navy-400 leading-[1.8]">
                  NEXUS aggregates data from 25+ external APIs and data feeds including Alpha Vantage, FRED, GDELT, ACLED, OpenSky Network, RSS news feeds, Reddit, Polymarket, Kalshi, and others. Each dependency introduces a potential point of failure, whether from API rate limits, data quality issues, or service outages. The system uses graceful degradation, returning empty results rather than failing on any single source outage, and the convergence engine naturally adapts when fewer layers are reporting. Still, the quality of the output is bounded by the quality of the inputs. NEXUS cannot detect signals in data it does not receive.
                </p>
              </div>

              <div className="border border-navy-800/30 rounded-lg p-5 bg-navy-900/20">
                <div className="font-mono text-[9px] uppercase tracking-wider text-accent-amber mb-3">AI Synthesis Limitations</div>
                <p className="font-sans text-[12px] text-navy-400 leading-[1.8]">
                  The AI synthesis layer uses Claude for analysis and prediction generation. Large language models can produce confident-sounding analysis that is wrong, and they carry biases from their training data. NEXUS mitigates this by constraining Claude&apos;s analysis to structured data inputs, requiring explicit confidence levels on all predictions, and tracking every prediction against outcomes. The system also filters meta-system contamination, where the AI generates predictions about its own functioning rather than the markets. These are engineering mitigations for a fundamental constraint: the AI is a tool, and its outputs require the same critical evaluation as any other analytical source.
                </p>
              </div>

              <div className="border border-navy-800/30 rounded-lg p-5 bg-navy-900/20">
                <div className="font-mono text-[9px] uppercase tracking-wider text-accent-amber mb-3">Multiple Comparisons in Actor-Belief Modifiers</div>
                <p className="font-sans text-[12px] text-navy-400 leading-[1.8]">
                  The actor-belief system tracks 7 actors across 17 calendar behaviour modifiers spanning 4 calendar systems. When testing this many actor-calendar combinations (effectively 119 possible pairings), some will appear predictive by chance alone. At a conventional 5% significance level, roughly 6 of these pairings would show spurious correlations even with no genuine underlying effect.
                </p>
                <p className="font-sans text-[12px] text-navy-400 leading-[1.8] mt-3">
                  NEXUS addresses this through two mechanisms. First, confidence-damped multipliers mean that low-sample-size modifiers (confidence below 0.5) produce near-trivial probability shifts, so chance correlations have minimal operational impact even if they persist in the data. Second, the feedback loop tracks per-modifier prediction accuracy over time. Modifiers that do not demonstrate sustained predictive contribution across multiple cycles will see their confidence ratings decay toward zero, effectively auto-pruning false positives.
                </p>
                <p className="font-sans text-[12px] text-navy-400 leading-[1.8] mt-3">
                  What is not yet implemented is formal Bonferroni or false discovery rate correction across the modifier set. As the resolved prediction dataset grows, applying Benjamini-Hochberg FDR control to modifier-level performance would provide a rigorous statistical filter. This is a planned improvement. Until then, the confidence-damping mechanism provides practical protection against the most extreme cases of chance correlation, and no single calendar modifier can shift a prediction by more than a few percentage points regardless of its apparent track record.
                </p>
              </div>

              <div className="border border-navy-800/30 rounded-lg p-5 bg-navy-900/20">
                <div className="font-mono text-[9px] uppercase tracking-wider text-accent-amber mb-3">Parameter Tuning and Look-Ahead Bias</div>
                <p className="font-sans text-[12px] text-navy-400 leading-[1.8]">
                  Several system parameters were set from domain reasoning and calibration against known historical episodes: convergence window duration (3 days), intensity-to-posterior thresholds, likelihood ratio exponential constants, scenario base-rate priors, and calibration bucket boundaries. These values were chosen to produce sensible outputs on historical data that was already known at design time.
                </p>
                <p className="font-sans text-[12px] text-navy-400 leading-[1.8] mt-3">
                  This introduces a degree of look-ahead bias: parameters tuned on known history will perform better on that history than on genuinely unseen future data. NEXUS does not claim that its current parameter set is optimal for all future market regimes. The parameters represent informed starting points, not empirically validated optima.
                </p>
                <p className="font-sans text-[12px] text-navy-400 leading-[1.8] mt-3">
                  The primary safeguard is the Brier-scored prediction loop. Every prediction is scored against real outcomes in real time, and the feedback system detects when specific parameter configurations produce systematic errors. Convergence thresholds, base-rate priors, and layer reliability coefficients are all candidates for data-driven recalibration as the forward-looking prediction dataset matures. The system is designed to converge toward better parameters through lived experience rather than claiming its initial configuration is final.
                </p>
              </div>
            </div>

            <div className={`mt-6 ${anim} ${limitationsReveal.visible ? shown : hidden}`} style={{ transitionDelay: "300ms" }}>
              <div className="border border-navy-800/30 rounded-lg p-5 bg-navy-900/20">
                <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-3">Design Philosophy</div>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  These constraints are documented because NEXUS is built on a simple principle: transparency about what the system can and cannot do is more valuable than claiming perfection. Every analytical tool has failure modes. The question is whether the system surfaces them honestly and improves over time. The prediction tracker, the feedback loop, and this section exist to ensure that it does.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          23. LIVE RESULTS AND PREDICTION RECORD
      ══════════════════════════════════════════ */}
      <section id="live-results" className="relative px-6 py-20">
        <LiveResultsSection liveResultsReveal={liveResultsReveal} />
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          24: HISTORICAL PATTERN MATCHING
      ══════════════════════════════════════════ */}
      <section id="parallels" className="relative px-6 py-20">
        <div ref={parallelsReveal.ref} className={`max-w-5xl mx-auto ${anim} ${parallelsReveal.visible ? shown : hidden}`}>
          <SectionHead number="23" label="Historical Pattern Matching" visible={parallelsReveal.visible} />
          <div className="mt-8 space-y-4">
            <p className="font-sans text-[13px] text-navy-300 leading-[1.8]">
              The Psycho-History Parallels engine searches the knowledge bank, resolved prediction history, and signal archive for structurally similar past events. Given a natural-language description of a current scenario (e.g. &quot;Iran-Israel escalation with Hormuz closure risk&quot;), it performs semantic vector search across all stored intelligence, then uses Claude to identify the strongest structural parallels from history.
            </p>
            <p className="font-sans text-[13px] text-navy-300 leading-[1.8]">
              Each parallel is scored on structural similarity (0-1), considering actor constellation overlap, escalation dynamics, economic preconditions, and temporal context. The engine returns the historical outcome, time-to-resolution, documented market impact, key similarities, and key differences. A composite probability of pattern repetition is synthesized from the weighted average of parallel outcomes, adjusted for identified structural differences.
            </p>
            <p className="font-sans text-[13px] text-navy-300 leading-[1.8]">
              This is explicitly not a claim of historical determinism. The engine surfaces patterns for human evaluation, with prominent caveats about structural differences that could invalidate the parallel. The value is in forcing systematic comparison rather than relying on the analyst&apos;s recall of loosely similar events.
            </p>
            <ExpandableSection title="Technical Implementation">
              <p className="font-sans text-[13px] text-navy-300 leading-[1.8]">
                The engine uses high-dimensional embeddings for semantic search across the knowledge bank. Query text is matched against stored document embeddings via cosine similarity. Resolved predictions and signal history are retrieved as additional context. All data is passed through an AI synthesis pipeline that outputs structured parallel objects, composite probability, and regime classification.
              </p>
            </ExpandableSection>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          25: ACTOR-BELIEF PROFILE SYSTEM
      ══════════════════════════════════════════ */}
      <section id="actor-profiles" className="relative px-6 py-20">
        <div ref={actorProfilesReveal.ref} className={`max-w-5xl mx-auto ${anim} ${actorProfilesReveal.visible ? shown : hidden}`}>
          <SectionHead number="24" label="Actor-Belief Profile System" visible={actorProfilesReveal.visible} />
          <div className="mt-8 space-y-4">
            <p className="font-sans text-[13px] text-navy-300 leading-[1.8]">
              Extended actor profiles encode behavioral type distributions (cooperative/hawkish/unpredictable), base weekly action probabilities, calendar-conditioned Bayesian modifiers, public statements, scripture/doctrinal references, past decisions, belief frameworks, and decision patterns. Currently 7 actors are tracked: Israeli Far-Right Coalition, Iran IRGC, China PLA, Russia Kremlin, DPRK, Saudi Arabia (MBS), and Turkey (Erdogan).
            </p>
            <p className="font-sans text-[13px] text-navy-300 leading-[1.8]">
              The Bayesian typing system (Tahir 2025) models calendar events as signals that update actor-type probabilities rather than as direct convergence bonuses. Each modifier carries a posterior multiplier, historical basis, sample size, and confidence rating. Effective multipliers are damped by confidence: <code className="text-accent-cyan/80">effective = 1 + (posterior - 1) * confidence</code>. Multiple modifiers compose multiplicatively, with a hard cap at 0.95 probability.
            </p>
            <p className="font-sans text-[13px] text-navy-300 leading-[1.8]">
              Scripture and doctrinal references are tracked not because they predict events, but because they inform how specific actors interpret and frame their own actions. When Ben Gvir references the Book of Esther before Purim, the reference itself is a data point about his likely behavioral mode, not a mystical prediction.
            </p>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          26: NARRATIVE REPORT GENERATION
      ══════════════════════════════════════════ */}
      <section id="narrative-reports" className="relative px-6 py-20">
        <div ref={narrativeReportsReveal.ref} className={`max-w-5xl mx-auto ${anim} ${narrativeReportsReveal.visible ? shown : hidden}`}>
          <SectionHead number="25" label="Narrative Report Generation" visible={narrativeReportsReveal.visible} />
          <div className="mt-8 space-y-4">
            <p className="font-sans text-[13px] text-navy-300 leading-[1.8]">
              The narrative report generator synthesizes all active data layers (signals, predictions, thesis, knowledge bank, game theory) into a single coherent long-form intelligence briefing. Output is structured as a 10-15 minute lecture script with titled sections, specific data references, risk matrix, and key takeaways.
            </p>
            <p className="font-sans text-[13px] text-navy-300 leading-[1.8]">
              Reports begin with regime assessment (peacetime/wartime/transition), proceed through primary signal analysis, historical parallels (when available), game theory assessment, and forward outlook with probabilistic scenarios. The risk matrix scores each scenario on probability (0-1) and impact (low/medium/high/critical) with a specific timeframe.
            </p>
            <p className="font-sans text-[13px] text-navy-300 leading-[1.8]">
              A &quot;Narrative Synthesis Mode&quot; toggle is available in settings. When active, it disables convergence scoring entirely and focuses the analytical framework on actor psychology, belief-driven scenario modeling, and narrative thread analysis. This mode is useful for exploring &quot;what do actors believe will happen&quot; rather than &quot;what do the numbers say,&quot; reflecting that in geopolitics, actor beliefs can be more predictive than quantitative models.
            </p>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          APPENDIX A: CALENDAR / CELESTIAL LITERATURE
      ══════════════════════════════════════════ */}
      <section id="appendix-a" className="px-6 py-20 bg-navy-950/40">
        <div className="max-w-5xl mx-auto">
          <div className="mb-10">
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-navy-600 mb-2">Appendix A</div>
            <h2 className="font-sans text-xl font-light text-navy-200">Calendar and Celestial Context Layers</h2>
            <div className="mt-4 border border-accent-amber/20 rounded p-4 bg-accent-amber/[0.03] max-w-3xl">
              <div className="font-mono text-[9px] uppercase tracking-wider text-accent-amber mb-2">Classification</div>
              <p className="font-sans text-[12px] text-navy-500 leading-[1.8]">
                These layers receive zero convergence weight and do not affect the 1-5 convergence score. They exist as narrative context only.
              </p>
            </div>
          </div>

          <div className="space-y-5 max-w-3xl">
            <div className="border border-navy-800/30 rounded-lg p-5 bg-navy-900/20">
              <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-3">Rationale</div>
              <p className="font-sans text-[12px] text-navy-400 leading-[1.8]">
                A small body of peer-reviewed literature documents statistically significant calendar-market correlations: lunar cycle effects on returns (Dichev &amp; Janes 2003, replicated across 48 countries by Yuan et al. 2006, contested by Kamstra et al. 2003), geomagnetic storm correlations (Krivelyova &amp; Robotti 2003, Fed working paper), and religious calendar effects (Bialkowski et al. 2012 on Ramadan, Frieder &amp; Subrahmanyam 2004 on Jewish holidays). Effect sizes are small, replication is inconsistent, and no consensus mechanism exists. These layers exist in NEXUS not because the academic case is strong, but because specific actors in positions of power assign meaning to these calendars and may time decisions around them. That is actor-belief modelling, not market prediction.
              </p>
            </div>

            <div className="border border-navy-800/30 rounded-lg p-5 bg-navy-900/20">
              <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-3">Safeguards</div>
              <p className="font-sans text-[12px] text-navy-400 leading-[1.8]">
                With 7 actor profiles and 17 calendar modifiers across 4 calendar systems, the multiple comparisons problem is real. NEXUS mitigates this through confidence-damped Bayesian updates (low-confidence modifiers produce near-trivial probability shifts) and per-modifier accuracy tracking that decays non-predictive modifiers toward irrelevance. Formal Benjamini-Hochberg FDR control is planned as sample size grows. No single calendar modifier can shift a prediction by more than a few percentage points regardless of its apparent track record.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          CTA
      ══════════════════════════════════════════ */}
      <section className="relative px-6 py-28 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] bg-accent-cyan/[0.03] rounded-full blur-[100px] pointer-events-none" />

        <div ref={ctaReveal.ref} className="relative max-w-5xl mx-auto">
          <div className={`text-center ${anim} ${ctaReveal.visible ? shown : hidden}`}>
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="h-px w-12 bg-navy-700/50" />
              <FileText className="w-4 h-4 text-accent-cyan/40" />
              <div className="h-px w-12 bg-navy-700/50" />
            </div>

            <h2 className="font-sans text-2xl md:text-3xl font-light text-navy-100 mb-4 leading-tight">
              See the system in action.
            </h2>

            <p className="font-sans text-[15px] text-navy-400 mb-10 max-w-lg mx-auto leading-relaxed">
              Every methodology described in this paper is running in production.
              Start a free trial and interact with the full platform, every signal layer,
              every analytical tool, every prediction tracker.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-5">
              <Link
                href="/register"
                className="group inline-flex items-center gap-2.5 px-8 py-3 font-mono text-[11px] uppercase tracking-widest text-navy-950 bg-accent-cyan hover:bg-accent-cyan/90 rounded-lg transition-all font-medium"
              >
                Start Free Trial
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/research/methodology"
                className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-navy-500 hover:text-navy-300 transition-colors"
              >
                Methodology Overview
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
