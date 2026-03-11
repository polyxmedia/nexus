export default function Loading() {
  return (
    <main className="ml-0 md:ml-48 min-h-screen p-4 pt-14 md:p-6 md:pt-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-cyan opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-cyan" />
        </span>
        <span className="text-[10px] font-mono uppercase tracking-wider text-navy-400">
          Loading
        </span>
      </div>
      <div className="space-y-4">
        <div className="h-4 w-48 animate-pulse rounded bg-navy-800" />
        <div className="h-64 w-full animate-pulse rounded bg-navy-800/50" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-32 animate-pulse rounded bg-navy-800/30" />
          <div className="h-32 animate-pulse rounded bg-navy-800/30" />
          <div className="h-32 animate-pulse rounded bg-navy-800/30" />
        </div>
      </div>
    </main>
  );
}
