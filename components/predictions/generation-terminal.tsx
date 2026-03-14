"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal, CheckCircle2, Loader2, AlertTriangle, XCircle } from "lucide-react";

export interface TerminalStep {
  id: string;
  label: string;
  status: "running" | "done" | "warn" | "error";
  timestamp: number;
}

interface GenerationTerminalProps {
  steps: TerminalStep[];
  error?: string | null;
  complete?: boolean;
  resultCount?: number;
}

export function GenerationTerminal({ steps, error, complete, resultCount }: GenerationTerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(Date.now());

  // Live elapsed timer
  useEffect(() => {
    if (complete || error) return;
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, [complete, error]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps]);

  const startTime = steps.length > 0 ? steps[0].timestamp : now;
  const elapsed = ((now - startTime) / 1000).toFixed(1);

  return (
    <div className="mb-4 rounded-md border border-navy-700/40 bg-black/80 overflow-hidden font-mono">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-navy-900/80 border-b border-navy-700/30">
        <div className="flex items-center gap-2">
          <Terminal className="h-3 w-3 text-accent-cyan" />
          <span className="text-[10px] uppercase tracking-widest text-navy-400">
            Prediction Engine
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-navy-500">{elapsed}s</span>
          {!complete && !error && (
            <span className="flex items-center gap-1 text-[10px] text-accent-cyan">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-cyan animate-pulse" />
              LIVE
            </span>
          )}
          {complete && (
            <span className="flex items-center gap-1 text-[10px] text-accent-emerald">
              <CheckCircle2 className="h-3 w-3" />
              DONE
            </span>
          )}
          {error && (
            <span className="flex items-center gap-1 text-[10px] text-accent-rose">
              <XCircle className="h-3 w-3" />
              ERROR
            </span>
          )}
        </div>
      </div>

      {/* Terminal body */}
      <div ref={scrollRef} className="px-3 py-2 max-h-80 overflow-y-auto scrollbar-thin">
        {steps.map((step, i) => (
          <div key={`${step.id}-${i}`} className="flex items-start gap-2 py-0.5">
            <span className="flex-shrink-0 mt-0.5">
              {step.status === "running" && (
                <Loader2 className="h-3 w-3 text-accent-cyan animate-spin" />
              )}
              {step.status === "done" && (
                <CheckCircle2 className="h-3 w-3 text-accent-emerald" />
              )}
              {step.status === "warn" && (
                <AlertTriangle className="h-3 w-3 text-accent-amber" />
              )}
              {step.status === "error" && (
                <XCircle className="h-3 w-3 text-accent-rose" />
              )}
            </span>
            <span className={`text-[11px] leading-relaxed ${
              step.status === "running" ? "text-accent-cyan" :
              step.status === "done" ? "text-navy-300" :
              step.status === "warn" ? "text-accent-amber" :
              "text-accent-rose"
            }`}>
              {step.label}
            </span>
          </div>
        ))}

        {error && (
          <div className="flex items-start gap-2 py-0.5 mt-1">
            <XCircle className="h-3 w-3 text-accent-rose flex-shrink-0 mt-0.5" />
            <span className="text-[11px] text-accent-rose">{error}</span>
          </div>
        )}

        {complete && resultCount !== undefined && (
          <div className="mt-2 pt-2 border-t border-navy-700/30">
            <span className="text-[11px] text-accent-emerald">
              {resultCount > 0
                ? `${resultCount} prediction${resultCount !== 1 ? "s" : ""} generated and persisted in ${elapsed}s`
                : `No new predictions generated (capacity full or all duplicates)`
              }
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
