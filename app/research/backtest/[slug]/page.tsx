"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Target,
  TrendingUp,
  Calendar,
  Shield,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  AreaChart,
  Area,
} from "recharts";
import type { BacktestResults } from "@/lib/backtest/types";
import { PublicNav } from "@/components/layout/public-nav";
import { PublicFooter } from "@/components/layout/public-footer";

const n = (v: number | null | undefined): number => v ?? 0;

function Metric({
  label,
  value,
  subtitle,
  color,
}: {
  label: string;
  value: string;
  subtitle?: string;
  color?: string;
}) {
  return (
    <div className="border border-navy-700/30 rounded-lg bg-navy-900/40 p-4">
      <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-1">
        {label}
      </div>
      <div
        className="font-mono text-2xl font-bold"
        style={{ color: color || "#d4d4d4" }}
      >
        {value}
      </div>
      {subtitle && (
        <div className="font-mono text-[10px] text-navy-500 mt-1">
          {subtitle}
        </div>
      )}
    </div>
  );
}

interface PublicBacktest {
  id: string;
  config: { startDate: string; endDate: string; instruments: string[]; convergenceThreshold: number; timeframes: number[] };
  status: string;
  results: BacktestResults;
  predictionCount: number;
  createdAt: string;
  completedAt?: string;
}

