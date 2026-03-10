"use client";

import { useEffect, useRef } from "react";
import {
  MessageSquare,
  ExternalLink,
  Focus,
  Route,
  Copy,
  Network,
} from "lucide-react";
import { NODE_COLORS } from "@/lib/graph/constants";

interface ContextMenuProps {
  x: number;
  y: number;
  nodeId: number;
  nodeName: string;
  nodeType: string;
  sourceType: string | null;
  sourceId: string | null;
  onClose: () => void;
  onChatAbout: (name: string) => void;
  onFocusNeighborhood: (id: number) => void;
  onStartPathfinder: (id: number) => void;
  onViewSource: (sourceType: string, sourceId: string) => void;
}

export function GraphContextMenu({
  x,
  y,
  nodeId,
  nodeName,
  nodeType,
  sourceType,
  sourceId,
  onClose,
  onChatAbout,
  onFocusNeighborhood,
  onStartPathfinder,
  onViewSource,
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as globalThis.Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const color = NODE_COLORS[nodeType] || "#64748b";

  const routeMap: Record<string, string> = {
    signals: "/signals",
    predictions: "/predictions",
    trades: "/trading",
    theses: "/thesis",
  };

  const hasSource = sourceType && sourceId && routeMap[sourceType];

  const items = [
    {
      icon: MessageSquare,
      label: "Chat about this",
      shortcut: "C",
      action: () => {
        onChatAbout(nodeName);
        onClose();
      },
    },
    {
      icon: Focus,
      label: "Focus neighborhood",
      shortcut: "F",
      action: () => {
        onFocusNeighborhood(nodeId);
        onClose();
      },
    },
    {
      icon: Route,
      label: "Find path to...",
      shortcut: "P",
      action: () => {
        onStartPathfinder(nodeId);
        onClose();
      },
    },
    {
      icon: Copy,
      label: "Copy name",
      shortcut: null,
      action: () => {
        navigator.clipboard.writeText(nodeName);
        onClose();
      },
    },
    ...(hasSource
      ? [
          {
            icon: ExternalLink,
            label: `View ${sourceType}`,
            shortcut: null,
            action: () => {
              onViewSource(sourceType!, sourceId!);
              onClose();
            },
          },
        ]
      : []),
  ];

  return (
    <div
      ref={ref}
      className="fixed z-50 animate-in fade-in zoom-in-95 duration-100"
      style={{ left: x, top: y }}
    >
      <div className="min-w-[200px] bg-navy-900/95 border border-navy-700/60 rounded-lg shadow-xl backdrop-blur-md overflow-hidden">
        {/* Header */}
        <div className="px-3 py-2 border-b border-navy-800/60 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-[10px] font-mono text-navy-300 truncate max-w-[150px]">
            {nodeName}
          </span>
          <span
            className="text-[8px] font-mono uppercase tracking-wider ml-auto"
            style={{ color }}
          >
            {nodeType}
          </span>
        </div>

        {/* Items */}
        <div className="py-1">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-navy-800/60 transition-colors group"
            >
              <item.icon className="w-3 h-3 text-navy-500 group-hover:text-navy-300 transition-colors" />
              <span className="text-[11px] text-navy-400 group-hover:text-navy-200 transition-colors flex-1">
                {item.label}
              </span>
              {item.shortcut && (
                <span className="text-[9px] font-mono text-navy-600 border border-navy-700/40 rounded px-1 py-0.5">
                  {item.shortcut}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
