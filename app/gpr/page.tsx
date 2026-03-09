"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { UpgradeGate } from "@/components/subscription/upgrade-gate";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from "lucide-react";

// ── Types ──

interface GPRReading {
  date: string;
  composite: number;
  threats: number;
  acts: number;
  threatsToActsRatio: number;
}

interface RegionalGPR {
  region: string;
  score: number;
  trend: "rising" | "falling" | "stable";
  topEvents: string[];
  assetExposure: string[];
}

interface ThresholdCrossing {
  date: string;
  level: "elevated" | "crisis" | "extreme";
  value: number;
  direction: "crossed_above" | "crossed_below";
}

interface GPRSnapshot {
  current: GPRReading;
  history: GPRReading[];
  regional: RegionalGPR[];
  thresholdCrossings: ThresholdCrossing[];
  lastUpdated: string;
}

// ── Classification helpers ──

function classifyRatio(ratio: number): { label: string; color: string } {
  if (ratio > 2) return { label: "HIGH TENSION", color: "text-accent-rose" };
  if (ratio > 1.3) return { label: "TENSION BUILDING", color: "text-accent-amber" };
  if (ratio > 0.7) return { label: "EQUILIBRIUM", color: "text-accent-cyan" };
  return { label: "DE-ESCALATION", color: "text-accent-emerald" };
}

function classifyLevel(value: number): { label: string; color: string } {
  if (value >= 300) return { label: "EXTREME", color: "text-accent-rose" };
  if (value >= 200) return { label: "CRISIS", color: "text-accent-amber" };
  if (value >= 150) return { label: "ELEVATED", color: "text-accent-cyan" };
  if (value >= 100) return { label: "MODERATE", color: "text-navy-300" };
  return { label: "BASELINE", color: "text-accent-emerald" };
}

function levelColor(value: number): string {
  if (value >= 300) return "#f43f5e";
  if (value >= 200) return "#f59e0b";
  if (value >= 150) return "#06b6d4";
  if (value >= 100) return "#94a3b8";
  return "#10b981";
}

function thresholdColor(level: string): string {
  if (level === "extreme") return "#f43f5e";
  if (level === "crisis") return "#f59e0b";
  return "#06b6d4";
}

// ── Asset impact mapping ──
// What historically moves when GPR is elevated. Based on Caldara-Iacoviello research.

const ASSET_IMPACT = [
  { asset: "Crude Oil", ticker: "CL", direction: "long", sensitivity: "high", note: "Supply disruption premium. GPR spikes historically +3-8% within 5 days." },
  { asset: "Gold", ticker: "GC", direction: "long", sensitivity: "high", note: "Flight-to-safety bid. Strongest correlation above GPR 200." },
  { asset: "VIX", ticker: "VIX", direction: "long", sensitivity: "high", note: "Vol expansion. GPR above 150 correlates with VIX >20." },
  { asset: "US Treasuries", ticker: "TLT", direction: "long", sensitivity: "medium", note: "Duration bid on risk-off. 10Y yields typically compress 10-30bps." },
  { asset: "Defense", ticker: "ITA", direction: "long", sensitivity: "medium", note: "Sector rotation into defense names. Persistent over weeks." },
  { asset: "S&P 500", ticker: "SPX", direction: "short", sensitivity: "medium", note: "Equity drawdown risk. GPR spikes historically -1-3% within 10 days." },
  { asset: "EM FX", ticker: "EEM", direction: "short", sensitivity: "high", note: "EM currencies weaken on risk-off. Dollar strengthens." },
  { asset: "Semiconductors", ticker: "SOXX", direction: "short", sensitivity: "high", note: "Taiwan risk premium. Acute sensitivity to East Asia GPR." },
];

function getActiveImpacts(level: string) {
  if (level === "BASELINE") return [];
  if (level === "MODERATE") return ASSET_IMPACT.filter(a => a.sensitivity === "high");
  return ASSET_IMPACT; // ELEVATED, CRISIS, EXTREME show all
}

// ── Volatility regime mapping ──

