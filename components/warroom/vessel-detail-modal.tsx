"use client";

import { X, Ship, Eye, Route } from "lucide-react";
import type { VesselState } from "@/lib/warroom/types";

interface VesselDetailPanelProps {
  vessel: VesselState | null;
  onClose: () => void;
  onWatch?: (vessel: VesselState) => void;
  isWatched?: boolean;
  onTrack?: (vessel: VesselState) => void;
  isTracked?: boolean;
  trackPointCount?: number;
}

const VESSEL_TYPE_LABELS: Record<string, string> = {
  military: "Military Vessel",
  tanker: "Oil/Gas Tanker",
  cargo: "Cargo Ship",
  passenger: "Passenger Vessel",
  fishing: "Fishing Vessel",
  other: "Other Vessel",
};

const VESSEL_TYPE_COLORS: Record<string, string> = {
  military: "text-accent-rose",
  tanker: "text-accent-amber",
  cargo: "text-navy-400",
  passenger: "text-accent-cyan",
  fishing: "text-accent-emerald",
  other: "text-navy-400",
};

export function VesselDetailModal({
  vessel,
  onClose,
  onWatch,
  isWatched,
  onTrack,
  isTracked,
  trackPointCount,
}: VesselDetailPanelProps) {
  if (!vessel) return null;

  return (
    <div className="absolute top-0 right-0 bottom-0 z-40 w-80 border-l border-navy-700/40 bg-navy-950/95 backdrop-blur-md wr-shadow-lg animate-[slideInRight_200ms_ease-out] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-navy-700/20 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`p-1.5 rounded ${vessel.vesselType === "military" ? "bg-accent-rose/10" : "bg-accent-cyan/10"}`}>
            <Ship className={`h-4 w-4 ${VESSEL_TYPE_COLORS[vessel.vesselType] || "text-navy-400"}`} />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-navy-100 font-mono truncate">
              {vessel.name}
            </div>
            <div className="text-[9px] text-navy-500 uppercase tracking-wider">
              {VESSEL_TYPE_LABELS[vessel.vesselType] || "VESSEL"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {onTrack && (
            <button
              onClick={() => onTrack(vessel)}
              className={`p-1 rounded transition-colors ${
                isTracked
                  ? "bg-accent-emerald/15 text-accent-emerald"
                  : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/60"
              }`}
              title={isTracked ? "Stop tracking path" : "Track vessel path"}
            >
              <Route className="h-3.5 w-3.5" />
            </button>
          )}
          {onWatch && (
            <button
              onClick={() => onWatch(vessel)}
              className={`p-1 rounded transition-colors ${
                isWatched
                  ? "bg-accent-cyan/15 text-accent-cyan"
                  : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/60"
              }`}
              title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-navy-500 hover:text-navy-300 hover:bg-navy-800/60 rounded p-1 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-3">
        {/* Identity */}
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
          <span className="text-navy-500">Name</span>
          <span className="text-navy-100 font-mono font-medium">{vessel.name}</span>
          <span className="text-navy-500">MMSI</span>
          <span className="text-navy-300 font-mono">{vessel.mmsi}</span>
          <span className="text-navy-500">Flag</span>
          <span className="text-navy-300">{vessel.flag}</span>
          <span className="text-navy-500">Type</span>
          <span className={VESSEL_TYPE_COLORS[vessel.vesselType] || "text-navy-200"}>
            {vessel.vesselType.charAt(0).toUpperCase() + vessel.vesselType.slice(1)}
          </span>
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-navy-800/40 rounded px-2 py-2 text-center">
            <div className="text-[9px] text-navy-500 uppercase">Speed</div>
            <div className="text-xs font-mono font-medium text-navy-100">{vessel.speed.toFixed(1)}</div>
            <div className="text-[9px] text-navy-500">knots</div>
          </div>
          <div className="bg-navy-800/40 rounded px-2 py-2 text-center">
            <div className="text-[9px] text-navy-500 uppercase">Course</div>
            <div className="text-xs font-mono font-medium text-navy-100">{Math.round(vessel.course)}&deg;</div>
            <div className="text-[9px] text-navy-500">{headingToCardinal(vessel.course)}</div>
          </div>
          <div className="bg-navy-800/40 rounded px-2 py-2 text-center">
            <div className="text-[9px] text-navy-500 uppercase">Heading</div>
            <div className="text-xs font-mono font-medium text-navy-100">{Math.round(vessel.heading)}&deg;</div>
            <div className="text-[9px] text-navy-500">{headingToCardinal(vessel.heading)}</div>
          </div>
        </div>

        {/* Position */}
        <div className="flex gap-3 text-[10px] text-navy-400 font-mono">
          <span>{vessel.lat.toFixed(4)}&deg;{vessel.lat >= 0 ? "N" : "S"}</span>
          <span>{vessel.lng.toFixed(4)}&deg;{vessel.lng >= 0 ? "E" : "W"}</span>
        </div>

        {/* Destination */}
        {vessel.destination && (
          <div className="border-t border-navy-700/20 pt-2 text-[11px]">
            <span className="text-navy-500">Destination: </span>
            <span className="text-accent-cyan font-medium">{vessel.destination}</span>
          </div>
        )}

        {/* Tracking status */}
        {isTracked && (
          <div className="border-t border-navy-700/20 pt-2">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-accent-emerald animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-accent-emerald">
                Tracking
              </span>
              <span className="text-[10px] font-mono text-navy-500">
                {trackPointCount ?? 0} points
              </span>
            </div>
            <p className="text-[10px] text-navy-500 mt-1">
              Path recording active. Trail updates every 30s as new positions arrive.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function headingToCardinal(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}
