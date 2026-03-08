"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { Network, RefreshCw, Loader2 } from "lucide-react";
import { EntityDetailPanel } from "@/components/graph/entity-detail-panel";
import { EntityListPanel } from "@/components/graph/entity-list-panel";
import { GraphEmptyState, GraphTipBanner } from "@/components/graph/graph-empty-state";
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

export default function GraphPage() {
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
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const canvasContainerRef = useRef<HTMLDivElement>(null);

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
      // Show tip after first sync
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

  // Measure canvas container
  useEffect(() => {
    const measure = () => {
      if (canvasContainerRef.current) {
        const rect = canvasContainerRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [selectedId]);

  // Connection counts
  const connectionCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const edge of rawEdges) {
      counts.set(edge.from, (counts.get(edge.from) || 0) + 1);
      counts.set(edge.to, (counts.get(edge.to) || 0) + 1);
    }
    return counts;
  }, [rawEdges]);

  // Convert to graph canvas format (source/target instead of from/to)
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

  // Type counts for header chips
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

  // Navigation handler (updates breadcrumbs)
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
    [selectedId, rawNodes]
  );

  const deselectNode = useCallback(() => {
    setSelectedId(null);
    setBreadcrumbs([]);
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

  const hasData = rawNodes.length > 0;

  return (
    <div className="ml-48 h-screen flex flex-col bg-navy-950">
      <UpgradeGate minTier="operator" feature="Entity relationship graph">
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
            <div ref={canvasContainerRef} className="flex-1 relative min-w-0">
              {showTip && <GraphTipBanner onDismiss={dismissTip} />}
              <GraphCanvas
                nodes={graphNodes}
                edges={graphEdges}
                selectedId={selectedId}
                hoveredId={hoveredId}
                hiddenTypes={hiddenTypes}
                onNodeClick={selectNode}
                onNodeHover={setHoveredId}
                onBackgroundClick={deselectNode}
                width={canvasSize.width}
                height={canvasSize.height}
              />
            </div>

            {/* Detail panel (slides in when selected) */}
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
