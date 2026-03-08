"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer } from "@/components/layout/page-container";
import {
  Check,
  Copy,
  DollarSign,
  MousePointerClick,
  Percent,
  RefreshCw,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

interface ReferralData {
  code: { code: string; commissionRate: number; clicks: number; isActive: number };
  stats: {
    totalSignups: number;
    totalSubscribed: number;
    conversionRate: number;
    totalEarned: number;
    pendingEarnings: number;
    totalClicks: number;
  };
  referrals: Array<{
    id: number;
    referredUser: string;
    status: string;
    subscribedAt: string | null;
    createdAt: string;
  }>;
  commissions: Array<{
    id: number;
    amount: number;
    currency: string;
    status: string;
    periodStart: string;
    periodEnd: string;
    paidAt: string | null;
    paymentMethod: string | null;
    createdAt: string;
  }>;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    signed_up: { bg: "bg-accent-amber/15", text: "text-accent-amber", label: "Signed Up" },
    subscribed: { bg: "bg-accent-emerald/15", text: "text-accent-emerald", label: "Subscribed" },
    churned: { bg: "bg-accent-rose/15", text: "text-accent-rose", label: "Churned" },
    pending: { bg: "bg-accent-amber/15", text: "text-accent-amber", label: "Pending" },
    approved: { bg: "bg-accent-sky/15", text: "text-accent-sky", label: "Approved" },
    paid: { bg: "bg-accent-emerald/15", text: "text-accent-emerald", label: "Paid" },
    rejected: { bg: "bg-accent-rose/15", text: "text-accent-rose", label: "Rejected" },
  };
  const c = config[status] || { bg: "bg-navy-800", text: "text-navy-400", label: status };
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <div className="border border-navy-700/40 rounded-lg p-4 bg-navy-900/30">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5 text-navy-500" />
        <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">{label}</span>
      </div>
      <div className="text-xl font-bold text-navy-100 font-mono">{value}</div>
      {sub && <div className="text-[10px] text-navy-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function formatDate(iso: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/referrals");
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // silent
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function getReferralLink() {
    if (!data) return "";
    return `${window.location.origin}/api/referrals/click?code=${data.code.code}`;
  }

  async function copyLink() {
    await navigator.clipboard.writeText(getReferralLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function regenerateCode() {
    setRegenerating(true);
    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenerate" }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch {
      // silent
    }
    setRegenerating(false);
  }

  if (loading) {
    return (
      <PageContainer title="Referrals" subtitle="Commission-based referral program">
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-5 w-5 text-navy-500 animate-spin" />
        </div>
      </PageContainer>
    );
  }

  if (!data) {
    return (
      <PageContainer title="Referrals" subtitle="Commission-based referral program">
        <div className="text-center py-20 text-navy-500 text-sm">Failed to load referral data. Please sign in.</div>
      </PageContainer>
    );
  }

  const { code, stats, referrals, commissions } = data;

  return (
    <PageContainer title="Referrals" subtitle="Earn recurring commission for every user you bring to the platform">
      {/* Referral Link */}
      <div className="border border-navy-700/40 rounded-lg p-5 bg-navy-900/30 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Your Referral Link</span>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="h-1.5 w-1.5 rounded-full bg-accent-emerald" />
              <span className="text-[10px] text-navy-400">Code: <span className="text-navy-200 font-mono">{code.code}</span></span>
            </div>
          </div>
          <button
            onClick={regenerateCode}
            disabled={regenerating}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-navy-700/40 text-[10px] font-mono uppercase tracking-wider text-navy-400 hover:text-navy-200 hover:border-navy-600/60 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${regenerating ? "animate-spin" : ""}`} />
            Regenerate
          </button>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 bg-navy-950/60 border border-navy-700/30 rounded px-3 py-2.5 font-mono text-xs text-navy-300 truncate select-all">
            {typeof window !== "undefined" ? getReferralLink() : `[your-domain]/api/referrals/click?code=${code.code}`}
          </div>
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] hover:border-white/[0.15] text-[11px] font-mono uppercase tracking-widest text-navy-100 transition-all"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-accent-emerald" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard icon={MousePointerClick} label="Clicks" value={stats.totalClicks.toLocaleString()} />
        <StatCard icon={UserPlus} label="Signups" value={stats.totalSignups.toLocaleString()} />
        <StatCard icon={UserCheck} label="Subscribed" value={stats.totalSubscribed.toLocaleString()} />
        <StatCard icon={Percent} label="Conversion" value={`${stats.conversionRate}%`} sub="signup to subscription" />
        <StatCard icon={Wallet} label="Pending" value={formatMoney(stats.pendingEarnings)} sub="awaiting payout" />
        <StatCard icon={DollarSign} label="Total Earned" value={formatMoney(stats.totalEarned)} sub="all time" />
      </div>

      {/* Commission Plan Card */}
      <div className="border border-accent-emerald/20 rounded-lg p-5 bg-accent-emerald/[0.04] mb-6">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-lg bg-accent-emerald/10 border border-accent-emerald/20">
            <DollarSign className="h-5 w-5 text-accent-emerald" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-navy-100 mb-1">Commission Plan</h3>
            <p className="text-xs text-navy-400 font-sans leading-relaxed mb-3">
              Earn <span className="text-accent-emerald font-mono font-bold">{Math.round(code.commissionRate * 100)}% recurring</span> commission
              on every subscription payment made by users you refer. Commission is calculated monthly and paid out on approval.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="border border-navy-700/30 rounded p-3 bg-navy-950/40">
                <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-1">Step 1</div>
                <div className="text-xs text-navy-300 font-sans">Share your referral link</div>
              </div>
              <div className="border border-navy-700/30 rounded p-3 bg-navy-950/40">
                <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-1">Step 2</div>
                <div className="text-xs text-navy-300 font-sans">User signs up and subscribes</div>
              </div>
              <div className="border border-navy-700/30 rounded p-3 bg-navy-950/40">
                <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-1">Step 3</div>
                <div className="text-xs text-navy-300 font-sans">You earn {Math.round(code.commissionRate * 100)}% of their payments</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column: Referrals + Commissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Referrals Table */}
        <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 overflow-hidden">
          <div className="px-4 py-3 border-b border-navy-700/40 flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-navy-500" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-navy-400">Referred Users</span>
            <span className="ml-auto text-[10px] font-mono text-navy-600">{referrals.length}</span>
          </div>

          {referrals.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <UserPlus className="h-6 w-6 text-navy-700 mx-auto mb-2" />
              <p className="text-xs text-navy-500 font-sans">No referrals yet. Share your link to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-navy-700/30">
              {referrals.map((r) => (
                <div key={r.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-navy-200 font-mono">{r.referredUser}</div>
                    <div className="text-[10px] text-navy-500 mt-0.5">{formatDate(r.createdAt)}</div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Commissions Table */}
        <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 overflow-hidden">
          <div className="px-4 py-3 border-b border-navy-700/40 flex items-center gap-2">
            <DollarSign className="h-3.5 w-3.5 text-navy-500" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-navy-400">Commission History</span>
            <span className="ml-auto text-[10px] font-mono text-navy-600">{commissions.length}</span>
          </div>

          {commissions.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Wallet className="h-6 w-6 text-navy-700 mx-auto mb-2" />
              <p className="text-xs text-navy-500 font-sans">No commissions yet. They appear when referred users subscribe.</p>
            </div>
          ) : (
            <div className="divide-y divide-navy-700/30">
              {commissions.map((c) => (
                <div key={c.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-navy-100 font-mono font-bold">{formatMoney(c.amount)}</div>
                    <div className="text-[10px] text-navy-500 mt-0.5">
                      {formatDate(c.periodStart)} - {formatDate(c.periodEnd)}
                      {c.paymentMethod && (
                        <span className="ml-2 text-navy-600">via {c.paymentMethod}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={c.status} />
                    {c.paidAt && (
                      <div className="text-[10px] text-navy-600 mt-0.5">{formatDate(c.paidAt)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
