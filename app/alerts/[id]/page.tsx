"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  AlertTriangle,
  Check,
  Clock,
  TrendingUp,
  Activity,
  Target,
  Search as SearchIcon,
  Gauge,
  MessageSquare,
  Smartphone,
  Loader2,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
} from "lucide-react";

interface AlertRule {
  id: number;
  userId: string | null;
  name: string;
  type: string;
  condition: string;
  enabled: number;
  lastTriggered: string | null;
  triggerCount: number;
  cooldownMinutes: number;
  notifyTelegram: number;
  notifySms: number;
  createdAt: string;
}

interface AlertHistoryItem {
  id: number;
  uid: string;
  alertId: number;
  triggeredAt: string;
  title: string;
  message: string;
  severity: number;
  data: string | null;
  dismissed: number;
}

const ALERT_TYPE_META: Record<string, { label: string; icon: typeof Bell }> = {
  price_threshold: { label: "Price Threshold", icon: TrendingUp },
  vix_level: { label: "VIX Level", icon: Gauge },
  signal_intensity: { label: "Signal Intensity", icon: Activity },
  prediction_due: { label: "Prediction Due", icon: Target },
  osint_keyword: { label: "OSINT Keyword", icon: SearchIcon },
};

const SEVERITY_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: "Low", color: "text-navy-400", bg: "bg-navy-700" },
  2: { label: "Moderate", color: "text-accent-cyan", bg: "bg-accent-cyan/15" },
  3: { label: "Elevated", color: "text-accent-amber", bg: "bg-accent-amber/15" },
  4: { label: "High", color: "text-accent-rose", bg: "bg-accent-rose/15" },
  5: { label: "Critical", color: "text-red-400", bg: "bg-red-500/15" },
};

