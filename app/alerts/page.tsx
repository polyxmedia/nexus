"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Bell,
  Plus,
  RefreshCw,
  Loader2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Clock,
  AlertTriangle,
  Check,
  X,
  TrendingUp,
  Activity,
  Target,
  Search as SearchIcon,
  Gauge,
  Sparkles,
  Zap,
  ChevronRight,
} from "lucide-react";
import { UpgradeGate } from "@/components/subscription/upgrade-gate";

interface Alert {
  id: number;
  name: string;
  type: string;
  condition: string;
  enabled: number;
  lastTriggered: string | null;
  triggerCount: number;
  cooldownMinutes: number;
  createdAt: string;
}

interface AlertHistoryItem {
  id: number;
  alertId: number;
  triggeredAt: string;
  title: string;
  message: string;
  severity: number;
  data: string | null;
  dismissed: number;
}

interface AlertSuggestion {
  name: string;
  type: string;
  condition: Record<string, unknown>;
  cooldownMinutes: number;
  reasoning: string;
  urgency: "high" | "medium" | "low";
  relatedSignals: string[];
}

const ALERT_TYPES = [
  { value: "price_threshold", label: "Price Threshold", icon: TrendingUp, description: "Trigger when a ticker crosses a price level" },
  { value: "vix_level", label: "VIX Level", icon: Gauge, description: "Trigger when VIX exceeds a level" },
  { value: "signal_intensity", label: "Signal Intensity", icon: Activity, description: "Trigger on high-intensity signals" },
  { value: "prediction_due", label: "Prediction Due", icon: Target, description: "Alert when predictions approach deadline" },
  { value: "osint_keyword", label: "OSINT Keyword", icon: SearchIcon, description: "Monitor GDELT for keywords" },
];

const SEVERITY_BADGE = [
  "",
  "bg-navy-700 text-navy-300",
  "bg-accent-cyan/15 text-accent-cyan",
  "bg-accent-amber/15 text-accent-amber",
  "bg-accent-rose/15 text-accent-rose",
  "bg-signal-5/15 text-signal-5",
];

const URGENCY_STYLES = {
  high: "border-accent-rose/30 bg-accent-rose/[0.04]",
  medium: "border-accent-amber/30 bg-accent-amber/[0.04]",
  low: "border-navy-700 bg-navy-900/60",
};

const URGENCY_BADGE = {
  high: "bg-accent-rose/15 text-accent-rose",
  medium: "bg-accent-amber/15 text-accent-amber",
  low: "bg-navy-700 text-navy-400",
};

