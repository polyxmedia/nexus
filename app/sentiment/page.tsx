"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  Minus,
  RefreshCw,
  Shield,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──

interface SourceData {
  count: number;
  avgSentiment: number;
  credibilityWeightedSentiment: number;
  available: boolean;
}

interface TopicSentiment {
  topic: string;
  query: string;
  lastUpdated: string;
  sources: {
    twitter: SourceData;
    reddit: SourceData;
    stocktwits: SourceData;
  };
  composite: {
    sentiment: number;
    confidence: number;
    label: string;
    postCount: number;
  };
  poisoning: {
    detected: boolean;
    divergence: number;
    flaggedSource: string | null;
    reason: string | null;
  };
  topPosts: Array<{
    source: string;
    text: string;
    author: string;
    timestamp: string;
    sentiment: number;
    credibility: number;
    engagement: number;
    raw: Record<string, number>;
  }>;
}

interface SentimentResponse {
  topics: TopicSentiment[];
  trackedTopics: string[];
  count: number;
}

// ── Helpers ──

function sentimentColor(score: number): string {
  if (score <= -0.3) return "text-accent-rose";
  if (score <= -0.1) return "text-navy-400";
  if (score <= 0.1) return "text-navy-300";
  if (score <= 0.3) return "text-navy-300";
  return "text-accent-emerald";
}

function sentimentBg(score: number): string {
  if (score <= -0.3) return "bg-accent-rose/8";
  if (score <= -0.1) return "bg-navy-900/40";
  if (score <= 0.1) return "bg-navy-900/40";
  if (score <= 0.3) return "bg-navy-900/40";
  return "bg-accent-emerald/8";
}

function sentimentIcon(score: number) {
  if (score <= -0.1) return ArrowDown;
  if (score >= 0.1) return ArrowUp;
  return Minus;
}

