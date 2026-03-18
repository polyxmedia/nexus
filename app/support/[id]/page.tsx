"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  Loader2,
  Shield,
  User,
} from "lucide-react";

interface Ticket {
  id: number;
  uuid: string;
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

interface Message {
  id: number;
  ticketId: number;
  userId: string;
  content: string;
  isStaff: number;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: "Open", color: "text-accent-amber", bg: "bg-accent-amber/10 border-accent-amber/20" },
  in_progress: { label: "In Progress", color: "text-accent-cyan", bg: "bg-accent-cyan/10 border-accent-cyan/20" },
  resolved: { label: "Resolved", color: "text-accent-emerald", bg: "bg-accent-emerald/10 border-accent-emerald/20" },
  closed: { label: "Closed", color: "text-navy-500", bg: "bg-navy-800/50 border-navy-700/30" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "text-navy-500" },
  normal: { label: "Normal", color: "text-navy-300" },
  high: { label: "High", color: "text-accent-amber" },
  urgent: { label: "Urgent", color: "text-accent-rose" },
};

export default function TicketDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTicket = useCallback(async () => {
    try {
      const [ticketRes, messagesRes] = await Promise.all([
        fetch(`/api/support/tickets/${id}`),
        fetch(`/api/support/tickets/${id}/messages`),
      ]);
      const ticketData = await ticketRes.json();
      const messagesData = await messagesRes.json();
      setTicket(ticketData.ticket || null);
      setMessages(messagesData.messages || []);
    } catch {
      // silent
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendReply = async () => {
    if (!reply.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/support/tickets/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply }),
      });
      if (res.ok) {
        setReply("");
        fetchTicket();
      }
    } catch {
      // silent
    }
    setSending(false);
  };

  const closeTicket = async () => {
    setClosing(true);
    try {
      await fetch(`/api/support/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      });
      fetchTicket();
    } catch {
      // silent
    }
    setClosing(false);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <PageContainer title="Support Ticket" subtitle="Loading...">
        <div className="space-y-4 max-w-3xl">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (!ticket) {
    return (
      <PageContainer title="Support Ticket" subtitle="Not found">
        <div className="text-center py-12">
          <p className="text-sm text-navy-400 mb-3">Ticket not found or you do not have access.</p>
          <button
            onClick={() => router.push("/support")}
            className="text-xs text-navy-400 hover:text-navy-200 transition-colors"
          >
            Back to Support
          </button>
        </div>
      </PageContainer>
    );
  }

  const statusCfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
  const priorityCfg = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.normal;
  const isClosed = ticket.status === "closed" || ticket.status === "resolved";

  return (
    <PageContainer
      title={`Ticket #${ticket.id}`}
      subtitle={ticket.title}
      actions={
        <button
          onClick={() => router.push("/support")}
          className="flex items-center gap-1.5 text-xs text-navy-400 hover:text-navy-200 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          All Tickets
        </button>
      }
    >
      <div className="max-w-3xl space-y-4">
        {/* Ticket Header */}
        <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-cyan/20 to-transparent" />
          <div className="flex items-start justify-between mb-3">
            <h2 className="text-base font-medium text-navy-100">{ticket.title}</h2>
            <div className="flex items-center gap-2">
              {!isClosed && (
                <button
                  onClick={closeTicket}
                  disabled={closing}
                  className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded border border-navy-700/40 text-navy-400 hover:text-navy-200 hover:border-navy-600 transition-colors disabled:opacity-40"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {closing ? "Closing..." : "Close Ticket"}
                </button>
              )}
              <span className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${statusCfg.bg} ${statusCfg.color}`}>
                {statusCfg.label}
              </span>
              <span className={`text-[9px] font-mono uppercase tracking-wider ${priorityCfg.color}`}>
                {priorityCfg.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono text-navy-500">
            <span className="capitalize">{ticket.category}</span>
            <span>Created {formatDate(ticket.createdAt)}</span>
            {ticket.assignedTo && <span>Assigned to {ticket.assignedTo}</span>}
            {ticket.resolvedAt && <span>Resolved {formatDate(ticket.resolvedAt)}</span>}
          </div>
        </div>

        {/* Messages Thread */}
        <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-navy-700/30">
            <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
              Conversation ({messages.length})
            </span>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {messages.map((msg) => {
              const isStaff = msg.isStaff === 1;
              return (
                <div
                  key={msg.id}
                  className={`px-4 py-3 border-b border-navy-700/20 last:border-0 ${
                    isStaff ? "bg-accent-cyan/[0.03]" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    {isStaff ? (
                      <Shield className="h-3 w-3 text-accent-cyan" />
                    ) : (
                      <User className="h-3 w-3 text-navy-500" />
                    )}
                    <span className={`text-[10px] font-mono font-medium ${isStaff ? "text-accent-cyan" : "text-navy-300"}`}>
                      {isStaff ? "Nexus Support" : "You"}
                    </span>
                    <span className="text-[9px] font-mono text-navy-600">{formatDate(msg.createdAt)}</span>
                  </div>
                  <div className="text-sm text-navy-300 leading-relaxed whitespace-pre-wrap pl-5">
                    {msg.content}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Input */}
          {!isClosed ? (
            <div className="px-4 py-3 border-t border-navy-700/30 bg-navy-900/40">
              <div className="flex gap-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendReply();
                  }}
                  placeholder="Type your reply..."
                  rows={2}
                  className="flex-1 px-3 py-2 rounded bg-navy-800/40 border border-navy-700/40 text-sm text-navy-200 placeholder:text-navy-600 focus:outline-none focus:border-navy-600 transition-colors resize-y"
                />
                <button
                  onClick={sendReply}
                  disabled={sending || !reply.trim()}
                  className="self-end h-9 px-4 rounded bg-navy-100 text-navy-950 text-xs font-medium hover:bg-white transition-colors disabled:opacity-40 flex items-center gap-1.5"
                >
                  {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                  Send
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[9px] text-navy-600 font-mono">Cmd+Enter to send</span>
                <button
                  onClick={closeTicket}
                  disabled={closing}
                  className="text-[10px] text-navy-500 hover:text-navy-300 transition-colors"
                >
                  {closing ? "Closing..." : "Close ticket"}
                </button>
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 border-t border-navy-700/30 text-center">
              <span className="text-[10px] font-mono text-navy-500">This ticket is {ticket.status}.</span>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
