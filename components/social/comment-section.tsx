"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, CornerDownRight, MessageSquare, Trash2, X } from "lucide-react";
import { useSession } from "next-auth/react";

interface Comment {
  id: number;
  uuid: string;
  userId: string;
  content: string;
  parentId: number | null;
  createdAt: string;
  profileImage?: string | null;
}

interface CommentSectionProps {
  targetType: "signal" | "prediction" | "thesis";
  targetId: number;
}

function UserAvatar({ username, imageUrl, size = "sm" }: { username: string; imageUrl?: string | null; size?: "sm" | "xs" }) {
  const dim = size === "sm" ? "h-6 w-6" : "h-5 w-5";
  const text = size === "sm" ? "text-[10px]" : "text-[9px]";

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={username}
        className={`${dim} rounded-full object-cover flex-shrink-0 border border-navy-700`}
      />
    );
  }

  return (
    <div className={`${dim} rounded-full bg-navy-800 border border-navy-700 flex items-center justify-center flex-shrink-0`}>
      <span className={`${text} font-bold text-navy-400 uppercase`}>
        {username.charAt(0)}
      </span>
    </div>
  );
}

function CommentItem({
  comment,
  isReply,
  session,
  onReply,
  onDelete,
}: {
  comment: Comment;
  isReply: boolean;
  session: ReturnType<typeof useSession>["data"];
  onReply: (c: Comment) => void;
  onDelete: (id: number) => Promise<void>;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(comment.id);
    setDeleting(false);
    setConfirmDelete(false);
  };

  const isOwner = session?.user?.name === comment.userId;

  return (
    <div
      className={`px-4 py-2.5 border-b border-navy-800/30 hover:bg-navy-800/20 transition-colors group ${isReply ? "pl-12" : ""}`}
    >
      <div className="flex items-center gap-2 mb-1">
        {isReply && <CornerDownRight className="h-3 w-3 text-navy-700 flex-shrink-0" />}
        <UserAvatar username={comment.userId} imageUrl={comment.profileImage} size={isReply ? "xs" : "sm"} />
        <Link
          href={`/analysts?username=${comment.userId}`}
          className="text-xs font-medium text-accent-cyan hover:underline"
        >
          {comment.userId}
        </Link>
        <span className="text-[10px] text-navy-600 font-mono">
          {formatRelativeTime(comment.createdAt)}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {session?.user && !confirmDelete && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onReply(comment);
              }}
              className="p-0.5 text-navy-600 hover:text-accent-cyan transition-colors text-[10px] font-mono opacity-0 group-hover:opacity-100"
            >
              reply
            </button>
          )}
          {isOwner && !confirmDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-0.5 text-navy-700 hover:text-accent-rose transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
          {confirmDelete && (
            <span className="flex items-center gap-1.5 text-[10px] font-mono">
              <span className="text-navy-500">delete?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-accent-rose hover:text-accent-rose/80 transition-colors"
              >
                {deleting ? "..." : "yes"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-navy-500 hover:text-navy-300 transition-colors"
              >
                no
              </button>
            </span>
          )}
        </div>
      </div>
      <p className={`text-sm text-navy-300 whitespace-pre-wrap ${isReply ? "ml-7" : "ml-8"}`}>{comment.content}</p>
    </div>
  );
}

export function CommentSection({ targetType, targetId }: CommentSectionProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);

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
        body: JSON.stringify({
          targetType,
          targetId,
          content: newComment.trim(),
          parentId: replyTo?.id || undefined,
        }),
      });
      if (res.ok) {
        setNewComment("");
        setReplyTo(null);
        loadComments();
      }
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    try {
      const res = await fetch("/api/comments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: commentId }),
      });
      if (res.ok) loadComments();
    } catch {}
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Build threaded structure
  const topLevel = comments.filter((c) => !c.parentId);
  const replies = comments.filter((c) => c.parentId);
  const repliesByParent = new Map<number, Comment[]>();
  for (const r of replies) {
    const existing = repliesByParent.get(r.parentId!) || [];
    existing.push(r);
    repliesByParent.set(r.parentId!, existing);
  }

  return (
    <div className="rounded-lg border border-navy-700/50 bg-navy-900/30 mt-6">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-navy-700/50 bg-navy-900/50">
        <MessageSquare className="h-3.5 w-3.5 text-navy-500" />
        <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
          Discussion ({comments.length})
        </span>
      </div>

      {/* Comment list */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-navy-600 text-xs">Loading...</div>
        ) : topLevel.length === 0 ? (
          <div className="p-4 text-center text-navy-600 text-xs">
            No comments yet. Be the first to share your analysis.
          </div>
        ) : (
          topLevel.map((comment) => (
            <div key={comment.id}>
              <CommentItem
                comment={comment}
                isReply={false}
                session={session}
                onReply={setReplyTo}
                onDelete={handleDelete}
              />
              {repliesByParent.get(comment.id)?.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  isReply={true}
                  session={session}
                  onReply={setReplyTo}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {/* Reply indicator */}
      {replyTo && (
        <div className="px-4 py-1.5 border-t border-navy-700/50 bg-navy-900/60 flex items-center gap-2">
          <CornerDownRight className="h-3 w-3 text-navy-500" />
          <span className="text-[10px] text-navy-400 font-mono">
            Replying to <span className="text-accent-cyan">{replyTo.userId}</span>
          </span>
          <button
            onClick={() => setReplyTo(null)}
            className="ml-auto p-0.5 text-navy-600 hover:text-navy-300 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* New comment input */}
      {session?.user && (
        <div className="p-3 border-t border-navy-700/50">
          <div className="flex items-center gap-2">
            <UserAvatar username={session.user.name || "?"} />
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={replyTo ? `Reply to ${replyTo.userId}...` : "Share your analysis..."}
              rows={1}
              maxLength={2000}
              className="flex-1 rounded-md border border-navy-700 bg-navy-900 px-3 py-1.5 text-sm text-navy-200 placeholder-navy-600 focus:border-accent-cyan/50 focus:outline-none resize-none"
            />
            <button
              onClick={handleSubmit}
              disabled={!newComment.trim() || submitting}
              className="p-1.5 text-navy-500 hover:text-accent-cyan transition-colors disabled:opacity-30"
            >
              <ArrowRight className="h-4 w-4" />
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
