"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PublicNav } from "@/components/layout/public-nav";
import { PublicFooter } from "@/components/layout/public-footer";
import { BlogBody } from "@/components/blog/widget-renderer";
import {
  Clock,
  ArrowLeft,
  Share2,
} from "lucide-react";

interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  author: string;
  readingTime: number | null;
  tags: string | null;
  publishedAt: string | null;
  predictionId: number | null;
}

const categoryLabels: Record<string, string> = {
  market: "Markets",
  geopolitical: "Geopolitics",
  macro: "Macro",
  energy: "Energy",
  commodities: "Commodities",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  try { return JSON.parse(tags); } catch { return []; }
}

export default function BlogPostPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/blog/${slug}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((d) => {
        if (d?.post) setPost(d.post);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: post?.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 text-navy-200">
      <PublicNav />
      <main className="pt-24 pb-20 max-w-3xl mx-auto px-6">
        {/* Back link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-navy-500 hover:text-navy-300 transition-colors mb-8"
        >
          <ArrowLeft className="w-3 h-3" />
          All briefings
        </Link>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-3 w-20 bg-navy-800 rounded" />
            <div className="h-8 w-3/4 bg-navy-800 rounded" />
            <div className="h-4 w-full bg-navy-800/50 rounded" />
            <div className="h-4 w-2/3 bg-navy-800/50 rounded" />
            <div className="h-px bg-navy-700/30 my-8" />
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-3 w-full bg-navy-800/30 rounded" />
              ))}
            </div>
          </div>
        ) : notFound ? (
          <div className="text-center py-20">
            <p className="text-sm text-navy-400 font-mono">Article not found</p>
            <Link href="/blog" className="text-xs text-accent-cyan hover:text-accent-cyan/80 mt-2 inline-block">
              Return to briefings
            </Link>
          </div>
        ) : post ? (
          <article>
            {/* Category + meta */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-mono uppercase tracking-wider bg-navy-100 text-navy-900 px-2 py-0.5 rounded-sm">
                {categoryLabels[post.category] || post.category}
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
            <h1 className="text-2xl md:text-3xl font-mono font-bold text-navy-50 tracking-tight mb-4 leading-tight">
              {post.title}
            </h1>

            {/* Excerpt */}
            <p className="text-sm text-navy-400 leading-relaxed mb-6">
              {post.excerpt}
            </p>

            {/* Author + share */}
            <div className="flex items-center justify-between py-4 border-y border-navy-700/30 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-navy-800 border border-navy-700/40 flex items-center justify-center">
                  <span className="text-[10px] font-mono font-semibold text-navy-300">
                    {post.author.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-mono text-navy-200">{post.author}</div>
                  <div className="text-[10px] text-navy-500">NEXUS Intelligence Platform</div>
                </div>
              </div>
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-navy-700/30 bg-navy-900/30 text-[10px] font-mono text-navy-400 hover:text-navy-200 hover:bg-navy-800/40 transition-colors"
              >
                <Share2 className="w-3 h-3" />
                Share
              </button>
            </div>

            {/* Body with widget rendering */}
            <div className="blog-article">
              <BlogBody body={post.body} />
            </div>

            {/* Tags */}
            {parseTags(post.tags).length > 0 && (
              <div className="flex items-center gap-2 mt-10 pt-6 border-t border-navy-700/30">
                {parseTags(post.tags).map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded border border-navy-700/30 bg-navy-900/20 text-[9px] font-mono uppercase tracking-wider text-navy-400"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* CTA */}
            <div className="mt-12 p-6 rounded-lg border border-navy-700/30 bg-navy-900/20 text-center">
              <p className="text-sm text-navy-300 mb-3">
                Get real-time intelligence alerts, AI-driven predictions, and full platform access.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-[11px] font-mono uppercase tracking-wider text-navy-100 hover:bg-white/[0.1] transition-colors"
              >
                Request Access
                <ArrowLeft className="w-3 h-3 rotate-180" />
              </Link>
            </div>
          </article>
        ) : null}
      </main>
      <PublicFooter />
    </div>
  );
}
