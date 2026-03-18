"use client";

import { Gift, TrendingUp, Users, Calendar, Coins, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { GrowthData } from "./types";

export function GrowthPanel({
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
            label: "Paid Subscribers",
            value: String(overview.paidSubscribers),
            sub: `${overview.compedSubscribers} comped, ${overview.pastDueSubscribers} past due`,
          },
          {
            label: "MRR (paid only)",
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

