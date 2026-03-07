"use client";



const intensityLevels = [
  {
    level: 1,
    label: "Background Noise",
    description:
      "Routine events with minimal predictive value. Standard diplomatic communications, scheduled policy announcements, minor market fluctuations within normal range.",
    color: "text-accent-emerald",
    border: "border-accent-emerald/30",
  },
  {
    level: 2,
    label: "Low Activity",
    description:
      "Events that deviate slightly from baseline. Unusual troop movements, unexpected central bank commentary, minor calendar convergences. Worth monitoring but not actionable alone.",
    color: "text-accent-emerald",
    border: "border-accent-emerald/30",
  },
  {
    level: 3,
    label: "Elevated",
    description:
      "Clear departure from normal patterns. Multiple corroborating data points across at least two signal layers. Warrants active tracking and scenario planning.",
    color: "text-accent-amber",
    border: "border-accent-amber/30",
  },
  {
    level: 4,
    label: "High Alert",
    description:
      "Strong convergence across three or more layers. Historical pattern matching indicates significant probability of a disruptive event. Position sizing and hedging recommended.",
    color: "text-accent-rose",
    border: "border-accent-rose/30",
  },
  {
    level: 5,
    label: "Critical Convergence",
    description:
      "Maximum signal density. Rare alignment of geopolitical, calendar, celestial, and market signals. Historically associated with regime-changing events, black swans, and major inflection points.",
    color: "text-accent-rose",
    border: "border-accent-rose/30",
  },
];

const signalLayers = [
  {
    name: "Geopolitical",
    tag: "GEO",
    description:
      "Conflicts, treaties, sanctions, regime changes, military deployments, and diplomatic shifts. Sourced from government publications, defense intelligence, and verified reporting networks.",
    examples: [
      "Troop mobilisation along contested borders",
      "Sanctions packages targeting energy exports",
      "Treaty withdrawals or renegotiations",
    ],
  },
  {
    name: "Calendar",
    tag: "CAL",
    description:
      "Hebrew holidays, Islamic calendar events, FOMC meetings, options expiry dates, fiscal year boundaries, and seasonal economic patterns. Many significant historical events cluster around specific calendar dates.",
    examples: [
      "FOMC rate decisions and dot-plot releases",
      "Quadruple witching / options expiry",
      "Hebrew calendar holidays and sabbatical cycles",
    ],
  },
  {
    name: "Celestial",
    tag: "CEL",
    description:
      "Eclipses, planetary alignments, lunar cycles, and solar activity. Studied not for causation but for historical correlation with volatility clusters and sentiment shifts in markets.",
    examples: [
      "Solar and lunar eclipses",
      "Mercury retrograde periods",
      "Sunspot cycle peaks and troughs",
    ],
  },
  {
    name: "Market",
    tag: "MKT",
    description:
      "Price action anomalies, unusual volume, options flow, dark pool activity, credit spreads, and cross-asset divergences. The quantitative backbone of signal detection.",
    examples: [
      "Unusual put/call ratio spikes",
      "Credit default swap widening",
      "Cross-asset correlation breakdowns",
    ],
  },
  {
    name: "OSINT",
    tag: "OSI",
    description:
      "Open source intelligence from social media, satellite imagery, shipping data, flight tracking, and news wire services. Real-time ground truth that validates or contradicts signals from other layers.",
    examples: [
      "Military aircraft transponder anomalies",
      "Shipping route diversions near conflict zones",
      "GDELT event spike detection",
    ],
  },
];

