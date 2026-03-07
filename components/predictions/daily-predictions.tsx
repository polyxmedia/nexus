"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Loader2,
  ArrowRight,
  Zap,
} from "lucide-react";
import Link from "next/link";

interface DailyPrediction {
  id: number;
  claim: string;
  timeframe: string;
  deadline: string;
  confidence: number;
  category: string;
  outcome: string | null;
  outcomeNotes: string | null;
  score: number | null;
  createdAt: string;
  metrics: string | null;
}

interface CalibrationBucket {
  bucket: string;
  predicted: number;
  actual: number;
  count: number;
}

interface DailyStats {
  totalPredictions: number;
  totalResolved: number;
  confirmed: number;
  denied: number;
  partial: number;
  expired: number;
  accuracy: number;
  avgScore: number;
  streak: number;
  pendingCount: number;
  calibration: CalibrationBucket[];
  byCategory: Record<string, { total: number; confirmed: number; avgScore: number }>;
}

interface DailyData {
  today: DailyPrediction[];
  resolvedToday: DailyPrediction[];
  stats: DailyStats;
}

const CATEGORY_COLORS: Record<string, string> = {
  market: "text-accent-cyan",
  geopolitical: "text-accent-rose",
  celestial: "text-accent-amber",
};

const OUTCOME_ICONS: Record<string, { Icon: typeof CheckCircle2; color: string }> = {
  confirmed: { Icon: CheckCircle2, color: "text-accent-emerald" },
  denied: { Icon: XCircle, color: "text-accent-rose" },
  partial: { Icon: AlertTriangle, color: "text-accent-amber" },
  expired: { Icon: Clock, color: "text-navy-500" },
};