function safeParse(json: string | null): Record<string, unknown> {
  if (!json) return {};
  try { return JSON.parse(json); } catch { return {}; }
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [history, setHistory] = useState<AlertHistoryItem[]>([]);
  const [suggestions, setSuggestions] = useState<AlertSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<"rules" | "history">("rules");
  const [addingIdx, setAddingIdx] = useState<number | null>(null);

  // Create form
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("signal_intensity");
  const [newCooldown, setNewCooldown] = useState(60);
  const [newCondition, setNewCondition] = useState<Record<string, unknown>>({});

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const [alertsRes, historyRes] = await Promise.all([
        fetch("/api/alerts"),
        fetch("/api/alerts?view=history"),
      ]);
      const alertsJson = await alertsRes.json();
      const historyJson = await historyRes.json();
      setAlerts(alertsJson.alerts || []);
      setHistory(historyJson.history || []);
    } catch {
      // fail
    }
    setLoading(false);
  }, []);

  const fetchSuggestions = useCallback(async () => {
    setLoadingSuggestions(true);
    try {
      const res = await fetch("/api/alerts/suggestions");
      const json = await res.json();
      setSuggestions(json.suggestions || []);
    } catch {
      // fail
    }
    setLoadingSuggestions(false);
  }, []);

  useEffect(() => {
    fetchAlerts();
    fetchSuggestions();
  }, [fetchAlerts, fetchSuggestions]);

  const evaluateNow = async () => {
    setEvaluating(true);
    try {
      await fetch("/api/alerts?action=evaluate", { method: "POST" });
      await fetchAlerts();
    } catch {
      // fail
    }
    setEvaluating(false);
  };

  const createAlert = async () => {
    if (!newName.trim()) return;
    try {
      await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          type: newType,
          condition: newCondition,
          cooldownMinutes: newCooldown,
        }),
      });
      setShowCreate(false);
      setNewName("");
      setNewCondition({});
      await fetchAlerts();
    } catch {
      // fail
    }
  };

  const addSuggestion = async (suggestion: AlertSuggestion, idx: number) => {
    setAddingIdx(idx);
    try {
      await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: suggestion.name,
          type: suggestion.type,
          condition: suggestion.condition,
          cooldownMinutes: suggestion.cooldownMinutes,
        }),
      });
      // Remove from suggestions
      setSuggestions((prev) => prev.filter((_, i) => i !== idx));
      await fetchAlerts();
    } catch {
      // fail
    }
    setAddingIdx(null);
  };

  const toggleAlert = async (alert: Alert) => {
    try {
      await fetch("/api/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: alert.id, enabled: alert.enabled ? 0 : 1 }),
      });
      await fetchAlerts();
    } catch {
      // fail
    }
  };

  const removeAlert = async (id: number) => {
    try {
      await fetch(`/api/alerts?id=${id}`, { method: "DELETE" });
      await fetchAlerts();
    } catch {
      // fail
    }
  };

  const dismissHistoryItem = async (id: number) => {
    try {
      await fetch("/api/alerts?action=dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await fetchAlerts();
    } catch {
      // fail
    }
  };

  const undismissedCount = history.filter(h => !h.dismissed).length;

  // Render condition fields based on type
  function renderConditionFields() {
    switch (newType) {
      case "price_threshold":
        return (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider">Ticker</label>
              <input
                type="text"
                value={(newCondition.ticker as string) || ""}
                onChange={(e) => setNewCondition(c => ({ ...c, ticker: e.target.value.toUpperCase() }))}
                placeholder="SPY"
                className="mt-1 w-full bg-navy-800 border border-navy-700 rounded px-2 py-1.5 text-xs text-navy-200 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider">Direction</label>
              <select
                value={(newCondition.direction as string) || "above"}
                onChange={(e) => setNewCondition(c => ({ ...c, direction: e.target.value }))}
                className="mt-1 w-full bg-navy-800 border border-navy-700 rounded px-2 py-1.5 text-xs text-navy-200 outline-none"
              >
                <option value="above">Above</option>
                <option value="below">Below</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider">Price</label>
              <input
                type="number"
                value={(newCondition.threshold as number) || ""}
                onChange={(e) => setNewCondition(c => ({ ...c, threshold: parseFloat(e.target.value) }))}
                placeholder="500.00"
                className="mt-1 w-full bg-navy-800 border border-navy-700 rounded px-2 py-1.5 text-xs text-navy-200 outline-none"
              />
            </div>
          </div>
        );
      case "vix_level":
        return (
          <div>
            <label className="text-[10px] text-navy-500 uppercase tracking-wider">VIX Threshold</label>
            <input
              type="number"
              value={(newCondition.vixLevel as number) || ""}
              onChange={(e) => setNewCondition(c => ({ ...c, vixLevel: parseFloat(e.target.value) }))}
              placeholder="25"
              className="mt-1 w-48 bg-navy-800 border border-navy-700 rounded px-2 py-1.5 text-xs text-navy-200 outline-none"
            />
          </div>
        );
      case "signal_intensity":
        return (
          <div>
            <label className="text-[10px] text-navy-500 uppercase tracking-wider">Min Intensity (1-5)</label>
            <input
              type="number"
              min={1}
              max={5}
              value={(newCondition.minIntensity as number) || 4}
              onChange={(e) => setNewCondition(c => ({ ...c, minIntensity: parseInt(e.target.value) }))}
              className="mt-1 w-48 bg-navy-800 border border-navy-700 rounded px-2 py-1.5 text-xs text-navy-200 outline-none"
            />
          </div>
        );
      case "prediction_due":
        return (
          <div>
            <label className="text-[10px] text-navy-500 uppercase tracking-wider">Days before deadline</label>
            <input
              type="number"
              value={(newCondition.daysBeforeDeadline as number) || 3}
              onChange={(e) => setNewCondition(c => ({ ...c, daysBeforeDeadline: parseInt(e.target.value) }))}
              className="mt-1 w-48 bg-navy-800 border border-navy-700 rounded px-2 py-1.5 text-xs text-navy-200 outline-none"
            />
          </div>
        );
      case "osint_keyword":
        return (
          <div>
            <label className="text-[10px] text-navy-500 uppercase tracking-wider">Keywords (comma-separated)</label>
            <input
              type="text"
              value={((newCondition.keywords as string[]) || []).join(", ")}
              onChange={(e) => setNewCondition(c => ({ ...c, keywords: e.target.value.split(",").map(k => k.trim()).filter(Boolean) }))}
              placeholder="nuclear, sanctions, OPEC"
              className="mt-1 w-full bg-navy-800 border border-navy-700 rounded px-2 py-1.5 text-xs text-navy-200 outline-none"
            />
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="ml-48 min-h-screen bg-navy-950">
      <UpgradeGate minTier="analyst" feature="Alert configuration">
      {/* Header */}
      <div className="border-b border-navy-700 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="h-5 w-5 text-accent-cyan" />
            {undismissedCount > 0 && (
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-accent-rose text-white text-[8px] flex items-center justify-center font-bold">
                {undismissedCount}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-sm font-bold text-navy-100 tracking-wide">Alerts</h1>
            <p className="text-[10px] text-navy-500 uppercase tracking-wider">
              {alerts.length} rules, {history.length} triggered
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={evaluateNow}
            disabled={evaluating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-accent-amber/10 border border-accent-amber/30 text-xs text-accent-amber hover:bg-accent-amber/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${evaluating ? "animate-spin" : ""}`} />
            Evaluate Now
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-navy-100 text-navy-950 text-xs font-medium hover:bg-white transition-colors"
          >
            <Plus className="h-3 w-3" />
            New Alert
          </button>
        </div>
      </div>

      {/* Suggested Alerts */}
      <div className="px-6 pt-5 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent-amber" />
            <h2 className="text-xs font-bold text-navy-200 uppercase tracking-wider">
              AI Suggested Alerts
            </h2>
            {suggestions.length > 0 && (
              <span className="text-[9px] font-mono text-navy-500 bg-navy-800 px-1.5 py-0.5 rounded">
                {suggestions.length} suggestions
              </span>
            )}
          </div>
          <button
            onClick={fetchSuggestions}
            disabled={loadingSuggestions}
            className="flex items-center gap-1.5 text-[10px] text-navy-500 hover:text-navy-300 transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${loadingSuggestions ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {loadingSuggestions && suggestions.length === 0 ? (
          <div className="flex items-center justify-center py-10 gap-2 text-navy-500 text-xs border border-navy-800/50 rounded-lg bg-navy-900/30">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing signals and generating suggestions...
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-6 border border-navy-800/50 rounded-lg bg-navy-900/30">
            <Sparkles className="h-5 w-5 text-navy-700 mx-auto mb-2" />
            <p className="text-[11px] text-navy-500">No suggestions right now. Click refresh to generate based on current signals.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
            {suggestions.map((suggestion, idx) => {
              const typeConfig = ALERT_TYPES.find(t => t.value === suggestion.type);
              const Icon = typeConfig?.icon || Bell;
              const isAdding = addingIdx === idx;

              return (
                <div
                  key={idx}
                  className={`border rounded-lg p-3.5 transition-all ${URGENCY_STYLES[suggestion.urgency]}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className="mt-0.5 shrink-0">
                        <Icon className="h-3.5 w-3.5 text-accent-cyan" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xs font-semibold text-navy-100">{suggestion.name}</h3>
                          <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider ${URGENCY_BADGE[suggestion.urgency]}`}>
                            {suggestion.urgency}
                          </span>
                        </div>
                        <p className="text-[10px] text-navy-400 mt-1 leading-relaxed">
                          {suggestion.reasoning}
                        </p>
                        {suggestion.relatedSignals && suggestion.relatedSignals.length > 0 && (
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            <Zap className="h-2.5 w-2.5 text-navy-600 shrink-0" />
                            {suggestion.relatedSignals.slice(0, 2).map((sig, i) => (
                              <span key={i} className="text-[8px] font-mono text-navy-500 bg-navy-800/60 px-1.5 py-0.5 rounded truncate max-w-[180px]">
                                {sig}
                              </span>
                            ))}
                            {suggestion.relatedSignals.length > 2 && (
                              <span className="text-[8px] text-navy-600">+{suggestion.relatedSignals.length - 2}</span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[9px] font-mono text-navy-500">{typeConfig?.label || suggestion.type}</span>
                          <span className="text-[9px] font-mono text-navy-600">Cooldown: {suggestion.cooldownMinutes}min</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => addSuggestion(suggestion, idx)}
                      disabled={isAdding}
                      className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded bg-navy-100 text-navy-950 text-[10px] font-mono font-medium hover:bg-white transition-colors disabled:opacity-50"
                    >
                      {isAdding ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Plus className="h-3 w-3" />
                          Add
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="px-6 py-2">
        <div className="border-t border-navy-800/50" />
      </div>

      {/* Tabs */}
      <div className="px-6 flex gap-4 border-b border-navy-800">
        <button
          onClick={() => setTab("rules")}
          className={`pb-3 text-xs font-medium border-b-2 transition-colors ${
            tab === "rules"
              ? "border-accent-cyan text-accent-cyan"
              : "border-transparent text-navy-500 hover:text-navy-300"
          }`}
        >
          Alert Rules ({alerts.length})
        </button>
        <button
          onClick={() => setTab("history")}
          className={`pb-3 text-xs font-medium border-b-2 transition-colors relative ${
            tab === "history"
              ? "border-accent-cyan text-accent-cyan"
              : "border-transparent text-navy-500 hover:text-navy-300"
          }`}
        >
          History ({history.length})
          {undismissedCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[9px] rounded-full bg-accent-rose/20 text-accent-rose">
              {undismissedCount}
            </span>
          )}
        </button>
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-navy-500 text-xs">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading alerts...
          </div>
        ) : tab === "rules" ? (
          /* Rules tab */
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="text-center py-16">
                <Bell className="h-8 w-8 text-navy-700 mx-auto mb-3" />
                <p className="text-sm text-navy-500">No alert rules configured</p>
                <p className="text-[10px] text-navy-600 mt-1">Create one to start monitoring, or add a suggestion above</p>
              </div>
            ) : (
              alerts.map((alert) => {
                const condition = safeParse(alert.condition);
                const typeConfig = ALERT_TYPES.find(t => t.value === alert.type);
                const Icon = typeConfig?.icon || Bell;

                return (
                  <div
                    key={alert.id}
                    className={`border rounded-lg px-4 py-3 transition-colors ${
                      alert.enabled
                        ? "border-navy-700 bg-navy-900/60"
                        : "border-navy-800 bg-navy-900/30 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-accent-cyan" />
                        <div>
                          <h3 className="text-xs font-semibold text-navy-100">{alert.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-navy-500 uppercase">{typeConfig?.label || alert.type}</span>
                            <span className="text-[9px] text-navy-600">
                              Cooldown: {alert.cooldownMinutes}min
                            </span>
                            {alert.triggerCount > 0 && (
                              <span className="text-[9px] text-accent-amber">
                                Triggered {alert.triggerCount}x
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {alert.lastTriggered && (
                          <span className="text-[9px] text-navy-600 font-mono">
                            Last: {new Date(alert.lastTriggered).toLocaleDateString()}
                          </span>
                        )}
                        <button
                          onClick={() => toggleAlert(alert)}
                          className="text-navy-500 hover:text-navy-300 transition-colors"
                        >
                          {alert.enabled ? (
                            <ToggleRight className="h-5 w-5 text-accent-emerald" />
                          ) : (
                            <ToggleLeft className="h-5 w-5" />
                          )}
                        </button>
                        <button
                          onClick={() => removeAlert(alert.id)}
                          className="text-navy-600 hover:text-accent-rose transition-colors p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Condition summary */}
                    <div className="mt-2 text-[10px] text-navy-500 font-mono bg-navy-800/40 rounded px-2 py-1">
                      {Object.entries(condition).map(([k, v]) => (
                        <span key={k} className="mr-3">
                          {k}: <span className="text-navy-300">{String(v)}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* History tab */
          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="text-center py-16">
                <Clock className="h-8 w-8 text-navy-700 mx-auto mb-3" />
                <p className="text-sm text-navy-500">No alert history</p>
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className={`border rounded-lg px-4 py-3 transition-colors ${
                    item.dismissed
                      ? "border-navy-800 bg-navy-900/30 opacity-50"
                      : "border-navy-700 bg-navy-900/60"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <AlertTriangle
                        className="h-3.5 w-3.5 mt-0.5 shrink-0"
                        style={{ color: ["", "#64748b", "#06b6d4", "#f59e0b", "#f43f5e", "#ef4444"][item.severity] || "#64748b" }}
                      />
                      <div>
                        <h3 className="text-xs font-medium text-navy-100">{item.title}</h3>
                        <p className="text-[10px] text-navy-500 mt-0.5">{item.message}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[9px] font-mono text-navy-600">
                            {new Date(item.triggeredAt).toLocaleString()}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${SEVERITY_BADGE[item.severity] || SEVERITY_BADGE[1]}`}>
                            Severity {item.severity}
                          </span>
                        </div>
                      </div>
                    </div>

                    {!item.dismissed && (
                      <button
                        onClick={() => dismissHistoryItem(item.id)}
                        className="text-navy-600 hover:text-navy-300 transition-colors p-1"
                        title="Dismiss"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Create Alert Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[500px] bg-navy-900 border border-navy-700 rounded-xl shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-navy-700">
              <h2 className="text-sm font-bold text-navy-100">Create Alert Rule</h2>
              <button onClick={() => setShowCreate(false)} className="text-navy-500 hover:text-navy-300">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Name */}
              <div>
                <label className="text-[10px] text-navy-500 uppercase tracking-wider">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="My alert rule..."
                  className="mt-1 w-full bg-navy-800 border border-navy-700 rounded px-3 py-2 text-xs text-navy-200 outline-none focus:border-accent-cyan/50"
                />
              </div>

              {/* Type */}
              <div>
                <label className="text-[10px] text-navy-500 uppercase tracking-wider">Alert Type</label>
                <div className="grid grid-cols-1 gap-2 mt-1.5">
                  {ALERT_TYPES.map(type => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        onClick={() => { setNewType(type.value); setNewCondition({}); }}
                        className={`flex items-center gap-3 px-3 py-2 rounded border text-left transition-colors ${
                          newType === type.value
                            ? "border-accent-cyan/40 bg-accent-cyan/5"
                            : "border-navy-700 bg-navy-800/50 hover:border-navy-600"
                        }`}
                      >
                        <Icon className={`h-3.5 w-3.5 ${newType === type.value ? "text-accent-cyan" : "text-navy-500"}`} />
                        <div>
                          <div className="text-xs text-navy-200">{type.label}</div>
                          <div className="text-[9px] text-navy-500">{type.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Condition fields */}
              <div>
                <label className="text-[10px] text-navy-500 uppercase tracking-wider">Condition</label>
                <div className="mt-1.5">
                  {renderConditionFields()}
                </div>
              </div>

              {/* Cooldown */}
              <div>
                <label className="text-[10px] text-navy-500 uppercase tracking-wider">Cooldown (minutes)</label>
                <input
                  type="number"
                  value={newCooldown}
                  onChange={(e) => setNewCooldown(parseInt(e.target.value) || 60)}
                  className="mt-1 w-32 bg-navy-800 border border-navy-700 rounded px-2 py-1.5 text-xs text-navy-200 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-navy-700">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded text-xs text-navy-400 hover:text-navy-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createAlert}
                disabled={!newName.trim()}
                className="px-4 py-2 rounded bg-navy-100 text-navy-950 text-xs font-medium hover:bg-white transition-colors disabled:opacity-50"
              >
                Create Alert
              </button>
            </div>
          </div>
        </div>
      )}
      </UpgradeGate>
    </div>
  );
}
