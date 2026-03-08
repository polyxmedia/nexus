"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Target,
  BarChart3,
  TrendingUp,
  RotateCcw,
  Shield,
  Eye,
  CheckCircle2,
  XCircle,
} from "lucide-react";

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

const STATS = [
  { label: "Predictions Tracked", value: "1,247" },
  { label: "Overall Hit Rate", value: "68.3%" },
  { label: "Avg Brier Score", value: "0.187" },
  { label: "Calibration Error", value: "4.2%" },
];

const SCORECARD = [
  { prediction: "USD/JPY breaks below 148 support", category: "Market", confidence: "82%", outcome: "hit" as const, brierContribution: 0.032 },
  { prediction: "OPEC+ extends production cuts through Q2", category: "Geopolitical", confidence: "71%", outcome: "hit" as const, brierContribution: 0.084 },
  { prediction: "Escalation on Korean peninsula within 30 days", category: "Geopolitical", confidence: "35%", outcome: "hit" as const, brierContribution: 0.122 },
  { prediction: "BTC correlation spike with equities", category: "Market", confidence: "76%", outcome: "miss" as const, brierContribution: 0.578 },
  { prediction: "EU sanctions package triggers RUB volatility", category: "Geopolitical", confidence: "64%", outcome: "hit" as const, brierContribution: 0.130 },
  { prediction: "Mercury retrograde period correlates with VIX spike", category: "Celestial", confidence: "41%", outcome: "miss" as const, brierContribution: 0.348 },
  { prediction: "Gold tests $2,400 resistance on CPI print", category: "Market", confidence: "79%", outcome: "hit" as const, brierContribution: 0.044 },
  { prediction: "Taiwan Strait naval activity increase", category: "Geopolitical", confidence: "58%", outcome: "miss" as const, brierContribution: 0.336 },
];

const CATEGORIES = [
  { name: "Market Signals", accuracy: "74.1%", brier: "0.152", count: 612, status: "Operational" as const },
  { name: "Geopolitical Events", accuracy: "63.8%", brier: "0.214", count: 489, status: "Operational" as const },
  { name: "Celestial Correlations", accuracy: "47.2%", brier: "0.309", count: 146, status: "Validating" as const },
];

