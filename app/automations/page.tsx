"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Connection,
  type Node,
  type Edge,
  type NodeProps,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  Check,
  Clock,
  Crosshair,
  DollarSign,
  Loader2,
  MessageSquare,
  Pause,
  Play,
  Plus,
  Radar,
  Save,
  Shield,
  Trash2,
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

// ── Node Type Definitions ──

const TRIGGER_TYPES: Record<string, { label: string; icon: typeof Activity; color: string; bgColor: string; borderColor: string }> = {
  signal_threshold: { label: "Signal Threshold", icon: Activity, color: "text-accent-cyan", bgColor: "bg-accent-cyan/10", borderColor: "border-accent-cyan/30" },
  prediction_resolved: { label: "Prediction Resolved", icon: Crosshair, color: "text-accent-amber", bgColor: "bg-accent-amber/10", borderColor: "border-accent-amber/30" },
  iw_level_change: { label: "I&W Escalation", icon: Shield, color: "text-accent-rose", bgColor: "bg-accent-rose/10", borderColor: "border-accent-rose/30" },
  sentiment_shift: { label: "Sentiment Shift", icon: Radar, color: "text-accent-emerald", bgColor: "bg-accent-emerald/10", borderColor: "border-accent-emerald/30" },
  price_alert: { label: "Price Alert", icon: DollarSign, color: "text-accent-amber", bgColor: "bg-accent-amber/10", borderColor: "border-accent-amber/30" },
  schedule: { label: "Schedule", icon: Clock, color: "text-navy-300", bgColor: "bg-navy-800/40", borderColor: "border-navy-600/30" },
};

const ACTION_TYPES: Record<string, { label: string; icon: typeof Activity; color: string; bgColor: string; borderColor: string }> = {
  send_telegram: { label: "Telegram Alert", icon: MessageSquare, color: "text-accent-cyan", bgColor: "bg-accent-cyan/10", borderColor: "border-accent-cyan/30" },
  run_analysis: { label: "Analyst Review", icon: Activity, color: "text-accent-emerald", bgColor: "bg-accent-emerald/10", borderColor: "border-accent-emerald/30" },
  generate_predictions: { label: "Generate Predictions", icon: Crosshair, color: "text-accent-amber", bgColor: "bg-accent-amber/10", borderColor: "border-accent-amber/30" },
  update_iw: { label: "Update I&W", icon: Shield, color: "text-accent-rose", bgColor: "bg-accent-rose/10", borderColor: "border-accent-rose/30" },
  log: { label: "Knowledge Log", icon: Bell, color: "text-navy-300", bgColor: "bg-navy-800/40", borderColor: "border-navy-600/30" },
};

// ── Custom Flow Nodes ──

function TriggerNode({ data }: NodeProps) {
  const cfg = TRIGGER_TYPES[data.triggerType as string] || TRIGGER_TYPES.signal_threshold;
  const Icon = cfg.icon;
  return (
    <div className={cn("rounded-lg border-2 p-4 min-w-[220px] shadow-lg", cfg.borderColor, cfg.bgColor, "bg-navy-950/90 backdrop-blur-sm")}>
      <Handle type="source" position={Position.Right} className="!bg-accent-cyan !w-3 !h-3 !border-2 !border-navy-950" />
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("rounded-md p-1.5", cfg.bgColor)}>
          <Zap className={cn("h-3.5 w-3.5", cfg.color)} />
        </div>
        <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500">Trigger</span>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("h-4 w-4", cfg.color)} />
        <span className="text-[12px] font-medium text-navy-100">{cfg.label}</span>
      </div>
      <p className="text-[10px] text-navy-400 leading-relaxed">{data.summary as string}</p>
    </div>
  );
}

function ActionNode({ data }: NodeProps) {
  const cfg = ACTION_TYPES[data.actionType as string] || ACTION_TYPES.log;
  const Icon = cfg.icon;
  const stepNum = (data.stepIndex as number) + 1;
  return (
    <div className={cn("rounded-lg border-2 p-4 min-w-[200px] shadow-lg", cfg.borderColor, "bg-navy-950/90 backdrop-blur-sm")}>
      <Handle type="target" position={Position.Left} className="!bg-navy-400 !w-3 !h-3 !border-2 !border-navy-950" />
      <Handle type="source" position={Position.Right} className="!bg-accent-cyan !w-3 !h-3 !border-2 !border-navy-950" />
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("rounded-md p-1.5", cfg.bgColor)}>
          <ArrowRight className={cn("h-3.5 w-3.5", cfg.color)} />
        </div>
        <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500">Step {stepNum}</span>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("h-4 w-4", cfg.color)} />
        <span className="text-[12px] font-medium text-navy-100">{cfg.label}</span>
      </div>
      {data.detail && <p className="text-[10px] text-navy-400">{data.detail as string}</p>}
    </div>
  );
}

