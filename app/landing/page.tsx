"use client";

import { useState, useEffect, useRef } from "react";
import { useTiers } from "@/lib/hooks/useTiers";
import Image from "next/image";
import Link from "next/link";
import {
  Shield,
  MessageSquare,
  Activity,
  FileText,
  Crosshair,
  TrendingUp,
  ArrowRight,
  Check,
  Zap,
  Globe,
  Lock,
  ChevronDown,
} from "lucide-react";

// ── Scroll reveal hook ──
function useScrollReveal(threshold = 0.15) {
  const [revealed, setRevealed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setRevealed(true); observer.disconnect(); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, revealed };
}

// ── Animated counter ──
function Counter({ end, suffix = "", duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.3 }
    );
    const el = document.getElementById(`counter-${end}`);
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [end]);

  useEffect(() => {
    if (!started) return;
    const steps = 40;
    const increment = end / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [started, end, duration]);

  return <span id={`counter-${end}`}>{count.toLocaleString()}{suffix}</span>;
}

// ── Grid background ──
function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(6,182,212,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6,182,212,0.5) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
      {/* Scan line */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(6,182,212,0.4) 2px, rgba(6,182,212,0.4) 4px)",
        }}
      />
      {/* Radial vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, transparent 0%, #000000 70%)",
        }}
      />
    </div>
  );
}

// ── Glowing border card ──
function GlowCard({
  children,
  className = "",
  glowColor = "cyan",
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: "cyan" | "emerald" | "amber" | "rose";
}) {
  const colors = {
    cyan: "hover:border-accent-cyan/30 hover:shadow-[0_0_30px_rgba(6,182,212,0.06)]",
    emerald: "hover:border-accent-emerald/30 hover:shadow-[0_0_30px_rgba(16,185,129,0.06)]",
    amber: "hover:border-accent-amber/30 hover:shadow-[0_0_30px_rgba(245,158,11,0.06)]",
    rose: "hover:border-accent-rose/30 hover:shadow-[0_0_30px_rgba(244,63,94,0.06)]",
  };

  return (
    <div
      className={`border border-navy-700/40 rounded-lg bg-navy-900/60 backdrop-blur-sm transition-all duration-500 ${colors[glowColor]} ${className}`}
    >
      {children}
    </div>
  );
}

// ── Features data ──
const features = [
  {
    icon: Shield,
    title: "War Room",
    description: "A live map of what's actually going on. Military flights, OSINT feeds, conflict zones, all updating in real time so you're not relying on headlines.",
    color: "text-accent-rose",
    glow: "rose" as const,
    tag: "GEOINT",
  },
  {
    icon: MessageSquare,
    title: "AI Analyst",
    description: "Talk to it like a colleague. It knows macro, geopolitics, and market patterns, and it'll give you a straight answer.",
    color: "text-accent-cyan",
    glow: "cyan" as const,
    tag: "HUMINT",
  },
  {
    icon: Activity,
    title: "Signal Detection",
    description: "Constantly scanning economic, geopolitical, and sentiment data. When something shifts, you know about it before the market prices it in.",
    color: "text-accent-amber",
    glow: "amber" as const,
    tag: "SIGINT",
  },
  {
    icon: FileText,
    title: "Thesis Generation",
    description: "All the intelligence layers synthesized into clear, actionable theses. Not vague predictions, actual positions you can take.",
    color: "text-accent-emerald",
    glow: "emerald" as const,
    tag: "FUSION",
  },
  {
    icon: Crosshair,
    title: "Prediction Tracking",
    description: "Every prediction is falsifiable, scored, and tracked. You can see exactly how accurate the system is over time, no hand-waving.",
    color: "text-accent-cyan",
    glow: "cyan" as const,
    tag: "ASSESS",
  },
  {
    icon: TrendingUp,
    title: "Portfolio Tracking",
    description: "Track your positions and P&L against live prices. Manual portfolio tracking today, direct broker execution coming soon.",
    color: "text-accent-emerald",
    glow: "emerald" as const,
    tag: "EXECUTE",
  },
];

// Pricing tiers loaded dynamically via useTiers hook (see PricingSection component)

// ── Animated Chat Simulation ──
function AnimatedChat() {
  const conversations = [
    [
      { role: "user" as const, text: "What's the Iran escalation risk?" },
      { role: "ai" as const, text: "Hormuz closure probability at 73%. Energy correlation spiking. Recommend risk-off posture." },
      { role: "user" as const, text: "Best hedge right now?" },
      { role: "ai" as const, text: "Long XLE, short transport index. Confidence 81%." },
    ],
    [
      { role: "user" as const, text: "Analyse gold price drivers this week" },
      { role: "ai" as const, text: "Three converging signals: USD weakening, PBOC buying, and Middle East premium. Target $2,840." },
      { role: "user" as const, text: "Should I add to my position?" },
      { role: "ai" as const, text: "Scale in on dips below $2,780. Risk/reward favourable at 2.3:1." },
    ],
    [
      { role: "user" as const, text: "What signals fired today?" },
      { role: "ai" as const, text: "4 high-intensity signals. NATO mobilisation in Baltics, oil contango widening, VIX term structure inversion." },
      { role: "user" as const, text: "Portfolio impact?" },
      { role: "ai" as const, text: "Defence sector +2.4% implied. Rotate from tech to commodities. Confidence 76%." },
    ],
  ];

  const [convoIndex, setConvoIndex] = useState(0);
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [typingText, setTypingText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const convo = conversations[convoIndex];
    if (visibleMessages >= convo.length) {
      const timeout = setTimeout(() => {
        setVisibleMessages(0);
        setTypingText("");
        setConvoIndex((prev) => (prev + 1) % conversations.length);
      }, 3000);
      return () => clearTimeout(timeout);
    }

    const msg = convo[visibleMessages];
    if (msg.role === "ai") {
      setIsTyping(true);
      let charIndex = 0;
      setTypingText("");
      const typeInterval = setInterval(() => {
        charIndex++;
        setTypingText(msg.text.slice(0, charIndex));
        if (charIndex >= msg.text.length) {
          clearInterval(typeInterval);
          setIsTyping(false);
          setTimeout(() => setVisibleMessages((v) => v + 1), 800);
        }
      }, 20);
      return () => clearInterval(typeInterval);
    } else {
      const timeout = setTimeout(() => {
        setVisibleMessages((v) => v + 1);
      }, 1000);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleMessages, convoIndex]);

  const convo = conversations[convoIndex];

  return (
    <div className="relative h-52 bg-navy-900/80 overflow-hidden p-4">
      <div className="space-y-2.5 h-full overflow-hidden">
        {convo.slice(0, visibleMessages).map((msg, i) => (
          <div key={`${convoIndex}-${i}`} className={`flex gap-2 items-start ${msg.role === "user" ? "justify-end" : ""}`} style={{ animation: "wr-fade-in 300ms ease-out" }}>
            {msg.role === "ai" && (
              <div className="h-5 w-5 rounded-full bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-accent-cyan/60" />
              </div>
            )}
            <div className={`rounded-lg px-3 py-2 text-[10px] font-mono leading-relaxed max-w-[85%] ${
              msg.role === "user"
                ? "bg-accent-cyan/[0.06] border border-accent-cyan/10 text-navy-300 rounded-tr-sm"
                : "bg-navy-800/60 text-navy-300 rounded-tl-sm"
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {/* Currently typing AI message */}
        {isTyping && visibleMessages < convo.length && convo[visibleMessages].role === "ai" && (
          <div className="flex gap-2 items-start" style={{ animation: "wr-fade-in 300ms ease-out" }}>
            <div className="h-5 w-5 rounded-full bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <div className="h-1.5 w-1.5 rounded-full bg-accent-cyan/60" />
            </div>
            <div className="bg-navy-800/60 rounded-lg rounded-tl-sm px-3 py-2 text-[10px] text-navy-300 font-mono leading-relaxed max-w-[85%]">
              {typingText}<span className="inline-block w-1 h-3 bg-accent-cyan/50 ml-0.5 animate-pulse" />
            </div>
          </div>
        )}
        {/* Waiting for user message to appear */}
        {!isTyping && visibleMessages < convo.length && convo[visibleMessages].role === "user" && (
          <div className="flex gap-2 items-start justify-end" style={{ animation: "wr-fade-in 200ms ease-out" }}>
            <div className="bg-navy-800/30 rounded-lg px-3 py-2">
              <div className="flex gap-1">
                <div className="h-1 w-1 rounded-full bg-navy-500" style={{ animation: "wr-dot-pulse 1.4s infinite", animationDelay: "0s" }} />
                <div className="h-1 w-1 rounded-full bg-navy-500" style={{ animation: "wr-dot-pulse 1.4s infinite", animationDelay: "0.2s" }} />
                <div className="h-1 w-1 rounded-full bg-navy-500" style={{ animation: "wr-dot-pulse 1.4s infinite", animationDelay: "0.4s" }} />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-navy-900/80 to-transparent" />
    </div>
  );
}

