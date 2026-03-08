"use client";

import { BookOpen, CheckCircle2, AlertCircle, Copy } from "lucide-react";

interface SaveKnowledgeData {
  stored?: boolean;
  id?: number;
  title?: string;
  category?: string;
  message?: string;
  reason?: string;
  existingEntry?: { id: number; title: string; category: string };
  error?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  thesis: "bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30",
  model: "bg-accent-amber/15 text-accent-amber border-accent-amber/30",
  event: "bg-accent-rose/15 text-accent-rose border-accent-rose/30",
  actor: "bg-signal-3/15 text-signal-3 border-signal-3/30",
  market: "bg-accent-emerald/15 text-accent-emerald border-accent-emerald/30",
  geopolitical: "bg-signal-1/15 text-signal-1 border-signal-1/30",
  technical: "bg-signal-4/15 text-signal-4 border-signal-4/30",
};

export function SaveKnowledgeWidget({ data }: { data: SaveKnowledgeData }) {
  if (data.error) {
    return (
      <div className="my-2 flex items-center gap-2.5 border border-accent-rose/30 rounded-lg bg-accent-rose/5 px-3 py-2.5">
        <AlertCircle className="h-3.5 w-3.5 text-accent-rose shrink-0" />
        <span className="text-[11px] text-accent-rose">{data.error}</span>
      </div>
    );
  }

  if (data.reason === "duplicate_detected" && data.existingEntry) {
    const catColor = CATEGORY_COLORS[data.existingEntry.category] || "bg-navy-700 text-navy-300 border-navy-600";
    return (
      <div className="my-2 border border-accent-amber/30 rounded-lg bg-navy-900/80 px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <Copy className="h-3.5 w-3.5 text-accent-amber shrink-0" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-accent-amber">
            Duplicate Detected
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-navy-200 flex-1 truncate">{data.existingEntry.title}</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono border shrink-0 ${catColor}`}>
            {data.existingEntry.category}
          </span>
          <span className="text-[9px] font-mono text-navy-600">#{data.existingEntry.id}</span>
        </div>
        <p className="text-[10px] text-navy-500 mt-1.5">Already exists in knowledge base — not stored again.</p>
      </div>
    );
  }

  if (data.stored && data.title) {
    const catColor = CATEGORY_COLORS[data.category || ""] || "bg-navy-700 text-navy-300 border-navy-600";
    return (
      <div className="my-2 border border-accent-emerald/30 rounded-lg bg-navy-900/80 px-4 py-3">
        <div className="flex items-center gap-2 mb-2.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-accent-emerald shrink-0" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-accent-emerald">
            Saved to Knowledge Base
          </span>
        </div>
        <div className="flex items-center gap-2">
          <BookOpen className="h-3 w-3 text-navy-500 shrink-0" />
          <span className="text-[12px] font-medium text-navy-100 flex-1 truncate">{data.title}</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono border shrink-0 ${catColor}`}>
            {data.category}
          </span>
          <span className="text-[9px] font-mono text-navy-600">#{data.id}</span>
        </div>
      </div>
    );
  }

  return null;
}