function volRegime(composite: number): { regime: string; vixRange: string; description: string; color: string } {
  if (composite >= 300) return { regime: "EXTREME VOL", vixRange: "35+", description: "Hedging imperative. Tail risk pricing active. Reduce gross exposure.", color: "#f43f5e" };
  if (composite >= 200) return { regime: "HIGH VOL", vixRange: "25-35", description: "Elevated risk premiums. Options skew widening. Defensive positioning warranted.", color: "#f59e0b" };
  if (composite >= 150) return { regime: "ELEVATED VOL", vixRange: "18-25", description: "Above-average uncertainty. Selective hedging on concentrated positions.", color: "#06b6d4" };
  if (composite >= 100) return { regime: "NORMAL VOL", vixRange: "14-18", description: "Standard risk environment. No geopolitical premium required.", color: "#94a3b8" };
  return { regime: "LOW VOL", vixRange: "10-14", description: "Complacency zone. Geopolitical tail risk underpriced.", color: "#10b981" };
}

// ── Mini Sparkline (SVG) ──

function Sparkline({ data, color, height = 28, width = 80 }: { data: number[]; color: string; height?: number; width?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.7}
      />
    </svg>
  );
}

// ── Delta badge ──

function DeltaBadge({ current, previous, suffix = "" }: { current: number; previous: number; suffix?: string }) {
  const delta = current - previous;
  const pct = previous > 0 ? (delta / previous) * 100 : 0;
  const isUp = delta > 0;
  const isFlat = Math.abs(pct) < 0.5;
  return (
    <span className={`inline-flex items-center gap-0.5 font-mono text-[10px] tabular-nums ${isFlat ? "text-navy-500" : isUp ? "text-accent-rose" : "text-accent-emerald"}`}>
      {isFlat ? (
        <Minus className="h-2.5 w-2.5" />
      ) : isUp ? (
        <ArrowUpRight className="h-2.5 w-2.5" />
      ) : (
        <ArrowDownRight className="h-2.5 w-2.5" />
      )}
      {isFlat ? "flat" : `${isUp ? "+" : ""}${pct.toFixed(1)}%${suffix}`}
    </span>
  );
}

// ── Custom Tooltip ──

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-navy-950/95 border border-navy-700/50 rounded px-3 py-2 shadow-lg">
      <div className="font-mono text-[10px] text-navy-400 mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="font-mono text-[10px] text-navy-400 uppercase">{p.dataKey}</span>
          <span className="font-mono text-[11px] text-navy-200 tabular-nums ml-auto">{p.value?.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

function RatioTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  const info = classifyRatio(val);
  return (
    <div className="bg-navy-950/95 border border-navy-700/50 rounded px-3 py-2 shadow-lg">
      <div className="font-mono text-[10px] text-navy-400 mb-1">{label}</div>
      <div className="font-mono text-[11px] text-navy-200 tabular-nums">{val?.toFixed(2)}</div>
      <div className={`font-mono text-[9px] uppercase ${info.color}`}>{info.label}</div>
    </div>
  );
}

// ── Main Page ──

