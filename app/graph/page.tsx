"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Network, RefreshCw, Loader2 } from "lucide-react";
import { EntityDetailPanel } from "@/components/graph/entity-detail-panel";
import { EntityListPanel } from "@/components/graph/entity-list-panel";
import { GraphEmptyState, GraphTipBanner } from "@/components/graph/graph-empty-state";
import { GraphStatsBar } from "@/components/graph/graph-stats-bar";
import { GraphContextMenu } from "@/components/graph/context-menu";
import { NODE_COLORS, NODE_TYPE_LABELS } from "@/lib/graph/constants";
import { UpgradeGate } from "@/components/subscription/upgrade-gate";
import type { GraphNodeData, GraphEdgeData } from "@/components/graph/graph-canvas";

const GraphCanvas = dynamic(
  () => import("@/components/graph/graph-canvas").then((m) => m.GraphCanvas),
  { ssr: false }
);

interface RawNode {
  id: number;
  type: string;
  name: string;
  properties: Record<string, unknown>;
  sourceType: string | null;
  sourceId: string | null;
}

interface RawEdge {
  id: number;
  from: number;
  to: number;
  type: string;
  weight: number;
  properties: Record<string, unknown>;
}

// BFS shortest path finder
function findShortestPath(
  fromId: number,
  toId: number,
  edges: RawEdge[]
): { nodeIds: Set<number>; edgeIds: Set<number> } | null {
  const adj = new Map<number, Array<{ nodeId: number; edgeId: number }>>();
  for (const e of edges) {
    if (!adj.has(e.from)) adj.set(e.from, []);
    if (!adj.has(e.to)) adj.set(e.to, []);
    adj.get(e.from)!.push({ nodeId: e.to, edgeId: e.id });
    adj.get(e.to)!.push({ nodeId: e.from, edgeId: e.id });
  }

  const visited = new Set<number>();
  const parent = new Map<number, { nodeId: number; edgeId: number }>();
  const queue = [fromId];
  visited.add(fromId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === toId) {
      // Reconstruct path
      const nodeIds = new Set<number>();
      const edgeIds = new Set<number>();
      let c = toId;
      nodeIds.add(c);
      while (c !== fromId) {
        const p = parent.get(c)!;
        edgeIds.add(p.edgeId);
        nodeIds.add(p.nodeId);
        c = p.nodeId;
      }
      return { nodeIds, edgeIds };
    }
    for (const neighbor of adj.get(current) || []) {
      if (!visited.has(neighbor.nodeId)) {
        visited.add(neighbor.nodeId);
        parent.set(neighbor.nodeId, { nodeId: current, edgeId: neighbor.edgeId });
        queue.push(neighbor.nodeId);
      }
    }
  }
  return null;
}

