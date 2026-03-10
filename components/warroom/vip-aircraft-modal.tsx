"use client";

import { X } from "lucide-react";
import type { VipAircraftState } from "@/lib/warroom/types";

interface VipAircraftModalProps {
  aircraft: VipAircraftState | null;
  onClose: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Head of State": "text-amber-400 bg-amber-400/10 border-amber-400/25",
  "Dictator Alert": "text-orange-400 bg-orange-400/10 border-orange-400/25",
  "Oligarch": "text-violet-400 bg-violet-400/10 border-violet-400/25",
  "Royal Aircraft": "text-amber-400 bg-amber-400/10 border-amber-400/25",
  "Governments": "text-sky-400 bg-sky-400/10 border-sky-400/25",
  "Da Comrade": "text-red-400 bg-red-400/10 border-red-400/25",
  "Agency": "text-emerald-400 bg-emerald-400/10 border-emerald-400/25",
  "Nuclear": "text-red-500 bg-red-500/10 border-red-500/25",
  "Special Forces": "text-rose-400 bg-rose-400/10 border-rose-400/25",
  "Ukraine": "text-yellow-400 bg-yellow-400/10 border-yellow-400/25",
};

function getCategoryClass(category: string): string {
  return CATEGORY_COLORS[category] || "text-amber-400 bg-amber-400/10 border-amber-400/25";
}

export function VipAircraftModal({ aircraft: ac, onClose }: VipAircraftModalProps) {
  if (!ac) return null;

  const altFt = Math.round(ac.altitude * 3.281);
  const spdKts = Math.round(ac.velocity * 1.944);
  const catClass = getCategoryClass(ac.category);

  return (
    <div className="absolute top-0 right-0 bottom-0 w-80 z-40 bg-navy-950/95 backdrop-blur-sm border-l border-navy-700 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-navy-800">
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${catClass}`}>
            {ac.category}
          </span>
          <span className="text-[9px] font-mono text-navy-500 uppercase">{ac.cmpg}</span>
        </div>
        <button onClick={onClose} className="text-navy-600 hover:text-navy-300 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-3 space-y-4">
        {/* Owner / Identity */}
        <div>
          <div className="text-sm font-sans font-medium text-navy-100">{ac.owner}</div>
          <div className="text-[11px] text-navy-400 mt-0.5">{ac.operator}</div>
        </div>

        {/* Aircraft info */}
        <div className="space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Aircraft</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
            <div>
              <span className="text-navy-600">Registration</span>
              <div className="text-navy-200 font-mono">{ac.registration || "N/A"}</div>
            </div>
            <div>
              <span className="text-navy-600">ICAO24</span>
              <div className="text-navy-200 font-mono">{ac.icao24.toUpperCase()}</div>
            </div>
            <div>
              <span className="text-navy-600">Type</span>
              <div className="text-navy-200">{ac.aircraftType || ac.icaoType || "N/A"}</div>
            </div>
            <div>
              <span className="text-navy-600">Callsign</span>
              <div className="text-navy-200 font-mono">{ac.callsign || "N/A"}</div>
            </div>
          </div>
        </div>

        {/* Tags */}
        {(ac.tag1 || ac.tag2) && (
          <div className="space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Intelligence Tags</div>
            <div className="flex flex-wrap gap-1.5">
              {ac.tag1 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-navy-800 text-navy-300 border border-navy-700">
                  {ac.tag1}
                </span>
              )}
              {ac.tag2 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-navy-800 text-navy-300 border border-navy-700">
                  {ac.tag2}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Flight data */}
        <div className="space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Flight Data</div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-navy-900 rounded p-2 text-center">
              <div className="text-[9px] text-navy-600 font-mono uppercase">ALT</div>
              <div className="text-[12px] text-navy-200 font-mono font-medium">{altFt.toLocaleString()}ft</div>
            </div>
            <div className="bg-navy-900 rounded p-2 text-center">
              <div className="text-[9px] text-navy-600 font-mono uppercase">SPD</div>
              <div className="text-[12px] text-navy-200 font-mono font-medium">{spdKts}kts</div>
            </div>
            <div className="bg-navy-900 rounded p-2 text-center">
              <div className="text-[9px] text-navy-600 font-mono uppercase">HDG</div>
              <div className="text-[12px] text-navy-200 font-mono font-medium">{Math.round(ac.heading)}</div>
            </div>
          </div>
        </div>

        {/* Position */}
        <div className="space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Position</div>
          <div className="text-[11px] font-mono text-navy-400">
            {ac.lat.toFixed(4)}, {ac.lng.toFixed(4)}
          </div>
        </div>

        {/* External links */}
        <div className="space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">External</div>
          <div className="flex gap-2">
            <a
              href={`https://globe.adsbexchange.com/?icao=${ac.icao24}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-mono text-accent-cyan hover:text-accent-cyan/80 transition-colors"
            >
              ADS-B Exchange
            </a>
            <a
              href={`https://www.flightradar24.com/${ac.registration || ac.callsign}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-mono text-accent-cyan hover:text-accent-cyan/80 transition-colors"
            >
              FlightRadar24
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
