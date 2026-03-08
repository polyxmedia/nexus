"use client";

import { useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { X, ArrowRight, FileText, Clock, AlertTriangle, CheckCircle2, XCircle, Target, Shield, Sun, Moon } from "lucide-react";
import { Metric } from "@/components/ui/metric";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusDot } from "@/components/ui/status-dot";
import { IntensityIndicator } from "@/components/ui/badge";
import { Markdown } from "@/components/ui/markdown";

const CandlestickChart = dynamic(() => import("@/components/charts/candlestick-chart"), { ssr: false });

// ── Types ──

interface WidgetProps {
  widget: {
    id: number;
    widgetType: string;
    title: string;
    config: string;
    width: number;
    enabled: number;
  };
  onRemove: (id: number) => void;
}

// ── Widget Shell ──

function WidgetShell({ title, onRemove, children }: { title: string; onRemove: () => void; children: ReactNode }) {
  return (
    <div className="border border-navy-700/30 rounded-md bg-navy-900/60 flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-navy-700/20">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-navy-500">{title}</h3>
        <button
          onClick={onRemove}
          className="text-navy-600 hover:text-navy-300 transition-colors p-0.5 rounded hover:bg-navy-800/60"
          aria-label="Remove widget"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="p-3 flex-1 min-h-0">{children}</div>
    </div>
  );
}

function WidgetSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full rounded" />
      ))}
    </div>
  );
}

function WidgetError({ message }: { message?: string }) {
  return <p className="text-xs text-navy-500">{message || "N/A"}</p>;
}

// ── Metric Widget ──

function MetricWidget({ config }: { config: { metric: string } }) {
  const [data, setData] = useState<{ label: string; value: string | number; change?: string; changeColor?: "green" | "red" | "neutral" } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        switch (config.metric) {
          case "threat_level": {
            const res = await fetch("/api/warroom").then((r) => r.json());
            const m = res?.metrics;
            setData({
              label: "Threat Level",
              value: m ? `${m.maxEscalation}/5` : "N/A",
              change: m?.volatilityOutlook || "",
              changeColor: m?.maxEscalation >= 4 ? "red" : m?.maxEscalation >= 3 ? "neutral" : "green",
            });
            break;
          }
          case "market_regime": {
            const res = await fetch("/api/warroom").then((r) => r.json());
            const m = res?.metrics;
            setData({
              label: "Market Regime",
              value: m?.marketRegime?.replace("_", " ") || "N/A",
              change: m ? `${m.activeSignalCount} active` : "",
              changeColor: "neutral",
            });
            break;
          }
          case "portfolio_value": {
            const res = await fetch("/api/trading212/account").then((r) => r.json());
            const cash = res?.cash;
            const info = res?.info;
            const currency = info?.currencyCode || "GBP";
            const pnl = cash?.result ?? null;
            const invested = cash?.invested ?? null;
            const pnlPct = invested && pnl ? (pnl / invested) * 100 : null;
            setData({
              label: "Portfolio",
              value: cash?.total != null ? `${currency} ${cash.total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "N/A",
              change: pnl != null ? `${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}${pnlPct != null ? ` (${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(1)}%)` : ""}` : "",
              changeColor: pnl != null ? (pnl >= 0 ? "green" : "red") : "neutral",
            });
            break;
          }
          case "thesis_confidence": {
            const res = await fetch("/api/thesis?status=active").then((r) => r.json());
            const thesis = res?.theses?.[0];
            setData({
              label: "Thesis Confidence",
              value: thesis ? `${(thesis.overallConfidence * 100).toFixed(0)}%` : "N/A",
              change: thesis?.volatilityOutlook || "no thesis",
              changeColor: thesis && thesis.overallConfidence >= 0.7 ? "green" : "neutral",
            });
            break;
          }
          case "prediction_accuracy": {
            const res = await fetch("/api/predictions").then((r) => r.json());
            const preds = Array.isArray(res) ? res : res.predictions || [];
            const resolved = preds.filter((p: { outcome: string | null }) => p.outcome);
            const confirmed = resolved.filter((p: { outcome: string }) => p.outcome === "confirmed").length;
            const avg = resolved.length > 0 ? resolved.reduce((s: number, p: { score: number | null }) => s + (p.score || 0), 0) / resolved.length : 0;
            setData({
              label: "Accuracy",
              value: resolved.length > 0 ? `${(avg * 100).toFixed(0)}%` : "N/A",
              change: resolved.length > 0 ? `${confirmed}/${resolved.length} confirmed` : "no data",
              changeColor: avg >= 0.6 ? "green" : avg > 0 ? "red" : "neutral",
            });
            break;
          }
          case "convergence_density": {
            const res = await fetch("/api/warroom").then((r) => r.json());
            const m = res?.metrics;
            setData({
              label: "Convergence",
              value: m?.convergenceDensity != null ? `${m.convergenceDensity.toFixed(1)}/10` : "N/A",
              change: m ? `${m.highIntensityCount} high intensity` : "",
              changeColor: m?.convergenceDensity >= 7 ? "red" : m?.convergenceDensity >= 4 ? "neutral" : "green",
            });
            break;
          }
          case "vix": {
            const res = await fetch("/api/macro").then((r) => r.json());
            const vixSeries = res?.VIXCLS;
            const vixVal = vixSeries?.latest?.value ?? null;
            const prevVal = vixSeries?.previous?.value ?? null;
            const changeStr = vixVal != null && prevVal != null
              ? `${vixVal > prevVal ? "+" : ""}${(vixVal - prevVal).toFixed(2)} (${vixVal >= 30 ? "extreme fear" : vixVal >= 20 ? "elevated" : vixVal >= 15 ? "normal" : "complacent"})`
              : vixVal != null
              ? (vixVal >= 30 ? "extreme fear" : vixVal >= 20 ? "elevated" : vixVal >= 15 ? "normal" : "complacent")
              : "";
            setData({
              label: "VIX",
              value: vixVal != null ? vixVal.toFixed(2) : "N/A",
              change: changeStr,
              changeColor: vixVal != null ? (vixVal >= 30 ? "red" : vixVal >= 20 ? "neutral" : "green") : "neutral",
            });
            break;
          }
          default:
            setData({ label: config.metric, value: "N/A" });
        }
      } catch {
        setData({ label: config.metric, value: "N/A", change: "fetch error", changeColor: "red" });
      }
      setLoading(false);
    }
    load();
  }, [config.metric]);

  if (loading) return <WidgetSkeleton lines={2} />;
  if (!data) return <WidgetError />;

  return <Metric label={data.label} value={data.value} change={data.change} changeColor={data.changeColor} />;
}

// ── Thesis Widget ──

interface ThesisSummary {
  id: number;
  marketRegime: string;
  convergenceDensity: number;
  overallConfidence: number;
  executiveSummary: string;
}

function ThesisWidget() {
  const [thesis, setThesis] = useState<ThesisSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/thesis?status=active")
      .then((r) => r.json())
      .then((d) => {
        const t = d?.theses?.[0] || null;
        setThesis(t);
      })
      .catch(() => setThesis(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <WidgetSkeleton lines={4} />;
  if (!thesis) {
    return (
      <div className="text-center py-4">
        <FileText className="h-6 w-6 text-navy-700 mx-auto mb-2" />
        <p className="text-xs text-navy-500 mb-1">No active thesis</p>
        <Link href="/thesis" className="text-xs text-navy-400 hover:text-navy-200 transition-colors">
          Generate one
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <StatusDot
          color={thesis.marketRegime === "risk_off" ? "red" : thesis.marketRegime === "risk_on" ? "green" : "amber"}
          label={thesis.marketRegime.replace("_", " ")}
        />
        <span className="text-[10px] text-navy-500">
          Convergence {thesis.convergenceDensity.toFixed(1)}/10
        </span>
      </div>
      <div className="font-sans text-sm text-navy-300 leading-relaxed mb-3 max-h-48 overflow-y-auto">
        <Markdown>{thesis.executiveSummary}</Markdown>
      </div>
      <Link
        href={`/thesis/${thesis.id}`}
        className="flex items-center gap-1 text-[10px] text-navy-500 hover:text-navy-300 transition-colors"
      >
        Full Briefing <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ── Predictions Widget ──

interface Prediction {
  id: number;
  outcome: string | null;
  deadline: string;
  score: number | null;
}

function PredictionsWidget() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/predictions")
      .then((r) => r.json())
      .then((d) => setPredictions(Array.isArray(d) ? d : d.predictions || []))
      .catch(() => setPredictions([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <WidgetSkeleton lines={5} />;

  const pending = predictions.filter((p) => !p.outcome);
  const resolved = predictions.filter((p) => p.outcome);
  const today = new Date().toISOString().split("T")[0];
  const overdue = pending.filter((p) => p.deadline <= today);
  const confirmed = resolved.filter((p) => p.outcome === "confirmed").length;
  const denied = resolved.filter((p) => p.outcome === "denied").length;
  const partial = resolved.filter((p) => p.outcome === "partial").length;
  const avg = resolved.length > 0 ? resolved.reduce((s, p) => s + (p.score || 0), 0) / resolved.length : 0;

  const rows: { icon: ReactNode; label: string; value: string | number; color?: string; separator?: boolean }[] = [
    { icon: <Clock className="h-3.5 w-3.5 text-accent-cyan" />, label: "Pending", value: pending.length },
    { icon: <AlertTriangle className="h-3.5 w-3.5 text-accent-rose" />, label: "Overdue", value: overdue.length, color: overdue.length > 0 ? "text-accent-rose" : "text-navy-400" },
    { icon: null, label: "", value: "", separator: true },
    { icon: <CheckCircle2 className="h-3.5 w-3.5 text-accent-emerald" />, label: "Confirmed", value: confirmed, color: "text-accent-emerald" },
    { icon: <XCircle className="h-3.5 w-3.5 text-navy-500" />, label: "Denied", value: denied, color: "text-navy-400" },
    { icon: <Target className="h-3.5 w-3.5 text-accent-amber" />, label: "Partial", value: partial, color: "text-accent-amber" },
    { icon: null, label: "", value: "", separator: true },
    { icon: <Shield className="h-3.5 w-3.5 text-navy-400" />, label: "Avg Score", value: resolved.length > 0 ? `${(avg * 100).toFixed(0)}%` : "N/A", color: avg >= 0.6 ? "text-accent-emerald" : avg > 0 ? "text-accent-amber" : "text-navy-400" },
  ];

  return (
    <div className="space-y-2.5">
      {rows.map((row, i) =>
        row.separator ? (
          <div key={i} className="border-t border-navy-700/30" />
        ) : (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {row.icon}
              <span className="text-xs text-navy-300">{row.label}</span>
            </div>
            <span className={`text-sm font-bold font-mono ${row.color || "text-navy-100"}`}>{row.value}</span>
          </div>
        )
      )}
      <div className="pt-1">
        <Link href="/predictions" className="flex items-center gap-1 text-[10px] text-navy-500 hover:text-navy-300 transition-colors">
          View All <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

// ── Signals Widget ──

interface Signal {
  id: number;
  title: string;
  date: string;
  intensity: number;
  status: string;
}

function SignalsWidget({ config }: { config: { minIntensity?: number } }) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/signals")
      .then((r) => r.json())
      .then((d) => {
        const all: Signal[] = Array.isArray(d) ? d : d.signals || [];
        const min = config.minIntensity ?? 1;
        setSignals(all.filter((s) => s.intensity >= min && (s.status === "active" || s.status === "upcoming")).slice(0, 12));
      })
      .catch(() => setSignals([]))
      .finally(() => setLoading(false));
  }, [config.minIntensity]);

  if (loading) return <WidgetSkeleton lines={4} />;
  if (signals.length === 0) return <WidgetError message="No matching signals" />;

  return (
    <div className="space-y-1.5 max-h-60 overflow-y-auto">
      {signals.map((s) => (
        <Link
          key={s.id}
          href={`/signals/${s.id}`}
          className="flex items-center gap-2 py-1 px-1 rounded hover:bg-navy-800/40 transition-colors group"
        >
          <IntensityIndicator intensity={s.intensity} />
          <span className="text-xs text-navy-300 group-hover:text-navy-100 flex-1 truncate">{s.title}</span>
          <span className="text-[10px] text-navy-500 font-mono shrink-0">
            {new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </Link>
      ))}
      <div className="pt-1">
        <Link href="/signals" className="flex items-center gap-1 text-[10px] text-navy-500 hover:text-navy-300 transition-colors">
          All Signals <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

// ── Chart Widget ──

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

function ChartWidget({ config }: { config: { symbol?: string; range?: string } }) {
  const [data, setData] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const symbol = config.symbol || "SPY";
  const range = config.range || "3m";

  useEffect(() => {
    fetch(`/api/markets/chart?symbol=${symbol}&period=${range === "3m" ? "3mo" : range === "1y" ? "1y" : "6mo"}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(true); return; }
        const raw = d?.bars || [];
        const candles = Array.isArray(raw)
          ? raw.map((bar: { time?: string; date?: string; open: number; high: number; low: number; close: number; volume?: number }) => ({
              time: bar.time || bar.date || "",
              open: bar.open,
              high: bar.high,
              low: bar.low,
              close: bar.close,
              volume: bar.volume,
            }))
          : [];
        setData(candles);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [symbol, range]);

  if (loading) return <Skeleton className="h-48 w-full rounded" />;
  if (error || data.length === 0) return <WidgetError message={`No chart data for ${symbol}`} />;

  return (
    <div className="h-48">
      <CandlestickChart data={data} symbol={symbol} height={180} showVolume={false} />
    </div>
  );
}

// ── News Widget ──

function NewsWidget({ config }: { config: { category?: string; maxItems?: number } }) {
  const [NewsComponent, setNewsComponent] = useState<React.ComponentType<{ category?: string; maxItems?: number }> | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    import("@/components/dashboard/news-widget")
      .then((mod) => setNewsComponent(() => (mod as { NewsWidget: React.ComponentType<{ category?: string; maxItems?: number }> }).NewsWidget))
      .catch(() => setFallback(true));
  }, []);

  if (fallback) return <WidgetError message="News widget not available" />;
  if (!NewsComponent) return <WidgetSkeleton lines={4} />;

  return <NewsComponent category={config.category} maxItems={config.maxItems} />;
}

