import { cn } from "@/lib/utils";

interface StatusDotProps {
  color: "green" | "red" | "amber" | "cyan" | "gray";
  label: string;
  className?: string;
}

const colorMap = {
  green: "bg-accent-emerald",
  red: "bg-accent-rose",
  amber: "bg-accent-amber",
  cyan: "bg-accent-cyan",
  gray: "bg-navy-500",
};

export function StatusDot({ color, label, className }: StatusDotProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", colorMap[color])} />
      <span className="text-xs text-navy-300">{label}</span>
    </span>
  );
}
