"use client";



const steps = [
  {
    number: "01",
    title: "Multi-Layer Signal Detection",
    color: "text-accent-cyan",
    borderColor: "border-accent-cyan/30",
    bgColor: "bg-accent-cyan/5",
    layers: [
      { label: "GEOPOLITICAL", desc: "Conflict escalation, sanctions, diplomatic shifts, OSINT event feeds" },
      { label: "CELESTIAL", desc: "Planetary transits, eclipses, retrograde cycles, and historically correlated market patterns" },
      { label: "CALENDAR", desc: "Hebrew calendar events, Islamic observances, seasonal cycles, and numerological markers" },
      { label: "MARKET", desc: "Options flow anomalies, volatility regime changes, cross-asset divergences, macro indicators" },
    ],
    body: "NEXUS continuously monitors four distinct signal layers. Each layer operates on its own detection engine, scanning for events and anomalies that have historically preceded market dislocations. Signals are tagged with metadata including date, category, affected sectors, and an initial intensity score from 1 to 5.",
  },
  {
    number: "02",
    title: "Convergence Analysis",
    color: "text-accent-amber",
    borderColor: "border-accent-amber/30",
    bgColor: "bg-accent-amber/5",
    body: "The convergence engine identifies temporal and thematic overlaps between signals from different layers. When a geopolitical escalation coincides with a celestial transit and a calendar event, the convergence score increases multiplicatively. This is the core thesis of NEXUS: markets respond most dramatically when multiple, independent signal sources align within a narrow time window. Each convergence is scored on layer count, temporal proximity, historical precedent strength, and sector overlap.",
  },
  {
    number: "03",
    title: "AI-Driven Synthesis",
    color: "text-accent-emerald",
    borderColor: "border-accent-emerald/30",
    bgColor: "bg-accent-emerald/5",
    body: "Converged signal clusters are passed to Claude for deep analysis. The AI synthesises raw signal data into structured intelligence briefs that include directional market impact assessment, escalation probability, specific trade recommendations with entry/exit levels, risk factor enumeration, and historical parallels. The prompt framework is calibrated to produce actionable output rather than generic commentary, grounding every recommendation in the specific signal data.",
  },
  {
    number: "04",
    title: "Feedback Loops",
    color: "text-accent-rose",
    borderColor: "border-accent-rose/30",
    bgColor: "bg-accent-rose/5",
    body: "After a signal window closes, NEXUS runs backtests against actual market data to measure prediction accuracy. Price movements across recommended tickers are tracked at +7, +14, and +30 day intervals. These outcomes feed back into the system: layer weights are adjusted, convergence scoring thresholds are refined, and the AI prompt framework is updated to reflect which signal patterns produced accurate forecasts and which did not. This creates a self-improving loop where each prediction cycle makes the next one sharper.",
  },
];

export default function MethodologyPage() {
  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto pt-24">
      <div className="mb-10">
        <h1 className="text-lg font-bold uppercase tracking-widest text-navy-100">Methodology</h1>
        <p className="mt-1 text-xs text-navy-400">How NEXUS approaches geopolitical-market intelligence</p>
      </div>
      {/* Overview */}
      <div className="mb-8 border border-navy-700/40 rounded bg-navy-900/50 p-6">
        <h2 className="font-mono text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-3">
          Overview
        </h2>
        <p className="font-sans text-sm text-navy-200 leading-relaxed max-w-3xl">
          NEXUS is a multi-layer intelligence system that detects signals across
          geopolitical, celestial, calendar, and market domains, then scores
          their convergence to surface high-conviction trading opportunities.
          The platform combines automated signal detection with AI-driven
          analysis to produce actionable intelligence briefs, and continuously
          refines its models through outcome-based feedback loops.
        </p>

        {/* Pipeline diagram */}
        <div className="mt-6 flex items-center gap-0 overflow-x-auto">
          {["DETECT", "CONVERGE", "SYNTHESISE", "VALIDATE"].map((step, i) => (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className="font-mono text-[9px] text-navy-500 mb-1">
                  PHASE {i + 1}
                </div>
                <div className="border border-navy-700 rounded px-4 py-2 bg-navy-900/80">
                  <span className="font-mono text-[11px] tracking-wider text-navy-100">
                    {step}
                  </span>
                </div>
              </div>
              {i < 3 && (
                <div className="mx-3 flex items-center">
                  <div className="w-8 h-px bg-navy-700" />
                  <div className="w-0 h-0 border-t-[3px] border-b-[3px] border-l-[5px] border-transparent border-l-navy-500" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Methodology Steps */}
      <div className="space-y-6">
        {steps.map((step) => (
          <div
            key={step.number}
            className={`border ${step.borderColor} rounded ${step.bgColor} p-6`}
          >
            <div className="flex items-start gap-4">
              {/* Step number */}
              <div className="flex-shrink-0">
                <div
                  className={`font-mono text-2xl font-bold ${step.color} opacity-60`}
                >
                  {step.number}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3
                  className={`font-mono text-xs font-medium uppercase tracking-widest ${step.color} mb-3`}
                >
                  {step.title}
                </h3>
                <p className="font-sans text-sm text-navy-200 leading-relaxed mb-4 max-w-3xl">
                  {step.body}
                </p>

                {/* Layer sub-items for step 01 */}
                {step.layers && (
                  <div className="grid grid-cols-2 gap-3">
                    {step.layers.map((layer) => (
                      <div
                        key={layer.label}
                        className="border border-navy-700/40 rounded px-3 py-2 bg-navy-900/40"
                      >
                        <div className="font-mono text-[9px] uppercase tracking-wider text-navy-400 mb-1">
                          {layer.label}
                        </div>
                        <div className="font-sans text-[11px] text-navy-400 leading-snug">
                          {layer.desc}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-12 rounded border border-navy-700/40 bg-navy-900/50 p-8 text-center">
        <h3 className="font-mono text-sm font-semibold uppercase tracking-widest text-navy-100 mb-2">
          See the methodology in action
        </h3>
        <p className="font-sans text-sm text-navy-400 mb-5 max-w-lg mx-auto">
          Access the full NEXUS platform to explore live signal detection, convergence analysis, and AI-driven intelligence briefs.
        </p>
        <a
          href="/register"
          className="inline-block px-6 py-2.5 font-mono text-[11px] uppercase tracking-widest text-navy-100 bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.1] hover:border-white/[0.15] transition-all"
        >
          Request Access
        </a>
      </div>
    </main>
  );
}