// ── Macro Widget ──

interface MacroItem {
  id: string;
  name: string;
  value: number | null;
  unit?: string;
  change?: number | null;
  changePercent?: number | null;
}

interface YieldPoint {
  maturity: string;
  rate: number | null;
}

function MacroWidget({ config }: { config: { series?: string[]; view?: string } }) {
  const [items, setItems] = useState<MacroItem[]>([]);
  const [yieldCurve, setYieldCurve] = useState<YieldPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const isYieldCurve = config.view === "yield_curve";

  useEffect(() => {
    if (isYieldCurve) {
      // Fetch yield curve data from individual treasury series
      fetch("/api/macro")
        .then((r) => r.json())
        .then((snapshot) => {
          const maturities = [
            { key: "DGS2", label: "2Y" },
            { key: "DGS10", label: "10Y" },
            { key: "DGS30", label: "30Y" },
            { key: "T10Y2Y", label: "10Y-2Y" },
          ];
          const points: YieldPoint[] = maturities.map((m) => ({
            maturity: m.label,
            rate: snapshot?.[m.key]?.latest?.value ?? null,
          }));
          setYieldCurve(points);
        })
        .catch(() => setYieldCurve([]))
        .finally(() => setLoading(false));
    } else {
      // Fetch specific series from macro snapshot
      const seriesIds = config.series || [];
      fetch("/api/macro")
        .then((r) => r.json())
        .then((snapshot) => {
          if (!snapshot || typeof snapshot !== "object") {
            setItems([]);
            return;
          }
          const keys = seriesIds.length > 0 ? seriesIds : Object.keys(snapshot);
          const parsed: MacroItem[] = keys
            .filter((k) => snapshot[k] && snapshot[k].latest)
            .map((k) => {
              const s = snapshot[k];
              return {
                id: k,
                name: s.name || k,
                value: s.latest?.value ?? null,
                unit: s.unit || "",
                change: s.change ?? null,
                changePercent: s.changePercent ?? null,
              };
            });
          setItems(parsed);
        })
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }
  }, [config.series, config.view, isYieldCurve]);

  if (loading) return <WidgetSkeleton lines={3} />;

  if (isYieldCurve) {
    const validPoints = yieldCurve.filter((p) => p.rate != null);
    if (validPoints.length === 0) return <WidgetError message="No yield curve data" />;

    const maxRate = Math.max(...validPoints.map((p) => p.rate!));
    const minRate = Math.min(...validPoints.map((p) => p.rate!));
    const spread = yieldCurve.find((p) => p.maturity === "10Y-2Y");
    const isInverted = spread?.rate != null && spread.rate < 0;

    return (
      <div className="space-y-3">
        <div className="flex items-end gap-3 h-24">
          {yieldCurve.filter((p) => p.maturity !== "10Y-2Y").map((point) => {
            const rate = point.rate ?? 0;
            const range = maxRate - minRate || 1;
            const height = ((rate - minRate) / range) * 80 + 20;
            return (
              <div key={point.maturity} className="flex flex-col items-center gap-1 flex-1">
                <span className="text-[10px] font-mono text-navy-200 font-bold">{rate.toFixed(2)}%</span>
                <div
                  className="w-full rounded-t bg-accent-cyan/30 transition-all duration-500"
                  style={{ height: `${height}%` }}
                />
                <span className="text-[9px] font-mono text-navy-500">{point.maturity}</span>
              </div>
            );
          })}
        </div>
        {spread?.rate != null && (
          <div className="flex items-center justify-between pt-2 border-t border-navy-700/20">
            <span className="text-[10px] text-navy-400">10Y-2Y Spread</span>
            <span className={`text-xs font-mono font-bold ${isInverted ? "text-accent-rose" : "text-accent-emerald"}`}>
              {spread.rate.toFixed(2)}% {isInverted ? "(inverted)" : ""}
            </span>
          </div>
        )}
      </div>
    );
  }

  if (items.length === 0) return <WidgetError message="No macro data available" />;

  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((s) => {
        const changeStr = s.change != null
          ? `${s.change >= 0 ? "+" : ""}${s.change.toFixed(2)} ${s.unit}`
          : s.unit || undefined;
        const changeColor: "green" | "red" | "neutral" = s.change != null
          ? (s.change > 0 ? "green" : s.change < 0 ? "red" : "neutral")
          : "neutral";
        return (
          <div key={s.id} className="rounded px-2 py-1 bg-navy-800/40">
            <Metric
              label={s.name}
              value={s.value != null ? s.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "N/A"}
              change={changeStr}
              changeColor={changeColor}
            />
          </div>
        );
      })}
    </div>
  );
}

