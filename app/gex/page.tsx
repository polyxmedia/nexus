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
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock,
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

// ── Sub-components ──

function FragilityGauge({ fragility, regime }: { fragility: FragilityData; regime: string }) {
  const colors = FRAGILITY_COLORS[fragility.level];
  const needleRad = Math.PI * (1 - fragility.score / 100); // π (left) to 0 (right)

  return (
    <div className={`border ${fragility.level === "critical" ? "border-accent-rose/40" : fragility.level === "elevated" ? "border-accent-amber/40" : "border-navy-700/40"} rounded-lg ${colors.bg} p-5`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-navy-500">
            Market Fragility
          </span>
          <div className={`mt-1 font-mono text-2xl font-light tracking-wider ${colors.text}`}>
            {fragility.level.toUpperCase()}
          </div>
        </div>
        <div className="text-right">
          <div className={`font-mono text-3xl font-light tabular-nums ${colors.text}`}>
            {fragility.score}
          </div>
          <span className="text-[10px] font-mono text-navy-600">/ 100</span>
        </div>
      </div>

      {/* Gauge arc */}
      <div className="relative h-16 mb-3 flex items-end justify-center">
        <svg viewBox="0 0 200 100" className="w-full max-w-[280px] h-auto">
          {/* Background arc */}
          <path
            d="M 10 95 A 90 90 0 0 1 190 95"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-navy-800"
          />
          {/* Colored segments */}
          <path d="M 10 95 A 90 90 0 0 1 55 20" fill="none" stroke="currentColor" strokeWidth="6" className="text-accent-emerald/40" />
          <path d="M 55 20 A 90 90 0 0 1 100 5" fill="none" stroke="currentColor" strokeWidth="6" className="text-accent-cyan/40" />
          <path d="M 100 5 A 90 90 0 0 1 145 20" fill="none" stroke="currentColor" strokeWidth="6" className="text-accent-amber/40" />
          <path d="M 145 20 A 90 90 0 0 1 190 95" fill="none" stroke="currentColor" strokeWidth="6" className="text-accent-rose/40" />
          {/* Needle */}
          <line
            x1="100"
            y1="95"
            x2={100 + 70 * Math.cos(needleRad)}
            y2={95 - 70 * Math.sin(needleRad)}
            stroke="currentColor"
            strokeWidth="2"
            className={colors.text}
          />
          <circle cx="100" cy="95" r="4" fill="currentColor" className={colors.text} />
        </svg>
      </div>

      {/* Component breakdown */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Regime", value: fragility.components.regime, max: 60 },
          { label: "Signals", value: fragility.components.signals, max: 45 },
          { label: "OPEX", value: fragility.components.opex, max: 10 },
          { label: "Divergence", value: fragility.components.divergence, max: 10 },
        ].map((c) => (
          <div key={c.label} className="text-center">
            <div className="h-1 rounded-full bg-navy-800 mb-1">
              <div
                className={`h-1 rounded-full ${colors.fill} transition-all duration-700`}
                style={{ width: `${c.max > 0 ? Math.min((c.value / c.max) * 100, 100) : 0}%` }}
              />
            </div>
            <span className="text-[9px] font-mono text-navy-600 uppercase">{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CrossAssetStrip({ summaries }: { summaries: GEXSummary[] }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {summaries.map((s) => {
        const rc = REGIME_COLORS[s.regime];
        return (
          <div key={s.ticker} className={`border ${rc.border} rounded-lg ${rc.bg} p-3`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-sm font-semibold text-navy-100">{s.ticker}</span>
              <span className="font-mono text-sm text-navy-300 tabular-nums">${s.spotPrice.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] font-mono uppercase tracking-wider ${rc.text}`}>
                {s.regime}
              </span>
              <span className={`text-[10px] font-mono ${s.dataSource === "live" ? "text-accent-emerald" : "text-accent-amber"}`}>
                {s.dataSource === "live" ? "LIVE" : "EST"}
              </span>
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

function KeyLevelsLadder({ summary }: { summary: GEXSummary }) {
  // Build a vertical price ladder showing key levels
  const allPrices = [
    { price: summary.callWall, label: "CALL WALL", color: "text-accent-rose", bgColor: "bg-accent-rose" },
    { price: summary.zeroGammaLevel, label: "ZERO GAMMA", color: "text-accent-amber", bgColor: "bg-accent-amber" },
    { price: summary.spotPrice, label: "SPOT", color: "text-navy-100", bgColor: "bg-navy-100" },
    { price: summary.putWall, label: "PUT WALL", color: "text-accent-emerald", bgColor: "bg-accent-emerald" },
  ].sort((a, b) => b.price - a.price);

  const maxPrice = Math.max(...allPrices.map((p) => p.price));
  const minPrice = Math.min(...allPrices.map((p) => p.price));
  const range = maxPrice - minPrice || 1;

  return (
    <div className="border border-navy-700/40 rounded-lg bg-navy-950/60 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="h-3.5 w-3.5 text-navy-500" />
        <span className="text-[10px] font-mono uppercase tracking-widest text-navy-500">
          Key Levels
        </span>
      </div>

      <div className="relative h-48 flex">
        {/* Vertical price bar */}
        <div className="relative w-2 bg-navy-800 rounded-full mr-4 flex-shrink-0">
          {allPrices.map((level) => {
            const pct = ((maxPrice - level.price) / range) * 100;
            return (
              <div
                key={level.label}
                className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full ${level.bgColor} ring-2 ring-navy-950`}
                style={{ top: `${Math.min(Math.max(pct, 2), 98)}%`, transform: "translate(-50%, -50%)" }}
              />
            );
          })}
          {/* Range fill between put wall and call wall */}
          <div
            className="absolute left-0 w-full bg-navy-600/20 rounded"
            style={{
              top: `${((maxPrice - summary.callWall) / range) * 100}%`,
              height: `${((summary.callWall - summary.putWall) / range) * 100}%`,
            }}
          />
        </div>

        {/* Labels */}
        <div className="relative flex-1">
          {allPrices.map((level) => {
            const pct = ((maxPrice - level.price) / range) * 100;
            const isSpot = level.label === "SPOT";
            return (
              <div
                key={level.label}
                className="absolute left-0 flex items-center gap-2"
                style={{ top: `${Math.min(Math.max(pct, 2), 98)}%`, transform: "translateY(-50%)" }}
              >
                <span className={`text-[10px] font-mono uppercase tracking-wider ${level.color} ${isSpot ? "font-semibold" : ""}`}>
                  {level.label}
                </span>
                <span className={`text-[11px] font-mono tabular-nums ${isSpot ? "text-navy-100" : "text-navy-400"}`}>
                  {formatPrice(level.price)}
                </span>
                {isSpot && (
                  <span className="text-[9px] font-mono text-navy-600">
                    ({summary.regime === "dampening" ? "STABLE ZONE" : summary.regime === "amplifying" ? "FRAGILE ZONE" : "INFLECTION"})
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Dealer flow arrows */}
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
          Trigger Cascade
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
                {/* Intensity bar */}
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
            Scenario Modeler
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

      {/* Bar chart */}
      <div className="flex items-end gap-px h-24">
        {profile.map((point, i) => {
          const height = (Math.abs(point.netGEX) / maxAbsGEX) * 100;
          const isPositive = point.netGEX >= 0;
          const isZero = point.spotDelta === 0;
          const isHovered = hoverIndex === i;
          const rc = REGIME_COLORS[point.regime];

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
                    ? isPositive
                      ? "bg-accent-emerald/60"
                      : "bg-accent-rose/60"
                    : isPositive
                      ? "bg-accent-emerald/25"
                      : "bg-accent-rose/25"
                } ${isZero ? "ring-1 ring-navy-400" : ""}`}
                style={{ height: `${Math.max(height, 2)}%` }}
              />
              {/* Regime change indicators */}
              {i > 0 && profile[i - 1].regime !== point.regime && (
                <div className="absolute -top-1 w-full h-px bg-accent-amber" />
              )}
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-1">
        <span className="text-[9px] font-mono text-navy-600">-5%</span>
        <span className="text-[9px] font-mono text-navy-500">SPOT</span>
        <span className="text-[9px] font-mono text-navy-600">+5%</span>
      </div>
    </div>
  );
}

function GammaProfile({ summary }: { summary: GEXSummary }) {
  const maxAbsGamma = Math.max(
    ...summary.levels.map((l) => Math.abs(l.netGamma)),
    1
  );

  return (
    <div className="border border-navy-700/40 rounded-lg bg-navy-950/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sigma className="h-3.5 w-3.5 text-navy-500" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-navy-500">
            Gamma Profile
          </span>
        </div>
        <div className="flex items-center gap-4 text-[9px] font-mono text-navy-600">
          <span>NEG (amplify)</span>
          <span>POS (dampen)</span>
        </div>
      </div>

      <div className="max-h-56 overflow-y-auto space-y-px">
        {summary.levels.map((level) => {
          const normalizedNet = maxAbsGamma > 0 ? level.netGamma / maxAbsGamma : 0;
          const barWidth = Math.min(Math.abs(normalizedNet) * 100, 100);
          const isPositive = level.netGamma >= 0;
          const isNearSpot =
            Math.abs(level.strike - summary.spotPrice) / summary.spotPrice < 0.005;

          return (
            <div
              key={level.strike}
              className={`flex items-center gap-2 py-0.5 ${isNearSpot ? "bg-navy-800/40 rounded" : ""}`}
            >
              <span className={`w-14 text-right font-mono text-[10px] tabular-nums ${isNearSpot ? "text-navy-100 font-semibold" : "text-navy-500"}`}>
                {level.strike.toFixed(0)}
              </span>
              <div className="relative flex h-3 flex-1 items-center">
                <div className="absolute left-1/2 top-0 h-full w-px bg-navy-700/40" />
                {isPositive ? (
                  <div
                    className="absolute left-1/2 h-2.5 rounded-r bg-accent-emerald/30"
                    style={{ width: `${barWidth / 2}%` }}
                  />
                ) : (
                  <div
                    className="absolute right-1/2 h-2.5 rounded-l bg-accent-rose/30"
                    style={{ width: `${barWidth / 2}%` }}
                  />
                )}
              </div>
              <span className="w-14 font-mono text-[9px] text-navy-600 tabular-nums text-right">
                {formatNumber(level.netGamma)}
              </span>
            </div>
          );
        })}
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
          Flow Divergence Detected
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
          OPEX Gamma Clock
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
          Signal Convergence
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
                  className={`w-1 h-3 rounded-sm ${
                    i < s.intensity ? "bg-accent-rose" : "bg-navy-800"
                  }`}
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

function HistoricalContext({ regime }: { regime: string }) {
  // Reference events with documented gamma regimes and verified price moves.
  // Regime classifications sourced from SpotGamma/SqueezeMetrics contemporaneous reports.
  const references = [
    {
      event: "SVB Collapse",
      date: "Mar 2023",
      regime: "amplifying",
      outcome: "SPY -4.6% in 3 sessions. Negative gamma accelerated selling into bank contagion fears.",
    },
    {
      event: "Oct 2023 Rally",
      date: "Oct 2023",
      regime: "dampening",
      outcome: "SPY +10.8% in 6 weeks. Positive gamma pinned market, allowing steady grind higher.",
    },
    {
      event: "Japan Carry Unwind",
      date: "Aug 2024",
      regime: "amplifying",
      outcome: "SPY -5.8% in 3 days. VIX > 60. Negative gamma + macro shock = cascading unwind.",
    },
    {
      event: "Pre-Election Hedge",
      date: "Oct 2024",
      regime: "neutral",
      outcome: "SPY range-bound. Hedging activity elevated but balanced. Post-election gamma flip drove rally.",
    },
  ];

  // Highlight events with the same regime as current
  const sameRegime = references.filter((r) => r.regime === regime);

  return (
    <div className="border border-navy-700/40 rounded-lg bg-navy-950/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="h-3.5 w-3.5 text-navy-500" />
        <span className="text-[10px] font-mono uppercase tracking-widest text-navy-500">
          Historical Context
        </span>
      </div>

      <div className="space-y-2.5">
        {references.map((ref) => {
          const matchesRegime = sameRegime.includes(ref);
          return (
            <div
              key={ref.event}
              className={`p-2.5 rounded border ${
                matchesRegime
                  ? "border-accent-cyan/30 bg-accent-cyan/[0.04]"
                  : "border-navy-800/40 bg-navy-900/20"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-navy-200 font-medium">{ref.event}</span>
                  {matchesRegime && (
                    <span className="text-[9px] font-mono uppercase tracking-wider text-accent-cyan bg-accent-cyan/10 px-1 py-0.5 rounded">
                      SAME REGIME
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-navy-600">{ref.date}</span>
              </div>
              <div className="flex items-center gap-3 mb-1">
                <span className={`text-[9px] font-mono uppercase ${REGIME_COLORS[ref.regime as keyof typeof REGIME_COLORS]?.text || "text-navy-500"}`}>
                  {ref.regime}
                </span>
              </div>
              <p className="text-[10px] text-navy-500 leading-relaxed">{ref.outcome}</p>
            </div>
          );
        })}
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
    intervalRef.current = setInterval(fetchGEX, 15 * 60 * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
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
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-64" />
              <Skeleton className="h-64 col-span-2" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-80" />
              <Skeleton className="h-80" />
            </div>
          </div>
        ) : data ? (
          <div className="space-y-4">

            {/* ── Row 1: Fragility Gauge + Cross-Asset Narrative ── */}
            <div className="grid grid-cols-3 gap-4">
              <FragilityGauge fragility={data.fragility} regime={data.aggregateRegime} />

              <div className="col-span-2 border border-navy-700/40 rounded-lg bg-navy-950/60 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-navy-500" />
                    <span className="text-[10px] font-mono uppercase tracking-widest text-navy-500">
                      Cross-Asset Regime
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

            {/* ── Row 2: Ticker Selector + Detail ── */}
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

            {selectedSummary && (
              <>
                {/* ── Row 3: Key Levels + Trigger Cascade + Gamma Profile ── */}
                <div className="grid grid-cols-3 gap-4">
                  <KeyLevelsLadder summary={selectedSummary} />
                  <TriggerCascade triggers={selectedSummary.triggerLevels} />
                  <GammaProfile summary={selectedSummary} />
                </div>

                {/* ── Row 4: Scenario Modeler + Flow Divergence ── */}
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

                {/* ── Row 5: Signal Convergence + Historical Context ── */}
                <div className="grid grid-cols-2 gap-4">
                  <SignalConvergencePanel
                    signals={data.activeSignals}
                    regime={data.aggregateRegime}
                  />
                  <HistoricalContext
                    regime={data.aggregateRegime}
                  />
                </div>
              </>
            )}

            {/* ── Methodology ── */}
            <div className="border-t border-navy-800 pt-4 mt-2">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-3 w-3 text-navy-600" />
                <span className="text-[9px] font-mono uppercase tracking-widest text-navy-600">
                  Methodology
                </span>
              </div>
              <p className="text-[10px] text-navy-600 leading-relaxed max-w-3xl">
                GEX computed from options chain gamma and open interest per strike. Net GEX = (call gamma x call OI) - (put gamma x put OI) x 100 x spot.
                Positive net gamma implies dealer hedging suppresses moves (dampening). Negative implies amplification.
                Trigger levels derived from cumulative gamma inflection points and OI concentration.
                Fragility score combines GEX regime, active signal intensity, OPEX proximity, and flow divergence.
                Scenario modeler re-estimates gamma at shifted spot levels using exponential proximity decay.
                When live options data is unavailable, synthetic estimation uses VIX and put/call ratio as proxies (lower confidence).
              </p>
            </div>
          </div>
        ) : null}
      </UpgradeGate>
    </PageContainer>
  );
}
