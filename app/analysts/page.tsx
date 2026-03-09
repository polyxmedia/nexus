"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import {
  ArrowLeft,
  Award,
  BarChart3,
  Calendar,
  Check,
  ChevronRight,
  Crosshair,
  Target,
  TrendingUp,
  UserPlus,
  UserMinus,
  Users,
  X,
} from "lucide-react";

interface AnalystStats {
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
  calibration: Array<{
    label: string;
    midpoint: number;
    count: number;
    actualRate: number | null;
  }>;
  categories: Record<string, { total: number; correct: number }>;
  monthlyActivity: Record<string, number>;
  followers: number;
  following: number;
  isFollowing: boolean;
  recentPredictions: Array<{
    uuid: string;
    claim: string;
    confidence: number;
    outcome: string | null;
    score: number | null;
    category: string;
    direction: string | null;
    createdAt: string;
    deadline: string;
  }>;
}

const OUTCOME_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  confirmed: { label: "Confirmed", color: "text-accent-emerald", bg: "bg-accent-emerald/10" },
  denied: { label: "Denied", color: "text-accent-rose", bg: "bg-accent-rose/10" },
  partial: { label: "Partial", color: "text-accent-amber", bg: "bg-accent-amber/10" },
  expired: { label: "Expired", color: "text-navy-500", bg: "bg-navy-800" },
};

const CATEGORY_LABELS: Record<string, string> = {
  market: "Market",
  geopolitical: "Geopolitical",
  celestial: "Celestial",
};

