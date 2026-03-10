"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  type Node,
  type Edge,
  type NodeMouseHandler,
  Position,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { NODE_COLORS, EDGE_COLORS, RELATIONSHIP_LABELS, weightLabel } from "@/lib/graph/constants";
import { EntityNode, type EntityNodeData } from "./custom-node";

/* ── Public types (consumed by page.tsx) ── */
export interface GraphNodeData {
  id: number;
  type: string;
  name: string;
  properties: Record<string, unknown>;
  sourceType: string | null;
  sourceId: string | null;
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
  focusNodeId: number | null;
  pathNodes: Set<number> | null;
  pathEdges: Set<number> | null;
  onNodeClick: (id: number) => void;
  onNodeHover: (id: number | null) => void;
  onBackgroundClick: () => void;
  onNodeContextMenu: (e: React.MouseEvent, nodeId: number) => void;
  onNodeDoubleClick: (id: number) => void;
  width: number;
  height: number;
}

const nodeTypes = { entity: EntityNode };

/* ── Layout: force-directed via clustered circle layout ── */
function layoutNodes(nodes: GraphNodeData[], edges: GraphEdgeData[]): Map<number, { x: number; y: number }> {
  const positions = new Map<number, { x: number; y: number }>();
  if (nodes.length === 0) return positions;

  const typeGroups = new Map<string, GraphNodeData[]>();
  for (const n of nodes) {
    const arr = typeGroups.get(n.type) || [];
    arr.push(n);
    typeGroups.set(n.type, arr);
  }

  const types = Array.from(typeGroups.keys());
  const typeCount = types.length;
  const clusterRadius = Math.max(400, nodes.length * 10);

  types.forEach((type, typeIdx) => {
    const group = typeGroups.get(type)!;
    group.sort((a, b) => (b._connections || 0) - (a._connections || 0));

    const angle = (2 * Math.PI * typeIdx) / typeCount - Math.PI / 2;
    const cx = Math.cos(angle) * clusterRadius;
    const cy = Math.sin(angle) * clusterRadius;

    const innerRadius = Math.max(120, group.length * 18);
    group.forEach((n, i) => {
      const a = (2 * Math.PI * i) / group.length;
      const r = i === 0 ? 0 : innerRadius * (0.3 + 0.7 * (i / group.length));
      positions.set(n.id, {
        x: cx + Math.cos(a) * r,
        y: cy + Math.sin(a) * r,
      });
    });
  });

  return positions;
}

