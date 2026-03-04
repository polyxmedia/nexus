"use client";

import { X, Plane, Ship, Eye } from "lucide-react";
import type { AircraftState, VesselState } from "@/lib/warroom/types";
import { decodeCallsign } from "@/lib/warroom/callsign-decode";

export interface WatchlistItem {
  type: "aircraft" | "vessel";
  id: string; // icao24 for aircraft, mmsi for vessels
  label: string;
}

interface WatchlistPanelProps {
  items: WatchlistItem[];
  aircraft: AircraftState[];
  vessels: VesselState[];
  onRemove: (id: string) => void;
  onSelectAircraft: (aircraft: AircraftState) => void;
  onSelectVessel: (vessel: VesselState) => void;
}

export function WatchlistPanel({
  items,
  aircraft,
  vessels,
  onRemove,
  onSelectAircraft,
  onSelectVessel,
}: WatchlistPanelProps) {
  if (items.length === 0) return null;

  return (
    <div className="absolute bottom-12 right-[19rem] z-30 pointer-events-auto">
      <div className="bg-navy-900/90 backdrop-blur-md border border-navy-700/30 rounded-lg wr-shadow-md overflow-hidden w-64">
        <div className="flex items-center justify-between px-3 py-2 border-b border-navy-700/20">
          <div className="flex items-center gap-1.5">
            <Eye className="h-3 w-3 text-accent-cyan" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-navy-400">
              Watchlist
            </span>
            <span className="text-[9px] font-mono text-navy-500">{items.length}</span>
          </div>
        </div>

        <div className="max-h-48 overflow-y-auto">
          {items.map((item) => {
            if (item.type === "aircraft") {
              const ac = aircraft.find((a) => a.icao24 === item.id);
              const decoded = ac ? decodeCallsign(ac.callsign) : null;
              const altFt = ac ? Math.round(ac.altitude * 3.281) : 0;
              const spdKts = ac ? Math.round(ac.velocity * 1.944) : 0;

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-2 px-3 py-2 border-b border-navy-700/10 hover:bg-navy-800/40 transition-colors cursor-pointer group"
                  onClick={() => ac && onSelectAircraft(ac)}
                >
                  <Plane className={`h-3 w-3 shrink-0 ${ac?.isMilitary ? "text-accent-rose" : "text-navy-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-medium text-navy-100 truncate">
                        {ac?.callsign || item.label}
                      </span>
                      {decoded?.platform && (
                        <span className="text-[8px] text-accent-cyan truncate">{decoded.platform}</span>
                      )}
                    </div>
                    {ac ? (
                      <div className="text-[9px] text-navy-500 font-mono">
                        {altFt.toLocaleString()} ft | {spdKts} kts | {Math.round(ac.heading)}&deg;
                      </div>
                    ) : (
                      <div className="text-[9px] text-navy-600 italic">Signal lost</div>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
                    className="opacity-0 group-hover:opacity-100 text-navy-600 hover:text-navy-300 p-0.5 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            }

            // Vessel
            const vessel = vessels.find((v) => v.mmsi === item.id);
            return (
              <div
                key={item.id}
                className="flex items-center gap-2 px-3 py-2 border-b border-navy-700/10 hover:bg-navy-800/40 transition-colors cursor-pointer group"
                onClick={() => vessel && onSelectVessel(vessel)}
              >
                <Ship className={`h-3 w-3 shrink-0 ${vessel?.vesselType === "military" ? "text-accent-rose" : "text-accent-cyan"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-mono font-medium text-navy-100 truncate">
                    {vessel?.name || item.label}
                  </div>
                  {vessel ? (
                    <div className="text-[9px] text-navy-500 font-mono">
                      {vessel.speed.toFixed(1)} kts | {Math.round(vessel.course)}&deg; | {vessel.flag}
                    </div>
                  ) : (
                    <div className="text-[9px] text-navy-600 italic">Signal lost</div>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
                  className="opacity-0 group-hover:opacity-100 text-navy-600 hover:text-navy-300 p-0.5 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
