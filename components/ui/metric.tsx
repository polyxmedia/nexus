import { cn } from "@/lib/utils";

interface MetricProps {
  label: string;
  value: string | number;
  change?: string;
  changeColor?: "green" | "red" | "neutral";
  className?: string;
}

export function Metric({
  label,
  value,
  change,
  changeColor = "neutral",
  className,
}: MetricProps) {
  return (
    <div className={cn("py-2", className)}>
      <div className="text-[10px] uppercase tracking-wider text-navy-500">
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold text-navy-100">{value}</span>
        {change && (
          <span
            className={cn(
              "text-xs",
              changeColor === "green" && "text-accent-emerald",
              changeColor === "red" && "text-accent-rose",
              changeColor === "neutral" && "text-navy-400"
            )}
          >
            {change}
          </span>
        )}
      </div>
    </div>
  );
}
