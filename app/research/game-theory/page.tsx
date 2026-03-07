"use client";



export default function GameTheoryPage() {
  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto pt-24">
      <div className="mb-10">
        <h1 className="text-lg font-bold uppercase tracking-widest text-navy-100">Game Theory Models</h1>
        <p className="mt-1 text-xs text-navy-400">Strategic decision frameworks applied to geopolitical analysis</p>
      </div>
      <div className="space-y-8 max-w-4xl">
        {/* Why Game Theory */}
        <section className="rounded border border-navy-700/40 bg-navy-900/50 p-6">
          <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-navy-100 mb-3">
            01 / Why Game Theory
          </h2>
          <p className="font-sans text-sm leading-relaxed text-navy-400">
            Geopolitical actors operate as rational (or bounded-rational) agents
            pursuing strategic objectives under uncertainty. Game theory provides
            formal frameworks to model these interactions, predict likely
            outcomes, and identify leverage points. NEXUS applies classical and
            evolutionary game theory to conflicts, trade disputes, alliance
            formation, and deterrence scenarios, transforming qualitative
            intelligence into structured, quantifiable analysis.
          </p>
        </section>

        {/* Nash Equilibrium Analysis */}
        <section className="rounded border border-navy-700/40 bg-navy-900/50 p-6">
          <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-navy-100 mb-3">
            02 / Nash Equilibrium Analysis
          </h2>
          <p className="font-sans text-sm leading-relaxed text-navy-400 mb-4">
            A Nash Equilibrium represents a stable state where no actor can
            improve their position by unilaterally changing strategy. NEXUS
            identifies these equilibria across active geopolitical conflicts to
            determine which outcomes are self-reinforcing and which are unstable.
          </p>
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <span className="font-mono text-xs text-signal-4 shrink-0">IRAN-US</span>
              <span className="font-sans text-xs text-navy-400">
                Mutual deterrence equilibrium sustained by sanctions pressure
                and nuclear threshold positioning. Deviation by either side
                risks asymmetric escalation.
              </span>
            </div>
            <div className="flex items-start gap-3">
              <span className="font-mono text-xs text-signal-4 shrink-0">CHINA-TAIWAN</span>
              <span className="font-sans text-xs text-navy-400">
                Status quo equilibrium maintained through strategic ambiguity.
                NEXUS models show this equilibrium is fragile under domestic
                political pressure shifts in Beijing.
              </span>
            </div>
            <div className="flex items-start gap-3">
              <span className="font-mono text-xs text-signal-4 shrink-0">RUSSIA-NATO</span>
              <span className="font-sans text-xs text-navy-400">
                Post-2022 equilibrium characterized by attritional conflict
                with bounded escalation. Both sides operate within implicit
                red lines to avoid direct confrontation.
              </span>
            </div>
          </div>
        </section>

        {/* Escalation Ladders */}
        <section className="rounded border border-navy-700/40 bg-navy-900/50 p-6">
          <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-navy-100 mb-3">
            03 / Escalation Ladders
          </h2>
          <p className="font-sans text-sm leading-relaxed text-navy-400 mb-4">
            NEXUS models escalation as a discrete ladder of steps, each with
            measurable indicators and transition probabilities. Identifying
            tipping points allows analysts to flag when a conflict is
            approaching a threshold beyond which de-escalation becomes
            structurally difficult.
          </p>
          <div className="space-y-1">
            {[
              { level: "L1", label: "Diplomatic Tensions", color: "text-signal-1" },
              { level: "L2", label: "Economic Sanctions", color: "text-signal-2" },
              { level: "L3", label: "Proxy Engagements", color: "text-signal-3" },
              { level: "L4", label: "Military Posturing", color: "text-signal-4" },
              { level: "L5", label: "Direct Confrontation", color: "text-signal-5" },
            ].map((step) => (
              <div
                key={step.level}
                className="flex items-center gap-3 rounded bg-navy-900/80 px-3 py-2 border border-navy-700/20"
              >
                <span className={`font-mono text-xs font-bold ${step.color}`}>
                  {step.level}
                </span>
                <div className="h-px flex-1 bg-navy-700/40" />
                <span className="font-sans text-xs text-navy-400">
                  {step.label}
                </span>
              </div>
            ))}
            <p className="font-sans text-xs text-navy-500 mt-3">
              Tipping point analysis focuses on L3-L4 transitions, where
              miscalculation risk peaks and signalling becomes ambiguous.
            </p>
          </div>
        </section>

        {/* Payoff Matrices */}
        <section className="rounded border border-navy-700/40 bg-navy-900/50 p-6">
          <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-navy-100 mb-3">
            04 / Payoff Matrices
          </h2>
          <p className="font-sans text-sm leading-relaxed text-navy-400 mb-4">
            NEXUS constructs payoff matrices by scoring outcomes across three
            dimensions: economic cost, military capability balance, and domestic
            political impact. Each cell represents a combined utility score
            for the actors involved.
          </p>

          {/* 2x2 Payoff Matrix Example */}
          <div className="mb-4">
            <p className="font-mono text-xs text-navy-500 mb-3 uppercase tracking-wider">
              Example: Simplified Deterrence Game
            </p>
            <div className="overflow-hidden rounded border border-navy-700/40">
              <table className="w-full text-center">
                <thead>
                  <tr>
                    <th className="bg-navy-900/80 p-3 border-b border-r border-navy-700/40">
                      <span className="font-mono text-xs text-navy-500" />
                    </th>
                    <th className="bg-navy-900/80 p-3 border-b border-r border-navy-700/40">
                      <span className="font-mono text-xs text-navy-100">
                        Actor B: Cooperate
                      </span>
                    </th>
                    <th className="bg-navy-900/80 p-3 border-b border-navy-700/40">
                      <span className="font-mono text-xs text-navy-100">
                        Actor B: Defect
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="bg-navy-900/80 p-3 border-b border-r border-navy-700/40">
                      <span className="font-mono text-xs text-navy-100">
                        Actor A: Cooperate
                      </span>
                    </td>
                    <td className="p-3 border-b border-r border-navy-700/40 bg-navy-900/30">
                      <span className="font-mono text-xs text-signal-1 font-bold">
                        +3, +3
                      </span>
                      <br />
                      <span className="font-sans text-[10px] text-navy-500">
                        Mutual restraint
                      </span>
                    </td>
                    <td className="p-3 border-b border-navy-700/40 bg-navy-900/30">
                      <span className="font-mono text-xs text-signal-5 font-bold">
                        -5, +5
                      </span>
                      <br />
                      <span className="font-sans text-[10px] text-navy-500">
                        Exploited / Aggressor gains
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-navy-900/80 p-3 border-r border-navy-700/40">
                      <span className="font-mono text-xs text-navy-100">
                        Actor A: Defect
                      </span>
                    </td>
                    <td className="p-3 border-r border-navy-700/40 bg-navy-900/30">
                      <span className="font-mono text-xs text-signal-5 font-bold">
                        +5, -5
                      </span>
                      <br />
                      <span className="font-sans text-[10px] text-navy-500">
                        Aggressor gains / Exploited
                      </span>
                    </td>
                    <td className="p-3 bg-navy-900/30">
                      <span className="font-mono text-xs text-signal-3 font-bold">
                        -2, -2
                      </span>
                      <br />
                      <span className="font-sans text-[10px] text-navy-500">
                        Mutual loss
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="font-sans text-xs text-navy-500 mt-2">
              Nash Equilibrium in this configuration sits at Defect/Defect
              (-2, -2), illustrating the security dilemma where rational
              self-interest produces suboptimal collective outcomes.
            </p>
          </div>
        </section>

        {/* Signalling Theory */}
        <section className="rounded border border-navy-700/40 bg-navy-900/50 p-6">
          <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-navy-100 mb-3">
            05 / Signalling Theory
          </h2>
          <p className="font-sans text-sm leading-relaxed text-navy-400 mb-4">
            In incomplete-information games, actors communicate intentions
            through costly signals. NEXUS classifies and scores three primary
            signal channels to assess credibility and intent.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded border border-navy-700/40 bg-navy-900/80 p-4">
              <h3 className="font-mono text-xs font-bold text-signal-2 mb-2">
                Public Statements
              </h3>
              <p className="font-sans text-xs text-navy-400">
                Official rhetoric, UN votes, and press releases. Low-cost
                signals that NEXUS cross-references with actions for
                credibility scoring.
              </p>
            </div>
            <div className="rounded border border-navy-700/40 bg-navy-900/80 p-4">
              <h3 className="font-mono text-xs font-bold text-signal-3 mb-2">
                Military Deployments
              </h3>
              <p className="font-sans text-xs text-navy-400">
                Force repositioning, exercises, and mobilization. High-cost
                signals tracked via the War Room&apos;s aircraft and vessel
                layers for real-time verification.
              </p>
            </div>
            <div className="rounded border border-navy-700/40 bg-navy-900/80 p-4">
              <h3 className="font-mono text-xs font-bold text-signal-4 mb-2">
                Sanctions and Economic Moves
              </h3>
              <p className="font-sans text-xs text-navy-400">
                Trade restrictions, asset freezes, and energy supply
                adjustments. Medium-cost signals with measurable economic
                impact used to calibrate payoff matrices.
              </p>
            </div>
          </div>
        </section>

        {/* Scenario Branching */}
        <section className="rounded border border-navy-700/40 bg-navy-900/50 p-6">
          <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-navy-100 mb-3">
            06 / Scenario Branching
          </h2>
          <p className="font-sans text-sm leading-relaxed text-navy-400 mb-4">
            Game theory outputs feed directly into the War Room&apos;s scenario
            analysis engine. Each equilibrium state, escalation level, and
            signal assessment generates branching scenario paths with
            associated probabilities.
          </p>
          <div className="space-y-2">
            <div className="rounded bg-navy-900/80 border border-navy-700/20 px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs text-navy-100">
                  Equilibrium Mapping
                </span>
                <span className="font-mono text-[10px] text-navy-500">
                  GAME THEORY OUTPUT
                </span>
              </div>
              <p className="font-sans text-xs text-navy-400">
                Stable states identified through Nash analysis define the
                baseline scenarios in the War Room.
              </p>
            </div>
            <div className="rounded bg-navy-900/80 border border-navy-700/20 px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs text-navy-100">
                  Perturbation Analysis
                </span>
                <span className="font-mono text-[10px] text-navy-500">
                  BRANCHING TRIGGER
                </span>
              </div>
              <p className="font-sans text-xs text-navy-400">
                External shocks (assassinations, elections, natural disasters)
                are modelled as perturbations that shift payoff values and
                potentially break existing equilibria.
              </p>
            </div>
            <div className="rounded bg-navy-900/80 border border-navy-700/20 px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs text-navy-100">
                  Probability Assignment
                </span>
                <span className="font-mono text-[10px] text-navy-500">
                  WAR ROOM INPUT
                </span>
              </div>
              <p className="font-sans text-xs text-navy-400">
                Each scenario branch receives a probability weight derived
                from signal strength, historical precedent, and actor
                rationality assumptions.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* CTA */}
      <div className="mt-12 rounded border border-navy-700/40 bg-navy-900/50 p-8 text-center">
        <h3 className="font-mono text-sm font-semibold uppercase tracking-widest text-navy-100 mb-2">
          Run scenario analysis
        </h3>
        <p className="font-sans text-sm text-navy-400 mb-5 max-w-lg mx-auto">
          Access the War Room to explore live game-theoretic models, escalation tracking, and scenario branching across active conflict theatres.
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
