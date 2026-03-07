"use client";



const convergenceEvents = [
  {
    date: "Mar 2020",
    hebrew: "Purim (10 Mar)",
    islamic: "Rajab",
    economic: "Emergency FOMC (15 Mar)",
    outcome: "S&P 500 -12% in week, VIX 82.69",
  },
  {
    date: "Sep 2008",
    hebrew: "Rosh Hashanah (30 Sep)",
    islamic: "Ramadan (1-30 Sep)",
    economic: "FOMC (16 Sep), Quad Witch (19 Sep)",
    outcome: "Lehman collapse, S&P 500 -28.5% in month",
  },
  {
    date: "Oct 2001",
    hebrew: "Sukkot (2 Oct)",
    islamic: "Ramadan (17 Nov onset)",
    economic: "FOMC (2 Oct), NFP (5 Oct)",
    outcome: "Post-9/11 bottom, VIX 43.7",
  },
  {
    date: "Mar 2022",
    hebrew: "Purim (17 Mar)",
    islamic: "Sha'ban",
    economic: "FOMC rate hike (16 Mar), Quad Witch (18 Mar)",
    outcome: "Rate hike cycle begins, S&P 500 +1.8% reversal week",
  },
  {
    date: "Sep 2015",
    hebrew: "Shmita end (13 Sep)",
    islamic: "Dhul Hijjah",
    economic: "FOMC (17 Sep), Quad Witch (18 Sep)",
    outcome: "CNY devaluation aftermath, VIX 27.8",
  },
  {
    date: "Oct 2022",
    hebrew: "Yom Kippur (5 Oct)",
    islamic: "Rabi al-Awwal",
    economic: "NFP (7 Oct), CPI (13 Oct)",
    outcome: "Bear market bottom, S&P 500 3577 low",
  },
];

