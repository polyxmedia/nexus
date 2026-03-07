"use client";



const STATS = [
  { label: "Predictions Tracked", value: "1,247" },
  { label: "Overall Hit Rate", value: "68.3%" },
  { label: "Avg Brier Score", value: "0.187" },
  { label: "Calibration Error", value: "4.2%" },
];

const SCORECARD = [
  {
    prediction: "USD/JPY breaks below 148 support",
    category: "Market",
    confidence: "82%",
    outcome: "hit",
    brierContribution: 0.032,
  },
  {
    prediction: "OPEC+ extends production cuts through Q2",
    category: "Geopolitical",
    confidence: "71%",
    outcome: "hit",
    brierContribution: 0.084,
  },
  {
    prediction: "Escalation on Korean peninsula within 30 days",
    category: "Geopolitical",
    confidence: "35%",
    outcome: "hit",
    brierContribution: 0.122,
  },
  {
    prediction: "BTC correlation spike with equities",
    category: "Market",
    confidence: "76%",
    outcome: "miss",
    brierContribution: 0.578,
  },
  {
    prediction: "EU sanctions package triggers RUB volatility",
    category: "Geopolitical",
    confidence: "64%",
    outcome: "hit",
    brierContribution: 0.130,
  },
  {
    prediction: "Mercury retrograde period correlates with VIX spike",
    category: "Celestial",
    confidence: "41%",
    outcome: "miss",
    brierContribution: 0.348,
  },
  {
    prediction: "Gold tests $2,400 resistance on CPI print",
    category: "Market",
    confidence: "79%",
    outcome: "hit",
    brierContribution: 0.044,
  },
  {
    prediction: "Taiwan Strait naval activity increase",
    category: "Geopolitical",
    confidence: "58%",
    outcome: "miss",
    brierContribution: 0.336,
  },
];

const CATEGORIES = [
  {
    name: "Market Signals",
    accuracy: "74.1%",
    brier: "0.152",
    count: 612,
    status: "Operational",
  },
  {
    name: "Geopolitical Events",
    accuracy: "63.8%",
    brier: "0.214",
    count: 489,
    status: "Operational",
  },
  {
    name: "Celestial Correlations",
    accuracy: "47.2%",
    brier: "0.309",
    count: 146,
    status: "Validating",
  },
];

