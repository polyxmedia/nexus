"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Play,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { BacktestRun } from "@/lib/backtest/types";

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
    badgeColor: "#f59e0b",
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
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono bg-navy-100 text-navy-950 font-medium hover:bg-white transition-colors disabled:opacity-40"
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
  const [initialCapital, setInitialCapital] = useState(100000);
  const [positionSizePct, setPositionSizePct] = useState(5);
  const [tradingCostBps, setTradingCostBps] = useState(10);

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
        <div className="border-t border-navy-700/20 pt-4 mb-4 space-y-4">
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

          <div className="border-t border-navy-700/20 pt-4">
            <div className="font-mono text-[9px] uppercase tracking-wider text-navy-500 mb-3">
              Portfolio Simulation
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block font-mono text-[9px] uppercase tracking-wider text-navy-500 mb-1">
                  Initial Capital ($)
                </label>
                <input
                  type="number"
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(Number(e.target.value))}
                  min={1000}
                  step={10000}
                  className="w-full bg-navy-800/60 border border-navy-700/30 rounded px-3 py-2 font-mono text-xs text-navy-200 focus:outline-none focus:border-accent-cyan/40"
                />
              </div>
              <div>
                <label className="block font-mono text-[9px] uppercase tracking-wider text-navy-500 mb-1">
                  Position Size (% of portfolio)
                </label>
                <input
                  type="number"
                  value={positionSizePct}
                  onChange={(e) => setPositionSizePct(Number(e.target.value))}
                  min={1}
                  max={50}
                  step={1}
                  className="w-full bg-navy-800/60 border border-navy-700/30 rounded px-3 py-2 font-mono text-xs text-navy-200 focus:outline-none focus:border-accent-cyan/40"
                />
              </div>
              <div>
                <label className="block font-mono text-[9px] uppercase tracking-wider text-navy-500 mb-1">
                  Trading Cost (bps round-trip)
                </label>
                <input
                  type="number"
                  value={tradingCostBps}
                  onChange={(e) => setTradingCostBps(Number(e.target.value))}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full bg-navy-800/60 border border-navy-700/30 rounded px-3 py-2 font-mono text-xs text-navy-200 focus:outline-none focus:border-accent-cyan/40"
                />
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
            initialCapital,
            positionSizePct,
            tradingCostBps,
          })
        }
        disabled={loading}
        className="flex items-center gap-2 px-5 py-2.5 font-mono text-[11px] uppercase tracking-widest text-navy-950 bg-navy-100 rounded-lg hover:bg-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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

// ── Main page ──
export default function BacktestPage() {
  const router = useRouter();
  const [runs, setRuns] = useState<Array<{ id: string; status: string; createdAt: string; predictionCount: number }>>([]);
  const [starting, setStarting] = useState(false);

  // Load existing runs
  useEffect(() => {
    fetch("/api/admin/backtest")
      .then((r) => r.json())
      .then((data: Array<{ id: string; status: string; createdAt: string; predictionCount: number }>) => {
        setRuns(data);
      })
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
      if (data.error) {
        console.error("Backtest start failed:", data.error);
        setStarting(false);
        return;
      }
      // Navigate to the detail page for this run
      router.push(`/admin/backtest/${data.id}`);
    } catch (err) {
      console.error("Backtest start error:", err);
    } finally {
      setStarting(false);
    }
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

        {/* Suggested scenarios + Custom configuration */}
        <div className="mb-6">
          <ScenarioPresets onSelect={handleStart} loading={starting} />
        </div>
        <div className="mb-8">
          <ConfigForm onStart={handleStart} loading={starting} />
        </div>

        {/* Previous runs */}
        {runs.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-8 bg-navy-700" />
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">
                Previous Runs
              </h2>
            </div>
            <div className="space-y-2">
              {runs.map((r) => (
                <Link
                  key={r.id}
                  href={`/admin/backtest/${r.id}`}
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
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
