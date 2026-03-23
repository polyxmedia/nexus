"use client";

import { useMemo, useCallback, useState, useEffect, useRef } from "react";
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
  type NodeChange,
  Position,
  Panel,
  ReactFlowProvider,
  Handle,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  Crosshair,
  BarChart3,
  Shuffle,
  Waves,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { memo } from "react";

/* ── Types ── */

interface AgentResult {
  personaId: string;
  personaName: string;
  role: string;
  stance: string;
  confidence: number;
  reasoning: string;
  keyFactors: string[];
  dissent: string | null;
}

interface Props {
  agents: AgentResult[];
  convergenceScore: number | null;
  dominantStance: string | null;
  onAgentClick?: (personaId: string) => void;
}

/* ── Stance config ── */

const STANCE_COLORS: Record<string, string> = {
  strongly_bullish: "#10b981",
  bullish: "#34d399",
  neutral: "#6b7280",
  bearish: "#fb7185",
  strongly_bearish: "#f43f5e",
};

const STANCE_VALUES: Record<string, number> = {
  strongly_bullish: 2,
  bullish: 1,
  neutral: 0,
  bearish: -1,
  strongly_bearish: -2,
};

const PERSONA_ICONS: Record<string, React.ComponentType<{ className?: string; size?: number; color?: string }>> = {
  "macro-bull": TrendingUp,
  "geopolitical-hawk": Crosshair,
  "quant-neutral": BarChart3,
  "contrarian-bear": Shuffle,
  "flow-trader": Waves,
  "risk-manager": Shield,
  "retail-degen": Zap,
};

/* ── Agent Node ── */

interface AgentNodeData {
  label: string;
  role: string;
  stance: string;
  confidence: number;
  personaId: string;
  isSelected: boolean;
  isDimmed: boolean;
  dissent: string | null;
  [key: string]: unknown;
}

