"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import ForceGraph from "react-force-graph-2d";
import { NODE_COLORS, EDGE_COLORS } from "@/lib/graph/constants";
import { ZoomIn, ZoomOut, Maximize2, Crosshair } from "lucide-react";

export interface GraphNodeData {
  id: number;
  type: string;
  name: string;
  properties: Record<string, unknown>;
  sourceType: string | null;
  sourceId: string | null;
  // added at runtime by d3-force
  _connections?: number;
  _visible?: boolean;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphEdgeData {
  id: number;
  source: number;
  target: number;
  type: string;
  weight: number;
  properties: Record<string, unknown>;
}

interface Props {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  selectedId: number | null;
  hoveredId: number | null;
  hiddenTypes: Set<string>;
  onNodeClick: (id: number) => void;
  onNodeHover: (id: number | null) => void;
  onBackgroundClick: () => void;
  width: number;
  height: number;
}

export function GraphCanvas({
  nodes,
  edges,
  selectedId,
  hoveredId,
  hiddenTypes,
  onNodeClick,
  onNodeHover,
  onBackgroundClick,
  width,
  height,
}: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);
  const [settled, setSettled] = useState(false);

  // Fit to view after initial settle
  useEffect(() => {
    if (settled && fgRef.current && nodes.length > 0) {
      fgRef.current.zoomToFit(400, 60);
    }
  }, [settled, nodes.length]);

  // Center on selected node
  const centerOnSelected = useCallback(() => {
    if (!fgRef.current || selectedId == null) return;
    const node = nodes.find((n) => n.id === selectedId);
    if (node && node.x != null && node.y != null) {
      fgRef.current.centerAt(node.x, node.y, 500);
      fgRef.current.zoom(2, 500);
    }
  }, [selectedId, nodes]);

  // Filter visible
  const visibleNodes = nodes.filter((n) => !hiddenTypes.has(n.type));
  const visibleIds = new Set(visibleNodes.map((n) => n.id));
  const visibleEdges = edges.filter(
    (e) => visibleIds.has(e.source as unknown as number) && visibleIds.has(e.target as unknown as number)
  );

  // Connection set for highlighting
  const connectedToSelected = new Set<number>();
  const connectedToHovered = new Set<number>();
  if (selectedId != null) {
    for (const e of edges) {
      const s = typeof e.source === "object" ? (e.source as GraphNodeData).id : e.source;
      const t = typeof e.target === "object" ? (e.target as GraphNodeData).id : e.target;
      if (s === selectedId) connectedToSelected.add(t);
      if (t === selectedId) connectedToSelected.add(s);
    }
  }
  if (hoveredId != null) {
    for (const e of edges) {
      const s = typeof e.source === "object" ? (e.source as GraphNodeData).id : e.source;
      const t = typeof e.target === "object" ? (e.target as GraphNodeData).id : e.target;
      if (s === hoveredId) connectedToHovered.add(t);
      if (t === hoveredId) connectedToHovered.add(s);
    }
  }

  const graphData = { nodes: visibleNodes, links: visibleEdges };

