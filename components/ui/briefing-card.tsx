import { cn } from "@/lib/utils";

interface BriefingCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function BriefingCard({ title, children, className }: BriefingCardProps) {
  return (
    <div
      className={cn(
        "border border-navy-700 rounded bg-navy-900/80 p-5",
        className
      )}
    >
      <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-3">
        {title}
      </h3>
      <div className="font-sans text-sm text-navy-200 leading-relaxed whitespace-pre-wrap">
        {children}
      </div>
    </div>
  );
}
