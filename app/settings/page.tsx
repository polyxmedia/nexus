"use client";

import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { StatusDot } from "@/components/ui/status-dot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Loader2, Save } from "lucide-react";

interface SettingEntry {
  key: string;
  value: string;
  updatedAt: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const [t212Key, setT212Key] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [alphaVantageKey, setAlphaVantageKey] = useState("");

  const [maxOrderSize, setMaxOrderSize] = useState("1000");
  const [dailyTradeLimit, setDailyTradeLimit] = useState("10");
  const [positionConcentration, setPositionConcentration] = useState("20");
  const [tradingEnv, setTradingEnv] = useState("demo");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const s = data.settings || [];
        setSettings(s);
        for (const setting of s) {
          switch (setting.key) {
            case "max_order_size":
              setMaxOrderSize(setting.value);
              break;
            case "daily_trade_limit":
              setDailyTradeLimit(setting.value);
              break;
            case "position_concentration_pct":
              setPositionConcentration(setting.value);
              break;
            case "trading_environment":
              setTradingEnv(setting.value);
              break;
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const saveSetting = async (key: string, value: string) => {
    setSaving(key);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      setSaved(key);
      setTimeout(() => setSaved(null), 2000);
    } catch {
      // ignore
    } finally {
      setSaving(null);
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

  return (
    <PageContainer title="Settings" subtitle="API keys, risk parameters, and preferences">
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-4 max-w-2xl">
          {/* Trading Environment */}
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

          {/* API Keys */}
          <div className="border border-navy-700 rounded p-4">
            <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-3">
              API Keys
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">
                  Trading 212 API Key
                </label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="Enter T212 API key..."
                    value={t212Key}
                    onChange={(e) => setT212Key(e.target.value)}
                  />
                  <SaveBtn settingKey="t212_api_key" value={t212Key} />
                </div>
                {settings.find((s) => s.key === "t212_api_key") && (
                  <p className="text-[10px] text-navy-600 mt-1">
                    Current: {settings.find((s) => s.key === "t212_api_key")?.value}
                  </p>
                )}
              </div>

              <div>
                <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">
                  Anthropic API Key (Claude)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="Enter Anthropic API key..."
                    value={anthropicKey}
                    onChange={(e) => setAnthropicKey(e.target.value)}
                  />
                  <SaveBtn settingKey="anthropic_api_key" value={anthropicKey} />
                </div>
                {settings.find((s) => s.key === "anthropic_api_key") && (
                  <p className="text-[10px] text-navy-600 mt-1">
                    Current: {settings.find((s) => s.key === "anthropic_api_key")?.value}
                  </p>
                )}
              </div>

              <div>
                <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">
                  Alpha Vantage API Key
                </label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="Enter Alpha Vantage API key..."
                    value={alphaVantageKey}
                    onChange={(e) => setAlphaVantageKey(e.target.value)}
                  />
                  <SaveBtn settingKey="alpha_vantage_api_key" value={alphaVantageKey} />
                </div>
                {settings.find((s) => s.key === "alpha_vantage_api_key") && (
                  <p className="text-[10px] text-navy-600 mt-1">
                    Current: {settings.find((s) => s.key === "alpha_vantage_api_key")?.value}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Risk Controls */}
          <div className="border border-navy-700 rounded p-4">
            <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-3">
              Risk Controls
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">
                  Max Order Size (USD)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={maxOrderSize}
                    onChange={(e) => setMaxOrderSize(e.target.value)}
                  />
                  <SaveBtn settingKey="max_order_size" value={maxOrderSize} />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">
                  Daily Trade Limit
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={dailyTradeLimit}
                    onChange={(e) => setDailyTradeLimit(e.target.value)}
                  />
                  <SaveBtn settingKey="daily_trade_limit" value={dailyTradeLimit} />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">
                  Position Concentration Warning (%)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={positionConcentration}
                    onChange={(e) => setPositionConcentration(e.target.value)}
                  />
                  <SaveBtn settingKey="position_concentration_pct" value={positionConcentration} />
                </div>
              </div>
            </div>
          </div>

          {/* All Settings */}
          <div className="border border-navy-700 rounded p-4">
            <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-3">
              All Settings
            </h3>
            <div className="space-y-1">
              {settings.map((s) => (
                <div
                  key={s.key}
                  className="flex items-center justify-between rounded px-3 py-1.5 text-xs hover:bg-navy-800"
                >
                  <span className="text-navy-400 font-mono">{s.key}</span>
                  <span className="text-navy-300">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
