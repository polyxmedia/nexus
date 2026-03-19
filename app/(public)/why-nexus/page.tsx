"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Activity,
  Brain,
  Target,
  Shield,
  Ship,
  Crosshair,
  Zap,
  Check,
  Loader2,
} from "lucide-react";
import { useReveal, anim, hidden, shown, Ruled, SectionHead } from "@/components/public/reveal";
import { CompetitorComparison } from "@/components/public/competitor-comparison";

// ── Live Stats ──

interface LiveStats {
  totalPredictions: number;
  resolvedPredictions: number;
  hitRate: number;
  brierScore: number;
  signalsProcessed: number;
  avgConfidence: number;
}

// ── Capabilities ──

const capabilities = [
  {
    icon: Activity,
    title: "Multi-Layer Signal Detection",
    body: "Four primary signal layers run continuously. Geopolitical escalation, market microstructure, open-source intelligence, and systemic risk. When multiple layers converge, the system flags it before the headline drops.",
    color: "#f59e0b",
  },
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    body: "Claude synthesises converged signals into structured theses. Every conclusion traces back to the data that triggered it. No black boxes, no vibes. Grounded intelligence with citation trails.",
    color: "#06b6d4",
  },
  {
    icon: Target,
    title: "Prediction Engine",
    body: "Every thesis generates falsifiable predictions with defined timeframes and probabilities. Auto-resolution against market data. Brier scoring for calibration feedback. The system learns from every call it makes.",
    color: "#8b5cf6",
  },
  {
    icon: Crosshair,
    title: "Trade Lab",
    body: "Scenario-weighted position simulator enriched with live intelligence. Monte Carlo distributions, gamma exposure, regime detection, and systemic risk overlays. Kelly sizing and ATR-based position recommendations.",
    color: "#10b981",
  },
  {
    icon: Ship,
    title: "Shipping Intelligence",
    body: "Five chokepoint monitors tracking transit volumes, anomalies, and dark fleet activity. Freight market proxies, vessel watchlists, and maritime OSINT. The kind of visibility that used to require a dedicated analyst team.",
    color: "#f97316",
  },
  {
    icon: Shield,
    title: "Game Theory Engine",
    body: "Formal scenario modelling with payoff matrices, Nash equilibria, and escalation trajectories. Wartime threshold detection that automatically invalidates outdated predictions when the regime shifts.",
    color: "#f43f5e",
  },
];

// ── Tiers ──

const tiers = [
  {
    name: "Analyst",
    price: "$199",
    description: "Core intelligence and prediction tracking for serious individual analysts.",
    highlights: [
      "Signal detection across all layers",
      "AI chat analyst with full tool access",
      "Prediction tracking with Brier scoring",
      "News aggregation and OSINT feeds",
      "Knowledge bank",
    ],
  },
  {
    name: "Operator",
    price: "$599",
    description: "Full platform access. Monte Carlo, Trade Lab, shipping intelligence, and game theory.",
    highlights: [
      "Everything in Analyst",
      "Monte Carlo simulation engine",
      "Trade Lab with intelligence enrichment",
      "Shipping and dark fleet monitoring",
      "Game theory scenario modelling",
      "AI progression tracking",
    ],
    featured: true,
  },
  {
    name: "Institution",
    price: "$999",
    description: "Priority compute, extended limits, and institutional-grade features.",
    highlights: [
      "Everything in Operator",
      "Priority AI processing",
      "Extended prediction volume",
      "Advanced backtesting",
      "Custom alert configurations",
      "Dedicated support",
    ],
  },
];

// ════════════════════════════════════════════════
// ── PAGE ──
// ════════════════════════════════════════════════

