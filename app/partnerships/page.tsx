"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer } from "@/components/layout/page-container";
import {
  Search, Plus, Send, FileText, Trash2, ExternalLink, Mail,
  Users, Video, Loader2, ChevronDown, ChevronUp, Sparkles,
  Check, X, Edit3, Eye,
} from "lucide-react";

interface YouTubeChannel {
  channelId: string;
  channelName: string;
  channelUrl: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  description: string;
  thumbnailUrl: string;
  contactEmail: string | null;
  topics: string[];
}

interface Prospect {
  id: number;
  channelId: string | null;
  channelName: string;
  channelUrl: string | null;
  subscriberCount: number | null;
  videoCount: number | null;
  description: string | null;
  thumbnailUrl: string | null;
  contactEmail: string | null;
  status: string;
  notes: string | null;
  commissionRate: number | null;
  createdAt: string;
  updatedAt: string;
}

interface OutreachRecord {
  id: number;
  prospectId: number;
  subject: string;
  body: string;
  toEmail: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  prospect: "text-navy-400 bg-navy-800/50",
  contacted: "text-accent-cyan bg-accent-cyan/10",
  negotiating: "text-accent-amber bg-accent-amber/10",
  active: "text-accent-emerald bg-accent-emerald/10",
  declined: "text-accent-rose bg-accent-rose/10",
  paused: "text-navy-500 bg-navy-800/30",
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default function PartnershipsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<YouTubeChannel[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [composing, setComposing] = useState<number | null>(null);
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [draftContext, setDraftContext] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [outreach, setOutreach] = useState<Record<number, OutreachRecord[]>>({});
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [editingEmail, setEditingEmail] = useState<number | null>(null);
  const [editEmailValue, setEditEmailValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchProspects = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/partnerships");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setProspects(data.prospects || []);
    } catch {
      setError("Failed to load prospects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProspects();
  }, [fetchProspects]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError(null);
    setSearchResults([]);
    try {
      const res = await fetch(`/api/admin/partnerships?action=search&q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Search failed");
      }
      const data = await res.json();
      setSearchResults(data.channels || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function addProspect(channelId: string) {
    setError(null);
    try {
      const res = await fetch("/api/admin/partnerships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_prospect", channelId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setError("Already in your prospects");
          return;
        }
        throw new Error(data.error);
      }
      setSearchResults((prev) => prev.filter((c) => c.channelId !== channelId));
      await fetchProspects();
      setSuccess("Added to prospects");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    }
  }

  async function updateProspect(id: number, updates: Record<string, unknown>) {
    try {
      const res = await fetch("/api/admin/partnerships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_prospect", id, ...updates }),
      });
      if (!res.ok) throw new Error("Update failed");
      await fetchProspects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  }

  async function deleteProspect(id: number) {
    try {
      await fetch("/api/admin/partnerships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_prospect", id }),
      });
      await fetchProspects();
    } catch {
      setError("Failed to delete");
    }
  }

  async function fetchOutreach(prospectId: number) {
    try {
      const res = await fetch(`/api/admin/partnerships?action=outreach&prospectId=${prospectId}`);
      if (!res.ok) return;
      const data = await res.json();
      setOutreach((prev) => ({ ...prev, [prospectId]: data.outreach || [] }));
    } catch {
      // silent
    }
  }

  async function draftEmail2(prospectId: number) {
    setDrafting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/partnerships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "draft_email", prospectId, context: draftContext }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Draft failed");
      }
      const data = await res.json();
      setDraftSubject(data.subject || "");
      setDraftBody(data.body || "");
      const prospect = prospects.find((p) => p.id === prospectId);
      if (prospect?.contactEmail) setDraftEmail(prospect.contactEmail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to draft");
    } finally {
      setDrafting(false);
    }
  }

  async function sendOutreach(prospectId: number) {
    if (!draftEmail || !draftSubject || !draftBody) {
      setError("Fill in all fields before sending");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/partnerships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_email",
          prospectId,
          subject: draftSubject,
          body: draftBody,
          toEmail: draftEmail,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Send failed");
      }
      setSuccess("Email sent");
      setComposing(null);
      setDraftSubject("");
      setDraftBody("");
      setDraftEmail("");
      setDraftContext("");
      await fetchProspects();
      await fetchOutreach(prospectId);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  function toggleExpand(id: number) {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      fetchOutreach(id);
    }
  }

  function startCompose(prospect: Prospect) {
    setComposing(prospect.id);
    setDraftSubject("");
    setDraftBody("");
    setDraftEmail(prospect.contactEmail || "");
    setDraftContext("");
    setError(null);
  }

  return (
    <PageContainer title="Partnerships">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Notifications */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-accent-rose/10 border border-accent-rose/20 rounded-lg">
            <X className="w-3.5 h-3.5 text-accent-rose shrink-0" />
            <span className="font-mono text-[11px] text-accent-rose">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-accent-rose/60 hover:text-accent-rose">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-accent-emerald/10 border border-accent-emerald/20 rounded-lg">
            <Check className="w-3.5 h-3.5 text-accent-emerald shrink-0" />
            <span className="font-mono text-[11px] text-accent-emerald">{success}</span>
          </div>
        )}

        {/* Search YouTube */}
        <div>
          <h2 className="font-mono text-[10px] uppercase tracking-wider text-navy-500 mb-3">
            Find Partners on YouTube
          </h2>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-navy-600" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search channels... e.g. military analysis, geopolitics, defense"
                className="w-full pl-9 pr-4 py-2.5 bg-navy-900/50 border border-navy-800 rounded-lg font-sans text-[13px] text-navy-200 placeholder:text-navy-600 focus:outline-none focus:border-navy-600 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={searching || !searchQuery.trim()}
              className="px-5 py-2.5 bg-navy-800 hover:bg-navy-700 border border-navy-700 rounded-lg font-mono text-[11px] uppercase tracking-wider text-navy-300 transition-colors disabled:opacity-40"
            >
              {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Search"}
            </button>
          </form>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {searchResults.map((ch) => (
                <div
                  key={ch.channelId}
                  className="flex items-center gap-4 p-3 bg-navy-900/30 border border-navy-800/50 rounded-lg hover:border-navy-700 transition-colors"
                >
                  {ch.thumbnailUrl && (
                    <img src={ch.thumbnailUrl} alt="" className="w-10 h-10 rounded-full shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-sans text-[13px] text-navy-200 font-medium truncate">
                        {ch.channelName}
                      </span>
                      <a
                        href={ch.channelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-navy-600 hover:text-navy-400"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="font-mono text-[10px] text-navy-500 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {formatCount(ch.subscriberCount)}
                      </span>
                      <span className="font-mono text-[10px] text-navy-500 flex items-center gap-1">
                        <Video className="w-3 h-3" />
                        {formatCount(ch.videoCount)}
                      </span>
                      {ch.contactEmail && (
                        <span className="font-mono text-[10px] text-accent-cyan flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {ch.contactEmail}
                        </span>
                      )}
                    </div>
                    {ch.description && (
                      <p className="mt-1 font-sans text-[11px] text-navy-500 line-clamp-1">{ch.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => addProspect(ch.channelId)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-navy-800 hover:bg-navy-700 border border-navy-700 rounded font-mono text-[10px] uppercase tracking-wider text-navy-300 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prospects Pipeline */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-mono text-[10px] uppercase tracking-wider text-navy-500">
              Partner Pipeline
            </h2>
            <span className="font-mono text-[10px] text-navy-600">
              {prospects.length} prospect{prospects.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-4 h-4 text-navy-600 animate-spin" />
            </div>
          ) : prospects.length === 0 ? (
            <div className="text-center py-16 border border-navy-800/50 rounded-lg">
              <Search className="w-6 h-6 text-navy-700 mx-auto mb-3" />
              <p className="font-sans text-[13px] text-navy-500">No prospects yet. Search YouTube to find partners.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {prospects.map((p) => (
                <div key={p.id} className="border border-navy-800/50 rounded-lg overflow-hidden">
                  {/* Prospect Header */}
                  <div
                    className="flex items-center gap-4 p-3 hover:bg-navy-900/30 cursor-pointer transition-colors"
                    onClick={() => toggleExpand(p.id)}
                  >
                    {p.thumbnailUrl && (
                      <img src={p.thumbnailUrl} alt="" className="w-9 h-9 rounded-full shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-sans text-[13px] text-navy-200 font-medium truncate">
                          {p.channelName}
                        </span>
                        <span className={`font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status] || STATUS_COLORS.prospect}`}>
                          {p.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {p.subscriberCount && (
                          <span className="font-mono text-[10px] text-navy-500 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {formatCount(p.subscriberCount)}
                          </span>
                        )}
                        {p.contactEmail && (
                          <span className="font-mono text-[10px] text-navy-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {p.contactEmail}
                          </span>
                        )}
                        {p.commissionRate && (
                          <span className="font-mono text-[10px] text-navy-500">
                            {p.commissionRate}% commission
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); startCompose(p); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-cyan/10 hover:bg-accent-cyan/20 border border-accent-cyan/20 rounded font-mono text-[10px] uppercase tracking-wider text-accent-cyan transition-colors"
                      >
                        <Mail className="w-3 h-3" />
                        Email
                      </button>
                      {expandedId === p.id ? (
                        <ChevronUp className="w-4 h-4 text-navy-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-navy-600" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedId === p.id && (
                    <div className="border-t border-navy-800/50 p-4 bg-navy-950/50 space-y-4">
                      {/* Info Row */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="font-mono text-[9px] uppercase tracking-wider text-navy-600 block mb-1">Contact Email</label>
                          <div className="flex items-center gap-2">
                            {editingEmail === p.id ? (
                              <>
                                <input
                                  type="email"
                                  value={editEmailValue}
                                  onChange={(e) => setEditEmailValue(e.target.value)}
                                  className="flex-1 px-2 py-1 bg-navy-900 border border-navy-700 rounded text-[12px] text-navy-200 focus:outline-none focus:border-navy-500"
                                  autoFocus
                                />
                                <button
                                  onClick={() => {
                                    updateProspect(p.id, { contactEmail: editEmailValue });
                                    setEditingEmail(null);
                                  }}
                                  className="text-accent-emerald hover:text-accent-emerald/80"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setEditingEmail(null)} className="text-navy-500 hover:text-navy-300">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="font-sans text-[12px] text-navy-300">
                                  {p.contactEmail || "Not set"}
                                </span>
                                <button
                                  onClick={() => { setEditingEmail(p.id); setEditEmailValue(p.contactEmail || ""); }}
                                  className="text-navy-600 hover:text-navy-400"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="font-mono text-[9px] uppercase tracking-wider text-navy-600 block mb-1">Status</label>
                          <select
                            value={p.status}
                            onChange={(e) => updateProspect(p.id, { status: e.target.value })}
                            className="px-2 py-1 bg-navy-900 border border-navy-700 rounded text-[12px] text-navy-200 focus:outline-none focus:border-navy-500"
                          >
                            <option value="prospect">Prospect</option>
                            <option value="contacted">Contacted</option>
                            <option value="negotiating">Negotiating</option>
                            <option value="active">Active</option>
                            <option value="declined">Declined</option>
                            <option value="paused">Paused</option>
                          </select>
                        </div>
                      </div>

                      {/* Description */}
                      {p.description && (
                        <div>
                          <label className="font-mono text-[9px] uppercase tracking-wider text-navy-600 block mb-1">Channel Description</label>
                          <p className="font-sans text-[12px] text-navy-400 leading-relaxed">{p.description}</p>
                        </div>
                      )}

                      {/* Notes */}
                      <div>
                        <label className="font-mono text-[9px] uppercase tracking-wider text-navy-600 block mb-1">Notes</label>
                        <textarea
                          defaultValue={p.notes || ""}
                          onBlur={(e) => updateProspect(p.id, { notes: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 bg-navy-900 border border-navy-800 rounded text-[12px] text-navy-300 placeholder:text-navy-700 focus:outline-none focus:border-navy-600 resize-none"
                          placeholder="Add notes about this prospect..."
                        />
                      </div>

                      {/* Links */}
                      <div className="flex items-center gap-3">
                        {p.channelUrl && (
                          <a
                            href={p.channelUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 font-mono text-[10px] text-navy-500 hover:text-accent-cyan transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            YouTube Channel
                          </a>
                        )}
                        <button
                          onClick={() => deleteProspect(p.id)}
                          className="flex items-center gap-1.5 font-mono text-[10px] text-navy-600 hover:text-accent-rose transition-colors ml-auto"
                        >
                          <Trash2 className="w-3 h-3" />
                          Remove
                        </button>
                      </div>

                      {/* Outreach History */}
                      {outreach[p.id] && outreach[p.id].length > 0 && (
                        <div>
                          <label className="font-mono text-[9px] uppercase tracking-wider text-navy-600 block mb-2">Outreach History</label>
                          <div className="space-y-1.5">
                            {outreach[p.id].map((o) => (
                              <div
                                key={o.id}
                                className="flex items-center gap-3 px-3 py-2 bg-navy-900/50 rounded cursor-pointer hover:bg-navy-900 transition-colors"
                                onClick={() => setPreviewId(previewId === o.id ? null : o.id)}
                              >
                                {o.status === "sent" ? (
                                  <Send className="w-3 h-3 text-accent-emerald shrink-0" />
                                ) : (
                                  <FileText className="w-3 h-3 text-navy-500 shrink-0" />
                                )}
                                <span className="font-sans text-[12px] text-navy-300 truncate flex-1">{o.subject}</span>
                                <span className="font-mono text-[9px] text-navy-600 shrink-0">
                                  {o.sentAt ? new Date(o.sentAt).toLocaleDateString() : "Draft"}
                                </span>
                                <Eye className="w-3 h-3 text-navy-600 shrink-0" />
                              </div>
                            ))}
                          </div>
                          {/* Preview */}
                          {previewId && outreach[p.id].find((o) => o.id === previewId) && (
                            <div className="mt-2 p-3 bg-navy-900/80 rounded border border-navy-800/50">
                              <div className="font-mono text-[10px] text-navy-500 mb-2">
                                To: {outreach[p.id].find((o) => o.id === previewId)?.toEmail}
                              </div>
                              <div className="font-sans text-[12px] text-navy-300 whitespace-pre-wrap leading-relaxed">
                                {outreach[p.id].find((o) => o.id === previewId)?.body}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Email Composer */}
                  {composing === p.id && (
                    <div className="border-t border-accent-cyan/20 p-4 bg-navy-950/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-accent-cyan">
                          Compose Outreach
                        </span>
                        <button onClick={() => setComposing(null)} className="text-navy-500 hover:text-navy-300">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* AI Draft Context */}
                      <div>
                        <label className="font-mono text-[9px] uppercase tracking-wider text-navy-600 block mb-1">
                          Context for AI (optional)
                        </label>
                        <input
                          type="text"
                          value={draftContext}
                          onChange={(e) => setDraftContext(e.target.value)}
                          placeholder="e.g. They just covered the Hormuz incident, mention that..."
                          className="w-full px-3 py-2 bg-navy-900 border border-navy-800 rounded text-[12px] text-navy-300 placeholder:text-navy-700 focus:outline-none focus:border-navy-600"
                        />
                      </div>

                      <button
                        onClick={() => draftEmail2(p.id)}
                        disabled={drafting}
                        className="flex items-center gap-1.5 px-4 py-2 bg-navy-800 hover:bg-navy-700 border border-navy-700 rounded font-mono text-[10px] uppercase tracking-wider text-navy-300 transition-colors disabled:opacity-40"
                      >
                        {drafting ? (
                          <><Loader2 className="w-3 h-3 animate-spin" /> Drafting...</>
                        ) : (
                          <><Sparkles className="w-3 h-3" /> Draft with AI</>
                        )}
                      </button>

                      {/* Email Fields */}
                      <div className="space-y-2">
                        <div>
                          <label className="font-mono text-[9px] uppercase tracking-wider text-navy-600 block mb-1">To</label>
                          <input
                            type="email"
                            value={draftEmail}
                            onChange={(e) => setDraftEmail(e.target.value)}
                            placeholder="partner@email.com"
                            className="w-full px-3 py-2 bg-navy-900 border border-navy-800 rounded text-[12px] text-navy-300 placeholder:text-navy-700 focus:outline-none focus:border-navy-600"
                          />
                        </div>
                        <div>
                          <label className="font-mono text-[9px] uppercase tracking-wider text-navy-600 block mb-1">Subject</label>
                          <input
                            type="text"
                            value={draftSubject}
                            onChange={(e) => setDraftSubject(e.target.value)}
                            placeholder="Subject line..."
                            className="w-full px-3 py-2 bg-navy-900 border border-navy-800 rounded text-[12px] text-navy-300 placeholder:text-navy-700 focus:outline-none focus:border-navy-600"
                          />
                        </div>
                        <div>
                          <label className="font-mono text-[9px] uppercase tracking-wider text-navy-600 block mb-1">Body</label>
                          <textarea
                            value={draftBody}
                            onChange={(e) => setDraftBody(e.target.value)}
                            rows={12}
                            className="w-full px-3 py-2 bg-navy-900 border border-navy-800 rounded text-[12px] text-navy-300 placeholder:text-navy-700 focus:outline-none focus:border-navy-600 resize-y font-sans leading-relaxed"
                            placeholder="Click 'Draft with AI' or write your email manually..."
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => sendOutreach(p.id)}
                          disabled={sending || !draftEmail || !draftSubject || !draftBody}
                          className="flex items-center gap-1.5 px-5 py-2 bg-accent-cyan/20 hover:bg-accent-cyan/30 border border-accent-cyan/30 rounded font-mono text-[10px] uppercase tracking-wider text-accent-cyan transition-colors disabled:opacity-40"
                        >
                          {sending ? (
                            <><Loader2 className="w-3 h-3 animate-spin" /> Sending...</>
                          ) : (
                            <><Send className="w-3 h-3" /> Send Email</>
                          )}
                        </button>
                        <button
                          onClick={() => setComposing(null)}
                          className="px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-navy-500 hover:text-navy-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
