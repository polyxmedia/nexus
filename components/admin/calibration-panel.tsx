"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, FlaskConical, CheckCircle2, BarChart3, RefreshCw, XCircle, X, ArrowDownRight, ArrowUpRight, Zap, Clock } from "lucide-react";

interface CalibrationReport {
  ready: boolean;
  message?: string;
  totalResolved?: number;
  sampleSufficient?: boolean;
  brierScore?: number;
  logLoss?: number;
  binaryAccuracy?: number;
  avgConfidence?: number;
  calibrationGap?: number;
  calibration?: Array<{
    range: string;
    midpoint: number;
    count: number;
    confirmedRate: number;
    brierContribution: number;
    reliable: boolean;
  }>;
  byCategory?: Array<{
    category: string;
    total: number;
    confirmed: number;
    denied: number;
    partial: number;
    expired: number;
    brierScore: number;
    avgConfidence: number;
    calibrationGap: number;
    reliable: boolean;
  }>;
  timeframeAccuracy?: Record<string, { count: number; brierScore: number; binaryAccuracy: number; reliable: boolean }>;
  recentTrend?: { recentBrier: number; priorBrier: number; improving: boolean; windowSize: number } | null;
  failurePatterns?: Array<{ pattern: string; frequency: number; examples: string[] }>;
  insights?: string[];
}

