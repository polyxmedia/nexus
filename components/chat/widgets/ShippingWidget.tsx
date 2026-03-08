"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Chokepoint {
  id: string;
  name: string;
  baselineDailyTransits: number;
  estimatedDailyTransits: number;
  transitDeltaPct: number;
  status: "normal" | "elevated" | "disrupted";
  riskFactors: string[];
  riskScore: number;
  commodities: { name: string; globalShare: string }[];
  annualTradeValue: string;
  recentArticles: { title: string; source: string }[];
}

interface TrafficAnomaly {
  id: string;
  chokepointName: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
}

interface DarkFleetAlert {
  id: string;
  description: string;
  source: string;
  confidence: number;
  commodities: string[];
}

interface FreightProxy {
  symbol: string;
  name: string;
  label: string;
  price: number;
  change: number;
  changePercent: number;
}

interface ShippingData {
  chokepoints?: Chokepoint[];
  anomalies?: TrafficAnomaly[];
  darkFleetAlerts?: DarkFleetAlert[];
  freightProxies?: FreightProxy[];
  oilPrice?: number | null;
  oilPriceChange?: number | null;
  overallRiskScore?: number;
  error?: string;
}

// ── Helpers ──

function statusColor(status: string): string {
  if (status === "disrupted") return "text-accent-rose";
  if (status === "elevated") return "text-accent-amber";
  return "text-accent-emerald";
}

function statusBg(status: string): string {
  if (status === "disrupted") return "bg-accent-rose/10 border-accent-rose/20";
  if (status === "elevated") return "bg-accent-amber/10 border-accent-amber/20";
  return "bg-accent-emerald/10 border-accent-emerald/20";
}

function severityColor(severity: string): string {
  if (severity === "critical") return "text-accent-rose";
  if (severity === "high") return "text-accent-rose/80";
  if (severity === "medium") return "text-accent-amber";
  return "text-navy-400";
}

function riskBar(score: number): string {
  if (score >= 60) return "bg-accent-rose";
  if (score >= 25) return "bg-accent-amber";
  return "bg-accent-emerald";
}

// ── Component ──

