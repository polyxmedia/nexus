"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Activity,
  Brain,
  Target,
  Shield,
  Crosshair,
  Zap,
  Check,
  Loader2,
  Anchor,
} from "lucide-react";
import { useReveal, anim, hidden, shown, SectionHead } from "@/components/public/reveal";
import { CompetitorComparison } from "@/components/public/competitor-comparison";

// ── Mini Signal Bars (visual preview for Signal Detection card) ──
function MiniSignalBars({ active }: { active: boolean }) {
  const [bars, setBars] = useState([3, 5, 2, 4, 5, 3, 1, 4, 5, 2, 3, 4, 5, 3, 2, 4]);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setBars((prev) =>
        prev.map((v) => {
          const delta = Math.random() > 0.5 ? 1 : -1;
          return Math.max(1, Math.min(5, v + delta));
        })
      );
    }, 2000);
    return () => clearInterval(interval);
  }, [active]);

  return (
    <div className="relative h-32 bg-navy-900/80 overflow-hidden p-4">
      <div className="flex items-end gap-1 h-full pb-3">
        {bars.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-t transition-all duration-1000 ease-out"
            style={{
              height: active ? `${v * 18}%` : "0%",
              transitionDelay: active ? `${i * 40}ms` : "0ms",
              backgroundColor: v >= 4
                ? `rgba(245,158,11,${0.2 + v * 0.1})`
                : `rgba(245,158,11,${0.05 + v * 0.04})`,
            }}
          />
        ))}
      </div>
      <div className="absolute left-4 right-4 bottom-[calc(0.75rem+72%)] border-t border-dashed border-accent-rose/20">
        <span className="absolute -top-2.5 right-0 text-[7px] text-accent-rose/40 font-mono">THRESHOLD</span>
      </div>
      <div className="absolute bottom-2 left-3">
        <span className="text-[8px] text-accent-amber/50 tracking-[0.12em] font-mono">SIGNAL INTENSITY</span>
      </div>
    </div>
  );
}

// ── Mini Chat (visual preview for AI Analysis card) ──
const CHAT_MESSAGES = [
  { role: "user", text: "Iran escalation risk?" },
  { role: "ai", text: "Hormuz closure probability 73%. Energy correlation spiking." },
  { role: "user", text: "Best hedge?" },
  { role: "ai", text: "Long XLE, short transport. Confidence 81%." },
];

