"use client";

import { useState, useEffect, useRef } from "react";

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

// ── Animated number ──
function AnimNum({ value, suffix = "" }: { value: string; suffix?: string }) {
  const [display, setDisplay] = useState(value);
  const [scrambling, setScrambling] = useState(true);
  const chars = "0123456789.x";

  useEffect(() => {
    if (!scrambling) return;
    let frame = 0;
    const maxFrames = 12;
    const interval = setInterval(() => {
      frame++;
      if (frame >= maxFrames) {
        setDisplay(value);
        setScrambling(false);
        clearInterval(interval);
        return;
      }
      setDisplay(
        value
          .split("")
          .map((ch, i) => (i < Math.floor((frame / maxFrames) * value.length) ? ch : chars[Math.floor(Math.random() * chars.length)]))
          .join("")
      );
    }, 40);
    return () => clearInterval(interval);
  }, [value, scrambling, chars]);

  return <span>{display}{suffix}</span>;
}

// ── Pulse ring SVG ──
function PulseRing({ color, size = 120, delay = 0 }: { color: string; size?: number; delay?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className="absolute opacity-20" style={{ animationDelay: `${delay}ms` }}>
      <circle cx="60" cy="60" r="50" fill="none" stroke={color} strokeWidth="1" opacity="0.6">
        <animate attributeName="r" from="20" to="55" dur="3s" begin={`${delay}ms`} repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.8" to="0" dur="3s" begin={`${delay}ms`} repeatCount="indefinite" />
      </circle>
      <circle cx="60" cy="60" r="20" fill="none" stroke={color} strokeWidth="0.5" opacity="0.4">
        <animate attributeName="r" from="10" to="45" dur="3s" begin={`${delay + 800}ms`} repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.6" to="0" dur="3s" begin={`${delay + 800}ms`} repeatCount="indefinite" />
      </circle>
      <circle cx="60" cy="60" r="4" fill={color} opacity="0.9" />
    </svg>
  );
}

// ── Scan line background ──
function ScanLines() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-[0.03]">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(6,182,212,0.15) 2px, rgba(6,182,212,0.15) 3px)",
          backgroundSize: "100% 4px",
          animation: "scan-drift 8s linear infinite",
        }}
      />
    </div>
  );
}

// ── Data ──

const primaryLayers = [
  {
    tag: "GEO",
    name: "Geopolitical",
    color: "#ef4444",
    description: "Conflicts, treaties, sanctions, regime changes, military deployments, and diplomatic shifts. Sourced from government publications, defense intelligence, and verified reporting networks.",
    examples: ["Troop mobilisation along contested borders", "Sanctions packages targeting energy exports", "Treaty withdrawals or renegotiations"],
    decayRate: "Days to years",
    decayLabel: "Variable",
    isNarrative: false,
  },
  {
    tag: "MKT",
    name: "Market",
    color: "#06b6d4",
    description: "Price action anomalies, unusual volume, options flow, dark pool activity, credit spreads, and cross-asset divergences. The quantitative backbone of signal detection.",
    examples: ["Unusual put/call ratio spikes", "Credit default swap widening", "Cross-asset correlation breakdowns"],
    decayRate: "Hours to days",
    decayLabel: "Fast",
    isNarrative: false,
  },
  {
    tag: "OSI",
    name: "OSINT",
    color: "#10b981",
    description: "Open source intelligence from social media, satellite imagery, shipping data, flight tracking, and news wire services. Real-time ground truth that validates or contradicts signals from other layers.",
    examples: ["Military aircraft transponder anomalies", "Shipping route diversions near conflict zones", "GDELT event spike detection"],
    decayRate: "Days to weeks",
    decayLabel: "Medium",
    isNarrative: false,
  },
];