// ── SVG World Map with Threat Markers ──
function ThreatMap() {
  // Simplified world map paths (continents as rough outlines)
  const continents = [
    // Europe
    "M 240,55 L 255,50 270,52 280,48 290,55 285,65 275,70 260,68 245,65 Z",
    // Africa
    "M 245,75 L 260,72 275,78 280,95 275,115 260,120 248,115 240,100 238,85 Z",
    // Asia
    "M 285,45 L 310,40 340,42 360,50 370,60 365,75 350,80 330,78 310,70 295,65 288,55 Z",
    // Middle East
    "M 278,62 L 295,58 308,65 305,75 295,78 282,75 Z",
    // North America
    "M 80,45 L 110,35 140,40 155,50 150,65 135,75 115,78 95,72 80,60 Z",
    // South America
    "M 120,85 L 135,82 145,95 140,115 130,125 118,120 112,105 115,92 Z",
    // Australia
    "M 340,100 L 360,95 370,105 365,115 350,118 340,110 Z",
  ];

  // Threat hotspots with real-ish geo positions (mapped to SVG viewBox)
  const threats = [
    { x: 290, y: 68, label: "HORMUZ", intensity: 5, delay: 0 },
    { x: 265, y: 82, label: "SAHEL", intensity: 3, delay: 0.8 },
    { x: 310, y: 55, label: "TAIWAN", intensity: 4, delay: 1.5 },
    { x: 275, y: 58, label: "BLACK SEA", intensity: 4, delay: 0.4 },
    { x: 345, y: 48, label: "DPRK", intensity: 3, delay: 2.0 },
    { x: 252, y: 60, label: "BALTIC", intensity: 2, delay: 1.2 },
  ];

  // Aircraft tracks
  const aircraft = [
    { path: "M 260,56 Q 275,52 290,58", delay: 0 },
    { path: "M 295,72 Q 310,68 325,62", delay: 1.5 },
    { path: "M 100,55 Q 140,45 180,48", delay: 3 },
  ];

  return (
    <div className="relative h-52 bg-navy-950/90 overflow-hidden">
      {/* Grid underlay */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: `
          linear-gradient(rgba(244,63,94,0.5) 1px, transparent 1px),
          linear-gradient(90deg, rgba(244,63,94,0.5) 1px, transparent 1px)
        `,
        backgroundSize: "24px 24px",
      }} />

      <svg viewBox="60 25 340 110" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
        {/* Continent outlines */}
        {continents.map((d, i) => (
          <path key={i} d={d} fill="rgba(31,31,31,0.6)" stroke="rgba(61,61,61,0.4)" strokeWidth="0.5" />
        ))}

        {/* Connection lines between threats */}
        <line x1="290" y1="68" x2="275" y2="58" stroke="rgba(244,63,94,0.1)" strokeWidth="0.3" strokeDasharray="2,2" />
        <line x1="275" y1="58" x2="252" y2="60" stroke="rgba(244,63,94,0.08)" strokeWidth="0.3" strokeDasharray="2,2" />
        <line x1="310" y1="55" x2="345" y2="48" stroke="rgba(244,63,94,0.08)" strokeWidth="0.3" strokeDasharray="2,2" />

        {/* Aircraft tracks */}
        {aircraft.map((a, i) => (
          <g key={`ac-${i}`}>
            <path d={a.path} fill="none" stroke="rgba(6,182,212,0.15)" strokeWidth="0.4" strokeDasharray="3,3" />
            <circle r="1.2" fill="rgba(6,182,212,0.6)">
              <animateMotion dur="6s" repeatCount="indefinite" begin={`${a.delay}s`} path={a.path} />
            </circle>
          </g>
        ))}

        {/* Threat markers */}
        {threats.map((t) => (
          <g key={t.label}>
            {/* Pulse ring */}
            <circle cx={t.x} cy={t.y} r="2" fill="none" stroke={t.intensity >= 4 ? "rgba(244,63,94,0.4)" : "rgba(245,158,11,0.3)"} strokeWidth="0.5">
              <animate attributeName="r" values="2;8;2" dur="3s" begin={`${t.delay}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0;0.6" dur="3s" begin={`${t.delay}s`} repeatCount="indefinite" />
            </circle>
            {/* Core dot */}
            <circle cx={t.x} cy={t.y} r="1.5" fill={t.intensity >= 4 ? "rgba(244,63,94,0.8)" : "rgba(245,158,11,0.6)"} />
            {/* Label */}
            <text x={t.x + 4} y={t.y + 1} fill={t.intensity >= 4 ? "rgba(244,63,94,0.5)" : "rgba(245,158,11,0.4)"} fontSize="3" fontFamily="monospace" letterSpacing="0.5">
              {t.label}
            </text>
          </g>
        ))}
      </svg>

      {/* Scan line sweep */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "linear-gradient(180deg, transparent 0%, rgba(244,63,94,0.02) 50%, transparent 100%)",
        animation: "threat-scan 4s ease-in-out infinite",
      }} />

      {/* Labels */}
      <div className="absolute bottom-3 left-4 flex items-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-accent-rose animate-pulse" />
        <span className="text-[9px] text-accent-rose/60 tracking-[0.2em] font-mono">LIVE THREAT MAP</span>
      </div>
      <div className="absolute bottom-3 right-4 flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="h-1 w-1 rounded-full bg-accent-rose/60" />
          <span className="text-[8px] text-navy-500 font-mono">HIGH</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-1 w-1 rounded-full bg-accent-amber/60" />
          <span className="text-[8px] text-navy-500 font-mono">MED</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-1 w-1 rounded-full bg-accent-cyan/60" />
          <span className="text-[8px] text-navy-500 font-mono">TRACK</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes threat-scan {
          0%, 100% { transform: translateY(-100%); }
          50% { transform: translateY(100%); }
        }
      `}</style>
    </div>
  );
}

// ── Animated Signal Bars ──
function AnimatedSignalBars({ revealed }: { revealed: boolean }) {
  const [bars, setBars] = useState([3, 5, 2, 4, 5, 3, 1, 4, 5, 2, 3, 4, 5, 3, 2, 4, 1, 5, 3, 4]);

  useEffect(() => {
    if (!revealed) return;
    const interval = setInterval(() => {
      setBars((prev) =>
        prev.map((v) => {
          const delta = Math.random() > 0.5 ? 1 : -1;
          return Math.max(1, Math.min(5, v + delta));
        })
      );
    }, 2000);
    return () => clearInterval(interval);
  }, [revealed]);

  return (
    <div className="relative h-40 bg-navy-900/80 overflow-hidden p-5">
      <div className="flex items-end gap-1.5 h-full pb-4">
        {bars.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-t transition-all duration-1000 ease-out"
            style={{
              height: revealed ? `${v * 18}%` : "0%",
              transitionDelay: revealed ? `${i * 50}ms` : "0ms",
              backgroundColor: v >= 4
                ? `rgba(245,158,11,${0.2 + v * 0.1})`
                : `rgba(245,158,11,${0.05 + v * 0.04})`,
            }}
          />
        ))}
      </div>
      {/* Threshold line */}
      <div className="absolute left-5 right-5 bottom-[calc(1rem+72%)] border-t border-dashed border-accent-rose/20">
        <span className="absolute -top-3 right-0 text-[8px] text-accent-rose/40 font-mono">THRESHOLD</span>
      </div>
      <div className="absolute bottom-3 left-4 flex items-center gap-2">
        <span className="text-[9px] text-accent-amber/50 tracking-[0.15em] font-mono">SIGNAL INTENSITY</span>
      </div>
    </div>
  );
}

