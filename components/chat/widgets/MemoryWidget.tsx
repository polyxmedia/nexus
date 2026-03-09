"use client";

import { Brain, Trash2 } from "lucide-react";

interface MemoryResult {
  action?: "created" | "updated" | "deleted" | "recalled";
  memories?: Array<{ id: number; category: string; key: string; value: string; useCount: number }>;
  message?: string;
  id?: number;
  key?: string;
  category?: string;
}

function isMemoryResult(data: unknown): data is MemoryResult {
  return data !== null && typeof data === "object";
}

export function MemoryWidget({ result }: { result: unknown }) {
  if (!isMemoryResult(result)) return null;

  // Save/update/delete confirmation
  if (result.action === "created" || result.action === "updated" || result.action === "deleted") {
    const colors: Record<string, string> = {
      created: "text-accent-emerald",
      updated: "text-accent-amber",
      deleted: "text-accent-rose",
    };
    return (
      <div className="flex items-center gap-2 py-1">
        <Brain className={`w-3 h-3 ${colors[result.action]}`} />
        <span className="text-[11px] font-mono text-navy-400">
          Memory {result.action}: <span className="text-navy-200">{result.key || result.message}</span>
          {result.category && (
            <span className="text-navy-600 ml-1">({result.category})</span>
          )}
        </span>
      </div>
    );
  }

  // Recall result
  if (result.memories && result.memories.length > 0) {
    return (
      <div className="space-y-1 py-1">
        <div className="flex items-center gap-1.5">
          <Brain className="w-3 h-3 text-accent-cyan" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
            {result.memories.length} memories recalled
          </span>
        </div>
        <div className="grid gap-1 pl-4">
          {result.memories.slice(0, 10).map((m) => (
            <div key={m.id} className="flex items-start gap-2 text-[11px]">
              <span className="text-navy-600 font-mono shrink-0">[{m.category}]</span>
              <span className="text-navy-400 font-mono">{m.key}:</span>
              <span className="text-navy-300">{m.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (result.message) {
    return (
      <div className="flex items-center gap-2 py-1">
        <Brain className="w-3 h-3 text-navy-500" />
        <span className="text-[11px] font-mono text-navy-400">{result.message}</span>
      </div>
    );
  }

  return null;
}