const nodeTypes = { trigger: TriggerNode, action: ActionNode };

// ── Helpers ──

function triggerSummary(type: string, cfg: TriggerConfig): string {
  switch (type) {
    case "signal_threshold": return `Intensity >= ${cfg.minIntensity || "?"}${cfg.keywords?.length ? `, keywords: ${cfg.keywords.join(", ")}` : ""}`;
    case "prediction_resolved": return `Outcome: ${cfg.outcome || "any"}${cfg.minConfidence ? `, conf >= ${(cfg.minConfidence * 100).toFixed(0)}%` : ""}`;
    case "iw_level_change": return `${cfg.scenarioId || "any"} >= level ${cfg.minLevel || "?"}`;
    case "sentiment_shift": return `${cfg.topic || "?"} ${cfg.sentimentDirection || "?"} ${cfg.sentimentThreshold?.toFixed(1) || "?"}`;
    case "price_alert": return `${cfg.symbol || "?"} ${cfg.priceDirection || "?"} $${cfg.priceLevel || "?"}`;
    case "schedule": return `Every ${cfg.intervalHours || "?"}h`;
    default: return type;
  }
}

function ruleToFlow(rule: AutomationRule): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Trigger node
  nodes.push({
    id: `trigger-${rule.id}`,
    type: "trigger",
    position: { x: 0, y: 0 },
    data: {
      triggerType: rule.triggerType,
      summary: triggerSummary(rule.triggerType, rule.triggerConfig),
    },
  });

  // Action nodes
  rule.actions.forEach((action, i) => {
    const nodeId = `action-${rule.id}-${i}`;
    nodes.push({
      id: nodeId,
      type: "action",
      position: { x: 300 + i * 280, y: 0 },
      data: {
        actionType: action.type,
        stepIndex: i,
        detail: action.type === "send_telegram" ? (action.config.message as string || "").slice(0, 60) : action.type === "generate_predictions" ? (action.config.topic as string || "") : "",
      },
    });

    const sourceId = i === 0 ? `trigger-${rule.id}` : `action-${rule.id}-${i - 1}`;
    edges.push({
      id: `edge-${rule.id}-${i}`,
      source: sourceId,
      target: nodeId,
      animated: rule.enabled,
      style: { stroke: rule.enabled ? "#06b6d4" : "#334155", strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: rule.enabled ? "#06b6d4" : "#334155" },
    });
  });

  return { nodes, edges };
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
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form
  const [newName, setNewName] = useState("");
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

  // Flow for selected rule
  const flowData = useMemo(() => {
    if (!selectedRule) return { nodes: [], edges: [] };
    return ruleToFlow(selectedRule);
  }, [selectedRule]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowData.edges);

  useEffect(() => {
    setNodes(flowData.nodes);
    setEdges(flowData.edges);
  }, [flowData, setNodes, setEdges]);

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
          triggerType: newTriggerType,
          triggerConfig: newTriggerConfig,
          actions: newActions,
          cooldownMinutes: newCooldown,
        }),
      });
      setShowCreate(false);
      setNewName("");
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

  const deleteRuleAction = async (id: number) => {
    await fetch("/api/automation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    if (selectedRule?.id === id) setSelectedRule(null);
    fetchRules();
  };

  return (
    <PageContainer
      title="Automations"
      subtitle="Visual intelligence workflows -- trigger, chain, execute"
      actions={
        <Button variant="primary" size="sm" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-3 w-3 mr-1" />
          New Workflow
        </Button>
      }
    >
      <div className="flex gap-4 h-[calc(100vh-180px)]">
        {/* Left: Rule List */}
        <div className="w-72 shrink-0 border-r border-navy-800/40 pr-4 overflow-y-auto">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">Workflows ({rules.length})</div>

          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-navy-800/20 animate-pulse" />)}</div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8">
              <Zap className="h-6 w-6 text-navy-700 mx-auto mb-2" />
              <p className="text-[11px] text-navy-600">No workflows yet</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {rules.map((rule) => {
                const TIcon = TRIGGER_TYPES[rule.triggerType]?.icon || Zap;
                const tcfg = TRIGGER_TYPES[rule.triggerType];
                const isSelected = selectedRule?.id === rule.id;
                return (
                  <button
                    key={rule.uuid}
                    onClick={() => setSelectedRule(rule)}
                    className={cn(
                      "w-full text-left rounded-lg p-3 transition-all",
                      isSelected ? "bg-navy-800/60 border border-accent-cyan/20" : "bg-navy-900/30 border border-transparent hover:bg-navy-800/30"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <button onClick={(e) => { e.stopPropagation(); toggleRule(rule.id); }} className="shrink-0">
                        {rule.enabled ? <Play className="h-3 w-3 text-accent-emerald" /> : <Pause className="h-3 w-3 text-navy-600" />}
                      </button>
                      <TIcon className={cn("h-3.5 w-3.5 shrink-0", tcfg?.color || "text-navy-500")} />
                      <span className={cn("text-[12px] font-medium truncate", rule.enabled ? "text-navy-100" : "text-navy-500")}>{rule.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 ml-5">
                      <span className="text-[9px] font-mono text-navy-600">{rule.actions.length} step{rule.actions.length !== 1 ? "s" : ""}</span>
                      <span className="text-navy-800">|</span>
                      <span className="text-[9px] font-mono text-navy-600">{rule.triggerCount}x fired</span>
                      {rule.lastError && <AlertTriangle className="h-2.5 w-2.5 text-accent-rose" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Flow Canvas or Create Form */}
        <div className="flex-1 min-w-0">
          {showCreate ? (
            <div className="h-full overflow-y-auto pr-2">
              <div className="rounded-lg border border-navy-700/20 bg-navy-900/30 p-5">
                <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-4">New Workflow</div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Name</label>
                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Iran escalation pipeline" />
                  </div>

                  {/* Trigger */}
                  <div>
                    <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-2 block">When (Trigger)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(TRIGGER_TYPES).map(([id, t]) => {
                        const Icon = t.icon;
                        const sel = newTriggerType === id;
                        return (
                          <button key={id} onClick={() => { setNewTriggerType(id); setNewTriggerConfig({}); }}
                            className={cn("flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all",
                              sel ? `${t.borderColor} ${t.bgColor}` : "border-navy-800/30 hover:border-navy-700/40"
                            )}>
                            <Icon className={cn("h-3.5 w-3.5", sel ? t.color : "text-navy-500")} />
                            <span className={cn("text-[10px] font-medium", sel ? t.color : "text-navy-400")}>{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Trigger Config */}
                  <div className="rounded-md border border-navy-800/30 bg-navy-950/40 p-3">
                    <label className="text-[9px] text-navy-600 uppercase tracking-wider mb-2 block">Configuration</label>
                    {newTriggerType === "signal_threshold" && (
                      <div className="flex gap-3">
                        <div className="w-28"><label className="text-[9px] text-navy-600 mb-1 block">Min Intensity</label>
                          <Input type="number" min={1} max={5} value={newTriggerConfig.minIntensity || 4} onChange={(e) => setNewTriggerConfig({ ...newTriggerConfig, minIntensity: parseInt(e.target.value) })} /></div>
                        <div className="flex-1"><label className="text-[9px] text-navy-600 mb-1 block">Keywords</label>
                          <Input value={newTriggerConfig.keywords?.join(", ") || ""} onChange={(e) => setNewTriggerConfig({ ...newTriggerConfig, keywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="iran, hormuz" /></div>
                      </div>
                    )}
                    {newTriggerType === "prediction_resolved" && (
                      <div className="flex gap-3">
                        <div className="w-36"><label className="text-[9px] text-navy-600 mb-1 block">Outcome</label>
                          <select value={newTriggerConfig.outcome || ""} onChange={(e) => setNewTriggerConfig({ ...newTriggerConfig, outcome: e.target.value || undefined })} className="w-full h-9 rounded-md border border-navy-700/30 bg-navy-900 text-xs text-navy-200 px-2"><option value="">Any</option><option value="confirmed">Confirmed</option><option value="denied">Denied</option></select></div>
                        <div className="w-28"><label className="text-[9px] text-navy-600 mb-1 block">Min Confidence</label>
                          <Input type="number" min={0} max={1} step={0.1} value={newTriggerConfig.minConfidence || ""} onChange={(e) => setNewTriggerConfig({ ...newTriggerConfig, minConfidence: parseFloat(e.target.value) || undefined })} placeholder="0.7" /></div>
                      </div>
                    )}
                    {newTriggerType === "sentiment_shift" && (
                      <div className="flex gap-3">
                        <div className="flex-1"><label className="text-[9px] text-navy-600 mb-1 block">Topic</label><Input value={newTriggerConfig.topic || ""} onChange={(e) => setNewTriggerConfig({ ...newTriggerConfig, topic: e.target.value })} placeholder="Gold, Oil, Iran" /></div>
                        <div className="w-28"><label className="text-[9px] text-navy-600 mb-1 block">Direction</label><select value={newTriggerConfig.sentimentDirection || "below"} onChange={(e) => setNewTriggerConfig({ ...newTriggerConfig, sentimentDirection: e.target.value })} className="w-full h-9 rounded-md border border-navy-700/30 bg-navy-900 text-xs text-navy-200 px-2"><option value="above">Above</option><option value="below">Below</option></select></div>
                        <div className="w-28"><label className="text-[9px] text-navy-600 mb-1 block">Threshold</label><Input type="number" min={-1} max={1} step={0.1} value={newTriggerConfig.sentimentThreshold ?? -0.3} onChange={(e) => setNewTriggerConfig({ ...newTriggerConfig, sentimentThreshold: parseFloat(e.target.value) })} /></div>
                      </div>
                    )}
                    {newTriggerType === "price_alert" && (
                      <div className="flex gap-3">
                        <div className="w-24"><label className="text-[9px] text-navy-600 mb-1 block">Symbol</label><Input value={newTriggerConfig.symbol || ""} onChange={(e) => setNewTriggerConfig({ ...newTriggerConfig, symbol: e.target.value.toUpperCase() })} placeholder="SPY" /></div>
                        <div className="w-28"><label className="text-[9px] text-navy-600 mb-1 block">Direction</label><select value={newTriggerConfig.priceDirection || "below"} onChange={(e) => setNewTriggerConfig({ ...newTriggerConfig, priceDirection: e.target.value })} className="w-full h-9 rounded-md border border-navy-700/30 bg-navy-900 text-xs text-navy-200 px-2"><option value="above">Above</option><option value="below">Below</option></select></div>
                        <div className="w-28"><label className="text-[9px] text-navy-600 mb-1 block">Price</label><Input type="number" value={newTriggerConfig.priceLevel || ""} onChange={(e) => setNewTriggerConfig({ ...newTriggerConfig, priceLevel: parseFloat(e.target.value) || undefined })} placeholder="480" /></div>
                      </div>
                    )}
                    {newTriggerType === "iw_level_change" && (
                      <div className="flex gap-3">
                        <div className="flex-1"><label className="text-[9px] text-navy-600 mb-1 block">Scenario</label><Input value={newTriggerConfig.scenarioId || ""} onChange={(e) => setNewTriggerConfig({ ...newTriggerConfig, scenarioId: e.target.value })} placeholder="mideast-regional-war" /></div>
                        <div className="w-28"><label className="text-[9px] text-navy-600 mb-1 block">Min Level</label><Input type="number" min={1} max={5} value={newTriggerConfig.minLevel || 3} onChange={(e) => setNewTriggerConfig({ ...newTriggerConfig, minLevel: parseInt(e.target.value) })} /></div>
                      </div>
                    )}
                    {newTriggerType === "schedule" && (
                      <div className="w-32"><label className="text-[9px] text-navy-600 mb-1 block">Every N hours</label><Input type="number" min={1} value={newTriggerConfig.intervalHours || 6} onChange={(e) => setNewTriggerConfig({ ...newTriggerConfig, intervalHours: parseInt(e.target.value) })} /></div>
                    )}
                  </div>

                  {/* Action Chain */}
                  <div>
                    <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-2 block">Then (Action Chain)</label>
                    <div className="space-y-2">
                      {newActions.map((action, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[9px] font-mono text-navy-600 w-6 shrink-0">{i + 1}.</span>
                          <select value={action.type} onChange={(e) => { const u = [...newActions]; u[i] = { type: e.target.value, config: {} }; setNewActions(u); }}
                            className="w-48 h-9 rounded-md border border-navy-700/30 bg-navy-900 text-xs text-navy-200 px-2">
                            {Object.entries(ACTION_TYPES).map(([id, a]) => <option key={id} value={id}>{a.label}</option>)}
                          </select>
                          {action.type === "send_telegram" && (
                            <Input className="flex-1" value={(action.config.message as string) || ""} onChange={(e) => { const u = [...newActions]; u[i] = { ...u[i], config: { ...u[i].config, message: e.target.value } }; setNewActions(u); }} placeholder="Alert message..." />
                          )}
                          {action.type === "generate_predictions" && (
                            <Input className="flex-1" value={(action.config.topic as string) || ""} onChange={(e) => { const u = [...newActions]; u[i] = { ...u[i], config: { ...u[i].config, topic: e.target.value } }; setNewActions(u); }} placeholder="Topic..." />
                          )}
                          {newActions.length > 1 && (
                            <button onClick={() => setNewActions(newActions.filter((_, j) => j !== i))} className="text-navy-700 hover:text-accent-rose"><X className="h-3.5 w-3.5" /></button>
                          )}
                        </div>
                      ))}
                      <button onClick={() => setNewActions([...newActions, { type: "log", config: {} }])} className="text-[10px] font-mono text-accent-cyan hover:text-accent-cyan/80">+ Add step</button>
                    </div>
                  </div>

                  <div className="w-36">
                    <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Cooldown (min)</label>
                    <Input type="number" min={1} value={newCooldown} onChange={(e) => setNewCooldown(parseInt(e.target.value) || 30)} />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="primary" onClick={handleCreate} disabled={creating || !newName.trim()}>
                      {creating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                      Create Workflow
                    </Button>
                    <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedRule ? (
            <div className="h-full flex flex-col">
              {/* Rule header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-navy-800/40">
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleRule(selectedRule.id)}>
                    {selectedRule.enabled ? <Play className="h-4 w-4 text-accent-emerald" /> : <Pause className="h-4 w-4 text-navy-600" />}
                  </button>
                  <div>
                    <h3 className="text-sm font-medium text-navy-100">{selectedRule.name}</h3>
                    <div className="flex items-center gap-3 text-[9px] font-mono text-navy-500 mt-0.5">
                      <span>{selectedRule.triggerCount}x triggered</span>
                      {selectedRule.lastTriggeredAt && <span>last: {timeAgo(selectedRule.lastTriggeredAt)}</span>}
                      <span>{selectedRule.cooldownMinutes}m cooldown</span>
                      <span>{selectedRule.enabled ? "ACTIVE" : "PAUSED"}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => deleteRuleAction(selectedRule.id)} className="text-navy-600 hover:text-accent-rose transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Error banner */}
              {selectedRule.lastError && (
                <div className="flex items-start gap-2 rounded-md border border-accent-rose/20 bg-accent-rose/5 px-3 py-2 mb-3">
                  <AlertTriangle className="h-3.5 w-3.5 text-accent-rose mt-0.5 shrink-0" />
                  <span className="text-[10px] font-mono text-accent-rose">{selectedRule.lastError}</span>
                </div>
              )}

              {/* Flow canvas */}
              <div className="flex-1 rounded-lg border border-navy-800/30 overflow-hidden bg-navy-950">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  nodeTypes={nodeTypes}
                  fitView
                  fitViewOptions={{ padding: 0.4 }}
                  proOptions={{ hideAttribution: true }}
                  style={{ background: "#0a0e1a" }}
                >
                  <Background color="#1e293b" gap={20} size={1} />
                  <Controls className="!bg-navy-900 !border-navy-700 !shadow-lg [&>button]:!bg-navy-800 [&>button]:!border-navy-700 [&>button]:!text-navy-300 [&>button:hover]:!bg-navy-700" />
                  <MiniMap
                    className="!bg-navy-900 !border-navy-700"
                    nodeColor={() => "#1e293b"}
                    maskColor="rgba(0,0,0,0.6)"
                  />
                </ReactFlow>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Zap className="h-10 w-10 text-navy-700 mx-auto mb-3" />
                <p className="text-sm text-navy-500">Select a workflow or create a new one</p>
                <p className="text-[11px] text-navy-600 mt-1 max-w-sm">
                  Build multi-step intelligence pipelines. Trigger on signals, predictions, sentiment, or prices. Chain actions: alerts, analysis, prediction generation.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