function safeParse(json: string | null): Record<string, unknown> {
  if (!json) return {};
  try { return JSON.parse(json); } catch { return {}; }
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatConditionValue(key: string, value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function conditionLabel(key: string): string {
  const labels: Record<string, string> = {
    ticker: "Ticker",
    direction: "Direction",
    threshold: "Price Level",
    vixLevel: "VIX Threshold",
    minIntensity: "Min Intensity",
    daysBeforeDeadline: "Days Before Deadline",
    keywords: "Keywords",
    lat: "Latitude",
    lng: "Longitude",
    radiusKm: "Radius (km)",
    expression: "Expression",
  };
  return labels[key] || key;
}

export default function AlertDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [history, setHistory] = useState<AlertHistoryItem | null>(null);
  const [alert, setAlert] = useState<AlertRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/alerts/history/${id}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to load alert");
        setLoading(false);
        return;
      }
      const json = await res.json();
      setHistory(json.history);
      setAlert(json.alert);
      setError(null);
    } catch {
      setError("Network error loading alert");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const dismiss = async () => {
    if (!history || history.dismissed) return;
    setDismissing(true);
    try {
      await fetch(`/api/alerts/history/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss" }),
      });
      setHistory((prev) => prev ? { ...prev, dismissed: 1 } : prev);
    } catch {
      // fail silently
    }
    setDismissing(false);
  };

  if (loading) {
    return (
      <div className="ml-0 md:ml-48 min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="flex items-center gap-2 text-navy-500 text-xs">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading alert...
        </div>
      </div>
    );
  }

  if (error || !history || !alert) {
    return (
      <div className="ml-0 md:ml-48 min-h-screen bg-navy-950 pt-12 md:pt-0">
        <div className="border-b border-navy-700 px-6 h-16 flex items-center">
          <button onClick={() => router.push("/alerts")} className="flex items-center gap-2 text-xs text-navy-400 hover:text-navy-200 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Alerts
          </button>
        </div>
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-navy-700 mx-auto mb-3" />
            <p className="text-sm text-navy-500">{error || "Alert not found"}</p>
          </div>
        </div>
      </div>
    );
  }

  const typeMeta = ALERT_TYPE_META[alert.type] || { label: alert.type, icon: Bell };
  const TypeIcon = typeMeta.icon;
  const severity = SEVERITY_CONFIG[history.severity] || SEVERITY_CONFIG[3];
  const condition = safeParse(alert.condition);
  const triggerData = safeParse(history.data);
  const conditionEntries = Object.entries(condition).filter(([, v]) => v !== undefined && v !== null && v !== "");

  return (
    <div className="ml-0 md:ml-48 min-h-screen bg-navy-950 pt-12 md:pt-0">
      {/* Header */}
      <div className="border-b border-navy-700 px-6 h-16 flex items-center justify-between">
        <button onClick={() => router.push("/alerts")} className="flex items-center gap-2 text-xs text-navy-400 hover:text-navy-200 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Alerts
        </button>
        <div className="flex items-center gap-2">
          {!history.dismissed ? (
            <button
              onClick={dismiss}
              disabled={dismissing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-accent-emerald/10 border border-accent-emerald/30 text-xs text-accent-emerald hover:bg-accent-emerald/20 transition-colors disabled:opacity-50"
            >
              {dismissing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Dismiss
            </button>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-navy-800 text-xs text-navy-500">
              <Check className="h-3 w-3" />
              Dismissed
            </span>
          )}
        </div>
      </div>

      <div className="px-6 py-6 max-w-4xl">
        {/* Severity + Title */}
        <div className="flex items-start gap-4 mb-6">
          <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${severity.bg}`}>
            <AlertTriangle className={`h-5 w-5 ${severity.color}`} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold text-navy-100 leading-tight">{history.title}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase tracking-wider ${severity.bg} ${severity.color}`}>
                Severity {history.severity} - {severity.label}
              </span>
              <span className="text-[10px] font-mono text-navy-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTimestamp(history.triggeredAt)}
              </span>
              {!history.dismissed && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-amber/10 text-accent-amber uppercase tracking-wider">
                  Active
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="mb-6">
          <h2 className="text-[10px] font-mono text-navy-500 uppercase tracking-wider mb-2">Message</h2>
          <div className="bg-navy-900/60 border border-navy-800 rounded-lg px-4 py-3">
            <p className="text-sm text-navy-200 leading-relaxed whitespace-pre-wrap">{history.message}</p>
          </div>
        </div>

        {/* Two-column: Alert Rule + Trigger Data */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Parent Alert Rule */}
          <div className="bg-navy-900/60 border border-navy-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <TypeIcon className="h-3.5 w-3.5 text-accent-cyan" />
              <h2 className="text-[10px] font-mono text-navy-500 uppercase tracking-wider">Alert Rule</h2>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] text-navy-600 uppercase tracking-wider">Name</span>
                <p className="text-xs text-navy-200 mt-0.5">{alert.name}</p>
              </div>

              <div className="flex items-center gap-4">
                <div>
                  <span className="text-[10px] text-navy-600 uppercase tracking-wider">Type</span>
                  <p className="text-xs text-navy-200 mt-0.5">{typeMeta.label}</p>
                </div>
                <div>
                  <span className="text-[10px] text-navy-600 uppercase tracking-wider">Status</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    {alert.enabled ? (
                      <ToggleRight className="h-4 w-4 text-accent-emerald" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-navy-600" />
                    )}
                    <span className={`text-xs ${alert.enabled ? "text-accent-emerald" : "text-navy-500"}`}>
                      {alert.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div>
                  <span className="text-[10px] text-navy-600 uppercase tracking-wider">Cooldown</span>
                  <p className="text-xs text-navy-200 mt-0.5">{alert.cooldownMinutes} min</p>
                </div>
                <div>
                  <span className="text-[10px] text-navy-600 uppercase tracking-wider">Total Triggers</span>
                  <p className="text-xs text-accent-amber mt-0.5">{alert.triggerCount}x</p>
                </div>
              </div>

              {/* Notification channels */}
              <div>
                <span className="text-[10px] text-navy-600 uppercase tracking-wider">Notifications</span>
                <div className="flex items-center gap-2 mt-1">
                  {alert.notifyTelegram ? (
                    <span className="flex items-center gap-1 text-[10px] text-accent-cyan bg-accent-cyan/10 px-2 py-0.5 rounded">
                      <MessageSquare className="h-3 w-3" /> Telegram
                    </span>
                  ) : null}
                  {alert.notifySms ? (
                    <span className="flex items-center gap-1 text-[10px] text-accent-cyan bg-accent-cyan/10 px-2 py-0.5 rounded">
                      <Smartphone className="h-3 w-3" /> SMS
                    </span>
                  ) : null}
                  {!alert.notifyTelegram && !alert.notifySms && (
                    <span className="text-[10px] text-navy-600">In-app only</span>
                  )}
                </div>
              </div>

              {/* Condition breakdown */}
              {conditionEntries.length > 0 && (
                <div>
                  <span className="text-[10px] text-navy-600 uppercase tracking-wider">Condition</span>
                  <div className="mt-1.5 space-y-1">
                    {conditionEntries.map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between bg-navy-800/50 rounded px-2.5 py-1.5">
                        <span className="text-[10px] font-mono text-navy-500">{conditionLabel(key)}</span>
                        <span className="text-[10px] font-mono text-navy-200">{formatConditionValue(key, value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {alert.createdAt && (
                <div>
                  <span className="text-[10px] text-navy-600 uppercase tracking-wider">Rule Created</span>
                  <p className="text-[10px] font-mono text-navy-500 mt-0.5">{formatTimestamp(alert.createdAt)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Trigger Data Snapshot */}
          <div className="bg-navy-900/60 border border-navy-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-3.5 w-3.5 text-accent-amber" />
              <h2 className="text-[10px] font-mono text-navy-500 uppercase tracking-wider">Trigger Data</h2>
            </div>

            {Object.keys(triggerData).length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-[11px] text-navy-600">No data snapshot captured for this trigger</p>
              </div>
            ) : (
              <div className="space-y-1">
                {Object.entries(triggerData).map(([key, value]) => {
                  // If value is an object/array, render as formatted JSON
                  const isComplex = typeof value === "object" && value !== null;

                  return (
                    <div key={key} className="bg-navy-800/50 rounded px-2.5 py-2">
                      <span className="text-[10px] font-mono text-navy-500 block mb-0.5">{key}</span>
                      {isComplex ? (
                        <pre className="text-[10px] font-mono text-navy-200 whitespace-pre-wrap break-words leading-relaxed">
                          {JSON.stringify(value, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-xs text-navy-200">{String(value)}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Timeline context */}
        <div className="bg-navy-900/60 border border-navy-800 rounded-lg p-4">
          <h2 className="text-[10px] font-mono text-navy-500 uppercase tracking-wider mb-3">Timeline</h2>
          <div className="relative pl-4 border-l border-navy-800 space-y-3">
            <div className="relative">
              <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-navy-700 border-2 border-navy-900" />
              <span className="text-[10px] text-navy-600 font-mono">{formatTimestamp(alert.createdAt)}</span>
              <p className="text-[11px] text-navy-400 mt-0.5">Alert rule &quot;{alert.name}&quot; created</p>
            </div>
            <div className="relative">
              <div className={`absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full border-2 border-navy-900 ${severity.bg.replace("/15", "/40").replace("/10", "/40")}`}
                style={{ backgroundColor: history.severity >= 4 ? "rgba(244,63,94,0.4)" : history.severity >= 3 ? "rgba(245,158,11,0.4)" : "rgba(6,182,212,0.3)" }}
              />
              <span className="text-[10px] text-navy-600 font-mono">{formatTimestamp(history.triggeredAt)}</span>
              <p className="text-[11px] text-navy-300 mt-0.5">Alert triggered (severity {history.severity})</p>
            </div>
            {history.dismissed ? (
              <div className="relative">
                <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-accent-emerald/40 border-2 border-navy-900" />
                <span className="text-[10px] text-navy-600 font-mono">Acknowledged</span>
                <p className="text-[11px] text-navy-400 mt-0.5">Alert dismissed by user</p>
              </div>
            ) : null}
            {alert.lastTriggered && alert.lastTriggered !== history.triggeredAt && (
              <div className="relative">
                <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-navy-700 border-2 border-navy-900" />
                <span className="text-[10px] text-navy-600 font-mono">{formatTimestamp(alert.lastTriggered)}</span>
                <p className="text-[11px] text-navy-400 mt-0.5">Most recent trigger of this rule</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
