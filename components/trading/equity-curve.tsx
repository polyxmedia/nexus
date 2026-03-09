"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Snapshot {
  totalValue: number;
  pnl: number;
  pnlPercent: number;
  createdAt: string;
}

interface Stats {
  peak: number;
  trough: number;
  maxDrawdown: number;
  cumulativeReturn: number;
  count: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function EquityCurve() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portfolio/snapshots")
      .then((r) => r.json())
      .then((data) => {
        setSnapshots(data.snapshots || []);
        setStats(data.stats || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 p-6 mb-6">
        <div className="h-4 w-32 bg-navy-800/50 rounded animate-pulse mb-4" />
        <div className="h-48 bg-navy-800/20 rounded animate-pulse" />
      </div>
    );
  }

  if (snapshots.length < 2) return null;

  const chartData = snapshots.map((s) => ({
    date: new Date(s.createdAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    }),
    value: Math.round(s.totalValue * 100) / 100,
    pnl: Math.round(s.pnl * 100) / 100,
  }));

  const latest = snapshots[snapshots.length - 1];
  const isPositive = latest.pnl >= 0;
  const gradientId = "equityGrad";
  const strokeColor = isPositive ? "#34d399" : "#f87171";
  const fillStart = isPositive ? "#34d39930" : "#f8717130";

  return (
    <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-navy-400">
          Portfolio Equity Curve
        </h3>
        {stats && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="font-mono text-[9px] uppercase tracking-wider text-navy-600 block">
                Cumulative
              </span>
              <span
                className={`font-mono text-[12px] font-bold ${
                  stats.cumulativeReturn >= 0
                    ? "text-accent-emerald"
                    : "text-accent-rose"
                }`}
              >
                {stats.cumulativeReturn >= 0 ? "+" : ""}
                {stats.cumulativeReturn}%
              </span>
            </div>
            <div className="text-right">
              <span className="font-mono text-[9px] uppercase tracking-wider text-navy-600 block">
                Max Drawdown
              </span>
              <span className="font-mono text-[12px] font-bold text-accent-rose">
                -{stats.maxDrawdown}%
              </span>
            </div>
            <div className="text-right">
              <span className="font-mono text-[9px] uppercase tracking-wider text-navy-600 block">
                Peak
              </span>
              <span className="font-mono text-[12px] font-bold text-navy-200">
                {fmt(stats.peak)}
              </span>
            </div>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fillStart} />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b30" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 9, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => fmt(v)}
            width={70}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0a0a0f",
              border: "1px solid #1e293b50",
              borderRadius: 8,
              fontSize: 11,
              fontFamily: "IBM Plex Mono, monospace",
            }}
            labelStyle={{ color: "#94a3b8", fontSize: 10 }}
            formatter={(value: number, name: string) => [
              fmt(value),
              name === "value" ? "Total Value" : "P&L",
            ]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0, fill: strokeColor }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