function AgentNodeComponent({ data }: { data: Record<string, unknown> }) {
  const d = data as unknown as AgentNodeData;
  const color = STANCE_COLORS[d.stance] || "#6b7280";
  const Icon = PERSONA_ICONS[d.personaId] || AlertTriangle;
  const size = Math.max(48, 48 + d.confidence * 24);
  const hasDissent = d.dissent && d.dissent !== "null";

  return (
    <div
      className="relative"
      style={{
        width: size,
        height: size,
        opacity: d.isDimmed ? 0.15 : 1,
        transition: "all 300ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Pulse ring for selected */}
      {d.isSelected && (
        <div
          className="absolute inset-[-6px] rounded-full animate-pulse"
          style={{
            border: `2px solid ${color}60`,
            background: `radial-gradient(circle, ${color}10 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Confidence ring */}
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="46" fill="none" stroke={`${color}15`} strokeWidth="3" />
        <circle
          cx="50" cy="50" r="46"
          fill="none"
          stroke={`${color}80`}
          strokeWidth="3"
          strokeDasharray={`${d.confidence * 289} 289`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 500ms ease" }}
        />
      </svg>

      {/* Main circle */}
      <div
        className="absolute inset-[4px] rounded-full flex items-center justify-center"
        style={{
          background: `radial-gradient(circle at 35% 35%, ${color}bb, ${color}55)`,
          border: `1.5px solid ${color}${d.isSelected ? "ff" : "70"}`,
          boxShadow: d.isSelected
            ? `0 0 24px ${color}40, 0 0 48px ${color}15`
            : `0 0 12px ${color}15`,
        }}
      >
        <Icon
          className="shrink-0"
          size={size * 0.3}
          color={d.isSelected ? "#fff" : color}
        />
      </div>

      {/* Dissent indicator */}
      {hasDissent && !d.isDimmed && (
        <div
          className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center"
          style={{
            background: "#f59e0b",
            boxShadow: "0 0 6px #f59e0b60",
          }}
        >
          <span className="text-[7px] font-mono font-bold text-black">!</span>
        </div>
      )}

      {/* Label */}
      <div
        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center pointer-events-none"
        style={{ top: size + 6 }}
      >
        <div
          className="text-[9px] font-mono font-medium leading-tight"
          style={{
            color: d.isSelected ? "#e0e0e0" : d.isDimmed ? "#30303060" : "#b0b0b0",
            textShadow: d.isSelected ? `0 0 8px ${color}40` : "none",
          }}
        >
          {d.label}
        </div>
        <div
          className="text-[7px] font-mono mt-0.5"
          style={{ color: d.isDimmed ? "transparent" : "#606060" }}
        >
          {d.stance.replace(/_/g, " ")} | {Math.round(d.confidence * 100)}%
        </div>
      </div>

      <Handle type="target" position={Position.Left} className="!opacity-0 !w-px !h-px" />
      <Handle type="source" position={Position.Right} className="!opacity-0 !w-px !h-px" />
    </div>
  );
}

const AgentNode = memo(AgentNodeComponent);

/* ── Factor Node ── */

interface FactorNodeData {
  label: string;
  count: number;
  isDimmed: boolean;
  isSelected: boolean;
  [key: string]: unknown;
}

function FactorNodeComponent({ data }: { data: Record<string, unknown> }) {
  const d = data as unknown as FactorNodeData;
  const size = 28 + d.count * 6;

  return (
    <div
      className="relative"
      style={{
        width: size,
        height: size,
        opacity: d.isDimmed ? 0.08 : 0.7,
        transition: "all 300ms ease",
      }}
    >
      <div
        className="w-full h-full rounded-md flex items-center justify-center"
        style={{
          background: d.isSelected ? "#06b6d420" : "#1a1a1a",
          border: `1px solid ${d.isSelected ? "#06b6d460" : "#2a2a2a"}`,
        }}
      >
        <span className="text-[7px] font-mono text-navy-500 text-center leading-tight px-1 line-clamp-2">
          {d.label}
        </span>
      </div>

      {d.count > 1 && !d.isDimmed && (
        <div
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center text-[6px] font-mono font-bold"
          style={{ background: "#06b6d4", color: "#000" }}
        >
          {d.count}
        </div>
      )}

      <Handle type="target" position={Position.Left} className="!opacity-0 !w-px !h-px" />
      <Handle type="source" position={Position.Right} className="!opacity-0 !w-px !h-px" />
    </div>
  );
}

const FactorNode = memo(FactorNodeComponent);

/* ── Node types ── */

const nodeTypes = {
  agent: AgentNode,
  factor: FactorNode,
};

/* ── Layout ── */

function computeLayout(agents: AgentResult[]) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const centerX = 0;
  const centerY = 0;
  const agentRadius = 280;

  // Place agents in a circle
  agents.forEach((agent, i) => {
    const angle = (2 * Math.PI * i) / agents.length - Math.PI / 2;
    nodes.push({
      id: agent.personaId,
      type: "agent",
      position: {
        x: centerX + Math.cos(angle) * agentRadius,
        y: centerY + Math.sin(angle) * agentRadius,
      },
      data: {
        label: agent.personaName,
        role: agent.role,
        stance: agent.stance,
        confidence: agent.confidence,
        personaId: agent.personaId,
        isSelected: false,
        isDimmed: false,
        dissent: agent.dissent,
      } satisfies AgentNodeData,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
  });

  // Agent-to-agent edges based on stance alignment
  for (let i = 0; i < agents.length; i++) {
    for (let j = i + 1; j < agents.length; j++) {
      const a = agents[i];
      const b = agents[j];
      const diff = Math.abs(
        (STANCE_VALUES[a.stance] || 0) - (STANCE_VALUES[b.stance] || 0)
      );
      // 0 = perfect agreement, 4 = max disagreement
      const alignment = 1 - diff / 4;

      // Only draw edges for meaningful relationships
      if (diff <= 1) {
        // Agreement edge (green)
        edges.push({
          id: `agree-${a.personaId}-${b.personaId}`,
          source: a.personaId,
          target: b.personaId,
          style: {
            stroke: `${STANCE_COLORS[a.stance] || "#6b7280"}${Math.round(alignment * 180).toString(16).padStart(2, "0")}`,
            strokeWidth: alignment * 2.5 + 0.5,
          },
          animated: diff === 0,
          type: "default",
          markerEnd: undefined,
        });
      } else if (diff >= 3) {
        // Disagreement edge (red, dashed)
        edges.push({
          id: `disagree-${a.personaId}-${b.personaId}`,
          source: a.personaId,
          target: b.personaId,
          style: {
            stroke: "#f43f5e30",
            strokeWidth: 1,
            strokeDasharray: "4 4",
          },
          type: "default",
          markerEnd: undefined,
        });
      }
    }
  }

  // Extract shared key factors
  const factorAgents = new Map<string, string[]>();
  for (const agent of agents) {
    for (const factor of agent.keyFactors) {
      const normalized = factor.toLowerCase().trim();
      if (!factorAgents.has(normalized)) {
        factorAgents.set(normalized, []);
      }
      factorAgents.get(normalized)!.push(agent.personaId);
    }
  }

  // Only show factors mentioned by 2+ agents (shared signals)
  const factorRadius = 160;
  let factorIndex = 0;
  const sharedFactors = Array.from(factorAgents.entries()).filter(
    ([, ids]) => ids.length >= 2
  );

  for (const [factor, agentIds] of sharedFactors) {
    const factorId = `factor-${factorIndex}`;
    // Position factor between the agents that share it
    let fx = 0;
    let fy = 0;
    for (const aid of agentIds) {
      const agentNode = nodes.find((n) => n.id === aid);
      if (agentNode) {
        fx += agentNode.position.x;
        fy += agentNode.position.y;
      }
    }
    fx /= agentIds.length;
    fy /= agentIds.length;
    // Pull toward center slightly
    fx = fx * 0.6;
    fy = fy * 0.6;

    nodes.push({
      id: factorId,
      type: "factor",
      position: { x: fx, y: fy },
      data: {
        label: factor.length > 20 ? factor.slice(0, 18) + ".." : factor,
        count: agentIds.length,
        isDimmed: false,
        isSelected: false,
      } satisfies FactorNodeData,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });

    // Connect factor to agents
    for (const aid of agentIds) {
      edges.push({
        id: `f-${factorId}-${aid}`,
        source: factorId,
        target: aid,
        style: {
          stroke: "#06b6d418",
          strokeWidth: 0.8,
          strokeDasharray: "2 3",
        },
        type: "default",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 8,
          height: 8,
          color: "#06b6d430",
        },
      });
    }

    factorIndex++;
  }

  return { nodes, edges };
}

/* ── Inner canvas ── */

function SimulationGraphInner({ agents, convergenceScore, dominantStance, onAgentClick }: Props) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => computeLayout(agents),
    [agents]
  );

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>(initialNodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);

  // Track drag positions so selection re-styling doesn't reset them
  const dragPositions = useRef<Map<string, { x: number; y: number }>>(new Map());

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
    // Capture drag positions
    for (const c of changes) {
      if (c.type === "position" && c.position && c.id) {
        dragPositions.current.set(c.id, c.position);
      }
    }
  }, [onNodesChange]);

  // Sync layout + selection styling into rfNodes/rfEdges
  useEffect(() => {
    setRfNodes(initialNodes.map((node) => {
      // Preserve drag position
      const dragPos = dragPositions.current.get(node.id);
      const position = dragPos || node.position;

      if (node.type === "agent") {
        const d = node.data as unknown as AgentNodeData;
        const isSelected = node.id === selectedAgent;
        const isDimmed = selectedAgent !== null && !isSelected;
        return { ...node, position, data: { ...d, isSelected, isDimmed } };
      }
      if (node.type === "factor") {
        const d = node.data as unknown as FactorNodeData;
        if (selectedAgent) {
          const connected = initialEdges.some(
            (e) =>
              (e.source === node.id && e.target === selectedAgent) ||
              (e.target === node.id && e.source === selectedAgent)
          );
          return { ...node, position, data: { ...d, isDimmed: !connected, isSelected: connected } };
        }
        return { ...node, position, data: { ...d, isDimmed: false, isSelected: false } };
      }
      return { ...node, position };
    }));

    if (!selectedAgent) {
      setRfEdges(initialEdges);
    } else {
      setRfEdges(initialEdges.map((edge) => {
        const connected = edge.source === selectedAgent || edge.target === selectedAgent;
        if (!connected) {
          return { ...edge, style: { ...edge.style, opacity: 0.05 } };
        }
        return {
          ...edge,
          style: {
            ...edge.style,
            opacity: 1,
            strokeWidth: typeof edge.style?.strokeWidth === "number" ? edge.style.strokeWidth * 1.5 : 2,
          },
        };
      }));
    }
  }, [initialNodes, initialEdges, selectedAgent, setRfNodes, setRfEdges]);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.type === "agent") {
        setSelectedAgent((prev) => (prev === node.id ? null : node.id));
        onAgentClick?.(node.id);
      }
    },
    [onAgentClick]
  );

  const handlePaneClick = useCallback(() => {
    setSelectedAgent(null);
  }, []);

  const convColor =
    (convergenceScore || 0) >= 0.65
      ? "#10b981"
      : (convergenceScore || 0) >= 0.45
      ? "#f59e0b"
      : "#f43f5e";

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      onNodesChange={handleNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      onPaneClick={handlePaneClick}
      fitView
      fitViewOptions={{ padding: 0.4, maxZoom: 1.2 }}
      minZoom={0.3}
      maxZoom={3}
      nodesDraggable
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#111111" gap={40} size={1} />
      <Controls
        showInteractive={false}
        className="graph-controls"
        position="bottom-right"
      />
      <MiniMap
        nodeColor={(node) => {
          if (node.type === "factor") return "#06b6d4";
          const stance = (node.data as Record<string, unknown>)?.stance as string;
          return STANCE_COLORS[stance] || "#6b7280";
        }}
        maskColor="rgba(0,0,0,0.8)"
        style={{
          background: "#050505",
          border: "1px solid #1a1a1a",
          borderRadius: 6,
        }}
        position="bottom-left"
      />

      {/* Convergence indicator */}
      <Panel position="top-left">
        <div className="bg-navy-900/90 border border-navy-700/40 rounded-lg p-3 backdrop-blur-sm space-y-2 min-w-[160px]">
          <div className="text-[8px] font-mono text-navy-600 uppercase tracking-widest">
            Convergence
          </div>
          <div className="flex items-center gap-2">
            <div
              className="text-lg font-mono font-bold tabular-nums"
              style={{ color: convColor }}
            >
              {convergenceScore !== null
                ? `${Math.round(convergenceScore * 100)}%`
                : "--"}
            </div>
            <div
              className="text-[9px] font-mono uppercase"
              style={{ color: convColor }}
            >
              {(dominantStance || "neutral").replace(/_/g, " ")}
            </div>
          </div>
          <div className="h-1.5 bg-navy-800/50 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${(convergenceScore || 0) * 100}%`,
                backgroundColor: convColor,
              }}
            />
          </div>
        </div>
      </Panel>

      {/* Legend */}
      <Panel position="top-right">
        <div className="bg-navy-900/90 border border-navy-700/40 rounded-lg p-2.5 backdrop-blur-sm">
          <div className="text-[8px] font-mono text-navy-600 uppercase tracking-widest mb-2">
            Stances
          </div>
          <div className="space-y-1">
            {Object.entries(STANCE_COLORS).map(([stance, color]) => (
              <div key={stance} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[8px] font-mono text-navy-500">
                  {stance.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-navy-800/40 mt-2 pt-2 space-y-1">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-[1.5px] rounded-full bg-accent-emerald/60" />
              <span className="text-[8px] font-mono text-navy-500">Agreement</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-4 h-[1.5px] rounded-full"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg, #f43f5e40 0, #f43f5e40 3px, transparent 3px, transparent 6px)",
                }}
              />
              <span className="text-[8px] font-mono text-navy-500">Disagreement</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-4 h-[1.5px] rounded-full"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg, #06b6d430 0, #06b6d430 2px, transparent 2px, transparent 5px)",
                }}
              />
              <span className="text-[8px] font-mono text-navy-500">Shared Factor</span>
            </div>
          </div>
        </div>
      </Panel>

      {/* Hints */}
      <Panel position="bottom-left" className="!left-[180px]">
        <div className="flex items-center gap-2 text-[8px] font-mono text-navy-600">
          <span className="border border-navy-800/40 rounded px-1 py-0.5">Click</span>
          <span>Focus agent</span>
          <span className="border border-navy-800/40 rounded px-1 py-0.5">Drag</span>
          <span>Rearrange</span>
        </div>
      </Panel>
    </ReactFlow>
  );
}

/* ── Exported wrapper ── */

export function SimulationGraph(props: Props) {
  if (props.agents.length === 0) return null;

  return (
    <div className="w-full h-full simulation-graph-container">
      <ReactFlowProvider>
        <SimulationGraphInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}