  return (
    <div className="relative w-full h-full">
      <ForceGraph
        ref={fgRef}
        graphData={graphData}
        width={width}
        height={height}
        backgroundColor="#000000"
        nodeId="id"
        linkSource="source"
        linkTarget="target"
        // Force config
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        warmupTicks={80}
        cooldownTicks={120}
        onEngineStop={() => setSettled(true)}
        // Node rendering
        nodeCanvasObjectMode={() => "replace"}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const n = node as GraphNodeData;
          const conns = n._connections || 0;
          const radius = Math.sqrt(conns + 1) * 3 + 3;
          const color = NODE_COLORS[n.type] || "#64748b";
          const isSelected = n.id === selectedId;
          const isHovered = n.id === hoveredId;
          const isConnected = connectedToSelected.has(n.id) || connectedToHovered.has(n.id);
          const isDimmed = (selectedId != null || hoveredId != null) && !isSelected && !isHovered && !isConnected;

          const x = node.x || 0;
          const y = node.y || 0;

          // Glow ring for selected
          if (isSelected) {
            ctx.beginPath();
            ctx.arc(x, y, radius + 4, 0, 2 * Math.PI);
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.5;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }

          // Node circle
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.globalAlpha = isDimmed ? 0.15 : isHovered ? 1 : 0.85;
          ctx.fill();
          ctx.globalAlpha = 1;

          // Label
          const showLabel = isSelected || isHovered || isConnected || conns >= 3 || globalScale > 1.5;
          if (showLabel) {
            const label = n.name.length > 28 ? n.name.slice(0, 26) + "..." : n.name;
            const fontSize = Math.max(10 / globalScale, 2);
            ctx.font = `${fontSize}px "IBM Plex Mono", monospace`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillStyle = isDimmed ? "rgba(212,212,212,0.15)" : isSelected ? "#ffffff" : "rgba(212,212,212,0.7)";
            ctx.fillText(label, x, y + radius + 3);
          }
        }}
        nodePointerAreaPaint={(node, color, ctx) => {
          const n = node as GraphNodeData;
          const conns = n._connections || 0;
          const radius = Math.sqrt(conns + 1) * 3 + 5;
          ctx.beginPath();
          ctx.arc(node.x || 0, node.y || 0, radius, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }}
        // Link rendering
        linkWidth={(link) => {
          const e = link as unknown as GraphEdgeData;
          return e.weight * 2.5 + 0.3;
        }}
        linkColor={(link) => {
          const e = link as unknown as GraphEdgeData;
          const s = typeof e.source === "object" ? (e.source as GraphNodeData).id : e.source;
          const t = typeof e.target === "object" ? (e.target as GraphNodeData).id : e.target;
          const isHighlighted = s === selectedId || t === selectedId || s === hoveredId || t === hoveredId;
          const baseColor = EDGE_COLORS[e.type] || "#64748b";
          if (isHighlighted) return baseColor + "aa";
          if (selectedId != null || hoveredId != null) return baseColor + "12";
          return baseColor + "30";
        }}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={0.7}
        linkDirectionalArrowColor={(link) => {
          const e = link as unknown as GraphEdgeData;
          const s = typeof e.source === "object" ? (e.source as GraphNodeData).id : e.source;
          const t = typeof e.target === "object" ? (e.target as GraphNodeData).id : e.target;
          const isHighlighted = s === selectedId || t === selectedId || s === hoveredId || t === hoveredId;
          const baseColor = EDGE_COLORS[e.type] || "#64748b";
          if (isHighlighted) return baseColor + "aa";
          if (selectedId != null || hoveredId != null) return baseColor + "12";
          return baseColor + "30";
        }}
        // Interactions
        onNodeClick={(node) => onNodeClick((node as GraphNodeData).id)}
        onNodeHover={(node) => onNodeHover(node ? (node as GraphNodeData).id : null)}
        onBackgroundClick={onBackgroundClick}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
      />

      {/* Controls overlay */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
        <button
          onClick={() => fgRef.current?.zoom((fgRef.current.zoom() || 1) * 1.5, 300)}
          className="w-8 h-8 flex items-center justify-center rounded bg-navy-900/80 border border-navy-700/40 text-navy-300 hover:text-navy-100 hover:bg-navy-800/80 transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => fgRef.current?.zoom((fgRef.current.zoom() || 1) / 1.5, 300)}
          className="w-8 h-8 flex items-center justify-center rounded bg-navy-900/80 border border-navy-700/40 text-navy-300 hover:text-navy-100 hover:bg-navy-800/80 transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => fgRef.current?.zoomToFit(400, 60)}
          className="w-8 h-8 flex items-center justify-center rounded bg-navy-900/80 border border-navy-700/40 text-navy-300 hover:text-navy-100 hover:bg-navy-800/80 transition-colors"
          title="Fit all"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        {selectedId != null && (
          <button
            onClick={centerOnSelected}
            className="w-8 h-8 flex items-center justify-center rounded bg-navy-900/80 border border-navy-700/40 text-navy-300 hover:text-navy-100 hover:bg-navy-800/80 transition-colors"
            title="Center on selected"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
