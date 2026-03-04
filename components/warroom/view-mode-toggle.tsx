"use client";

import { cn } from "@/lib/utils";

export type ViewMode = "2d" | "3d";

interface ViewModeToggleProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

export function ViewModeToggle({ mode, onModeChange }: ViewModeToggleProps) {
  return (
    <div className="absolute bottom-3 left-[21rem] z-20 pointer-events-auto">
      <div className="flex bg-navy-900/80 backdrop-blur-sm border border-navy-700/30 rounded-md wr-shadow-md overflow-hidden">
        <button
          onClick={() => onModeChange("2d")}
          className={cn(
            "px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wider transition-colors",
            mode === "2d"
              ? "bg-navy-700/50 text-navy-100"
              : "text-navy-500 hover:bg-navy-800/60 hover:text-navy-400"
          )}
        >
          2D
        </button>
        <button
          onClick={() => onModeChange("3d")}
          className={cn(
            "px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wider transition-colors border-l border-navy-700/20",
            mode === "3d"
              ? "bg-accent-cyan/15 text-accent-cyan"
              : "text-navy-500 hover:bg-navy-800/60 hover:text-navy-400"
          )}
        >
          3D
        </button>
      </div>
    </div>
  );
}
