"use client";

import { X, ExternalLink, ArrowRight, ArrowLeft, ChevronRight } from "lucide-react";
import { NODE_COLORS, RELATIONSHIP_LABELS, weightLabel, weightColor } from "@/lib/graph/constants";

interface GraphNode {
  id: number;
  type: string;
  name: string;
  properties: Record<string, unknown>;
  sourceType: string | null;
  sourceId: string | null;
}

interface GraphEdge {
  id: number;
  source: number;
  target: number;
  type: string;
  weight: number;
  properties: Record<string, unknown>;
}

interface Connection {
  edge: GraphEdge;
  node: GraphNode;
  direction: "out" | "in";
}

interface Props {
  node: GraphNode;
  connections: Connection[];
  breadcrumbs: GraphNode[];
  onClose: () => void;
  onNavigate: (id: number) => void;
}

function TypeBadge({ type }: { type: string }) {
  const color = NODE_COLORS[type] || "#64748b";
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider shrink-0"
      style={{ color, backgroundColor: `${color}15` }}
    >
      {type}
    </span>
  );
}

function SourceLink({ sourceType, sourceId }: { sourceType: string | null; sourceId: string | null }) {
  if (!sourceType || !sourceId) return null;

  const routeMap: Record<string, string> = {
    signals: "/signals",
    predictions: "/predictions",
    trades: "/trading",
    theses: "/signals", // theses don't have their own page yet
  };

  const route = routeMap[sourceType];
  if (!route) return null;

  return (
    <a
      href={`${route}/${sourceId}`}
      className="inline-flex items-center gap-1 text-[10px] font-mono text-navy-500 hover:text-navy-300 transition-colors"
    >
      <ExternalLink className="w-2.5 h-2.5" />
      {sourceType} #{sourceId}
    </a>
  );
}

