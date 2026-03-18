"use client";

import { useEffect, useState, useCallback } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Crosshair,
  DollarSign,
  Loader2,
  MessageSquare,
  Pause,
  Play,
  Plus,
  Radar,
  Shield,
  Trash2,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──

interface TriggerConfig {
  category?: string;
  minIntensity?: number;
  keywords?: string[];
  outcome?: string;
  minConfidence?: number;
  scenarioId?: string;
  minLevel?: number;
  direction?: string;
  topic?: string;
  sentimentThreshold?: number;
  sentimentDirection?: string;
  symbol?: string;
  priceLevel?: number;
  priceDirection?: string;
  intervalHours?: number;
}

interface ActionConfig {
  type: string;
  config: Record<string, unknown>;
}

interface AutomationRule {
  id: number;
  uuid: string;
  name: string;
  description: string | null;
  enabled: boolean;
  triggerType: string;
  triggerConfig: TriggerConfig;
  actions: ActionConfig[];
  lastTriggeredAt: string | null;
  triggerCount: number;
  lastError: string | null;
  cooldownMinutes: number;
  createdBy: string | null;
  createdAt: string;
}

// ── Config Maps ──

const TRIGGER_TYPES = [
  { id: "signal_threshold", label: "Signal Threshold", icon: Activity, description: "When signal intensity reaches a level" },
  { id: "prediction_resolved", label: "Prediction Resolved", icon: Crosshair, description: "When a prediction is confirmed/denied" },
  { id: "iw_level_change", label: "I&W Level Change", icon: Shield, description: "When an I&W scenario escalates" },
  { id: "sentiment_shift", label: "Sentiment Shift", icon: Radar, description: "When social sentiment crosses a threshold" },
  { id: "price_alert", label: "Price Alert", icon: DollarSign, description: "When an asset price crosses a level" },
  { id: "schedule", label: "Schedule", icon: Clock, description: "Run on a recurring interval" },
];

const ACTION_TYPES = [
  { id: "send_telegram", label: "Send Telegram Alert", icon: MessageSquare },
  { id: "run_analysis", label: "Log for Analyst Review", icon: Activity },
  { id: "generate_predictions", label: "Generate Predictions", icon: Crosshair },
  { id: "update_iw", label: "Update I&W Indicator", icon: Shield },
  { id: "log", label: "Write to Knowledge Bank", icon: TrendingUp },
];

const TRIGGER_ICONS: Record<string, typeof Activity> = {
  signal_threshold: Activity,
  prediction_resolved: Crosshair,
  iw_level_change: Shield,
  sentiment_shift: Radar,
  price_alert: DollarSign,
  schedule: Clock,
};

// ── Helpers ──

function triggerSummary(rule: AutomationRule): string {
  const cfg = rule.triggerConfig;
  switch (rule.triggerType) {
    case "signal_threshold":
      return `Signal intensity >= ${cfg.minIntensity || "?"}${cfg.category ? ` in ${cfg.category}` : ""}${cfg.keywords?.length ? ` matching "${cfg.keywords.join(", ")}"` : ""}`;
    case "prediction_resolved":
      return `Prediction ${cfg.outcome || "any outcome"}${cfg.minConfidence ? ` with confidence >= ${(cfg.minConfidence * 100).toFixed(0)}%` : ""}`;
    case "iw_level_change":
      return `I&W ${cfg.scenarioId || "any scenario"} reaches level ${cfg.minLevel || "?"}+`;
    case "sentiment_shift":
      return `${cfg.topic || "?"} sentiment ${cfg.sentimentDirection || "?"} ${cfg.sentimentThreshold?.toFixed(2) || "?"}`;
    case "price_alert":
      return `${cfg.symbol || "?"} ${cfg.priceDirection || "?"} $${cfg.priceLevel || "?"}`;
    case "schedule":
      return `Every ${cfg.intervalHours || "?"} hours`;
    default:
      return rule.triggerType;
  }
}

