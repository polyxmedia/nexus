"use client";

import { X, Plane, Eye } from "lucide-react";
import type { AircraftState } from "@/lib/warroom/types";
import { decodeCallsign } from "@/lib/warroom/callsign-decode";

interface AircraftDetailPanelProps {
  aircraft: AircraftState | null;
  onClose: () => void;
  onWatch?: (aircraft: AircraftState) => void;
  isWatched?: boolean;
}

function headingToCardinal(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

export function AircraftDetailModal({
  aircraft,
  onClose,
  onWatch,
  isWatched,
}: AircraftDetailPanelProps) {
  if (!aircraft) return null;

  const decoded = aircraft.isMilitary ? decodeCallsign(aircraft.callsign) : null;
  const altFt = Math.round(aircraft.altitude * 3.281);
  const speedKts = Math.round(aircraft.velocity * 1.944);
  const altBand = altFt < 1000 ? "GND" : altFt < 10000 ? "LOW" : altFt < 33000 ? "MID" : "HIGH";
  const mach = aircraft.velocity / 343;

  return (
    <div className="absolute bottom-3 left-[21rem] z-40 pointer-events-auto w-80 rounded-lg border border-navy-700/40 bg-navy-900/92 backdrop-blur-md wr-shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-navy-700/20">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`p-1.5 rounded ${aircraft.isMilitary ? "bg-accent-rose/10" : "bg-navy-800/60"}`}>
            <Plane className={`h-4 w-4 ${aircraft.isMilitary ? "text-accent-rose" : "text-navy-400"}`} />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-navy-100 font-mono truncate">
              {aircraft.callsign || aircraft.icao24}
            </div>
            <div className="text-[9px] text-navy-500 uppercase tracking-wider">
              {aircraft.isMilitary ? "MILITARY" : "CIVILIAN"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {onWatch && (
            <button
              onClick={() => onWatch(aircraft)}
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

      <div className="px-3 py-2.5 space-y-3">
        {/* Identity */}
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
          <span className="text-navy-500">Callsign</span>
          <span className="text-navy-100 font-mono font-medium">{aircraft.callsign || "N/A"}</span>
          <span className="text-navy-500">ICAO</span>
          <span className="text-navy-300 font-mono">{aircraft.icao24}</span>
          <span className="text-navy-500">Origin</span>
          <span className="text-navy-300">{aircraft.originCountry}</span>
          {decoded && (
            <>
              <span className="text-navy-500">Unit</span>
              <span className="text-accent-amber">{decoded.unit}</span>
              {decoded.platform && (
                <>
                  <span className="text-navy-500">Platform</span>
                  <span className="text-accent-cyan font-medium">{decoded.platform}</span>
                </>
              )}
              {decoded.role && (
                <>
                  <span className="text-navy-500">Role</span>
                  <span className="text-navy-300">{decoded.role}</span>
                </>
              )}
            </>
          )}
        </div>

        {/* Flight Data */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-navy-800/40 rounded px-2 py-2 text-center">
            <div className="text-[9px] text-navy-500 uppercase">Alt</div>
            <div className="text-xs font-mono font-medium text-navy-100">{altFt.toLocaleString()}</div>
            <div className="text-[9px] text-navy-500">ft ({altBand})</div>
          </div>
          <div className="bg-navy-800/40 rounded px-2 py-2 text-center">
            <div className="text-[9px] text-navy-500 uppercase">Spd</div>
            <div className="text-xs font-mono font-medium text-navy-100">{speedKts}</div>
            <div className="text-[9px] text-navy-500">kts (M{mach.toFixed(2)})</div>
          </div>
          <div className="bg-navy-800/40 rounded px-2 py-2 text-center">
            <div className="text-[9px] text-navy-500 uppercase">Hdg</div>
            <div className="text-xs font-mono font-medium text-navy-100">{Math.round(aircraft.heading)}&deg;</div>
            <div className="text-[9px] text-navy-500">{headingToCardinal(aircraft.heading)}</div>
          </div>
        </div>

        {/* Position */}
        <div className="flex gap-3 text-[10px] text-navy-400 font-mono">
          <span>{aircraft.lat.toFixed(4)}&deg;N</span>
          <span>{aircraft.lng.toFixed(4)}&deg;E</span>
          <span>{Math.round(aircraft.altitude).toLocaleString()}m</span>
        </div>
      </div>
    </div>
  );
}
