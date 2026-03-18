"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Send, Clock, ChevronDown, ChevronRight, MessageSquare, ArrowRight, X } from "lucide-react";

interface SupportTicket {
  id: number;
  userId: string;
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

interface SupportMsg {
  id: number;
  ticketId: number;
  userId: string;
  content: string;
  isStaff: number;
  createdAt: string;
}

const TICKET_STATUS: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "text-accent-amber" },
  in_progress: { label: "Active", color: "text-accent-cyan" },
  resolved: { label: "Resolved", color: "text-accent-emerald" },
  closed: { label: "Closed", color: "text-navy-500" },
};

const TICKET_PRIORITY: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "text-navy-500" },
  normal: { label: "Normal", color: "text-navy-300" },
  high: { label: "High", color: "text-accent-amber" },
  urgent: { label: "Urgent", color: "text-accent-rose" },
};

export function SupportPanel() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMsg[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState("all");

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/support");
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch {
      // silent
    }
    setLoading(false);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) fetchTickets();
  }, [loaded, fetchTickets]);

  const selectTicket = async (ticket: SupportTicket) => {
    setSelected(ticket);
    setReply("");
    try {
      const res = await fetch(`/api/admin/support/messages?ticketId=${ticket.id}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {
      setMessages([]);
    }
  };

  const sendReply = async () => {
    if (!selected || !reply.trim() || sending) return;
    setSending(true);
    try {
      await fetch("/api/admin/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: selected.id, content: reply }),
      });
      setReply("");
      selectTicket(selected);
      fetchTickets();
    } catch {
      // silent
    }
    setSending(false);
  };

  const updateTicket = async (ticketId: number, updates: Record<string, string>) => {
    try {
      await fetch("/api/admin/support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, ...updates }),
      });
      fetchTickets();
      if (selected?.id === ticketId) {
        setSelected((prev) => prev ? { ...prev, ...updates } : null);
      }
    } catch {
      // silent
    }
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });

  const filtered = tickets.filter((t) => filter === "all" || t.status === filter);

  const counts = {
    all: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
  };

  if (loading && !loaded) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Ticket List */}
      <div className="col-span-5 space-y-3">
        <div className="flex items-center gap-2">
          {(["all", "open", "in_progress", "resolved", "closed"] as const).map((s, i) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded transition-colors ${
                filter === s ? "bg-navy-800/60 text-navy-100" : "text-navy-500 hover:text-navy-300"
              }`}
            >
              {s === "all" ? "All" : s === "in_progress" ? "Active" : s.charAt(0).toUpperCase() + s.slice(1)}
              {s === "all" || s === "open" || s === "in_progress" ? (
                <span className="ml-1 text-navy-600">{counts[s]}</span>
              ) : null}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="border border-navy-700/30 border-dashed rounded-lg p-8 text-center">
            <MessageSquare className="h-5 w-5 text-navy-600 mx-auto mb-2" />
            <p className="text-[11px] text-navy-500">No tickets</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-[600px] overflow-y-auto">
            {filtered.map((ticket) => {
              const st = TICKET_STATUS[ticket.status] || TICKET_STATUS.open;
              const pr = TICKET_PRIORITY[ticket.priority] || TICKET_PRIORITY.normal;
              const isSelected = selected?.id === ticket.id;
              return (
                <button
                  key={ticket.id}
                  onClick={() => selectTicket(ticket)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                    isSelected
                      ? "bg-navy-800/60 border border-navy-700/50"
                      : "border border-transparent hover:bg-navy-800/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-mono text-navy-600">#{ticket.id}</span>
                      <span className="text-[11px] text-navy-200 font-medium truncate">{ticket.title}</span>
                    </div>
                    <span className="text-[9px] font-mono text-navy-600 shrink-0">{timeAgo(ticket.updatedAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-mono uppercase tracking-wider ${st.color}`}>{st.label}</span>
                    <span className={`text-[9px] font-mono uppercase tracking-wider ${pr.color}`}>{pr.label}</span>
                    <span className="text-[9px] font-mono text-navy-600">{ticket.userId.replace("user:", "")}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Ticket Detail */}
      <div className="col-span-7">
        {selected ? (
          <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-navy-700/30">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-medium text-navy-100">{selected.title}</h3>
                <button
                  onClick={() => setSelected(null)}
                  className="text-navy-500 hover:text-navy-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-3 text-[9px] font-mono text-navy-500">
                <span>#{selected.id}</span>
                <span>{selected.userId.replace("user:", "")}</span>
                <span className="capitalize">{selected.category}</span>
                <span>{formatDate(selected.createdAt)}</span>
              </div>
              {/* Actions */}
              <div className="flex items-center gap-2 mt-2">
                <select
                  value={selected.status}
                  onChange={(e) => updateTicket(selected.id, { status: e.target.value })}
                  className="h-7 px-2 rounded bg-navy-800/60 border border-navy-700/40 text-[10px] font-mono text-navy-300 focus:outline-none"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <select
                  value={selected.priority}
                  onChange={(e) => updateTicket(selected.id, { priority: e.target.value })}
                  className="h-7 px-2 rounded bg-navy-800/60 border border-navy-700/40 text-[10px] font-mono text-navy-300 focus:outline-none"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Messages */}
            <div className="max-h-[350px] overflow-y-auto">
              {messages.map((msg) => {
                const isStaff = msg.isStaff === 1;
                return (
                  <div
                    key={msg.id}
                    className={`px-4 py-3 border-b border-navy-700/20 last:border-0 ${
                      isStaff ? "bg-accent-cyan/[0.03]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {isStaff ? (
                        <Shield className="h-3 w-3 text-accent-cyan" />
                      ) : (
                        <User className="h-3 w-3 text-navy-500" />
                      )}
                      <span className={`text-[10px] font-mono font-medium ${isStaff ? "text-accent-cyan" : "text-navy-300"}`}>
                        {isStaff ? msg.userId.replace("user:", "") + " (staff)" : msg.userId.replace("user:", "")}
                      </span>
                      <span className="text-[9px] font-mono text-navy-600">{formatDate(msg.createdAt)}</span>
                    </div>
                    <div className="text-[11px] text-navy-300 leading-relaxed whitespace-pre-wrap pl-5">
                      {msg.content}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply */}
            <div className="px-4 py-3 border-t border-navy-700/30 bg-navy-900/40">
              <div className="flex gap-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendReply();
                  }}
                  placeholder="Reply as staff..."
                  rows={2}
                  className="flex-1 px-3 py-2 rounded bg-navy-800/40 border border-navy-700/40 text-sm text-navy-200 placeholder:text-navy-600 focus:outline-none focus:border-navy-600 transition-colors resize-y"
                />
                <button
                  onClick={sendReply}
                  disabled={sending || !reply.trim()}
                  className="self-end h-9 px-4 rounded bg-navy-100 text-navy-950 text-xs font-medium hover:bg-white transition-colors disabled:opacity-40 flex items-center gap-1.5"
                >
                  {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                  Reply
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-navy-700/30 border-dashed rounded-lg p-12 text-center">
            <MessageSquare className="h-6 w-6 text-navy-600 mx-auto mb-2" />
            <p className="text-[11px] text-navy-400">Select a ticket to view and respond</p>
          </div>
        )}
      </div>
    </div>
  );
}