function MiniChat({ active }: { active: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setCount((c) => (c >= CHAT_MESSAGES.length ? 0 : c + 1));
    }, 1800);
    return () => clearInterval(interval);
  }, [active]);

  return (
    <div className="relative h-32 bg-navy-900/80 overflow-hidden p-3">
      <div className="space-y-1.5 h-full overflow-hidden">
        {CHAT_MESSAGES.slice(0, count).map((msg, i) => (
          <div key={i} className={`flex gap-1.5 items-start ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "ai" && (
              <div className="h-3.5 w-3.5 rounded-full bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="h-1 w-1 rounded-full bg-accent-cyan/60" />
              </div>
            )}
            <div className={`rounded px-2 py-1 text-[8px] font-mono leading-relaxed max-w-[80%] ${
              msg.role === "user"
                ? "bg-accent-cyan/[0.06] border border-accent-cyan/10 text-navy-300"
                : "bg-navy-800/60 text-navy-300"
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-navy-900/80 to-transparent pointer-events-none" />
    </div>
  );
}

// ── Mini Brier Gauge (visual preview for Prediction Engine card) ──
function MiniBrierGauge({ active }: { active: boolean }) {
  const [score, setScore] = useState(0.18);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setScore((s) => {
        const delta = (Math.random() - 0.5) * 0.04;
        return Math.max(0.05, Math.min(0.35, s + delta));
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [active]);

  const pct = Math.max(0, Math.min(100, (1 - score) * 100));

  return (
    <div className="relative h-32 bg-navy-900/80 overflow-hidden p-4 flex flex-col justify-center">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[8px] font-mono text-navy-600 tracking-wider">BRIER SCORE</span>
        <span className={`text-[14px] font-mono tabular-nums ${score < 0.2 ? "text-accent-emerald" : score < 0.3 ? "text-accent-amber" : "text-accent-rose"}`}>
          {score.toFixed(3)}
        </span>
      </div>
      <div className="w-full h-2 bg-navy-800/60 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: active ? `${pct}%` : "0%",
            background: score < 0.2 ? "rgba(16,185,129,0.6)" : score < 0.3 ? "rgba(245,158,11,0.6)" : "rgba(244,63,94,0.6)",
          }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[7px] font-mono text-navy-700">0 (perfect)</span>
        <span className="text-[7px] font-mono text-navy-700">1 (worst)</span>
      </div>
      <div className="mt-3 flex gap-3">
        {["72% hit rate", "Auto-resolve", "Regime-aware"].map((t) => (
          <span key={t} className="text-[7px] font-mono text-navy-600 bg-navy-800/40 rounded px-1.5 py-0.5">{t}</span>
        ))}
      </div>
    </div>
  );
}

// ── Mini Chokepoints (visual preview for Shipping Intelligence card) ──
function MiniChokepoints({ active }: { active: boolean }) {
  const points = [
    { name: "HORMUZ", x: 62, y: 42, status: "elevated" },
    { name: "SUEZ", x: 52, y: 35, status: "normal" },
    { name: "MALACCA", x: 78, y: 55, status: "normal" },
    { name: "BOSPORUS", x: 50, y: 28, status: "elevated" },
    { name: "PANAMA", x: 22, y: 48, status: "normal" },
  ];
  return (
    <div className="relative h-32 bg-navy-900/80 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: "radial-gradient(circle at 50% 50%, rgba(6,182,212,0.3) 0%, transparent 70%)",
      }} />
      {points.map((p, i) => (
        <div key={p.name} className="absolute" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
          <div
            className={`h-2 w-2 rounded-full transition-all duration-500 ${
              p.status === "elevated" ? "bg-accent-amber" : "bg-accent-cyan/40"
            }`}
            style={{
              transform: active ? "scale(1)" : "scale(0)",
              transitionDelay: `${i * 100}ms`,
              animation: p.status === "elevated" && active ? "pulse 2s infinite" : "none",
            }}
          />
          <span className="absolute top-3 left-1/2 -translate-x-1/2 text-[6px] font-mono text-navy-600 whitespace-nowrap">
            {p.name}
          </span>
        </div>
      ))}
      <div className="absolute bottom-2 left-3 flex items-center gap-3">
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-accent-amber" />
          <span className="text-[7px] font-mono text-navy-600">ELEVATED</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-accent-cyan/40" />
          <span className="text-[7px] font-mono text-navy-600">NORMAL</span>
        </div>
      </div>
    </div>
  );
}

// ── Mini Payoff Matrix (visual preview for Game Theory card) ──
function MiniPayoffMatrix({ active }: { active: boolean }) {
  const [highlight, setHighlight] = useState<[number, number]>([1, 0]);

  useEffect(() => {
    if (!active) return;
    const positions: [number, number][] = [[0, 0], [0, 1], [1, 0], [1, 1]];
    let idx = 2;
    const interval = setInterval(() => {
      idx = (idx + 1) % positions.length;
      setHighlight(positions[idx]);
    }, 2500);
    return () => clearInterval(interval);
  }, [active]);

  const cells = [
    ["-2, -2", "3, -3"],
    ["-3, 3", "1, 1"],
  ];
  const rows = ["Escalate", "De-escalate"];
  const cols = ["Escalate", "De-escalate"];

  return (
    <div className="relative h-32 bg-navy-900/80 overflow-hidden p-4 flex flex-col justify-center">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[8px] font-mono text-navy-600 tracking-wider">PAYOFF MATRIX</span>
        <span className="text-[7px] font-mono text-accent-rose/50 bg-accent-rose/[0.06] rounded px-1.5 py-0.5">NASH: (De-esc, De-esc)</span>
      </div>
      <table className="w-full text-[8px] font-mono">
        <thead>
          <tr>
            <th className="text-left text-navy-700 font-normal pb-1 w-20" />
            {cols.map((c) => <th key={c} className="text-center text-navy-600 font-normal pb-1 px-1">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={r}>
              <td className="text-navy-600 pr-2 py-0.5">{r}</td>
              {cells[ri].map((cell, ci) => (
                <td
                  key={ci}
                  className={`text-center py-0.5 px-1 rounded transition-all duration-500 ${
                    highlight[0] === ri && highlight[1] === ci
                      ? "bg-accent-rose/10 text-navy-200"
                      : "text-navy-500"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Mini Monte Carlo (visual preview for Trade Lab card) ──
function MiniMonteCarlo({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const c = ctx;

    const w = canvas.width;
    const h = canvas.height;
    const paths = 12;
    const steps = 40;

    function draw() {
      c.clearRect(0, 0, w, h);
      for (let p = 0; p < paths; p++) {
        c.beginPath();
        c.strokeStyle = `rgba(16,185,129,${0.08 + Math.random() * 0.12})`;
        c.lineWidth = 0.8;
        let y = h / 2;
        for (let s = 0; s <= steps; s++) {
          const x = (s / steps) * w;
          if (s === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
          y += (Math.random() - 0.48) * 6;
          y = Math.max(8, Math.min(h - 8, y));
        }
        c.stroke();
      }
    }

    draw();
    const interval = setInterval(draw, 3000);
    return () => clearInterval(interval);
  }, [active]);

  return (
    <div className="relative h-32 bg-navy-900/80 overflow-hidden">
      <canvas ref={canvasRef} width={300} height={128} className="w-full h-full" />
      <div className="absolute bottom-2 left-3 flex items-center gap-3">
        <span className="text-[8px] font-mono text-accent-emerald/50 tracking-wider">MONTE CARLO</span>
        <span className="text-[7px] font-mono text-navy-600">12 paths / 10k iterations</span>
      </div>
    </div>
  );
}

// ── Live Stats ──

interface LiveStats {
  totalPredictions: number;
  resolvedPredictions: number;
  hitRate: number;
  brierScore: number;
  signalsProcessed: number;
  avgConfidence: number;
}

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

  const [activeCapIdx, setActiveCapIdx] = useState(-1);
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

  const CAP_COUNT = 6;
  useEffect(() => {
    if (!capReveal.visible) return;
    const timers: NodeJS.Timeout[] = [];
    for (let i = 0; i < CAP_COUNT; i++) {
      timers.push(setTimeout(() => setActiveCapIdx(i), 200 + i * 150));
    }
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

      {/* ── THE PROBLEM ── */}
      <section className="px-6 py-24">
        <div ref={problemReveal.ref} className="max-w-6xl mx-auto">
          <SectionHead number="01" label="The Problem" visible={problemReveal.visible} />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Wide card - siloed */}
            <div
              className={`md:col-span-2 md:row-span-2 rounded-2xl border border-navy-700/40 bg-navy-900/60 backdrop-blur-sm p-6 flex flex-col justify-between hover:border-accent-rose/20 transition-all duration-500 lg:rounded-tl-[2rem] ${anim} ${problemReveal.visible ? shown : hidden}`}
              style={{ transitionDelay: "200ms" }}
            >
              <div>
                <h3 className="text-base font-bold text-navy-100 font-sans mb-3">Intelligence is siloed</h3>
                <p className="text-xs text-navy-400 leading-relaxed font-sans">
                  Geopolitical analysts don&apos;t see market data. Traders don&apos;t see OSINT feeds. Risk managers don&apos;t see shipping disruptions in real time. The information exists, but it lives in different platforms with different logins and no connection between them.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-navy-800/40 flex items-center gap-3">
                <div className="flex -space-x-1">
                  {["bg-accent-amber", "bg-accent-cyan", "bg-accent-emerald", "bg-accent-rose"].map((c) => (
                    <div key={c} className={`h-2.5 w-2.5 rounded-full ${c} ring-1 ring-navy-950`} />
                  ))}
                </div>
                <span className="text-[9px] font-mono uppercase tracking-wider text-navy-600">4 layers, 0 connections</span>
              </div>
            </div>

            {/* Top-right - pricing */}
            <div
              className={`md:col-span-2 rounded-2xl border border-navy-700/40 bg-navy-900/60 backdrop-blur-sm p-6 hover:border-accent-amber/20 transition-all duration-500 lg:rounded-tr-[2rem] ${anim} ${problemReveal.visible ? shown : hidden}`}
              style={{ transitionDelay: "300ms" }}
            >
              <h3 className="text-base font-bold text-navy-100 font-sans mb-3">Enterprise pricing locks out everyone else</h3>
              <p className="text-xs text-navy-400 leading-relaxed font-sans">
                Bloomberg costs $32K a year. Recorded Future starts at $60K. Palantir requires a sales call and a six-figure contract. The intelligence infrastructure that moves markets is available to institutions and nobody else.
              </p>
              <div className="mt-4 flex gap-2">
                {["$32K/yr", "$60K/yr", "$100K+"].map((p) => (
                  <span key={p} className="text-[9px] font-mono text-accent-rose/60 bg-accent-rose/[0.06] rounded px-2 py-0.5">{p}</span>
                ))}
              </div>
            </div>

            {/* Bottom-right pair */}
            <div
              className={`rounded-2xl border border-navy-700/40 bg-navy-900/60 backdrop-blur-sm p-6 hover:border-accent-cyan/20 transition-all duration-500 lg:rounded-bl-[2rem] ${anim} ${problemReveal.visible ? shown : hidden}`}
              style={{ transitionDelay: "400ms" }}
            >
              <h3 className="text-base font-bold text-navy-100 font-sans mb-3">AI trading tools are shallow</h3>
              <p className="text-xs text-navy-400 leading-relaxed font-sans">
                Most AI trading platforms scan price patterns and call it intelligence. They have no geopolitical context, no regime awareness, no understanding of why markets move.
              </p>
            </div>
            <div
              className={`rounded-2xl border border-navy-700/40 bg-navy-900/60 backdrop-blur-sm p-6 hover:border-accent-emerald/20 transition-all duration-500 lg:rounded-br-[2rem] ${anim} ${problemReveal.visible ? shown : hidden}`}
              style={{ transitionDelay: "500ms" }}
            >
              <h3 className="text-base font-bold text-navy-100 font-sans mb-3">No accountability</h3>
              <p className="text-xs text-navy-400 leading-relaxed font-sans">
                Nobody scores their predictions because scoring means admitting when you were wrong. Without calibration feedback, there is no improvement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT NEXUS DOES ── */}
      <section className="px-6 py-24">
        <div ref={capReveal.ref} className="max-w-6xl mx-auto">
          <SectionHead number="02" label="What NEXUS Does" visible={capReveal.visible} />

          <p
            className={`text-base text-navy-400 leading-relaxed max-w-2xl mb-14 ${anim} ${capReveal.visible ? shown : hidden}`}
            style={{ transitionDelay: "100ms" }}
          >
            One platform. Every layer of intelligence. From signal detection through to execution.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-6 lg:grid-rows-2 gap-4">
            {/* Signal Detection - wide */}
            <div className={`lg:col-span-4 ${anim} ${0 <= activeCapIdx ? shown : hidden}`}>
              <div className="group h-full rounded-2xl border border-navy-700/40 bg-navy-900/60 backdrop-blur-sm overflow-hidden hover:border-accent-amber/30 hover:shadow-[0_0_40px_rgba(245,158,11,0.06)] transition-all duration-500 lg:rounded-tl-[2rem]">
                <MiniSignalBars active={capReveal.visible} />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <Activity className="h-4 w-4 text-accent-amber" />
                      <h3 className="text-base font-bold text-navy-100 font-sans">Signal Detection</h3>
                    </div>
                    <span className="text-[9px] font-mono text-navy-500 tracking-[0.2em] border border-navy-700/30 rounded px-2 py-0.5">SIGINT</span>
                  </div>
                  <p className="text-xs text-navy-400 leading-relaxed font-sans max-w-md">
                    Four primary signal layers run continuously. Geopolitical escalation, market microstructure, open-source intelligence, and systemic risk. When multiple layers converge, the system flags it before the headline drops.
                  </p>
                </div>
              </div>
            </div>

            {/* AI Analysis - narrow */}
            <div className={`lg:col-span-2 ${anim} ${1 <= activeCapIdx ? shown : hidden}`}>
              <div className="group h-full rounded-2xl border border-navy-700/40 bg-navy-900/60 backdrop-blur-sm overflow-hidden hover:border-accent-cyan/30 hover:shadow-[0_0_40px_rgba(6,182,212,0.06)] transition-all duration-500 lg:rounded-tr-[2rem]">
                <MiniChat active={capReveal.visible} />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <Brain className="h-4 w-4 text-accent-cyan" />
                      <h3 className="text-base font-bold text-navy-100 font-sans">AI Analysis</h3>
                    </div>
                    <span className="text-[9px] font-mono text-navy-500 tracking-[0.2em] border border-navy-700/30 rounded px-2 py-0.5">HUMINT</span>
                  </div>
                  <p className="text-xs text-navy-400 leading-relaxed font-sans">
                    Claude synthesises converged signals into structured theses. Every conclusion traces back to the data that triggered it. No black boxes, no vibes.
                  </p>
                </div>
              </div>
            </div>

            {/* Prediction Engine */}
            <div className={`lg:col-span-2 ${anim} ${2 <= activeCapIdx ? shown : hidden}`}>
              <div className="group h-full rounded-2xl border border-navy-700/40 bg-navy-900/60 backdrop-blur-sm overflow-hidden hover:border-purple-400/30 hover:shadow-[0_0_40px_rgba(139,92,246,0.06)] transition-all duration-500 lg:rounded-bl-[2rem]">
                <MiniBrierGauge active={capReveal.visible} />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <Target className="h-4 w-4 text-purple-400" />
                      <h3 className="text-base font-bold text-navy-100 font-sans">Prediction Engine</h3>
                    </div>
                    <span className="text-[9px] font-mono text-navy-500 tracking-[0.2em] border border-navy-700/30 rounded px-2 py-0.5">ASSESS</span>
                  </div>
                  <p className="text-xs text-navy-400 leading-relaxed font-sans">
                    Every thesis generates falsifiable predictions with defined timeframes and probabilities. Auto-resolution against market data. Brier scoring for calibration feedback.
                  </p>
                </div>
              </div>
            </div>

            {/* Trade Lab */}
            <div className={`lg:col-span-2 ${anim} ${3 <= activeCapIdx ? shown : hidden}`}>
              <div className="group h-full rounded-2xl border border-navy-700/40 bg-navy-900/60 backdrop-blur-sm overflow-hidden hover:border-accent-emerald/30 hover:shadow-[0_0_40px_rgba(16,185,129,0.06)] transition-all duration-500">
                <MiniMonteCarlo active={capReveal.visible} />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <Crosshair className="h-4 w-4 text-accent-emerald" />
                      <h3 className="text-base font-bold text-navy-100 font-sans">Trade Lab</h3>
                    </div>
                    <span className="text-[9px] font-mono text-navy-500 tracking-[0.2em] border border-navy-700/30 rounded px-2 py-0.5">EXECUTE</span>
                  </div>
                  <p className="text-xs text-navy-400 leading-relaxed font-sans">
                    Monte Carlo distributions, gamma exposure, regime detection, and systemic risk overlays. Kelly sizing and ATR-based position recommendations.
                  </p>
                </div>
              </div>
            </div>

            {/* Shipping Intelligence */}
            <div className={`lg:col-span-2 ${anim} ${4 <= activeCapIdx ? shown : hidden}`}>
              <div className="group h-full rounded-2xl border border-navy-700/40 bg-navy-900/60 backdrop-blur-sm overflow-hidden hover:border-orange-400/30 hover:shadow-[0_0_40px_rgba(249,115,22,0.06)] transition-all duration-500">
                <MiniChokepoints active={capReveal.visible} />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <Anchor className="h-4 w-4 text-orange-400" />
                      <h3 className="text-base font-bold text-navy-100 font-sans">Shipping Intel</h3>
                    </div>
                    <span className="text-[9px] font-mono text-navy-500 tracking-[0.2em] border border-navy-700/30 rounded px-2 py-0.5">MARINT</span>
                  </div>
                  <p className="text-xs text-navy-400 leading-relaxed font-sans">
                    Five chokepoint monitors tracking transit volumes, anomalies, and dark fleet activity. Freight market proxies and maritime OSINT.
                  </p>
                </div>
              </div>
            </div>

            {/* Game Theory - wide bottom-right */}
            <div className={`lg:col-span-4 ${anim} ${5 <= activeCapIdx ? shown : hidden}`}>
              <div className="group h-full rounded-2xl border border-navy-700/40 bg-navy-900/60 backdrop-blur-sm overflow-hidden hover:border-accent-rose/30 hover:shadow-[0_0_40px_rgba(244,63,94,0.06)] transition-all duration-500 lg:rounded-br-[2rem]">
                <MiniPayoffMatrix active={capReveal.visible} />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <Shield className="h-4 w-4 text-accent-rose" />
                      <h3 className="text-base font-bold text-navy-100 font-sans">Game Theory Engine</h3>
                    </div>
                    <span className="text-[9px] font-mono text-navy-500 tracking-[0.2em] border border-navy-700/30 rounded px-2 py-0.5">WARGAME</span>
                  </div>
                  <p className="text-xs text-navy-400 leading-relaxed font-sans max-w-lg">
                    Formal scenario modelling with payoff matrices, Nash equilibria, and escalation trajectories. Wartime threshold detection that automatically invalidates outdated predictions when the regime shifts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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
            className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${anim} ${proofReveal.visible ? shown : hidden}`}
            style={{ transitionDelay: "350ms" }}
          >
            <div className="md:row-span-2 border border-navy-800/60 rounded-lg bg-navy-900/30 p-6 flex flex-col justify-between">
              <div>
                <h4 className="text-[10px] font-mono uppercase tracking-widest text-accent-cyan mb-3">
                  Scored, Not Curated
                </h4>
                <p className="text-[12px] text-navy-500 leading-relaxed">
                  Every prediction the system makes is tracked and scored using
                  Brier proper scoring rules. Misses are recorded the same as
                  hits. You see the real accuracy, not a highlight reel.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-navy-800/40">
                <span className="text-[9px] font-mono uppercase tracking-wider text-navy-600">Brier score range: 0 (perfect) to 1 (worst)</span>
              </div>
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
