"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Crosshair,
  Globe,
  Shield,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

// ── Entry types ──

type FeedEntry =
  | { type: "signal"; title: string; intensity: number; category: string }
  | { type: "price"; symbol: string; price: string; change: number; volume: string }
  | { type: "alert"; title: string; severity: "critical" | "warning" | "info" }
  | { type: "prediction"; title: string; confidence: number; direction: "bullish" | "bearish" | "neutral" }
  | { type: "news"; headline: string; source: string; region: string }
  | { type: "trade"; action: "BUY" | "SELL"; symbol: string; price: string; reason: string }
  | { type: "analysis"; text: string }
  | { type: "gametheory"; actors: { name: string; strategy: string; payoff: number }[] }
  | { type: "snapshot"; symbol: string; rsi: number; macd: number; trend: string; sma50: string; sma200: string };

const FEED_ENTRIES: FeedEntry[] = [
  { type: "signal", title: "Hormuz Strait military buildup detected", intensity: 5, category: "geopolitical" },
  { type: "price", symbol: "XAU/USD", price: "2,847.30", change: 2.4, volume: "184K" },
  { type: "alert", title: "VIX term structure inverted, risk-off regime shift", severity: "critical" },
  { type: "prediction", title: "Oil breaks $95 within 10 days", confidence: 78, direction: "bullish" },
  { type: "news", headline: "Pentagon confirms carrier group repositioning to Gulf of Oman", source: "Reuters", region: "Middle East" },
  { type: "analysis", text: "Three signals converging this week: FOMC rate decision, Purim calendar date, and escalating Hormuz tensions. Historical pattern suggests 3-5% equity drawdown when these overlap." },
  { type: "trade", action: "BUY", symbol: "XLE", price: "89.40", reason: "Energy thesis, Hormuz premium" },
  { type: "price", symbol: "BTC/USD", price: "67,420", change: -1.8, volume: "2.1B" },
  { type: "snapshot", symbol: "SPY", rsi: 28.4, macd: -2.18, trend: "bearish", sma50: "502.17", sma200: "478.90" },
  { type: "signal", title: "FOMC + Hebrew calendar convergence Mar 12", intensity: 4, category: "convergence" },
  { type: "gametheory", actors: [
    { name: "Iran", strategy: "Proxy escalation", payoff: 0.72 },
    { name: "US", strategy: "Targeted strikes", payoff: 0.58 },
    { name: "Israel", strategy: "Preemptive action", payoff: 0.64 },
  ]},
  { type: "price", symbol: "CL1", price: "91.84", change: 4.1, volume: "312K" },
  { type: "alert", title: "Portfolio energy exposure exceeds 30% threshold", severity: "warning" },
  { type: "prediction", title: "NASDAQ corrects 5%+ on escalation", confidence: 71, direction: "bearish" },
  { type: "news", headline: "PBOC increases gold reserves for 16th consecutive month", source: "Bloomberg", region: "Asia" },
  { type: "trade", action: "SELL", symbol: "QQQ", price: "412.60", reason: "Risk-off rotation, tech overweight" },
  { type: "analysis", text: "Nash equilibrium analysis suggests continued escalation is the dominant strategy for all major actors. Oil above $90 in 78% of simulated scenarios. Defense sector implied +2.4%." },
  { type: "signal", title: "Baltic dry index collapse, shipping disruption", intensity: 3, category: "economic" },
  { type: "price", symbol: "XRP/USD", price: "2.34", change: 5.7, volume: "890M" },
  { type: "alert", title: "New OSINT: military aircraft detected over Strait", severity: "info" },
  { type: "snapshot", symbol: "GLD", rsi: 71.2, macd: 1.84, trend: "bullish", sma50: "178.40", sma200: "165.20" },
  { type: "prediction", title: "Gold reaches $3,000 by Q2", confidence: 64, direction: "bullish" },
  { type: "news", headline: "Saudi Arabia signals willingness to cut production further", source: "Al Jazeera", region: "Middle East" },
];

// ── Card renderers ──

