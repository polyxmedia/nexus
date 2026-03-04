"use client";

import { Loader2, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const TOOL_LABELS: Record<string, string> = {
  get_signals: "Fetching signals",
  get_market_snapshot: "Loading market snapshot",
  get_market_sentiment: "Loading sentiment data",
  get_game_theory: "Running game theory analysis",
  get_active_thesis: "Loading active thesis",
  get_predictions: "Loading predictions",
  get_portfolio: "Fetching portfolio",
};

interface ToolCallIndicatorProps {
  toolName: string;
  status: "loading" | "done" | "error";
}

export function ToolCallIndicator({ toolName, status }: ToolCallIndicatorProps) {
  const label = TOOL_LABELS[toolName] || toolName;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider py-1",
        status === "loading" && "text-accent-cyan",
        status === "done" && "text-navy-500",
        status === "error" && "text-accent-rose"
      )}
    >
      {status === "loading" && (
        <Loader2 className="h-3 w-3 animate-spin" />
      )}
      {status === "done" && <Check className="h-3 w-3" />}
      {status === "error" && <AlertCircle className="h-3 w-3" />}
      <span>{label}{status === "loading" ? "..." : ""}</span>
    </div>
  );
}