export default function PredictionAccuracyPage() {
  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto pt-24">
      <div className="mb-10">
        <h1 className="text-lg font-bold uppercase tracking-widest text-navy-100">Prediction Accuracy</h1>
        <p className="mt-1 text-xs text-navy-400">Tracking, calibration, and transparency of NEXUS predictive outputs</p>
      </div>
      <div className="space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded border border-navy-700/40 bg-navy-900/50 p-4"
            >
              <p className="font-mono text-[10px] uppercase tracking-widest text-navy-400">
                {stat.label}
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-navy-100">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Brier Score */}
        <section className="rounded border border-navy-700/40 bg-navy-900/50 p-6">
          <h2 className="font-mono text-xs uppercase tracking-widest text-navy-100">
            1. Brier Score
          </h2>
          <div className="mt-4 space-y-3 font-sans text-sm leading-relaxed text-navy-400">
            <p>
              The Brier score is the primary metric NEXUS uses to evaluate
              prediction quality. It measures the mean squared difference
              between predicted probabilities and actual outcomes. A score of
              0.0 represents perfect prediction, while 1.0 represents the worst
              possible score.
            </p>
            <p>
              For each resolved prediction, the Brier score is calculated as
              (forecast probability - outcome)^2, where outcome is 1 if the
              event occurred and 0 if it did not. A model that assigns 0.9
              probability to an event that occurs receives a Brier contribution
              of 0.01, while assigning 0.9 to an event that does not occur
              yields 0.81.
            </p>
            <p>
              NEXUS maintains a rolling 90-day Brier score alongside a
              lifetime aggregate. The rolling window allows detection of
              calibration drift, where the model begins systematically
              over- or under-estimating probabilities in a particular domain.
            </p>
          </div>
        </section>

        {/* Calibration */}
        <section className="rounded border border-navy-700/40 bg-navy-900/50 p-6">
          <h2 className="font-mono text-xs uppercase tracking-widest text-navy-100">
            2. Calibration
          </h2>
          <div className="mt-4 space-y-3 font-sans text-sm leading-relaxed text-navy-400">
            <p>
              A well-calibrated prediction system produces forecasts whose
              stated probabilities match observed frequencies. When NEXUS
              assigns a 70% probability to a class of events, those events
              should occur approximately 70% of the time across a sufficient
              sample.
            </p>
            <p>
              Calibration is assessed by bucketing predictions into probability
              bins (0-10%, 10-20%, etc.) and comparing the average predicted
              probability in each bin to the actual hit rate. The calibration
              error is the mean absolute deviation between predicted and
              observed frequencies across all bins.
            </p>
            <p>
              NEXUS currently exhibits slight overconfidence in the 60-80%
              range, a known bias that the self-calibration feedback loop is
              actively correcting. Predictions below 30% and above 90% show
              strong calibration alignment.
            </p>
          </div>
        </section>

        {/* Category Breakdown */}
        <section className="rounded border border-navy-700/40 bg-navy-900/50 p-6">
          <h2 className="font-mono text-xs uppercase tracking-widest text-navy-100">
            3. Category Breakdown
          </h2>
          <p className="mt-4 font-sans text-sm leading-relaxed text-navy-400">
            Prediction accuracy varies by domain. Market signals benefit from
            higher data density and faster feedback loops. Geopolitical
            predictions operate on longer timelines with more confounding
            variables. Celestial correlations remain in an experimental
            validation phase with insufficient sample size for definitive
            conclusions.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-navy-700/40">
                  <th className="pb-2 font-mono text-[10px] uppercase tracking-widest text-navy-400">
                    Category
                  </th>
                  <th className="pb-2 font-mono text-[10px] uppercase tracking-widest text-navy-400">
                    Accuracy
                  </th>
                  <th className="pb-2 font-mono text-[10px] uppercase tracking-widest text-navy-400">
                    Brier Score
                  </th>
                  <th className="pb-2 font-mono text-[10px] uppercase tracking-widest text-navy-400">
                    Sample Size
                  </th>
                  <th className="pb-2 font-mono text-[10px] uppercase tracking-widest text-navy-400">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {CATEGORIES.map((cat) => (
                  <tr
                    key={cat.name}
                    className="border-b border-navy-700/20"
                  >
                    <td className="py-3 font-mono text-xs text-navy-100">
                      {cat.name}
                    </td>
                    <td className="py-3 font-mono text-xs text-navy-100">
                      {cat.accuracy}
                    </td>
                    <td className="py-3 font-mono text-xs text-navy-100">
                      {cat.brier}
                    </td>
                    <td className="py-3 font-mono text-xs text-navy-400">
                      {cat.count}
                    </td>
                    <td className="py-3">
                      <span
                        className={`font-mono text-[10px] uppercase tracking-widest ${
                          cat.status === "Operational"
                            ? "text-accent-emerald"
                            : "text-amber-400"
                        }`}
                      >
                        {cat.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Self-Calibration Feedback */}
        <section className="rounded border border-navy-700/40 bg-navy-900/50 p-6">
          <h2 className="font-mono text-xs uppercase tracking-widest text-navy-100">
            4. Self-Calibration Feedback
          </h2>
          <div className="mt-4 space-y-3 font-sans text-sm leading-relaxed text-navy-400">
            <p>
              Every resolved prediction feeds back into the NEXUS calibration
              engine. When a prediction resolves (the event either occurs or
              the prediction window expires), the system records the outcome
              against the original forecast and updates category-level
              calibration weights.
            </p>
            <p>
              The feedback loop operates on three timescales. Immediate
              adjustment applies a Bayesian update to the confidence modifier
              for the specific signal type. Weekly recalibration recomputes
              bin-level calibration curves across all categories. Monthly
              review triggers a full model audit that can adjust base rates,
              feature weights, and confidence thresholds.
            </p>
            <p>
              This process has reduced the 90-day rolling Brier score from
              0.241 at system launch to the current 0.187, a 22.4% improvement
              over 14 months of operation.
            </p>
          </div>
        </section>

        {/* Transparency */}
        <section className="rounded border border-navy-700/40 bg-navy-900/50 p-6">
          <h2 className="font-mono text-xs uppercase tracking-widest text-navy-100">
            5. Transparency
          </h2>
          <div className="mt-4 space-y-3 font-sans text-sm leading-relaxed text-navy-400">
            <p>
              Every prediction generated by NEXUS is immutably logged with a
              full audit trail. Each record includes the prediction timestamp,
              stated confidence level, the reasoning chain that produced the
              forecast, contributing signal IDs, and the eventual outcome once
              resolved.
            </p>
            <p>
              Predictions cannot be retroactively modified or deleted. The
              confidence level assigned at creation time is the score used for
              all accuracy calculations. This prevents survivorship bias and
              ensures the accuracy metrics reported above reflect true
              forecasting performance.
            </p>
            <p>
              All prediction records are queryable through the NEXUS chat
              interface and accessible via the Predictions page. Users can
              filter by category, confidence range, outcome, and time period
              to perform their own accuracy analysis.
            </p>
          </div>
        </section>

        {/* Sample Monthly Scorecard */}
        <section className="rounded border border-navy-700/40 bg-navy-900/50 p-6">
          <h2 className="font-mono text-xs uppercase tracking-widest text-navy-100">
            6. Sample Monthly Scorecard
          </h2>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-navy-400">
            February 2026 - Sample Period
          </p>
          <div className="mt-4 grid grid-cols-3 gap-4 lg:grid-cols-5">
            <div className="rounded border border-navy-700/40 bg-navy-950/50 p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-navy-400">
                Total Predictions
              </p>
              <p className="mt-1 font-mono text-lg font-bold text-navy-100">
                8
              </p>
            </div>
            <div className="rounded border border-navy-700/40 bg-navy-950/50 p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-navy-400">
                Hit Rate
              </p>
              <p className="mt-1 font-mono text-lg font-bold text-accent-emerald">
                62.5%
              </p>
            </div>
            <div className="rounded border border-navy-700/40 bg-navy-950/50 p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-navy-400">
                Brier Score
              </p>
              <p className="mt-1 font-mono text-lg font-bold text-navy-100">
                0.209
              </p>
            </div>
            <div className="rounded border border-navy-700/40 bg-navy-950/50 p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-navy-400">
                Hits
              </p>
              <p className="mt-1 font-mono text-lg font-bold text-accent-emerald">
                5
              </p>
            </div>
            <div className="rounded border border-navy-700/40 bg-navy-950/50 p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-navy-400">
                Misses
              </p>
              <p className="mt-1 font-mono text-lg font-bold text-accent-rose">
                3
              </p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-navy-700/40">
                  <th className="pb-2 font-mono text-[10px] uppercase tracking-widest text-navy-400">
                    Prediction
                  </th>
                  <th className="pb-2 font-mono text-[10px] uppercase tracking-widest text-navy-400">
                    Category
                  </th>
                  <th className="pb-2 font-mono text-[10px] uppercase tracking-widest text-navy-400">
                    Confidence
                  </th>
                  <th className="pb-2 font-mono text-[10px] uppercase tracking-widest text-navy-400">
                    Outcome
                  </th>
                  <th className="pb-2 font-mono text-[10px] uppercase tracking-widest text-navy-400">
                    Brier
                  </th>
                </tr>
              </thead>
              <tbody>
                {SCORECARD.map((row) => (
                  <tr
                    key={row.prediction}
                    className="border-b border-navy-700/20"
                  >
                    <td className="max-w-xs py-3 font-sans text-xs text-navy-300">
                      {row.prediction}
                    </td>
                    <td className="py-3 font-mono text-[10px] uppercase tracking-widest text-navy-400">
                      {row.category}
                    </td>
                    <td className="py-3 font-mono text-xs text-navy-100">
                      {row.confidence}
                    </td>
                    <td className="py-3">
                      <span
                        className={`font-mono text-[10px] font-bold uppercase tracking-widest ${
                          row.outcome === "hit"
                            ? "text-accent-emerald"
                            : "text-accent-rose"
                        }`}
                      >
                        {row.outcome}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-xs text-navy-400">
                      {row.brierContribution.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 rounded border border-navy-700/20 bg-navy-950/30 p-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-navy-400">
              Month-over-Month Brier Improvement
            </p>
            <p className="mt-1 font-mono text-sm text-accent-emerald">
              -0.018 (7.9% improvement vs January 2026)
            </p>
          </div>
        </section>

        {/* CTA */}
        <div className="rounded border border-navy-700/40 bg-navy-900/50 p-8 text-center">
          <h3 className="font-mono text-sm font-semibold uppercase tracking-widest text-navy-100 mb-2">
            Review the full prediction log
          </h3>
          <p className="font-sans text-sm text-navy-400 mb-5 max-w-lg mx-auto">
            Every NEXUS prediction is logged with full audit trails. Access the platform to query predictions by category, confidence, and outcome.
          </p>
          <a
            href="/register"
            className="inline-block px-6 py-2.5 font-mono text-[11px] uppercase tracking-widest text-navy-100 bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.1] hover:border-white/[0.15] transition-all"
          >
            Request Access
          </a>
        </div>
      </div>
    </main>
  );
}
