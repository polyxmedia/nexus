"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { PaymentForm } from "@/components/stripe/payment-form";
import * as Tabs from "@radix-ui/react-tabs";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { PageContainer } from "@/components/layout/page-container";
import { StatusDot } from "@/components/ui/status-dot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PolymarketConnect } from "@/components/prediction-markets/polymarket-connect";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Key,
  Link2,
  Loader2,
  Save,
  Settings2,
  Shield,
  TrendingUp,
  Database,
  Trash2,
  Brain,
  Bell,
  Send,
  Smartphone,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Zap,
  Plus,
  User,
  Upload,
  Download,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

interface SettingEntry {
  key: string;
  value: string;
  updatedAt: string;
}

function RichValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null || value === undefined) {
    return <span className="text-navy-600 italic">null</span>;
  }
  if (value === true) return <span className="text-accent-emerald font-mono">true</span>;
  if (value === false) return <span className="text-accent-rose font-mono">false</span>;
  if (typeof value === "number") {
    // Format large numbers, keep small ones as-is
    const display = Math.abs(value) >= 1000 && Number.isFinite(value)
      ? value.toLocaleString(undefined, { maximumFractionDigits: 4 })
      : String(value);
    return <span className="text-accent-cyan font-mono">{display}</span>;
  }
  if (typeof value === "string") {
    // Check if it looks like a timestamp
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return <span className="text-navy-300 font-mono text-[10px]">{new Date(value).toLocaleString()}</span>;
    }
    return <span className="text-navy-300">{value}</span>;
  }

  if (Array.isArray(value)) {
    // For arrays of primitives, show inline
    if (value.length === 0) return <span className="text-navy-600 italic">empty</span>;
    if (value.every(v => typeof v === "string" || typeof v === "number")) {
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((item, i) => (
            <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-navy-800/60 text-navy-300 border border-navy-700/40">
              {String(item)}
            </span>
          ))}
        </div>
      );
    }
    // Array of objects - render as indexed cards
    if (depth > 1) {
      return <span className="text-navy-500 font-mono text-[10px]">[{value.length} items]</span>;
    }
    return (
      <div className="space-y-2 mt-1">
        {value.map((item, i) => (
          <div key={i} className="bg-navy-950/40 rounded border border-navy-800/30 px-3 py-2">
            <span className="text-[9px] font-mono text-navy-600 uppercase tracking-wider">#{i}</span>
            <div className="mt-1">
              <RichValue value={item} depth={depth + 1} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <span className="text-navy-600 italic">empty</span>;

    // For deeper nesting or many entries, use compact layout
    const isCompact = depth > 0;
    return (
      <div className={`${isCompact ? "grid grid-cols-2 gap-x-4 gap-y-1" : "grid grid-cols-2 gap-x-6 gap-y-1.5"}`}>
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-baseline gap-2 min-w-0">
            <span className="text-[10px] font-mono text-navy-500 shrink-0">{k}</span>
            <span className="text-[11px] truncate min-w-0">
              <RichValue value={v} depth={depth + 1} />
            </span>
          </div>
        ))}
      </div>
    );
  }

  return <span className="text-navy-400">{String(value)}</span>;
}

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "subscription", label: "Subscription", icon: CreditCard },
  { id: "credits", label: "Credits", icon: Wallet },
  { id: "connections", label: "Connections", icon: Link2 },
  { id: "ai-models", label: "AI Models", icon: Brain },
  { id: "platform-api", label: "Platform API", icon: Shield },
  { id: "trading", label: "Trading", icon: TrendingUp },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "data", label: "Data Sources", icon: Database },
  { id: "system", label: "System", icon: Settings2 },
];

const TELEGRAM_ALERT_TYPES = [
  { id: "signal_convergence", label: "Signal Convergences", description: "Intensity 4+ across multiple layers", global: true },
  { id: "prediction_resolved", label: "Prediction Outcomes", description: "Win/loss notifications when predictions resolve", global: true },
  { id: "price_target", label: "Price Targets", description: "Monitored symbols hitting Monte Carlo P50 targets", global: false },
  { id: "warroom_escalation", label: "War Room Escalations", description: "Real-time military/geopolitical escalation alerts", global: true },
  { id: "trade_executed", label: "Trade Executions", description: "Confirmation when trades execute on your account", global: false },
  { id: "daily_briefing", label: "Daily Briefing", description: "Morning intelligence digest at 08:00 UTC", global: true },
  { id: "chokepoint_status", label: "Chokepoint Alerts", description: "Status changes on your subscribed maritime chokepoints", global: false },
];