export function CalibrationPanel() {
  const [report, setReport] = useState<CalibrationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{ action: string; message: string; ok: boolean } | null>(null);

  const TARGET_BRIER = 0.15;

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/predictions/calibration");
      if (res.ok) setReport(await res.json());
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const runAction = async (action: string, label: string, endpoint: string, method = "POST", body?: Record<string, unknown>) => {
    setActionLoading(action);
    setActionResult(null);
    try {
      const res = await fetch(endpoint, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (res.ok) {
        const msg = action === "resolve"
          ? `Resolved ${data.resolved ?? data.count ?? 0} predictions`
          : action === "fast-resolve"
          ? `Fast-resolved ${data.resolved ?? 0} predictions (data-driven)`
          : action === "generate"
          ? `Generated ${data.generated ?? data.predictions?.length ?? 0} new predictions`
          : action === "auto-resolve"
          ? `Auto-expired ${data.resolved ?? 0} past-deadline predictions`
          : action === "sync-benchmarks"
          ? `Synced benchmarks: ${data.synced ?? data.imported ?? 0} imported`
          : action === "resolve-benchmarks"
          ? `Resolved ${data.resolved ?? 0} of ${data.checked ?? 0} benchmarks`
          : `${label} completed`;
        setActionResult({ action, message: msg, ok: true });
        if (["resolve", "fast-resolve", "auto-resolve"].includes(action)) {
          setTimeout(() => fetchReport(), 1000);
        }
      } else {
        setActionResult({ action, message: data.error || "Failed", ok: false });
      }
    } catch (err) {
      setActionResult({ action, message: err instanceof Error ? err.message : "Network error", ok: false });
    }
    setActionLoading(null);
  };

  const brierColor = (brier: number) =>
    brier <= TARGET_BRIER ? "text-accent-emerald" :
    brier <= 0.20 ? "text-accent-cyan" :
    brier <= 0.25 ? "text-accent-amber" :
    "text-accent-rose";

  const gapColor = (gap: number) =>
    Math.abs(gap) <= 0.05 ? "text-accent-emerald" :
    Math.abs(gap) <= 0.10 ? "text-accent-cyan" :
    Math.abs(gap) <= 0.15 ? "text-accent-amber" :
    "text-accent-rose";

  if (loading && !report) {
    return <div className="space-y-4"><Skeleton className="h-48 w-full" /><Skeleton className="h-32 w-full" /></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-navy-100 uppercase tracking-wider">Prediction Calibration</h2>
          <p className="text-[10px] text-navy-500 mt-1">
            Target Brier score: {TARGET_BRIER}. Current system uses base rate anchoring, specificity penalties, compound probability detection, and backtest feedback loops.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={fetchReport}
          disabled={loading}
          className="text-[10px]"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
          Refresh
        </Button>
      </div>

      {/* Action Result Toast */}
      {actionResult && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono ${
          actionResult.ok
            ? "border-accent-emerald/30 bg-accent-emerald/5 text-accent-emerald"
            : "border-accent-rose/30 bg-accent-rose/5 text-accent-rose"
        }`}>
          {actionResult.ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
          {actionResult.message}
          <button onClick={() => setActionResult(null)} className="ml-auto text-navy-500 hover:text-navy-300">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {!report?.ready ? (
        <div className="border border-navy-700/40 rounded-lg bg-navy-950/60 p-8 text-center">
          <FlaskConical className="h-8 w-8 text-navy-600 mx-auto mb-3" />
          <p className="text-sm text-navy-400">{report?.message || "No calibration data available"}</p>
          <p className="text-[10px] text-navy-600 mt-2">Generate and resolve predictions to begin calibration</p>
        </div>
      ) : (
        <>
          {/* Score Cards */}
          <div className="grid grid-cols-5 gap-3">
            {[
              {
                label: "Brier Score",
                value: report.brierScore?.toFixed(3) ?? "-",
                color: brierColor(report.brierScore ?? 1),
                sub: `Target: ${TARGET_BRIER}`,
                highlight: (report.brierScore ?? 1) <= TARGET_BRIER,
              },
              {
                label: "Accuracy",
                value: `${((report.binaryAccuracy ?? 0) * 100).toFixed(1)}%`,
                color: (report.binaryAccuracy ?? 0) >= 0.6 ? "text-accent-emerald" : "text-accent-amber",
                sub: `${report.totalResolved} resolved`,
              },
              {
                label: "Avg Confidence",
                value: `${((report.avgConfidence ?? 0) * 100).toFixed(1)}%`,
                color: "text-navy-200",
                sub: report.sampleSufficient ? "Sample sufficient" : "Need more data",
              },
              {
                label: "Cal. Gap",
                value: `${((report.calibrationGap ?? 0) * 100).toFixed(1)}pp`,
                color: gapColor(report.calibrationGap ?? 0),
                sub: (report.calibrationGap ?? 0) > 0.05 ? "Overconfident" : (report.calibrationGap ?? 0) < -0.05 ? "Underconfident" : "Well calibrated",
              },
              {
                label: "Log Loss",
                value: report.logLoss?.toFixed(3) ?? "-",
                color: (report.logLoss ?? 1) < 0.5 ? "text-accent-emerald" : "text-accent-amber",
                sub: "Lower is better",
              },
            ].map((card) => (
              <div key={card.label} className={`border ${card.highlight ? "border-accent-emerald/40 bg-accent-emerald/5" : "border-navy-700/40 bg-navy-950/60"} rounded-lg p-3`}>
                <span className="text-[9px] font-mono uppercase tracking-widest text-navy-500">{card.label}</span>
                <div className={`font-mono text-xl font-light mt-1 ${card.color}`}>{card.value}</div>
                <span className="text-[9px] font-mono text-navy-600">{card.sub}</span>
              </div>
            ))}
          </div>

          {/* Trend indicator */}
          {report.recentTrend && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px] font-mono ${
              report.recentTrend.improving
                ? "border-accent-emerald/20 bg-accent-emerald/5 text-accent-emerald"
                : "border-accent-rose/20 bg-accent-rose/5 text-accent-rose"
            }`}>
              {report.recentTrend.improving ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
              {report.recentTrend.improving ? "Improving" : "Declining"}:
              recent Brier {report.recentTrend.recentBrier.toFixed(3)} vs prior {report.recentTrend.priorBrier.toFixed(3)}
              <span className="text-navy-600 ml-1">(window: {report.recentTrend.windowSize})</span>
            </div>
          )}

          {/* Calibration Curve */}
          <div className="border border-navy-700/40 rounded-lg bg-navy-950/60 p-4">
            <h3 className="text-[10px] font-mono uppercase tracking-widest text-navy-500 mb-3">Reliability Diagram</h3>
            <div className="flex items-end gap-1 h-32">
              {report.calibration?.map((bucket, i) => {
                const barH = bucket.count > 0 ? Math.max(bucket.confirmedRate * 100, 4) : 0;
                const idealH = bucket.midpoint * 100;
                const isOver = bucket.confirmedRate < bucket.midpoint - 0.05;
                const isUnder = bucket.confirmedRate > bucket.midpoint + 0.05;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="relative w-full h-28 flex items-end justify-center">
                      {/* Ideal line */}
                      <div
                        className="absolute w-full h-px bg-navy-600/50"
                        style={{ bottom: `${idealH}%` }}
                      />
                      {/* Actual bar */}
                      <div
                        className={`w-3/4 rounded-t transition-all ${
                          !bucket.reliable ? "bg-navy-700/40" :
                          isOver ? "bg-accent-rose/60" :
                          isUnder ? "bg-accent-cyan/60" :
                          "bg-accent-emerald/60"
                        }`}
                        style={{ height: `${barH}%` }}
                      />
                    </div>
                    <span className="text-[8px] font-mono text-navy-600 text-center leading-tight">
                      {bucket.range.split("(")[0].trim()}
                    </span>
                    <span className="text-[8px] font-mono text-navy-500">
                      n={bucket.count}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-2 text-[8px] font-mono text-navy-600">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-accent-emerald/60" /> Calibrated</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-accent-rose/60" /> Overconfident</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-accent-cyan/60" /> Underconfident</span>
              <span className="flex items-center gap-1"><span className="w-2 h-px bg-navy-600/50" /> Perfect calibration</span>
            </div>
          </div>

          {/* Category Breakdown */}
          {report.byCategory && report.byCategory.length > 0 && (
            <div className="border border-navy-700/40 rounded-lg bg-navy-950/60 p-4">
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-navy-500 mb-3">Category Performance</h3>
              <div className="space-y-2">
                {report.byCategory.map((cat) => (
                  <div key={cat.category} className="flex items-center gap-3 text-xs font-mono">
                    <span className="w-24 text-navy-400 uppercase text-[10px]">{cat.category}</span>
                    <div className="flex-1 h-2 bg-navy-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          cat.brierScore <= TARGET_BRIER ? "bg-accent-emerald" :
                          cat.brierScore <= 0.25 ? "bg-accent-amber" :
                          "bg-accent-rose"
                        }`}
                        style={{ width: `${Math.max(5, (1 - cat.brierScore) * 100)}%` }}
                      />
                    </div>
                    <span className={`w-14 text-right ${brierColor(cat.brierScore)}`}>
                      {cat.brierScore.toFixed(3)}
                    </span>
                    <span className={`w-16 text-right ${gapColor(cat.calibrationGap)}`}>
                      {cat.calibrationGap > 0 ? "+" : ""}{(cat.calibrationGap * 100).toFixed(1)}pp
                    </span>
                    <span className="w-10 text-right text-navy-500">n={cat.total}</span>
                    {!cat.reliable && <span className="text-[8px] text-navy-600">(low n)</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeframe Breakdown */}
          {report.timeframeAccuracy && Object.keys(report.timeframeAccuracy).length > 0 && (
            <div className="border border-navy-700/40 rounded-lg bg-navy-950/60 p-4">
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-navy-500 mb-3">Timeframe Performance</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(report.timeframeAccuracy)
                  .sort(([, a], [, b]) => a.brierScore - b.brierScore)
                  .map(([tf, data]) => (
                    <div key={tf} className="flex items-center gap-2 text-xs font-mono px-2 py-1.5 rounded bg-navy-900/40">
                      <span className="w-20 text-navy-400 text-[10px] uppercase">{tf}</span>
                      <span className={`${brierColor(data.brierScore)}`}>
                        Brier: {data.brierScore.toFixed(3)}
                      </span>
                      <span className="text-navy-500">
                        Acc: {(data.binaryAccuracy * 100).toFixed(0)}%
                      </span>
                      <span className="text-navy-600 ml-auto">n={data.count}</span>
                      {!data.reliable && <span className="text-[8px] text-navy-700">(low n)</span>}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Failure Patterns */}
          {report.failurePatterns && report.failurePatterns.length > 0 && (
            <div className="border border-accent-amber/20 rounded-lg bg-accent-amber/[0.03] p-4">
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-accent-amber mb-3">Failure Patterns</h3>
              <div className="space-y-2">
                {report.failurePatterns.map((fp, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-2 text-xs">
                      <Zap className="h-3 w-3 text-accent-amber flex-shrink-0" />
                      <span className="text-navy-200">{fp.pattern}</span>
                      <span className="text-navy-600 text-[10px] font-mono">(x{fp.frequency})</span>
                    </div>
                    {fp.examples.length > 0 && (
                      <div className="ml-5 mt-1 space-y-0.5">
                        {fp.examples.map((ex, j) => (
                          <p key={j} className="text-[10px] text-navy-500 truncate">{ex}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Insights */}
          {report.insights && report.insights.length > 0 && (
            <div className="border border-navy-700/40 rounded-lg bg-navy-950/60 p-4">
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-navy-500 mb-3">Calibration Insights</h3>
              <div className="space-y-1.5">
                {report.insights.map((insight, i) => (
                  <p key={i} className="text-[11px] text-navy-300 leading-relaxed flex gap-2">
                    <span className="text-navy-600 flex-shrink-0">{i + 1}.</span>
                    {insight}
                  </p>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Actions */}
      <div className="border border-navy-700/40 rounded-lg bg-navy-950/60 p-4">
        <h3 className="text-[10px] font-mono uppercase tracking-widest text-navy-500 mb-4">Calibration Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              id: "resolve",
              label: "AI Resolve",
              desc: "Resolve due predictions using AI (fetches market data + news). Takes 30-120s.",
              endpoint: "/api/predictions/resolve",
              icon: CheckCircle2,
              variant: "default" as const,
            },
            {
              id: "fast-resolve",
              label: "Fast Resolve",
              desc: "Data-driven resolution. No AI, just compares market prices against targets. Fast and cheap.",
              endpoint: "/api/predictions/fast-resolve",
              icon: Zap,
              variant: "default" as const,
            },
            {
              id: "auto-resolve",
              label: "Auto-Expire",
              desc: "Deny predictions 7+ days past deadline that were never confirmed. Cleans up stale predictions.",
              endpoint: "/api/predictions/auto-resolve",
              icon: Clock,
              variant: "outline" as const,
            },
            {
              id: "generate",
              label: "Generate Predictions",
              desc: "Create new predictions from current intelligence picture. Uses all active signals and thesis.",
              endpoint: "/api/predictions/generate",
              icon: Plus,
              variant: "default" as const,
            },
            {
              id: "sync-benchmarks",
              label: "Sync Benchmarks",
              desc: "Pull latest questions from Metaculus, Polymarket, and Manifold for external comparison.",
              endpoint: "/api/predictions/benchmarks",
              icon: RefreshCw,
              variant: "outline" as const,
              body: { action: "sync" },
            },
            {
              id: "resolve-benchmarks",
              label: "Resolve Benchmarks",
              desc: "Check resolution status of external benchmark questions and compute comparative Brier scores.",
              endpoint: "/api/predictions/benchmarks",
              icon: BarChart3,
              variant: "outline" as const,
              body: { action: "resolve" },
            },
          ].map((action) => (
            <button
              key={action.id}
              onClick={() => runAction(action.id, action.label, action.endpoint, "POST", action.body)}
              disabled={actionLoading !== null}
              className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                action.variant === "default"
                  ? "border-navy-600/40 bg-navy-900/40 hover:bg-navy-800/60 hover:border-navy-500/40"
                  : "border-navy-700/30 bg-navy-950/40 hover:bg-navy-900/40 hover:border-navy-600/40"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {actionLoading === action.id ? (
                <Loader2 className="h-4 w-4 text-accent-cyan animate-spin flex-shrink-0 mt-0.5" />
              ) : (
                <action.icon className="h-4 w-4 text-navy-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <span className="text-xs font-medium text-navy-200">{action.label}</span>
                <p className="text-[10px] text-navy-500 mt-0.5 leading-relaxed">{action.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Calibration Pipeline Diagram */}
      <div className="border border-navy-700/40 rounded-lg bg-navy-950/60 p-4">
        <h3 className="text-[10px] font-mono uppercase tracking-widest text-navy-500 mb-3">How Calibration Works</h3>
        <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
          {[
            "Generate predictions",
            "Wait for deadlines",
            "Fast-resolve (data)",
            "AI resolve (remaining)",
            "Auto-expire (stale)",
            "Report updates",
            "Feedback loops adjust confidence",
            "Next generation is better calibrated",
          ].map((step, i, arr) => (
            <span key={i} className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded ${i === arr.length - 1 ? "bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20" : "bg-navy-800/60 text-navy-400 border border-navy-700/30"}`}>
                {i + 1}. {step}
              </span>
              {i < arr.length - 1 && <ChevronRight className="h-3 w-3 text-navy-700" />}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

