"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Radar,
  Layers,
  GitMerge,
  Brain,
  RotateCcw,
  Shield,
  Globe,
  Calendar,
  Moon,
  BarChart3,
  Eye,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Target,
  Zap,
  Clock,
  TrendingUp,
  Lock,
  AlertTriangle,
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

// ── Phase data ──

const phases = [
  {
    number: "01",
    tag: "DETECT",
    title: "Multi-Layer Signal Detection",
    color: "#06b6d4",
    icon: Radar,
    summary:
      "Continuous monitoring across four primary signal layers plus a narrative overlay, each with specialised detection logic tuned to surface anomalies before they reach consensus.",
    details: [
      "Every signal layer operates its own detection engine. The engines run independently so that a failure or latency spike in one layer never compromises the others. Raw inputs are normalised into a common signal schema: timestamp, category, affected entities, geographic scope, and a preliminary intensity score from 1 to 5.",
      "Detection thresholds are dynamic. Baseline activity levels are recalculated on a rolling window, so the system adapts to shifting environments. A troop movement during peacetime triggers differently than the same movement during an active conflict cycle.",
      "Signals below the noise floor are still recorded. They contribute to pattern recognition over longer time horizons even if they don't trigger immediate alerts.",
    ],
    layers: [
      { icon: Globe, tag: "GEO", label: "Geopolitical", desc: "Conflict escalation, sanctions regimes, diplomatic shifts, military posture changes, and regime instability indicators.", primary: true },
      { icon: BarChart3, tag: "MKT", label: "Market", desc: "Options flow anomalies, volatility regime shifts, cross-asset divergences, credit spreads, and macro indicator surprises.", primary: true },
      { icon: Eye, tag: "OSI", label: "OSINT", desc: "Open-source intelligence from flight tracking, shipping data, satellite imagery, social media, and event wire services.", primary: true },
      { icon: Calendar, tag: "CAL", label: "Calendar (Narrative Overlay)", desc: "Hebrew and Islamic calendar events, FOMC cycles, options expiry dates. Actor-belief context only, max 0.5 bonus, no convergence weight.", primary: false },
      { icon: Moon, tag: "CEL", label: "Celestial (Narrative Overlay)", desc: "Eclipses, planetary transits, lunar cycles, and solar activity. Actor-belief context only, max 0.5 bonus, no convergence weight.", primary: false },
    ],
  },
  {
    number: "02",
    tag: "CONVERGE",
    title: "Convergence Analysis",
    color: "#f59e0b",
    icon: GitMerge,
    summary:
      "The convergence engine identifies temporal and thematic overlaps between signals from independent layers. When multiple domains align within a narrow window, the system flags a convergence event.",
    details: [
      "Convergence scoring is non-linear. Two simultaneous signals from different layers do not simply double the score. The system applies an amplification function that weighs the independence of the source layers. Highly independent layers (celestial + market) receive a stronger multiplier than correlated layers (geopolitical + OSINT).",
      "Temporal proximity matters. Signals are scored based on how tightly they cluster in time. A three-layer convergence within 48 hours scores significantly higher than the same signals spread over two weeks.",
      "Thematic overlap is the second axis. Signals affecting the same geographic region, sector, or asset class receive additional weighting. A Middle East conflict signal converging with an energy market anomaly and a calendar event tied to the region creates a thematically coherent cluster that warrants attention.",
      "The system distinguishes between coincidental overlap and meaningful convergence through historical pattern matching. Every convergence event is compared against a library of past convergences and their outcomes to assess whether the current pattern has predictive precedent.",
    ],
  },
  {
    number: "03",
    tag: "SYNTHESISE",
    title: "AI-Driven Intelligence Synthesis",
    color: "#10b981",
    icon: Brain,
    summary:
      "Converged signal clusters are passed through an AI analysis pipeline that transforms raw data into structured intelligence briefs with directional assessments and scenario modelling.",
    details: [
      "The synthesis layer does not generate generic commentary. Every output is grounded in the specific signal data that triggered it. The AI receives the full signal cluster, historical parallels, and current market context as structured inputs, then produces assessments that reference specific data points.",
      "Outputs include directional market impact assessment, escalation probability ranges, affected sectors and instruments, risk factor enumeration, historical parallels with outcome data, and scenario trees with probability weightings.",
      "The prompt architecture is calibrated for precision over volume. The system favours a single high-confidence assessment over multiple hedged opinions. When confidence is genuinely low, it says so explicitly with reasoning.",
      "Intelligence briefs are tagged with confidence levels, time horizons, and the specific signals that informed each conclusion. This creates full traceability from raw signal to final assessment.",
    ],
  },
  {
    number: "04",
    tag: "VALIDATE",
    title: "Outcome Tracking and Feedback Loops",
    color: "#f43f5e",
    icon: RotateCcw,
    summary:
      "After each signal window closes, the system measures prediction accuracy against actual outcomes and feeds the results back into every upstream component.",
    details: [
      "Price movements across recommended instruments are tracked at multiple intervals after each prediction. The system records directional accuracy, magnitude accuracy, and timing accuracy as separate metrics.",
      "Prediction performance is scored using the Brier scoring method, which penalises overconfidence and rewards well-calibrated probability estimates. This prevents the system from defaulting to extreme predictions that are occasionally spectacular but frequently wrong.",
      "Feedback flows upstream into every component: detection thresholds are adjusted, convergence scoring weights are recalibrated, and the AI synthesis prompts are updated to reflect which signal patterns produced accurate forecasts and which did not.",
      "This creates a self-improving loop. Each prediction cycle generates data that makes the next cycle sharper. The system tracks its own accuracy over time and surfaces trends in where it performs well and where it struggles.",
    ],
  },
];