function SignalEntry({ entry }: { entry: Extract<FeedEntry, { type: "signal" }> }) {
  const colors = entry.intensity >= 5
    ? "border-signal-5/30 bg-signal-5/[0.06]"
    : entry.intensity >= 4
    ? "border-signal-4/30 bg-signal-4/[0.06]"
    : "border-navy-700/50 bg-navy-900/60";

  return (
    <div className={`border rounded-md p-3 ${colors}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Activity className="h-3 w-3 text-accent-amber" />
          <span className="text-[9px] font-mono text-navy-500 uppercase tracking-wider">Signal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono text-navy-500">{entry.category}</span>
          <div className={`flex items-center justify-center w-4 h-4 rounded text-[8px] font-bold font-mono ${
            entry.intensity >= 5 ? "bg-signal-5/20 text-signal-5" :
            entry.intensity >= 4 ? "bg-signal-4/20 text-signal-4" :
            "bg-signal-3/20 text-signal-3"
          }`}>{entry.intensity}</div>
        </div>
      </div>
      <div className="text-[11px] text-navy-200 font-mono">{entry.title}</div>
    </div>
  );
}

function PriceEntry({ entry }: { entry: Extract<FeedEntry, { type: "price" }> }) {
  const up = entry.change >= 0;
  return (
    <div className="border border-navy-700/50 rounded-md bg-navy-900/60 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-3 w-3 text-navy-500" />
          <span className="text-[11px] font-mono font-bold text-navy-100">{entry.symbol}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-navy-200">{entry.price}</span>
          <div className={`flex items-center gap-0.5 text-[10px] font-mono ${up ? "text-accent-emerald" : "text-accent-rose"}`}>
            {up ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
            {up ? "+" : ""}{entry.change}%
          </div>
          <span className="text-[9px] font-mono text-navy-600">Vol {entry.volume}</span>
        </div>
      </div>
    </div>
  );
}

function AlertEntry({ entry }: { entry: Extract<FeedEntry, { type: "alert" }> }) {
  const styles = {
    critical: "border-accent-rose/30 bg-accent-rose/[0.06] text-accent-rose",
    warning: "border-accent-amber/30 bg-accent-amber/[0.06] text-accent-amber",
    info: "border-accent-cyan/30 bg-accent-cyan/[0.06] text-accent-cyan",
  };
  const iconColor = {
    critical: "text-accent-rose",
    warning: "text-accent-amber",
    info: "text-accent-cyan",
  };

  return (
    <div className={`border rounded-md p-3 ${styles[entry.severity]}`}>
      <div className="flex items-center gap-2">
        <AlertTriangle className={`h-3 w-3 ${iconColor[entry.severity]}`} />
        <span className="text-[9px] font-mono uppercase tracking-wider opacity-70">{entry.severity}</span>
      </div>
      <div className="text-[11px] font-mono mt-1">{entry.title}</div>
    </div>
  );
}

function PredictionEntry({ entry }: { entry: Extract<FeedEntry, { type: "prediction" }> }) {
  const dirColor = entry.direction === "bullish" ? "text-accent-emerald" : entry.direction === "bearish" ? "text-accent-rose" : "text-navy-300";
  return (
    <div className="border border-navy-700/50 rounded-md bg-navy-900/60 p-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Crosshair className="h-3 w-3 text-accent-cyan" />
          <span className="text-[9px] font-mono text-navy-500 uppercase tracking-wider">Prediction</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-mono uppercase ${dirColor}`}>{entry.direction}</span>
          <span className="text-[9px] font-mono text-accent-cyan">{entry.confidence}%</span>
        </div>
      </div>
      <div className="text-[11px] text-navy-200 font-mono">{entry.title}</div>
      <div className="mt-1.5 h-1 rounded-full bg-navy-800 overflow-hidden">
        <div className="h-full rounded-full bg-accent-cyan/60 transition-all duration-1000" style={{ width: `${entry.confidence}%` }} />
      </div>
    </div>
  );
}

