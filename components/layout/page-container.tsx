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
    <main className={cn("ml-0 md:ml-48 min-h-screen p-4 pt-14 md:p-6 md:pt-6", className)}>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-widest text-navy-100">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-xs text-navy-400">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
      {children}
    </main>
  );
}
