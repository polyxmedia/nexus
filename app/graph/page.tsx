"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Network,
  Search,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Loader2,
} from "lucide-react";

interface GraphNode {
  id: number;
  type: string;
  name: string;
  properties: Record<string, unknown>;
  sourceType: string | null;
  sourceId: string | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface GraphEdge {
  id: number;
  from: number;
  to: number;
  type: string;
  weight: number;
  properties: Record<string, unknown>;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const NODE_COLORS: Record<string, string> = {
  signal: "#f59e0b",
  prediction: "#8b5cf6",
  trade: "#10b981",
  thesis: "#06b6d4",
  ticker: "#ec4899",
  sector: "#f97316",
  event: "#ef4444",
  actor: "#6366f1",
  location: "#14b8a6",
};

function nodeRadius(type: string, connections: number): number {
  const base: Record<string, number> = {
    thesis: 12, signal: 10, event: 10, sector: 10,
    prediction: 9, ticker: 9, actor: 9, trade: 8, location: 8,
  };
  return (base[type] || 8) + Math.min(connections * 0.5, 6);
}

export default function GraphPage() {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const connCountRef = useRef<Map<number, number>>(new Map());
  const animRef = useRef<number>(0);
  const camRef = useRef({ x: 0, y: 0, scale: 1 });
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; node: GraphNode | null; moved: boolean }>({
    active: false, startX: 0, startY: 0, node: null, moved: false,
  });
  const selectedRef = useRef<GraphNode | null>(null);
  const hoveredRef = useRef<GraphNode | null>(null);
  const simRunning = useRef(false);

  const fetchGraph = useCallback(async (center?: number) => {
    setLoading(true);
    try {
      const url = center ? `/api/graph?center=${center}&depth=3` : "/api/graph";
      const res = await fetch(url);
      const json = await res.json();
      setData(json);
      initLayout(json.nodes, json.edges);
    } catch { /* fail silently */ }
    setLoading(false);
  }, []);

  const syncGraph = async () => {
    setSyncing(true);
    try {
      await fetch("/api/graph", { method: "POST" });
      await fetchGraph();
    } catch { /* fail silently */ }
    setSyncing(false);
  };

  const searchEntities = async () => {
    if (!search.trim()) { fetchGraph(); return; }
    setLoading(true);
    try {
      const type = filterType !== "all" ? `&type=${filterType}` : "";
      const res = await fetch(`/api/graph?action=search&q=${encodeURIComponent(search)}${type}`);
      const json = await res.json();
      if (json.results?.length > 0) fetchGraph(json.results[0].id);
    } catch { /* fail */ }
    setLoading(false);
  };

  function initLayout(nodes: GraphNode[], edges: GraphEdge[]) {
    // Build connection counts
    const counts = new Map<number, number>();
    for (const e of edges) {
      counts.set(e.from, (counts.get(e.from) || 0) + 1);
      counts.set(e.to, (counts.get(e.to) || 0) + 1);
    }
    connCountRef.current = counts;

    // Place nodes in a large circle to start, spread them wide
    const n = nodes.length || 1;
    const radius = Math.max(300, n * 15);
    const positioned: GraphNode[] = nodes.map((node, i) => {
      const angle = (2 * Math.PI * i) / n;
      return {
        ...node,
        x: Math.cos(angle) * radius + (Math.random() - 0.5) * 50,
        y: Math.sin(angle) * radius + (Math.random() - 0.5) * 50,
        vx: 0,
        vy: 0,
      };
    });

    nodesRef.current = positioned;
    edgesRef.current = edges;
    simRunning.current = true;
    runSimulation();
  }

  function runSimulation() {
    let iteration = 0;
    const maxIterations = 400;

    function step() {
      if (!simRunning.current) return;
      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      if (nodes.length === 0) return;

      iteration++;
      const alpha = Math.max(0.001, 1 - iteration / maxIterations);
      const nodeMap = new Map(nodes.map(n => [n.id, n]));

      // Repulsion (all pairs, Barnes-Hut would be better for large graphs)
      const repulsion = 1200;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (repulsion * alpha) / dist;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx -= fx; a.vy -= fy;
          b.vx += fx; b.vy += fy;
        }
      }

      // Attraction along edges
      const idealDist = 200;
      for (const edge of edges) {
        const a = nodeMap.get(edge.from);
        const b = nodeMap.get(edge.to);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - idealDist) * 0.005 * alpha;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      }