const AI_MODELS = [
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", tier: "balanced" as const, description: "Fast and capable. Great balance of quality and cost." },
  { id: "claude-opus-4-6", label: "Claude Opus 4.6", tier: "flagship" as const, description: "Most capable model. Best for critical analysis, predictions, and complex reasoning." },
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", tier: "balanced" as const, description: "Previous generation Sonnet. Reliable and cost-effective." },
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


function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changing, setChanging] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleChange = async () => {
    if (newPassword !== confirmPassword) {
      setResult({ type: "error", message: "Passwords do not match" });
      return;
    }
    setChanging(true);
    setResult(null);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ type: "success", message: "Password changed successfully" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setResult({ type: "error", message: data.error || "Failed to change password" });
      }
    } catch {
      setResult({ type: "error", message: "Network error" });
    }
    setChanging(false);
  };

  return (
    <div className="border border-navy-700/50 rounded-lg bg-navy-900/30 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Lock className="h-3.5 w-3.5 text-navy-400" />
        <h3 className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Change Password</h3>
      </div>
      <div className="space-y-3 max-w-sm">
        <div className="relative">
          <Input
            type={showCurrent ? "text" : "password"}
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="text-[11px] pr-8"
          />
          <button
            type="button"
            onClick={() => setShowCurrent(!showCurrent)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-navy-500 hover:text-navy-300"
          >
            {showCurrent ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
        <div className="relative">
          <Input
            type={showNew ? "text" : "password"}
            placeholder="New password (min 10 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="text-[11px] pr-8"
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-navy-500 hover:text-navy-300"
          >
            {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
        <Input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="text-[11px]"
        />
        {result && (
          <div className={cn(
            "text-[11px] font-mono px-3 py-2 rounded border",
            result.type === "success"
              ? "text-accent-emerald bg-accent-emerald/10 border-accent-emerald/20"
              : "text-accent-rose bg-accent-rose/10 border-accent-rose/20"
          )}>
            {result.message}
          </div>
        )}
        <Button
          size="sm"
          onClick={handleChange}
          disabled={changing || !currentPassword || !newPassword || !confirmPassword || newPassword.length < 10}
        >
          {changing ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Lock className="h-3 w-3 mr-1.5" />}
          Change password
        </Button>
      </div>
    </div>
  );
}

function DataExportSection() {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/account/export");
      if (!res.ok) {
        console.error("Export failed:", res.status);
        setExporting(false);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") || "nexus-export.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      console.error("Export error:", err);
    }
    setExporting(false);
  };

  return (
    <div className="border border-navy-700/50 rounded-lg bg-navy-900/30 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Download className="h-3.5 w-3.5 text-navy-400" />
        <h3 className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Export Your Data</h3>
      </div>
      <p className="text-[11px] text-navy-400 leading-relaxed mb-3">
        Download a JSON file containing your profile, settings, predictions, trades, and chat history.
      </p>
      <Button size="sm" onClick={handleExport} disabled={exporting}>
        {exporting ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Download className="h-3 w-3 mr-1.5" />}
        {exporting ? "Exporting..." : "Download my data"}
      </Button>
    </div>
  );
}

function CloseAccountSection({ username }: { username: string }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = async () => {
    if (confirmText !== username) return;
    setClosing(true);
    setError(null);
    try {
      const res = await fetch("/api/account/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmUsername: confirmText }),
      });
      if (res.ok) {
        signOut({ callbackUrl: "/" });
      } else {
        const data = await res.json();
        setError(data.error || "Failed to close account");
      }
    } catch {
      setError("Network error");
    }
    setClosing(false);
  };

  return (
    <div className="border border-accent-rose/20 rounded-lg bg-accent-rose/[0.02] p-5">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-3.5 w-3.5 text-accent-rose" />
        <h3 className="text-[10px] font-mono uppercase tracking-wider text-accent-rose/70">Close Account</h3>
      </div>

      {!showConfirm ? (
        <div className="space-y-2">
          <p className="text-[11px] text-navy-400 leading-relaxed">
            Permanently delete your account and all associated data. If you have an active subscription, it will be cancelled immediately. This action cannot be undone.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConfirm(true)}
            className="text-accent-rose/60 hover:text-accent-rose hover:bg-accent-rose/10 border border-accent-rose/20"
          >
            <Trash2 className="h-3 w-3 mr-1.5" />
            Close my account
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[11px] text-navy-300 leading-relaxed">
            Type your username <span className="font-mono text-accent-rose">{username}</span> to confirm. This will:
          </p>
          <ul className="text-[10px] text-navy-400 space-y-1 ml-3">
            <li>Cancel any active subscription</li>
            <li>Delete all your settings and preferences</li>
            <li>Remove your account permanently</li>
          </ul>

          {error && (
            <div className="text-[11px] font-mono text-accent-rose bg-accent-rose/10 px-3 py-2 rounded border border-accent-rose/20">
              {error}
            </div>
          )}

          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={`Type "${username}" to confirm`}
            className="text-[11px] font-mono"
          />

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setShowConfirm(false); setConfirmText(""); setError(null); }}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleClose}
              disabled={confirmText !== username || closing}
              className="bg-accent-rose/15 text-accent-rose border-accent-rose/25 hover:bg-accent-rose/25 disabled:opacity-40"
            >
              {closing ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Trash2 className="h-3 w-3 mr-1.5" />}
              Permanently close account
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const username = session?.user?.name || "";
  const email = session?.user?.email || "";
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
  const [checkoutTierId, setCheckoutTierId] = useState<number | null>(null);
  const [checkoutClientSecret, setCheckoutClientSecret] = useState<string | null>(null);
  const [checkoutIntentType, setCheckoutIntentType] = useState<"payment" | "setup">("payment");
  const [checkoutResult, setCheckoutResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // AI Model
  const [aiModel, setAiModel] = useState("claude-sonnet-4-6");
  const [aiModelSaved, setAiModelSaved] = useState("claude-sonnet-4-6");
  const [aiChatModel, setAiChatModel] = useState("");
  const [aiChatModelSaved, setAiChatModelSaved] = useState("");
  const [jiangMode, setJiangMode] = useState(false);
  const [jiangModeSaved, setJiangModeSaved] = useState(false);
  const [voiceId, setVoiceId] = useState("onyx");
  const [voiceIdSaved, setVoiceIdSaved] = useState("onyx");
  const aiModelsDirty = aiModel !== aiModelSaved || aiChatModel !== aiChatModelSaved || jiangMode !== jiangModeSaved || voiceId !== voiceIdSaved;

  // API Keys
  const [t212Key, setT212Key] = useState("");
  const [t212Secret, setT212Secret] = useState("");
  const [coinbaseKey, setCoinbaseKey] = useState("");
  const [coinbaseSecret, setCoinbaseSecret] = useState("");
  const [coinbaseOAuth, setCoinbaseOAuth] = useState<{ oauthAvailable: boolean; connected: boolean } | null>(null);
  const [coinbaseConnecting, setCoinbaseConnecting] = useState(false);
  const [alpacaOAuth, setAlpacaOAuth] = useState<{ oauthAvailable: boolean; connected: boolean } | null>(null);
  const [alpacaConnecting, setAlpacaConnecting] = useState(false);
  const [brokerRequest, setBrokerRequest] = useState("");
  const [ibkrGatewayUrl, setIbkrGatewayUrl] = useState("");
  const [ibkrAccountId, setIbkrAccountId] = useState("");
  const [igConnected, setIgConnected] = useState(false);

  // Connection flow state
  const [connectingBroker, setConnectingBroker] = useState<string | null>(null);
  const [connectExpanded, setConnectExpanded] = useState<string | null>(null);
  const [connectStatus, setConnectStatus] = useState<Record<string, { ok: boolean; message: string } | null>>({});
  const [brokerModal, setBrokerModal] = useState<string | null>(null);
  const [t212Form, setT212Form] = useState({ apiKey: "", apiSecret: "" });
  const [coinbaseForm, setCoinbaseForm] = useState({ apiKey: "", apiSecret: "" });
  const [kalshiKeyId, setKalshiKeyId] = useState("");
  const [kalshiForm, setKalshiForm] = useState({ keyId: "", privateKey: "" });

  // Trading
  const [maxOrderSize, setMaxOrderSize] = useState("1000");
  const [dailyTradeLimit, setDailyTradeLimit] = useState("10");
  const [positionConcentration, setPositionConcentration] = useState("20");
  const [tradingEnv, setTradingEnv] = useState("demo");
  const [stopLossPct, setStopLossPct] = useState("5");
  const [takeProfitPct, setTakeProfitPct] = useState("10");

  // Telegram / Notifications
  const [telegramChatId, setTelegramChatId] = useState("");
  const [smsPhone, setSmsPhone] = useState("");
  const [telegramAlerts, setTelegramAlerts] = useState<string[]>([
    "signal_convergence", "prediction_resolved", "warroom_escalation", "daily_briefing",
  ]);
  const [telegramTestLoading, setTelegramTestLoading] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<string | null>(null);

  // Platform API Keys (v1)
  interface PlatformApiKey {
    id: number;
    name: string;
    prefix: string;
    scopes: string | null;
    createdAt: string;
    lastUsedAt: string | null;
    revokedAt: string | null;
    raw?: string;
  }
  const [platformKeys, setPlatformKeys] = useState<PlatformApiKey[]>([]);
  const [platformKeysLoading, setPlatformKeysLoading] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [revokingKeyId, setRevokingKeyId] = useState<number | null>(null);

  // Credits / Wallet
  const [creditBalance, setCreditBalance] = useState<{
    period: string;
    creditsGranted: number;
    creditsUsed: number;
    creditsRemaining: number;
    unlimited: boolean;
    tier: string;
    monthlyGrant: number;
  } | null>(null);
  const [creditLedger, setCreditLedger] = useState<{
    id: number;
    amount: number;
    balanceAfter: number;
    reason: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    sessionId: string | null;
    createdAt: string;
  }[]>([]);
  const [creditPacks, setCreditPacks] = useState<{
    id: string;
    credits: number;
    priceCents: number;
    label: string;
  }[]>([]);
  const [creditsLoading, setCreditsLoading] = useState(true);
  const [topupLoading, setTopupLoading] = useState<string | null>(null);
  const [topupPackId, setTopupPackId] = useState<string | null>(null);
  const [topupClientSecret, setTopupClientSecret] = useState<string | null>(null);
  const [topupResult, setTopupResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Data Sources
  const [newsPollingInterval, setNewsPollingInterval] = useState("300");
  const [osintPollingInterval, setOsintPollingInterval] = useState("300");
  const [aircraftPollingInterval, setAircraftPollingInterval] = useState("20");
  const [marketRefreshInterval, setMarketRefreshInterval] = useState("60");
  const [predictionAutoResolve, setPredictionAutoResolve] = useState("1");

  // Profile
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setProfileImage(d.profileImage || null))
      .catch((err) => console.error("[Settings] profile fetch failed:", err));
  }, []);

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 200_000) {
      setSaveError("Image too large. Max 200KB.");
      setTimeout(() => setSaveError(null), 4000);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setProfileImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const saveProfileImage = async () => {
    setProfileLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileImage }),
      });
      if (res.ok) {
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 2000);
      } else {
        const data = await res.json().catch(() => ({ error: "Save failed" }));
        setSaveError(data.error || "Failed to save profile image");
        setTimeout(() => setSaveError(null), 4000);
      }
    } catch {
      setSaveError("Network error");
      setTimeout(() => setSaveError(null), 4000);
    } finally {
      setProfileLoading(false);
    }
  };

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
            case "ai_model": setAiModel(setting.value); setAiModelSaved(setting.value); break;
            case "ai_chat_model": setAiChatModel(setting.value); setAiChatModelSaved(setting.value); break;
            case "jiang_mode": setJiangMode(setting.value === "true"); setJiangModeSaved(setting.value === "true"); break;
            case "voice_id": setVoiceId(setting.value); setVoiceIdSaved(setting.value); break;
            case "t212_api_key": if (setting.value && setting.value !== "****") setT212Key(setting.value); break;
            case "coinbase_api_key": if (setting.value && setting.value !== "****") setCoinbaseKey(setting.value); break;
          }
          // Handle user-scoped keys (username:key format)
          const baseKey = setting.key.includes(":") ? setting.key.split(":").slice(1).join(":") : "";
          switch (baseKey) {
            case "telegram_chat_id": setTelegramChatId(setting.value); break;
            case "telegram_alerts": {
              try { setTelegramAlerts(JSON.parse(setting.value)); } catch { /* keep defaults */ }
              break;
            }
            case "sms_phone": setSmsPhone(setting.value); break;
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

    // Check Coinbase OAuth status
    fetch("/api/coinbase/oauth/status")
      .then((r) => r.json())
      .then((data) => setCoinbaseOAuth(data))
      .catch((err) => console.error("[Settings] Coinbase OAuth status check failed:", err));

    // Check Alpaca OAuth status
    fetch("/api/alpaca/oauth/status")
      .then((r) => r.json())
      .then((data) => setAlpacaOAuth(data))
      .catch((err) => console.error("[Settings] Alpaca OAuth status check failed:", err));

    // Handle OAuth callback params
    const callbackParams = new URLSearchParams(window.location.search);
    if (callbackParams.get("coinbase") === "connected") {
      setCoinbaseOAuth({ oauthAvailable: true, connected: true });
      window.history.replaceState({}, "", window.location.pathname + "?tab=connections");
    }
    if (callbackParams.get("coinbase") === "error" || callbackParams.get("coinbase") === "denied") {
      const msg = callbackParams.get("coinbase") === "denied" ? "Access denied by user" : "OAuth connection failed";
      setConnectStatus(s => ({ ...s, coinbase: { ok: false, message: msg } }));
      window.history.replaceState({}, "", window.location.pathname + "?tab=connections");
    }

    // Handle Alpaca OAuth callback params
    const alpacaParams = new URLSearchParams(window.location.search);
    if (alpacaParams.get("alpaca_connected") === "true") {
      setAlpacaOAuth({ oauthAvailable: true, connected: true });
      window.history.replaceState({}, "", window.location.pathname + "?tab=connections");
    }
    if (alpacaParams.get("alpaca_error")) {
      const err = alpacaParams.get("alpaca_error") || "unknown";
      setConnectStatus(s => ({ ...s, alpaca: { ok: false, message: `Alpaca connection failed: ${err}` } }));
      window.history.replaceState({}, "", window.location.pathname + "?tab=connections");
    }

    // Check IG connection status
    fetch("/api/ig/connect")
      .then((r) => r.json())
      .then((data) => setIgConnected(!!data.connected))
      .catch((err) => console.error("[Settings] IG connection status check failed:", err));

    // Check prediction market connection status
    fetch("/api/prediction-markets/portfolio")
      .then((r) => r.json())
      .then((data) => {
        if (data.kalshi?.configured) setKalshiKeyId("configured");
      })
      .catch((err) => console.error("[Settings] prediction markets status check failed:", err));

    // Handle OAuth callback params (IG redirect back)
    const params = new URLSearchParams(window.location.search);
    if (params.get("ig_connected") === "true") {
      setIgConnected(true);
      window.history.replaceState({}, "", window.location.pathname + "?tab=connections");
    }
    if (params.get("ig_error")) {
      const errorMap: Record<string, string> = {
        missing_params: "IG did not return authorization parameters",
        invalid_state: "Invalid session state, please try again",
        expired_state: "Authorization session expired, please try again",
        not_configured: "IG OAuth not configured on server",
        token_exchange_failed: "Failed to exchange authorization code for tokens",
        no_token: "IG did not return a valid access token",
        access_denied: "Access was denied by IG",
      };
      const err = params.get("ig_error") || "unknown";
      setConnectStatus(s => ({ ...s, ig: { ok: false, message: errorMap[err] || `IG connection failed: ${err}` } }));
      window.history.replaceState({}, "", window.location.pathname + "?tab=connections");
    }

    // Load credits data
    Promise.all([
      fetch("/api/credits").then((r) => r.json()),
      fetch("/api/credits/ledger").then((r) => r.json()),
      fetch("/api/credits/topup").then((r) => r.json()),
    ])
      .then(([balance, ledger, packs]) => {
        setCreditBalance(balance);
        setCreditLedger(Array.isArray(ledger) ? ledger : []);
        setCreditPacks(Array.isArray(packs) ? packs : []);
        setCreditsLoading(false);
      })
      .catch(() => setCreditsLoading(false));
  }, []);

  // Auto-fetch Stripe client secret when a credit pack is selected
  useEffect(() => {
    if (!topupPackId) return;
    setTopupClientSecret(null);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/credits/topup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packId: topupPackId }),
        });
        const data = await res.json();
        if (!cancelled && res.ok && data.clientSecret) {
          setTopupClientSecret(data.clientSecret);
        }
      } catch {
        // graceful - user sees loading state
      }
    })();
    return () => { cancelled = true; };
  }, [topupPackId]);

  // Auto-fetch Stripe client secret when a subscription tier is selected for upgrade
  useEffect(() => {
    if (!checkoutTierId) return;
    setCheckoutClientSecret(null);
    setCheckoutLoading(checkoutTierId);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tierId: checkoutTierId }),
        });
        const data = await res.json();
        if (!cancelled && res.ok && data.clientSecret) {
          setCheckoutClientSecret(data.clientSecret);
          setCheckoutIntentType(data.type || "payment");
        } else if (!cancelled) {
          setCheckoutResult({ type: "error", message: data.error || "Failed to initialize checkout" });
          setCheckoutTierId(null);
        }
      } catch {
        if (!cancelled) {
          setCheckoutResult({ type: "error", message: "Failed to connect to payment service" });
          setCheckoutTierId(null);
        }
      }
      if (!cancelled) setCheckoutLoading(null);
    })();
    return () => { cancelled = true; };
  }, [checkoutTierId]);

  // Load platform API keys
  useEffect(() => {
    setPlatformKeysLoading(true);
    fetch("/api/settings/api-keys")
      .then((r) => r.json())
      .then((data) => {
        setPlatformKeys(data.keys || []);
        setPlatformKeysLoading(false);
      })
      .catch(() => setPlatformKeysLoading(false));
  }, []);

  const createPlatformKey = async () => {
    if (creatingKey) return;
    setCreatingKey(true);
    setNewlyCreatedKey(null);
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() || "Default" }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to create key");
        return;
      }
      setNewlyCreatedKey(data.key.raw);
      setPlatformKeys((prev) => [{ ...data.key, revokedAt: null, lastUsedAt: null, scopes: null }, ...prev]);
      setNewKeyName("");
    } finally {
      setCreatingKey(false);
    }
  };

  const revokePlatformKey = async (id: number) => {
    setRevokingKeyId(id);
    try {
      const res = await fetch(`/api/settings/api-keys?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setPlatformKeys((prev) =>
          prev.map((k) => (k.id === id ? { ...k, revokedAt: new Date().toISOString() } : k))
        );
      }
    } finally {
      setRevokingKeyId(null);
    }
  };

  const [saveError, setSaveError] = useState<string | null>(null);

  const saveSetting = async (key: string, value: string) => {
    setSaving(key);
    setSaveError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Save failed" }));
        setSaveError(data.error || `Save failed (${res.status})`);
        setTimeout(() => setSaveError(null), 4000);
        return;
      }
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
      setSaveError("Network error. Could not save setting.");
      setTimeout(() => setSaveError(null), 4000);
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
      {/* Save status toast */}
      {saveError && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-lg border border-accent-rose/30 bg-accent-rose/[0.06] text-accent-rose text-xs font-mono animate-in fade-in slide-in-from-top-2">
          <X className="h-3 w-3 shrink-0" />
          {saveError}
        </div>
      )}
      {saved && !saveError && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-lg border border-accent-emerald/30 bg-accent-emerald/[0.06] text-accent-emerald text-xs font-mono animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-3 w-3 shrink-0" />
          Setting saved
        </div>
      )}
      <Tabs.Root
        defaultValue={typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("tab") || "ai-models") : "ai-models"}
        onValueChange={(val) => {
          const url = new URL(window.location.href);
          url.searchParams.set("tab", val);
          window.history.replaceState({}, "", url.toString());
        }}
      >
        <Tabs.List className="flex flex-wrap gap-x-0 gap-y-1 border-b border-navy-700 mb-6">
          {TABS.map((tab) => (
            <Tabs.Trigger
              key={tab.id}
              value={tab.id}
              className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-navy-500 border-b-2 border-transparent transition-colors data-[state=active]:text-navy-100 data-[state=active]:border-navy-100 hover:text-navy-300"
            >
              <tab.icon className="h-3 w-3" />
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* Profile Tab */}
        <Tabs.Content value="profile">
          <div className="space-y-6 max-w-xl">
            <div className="border border-navy-700/50 rounded-lg bg-navy-900/30 p-5">
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-4">Profile Image</h3>
              <div className="flex items-start gap-5">
                <div className="relative group">
                  {profileImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profileImage}
                      alt="Profile"
                      className="h-20 w-20 rounded-full object-cover border-2 border-navy-700"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-navy-800 border-2 border-navy-700 flex items-center justify-center">
                      <span className="text-2xl font-bold text-navy-400 uppercase">
                        {username.charAt(0) || "?"}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <p className="text-xs text-navy-400">
                    Upload a profile image that will appear next to your comments and on your analyst profile. Max 200KB.
                  </p>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-navy-700 bg-navy-900 text-xs text-navy-300 hover:border-navy-600 hover:text-navy-200 transition-colors cursor-pointer">
                      <Upload className="h-3 w-3" />
                      Choose file
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfileImageUpload}
                        className="hidden"
                      />
                    </label>
                    {profileImage && (
                      <button
                        onClick={() => setProfileImage(null)}
                        className="text-[10px] font-mono text-navy-600 hover:text-accent-rose transition-colors"
                      >
                        remove
                      </button>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={saveProfileImage}
                    disabled={profileLoading}
                  >
                    {profileLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                    ) : profileSaved ? (
                      <CheckCircle2 className="h-3 w-3 text-accent-emerald mr-1.5" />
                    ) : (
                      <Save className="h-3 w-3 mr-1.5" />
                    )}
                    {profileSaved ? "Saved" : "Save"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="border border-navy-700/50 rounded-lg bg-navy-900/30 p-5">
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">Account</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-navy-400">Username</span>
                  <span className="text-xs font-mono text-navy-200">{username}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-navy-400">Email</span>
                  <span className="text-xs font-mono text-navy-200">{email}</span>
                </div>
              </div>
            </div>

            <ChangePasswordSection />
            <DataExportSection />
            <CloseAccountSection username={username} />
          </div>
        </Tabs.Content>

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
                      <p className="text-xs text-navy-400 mt-1">Dashboard, Signals, News, Predictions, War Room, and 5 AI messages daily. Choose a plan below for full access.</p>
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
                                  disabled={checkoutTierId !== null || price === 0}
                                  onClick={() => {
                                    if (price === 0) return;
                                    setCheckoutResult(null);
                                    setCheckoutTierId(tier.id as number);
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

                    {/* Inline payment form for subscription upgrade */}
                    {checkoutTierId && (
                      <div className="mt-4 border border-navy-700/50 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-navy-700/50">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-navy-400">
                            Subscribe to {allTiers.find((t) => (t.id as number) === checkoutTierId)?.name as string}
                          </span>
                          <button
                            onClick={() => { setCheckoutTierId(null); setCheckoutClientSecret(null); setCheckoutLoading(null); }}
                            className="text-navy-500 hover:text-navy-300 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="p-4">
                          {checkoutClientSecret ? (
                            <PaymentForm
                              clientSecret={checkoutClientSecret}
                              intentType={checkoutIntentType}
                              submitLabel={(() => {
                                const t = allTiers.find((t) => (t.id as number) === checkoutTierId);
                                const p = t?.price as number;
                                return checkoutIntentType === "setup"
                                  ? "Start free trial"
                                  : `Pay $${(p / 100).toFixed(0)}/${t?.interval as string}`;
                              })()}
                              onSuccess={async () => {
                                setCheckoutTierId(null);
                                setCheckoutClientSecret(null);
                                setCheckoutResult({ type: "success", message: "Subscription activated successfully." });
                                // Refresh subscription data
                                try {
                                  const subRes = await fetch("/api/subscription");
                                  const subData = await subRes.json();
                                  setSubscription(subData);
                                } catch { /* will refresh on next load */ }
                              }}
                              onError={(msg) => {
                                setCheckoutResult({ type: "error", message: msg });
                              }}
                              returnUrl={`${window.location.origin}/settings?tab=subscription&status=sub_success`}
                            />
                          ) : (
                            <div className="flex items-center justify-center py-6">
                              <Loader2 className="h-4 w-4 animate-spin text-navy-500" />
                              <span className="ml-2 text-[11px] text-navy-500 font-mono">Preparing checkout...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {checkoutResult && (
                      <div className={`mt-3 border rounded p-3 ${
                        checkoutResult.type === "success"
                          ? "border-accent-emerald/30 bg-accent-emerald/5"
                          : "border-accent-rose/30 bg-accent-rose/5"
                      }`}>
                        {checkoutResult.type === "success" ? (
                          <CheckCircle2 className="h-4 w-4 text-accent-emerald inline mr-2" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-accent-rose inline mr-2" />
                        )}
                        <span className={`text-xs ${checkoutResult.type === "success" ? "text-accent-emerald" : "text-accent-rose"}`}>
                          {checkoutResult.message}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </Tabs.Content>

        {/* Credits / Wallet Tab */}
        <Tabs.Content value="credits">
          <div className="space-y-6 max-w-3xl">
            {creditsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : creditBalance ? (
              <>
                {/* Wallet Overview */}
                <div className="border border-navy-700 rounded p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500">
                      Credit Wallet
                    </h3>
                    <span className="text-[9px] font-mono text-navy-600">
                      Period: {creditBalance.period}
                    </span>
                  </div>

                  {creditBalance.unlimited ? (
                    <div className="flex items-center gap-3">
                      <Zap className="h-5 w-5 text-accent-amber" />
                      <div>
                        <span className="text-2xl font-bold text-accent-amber font-mono">UNLIMITED</span>
                        <p className="text-xs text-navy-400 mt-0.5">Admin / Institution tier</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div>
                          <span className="text-[9px] font-mono text-navy-500 uppercase block mb-1">Remaining</span>
                          <span className="text-2xl font-bold text-navy-100 font-mono tabular-nums">
                            {creditBalance.creditsRemaining.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-navy-500 uppercase block mb-1">Used</span>
                          <span className="text-2xl font-bold text-accent-amber font-mono tabular-nums">
                            {creditBalance.creditsUsed.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-navy-500 uppercase block mb-1">Granted</span>
                          <span className="text-2xl font-bold text-navy-400 font-mono tabular-nums">
                            {creditBalance.creditsGranted.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-mono text-navy-600">
                            {creditBalance.creditsGranted > 0
                              ? `${((creditBalance.creditsUsed / creditBalance.creditsGranted) * 100).toFixed(1)}% used`
                              : "No credits granted"}
                          </span>
                          <span className="text-[9px] font-mono text-navy-600">
                            {creditBalance.tier} tier ({creditBalance.monthlyGrant?.toLocaleString() ?? 0}/mo)
                          </span>
                        </div>
                        <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              creditBalance.creditsGranted > 0 && creditBalance.creditsUsed / creditBalance.creditsGranted > 0.8
                                ? "bg-accent-rose"
                                : creditBalance.creditsGranted > 0 && creditBalance.creditsUsed / creditBalance.creditsGranted > 0.5
                                  ? "bg-accent-amber"
                                  : "bg-accent-cyan"
                            }`}
                            style={{
                              width: creditBalance.creditsGranted > 0
                                ? `${Math.min(100, (creditBalance.creditsUsed / creditBalance.creditsGranted) * 100)}%`
                                : "0%",
                            }}
                          />
                        </div>
                      </div>

                      {/* Cost info */}
                      <div className="mt-3 pt-3 border-t border-navy-700/40">
                        <span className="text-[9px] font-mono text-navy-600">
                          1 credit = $0.001 | Opus: 15/75 per 1K tokens | Sonnet: 3/15 | Haiku: 1/4
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Top Up Section */}
                {!creditBalance.unlimited && creditPacks.length > 0 && (
                  <div className="border border-navy-700 rounded p-5">
                    <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-4">
                      Top Up Credits
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {creditPacks.map((pack) => (
                        <button
                          key={pack.id}
                          disabled={topupLoading !== null || topupPackId !== null}
                          onClick={() => setTopupPackId(pack.id)}
                          className={cn(
                            "border rounded p-3 transition-all text-left group",
                            topupPackId === pack.id
                              ? "border-accent-cyan/60 bg-accent-cyan/[0.06]"
                              : "border-navy-700 hover:border-accent-cyan/40 hover:bg-accent-cyan/[0.03]"
                          )}
                        >
                          <div className="text-sm font-bold text-navy-100 font-mono mb-1">
                            {pack.credits.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-navy-500 mb-2">credits</div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-accent-cyan font-mono">
                              ${(pack.priceCents / 100).toFixed(0)}
                            </span>
                            <Plus className="h-3 w-3 text-navy-600 group-hover:text-accent-cyan transition-colors" />
                          </div>
                          <div className="text-[9px] text-navy-600 mt-1">
                            ${((pack.priceCents / pack.credits) * 1000).toFixed(2)}/1K
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Payment form for credit top-up */}
                    {topupPackId && (
                      <div className="mt-4 border border-navy-700/50 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-navy-700/50">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-navy-400">
                            Purchase {creditPacks.find((p) => p.id === topupPackId)?.label}
                          </span>
                          <button
                            onClick={() => { setTopupPackId(null); setTopupClientSecret(null); }}
                            className="text-navy-500 hover:text-navy-300 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="p-4">
                          {topupClientSecret ? (
                            <PaymentForm
                              clientSecret={topupClientSecret}
                              submitLabel={`Pay $${((creditPacks.find((p) => p.id === topupPackId)?.priceCents || 0) / 100).toFixed(0)}`}
                              onSuccess={async (paymentIntentId) => {
                                const pack = creditPacks.find((p) => p.id === topupPackId);
                                setTopupPackId(null);
                                setTopupClientSecret(null);
                                if (!paymentIntentId) {
                                  setTopupResult({ type: "error", message: "Payment completed but could not verify. Credits will be added shortly via webhook." });
                                  return;
                                }
                                // Confirm and grant credits immediately
                                try {
                                  const confirmRes = await fetch("/api/credits/topup/confirm", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ paymentIntentId }),
                                  });
                                  const confirmData = await confirmRes.json();
                                  if (confirmRes.ok && confirmData.success) {
                                    setTopupResult({ type: "success", message: `${(confirmData.credits || pack?.credits || 0).toLocaleString()} credits added to your account.` });
                                  } else {
                                    setTopupResult({ type: "error", message: confirmData.error || "Failed to confirm payment. Credits will be added shortly." });
                                  }
                                } catch {
                                  setTopupResult({ type: "error", message: "Could not verify payment. Credits will be added shortly via webhook." });
                                }
                                // Refresh balance and ledger
                                Promise.all([
                                  fetch("/api/credits").then(r => r.json()),
                                  fetch("/api/credits/ledger").then(r => r.json()),
                                ]).then(([bal, ledger]) => {
                                  if (bal && !bal.error) setCreditBalance(bal);
                                  if (Array.isArray(ledger)) setCreditLedger(ledger);
                                });
                              }}
                              onError={(msg) => {
                                setTopupResult({ type: "error", message: msg });
                              }}
                              returnUrl={`${window.location.origin}/settings?tab=credits&status=topup_success`}
                            />
                          ) : (
                            <div className="flex items-center justify-center py-6">
                              <Loader2 className="w-4 h-4 animate-spin text-accent-cyan" />
                              <span className="ml-2 font-mono text-[11px] text-navy-400">Loading payment form...</span>
                            </div>
                          )}
                        </div>
                        <p className="px-4 py-2 font-mono text-[9px] text-navy-600 tracking-wider text-center border-t border-navy-700/50">
                          Secured by Stripe. Credits added instantly after payment.
                        </p>
                      </div>
                    )}

                    {/* Success/Error feedback */}
                    {topupResult && (
                      <div className={`mt-4 flex items-center gap-3 px-4 py-3 rounded border ${
                        topupResult.type === "success"
                          ? "border-accent-emerald/30 bg-accent-emerald/5"
                          : "border-accent-rose/30 bg-accent-rose/5"
                      }`}>
                        {topupResult.type === "success" ? (
                          <CheckCircle2 className="h-4 w-4 text-accent-emerald flex-shrink-0" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-accent-rose flex-shrink-0" />
                        )}
                        <span className={`text-xs ${topupResult.type === "success" ? "text-accent-emerald" : "text-accent-rose"}`}>
                          {topupResult.message}
                        </span>
                        <button
                          onClick={() => setTopupResult(null)}
                          className="ml-auto text-navy-500 hover:text-navy-300"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}

                    {!topupPackId && !topupResult && (
                      <p className="text-[9px] text-navy-600 mt-3">
                        Top-up credits are added to your current balance immediately. They do not expire at end of month.
                      </p>
                    )}
                  </div>
                )}

                {/* Transaction History */}
                <div className="border border-navy-700 rounded p-5">
                  <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-4">
                    Transaction History
                  </h3>
                  {creditLedger.length === 0 ? (
                    <p className="text-xs text-navy-500">No transactions yet</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px] font-mono">
                        <thead>
                          <tr className="text-[9px] text-navy-600 uppercase tracking-wider border-b border-navy-700/40">
                            <th className="text-left py-2 pr-3">Date</th>
                            <th className="text-left py-2 pr-3">Reason</th>
                            <th className="text-left py-2 pr-3">Model</th>
                            <th className="text-right py-2 pr-3">Tokens</th>
                            <th className="text-right py-2 pr-3">Credits</th>
                            <th className="text-right py-2">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-navy-700/20">
                          {creditLedger.slice(0, 50).map((entry) => (
                            <tr key={entry.id} className="hover:bg-navy-800/30 transition-colors">
                              <td className="py-1.5 pr-3 text-navy-400 whitespace-nowrap">
                                {new Date(entry.createdAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </td>
                              <td className="py-1.5 pr-3">
                                <span className={`inline-flex items-center gap-1 ${
                                  entry.amount > 0 ? "text-accent-emerald" : "text-navy-300"
                                }`}>
                                  {entry.amount > 0 ? (
                                    <ArrowUpRight className="h-3 w-3" />
                                  ) : (
                                    <ArrowDownRight className="h-3 w-3 text-navy-500" />
                                  )}
                                  {entry.reason === "topup" ? "Top-up" :
                                   entry.reason === "chat_request" ? "Chat" :
                                   entry.reason === "suggestions" ? "Suggestions" :
                                   entry.reason}
                                </span>
                              </td>
                              <td className="py-1.5 pr-3 text-navy-500">
                                {entry.model === "stripe" ? "---" :
                                 entry.model?.replace("claude-", "").replace("-20250514", "") ?? "---"}
                              </td>
                              <td className="py-1.5 pr-3 text-right text-navy-500 tabular-nums">
                                {entry.inputTokens + entry.outputTokens > 0
                                  ? `${(entry.inputTokens / 1000).toFixed(1)}k / ${(entry.outputTokens / 1000).toFixed(1)}k`
                                  : "---"}
                              </td>
                              <td className={`py-1.5 pr-3 text-right tabular-nums font-medium ${
                                entry.amount > 0 ? "text-accent-emerald" : "text-accent-rose"
                              }`}>
                                {entry.amount > 0 ? "+" : ""}{entry.amount.toLocaleString()}
                              </td>
                              <td className="py-1.5 text-right text-navy-400 tabular-nums">
                                {entry.balanceAfter.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="border border-navy-700 rounded p-5">
                <p className="text-xs text-navy-500">Unable to load credit data</p>
              </div>
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
              <p className="text-[10px] text-navy-600 mb-2">
                Used for analysis, predictions, thesis generation, calendar readings, and alert suggestions.
              </p>
              <p className="text-[10px] text-accent-amber/80 mb-4">
                Sonnet 4.6 delivers near-identical analytical quality at a fraction of the cost. Opus 4.6 offers marginally deeper reasoning on edge cases but uses 5x more credits. Most users won&apos;t notice a difference.
              </p>
              <div className="space-y-2">
                {AI_MODELS.map((model) => {
                  const isSelected = aiModel === model.id;
                  return (
                    <button
                      key={model.id}
                      onClick={() => {
                        setAiModel(model.id);
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
                    setJiangMode(!jiangMode);
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

            {/* Voice */}
            <div className="border border-navy-700 rounded p-4">
              <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-1">
                Voice
              </h3>
              <p className="text-[10px] text-navy-600 mb-4">
                Select the OpenAI voice for text-to-speech in chat. Available on Operator and Institution tiers.
              </p>
              <div className="space-y-2">
                {[
                  { id: "onyx", label: "Onyx", description: "Deep, authoritative male voice" },
                  { id: "alloy", label: "Alloy", description: "Neutral, balanced voice" },
                  { id: "echo", label: "Echo", description: "Warm, clear male voice" },
                  { id: "fable", label: "Fable", description: "Expressive, British-accented voice" },
                  { id: "nova", label: "Nova", description: "Friendly, natural female voice" },
                  { id: "shimmer", label: "Shimmer", description: "Soft, warm female voice" },
                  { id: "ash", label: "Ash", description: "Calm, composed male voice" },
                  { id: "coral", label: "Coral", description: "Clear, engaging female voice" },
                  { id: "sage", label: "Sage", description: "Measured, intelligent voice" },
                ].map((v) => {
                  const isSelected = voiceId === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setVoiceId(v.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? "border-accent-cyan/40 bg-accent-cyan/[0.06]"
                          : "border-navy-800 bg-navy-900/30 hover:border-navy-700 hover:bg-navy-900/50"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-mono font-medium ${isSelected ? "text-accent-cyan" : "text-navy-300"}`}>
                            {v.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-navy-500 mt-0.5">{v.description}</p>
                      </div>
                      <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected ? "border-accent-cyan" : "border-navy-600"
                      }`}>
                        {isSelected && <div className="h-2 w-2 rounded-full bg-accent-cyan" />}
                      </div>
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

            {/* Save button */}
            <div className={`flex items-center gap-3 pt-2 transition-opacity ${aiModelsDirty ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
              <Button
                onClick={async () => {
                  await saveSetting("ai_model", aiModel);
                  if (aiChatModel) {
                    await saveSetting("ai_chat_model", aiChatModel);
                  } else if (aiChatModelSaved) {
                    await deleteSetting("ai_chat_model");
                  }
                  if (jiangMode !== jiangModeSaved) {
                    await saveSetting("jiang_mode", jiangMode ? "true" : "false");
                  }
                  if (voiceId !== voiceIdSaved) {
                    await saveSetting("voice_id", voiceId);
                  }
                  setAiModelSaved(aiModel);
                  setAiChatModelSaved(aiChatModel);
                  setJiangModeSaved(jiangMode);
                  setVoiceIdSaved(voiceId);
                }}
                disabled={!aiModelsDirty || saving !== null}
                className="flex items-center gap-2 px-5 py-2 bg-accent-cyan/10 hover:bg-accent-cyan/20 border border-accent-cyan/30 text-accent-cyan text-xs font-mono uppercase tracking-wider rounded transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save Changes
              </Button>
              {aiModelsDirty && (
                <span className="text-[10px] text-accent-amber font-mono">Unsaved changes</span>
              )}
            </div>
          </div>
        </Tabs.Content>

        {/* Connections Tab */}
        <Tabs.Content value="connections">
          <div className="space-y-3 max-w-2xl">
            <p className="text-xs text-navy-400 mb-2">
              Connect your broker accounts securely. Authentication happens via OAuth or secure sign-in flows. No credentials are stored on our servers.
            </p>

            {/* Interactive Brokers */}
            {(() => {
              const isConnected = !!ibkrGatewayUrl;
              const isExpanded = connectExpanded === "ibkr";
              return (
                <div className={`border rounded-lg overflow-hidden transition-colors ${isConnected ? "border-accent-emerald/20 bg-accent-emerald/[0.02]" : "border-navy-700"}`}>
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold ${isConnected ? "bg-accent-emerald/10 text-accent-emerald" : "bg-navy-800 text-navy-400"}`}>IB</div>
                      <div>
                        <h3 className="text-sm font-medium text-navy-200">Interactive Brokers</h3>
                        <p className="text-[10px] text-navy-500">Stocks, options, futures, forex, bonds</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isConnected ? (
                        <>
                          <span className="flex items-center gap-1.5 text-[10px] font-mono text-accent-emerald">
                            <div className="h-1.5 w-1.5 rounded-full bg-accent-emerald" /> Connected
                          </span>
                          <button onClick={() => setConnectExpanded(isExpanded ? null : "ibkr")} className="text-[10px] text-navy-500 hover:text-navy-300 px-2 py-1 rounded border border-navy-700/40 transition-colors">
                            {isExpanded ? "Close" : "Manage"}
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setConnectExpanded(isExpanded ? null : "ibkr")} className="flex items-center gap-1.5 px-4 py-2 rounded bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] hover:border-white/[0.15] text-[11px] font-mono text-navy-100 transition-all">
                          <Link2 className="h-3 w-3" /> Connect
                        </button>
                      )}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-navy-800/50 space-y-3">
                      <p className="text-[10px] text-navy-500">Point to your IBKR Client Portal Gateway. No credentials stored, authentication is handled by the gateway itself.</p>
                      <ApiKeyField label="Gateway URL" settingKey="ibkr_gateway_url" value={ibkrGatewayUrl} onChange={setIbkrGatewayUrl} placeholder="https://localhost:5000" />
                      <ApiKeyField label="Account ID (optional)" settingKey="ibkr_account_id" value={ibkrAccountId} onChange={setIbkrAccountId} placeholder="e.g. U1234567 or DU1234567 for paper" />
                      {connectStatus.ibkr && (
                        <p className={`text-[10px] font-mono ${connectStatus.ibkr.ok ? "text-accent-emerald" : "text-accent-rose"}`}>{connectStatus.ibkr.message}</p>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          disabled={!ibkrGatewayUrl || connectingBroker === "ibkr"}
                          onClick={async () => {
                            setConnectingBroker("ibkr");
                            setConnectStatus(s => ({ ...s, ibkr: null }));
                            try {
                              const res = await fetch("/api/ibkr/account");
                              const data = await res.json();
                              if (data.error) setConnectStatus(s => ({ ...s, ibkr: { ok: false, message: data.error } }));
                              else setConnectStatus(s => ({ ...s, ibkr: { ok: true, message: `Connected to account ${data.selectedAccount || data.accounts?.[0] || ""}` } }));
                            } catch { setConnectStatus(s => ({ ...s, ibkr: { ok: false, message: "Could not reach gateway" } })); }
                            setConnectingBroker(null);
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 rounded bg-accent-emerald/10 text-accent-emerald text-[10px] font-mono hover:bg-accent-emerald/20 transition-colors border border-accent-emerald/20 disabled:opacity-50"
                        >
                          {connectingBroker === "ibkr" ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                          Test Connection
                        </button>
                        {isConnected && (
                          <button
                            onClick={async () => {
                              await saveSetting("ibkr_gateway_url", "");
                              await saveSetting("ibkr_account_id", "");
                              setIbkrGatewayUrl(""); setIbkrAccountId("");
                              setConnectStatus(s => ({ ...s, ibkr: null }));
                              setConnectExpanded(null);
                            }}
                            className="text-[10px] font-mono text-accent-rose hover:text-red-400 transition-colors px-3 py-2"
                          >
                            Disconnect
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* IG Markets - Coming Soon */}
            <div className="border border-navy-700 rounded-lg overflow-hidden opacity-60">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-navy-800 flex items-center justify-center text-xs font-mono font-bold text-navy-400">IG</div>
                  <div>
                    <h3 className="text-sm font-medium text-navy-200">IG Markets</h3>
                    <p className="text-[10px] text-navy-500">CFDs, spread betting, forex, indices, commodities</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-navy-500 px-3 py-1.5 rounded border border-navy-700/40">Coming soon</span>
              </div>
            </div>

            {/* Trading 212 - clean card, auth via modal */}
            <div className={`border rounded-lg overflow-hidden transition-colors ${t212Key ? "border-accent-emerald/20 bg-accent-emerald/[0.02]" : "border-navy-700"}`}>
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold ${t212Key ? "bg-accent-emerald/10 text-accent-emerald" : "bg-navy-800 text-navy-400"}`}>T2</div>
                  <div>
                    <h3 className="text-sm font-medium text-navy-200">Trading 212</h3>
                    <p className="text-[10px] text-navy-500">Stocks and ETFs, commission-free</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {t212Key ? (
                    <>
                      <span className="flex items-center gap-1.5 text-[10px] font-mono text-accent-emerald">
                        <div className="h-1.5 w-1.5 rounded-full bg-accent-emerald" /> Connected
                      </span>
                      <button
                        onClick={async () => {
                          await saveSetting("t212_api_key", ""); await saveSetting("t212_api_secret", "");
                          setT212Key(""); setT212Secret("");
                        }}
                        className="text-[10px] text-navy-500 hover:text-accent-rose px-2 py-1 rounded border border-navy-700/40 transition-colors"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => { setT212Form({ apiKey: "", apiSecret: "" }); setConnectStatus(s => ({ ...s, t212: null })); setBrokerModal("t212"); }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] hover:border-white/[0.15] text-[11px] font-mono text-navy-100 transition-all"
                    >
                      <Key className="h-3 w-3" /> Connect Trading 212
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Coinbase - Coming Soon */}
            <div className="border border-navy-700 rounded-lg overflow-hidden opacity-60">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-navy-800 flex items-center justify-center text-xs font-mono font-bold text-navy-400">CB</div>
                  <div>
                    <h3 className="text-sm font-medium text-navy-200">Coinbase</h3>
                    <p className="text-[10px] text-navy-500">Cryptocurrency trading</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-navy-500 px-3 py-1.5 rounded border border-navy-700/40">Coming soon</span>
              </div>
            </div>

            {/* Alpaca - Coming Soon */}
            <div className="border border-navy-700 rounded-lg overflow-hidden opacity-60">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-navy-800 flex items-center justify-center text-xs font-mono font-bold text-navy-400">AL</div>
                  <div>
                    <h3 className="text-sm font-medium text-navy-200">Alpaca</h3>
                    <p className="text-[10px] text-navy-500">US stocks, options, crypto, commission-free</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-navy-500 px-3 py-1.5 rounded border border-navy-700/40">Coming soon</span>
              </div>
            </div>

            {/* Saxo Bank - Coming Soon */}
            <div className="border border-navy-700 rounded-lg overflow-hidden opacity-60">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-navy-800 flex items-center justify-center text-xs font-mono font-bold text-navy-400">SX</div>
                  <div>
                    <h3 className="text-sm font-medium text-navy-200">Saxo Bank</h3>
                    <p className="text-[10px] text-navy-500">Stocks, ETFs, forex, CFDs, futures, options</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-navy-500 px-3 py-1.5 rounded border border-navy-700/40">Coming soon</span>
              </div>
            </div>

            {/* Polymarket - WalletConnect */}
            <PolymarketConnect />

            {/* Kalshi - Coming Soon */}
            <div className="border border-navy-700 rounded-lg overflow-hidden opacity-60">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-navy-800 flex items-center justify-center text-xs font-mono font-bold text-navy-400">KL</div>
                  <div>
                    <h3 className="text-sm font-medium text-navy-200">Kalshi</h3>
                    <p className="text-[10px] text-navy-500">US prediction market (API key pair)</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-navy-500 px-3 py-1.5 rounded border border-navy-700/40">Coming soon</span>
              </div>
            </div>

            {/* Request a broker */}
            <div className="border border-dashed border-navy-700/60 rounded-lg p-4 mt-2">
              <p className="text-[10px] font-mono text-navy-500 uppercase tracking-wider mb-2">Request a broker</p>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="e.g. Saxo Bank, Webull, OANDA..."
                  value={brokerRequest}
                  onChange={(e) => setBrokerRequest(e.target.value)}
                  className="flex-1 text-[11px]"
                />
                <button
                  disabled={!brokerRequest.trim()}
                  onClick={async () => {
                    try {
                      await fetch("/api/settings", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ key: `broker_request:${Date.now()}`, value: brokerRequest.trim() }),
                      });
                      setBrokerRequest("");
                      setConnectStatus(s => ({ ...s, broker_request: { ok: true, message: "Request submitted" } }));
                      setTimeout(() => setConnectStatus(s => ({ ...s, broker_request: null })), 3000);
                    } catch (err) { console.error("[Settings] broker request submit failed:", err); }
                  }}
                  className="px-4 py-2 rounded bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-[10px] font-mono text-navy-300 transition-all disabled:opacity-40"
                >
                  <Send className="h-3 w-3" />
                </button>
              </div>
              {connectStatus.broker_request?.ok && (
                <p className="text-[10px] font-mono text-accent-emerald mt-2">{connectStatus.broker_request.message}</p>
              )}
            </div>
          </div>

          {/* Trading 212 Connect Modal */}
          <Dialog.Root open={brokerModal === "t212"} onOpenChange={(open) => { if (!open) setBrokerModal(null); }}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-navy-950 border border-navy-700 rounded-xl shadow-2xl z-50 p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-navy-800 flex items-center justify-center text-xs font-mono font-bold text-navy-300">T2</div>
                    <div>
                      <Dialog.Title className="text-sm font-medium text-navy-100">Connect Trading 212</Dialog.Title>
                      <p className="text-[10px] text-navy-500 mt-0.5">Paste your API key from the Trading 212 app.</p>
                    </div>
                  </div>
                  <Dialog.Close className="text-navy-500 hover:text-navy-300 transition-colors">
                    <X className="h-4 w-4" />
                  </Dialog.Close>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">API Key</label>
                    <Input type="password" placeholder="From T212 app: Settings > API" value={t212Form.apiKey} onChange={(e) => setT212Form(f => ({ ...f, apiKey: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">API Secret (optional)</label>
                    <Input type="password" placeholder="If required by your account" value={t212Form.apiSecret} onChange={(e) => setT212Form(f => ({ ...f, apiSecret: e.target.value }))} />
                  </div>
                  {connectStatus.t212 && (
                    <p className={`text-[10px] font-mono ${connectStatus.t212.ok ? "text-accent-emerald" : "text-accent-rose"}`}>{connectStatus.t212.message}</p>
                  )}
                  <button
                    disabled={!t212Form.apiKey || connectingBroker === "t212"}
                    onClick={async () => {
                      setConnectingBroker("t212");
                      setConnectStatus(s => ({ ...s, t212: null }));
                      try {
                        await saveSetting("t212_api_key", t212Form.apiKey);
                        if (t212Form.apiSecret) await saveSetting("t212_api_secret", t212Form.apiSecret);
                        setT212Key(t212Form.apiKey);
                        setT212Secret(t212Form.apiSecret);
                        const res = await fetch("/api/trading212/account");
                        const data = await res.json();
                        if (data.error) {
                          setConnectStatus(s => ({ ...s, t212: { ok: false, message: data.error } }));
                          await saveSetting("t212_api_key", ""); await saveSetting("t212_api_secret", "");
                          setT212Key(""); setT212Secret("");
                        } else {
                          setBrokerModal(null);
                          setT212Form({ apiKey: "", apiSecret: "" });
                        }
                      } catch {
                        setConnectStatus(s => ({ ...s, t212: { ok: false, message: "Connection failed" } }));
                        await saveSetting("t212_api_key", ""); await saveSetting("t212_api_secret", "");
                        setT212Key(""); setT212Secret("");
                      }
                      setConnectingBroker(null);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded bg-accent-emerald/10 text-accent-emerald text-[11px] font-mono hover:bg-accent-emerald/20 transition-colors border border-accent-emerald/20 disabled:opacity-50 w-full justify-center"
                  >
                    {connectingBroker === "t212" ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                    Connect
                  </button>
                  <div className="flex items-center gap-2 pt-1">
                    <Shield className="h-3 w-3 text-navy-600 shrink-0" />
                    <p className="text-[9px] text-navy-600">Your API key is encrypted at rest using AES-256-GCM. It is never exposed to the frontend after saving.</p>
                  </div>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>

        </Tabs.Content>

        {/* Platform API Tab */}
        <Tabs.Content value="platform-api">
          <div className="space-y-4 max-w-2xl">
            <div className="border border-navy-700 rounded p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500">
                  API Access Keys
                </h3>
                <span className="text-[10px] font-mono text-navy-600">
                  {platformKeys.filter((k) => !k.revokedAt).length} / 5 active
                </span>
              </div>

              <p className="text-xs text-navy-400">
                Generate API keys to access the Nexus v1 API programmatically. Keys are shown once at creation. Store them securely.
              </p>

              {/* Create new key */}
              <div className="flex gap-2">
                <Input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Key name (e.g. Production, Dev)"
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && createPlatformKey()}
                />
                <Button
                  onClick={createPlatformKey}
                  disabled={creatingKey || platformKeys.filter((k) => !k.revokedAt).length >= 5}
                  className="flex items-center gap-1.5"
                >
                  {creatingKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Generate
                </Button>
              </div>

              {/* Newly created key warning */}
              {newlyCreatedKey && (
                <div className="border border-accent-amber/40 bg-accent-amber/[0.06] rounded p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 text-accent-amber" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-accent-amber">
                      Copy your key now. It will not be shown again.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono bg-navy-900 border border-navy-700 rounded px-3 py-2 text-navy-200 select-all break-all">
                      {newlyCreatedKey}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(newlyCreatedKey);
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              )}

              {/* Key list */}
              {platformKeysLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : platformKeys.length === 0 ? (
                <p className="text-xs text-navy-600 py-4 text-center">No API keys created yet</p>
              ) : (
                <div className="space-y-2">
                  {platformKeys.map((k) => (
                    <div
                      key={k.id}
                      className={`flex items-center justify-between gap-3 border rounded px-3 py-2.5 ${
                        k.revokedAt
                          ? "border-navy-800 bg-navy-900/30 opacity-50"
                          : "border-navy-700 bg-navy-900/50"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-navy-200 font-medium truncate">{k.name}</span>
                          {k.revokedAt && (
                            <span className="text-[9px] font-mono uppercase tracking-wider text-accent-rose bg-accent-rose/10 px-1.5 py-0.5 rounded">
                              Revoked
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <code className="text-[10px] font-mono text-navy-500">{k.prefix}</code>
                          <span className="text-[10px] text-navy-600">
                            Created {new Date(k.createdAt).toLocaleDateString()}
                          </span>
                          {k.lastUsedAt && (
                            <span className="text-[10px] text-navy-600">
                              Last used {new Date(k.lastUsedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      {!k.revokedAt && (
                        <button
                          onClick={() => revokePlatformKey(k.id)}
                          disabled={revokingKeyId === k.id}
                          className="text-navy-500 hover:text-accent-rose transition-colors p-1"
                          title="Revoke key"
                        >
                          {revokingKeyId === k.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* API Documentation */}
            <div className="border border-navy-700 rounded p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500">
                  Quick Reference
                </h3>
                <a
                  href="/docs"
                  target="_blank"
                  className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-accent-cyan hover:text-accent-cyan/80 transition-colors"
                >
                  Full API Docs
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="text-xs text-navy-400 space-y-2">
                <p>Base URL: <code className="text-accent-cyan font-mono bg-navy-900 px-1.5 py-0.5 rounded">/api/v1</code></p>
                <p>Auth: <code className="text-accent-cyan font-mono bg-navy-900 px-1.5 py-0.5 rounded">Authorization: Bearer sk-nxs-...</code></p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div className="bg-navy-900/50 border border-navy-700/40 rounded px-2.5 py-1.5">
                  <span className="text-accent-emerald">GET</span> <span className="text-navy-300">/v1/signals</span>
                </div>
                <div className="bg-navy-900/50 border border-navy-700/40 rounded px-2.5 py-1.5">
                  <span className="text-accent-emerald">GET</span> <span className="text-navy-300">/v1/predictions</span>
                </div>
                <div className="bg-navy-900/50 border border-navy-700/40 rounded px-2.5 py-1.5">
                  <span className="text-accent-emerald">GET</span> <span className="text-navy-300">/v1/theses</span>
                </div>
                <div className="bg-navy-900/50 border border-navy-700/40 rounded px-2.5 py-1.5">
                  <span className="text-accent-emerald">GET</span> <span className="text-navy-300">/v1/market/quote</span>
                </div>
                <div className="bg-navy-900/50 border border-navy-700/40 rounded px-2.5 py-1.5">
                  <span className="text-accent-emerald">GET</span> <span className="text-navy-300">/v1/news</span>
                </div>
              </div>
              <div className="text-[10px] text-navy-600 space-y-1">
                <p>Rate limits vary by tier. Headers: X-RateLimit-Remaining, X-RateLimit-Reset</p>
                <p>All responses use envelope: {"{"} data, meta {"}"} or {"{"} error: {"{"} code, message {"}"} {"}"}</p>
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

        {/* Notifications / Telegram Tab */}
        <Tabs.Content value="notifications">
          <div className="space-y-6 max-w-2xl">
            {/* Telegram Connection */}
            <div className="border border-navy-700 rounded p-5">
              <div className="flex items-center gap-2 mb-4">
                <Send className="h-4 w-4 text-accent-cyan" />
                <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500">
                  Telegram Alerts
                </h3>
                {telegramChatId ? (
                  <span className="ml-auto flex items-center gap-1.5 text-[10px] font-mono text-accent-emerald">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald" />
                    Connected
                  </span>
                ) : (
                  <span className="ml-auto text-[10px] font-mono text-navy-600">Not linked</span>
                )}
              </div>

              {!telegramChatId ? (
                <div className="space-y-3">
                  <p className="text-xs text-navy-400 leading-relaxed">
                    Link your Telegram account to receive real-time intelligence alerts. Open the NEXUS bot and send the start command with your username.
                  </p>
                  <div className="border border-navy-700/40 rounded bg-navy-900/60 p-4">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-2">Setup</div>
                    <ol className="text-xs text-navy-300 space-y-2">
                      <li className="flex gap-2">
                        <span className="text-navy-500 font-mono shrink-0">01</span>
                        <span>Search for <span className="font-mono text-accent-cyan">@NexusIntelBot</span> on Telegram (or use the bot name from your .env)</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-navy-500 font-mono shrink-0">02</span>
                        <span>Send: <code className="bg-navy-800 px-1.5 py-0.5 rounded text-accent-cyan">/start your_username</code></span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-navy-500 font-mono shrink-0">03</span>
                        <span>The bot will confirm the link and you can configure alerts below</span>
                      </li>
                    </ol>
                  </div>
                  <div>
                    <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">
                      Or paste your Chat ID manually
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="e.g. 123456789"
                        value={telegramChatId}
                        onChange={(e) => setTelegramChatId(e.target.value)}
                      />
                      <SaveBtn settingKey={`${username}:telegram_chat_id`} value={telegramChatId} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-[10px] text-navy-500 uppercase tracking-wider block">Chat ID</span>
                      <span className="text-xs font-mono text-navy-300">{telegramChatId}</span>
                    </div>
                    <button
                      onClick={() => {
                        setTelegramChatId("");
                        deleteSetting(`${username}:telegram_chat_id`);
                      }}
                      className="ml-auto text-[10px] font-mono text-navy-600 hover:text-accent-rose transition-colors"
                    >
                      Unlink
                    </button>
                  </div>

                  {/* Test button */}
                  <button
                    onClick={async () => {
                      setTelegramTestLoading(true);
                      setTelegramTestResult(null);
                      try {
                        const res = await fetch("/api/telegram/test", { method: "POST" });
                        const data = await res.json();
                        setTelegramTestResult(res.ok ? "Test alert sent" : data.error || "Failed");
                      } catch {
                        setTelegramTestResult("Network error");
                      } finally {
                        setTelegramTestLoading(false);
                        setTimeout(() => setTelegramTestResult(null), 4000);
                      }
                    }}
                    disabled={telegramTestLoading}
                    className="flex items-center gap-2 px-3 py-2 rounded border border-navy-700 text-[11px] font-mono text-navy-400 hover:text-navy-200 hover:border-navy-600 transition-colors disabled:opacity-50"
                  >
                    {telegramTestLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                    Send Test Alert
                    {telegramTestResult && (
                      <span className={`ml-2 ${telegramTestResult.includes("sent") ? "text-accent-emerald" : "text-accent-rose"}`}>
                        {telegramTestResult}
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* SMS Configuration */}
            <div className="border border-navy-700 rounded p-5">
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="h-4 w-4 text-navy-400" />
                <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500">
                  SMS Alerts
                </h3>
                {smsPhone ? (
                  <span className="ml-auto text-[10px] font-mono text-accent-emerald">Configured</span>
                ) : (
                  <span className="ml-auto text-[10px] font-mono text-navy-600">Not configured</span>
                )}
              </div>

              <p className="text-xs text-navy-400 leading-relaxed mb-3">
                Add your phone number to receive SMS alerts when critical conditions trigger. International format required (e.g. +44 7700 900000).
              </p>

              <div className="flex gap-2">
                <Input
                  type="tel"
                  placeholder="+44 7700 900000"
                  value={smsPhone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSmsPhone(e.target.value)}
                />
                <SaveBtn settingKey={`${username}:sms_phone`} value={smsPhone} />
              </div>
              {smsPhone && (
                <button
                  onClick={() => {
                    setSmsPhone("");
                    deleteSetting(`${username}:sms_phone`);
                  }}
                  className="mt-2 text-[10px] font-mono text-navy-600 hover:text-accent-rose transition-colors"
                >
                  Remove phone number
                </button>
              )}
            </div>

            {/* Alert Preferences */}
            <div className="border border-navy-700 rounded p-5">
              <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-4">
                Alert Preferences
              </h3>
              <div className="space-y-3">
                {TELEGRAM_ALERT_TYPES.map((alertType) => {
                  const enabled = telegramAlerts.includes(alertType.id);
                  return (
                    <div
                      key={alertType.id}
                      className={`flex items-start gap-3 p-3 rounded border transition-colors cursor-pointer ${
                        enabled
                          ? "border-navy-600 bg-navy-800/30"
                          : "border-navy-800/40 bg-navy-900/20 opacity-60"
                      }`}
                      onClick={() => {
                        const next = enabled
                          ? telegramAlerts.filter((a) => a !== alertType.id)
                          : [...telegramAlerts, alertType.id];
                        setTelegramAlerts(next);
                        saveSetting(`${username}:telegram_alerts`, JSON.stringify(next));
                      }}
                    >
                      <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        enabled
                          ? "border-accent-cyan bg-accent-cyan/20"
                          : "border-navy-700"
                      }`}>
                        {enabled && (
                          <CheckCircle2 className="w-3 h-3 text-accent-cyan" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-navy-200">{alertType.label}</span>
                          {alertType.global && (
                            <span className="text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-navy-800 text-navy-500">Global</span>
                          )}
                        </div>
                        <p className="text-[11px] text-navy-500 mt-0.5">{alertType.description}</p>
                      </div>
                    </div>
                  );
                })}
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
                        let parsedJson: unknown = null;
                        if (!isMasked) {
                          try {
                            const parsed = JSON.parse(s.value);
                            if (typeof parsed === "object" && parsed !== null) {
                              parsedJson = parsed;
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
                                  <div className="mt-2 bg-navy-950/40 rounded-md px-3.5 py-2.5 border border-navy-800/30">
                                    <RichValue value={parsedJson} />
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