export default function WhyNexusPage() {
  const heroReveal = useReveal(0.05);
  const problemReveal = useReveal();
  const capReveal = useReveal(0.08);
  const compReveal = useReveal(0.05);
  const proofReveal = useReveal();
  const pricingReveal = useReveal();
  const ctaReveal = useReveal(0.2);

  const [activeCapabilityIndex, setActiveCapabilityIndex] = useState(-1);
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const [predRes, feedbackRes] = await Promise.all([
        fetch("/api/predictions"),
        fetch("/api/predictions/feedback"),
      ]);
      const predictions = await predRes.json();
      const feedback = await feedbackRes.json();
      const preds = Array.isArray(predictions) ? predictions : predictions.predictions || [];
      const resolved = preds.filter((p: { outcome: string | null }) => p.outcome);
      const hits = resolved.filter((p: { outcome: string }) => p.outcome === "confirmed");
      const report = feedback.report;

      setStats({
        totalPredictions: preds.length,
        resolvedPredictions: resolved.length,
        hitRate: resolved.length > 0 ? hits.length / resolved.length : 0,
        brierScore: report?.brierScore ?? 0,
        signalsProcessed: preds.length * 4, // 4 signal layers per prediction cycle
        avgConfidence: report?.avgConfidence ?? 0,
      });
    } catch {
      // Stats are non-critical, fail silently
    }
    setStatsLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (!capReveal.visible) return;
    const timers: NodeJS.Timeout[] = [];
    capabilities.forEach((_, i) => {
      timers.push(setTimeout(() => setActiveCapabilityIndex(i), 200 + i * 150));
    });
    return () => timers.forEach(clearTimeout);
  }, [capReveal.visible]);

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
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute top-20 left-1/4 w-[500px] h-[300px] bg-accent-cyan/[0.02] rounded-full blur-[120px] pointer-events-none" />

        <div ref={heroReveal.ref} className="relative max-w-5xl mx-auto">
          <div className={`${anim} ${heroReveal.visible ? shown : hidden}`}>
            <div className="flex items-center gap-3 mb-8">
              <span className="font-mono text-[10px] text-navy-600 tabular-nums">00</span>
              <div className="h-px w-6 bg-navy-600/50" />
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-navy-500">
                Competitive Intelligence
              </span>
            </div>
          </div>

          <h1
            className={`font-sans text-[2.5rem] md:text-[3.25rem] font-light leading-[1.1] tracking-tight text-navy-100 max-w-3xl ${anim} ${heroReveal.visible ? shown : hidden}`}
            style={{ transitionDelay: "100ms" }}
          >
            Why NEXUS
          </h1>

          <p
            className={`mt-8 font-sans text-base md:text-lg text-navy-400 leading-relaxed max-w-2xl ${anim} ${heroReveal.visible ? shown : hidden}`}
            style={{ transitionDelay: "200ms" }}
          >
            Most platforms do one thing. Bloomberg gives you market data.
            Recorded Future gives you threat intelligence. Trading bots give you
            signals. None of them connect the full picture. NEXUS is the only
            platform that fuses geopolitical intelligence, market analysis, AI
            predictions, and execution into a single system.
          </p>

          <p
            className={`mt-4 font-sans text-base text-navy-500 leading-relaxed max-w-2xl ${anim} ${heroReveal.visible ? shown : hidden}`}
            style={{ transitionDelay: "300ms" }}
          >
            At a fraction of what institutions pay for less.
          </p>
        </div>
      </section>

      <Ruled maxWidth="max-w-5xl" />

      {/* ── THE PROBLEM ── */}
      <section className="px-6 py-20">
        <div ref={problemReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="01" label="The Problem" visible={problemReveal.visible} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                title: "Intelligence is siloed",
                body: "Geopolitical analysts don't see market data. Traders don't see OSINT feeds. Risk managers don't see shipping disruptions in real time. The information exists, but it lives in different platforms with different logins and no connection between them.",
              },
              {
                title: "Enterprise pricing locks out everyone else",
                body: "Bloomberg costs $32K a year. Recorded Future starts at $60K. Palantir requires a sales call and a six-figure contract. The intelligence infrastructure that moves markets is available to institutions and nobody else.",
              },
              {
                title: "AI trading tools are shallow",
                body: "Most AI trading platforms scan price patterns and call it intelligence. They have no geopolitical context, no regime awareness, no understanding of why markets move. They see the chart. They miss the world.",
              },
              {
                title: "No accountability",
                body: "Analyst reports make claims that are never tracked. Trading signals come with no historical accuracy data. Nobody scores their predictions because scoring means admitting when you were wrong. Without calibration feedback, there is no improvement.",
              },
            ].map((card, i) => (
              <div
                key={card.title}
                className={`border border-navy-800/60 rounded-lg bg-navy-900/30 p-6 ${anim} ${problemReveal.visible ? shown : hidden}`}
                style={{ transitionDelay: `${200 + i * 100}ms` }}
              >
                <h3 className="font-sans text-sm font-medium text-navy-200 mb-3">{card.title}</h3>
                <p className="text-[13px] text-navy-500 leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Ruled maxWidth="max-w-5xl" />

      {/* ── WHAT NEXUS DOES ── */}
      <section className="px-6 py-20">
        <div ref={capReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="02" label="What NEXUS Does" visible={capReveal.visible} />

          <p
            className={`text-base text-navy-400 leading-relaxed max-w-2xl mb-12 ${anim} ${capReveal.visible ? shown : hidden}`}
            style={{ transitionDelay: "100ms" }}
          >
            One platform. Every layer of intelligence. From signal detection through to execution.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {capabilities.map((cap, i) => {
              const Icon = cap.icon;
              const isVisible = i <= activeCapabilityIndex;
              return (
                <div
                  key={cap.title}
                  className={`border border-navy-800/60 rounded-lg bg-navy-900/30 p-5 ${anim} ${isVisible ? shown : hidden}`}
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    <Icon className="h-4 w-4" style={{ color: cap.color }} />
                    <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-navy-300">
                      {cap.title}
                    </h3>
                  </div>
                  <p className="text-[12px] text-navy-500 leading-relaxed">{cap.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Ruled maxWidth="max-w-5xl" />

      {/* ── COMPETITIVE COMPARISON ── */}
      <section className="px-6 py-20">
        <div ref={compReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="03" label="How We Compare" visible={compReveal.visible} />

          <p
            className={`text-base text-navy-400 leading-relaxed max-w-2xl mb-10 ${anim} ${compReveal.visible ? shown : hidden}`}
            style={{ transitionDelay: "100ms" }}
          >
            The platforms that do intelligence well charge enterprise prices. The ones that are affordable do a single thing. NEXUS sits in the gap.
          </p>

          <div
            className={`${anim} ${compReveal.visible ? shown : hidden}`}
            style={{ transitionDelay: "200ms" }}
          >
            <CompetitorComparison />
          </div>
        </div>
      </section>

      <Ruled maxWidth="max-w-5xl" />

      {/* ── LIVE PROOF ── */}
      <section className="px-6 py-20">
        <div ref={proofReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="04" label="Live System Performance" visible={proofReveal.visible} />

          <p
            className={`text-base text-navy-400 leading-relaxed max-w-2xl mb-10 ${anim} ${proofReveal.visible ? shown : hidden}`}
            style={{ transitionDelay: "100ms" }}
          >
            Anyone can make claims. We score ours. These numbers come directly
            from the live NEXUS prediction engine, updated in real time. Every
            prediction is tracked, every outcome is recorded, every score is
            public.
          </p>

          {statsLoading ? (
            <div
              className={`flex items-center justify-center gap-2 py-16 text-navy-600 text-xs ${anim} ${proofReveal.visible ? shown : hidden}`}
              style={{ transitionDelay: "200ms" }}
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading live stats...
            </div>
          ) : stats ? (
            <div
              className={`grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10 ${anim} ${proofReveal.visible ? shown : hidden}`}
              style={{ transitionDelay: "200ms" }}
            >
              {[
                {
                  label: "Predictions Generated",
                  value: stats.totalPredictions.toLocaleString(),
                  note: "AI-generated, falsifiable claims",
                },
                {
                  label: "Predictions Resolved",
                  value: stats.resolvedPredictions.toLocaleString(),
                  note: "Auto-resolved against market data",
                },
                {
                  label: "Hit Rate",
                  value: `${(stats.hitRate * 100).toFixed(0)}%`,
                  note: "Binary accuracy across all categories",
                  color: stats.hitRate >= 0.5 ? "text-accent-emerald" : "text-navy-300",
                },
                {
                  label: "Brier Score",
                  value: stats.brierScore > 0 ? stats.brierScore.toFixed(3) : "N/A",
                  note: stats.brierScore < 0.2 ? "Good calibration (< 0.25 = skilled)" : stats.brierScore < 0.3 ? "Moderate calibration" : "Building sample size",
                  color: stats.brierScore > 0 && stats.brierScore < 0.2 ? "text-accent-emerald" : "text-navy-300",
                },
                {
                  label: "Signal Layers Active",
                  value: "4",
                  note: "GEO, MKT, OSI, systemic risk",
                },
                {
                  label: "Avg Confidence",
                  value: stats.avgConfidence > 0 ? `${(stats.avgConfidence * 100).toFixed(0)}%` : "N/A",
                  note: "Mean confidence across predictions",
                },
              ].map((stat) => (
                <div key={stat.label} className="border border-navy-800/60 rounded-lg bg-navy-900/30 p-5">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-navy-600 block mb-2">
                    {stat.label}
                  </span>
                  <span className={`text-2xl font-mono font-light tabular-nums ${"color" in stat && stat.color ? stat.color : "text-navy-100"}`}>
                    {stat.value}
                  </span>
                  <span className="text-[10px] text-navy-600 block mt-1.5">{stat.note}</span>
                </div>
              ))}
            </div>
          ) : (
            <div
              className={`border border-navy-800/60 rounded-lg bg-navy-900/30 p-8 text-center ${anim} ${proofReveal.visible ? shown : hidden}`}
              style={{ transitionDelay: "200ms" }}
            >
              <p className="text-sm text-navy-500">
                Live stats are available once the prediction engine is running.
              </p>
              <p className="text-[10px] text-navy-600 mt-2">
                Start a free trial to see the system in action.
              </p>
            </div>
          )}

          <div
            className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${anim} ${proofReveal.visible ? shown : hidden}`}
            style={{ transitionDelay: "350ms" }}
          >
            <div className="border border-navy-800/60 rounded-lg bg-navy-900/30 p-5">
              <h4 className="text-[10px] font-mono uppercase tracking-widest text-accent-cyan mb-3">
                Scored, Not Curated
              </h4>
              <p className="text-[12px] text-navy-500 leading-relaxed">
                Every prediction the system makes is tracked and scored using
                Brier proper scoring rules. Misses are recorded the same as
                hits. You see the real accuracy, not a highlight reel.
              </p>
            </div>
            <div className="border border-navy-800/60 rounded-lg bg-navy-900/30 p-5">
              <h4 className="text-[10px] font-mono uppercase tracking-widest text-accent-amber mb-3">
                Auto-Resolution
              </h4>
              <p className="text-[12px] text-navy-500 leading-relaxed">
                Predictions resolve automatically against market data when
                their deadline passes. No manual cherry-picking. No retroactive
                edits. The system is honest because it has no choice.
              </p>
            </div>
            <div className="border border-navy-800/60 rounded-lg bg-navy-900/30 p-5">
              <h4 className="text-[10px] font-mono uppercase tracking-widest text-accent-emerald mb-3">
                Self-Correcting
              </h4>
              <p className="text-[12px] text-navy-500 leading-relaxed">
                Calibration feedback from resolved predictions feeds directly
                into the next generation cycle. If the system is overconfident
                in a category, it adjusts. Rolling Brier monitoring flags
                model degradation before it compounds.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Ruled maxWidth="max-w-5xl" />

      {/* ── PRICING ── */}
      <section className="px-6 py-20">
        <div ref={pricingReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="05" label="Pricing" visible={pricingReveal.visible} />

          <p
            className={`text-base text-navy-400 leading-relaxed max-w-2xl mb-10 ${anim} ${pricingReveal.visible ? shown : hidden}`}
            style={{ transitionDelay: "100ms" }}
          >
            Three tiers. No enterprise sales calls. No hidden fees.
            Cancel anytime.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tiers.map((tier, i) => (
              <div
                key={tier.name}
                className={`border rounded-lg p-6 ${anim} ${pricingReveal.visible ? shown : hidden} ${
                  tier.featured
                    ? "border-accent-cyan/30 bg-accent-cyan/[0.04]"
                    : "border-navy-800/60 bg-navy-900/30"
                }`}
                style={{ transitionDelay: `${200 + i * 100}ms` }}
              >
                {tier.featured && (
                  <div className="flex items-center gap-1.5 mb-3">
                    <Zap className="h-3 w-3 text-accent-cyan" />
                    <span className="text-[9px] font-mono uppercase tracking-widest text-accent-cyan font-bold">
                      Most Popular
                    </span>
                  </div>
                )}
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-navy-500 mb-2">
                  {tier.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-3xl font-mono font-light text-navy-100">{tier.price}</span>
                  <span className="text-xs font-mono text-navy-600">/mo</span>
                </div>
                <p className="text-[12px] text-navy-500 leading-relaxed mb-5">
                  {tier.description}
                </p>
                <div className="space-y-2">
                  {tier.highlights.map((h) => (
                    <div key={h} className="flex items-start gap-2">
                      <Check className="h-3 w-3 text-accent-emerald mt-0.5 shrink-0" />
                      <span className="text-[11px] text-navy-400">{h}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/register"
                  className={`mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-mono text-[10px] uppercase tracking-widest transition-colors ${
                    tier.featured
                      ? "bg-navy-100 text-navy-950 hover:bg-white"
                      : "border border-navy-700 text-navy-300 hover:text-navy-100 hover:border-navy-600"
                  }`}
                >
                  Get Started
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Ruled maxWidth="max-w-5xl" />

      {/* ── CTA ── */}
      <section className="px-6 py-24">
        <div ref={ctaReveal.ref} className="max-w-3xl mx-auto text-center">
          <h2
            className={`font-sans text-2xl md:text-3xl font-light text-navy-100 mb-6 ${anim} ${ctaReveal.visible ? shown : hidden}`}
          >
            Intelligence infrastructure
            <br />
            <span className="text-navy-400">that was built for this era.</span>
          </h2>

          <p
            className={`text-sm text-navy-500 leading-relaxed max-w-lg mx-auto mb-10 ${anim} ${ctaReveal.visible ? shown : hidden}`}
            style={{ transitionDelay: "100ms" }}
          >
            The world is getting more complex. Markets are more connected to geopolitics than ever.
            The tools should reflect that. NEXUS does.
          </p>

          <div
            className={`flex flex-wrap items-center justify-center gap-5 ${anim} ${ctaReveal.visible ? shown : hidden}`}
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
              href="/about"
              className="font-mono text-[11px] uppercase tracking-widest text-navy-500 hover:text-navy-300 transition-colors"
            >
              Learn more about NEXUS
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
