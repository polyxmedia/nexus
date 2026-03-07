"use client";

import { useEffect, useState, useCallback } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { PageContainer } from "@/components/layout/page-container";
import { StatusDot } from "@/components/ui/status-dot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Key,
  Loader2,
  Save,
  Settings2,
  Shield,
  TrendingUp,
  Database,
  Trash2,
  MessageSquare,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Brain,
} from "lucide-react";

interface SettingEntry {
  key: string;
  value: string;
  updatedAt: string;
}

interface PromptEntry {
  key: string;
  label: string;
  description: string;
  category: string;
  value: string;
  isOverridden: boolean;
  defaultValue: string;
}

const TABS = [
  { id: "subscription", label: "Subscription", icon: CreditCard },
  { id: "ai-models", label: "AI Models", icon: Brain },
  { id: "prompts", label: "Prompts", icon: MessageSquare },
  { id: "api-keys", label: "API Keys", icon: Key },
  { id: "trading", label: "Trading", icon: TrendingUp },
  { id: "data", label: "Data Sources", icon: Database },
  { id: "system", label: "System", icon: Settings2 },
];

const AI_MODELS = [
  { id: "claude-opus-4-6", label: "Claude Opus 4.6", tier: "flagship" as const, description: "Most capable model. Best for critical analysis, predictions, and complex reasoning." },
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", tier: "balanced" as const, description: "Fast and capable. Good for routine tasks and chat." },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", tier: "fast" as const, description: "Fastest model. Use only for simple, non-critical tasks." },
];

const TIER_STYLES = {
  flagship: "border-accent-amber/40 bg-accent-amber/[0.06]",
  balanced: "border-accent-cyan/40 bg-accent-cyan/[0.06]",
  fast: "border-navy-600 bg-navy-800/50",
};

const TIER_BADGE = {
  flagship: "bg-accent-amber/15 text-accent-amber",
  balanced: "bg-accent-cyan/15 text-accent-cyan",
  fast: "bg-navy-700 text-navy-400",
};

const PROMPT_CATEGORIES = [
  { id: "chat", label: "Chat" },
  { id: "operator", label: "Operator Context" },
  { id: "analysis", label: "Analysis" },
  { id: "predictions", label: "Predictions" },
];

