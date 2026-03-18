"use client";

import { useState, useEffect } from "react";
import { Coins, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CostMonitorPanel() {
  const [data, setData] = useState<{
    credits: { today: number; week: number; month: number; total: number; transactions: number };
    estimatedCosts: { today: number; week: number; month: number };
    dailyBreakdown: Array<{ date: string; credits: number; transactions: number; cost: number }>;
    usage: { chatSessions: { total: number; today: number; week: number }; predictions: { total: number; today: number; week: number } };
    thresholds: Record<string, number>;
    alerts: Array<{ level: "warning" | "critical"; message: string; metric: string; value: number; threshold: number }>;
    hasAlerts: boolean;
    highestAlertLevel: string;
    neon?: {
      database: { sizeBytes: number; sizeGB: number; sizeMB: number };
      tables: Array<{ name: string; totalMB: number; dataMB: number; indexMB: number; rows: number }>;
      connections: number;
      estimatedMonthlyCost: { storage: number; history: number; compute: number; total: number; minimum: number };
      pricing: { storagePerGB: number; historyPerGB: number; computePerCUHour: number; computeCUs: number; computeHoursPerMonth: number };
    };
    voyage?: {
      period: string;
      tokens: number;
      calls: number;
      texts: number;
      estimatedCost: number;
      pricePerMTok: number;
      knowledgeEntries: number;
      embeddedEntries: number;
    };
    vercel?: {
      plan: string;
      baseCost: number;
      estimatedInvocations: number;
      invocationOverageCost: number;
      estimatedBandwidthGB: number;
      bandwidthOverageCost: number;
      estimatedTotal: number;
      chatMessages: number;
      analyticsEvents: number;
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/costs")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-12 text-center"><Loader2 className="h-4 w-4 animate-spin inline-block text-navy-500" /></div>;
  if (!data) return <div className="py-12 text-center text-xs text-navy-500">Failed to load cost data</div>;

  const alertBorder = data.highestAlertLevel === "critical" ? "border-accent-rose/40" : data.highestAlertLevel === "warning" ? "border-accent-amber/40" : "border-navy-700/40";

  return (
    <div className="space-y-4">
      {/* Alerts Banner */}
      {data.alerts.length > 0 && (
        <div className={`rounded-md border ${data.alerts.some(a => a.level === "critical") ? "border-accent-rose/40 bg-accent-rose/5" : "border-accent-amber/40 bg-accent-amber/5"} p-3`}>
          <div className="flex items-center gap-2 mb-2">
            <Shield className={`h-4 w-4 ${data.alerts.some(a => a.level === "critical") ? "text-accent-rose" : "text-accent-amber"}`} />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-navy-200">Cost Alerts</span>
          </div>
          <div className="space-y-1">
            {data.alerts.map((alert, i) => (
              <div key={i} className={`text-[11px] font-mono ${alert.level === "critical" ? "text-accent-rose" : "text-accent-amber"}`}>
                [{alert.level.toUpperCase()}] {alert.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cost Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`rounded-md border ${alertBorder} bg-navy-950 p-3`}>
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Today</div>
          <div className="text-lg font-bold font-mono text-navy-100">${data.estimatedCosts.today.toFixed(2)}</div>
          <div className="text-[10px] text-navy-500">{data.credits.today.toLocaleString()} credits</div>
        </div>
        <div className="rounded-md border border-navy-700/40 bg-navy-950 p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">This Week</div>
          <div className="text-lg font-bold font-mono text-navy-100">${data.estimatedCosts.week.toFixed(2)}</div>
          <div className="text-[10px] text-navy-500">{data.credits.week.toLocaleString()} credits</div>
        </div>
        <div className="rounded-md border border-navy-700/40 bg-navy-950 p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">This Month</div>
          <div className="text-lg font-bold font-mono text-accent-amber">${data.estimatedCosts.month.toFixed(2)}</div>
          <div className="text-[10px] text-navy-500">{data.credits.month.toLocaleString()} credits</div>
        </div>
        <div className="rounded-md border border-navy-700/40 bg-navy-950 p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">All Time</div>
          <div className="text-lg font-bold font-mono text-navy-100">{data.credits.total.toLocaleString()}</div>
          <div className="text-[10px] text-navy-500">{data.credits.transactions.toLocaleString()} transactions</div>
        </div>
      </div>

      {/* Usage Drivers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-md border border-navy-700/40 bg-navy-950 p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-2">Chat Sessions (AI Cost Driver)</div>
          <div className="grid grid-cols-3 gap-2">
            <div><div className="text-sm font-bold font-mono text-navy-100">{data.usage.chatSessions.today}</div><div className="text-[9px] text-navy-600">today</div></div>
            <div><div className="text-sm font-bold font-mono text-navy-100">{data.usage.chatSessions.week}</div><div className="text-[9px] text-navy-600">this week</div></div>
            <div><div className="text-sm font-bold font-mono text-navy-100">{data.usage.chatSessions.total}</div><div className="text-[9px] text-navy-600">total</div></div>
          </div>
        </div>
        <div className="rounded-md border border-navy-700/40 bg-navy-950 p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-2">Predictions (Generation + Resolution)</div>
          <div className="grid grid-cols-3 gap-2">
            <div><div className="text-sm font-bold font-mono text-navy-100">{data.usage.predictions.today}</div><div className="text-[9px] text-navy-600">today</div></div>
            <div><div className="text-sm font-bold font-mono text-navy-100">{data.usage.predictions.week}</div><div className="text-[9px] text-navy-600">this week</div></div>
            <div><div className="text-sm font-bold font-mono text-navy-100">{data.usage.predictions.total}</div><div className="text-[9px] text-navy-600">total</div></div>
          </div>
        </div>
      </div>

      {/* Daily Breakdown */}
      {data.dailyBreakdown.length > 0 && (
        <div className="rounded-md border border-navy-700/40 bg-navy-950 p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-2">Daily Breakdown (Last 7 Days)</div>
          <div className="space-y-1">
            {data.dailyBreakdown.map((day) => {
              const maxCredits = Math.max(...data.dailyBreakdown.map(d => d.credits), 1);
              return (
                <div key={day.date} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-navy-400 w-20">{day.date}</span>
                  <div className="flex-1 h-2 bg-navy-800 rounded-full overflow-hidden">
                    <div className="h-full bg-accent-cyan rounded-full" style={{ width: `${(day.credits / maxCredits) * 100}%` }} />
                  </div>
                  <span className="text-[10px] font-mono text-navy-400 w-20 text-right">{day.credits.toLocaleString()} cr</span>
                  <span className="text-[10px] font-mono text-navy-500 w-14 text-right">${day.cost.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Thresholds */}
      <div className="rounded-md border border-navy-700/40 bg-navy-950 p-3">
        <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-2">Alert Thresholds (Credits)</div>
        <div className="grid grid-cols-3 gap-3 text-[10px] font-mono">
          <div>
            <div className="text-navy-400 mb-1">Daily</div>
            <div className="text-accent-amber">{data.thresholds.dailyCreditWarning?.toLocaleString()} warn</div>
            <div className="text-accent-rose">{data.thresholds.dailyCreditCritical?.toLocaleString()} crit</div>
          </div>
          <div>
            <div className="text-navy-400 mb-1">Weekly</div>
            <div className="text-accent-amber">{data.thresholds.weeklyCreditWarning?.toLocaleString()} warn</div>
            <div className="text-accent-rose">{data.thresholds.weeklyCreditCritical?.toLocaleString()} crit</div>
          </div>
          <div>
            <div className="text-navy-400 mb-1">Monthly</div>
            <div className="text-accent-amber">{data.thresholds.monthlyCreditWarning?.toLocaleString()} warn</div>
            <div className="text-accent-rose">{data.thresholds.monthlyCreditCritical?.toLocaleString()} crit</div>
          </div>
        </div>
      </div>

      {/* ── Neon Database Costs ── */}
      {data.neon && (
        <>
          <div className="pt-4 border-t border-navy-800/60">
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-navy-500 mb-3">Neon Database</div>
          </div>

          {/* DB Overview + Estimated Monthly Cost */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-md border border-navy-700/40 bg-navy-950 p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">DB Size</div>
              <div className="text-lg font-bold font-mono text-navy-100">{data.neon.database.sizeMB} MB</div>
              <div className="text-[10px] text-navy-500">{data.neon.database.sizeGB} GB</div>
            </div>
            <div className="rounded-md border border-navy-700/40 bg-navy-950 p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Connections</div>
              <div className="text-lg font-bold font-mono text-navy-100">{data.neon.connections}</div>
              <div className="text-[10px] text-navy-500">active</div>
            </div>
            <div className="rounded-md border border-accent-cyan/20 bg-navy-950 p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Est. Monthly</div>
              <div className="text-lg font-bold font-mono text-accent-cyan">${data.neon.estimatedMonthlyCost.total.toFixed(2)}</div>
              <div className="text-[10px] text-navy-500">min ${data.neon.estimatedMonthlyCost.minimum}</div>
            </div>
            <div className="rounded-md border border-navy-700/40 bg-navy-950 p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Cost Breakdown</div>
              <div className="space-y-0.5 mt-1">
                <div className="flex justify-between text-[10px] font-mono"><span className="text-navy-400">Storage</span><span className="text-navy-300">${data.neon.estimatedMonthlyCost.storage.toFixed(2)}</span></div>
                <div className="flex justify-between text-[10px] font-mono"><span className="text-navy-400">History</span><span className="text-navy-300">${data.neon.estimatedMonthlyCost.history.toFixed(2)}</span></div>
                <div className="flex justify-between text-[10px] font-mono"><span className="text-navy-400">Compute</span><span className="text-navy-300">${data.neon.estimatedMonthlyCost.compute.toFixed(2)}</span></div>
              </div>
            </div>
          </div>

          {/* Table Sizes */}
          {data.neon.tables.length > 0 && (
            <div className="rounded-md border border-navy-700/40 bg-navy-950 p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-2">Top Tables by Size</div>
              <div className="space-y-1">
                {data.neon.tables.map((t) => {
                  const maxMB = Math.max(...data.neon!.tables.map(x => x.totalMB), 0.01);
                  return (
                    <div key={t.name} className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-navy-400 w-40 truncate" title={t.name}>{t.name}</span>
                      <div className="flex-1 h-2 bg-navy-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{
                          width: `${Math.max((t.totalMB / maxMB) * 100, 1)}%`,
                          background: t.totalMB > 10 ? "rgba(245,158,11,0.5)" : "rgba(6,182,212,0.4)",
                        }} />
                      </div>
                      <span className="text-[10px] font-mono text-navy-400 w-16 text-right">{t.totalMB} MB</span>
                      <span className="text-[10px] font-mono text-navy-600 w-20 text-right">{t.rows.toLocaleString()} rows</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pricing Reference */}
          <div className="rounded-md border border-navy-800/40 bg-navy-900/30 p-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-navy-600 mb-1">Neon Pricing Reference (Launch Tier)</div>
            <div className="flex flex-wrap gap-4 text-[10px] font-mono text-navy-500">
              <span>Storage: ${data.neon.pricing.storagePerGB}/GB-mo</span>
              <span>History: ${data.neon.pricing.historyPerGB}/GB-mo</span>
              <span>Compute: ${data.neon.pricing.computePerCUHour}/CU-hr</span>
              <span>CUs: {data.neon.pricing.computeCUs}</span>
              <span>Hours/mo: {data.neon.pricing.computeHoursPerMonth}</span>
            </div>
          </div>
        </>
      )}

      {/* ── Voyage AI Embeddings ── */}
      {data.voyage && (
        <>
          <div className="pt-4 border-t border-navy-800/60">
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-navy-500 mb-3">Voyage AI Embeddings</div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-md border border-navy-700/40 bg-navy-950 p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Tokens ({data.voyage.period})</div>
              <div className="text-lg font-bold font-mono text-navy-100">{data.voyage.tokens.toLocaleString()}</div>
              <div className="text-[10px] text-navy-500">{data.voyage.calls} API calls</div>
            </div>
            <div className="rounded-md border border-accent-cyan/20 bg-navy-950 p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Est. Cost</div>
              <div className="text-lg font-bold font-mono text-accent-cyan">${data.voyage.estimatedCost.toFixed(3)}</div>
              <div className="text-[10px] text-navy-500">${data.voyage.pricePerMTok}/MTok</div>
            </div>
            <div className="rounded-md border border-navy-700/40 bg-navy-950 p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Knowledge</div>
              <div className="text-lg font-bold font-mono text-navy-100">{data.voyage.knowledgeEntries}</div>
              <div className="text-[10px] text-navy-500">entries total</div>
            </div>
            <div className="rounded-md border border-navy-700/40 bg-navy-950 p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Embedded</div>
              <div className="text-lg font-bold font-mono text-accent-emerald">{data.voyage.embeddedEntries}</div>
              <div className="text-[10px] text-navy-500">{data.voyage.knowledgeEntries > 0 ? Math.round((data.voyage.embeddedEntries / data.voyage.knowledgeEntries) * 100) : 0}% coverage</div>
            </div>
          </div>
        </>
      )}

      {/* ── Vercel Hosting ── */}
      {data.vercel && (
        <>
          <div className="pt-4 border-t border-navy-800/60">
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-navy-500 mb-3">Vercel Hosting ({data.vercel.plan})</div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-md border border-navy-700/40 bg-navy-950 p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Base Plan</div>
              <div className="text-lg font-bold font-mono text-navy-100">${data.vercel.baseCost}</div>
              <div className="text-[10px] text-navy-500">/month</div>
            </div>
            <div className="rounded-md border border-navy-700/40 bg-navy-950 p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Invocations</div>
              <div className="text-lg font-bold font-mono text-navy-100">{(data.vercel.estimatedInvocations / 1000).toFixed(1)}k</div>
              <div className="text-[10px] text-navy-500">{data.vercel.invocationOverageCost > 0 ? `+$${data.vercel.invocationOverageCost} overage` : "within limit"}</div>
            </div>
            <div className="rounded-md border border-navy-700/40 bg-navy-950 p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Bandwidth</div>
              <div className="text-lg font-bold font-mono text-navy-100">{data.vercel.estimatedBandwidthGB} GB</div>
              <div className="text-[10px] text-navy-500">{data.vercel.bandwidthOverageCost > 0 ? `+$${data.vercel.bandwidthOverageCost} overage` : "within 1TB"}</div>
            </div>
            <div className="rounded-md border border-accent-cyan/20 bg-navy-950 p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Est. Total</div>
              <div className="text-lg font-bold font-mono text-accent-cyan">${data.vercel.estimatedTotal.toFixed(2)}</div>
              <div className="text-[10px] text-navy-500">/month</div>
            </div>
          </div>

          <div className="rounded-md border border-navy-800/40 bg-navy-900/30 p-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-navy-600 mb-1">Activity This Month</div>
            <div className="flex flex-wrap gap-4 text-[10px] font-mono text-navy-500">
              <span>Chat messages: {data.vercel.chatMessages.toLocaleString()}</span>
              <span>Analytics events: {data.vercel.analyticsEvents.toLocaleString()}</span>
              <span>Est. function calls: {data.vercel.estimatedInvocations.toLocaleString()}</span>
            </div>
          </div>
        </>
      )}

      {/* ── Monthly Total Estimate ── */}
      {data.neon && data.voyage && data.vercel && (
        <div className="pt-4 border-t border-navy-800/60">
          <div className="rounded-md border border-accent-amber/20 bg-accent-amber/5 p-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-accent-amber mb-2">Total Estimated Monthly Infrastructure</div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <div className="text-[10px] font-mono text-navy-400">Anthropic</div>
                <div className="text-sm font-bold font-mono text-navy-200">${data.estimatedCosts.month.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-navy-400">Neon</div>
                <div className="text-sm font-bold font-mono text-navy-200">${data.neon.estimatedMonthlyCost.total.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-navy-400">Voyage</div>
                <div className="text-sm font-bold font-mono text-navy-200">${data.voyage.estimatedCost.toFixed(3)}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-navy-400">Vercel</div>
                <div className="text-sm font-bold font-mono text-navy-200">${data.vercel.estimatedTotal.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-accent-amber">Total</div>
                <div className="text-lg font-bold font-mono text-accent-amber">
                  ${(data.estimatedCosts.month + data.neon.estimatedMonthlyCost.total + data.voyage.estimatedCost + data.vercel.estimatedTotal).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

