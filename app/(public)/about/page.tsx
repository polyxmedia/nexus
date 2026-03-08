"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Radar,
  Globe,
  Brain,
  Shield,
  ArrowRight,
  Layers,
  Target,
  Zap,
  ExternalLink,
  MapPin,
  Building2,
  TrendingUp,
  Server,
} from "lucide-react";

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

const pillars = [
  {
    icon: Layers,
    tag: "SIGNAL",
    title: "Multi-Layer Detection",
    color: "#06b6d4",
    body: "Five independent signal domains run simultaneously. Geopolitical shifts, calendar cycles, celestial patterns, market structure anomalies, and open-source intelligence. Each layer operates on its own detection logic so failures in one never compromise the others.",
  },
  {
    icon: Target,
    tag: "CONVERGE",
    title: "Convergence Analysis",
    color: "#f59e0b",
    body: "The system scores temporal and thematic overlaps between independent layers. When multiple unrelated domains align within a narrow window, the convergence score amplifies non-linearly. Three-layer convergences are significant. Five-layer convergences are critical.",
  },
  {
    icon: Brain,
    tag: "SYNTHESISE",
    title: "AI-Driven Intelligence",
    color: "#10b981",
    body: "Converged signal clusters pass through a structured AI pipeline that produces actionable intelligence briefs. Not generic commentary. Every assessment is grounded in the specific signal data that triggered it, with full traceability from raw input to final conclusion.",
  },
  {
    icon: TrendingUp,
    tag: "VALIDATE",
    title: "Outcome Tracking",
    color: "#f43f5e",
    body: "Every prediction is tracked and scored using Brier methodology. Results feed back upstream into detection thresholds, convergence weights, and synthesis parameters. Each cycle generates data that makes the next one sharper.",
  },
];

const stats = [
  { value: "5", label: "Signal Layers", desc: "GEO, CAL, CEL, MKT, OSINT" },
  { value: "20+", label: "AI Tools", desc: "Analyst-callable intelligence tools" },
  { value: "24/7", label: "Monitoring", desc: "Continuous signal detection" },
  { value: "v1", label: "Platform Version", desc: "Active development" },
];

const founderStats = [
  { icon: Server, value: "7B+", label: "Events processed annually" },
  { icon: TrendingUp, value: "£5.4M+", label: "Documented cost savings" },
  { icon: Zap, value: "99.99%", label: "System uptime achieved" },
  { icon: Building2, value: "20yrs", label: "Production experience" },
];

