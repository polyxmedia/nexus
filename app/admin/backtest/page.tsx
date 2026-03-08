"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  BarChart3,
  Target,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
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
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import type { BacktestRun, BacktestResults } from "@/lib/backtest/types";

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

// ── Suggested scenarios ──
const SUGGESTED_SCENARIOS = [
  {
    id: "gold_2020",
    label: "Gold Run — COVID Shock",
    description: "Multi-layer convergence (celestial + geopolitical + economic) against Gold and TLT during the March 2020 crash and subsequent safe-haven rally.",
    badge: "Macro",
    badgeColor: "#f59e0b",
    config: {
      startDate: "2019-06-01",
      endDate: "2021-06-30",
      convergenceThreshold: 3,
      instruments: ["GLD", "TLT", "SPY", "GDX"],
      includeFx: false,
      includeCrypto: false,
      timeframes: [7, 14, 30],
    },
  },
  {
    id: "energy_2022",
    label: "Energy Spike — Russia-Ukraine",
    description: "Geopolitical + celestial convergences against crude oil and energy ETFs during the Feb 2022 invasion and subsequent commodity supercycle.",
    badge: "Geopolitical",
    badgeColor: "#ef4444",
    config: {
      startDate: "2021-09-01",
      endDate: "2023-03-31",
      convergenceThreshold: 3,
      instruments: ["USO", "XLE", "OIH", "SPY"],
      includeFx: false,
      includeCrypto: false,
      timeframes: [7, 14, 30],
    },
  },
  {
    id: "crypto_cycle",
    label: "Crypto Halving Cycles",
    description: "Celestial and Hebrew calendar convergences against BTC and ETH across the 2020 and 2024 halving cycles. Tests esoteric timing signals against hard-coded supply events.",
    badge: "Crypto",
    badgeColor: "#8b5cf6",
    config: {
      startDate: "2020-01-01",
      endDate: "2024-12-31",
      convergenceThreshold: 2,
      instruments: ["BTC", "ETH", "MSTR", "COIN"],
      includeFx: false,
      includeCrypto: true,
      timeframes: [7, 14, 30],
    },
  },
  {
    id: "fed_pivot_2022",
    label: "Fed Tightening Cycle 2022–23",
    description: "Economic + celestial convergences against rates-sensitive instruments (TLT, XLU, REIT) during the most aggressive Fed hiking cycle in 40 years.",
    badge: "Macro",
    badgeColor: "#f59e0b",
    config: {
      startDate: "2022-01-01",
      endDate: "2023-12-31",
      convergenceThreshold: 3,
      instruments: ["TLT", "IEF", "XLU", "VNQ", "SPY"],
      includeFx: true,
      includeCrypto: false,
      timeframes: [14, 30],
    },
  },
  {
    id: "mideast_oil",
    label: "Middle East Flashpoints vs Oil",
    description: "Geopolitical + Islamic calendar convergences against oil and defense during major Middle East escalation events including Oct 7 2023 and Red Sea disruptions.",
    badge: "Geopolitical",
    badgeColor: "#ef4444",
    config: {
      startDate: "2023-06-01",
      endDate: "2024-12-31",
      convergenceThreshold: 3,
      instruments: ["USO", "XLE", "ITA", "GLD", "SPY"],
      includeFx: false,
      includeCrypto: false,
      timeframes: [7, 14, 30],
    },
  },
  {
    id: "full_5yr",
    label: "Full 5-Year Flagship Run",
    description: "Complete multi-layer signal backtest across all major asset classes 2020–2025. The definitive proof-of-concept: 5 years, 7 instruments, all signal layers. Takes ~15 min.",
    badge: "Flagship",
    badgeColor: "#06b6d4",
    config: {
      startDate: "2020-01-01",
      endDate: "2024-12-31",
      convergenceThreshold: 3,
      instruments: ["SPY", "QQQ", "GLD", "TLT", "USO", "BTC", "EFA"],
      includeFx: true,
      includeCrypto: true,
      timeframes: [7, 14, 30],
    },
  },
] as const;

