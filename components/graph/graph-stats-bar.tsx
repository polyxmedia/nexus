"use client";

import { useMemo } from "react";
import { Activity, GitBranch, Waypoints, Target, Zap, Focus } from "lucide-react";
import { NODE_COLORS } from "@/lib/graph/constants";

interface StatsBarProps {
  nodes: Array<{ id: number; type: string; name: string; _connections?: number }>;
  edges: Array<{ source: number; target: number; weight: number; type: string }>;
  focusMode: boolean;
  pathMode: boolean;
  onExitFocus: () => void;
  onExitPath: () => void;
}

interface NetworkMetrics {
  density: number;
  avgDegree: number;
  maxDegree: number;
  hubNode: string | null;
  clusters: number;
  strongEdges: number;
  totalWeight: number;
}

function computeMetrics(
  nodes: StatsBarProps["nodes"],
  edges: StatsBarProps["edges"]
): NetworkMetrics {
  const n = nodes.length;
  const e = edges.length;

  if (n === 0) {
    return { density: 0, avgDegree: 0, maxDegree: 0, hubNode: null, clusters: 0, strongEdges: 0, totalWeight: 0 };
  }

  // Density: actual edges / possible edges (undirected)
  const maxEdges = (n * (n - 1)) / 2;
  const density = maxEdges > 0 ? e / maxEdges : 0;

  // Degree distribution
  const degrees = new Map<number, number>();
  for (const node of nodes) degrees.set(node.id, 0);
  for (const edge of edges) {
    degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
    degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
  }

  const degreeValues = [...degrees.values()];
  const avgDegree = degreeValues.reduce((a, b) => a + b, 0) / n;
  const maxDegree = Math.max(...degreeValues, 0);

  // Hub: node with max degree
  let hubNode: string | null = null;
  let hubDegree = 0;
  for (const node of nodes) {
    const deg = degrees.get(node.id) || 0;
    if (deg > hubDegree) {
      hubDegree = deg;
      hubNode = node.name;
    }
  }

  // Connected components (clusters) via BFS
  const visited = new Set<number>();
  const adj = new Map<number, number[]>();
  for (const node of nodes) adj.set(node.id, []);
  for (const edge of edges) {
    adj.get(edge.source)?.push(edge.target);
    adj.get(edge.target)?.push(edge.source);
  }

  let clusters = 0;
  for (const node of nodes) {
    if (visited.has(node.id)) continue;
    clusters++;
    const queue = [node.id];
    while (queue.length > 0) {
      const current = queue.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const neighbor of adj.get(current) || []) {
        if (!visited.has(neighbor)) queue.push(neighbor);
      }
    }
  }

  // Strong edges (weight >= 0.7)
  const strongEdges = edges.filter((e) => e.weight >= 0.7).length;
  const totalWeight = edges.reduce((sum, e) => sum + e.weight, 0);

  return { density, avgDegree, maxDegree, hubNode, clusters, strongEdges, totalWeight };
}

export function GraphStatsBar({ nodes, edges, focusMode, pathMode, onExitFocus, onExitPath }: StatsBarProps) {
  const metrics = useMemo(() => computeMetrics(nodes, edges), [nodes, edges]);

  return (
    <div className="flex items-center gap-1 px-3 h-8 border-b border-navy-800/30 bg-navy-950/80 backdrop-blur-sm shrink-0 overflow-x-auto">
      {/* Mode indicators */}
      {focusMode && (
        <button
          onClick={onExitFocus}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-accent-cyan/10 border border-accent-cyan/30 text-[9px] font-mono text-accent-cyan uppercase tracking-wider hover:bg-accent-cyan/20 transition-colors mr-2"
        >
          <Focus className="w-2.5 h-2.5" />
          Focus Mode
          <span className="text-accent-cyan/60 ml-1">ESC to exit</span>
        </button>
      )}
      {pathMode && (
        <button
          onClick={onExitPath}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-accent-amber/10 border border-accent-amber/30 text-[9px] font-mono text-accent-amber uppercase tracking-wider hover:bg-accent-amber/20 transition-colors mr-2"
        >
          <Waypoints className="w-2.5 h-2.5" />
          Path Finder
          <span className="text-accent-amber/60 ml-1">ESC to exit</span>
        </button>
      )}

      {/* Metrics */}
      <div className="flex items-center gap-3 text-[9px] font-mono text-navy-500">
        <div className="flex items-center gap-1" title="Network density">
          <Activity className="w-2.5 h-2.5 text-navy-600" />
          <span className="text-navy-400">{(metrics.density * 100).toFixed(1)}%</span>
          <span className="text-navy-600">density</span>
        </div>

        <div className="w-px h-3 bg-navy-800/60" />

        <div className="flex items-center gap-1" title="Average connections per node">
          <GitBranch className="w-2.5 h-2.5 text-navy-600" />
          <span className="text-navy-400">{metrics.avgDegree.toFixed(1)}</span>
          <span className="text-navy-600">avg degree</span>
        </div>

        <div className="w-px h-3 bg-navy-800/60" />

        <div className="flex items-center gap-1" title="Connected clusters">
          <Waypoints className="w-2.5 h-2.5 text-navy-600" />
          <span className="text-navy-400">{metrics.clusters}</span>
          <span className="text-navy-600">cluster{metrics.clusters !== 1 ? "s" : ""}</span>
        </div>

        <div className="w-px h-3 bg-navy-800/60" />

        <div className="flex items-center gap-1" title="Strong connections (weight >= 0.7)">
          <Zap className="w-2.5 h-2.5 text-navy-600" />
          <span className="text-accent-emerald/80">{metrics.strongEdges}</span>
          <span className="text-navy-600">strong</span>
        </div>

        {metrics.hubNode && (
          <>
            <div className="w-px h-3 bg-navy-800/60" />
            <div className="flex items-center gap-1" title="Most connected entity">
              <Target className="w-2.5 h-2.5 text-navy-600" />
              <span className="text-navy-600">hub:</span>
              <span className="text-navy-400 truncate max-w-[100px]">{metrics.hubNode}</span>
              <span className="text-navy-600">({metrics.maxDegree})</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
