import { cn } from "@/lib/utils";

interface PageContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageContainer({
  title,
  subtitle,
  children,
  actions,
  className,
}: PageContainerProps) {
  return (
    <main className={cn("ml-56 min-h-screen p-6", className)}>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-widest text-navy-100">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-xs text-navy-400">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </main>
  );
}