function PropertyDisplay({ type, properties }: { type: string; properties: Record<string, unknown> }) {
  const entries = Object.entries(properties);
  if (entries.length === 0) return null;

  // Structured display for known types
  if (type === "signal") {
    return (
      <div className="space-y-2">
        {properties.intensity != null && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-navy-500 uppercase tracking-wider">Intensity</span>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-3 h-1.5 rounded-sm"
                    style={{
                      backgroundColor: i <= Number(properties.intensity) ? NODE_COLORS.signal : "#1a1a1a",
                    }}
                  />
                ))}
              </div>
              <span className="text-[11px] font-mono text-navy-200">{String(properties.intensity)}/5</span>
            </div>
          </div>
        )}
        {!!properties.category && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-navy-500 uppercase tracking-wider">Category</span>
            <span className="text-[11px] font-mono text-navy-300">{String(properties.category)}</span>
          </div>
        )}
        {!!properties.status && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-navy-500 uppercase tracking-wider">Status</span>
            <span className={`text-[10px] font-mono uppercase tracking-wider ${properties.status === "active" ? "text-accent-emerald" : "text-navy-400"}`}>
              {String(properties.status)}
            </span>
          </div>
        )}
        {!!properties.date && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-navy-500 uppercase tracking-wider">Date</span>
            <span className="text-[11px] font-mono text-navy-400">{String(properties.date)}</span>
          </div>
        )}
      </div>
    );
  }

  if (type === "prediction") {
    const conf = Number(properties.confidence || 0);
    return (
      <div className="space-y-2">
        {properties.confidence != null && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-navy-500 uppercase tracking-wider">Confidence</span>
              <span className="text-[11px] font-mono text-navy-200">{(conf * 100).toFixed(0)}%</span>
            </div>
            <div className="h-1 bg-navy-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${conf * 100}%`, backgroundColor: NODE_COLORS.prediction }} />
            </div>
          </div>
        )}
        {!!properties.outcome && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-navy-500 uppercase tracking-wider">Outcome</span>
            <span className={`text-[10px] font-mono uppercase tracking-wider ${properties.outcome === "confirmed" ? "text-accent-emerald" : properties.outcome === "denied" ? "text-accent-rose" : "text-navy-400"}`}>
              {String(properties.outcome)}
            </span>
          </div>
        )}
        {!!properties.category && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-navy-500 uppercase tracking-wider">Category</span>
            <span className="text-[11px] font-mono text-navy-300">{String(properties.category)}</span>
          </div>
        )}
        {!!properties.deadline && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-navy-500 uppercase tracking-wider">Deadline</span>
            <span className="text-[11px] font-mono text-navy-400">{String(properties.deadline)}</span>
          </div>
        )}
      </div>
    );
  }

  if (type === "trade") {
    return (
      <div className="space-y-2">
        {!!properties.direction && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-navy-500 uppercase tracking-wider">Direction</span>
            <span className={`text-[11px] font-mono font-bold ${properties.direction === "BUY" ? "text-accent-emerald" : "text-accent-rose"}`}>
              {String(properties.direction)}
            </span>
          </div>
        )}
        {!!properties.ticker && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-navy-500 uppercase tracking-wider">Ticker</span>
            <span className="text-[11px] font-mono text-navy-200">{String(properties.ticker)}</span>
          </div>
        )}
        {properties.filledPrice != null && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-navy-500 uppercase tracking-wider">Filled Price</span>
            <span className="text-[11px] font-mono text-navy-200">${String(properties.filledPrice)}</span>
          </div>
        )}
        {!!properties.status && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-navy-500 uppercase tracking-wider">Status</span>
            <span className={`text-[10px] font-mono uppercase tracking-wider ${properties.status === "filled" ? "text-accent-emerald" : "text-navy-400"}`}>
              {String(properties.status)}
            </span>
          </div>
        )}
      </div>
    );
  }

  if (type === "thesis") {
    const conf = Number(properties.confidence || 0);
    return (
      <div className="space-y-2">
        {!!properties.marketRegime && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-navy-500 uppercase tracking-wider">Regime</span>
            <span className="text-[11px] font-mono text-navy-200">{String(properties.marketRegime)}</span>
          </div>
        )}
        {properties.confidence != null && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-navy-500 uppercase tracking-wider">Confidence</span>
              <span className="text-[11px] font-mono text-navy-200">{(conf * 100).toFixed(0)}%</span>
            </div>
            <div className="h-1 bg-navy-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${conf * 100}%`, backgroundColor: NODE_COLORS.thesis }} />
            </div>
          </div>
        )}
        {properties.convergenceDensity != null && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-navy-500 uppercase tracking-wider">Convergence</span>
            <span className="text-[11px] font-mono text-navy-200">{String(properties.convergenceDensity)}/10</span>
          </div>
        )}
        {!!properties.status && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-navy-500 uppercase tracking-wider">Status</span>
            <span className={`text-[10px] font-mono uppercase tracking-wider ${properties.status === "active" ? "text-accent-emerald" : "text-navy-400"}`}>
              {String(properties.status)}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Fallback: render all properties
  return (
    <div className="space-y-1.5">
      {entries.map(([key, val]) => (
        <div key={key} className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-navy-500 uppercase tracking-wider">{key}</span>
          <span className="text-[11px] font-mono text-navy-300 truncate max-w-[180px] text-right">{String(val)}</span>
        </div>
      ))}
    </div>
  );
}

