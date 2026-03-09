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
} from "lucide-react";
import { cn } from "@/lib/utils";

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
                DEFCON {5 - idx} &mdash; {THREAT_LABELS[idx]}
              </span>
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

function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof Activity;
  accent?: string;
}) {
  return (
    <div className="rounded-md border border-navy-700/40 bg-navy-950 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">{label}</span>
        <Icon className={cn("h-3.5 w-3.5", accent || "text-navy-500")} />
      </div>
      <div className={cn("mt-1 text-lg font-bold font-mono", accent || "text-navy-100")}>{value}</div>
      {sub && <div className="text-[10px] text-navy-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function IntensityBar({ counts }: { counts: number[] }) {
  const max = Math.max(...counts, 1);
  const colors = ["bg-signal-1", "bg-signal-2", "bg-signal-3", "bg-signal-4", "bg-signal-5"];
  return (
    <div className="flex items-end gap-1 h-8">
      {counts.map((c, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5">
          <div
            className={cn("w-4 rounded-sm", colors[i])}
            style={{ height: `${Math.max(4, (c / max) * 32)}px` }}
          />
          <span className="text-[8px] font-mono text-navy-500">{c}</span>
        </div>
      ))}
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
    <div className="flex items-center gap-2 py-1.5 border-b border-navy-800/50 last:border-0">
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
      <span className="text-[10px] font-mono text-navy-600 shrink-0">
        {new Date(alert.triggeredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </span>
    </div>
  );
}

function PredictionRow({ prediction }: { prediction: OperatorData["predictions"]["open"][0] }) {
  const daysLeft = Math.ceil((new Date(prediction.deadline).getTime() - Date.now()) / 86400000);
  const urgency = daysLeft <= 2 ? "text-accent-rose" : daysLeft <= 7 ? "text-accent-amber" : "text-navy-400";
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-navy-800/50 last:border-0">
      <Target className="h-3.5 w-3.5 text-navy-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-navy-200 truncate">{prediction.claim}</div>
      </div>
      <span className="text-[10px] font-mono text-accent-cyan">{(prediction.confidence * 100).toFixed(0)}%</span>
      <span className={cn("text-[10px] font-mono", urgency)}>
        {daysLeft > 0 ? `${daysLeft}d` : "DUE"}
      </span>
    </div>
  );
}

function TradeRow({ trade }: { trade: OperatorData["trades"][0] }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-navy-800/50 last:border-0">
      {trade.direction === "BUY" ? (
        <ArrowUp className="h-3.5 w-3.5 text-accent-emerald shrink-0" />
      ) : (
        <ArrowDown className="h-3.5 w-3.5 text-accent-rose shrink-0" />
      )}
      <span className="text-xs font-mono text-navy-200 w-16">{trade.ticker}</span>
      <span className="text-[10px] text-navy-400">x{trade.quantity}</span>
      <div className="flex-1" />
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
  );
}

export default function OperatorDashboard() {
  const [data, setData] = useState<OperatorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  async function fetchData() {
    try {
      const res = await fetch("/api/dashboard/operator");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastRefresh(new Date());
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 30000); // 30s refresh
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
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
      {loading && !data ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-5 w-5 animate-spin text-navy-500" />
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
            />
            <StatCard
              label="Active Alerts"
              value={String(data.alerts.active)}
              icon={AlertTriangle}
              accent={data.alerts.active > 0 ? "text-accent-amber" : undefined}
            />
            <StatCard
              label="Open Predictions"
              value={String(data.predictions.open.length)}
              sub={data.predictions.avgScore !== null ? `Avg score: ${(data.predictions.avgScore * 100).toFixed(0)}%` : undefined}
              icon={Target}
              accent="text-accent-cyan"
            />
            <StatCard
              label="Active Signals"
              value={String(data.signals.filter((s) => s.status === "active").length)}
              sub={`${data.signals.length} total recent`}
              icon={Activity}
            />
            <StatCard
              label="Portfolio P&L"
              value={data.portfolio ? `${data.portfolio.pnl >= 0 ? "+" : ""}$${data.portfolio.pnl.toFixed(2)}` : "N/A"}
              sub={data.portfolio ? `${data.portfolio.pnlPercent >= 0 ? "+" : ""}${data.portfolio.pnlPercent.toFixed(2)}%` : undefined}
              icon={TrendingUp}
              accent={data.portfolio ? (data.portfolio.pnl >= 0 ? "text-accent-emerald" : "text-accent-rose") : undefined}
            />
            <StatCard
              label="Signal Intensity"
              value={`${data.intensityCounts.reduce((a, b) => a + b, 0)}`}
              icon={Zap}
            />
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Signals Panel */}
            <div className="rounded-md border border-navy-700/40 bg-navy-950 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Signal Feed</span>
                <Activity className="h-3.5 w-3.5 text-navy-600" />
              </div>
              <div className="max-h-64 overflow-y-auto">
                {data.signals.length > 0 ? (
                  data.signals.map((s) => <SignalRow key={s.id} signal={s} />)
                ) : (
                  <div className="text-xs text-navy-600 py-4 text-center">No recent signals</div>
                )}
              </div>
            </div>

            {/* Alerts Panel */}
            <div className="rounded-md border border-navy-700/40 bg-navy-950 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
                  Alert Stream
                  {data.alerts.active > 0 && (
                    <span className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-accent-rose/20 text-[9px] text-accent-rose">
                      {data.alerts.active}
                    </span>
                  )}
                </span>
                <AlertTriangle className="h-3.5 w-3.5 text-navy-600" />
              </div>
              <div className="max-h-64 overflow-y-auto">
                {data.alerts.recent.length > 0 ? (
                  data.alerts.recent.map((a) => <AlertRow key={a.id} alert={a} />)
                ) : (
                  <div className="text-xs text-navy-600 py-4 text-center">No recent alerts</div>
                )}
              </div>
            </div>

            {/* Predictions Panel */}
            <div className="rounded-md border border-navy-700/40 bg-navy-950 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
                  Open Predictions
                </span>
                <Target className="h-3.5 w-3.5 text-navy-600" />
              </div>
              <div className="max-h-64 overflow-y-auto">
                {data.predictions.open.length > 0 ? (
                  data.predictions.open.map((p) => <PredictionRow key={p.id} prediction={p} />)
                ) : (
                  <div className="text-xs text-navy-600 py-4 text-center">No open predictions</div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Active Theses */}
            <div className="md:col-span-2 rounded-md border border-navy-700/40 bg-navy-950 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Active Theses</span>
              </div>
              {data.theses.length > 0 ? (
                <div className="space-y-2">
                  {data.theses.map((t) => (
                    <div key={t.id} className="rounded border border-navy-800/50 p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-navy-200">{t.title}</span>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[10px] font-mono uppercase",
                            t.regime === "risk_off" ? "text-accent-rose" : t.regime === "risk_on" ? "text-accent-emerald" : "text-accent-amber"
                          )}>
                            {t.regime.replace("_", " ")}
                          </span>
                          <span className="text-[10px] font-mono text-accent-cyan">
                            {(t.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-navy-400 mt-1 line-clamp-2">{t.summary}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-navy-600 py-4 text-center">No active theses</div>
              )}
            </div>

            {/* Recent Trades */}
            <div className="rounded-md border border-navy-700/40 bg-navy-950 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Recent Trades</span>
                <TrendingUp className="h-3.5 w-3.5 text-navy-600" />
              </div>
              <div className="max-h-64 overflow-y-auto">
                {data.trades.length > 0 ? (
                  data.trades.map((t) => <TradeRow key={t.id} trade={t} />)
                ) : (
                  <div className="text-xs text-navy-600 py-4 text-center">No recent trades</div>
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
