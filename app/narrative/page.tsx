"use client";

import { useState, useEffect } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────

type Momentum = "rising" | "peaking" | "fading" | "stable";

interface Narrative {
  id: string;
  theme: string;
  description: string;
  sources: Record<string, number>;
  momentum: Momentum;
  firstSeen: string;
  lastSeen: string;
  articleCount: number;
  sentimentScore: number;
  relatedAssets: string[];
}

interface NarrativeDivergence {
  theme: string;
  asset: string;
  narrativeDirection: "bullish" | "bearish";
  priceDirection: "up" | "down" | "flat";
  divergenceScore: number;
}

interface NarrativeSnapshot {
  narratives: Narrative[];
  topThemes: string[];
  divergences: NarrativeDivergence[];
  lastUpdated: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

const MOMENTUM_STYLES: Record<Momentum, string> = {
  rising: "border-navy-600 text-navy-300",
  peaking: "border-navy-700 text-navy-400",
  fading: "border-navy-800 text-navy-600",
  stable: "border-navy-800/40 text-navy-600",
};

// ── Components ───────────────────────────────────────────────────────────

function MomentumBadge({ momentum }: { momentum: Momentum }) {
  return (
    <span
      className={`text-[8px] font-mono uppercase border px-1.5 py-0.5 rounded ${MOMENTUM_STYLES[momentum]}`}
    >
      {momentum}
    </span>
  );
}

function SentimentBar({ score }: { score: number }) {
  // score is -1 to 1. Map to 0-100% position.
  const position = ((score + 1) / 2) * 100;

  return (
    <div className="relative h-1.5 w-full rounded-full overflow-hidden bg-navy-800/60">
      {/* Gradient: red on left, neutral in middle, green on right */}
      <div className="absolute inset-0 flex">
        <div className="flex-1 bg-gradient-to-r from-accent-rose/40 to-navy-800/30" />
        <div className="flex-1 bg-gradient-to-r from-navy-800/30 to-accent-emerald/40" />
      </div>
      {/* Center line */}
      <div className="absolute top-0 left-1/2 h-full w-px bg-navy-600/50" />
      {/* Marker */}
      <div
        className="absolute top-1/2 -translate-y-1/2 h-2.5 w-1 rounded-full bg-navy-100"
        style={{ left: `${Math.max(2, Math.min(98, position))}%` }}
      />
    </div>
  );
}

function SourceBreakdown({ sources }: { sources: Record<string, number> }) {
  const entries = Object.entries(sources).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className="flex gap-2 flex-wrap">
      {entries.map(([platform, count]) => (
        <div key={platform} className="flex items-center gap-1">
          <span className="text-[9px] font-mono text-navy-500">{platform}</span>
          <span className="text-[9px] font-mono text-navy-600">
            {count}
          </span>
          <div className="h-1 rounded-full bg-navy-800/60 w-12">
            <div
              className="h-full rounded-full bg-navy-600/60"
              style={{ width: `${(count / total) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function NarrativeCard({ narrative }: { narrative: Narrative }) {
  return (
    <div className="border border-navy-800/60 rounded-lg p-4 hover:border-navy-700/60 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-[12px] font-mono font-medium text-navy-200 truncate">
              {narrative.theme}
            </h3>
            <MomentumBadge momentum={narrative.momentum} />
          </div>
          <p className="text-[11px] text-navy-500 font-sans leading-snug line-clamp-2">
            {narrative.description}
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[10px] font-mono text-navy-500 block">
            {narrative.articleCount} articles
          </span>
          <span className="text-[9px] font-mono text-navy-600 block">
            {timeAgo(narrative.lastSeen)}
          </span>
        </div>
      </div>

      {/* Sentiment */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-mono uppercase tracking-wider text-navy-600">
            Sentiment
          </span>
          <span className="text-[9px] font-mono text-navy-500">
            {narrative.sentimentScore > 0 ? "+" : ""}
            {narrative.sentimentScore.toFixed(2)}
          </span>
        </div>
        <SentimentBar score={narrative.sentimentScore} />
      </div>

      {/* Related Assets */}
      {narrative.relatedAssets.length > 0 && (
        <div className="mb-3">
          <span className="text-[9px] font-mono uppercase tracking-wider text-navy-600 block mb-1">
            Related Assets
          </span>
          <div className="flex gap-1.5 flex-wrap">
            {narrative.relatedAssets.map((asset) => (
              <span
                key={asset}
                className="text-[9px] font-mono text-navy-400 bg-navy-800/40 px-1.5 py-0.5 rounded"
              >
                {asset}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Source Breakdown */}
      <div>
        <span className="text-[9px] font-mono uppercase tracking-wider text-navy-600 block mb-1">
          Sources
        </span>
        <SourceBreakdown sources={narrative.sources} />
      </div>
    </div>
  );
}

function DivergenceTable({ divergences }: { divergences: NarrativeDivergence[] }) {
  if (divergences.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-[11px] font-mono text-navy-600">No divergences detected</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-navy-800/60">
            <th className="text-left text-[9px] font-mono uppercase tracking-wider text-navy-600 pb-2 pr-4">
              Theme
            </th>
            <th className="text-left text-[9px] font-mono uppercase tracking-wider text-navy-600 pb-2 pr-4">
              Asset
            </th>
            <th className="text-left text-[9px] font-mono uppercase tracking-wider text-navy-600 pb-2 pr-4">
              Narrative
            </th>
            <th className="text-left text-[9px] font-mono uppercase tracking-wider text-navy-600 pb-2 pr-4">
              Price
            </th>
            <th className="text-right text-[9px] font-mono uppercase tracking-wider text-navy-600 pb-2">
              Score
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-800/30">
          {divergences.map((d, i) => (
            <tr key={`${d.theme}-${d.asset}-${i}`} className="hover:bg-navy-900/30 transition-colors">
              <td className="py-2 pr-4 text-[11px] font-mono text-navy-300">
                {d.theme}
              </td>
              <td className="py-2 pr-4 text-[11px] font-mono text-navy-400">
                {d.asset}
              </td>
              <td className="py-2 pr-4">
                <span
                  className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${
                    d.narrativeDirection === "bullish"
                      ? "text-accent-emerald bg-accent-emerald/10"
                      : "text-accent-rose bg-accent-rose/10"
                  }`}
                >
                  {d.narrativeDirection}
                </span>
              </td>
              <td className="py-2 pr-4">
                <span
                  className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${
                    d.priceDirection === "up"
                      ? "text-accent-emerald bg-accent-emerald/10"
                      : d.priceDirection === "down"
                        ? "text-accent-rose bg-accent-rose/10"
                        : "text-navy-500 bg-navy-800/40"
                  }`}
                >
                  {d.priceDirection}
                </span>
              </td>
              <td className="py-2 text-right text-[11px] font-mono text-navy-400">
                {(d.divergenceScore * 100).toFixed(0)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────

export default function NarrativePage() {
  const [snapshot, setSnapshot] = useState<NarrativeSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchData() {
    try {
      const res = await fetch("/api/narrative");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSnapshot(data);
    } catch {
      setSnapshot(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 300_000); // 5 min poll
    return () => clearInterval(interval);
  }, []);

  function handleRefresh() {
    setRefreshing(true);
    fetchData();
  }

  const risingCount = snapshot?.narratives.filter(n => n.momentum === "rising").length || 0;
  const totalNarratives = snapshot?.narratives.length || 0;
  const divergenceCount = snapshot?.divergences.length || 0;

  return (
    <PageContainer
      title="Narrative Tracker"
      subtitle="Media narrative clustering, momentum tracking, and divergence detection"
      actions={
        <div className="flex items-center gap-3">
          {snapshot?.lastUpdated && (
            <span className="text-[9px] font-mono text-navy-600">
              {timeAgo(snapshot.lastUpdated)}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-mono text-navy-500 hover:text-navy-300 hover:bg-navy-800/40 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      }
    >
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="border border-navy-800/60 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-3 w-3 text-navy-500 opacity-70" />
            <span className="text-[9px] font-mono uppercase tracking-wider text-navy-600">
              Active Narratives
            </span>
          </div>
          {loading ? (
            <Skeleton className="h-5 w-8" />
          ) : (
            <span className="text-lg font-mono font-bold text-navy-200">
              {totalNarratives}
            </span>
          )}
        </div>
        <div className="border border-navy-800/60 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-3 w-3 text-navy-500 opacity-70" />
            <span className="text-[9px] font-mono uppercase tracking-wider text-navy-600">
              Rising
            </span>
          </div>
          {loading ? (
            <Skeleton className="h-5 w-8" />
          ) : (
            <span className="text-lg font-mono font-bold text-navy-200">
              {risingCount}
            </span>
          )}
        </div>
        <div className="border border-navy-800/60 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-3 w-3 text-navy-500 opacity-70" />
            <span className="text-[9px] font-mono uppercase tracking-wider text-navy-600">
              Divergences
            </span>
          </div>
          {loading ? (
            <Skeleton className="h-5 w-8" />
          ) : (
            <span className="text-lg font-mono font-bold text-navy-200">
              {divergenceCount}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-navy-800/60 rounded-lg p-4 animate-pulse">
              <div className="h-3 bg-navy-800/50 rounded w-1/3 mb-3" />
              <div className="h-2 bg-navy-800/30 rounded w-2/3 mb-2" />
              <div className="h-1.5 bg-navy-800/20 rounded w-full mb-3" />
              <div className="h-2 bg-navy-800/30 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : !snapshot || snapshot.narratives.length === 0 ? (
        <div className="text-center py-20">
          <Activity className="h-5 w-5 text-navy-700 mx-auto mb-3" />
          <p className="text-xs text-navy-500 font-mono">No narratives detected</p>
        </div>
      ) : (
        <>
          {/* Trending Narratives */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <ArrowUpRight className="h-3.5 w-3.5 text-navy-500 opacity-70" />
              <h2 className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
                Trending Narratives
              </h2>
              <span className="text-[9px] font-mono text-navy-600">
                {snapshot.narratives.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {snapshot.narratives.map((n) => (
                <NarrativeCard key={n.id} narrative={n} />
              ))}
            </div>
          </div>

          {/* Divergences */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-3.5 w-3.5 text-navy-500 opacity-70" />
              <h2 className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
                Narrative Divergences
              </h2>
              <span className="text-[9px] font-mono text-navy-600">
                Narrative sentiment vs price action
              </span>
            </div>
            <div className="border border-navy-800/60 rounded-lg p-4">
              <DivergenceTable divergences={snapshot.divergences} />
            </div>
          </div>

          {/* Source Overview */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-3.5 w-3.5 text-navy-500 opacity-70" />
              <h2 className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
                Source Breakdown
              </h2>
            </div>
            <div className="border border-navy-800/60 rounded-lg p-4">
              <div className="space-y-4">
                {snapshot.narratives
                  .filter(n => Object.keys(n.sources).length > 1)
                  .slice(0, 8)
                  .map((n) => (
                    <div key={n.id}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-mono text-navy-300">
                          {n.theme}
                        </span>
                        <MomentumBadge momentum={n.momentum} />
                      </div>
                      <SourceBreakdown sources={n.sources} />
                    </div>
                  ))}
                {snapshot.narratives.filter(n => Object.keys(n.sources).length > 1).length === 0 && (
                  <p className="text-[11px] font-mono text-navy-600 text-center py-4">
                    Insufficient multi-source narratives
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}
