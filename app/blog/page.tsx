"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PublicNav } from "@/components/layout/public-nav";
import { PublicFooter } from "@/components/layout/public-footer";
import {
  Clock,
  Globe,
  BarChart3,
  Zap,
  Flame,
  Droplets,
  ArrowRight,
} from "lucide-react";

interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  readingTime: number | null;
  tags: string | null;
  publishedAt: string | null;
}

const categoryConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  market: { icon: <BarChart3 className="w-3 h-3" />, label: "MARKETS", color: "text-accent-cyan border-accent-cyan/20 bg-accent-cyan/5" },
  geopolitical: { icon: <Globe className="w-3 h-3" />, label: "GEOPOLITICS", color: "text-accent-amber border-accent-amber/20 bg-accent-amber/5" },
  macro: { icon: <Zap className="w-3 h-3" />, label: "MACRO", color: "text-accent-emerald border-accent-emerald/20 bg-accent-emerald/5" },
  energy: { icon: <Flame className="w-3 h-3" />, label: "ENERGY", color: "text-accent-rose border-accent-rose/20 bg-accent-rose/5" },
  commodities: { icon: <Droplets className="w-3 h-3" />, label: "COMMODITIES", color: "text-accent-amber border-accent-amber/20 bg-accent-amber/5" },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  try { return JSON.parse(tags); } catch { return []; }
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/blog?limit=30")
      .then((r) => r.json())
      .then((d) => setPosts(d.posts || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-navy-950 text-navy-200">
      <PublicNav />
      <main className="pt-24 pb-20 max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="mb-12">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-navy-500 mb-3">
            NEXUS Research Desk
          </div>
          <h1 className="text-2xl md:text-3xl font-mono font-bold text-navy-50 tracking-tight mb-4">
            Intelligence Briefings
          </h1>
          <p className="text-sm text-navy-400 leading-relaxed max-w-2xl">
            Deep-form analysis at the intersection of geopolitics, macro, and markets.
            Every article is grounded in NEXUS signal intelligence, prediction data, and
            regime context.
          </p>
        </div>

        {/* Posts */}
        {loading ? (
          <div className="space-y-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="border border-navy-700/30 rounded-lg bg-navy-900/20 p-6 animate-pulse">
                <div className="h-3 w-24 bg-navy-800 rounded mb-4" />
                <div className="h-5 w-3/4 bg-navy-800 rounded mb-3" />
                <div className="h-3 w-full bg-navy-800/50 rounded mb-2" />
                <div className="h-3 w-2/3 bg-navy-800/50 rounded" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 p-12 text-center">
            <BarChart3 className="w-8 h-8 text-navy-600 mx-auto mb-4" />
            <p className="text-sm text-navy-400 font-mono">No published articles yet</p>
            <p className="text-xs text-navy-500 mt-1">Check back soon for intelligence briefings</p>
          </div>
        ) : (
          <div className="space-y-0">
            {posts.map((post, index) => {
              const cat = categoryConfig[post.category] || categoryConfig.market;
              const tags = parseTags(post.tags);

              return (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group block border-b border-navy-700/20 py-8 first:pt-0 last:border-b-0 hover:bg-navy-900/10 -mx-4 px-4 rounded-lg transition-colors"
                >
                  {/* Meta row */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[9px] font-mono uppercase tracking-widest ${cat.color}`}>
                      {cat.icon}
                      {cat.label}
                    </span>
                    {post.publishedAt && (
                      <span className="text-[10px] font-mono text-navy-500">
                        {formatDate(post.publishedAt)}
                      </span>
                    )}
                    {post.readingTime && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-navy-500">
                        <Clock className="w-2.5 h-2.5" />
                        {post.readingTime} min read
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h2 className="text-lg font-semibold text-navy-100 group-hover:text-white transition-colors mb-2 font-mono tracking-tight">
                    {post.title}
                  </h2>

                  {/* Excerpt */}
                  <p className="text-sm text-navy-400 leading-relaxed mb-3">
                    {post.excerpt}
                  </p>

                  {/* Tags + Read more */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="text-[9px] font-mono text-navy-500 uppercase tracking-wider">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-mono text-navy-500 group-hover:text-accent-cyan transition-colors">
                      Read analysis
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