function actionSummary(actions: ActionConfig[]): string {
  return actions.map((a) => {
    const def = ACTION_TYPES.find((t) => t.id === a.type);
    return def?.label || a.type;
  }).join(" then ");
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Page ──

export default function AutomationsPage() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTriggerType, setNewTriggerType] = useState("signal_threshold");
  const [newTriggerConfig, setNewTriggerConfig] = useState<TriggerConfig>({ minIntensity: 4 });
  const [newActions, setNewActions] = useState<ActionConfig[]>([{ type: "send_telegram", config: { message: "" } }]);
  const [newCooldown, setNewCooldown] = useState(30);

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch("/api/automation");
      const data = await res.json();
      setRules(data.rules || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await fetch("/api/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: newName,
          description: newDescription || null,
          triggerType: newTriggerType,
          triggerConfig: newTriggerConfig,
          actions: newActions,
          cooldownMinutes: newCooldown,
        }),
      });
      setShowCreate(false);
      setNewName("");
      setNewDescription("");
      setNewTriggerConfig({ minIntensity: 4 });
      setNewActions([{ type: "send_telegram", config: { message: "" } }]);
      fetchRules();
    } catch { /* ignore */ }
    finally { setCreating(false); }
  };

  const toggleRule = async (id: number) => {
    await fetch("/api/automation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", id }),
    });
    fetchRules();
  };

  const deleteRuleById = async (id: number) => {
    await fetch("/api/automation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    fetchRules();
  };

  return (
    <PageContainer
      title="Automations"
      subtitle="IF condition THEN action -- intelligence on autopilot"
      actions={
        <Button variant="primary" size="sm" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-3 w-3 mr-1" />
          New Rule
        </Button>
      }
    >
      {/* Create Form */}
      {showCreate && (
        <div className="rounded-lg border border-navy-700/30 bg-navy-900/40 p-5 mb-6">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-4">New Automation Rule</div>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Name</label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Iran escalation alert" />
            </div>
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Description (optional)</label>
              <Input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="What this rule does..." />
            </div>

            {/* Trigger Type */}
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-2 block">When (Trigger)</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {TRIGGER_TYPES.map((t) => {
                  const Icon = t.icon;
                  const selected = newTriggerType === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => { setNewTriggerType(t.id); setNewTriggerConfig({}); }}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border text-left transition-all",
                        selected ? "border-accent-cyan/40 bg-accent-cyan/5" : "border-navy-700/20 bg-navy-950/40 hover:border-navy-600/30"
                      )}
                    >
                      <Icon className={cn("h-4 w-4", selected ? "text-accent-cyan" : "text-navy-500")} />
                      <div>
                        <div className={cn("text-[11px] font-medium", selected ? "text-accent-cyan" : "text-navy-300")}>{t.label}</div>
                        <div className="text-[9px] text-navy-600">{t.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trigger Config (dynamic based on type) */}
            <div className="rounded-md border border-navy-800/40 bg-navy-950/40 p-4">
              <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-2 block">Trigger Configuration</label>
              {newTriggerType === "signal_threshold" && (
                <div className="flex gap-3">
                  <div className="w-32">
                    <label className="text-[9px] text-navy-600 mb-1 block">Min Intensity</label>
                    <Input type="number" min={1} max={5} value={newTriggerConfig.minIntensity || 4} onChange={(e) => setNewTriggerConfig({ ...newTriggerConfig, minIntensity: parseInt(e.target.value) })} />
                  </div>
                  <div className="flex-1">
                    <label className="text-[9px] text-navy-600 mb-1 block">Keywords (comma-separated)</label>
                    <Input value={newTriggerConfig.keywords?.join(", ") || ""} onChange={(e) => setNewTriggerConfig({ ...newTriggerConfig, keywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="iran, hormuz, escalation" />
                  </div>
                </div>
              )}
              {newTriggerType === "prediction_resolved" && (
                <div className="flex gap-3">
                  <div className="w-40">
                    <label className="text-[9px] text-navy-600 mb-1 block">Outcome</label>
                    <select value={newTriggerConfig.outcome || ""} onChange={(e) => setNewTriggerConfig({ ...newTriggerConfig, outcome: e.target.value || undefined })} className="w-full h-9 rounded-md border border-navy-700/30 bg-navy-900 text-xs text-navy-200 px-2">
                      <option value="">Any</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="denied">Denied</option>
                      <option value="partial">Partial</option>
                    </select>
                  </div>
                  <div className="w-32">
                    <label className="text-[9px] text-navy-600 mb-1 block">Min Confidence</label>
                    <Input type="number" min={0} max={1} step={0.1} value={newTriggerConfig.minConfidence || ""} onChange={(e) => setNewTriggerConfig({ ...newTriggerConfig, minConfidence: parseFloat(e.target.value) || undefined })} placeholder="0.7" />
                  </div>
                </div>
              )}
              {newTriggerType === "sentiment_shift" && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[9px] text-navy-600 mb-1 block">Topic</label>
                    <Input value={newTriggerConfig.topic || ""} onChange={(e) => setNewTriggerConfig({ ...newTriggerConfig, topic: e.target.value })} placeholder="Gold, Oil, Iran..." />
                  </div>
                  <div className="w-32">
                    <label className="text-[9px] text-navy-600 mb-1 block">Direction</label>
                    <select value={newTriggerConfig.sentimentDirection || "above"} onChange={(e) => setNewTriggerConfig({ ...newTriggerConfig, sentimentDirection: e.target.value })} className="w-full h-9 rounded-md border border-navy-700/30 bg-navy-900 text-xs text-navy-200 px-2">
                      <option value="above">Above</option>
                      <option value="below">Below</option>
                    </select>
                  </div>
                  <div className="w-32">
                    <label className="text-[9px] text-navy-600 mb-1 block">Threshold (-1 to 1)</label>
                    <Input type="number" min={-1} max={1} step={0.1} value={newTriggerConfig.sentimentThreshold ?? 0.3} onChange={(e) => setNewTriggerConfig({ ...newTriggerConfig, sentimentThreshold: parseFloat(e.target.value) })} />
                  </div>
                </div>
              )}
              {newTriggerType === "price_alert" && (
                <div className="flex gap-3">
                  <div className="w-28">
                    <label className="text-[9px] text-navy-600 mb-1 block">Symbol</label>
                    <Input value={newTriggerConfig.symbol || ""} onChange={(e) => setNewTriggerConfig({ ...newTriggerConfig, symbol: e.target.value.toUpperCase() })} placeholder="SPY" />
                  </div>
                  <div className="w-32">
                    <label className="text-[9px] text-navy-600 mb-1 block">Direction</label>
                    <select value={newTriggerConfig.priceDirection || "above"} onChange={(e) => setNewTriggerConfig({ ...newTriggerConfig, priceDirection: e.target.value })} className="w-full h-9 rounded-md border border-navy-700/30 bg-navy-900 text-xs text-navy-200 px-2">
                      <option value="above">Above</option>
                      <option value="below">Below</option>
                    </select>
                  </div>
                  <div className="w-32">
                    <label className="text-[9px] text-navy-600 mb-1 block">Price Level</label>
                    <Input type="number" value={newTriggerConfig.priceLevel || ""} onChange={(e) => setNewTriggerConfig({ ...newTriggerConfig, priceLevel: parseFloat(e.target.value) || undefined })} placeholder="500.00" />
                  </div>
                </div>
              )}
              {newTriggerType === "iw_level_change" && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[9px] text-navy-600 mb-1 block">Scenario ID</label>
                    <Input value={newTriggerConfig.scenarioId || ""} onChange={(e) => setNewTriggerConfig({ ...newTriggerConfig, scenarioId: e.target.value })} placeholder="mideast-regional-war" />
                  </div>
                  <div className="w-32">
                    <label className="text-[9px] text-navy-600 mb-1 block">Min Level (1-5)</label>
                    <Input type="number" min={1} max={5} value={newTriggerConfig.minLevel || 3} onChange={(e) => setNewTriggerConfig({ ...newTriggerConfig, minLevel: parseInt(e.target.value) })} />
                  </div>
                </div>
              )}
              {newTriggerType === "schedule" && (
                <div className="w-40">
                  <label className="text-[9px] text-navy-600 mb-1 block">Interval (hours)</label>
                  <Input type="number" min={1} value={newTriggerConfig.intervalHours || 6} onChange={(e) => setNewTriggerConfig({ ...newTriggerConfig, intervalHours: parseInt(e.target.value) })} />
                </div>
              )}
            </div>

            {/* Actions */}
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-2 block">Then (Actions)</label>
              <div className="space-y-2">
                {newActions.map((action, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      value={action.type}
                      onChange={(e) => {
                        const updated = [...newActions];
                        updated[i] = { type: e.target.value, config: {} };
                        setNewActions(updated);
                      }}
                      className="flex-1 h-9 rounded-md border border-navy-700/30 bg-navy-900 text-xs text-navy-200 px-2"
                    >
                      {ACTION_TYPES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                    </select>
                    {action.type === "send_telegram" && (
                      <Input
                        className="flex-1"
                        value={(action.config.message as string) || ""}
                        onChange={(e) => {
                          const updated = [...newActions];
                          updated[i] = { ...updated[i], config: { ...updated[i].config, message: e.target.value } };
                          setNewActions(updated);
                        }}
                        placeholder="Alert message..."
                      />
                    )}
                    {newActions.length > 1 && (
                      <button onClick={() => setNewActions(newActions.filter((_, j) => j !== i))} className="text-navy-600 hover:text-accent-rose transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setNewActions([...newActions, { type: "log", config: {} }])}
                  className="text-[10px] font-mono text-accent-cyan hover:text-accent-cyan/80 transition-colors"
                >
                  + Add action
                </button>
              </div>
            </div>

            {/* Cooldown */}
            <div className="w-40">
              <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Cooldown (minutes)</label>
              <Input type="number" min={1} value={newCooldown} onChange={(e) => setNewCooldown(parseInt(e.target.value) || 30)} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="primary" onClick={handleCreate} disabled={creating || !newName.trim()}>
                {creating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                Create Rule
              </Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Rules List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      ) : rules.length === 0 ? (
        <div className="text-center py-16">
          <Zap className="h-8 w-8 text-navy-600 mx-auto mb-3" />
          <p className="text-sm text-navy-400">No automation rules yet.</p>
          <p className="text-[11px] text-navy-600 mt-1">Create your first rule to put intelligence on autopilot.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => {
            const TriggerIcon = TRIGGER_ICONS[rule.triggerType] || Zap;
            const isExpanded = expanded === rule.id;
            return (
              <div key={rule.uuid} className={cn(
                "rounded-lg border transition-all",
                rule.enabled ? "border-navy-700/20 bg-navy-900/40" : "border-navy-800/20 bg-navy-950/30 opacity-60",
                rule.lastError && "border-accent-rose/20"
              )}>
                <div className="px-5 py-4">
                  <div className="flex items-center gap-4">
                    {/* Status + trigger icon */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => toggleRule(rule.id)} className="transition-colors" title={rule.enabled ? "Disable" : "Enable"}>
                        {rule.enabled ? <Play className="h-3.5 w-3.5 text-accent-emerald" /> : <Pause className="h-3.5 w-3.5 text-navy-600" />}
                      </button>
                      <TriggerIcon className="h-3.5 w-3.5 text-navy-500" />
                    </div>

                    {/* Name + summary */}
                    <button onClick={() => setExpanded(isExpanded ? null : rule.id)} className="flex-1 text-left min-w-0">
                      <div className="text-[13px] text-navy-100 font-medium">{rule.name}</div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-navy-500">
                        <span>{triggerSummary(rule)}</span>
                        <ArrowRight className="h-2.5 w-2.5 text-navy-700" />
                        <span>{actionSummary(rule.actions)}</span>
                      </div>
                    </button>

                    {/* Stats */}
                    <div className="flex items-center gap-4 shrink-0">
                      {rule.lastTriggeredAt && (
                        <span className="text-[9px] font-mono text-navy-600">{timeAgo(rule.lastTriggeredAt)}</span>
                      )}
                      <span className="text-[9px] font-mono text-navy-600">{rule.triggerCount}x</span>
                      {rule.lastError && <AlertTriangle className="h-3 w-3 text-accent-rose" />}
                      <span className="text-[9px] font-mono text-navy-700">{rule.cooldownMinutes}m cooldown</span>
                      <button onClick={() => deleteRuleById(rule.id)} className="text-navy-700 hover:text-accent-rose transition-colors">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-navy-800/40 space-y-2">
                      {rule.description && (
                        <p className="text-[11px] text-navy-400">{rule.description}</p>
                      )}
                      <div className="grid grid-cols-2 gap-4 text-[10px] font-mono">
                        <div>
                          <span className="text-navy-600">Trigger type:</span> <span className="text-navy-300">{rule.triggerType}</span>
                        </div>
                        <div>
                          <span className="text-navy-600">Created:</span> <span className="text-navy-300">{new Date(rule.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div>
                          <span className="text-navy-600">Config:</span> <span className="text-navy-400">{JSON.stringify(rule.triggerConfig)}</span>
                        </div>
                        <div>
                          <span className="text-navy-600">Actions:</span> <span className="text-navy-400">{rule.actions.map((a) => a.type).join(", ")}</span>
                        </div>
                      </div>
                      {rule.lastError && (
                        <div className="text-[10px] text-accent-rose font-mono mt-1">
                          Last error: {rule.lastError}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
