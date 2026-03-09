"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";

interface Comment {
  id: number;
  uuid: string;
  userId: string;
  content: string;
  parentId: number | null;
  createdAt: string;
}

interface CommentSectionProps {
  targetType: "signal" | "prediction" | "thesis";
  targetId: number;
}

export function CommentSection({ targetType, targetId }: CommentSectionProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadComments = useCallback(() => {
    fetch(`/api/comments?targetType=${targetType}&targetId=${targetId}`)
      .then((r) => (r.ok ? r.json() : { comments: [] }))
      .then((d) => setComments(d.comments || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [targetType, targetId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleSubmit = async () => {
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, content: newComment.trim() }),
      });
      if (res.ok) {
        setNewComment("");
        loadComments();
      }
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    try {
      const res = await fetch(`/api/comments?id=${commentId}`, { method: "DELETE" });
      if (res.ok) loadComments();
    } catch {}
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="rounded-lg border border-navy-700/50 bg-navy-900/30">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-navy-700/50 bg-navy-900/50">
        <MessageSquare className="h-3.5 w-3.5 text-navy-500" />
        <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
          Discussion ({comments.length})
        </span>
      </div>

      {/* Comment list */}
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-navy-600 text-xs">Loading...</div>
        ) : comments.length === 0 ? (
          <div className="p-4 text-center text-navy-600 text-xs">
            No comments yet. Be the first to share your analysis.
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="px-4 py-2.5 border-b border-navy-800/30 hover:bg-navy-800/20 transition-colors group"
            >
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href={`/analysts?username=${comment.userId}`}
                  className="text-xs font-medium text-accent-cyan hover:underline"
                >
                  {comment.userId}
                </Link>
                <span className="text-[10px] text-navy-600 font-mono">
                  {formatRelativeTime(comment.createdAt)}
                </span>
                {session?.user?.name === comment.userId && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="ml-auto opacity-0 group-hover:opacity-100 p-0.5 text-navy-600 hover:text-accent-rose transition-all"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
              <p className="text-sm text-navy-300 whitespace-pre-wrap">{comment.content}</p>
            </div>
          ))
        )}
      </div>

      {/* New comment input */}
      {session?.user && (
        <div className="p-3 border-t border-navy-700/50">
          <div className="flex gap-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Share your analysis..."
              rows={1}
              maxLength={2000}
              className="flex-1 rounded-md border border-navy-700 bg-navy-900 px-3 py-1.5 text-sm text-navy-200 placeholder-navy-600 focus:border-accent-cyan/50 focus:outline-none resize-none"
            />
            <button
              onClick={handleSubmit}
              disabled={!newComment.trim() || submitting}
              className="rounded-md border border-navy-700 px-3 py-1.5 text-navy-400 hover:text-accent-cyan hover:border-accent-cyan/50 transition-colors disabled:opacity-30"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