export default function AboutPage() {
  const hero = useReveal(0.1);
  const missionReveal = useReveal();
  const pillarsReveal = useReveal();
  const statsReveal = useReveal();
  const founderReveal = useReveal();
  const polyxReveal = useReveal();
  const ctaReveal = useReveal();

  return (
    <main className="min-h-screen">
      {/* ── Hero ── */}
      <section className="relative pt-28 pb-16 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div ref={hero.ref} className="relative max-w-5xl mx-auto">
          <div className={`transition-all duration-700 ${hero.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 max-w-12 bg-navy-500/30" />
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-navy-400">Company / About</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-navy-100 max-w-2xl">
              Intelligence at the Intersection of Signal and Market
            </h1>

            <p className="mt-5 font-sans text-base text-navy-400 leading-relaxed max-w-2xl">
              NEXUS was built on a single observation: geopolitical events move markets before conventional analysis catches up. The platform exists to close that gap with systematic signal detection, convergence scoring, and AI-driven synthesis.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/research/methodology"
                className="group inline-flex items-center gap-2 px-5 py-2 font-mono text-[11px] uppercase tracking-widest text-navy-100 bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.1] hover:border-white/[0.15] transition-all"
              >
                Read the methodology <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-5 py-2 font-mono text-[11px] uppercase tracking-widest text-navy-400 hover:text-navy-200 transition-colors"
              >
                Request access
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6"><div className="h-px bg-navy-800" /></div>

      {/* ── Mission ── */}
      <section className="px-6 py-16">
        <div ref={missionReveal.ref} className="max-w-5xl mx-auto">
          <div className={`transition-all duration-700 ${missionReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px w-8 bg-navy-700" />
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">Mission</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <p className="font-sans text-sm text-navy-300 leading-relaxed mb-4">
                  Markets are downstream of events. A sanctions announcement, a military mobilisation, a central bank signal: each one creates price movement that most participants react to rather than anticipate. The window between event and market response is where edge lives.
                </p>
                <p className="font-sans text-sm text-navy-400 leading-relaxed mb-4">
                  NEXUS monitors that space continuously. Five independent signal layers run in parallel. When multiple layers converge on the same region, sector, or timeframe, the system flags an elevated-probability window and synthesises the intelligence into a structured assessment.
                </p>
                <p className="font-sans text-sm text-navy-400 leading-relaxed">
                  The goal is not to predict the future. It is to surface conditions under which specific outcomes become more probable than consensus pricing suggests.
                </p>
              </div>
              <div>
                <div className="space-y-6">
                  {[
                    { icon: Globe, title: "Geopolitical-Market Convergence", body: "The core thesis: geopolitical signals precede market reactions. NEXUS is built to detect those signals before they reach consensus." },
                    { icon: Shield, title: "Traceable Intelligence", body: "Every assessment traces back to specific, observable data points. No hallucinated connections. No pattern projection without underlying signal support." },
                    { icon: Radar, title: "Self-Calibrating System", body: "Prediction outcomes feed back into detection thresholds and scoring weights. The system learns from every cycle without human intervention." },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="flex items-start gap-4">
                        <Icon className="w-4 h-4 text-navy-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-mono text-[11px] font-semibold uppercase tracking-widest text-navy-200 mb-1">{item.title}</h3>
                          <p className="font-sans text-[12px] text-navy-500 leading-relaxed">{item.body}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6"><div className="h-px bg-navy-800" /></div>

      {/* ── Platform Pillars ── */}
      <section className="px-6 py-16">
        <div ref={pillarsReveal.ref} className="max-w-5xl mx-auto">
          <div className={`transition-all duration-700 ${pillarsReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px w-8 bg-navy-700" />
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">How It Works</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {pillars.map((pillar, i) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.tag}
                  className={`transition-all duration-700 border-l-2 pl-5 py-1 ${pillarsReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                  style={{ borderLeftColor: pillar.color, transitionDelay: `${i * 100}ms` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-3.5 h-3.5" style={{ color: pillar.color }} />
                    <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: pillar.color }}>
                      {pillar.tag}
                    </span>
                  </div>
                  <h3 className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-200 mb-2">{pillar.title}</h3>
                  <p className="font-sans text-[12px] text-navy-400 leading-relaxed">{pillar.body}</p>
                </div>
              );
            })}
          </div>

          <div className={`mt-8 transition-all duration-700 delay-500 ${pillarsReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <Link
              href="/research/methodology"
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-accent-cyan hover:text-accent-cyan/80 transition-colors"
            >
              Deep dive into the methodology <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6"><div className="h-px bg-navy-800" /></div>

      {/* ── Platform Stats ── */}
      <section className="px-6 py-16">
        <div ref={statsReveal.ref} className="max-w-5xl mx-auto">
          <div className={`transition-all duration-700 ${statsReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="flex items-center gap-3 mb-10">
              <div className="h-px w-8 bg-navy-700" />
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">Platform at a Glance</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-navy-800/30">
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className={`bg-navy-950 px-6 py-8 transition-all duration-700 ${statsReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="font-mono text-3xl font-bold text-navy-100 mb-1">{stat.value}</div>
                <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-navy-300 mb-1">{stat.label}</div>
                <div className="font-sans text-[11px] text-navy-600">{stat.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6"><div className="h-px bg-navy-800" /></div>

      {/* ── Founder ── */}
      <section className="px-6 py-16">
        <div ref={founderReveal.ref} className="max-w-5xl mx-auto">
          <div className={`transition-all duration-700 ${founderReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="flex items-center gap-3 mb-10">
              <div className="h-px w-8 bg-navy-700" />
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">Who Built This</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div className="md:col-span-2">
                <h3 className="font-mono text-sm font-semibold uppercase tracking-widest text-navy-100 mb-1">
                  Andre Figueira
                </h3>
                <p className="font-mono text-[10px] uppercase tracking-wider text-navy-500 mb-5">
                  Senior Software Architect / Founder
                </p>

                <div className="space-y-3">
                  <p className="font-sans text-sm text-navy-300 leading-relaxed">
                    NEXUS was designed and built by Andre Figueira, a Senior Software Architect with over 20 years of production experience in enterprise-scale systems. He has architected infrastructure handling billions of transactions and events, built AI systems shipped to production, and delivered platforms measured by their real-world impact rather than theoretical benchmarks.
                  </p>
                  <p className="font-sans text-sm text-navy-400 leading-relaxed">
                    The idea behind NEXUS came from a recurring observation while tracking markets alongside geopolitical events: the signal was always there before the price moved. Conventional tooling was not designed to catch it. NEXUS was built to fix that.
                  </p>
                  <p className="font-sans text-sm text-navy-400 leading-relaxed">
                    The platform runs on the same engineering philosophy that defines all of Andre&apos;s work: practical over theoretical, observable over opaque, and self-correcting over static. Every component earns its place by making the next output sharper.
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2 text-navy-500">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="font-mono text-[10px] uppercase tracking-wider">London, UK</span>
                  </div>
                  <a
                    href="https://polyxmedia.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-accent-cyan hover:text-accent-cyan/80 transition-colors"
                  >
                    polyxmedia.com <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="space-y-4">
                {founderStats.map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={stat.label}
                      className={`flex items-center gap-4 border-l border-navy-700/40 pl-4 py-2 transition-all duration-700 ${founderReveal.visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"}`}
                      style={{ transitionDelay: `${i * 100}ms` }}
                    >
                      <Icon className="w-4 h-4 text-navy-600 flex-shrink-0" />
                      <div>
                        <div className="font-mono text-xl font-bold text-navy-100">{stat.value}</div>
                        <div className="font-sans text-[11px] text-navy-500">{stat.label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6"><div className="h-px bg-navy-800" /></div>

      {/* ── Polyxmedia ── */}
      <section className="px-6 py-16">
        <div ref={polyxReveal.ref} className="max-w-5xl mx-auto">
          <div className={`transition-all duration-700 ${polyxReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px w-8 bg-navy-700" />
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">A Polyxmedia Product</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
              <div>
                <p className="font-sans text-sm text-navy-300 leading-relaxed mb-4">
                  NEXUS is built by Polyxmedia, a London-based software development agency specialising in enterprise-scale systems and AI engineering. The agency was founded in 2024 with a focus on practical engineering over consulting: hands-on architects who have shipped production systems, not theorists who advise on them.
                </p>
                <p className="font-sans text-sm text-navy-400 leading-relaxed mb-6">
                  The same discipline that makes Polyxmedia effective in enterprise contexts shapes NEXUS: observable systems, measurable outcomes, and infrastructure that earns confidence through consistent delivery rather than claimed expertise.
                </p>
                <a
                  href="https://polyxmedia.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 px-5 py-2 font-mono text-[11px] uppercase tracking-widest text-navy-400 border border-navy-700/50 rounded-lg hover:text-navy-200 hover:border-navy-500/50 transition-all"
                >
                  Visit Polyxmedia <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </a>
              </div>

              <div className="border border-navy-800/60 rounded-lg p-6">
                <div className="font-mono text-[10px] uppercase tracking-wider text-navy-500 mb-5">Polyxmedia at Scale</div>
                <div className="space-y-4">
                  {[
                    { label: "Events Processed Annually", value: "7B+" },
                    { label: "Documented Cost Savings", value: "£5.4M+" },
                    { label: "System Uptime", value: "99.99%" },
                    { label: "Years of Production Experience", value: "20+" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between border-b border-navy-800/40 pb-3 last:border-0 last:pb-0">
                      <span className="font-sans text-[11px] text-navy-500">{item.label}</span>
                      <span className="font-mono text-sm font-bold text-navy-200">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6"><div className="h-px bg-navy-800" /></div>

      {/* ── CTA ── */}
      <section className="px-6 py-20">
        <div ref={ctaReveal.ref} className="max-w-5xl mx-auto">
          <div className={`text-center transition-all duration-700 ${ctaReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className="h-px w-12 bg-navy-700" />
              <Radar className="w-4 h-4 text-navy-500" />
              <div className="h-px w-12 bg-navy-700" />
            </div>
            <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-navy-200 mb-3">
              Access the Platform
            </h3>
            <p className="font-sans text-sm text-navy-400 mb-8 max-w-lg mx-auto">
              NEXUS is in active development and currently available to a limited number of users. Request access to get started.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="group inline-flex items-center gap-2 px-6 py-2.5 font-mono text-[11px] uppercase tracking-widest text-navy-100 bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.1] hover:border-white/[0.15] transition-all"
              >
                Request Access <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/research/methodology"
                className="inline-flex items-center gap-2 px-6 py-2.5 font-mono text-[11px] uppercase tracking-widest text-navy-500 hover:text-navy-300 transition-colors"
              >
                Read the methodology
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
