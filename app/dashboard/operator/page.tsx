"use client";

import { useEffect, useState, useRef } from "react";
import { PageContainer } from "@/components/layout/page-container";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Activity,
  Shield,
  Target,
  TrendingUp,
  Zap,
  RefreshCw,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import Link from "next/link";

interface OperatorData {
  timestamp: string;
  regime: {
    market: string;
    volatility: string;
    confidence: number;
    convergence: number;
  } | null;
  threatLevel: number;
  portfolio: {
    totalValue: number;
    cash: number;
    invested: number;
    pnl: number;
    pnlPercent: number;
    positions: Array<{ ticker: string; quantity: number; ppl: number; currentPrice: number }>;
    environment: string;
  } | null;
  signals: Array<{
    id: number;
    title: string;
    intensity: number;
    category: string;
    status: string;
    date: string;
    layers: string[];
  }>;
  intensityCounts: number[];
  theses: Array<{
    id: number;
    title: string;
    regime: string;
    confidence: number;
    validUntil: string;
    summary: string;
  }>;
  predictions: {
    open: Array<{
      id: number;
      claim: string;
      confidence: number;
      deadline: string;
      category: string;
    }>;
    totalResolved: number;
    avgScore: number | null;
  };
  alerts: {
    active: number;
    recent: Array<{
      id: number;
      title: string;
      message: string;
      severity: number;
      triggeredAt: string;
      dismissed: boolean;
    }>;
  };
  trades: Array<{
    id: number;
    ticker: string;
    direction: string;
    quantity: number;
    status: string;
    filledPrice: number | null;
    environment: string;
    createdAt: string;
  }>;
}

const THREAT_LABELS = ["MINIMAL", "LOW", "ELEVATED", "HIGH", "CRITICAL"];
const THREAT_COLORS = [
  "text-accent-cyan",
  "text-accent-emerald",
  "text-accent-amber",
  "text-orange-400",
  "text-accent-rose",
];
const THREAT_BG = [
  "bg-accent-cyan/10 border-accent-cyan/30",
  "bg-accent-emerald/10 border-accent-emerald/30",
  "bg-accent-amber/10 border-accent-amber/30",
  "bg-orange-400/10 border-orange-400/30",
  "bg-accent-rose/10 border-accent-rose/30",
];

// ── Info tooltip content ──

const INFO = {
  regime:
    "The regime banner shows the current geopolitical-market environment classification. DEFCON 1-5 maps to signal intensity. Regime (risk-on/off) reflects macro conditions. Convergence measures how many independent signal layers agree. Higher convergence = stronger conviction.",
  threatLevel:
    "Derived from the highest active signal intensity (1-5). Intensity 1 = routine noise, 5 = critical escalation requiring immediate attention. Driven by real-time geopolitical, market, and OSINT signal detection.",
  activeAlerts:
    "Alerts fire when signal thresholds are breached or when the AI detects anomalous patterns across data sources. Undismissed alerts need your attention. Severity 4-5 = high priority.",
  openPredictions:
    "Tracked probabilistic claims with deadlines. Each prediction has a confidence level and is scored against outcomes using Brier scoring (0 = perfect, 1 = worst). Lower average score = better calibration.",
  activeSignals:
    "Intelligence signals detected across 4 layers: geopolitical (GEO), market (MKT), open-source intelligence (OSINT), and systemic risk. Intensity 1-5 reflects magnitude. Only active signals are actionable.",
  portfolioPnl:
    "Live profit/loss from your connected trading account (Trading 212 or Coinbase). Shows unrealized P&L across all open positions. Updates on each data refresh.",
  signalIntensity:
    "Distribution of recent signals by intensity level (1-5). A cluster at high intensity means multiple independent sources are detecting significant activity. The bar chart shows the count at each level.",
  signalFeed:
    "Real-time intelligence signals from the detection engine. Each signal has an intensity (1-5), category (GEO/MKT/OSI/SYS), and status. Click any signal to see its full analysis with contributing layers.",
  alertStream:
    "Chronological feed of system alerts. Alerts are triggered by threshold breaches, anomaly detection, or prediction deadline warnings. Severity ranges from 1 (informational) to 5 (critical action required).",
  predictionPanel:
    "Your open predictions with confidence levels and time remaining. Predictions close to their deadline are flagged in amber/red. Track your forecasting accuracy over time to improve calibration.",
  activeTheses:
    "AI-generated analytical theses synthesizing signals across all layers. Each thesis has a regime classification (risk-on, risk-off, or transitional), confidence level, and validity window. Use these to frame your decision-making.",
  recentTrades:
    "Latest trade executions from your connected broker. Shows direction (buy/sell), quantity, fill status, and whether it ran on demo or live. Cross-reference with active theses and signals.",
} as const;

