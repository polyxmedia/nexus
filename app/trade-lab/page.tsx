"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Brain,
  ChevronDown,
  Crosshair,
  DollarSign,
  FlaskConical,
  Gauge,
  Globe,
  Loader2,
  Minus,
  Percent,
  Plus,
  RotateCcw,
  Shield,
  Skull,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { UpgradeGate } from "@/components/subscription/upgrade-gate";

// ── Ticker Autocomplete ──

const POPULAR_TICKERS: Array<[string, string]> = [
  ["SPY", "S&P 500 ETF"], ["QQQ", "Nasdaq 100 ETF"], ["DIA", "Dow Jones ETF"], ["IWM", "Russell 2000 ETF"],
  ["VTI", "Total Stock Market"], ["VOO", "Vanguard S&P 500"], ["TQQQ", "UltraPro QQQ"], ["SQQQ", "UltraPro Short QQQ"],
  ["TLT", "20+ Year Treasury"], ["GLD", "Gold ETF"], ["SLV", "Silver ETF"], ["USO", "Oil ETF"],
  ["XLE", "Energy Sector"], ["XLF", "Financial Sector"], ["XLK", "Technology Sector"], ["SMH", "Semiconductor ETF"],
  ["AAPL", "Apple"], ["MSFT", "Microsoft"], ["GOOGL", "Alphabet"], ["AMZN", "Amazon"],
  ["NVDA", "NVIDIA"], ["META", "Meta Platforms"], ["TSLA", "Tesla"], ["JPM", "JPMorgan Chase"],
  ["V", "Visa"], ["UNH", "UnitedHealth"], ["XOM", "Exxon Mobil"], ["LLY", "Eli Lilly"],
  ["AVGO", "Broadcom"], ["MA", "Mastercard"], ["HD", "Home Depot"], ["NFLX", "Netflix"],
  ["AMD", "AMD"], ["CRM", "Salesforce"], ["COST", "Costco"], ["ABBV", "AbbVie"],
  ["LMT", "Lockheed Martin"], ["RTX", "RTX (Raytheon)"], ["BA", "Boeing"], ["GS", "Goldman Sachs"],
  ["COIN", "Coinbase"], ["PLTR", "Palantir"], ["CRWD", "CrowdStrike"], ["PANW", "Palo Alto Networks"],
  ["BTC", "Bitcoin"], ["ETH", "Ethereum"], ["XRP", "XRP"], ["SOL", "Solana"],
];

function TickerInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = value.length > 0
    ? POPULAR_TICKERS.filter(([s, n]) => s.startsWith(value.toUpperCase()) || n.toUpperCase().includes(value.toUpperCase())).slice(0, 6)
    : [];

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value.toUpperCase()); setOpen(true); }}
        onFocus={() => value.length > 0 && setOpen(true)}
        placeholder="SPY"
        className="w-full bg-navy-800 border border-navy-700 rounded px-3 py-2 text-sm font-mono text-navy-100 outline-none focus:border-accent-cyan/50 transition-colors"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-navy-800 border border-navy-700 rounded shadow-xl max-h-40 overflow-y-auto">
          {filtered.map(([sym, name]) => (
            <button key={sym} type="button" onClick={() => { onChange(sym); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 hover:bg-navy-700/60 transition-colors flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-navy-100">{sym}</span>
              <span className="text-[10px] text-navy-500 truncate">{name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Types ──

interface Scenario {
  id: string;
  name: string;
  probability: number;
  targetPrice: number;
  stopPrice: number;
  timeframeDays: number;
  catalyst: string;
  icon: "bull" | "base" | "bear" | "blackswan";
}

interface TradeSetup {
  ticker: string;
  direction: "long" | "short";
  entryPrice: number;
  positionSize: number;
  accountSize: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
interface EnrichmentData {
  ticker: string;
  quote: any;
  technicals: any;
  monteCarlo: any;
  gex: any;
  regime: any;
  systemic: any;
  correlations: any;
  gpr: any;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const DEFAULT_SCENARIOS: Scenario[] = [
  { id: "bull", name: "Bull Case", probability: 30, targetPrice: 0, stopPrice: 0, timeframeDays: 30, catalyst: "", icon: "bull" },
  { id: "base", name: "Base Case", probability: 45, targetPrice: 0, stopPrice: 0, timeframeDays: 30, catalyst: "", icon: "base" },
  { id: "bear", name: "Bear Case", probability: 20, targetPrice: 0, stopPrice: 0, timeframeDays: 30, catalyst: "", icon: "bear" },
  { id: "blackswan", name: "Black Swan", probability: 5, targetPrice: 0, stopPrice: 0, timeframeDays: 30, catalyst: "", icon: "blackswan" },
];

const SCENARIO_STYLES = {
  bull: { color: "#10b981", bg: "bg-accent-emerald/8", border: "border-accent-emerald/25", label: "BULL" },
  base: { color: "#06b6d4", bg: "bg-accent-cyan/8", border: "border-accent-cyan/25", label: "BASE" },
  bear: { color: "#f59e0b", bg: "bg-accent-amber/8", border: "border-accent-amber/25", label: "BEAR" },
  blackswan: { color: "#f43f5e", bg: "bg-accent-rose/8", border: "border-accent-rose/25", label: "SWAN" },
};

// ── Computations ──

function computeScenarioPnL(setup: TradeSetup, scenario: Scenario) {
  if (!setup.entryPrice || !setup.positionSize) return { pnl: 0, pnlPct: 0, rrRatio: 0, shares: 0 };
  const shares = setup.positionSize / setup.entryPrice;
  const target = scenario.targetPrice || setup.entryPrice;
  const stop = scenario.stopPrice || setup.entryPrice;
  const mult = setup.direction === "long" ? 1 : -1;
  const pnl = (target - setup.entryPrice) * shares * mult;
  const pnlPct = ((target - setup.entryPrice) / setup.entryPrice) * 100 * mult;
  const risk = Math.abs(setup.entryPrice - stop) * shares;
  const reward = Math.abs(target - setup.entryPrice) * shares;
  const rrRatio = risk > 0 ? reward / risk : 0;
  return { pnl, pnlPct, rrRatio, shares };
}

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtUsd(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}$${fmt(Math.abs(n))}`;
}

// Where does a target price fall in the MC distribution?
function mcPercentile(distrib: { p5: number; p10: number; p25: number; p50: number; p75: number; p90: number; p95: number }, price: number): string {
  if (price <= distrib.p5) return "<5th";
  if (price <= distrib.p10) return "~10th";
  if (price <= distrib.p25) return "~25th";
  if (price <= distrib.p50) return "~50th";
  if (price <= distrib.p75) return "~75th";
  if (price <= distrib.p90) return "~90th";
  if (price <= distrib.p95) return "~95th";
  return ">95th";
}

function scenarioValidation(
  scenario: Scenario,
  setup: TradeSetup,
  intel: EnrichmentData | null,
): { level: "green" | "amber" | "red"; reasons: string[] } {
  if (!intel || !scenario.targetPrice) return { level: "amber", reasons: ["No intel data"] };
  const reasons: string[] = [];
  let score = 0; // positive = supportive, negative = conflicting

  const t = intel.technicals;
  const g = intel.gex;
  const mc = intel.monteCarlo;
  const isLong = setup.direction === "long";
  const targetAbove = scenario.targetPrice > setup.entryPrice;
  const bullScenario = (isLong && targetAbove) || (!isLong && !targetAbove);

  // Technical alignment
  if (t) {
    if (t.trend === "bullish" && bullScenario) { score += 1; reasons.push("Trend aligned"); }
    else if (t.trend === "bearish" && !bullScenario) { score += 1; reasons.push("Trend aligned"); }
    else if (t.trend === "bullish" && !bullScenario) { score -= 1; reasons.push("Against trend"); }
    else if (t.trend === "bearish" && bullScenario) { score -= 1; reasons.push("Against trend"); }

    if (t.rsi > 70 && bullScenario) { score -= 1; reasons.push("RSI overbought"); }
    if (t.rsi < 30 && !bullScenario) { score -= 1; reasons.push("RSI oversold"); }

    // Bollinger band check
    if (t.bollingerBands) {
      if (scenario.targetPrice > t.bollingerBands.upper && bullScenario) {
        reasons.push("Target above upper BB");
      }
      if (scenario.targetPrice < t.bollingerBands.lower && !bullScenario) {
        reasons.push("Target below lower BB");
      }
    }
  }

  // GEX alignment
  if (g) {
    if (g.putWall && scenario.targetPrice < g.putWall && !bullScenario) {
      score += 1; reasons.push(`Below put wall $${fmt(g.putWall, 0)}`);
    }
    if (g.callWall && scenario.targetPrice > g.callWall && bullScenario) {
      reasons.push(`Above call wall $${fmt(g.callWall, 0)} (dealer resistance)`);
      score -= 1;
    }
    if (g.regime === "dampening" && scenario.icon === "blackswan") {
      score -= 1; reasons.push("GEX dampening (low vol regime)");
    }
    if (g.regime === "amplifying") {
      score += 0; reasons.push("GEX amplifying (volatile)");
    }
  }

  // Monte Carlo probability check
  if (mc) {
    const horizon = scenario.timeframeDays;
    const closest = [5, 10, 20, 30, 60, 90].reduce((prev, curr) =>
      Math.abs(curr - horizon) < Math.abs(prev - horizon) ? curr : prev);
    const dist = mc.distributions[closest];
    if (dist) {
      const pctl = mcPercentile(dist, scenario.targetPrice);
      if (pctl === ">95th" || pctl === "<5th") {
        score -= 1; reasons.push(`MC ${pctl} percentile (${closest}d)`);
      } else {
        reasons.push(`MC ${pctl} percentile (${closest}d)`);
      }
    }
  }

  const level = score >= 1 ? "green" : score <= -1 ? "red" : "amber";
  return { level, reasons };
}

// ── Flowchart SVG ──

function FlowChart({
  setup,
  scenarios,
  intel,
}: {
  setup: TradeSetup;
  scenarios: Scenario[];
  intel: EnrichmentData | null;
}) {
  const validScenarios = scenarios.filter(s => s.targetPrice > 0);
  if (!setup.entryPrice || !setup.positionSize || validScenarios.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <FlaskConical className="h-10 w-10 text-navy-700 mx-auto mb-3" />
          <p className="text-sm text-navy-500">Configure your trade and scenarios</p>
          <p className="text-[10px] text-navy-600 mt-1">The flowchart will visualize your scenario tree</p>
        </div>
      </div>
    );
  }

  const nodeW = 240;
  const nodeH = 110;
  const entryX = 40;
  const scenarioX = 370;
  const summaryX = 700;
  const totalH = Math.max(500, validScenarios.length * (nodeH + 24) + 60);
  const entryY = totalH / 2 - nodeH / 2;

  const ev = validScenarios.reduce((sum, s) => {
    const { pnl } = computeScenarioPnL(setup, s);
    return sum + (s.probability / 100) * pnl;
  }, 0);

  const maxProfit = Math.max(...validScenarios.map(s => computeScenarioPnL(setup, s).pnl));
  const maxLoss = Math.min(...validScenarios.map(s => computeScenarioPnL(setup, s).pnl));
  const winProb = validScenarios.filter(s => computeScenarioPnL(setup, s).pnl > 0).reduce((s, sc) => s + sc.probability, 0);

  // Regime badge for entry node
  const regimeLabel = intel?.regime?.label || "";
  const stressLevel = intel?.systemic?.compositeStress || 0;

  return (
    <svg viewBox={`0 0 940 ${totalH}`} className="w-full h-full" style={{ minHeight: 420 }}>
      <defs>
        <filter id="glow-green"><feGaussianBlur stdDeviation="3" result="blur" /><feFlood floodColor="#10b981" floodOpacity="0.3" /><feComposite in2="blur" operator="in" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="glow-red"><feGaussianBlur stdDeviation="3" result="blur" /><feFlood floodColor="#f43f5e" floodOpacity="0.3" /><feComposite in2="blur" operator="in" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="glow-cyan"><feGaussianBlur stdDeviation="3" result="blur" /><feFlood floodColor="#06b6d4" floodOpacity="0.3" /><feComposite in2="blur" operator="in" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <marker id="arr-green" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" opacity="0.6" /></marker>
        <marker id="arr-red" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#f43f5e" opacity="0.6" /></marker>
        <marker id="arr-cyan" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#06b6d4" opacity="0.6" /></marker>
        <marker id="arr-amber" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" opacity="0.6" /></marker>
      </defs>

      {/* Entry Node */}
      <rect x={entryX} y={entryY} width={nodeW} height={nodeH} rx={8}
        fill="#0a0f1a" stroke="#06b6d4" strokeWidth={1.5} filter="url(#glow-cyan)" />
      <text x={entryX + 14} y={entryY + 20} fill="#06b6d4" fontSize={9} fontFamily="IBM Plex Mono" fontWeight={700} letterSpacing="0.1em">ENTRY</text>
      <text x={entryX + 14} y={entryY + 40} fill="#e5e5e5" fontSize={14} fontFamily="IBM Plex Mono" fontWeight={700}>
        {setup.ticker || "---"} {setup.direction === "long" ? "LONG" : "SHORT"}
      </text>
      <text x={entryX + 14} y={entryY + 58} fill="#737373" fontSize={11} fontFamily="IBM Plex Mono">
        ${fmt(setup.entryPrice)} x {fmt(setup.positionSize / (setup.entryPrice || 1), 0)} shs
      </text>
      <text x={entryX + 14} y={entryY + 74} fill="#525252" fontSize={10} fontFamily="IBM Plex Mono">
        Size: ${fmt(setup.positionSize, 0)} | {setup.accountSize > 0 ? fmt(setup.positionSize / setup.accountSize * 100, 1) : "0"}% of acct
      </text>
      {intel && (
        <>
          {regimeLabel && (
            <text x={entryX + 14} y={entryY + 92} fill="#06b6d4" fontSize={8} fontFamily="IBM Plex Mono" opacity={0.7}>
              REGIME: {regimeLabel.slice(0, 35)}
            </text>
          )}
          {stressLevel > 0 && (
            <text x={entryX + 14} y={entryY + 104} fill={stressLevel > 60 ? "#f43f5e" : stressLevel > 30 ? "#f59e0b" : "#525252"} fontSize={8} fontFamily="IBM Plex Mono">
              SYSTEMIC STRESS: {fmt(stressLevel, 0)}/100
            </text>
          )}
        </>
      )}

      {/* Scenario Nodes */}
      {validScenarios.map((scenario, i) => {
        const style = SCENARIO_STYLES[scenario.icon];
        const spacing = (totalH - 40) / validScenarios.length;
        const sy = 20 + i * spacing + spacing / 2 - nodeH / 2;
        const { pnl, pnlPct, rrRatio } = computeScenarioPnL(setup, scenario);
        const isProfit = pnl >= 0;
        const lineColor = style.color;
        const arrowId = scenario.icon === "bull" ? "arr-green" : scenario.icon === "bear" ? "arr-amber" : scenario.icon === "blackswan" ? "arr-red" : "arr-cyan";

        const x1 = entryX + nodeW;
        const y1 = entryY + nodeH / 2;
        const x2 = scenarioX;
        const y2 = sy + nodeH / 2;
        const cx1 = x1 + 50;
        const cx2 = x2 - 50;

        // Validation badge
        const validation = scenarioValidation(scenario, setup, intel);
        const badgeColor = validation.level === "green" ? "#10b981" : validation.level === "red" ? "#f43f5e" : "#f59e0b";

        // MC percentile
        let mcLabel = "";
        if (intel?.monteCarlo) {
          const horizon = scenario.timeframeDays;
          const closest = [5, 10, 20, 30, 60, 90].reduce((prev, curr) =>
            Math.abs(curr - horizon) < Math.abs(prev - horizon) ? curr : prev);
          const dist = intel.monteCarlo.distributions[closest];
          if (dist) mcLabel = `MC: ${mcPercentile(dist, scenario.targetPrice)}`;
        }

        return (
          <g key={scenario.id}>
            <path d={`M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`}
              fill="none" stroke={lineColor} strokeWidth={1.5} opacity={0.4}
              markerEnd={`url(#${arrowId})`} strokeDasharray="6 3">
              <animate attributeName="stroke-dashoffset" from="18" to="0" dur="1.5s" repeatCount="indefinite" />
            </path>

            <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 8}
              fill={lineColor} fontSize={10} fontFamily="IBM Plex Mono" fontWeight={700} textAnchor="middle" opacity={0.8}>
              {scenario.probability}%
            </text>

            {/* Node */}
            <rect x={scenarioX} y={sy} width={nodeW} height={nodeH} rx={8} fill="#0a0f1a" stroke={lineColor} strokeWidth={1} opacity={0.9} />
            <rect x={scenarioX} y={sy} width={nodeW} height={22} rx={8} fill={lineColor} opacity={0.12} />
            <rect x={scenarioX} y={sy + 14} width={nodeW} height={8} fill={lineColor} opacity={0.12} />

            <text x={scenarioX + 12} y={sy + 15} fill={lineColor} fontSize={9} fontFamily="IBM Plex Mono" fontWeight={700} letterSpacing="0.1em">
              {style.label}: {scenario.name}
            </text>

            {/* Validation badge */}
            {intel && (
              <circle cx={scenarioX + nodeW - 14} cy={sy + 12} r={5} fill={badgeColor} opacity={0.8} />
            )}

            <text x={scenarioX + 12} y={sy + 40} fill={isProfit ? "#10b981" : "#f43f5e"} fontSize={16} fontFamily="IBM Plex Mono" fontWeight={700}>
              {fmtUsd(pnl)}
            </text>
            <text x={scenarioX + 12} y={sy + 58} fill="#737373" fontSize={10} fontFamily="IBM Plex Mono">
              {isProfit ? "+" : ""}{fmt(pnlPct, 1)}% | Target: ${fmt(scenario.targetPrice)} | R/R: {fmt(rrRatio, 1)}x
            </text>
            <text x={scenarioX + 12} y={sy + 74} fill="#525252" fontSize={9} fontFamily="IBM Plex Mono">
              {scenario.timeframeDays}d | {scenario.catalyst || "No catalyst"}
            </text>

            {/* MC + validation labels */}
            {intel && (
              <text x={scenarioX + 12} y={sy + 90} fill={badgeColor} fontSize={8} fontFamily="IBM Plex Mono" opacity={0.8}>
                {mcLabel}{mcLabel && validation.reasons.length > 0 ? " | " : ""}{validation.reasons.slice(0, 2).join(" | ")}
              </text>
            )}

            {/* Convergence line to summary */}
            <path d={`M ${scenarioX + nodeW} ${sy + nodeH / 2} L ${summaryX} ${totalH / 2}`}
              fill="none" stroke="#334155" strokeWidth={0.5} opacity={0.3} strokeDasharray="3 3" />
          </g>
        );
      })}

      {/* Summary Node */}
      <rect x={summaryX} y={totalH / 2 - 75} width={220} height={150} rx={10}
        fill="#0a0f1a" stroke={ev >= 0 ? "#10b981" : "#f43f5e"} strokeWidth={1.5}
        filter={ev >= 0 ? "url(#glow-green)" : "url(#glow-red)"} />

      <text x={summaryX + 16} y={totalH / 2 - 52} fill="#737373" fontSize={9} fontFamily="IBM Plex Mono" fontWeight={700} letterSpacing="0.1em">EXPECTED VALUE</text>
      <text x={summaryX + 16} y={totalH / 2 - 30} fill={ev >= 0 ? "#10b981" : "#f43f5e"} fontSize={20} fontFamily="IBM Plex Mono" fontWeight={700}>{fmtUsd(ev)}</text>
      <line x1={summaryX + 16} y1={totalH / 2 - 18} x2={summaryX + 204} y2={totalH / 2 - 18} stroke="#1e293b" strokeWidth={1} />
      <text x={summaryX + 16} y={totalH / 2} fill="#737373" fontSize={10} fontFamily="IBM Plex Mono">Win Prob: {fmt(winProb, 0)}%</text>
      <text x={summaryX + 16} y={totalH / 2 + 16} fill="#10b981" fontSize={10} fontFamily="IBM Plex Mono">Max Profit: {fmtUsd(maxProfit)}</text>
      <text x={summaryX + 16} y={totalH / 2 + 32} fill="#f43f5e" fontSize={10} fontFamily="IBM Plex Mono">Max Loss: {fmtUsd(maxLoss)}</text>
      <text x={summaryX + 16} y={totalH / 2 + 48} fill="#525252" fontSize={9} fontFamily="IBM Plex Mono">
        Acct Risk: {setup.accountSize > 0 ? fmt(Math.abs(maxLoss) / setup.accountSize * 100, 1) : "0"}%
      </text>
      {intel?.monteCarlo && (
        <text x={summaryX + 16} y={totalH / 2 + 64} fill="#06b6d4" fontSize={8} fontFamily="IBM Plex Mono">
          Vol: {fmt(intel.monteCarlo.annualizedVol * 100, 1)}% ann | {fmt(intel.monteCarlo.dailyVol * 100, 2)}% daily
        </text>
      )}
    </svg>
  );
}

// ── Intelligence Panel ──

function IntelPanel({ intel, setup }: { intel: EnrichmentData; setup: TradeSetup }) {
  const t = intel.technicals;
  const g = intel.gex;
  const r = intel.regime;
  const s = intel.systemic;
  const c = intel.correlations;
  const gpr = intel.gpr;
  const mc = intel.monteCarlo;
  const q = intel.quote;

  return (
    <div className="space-y-3 p-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 112px)" }}>
      {/* Live Quote */}
      {q && (
        <IntelCard icon={<DollarSign className="h-3.5 w-3.5" />} title="LIVE QUOTE" color="text-navy-300">
          <div className="flex items-baseline gap-3">
            <span className="text-lg font-mono font-bold text-navy-100">${fmt(q.price)}</span>
            <span className={`text-xs font-mono font-bold ${q.changePercent >= 0 ? "text-accent-emerald" : "text-accent-rose"}`}>
              {q.changePercent >= 0 ? "+" : ""}{fmt(q.changePercent, 2)}%
            </span>
          </div>
          <div className="flex gap-4 mt-1 text-[10px] font-mono text-navy-500">
            <span>52w: ${fmt(q.low52w, 0)} - ${fmt(q.high52w, 0)}</span>
            {q.marketCap > 0 && <span>MCap: ${fmt(q.marketCap / 1e9, 1)}B</span>}
          </div>
        </IntelCard>
      )}

      {/* Technical Snapshot */}
      {t && (
        <IntelCard icon={<Activity className="h-3.5 w-3.5" />} title="TECHNICALS" color="text-accent-cyan">
          <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
            <div>
              <div className="text-navy-600 uppercase">Trend</div>
              <div className={t.trend === "bullish" ? "text-accent-emerald" : t.trend === "bearish" ? "text-accent-rose" : "text-navy-400"}>
                {t.trend}
              </div>
            </div>
            <div>
              <div className="text-navy-600 uppercase">Momentum</div>
              <div className={t.momentum === "strong" ? "text-accent-emerald" : t.momentum === "weak" ? "text-accent-rose" : "text-navy-400"}>
                {t.momentum}
              </div>
            </div>
            <div>
              <div className="text-navy-600 uppercase">RSI</div>
              <div className={t.rsi > 70 ? "text-accent-rose" : t.rsi < 30 ? "text-accent-emerald" : "text-navy-300"}>
                {fmt(t.rsi, 0)}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 text-[10px] font-mono">
            {t.bollingerBands && (
              <div>
                <div className="text-navy-600 uppercase">Bollinger</div>
                <div className="text-navy-400">${fmt(t.bollingerBands.lower, 0)} - ${fmt(t.bollingerBands.upper, 0)}</div>
              </div>
            )}
            {t.atr > 0 && (
              <div>
                <div className="text-navy-600 uppercase">ATR (14)</div>
                <div className="text-navy-400">${fmt(t.atr)} ({fmt(t.atr / setup.entryPrice * 100, 2)}%)</div>
              </div>
            )}
            {t.sma50 > 0 && (
              <div>
                <div className="text-navy-600 uppercase">SMA 50</div>
                <div className={setup.entryPrice > t.sma50 ? "text-accent-emerald" : "text-accent-rose"}>${fmt(t.sma50, 0)}</div>
              </div>
            )}
            {t.sma200 > 0 && (
              <div>
                <div className="text-navy-600 uppercase">SMA 200</div>
                <div className={setup.entryPrice > t.sma200 ? "text-accent-emerald" : "text-accent-rose"}>${fmt(t.sma200, 0)}</div>
              </div>
            )}
          </div>
          <div className="mt-2 text-[9px] font-mono text-navy-600">
            Vol regime: {t.volatilityRegime}
          </div>
        </IntelCard>
      )}

      {/* GEX / Dealer Positioning */}
      {g && (
        <IntelCard icon={<Gauge className="h-3.5 w-3.5" />} title="GAMMA EXPOSURE" color="text-accent-amber">
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div>
              <div className="text-navy-600 uppercase">Regime</div>
              <div className={g.regime === "dampening" ? "text-accent-emerald" : g.regime === "amplifying" ? "text-accent-rose" : "text-navy-400"}>
                {g.regime}
              </div>
            </div>
            <div>
              <div className="text-navy-600 uppercase">Dealer Bias</div>
              <div className="text-navy-400">{g.dealerBias || "N/A"}</div>
            </div>
            {g.putWall > 0 && (
              <div>
                <div className="text-navy-600 uppercase">Put Wall</div>
                <div className="text-accent-emerald">${fmt(g.putWall, 0)}</div>
              </div>
            )}
            {g.callWall > 0 && (
              <div>
                <div className="text-navy-600 uppercase">Call Wall</div>
                <div className="text-accent-rose">${fmt(g.callWall, 0)}</div>
              </div>
            )}
            {g.zeroGammaLevel > 0 && (
              <div>
                <div className="text-navy-600 uppercase">Zero Gamma</div>
                <div className="text-accent-cyan">${fmt(g.zeroGammaLevel, 0)}</div>
              </div>
            )}
            {g.impliedMove1Day > 0 && (
              <div>
                <div className="text-navy-600 uppercase">Implied 1D Move</div>
                <div className="text-navy-300">{fmt(g.impliedMove1Day, 2)}%</div>
              </div>
            )}
          </div>
        </IntelCard>
      )}

      {/* Monte Carlo Distribution */}
      {mc && (
        <IntelCard icon={<Sparkles className="h-3.5 w-3.5" />} title="MONTE CARLO (5K PATHS)" color="text-purple-400">
          <div className="text-[10px] font-mono text-navy-500 mb-2">
            Vol: {fmt(mc.annualizedVol * 100, 1)}% annualized | {fmt(mc.dailyVol * 100, 2)}% daily
          </div>
          <div className="space-y-1">
            {Object.entries(mc.distributions as Record<string, { p5: number; p10: number; p25: number; p50: number; p75: number; p90: number; p95: number }>).map(([days, dist]) => (
              <div key={days} className="flex items-center gap-2 text-[10px] font-mono">
                <span className="text-navy-600 w-8 text-right">{days}d</span>
                <div className="flex-1 flex items-center gap-1">
                  <span className="text-accent-rose">${fmt(dist.p10, 0)}</span>
                  <div className="flex-1 h-1.5 bg-navy-800 rounded-full relative overflow-hidden">
                    <div
                      className="absolute inset-y-0 bg-gradient-to-r from-accent-rose/40 via-navy-500/40 to-accent-emerald/40 rounded-full"
                      style={{
                        left: `${((dist.p10 - dist.p5) / (dist.p95 - dist.p5)) * 100}%`,
                        right: `${((dist.p95 - dist.p90) / (dist.p95 - dist.p5)) * 100}%`,
                      }}
                    />
                    {/* Current price marker */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-white"
                      style={{ left: `${Math.max(0, Math.min(100, ((mc.currentPrice - dist.p5) / (dist.p95 - dist.p5)) * 100))}%` }}
                    />
                  </div>
                  <span className="text-accent-emerald">${fmt(dist.p90, 0)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1.5 text-[9px] text-navy-600 font-mono">
            Bars show 10th-90th percentile range. White line = current price.
          </div>
        </IntelCard>
      )}

      {/* Market Regime */}
      {r && (
        <IntelCard icon={<Brain className="h-3.5 w-3.5" />} title="MARKET REGIME" color="text-accent-cyan">
          <div className="text-xs font-mono text-navy-300 mb-2">{r.label}</div>
          <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
            {r.volatility && <RegimeDim label="Volatility" value={r.volatility.level || r.volatility} />}
            {r.growth && <RegimeDim label="Growth" value={r.growth.level || r.growth} />}
            {r.riskAppetite && <RegimeDim label="Risk" value={r.riskAppetite.level || r.riskAppetite} />}
            {r.monetary && <RegimeDim label="Monetary" value={r.monetary.level || r.monetary} />}
          </div>
        </IntelCard>
      )}

      {/* Systemic Risk */}
      {s && (
        <IntelCard icon={<AlertTriangle className="h-3.5 w-3.5" />} title="SYSTEMIC RISK" color={s.compositeStress > 60 ? "text-accent-rose" : s.compositeStress > 30 ? "text-accent-amber" : "text-accent-emerald"}>
          <div className="flex items-center gap-3">
            <div className="text-lg font-mono font-bold text-navy-100">{fmt(s.compositeStress, 0)}<span className="text-navy-600 text-xs">/100</span></div>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
              s.regime === "critical" ? "bg-accent-rose/15 text-accent-rose"
              : s.regime === "fragile" ? "bg-accent-amber/15 text-accent-amber"
              : s.regime === "elevated" ? "bg-accent-amber/10 text-accent-amber"
              : "bg-accent-emerald/10 text-accent-emerald"
            }`}>
              {s.regime}
            </span>
          </div>
          {s.warnings && s.warnings.length > 0 && (
            <div className="mt-2 space-y-1">
              {s.warnings.slice(0, 3).map((w: string, i: number) => (
                <div key={i} className="text-[9px] font-mono text-accent-rose/80">{w}</div>
              ))}
            </div>
          )}
        </IntelCard>
      )}

      {/* Correlation Breaks */}
      {c && c.breaks && c.breaks.length > 0 && (
        <IntelCard icon={<Shield className="h-3.5 w-3.5" />} title="CORRELATION BREAKS" color="text-accent-amber">
          <div className="space-y-1.5">
            {c.breaks.map((b: { pair: string; deviation: number; interpretation: string }, i: number) => (
              <div key={i} className="text-[10px] font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-navy-300">{b.pair}</span>
                  <span className={Math.abs(b.deviation) > 2 ? "text-accent-rose" : "text-accent-amber"}>
                    {fmt(b.deviation, 1)} sigma
                  </span>
                </div>
                <div className="text-[9px] text-navy-600">{b.interpretation}</div>
              </div>
            ))}
          </div>
        </IntelCard>
      )}

      {/* Geopolitical Risk */}
      {gpr && gpr.composite > 0 && (
        <IntelCard icon={<Globe className="h-3.5 w-3.5" />} title="GEOPOLITICAL RISK" color="text-accent-rose">
          <div className="text-lg font-mono font-bold text-navy-100">{fmt(gpr.composite, 0)}</div>
          {gpr.regions && (
            <div className="grid grid-cols-2 gap-1 mt-1 text-[10px] font-mono">
              {gpr.regions.slice(0, 4).map((region: { region: string; score: number; trend: string }) => (
                <div key={region.region}>
                  <span className="text-navy-500">{region.region}: </span>
                  <span className={region.trend === "rising" ? "text-accent-rose" : region.trend === "falling" ? "text-accent-emerald" : "text-navy-400"}>
                    {fmt(region.score, 0)} {region.trend === "rising" ? "^" : region.trend === "falling" ? "v" : "-"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </IntelCard>
      )}
    </div>
  );
}

function IntelCard({ icon, title, color, children }: { icon: React.ReactNode; title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="border border-navy-800/60 rounded-lg bg-navy-900/40 p-3">
      <div className={`flex items-center gap-1.5 mb-2 ${color}`}>
        {icon}
        <span className="text-[9px] font-mono font-bold uppercase tracking-widest">{title}</span>
      </div>
      {children}
    </div>
  );
}

function RegimeDim({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-navy-600">{label}: </span>
      <span className="text-navy-300">{typeof value === "string" ? value : JSON.stringify(value)}</span>
    </div>
  );
}

// ── Main Page ──

export default function TradeLabPage() {
  const [setup, setSetup] = useState<TradeSetup>({
    ticker: "",
    direction: "long",
    entryPrice: 0,
    positionSize: 0,
    accountSize: 100000,
  });
  const [scenarios, setScenarios] = useState<Scenario[]>(DEFAULT_SCENARIOS);
  const [intel, setIntel] = useState<EnrichmentData | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<"flowchart" | "intel">("flowchart");
  const [predictions, setPredictions] = useState<Array<{
    id: number; uuid: string; claim: string; confidence: number;
    direction: string | null; priceTarget: number | null;
    referenceSymbol: string | null; timeframe: string; deadline: string;
    category: string;
  }>>([]);
  const [loadingPreds, setLoadingPreds] = useState(false);
  const [predsOpen, setPredsOpen] = useState(false);
  const predsRef = useRef<HTMLDivElement>(null);

  // Close prediction dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (predsRef.current && !predsRef.current.contains(e.target as Node)) setPredsOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const updateSetup = useCallback((patch: Partial<TradeSetup>) => {
    setSetup(prev => ({ ...prev, ...patch }));
  }, []);

  const updateScenario = useCallback((id: string, patch: Partial<Scenario>) => {
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  }, []);

  const addScenario = useCallback(() => {
    setScenarios(prev => [...prev, {
      id: `custom-${Date.now()}`,
      name: `Scenario ${prev.length + 1}`,
      probability: 10,
      targetPrice: 0,
      stopPrice: 0,
      timeframeDays: 30,
      catalyst: "",
      icon: "base" as const,
    }]);
  }, []);

  const removeScenario = useCallback((id: string) => {
    setScenarios(prev => prev.filter(s => s.id !== id));
  }, []);

  const resetAll = useCallback(() => {
    setSetup({ ticker: "", direction: "long", entryPrice: 0, positionSize: 0, accountSize: 100000 });
    setScenarios(DEFAULT_SCENARIOS);
    setIntel(null);
    setEnrichError(null);
  }, []);

  const enrich = useCallback(async () => {
    if (!setup.ticker) return;
    setEnriching(true);
    setEnrichError(null);
    try {
      const res = await fetch(`/api/trade-lab/enrich?ticker=${encodeURIComponent(setup.ticker)}`);
      const json = await res.json();
      if (json.error) {
        setEnrichError(json.error);
      } else {
        setIntel(json);
        // Auto-fill entry price from live quote if not set
        if (!setup.entryPrice && json.quote?.price) {
          updateSetup({ entryPrice: json.quote.price });
        }
        setRightTab("flowchart"); // Show flowchart with new intel overlaid
      }
    } catch {
      setEnrichError("Failed to fetch market intelligence");
    }
    setEnriching(false);
  }, [setup.ticker, setup.entryPrice, updateSetup]);

  const fetchPredictions = useCallback(async () => {
    if (predsOpen) { setPredsOpen(false); return; }
    setLoadingPreds(true);
    try {
      const res = await fetch("/api/predictions?status=pending");
      if (res.ok) {
        const data = await res.json();
        const withSymbol = (Array.isArray(data) ? data : []).filter(
          (p: { referenceSymbol: string | null }) => p.referenceSymbol
        );
        setPredictions(withSymbol);
      }
    } catch { /* silent */ }
    setLoadingPreds(false);
    setPredsOpen(true);
  }, [predsOpen]);

  const loadPrediction = useCallback((pred: typeof predictions[number]) => {
    const symbol = pred.referenceSymbol?.toUpperCase() || "";
    const dir: "long" | "short" = pred.direction === "down" ? "short" : "long";

    // Parse timeframe to days
    const tfMatch = pred.timeframe.match(/(\d+)\s*(day|week|month)/i);
    let days = 30;
    if (tfMatch) {
      const n = parseInt(tfMatch[1]);
      const unit = tfMatch[2].toLowerCase();
      days = unit.startsWith("week") ? n * 7 : unit.startsWith("month") ? n * 30 : n;
    }

    // Build scenarios from prediction
    const baseTarget = pred.priceTarget || 0;
    const newScenarios: Scenario[] = [
      {
        id: "pred-bull", name: "Prediction Confirms", probability: Math.round(pred.confidence * 100),
        targetPrice: baseTarget, stopPrice: 0, timeframeDays: days,
        catalyst: pred.claim.slice(0, 120), icon: dir === "long" ? "bull" : "bear",
      },
      {
        id: "pred-base", name: "Base / Flat", probability: Math.round((1 - pred.confidence) * 60),
        targetPrice: 0, stopPrice: 0, timeframeDays: days,
        catalyst: "No significant move", icon: "base",
      },
      {
        id: "pred-bear", name: "Prediction Denied", probability: Math.round((1 - pred.confidence) * 30),
        targetPrice: 0, stopPrice: 0, timeframeDays: days,
        catalyst: "Counter-thesis plays out", icon: dir === "long" ? "bear" : "bull",
      },
      {
        id: "pred-swan", name: "Black Swan", probability: Math.max(1, Math.round((1 - pred.confidence) * 10)),
        targetPrice: 0, stopPrice: 0, timeframeDays: days,
        catalyst: "Tail risk event", icon: "blackswan",
      },
    ];

    // Normalize probabilities to 100%
    const rawTotal = newScenarios.reduce((s, sc) => s + sc.probability, 0);
    if (rawTotal !== 100) {
      const diff = 100 - rawTotal;
      newScenarios[1].probability += diff; // adjust base case
    }

    updateSetup({ ticker: symbol, direction: dir, entryPrice: 0, positionSize: 0 });
    setScenarios(newScenarios);
    setIntel(null);
    setPredsOpen(false);
  }, [updateSetup]);

  const totalProb = scenarios.reduce((s, sc) => s + sc.probability, 0);
  const probValid = totalProb === 100;
  const validScenarios = scenarios.filter(s => s.targetPrice > 0);
  const ev = validScenarios.reduce((sum, s) => {
    const { pnl } = computeScenarioPnL(setup, s);
    return sum + (s.probability / 100) * pnl;
  }, 0);
  const maxProfit = validScenarios.length > 0 ? Math.max(...validScenarios.map(s => computeScenarioPnL(setup, s).pnl)) : 0;
  const maxLoss = validScenarios.length > 0 ? Math.min(...validScenarios.map(s => computeScenarioPnL(setup, s).pnl)) : 0;
  const kellyFraction = useMemo(() => {
    if (validScenarios.length === 0 || !setup.entryPrice) return 0;
    const wins = validScenarios.filter(s => computeScenarioPnL(setup, s).pnl > 0);
    const losses = validScenarios.filter(s => computeScenarioPnL(setup, s).pnl <= 0);
    if (wins.length === 0 || losses.length === 0) return 0;
    const avgWin = wins.reduce((s, sc) => s + computeScenarioPnL(setup, sc).pnl, 0) / wins.length;
    const avgLoss = Math.abs(losses.reduce((s, sc) => s + computeScenarioPnL(setup, sc).pnl, 0) / losses.length);
    if (avgLoss === 0) return 0;
    const b = avgWin / avgLoss;
    const p = wins.reduce((s, sc) => s + sc.probability, 0) / 100;
    const q = 1 - p;
    const kelly = (b * p - q) / b;
    return Math.max(0, Math.min(1, kelly));
  }, [validScenarios, setup]);

  // ATR-based position sizing recommendation
  const atrSize = useMemo(() => {
    if (!intel?.technicals?.atr || !setup.accountSize || !setup.entryPrice) return null;
    const riskPct = 0.01; // 1% account risk
    const riskDollars = setup.accountSize * riskPct;
    const shares = Math.floor(riskDollars / intel.technicals.atr);
    const size = shares * setup.entryPrice;
    return { shares, size, riskDollars, atr: intel.technicals.atr };
  }, [intel, setup.accountSize, setup.entryPrice]);

  return (
    <div className="ml-0 md:ml-48 min-h-screen bg-navy-950 pt-12 md:pt-0">
      <UpgradeGate minTier="analyst" feature="Trade Lab">
        {/* Header */}
        <div className="border-b border-navy-700 px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FlaskConical className="h-5 w-5 text-accent-cyan" />
            <div>
              <h1 className="text-sm font-bold text-navy-100 tracking-wide">Trade Lab</h1>
              <p className="text-[10px] text-navy-500 uppercase tracking-wider">
                Intelligence-enriched scenario simulator
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div ref={predsRef} className="relative">
              <button
                onClick={fetchPredictions}
                disabled={loadingPreds}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-accent-amber/10 border border-accent-amber/30 text-xs text-accent-amber hover:bg-accent-amber/20 transition-colors disabled:opacity-40"
              >
                {loadingPreds ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Target className="h-3.5 w-3.5" />}
                Load Prediction
                <ChevronDown className="h-3 w-3" />
              </button>
              {predsOpen && (
                <div className="absolute z-50 top-full right-0 mt-1.5 w-[380px] max-h-80 overflow-y-auto bg-navy-800 border border-navy-700 rounded-lg shadow-2xl">
                  {predictions.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <Target className="h-6 w-6 text-navy-600 mx-auto mb-2" />
                      <p className="text-xs text-navy-500">No pending predictions with a reference symbol</p>
                      <p className="text-[10px] text-navy-600 mt-1">Predictions need a referenceSymbol to load here</p>
                    </div>
                  ) : (
                    <div className="py-1">
                      <div className="px-3 py-2 border-b border-navy-700/50">
                        <span className="text-[9px] font-mono text-navy-500 uppercase tracking-widest">
                          {predictions.length} prediction{predictions.length !== 1 ? "s" : ""} with symbols
                        </span>
                      </div>
                      {predictions.map((pred) => (
                        <button key={pred.id} onClick={() => loadPrediction(pred)}
                          className="w-full text-left px-3 py-2.5 hover:bg-navy-700/50 transition-colors border-b border-navy-800/50 last:border-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-accent-cyan">{pred.referenceSymbol}</span>
                              {pred.direction && (
                                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                  pred.direction === "up" ? "bg-accent-emerald/10 text-accent-emerald" : pred.direction === "down" ? "bg-accent-rose/10 text-accent-rose" : "bg-navy-700 text-navy-400"
                                }`}>
                                  {pred.direction.toUpperCase()}
                                </span>
                              )}
                              <span className="text-[9px] font-mono text-navy-500">{Math.round(pred.confidence * 100)}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {pred.priceTarget && (
                                <span className="text-[10px] font-mono text-navy-400">${pred.priceTarget.toLocaleString()}</span>
                              )}
                              <span className="text-[9px] font-mono text-navy-600">{pred.timeframe}</span>
                            </div>
                          </div>
                          <p className="text-[11px] text-navy-300 line-clamp-2 leading-tight">{pred.claim}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={enrich}
              disabled={!setup.ticker || enriching}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-accent-cyan/10 border border-accent-cyan/30 text-xs text-accent-cyan hover:bg-accent-cyan/20 transition-colors disabled:opacity-40"
            >
              {enriching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
              Enrich
            </button>
            <button onClick={resetAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-navy-700 text-xs text-navy-400 hover:text-navy-200 hover:border-navy-600 transition-colors">
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          </div>
        </div>

        {enrichError && (
          <div className="mx-6 mt-2 px-3 py-1.5 rounded border border-accent-rose/30 bg-accent-rose/5 text-[10px] font-mono text-accent-rose">
            {enrichError}
          </div>
        )}

        {/* Metrics Bar */}
        <div className="border-b border-navy-800/50 px-6 py-2.5 flex items-center gap-5 overflow-x-auto">
          <MetricPill label="EV" value={fmtUsd(ev)} color={ev >= 0 ? "text-accent-emerald" : "text-accent-rose"} />
          <MetricPill label="Max+" value={fmtUsd(maxProfit)} color="text-accent-emerald" />
          <MetricPill label="Max-" value={fmtUsd(maxLoss)} color="text-accent-rose" />
          <MetricPill label="Kelly" value={`${fmt(kellyFraction * 100, 1)}%`} color="text-accent-cyan" />
          {setup.accountSize > 0 && <MetricPill label="Kelly$" value={`$${fmt(kellyFraction * setup.accountSize, 0)}`} color="text-accent-amber" />}
          {atrSize && <MetricPill label="ATR Size" value={`$${fmt(atrSize.size, 0)} (${atrSize.shares} shs)`} color="text-purple-400" />}
          {intel?.monteCarlo && <MetricPill label="Ann. Vol" value={`${fmt(intel.monteCarlo.annualizedVol * 100, 1)}%`} color="text-navy-400" />}
          {intel?.systemic && (
            <MetricPill
              label="Stress"
              value={`${fmt(intel.systemic.compositeStress, 0)}/100`}
              color={intel.systemic.compositeStress > 60 ? "text-accent-rose" : intel.systemic.compositeStress > 30 ? "text-accent-amber" : "text-accent-emerald"}
            />
          )}
        </div>

        <div className="flex flex-col xl:flex-row" style={{ height: "calc(100vh - 112px)" }}>
          {/* Left: Setup + Scenarios */}
          <div className="w-full xl:w-[400px] shrink-0 border-r border-navy-800/50 overflow-y-auto">
            {/* Trade Setup */}
            <div className="p-4 border-b border-navy-800/50">
              <h2 className="text-[10px] font-mono font-bold text-navy-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Crosshair className="h-3.5 w-3.5" /> Trade Setup
              </h2>
              <div className="space-y-2.5">
                <div>
                  <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">Ticker</label>
                  <TickerInput value={setup.ticker} onChange={(v) => updateSetup({ ticker: v })} />
                </div>
                <div>
                  <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">Direction</label>
                  <div className="flex gap-2">
                    <button onClick={() => updateSetup({ direction: "long" })}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded border text-xs font-mono font-medium transition-colors ${setup.direction === "long" ? "border-accent-emerald/40 bg-accent-emerald/8 text-accent-emerald" : "border-navy-700 text-navy-500 hover:border-navy-600"}`}>
                      <ArrowUp className="h-3 w-3" /> LONG
                    </button>
                    <button onClick={() => updateSetup({ direction: "short" })}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded border text-xs font-mono font-medium transition-colors ${setup.direction === "short" ? "border-accent-rose/40 bg-accent-rose/8 text-accent-rose" : "border-navy-700 text-navy-500 hover:border-navy-600"}`}>
                      <ArrowDown className="h-3 w-3" /> SHORT
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <NumInput label="Entry Price" value={setup.entryPrice} onChange={(v) => updateSetup({ entryPrice: v })} prefix="$" step={0.01} />
                  <NumInput label="Position Size" value={setup.positionSize} onChange={(v) => updateSetup({ positionSize: v })} prefix="$" step={100} />
                </div>
                <NumInput label="Account Size" value={setup.accountSize} onChange={(v) => updateSetup({ accountSize: v })} prefix="$" step={1000} />
                {setup.accountSize > 0 && (
                  <div className="flex gap-1.5">
                    {[1, 2.5, 5, 10].map(pct => (
                      <button key={pct} onClick={() => updateSetup({ positionSize: Math.round(setup.accountSize * pct / 100) })}
                        className="flex-1 py-1 rounded border border-navy-700 text-[10px] font-mono text-navy-500 hover:text-navy-300 hover:border-navy-600 transition-colors">
                        {pct}%
                      </button>
                    ))}
                    {atrSize && (
                      <button onClick={() => updateSetup({ positionSize: atrSize.size })}
                        className="flex-1 py-1 rounded border border-purple-500/30 text-[10px] font-mono text-purple-400 hover:text-purple-300 hover:border-purple-500/50 transition-colors">
                        ATR
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Scenarios */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[10px] font-mono font-bold text-navy-500 uppercase tracking-widest flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5" /> Scenarios
                </h2>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${probValid ? "bg-accent-emerald/10 text-accent-emerald" : "bg-accent-rose/10 text-accent-rose"}`}>
                    {totalProb}%/100%
                  </span>
                  <button onClick={addScenario}
                    className="flex items-center gap-1 px-2 py-1 rounded border border-navy-700 text-[10px] font-mono text-navy-400 hover:text-navy-200 hover:border-navy-600 transition-colors">
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                {scenarios.map((scenario) => {
                  const style = SCENARIO_STYLES[scenario.icon];
                  const { pnl } = computeScenarioPnL(setup, scenario);
                  const isProfit = pnl >= 0;
                  const validation = intel ? scenarioValidation(scenario, setup, intel) : null;

                  return (
                    <div key={scenario.id} className={`border rounded-lg p-3 ${style.bg} ${style.border} transition-all`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <select value={scenario.icon} onChange={(e) => updateScenario(scenario.id, { icon: e.target.value as Scenario["icon"] })}
                            className="bg-transparent border-none text-[9px] font-mono font-bold uppercase tracking-widest outline-none cursor-pointer" style={{ color: style.color }}>
                            <option value="bull">BULL</option>
                            <option value="base">BASE</option>
                            <option value="bear">BEAR</option>
                            <option value="blackswan">BLACK SWAN</option>
                          </select>
                          <input type="text" value={scenario.name} onChange={(e) => updateScenario(scenario.id, { name: e.target.value })}
                            className="bg-transparent text-xs text-navy-200 font-medium outline-none w-28" />
                        </div>
                        <div className="flex items-center gap-2">
                          {validation && (
                            <span className={`w-2 h-2 rounded-full ${validation.level === "green" ? "bg-accent-emerald" : validation.level === "red" ? "bg-accent-rose" : "bg-accent-amber"}`} />
                          )}
                          {scenario.targetPrice > 0 && (
                            <span className={`text-xs font-mono font-bold ${isProfit ? "text-accent-emerald" : "text-accent-rose"}`}>{fmtUsd(pnl)}</span>
                          )}
                          {scenarios.length > 2 && (
                            <button onClick={() => removeScenario(scenario.id)} className="text-navy-600 hover:text-accent-rose transition-colors p-0.5">
                              <Minus className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <MiniInput label="Prob %" value={scenario.probability} onChange={(v) => updateScenario(scenario.id, { probability: v })} />
                        <MiniInput label="Days" value={scenario.timeframeDays} onChange={(v) => updateScenario(scenario.id, { timeframeDays: v })} />
                        <MiniInput label="Target $" value={scenario.targetPrice} onChange={(v) => updateScenario(scenario.id, { targetPrice: v })} step={0.01} />
                        <MiniInput label="Stop $" value={scenario.stopPrice} onChange={(v) => updateScenario(scenario.id, { stopPrice: v })} step={0.01} />
                      </div>
                      <input type="text" value={scenario.catalyst} onChange={(e) => updateScenario(scenario.id, { catalyst: e.target.value })}
                        placeholder="Catalyst..."
                        className="mt-1.5 w-full bg-navy-900/60 border border-navy-700/50 rounded px-2 py-1 text-[10px] text-navy-300 outline-none placeholder:text-navy-700" />

                      {/* Validation reasons */}
                      {validation && validation.reasons.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {validation.reasons.slice(0, 3).map((r, i) => (
                            <span key={i} className={`text-[8px] font-mono px-1 py-0.5 rounded ${
                              validation.level === "green" ? "bg-accent-emerald/10 text-accent-emerald/80"
                              : validation.level === "red" ? "bg-accent-rose/10 text-accent-rose/80"
                              : "bg-accent-amber/10 text-accent-amber/80"
                            }`}>{r}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Flowchart / Intel tabs */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tab switcher */}
            {intel && (
              <div className="flex border-b border-navy-800/50 shrink-0">
                <button onClick={() => setRightTab("flowchart")}
                  className={`px-4 py-2 text-[10px] font-mono uppercase tracking-wider border-b-2 transition-colors ${rightTab === "flowchart" ? "border-accent-cyan text-accent-cyan" : "border-transparent text-navy-500 hover:text-navy-300"}`}>
                  Scenario Flow
                </button>
                <button onClick={() => setRightTab("intel")}
                  className={`px-4 py-2 text-[10px] font-mono uppercase tracking-wider border-b-2 transition-colors ${rightTab === "intel" ? "border-accent-cyan text-accent-cyan" : "border-transparent text-navy-500 hover:text-navy-300"}`}>
                  Intelligence ({intel.ticker})
                </button>
              </div>
            )}

            <div className="flex-1 overflow-auto">
              {rightTab === "flowchart" ? (
                <div className="p-4 bg-[#050508] h-full">
                  <FlowChart setup={setup} scenarios={scenarios} intel={intel} />
                </div>
              ) : intel ? (
                <IntelPanel intel={intel} setup={setup} />
              ) : null}
            </div>
          </div>
        </div>
      </UpgradeGate>
    </div>
  );
}

// ── Reusable small components ──

function NumInput({ label, value, onChange, prefix, step = 1 }: { label: string; value: number; onChange: (v: number) => void; prefix?: string; step?: number }) {
  return (
    <div>
      <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-navy-600 text-xs font-mono">{prefix}</span>}
        <input type="number" step={step} value={value || ""} onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          placeholder="0" className={`w-full bg-navy-800 border border-navy-700 rounded ${prefix ? "pl-7" : "pl-3"} pr-3 py-1.5 text-sm font-mono text-navy-100 outline-none focus:border-accent-cyan/50`} />
      </div>
    </div>
  );
}

function MiniInput({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <div>
      <label className="text-[9px] text-navy-600 uppercase tracking-wider block mb-0.5">{label}</label>
      <input type="number" step={step} value={value || ""} onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full bg-navy-900/60 border border-navy-700/50 rounded px-2 py-1 text-[11px] font-mono text-navy-200 outline-none" />
    </div>
  );
}

function MetricPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <span className="text-[9px] font-mono text-navy-600 uppercase">{label}</span>
      <span className={`text-xs font-mono font-bold ${color}`}>{value}</span>
    </div>
  );
}
