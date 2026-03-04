"use client";

import type { ChatTurn } from "@/lib/chat/useChat";
import { ToolCallIndicator } from "./ToolCallIndicator";
import { ToolResultRenderer } from "./ToolResultRenderer";
import { cn } from "@/lib/utils";

interface MessageBlockProps {
  turn: ChatTurn;
  isStreaming?: boolean;
}

export function MessageBlock({ turn, isStreaming }: MessageBlockProps) {
  if (turn.role === "user") {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[70%] border border-navy-600 rounded bg-navy-800/60 px-4 py-3">
          <div className="text-xs font-mono text-navy-200 whitespace-pre-wrap">
            {turn.content}
          </div>
        </div>
      </div>
    );
  }

  // Assistant turn
  return (
    <div className="mb-4">
      {/* Tool calls rendered inline above text */}
      {turn.toolCalls.map((tc) => (
        <div key={tc.toolUseId} className="mb-2">
          <ToolCallIndicator toolName={tc.toolName} status={tc.status} />
          {tc.status === "done" && tc.result != null ? (
            <ToolResultRenderer toolName={tc.toolName} result={tc.result} />
          ) : null}
        </div>
      ))}

      {/* Text content */}
      {(turn.content || isStreaming) && (
        <div className="text-sm text-navy-200 leading-relaxed whitespace-pre-wrap">
          {formatMarkdownLite(turn.content)}
          {isStreaming && !turn.content && turn.toolCalls.length === 0 && (
            <span className="inline-block w-1.5 h-4 bg-accent-cyan animate-pulse" />
          )}
          {isStreaming && turn.content && (
            <span className="inline-block w-1.5 h-4 bg-accent-cyan animate-pulse ml-0.5" />
          )}
        </div>
      )}
    </div>
  );
}

function formatMarkdownLite(text: string): React.ReactNode {
  if (!text) return null;

  // Split by lines and process bold markers
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="text-navy-100 font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
