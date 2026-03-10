"use client";

import { Search } from "lucide-react";
import { NODE_COLORS } from "@/lib/graph/constants";

interface GraphNode {
  id: number;
  type: string;
  name: string;
  properties: Record<string, unknown>;
  sourceType: string | null;
  sourceId: string | null;
}

interface Props {
  nodes: GraphNode[];
  connectionCounts: Map<number, number>;
  selectedId: number | null;
  search: string;
  filterType: string;
  entityTypes: string[];
  onSearchChange: (value: string) => void;
  onFilterChange: (value: string) => void;
  onSelect: (id: number) => void;
}

export function EntityListPanel({
  nodes,
  connectionCounts,
  selectedId,
  search,
  filterType,
  entityTypes,
  onSearchChange,
  onFilterChange,
  onSelect,
}: Props) {
  return (
    <div className="w-64 shrink-0 border-r border-navy-800/40 flex flex-col h-full">
      {/* Search + filter */}
      <div className="p-3 border-b border-navy-800/40 space-y-2">
        <div className="flex items-center gap-2 bg-navy-900/50 border border-navy-800/40 rounded px-2 py-1.5">
          <Search className="h-3 w-3 text-navy-500 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search entities... ( / )"
            data-graph-search
            className="bg-transparent text-xs text-navy-200 outline-none w-full placeholder:text-navy-600"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => onFilterChange(e.target.value)}
          className="w-full bg-navy-900/50 border border-navy-800/40 rounded px-2 py-1 text-xs text-navy-300 outline-none"
        >
          <option value="all">All types</option>
          {entityTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Entity list */}
      <div className="flex-1 overflow-y-auto">
        {nodes.length === 0 ? (
          <div className="p-4 text-xs text-navy-600 text-center">No entities found</div>
        ) : (
          nodes.map((node) => {
            const count = connectionCounts.get(node.id) || 0;
            const isSelected = selectedId === node.id;
            const color = NODE_COLORS[node.type] || "#64748b";
            return (
              <button
                key={node.id}
                onClick={() => onSelect(node.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-navy-900/60 transition-colors border-b border-navy-800/20 border-l-2 ${
                  isSelected ? "bg-navy-900/60" : "border-l-transparent"
                }`}
                style={isSelected ? { borderLeftColor: color } : undefined}
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-navy-200 truncate">{node.name}</div>
                  <div className="text-[9px] text-navy-600 font-mono uppercase">{node.type}</div>
                </div>
                {count > 0 && (
                  <span className="text-[10px] font-mono text-navy-500 shrink-0">{count}</span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