const principles = [
  { icon: Layers, title: "Independence of Layers", body: "Each primary signal layer operates on fundamentally different data sources with different dynamics. This independence is what makes convergence meaningful. Calendar and celestial data serve as narrative context for understanding actor beliefs, not as independent predictive signals." },
  { icon: Target, title: "Convergence Over Prediction", body: "NEXUS does not predict events. It identifies conditions under which events become more probable. The distinction matters: prediction implies certainty, while convergence analysis surfaces elevated probability windows." },
  { icon: RotateCcw, title: "Continuous Calibration", body: "Every output feeds back into the system. Weights, thresholds, and scoring parameters are living values that evolve with each completed prediction cycle. The system never assumes its current calibration is final." },
  { icon: Shield, title: "Grounded Analysis", body: "Every assessment traces back to specific, observable data points. The system does not hallucinate connections or project patterns that aren't supported by the underlying signals." },
];

const dataCategories = [
  { category: "Geopolitical Intelligence", sources: "Government publications, defence intelligence feeds, verified reporting networks, treaty databases, sanctions registries", refresh: "Continuous", type: "primary" },
  { category: "Market Data", sources: "Real-time price feeds, options flow aggregators, economic indicator APIs, central bank data repositories", refresh: "Real-time", type: "primary" },
  { category: "Open-Source Intelligence", sources: "Flight tracking networks, maritime AIS data, event wire services, satellite imagery providers, social media analysis", refresh: "Continuous", type: "primary" },
  { category: "Calendar Systems (Narrative Overlay)", sources: "Hebrew and Islamic calendar databases, central bank schedules, derivatives expiry calendars, fiscal year boundaries. Actor-belief context only.", refresh: "Daily", type: "narrative" },
  { category: "Celestial Ephemeris (Narrative Overlay)", sources: "Astronomical ephemeris data, eclipse databases, planetary transit calculations, solar activity indices. Actor-belief context only.", refresh: "Daily", type: "narrative" },
];

// ── Expandable phase ──