export default function AnalystProfilePage() {
  const searchParams = useSearchParams();
  const username = searchParams.get("username");
  const [profile, setProfile] = useState<{ username: string; stats: AnalystStats | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  const loadProfile = useCallback(() => {
    if (!username) return;
    fetch(`/api/analysts?username=${encodeURIComponent(username)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setProfile(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [username]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleFollow = async () => {
    if (!profile?.stats || followLoading) return;
    setFollowLoading(true);
    try {
      const action = profile.stats.isFollowing ? "unfollow" : "follow";
      const res = await fetch("/api/analysts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, action }),
      });
      if (res.ok) {
        setProfile((prev) =>
          prev?.stats
            ? {
                ...prev,
                stats: {
                  ...prev.stats,
                  isFollowing: !prev.stats.isFollowing,
                  followers: prev.stats.followers + (prev.stats.isFollowing ? -1 : 1),
                },
              }
            : prev
        );
      }
    } catch {
    } finally {
      setFollowLoading(false);
    }
  };

  if (!username) {
    return (
      <PageContainer title="Analyst Profile">
        <p className="text-navy-500 text-sm">No analyst specified.</p>
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer title="Analyst Profile">
        <p className="text-navy-500 text-sm">Loading profile...</p>
      </PageContainer>
    );
  }

  if (!profile?.stats) {
    return (
      <PageContainer title="Analyst Profile">
        <p className="text-navy-400 text-sm">No prediction data for this analyst yet.</p>
      </PageContainer>
    );
  }

  const s = profile.stats;

  return (
    <PageContainer
      title={profile.username}
      subtitle="Analyst profile and prediction track record"
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/leaderboard"
            className="flex items-center gap-1.5 rounded-md border border-navy-700 px-3 py-1.5 text-xs text-navy-400 hover:text-navy-200 hover:border-navy-600 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Leaderboard
          </Link>
          <button
            onClick={handleFollow}
            disabled={followLoading}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors ${
              s.isFollowing
                ? "border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20"
                : "border-navy-700 text-navy-400 hover:text-navy-200 hover:border-navy-600"
            }`}
          >
            {s.isFollowing ? (
              <>
                <UserMinus className="h-3 w-3" />
                Following
              </>
            ) : (
              <>
                <UserPlus className="h-3 w-3" />
                Follow
              </>
            )}
          </button>
        </div>
      }
    >
      {/* Profile header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="h-14 w-14 rounded-full bg-navy-800 border border-navy-700 flex items-center justify-center">
          <span className="text-xl font-bold text-navy-300 uppercase">
            {profile.username.charAt(0)}
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-lg font-bold text-navy-100">{profile.username}</h2>
            <div className="flex items-center gap-3 text-xs text-navy-500">
              <span>{s.followers} followers</span>
              <span>{s.following} following</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-navy-400">
            <span>{s.total} predictions</span>
            <span>{s.resolved} resolved</span>
            {s.brier !== null && (
              <span className="text-accent-cyan">Brier: {s.brier.toFixed(3)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: "Brier Score",
            value: s.brier !== null ? s.brier.toFixed(3) : "N/A",
            sub: s.brier !== null ? (s.brier < 0.1 ? "Excellent" : s.brier < 0.2 ? "Good" : s.brier < 0.25 ? "Fair" : "Poor") : "Need 5+ resolved",
            icon: Target,
            accent: s.brier !== null && s.brier < 0.2,
          },
          {
            label: "Accuracy",
            value: s.accuracy !== null ? `${(s.accuracy * 100).toFixed(1)}%` : "N/A",
            sub: `${s.confirmed} confirmed / ${s.resolved} resolved`,
            icon: Check,
            accent: s.accuracy !== null && s.accuracy > 0.6,
          },
          {
            label: "Calibration Gap",
            value: s.calibrationGap !== null ? `${(s.calibrationGap * 100).toFixed(1)}%` : "N/A",
            sub: s.calibrationGap !== null ? (s.calibrationGap < 0.05 ? "Well-calibrated" : s.calibrationGap < 0.15 ? "Slightly off" : "Needs work") : "",
            icon: BarChart3,
            accent: s.calibrationGap !== null && s.calibrationGap < 0.1,
          },
          {
            label: "Avg Confidence",
            value: `${(s.avgConfidence * 100).toFixed(0)}%`,
            sub: `Across ${s.total} predictions`,
            icon: TrendingUp,
            accent: false,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-navy-700/50 bg-navy-900/50 p-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <card.icon className="h-3.5 w-3.5 text-navy-500" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
                {card.label}
              </span>
            </div>
            <div className={`text-xl font-bold ${card.accent ? "text-accent-cyan" : "text-navy-100"}`}>
              {card.value}
            </div>
            <div className="text-[10px] text-navy-500 mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Calibration chart */}
      <div className="rounded-lg border border-navy-700/50 bg-navy-900/30 p-4 mb-6">
        <h3 className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">
          Calibration Curve
        </h3>
        <div className="flex items-end gap-2 h-32">
          {s.calibration.map((bucket) => {
            const height = bucket.actualRate !== null ? bucket.actualRate * 100 : 0;
            const expectedHeight = bucket.midpoint * 100;
            return (
              <div key={bucket.label} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full relative h-24 flex items-end justify-center gap-0.5">
                  {/* Expected (reference line) */}
                  <div
                    className="w-2 bg-navy-700/50 rounded-t"
                    style={{ height: `${expectedHeight}%` }}
                  />
                  {/* Actual */}
                  <div
                    className={`w-2 rounded-t ${
                      bucket.actualRate !== null
                        ? Math.abs(bucket.actualRate - bucket.midpoint) < 0.1
                          ? "bg-accent-emerald"
                          : "bg-accent-amber"
                        : "bg-navy-800"
                    }`}
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className="text-[8px] font-mono text-navy-600">{bucket.label}</span>
                <span className="text-[8px] font-mono text-navy-500">n={bucket.count}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-2 text-[9px] text-navy-600 font-mono">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-navy-700/50 rounded" /> Expected
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-accent-emerald rounded" /> Actual (calibrated)
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-accent-amber rounded" /> Actual (miscalibrated)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Category breakdown */}
        <div className="rounded-lg border border-navy-700/50 bg-navy-900/30 p-4">
          <h3 className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">
            Category Performance
          </h3>
          <div className="space-y-2">
            {Object.entries(s.categories).map(([cat, data]) => {
              const acc = data.total > 0 ? data.correct / data.total : 0;
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-xs text-navy-300 w-24 truncate">
                    {CATEGORY_LABELS[cat] || cat}
                  </span>
                  <div className="flex-1 h-1.5 bg-navy-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent-cyan/60"
                      style={{ width: `${acc * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-navy-400 w-16 text-right">
                    {data.correct}/{data.total}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly activity */}
        <div className="rounded-lg border border-navy-700/50 bg-navy-900/30 p-4">
          <h3 className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">
            Monthly Activity
          </h3>
          <div className="flex items-end gap-1 h-20">
            {Object.entries(s.monthlyActivity)
              .sort(([a], [b]) => a.localeCompare(b))
              .slice(-12)
              .map(([month, count]) => {
                const maxCount = Math.max(...Object.values(s.monthlyActivity));
                const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end justify-center" style={{ height: "60px" }}>
                      <div
                        className="w-full max-w-[12px] bg-accent-cyan/40 rounded-t hover:bg-accent-cyan/60 transition-colors"
                        style={{ height: `${height}%`, minHeight: count > 0 ? "2px" : "0" }}
                        title={`${month}: ${count} predictions`}
                      />
                    </div>
                    <span className="text-[7px] font-mono text-navy-600 -rotate-45">
                      {month.slice(5)}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Recent predictions */}
      <div className="rounded-lg border border-navy-700/50 bg-navy-900/30 overflow-hidden">
        <div className="px-4 py-2 border-b border-navy-700/50 bg-navy-900/50">
          <h3 className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
            Recent Predictions
          </h3>
        </div>
        {s.recentPredictions.length === 0 ? (
          <div className="p-6 text-center text-navy-500 text-sm">No predictions yet</div>
        ) : (
          s.recentPredictions.map((p) => (
            <Link
              key={p.uuid}
              href={`/predictions/${p.uuid}`}
              className="flex items-start gap-3 px-4 py-3 border-b border-navy-800/50 hover:bg-navy-800/20 transition-colors"
            >
              {/* Outcome indicator */}
              <div className="mt-0.5">
                {p.outcome ? (
                  <div
                    className={`h-2 w-2 rounded-full ${
                      p.outcome === "confirmed"
                        ? "bg-accent-emerald"
                        : p.outcome === "denied"
                        ? "bg-accent-rose"
                        : p.outcome === "partial"
                        ? "bg-accent-amber"
                        : "bg-navy-600"
                    }`}
                  />
                ) : (
                  <div className="h-2 w-2 rounded-full border border-navy-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-navy-200 line-clamp-1">{p.claim}</p>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-navy-500 font-mono">
                  <span>{(p.confidence * 100).toFixed(0)}% conf</span>
                  <span>{p.category}</span>
                  {p.direction && <span>{p.direction}</span>}
                  <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                  {p.outcome && OUTCOME_STYLES[p.outcome] && (
                    <span className={OUTCOME_STYLES[p.outcome].color}>
                      {OUTCOME_STYLES[p.outcome].label}
                    </span>
                  )}
                </div>
              </div>

              <ChevronRight className="h-3 w-3 text-navy-600 mt-1 shrink-0" />
            </Link>
          ))
        )}
      </div>
    </PageContainer>
  );
}