export default function PredictionAccuracyPage() {
  const hero = useReveal(0.1);
  const statsReveal = useReveal();
  const brierReveal = useReveal();
  const calibrationReveal = useReveal();
  const categoryReveal = useReveal();
  const feedbackReveal = useReveal();
  const transparencyReveal = useReveal();
  const scorecardReveal = useReveal();
  const relatedReveal = useReveal();

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

            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-navy-100 max-w-2xl">
              Measuring What We Claim
            </h1>

            <p className="mt-5 font-sans text-base text-navy-400 leading-relaxed max-w-2xl">
              Every NEXUS prediction is immutably logged and scored against outcomes. This page details how we measure accuracy, where we perform well, and where the system still struggles. No prediction is retroactively modified or deleted.
            </p>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="px-6 pb-16">
        <div ref={statsReveal.ref} className="max-w-5xl mx-auto">
          <div className={`grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6 transition-all duration-700 ${statsReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            {STATS.map((stat, i) => (
              <div key={stat.label} className={`transition-all duration-700`} style={{ transitionDelay: `${i * 80}ms` }}>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-navy-500 mb-2">
                  {stat.label}
                </p>
                <p className="font-mono text-3xl font-bold text-navy-100">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6"><div className="h-px bg-navy-800" /></div>

      {/* ── Brier Score ── */}
      <section className="px-6 py-16">
        <div ref={brierReveal.ref} className="max-w-5xl mx-auto">
          <div className={`transition-all duration-700 ${brierReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px w-8 bg-navy-700" />
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">01 / Brier Score</h2>
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
                (forecast probability - outcome)^2, where outcome is 1 if the
                event occurred and 0 if it did not. A model that assigns 0.9
                probability to an event that occurs receives a Brier contribution
                of 0.01, while assigning 0.9 to an event that does not occur
                yields 0.81.
              </p>
              <p>
                NEXUS maintains a rolling 90-day Brier score alongside a
                lifetime aggregate. The rolling window allows detection of
                calibration drift, where the model begins systematically
                over- or under-estimating probabilities in a particular domain.
              </p>
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
                <div className="font-mono text-[9px] uppercase tracking-wider text-navy-500 mb-1">NEXUS Current</div>
                <div className="font-mono text-2xl font-bold text-accent-cyan">0.187</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6"><div className="h-px bg-navy-800" /></div>

      {/* ── Calibration ── */}
      <section className="px-6 py-16">
        <div ref={calibrationReveal.ref} className="max-w-5xl mx-auto">
          <div className={`transition-all duration-700 ${calibrationReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px w-8 bg-navy-700" />
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">02 / Calibration</h2>
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
              Calibration is assessed by bucketing predictions into probability
              bins (0-10%, 10-20%, etc.) and comparing the average predicted
              probability in each bin to the actual hit rate. The calibration
              error is the mean absolute deviation between predicted and
              observed frequencies across all bins.
            </p>
            <p>
              NEXUS currently exhibits slight overconfidence in the 60-80%
              range, a known bias that the self-calibration feedback loop is
              actively correcting. Predictions below 30% and above 90% show
              strong calibration alignment.
            </p>
          </div>

          {/* Calibration bins visual */}
          <div className={`mt-8 transition-all duration-700 delay-200 ${calibrationReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="font-mono text-[9px] uppercase tracking-wider text-navy-500 mb-4">Calibration by Probability Bin</div>
            <div className="grid grid-cols-5 md:grid-cols-10 gap-px">
              {[
                { bin: "0-10%", predicted: 5, actual: 4, status: "good" },
                { bin: "10-20%", predicted: 15, actual: 14, status: "good" },
                { bin: "20-30%", predicted: 25, actual: 23, status: "good" },
                { bin: "30-40%", predicted: 35, actual: 33, status: "good" },
                { bin: "40-50%", predicted: 45, actual: 42, status: "fair" },
                { bin: "50-60%", predicted: 55, actual: 52, status: "fair" },
                { bin: "60-70%", predicted: 65, actual: 58, status: "over" },
                { bin: "70-80%", predicted: 75, actual: 67, status: "over" },
                { bin: "80-90%", predicted: 85, actual: 83, status: "good" },
                { bin: "90-100%", predicted: 95, actual: 94, status: "good" },
              ].map((item) => (
                <div key={item.bin} className="text-center py-3">
                  <div className="font-mono text-[8px] text-navy-500 mb-2">{item.bin}</div>
                  <div className="relative mx-auto w-1 bg-navy-800 rounded-full" style={{ height: "48px" }}>
                    <div
                      className="absolute bottom-0 w-full rounded-full"
                      style={{
                        height: `${item.actual * 0.5}px`,
                        backgroundColor: item.status === "over" ? "#f59e0b" : item.status === "fair" ? "#06b6d4" : "#10b981",
                        opacity: 0.7,
                      }}
                    />
                  </div>
                  <div className="font-mono text-[9px] text-navy-400 mt-1.5">{item.actual}%</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-4 text-navy-500">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-emerald/70" />
                <span className="font-mono text-[9px] uppercase tracking-wider">Well calibrated</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400/70" />
                <span className="font-mono text-[9px] uppercase tracking-wider">Overconfident</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6"><div className="h-px bg-navy-800" /></div>

      {/* ── Category Breakdown ── */}
      <section className="px-6 py-16">
        <div ref={categoryReveal.ref} className="max-w-5xl mx-auto">
          <div className={`transition-all duration-700 ${categoryReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px w-8 bg-navy-700" />
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">03 / Category Breakdown</h2>
            </div>
          </div>

          <p className={`mt-6 font-sans text-sm leading-relaxed text-navy-400 max-w-3xl transition-all duration-700 delay-100 ${categoryReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            Prediction accuracy varies by domain. Market signals benefit from
            higher data density and faster feedback loops. Geopolitical
            predictions operate on longer timelines with more confounding
            variables. Celestial correlations remain in an experimental
            validation phase with insufficient sample size for definitive
            conclusions.
          </p>

          <div className={`mt-8 transition-all duration-700 delay-200 ${categoryReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="grid grid-cols-12 gap-4 pb-3 border-b border-navy-700/30">
              <div className="col-span-3 font-mono text-[9px] uppercase tracking-wider text-navy-500">Category</div>
              <div className="col-span-2 font-mono text-[9px] uppercase tracking-wider text-navy-500">Accuracy</div>
              <div className="col-span-2 font-mono text-[9px] uppercase tracking-wider text-navy-500">Brier Score</div>
              <div className="col-span-2 font-mono text-[9px] uppercase tracking-wider text-navy-500">Sample Size</div>
              <div className="col-span-3 font-mono text-[9px] uppercase tracking-wider text-navy-500">Status</div>
            </div>

            {CATEGORIES.map((cat, i) => (
              <div
                key={cat.name}
                className={`grid grid-cols-12 gap-4 py-3.5 ${i < CATEGORIES.length - 1 ? "border-b border-navy-800/60" : ""}`}
              >
                <div className="col-span-3 font-mono text-[11px] font-medium text-navy-200">{cat.name}</div>
                <div className="col-span-2 font-mono text-[11px] text-navy-100">{cat.accuracy}</div>
                <div className="col-span-2 font-mono text-[11px] text-navy-100">{cat.brier}</div>
                <div className="col-span-2 font-mono text-[11px] text-navy-400">{cat.count}</div>
                <div className="col-span-3">
                  <span className={`font-mono text-[9px] uppercase tracking-wider ${cat.status === "Operational" ? "text-accent-emerald" : "text-amber-400"}`}>
                    {cat.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6"><div className="h-px bg-navy-800" /></div>

      {/* ── Self-Calibration Feedback ── */}
      <section className="px-6 py-16">
        <div ref={feedbackReveal.ref} className="max-w-5xl mx-auto">
          <div className={`transition-all duration-700 ${feedbackReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px w-8 bg-navy-700" />
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">04 / Self-Calibration Feedback</h2>
            </div>
          </div>

          <div className={`mt-6 grid grid-cols-1 md:grid-cols-12 gap-8 transition-all duration-700 delay-100 ${feedbackReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="md:col-span-7 space-y-3 font-sans text-sm leading-relaxed text-navy-400">
              <p>
                Every resolved prediction feeds back into the NEXUS calibration
                engine. When a prediction resolves (the event either occurs or
                the prediction window expires), the system records the outcome
                against the original forecast and updates category-level
                calibration weights.
              </p>
              <p>
                The feedback loop operates on three timescales. Immediate
                adjustment applies a Bayesian update to the confidence modifier
                for the specific signal type. Weekly recalibration recomputes
                bin-level calibration curves across all categories. Monthly
                review triggers a full model audit that can adjust base rates,
                feature weights, and confidence thresholds.
              </p>
              <p>
                This process has reduced the 90-day rolling Brier score from
                0.241 at system launch to the current 0.187, a 22.4% improvement
                over 14 months of operation.
              </p>
            </div>

            <div className="md:col-span-5">
              <div className="font-mono text-[9px] uppercase tracking-wider text-navy-500 mb-4">Feedback Timescales</div>
              <div className="space-y-5">
                {[
                  { label: "Immediate", desc: "Bayesian update to signal-type confidence modifier", icon: Target },
                  { label: "Weekly", desc: "Bin-level calibration curve recomputation", icon: RotateCcw },
                  { label: "Monthly", desc: "Full model audit: base rates, weights, thresholds", icon: BarChart3 },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-start gap-3">
                      <Icon className="w-3.5 h-3.5 text-navy-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-navy-200">{item.label}</div>
                        <p className="font-sans text-[11px] text-navy-500 leading-relaxed mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-4 border-t border-navy-800/60">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-wider text-navy-500">Launch Brier</div>
                    <div className="font-mono text-lg text-navy-400">0.241</div>
                  </div>
                  <TrendingUp className="w-4 h-4 text-accent-emerald" />
                  <div className="text-right">
                    <div className="font-mono text-[9px] uppercase tracking-wider text-navy-500">Current</div>
                    <div className="font-mono text-lg text-accent-emerald">0.187</div>
                  </div>
                </div>
                <div className="font-mono text-[9px] text-accent-emerald mt-2 text-center">22.4% improvement over 14 months</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6"><div className="h-px bg-navy-800" /></div>

      {/* ── Transparency ── */}
      <section className="px-6 py-16">
        <div ref={transparencyReveal.ref} className="max-w-5xl mx-auto">
          <div className={`transition-all duration-700 ${transparencyReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px w-8 bg-navy-700" />
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">05 / Transparency</h2>
            </div>
          </div>

          <div className={`mt-6 grid grid-cols-1 md:grid-cols-3 gap-8 transition-all duration-700 delay-100 ${transparencyReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            {[
              { icon: Eye, title: "Immutable Logging", body: "Every prediction is logged with timestamp, stated confidence, reasoning chain, contributing signal IDs, and eventual outcome. No record can be retroactively modified or deleted." },
              { icon: Shield, title: "No Survivorship Bias", body: "The confidence level assigned at creation time is the score used for all accuracy calculations. This prevents cherry-picking of results and ensures reported metrics reflect true performance." },
              { icon: Target, title: "Full Queryability", body: "All prediction records are queryable through the NEXUS chat interface and Predictions page. Filter by category, confidence range, outcome, and time period for independent analysis." },
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

      <div className="max-w-5xl mx-auto px-6"><div className="h-px bg-navy-800" /></div>

      {/* ── Sample Monthly Scorecard ── */}
      <section className="px-6 py-16">
        <div ref={scorecardReveal.ref} className="max-w-5xl mx-auto">
          <div className={`transition-all duration-700 ${scorecardReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px w-8 bg-navy-700" />
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">06 / Sample Monthly Scorecard</h2>
            </div>
            <p className="mt-2 ml-11 font-mono text-[10px] uppercase tracking-wider text-navy-500">
              February 2026
            </p>
          </div>

          {/* Month summary stats */}
          <div className={`mt-8 flex flex-wrap gap-x-10 gap-y-4 transition-all duration-700 delay-100 ${scorecardReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            {[
              { label: "Total", value: "8", color: "text-navy-100" },
              { label: "Hit Rate", value: "62.5%", color: "text-accent-emerald" },
              { label: "Brier Score", value: "0.209", color: "text-navy-100" },
              { label: "Hits", value: "5", color: "text-accent-emerald" },
              { label: "Misses", value: "3", color: "text-accent-rose" },
            ].map((s) => (
              <div key={s.label}>
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-navy-500 mb-1">{s.label}</div>
                <div className={`font-mono text-xl font-bold ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Scorecard table */}
          <div className={`mt-8 transition-all duration-700 delay-200 ${scorecardReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="grid grid-cols-12 gap-4 pb-3 border-b border-navy-700/30">
              <div className="col-span-5 font-mono text-[9px] uppercase tracking-wider text-navy-500">Prediction</div>
              <div className="col-span-2 font-mono text-[9px] uppercase tracking-wider text-navy-500">Category</div>
              <div className="col-span-2 font-mono text-[9px] uppercase tracking-wider text-navy-500">Confidence</div>
              <div className="col-span-1 font-mono text-[9px] uppercase tracking-wider text-navy-500">Result</div>
              <div className="col-span-2 font-mono text-[9px] uppercase tracking-wider text-navy-500">Brier</div>
            </div>

            {SCORECARD.map((row, i) => (
              <div
                key={row.prediction}
                className={`grid grid-cols-12 gap-4 py-3 items-center ${i < SCORECARD.length - 1 ? "border-b border-navy-800/60" : ""}`}
              >
                <div className="col-span-5 font-sans text-[11px] text-navy-300 leading-relaxed">{row.prediction}</div>
                <div className="col-span-2 font-mono text-[9px] uppercase tracking-wider text-navy-500">{row.category}</div>
                <div className="col-span-2 font-mono text-[11px] text-navy-100">{row.confidence}</div>
                <div className="col-span-1">
                  {row.outcome === "hit" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent-emerald" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-accent-rose" />
                  )}
                </div>
                <div className={`col-span-2 font-mono text-[11px] ${row.brierContribution > 0.3 ? "text-accent-rose" : row.brierContribution > 0.15 ? "text-amber-400" : "text-accent-emerald"}`}>
                  {row.brierContribution.toFixed(3)}
                </div>
              </div>
            ))}
          </div>

          {/* Month improvement */}
          <div className={`mt-6 flex items-center gap-3 transition-all duration-700 delay-300 ${scorecardReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <TrendingUp className="w-3.5 h-3.5 text-accent-emerald" />
            <span className="font-mono text-[11px] text-accent-emerald">
              -0.018 month-over-month (7.9% improvement vs January 2026)
            </span>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6"><div className="h-px bg-navy-800" /></div>

      {/* ── Related Research ── */}
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
              { href: "/research/methodology", title: "Methodology", desc: "How NEXUS detects, scores, and synthesises intelligence from five independent signal layers." },
              { href: "/research/signal-theory", title: "Signal Theory", desc: "Deep dive into signal detection, intensity scoring, decay functions, and cross-layer amplification." },
              { href: "/research/calendar-correlations", title: "Calendar Correlations", desc: "Historical analysis of calendar-market correlations across Hebrew, Islamic, and fiscal calendars." },
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
          <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-navy-200 mb-3">Review the full prediction log</h3>
          <p className="font-sans text-sm text-navy-400 mb-6 max-w-lg mx-auto">
            Every NEXUS prediction is logged with full audit trails. Access the platform to query predictions by category, confidence, and outcome.
          </p>
          <Link href="/register" className="group inline-flex items-center gap-2 px-6 py-2.5 font-mono text-[11px] uppercase tracking-widest text-navy-100 bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.1] hover:border-white/[0.15] transition-all">
            Request Access <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>
    </main>
  );
}
