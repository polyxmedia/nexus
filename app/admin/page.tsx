"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import Link from "next/link";

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

interface UserRecord {
  username: string;
  role: string;
  tier: string;
  createdAt: string;
  email: string | null;
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

interface AnalyticsData {
  period: { days: number; since: string };
  totalViews: number;
  uniqueSessions: number;
  avgViewsPerSession: number;
  topPages: { path: string; views: number; uniqueVisitors: number }[];
  dailyViews: { date: string; views: number; unique: number }[];
  devices: { deviceType: string | null; count: number }[];
  referrers: { referrer: string | null; count: number }[];
  hourly: { hour: string; count: number }[];
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
        <Button variant="outline" size="sm" onClick={handleSave} disabled={saving || !form.name}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
          {tier.id ? "Save Changes" : "Create Tier"}
        </Button>
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
      if (data.success) {
        setSendResult({ ok: true, msg: "Test email sent" });
        fetchEmails();
      } else {
        setSendResult({ ok: false, msg: data.error || "Failed" });
      }
    } catch {
      setSendResult({ ok: false, msg: "Request failed" });
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
      <div className="grid grid-cols-4 gap-3">
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
        <div className="grid grid-cols-5 gap-2">
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
      <div className="space-y-4 max-w-4xl">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="border border-navy-700/50 border-dashed rounded p-8 text-center max-w-4xl">
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

  return (
    <div className="max-w-4xl space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-navy-400">
          Anonymous, cookieless usage analytics. No PII collected.
        </p>
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

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Views", value: analytics.totalViews.toLocaleString() },
          { label: "Unique Visitors", value: analytics.uniqueSessions.toLocaleString() },
          { label: "Avg Pages/Visit", value: String(analytics.avgViewsPerSession) },
        ].map((stat) => (
          <div
            key={stat.label}
            className="border border-navy-700/40 rounded-lg bg-navy-900/30 px-4 py-3"
          >
            <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-1">
              {stat.label}
            </div>
            <div className="text-xl font-mono font-bold text-navy-100 tabular-nums">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Daily views chart */}
      <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">
          Daily Pageviews
        </div>
        <div className="flex items-end gap-[2px] h-32">
          {analytics.dailyViews.map((day) => (
            <div
              key={day.date}
              className="flex-1 group relative"
            >
              <div
                className="w-full bg-accent-cyan/30 hover:bg-accent-cyan/50 transition-colors rounded-t-sm"
                style={{ height: `${(day.views / maxDailyViews) * 100}%`, minHeight: day.views > 0 ? 2 : 0 }}
              />
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                <div className="bg-navy-800 border border-navy-700 rounded px-2 py-1 text-[9px] font-mono text-navy-200 whitespace-nowrap shadow-lg">
                  {day.date}: {day.views} views, {day.unique} unique
                </div>
              </div>
            </div>
          ))}
        </div>
        {analytics.dailyViews.length > 0 && (
          <div className="flex justify-between mt-1.5">
            <span className="text-[9px] font-mono text-navy-600">
              {analytics.dailyViews[0]?.date}
            </span>
            <span className="text-[9px] font-mono text-navy-600">
              {analytics.dailyViews[analytics.dailyViews.length - 1]?.date}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Top Pages */}
        <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">
            Top Pages
          </div>
          <div className="space-y-1.5">
            {analytics.topPages.slice(0, 10).map((page) => (
              <div key={page.path} className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-navy-300 truncate flex-1">
                  {page.path}
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] font-mono text-navy-500 tabular-nums">
                    {page.uniqueVisitors} uniq
                  </span>
                  <span className="text-[10px] font-mono text-navy-200 tabular-nums w-12 text-right">
                    {page.views}
                  </span>
                </div>
              </div>
            ))}
            {analytics.topPages.length === 0 && (
              <p className="text-[10px] text-navy-600">No page data yet</p>
            )}
          </div>
        </div>

        {/* Device & Referrers */}
        <div className="space-y-3">
          {/* Devices */}
          <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">
              Devices
            </div>
            <div className="space-y-2">
              {analytics.devices.map((d) => {
                const pct = Math.round((d.count / totalDevices) * 100);
                return (
                  <div key={d.deviceType || "unknown"}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[11px] font-mono text-navy-300 capitalize">
                        {d.deviceType || "unknown"}
                      </span>
                      <span className="text-[10px] font-mono text-navy-500 tabular-nums">
                        {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-cyan/50 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Referrers */}
          <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">
              Referrers
            </div>
            <div className="space-y-1.5">
              {analytics.referrers.slice(0, 5).map((r) => (
                <div
                  key={r.referrer}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="text-[11px] font-mono text-navy-300 truncate flex-1">
                    {r.referrer || "Direct"}
                  </span>
                  <span className="text-[10px] font-mono text-navy-200 tabular-nums">
                    {r.count}
                  </span>
                </div>
              ))}
              {analytics.referrers.length === 0 && (
                <p className="text-[10px] text-navy-600">No referrer data</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hourly distribution */}
      <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">
          Hourly Distribution (UTC)
        </div>
        <div className="flex items-end gap-[3px] h-16">
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
                    {hour}:00 - {count} views
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[9px] font-mono text-navy-600">00:00</span>
          <span className="text-[9px] font-mono text-navy-600">12:00</span>
          <span className="text-[9px] font-mono text-navy-600">23:00</span>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showNewTier, setShowNewTier] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsDays, setAnalyticsDays] = useState(30);
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

      <Tabs.Root defaultValue="growth">
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
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-navy-400">
                Manage subscription tiers. Connect each tier to a Stripe Price ID for checkout.
              </p>
              <div className="flex items-center gap-2">
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
          <div className="max-w-3xl">
            <p className="text-[11px] text-navy-400 mb-4">
              Manage user roles and view subscription status.
            </p>

            {usersLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="border border-navy-700 rounded overflow-hidden">
                <table className="w-full text-left">
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
                      <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-widest text-navy-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr
                        key={user.username}
                        className="border-b border-navy-700/30 hover:bg-navy-800/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-navy-200">
                            {user.username}
                          </span>
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
                          <div className="flex items-center gap-2">
                            {user.role !== "admin" ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[10px]"
                                disabled={roleUpdating === user.username}
                                onClick={() => updateRole(user.username, "admin")}
                              >
                                {roleUpdating === user.username ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  "Make Admin"
                                )}
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[10px]"
                                disabled={
                                  roleUpdating === user.username ||
                                  user.username === session?.user?.name
                                }
                                onClick={() => updateRole(user.username, "user")}
                              >
                                {roleUpdating === user.username ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  "Remove Admin"
                                )}
                              </Button>
                            )}
                            {/* Grant / Revoke Access */}
                            {granting === user.username ? (
                              <Loader2 className="h-3 w-3 animate-spin text-navy-500" />
                            ) : user.subscription?.status === "active" &&
                              user.subscription?.stripeSubscriptionId?.startsWith("comped_") ? (
                              <div className="flex items-center gap-2">
                                {user.compedGrant?.expiresAt && user.compedGrant.expiresAt !== "2099-12-31T23:59:59.000Z" && (
                                  <span className={`text-[9px] font-mono tabular-nums ${
                                    new Date(user.compedGrant.expiresAt) < new Date() ? "text-accent-rose" : "text-accent-amber"
                                  }`}>
                                    {new Date(user.compedGrant.expiresAt) < new Date()
                                      ? "expired"
                                      : `expires ${new Date(user.compedGrant.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                                    }
                                  </span>
                                )}
                                {user.compedGrant?.note && (
                                  <span className="text-[9px] text-navy-500 max-w-[100px] truncate" title={user.compedGrant.note}>
                                    {user.compedGrant.note}
                                  </span>
                                )}
                                <button
                                  onClick={() => {
                                    setGrantModal(user.username);
                                    setGrantForm({
                                      tier: user.compedGrant?.tier || user.tier || "analyst",
                                      duration: "",
                                      note: user.compedGrant?.note || "",
                                    });
                                  }}
                                  className="text-[10px] font-mono text-accent-cyan hover:text-accent-cyan/80 transition-colors"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => revokeAccess(user.username)}
                                  className="text-[10px] font-mono text-accent-rose hover:text-accent-rose/80 transition-colors"
                                >
                                  Revoke
                                </button>
                              </div>
                            ) : !user.subscription || user.subscription.status !== "active" ? (
                              <button
                                onClick={() => {
                                  setGrantModal(user.username);
                                  setGrantForm({ tier: "analyst", duration: "30", note: "" });
                                }}
                                className="flex items-center gap-1 text-[10px] font-mono text-accent-cyan hover:text-accent-cyan/80 transition-colors"
                              >
                                <Gift className="h-3 w-3" />
                                Grant Access
                              </button>
                            ) : null}
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
            }}
          />
        </Tabs.Content>
      </Tabs.Root>
    </PageContainer>
  );
}
