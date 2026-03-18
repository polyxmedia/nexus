"use client";

import { useState } from "react";
import { Copy, Check, FileText } from "lucide-react";
import type { ChatTurn, SycophancyIndex } from "@/lib/chat/useChat";
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

function getSycophancyLabel(score: number): { label: string; color: string } {
  // Inverted framing: show INDEPENDENCE level, not bias level.
  // A score of 0.78 from the detector means 22% independence, not "78% sycophantic".
  // This frames the metric positively while keeping the same rigor.
  const independence = 1 - score;
  if (independence >= 0.9) return { label: "FULLY INDEPENDENT", color: "text-accent-emerald" };
  if (independence >= 0.7) return { label: "INDEPENDENT", color: "text-accent-emerald" };
  if (independence >= 0.5) return { label: "MOSTLY INDEPENDENT", color: "text-accent-cyan" };
  if (independence >= 0.3) return { label: "BIAS DETECTED", color: "text-accent-amber" };
  return { label: "BIAS WARNING", color: "text-accent-rose" };
}

function SycophancyCoefficient({ index }: { index: SycophancyIndex }) {
  const [expanded, setExpanded] = useState(false);
  const independence = 1 - index.score;
  const { label, color } = getSycophancyLabel(index.score);
  const pct = (independence * 100).toFixed(0);

  return (
    <div className="mt-2">
      <button
        onClick={() => index.flags.length > 0 && setExpanded(!expanded)}
        className="flex items-center gap-2 text-[10px] font-mono group/syc"
      >
        <span className="uppercase tracking-wider text-navy-600">Independence Audit</span>
        <span className="text-navy-700">|</span>
        {/* Score bar - shows independence level (higher = better) */}
        <div className="flex items-center gap-1.5">
          <div className="w-16 h-1 rounded-full bg-navy-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                independence >= 0.7 ? "bg-accent-emerald" :
                independence >= 0.5 ? "bg-accent-cyan" :
                independence >= 0.3 ? "bg-accent-amber" :
                "bg-accent-rose"
              }`}
              style={{ width: `${Math.max(3, independence * 100)}%` }}
            />
          </div>
          <span className={`font-semibold ${color}`}>{pct}%</span>
          <span className={`uppercase tracking-wider ${color}`}>{label}</span>
        </div>
        {index.flags.length > 0 && (
          <>
            <span className="text-navy-700">|</span>
            <span className="text-navy-600 group-hover/syc:text-navy-400 transition-colors">
              {index.flags.length} flag{index.flags.length !== 1 ? "s" : ""} {expanded ? "-" : "+"}
            </span>
          </>
        )}
      </button>

      {/* Disclaimer */}
      <p className="text-[9px] font-mono text-navy-700 mt-0.5">
        NEXUS audits its own output for agreement bias. Lower independence = more flags for review.
      </p>

      {/* Expanded flags */}
      {expanded && index.flags.length > 0 && (
        <div className="mt-1.5 pl-2 border-l border-navy-800 space-y-1">
          {index.flags.map((flag, i) => (
            <p key={i} className="text-[10px] font-mono text-navy-500">{flag}</p>
          ))}
        </div>
      )}
    </div>
  );
}

interface MessageBlockProps {
  turn: ChatTurn;
  isStreaming?: boolean;
  onSuggestionClick?: (suggestion: string) => void;
  /** Running credit total up to this turn (admin only) */
  cumulativeCredits?: number;
  /** Show independence audit (sycophancy index) - admin only */
  isAdmin?: boolean;
}

export function MessageBlock({ turn, isStreaming, onSuggestionClick, cumulativeCredits, isAdmin }: MessageBlockProps) {
  if (turn.role === "user") {
    return (
      <div className="group flex justify-end items-start gap-1.5 mb-4">
        {!turn.pending && <CopyButton text={turn.content} />}
        <div className="max-w-[90%] sm:max-w-[70%] flex flex-col gap-2">
          {/* File attachments */}
          {turn.files && turn.files.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-end">
              {turn.files.map((f, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-1.5 rounded-lg border pl-2 pr-2.5 py-1.5 text-[11px] font-mono max-w-[180px] ${
                    turn.pending
                      ? "border-accent-amber/20 bg-accent-amber/5 text-navy-500"
                      : "border-navy-600/40 bg-navy-800/60 text-navy-400"
                  }`}
                >
                  {f.previewUrl ? (
                    <img
                      src={f.previewUrl}
                      alt={f.name}
                      className={`h-5 w-5 rounded object-cover flex-shrink-0 ${turn.pending ? "opacity-50" : ""}`}
                    />
                  ) : (
                    <FileText className="h-3 w-3 text-accent-amber flex-shrink-0" />
                  )}
                  <span className="truncate">{f.name}</span>
                </div>
              ))}
            </div>
          )}
          {/* Pending label */}
          {turn.pending && (
            <div className="flex items-center justify-end gap-1.5">
              <span className="inline-block w-1 h-1 rounded-full bg-accent-amber animate-pulse" />
              <span className="text-[9px] font-mono uppercase tracking-wider text-accent-amber/60">
                Queued
              </span>
            </div>
          )}
          {/* Message text */}
          {turn.content && (
            <div className={`border rounded px-4 py-3 ${
              turn.pending
                ? "border-accent-amber/20 bg-accent-amber/[0.03]"
                : "border-navy-600 bg-navy-800/60"
            }`}>
              <div className={`text-xs font-mono whitespace-pre-wrap ${
                turn.pending ? "text-navy-400" : "text-navy-200"
              }`}>
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

      {/* Token usage summary */}
      {turn.tokenUsage && (
        <div className={`flex items-center gap-3 mt-2 py-1.5 text-[10px] font-mono text-navy-600 ${isStreaming ? "animate-pulse" : ""}`}>
          <span className="text-navy-500">
            {turn.tokenUsage.model.replace("claude-", "").replace(/-\d+$/, "")}
          </span>
          <span className="text-navy-700">|</span>
          <span>
            {turn.tokenUsage.inputTokens.toLocaleString()} in / {turn.tokenUsage.outputTokens.toLocaleString()} out
          </span>
          <span className="text-navy-700">|</span>
          <span>
            {turn.tokenUsage.creditsUsed.toLocaleString()} credits
          </span>
          <span className="text-navy-700">|</span>
          <span>
            {(turn.tokenUsage.elapsedMs / 1000).toFixed(1)}s
          </span>
          {!isStreaming && (
            turn.tokenUsage.unlimited ? (
              <>
                <span className="text-navy-700">|</span>
                <span className="text-accent-cyan">unlimited</span>
              </>
            ) : turn.tokenUsage.creditsRemaining != null && turn.tokenUsage.creditsRemaining >= 0 ? (
              <>
                <span className="text-navy-700">|</span>
                <span className={turn.tokenUsage.creditsRemaining < 5000 ? "text-accent-amber" : ""}>
                  {turn.tokenUsage.creditsRemaining.toLocaleString()} remaining
                </span>
              </>
            ) : null
          )}
          {cumulativeCredits != null && cumulativeCredits > 0 && (
            <>
              <span className="text-navy-700">|</span>
              <span className="text-navy-500">
                session: {cumulativeCredits.toLocaleString()} credits
              </span>
              <span className="text-navy-700">|</span>
              <span className={cumulativeCredits * 0.001 > 1 ? "text-accent-amber" : "text-navy-400"}>
                ${(cumulativeCredits * 0.001) < 0.01
                  ? (cumulativeCredits * 0.001).toFixed(4)
                  : (cumulativeCredits * 0.001).toFixed(2)}
              </span>
            </>
          )}
        </div>
      )}

      {/* Independence Audit (admin only) */}
      {!isStreaming && turn.sycophancyIndex && isAdmin && (
        <SycophancyCoefficient index={turn.sycophancyIndex} />
      )}

      {/* Meta-Analysis calibration audit */}
      {!isStreaming && turn.metaAnalysis && turn.metaAnalysis.issues_found?.length > 0 && (
        <div className="mt-3 border border-accent-amber/20 rounded-lg bg-accent-amber/[0.03] overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-accent-amber/10 bg-accent-amber/[0.05]">
            <div className="h-1.5 w-1.5 rounded-full bg-accent-amber animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-accent-amber/80">
              Meta-Analysis — Calibration Audit
            </span>
          </div>
          <div className="px-3 py-2.5 space-y-2">
            {turn.metaAnalysis.issues_found.map((issue, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${
                  issue.severity === "high" ? "bg-accent-rose/10 text-accent-rose" :
                  issue.severity === "medium" ? "bg-accent-amber/10 text-accent-amber" :
                  "bg-navy-700/30 text-navy-400"
                }`}>
                  {issue.severity}
                </span>
                <div>
                  <span className="text-[10px] font-mono text-navy-300 font-semibold uppercase">{issue.id}</span>
                  <p className="text-xs text-navy-400 mt-0.5">{issue.detail}</p>
                </div>
              </div>
            ))}

            {turn.metaAnalysis.suggested_adjustment && (
              <div className="mt-2 pt-2 border-t border-accent-amber/10 flex items-center gap-3">
                <span className="text-[10px] font-mono text-navy-500">Suggested adjustment:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono text-navy-400">
                    {(turn.metaAnalysis.suggested_adjustment.original_probability * 100).toFixed(0)}%
                  </span>
                  <span className="text-navy-600 text-xs">-&gt;</span>
                  <span className="text-xs font-mono text-accent-amber font-semibold">
                    {(turn.metaAnalysis.suggested_adjustment.adjusted_probability * 100).toFixed(0)}%
                  </span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                    turn.metaAnalysis.confidence_in_adjustment === "high" ? "bg-accent-emerald/10 text-accent-emerald" :
                    turn.metaAnalysis.confidence_in_adjustment === "medium" ? "bg-accent-amber/10 text-accent-amber" :
                    "bg-navy-700/30 text-navy-400"
                  }`}>
                    {turn.metaAnalysis.confidence_in_adjustment} confidence
                  </span>
                </div>
              </div>
            )}

            {turn.metaAnalysis.suggested_adjustment?.reason && (
              <p className="text-[11px] text-navy-500 italic">{turn.metaAnalysis.suggested_adjustment.reason}</p>
            )}

            {turn.metaAnalysis.missing_data && turn.metaAnalysis.missing_data.length > 0 && (
              <div className="mt-1.5 pt-1.5 border-t border-accent-amber/10">
                <span className="text-[9px] font-mono text-navy-600 uppercase tracking-wider">Missing data:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {turn.metaAnalysis.missing_data.map((d, i) => (
                    <span key={i} className="text-[10px] font-mono text-navy-500 bg-navy-800/50 px-1.5 py-0.5 rounded">{d}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
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