function LiveCountdown({ since }: { since: string }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    function tick() {
      const diff = Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 1000));
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      setElapsed(m > 0 ? `${m}m ${s.toString().padStart(2, "0")}s` : `${s}s`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [since]);

  return <span>{elapsed}</span>;
}

function RegimeBanner({ regime, threatLevel, timestamp }: { regime: OperatorData["regime"]; threatLevel: number; timestamp: string }) {
  const idx = Math.max(0, Math.min(4, threatLevel - 1));
  const dateStr = new Date(timestamp).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
  const timeStr = new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  return (
    <div className={cn("rounded-md border p-3 overflow-hidden", THREAT_BG[idx])}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <Shield className={cn("h-5 w-5 shrink-0", THREAT_COLORS[idx])} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className={cn("text-xs font-mono font-bold uppercase tracking-wider whitespace-nowrap", THREAT_COLORS[idx])}>
                DEFCON {5 - idx} / {THREAT_LABELS[idx]}
              </span>
              <InfoTooltip content={INFO.regime} side="bottom" iconClassName={THREAT_COLORS[idx].replace("text-", "text-") + "/50"} />
              <span className="text-[10px] font-mono text-navy-500 whitespace-nowrap">{dateStr} {timeStr}</span>
              <span className="text-[10px] font-mono text-navy-600 whitespace-nowrap">
                <LiveCountdown since={timestamp} /> ago
              </span>
            </div>
            {regime && (
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[10px] font-mono uppercase tracking-wider text-navy-400">
                <span>Regime: <span className="text-navy-200">{regime.market.replace("_", " ")}</span></span>
                <span>Vol: <span className="text-navy-200">{regime.volatility}</span></span>
                <span>Convergence: <span className="text-navy-200">{(regime.convergence * 100).toFixed(0)}%</span></span>
                <span>Confidence: <span className="text-navy-200">{(regime.confidence * 100).toFixed(0)}%</span></span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={cn(
                "h-3 w-3 rounded-sm",
                i <= threatLevel ? THREAT_COLORS[idx].replace("text-", "bg-") : "bg-navy-800"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, accent, info, href }: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof Activity;
  accent?: string;
  info?: string;
  href?: string;
}) {
  const card = (
    <div className={cn(
      "rounded-md border border-navy-700/40 bg-navy-950 p-3",
      href && "hover:border-navy-600/60 transition-colors cursor-pointer"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">{label}</span>
          {info && <InfoTooltip content={info} side="bottom" />}
        </div>
        <Icon className={cn("h-3.5 w-3.5", accent || "text-navy-500")} />
      </div>
      <div className={cn("mt-1 text-lg font-bold font-mono", accent || "text-navy-100")}>{value}</div>
      {sub && <div className="text-[10px] text-navy-500 mt-0.5">{sub}</div>}
    </div>
  );

  if (href) {
    return <Link href={href}>{card}</Link>;
  }
  return card;
}

function IntensityBar({ counts }: { counts: number[] }) {
  const max = Math.max(...counts, 1);
  const colors = ["bg-signal-1", "bg-signal-2", "bg-signal-3", "bg-signal-4", "bg-signal-5"];
  const labels = ["1", "2", "3", "4", "5"];
  return (
    <div className="flex items-end gap-1.5 h-10">
      {counts.map((c, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5 flex-1">
          <span className="text-[8px] font-mono text-navy-400">{c}</span>
          <div
            className={cn("w-full rounded-sm min-h-[3px]", colors[i])}
            style={{ height: `${Math.max(3, (c / max) * 28)}px` }}
          />
          <span className="text-[8px] font-mono text-navy-600">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

function SectionHeader({ label, icon: Icon, info, href, badge }: {
  label: string;
  icon?: typeof Activity;
  info?: string;
  href?: string;
  badge?: number;
}) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
          {label}
        </span>
        {badge !== undefined && badge > 0 && (
          <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent-rose/20 px-1 text-[9px] text-accent-rose font-mono">
            {badge}
          </span>
        )}
        {info && <InfoTooltip content={info} side="bottom" />}
      </div>
      <div className="flex items-center gap-1.5">
        {href && (
          <Link href={href} className="text-navy-600 hover:text-navy-400 transition-colors">
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
        {Icon && <Icon className="h-3.5 w-3.5 text-navy-600" />}
      </div>
    </div>
  );
}

function SignalRow({ signal }: { signal: OperatorData["signals"][0] }) {
  const intensityColor = [
    "text-signal-1",
    "text-signal-2",
    "text-signal-3",
    "text-signal-4",
    "text-signal-5",
  ][signal.intensity - 1] || "text-navy-400";

  return (
    <Link href={`/signals/${signal.id}`} className="block">
      <div className="flex items-center gap-2 py-1.5 border-b border-navy-800/50 last:border-0 hover:bg-navy-900/50 transition-colors rounded px-1 -mx-1">
        <div className={cn("w-5 text-center text-xs font-mono font-bold", intensityColor)}>
          {signal.intensity}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-navy-200 truncate">{signal.title}</div>
        </div>
        <span className="text-[10px] font-mono text-navy-500 uppercase">{signal.category.slice(0, 3)}</span>
        <span className={cn(
          "text-[10px] font-mono uppercase",
          signal.status === "active" ? "text-accent-emerald" : "text-navy-500"
        )}>
          {signal.status}
        </span>
      </div>
    </Link>
  );
}

function AlertRow({ alert }: { alert: OperatorData["alerts"]["recent"][0] }) {
  const severityColor = alert.severity >= 4 ? "text-accent-rose" : alert.severity >= 3 ? "text-accent-amber" : "text-navy-400";
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-navy-800/50 last:border-0">
      <AlertTriangle className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", severityColor)} />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-navy-200 truncate">{alert.title}</div>
        <div className="text-[10px] text-navy-500 truncate">{alert.message}</div>
      </div>
      <div className="flex flex-col items-end shrink-0">
        <span className="text-[10px] font-mono text-navy-600">
          {new Date(alert.triggeredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
        <span className={cn("text-[9px] font-mono", severityColor)}>
          SEV {alert.severity}
        </span>
      </div>
    </div>
  );
}

function PredictionRow({ prediction }: { prediction: OperatorData["predictions"]["open"][0] }) {
  const daysLeft = Math.ceil((new Date(prediction.deadline).getTime() - Date.now()) / 86400000);
  const urgency = daysLeft <= 2 ? "text-accent-rose" : daysLeft <= 7 ? "text-accent-amber" : "text-navy-400";
  return (
    <Link href="/predictions" className="block">
      <div className="flex items-center gap-2 py-1.5 border-b border-navy-800/50 last:border-0 hover:bg-navy-900/50 transition-colors rounded px-1 -mx-1">
        <Target className="h-3.5 w-3.5 text-navy-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-navy-200 truncate">{prediction.claim}</div>
          <div className="text-[9px] text-navy-600 uppercase font-mono">{prediction.category}</div>
        </div>
        <span className="text-[10px] font-mono text-accent-cyan">{(prediction.confidence * 100).toFixed(0)}%</span>
        <span className={cn("text-[10px] font-mono", urgency)}>
          {daysLeft > 0 ? `${daysLeft}d` : "DUE"}
        </span>
      </div>
    </Link>
  );
}

function TradeRow({ trade }: { trade: OperatorData["trades"][0] }) {
  return (
    <Link href="/trading" className="block">
      <div className="flex items-center gap-2 py-1.5 border-b border-navy-800/50 last:border-0 hover:bg-navy-900/50 transition-colors rounded px-1 -mx-1">
        {trade.direction === "BUY" ? (
          <ArrowUp className="h-3.5 w-3.5 text-accent-emerald shrink-0" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5 text-accent-rose shrink-0" />
        )}
        <span className="text-xs font-mono text-navy-200 w-16">{trade.ticker}</span>
        <span className="text-[10px] text-navy-400">x{trade.quantity}</span>
        <div className="flex-1" />
        {trade.filledPrice && (
          <span className="text-[10px] font-mono text-navy-400">${trade.filledPrice.toFixed(2)}</span>
        )}
        <span className={cn(
          "text-[10px] font-mono uppercase",
          trade.status === "filled" ? "text-accent-emerald" : trade.status === "rejected" ? "text-accent-rose" : "text-accent-amber"
        )}>
          {trade.status}
        </span>
        <span className="text-[10px] font-mono text-navy-600">
          {trade.environment === "demo" ? "DMO" : "LIVE"}
        </span>
      </div>
    </Link>
  );
}

function EmptyState({ message, actionLabel, actionHref }: { message: string; actionLabel?: string; actionHref?: string }) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <p className="text-[11px] text-navy-600">{message}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-2 text-[10px] font-mono text-accent-cyan hover:text-accent-cyan/80 transition-colors"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

export default function OperatorDashboard() {
  const [data, setData] = useState<OperatorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ upgrade?: boolean; message?: string } | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  async function fetchData() {
    try {
      const res = await fetch("/api/dashboard/operator");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setError(null);
        setLastRefresh(new Date());
      } else {
        const json = await res.json().catch(() => ({}));
        setError({
          upgrade: json.upgrade || res.status === 403,
          message: json.error || "Failed to load operator data",
        });
      }
    } catch {
      setError({ message: "Failed to connect" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    const startPolling = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (document.visibilityState === "visible") {
        intervalRef.current = setInterval(fetchData, 300_000); // 5min
      }
    };
    startPolling();
    document.addEventListener("visibilitychange", startPolling);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", startPolling);
    };
  }, []);

  return (
    <PageContainer
      title="Ops Center"
      subtitle="Unified operational intelligence view"
      actions={
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-[10px] font-mono text-navy-500">
              Updated {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            className="flex items-center gap-1.5 rounded-md border border-navy-700/40 bg-navy-900 px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-navy-300 hover:bg-navy-800 transition-colors"
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      }
    >
      {loading && !data && !error ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-5 w-5 animate-spin text-navy-500" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Shield className="h-8 w-8 text-navy-600 mb-4" />
          <p className="text-sm text-navy-300 mb-2">{error.message}</p>
          {error.upgrade && (
            <a
              href="/settings?tab=subscription"
              className="mt-3 px-4 py-2 text-[11px] font-mono tracking-widest uppercase text-navy-100 bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.1] hover:border-white/[0.15] transition-all"
            >
              Upgrade Plan
            </a>
          )}
        </div>
      ) : data ? (
        <div className="space-y-4">
          {/* Regime Banner */}
          <RegimeBanner regime={data.regime} threatLevel={data.threatLevel} timestamp={data.timestamp} />

          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <StatCard
              label="Threat Level"
              value={data.threatLevel > 0 ? THREAT_LABELS[data.threatLevel - 1] : "NONE"}
              icon={Shield}
              accent={data.threatLevel > 0 ? THREAT_COLORS[data.threatLevel - 1] : undefined}
              info={INFO.threatLevel}
            />
            <StatCard
              label="Active Alerts"
              value={String(data.alerts.active)}
              icon={AlertTriangle}
              accent={data.alerts.active > 0 ? "text-accent-amber" : undefined}
              info={INFO.activeAlerts}
            />
            <StatCard
              label="Open Predictions"
              value={String(data.predictions.open.length)}
              sub={data.predictions.avgScore !== null ? `Brier: ${(data.predictions.avgScore).toFixed(3)}` : undefined}
              icon={Target}
              accent="text-accent-cyan"
              info={INFO.openPredictions}
              href="/predictions"
            />
            <StatCard
              label="Active Signals"
              value={String(data.signals.filter((s) => s.status === "active").length)}
              sub={`${data.signals.length} total recent`}
              icon={Activity}
              info={INFO.activeSignals}
              href="/signals"
            />
            <StatCard
              label="Portfolio P&L"
              value={data.portfolio ? `${data.portfolio.pnl >= 0 ? "+" : ""}$${data.portfolio.pnl.toFixed(2)}` : "N/A"}
              sub={data.portfolio ? `${data.portfolio.pnlPercent >= 0 ? "+" : ""}${data.portfolio.pnlPercent.toFixed(2)}%` : undefined}
              icon={TrendingUp}
              accent={data.portfolio ? (data.portfolio.pnl >= 0 ? "text-accent-emerald" : "text-accent-rose") : undefined}
              info={INFO.portfolioPnl}
              href="/trading"
            />
            <div className="rounded-md border border-navy-700/40 bg-navy-950 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Intensity</span>
                  <InfoTooltip content={INFO.signalIntensity} side="bottom" />
                </div>
                <Zap className="h-3.5 w-3.5 text-navy-500" />
              </div>
              <div className="mt-1.5">
                <IntensityBar counts={data.intensityCounts} />
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Signals Panel */}
            <div className="rounded-md border border-navy-700/40 bg-navy-950 p-3">
              <SectionHeader
                label="Signal Feed"
                icon={Activity}
                info={INFO.signalFeed}
                href="/signals"
              />
              <div className="max-h-64 overflow-y-auto">
                {data.signals.length > 0 ? (
                  data.signals.map((s) => <SignalRow key={s.id} signal={s} />)
                ) : (
                  <EmptyState
                    message="No signals detected yet. The engine scans geopolitical, market, and OSINT sources continuously."
                    actionLabel="View signal engine"
                    actionHref="/signals"
                  />
                )}
              </div>
            </div>

            {/* Alerts Panel */}
            <div className="rounded-md border border-navy-700/40 bg-navy-950 p-3">
              <SectionHeader
                label="Alert Stream"
                icon={AlertTriangle}
                info={INFO.alertStream}
                badge={data.alerts.active}
              />
              <div className="max-h-64 overflow-y-auto">
                {data.alerts.recent.length > 0 ? (
                  data.alerts.recent.map((a) => <AlertRow key={a.id} alert={a} />)
                ) : (
                  <EmptyState message="No alerts triggered. Alerts fire when signal thresholds are breached or anomalies detected." />
                )}
              </div>
            </div>

            {/* Predictions Panel */}
            <div className="rounded-md border border-navy-700/40 bg-navy-950 p-3">
              <SectionHeader
                label="Open Predictions"
                icon={Target}
                info={INFO.predictionPanel}
                href="/predictions"
              />
              {data.predictions.totalResolved > 0 && (
                <div className="flex items-center gap-3 mb-2 pb-2 border-b border-navy-800/50">
                  <span className="text-[9px] font-mono text-navy-500">{data.predictions.totalResolved} resolved</span>
                  {data.predictions.avgScore !== null && (
                    <span className={cn(
                      "text-[9px] font-mono",
                      data.predictions.avgScore <= 0.25 ? "text-accent-emerald" : data.predictions.avgScore <= 0.5 ? "text-accent-amber" : "text-accent-rose"
                    )}>
                      Brier: {data.predictions.avgScore.toFixed(3)}
                    </span>
                  )}
                </div>
              )}
              <div className="max-h-64 overflow-y-auto">
                {data.predictions.open.length > 0 ? (
                  data.predictions.open.map((p) => <PredictionRow key={p.id} prediction={p} />)
                ) : (
                  <EmptyState
                    message="No open predictions. Create predictions in the AI chat to track your forecasting accuracy."
                    actionLabel="Go to predictions"
                    actionHref="/predictions"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Active Theses */}
            <div className="md:col-span-2 rounded-md border border-navy-700/40 bg-navy-950 p-3">
              <SectionHeader
                label="Active Theses"
                icon={BookOpen}
                info={INFO.activeTheses}
              />
              {data.theses.length > 0 ? (
                <div className="space-y-2">
                  {data.theses.map((t) => (
                    <div key={t.id} className="rounded border border-navy-800/50 p-2 hover:border-navy-700/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-navy-200">{t.title}</span>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[10px] font-mono uppercase px-1.5 py-0.5 rounded",
                            t.regime === "risk_off"
                              ? "text-accent-rose bg-accent-rose/10"
                              : t.regime === "risk_on"
                              ? "text-accent-emerald bg-accent-emerald/10"
                              : "text-accent-amber bg-accent-amber/10"
                          )}>
                            {t.regime.replace("_", " ")}
                          </span>
                          <span className="text-[10px] font-mono text-accent-cyan">
                            {(t.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-navy-400 mt-1 line-clamp-2">{t.summary}</p>
                      {t.validUntil && (
                        <div className="mt-1 text-[9px] font-mono text-navy-600">
                          Valid until {new Date(t.validUntil).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  message="No active theses. The AI generates theses when sufficient signal convergence is detected across layers."
                  actionLabel="Ask the analyst"
                  actionHref="/chat"
                />
              )}
            </div>

            {/* Recent Trades */}
            <div className="rounded-md border border-navy-700/40 bg-navy-950 p-3">
              <SectionHeader
                label="Recent Trades"
                icon={TrendingUp}
                info={INFO.recentTrades}
                href="/trading"
              />
              <div className="max-h-64 overflow-y-auto">
                {data.trades.length > 0 ? (
                  data.trades.map((t) => <TradeRow key={t.id} trade={t} />)
                ) : (
                  <EmptyState
                    message="No trades yet. Connect your Trading 212 or Coinbase account to execute trades informed by signals."
                    actionLabel="Configure trading"
                    actionHref="/settings?tab=trading"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-xs text-navy-500 text-center py-20">Failed to load operator data</div>
      )}
    </PageContainer>
  );
}
