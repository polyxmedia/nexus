"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { SweepDeltaResponse, SweepDeltaItem } from "@/lib/warroom/types";

interface SweepDeltaPanelProps {
  data: SweepDeltaResponse | null;
  loading: boolean;
}

const SEVERITY_COLORS = {
  flash: { text: "text-accent-rose", bg: "bg-accent-rose/15", border: "border-accent-rose/30", dot: "bg-accent-rose", label: "FLASH" },
  priority: { text: "text-accent-amber", bg: "bg-accent-amber/10", border: "border-accent-amber/25", dot: "bg-accent-amber", label: "PRIORITY" },
  routine: { text: "text-navy-400", bg: "bg-navy-800/50", border: "border-navy-700", dot: "bg-navy-500", label: "ROUTINE" },
};

const CHANGE_ICONS: Record<string, string> = {
  new: "+",
  escalated: "^",
  deescalated: "v",
  resolved: "x",
};

const LAYER_LABELS: Record<string, string> = {
  osint: "OSINT",
  fire: "FIRE",
  radiation: "RAD",
  aircraft: "AIR",
  vessel: "SEA",
};

function DeltaItem({ item }: { item: SweepDeltaItem }) {
  const sev = SEVERITY_COLORS[item.severity];
  return (
    <div className={cn("px-2.5 py-1.5 border-l-2 rounded-r-sm", sev.bg, sev.border)}>
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className={cn("text-[8px] font-mono font-bold tracking-wider", sev.text)}>
          {sev.label}
        </span>
        <span className="text-[8px] font-mono text-navy-600">
          {LAYER_LABELS[item.layer] || item.layer.toUpperCase()}
        </span>
        <span className="text-[8px] font-mono text-navy-700">
          {CHANGE_ICONS[item.changeType]}
        </span>
      </div>
      <p className="text-[9px] font-mono text-navy-300 leading-tight">
        {item.summary}
      </p>
    </div>
  );
}

export function SweepDeltaPanel({ data, loading }: SweepDeltaPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (!data && !loading) return null;

  const hasDeltas = data && data.deltas.length > 0;
  const flashCount = data?.flashCount ?? 0;

  return (
    <div className="absolute bottom-14 left-[17rem] z-30 pointer-events-auto">
      <div className={cn(
        "bg-navy-900/95 backdrop-blur-sm border border-navy-700 rounded overflow-hidden transition-all",
        collapsed ? "w-auto" : "w-72"
      )}>
        {/* Header */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-navy-800/50 transition-colors"
        >
          <div className={cn(
            "w-1.5 h-1.5 rounded-full",
            flashCount > 0 ? "bg-accent-rose animate-pulse" :
            hasDeltas ? "bg-accent-amber" : "bg-accent-emerald"
          )} />
          <span className="text-[9px] font-mono font-medium uppercase tracking-wider text-navy-300">
            Sweep Delta
          </span>
          {data && (
            <span className="text-[8px] font-mono text-navy-600 tabular-nums">
              {data.totalChanges}
            </span>
          )}
          {flashCount > 0 && (
            <span className="text-[8px] font-mono font-bold text-accent-rose tabular-nums">
              {flashCount} FLASH
            </span>
          )}
          <span className="flex-1" />
          <span className="text-[8px] text-navy-600">
            {collapsed ? "+" : "-"}
          </span>
        </button>

        {/* Delta list */}
        {!collapsed && (
          <div className="max-h-48 overflow-y-auto border-t border-navy-800">
            {loading && !data && (
              <div className="px-2.5 py-3 text-[9px] font-mono text-navy-600 text-center">
                Scanning...
              </div>
            )}
            {data && data.deltas.length === 0 && (
              <div className="px-2.5 py-3 text-[9px] font-mono text-navy-600 text-center">
                No changes since last sweep
              </div>
            )}
            {data && data.deltas.length > 0 && (
              <div className="flex flex-col gap-px p-1.5">
                {data.deltas.map((item) => (
                  <DeltaItem key={item.id} item={item} />
                ))}
              </div>
            )}
            {data?.previousSweepTime && (
              <div className="px-2.5 py-1 border-t border-navy-800 text-[8px] font-mono text-navy-700 text-center">
                vs {new Date(data.previousSweepTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
