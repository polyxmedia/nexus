"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useChat } from "@/lib/chat/useChat";
import { MessageBlock } from "@/components/chat/MessageBlock";
import { ChatInput } from "@/components/chat/ChatInput";
import {
  ArrowLeft,
  MessageSquare,
  FileText,
  Radio,
  TrendingUp,
  Calendar,
  Swords,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

function AutoPrompt({ sendMessage, historyLoaded, isStreaming }: { sendMessage: (msg: string) => void; historyLoaded: boolean; isStreaming: boolean }) {
  const searchParams = useSearchParams();
  const sent = useRef(false);
  const sendRef = useRef(sendMessage);
  sendRef.current = sendMessage;

  useEffect(() => {
    const prompt = searchParams.get("prompt");
    if (prompt && !sent.current && historyLoaded && !isStreaming) {
      sent.current = true;
      // Use ref to avoid stale closure from setTimeout
      const frame = requestAnimationFrame(() => {
        sendRef.current(prompt);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [searchParams, historyLoaded, isStreaming]);

  return null;
}

export default function ChatSessionPage() {
  const params = useParams();
  const sessionId = parseInt(params.sessionId as string, 10);
  const { turns, isStreaming, sendMessage, stop, loadHistory } = useChat(sessionId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState("New Chat");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const userScrolledUp = useRef(false);

  useEffect(() => {
    loadHistory().then((session) => {
      if (session) {
        setTitle(session.title);
      }
      setHistoryLoaded(true);
    });
  }, [loadHistory]);

  // Detect when user scrolls up to override auto-scroll
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Consider "at bottom" if within 80px of the bottom
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    userScrolledUp.current = !atBottom;
  }, []);

  // Auto-scroll on new content (unless user scrolled up)
  useEffect(() => {
    if (scrollRef.current && !userScrolledUp.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns]);

  // Re-enable auto-scroll when a new user message is sent
  useEffect(() => {
    if (isStreaming) {
      userScrolledUp.current = false;
    }
  }, [isStreaming]);

  return (
    <div className="ml-48 flex h-screen flex-col">
      <Suspense fallback={null}>
        <AutoPrompt sendMessage={sendMessage} historyLoaded={historyLoaded} isStreaming={isStreaming} />
      </Suspense>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-navy-700 bg-navy-950 px-5 py-3">
        <Link
          href="/chat"
          className="text-navy-400 hover:text-navy-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono font-bold text-navy-200 truncate uppercase tracking-wider">
            {title}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-6">
        {turns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded border border-navy-700 bg-navy-800 mb-4">
              <MessageSquare className="h-5 w-5 text-navy-400" />
            </div>
            <div className="text-sm font-mono text-navy-300 mb-1 uppercase tracking-wider">
              NEXUS Analyst Ready
            </div>
            <div className="text-xs text-navy-500 max-w-md mb-6">
              Ask about signals, market data, game theory scenarios, the active
              thesis, predictions, or your portfolio.
            </div>
            <div className="flex flex-wrap justify-center gap-1.5 max-w-xl">
              {[
                { label: "Active thesis summary", Icon: FileText },
                { label: "Signals firing now", Icon: Radio },
                { label: "Portfolio performance", Icon: TrendingUp },
                { label: "Hebrew calendar this week", Icon: Calendar },
                { label: "Game theory analysis", Icon: Swords },
                { label: "Highest risk trades", Icon: AlertTriangle },
              ].map((prompt) => (
                <button
                  key={prompt.label}
                  onClick={() => sendMessage(prompt.label)}
                  className="flex items-center gap-1.5 rounded-full border border-navy-700/30 bg-navy-900/60 px-3 py-1.5 text-[11px] font-mono text-navy-400 hover:text-navy-100 hover:border-navy-500/40 hover:bg-navy-800/50 transition-all"
                >
                  <prompt.Icon className="h-3 w-3" />
                  {prompt.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {turns.map((turn, i) => (
              <MessageBlock
                key={turn.id}
                turn={turn}
                isStreaming={
                  isStreaming &&
                  turn.role === "assistant" &&
                  i === turns.length - 1
                }
                onSuggestionClick={sendMessage}
              />
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="max-w-4xl mx-auto w-full">
        <ChatInput
          onSend={sendMessage}
          onStop={stop}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  );
}
