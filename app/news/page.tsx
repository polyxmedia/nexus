"use client";

import { useState, useEffect } from "react";
import {
  ExternalLink,
  Globe,
  Flame,
  TrendingUp,
  Zap,
  RefreshCw,
  Newspaper,
  BrainCircuit,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Markdown } from "@/components/ui/markdown";

type PoliticalBias = "far-left" | "left" | "center-left" | "center" | "center-right" | "right" | "far-right" | "unknown";

interface NewsArticle {
  title: string;
  url: string;
  source: string;
  date: string;
  category: "world" | "markets" | "conflict" | "energy";
  imageUrl?: string;
  description?: string;
  bias: PoliticalBias;
}

const CATEGORIES = [
  { id: "all", label: "All", icon: Newspaper },
  { id: "conflict", label: "Conflict", icon: Flame },
  { id: "markets", label: "Markets", icon: TrendingUp },
  { id: "energy", label: "Energy", icon: Zap },
  { id: "world", label: "World", icon: Globe },
];

const CATEGORY_COLORS: Record<string, string> = {
  conflict: "text-accent-rose",
  markets: "text-accent-cyan",
  energy: "text-accent-amber",
  world: "text-navy-500",
};

const CATEGORY_ICONS: Record<string, typeof Flame> = {
  conflict: Flame,
  markets: TrendingUp,
  energy: Zap,
  world: Globe,
};

const BIAS_CONFIG: Record<PoliticalBias, { label: string; short: string; color: string; position: number }> = {
  "far-left":     { label: "Far Left",     short: "FL", color: "text-blue-400",        position: 0 },
  "left":         { label: "Left",         short: "L",  color: "text-blue-400",        position: 1 },
  "center-left":  { label: "Center Left",  short: "CL", color: "text-sky-400",         position: 2 },
  "center":       { label: "Center",       short: "C",  color: "text-navy-400",        position: 3 },
  "center-right": { label: "Center Right", short: "CR", color: "text-orange-400",      position: 4 },
  "right":        { label: "Right",        short: "R",  color: "text-red-400",         position: 5 },
  "far-right":    { label: "Far Right",    short: "FR", color: "text-red-400",         position: 6 },
  "unknown":      { label: "Unknown",      short: "?",  color: "text-navy-600",        position: 3 },
};

function BiasIndicator({ bias }: { bias: PoliticalBias }) {
  const cfg = BIAS_CONFIG[bias];
  if (bias === "unknown") return null;

  // 7 dots representing the spectrum, highlight the active position
  return (
    <span className="inline-flex items-center gap-0.5 group/bias relative" title={cfg.label}>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <span
          key={i}
          className={`h-1 rounded-full transition-all ${
            i === cfg.position
              ? `w-2.5 ${i <= 1 ? "bg-blue-400" : i <= 2 ? "bg-sky-400" : i === 3 ? "bg-navy-400" : i <= 4 ? "bg-orange-400" : "bg-red-400"}`
              : "w-1 bg-navy-700/60"
          }`}
        />
      ))}
      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] font-mono text-navy-400 bg-navy-900 px-1.5 py-0.5 rounded opacity-0 group-hover/bias:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        {cfg.label}
      </span>
    </span>
  );
}

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