export default function SignalTheoryPage() {
  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto pt-24">
      <div className="mb-10">
        <h1 className="text-lg font-bold uppercase tracking-widest text-navy-100">Signal Theory</h1>
        <p className="mt-1 text-xs text-navy-400">Theoretical framework behind NEXUS signal detection and convergence analysis</p>
      </div>
      <div className="max-w-4xl space-y-10">
        {/* Section 1: What is a Signal? */}
        <section>
          <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-100">
            01 / What is a Signal
          </h2>
          <div className="mt-3 rounded border border-navy-700/40 bg-navy-900/50 p-5">
            <p className="font-sans text-sm leading-relaxed text-navy-400">
              In the NEXUS context, a signal is a discrete event or data point
              that indicates a potential geopolitical or market shift. Signals
              are not predictions. They are observable phenomena, fragments of
              information drawn from structured and unstructured sources, that
              carry forward-looking implications when analysed in combination.
            </p>
            <p className="mt-3 font-sans text-sm leading-relaxed text-navy-400">
              A single signal in isolation is noise. Multiple signals
              converging across independent layers constitute a pattern worth
              acting on. The NEXUS engine continuously ingests, scores, and
              correlates signals to surface these convergence events before
              they become consensus.
            </p>
          </div>
        </section>

        {/* Section 2: Signal Layers */}
        <section>
          <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-100">
            02 / Signal Layers
          </h2>
          <p className="mt-2 font-sans text-sm text-navy-400">
            NEXUS operates across five distinct signal layers. Each layer
            captures a different dimension of the information landscape.
          </p>
          <div className="mt-4 space-y-3">
            {signalLayers.map((layer) => (
              <div
                key={layer.tag}
                className="rounded border border-navy-700/40 bg-navy-900/50 p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-navy-100 rounded bg-navy-800 px-2 py-0.5">
                    {layer.tag}
                  </span>
                  <h3 className="font-mono text-sm font-semibold text-navy-100">
                    {layer.name}
                  </h3>
                </div>
                <p className="mt-2 font-sans text-sm leading-relaxed text-navy-400">
                  {layer.description}
                </p>
                <ul className="mt-3 space-y-1">
                  {layer.examples.map((ex) => (
                    <li
                      key={ex}
                      className="flex items-start gap-2 font-sans text-xs text-navy-500"
                    >
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-navy-600" />
                      {ex}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Intensity Scoring */}
        <section>
          <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-100">
            03 / Intensity Scoring
          </h2>
          <p className="mt-2 font-sans text-sm text-navy-400">
            Every signal receives an intensity score on a 1-5 scale. The score
            reflects both the signal's standalone significance and its
            correlation density with other active signals.
          </p>
          <div className="mt-4 space-y-2">
            {intensityLevels.map((level) => (
              <div
                key={level.level}
                className={`flex items-start gap-4 rounded border ${level.border} bg-navy-900/50 p-4`}
              >
                <span
                  className={`font-mono text-2xl font-bold ${level.color}`}
                >
                  {level.level}
                </span>
                <div>
                  <h3
                    className={`font-mono text-xs font-semibold uppercase tracking-widest ${level.color}`}
                  >
                    {level.label}
                  </h3>
                  <p className="mt-1 font-sans text-sm leading-relaxed text-navy-400">
                    {level.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 4: Signal Decay */}
        <section>
          <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-100">
            04 / Signal Decay
          </h2>
          <div className="mt-3 rounded border border-navy-700/40 bg-navy-900/50 p-5">
            <p className="font-sans text-sm leading-relaxed text-navy-400">
              Signals are not permanent. Every signal has a half-life, a
              duration after which its relevance decays by 50%. The decay rate
              varies by layer and signal type.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded bg-navy-800/60 p-3">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-navy-300">
                  Fast Decay
                </span>
                <p className="mt-1 font-sans text-xs text-navy-400">
                  Market signals (hours to days). Price action and flow data
                  lose predictive power rapidly as they get priced in.
                </p>
              </div>
              <div className="rounded bg-navy-800/60 p-3">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-navy-300">
                  Medium Decay
                </span>
                <p className="mt-1 font-sans text-xs text-navy-400">
                  OSINT and geopolitical signals (days to weeks). Ground-truth
                  events remain relevant until the situation resolves or
                  escalates.
                </p>
              </div>
              <div className="rounded bg-navy-800/60 p-3">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-navy-300">
                  Slow Decay
                </span>
                <p className="mt-1 font-sans text-xs text-navy-400">
                  Calendar and celestial signals (weeks to months). Scheduled
                  events have long lead times and their influence builds as the
                  date approaches.
                </p>
              </div>
              <div className="rounded bg-navy-800/60 p-3">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-navy-300">
                  Persistent
                </span>
                <p className="mt-1 font-sans text-xs text-navy-400">
                  Structural geopolitical shifts (months to years). Sanctions
                  regimes, alliance changes, and territorial disputes create
                  long-duration signal fields.
                </p>
              </div>
            </div>
            <p className="mt-4 font-sans text-sm leading-relaxed text-navy-400">
              The decay function follows an exponential curve. A signal's
              effective intensity at time <span className="font-mono text-navy-300">t</span> is
              calculated as <span className="font-mono text-navy-300">I(t) = I0 * e^(-lambda * t)</span>,
              where <span className="font-mono text-navy-300">lambda</span> is
              the decay constant derived from the signal's half-life.
            </p>
          </div>
        </section>

        {/* Section 5: Cross-Layer Amplification */}
        <section>
          <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-100">
            05 / Cross-Layer Amplification
          </h2>
          <div className="mt-3 rounded border border-navy-700/40 bg-navy-900/50 p-5">
            <p className="font-sans text-sm leading-relaxed text-navy-400">
              The core insight of NEXUS signal theory: when signals from
              independent layers converge temporally, their combined intensity
              is greater than the sum of parts. This is cross-layer
              amplification.
            </p>
            <p className="mt-3 font-sans text-sm leading-relaxed text-navy-400">
              Two simultaneous Level 2 signals from different layers do not
              produce a Level 4. Instead, the convergence is scored using a
              non-linear amplification function that accounts for the
              independence of the source layers. Signals from highly
              independent layers (e.g. celestial + market) receive a stronger
              amplification multiplier than signals from correlated layers
              (e.g. geopolitical + OSINT).
            </p>
            <div className="mt-4 rounded bg-navy-800/60 p-4">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-navy-300">
                Amplification Matrix
              </span>
              <div className="mt-3 space-y-2 font-mono text-xs text-navy-400">
                <div className="flex justify-between border-b border-navy-700/30 pb-1">
                  <span>2 layers converging</span>
                  <span className="text-accent-emerald">1.4x multiplier</span>
                </div>
                <div className="flex justify-between border-b border-navy-700/30 pb-1">
                  <span>3 layers converging</span>
                  <span className="text-accent-amber">2.1x multiplier</span>
                </div>
                <div className="flex justify-between border-b border-navy-700/30 pb-1">
                  <span>4 layers converging</span>
                  <span className="text-accent-rose">3.2x multiplier</span>
                </div>
                <div className="flex justify-between">
                  <span>5 layers converging</span>
                  <span className="text-accent-rose">5.0x multiplier</span>
                </div>
              </div>
            </div>
            <p className="mt-4 font-sans text-sm leading-relaxed text-navy-400">
              Full five-layer convergence is exceptionally rare. When it
              occurs, the system flags a Level 5 critical convergence event
              regardless of the individual signal intensities. Historical
              back-testing shows these events precede major market dislocations
              or geopolitical inflection points within a 72-hour window.
            </p>
          </div>
        </section>
      </div>

      {/* CTA */}
      <div className="mt-12 rounded border border-navy-700/40 bg-navy-900/50 p-8 text-center">
        <h3 className="font-mono text-sm font-semibold uppercase tracking-widest text-navy-100 mb-2">
          Explore live signals
        </h3>
        <p className="font-sans text-sm text-navy-400 mb-5 max-w-lg mx-auto">
          Monitor real-time signal detection across all five layers with intensity scoring and convergence alerts.
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