function formatLabel(label: string): string {
  return label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function sourceLabel(source: string): string {
  if (source === "twitter") return "X";
  if (source === "reddit") return "Reddit";
  if (source === "stocktwits") return "ST";
  return source;
}

// ── Components ──

function SentimentBar({ score, width = "w-20" }: { score: number; width?: string }) {
  // Score is -1 to 1. Bar shows position on a spectrum.
  const pct = ((score + 1) / 2) * 100; // 0-100
  return (
    <div className={cn("h-1.5 rounded-full bg-navy-800 relative", width)}>
      {/* Center line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-navy-600" />
      {/* Indicator dot */}
      <div
        className={cn(
          "absolute top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border-2 border-navy-950",
          score <= -0.2 ? "bg-accent-rose" : score >= 0.2 ? "bg-accent-emerald" : "bg-navy-400"
        )}
        style={{ left: `${Math.max(4, Math.min(96, pct))}%`, transform: "translate(-50%, -50%)" }}
      />
    </div>
  );
}

function SourceBadge({ source, data }: { source: string; data: SourceData }) {
  if (!data.available) return (
    <span className="text-[9px] font-mono text-navy-700 px-1.5 py-0.5 rounded bg-navy-900/40">
      {sourceLabel(source)} --
    </span>
  );

  return (
    <span className={cn(
      "text-[9px] font-mono px-1.5 py-0.5 rounded inline-flex items-center gap-1",
      data.credibilityWeightedSentiment <= -0.15 ? "text-navy-400 bg-navy-800/50" :
      data.credibilityWeightedSentiment >= 0.15 ? "text-navy-300 bg-navy-800/50" :
      "text-navy-500 bg-navy-900/40"
    )}>
      {sourceLabel(source)}
      <span className="text-navy-600">{data.count}</span>
      <span className={sentimentColor(data.credibilityWeightedSentiment)}>
        {data.credibilityWeightedSentiment >= 0 ? "+" : ""}{(data.credibilityWeightedSentiment * 100).toFixed(0)}
      </span>
    </span>
  );
}

function TopicCard({ topic, expanded, onToggle }: { topic: TopicSentiment; expanded: boolean; onToggle: () => void }) {
  const Icon = sentimentIcon(topic.composite.sentiment);

  return (
    <div className={cn(
      "border rounded-lg transition-all duration-200",
      topic.poisoning.detected ? "border-accent-amber/30" : "border-navy-700/20",
      sentimentBg(topic.composite.sentiment),
    )}>
      {/* Main row */}
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 text-left"
      >
        <div className="flex items-center gap-4">
          {/* Topic name */}
          <div className="w-32 flex-shrink-0">
            <span className="text-[13px] text-navy-100 font-medium">{topic.topic}</span>
          </div>

          {/* Sentiment score + bar */}
          <div className="flex items-center gap-3 w-44 flex-shrink-0">
            <Icon className={cn("h-3.5 w-3.5", sentimentColor(topic.composite.sentiment))} />
            <span className={cn("text-sm font-mono font-medium w-12", sentimentColor(topic.composite.sentiment))}>
              {topic.composite.sentiment >= 0 ? "+" : ""}{(topic.composite.sentiment * 100).toFixed(0)}
            </span>
            <SentimentBar score={topic.composite.sentiment} />
          </div>

          {/* Label */}
          <span className={cn(
            "text-[10px] font-mono uppercase tracking-wider w-24",
            topic.composite.label.includes("bearish") ? "text-navy-400" :
            topic.composite.label.includes("bullish") ? "text-navy-300" :
            "text-navy-500"
          )}>
            {formatLabel(topic.composite.label)}
          </span>

          {/* Sources */}
          <div className="flex items-center gap-1.5 flex-1">
            <SourceBadge source="twitter" data={topic.sources.twitter} />
            <SourceBadge source="reddit" data={topic.sources.reddit} />
            <SourceBadge source="stocktwits" data={topic.sources.stocktwits} />
          </div>

          {/* Confidence + post count */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-[10px] font-mono text-navy-500">{topic.composite.postCount} posts</span>
            <span className="text-[10px] font-mono text-navy-600">{(topic.composite.confidence * 100).toFixed(0)}% conf</span>
          </div>

          {/* Poisoning flag */}
          {topic.poisoning.detected && (
            <AlertTriangle className="h-3.5 w-3.5 text-accent-amber flex-shrink-0" />
          )}

          {/* Freshness */}
          <span className="text-[9px] font-mono text-navy-700 w-14 text-right flex-shrink-0">
            {timeAgo(topic.lastUpdated)}
          </span>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-4 border-t border-navy-800/40 pt-3 space-y-3">
          {/* Poisoning alert */}
          {topic.poisoning.detected && topic.poisoning.reason && (
            <div className="flex items-start gap-2 rounded-md border border-accent-amber/20 bg-accent-amber/5 px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 text-accent-amber mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-[10px] font-mono font-medium text-accent-amber uppercase tracking-wider">Potential Dataset Poisoning</span>
                <p className="text-[11px] text-navy-300 mt-1 leading-relaxed">{topic.poisoning.reason}</p>
                <p className="text-[10px] text-navy-500 mt-1">
                  Source divergence: {(topic.poisoning.divergence * 100).toFixed(0)}% from consensus. Flagged source: {topic.poisoning.flaggedSource}.
                </p>
              </div>
            </div>
          )}

          {/* Source breakdown */}
          <div className="grid grid-cols-3 gap-3">
            {(["twitter", "reddit", "stocktwits"] as const).map((src) => {
              const data = topic.sources[src];
              const label = src === "twitter" ? "X / Twitter" : src === "reddit" ? "Reddit" : "StockTwits";
              return (
                <div key={src} className="rounded-md border border-navy-800/40 bg-navy-950/60 p-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-2">{label}</div>
                  {data.available ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-lg font-mono font-bold", sentimentColor(data.credibilityWeightedSentiment))}>
                          {data.credibilityWeightedSentiment >= 0 ? "+" : ""}{(data.credibilityWeightedSentiment * 100).toFixed(0)}
                        </span>
                        <SentimentBar score={data.credibilityWeightedSentiment} width="w-16" />
                      </div>
                      <div className="text-[10px] text-navy-600 mt-1">{data.count} posts sampled</div>
                      <div className="text-[10px] text-navy-600">
                        Raw avg: {data.avgSentiment >= 0 ? "+" : ""}{(data.avgSentiment * 100).toFixed(0)}
                        {Math.abs(data.avgSentiment - data.credibilityWeightedSentiment) > 0.1 && (
                          <span className="text-navy-700 ml-1">(credibility shift: {((data.credibilityWeightedSentiment - data.avgSentiment) * 100).toFixed(0)})</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-[11px] text-navy-600 py-2">No data available</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Top posts */}
          {topic.topPosts.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-2">Top Posts (by engagement x credibility)</div>
              <div className="space-y-1.5">
                {topic.topPosts.map((post, i) => (
                  <div key={i} className="flex items-start gap-2 py-1.5 border-b border-navy-800/30 last:border-0">
                    <span className={cn(
                      "text-[9px] font-mono px-1 py-0.5 rounded flex-shrink-0 mt-0.5",
                      post.source === "twitter" ? "bg-navy-800/60 text-navy-400" :
                      post.source === "reddit" ? "bg-navy-800/60 text-navy-400" :
                      "bg-navy-800/60 text-navy-400"
                    )}>
                      {sourceLabel(post.source)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-navy-200 leading-relaxed line-clamp-2">{post.text}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-[9px] font-mono text-navy-600">
                        <span>@{post.author}</span>
                        <span>{timeAgo(post.timestamp)}</span>
                        <span className={sentimentColor(post.sentiment)}>
                          {post.sentiment >= 0 ? "+" : ""}{(post.sentiment * 100).toFixed(0)}
                        </span>
                        <span>cred: {(post.credibility * 100).toFixed(0)}%</span>
                        {post.raw.likes !== undefined && <span>{post.raw.likes} likes</span>}
                        {post.raw.score !== undefined && <span>{post.raw.score} pts</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──

export default function SentimentPage() {
  const [data, setData] = useState<SentimentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/sentiment/social");
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setData(json);
        setError(null);
        setLastRefresh(new Date());
      }
    } catch {
      setError("Failed to load sentiment data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Poll every 5 min (data updates every 30 min on background, but catch it quickly)
    pollRef.current = setInterval(fetchData, 5 * 60_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchData]);

  // Sort topics: poisoning flags first, then by absolute sentiment (most directional first)
  const sortedTopics = data?.topics
    ? [...data.topics].sort((a, b) => {
        if (a.poisoning.detected && !b.poisoning.detected) return -1;
        if (!a.poisoning.detected && b.poisoning.detected) return 1;
        return Math.abs(b.composite.sentiment) - Math.abs(a.composite.sentiment);
      })
    : [];

  const poisonedCount = sortedTopics.filter((t) => t.poisoning.detected).length;
  const bullishCount = sortedTopics.filter((t) => t.composite.sentiment > 0.1).length;
  const bearishCount = sortedTopics.filter((t) => t.composite.sentiment < -0.1).length;
  const totalPosts = sortedTopics.reduce((s, t) => s + t.composite.postCount, 0);

  return (
    <PageContainer
      title="Social Sentiment"
      subtitle="Multi-source sentiment with credibility scoring and poisoning detection"
      actions={
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-[10px] font-mono text-navy-500">
              {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            className="flex items-center gap-1.5 rounded-md border border-navy-700/40 bg-navy-900 px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-navy-300 hover:bg-navy-800 transition-colors"
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      }
    >
      {loading && !data ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="border border-accent-rose/30 rounded-md bg-accent-rose/5 p-4 text-center">
          <p className="text-xs text-accent-rose">{error}</p>
        </div>
      ) : data && sortedTopics.length === 0 ? (
        <div className="text-center py-16">
          <RefreshCw className="h-6 w-6 text-navy-600 mx-auto mb-3 animate-spin" />
          <p className="text-sm text-navy-400">Sentiment scan initializing...</p>
          <p className="text-[11px] text-navy-600 mt-1">First scan runs on page load. Data will appear within 60 seconds.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-md border border-navy-700/20 bg-navy-900/40 p-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Topics</span>
                <InfoTooltip content="Number of topics actively tracked across Twitter/X, Reddit, and StockTwits. Scans run every 30 minutes in the background." side="bottom" />
              </div>
              <div className="text-lg font-bold font-mono text-navy-100 mt-1">{sortedTopics.length}</div>
              <div className="text-[10px] text-navy-600">{totalPosts} total posts</div>
            </div>
            <div className="rounded-md border border-navy-700/20 bg-navy-900/40 p-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Bullish</span>
                <InfoTooltip content="Topics where credibility-weighted sentiment across all sources is positive (>0.1 on a -1 to +1 scale)." side="bottom" />
              </div>
              <div className="text-lg font-bold font-mono text-navy-100 mt-1">{bullishCount}</div>
              <div className="text-[10px] text-navy-600">of {sortedTopics.length} topics</div>
            </div>
            <div className="rounded-md border border-navy-700/20 bg-navy-900/40 p-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Bearish</span>
                <InfoTooltip content="Topics where credibility-weighted sentiment across all sources is negative (<-0.1 on a -1 to +1 scale)." side="bottom" />
              </div>
              <div className="text-lg font-bold font-mono text-navy-100 mt-1">{bearishCount}</div>
              <div className="text-[10px] text-navy-600">of {sortedTopics.length} topics</div>
            </div>
            <div className="rounded-md border border-navy-700/20 bg-navy-900/40 p-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Anomalies</span>
                <InfoTooltip content="Topics where one source diverges sharply from the others. This can indicate coordinated manipulation, bot campaigns, or astroturfing. Cross-reference with other NEXUS intelligence before acting on anomalous sentiment." side="bottom" />
              </div>
              <div className={cn("text-lg font-bold font-mono mt-1", poisonedCount > 0 ? "text-accent-amber" : "text-navy-100")}>
                {poisonedCount}
              </div>
              <div className="text-[10px] text-navy-600">{poisonedCount > 0 ? "source divergence" : "all sources agree"}</div>
            </div>
          </div>

          {/* Column headers */}
          <div className="flex items-center gap-4 px-5 text-[9px] font-mono uppercase tracking-wider text-navy-600">
            <span className="w-32">Topic</span>
            <span className="w-44">Sentiment</span>
            <span className="w-24">Label</span>
            <span className="flex-1">Sources</span>
            <span className="w-24 text-right">Volume</span>
            <span className="w-14 text-right">Age</span>
          </div>

          {/* Topic cards */}
          <div className="space-y-2">
            {sortedTopics.map((topic) => (
              <TopicCard
                key={topic.topic}
                topic={topic}
                expanded={expandedTopic === topic.topic}
                onToggle={() => setExpandedTopic(expandedTopic === topic.topic ? null : topic.topic)}
              />
            ))}
          </div>

          {/* Methodology note */}
          <div className="rounded-md border border-navy-800/30 bg-navy-950/40 px-4 py-3">
            <p className="text-[10px] font-mono text-navy-600 leading-relaxed">
              Sentiment is keyword-scored (no AI inference) from public posts across Twitter/X, Reddit (r/wallstreetbets, r/stocks, r/investing, r/geopolitics, r/worldnews), and StockTwits.
              Credibility weighting downranks low-engagement posts, suspicious engagement patterns (high retweets but no likes), and new/low-karma accounts.
              Poisoning detection flags when one source diverges {'>'} 50% from the cross-source consensus.
              Updated every 30 minutes. Not investment advice.
            </p>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