function ExpandablePhase({ phase }: { phase: (typeof phases)[0] }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = phase.icon;
  const reveal = useReveal();

  return (
    <div ref={reveal.ref} className={`transition-all duration-700 ${reveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
      <div className={`group transition-all duration-300 ${expanded ? "border-l-2" : "border-l border-l-navy-800 hover:border-l-navy-600"}`} style={{ borderLeftColor: expanded ? phase.color : undefined }}>
        <button onClick={() => setExpanded(!expanded)} className="w-full text-left px-6 py-5 flex items-start gap-5">
          <div className="flex-shrink-0 flex flex-col items-center gap-3">
            <span className="font-mono text-2xl font-bold transition-all duration-300" style={{ color: expanded ? phase.color : "#3d3d3d" }}>
              {phase.number}
            </span>
            <Icon className="w-4 h-4 transition-colors duration-300" style={{ color: expanded ? phase.color : "#5c5c5c" }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: expanded ? phase.color : "#5c5c5c" }}>
                {phase.tag}
              </span>
            </div>
            <h3 className="font-mono text-sm font-semibold uppercase tracking-widest mt-1 transition-colors duration-300" style={{ color: expanded ? phase.color : "#d4d4d4" }}>
              {phase.title}
            </h3>
            <p className="mt-2 font-sans text-sm text-navy-400 leading-relaxed max-w-3xl">
              {phase.summary}
            </p>
          </div>

          <div className="flex-shrink-0 mt-1">
            {expanded ? <ChevronUp className="w-4 h-4 text-navy-500" /> : <ChevronDown className="w-4 h-4 text-navy-500" />}
          </div>
        </button>

        {expanded && (
          <div className="px-6 pb-6 pt-0">
            <div className="ml-[68px] border-t border-navy-700/20 pt-5">
              <div className="space-y-3">
                {phase.details.map((detail, i) => (
                  <p key={i} className="font-sans text-sm text-navy-300 leading-relaxed max-w-3xl">{detail}</p>
                ))}
              </div>

              {phase.layers && (
                <div className="mt-6">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-navy-500 mb-3">Signal Layers</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {phase.layers.filter((l: { primary?: boolean }) => l.primary !== false).map((layer) => {
                      const LayerIcon = layer.icon;
                      return (
                        <div key={layer.tag} className="px-4 py-3 border-l border-navy-700/40 hover:border-navy-500/40 transition-colors">
                          <div className="flex items-center gap-2 mb-2">
                            <LayerIcon className="w-3.5 h-3.5 text-navy-500" />
                            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-navy-400">{layer.tag}</span>
                            <span className="font-mono text-[11px] font-medium text-navy-200">{layer.label}</span>
                          </div>
                          <p className="font-sans text-[11px] text-navy-500 leading-relaxed">{layer.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                  {/* Narrative overlay layers */}
                  {phase.layers.some((l: { primary?: boolean }) => l.primary === false) && (
                    <div className="mt-4">
                      <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-2 flex items-center gap-2">
                        <div className="h-px flex-1 max-w-8 bg-navy-700/40" />
                        Narrative / Actor-Belief Overlay
                      </div>
                      <p className="font-sans text-[10px] text-navy-600 mb-3 italic">
                        Calendar and celestial overlays are narrative/actor-belief context only, not independent predictive signals. Max 0.5 bonus, no convergence weight.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {phase.layers.filter((l: { primary?: boolean }) => l.primary === false).map((layer) => {
                          const LayerIcon = layer.icon;
                          return (
                            <div key={layer.tag} className="px-4 py-3 border-l border-navy-800/40 opacity-60 hover:opacity-80 transition-opacity">
                              <div className="flex items-center gap-2 mb-2">
                                <LayerIcon className="w-3.5 h-3.5 text-navy-600" />
                                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-navy-500">{layer.tag}</span>
                                <span className="font-mono text-[11px] font-medium text-navy-300">{layer.label}</span>
                              </div>
                              <p className="font-sans text-[11px] text-navy-600 leading-relaxed">{layer.desc}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="mt-3">
                    <Link href="/research/signal-theory" className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-accent-cyan hover:text-accent-cyan/80 transition-colors">
                      Deep dive into signal theory <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ──

export default function MethodologyPage() {
  const hero = useReveal(0.1);
  const principlesReveal = useReveal();
  const convergenceReveal = useReveal();
  const dataReveal = useReveal();
  const riskReveal = useReveal();
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
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-navy-400">Research / Methodology</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-navy-100 max-w-2xl">
              How NEXUS Detects What Others Miss
            </h1>

            <p className="mt-1 font-sans text-[11px] text-accent-amber/80 leading-relaxed max-w-2xl border border-accent-amber/20 rounded px-3 py-2 bg-accent-amber/[0.03]">
              Calendar and celestial overlays are narrative/actor-belief context only, not independent predictive signals.
            </p>

            <p className="mt-5 font-sans text-base text-navy-400 leading-relaxed max-w-2xl">
              A multi-layer intelligence system that monitors four primary signal layers plus a narrative overlay, scores their convergence, and synthesises high-conviction intelligence briefs. Every assessment traces back to observable data. Every prediction is tracked and scored.
            </p>
          </div>

          {/* Pipeline ribbon */}
          <div className={`mt-10 flex flex-wrap items-center gap-0 transition-all duration-700 delay-200 ${hero.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            {phases.map((step, i) => (
              <div key={step.tag} className="flex items-center">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold" style={{ color: step.color, opacity: 0.4 }}>{step.number}</span>
                  <span className="font-mono text-[11px] font-medium tracking-wider" style={{ color: step.color }}>{step.tag}</span>
                </div>
                {i < 3 && (
                  <div className="mx-3 flex items-center">
                    <div className="w-8 h-px bg-navy-700/40" />
                    <div className="w-0 h-0 border-t-[3px] border-b-[3px] border-l-[5px] border-transparent border-l-navy-700/40" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Core Principles ── */}
      <section className="px-6 pb-16">
        <div ref={principlesReveal.ref} className="max-w-5xl mx-auto">
          <div className={`transition-all duration-700 ${principlesReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px w-8 bg-navy-700" />
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">Foundational Principles</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {principles.map((p, i) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className={`transition-all duration-700 ${principlesReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${(i + 1) * 100}ms` }}>
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className="w-4 h-4 text-navy-500" />
                    <h3 className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-200">{p.title}</h3>
                  </div>
                  <p className="font-sans text-sm text-navy-400 leading-relaxed pl-7">{p.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6"><div className="h-px bg-navy-800" /></div>

      {/* ── The Four Phases ── */}
      <section className="px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-px w-8 bg-navy-700" />
            <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">The Pipeline</h2>
          </div>
          <p className="font-sans text-sm text-navy-400 mb-8 ml-11">Each phase builds on the previous. Click to expand.</p>
          <div className="space-y-1">
            {phases.map((phase) => (
              <ExpandablePhase key={phase.number} phase={phase} />
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6"><div className="h-px bg-navy-800" /></div>

      {/* ── Convergence Scoring ── */}
      <section className="px-6 py-16">
        <div ref={convergenceReveal.ref} className="max-w-5xl mx-auto">
          <div className={`transition-all duration-700 ${convergenceReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px w-8 bg-navy-700" />
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">Convergence Scoring</h2>
            </div>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 mb-10 transition-all duration-700 delay-100 ${convergenceReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            {[
              { icon: Layers, title: "Layer Count", body: "More primary layers converging means a stronger signal. Two-layer convergences are common. Three or more are significant. Full four-layer convergence is exceptionally rare and always flagged as critical. Narrative overlays (CAL/CEL) add context but do not contribute convergence weight." },
              { icon: Clock, title: "Temporal Proximity", body: "Signals that cluster tightly in time score higher than the same signals spread over weeks. The scoring function applies a time-decay weighting that favours narrow convergence windows." },
              { icon: TrendingUp, title: "Historical Precedent", body: "Every convergence event is matched against a library of past convergences. Patterns with strong historical precedent and clear outcome data receive higher confidence scores." },
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

          {/* Amplification */}
          <div className={`transition-all duration-700 delay-200 ${convergenceReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-navy-500" />
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-navy-400">Cross-Layer Amplification</h3>
            </div>
            <p className="font-sans text-sm text-navy-400 leading-relaxed mb-6 max-w-3xl">
              Convergence scoring is non-linear and only counts primary signal layers (GEO, MKT, OSI, and additional data layers). Narrative overlays (CAL/CEL) provide actor-belief context but do not contribute convergence weight. The amplification curve steepens as more primary layers align, reflecting the decreasing probability of coincidental overlap.
            </p>
            <div className="grid grid-cols-3 gap-px">
              {[
                { layers: "2 Primary", level: "Noteworthy", color: "#8a8a8a" },
                { layers: "3 Primary", level: "Significant", color: "#10b981" },
                { layers: "4 Primary", level: "Critical", color: "#ef4444" },
              ].map((item) => (
                <div key={item.layers} className="text-center py-4">
                  <div className="font-mono text-[10px] text-navy-500 uppercase tracking-wider mb-2">{item.layers}</div>
                  <div className="w-6 h-6 rounded-full mx-auto mb-1" style={{ background: `${item.color}20`, border: `1px solid ${item.color}40` }} />
                  <div className="font-mono text-[9px] uppercase tracking-wider mt-1" style={{ color: item.color, opacity: 0.6 }}>{item.level}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6"><div className="h-px bg-navy-800" /></div>

      {/* ── Data Integrity ── */}
      <section className="px-6 py-16">
        <div ref={dataReveal.ref} className="max-w-5xl mx-auto">
          <div className={`transition-all duration-700 ${dataReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px w-8 bg-navy-700" />
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">Data Sources and Integrity</h2>
            </div>
          </div>

          <div className={`transition-all duration-700 delay-100 ${dataReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="grid grid-cols-12 gap-4 pb-3 border-b border-navy-700/30">
              <div className="col-span-3 font-mono text-[9px] uppercase tracking-wider text-navy-500">Category</div>
              <div className="col-span-7 font-mono text-[9px] uppercase tracking-wider text-navy-500">Source Types</div>
              <div className="col-span-2 font-mono text-[9px] uppercase tracking-wider text-navy-500">Refresh</div>
            </div>

            {dataCategories.map((cat, i) => (
              <div key={cat.category} className={`grid grid-cols-12 gap-4 py-3.5 ${i < dataCategories.length - 1 ? "border-b border-navy-800/60" : ""}`}>
                <div className="col-span-3 font-mono text-[11px] font-medium text-navy-200">{cat.category}</div>
                <div className="col-span-7 font-sans text-[11px] text-navy-400 leading-relaxed">{cat.sources}</div>
                <div className="col-span-2">
                  <span className={`font-mono text-[9px] uppercase tracking-wider ${cat.refresh === "Real-time" ? "text-accent-emerald" : cat.refresh === "Continuous" ? "text-accent-cyan" : "text-navy-400"}`}>
                    {cat.refresh}
                  </span>
                </div>
              </div>
            ))}

            <div className="mt-6 flex items-start gap-3">
              <Lock className="w-3.5 h-3.5 text-navy-600 flex-shrink-0 mt-0.5" />
              <p className="font-sans text-xs text-navy-500 leading-relaxed">
                Specific data providers, API configurations, and ingestion pipelines are proprietary. The categories above describe the types of data consumed, not the specific sources or methods used to acquire them.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6"><div className="h-px bg-navy-800" /></div>

      {/* ── Risk Framework ── */}
      <section className="px-6 py-16">
        <div ref={riskReveal.ref} className="max-w-5xl mx-auto">
          <div className={`transition-all duration-700 ${riskReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px w-8 bg-navy-700" />
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">Risk Framework and Limitations</h2>
            </div>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-2 gap-10 transition-all duration-700 delay-100 ${riskReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-navy-400" />
                <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-navy-200">What NEXUS Is</h3>
              </div>
              <ul className="space-y-2.5">
                {[
                  "A signal detection and convergence analysis platform",
                  "An intelligence synthesis tool that surfaces elevated-probability windows",
                  "A self-calibrating system that learns from its own prediction outcomes",
                  "A framework for structured thinking about geopolitical-market dynamics",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 font-sans text-sm text-navy-400 leading-relaxed">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-navy-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-navy-400" />
                <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-navy-200">What NEXUS Is Not</h3>
              </div>
              <ul className="space-y-2.5">
                {[
                  "A guarantee of market direction or specific trade outcomes",
                  "A replacement for professional financial advice or due diligence",
                  "An infallible prediction engine - all probabilistic systems carry uncertainty",
                  "A black box - every assessment is traceable to its underlying signal data",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 font-sans text-sm text-navy-400 leading-relaxed">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-navy-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className={`mt-10 transition-all duration-700 delay-200 ${riskReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-navy-300 mb-5">Known Limitations</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { title: "Black Swan Blindness", body: "Truly unprecedented events have no historical pattern to match against. The system can detect unusual conditions but cannot anticipate events with no precedent." },
                { title: "Data Latency", body: "Some signal layers operate on delayed data. Geopolitical and OSINT signals may lag minutes to hours behind real-time events. Market data varies by feed tier." },
                { title: "Calibration Drift", body: "Market regimes change. Correlations that held during one period may break down in the next. The feedback loop mitigates this but cannot eliminate it entirely." },
              ].map((lim) => (
                <div key={lim.title}>
                  <h4 className="font-mono text-[11px] font-semibold text-navy-300 mb-1.5">{lim.title}</h4>
                  <p className="font-sans text-[12px] text-navy-500 leading-relaxed">{lim.body}</p>
                </div>
              ))}
            </div>
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
              { href: "/research/signal-theory", title: "Signal Theory", desc: "Deep dive into signal detection, intensity scoring, decay functions, and cross-layer amplification." },
              { href: "/research/calendar-correlations", title: "Calendar Context (Appendix A)", desc: "Narrative context layers: historical calendar-market patterns as actor-belief overlay, not independent signals." },
              { href: "/research/prediction-accuracy", title: "Prediction Accuracy", desc: "Live accuracy tracking, Brier scores, and performance breakdowns by signal layer and time horizon." },
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
          <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-navy-200 mb-3">See the methodology in action</h3>
          <p className="font-sans text-sm text-navy-400 mb-6 max-w-lg mx-auto">
            Access the full NEXUS platform to explore live signal detection, convergence analysis, and AI-driven intelligence briefs.
          </p>
          <Link href="/register" className="group inline-flex items-center gap-2 px-6 py-2.5 font-mono text-[11px] uppercase tracking-widest text-navy-100 bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.1] hover:border-white/[0.15] transition-all">
            Request Access <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>
    </main>
  );
}