// ── Options Widget ──

function OptionsWidget({ config }: { config: { view?: string } }) {
  const [data, setData] = useState<{ putCallRatio?: number; label?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/market-data?type=options&view=${config.view || "pcr"}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [config.view]);

  if (loading) return <WidgetSkeleton lines={2} />;

  const pcr = data?.putCallRatio;
  return (
    <Metric
      label="Put/Call Ratio"
      value={pcr != null ? pcr.toFixed(2) : "N/A"}
      change={pcr != null ? (pcr > 1 ? "bearish" : pcr < 0.7 ? "bullish" : "neutral") : ""}
      changeColor={pcr != null ? (pcr > 1 ? "red" : pcr < 0.7 ? "green" : "neutral") : "neutral"}
    />
  );
}

// ── Risk Widget ──

function RiskWidget({ config }: { config: { view?: string } }) {
  const [data, setData] = useState<{ var95?: number; var99?: number; sharpe?: number; maxDrawdown?: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/market-data?type=risk&view=${config.view || "var"}`)
      .then((r) => r.json())
      .then((d) => setData(d?.risk || d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [config.view]);

  if (loading) return <WidgetSkeleton lines={3} />;

  if (!data || (data.var95 == null && data.sharpe == null)) {
    return (
      <div className="space-y-2">
        <Metric label="Value at Risk (95%)" value="N/A" change="no data" changeColor="neutral" />
        <p className="text-[10px] text-navy-600">Connect portfolio for risk metrics</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {data.var95 != null && (
        <Metric label="VaR 95%" value={`${data.var95.toFixed(2)}%`} changeColor="neutral" />
      )}
      {data.var99 != null && (
        <Metric label="VaR 99%" value={`${data.var99.toFixed(2)}%`} changeColor="neutral" />
      )}
      {data.sharpe != null && (
        <Metric label="Sharpe" value={data.sharpe.toFixed(2)} changeColor={data.sharpe >= 1 ? "green" : "neutral"} />
      )}
      {data.maxDrawdown != null && (
        <Metric label="Max Drawdown" value={`${data.maxDrawdown.toFixed(1)}%`} changeColor="red" />
      )}
    </div>
  );
}

// ── Calendar Widget ──

interface CalendarEvent {
  date: string;
  holiday: string;
  type: string;
  significance: number;
  marketRelevance: string;
  calendarSystem: "hebrew" | "islamic" | "economic";
}

interface CalendarWidgetData {
  today: {
    gregorian: string;
    hebrew: string;
    hijri: string;
    hijriMonthName: string;
    isRamadan: boolean;
    isSacredMonth: boolean;
  } | null;
  esoteric: {
    lunarPhase: string;
    lunarBias: string;
    compositeScore: number;
  } | null;
  events: CalendarEvent[];
}

const CAL_SYSTEM_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  hebrew: { bg: "bg-accent-amber/15", text: "text-accent-amber", label: "HEB" },
  islamic: { bg: "bg-accent-emerald/15", text: "text-accent-emerald", label: "ISL" },
  economic: { bg: "bg-accent-cyan/15", text: "text-accent-cyan", label: "ECON" },
};

const SIG_DOTS: Record<number, string> = {
  1: "bg-signal-1",
  2: "bg-signal-2",
  3: "bg-signal-3",
  4: "bg-signal-4",
  5: "bg-signal-5",
};

function CalendarWidget() {
  const [data, setData] = useState<CalendarWidgetData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/calendar/hebrew")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <WidgetSkeleton lines={5} />;
  if (!data) return <WidgetError message="Calendar unavailable" />;

  const today = new Date().toISOString().split("T")[0];
  const upcoming = data.events
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  return (
    <div className="space-y-3">
      {/* Today strip */}
      {data.today && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Sun className="h-3 w-3 text-accent-amber" />
            <span className="text-[10px] text-navy-400 font-mono">{data.today.hebrew}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Moon className="h-3 w-3 text-accent-emerald" />
            <span className="text-[10px] text-navy-400 font-mono">{data.today.hijri}</span>
          </div>
          {data.esoteric && (
            <span className="text-[10px] text-navy-500">{data.esoteric.lunarPhase} / {data.esoteric.lunarBias}</span>
          )}
        </div>
      )}

      {/* Upcoming events */}
      <div className="space-y-1 max-h-52 overflow-y-auto">
        {upcoming.length === 0 && <p className="text-xs text-navy-500">No upcoming events</p>}
        {upcoming.map((event, i) => {
          const style = CAL_SYSTEM_STYLES[event.calendarSystem] || CAL_SYSTEM_STYLES.economic;
          const isToday = event.date === today;
          return (
            <div
              key={`${event.date}-${event.holiday}-${i}`}
              className={`flex items-start gap-2 py-1.5 px-2 rounded ${isToday ? "bg-navy-800/60" : "hover:bg-navy-800/30"} transition-colors`}
            >
              <div className="flex flex-col items-center gap-0.5 shrink-0 w-10 pt-0.5">
                <span className="text-[10px] font-mono text-navy-500">
                  {new Date(event.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                <div className={`w-1.5 h-1.5 rounded-full ${SIG_DOTS[event.significance] || "bg-navy-600"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-navy-200 truncate">{event.holiday}</span>
                  <span className={`text-[8px] font-bold px-1 py-0 rounded ${style.bg} ${style.text}`}>{style.label}</span>
                </div>
                {event.marketRelevance && (
                  <p className="text-[10px] text-navy-500 truncate">{event.marketRelevance}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Link href="/calendar" className="flex items-center gap-1 text-[10px] text-navy-500 hover:text-navy-300 transition-colors">
        Full Calendar <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ── Institutional Widgets (Tier 1-3) ──

interface FredSnapshot {
  [key: string]: {
    latest: { value: number; date: string } | null;
    previous: { value: number; date: string } | null;
    change: number | null;
    changePercent: number | null;
    name: string;
    unit: string;
    history: { date: string; value: number }[];
  };
}

function useMacroSnapshot() {
  const [data, setData] = useState<FredSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/macro")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);
  return { data, loading };
}

function val(snap: FredSnapshot | null, key: string): number | null {
  return snap?.[key]?.latest?.value ?? null;
}

function prev(snap: FredSnapshot | null, key: string): number | null {
  return snap?.[key]?.previous?.value ?? null;
}

function SparkLine({ history, color = "text-accent-cyan" }: { history: { value: number }[]; color?: string }) {
  if (history.length < 2) return null;
  const values = history.map((h) => h.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 100;
  const height = 24;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - ((v - min) / range) * height}`).join(" ");
  return (
    <svg width={width} height={height} className={`${color} opacity-60`}>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function GaugeBar({ value, min, max, thresholds, label }: { value: number; min: number; max: number; thresholds: [number, number]; label: string }) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const color = value >= thresholds[1] ? "bg-accent-rose" : value >= thresholds[0] ? "bg-accent-amber" : "bg-accent-emerald";
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span className="text-[10px] text-navy-400">{label}</span>
        <span className="text-[10px] font-mono text-navy-200">{value.toFixed(2)}</span>
      </div>
      <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── T1: Credit Stress Monitor ──
function CreditStressWidget() {
  const { data, loading } = useMacroSnapshot();
  if (loading) return <WidgetSkeleton lines={4} />;
  if (!data) return <WidgetError message="No macro data" />;

  const hy = val(data, "BAMLH0A0HYM2");
  const ig = val(data, "BAMLC0A0CM");
  const hyPrev = prev(data, "BAMLH0A0HYM2");
  const igPrev = prev(data, "BAMLC0A0CM");
  const hyHistory = data.BAMLH0A0HYM2?.history || [];

  const stressLevel = hy != null ? (hy >= 6 ? "ELEVATED" : hy >= 4 ? "WATCH" : "NORMAL") : "N/A";
  const stressColor = hy != null ? (hy >= 6 ? "text-accent-rose" : hy >= 4 ? "text-accent-amber" : "text-accent-emerald") : "text-navy-500";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-mono font-bold ${stressColor}`}>{stressLevel}</span>
        <SparkLine history={hyHistory} color={stressColor} />
      </div>
      {hy != null && <GaugeBar value={hy} min={2} max={12} thresholds={[4, 6]} label="HY OAS Spread" />}
      {ig != null && <GaugeBar value={ig} min={0.5} max={4} thresholds={[1.5, 2.5]} label="IG OAS Spread" />}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-navy-700/20">
        <div>
          <span className="text-[9px] text-navy-500 block">HY chg</span>
          <span className={`text-[11px] font-mono ${hy != null && hyPrev != null ? (hy > hyPrev ? "text-accent-rose" : "text-accent-emerald") : "text-navy-400"}`}>
            {hy != null && hyPrev != null ? `${hy > hyPrev ? "+" : ""}${(hy - hyPrev).toFixed(2)}` : "N/A"}
          </span>
        </div>
        <div>
          <span className="text-[9px] text-navy-500 block">IG chg</span>
          <span className={`text-[11px] font-mono ${ig != null && igPrev != null ? (ig > igPrev ? "text-accent-rose" : "text-accent-emerald") : "text-navy-400"}`}>
            {ig != null && igPrev != null ? `${ig > igPrev ? "+" : ""}${(ig - igPrev).toFixed(2)}` : "N/A"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── T1: Dollar Liquidity Index ──
function LiquidityWidget() {
  const { data, loading } = useMacroSnapshot();
  if (loading) return <WidgetSkeleton lines={4} />;
  if (!data) return <WidgetError message="No macro data" />;

  const fedBs = val(data, "WALCL");
  const rrp = val(data, "RRPONTSYD");
  const m2 = val(data, "M2SL");
  const fedBsPrev = prev(data, "WALCL");

  // Net liquidity = Fed balance sheet - reverse repo (simplified)
  const netLiq = fedBs != null && rrp != null ? (fedBs - rrp * 1000) / 1e6 : null; // in trillions
  const prevNetLiq = fedBsPrev != null && rrp != null ? (fedBsPrev - rrp * 1000) / 1e6 : null;
  const liqChange = netLiq != null && prevNetLiq != null ? netLiq - prevNetLiq : null;
  const liqDirection = liqChange != null ? (liqChange > 0 ? "EXPANDING" : "CONTRACTING") : "N/A";
  const liqColor = liqChange != null ? (liqChange > 0 ? "text-accent-emerald" : "text-accent-rose") : "text-navy-500";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[9px] text-navy-500 block">Net Liquidity</span>
          <span className="text-lg font-mono text-navy-100 font-bold">
            {netLiq != null ? `$${netLiq.toFixed(2)}T` : "N/A"}
          </span>
        </div>
        <span className={`text-[10px] font-mono font-bold ${liqColor}`}>{liqDirection}</span>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-navy-400">Fed Balance Sheet</span>
          <span className="text-[10px] font-mono text-navy-200">{fedBs != null ? `$${(fedBs / 1e6).toFixed(2)}T` : "N/A"}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-navy-400">Reverse Repo</span>
          <span className="text-[10px] font-mono text-navy-200">{rrp != null ? `$${rrp.toFixed(0)}B` : "N/A"}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-navy-400">M2 Supply</span>
          <span className="text-[10px] font-mono text-navy-200">{m2 != null ? `$${(m2 / 1000).toFixed(2)}T` : "N/A"}</span>
        </div>
      </div>
    </div>
  );
}

// ── T1: Inflation Pulse ──
function InflationPulseWidget() {
  const { data, loading } = useMacroSnapshot();
  if (loading) return <WidgetSkeleton lines={4} />;
  if (!data) return <WidgetError message="No macro data" />;

  const be5 = val(data, "T5YIE");
  const be10 = val(data, "T10YIE");
  const cpi = val(data, "CPIAUCSL");
  const be5Prev = prev(data, "T5YIE");
  const be10Prev = prev(data, "T10YIE");
  const be5History = data.T5YIE?.history || [];

  const trend = be5 != null && be5Prev != null ? (be5 > be5Prev ? "RISING" : be5 < be5Prev ? "FALLING" : "FLAT") : "N/A";
  const trendColor = trend === "RISING" ? "text-accent-rose" : trend === "FALLING" ? "text-accent-emerald" : "text-accent-amber";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-mono font-bold ${trendColor}`}>{trend}</span>
        <SparkLine history={be5History} color={trendColor} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-[10px] text-navy-400">5Y Breakeven</span>
          <span className={`text-[11px] font-mono font-bold ${be5 != null && be5 > 2.5 ? "text-accent-rose" : "text-navy-200"}`}>
            {be5 != null ? `${be5.toFixed(2)}%` : "N/A"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] text-navy-400">10Y Breakeven</span>
          <span className={`text-[11px] font-mono font-bold ${be10 != null && be10 > 2.5 ? "text-accent-rose" : "text-navy-200"}`}>
            {be10 != null ? `${be10.toFixed(2)}%` : "N/A"}
          </span>
        </div>
        {be5 != null && be10 != null && (
          <div className="flex justify-between pt-1 border-t border-navy-700/20">
            <span className="text-[10px] text-navy-400">5s10s Spread</span>
            <span className="text-[11px] font-mono text-navy-200">{(be10 - be5).toFixed(2)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── T1: Vol Term Structure ──
function VolTermWidget() {
  const { data, loading } = useMacroSnapshot();
  if (loading) return <WidgetSkeleton lines={3} />;
  if (!data) return <WidgetError message="No macro data" />;

  const vix = val(data, "VIXCLS");
  const vixPrev = prev(data, "VIXCLS");
  const history = data.VIXCLS?.history || [];

  const regime = vix != null ? (vix >= 30 ? "CRISIS" : vix >= 25 ? "FEAR" : vix >= 20 ? "ELEVATED" : vix >= 15 ? "NORMAL" : "COMPLACENT") : "N/A";
  const regimeColor = vix != null ? (vix >= 25 ? "text-accent-rose" : vix >= 20 ? "text-accent-amber" : "text-accent-emerald") : "text-navy-500";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[9px] text-navy-500 block">VIX</span>
          <span className="text-xl font-mono text-navy-100 font-bold">{vix != null ? vix.toFixed(1) : "N/A"}</span>
        </div>
        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${regimeColor} bg-navy-800/60`}>{regime}</span>
      </div>
      {vix != null && <GaugeBar value={vix} min={10} max={45} thresholds={[20, 30]} label="Fear Gauge" />}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-navy-400">Day chg</span>
        <span className={`text-[11px] font-mono ${vix != null && vixPrev != null ? (vix > vixPrev ? "text-accent-rose" : "text-accent-emerald") : "text-navy-400"}`}>
          {vix != null && vixPrev != null ? `${vix > vixPrev ? "+" : ""}${(vix - vixPrev).toFixed(2)}` : "N/A"}
        </span>
      </div>
      <SparkLine history={history} color={regimeColor} />
    </div>
  );
}

// ── T2: Currency Stress ──
function CurrencyStressWidget() {
  const { data, loading } = useMacroSnapshot();
  if (loading) return <WidgetSkeleton lines={5} />;
  if (!data) return <WidgetError message="No macro data" />;

  const pairs = [
    { key: "DTWEXBGS", label: "DXY (TWI)", format: (v: number) => v.toFixed(1) },
    { key: "DEXUSEU", label: "EUR/USD", format: (v: number) => v.toFixed(4) },
    { key: "DEXJPUS", label: "JPY/USD", format: (v: number) => v.toFixed(1) },
    { key: "DEXCHUS", label: "CNY/USD", format: (v: number) => v.toFixed(4) },
  ];

  const dxy = val(data, "DTWEXBGS");
  const dxyPrev = prev(data, "DTWEXBGS");
  const dxyTrend = dxy != null && dxyPrev != null ? (dxy > dxyPrev ? "STRENGTHENING" : "WEAKENING") : "N/A";
  const dxyColor = dxyTrend === "STRENGTHENING" ? "text-accent-emerald" : dxyTrend === "WEAKENING" ? "text-accent-rose" : "text-navy-500";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-navy-400">Dollar</span>
        <span className={`text-[10px] font-mono font-bold ${dxyColor}`}>{dxyTrend}</span>
      </div>
      <div className="space-y-1.5">
        {pairs.map((p) => {
          const v = val(data, p.key);
          const pv = prev(data, p.key);
          const chg = v != null && pv != null ? v - pv : null;
          return (
            <div key={p.key} className="flex items-center justify-between">
              <span className="text-[10px] text-navy-400">{p.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-navy-200">{v != null ? p.format(v) : "N/A"}</span>
                {chg != null && (
                  <span className={`text-[9px] font-mono ${chg > 0 ? "text-accent-emerald" : "text-accent-rose"}`}>
                    {chg > 0 ? "+" : ""}{chg.toFixed(chg < 1 ? 4 : 1)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── T2: Labor Market Pulse ──
function LaborMarketWidget() {
  const { data, loading } = useMacroSnapshot();
  if (loading) return <WidgetSkeleton lines={5} />;
  if (!data) return <WidgetError message="No macro data" />;

  const unrate = val(data, "UNRATE");
  const icsa = val(data, "ICSA");
  const ccsa = val(data, "CCSA");
  const payems = val(data, "PAYEMS");
  const icsaPrev = prev(data, "ICSA");
  const icsaHistory = data.ICSA?.history || [];

  const health = icsa != null ? (icsa > 300000 ? "WEAKENING" : icsa > 250000 ? "SOFTENING" : "STRONG") : "N/A";
  const healthColor = health === "WEAKENING" ? "text-accent-rose" : health === "SOFTENING" ? "text-accent-amber" : "text-accent-emerald";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-mono font-bold ${healthColor}`}>{health}</span>
        <SparkLine history={icsaHistory} color={healthColor} />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <span className="text-[10px] text-navy-400">Unemployment</span>
          <span className="text-[11px] font-mono text-navy-200">{unrate != null ? `${unrate.toFixed(1)}%` : "N/A"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] text-navy-400">Initial Claims</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-navy-200">{icsa != null ? `${(icsa / 1000).toFixed(0)}K` : "N/A"}</span>
            {icsa != null && icsaPrev != null && (
              <span className={`text-[9px] font-mono ${icsa > icsaPrev ? "text-accent-rose" : "text-accent-emerald"}`}>
                {icsa > icsaPrev ? "+" : ""}{((icsa - icsaPrev) / 1000).toFixed(0)}K
              </span>
            )}
          </div>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] text-navy-400">Continuing Claims</span>
          <span className="text-[11px] font-mono text-navy-200">{ccsa != null ? `${(ccsa / 1000).toFixed(0)}K` : "N/A"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] text-navy-400">Nonfarm Payrolls</span>
          <span className="text-[11px] font-mono text-navy-200">{payems != null ? `${(payems / 1000).toFixed(0)}M` : "N/A"}</span>
        </div>
      </div>
    </div>
  );
}

// ── T2: Commodity Complex ──
function CommodityWidget() {
  const { data, loading } = useMacroSnapshot();
  if (loading) return <WidgetSkeleton lines={5} />;
  if (!data) return <WidgetError message="No macro data" />;

  const commodities = [
    { key: "GOLDAMGBD228NLBM", label: "Gold", unit: "$/oz", decimals: 0 },
    { key: "DCOILWTICO", label: "WTI Crude", unit: "$/bbl", decimals: 2 },
    { key: "DCOILBRENTEU", label: "Brent Crude", unit: "$/bbl", decimals: 2 },
    { key: "DHHNGSP", label: "Nat Gas", unit: "$/mmbtu", decimals: 2 },
  ];

  return (
    <div className="space-y-2">
      {commodities.map((c) => {
        const v = val(data, c.key);
        const pv = prev(data, c.key);
        const chg = v != null && pv != null ? v - pv : null;
        const chgPct = v != null && pv != null && pv !== 0 ? ((v - pv) / pv) * 100 : null;
        const history = data[c.key]?.history || [];
        return (
          <div key={c.key} className="flex items-center justify-between py-1">
            <div className="flex-1">
              <span className="text-[10px] text-navy-400 block">{c.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-mono text-navy-200 font-bold">{v != null ? `$${v.toFixed(c.decimals)}` : "N/A"}</span>
                {chgPct != null && (
                  <span className={`text-[9px] font-mono ${chgPct >= 0 ? "text-accent-emerald" : "text-accent-rose"}`}>
                    {chgPct >= 0 ? "+" : ""}{chgPct.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
            <SparkLine history={history} color={chg != null && chg >= 0 ? "text-accent-emerald" : "text-accent-rose"} />
          </div>
        );
      })}
    </div>
  );
}

// ── T3: Housing & Consumer ──
function HousingConsumerWidget() {
  const { data, loading } = useMacroSnapshot();
  if (loading) return <WidgetSkeleton lines={4} />;
  if (!data) return <WidgetError message="No macro data" />;

  const houst = val(data, "HOUST");
  const umcsent = val(data, "UMCSENT");
  const retail = val(data, "RSXFS");
  const houstPrev = prev(data, "HOUST");
  const umcPrev = prev(data, "UMCSENT");

  const sentimentLevel = umcsent != null ? (umcsent >= 80 ? "OPTIMISTIC" : umcsent >= 60 ? "NEUTRAL" : "PESSIMISTIC") : "N/A";
  const sentColor = sentimentLevel === "OPTIMISTIC" ? "text-accent-emerald" : sentimentLevel === "PESSIMISTIC" ? "text-accent-rose" : "text-accent-amber";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-navy-400">Consumer</span>
        <span className={`text-[10px] font-mono font-bold ${sentColor}`}>{sentimentLevel}</span>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <span className="text-[10px] text-navy-400">Housing Starts</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-navy-200">{houst != null ? `${houst.toFixed(0)}K` : "N/A"}</span>
            {houst != null && houstPrev != null && (
              <span className={`text-[9px] font-mono ${houst >= houstPrev ? "text-accent-emerald" : "text-accent-rose"}`}>
                {((houst - houstPrev) / houstPrev * 100).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] text-navy-400">Consumer Sentiment</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-navy-200">{umcsent != null ? umcsent.toFixed(1) : "N/A"}</span>
            {umcsent != null && umcPrev != null && (
              <span className={`text-[9px] font-mono ${umcsent >= umcPrev ? "text-accent-emerald" : "text-accent-rose"}`}>
                {umcsent > umcPrev ? "+" : ""}{(umcsent - umcPrev).toFixed(1)}
              </span>
            )}
          </div>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] text-navy-400">Retail Sales</span>
          <span className="text-[11px] font-mono text-navy-200">{retail != null ? `$${(retail / 1000).toFixed(1)}B` : "N/A"}</span>
        </div>
      </div>
    </div>
  );
}

// ── T3: GDP Nowcast ──
function GdpNowcastWidget() {
  const { data, loading } = useMacroSnapshot();
  if (loading) return <WidgetSkeleton lines={3} />;
  if (!data) return <WidgetError message="No macro data" />;

  const gdp = val(data, "A191RL1Q225SBEA");
  const gdpPrev = prev(data, "A191RL1Q225SBEA");
  const indpro = val(data, "INDPRO");
  const history = data.A191RL1Q225SBEA?.history || [];

  const regime = gdp != null ? (gdp < 0 ? "CONTRACTION" : gdp < 1 ? "STALL SPEED" : gdp < 2.5 ? "BELOW TREND" : "ABOVE TREND") : "N/A";
  const regimeColor = gdp != null ? (gdp < 0 ? "text-accent-rose" : gdp < 1 ? "text-accent-amber" : "text-accent-emerald") : "text-navy-500";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[9px] text-navy-500 block">Real GDP QoQ</span>
          <span className="text-xl font-mono text-navy-100 font-bold">{gdp != null ? `${gdp.toFixed(1)}%` : "N/A"}</span>
        </div>
        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${regimeColor} bg-navy-800/60`}>{regime}</span>
      </div>
      <SparkLine history={history} color={regimeColor} />
      <div className="space-y-1 pt-1 border-t border-navy-700/20">
        <div className="flex justify-between">
          <span className="text-[10px] text-navy-400">Prev Quarter</span>
          <span className="text-[11px] font-mono text-navy-300">{gdpPrev != null ? `${gdpPrev.toFixed(1)}%` : "N/A"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] text-navy-400">Industrial Prod</span>
          <span className="text-[11px] font-mono text-navy-300">{indpro != null ? indpro.toFixed(1) : "N/A"}</span>
        </div>
      </div>
    </div>
  );
}

// ── Prediction Markets Widget ──

interface PredictionMarketData {
  id: string;
  source: string;
  title: string;
  probability: number;
  volume24h: number;
  category: string;
  priceChange24h: number;
  url: string;
}

interface PredictionMarketsWidgetData {
  markets: PredictionMarketData[];
  topMovers: PredictionMarketData[];
  geopolitical: PredictionMarketData[];
  economic: PredictionMarketData[];
  political: PredictionMarketData[];
  totalMarkets: number;
}

function PredictionMarketsWidget() {
  const [data, setData] = useState<PredictionMarketsWidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"top" | "geo" | "econ" | "political">("top");

  useEffect(() => {
    fetch("/api/prediction-markets")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <WidgetSkeleton lines={8} />;
  if (!data || !data.markets?.length) return <WidgetError message="No prediction market data" />;

  const tabs = [
    { key: "top" as const, label: "Top Vol" },
    { key: "geo" as const, label: "Geopolitical" },
    { key: "econ" as const, label: "Economic" },
    { key: "political" as const, label: "Political" },
  ];

  const markets = tab === "geo" ? data.geopolitical
    : tab === "econ" ? data.economic
    : tab === "political" ? data.political
    : data.markets;

  return (
    <div className="space-y-2">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-navy-700/20 pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded transition-colors ${
              tab === t.key ? "bg-navy-800 text-navy-200" : "text-navy-500 hover:text-navy-300"
            }`}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-auto text-[8px] font-mono text-navy-600">{data.totalMarkets} markets</span>
      </div>

      {/* Top movers bar */}
      {tab === "top" && data.topMovers?.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {data.topMovers.slice(0, 5).map((m) => (
            <div key={m.id} className="shrink-0 px-2 py-1 rounded bg-navy-800/40 border border-navy-700/20">
              <span className="text-[8px] text-navy-400 block truncate max-w-[120px]">{m.title}</span>
              <span className={`text-[10px] font-mono font-bold ${m.priceChange24h > 0 ? "text-accent-emerald" : m.priceChange24h < 0 ? "text-accent-rose" : "text-navy-300"}`}>
                {m.priceChange24h > 0 ? "+" : ""}{(m.priceChange24h * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Market list */}
      <div className="space-y-1">
        {(markets || []).slice(0, 12).map((m) => {
          const pct = (m.probability * 100).toFixed(0);
          const barColor = m.probability > 0.7 ? "bg-accent-emerald" : m.probability > 0.4 ? "bg-accent-amber" : "bg-accent-rose";
          return (
            <div key={m.id} className="p-1.5 rounded bg-navy-800/30 hover:bg-navy-800/50 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-[10px] text-navy-200 leading-tight flex-1">{m.title}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-mono text-navy-100 font-bold">{pct}%</span>
                  {m.priceChange24h !== 0 && (
                    <span className={`text-[8px] font-mono ${m.priceChange24h > 0 ? "text-accent-emerald" : "text-accent-rose"}`}>
                      {m.priceChange24h > 0 ? "+" : ""}{(m.priceChange24h * 100).toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-navy-700/40 rounded-full overflow-hidden">
                  <div className={`h-full ${barColor}/60 rounded-full`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[7px] font-mono text-navy-600 uppercase">{m.source}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Congressional Trading Widget ──

interface CongressionalTradeData {
  name: string;
  chamber: string;
  party?: string;
  ticker: string;
  asset: string;
  transactionType: string;
  amount: string;
  transactionDate: string;
}

interface CongressionalWidgetData {
  congressional: {
    recent: CongressionalTradeData[];
    topBuys: CongressionalTradeData[];
    topSells: CongressionalTradeData[];
    byParty: { democrat: number; republican: number; independent: number };
    byChamber: { senate: number; house: number };
  };
  insider: {
    recent: Array<{ insider: string; company: string; ticker: string; transactionType: string; shares: number; transactionDate: string }>;
    clusterBuys: Array<{ ticker: string; company: string; insiders: Array<{ name: string }>; significance: string }>;
    buyRatio: number;
  };
}

function CongressionalTradingWidget() {
  const [data, setData] = useState<CongressionalWidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"recent" | "buys" | "clusters">("recent");

  useEffect(() => {
    fetch("/api/congressional-trading")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <WidgetSkeleton lines={8} />;
  if (!data) return <WidgetError message="No congressional trading data" />;

  const tabs = [
    { key: "recent" as const, label: "Recent" },
    { key: "buys" as const, label: "Top Buys" },
    { key: "clusters" as const, label: "Clusters" },
  ];

  const partyColor = (party?: string) => {
    const p = (party || "").toLowerCase();
    if (p.includes("democrat") || p === "d") return "text-blue-400";
    if (p.includes("republican") || p === "r") return "text-red-400";
    return "text-navy-400";
  };

  const partyLabel = (party?: string) => {
    const p = (party || "").toLowerCase();
    if (p.includes("democrat") || p === "d") return "D";
    if (p.includes("republican") || p === "r") return "R";
    return "I";
  };

  return (
    <div className="space-y-2">
      {/* Summary bar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="text-[8px] text-navy-500">Senate</span>
          <span className="text-[10px] font-mono text-navy-200">{data.congressional?.byChamber?.senate || 0}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[8px] text-navy-500">House</span>
          <span className="text-[10px] font-mono text-navy-200">{data.congressional?.byChamber?.house || 0}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[8px] text-blue-400">D:{data.congressional?.byParty?.democrat || 0}</span>
          <span className="text-[8px] text-red-400">R:{data.congressional?.byParty?.republican || 0}</span>
        </div>
      </div>

      {/* Buy ratio */}
      {data.insider?.buyRatio != null && (
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-navy-500">Insider Buy Ratio</span>
          <div className="flex-1 h-1.5 bg-navy-700/40 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${data.insider.buyRatio > 0.5 ? "bg-accent-emerald/60" : "bg-accent-rose/60"}`}
              style={{ width: `${data.insider.buyRatio * 100}%` }}
            />
          </div>
          <span className="text-[9px] font-mono text-navy-300">{(data.insider.buyRatio * 100).toFixed(0)}%</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-navy-700/20 pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded transition-colors ${
              tab === t.key ? "bg-navy-800 text-navy-200" : "text-navy-500 hover:text-navy-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {(tab === "recent" || tab === "buys") && (
        <div className="space-y-1">
          {(tab === "buys" ? data.congressional?.topBuys : data.congressional?.recent || []).slice(0, 10).map((t, i) => (
            <div key={i} className="flex items-center gap-2 p-1.5 rounded bg-navy-800/30">
              <span className={`text-[9px] font-mono font-bold w-4 ${partyColor(t.party)}`}>{partyLabel(t.party)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-navy-200 truncate">{t.name}</span>
                  <span className="text-[8px] text-navy-600 uppercase">{t.chamber === "senate" ? "SEN" : "HSE"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-accent-cyan font-bold">{t.ticker}</span>
                  <span className={`text-[8px] font-mono uppercase ${t.transactionType === "purchase" ? "text-accent-emerald" : "text-accent-rose"}`}>
                    {t.transactionType === "purchase" ? "BUY" : "SELL"}
                  </span>
                  <span className="text-[8px] text-navy-500">{t.amount}</span>
                </div>
              </div>
              <span className="text-[8px] font-mono text-navy-600 shrink-0">{t.transactionDate}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "clusters" && (
        <div className="space-y-1.5">
          {(data.insider?.clusterBuys || []).length === 0 && (
            <p className="text-[10px] text-navy-500 py-2">No cluster buys detected in recent filings.</p>
          )}
          {(data.insider?.clusterBuys || []).slice(0, 8).map((c, i) => {
            const sigColor = c.significance === "high" ? "text-accent-rose" : c.significance === "medium" ? "text-accent-amber" : "text-navy-400";
            return (
              <div key={i} className="p-2 rounded bg-navy-800/40 border border-navy-700/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-mono text-accent-cyan font-bold">{c.ticker}</span>
                  <span className={`text-[8px] font-mono uppercase ${sigColor}`}>{c.significance}</span>
                </div>
                <span className="text-[9px] text-navy-400 block">{c.company}</span>
                <span className="text-[9px] text-navy-500">{c.insiders.length} insiders buying</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── AI Progression Widget ──

interface AIProgressionData {
  rli: { bestRate: number; models: Array<{ name: string; automationRate: number }> } | null;
  metr: { doublingTimeDays: number; latestModels: Array<{ model: string; fiftyPctHorizon: string; date: string }> } | null;
  ai2027: { progressPace: number; milestones: Array<{ date: string; title: string; status: string; category: string }> } | null;
  sectors: Array<{ sector: string; automationRisk: number; aiAdoption: number; trend: string }>;
  displacement: { aiReplacementRate: number; routineJobDecline: number; technicalJobGrowth: number; aiWorkPercentage: number; enterpriseAdoption: number; productivityGain: number } | null;
  compositeScore: number;
  regime: string;
}

function AIProgressionWidget() {
  const [data, setData] = useState<AIProgressionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "sectors" | "timeline">("overview");

  useEffect(() => {
    fetch("/api/ai-progression")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <WidgetSkeleton lines={8} />;
  if (!data) return <WidgetError message="No AI progression data" />;

  const regimeColor = data.regime === "transformation" ? "text-accent-rose"
    : data.regime === "displacement" ? "text-accent-amber"
    : data.regime === "inflection" ? "text-accent-cyan"
    : data.regime === "accelerating" ? "text-accent-emerald"
    : "text-navy-400";

  const tabs = [
    { key: "overview" as const, label: "Overview" },
    { key: "sectors" as const, label: "Sectors" },
    { key: "timeline" as const, label: "AI 2027" },
  ];

  return (
    <div className="space-y-3">
      {/* Regime header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[9px] text-navy-500 block">AI Progression Score</span>
          <span className="text-xl font-mono text-navy-100 font-bold">{data.compositeScore}/100</span>
        </div>
        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${regimeColor} bg-navy-800/60 uppercase`}>
          {data.regime}
        </span>
      </div>

      {/* Score bar */}
      <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            data.compositeScore > 60 ? "bg-accent-rose" : data.compositeScore > 40 ? "bg-accent-amber" : "bg-accent-cyan"
          }`}
          style={{ width: `${data.compositeScore}%` }}
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-navy-700/20 pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded transition-colors ${
              tab === t.key ? "bg-navy-800 text-navy-200" : "text-navy-500 hover:text-navy-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "overview" && (
        <div className="space-y-2">
          {/* Remote Labor Index */}
          {data.rli && (
            <div className="p-2 rounded bg-navy-800/40 border border-navy-700/20">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-mono text-navy-500 uppercase tracking-wider">Remote Labor Index</span>
                <span className="text-[10px] font-mono text-accent-cyan font-bold">{data.rli.bestRate.toFixed(1)}%</span>
              </div>
              <div className="space-y-1">
                {data.rli.models.slice(0, 4).map((m) => (
                  <div key={m.name} className="flex items-center gap-2">
                    <span className="text-[9px] text-navy-400 w-28 truncate">{m.name}</span>
                    <div className="flex-1 h-1 bg-navy-700/40 rounded-full overflow-hidden">
                      <div className="h-full bg-accent-cyan/60 rounded-full" style={{ width: `${Math.min(m.automationRate * 10, 100)}%` }} />
                    </div>
                    <span className="text-[9px] font-mono text-navy-300 w-8 text-right">{m.automationRate.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key displacement metrics */}
          {data.displacement && (
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded bg-navy-800/40 border border-navy-700/20">
                <span className="text-[9px] text-navy-500 block">Companies replacing workers</span>
                <span className="text-sm font-mono text-accent-rose font-bold">{data.displacement.aiReplacementRate}%</span>
              </div>
              <div className="p-2 rounded bg-navy-800/40 border border-navy-700/20">
                <span className="text-[9px] text-navy-500 block">Routine job decline</span>
                <span className="text-sm font-mono text-accent-amber font-bold">-{data.displacement.routineJobDecline}%</span>
              </div>
              <div className="p-2 rounded bg-navy-800/40 border border-navy-700/20">
                <span className="text-[9px] text-navy-500 block">AI-assisted work time</span>
                <span className="text-sm font-mono text-accent-cyan font-bold">{data.displacement.aiWorkPercentage}%</span>
              </div>
              <div className="p-2 rounded bg-navy-800/40 border border-navy-700/20">
                <span className="text-[9px] text-navy-500 block">Enterprise adoption</span>
                <span className="text-sm font-mono text-accent-emerald font-bold">{data.displacement.enterpriseAdoption}%</span>
              </div>
            </div>
          )}

          {/* METR */}
          {data.metr && (
            <div className="pt-1 border-t border-navy-700/20">
              <span className="text-[9px] font-mono text-navy-500 uppercase tracking-wider">METR Time Horizon</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-navy-400">Capability doubling time</span>
                <span className="text-[11px] font-mono text-navy-200 font-bold">{data.metr.doublingTimeDays} days</span>
              </div>
              {data.metr.latestModels.slice(0, 3).map((m) => (
                <div key={m.model} className="flex items-center justify-between mt-0.5">
                  <span className="text-[9px] text-navy-400">{m.model}</span>
                  <span className="text-[10px] font-mono text-navy-300">{m.fiftyPctHorizon} @ 50%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "sectors" && (
        <div className="space-y-1.5">
          {data.sectors.map((s) => {
            const riskColor = s.automationRisk >= 70 ? "bg-accent-rose" : s.automationRisk >= 50 ? "bg-accent-amber" : s.automationRisk >= 30 ? "bg-accent-cyan" : "bg-navy-600";
            const trendLabel = s.trend === "accelerating" ? "ACC" : s.trend === "stable" ? "STB" : "ERL";
            const trendColor = s.trend === "accelerating" ? "text-accent-rose" : s.trend === "stable" ? "text-accent-amber" : "text-navy-400";
            return (
              <div key={s.sector} className="p-2 rounded bg-navy-800/40 border border-navy-700/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-navy-200 font-medium">{s.sector}</span>
                  <span className={`text-[8px] font-mono ${trendColor} uppercase`}>{trendLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[8px] text-navy-500">Automation risk</span>
                      <span className="text-[9px] font-mono text-navy-300">{s.automationRisk}%</span>
                    </div>
                    <div className="h-1 bg-navy-700/40 rounded-full overflow-hidden">
                      <div className={`h-full ${riskColor}/60 rounded-full`} style={{ width: `${s.automationRisk}%` }} />
                    </div>
                  </div>
                  <div className="w-16 text-right">
                    <span className="text-[8px] text-navy-500 block">Adoption</span>
                    <span className="text-[10px] font-mono text-navy-300">{s.aiAdoption}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "timeline" && data.ai2027 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-mono text-navy-500">Progress pace vs AI 2027</span>
            <span className="text-[11px] font-mono text-accent-amber font-bold">{data.ai2027.progressPace}%</span>
          </div>
          <div className="h-1 bg-navy-700/40 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-accent-amber/60 rounded-full" style={{ width: `${data.ai2027.progressPace}%` }} />
          </div>
          {data.ai2027.milestones.map((m, i) => {
            const statusColor = m.status === "passed" ? "bg-accent-emerald"
              : m.status === "on_track" ? "bg-accent-cyan"
              : m.status === "delayed" ? "bg-accent-rose"
              : "bg-navy-600";
            const catColor = m.category === "risk" ? "text-accent-rose"
              : m.category === "governance" ? "text-accent-amber"
              : m.category === "capability" ? "text-accent-cyan"
              : "text-navy-400";
            return (
              <div key={i} className="flex gap-2">
                <div className="flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full ${statusColor} shrink-0 mt-1`} />
                  {i < data.ai2027!.milestones.length - 1 && <div className="w-px flex-1 bg-navy-700/30" />}
                </div>
                <div className="pb-2 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-navy-500">{m.date}</span>
                    <span className={`text-[8px] font-mono uppercase ${catColor}`}>{m.category}</span>
                  </div>
                  <span className="text-[10px] text-navy-200 block leading-tight">{m.title}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Renderer ──

export function WidgetRenderer({ widget, onRemove }: WidgetProps) {
  const config = (() => {
    try {
      return JSON.parse(widget.config || "{}");
    } catch {
      return {};
    }
  })();

  function renderContent() {
    switch (widget.widgetType) {
      case "metric":
        return <MetricWidget config={config} />;
      case "thesis":
        return <ThesisWidget />;
      case "predictions":
        return <PredictionsWidget />;
      case "signals":
        return <SignalsWidget config={config} />;
      case "chart":
        return <ChartWidget config={config} />;
      case "news":
        return <NewsWidget config={config} />;
      case "macro":
        return <MacroWidget config={config} />;
      case "options":
        return <OptionsWidget config={config} />;
      case "risk":
        return <RiskWidget config={config} />;
      case "calendar":
        return <CalendarWidget />;
      case "credit_stress":
        return <CreditStressWidget />;
      case "liquidity":
        return <LiquidityWidget />;
      case "inflation_pulse":
        return <InflationPulseWidget />;
      case "vol_term":
        return <VolTermWidget />;
      case "currency_stress":
        return <CurrencyStressWidget />;
      case "labor_market":
        return <LaborMarketWidget />;
      case "commodities":
        return <CommodityWidget />;
      case "housing_consumer":
        return <HousingConsumerWidget />;
      case "gdp_nowcast":
        return <GdpNowcastWidget />;
      case "ai_progression":
        return <AIProgressionWidget />;
      case "prediction_markets":
        return <PredictionMarketsWidget />;
      case "congressional_trading":
        return <CongressionalTradingWidget />;
      default:
        return <WidgetError message={`Unknown widget type: ${widget.widgetType}`} />;
    }
  }

  return (
    <WidgetShell title={widget.title} onRemove={() => onRemove(widget.id)}>
      {renderContent()}
    </WidgetShell>
  );
}

// ── Available Widgets Registry ──

export const AVAILABLE_WIDGETS = [
  { type: "metric", name: "Metric", description: "Single key metric", defaultWidth: 1, defaultConfig: { metric: "threat_level" } },
  { type: "thesis", name: "Active Thesis", description: "Current thesis summary with market regime", defaultWidth: 2, defaultConfig: {} },
  { type: "predictions", name: "Prediction Scorecard", description: "Prediction accuracy and status breakdown", defaultWidth: 1, defaultConfig: {} },
  { type: "signals", name: "Signals", description: "Filtered signal feed by intensity", defaultWidth: 1, defaultConfig: { minIntensity: 4 } },
  { type: "chart", name: "Price Chart", description: "Candlestick chart for any symbol", defaultWidth: 2, defaultConfig: { symbol: "SPY", range: "3m" } },
  { type: "news", name: "News Feed", description: "Live news from Reuters, BBC, Al Jazeera", defaultWidth: 2, defaultConfig: { category: "all", maxItems: 15 } },
  { type: "macro", name: "Macro Dashboard", description: "Key macro economic indicators", defaultWidth: 2, defaultConfig: { series: ["FEDFUNDS", "DGS2", "DGS10", "T10Y2Y"] } },
  { type: "options", name: "Put/Call Ratio", description: "Options market sentiment gauge", defaultWidth: 1, defaultConfig: { view: "pcr" } },
  { type: "risk", name: "Portfolio Risk", description: "VaR, Sharpe, and drawdown metrics", defaultWidth: 1, defaultConfig: { view: "var" } },
  { type: "calendar", name: "Calendar", description: "Hebrew, Islamic & economic calendar with upcoming events", defaultWidth: 1, defaultConfig: {} },
  // Tier 1
  { type: "credit_stress", name: "Credit Stress Monitor", description: "HY & IG spreads with stress regime classification", defaultWidth: 1, defaultConfig: {} },
  { type: "liquidity", name: "Dollar Liquidity Index", description: "Net liquidity from Fed balance sheet, RRP, and M2", defaultWidth: 1, defaultConfig: {} },
  { type: "inflation_pulse", name: "Inflation Pulse", description: "Breakeven inflation rates and inflation trend", defaultWidth: 1, defaultConfig: {} },
  { type: "vol_term", name: "Volatility Regime", description: "VIX term structure with fear gauge and regime label", defaultWidth: 1, defaultConfig: {} },
  // Tier 2
  { type: "currency_stress", name: "Currency Stress", description: "Dollar index, EUR, JPY, CNY with trend signals", defaultWidth: 1, defaultConfig: {} },
  { type: "labor_market", name: "Labor Market Pulse", description: "Claims, unemployment, payrolls with health status", defaultWidth: 1, defaultConfig: {} },
  { type: "commodities", name: "Commodity Complex", description: "Gold, WTI, Brent, Natural Gas with sparklines", defaultWidth: 1, defaultConfig: {} },
  // Tier 3
  { type: "housing_consumer", name: "Housing & Consumer", description: "Housing starts, consumer sentiment, retail sales", defaultWidth: 1, defaultConfig: {} },
  { type: "gdp_nowcast", name: "GDP Nowcast", description: "Real GDP growth with regime and industrial production", defaultWidth: 1, defaultConfig: {} },
  // AI
  { type: "ai_progression", name: "AI Progression", description: "Remote Labor Index, AI 2027 timeline, sector automation risk", defaultWidth: 2, defaultConfig: {} },
  { type: "prediction_markets", name: "Prediction Markets", description: "Polymarket + Kalshi probability pricing", defaultWidth: 2, defaultConfig: {} },
  { type: "congressional_trading", name: "Congressional Trading", description: "STOCK Act disclosures, insider cluster buys", defaultWidth: 2, defaultConfig: {} },
];