      // Very gentle center gravity
      for (const node of nodes) {
        node.vx -= node.x * 0.0001 * alpha;
        node.vy -= node.y * 0.0001 * alpha;
      }

      // Apply velocity with damping, no bounds
      for (const node of nodes) {
        if (dragRef.current.node?.id === node.id) continue;
        node.vx *= 0.82;
        node.vy *= 0.82;
        node.x += node.vx;
        node.y += node.vy;
      }

      draw();

      if (iteration < maxIterations) {
        animRef.current = requestAnimationFrame(step);
      } else {
        simRunning.current = false;
        // Fit to view after simulation settles
        fitToView();
      }
    }

    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(step);
  }

  function fitToView() {
    const nodes = nodesRef.current;
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y);
    }

    const padding = 80;
    const graphW = maxX - minX + padding * 2;
    const graphH = maxY - minY + padding * 2;
    const cw = canvas.width;
    const ch = canvas.height;
    const scale = Math.min(cw / graphW, ch / graphH, 2);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    camRef.current = {
      x: cw / 2 - cx * scale,
      y: ch / 2 - cy * scale,
      scale,
    };
    draw();
  }

  function screenToWorld(sx: number, sy: number): { x: number; y: number } {
    const cam = camRef.current;
    return {
      x: (sx - cam.x) / cam.scale,
      y: (sy - cam.y) / cam.scale,
    };
  }

  function getNodeAt(sx: number, sy: number): GraphNode | null {
    const { x, y } = screenToWorld(sx, sy);
    const counts = connCountRef.current;
    // Check in reverse so top-rendered nodes are picked first
    for (let i = nodesRef.current.length - 1; i >= 0; i--) {
      const node = nodesRef.current[i];
      const r = nodeRadius(node.type, counts.get(node.id) || 0) + 4;
      const dx = node.x - x;
      const dy = node.y - y;
      if (dx * dx + dy * dy < r * r) return node;
    }
    return null;
  }

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    const cam = camRef.current;
    const counts = connCountRef.current;
    const selected = selectedRef.current;
    const hovered = hoveredRef.current;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(cam.x, cam.y);
    ctx.scale(cam.scale, cam.scale);

    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    // Build set of connected node IDs for selected node
    const connectedToSelected = new Set<number>();
    const selectedEdges = new Set<number>();
    if (selected) {
      connectedToSelected.add(selected.id);
      for (const e of edges) {
        if (e.from === selected.id || e.to === selected.id) {
          connectedToSelected.add(e.from);
          connectedToSelected.add(e.to);
          selectedEdges.add(e.id);
        }
      }
    }

    const dimming = !!selected;

    // Draw edges
    for (const edge of edges) {
      const a = nodeMap.get(edge.from);
      const b = nodeMap.get(edge.to);
      if (!a || !b) continue;

      const isHighlighted = selectedEdges.has(edge.id);
      const isHoveredEdge = hovered && (edge.from === hovered.id || edge.to === hovered.id);
      const opacity = dimming
        ? (isHighlighted ? 0.7 : 0.04)
        : (isHoveredEdge ? 0.5 : 0.15 + (edge.weight || 0.5) * 0.15);

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = isHighlighted
        ? `rgba(6, 182, 212, ${opacity})`
        : `rgba(148, 163, 184, ${opacity})`;
      ctx.lineWidth = isHighlighted ? 1.5 : 0.8 + (edge.weight || 0.5) * 0.5;
      ctx.stroke();

      // Edge label (only when zoomed in enough)
      if (cam.scale > 0.5 && (isHighlighted || (!dimming && cam.scale > 0.8))) {
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const labelOpacity = isHighlighted ? 0.8 : 0.35;
        ctx.fillStyle = `rgba(148, 163, 184, ${labelOpacity})`;
        ctx.font = `${8 / Math.max(cam.scale, 0.5)}px 'IBM Plex Mono'`;
        ctx.textAlign = "center";
        ctx.fillText(edge.type, mx, my - 4);
      }
    }

    // Draw nodes
    for (const node of nodes) {
      const conn = counts.get(node.id) || 0;
      const r = nodeRadius(node.type, conn);
      const color = NODE_COLORS[node.type] || "#64748b";
      const isSelected = selected?.id === node.id;
      const isHovered = hovered?.id === node.id;
      const isConnected = connectedToSelected.has(node.id);
      const dimNode = dimming && !isConnected;

      // Glow for selected/hovered
      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 8, 0, Math.PI * 2);
        ctx.fillStyle = `${color}22`;
        ctx.fill();
      }

      // Node
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle = dimNode ? `${color}20` : (isSelected ? color : `${color}cc`);
      ctx.fill();
      ctx.strokeStyle = isSelected ? "#ffffff" : (dimNode ? `${color}15` : `${color}55`);
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      // Labels (always show at reasonable zoom, dim when not connected)
      if (cam.scale > 0.3) {
        const fontSize = Math.max(9, Math.min(12, 11 / cam.scale));
        const labelAlpha = dimNode ? 0.15 : (isSelected || isHovered ? 1 : 0.7);

        ctx.fillStyle = `rgba(212, 212, 212, ${labelAlpha})`;
        ctx.font = `500 ${fontSize}px 'IBM Plex Mono'`;
        ctx.textAlign = "center";
        const label = node.name.length > 24 ? node.name.slice(0, 22) + ".." : node.name;
        ctx.fillText(label, node.x, node.y + r + fontSize + 2);

        // Type badge (only when zoomed in more)
        if (cam.scale > 0.6) {
          ctx.fillStyle = `rgba(${dimNode ? "100,100,100" : "148,163,184"}, ${dimNode ? 0.1 : 0.4})`;
          ctx.font = `${Math.max(7, 8 / cam.scale)}px 'IBM Plex Mono'`;
          ctx.fillText(node.type, node.x, node.y + r + fontSize + 14);
        }
      }
    }

    ctx.restore();
  }

  // Canvas resize
  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
      // Adjust cam for DPR
      canvas.width = rect.width;
      canvas.height = rect.height;
      draw();
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Mouse interactions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function onMouseDown(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const node = getNodeAt(sx, sy);

      dragRef.current = { active: true, startX: sx, startY: sy, node, moved: false };
    }

    function onMouseMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      if (dragRef.current.active) {
        const dx = sx - dragRef.current.startX;
        const dy = sy - dragRef.current.startY;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragRef.current.moved = true;

        if (dragRef.current.node) {
          const cam = camRef.current;
          dragRef.current.node.x += dx / cam.scale;
          dragRef.current.node.y += dy / cam.scale;
          dragRef.current.node.vx = 0;
          dragRef.current.node.vy = 0;
        } else {
          camRef.current.x += dx;
          camRef.current.y += dy;
        }

        dragRef.current.startX = sx;
        dragRef.current.startY = sy;
        draw();
      } else {
        // Hover detection
        const node = getNodeAt(sx, sy);
        if (node !== hoveredRef.current) {
          hoveredRef.current = node;
          canvas!.style.cursor = node ? "pointer" : "grab";
          draw();
        }
      }
    }

    function onMouseUp() {
      if (dragRef.current.active && !dragRef.current.moved) {
        // Click (not drag)
        const node = dragRef.current.node;
        if (node) {
          selectedRef.current = selectedRef.current?.id === node.id ? null : node;
          setSelectedNode(selectedRef.current);
        } else {
          selectedRef.current = null;
          setSelectedNode(null);
        }
        draw();
      }
      dragRef.current = { active: false, startX: 0, startY: 0, node: null, moved: false };
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = canvas!.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      const cam = camRef.current;
      const factor = e.deltaY > 0 ? 0.88 : 1.12;
      const newScale = Math.max(0.02, Math.min(10, cam.scale * factor));

      // Zoom toward cursor position
      cam.x = sx - (sx - cam.x) * (newScale / cam.scale);
      cam.y = sy - (sy - cam.y) * (newScale / cam.scale);
      cam.scale = newScale;
      draw();
    }

    function onDblClick(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      const node = getNodeAt(e.clientX - rect.left, e.clientY - rect.top);
      if (node) {
        selectedRef.current = node;
        setSelectedNode(node);
        fetchGraph(node.id);
      }
    }

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mouseleave", onMouseUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("dblclick", onDblClick);

    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("mouseleave", onMouseUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("dblclick", onDblClick);
    };
  }, [fetchGraph]);

  useEffect(() => { fetchGraph(); }, [fetchGraph]);

  const entityTypes = data ? [...new Set(data.nodes.map(n => n.type))] : [];

  return (
    <div className="ml-48 h-screen flex flex-col bg-navy-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-navy-700 px-6 h-14 shrink-0">
        <div className="flex items-center gap-3">
          <Network className="h-4 w-4 text-accent-cyan" />
          <div>
            <h1 className="text-sm font-bold text-navy-100 tracking-wide">Entity Graph</h1>
            <p className="text-[10px] text-navy-500 uppercase tracking-wider">
              {data ? `${data.nodes.length} entities, ${data.edges.length} connections` : "Loading..."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-navy-900 border border-navy-700 rounded px-2 py-1">
            <Search className="h-3 w-3 text-navy-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && await searchEntities()}
              placeholder="Search..."
              className="bg-transparent text-xs text-navy-200 outline-none w-32 placeholder:text-navy-600"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-navy-900 border border-navy-700 rounded px-2 py-1 text-xs text-navy-300 outline-none"
          >
            <option value="all">All</option>
            {entityTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <div className="flex items-center border border-navy-700 rounded overflow-hidden">
            <button
              onClick={() => {
                const cam = camRef.current;
                const canvas = canvasRef.current;
                if (!canvas) return;
                const cx = canvas.width / 2, cy = canvas.height / 2;
                const factor = 1.3;
                cam.x = cx - (cx - cam.x) * factor;
                cam.y = cy - (cy - cam.y) * factor;
                cam.scale *= factor;
                draw();
              }}
              className="p-1.5 bg-navy-900 text-navy-400 hover:text-navy-200 transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => {
                const cam = camRef.current;
                const canvas = canvasRef.current;
                if (!canvas) return;
                const cx = canvas.width / 2, cy = canvas.height / 2;
                const factor = 0.7;
                cam.x = cx - (cx - cam.x) * factor;
                cam.y = cy - (cy - cam.y) * factor;
                cam.scale *= factor;
                draw();
              }}
              className="p-1.5 bg-navy-900 text-navy-400 hover:text-navy-200 transition-colors border-l border-navy-700"
              title="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={fitToView}
              className="p-1.5 bg-navy-900 text-navy-400 hover:text-navy-200 transition-colors border-l border-navy-700"
              title="Fit to view"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            onClick={syncGraph}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-navy-800 border border-navy-600 text-xs text-navy-200 hover:bg-navy-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
            Sync
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-navy-950/80">
            <div className="flex items-center gap-2 text-navy-400 text-xs">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading graph...
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="block w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-navy-950/90 backdrop-blur-sm border border-navy-800/40 rounded px-3 py-2.5">
          <div className="grid grid-cols-3 gap-x-5 gap-y-1">
            {Object.entries(NODE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[10px] text-navy-400 capitalize">{type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hint */}
        <div className="absolute bottom-4 right-4 text-[10px] text-navy-600 font-mono">
          Scroll to zoom / Drag to pan / Click to select / Double-click to focus
        </div>

        {/* Selected node detail */}
        {selectedNode && (
          <div className="absolute top-4 right-4 w-72 bg-navy-950/95 backdrop-blur-md border border-navy-800/40 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS[selectedNode.type] || "#64748b" }} />
                <span className="text-[10px] text-navy-500 uppercase tracking-wider">{selectedNode.type}</span>
              </div>
              <button
                onClick={() => { selectedRef.current = null; setSelectedNode(null); draw(); }}
                className="text-navy-500 hover:text-navy-300 text-xs"
              >
                x
              </button>
            </div>
            <h3 className="text-sm font-semibold text-navy-100 mb-2">{selectedNode.name}</h3>
            <div className="text-[10px] text-navy-500 mb-2">
              {connCountRef.current.get(selectedNode.id) || 0} connections
              {selectedNode.sourceType && <> / Source: {selectedNode.sourceType} #{selectedNode.sourceId}</>}
            </div>
            {Object.keys(selectedNode.properties).length > 0 && (
              <div className="space-y-1 border-t border-navy-700/20 pt-2 max-h-40 overflow-y-auto">
                {Object.entries(selectedNode.properties).map(([key, val]) => (
                  <div key={key} className="flex justify-between text-[10px]">
                    <span className="text-navy-500">{key}</span>
                    <span className="text-navy-300 font-mono truncate ml-2 max-w-[140px]">{String(val)}</span>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => fetchGraph(selectedNode.id)}
              className="mt-3 w-full text-[10px] py-1.5 rounded bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 hover:bg-accent-cyan/20 transition-colors"
            >
              Focus on this entity
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
