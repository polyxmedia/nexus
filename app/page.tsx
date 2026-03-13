"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Shield,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  Crosshair,
  BookOpen,
  Clock,
  ArrowUpRight,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Network,
  Bell,
  FileText,
  Check,
  Zap,
  Globe,
  Lock,
  ChevronDown,
  AlertTriangle,
  Eye,
  Radar,
  HelpCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import { HeroTerminal } from "@/components/landing/hero-terminal";
import { PublicFooter } from "@/components/layout/public-footer";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const ThreatMapPreview = dynamic(
  () => import("@/components/landing/threat-map-preview"),
  { ssr: false, loading: () => <div className="h-52 bg-navy-950" /> }
);

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
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(6,182,212,0.4) 2px, rgba(6,182,212,0.4) 4px)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, transparent 0%, var(--color-navy-950) 70%)",
        }}
      />
    </div>
  );
}

// ── Status data ──
interface StatusData {
  maxEscalation: number;
  marketRegime: string;
  activeSignalCount: number;
  highIntensityCount: number;
  convergenceDensity: number;
  volatilityOutlook: string;
}

// ── Module sections ──
const SECTIONS = [
  {
    label: "Core",
    items: [
      { name: "War Room", href: "/warroom", icon: Shield, desc: "Real-time geopolitical theater with scenario modeling" },
      { name: "Chat", href: "/chat", icon: MessageSquare, desc: "AI analyst with 20+ intelligence tools" },
      { name: "Dashboard", href: "/dashboard", icon: BarChart3, desc: "Configurable metrics and live data" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { name: "Signals", href: "/signals", icon: Activity, desc: "Multi-layer convergence events scored 1-5" },
      { name: "Predictions", href: "/predictions", icon: Crosshair, desc: "AI predictions with tracked hit/miss rates" },
      { name: "Knowledge", href: "/knowledge", icon: BookOpen, desc: "Theses, world models, actor profiles" },
      { name: "Timeline", href: "/timeline", icon: Clock, desc: "Full event stream with cross-referencing" },
    ],
  },
  {
    label: "Markets",
    items: [
      { name: "Watchlists", href: "/watchlists", icon: Eye, desc: "Track symbols with live quotes and alerts" },
      { name: "Trading", href: "/trading", icon: TrendingUp, desc: "Manual portfolio tracking with live market data" },
      { name: "Calendar", href: "/calendar", icon: Calendar, desc: "Hebrew, Islamic, FOMC, OPEX convergence" },
      { name: "Thesis", href: "/thesis", icon: FileText, desc: "AI-generated daily operational briefings" },
      { name: "Alerts", href: "/alerts", icon: Bell, desc: "Email, Telegram & SMS notifications on thresholds and events" },
      { name: "Graph", href: "/graph", icon: Network, desc: "Entity and relationship intelligence map" },
    ],
  },
];

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

// ── Pricing tiers ──
const tiers = [
  {
    name: "Observer",
    price: "£49",
    priceAnnual: "£39",
    period: "/mo",
    description: "Serious investor",
    features: [
      "Signal detection engine",
      "Daily thesis generation",
      "Market sentiment analysis",
      "Prediction tracking with Brier scores",
      "War Room with OSINT feeds",
      "Calendar intelligence",
      "Email alerts",
    ],
    cta: "Start Observing",
    highlighted: false,
  },
  {
    name: "Operator",
    price: "£199",
    priceAnnual: "£169",
    period: "/mo",
    description: "Macro trader",
    features: [
      "Everything in Observer",
      "Game theory scenarios",
      "Vessel tracking & dark fleet intel",
      "Monte Carlo simulation",
      "Prediction engine with full calibration",
      "Portfolio risk analytics",
      "GEX, BOCPD & regime detection",
      "Short interest & options flow",
      "On-chain analytics",
      "Congressional trading signals",
    ],
    cta: "Go Operational",
    highlighted: true,
  },
];

// ── Animated Chat Simulation ──
function AnimatedChat() {
  const allMessages = [
    { role: "user" as const, text: "What's the Iran escalation risk?" },
    { role: "ai" as const, text: "Hormuz closure probability at 73%. Energy correlation spiking. Recommend risk-off posture." },
    { role: "user" as const, text: "Best hedge right now?" },
    { role: "ai" as const, text: "Long XLE, short transport index. Confidence 81%." },
    { role: "user" as const, text: "Analyse gold price drivers this week" },
    { role: "ai" as const, text: "Three converging signals: USD weakening, PBOC buying, and Middle East premium. Target $2,840." },
    { role: "user" as const, text: "Should I add to my position?" },
    { role: "ai" as const, text: "Scale in on dips below $2,780. Risk/reward favourable at 2.3:1." },
    { role: "user" as const, text: "What signals fired today?" },
    { role: "ai" as const, text: "4 high-intensity signals. NATO mobilisation in Baltics, oil contango widening, VIX term structure inversion." },
    { role: "user" as const, text: "Portfolio impact?" },
    { role: "ai" as const, text: "Defence sector +2.4% implied. Rotate from tech to commodities. Confidence 76%." },
  ];

  const [visibleCount, setVisibleCount] = useState(0);
  const [typingText, setTypingText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever content changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleCount, typingText]);

  useEffect(() => {
    if (visibleCount >= allMessages.length) {
      // All messages shown - pause, then loop back to start
      const timeout = setTimeout(() => {
        setVisibleCount(0);
        setTypingText("");
      }, 4000);
      return () => clearTimeout(timeout);
    }

    const msg = allMessages[visibleCount];
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
          setTimeout(() => setVisibleCount((v) => v + 1), 800);
        }
      }, 20);
      return () => clearInterval(typeInterval);
    } else {
      const timeout = setTimeout(() => {
        setVisibleCount((v) => v + 1);
      }, 1000);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleCount]);

  return (
    <div className="relative h-52 bg-navy-900/80 overflow-hidden p-4">
      <div ref={scrollRef} className="space-y-2.5 h-full overflow-y-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {allMessages.slice(0, visibleCount).map((msg, i) => (
          <div key={i} className={`flex gap-2 items-start ${msg.role === "user" ? "justify-end" : ""}`} style={{ animation: "wr-fade-in 300ms ease-out" }}>
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
        {isTyping && visibleCount < allMessages.length && allMessages[visibleCount].role === "ai" && (
          <div className="flex gap-2 items-start" style={{ animation: "wr-fade-in 300ms ease-out" }}>
            <div className="h-5 w-5 rounded-full bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <div className="h-1.5 w-1.5 rounded-full bg-accent-cyan/60" />
            </div>
            <div className="bg-navy-800/60 rounded-lg rounded-tl-sm px-3 py-2 text-[10px] text-navy-300 font-mono leading-relaxed max-w-[85%]">
              {typingText}<span className="inline-block w-1 h-3 bg-accent-cyan/50 ml-0.5 animate-pulse" />
            </div>
          </div>
        )}
        {!isTyping && visibleCount < allMessages.length && allMessages[visibleCount].role === "user" && (
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
        {/* Spacer to ensure scroll room */}
        <div className="h-4" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-navy-900/80 to-transparent pointer-events-none" />
    </div>
  );
}

// ── War Room Map Preview (real CARTO tiles) ──
// ThreatMap is now imported as ThreatMapPreview via dynamic import at top of file

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
                className="flex items-center justify-center transition-all duration-500"
                style={{
                  transform: activeStep === i ? "scale(1.15)" : "scale(1)",
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
          {/* War Room */}
          <div className={`lg:col-span-4 ${base} ${revealed ? visible : hidden}`} style={{ transitionDelay: "300ms" }}>
            <div className="group h-full rounded-2xl border border-navy-700/40 bg-navy-900/60 backdrop-blur-sm overflow-hidden hover:border-accent-rose/30 hover:shadow-[0_0_40px_rgba(244,63,94,0.06)] transition-all duration-500 lg:rounded-tl-[2rem]">
              <ThreatMapPreview />
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

          {/* AI Analyst */}
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

          {/* Signal Detection */}
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

          {/* Pipeline */}
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

// ── Indicator ──
function Indicator({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono text-navy-600 uppercase">{label}</span>
      <span className={`text-[10px] font-mono font-medium uppercase ${color}`}>{value}</span>
    </div>
  );
}

// ── Home FAQ Item ──
function HomeFAQItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-navy-800/40">
      <button
        onClick={() => setOpen(!open)}
        className="w-full py-5 flex items-start gap-4 text-left group cursor-pointer"
      >
        <span className="text-[10px] font-mono tracking-wider text-accent-cyan mt-0.5 shrink-0 w-6">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="flex-1 text-[14px] text-navy-200 font-sans leading-relaxed group-hover:text-white transition-colors">
          {question}
        </span>
        <ChevronDown
          className="h-4 w-4 text-navy-500 mt-0.5 shrink-0 transition-transform duration-300"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-400"
        style={{ maxHeight: open ? "300px" : "0px", opacity: open ? 1 : 0 }}
      >
        <div className="pl-10 pb-5 text-[13px] text-navy-400 font-sans leading-relaxed max-w-xl">
          {answer}
        </div>
      </div>
    </div>
  );
}

// ── Home FAQ Section ──
function HomeFAQ() {
  const { ref, revealed } = useScrollReveal(0.1);

  const base = "transition-all duration-700 ease-out";
  const hidden = "opacity-0 translate-y-8";
  const visible = "opacity-100 translate-y-0";

  const faqs = [
    {
      question: "How much does analysis cost?",
      answer: "Every AI-powered operation consumes credits. A quick question to the analyst runs 20-50 credits. A detailed analysis with data pulls runs 80-200 credits. At $0.001 per credit, even complex sessions cost pennies. Your subscription includes a monthly credit allocation, and top-up packs are available if you need more.",
    },
    {
      question: "Does NEXUS use AI? What about hallucinations?",
      answer: "Yes, AI is central to the platform. We handle hallucination risk by grounding every output in real data: actual signals, market feeds, and OSINT sources. The analyst cites specific data points, and predictions are tracked against real outcomes with published accuracy scores. Where the system is uncertain, it says so.",
    },
    {
      question: "Is there a free trial?",
      answer: "Every new account receives 5,000 credits at no cost. That is enough for dozens of chat interactions and analysis sessions, giving you a real feel for the platform before committing to a subscription.",
    },
    {
      question: "What happens when I run out of credits?",
      answer: "AI-powered features pause until you top up or your monthly allocation resets. Non-AI features like the War Room, signal browsing, and news feed remain fully accessible. Top-up packs start at $10.",
    },
    {
      question: "What kind of signals does NEXUS track?",
      answer: "Four primary layers: Geopolitical (conflicts, sanctions, diplomacy), Market (options flow, volatility, credit spreads), OSINT (flight tracking, shipping, social media), and Systemic Risk (regime detection, macro indicators).",
    },
    {
      question: "How accurate are the predictions?",
      answer: "Every prediction is tracked with Brier scores and published transparently. The scoring separates directional calls from level estimates and filters stale predictions to maintain statistical rigour. Full methodology is on the Prediction Accuracy research page.",
    },
  ];

  return (
    <section className="relative py-28" ref={ref}>
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-14">
          <div className={`inline-flex items-center gap-2 border border-navy-700/40 rounded-full px-4 py-1.5 mb-6 ${base} ${revealed ? visible : hidden}`}>
            <HelpCircle className="h-3 w-3 text-accent-cyan" />
            <span className="text-[10px] text-navy-400 tracking-[0.2em] uppercase">FAQ</span>
          </div>
          <h2 className={`font-sans text-3xl md:text-4xl font-bold text-white mb-4 ${base} ${revealed ? visible : hidden}`} style={{ transitionDelay: "100ms" }}>
            Common questions
          </h2>
          <p className={`text-sm text-navy-400 max-w-md mx-auto ${base} ${revealed ? visible : hidden}`} style={{ transitionDelay: "200ms" }}>
            Quick answers on pricing, credits, and how the platform works.
          </p>
        </div>

        <div className={`${base} ${revealed ? visible : hidden}`} style={{ transitionDelay: "300ms" }}>
          {faqs.map((faq, i) => (
            <HomeFAQItem key={i} question={faq.question} answer={faq.answer} index={i} />
          ))}
        </div>

        <div className={`mt-8 text-center ${base} ${revealed ? visible : hidden}`} style={{ transitionDelay: "400ms" }}>
          <Link
            href="/research/faq"
            className="inline-flex items-center gap-2 text-[11px] font-mono tracking-widest uppercase text-navy-500 hover:text-navy-300 transition-colors"
          >
            View all FAQ
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════
// ── MAIN PAGE ──
// ════════════════════════════════════════════════════════════

export default function LandingPage() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [billingAnnual, setBillingAnnual] = useState(false);

  useEffect(() => {
    fetch("/api/warroom")
      .then((r) => r.json())
      .then((d) => setStatus(d?.metrics || null))
      .catch((err) => console.error("[Landing] warroom status fetch failed:", err));
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col overflow-x-hidden">
      {/* ── Sticky Header ── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-navy-950/90 backdrop-blur-md border-b border-navy-700/40"
          : "bg-navy-950 border-b border-navy-800/30"
      }`}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Radar className="h-5 w-5 text-white" />
            <span className="text-sm font-semibold tracking-[0.15em] text-navy-200 font-mono">
              NEXUS <span className="text-navy-400 font-normal">Intelligence</span>
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <Link href="/research/methodology" className="text-[11px] text-navy-400 hover:text-navy-200 transition-colors tracking-wide hidden md:block">
              METHODOLOGY
            </Link>
            <Link href="/research/signal-theory" className="text-[11px] text-navy-400 hover:text-navy-200 transition-colors tracking-wide hidden md:block">
              RESEARCH
            </Link>
            <Link href="/about" className="text-[11px] text-navy-400 hover:text-navy-200 transition-colors tracking-wide hidden md:block">
              ABOUT
            </Link>
            <Link href="/investors" className="text-[11px] text-navy-400 hover:text-navy-200 transition-colors tracking-wide hidden md:block">
              INVESTORS
            </Link>
            <Link href="/media" className="text-[11px] text-navy-400 hover:text-navy-200 transition-colors tracking-wide hidden md:block">
              MEDIA
            </Link>
            <Link
              href="/login"
              className="text-[11px] text-navy-400 hover:text-navy-200 transition-colors tracking-wide hidden md:block"
            >
              SIGN IN
            </Link>
            <ThemeToggle className="p-1.5 text-navy-400 hover:text-navy-200 transition-colors" dropdownDirection="down" />
            <Link
              href="/register"
              className="px-4 py-1.5 text-[11px] font-mono tracking-widest uppercase text-navy-100 bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.1] hover:border-white/[0.15] transition-all"
            >
              Request Access
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative pt-14">
        <GridBackground />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-cyan/[0.02] rounded-full blur-[100px]" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-accent-rose/[0.02] rounded-full blur-[100px]" />

        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Left: copy */}
            <div className="pt-8">
              <span className="text-[10px] text-navy-500 tracking-[0.3em] uppercase font-mono mb-6 block">
                Geopolitical Intelligence Platform
              </span>

              <h1 className="text-[32px] font-light tracking-tight text-navy-100 font-sans leading-tight">
                Alpha before<br />it&apos;s priced in
              </h1>
              <p className="text-[14px] text-navy-400 mt-4 font-sans max-w-md leading-relaxed">
                NEXUS synthesises geopolitical signals, market structure, OSINT, and game theory into actionable theses, with a backtested prediction track record and integrated execution. All the tools in one place. One coherent picture.
              </p>

              <div className="mt-8 flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="group flex items-center gap-2 px-5 py-2.5 text-[11px] font-mono tracking-widest uppercase text-navy-100 bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.1] hover:border-white/[0.15] transition-all"
                >
                  Enter Platform
                  <ArrowUpRight className="h-3 w-3 text-navy-500 group-hover:text-navy-300 transition-colors" />
                </Link>
                <Link
                  href="/register"
                  className="text-[11px] font-mono tracking-widest uppercase text-navy-500 hover:text-navy-300 transition-colors"
                >
                  Start for free
                </Link>
                <a
                  href="#features"
                  className="text-[11px] font-mono tracking-widest uppercase text-navy-500 hover:text-navy-300 transition-colors flex items-center gap-1"
                >
                  See How
                  <ChevronDown className="h-3 w-3" />
                </a>
              </div>

              {/* Differentiators */}
              <div className="mt-12 space-y-3">
                {[
                  { label: "Convergence detection", detail: "across 4 primary signal layers + narrative overlay, scored 1–5" },
                  { label: "Backtested predictions", detail: "Brier-scored with temporal isolation, p-value validated" },
                  { label: "Real-time war room", detail: "military aircraft, OSINT, conflict zones live" },
                  { label: "AI thesis generation", detail: "from signal to position in a single pipeline" },
                  { label: "Portfolio tracking", detail: "manual position tracking with live P&L, broker execution coming soon" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-1 h-1 rounded-full bg-accent-cyan/40 mt-1.5 shrink-0" />
                    <span className="text-[11px] font-sans">
                      <span className="text-navy-300">{item.label}</span>
                      <span className="text-navy-400 ml-1.5">{item.detail}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: animated terminal */}
            <div>
              <HeroTerminal />
            </div>
          </div>
        </div>
      </section>

      {/* ── Metrics Bar ── */}
      <section className="relative border-y border-navy-700/30 bg-navy-900/30">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: 2847, suffix: "+", label: "Signals Tracked" },
            { value: 73, suffix: "%", label: "Prediction Accuracy" },
            { value: 4, suffix: "+", label: "Primary Signal Layers" },
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

      {/* ── Modules ── */}
      <section id="modules" className="max-w-6xl mx-auto px-6 pb-24 w-full">
        <div className="text-center mb-12">
          <h2 className="font-sans text-3xl font-bold text-white mb-4">
            All modules
          </h2>
          <p className="text-sm text-navy-400 max-w-md mx-auto">
            Direct access to every layer of the platform. Each module feeds data into the others.
          </p>
        </div>

        {SECTIONS.map((section) => (
          <div key={section.label} className="mb-12">
            <h2 className="text-[10px] font-mono text-navy-500 uppercase tracking-[0.2em] mb-4">
              {section.label}
            </h2>
            <div className="grid grid-cols-1 gap-px bg-navy-800/20 rounded border border-navy-800/30 overflow-hidden">
              {section.items.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="group flex items-center justify-between px-5 py-4 bg-navy-950 hover:bg-navy-900/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <item.icon className="h-4 w-4 text-navy-500 group-hover:text-navy-300 transition-colors" />
                    <div>
                      <span className="text-[13px] text-navy-200 group-hover:text-navy-100 transition-colors font-sans">
                        {item.name}
                      </span>
                      <span className="text-[11px] text-navy-400 ml-3 font-sans">
                        {item.desc}
                      </span>
                    </div>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-navy-700 group-hover:text-navy-400 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>

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
            <p className="text-sm text-navy-400 max-w-md mx-auto mb-3">
              2-day free trial on everything. Cancel anytime before you're charged.
            </p>
            <p className="text-xs text-navy-500 max-w-md mx-auto mb-8">
              Or start for free with Dashboard, Signals, News, and War Room, no card required.
            </p>
            <div className="flex items-center justify-center gap-3">
              <span className={`text-xs font-medium transition-colors ${!billingAnnual ? "text-navy-100" : "text-navy-500"}`}>Monthly</span>
              <button
                onClick={() => setBillingAnnual(!billingAnnual)}
                className={`relative w-11 h-6 rounded-full transition-colors ${billingAnnual ? "bg-navy-400" : "bg-navy-700"}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-navy-950 transition-transform ${billingAnnual ? "translate-x-6" : "translate-x-1"}`} />
              </button>
              <span className={`text-xs font-medium transition-colors ${billingAnnual ? "text-navy-100" : "text-navy-500"}`}>Annual</span>
              {billingAnnual && <span className="text-[9px] font-mono text-accent-emerald border border-accent-emerald/30 rounded-full px-2 py-0.5">Save 15%</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-lg p-6 transition-all duration-500 ${
                  tier.highlighted
                    ? "bg-navy-900/80 border-2 border-navy-400/30 shadow-[0_0_40px_rgba(255,255,255,0.03)]"
                    : "bg-navy-900/40 border border-navy-700/40 hover:border-navy-600/60"
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-[9px] font-bold bg-navy-100 text-navy-950 rounded-full px-3.5 py-1 tracking-[0.15em] uppercase shadow-md">
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
                  {billingAnnual && (
                    <span className="text-[10px] text-navy-500 font-mono">billed annually</span>
                  )}
                  <p className="text-[11px] text-navy-400 mt-2">{tier.description}</p>
                </div>

                <div className="space-y-2.5 mb-8">
                  {tier.features.map((f) => (
                    <div key={f} className="flex items-start gap-2.5">
                      <Check className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${tier.highlighted ? "text-navy-200" : "text-navy-500"}`} />
                      <span className="text-xs text-navy-300 font-sans">{f}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/register"
                  className={`block text-center text-xs font-medium rounded-lg px-4 py-2.5 transition-all duration-300 ${
                    tier.highlighted
                      ? "bg-navy-100 hover:bg-white text-navy-950 font-semibold"
                      : "bg-navy-800/60 hover:bg-navy-800 text-navy-300 hover:text-navy-100 border border-navy-700/40 hover:border-navy-600/60"
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>

          {/* Station - institutional tier */}
          <div className="max-w-3xl mx-auto mt-6">
            <div className="rounded-lg border border-navy-700/40 bg-navy-900/30 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <h3 className="text-xs font-bold tracking-[0.15em] uppercase text-navy-300 mb-1">Station</h3>
                <p className="text-[11px] text-navy-400 mb-3">Family office / RIA / institutional desk</p>
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  {["Everything in Operator", "API access", "White-label briefings", "PDF exports", "Unlimited credits", "Custom integrations"].map((f) => (
                    <div key={f} className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-navy-500 flex-shrink-0" />
                      <span className="text-[11px] text-navy-400">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
              <a
                href="mailto:station@nexushq.xyz?subject=Station%20Enquiry"
                className="flex-shrink-0 text-xs font-medium rounded-lg px-6 py-2.5 bg-navy-800/60 hover:bg-navy-800 text-navy-300 hover:text-navy-100 border border-navy-700/40 hover:border-navy-600/60 transition-all duration-300"
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <HomeFAQ />

      {/* ── Final CTA ── */}
      <section className="relative py-28 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-accent-cyan/[0.03] rounded-full blur-[120px]" />

        <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <Globe className="h-4 w-4 text-accent-cyan/60" />
            <span className="text-[10px] text-navy-400 tracking-[0.2em] uppercase">
              Global Intelligence Network
            </span>
          </div>

          <h2 className="font-sans text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
            Markets move on information.<br />NEXUS moves first.
          </h2>

          <p className="text-sm text-navy-400 mb-10 max-w-md mx-auto leading-relaxed font-sans">
            By the time a geopolitical development hits the wire, the alpha is gone. NEXUS detects convergence across signals that most desks track in isolation. 2 days free, full access.
          </p>

          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/10 hover:border-white/20 rounded-lg px-10 py-3.5 text-sm font-medium transition-all duration-300"
          >
            Get Started
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <PublicFooter />
    </div>
  );
}
