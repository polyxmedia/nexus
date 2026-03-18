"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { UpgradeGate } from "@/components/subscription/upgrade-gate";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  Gauge,
  Layers,
  Radio,
  Shield,
  ShieldAlert,
  Sigma,
  Target,
  Zap,
} from "lucide-react";

// ── Types ──

interface GEXLevel {
  strike: number;
  callGamma: number;
  putGamma: number;
  netGamma: number;
  callOI: number;
  putOI: number;
}

interface TriggerLevel {
  price: number;
  label: string;
  type: "support" | "resistance" | "acceleration" | "magnet" | "flip";
  intensity: number;
  dealerAction: string;
}

interface ScenarioPoint {
  spotDelta: number;
  spotPrice: number;
  netGEX: number;
  regime: "dampening" | "amplifying" | "neutral";
}

interface FlowDivergence {
  detected: boolean;
  type: string;
  severity: number;
  description: string;
}

interface OpexData {
  nextOpex: string;
  daysUntil: number;
  type: "weekly" | "monthly" | "quarterly";
  gammaConcentration: number;
  expectedImpact: string;
}

interface GEXSummary {
  ticker: string;
  spotPrice: number;
  netGEX: number;
  gexSign: "positive" | "negative";
  zeroGammaLevel: number;
  putWall: number;
  callWall: number;
  regime: "dampening" | "amplifying" | "neutral";
  flipDistance: number;
  levels: GEXLevel[];
  dataSource: "live" | "estimated";
  confidence: number;
  triggerLevels: TriggerLevel[];
  scenarioProfile: ScenarioPoint[];
  flowDivergence: FlowDivergence;
  dealerPositionBias: "long" | "short" | "flat";
  impliedMove1Day: number;
}

interface FragilityData {
  score: number;
  level: "stable" | "moderate" | "elevated" | "critical";
  components: {
    regime: number;
    signals: number;
    opex: number;
    divergence: number;
  };
}

interface ActiveSignal {
  id: number;
  title: string;
  intensity: number;
  category: string;
  layers: string[];
}

interface GEXResponse {
  summaries: GEXSummary[];
  aggregateRegime: "dampening" | "amplifying" | "neutral";
  lastUpdated: string;
  opex: OpexData;
  crossAssetSignal: string;
  fragility: FragilityData;
  activeSignals: ActiveSignal[];
}

// ── Helpers ──

function formatNumber(n: number): string {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(0);
}

function formatPrice(n: number): string {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const REGIME_COLORS = {
  dampening: { bg: "bg-accent-emerald/10", text: "text-accent-emerald", border: "border-accent-emerald/30", ring: "ring-accent-emerald/20" },
  amplifying: { bg: "bg-accent-rose/10", text: "text-accent-rose", border: "border-accent-rose/30", ring: "ring-accent-rose/20" },
  neutral: { bg: "bg-accent-amber/10", text: "text-accent-amber", border: "border-accent-amber/30", ring: "ring-accent-amber/20" },
};

const FRAGILITY_COLORS = {
  stable: { bg: "bg-accent-emerald/8", text: "text-accent-emerald", fill: "bg-accent-emerald" },
  moderate: { bg: "bg-accent-cyan/8", text: "text-accent-cyan", fill: "bg-accent-cyan" },
  elevated: { bg: "bg-accent-amber/8", text: "text-accent-amber", fill: "bg-accent-amber" },
  critical: { bg: "bg-accent-rose/8", text: "text-accent-rose", fill: "bg-accent-rose" },
};

const TRIGGER_ICONS: Record<string, typeof Target> = {
  support: Shield,
  resistance: ShieldAlert,
  acceleration: Zap,
  magnet: Target,
  flip: Activity,
};

const TRIGGER_COLORS: Record<string, string> = {
  support: "text-accent-emerald",
  resistance: "text-accent-rose",
  acceleration: "text-accent-amber",
  magnet: "text-accent-cyan",
  flip: "text-accent-amber",
};

// ── Info Tooltip ──

function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-navy-600/50 text-navy-500 hover:text-navy-300 hover:border-navy-500/50 transition-colors cursor-help"
        aria-label="More info"
      >
        <span className="text-[8px] font-mono font-bold leading-none">i</span>
      </button>
      {open && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 rounded-lg bg-navy-800 border border-navy-700/60 shadow-xl">
          <p className="text-[10px] text-navy-300 leading-relaxed">{text}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 bg-navy-800 border-r border-b border-navy-700/60 rotate-45" />
        </div>
      )}
    </span>
  );
}

// ── NEW: Regime Summary Banner ──

