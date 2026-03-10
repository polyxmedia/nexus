"use client";

import { X, Anchor, AlertTriangle, ArrowRight, Droplets, Ship, Shield, Flame } from "lucide-react";
import type { ChokepointIntel } from "@/lib/warroom/geo-constants";

interface ChokepointDetailModalProps {
  chokepoint: ChokepointIntel | null;
  onClose: () => void;
}

const THREAT_COLORS: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: "bg-signal-1/10", text: "text-signal-1", label: "LOW" },
  2: { bg: "bg-accent-emerald/10", text: "text-accent-emerald", label: "GUARDED" },
  3: { bg: "bg-accent-amber/10", text: "text-accent-amber", label: "ELEVATED" },
  4: { bg: "bg-orange-500/10", text: "text-orange-400", label: "HIGH" },
  5: { bg: "bg-accent-rose/10", text: "text-accent-rose", label: "CRITICAL" },
};

export function ChokepointDetailModal({ chokepoint, onClose }: ChokepointDetailModalProps) {
  if (!chokepoint) return null;

  const threat = THREAT_COLORS[chokepoint.threatLevel] || THREAT_COLORS[3];

  return (
    <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center p-6">
      <div className="pointer-events-auto w-full max-w-4xl rounded-lg border border-navy-700/40 bg-navy-900/98 backdrop-blur-md wr-shadow-lg overflow-hidden animate-[slideUp_200ms_ease-out]">
        {/* Terminal header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-navy-700/20 bg-navy-900">
          <div className="flex items-center gap-3">
            <Anchor className="h-3.5 w-3.5 text-accent-amber" />
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-navy-400">
              chokepoint intel
            </span>
            <span className="text-[10px] font-mono text-navy-600">
              {chokepoint.coords.lat.toFixed(4)}&deg;{chokepoint.coords.lat >= 0 ? "N" : "S"}{" "}
              {chokepoint.coords.lng.toFixed(4)}&deg;{chokepoint.coords.lng >= 0 ? "E" : "W"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded ${threat.bg}`}>
              <AlertTriangle className={`h-3 w-3 ${threat.text}`} />
              <span className={`text-[9px] font-mono font-bold tracking-wider ${threat.text}`}>
                THREAT: {threat.label}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-navy-500 hover:text-navy-300 hover:bg-navy-800/60 rounded p-1 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Terminal prompt + name */}
        <div className="px-4 py-2.5 border-b border-navy-700">
          <div className="flex items-center gap-2">
            <span className="text-accent-emerald font-mono text-[11px]">nexus@intel</span>
            <span className="text-navy-600 font-mono text-[11px]">:</span>
            <span className="text-accent-cyan font-mono text-[11px]">~/chokepoints</span>
            <span className="text-navy-600 font-mono text-[11px]">$</span>
            <span className="text-navy-200 font-mono text-[11px]">query --id {chokepoint.id}</span>
          </div>
        </div>

        {/* Content grid */}
        <div className="px-4 py-3 max-h-[60vh] overflow-y-auto">
          {/* Title + summary row */}
          <div className="mb-3">
            <h2 className="text-base font-semibold text-navy-100 mb-1">{chokepoint.name}</h2>
            <p className="text-[11px] text-navy-400 leading-relaxed">{chokepoint.significance}</p>
          </div>

          {/* Metrics bar */}
          <div className="grid grid-cols-5 gap-2 mb-4">
            <div className="bg-navy-800/40 rounded px-3 py-2 border border-navy-700/20">
              <div className="text-[8px] font-mono text-navy-600 uppercase tracking-wider mb-0.5">Width</div>
              <div className="text-sm font-mono font-medium text-navy-100">
                {chokepoint.widthKm < 1 ? `${(chokepoint.widthKm * 1000).toFixed(0)}m` : `${chokepoint.widthKm}km`}
              </div>
            </div>
            <div className="bg-navy-800/40 rounded px-3 py-2 border border-navy-700/20">
              <div className="text-[8px] font-mono text-navy-600 uppercase tracking-wider mb-0.5">Depth</div>
              <div className="text-sm font-mono font-medium text-navy-100">{chokepoint.depthM}m</div>
            </div>
            <div className="bg-navy-800/40 rounded px-3 py-2 border border-navy-700/20">
              <div className="text-[8px] font-mono text-navy-600 uppercase tracking-wider mb-0.5">Traffic</div>
              <div className="text-sm font-mono font-medium text-navy-100">{chokepoint.dailyTraffic}</div>
            </div>
            <div className="bg-navy-800/40 rounded px-3 py-2 border border-navy-700/20">
              <div className="text-[8px] font-mono text-navy-600 uppercase tracking-wider mb-0.5">Oil Flow</div>
              <div className="text-sm font-mono font-medium text-accent-amber">{chokepoint.oilFlowMbpd} mbpd</div>
            </div>
            <div className="bg-navy-800/40 rounded px-3 py-2 border border-navy-700/20">
              <div className="text-[8px] font-mono text-navy-600 uppercase tracking-wider mb-0.5">Global Share</div>
              <div className="text-[11px] font-mono font-medium text-navy-100">{chokepoint.globalTradeShare}</div>
            </div>
          </div>

          {/* Three-column detail grid */}
          <div className="grid grid-cols-3 gap-4 mb-3">
            {/* Threats */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Flame className="h-3 w-3 text-accent-rose" />
                <span className="text-[9px] font-mono text-accent-rose uppercase tracking-wider font-medium">Threat Vectors</span>
              </div>
              <div className="space-y-1.5">
                {chokepoint.threats.map((t, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-accent-rose mt-1 shrink-0 text-[8px]">&#x25cf;</span>
                    <span className="text-[10px] text-navy-300 leading-tight">{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Control + Contested */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Shield className="h-3 w-3 text-accent-cyan" />
                <span className="text-[9px] font-mono text-accent-cyan uppercase tracking-wider font-medium">Control & Actors</span>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="text-[8px] font-mono text-navy-600 uppercase tracking-wider mb-1">Controlled By</div>
                  <div className="flex flex-wrap gap-1">
                    {chokepoint.controlledBy.map((c) => (
                      <span key={c} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                {chokepoint.contestedBy.length > 0 && (
                  <div>
                    <div className="text-[8px] font-mono text-navy-600 uppercase tracking-wider mb-1">Contested By</div>
                    <div className="flex flex-wrap gap-1">
                      {chokepoint.contestedBy.map((c) => (
                        <span key={c} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent-rose/10 text-accent-rose border border-accent-rose/20">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-[8px] font-mono text-navy-600 uppercase tracking-wider mb-1">Commodities</div>
                  <div className="flex flex-wrap gap-1">
                    {chokepoint.commodities.map((c) => (
                      <span key={c} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-navy-800/60 text-navy-300 border border-navy-700/30">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Events */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Ship className="h-3 w-3 text-accent-amber" />
                <span className="text-[9px] font-mono text-accent-amber uppercase tracking-wider font-medium">Recent Activity</span>
              </div>
              <div className="space-y-1.5">
                {chokepoint.recentEvents.map((e, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <ArrowRight className="h-2.5 w-2.5 text-accent-amber mt-0.5 shrink-0" />
                    <span className="text-[10px] text-navy-300 leading-tight">{e}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Alternatives bar */}
          <div className="border-t border-navy-700 pt-2.5">
            <div className="flex items-start gap-2">
              <Droplets className="h-3 w-3 text-navy-500 mt-0.5 shrink-0" />
              <div>
                <span className="text-[9px] font-mono text-navy-500 uppercase tracking-wider">Bypass Alternatives: </span>
                <span className="text-[10px] text-navy-400">{chokepoint.alternatives}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