export default function GraphPage() {
  const router = useRouter();
  const [rawNodes, setRawNodes] = useState<RawNode[]>([]);
  const [rawEdges, setRawEdges] = useState<RawEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  const [breadcrumbs, setBreadcrumbs] = useState<RawNode[]>([]);
  const [showTip, setShowTip] = useState(false);

  // Focus mode (double-click shows 2-hop neighborhood)
  const [focusNodeId, setFocusNodeId] = useState<number | null>(null);

  // Path finder
  const [pathSource, setPathSource] = useState<number | null>(null);
  const [pathTarget, setPathTarget] = useState<number | null>(null);

  // Context menu
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: number;
  } | null>(null);

  // Compute path
  const pathResult = useMemo(() => {
    if (pathSource == null || pathTarget == null) return null;
    return findShortestPath(pathSource, pathTarget, rawEdges);
  }, [pathSource, pathTarget, rawEdges]);

  // Fetch graph data
  const fetchGraph = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/graph");
      const json = await res.json();
      setRawNodes(json.nodes || []);
      setRawEdges(json.edges || []);
    } catch {
      // fail silently
    }
    setLoading(false);
  }, []);

  const syncGraph = async () => {
    setSyncing(true);
    try {
      await fetch("/api/graph", { method: "POST" });
      await fetchGraph();
      if (!localStorage.getItem("nexus-graph-tip-dismissed")) {
        setShowTip(true);
      }
    } catch {
      // fail silently
    }
    setSyncing(false);
  };

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (contextMenu) {
          setContextMenu(null);
        } else if (focusNodeId) {
          setFocusNodeId(null);
        } else if (pathSource != null) {
          setPathSource(null);
          setPathTarget(null);
        } else if (selectedId) {
          setSelectedId(null);
          setBreadcrumbs([]);
        }
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        // Focus the search input
        const input = document.querySelector<HTMLInputElement>("[data-graph-search]");
        input?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [contextMenu, focusNodeId, pathSource, selectedId]);

  // Connection counts
  const connectionCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const edge of rawEdges) {
      counts.set(edge.from, (counts.get(edge.from) || 0) + 1);
      counts.set(edge.to, (counts.get(edge.to) || 0) + 1);
    }
    return counts;
  }, [rawEdges]);

  // Convert to graph canvas format
  const graphNodes: GraphNodeData[] = useMemo(
    () =>
      rawNodes.map((n) => ({
        ...n,
        _connections: connectionCounts.get(n.id) || 0,
      })),
    [rawNodes, connectionCounts]
  );

  const graphEdges: GraphEdgeData[] = useMemo(
    () =>
      rawEdges.map((e) => ({
        id: e.id,
        source: e.from,
        target: e.to,
        type: e.type,
        weight: e.weight,
        properties: e.properties,
      })),
    [rawEdges]
  );

  // Filtered + sorted nodes for the list panel
  const filteredListNodes = useMemo(() => {
    return rawNodes
      .filter((n) => {
        if (filterType !== "all" && n.type !== filterType) return false;
        if (search && !n.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => (connectionCounts.get(b.id) || 0) - (connectionCounts.get(a.id) || 0));
  }, [rawNodes, filterType, search, connectionCounts]);

  // Entity types present
  const entityTypes = useMemo(
    () => [...new Set(rawNodes.map((n) => n.type))].sort(),
    [rawNodes]
  );

  // Type counts
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of rawNodes) {
      counts[n.type] = (counts[n.type] || 0) + 1;
    }
    return counts;
  }, [rawNodes]);

  // Selected node detail
  const selectedNode = useMemo(
    () => rawNodes.find((n) => n.id === selectedId) || null,
    [rawNodes, selectedId]
  );

  // Connections for selected node
  const selectedConnections = useMemo(() => {
    if (!selectedNode) return [];
    const nodeMap = new Map(rawNodes.map((n) => [n.id, n]));
    const result: Array<{
      edge: { id: number; source: number; target: number; type: string; weight: number; properties: Record<string, unknown> };
      node: RawNode;
      direction: "out" | "in";
    }> = [];
    for (const edge of rawEdges) {
      if (edge.from === selectedNode.id) {
        const node = nodeMap.get(edge.to);
        if (node) result.push({ edge: { ...edge, source: edge.from, target: edge.to }, node, direction: "out" });
      } else if (edge.to === selectedNode.id) {
        const node = nodeMap.get(edge.from);
        if (node) result.push({ edge: { ...edge, source: edge.from, target: edge.to }, node, direction: "in" });
      }
    }
    return result.sort((a, b) => b.edge.weight - a.edge.weight);
  }, [rawNodes, rawEdges, selectedNode]);

  // Navigation handler
  const navigateTo = useCallback(
    (id: number) => {
      const node = rawNodes.find((n) => n.id === id);
      if (!node) return;
      setSelectedId(id);
      setBreadcrumbs((prev) => {
        const idx = prev.findIndex((b) => b.id === id);
        if (idx >= 0) return prev.slice(0, idx + 1);
        return [...prev, node];
      });
    },
    [rawNodes]
  );

  const selectNode = useCallback(
    (id: number) => {
      // If in path finder mode, set the target
      if (pathSource != null && pathTarget == null && id !== pathSource) {
        setPathTarget(id);
        return;
      }

      if (selectedId === id) {
        setSelectedId(null);
        setBreadcrumbs([]);
      } else {
        const node = rawNodes.find((n) => n.id === id);
        if (node) {
          setSelectedId(id);
          setBreadcrumbs([node]);
        }
      }
    },
    [selectedId, rawNodes, pathSource, pathTarget]
  );

  const deselectNode = useCallback(() => {
    setSelectedId(null);
    setBreadcrumbs([]);
    setContextMenu(null);
  }, []);

  const toggleType = useCallback((type: string) => {
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const dismissTip = useCallback(() => {
    setShowTip(false);
    localStorage.setItem("nexus-graph-tip-dismissed", "1");
  }, []);

  // Double-click: focus mode
  const handleNodeDoubleClick = useCallback((id: number) => {
    setFocusNodeId((prev) => (prev === id ? null : id));
    setPathSource(null);
    setPathTarget(null);
  }, []);

  // Context menu handlers
  const handleNodeContextMenu = useCallback((e: React.MouseEvent, nodeId: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId });
  }, []);

  const handleChatAbout = useCallback(
    (name: string) => {
      router.push(`/chat/new?prompt=${encodeURIComponent(`Tell me about ${name} and its relationships in our intelligence graph`)}`);
    },
    [router]
  );

  const handleFocusNeighborhood = useCallback((id: number) => {
    setFocusNodeId(id);
    setPathSource(null);
    setPathTarget(null);
  }, []);

  const handleStartPathfinder = useCallback((id: number) => {
    setPathSource(id);
    setPathTarget(null);
    setFocusNodeId(null);
  }, []);

  const handleViewSource = useCallback(
    (sourceType: string, sourceId: string) => {
      const routeMap: Record<string, string> = {
        signals: "/signals",
        predictions: "/predictions",
        trades: "/trading",
        theses: "/thesis",
      };
      const route = routeMap[sourceType];
      if (route) router.push(`${route}/${sourceId}`);
    },
    [router]
  );

  const contextMenuNode = useMemo(
    () => (contextMenu ? rawNodes.find((n) => n.id === contextMenu.nodeId) : null),
    [contextMenu, rawNodes]
  );

  const hasData = rawNodes.length > 0;

  return (
    <div className="ml-0 md:ml-48 h-screen flex flex-col bg-navy-950 pt-12 md:pt-0">
      <UpgradeGate minTier="analyst" feature="Entity relationship graph">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-navy-800/40 px-4 h-12 shrink-0">
        <div className="flex items-center gap-3">
          <Network className="h-4 w-4 text-navy-400" />
          <h1 className="text-xs font-bold text-navy-100 uppercase tracking-widest">Entity Graph</h1>
          {hasData && (
            <span className="text-[10px] font-mono text-navy-500">
              {rawNodes.length} entities / {rawEdges.length} connections
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Path finder indicator */}
          {pathSource != null && pathTarget == null && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-accent-amber/10 border border-accent-amber/30 text-[9px] font-mono text-accent-amber uppercase tracking-wider animate-pulse">
              Select target node...
            </div>
          )}

          {/* Type filter chips */}
          {hasData && entityTypes.length > 0 && (
            <div className="flex items-center gap-1 mr-2">
              {entityTypes.map((type) => {
                const color = NODE_COLORS[type] || "#64748b";
                const isHidden = hiddenTypes.has(type);
                const count = typeCounts[type] || 0;
                return (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider transition-all ${
                      isHidden ? "opacity-30" : "opacity-100"
                    }`}
                    title={`${isHidden ? "Show" : "Hide"} ${NODE_TYPE_LABELS[type] || type}`}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-navy-400">{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          <button
            onClick={syncGraph}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-navy-900/50 border border-navy-800/40 text-[10px] font-mono uppercase tracking-wider text-navy-300 hover:text-navy-100 hover:bg-navy-800/50 transition-colors disabled:opacity-50"
          >
            {syncing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            Sync
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {hasData && !loading && (
        <GraphStatsBar
          nodes={graphNodes}
          edges={graphEdges}
          focusMode={focusNodeId != null}
          pathMode={pathSource != null}
          onExitFocus={() => setFocusNodeId(null)}
          onExitPath={() => { setPathSource(null); setPathTarget(null); }}
        />
      )}

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        {loading ? (
          <div className="flex-1 flex items-center justify-center gap-2 text-navy-600 text-xs">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading graph...
          </div>
        ) : !hasData ? (
          <GraphEmptyState syncing={syncing} onSync={syncGraph} />
        ) : (
          <>
            {/* Entity list */}
            <EntityListPanel
              nodes={filteredListNodes}
              connectionCounts={connectionCounts}
              selectedId={selectedId}
              search={search}
              filterType={filterType}
              entityTypes={entityTypes}
              onSearchChange={setSearch}
              onFilterChange={setFilterType}
              onSelect={selectNode}
            />

            {/* Graph canvas */}
            <div className="flex-1 relative min-w-0 min-h-0">
              {showTip && <GraphTipBanner onDismiss={dismissTip} />}
              <GraphCanvas
                nodes={graphNodes}
                edges={graphEdges}
                selectedId={selectedId}
                hoveredId={hoveredId}
                hiddenTypes={hiddenTypes}
                focusNodeId={focusNodeId}
                pathNodes={pathResult?.nodeIds || null}
                pathEdges={pathResult?.edgeIds || null}
                onNodeClick={selectNode}
                onNodeHover={setHoveredId}
                onBackgroundClick={deselectNode}
                onNodeContextMenu={handleNodeContextMenu}
                onNodeDoubleClick={handleNodeDoubleClick}
                width={0}
                height={0}
              />

              {/* Context menu */}
              {contextMenu && contextMenuNode && (
                <GraphContextMenu
                  x={contextMenu.x}
                  y={contextMenu.y}
                  nodeId={contextMenu.nodeId}
                  nodeName={contextMenuNode.name}
                  nodeType={contextMenuNode.type}
                  sourceType={contextMenuNode.sourceType}
                  sourceId={contextMenuNode.sourceId}
                  onClose={() => setContextMenu(null)}
                  onChatAbout={handleChatAbout}
                  onFocusNeighborhood={handleFocusNeighborhood}
                  onStartPathfinder={handleStartPathfinder}
                  onViewSource={handleViewSource}
                />
              )}
            </div>

            {/* Detail panel */}
            {selectedNode && (
              <EntityDetailPanel
                node={selectedNode}
                connections={selectedConnections}
                breadcrumbs={breadcrumbs}
                onClose={deselectNode}
                onNavigate={navigateTo}
              />
            )}
          </>
        )}
      </div>
      </UpgradeGate>
    </div>
  );
}
