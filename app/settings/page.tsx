"use client";

import { useEffect, useState } from "react";
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
  Brain,
} from "lucide-react";

interface SettingEntry {
  key: string;
  value: string;
  updatedAt: string;
}

const TABS = [
  { id: "subscription", label: "Subscription", icon: CreditCard },
  { id: "ai-models", label: "AI Models", icon: Brain },
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


export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingEntry[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [jiangMode, setJiangMode] = useState(false);

  // API Keys
  const [voyageKey, setVoyageKey] = useState("");
  const [t212Key, setT212Key] = useState("");
  const [t212Secret, setT212Secret] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [alphaVantageKey, setAlphaVantageKey] = useState("");
  const [coinbaseKey, setCoinbaseKey] = useState("");
  const [coinbaseSecret, setCoinbaseSecret] = useState("");
  const [fredKey, setFredKey] = useState("");
  const [ibkrGatewayUrl, setIbkrGatewayUrl] = useState("");
  const [ibkrAccountId, setIbkrAccountId] = useState("");
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
            case "jiang_mode": setJiangMode(setting.value === "true"); break;
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
                        {Boolean((subscription.subscription as Record<string, unknown>)?.currentPeriodEnd) && (
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
                      {Boolean((subscription.subscription as Record<string, unknown>)?.stripeCustomerId) && (
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

            {/* Jiang Mode */}
            <div className="border border-navy-700 rounded p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-1">
                    Narrative Synthesis Mode
                  </h3>
                  <p className="text-[10px] text-navy-600 max-w-md">
                    Disables convergence scoring. Focuses the analyst on narrative synthesis, belief-driven scenario modeling, and actor-psychology analysis. Useful when you want to explore &ldquo;what actors believe will happen&rdquo; rather than quantitative convergence scores.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const next = !jiangMode;
                    setJiangMode(next);
                    saveSetting("jiang_mode", next ? "true" : "false");
                  }}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ml-4 ${
                    jiangMode ? "bg-accent-amber" : "bg-navy-700"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      jiangMode ? "translate-x-5.5" : "translate-x-0.5"
                    }`}
                    style={{
                      transform: jiangMode ? "translateX(22px)" : "translateX(2px)",
                    }}
                  />
                </button>
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
                Trading 212 (Stocks)
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
                Coinbase (Crypto)
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

            <div className="border border-navy-700 rounded p-4">
              <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-3">
                Interactive Brokers
              </h3>
              <p className="text-[10px] text-navy-600 mb-3">
                Connect via the IBKR Client Portal Gateway. Multi-asset: stocks, options, futures, forex, bonds.
              </p>
              <div className="space-y-3">
                <ApiKeyField
                  label="Gateway URL"
                  settingKey="ibkr_gateway_url"
                  value={ibkrGatewayUrl}
                  onChange={setIbkrGatewayUrl}
                  placeholder="https://localhost:5000"
                />
                <ApiKeyField
                  label="Account ID (optional)"
                  settingKey="ibkr_account_id"
                  value={ibkrAccountId}
                  onChange={setIbkrAccountId}
                  placeholder="e.g. U1234567 or DU1234567 for paper"
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
          <div className="space-y-6 max-w-3xl">
            {settings.length === 0 ? (
              <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-8 text-center">
                <Settings2 className="h-8 w-8 text-navy-600 mx-auto mb-3" />
                <p className="text-sm text-navy-400">No settings configured yet.</p>
              </div>
            ) : (
              (() => {
                // Categorize settings
                const categories: Record<string, { label: string; icon: React.ReactNode; color: string; borderColor: string; settings: SettingEntry[] }> = {};
                const apiKeyPatterns = ["api_key", "api_secret", "secret"];
                const tradingPatterns = ["trading", "max_order", "trade_limit", "position_concentration", "stop_loss", "take_profit"];
                const aiPatterns = ["ai_", "model", "prompt"];
                const subscriptionPatterns = ["subscription", "tier", "stripe"];

                settings.forEach((s) => {
                  const baseKey = s.key.includes(":") ? s.key.split(":").slice(1).join(":") : s.key;
                  const lk = baseKey.toLowerCase();

                  let cat: string;
                  if (apiKeyPatterns.some(p => lk.includes(p))) {
                    cat = "api-keys";
                  } else if (tradingPatterns.some(p => lk.includes(p))) {
                    cat = "trading";
                  } else if (aiPatterns.some(p => lk.includes(p))) {
                    cat = "ai";
                  } else if (subscriptionPatterns.some(p => lk.includes(p))) {
                    cat = "subscription";
                  } else {
                    cat = "general";
                  }

                  if (!categories[cat]) {
                    const configs: Record<string, { label: string; icon: React.ReactNode; color: string; borderColor: string }> = {
                      "api-keys": { label: "API Keys & Secrets", icon: <Key className="h-4 w-4" />, color: "text-accent-amber", borderColor: "border-accent-amber/20" },
                      "trading": { label: "Trading Configuration", icon: <TrendingUp className="h-4 w-4" />, color: "text-accent-emerald", borderColor: "border-accent-emerald/20" },
                      "ai": { label: "AI & Model Settings", icon: <Brain className="h-4 w-4" />, color: "text-accent-cyan", borderColor: "border-accent-cyan/20" },
                      "subscription": { label: "Subscription & Billing", icon: <CreditCard className="h-4 w-4" />, color: "text-purple-400", borderColor: "border-purple-400/20" },
                      "general": { label: "General Settings", icon: <Settings2 className="h-4 w-4" />, color: "text-navy-400", borderColor: "border-navy-600" },
                    };
                    const cfg = configs[cat] || configs.general;
                    categories[cat] = { ...cfg, settings: [] };
                  }
                  categories[cat].settings.push(s);
                });

                const order = ["ai", "api-keys", "trading", "subscription", "general"];
                const sorted = order.filter(k => categories[k]).map(k => ({ id: k, ...categories[k] }));

                return sorted.map((cat) => (
                  <div key={cat.id} className={`border ${cat.borderColor} rounded-lg bg-navy-900/30 overflow-hidden`}>
                    {/* Category header */}
                    <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-navy-800/60">
                      <span className={cat.color}>{cat.icon}</span>
                      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-navy-300">
                        {cat.label}
                      </h3>
                      <span className="ml-auto text-[10px] font-mono text-navy-600">
                        {cat.settings.length} {cat.settings.length === 1 ? "entry" : "entries"}
                      </span>
                    </div>

                    {/* Settings cards */}
                    <div className="divide-y divide-navy-800/40">
                      {cat.settings.map((s) => {
                        const baseKey = s.key.includes(":") ? s.key.split(":").slice(1).join(":") : s.key;
                        const isMasked = s.value.startsWith("****");
                        let parsedJson: Record<string, unknown> | null = null;
                        if (!isMasked) {
                          try {
                            const parsed = JSON.parse(s.value);
                            if (typeof parsed === "object" && parsed !== null) {
                              parsedJson = parsed as Record<string, unknown>;
                            }
                          } catch {
                            // not JSON
                          }
                        }
                        const isLongValue = s.value.length > 120;

                        return (
                          <div key={s.key} className="px-5 py-3.5 hover:bg-navy-800/20 transition-colors group">
                            <div className="flex items-start justify-between gap-4">
                              {/* Key + value */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-mono text-[11px] font-medium text-navy-300">
                                    {baseKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                                  </span>
                                  {isMasked && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-amber/10 text-accent-amber font-mono uppercase tracking-wider">
                                      Encrypted
                                    </span>
                                  )}
                                </div>

                                {/* Render based on value type */}
                                {isMasked ? (
                                  <span className="font-mono text-[11px] text-navy-500 tracking-wider">{s.value}</span>
                                ) : parsedJson ? (
                                  <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5 bg-navy-950/40 rounded-md px-3.5 py-2.5 border border-navy-800/30">
                                    {Object.entries(parsedJson).map(([jk, jv]) => (
                                      <div key={jk} className="flex items-baseline gap-2 min-w-0">
                                        <span className="text-[10px] font-mono text-navy-500 shrink-0">
                                          {jk}
                                        </span>
                                        <span className="text-[11px] text-navy-300 truncate">
                                          {jv === null ? (
                                            <span className="text-navy-600 italic">null</span>
                                          ) : jv === true ? (
                                            <span className="text-accent-emerald">true</span>
                                          ) : jv === false ? (
                                            <span className="text-accent-rose">false</span>
                                          ) : typeof jv === "number" ? (
                                            <span className="text-accent-cyan font-mono">{jv}</span>
                                          ) : typeof jv === "object" ? (
                                            <span className="text-navy-400 font-mono text-[10px]">{JSON.stringify(jv)}</span>
                                          ) : (
                                            String(jv)
                                          )}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : isLongValue ? (
                                  <p className="text-[11px] text-navy-400 mt-1 line-clamp-2 leading-relaxed">
                                    {s.value}
                                  </p>
                                ) : (
                                  <span className="text-[11px] text-navy-400">
                                    {s.value === "true" ? (
                                      <span className="text-accent-emerald font-mono">true</span>
                                    ) : s.value === "false" ? (
                                      <span className="text-accent-rose font-mono">false</span>
                                    ) : !isNaN(Number(s.value)) && s.value.trim() !== "" ? (
                                      <span className="text-accent-cyan font-mono">{s.value}</span>
                                    ) : (
                                      s.value
                                    )}
                                  </span>
                                )}
                              </div>

                              {/* Meta + actions */}
                              <div className="flex items-center gap-3 shrink-0 pt-0.5">
                                <span className="text-[9px] text-navy-600 font-mono">
                                  {new Date(s.updatedAt).toLocaleDateString()}
                                </span>
                                <button
                                  onClick={() => deleteSetting(s.key)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-navy-600 hover:text-red-400 p-1 rounded hover:bg-navy-800/50"
                                  disabled={deleting === s.key}
                                >
                                  {deleting === s.key ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Full key path */}
                            <div className="mt-1.5">
                              <span className="font-mono text-[9px] text-navy-700">{s.key}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()
            )}
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </PageContainer>
  );
}
