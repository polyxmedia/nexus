"use client";

import { Badge } from "@/components/ui/badge";

interface KnowledgeResult {
  id: number;
  title: string;
  category: string;
  confidence: number;
  tags: string[];
  source: string | null;
  status: string;
  contentPreview: string;
  createdAt: string;
}

interface KnowledgeData {
  query: string;
  resultCount: number;
  entries: KnowledgeResult[];
  error?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  thesis: "bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30",
  model: "bg-accent-amber/15 text-accent-amber border border-accent-amber/30",
  event: "bg-accent-rose/15 text-accent-rose border border-accent-rose/30",
  actor: "bg-signal-3/15 text-signal-3 border border-signal-3/30",
  market: "bg-accent-emerald/15 text-accent-emerald border border-accent-emerald/30",
  geopolitical: "bg-signal-1/15 text-signal-1 border border-signal-1/30",
  technical: "bg-signal-4/15 text-signal-4 border border-signal-4/30",
};

export function KnowledgeWidget({ data }: { data: KnowledgeData }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  if (!data.entries || data.entries.length === 0) {
    return (
      <div className="my-2 border border-navy-700 rounded bg-navy-900/60 px-3 py-2 text-xs text-navy-500">
        No knowledge entries found for &quot;{data.query}&quot;
      </div>
    );
  }

  return (
    <div className="my-2 border border-navy-700 rounded bg-navy-900/80 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] uppercase tracking-wider text-navy-500 font-mono">
          Knowledge Bank
        </span>
        <Badge variant="default">{data.resultCount} result{data.resultCount !== 1 ? "s" : ""}</Badge>
      </div>

      <div className="space-y-2">
        {data.entries.map((entry) => (
          <div
            key={entry.id}
            className="border border-navy-700 rounded bg-navy-800/40 px-3 py-2"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-navy-100">
                {entry.title}
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                  CATEGORY_COLORS[entry.category] || "bg-navy-700 text-navy-300"
                }`}
              >
                {entry.category}
              </span>
              <span className="text-[9px] text-navy-500 font-mono">
                {Math.round((entry.confidence ?? 0.8) * 100)}%
              </span>
            </div>

            <p className="text-[11px] text-navy-400 leading-relaxed line-clamp-3">
              {entry.contentPreview}
            </p>

            {entry.tags && entry.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {entry.tags.slice(0, 6).map((tag) => (
                  <span
                    key={tag}
                    className="text-[8px] px-1 py-0.5 rounded bg-navy-700/60 text-navy-400 font-mono"
                  >
                    {tag}
                  </span>
                ))}
                {entry.tags.length > 6 && (
                  <span className="text-[8px] text-navy-600 font-mono">
                    +{entry.tags.length - 6}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
