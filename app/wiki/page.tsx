"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  BookOpen,
  Globe,
  TrendingUp,
  Shield,
  ChevronRight,
  Loader2,
  ExternalLink,
  ArrowLeft,
  Download,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { UpgradeGate } from "@/components/subscription/upgrade-gate";

interface WikiEntry {
  id: number;
  title: string;
  content: string;
  category: string;
  tags: string | null;
  confidence: number;
  createdAt: string;
  thumbnail?: string | null;
}

interface CategoryCount {
  category: string;
  count: number;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof Globe; color: string }> = {
  geopolitical: { label: "Geopolitical", icon: Globe, color: "text-accent-cyan" },
  market: { label: "Markets & Economics", icon: TrendingUp, color: "text-accent-amber" },
  actor_intelligence: { label: "Intelligence", icon: Shield, color: "text-accent-rose" },
  event: { label: "Events", icon: BookOpen, color: "text-accent-emerald" },
};

export default function WikiPage() {
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<WikiEntry[]>([]);
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<WikiEntry | null>(null);
  const [articleLoading, setArticleLoading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState<string | null>(null);
  const [articleImage, setArticleImage] = useState<string | null>(null);

  const fetchEntries = useCallback(async (category?: string | null) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ browse: "true", limit: "30" });
      if (category) params.set("category", category);
      const res = await fetch(`/api/wiki?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        setTotal(data.total || 0);
        if (data.categories) setCategories(data.categories);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  const searchEntries = useCallback(async (q: string) => {
    if (!q.trim()) {
      fetchEntries(selectedCategory);
      return;
    }
    setSearching(true);
    try {
      const params = new URLSearchParams({ q });
      if (selectedCategory) params.set("category", selectedCategory);
      const res = await fetch(`/api/wiki?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        setTotal(data.total || 0);
      }
    } catch { /* silent */ }
    setSearching(false);
  }, [selectedCategory, fetchEntries]);

  const openArticle = async (id: number) => {
    setArticleLoading(true);
    setArticleImage(null);
    try {
      const res = await fetch(`/api/wiki?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedArticle(data.entry);
        setArticleImage(data.image || data.thumbnail || null);
      }
    } catch { /* silent */ }
    setArticleLoading(false);
  };

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    if (!query) fetchEntries(selectedCategory);
  }, [selectedCategory, fetchEntries, query]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) return;
    const timer = setTimeout(() => searchEntries(query), 300);
    return () => clearTimeout(timer);
  }, [query, searchEntries]);

  const wikiUrl = (title: string) =>
    `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/^Wikipedia:\s*/i, "").replace(/ /g, "_"))}`;

  // Article detail view
  if (selectedArticle) {
    const cleanTitle = selectedArticle.title.replace(/^Wikipedia:\s*/i, "");
    const catConfig = CATEGORY_CONFIG[selectedArticle.category] || CATEGORY_CONFIG.event;

    return (
      <UpgradeGate minTier="observer" feature="Wiki">
        <PageContainer title="Wiki">
          <div className="max-w-4xl">
            {/* Back button */}
            <button
              onClick={() => setSelectedArticle(null)}
              className="flex items-center gap-1.5 text-[11px] font-mono text-navy-500 hover:text-navy-200 transition-colors mb-6"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to results
            </button>

            {/* Article header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[9px] font-mono uppercase tracking-wider ${catConfig.color} bg-navy-800/60 rounded px-1.5 py-0.5`}>
                  {catConfig.label}
                </span>
                <span className="text-[9px] font-mono text-navy-600">
                  conf {((selectedArticle.confidence || 0.75) * 100).toFixed(0)}%
                </span>
              </div>
              <h1 className="text-xl font-bold text-navy-100 font-mono mb-2">
                {cleanTitle}
              </h1>
              <a
                href={wikiUrl(selectedArticle.title)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] font-mono text-accent-cyan/70 hover:text-accent-cyan transition-colors"
              >
                <ExternalLink className="h-2.5 w-2.5" />
                View on Wikipedia
              </a>
            </div>

            {/* Article image */}
            {articleImage && (
              <div className="mb-6 rounded overflow-hidden border border-navy-700/40">
                <img
                  src={articleImage}
                  alt={cleanTitle}
                  className="w-full max-h-[300px] object-cover"
                />
              </div>
            )}

            {/* Article content */}
            <div className="border border-navy-700/40 rounded bg-navy-900/40 p-6">
              <div className="text-[13px] text-navy-300 leading-[1.8] font-sans whitespace-pre-wrap">
                {selectedArticle.content}
              </div>
            </div>

            {/* Tags */}
            {selectedArticle.tags && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {JSON.parse(selectedArticle.tags).map((tag: string) => (
                  <span
                    key={tag}
                    className="text-[9px] font-mono text-navy-500 bg-navy-800/40 rounded px-1.5 py-0.5"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </PageContainer>
      </UpgradeGate>
    );
  }

  // List view
  return (
    <UpgradeGate minTier="observer" feature="Wiki">
      <PageContainer title="Wiki">
        <div className="max-w-5xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-[11px] text-navy-500 font-mono">
              {total} articles from Wikipedia ingested into the knowledge bank
            </p>
            <div className="flex items-center gap-2">
              {ingestResult && (
                <span className={`text-[10px] font-mono ${ingestResult.includes("Error") ? "text-accent-rose" : "text-accent-emerald"}`}>
                  {ingestResult}
                </span>
              )}
              <button
                onClick={async () => {
                  setIngesting(true);
                  setIngestResult(null);
                  try {
                    const res = await fetch("/api/wiki/ingest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ maxPerCategory: 50 }) });
                    if (res.ok) {
                      const data = await res.json();
                      setIngestResult(`${data.ingested} ingested, ${data.skipped} skipped`);
                      fetchEntries(selectedCategory);
                    } else {
                      const data = await res.json().catch(() => ({}));
                      setIngestResult(data.error || "Error");
                    }
                  } catch {
                    setIngestResult("Error: request failed");
                  }
                  setIngesting(false);
                  setTimeout(() => setIngestResult(null), 8000);
                }}
                disabled={ingesting}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider text-navy-400 border border-navy-700/40 hover:text-accent-cyan hover:border-accent-cyan/30 hover:bg-accent-cyan/5 transition-colors disabled:opacity-50"
              >
                {ingesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                {ingesting ? "Ingesting..." : "Ingest Wikipedia"}
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-navy-600" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Semantic search across Wikipedia knowledge..."
              className="w-full pl-9 pr-4 py-2.5 bg-navy-900/60 border border-navy-700/40 rounded text-[12px] font-mono text-navy-200 placeholder-navy-600 focus:outline-none focus:border-accent-cyan/30 transition-colors"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-accent-cyan animate-spin" />
            )}
          </div>

          {/* Category filters */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-2.5 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider transition-colors ${
                !selectedCategory
                  ? "bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30"
                  : "text-navy-500 border border-navy-700/40 hover:text-navy-300 hover:border-navy-700"
              }`}
            >
              All ({total})
            </button>
            {categories.map((cat) => {
              const config = CATEGORY_CONFIG[cat.category] || CATEGORY_CONFIG.event;
              const Icon = config.icon;
              return (
                <button
                  key={cat.category}
                  onClick={() => setSelectedCategory(cat.category === selectedCategory ? null : cat.category)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider transition-colors ${
                    selectedCategory === cat.category
                      ? "bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30"
                      : "text-navy-500 border border-navy-700/40 hover:text-navy-300 hover:border-navy-700"
                  }`}
                >
                  <Icon className="h-2.5 w-2.5" />
                  {config.label} ({cat.count})
                </button>
              );
            })}
          </div>

          {/* Loading */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-5 w-5 text-accent-cyan animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen className="h-8 w-8 text-navy-700 mx-auto mb-3" />
              <p className="text-[12px] text-navy-500 font-mono">
                {query ? "No articles match your search" : "No Wikipedia articles ingested yet"}
              </p>
              <p className="text-[10px] text-navy-600 font-mono mt-1">
                {!query && "Run the Wikipedia ingest from the admin panel to populate"}
              </p>
            </div>
          ) : (
            /* Article list */
            <div className="space-y-1">
              {entries.map((entry) => {
                const cleanTitle = entry.title.replace(/^Wikipedia:\s*/i, "");
                const catConfig = CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG.event;

                return (
                  <button
                    key={entry.id}
                    onClick={() => openArticle(entry.id)}
                    className="w-full flex items-start gap-3 p-3 rounded border border-transparent hover:border-navy-700/40 hover:bg-navy-900/40 transition-all text-left group"
                  >
                    {entry.thumbnail && (
                      <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 border border-navy-700/30">
                        <img
                          src={entry.thumbnail}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] font-mono uppercase tracking-wider ${catConfig.color}`}>
                          {catConfig.label}
                        </span>
                      </div>
                      <h3 className="text-[13px] font-mono text-navy-200 group-hover:text-navy-100 transition-colors truncate">
                        {cleanTitle}
                      </h3>
                      <p className="text-[11px] text-navy-500 mt-0.5 line-clamp-1">
                        {entry.content}
                      </p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-navy-700 group-hover:text-navy-400 transition-colors mt-1 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Article loading overlay */}
          {articleLoading && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
              <div className="flex items-center gap-2 bg-navy-900 border border-navy-700 rounded-lg px-4 py-3">
                <Loader2 className="h-4 w-4 text-accent-cyan animate-spin" />
                <span className="text-[11px] font-mono text-navy-300">Loading article...</span>
              </div>
            </div>
          )}
        </div>
      </PageContainer>
    </UpgradeGate>
  );
}