function NewsEntry({ entry }: { entry: Extract<FeedEntry, { type: "news" }> }) {
  return (
    <div className="border border-navy-700/50 rounded-md bg-navy-900/60 p-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Globe className="h-3 w-3 text-navy-500" />
          <span className="text-[9px] font-mono text-navy-500 uppercase tracking-wider">OSINT</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-navy-600">{entry.source}</span>
          <span className="text-[8px] font-mono text-navy-600 px-1.5 py-0.5 rounded bg-navy-800/50">{entry.region}</span>
        </div>
      </div>
      <div className="text-[11px] text-navy-200 font-mono">{entry.headline}</div>
    </div>
  );
}

function TradeEntry({ entry }: { entry: Extract<FeedEntry, { type: "trade" }> }) {
  const isBuy = entry.action === "BUY";
  return (
    <div className={`border rounded-md p-3 ${isBuy ? "border-accent-emerald/30 bg-accent-emerald/[0.04]" : "border-accent-rose/30 bg-accent-rose/[0.04]"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isBuy ? <TrendingUp className="h-3 w-3 text-accent-emerald" /> : <TrendingDown className="h-3 w-3 text-accent-rose" />}
          <span className={`text-[10px] font-mono font-bold ${isBuy ? "text-accent-emerald" : "text-accent-rose"}`}>{entry.action}</span>
          <span className="text-[11px] font-mono font-bold text-navy-100">{entry.symbol}</span>
          <span className="text-[10px] font-mono text-navy-400">@ {entry.price}</span>
        </div>
      </div>
      <div className="text-[10px] font-mono text-navy-400 mt-1">{entry.reason}</div>
    </div>
  );
}

function AnalysisEntry({ entry }: { entry: Extract<FeedEntry, { type: "analysis" }> }) {
  return (
    <div className="border-l-2 border-accent-cyan/30 pl-3 py-1">
      <div className="text-[11px] text-navy-300 font-mono leading-relaxed">{entry.text}</div>
    </div>
  );
}

function GameTheoryEntry({ entry }: { entry: Extract<FeedEntry, { type: "gametheory" }> }) {
  return (
    <div className="border border-navy-700/50 rounded-md bg-navy-900/60 p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Shield className="h-3 w-3 text-accent-amber" />
        <span className="text-[9px] font-mono text-navy-500 uppercase tracking-wider">Game Theory</span>
        <span className="text-[8px] font-mono text-accent-amber px-1.5 py-0.5 rounded bg-accent-amber/10 ml-auto">escalation likely</span>
      </div>
      <div className="space-y-1.5">
        {entry.actors.map((a, i) => (
          <div key={i} className="flex items-center gap-2 text-[10px] font-mono">
            <span className="text-navy-300 w-12">{a.name}</span>
            <span className="text-navy-500 flex-1">{a.strategy}</span>
            <div className="w-14 h-1 rounded-full bg-navy-800 overflow-hidden">
              <div className="h-full rounded-full bg-accent-cyan/60" style={{ width: `${a.payoff * 100}%` }} />
            </div>
            <span className="text-navy-400 w-8 text-right">{(a.payoff * 100).toFixed(0)}%</span>
            {a.payoff >= 0.7 && <Zap className="h-2.5 w-2.5 text-accent-amber" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function SnapshotEntry({ entry }: { entry: Extract<FeedEntry, { type: "snapshot" }> }) {
  const bearish = entry.trend === "bearish";
  return (
    <div className="border border-navy-700/50 rounded-md bg-navy-900/60 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-3 w-3 text-navy-500" />
          <span className="text-[9px] font-mono text-navy-500 uppercase tracking-wider">Technical</span>
          <span className="text-[10px] font-mono font-bold text-navy-100">{entry.symbol}</span>
        </div>
        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${bearish ? "bg-accent-rose/15 text-accent-rose" : "bg-accent-emerald/15 text-accent-emerald"}`}>{entry.trend}</span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <div>
          <div className="text-[8px] text-navy-600 uppercase tracking-wider">RSI</div>
          <div className={`text-[10px] font-bold font-mono ${entry.rsi < 30 ? "text-accent-rose" : entry.rsi > 70 ? "text-accent-emerald" : "text-navy-200"}`}>{entry.rsi}</div>
        </div>
        <div>
          <div className="text-[8px] text-navy-600 uppercase tracking-wider">MACD</div>
          <div className={`text-[10px] font-bold font-mono ${entry.macd < 0 ? "text-accent-rose" : "text-accent-emerald"}`}>{entry.macd}</div>
        </div>
        <div>
          <div className="text-[8px] text-navy-600 uppercase tracking-wider">SMA 50</div>
          <div className="text-[10px] font-mono text-navy-300">{entry.sma50}</div>
        </div>
        <div>
          <div className="text-[8px] text-navy-600 uppercase tracking-wider">SMA 200</div>
          <div className="text-[10px] font-mono text-navy-300">{entry.sma200}</div>
        </div>
      </div>
    </div>
  );
}

