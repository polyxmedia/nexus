"use client";

const systems = [
  { name: "Signal Detection Engine", status: "operational" },
  { name: "Convergence Analysis", status: "operational" },
  { name: "AI Synthesis Pipeline", status: "operational" },
  { name: "Market Data Feeds", status: "operational" },
  { name: "OSINT Ingestion", status: "operational" },
  { name: "Knowledge Bank", status: "operational" },
  { name: "Trading Integrations", status: "operational" },
  { name: "Authentication", status: "operational" },
  { name: "API Gateway", status: "operational" },
];

const statusConfig = {
  operational: { label: "Operational", color: "bg-accent-emerald", text: "text-accent-emerald" },
  degraded: { label: "Degraded", color: "bg-accent-amber", text: "text-accent-amber" },
  outage: { label: "Outage", color: "bg-accent-rose", text: "text-accent-rose" },
};

export default function StatusPage() {
  const allOperational = systems.every((s) => s.status === "operational");

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px flex-1 max-w-12 bg-accent-cyan/40" />
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent-cyan/70">
            Infrastructure
          </span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-navy-100 mb-4">
          System Status
        </h1>

        {/* Overall status */}
        <div className="border border-navy-700/40 rounded-lg bg-navy-900/40 p-6 mb-8">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                allOperational ? "bg-accent-emerald" : "bg-accent-amber"
              }`}
            />
            <span className="font-mono text-sm font-semibold text-navy-100">
              {allOperational
                ? "All Systems Operational"
                : "Some Systems Experiencing Issues"}
            </span>
          </div>
        </div>

        {/* Individual systems */}
        <div className="border border-navy-700/40 rounded-lg bg-navy-900/40 overflow-hidden">
          {systems.map((system, i) => {
            const config =
              statusConfig[system.status as keyof typeof statusConfig];
            return (
              <div
                key={system.name}
                className={`flex items-center justify-between px-6 py-4 ${
                  i < systems.length - 1 ? "border-b border-navy-700/20" : ""
                }`}
              >
                <span className="font-sans text-sm text-navy-200">
                  {system.name}
                </span>
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${config.color}`} />
                  <span
                    className={`font-mono text-[10px] uppercase tracking-wider ${config.text}`}
                  >
                    {config.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-6 font-sans text-xs text-navy-500 text-center">
          Status is updated automatically. For urgent issues, contact{" "}
          <a
            href="mailto:hello@nexushq.xyz"
            className="text-accent-cyan hover:text-accent-cyan/80 transition-colors"
          >
            hello@nexushq.xyz
          </a>
        </p>
      </div>
    </main>
  );
}