export default function PublicBacktestPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<PublicBacktest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/backtest/public/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(setData)
      .catch(() => setError("Backtest results not found or no longer published."))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <>
        <PublicNav />
        <div className="min-h-screen bg-navy-950 flex items-center justify-center">
          <div className="font-mono text-xs text-navy-500">Loading...</div>
        </div>
        <PublicFooter />
      </>
    );
  }

  if (error || !data || !data.results) {
    return (
      <>
        <PublicNav />
        <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center gap-4">
          <p className="font-mono text-sm text-navy-400">{error || "Not found"}</p>
          <Link href="/research/methodology" className="font-mono text-xs text-accent-cyan hover:underline">
            View methodology
          </Link>
        </div>
        <PublicFooter />
      </>
    );
  }

  const r = data.results;
  const brierImprovement = ((n(r.randomBaseline?.brierScore) - n(r.brierScore)) / (n(r.randomBaseline?.brierScore) || 1)) * 100;
  const accuracyLift = ((n(r.directionalAccuracy) - n(r.randomBaseline?.directionalAccuracy)) / (n(r.randomBaseline?.directionalAccuracy) || 1)) * 100;

  return (
    <>
      <PublicNav />
      <div className="min-h-screen bg-navy-950 pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-6">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/research/methodology"
              className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-navy-500 hover:text-navy-300 mb-4"
            >
              <ArrowLeft className="w-3 h-3" /> Research
            </Link>
            <h1 className="font-mono text-xl font-bold text-navy-100 mb-2">
              Published Backtest Results
            </h1>
            <div className="flex items-center gap-4 font-mono text-[10px] text-navy-500 uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {data.config.startDate} to {data.config.endDate}
              </span>
              <span className="flex items-center gap-1">
                <Target className="w-3 h-3" />
                {data.predictionCount} predictions
              </span>
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Threshold {data.config.convergenceThreshold}+
              </span>
            </div>
          </div>

          {/* Warnings */}
          {r.sampleWarning && (
            <div className="border border-amber-500/30 rounded-lg bg-amber-500/5 px-4 py-3 mb-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-amber-500 mb-1">Sample Size Warning</p>
              <p className="font-sans text-xs text-navy-300">{r.sampleWarning}</p>
            </div>
          )}
          {r.llmLeakageWarning && (
            <div className="border border-rose-500/30 rounded-lg bg-rose-500/5 px-4 py-3 mb-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-rose-500 mb-1">LLM Knowledge Leakage</p>
              <p className="font-sans text-xs text-navy-300">{r.llmLeakageWarning}</p>
            </div>
          )}

          {/* Headline metrics */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-8 bg-navy-700" />
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">
                Headline Metrics
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <Metric
                label="Directional Accuracy"
                value={`${(n(r.directionalAccuracy) * 100).toFixed(1)}%`}
                subtitle={`vs ${(n(r.randomBaseline?.directionalAccuracy) * 100).toFixed(0)}% random (+${accuracyLift.toFixed(0)}%)`}
                color={n(r.directionalAccuracy) > 0.55 ? "#10b981" : n(r.directionalAccuracy) > 0.5 ? "#f59e0b" : "#ef4444"}
              />
              <Metric
                label="Brier Score"
                value={n(r.brierScore).toFixed(4)}
                subtitle={`vs ${n(r.randomBaseline?.brierScore).toFixed(4)} random (${brierImprovement > 0 ? "+" : ""}${brierImprovement.toFixed(1)}%)`}
                color={n(r.brierScore) < n(r.randomBaseline?.brierScore) ? "#10b981" : "#ef4444"}
              />
              <Metric
                label="p-Value"
                value={n(r.pValue) < 0.001 ? "<0.001" : n(r.pValue).toFixed(4)}
                subtitle={r.significant ? "Statistically significant" : "Not significant"}
                color={r.significant ? "#10b981" : "#f59e0b"}
              />
              <Metric
                label="Sample Size"
                value={`n=${r.totalValidated || 0}`}
                subtitle={`${r.totalPredictions || 0} total, ${r.yearsSpanned || 0}yr span`}
                color={(r.totalValidated || 0) < 30 ? "#f59e0b" : undefined}
              />
              <Metric
                label="Calibration Gap"
                value={`${(n(r.calibrationGap) * 100).toFixed(1)}pp`}
                subtitle={n(r.calibrationGap) < 0.05 ? "Well calibrated" : "Miscalibrated"}
                color={n(r.calibrationGap) < 0.05 ? "#10b981" : "#f59e0b"}
              />
              <Metric
                label="Log Loss"
                value={n(r.logLoss).toFixed(4)}
                subtitle={`Avg confidence: ${(n(r.avgConfidence) * 100).toFixed(0)}%`}
              />
            </div>
          </div>

          {/* Accuracy CI */}
          {r.accuracyCI && (
            <div className="border border-navy-700/30 rounded-lg bg-navy-900/40 px-4 py-3 mb-6">
              <p className="font-mono text-[10px] uppercase tracking-wider text-navy-500 mb-1">Accuracy 95% Confidence Interval (Wilson)</p>
              <p className="font-sans text-xs text-navy-300">
                [{(r.accuracyCI.lower * 100).toFixed(1)}%, {(r.accuracyCI.upper * 100).toFixed(1)}%]
              </p>
            </div>
          )}

          {/* Cumulative accuracy chart */}
          {r.cumulativeAccuracy && r.cumulativeAccuracy.length > 1 && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px w-8 bg-navy-700" />
                <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">
                  Cumulative Accuracy
                </h2>
              </div>
              <div className="border border-navy-700/30 rounded-lg bg-navy-900/40 p-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={r.cumulativeAccuracy}>
                    <CartesianGrid stroke="#1a1a2e" strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 9 }} tickFormatter={(d: string) => d.slice(0, 7)} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 9 }} domain={[0, 1]} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
                    <Tooltip contentStyle={{ background: "#0a0a1a", border: "1px solid #2a2a3e", fontSize: 11 }} formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
                    <ReferenceLine y={0.5} stroke="#6b7280" strokeDasharray="4 4" label={{ value: "Random", fill: "#6b7280", fontSize: 9 }} />
                    <Line type="monotone" dataKey="accuracy" stroke="#06b6d4" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Portfolio equity curve */}
          {r.portfolio?.equityCurve && r.portfolio.equityCurve.length > 1 && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px w-8 bg-navy-700" />
                <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">
                  Portfolio Equity Curve
                </h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <Metric label="Total Return" value={`${n(r.portfolio.totalReturnPct).toFixed(1)}%`} color={n(r.portfolio.totalReturnPct) > 0 ? "#10b981" : "#ef4444"} />
                <Metric label="Sharpe Ratio" value={n(r.portfolio.sharpeRatio).toFixed(2)} color={n(r.portfolio.sharpeRatio) > 1 ? "#10b981" : "#f59e0b"} />
                <Metric label="Max Drawdown" value={`${n(r.portfolio.maxDrawdownPct).toFixed(1)}%`} color="#ef4444" />
                <Metric label="Win Rate" value={`${(n(r.portfolio.winRate) * 100).toFixed(0)}%`} color={n(r.portfolio.winRate) > 0.5 ? "#10b981" : "#f59e0b"} />
              </div>
              <div className="border border-navy-700/30 rounded-lg bg-navy-900/40 p-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={r.portfolio.equityCurve}>
                    <CartesianGrid stroke="#1a1a2e" strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 9 }} tickFormatter={(d: string) => d.slice(0, 7)} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 9 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ background: "#0a0a1a", border: "1px solid #2a2a3e", fontSize: 11 }} formatter={(v: number) => `$${v.toLocaleString()}`} />
                    <Area type="monotone" dataKey="portfolioValue" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Walk-forward validation */}
          {r.walkForward && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px w-8 bg-navy-700" />
                <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">
                  Walk-Forward Validation
                </h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Metric label="OOS Accuracy" value={`${(n(r.walkForward.oosAccuracy) * 100).toFixed(1)}%`} color={n(r.walkForward.oosAccuracy) > 0.5 ? "#10b981" : "#ef4444"} />
                <Metric label="OOS Brier" value={n(r.walkForward.oosBrierScore).toFixed(4)} />
                <Metric label="Temporal Stability" value={n(r.walkForward.overfitRatio).toFixed(2)} subtitle={n(r.walkForward.overfitRatio) > 0.8 ? "Stable" : "Degrading"} color={n(r.walkForward.overfitRatio) > 0.8 ? "#10b981" : "#f59e0b"} />
                <Metric label="Folds" value={`${r.walkForward.foldCount}`} />
              </div>
            </div>
          )}

          {/* Instruments */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px w-8 bg-navy-700" />
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">
                Instruments Tested
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.config.instruments.map((sym) => (
                <span key={sym} className="px-2 py-1 rounded bg-navy-800/60 border border-navy-700/30 font-mono text-[10px] text-navy-300">
                  {sym}
                </span>
              ))}
            </div>
          </div>

          {/* Methodology link */}
          <div className="border-t border-navy-800 pt-6 mt-8">
            <p className="font-sans text-xs text-navy-500 mb-2">
              This backtest uses temporally-isolated AI predictions with walk-forward validation.
              No reactive signals are used. All predictions are time-gated to prevent look-ahead bias.
            </p>
            <Link
              href="/research/methodology"
              className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-accent-cyan hover:underline"
            >
              <TrendingUp className="w-3 h-3" /> Full Methodology
            </Link>
          </div>
        </div>
      </div>
      <PublicFooter />
    </>
  );
}
