"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  ExternalLink,
  Globe,
  Flame,
  TrendingUp,
  Zap,
  RefreshCw,
  Newspaper,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";

interface NewsArticle {
  title: string;
  url: string;
  source: string;
  date: string;
  category: "world" | "markets" | "conflict" | "energy";
  imageUrl?: string;
  description?: string;
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
  world: "text-navy-400",
};

const CATEGORY_BG: Record<string, string> = {
  conflict: "bg-accent-rose/10 border-accent-rose/20",
  markets: "bg-accent-cyan/10 border-accent-cyan/20",
  energy: "bg-accent-amber/10 border-accent-amber/20",
  world: "bg-navy-800/50 border-navy-700/30",
};

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

  async function fetchNews() {
    try {
      const params = new URLSearchParams({ limit: "50" });
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

  useEffect(() => {
    setLoading(true);
    fetchNews();
    const interval = setInterval(fetchNews, 300_000); // refresh every 5 min
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

  // Split into featured (first 3 with images) and rest
  const withImages = articles.filter((a) => a.imageUrl);
  const featured = withImages.slice(0, 3);
  const featuredUrls = new Set(featured.map((a) => a.url));
  const rest = articles.filter((a) => !featuredUrls.has(a.url));

  return (
    <PageContainer title="News" subtitle="Real-time intelligence feed from global sources">
      {/* Top bar: categories + refresh */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const count = cat.id === "all" ? articles.length : (categoryCounts[cat.id] || 0);
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider transition-colors ${
                  activeCategory === cat.id
                    ? "bg-navy-800 text-navy-100 border border-navy-600"
                    : "text-navy-500 border border-navy-800 hover:text-navy-300 hover:border-navy-700"
                }`}
              >
                <Icon className="h-3 w-3" />
                {cat.label}
                {count > 0 && (
                  <span className="text-[9px] text-navy-500 ml-0.5">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[9px] font-mono text-navy-600">
              Updated {timeAgo(lastUpdated.toISOString())}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-mono text-navy-500 border border-navy-800 hover:text-navy-300 hover:border-navy-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-navy-800/50 bg-navy-900/30 p-4 animate-pulse">
              <div className="h-3 bg-navy-800 rounded w-3/4 mb-2" />
              <div className="h-2.5 bg-navy-800/60 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-16">
          <Newspaper className="h-6 w-6 text-navy-700 mx-auto mb-3" />
          <p className="text-sm text-navy-500">No articles available</p>
          <p className="text-xs text-navy-600 mt-1">Check your connection or try refreshing</p>
        </div>
      ) : (
        <>
          {/* Featured articles with images */}
          {featured.length > 0 && activeCategory === "all" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {featured.map((article) => (
                <a
                  key={article.url}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-lg border border-navy-700/40 bg-navy-900/60 overflow-hidden hover:border-navy-600/60 hover:bg-navy-900/80 transition-all"
                >
                  {article.imageUrl && (
                    <div className="h-36 overflow-hidden bg-navy-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={article.imageUrl}
                        alt=""
                        className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[9px] font-mono uppercase tracking-[0.15em] ${CATEGORY_COLORS[article.category]}`}>
                        {article.category}
                      </span>
                      <span className="text-[9px] font-mono text-navy-600">{article.source}</span>
                    </div>
                    <h3 className="text-[13px] font-sans font-medium text-navy-200 group-hover:text-navy-100 transition-colors leading-snug mb-2 line-clamp-2">
                      {article.title}
                    </h3>
                    {article.description && (
                      <p className="text-[10px] text-navy-500 font-sans leading-relaxed line-clamp-2 mb-2">
                        {article.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 text-[9px] font-mono text-navy-600">
                      <Clock className="h-2.5 w-2.5" />
                      {timeAgo(article.date)}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Article list */}
          <div className="space-y-1">
            {rest.map((article) => (
              <a
                key={article.url}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3 rounded-lg border border-transparent hover:border-navy-700/40 hover:bg-navy-900/40 px-4 py-3 transition-all"
              >
                <div className="pt-0.5 shrink-0">
                  <span className={`inline-flex items-center justify-center h-6 w-6 rounded border text-[8px] font-mono uppercase ${CATEGORY_BG[article.category]}`}>
                    {article.category === "conflict" && <Flame className={`h-3 w-3 ${CATEGORY_COLORS[article.category]}`} />}
                    {article.category === "markets" && <TrendingUp className={`h-3 w-3 ${CATEGORY_COLORS[article.category]}`} />}
                    {article.category === "energy" && <Zap className={`h-3 w-3 ${CATEGORY_COLORS[article.category]}`} />}
                    {article.category === "world" && <Globe className={`h-3 w-3 ${CATEGORY_COLORS[article.category]}`} />}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[12px] font-sans font-medium text-navy-200 group-hover:text-navy-100 transition-colors leading-snug mb-1 line-clamp-1">
                    {article.title}
                  </h3>
                  {article.description && (
                    <p className="text-[10px] text-navy-500 font-sans leading-relaxed line-clamp-1 mb-1">
                      {article.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-mono text-navy-600">{article.source}</span>
                    <div className="flex items-center gap-1 text-[9px] font-mono text-navy-600">
                      <Clock className="h-2.5 w-2.5" />
                      {timeAgo(article.date)}
                    </div>
                  </div>
                </div>
                <ExternalLink className="h-3 w-3 text-navy-700 group-hover:text-navy-400 transition-colors mt-1 shrink-0" />
              </a>
            ))}
          </div>
        </>
      )}
    </PageContainer>
  );
}
