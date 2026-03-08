"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Crosshair,
  Shield,
  Swords,
  Scale,
  GitBranch,
  Radio,
  ChevronRight,
} from "lucide-react";

// ── Scroll reveal ──
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

// ── Interactive payoff matrix ──
function PayoffMatrix() {
  const [hovered, setHovered] = useState<string | null>(null);

  const cells = [
    {
      id: "cc",
      row: "Cooperate",
      col: "Cooperate",
      a: "+3",
      b: "+3",
      label: "Mutual restraint",
      color: "#10b981",
      desc: "Both actors maintain status quo. Optimal collective outcome but vulnerable to defection.",
    },
    {
      id: "cd",
      row: "Cooperate",
      col: "Defect",
      a: "-5",
      b: "+5",
      label: "Exploited",
      color: "#ef4444",
      desc: "Actor A cooperates while B defects. A bears maximum cost, B captures maximum advantage.",
    },
    {
      id: "dc",
      row: "Defect",
      col: "Cooperate",
      a: "+5",
      b: "-5",
      label: "Aggressor gains",
      color: "#ef4444",
      desc: "Actor A defects while B cooperates. Mirror of the exploitation scenario.",
    },
    {
      id: "dd",
      row: "Defect",
      col: "Defect",
      a: "-2",
      b: "-2",
      label: "Mutual loss",
      color: "#f59e0b",
      desc: "Both actors defect. Suboptimal for both, but this is the Nash Equilibrium - neither can improve by changing alone.",
      isNash: true,
    },
  ];

  const activeCell = cells.find((c) => c.id === hovered);

  return (
    <div>
      <div className="grid grid-cols-[140px_1fr_1fr] gap-px bg-navy-700/20 rounded-lg overflow-hidden">
        {/* Header row */}
        <div className="bg-navy-900/80 p-4" />
        <div className="bg-navy-900/80 p-4 text-center">
          <span className="font-mono text-[10px] uppercase tracking-widest text-navy-500">
            Actor B
          </span>
          <div className="font-mono text-xs font-semibold text-navy-200 mt-1">
            Cooperate
          </div>
        </div>
        <div className="bg-navy-900/80 p-4 text-center">
          <span className="font-mono text-[10px] uppercase tracking-widest text-navy-500">
            Actor B
          </span>
          <div className="font-mono text-xs font-semibold text-navy-200 mt-1">
            Defect
          </div>
        </div>

        {/* Row 1: A Cooperates */}
        <div className="bg-navy-900/80 p-4 flex items-center">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-navy-500">
              Actor A
            </span>
            <div className="font-mono text-xs font-semibold text-navy-200 mt-1">
              Cooperate
            </div>
          </div>
        </div>
        {cells.slice(0, 2).map((cell) => (
          <div
            key={cell.id}
            className="relative bg-navy-900/40 p-5 text-center cursor-pointer transition-all duration-300"
            style={{
              backgroundColor:
                hovered === cell.id ? `${cell.color}08` : undefined,
              boxShadow:
                hovered === cell.id
                  ? `inset 0 0 30px ${cell.color}08`
                  : undefined,
            }}
            onMouseEnter={() => setHovered(cell.id)}
            onMouseLeave={() => setHovered(null)}
          >
            <div
              className="font-mono text-lg font-bold transition-colors duration-300"
              style={{ color: hovered === cell.id ? cell.color : "#a3a3a3" }}
            >
              {cell.a}, {cell.b}
            </div>
            <div className="font-sans text-[10px] text-navy-500 mt-1">
              {cell.label}
            </div>
            {cell.isNash && (
              <div className="absolute top-2 right-2">
                <span className="font-mono text-[8px] uppercase tracking-wider text-accent-amber bg-accent-amber/10 border border-accent-amber/20 px-1.5 py-0.5 rounded">
                  Nash
                </span>
              </div>
            )}
          </div>
        ))}

        {/* Row 2: A Defects */}
        <div className="bg-navy-900/80 p-4 flex items-center">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-navy-500">
              Actor A
            </span>
            <div className="font-mono text-xs font-semibold text-navy-200 mt-1">
              Defect
            </div>
          </div>
        </div>
        {cells.slice(2, 4).map((cell) => (
          <div
            key={cell.id}
            className="relative bg-navy-900/40 p-5 text-center cursor-pointer transition-all duration-300"
            style={{
              backgroundColor:
                hovered === cell.id ? `${cell.color}08` : undefined,
              boxShadow:
                hovered === cell.id
                  ? `inset 0 0 30px ${cell.color}08`
                  : undefined,
            }}
            onMouseEnter={() => setHovered(cell.id)}
            onMouseLeave={() => setHovered(null)}
          >
            <div
              className="font-mono text-lg font-bold transition-colors duration-300"
              style={{ color: hovered === cell.id ? cell.color : "#a3a3a3" }}
            >
              {cell.a}, {cell.b}
            </div>
            <div className="font-sans text-[10px] text-navy-500 mt-1">
              {cell.label}
            </div>
            {cell.isNash && (
              <div className="absolute top-2 right-2">
                <span className="font-mono text-[8px] uppercase tracking-wider text-accent-amber bg-accent-amber/10 border border-accent-amber/20 px-1.5 py-0.5 rounded">
                  Nash
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Hover detail */}
      <div className="mt-4 h-16 flex items-start">
        {activeCell ? (
          <div className="flex items-start gap-3">
            <div
              className="w-1 h-8 rounded-full mt-0.5 shrink-0"
              style={{ backgroundColor: activeCell.color }}
            />
            <div>
              <span
                className="font-mono text-[10px] uppercase tracking-wider font-bold"
                style={{ color: activeCell.color }}
              >
                {activeCell.row} / {activeCell.col}
              </span>
              <p className="font-sans text-xs text-navy-400 mt-1 leading-relaxed">
                {activeCell.desc}
              </p>
            </div>
          </div>
        ) : (
          <p className="font-mono text-[10px] text-navy-600 uppercase tracking-wider">
            Hover over a cell to explore outcomes
          </p>
        )}
      </div>
    </div>
  );
}

// ── Interactive escalation ladder ──
function EscalationLadder() {
  const [activeLevel, setActiveLevel] = useState<number | null>(null);

  const levels = [
    {
      level: 1,
      label: "Diplomatic Tensions",
      color: "#3b82f6",
      indicators: [
        "Ambassador recalls",
        "UN resolution disputes",
        "Trade rhetoric escalation",
      ],
      examples: "Verbal warnings, diplomatic protests, coalition building",
      transition:
        "Moves to L2 when diplomatic channels fail to produce resolution within 30-60 days",
    },
    {
      level: 2,
      label: "Economic Sanctions",
      color: "#22c55e",
      indicators: [
        "Asset freezes",
        "Trade embargoes",
        "SWIFT disconnections",
      ],
      examples:
        "Targeted sanctions, export controls, financial system exclusion",
      transition:
        "Moves to L3 when economic pressure triggers proxy responses or grey-zone operations",
    },
    {
      level: 3,
      label: "Proxy Engagements",
      color: "#eab308",
      indicators: [
        "Arms transfers to proxies",
        "Cyber operations",
        "Information warfare",
      ],
      examples:
        "Proxy militia funding, offensive cyber campaigns, election interference",
      transition:
        "Critical threshold. Moves to L4 when proxy activity risks direct attribution or territorial incursion",
    },
    {
      level: 4,
      label: "Military Posturing",
      color: "#f97316",
      indicators: [
        "Force mobilisation",
        "Naval deployments",
        "Airspace violations",
      ],
      examples:
        "Troop buildups on borders, carrier group repositioning, no-fly zone enforcement",
      transition:
        "Maximum danger zone. Miscalculation risk peaks. Moves to L5 through incident or deliberate choice",
    },
    {
      level: 5,
      label: "Direct Confrontation",
      color: "#ef4444",
      indicators: [
        "Kinetic engagement",
        "Territory seizure",
        "Full mobilisation",
      ],
      examples:
        "Cross-border strikes, naval engagements, ground force deployment",
      transition: "De-escalation requires external mediation or decisive outcome",
    },
  ];

  return (
    <div className="space-y-0">
      {levels.map((l, i) => {
        const isActive = activeLevel === l.level;
        const barWidth = `${l.level * 20}%`;
        return (
          <div key={l.level}>
            <button
              onClick={() =>
                setActiveLevel(isActive ? null : l.level)
              }
              className="w-full text-left group"
            >
              <div className="flex items-center gap-4 py-3 px-4 rounded-md transition-all duration-300 hover:bg-navy-800/30">
                {/* Level number */}
                <span
                  className="font-mono text-xl font-bold w-8 text-right tabular-nums transition-colors duration-300"
                  style={{ color: isActive ? l.color : "#404040" }}
                >
                  {l.level}
                </span>

                {/* Bar + label */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="font-mono text-xs font-semibold uppercase tracking-widest transition-colors duration-300"
                      style={{
                        color: isActive ? l.color : "#a3a3a3",
                      }}
                    >
                      {l.label}
                    </span>
                    <ChevronRight
                      className={`w-3.5 h-3.5 text-navy-600 transition-transform duration-300 ${
                        isActive ? "rotate-90" : ""
                      }`}
                    />
                  </div>
                  <div className="w-full h-1 rounded-full bg-navy-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: barWidth,
                        backgroundColor: l.color,
                        opacity: isActive ? 1 : 0.4,
                        boxShadow: isActive
                          ? `0 0 8px ${l.color}40`
                          : "none",
                      }}
                    />
                  </div>
                </div>
              </div>
            </button>

            {/* Expanded detail */}
            {isActive && (
              <div className="ml-16 mr-4 mb-4 pl-4 border-l-2 transition-all duration-300" style={{ borderColor: `${l.color}30` }}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-3">
                  <div>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-navy-500 block mb-2">
                      Indicators
                    </span>
                    <ul className="space-y-1">
                      {l.indicators.map((ind) => (
                        <li
                          key={ind}
                          className="flex items-center gap-2 font-sans text-[11px] text-navy-400"
                        >
                          <span
                            className="w-1 h-1 rounded-full shrink-0"
                            style={{ backgroundColor: l.color }}
                          />
                          {ind}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-navy-500 block mb-2">
                      Examples
                    </span>
                    <p className="font-sans text-[11px] text-navy-400 leading-relaxed">
                      {l.examples}
                    </p>
                  </div>
                  <div>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-navy-500 block mb-2">
                      Transition Trigger
                    </span>
                    <p className="font-sans text-[11px] text-navy-400 leading-relaxed">
                      {l.transition}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Connector line between levels */}
            {i < levels.length - 1 && (
              <div className="ml-[52px] h-1 border-l border-dashed border-navy-700/30" />
            )}
          </div>
        );
      })}

      <div className="mt-4 rounded bg-navy-800/30 border border-navy-700/20 px-4 py-3">
        <p className="font-sans text-xs text-navy-500 leading-relaxed">
          Tipping point analysis focuses on L3-L4 transitions, where
          miscalculation risk peaks and signalling becomes ambiguous. NEXUS
          monitors transition indicators in real time to flag when a conflict
          approaches critical thresholds.
        </p>
      </div>
    </div>
  );
}

// ── Equilibrium cases ──
const equilibria = [
  {
    tag: "IRAN-US",
    status: "Stable",
    statusColor: "#22c55e",
    type: "Mutual Deterrence",
    body: "Equilibrium sustained by sanctions pressure and nuclear threshold positioning. Deviation by either side risks asymmetric escalation. Current stability depends on Iranian domestic economic tolerance and US electoral cycle dynamics.",
    factors: ["Nuclear programme status", "Sanctions enforcement", "Regional proxy activity"],
  },
  {
    tag: "CHINA-TAIWAN",
    status: "Fragile",
    statusColor: "#f59e0b",
    type: "Strategic Ambiguity",
    body: "Status quo maintained through deliberate ambiguity on all sides. Models show this equilibrium is sensitive to domestic political pressure in Beijing and shifts in US commitment credibility. Small perturbations can trigger rapid reassessment.",
    factors: ["PLA readiness indicators", "Semiconductor supply chain", "US naval posture"],
  },
  {
    tag: "RUSSIA-NATO",
    status: "Unstable",
    statusColor: "#ef4444",
    type: "Bounded Attrition",
    body: "Post-2022 equilibrium characterized by attritional conflict with implicit red lines to avoid direct confrontation. Both sides operate within escalation constraints, but the equilibrium is structurally unstable and sensitive to battlefield momentum shifts.",
    factors: ["Frontline dynamics", "Energy leverage", "Alliance cohesion"],
  },
];

// ── Signalling channels ──
const signalChannels = [
  {
    icon: Radio,
    title: "Public Statements",
    cost: "Low cost",
    costColor: "#22c55e",
    body: "Official rhetoric, UN votes, and press releases. These are cheap to produce and easy to reverse, which makes them noisy. NEXUS cross-references stated positions with observable actions to generate a credibility score for each actor.",
  },
  {
    icon: Swords,
    title: "Military Deployments",
    cost: "High cost",
    costColor: "#ef4444",
    body: "Force repositioning, exercises, and mobilisation. Expensive and difficult to fake. Tracked via the War Room's aircraft and vessel monitoring layers for real-time verification against stated intentions.",
  },
  {
    icon: Scale,
    title: "Economic Moves",
    cost: "Medium cost",
    costColor: "#f59e0b",
    body: "Trade restrictions, asset freezes, energy supply adjustments. Measurable economic impact on both sender and target. Used to calibrate payoff matrices and assess commitment levels in game-theoretic models.",
  },
];

// ── Main page ──
export default function GameTheoryPage() {
  const hero = useReveal(0.1);
  const eqSection = useReveal();
  const ladderSection = useReveal();
  const matrixSection = useReveal();
  const signalSection = useReveal();
  const branchSection = useReveal();

  return (
    <>
      <style jsx global>{`
        .reveal-up {
          opacity: 0;
          transform: translateY(16px);
          transition: all 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-up.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .stagger-1 { transition-delay: 0.1s; }
        .stagger-2 { transition-delay: 0.2s; }
        .stagger-3 { transition-delay: 0.3s; }
      `}</style>

      <main className="min-h-screen pt-20 pb-24">
        {/* ── Hero ── */}
        <section className="relative pt-8 pb-12 px-6 overflow-hidden">
          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.02]">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                backgroundSize: "80px 80px",
              }}
            />
          </div>

          <div ref={hero.ref} className="relative max-w-5xl mx-auto">
            <div className={`reveal-up ${hero.visible ? "visible" : ""}`}>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 max-w-12 bg-accent-amber/40" />
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent-amber/70">
                  Research / Game Theory
                </span>
              </div>
            </div>

            <div className={`reveal-up stagger-1 ${hero.visible ? "visible" : ""}`}>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-navy-100 max-w-2xl">
                Strategic Decision Frameworks
              </h1>
            </div>

            <div className={`reveal-up stagger-2 ${hero.visible ? "visible" : ""}`}>
              <p className="mt-5 font-sans text-base text-navy-400 leading-relaxed max-w-2xl">
                Classical and evolutionary game theory applied to geopolitical
                conflict analysis. NEXUS models actors as strategic agents,
                maps their incentive structures, and identifies equilibria,
                tipping points, and escalation thresholds that drive market
                impact.
              </p>
            </div>

            {/* Concept pills */}
            <div className={`reveal-up stagger-3 ${hero.visible ? "visible" : ""} mt-8 flex flex-wrap gap-2`}>
              {[
                "Nash Equilibria",
                "Escalation Ladders",
                "Payoff Matrices",
                "Signalling Theory",
                "Scenario Branching",
              ].map((concept) => (
                <span
                  key={concept}
                  className="font-mono text-[10px] uppercase tracking-wider text-navy-400 bg-navy-800/40 border border-navy-700/30 rounded px-3 py-1.5"
                >
                  {concept}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── 01: Why Game Theory ── */}
        <section className="max-w-5xl mx-auto px-6 mt-8">
          <div ref={eqSection.ref}>
            <div className={`reveal-up ${eqSection.visible ? "visible" : ""}`}>
              <div className="flex items-center gap-4 mb-6">
                <span className="font-mono text-[10px] text-navy-500 tracking-widest">
                  01
                </span>
                <div className="h-px flex-1 bg-navy-800" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-navy-400">
                  Why Game Theory
                </span>
                <div className="h-px flex-1 bg-navy-800" />
              </div>
            </div>

            <div className={`reveal-up stagger-1 ${eqSection.visible ? "visible" : ""}`}>
              <div className="rounded-lg border border-navy-700/30 bg-navy-900/40 p-6 md:p-8">
                <div className="absolute top-0 left-0 w-12 h-px bg-gradient-to-r from-accent-amber/30 to-transparent" />
                <p className="font-sans text-sm text-navy-300 leading-relaxed mb-4">
                  Geopolitical actors operate as rational (or bounded-rational)
                  agents pursuing strategic objectives under uncertainty. Game
                  theory provides formal frameworks to model these interactions,
                  predict likely outcomes, and identify the leverage points
                  where small changes in conditions can shift equilibria.
                </p>
                <p className="font-sans text-sm text-navy-400 leading-relaxed">
                  NEXUS applies these models to active conflicts, trade
                  disputes, alliance formation, and deterrence scenarios.
                  The goal is to transform qualitative intelligence into
                  structured, quantifiable analysis that surfaces which
                  outcomes are stable, which are fragile, and what triggers
                  would cause a transition between states.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 02: Nash Equilibrium Analysis ── */}
        <section className="max-w-5xl mx-auto px-6 mt-20">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[10px] text-navy-500 tracking-widest">
              02
            </span>
            <div className="h-px flex-1 bg-navy-800" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-navy-400">
              Nash Equilibrium Analysis
            </span>
            <div className="h-px flex-1 bg-navy-800" />
          </div>

          <p className="font-sans text-sm text-navy-400 mb-6 text-center max-w-xl mx-auto">
            A Nash Equilibrium is a stable state where no actor can improve
            their position by unilaterally changing strategy. NEXUS identifies
            these equilibria across active geopolitical conflicts.
          </p>

          <div className="space-y-3">
            {equilibria.map((eq) => (
              <div
                key={eq.tag}
                className="group rounded-lg border border-navy-700/20 bg-navy-900/30 p-5 hover:border-navy-600/40 transition-all duration-300 overflow-hidden"
              >
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  {/* Tag + status */}
                  <div className="md:w-36 shrink-0">
                    <span className="font-mono text-sm font-bold text-navy-100">
                      {eq.tag}
                    </span>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: eq.statusColor }}
                      />
                      <span
                        className="font-mono text-[9px] uppercase tracking-wider"
                        style={{ color: eq.statusColor }}
                      >
                        {eq.status}
                      </span>
                    </div>
                    <span className="font-mono text-[9px] text-navy-600 uppercase tracking-wider mt-1 block">
                      {eq.type}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="flex-1">
                    <p className="font-sans text-sm text-navy-400 leading-relaxed">
                      {eq.body}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {eq.factors.map((f) => (
                        <span
                          key={f}
                          className="font-mono text-[9px] text-navy-500 bg-navy-800/50 rounded px-2 py-1 border border-navy-700/20"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 03: Escalation Ladders ── */}
        <section className="max-w-5xl mx-auto px-6 mt-20">
          <div ref={ladderSection.ref}>
            <div className={`reveal-up ${ladderSection.visible ? "visible" : ""}`}>
              <div className="flex items-center gap-4 mb-3">
                <span className="font-mono text-[10px] text-navy-500 tracking-widest">
                  03
                </span>
                <div className="h-px flex-1 bg-navy-800" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-navy-400">
                  Escalation Ladders
                </span>
                <div className="h-px flex-1 bg-navy-800" />
              </div>
              <p className="font-sans text-sm text-navy-400 mb-8 text-center max-w-xl mx-auto">
                Escalation modelled as discrete steps with measurable indicators
                and transition probabilities. Click a level to explore its
                characteristics.
              </p>
            </div>

            <div className={`reveal-up stagger-1 ${ladderSection.visible ? "visible" : ""}`}>
              <div className="rounded-lg border border-navy-700/20 bg-navy-900/30 p-6 overflow-hidden">
                <EscalationLadder />
              </div>
            </div>
          </div>
        </section>

        {/* ── 04: Payoff Matrices ── */}
        <section className="max-w-5xl mx-auto px-6 mt-20">
          <div ref={matrixSection.ref}>
            <div className={`reveal-up ${matrixSection.visible ? "visible" : ""}`}>
              <div className="flex items-center gap-4 mb-3">
                <span className="font-mono text-[10px] text-navy-500 tracking-widest">
                  04
                </span>
                <div className="h-px flex-1 bg-navy-800" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-navy-400">
                  Payoff Matrices
                </span>
                <div className="h-px flex-1 bg-navy-800" />
              </div>
              <p className="font-sans text-sm text-navy-400 mb-8 text-center max-w-xl mx-auto">
                NEXUS constructs payoff matrices by scoring outcomes across
                economic cost, military capability balance, and domestic
                political impact.
              </p>
            </div>

            <div className={`reveal-up stagger-1 ${matrixSection.visible ? "visible" : ""}`}>
              <div className="rounded-lg border border-navy-700/20 bg-navy-900/30 p-6 overflow-hidden">
                <div className="font-mono text-[10px] uppercase tracking-widest text-navy-500 mb-4">
                  Simplified Deterrence Game
                </div>
                <PayoffMatrix />
                <p className="font-sans text-xs text-navy-500 mt-2 leading-relaxed max-w-2xl">
                  The Nash Equilibrium sits at Defect/Defect (-2, -2),
                  illustrating the security dilemma where rational self-interest
                  produces suboptimal collective outcomes. This is the core
                  dynamic NEXUS models across real-world deterrence scenarios.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 05: Signalling Theory ── */}
        <section className="max-w-5xl mx-auto px-6 mt-20">
          <div ref={signalSection.ref}>
            <div className={`reveal-up ${signalSection.visible ? "visible" : ""}`}>
              <div className="flex items-center gap-4 mb-3">
                <span className="font-mono text-[10px] text-navy-500 tracking-widest">
                  05
                </span>
                <div className="h-px flex-1 bg-navy-800" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-navy-400">
                  Signalling Theory
                </span>
                <div className="h-px flex-1 bg-navy-800" />
              </div>
              <p className="font-sans text-sm text-navy-400 mb-8 text-center max-w-xl mx-auto">
                In incomplete-information games, actors communicate intentions
                through costly signals. NEXUS classifies and scores three
                primary signal channels to assess credibility and intent.
              </p>
            </div>

            <div className={`reveal-up stagger-1 ${signalSection.visible ? "visible" : ""}`}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {signalChannels.map((ch) => {
                  const Icon = ch.icon;
                  return (
                    <div
                      key={ch.title}
                      className="group rounded-lg border border-navy-700/20 bg-navy-900/30 p-5 hover:border-navy-600/40 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4 text-navy-500" />
                          <h3 className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-200">
                            {ch.title}
                          </h3>
                        </div>
                      </div>
                      <div className="mb-3">
                        <span
                          className="font-mono text-[9px] uppercase tracking-wider"
                          style={{ color: ch.costColor }}
                        >
                          {ch.cost}
                        </span>
                      </div>
                      <p className="font-sans text-[12px] text-navy-400 leading-relaxed">
                        {ch.body}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── 06: Scenario Branching ── */}
        <section className="max-w-5xl mx-auto px-6 mt-20">
          <div ref={branchSection.ref}>
            <div className={`reveal-up ${branchSection.visible ? "visible" : ""}`}>
              <div className="flex items-center gap-4 mb-3">
                <span className="font-mono text-[10px] text-navy-500 tracking-widest">
                  06
                </span>
                <div className="h-px flex-1 bg-navy-800" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-navy-400">
                  Scenario Branching
                </span>
                <div className="h-px flex-1 bg-navy-800" />
              </div>
              <p className="font-sans text-sm text-navy-400 mb-8 text-center max-w-xl mx-auto">
                Game theory outputs feed into the War Room's scenario analysis
                engine. Each equilibrium and escalation assessment generates
                branching paths with probability assignments.
              </p>
            </div>

            <div className={`reveal-up stagger-1 ${branchSection.visible ? "visible" : ""}`}>
              <div className="rounded-lg border border-navy-700/20 bg-navy-900/30 p-6 overflow-hidden">
                {/* Visual branching flow */}
                <div className="flex flex-col md:flex-row gap-3 mb-6">
                  {[
                    {
                      icon: Crosshair,
                      label: "Equilibrium Mapping",
                      tag: "Game Theory Output",
                      body: "Stable states identified through Nash analysis define the baseline scenarios.",
                    },
                    {
                      icon: GitBranch,
                      label: "Perturbation Analysis",
                      tag: "Branching Trigger",
                      body: "External shocks modelled as perturbations that shift payoff values and potentially break equilibria.",
                    },
                    {
                      icon: Shield,
                      label: "Probability Assignment",
                      tag: "War Room Input",
                      body: "Each branch receives probability weights from signal strength, historical precedent, and rationality assumptions.",
                    },
                  ].map((step, i) => {
                    const Icon = step.icon;
                    return (
                      <div key={step.label} className="flex-1 flex items-start gap-3">
                        {i > 0 && (
                          <div className="hidden md:flex items-center shrink-0 -ml-3 mr-0 pt-5">
                            <div className="w-3 h-px bg-navy-700/40" />
                            <ChevronRight className="w-3 h-3 text-navy-700/60 -ml-1" />
                          </div>
                        )}
                        <div className="flex-1 rounded border border-navy-700/20 bg-navy-800/20 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className="w-3.5 h-3.5 text-navy-500" />
                            <span className="font-mono text-xs font-semibold text-navy-200">
                              {step.label}
                            </span>
                          </div>
                          <span className="font-mono text-[9px] uppercase tracking-wider text-navy-600 block mb-2">
                            {step.tag}
                          </span>
                          <p className="font-sans text-[11px] text-navy-400 leading-relaxed">
                            {step.body}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Example scenario tree */}
                <div className="border-t border-navy-700/20 pt-5">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-navy-500 mb-4 block">
                    Example Scenario Tree
                  </span>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-accent-emerald shrink-0" />
                      <div className="h-px flex-1 bg-navy-700/20" />
                      <span className="font-mono text-[11px] text-navy-300 shrink-0">
                        De-escalation path
                      </span>
                      <span className="font-mono text-[10px] text-accent-emerald shrink-0">
                        42%
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-accent-amber shrink-0" />
                      <div className="h-px flex-1 bg-navy-700/20" />
                      <span className="font-mono text-[11px] text-navy-300 shrink-0">
                        Frozen conflict
                      </span>
                      <span className="font-mono text-[10px] text-accent-amber shrink-0">
                        35%
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-accent-rose shrink-0" />
                      <div className="h-px flex-1 bg-navy-700/20" />
                      <span className="font-mono text-[11px] text-navy-300 shrink-0">
                        Escalation to L4+
                      </span>
                      <span className="font-mono text-[10px] text-accent-rose shrink-0">
                        23%
                      </span>
                    </div>
                  </div>
                  <p className="font-sans text-xs text-navy-500 mt-4 leading-relaxed">
                    Probability assignments update in real time as new signals
                    are ingested. Scenario weights shift automatically when
                    detection thresholds are crossed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Related Research ── */}
        <section className="max-w-5xl mx-auto px-6 mt-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px w-8 bg-navy-700" />
            <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">
              Related Research
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                href: "/research/methodology",
                title: "Methodology",
                desc: "The full NEXUS pipeline from signal detection to validated intelligence output.",
              },
              {
                href: "/research/signal-theory",
                title: "Signal Theory",
                desc: "How independent signal layers combine through convergence amplification.",
              },
              {
                href: "/research/prediction-accuracy",
                title: "Prediction Accuracy",
                desc: "Live accuracy tracking and Brier scores across all prediction categories.",
              },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group border border-navy-700/30 rounded-lg bg-navy-900/30 p-5 hover:border-navy-600/40 transition-all"
              >
                <h3 className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-200 group-hover:text-navy-100 transition-colors mb-2">
                  {link.title}
                </h3>
                <p className="font-sans text-[12px] text-navy-500 leading-relaxed mb-3">
                  {link.desc}
                </p>
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-accent-amber group-hover:text-accent-amber/80 transition-colors">
                  Read more
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="max-w-5xl mx-auto px-6 mt-20">
          <div className="relative rounded-lg border border-navy-700/30 bg-navy-900/30 p-10 text-center overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-accent-amber/[0.03] rounded-full blur-[80px] pointer-events-none" />

            <div className="relative">
              <h3 className="font-mono text-sm font-semibold uppercase tracking-widest text-navy-100 mb-2">
                Run scenario analysis
              </h3>
              <p className="font-sans text-sm text-navy-400 mb-6 max-w-lg mx-auto">
                Access the War Room to explore live game-theoretic models,
                escalation tracking, and scenario branching across active
                conflict theatres.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-2.5 font-mono text-[11px] uppercase tracking-widest text-navy-100 bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.1] hover:border-white/[0.15] transition-all"
              >
                Request Access
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
