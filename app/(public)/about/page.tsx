"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ExternalLink,
  MapPin,
  Radar,
  Radio,
  Layers,
  Brain,
  Crosshair,
  TrendingUp,
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

// ── Section Divider ──

function Ruled() {
  return (
    <div className="max-w-4xl mx-auto px-6">
      <div className="h-px bg-navy-700/40" />
    </div>
  );
}

// ── Section Header ──

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
      <span className="font-mono text-[10px] text-navy-600 tabular-nums">
        {number}
      </span>
      <div className="h-px w-8 bg-navy-600/50" />
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-navy-500">
        {label}
      </span>
    </div>
  );
}

// ── Pipeline Step ──

const pipelineSteps = [
  {
    icon: Radio,
    tag: "DETECT",
    color: "#06b6d4",
    title: "Signal Detection",
    body: "Four primary layers scan continuously: geopolitical escalation, market microstructure, open-source intelligence, and systemic risk. Calendar and celestial data run as narrative overlay for actor-belief context. Each layer runs its own detection logic. When something meaningful shifts, the system registers it.",
  },
  {
    icon: Layers,
    tag: "CONVERGE",
    color: "#f59e0b",
    title: "Convergence Scoring",
    body: "Independent signals are scored for temporal and thematic overlap. Two primary layers lining up is interesting. Three is significant. Four is a rare-event window. The scoring is non-linear because the real world is non-linear. Narrative overlays add context but no convergence weight.",
  },
  {
    icon: Brain,
    tag: "SYNTHESISE",
    color: "#10b981",
    title: "AI Synthesis",
    body: "Converged signal clusters pass through a structured AI pipeline. The output is a thesis: a clear statement about what is likely to happen, in what sector, on what timeframe, and why. Every conclusion traces back to the signal data that triggered it.",
  },
  {
    icon: Crosshair,
    tag: "PREDICT",
    color: "#f43f5e",
    title: "Falsifiable Predictions",
    body: "Every thesis generates a scored, tracked prediction. Binary outcome, defined timeframe, probability assigned. Predictions resolve automatically and feed back into the detection parameters. The system gets sharper with every cycle.",
  },
  {
    icon: TrendingUp,
    tag: "EXECUTE",
    color: "#a78bfa",
    title: "Integrated Execution",
    body: "When a thesis converts to a trade, you execute it from the same platform. Trading 212 for equities and commodities, Coinbase for crypto. The full pipeline from 'something is happening' to 'here is the position' runs inside one system.",
  },
];

// ── Who it's for ──

const audiences = [
  {
    title: "Macro Traders",
    body: "You already track geopolitics. NEXUS systematises what you do manually, catches the signals you miss at 3am, and gives you a structured framework for the trades you were going to research anyway.",
  },
  {
    title: "Fund Managers",
    body: "Your portfolio is exposed to world events whether you trade on them or not. NEXUS surfaces the geopolitical risk your models are probably underpricing and gives you lead time to adjust.",
  },
  {
    title: "Geopolitical Analysts",
    body: "You understand the signals. NEXUS connects them to market consequences. See which assets move when your thesis plays out and track your analytical accuracy over time.",
  },
  {
    title: "Independent Investors",
    body: "You read the news and wonder what it means for your portfolio. NEXUS gives you the same signal infrastructure that institutional desks keep in-house, at a fraction of the cost.",
  },
];

// ════════════════════════════════════════════════
// ── PAGE ──
// ════════════════════════════════════════════════