// ── Renderer map ──

function renderEntry(entry: FeedEntry, key: number) {
  switch (entry.type) {
    case "signal": return <SignalEntry key={key} entry={entry} />;
    case "price": return <PriceEntry key={key} entry={entry} />;
    case "alert": return <AlertEntry key={key} entry={entry} />;
    case "prediction": return <PredictionEntry key={key} entry={entry} />;
    case "news": return <NewsEntry key={key} entry={entry} />;
    case "trade": return <TradeEntry key={key} entry={entry} />;
    case "analysis": return <AnalysisEntry key={key} entry={entry} />;
    case "gametheory": return <GameTheoryEntry key={key} entry={entry} />;
    case "snapshot": return <SnapshotEntry key={key} entry={entry} />;
  }
}

// ── Terminal ──

export function HeroTerminal() {
  const [visibleEntries, setVisibleEntries] = useState<{ entry: FeedEntry; id: number }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const idRef = useRef(0);

  const addEntry = useCallback(() => {
    const entry = FEED_ENTRIES[indexRef.current % FEED_ENTRIES.length];
    const id = idRef.current++;
    indexRef.current++;

    setVisibleEntries((prev) => {
      const next = [...prev, { entry, id }];
      // Keep last 15 entries to avoid memory bloat
      if (next.length > 15) return next.slice(next.length - 15);
      return next;
    });
  }, []);

  useEffect(() => {
    // Start with 3 entries staggered
    const initial = [
      setTimeout(() => addEntry(), 300),
      setTimeout(() => addEntry(), 900),
      setTimeout(() => addEntry(), 1500),
    ];

    // Then add new entries at a steady pace
    const interval = setInterval(() => {
      addEntry();
    }, 2800);

    return () => {
      initial.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, [addEntry]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [visibleEntries]);

  return (
    <div className="border border-navy-700/40 rounded-lg bg-navy-950 overflow-hidden shadow-2xl shadow-black/50">
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-navy-800/50 bg-navy-900/30">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-accent-rose/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-accent-amber/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-accent-emerald/60" />
        </div>
        <span className="text-[9px] font-mono text-navy-600 ml-2 tracking-wider">NEXUS TERMINAL</span>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-accent-emerald animate-pulse" />
          <span className="text-[8px] font-mono text-navy-600">LIVE</span>
        </div>
      </div>

      {/* Feed body */}
      <div ref={scrollRef} className="h-[420px] overflow-y-auto p-3 space-y-2">
        {visibleEntries.map(({ entry, id }) => (
          <div
            key={id}
            className="animate-in fade-in slide-in-from-bottom-2 duration-500"
          >
            {renderEntry(entry, id)}
          </div>
        ))}

        {/* Waiting indicator */}
        <div className="flex items-center gap-2 py-2 px-1">
          <div className="flex gap-1">
            <div className="h-1 w-1 rounded-full bg-navy-600 animate-pulse" style={{ animationDelay: "0s" }} />
            <div className="h-1 w-1 rounded-full bg-navy-600 animate-pulse" style={{ animationDelay: "0.3s" }} />
            <div className="h-1 w-1 rounded-full bg-navy-600 animate-pulse" style={{ animationDelay: "0.6s" }} />
          </div>
          <span className="text-[9px] font-mono text-navy-700">monitoring feeds</span>
        </div>
      </div>
    </div>
  );
}
