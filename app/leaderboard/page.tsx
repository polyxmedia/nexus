"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import {
  Trophy,
  Target,
  TrendingUp,
  Users,
  ChevronRight,
  Award,
  BarChart3,
  Crosshair,
} from "lucide-react";

interface LeaderboardEntry {
  username: string;
  rank: number;
  percentile: number;
  badge: string | null;
  total: number;
  resolved: number;
  confirmed: number;
  denied: number;
  partial: number;
  expired: number;
  brier: number | null;
  accuracy: number | null;
  avgConfidence: number;
  calibrationGap: number | null;
  rankScore: number;
  bestCategory: string | null;
  hasSufficientData: boolean;
  recentPredictions: Array<{
    claim: string;
    confidence: number;
    outcome: string | null;
    category: string;
  }>;
}

const BADGE_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  superforecaster: { label: "Superforecaster", color: "text-accent-amber", bg: "bg-accent-amber/10 border-accent-amber/30" },
  "senior-analyst": { label: "Senior Analyst", color: "text-accent-cyan", bg: "bg-accent-cyan/10 border-accent-cyan/30" },
  analyst: { label: "Analyst", color: "text-navy-300", bg: "bg-navy-800 border-navy-600" },
};

const RANK_COLORS = ["text-accent-amber", "text-navy-300", "text-orange-400"];

function BrierGauge({ value }: { value: number }) {
  // Brier: 0 = perfect, 0.25 = coin flip, 1 = worst
  const pct = Math.max(0, Math.min(100, (1 - value / 0.25) * 100));
  const color = value < 0.1 ? "bg-accent-emerald" : value < 0.2 ? "bg-accent-cyan" : value < 0.25 ? "bg-accent-amber" : "bg-accent-rose";

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-navy-800 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono">{value.toFixed(3)}</span>
    </div>
  );
}

export default function LeaderboardPage() {
  const [data, setData] = useState<{
    leaderboard: LeaderboardEntry[];
    totalAnalysts: number;
    totalPredictions: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageContainer
      title="Leaderboard"
      subtitle="Analyst rankings by prediction accuracy. Brier-scored, calibration-weighted."
    >
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          {
            label: "Analysts",
            value: data?.totalAnalysts ?? "-",
            icon: Users,
          },
          {
            label: "Predictions",
            value: data?.totalPredictions ?? "-",
            icon: Crosshair,
          },
          {
            label: "Avg Brier",
            value: data?.leaderboard.length
              ? (
                  data.leaderboard
                    .filter((e) => e.brier !== null)
                    .reduce((s, e) => s + e.brier!, 0) /
                  data.leaderboard.filter((e) => e.brier !== null).length
                ).toFixed(3)
              : "-",
            icon: Target,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-navy-700/50 bg-navy-900/50 p-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className="h-3.5 w-3.5 text-navy-500" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
                {stat.label}
              </span>
            </div>
            <div className="text-lg font-bold text-navy-100">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Leaderboard table */}
      <div className="rounded-lg border border-navy-700/50 bg-navy-900/30 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[3rem_1fr_6rem_6rem_5rem_5rem_5rem_6rem] gap-2 px-4 py-2 border-b border-navy-700/50 bg-navy-900/50">
          {["#", "Analyst", "Brier", "Accuracy", "Calls", "Hit%", "Cal.Gap", "Badge"].map(
            (h) => (
              <span
                key={h}
                className="text-[10px] font-mono uppercase tracking-wider text-navy-500"
              >
                {h}
              </span>
            )
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center text-navy-500 text-sm">Loading rankings...</div>
        ) : !data?.leaderboard.length ? (
          <div className="p-8 text-center">
            <Crosshair className="h-8 w-8 text-navy-600 mx-auto mb-3" />
            <p className="text-navy-400 text-sm mb-1">No analysts ranked yet</p>
            <p className="text-navy-600 text-xs">
              Make predictions to appear on the leaderboard
            </p>
          </div>
        ) : (
          data.leaderboard.map((entry, i) => (
            <Link
              key={entry.username}
              href={`/analysts?username=${entry.username}`}
              className="grid grid-cols-[3rem_1fr_6rem_6rem_5rem_5rem_5rem_6rem] gap-2 px-4 py-2.5 border-b border-navy-800/50 hover:bg-navy-800/30 transition-colors items-center"
              onMouseEnter={() => setHoveredRow(i)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              {/* Rank */}
              <span
                className={`text-sm font-bold font-mono ${
                  i < 3 ? RANK_COLORS[i] : "text-navy-500"
                }`}
              >
                {i < 3 ? (
                  <Trophy className={`h-4 w-4 ${RANK_COLORS[i]}`} />
                ) : (
                  entry.rank
                )}
              </span>

              {/* Username */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-6 w-6 rounded-full bg-navy-800 border border-navy-700 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-navy-300 uppercase">
                    {entry.username.charAt(0)}
                  </span>
                </div>
                <span className="text-sm text-navy-100 truncate">
                  {entry.username}
                </span>
                {hoveredRow === i && (
                  <ChevronRight className="h-3 w-3 text-navy-500 shrink-0" />
                )}
              </div>

              {/* Brier */}
              <div>
                {entry.brier !== null ? (
                  <BrierGauge value={entry.brier} />
                ) : (
                  <span className="text-[10px] text-navy-600 font-mono">
                    needs 5+
                  </span>
                )}
              </div>

              {/* Accuracy */}
              <span className="text-sm font-mono text-navy-200">
                {entry.accuracy !== null
                  ? `${(entry.accuracy * 100).toFixed(1)}%`
                  : "-"}
              </span>

              {/* Total calls */}
              <span className="text-sm font-mono text-navy-400">
                {entry.total}
              </span>

              {/* Hit rate (confirmed / resolved) */}
              <span className="text-sm font-mono text-navy-400">
                {entry.resolved > 0
                  ? `${entry.confirmed}/${entry.resolved}`
                  : "-"}
              </span>

              {/* Calibration gap */}
              <span
                className={`text-sm font-mono ${
                  entry.calibrationGap !== null && entry.calibrationGap < 0.1
                    ? "text-accent-emerald"
                    : entry.calibrationGap !== null && entry.calibrationGap < 0.2
                    ? "text-accent-amber"
                    : "text-navy-400"
                }`}
              >
                {entry.calibrationGap !== null
                  ? `${(entry.calibrationGap * 100).toFixed(0)}%`
                  : "-"}
              </span>

              {/* Badge */}
              <div>
                {entry.badge && BADGE_STYLES[entry.badge] ? (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider ${BADGE_STYLES[entry.badge].bg} ${BADGE_STYLES[entry.badge].color}`}
                  >
                    <Award className="h-2.5 w-2.5" />
                    {BADGE_STYLES[entry.badge].label}
                  </span>
                ) : null}
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-[10px] text-navy-600 font-mono">
        <span>Brier: 0.000 = perfect, 0.250 = coin flip</span>
        <span>Cal.Gap: |avg confidence - actual accuracy|</span>
        <span>Min 5 resolved predictions for Brier ranking</span>
      </div>
    </PageContainer>
  );
}
