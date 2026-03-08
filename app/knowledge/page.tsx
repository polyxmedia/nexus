"use client";

import { useEffect, useState, useCallback } from "react";
import { PageContainer } from "@/components/layout/page-container";
import {
  BookOpen,
  Plus,
  Search,
  X,
  Archive,
  Edit3,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface KnowledgeEntry {
  id: number;
  title: string;
  content: string;
  category: string;
  tags: string | null;
  source: string | null;
  confidence: number | null;
  status: string;
  supersededBy: number | null;
  validFrom: string | null;
  validUntil: string | null;
  metadata: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface KnowledgeStats {
  total: number;
  active: number;
  archived: number;
  superseded: number;
  categories: Record<string, number>;
}

const CATEGORIES = [
  "all",
  "thesis",
  "model",
  "event",
  "actor",
  "market",
  "geopolitical",
  "technical",
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  thesis: "bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30",
  model: "bg-accent-amber/15 text-accent-amber border-accent-amber/30",
  event: "bg-accent-rose/15 text-accent-rose border-accent-rose/30",
  actor: "bg-signal-3/15 text-signal-3 border-signal-3/30",
  market: "bg-accent-emerald/15 text-accent-emerald border-accent-emerald/30",
  geopolitical: "bg-signal-1/15 text-signal-1 border-signal-1/30",
  technical: "bg-signal-4/15 text-signal-4 border-signal-4/30",
};

const STATUS_DOT: Record<string, string> = {
  active: "bg-accent-emerald",
  archived: "bg-navy-500",
  superseded: "bg-accent-amber",
};

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  try {
    return JSON.parse(tags);
  } catch {
    return [];
  }
}

export default function KnowledgePage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("thesis");
  const [formContent, setFormContent] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formSource, setFormSource] = useState("");
  const [formConfidence, setFormConfidence] = useState(80);
  const [formValidFrom, setFormValidFrom] = useState("");
  const [formValidUntil, setFormValidUntil] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeCategory !== "all") params.set("category", activeCategory);
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/knowledge?${params.toString()}`);
      const json = await res.json();
      setEntries(json.entries || []);
      setStats(json.stats || null);
    } catch {
      // fail silently
    }
    setLoading(false);
  }, [activeCategory, searchQuery]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const resetForm = () => {
    setFormTitle("");
    setFormCategory("thesis");
    setFormContent("");
    setFormTags("");
    setFormSource("");
    setFormConfidence(80);
    setFormValidFrom("");
    setFormValidUntil("");
    setEditingId(null);
  };

  const openEdit = (entry: KnowledgeEntry) => {
    setFormTitle(entry.title);
    setFormCategory(entry.category);
    setFormContent(entry.content);
    setFormTags(parseTags(entry.tags).join(", "));
    setFormSource(entry.source || "");
    setFormConfidence(Math.round((entry.confidence ?? 0.8) * 100));
    setFormValidFrom(entry.validFrom || "");
    setFormValidUntil(entry.validUntil || "");
    setEditingId(entry.id);
    setShowCreate(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formContent.trim()) return;
    setSaving(true);

    const tagsArray = formTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const body: Record<string, unknown> = {
      title: formTitle,
      category: formCategory,
      content: formContent,
      tags: JSON.stringify(tagsArray),
      source: formSource || undefined,
      confidence: formConfidence / 100,
      validFrom: formValidFrom || undefined,
      validUntil: formValidUntil || undefined,
    };

    try {
      if (editingId) {
        body.id = editingId;
        await fetch("/api/knowledge", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/knowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      setShowCreate(false);
      resetForm();
      await fetchEntries();
    } catch {
      // fail silently
    }
    setSaving(false);
  };

  const handleArchive = async (id: number) => {
    try {
      await fetch(`/api/knowledge?id=${id}`, { method: "DELETE" });
      await fetchEntries();
    } catch {
      // fail silently
    }
  };

  return (
    <PageContainer
      title="Knowledge Bank"
      subtitle="Institutional memory & world models"
      actions={
        <button
          onClick={() => {
            resetForm();
            setShowCreate(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-accent-cyan/10 border border-accent-cyan/30 text-xs text-accent-cyan hover:bg-accent-cyan/20 transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add Knowledge
        </button>
      }
    >
      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <div className="border border-navy-700 rounded bg-navy-900/60 px-3 py-2">
            <div className="text-[9px] text-navy-500 uppercase tracking-wider">
              Total
            </div>
            <div className="text-lg font-bold text-navy-100 font-mono">
              {stats.total}
            </div>
          </div>
          <div className="border border-navy-700 rounded bg-navy-900/60 px-3 py-2">
            <div className="text-[9px] text-navy-500 uppercase tracking-wider">
              Active
            </div>
            <div className="text-lg font-bold text-accent-emerald font-mono">
              {stats.active}
            </div>
          </div>
          <div className="border border-navy-700 rounded bg-navy-900/60 px-3 py-2">
            <div className="text-[9px] text-navy-500 uppercase tracking-wider">
              Archived
            </div>
            <div className="text-lg font-bold text-navy-400 font-mono">
              {stats.archived}
            </div>
          </div>
          {Object.entries(stats.categories)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([cat, count]) => (
              <div
                key={cat}
                className="border border-navy-700 rounded bg-navy-900/60 px-3 py-2"
              >
                <div className="text-[9px] text-navy-500 uppercase tracking-wider">
                  {cat}
                </div>
                <div className="text-lg font-bold text-navy-200 font-mono">
                  {count}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Category Tabs + Search */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 rounded text-[10px] font-medium uppercase tracking-wider transition-colors border ${
                activeCategory === cat
                  ? cat === "all"
                    ? "bg-navy-700 text-navy-100 border-navy-600"
                    : `${CATEGORY_COLORS[cat] || "bg-navy-700 text-navy-200"} border`
                  : "text-navy-500 hover:text-navy-300 border-transparent hover:border-navy-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-navy-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search knowledge..."
            className="w-full bg-navy-800 border border-navy-700 rounded pl-8 pr-3 py-1.5 text-xs text-navy-200 outline-none focus:border-accent-cyan/40 placeholder:text-navy-600"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-navy-500 hover:text-navy-300"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Knowledge Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-navy-500 text-xs">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading knowledge...
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="h-8 w-8 text-navy-700 mx-auto mb-3" />
          <p className="text-sm text-navy-500">No knowledge entries found</p>
          <p className="text-[10px] text-navy-600 mt-1">
            Add your first entry to build institutional memory
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {entries.map((entry) => {
            const tags = parseTags(entry.tags);
            const isExpanded = expandedId === entry.id;

            return (
              <div
                key={entry.id}
                className={`border rounded-lg px-4 py-3 transition-colors ${
                  entry.status === "active"
                    ? "border-navy-700 bg-navy-900/60"
                    : "border-navy-800 bg-navy-900/30 opacity-70"
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          STATUS_DOT[entry.status] || "bg-navy-500"
                        }`}
                      />
                      <h3 className="text-xs font-semibold text-navy-100 truncate">
                        {entry.title}
                      </h3>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono border shrink-0 ${
                          CATEGORY_COLORS[entry.category] ||
                          "bg-navy-700 text-navy-300 border-navy-600"
                        }`}
                      >
                        {entry.category}
                      </span>
                    </div>

                    {/* Confidence + source + date */}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[9px] text-navy-500 font-mono">
                        Confidence:{" "}
                        <span className="text-navy-300">
                          {Math.round((entry.confidence ?? 0.8) * 100)}%
                        </span>
                      </span>
                      {entry.source && (
                        <span className="text-[9px] text-navy-600 truncate max-w-[150px]">
                          {entry.source}
                        </span>
                      )}
                      <span className="text-[9px] text-navy-600 font-mono">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(entry)}
                      className="p-1 text-navy-600 hover:text-navy-300 transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                    {entry.status === "active" && (
                      <button
                        onClick={() => handleArchive(entry.id)}
                        className="p-1 text-navy-600 hover:text-accent-amber transition-colors"
                        title="Archive"
                      >
                        <Archive className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tags.slice(0, 8).map((tag) => (
                      <span
                        key={tag}
                        className="text-[8px] px-1.5 py-0.5 rounded bg-navy-800 text-navy-400 font-mono border border-navy-700"
                      >
                        {tag}
                      </span>
                    ))}
                    {tags.length > 8 && (
                      <span className="text-[8px] text-navy-600 font-mono self-center">
                        +{tags.length - 8}
                      </span>
                    )}
                  </div>
                )}

                {/* Content preview / expanded */}
                <div className="mt-2">
                  {isExpanded ? (
                    <div className="text-[11px] text-navy-300 leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto pr-2">
                      {entry.content}
                    </div>
                  ) : (
                    <p className="text-[11px] text-navy-400 leading-relaxed line-clamp-3">
                      {entry.content.slice(0, 200)}
                      {entry.content.length > 200 ? "..." : ""}
                    </p>
                  )}
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : entry.id)
                    }
                    className="flex items-center gap-1 mt-1.5 text-[9px] text-navy-500 hover:text-accent-cyan transition-colors"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-3 w-3" /> Collapse
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3" /> Expand
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Panel */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/50 backdrop-blur-[2px]">
          <div className="h-full w-[560px] bg-navy-950 border-l border-navy-700/60 flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-navy-800">
              <div>
                <h2 className="text-[11px] font-mono uppercase tracking-[0.12em] text-navy-100">
                  {editingId ? "Edit Entry" : "New Knowledge Entry"}
                </h2>
                <p className="text-[9px] font-mono text-navy-600 mt-0.5">
                  {editingId ? "Modify existing knowledge" : "Add to institutional memory"}
                </p>
              </div>
              <button
                onClick={() => { setShowCreate(false); resetForm(); }}
                className="p-1.5 rounded text-navy-600 hover:text-navy-300 hover:bg-navy-800 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono uppercase tracking-[0.1em] text-navy-500">Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Entry title..."
                  className="w-full bg-navy-900 border border-navy-700 rounded-md px-3 py-2.5 text-[12px] text-navy-200 outline-none focus:border-accent-cyan/40 placeholder:text-navy-700 transition-colors"
                />
              </div>

              {/* Category — button group */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono uppercase tracking-[0.1em] text-navy-500">Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.filter((c) => c !== "all").map((cat) => {
                    const active = formCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setFormCategory(cat)}
                        className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider border transition-colors ${
                          active
                            ? CATEGORY_COLORS[cat] || "bg-navy-700 text-navy-100 border-navy-600"
                            : "text-navy-600 border-navy-800 hover:text-navy-400 hover:border-navy-700"
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Content */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono uppercase tracking-[0.1em] text-navy-500">Content</label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Paste document content, analysis, or notes..."
                  rows={10}
                  className="w-full bg-navy-900 border border-navy-700 rounded-md px-3 py-2.5 text-[11px] text-navy-300 font-mono outline-none focus:border-accent-cyan/40 placeholder:text-navy-700 resize-none leading-relaxed transition-colors"
                />
                {formContent && (
                  <p className="text-[8px] font-mono text-navy-700 text-right">
                    {formContent.length} chars
                  </p>
                )}
              </div>

              {/* Tags + Source row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono uppercase tracking-[0.1em] text-navy-500">Tags</label>
                  <input
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="xrp, swift, oil..."
                    className="w-full bg-navy-900 border border-navy-700 rounded-md px-3 py-2.5 text-[11px] text-navy-200 outline-none focus:border-accent-cyan/40 placeholder:text-navy-700 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono uppercase tracking-[0.1em] text-navy-500">Source</label>
                  <input
                    type="text"
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    placeholder="URL or reference..."
                    className="w-full bg-navy-900 border border-navy-700 rounded-md px-3 py-2.5 text-[11px] text-navy-200 outline-none focus:border-accent-cyan/40 placeholder:text-navy-700 transition-colors"
                  />
                </div>
              </div>

              {/* Confidence — stepped buttons */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-mono uppercase tracking-[0.1em] text-navy-500">Confidence</label>
                  <span className="text-[10px] font-mono text-navy-300">{formConfidence}%</span>
                </div>
                <div className="flex gap-1.5">
                  {[20, 40, 60, 80, 100].map((val) => (
                    <button
                      key={val}
                      onClick={() => setFormConfidence(val)}
                      className={`flex-1 py-1.5 rounded text-[10px] font-mono border transition-colors ${
                        formConfidence === val
                          ? "bg-accent-cyan/15 border-accent-cyan/40 text-accent-cyan"
                          : "border-navy-800 text-navy-600 hover:border-navy-700 hover:text-navy-400"
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono uppercase tracking-[0.1em] text-navy-500">Valid From</label>
                  <input
                    type="date"
                    value={formValidFrom}
                    onChange={(e) => setFormValidFrom(e.target.value)}
                    className="w-full bg-navy-900 border border-navy-700 rounded-md px-3 py-2.5 text-[11px] text-navy-400 outline-none focus:border-accent-cyan/40 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono uppercase tracking-[0.1em] text-navy-500">Valid Until</label>
                  <input
                    type="date"
                    value={formValidUntil}
                    onChange={(e) => setFormValidUntil(e.target.value)}
                    className="w-full bg-navy-900 border border-navy-700 rounded-md px-3 py-2.5 text-[11px] text-navy-400 outline-none focus:border-accent-cyan/40 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-navy-800">
              <button
                onClick={() => { setShowCreate(false); resetForm(); }}
                className="px-4 py-2 rounded text-[11px] font-mono text-navy-500 hover:text-navy-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formTitle.trim() || !formContent.trim() || saving}
                className="flex items-center gap-2 px-5 py-2 rounded-md bg-accent-cyan/10 border border-accent-cyan/30 text-[11px] font-mono text-accent-cyan hover:bg-accent-cyan/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
                {editingId ? "Save Changes" : "Add Entry"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
