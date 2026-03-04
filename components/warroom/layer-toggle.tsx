"use client";

import { cn } from "@/lib/utils";
import { Plane, Ship, Radio, Flame, Satellite } from "lucide-react";
import type { WarRoomLayerVisibility } from "@/lib/warroom/types";

interface LayerToggleProps {
  visibility: WarRoomLayerVisibility;
  onToggle: (layer: keyof WarRoomLayerVisibility) => void;
  aircraftCount: number;
  militaryCount: number;
  vesselCount: number;
  vesselMilitaryCount: number;
  osintCount: number;
  satelliteCount: number;
  satelliteMilitaryCount: number;
}

const LAYERS = [
  {
    key: "aircraft" as const,
    label: "Aircraft",
    Icon: Plane,
    activeClass: "bg-accent-rose/10 text-accent-rose border-accent-rose/20",
    dotClass: "bg-accent-rose",
  },
  {
    key: "vessels" as const,
    label: "Maritime",
    Icon: Ship,
    activeClass: "bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20",
    dotClass: "bg-accent-cyan",
  },
  {
    key: "osintMarkers" as const,
    label: "OSINT",
    Icon: Radio,
    activeClass: "bg-accent-amber/10 text-accent-amber border-accent-amber/20",
    dotClass: "bg-accent-amber",
  },
  {
    key: "conflictHeatmap" as const,
    label: "Heatmap",
    Icon: Flame,
    activeClass: "bg-signal-5/10 text-signal-5 border-signal-5/20",
    dotClass: "bg-signal-5",
  },
  {
    key: "satellites" as const,
    label: "Space",
    Icon: Satellite,
    activeClass: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    dotClass: "bg-purple-400",
  },
];

export function LayerToggle({
  visibility,
  onToggle,
  aircraftCount,
  militaryCount,
  vesselCount,
  vesselMilitaryCount,
  osintCount,
  satelliteCount,
  satelliteMilitaryCount,
}: LayerToggleProps) {
  function getCount(key: string): string | null {
    if (key === "aircraft" && visibility.aircraft && aircraftCount > 0) {
      const mil = militaryCount > 0 ? ` / ${militaryCount} mil` : "";
      return `${aircraftCount.toLocaleString()}${mil}`;
    }
    if (key === "vessels" && visibility.vessels && vesselCount > 0) {
      const mil = vesselMilitaryCount > 0 ? ` / ${vesselMilitaryCount} mil` : "";
      return `${vesselCount.toLocaleString()}${mil}`;
    }
    if (key === "osintMarkers" && visibility.osintMarkers && osintCount > 0) {
      return `${osintCount}`;
    }
    if (key === "satellites" && visibility.satellites && satelliteCount > 0) {
      const mil = satelliteMilitaryCount > 0 ? ` / ${satelliteMilitaryCount} mil` : "";
      return `${satelliteCount.toLocaleString()}${mil}`;
    }
    return null;
  }

  return (
    <div className="absolute top-3 right-[19rem] z-30 pointer-events-auto">
      <div className="flex bg-navy-900/85 backdrop-blur-md border border-navy-700/25 rounded-lg wr-shadow-md overflow-hidden">
        {LAYERS.map((layer, i) => {
          const active = visibility[layer.key];
          const count = getCount(layer.key);
          return (
            <button
              key={layer.key}
              onClick={() => onToggle(layer.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium uppercase tracking-wider transition-all relative",
                i > 0 && "border-l border-navy-700/20",
                active
                  ? layer.activeClass
                  : "text-navy-600 hover:bg-navy-800/40 hover:text-navy-400"
              )}
            >
              <layer.Icon className="h-3 w-3" />
              <span>{layer.label}</span>
              {count && (
                <span className="text-[9px] opacity-70 font-mono ml-0.5">{count}</span>
              )}
              {active && (
                <span className={cn("absolute top-1 right-1 w-1 h-1 rounded-full", layer.dotClass)} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
