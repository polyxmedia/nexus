"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Radio,
  TrendingUp,
  BarChart3,
  Lightbulb,
  DollarSign,
  Building2,
  Flame,
  Users,
  MapPin,
} from "lucide-react";
import { NODE_COLORS } from "@/lib/graph/constants";

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  signal: Radio,
  prediction: TrendingUp,
  trade: BarChart3,
  thesis: Lightbulb,
  ticker: DollarSign,
  sector: Building2,
  event: Flame,
  actor: Users,
  location: MapPin,
};

export interface EntityNodeData {
  label: string;
  type: string;
  connections: number;
  nodeId: number;
  isSelected?: boolean;
  isDimmed?: boolean;
  isFocusTarget?: boolean;
  isPathNode?: boolean;
  strength?: number; // 0-1, derived from connection weight
  [key: string]: unknown;
}

function EntityNodeComponent({ data }: NodeProps) {
  const d = data as unknown as EntityNodeData;
  const color = NODE_COLORS[d.type] || "#64748b";
  const Icon = TYPE_ICONS[d.type] || Radio;
  const conns = d.connections || 0;
  const size = Math.max(36, Math.min(64, 36 + conns * 3));
  const isHub = conns >= 5;
  const isSelected = d.isSelected || false;
  const isDimmed = d.isDimmed || false;
  const isPathNode = d.isPathNode || false;

  return (
    <div
      className="entity-node-wrapper"
      style={{
        width: size,
        height: size,
        opacity: isDimmed ? 0.15 : 1,
        transition: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Outer ring for hubs / path nodes */}
      {(isHub || isSelected || isPathNode) && !isDimmed && (
        <div
          className={`absolute inset-[-4px] rounded-full ${isPathNode ? "entity-path-ring" : isSelected ? "entity-pulse-ring" : ""}`}
          style={{
            border: `1px solid ${color}${isSelected || isPathNode ? "80" : "30"}`,
            background: `radial-gradient(circle, ${color}08 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Main circle */}
      <div
        className="relative w-full h-full rounded-full flex items-center justify-center"
        style={{
          background: isSelected
            ? `radial-gradient(circle at 35% 35%, ${color}dd, ${color}88)`
            : `radial-gradient(circle at 35% 35%, ${color}99, ${color}44)`,
          border: `1.5px solid ${color}${isSelected ? "ff" : "60"}`,
          boxShadow: isSelected
            ? `0 0 20px ${color}50, 0 0 40px ${color}20, inset 0 1px 0 ${color}40`
            : isDimmed
            ? "none"
            : `0 0 12px ${color}15, inset 0 1px 0 ${color}20`,
        }}
      >
        <div
          className="shrink-0"
          style={{
            width: Math.max(12, size * 0.3),
            height: Math.max(12, size * 0.3),
            color: isSelected ? "#fff" : `${color}`,
            filter: isSelected ? `drop-shadow(0 0 4px ${color})` : "none",
          }}
        >
          <Icon className="w-full h-full" />
        </div>
      </div>

      {/* Label below node */}
      <div
        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center pointer-events-none"
        style={{ top: size + 4 }}
      >
        <div
          className="text-[9px] font-mono font-medium leading-tight max-w-[80px] truncate"
          style={{
            color: isSelected ? "#e0e0e0" : isDimmed ? "#30303060" : "#9e9e9e",
            textShadow: isSelected ? `0 0 8px ${color}40` : "none",
          }}
        >
          {d.label}
        </div>
        {conns > 0 && !isDimmed && (
          <div
            className="text-[7px] font-mono mt-0.5"
            style={{ color: isDimmed ? "transparent" : "#505050" }}
          >
            {conns} link{conns !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Connection count badge for hubs */}
      {isHub && !isDimmed && (
        <div
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-mono font-bold"
          style={{
            background: color,
            color: "#000",
            boxShadow: `0 0 6px ${color}60`,
          }}
        >
          {conns}
        </div>
      )}

      {/* Hidden handles for React Flow edge connections */}
      <Handle type="target" position={Position.Left} className="!opacity-0 !w-px !h-px" />
      <Handle type="source" position={Position.Right} className="!opacity-0 !w-px !h-px" />
    </div>
  );
}

export const EntityNode = memo(EntityNodeComponent);