/* ── Inner canvas (needs ReactFlowProvider above) ── */
function GraphCanvasInner({
  nodes: rawNodes,
  edges: rawEdges,
  selectedId,
  hoveredId,
  hiddenTypes,
  focusNodeId,
  pathNodes,
  pathEdges,
  onNodeClick,
  onNodeHover,
  onBackgroundClick,
  onNodeContextMenu,
  onNodeDoubleClick,
}: Props) {
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [initialized, setInitialized] = useState(false);
  const { fitView } = useReactFlow();

  // 2-hop neighborhood for focus mode
  const focusNeighborhood = useMemo(() => {
    if (focusNodeId == null) return null;
    const hop1 = new Set<number>();
    const hop2 = new Set<number>();
    hop1.add(focusNodeId);
    for (const e of rawEdges) {
      if (e.source === focusNodeId) hop1.add(e.target);
      if (e.target === focusNodeId) hop1.add(e.source);
    }
    for (const e of rawEdges) {
      if (hop1.has(e.source)) hop2.add(e.target);
      if (hop1.has(e.target)) hop2.add(e.source);
    }
    return new Set([...hop1, ...hop2]);
  }, [focusNodeId, rawEdges]);

  // Connected node sets for highlight/dim
  const connectedToActive = useMemo(() => {
    const set = new Set<number>();
    const activeId = selectedId ?? hoveredId;
    if (activeId == null) return set;
    for (const e of rawEdges) {
      if (e.source === activeId) set.add(e.target);
      if (e.target === activeId) set.add(e.source);
    }
    set.add(activeId);
    return set;
  }, [rawEdges, selectedId, hoveredId]);

  const hasActive = selectedId != null || hoveredId != null;

  // Build React Flow nodes + edges
  useEffect(() => {
    let visible = rawNodes.filter((n) => !hiddenTypes.has(n.type));
    if (focusNeighborhood) {
      visible = visible.filter((n) => focusNeighborhood.has(n.id));
    }
    const visibleIds = new Set(visible.map((n) => n.id));
    const visEdges = rawEdges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target));

    const positions = layoutNodes(visible, visEdges);

    const flowNodes: Node[] = visible.map((n) => {
      const pos = positions.get(n.id) || { x: 0, y: 0 };
      const conns = n._connections || 0;
      const isSelected = n.id === selectedId;
      const isDimmed = hasActive && !connectedToActive.has(n.id);
      const isPathNode = pathNodes?.has(n.id) || false;

      return {
        id: String(n.id),
        position: pos,
        type: "entity",
        data: {
          label: n.name,
          type: n.type,
          connections: conns,
          nodeId: n.id,
          isSelected,
          isDimmed: pathNodes ? !isPathNode : isDimmed,
          isPathNode,
        } satisfies EntityNodeData,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });

    const flowEdges: Edge[] = visEdges.map((e) => {
      const baseColor = EDGE_COLORS[e.type] || "#64748b";
      const isHighlighted =
        e.source === selectedId || e.target === selectedId ||
        e.source === hoveredId || e.target === hoveredId;
      const isPathEdge = pathEdges?.has(e.id) || false;
      const isDimmed = pathNodes
        ? !isPathEdge
        : hasActive && !isHighlighted;
      const relLabel = RELATIONSHIP_LABELS[e.type];
      const label = relLabel ? relLabel.out : e.type.replace(/_/g, " ");

      return {
        id: `e-${e.id}`,
        source: String(e.source),
        target: String(e.target),
        type: "default",
        label: (isHighlighted || isPathEdge) ? `${label} (${weightLabel(e.weight)})` : undefined,
        animated: (isHighlighted || isPathEdge) && e.weight >= 0.7,
        style: {
          stroke: isPathEdge
            ? `${baseColor}ee`
            : isDimmed
            ? `${baseColor}10`
            : isHighlighted
            ? `${baseColor}cc`
            : `${baseColor}35`,
          strokeWidth: isPathEdge ? 3 : isDimmed ? 0.5 : e.weight * 2 + 0.5,
          transition: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)",
        },
        labelStyle: {
          fill: isDimmed ? "transparent" : "#9e9e9e",
          fontSize: 9,
          fontFamily: '"IBM Plex Mono", monospace',
          fontWeight: 500,
        },
        labelBgStyle: {
          fill: "#0a0a0a",
          fillOpacity: isHighlighted || isPathEdge ? 0.9 : 0,
        },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 3,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 12,
          height: 12,
          color: isPathEdge
            ? `${baseColor}ee`
            : isDimmed
            ? `${baseColor}10`
            : isHighlighted
            ? `${baseColor}cc`
            : `${baseColor}35`,
        },
      };
    });

    // Preserve positions if already initialized
    if (initialized && !focusNeighborhood) {
      setRfNodes((prev) => {
        const posMap = new Map(prev.map((n) => [n.id, n.position]));
        return flowNodes.map((n) => ({
          ...n,
          position: posMap.get(n.id) || n.position,
        }));
      });
    } else {
      setRfNodes(flowNodes);
      if (flowNodes.length > 0) {
        setInitialized(true);
        // Fit view after focus mode layout
        if (focusNeighborhood) {
          setTimeout(() => fitView({ padding: 0.4, duration: 500 }), 50);
        }
      }
    }
    setRfEdges(flowEdges);
  }, [rawNodes, rawEdges, hiddenTypes, selectedId, hoveredId, hasActive, connectedToActive, focusNeighborhood, pathNodes, pathEdges]);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      onNodeClick(Number(node.id));
    },
    [onNodeClick]
  );

  const handleNodeDoubleClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      onNodeDoubleClick(Number(node.id));
    },
    [onNodeDoubleClick]
  );

  const handleNodeMouseEnter: NodeMouseHandler = useCallback(
    (_event, node) => {
      onNodeHover(Number(node.id));
    },
    [onNodeHover]
  );

  const handleNodeMouseLeave: NodeMouseHandler = useCallback(
    () => {
      onNodeHover(null);
    },
    [onNodeHover]
  );

  const handleContextMenu: NodeMouseHandler = useCallback(
    (event, node) => {
      event.preventDefault();
      onNodeContextMenu(event as unknown as React.MouseEvent, Number(node.id));
    },
    [onNodeContextMenu]
  );

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      onNodeDoubleClick={handleNodeDoubleClick}
      onNodeMouseEnter={handleNodeMouseEnter}
      onNodeMouseLeave={handleNodeMouseLeave}
      onNodeContextMenu={handleContextMenu}
      onPaneClick={onBackgroundClick}
      fitView
      fitViewOptions={{ padding: 0.3, maxZoom: 1.5 }}
      minZoom={0.05}
      maxZoom={4}
      nodesDraggable
      proOptions={{ hideAttribution: true }}
      defaultEdgeOptions={{ type: "default" }}
    >
      <Background color="#1a1a1a" gap={50} size={1} />
      <Controls
        showInteractive={false}
        className="graph-controls"
        position="bottom-right"
      />
      <MiniMap
        nodeColor={(node) => {
          const type = (node.data as { type?: string })?.type || "";
          return NODE_COLORS[type] || "#64748b";
        }}
        maskColor="rgba(0,0,0,0.75)"
        style={{
          background: "#050505",
          border: "1px solid #1f1f1f",
          borderRadius: 6,
        }}
        position="bottom-left"
      />
      {/* Legend */}
      <Panel position="top-right">
        <div className="bg-navy-900/90 border border-navy-700/40 rounded-lg p-2.5 backdrop-blur-sm">
          <div className="text-[8px] font-mono text-navy-600 uppercase tracking-widest mb-2">Relationships</div>
          <div className="space-y-1">
            {Object.entries(EDGE_COLORS).map(([type, color]) => {
              const label = RELATIONSHIP_LABELS[type];
              return (
                <div key={type} className="flex items-center gap-1.5">
                  <div className="w-4 h-[1.5px] rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[8px] font-mono text-navy-500">{label ? label.out : type}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>
      {/* Keyboard hints */}
      <Panel position="bottom-left" className="!left-[180px]">
        <div className="flex items-center gap-2 text-[8px] font-mono text-navy-600">
          <span className="border border-navy-800/40 rounded px-1 py-0.5">Double-click</span>
          <span>Focus</span>
          <span className="border border-navy-800/40 rounded px-1 py-0.5">Right-click</span>
          <span>Actions</span>
          <span className="border border-navy-800/40 rounded px-1 py-0.5">Esc</span>
          <span>Reset</span>
        </div>
      </Panel>
    </ReactFlow>
  );
}

/* ── Exported wrapper with ReactFlowProvider ── */
export function GraphCanvas(props: Props) {
  return (
    <div className="w-full h-full graph-flow-container">
      <ReactFlowProvider>
        <GraphCanvasInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}
