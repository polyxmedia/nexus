"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import type { BacktestRun, TradeRecord } from "@/lib/backtest/types";
import { AreaChart, Area } from "recharts";

// Null-safe number helper for portfolio metrics that may be null/undefined
const n = (v: number | null | undefined): number => v ?? 0;

// ── Metric card ──
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

// ── Progress panel ──
function ProgressPanel({ run }: { run: BacktestRun }) {
  const statusColors: Record<string, string> = {
    pending: "#6b7280",
    collecting_data: "#06b6d4",
    generating_signals: "#f59e0b",
    simulating: "#f59e0b",
    validating: "#10b981",
    analyzing: "#06b6d4",
    complete: "#10b981",
    failed: "#ef4444",
  };

  return (
    <div className="border border-navy-700/30 rounded-lg bg-navy-900/40 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {run.status === "complete" ? (
            <CheckCircle className="w-4 h-4 text-accent-emerald" />
          ) : run.status === "failed" ? (
            <XCircle className="w-4 h-4 text-accent-rose" />
          ) : (
            <Loader2 className="w-4 h-4 text-accent-cyan animate-spin" />
          )}
          <span
            className="font-mono text-xs font-semibold uppercase tracking-widest"
            style={{ color: statusColors[run.status] || "#6b7280" }}
          >
            {run.status.replace(/_/g, " ")}
          </span>
        </div>
        <span className="font-mono text-xs text-navy-500">
          {run.predictions.length} predictions
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full bg-navy-800 overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${run.progress}%`,
            backgroundColor: statusColors[run.status] || "#6b7280",
          }}
        />
      </div>
      <p className="font-mono text-[10px] text-navy-500">
        {run.progressMessage}
      </p>

      {run.error && (
        <div className="mt-3 rounded bg-accent-rose/10 border border-accent-rose/20 px-3 py-2">
          <p className="font-mono text-[11px] text-accent-rose">{run.error}</p>
        </div>
      )}
    </div>
  );
}

// ── Results dashboard ──
function ResultsDashboard({ run }: { run: BacktestRun }) {
  const r = run.results!;
  const [showAnalysis, setShowAnalysis] = useState(false);

  const brierImprovement =
    ((n(r.randomBaseline?.brierScore) - n(r.brierScore)) / (n(r.randomBaseline?.brierScore) || 1)) * 100;

  const accuracyLift =
    ((n(r.directionalAccuracy) - n(r.randomBaseline?.directionalAccuracy)) /
      (n(r.randomBaseline?.directionalAccuracy) || 1)) *
    100;

  return (
    <div className="space-y-6">
      {/* ── Headline metrics ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px w-8 bg-navy-700" />
          <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">
            Headline Metrics
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
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
            subtitle={`Avg conf: ${(n(r.avgConfidence) * 100).toFixed(1)}%`}
          />
        </div>
      </div>

      {/* ── Cumulative accuracy chart ── */}
      {r.cumulativeAccuracy?.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-8 bg-navy-700" />
            <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">
              Cumulative Directional Accuracy Over Time
            </h2>
          </div>
          <div className="border border-navy-700/30 rounded-lg bg-navy-900/40 p-4">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={r.cumulativeAccuracy}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#525252", fontSize: 9, fontFamily: "monospace" }}
                  tickFormatter={(v: string) => v.slice(0, 7)}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0.3, 0.8]}
                  tick={{ fill: "#525252", fontSize: 9, fontFamily: "monospace" }}
                  tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0a0a0a",
                    border: "1px solid #1f1f1f",
                    borderRadius: "6px",
                    fontFamily: "monospace",
                    fontSize: "11px",
                  }}
                  formatter={(v: number) => [`${(v * 100).toFixed(1)}%`, "Accuracy"]}
                  labelFormatter={(l: string) => `Date: ${l}`}
                />
                <ReferenceLine
                  y={0.5}
                  stroke="#ef4444"
                  strokeDasharray="5 5"
                  label={{
                    value: "Random (50%)",
                    fill: "#525252",
                    fontSize: 9,
                    fontFamily: "monospace",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Brier score over time ── */}
      {r.brierOverTime?.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-8 bg-navy-700" />
            <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">
              Brier Score Over Time (lower = better)
            </h2>
          </div>
          <div className="border border-navy-700/30 rounded-lg bg-navy-900/40 p-4">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={r.brierOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#525252", fontSize: 9, fontFamily: "monospace" }}
                  tickFormatter={(v: string) => v.slice(0, 7)}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: "#525252", fontSize: 9, fontFamily: "monospace" }}
                  domain={[0, 0.35]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0a0a0a",
                    border: "1px solid #1f1f1f",
                    borderRadius: "6px",
                    fontFamily: "monospace",
                    fontSize: "11px",
                  }}
                />
                <ReferenceLine y={0.25} stroke="#ef4444" strokeDasharray="5 5" />
                <Line
                  type="monotone"
                  dataKey="rolling30"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="Rolling 30"
                />
                <Line
                  type="monotone"
                  dataKey="brier"
                  stroke="#06b6d4"
                  strokeWidth={1}
                  dot={false}
                  opacity={0.5}
                  name="Cumulative"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Hypothetical P&L ── */}
      {r.hypotheticalPnl?.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-8 bg-navy-700" />
            <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">
              Hypothetical Cumulative P&L (confidence-weighted)
            </h2>
          </div>
          <div className="border border-navy-700/30 rounded-lg bg-navy-900/40 p-4">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={r.hypotheticalPnl}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#525252", fontSize: 9, fontFamily: "monospace" }}
                  tickFormatter={(v: string) => v.slice(0, 7)}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: "#525252", fontSize: 9, fontFamily: "monospace" }}
                  tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0a0a0a",
                    border: "1px solid #1f1f1f",
                    borderRadius: "6px",
                    fontFamily: "monospace",
                    fontSize: "11px",
                  }}
                  formatter={(v: number) => [`${v.toFixed(2)}%`, "Cumulative P&L"]}
                />
                <ReferenceLine y={0} stroke="#525252" />
                <Line
                  type="monotone"
                  dataKey="pnl"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="font-mono text-[9px] text-navy-600 mt-2">
              Hypothetical only. Position sizes scaled by prediction confidence. Does not include transaction costs, slippage, or funding.
            </p>
          </div>
        </div>
      )}

      {/* ── Portfolio P&L ── */}
      {r.portfolio && (
        <>
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-8 bg-navy-700" />
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">
                Portfolio Simulation (Real Dollar P&L)
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
              <Metric
                label="Initial Capital"
                value={`$${n(r.portfolio.initialCapital).toLocaleString()}`}
              />
              <Metric
                label="Final Value"
                value={`$${Math.round(n(r.portfolio.finalValue)).toLocaleString()}`}
                color={n(r.portfolio.totalReturn) >= 0 ? "#10b981" : "#ef4444"}
              />
              <Metric
                label="Total Return"
                value={`${n(r.portfolio.totalReturn) >= 0 ? "+" : ""}$${Math.round(n(r.portfolio.totalReturn)).toLocaleString()}`}
                subtitle={`${(n(r.portfolio.totalReturnPct) * 100).toFixed(1)}%`}
                color={n(r.portfolio.totalReturn) >= 0 ? "#10b981" : "#ef4444"}
              />
              <Metric
                label="Annualized Return"
                value={`${(n(r.portfolio.annualizedReturn) * 100).toFixed(1)}%`}
                color={n(r.portfolio.annualizedReturn) >= 0 ? "#10b981" : "#ef4444"}
              />
              <Metric
                label="Max Drawdown"
                value={`-$${Math.round(n(r.portfolio.maxDrawdown)).toLocaleString()}`}
                subtitle={`-${(n(r.portfolio.maxDrawdownPct) * 100).toFixed(1)}% on ${r.portfolio.maxDrawdownDate?.slice(0, 10) || "N/A"}`}
                color="#ef4444"
              />
              <Metric
                label="Total Trades"
                value={`${r.portfolio.totalTrades || 0}`}
                subtitle={`$${Math.round(n(r.portfolio.totalCosts)).toLocaleString()} costs`}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <Metric
                label="Sharpe Ratio"
                value={n(r.portfolio.sharpeRatio).toFixed(2)}
                color={n(r.portfolio.sharpeRatio) > 1 ? "#10b981" : n(r.portfolio.sharpeRatio) > 0.5 ? "#f59e0b" : "#ef4444"}
              />
              <Metric
                label="Sortino Ratio"
                value={n(r.portfolio.sortinoRatio).toFixed(2)}
                color={n(r.portfolio.sortinoRatio) > 1 ? "#10b981" : n(r.portfolio.sortinoRatio) > 0.5 ? "#f59e0b" : "#ef4444"}
              />
              <Metric
                label="Win Rate"
                value={`${(n(r.portfolio.winRate) * 100).toFixed(1)}%`}
                subtitle={`Avg win: +$${Math.round(n(r.portfolio.avgWin)).toLocaleString()} / Avg loss: -$${Math.round(Math.abs(n(r.portfolio.avgLoss))).toLocaleString()}`}
                color={n(r.portfolio.winRate) > 0.5 ? "#10b981" : "#ef4444"}
              />
              <Metric
                label="Profit Factor"
                value={r.portfolio.profitFactor === Infinity ? "Inf" : n(r.portfolio.profitFactor).toFixed(2)}
                color={n(r.portfolio.profitFactor) > 1.5 ? "#10b981" : n(r.portfolio.profitFactor) > 1 ? "#f59e0b" : "#ef4444"}
              />
            </div>
          </div>

          {/* Equity curve */}
          {r.portfolio.equityCurve?.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px w-8 bg-navy-700" />
                <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">
                  Equity Curve
                </h2>
              </div>
              <div className="border border-navy-700/30 rounded-lg bg-navy-900/40 p-4">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={r.portfolio.equityCurve}>
                    <defs>
                      <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#525252", fontSize: 9, fontFamily: "monospace" }}
                      tickFormatter={(v: string) => v.slice(0, 7)}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: "#525252", fontSize: 9, fontFamily: "monospace" }}
                      tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0a0a0a",
                        border: "1px solid #1f1f1f",
                        borderRadius: "6px",
                        fontFamily: "monospace",
                        fontSize: "11px",
                      }}
                      formatter={(v: number) => [`$${Math.round(v).toLocaleString()}`, "Portfolio Value"]}
                      labelFormatter={(l: string) => `Date: ${l}`}
                    />
                    <ReferenceLine
                      y={r.portfolio.initialCapital}
                      stroke="#525252"
                      strokeDasharray="5 5"
                      label={{
                        value: `$${(n(r.portfolio.initialCapital) / 1000).toFixed(0)}k initial`,
                        fill: "#525252",
                        fontSize: 9,
                        fontFamily: "monospace",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="portfolioValue"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#equityGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <p className="font-mono text-[9px] text-navy-600 mt-2">
                  Simulated portfolio value over time. Position size: {((r.portfolio.tradeLog?.[0]?.positionSize || 0) > 0 ? "variable" : "fixed")} per trade, scaled by prediction confidence. Includes {n(r.portfolio.totalCosts) > 0 ? `$${Math.round(n(r.portfolio.totalCosts)).toLocaleString()} in` : "no"} trading costs.
                </p>
              </div>
            </div>
          )}

          {/* Drawdown chart */}
          {r.portfolio.equityCurve?.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px w-8 bg-navy-700" />
                <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">
                  Drawdown
                </h2>
              </div>
              <div className="border border-navy-700/30 rounded-lg bg-navy-900/40 p-4">
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={r.portfolio.equityCurve}>
                    <defs>
                      <linearGradient id="ddGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#525252", fontSize: 9, fontFamily: "monospace" }}
                      tickFormatter={(v: string) => v.slice(0, 7)}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: "#525252", fontSize: 9, fontFamily: "monospace" }}
                      tickFormatter={(v: number) => `${(v * -100).toFixed(0)}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0a0a0a",
                        border: "1px solid #1f1f1f",
                        borderRadius: "6px",
                        fontFamily: "monospace",
                        fontSize: "11px",
                      }}
                      formatter={(v: number) => [`-${(v * 100).toFixed(2)}%`, "Drawdown"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="drawdownPct"
                      stroke="#ef4444"
                      strokeWidth={1.5}
                      fill="url(#ddGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Trade log */}
          {r.portfolio.tradeLog?.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px w-8 bg-navy-700" />
                <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">
                  Trade Log ({r.portfolio.tradeLog.length} trades)
                </h2>
              </div>
              <div className="border border-navy-700/30 rounded-lg bg-navy-900/40 overflow-hidden max-h-[400px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-navy-900/90 backdrop-blur-sm">
                    <tr className="font-mono text-[9px] uppercase tracking-widest text-navy-500 border-b border-navy-700/20">
                      <th className="text-left px-4 py-2">Date</th>
                      <th className="text-left px-2 py-2">Direction</th>
                      <th className="text-left px-2 py-2">Instruments</th>
                      <th className="text-right px-2 py-2">Confidence</th>
                      <th className="text-right px-2 py-2">Position</th>
                      <th className="text-right px-2 py-2">P&L</th>
                      <th className="text-right px-2 py-2">P&L %</th>
                      <th className="text-right px-2 py-2">Cost</th>
                      <th className="text-center px-4 py-2">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.portfolio.tradeLog.map((t: TradeRecord, i: number) => (
                      <tr
                        key={i}
                        className="border-b border-navy-700/10 hover:bg-navy-800/20 transition-colors"
                      >
                        <td className="px-4 py-2.5 font-mono text-[10px] text-navy-400">{t.date}</td>
                        <td className="px-2 py-2.5">
                          <span
                            className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                            style={{
                              color: t.direction === "bullish" ? "#10b981" : t.direction === "bearish" ? "#ef4444" : "#6b7280",
                              backgroundColor: t.direction === "bullish" ? "#10b98110" : t.direction === "bearish" ? "#ef444410" : "#6b728010",
                            }}
                          >
                            {t.direction}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 font-mono text-[10px] text-navy-300">{t.instruments.join(", ")}</td>
                        <td className="px-2 py-2.5 font-mono text-[10px] text-navy-400 text-right">{(n(t.confidence) * 100).toFixed(0)}%</td>
                        <td className="px-2 py-2.5 font-mono text-[10px] text-navy-400 text-right">${Math.round(n(t.positionSize)).toLocaleString()}</td>
                        <td
                          className="px-2 py-2.5 font-mono text-[10px] font-semibold text-right"
                          style={{ color: n(t.pnl) >= 0 ? "#10b981" : "#ef4444" }}
                        >
                          {n(t.pnl) >= 0 ? "+" : ""}${Math.round(n(t.pnl)).toLocaleString()}
                        </td>
                        <td
                          className="px-2 py-2.5 font-mono text-[10px] text-right"
                          style={{ color: n(t.pnlPct) >= 0 ? "#10b981" : "#ef4444" }}
                        >
                          {n(t.pnlPct) >= 0 ? "+" : ""}{(n(t.pnlPct) * 100).toFixed(1)}%
                        </td>
                        <td className="px-2 py-2.5 font-mono text-[10px] text-navy-500 text-right">${Math.round(n(t.cost)).toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span
                            className="font-mono text-[9px] uppercase tracking-wider"
                            style={{ color: t.outcome === "win" ? "#10b981" : "#ef4444" }}
                          >
                            {t.outcome}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Calibration curve ── */}
      {r.calibrationCurve?.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-8 bg-navy-700" />
            <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">
              Calibration Curve (predicted vs observed frequency)
            </h2>
          </div>
          <div className="border border-navy-700/30 rounded-lg bg-navy-900/40 p-4">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={r.calibrationCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                <XAxis
                  dataKey="range"
                  tick={{ fill: "#525252", fontSize: 9, fontFamily: "monospace" }}
                />
                <YAxis
                  tick={{ fill: "#525252", fontSize: 9, fontFamily: "monospace" }}
                  tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                  domain={[0, 1]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0a0a0a",
                    border: "1px solid #1f1f1f",
                    borderRadius: "6px",
                    fontFamily: "monospace",
                    fontSize: "11px",
                  }}
                  formatter={(v: number, name: string) => [
                    `${(v * 100).toFixed(1)}%`,
                    name === "observedFrequency" ? "Observed" : "Expected",
                  ]}
                />
                <Bar dataKey="expectedFrequency" fill="#525252" opacity={0.3} name="Expected" />
                <Bar dataKey="observedFrequency" name="Observed">
                  {r.calibrationCurve.map((entry: { observedFrequency: number; expectedFrequency: number }, i: number) => (
                    <Cell
                      key={i}
                      fill={
                        Math.abs(entry.observedFrequency - entry.expectedFrequency) < 0.1
                          ? "#10b981"
                          : "#f59e0b"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="font-mono text-[9px] text-navy-600 mt-2">
              A well-calibrated system shows observed frequencies matching expected frequencies across all confidence buckets.
            </p>
          </div>
        </div>
      )}

      {/* ── Breakdowns ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By timeframe */}
        {r.byTimeframe && Object.keys(r.byTimeframe).length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-8 bg-navy-700" />
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">
                By Timeframe
              </h2>
            </div>
            <div className="border border-navy-700/30 rounded-lg bg-navy-900/40 overflow-hidden">
              <div className="grid grid-cols-4 gap-px bg-navy-700/10 text-center font-mono text-[9px] uppercase tracking-widest text-navy-500">
                <div className="bg-navy-900/60 py-2 px-2">Window</div>
                <div className="bg-navy-900/60 py-2 px-2">Accuracy</div>
                <div className="bg-navy-900/60 py-2 px-2">Brier</div>
                <div className="bg-navy-900/60 py-2 px-2">n</div>
              </div>
              {Object.entries(r.byTimeframe).map(([tf, stats]: [string, any]) => (
                <div
                  key={tf}
                  className="grid grid-cols-4 gap-px text-center border-t border-navy-700/10"
                >
                  <div className="bg-navy-900/30 py-2.5 font-mono text-xs text-navy-300">
                    {tf}d
                  </div>
                  <div
                    className="bg-navy-900/30 py-2.5 font-mono text-xs font-bold"
                    style={{
                      color: n(stats.directionalAccuracy) > 0.55 ? "#10b981" : n(stats.directionalAccuracy) > 0.5 ? "#f59e0b" : "#ef4444",
                    }}
                  >
                    {(n(stats.directionalAccuracy) * 100).toFixed(1)}%
                  </div>
                  <div className="bg-navy-900/30 py-2.5 font-mono text-xs text-navy-400">
                    {n(stats.brierScore).toFixed(3)}
                  </div>
                  <div className="bg-navy-900/30 py-2.5 font-mono text-xs text-navy-500">
                    {stats.count || 0}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* By category */}
        {r.byCategory && Object.keys(r.byCategory).length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-8 bg-navy-700" />
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">
                By Category
              </h2>
            </div>
            <div className="border border-navy-700/30 rounded-lg bg-navy-900/40 overflow-hidden">
              <div className="grid grid-cols-4 gap-px bg-navy-700/10 text-center font-mono text-[9px] uppercase tracking-widest text-navy-500">
                <div className="bg-navy-900/60 py-2 px-2">Category</div>
                <div className="bg-navy-900/60 py-2 px-2">Accuracy</div>
                <div className="bg-navy-900/60 py-2 px-2">Brier</div>
                <div className="bg-navy-900/60 py-2 px-2">n</div>
              </div>
              {Object.entries(r.byCategory).map(([cat, stats]: [string, any]) => (
                <div
                  key={cat}
                  className="grid grid-cols-4 gap-px text-center border-t border-navy-700/10"
                >
                  <div className="bg-navy-900/30 py-2.5 font-mono text-xs text-navy-300 capitalize">
                    {cat}
                  </div>
                  <div
                    className="bg-navy-900/30 py-2.5 font-mono text-xs font-bold"
                    style={{
                      color: n(stats.directionalAccuracy) > 0.55 ? "#10b981" : n(stats.directionalAccuracy) > 0.5 ? "#f59e0b" : "#ef4444",
                    }}
                  >
                    {(n(stats.directionalAccuracy) * 100).toFixed(1)}%
                  </div>
                  <div className="bg-navy-900/30 py-2.5 font-mono text-xs text-navy-400">
                    {n(stats.brierScore).toFixed(3)}
                  </div>
                  <div className="bg-navy-900/30 py-2.5 font-mono text-xs text-navy-500">
                    {stats.count || 0}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* By year */}
      {r.byYear && Object.keys(r.byYear).length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-8 bg-navy-700" />
            <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">
              Year-over-Year Performance
            </h2>
          </div>
          <div className="border border-navy-700/30 rounded-lg bg-navy-900/40 p-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={Object.entries(r.byYear).map(([year, stats]: [string, any]) => ({
                  year,
                  accuracy: n(stats.directionalAccuracy) * 100,
                  baseline: 50,
                  count: stats.count || 0,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                <XAxis
                  dataKey="year"
                  tick={{ fill: "#525252", fontSize: 9, fontFamily: "monospace" }}
                />
                <YAxis
                  tick={{ fill: "#525252", fontSize: 9, fontFamily: "monospace" }}
                  domain={[30, 80]}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0a0a0a",
                    border: "1px solid #1f1f1f",
                    borderRadius: "6px",
                    fontFamily: "monospace",
                    fontSize: "11px",
                  }}
                />
                <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="5 5" />
                <Bar dataKey="accuracy" name="Accuracy (%)">
                  {Object.entries(r.byYear).map(([year, stats]: [string, any]) => (
                    <Cell
                      key={year}
                      fill={
                        n(stats.directionalAccuracy) > 0.55
                          ? "#10b981"
                          : n(stats.directionalAccuracy) > 0.5
                          ? "#f59e0b"
                          : "#ef4444"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* By instrument */}
      {r.byInstrument && Object.keys(r.byInstrument).length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-8 bg-navy-700" />
            <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">
              By Instrument
            </h2>
          </div>
          <div className="border border-navy-700/30 rounded-lg bg-navy-900/40 overflow-hidden">
            <div className="grid grid-cols-5 gap-px bg-navy-700/10 text-center font-mono text-[9px] uppercase tracking-widest text-navy-500">
              <div className="bg-navy-900/60 py-2 px-2">Symbol</div>
              <div className="bg-navy-900/60 py-2 px-2">Accuracy</div>
              <div className="bg-navy-900/60 py-2 px-2">Win Rate</div>
              <div className="bg-navy-900/60 py-2 px-2">Avg Return</div>
              <div className="bg-navy-900/60 py-2 px-2">n</div>
            </div>
            {Object.entries(r.byInstrument)
              .sort((a: [string, any], b: [string, any]) => (b[1].count || 0) - (a[1].count || 0))
              .map(([sym, stats]: [string, any]) => (
                <div
                  key={sym}
                  className="grid grid-cols-5 gap-px text-center border-t border-navy-700/10"
                >
                  <div className="bg-navy-900/30 py-2.5 font-mono text-xs text-navy-200 font-semibold">
                    {sym}
                  </div>
                  <div
                    className="bg-navy-900/30 py-2.5 font-mono text-xs font-bold"
                    style={{
                      color: n(stats.directionalAccuracy) > 0.55 ? "#10b981" : n(stats.directionalAccuracy) > 0.5 ? "#f59e0b" : "#ef4444",
                    }}
                  >
                    {(n(stats.directionalAccuracy) * 100).toFixed(1)}%
                  </div>
                  <div className="bg-navy-900/30 py-2.5 font-mono text-xs text-navy-400">
                    {(n(stats.winRate) * 100).toFixed(1)}%
                  </div>
                  <div
                    className="bg-navy-900/30 py-2.5 font-mono text-xs"
                    style={{ color: n(stats.avgReturn) >= 0 ? "#10b981" : "#ef4444" }}
                  >
                    {n(stats.avgReturn) >= 0 ? "+" : ""}
                    {n(stats.avgReturn).toFixed(2)}%
                  </div>
                  <div className="bg-navy-900/30 py-2.5 font-mono text-xs text-navy-500">
                    {stats.count || 0}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── Statistical significance panel ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px w-8 bg-navy-700" />
          <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">
            Statistical Significance
          </h2>
        </div>
        <div className="border border-navy-700/30 rounded-lg bg-navy-900/40 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <span className="font-mono text-[9px] uppercase tracking-wider text-navy-500 block mb-1">
                Null Hypothesis
              </span>
              <p className="font-sans text-xs text-navy-400">
                H<sub>0</sub>: System directional accuracy = 50% (random)
              </p>
            </div>
            <div>
              <span className="font-mono text-[9px] uppercase tracking-wider text-navy-500 block mb-1">
                Test Statistic
              </span>
              <p className="font-sans text-xs text-navy-400">
                Binomial proportion test (normal approximation, n={r.totalValidated || 0})
              </p>
            </div>
            <div>
              <span className="font-mono text-[9px] uppercase tracking-wider text-navy-500 block mb-1">
                Result
              </span>
              <p className="font-sans text-xs" style={{ color: r.significant ? "#10b981" : "#f59e0b" }}>
                p = {n(r.pValue) < 0.001 ? "<0.001" : n(r.pValue).toFixed(4)}
                {r.significant
                  ? " - Reject H0 at 95% confidence"
                  : " - Fail to reject H0"}
              </p>
            </div>
          </div>

          <div className="border-t border-navy-700/20 pt-4">
            <span className="font-mono text-[9px] uppercase tracking-wider text-navy-500 block mb-2">
              Methodology Notes
            </span>
            <ul className="space-y-1.5">
              {[
                "All predictions generated with strict temporal isolation - the AI has zero access to data after the prediction date",
                "Signal convergence events are computed from deterministic calendar, celestial, and geopolitical algorithms with no future information leakage",
                "Market validation uses actual historical price data from Alpha Vantage with nearest-trading-day matching",
                "Brier scoring penalises overconfidence: confident wrong predictions are scored more harshly than uncertain wrong predictions",
                "No parameter tuning, optimisation, or cherry-picking was applied to the results after generation",
                "Hypothetical P&L is illustrative only and does not account for transaction costs, slippage, liquidity, or market impact",
              ].map((note) => (
                <li
                  key={note}
                  className="flex items-start gap-2 font-sans text-[11px] text-navy-400 leading-relaxed"
                >
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-navy-600" />
                  {note}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── AI Analysis ── */}
      {r.aiAnalysis && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-8 bg-navy-700" />
            <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">
              AI Analysis
            </h2>
            <button
              onClick={() => setShowAnalysis(!showAnalysis)}
              className="font-mono text-[10px] text-accent-cyan hover:text-accent-cyan/80 transition-colors"
            >
              {showAnalysis ? "Collapse" : "Expand"}
            </button>
          </div>
          {showAnalysis && (
            <div className="border border-navy-700/30 rounded-lg bg-navy-900/40 p-6">
              <div className="prose prose-sm prose-invert max-w-none font-sans text-sm text-navy-300 leading-relaxed whitespace-pre-wrap">
                {r.aiAnalysis}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Prediction log ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px w-8 bg-navy-700" />
          <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">
            Prediction Log ({run.predictions.length} predictions)
          </h2>
        </div>
        <div className="border border-navy-700/30 rounded-lg bg-navy-900/40 overflow-hidden max-h-[400px] overflow-y-auto">
          {run.predictions.slice(0, 100).map((p, i) => (
            <div
              key={i}
              className={`px-4 py-3 ${
                i < Math.min(run.predictions.length, 100) - 1
                  ? "border-b border-navy-700/10"
                  : ""
              } hover:bg-navy-800/20 transition-colors`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-navy-500">
                    {p.predictionDate}
                  </span>
                  <span
                    className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{
                      color:
                        p.direction === "bullish"
                          ? "#10b981"
                          : p.direction === "bearish"
                          ? "#ef4444"
                          : "#6b7280",
                      backgroundColor:
                        p.direction === "bullish"
                          ? "#10b98110"
                          : p.direction === "bearish"
                          ? "#ef444410"
                          : "#6b728010",
                    }}
                  >
                    {p.direction}
                  </span>
                  <span className="font-mono text-[10px] text-navy-400">
                    {p.instruments.join(", ")}
                  </span>
                  <span className="font-mono text-[9px] text-navy-600">
                    {p.timeframeDays}d
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-navy-500">
                    {(n(p.confidence) * 100).toFixed(0)}%
                  </span>
                  {p.outcome && (
                    <span
                      className="font-mono text-[9px] uppercase tracking-wider"
                      style={{
                        color:
                          p.outcome === "confirmed"
                            ? "#10b981"
                            : p.outcome === "denied"
                            ? "#ef4444"
                            : "#f59e0b",
                      }}
                    >
                      {p.outcome}
                    </span>
                  )}
                </div>
              </div>
              <p className="font-sans text-[11px] text-navy-400 truncate">
                {p.claim}
              </p>
            </div>
          ))}
          {run.predictions.length > 100 && (
            <div className="px-4 py-3 text-center font-mono text-[10px] text-navy-500">
              Showing 100 of {run.predictions.length} predictions
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ──
export default function BacktestDetailPage() {
  const params = useParams();
  const id = params.uuid as string;
  const [run, setRun] = useState<BacktestRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        const res = await fetch(`/api/admin/backtest/${id}`);
        if (res.ok) {
          setRun(await res.json());
        } else {
          setError(`Failed to load backtest: HTTP ${res.status}`);
        }
      } catch (err) {
        setError("Failed to load backtest run");
      }
    };

    load();

    // Poll if still running
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/backtest/${id}`);
        if (res.ok) {
          const data = await res.json();
          setRun(data);
          if (data.status === "complete" || data.status === "failed") {
            clearInterval(poll);
          }
        }
      } catch {}
    }, 3000);

    return () => clearInterval(poll);
  }, [id]);

  return (
    <main className="min-h-screen p-6 ml-48">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/admin/backtest"
            className="flex items-center gap-1.5 font-mono text-[10px] text-navy-500 hover:text-navy-300 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            All Backtests
          </Link>
          <span className="font-mono text-[10px] text-navy-700">/</span>
          <span className="font-mono text-[10px] text-navy-400">
            {id?.slice(0, 12)}...
          </span>
        </div>

        {error && (
          <div className="rounded bg-accent-rose/10 border border-accent-rose/20 px-4 py-3">
            <p className="font-mono text-[11px] text-accent-rose">{error}</p>
          </div>
        )}

        {!run && !error && (
          <div className="flex items-center gap-3 py-12 justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-navy-500" />
            <span className="font-mono text-xs text-navy-400">Loading backtest run...</span>
          </div>
        )}

        {run && (
          <div className="space-y-6">
            <div className="mb-4">
              <h1 className="text-2xl font-bold tracking-tight text-navy-100">
                Backtest Results
              </h1>
              <p className="mt-1 font-mono text-[10px] text-navy-500">
                Created {new Date(run.createdAt).toLocaleString()} | {run.predictions.length} predictions
              </p>
            </div>

            <ProgressPanel run={run} />

            {run.status === "complete" && run.results && (
              <ResultsDashboard run={run} />
            )}
          </div>
        )}
      </div>
    </main>
  );
}
