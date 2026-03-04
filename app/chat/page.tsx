"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare } from "lucide-react";

interface ChatSession {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchSessions();
  }, []);

  async function fetchSessions() {
    try {
      const res = await fetch("/api/chat/sessions");
      const data = await res.json();
      setSessions(data.sessions || []);
    } finally {
      setLoading(false);
    }
  }

  async function createSession() {
    const res = await fetch("/api/chat/sessions", { method: "POST" });
    const data = await res.json();
    if (data.session) {
      router.push(`/chat/${data.session.id}`);
    }
  }

  return (
    <PageContainer
      title="Chat"
      subtitle="NEXUS Intelligence Analyst"
      actions={
        <Button size="sm" onClick={createSession}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Chat
        </Button>
      }
    >
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-14 rounded border border-navy-700 bg-navy-900/40 animate-pulse"
            />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <MessageSquare className="h-10 w-10 text-navy-600 mb-4" />
          <div className="text-sm text-navy-400 mb-4">
            No conversations yet.
          </div>
          <Button size="sm" onClick={createSession}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Start a Conversation
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => router.push(`/chat/${session.id}`)}
              className="w-full flex items-center gap-3 rounded border border-navy-700 bg-navy-900/40 px-4 py-3 text-left hover:bg-navy-800/60 hover:border-navy-600 transition-colors"
            >
              <MessageSquare className="h-4 w-4 text-navy-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono text-navy-200 truncate">
                  {session.title}
                </div>
                <div className="text-[10px] text-navy-500">
                  {new Date(session.updatedAt).toLocaleString()}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
