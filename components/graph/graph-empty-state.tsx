"use client";

import { Network, RefreshCw, Loader2 } from "lucide-react";

interface Props {
  syncing: boolean;
  onSync: () => void;
}

export function GraphEmptyState({ syncing, onSync }: Props) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="max-w-sm text-center">
        <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full border border-navy-800/40 mb-5">
          <Network className="w-7 h-7 text-navy-500" />
        </div>

        <h2 className="text-sm font-semibold text-navy-100 mb-2">Intelligence Graph</h2>

        <p className="text-xs text-navy-400 leading-relaxed mb-2">
          The entity graph maps relationships between your signals, predictions, trades, and geopolitical events. It surfaces connections you might miss.
        </p>

        <p className="text-[11px] text-navy-500 leading-relaxed mb-6">
          A signal triggers a prediction. That prediction leads to a trade. That trade affects a sector. The graph shows you the full chain.
        </p>

        <button
          onClick={onSync}
          disabled={syncing}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs font-mono uppercase tracking-widest text-navy-100 hover:bg-white/[0.1] hover:border-white/[0.15] transition-all disabled:opacity-50"
        >
          {syncing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          {syncing ? "Building..." : "Build Graph"}
        </button>

        <p className="text-[10px] text-navy-600 mt-4">
          Extracts entities from your existing signals, predictions, trades, and theses.
        </p>
      </div>
    </div>
  );
}

interface TipBannerProps {
  onDismiss: () => void;
}

export function GraphTipBanner({ onDismiss }: TipBannerProps) {
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 px-4 py-2 rounded-lg bg-navy-900/90 border border-navy-800/40 shadow-lg max-w-lg">
      <p className="text-[11px] text-navy-300">
        Zoom and pan to explore. Click any node to see its connections. Larger nodes have more relationships.
      </p>
      <button
        onClick={onDismiss}
        className="text-[10px] font-mono text-navy-500 hover:text-navy-300 transition-colors shrink-0 uppercase tracking-wider"
      >
        Got it
      </button>
    </div>
  );
}
