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
  CheckCircle2,
  CreditCard,
  FlaskConical,
  Loader2,
  MessageSquare,
  Plus,
  Save,
  Send,
  Shield,
  Trash2,
  User,
  Users,
  X,
  ArrowRight,
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
  subscription: {
    status: string;
    stripeCustomerId: string | null;
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

const ADMIN_TABS = [
  { id: "tiers", label: "Subscription Tiers", icon: CreditCard },
  { id: "users", label: "Users", icon: Users },
  { id: "support", label: "Support", icon: MessageSquare },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

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
  }, [status, router, fetchTiers]);

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

      <Tabs.Root defaultValue="tiers">
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
                          <span className="text-xs text-navy-400">
                            {user.subscription
                              ? user.tier || "active"
                              : "Free"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {user.subscription ? (
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
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
