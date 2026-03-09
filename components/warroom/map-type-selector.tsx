"use client";

import { cn } from "@/lib/utils";

export type MapTileType = "dark" | "terrain" | "satellite" | "hybrid";

export const MAP_TILES: Record<
  MapTileType,
  { label: string; url: string; attribution: string }
> = {
  dark: {
    label: "Dark",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  },
  terrain: {
    label: "Topo",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
  },
  satellite: {
    label: "Sat",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
  },
  hybrid: {
    label: "Hybrid",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  },
};

const TILE_KEYS = Object.keys(MAP_TILES) as MapTileType[];

interface MapTypeSelectorProps {
  activeType: MapTileType;
  onTypeChange: (type: MapTileType) => void;
}

export function MapTypeSelector({
  activeType,
  onTypeChange,
}: MapTypeSelectorProps) {
  return (
    <div className="absolute bottom-3 left-[25rem] z-20 pointer-events-auto">
      <div className="flex bg-navy-900/95 backdrop-blur-md border border-navy-700 rounded overflow-hidden font-mono">
        {TILE_KEYS.map((type, idx) => (
          <button
            key={type}
            onClick={() => onTypeChange(type)}
            className={cn(
              "px-2.5 py-1.5 text-[9px] font-medium uppercase tracking-[0.1em] transition-colors",
              idx > 0 && "border-l border-navy-700",
              activeType === type
                ? "bg-navy-700 text-navy-200"
                : "text-navy-600 hover:text-navy-400 hover:bg-navy-800"
            )}
          >
            {MAP_TILES[type].label}
          </button>
        ))}
      </div>
    </div>
  );
}
