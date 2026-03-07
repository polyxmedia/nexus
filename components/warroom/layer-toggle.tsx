"use client";

import { cn } from "@/lib/utils";
import {
  SignalIcon,
  GlobeAltIcon,
  FireIcon,
} from "@heroicons/react/24/solid";
import { Plane, Ship, Satellite } from "lucide-react";
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
    label: "AIR",
    Icon: Plane,
    heroIcon: null,
    activeColor: "text-accent-rose",
    activeBg: "bg-accent-rose/8",
    activeBorder: "border-accent-rose/25",
    dotColor: "bg-accent-rose",
  },
  {
    key: "vessels" as const,
    label: "SEA",
    Icon: Ship,
    heroIcon: null,
    activeColor: "text-accent-cyan",
    activeBg: "bg-accent-cyan/8",
    activeBorder: "border-accent-cyan/25",
    dotColor: "bg-accent-cyan",
  },
  {
    key: "osintMarkers" as const,
    label: "OSINT",
    Icon: null,
    heroIcon: GlobeAltIcon,
    activeColor: "text-accent-amber",
    activeBg: "bg-accent-amber/8",
    activeBorder: "border-accent-amber/25",
    dotColor: "bg-accent-amber",
  },
  {
    key: "conflictHeatmap" as const,
    label: "HEAT",
    Icon: null,
    heroIcon: FireIcon,
    activeColor: "text-signal-5",
    activeBg: "bg-signal-5/8",
    activeBorder: "border-signal-5/25",
    dotColor: "bg-signal-5",
  },
  {
    key: "satellites" as const,
    label: "SPACE",
    Icon: Satellite,
    heroIcon: null,
    activeColor: "text-purple-400",
    activeBg: "bg-purple-500/8",
    activeBorder: "border-purple-500/25",
    dotColor: "bg-purple-400",
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
      return militaryCount > 0 ? `${aircraftCount} / ${militaryCount}M` : `${aircraftCount}`;
    }
    if (key === "vessels" && visibility.vessels && vesselCount > 0) {
      return vesselMilitaryCount > 0 ? `${vesselCount} / ${vesselMilitaryCount}M` : `${vesselCount}`;
    }
    if (key === "osintMarkers" && visibility.osintMarkers && osintCount > 0) {
      return `${osintCount}`;
    }
    if (key === "satellites" && visibility.satellites && satelliteCount > 0) {
      return satelliteMilitaryCount > 0 ? `${satelliteCount} / ${satelliteMilitaryCount}M` : `${satelliteCount}`;
    }
    return null;
  }

  return (
    <div className="absolute top-3 right-[19rem] z-30 pointer-events-auto">
      <div className="flex bg-[#0a0a0a]/95 backdrop-blur-md border border-[#1a1a1a] rounded overflow-hidden">
        {LAYERS.map((layer, i) => {
          const active = visibility[layer.key];
          const count = getCount(layer.key);
          const IconComponent = layer.heroIcon || layer.Icon;
          if (!IconComponent) return null;

          return (
            <button
              key={layer.key}
              onClick={() => onToggle(layer.key)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] font-mono font-medium uppercase tracking-[0.1em] transition-all relative",
                i > 0 && "border-l border-[#1a1a1a]",
                active
                  ? `${layer.activeBg} ${layer.activeColor} ${layer.activeBorder}`
                  : "text-navy-600 hover:text-navy-400 hover:bg-[#111]"
              )}
            >
              <IconComponent className="h-3 w-3" />
              <span>{layer.label}</span>
              {count && (
                <span className="text-[8px] opacity-60 font-mono tabular-nums">{count}</span>
              )}
              {active && (
                <span className={cn("absolute top-0.5 right-0.5 w-1 h-1 rounded-full", layer.dotColor)} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
