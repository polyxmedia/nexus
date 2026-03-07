"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface NewsArticle {
  title: string;
  url: string;
  source: string;
  date: string;
  category: "world" | "markets" | "conflict" | "energy";
  imageUrl?: string;
  description?: string;
}

const CATEGORIES = ["all", "world", "markets", "conflict", "energy"] as const;

const CATEGORY_COLORS: Record<string, string> = {
  world: "bg-signal-3/20 text-signal-3 border-signal-3/30",
  markets: "bg-signal-4/20 text-signal-4 border-signal-4/30",
  conflict: "bg-signal-1/20 text-signal-1 border-signal-1/30",
  energy: "bg-signal-5/20 text-signal-5 border-signal-5/30",
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return "just now";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

interface NewsWidgetProps {
  maxItems?: number;
  showCategories?: boolean;
  category?: string;
}

export function NewsWidget({
  maxItems = 30,
  showCategories = true,
  category: fixedCategory,
}: NewsWidgetProps) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>(fixedCategory || "all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNews = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);

      try {
        const cat = activeCategory === "all" ? "" : activeCategory;
        const params = new URLSearchParams();
        if (cat) params.set("category", cat);
        params.set("limit", String(maxItems));

        const res = await fetch(`/api/news?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setArticles(data);
        }
      } catch {
        // Silently fail on refresh
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeCategory, maxItems]
  );

  useEffect(() => {
    setLoading(true);
    fetchNews();

    // Auto-refresh every 5 minutes
    intervalRef.current = setInterval(() => fetchNews(true), 300_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchNews]);

  return (
    <div className="border border-navy-700/30 rounded bg-navy-900/60 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-navy-700/30">
        <span className="text-[10px] uppercase tracking-wider text-navy-500 font-mono">
          Live News Feed
        </span>
        {refreshing && (
          <svg
            className="w-3 h-3 text-navy-500 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
      </div>

      {/* Category tabs */}
      {showCategories && !fixedCategory && (
        <div className="flex gap-1 px-4 py-2 border-b border-navy-700/30">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-mono rounded transition-colors ${
                activeCategory === cat
                  ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30"
                  : "text-navy-500 hover:text-navy-300 border border-transparent"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Articles list */}
      <div className="overflow-y-auto max-h-[480px] divide-y divide-navy-800/40">
        {loading ? (
          <div className="px-4 py-8 text-center text-navy-600 text-xs font-mono">
            Loading feed...
          </div>
        ) : articles.length === 0 ? (
          <div className="px-4 py-8 text-center text-navy-600 text-xs font-mono">
            No articles found
          </div>
        ) : (
          articles.map((article, i) => (
            <div
              key={`${article.url}-${i}`}
              className="px-4 py-2.5 hover:bg-navy-800/30 transition-colors"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent-cyan hover:text-accent-cyan/80 leading-snug block truncate"
                    title={article.title}
                  >
                    {article.title}
                  </a>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`inline-block px-1.5 py-0 text-[9px] uppercase tracking-wider font-mono rounded border ${
                        CATEGORY_COLORS[article.category] || ""
                      }`}
                    >
                      {article.category}
                    </span>
                    <span className="text-[10px] text-navy-500 font-mono">
                      {article.source}
                    </span>
                    <span className="text-[10px] text-navy-600 font-mono">
                      {relativeTime(article.date)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