function RegimeSummaryBanner({
  data,
  selectedSummary,
}: {
  data: GEXResponse;
  selectedSummary: GEXSummary;
}) {
  const rc = REGIME_COLORS[data.aggregateRegime];
  const fc = FRAGILITY_COLORS[data.fragility.level];

  // Determine the primary data source quality
  const liveCount = data.summaries.filter((s) => s.dataSource === "live").length;
  const avgConfidence = data.summaries.reduce((sum, s) => sum + s.confidence, 0) / data.summaries.length;
  const isEstimated = liveCount === 0;

  // Build the actionable read
  const regimeVerb = data.aggregateRegime === "dampening"
    ? "Dealers are net long gamma. Expect range compression and mean reversion."
    : data.aggregateRegime === "amplifying"
    ? "Dealers are net short gamma. Moves will be amplified by hedging flows."
    : "Gamma is near the flip level. Positioning is balanced, watch for directional triggers.";

  const flipNote = selectedSummary.flipDistance > 0
    ? `Gamma flip at ${formatPrice(selectedSummary.zeroGammaLevel)} (${selectedSummary.flipDistance}% from spot).`
    : "";

  const opexNote = data.opex.daysUntil <= 2
    ? `OPEX in ${data.opex.daysUntil}d -- gamma pinning and charm decay will dominate.`
    : data.opex.daysUntil <= 5
    ? `${data.opex.type} OPEX in ${data.opex.daysUntil}d. Gamma concentration rising.`
    : "";

  return (
    <div className={`border ${rc.border} rounded-lg ${rc.bg} p-4`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <div className={`flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider ${rc.text}`}>
              <Activity className="h-3.5 w-3.5" />
              {data.aggregateRegime} regime
            </div>
            <div className={`flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider ${fc.text}`}>
              Fragility: {data.fragility.score}/100
            </div>
            {isEstimated && (
              <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-accent-amber bg-accent-amber/10 px-2 py-0.5 rounded">
                <Eye className="h-3 w-3" />
                Estimated data ({(avgConfidence * 100).toFixed(0)}% confidence)
              </div>
            )}
            {!isEstimated && (
              <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-accent-emerald bg-accent-emerald/10 px-2 py-0.5 rounded">
                <Eye className="h-3 w-3" />
                Live options data ({liveCount}/{data.summaries.length})
              </div>
            )}
          </div>
          <p className="text-xs text-navy-200 leading-relaxed">
            {regimeVerb} {flipNote} {opexNote}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-[10px] text-navy-600 uppercase tracking-wider">
            {selectedSummary.ticker} Spot
          </div>
          <div className="font-mono text-lg text-navy-100 tabular-nums">
            ${selectedSummary.spotPrice.toFixed(2)}
          </div>
          <div className="font-mono text-[10px] text-navy-500">
            1D implied: {selectedSummary.impliedMove1Day}%
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──

function FragilityGauge({ fragility }: { fragility: FragilityData }) {
  const colors = FRAGILITY_COLORS[fragility.level];
  const needleAngle = -90 + (fragility.score / 100) * 180;

  const components = [
    { label: "Regime", value: fragility.components.regime, max: 60, desc: "Gamma positioning" },
    { label: "Signals", value: fragility.components.signals, max: 45, desc: "Active convergence" },
    { label: "OPEX", value: fragility.components.opex, max: 10, desc: "Expiry proximity" },
    { label: "Divergence", value: fragility.components.divergence, max: 10, desc: "Flow conflict" },
  ];

  return (
    <div className={`border ${fragility.level === "critical" ? "border-accent-rose/40" : fragility.level === "elevated" ? "border-accent-amber/40" : "border-navy-700/40"} rounded-lg bg-navy-950/60 p-5 flex flex-col`}>
      <div className="flex items-center gap-2 mb-5">
        <span className="text-[10px] font-mono uppercase tracking-widest text-navy-500">
          Market Fragility
        </span>
        <InfoTip text="Composite score (0-100) measuring how vulnerable the market is to sharp moves. Combines gamma regime, signal convergence, OPEX proximity, and flow divergence. Higher scores mean dealers are less able to absorb shocks." />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative w-full max-w-[240px] mx-auto">
          <svg viewBox="0 0 200 120" className="w-full h-auto overflow-visible">
            <path d="M 15 105 A 85 85 0 0 1 185 105" fill="none" stroke="currentColor" strokeWidth="3" className="text-navy-800/60" />
            <path d="M 15 105 A 85 85 0 0 1 57.5 25" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" className="text-accent-emerald/25" />
            <path d="M 57.5 25 A 85 85 0 0 1 100 13" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" className="text-accent-cyan/25" />
            <path d="M 100 13 A 85 85 0 0 1 142.5 25" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" className="text-accent-amber/25" />
            <path d="M 142.5 25 A 85 85 0 0 1 185 105" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" className="text-accent-rose/25" />
            {fragility.score > 0 && (
              <path
                d="M 15 105 A 85 85 0 0 1 185 105"
                fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round"
                className={colors.text}
                style={{ strokeDasharray: `${(fragility.score / 100) * 267} 267`, opacity: 0.6, transition: "stroke-dasharray 1s ease-out" }}
              />
            )}
            {[0, 25, 50, 75, 100].map((tick) => {
              const angle = Math.PI * (1 - tick / 100);
              return (
                <line key={tick} x1={100 + 76 * Math.cos(angle)} y1={105 - 76 * Math.sin(angle)} x2={100 + 82 * Math.cos(angle)} y2={105 - 82 * Math.sin(angle)} stroke="currentColor" strokeWidth="1.5" className="text-navy-600" />
              );
            })}
            <g style={{ transform: `rotate(${needleAngle}deg)`, transformOrigin: "100px 105px", transition: "transform 1s ease-out" }}>
              <line x1="100" y1="105" x2="100" y2="32" stroke="currentColor" strokeWidth="1.5" className={colors.text} />
              <circle cx="100" cy="32" r="2" fill="currentColor" className={colors.text} />
            </g>
            <circle cx="100" cy="105" r="5" fill="currentColor" className="text-navy-700" />
            <circle cx="100" cy="105" r="2.5" fill="currentColor" className={colors.text} />
            <text x="12" y="118" className="fill-navy-600" style={{ fontSize: "7px", fontFamily: "monospace" }}>0</text>
            <text x="91" y="8" className="fill-navy-600" style={{ fontSize: "7px", fontFamily: "monospace" }}>50</text>
            <text x="180" y="118" className="fill-navy-600" style={{ fontSize: "7px", fontFamily: "monospace" }}>100</text>
          </svg>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center pb-1">
            <div className={`font-mono text-2xl font-light tabular-nums tracking-tight ${colors.text}`}>{fragility.score}</div>
            <div className={`font-mono text-[10px] uppercase tracking-widest ${colors.text} opacity-70`}>{fragility.level}</div>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-2.5">
        {components.map((c) => {
          const pct = c.max > 0 ? Math.min((c.value / c.max) * 100, 100) : 0;
          return (
            <div key={c.label}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider w-20">{c.label}</span>
                  <span className="text-[9px] text-navy-600 hidden lg:inline">{c.desc}</span>
                </div>
                <span className="text-[10px] font-mono tabular-nums text-navy-400">
                  {c.value}<span className="text-navy-700">/{c.max}</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-navy-800/80">
                <div
                  className={`h-1.5 rounded-full transition-all duration-700 ${pct > 70 ? "bg-accent-rose/70" : pct > 40 ? "bg-accent-amber/70" : "bg-accent-emerald/70"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CrossAssetStrip({ summaries }: { summaries: GEXSummary[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {summaries.map((s) => {
        const rc = REGIME_COLORS[s.regime];
        return (
          <div key={s.ticker} className={`border ${rc.border} rounded-lg ${rc.bg} p-3`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-sm font-semibold text-navy-100">{s.ticker}</span>
              <span className="font-mono text-sm text-navy-300 tabular-nums">${s.spotPrice.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] font-mono uppercase tracking-wider ${rc.text}`}>{s.regime}</span>
              <span className={`text-[10px] font-mono ${s.dataSource === "live" ? "text-accent-emerald" : "text-accent-amber"}`}>
                {s.dataSource === "live" ? "LIVE" : "EST"}
              </span>
              <span className="text-[9px] font-mono text-navy-600">{(s.confidence * 100).toFixed(0)}%</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div>
                <span className="text-[9px] font-mono text-navy-600 uppercase">Net GEX</span>
                <div className="text-[11px] font-mono text-navy-300 tabular-nums">
                  {s.gexSign === "positive" ? "+" : "-"}{formatNumber(Math.abs(s.netGEX))}
                </div>
              </div>
              <div>
                <span className="text-[9px] font-mono text-navy-600 uppercase">Flip Dist</span>
                <div className="text-[11px] font-mono text-navy-300 tabular-nums">{s.flipDistance}%</div>
              </div>
              <div>
                <span className="text-[9px] font-mono text-navy-600 uppercase">1D Move</span>
                <div className="text-[11px] font-mono text-navy-300 tabular-nums">{s.impliedMove1Day}%</div>
              </div>
              <div>
                <span className="text-[9px] font-mono text-navy-600 uppercase">Dealer</span>
                <div className="text-[11px] font-mono text-navy-300 capitalize">{s.dealerPositionBias}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── NEW: Redesigned Key Levels (no overlap) ──

function KeyLevelsLadder({ summary }: { summary: GEXSummary }) {
  const levels = [
    { price: summary.callWall, label: "CALL WALL", color: "text-accent-rose", dotColor: "bg-accent-rose" },
    { price: summary.zeroGammaLevel, label: "ZERO GAMMA", color: "text-accent-amber", dotColor: "bg-accent-amber" },
    { price: summary.spotPrice, label: "SPOT", color: "text-navy-100", dotColor: "bg-navy-100" },
    { price: summary.putWall, label: "PUT WALL", color: "text-accent-emerald", dotColor: "bg-accent-emerald" },
  ].sort((a, b) => b.price - a.price);

  return (
    <div className="border border-navy-700/40 rounded-lg bg-navy-950/60 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="h-3.5 w-3.5 text-navy-500" />
        <span className="text-[10px] font-mono uppercase tracking-widest text-navy-500">
          Key Levels <InfoTip text="Strike prices with the highest gamma exposure. These act as magnets or barriers for price. Positive GEX strikes dampen moves (dealers buy dips, sell rips). Negative GEX strikes amplify moves." />
        </span>
      </div>

      {/* Row-based layout avoids overlap */}
      <div className="space-y-0">
        {levels.map((level, i) => {
          const isSpot = level.label === "SPOT";
          const pctFromSpot = ((level.price - summary.spotPrice) / summary.spotPrice * 100).toFixed(2);
          const showDistance = !isSpot && summary.spotPrice > 0;

          return (
            <div key={level.label}>
              <div className={`flex items-center gap-3 py-2.5 px-2 rounded ${isSpot ? "bg-navy-800/40" : "hover:bg-navy-800/20"} transition-colors`}>
                <div className={`w-2 h-2 rounded-full shrink-0 ${level.dotColor}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono uppercase tracking-wider ${level.color} ${isSpot ? "font-semibold" : ""}`}>
                      {level.label}
                    </span>
                    {isSpot && (
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                        summary.regime === "dampening" ? "bg-accent-emerald/10 text-accent-emerald" :
                        summary.regime === "amplifying" ? "bg-accent-rose/10 text-accent-rose" :
                        "bg-accent-amber/10 text-accent-amber"
                      }`}>
                        {summary.regime === "dampening" ? "STABLE" : summary.regime === "amplifying" ? "FRAGILE" : "INFLECTION"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`font-mono text-xs tabular-nums ${isSpot ? "text-navy-100 font-semibold" : "text-navy-300"}`}>
                    {formatPrice(level.price)}
                  </span>
                  {showDistance && (
                    <span className="text-[9px] font-mono text-navy-600 ml-2">
                      {Number(pctFromSpot) > 0 ? "+" : ""}{pctFromSpot}%
                    </span>
                  )}
                </div>
              </div>
              {i < levels.length - 1 && (
                <div className="ml-3 border-l border-navy-800 h-1" />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 border-t border-navy-800 pt-3">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <div className="flex items-center gap-1.5">
            <ArrowUp className="h-3 w-3 text-accent-emerald" />
            <span className="text-navy-500">Dealers buy below {formatPrice(summary.putWall)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ArrowDown className="h-3 w-3 text-accent-rose" />
            <span className="text-navy-500">Dealers sell above {formatPrice(summary.callWall)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TriggerCascade({ triggers }: { triggers: TriggerLevel[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="border border-navy-700/40 rounded-lg bg-navy-950/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-3.5 w-3.5 text-accent-amber" />
        <span className="text-[10px] font-mono uppercase tracking-widest text-navy-500">
          Trigger Cascade <InfoTip text="Ordered sequence of price levels that, if breached, would force dealer re-hedging and potentially trigger a cascade of further moves. Watch for clustering near current price." />
        </span>
      </div>
      <div className="space-y-1">
        {triggers.map((t, i) => {
          const Icon = TRIGGER_ICONS[t.type] || Target;
          const color = TRIGGER_COLORS[t.type] || "text-navy-400";
          const isExpanded = expanded === i;

          return (
            <div key={i}>
              <button
                onClick={() => setExpanded(isExpanded ? null : i)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-navy-800/40 transition-colors"
              >
                <Icon className={`h-3 w-3 flex-shrink-0 ${color}`} />
                <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500 w-24 text-left">
                  {t.label}
                </span>
                <span className="font-mono text-[11px] text-navy-300 tabular-nums flex-1 text-left">
                  {formatPrice(t.price)}
                </span>
                <div className="w-12 h-1 rounded-full bg-navy-800">
                  <div
                    className={`h-1 rounded-full ${color.replace("text-", "bg-")}`}
                    style={{ width: `${t.intensity * 100}%` }}
                  />
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 text-navy-600" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-navy-600" />
                )}
              </button>
              {isExpanded && (
                <div className="ml-5 pl-5 border-l border-navy-800 py-2">
                  <p className="text-[11px] text-navy-400 leading-relaxed">
                    {t.dealerAction}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScenarioModeler({ profile, spotPrice }: { profile: ScenarioPoint[]; spotPrice: number }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const activePoint = hoverIndex !== null ? profile[hoverIndex] : profile.find((p) => p.spotDelta === 0) || profile[Math.floor(profile.length / 2)];

  const maxAbsGEX = Math.max(...profile.map((p) => Math.abs(p.netGEX)), 1);

  return (
    <div className="border border-navy-700/40 rounded-lg bg-navy-950/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Gauge className="h-3.5 w-3.5 text-accent-cyan" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-navy-500">
            Scenario Modeler <InfoTip text="Interactive chart showing how net gamma exposure changes across strike prices. Hover to see the gamma value at each strike. The zero-crossing point (gamma flip) is where dealer hedging switches from stabilizing to destabilizing." />
          </span>
        </div>
        {activePoint && (
          <div className="flex items-center gap-3 text-[10px] font-mono">
            <span className="text-navy-500">
              {activePoint.spotDelta > 0 ? "+" : ""}{activePoint.spotDelta}%
            </span>
            <span className="text-navy-300">${activePoint.spotPrice.toFixed(0)}</span>
            <span className={REGIME_COLORS[activePoint.regime].text}>
              {activePoint.regime.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <p className="text-[10px] text-navy-600 mb-3">
        Hover to see how net gamma changes as price moves. Regime shifts shown by color.
      </p>

      <div className="flex items-end gap-px h-24">
        {profile.map((point, i) => {
          const height = (Math.abs(point.netGEX) / maxAbsGEX) * 100;
          const isPositive = point.netGEX >= 0;
          const isZero = point.spotDelta === 0;
          const isHovered = hoverIndex === i;

          return (
            <div
              key={i}
              className="flex-1 flex flex-col justify-end items-center cursor-crosshair relative"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <div
                className={`w-full rounded-t transition-all duration-100 ${
                  isHovered
                    ? isPositive ? "bg-accent-emerald/60" : "bg-accent-rose/60"
                    : isPositive ? "bg-accent-emerald/25" : "bg-accent-rose/25"
                } ${isZero ? "ring-1 ring-navy-400" : ""}`}
                style={{ height: `${Math.max(height, 2)}%` }}
              />
              {i > 0 && profile[i - 1].regime !== point.regime && (
                <div className="absolute -top-1 w-full h-px bg-accent-amber" />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between mt-1">
        <span className="text-[9px] font-mono text-navy-600">-5%</span>
        <span className="text-[9px] font-mono text-navy-500">SPOT</span>
        <span className="text-[9px] font-mono text-navy-600">+5%</span>
      </div>
    </div>
  );
}

// ── NEW: Redesigned Gamma Profile as dual-sided vertical bar chart ──

function GammaProfile({ summary }: { summary: GEXSummary }) {
  const [hoveredStrike, setHoveredStrike] = useState<number | null>(null);

  // Take the most significant levels around spot
  const sorted = [...summary.levels].sort((a, b) => a.strike - b.strike);
  const spotIdx = sorted.findIndex((l) => l.strike >= summary.spotPrice);
  const windowSize = 12;
  const start = Math.max(0, (spotIdx > 0 ? spotIdx : Math.floor(sorted.length / 2)) - windowSize);
  const visibleLevels = sorted.slice(start, start + windowSize * 2 + 1);

  const maxCallGamma = Math.max(...visibleLevels.map((l) => Math.abs(l.callGamma)), 1);
  const maxPutGamma = Math.max(...visibleLevels.map((l) => Math.abs(l.putGamma)), 1);
  const maxGamma = Math.max(maxCallGamma, maxPutGamma);

  const hoveredLevel = hoveredStrike !== null ? visibleLevels.find((l) => l.strike === hoveredStrike) : null;

  return (
    <div className="border border-navy-700/40 rounded-lg bg-navy-950/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sigma className="h-3.5 w-3.5 text-navy-500" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-navy-500">
            Gamma Profile <InfoTip text="Dual-sided chart showing call gamma (up, green) vs put gamma (down, red) at each strike. The strike with the tallest bar creates the strongest support or resistance. Spot price highlighted." />
          </span>
        </div>
        {hoveredLevel ? (
          <div className="flex items-center gap-3 text-[10px] font-mono">
            <span className="text-navy-300">{formatPrice(hoveredLevel.strike)}</span>
            <span className="text-accent-emerald">C: {formatNumber(hoveredLevel.callGamma)}</span>
            <span className="text-accent-rose">P: {formatNumber(hoveredLevel.putGamma)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-[9px] font-mono text-navy-600">
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-accent-emerald/40" /> Calls</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-accent-rose/40" /> Puts</span>
          </div>
        )}
      </div>

      {/* Dual bar chart: calls up, puts down */}
      <div className="relative">
        {/* Call gamma bars (upward) */}
        <div className="flex items-end gap-px h-20">
          {visibleLevels.map((level) => {
            const height = maxGamma > 0 ? (Math.abs(level.callGamma) / maxGamma) * 100 : 0;
            const isNearSpot = Math.abs(level.strike - summary.spotPrice) / summary.spotPrice < 0.005;
            const isHovered = hoveredStrike === level.strike;

            return (
              <div
                key={`call-${level.strike}`}
                className="flex-1 flex flex-col justify-end cursor-crosshair"
                onMouseEnter={() => setHoveredStrike(level.strike)}
                onMouseLeave={() => setHoveredStrike(null)}
              >
                <div
                  className={`w-full rounded-t transition-all duration-100 ${
                    isHovered ? "bg-accent-emerald/60" : isNearSpot ? "bg-accent-emerald/50" : "bg-accent-emerald/25"
                  }`}
                  style={{ height: `${Math.max(height, 1)}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* Center line with spot marker */}
        <div className="relative h-5 border-t border-b border-navy-700/40 flex items-center">
          {visibleLevels.map((level, i) => {
            const isNearSpot = Math.abs(level.strike - summary.spotPrice) / summary.spotPrice < 0.005;
            return (
              <div key={`label-${level.strike}`} className="flex-1 text-center">
                {isNearSpot && (
                  <div className="flex items-center justify-center gap-0.5">
                    <div className="w-1 h-1 rounded-full bg-navy-100" />
                    <span className="text-[7px] font-mono text-navy-300 uppercase">Spot</span>
                  </div>
                )}
                {i === 0 && !visibleLevels.some((l) => Math.abs(l.strike - summary.spotPrice) / summary.spotPrice < 0.005) && (
                  <span className="text-[7px] font-mono text-navy-600">{visibleLevels[0].strike.toFixed(0)}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Put gamma bars (downward) */}
        <div className="flex items-start gap-px h-20">
          {visibleLevels.map((level) => {
            const height = maxGamma > 0 ? (Math.abs(level.putGamma) / maxGamma) * 100 : 0;
            const isNearSpot = Math.abs(level.strike - summary.spotPrice) / summary.spotPrice < 0.005;
            const isHovered = hoveredStrike === level.strike;

            return (
              <div
                key={`put-${level.strike}`}
                className="flex-1 flex flex-col justify-start cursor-crosshair"
                onMouseEnter={() => setHoveredStrike(level.strike)}
                onMouseLeave={() => setHoveredStrike(null)}
              >
                <div
                  className={`w-full rounded-b transition-all duration-100 ${
                    isHovered ? "bg-accent-rose/60" : isNearSpot ? "bg-accent-rose/50" : "bg-accent-rose/25"
                  }`}
                  style={{ height: `${Math.max(height, 1)}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Strike range */}
      <div className="flex justify-between mt-1">
        <span className="text-[9px] font-mono text-navy-600">{visibleLevels.length > 0 ? formatPrice(visibleLevels[0].strike) : ""}</span>
        <span className="text-[9px] font-mono text-navy-500">Strike Range</span>
        <span className="text-[9px] font-mono text-navy-600">{visibleLevels.length > 0 ? formatPrice(visibleLevels[visibleLevels.length - 1].strike) : ""}</span>
      </div>
    </div>
  );
}

function FlowDivergenceCard({ divergence }: { divergence: FlowDivergence }) {
  if (!divergence.detected) return null;

  return (
    <div className="border border-accent-amber/30 rounded-lg bg-accent-amber/[0.04] p-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-3.5 w-3.5 text-accent-amber" />
        <span className="text-[10px] font-mono uppercase tracking-widest text-accent-amber">
          Flow Divergence Detected <InfoTip text="Flags when options flow contradicts the prevailing gamma regime. For example, heavy put buying during positive gamma suggests smart money is positioning for a regime change. These divergences often precede sharp moves." />
        </span>
      </div>
      <p className="text-xs text-navy-300 leading-relaxed">
        {divergence.description}
      </p>
      <div className="mt-2 h-1 rounded-full bg-navy-800">
        <div
          className="h-1 rounded-full bg-accent-amber transition-all"
          style={{ width: `${divergence.severity * 100}%` }}
        />
      </div>
    </div>
  );
}

function OpexClock({ opex }: { opex: OpexData }) {
  const typeColors = {
    weekly: "text-navy-400",
    monthly: "text-accent-cyan",
    quarterly: "text-accent-amber",
  };

  return (
    <div className="border border-navy-700/40 rounded-lg bg-navy-950/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-3.5 w-3.5 text-navy-500" />
        <span className="text-[10px] font-mono uppercase tracking-widest text-navy-500">
          OPEX Gamma Clock <InfoTip text="Countdown to options expiration. As OPEX approaches, gamma increases sharply (charm effect) and dealers must hedge more aggressively. The final 24-48 hours typically see the most pronounced gamma-driven moves." />
        </span>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div>
          <div className={`font-mono text-lg font-light ${typeColors[opex.type]}`}>
            {opex.daysUntil}d
          </div>
          <span className="text-[10px] font-mono text-navy-600 uppercase">
            {opex.type} expiry
          </span>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-mono text-navy-500">
            {new Date(opex.nextOpex).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[9px] font-mono text-navy-600">CONCENTRATION</span>
            <div className="w-12 h-1.5 rounded-full bg-navy-800">
              <div
                className={`h-1.5 rounded-full ${opex.gammaConcentration > 0.6 ? "bg-accent-amber" : "bg-navy-500"} transition-all`}
                style={{ width: `${opex.gammaConcentration * 100}%` }}
              />
            </div>
            <span className="text-[9px] font-mono text-navy-500">{(opex.gammaConcentration * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-navy-500 leading-relaxed">
        {opex.expectedImpact}
      </p>
    </div>
  );
}

function SignalConvergencePanel({ signals, regime }: { signals: ActiveSignal[]; regime: string }) {
  if (signals.length === 0) {
    return (
      <div className="border border-navy-700/40 rounded-lg bg-navy-950/60 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Radio className="h-3.5 w-3.5 text-navy-500" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-navy-500">
            Signal Convergence
          </span>
        </div>
        <p className="text-[11px] text-navy-600">No high-intensity signals active. Gamma positioning is the primary market driver.</p>
      </div>
    );
  }

  return (
    <div className={`border ${regime === "amplifying" ? "border-accent-rose/30" : "border-navy-700/40"} rounded-lg bg-navy-950/60 p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <Radio className="h-3.5 w-3.5 text-accent-cyan" />
        <span className="text-[10px] font-mono uppercase tracking-widest text-navy-500">
          Signal Convergence <InfoTip text="Shows when multiple gamma indicators align in the same direction. Convergence of negative gamma, flow divergence, and OPEX proximity creates compound risk." />
        </span>
        {regime === "amplifying" && (
          <span className="text-[9px] font-mono uppercase tracking-wider bg-accent-rose/15 text-accent-rose px-1.5 py-0.5 rounded">
            COMPOUND RISK
          </span>
        )}
      </div>

      {regime === "amplifying" && (
        <p className="text-[10px] text-accent-rose/80 mb-3 leading-relaxed">
          Active signals in amplifying gamma regime. Geopolitical catalysts will be magnified by dealer hedging flows.
        </p>
      )}

      <div className="space-y-1.5">
        {signals.map((s) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1 h-3 rounded-sm ${i < s.intensity ? "bg-accent-rose" : "bg-navy-800"}`}
                />
              ))}
            </div>
            <span className="text-[10px] font-mono text-navy-600 uppercase w-10">{s.category.slice(0, 4)}</span>
            <span className="text-[11px] text-navy-300 truncate flex-1">{s.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ──

export default function GEXPage() {
  const [data, setData] = useState<GEXResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicker, setSelectedTicker] = useState<string>("SPY");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchGEX = useCallback(async () => {
    try {
      const res = await fetch("/api/gex");
      if (!res.ok) throw new Error("Failed to fetch GEX data");
      const json: GEXResponse = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGEX();
    const startPolling = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (document.visibilityState === "visible") {
        intervalRef.current = setInterval(fetchGEX, 15 * 60 * 1000);
      }
    };
    startPolling();
    document.addEventListener("visibilitychange", startPolling);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", startPolling);
    };
  }, [fetchGEX]);

  const selectedSummary = data?.summaries.find((s) => s.ticker === selectedTicker) || data?.summaries[0];

  return (
    <PageContainer
      title="Gamma Exposure"
      subtitle="Dealer positioning, market fragility, and trigger cascade analysis"
    >
      <UpgradeGate minTier="operator" feature="Gamma exposure analysis" blur>

        {error && (
          <div className="mb-4 border border-accent-rose/30 rounded-lg bg-accent-rose/[0.04] p-3">
            <span className="font-mono text-xs text-accent-rose">{error}</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-20" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-64" />
              <Skeleton className="h-64 md:col-span-2" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-80" />
              <Skeleton className="h-80" />
            </div>
          </div>
        ) : data && selectedSummary ? (
          <div className="space-y-4">

            {/* ── Row 0: Regime Summary Banner ── */}
            <RegimeSummaryBanner data={data} selectedSummary={selectedSummary} />

            {/* ── Row 1: Fragility Gauge + Cross-Asset Narrative ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FragilityGauge fragility={data.fragility} />

              <div className="md:col-span-2 border border-navy-700/40 rounded-lg bg-navy-950/60 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-navy-500" />
                    <span className="text-[10px] font-mono uppercase tracking-widest text-navy-500">
                      Cross-Asset Regime <InfoTip text="Current gamma regime across equities, bonds, commodities, and volatility. Shows whether dealer positioning is dampening or amplifying moves in each asset class. Cross-asset alignment increases systemic risk." />
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-navy-600">
                    {new Date(data.lastUpdated).toLocaleTimeString()}
                  </span>
                </div>

                <p className="text-xs text-navy-300 leading-relaxed mb-4">
                  {data.crossAssetSignal}
                </p>

                <CrossAssetStrip summaries={data.summaries} />
              </div>
            </div>

            {/* ── Row 2: Ticker Selector ── */}
            <div className="flex items-center gap-1 border-b border-navy-800 pb-2">
              {data.summaries.map((s) => {
                const isSelected = s.ticker === selectedTicker;
                const rc = REGIME_COLORS[s.regime];
                return (
                  <button
                    key={s.ticker}
                    onClick={() => setSelectedTicker(s.ticker)}
                    className={`px-4 py-1.5 rounded-t text-[11px] font-mono uppercase tracking-wider transition-colors ${
                      isSelected
                        ? `${rc.bg} ${rc.text} border border-b-0 ${rc.border}`
                        : "text-navy-500 hover:text-navy-300 border border-transparent"
                    }`}
                  >
                    {s.ticker}
                    <span className="ml-2 text-[9px]">{s.regime.slice(0, 3).toUpperCase()}</span>
                  </button>
                );
              })}
            </div>

            {/* ── Row 3: Key Levels + Trigger Cascade + Gamma Profile ── */}
            <div className="grid grid-cols-3 gap-4">
              <KeyLevelsLadder summary={selectedSummary} />
              <TriggerCascade triggers={selectedSummary.triggerLevels} />
              <GammaProfile summary={selectedSummary} />
            </div>

            {/* ── Row 4: Scenario Modeler + Flow Divergence + OPEX ── */}
            <div className="grid grid-cols-2 gap-4">
              <ScenarioModeler
                profile={selectedSummary.scenarioProfile}
                spotPrice={selectedSummary.spotPrice}
              />
              <div className="space-y-4">
                <FlowDivergenceCard divergence={selectedSummary.flowDivergence} />
                <OpexClock opex={data.opex} />
              </div>
            </div>

            {/* ── Row 5: Signal Convergence ── */}
            <SignalConvergencePanel
              signals={data.activeSignals}
              regime={data.aggregateRegime}
            />

            {/* ── Methodology ── */}
            <div className="border-t border-navy-800 pt-4 mt-2">
              <p className="text-[10px] text-navy-600 leading-relaxed max-w-3xl">
                GEX computed from options chain gamma and open interest per strike. Net GEX = (call gamma x call OI) - (put gamma x put OI) x 100 x spot.
                Positive net gamma implies dealer hedging suppresses moves (dampening). Negative implies amplification.
                Trigger levels derived from cumulative gamma inflection points and OI concentration.
                Fragility score combines GEX regime, active signal intensity, OPEX proximity, and flow divergence.
                When live options data is unavailable, synthetic estimation uses VIX and put/call ratio as proxies (lower confidence).
              </p>
            </div>
          </div>
        ) : null}
      </UpgradeGate>
    </PageContainer>
  );
}