const narrativeLayers = [
  {
    tag: "CAL",
    name: "Calendar (Narrative Overlay)",
    color: "#f59e0b",
    description: "Hebrew holidays, Islamic calendar events, FOMC meetings, options expiry dates. Actor-belief context only, max 0.5 bonus, no convergence weight. Useful for understanding why certain actors may behave differently around specific dates.",
    examples: ["FOMC rate decisions and dot-plot releases", "Quadruple witching / options expiry", "Hebrew calendar holidays and sabbatical cycles"],
    decayRate: "Weeks to months",
    decayLabel: "Slow",
    isNarrative: true,
  },
  {
    tag: "CEL",
    name: "Celestial (Narrative Overlay)",
    color: "#8b5cf6",
    description: "Eclipses, planetary alignments, lunar cycles, and solar activity. Actor-belief context only, max 0.5 bonus, no convergence weight. Tracked because some market participants and political actors incorporate these into their decision-making.",
    examples: ["Solar and lunar eclipses", "Mercury retrograde periods", "Sunspot cycle peaks and troughs"],
    decayRate: "Weeks to months",
    decayLabel: "Slow",
    isNarrative: true,
  },
];

const signalLayers = [...primaryLayers, ...narrativeLayers];

const intensityLevels = [
  { level: 1, label: "Background Noise", color: "#3b82f6", description: "Routine events with minimal predictive value. Standard diplomatic communications, scheduled policy announcements." },
  { level: 2, label: "Low Activity", color: "#22c55e", description: "Events that deviate slightly from baseline. Unusual troop movements, unexpected central bank commentary." },
  { level: 3, label: "Elevated", color: "#eab308", description: "Clear departure from normal patterns. Multiple corroborating data points across at least two signal layers." },
  { level: 4, label: "High Alert", color: "#f97316", description: "Strong convergence across three or more layers. Historical pattern matching indicates significant probability of disruption." },
  { level: 5, label: "Critical Convergence", color: "#ef4444", description: "Maximum signal density. Rare alignment across all layers. Historically associated with regime-changing events." },
];

const amplification = [
  { layers: 2, label: "Noteworthy", width: 35 },
  { layers: 3, label: "Significant", width: 53 },
  { layers: 4, label: "Critical", width: 100 },
];

// ── Active layer selector for convergence diagram ──
function ConvergenceDiagram() {
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set());
  // Only primary layers count for convergence
  const primaryActive = Array.from(activeLayers).filter(tag => !narrativeLayers.some(l => l.tag === tag));
  const narrativeActive = Array.from(activeLayers).filter(tag => narrativeLayers.some(l => l.tag === tag));
  const convergenceCount = primaryActive.length;
  const convergenceLabel = convergenceCount <= 1 ? "Baseline" : amplification.find(a => a.layers === convergenceCount)?.label || "Baseline";

  const toggle = (tag: string) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  return (
    <div className="relative">
      {/* Central convergence indicator */}
      <div className="flex items-center justify-center mb-8">
        <div className="relative flex items-center justify-center w-32 h-32">
          {/* Rings for active layers */}
          {signalLayers.map((layer, i) => {
            const active = activeLayers.has(layer.tag);
            const radius = 24 + i * 8;
            return (
              <svg key={layer.tag} className="absolute inset-0" viewBox="0 0 128 128">
                <circle
                  cx="64" cy="64" r={radius}
                  fill="none"
                  stroke={layer.color}
                  strokeWidth={active ? 2 : 0.5}
                  opacity={active ? 0.8 : 0.15}
                  strokeDasharray={active ? "none" : "2 4"}
                  style={{ transition: "all 0.5s ease" }}
                >
                  {active && (
                    <animate attributeName="stroke-opacity" values="0.8;0.4;0.8" dur="2s" repeatCount="indefinite" />
                  )}
                </circle>
              </svg>
            );
          })}
          {/* Center score */}
          <div className="relative z-10 flex flex-col items-center">
            <span
              className="font-mono text-2xl font-bold transition-all duration-500"
              style={{ color: convergenceCount >= 4 ? "#ef4444" : convergenceCount >= 3 ? "#f59e0b" : convergenceCount >= 2 ? "#10b981" : "#5c5c5c" }}
            >
              {convergenceLabel}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-navy-400">
              {convergenceCount <= 1 ? "baseline" : `${convergenceCount} primary`}
            </span>
            {narrativeActive.length > 0 && (
              <span className="font-mono text-[8px] uppercase tracking-widest text-navy-600 mt-0.5">
                +{narrativeActive.length} overlay
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Layer toggles */}
      <div className="flex flex-wrap justify-center gap-2">
        {signalLayers.map((layer) => {
          const active = activeLayers.has(layer.tag);
          return (
            <button
              key={layer.tag}
              onClick={() => toggle(layer.tag)}
              className="group relative px-4 py-2 rounded border font-mono text-xs uppercase tracking-widest transition-all duration-300"
              style={{
                borderColor: active ? layer.color : "rgba(31,31,31,0.8)",
                backgroundColor: active ? `${layer.color}10` : "rgba(10,10,10,0.6)",
                color: active ? layer.color : "#5c5c5c",
                boxShadow: active ? `0 0 20px ${layer.color}15, inset 0 1px 0 ${layer.color}10` : "none",
              }}
            >
              <span className="relative z-10">{layer.tag}</span>
              {active && (
                <div
                  className="absolute inset-0 rounded opacity-5"
                  style={{ backgroundColor: layer.color }}
                />
              )}
            </button>
          );
        })}
      </div>

      <p className="text-center text-[11px] font-mono text-navy-500 mt-4">
        Toggle layers to see convergence classification. Only primary layers (GEO, MKT, OSI) drive the convergence level.
      </p>
    </div>
  );
}

