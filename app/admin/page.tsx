"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CodeEditor } from "@/components/ui/code-editor";
import * as Tabs from "@radix-ui/react-tabs";
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  FlaskConical,
  Gift,
  Loader2,
  Mail,
  MessageSquare,
  Plus,
  RotateCcw,
  Save,
  Send,
  Shield,
  Trash2,
  TrendingUp,
  User,
  Users,
  X,
  ArrowRight,
  XCircle,
  Eye,
  RefreshCw,
  Activity,
  Coins,
  Hash,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  MapPin,
  LogIn,
  LogOut,
  Zap,
  Timer,
  MousePointer,
  MoreVertical,
  UserCheck,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";

/* ── Confirm Modal ─────────────────────────────────────────────── */

interface ConfirmModalState {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  variant: "danger" | "warning" | "info";
  onConfirm: () => void;
}

const CONFIRM_INITIAL: ConfirmModalState = {
  open: false,
  title: "",
  description: "",
  confirmLabel: "Confirm",
  variant: "info",
  onConfirm: () => {},
};

const VARIANT_STYLES = {
  danger: {
    icon: "text-accent-rose",
    iconBg: "bg-accent-rose/10 border-accent-rose/20",
    button: "bg-accent-rose/15 text-accent-rose border-accent-rose/25 hover:bg-accent-rose/25",
  },
  warning: {
    icon: "text-accent-amber",
    iconBg: "bg-accent-amber/10 border-accent-amber/20",
    button: "bg-accent-amber/15 text-accent-amber border-accent-amber/25 hover:bg-accent-amber/25",
  },
  info: {
    icon: "text-accent-cyan",
    iconBg: "bg-accent-cyan/10 border-accent-cyan/20",
    button: "bg-accent-cyan/15 text-accent-cyan border-accent-cyan/25 hover:bg-accent-cyan/25",
  },
};


function ConfirmModal({
  state,
  onClose,
}: {
  state: ConfirmModalState;
  onClose: () => void;
}) {
  const v = VARIANT_STYLES[state.variant];
  const IconComponent =
    state.variant === "danger" ? Trash2 : state.variant === "warning" ? Shield : UserCheck;

  return (
    <Dialog.Root open={state.open} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[60] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-navy-700/60 bg-navy-900/95 backdrop-blur-md p-6 shadow-2xl">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 rounded-lg border p-2.5 ${v.iconBg}`}>
              <IconComponent className={`h-4 w-4 ${v.icon}`} />
            </div>
            <div className="flex-1 min-w-0">
              <Dialog.Title className="text-sm font-semibold text-navy-100 font-mono">
                {state.title}
              </Dialog.Title>
              <Dialog.Description className="text-xs text-navy-400 mt-1.5 leading-relaxed">
                {state.description}
              </Dialog.Description>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-navy-700/30">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-[11px] font-mono uppercase tracking-wider text-navy-400 hover:text-navy-200 hover:bg-navy-800/50 border border-navy-700/30 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                state.onConfirm();
                onClose();
              }}
              className={`px-3 py-1.5 rounded-md text-[11px] font-mono uppercase tracking-wider border transition-colors ${v.button}`}
            >
              {state.confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface Tier {
  id: number;
  name: string;
  stripePriceId: string | null;
  stripeProductId: string | null;
  price: number;
  interval: string;
  features: string;
  limits: string;
  highlighted: number;
  position: number;
  active: number;
}

interface UserThrottle {
  chatMessagesPerDay: number | null;
  predictionsPerHour: number | null;
  apiCallsPerMinute: number | null;
}

interface UserRecord {
  username: string;
  role: string;
  tier: string;
  createdAt: string;
  email: string | null;
  blocked: boolean;
  blockedAt: string | null;
  throttle: UserThrottle | null;
  compedGrant: {
    tier: string;
    grantedAt: string;
    expiresAt: string | null;
    note: string | null;
  } | null;
  subscription: {
    status: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    currentPeriodEnd: string | null;
  } | null;
}

interface SchedulerJob {
  name: string;
  intervalMs: number;
  defaultIntervalMs: number;
  lastRun: string | null;
  running: boolean;
  errors: number;
  ai: boolean;
  enabled: boolean;
}

interface UserStats {
  creditBalance: {
    period: string;
    creditsGranted: number;
    creditsUsed: number;
    creditsRemaining: number;
  } | null;
  recentLedger: {
    id: number;
    amount: number;
    reason: string;
    model: string | null;
    inputTokens: number | null;
    outputTokens: number | null;
    sessionId: string | null;
    createdAt: string;
  }[];
  usageByPeriod: {
    period: string;
    totalCredits: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    callCount: number;
  }[];
  modelUsage: {
    model: string | null;
    totalCredits: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    callCount: number;
  }[];
  recentSessions: {
    id: number;
    uuid: string;
    title: string;
    createdAt: string;
    updatedAt: string;
  }[];
  chatStats: {
    totalSessions: number;
    totalMessages: number;
  };
  recentTrades: {
    id: number;
    ticker: string;
    direction: string;
    quantity: number;
    status: string;
    environment: string;
    createdAt: string;
  }[];
  tradeStats: {
    total: number;
    filled: number;
  };
  supportTickets: {
    id: number;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
  }[];
  accountCreated: string | null;
  lastLogin: string | null;
  dailyUsage: {
    day: string;
    credits: number;
    calls: number;
  }[];
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string | null;
  description: string;
  created: number;
  periodStart: number | null;
  periodEnd: number | null;
  invoiceUrl: string | null;
  invoicePdf: string | null;
  chargeId: string | null;
  paymentIntentId: string | null;
  refunded: string | null;
  refundedAmount: number;
}

interface TransactionsData {
  transactions: Transaction[];
  stripeCustomerId: string;
  totalPaid: number;
  totalRefunded: number;
}

interface AnalyticsData {
  period: { days: number; since: string };
  totalViews: number;
  uniqueSessions: number;
  uniqueVisitors: number;
  avgViewsPerSession: number;
  bounceRate: number;
  avgDuration: number;
  newVisitors: number;
  returningVisitors: number;
  live: { activeVisitors: number; pageviews: number };
  topPages: { path: string; views: number; uniqueVisitors: number; avgDuration: number }[];
  dailyViews: { date: string; views: number; unique: number; visitors: number }[];
  devices: { deviceType: string | null; count: number }[];
  browsers: { browser: string | null; count: number }[];
  operatingSystems: { os: string | null; count: number }[];
  referrers: { referrer: string | null; count: number; uniqueVisitors: number }[];
  hourly: { hour: string; count: number }[];
  countries: { country: string | null; count: number; uniqueVisitors: number }[];
  cities: { city: string | null; country: string | null; count: number }[];
  screens: { width: number | null; height: number | null; count: number }[];
  entryPages: { path: string; count: number }[];
  exitPages: { path: string; count: number }[];
}

interface GrowthData {
  overview: {
    totalUsers: number;
    activeSubscribers: number;
    cancelledSubscribers: number;
    pastDueSubscribers: number;
    mrr: number;
    arr: number;
    churnRate: number;
    conversionRate: number;
  };
  tierBreakdown: {
    id: number;
    name: string;
    price: number;
    subscribers: number;
    revenue: number;
  }[];
  growthTimeline: {
    date: string;
    newUsers: number;
    totalUsers: number;
  }[];
  subscriptionTimeline: {
    date: string;
    newSubscribers: number;
    totalSubscribers: number;
  }[];
  referrals: {
    total: number;
    converted: number;
    conversionRate: number;
    totalCommissions: number;
    pendingCommissions: number;
    paidCommissions: number;
  };
  engagement: {
    totalChatSessions: number;
    totalPredictions: number;
    resolvedPredictions: number;
    predictionAccuracy: number;
  };
  recentSubscriptions: {
    userId: string;
    tier: string;
    status: string;
    createdAt: string;
    cancelAtPeriodEnd: boolean;
  }[];
}

const ADMIN_TABS = [
  { id: "growth", label: "Growth", icon: TrendingUp },
  { id: "tiers", label: "Subscription Tiers", icon: CreditCard },
  { id: "users", label: "Users", icon: Users },
  { id: "prompts", label: "Soul Documents", icon: FileText },
  { id: "emails", label: "Emails", icon: Mail },
  { id: "support", label: "Support", icon: MessageSquare },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "scheduler", label: "Automation", icon: Timer },
  { id: "analysts", label: "Analysts", icon: UserCheck },
  { id: "base-rates", label: "Base Rates", icon: Activity },
  { id: "og-tester", label: "OG Image", icon: Eye },
  { id: "integrations", label: "Integrations", icon: Globe },
];

const PROMPT_CATEGORIES = [
  { id: "chat", label: "Chat" },
  { id: "operator", label: "Operator Context" },
  { id: "analysis", label: "Analysis" },
  { id: "predictions", label: "Predictions" },
];

interface PromptEntry {
  key: string;
  label: string;
  description: string;
  category: string;
  value: string;
  isOverridden: boolean;
  defaultValue: string;
}

function PromptEditor({
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
          <CodeEditor
            value={value}
            onChange={setValue}
            height="320px"
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
            <div>
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
              <CodeEditor
                value={prompt.defaultValue}
                onChange={() => {}}
                height="240px"
                readOnly
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TierEditor({
  tier,
  onSave,
  onDelete,
  onCancel,
}: {
  tier: Partial<Tier>;
  onSave: (tier: Partial<Tier>) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    name: tier.name || "",
    price: tier.price !== undefined ? String(tier.price / 100) : "",
    interval: tier.interval || "month",
    stripePriceId: tier.stripePriceId || "",
    stripeProductId: tier.stripeProductId || "",
    features: tier.features
      ? JSON.parse(tier.features).join("\n")
      : "",
    limits: tier.limits || "{}",
    highlighted: tier.highlighted === 1,
    active: tier.active !== 0,
    position: tier.position ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showLimits, setShowLimits] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      id: tier.id,
      name: form.name,
      price: Math.round(parseFloat(form.price || "0") * 100),
      interval: form.interval,
      stripePriceId: form.stripePriceId || null,
      stripeProductId: form.stripeProductId || null,
      features: form.features.split("\n").filter((f: string) => f.trim()),
      limits: typeof form.limits === "string" ? JSON.parse(form.limits) : form.limits,
      highlighted: form.highlighted ? 1 : 0,
      active: form.active ? 1 : 0,
      position: form.position,
    } as unknown as Partial<Tier>);
    setSaving(false);
  };

  return (
    <div className="border border-navy-700 rounded p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-navy-100 font-mono">
          {tier.id ? tier.name : "New Tier"}
        </h3>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button onClick={onCancel} className="text-navy-500 hover:text-navy-300">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">
            Tier Name
          </label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Analyst"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">
              Price (USD)
            </label>
            <Input
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="49"
            />
          </div>
          <div>
            <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">
              Interval
            </label>
            <select
              value={form.interval}
              onChange={(e) => setForm({ ...form, interval: e.target.value })}
              className="w-full bg-navy-900/50 border border-navy-700/50 rounded px-3 py-2 text-sm text-navy-200 focus:outline-none"
            >
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">
            Stripe Price ID
          </label>
          <Input
            value={form.stripePriceId}
            onChange={(e) => setForm({ ...form, stripePriceId: e.target.value })}
            placeholder="price_..."
          />
        </div>
        <div>
          <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">
            Stripe Product ID
          </label>
          <Input
            value={form.stripeProductId}
            onChange={(e) => setForm({ ...form, stripeProductId: e.target.value })}
            placeholder="prod_..."
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">
          Features (one per line)
        </label>
        <textarea
          value={form.features}
          onChange={(e) => setForm({ ...form, features: e.target.value })}
          className="w-full h-32 bg-navy-900/50 border border-navy-700/50 rounded p-3 text-[12px] font-mono text-navy-200 resize-y focus:outline-none focus:border-navy-500"
          placeholder="Signal detection engine&#10;AI chat analyst (100 msgs/day)&#10;..."
        />
      </div>

      <div>
        <button
          onClick={() => setShowLimits(!showLimits)}
          className="text-[10px] text-navy-500 hover:text-navy-300 transition-colors underline"
        >
          {showLimits ? "Hide" : "Edit"} limits JSON
        </button>
        {showLimits && (
          <textarea
            value={typeof form.limits === "string" ? form.limits : JSON.stringify(form.limits, null, 2)}
            onChange={(e) => setForm({ ...form, limits: e.target.value })}
            className="mt-2 w-full h-28 bg-navy-900/50 border border-navy-700/50 rounded p-3 text-[11px] font-mono text-navy-200 resize-y focus:outline-none focus:border-navy-500"
          />
        )}
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-xs text-navy-400 cursor-pointer">
          <input
            type="checkbox"
            checked={form.highlighted}
            onChange={(e) => setForm({ ...form, highlighted: e.target.checked })}
            className="rounded border-navy-600"
          />
          Highlighted (recommended)
        </label>
        <label className="flex items-center gap-2 text-xs text-navy-400 cursor-pointer">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
            className="rounded border-navy-600"
          />
          Active
        </label>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-navy-500 uppercase tracking-wider">Position</label>
          <Input
            type="number"
            value={String(form.position)}
            onChange={(e) => setForm({ ...form, position: parseInt(e.target.value) || 0 })}
            className="w-16"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-navy-700/50">
        {onDelete ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-accent-rose hover:text-accent-rose"
            disabled={deleting}
            onClick={async () => {
              setDeleting(true);
              await onDelete();
              setDeleting(false);
            }}
          >
            {deleting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Trash2 className="h-3 w-3 mr-1" />}
            Delete Tier
          </Button>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2">
          {syncResult && (
            <span className={`text-[10px] font-mono ${syncResult.ok ? "text-accent-emerald" : "text-accent-rose"}`}>
              {syncResult.msg}
            </span>
          )}
          {tier.id && (
            <Button
              variant="outline"
              size="sm"
              disabled={syncing || !form.name}
              onClick={async () => {
                setSyncing(true);
                setSyncResult(null);
                try {
                  const res = await fetch("/api/admin/tiers/stripe-sync", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tierId: tier.id }),
                  });
                  const data = await res.json();
                  if (res.ok) {
                    setForm((f) => ({
                      ...f,
                      stripePriceId: data.stripePriceId || f.stripePriceId,
                      stripeProductId: data.stripeProductId || f.stripeProductId,
                    }));
                    setSyncResult({ ok: true, msg: "Synced" });
                  } else {
                    setSyncResult({ ok: false, msg: data.error || "Failed" });
                  }
                } catch {
                  setSyncResult({ ok: false, msg: "Network error" });
                }
                setSyncing(false);
                setTimeout(() => setSyncResult(null), 4000);
              }}
            >
              {syncing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CreditCard className="h-3 w-3 mr-1" />}
              Sync to Stripe
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving || !form.name}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
            {tier.id ? "Save Changes" : "Create Tier"}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface SupportTicket {
  id: number;
  userId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

interface SupportMsg {
  id: number;
  ticketId: number;
  userId: string;
  content: string;
  isStaff: number;
  createdAt: string;
}

const TICKET_STATUS: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "text-accent-amber" },
  in_progress: { label: "Active", color: "text-accent-cyan" },
  resolved: { label: "Resolved", color: "text-accent-emerald" },
  closed: { label: "Closed", color: "text-navy-500" },
};

const TICKET_PRIORITY: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "text-navy-500" },
  normal: { label: "Normal", color: "text-navy-300" },
  high: { label: "High", color: "text-accent-amber" },
  urgent: { label: "Urgent", color: "text-accent-rose" },
};

// ── Email Panel ──

interface EmailLog {
  id: string;
  to: string;
  subject: string;
  type: string;
  status: "sent" | "failed";
  resendId?: string;
  error?: string;
  sentAt: string;
}

const EMAIL_TEMPLATES = [
  { id: "welcome", label: "Welcome", description: "Sent on registration" },
  { id: "subscription_active", label: "Subscription Active", description: "Sent after checkout" },
  { id: "subscription_canceled", label: "Subscription Canceled", description: "Sent on cancel" },
  { id: "payment_failed", label: "Payment Failed", description: "Sent on failed invoice" },
  { id: "signal_alert", label: "Signal Alert", description: "High-intensity signal notification" },
];

const EMAIL_TYPE_COLORS: Record<string, string> = {
  welcome: "#06b6d4",
  subscription_active: "#10b981",
  subscription_canceled: "#f59e0b",
  payment_failed: "#ef4444",
  signal_alert: "#8b5cf6",
  other: "#6b7280",
};

