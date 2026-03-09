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
      <div className="flex bg-navy-900/95 backdrop-blur-md border border-navy-700 rounded overflow-hidden font-mono">
        <button
          onClick={() => onModeChange("2d")}
          className={cn(
            "px-2.5 py-1.5 text-[9px] font-medium uppercase tracking-[0.1em] transition-colors",
            mode === "2d"
              ? "bg-navy-700 text-navy-200"
              : "text-navy-600 hover:text-navy-400 hover:bg-navy-800"
          )}
        >
          2D
        </button>
        <button
          onClick={() => onModeChange("3d")}
          className={cn(
            "px-2.5 py-1.5 text-[9px] font-medium uppercase tracking-[0.1em] transition-colors border-l border-navy-700",
            mode === "3d"
              ? "bg-accent-cyan/10 text-accent-cyan"
              : "text-navy-600 hover:text-navy-400 hover:bg-navy-800"
          )}
        >
          3D
        </button>
      </div>
    </div>
  );
}
