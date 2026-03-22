"use client";

import { cn } from "@/lib/utils";
import {
  GlobeAltIcon,
  FireIcon,
} from "@heroicons/react/24/solid";
import { Plane, Ship, Satellite, Crown, Flame, Radiation, MessageCircle } from "lucide-react";
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
  vipCount: number;
  fireCount: number;
  fireHighCount: number;
  fireMilitaryCount: number;
  fireMilitaryOnly: boolean;
  radiationCount: number;
  radiationElevatedCount: number;
  socialCount: number;
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
  {
    key: "vipAircraft" as const,
    label: "VIP",
    Icon: Crown,
    heroIcon: null,
    activeColor: "text-amber-400",
    activeBg: "bg-amber-500/8",
    activeBorder: "border-amber-500/25",
    dotColor: "bg-amber-400",
  },
  {
    key: "fires" as const,
    label: "FIRE",
    Icon: Flame,
    heroIcon: null,
    activeColor: "text-orange-400",
    activeBg: "bg-orange-500/8",
    activeBorder: "border-orange-500/25",
    dotColor: "bg-orange-400",
  },
  {
    key: "radiation" as const,
    label: "RAD",
    Icon: Radiation,
    heroIcon: null,
    activeColor: "text-lime-400",
    activeBg: "bg-lime-500/8",
    activeBorder: "border-lime-500/25",
    dotColor: "bg-lime-400",
  },
  {
    key: "social" as const,
    label: "INTEL",
    Icon: MessageCircle,
    heroIcon: null,
    activeColor: "text-blue-400",
    activeBg: "bg-blue-500/8",
    activeBorder: "border-blue-500/25",
    dotColor: "bg-blue-400",
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
  vipCount,
  fireCount,
  fireHighCount,
  fireMilitaryCount,
  fireMilitaryOnly,
  radiationCount,
  radiationElevatedCount,
  socialCount,
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
    if (key === "vipAircraft" && visibility.vipAircraft && vipCount > 0) {
      return `${vipCount}`;
    }
    if (key === "fires" && visibility.fires && fireCount > 0) {
      if (fireMilitaryOnly && fireMilitaryCount > 0) return `${fireMilitaryCount}M`;
      return fireMilitaryCount > 0 ? `${fireCount} / ${fireMilitaryCount}M` : `${fireCount}`;
    }
    if (key === "radiation" && visibility.radiation && radiationCount > 0) {
      return radiationElevatedCount > 0 ? `${radiationCount} / ${radiationElevatedCount}!` : `${radiationCount}`;
    }
    if (key === "social" && visibility.social && socialCount > 0) {
      return `${socialCount}`;
    }
    return null;
  }

  return (
    <div className="absolute top-3 right-[19rem] z-30 pointer-events-auto">
      <div className="flex rounded overflow-hidden">
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
                "flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] font-mono font-medium uppercase tracking-[0.1em] transition-all relative rounded",
                active
                  ? `${layer.activeBg} ${layer.activeColor} ${layer.activeBorder}`
                  : "text-navy-600 hover:text-navy-400 hover:bg-navy-800"
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
        {/* MIL sub-toggle: appears when fire layer is active */}
        {visibility.fires && (
          <button
            onClick={() => onToggle("fireMilitaryOnly")}
            className={cn(
              "flex items-center gap-1 px-2 py-1.5 text-[8px] font-mono font-bold uppercase tracking-[0.12em] transition-all rounded border",
              fireMilitaryOnly
                ? "bg-red-500/15 text-red-400 border-red-500/30"
                : "text-navy-500 hover:text-navy-300 hover:bg-navy-800 border-transparent"
            )}
          >
            MIL
            {fireMilitaryCount > 0 && (
              <span className="text-[7px] opacity-60 tabular-nums">{fireMilitaryCount}</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