export function EntityDetailPanel({ node, connections, breadcrumbs, onClose, onNavigate }: Props) {
  // Group connections by relationship type
  const grouped = new Map<string, Connection[]>();
  for (const conn of connections) {
    const key = conn.edge.type;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(conn);
  }

  const color = NODE_COLORS[node.type] || "#64748b";

  return (
    <div className="fixed inset-0 z-40 md:relative md:inset-auto md:z-auto w-full md:w-80 shrink-0 flex flex-col h-full overflow-hidden">
      {/* Mobile backdrop */}
      <div className="absolute inset-0 bg-black/50 md:hidden" onClick={onClose} />
      <div className="relative z-10 w-full h-full border-l border-navy-800/40 bg-navy-950 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-navy-800/40">
        <span className="text-[10px] font-mono text-navy-500 uppercase tracking-wider">Entity Detail</span>
        <button onClick={onClose} className="text-navy-500 hover:text-navy-300 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 1 && (
        <div className="px-4 py-2 border-b border-navy-800/40 flex items-center gap-1 overflow-x-auto">
          {breadcrumbs.slice(-4).map((crumb, i, arr) => (
            <div key={crumb.id} className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => i < arr.length - 1 && onNavigate(crumb.id)}
                className={`text-[9px] font-mono truncate max-w-[60px] ${
                  i === arr.length - 1 ? "text-navy-200" : "text-navy-500 hover:text-navy-300 transition-colors cursor-pointer"
                }`}
              >
                {crumb.name}
              </button>
              {i < arr.length - 1 && <ChevronRight className="w-2.5 h-2.5 text-navy-700 shrink-0" />}
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-5">
          {/* Entity info */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <TypeBadge type={node.type} />
              <SourceLink sourceType={node.sourceType} sourceId={node.sourceId} />
            </div>
            <h2 className="text-sm font-semibold text-navy-100 leading-snug">{node.name}</h2>
            <p className="text-[10px] font-mono text-navy-500 mt-1">
              {connections.length} connection{connections.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Properties */}
          {Object.keys(node.properties).length > 0 && (
            <div>
              <div className="text-[9px] font-mono text-navy-600 uppercase tracking-wider mb-2">Properties</div>
              <PropertyDisplay type={node.type} properties={node.properties} />
            </div>
          )}

          {/* Connections */}
          {connections.length > 0 && (
            <div>
              <div className="text-[9px] font-mono text-navy-600 uppercase tracking-wider mb-3">Connections</div>
              <div className="space-y-4">
                {[...grouped.entries()].map(([relType, conns]) => {
                  const labels = RELATIONSHIP_LABELS[relType] || { out: relType, in: relType };
                  return (
                    <div key={relType}>
                      <div className="text-[9px] font-mono text-navy-500 uppercase tracking-wider mb-1.5">
                        {relType.replace(/_/g, " ")}
                      </div>
                      <div className="space-y-1">
                        {conns.map(({ edge, node: connNode, direction }) => {
                          const connColor = NODE_COLORS[connNode.type] || "#64748b";
                          const label = direction === "out" ? labels.out : labels.in;
                          const wLabel = weightLabel(edge.weight);
                          const wColor = weightColor(edge.weight);
                          return (
                            <button
                              key={edge.id}
                              onClick={() => onNavigate(connNode.id)}
                              className="w-full flex items-center gap-2 px-2.5 py-2 rounded hover:bg-navy-900/60 transition-colors text-left group"
                            >
                              {direction === "in" ? (
                                <ArrowLeft className="w-3 h-3 text-navy-600 shrink-0" />
                              ) : (
                                <ArrowRight className="w-3 h-3 text-navy-600 shrink-0" />
                              )}
                              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: connColor }} />
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] text-navy-300 group-hover:text-navy-100 truncate transition-colors">
                                  {connNode.name}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[8px] font-mono text-navy-600 uppercase">{label}</span>
                                  <div className="flex items-center gap-1">
                                    <div className="w-8 h-0.5 bg-navy-800 rounded-full overflow-hidden">
                                      <div className="h-full rounded-full" style={{ width: `${edge.weight * 100}%`, backgroundColor: wColor }} />
                                    </div>
                                    <span className="text-[8px] font-mono" style={{ color: wColor }}>{wLabel}</span>
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {connections.length === 0 && (
            <div className="text-xs text-navy-600 text-center py-4">No connections</div>
          )}
        </div>
      </div>
    </div>
  );
}
