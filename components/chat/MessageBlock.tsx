"use client";

import { useState } from "react";
import { Copy, Check, FileText } from "lucide-react";
import type { ChatTurn } from "@/lib/chat/useChat";
import { ToolCallIndicator } from "./ToolCallIndicator";
import { ToolResultRenderer } from "./ToolResultRenderer";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-navy-600 hover:text-navy-300"
      title="Copy message"
    >
      {copied
        ? <Check className="w-3 h-3 text-accent-emerald" />
        : <Copy className="w-3 h-3" />
      }
    </button>
  );
}

interface MessageBlockProps {
  turn: ChatTurn;
  isStreaming?: boolean;
  onSuggestionClick?: (suggestion: string) => void;
}

export function MessageBlock({ turn, isStreaming, onSuggestionClick }: MessageBlockProps) {
  if (turn.role === "user") {
    return (
      <div className="group flex justify-end items-start gap-1.5 mb-4">
        <CopyButton text={turn.content} />
        <div className="max-w-[70%] flex flex-col gap-2">
          {/* File attachments */}
          {turn.files && turn.files.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-end">
              {turn.files.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 rounded-lg border border-navy-600/40 bg-navy-800/60 pl-2 pr-2.5 py-1.5 text-[11px] font-mono text-navy-400 max-w-[180px]"
                >
                  {f.previewUrl ? (
                    <img
                      src={f.previewUrl}
                      alt={f.name}
                      className="h-5 w-5 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <FileText className="h-3 w-3 text-accent-amber flex-shrink-0" />
                  )}
                  <span className="truncate">{f.name}</span>
                </div>
              ))}
            </div>
          )}
          {/* Message text */}
          {turn.content && (
            <div className="border border-navy-600 rounded bg-navy-800/60 px-4 py-3">
              <div className="text-xs font-mono text-navy-200 whitespace-pre-wrap">
                {turn.content}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Assistant turn
  return (
    <div className="group mb-4">
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
        <div className="relative prose-nexus text-sm text-navy-200 leading-relaxed">
          {!isStreaming && turn.content && (
            <div className="absolute -top-0.5 -right-1">
              <CopyButton text={turn.content} />
            </div>
          )}
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h1 className="text-lg font-bold text-navy-100 mt-4 mb-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-base font-bold text-navy-100 mt-3 mb-2">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-bold text-navy-100 mt-3 mb-1">{children}</h3>,
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="text-navy-100 font-semibold">{children}</strong>,
              em: ({ children }) => <em className="text-navy-300 italic">{children}</em>,
              ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>,
              li: ({ children }) => <li className="text-navy-200">{children}</li>,
              code: ({ className, children }) => {
                const isBlock = className?.includes("language-");
                if (isBlock) {
                  return (
                    <code className="block bg-navy-900 border border-navy-700 rounded p-3 my-2 text-xs font-mono text-accent-cyan overflow-x-auto whitespace-pre">
                      {children}
                    </code>
                  );
                }
                return (
                  <code className="bg-navy-800 border border-navy-700 rounded px-1.5 py-0.5 text-xs font-mono text-accent-cyan">
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => <pre className="my-2">{children}</pre>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-navy-600 pl-3 my-2 text-navy-400 italic">
                  {children}
                </blockquote>
              ),
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent-cyan hover:underline">
                  {children}
                </a>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-2">
                  <table className="min-w-full text-xs border border-navy-700">{children}</table>
                </div>
              ),
              thead: ({ children }) => <thead className="bg-navy-800 text-navy-300">{children}</thead>,
              th: ({ children }) => <th className="px-3 py-1.5 text-left font-semibold border-b border-navy-700">{children}</th>,
              td: ({ children }) => <td className="px-3 py-1.5 border-b border-navy-800">{children}</td>,
              hr: () => <hr className="border-navy-700 my-3" />,
            }}
          >
            {turn.content}
          </ReactMarkdown>
          {isStreaming && !turn.content && turn.toolCalls.length === 0 && (
            <div className="flex items-center gap-2 py-1">
              <div className="flex gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse [animation-delay:150ms]" />
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse [animation-delay:300ms]" />
              </div>
              <span className="text-[11px] text-navy-500 font-mono">Analyzing...</span>
            </div>
          )}
          {isStreaming && turn.content && (
            <span className="inline-block w-1.5 h-4 bg-accent-cyan animate-pulse ml-0.5" />
          )}
        </div>
      )}

      {/* Follow-up suggestions */}
      {!isStreaming && turn.suggestions && turn.suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {turn.suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => onSuggestionClick?.(suggestion)}
              className="rounded-full border border-navy-700/30 bg-navy-900/60 px-3 py-1.5 text-[11px] font-mono text-navy-400 hover:text-navy-100 hover:border-navy-500/40 hover:bg-navy-800/50 transition-all"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
