"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer } from "@/components/layout/page-container";
import {
  Check,
  Copy,
  DollarSign,
  ExternalLink,
  Loader2,
  MousePointerClick,
  Percent,
  RefreshCw,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  Zap,
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

interface ConnectStatus {
  status: "active" | "incomplete" | "created" | "none";
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  onboardingUrl?: string;
  accountId?: string;
}

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [payoutMessage, setPayoutMessage] = useState<string | null>(null);
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState("paypal");
  const [payoutDetails, setPayoutDetails] = useState("");
  const [connect, setConnect] = useState<ConnectStatus | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);

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

  const fetchConnect = useCallback(async () => {
    try {
      const res = await fetch("/api/referrals/connect");
      if (res.ok) {
        setConnect(await res.json());
      } else {
        const err = await res.json().catch(() => null);
        console.warn("Connect status fetch failed:", err?.error || res.status);
        setConnect({ status: "none", payoutsEnabled: false, detailsSubmitted: false });
      }
    } catch {
      setConnect({ status: "none", payoutsEnabled: false, detailsSubmitted: false });
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchConnect();
  }, [fetchData, fetchConnect]);

  function getReferralLink() {
    if (!data) return "";
    return `${window.location.origin}/r/${data.code.code}`;
  }

  async function copyLink() {
    await navigator.clipboard.writeText(getReferralLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function requestPayout() {
    if (!payoutDetails.trim()) return;
    setRequestingPayout(true);
    setPayoutMessage(null);
    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request_payout",
          paymentMethod: payoutMethod,
          paymentDetails: `${payoutMethod}: ${payoutDetails}`,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        setPayoutMessage(`Payout requested: ${result.approved} commission(s) totaling ${formatMoney(result.totalAmount)} approved for review.`);
        setShowPayoutForm(false);
        setPayoutDetails("");
        await fetchData();
      } else {
        setPayoutMessage(result.error || "Payout request failed");
      }
    } catch {
      setPayoutMessage("Payout request failed");
    }
    setRequestingPayout(false);
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

      {/* Payout Setup - Stripe Connect */}
      <div className={`border rounded-lg p-5 mb-6 ${connect?.payoutsEnabled ? "border-accent-emerald/20 bg-accent-emerald/[0.03]" : "border-accent-cyan/20 bg-accent-cyan/[0.03]"}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-4 w-4 text-navy-400" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Automatic Payouts</span>
            </div>
            {connect?.payoutsEnabled ? (
              <>
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-2 w-2 rounded-full bg-accent-emerald animate-pulse" />
                  <span className="text-sm text-navy-200">Payouts active</span>
                </div>
                <p className="text-[11px] text-navy-400 mt-1">
                  Commissions are automatically sent to your bank every time a referred user pays. No action needed.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-navy-200 mt-1">Connect your bank to receive automatic payouts</p>
                <p className="text-[11px] text-navy-500 mt-0.5">
                  Every month your referred users pay, {Math.round(code.commissionRate * 100)}% is transferred directly to your account via Stripe.
                </p>
              </>
            )}
          </div>
          <div className="shrink-0">
            {connect?.payoutsEnabled ? (
              <button
                onClick={async () => {
                  const res = await fetch("/api/referrals/connect", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "dashboard" }),
                  });
                  const data = await res.json();
                  if (data.url) window.open(data.url, "_blank");
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded border border-navy-700/40 text-[10px] font-mono uppercase tracking-wider text-navy-400 hover:text-navy-200 hover:border-navy-600/60 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Stripe Dashboard
              </button>
            ) : (
              <button
                disabled={connectLoading}
                onClick={async () => {
                  setConnectLoading(true);
                  try {
                    // Use already-fetched onboarding URL if available
                    if (connect?.onboardingUrl) {
                      window.location.href = connect.onboardingUrl;
                      return;
                    }
                    // Otherwise fetch a fresh one
                    const res = await fetch("/api/referrals/connect");
                    const data = await res.json();
                    if (data.onboardingUrl) {
                      window.location.href = data.onboardingUrl;
                    } else if (data.error) {
                      setPayoutMessage(`Connect error: ${data.error}`);
                      setConnectLoading(false);
                    } else {
                      await fetchConnect();
                      setConnectLoading(false);
                    }
                  } catch {
                    setPayoutMessage("Failed to connect bank account. Please try again.");
                    setConnectLoading(false);
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded bg-accent-cyan/10 text-accent-cyan text-[11px] font-mono uppercase tracking-wider hover:bg-accent-cyan/20 transition-colors border border-accent-cyan/20 disabled:opacity-50"
              >
                {connectLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                Connect Bank Account
              </button>
            )}
          </div>
        </div>
        {payoutMessage && (
          <div className="mt-2 text-[11px] text-navy-300 font-sans">{payoutMessage}</div>
        )}
      </div>

      {/* Manual payout fallback for pending earnings without Connect */}
      {stats.pendingEarnings > 0 && !connect?.payoutsEnabled && (
        <div className="border border-navy-700/30 rounded-lg p-5 bg-navy-900/20 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500 block">Pending Earnings</span>
              <span className="text-lg font-mono font-bold text-navy-100">{formatMoney(stats.pendingEarnings)}</span>
              <p className="text-[10px] text-navy-500 mt-0.5">Connect your bank above to receive these automatically</p>
            </div>
            {!showPayoutForm ? (
              <button
                onClick={() => setShowPayoutForm(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded border border-navy-700/40 text-[10px] font-mono uppercase tracking-wider text-navy-400 hover:text-navy-200 transition-colors"
              >
                <Wallet className="h-3 w-3" />
                Manual Payout
              </button>
            ) : (
              <div className="flex gap-2">
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value)}
                  className="bg-navy-950/60 border border-navy-700/30 rounded px-3 py-2 text-xs text-navy-200 font-mono focus:outline-none focus:ring-1 focus:ring-accent-cyan/30"
                >
                  <option value="paypal">PayPal</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="crypto">Crypto Wallet</option>
                </select>
                <input
                  type="text"
                  value={payoutDetails}
                  onChange={(e) => setPayoutDetails(e.target.value)}
                  placeholder={payoutMethod === "paypal" ? "PayPal email..." : payoutMethod === "bank_transfer" ? "IBAN or account..." : "Wallet address..."}
                  className="bg-navy-950/60 border border-navy-700/30 rounded px-3 py-2 text-xs text-navy-200 font-mono placeholder:text-navy-600 focus:outline-none focus:ring-1 focus:ring-accent-cyan/30"
                />
                <button
                  onClick={requestPayout}
                  disabled={requestingPayout || !payoutDetails.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded bg-accent-emerald/10 text-accent-emerald text-[10px] font-mono uppercase tracking-wider hover:bg-accent-emerald/20 transition-colors border border-accent-emerald/20 disabled:opacity-50"
                >
                  {requestingPayout ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  Submit
                </button>
                <button onClick={() => setShowPayoutForm(false)} className="text-[10px] text-navy-500 hover:text-navy-300 px-2">Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}

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
              on every subscription payment made by users you refer. As long as they keep paying, you keep earning. Paid automatically each billing cycle.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="border border-navy-700/30 rounded p-3 bg-navy-950/40">
                <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-1">Step 1</div>
                <div className="text-xs text-navy-300 font-sans">Share your referral link</div>
              </div>
              <div className="border border-navy-700/30 rounded p-3 bg-navy-950/40">
                <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-1">Step 2</div>
                <div className="text-xs text-navy-300 font-sans">User signs up and pays</div>
              </div>
              <div className="border border-navy-700/30 rounded p-3 bg-navy-950/40">
                <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-1">Step 3</div>
                <div className="text-xs text-navy-300 font-sans">{Math.round(code.commissionRate * 100)}% hits your bank automatically</div>
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