export default function GPRPage() {
  const [data, setData] = useState<GPRSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTable, setShowTable] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/gpr");
      if (!res.ok) throw new Error("Failed to fetch GPR data");
      const snapshot: GPRSnapshot = await res.json();
      setData(snapshot);
    } catch (err) {
      console.error("[GPR] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute derived data
  const derived = useMemo(() => {
    if (!data) return null;
    const { current, history } = data;

    // Chart data (chronological)
    const chartData = [...history].reverse().map((r) => ({
      date: r.date.slice(5), // MM-DD
      fullDate: r.date,
      composite: r.composite,
      threats: r.threats,
      acts: r.acts,
      ratio: r.threatsToActsRatio,
    }));

    // Deltas
    const h = history;
    const d7 = h.length >= 7 ? h[6] : h[h.length - 1];
    const d30 = h[h.length - 1];

    // Sparkline arrays (chronological)
    const compositeSparkline = [...h].reverse().map((r) => r.composite);
    const threatsSparkline = [...h].reverse().map((r) => r.threats);
    const actsSparkline = [...h].reverse().map((r) => r.acts);

    // 30d stats
    const composites = h.map((r) => r.composite);
    const avg30 = composites.reduce((a, b) => a + b, 0) / composites.length;
    const max30 = Math.max(...composites);
    const min30 = Math.min(...composites);

    const level = classifyLevel(current.composite);
    const ratioInfo = classifyRatio(current.threatsToActsRatio);
    const vol = volRegime(current.composite);
    const activeImpacts = getActiveImpacts(level.label);

    return {
      chartData,
      d7,
      d30,
      compositeSparkline,
      threatsSparkline,
      actsSparkline,
      avg30,
      max30,
      min30,
      level,
      ratioInfo,
      vol,
      activeImpacts,
    };
  }, [data]);

  if (loading) {
    return (
      <PageContainer title="GPR Index" subtitle="Geopolitical Risk Decomposition">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-72" />
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      </PageContainer>
    );
  }

  if (!data || !derived) {
    return (
      <PageContainer title="GPR Index" subtitle="Geopolitical Risk Decomposition">
        <div className="border border-navy-800/60 rounded bg-navy-950/80 p-6">
          <p className="text-sm text-navy-400 font-mono">No GPR data available.</p>
        </div>
      </PageContainer>
    );
  }

  const { current, history, regional, thresholdCrossings } = data;
  const { chartData, d7, d30, compositeSparkline, threatsSparkline, actsSparkline, avg30, max30, min30, level, ratioInfo, vol, activeImpacts } = derived;

  return (
    <PageContainer title="GPR Index" subtitle="Threats vs Acts Decomposition // Caldara-Iacoviello">
      <UpgradeGate minTier="operator" feature="Geopolitical risk decomposition" blur>

      {/* ── Row 1: Header Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        {/* Composite */}
        <div className="border border-navy-800/60 rounded bg-navy-950/80 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600">Composite GPR</span>
            <Sparkline data={compositeSparkline} color={levelColor(current.composite)} />
          </div>
          <div className="flex items-baseline gap-3">
            <span className="font-mono font-light text-3xl text-navy-200 tabular-nums">
              {current.composite.toFixed(1)}
            </span>
            <span className={`font-mono text-[10px] uppercase tracking-wider ${level.color}`}>
              {level.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <DeltaBadge current={current.composite} previous={d7.composite} suffix=" 7d" />
            <DeltaBadge current={current.composite} previous={d30.composite} suffix=" 30d" />
          </div>
        </div>

        {/* Threats */}
        <div className="border border-navy-800/60 rounded bg-navy-950/80 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600">Threats Index</span>
            <Sparkline data={threatsSparkline} color="#f59e0b" />
          </div>
          <div className="font-mono font-light text-3xl text-navy-200 tabular-nums">
            {current.threats.toFixed(1)}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <DeltaBadge current={current.threats} previous={d7.threats} suffix=" 7d" />
            <span className="text-[9px] font-mono text-navy-600">Rhetoric, posturing, declarations</span>
          </div>
        </div>

        {/* Acts */}
        <div className="border border-navy-800/60 rounded bg-navy-950/80 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600">Acts Index</span>
            <Sparkline data={actsSparkline} color="#f43f5e" />
          </div>
          <div className="font-mono font-light text-3xl text-navy-200 tabular-nums">
            {current.acts.toFixed(1)}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <DeltaBadge current={current.acts} previous={d7.acts} suffix=" 7d" />
            <span className="text-[9px] font-mono text-navy-600">Realized events, military action</span>
          </div>
        </div>

        {/* T/A Ratio */}
        <div className="border border-navy-800/60 rounded bg-navy-950/80 p-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-navy-600 mb-2">
            Threats / Acts Ratio
          </div>
          <div className="flex items-baseline gap-3">
            <span className="font-mono font-light text-3xl text-navy-200 tabular-nums">
              {current.threatsToActsRatio.toFixed(2)}
            </span>
            <span className={`font-mono text-[10px] uppercase tracking-wider ${ratioInfo.color}`}>
              {ratioInfo.label}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[9px] font-mono text-navy-600">
            <span>&gt;2.0 divergence</span>
            <span className="text-navy-800">|</span>
            <span>&lt;0.7 de-escalation</span>
          </div>
        </div>
      </div>

      {/* ── Row 2: 30d Stats Bar ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {[
          { label: "30d Average", value: avg30.toFixed(1) },
          { label: "30d High", value: max30.toFixed(1) },
          { label: "30d Low", value: min30.toFixed(1) },
          { label: "Range", value: `${(max30 - min30).toFixed(1)}` },
          { label: "Crossings", value: String(thresholdCrossings.length) },
        ].map((s) => (
          <div key={s.label} className="border border-navy-800/40 rounded bg-navy-950/60 px-3 py-2.5">
            <div className="text-[9px] font-mono uppercase tracking-widest text-navy-600">{s.label}</div>
            <div className="font-mono text-sm text-navy-300 tabular-nums mt-0.5">{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Row 3: Main Composite Chart ── */}
      <div className="border border-navy-800/60 rounded bg-navy-950/80 p-4 mb-4">
        <div className="text-[10px] font-mono uppercase tracking-widest text-navy-600 mb-4">
          GPR Composite, Threats, Acts // 30-Day Trend
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gprComposite" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={levelColor(current.composite)} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={levelColor(current.composite)} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gprThreats" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.08} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              {/* Threshold zone bands */}
              <ReferenceArea y1={150} y2={200} fill="#06b6d4" fillOpacity={0.03} />
              <ReferenceArea y1={200} y2={300} fill="#f59e0b" fillOpacity={0.03} />
              <ReferenceArea y1={300} y2={500} fill="#f43f5e" fillOpacity={0.03} />
              <ReferenceLine y={150} stroke="#06b6d4" strokeDasharray="3 3" strokeOpacity={0.3} />
              <ReferenceLine y={200} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.3} />
              <ReferenceLine y={300} stroke="#f43f5e" strokeDasharray="3 3" strokeOpacity={0.3} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#4a4a6a", fontFamily: "IBM Plex Mono" }}
                tickLine={false}
                axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#4a4a6a", fontFamily: "IBM Plex Mono" }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="composite"
                stroke={levelColor(current.composite)}
                strokeWidth={2}
                fill="url(#gprComposite)"
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="threats"
                stroke="#f59e0b"
                strokeWidth={1}
                strokeDasharray="4 2"
                fill="url(#gprThreats)"
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="acts"
                stroke="#f43f5e"
                strokeWidth={1}
                strokeDasharray="4 2"
                fill="none"
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-3 text-[9px] font-mono text-navy-600">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded" style={{ backgroundColor: levelColor(current.composite) }} />
            Composite
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded bg-amber-500" style={{ opacity: 0.7 }} />
            Threats
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded bg-rose-500" style={{ opacity: 0.7 }} />
            Acts
          </span>
          <span className="ml-auto text-navy-700">Bands: Elevated 150 / Crisis 200 / Extreme 300</span>
        </div>
      </div>

      {/* ── Row 4: T/A Ratio Trend + Vol Regime ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {/* Ratio trend chart */}
        <div className="md:col-span-2 border border-navy-800/60 rounded bg-navy-950/80 p-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-navy-600 mb-4">
            Threats-to-Acts Ratio // Escalation Signal
          </div>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                {/* Equilibrium band */}
                <ReferenceArea y1={0.7} y2={1.3} fill="#06b6d4" fillOpacity={0.04} />
                <ReferenceLine y={1.0} stroke="#06b6d4" strokeDasharray="3 3" strokeOpacity={0.25} label={{ value: "EQ", position: "right", fill: "#3a3a5a", fontSize: 9, fontFamily: "IBM Plex Mono" }} />
                <ReferenceLine y={2.0} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#4a4a6a", fontFamily: "IBM Plex Mono" }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#4a4a6a", fontFamily: "IBM Plex Mono" }}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                  domain={[0, "auto"]}
                />
                <Tooltip content={<RatioTooltip />} />
                <Line
                  type="monotone"
                  dataKey="ratio"
                  stroke="#06b6d4"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3, strokeWidth: 0, fill: "#06b6d4" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-2 text-[9px] font-mono text-navy-700">
            <span>Shaded: equilibrium band (0.7-1.3)</span>
            <span>Above 2.0: high divergence, rhetoric outpacing action</span>
          </div>
        </div>

        {/* Volatility regime card */}
        <div className="border border-navy-800/60 rounded bg-navy-950/80 p-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-navy-600 mb-3">
            Implied Vol Regime
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-mono text-lg font-light tabular-nums" style={{ color: vol.color }}>
              {vol.regime}
            </span>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-[9px] font-mono uppercase text-navy-600 mb-0.5">Expected VIX Range</div>
              <div className="font-mono text-sm text-navy-300 tabular-nums">{vol.vixRange}</div>
            </div>
            <div className="text-[11px] text-navy-400 leading-relaxed">
              {vol.description}
            </div>
            {/* GPR-to-VIX mapping bar */}
            <div className="mt-2">
              <div className="flex text-[8px] font-mono text-navy-700 justify-between mb-1">
                <span>0</span>
                <span>100</span>
                <span>150</span>
                <span>200</span>
                <span>300+</span>
              </div>
              <div className="h-1.5 rounded-full bg-navy-900 relative overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min((current.composite / 300) * 100, 100)}%`,
                    background: `linear-gradient(90deg, #10b981, #06b6d4, #f59e0b, #f43f5e)`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 5: Asset Impact Matrix ── */}
      {activeImpacts.length > 0 && (
        <div className="border border-navy-800/60 rounded bg-navy-950/80 p-4 mb-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-navy-600 mb-3">
            Asset Impact Matrix // GPR at {level.label}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0">
            {activeImpacts.map((a) => (
              <div key={a.ticker} className="flex items-start gap-3 py-2.5 border-b border-navy-800/20 last:border-0">
                <div className={`mt-0.5 px-1.5 py-0.5 rounded font-mono text-[9px] uppercase tracking-wider ${a.direction === "long" ? "bg-emerald-500/10 text-accent-emerald" : "bg-rose-500/10 text-accent-rose"}`}>
                  {a.direction}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-xs text-navy-200">{a.asset}</span>
                    <span className="font-mono text-[10px] text-navy-600">{a.ticker}</span>
                    <span className={`font-mono text-[9px] uppercase ${a.sensitivity === "high" ? "text-accent-amber" : "text-navy-500"}`}>
                      {a.sensitivity}
                    </span>
                  </div>
                  <div className="text-[10px] text-navy-500 mt-0.5 leading-relaxed">{a.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Row 6: Regional GPR ── */}
      <div className="mb-4">
        <div className="text-[10px] font-mono uppercase tracking-widest text-navy-600 mb-3">
          Regional Risk Proxies // GDELT-Sourced
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {regional.map((r) => {
            const riskPct = Math.min(r.score / 200, 1) * 100;
            const barColor = r.score >= 150 ? "#f43f5e" : r.score >= 100 ? "#f59e0b" : r.score >= 50 ? "#06b6d4" : "#10b981";
            return (
              <div key={r.region} className="border border-navy-800/60 rounded bg-navy-950/80 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs text-navy-300 uppercase tracking-wider">
                    {r.region}
                  </span>
                  <span className="flex items-center gap-1">
                    {r.trend === "rising" ? (
                      <TrendingUp className="h-3 w-3 text-accent-rose" />
                    ) : r.trend === "falling" ? (
                      <TrendingDown className="h-3 w-3 text-accent-emerald" />
                    ) : (
                      <Minus className="h-3 w-3 text-navy-500" />
                    )}
                    <span className={`font-mono text-[10px] ${r.trend === "rising" ? "text-accent-rose" : r.trend === "falling" ? "text-accent-emerald" : "text-navy-500"}`}>
                      {r.trend}
                    </span>
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-mono font-light text-2xl tabular-nums" style={{ color: barColor }}>
                    {r.score}
                  </span>
                </div>
                {/* Risk bar */}
                <div className="h-1 rounded-full bg-navy-900 mb-3">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${riskPct}%`, backgroundColor: barColor }}
                  />
                </div>
                {r.topEvents.length > 0 && (
                  <div className="mb-2 space-y-1">
                    {r.topEvents.map((event, i) => (
                      <div key={i} className="text-[10px] text-navy-400 leading-tight truncate">
                        {event}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {r.assetExposure.map((a) => (
                    <span key={a} className="px-1.5 py-0.5 rounded bg-navy-900/60 font-mono text-[9px] text-navy-500 uppercase tracking-wider">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
          {regional.length === 0 && (
            <div className="col-span-full border border-navy-800/60 rounded bg-navy-950/80 p-4">
              <p className="font-mono text-xs text-navy-500">No regional data available</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 7: Threshold Crossings ── */}
      {thresholdCrossings.length > 0 && (
        <div className="border border-navy-800/60 rounded bg-navy-950/80 p-4 mb-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-navy-600 mb-3">
            Threshold Crossings
          </div>
          <div className="space-y-0">
            {thresholdCrossings.map((tc, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-navy-800/15 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-navy-400 tabular-nums w-20">{tc.date}</span>
                  <span
                    className="px-1.5 py-0.5 rounded font-mono text-[9px] uppercase tracking-wider"
                    style={{
                      backgroundColor: thresholdColor(tc.level) + "15",
                      color: thresholdColor(tc.level),
                    }}
                  >
                    {tc.level}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-navy-200 tabular-nums">{tc.value.toFixed(1)}</span>
                  {tc.direction === "crossed_above" ? (
                    <ArrowUpRight className="h-3 w-3 text-accent-rose" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-accent-emerald" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Row 8: Collapsible Raw Data Table ── */}
      <div className="mb-4">
        <button
          onClick={() => setShowTable(!showTable)}
          className="text-[10px] font-mono uppercase tracking-widest text-navy-600 hover:text-navy-400 transition-colors mb-2 flex items-center gap-1"
        >
          {showTable ? "Hide" : "Show"} Raw Data Table
          <span className="text-[8px]">{showTable ? "▲" : "▼"}</span>
        </button>
        {showTable && (
          <div className="border border-navy-800/60 rounded bg-navy-950/80 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-navy-800/40">
                  {["Date", "Composite", "Threats", "Acts", "T/A Ratio"].map((h) => (
                    <th key={h} className={`text-[10px] font-mono uppercase tracking-wider text-navy-600 px-4 py-2 ${h === "Date" ? "text-left" : "text-right"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((r, i) => (
                  <tr key={r.date + i} className="border-b border-navy-800/15 last:border-0">
                    <td className="px-4 py-1.5 font-mono text-xs text-navy-400 tabular-nums">{r.date}</td>
                    <td className="px-4 py-1.5 font-mono text-xs tabular-nums text-right" style={{ color: levelColor(r.composite) }}>
                      {r.composite.toFixed(1)}
                    </td>
                    <td className="px-4 py-1.5 font-mono text-xs text-navy-300 tabular-nums text-right">{r.threats.toFixed(1)}</td>
                    <td className="px-4 py-1.5 font-mono text-xs text-navy-300 tabular-nums text-right">{r.acts.toFixed(1)}</td>
                    <td className="px-4 py-1.5 font-mono text-xs text-navy-400 tabular-nums text-right">{r.threatsToActsRatio.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="text-[10px] font-mono text-navy-700 mt-2">
        Last updated: {new Date(data.lastUpdated).toLocaleString()} // Source: Caldara-Iacoviello GPR Index + GDELT
      </div>

      </UpgradeGate>
    </PageContainer>
  );
}
