"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import {
  Plus,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  ChevronRight,
  X,
} from "lucide-react";

interface Ticket {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  open: { label: "Open", color: "text-accent-amber", icon: AlertCircle },
  in_progress: { label: "In Progress", color: "text-accent-cyan", icon: Clock },
  resolved: { label: "Resolved", color: "text-accent-emerald", icon: CheckCircle2 },
  closed: { label: "Closed", color: "text-navy-500", icon: CheckCircle2 },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "text-navy-500" },
  normal: { label: "Normal", color: "text-navy-300" },
  high: { label: "High", color: "text-accent-amber" },
  urgent: { label: "Urgent", color: "text-accent-rose" },
};

const CATEGORIES = ["general", "billing", "technical", "feature", "account"];

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  // New ticket form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("normal");

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch("/api/support/tickets");
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch {
      // silent
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const createTicket = async () => {
    if (!title.trim() || !description.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category, priority }),
      });
      if (res.ok) {
        setTitle("");
        setDescription("");
        setCategory("general");
        setPriority("normal");
        setShowCreate(false);
        fetchTickets();
      }
    } catch {
      // silent
    }
    setCreating(false);
  };

  const filtered = tickets.filter((t) => {
    if (filter !== "all" && t.status !== filter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <PageContainer
      title="Support"
      subtitle="Submit and track support requests"
      actions={
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-navy-100 text-navy-950 text-xs font-medium hover:bg-white transition-colors"
        >
          <Plus className="h-3 w-3" />
          New Ticket
        </button>
      }
    >
      {/* Create Ticket Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-navy-950 border border-navy-700/50 rounded-lg p-6 space-y-4 relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-cyan/30 to-transparent" />
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-navy-100">New Support Ticket</h2>
              <button onClick={() => setShowCreate(false)} className="text-navy-500 hover:text-navy-300">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">Subject</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief description of your issue..."
                className="w-full h-9 px-3 rounded bg-navy-900/60 border border-navy-700/50 text-sm text-navy-200 placeholder:text-navy-600 focus:outline-none focus:border-accent-cyan/40 transition-colors"
              />
            </div>

            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue in detail..."
                rows={5}
                className="w-full px-3 py-2 rounded bg-navy-900/60 border border-navy-700/50 text-sm text-navy-200 placeholder:text-navy-600 focus:outline-none focus:border-accent-cyan/40 transition-colors resize-y"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-9 px-3 rounded bg-navy-900/60 border border-navy-700/50 text-sm text-navy-200 focus:outline-none focus:border-accent-cyan/40 transition-colors"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full h-9 px-3 rounded bg-navy-900/60 border border-navy-700/50 text-sm text-navy-200 focus:outline-none focus:border-accent-cyan/40 transition-colors"
                >
                  {["low", "normal", "high", "urgent"].map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded text-xs text-navy-400 hover:text-navy-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createTicket}
                disabled={creating || !title.trim() || !description.trim()}
                className="px-4 py-2 rounded bg-navy-100 text-navy-950 text-xs font-medium hover:bg-white transition-colors disabled:opacity-50"
              >
                {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Submit Ticket"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-navy-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets..."
            className="w-full h-8 pl-8 pr-3 rounded bg-navy-900/40 border border-navy-700/40 text-[11px] font-mono text-navy-300 placeholder:text-navy-600 focus:outline-none focus:border-navy-600 transition-colors"
          />
        </div>
        <div className="flex items-center rounded border border-navy-700/40 overflow-hidden">
          {(["all", "open", "in_progress", "resolved"] as const).map((s, i) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                i > 0 ? "border-l border-navy-700/40" : ""
              } ${filter === s ? "bg-navy-800/60 text-navy-100" : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/30"}`}
            >
              {s === "all" ? "All" : s === "in_progress" ? "Active" : s.charAt(0).toUpperCase() + s.slice(1)}
              <span className="ml-1 text-navy-600">{counts[s] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Ticket List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-navy-700/30 border-dashed rounded-lg p-12 text-center">
          <MessageSquare className="h-6 w-6 text-navy-600 mx-auto mb-3" />
          <p className="text-sm text-navy-400 mb-1">
            {tickets.length === 0 ? "No support tickets yet" : "No tickets match your filters"}
          </p>
          <p className="text-[10px] text-navy-500">
            {tickets.length === 0 ? "Click \"New Ticket\" to submit a request." : "Try adjusting your search or filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((ticket) => {
            const statusCfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
            const priorityCfg = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.normal;
            const StatusIcon = statusCfg.icon;

            return (
              <Link
                key={ticket.id}
                href={`/support/${ticket.id}`}
                className="flex items-center gap-4 px-4 py-3 rounded-lg border border-navy-700/30 bg-navy-900/20 hover:bg-navy-800/30 hover:border-navy-700/50 transition-colors group"
              >
                <StatusIcon className={`h-4 w-4 shrink-0 ${statusCfg.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono text-navy-600">#{ticket.id}</span>
                    <span className="text-sm text-navy-200 font-medium truncate">{ticket.title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[9px] font-mono uppercase tracking-wider ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                    <span className={`text-[9px] font-mono uppercase tracking-wider ${priorityCfg.color}`}>
                      {priorityCfg.label}
                    </span>
                    <span className="text-[9px] font-mono text-navy-600 capitalize">{ticket.category}</span>
                    <span className="text-[9px] font-mono text-navy-600">{timeAgo(ticket.updatedAt)}</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-navy-700 group-hover:text-navy-500 transition-colors" />
              </Link>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