export function ShippingWidget({ data }: { data: ShippingData }) {
  if (data?.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        Shipping intelligence error: {data.error}
      </div>
    );
  }

  const chokepoints = data?.chokepoints || [];
  const anomalies = data?.anomalies || [];
  const darkFleetAlerts = data?.darkFleetAlerts || [];
  const freightProxies = data?.freightProxies || [];
  const oilPrice = data?.oilPrice;
  const oilPriceChange = data?.oilPriceChange;
  const overallRisk = data?.overallRiskScore ?? 0;

  return (
    <div className="my-2 space-y-3">
      {/* ── Header with overall risk ── */}
      <div className="border border-navy-700/40 rounded bg-navy-900/60 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
            Maritime Intelligence
          </span>
          <div className="flex items-center gap-3">
            {oilPrice !== null && oilPrice !== undefined && (
              <span className="text-[10px] font-mono text-navy-400">
                WTI{" "}
                <span className="text-navy-200">${oilPrice.toFixed(2)}</span>
                {oilPriceChange !== null && oilPriceChange !== undefined && (
                  <span
                    className={`ml-1 ${oilPriceChange >= 0 ? "text-accent-emerald" : "text-accent-rose"}`}
                  >
                    {oilPriceChange >= 0 ? "+" : ""}
                    {oilPriceChange.toFixed(1)}%
                  </span>
                )}
              </span>
            )}
            <span className="text-[10px] font-mono text-navy-500">
              Risk{" "}
              <span
                className={
                  overallRisk >= 60
                    ? "text-accent-rose"
                    : overallRisk >= 25
                      ? "text-accent-amber"
                      : "text-accent-emerald"
                }
              >
                {overallRisk}/100
              </span>
            </span>
          </div>
        </div>
        {/* Risk bar */}
        <div className="h-1 bg-navy-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${riskBar(overallRisk)}`}
            style={{ width: `${overallRisk}%` }}
          />
        </div>
      </div>

      {/* ── Chokepoint Cards ── */}
      {chokepoints.length > 0 && (
        <div className="grid grid-cols-1 gap-2">
          {chokepoints.map((cp) => (
            <div
              key={cp.id}
              className="border border-navy-700/40 rounded bg-navy-900/60 p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-navy-200">
                    {cp.name}
                  </span>
                  <span
                    className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${statusBg(cp.status)} ${statusColor(cp.status)}`}
                  >
                    {cp.status}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-navy-500">
                  Risk{" "}
                  <span
                    className={
                      cp.riskScore >= 60
                        ? "text-accent-rose"
                        : cp.riskScore >= 25
                          ? "text-accent-amber"
                          : "text-accent-emerald"
                    }
                  >
                    {cp.riskScore}
                  </span>
                </span>
              </div>

              {/* Transit data */}
              <div className="flex items-center gap-6 mb-2">
                <div>
                  <div className="text-[10px] font-mono text-navy-600 uppercase">
                    Transits/Day
                  </div>
                  <div className="text-sm font-mono text-navy-200 tabular-nums">
                    {cp.estimatedDailyTransits}
                    <span className="text-navy-600">
                      /{cp.baselineDailyTransits}
                    </span>
                    {cp.transitDeltaPct !== 0 && (
                      <span
                        className={`text-[10px] ml-1 ${cp.transitDeltaPct < 0 ? "text-accent-rose" : "text-accent-emerald"}`}
                      >
                        {cp.transitDeltaPct > 0 ? "+" : ""}
                        {cp.transitDeltaPct}%
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-navy-600 uppercase">
                    Annual Trade
                  </div>
                  <div className="text-sm font-mono text-navy-200">
                    {cp.annualTradeValue}
                  </div>
                </div>
              </div>

              {/* Commodities */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {cp.commodities.map((c) => (
                  <span
                    key={c.name}
                    className="text-[9px] font-mono text-navy-400 bg-navy-800/40 rounded px-1.5 py-0.5"
                    title={c.globalShare}
                  >
                    {c.name}
                  </span>
                ))}
              </div>

              {/* Risk factors */}
              {cp.riskFactors.length > 0 && (
                <div className="space-y-0.5">
                  {cp.riskFactors.map((rf, i) => (
                    <div
                      key={i}
                      className="text-[10px] text-navy-400 flex items-start gap-1.5"
                    >
                      <span className="text-navy-600 mt-0.5">*</span>
                      {rf}
                    </div>
                  ))}
                </div>
              )}

              {/* Recent articles */}
              {cp.recentArticles && cp.recentArticles.length > 0 && (
                <div className="mt-2 pt-2 border-t border-navy-800/30">
                  <div className="text-[9px] font-mono text-navy-600 uppercase tracking-wider mb-1">
                    Recent Intel
                  </div>
                  {cp.recentArticles.slice(0, 3).map((a: any, i: number) => (
                    <div
                      key={i}
                      className="text-[10px] text-navy-400 truncate leading-relaxed"
                    >
                      {a.title}
                      <span className="text-navy-600 ml-1">
                        [{a.source}]
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Traffic Anomalies ── */}
      {anomalies.length > 0 && (
        <div className="border border-navy-700/40 rounded bg-navy-900/60 p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-2">
            Traffic Anomalies
          </div>
          <div className="space-y-2">
            {anomalies.map((a) => (
              <div key={a.id} className="flex items-start gap-2">
                <span
                  className={`text-[9px] font-mono uppercase tracking-wider mt-0.5 ${severityColor(a.severity)}`}
                >
                  {a.severity}
                </span>
                <div className="min-w-0">
                  <div className="text-[11px] text-navy-200">
                    {a.chokepointName}{" "}
                    <span className="text-navy-500">{a.type}</span>
                  </div>
                  <div className="text-[10px] text-navy-400 leading-relaxed">
                    {a.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Dark Fleet Alerts ── */}
      {darkFleetAlerts.length > 0 && (
        <div className="border border-accent-rose/20 rounded bg-accent-rose/[0.03] p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-accent-rose/70 mb-2">
            Dark Fleet Alerts
          </div>
          <div className="space-y-2">
            {darkFleetAlerts.map((alert) => (
              <div key={alert.id}>
                <div className="text-[11px] text-navy-200 leading-relaxed">
                  {alert.description}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[9px] font-mono text-navy-500">
                    Confidence{" "}
                    {Math.round(alert.confidence * 100)}%
                  </span>
                  <span className="text-[9px] font-mono text-navy-600">
                    [{alert.source}]
                  </span>
                  <div className="flex gap-1">
                    {alert.commodities.map((c) => (
                      <span
                        key={c}
                        className="text-[8px] font-mono text-accent-rose/60 bg-accent-rose/5 rounded px-1 py-0.5"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Freight Market Proxies ── */}
      {freightProxies.length > 0 && (
        <div className="border border-navy-700/40 rounded bg-navy-900/60 p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-2">
            Freight Market
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {freightProxies.map((fp) => (
              <div key={fp.symbol} className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-navy-200">
                    {fp.symbol}
                  </div>
                  <div className="text-[9px] font-mono text-navy-600">
                    {fp.label}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono text-navy-300 tabular-nums">
                    ${fp.price.toFixed(2)}
                  </div>
                  <div
                    className={`text-[9px] font-mono tabular-nums ${fp.changePercent >= 0 ? "text-accent-emerald" : "text-accent-rose"}`}
                  >
                    {fp.changePercent >= 0 ? "+" : ""}
                    {fp.changePercent.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
