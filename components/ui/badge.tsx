import { cn } from "@/lib/utils";
import { type HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "intensity" | "status" | "category";
  intensity?: number;
}

export function Badge({ className, variant = "default", intensity, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium font-mono",
        {
          default: "bg-navy-700 text-navy-200",
          intensity: intensity
            ? {
                1: "bg-signal-1/20 text-signal-1 border border-signal-1/30",
                2: "bg-signal-2/20 text-signal-2 border border-signal-2/30",
                3: "bg-signal-3/20 text-signal-3 border border-signal-3/30",
                4: "bg-signal-4/20 text-signal-4 border border-signal-4/30",
                5: "bg-signal-5/20 text-signal-5 border border-signal-5/30",
              }[intensity] || "bg-navy-700 text-navy-200"
            : "bg-navy-700 text-navy-200",
          status: "bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30",
          category: "bg-navy-700/60 text-navy-300 border border-navy-600",
        }[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function IntensityBadge({ intensity }: { intensity: number }) {
  return <IntensityIndicator intensity={intensity} />;
}

export function IntensityIndicator({ intensity }: { intensity: number }) {
  const colorMap: Record<number, string> = {
    1: "bg-signal-1",
    2: "bg-signal-2",
    3: "bg-signal-3",
    4: "bg-signal-4",
    5: "bg-signal-5",
  };

  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex gap-px">
        {[1, 2, 3, 4, 5].map((level) => (
          <span
            key={level}
            className={cn(
              "inline-block w-1 h-3 rounded-sm",
              level <= intensity
                ? colorMap[intensity] || "bg-navy-400"
                : "bg-navy-700"
            )}
          />
        ))}
      </span>
      <span className="text-[10px] text-navy-400 font-mono ml-0.5">{intensity}</span>
    </span>
  );
}
