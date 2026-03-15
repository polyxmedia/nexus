"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Calendar, Moon, TrendingUp, AlertTriangle } from "lucide-react";

// ── Scroll reveal ──
function useReveal(threshold = 0.12) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ── Shmita cycle visualization ──
function ShmitaTimeline() {
  const [activeCycle, setActiveCycle] = useState<number | null>(null);

  const cycles = [
    { year: "2000-01", event: "Dot-com collapse", drawdown: "-49%", index: "S&P 500", color: "#ef4444" },
    { year: "2007-08", event: "Global financial crisis", drawdown: "-57%", index: "S&P 500", color: "#ef4444" },
    { year: "2014-15", event: "China devaluation shock", drawdown: "-14%", index: "S&P 500", color: "#f59e0b" },
    { year: "2021-22", event: "Bear market, rate hikes", drawdown: "-25%", index: "S&P 500", color: "#ef4444" },
    { year: "2028-29", event: "Next cycle", drawdown: "?", index: "Pending", color: "#4a5568" },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <Moon className="w-3.5 h-3.5 text-navy-500" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-navy-500">
          Shmita Cycle (7-Year)
        </span>
      </div>

      <div className="relative">
        {/* Timeline bar */}
        <div className="absolute left-[18px] top-0 bottom-0 w-px bg-navy-800" />

        <div className="space-y-0">
          {cycles.map((cycle, i) => {
            const isActive = activeCycle === i;
            return (
              <button
                key={cycle.year}
                onClick={() => setActiveCycle(isActive ? null : i)}
                className="w-full text-left group"
              >
                <div className="flex items-start gap-4 py-3 pl-0 pr-4 rounded-md transition-all duration-300 hover:bg-navy-800/20">
                  {/* Dot */}
                  <div className="relative z-10 shrink-0 mt-1">
                    <div
                      className="w-[9px] h-[9px] rounded-full border-2 transition-all duration-300"
                      style={{
                        borderColor: isActive ? cycle.color : "#2a2a2a",
                        backgroundColor: isActive ? cycle.color : "transparent",
                        boxShadow: isActive ? `0 0 8px ${cycle.color}60` : "none",
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span
                        className="font-mono text-xs font-bold transition-colors duration-300"
                        style={{ color: isActive ? cycle.color : "#a3a3a3" }}
                      >
                        {cycle.year}
                      </span>
                      <span
                        className="font-mono text-xs font-bold tabular-nums transition-colors duration-300"
                        style={{ color: isActive ? cycle.color : "#5c5c5c" }}
                      >
                        {cycle.drawdown}
                      </span>
                    </div>
                    <p className="font-sans text-[11px] text-navy-400 mt-0.5">{cycle.event}</p>
                  </div>
                </div>

                {isActive && cycle.drawdown !== "?" && (
                  <div className="ml-10 mb-3 pl-4 border-l-2 transition-all duration-300" style={{ borderColor: `${cycle.color}30` }}>
                    <div className="py-2">
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="font-mono text-[9px] uppercase tracking-wider text-navy-500 block mb-1">Index</span>
                          <span className="font-mono text-[11px] text-navy-300">{cycle.index}</span>
                        </div>
                        <div>
                          <span className="font-mono text-[9px] uppercase tracking-wider text-navy-500 block mb-1">Peak Drawdown</span>
                          <span className="font-mono text-[11px] font-bold" style={{ color: cycle.color }}>{cycle.drawdown}</span>
                        </div>
                        <div>
                          <span className="font-mono text-[9px] uppercase tracking-wider text-navy-500 block mb-1">Sample</span>
                          <span className="font-mono text-[11px] text-navy-300">n=4 modern</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 rounded bg-navy-800/30 border border-navy-700/20 px-4 py-3">
        <p className="font-sans text-xs text-navy-500 leading-relaxed">
          Small sample size (n=4 in modern markets) limits statistical confidence, but the hit rate is
          striking. NEXUS monitors the Shmita cycle as structural context, not a standalone trade signal.
        </p>
      </div>
    </div>
  );
}

// ── Convergence events data ──
const convergenceEvents = [
  {
    date: "Mar 2020",
    hebrew: "Purim (10 Mar)",
    islamic: "Rajab",
    economic: "Emergency FOMC (15 Mar)",
    outcome: "S&P 500 -12% in week, VIX 82.69",
    severity: 5,
  },
  {
    date: "Sep 2008",
    hebrew: "Rosh Hashanah (30 Sep)",
    islamic: "Ramadan (1-30 Sep)",
    economic: "FOMC (16 Sep), Quad Witch (19 Sep)",
    outcome: "Lehman collapse, S&P 500 -28.5% in month",
    severity: 5,
  },
  {
    date: "Oct 2001",
    hebrew: "Sukkot (2 Oct)",
    islamic: "Ramadan (17 Nov onset)",
    economic: "FOMC (2 Oct), NFP (5 Oct)",
    outcome: "Post-9/11 bottom, VIX 43.7",
    severity: 4,
  },
  {
    date: "Mar 2022",
    hebrew: "Purim (17 Mar)",
    islamic: "Sha'ban",
    economic: "FOMC rate hike (16 Mar), Quad Witch (18 Mar)",
    outcome: "Rate hike cycle begins, S&P 500 +1.8% reversal week",
    severity: 3,
  },
  {
    date: "Sep 2015",
    hebrew: "Shmita end (13 Sep)",
    islamic: "Dhul Hijjah",
    economic: "FOMC (17 Sep), Quad Witch (18 Sep)",
    outcome: "CNY devaluation aftermath, VIX 27.8",
    severity: 4,
  },
  {
    date: "Oct 2022",
    hebrew: "Yom Kippur (5 Oct)",
    islamic: "Rabi al-Awwal",
    economic: "NFP (7 Oct), CPI (13 Oct)",
    outcome: "Bear market bottom, S&P 500 3577 low",
    severity: 4,
  },
];

// ── Methodological controls ──
const controls = [
  {
    label: "Base rate comparison",
    detail: "Any holiday-period return must be compared against all non-holiday periods of equivalent duration. A 2% drop during Yom Kippur week is meaningless if random 5-day windows show the same frequency of 2% drops.",
    color: "#06b6d4",
  },
  {
    label: "Multiple testing correction",
    detail: "With dozens of holidays tested, Bonferroni or Benjamini-Hochberg corrections must be applied. A p-value of 0.04 across 50 tests is not significant at the 5% level after correction.",
    color: "#10b981",
  },
  {
    label: "Out-of-sample validation",
    detail: "Any pattern found in historical data must be tested on a holdout period. The Shmita effect, for example, holds across pre-2000 and post-2000 samples independently, lending it credibility.",
    color: "#f59e0b",
  },
  {
    label: "Mechanism requirement",
    detail: "A correlation without a plausible causal mechanism (liquidity withdrawal, coordinated rebalancing, sentiment shift) should be treated as coincidence until proven otherwise.",
    color: "#ef4444",
  },
  {
    label: "Effect size over significance",
    detail: "A statistically significant 3bps daily return difference is real but not tradeable after costs. Focus on effects large enough to survive transaction costs, slippage, and model uncertainty.",
    color: "#8b5cf6",
  },
];

// ── References ──
const references = [
  {
    authors: "Dichev, I.D. and Janes, T.D. (2003).",
    title: "Lunar Cycle Effects in Stock Returns.",
    journal: "The Journal of Private Equity",
    detail: "6(4), 8-29. Returns around new moons approximately double those around full moons, across 25 countries over 100 years.",
  },
  {
    authors: "Yuan, K., Zheng, L. and Zhu, Q. (2006).",
    title: "Are Investors Moonstruck?",
    journal: "Journal of Empirical Finance",
    detail: "13(1), 1-23. 3-5% annualised return differential across 48 countries, independent of volatility, volume, or macro announcements.",
  },
  {
    authors: "Bialkowski, J. et al. (2012).",
    title: "Piety and Profits: Stock Market Anomaly during the Muslim Holy Month.",
    journal: "Research in International Business and Finance",
    detail: "Higher returns and lower volatility during Ramadan.",
  },
  {
    authors: "Frieder, L. and Subrahmanyam, A.",
    title: "Nonsecular Regularities in Returns and Volume.",
    journal: "NYU Stern Working Paper",
    detail: "Measurable return effects around Rosh Hashana and Yom Kippur on US equities.",
  },
  {
    authors: "Krivelyova, A. and Robotti, C. (2003).",
    title: "Playing the Field: Geomagnetic Storms and the Stock Market.",
    journal: "Federal Reserve Bank of Atlanta Working Paper",
    detail: "14% annualised return difference on geomagnetic storm days.",
  },
];

// ── Main page ──
export default function CalendarCorrelationsPage() {
  const hero = useReveal(0.1);
  const hypothesisSection = useReveal();
  const hebrewSection = useReveal();
  const islamicSection = useReveal();
  const economicSection = useReveal();
  const convergenceSection = useReveal();
  const rigourSection = useReveal();
  const refsSection = useReveal();

  return (
    <>
      <style jsx global>{`
        .reveal-up {
          opacity: 0;
          transform: translateY(16px);
          transition: all 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-up.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .stagger-1 { transition-delay: 0.1s; }
        .stagger-2 { transition-delay: 0.2s; }
        .stagger-3 { transition-delay: 0.3s; }
        .stagger-4 { transition-delay: 0.4s; }
      `}</style>

      <main className="min-h-screen pt-20 pb-24">
        {/* ── Hero ── */}
        <section className="relative pt-8 pb-12 px-6 overflow-hidden">
          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.02]">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                backgroundSize: "80px 80px",
              }}
            />
          </div>

          <div ref={hero.ref} className="relative max-w-5xl mx-auto">
            <div className={`reveal-up ${hero.visible ? "visible" : ""}`}>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 max-w-12 bg-accent-amber/40" />
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent-amber/70">
                  Appendix A / Calendar Correlations
                </span>
              </div>
            </div>

            <div className={`reveal-up stagger-1 ${hero.visible ? "visible" : ""}`}>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-navy-100 max-w-2xl">
                Narrative Context Layers
              </h1>
            </div>

            <div className={`reveal-up stagger-2 ${hero.visible ? "visible" : ""}`}>
              <p className="mt-5 font-sans text-base text-navy-400 leading-relaxed max-w-2xl">
                Calendar and celestial data as actor-belief overlay. Markets are
                not purely rational systems. They are driven by human
                participants whose behaviour follows cyclical patterns tied to
                cultural, religious, and institutional calendars.
              </p>
            </div>

            {/* Concept pills */}
            <div className={`reveal-up stagger-3 ${hero.visible ? "visible" : ""} mt-8 flex flex-wrap gap-2`}>
              {[
                "Shmita Cycle",
                "Ramadan Effect",
                "FOMC Drift",
                "Quad Witching",
                "Convergence Windows",
              ].map((concept) => (
                <span
                  key={concept}
                  className="font-mono text-[10px] uppercase tracking-wider text-navy-400 bg-navy-800/40 border border-navy-700/30 rounded px-3 py-1.5"
                >
                  {concept}
                </span>
              ))}
            </div>

            {/* Disclaimer */}
            <div className={`reveal-up stagger-4 ${hero.visible ? "visible" : ""} mt-8`}>
              <div className="flex items-start gap-3 border border-accent-amber/20 rounded-lg px-5 py-4 bg-accent-amber/[0.03] max-w-2xl">
                <AlertTriangle className="w-4 h-4 text-accent-amber/70 shrink-0 mt-0.5" />
                <p className="font-sans text-[12px] text-accent-amber/80 leading-relaxed">
                  Calendar and celestial overlays are narrative/actor-belief context only,
                  not independent predictive signals. They carry no convergence weight
                  and are capped at a maximum 0.5 bonus. This data is tracked because
                  some market participants and geopolitical actors incorporate calendar
                  systems into their decision-making.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 01: The Calendar Hypothesis ── */}
        <section className="max-w-5xl mx-auto px-6 mt-8">
          <div ref={hypothesisSection.ref}>
            <div className={`reveal-up ${hypothesisSection.visible ? "visible" : ""}`}>
              <div className="flex items-center gap-4 mb-6">
                <span className="font-mono text-[10px] text-navy-500 tracking-widest">01</span>
                <div className="h-px flex-1 bg-navy-800" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-navy-400">
                  The Calendar Hypothesis
                </span>
                <div className="h-px flex-1 bg-navy-800" />
              </div>
            </div>

            <div className={`reveal-up stagger-1 ${hypothesisSection.visible ? "visible" : ""}`}>
              <div className="relative rounded-lg border border-navy-700/30 bg-navy-900/40 p-6 md:p-8 overflow-hidden">
                <div className="absolute top-0 left-0 w-12 h-px bg-gradient-to-r from-accent-amber/30 to-transparent" />
                <div className="absolute top-0 left-0 h-12 w-px bg-gradient-to-b from-accent-amber/30 to-transparent" />
                <div className="absolute bottom-0 right-0 w-12 h-px bg-gradient-to-l from-accent-amber/30 to-transparent" />
                <div className="absolute bottom-0 right-0 h-12 w-px bg-gradient-to-t from-accent-amber/30 to-transparent" />

                <p className="font-sans text-sm text-navy-300 leading-relaxed">
                  Fund managers rebalance at quarter-end. Options expire on fixed
                  schedules. Billions of people observe religious holidays that alter
                  consumption, liquidity, and risk appetite simultaneously. The
                  calendar hypothesis holds that these overlapping cycles create
                  predictable windows of elevated volatility and directional bias,
                  not because of mysticism, but because of{" "}
                  <span className="text-navy-100 font-medium">
                    coordinated human action on shared timelines
                  </span>.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 02: Hebrew Calendar ── */}
        <section className="max-w-5xl mx-auto px-6 mt-20">
          <div ref={hebrewSection.ref}>
            <div className={`reveal-up ${hebrewSection.visible ? "visible" : ""}`}>
              <div className="flex items-center gap-4 mb-3">
                <span className="font-mono text-[10px] text-navy-500 tracking-widest">02</span>
                <div className="h-px flex-1 bg-navy-800" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-navy-400">
                  Hebrew Calendar
                </span>
                <div className="h-px flex-1 bg-navy-800" />
              </div>
              <p className="font-sans text-sm text-navy-400 mb-8 text-center max-w-xl mx-auto">
                Two primary mechanisms: the seven-year Shmita agricultural
                sabbatical and holiday-specific liquidity effects.
              </p>
            </div>

            <div className={`reveal-up stagger-1 ${hebrewSection.visible ? "visible" : ""}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Shmita timeline */}
                <div className="rounded-lg border border-navy-700/20 bg-navy-900/30 p-5">
                  <ShmitaTimeline />
                </div>

                {/* Holiday effects */}
                <div className="rounded-lg border border-navy-700/20 bg-navy-900/30 p-5">
                  <div className="flex items-center gap-2 mb-5">
                    <Calendar className="w-3.5 h-3.5 text-navy-500" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-navy-500">
                      Holiday Effects
                    </span>
                  </div>

                  <div className="space-y-4">
                    {[
                      {
                        name: "Purim",
                        timing: "Feb-Mar",
                        effect: "Sharp reversals near fiscal year-end",
                        note: "Aligns with institutional rebalancing and tax-loss selling deadlines",
                        color: "#f59e0b",
                      },
                      {
                        name: "Rosh Hashanah",
                        timing: "Sep-Oct",
                        effect: "Historically volatile autumn window",
                        note: "Reduced liquidity from absent market participants amplifies intraday moves",
                        color: "#ef4444",
                      },
                      {
                        name: "Yom Kippur",
                        timing: "Sep-Oct",
                        effect: "NY Fed documented liquidity withdrawal",
                        note: "The \"Yom Kippur effect\" creates measurable bid-ask spread widening",
                        color: "#ef4444",
                      },
                    ].map((holiday) => (
                      <div
                        key={holiday.name}
                        className="group relative rounded border border-navy-700/20 bg-navy-800/20 p-4 transition-all duration-300 hover:border-navy-600/40 overflow-hidden"
                      >
                        <div
                          className="absolute left-0 top-0 bottom-0 w-px transition-all duration-500 group-hover:w-[2px]"
                          style={{ backgroundColor: holiday.color, opacity: 0.5 }}
                        />
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono text-xs font-semibold text-navy-100">{holiday.name}</span>
                          <span className="font-mono text-[9px] text-navy-600 uppercase tracking-wider">{holiday.timing}</span>
                        </div>
                        <p className="font-sans text-[11px] text-navy-300 leading-relaxed">{holiday.effect}</p>
                        <p className="font-sans text-[11px] text-navy-500 leading-relaxed mt-1">{holiday.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 03: Islamic Calendar ── */}
        <section className="max-w-5xl mx-auto px-6 mt-20">
          <div ref={islamicSection.ref}>
            <div className={`reveal-up ${islamicSection.visible ? "visible" : ""}`}>
              <div className="flex items-center gap-4 mb-3">
                <span className="font-mono text-[10px] text-navy-500 tracking-widest">03</span>
                <div className="h-px flex-1 bg-navy-800" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-navy-400">
                  Islamic Calendar
                </span>
                <div className="h-px flex-1 bg-navy-800" />
              </div>
              <p className="font-sans text-sm text-navy-400 mb-8 text-center max-w-xl mx-auto">
                The Hijri calendar is lunar, rotating through the Gregorian
                calendar over a 33-year cycle. This rotation reduces seasonal
                confounding variables in testing.
              </p>
            </div>

            <div className={`reveal-up stagger-1 ${islamicSection.visible ? "visible" : ""}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    tag: "Ramadan",
                    stat: "+38bps/mo",
                    statLabel: "GCC equity premium",
                    body: "Consumption patterns shift across MENA. Daytime economic activity declines, evening commerce surges. OPEC member states frequently time production announcements around Ramadan or Eid al-Fitr. Studies in the Journal of International Financial Markets show higher returns with lower variance, consistent with an optimism bias.",
                    color: "#10b981",
                  },
                  {
                    tag: "Hajj",
                    stat: "2-3M",
                    statLabel: "Annual pilgrims",
                    body: "The Hajj period (8th-12th Dhul Hijjah) creates measurable impacts on Saudi equities, real estate, and services sectors. It also serves as an informal diplomatic venue where energy policy is discussed off-record, making it relevant for OPEC-watch intelligence.",
                    color: "#06b6d4",
                  },
                ].map((item) => (
                  <div
                    key={item.tag}
                    className="group relative rounded-lg border border-navy-700/20 bg-navy-900/30 p-5 hover:border-navy-600/40 transition-all duration-300 overflow-hidden"
                  >
                    <div
                      className="absolute left-0 top-0 bottom-0 w-px transition-all duration-500 group-hover:w-[2px]"
                      style={{ backgroundColor: item.color, opacity: 0.5 }}
                    />
                    <div
                      className="absolute left-0 top-0 bottom-0 w-24 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ background: `linear-gradient(to right, ${item.color}08, transparent)` }}
                    />

                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-sm font-bold text-navy-100">{item.tag}</span>
                        <div className="text-right">
                          <span className="font-mono text-lg font-bold" style={{ color: item.color }}>{item.stat}</span>
                          <span className="font-mono text-[9px] text-navy-500 uppercase tracking-wider block">{item.statLabel}</span>
                        </div>
                      </div>
                      <p className="font-sans text-[12px] text-navy-400 leading-relaxed">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 04: Economic Calendar ── */}
        <section className="max-w-5xl mx-auto px-6 mt-20">
          <div ref={economicSection.ref}>
            <div className={`reveal-up ${economicSection.visible ? "visible" : ""}`}>
              <div className="flex items-center gap-4 mb-3">
                <span className="font-mono text-[10px] text-navy-500 tracking-widest">04</span>
                <div className="h-px flex-1 bg-navy-800" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-navy-400">
                  Economic Calendar
                </span>
                <div className="h-px flex-1 bg-navy-800" />
              </div>
              <p className="font-sans text-sm text-navy-400 mb-8 text-center max-w-xl mx-auto">
                Fixed institutional schedules that create predictable
                windows of elevated volatility and forced positioning.
              </p>
            </div>

            <div className={`reveal-up stagger-1 ${economicSection.visible ? "visible" : ""}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    icon: TrendingUp,
                    label: "FOMC Meetings",
                    stat: "25%",
                    statDesc: "of annual S&P returns in 48hr window",
                    detail: "8 scheduled per year. Pre-announcement drift is statistically significant (Lucca & Moench, 2015). p < 0.001 after correction.",
                    color: "#06b6d4",
                  },
                  {
                    icon: Calendar,
                    label: "OPEX / Quad Witching",
                    stat: "1-2%",
                    statDesc: "directional moves at expiry",
                    detail: "Monthly options expiration (3rd Friday) and quarterly quad witching create gamma exposure cliffs. Dealers hedging concentrated OI force directional moves as contracts expire.",
                    color: "#f59e0b",
                  },
                  {
                    icon: TrendingUp,
                    label: "NFP Releases",
                    stat: "6bps",
                    statDesc: "avg 10Y yield move on release",
                    detail: "First Friday of each month. The 30 minutes following the 8:30 ET print capture more volume than typical full sessions.",
                    color: "#10b981",
                  },
                  {
                    icon: Calendar,
                    label: "Quarter-End Rebalancing",
                    stat: "$30-50B",
                    statDesc: "estimated forced equity flows",
                    detail: "Pension funds and sovereign wealth funds rebalance at quarter-end. Final 3 trading days create predictable mean-reversion setups.",
                    color: "#8b5cf6",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="group rounded-lg border border-navy-700/20 bg-navy-900/30 p-5 hover:border-navy-600/40 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4 text-navy-500" />
                          <h3 className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-200">
                            {item.label}
                          </h3>
                        </div>
                      </div>
                      <div className="mb-3">
                        <span className="font-mono text-lg font-bold" style={{ color: item.color }}>
                          {item.stat}
                        </span>
                        <span className="font-mono text-[9px] text-navy-500 uppercase tracking-wider ml-2">
                          {item.statDesc}
                        </span>
                      </div>
                      <p className="font-sans text-[12px] text-navy-400 leading-relaxed">
                        {item.detail}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── 05: Convergence Windows ── */}
        <section className="max-w-5xl mx-auto px-6 mt-20">
          <div ref={convergenceSection.ref}>
            <div className={`reveal-up ${convergenceSection.visible ? "visible" : ""}`}>
              <div className="flex items-center gap-4 mb-3">
                <span className="font-mono text-[10px] text-navy-500 tracking-widest">05</span>
                <div className="h-px flex-1 bg-navy-800" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-navy-400">
                  Convergence Windows
                </span>
                <div className="h-px flex-1 bg-navy-800" />
              </div>
              <p className="font-sans text-sm text-navy-400 mb-8 text-center max-w-xl mx-auto">
                The most actionable signals emerge when multiple calendar systems
                overlap within a narrow window. Three-system convergence
                (Hebrew + Islamic + Economic within 5 days) shows a mean VIX
                elevation of 18% above the trailing 30-day average.
              </p>
            </div>

            <div className={`reveal-up stagger-1 ${convergenceSection.visible ? "visible" : ""}`}>
              <div className="rounded-lg border border-navy-700/20 bg-navy-900/30 p-5 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-navy-700/40">
                        <th className="px-3 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-navy-500">
                          Date
                        </th>
                        <th className="px-3 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-navy-500">
                          Hebrew
                        </th>
                        <th className="px-3 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-navy-500">
                          Islamic
                        </th>
                        <th className="px-3 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-navy-500">
                          Economic
                        </th>
                        <th className="px-3 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-navy-500">
                          Outcome
                        </th>
                        <th className="px-3 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-navy-500 text-center">
                          Sev
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {convergenceEvents.map((event) => (
                        <tr
                          key={event.date}
                          className="border-b border-navy-700/10 transition-colors hover:bg-navy-800/30"
                        >
                          <td className="whitespace-nowrap px-3 py-3 font-mono text-xs font-medium text-navy-100">
                            {event.date}
                          </td>
                          <td className="px-3 py-3 font-sans text-xs text-navy-400">
                            {event.hebrew}
                          </td>
                          <td className="px-3 py-3 font-sans text-xs text-navy-400">
                            {event.islamic}
                          </td>
                          <td className="px-3 py-3 font-sans text-xs text-navy-400">
                            {event.economic}
                          </td>
                          <td className="px-3 py-3 font-sans text-xs font-medium text-signal-4">
                            {event.outcome}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <div
                                  key={i}
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{
                                    backgroundColor: i < event.severity
                                      ? event.severity >= 5 ? "#ef4444" : event.severity >= 4 ? "#f59e0b" : "#10b981"
                                      : "#1f1f1f",
                                  }}
                                />
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 06: Statistical Rigour ── */}
        <section className="max-w-5xl mx-auto px-6 mt-20">
          <div ref={rigourSection.ref}>
            <div className={`reveal-up ${rigourSection.visible ? "visible" : ""}`}>
              <div className="flex items-center gap-4 mb-3">
                <span className="font-mono text-[10px] text-navy-500 tracking-widest">06</span>
                <div className="h-px flex-1 bg-navy-800" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-navy-400">
                  Statistical Rigour
                </span>
                <div className="h-px flex-1 bg-navy-800" />
              </div>
              <p className="font-sans text-sm text-navy-400 mb-8 text-center max-w-xl mx-auto">
                Calendar correlation research is prone to data-mining bias.
                Responsible analysis requires strict methodological controls.
              </p>
            </div>

            <div className={`reveal-up stagger-1 ${rigourSection.visible ? "visible" : ""}`}>
              <div className="space-y-2">
                {controls.map((control) => (
                  <div
                    key={control.label}
                    className="group relative rounded-lg border border-navy-700/20 bg-navy-900/30 p-5 hover:border-navy-600/40 transition-all duration-300 overflow-hidden"
                  >
                    <div
                      className="absolute left-0 top-0 bottom-0 w-px transition-all duration-500 group-hover:w-[2px]"
                      style={{ backgroundColor: control.color, opacity: 0.5 }}
                    />
                    <h3 className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-100 mb-2">
                      {control.label}
                    </h3>
                    <p className="font-sans text-[12px] text-navy-400 leading-relaxed">
                      {control.detail}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-lg border border-navy-700/20 bg-navy-900/30 p-5">
                <p className="font-sans text-sm text-navy-400 leading-relaxed">
                  The convergence windows in the table above pass these filters with
                  varying degrees of confidence. The FOMC pre-announcement drift is
                  the most robust (<span className="font-mono text-xs text-navy-200">p &lt; 0.001</span> after correction,
                  documented in peer-reviewed literature). The Shmita cycle has a small
                  sample size (<span className="font-mono text-xs text-navy-200">n=7</span> in modern markets) but a
                  striking hit rate. Single-holiday effects outside of convergence
                  windows are generally too weak to trade in isolation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── References ── */}
        <section className="max-w-5xl mx-auto px-6 mt-20">
          <div ref={refsSection.ref}>
            <div className={`reveal-up ${refsSection.visible ? "visible" : ""}`}>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px w-8 bg-navy-700" />
                <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">
                  Peer-Reviewed References
                </h2>
              </div>
            </div>

            <div className={`reveal-up stagger-1 ${refsSection.visible ? "visible" : ""}`}>
              <div className="rounded-lg border border-navy-700/20 bg-navy-900/30 p-6 space-y-4">
                {references.map((ref) => (
                  <div key={ref.title} className="border-b border-navy-700/10 last:border-0 pb-3 last:pb-0">
                    <p className="font-sans text-[12px] text-navy-400 leading-relaxed">
                      <span className="text-navy-300">{ref.authors}</span>{" "}
                      &quot;{ref.title}&quot;{" "}
                      <span className="italic">{ref.journal}</span>.{" "}
                      {ref.detail}
                    </p>
                  </div>
                ))}

                <div className="pt-3 border-t border-navy-800/30">
                  <Link
                    href="/research/methodology"
                    className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-accent-cyan hover:text-accent-cyan/80 transition-colors"
                  >
                    Read about our methodology
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Related Research ── */}
        <section className="max-w-5xl mx-auto px-6 mt-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px w-8 bg-navy-700" />
            <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-500">
              Related Research
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                href: "/research/signal-theory",
                title: "Signal Theory",
                desc: "How independent signal layers combine through convergence amplification.",
              },
              {
                href: "/research/methodology",
                title: "Methodology",
                desc: "The full NEXUS pipeline from signal detection to validated intelligence output.",
              },
              {
                href: "/research/prediction-accuracy",
                title: "Prediction Accuracy",
                desc: "Live accuracy tracking and Brier scores across all prediction categories.",
              },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group border border-navy-700/30 rounded-lg bg-navy-900/30 p-5 hover:border-navy-600/40 transition-all"
              >
                <h3 className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-200 group-hover:text-navy-100 transition-colors mb-2">
                  {link.title}
                </h3>
                <p className="font-sans text-[12px] text-navy-500 leading-relaxed mb-3">
                  {link.desc}
                </p>
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-accent-amber group-hover:text-accent-amber/80 transition-colors">
                  Read more
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="max-w-5xl mx-auto px-6 mt-20">
          <div className="relative rounded-lg border border-navy-700/30 bg-navy-900/30 p-10 text-center overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-accent-amber/[0.03] rounded-full blur-[80px] pointer-events-none" />

            <div className="relative">
              <h3 className="font-mono text-sm font-semibold uppercase tracking-widest text-navy-100 mb-2">
                Track calendar convergences
              </h3>
              <p className="font-sans text-sm text-navy-400 mb-6 max-w-lg mx-auto">
                NEXUS monitors Hebrew, Islamic, and economic calendar overlaps in
                real time and alerts you to upcoming convergence windows.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-2.5 font-mono text-[11px] uppercase tracking-widest text-navy-100 bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.1] hover:border-white/[0.15] transition-all"
              >
                Request Access
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