async function PromptEditor({
  prompt,
  onSave,
  onReset,
}: {
  prompt: PromptEntry;
  onSave: (key: string, value: string) => Promise<void>;
  onReset: (key: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState(prompt.value);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showDefault, setShowDefault] = useState(false);

  const isDirty = value !== prompt.value;
  const isModifiedFromDefault = prompt.isOverridden;

  const handleSave = async () => {
    setSaving(true);
    await onSave(prompt.key, value);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = async () => {
    setResetting(true);
    await onReset(prompt.key);
    setValue(prompt.defaultValue);
    setResetting(false);
  };

  const charCount = value.length;
  const lineCount = value.split("\n").length;

  return (
    <div className="border border-navy-700/50 rounded overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-navy-800/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-navy-500 shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-navy-500 shrink-0" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium text-navy-200">
                {prompt.label}
              </span>
              {isModifiedFromDefault && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-amber/15 text-accent-amber font-mono uppercase tracking-wider">
                  Modified
                </span>
              )}
            </div>
            <span className="text-[10px] text-navy-500 block truncate">
              {prompt.description}
            </span>
          </div>
        </div>
        <span className="text-[10px] text-navy-600 font-mono shrink-0 ml-3">
          {charCount.toLocaleString()} chars
        </span>
      </button>

      {expanded && (
        <div className="border-t border-navy-700/50 p-4 space-y-3">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full h-80 bg-navy-900/50 border border-navy-700/50 rounded p-3 text-[12px] font-mono text-navy-200 resize-y focus:outline-none focus:border-navy-500 leading-relaxed"
            spellCheck={false}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-navy-600 font-mono">
                {lineCount} lines
              </span>
              <span className="text-[10px] text-navy-600 font-mono">
                {prompt.key}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDefault(!showDefault)}
                className="text-[10px] text-navy-500 hover:text-navy-300 transition-colors underline"
              >
                {showDefault ? "Hide default" : "View default"}
              </button>

              {isModifiedFromDefault && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  disabled={resetting}
                  className="text-[10px] text-navy-400 hover:text-accent-amber"
                >
                  {resetting ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <RotateCcw className="h-3 w-3 mr-1" />
                  )}
                  Reset to default
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={saving || !isDirty}
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : saved ? (
                  <CheckCircle2 className="h-3 w-3 text-accent-emerald mr-1" />
                ) : (
                  <Save className="h-3 w-3 mr-1" />
                )}
                {saved ? "Saved" : "Save"}
              </Button>
            </div>
          </div>

          {showDefault && (
            <div className="border border-navy-700/30 rounded bg-navy-950 p-3 max-h-60 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-navy-500 uppercase tracking-wider font-medium">
                  Default prompt
                </span>
                <button
                  onClick={() => {
                    setValue(prompt.defaultValue);
                    setShowDefault(false);
                  }}
                  className="text-[10px] text-navy-500 hover:text-navy-300 transition-colors underline"
                >
                  Restore this
                </button>
              </div>
              <pre className="text-[11px] font-mono text-navy-500 whitespace-pre-wrap leading-relaxed">
                {prompt.defaultValue}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingEntry[]>([]);
  const [prompts, setPrompts] = useState<PromptEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [promptsLoading, setPromptsLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Subscription
  const [subscription, setSubscription] = useState<{ subscription: Record<string, unknown> | null; tier: Record<string, unknown> | null }>({ subscription: null, tier: null });
  const [allTiers, setAllTiers] = useState<Record<string, unknown>[]>([]);
  const [subLoading, setSubLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<number | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // AI Model
  const [aiModel, setAiModel] = useState("claude-opus-4-6");
  const [aiChatModel, setAiChatModel] = useState("");

  // API Keys
  const [voyageKey, setVoyageKey] = useState("");
  const [t212Key, setT212Key] = useState("");
  const [t212Secret, setT212Secret] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [alphaVantageKey, setAlphaVantageKey] = useState("");
  const [coinbaseKey, setCoinbaseKey] = useState("");
  const [coinbaseSecret, setCoinbaseSecret] = useState("");
  const [fredKey, setFredKey] = useState("");
  const [acledKey, setAcledKey] = useState("");
  const [acledEmail, setAcledEmail] = useState("");

  // Trading
  const [maxOrderSize, setMaxOrderSize] = useState("1000");
  const [dailyTradeLimit, setDailyTradeLimit] = useState("10");
  const [positionConcentration, setPositionConcentration] = useState("20");
  const [tradingEnv, setTradingEnv] = useState("demo");
  const [stopLossPct, setStopLossPct] = useState("5");
  const [takeProfitPct, setTakeProfitPct] = useState("10");

  // Data Sources
  const [newsPollingInterval, setNewsPollingInterval] = useState("300");
  const [osintPollingInterval, setOsintPollingInterval] = useState("300");
  const [aircraftPollingInterval, setAircraftPollingInterval] = useState("20");
  const [marketRefreshInterval, setMarketRefreshInterval] = useState("60");
  const [predictionAutoResolve, setPredictionAutoResolve] = useState("1");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const s: SettingEntry[] = Array.isArray(data) ? data : data.settings || [];
        setSettings(s);
        for (const setting of s) {
          switch (setting.key) {
            case "max_order_size": setMaxOrderSize(setting.value); break;
            case "daily_trade_limit": setDailyTradeLimit(setting.value); break;
            case "position_concentration_pct": setPositionConcentration(setting.value); break;
            case "trading_environment": setTradingEnv(setting.value); break;
            case "default_stop_loss_pct": setStopLossPct(setting.value); break;
            case "default_take_profit_pct": setTakeProfitPct(setting.value); break;
            case "news_polling_interval": setNewsPollingInterval(setting.value); break;
            case "osint_polling_interval": setOsintPollingInterval(setting.value); break;
            case "aircraft_polling_interval": setAircraftPollingInterval(setting.value); break;
            case "market_refresh_interval": setMarketRefreshInterval(setting.value); break;
            case "prediction_auto_resolve": setPredictionAutoResolve(setting.value); break;
            case "ai_model": setAiModel(setting.value); break;
            case "ai_chat_model": setAiChatModel(setting.value); break;
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/subscription").then((r) => r.json()),
      fetch("/api/admin/tiers").then((r) => r.json()),
    ])
      .then(([subData, tiersData]) => {
        setSubscription(subData);
        setAllTiers(Array.isArray(tiersData) ? tiersData : []);
        setSubLoading(false);
      })
      .catch(() => setSubLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/settings/prompts")
      .then((r) => r.json())
      .then((data) => {
        setPrompts(Array.isArray(data) ? data : []);
        setPromptsLoading(false);
      })
      .catch(() => setPromptsLoading(false));
  }, []);

  const saveSetting = async (key: string, value: string) => {
    setSaving(key);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      setSettings((prev) => {
        const exists = prev.find((s) => s.key === key);
        if (exists) {
          return prev.map((s) => s.key === key ? { ...s, value, updatedAt: new Date().toISOString() } : s);
        }
        return [...prev, { key, value, updatedAt: new Date().toISOString() }];
      });
      setSaved(key);
      setTimeout(() => setSaved(null), 2000);
    } catch {
      // ignore
    } finally {
      setSaving(null);
    }
  };

  const deleteSetting = async (key: string) => {
    setDeleting(key);
    try {
      await fetch("/api/settings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      setSettings((prev) => prev.filter((s) => s.key !== key));
    } catch {
      // ignore
    } finally {
      setDeleting(null);
    }
  };

  const savePrompt = useCallback(async (key: string, value: string) => {
    await fetch("/api/settings/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    setPrompts((prev) =>
      prev.map((p) =>
        p.key === key ? { ...p, value, isOverridden: true } : p
      )
    );
  }, []);

  const resetPrompt = useCallback(async (key: string) => {
    await fetch("/api/settings/prompts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    setPrompts((prev) =>
      prev.map((p) =>
        p.key === key ? { ...p, value: p.defaultValue, isOverridden: false } : p
      )
    );
  }, []);

  const SaveBtn = ({ settingKey, value }: { settingKey: string; value: string }) => (
    <Button
      variant="outline"
      size="sm"
      onClick={() => saveSetting(settingKey, value)}
      disabled={saving === settingKey || !value}
    >
      {saving === settingKey ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : saved === settingKey ? (
        <CheckCircle2 className="h-3 w-3 text-accent-emerald" />
      ) : (
        <Save className="h-3 w-3" />
      )}
    </Button>
  );

  const SettingStatus = ({ settingKey }: { settingKey: string }) => {
    const entry = settings.find((s) => s.key === settingKey);
    if (!entry) return <span className="text-[10px] text-navy-600">Not configured</span>;
    return (
      <span className="text-[10px] text-navy-600">
        Current: {entry.value}
      </span>
    );
  };

  const ApiKeyField = ({
    label,
    settingKey,
    value,
    onChange,
    placeholder,
    type = "password",
  }: {
    label: string;
    settingKey: string;
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    type?: string;
  }) => (
    <div>
      <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">
        {label}
      </label>
      <div className="flex gap-2">
        <Input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <SaveBtn settingKey={settingKey} value={value} />
      </div>
      <SettingStatus settingKey={settingKey} />
    </div>
  );

  const NumberField = ({
    label,
    settingKey,
    value,
    onChange,
    suffix,
  }: {
    label: string;
    settingKey: string;
    value: string;
    onChange: (v: string) => void;
    suffix?: string;
  }) => (
    <div>
      <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">
        {label}
      </label>
      <div className="flex gap-2 items-center">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && <span className="text-[10px] text-navy-500 whitespace-nowrap">{suffix}</span>}
        <SaveBtn settingKey={settingKey} value={value} />
      </div>
    </div>
  );

  if (loading) {
    return (
      <PageContainer title="Settings" subtitle="Configuration and preferences">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </PageContainer>
    );
  }

  const overriddenCount = prompts.filter((p) => p.isOverridden).length;

  return (
    <PageContainer title="Settings" subtitle="Configuration and preferences">
      <Tabs.Root defaultValue="ai-models">
        <Tabs.List className="flex gap-0 border-b border-navy-700 mb-6">
          {TABS.map((tab) => (
            <Tabs.Trigger
              key={tab.id}
              value={tab.id}
              className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-navy-500 border-b-2 border-transparent transition-colors data-[state=active]:text-navy-100 data-[state=active]:border-navy-100 hover:text-navy-300"
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* Subscription Tab */}
        <Tabs.Content value="subscription">
          <div className="space-y-6 max-w-3xl">
            {subLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : (
              <>
                {/* Current Plan */}
                <div className="border border-navy-700 rounded p-5">
                  <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-3">
                    Current Plan
                  </h3>
                  {subscription.tier ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-navy-100 font-mono">
                            {subscription.tier.name as string}
                          </span>
                          <span className={`text-[9px] px-2 py-0.5 rounded font-mono uppercase tracking-wider ${
                            (subscription.subscription as Record<string, unknown>)?.status === "active"
                              ? "bg-accent-emerald/15 text-accent-emerald"
                              : (subscription.subscription as Record<string, unknown>)?.status === "past_due"
                              ? "bg-accent-amber/15 text-accent-amber"
                              : "bg-navy-700 text-navy-400"
                          }`}>
                            {(subscription.subscription as Record<string, unknown>)?.status as string || "active"}
                          </span>
                        </div>
                        <p className="text-xs text-navy-400 mt-1">
                          {(subscription.tier.price as number) > 0
                            ? `$${((subscription.tier.price as number) / 100).toFixed(0)}/${subscription.tier.interval as string}`
                            : "Custom pricing"}
                        </p>
                        {(subscription.subscription as Record<string, unknown>)?.currentPeriodEnd && (
                          <p className="text-[10px] text-navy-500 mt-1">
                            {(subscription.subscription as Record<string, unknown>)?.cancelAtPeriodEnd
                              ? "Cancels"
                              : "Renews"}{" "}
                            {new Date(
                              (subscription.subscription as Record<string, unknown>)?.currentPeriodEnd as string
                            ).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      {(subscription.subscription as Record<string, unknown>)?.stripeCustomerId && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={portalLoading}
                          onClick={async () => {
                            setPortalLoading(true);
                            try {
                              const res = await fetch("/api/stripe/portal", { method: "POST" });
                              const data = await res.json();
                              if (data.url) window.location.href = data.url;
                            } catch {
                              // ignore
                            }
                            setPortalLoading(false);
                          }}
                        >
                          {portalLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                          ) : (
                            <ExternalLink className="h-3 w-3 mr-1.5" />
                          )}
                          Manage Billing
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div>
                      <span className="text-lg font-bold text-navy-100 font-mono">Free</span>
                      <p className="text-xs text-navy-400 mt-1">No active subscription. Choose a plan below to unlock full access.</p>
                    </div>
                  )}
                </div>

                {/* Features */}
                {subscription.tier && (
                  <div className="border border-navy-700 rounded p-5">
                    <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-3">
                      Your Features
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {(JSON.parse(subscription.tier.features as string) as string[]).map((f: string) => (
                        <div key={f} className="flex items-center gap-2 text-xs text-navy-300">
                          <CheckCircle2 className="h-3 w-3 text-accent-emerald shrink-0" />
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Available Plans */}
                {allTiers.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-3">
                      {subscription.tier ? "Change Plan" : "Available Plans"}
                    </h3>
                    <div className="grid gap-4 md:grid-cols-3">
                      {allTiers
                        .filter((t) => (t.active as number) === 1)
                        .map((tier) => {
                          const isCurrent = subscription.tier && (subscription.tier.id as number) === (tier.id as number);
                          const features = JSON.parse(tier.features as string) as string[];
                          const price = tier.price as number;
                          return (
                            <div
                              key={tier.id as number}
                              className={`border rounded p-4 transition-colors ${
                                (tier.highlighted as number)
                                  ? "border-accent-cyan/40 bg-accent-cyan/[0.03]"
                                  : "border-navy-700"
                              } ${isCurrent ? "ring-1 ring-accent-emerald/40" : ""}`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold text-navy-100 font-mono">
                                  {tier.name as string}
                                </span>
                                {isCurrent && (
                                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-accent-emerald/15 text-accent-emerald font-mono uppercase tracking-wider">
                                    Current
                                  </span>
                                )}
                              </div>
                              <p className="text-lg font-bold text-navy-100 font-mono mb-3">
                                {price > 0 ? `$${(price / 100).toFixed(0)}` : "Custom"}
                                {price > 0 && (
                                  <span className="text-xs text-navy-500 font-normal">
                                    /{tier.interval as string}
                                  </span>
                                )}
                              </p>
                              <div className="space-y-1.5 mb-4">
                                {features.slice(0, 4).map((f: string) => (
                                  <div key={f} className="flex items-start gap-2 text-[11px] text-navy-400">
                                    <CheckCircle2 className="h-3 w-3 text-navy-600 shrink-0 mt-0.5" />
                                    {f}
                                  </div>
                                ))}
                                {features.length > 4 && (
                                  <span className="text-[10px] text-navy-500">
                                    +{features.length - 4} more features
                                  </span>
                                )}
                              </div>
                              {!isCurrent && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  disabled={checkoutLoading === (tier.id as number) || price === 0}
                                  onClick={async () => {
                                    if (price === 0) return;
                                    setCheckoutLoading(tier.id as number);
                                    try {
                                      const res = await fetch("/api/stripe/checkout", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ tierId: tier.id }),
                                      });
                                      const data = await res.json();
                                      if (data.url) window.location.href = data.url;
                                    } catch {
                                      // ignore
                                    }
                                    setCheckoutLoading(null);
                                  }}
                                >
                                  {checkoutLoading === (tier.id as number) ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : price === 0 ? (
                                    "Contact Us"
                                  ) : (
                                    "Upgrade"
                                  )}
                                </Button>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Tabs.Content>

        {/* AI Models Tab */}
        <Tabs.Content value="ai-models">
          <div className="space-y-6 max-w-2xl">
            {/* Primary Model */}
            <div className="border border-navy-700 rounded p-4">
              <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-1">
                Primary AI Model
              </h3>
              <p className="text-[10px] text-navy-600 mb-4">
                Used for analysis, predictions, thesis generation, calendar readings, and alert suggestions.
                Defaults to Opus 4.6 for maximum intelligence on critical decisions.
              </p>
              <div className="space-y-2">
                {AI_MODELS.map((model) => {
                  const isSelected = aiModel === model.id;
                  return (
                    <button
                      key={model.id}
                      onClick={() => {
                        setAiModel(model.id);
                        saveSetting("ai_model", model.id);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? TIER_STYLES[model.tier]
                          : "border-navy-800 bg-navy-900/30 hover:border-navy-700 hover:bg-navy-900/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? "border-accent-cyan" : "border-navy-600"
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold ${isSelected ? "text-navy-100" : "text-navy-300"}`}>
                              {model.label}
                            </span>
                            <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider ${TIER_BADGE[model.tier]}`}>
                              {model.tier}
                            </span>
                          </div>
                          <span className="text-[10px] text-navy-500">{model.description}</span>
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="h-4 w-4 text-accent-cyan shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chat Model Override */}
            <div className="border border-navy-700 rounded p-4">
              <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-1">
                Chat Model (Optional Override)
              </h3>
              <p className="text-[10px] text-navy-600 mb-4">
                Optionally use a different model for the chat interface. If not set, uses the primary model above.
                You might want a faster model for chat while keeping Opus for critical analysis.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setAiChatModel("");
                    deleteSetting("ai_chat_model");
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all ${
                    !aiChatModel
                      ? "border-accent-cyan/30 bg-accent-cyan/[0.04]"
                      : "border-navy-800 bg-navy-900/30 hover:border-navy-700"
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                    !aiChatModel ? "border-accent-cyan" : "border-navy-600"
                  }`}>
                    {!aiChatModel && <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan" />}
                  </div>
                  <div>
                    <span className={`text-xs font-semibold ${!aiChatModel ? "text-navy-100" : "text-navy-400"}`}>
                      Use Primary Model
                    </span>
                    <span className="text-[10px] text-navy-500 block">
                      Same as above ({AI_MODELS.find(m => m.id === aiModel)?.label || aiModel})
                    </span>
                  </div>
                </button>
                {AI_MODELS.map((model) => {
                  const isSelected = aiChatModel === model.id;
                  return (
                    <button
                      key={model.id}
                      onClick={() => {
                        setAiChatModel(model.id);
                        saveSetting("ai_chat_model", model.id);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? TIER_STYLES[model.tier]
                          : "border-navy-800 bg-navy-900/30 hover:border-navy-700 hover:bg-navy-900/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? "border-accent-cyan" : "border-navy-600"
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold ${isSelected ? "text-navy-100" : "text-navy-300"}`}>
                              {model.label}
                            </span>
                            <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider ${TIER_BADGE[model.tier]}`}>
                              {model.tier}
                            </span>
                          </div>
                          <span className="text-[10px] text-navy-500">{model.description}</span>
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="h-4 w-4 text-accent-cyan shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Info box */}
            <div className="border border-navy-700/50 rounded p-4 bg-navy-900/30">
              <div className="flex items-start gap-2">
                <Shield className="h-3.5 w-3.5 text-accent-amber mt-0.5 shrink-0" />
                <div className="text-[10px] text-navy-400 leading-relaxed">
                  <strong className="text-navy-300">Recommendation:</strong> Keep the primary model on Opus 4.6 for maximum accuracy on predictions, thesis generation, and signal analysis.
                  These are high-stakes decisions where model capability directly impacts quality.
                  If you need faster chat responses, set the chat override to Sonnet 4 while keeping Opus for everything else.
                </div>
              </div>
            </div>
          </div>
        </Tabs.Content>

        {/* Prompts Tab */}
        <Tabs.Content value="prompts">
          <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] text-navy-400">
                  Manage all system prompts used across the platform. Changes take effect immediately on next use.
                </p>
              </div>
              {overriddenCount > 0 && (
                <span className="text-[10px] font-mono text-accent-amber">
                  {overriddenCount} modified
                </span>
              )}
            </div>

            {promptsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {PROMPT_CATEGORIES.map((cat) => {
                  const categoryPrompts = prompts.filter(
                    (p) => p.category === cat.id
                  );
                  if (categoryPrompts.length === 0) return null;
                  return (
                    <div key={cat.id}>
                      <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-2">
                        {cat.label}
                      </h3>
                      <div className="space-y-1">
                        {categoryPrompts.map((p) => (
                          <PromptEditor
                            key={p.key}
                            prompt={p}
                            onSave={savePrompt}
                            onReset={resetPrompt}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Tabs.Content>

        {/* API Keys Tab */}
        <Tabs.Content value="api-keys">
          <div className="space-y-4 max-w-2xl">
            {/* AI */}
            <div className="border border-navy-700 rounded p-4">
              <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-3">
                AI Provider
              </h3>
              <div className="space-y-3">
                <ApiKeyField
                  label="Anthropic API Key (Claude)"
                  settingKey="anthropic_api_key"
                  value={anthropicKey}
                  onChange={setAnthropicKey}
                  placeholder="sk-ant-..."
                />
                <ApiKeyField
                  label="Voyage AI API Key (Embeddings)"
                  settingKey="voyage_api_key"
                  value={voyageKey}
                  onChange={setVoyageKey}
                  placeholder="pa-... (optional, falls back to Anthropic key)"
                />
              </div>
            </div>

            {/* Market Data */}
            <div className="border border-navy-700 rounded p-4">
              <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-3">
                Market Data
              </h3>
              <div className="space-y-3">
                <ApiKeyField
                  label="Alpha Vantage API Key"
                  settingKey="alpha_vantage_api_key"
                  value={alphaVantageKey}
                  onChange={setAlphaVantageKey}
                  placeholder="Enter Alpha Vantage key..."
                />
                <ApiKeyField
                  label="FRED API Key"
                  settingKey="fred_api_key"
                  value={fredKey}
                  onChange={setFredKey}
                  placeholder="Enter FRED API key..."
                />
              </div>
            </div>

            {/* Brokers */}
            <div className="border border-navy-700 rounded p-4">
              <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-3">
                Trading 212
              </h3>
              <div className="space-y-3">
                <ApiKeyField
                  label="API Key"
                  settingKey="t212_api_key"
                  value={t212Key}
                  onChange={setT212Key}
                  placeholder="Enter T212 API key..."
                />
                <ApiKeyField
                  label="API Secret"
                  settingKey="t212_api_secret"
                  value={t212Secret}
                  onChange={setT212Secret}
                  placeholder="Enter T212 API secret..."
                />
              </div>
            </div>

            <div className="border border-navy-700 rounded p-4">
              <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-3">
                Coinbase
              </h3>
              <div className="space-y-3">
                <ApiKeyField
                  label="API Key"
                  settingKey="coinbase_api_key"
                  value={coinbaseKey}
                  onChange={setCoinbaseKey}
                  placeholder="Enter Coinbase API key..."
                />
                <ApiKeyField
                  label="API Secret"
                  settingKey="coinbase_api_secret"
                  value={coinbaseSecret}
                  onChange={setCoinbaseSecret}
                  placeholder="Enter Coinbase API secret..."
                />
              </div>
            </div>

            {/* OSINT / Conflict Data */}
            <div className="border border-navy-700 rounded p-4">
              <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-3">
                ACLED (Conflict Data)
              </h3>
              <div className="space-y-3">
                <ApiKeyField
                  label="API Key"
                  settingKey="acled_api_key"
                  value={acledKey}
                  onChange={setAcledKey}
                  placeholder="Enter ACLED API key..."
                />
                <ApiKeyField
                  label="Email"
                  settingKey="acled_email"
                  value={acledEmail}
                  onChange={setAcledEmail}
                  placeholder="Enter ACLED email..."
                  type="email"
                />
              </div>
            </div>
          </div>
        </Tabs.Content>

        {/* Trading Tab */}
        <Tabs.Content value="trading">
          <div className="space-y-4 max-w-2xl">
            {/* Environment */}
            <div className="border border-navy-700 rounded p-4">
              <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-3">
                Trading Environment
              </h3>
              <div className="flex items-center gap-3">
                <Button
                  variant={tradingEnv === "demo" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setTradingEnv("demo");
                    saveSetting("trading_environment", "demo");
                  }}
                >
                  DEMO
                </Button>
                <Button
                  variant={tradingEnv === "live" ? "destructive" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setTradingEnv("live");
                    saveSetting("trading_environment", "live");
                  }}
                >
                  LIVE
                </Button>
                <StatusDot
                  color={tradingEnv === "demo" ? "green" : "red"}
                  label={tradingEnv === "demo" ? "Safe: Demo mode" : "WARNING: Live trading"}
                />
              </div>
            </div>

            {/* Risk Controls */}
            <div className="border border-navy-700 rounded p-4">
              <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-3 flex items-center gap-1.5">
                <Shield className="h-3 w-3" />
                Risk Controls
              </h3>
              <div className="space-y-3">
                <NumberField
                  label="Max Order Size"
                  settingKey="max_order_size"
                  value={maxOrderSize}
                  onChange={setMaxOrderSize}
                  suffix="USD"
                />
                <NumberField
                  label="Daily Trade Limit"
                  settingKey="daily_trade_limit"
                  value={dailyTradeLimit}
                  onChange={setDailyTradeLimit}
                  suffix="trades/day"
                />
                <NumberField
                  label="Position Concentration Warning"
                  settingKey="position_concentration_pct"
                  value={positionConcentration}
                  onChange={setPositionConcentration}
                  suffix="%"
                />
              </div>
            </div>

            {/* Default Order Parameters */}
            <div className="border border-navy-700 rounded p-4">
              <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-3">
                Default Order Parameters
              </h3>
              <div className="space-y-3">
                <NumberField
                  label="Default Stop Loss"
                  settingKey="default_stop_loss_pct"
                  value={stopLossPct}
                  onChange={setStopLossPct}
                  suffix="%"
                />
                <NumberField
                  label="Default Take Profit"
                  settingKey="default_take_profit_pct"
                  value={takeProfitPct}
                  onChange={setTakeProfitPct}
                  suffix="%"
                />
              </div>
            </div>
          </div>
        </Tabs.Content>

        {/* Data Sources Tab */}
        <Tabs.Content value="data">
          <div className="space-y-4 max-w-2xl">
            <div className="border border-navy-700 rounded p-4">
              <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-3">
                Polling Intervals
              </h3>
              <p className="text-[10px] text-navy-600 mb-3">
                How often each data source refreshes. Lower values increase API usage.
              </p>
              <div className="space-y-3">
                <NumberField
                  label="News Feed Polling"
                  settingKey="news_polling_interval"
                  value={newsPollingInterval}
                  onChange={setNewsPollingInterval}
                  suffix="seconds"
                />
                <NumberField
                  label="OSINT / GDELT Polling"
                  settingKey="osint_polling_interval"
                  value={osintPollingInterval}
                  onChange={setOsintPollingInterval}
                  suffix="seconds"
                />
                <NumberField
                  label="Aircraft Tracking Polling"
                  settingKey="aircraft_polling_interval"
                  value={aircraftPollingInterval}
                  onChange={setAircraftPollingInterval}
                  suffix="seconds"
                />
                <NumberField
                  label="Market Data Refresh"
                  settingKey="market_refresh_interval"
                  value={marketRefreshInterval}
                  onChange={setMarketRefreshInterval}
                  suffix="seconds"
                />
              </div>
            </div>

            <div className="border border-navy-700 rounded p-4">
              <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-3">
                Predictions
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">
                    Auto-Resolve Overdue Predictions
                  </label>
                  <div className="flex items-center gap-3">
                    <Button
                      variant={predictionAutoResolve === "1" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => {
                        setPredictionAutoResolve("1");
                        saveSetting("prediction_auto_resolve", "1");
                      }}
                    >
                      Enabled
                    </Button>
                    <Button
                      variant={predictionAutoResolve === "0" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => {
                        setPredictionAutoResolve("0");
                        saveSetting("prediction_auto_resolve", "0");
                      }}
                    >
                      Disabled
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Tabs.Content>

        {/* System Tab */}
        <Tabs.Content value="system">
          <div className="space-y-4 max-w-2xl">
            <div className="border border-navy-700 rounded p-4">
              <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-3">
                All Settings ({settings.length})
              </h3>
              {settings.length === 0 ? (
                <p className="text-[10px] text-navy-600">No settings configured yet.</p>
              ) : (
                <div className="space-y-1">
                  {settings.map((s) => (
                    <div
                      key={s.key}
                      className="flex items-center justify-between rounded px-3 py-1.5 text-xs hover:bg-navy-800 group"
                    >
                      <span className="text-navy-400 font-mono text-[11px]">{s.key}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-navy-300 text-[11px]">{s.value}</span>
                        <span className="text-[9px] text-navy-600">
                          {new Date(s.updatedAt).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => deleteSetting(s.key)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-navy-600 hover:text-red-400"
                          disabled={deleting === s.key}
                        >
                          {deleting === s.key ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </PageContainer>
  );
}