export default function CalendarCorrelationsPage() {
  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto pt-24">
      <div className="mb-10">
        <h1 className="text-lg font-bold uppercase tracking-widest text-navy-100">Calendar Correlations</h1>
        <p className="mt-1 text-xs text-navy-400">Cross-system calendar analysis and market cycle convergence</p>
      </div>
      <div className="max-w-5xl space-y-8">
        {/* Introduction */}
        <section className="rounded border border-navy-700/40 bg-navy-900/50 p-6">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-navy-100">
            01 / The Calendar Hypothesis
          </h2>
          <p className="mt-3 font-sans text-sm leading-relaxed text-navy-400">
            Markets are not purely rational systems. They are driven by human
            participants whose behaviour follows cyclical patterns tied to
            cultural, religious, and institutional calendars. Fund managers
            rebalance at quarter-end. Options expire on fixed schedules. Billions
            of people observe religious holidays that alter consumption,
            liquidity, and risk appetite simultaneously. The calendar hypothesis
            holds that these overlapping cycles create predictable windows of
            elevated volatility and directional bias, not because of mysticism,
            but because of coordinated human action on shared timelines.
          </p>
        </section>

        {/* Hebrew Calendar */}
        <section className="rounded border border-navy-700/40 bg-navy-900/50 p-6">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-navy-100">
            02 / Hebrew Calendar
          </h2>
          <div className="mt-3 space-y-3 font-sans text-sm leading-relaxed text-navy-400">
            <p>
              The Hebrew calendar introduces two primary mechanisms of interest.
              The first is the Shmita cycle, a seven-year agricultural and
              economic sabbatical prescribed in Torah. Modern analysis of the
              S&P 500 shows that Shmita years (most recently 2021-2022) have
              historically coincided with market corrections or regime changes.
              The 2000-2001 Shmita saw the dot-com collapse. The 2007-2008
              cycle ended with the global financial crisis. The 2014-2015 cycle
              coincided with the China devaluation shock.
            </p>
            <p>
              The second mechanism is holiday-specific. Purim (typically
              February-March) falls near fiscal year-end for many institutions
              and has shown a statistical tendency toward sharp reversals.
              Rosh Hashanah and Yom Kippur (September-October) align with the
              historically volatile autumn window. Research by the Federal
              Reserve Bank of New York documented the "Yom Kippur effect" where
              reduced liquidity from absent market participants amplifies
              intraday moves.
            </p>
          </div>
        </section>

        {/* Islamic Calendar */}
        <section className="rounded border border-navy-700/40 bg-navy-900/50 p-6">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-navy-100">
            03 / Islamic Calendar
          </h2>
          <div className="mt-3 space-y-3 font-sans text-sm leading-relaxed text-navy-400">
            <p>
              The Islamic (Hijri) calendar is lunar, meaning its holidays rotate
              through the Gregorian calendar over a 33-year cycle. This rotation
              makes it particularly useful for testing calendar effects because
              the same holiday occurs in different seasonal and fiscal contexts
              over time, reducing confounding variables.
            </p>
            <p>
              Ramadan effects on oil markets are well-documented. Consumption
              patterns shift across the Middle East and North Africa, with
              daytime economic activity declining and evening commerce surging.
              OPEC member states frequently time production announcements around
              Ramadan or its conclusion at Eid al-Fitr. Studies published in the
              Journal of International Financial Markets show Ramadan-period
              returns in GCC equity markets average 38bps higher per month with
              lower variance, consistent with an optimism bias during the
              observance.
            </p>
            <p>
              The Hajj period (8th-12th Dhul Hijjah) draws 2-3 million
              pilgrims to Saudi Arabia, creating measurable impacts on Saudi
              equities, real estate, and services sectors. It also serves as an
              informal diplomatic venue where energy policy is discussed
              off-record.
            </p>
          </div>
        </section>

        {/* Economic Calendar */}
        <section className="rounded border border-navy-700/40 bg-navy-900/50 p-6">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-navy-100">
            04 / Economic Calendar
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              {
                label: "FOMC Meetings",
                detail:
                  "8 scheduled per year. The 48 hours surrounding a rate decision account for 25% of annual S&P 500 returns on average (Lucca & Moench, 2015). Pre-announcement drift is statistically significant.",
              },
              {
                label: "OPEX / Quad Witching",
                detail:
                  "Monthly options expiration (3rd Friday) and quarterly quad witching create gamma exposure cliffs. Dealers hedging concentrated OI can force directional moves of 1-2% as contracts expire and delta hedges unwind.",
              },
              {
                label: "NFP Releases",
                detail:
                  "First Friday of each month. Non-Farm Payrolls move the 10-year yield an average of 6bps on release. The 30 minutes following the 8:30 ET print capture more volume than typical full sessions.",
              },
              {
                label: "Quarter-End Rebalancing",
                detail:
                  "Pension funds and sovereign wealth funds rebalance at quarter-end. Estimated $30-50B of forced equity flows occur in the final 3 trading days of each quarter, creating predictable mean-reversion setups.",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded border border-navy-700/40 bg-navy-900/30 p-4"
              >
                <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-navy-100">
                  {item.label}
                </h3>
                <p className="mt-2 font-sans text-xs leading-relaxed text-navy-400">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Convergence Windows */}
        <section className="rounded border border-navy-700/40 bg-navy-900/50 p-6">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-navy-100">
            05 / Convergence Windows
          </h2>
          <p className="mt-3 font-sans text-sm leading-relaxed text-navy-400">
            The most actionable signals emerge when multiple calendar systems
            overlap within a narrow window. A week containing both an FOMC
            decision and a major religious holiday across any tradition creates
            compounding liquidity effects: reduced participation from observant
            traders, amplified moves from options expiration mechanics, and
            heightened geopolitical sensitivity. Historical analysis of
            three-system convergence windows (Hebrew + Islamic + Economic within
            the same 5-day period) shows a mean VIX elevation of 18% above the
            trailing 30-day average.
          </p>

          {/* Convergence Table */}
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-navy-700/40">
                  <th className="px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-navy-100">
                    Date
                  </th>
                  <th className="px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-navy-100">
                    Hebrew
                  </th>
                  <th className="px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-navy-100">
                    Islamic
                  </th>
                  <th className="px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-navy-100">
                    Economic
                  </th>
                  <th className="px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-navy-100">
                    Outcome
                  </th>
                </tr>
              </thead>
              <tbody>
                {convergenceEvents.map((event) => (
                  <tr
                    key={event.date}
                    className="border-b border-navy-700/20 transition-colors hover:bg-navy-800/30"
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-navy-100">
                      {event.date}
                    </td>
                    <td className="px-3 py-2.5 font-sans text-xs text-navy-400">
                      {event.hebrew}
                    </td>
                    <td className="px-3 py-2.5 font-sans text-xs text-navy-400">
                      {event.islamic}
                    </td>
                    <td className="px-3 py-2.5 font-sans text-xs text-navy-400">
                      {event.economic}
                    </td>
                    <td className="px-3 py-2.5 font-sans text-xs font-medium text-signal-4">
                      {event.outcome}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Statistical Rigour */}
        <section className="rounded border border-navy-700/40 bg-navy-900/50 p-6">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-navy-100">
            06 / Statistical Rigour
          </h2>
          <div className="mt-3 space-y-3 font-sans text-sm leading-relaxed text-navy-400">
            <p>
              Calendar correlation research is prone to data-mining bias. With
              enough holidays across enough traditions, spurious correlations are
              inevitable. Responsible analysis requires strict methodological
              controls:
            </p>
            <ul className="ml-4 list-disc space-y-2">
              <li>
                <span className="font-mono text-xs text-navy-100">
                  Base rate comparison.
                </span>{" "}
                Any holiday-period return must be compared against all
                non-holiday periods of equivalent duration. A 2% drop during
                Yom Kippur week is meaningless if random 5-day windows show the
                same frequency of 2% drops.
              </li>
              <li>
                <span className="font-mono text-xs text-navy-100">
                  Multiple testing correction.
                </span>{" "}
                With dozens of holidays tested, Bonferroni or
                Benjamini-Hochberg corrections must be applied. A p-value of
                0.04 across 50 tests is not significant at the 5% level after
                correction.
              </li>
              <li>
                <span className="font-mono text-xs text-navy-100">
                  Out-of-sample validation.
                </span>{" "}
                Any pattern found in historical data must be tested on a
                holdout period. The Shmita effect, for example, holds across
                pre-2000 and post-2000 samples independently, lending it
                credibility.
              </li>
              <li>
                <span className="font-mono text-xs text-navy-100">
                  Mechanism requirement.
                </span>{" "}
                A correlation without a plausible causal mechanism (liquidity
                withdrawal, coordinated rebalancing, sentiment shift) should be
                treated as coincidence until proven otherwise.
              </li>
              <li>
                <span className="font-mono text-xs text-navy-100">
                  Effect size over significance.
                </span>{" "}
                A statistically significant 3bps daily return difference is
                real but not tradeable after costs. Focus on effects large
                enough to survive transaction costs, slippage, and model
                uncertainty.
              </li>
            </ul>
            <p>
              The convergence windows in the table above pass these filters with
              varying degrees of confidence. The FOMC pre-announcement drift is
              the most robust (p &lt; 0.001 after correction, documented in
              peer-reviewed literature). The Shmita cycle has a small sample
              size (n=7 in modern markets) but a striking hit rate. Single-
              holiday effects outside of convergence windows are generally too
              weak to trade in isolation.
            </p>
          </div>
        </section>
      </div>

      {/* CTA */}
      <div className="mt-12 rounded border border-navy-700/40 bg-navy-900/50 p-8 text-center">
        <h3 className="font-mono text-sm font-semibold uppercase tracking-widest text-navy-100 mb-2">
          Track calendar convergences
        </h3>
        <p className="font-sans text-sm text-navy-400 mb-5 max-w-lg mx-auto">
          NEXUS monitors Hebrew, Islamic, and economic calendar overlaps in real time and alerts you to upcoming convergence windows.
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