export async function DailyPredictions() {
  const [data, setData] = useState<DailyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const fetchDaily = useCallback(() => {
    fetch("/api/predictions/daily")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchDaily();
  }, [fetchDaily]);

  const runDaily = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/predictions/daily", { method: "POST" });
      const result = await res.json();
      if (!result.error) {
        setGenerated(true);
        fetchDaily();
      }
    } catch {
      // ignore
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="border border-navy-700/40 rounded-lg bg-navy-800/40 p-5 animate-pulse">
        <div className="h-4 w-40 bg-navy-700/50 rounded mb-4" />
        <div className="space-y-2">
          <div className="h-10 bg-navy-700/30 rounded" />
          <div className="h-10 bg-navy-700/30 rounded" />
          <div className="h-10 bg-navy-700/30 rounded" />
        </div>
      </div>
    );
  }

  const hasTodaysPredictions = data && data.today.length > 0;
  const hasResolvedToday = data && data.resolvedToday.length > 0;

  return (
    <div className="border border-navy-700/40 rounded-lg bg-navy-800/40 shadow-[0_1px_12px_rgba(0,0,0,0.25)]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-navy-700/30">
        <div className="flex items-center gap-3">
          <Zap className="h-3.5 w-3.5 text-accent-amber" />
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-navy-500">
            Daily Predictions
          </h2>
          {data?.stats && (
            <span className="text-[10px] text-navy-500 font-mono">
              {data.stats.accuracy > 0
                ? `${(data.stats.accuracy * 100).toFixed(0)}% accuracy`
                : ""}
              {data.stats.streak > 0 ? ` / ${data.stats.streak} streak` : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!hasTodaysPredictions && !generating && (
            <Button variant="primary" size="sm" onClick={runDaily}>
              <Sparkles className="h-3 w-3 mr-1" />
              Generate Today
            </Button>
          )}
          {generating && (
            <div className="flex items-center gap-1.5 text-[10px] text-accent-cyan">
              <Loader2 className="h-3 w-3 animate-spin" />
              Generating + validating...
            </div>
          )}
          {generated && hasTodaysPredictions && (
            <span className="text-[10px] text-accent-emerald">Updated</span>
          )}
          <Link
            href="/predictions"
            className="flex items-center gap-1 text-[10px] text-navy-500 hover:text-navy-300 transition-colors"
          >
            All <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="p-5">
        {/* Yesterday's Validation Results */}
        {hasResolvedToday && (
          <div className="mb-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-navy-500 mb-2">
              Validated Today
            </div>
            <div className="space-y-1.5">
              {data.resolvedToday.map((p) => {
                const oc = OUTCOME_ICONS[p.outcome || "expired"] || OUTCOME_ICONS.expired;
                return (
                  <div
                    key={p.id}
                    className={`flex items-start gap-2.5 rounded-md px-3 py-2 border ${
                      p.outcome === "confirmed"
                        ? "border-accent-emerald/20 bg-accent-emerald/5"
                        : p.outcome === "denied"
                          ? "border-accent-rose/20 bg-accent-rose/5"
                          : p.outcome === "partial"
                            ? "border-accent-amber/20 bg-accent-amber/5"
                            : "border-navy-700/30 bg-navy-800/30"
                    }`}
                  >
                    <oc.Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${oc.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-navy-200 leading-tight">{p.claim}</div>
                      {p.outcomeNotes && (
                        <div className="text-[10px] text-navy-400 mt-0.5 font-sans leading-relaxed">
                          {p.outcomeNotes}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-bold font-mono uppercase ${oc.color}`}>
                        {p.outcome}
                      </span>
                      {p.score != null && (
                        <span className="text-[10px] font-mono text-navy-400">
                          {(p.score * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Today's Predictions */}
        {hasTodaysPredictions ? (
          <div>
            {hasResolvedToday && (
              <div className="text-[10px] font-semibold uppercase tracking-widest text-navy-500 mb-2">
                Today's Predictions
              </div>
            )}
            <div className="space-y-1.5">
              {data.today.map((p) => {
                const grounding = p.metrics ? (() => {
                  try {
                    const m = JSON.parse(p.metrics!);
                    return m.grounding as string | undefined;
                  } catch { return undefined; }
                })() : undefined;

                return (
                  <div
                    key={p.id}
                    className="flex items-start gap-2.5 rounded-md px-3 py-2 border border-navy-700/30 bg-navy-800/30 hover:bg-navy-800/50 transition-colors"
                  >
                    <div className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 w-8 shrink-0 ${CATEGORY_COLORS[p.category] || "text-navy-400"}`}>
                      {p.category.slice(0, 3)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-navy-200 leading-tight">{p.claim}</div>
                      {grounding && (
                        <div className="text-[10px] text-navy-500 mt-0.5 font-sans italic">
                          {grounding}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-[10px] font-mono text-navy-300">
                        {(p.confidence * 100).toFixed(0)}%
                      </span>
                      <span className="text-[10px] font-mono text-navy-500">
                        {new Date(p.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : !generating ? (
          <div className="text-center py-6">
            <Sparkles className="h-6 w-6 text-navy-600 mx-auto mb-2" />
            <p className="text-xs text-navy-500 mb-1">No predictions generated today</p>
            <p className="text-[10px] text-navy-600">
              Click "Generate Today" to create daily predictions and validate yesterday's
            </p>
          </div>
        ) : null}

        {/* Calibration + Category Breakdown */}
        {data?.stats && data.stats.totalResolved >= 5 && (
          <div className="mt-4 border-t border-navy-700/30 pt-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Calibration */}
              {data.stats.calibration.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-navy-500 mb-2">
                    Calibration (predicted vs actual)
                  </div>
                  <div className="space-y-1.5">
                    {data.stats.calibration.map((b) => {
                      const gap = Math.abs(b.actual - b.predicted);
                      const wellCalibrated = gap < 0.15;
                      return (
                        <div key={b.bucket} className="flex items-center gap-2">
                          <span className="text-[10px] text-navy-400 font-mono w-14">{b.bucket}</span>
                          <div className="flex-1 h-1.5 bg-navy-800 rounded-full overflow-hidden relative">
                            {/* Predicted bar */}
                            <div
                              className="absolute h-full bg-navy-600 rounded-full"
                              style={{ width: `${b.predicted * 100}%` }}
                            />
                            {/* Actual bar */}
                            <div
                              className={`absolute h-full rounded-full ${wellCalibrated ? "bg-accent-emerald" : "bg-accent-amber"}`}
                              style={{ width: `${b.actual * 100}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-mono w-10 text-right ${wellCalibrated ? "text-accent-emerald" : "text-accent-amber"}`}>
                            {(b.actual * 100).toFixed(0)}%
                          </span>
                          <span className="text-[9px] text-navy-600 w-6 text-right">n={b.count}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-[9px] text-navy-600 mt-1">
                    Gray = predicted confidence, color = actual hit rate
                  </div>
                </div>
              )}

              {/* Category breakdown */}
              {Object.keys(data.stats.byCategory).length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-navy-500 mb-2">
                    By Category
                  </div>
                  <div className="space-y-1.5">
                    {Object.entries(data.stats.byCategory).map(([cat, info]) => (
                      <div key={cat} className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold uppercase ${CATEGORY_COLORS[cat] || "text-navy-400"}`}>
                          {cat}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-navy-400 font-mono">
                            {info.confirmed}/{info.total} confirmed
                          </span>
                          <span className={`text-[10px] font-mono ${info.avgScore >= 0.5 ? "text-accent-emerald" : "text-accent-rose"}`}>
                            {(info.avgScore * 100).toFixed(0)}% avg
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