// ── Main page ──
export default function SignalTheoryPage() {
  const hero = useReveal(0.1);
  const layersSection = useReveal();
  const intensitySection = useReveal();
  const decaySection = useReveal();
  const convergenceSection = useReveal();
  const formulaSection = useReveal();

  return (
    <>
      <style jsx global>{`
        @keyframes scan-drift {
          from { transform: translateY(0); }
          to { transform: translateY(100px); }
        }
        @keyframes signal-trace {
          0% { stroke-dashoffset: 400; }
          100% { stroke-dashoffset: -400; }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        .reveal-up { opacity: 0; transform: translateY(16px); transition: all 0.7s cubic-bezier(0.16, 1, 0.3, 1); }
        .reveal-up.visible { opacity: 1; transform: translateY(0); }
        .stagger-1 { transition-delay: 0.1s; }
        .stagger-2 { transition-delay: 0.2s; }
        .stagger-3 { transition-delay: 0.3s; }
        .stagger-4 { transition-delay: 0.4s; }
        .stagger-5 { transition-delay: 0.5s; }
        .stagger-6 { transition-delay: 0.6s; }
      `}</style>

      <ScanLines />

      <main className="relative z-10 min-h-screen pt-20 pb-24">
        {/* ── Hero ── */}
        <div ref={hero.ref} className="max-w-5xl mx-auto px-6">
          <div className={`reveal-up ${hero.visible ? "visible" : ""}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 max-w-[60px] bg-gradient-to-r from-transparent to-accent-cyan/40" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent-cyan/70">Research / Signal Theory</span>
              <div className="h-px flex-1 max-w-[60px] bg-gradient-to-l from-transparent to-accent-cyan/40" />
            </div>
          </div>

          <div className={`reveal-up stagger-1 ${hero.visible ? "visible" : ""}`}>
            <h1 className="text-center font-sans text-3xl md:text-4xl font-bold text-navy-100 tracking-tight leading-tight">
              Signal Theory
            </h1>
          </div>

          <div className={`reveal-up stagger-2 ${hero.visible ? "visible" : ""}`}>
            <p className="text-center font-sans text-sm md:text-base text-navy-400 mt-4 max-w-2xl mx-auto leading-relaxed">
              The theoretical framework behind NEXUS signal detection and convergence analysis.
              How independent data layers combine to surface regime-changing events before they become consensus.
            </p>
          </div>

          {/* Signal pulse visualization */}
          <div className={`reveal-up stagger-3 ${hero.visible ? "visible" : ""} flex justify-center mt-10 mb-6`}>
            <div className="relative w-full max-w-3xl h-20">
              <svg viewBox="0 0 800 80" className="w-full h-full" preserveAspectRatio="none">
                {/* Baseline */}
                <line x1="0" y1="40" x2="800" y2="40" stroke="#1f1f1f" strokeWidth="1" />
                {/* Signal trace */}
                <path
                  d="M0,40 L100,40 L120,40 L140,38 L160,42 L180,35 L200,45 L210,20 L220,60 L230,15 L240,65 L250,10 L260,55 L270,30 L280,40 L300,40 L400,40 L420,38 L440,42 L450,25 L460,55 L470,18 L480,52 L490,40 L550,40 L600,40 L620,35 L640,45 L650,22 L660,58 L670,40 L700,40 L800,40"
                  fill="none"
                  stroke="url(#signal-gradient)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeDasharray="200"
                  style={{ animation: "signal-trace 6s linear infinite" }}
                />
                {/* Glow behind peaks */}
                <path
                  d="M0,40 L100,40 L120,40 L140,38 L160,42 L180,35 L200,45 L210,20 L220,60 L230,15 L240,65 L250,10 L260,55 L270,30 L280,40 L300,40 L400,40 L420,38 L440,42 L450,25 L460,55 L470,18 L480,52 L490,40 L550,40 L600,40 L620,35 L640,45 L650,22 L660,58 L670,40 L700,40 L800,40"
                  fill="none"
                  stroke="url(#signal-gradient)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  opacity="0.15"
                  filter="blur(4px)"
                  strokeDasharray="200"
                  style={{ animation: "signal-trace 6s linear infinite" }}
                />
                <defs>
                  <linearGradient id="signal-gradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="35%" stopColor="#ef4444" />
                    <stop offset="55%" stopColor="#f59e0b" />
                    <stop offset="80%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>

        {/* ── Section 01: What is a Signal ── */}
        <section className="max-w-5xl mx-auto px-6 mt-16">
          <div ref={layersSection.ref}>
            <div className={`reveal-up ${layersSection.visible ? "visible" : ""}`}>
              <div className="flex items-center gap-4 mb-6">
                <span className="font-mono text-[10px] text-navy-500 tracking-widest">01</span>
                <div className="h-px flex-1 bg-navy-800" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-navy-400">What is a Signal</span>
                <div className="h-px flex-1 bg-navy-800" />
              </div>
            </div>

            <div className={`reveal-up stagger-1 ${layersSection.visible ? "visible" : ""}`}>
              <div className="relative rounded-lg border border-navy-700/30 bg-navy-900/40 backdrop-blur-sm p-6 md:p-8 overflow-hidden">
                {/* Subtle corner accents */}
                <div className="absolute top-0 left-0 w-12 h-px bg-gradient-to-r from-accent-cyan/40 to-transparent" />
                <div className="absolute top-0 left-0 h-12 w-px bg-gradient-to-b from-accent-cyan/40 to-transparent" />
                <div className="absolute bottom-0 right-0 w-12 h-px bg-gradient-to-l from-accent-cyan/40 to-transparent" />
                <div className="absolute bottom-0 right-0 h-12 w-px bg-gradient-to-t from-accent-cyan/40 to-transparent" />

                <p className="font-sans text-sm leading-relaxed text-navy-300">
                  In the NEXUS context, a <span className="text-navy-100 font-medium">signal</span> is a discrete event or data point
                  that indicates a potential geopolitical or market shift. Signals are not predictions. They are observable
                  phenomena, fragments of information drawn from structured and unstructured sources, that carry forward-looking
                  implications when analysed in combination.
                </p>
                <p className="mt-4 font-sans text-sm leading-relaxed text-navy-300">
                  A single signal in isolation is noise. Multiple signals converging across independent layers constitute
                  a pattern worth acting on. The NEXUS engine continuously ingests, scores, and correlates signals to
                  surface these <span className="text-accent-cyan">convergence events</span> before they become consensus.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 02: Signal Layers ── */}
        <section className="max-w-5xl mx-auto px-6 mt-20">
          <div ref={intensitySection.ref}>
            <div className={`reveal-up ${intensitySection.visible ? "visible" : ""}`}>
              <div className="flex items-center gap-4 mb-3">
                <span className="font-mono text-[10px] text-navy-500 tracking-widest">02</span>
                <div className="h-px flex-1 bg-navy-800" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-navy-400">Signal Layers</span>
                <div className="h-px flex-1 bg-navy-800" />
              </div>
              <p className="font-sans text-sm text-navy-400 mb-4 text-center max-w-xl mx-auto">
                NEXUS operates across four primary signal layers plus a narrative overlay. Primary layers drive convergence scoring. Narrative layers provide actor-belief context only.
              </p>
              <p className="font-sans text-[11px] text-accent-amber/80 text-center max-w-xl mx-auto border border-accent-amber/20 rounded px-3 py-2 bg-accent-amber/[0.03] mb-8">
                Calendar and celestial overlays are narrative/actor-belief context only, not independent predictive signals.
              </p>
            </div>

            <div className="grid gap-3">
              {signalLayers.map((layer, i) => (
                <div
                  key={layer.tag}
                  className={`reveal-up stagger-${Math.min(i + 1, 5)} ${intensitySection.visible ? "visible" : ""}`}
                >
                  {layer.isNarrative && i === primaryLayers.length && (
                    <div className="flex items-center gap-3 mb-3 mt-4">
                      <div className="h-px flex-1 bg-navy-800/60" />
                      <span className="font-mono text-[9px] uppercase tracking-widest text-navy-600">Narrative / Actor-Belief Overlay</span>
                      <div className="h-px flex-1 bg-navy-800/60" />
                    </div>
                  )}
                  <div
                    className={`group relative rounded-lg border bg-navy-900/30 backdrop-blur-sm p-5 transition-all duration-500 overflow-hidden ${
                      layer.isNarrative
                        ? "border-navy-800/20 opacity-70 hover:opacity-90 hover:border-navy-700/40"
                        : "border-navy-700/20 hover:border-navy-600/40"
                    }`}
                  >
                    {/* Left color accent */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-px transition-all duration-500 group-hover:w-[2px]"
                      style={{ backgroundColor: layer.color, opacity: 0.5 }}
                    />
                    {/* Glow on hover */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-24 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ background: `linear-gradient(to right, ${layer.color}08, transparent)` }}
                    />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-start gap-4">
                      <div className="flex items-center gap-3 md:w-40 shrink-0">
                        <span
                          className="font-mono text-[11px] font-bold tracking-wider"
                          style={{ color: layer.color }}
                        >
                          {layer.tag}
                        </span>
                        <div>
                          <span className="font-mono text-xs font-semibold text-navy-100">{layer.name}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: layer.color, opacity: 0.7 }} />
                            <span className="font-mono text-[9px] text-navy-500 uppercase tracking-wider">{layer.decayLabel} decay</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1">
                        <p className="font-sans text-sm text-navy-400 leading-relaxed">{layer.description}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {layer.examples.map((ex) => (
                            <span key={ex} className="inline-flex items-center gap-1.5 font-mono text-[10px] text-navy-500 bg-navy-800/60 rounded px-2 py-1 border border-navy-700/20">
                              <span className="w-1 h-1 rounded-full bg-navy-600 shrink-0" />
                              {ex}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 03: Intensity Scoring ── */}
        <section className="max-w-5xl mx-auto px-6 mt-20">
          <div ref={decaySection.ref}>
            <div className={`reveal-up ${decaySection.visible ? "visible" : ""}`}>
              <div className="flex items-center gap-4 mb-3">
                <span className="font-mono text-[10px] text-navy-500 tracking-widest">03</span>
                <div className="h-px flex-1 bg-navy-800" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-navy-400">Intensity Scoring</span>
                <div className="h-px flex-1 bg-navy-800" />
              </div>
              <p className="font-sans text-sm text-navy-400 mb-8 text-center max-w-xl mx-auto">
                Every signal receives an intensity score from 1 to 5. The score reflects standalone significance
                and correlation density with other active signals.
              </p>
            </div>

            {/* Visual intensity bar */}
            <div className={`reveal-up stagger-1 ${decaySection.visible ? "visible" : ""}`}>
              <div className="relative rounded-lg border border-navy-700/20 bg-navy-900/30 backdrop-blur-sm p-6 overflow-hidden">
                <div className="space-y-4">
                  {intensityLevels.map((level) => (
                    <div key={level.level} className="group flex items-start gap-4">
                      {/* Number + bar */}
                      <div className="flex items-center gap-3 shrink-0 w-48">
                        <span
                          className="font-mono text-xl font-bold w-8 text-right tabular-nums"
                          style={{ color: level.color }}
                        >
                          {level.level}
                        </span>
                        <div className="flex-1 h-1.5 rounded-full bg-navy-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{
                              width: `${level.level * 20}%`,
                              backgroundColor: level.color,
                              boxShadow: `0 0 8px ${level.color}40`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-widest" style={{ color: level.color }}>
                          {level.label}
                        </span>
                        <p className="font-sans text-xs text-navy-400 mt-0.5 leading-relaxed">{level.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 04: Signal Decay ── */}
        <section className="max-w-5xl mx-auto px-6 mt-20">
          <div ref={convergenceSection.ref}>
            <div className={`reveal-up ${convergenceSection.visible ? "visible" : ""}`}>
              <div className="flex items-center gap-4 mb-3">
                <span className="font-mono text-[10px] text-navy-500 tracking-widest">04</span>
                <div className="h-px flex-1 bg-navy-800" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-navy-400">Signal Decay</span>
                <div className="h-px flex-1 bg-navy-800" />
              </div>
            </div>

            <div className={`reveal-up stagger-1 ${convergenceSection.visible ? "visible" : ""}`}>
              <div className="relative rounded-lg border border-navy-700/20 bg-navy-900/30 backdrop-blur-sm p-6 overflow-hidden">
                <p className="font-sans text-sm text-navy-300 leading-relaxed mb-6">
                  Signals are not permanent. Every signal has a half-life, a duration after which its relevance decays by 50%.
                  The decay function follows an exponential curve:
                </p>

                {/* Formula */}
                <div className="flex justify-center mb-6">
                  <code className="font-mono text-sm text-navy-200 bg-navy-800/60 rounded px-4 py-2.5">
                    I(t) = I<sub>0</sub> &middot; e<sup>-&lambda;t</sup>
                  </code>
                </div>

                {/* Decay grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Fast", time: "Hours to days", desc: "Market signals lose predictive power as they get priced in.", color: "#06b6d4" },
                    { label: "Medium", time: "Days to weeks", desc: "OSINT and geopolitical events remain relevant until resolved.", color: "#10b981" },
                    { label: "Slow", time: "Weeks to months", desc: "Calendar and celestial signals build influence as the date approaches.", color: "#f59e0b" },
                    { label: "Persistent", time: "Months to years", desc: "Structural shifts create long-duration signal fields.", color: "#ef4444" },
                  ].map((decay) => (
                    <div key={decay.label} className="rounded border border-navy-700/20 bg-navy-800/30 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: decay.color }} />
                        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-navy-200">{decay.label}</span>
                      </div>
                      <span className="font-mono text-[9px] text-navy-500 uppercase tracking-wider">{decay.time}</span>
                      <p className="font-sans text-xs text-navy-400 mt-2 leading-relaxed">{decay.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 05: Cross-Layer Amplification ── */}
        <section className="max-w-5xl mx-auto px-6 mt-20">
          <div ref={formulaSection.ref}>
            <div className={`reveal-up ${formulaSection.visible ? "visible" : ""}`}>
              <div className="flex items-center gap-4 mb-3">
                <span className="font-mono text-[10px] text-navy-500 tracking-widest">05</span>
                <div className="h-px flex-1 bg-navy-800" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-navy-400">Cross-Layer Amplification</span>
                <div className="h-px flex-1 bg-navy-800" />
              </div>
            </div>

            <div className={`reveal-up stagger-1 ${formulaSection.visible ? "visible" : ""}`}>
              <div className="relative rounded-lg border border-navy-700/20 bg-navy-900/30 backdrop-blur-sm p-6 overflow-hidden">
                <p className="font-sans text-sm text-navy-300 leading-relaxed mb-2">
                  The core insight of NEXUS signal theory: when signals from independent primary layers converge temporally,
                  their combined intensity is greater than the sum of parts. Only primary layers (GEO, MKT, OSI, and additional
                  data layers) contribute to convergence amplification. Narrative overlays (CAL/CEL) provide actor-belief
                  context but do not count toward convergence weight.
                </p>
                <p className="font-sans text-sm text-navy-400 leading-relaxed mb-8">
                  Full four-layer primary convergence is exceptionally rare. When it occurs, the system flags a Level 5 critical
                  convergence event regardless of individual signal intensities. Historical back-testing shows these
                  events precede major market dislocations within a 72-hour window.
                </p>

                {/* Interactive convergence diagram */}
                <ConvergenceDiagram />

                {/* Amplification table */}
                <div className="mt-8 rounded border border-navy-700/20 bg-navy-800/20 overflow-hidden">
                  <div className="grid grid-cols-3 gap-px text-center font-mono text-[10px] uppercase tracking-widest text-navy-500 bg-navy-700/10">
                    <div className="bg-navy-900/60 py-2.5 px-3">Layers</div>
                    <div className="bg-navy-900/60 py-2.5 px-3">Classification</div>
                    <div className="bg-navy-900/60 py-2.5 px-3">Intensity</div>
                  </div>
                  {amplification.map((row) => (
                    <div key={row.layers} className="grid grid-cols-3 gap-px text-center border-t border-navy-700/10">
                      <div className="bg-navy-900/30 py-3 font-mono text-xs text-navy-300">{row.layers}</div>
                      <div className="bg-navy-900/30 py-3 font-mono text-xs font-bold" style={{ color: row.layers >= 4 ? "#ef4444" : row.layers >= 3 ? "#f59e0b" : "#10b981" }}>{row.label}</div>
                      <div className="bg-navy-900/30 py-3 px-4">
                        <div className="w-full h-1.5 rounded-full bg-navy-800 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${row.width}%`,
                              backgroundColor: row.layers >= 4 ? "#ef4444" : row.layers >= 3 ? "#f59e0b" : "#10b981",
                              boxShadow: `0 0 6px ${row.layers >= 4 ? "#ef444440" : row.layers >= 3 ? "#f59e0b40" : "#10b98140"}`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="max-w-5xl mx-auto px-6 mt-20">
          <div className="relative rounded-lg border border-navy-700/20 bg-navy-900/20 backdrop-blur-sm p-10 text-center overflow-hidden">
            {/* Background pulse */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <PulseRing color="#06b6d4" size={300} delay={0} />
              <PulseRing color="#06b6d4" size={300} delay={1500} />
            </div>

            <div className="relative z-10">
              <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-navy-200 mb-3">
                Explore Live Signals
              </h3>
              <p className="font-sans text-sm text-navy-400 mb-6 max-w-md mx-auto leading-relaxed">
                Monitor real-time signal detection across all primary layers with intensity scoring and convergence alerts.
              </p>
              <a
                href="/register"
                className="group inline-flex items-center gap-2 px-6 py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.06] font-mono text-[11px] uppercase tracking-widest text-navy-100 hover:bg-white/[0.1] hover:border-white/[0.15] transition-all duration-300"
              >
                Request Access
                <svg className="w-3 h-3 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