function EmailPanel() {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [testTo, setTestTo] = useState("");
  const [testTemplate, setTestTemplate] = useState("welcome");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [notifEmail, setNotifEmail] = useState("");
  const [notifLoaded, setNotifLoaded] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifResult, setNotifResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/emails");
      const data = await res.json();
      setEmails(data.emails || []);
      setLoaded(true);
    } catch { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loaded) fetchEmails();
  }, [loaded, fetchEmails]);

  // Load admin notification email setting
  useEffect(() => {
    if (notifLoaded) return;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        const found = Array.isArray(d) ? d.find((s: { key: string }) => s.key === "admin_notification_email") : null;
        if (found?.value) setNotifEmail(found.value);
      })
      .catch(() => {})
      .finally(() => setNotifLoaded(true));
  }, [notifLoaded]);

  const saveNotifEmail = async () => {
    if (notifEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifEmail.trim())) {
      setNotifResult({ ok: false, msg: "Invalid email address" });
      return;
    }
    setNotifSaving(true);
    setNotifResult(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "admin_notification_email", value: notifEmail.trim() }),
      });
      if (res.ok) {
        setNotifResult({ ok: true, msg: "Saved" });
      } else {
        const data = await res.json();
        setNotifResult({ ok: false, msg: data.error || "Failed" });
      }
    } catch {
      setNotifResult({ ok: false, msg: "Request failed" });
    }
    setNotifSaving(false);
  };

  const sendTest = async () => {
    if (!testTo) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/admin/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", templateId: testTemplate, to: testTo }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSendResult({ ok: true, msg: "Test email sent" });
        fetchEmails();
      } else {
        setSendResult({ ok: false, msg: data.error || `Failed (HTTP ${res.status})` });
      }
    } catch (err) {
      setSendResult({ ok: false, msg: err instanceof Error ? err.message : "Request failed" });
    }
    setSending(false);
  };

  const filtered = emails.filter((e) => {
    if (filterType && !e.type.includes(filterType)) return false;
    if (filterStatus && e.status !== filterStatus) return false;
    return true;
  });

  // Stats
  const totalSent = emails.filter((e) => e.status === "sent").length;
  const totalFailed = emails.filter((e) => e.status === "failed").length;
  const typeCounts: Record<string, number> = {};
  emails.forEach((e) => {
    const t = e.type.startsWith("test:") ? e.type.replace("test:", "") : e.type;
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 px-3 py-2.5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-cyan/20 to-transparent" />
          <div className="text-[9px] font-mono uppercase tracking-wider text-navy-500">Total Sent</div>
          <div className="text-xl font-mono font-bold text-navy-100 tabular-nums">{totalSent}</div>
        </div>
        <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 px-3 py-2.5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-rose/20 to-transparent" />
          <div className="text-[9px] font-mono uppercase tracking-wider text-navy-500">Failed</div>
          <div className="text-xl font-mono font-bold text-accent-rose tabular-nums">{totalFailed}</div>
        </div>
        <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 px-3 py-2.5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-emerald/20 to-transparent" />
          <div className="text-[9px] font-mono uppercase tracking-wider text-navy-500">Success Rate</div>
          <div className="text-xl font-mono font-bold text-accent-emerald tabular-nums">
            {emails.length > 0 ? `${((totalSent / emails.length) * 100).toFixed(0)}%` : "N/A"}
          </div>
        </div>
        <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 px-3 py-2.5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-amber/20 to-transparent" />
          <div className="text-[9px] font-mono uppercase tracking-wider text-navy-500">Templates</div>
          <div className="text-xl font-mono font-bold text-navy-100 tabular-nums">{EMAIL_TEMPLATES.length}</div>
        </div>
      </div>

      {/* Admin Notification Email */}
      <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-amber/20 to-transparent" />
        <h3 className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-1">Admin Notifications</h3>
        <p className="text-[10px] text-navy-600 mb-3">Receive emails when users register, subscribe, cancel, or have payment failures.</p>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">Notification Email</label>
            <input
              type="email"
              value={notifEmail}
              onChange={(e) => { setNotifEmail(e.target.value); setNotifResult(null); }}
              placeholder="admin@example.com"
              className="w-full h-8 px-3 rounded bg-navy-900/50 border border-navy-700/50 text-[11px] font-mono text-navy-300 placeholder:text-navy-600 focus:outline-none focus:border-navy-600"
            />
          </div>
          <button
            onClick={saveNotifEmail}
            disabled={notifSaving}
            className="h-8 px-4 rounded bg-accent-cyan/10 hover:bg-accent-cyan/15 border border-accent-cyan/20 text-[10px] font-mono uppercase tracking-wider text-accent-cyan transition-colors disabled:opacity-50"
          >
            {notifSaving ? "Saving..." : "Save"}
          </button>
        </div>
        {notifResult && (
          <div className={`mt-2 text-[10px] font-mono ${notifResult.ok ? "text-accent-emerald" : "text-accent-rose"}`}>
            {notifResult.msg}
          </div>
        )}
      </div>

      {/* Send Test Email */}
      <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-cyan/20 to-transparent" />
        <h3 className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">Send Test Email</h3>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">Recipient</label>
            <input
              type="email"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder="email@example.com"
              className="w-full h-8 px-3 rounded bg-navy-900/50 border border-navy-700/50 text-[11px] font-mono text-navy-300 placeholder:text-navy-600 focus:outline-none focus:border-navy-600"
            />
          </div>
          <div className="w-56">
            <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">Template</label>
            <select
              value={testTemplate}
              onChange={(e) => setTestTemplate(e.target.value)}
              className="w-full h-8 px-2 rounded bg-navy-900/50 border border-navy-700/50 text-[11px] font-mono text-navy-300 focus:outline-none"
            >
              {EMAIL_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <Button size="sm" onClick={sendTest} disabled={sending || !testTo}>
            {sending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
            Send Test
          </Button>
        </div>
        {sendResult && (
          <div className={`mt-2 text-[11px] font-mono ${sendResult.ok ? "text-accent-emerald" : "text-accent-rose"}`}>
            {sendResult.msg}
          </div>
        )}
      </div>

      {/* Template Registry */}
      <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-amber/20 to-transparent" />
        <h3 className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">Email Templates</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {EMAIL_TEMPLATES.map((t) => {
            const color = EMAIL_TYPE_COLORS[t.id] || EMAIL_TYPE_COLORS.other;
            const count = typeCounts[t.id] || 0;
            return (
              <div
                key={t.id}
                className="border border-navy-700/30 rounded-lg bg-navy-900/30 p-3 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${color}30, transparent)` }} />
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[10px] font-mono text-navy-200 uppercase tracking-wider">{t.label}</span>
                </div>
                <p className="text-[9px] text-navy-500 mb-2">{t.description}</p>
                <div className="text-[10px] font-mono text-navy-400 tabular-nums">{count} sent</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Email Log */}
      <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-navy-500/20 to-transparent" />
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Email Log</h3>
          <div className="flex items-center gap-2">
            {/* Type filter */}
            <div className="flex items-center gap-0 rounded border border-navy-700/40 overflow-hidden">
              <button
                onClick={() => setFilterType(null)}
                className={`px-2 py-1 text-[9px] font-mono uppercase tracking-wider transition-colors ${
                  !filterType ? "bg-navy-800/60 text-navy-100" : "text-navy-500 hover:text-navy-300"
                }`}
              >
                All
              </button>
              {["welcome", "subscription_active", "payment_failed", "signal_alert"].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(filterType === t ? null : t)}
                  className={`px-2 py-1 text-[9px] font-mono uppercase tracking-wider border-l border-navy-700/40 transition-colors ${
                    filterType === t ? "bg-navy-800/60 text-navy-100" : "text-navy-500 hover:text-navy-300"
                  }`}
                >
                  {t.replace(/_/g, " ").replace("subscription ", "sub ")}
                </button>
              ))}
            </div>
            {/* Status filter */}
            <div className="flex items-center gap-0 rounded border border-navy-700/40 overflow-hidden">
              {[null, "sent", "failed"].map((s) => (
                <button
                  key={s ?? "all"}
                  onClick={() => setFilterStatus(s)}
                  className={`px-2 py-1 text-[9px] font-mono uppercase tracking-wider transition-colors ${
                    s !== null ? "border-l border-navy-700/40" : ""
                  } ${filterStatus === s ? "bg-navy-800/60 text-navy-100" : "text-navy-500 hover:text-navy-300"}`}
                >
                  {s ?? "All"}
                </button>
              ))}
            </div>
            <button onClick={fetchEmails} className="text-navy-500 hover:text-navy-300 transition-colors">
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="text-[9px] font-mono text-navy-600 mb-2">
          {filtered.length} email{filtered.length !== 1 ? "s" : ""}
          {filterType || filterStatus ? ` (filtered from ${emails.length})` : ""}
        </div>

        {loading && !loaded ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-navy-700/30 border-dashed rounded-lg p-8 text-center">
            <Mail className="h-6 w-6 text-navy-600 mx-auto mb-2 opacity-40" />
            <p className="text-[11px] text-navy-500">No emails sent yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((email) => {
              const typeBase = email.type.startsWith("test:") ? email.type.replace("test:", "") : email.type;
              const color = EMAIL_TYPE_COLORS[typeBase] || EMAIL_TYPE_COLORS.other;
              const isTest = email.type.startsWith("test:");
              return (
                <div
                  key={email.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-navy-700/20 bg-navy-900/30 hover:bg-navy-800/30 transition-colors group"
                >
                  {/* Status indicator */}
                  <div className="shrink-0">
                    {email.status === "sent" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-accent-emerald/60" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-accent-rose/60" />
                    )}
                  </div>

                  {/* Type badge */}
                  <div className="shrink-0">
                    <span
                      className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{ color, backgroundColor: `${color}15` }}
                    >
                      {isTest ? `test: ${typeBase}` : typeBase.replace(/_/g, " ")}
                    </span>
                  </div>

                  {/* Subject + recipient */}
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] text-navy-200 truncate block">{email.subject}</span>
                    <span className="text-[9px] font-mono text-navy-500">{email.to}</span>
                  </div>

                  {/* Error */}
                  {email.error && (
                    <span className="text-[9px] text-accent-rose/70 max-w-[200px] truncate shrink-0">
                      {email.error}
                    </span>
                  )}

                  {/* Resend ID */}
                  {email.resendId && (
                    <span className="text-[9px] font-mono text-navy-600 shrink-0 hidden group-hover:block">
                      {email.resendId.slice(0, 12)}...
                    </span>
                  )}

                  {/* Timestamp */}
                  <span className="text-[9px] font-mono text-navy-500 tabular-nums shrink-0">
                    {formatDate(email.sentAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewHtml && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-8" onClick={() => setPreviewHtml(null)}>
          <div className="bg-navy-900 border border-navy-700 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b border-navy-700">
              <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Email Preview</span>
              <button onClick={() => setPreviewHtml(null)} className="text-navy-500 hover:text-navy-300">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        </div>
      )}
    </div>
  );
}

function SupportPanel() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMsg[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState("all");

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/support");
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch {
      // silent
    }
    setLoading(false);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) fetchTickets();
  }, [loaded, fetchTickets]);

  const selectTicket = async (ticket: SupportTicket) => {
    setSelected(ticket);
    setReply("");
    try {
      const res = await fetch(`/api/admin/support/messages?ticketId=${ticket.id}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {
      setMessages([]);
    }
  };

  const sendReply = async () => {
    if (!selected || !reply.trim() || sending) return;
    setSending(true);
    try {
      await fetch("/api/admin/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: selected.id, content: reply }),
      });
      setReply("");
      selectTicket(selected);
      fetchTickets();
    } catch {
      // silent
    }
    setSending(false);
  };

  const updateTicket = async (ticketId: number, updates: Record<string, string>) => {
    try {
      await fetch("/api/admin/support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, ...updates }),
      });
      fetchTickets();
      if (selected?.id === ticketId) {
        setSelected((prev) => prev ? { ...prev, ...updates } : null);
      }
    } catch {
      // silent
    }
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });

  const filtered = tickets.filter((t) => filter === "all" || t.status === filter);

  const counts = {
    all: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
  };

  if (loading && !loaded) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Ticket List */}
      <div className="col-span-5 space-y-3">
        <div className="flex items-center gap-2">
          {(["all", "open", "in_progress", "resolved", "closed"] as const).map((s, i) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded transition-colors ${
                filter === s ? "bg-navy-800/60 text-navy-100" : "text-navy-500 hover:text-navy-300"
              }`}
            >
              {s === "all" ? "All" : s === "in_progress" ? "Active" : s.charAt(0).toUpperCase() + s.slice(1)}
              {s === "all" || s === "open" || s === "in_progress" ? (
                <span className="ml-1 text-navy-600">{counts[s]}</span>
              ) : null}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="border border-navy-700/30 border-dashed rounded-lg p-8 text-center">
            <MessageSquare className="h-5 w-5 text-navy-600 mx-auto mb-2" />
            <p className="text-[11px] text-navy-500">No tickets</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-[600px] overflow-y-auto">
            {filtered.map((ticket) => {
              const st = TICKET_STATUS[ticket.status] || TICKET_STATUS.open;
              const pr = TICKET_PRIORITY[ticket.priority] || TICKET_PRIORITY.normal;
              const isSelected = selected?.id === ticket.id;
              return (
                <button
                  key={ticket.id}
                  onClick={() => selectTicket(ticket)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                    isSelected
                      ? "bg-navy-800/60 border border-navy-700/50"
                      : "border border-transparent hover:bg-navy-800/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-mono text-navy-600">#{ticket.id}</span>
                      <span className="text-[11px] text-navy-200 font-medium truncate">{ticket.title}</span>
                    </div>
                    <span className="text-[9px] font-mono text-navy-600 shrink-0">{timeAgo(ticket.updatedAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-mono uppercase tracking-wider ${st.color}`}>{st.label}</span>
                    <span className={`text-[9px] font-mono uppercase tracking-wider ${pr.color}`}>{pr.label}</span>
                    <span className="text-[9px] font-mono text-navy-600">{ticket.userId.replace("user:", "")}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Ticket Detail */}
      <div className="col-span-7">
        {selected ? (
          <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-navy-700/30">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-medium text-navy-100">{selected.title}</h3>
                <button
                  onClick={() => setSelected(null)}
                  className="text-navy-500 hover:text-navy-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-3 text-[9px] font-mono text-navy-500">
                <span>#{selected.id}</span>
                <span>{selected.userId.replace("user:", "")}</span>
                <span className="capitalize">{selected.category}</span>
                <span>{formatDate(selected.createdAt)}</span>
              </div>
              {/* Actions */}
              <div className="flex items-center gap-2 mt-2">
                <select
                  value={selected.status}
                  onChange={(e) => updateTicket(selected.id, { status: e.target.value })}
                  className="h-7 px-2 rounded bg-navy-800/60 border border-navy-700/40 text-[10px] font-mono text-navy-300 focus:outline-none"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <select
                  value={selected.priority}
                  onChange={(e) => updateTicket(selected.id, { priority: e.target.value })}
                  className="h-7 px-2 rounded bg-navy-800/60 border border-navy-700/40 text-[10px] font-mono text-navy-300 focus:outline-none"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Messages */}
            <div className="max-h-[350px] overflow-y-auto">
              {messages.map((msg) => {
                const isStaff = msg.isStaff === 1;
                return (
                  <div
                    key={msg.id}
                    className={`px-4 py-3 border-b border-navy-700/20 last:border-0 ${
                      isStaff ? "bg-accent-cyan/[0.03]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {isStaff ? (
                        <Shield className="h-3 w-3 text-accent-cyan" />
                      ) : (
                        <User className="h-3 w-3 text-navy-500" />
                      )}
                      <span className={`text-[10px] font-mono font-medium ${isStaff ? "text-accent-cyan" : "text-navy-300"}`}>
                        {isStaff ? msg.userId.replace("user:", "") + " (staff)" : msg.userId.replace("user:", "")}
                      </span>
                      <span className="text-[9px] font-mono text-navy-600">{formatDate(msg.createdAt)}</span>
                    </div>
                    <div className="text-[11px] text-navy-300 leading-relaxed whitespace-pre-wrap pl-5">
                      {msg.content}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply */}
            <div className="px-4 py-3 border-t border-navy-700/30 bg-navy-900/40">
              <div className="flex gap-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendReply();
                  }}
                  placeholder="Reply as staff..."
                  rows={2}
                  className="flex-1 px-3 py-2 rounded bg-navy-800/40 border border-navy-700/40 text-sm text-navy-200 placeholder:text-navy-600 focus:outline-none focus:border-navy-600 transition-colors resize-y"
                />
                <button
                  onClick={sendReply}
                  disabled={sending || !reply.trim()}
                  className="self-end h-9 px-4 rounded bg-navy-100 text-navy-950 text-xs font-medium hover:bg-white transition-colors disabled:opacity-40 flex items-center gap-1.5"
                >
                  {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                  Reply
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-navy-700/30 border-dashed rounded-lg p-12 text-center">
            <MessageSquare className="h-6 w-6 text-navy-600 mx-auto mb-2" />
            <p className="text-[11px] text-navy-400">Select a ticket to view and respond</p>
          </div>
        )}
      </div>
    </div>
  );
}

function GrowthPanel({
  data,
  loading,
  onLoad,
}: {
  data: GrowthData | null;
  loading: boolean;
  onLoad: () => void;
}) {
  useEffect(() => {
    onLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !data) {
    return (
      <div className="space-y-4 max-w-5xl">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="border border-navy-700/50 border-dashed rounded p-8 text-center max-w-4xl">
        <TrendingUp className="h-8 w-8 text-navy-600 mx-auto mb-3" />
        <p className="text-sm text-navy-400">No growth data available</p>
      </div>
    );
  }

  const { overview, tierBreakdown, referrals: refData, engagement, recentSubscriptions } = data;

  const maxGrowth = Math.max(
    ...data.growthTimeline.map((g) => g.totalUsers),
    1
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ── Key Metrics ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Total Users",
            value: String(overview.totalUsers),
            sub: `${overview.conversionRate}% conversion`,
          },
          {
            label: "Active Subscribers",
            value: String(overview.activeSubscribers),
            sub: `${overview.pastDueSubscribers} past due`,
          },
          {
            label: "MRR",
            value: `$${overview.mrr.toLocaleString()}`,
            sub: `$${overview.arr.toLocaleString()} ARR`,
          },
          {
            label: "Churn Rate",
            value: `${overview.churnRate}%`,
            sub: `${overview.cancelledSubscribers} cancelled`,
          },
        ].map((metric) => (
          <div
            key={metric.label}
            className="border border-navy-700/40 rounded bg-navy-900/40 p-4"
          >
            <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-1">
              {metric.label}
            </div>
            <div className="text-2xl font-mono font-bold text-navy-100 tabular-nums">
              {metric.value}
            </div>
            <div className="text-[10px] font-mono text-navy-600 mt-1">
              {metric.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── Revenue by Tier ── */}
      <div className="border border-navy-700/40 rounded bg-navy-900/40 p-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-4">
          Revenue by Tier
        </div>
        {tierBreakdown.length > 0 ? (
          <div className="space-y-3">
            {tierBreakdown.map((tier) => {
              const pct =
                overview.mrr > 0
                  ? (tier.revenue / overview.mrr) * 100
                  : 0;
              return (
                <div key={tier.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-navy-200">
                        {tier.name}
                      </span>
                      <span className="text-[10px] font-mono text-navy-500">
                        ${tier.price}/mo
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-navy-400">
                        {tier.subscribers} subscribers
                      </span>
                      <span className="text-xs font-mono font-bold text-navy-200 tabular-nums">
                        ${tier.revenue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-cyan rounded-full transition-all"
                      style={{ width: `${Math.max(pct, 1)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[10px] text-navy-600">No tiers configured</p>
        )}
      </div>

      {/* ── User Growth Chart ── */}
      {data.growthTimeline.length > 0 && (
        <div className="border border-navy-700/40 rounded bg-navy-900/40 p-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-4">
            User Growth
          </div>
          <div className="flex items-end gap-[2px] h-32">
            {data.growthTimeline.map((point) => (
              <div
                key={point.date}
                className="flex-1 group relative"
              >
                <div
                  className="w-full bg-accent-cyan/30 hover:bg-accent-cyan/50 rounded-t transition-colors"
                  style={{
                    height: `${(point.totalUsers / maxGrowth) * 100}%`,
                    minHeight: "2px",
                  }}
                />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block">
                  <div className="bg-navy-800 border border-navy-700/60 rounded px-2 py-1 text-[9px] font-mono text-navy-300 whitespace-nowrap">
                    {point.date}: {point.totalUsers} users (+{point.newUsers})
                  </div>
                </div>
              </div>
            ))}
          </div>
          {data.growthTimeline.length > 1 && (
            <div className="flex justify-between mt-1.5">
              <span className="text-[9px] font-mono text-navy-600">
                {data.growthTimeline[0]?.date}
              </span>
              <span className="text-[9px] font-mono text-navy-600">
                {data.growthTimeline[data.growthTimeline.length - 1]?.date}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ── Referral Program ── */}
        <div className="border border-navy-700/40 rounded bg-navy-900/40 p-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-4">
            Referral Program
          </div>
          <div className="space-y-3">
            {[
              {
                label: "Total Referrals",
                value: String(refData.total),
              },
              {
                label: "Converted",
                value: `${refData.converted} (${refData.conversionRate}%)`,
              },
              {
                label: "Total Commissions",
                value: `$${refData.totalCommissions.toFixed(2)}`,
              },
              {
                label: "Pending Payout",
                value: `$${refData.pendingCommissions.toFixed(2)}`,
              },
              {
                label: "Paid Out",
                value: `$${refData.paidCommissions.toFixed(2)}`,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between border-b border-navy-800/30 pb-2 last:border-0 last:pb-0"
              >
                <span className="text-[11px] text-navy-400">
                  {item.label}
                </span>
                <span className="text-[11px] font-mono font-medium text-navy-200 tabular-nums">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Platform Engagement ── */}
        <div className="border border-navy-700/40 rounded bg-navy-900/40 p-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-4">
            Platform Engagement
          </div>
          <div className="space-y-3">
            {[
              {
                label: "Chat Sessions",
                value: String(engagement.totalChatSessions),
              },
              {
                label: "Predictions Generated",
                value: String(engagement.totalPredictions),
              },
              {
                label: "Predictions Resolved",
                value: String(engagement.resolvedPredictions),
              },
              {
                label: "Prediction Accuracy",
                value:
                  engagement.resolvedPredictions > 0
                    ? `${engagement.predictionAccuracy}%`
                    : "Pending",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between border-b border-navy-800/30 pb-2 last:border-0 last:pb-0"
              >
                <span className="text-[11px] text-navy-400">
                  {item.label}
                </span>
                <span className="text-[11px] font-mono font-medium text-navy-200 tabular-nums">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent Subscriptions ── */}
      {recentSubscriptions.length > 0 && (
        <div className="border border-navy-700/40 rounded bg-navy-900/40 p-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">
            Recent Subscriptions
          </div>
          <div className="space-y-2">
            {recentSubscriptions.map((sub, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-[11px]"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-navy-300">
                    {sub.userId.replace("user:", "")}
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 bg-navy-800/40 rounded px-1.5 py-0.5">
                    {sub.tier}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[9px] font-mono uppercase tracking-wider ${
                      sub.status === "active"
                        ? "text-accent-emerald"
                        : sub.status === "past_due"
                          ? "text-accent-amber"
                          : "text-accent-rose"
                    }`}
                  >
                    {sub.status}
                    {sub.cancelAtPeriodEnd ? " (cancelling)" : ""}
                  </span>
                  <span className="font-mono text-navy-600 text-[10px] tabular-nums">
                    {sub.createdAt?.split("T")[0]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

const DEVICE_ICONS: Record<string, typeof Monitor> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

// ── Base Rates Panel ──

interface BaseRate {
  id: number;
  category: string;
  pattern: string;
  label: string;
  timeframe: string;
  base_rate: number;
  observed_rate: number | null;
  sample_count: number;
  last_updated: string;
  keywords: string;
}

// ── Analyst Profiles Panel ──

interface AnalystProfile {
  id: number;
  userId: string;
  displayName: string;
  bio: string | null;
  expertise: string | null;
  status: string;
  totalJobs: number;
  totalEarnings: number;
  avgAccuracy: number | null;
  scoredDeliverables: number;
  payoutsEnabled: number;
  createdAt: string;
}

function AnalystProfilesPanel() {
  const [profiles, setProfiles] = useState<AnalystProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "suspended">("all");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/analyst-jobs/profiles?status=${filter === "all" ? "" : filter}`);
      if (res.ok) setProfiles(await res.json());
    } catch { /* graceful */ }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const updateStatus = async (profileId: number, status: string) => {
    setActionLoading(profileId);
    try {
      await fetch("/api/analyst-jobs/profiles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, status }),
      });
      fetchProfiles();
    } finally { setActionLoading(null); }
  };

  const statusColor = (s: string) =>
    s === "approved" ? "text-accent-emerald bg-accent-emerald/10" :
    s === "suspended" ? "text-accent-rose bg-accent-rose/10" :
    "text-accent-amber bg-accent-amber/10";

  const pending = profiles.filter(p => p.status === "pending");
  const approved = profiles.filter(p => p.status === "approved");
  const suspended = profiles.filter(p => p.status === "suspended");

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded border border-navy-700/30 bg-navy-900/60 p-3">
          <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 block">Total Profiles</span>
          <span className="text-xl font-mono font-bold text-navy-100">{profiles.length}</span>
        </div>
        <div className="rounded border border-accent-amber/20 bg-accent-amber/5 p-3">
          <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 block">Pending Review</span>
          <span className="text-xl font-mono font-bold text-accent-amber">{pending.length}</span>
        </div>
        <div className="rounded border border-accent-emerald/20 bg-accent-emerald/5 p-3">
          <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 block">Approved</span>
          <span className="text-xl font-mono font-bold text-accent-emerald">{approved.length}</span>
        </div>
        <div className="rounded border border-accent-rose/20 bg-accent-rose/5 p-3">
          <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 block">Suspended</span>
          <span className="text-xl font-mono font-bold text-accent-rose">{suspended.length}</span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1">
        {(["all", "pending", "approved", "suspended"] as const).map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setLoading(true); }}
            className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded transition-colors ${
              filter === f ? "bg-accent-cyan/10 text-accent-cyan" : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/40"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-accent-cyan" />
          <span className="text-xs text-navy-500">Loading profiles...</span>
        </div>
      )}

      {!loading && profiles.length === 0 && (
        <div className="text-center py-8 text-sm text-navy-500">
          No analyst profiles {filter !== "all" ? `with status "${filter}"` : "yet"}.
        </div>
      )}

      {!loading && profiles.length > 0 && (
        <div className="border border-navy-700/30 rounded-md overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-navy-800/40 border-b border-navy-700/20">
            <span className="col-span-2 text-[9px] font-mono uppercase tracking-wider text-navy-500">Name</span>
            <span className="col-span-2 text-[9px] font-mono uppercase tracking-wider text-navy-500">User ID</span>
            <span className="col-span-2 text-[9px] font-mono uppercase tracking-wider text-navy-500">Expertise</span>
            <span className="col-span-1 text-[9px] font-mono uppercase tracking-wider text-navy-500">Status</span>
            <span className="col-span-1 text-[9px] font-mono uppercase tracking-wider text-navy-500 text-right">Jobs</span>
            <span className="col-span-1 text-[9px] font-mono uppercase tracking-wider text-navy-500 text-right">Accuracy</span>
            <span className="col-span-1 text-[9px] font-mono uppercase tracking-wider text-navy-500 text-right">Earnings</span>
            <span className="col-span-2 text-[9px] font-mono uppercase tracking-wider text-navy-500 text-right">Actions</span>
          </div>

          {profiles.map(p => {
            const expertiseTags: string[] = p.expertise ? (() => { try { return JSON.parse(p.expertise); } catch { return []; } })() : [];
            return (
              <div key={p.id} className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-navy-700/10 hover:bg-navy-800/20 transition-colors items-center">
                <div className="col-span-2">
                  <span className="text-[11px] text-navy-200 font-semibold">{p.displayName}</span>
                  {p.bio && <p className="text-[9px] text-navy-500 truncate mt-0.5">{p.bio}</p>}
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] font-mono text-navy-400">{p.userId.replace("user:", "")}</span>
                </div>
                <div className="col-span-2 flex flex-wrap gap-0.5">
                  {expertiseTags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-[8px] font-mono px-1 py-0.5 rounded bg-navy-800/60 text-navy-400">{tag}</span>
                  ))}
                  {expertiseTags.length > 3 && (
                    <span className="text-[8px] text-navy-600">+{expertiseTags.length - 3}</span>
                  )}
                </div>
                <div className="col-span-1">
                  <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${statusColor(p.status)}`}>
                    {p.status}
                  </span>
                </div>
                <div className="col-span-1 text-right">
                  <span className="text-[11px] font-mono text-navy-300">{p.totalJobs}</span>
                </div>
                <div className="col-span-1 text-right">
                  <span className="text-[11px] font-mono text-navy-300">
                    {p.avgAccuracy !== null ? `${(p.avgAccuracy * 100).toFixed(0)}%` : "--"}
                  </span>
                </div>
                <div className="col-span-1 text-right">
                  <span className="text-[11px] font-mono text-navy-300">
                    ${(p.totalEarnings / 100).toLocaleString()}
                  </span>
                </div>
                <div className="col-span-2 flex items-center justify-end gap-1.5">
                  {actionLoading === p.id ? (
                    <Loader2 className="h-3 w-3 animate-spin text-accent-cyan" />
                  ) : (
                    <>
                      {p.status === "pending" && (
                        <>
                          <button
                            onClick={() => updateStatus(p.id, "approved")}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-accent-emerald/10 text-accent-emerald text-[9px] font-mono uppercase hover:bg-accent-emerald/20 transition-colors"
                          >
                            <CheckCircle2 className="h-2.5 w-2.5" /> Approve
                          </button>
                          <button
                            onClick={() => updateStatus(p.id, "suspended")}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-accent-rose/10 text-accent-rose text-[9px] font-mono uppercase hover:bg-accent-rose/20 transition-colors"
                          >
                            <XCircle className="h-2.5 w-2.5" /> Reject
                          </button>
                        </>
                      )}
                      {p.status === "approved" && (
                        <button
                          onClick={() => updateStatus(p.id, "suspended")}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-accent-rose/10 text-accent-rose text-[9px] font-mono uppercase hover:bg-accent-rose/20 transition-colors"
                        >
                          <Shield className="h-2.5 w-2.5" /> Suspend
                        </button>
                      )}
                      {p.status === "suspended" && (
                        <button
                          onClick={() => updateStatus(p.id, "approved")}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-accent-emerald/10 text-accent-emerald text-[9px] font-mono uppercase hover:bg-accent-emerald/20 transition-colors"
                        >
                          <CheckCircle2 className="h-2.5 w-2.5" /> Reinstate
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OGTesterPanel() {
  const [url, setUrl] = useState("");
  const [ogData, setOgData] = useState<{
    ogImage: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    ogUrl: string | null;
    twitterCard: string | null;
    twitterImage: string | null;
    allMeta: { property: string; content: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [directUrl, setDirectUrl] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const defaultUrl = baseUrl || "https://nexushq.xyz";

  const testOG = async (testUrl?: string) => {
    const target = testUrl || url || defaultUrl;
    setLoading(true);
    setError(null);
    setOgData(null);
    setDirectUrl(null);

    try {
      // Fetch the page HTML and parse OG tags
      const res = await fetch(`/api/admin/og-test?url=${encodeURIComponent(target)}`);
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
      const data = await res.json();
      setOgData(data);

      // Also set the direct OG image URL for preview
      if (data.ogImage) {
        // If it's a relative URL, make it absolute
        const imgUrl = data.ogImage.startsWith("http")
          ? data.ogImage
          : new URL(data.ogImage, target).toString();
        setDirectUrl(imgUrl);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const testDirect = () => {
    // Directly render the OG image endpoint
    const target = url || defaultUrl;
    try {
      const parsed = new URL(target.startsWith("http") ? target : `https://${target}`);
      setDirectUrl(`${parsed.origin}/opengraph-image`);
      setOgData(null);
      setError(null);
    } catch {
      setDirectUrl(`${defaultUrl}/opengraph-image`);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <p className="text-[11px] text-navy-400">
        Test how your OG image and meta tags appear when shared on social platforms.
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder={defaultUrl}
          value={url}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
          className="flex-1 min-w-[280px] text-xs"
          onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter") testOG(); }}
        />
        <Button variant="outline" size="sm" onClick={() => testOG()} disabled={loading}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Globe className="h-3 w-3 mr-1" />}
          Test URL
        </Button>
        <Button variant="outline" size="sm" onClick={testDirect}>
          <Eye className="h-3 w-3 mr-1" />
          Direct Image
        </Button>
      </div>

      {/* Quick test buttons */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { label: "Homepage", path: "/" },
          { label: "Research FAQ", path: "/research/faq" },
          { label: "Privacy", path: "/privacy" },
          { label: "Security", path: "/security" },
        ].map(({ label, path }) => (
          <button
            key={path}
            onClick={() => { setUrl(`${defaultUrl}${path}`); testOG(`${defaultUrl}${path}`); }}
            className="text-[10px] font-mono text-navy-500 bg-navy-800/50 px-2 py-1 rounded hover:bg-navy-700/50 hover:text-navy-300 transition-colors"
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
          {error}
        </div>
      )}

      {/* OG Image Preview */}
      {directUrl && (
        <div className="space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">OG Image Preview</div>
          <div className="border border-navy-700 rounded-lg overflow-hidden bg-navy-900/50">
            <img
              src={`${directUrl}?t=${Date.now()}`}
              alt="OG Image Preview"
              className="w-full"
              style={{ aspectRatio: "1200/630" }}
              onError={() => setError("Failed to load OG image")}
            />
          </div>
          <div className="flex items-center gap-2">
            <code className="text-[10px] font-mono text-navy-500 bg-navy-800/50 px-2 py-1 rounded flex-1 overflow-x-auto">
              {directUrl}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(directUrl)}
              className="text-[10px] font-mono text-navy-500 hover:text-navy-300 transition-colors"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Parsed Meta Tags */}
      {ogData && (
        <div className="space-y-3">
          {/* Social Preview Card */}
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Social Preview</div>
          <div className="border border-navy-700 rounded-lg overflow-hidden bg-navy-900/50 max-w-lg">
            {directUrl && (
              <img
                src={`${directUrl}?t=${Date.now()}`}
                alt="OG Preview"
                className="w-full"
                style={{ aspectRatio: "1200/630" }}
              />
            )}
            <div className="px-3 py-2.5">
              <div className="text-[10px] font-mono text-navy-500 uppercase">
                {ogData.ogUrl ? new URL(ogData.ogUrl).hostname : ""}
              </div>
              <div className="text-sm font-semibold text-navy-100 mt-0.5">
                {ogData.ogTitle || "No og:title found"}
              </div>
              <div className="text-xs text-navy-400 mt-0.5 line-clamp-2">
                {ogData.ogDescription || "No og:description found"}
              </div>
            </div>
          </div>

          {/* Raw Meta Tags Table */}
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">All OG/Twitter Meta Tags</div>
          <div className="border border-navy-700 rounded overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-navy-700">
                  <th className="text-left px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-navy-500">Property</th>
                  <th className="text-left px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-navy-500">Content</th>
                </tr>
              </thead>
              <tbody>
                {ogData.allMeta.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-3 py-2 text-navy-600 italic">No OG or Twitter meta tags found</td>
                  </tr>
                ) : (
                  ogData.allMeta.map((m, i) => (
                    <tr key={i} className="border-b border-navy-800/50">
                      <td className="px-3 py-1.5 font-mono text-accent-cyan/70 whitespace-nowrap">{m.property}</td>
                      <td className="px-3 py-1.5 text-navy-300 break-all">{m.content}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Validation */}
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Validation</div>
          <div className="space-y-1">
            {[
              { label: "og:title", ok: !!ogData.ogTitle },
              { label: "og:description", ok: !!ogData.ogDescription },
              { label: "og:image", ok: !!ogData.ogImage },
              { label: "og:url", ok: !!ogData.ogUrl },
              { label: "twitter:card", ok: !!ogData.twitterCard },
              { label: "twitter:image", ok: !!ogData.twitterImage },
            ].map(({ label, ok }) => (
              <div key={label} className="flex items-center gap-2 text-xs">
                {ok ? (
                  <CheckCircle2 className="h-3 w-3 text-accent-emerald" />
                ) : (
                  <XCircle className="h-3 w-3 text-accent-rose" />
                )}
                <span className={ok ? "text-navy-300" : "text-accent-rose"}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BaseRatesPanel() {
  const [rates, setRates] = useState<BaseRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<BaseRate>>({});
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newForm, setNewForm] = useState({ category: "market", pattern: "", label: "", timeframe: "week", base_rate: "0.10", keywords: "" });
  const [filterCat, setFilterCat] = useState("all");

  const fetchRates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/base-rates");
      if (res.ok) {
        const data = await res.json();
        setRates(data.rates || []);
      }
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRates(); }, [fetchRates]);

  const handleSave = async (id: number) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/base-rates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...editForm }),
      });
      if (res.ok) {
        setEditing(null);
        setEditForm({});
        await fetchRates();
      }
    } catch { /* */ }
    setSaving(false);
  };

  const handleAdd = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/base-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newForm, base_rate: parseFloat(newForm.base_rate) }),
      });
      if (res.ok) {
        setAdding(false);
        setNewForm({ category: "market", pattern: "", label: "", timeframe: "week", base_rate: "0.10", keywords: "" });
        await fetchRates();
      }
    } catch { /* */ }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this base rate?")) return;
    try {
      await fetch(`/api/admin/base-rates?id=${id}`, { method: "DELETE" });
      await fetchRates();
    } catch { /* */ }
  };

  const categories = [...new Set(rates.map((r) => r.category))].sort();
  const filtered = filterCat === "all" ? rates : rates.filter((r) => r.category === filterCat);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-navy-100 uppercase tracking-wider">Prediction Base Rates</h2>
          <p className="text-[10px] text-navy-500 mt-0.5">
            Prior probabilities for prediction calibration. Observed rates auto-update from resolved predictions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="bg-navy-900/50 border border-navy-700/50 rounded px-2 py-1 text-[10px] text-navy-300 font-mono outline-none"
          >
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <Button size="sm" onClick={() => setAdding(!adding)} className="text-[10px]">
            <Plus className="w-3 h-3 mr-1" /> Add Rate
          </Button>
        </div>
      </div>

      {/* Add form */}
      {adding && (
        <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4 mb-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">Category</label>
              <select value={newForm.category} onChange={(e) => setNewForm({ ...newForm, category: e.target.value })} className="w-full bg-navy-900/50 border border-navy-700/50 rounded px-2 py-1.5 text-xs text-navy-200 outline-none">
                <option value="market">market</option>
                <option value="geopolitical">geopolitical</option>
                <option value="celestial">celestial</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">Pattern ID</label>
              <Input value={newForm.pattern} onChange={(e) => setNewForm({ ...newForm, pattern: e.target.value })} placeholder="e.g. oil_price_spike" className="text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">Base Rate (0-1)</label>
              <Input value={newForm.base_rate} onChange={(e) => setNewForm({ ...newForm, base_rate: e.target.value })} placeholder="0.10" className="text-xs" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">Label</label>
              <Input value={newForm.label} onChange={(e) => setNewForm({ ...newForm, label: e.target.value })} placeholder="Human-readable description" className="text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">Timeframe</label>
              <Input value={newForm.timeframe} onChange={(e) => setNewForm({ ...newForm, timeframe: e.target.value })} placeholder="week" className="text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">Keywords (comma-sep)</label>
              <Input value={newForm.keywords} onChange={(e) => setNewForm({ ...newForm, keywords: e.target.value })} placeholder="oil,crude,wti" className="text-xs" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setAdding(false)} className="text-[10px]">Cancel</Button>
            <Button size="sm" onClick={handleAdd} disabled={saving || !newForm.pattern || !newForm.label} className="text-[10px]">
              {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />} Save
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="border-b border-navy-700/60">
                <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-widest text-navy-500">Category</th>
                <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-widest text-navy-500">Pattern</th>
                <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-widest text-navy-500">Label</th>
                <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-widest text-navy-500 text-right">Prior</th>
                <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-widest text-navy-500 text-right">Observed</th>
                <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-widest text-navy-500 text-right">Samples</th>
                <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-widest text-navy-500">Keywords</th>
                <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-widest text-navy-500 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const isEditing = editing === r.id;
                const effective = r.observed_rate != null && r.sample_count >= 5 ? r.observed_rate : r.base_rate;
                const catColor = r.category === "market" ? "text-accent-cyan" : r.category === "geopolitical" ? "text-accent-amber" : "text-accent-emerald";
                return (
                  <tr key={r.id} className="border-b border-navy-700/30 hover:bg-navy-800/30 transition-colors">
                    <td className="px-3 py-2">
                      <span className={`text-[10px] font-mono uppercase ${catColor}`}>{r.category}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-[11px] font-mono text-navy-300">{r.pattern}</span>
                    </td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <Input
                          value={editForm.label ?? r.label}
                          onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                          className="text-xs h-7"
                        />
                      ) : (
                        <span className="text-[11px] text-navy-200">{r.label}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={editForm.base_rate ?? r.base_rate}
                          onChange={(e) => setEditForm({ ...editForm, base_rate: parseFloat(e.target.value) })}
                          className="text-xs h-7 w-20 text-right"
                        />
                      ) : (
                        <span className="text-[11px] font-mono text-navy-200">{(r.base_rate * 100).toFixed(1)}%</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {r.observed_rate != null ? (
                        <span className={`text-[11px] font-mono font-bold ${r.sample_count >= 5 ? "text-accent-emerald" : "text-navy-400"}`}>
                          {(r.observed_rate * 100).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-[10px] text-navy-600">--</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className={`text-[11px] font-mono ${r.sample_count >= 5 ? "text-navy-200" : "text-navy-500"}`}>
                        {r.sample_count}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <Input
                          value={editForm.keywords ?? r.keywords}
                          onChange={(e) => setEditForm({ ...editForm, keywords: e.target.value })}
                          className="text-xs h-7"
                        />
                      ) : (
                        <span className="text-[10px] text-navy-500 font-mono truncate max-w-[200px] block">{r.keywords}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1 justify-end">
                        {isEditing ? (
                          <>
                            <button onClick={() => handleSave(r.id)} disabled={saving} className="text-[10px] font-mono text-accent-emerald hover:text-accent-emerald/80 transition-colors">
                              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                            </button>
                            <button onClick={() => { setEditing(null); setEditForm({}); }} className="text-[10px] font-mono text-navy-500 hover:text-navy-300 transition-colors ml-2">
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => { setEditing(r.id); setEditForm({ base_rate: r.base_rate, label: r.label, keywords: r.keywords }); }} className="text-[10px] font-mono text-navy-500 hover:text-accent-cyan transition-colors">
                              Edit
                            </button>
                            <button onClick={() => handleDelete(r.id)} className="text-[10px] font-mono text-navy-500 hover:text-accent-rose transition-colors ml-2">
                              Del
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-[9px] font-mono text-navy-600">
        <span>Prior = manually set anchor</span>
        <span>Observed = auto-computed from resolved predictions (active at 5+ samples)</span>
        <span className="text-accent-emerald">Green observed = active (overrides prior)</span>
      </div>
    </div>
  );
}

function AnalyticsPanel({
  analytics,
  loading,
  days,
  onChangeDays,
  onLoad,
}: {
  analytics: AnalyticsData | null;
  loading: boolean;
  days: number;
  onChangeDays: (d: number) => void;
  onLoad: () => void;
}) {
  useEffect(() => {
    onLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !analytics) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="border border-navy-700/50 border-dashed rounded p-8 text-center">
        <BarChart3 className="h-8 w-8 text-navy-600 mx-auto mb-3" />
        <p className="text-sm text-navy-400">No analytics data yet</p>
        <p className="text-[10px] text-navy-500 mt-1">
          Page views will appear here as users navigate the platform.
        </p>
      </div>
    );
  }

  const maxDailyViews = Math.max(...analytics.dailyViews.map((d) => d.views), 1);
  const maxHourly = Math.max(...analytics.hourly.map((h) => h.count), 1);
  const totalDevices = analytics.devices.reduce((sum, d) => sum + d.count, 0) || 1;
  const totalBrowsers = analytics.browsers.reduce((sum, b) => sum + b.count, 0) || 1;
  const totalOS = analytics.operatingSystems.reduce((sum, o) => sum + o.count, 0) || 1;
  const topCountryCount = analytics.countries.length > 0 ? analytics.countries[0].count : 1;

  return (
    <div className="space-y-6">
      {/* Header: period selector + live indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-[11px] text-navy-400">
            Anonymous, cookieless analytics. No PII collected.
          </p>
          {analytics.live.activeVisitors > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-accent-emerald/10 border border-accent-emerald/20">
              <div className="h-1.5 w-1.5 rounded-full bg-accent-emerald animate-pulse" />
              <span className="text-[10px] font-mono text-accent-emerald tabular-nums">
                {analytics.live.activeVisitors} live now
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => onChangeDays(d)}
              className={`px-2.5 py-1 text-[10px] font-mono rounded transition-colors ${
                days === d
                  ? "bg-navy-700 text-navy-100"
                  : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/50"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: "Pageviews", value: analytics.totalViews.toLocaleString(), icon: MousePointer, color: "text-accent-cyan" },
          { label: "Visitors", value: (analytics.uniqueVisitors || analytics.uniqueSessions).toLocaleString(), icon: Users, color: "text-accent-emerald" },
          { label: "Pages/Visit", value: String(analytics.avgViewsPerSession), icon: BarChart3, color: "text-navy-300" },
          { label: "Bounce Rate", value: `${analytics.bounceRate}%`, icon: LogOut, color: analytics.bounceRate > 60 ? "text-accent-rose" : "text-accent-emerald" },
          { label: "Avg Duration", value: formatDuration(analytics.avgDuration), icon: Timer, color: "text-accent-amber" },
          { label: "New Visitors", value: analytics.uniqueVisitors > 0 ? `${Math.round((analytics.newVisitors / (analytics.uniqueVisitors || 1)) * 100)}%` : "0%", icon: Zap, color: "text-accent-cyan" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="border border-navy-700/40 rounded-lg bg-navy-900/30 px-3 py-3"
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <stat.icon className={`h-3 w-3 ${stat.color} opacity-60`} />
              <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500">
                {stat.label}
              </span>
            </div>
            <div className="text-lg font-mono font-bold text-navy-100 tabular-nums">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Daily views chart */}
      <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">
          Daily Traffic
        </div>
        <div className="flex items-end gap-[2px] h-36">
          {analytics.dailyViews.map((day) => (
            <div key={day.date} className="flex-1 h-full group relative flex items-end">
              <div
                className="w-full bg-accent-cyan/30 hover:bg-accent-cyan/50 transition-colors rounded-t-sm"
                style={{ height: `${(day.views / maxDailyViews) * 100}%`, minHeight: day.views > 0 ? 2 : 0 }}
              />
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                <div className="bg-navy-800 border border-navy-700 rounded px-2 py-1 text-[9px] font-mono text-navy-200 whitespace-nowrap shadow-lg">
                  <div>{day.date}</div>
                  <div>{day.views} views / {day.unique} sessions / {day.visitors || day.unique} visitors</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {analytics.dailyViews.length > 0 && (
          <div className="flex justify-between mt-1.5">
            <span className="text-[9px] font-mono text-navy-600">{analytics.dailyViews[0]?.date}</span>
            <span className="text-[9px] font-mono text-navy-600">{analytics.dailyViews[analytics.dailyViews.length - 1]?.date}</span>
          </div>
        )}
      </div>

      {/* Geography: Countries + Cities */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-3.5 w-3.5 text-accent-cyan opacity-60" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Countries</span>
          </div>
          {analytics.countries.length > 0 ? (
            <div className="space-y-1.5">
              {analytics.countries.slice(0, 15).map((c) => {
                const pct = Math.round((c.count / topCountryCount) * 100);
                return (
                  <div key={c.country} className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-navy-200 w-8 shrink-0">{c.country || "??"}</span>
                    <div className="flex-1 h-1.5 bg-navy-800 rounded-full overflow-hidden">
                      <div className="h-full bg-accent-cyan/40 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] font-mono text-navy-400 tabular-nums w-10 text-right">{c.count}</span>
                    <span className="text-[9px] font-mono text-navy-600 tabular-nums w-10 text-right">{c.uniqueVisitors} uv</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[10px] text-navy-600">No geo data yet. Country headers are populated by Vercel in production.</p>
          )}
        </div>

        <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-3.5 w-3.5 text-accent-amber opacity-60" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Top Cities</span>
          </div>
          {analytics.cities.length > 0 ? (
            <div className="space-y-1.5">
              {analytics.cities.map((c) => (
                <div key={`${c.city}-${c.country}`} className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-navy-300 truncate flex-1">
                    {c.city || "Unknown"}
                  </span>
                  <span className="text-[9px] font-mono text-navy-600 shrink-0">{c.country}</span>
                  <span className="text-[10px] font-mono text-navy-200 tabular-nums w-10 text-right">{c.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-navy-600">No city data yet. Available on Vercel production.</p>
          )}
        </div>
      </div>

      {/* Top Pages with duration */}
      <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">
          Top Pages
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[9px] font-mono text-navy-600 uppercase tracking-wider pb-1 border-b border-navy-700/30">
            <span className="flex-1">Path</span>
            <span className="w-14 text-right">Visitors</span>
            <span className="w-14 text-right">Views</span>
            <span className="w-14 text-right">Avg Time</span>
          </div>
          {analytics.topPages.slice(0, 15).map((page) => (
            <div key={page.path} className="flex items-center gap-2 py-0.5">
              <span className="text-[11px] font-mono text-navy-300 truncate flex-1">{page.path}</span>
              <span className="text-[10px] font-mono text-navy-500 tabular-nums w-14 text-right">{page.uniqueVisitors}</span>
              <span className="text-[10px] font-mono text-navy-200 tabular-nums w-14 text-right">{page.views}</span>
              <span className="text-[10px] font-mono text-navy-500 tabular-nums w-14 text-right">{formatDuration(Math.round(page.avgDuration))}</span>
            </div>
          ))}
          {analytics.topPages.length === 0 && (
            <p className="text-[10px] text-navy-600 py-2">No page data yet</p>
          )}
        </div>
      </div>

      {/* Entry / Exit Pages */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <LogIn className="h-3.5 w-3.5 text-accent-emerald opacity-60" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Entry Pages</span>
          </div>
          <div className="space-y-1.5">
            {analytics.entryPages.slice(0, 8).map((p) => (
              <div key={p.path} className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-navy-300 truncate flex-1">{p.path}</span>
                <span className="text-[10px] font-mono text-navy-200 tabular-nums">{p.count}</span>
              </div>
            ))}
            {analytics.entryPages.length === 0 && <p className="text-[10px] text-navy-600">No data</p>}
          </div>
        </div>
        <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <LogOut className="h-3.5 w-3.5 text-accent-rose opacity-60" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Exit Pages</span>
          </div>
          <div className="space-y-1.5">
            {analytics.exitPages.slice(0, 8).map((p) => (
              <div key={p.path} className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-navy-300 truncate flex-1">{p.path}</span>
                <span className="text-[10px] font-mono text-navy-200 tabular-nums">{p.count}</span>
              </div>
            ))}
            {analytics.exitPages.length === 0 && <p className="text-[10px] text-navy-600">No data</p>}
          </div>
        </div>
      </div>

      {/* Referrers */}
      <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">
          Traffic Sources
        </div>
        {analytics.referrers.length > 0 ? (
          <div className="space-y-1.5">
            {analytics.referrers.slice(0, 10).map((r) => (
              <div key={r.referrer} className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-navy-300 truncate flex-1">{r.referrer || "Direct"}</span>
                <span className="text-[10px] font-mono text-navy-500 tabular-nums w-12 text-right">{r.uniqueVisitors} uv</span>
                <span className="text-[10px] font-mono text-navy-200 tabular-nums w-12 text-right">{r.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-navy-600">No referrer data</p>
        )}
      </div>

      {/* Tech breakdown: Devices, Browsers, OS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {/* Devices */}
        <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">Devices</div>
          <div className="space-y-2">
            {analytics.devices.map((d) => {
              const pct = Math.round((d.count / totalDevices) * 100);
              const DevIcon = DEVICE_ICONS[d.deviceType || "desktop"] || Monitor;
              return (
                <div key={d.deviceType || "unknown"}>
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <DevIcon className="h-3 w-3 text-navy-500" />
                      <span className="text-[11px] font-mono text-navy-300 capitalize">{d.deviceType || "unknown"}</span>
                    </div>
                    <span className="text-[10px] font-mono text-navy-500 tabular-nums">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden">
                    <div className="h-full bg-accent-cyan/50 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Browsers */}
        <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">Browsers</div>
          <div className="space-y-2">
            {analytics.browsers.slice(0, 6).map((b) => {
              const pct = Math.round((b.count / totalBrowsers) * 100);
              return (
                <div key={b.browser || "unknown"}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] font-mono text-navy-300">{b.browser || "unknown"}</span>
                    <span className="text-[10px] font-mono text-navy-500 tabular-nums">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden">
                    <div className="h-full bg-accent-amber/50 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* OS */}
        <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">Operating Systems</div>
          <div className="space-y-2">
            {analytics.operatingSystems.slice(0, 6).map((o) => {
              const pct = Math.round((o.count / totalOS) * 100);
              return (
                <div key={o.os || "unknown"}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] font-mono text-navy-300">{o.os || "unknown"}</span>
                    <span className="text-[10px] font-mono text-navy-500 tabular-nums">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden">
                    <div className="h-full bg-accent-emerald/50 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Screen Resolutions */}
      {analytics.screens.length > 0 && (
        <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">Screen Resolutions</div>
          <div className="flex flex-wrap gap-2">
            {analytics.screens.map((s) => (
              <div
                key={`${s.width}x${s.height}`}
                className="px-2.5 py-1.5 rounded border border-navy-700/30 bg-navy-800/30"
              >
                <span className="text-[11px] font-mono text-navy-300">{s.width}x{s.height}</span>
                <span className="text-[9px] font-mono text-navy-600 ml-2">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hourly distribution */}
      <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">
          Hourly Distribution (UTC)
        </div>
        <div className="flex items-end gap-[3px] h-20">
          {Array.from({ length: 24 }, (_, i) => {
            const hour = String(i).padStart(2, "0");
            const entry = analytics.hourly.find((h) => h.hour === hour);
            const count = entry?.count || 0;
            return (
              <div key={hour} className="flex-1 group relative">
                <div
                  className="w-full bg-accent-amber/25 hover:bg-accent-amber/45 transition-colors rounded-t-sm"
                  style={{ height: `${(count / maxHourly) * 100}%`, minHeight: count > 0 ? 2 : 0 }}
                />
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                  <div className="bg-navy-800 border border-navy-700 rounded px-2 py-1 text-[9px] font-mono text-navy-200 whitespace-nowrap shadow-lg">
                    {hour}:00 UTC - {count} views
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[9px] font-mono text-navy-600">00:00</span>
          <span className="text-[9px] font-mono text-navy-600">06:00</span>
          <span className="text-[9px] font-mono text-navy-600">12:00</span>
          <span className="text-[9px] font-mono text-navy-600">18:00</span>
          <span className="text-[9px] font-mono text-navy-600">23:00</span>
        </div>
      </div>

      {/* New vs Returning */}
      {(analytics.newVisitors > 0 || analytics.returningVisitors > 0) && (
        <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">New vs Returning Visitors</div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-3 rounded-full bg-navy-800 overflow-hidden flex">
                <div
                  className="h-full bg-accent-cyan/60 rounded-l-full"
                  style={{ width: `${analytics.uniqueVisitors > 0 ? (analytics.newVisitors / analytics.uniqueVisitors) * 100 : 50}%` }}
                />
                <div className="h-full bg-accent-amber/60 rounded-r-full flex-1" />
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-accent-cyan/60" />
                <span className="text-[10px] font-mono text-navy-300">New {analytics.newVisitors}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-accent-amber/60" />
                <span className="text-[10px] font-mono text-navy-300">Returning {analytics.returningVisitors}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Cost estimation for AI jobs ──
// Based on actual Anthropic pricing and observed token usage per job
const AI_JOB_COST_ESTIMATES: Record<string, { model: string; inputTokens: number; outputTokens: number; label: string }> = {
  "monitor-sweep": { model: "haiku", inputTokens: 2000, outputTokens: 800, label: "Sentinel scan + alert resolution" },
  "intelligence-cycle": { model: "sonnet", inputTokens: 4000, outputTokens: 1500, label: "Sentinel → Analyst → Executor chain" },
  "prediction-cycle": { model: "sonnet", inputTokens: 5000, outputTokens: 2000, label: "AI prediction resolve + generate" },
  "actor-profile-update": { model: "haiku", inputTokens: 3000, outputTokens: 1000, label: "GDELT actor extraction (per actor)" },
  "twitter-analyst": { model: "sonnet", inputTokens: 2000, outputTokens: 500, label: "Generate analyst tweet" },
  "twitter-replies": { model: "sonnet", inputTokens: 3000, outputTokens: 400, label: "Search + reply to threads (up to 3)" },
};

// Anthropic pricing per 1M tokens
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  haiku: { input: 1, output: 4 },
  sonnet: { input: 3, output: 15 },
  opus: { input: 15, output: 75 },
};

function estimateDailyCost(jobName: string, intervalMs: number): number | null {
  const est = AI_JOB_COST_ESTIMATES[jobName];
  if (!est || intervalMs <= 0) return null;
  const runsPerDay = (24 * 60 * 60 * 1000) / intervalMs;
  const pricing = MODEL_PRICING[est.model];
  if (!pricing) return null;
  const costPerRun = (est.inputTokens / 1_000_000) * pricing.input + (est.outputTokens / 1_000_000) * pricing.output;
  return runsPerDay * costPerRun;
}

function formatInterval(ms: number): string {
  if (ms <= 0) return "Disabled";
  const mins = ms / 60_000;
  if (mins < 60) return `${mins}m`;
  const hrs = mins / 60;
  if (hrs < 24) return `${hrs}h`;
  return `${(hrs / 24).toFixed(1)}d`;
}

function SchedulerPanel() {
  const [jobs, setJobs] = useState<SchedulerJob[]>([]);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  // Track edited intervals as minutes (string for input fields)
  const [editedIntervals, setEditedIntervals] = useState<Record<string, string>>({});
  const [pendingAiEnabled, setPendingAiEnabled] = useState(true);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/scheduler");
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
        setAiEnabled(data.aiEnabled ?? true);
        setPendingAiEnabled(data.aiEnabled ?? true);
        // Initialize edited intervals from current values
        const intervals: Record<string, string> = {};
        for (const job of data.jobs || []) {
          intervals[job.name] = String(job.intervalMs / 60_000);
        }
        setEditedIntervals(intervals);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const saveChanges = async () => {
    setSaving(true);
    setMessage(null);
    try {
      // Build intervals map: only include changed values
      const intervals: Record<string, number> = {};
      for (const job of jobs) {
        const editedMin = parseFloat(editedIntervals[job.name] ?? "");
        const currentMin = job.defaultIntervalMs / 60_000;
        if (!Number.isNaN(editedMin) && editedMin !== currentMin) {
          intervals[job.name] = editedMin;
        }
      }

      const res = await fetch("/api/scheduler", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiEnabled: pendingAiEnabled,
          intervals: Object.keys(intervals).length > 0 ? intervals : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
        setAiEnabled(pendingAiEnabled);
        setMessage({ type: "success", text: "Scheduler settings saved and restarted" });
      } else {
        setMessage({ type: "error", text: "Failed to save scheduler settings" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save scheduler settings" });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = pendingAiEnabled !== aiEnabled ||
    jobs.some((job) => {
      const edited = parseFloat(editedIntervals[job.name] ?? "");
      return !Number.isNaN(edited) && edited !== job.intervalMs / 60_000;
    });

  // Calculate total daily cost
  const totalDailyCost = jobs
    .filter((j) => j.ai && (pendingAiEnabled))
    .reduce((sum, j) => {
      const mins = parseFloat(editedIntervals[j.name] ?? "0");
      const ms = mins * 60_000;
      return sum + (estimateDailyCost(j.name, ms) || 0);
    }, 0);

  if (loading) {
    return (
      <div className="space-y-3 max-w-4xl">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded" />
        ))}
      </div>
    );
  }

  const aiJobs = jobs.filter((j) => j.ai);
  const dataJobs = jobs.filter((j) => !j.ai);

  return (
    <div className="space-y-6 max-w-4xl">
      <p className="text-[11px] text-navy-400">
        Control background automation jobs. AI jobs consume Anthropic API credits. Adjust intervals or disable to manage costs.
      </p>

      {message && (
        <div className={`text-[11px] font-mono px-3 py-2 rounded border ${
          message.type === "success"
            ? "text-accent-emerald border-accent-emerald/30 bg-accent-emerald/5"
            : "text-accent-rose border-accent-rose/30 bg-accent-rose/5"
        }`}>
          {message.text}
        </div>
      )}

      {/* Cost Summary Card */}
      <div className="border border-navy-700/50 rounded-lg bg-navy-900/30 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-1">Estimated Daily AI Cost</div>
            <div className="text-2xl font-mono font-bold text-navy-100">
              ${pendingAiEnabled ? totalDailyCost.toFixed(2) : "0.00"}
            </div>
            <div className="text-[10px] text-navy-500 mt-0.5">
              ~${pendingAiEnabled ? (totalDailyCost * 30).toFixed(0) : "0"}/month at current intervals
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <div className="text-[10px] text-navy-400 text-right mb-1">AI Jobs</div>
              <button
                onClick={() => setPendingAiEnabled(!pendingAiEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  pendingAiEnabled ? "bg-accent-emerald" : "bg-navy-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    pendingAiEnabled ? "translate-x-[22px]" : "translate-x-[3px]"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Jobs Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Coins className="h-3.5 w-3.5 text-accent-amber" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">AI Jobs (consume credits)</span>
        </div>
        <div className="space-y-1">
          {aiJobs.map((job) => {
            const editedMin = parseFloat(editedIntervals[job.name] ?? "0");
            const effectiveMs = editedMin * 60_000;
            const cost = pendingAiEnabled ? estimateDailyCost(job.name, effectiveMs) : null;
            const estimate = AI_JOB_COST_ESTIMATES[job.name];

            return (
              <div
                key={job.name}
                className={`border rounded-md px-4 py-3 transition-colors ${
                  !pendingAiEnabled || editedMin <= 0
                    ? "border-navy-800 bg-navy-950/50 opacity-50"
                    : "border-navy-700/40 bg-navy-900/30"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-medium text-navy-200">{job.name}</span>
                      {job.running && (
                        <span className="text-[9px] font-mono text-accent-cyan bg-accent-cyan/10 px-1.5 py-0.5 rounded">RUNNING</span>
                      )}
                      {job.errors > 0 && (
                        <span className="text-[9px] font-mono text-accent-rose bg-accent-rose/10 px-1.5 py-0.5 rounded">{job.errors} errors</span>
                      )}
                    </div>
                    <div className="text-[10px] text-navy-500 mt-0.5">
                      {estimate?.label || "AI-consuming background job"}
                      {estimate && <span className="text-navy-600"> / {estimate.model}</span>}
                    </div>
                    {job.lastRun && (
                      <div className="text-[9px] text-navy-600 mt-0.5">
                        Last run: {new Date(job.lastRun).toLocaleTimeString()}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {cost !== null && cost > 0 && (
                      <div className="text-right">
                        <div className="text-[10px] font-mono text-accent-amber">${cost.toFixed(3)}/day</div>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={editedIntervals[job.name] ?? ""}
                        onChange={(e) => setEditedIntervals((prev) => ({ ...prev, [job.name]: e.target.value }))}
                        type="number"
                        min="0"
                        step="1"
                        className="w-20 text-center text-xs"
                        disabled={!pendingAiEnabled}
                      />
                      <span className="text-[10px] text-navy-500">min</span>
                    </div>
                    <div className="text-[9px] text-navy-600 w-12 text-right">
                      def: {formatInterval(job.defaultIntervalMs)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Data Jobs Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-3.5 w-3.5 text-accent-cyan" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Data Jobs (no AI cost)</span>
        </div>
        <div className="space-y-1">
          {dataJobs.map((job) => {
            const editedMin = parseFloat(editedIntervals[job.name] ?? "0");

            return (
              <div
                key={job.name}
                className={`border rounded-md px-4 py-2.5 transition-colors ${
                  editedMin <= 0
                    ? "border-navy-800 bg-navy-950/50 opacity-50"
                    : "border-navy-700/40 bg-navy-900/30"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-navy-300">{job.name}</span>
                      {job.running && (
                        <span className="text-[9px] font-mono text-accent-cyan bg-accent-cyan/10 px-1.5 py-0.5 rounded">RUNNING</span>
                      )}
                      {job.errors > 0 && (
                        <span className="text-[9px] font-mono text-accent-rose bg-accent-rose/10 px-1.5 py-0.5 rounded">{job.errors} errors</span>
                      )}
                    </div>
                    {job.lastRun && (
                      <div className="text-[9px] text-navy-600 mt-0.5">
                        Last run: {new Date(job.lastRun).toLocaleTimeString()}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={editedIntervals[job.name] ?? ""}
                        onChange={(e) => setEditedIntervals((prev) => ({ ...prev, [job.name]: e.target.value }))}
                        type="number"
                        min="0"
                        step="1"
                        className="w-20 text-center text-xs"
                      />
                      <span className="text-[10px] text-navy-500">min</span>
                    </div>
                    <div className="text-[9px] text-navy-600 w-12 text-right">
                      def: {formatInterval(job.defaultIntervalMs)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={saveChanges}
          disabled={saving || !hasChanges}
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
          Save &amp; Restart Scheduler
        </Button>
        {hasChanges && (
          <span className="text-[10px] text-accent-amber font-mono">Unsaved changes</span>
        )}
      </div>
    </div>
  );
}

function IntegrationsPanel() {
  const [twitterStatus, setTwitterStatus] = useState<{
    connected: boolean;
    expired?: boolean;
    expiresAt?: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Telegram AI settings
  const [telegramAiEnabled, setTelegramAiEnabled] = useState(true);
  const [telegramRateLimit, setTelegramRateLimit] = useState("10");
  const [telegramModel, setTelegramModel] = useState("claude-haiku-4-5-20251001");
  const [telegramLoading, setTelegramLoading] = useState(true);
  const [telegramSaving, setTelegramSaving] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/twitter/oauth/status");
      if (res.ok) {
        const data = await res.json();
        setTwitterStatus(data);
      }
    } catch {
      setTwitterStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    // Check URL params for OAuth callback result
    const params = new URLSearchParams(window.location.search);
    const twitterResult = params.get("twitter");
    if (twitterResult === "connected") {
      setMessage({ type: "success", text: "Twitter/X connected successfully" });
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete("twitter");
      window.history.replaceState(null, "", url.toString());
    } else if (twitterResult === "denied") {
      setMessage({ type: "error", text: "Twitter/X authorization was denied" });
    } else if (twitterResult === "error") {
      setMessage({ type: "error", text: "Twitter/X connection failed" });
    }
  }, [fetchStatus]);

  const fetchTelegramSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/telegram-settings");
      if (res.ok) {
        const data = await res.json();
        setTelegramAiEnabled(data.aiEnabled ?? true);
        setTelegramRateLimit(String(data.rateLimit ?? 10));
        setTelegramModel(data.model ?? "claude-haiku-4-5-20251001");
      }
    } catch { /* defaults are fine */ }
    finally { setTelegramLoading(false); }
  }, []);

  useEffect(() => {
    fetchTelegramSettings();
  }, [fetchTelegramSettings]);

  const saveTelegramSettings = async () => {
    setTelegramSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/telegram-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiEnabled: telegramAiEnabled,
          rateLimit: parseInt(telegramRateLimit, 10) || 10,
          model: telegramModel,
        }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Telegram settings saved" });
      } else {
        setMessage({ type: "error", text: "Failed to save Telegram settings" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save Telegram settings" });
    } finally {
      setTelegramSaving(false);
    }
  };

  const connectTwitter = async () => {
    setConnecting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/twitter/oauth");
      if (!res.ok) {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to start OAuth flow" });
        setConnecting(false);
        return;
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      setMessage({ type: "error", text: "Failed to connect to Twitter" });
      setConnecting(false);
    }
  };

  const disconnectTwitter = async () => {
    setDisconnecting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/twitter/oauth", { method: "DELETE" });
      if (res.ok) {
        setTwitterStatus({ connected: false });
        setMessage({ type: "success", text: "Twitter/X disconnected" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to disconnect" });
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <p className="text-[11px] text-navy-400">
        Platform-wide integrations. These connect to NEXUS service accounts, not individual users.
      </p>

      {message && (
        <div className={`text-[11px] font-mono px-3 py-2 rounded border ${
          message.type === "success"
            ? "text-accent-emerald border-accent-emerald/30 bg-accent-emerald/5"
            : "text-accent-rose border-accent-rose/30 bg-accent-rose/5"
        }`}>
          {message.text}
        </div>
      )}

      {/* Twitter/X Card */}
      <div className="border border-navy-700/50 rounded-lg bg-navy-900/30 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-navy-800 flex items-center justify-center">
              <span className="text-sm font-bold text-navy-200">X</span>
            </div>
            <div>
              <div className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-100">
                Twitter / X
              </div>
              <p className="text-[10px] text-navy-500 mt-0.5">
                Auto-post predictions and resolution results
              </p>
            </div>
          </div>

          {loading ? (
            <Skeleton className="h-5 w-20" />
          ) : twitterStatus?.connected ? (
            <div className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${twitterStatus.expired ? "bg-accent-amber" : "bg-accent-emerald"}`} />
              <span className={`text-[10px] font-mono ${twitterStatus.expired ? "text-accent-amber" : "text-accent-emerald"}`}>
                {twitterStatus.expired ? "Token expired" : "Connected"}
              </span>
            </div>
          ) : (
            <span className="text-[10px] font-mono text-navy-500">Not connected</span>
          )}
        </div>

        <div className="text-[10px] text-navy-400 mb-4 space-y-1">
          <p>When connected, NEXUS will automatically:</p>
          <ul className="list-disc list-inside space-y-0.5 text-navy-500">
            <li>Tweet the highest-confidence prediction each cycle</li>
            <li>Post HIT/MISS results when predictions resolve</li>
            <li>Thread multiple resolutions into a summary</li>
          </ul>
        </div>

        {loading ? (
          <Skeleton className="h-8 w-28" />
        ) : twitterStatus?.connected ? (
          <div className="flex items-center gap-2">
            {(twitterStatus.expired) && (
              <Button
                variant="outline"
                size="sm"
                onClick={connectTwitter}
                disabled={connecting}
              >
                {connecting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                Reconnect
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={disconnectTwitter}
              disabled={disconnecting}
              className="text-accent-rose border-accent-rose/30 hover:bg-accent-rose/10"
            >
              {disconnecting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <X className="h-3 w-3 mr-1" />}
              Disconnect
            </Button>
            {twitterStatus.expiresAt && !twitterStatus.expired && (
              <span className="text-[9px] font-mono text-navy-600">
                Expires {new Date(twitterStatus.expiresAt).toLocaleDateString()}
              </span>
            )}
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={connectTwitter}
            disabled={connecting}
          >
            {connecting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
            Connect Twitter/X
          </Button>
        )}
      </div>

      {/* Telegram Bot AI Card */}
      <div className="border border-navy-700/50 rounded-lg bg-navy-900/30 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-navy-800 flex items-center justify-center">
              <Send className="h-4 w-4 text-accent-cyan" />
            </div>
            <div>
              <div className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-100">
                Telegram Bot AI
              </div>
              <p className="text-[10px] text-navy-500 mt-0.5">
                AI-powered responses to Telegram messages from linked users
              </p>
            </div>
          </div>
        </div>

        {telegramLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] text-navy-200 font-medium">AI Responses</div>
                <div className="text-[10px] text-navy-500">When disabled, bot only handles commands and alerts</div>
              </div>
              <button
                onClick={() => setTelegramAiEnabled(!telegramAiEnabled)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  telegramAiEnabled ? "bg-accent-emerald" : "bg-navy-700"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    telegramAiEnabled ? "translate-x-[18px]" : "translate-x-[3px]"
                  }`}
                />
              </button>
            </div>

            {/* Model */}
            <div>
              <label className="text-[11px] text-navy-200 font-medium block mb-1">Model</label>
              <select
                value={telegramModel}
                onChange={(e) => setTelegramModel(e.target.value)}
                className="w-full bg-navy-800 border border-navy-700 rounded px-3 py-1.5 text-xs text-navy-200 focus:outline-none focus:border-navy-500"
              >
                <option value="claude-haiku-4-5-20251001">Haiku 4.5 (cheapest)</option>
                <option value="claude-sonnet-4-20250514">Sonnet 4</option>
                <option value="claude-sonnet-4-6">Sonnet 4.6</option>
              </select>
              <p className="text-[9px] text-navy-600 mt-1">Haiku is 25x cheaper than Sonnet for short responses</p>
            </div>

            {/* Rate Limit */}
            <div>
              <label className="text-[11px] text-navy-200 font-medium block mb-1">Rate Limit (messages/hour per user)</label>
              <Input
                value={telegramRateLimit}
                onChange={(e) => setTelegramRateLimit(e.target.value)}
                type="number"
                min="1"
                max="100"
                className="w-32"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={saveTelegramSettings}
              disabled={telegramSaving}
            >
              {telegramSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
              Save Telegram Settings
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Persist active tab in URL hash
  const validTabs = ADMIN_TABS.map((t) => t.id);
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.slice(1);
      if (validTabs.includes(hash)) return hash;
    }
    return "growth";
  });
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    window.history.replaceState(null, "", `#${tab}`);
  };

  const [tiers, setTiers] = useState<Tier[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showNewTier, setShowNewTier] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncAllResult, setSyncAllResult] = useState<string | null>(null);
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const [excludedIPs, setExcludedIPs] = useState<string[]>([]);
  const [excludedIPsLoaded, setExcludedIPsLoaded] = useState(false);
  const [newIP, setNewIP] = useState("");
  const [ipSaving, setIPSaving] = useState(false);

  const fetchExcludedIPs = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        const entry = Array.isArray(data) ? data.find((s: { key: string }) => s.key === "analytics:excluded_ips") : null;
        if (entry?.value) {
          setExcludedIPs(JSON.parse(entry.value));
        }
      }
    } catch {
      // silent
    }
    setExcludedIPsLoaded(true);
  }, []);

  const saveExcludedIPs = useCallback(async (ips: string[]) => {
    setIPSaving(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "analytics:excluded_ips", value: JSON.stringify(ips) }),
      });
      setExcludedIPs(ips);
    } catch {
      // silent
    }
    setIPSaving(false);
  }, []);

  const addExcludedIP = useCallback(() => {
    const ip = newIP.trim();
    if (!ip || excludedIPs.includes(ip)) return;
    const updated = [...excludedIPs, ip];
    saveExcludedIPs(updated);
    setNewIP("");
  }, [newIP, excludedIPs, saveExcludedIPs]);

  const removeExcludedIP = useCallback((ip: string) => {
    saveExcludedIPs(excludedIPs.filter((i) => i !== ip));
  }, [excludedIPs, saveExcludedIPs]);

  const [growth, setGrowth] = useState<GrowthData | null>(null);
  const [growthLoading, setGrowthLoading] = useState(false);
  const [prompts, setPrompts] = useState<PromptEntry[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(true);

  const fetchTiers = useCallback(async () => {
    const res = await fetch("/api/admin/tiers");
    const data = await res.json();
    setTiers(Array.isArray(data) ? data : []);
  }, []);

  const fetchAnalytics = useCallback(async (days: number) => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?days=${days}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch {
      // silent
    }
    setAnalyticsLoading(false);
  }, []);

  const fetchGrowth = useCallback(async () => {
    setGrowthLoading(true);
    try {
      const res = await fetch("/api/admin/growth");
      if (res.ok) {
        const data = await res.json();
        setGrowth(data);
      }
    } catch {
      // silent
    }
    setGrowthLoading(false);
  }, []);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    }
    setUsersLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status !== "authenticated") return;

    // Check admin status
    fetch("/api/admin/users")
      .then((r) => {
        if (r.status === 403) {
          router.push("/dashboard");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) {
          setIsAdmin(true);
          setUsers(Array.isArray(data) ? data : []);
          setUsersLoading(false);
        }
        setLoading(false);
      })
      .catch(() => {
        router.push("/dashboard");
      });

    fetchTiers();

    // Fetch prompts
    fetch("/api/settings/prompts")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        setPrompts(Array.isArray(data) ? data : []);
        setPromptsLoading(false);
      })
      .catch(() => setPromptsLoading(false));
  }, [status, router, fetchTiers]);

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

  const saveTier = async (tierData: Partial<Tier>) => {
    await fetch("/api/admin/tiers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tierData),
    });
    await fetchTiers();
    setShowNewTier(false);
  };

  const deleteTier = async (id: number) => {
    await fetch("/api/admin/tiers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchTiers();
  };

  const seedTiers = async () => {
    setSeeding(true);
    await fetch("/api/admin/tiers/seed", { method: "POST" });
    await fetchTiers();
    setSeeding(false);
  };

  const updateRole = async (username: string, role: string) => {
    setRoleUpdating(username);
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, role }),
    });
    await fetchUsers();
    setRoleUpdating(null);
  };

  const [granting, setGranting] = useState<string | null>(null);
  const [grantModal, setGrantModal] = useState<string | null>(null);
  const [grantForm, setGrantForm] = useState({
    tier: "analyst",
    duration: "30", // days, "" = permanent
    note: "",
  });

  const grantAccess = async (username: string) => {
    setGranting(username);
    const expiresAt = grantForm.duration
      ? new Date(Date.now() + parseInt(grantForm.duration) * 86400000).toISOString()
      : null;
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        action: "grant_access",
        tier: grantForm.tier,
        expiresAt,
        note: grantForm.note || null,
      }),
    });
    await fetchUsers();
    setGranting(null);
    setGrantModal(null);
    setGrantForm({ tier: "analyst", duration: "30", note: "" });
  };

  const revokeAccess = async (username: string) => {
    setGranting(username);
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, action: "revoke_access" }),
    });
    await fetchUsers();
    setGranting(null);
  };

  // Create user modal
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ username: "", password: "", email: "", role: "user", tier: "free" });
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const saveCreateUser = async () => {
    setCreateError(null);
    if (!createForm.username || !createForm.password) {
      setCreateError("Username and password are required");
      return;
    }
    if (createForm.password.length < 10) {
      setCreateError("Password must be at least 10 characters");
      return;
    }
    setCreateSaving(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: createForm.username,
        action: "create_user",
        password: createForm.password,
        email: createForm.email,
        newRole: createForm.role,
        newTier: createForm.tier,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setCreateError(data.error || "Failed to create user");
      setCreateSaving(false);
      return;
    }
    await fetchUsers();
    setCreateSaving(false);
    setCreateModal(false);
    setCreateForm({ username: "", password: "", email: "", role: "user", tier: "free" });
  };

  // Throttle modal
  const [throttleModal, setThrottleModal] = useState<string | null>(null);
  const [throttleForm, setThrottleForm] = useState<UserThrottle>({ chatMessagesPerDay: null, predictionsPerHour: null, apiCallsPerMinute: null });
  const [throttleSaving, setThrottleSaving] = useState(false);

  const openThrottleModal = (user: UserRecord) => {
    setThrottleModal(user.username);
    setThrottleForm(user.throttle || { chatMessagesPerDay: null, predictionsPerHour: null, apiCallsPerMinute: null });
  };

  const saveThrottle = async () => {
    if (!throttleModal) return;
    setThrottleSaving(true);
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: throttleModal,
        action: "set_throttle",
        throttle: throttleForm,
      }),
    });
    await fetchUsers();
    setThrottleSaving(false);
    setThrottleModal(null);
  };

  const clearThrottle = async () => {
    if (!throttleModal) return;
    setThrottleSaving(true);
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: throttleModal,
        action: "set_throttle",
        throttle: null,
      }),
    });
    await fetchUsers();
    setThrottleSaving(false);
    setThrottleModal(null);
  };

  // Edit user modal
  const [editModal, setEditModal] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ email: "", role: "user", tier: "free" });
  const [editSaving, setEditSaving] = useState(false);

  const openEditModal = (user: UserRecord) => {
    setEditModal(user.username);
    setEditForm({
      email: user.email || "",
      role: user.role,
      tier: user.tier || "free",
    });
  };

  const saveEditUser = async () => {
    if (!editModal) return;
    setEditSaving(true);
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: editModal,
        action: "edit_user",
        email: editForm.email,
        newRole: editForm.role,
        newTier: editForm.tier,
      }),
    });
    await fetchUsers();
    setEditSaving(false);
    setEditModal(null);
  };

  // User stats modal
  const [statsModal, setStatsModal] = useState<string | null>(null);
  const [statsData, setStatsData] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const openStatsModal = async (username: string) => {
    setStatsModal(username);
    setStatsData(null);
    setStatsLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(username)}/stats`);
      if (res.ok) {
        setStatsData(await res.json());
      }
    } catch {
      // ignore
    }
    setStatsLoading(false);
  };

  // Transactions modal
  const [txModal, setTxModal] = useState<string | null>(null);
  const [txData, setTxData] = useState<TransactionsData | null>(null);
  const [txLoading, setTxLoading] = useState(false);
  const [refunding, setRefunding] = useState<string | null>(null);
  const [refundConfirm, setRefundConfirm] = useState<{ txId: string; chargeId: string | null; paymentIntentId: string | null; amount: number; description: string } | null>(null);
  const [refundReason, setRefundReason] = useState("requested_by_customer");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundError, setRefundError] = useState<string | null>(null);

  const openTxModal = async (username: string) => {
    setTxModal(username);
    setTxData(null);
    setTxLoading(true);
    setRefundConfirm(null);
    setRefundError(null);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(username)}/transactions`);
      if (res.ok) {
        setTxData(await res.json());
      }
    } catch {
      // ignore
    }
    setTxLoading(false);
  };

  const issueRefund = async () => {
    if (!refundConfirm || !txModal) return;
    if (refundAmount && (isNaN(Number(refundAmount)) || Number(refundAmount) <= 0)) {
      setRefundError("Enter a valid positive amount");
      return;
    }
    setRefunding(refundConfirm.txId);
    setRefundError(null);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(txModal)}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chargeId: refundConfirm.chargeId,
          paymentIntentId: refundConfirm.paymentIntentId,
          amount: refundAmount ? Math.round(Number(refundAmount) * 100) : undefined,
          reason: refundReason,
        }),
      });
      if (res.ok) {
        setRefundConfirm(null);
        setRefundAmount("");
        // Refresh transactions
        await openTxModal(txModal);
      } else {
        const data = await res.json();
        setRefundError(data.error || "Refund failed");
      }
    } catch {
      setRefundError("Network error");
    }
    setRefunding(null);
  };

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>(CONFIRM_INITIAL);
  const closeConfirm = () => setConfirmModal(CONFIRM_INITIAL);

  // Block/unblock
  const [blocking, setBlocking] = useState<string | null>(null);

  const blockUser = (username: string) => {
    setConfirmModal({
      open: true,
      title: `Block ${username}`,
      description: `This user will lose access to the platform immediately. They will see a blocked message on login. You can unblock them later.`,
      confirmLabel: "Block User",
      variant: "warning",
      onConfirm: async () => {
        setBlocking(username);
        await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, action: "block_user" }),
        });
        await fetchUsers();
        setBlocking(null);
      },
    });
  };

  const unblockUser = async (username: string) => {
    setBlocking(username);
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, action: "unblock_user" }),
    });
    await fetchUsers();
    setBlocking(null);
  };

  // Delete user
  const [deleting, setDeleting] = useState<string | null>(null);

  const deleteUser = (username: string) => {
    setConfirmModal({
      open: true,
      title: `Delete ${username}`,
      description: `This permanently removes the user and all their data including predictions, theses, chat history, and settings. This action cannot be undone.`,
      confirmLabel: "Delete Permanently",
      variant: "danger",
      onConfirm: async () => {
        setDeleting(username);
        await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, action: "delete_user" }),
        });
        await fetchUsers();
        setDeleting(null);
      },
    });
  };

  // Impersonate user
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [impersonateError, setImpersonateError] = useState<string | null>(null);

  const impersonateUser = (username: string) => {
    setConfirmModal({
      open: true,
      title: `Impersonate ${username}`,
      description: `You will see the platform as this user for up to 1 hour. All actions are logged. Your admin session will resume after the impersonation expires or you end it manually.`,
      confirmLabel: "Start Impersonation",
      variant: "info",
      onConfirm: async () => {
        setImpersonating(username);
        setImpersonateError(null);
        try {
          const res = await fetch("/api/admin/impersonate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username }),
          });
          if (res.ok) {
            window.location.href = "/dashboard";
          } else {
            const data = await res.json();
            setImpersonateError(data.error || "Failed to impersonate");
          }
        } catch {
          setImpersonateError("Failed to impersonate");
        }
        setImpersonating(null);
      },
    });
  };

  if (loading || status === "loading") {
    return (
      <PageContainer title="Admin" subtitle="Platform administration">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </PageContainer>
    );
  }

  if (!isAdmin) return null;

  return (
    <PageContainer title="Admin" subtitle="Platform administration">
      {/* Backtest link */}
      <Link
        href="/admin/backtest"
        className="group flex items-center justify-between mb-6 border border-accent-cyan/20 rounded-lg bg-accent-cyan/[0.03] px-5 py-4 hover:bg-accent-cyan/[0.06] hover:border-accent-cyan/30 transition-all"
      >
        <div className="flex items-center gap-3">
          <FlaskConical className="w-4 h-4 text-accent-cyan" />
          <div>
            <span className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-100">
              Signal Convergence Backtesting
            </span>
            <p className="font-sans text-[11px] text-navy-400 mt-0.5">
              Validate prediction methodology against 10+ years of historical data with statistical significance testing
            </p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-accent-cyan group-hover:translate-x-0.5 transition-transform" />
      </Link>

      {/* OG Image Designer link */}
      <Link
        href="/admin/og-designer"
        className="group flex items-center justify-between mb-6 border border-accent-amber/20 rounded-lg bg-accent-amber/[0.03] px-5 py-4 hover:bg-accent-amber/[0.06] hover:border-accent-amber/30 transition-all"
      >
        <div className="flex items-center gap-3">
          <Eye className="w-4 h-4 text-accent-amber" />
          <div>
            <span className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-100">
              OG Image Designer
            </span>
            <p className="font-sans text-[11px] text-navy-400 mt-0.5">
              Design social share images with AI. Control how NEXUS appears on Twitter, LinkedIn, and Slack.
            </p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-accent-amber group-hover:translate-x-0.5 transition-transform" />
      </Link>

      {/* Whitepaper link */}
      <Link
        href="/research/whitepapers"
        className="group flex items-center justify-between mb-6 border border-navy-700/40 rounded-lg bg-navy-900/20 px-5 py-4 hover:bg-navy-900/40 hover:border-navy-600/40 transition-all"
      >
        <div className="flex items-center gap-3">
          <FileText className="w-4 h-4 text-navy-300" />
          <div>
            <span className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-100">
              Technical White Paper
            </span>
            <p className="font-sans text-[11px] text-navy-400 mt-0.5">
              Full methodology documentation (not publicly linked)
            </p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-navy-400 group-hover:translate-x-0.5 transition-transform" />
      </Link>

      <Tabs.Root value={activeTab} onValueChange={handleTabChange}>
        <Tabs.List className="flex gap-0 border-b border-navy-700 mb-6">
          {ADMIN_TABS.map((tab) => (
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

        {/* Tiers Tab */}
        <Tabs.Content value="tiers">
          <div className="space-y-4 max-w-3xl">
            <p className="text-[11px] text-navy-400">
              Manage subscription tiers. Connect each tier to a Stripe Price ID for checkout.
            </p>
            <div className="flex items-center gap-2">
              {syncAllResult && (
                <span className={`text-[10px] font-mono ${syncAllResult.includes("Failed") ? "text-accent-rose" : "text-accent-emerald"}`}>
                  {syncAllResult}
                </span>
              )}
              {tiers.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={syncingAll}
                  onClick={async () => {
                    setSyncingAll(true);
                    setSyncAllResult(null);
                    let ok = 0;
                    let fail = 0;
                    for (const t of tiers) {
                      try {
                        const res = await fetch("/api/admin/tiers/stripe-sync", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ tierId: t.id }),
                        });
                        if (res.ok) ok++;
                        else fail++;
                      } catch { fail++; }
                    }
                    setSyncAllResult(fail > 0 ? `${ok} synced, ${fail} failed` : `${ok} tiers synced`);
                    setSyncingAll(false);
                    // Refresh tiers to get updated Stripe IDs
                    fetch("/api/admin/tiers").then(r => r.json()).then(data => { if (Array.isArray(data)) setTiers(data); });
                    setTimeout(() => setSyncAllResult(null), 5000);
                  }}
                >
                  {syncingAll ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CreditCard className="h-3 w-3 mr-1" />}
                  Sync All to Stripe
                </Button>
              )}
              {tiers.length === 0 && (
                <Button variant="outline" size="sm" onClick={seedTiers} disabled={seeding}>
                  {seeding ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Shield className="h-3 w-3 mr-1" />}
                  Seed Default Tiers
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewTier(true)}
                disabled={showNewTier}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Tier
              </Button>
            </div>

            {showNewTier && (
              <TierEditor
                tier={{}}
                onSave={saveTier}
                onCancel={() => setShowNewTier(false)}
              />
            )}

            {tiers.map((tier) => (
              <TierEditor
                key={tier.id}
                tier={tier}
                onSave={saveTier}
                onDelete={() => deleteTier(tier.id)}
              />
            ))}

            {tiers.length === 0 && !showNewTier && (
              <div className="border border-navy-700/50 border-dashed rounded p-8 text-center">
                <CreditCard className="h-8 w-8 text-navy-600 mx-auto mb-3" />
                <p className="text-sm text-navy-400 mb-1">No subscription tiers configured</p>
                <p className="text-[10px] text-navy-500 mb-4">
                  Click "Seed Default Tiers" to create the Analyst, Operator, and Institution tiers from the homepage.
                </p>
              </div>
            )}
          </div>
        </Tabs.Content>

        {/* Users Tab */}
        <Tabs.Content value="users">
          <div className="max-w-5xl">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] text-navy-400">
                Manage user roles and view subscription status.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setCreateModal(true); setCreateError(null); setCreateForm({ username: "", password: "", email: "", role: "user", tier: "free" }); }}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add User
              </Button>
            </div>

            {usersLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="border border-navy-700 rounded overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                  <thead>
                    <tr className="border-b border-navy-700/60">
                      <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-widest text-navy-500">
                        User
                      </th>
                      <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-widest text-navy-500">
                        Role
                      </th>
                      <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-widest text-navy-500">
                        Subscription
                      </th>
                      <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-widest text-navy-500">
                        Status
                      </th>
                      <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-widest text-navy-500 min-w-[280px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr
                        key={user.username}
                        className={`border-b border-navy-700/30 hover:bg-navy-800/30 transition-colors ${user.blocked ? "opacity-50" : ""}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-mono ${user.blocked ? "text-navy-500 line-through" : "text-navy-200"}`}>
                              {user.username}
                            </span>
                            {user.blocked && (
                              <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-accent-rose/15 text-accent-rose uppercase tracking-wider">
                                Blocked
                              </span>
                            )}
                            {user.throttle && (
                              <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-accent-amber/15 text-accent-amber uppercase tracking-wider">
                                Throttled
                              </span>
                            )}
                          </div>
                          {user.email && (
                            <span className="text-[10px] text-navy-600 font-mono block mt-0.5">{user.email}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase tracking-wider ${
                              user.role === "admin"
                                ? "bg-accent-amber/15 text-accent-amber"
                                : "bg-navy-700 text-navy-400"
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-navy-400 capitalize">
                            {user.subscription
                              ? user.tier || "active"
                              : "Free"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {user.subscription ? (
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[10px] font-mono uppercase tracking-wider ${
                                  user.subscription.status === "active"
                                    ? "text-accent-emerald"
                                    : user.subscription.status === "past_due"
                                    ? "text-accent-amber"
                                    : "text-navy-500"
                                }`}
                              >
                                {user.subscription.status}
                              </span>
                              {user.subscription.stripeSubscriptionId?.startsWith("comped_") && (
                                <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-accent-amber/15 text-accent-amber uppercase tracking-wider">
                                  Beta
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-navy-600">--</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {/* Quick actions */}
                            <button
                              onClick={() => openEditModal(user)}
                              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono text-navy-400 hover:text-navy-200 hover:bg-navy-800/50 transition-colors"
                              title="Edit user"
                            >
                              <Eye className="h-3 w-3" />
                              Edit
                            </button>
                            <button
                              onClick={() => openStatsModal(user.username)}
                              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono text-navy-400 hover:text-accent-cyan hover:bg-accent-cyan/10 transition-colors"
                              title="View stats"
                            >
                              <Activity className="h-3 w-3" />
                              Stats
                            </button>
                            {user.subscription?.stripeCustomerId && (
                              <button
                                onClick={() => openTxModal(user.username)}
                                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono text-navy-400 hover:text-accent-amber hover:bg-accent-amber/10 transition-colors"
                                title="View transactions"
                              >
                                <CreditCard className="h-3 w-3" />
                                Billing
                              </button>
                            )}

                            {/* Subscription badge */}
                            {user.compedGrant?.expiresAt && user.compedGrant.expiresAt !== "2099-12-31T23:59:59.000Z" &&
                              user.subscription?.stripeSubscriptionId?.startsWith("comped_") && (
                              <span className={`text-[9px] font-mono tabular-nums ${
                                new Date(user.compedGrant.expiresAt) < new Date() ? "text-accent-rose" : "text-accent-amber"
                              }`}>
                                {new Date(user.compedGrant.expiresAt) < new Date()
                                  ? "expired"
                                  : `exp ${new Date(user.compedGrant.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                                }
                              </span>
                            )}

                            {/* 3-dot menu */}
                            <DropdownMenu.Root>
                              <DropdownMenu.Trigger asChild>
                                <button className="p-1 rounded text-navy-500 hover:text-navy-200 hover:bg-navy-800/50 transition-colors">
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </button>
                              </DropdownMenu.Trigger>
                              <DropdownMenu.Portal>
                                <DropdownMenu.Content
                                  className="min-w-[160px] bg-navy-900 border border-navy-700 rounded-lg shadow-xl p-1 z-50"
                                  sideOffset={4}
                                  align="end"
                                >
                                  {/* Impersonate - always show for other users, disabled for admins/blocked */}
                                  {user.username !== session?.user?.name && (() => {
                                    const canImpersonate = user.role !== "admin" && !user.blocked;
                                    const reason = user.role === "admin" ? "Cannot impersonate admins" : user.blocked ? "Cannot impersonate blocked users" : "";
                                    return (
                                      <DropdownMenu.Item
                                        className={`flex items-center gap-2 px-3 py-2 rounded text-[11px] font-mono outline-none transition-colors ${
                                          canImpersonate
                                            ? "text-accent-cyan cursor-pointer hover:bg-accent-cyan/10"
                                            : "text-navy-700 cursor-not-allowed line-through"
                                        }`}
                                        onSelect={canImpersonate ? () => impersonateUser(user.username) : undefined}
                                        disabled={!canImpersonate || impersonating === user.username}
                                        title={reason}
                                      >
                                        <UserCheck className="h-3 w-3" />
                                        {impersonating === user.username ? "Impersonating..." : "Impersonate"}
                                      </DropdownMenu.Item>
                                    );
                                  })()}

                                  {/* Role toggle */}
                                  {user.role !== "admin" ? (
                                    <DropdownMenu.Item
                                      className="flex items-center gap-2 px-3 py-2 rounded text-[11px] font-mono text-navy-300 cursor-pointer outline-none hover:bg-accent-amber/10 hover:text-accent-amber transition-colors"
                                      onSelect={() => updateRole(user.username, "admin")}
                                      disabled={roleUpdating === user.username}
                                    >
                                      <Shield className="h-3 w-3" />
                                      {roleUpdating === user.username ? "Updating..." : "Promote to Admin"}
                                    </DropdownMenu.Item>
                                  ) : user.username !== session?.user?.name ? (
                                    <DropdownMenu.Item
                                      className="flex items-center gap-2 px-3 py-2 rounded text-[11px] font-mono text-accent-amber cursor-pointer outline-none hover:bg-navy-800/50 transition-colors"
                                      onSelect={() => updateRole(user.username, "user")}
                                      disabled={roleUpdating === user.username}
                                    >
                                      <Shield className="h-3 w-3" />
                                      {roleUpdating === user.username ? "Updating..." : "Demote to User"}
                                    </DropdownMenu.Item>
                                  ) : null}

                                  {/* Grant / Revoke Access */}
                                  {granting === user.username ? (
                                    <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 rounded text-[11px] font-mono text-navy-500 cursor-default outline-none" disabled>
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      Updating...
                                    </DropdownMenu.Item>
                                  ) : user.subscription?.status === "active" &&
                                    user.subscription?.stripeSubscriptionId?.startsWith("comped_") ? (
                                    <>
                                      <DropdownMenu.Item
                                        className="flex items-center gap-2 px-3 py-2 rounded text-[11px] font-mono text-navy-300 cursor-pointer outline-none hover:bg-accent-cyan/10 hover:text-accent-cyan transition-colors"
                                        onSelect={() => {
                                          setGrantModal(user.username);
                                          setGrantForm({
                                            tier: user.compedGrant?.tier || user.tier || "analyst",
                                            duration: "",
                                            note: user.compedGrant?.note || "",
                                          });
                                        }}
                                      >
                                        <Gift className="h-3 w-3" />
                                        Update Grant
                                      </DropdownMenu.Item>
                                      <DropdownMenu.Item
                                        className="flex items-center gap-2 px-3 py-2 rounded text-[11px] font-mono text-accent-rose/70 cursor-pointer outline-none hover:bg-accent-rose/10 hover:text-accent-rose transition-colors"
                                        onSelect={() => revokeAccess(user.username)}
                                      >
                                        <X className="h-3 w-3" />
                                        Revoke Access
                                      </DropdownMenu.Item>
                                    </>
                                  ) : !user.subscription || user.subscription.status !== "active" ? (
                                    <DropdownMenu.Item
                                      className="flex items-center gap-2 px-3 py-2 rounded text-[11px] font-mono text-navy-300 cursor-pointer outline-none hover:bg-accent-cyan/10 hover:text-accent-cyan transition-colors"
                                      onSelect={() => {
                                        setGrantModal(user.username);
                                        setGrantForm({ tier: "analyst", duration: "30", note: "" });
                                      }}
                                    >
                                      <Gift className="h-3 w-3" />
                                      Grant Access
                                    </DropdownMenu.Item>
                                  ) : null}

                                  {/* Throttle */}
                                  {user.username !== session?.user?.name && (
                                    <DropdownMenu.Item
                                      className="flex items-center gap-2 px-3 py-2 rounded text-[11px] font-mono text-navy-300 cursor-pointer outline-none hover:bg-accent-amber/10 hover:text-accent-amber transition-colors"
                                      onSelect={() => openThrottleModal(user)}
                                    >
                                      <Timer className="h-3 w-3" />
                                      {user.throttle ? "Edit Throttle" : "Set Throttle"}
                                    </DropdownMenu.Item>
                                  )}

                                  {user.username !== session?.user?.name && (
                                    <>
                                      <DropdownMenu.Separator className="h-px bg-navy-700/40 my-1" />

                                      {/* Block / Unblock */}
                                      {user.blocked ? (
                                        <DropdownMenu.Item
                                          className="flex items-center gap-2 px-3 py-2 rounded text-[11px] font-mono text-accent-emerald/70 cursor-pointer outline-none hover:bg-accent-emerald/10 hover:text-accent-emerald transition-colors"
                                          onSelect={() => unblockUser(user.username)}
                                          disabled={blocking === user.username}
                                        >
                                          <Shield className="h-3 w-3" />
                                          {blocking === user.username ? "Updating..." : "Unblock"}
                                        </DropdownMenu.Item>
                                      ) : (
                                        <DropdownMenu.Item
                                          className="flex items-center gap-2 px-3 py-2 rounded text-[11px] font-mono text-navy-500 cursor-pointer outline-none hover:bg-accent-rose/10 hover:text-accent-rose transition-colors"
                                          onSelect={() => blockUser(user.username)}
                                          disabled={blocking === user.username}
                                        >
                                          <Shield className="h-3 w-3" />
                                          {blocking === user.username ? "Updating..." : "Block"}
                                        </DropdownMenu.Item>
                                      )}

                                      {/* Delete */}
                                      <DropdownMenu.Item
                                        className="flex items-center gap-2 px-3 py-2 rounded text-[11px] font-mono text-accent-rose/60 cursor-pointer outline-none hover:bg-accent-rose/10 hover:text-accent-rose transition-colors"
                                        onSelect={() => deleteUser(user.username)}
                                        disabled={deleting === user.username}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                        {deleting === user.username ? "Deleting..." : "Delete User"}
                                      </DropdownMenu.Item>
                                    </>
                                  )}
                                </DropdownMenu.Content>
                              </DropdownMenu.Portal>
                            </DropdownMenu.Root>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Grant Access Modal */}
          {grantModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setGrantModal(null)}>
              <div
                className="bg-navy-900 border border-navy-700 rounded-lg w-full max-w-md overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-3 border-b border-navy-700">
                  <div className="flex items-center gap-2">
                    <Gift className="h-3.5 w-3.5 text-accent-cyan" />
                    <span className="text-[11px] font-mono uppercase tracking-wider text-navy-200">Grant Access</span>
                  </div>
                  <button onClick={() => setGrantModal(null)} className="text-navy-500 hover:text-navy-300">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                  <div className="flex items-center gap-2 px-3 py-2 rounded bg-navy-800/40 border border-navy-700/30">
                    <User className="h-3 w-3 text-navy-500" />
                    <span className="text-sm font-mono text-navy-200">{grantModal}</span>
                  </div>

                  {/* Tier Selection */}
                  <div>
                    <label className="text-[10px] font-mono text-navy-500 uppercase tracking-wider block mb-2">Tier</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["analyst", "operator", "institution"].map((t) => (
                        <button
                          key={t}
                          onClick={() => setGrantForm({ ...grantForm, tier: t })}
                          className={`px-3 py-2 rounded border text-[11px] font-mono uppercase tracking-wider transition-all ${
                            grantForm.tier === t
                              ? "border-accent-cyan/50 bg-accent-cyan/10 text-accent-cyan"
                              : "border-navy-700/40 text-navy-500 hover:text-navy-300 hover:border-navy-700"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="text-[10px] font-mono text-navy-500 uppercase tracking-wider block mb-2">
                      <Clock className="h-2.5 w-2.5 inline mr-1" />
                      Duration
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { label: "7 days", value: "7" },
                        { label: "14 days", value: "14" },
                        { label: "30 days", value: "30" },
                        { label: "90 days", value: "90" },
                        { label: "Permanent", value: "" },
                      ].map((d) => (
                        <button
                          key={d.value}
                          onClick={() => setGrantForm({ ...grantForm, duration: d.value })}
                          className={`px-2 py-1.5 rounded border text-[10px] font-mono transition-all ${
                            grantForm.duration === d.value
                              ? "border-accent-cyan/50 bg-accent-cyan/10 text-accent-cyan"
                              : "border-navy-700/40 text-navy-500 hover:text-navy-300 hover:border-navy-700"
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                    {grantForm.duration && (
                      <p className="text-[9px] font-mono text-navy-500 mt-1.5">
                        Expires {new Date(Date.now() + parseInt(grantForm.duration) * 86400000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                  </div>

                  {/* Note */}
                  <div>
                    <label className="text-[10px] font-mono text-navy-500 uppercase tracking-wider block mb-1">Note (optional)</label>
                    <input
                      value={grantForm.note}
                      onChange={(e) => setGrantForm({ ...grantForm, note: e.target.value })}
                      placeholder="e.g. Beta tester, advisor, press review..."
                      className="w-full h-8 px-3 rounded bg-navy-900/50 border border-navy-700/50 text-[11px] font-mono text-navy-300 placeholder:text-navy-600 focus:outline-none focus:border-navy-600"
                    />
                  </div>

                  {/* Summary */}
                  <div className="bg-navy-800/30 rounded p-3 border border-navy-700/20 space-y-1">
                    <div className="text-[9px] font-mono text-navy-500 uppercase tracking-wider mb-1">Summary</div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-navy-400">Tier</span>
                      <span className="text-[10px] font-mono text-navy-200 capitalize">{grantForm.tier}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-navy-400">Duration</span>
                      <span className="text-[10px] font-mono text-navy-200">
                        {grantForm.duration ? `${grantForm.duration} days` : "Permanent"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-navy-400">Cost</span>
                      <span className="text-[10px] font-mono text-accent-emerald">Free (comped)</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-navy-700">
                  <Button variant="ghost" size="sm" onClick={() => setGrantModal(null)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => grantAccess(grantModal)} disabled={granting === grantModal}>
                    {granting === grantModal ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Gift className="h-3 w-3 mr-1" />
                    )}
                    Grant {grantForm.tier}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Throttle Modal */}
          {throttleModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setThrottleModal(null)}>
              <div
                className="bg-navy-900 border border-navy-700 rounded-lg w-full max-w-md overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-3 border-b border-navy-700">
                  <div className="flex items-center gap-2">
                    <Timer className="h-3.5 w-3.5 text-accent-amber" />
                    <span className="text-[11px] font-mono uppercase tracking-wider text-navy-200">Throttle User</span>
                  </div>
                  <button onClick={() => setThrottleModal(null)} className="text-navy-500 hover:text-navy-300">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                  <div className="flex items-center gap-2 px-3 py-2 rounded bg-navy-800/40 border border-navy-700/30">
                    <User className="h-3 w-3 text-navy-500" />
                    <span className="text-sm font-mono text-navy-200">{throttleModal}</span>
                  </div>

                  <p className="text-[10px] font-mono text-navy-500">
                    Set custom rate limits for this user. Leave blank to use tier defaults.
                  </p>

                  {/* Chat messages per day */}
                  <div>
                    <label className="text-[10px] font-mono text-navy-500 uppercase tracking-wider block mb-1">Chat messages / day</label>
                    <input
                      type="number"
                      min="0"
                      value={throttleForm.chatMessagesPerDay ?? ""}
                      onChange={(e) => setThrottleForm({ ...throttleForm, chatMessagesPerDay: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="Tier default"
                      className="w-full h-8 px-3 rounded bg-navy-900/50 border border-navy-700/50 text-[11px] font-mono text-navy-300 placeholder:text-navy-600 focus:outline-none focus:border-navy-600"
                    />
                  </div>

                  {/* Predictions per hour */}
                  <div>
                    <label className="text-[10px] font-mono text-navy-500 uppercase tracking-wider block mb-1">Prediction requests / hour</label>
                    <input
                      type="number"
                      min="0"
                      value={throttleForm.predictionsPerHour ?? ""}
                      onChange={(e) => setThrottleForm({ ...throttleForm, predictionsPerHour: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="Default (5)"
                      className="w-full h-8 px-3 rounded bg-navy-900/50 border border-navy-700/50 text-[11px] font-mono text-navy-300 placeholder:text-navy-600 focus:outline-none focus:border-navy-600"
                    />
                  </div>

                  {/* API calls per minute */}
                  <div>
                    <label className="text-[10px] font-mono text-navy-500 uppercase tracking-wider block mb-1">API calls / minute</label>
                    <input
                      type="number"
                      min="0"
                      value={throttleForm.apiCallsPerMinute ?? ""}
                      onChange={(e) => setThrottleForm({ ...throttleForm, apiCallsPerMinute: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="Default (60)"
                      className="w-full h-8 px-3 rounded bg-navy-900/50 border border-navy-700/50 text-[11px] font-mono text-navy-300 placeholder:text-navy-600 focus:outline-none focus:border-navy-600"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between px-5 py-3 border-t border-navy-700">
                  <button
                    onClick={clearThrottle}
                    disabled={throttleSaving}
                    className="text-[10px] font-mono text-navy-500 hover:text-accent-rose transition-colors"
                  >
                    Remove throttle
                  </button>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setThrottleModal(null)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={saveThrottle} disabled={throttleSaving}>
                      {throttleSaving ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Save className="h-3 w-3 mr-1" />
                      )}
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Edit User Modal */}
          {editModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setEditModal(null)}>
              <div
                className="bg-navy-900 border border-navy-700 rounded-lg w-full max-w-md overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-3 border-b border-navy-700">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-accent-cyan" />
                    <span className="text-[11px] font-mono uppercase tracking-wider text-navy-200">Edit User</span>
                  </div>
                  <button onClick={() => setEditModal(null)} className="text-navy-500 hover:text-navy-300">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                  <div className="flex items-center gap-2 px-3 py-2 rounded bg-navy-800/40 border border-navy-700/30">
                    <User className="h-3 w-3 text-navy-500" />
                    <span className="text-sm font-mono text-navy-200">{editModal}</span>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-[10px] font-mono text-navy-500 uppercase tracking-wider block mb-1">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-navy-600" />
                      <input
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        placeholder="user@example.com"
                        className="w-full h-8 pl-8 pr-3 rounded bg-navy-900/50 border border-navy-700/50 text-[11px] font-mono text-navy-300 placeholder:text-navy-600 focus:outline-none focus:border-navy-600"
                      />
                    </div>
                  </div>

                  {/* Role */}
                  <div>
                    <label className="text-[10px] font-mono text-navy-500 uppercase tracking-wider block mb-2">Role</label>
                    <div className="grid grid-cols-2 gap-2">
                      {["user", "admin"].map((r) => (
                        <button
                          key={r}
                          onClick={() => setEditForm({ ...editForm, role: r })}
                          className={`px-3 py-2 rounded border text-[11px] font-mono uppercase tracking-wider transition-all ${
                            editForm.role === r
                              ? "border-accent-cyan/50 bg-accent-cyan/10 text-accent-cyan"
                              : "border-navy-700/40 text-navy-500 hover:text-navy-300 hover:border-navy-700"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tier */}
                  <div>
                    <label className="text-[10px] font-mono text-navy-500 uppercase tracking-wider block mb-2">Tier</label>
                    <div className="grid grid-cols-4 gap-2">
                      {["free", "analyst", "operator", "institution"].map((t) => (
                        <button
                          key={t}
                          onClick={() => setEditForm({ ...editForm, tier: t })}
                          className={`px-2 py-2 rounded border text-[10px] font-mono uppercase tracking-wider transition-all ${
                            editForm.tier === t
                              ? "border-accent-cyan/50 bg-accent-cyan/10 text-accent-cyan"
                              : "border-navy-700/40 text-navy-500 hover:text-navy-300 hover:border-navy-700"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-navy-700">
                  <Button variant="ghost" size="sm" onClick={() => setEditModal(null)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={saveEditUser} disabled={editSaving}>
                    {editSaving ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Save className="h-3 w-3 mr-1" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* User Stats Modal */}
          {statsModal && (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setStatsModal(null)}>
              <div
                className="bg-navy-900 border border-navy-700 rounded-lg w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-3 border-b border-navy-700 shrink-0">
                  <div className="flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-accent-cyan" />
                    <span className="text-[11px] font-mono uppercase tracking-wider text-navy-200">User Stats</span>
                    <span className="text-[11px] font-mono text-accent-cyan">{statsModal}</span>
                  </div>
                  <button onClick={() => setStatsModal(null)} className="text-navy-500 hover:text-navy-300">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
                  {statsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                      ))}
                    </div>
                  ) : statsData ? (
                    <>
                      {/* Account Info */}
                      <div className="grid grid-cols-4 gap-3">
                        <div className="border border-navy-700/40 rounded-lg p-3 bg-navy-800/20">
                          <div className="text-[9px] font-mono text-navy-500 uppercase tracking-wider mb-1">Account Created</div>
                          <div className="text-[12px] font-mono text-navy-200">
                            {statsData.accountCreated
                              ? new Date(statsData.accountCreated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                              : "Unknown"}
                          </div>
                        </div>
                        <div className="border border-navy-700/40 rounded-lg p-3 bg-navy-800/20">
                          <div className="text-[9px] font-mono text-navy-500 uppercase tracking-wider mb-1">Last Login</div>
                          <div className="text-[12px] font-mono text-navy-200">
                            {statsData.lastLogin
                              ? new Date(statsData.lastLogin).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                              : "N/A"}
                          </div>
                        </div>
                        <div className="border border-navy-700/40 rounded-lg p-3 bg-navy-800/20">
                          <div className="text-[9px] font-mono text-navy-500 uppercase tracking-wider mb-1">Chat Sessions</div>
                          <div className="text-[12px] font-mono text-navy-200">{statsData.chatStats.totalSessions}</div>
                          <div className="text-[9px] font-mono text-navy-600">{statsData.chatStats.totalMessages} messages</div>
                        </div>
                        <div className="border border-navy-700/40 rounded-lg p-3 bg-navy-800/20">
                          <div className="text-[9px] font-mono text-navy-500 uppercase tracking-wider mb-1">Trades</div>
                          <div className="text-[12px] font-mono text-navy-200">{statsData.tradeStats.total}</div>
                          <div className="text-[9px] font-mono text-navy-600">{statsData.tradeStats.filled} filled</div>
                        </div>
                      </div>

                      {/* Credit Balance */}
                      {statsData.creditBalance && (
                        <div className="border border-navy-700/40 rounded-lg p-4 bg-navy-800/20">
                          <div className="flex items-center gap-2 mb-3">
                            <Coins className="h-3.5 w-3.5 text-accent-amber" />
                            <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider">Credit Balance</span>
                            <span className="text-[9px] font-mono text-navy-600 ml-auto">Period: {statsData.creditBalance.period}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <div className="text-[9px] font-mono text-navy-500 uppercase mb-0.5">Granted</div>
                              <div className="text-lg font-mono text-navy-200 tabular-nums">
                                {statsData.creditBalance.creditsGranted === -1 ? "Unlimited" : statsData.creditBalance.creditsGranted.toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] font-mono text-navy-500 uppercase mb-0.5">Used</div>
                              <div className="text-lg font-mono text-accent-amber tabular-nums">{statsData.creditBalance.creditsUsed.toLocaleString()}</div>
                            </div>
                            <div>
                              <div className="text-[9px] font-mono text-navy-500 uppercase mb-0.5">Remaining</div>
                              <div className={`text-lg font-mono tabular-nums ${
                                statsData.creditBalance.creditsRemaining < statsData.creditBalance.creditsGranted * 0.2
                                  ? "text-accent-rose"
                                  : "text-accent-emerald"
                              }`}>
                                {statsData.creditBalance.creditsGranted === -1 ? "Unlimited" : statsData.creditBalance.creditsRemaining.toLocaleString()}
                              </div>
                            </div>
                          </div>
                          {/* Usage bar */}
                          {statsData.creditBalance.creditsGranted > 0 && (
                            <div className="mt-3">
                              <div className="h-2 rounded-full bg-navy-800 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    statsData.creditBalance.creditsUsed / statsData.creditBalance.creditsGranted > 0.8
                                      ? "bg-accent-rose"
                                      : statsData.creditBalance.creditsUsed / statsData.creditBalance.creditsGranted > 0.5
                                      ? "bg-accent-amber"
                                      : "bg-accent-cyan"
                                  }`}
                                  style={{ width: `${Math.min(100, (statsData.creditBalance.creditsUsed / statsData.creditBalance.creditsGranted) * 100)}%` }}
                                />
                              </div>
                              <div className="text-[9px] font-mono text-navy-600 mt-1">
                                {((statsData.creditBalance.creditsUsed / statsData.creditBalance.creditsGranted) * 100).toFixed(1)}% used
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Daily Usage Chart (simple bar) */}
                      {statsData.dailyUsage.length > 0 && (
                        <div className="border border-navy-700/40 rounded-lg p-4 bg-navy-800/20">
                          <div className="flex items-center gap-2 mb-3">
                            <BarChart3 className="h-3.5 w-3.5 text-accent-cyan" />
                            <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider">Daily Usage (14 days)</span>
                          </div>
                          <div className="flex items-end gap-1 h-24">
                            {statsData.dailyUsage.map((day) => {
                              const maxCredits = Math.max(...statsData.dailyUsage.map((d) => d.credits));
                              const height = maxCredits > 0 ? (day.credits / maxCredits) * 100 : 0;
                              return (
                                <div key={day.day} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-navy-800 border border-navy-700 rounded px-2 py-1 text-[9px] font-mono text-navy-200 whitespace-nowrap z-10">
                                    {day.credits.toLocaleString()} credits / {day.calls} calls
                                  </div>
                                  <div
                                    className="w-full rounded-t bg-accent-cyan/60 hover:bg-accent-cyan transition-all cursor-default min-h-[2px]"
                                    style={{ height: `${Math.max(2, height)}%` }}
                                  />
                                  <span className="text-[7px] font-mono text-navy-600 rotate-0">{day.day.slice(8)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Model Usage Breakdown */}
                      {statsData.modelUsage.length > 0 && (
                        <div className="border border-navy-700/40 rounded-lg p-4 bg-navy-800/20">
                          <div className="flex items-center gap-2 mb-3">
                            <Hash className="h-3.5 w-3.5 text-accent-emerald" />
                            <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider">Model Usage</span>
                          </div>
                          <div className="space-y-2">
                            {statsData.modelUsage.map((m) => (
                              <div key={m.model || "unknown"} className="flex items-center gap-3">
                                <span className="text-[10px] font-mono text-navy-300 w-40 truncate">
                                  {(m.model || "unknown").replace("claude-", "").replace(/-\d{8}$/, "")}
                                </span>
                                <div className="flex-1 h-1.5 rounded-full bg-navy-800 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-accent-emerald/60"
                                    style={{
                                      width: `${Math.min(100, (m.totalCredits / Math.max(...statsData.modelUsage.map((x) => x.totalCredits))) * 100)}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono text-navy-400 tabular-nums w-20 text-right">{m.totalCredits.toLocaleString()}</span>
                                <span className="text-[9px] font-mono text-navy-600 tabular-nums w-16 text-right">{m.callCount} calls</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Usage by Period */}
                      {statsData.usageByPeriod.length > 0 && (
                        <div className="border border-navy-700/40 rounded-lg p-4 bg-navy-800/20">
                          <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider">Monthly History</span>
                          <div className="mt-3 space-y-1.5">
                            {statsData.usageByPeriod.map((p) => (
                              <div key={p.period} className="flex items-center gap-3 text-[10px] font-mono">
                                <span className="text-navy-400 w-16">{p.period}</span>
                                <span className="text-accent-amber tabular-nums w-20 text-right">{p.totalCredits.toLocaleString()} cr</span>
                                <span className="text-navy-500 tabular-nums w-24 text-right">{(p.totalInputTokens || 0).toLocaleString()} in</span>
                                <span className="text-navy-500 tabular-nums w-24 text-right">{(p.totalOutputTokens || 0).toLocaleString()} out</span>
                                <span className="text-navy-600 tabular-nums">{p.callCount} calls</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recent Chat Sessions */}
                      {statsData.recentSessions.length > 0 && (
                        <div className="border border-navy-700/40 rounded-lg p-4 bg-navy-800/20">
                          <div className="flex items-center gap-2 mb-3">
                            <MessageSquare className="h-3.5 w-3.5 text-accent-cyan" />
                            <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider">Recent Chat Sessions</span>
                          </div>
                          <div className="space-y-1">
                            {statsData.recentSessions.map((s) => (
                              <div key={s.id} className="flex items-center gap-3 text-[10px] font-mono py-1">
                                <span className="text-navy-300 flex-1 truncate">{s.title}</span>
                                <span className="text-navy-600 tabular-nums shrink-0">
                                  {new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recent Trades */}
                      {statsData.recentTrades.length > 0 && (
                        <div className="border border-navy-700/40 rounded-lg p-4 bg-navy-800/20">
                          <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="h-3.5 w-3.5 text-accent-emerald" />
                            <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider">Recent Trades</span>
                          </div>
                          <div className="space-y-1">
                            {statsData.recentTrades.map((t) => (
                              <div key={t.id} className="flex items-center gap-3 text-[10px] font-mono py-1">
                                <span className={`w-8 uppercase ${t.direction === "BUY" ? "text-accent-emerald" : "text-accent-rose"}`}>
                                  {t.direction === "BUY" ? (
                                    <span className="flex items-center gap-0.5"><ArrowUpRight className="h-2.5 w-2.5" />Buy</span>
                                  ) : (
                                    <span className="flex items-center gap-0.5"><ArrowDownRight className="h-2.5 w-2.5" />Sell</span>
                                  )}
                                </span>
                                <span className="text-navy-200 w-16">{t.ticker}</span>
                                <span className="text-navy-500 tabular-nums">{t.quantity}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                  t.status === "filled" ? "bg-accent-emerald/15 text-accent-emerald" :
                                  t.status === "rejected" ? "bg-accent-rose/15 text-accent-rose" :
                                  "bg-navy-700 text-navy-400"
                                }`}>{t.status}</span>
                                <span className="text-[9px] px-1 py-0.5 rounded bg-navy-800 text-navy-500 uppercase">{t.environment}</span>
                                <span className="text-navy-600 tabular-nums ml-auto shrink-0">
                                  {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Support Tickets */}
                      {statsData.supportTickets.length > 0 && (
                        <div className="border border-navy-700/40 rounded-lg p-4 bg-navy-800/20">
                          <div className="flex items-center gap-2 mb-3">
                            <MessageSquare className="h-3.5 w-3.5 text-accent-amber" />
                            <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider">Support Tickets</span>
                          </div>
                          <div className="space-y-1">
                            {statsData.supportTickets.map((t) => (
                              <div key={t.id} className="flex items-center gap-3 text-[10px] font-mono py-1">
                                <span className="text-navy-300 flex-1 truncate">{t.title}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                  t.status === "open" ? "bg-accent-amber/15 text-accent-amber" :
                                  t.status === "resolved" ? "bg-accent-emerald/15 text-accent-emerald" :
                                  "bg-navy-700 text-navy-400"
                                }`}>{t.status}</span>
                                <span className="text-navy-600 tabular-nums shrink-0">
                                  {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recent Credit Ledger */}
                      {statsData.recentLedger.length > 0 && (
                        <div className="border border-navy-700/40 rounded-lg p-4 bg-navy-800/20">
                          <div className="flex items-center gap-2 mb-3">
                            <Clock className="h-3.5 w-3.5 text-navy-500" />
                            <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider">Recent Activity Log</span>
                          </div>
                          <div className="space-y-0.5 max-h-48 overflow-y-auto">
                            {statsData.recentLedger.map((entry) => (
                              <div key={entry.id} className="flex items-center gap-2 text-[9px] font-mono py-0.5">
                                <span className="text-accent-rose tabular-nums w-14 text-right">{entry.amount}</span>
                                <span className="text-navy-500 w-20 truncate">{entry.reason}</span>
                                <span className="text-navy-600 truncate flex-1">
                                  {(entry.model || "").replace("claude-", "").replace(/-\d{8}$/, "")}
                                </span>
                                <span className="text-navy-600 tabular-nums shrink-0">
                                  {new Date(entry.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Empty state */}
                      {!statsData.creditBalance && statsData.recentSessions.length === 0 && statsData.recentTrades.length === 0 && (
                        <div className="border border-navy-700/30 border-dashed rounded-lg p-8 text-center">
                          <Activity className="h-6 w-6 text-navy-600 mx-auto mb-2 opacity-40" />
                          <p className="text-[11px] text-navy-500">No activity recorded for this user</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="border border-navy-700/30 border-dashed rounded-lg p-8 text-center">
                      <XCircle className="h-6 w-6 text-accent-rose/40 mx-auto mb-2" />
                      <p className="text-[11px] text-navy-500">Failed to load stats</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Transactions Modal */}
          {txModal && (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => { setTxModal(null); setRefundConfirm(null); }}>
              <div
                className="bg-navy-900 border border-navy-700 rounded-lg w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-3 border-b border-navy-700 shrink-0">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-3.5 w-3.5 text-accent-amber" />
                    <span className="text-[11px] font-mono uppercase tracking-wider text-navy-200">Transactions</span>
                    <span className="text-[11px] font-mono text-accent-cyan">{txModal}</span>
                  </div>
                  <button onClick={() => { setTxModal(null); setRefundConfirm(null); }} className="text-navy-500 hover:text-navy-300">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
                  {txLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : txData ? (
                    <>
                      {/* Summary */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="border border-navy-700/40 rounded-lg p-3 bg-navy-800/20">
                          <div className="text-[9px] font-mono text-navy-500 uppercase tracking-wider mb-1">Total Paid</div>
                          <div className="text-lg font-mono text-accent-emerald tabular-nums">
                            {(txData.totalPaid / 100).toLocaleString("en-US", { style: "currency", currency: "usd" })}
                          </div>
                        </div>
                        <div className="border border-navy-700/40 rounded-lg p-3 bg-navy-800/20">
                          <div className="text-[9px] font-mono text-navy-500 uppercase tracking-wider mb-1">Total Refunded</div>
                          <div className="text-lg font-mono text-accent-rose tabular-nums">
                            {(txData.totalRefunded / 100).toLocaleString("en-US", { style: "currency", currency: "usd" })}
                          </div>
                        </div>
                        <div className="border border-navy-700/40 rounded-lg p-3 bg-navy-800/20">
                          <div className="text-[9px] font-mono text-navy-500 uppercase tracking-wider mb-1">Transactions</div>
                          <div className="text-lg font-mono text-navy-200 tabular-nums">{txData.transactions.length}</div>
                        </div>
                      </div>

                      {/* Refund Confirmation */}
                      {refundConfirm && (
                        <div className="border border-accent-rose/30 rounded-lg p-4 bg-accent-rose/[0.03] space-y-3">
                          <div className="flex items-center gap-2">
                            <RotateCcw className="h-3.5 w-3.5 text-accent-rose" />
                            <span className="text-[11px] font-mono text-accent-rose uppercase tracking-wider">Confirm Refund</span>
                          </div>
                          <p className="text-[11px] text-navy-300">
                            Refunding: {refundConfirm.description} ({(refundConfirm.amount / 100).toLocaleString("en-US", { style: "currency", currency: "usd" })})
                          </p>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-mono text-navy-500 uppercase tracking-wider block mb-1">Amount (leave blank for full)</label>
                              <input
                                value={refundAmount}
                                onChange={(e) => setRefundAmount(e.target.value)}
                                placeholder={`${(refundConfirm.amount / 100).toFixed(2)} (full)`}
                                className="w-full h-8 px-3 rounded bg-navy-900/50 border border-navy-700/50 text-[11px] font-mono text-navy-300 placeholder:text-navy-600 focus:outline-none focus:border-navy-600"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-mono text-navy-500 uppercase tracking-wider block mb-1">Reason</label>
                              <select
                                value={refundReason}
                                onChange={(e) => setRefundReason(e.target.value)}
                                className="w-full h-8 px-3 rounded bg-navy-900/50 border border-navy-700/50 text-[11px] font-mono text-navy-300 focus:outline-none focus:border-navy-600"
                              >
                                <option value="requested_by_customer">Requested by customer</option>
                                <option value="duplicate">Duplicate charge</option>
                                <option value="fraudulent">Fraudulent</option>
                              </select>
                            </div>
                          </div>

                          {refundError && (
                            <div className="text-[11px] font-mono text-accent-rose bg-accent-rose/10 px-3 py-2 rounded border border-accent-rose/20">
                              {refundError}
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => { setRefundConfirm(null); setRefundAmount(""); setRefundError(null); }}>
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={issueRefund}
                              disabled={refunding === refundConfirm.txId}
                              className="bg-accent-rose/15 text-accent-rose border-accent-rose/25 hover:bg-accent-rose/25"
                            >
                              {refunding === refundConfirm.txId ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <RotateCcw className="h-3 w-3 mr-1" />
                              )}
                              Process Refund
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Transaction List */}
                      {txData.transactions.length > 0 ? (
                        <div className="border border-navy-700/40 rounded-lg overflow-hidden">
                          <table className="w-full text-[11px] font-mono">
                            <thead>
                              <tr className="border-b border-navy-700/40 bg-navy-800/30">
                                <th className="text-left px-3 py-2 text-[9px] text-navy-500 uppercase tracking-wider">Date</th>
                                <th className="text-left px-3 py-2 text-[9px] text-navy-500 uppercase tracking-wider">Description</th>
                                <th className="text-right px-3 py-2 text-[9px] text-navy-500 uppercase tracking-wider">Amount</th>
                                <th className="text-center px-3 py-2 text-[9px] text-navy-500 uppercase tracking-wider">Status</th>
                                <th className="text-right px-3 py-2 text-[9px] text-navy-500 uppercase tracking-wider">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {txData.transactions.map((tx) => (
                                <tr key={tx.id} className="border-b border-navy-700/20 hover:bg-navy-800/20">
                                  <td className="px-3 py-2.5 text-navy-400 tabular-nums whitespace-nowrap">
                                    {new Date(tx.created * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                  </td>
                                  <td className="px-3 py-2.5 text-navy-300 truncate max-w-[250px]">
                                    {tx.description}
                                  </td>
                                  <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">
                                    <span className={tx.amount > 0 ? "text-accent-emerald" : "text-navy-500"}>
                                      {(tx.amount / 100).toLocaleString("en-US", { style: "currency", currency: tx.currency })}
                                    </span>
                                    {tx.refundedAmount > 0 && (
                                      <span className="text-accent-rose ml-1.5 text-[9px]">
                                        -{(tx.refundedAmount / 100).toLocaleString("en-US", { style: "currency", currency: tx.currency })}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 text-center">
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                      tx.status === "paid" || tx.status === "succeeded" ? "bg-accent-emerald/15 text-accent-emerald" :
                                      tx.status === "open" || tx.status === "draft" ? "bg-accent-amber/15 text-accent-amber" :
                                      tx.status === "void" || tx.status === "uncollectible" ? "bg-accent-rose/15 text-accent-rose" :
                                      "bg-navy-700 text-navy-400"
                                    }`}>
                                      {tx.status}
                                    </span>
                                    {tx.refunded && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-rose/10 text-accent-rose ml-1 uppercase">
                                        {tx.refunded === "full" ? "refunded" : "partial refund"}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      {tx.invoiceUrl && (
                                        <a
                                          href={tx.invoiceUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-navy-500 hover:text-accent-cyan transition-colors p-1"
                                          title="View invoice"
                                        >
                                          <FileText className="h-3 w-3" />
                                        </a>
                                      )}
                                      {(tx.status === "paid" || tx.status === "succeeded") && tx.refunded !== "full" && (tx.chargeId || tx.paymentIntentId) && (
                                        <button
                                          onClick={() => {
                                            setRefundConfirm({
                                              txId: tx.id,
                                              chargeId: tx.chargeId,
                                              paymentIntentId: tx.paymentIntentId,
                                              amount: tx.amount - tx.refundedAmount,
                                              description: tx.description,
                                            });
                                            setRefundAmount("");
                                            setRefundError(null);
                                          }}
                                          className="text-navy-500 hover:text-accent-rose transition-colors p-1"
                                          title="Refund"
                                        >
                                          <RotateCcw className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="border border-navy-700/30 border-dashed rounded-lg p-8 text-center">
                          <CreditCard className="h-6 w-6 text-navy-600 mx-auto mb-2 opacity-40" />
                          <p className="text-[11px] text-navy-500">No transactions found for this user</p>
                        </div>
                      )}

                      {/* Stripe Customer Link */}
                      {txData.stripeCustomerId && (
                        <div className="text-[9px] font-mono text-navy-600 text-right">
                          Stripe Customer: {txData.stripeCustomerId}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="border border-navy-700/30 border-dashed rounded-lg p-8 text-center">
                      <XCircle className="h-6 w-6 text-accent-rose/40 mx-auto mb-2" />
                      <p className="text-[11px] text-navy-500">Failed to load transactions</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Create User Modal */}
          {createModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setCreateModal(false)}>
              <div
                className="bg-navy-900 border border-navy-700 rounded-lg w-full max-w-md overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-3 border-b border-navy-700">
                  <div className="flex items-center gap-2">
                    <Plus className="h-3.5 w-3.5 text-accent-cyan" />
                    <span className="text-[11px] font-mono uppercase tracking-wider text-navy-200">Create User</span>
                  </div>
                  <button onClick={() => setCreateModal(false)} className="text-navy-500 hover:text-navy-300">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                  {createError && (
                    <div className="px-3 py-2 rounded bg-accent-rose/10 border border-accent-rose/20 text-[11px] font-mono text-accent-rose">
                      {createError}
                    </div>
                  )}

                  {/* Username */}
                  <div>
                    <label className="text-[10px] font-mono text-navy-500 uppercase tracking-wider block mb-1">Username</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-navy-600" />
                      <input
                        value={createForm.username}
                        onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                        placeholder="3-32 chars, letters/numbers/underscores"
                        className="w-full h-8 pl-8 pr-3 rounded bg-navy-900/50 border border-navy-700/50 text-[11px] font-mono text-navy-300 placeholder:text-navy-600 focus:outline-none focus:border-navy-600"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="text-[10px] font-mono text-navy-500 uppercase tracking-wider block mb-1">Password</label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-navy-600" />
                      <input
                        type="password"
                        value={createForm.password}
                        onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                        placeholder="Minimum 10 characters"
                        className="w-full h-8 pl-8 pr-3 rounded bg-navy-900/50 border border-navy-700/50 text-[11px] font-mono text-navy-300 placeholder:text-navy-600 focus:outline-none focus:border-navy-600"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-[10px] font-mono text-navy-500 uppercase tracking-wider block mb-1">Email (optional)</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-navy-600" />
                      <input
                        value={createForm.email}
                        onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                        placeholder="user@example.com"
                        className="w-full h-8 pl-8 pr-3 rounded bg-navy-900/50 border border-navy-700/50 text-[11px] font-mono text-navy-300 placeholder:text-navy-600 focus:outline-none focus:border-navy-600"
                      />
                    </div>
                  </div>

                  {/* Role */}
                  <div>
                    <label className="text-[10px] font-mono text-navy-500 uppercase tracking-wider block mb-2">Role</label>
                    <div className="grid grid-cols-2 gap-2">
                      {["user", "admin"].map((r) => (
                        <button
                          key={r}
                          onClick={() => setCreateForm({ ...createForm, role: r })}
                          className={`px-3 py-2 rounded border text-[11px] font-mono uppercase tracking-wider transition-all ${
                            createForm.role === r
                              ? "border-accent-cyan/50 bg-accent-cyan/10 text-accent-cyan"
                              : "border-navy-700/40 text-navy-500 hover:text-navy-300 hover:border-navy-700"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tier */}
                  <div>
                    <label className="text-[10px] font-mono text-navy-500 uppercase tracking-wider block mb-2">Tier</label>
                    <div className="grid grid-cols-4 gap-2">
                      {["free", "analyst", "operator", "institution"].map((t) => (
                        <button
                          key={t}
                          onClick={() => setCreateForm({ ...createForm, tier: t })}
                          className={`px-2 py-2 rounded border text-[10px] font-mono uppercase tracking-wider transition-all ${
                            createForm.tier === t
                              ? "border-accent-cyan/50 bg-accent-cyan/10 text-accent-cyan"
                              : "border-navy-700/40 text-navy-500 hover:text-navy-300 hover:border-navy-700"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-navy-700">
                  <Button variant="ghost" size="sm" onClick={() => setCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={saveCreateUser} disabled={createSaving}>
                    {createSaving ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Plus className="h-3 w-3 mr-1" />
                    )}
                    Create User
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Tabs.Content>
        {/* Growth Tab */}
        <Tabs.Content value="growth">
          <GrowthPanel
            data={growth}
            loading={growthLoading}
            onLoad={() => {
              if (!growth && !growthLoading) fetchGrowth();
            }}
          />
        </Tabs.Content>
        {/* Soul Documents (Prompts) Tab */}
        <Tabs.Content value="prompts">
          <div className="max-w-4xl">
            <div className="border border-accent-rose/20 rounded-lg bg-accent-rose/[0.03] p-4 mb-6">
              <div className="flex items-start gap-2.5">
                <Shield className="h-4 w-4 text-accent-rose mt-0.5 shrink-0" />
                <div>
                  <span className="text-[11px] font-semibold text-accent-rose uppercase tracking-wider">Proprietary</span>
                  <p className="text-[11px] text-navy-400 mt-1 leading-relaxed">
                    These are the core soul documents that define how NEXUS thinks, analyzes, and generates intelligence.
                    Changes take effect immediately on next use. Admin access only.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono text-navy-500 uppercase tracking-widest">
                {prompts.length} registered prompts
              </span>
              {prompts.filter((p) => p.isOverridden).length > 0 && (
                <span className="text-[10px] font-mono text-accent-amber">
                  {prompts.filter((p) => p.isOverridden).length} modified from defaults
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
        {/* Emails Tab */}
        <Tabs.Content value="emails">
          <EmailPanel />
        </Tabs.Content>
        {/* Support Tab */}
        <Tabs.Content value="support">
          <SupportPanel />
        </Tabs.Content>
        {/* Analytics Tab */}
        <Tabs.Content value="analytics">
          <AnalyticsPanel
            analytics={analytics}
            loading={analyticsLoading}
            days={analyticsDays}
            onChangeDays={(d) => {
              setAnalyticsDays(d);
              fetchAnalytics(d);
            }}
            onLoad={() => {
              if (!analytics && !analyticsLoading) fetchAnalytics(analyticsDays);
              if (!excludedIPsLoaded) fetchExcludedIPs();
            }}
          />

          {/* IP Exclusion Manager */}
          <div className="mt-6 border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-3.5 w-3.5 text-accent-rose opacity-60" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Excluded IPs</span>
            </div>
            <p className="text-[10px] text-navy-600 mb-3">
              Traffic from these IPs will not be tracked. Supports exact IPs, wildcards (192.168.1.*), and CIDR notation (/24, /16).
            </p>

            <div className="flex items-center gap-2 mb-3">
              <input
                value={newIP}
                onChange={(e) => setNewIP(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addExcludedIP(); }}
                placeholder="e.g. 203.0.113.45 or 192.168.1.0/24"
                className="flex-1 h-8 px-3 rounded bg-navy-900/50 border border-navy-700/50 text-[11px] font-mono text-navy-300 placeholder:text-navy-600 focus:outline-none focus:border-navy-600"
              />
              <Button size="sm" onClick={addExcludedIP} disabled={ipSaving || !newIP.trim()}>
                {ipSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                Add
              </Button>
            </div>

            {excludedIPs.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {excludedIPs.map((ip) => (
                  <div
                    key={ip}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-navy-700/40 bg-navy-800/40"
                  >
                    <span className="text-[11px] font-mono text-navy-300">{ip}</span>
                    <button
                      onClick={() => removeExcludedIP(ip)}
                      className="text-navy-600 hover:text-accent-rose transition-colors"
                      disabled={ipSaving}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-navy-600 font-mono">No IPs excluded. All traffic is being tracked.</p>
            )}
          </div>
        </Tabs.Content>

        {/* Analysts Tab */}
        <Tabs.Content value="scheduler">
          <SchedulerPanel />
        </Tabs.Content>

        <Tabs.Content value="analysts">
          <AnalystProfilesPanel />
        </Tabs.Content>

        {/* Base Rates Tab */}
        <Tabs.Content value="base-rates">
          <BaseRatesPanel />
        </Tabs.Content>

        <Tabs.Content value="og-tester">
          <OGTesterPanel />
        </Tabs.Content>

        <Tabs.Content value="integrations">
          <IntegrationsPanel />
        </Tabs.Content>
      </Tabs.Root>
      {/* Confirm Modal */}
      <ConfirmModal state={confirmModal} onClose={closeConfirm} />

      {/* Impersonate Error Toast */}
      {impersonateError && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border border-accent-rose/30 bg-navy-900/95 backdrop-blur-md px-4 py-3 shadow-2xl">
          <XCircle className="h-4 w-4 text-accent-rose flex-shrink-0" />
          <span className="text-xs text-accent-rose">{impersonateError}</span>
          <button
            onClick={() => setImpersonateError(null)}
            className="text-navy-500 hover:text-navy-300 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </PageContainer>
  );
}
