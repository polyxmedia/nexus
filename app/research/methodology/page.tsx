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
  Sigma,
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
      { icon: Calendar, tag: "CAL", label: "Calendar (Narrative Overlay)", desc: "Religious calendars, central bank schedules, options expiry dates, fiscal year boundaries. Tracked because institutional and sovereign actors demonstrably time decisions around these dates, creating measurable market clustering effects. Actor-belief context only, max 0.5 bonus, no convergence weight.", primary: false },
      { icon: Moon, tag: "CEL", label: "Celestial (Narrative Overlay)", desc: "Tracks astronomical events (eclipses, lunar phases, solar activity) that measurably influence actor behaviour. Certain market participants and political decision-makers demonstrably time actions around these events, creating real microstructure effects. We monitor the belief, not the celestial body. Actor-belief context only, max 0.5 bonus, no convergence weight.", primary: false },
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
      "Convergence scoring is non-linear and applies only to primary signal layers (GEO, MKT, OSI, SYS). Two simultaneous signals from different primary layers do not simply double the score. The system applies an amplification function that weighs the independence of the source layers. Narrative overlays (CAL/CEL) do not participate in convergence scoring at all.",
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
  { category: "Calendar Systems (Narrative Overlay)", sources: "Religious calendar databases, central bank schedules, derivatives expiry calendars, fiscal year boundaries. Tracked because institutional and sovereign actors cluster decisions around these dates. Behavioural finance input, not a causal signal.", refresh: "Daily", type: "narrative" },
  { category: "Celestial Ephemeris (Narrative Overlay)", sources: "Astronomical ephemeris data, eclipse databases, solar activity indices. Tracked because measurable subsets of market participants time actions around these events. We monitor the actor belief, not the celestial body. Behavioural finance input, not a causal signal.", refresh: "Daily", type: "narrative" },
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
                        Calendar and celestial overlays are behavioural finance inputs: they track what actors believe and act on, not independent causal signals. They carry no convergence weight, contribute a maximum 0.5 bonus, and the system performs comparably with them removed entirely. They exist because real capital allocation decisions cluster around these dates.
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
  const formalReveal = useReveal();
  const eq1Reveal = useReveal();
  const eq2Reveal = useReveal();
  const eq3Reveal = useReveal();
  const constantsReveal = useReveal();
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
              Calendar and celestial overlays are behavioural finance inputs that track actor beliefs, not independent causal signals. They carry no convergence weight and the system performs comparably without them.
            </p>

            <p className="mt-5 font-sans text-base text-navy-400 leading-relaxed max-w-2xl">
              A multi-layer intelligence system that monitors four primary signal layers plus a narrative overlay, scores their convergence, and synthesises high-conviction intelligence briefs. Every assessment traces back to observable data. Every prediction is tracked, timestamped, and scored against outcomes.
            </p>

            <p className="mt-3 font-sans text-sm text-navy-500 leading-relaxed max-w-2xl">
              Don&apos;t take our word for it. <Link href="/research/prediction-accuracy" className="text-accent-cyan hover:text-accent-cyan/80 transition-colors underline underline-offset-2">View the live prediction record</Link> with timestamped forecasts, stated probabilities, resolution outcomes, and Brier scores computed in real time.
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

      {/* ── Formal Mathematical Specification ── */}
      <section className="px-6 py-16">
        <div ref={formalReveal.ref} className="max-w-5xl mx-auto">
          <div className={`transition-all duration-700 ${formalReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px w-8 bg-navy-700" />
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">Formal Mathematical Specification</h2>
            </div>
            <p className="font-sans text-sm text-navy-400 leading-relaxed mb-10 ml-11 max-w-3xl">
              The complete system reduces to three equations. Signal detection and Bayesian fusion produce a calibrated posterior. The posterior informs forecast generation. Forecasts are scored against outcomes with a proper scoring rule. Everything below is implemented in production code. The <Link href="/research/prediction-accuracy" className="text-accent-cyan hover:text-accent-cyan/80 transition-colors underline underline-offset-2">live prediction record</Link> shows every forecast, its stated probability, outcome, and Brier score contribution.
            </p>
          </div>

          {/* Equation 1 */}
          <div ref={eq1Reveal.ref} className={`mb-12 transition-all duration-700 ${eq1Reveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="flex items-center gap-3 mb-4">
              <Sigma className="w-4 h-4 text-accent-cyan/60" />
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent-cyan/80">Equation 1: Signal Fusion</h3>
            </div>

            <div className="border border-navy-700/30 rounded-md bg-navy-900/40 p-6 mb-4">
              <div className="font-mono text-sm text-navy-100 leading-loose text-center overflow-x-auto">
                <div className="inline-block text-left">
                  <span className="text-accent-cyan">P</span><sub className="text-navy-500">n</sub>
                  <span className="text-navy-500"> = </span>
                  <span className="text-navy-300">&sigma;</span><span className="text-navy-500">(</span>
                  <span className="text-navy-500"> ln(</span><span className="text-accent-cyan">P</span><sub className="text-navy-500">0</sub>
                  <span className="text-navy-500"> / (1 - </span><span className="text-accent-cyan">P</span><sub className="text-navy-500">0</sub><span className="text-navy-500">))</span>
                  <span className="text-navy-500"> + </span>
                  <span className="text-accent-amber">ln &mu;(n<sub>P</sub>)</span>
                  <span className="text-navy-500"> + </span>
                  <span className="text-accent-emerald">&Sigma;<sub>j</sub> d<sub>j</sub> ln(1 + &rho;<sub>j</sub>(e<sup>k&middot;s<sub>j</sub></sup> - 1))</span>
                  <span className="text-navy-500"> + </span>
                  <span className="text-navy-300">&beta;<sub>N</sub></span>
                  <span className="text-navy-500"> )</span>
                </div>
              </div>
            </div>

            <p className="font-sans text-sm text-navy-400 leading-relaxed mb-5 max-w-3xl">
              All terms are additive in log-odds space. The logistic function &sigma; guarantees the output is a valid probability in (0, 1) regardless of input magnitude. No dimensional mixing, no unbounded outputs.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-navy-500 mb-3">Layer Evidence</div>
                <p className="font-sans text-[12px] text-navy-400 leading-relaxed mb-3">
                  Each signal layer contributes a likelihood ratio via the exponential transform. The sensitivity constant <span className="font-mono text-navy-300">k = 0.45</span> is calibrated so that significance <span className="font-mono text-navy-300">s &isin; [0, 9]</span> spans the full intensity scale against operating priors of 5-10%.
                </p>
                <div className="space-y-1.5 text-[11px] font-mono">
                  <div className="flex justify-between text-navy-500"><span>s = 1, GEO (&rho; = 0.85)</span><span className="text-navy-300">+0.37 log-odds, 10% &rarr; 14%</span></div>
                  <div className="flex justify-between text-navy-500"><span>s = 5, GEO (&rho; = 0.85)</span><span className="text-navy-300">+1.98 log-odds, 10% &rarr; 45%</span></div>
                  <div className="flex justify-between text-navy-500"><span>s = 9, GEO (&rho; = 0.85)</span><span className="text-navy-300">+3.87 log-odds, 10% &rarr; 84%</span></div>
                </div>
              </div>

              <div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-navy-500 mb-3">Independence Discount</div>
                <p className="font-sans text-[12px] text-navy-400 leading-relaxed mb-3">
                  The discount factor <span className="font-mono text-navy-300">d<sub>j</sub></span> prevents double-counting correlated evidence. It uses an evidence-weighted harmonic mean of pairwise independence factors, so layers that barely moved the posterior have negligible influence on the discount.
                </p>
                <div className="border border-navy-800/40 rounded px-3 py-2 font-mono text-[11px] text-navy-400">
                  d<sub>j</sub> = &Sigma;<sub>i&lt;j</sub> ln&Lambda;<sub>i</sub> / &Sigma;<sub>i&lt;j</sub> (ln&Lambda;<sub>i</sub> / D<sub>i,j</sub>)
                </div>
                <p className="font-sans text-[11px] text-navy-500 mt-2 leading-relaxed">
                  D<sub>i,j</sub> &isin; [0, 1] is pairwise independence (1 = fully independent). Reduces to direct pairwise independence when one prior layer dominates the evidence.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-navy-500 mb-3">Convergence Amplification</div>
                <p className="font-sans text-[12px] text-navy-400 leading-relaxed mb-3">
                  Applied as <span className="font-mono text-navy-300">ln &mu;</span> in log-odds. Only primary layers (GEO, MKT, OSI, SYS) count. Narrative overlays contribute zero convergence weight.
                </p>
                <div className="space-y-1.5 text-[11px] font-mono">
                  <div className="flex justify-between text-navy-500"><span>2 primary layers</span><span className="text-navy-300">&mu; = 1.4, +8% at P = 0.5</span></div>
                  <div className="flex justify-between text-navy-500"><span>3 primary layers</span><span className="text-navy-300">&mu; = 2.1, +17% at P = 0.5</span></div>
                  <div className="flex justify-between text-navy-500"><span>4 primary layers</span><span className="text-accent-rose">&mu; = 3.2, +25% at P = 0.5 (rare)</span></div>
                </div>
              </div>

              <div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-navy-500 mb-3">Narrative Bonus</div>
                <p className="font-sans text-[12px] text-navy-400 leading-relaxed mb-3">
                  Calendar and celestial signals are actor-belief context. They tell you what market participants think matters, not what objectively matters. Capped at <span className="font-mono text-navy-300">&beta;<sub>max</sub> = 0.40</span> log-odds.
                </p>
                <div className="border border-navy-800/40 rounded px-3 py-2 font-mono text-[11px] text-navy-400">
                  &beta;<sub>N</sub> = min(0.40, &Sigma;<sub>&ell; &isin; L<sub>N</sub></sub> &rho;<sub>&ell;</sub> &middot; s<sub>&ell;</sub>)
                </div>
                <p className="font-sans text-[11px] text-navy-500 mt-2 leading-relaxed">
                  Maximum probability shift: ~10% at the midpoint, ~6% at extremes. Deliberately small. Removing the narrative overlay entirely does not materially change system accuracy. It exists to capture a real behavioural signal, not to drive outcomes.
                </p>
              </div>
            </div>
          </div>

          {/* Equation 2 */}
          <div ref={eq2Reveal.ref} className={`mb-12 transition-all duration-700 ${eq2Reveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="flex items-center gap-3 mb-4">
              <Brain className="w-4 h-4 text-accent-amber/60" />
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent-amber/80">Equation 2: Forecast Generation</h3>
            </div>

            <div className="border border-navy-700/30 rounded-md bg-navy-900/40 p-6 mb-4">
              <div className="font-mono text-sm text-navy-100 text-center">
                <span className="text-accent-amber">c</span><sub className="text-navy-500">i</sub>
                <span className="text-navy-500"> = </span>
                <span className="text-navy-300">F</span><span className="text-navy-500">(</span>
                <span className="text-accent-cyan">P<sub>n</sub></span>
                <span className="text-navy-500">, </span>
                <span className="text-navy-300">R</span>
                <span className="text-navy-500">, </span>
                <span className="text-navy-300">&Gamma;</span>
                <span className="text-navy-500">, </span>
                <span className="text-navy-300">K</span>
                <span className="text-navy-500">)</span>
                <span className="text-navy-500"> &isin; [0, 1]</span>
              </div>
            </div>

            <p className="font-sans text-sm text-navy-400 leading-relaxed mb-3 max-w-3xl">
              This is the step most systems hide. The posterior probability from Equation 1 is the quantitative anchor, but the final forecast confidence incorporates regime context, game-theoretic structure, and historical precedent. This function is not closed-form because it includes structured analytic tradecraft that resists reduction to algebra. We state this explicitly rather than hiding it behind an arrow.
            </p>
            <p className="font-sans text-sm text-navy-500 leading-relaxed mb-5 max-w-3xl">
              Crucially, this step is constrained: the forecast confidence cannot deviate more than 15 percentage points from the Equation 1 posterior. The AI does not override the quantitative signal; it provides contextual adjustment within bounded limits. Every forecast is then scored by Equation 3 against actual outcomes, so any systematic bias introduced here is caught and penalised in the Brier decomposition.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  symbol: "P\u2099",
                  label: "Posterior Probability",
                  desc: "Output of Equation 1. The quantitative anchor that constrains how far the forecast can deviate.",
                  type: "(0, 1)",
                },
                {
                  symbol: "\u211B",
                  label: "Regime State",
                  desc: "Tuple of volatility regime (calm/elevated/crisis), risk appetite (risk-on/neutral/risk-off/panic), and commodity regime (normal/tight/supply-shock). Wartime classification invalidates active predictions.",
                  type: "Tuple",
                },
                {
                  symbol: "\u0393",
                  label: "Game-Theoretic Structure",
                  desc: "Harsanyi incomplete-information game: actors, type spaces, strategy sets, belief distributions, audience costs (Fearon 1995), and bargaining range. Conflict structurally likely when bargaining range \u2264 0.1.",
                  type: "Game",
                },
                {
                  symbol: "\uD835\uDCA6",
                  label: "Knowledge Base",
                  desc: "Vector store of documents with 1024-dim embeddings (Voyage AI). Retrieved via cosine similarity \u2265 0.7. Contains historical precedents, resolved predictions, analyst notes, and ingested intelligence.",
                  type: "Vector store",
                },
              ].map((input) => (
                <div key={input.symbol} className="border border-navy-800/40 rounded px-4 py-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-sm text-accent-amber">{input.symbol}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-navy-400">{input.label}</span>
                    <span className="ml-auto font-mono text-[9px] text-navy-600">{input.type}</span>
                  </div>
                  <p className="font-sans text-[11px] text-navy-500 leading-relaxed">{input.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Equation 3 */}
          <div ref={eq3Reveal.ref} className={`mb-12 transition-all duration-700 ${eq3Reveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-4 h-4 text-accent-rose/60" />
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent-rose/80">Equation 3: Scored Accountability</h3>
            </div>

            <div className="border border-navy-700/30 rounded-md bg-navy-900/40 p-6 mb-4">
              <div className="font-mono text-sm text-navy-100 text-center">
                <span className="text-accent-rose">BS</span><sub className="text-navy-500">w</sub>
                <span className="text-navy-500"> = </span>
                <span className="text-navy-500">&Sigma;<sub>i</sub></span>
                <span className="text-navy-300"> 2</span><sup className="text-navy-400">-&Delta;t<sub>i</sub>/60</sup>
                <span className="text-navy-500"> (</span>
                <span className="text-accent-amber">c<sub>i</sub></span>
                <span className="text-navy-500"> - </span>
                <span className="text-navy-300">o<sub>i</sub></span>
                <span className="text-navy-500">)</span><sup className="text-navy-400">2</sup>
                <span className="text-navy-500"> / </span>
                <span className="text-navy-500">&Sigma;<sub>i</sub></span>
                <span className="text-navy-300"> 2</span><sup className="text-navy-400">-&Delta;t<sub>i</sub>/60</sup>
              </div>
            </div>

            <p className="font-sans text-sm text-navy-400 leading-relaxed mb-5 max-w-3xl">
              Decay-weighted Brier score with a 60-day half-life. Penalises overconfidence, rewards calibration. Recent predictions count more than older ones. This is a proper scoring rule: the only way to optimise it is to state your true beliefs.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-navy-500 mb-2">Outcome Encoding</div>
                <div className="space-y-1 text-[11px] font-mono">
                  <div className="flex justify-between text-navy-500"><span>Confirmed</span><span className="text-accent-emerald">o = 1.0</span></div>
                  <div className="flex justify-between text-navy-500"><span>Partial</span><span className="text-accent-amber">o = 0.5</span></div>
                  <div className="flex justify-between text-navy-500"><span>Denied</span><span className="text-accent-rose">o = 0.0</span></div>
                </div>
              </div>
              <div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-navy-500 mb-2">Interpretation</div>
                <div className="space-y-1 text-[11px] font-mono">
                  <div className="flex justify-between text-navy-500"><span>BS = 0.00</span><span className="text-accent-emerald">Perfect</span></div>
                  <div className="flex justify-between text-navy-500"><span>BS = 0.25</span><span className="text-navy-400">Coin flip</span></div>
                  <div className="flex justify-between text-navy-500"><span>BS = 1.00</span><span className="text-accent-rose">Maximally wrong</span></div>
                </div>
              </div>
              <div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-navy-500 mb-2">BIN Decomposition</div>
                <p className="font-sans text-[11px] text-navy-500 leading-relaxed">
                  Brier decomposes into Bias (systematic calibration error), Noise (confidence scatter), and Information (discrimination power). Positive Information means the signal framework has predictive value.
                </p>
              </div>
            </div>
          </div>

          {/* Constants Table */}
          <div ref={constantsReveal.ref} className={`transition-all duration-700 ${constantsReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-4 h-4 text-navy-500" />
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-navy-400">System Constants</h3>
            </div>

            <div className="border border-navy-700/30 rounded-md overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-4 py-2.5 bg-navy-800/30 border-b border-navy-700/20">
                <div className="col-span-2 font-mono text-[9px] uppercase tracking-wider text-navy-500">Symbol</div>
                <div className="col-span-2 font-mono text-[9px] uppercase tracking-wider text-navy-500">Value</div>
                <div className="col-span-8 font-mono text-[9px] uppercase tracking-wider text-navy-500">Definition</div>
              </div>
              {[
                { symbol: "k", value: "0.45", def: "LR sensitivity. Calibrated so s \u2208 [0, 9] spans full posterior range against 5-10% priors." },
                { symbol: "\u03C1\u2097", value: "0.35 - 0.85", def: "Layer reliability. GEO: 0.85, OSI: 0.80, MKT: 0.75, CAL: 0.45, CEL: 0.35." },
                { symbol: "D\u1D62,\u2C7C", value: "[0, 1]", def: "Pairwise independence matrix. Symmetric. 1 = fully independent, 0 = fully correlated." },
                { symbol: "\u03BC(n\u209A)", value: "{1.0, 1.4, 2.1, 3.2}", def: "Convergence amplifier by distinct primary layer count within 3-day window." },
                { symbol: "\u03B2\u2098\u2090\u2093", value: "0.40 log-odds", def: "Narrative overlay cap. Max ~10% probability shift at midpoint." },
                { symbol: "P\u2080", value: "0.03 - 0.12", def: "Scenario base rates. Military escalation: 0.05, market disruption: 0.12, regime change: 0.03." },
                { symbol: "\u03C4", value: "60 days", def: "Brier score decay half-life. Recent predictions weighted more heavily." },
                { symbol: "s\u2C7C", value: "[0, 9]", def: "Event significance. Confirming evidence only. Disconfirmation via decay to prior." },
              ].map((row, i) => (
                <div key={row.symbol} className={`grid grid-cols-12 gap-4 px-4 py-2.5 ${i % 2 === 0 ? "bg-navy-900/20" : ""}`}>
                  <div className="col-span-2 font-mono text-[11px] text-accent-cyan">{row.symbol}</div>
                  <div className="col-span-2 font-mono text-[11px] text-navy-200">{row.value}</div>
                  <div className="col-span-8 font-sans text-[11px] text-navy-400 leading-relaxed">{row.def}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-start gap-3">
              <AlertTriangle className="w-3.5 h-3.5 text-navy-600 flex-shrink-0 mt-0.5" />
              <p className="font-sans text-xs text-navy-500 leading-relaxed">
                All constants are implemented in production code. Initial values were set from domain knowledge and calibrated against the first cohort of resolved predictions. They are living values: as the prediction record grows, k and layer reliabilities are recalibrated against out-of-sample outcomes. Current performance against these constants is visible on the <Link href="/research/prediction-accuracy" className="text-accent-cyan hover:text-accent-cyan/80 transition-colors underline underline-offset-2">live prediction record</Link>. Signal decay models disconfirmation as reversion to prior rather than negative evidence, a deliberate design choice that bounds the likelihood ratio to [1, &infin;) for the current signal space.
              </p>
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
                  "Publicly auditable: every prediction is timestamped, its confidence is stated before the outcome, and the full record is published live",
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { title: "Black Swan Blindness", body: "Truly unprecedented events have no historical pattern to match against. The system can detect unusual conditions but cannot anticipate events with no precedent." },
                { title: "Data Latency", body: "Some signal layers operate on delayed data. Geopolitical and OSINT signals may lag minutes to hours behind real-time events. Market data varies by feed tier." },
                { title: "Calibration Drift", body: "Market regimes change. Correlations that held during one period may break down in the next. The feedback loop mitigates this but cannot eliminate it entirely." },
                { title: "Small Sample Size", body: "The prediction record is still young. Brier scores and calibration curves become more reliable with hundreds of resolved predictions. We publish confidence intervals on all metrics and flag when sample sizes are insufficient for reliable conclusions." },
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