export default function NewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [digest, setDigest] = useState<string | null>(null);
  const [digestLoading, setDigestLoading] = useState(false);

  async function fetchNews() {
    try {
      const params = new URLSearchParams({ limit: "80" });
      if (activeCategory !== "all") params.set("category", activeCategory);
      const res = await fetch(`/api/news?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setArticles(Array.isArray(data) ? data : []);
      setLastUpdated(new Date());
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function fetchDigest() {
    setDigestLoading(true);
    try {
      const res = await fetch("/api/news/digest");
      if (res.ok) {
        const data = await res.json();
        setDigest(data.digest || null);
      }
    } catch { /* fail silently */ }
    setDigestLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    fetchNews();
    fetchDigest();
    const interval = setInterval(fetchNews, 300_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  function handleRefresh() {
    setRefreshing(true);
    fetchNews();
  }

  const categoryCounts = articles.reduce(
    (acc, a) => {
      acc[a.category] = (acc[a.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Bias distribution
  const biasCounts = articles.reduce(
    (acc, a) => {
      if (a.bias !== "unknown") acc[a.bias] = (acc[a.bias] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const biasTotal = Object.values(biasCounts).reduce((a, b) => a + b, 0);

  const withImages = articles.filter((a) => a.imageUrl);
  const featured = withImages.slice(0, 3);
  const featuredUrls = new Set(featured.map((a) => a.url));
  const rest = articles.filter((a) => !featuredUrls.has(a.url));

  return (
    <PageContainer title="News" subtitle="Real-time intelligence feed from global sources">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const count = cat.id === "all" ? articles.length : (categoryCounts[cat.id] || 0);
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider transition-colors ${
                  active
                    ? "bg-navy-800 text-navy-100"
                    : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/40"
                }`}
              >
                <Icon className="h-3 w-3" />
                {cat.label}
                {count > 0 && (
                  <span className={`text-[9px] ml-0.5 ${active ? "text-navy-400" : "text-navy-600"}`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[9px] font-mono text-navy-600">
              {timeAgo(lastUpdated.toISOString())}
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
      </div>

      {/* AI Digest Panel */}
      {(digest || digestLoading) && activeCategory === "all" && (
        <div className="mb-5 rounded-lg border border-accent-cyan/20 bg-accent-cyan/[0.04] p-4">
          <div className="flex items-center gap-2 mb-2">
            <BrainCircuit className="h-3.5 w-3.5 text-accent-cyan opacity-70" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-accent-cyan/70">
              Intelligence Digest
            </span>
            {lastUpdated && (
              <span className="text-[9px] font-mono text-navy-600 ml-auto">
                {timeAgo(lastUpdated.toISOString())}
              </span>
            )}
          </div>
          {digestLoading && !digest ? (
            <div className="flex gap-1.5 items-center text-[11px] text-navy-600 font-mono">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Synthesizing headlines...
            </div>
          ) : (
            <div className="text-[12px] text-navy-300 font-sans leading-relaxed prose-invert">
              <Markdown>{digest ?? ""}</Markdown>
            </div>
          )}
        </div>
      )}

      {/* Bias diversity bar */}
      {biasTotal > 0 && articles.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-navy-600">Source diversity</span>
          </div>
          <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
            {(["far-left", "left", "center-left", "center", "center-right", "right", "far-right"] as PoliticalBias[]).map((b) => {
              const count = biasCounts[b] || 0;
              if (count === 0) return null;
              const pct = (count / biasTotal) * 100;
              const cfg = BIAS_CONFIG[b];
              return (
                <div
                  key={b}
                  title={`${cfg.label}: ${count} articles`}
                  style={{ width: `${pct}%` }}
                  className={`h-full ${b === "far-left" || b === "left" ? "bg-blue-500" : b === "center-left" ? "bg-sky-500" : b === "center" ? "bg-navy-500" : b === "center-right" ? "bg-orange-500" : "bg-red-500"}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[8px] font-mono text-blue-500">Left</span>
            <span className="text-[8px] font-mono text-navy-600">Center</span>
            <span className="text-[8px] font-mono text-red-500">Right</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-px">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="py-3 px-3 animate-pulse">
              <div className="h-3 bg-navy-800/50 rounded w-3/4 mb-2" />
              <div className="h-2 bg-navy-800/30 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-20">
          <Newspaper className="h-5 w-5 text-navy-700 mx-auto mb-3" />
          <p className="text-xs text-navy-500 font-mono">No articles available</p>
        </div>
      ) : (
        <>
          {/* Featured row */}
          {featured.length > 0 && activeCategory === "all" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
              {featured.map((article, idx) => (
                <a
                  key={article.url}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group block overflow-hidden transition-all ${
                    idx === 0 ? "md:col-span-2 md:row-span-2" : ""
                  }`}
                >
                  <div className={`relative ${idx === 0 ? "h-64 md:h-full" : "h-40"} overflow-hidden rounded-lg bg-navy-900`}>
                    {article.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={article.imageUrl}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-65 group-hover:scale-[1.02] transition-all duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[9px] font-mono uppercase tracking-[0.15em] ${CATEGORY_COLORS[article.category]}`}>
                          {article.category}
                        </span>
                        <span className="text-[9px] font-mono text-navy-500">{article.source}</span>
                        <BiasIndicator bias={article.bias} />
                        <span className="text-[9px] font-mono text-navy-600 ml-auto">{timeAgo(article.date)}</span>
                      </div>
                      <h3 className={`font-sans font-medium text-navy-100 group-hover:text-white transition-colors leading-snug ${
                        idx === 0 ? "text-base md:text-lg line-clamp-3" : "text-[13px] line-clamp-2"
                      }`}>
                        {article.title}
                      </h3>
                      {idx === 0 && article.description && (
                        <p className="text-[11px] text-navy-400 font-sans leading-relaxed line-clamp-2 mt-1.5">
                          {article.description}
                        </p>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Wire feed */}
          <div className="divide-y divide-navy-800/40">
            {rest.map((article) => {
              const CatIcon = CATEGORY_ICONS[article.category] || Globe;
              return (
                <a
                  key={article.url}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-3 py-3 px-2 hover:bg-navy-900/30 transition-colors"
                >
                  <CatIcon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${CATEGORY_COLORS[article.category]} opacity-50`} />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[12px] font-sans text-navy-300 group-hover:text-navy-100 transition-colors leading-snug line-clamp-2">
                      {article.title}
                    </h3>
                    {article.description && (
                      <p className="text-[11px] font-sans text-navy-600 leading-snug line-clamp-1 mt-0.5">
                        {article.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-mono text-navy-600">{article.source}</span>
                      <BiasIndicator bias={article.bias} />
                      <span className="text-navy-800">·</span>
                      <span className="text-[9px] font-mono text-navy-600">{timeAgo(article.date)}</span>
                    </div>
                  </div>
                  <ExternalLink className="h-3 w-3 text-navy-800 group-hover:text-navy-500 transition-colors mt-0.5 shrink-0" />
                </a>
              );
            })}
          </div>
        </>
      )}
    </PageContainer>
  );
}