function ScenarioPresets({
  onSelect,
  loading,
}: {
  onSelect: (config: Record<string, unknown>) => void;
  loading: boolean;
}) {
  return (
    <div className="mb-6">
      <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-3">
        Suggested Scenarios
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {SUGGESTED_SCENARIOS.map((s) => (
          <div
            key={s.id}
            className="border border-navy-700/30 rounded-lg bg-navy-900/30 p-4 flex flex-col gap-3 hover:border-navy-600/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider"
                    style={{ color: s.badgeColor, backgroundColor: `${s.badgeColor}18`, border: `1px solid ${s.badgeColor}30` }}
                  >
                    {s.badge}
                  </span>
                </div>
                <h3 className="font-mono text-[11px] font-semibold text-navy-100">{s.label}</h3>
              </div>
            </div>
            <p className="font-sans text-[10px] text-navy-500 leading-relaxed flex-1">{s.description}</p>
            <div className="flex items-center gap-2 text-[9px] font-mono text-navy-600">
              <span>{s.config.startDate.slice(0, 7)}</span>
              <span>→</span>
              <span>{s.config.endDate.slice(0, 7)}</span>
              <span className="ml-auto">{([...s.config.instruments] as string[]).join(", ")}</span>
            </div>
            <button
              onClick={() => onSelect({ ...s.config })}
              disabled={loading}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono border border-navy-700/40 text-navy-400 hover:text-accent-cyan hover:border-accent-cyan/30 hover:bg-accent-cyan/5 transition-colors disabled:opacity-40"
            >
              <Play className="w-2.5 h-2.5" />
              Run this scenario
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Configuration form ──
function ConfigForm({
  onStart,
  loading,
}: {
  onStart: (config: Record<string, unknown>) => void;
  loading: boolean;
}) {
  const [startDate, setStartDate] = useState("2020-01-01");
  const [endDate, setEndDate] = useState("2024-12-31");
  const [threshold, setThreshold] = useState(3);
  const [includeFx, setIncludeFx] = useState(true);
  const [includeCrypto, setIncludeCrypto] = useState(true);
  const [timeframes, setTimeframes] = useState([7, 14, 30]);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-navy-700/30 rounded-lg bg-navy-900/40 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-200">
          Backtest Configuration
        </h2>
        <button
          onClick={() => setExpanded(!expanded)}
          className="font-mono text-[10px] text-navy-500 hover:text-navy-300 transition-colors flex items-center gap-1"
        >
          Advanced
          {expanded ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block font-mono text-[9px] uppercase tracking-wider text-navy-500 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-navy-800/60 border border-navy-700/30 rounded px-3 py-2 font-mono text-xs text-navy-200 focus:outline-none focus:border-accent-cyan/40"
          />
        </div>
        <div>
          <label className="block font-mono text-[9px] uppercase tracking-wider text-navy-500 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-navy-800/60 border border-navy-700/30 rounded px-3 py-2 font-mono text-xs text-navy-200 focus:outline-none focus:border-accent-cyan/40"
          />
        </div>
        <div>
          <label className="block font-mono text-[9px] uppercase tracking-wider text-navy-500 mb-1">
            Min Convergence
          </label>
          <select
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full bg-navy-800/60 border border-navy-700/30 rounded px-3 py-2 font-mono text-xs text-navy-200 focus:outline-none focus:border-accent-cyan/40"
          >
            {[2, 3, 4, 5].map((v) => (
              <option key={v} value={v}>
                {v}/5 intensity
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeFx}
              onChange={(e) => setIncludeFx(e.target.checked)}
              className="rounded border-navy-600 bg-navy-800"
            />
            <span className="font-mono text-[10px] text-navy-400">FX</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeCrypto}
              onChange={(e) => setIncludeCrypto(e.target.checked)}
              className="rounded border-navy-600 bg-navy-800"
            />
            <span className="font-mono text-[10px] text-navy-400">Crypto</span>
          </label>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-navy-700/20 pt-4 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-wider text-navy-500 mb-1">
                Prediction Timeframes (days)
              </label>
              <div className="flex gap-2">
                {[7, 14, 30, 90].map((tf) => (
                  <label
                    key={tf}
                    className="flex items-center gap-1.5 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={timeframes.includes(tf)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTimeframes([...timeframes, tf].sort((a, b) => a - b));
                        } else {
                          setTimeframes(timeframes.filter((t) => t !== tf));
                        }
                      }}
                      className="rounded border-navy-600 bg-navy-800"
                    />
                    <span className="font-mono text-[10px] text-navy-400">
                      {tf}d
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() =>
          onStart({
            startDate,
            endDate,
            convergenceThreshold: threshold,
            includeFx,
            includeCrypto,
            timeframes,
          })
        }
        disabled={loading}
        className="flex items-center gap-2 px-5 py-2.5 font-mono text-[11px] uppercase tracking-widest text-navy-100 bg-accent-cyan/10 border border-accent-cyan/20 rounded-lg hover:bg-accent-cyan/20 hover:border-accent-cyan/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Play className="w-3.5 h-3.5" />
        )}
        {loading ? "Running..." : "Start Backtest"}
      </button>

      <div className="mt-4 border border-navy-700/20 rounded bg-navy-800/20 px-4 py-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-accent-amber shrink-0 mt-0.5" />
          <p className="font-sans text-[11px] text-navy-500 leading-relaxed">
            Historical price data is sourced from Yahoo Finance (no rate limits). Runtime is driven by Claude AI inference — roughly 2–3 seconds per convergence event. A focused 2-year scenario typically completes in 5–10 minutes. The process runs in the background; you can leave this page and return.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Progress panel ──
function ProgressPanel({ run }: { run: BacktestRun }) {
  const statusColors: Record<string, string> = {
    pending: "#6b7280",
    collecting_data: "#06b6d4",
    generating_signals: "#f59e0b",
    simulating: "#8b5cf6",
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
    ((r.randomBaseline.brierScore - r.brierScore) / r.randomBaseline.brierScore) * 100;

  const accuracyLift =
    ((r.directionalAccuracy - r.randomBaseline.directionalAccuracy) /
      r.randomBaseline.directionalAccuracy) *
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
            value={`${(r.directionalAccuracy * 100).toFixed(1)}%`}
            subtitle={`vs ${(r.randomBaseline.directionalAccuracy * 100).toFixed(0)}% random (+${accuracyLift.toFixed(0)}%)`}
            color={r.directionalAccuracy > 0.55 ? "#10b981" : r.directionalAccuracy > 0.5 ? "#f59e0b" : "#ef4444"}
          />
          <Metric
            label="Brier Score"
            value={r.brierScore.toFixed(4)}
            subtitle={`vs ${r.randomBaseline.brierScore.toFixed(4)} random (${brierImprovement > 0 ? "+" : ""}${brierImprovement.toFixed(1)}%)`}
            color={r.brierScore < r.randomBaseline.brierScore ? "#10b981" : "#ef4444"}
          />
          <Metric
            label="p-Value"
            value={r.pValue < 0.001 ? "<0.001" : r.pValue.toFixed(4)}
            subtitle={r.significant ? "Statistically significant" : "Not significant"}
            color={r.significant ? "#10b981" : "#f59e0b"}
          />
          <Metric
            label="Sample Size"
            value={`n=${r.totalValidated}`}
            subtitle={`${r.totalPredictions} total, ${r.yearsSpanned}yr span`}
          />
          <Metric
            label="Calibration Gap"
            value={`${(r.calibrationGap * 100).toFixed(1)}pp`}
            subtitle={r.calibrationGap < 0.05 ? "Well calibrated" : "Miscalibrated"}
            color={r.calibrationGap < 0.05 ? "#10b981" : "#f59e0b"}
          />
          <Metric
            label="Log Loss"
            value={r.logLoss.toFixed(4)}
            subtitle={`Avg conf: ${(r.avgConfidence * 100).toFixed(1)}%`}
          />
        </div>
      </div>

      {/* ── Cumulative accuracy chart ── */}
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

      {/* ── Brier score over time ── */}
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

      {/* ── Hypothetical P&L ── */}
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

      {/* ── Calibration curve ── */}
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
                {r.calibrationCurve.map((entry, i) => (
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

      {/* ── Breakdowns ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By timeframe */}
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
            {Object.entries(r.byTimeframe).map(([tf, stats]) => (
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
                    color: stats.directionalAccuracy > 0.55 ? "#10b981" : stats.directionalAccuracy > 0.5 ? "#f59e0b" : "#ef4444",
                  }}
                >
                  {(stats.directionalAccuracy * 100).toFixed(1)}%
                </div>
                <div className="bg-navy-900/30 py-2.5 font-mono text-xs text-navy-400">
                  {stats.brierScore.toFixed(3)}
                </div>
                <div className="bg-navy-900/30 py-2.5 font-mono text-xs text-navy-500">
                  {stats.count}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By category */}
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
            {Object.entries(r.byCategory).map(([cat, stats]) => (
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
                    color: stats.directionalAccuracy > 0.55 ? "#10b981" : stats.directionalAccuracy > 0.5 ? "#f59e0b" : "#ef4444",
                  }}
                >
                  {(stats.directionalAccuracy * 100).toFixed(1)}%
                </div>
                <div className="bg-navy-900/30 py-2.5 font-mono text-xs text-navy-400">
                  {stats.brierScore.toFixed(3)}
                </div>
                <div className="bg-navy-900/30 py-2.5 font-mono text-xs text-navy-500">
                  {stats.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* By year */}
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
              data={Object.entries(r.byYear).map(([year, stats]) => ({
                year,
                accuracy: stats.directionalAccuracy * 100,
                baseline: 50,
                count: stats.count,
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
                {Object.entries(r.byYear).map(([year, stats]) => (
                  <Cell
                    key={year}
                    fill={
                      stats.directionalAccuracy > 0.55
                        ? "#10b981"
                        : stats.directionalAccuracy > 0.5
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

      {/* By instrument */}
      {Object.keys(r.byInstrument).length > 0 && (
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
              .sort((a, b) => b[1].count - a[1].count)
              .map(([sym, stats]) => (
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
                      color: stats.directionalAccuracy > 0.55 ? "#10b981" : stats.directionalAccuracy > 0.5 ? "#f59e0b" : "#ef4444",
                    }}
                  >
                    {(stats.directionalAccuracy * 100).toFixed(1)}%
                  </div>
                  <div className="bg-navy-900/30 py-2.5 font-mono text-xs text-navy-400">
                    {(stats.winRate * 100).toFixed(1)}%
                  </div>
                  <div
                    className="bg-navy-900/30 py-2.5 font-mono text-xs"
                    style={{ color: stats.avgReturn >= 0 ? "#10b981" : "#ef4444" }}
                  >
                    {stats.avgReturn >= 0 ? "+" : ""}
                    {stats.avgReturn.toFixed(2)}%
                  </div>
                  <div className="bg-navy-900/30 py-2.5 font-mono text-xs text-navy-500">
                    {stats.count}
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
                Binomial proportion test (normal approximation, n={r.totalValidated})
              </p>
            </div>
            <div>
              <span className="font-mono text-[9px] uppercase tracking-wider text-navy-500 block mb-1">
                Result
              </span>
              <p className="font-sans text-xs" style={{ color: r.significant ? "#10b981" : "#f59e0b" }}>
                p = {r.pValue < 0.001 ? "<0.001" : r.pValue.toFixed(4)}
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
                    {(p.confidence * 100).toFixed(0)}%
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
export default function BacktestPage() {
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [activeRun, setActiveRun] = useState<BacktestRun | null>(null);
  const [runs, setRuns] = useState<Array<{ id: string; status: string; createdAt: string; predictionCount: number }>>([]);
  const [starting, setStarting] = useState(false);

  // Poll for run status
  useEffect(() => {
    if (!activeRunId) return;

    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/backtest/${activeRunId}`);
        if (res.ok) {
          const data = await res.json();
          setActiveRun(data);
          if (data.status === "complete" || data.status === "failed") {
            clearInterval(poll);
          }
        }
      } catch {}
    }, 3000);

    return () => clearInterval(poll);
  }, [activeRunId]);

  // Load existing runs
  useEffect(() => {
    fetch("/api/admin/backtest")
      .then((r) => r.json())
      .then(setRuns)
      .catch(() => {});
  }, []);

  const handleStart = async (config: Record<string, unknown>) => {
    setStarting(true);
    try {
      const res = await fetch("/api/admin/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      setActiveRunId(data.id);
      setActiveRun(null);
    } catch (err) {
      console.error(err);
    } finally {
      setStarting(false);
    }
  };

  const loadRun = async (id: string) => {
    setActiveRunId(id);
    try {
      const res = await fetch(`/api/admin/backtest/${id}`);
      if (res.ok) {
        setActiveRun(await res.json());
      }
    } catch {}
  };

  return (
    <main className="min-h-screen p-6 ml-48">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/admin"
            className="flex items-center gap-1.5 font-mono text-[10px] text-navy-500 hover:text-navy-300 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Admin
          </Link>
          <span className="font-mono text-[10px] text-navy-700">/</span>
          <span className="font-mono text-[10px] text-navy-400">
            Backtesting
          </span>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-navy-100">
            Signal Convergence Backtesting
          </h1>
          <p className="mt-2 font-sans text-sm text-navy-400 max-w-2xl">
            Scientifically validate the NEXUS prediction methodology against
            historical data. All predictions are generated with strict temporal
            isolation - the AI has zero knowledge of events after the
            prediction date. Results are scored using Brier scoring and tested
            for statistical significance against a random baseline.
          </p>
        </div>

        {/* Suggested scenarios */}
        <div className="mb-6">
          <ScenarioPresets onSelect={handleStart} loading={starting} />
        </div>

        {/* Custom configuration */}
        <div className="mb-8">
          <ConfigForm onStart={handleStart} loading={starting} />
        </div>

        {/* Previous runs */}
        {runs.length > 0 && !activeRunId && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-8 bg-navy-700" />
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">
                Previous Runs
              </h2>
            </div>
            <div className="space-y-2">
              {runs.map((r) => (
                <button
                  key={r.id}
                  onClick={() => loadRun(r.id)}
                  className="w-full text-left border border-navy-700/30 rounded-lg bg-navy-900/40 px-4 py-3 hover:border-navy-600/40 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-navy-500">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                    <span className="font-mono text-xs text-navy-300">
                      {r.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-navy-500">
                      {r.predictionCount} predictions
                    </span>
                    <span
                      className="font-mono text-[9px] uppercase tracking-wider"
                      style={{
                        color: r.status === "complete" ? "#10b981" : r.status === "failed" ? "#ef4444" : "#f59e0b",
                      }}
                    >
                      {r.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active run */}
        {activeRun && (
          <div className="space-y-6">
            <ProgressPanel run={activeRun} />

            {activeRun.status === "complete" && activeRun.results && (
              <ResultsDashboard run={activeRun} />
            )}
          </div>
        )}
      </div>
    </main>
  );
}
