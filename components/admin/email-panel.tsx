"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Send, Mail, RefreshCw, ChevronDown, ChevronRight, Eye, CheckCircle2, XCircle, X } from "lucide-react";

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


export function EmailPanel() {
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
