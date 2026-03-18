"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, Plus, Trash2, FileText, CheckCircle2, ChevronDown, ChevronRight, RefreshCw, Eye, Send, Save, Clock, XCircle, Sparkles, RotateCcw } from "lucide-react";
import { BlogBody } from "@/components/blog/widget-renderer";
import Link from "next/link";

interface BlogPostRecord {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  status: string;
  author: string;
  readingTime: number | null;
  tags: string | null;
  publishedAt: string | null;
  createdAt: string;
  predictionId: number | null;
}

export function BlogWriterPanel() {
  const [posts, setPosts] = useState<BlogPostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [autoPublish, setAutoPublish] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BlogPostRecord | null>(null);
  const [editingPost, setEditingPost] = useState<BlogPostRecord | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editExcerpt, setEditExcerpt] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editorTab, setEditorTab] = useState<"edit" | "preview" | "analysis">("edit");
  const [saving, setSaving] = useState(false);
  const [refining, setRefining] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{
    overallScore: number;
    scores: { accuracy: number; depth: number; clarity: number; voice: number; actionability: number };
    verdict: string;
    issues: string[];
    strengths: string[];
    suggestions: string[];
  } | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Live generation state
  const [genStage, setGenStage] = useState<string | null>(null);
  const [genPremise, setGenPremise] = useState<{ premise: string; angle: string; suggestedTitle: string } | null>(null);
  const [genArticle, setGenArticle] = useState<{ title: string; excerpt: string; body: string; category: string } | null>(null);
  const [genValidation, setGenValidation] = useState<{
    iteration: number;
    score: number;
    verdict: string;
    scores: Record<string, number>;
    issues: string[];
    suggestions: string[];
    strengths: string[];
  } | null>(null);
  const [genIterations, setGenIterations] = useState<{
    iteration: number;
    score: number;
    verdict: string;
  }[]>([]);
  const [genComplete, setGenComplete] = useState<{
    id: number; slug: string; title: string; score: number;
    cost?: {
      totalInputTokens: number; totalOutputTokens: number; totalCostUsd: number; model: string;
      calls: { step: string; inputTokens: number; outputTokens: number; costUsd: number }[];
    };
  } | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/blog");
      const data = await res.json();
      setPosts(data.posts || []);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const handleGenerate = async () => {
    setGenerating(true);
    setSelectedPost(null);
    setStatusMsg(null);
    setGenStage("premise");
    setGenPremise(null);
    setGenArticle(null);
    setGenValidation(null);
    setGenIterations([]);
    setGenComplete(null);
    setGenError(null);

    try {
      const res = await fetch("/api/admin/blog/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoPublish }),
      });

      if (!res.ok || !res.body) {
        setGenError(`Request failed: ${res.status}`);
        setGenerating(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;

          try {
            const event = JSON.parse(payload);
            switch (event.type) {
              case "premise":
                setGenStage("premise");
                setGenPremise(event);
                break;
              case "draft":
                setGenStage("draft");
                setGenArticle(event.article);
                break;
              case "validating":
                setGenStage("validating");
                break;
              case "validated":
                setGenStage("validated");
                setGenValidation(event);
                setGenIterations((prev) => [...prev, { iteration: event.iteration, score: event.score, verdict: event.verdict }]);
                break;
              case "fixing":
                setGenStage("fixing");
                break;
              case "fixed":
                setGenStage("fixed");
                setGenArticle(event.article);
                break;
              case "complete":
                setGenStage("complete");
                setGenComplete(event);
                loadPosts();
                break;
              case "error":
                setGenError(event.message);
                break;
            }
          } catch {}
        }
      }
    } catch (err) {
      setGenError(String(err));
    } finally {
      setGenerating(false);
    }
  };

  const handleAction = async (action: string, id: number) => {
    try {
      await fetch("/api/admin/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id }),
      });
      loadPosts();
      if (selectedPost?.id === id && action === "delete") setSelectedPost(null);
    } catch {}
  };

  const handleSaveEdit = async () => {
    if (!editingPost) return;
    setSaving(true);
    try {
      await fetch("/api/admin/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          id: editingPost.id,
          title: editTitle,
          excerpt: editExcerpt,
          body: editBody,
          category: editCategory,
          tags: editTags,
        }),
      });
      setEditingPost(null);
      loadPosts();
    } catch {} finally {
      setSaving(false);
    }
  };

  const handleRefine = async () => {
    if (!editingPost) return;
    setRefining(true);
    try {
      const res = await fetch("/api/admin/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "refine",
          id: editingPost.id,
          body: editBody,
          title: editTitle,
          excerpt: editExcerpt,
        }),
      });
      const data = await res.json();
      if (data.ok && data.refined) {
        setEditBody(data.refined.body);
        setEditTitle(data.refined.title);
        setEditExcerpt(data.refined.excerpt);
      }
    } catch {} finally {
      setRefining(false);
    }
  };

  const handleAnalyze = async () => {
    if (!editingPost) return;
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const res = await fetch("/api/admin/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze",
          title: editTitle,
          excerpt: editExcerpt,
          body: editBody,
        }),
      });
      const data = await res.json();
      if (data.ok && data.analysis) setAnalysis(data.analysis);
      else setStatusMsg("Analysis failed");
    } catch (err) {
      console.error("[blog] analyze error:", err);
      setStatusMsg("Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const [fixing, setFixing] = useState(false);

  const handleFixFromAnalysis = async () => {
    if (!editingPost || !analysis) return;
    setFixing(true);
    try {
      const res = await fetch("/api/admin/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "fix-from-analysis",
          title: editTitle,
          excerpt: editExcerpt,
          body: editBody,
          issues: analysis.issues,
          suggestions: analysis.suggestions,
        }),
      });
      const data = await res.json();
      if (data.ok && data.fixed) {
        setEditBody(data.fixed.body);
        setEditTitle(data.fixed.title);
        setEditExcerpt(data.fixed.excerpt);
        setAnalysis(null);
        setEditorTab("edit");
      } else {
        setStatusMsg("Fix failed");
      }
    } catch (err) {
      console.error("[blog] fix error:", err);
      setStatusMsg("Fix failed");
    } finally {
      setFixing(false);
    }
  };

  const openEdit = (post: BlogPostRecord) => {
    setEditingPost(post);
    setEditTitle(post.title);
    setEditExcerpt(post.excerpt);
    setEditBody(post.body);
    setEditCategory(post.category);
    setEditTags(post.tags || "[]");
    setEditorTab("edit");
    setAnalysis(null);
    setEditNotes("");
  };

  const filteredPosts = posts.filter((p) => {
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const statusDot = (status: string) => {
    const c = status === "published" ? "bg-accent-emerald" : status === "draft" ? "bg-accent-amber" : "bg-navy-600";
    return <span className={`w-1.5 h-1.5 rounded-full ${c} flex-shrink-0`} />;
  };

  const counts = {
    all: posts.length,
    draft: posts.filter((p) => p.status === "draft").length,
    published: posts.filter((p) => p.status === "published").length,
    archived: posts.filter((p) => p.status === "archived").length,
  };

  return (
    <div className="-mx-6 -mt-2 -mb-6" style={{ height: "calc(100vh - 140px)" }}>
      <div className="flex h-full">
        {/* Sidebar: article list */}
        <div className="w-72 flex-shrink-0 border-r border-navy-700/30 flex flex-col bg-navy-950/50">
          {/* Toolbar */}
          <div className="p-3 border-b border-navy-700/20 space-y-2">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={generating}
                className="flex-1"
              >
                {generating ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <Sparkles className="w-3 h-3 mr-1.5" />}
                {generating ? "Writing..." : "New Article"}
              </Button>
              <label className="flex items-center gap-1.5 text-[9px] font-mono text-navy-500 cursor-pointer" title="Auto-publish on generate">
                <input
                  type="checkbox"
                  checked={autoPublish}
                  onChange={(e) => setAutoPublish(e.target.checked)}
                  className="rounded border-navy-600 w-3 h-3"
                />
                Pub
              </label>
            </div>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles..."
              className="text-[11px] h-7"
            />
            {statusMsg && (
              <div className={`text-[9px] font-mono truncate ${statusMsg.startsWith("Error") || statusMsg.startsWith("Failed") ? "text-accent-rose" : "text-accent-emerald"}`}>
                {statusMsg}
              </div>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex border-b border-navy-700/20">
            {(["all", "draft", "published", "archived"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                className={`flex-1 py-1.5 text-[9px] font-mono uppercase tracking-wider transition-colors ${filterStatus === f ? "text-navy-200 border-b border-navy-200" : "text-navy-600 hover:text-navy-400"}`}
              >
                {f} {counts[f] > 0 && <span className="text-navy-600 ml-0.5">{counts[f]}</span>}
              </button>
            ))}
          </div>

          {/* Article list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-3 space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-14 bg-navy-900/30 rounded animate-pulse" />
                ))}
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-[10px] font-mono text-navy-600">No articles found</p>
              </div>
            ) : (
              <div className="py-1">
                {filteredPosts.map((post) => (
                  <button
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    className={`w-full text-left px-3 py-2.5 border-l-2 transition-colors ${
                      selectedPost?.id === post.id
                        ? "border-navy-200 bg-navy-900/40"
                        : "border-transparent hover:bg-navy-900/20"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {statusDot(post.status)}
                      <span className="text-[9px] font-mono text-navy-600 uppercase">{post.category}</span>
                      <span className="text-[9px] font-mono text-navy-700 ml-auto">
                        {post.publishedAt
                          ? new Date(post.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                          : new Date(post.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                        }
                      </span>
                    </div>
                    <div className="text-[11px] text-navy-300 leading-snug line-clamp-2">{post.title}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedPost ? (
            <>
              {/* Article header bar */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-navy-700/20 flex-shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {statusDot(selectedPost.status)}
                  <span className="text-xs text-navy-200 font-medium truncate">{selectedPost.title}</span>
                  <span className="text-[9px] font-mono text-navy-600">#{selectedPost.id}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => openEdit(selectedPost)}
                    className="px-2.5 py-1 rounded text-[10px] font-mono text-navy-300 hover:text-navy-100 hover:bg-navy-800/50 transition-colors"
                  >
                    Edit
                  </button>
                  {selectedPost.status === "draft" && (
                    <button
                      onClick={() => { handleAction("publish", selectedPost.id); setSelectedPost({ ...selectedPost, status: "published" }); }}
                      className="px-2.5 py-1 rounded text-[10px] font-mono text-accent-emerald hover:bg-accent-emerald/10 transition-colors"
                    >
                      Publish
                    </button>
                  )}
                  {selectedPost.status === "published" && (
                    <button
                      onClick={() => { handleAction("unpublish", selectedPost.id); setSelectedPost({ ...selectedPost, status: "draft" }); }}
                      className="px-2.5 py-1 rounded text-[10px] font-mono text-accent-amber hover:bg-accent-amber/10 transition-colors"
                    >
                      Unpublish
                    </button>
                  )}
                  <Link
                    href={`/blog/${selectedPost.slug}`}
                    target="_blank"
                    className="px-2.5 py-1 rounded text-[10px] font-mono text-navy-400 hover:text-navy-200 hover:bg-navy-800/50 transition-colors"
                  >
                    Open
                  </Link>
                  <button
                    onClick={() => { handleAction("delete", selectedPost.id); }}
                    className="px-2.5 py-1 rounded text-[10px] font-mono text-accent-rose/60 hover:text-accent-rose hover:bg-accent-rose/10 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Article preview */}
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-8 py-8">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[10px] font-mono uppercase tracking-wider bg-navy-100 text-navy-900 px-2 py-0.5 rounded-sm">
                      {selectedPost.category}
                    </span>
                    {selectedPost.readingTime && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-navy-500">
                        <Clock className="w-2.5 h-2.5" />
                        {selectedPost.readingTime} min read
                      </span>
                    )}
                    {selectedPost.publishedAt && (
                      <span className="text-[10px] font-mono text-navy-600">
                        {new Date(selectedPost.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl font-mono font-bold text-navy-50 tracking-tight mb-3 leading-tight">
                    {selectedPost.title}
                  </h1>
                  <p className="text-sm text-navy-400 leading-relaxed mb-6">
                    {selectedPost.excerpt}
                  </p>
                  <div className="border-t border-navy-700/30 pt-6">
                    <BlogBody body={selectedPost.body} />
                  </div>
                  {(() => {
                    try {
                      const tags = JSON.parse(selectedPost.tags || "[]");
                      if (Array.isArray(tags) && tags.length > 0) {
                        return (
                          <div className="flex items-center gap-2 mt-10 pt-6 border-t border-navy-700/30">
                            {tags.map((tag: string) => (
                              <span key={tag} className="px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider text-navy-500">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        );
                      }
                    } catch {}
                    return null;
                  })()}
                </div>
              </div>
            </>
          ) : generating || genComplete || genError ? (
            /* ── Live generation view ── */
            <div className="flex-1 flex overflow-hidden">
              {/* Left: pipeline progress */}
              <div className="w-80 flex-shrink-0 border-r border-navy-700/30 overflow-y-auto bg-navy-950/50">
                <div className="p-5 space-y-4">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-navy-500 mb-2">Synthesis Pipeline</div>

                  {/* Premise step */}
                  <div className={`flex gap-3 ${genStage === "premise" && !genPremise ? "animate-pulse" : ""}`}>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      genPremise ? "border-accent-emerald bg-accent-emerald/10" : genStage === "premise" ? "border-accent-cyan" : "border-navy-700"
                    }`}>
                      {genPremise ? <CheckCircle2 className="w-3 h-3 text-accent-emerald" /> : genStage === "premise" && !genPremise ? <Loader2 className="w-3 h-3 text-accent-cyan animate-spin" /> : <span className="w-1.5 h-1.5 rounded-full bg-navy-700" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-mono text-navy-300 mb-1">Establishing Premise</div>
                      {genPremise && (
                        <div className="text-[10px] text-navy-500 leading-relaxed">
                          <span className="text-navy-300 font-medium">{genPremise.suggestedTitle}</span>
                          <p className="mt-1 line-clamp-3">{genPremise.angle}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Draft step */}
                  {(genArticle || genStage === "draft" || genPremise) && (
                    <div className={`flex gap-3 ${genStage === "draft" && !genArticle ? "animate-pulse" : ""}`}>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        genArticle ? "border-accent-emerald bg-accent-emerald/10" : genStage === "draft" ? "border-accent-cyan" : "border-navy-700"
                      }`}>
                        {genArticle ? <CheckCircle2 className="w-3 h-3 text-accent-emerald" /> : genStage === "draft" ? <Loader2 className="w-3 h-3 text-accent-cyan animate-spin" /> : <span className="w-1.5 h-1.5 rounded-full bg-navy-700" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-mono text-navy-300">Generating Draft</div>
                        {genArticle && <div className="text-[10px] text-navy-500 mt-0.5 truncate">{genArticle.title}</div>}
                      </div>
                    </div>
                  )}

                  {/* Validation iterations */}
                  {genIterations.map((iter, idx) => (
                    <div key={idx}>
                      <div className="flex gap-3">
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          iter.score >= 9 ? "border-accent-emerald bg-accent-emerald/10" : "border-accent-amber bg-accent-amber/10"
                        }`}>
                          <span className="text-[8px] font-mono font-bold" style={{ color: iter.score >= 9 ? "#10b981" : iter.score >= 7 ? "#f59e0b" : "#f43f5e" }}>{iter.score}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-mono text-navy-300">Validation #{iter.iteration}</div>
                          <div className="text-[10px] mt-0.5">
                            <span className={`font-mono uppercase tracking-wider ${iter.verdict === "publish" ? "text-accent-emerald" : iter.verdict === "needs-work" ? "text-accent-amber" : "text-accent-rose"}`}>
                              {iter.verdict}
                            </span>
                            <span className="text-navy-600 ml-2">{iter.score}/10</span>
                          </div>
                        </div>
                      </div>

                      {/* Show issues/fix for non-final iterations */}
                      {idx < genIterations.length - 1 && (
                        <div className="flex gap-3 mt-3">
                          <div className="w-5 h-5 rounded-full border border-accent-cyan/40 bg-accent-cyan/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <RotateCcw className="w-2.5 h-2.5 text-accent-cyan" />
                          </div>
                          <div className="text-[11px] font-mono text-navy-400">Fixed & rewritten</div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Currently validating */}
                  {genStage === "validating" && (
                    <div className="flex gap-3 animate-pulse">
                      <div className="w-5 h-5 rounded-full border border-accent-cyan flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Loader2 className="w-3 h-3 text-accent-cyan animate-spin" />
                      </div>
                      <div className="text-[11px] font-mono text-navy-400">Validating with academic rigour...</div>
                    </div>
                  )}

                  {/* Currently fixing */}
                  {genStage === "fixing" && (
                    <div className="flex gap-3 animate-pulse">
                      <div className="w-5 h-5 rounded-full border border-accent-cyan flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Loader2 className="w-3 h-3 text-accent-cyan animate-spin" />
                      </div>
                      <div className="text-[11px] font-mono text-navy-400">Rewriting to fix issues...</div>
                    </div>
                  )}

                  {/* Complete */}
                  {genComplete && (
                    <div className="flex gap-3 mt-2">
                      <div className="w-5 h-5 rounded-full border border-accent-emerald bg-accent-emerald/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle2 className="w-3 h-3 text-accent-emerald" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-mono text-accent-emerald">Complete</div>
                        <div className="text-[10px] text-navy-500 mt-0.5">Score: {genComplete.score}/10</div>
                        <button
                          onClick={() => {
                            const post = posts.find((p) => p.id === genComplete.id);
                            if (post) {
                              setSelectedPost(post);
                              setGenStage(null);
                              setGenComplete(null);
                            }
                          }}
                          className="mt-2 px-3 py-1 rounded text-[10px] font-mono text-navy-200 bg-navy-800/50 border border-navy-700/40 hover:bg-navy-700/50 transition-colors"
                        >
                          View Article
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Cost breakdown */}
                  {genComplete?.cost && (
                    <div className="mt-4 pt-4 border-t border-navy-700/20 space-y-3">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-navy-600">Generation Cost</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-mono font-bold text-navy-200">${genComplete.cost.totalCostUsd.toFixed(4)}</span>
                        <span className="text-[9px] font-mono text-navy-600">USD</span>
                      </div>
                      <div className="flex gap-4 text-[9px] font-mono text-navy-500">
                        <span>{genComplete.cost.totalInputTokens.toLocaleString()} in</span>
                        <span>{genComplete.cost.totalOutputTokens.toLocaleString()} out</span>
                        <span>{(genComplete.cost.totalInputTokens + genComplete.cost.totalOutputTokens).toLocaleString()} total</span>
                      </div>
                      <div className="text-[9px] font-mono text-navy-600 mb-1">{genComplete.cost.model} x {genComplete.cost.calls.length} calls</div>
                      <div className="space-y-1">
                        {genComplete.cost.calls.map((call, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[9px] font-mono">
                            <span className="text-navy-500">{call.step}</span>
                            <div className="flex gap-3 text-navy-600">
                              <span>{call.inputTokens.toLocaleString()}+{call.outputTokens.toLocaleString()}</span>
                              <span className="text-navy-400 w-14 text-right">${call.costUsd.toFixed(4)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {genError && (
                    <div className="flex gap-3">
                      <div className="w-5 h-5 rounded-full border border-accent-rose bg-accent-rose/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <XCircle className="w-3 h-3 text-accent-rose" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-mono text-accent-rose">Error</div>
                        <div className="text-[10px] text-navy-500 mt-0.5 break-words">{genError}</div>
                      </div>
                    </div>
                  )}

                  {/* Last validation detail */}
                  {genValidation && (
                    <div className="mt-4 pt-4 border-t border-navy-700/20 space-y-3">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-navy-600">Latest Assessment</div>
                      <div className="space-y-1.5">
                        {Object.entries(genValidation.scores).map(([key, val]) => (
                          <div key={key} className="flex items-center gap-2">
                            <span className="text-[9px] font-mono text-navy-500 w-20 capitalize">{key}</span>
                            <div className="flex-1 h-1 bg-navy-800 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${(val as number) * 10}%`, backgroundColor: (val as number) >= 8 ? "#10b981" : (val as number) >= 6 ? "#f59e0b" : "#f43f5e" }} />
                            </div>
                            <span className="text-[9px] font-mono text-navy-400 w-4 text-right">{val as number}</span>
                          </div>
                        ))}
                      </div>
                      {genValidation.issues.length > 0 && (
                        <div>
                          <div className="text-[9px] font-mono text-accent-rose/70 uppercase tracking-wider mb-1">Issues ({genValidation.issues.length})</div>
                          {genValidation.issues.map((issue, idx) => (
                            <div key={idx} className="text-[9px] text-navy-500 leading-relaxed py-0.5">* {issue}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: live article preview */}
              <div className="flex-1 overflow-y-auto bg-navy-950">
                {genArticle ? (
                  <div className="max-w-3xl mx-auto px-8 py-8">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-[10px] font-mono uppercase tracking-wider bg-navy-100 text-navy-900 px-2 py-0.5 rounded-sm">
                        {genArticle.category}
                      </span>
                      {genStage && genStage !== "complete" && (
                        <span className="flex items-center gap-1.5 text-[10px] font-mono text-accent-cyan">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          {genStage === "validating" ? "Validating..." : genStage === "fixing" ? "Rewriting..." : "Processing..."}
                        </span>
                      )}
                    </div>
                    <h1 className="text-2xl font-mono font-bold text-navy-50 tracking-tight mb-3 leading-tight">
                      {genArticle.title}
                    </h1>
                    <p className="text-sm text-navy-400 leading-relaxed mb-6">{genArticle.excerpt}</p>
                    <div className="border-t border-navy-700/30 pt-6">
                      <BlogBody body={genArticle.body} />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      {generating ? (
                        <>
                          <Loader2 className="w-6 h-6 text-navy-600 animate-spin mx-auto mb-3" />
                          <p className="text-[11px] font-mono text-navy-500">Analyzing signals and establishing premise...</p>
                        </>
                      ) : (
                        <>
                          <FileText className="w-8 h-8 text-navy-800 mx-auto mb-3" />
                          <p className="text-[11px] font-mono text-navy-600">Article preview will appear here</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-8 h-8 text-navy-800 mx-auto mb-3" />
                <p className="text-[11px] font-mono text-navy-600">Select an article to preview</p>
                <p className="text-[10px] text-navy-700 mt-1">or generate a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Editor */}
      {editingPost && (
        <Dialog.Root open onOpenChange={(open) => !open && setEditingPost(null)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black z-[60]" />
            <Dialog.Content className="fixed inset-0 z-[60] bg-navy-950 flex flex-col">
              {/* Top bar */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-navy-700/30 bg-navy-900/80 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <Dialog.Title className="text-xs font-mono font-semibold text-navy-100 uppercase tracking-wider">
                    Edit Article
                  </Dialog.Title>
                  <span className="text-[9px] font-mono text-navy-600">#{editingPost.id}</span>
                  {statusDot(editingPost.status)}
                  <span className="text-[9px] font-mono text-navy-500">{editingPost.status}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex border border-navy-700/40 rounded overflow-hidden">
                    <button
                      onClick={() => setEditorTab("edit")}
                      className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${editorTab === "edit" ? "bg-navy-700/40 text-navy-200" : "text-navy-500 hover:text-navy-300"}`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setEditorTab("preview")}
                      className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${editorTab === "preview" ? "bg-navy-700/40 text-navy-200" : "text-navy-500 hover:text-navy-300"}`}
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => { setEditorTab("analysis"); if (!analysis && !analyzing) handleAnalyze(); }}
                      className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${editorTab === "analysis" ? "bg-navy-700/40 text-navy-200" : "text-navy-500 hover:text-navy-300"}`}
                    >
                      Analysis
                    </button>
                  </div>
                  <button
                    onClick={handleRefine}
                    disabled={refining}
                    className="px-3 py-1.5 rounded-md text-[10px] font-mono uppercase tracking-wider text-accent-cyan hover:bg-accent-cyan/10 border border-accent-cyan/20 transition-colors disabled:opacity-50"
                  >
                    {refining ? <><Loader2 className="w-3 h-3 animate-spin inline mr-1" />Refining...</> : "Refine"}
                  </button>
                  <button
                    onClick={() => setEditingPost(null)}
                    className="px-3 py-1.5 rounded-md text-[10px] font-mono uppercase tracking-wider text-navy-400 hover:text-navy-200 border border-navy-700/30 transition-colors"
                  >
                    Cancel
                  </button>
                  <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                    {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <Save className="w-3 h-3 mr-1.5" />}
                    Save
                  </Button>
                </div>
              </div>

              {editorTab === "edit" && (
                <div className="flex-1 flex overflow-hidden">
                  <div className="flex-1 flex flex-col overflow-hidden border-r border-navy-700/30">
                    <div className="px-4 py-3 space-y-3 border-b border-navy-700/20 flex-shrink-0">
                      <div>
                        <label className="text-[10px] font-mono text-navy-500 mb-1 block">Title</label>
                        <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-navy-500 mb-1 block">Excerpt</label>
                        <textarea
                          value={editExcerpt}
                          onChange={(e) => setEditExcerpt(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 rounded-md border border-navy-700/40 bg-navy-900/50 text-sm text-navy-200 resize-none focus:outline-none focus:border-navy-500"
                        />
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-[10px] font-mono text-navy-500 mb-1 block">Category</label>
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-md border border-navy-700/40 bg-navy-900/50 text-xs text-navy-200 focus:outline-none focus:border-navy-500"
                          >
                            <option value="market">Market</option>
                            <option value="geopolitical">Geopolitical</option>
                            <option value="macro">Macro</option>
                            <option value="energy">Energy</option>
                            <option value="commodities">Commodities</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] font-mono text-navy-500 mb-1 block">Tags (JSON array)</label>
                          <Input value={editTags} onChange={(e) => setEditTags(e.target.value)} className="text-xs font-mono" />
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 overflow-hidden flex flex-col px-4 py-3">
                      <label className="text-[10px] font-mono text-navy-500 mb-1 block flex-shrink-0">Body (Markdown + widget directives)</label>
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        className="flex-1 w-full px-4 py-3 rounded-md border border-navy-700/40 bg-navy-950 text-[12px] text-navy-200 font-mono leading-relaxed resize-none focus:outline-none focus:border-navy-600"
                        spellCheck={false}
                      />
                    </div>
                  </div>
                  <div className="w-[45%] flex-shrink-0 overflow-y-auto bg-navy-950">
                    <div className="max-w-2xl mx-auto px-8 py-6">
                      <div className="text-[9px] font-mono uppercase tracking-widest text-navy-600 mb-4">Live Preview</div>
                      <h1 className="text-2xl font-mono font-bold text-navy-50 tracking-tight mb-3 leading-tight">
                        {editTitle || "Untitled"}
                      </h1>
                      <p className="text-sm text-navy-400 leading-relaxed mb-6">{editExcerpt}</p>
                      <div className="border-t border-navy-700/30 pt-6">
                        <BlogBody body={editBody} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {editorTab === "preview" && (
                <div className="flex-1 overflow-y-auto bg-navy-950">
                  <div className="max-w-3xl mx-auto px-8 py-10">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-[10px] font-mono uppercase tracking-wider bg-navy-100 text-navy-900 px-2 py-0.5 rounded-sm">
                        {editCategory}
                      </span>
                      {editingPost.readingTime && (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-navy-500">
                          <Clock className="w-2.5 h-2.5" />
                          {editingPost.readingTime} min read
                        </span>
                      )}
                    </div>
                    <h1 className="text-2xl md:text-3xl font-mono font-bold text-navy-50 tracking-tight mb-4 leading-tight">
                      {editTitle || "Untitled"}
                    </h1>
                    <p className="text-sm text-navy-400 leading-relaxed mb-6">{editExcerpt}</p>
                    <div className="flex items-center gap-3 py-4 border-y border-navy-700/30 mb-8">
                      <div className="w-8 h-8 rounded-full bg-navy-800 border border-navy-700/40 flex items-center justify-center">
                        <span className="text-[10px] font-mono font-semibold text-navy-300">NR</span>
                      </div>
                      <div>
                        <div className="text-xs font-mono text-navy-200">{editingPost.author}</div>
                        <div className="text-[10px] text-navy-500">NEXUS Intelligence Platform</div>
                      </div>
                    </div>
                    <div className="blog-article">
                      <BlogBody body={editBody} />
                    </div>
                    {(() => {
                      try {
                        const tags = JSON.parse(editTags);
                        if (Array.isArray(tags) && tags.length > 0) {
                          return (
                            <div className="flex items-center gap-2 mt-10 pt-6 border-t border-navy-700/30">
                              {tags.map((tag: string) => (
                                <span key={tag} className="px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider text-navy-500">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          );
                        }
                      } catch {}
                      return null;
                    })()}
                  </div>
                </div>
              )}

              {editorTab === "analysis" && (
                <div className="flex-1 overflow-y-auto bg-navy-950">
                  <div className="max-w-3xl mx-auto px-8 py-8">
                    {analyzing ? (
                      <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                          <Loader2 className="w-5 h-5 animate-spin text-navy-500 mx-auto mb-3" />
                          <p className="text-[11px] font-mono text-navy-500">Analyzing article quality and accuracy...</p>
                        </div>
                      </div>
                    ) : analysis ? (
                      <div className="space-y-8">
                        {/* Overall score */}
                        <div className="flex items-center gap-6">
                          <div className="w-20 h-20 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                            style={{
                              borderColor: analysis.overallScore >= 8 ? "#10b981" : analysis.overallScore >= 6 ? "#f59e0b" : "#f43f5e",
                            }}
                          >
                            <span className="text-2xl font-mono font-bold text-navy-100">{analysis.overallScore}</span>
                          </div>
                          <div>
                            <div className="text-sm font-mono text-navy-200 mb-1">
                              {analysis.verdict === "publish" ? "Ready to publish" : analysis.verdict === "needs-work" ? "Needs refinement" : "Major issues"}
                            </div>
                            <div className={`text-[10px] font-mono uppercase tracking-wider ${
                              analysis.verdict === "publish" ? "text-accent-emerald" : analysis.verdict === "needs-work" ? "text-accent-amber" : "text-accent-rose"
                            }`}>
                              {analysis.verdict}
                            </div>
                          </div>
                          <div className="ml-auto flex items-center gap-2">
                            {analysis.verdict !== "publish" && (analysis.issues.length > 0 || analysis.suggestions.length > 0) && (
                              <button
                                onClick={handleFixFromAnalysis}
                                disabled={fixing}
                                className="px-3 py-1.5 rounded text-[10px] font-mono text-navy-100 bg-accent-cyan/20 border border-accent-cyan/30 hover:bg-accent-cyan/30 transition-colors disabled:opacity-50"
                              >
                                {fixing ? "Fixing..." : "Fix Issues"}
                              </button>
                            )}
                            <button
                              onClick={handleAnalyze}
                              className="px-3 py-1.5 rounded text-[10px] font-mono text-navy-400 hover:text-navy-200 border border-navy-700/30 transition-colors"
                            >
                              Re-analyze
                            </button>
                          </div>
                        </div>

                        {/* Score breakdown */}
                        <div>
                          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">Score Breakdown</div>
                          <div className="space-y-2.5">
                            {(Object.entries(analysis.scores) as [string, number][]).map(([key, val]) => (
                              <div key={key} className="flex items-center gap-3">
                                <span className="text-[10px] font-mono text-navy-400 w-24 capitalize">{key}</span>
                                <div className="flex-1 h-1.5 bg-navy-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                      width: `${val * 10}%`,
                                      backgroundColor: val >= 8 ? "#10b981" : val >= 6 ? "#f59e0b" : "#f43f5e",
                                    }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono text-navy-300 w-6 text-right">{val}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Issues */}
                        {analysis.issues.length > 0 && (
                          <div>
                            <div className="text-[10px] font-mono uppercase tracking-wider text-accent-rose mb-3">Issues</div>
                            <div className="space-y-2">
                              {analysis.issues.map((issue, i) => (
                                <div key={i} className="flex gap-2 text-[11px] text-navy-300">
                                  <span className="text-accent-rose flex-shrink-0 mt-0.5">*</span>
                                  <span>{issue}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Strengths */}
                        {analysis.strengths.length > 0 && (
                          <div>
                            <div className="text-[10px] font-mono uppercase tracking-wider text-accent-emerald mb-3">Strengths</div>
                            <div className="space-y-2">
                              {analysis.strengths.map((s, i) => (
                                <div key={i} className="flex gap-2 text-[11px] text-navy-300">
                                  <span className="text-accent-emerald flex-shrink-0 mt-0.5">*</span>
                                  <span>{s}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Suggestions */}
                        {analysis.suggestions.length > 0 && (
                          <div>
                            <div className="text-[10px] font-mono uppercase tracking-wider text-accent-cyan mb-3">Suggestions</div>
                            <div className="space-y-2">
                              {analysis.suggestions.map((s, i) => (
                                <div key={i} className="flex gap-2 text-[11px] text-navy-300">
                                  <span className="text-accent-cyan flex-shrink-0 mt-0.5">*</span>
                                  <span>{s}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Editorial Notes */}
                        <div>
                          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-2">Editorial Notes</div>
                          <textarea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            rows={5}
                            placeholder="Add your notes, feedback, or reminders for this article..."
                            className="w-full px-4 py-3 rounded-md border border-navy-700/40 bg-navy-900/30 text-[12px] text-navy-200 font-mono leading-relaxed resize-y focus:outline-none focus:border-navy-600 placeholder:text-navy-700"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                          <p className="text-[11px] font-mono text-navy-600 mb-3">No analysis run yet</p>
                          <button
                            onClick={handleAnalyze}
                            className="px-4 py-2 rounded text-[10px] font-mono uppercase tracking-wider text-navy-300 hover:text-navy-100 border border-navy-700/30 hover:bg-navy-800/30 transition-colors"
                          >
                            Run Analysis
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </div>
  );
}