// ── Animated Pipeline ──
function AnimatedPipeline({ revealed }: { revealed: boolean }) {
  const [activeStep, setActiveStep] = useState(-1);

  useEffect(() => {
    if (!revealed) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 2000);
    // Start after reveal animation
    const timeout = setTimeout(() => setActiveStep(0), 800);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [revealed]);

  const stages = [
    { label: "THESIS", color: "#10b981", icon: FileText },
    { label: "PREDICT", color: "#06b6d4", icon: Crosshair },
    { label: "EXECUTE", color: "#10b981", icon: TrendingUp },
  ];

  return (
    <div className="relative h-40 bg-navy-900/80 overflow-hidden p-5">
      <div className="flex items-center justify-between h-full px-4">
        {stages.map((stage, i) => (
          <div key={stage.label} className="flex items-center gap-4 flex-1">
            <div className={`flex flex-col items-center gap-2 flex-1 transition-all duration-700 ${revealed ? "opacity-100 scale-100" : "opacity-0 scale-90"}`} style={{ transitionDelay: `${800 + i * 200}ms` }}>
              <div
                className="h-12 w-12 rounded-xl border flex items-center justify-center transition-all duration-500"
                style={{
                  borderColor: activeStep === i ? `${stage.color}50` : `${stage.color}20`,
                  backgroundColor: activeStep === i ? `${stage.color}15` : `${stage.color}08`,
                  boxShadow: activeStep === i ? `0 0 20px ${stage.color}15` : "none",
                  transform: activeStep === i ? "scale(1.1)" : "scale(1)",
                }}
              >
                <stage.icon className="h-5 w-5 transition-colors duration-500" style={{ color: activeStep === i ? `${stage.color}` : `${stage.color}60` }} />
              </div>
              <span className="text-[9px] tracking-[0.15em] font-mono transition-colors duration-500" style={{ color: activeStep === i ? `${stage.color}` : `${stage.color}50` }}>
                {stage.label}
              </span>
            </div>
            {i < 2 && (
              <div className="flex-shrink-0 flex items-center">
                <div
                  className="w-8 h-px transition-all duration-700"
                  style={{
                    background: `linear-gradient(to right, ${stages[i].color}30, ${stages[i + 1].color}30)`,
                    opacity: revealed ? 1 : 0,
                    transform: revealed ? "scaleX(1)" : "scaleX(0)",
                    transitionDelay: `${900 + i * 200}ms`,
                  }}
                />
                <ArrowRight
                  className="h-3 w-3 -ml-1 transition-all duration-500"
                  style={{
                    color: activeStep === i ? stages[i].color : "rgba(92,92,92,0.5)",
                    opacity: revealed ? 1 : 0,
                    transitionDelay: `${1000 + i * 200}ms`,
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Progress indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
        {stages.map((s, i) => (
          <div
            key={i}
            className="h-0.5 w-6 rounded-full transition-all duration-500"
            style={{ backgroundColor: activeStep >= i ? s.color : "rgba(61,61,61,0.4)" }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Bento Features Section ──
function BentoFeatures() {
  const { ref, revealed } = useScrollReveal(0.1);

  const base = "transition-all duration-700 ease-out";
  const hidden = "opacity-0 translate-y-8";
  const visible = "opacity-100 translate-y-0";

  return (
    <section id="features" className="relative py-28" ref={ref}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className={`inline-flex items-center gap-2 border border-navy-700/40 rounded-full px-4 py-1.5 mb-6 ${base} ${revealed ? visible : hidden}`}>
            <Zap className="h-3 w-3 text-accent-amber" />
            <span className="text-[10px] text-navy-400 tracking-[0.2em] uppercase">
              Capabilities
            </span>
          </div>
          <h2 className={`font-sans text-3xl md:text-4xl font-bold text-white mb-4 ${base} ${revealed ? visible : hidden}`} style={{ transitionDelay: "100ms" }}>
            Everything connected, nothing siloed
          </h2>
          <p className={`text-sm text-navy-400 max-w-lg mx-auto ${base} ${revealed ? visible : hidden}`} style={{ transitionDelay: "200ms" }}>
            Six modules that actually talk to each other. Signals feed into theses, theses feed into predictions, predictions feed into trades. One pipeline, start to finish.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-6 lg:grid-rows-2 gap-4">
          {/* War Room — large card with SVG map */}
          <div className={`lg:col-span-4 ${base} ${revealed ? visible : hidden}`} style={{ transitionDelay: "300ms" }}>
            <div className="group h-full rounded-2xl border border-navy-700/40 bg-navy-900/60 backdrop-blur-sm overflow-hidden hover:border-accent-rose/30 hover:shadow-[0_0_40px_rgba(244,63,94,0.06)] transition-all duration-500 lg:rounded-tl-[2rem]">
              <ThreatMap />
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <Shield className="h-4 w-4 text-accent-rose" />
                    <h3 className="text-base font-bold text-navy-100 font-sans">War Room</h3>
                  </div>
                  <span className="text-[9px] font-mono text-navy-500 tracking-[0.2em] border border-navy-700/30 rounded px-2 py-0.5">GEOINT</span>
                </div>
                <p className="text-xs text-navy-400 leading-relaxed font-sans max-w-md">
                  A live view of the world as it actually is. Military aircraft tracked, OSINT feeds streaming, conflict zones mapped. You see escalation patterns forming before they hit the news.
                </p>
              </div>
            </div>
          </div>

          {/* AI Analyst — animated chat */}
          <div className={`lg:col-span-2 ${base} ${revealed ? visible : hidden}`} style={{ transitionDelay: "400ms" }}>
            <div className="group h-full rounded-2xl border border-navy-700/40 bg-navy-900/60 backdrop-blur-sm overflow-hidden hover:border-accent-cyan/30 hover:shadow-[0_0_40px_rgba(6,182,212,0.06)] transition-all duration-500 lg:rounded-tr-[2rem]">
              <AnimatedChat />
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <MessageSquare className="h-4 w-4 text-accent-cyan" />
                    <h3 className="text-base font-bold text-navy-100 font-sans">AI Analyst</h3>
                  </div>
                  <span className="text-[9px] font-mono text-navy-500 tracking-[0.2em] border border-navy-700/30 rounded px-2 py-0.5">HUMINT</span>
                </div>
                <p className="text-xs text-navy-400 leading-relaxed font-sans">
                  Ask it anything, it understands macro, geopolitics, and how markets actually respond to world events. Like having an analyst on call, 24/7.
                </p>
              </div>
            </div>
          </div>

          {/* Signal Detection — animated bars */}
          <div className={`lg:col-span-2 ${base} ${revealed ? visible : hidden}`} style={{ transitionDelay: "500ms" }}>
            <div className="group h-full rounded-2xl border border-navy-700/40 bg-navy-900/60 backdrop-blur-sm overflow-hidden hover:border-accent-amber/30 hover:shadow-[0_0_40px_rgba(245,158,11,0.06)] transition-all duration-500 lg:rounded-bl-[2rem]">
              <AnimatedSignalBars revealed={revealed} />
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <Activity className="h-4 w-4 text-accent-amber" />
                    <h3 className="text-base font-bold text-navy-100 font-sans">Signal Detection</h3>
                  </div>
                  <span className="text-[9px] font-mono text-navy-500 tracking-[0.2em] border border-navy-700/30 rounded px-2 py-0.5">SIGINT</span>
                </div>
                <p className="text-xs text-navy-400 leading-relaxed font-sans">
                  Multiple data layers scanning constantly. When something meaningful shifts, the system catches it and tells you why it matters.
                </p>
              </div>
            </div>
          </div>

          {/* Thesis + Predictions + Trading — animated pipeline */}
          <div className={`lg:col-span-4 ${base} ${revealed ? visible : hidden}`} style={{ transitionDelay: "600ms" }}>
            <div className="group h-full rounded-2xl border border-navy-700/40 bg-navy-900/60 backdrop-blur-sm overflow-hidden hover:border-accent-emerald/30 hover:shadow-[0_0_40px_rgba(16,185,129,0.06)] transition-all duration-500 lg:rounded-br-[2rem]">
              <AnimatedPipeline revealed={revealed} />
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <FileText className="h-4 w-4 text-accent-emerald" />
                    <h3 className="text-base font-bold text-navy-100 font-sans">Thesis, Predictions & Execution</h3>
                  </div>
                  <span className="text-[9px] font-mono text-navy-500 tracking-[0.2em] border border-navy-700/30 rounded px-2 py-0.5">FUSION</span>
                </div>
                <p className="text-xs text-navy-400 leading-relaxed font-sans max-w-lg">
                  Intelligence turns into theses, theses into scored predictions, predictions into executable trades. Every step tracked, every call accountable.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [billingAnnual, setBillingAnnual] = useState(false);
  const { tiers: dbTiers } = useTiers();

  // Map DB tiers to display format, with fallback descriptions and CTAs
  const tierMeta: Record<string, { description: string; cta: string }> = {
    Observer: { description: "Individual intelligence capability", cta: "Start Observing" },
    Operator: { description: "Full operational capability", cta: "Go Operational" },
    Institution: { description: "Multi-seat deployment", cta: "Contact Us" },
  };
  const tiers = dbTiers.map((t) => ({
    name: t.name,
    price: t.price > 0 ? `$${t.price}` : "Custom",
    priceAnnual: t.price > 0 ? `$${Math.round(t.price * 0.85)}` : "Custom",
    period: t.price > 0 ? "/mo" : "",
    description: tierMeta[t.name]?.description || t.name,
    features: t.features,
    cta: tierMeta[t.name]?.cta || "Get Started",
    highlighted: t.highlighted,
  }));

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-navy-950 text-navy-100 font-mono">
      {/* ── Sticky Nav ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-navy-950/90 backdrop-blur-md border-b border-navy-700/40"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/landing" className="flex items-center gap-2.5">
            <Image src="/nexuslogo.png" alt="Nexus" width={28} height={28} />
            <span className="text-[13px] font-semibold tracking-[0.15em] text-navy-100" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              Nexus
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <a href="#features" className="text-[11px] text-navy-400 hover:text-navy-200 transition-colors tracking-wide">
              CAPABILITIES
            </a>
            <a href="#pricing" className="text-[11px] text-navy-400 hover:text-navy-200 transition-colors tracking-wide">
              PRICING
            </a>
            <Link
              href="/login"
              className="text-[11px] text-navy-400 hover:text-navy-200 transition-colors tracking-wide"
            >
              SIGN IN
            </Link>
            <Link
              href="/login"
              className="text-[11px] bg-accent-cyan/10 hover:bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/20 hover:border-accent-cyan/40 rounded px-4 py-1.5 transition-all duration-300 tracking-wide"
            >
              GET ACCESS
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <GridBackground />

        {/* Accent glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-cyan/[0.02] rounded-full blur-[100px]" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-accent-rose/[0.02] rounded-full blur-[100px]" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          {/* Classification badge */}
          <div className="inline-flex items-center gap-2 border border-accent-cyan/20 rounded-full px-4 py-1.5 mb-8">
            <div className="h-1.5 w-1.5 rounded-full bg-accent-cyan animate-pulse" />
            <span className="text-[10px] text-accent-cyan/80 tracking-[0.2em] uppercase">
              Intelligence Platform
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.05] mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            The world is moving fast.
            <br />
            You need to see it clearly.
          </h1>

          <p className="font-sans text-lg text-navy-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Stability is a story we tell ourselves. Wars break out, markets shift overnight, and the things you thought were safe suddenly aren&apos;t. Nexus connects geopolitical intelligence, signal analysis, and AI-driven predictions so you can actually understand what&apos;s happening, and make better decisions because of it.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.10] text-navy-100 border border-white/10 hover:border-white/20 rounded px-7 py-2.5 text-xs font-medium tracking-wide transition-all duration-300"
            >
              Start Free Trial
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 text-navy-400 hover:text-navy-200 text-sm transition-colors"
            >
              See Capabilities
              <ChevronDown className="h-4 w-4" />
            </a>
          </div>

          {/* Terminal preview hint */}
          <div className="mt-16 mx-auto max-w-2xl">
            <div className="border border-navy-700/40 rounded-lg bg-navy-900/40 backdrop-blur-sm overflow-hidden">
              <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-navy-700/30">
                <div className="h-2 w-2 rounded-full bg-accent-rose/60" />
                <div className="h-2 w-2 rounded-full bg-accent-amber/60" />
                <div className="h-2 w-2 rounded-full bg-accent-emerald/60" />
                <span className="ml-3 text-[9px] text-navy-500 tracking-wider">NEXUS TERMINAL</span>
              </div>
              <div className="p-5 font-mono text-xs space-y-2">
                <div className="flex gap-3">
                  <span className="text-navy-500">01</span>
                  <span className="text-accent-cyan/70">SIGNAL</span>
                  <span className="text-navy-300">Iran strait tension escalation detected</span>
                  <span className="text-accent-rose ml-auto">INT:5</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-navy-500">02</span>
                  <span className="text-accent-emerald/70">THESIS</span>
                  <span className="text-navy-300">Risk-off regime shift, energy sector long bias</span>
                  <span className="text-accent-amber ml-auto">CONF:78%</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-navy-500">03</span>
                  <span className="text-accent-amber/70">TRADE</span>
                  <span className="text-navy-300">BUY XLE @ $89.40 | SL $86.20 | TP $97.00</span>
                  <span className="text-accent-emerald ml-auto">READY</span>
                </div>
                <div className="flex gap-3 opacity-50">
                  <span className="text-navy-500">04</span>
                  <span className="text-navy-400">_</span>
                  <span className="text-navy-500 animate-pulse">awaiting next signal...</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
          <span className="text-[9px] tracking-[0.3em] text-navy-500 uppercase">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-navy-500 to-transparent" />
        </div>
      </section>

      {/* ── Metrics Bar ── */}
      <section className="relative border-y border-navy-700/30 bg-navy-900/30">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: 2847, suffix: "+", label: "Signals Tracked" },
            { value: 73, suffix: "%", label: "Prediction Accuracy" },
            { value: 12, suffix: "", label: "Intelligence Layers" },
            { value: 50, suffix: "ms", label: "Signal Latency" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold text-white font-mono tracking-tight">
                <Counter end={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-[10px] text-navy-400 tracking-[0.15em] uppercase mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Bento ── */}
      <BentoFeatures />

      {/* ── Pricing ── */}
      <section id="pricing" className="relative py-28">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 border border-navy-700/40 rounded-full px-4 py-1.5 mb-6">
              <Lock className="h-3 w-3 text-accent-emerald" />
              <span className="text-[10px] text-navy-400 tracking-[0.2em] uppercase">
                Pricing
              </span>
            </div>
            <h2 className="font-sans text-3xl md:text-4xl font-bold text-white mb-4">
              Pick what fits
            </h2>
            <p className="text-sm text-navy-400 max-w-md mx-auto mb-8">
              2-day free trial on everything. Cancel anytime before you're charged.
            </p>
            <div className="flex items-center justify-center gap-3">
              <span className={`text-xs font-medium transition-colors ${!billingAnnual ? "text-navy-100" : "text-navy-500"}`}>Monthly</span>
              <button
                onClick={() => setBillingAnnual(!billingAnnual)}
                className={`relative w-11 h-6 rounded-full transition-colors ${billingAnnual ? "bg-accent-cyan/60" : "bg-navy-700"}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-navy-950 transition-transform ${billingAnnual ? "translate-x-6" : "translate-x-1"}`} />
              </button>
              <span className={`text-xs font-medium transition-colors ${billingAnnual ? "text-navy-100" : "text-navy-500"}`}>Annual</span>
              {billingAnnual && <span className="text-[9px] font-mono text-accent-emerald border border-accent-emerald/30 rounded-full px-2 py-0.5">Save 15%</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-lg p-6 transition-all duration-500 ${
                  tier.highlighted
                    ? "bg-navy-900/80 border-2 border-accent-cyan/30 shadow-[0_0_40px_rgba(6,182,212,0.08)]"
                    : "bg-navy-900/40 border border-navy-700/40 hover:border-navy-600/60"
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-[9px] bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30 rounded-full px-3 py-1 tracking-[0.15em] uppercase">
                      Recommended
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xs font-bold tracking-[0.15em] uppercase text-navy-300 mb-1">
                    {tier.name}
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white font-sans">
                      {billingAnnual ? tier.priceAnnual : tier.price}
                    </span>
                    {tier.period && (
                      <span className="text-sm text-navy-500">{tier.period}</span>
                    )}
                  </div>
                  {billingAnnual && tier.price !== "Custom" && (
                    <span className="text-[10px] text-navy-500 font-mono">billed annually</span>
                  )}
                  <p className="text-[11px] text-navy-500 mt-2">{tier.description}</p>
                </div>

                <div className="space-y-2.5 mb-8">
                  {tier.features.map((f) => (
                    <div key={f} className="flex items-start gap-2.5">
                      <Check className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${tier.highlighted ? "text-accent-cyan" : "text-navy-500"}`} />
                      <span className="text-xs text-navy-300 font-sans">{f}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/login"
                  className={`block text-center text-xs font-medium rounded-lg px-4 py-2.5 transition-all duration-300 ${
                    tier.highlighted
                      ? "bg-accent-cyan/10 hover:bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30 hover:border-accent-cyan/50 shadow-[0_0_20px_rgba(6,182,212,0.08)]"
                      : "bg-navy-800/60 hover:bg-navy-800 text-navy-300 hover:text-navy-100 border border-navy-700/40 hover:border-navy-600/60"
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative py-28 overflow-hidden">
        {/* Subtle glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-accent-cyan/[0.03] rounded-full blur-[120px]" />

        <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <Globe className="h-4 w-4 text-accent-cyan/60" />
            <span className="text-[10px] text-navy-400 tracking-[0.2em] uppercase">
              Global Intelligence Network
            </span>
          </div>

          <h2 className="font-sans text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
            The world won&apos;t wait<br />for you to catch up
          </h2>

          <p className="text-sm text-navy-400 mb-10 max-w-md mx-auto leading-relaxed font-sans">
            You can keep reading headlines after the fact, or you can see things forming before they land. 2 days free, full access, cancel whenever.
          </p>

          <Link
            href="/login"
            className="group inline-flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/10 hover:border-white/20 rounded-lg px-10 py-3.5 text-sm font-medium transition-all duration-300"
          >
            Get Started
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-navy-700/30 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Image src="/nexuslogo.png" alt="Nexus" width={20} height={20} />
            <span className="text-[10px] text-navy-500 tracking-[0.15em]" style={{ fontFamily: "'Orbitron', sans-serif" }}>Nexus</span>
          </div>
          <div className="flex items-center gap-6 text-[10px] text-navy-500 tracking-wide">
            <a href="#" className="hover:text-navy-300 transition-colors">TERMS</a>
            <a href="#" className="hover:text-navy-300 transition-colors">PRIVACY</a>
            <a href="#" className="hover:text-navy-300 transition-colors">DOCS</a>
            <a href="#" className="hover:text-navy-300 transition-colors">STATUS</a>
          </div>
          <span className="text-[9px] text-navy-600">
            {new Date().getFullYear()} NEXUS INTEL
          </span>
        </div>
      </footer>
    </div>
  );
}