export default function AboutPage() {
  const heroReveal = useReveal(0.05);
  const problemReveal = useReveal();
  const solutionReveal = useReveal();
  const pipelineReveal = useReveal(0.08);
  const audienceReveal = useReveal();
  const credReveal = useReveal();
  const ctaReveal = useReveal(0.2);

  // Pipeline step animation
  const [activeStep, setActiveStep] = useState(-1);
  useEffect(() => {
    if (!pipelineReveal.visible) return;
    const timers: NodeJS.Timeout[] = [];
    pipelineSteps.forEach((_, i) => {
      timers.push(setTimeout(() => setActiveStep(i), 400 + i * 300));
    });
    return () => timers.forEach(clearTimeout);
  }, [pipelineReveal.visible]);

  return (
    <main className="min-h-screen selection:bg-accent-cyan/20">
      {/* ── Subtle grid background ── */}
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

      {/* ══════════════════════════════════════════
          SECTION 00: HERO
      ══════════════════════════════════════════ */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Atmospheric glow */}
        <div className="absolute top-20 left-1/3 w-[500px] h-[300px] bg-accent-cyan/[0.02] rounded-full blur-[120px] pointer-events-none" />

        <div ref={heroReveal.ref} className="relative max-w-4xl mx-auto">
          <div
            className={`${anim} ${heroReveal.visible ? shown : hidden}`}
          >
            <div className="flex items-center gap-3 mb-8">
              <span className="font-mono text-[10px] text-navy-600 tabular-nums">
                00
              </span>
              <div className="h-px w-6 bg-navy-600/50" />
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-navy-500">
                Briefing / What is NEXUS
              </span>
            </div>
          </div>

          <h1
            className={`font-sans text-[2.5rem] md:text-[3.25rem] font-light leading-[1.1] tracking-tight text-navy-100 max-w-3xl ${anim} ${heroReveal.visible ? shown : hidden}`}
            style={{ transitionDelay: "100ms" }}
          >
            The signal was there
            <br />
            <span className="text-navy-400">before the price moved.</span>
          </h1>

          <p
            className={`mt-8 font-sans text-base md:text-lg text-navy-400 leading-relaxed max-w-2xl ${anim} ${heroReveal.visible ? shown : hidden}`}
            style={{ transitionDelay: "200ms" }}
          >
            Geopolitical events move markets. Sanctions hit before analysts
            publish. Military mobilisations precede sell-offs by hours. Central
            bank signals ripple through FX before the headline drops. The alpha
            lives in the gap between event and reaction. NEXUS was built to
            work inside that gap.
          </p>

          <div
            className={`mt-10 flex flex-wrap items-center gap-5 ${anim} ${heroReveal.visible ? shown : hidden}`}
            style={{ transitionDelay: "350ms" }}
          >
            <Link
              href="/register"
              className="group inline-flex items-center gap-2.5 px-6 py-2.5 font-mono text-[11px] uppercase tracking-widest text-navy-950 bg-navy-100 hover:bg-white rounded-lg transition-all"
            >
              Start Free Trial
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="#pipeline"
              className="font-mono text-[11px] uppercase tracking-widest text-navy-500 hover:text-navy-300 transition-colors"
            >
              See how it works
            </a>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          SECTION 01: THE PROBLEM
      ══════════════════════════════════════════ */}
      <section className="px-6 py-20">
        <div ref={problemReveal.ref} className="max-w-4xl mx-auto">
          <SectionHead
            number="01"
            label="The Problem"
            visible={problemReveal.visible}
          />

          <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
            <div className="md:col-span-7">
              <p
                className={`font-sans text-[15px] text-navy-300 leading-[1.8] mb-5 ${anim} ${problemReveal.visible ? shown : hidden}`}
                style={{ transitionDelay: "100ms" }}
              >
                Most market participants are reading yesterday&apos;s news.
                They open a terminal, scan headlines, and react. By then, the
                institutions with dedicated geopolitical desks have already
                repositioned. The information isn&apos;t secret. It&apos;s
                just scattered across too many sources for any individual to
                synthesise in real time.
              </p>
              <p
                className={`font-sans text-[15px] text-navy-400 leading-[1.8] mb-5 ${anim} ${problemReveal.visible ? shown : hidden}`}
                style={{ transitionDelay: "200ms" }}
              >
                A military flight pattern changes over the Black Sea. An
                economic calendar anomaly lines up with an OPEC meeting. A
                sanctions package is drafted while VIX term structure inverts.
                Each data point lives in a different feed, tracked by a
                different team, understood in isolation. The convergence goes
                unnoticed until the price moves.
              </p>
              <p
                className={`font-sans text-[15px] text-navy-400 leading-[1.8] ${anim} ${problemReveal.visible ? shown : hidden}`}
                style={{ transitionDelay: "300ms" }}
              >
                This is the gap. It exists because the tooling to close it
                didn&apos;t exist. So we built it.
              </p>
            </div>

            <div
              className={`md:col-span-5 ${anim} ${problemReveal.visible ? shown : hidden}`}
              style={{ transitionDelay: "250ms" }}
            >
              <div className="border border-navy-700/50 rounded-lg p-6 bg-navy-900/20">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-navy-500 mb-6">
                  The Information Gap
                </div>
                <div className="space-y-5">
                  {[
                    {
                      time: "T-6h",
                      event: "Military flight patterns shift",
                      who: "OSINT analysts notice",
                    },
                    {
                      time: "T-3h",
                      event: "Options flow spikes",
                      who: "Institutional desks reposition",
                    },
                    {
                      time: "T-1h",
                      event: "Wire services break the story",
                      who: "Retail sees the headline",
                    },
                    {
                      time: "T+0",
                      event: "Price moves",
                      who: "Alpha is gone",
                    },
                  ].map((step, i) => (
                    <div
                      key={step.time}
                      className="flex items-start gap-4"
                    >
                      <div className="flex flex-col items-center">
                        <span
                          className={`font-mono text-[11px] font-bold tabular-nums ${
                            i === 3
                              ? "text-accent-rose"
                              : "text-navy-300"
                          }`}
                        >
                          {step.time}
                        </span>
                        {i < 3 && (
                          <div className="w-px h-6 bg-navy-700/60 mt-1" />
                        )}
                      </div>
                      <div>
                        <div className="font-sans text-[12px] text-navy-200 leading-snug">
                          {step.event}
                        </div>
                        <div className="font-mono text-[10px] text-navy-500 mt-0.5">
                          {step.who}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          SECTION 02: WHAT WE BUILT
      ══════════════════════════════════════════ */}
      <section className="px-6 py-20">
        <div ref={solutionReveal.ref} className="max-w-4xl mx-auto">
          <SectionHead
            number="02"
            label="What We Built"
            visible={solutionReveal.visible}
          />

          <div
            className={`${anim} ${solutionReveal.visible ? shown : hidden}`}
            style={{ transitionDelay: "100ms" }}
          >
            <p className="font-sans text-xl md:text-2xl font-light text-navy-200 leading-relaxed max-w-3xl mb-8">
              NEXUS is an integrated indicator platform that pulls
              geopolitical, market microstructure, OSINT, systemic risk,
              shipping, and game theory data into one place, identifies when
              signals converge, synthesises them into actionable theses, and
              lets you execute directly from the same interface.
            </p>
          </div>

          <div
            className={`${anim} ${solutionReveal.visible ? shown : hidden}`}
            style={{ transitionDelay: "200ms" }}
          >
            <p className="font-sans text-[15px] text-navy-400 leading-[1.8] max-w-2xl mb-6">
              The platform runs 24/7. It tracks military aircraft in real
              time, monitors OSINT feeds from conflict zones, cross-references
              economic calendar events with market microstructure, and layers
              in esoteric cycle analysis that most people dismiss until it
              calls the turn.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.8] max-w-2xl">
              Every prediction is falsifiable. Every prediction is scored.
              Every score feeds back into the system so the next cycle is
              sharper than the last. You can see the accuracy in real time. No
              hand-waving, no vague calls. Binary outcomes, Brier scoring,
              full accountability.
            </p>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          SECTION 03: THE PIPELINE
      ══════════════════════════════════════════ */}
      <section id="pipeline" className="px-6 py-20">
        <div ref={pipelineReveal.ref} className="max-w-4xl mx-auto">
          <SectionHead
            number="03"
            label="How It Works"
            visible={pipelineReveal.visible}
          />

          {/* Pipeline Steps */}
          <div className="space-y-0">
            {pipelineSteps.map((step, i) => {
              const Icon = step.icon;
              const isActive = activeStep >= i;
              return (
                <div key={step.tag} className="relative">
                  {/* Connecting line */}
                  {i < pipelineSteps.length - 1 && (
                    <div
                      className={`absolute left-[15px] top-[42px] w-px transition-all duration-500 ${isActive ? "" : "bg-navy-700/30"}`}
                      style={{
                        height: "calc(100% - 20px)",
                        ...(isActive ? { backgroundColor: `${step.color}30` } : {}),
                      }}
                    />
                  )}

                  <div
                    className={`relative flex items-start gap-6 py-6 ${anim} ${pipelineReveal.visible ? shown : hidden}`}
                    style={{ transitionDelay: `${150 + i * 120}ms` }}
                  >
                    {/* Icon node */}
                    <div
                      className={`relative flex-shrink-0 w-[30px] h-[30px] rounded-full flex items-center justify-center transition-all duration-500 mt-0.5 ${isActive ? "" : "border-navy-700/40"}`}
                      style={{
                        backgroundColor: isActive ? `${step.color}15` : "transparent",
                        border: `1px solid ${isActive ? `${step.color}40` : ""}`,
                        ...(isActive ? {} : { borderColor: "var(--color-navy-700)" }),
                      }}
                    >
                      <Icon
                        className={`w-3.5 h-3.5 transition-colors duration-500 ${isActive ? "" : "text-navy-600"}`}
                        style={isActive ? { color: step.color } : {}}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className={`font-mono text-[9px] font-bold uppercase tracking-[0.2em] transition-colors duration-500 ${isActive ? "" : "text-navy-600"}`}
                          style={isActive ? { color: step.color } : {}}
                        >
                          {step.tag}
                        </span>
                        <div
                          className={`h-px flex-1 max-w-16 transition-all duration-500 ${isActive ? "" : "bg-navy-700/20"}`}
                          style={isActive ? { backgroundColor: `${step.color}20` } : {}}
                        />
                      </div>
                      <h3
                        className={`font-sans text-base font-medium transition-colors duration-500 mb-2 ${isActive ? "text-navy-100" : "text-navy-500"}`}
                      >
                        {step.title}
                      </h3>
                      <p
                        className={`font-sans text-[13px] leading-[1.7] max-w-xl transition-colors duration-500 ${isActive ? "text-navy-400" : "text-navy-600"}`}
                      >
                        {step.body}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pipeline summary bar */}
          <div
            className={`mt-10 flex items-center gap-2 flex-wrap ${anim} ${pipelineReveal.visible ? shown : hidden}`}
            style={{ transitionDelay: "800ms" }}
          >
            {pipelineSteps.map((step, i) => (
              <div key={step.tag} className="flex items-center gap-2">
                <span
                  className={`font-mono text-[9px] font-bold uppercase tracking-[0.15em] px-2.5 py-1 rounded border transition-all duration-500 ${activeStep >= i ? "" : "text-navy-600 border-navy-700/30"}`}
                  style={activeStep >= i ? {
                    color: step.color,
                    borderColor: `${step.color}30`,
                    backgroundColor: `${step.color}08`,
                  } : {}}
                >
                  {step.tag}
                </span>
                {i < pipelineSteps.length - 1 && (
                  <ArrowRight
                    className={`w-3 h-3 transition-colors duration-500 ${activeStep > i ? "" : "text-navy-700/30"}`}
                    style={activeStep > i ? { color: `${step.color}60` } : {}}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          SECTION 04: WHO IS THIS FOR
      ══════════════════════════════════════════ */}
      <section className="px-6 py-20">
        <div ref={audienceReveal.ref} className="max-w-4xl mx-auto">
          <SectionHead
            number="04"
            label="Who Is This For"
            visible={audienceReveal.visible}
          />

          <p
            className={`font-sans text-xl font-light text-navy-300 leading-relaxed max-w-2xl mb-12 ${anim} ${audienceReveal.visible ? shown : hidden}`}
            style={{ transitionDelay: "100ms" }}
          >
            Anyone whose returns are exposed to world events. Which, if
            you&apos;re honest about it, is everyone.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {audiences.map((a, i) => (
              <div
                key={a.title}
                className={`border border-navy-700/40 rounded-lg p-6 bg-navy-900/10 hover:border-navy-600/50 hover:bg-navy-900/20 transition-all duration-300 ${anim} ${audienceReveal.visible ? shown : hidden}`}
                style={{ transitionDelay: `${200 + i * 100}ms` }}
              >
                <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-navy-200 mb-3">
                  {a.title}
                </h3>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.7]">
                  {a.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          SECTION 05: WHO BUILT THIS
      ══════════════════════════════════════════ */}
      <section className="px-6 py-20">
        <div ref={credReveal.ref} className="max-w-4xl mx-auto">
          <SectionHead
            number="05"
            label="Who Built This"
            visible={credReveal.visible}
          />

          <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
            <div
              className={`md:col-span-7 ${anim} ${credReveal.visible ? shown : hidden}`}
              style={{ transitionDelay: "100ms" }}
            >
              <h3 className="font-sans text-lg font-medium text-navy-100 mb-1">
                Andre Figueira
              </h3>
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-navy-500 mb-6">
                Senior Software Architect / Founder
              </p>

              <div className="space-y-4">
                <p className="font-sans text-[14px] text-navy-300 leading-[1.8]">
                  20+ years building production systems. Infrastructure
                  processing billions of events. AI systems running in
                  production, measured by outcomes. NEXUS came from noticing
                  the same thing over and over again while trading: the signal
                  was always visible before the move. The tools to catch it
                  systematically just didn&apos;t exist for individual
                  operators.
                </p>
                <p className="font-sans text-[14px] text-navy-400 leading-[1.8]">
                  So he built one. The engineering philosophy is the same one
                  behind every system he&apos;s shipped: observable,
                  self-correcting, and measured by what it actually produces.
                  Every component earns its place.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-5">
                <div className="flex items-center gap-2 text-navy-500">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="font-mono text-[10px] uppercase tracking-wider">
                    London, UK
                  </span>
                </div>
                <a
                  href="https://polyxmedia.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-accent-cyan hover:text-accent-cyan/80 transition-colors"
                >
                  polyxmedia.com{" "}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div
              className={`md:col-span-5 ${anim} ${credReveal.visible ? shown : hidden}`}
              style={{ transitionDelay: "250ms" }}
            >
              <div className="border border-navy-700/50 rounded-lg p-6 bg-navy-900/20">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-navy-500 mb-6">
                  A Polyxmedia Product
                </div>
                <p className="font-sans text-[12px] text-navy-400 leading-[1.7] mb-6">
                  NEXUS is built by Polyxmedia, a London-based engineering
                  firm specialising in enterprise-scale systems and applied
                  AI. The same discipline behind billion-event infrastructure
                  runs inside this platform.
                </p>
                <div className="space-y-4">
                  {[
                    { label: "Events Processed Annually", value: "7B+" },
                    { label: "Documented Cost Savings", value: "5.4M+" },
                    { label: "System Uptime", value: "99.99%" },
                    { label: "Production Experience", value: "20+ yrs" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between border-b border-navy-700/30 pb-3 last:border-0 last:pb-0"
                    >
                      <span className="font-sans text-[11px] text-navy-500">
                        {item.label}
                      </span>
                      <span className="font-mono text-[13px] font-bold text-navy-200">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          SECTION 06: CTA
      ══════════════════════════════════════════ */}
      <section className="relative px-6 py-28 overflow-hidden">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] bg-accent-cyan/[0.03] rounded-full blur-[100px] pointer-events-none" />

        <div ref={ctaReveal.ref} className="relative max-w-4xl mx-auto">
          <div
            className={`text-center ${anim} ${ctaReveal.visible ? shown : hidden}`}
          >
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="h-px w-12 bg-navy-600/50" />
              <Radar className="w-4 h-4 text-accent-cyan/40" />
              <div className="h-px w-12 bg-navy-600/50" />
            </div>

            <h2 className="font-sans text-2xl md:text-3xl font-light text-navy-100 mb-4 leading-tight">
              2 days free. Full access. Cancel before you're charged.
            </h2>

            <p className="font-sans text-[15px] text-navy-400 mb-10 max-w-lg mx-auto leading-relaxed">
              The best way to understand what NEXUS does is to use it. Every
              module, every signal layer, every AI tool. Two weeks is enough
              time to see if this changes how you read the market.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-5">
              <Link
                href="/register"
                className="group inline-flex items-center gap-2.5 px-8 py-3 font-mono text-[11px] uppercase tracking-widest text-navy-950 bg-navy-100 hover:bg-white rounded-lg transition-all font-medium"
              >
                Start Free Trial
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/research/methodology"
                className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-navy-500 hover:text-navy-300 transition-colors"
              >
                Read the methodology
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <p className="font-mono text-[10px] text-navy-600 mt-8 tracking-wider">
              ANALYST $299/mo // OPERATOR $999/mo // INSTITUTION Custom
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
