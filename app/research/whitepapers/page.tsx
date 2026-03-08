"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ── Scroll Reveal ──

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

const anim = "transition-all duration-700 ease-out";
const hidden = "opacity-0 translate-y-6";
const shown = "opacity-100 translate-y-0";

// ── Shared Components ──

function Ruled() {
  return (
    <div className="max-w-5xl mx-auto px-6">
      <div className="h-px bg-navy-800/60" />
    </div>
  );
}

function SectionHead({
  number,
  label,
  visible,
  delay = 0,
}: {
  number: string;
  label: string;
  visible: boolean;
  delay?: number;
}) {
  return (
    <div
      className={`flex items-center gap-4 mb-10 ${anim} ${visible ? shown : hidden}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <span className="font-mono text-[10px] text-navy-700 tabular-nums">
        {number}
      </span>
      <div className="h-px w-8 bg-navy-700/50" />
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-navy-500">
        {label}
      </span>
    </div>
  );
}

function ExpandableSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-navy-800/40 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-navy-900/30 transition-colors"
      >
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-navy-300 font-medium">
          {title}
        </span>
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-navy-500" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-navy-500" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-navy-800/30">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Table of Contents ──

const tocSections = [
  { id: "abstract", num: "00", label: "Abstract" },
  { id: "signal-detection", num: "01", label: "Multi-Layer Signal Detection" },
  { id: "convergence", num: "02", label: "Convergence Analysis" },
  { id: "synthesis", num: "03", label: "AI-Driven Intelligence Synthesis" },
  { id: "prediction", num: "04", label: "Prediction Engine and Calibration" },
  { id: "game-theory", num: "05", label: "Game Theory Framework" },
  { id: "iw-framework", num: "06", label: "Indications and Warnings" },
  { id: "regime-detection", num: "07", label: "Market Regime Detection" },
  { id: "systemic-risk", num: "08", label: "Systemic Risk Monitoring" },
  { id: "bocpd", num: "09", label: "Bayesian Change Point Detection" },
  { id: "ach", num: "10", label: "Analysis of Competing Hypotheses" },
  { id: "source-reliability", num: "11", label: "NATO Admiralty Rating System" },
  { id: "nowcasting", num: "12", label: "Economic Nowcasting" },
  { id: "monte-carlo", num: "13", label: "Monte Carlo Simulation" },
  { id: "shipping", num: "14", label: "Maritime and Shipping Intelligence" },
  { id: "central-bank", num: "15", label: "Central Bank NLP Analysis" },
  { id: "narrative", num: "16", label: "Narrative Tracking and Divergence" },
  { id: "osint", num: "17", label: "OSINT Entity Extraction" },
  { id: "knowledge", num: "18", label: "Knowledge Bank and Embeddings" },
  { id: "ai-progression", num: "19", label: "AI Progression Tracking" },
  { id: "integration", num: "20", label: "System Integration Architecture" },
];

// ════════════════════════════════════════════════
// ── PAGE ──
// ════════════════════════════════════════════════

export default function WhitepaperPage() {
  const heroReveal = useReveal(0.05);
  const tocReveal = useReveal();
  const abstractReveal = useReveal();
  const signalReveal = useReveal();
  const convergenceReveal = useReveal();
  const synthesisReveal = useReveal();
  const predictionReveal = useReveal();
  const gameReveal = useReveal();
  const iwReveal = useReveal();
  const regimeReveal = useReveal();
  const systemicReveal = useReveal();
  const bocpdReveal = useReveal();
  const achReveal = useReveal();
  const sourceReveal = useReveal();
  const nowcastReveal = useReveal();
  const monteReveal = useReveal();
  const shippingReveal = useReveal();
  const centralReveal = useReveal();
  const narrativeReveal = useReveal();
  const osintReveal = useReveal();
  const knowledgeReveal = useReveal();
  const aiProgReveal = useReveal();
  const integrationReveal = useReveal();
  const ctaReveal = useReveal(0.2);

  return (
    <main className="min-h-screen selection:bg-accent-cyan/20">
      {/* Grid background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute inset-0 opacity-[0.012]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
      </div>

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="relative pt-32 pb-16 px-6 overflow-hidden">
        <div className="absolute top-20 left-1/4 w-[600px] h-[300px] bg-accent-cyan/[0.015] rounded-full blur-[140px] pointer-events-none" />

        <div ref={heroReveal.ref} className="relative max-w-5xl mx-auto">
          <div className={`${anim} ${heroReveal.visible ? shown : hidden}`}>
            <div className="flex items-center gap-3 mb-6">
              <span className="font-mono text-[10px] text-navy-700">
                WP-001
              </span>
              <div className="h-px w-6 bg-navy-700/50" />
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-navy-600">
                Technical White Paper
              </span>
            </div>
          </div>

          <h1
            className={`font-sans text-[2rem] md:text-[2.75rem] font-light leading-[1.15] tracking-tight text-navy-100 max-w-4xl ${anim} ${heroReveal.visible ? shown : hidden}`}
            style={{ transitionDelay: "100ms" }}
          >
            NEXUS Intelligence Platform:
            <br />
            <span className="text-navy-400">
              Methodologies, Algorithms, and Analytical Frameworks
            </span>
          </h1>

          <div
            className={`mt-8 flex flex-wrap items-center gap-6 ${anim} ${heroReveal.visible ? shown : hidden}`}
            style={{ transitionDelay: "200ms" }}
          >
            <div className="font-sans text-[13px] text-navy-400">
              Andre Figueira
            </div>
            <div className="font-mono text-[10px] text-navy-600">
              NEXUS Intelligence / Polyxmedia
            </div>
            <div className="font-mono text-[10px] text-navy-600">
              March 2026
            </div>
          </div>

          <p
            className={`mt-8 font-sans text-base text-navy-400 leading-relaxed max-w-3xl ${anim} ${heroReveal.visible ? shown : hidden}`}
            style={{ transitionDelay: "300ms" }}
          >
            A comprehensive technical document covering every analytical methodology,
            algorithm, and intelligence framework implemented in the NEXUS platform.
            From multi-layer signal detection through Bayesian change point analysis,
            game-theoretic scenario modelling, and NATO-standard source evaluation,
            this paper details the full engineering behind geopolitical-market
            convergence intelligence.
          </p>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          TABLE OF CONTENTS
      ══════════════════════════════════════════ */}
      <section className="px-6 py-16">
        <div ref={tocReveal.ref} className="max-w-5xl mx-auto">
          <div
            className={`font-mono text-[10px] uppercase tracking-[0.25em] text-navy-600 mb-6 ${anim} ${tocReveal.visible ? shown : hidden}`}
          >
            Contents
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
            {tocSections.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`flex items-center gap-3 py-1.5 group ${anim} ${tocReveal.visible ? shown : hidden}`}
                style={{ transitionDelay: `${50 + i * 30}ms` }}
              >
                <span className="font-mono text-[10px] text-navy-700 tabular-nums w-5">
                  {s.num}
                </span>
                <span className="font-sans text-[13px] text-navy-400 group-hover:text-navy-200 transition-colors">
                  {s.label}
                </span>
                <div className="flex-1 border-b border-dotted border-navy-800/40" />
              </a>
            ))}
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          00: ABSTRACT
      ══════════════════════════════════════════ */}
      <section id="abstract" className="px-6 py-20">
        <div ref={abstractReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="00" label="Abstract" visible={abstractReveal.visible} />
          <div className={`max-w-3xl ${anim} ${abstractReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              NEXUS is a geopolitical-market convergence intelligence platform that synthesises signals from five independent data layers into actionable intelligence. The platform combines techniques from quantitative finance, intelligence analysis, computational statistics, and natural language processing to detect conditions under which geopolitical events are likely to produce market dislocations.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              This paper documents every analytical methodology currently implemented in production. Each section covers the theoretical basis, the specific algorithms used, the data sources consumed, and how outputs integrate with the broader system. Where formal academic literature underpins a method, citations are provided. Where we have extended or adapted existing techniques, the modifications are documented with rationale.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              The platform processes data from 15+ external APIs, runs 20+ analytical tools, and maintains a self-correcting feedback loop through Brier-scored prediction tracking. Every component described here runs in production, processing real data, generating real predictions, and measuring real outcomes.
            </p>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          01: MULTI-LAYER SIGNAL DETECTION
      ══════════════════════════════════════════ */}
      <section id="signal-detection" className="px-6 py-20">
        <div ref={signalReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="01" label="Multi-Layer Signal Detection" visible={signalReveal.visible} />

          <div className={`max-w-3xl mb-10 ${anim} ${signalReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              Signal detection in NEXUS operates across five independent domains, each with its own detection engine, data sources, and scoring logic. The independence of these layers is a deliberate architectural decision. Correlated inputs produce correlated noise. Independent inputs produce meaningful convergence.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              Every signal layer normalises its output into a common schema: timestamp, category code, affected entities (actors, regions, tickers), geographic scope, and a preliminary intensity score on a 1-5 scale. This normalisation allows the convergence engine to operate on signals from fundamentally different domains without special-casing.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              Detection thresholds are dynamic. Baseline activity levels are recalculated on rolling windows so the system adapts to shifting environments. A troop movement during peacetime triggers differently than the same movement during an active conflict cycle. Signals below the noise floor are still recorded. They contribute to pattern recognition over longer time horizons even when they do not trigger immediate alerts.
            </p>
          </div>

          {/* Signal Layers */}
          <div className={`space-y-4 ${anim} ${signalReveal.visible ? shown : hidden}`} style={{ transitionDelay: "200ms" }}>
            <ExpandableSection title="GEO / Geopolitical Events" defaultOpen>
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The geopolitical layer tracks conflict escalation patterns, sanctions regimes, diplomatic shifts, military posture changes, and regime instability indicators. Data is sourced from GDELT (Global Database of Events, Language, and Tone), which processes global news media in real-time and codes events using the CAMEO taxonomy.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  GDELT queries are constructed per-region with Boolean keyword combinations wrapped in parenthesised OR groups and filtered by source language. The system monitors 15+ geographic regions with customised query sets. Event data is cross-referenced against curated conflict anniversary databases, where historical patterns (e.g., military exercises that preceded past escalations) inform the weighting of current signals.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The Geopolitical Risk (GPR) Index, originally developed by Caldara and Iacoviello at the Federal Reserve Board, provides a macro-level risk baseline. NEXUS ingests the GPR daily index (sourced from upstream XLS data, parsed via the XLSX library with Excel serial date handling) and uses it as a contextual overlay for individual event scoring.
                </p>
                <div className="mt-4 border border-navy-800/30 rounded p-4 bg-navy-900/20">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-2">Data Sources</div>
                  <div className="font-sans text-[12px] text-navy-500 leading-relaxed">
                    GDELT Event API (5-min polling) / ACLED Conflict Data / GPR Daily Index (Caldara-Iacoviello) / Curated conflict anniversary database
                  </div>
                </div>
              </div>
            </ExpandableSection>

            <ExpandableSection title="CAL / Calendar Events">
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The calendar layer tracks three distinct calendrical systems and their historical correlations with market behaviour: the Gregorian economic calendar, the Hebrew (Jewish) calendar, and the Islamic (Hijri) calendar.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The economic calendar monitors high-impact data releases (Non-Farm Payrolls, CPI prints, FOMC decisions, options expiry dates, fiscal quarter boundaries) with significance scoring based on historical volatility impact. Events are tagged with affected asset classes and expected volatility multipliers.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The Hebrew calendar module tracks events like Tish&apos;a B&apos;Av (historically correlated with market stress), Yom Kippur (low liquidity windows), and most notably the Shemitah cycle, a 7-year economic pattern that has coincided with significant market corrections in 2001, 2008, and 2015. The system does not claim causation. It identifies statistical patterns and flags when calendar conditions align with other signal layers.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The Islamic calendar module tracks Ramadan (historically associated with reduced Middle Eastern trading volume), Hajj season (Saudi economic activity shifts), and other observances with documented market relevance. Each event carries a market-relevance score based on historical data.
                </p>
                <div className="mt-4 border border-navy-800/30 rounded p-4 bg-navy-900/20">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-2">Methodology Note</div>
                  <div className="font-sans text-[12px] text-navy-500 leading-relaxed">
                    Calendar correlations are treated as statistical observations, never as causal mechanisms. Their value comes from convergence with independent layers, where a calendar event coinciding with a geopolitical escalation and a market microstructure anomaly carries more weight than any single indicator.
                  </div>
                </div>
              </div>
            </ExpandableSection>

            <ExpandableSection title="CEL / Celestial Events">
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The celestial layer tracks astronomical events including lunar phases, solar and lunar eclipses, planetary transits, and solar activity cycles. This layer is deliberately positioned as a historical correlation tool. The platform does not assert causal mechanisms between celestial events and market behaviour. It tracks them because statistically significant correlations exist in the data, and dismissing data because it lacks an obvious causal story is a form of confirmation bias.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Research from Dichev and Janes (2003) documented that stock returns during 15-day periods around new moons are roughly double those around full moons, across 25 international markets over 100 years. Yuan, Zheng, and Zhu (2006) found similar lunar cycle effects on returns in 48 countries. Whether this reflects human behavioural patterns, coincidence, or an unmeasured confounding variable, the correlation is documented and the system tracks it.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Celestial signals receive the lowest base weight in the convergence engine. They almost never trigger alerts on their own. Their value is exclusively as a convergence amplifier, adding weight to clusters where independent layers already agree.
                </p>
              </div>
            </ExpandableSection>

            <ExpandableSection title="MKT / Market Microstructure">
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The market layer monitors quantitative signals from options flow, volatility surfaces, cross-asset correlations, credit spreads, and macro indicator surprises. Data is sourced primarily from Alpha Vantage (equities and crypto, with automatic symbol type detection) and FRED (Federal Reserve Economic Data, covering 200+ series with series-specific lookback windows).
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Options flow analysis tracks unusual volume, put/call ratio deviations, and gamma exposure (GEX) to detect dealer hedging pressure. The GEX calculation aggregates open interest across strike prices, computes net gamma exposure, and identifies positive/negative gamma flip points where dealer hedging behaviour shifts from stabilising to destabilising.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Short interest tracking monitors aggregate short positions across markets, flagging unusual buildups that may indicate institutional positioning ahead of anticipated events. Combined with the options flow data, this provides a comprehensive view of institutional sentiment that often diverges from headline narratives.
                </p>
                <div className="mt-4 border border-navy-800/30 rounded p-4 bg-navy-900/20">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-2">Key Indicators</div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {[
                      "VIX term structure",
                      "Put/Call ratio",
                      "Gamma exposure (GEX)",
                      "HY credit spreads",
                      "Yield curve shape",
                      "DXY direction",
                      "Short interest shifts",
                      "Options flow anomalies",
                    ].map((item) => (
                      <div key={item} className="font-mono text-[10px] text-navy-500 flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-accent-cyan/40" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ExpandableSection>

            <ExpandableSection title="OSI / Open Source Intelligence">
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The OSINT layer processes open-source data from multiple real-time feeds: OpenSky Network for military and civilian aircraft tracking (polled every 20 seconds), GDELT for global event monitoring (5-minute intervals), AIS vessel tracking for maritime domain awareness, and social media signals for narrative momentum detection.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Aircraft tracking focuses on military transponder codes and unusual flight patterns. The system maintains a database of known military aircraft types and their typical operating areas. Deviations from normal patterns, such as tanker aircraft entering unusual airspace or reconnaissance platforms orbiting specific regions, generate signals.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Vessel tracking monitors global shipping lanes with emphasis on five critical chokepoints (Strait of Hormuz, Suez Canal, Malacca Strait, Bab el-Mandeb, Panama Canal). The system tracks dark fleet activity through AIS gap detection, where vessels disabling their transponders in sanctioned waters generate high-priority signals.
                </p>
              </div>
            </ExpandableSection>
          </div>

          {/* Intensity Scoring */}
          <div className={`mt-10 border border-navy-800/40 rounded-lg p-6 bg-navy-900/10 ${anim} ${signalReveal.visible ? shown : hidden}`} style={{ transitionDelay: "300ms" }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-navy-500 mb-4">
              Signal Intensity Scoring
            </div>
            <p className="font-sans text-[13px] text-navy-400 leading-[1.8] mb-4">
              Each signal receives a raw intensity score based on its individual significance. This score is then normalised to a 1-5 scale using the following classification:
            </p>
            <div className="grid grid-cols-5 gap-2">
              {[
                { level: "1", label: "Routine", color: "#06b6d4", desc: "Below-average significance" },
                { level: "2", label: "Notable", color: "#22c55e", desc: "Above-baseline activity" },
                { level: "3", label: "Significant", color: "#f59e0b", desc: "Clear anomaly detected" },
                { level: "4", label: "Critical", color: "#f97316", desc: "Major event in progress" },
                { level: "5", label: "Extreme", color: "#ef4444", desc: "Rare-event threshold" },
              ].map((l) => (
                <div key={l.level} className="text-center">
                  <div
                    className="font-mono text-lg font-bold mb-1"
                    style={{ color: l.color }}
                  >
                    {l.level}
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-navy-400 mb-1">
                    {l.label}
                  </div>
                  <div className="font-sans text-[10px] text-navy-600 leading-snug">
                    {l.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          02: CONVERGENCE ANALYSIS
      ══════════════════════════════════════════ */}
      <section id="convergence" className="px-6 py-20">
        <div ref={convergenceReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="02" label="Convergence Analysis" visible={convergenceReveal.visible} />

          <div className={`max-w-3xl mb-8 ${anim} ${convergenceReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              The convergence engine is the core differentiator of the NEXUS platform. Individual signals from any single layer are informative. Temporal and thematic overlap between independent layers is where the real analytical value emerges. The mathematics behind convergence scoring is designed to reward independence and penalise correlation.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              Signals are grouped into proximity clusters using a 3-day sliding window. Within each window, the system identifies all unique signal layers represented and calculates a convergence score using a non-linear amplification function. Two layers aligning is interesting. Three is significant. Four or five is a rare-event window that warrants immediate attention.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              The amplification is non-linear because the real world is non-linear. Two independent systems agreeing is mildly informative. Five independent systems agreeing on the same region, timeframe, and direction is an extremely low-probability event under the null hypothesis that these systems are unrelated. The convergence score reflects this.
            </p>
          </div>

          {/* Scoring Formula */}
          <div className={`border border-navy-800/40 rounded-lg p-6 bg-navy-900/10 mb-6 ${anim} ${convergenceReveal.visible ? shown : hidden}`} style={{ transitionDelay: "200ms" }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-navy-500 mb-4">
              Convergence Scoring Algorithm
            </div>
            <div className="space-y-3">
              <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                <span className="font-mono text-accent-cyan">Base score</span> is the sum of individual event significance scores within the cluster window. Each event contributes its normalised intensity (1-5).
              </p>
              <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                <span className="font-mono text-accent-cyan">Convergence bonus</span> is applied when 2+ distinct signal layers are present. Each additional layer beyond the first adds a multiplier to the base score. The multiplier increases non-linearly: the marginal contribution of the 4th independent layer is greater than that of the 2nd.
              </p>
              <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                <span className="font-mono text-accent-cyan">Final normalisation</span> maps the raw intensity score (which can theoretically range from 0 to unbounded) into the 1-5 output scale for downstream consumption by the synthesis engine.
              </p>
              <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                <span className="font-mono text-accent-cyan">Temporal decay</span> is applied to signals as they age within the cluster window. A signal at T-0 receives full weight. A signal at T-3 days receives reduced weight. This ensures that the convergence score reflects the current state rather than accumulating stale signals.
              </p>
            </div>
          </div>

          <div className={`border border-navy-800/40 rounded-lg p-6 bg-navy-900/10 ${anim} ${convergenceReveal.visible ? shown : hidden}`} style={{ transitionDelay: "300ms" }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-navy-500 mb-3">
              Design Principle
            </div>
            <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
              NEXUS does not predict events. It identifies conditions under which events become more probable. The distinction matters: prediction implies certainty, while convergence analysis surfaces elevated probability windows. The system flags when an unusual number of independent indicators are pointing in the same direction, within the same timeframe, affecting the same region or asset class. What you do with that information is a decision, not a directive.
            </p>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          03: AI-DRIVEN SYNTHESIS
      ══════════════════════════════════════════ */}
      <section id="synthesis" className="px-6 py-20">
        <div ref={synthesisReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="03" label="AI-Driven Intelligence Synthesis" visible={synthesisReveal.visible} />

          <div className={`max-w-3xl mb-8 ${anim} ${synthesisReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              Converged signal clusters are passed through a structured AI analysis pipeline powered by Anthropic&apos;s Claude. The synthesis layer does not generate generic market commentary. Every output is grounded in specific signal data that triggered it. The AI receives the full signal cluster, historical parallels, current market context, active knowledge base entries, and regime state as structured inputs.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              The prompt architecture is calibrated for precision over volume. The system favours a single high-confidence assessment over multiple hedged opinions. When confidence is genuinely low, it states this explicitly with reasoning. There is no incentive structure that rewards volume of output.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              Intelligence briefs are tagged with confidence levels, time horizons, and the specific signals that informed each conclusion. This creates full traceability from raw signal to final assessment. Every thesis can be deconstructed back to the data points that generated it.
            </p>
          </div>

          <div className={`space-y-4 ${anim} ${synthesisReveal.visible ? shown : hidden}`} style={{ transitionDelay: "200ms" }}>
            <div className="border border-navy-800/40 rounded-lg p-6 bg-navy-900/10">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-navy-500 mb-4">
                Synthesis Output Schema
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "Directional Assessment", desc: "Market impact direction (bullish/bearish/mixed) with magnitude estimate" },
                  { label: "Escalation Probability", desc: "Probability ranges for scenario evolution based on historical parallels" },
                  { label: "Affected Instruments", desc: "Specific tickers, sectors, and asset classes with expected impact" },
                  { label: "Historical Parallels", desc: "Past convergence events with similar signatures and their outcomes" },
                  { label: "Scenario Trees", desc: "Branching probability paths with weighted likelihood assignments" },
                  { label: "Confidence Tagging", desc: "Explicit confidence level, time horizon, and supporting signal references" },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan/40 mt-1.5 shrink-0" />
                    <div>
                      <div className="font-mono text-[10px] text-navy-300 mb-0.5">{item.label}</div>
                      <div className="font-sans text-[11px] text-navy-500 leading-relaxed">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          04: PREDICTION ENGINE
      ══════════════════════════════════════════ */}
      <section id="prediction" className="px-6 py-20">
        <div ref={predictionReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="04" label="Prediction Engine and Calibration" visible={predictionReveal.visible} />

          <div className={`max-w-3xl mb-8 ${anim} ${predictionReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              The prediction engine converts intelligence syntheses into falsifiable, time-bounded, binary-outcome predictions. Every prediction specifies a ticker or event, a directional claim, a confidence level, and a resolution timeframe. There are no vague calls. Either the prediction resolves as confirmed or denied, and the scoring is automatic.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              Uniqueness is strictly enforced at generation time. The system checks for duplicate tickers, assets, and events before generating new predictions. Post-generation deduplication uses text similarity matching (50%+ word overlap threshold) and ticker-level conflict checking to prevent redundancy.
            </p>
          </div>

          <div className={`space-y-4 ${anim} ${predictionReveal.visible ? shown : hidden}`} style={{ transitionDelay: "200ms" }}>
            <ExpandableSection title="Brier Scoring" defaultOpen>
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Predictions are scored using the Brier score (Brier, 1950), the standard metric for evaluating the accuracy of probabilistic forecasts. The Brier score is the mean squared error between the predicted probability and the actual outcome:
                </p>
                <div className="border border-navy-800/30 rounded p-4 bg-navy-950/50 font-mono text-[12px] text-accent-cyan text-center">
                  BS = (1/N) &Sigma; (f&#x1D62; - o&#x1D62;)&sup2;
                </div>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Where f&#x1D62; is the forecast probability and o&#x1D62; is the binary outcome (1 = confirmed, 0 = denied). The score ranges from 0 (perfect calibration) to 1 (maximally wrong). A Brier score of 0.25 corresponds to a naive 50/50 baseline. Anything below 0.25 indicates the system is adding predictive value.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The critical property of the Brier score is that it penalises overconfidence. A prediction assigned 95% confidence that turns out wrong receives a much larger penalty than a 60% prediction that turns out wrong. This creates a natural incentive toward well-calibrated probability estimates rather than extreme confidence.
                </p>
              </div>
            </ExpandableSection>

            <ExpandableSection title="Log Loss (Cross-Entropy)">
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  In addition to Brier scoring, the system computes log loss (cross-entropy) for each prediction. Log loss applies a logarithmic penalty that grows asymptotically as confidence approaches certainty, making it even more punishing for confident wrong predictions than the Brier score.
                </p>
                <div className="border border-navy-800/30 rounded p-4 bg-navy-950/50 font-mono text-[12px] text-accent-cyan text-center">
                  LL = -[o&middot;log(f) + (1-o)&middot;log(1-f)]
                </div>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  A prediction assigned 99% confidence that resolves as wrong produces a log loss of approximately 4.6, while a 60% prediction that resolves wrong produces a log loss of approximately 0.92. This 5x penalty ratio enforces epistemic humility at the extremes.
                </p>
              </div>
            </ExpandableSection>

            <ExpandableSection title="Calibration Buckets and Reliability Diagrams">
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Predictions are binned into five confidence bands: 0-35%, 35-50%, 50-65%, 65-80%, and 80-100%. For each band, the system tracks the actual resolution rate. A well-calibrated system should show resolution rates that match the bin midpoints, e.g., predictions in the 65-80% band should resolve as confirmed approximately 72.5% of the time.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Deviations from the calibration diagonal indicate systematic bias. If the 80-100% band shows only 60% confirmation, the system is overconfident at high levels. If the 35-50% band shows 70% confirmation, the system is underconfident at low levels. Both patterns are automatically detected and flagged.
                </p>
              </div>
            </ExpandableSection>

            <ExpandableSection title="Feedback Loops and Self-Correction">
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Resolved predictions generate feedback that flows upstream into every component. The system tracks performance breakdown by category (market, geopolitical, celestial), by timeframe (7/14/30/90 days), and by signal combination to identify which convergence patterns produce accurate forecasts and which do not.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Failure pattern detection automatically identifies overconfident denials, category-specific weaknesses, and timeframe underperformance. When the system detects that its predictions in a specific category consistently underperform, it records the pattern as a knowledge entry and applies damped calibration corrections.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Calibration corrections are damped to prevent overcorrection. The system applies a maximum of 50% of the identified confidence gap per correction round, using exponential decay with a 60-day half-life so recent predictions carry more weight than older ones. Resolution bias detection compares LLM subjective scores against binary accuracy metrics, flagging systematic leniency or harshness in the resolution process itself.
                </p>
              </div>
            </ExpandableSection>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          05: GAME THEORY
      ══════════════════════════════════════════ */}
      <section id="game-theory" className="px-6 py-20">
        <div ref={gameReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="05" label="Game Theory Framework" visible={gameReveal.visible} />

          <div className={`max-w-3xl mb-8 ${anim} ${gameReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              The game theory module models geopolitical interactions as strategic games between defined actors. Each scenario defines two or more actors with strategy sets, and constructs a payoff matrix representing the outcomes of all strategy combinations. The system then applies classical game-theoretic analysis to identify equilibria, focal points, and escalation dynamics.
            </p>
          </div>

          <div className={`space-y-4 ${anim} ${gameReveal.visible ? shown : hidden}`} style={{ transitionDelay: "200ms" }}>
            <ExpandableSection title="Nash Equilibrium Detection" defaultOpen>
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The system implements brute-force Nash equilibrium detection for 2-player normal-form games. For each strategy profile (combination of strategies, one per player), the algorithm checks whether either player can improve their payoff by unilaterally deviating. A profile where neither player benefits from deviation is a Nash equilibrium.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Multiple equilibria are common in geopolitical scenarios, reflecting the genuine strategic ambiguity that characterises international relations. When multiple equilibria exist, the system identifies which is Pareto-dominant (no player can be made better off without making another worse off) and which is risk-dominant (the equilibrium that players are most likely to converge on given uncertainty about the opponent&apos;s strategy).
                </p>
              </div>
            </ExpandableSection>

            <ExpandableSection title="Schelling Focal Points">
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Drawing on Schelling&apos;s theory of focal points (1960), the system identifies outcomes that are likely to emerge as coordination targets even without explicit communication between actors. Focal points are identified through three heuristics: Pareto-optimal outcomes (mutual gain), least-escalatory strategies (status quo preservation), and probability weighting based on payoff alignment.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  In geopolitical contexts, Schelling points often correspond to de-escalation pathways or status quo outcomes where neither party gains but neither party suffers catastrophic loss. The system flags when current actor behaviour is diverging from the expected focal point, which often precedes escalation.
                </p>
              </div>
            </ExpandableSection>

            <ExpandableSection title="Escalation Ladder and Dominant Strategy Detection">
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The escalation ladder orders all strategy profiles from least to most escalatory based on aggregate payoff magnitude. Each profile is assigned an escalation level (1-5) reflecting its position on the ladder. The system tracks real-world events against the ladder to estimate where a scenario currently sits.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Dominant strategy detection identifies when an actor has a strategy that outperforms all alternatives regardless of the opponent&apos;s choice. When a dominant strategy exists and that strategy is escalatory, the system flags elevated risk regardless of other indicators.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  Market impact is derived from the scenario analysis: direction (bullish/bearish/mixed), magnitude (low/medium/high), affected sectors, and stability classification (stable if total payoff is positive, unstable if negative). 10+ geopolitical actors are pre-configured with strategic profiles, objectives, and historical behaviour patterns.
                </p>
              </div>
            </ExpandableSection>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          06: INDICATIONS AND WARNINGS
      ══════════════════════════════════════════ */}
      <section id="iw-framework" className="px-6 py-20">
        <div ref={iwReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="06" label="Indications and Warnings Framework" visible={iwReveal.visible} />

          <div className={`max-w-3xl mb-8 ${anim} ${iwReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              The Indications and Warnings (I&amp;W) framework is adapted from military intelligence methodology. Each threat scenario defines a tree of indicators, observable events that would be expected to occur if the threat were materialising. As indicators activate, the scenario&apos;s threat level escalates through a defined escalation ladder.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              Indicators carry individual weights reflecting their diagnostic value. A troop mobilisation carries more weight than a diplomatic statement. Each indicator has four possible states, each with a corresponding multiplier:
            </p>
          </div>

          <div className={`grid grid-cols-4 gap-3 mb-8 ${anim} ${iwReveal.visible ? shown : hidden}`} style={{ transitionDelay: "200ms" }}>
            {[
              { state: "Inactive", mult: "0.0x", color: "text-navy-500", bg: "bg-navy-900/30", border: "border-navy-800/40" },
              { state: "Watching", mult: "0.3x", color: "text-accent-cyan", bg: "bg-accent-cyan/5", border: "border-accent-cyan/20" },
              { state: "Active", mult: "0.7x", color: "text-accent-amber", bg: "bg-accent-amber/5", border: "border-accent-amber/20" },
              { state: "Confirmed", mult: "1.0x", color: "text-accent-rose", bg: "bg-accent-rose/5", border: "border-accent-rose/20" },
            ].map((s) => (
              <div key={s.state} className={`rounded-lg p-4 border ${s.bg} ${s.border} text-center`}>
                <div className={`font-mono text-sm font-bold ${s.color} mb-1`}>{s.mult}</div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-navy-400">{s.state}</div>
              </div>
            ))}
          </div>

          <div className={`max-w-3xl space-y-5 ${anim} ${iwReveal.visible ? shown : hidden}`} style={{ transitionDelay: "300ms" }}>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              The scenario score is the weighted sum of (indicator.weight &times; status_multiplier) across all indicators, normalised to a percentage. Escalation levels map to percentage thresholds: Level 1 (0-20%), Level 2 (20-40%), Level 3 (40-60%), Level 4 (60-80%), Level 5 (80-100%).
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              Auto-detection from OSINT feeds operates continuously. GDELT and news headlines are matched against detection queries defined for each indicator. Two or more keyword matches move an indicator to &quot;watching&quot; status. Three or more matches with high-reliability sources (based on the NATO Admiralty rating) auto-activate the indicator. All threshold transitions are recorded with timestamps and triggering data for audit trail purposes.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              Each scenario maps escalation levels to affected market sectors (energy, defense, transportation, etc.) and estimates market impact severity. This feeds directly into the thesis generation system and portfolio risk assessment.
            </p>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          07: MARKET REGIME DETECTION
      ══════════════════════════════════════════ */}
      <section id="regime-detection" className="px-6 py-20">
        <div ref={regimeReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="07" label="Market Regime Detection" visible={regimeReveal.visible} />

          <div className={`max-w-3xl mb-8 ${anim} ${regimeReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              Market regime detection classifies the current environment across six dimensions, each tracked independently with its own data sources, thresholds, and state transitions. This multi-dimensional approach captures the reality that market conditions cannot be reduced to a single &quot;risk-on/risk-off&quot; toggle.
            </p>
          </div>

          <div className={`space-y-3 mb-8 ${anim} ${regimeReveal.visible ? shown : hidden}`} style={{ transitionDelay: "200ms" }}>
            {[
              { dim: "Volatility", indicator: "VIX", states: "Suppressed (<13) / Low (13-17) / Normal (17-22) / Elevated (22-30) / High (30-40) / Crisis (>40)", weight: "0.20" },
              { dim: "Growth", indicator: "GDP + Claims + Sentiment + Industrial Production", states: "Expansion / Growth / Slowdown / Contraction", weight: "0.25" },
              { dim: "Monetary Policy", indicator: "Fed Funds level + direction", states: "Tightening / Neutral / Easing / Emergency", weight: "0.15" },
              { dim: "Risk Appetite", indicator: "HY OAS + VIX + Yield Curve", states: "Risk-On / Neutral / Risk-Off / Panic", weight: "0.20" },
              { dim: "US Dollar", indicator: "Trade-weighted DXY + direction", states: "Strengthening / Stable / Weakening / Crisis", weight: "0.10" },
              { dim: "Commodities", indicator: "WTI + Gold", states: "Supercycle-Up / Stable / Deflation / Supply-Shock", weight: "0.10" },
            ].map((r) => (
              <div key={r.dim} className="border border-navy-800/40 rounded-lg p-4 bg-navy-900/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[11px] font-semibold text-navy-200 uppercase tracking-wider">{r.dim}</span>
                  <span className="font-mono text-[10px] text-accent-cyan">{r.weight} weight</span>
                </div>
                <div className="font-sans text-[11px] text-navy-500 mb-1">{r.indicator}</div>
                <div className="font-mono text-[10px] text-navy-600">{r.states}</div>
              </div>
            ))}
          </div>

          <div className={`max-w-3xl ${anim} ${regimeReveal.visible ? shown : hidden}`} style={{ transitionDelay: "300ms" }}>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              A composite score is computed as the weighted average across all dimensions, mapped to a -1 to +1 scale. Regime shifts are detected when any dimension transitions between states, with hardcoded interpretation rules (e.g., &quot;suppressed-to-elevated volatility often precedes drawdowns&quot;). Each transition generates market implications that feed into thesis generation. State history is persisted for trend analysis.
            </p>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          08: SYSTEMIC RISK
      ══════════════════════════════════════════ */}
      <section id="systemic-risk" className="px-6 py-20">
        <div ref={systemicReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="08" label="Systemic Risk Monitoring" visible={systemicReveal.visible} />

          <div className={`max-w-3xl mb-8 ${anim} ${systemicReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              The systemic risk module implements two complementary quantitative frameworks for detecting market-wide stress: the Absorption Ratio (Kritzman, Li, Page, and Rigobon, 2011) and the Turbulence Index (Mahalanobis distance from historical norms). Together, these metrics identify conditions where diversification is failing and markets are moving in lockstep, the exact conditions that precede systemic events.
            </p>
          </div>

          <div className={`space-y-4 ${anim} ${systemicReveal.visible ? shown : hidden}`} style={{ transitionDelay: "200ms" }}>
            <ExpandableSection title="Absorption Ratio" defaultOpen>
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The Absorption Ratio measures the fraction of total variance in a multi-asset basket that is explained by a small number of principal components. When markets are calm and diversification is working, risk is distributed across many independent factors. When systemic stress rises, correlations increase and a smaller number of factors absorb a larger share of total variance.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  NEXUS computes the Absorption Ratio from a 10-asset basket: SPY, QQQ, IWM, EEM, TLT, HYG, LQD, GLD, USO, UUP, plus VIX. The covariance matrix is decomposed via eigenvalue analysis, and the top K eigenvalues (K = ceil(N/5)) are summed to produce the absorption fraction.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  An Absorption Ratio above 0.85 indicates that markets are moving in lockstep, which historically precedes systemic drawdowns. The 2008 crisis, the 2020 COVID crash, and the 2022 rate shock all showed absorption ratios above 0.85 in the weeks prior.
                </p>
              </div>
            </ExpandableSection>

            <ExpandableSection title="Turbulence Index (Mahalanobis Distance)">
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The Turbulence Index measures how unusual current market returns are relative to historical norms, accounting for the correlation structure between assets. It uses the Mahalanobis distance, the covariance-weighted distance between the current return vector and the historical mean vector.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The distance is percentile-ranked within a trailing 120-day window. Readings above the 95th percentile indicate extreme market stress. The combination of high absorption and high turbulence is particularly diagnostic: it indicates that markets are both highly correlated (absorption) and experiencing unusual returns (turbulence).
                </p>
              </div>
            </ExpandableSection>

            <ExpandableSection title="Composite Stress Score and Regime Classification">
              <div className="pt-4 space-y-4">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The two metrics are combined into a composite stress score (0-100): the Absorption Ratio contributes up to 50 points ((AR - 0.5) &times; 100, capped at 50), the Turbulence Index contributes up to 50 points (percentile / 2), and a Z-score bonus of up to 20 points rewards rapid changes in the Absorption Ratio relative to its rolling mean.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  The composite score maps to four regime labels: <span className="font-mono text-accent-emerald">Stable</span> (below 30), <span className="font-mono text-accent-cyan">Elevated</span> (30-50 or AR &ge;0.7 or Z-score &ge;1.5), <span className="font-mono text-accent-amber">Fragile</span> (50-75 or AR &ge;0.8 or turbulence &ge;80th), and <span className="font-mono text-accent-rose">Critical</span> (&ge;75 or AR &ge;0.85 with turbulence &ge;90th).
                </p>
              </div>
            </ExpandableSection>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          09: BOCPD
      ══════════════════════════════════════════ */}
      <section id="bocpd" className="px-6 py-20">
        <div ref={bocpdReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="09" label="Bayesian Online Change Point Detection" visible={bocpdReveal.visible} />

          <div className={`max-w-3xl ${anim} ${bocpdReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              NEXUS implements Bayesian Online Change Point Detection (BOCPD), following Adams and MacKay (2007). The algorithm detects structural breaks in time series data in real-time, identifying the moments where the underlying data-generating process changes, such as volatility regime shifts, trend reversals, or correlation breakdowns.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              The implementation uses a Student-t predictive distribution rather than Gaussian, providing greater robustness to the fat-tailed returns typical of financial data. Each run-length hypothesis maintains its own sufficient statistics (mean, variance, count), and the Bayesian update mixture combines predictions from all active run-length experts.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              Log-gamma approximations are used for computational efficiency, allowing the algorithm to run in real-time without accumulating prohibitive computational cost. The system monitors six key series (SPY, QQQ, VIX, GLD, USO, TLT) and outputs detected change points with date, probability, run length, magnitude, direction, and pre/post-change mean comparison.
            </p>
            <div className="border border-navy-800/30 rounded p-4 bg-navy-900/20">
              <div className="font-mono text-[9px] uppercase tracking-wider text-navy-600 mb-2">Reference</div>
              <div className="font-sans text-[12px] text-navy-500 leading-relaxed">
                Adams, R.P. and MacKay, D.J.C. (2007). &quot;Bayesian Online Changepoint Detection.&quot; arXiv:0710.3742
              </div>
            </div>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          10: ACH
      ══════════════════════════════════════════ */}
      <section id="ach" className="px-6 py-20">
        <div ref={achReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="10" label="Analysis of Competing Hypotheses" visible={achReveal.visible} />

          <div className={`max-w-3xl mb-8 ${anim} ${achReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              The ACH module implements the structured analytic technique developed by Richards Heuer at the CIA (Heuer, 1999). ACH is designed to counteract cognitive biases, particularly confirmation bias, by forcing systematic evaluation of evidence against multiple hypotheses simultaneously.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              Each analysis defines a set of hypotheses and a set of evidence items. Every evidence item is rated against every hypothesis on a five-point consistency scale: Strongly Consistent (CC, +2), Consistent (C, +1), Neutral (N, 0), Inconsistent (I, -1), and Strongly Inconsistent (II, -2).
            </p>
          </div>

          <div className={`space-y-4 ${anim} ${achReveal.visible ? shown : hidden}`} style={{ transitionDelay: "200ms" }}>
            <div className="border border-navy-800/40 rounded-lg p-6 bg-navy-900/10">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-navy-500 mb-4">
                ACH Scoring Methodology
              </div>
              <div className="space-y-3">
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  <span className="font-mono text-accent-cyan">Evidence weighting:</span> Each evidence item carries a credibility weight (high=1.0, medium=0.7, low=0.4) and a relevance weight (high=1.0, medium=0.7, low=0.4). The product of these weights scales the rating&apos;s contribution to the hypothesis score.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  <span className="font-mono text-accent-cyan">Inconsistency scoring:</span> Following Heuer&apos;s methodology, the focus is on inconsistency rather than consistency. The hypothesis with the least inconsistent evidence is considered most likely, because consistency can be fabricated or coincidental while genuine inconsistency is diagnostic.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  <span className="font-mono text-accent-cyan">Probability conversion:</span> Inconsistency scores are converted to probability distributions using the softmax function, providing normalised likelihoods across all hypotheses.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                  <span className="font-mono text-accent-cyan">Diagnosticity analysis:</span> Evidence items are ranked by their diagnosticity, the variance in their ratings across hypotheses. High-variance evidence is diagnostic (it distinguishes between hypotheses). Low-variance evidence is non-diagnostic (it is consistent with everything and therefore tells you little).
                </p>
              </div>
            </div>

            <div className="border border-navy-800/40 rounded-lg p-6 bg-navy-900/10">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-navy-500 mb-3">
                AI-Assisted Analysis
              </div>
              <p className="font-sans text-[13px] text-navy-400 leading-[1.8]">
                The ACH module integrates AI analysis that reviews the completed matrix and flags: missing hypotheses that should be considered, potential cognitive biases in the rating patterns, gaps where additional evidence would be most diagnostic, and a devil&apos;s advocate argument for the least likely hypothesis. The AI does not override the analyst&apos;s ratings. It provides a structured second opinion on the analytical process itself.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          11: NATO ADMIRALTY RATING
      ══════════════════════════════════════════ */}
      <section id="source-reliability" className="px-6 py-20">
        <div ref={sourceReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="11" label="NATO Admiralty Rating System" visible={sourceReveal.visible} />

          <div className={`max-w-3xl mb-8 ${anim} ${sourceReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              Every information source consumed by NEXUS is rated using the NATO/Admiralty system, a two-axis evaluation framework used by intelligence agencies worldwide. The first axis rates the source itself (A through F for reliability). The second axis rates the specific information (1 through 6 for accuracy).
            </p>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 ${anim} ${sourceReveal.visible ? shown : hidden}`} style={{ transitionDelay: "200ms" }}>
            <div className="border border-navy-800/40 rounded-lg p-5 bg-navy-900/10">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-navy-500 mb-4">
                Source Reliability (A-F)
              </div>
              <div className="space-y-2">
                {[
                  { grade: "A", label: "Completely Reliable", examples: "Reuters, AP, Bloomberg, FT, WSJ" },
                  { grade: "B", label: "Usually Reliable", examples: "NYT, Guardian, SCMP, Bellingcat, Janes, RAND" },
                  { grade: "C", label: "Fairly Reliable", examples: "CNN, Politico, Defense One, Naval News" },
                  { grade: "D", label: "Not Usually Reliable", examples: "Daily Mail, NY Post, Fox News" },
                  { grade: "E", label: "Unreliable / Propaganda", examples: "RT, Sputnik, CGTN, TASS, PressTV" },
                  { grade: "F", label: "Cannot Be Judged", examples: "Unknown or first-time sources" },
                ].map((g) => (
                  <div key={g.grade} className="flex items-start gap-3">
                    <span className="font-mono text-[11px] font-bold text-accent-cyan w-3">{g.grade}</span>
                    <div>
                      <div className="font-sans text-[11px] text-navy-300">{g.label}</div>
                      <div className="font-sans text-[10px] text-navy-600">{g.examples}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-navy-800/40 rounded-lg p-5 bg-navy-900/10">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-navy-500 mb-4">
                Information Accuracy (1-6)
              </div>
              <div className="space-y-2">
                {[
                  { grade: "1", label: "Confirmed", rule: "3+ sources including 2+ reliable, corroborated" },
                  { grade: "2", label: "Probably True", rule: "2+ sources including 1+ reliable, corroborated" },
                  { grade: "3", label: "Possibly True", rule: "Reliable source, unconfirmed" },
                  { grade: "4", label: "Doubtful", rule: "Fairly reliable source, no corroboration" },
                  { grade: "5", label: "Improbable", rule: "Only unreliable sources" },
                  { grade: "6", label: "Cannot Determine", rule: "Insufficient basis for assessment" },
                ].map((g) => (
                  <div key={g.grade} className="flex items-start gap-3">
                    <span className="font-mono text-[11px] font-bold text-accent-cyan w-3">{g.grade}</span>
                    <div>
                      <div className="font-sans text-[11px] text-navy-300">{g.label}</div>
                      <div className="font-sans text-[10px] text-navy-600">{g.rule}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`max-w-3xl ${anim} ${sourceReveal.visible ? shown : hidden}`} style={{ transitionDelay: "300ms" }}>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              Composite confidence is calculated as 40% source reliability + 60% information accuracy. The system maintains a curated database of 100+ sources with specialties, bias direction (left/center/right/state-aligned), geographic focus, and historical track record (0-1 scale). Source ratings directly influence how signals from those sources are weighted in the convergence engine.
            </p>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          12: ECONOMIC NOWCASTING
      ══════════════════════════════════════════ */}
      <section id="nowcasting" className="px-6 py-20">
        <div ref={nowcastReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="12" label="Economic Nowcasting" visible={nowcastReveal.visible} />

          <div className={`max-w-3xl mb-8 ${anim} ${nowcastReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              The nowcasting module produces real-time estimates of macroeconomic conditions using high-frequency proxy data, bridging the gap between quarterly GDP releases and the daily reality of economic activity. Six dimensions are tracked simultaneously.
            </p>
          </div>

          <div className={`space-y-3 ${anim} ${nowcastReveal.visible ? shown : hidden}`} style={{ transitionDelay: "200ms" }}>
            {[
              { label: "GDP Nowcast", desc: "Anchored to official GDP with adjustments from initial claims (+0.3 at 220k, -0.5 at 300k), consumer sentiment, yield curve inversion penalty. Output: point estimate with 0.8pp confidence band and direction classification." },
              { label: "Inflation Nowcast", desc: "Anchored to 5-year breakeven inflation. Adjusted for oil price pressure (+0.3 above $90, -0.3 below $55) and dollar strength deflation signal (-0.1 for rising DXY)." },
              { label: "Employment", desc: "Initial claims classified: strong (<220k), moderate (220-280k), softening (280-350k), deteriorating (>350k). Direction inferred from week-over-week change." },
              { label: "Financial Conditions", desc: "VIX + HY credit spread + Fed Funds + dollar strength composited into a -2 to +2 index. Labels: very-tight / tight / neutral / loose / very-loose." },
              { label: "Consumer Strength", desc: "Consumer sentiment score classification with trend direction from recent readings." },
              { label: "Global Trade", desc: "Oil price and dollar direction as proxies for trade momentum: expanding / stable / contracting." },
            ].map((item) => (
              <div key={item.label} className="border border-navy-800/40 rounded-lg p-4 bg-navy-900/10">
                <div className="font-mono text-[11px] text-navy-200 uppercase tracking-wider mb-2">{item.label}</div>
                <p className="font-sans text-[12px] text-navy-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className={`mt-6 max-w-3xl ${anim} ${nowcastReveal.visible ? shown : hidden}`} style={{ transitionDelay: "300ms" }}>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              A composite risk score (0-100) aggregates all dimensions. Recession probability is estimated heuristically: base 5%, +70% if GDP is negative, +15% if financial conditions are tight, +20% if employment is deteriorating. The model is deliberately simple and transparent. Complex econometric models can outperform on backtests but tend to fail in novel regimes. This model makes its assumptions explicit and lets the analyst judge.
            </p>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          13: MONTE CARLO
      ══════════════════════════════════════════ */}
      <section id="monte-carlo" className="px-6 py-20">
        <div ref={monteReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="13" label="Monte Carlo Simulation" visible={monteReveal.visible} />

          <div className={`max-w-3xl ${anim} ${monteReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              The Monte Carlo engine generates stochastic price paths for scenario analysis, supporting risk assessment and probability-weighted outcome modelling. The implementation goes beyond standard geometric Brownian motion by incorporating fat-tail distributions, jump processes, and mean reversion.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              Random sampling uses the Box-Muller transform for normal distribution generation, extended with the Azzalini method for skewed normals that model the asymmetric tail risk observed in real markets. Jump processes add discrete large moves with configurable daily probability and magnitude, allowing simulation of event-driven gaps.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              Per-scenario outputs include 100 sample paths for visualisation, percentile distributions (P5, P25, P50, P75, P95), expected return, maximum drawdown, and probability of profit. Multiple scenarios can be blended with probability weights to produce a composite outlook that reflects the analyst&apos;s assessment of which scenario is most likely.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              Optional mean reversion allows modelling of assets that tend toward a long-run value (commodities, interest rates), with configurable target and speed parameters. Leverage multipliers support simulation of leveraged positions and their impact on path distributions.
            </p>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          14: MARITIME / SHIPPING
      ══════════════════════════════════════════ */}
      <section id="shipping" className="px-6 py-20">
        <div ref={shippingReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="14" label="Maritime and Shipping Intelligence" visible={shippingReveal.visible} />

          <div className={`max-w-3xl mb-8 ${anim} ${shippingReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              The shipping intelligence module monitors global maritime trade through five critical chokepoints, tracking traffic volumes, anomalies, dark fleet activity, and freight market indicators. These waterways collectively handle trillions of dollars in annual trade, and disruption at any one of them creates immediate, measurable commodity price impacts.
            </p>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-5 gap-3 mb-8 ${anim} ${shippingReveal.visible ? shown : hidden}`} style={{ transitionDelay: "200ms" }}>
            {[
              { name: "Hormuz", daily: "58", value: "$1.2T", pct: "21% oil" },
              { name: "Suez", daily: "72", value: "$1T", pct: "12% trade" },
              { name: "Malacca", daily: "84", value: "$5.3T", pct: "25% oil" },
              { name: "Bab el-Mandeb", daily: "40", value: "$700B", pct: "9% oil" },
              { name: "Panama", daily: "38", value: "$270B", pct: "5% trade" },
            ].map((c) => (
              <div key={c.name} className="border border-navy-800/40 rounded p-3 bg-navy-900/10 text-center">
                <div className="font-mono text-[10px] text-navy-200 uppercase tracking-wider mb-2">{c.name}</div>
                <div className="font-mono text-[14px] font-bold text-accent-cyan">{c.daily}</div>
                <div className="font-sans text-[9px] text-navy-600">daily transits</div>
                <div className="font-mono text-[10px] text-navy-500 mt-1">{c.value}</div>
                <div className="font-sans text-[9px] text-navy-600">{c.pct}</div>
              </div>
            ))}
          </div>

          <div className={`max-w-3xl space-y-5 ${anim} ${shippingReveal.visible ? shown : hidden}`} style={{ transitionDelay: "300ms" }}>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              Risk scoring per chokepoint aggregates GDELT maritime event mentions (1 mention = +8 points, 2+ = +20, 5+ = +40), oil price volatility on energy-sensitive chokepoints (&gt;3% change = +3 &times; |change|, capped at 25), dark fleet activity (+15 per alert), and global maritime tension (+10 if &gt;15 total events system-wide).
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              Chokepoint status is classified as Normal (&lt;25% risk), Elevated (25-59%), or Disrupted (&ge;60%). At disruption level, the system estimates a 30% transit volume reduction. Six shipping equities (ZIM, SBLK, STNG, FRO, DHT, BDRY) are tracked as real-time freight rate proxies, providing market-side confirmation of maritime stress signals.
            </p>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          15: CENTRAL BANK NLP
      ══════════════════════════════════════════ */}
      <section id="central-bank" className="px-6 py-20">
        <div ref={centralReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="15" label="Central Bank NLP Analysis" visible={centralReveal.visible} />

          <div className={`max-w-3xl ${anim} ${centralReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              The central bank analysis module performs natural language processing on monetary policy statements, press conference transcripts, and minutes to extract hawkish/dovish sentiment, topic distribution, and rate path implications.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              Tokenisation is word-level with support for hyphenated compound terms (e.g., &quot;higher-for-longer&quot; is matched as a single token). The lexicon includes 40+ hawkish terms (inflation, tightening, restrictive, overheating, vigilance), 40+ dovish terms (accommodative, easing, downside-risks, pivot, patience), and 30+ uncertainty terms (data-dependent, conditional, balanced-risks, optionality).
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              The net score is (hawkish_count - dovish_count) / total_words. A score above +0.005 implies a hiking bias. Below -0.005 implies a cutting bias. Between these thresholds, the system classifies the stance as pausing or uncertain depending on the uncertainty term density.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              Topic breakdown categorises tokens into inflation, employment, growth, and financial stability. Market implications are pre-computed per dimension: bonds (&gt;+0.003 = bearish, &lt;-0.003 = bullish), equities, dollar, and gold. Statement-to-statement comparison detects tone shifts and significant changes across dimensions, flagging moments where central bank communication is evolving.
            </p>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          16: NARRATIVE TRACKING
      ══════════════════════════════════════════ */}
      <section id="narrative" className="px-6 py-20">
        <div ref={narrativeReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="16" label="Narrative Tracking and Divergence Detection" visible={narrativeReveal.visible} />

          <div className={`max-w-3xl ${anim} ${narrativeReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              The narrative engine tracks media momentum across 11 thematic clusters: war, sanctions, trade, inflation, recession, AI, crypto, oil, China, Russia, and Iran. Data is sourced from GDELT and Reddit in parallel, with keyword matching per theme.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              Sentiment scoring uses curated positive and negative word lists (40+ words each), normalised by total match count. Momentum classification compares recent article volume to older volume: Rising (&gt;1.5x ratio), Peaking (stable, recent &ge; older), Fading (older &gt;1.5x recent), or Stable.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              The most valuable output of narrative tracking is divergence detection. When a narrative has high conviction (sentiment &gt;0.4, 3+ articles) and the implied price direction does not match actual market movement, the system flags a potential contrarian signal. Strong bearish narratives that fail to move prices downward often precede rallies. Strong bullish narratives that fail to lift prices often precede corrections. The divergence is the signal.
            </p>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          17: OSINT ENTITY EXTRACTION
      ══════════════════════════════════════════ */}
      <section id="osint" className="px-6 py-20">
        <div ref={osintReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="17" label="OSINT Entity Extraction and Graph" visible={osintReveal.visible} />

          <div className={`max-w-3xl ${anim} ${osintReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              The entity extraction pipeline processes raw OSINT text and structures it into a searchable graph of actors, locations, topics, and market instruments. The system maintains curated pattern databases: 100+ geopolitical actors with keyword aliases, 15+ strategic chokepoints, 13 topic categories (nuclear, oil_supply, sanctions, military_exercise, etc.), and 70+ market tickers.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              Pattern matching identifies entities in text and maps them to database records. Extracted entities are linked in a relationship graph with weighted edges that strengthen as more co-occurrences are detected. The graph enables traversal queries: &quot;show all entities connected to Iran within 2 hops&quot; or &quot;find all tickers mentioned in articles about Strait of Hormuz.&quot;
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              Scenario mapping triggers when specific keyword combinations appear together: nuclear-related terms with Iran trigger the &quot;Iran Nuclear&quot; scenario, military terms with Taiwan trigger the &quot;Taiwan Strait&quot; scenario. Sentiment classification (positive/negative/neutral) and urgency scoring (low/medium/high/critical) are applied to each processed document.
            </p>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          18: KNOWLEDGE BANK
      ══════════════════════════════════════════ */}
      <section id="knowledge" className="px-6 py-20">
        <div ref={knowledgeReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="18" label="Knowledge Bank and Vector Embeddings" visible={knowledgeReveal.visible} />

          <div className={`max-w-3xl ${anim} ${knowledgeReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              The knowledge bank is a pgvector-backed semantic store containing structured intelligence entries. Each entry is embedded into a 1024-dimensional vector space using Voyage AI embeddings, enabling semantic search that finds relevant knowledge based on meaning rather than keyword matching.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              Multiple ingestion pipelines feed the knowledge bank: deterministic (curated facts and relationships), advanced (multi-document synthesis), live (real-time OSINT-to-knowledge), deep thematic (geopolitical relationship mapping), and structural (entity relationship extraction). Active knowledge filtering applies confidence thresholds and recency weighting to ensure that stale or low-confidence entries do not contaminate current analysis.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              The knowledge bank serves as institutional memory for the AI synthesis layer. When generating analysis, the system queries the knowledge bank for semantically relevant entries, providing historical context, established relationships, and previously identified patterns. This prevents the AI from treating each analysis as if starting from scratch and enables the system to build on its own accumulated intelligence.
            </p>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          19: AI PROGRESSION
      ══════════════════════════════════════════ */}
      <section id="ai-progression" className="px-6 py-20">
        <div ref={aiProgReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="19" label="AI Progression Tracking" visible={aiProgReveal.visible} />

          <div className={`max-w-3xl ${anim} ${aiProgReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              The AI progression module tracks the advancement of artificial intelligence capabilities as a distinct signal layer, recognising that AI development is itself a geopolitical and market-moving force. Four data dimensions are tracked: the Remote Labor Index (RLI) from remotelabor.ai, METR time horizons, the AI 2027 scenario timeline, and sector-level automation risk assessment.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              The RLI benchmarks AI systems against real-world freelance work tasks (6,000+ hours, $140K+ value), measuring what percentage of remote labor AI can currently automate. METR time horizons track the task duration at which frontier AI agents succeed 50% and 80% of the time, with a measured doubling time of 131 days post-2023.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85] mb-5">
              Sector automation risk profiles 10 industries with automation risk scores (0-100), current AI adoption rates, estimated jobs at risk, timeframe, and trend classification (accelerating/stable/early). FRED labor market data (unemployment rate, initial claims, nonfarm payrolls, labor force participation) provides real-world employment context.
            </p>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              A composite AI progression score (0-100) blends all dimensions: RLI performance (0-25), METR pace (0-25), enterprise adoption rate (0-25), and displacement indicators (0-25). The score maps to five regime labels: nascent, accelerating, inflection, displacement, and transformation.
            </p>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          20: SYSTEM INTEGRATION
      ══════════════════════════════════════════ */}
      <section id="integration" className="px-6 py-20">
        <div ref={integrationReveal.ref} className="max-w-5xl mx-auto">
          <SectionHead number="20" label="System Integration Architecture" visible={integrationReveal.visible} />

          <div className={`max-w-3xl mb-10 ${anim} ${integrationReveal.visible ? shown : hidden}`} style={{ transitionDelay: "100ms" }}>
            <p className="font-sans text-[15px] text-navy-300 leading-[1.85] mb-5">
              The individual methodologies documented above do not operate in isolation. The value of the platform comes from how they integrate. Every component consumes outputs from other components and produces outputs that feed downstream. The result is a self-reinforcing intelligence cycle where each iteration generates data that makes the next iteration sharper.
            </p>
          </div>

          <div className={`space-y-3 ${anim} ${integrationReveal.visible ? shown : hidden}`} style={{ transitionDelay: "200ms" }}>
            {[
              { from: "Signal Layers", to: "Convergence Engine", desc: "Independent signals are normalised and fed into the proximity clustering algorithm for convergence scoring." },
              { from: "Convergence Engine", to: "AI Synthesis", desc: "Converged signal clusters, along with regime state and knowledge bank context, inform structured intelligence generation." },
              { from: "AI Synthesis", to: "Prediction Engine", desc: "Intelligence theses generate falsifiable, time-bounded, scored predictions." },
              { from: "Prediction Engine", to: "Feedback Loop", desc: "Resolved predictions produce Brier scores and calibration data that flow upstream into detection thresholds, convergence weights, and synthesis prompts." },
              { from: "OSINT Feeds", to: "I&W Framework", desc: "GDELT headlines auto-trigger indicator status changes in threat scenarios." },
              { from: "Market Regime", to: "Thesis Generation", desc: "Current regime state informs positioning, sector allocation, and confidence calibration." },
              { from: "ACH Analysis", to: "Scenario Weighting", desc: "Hypothesis probability distributions inform geopolitical scenario weighting in game theory models." },
              { from: "Narrative Divergence", to: "Signal Layer", desc: "Media momentum divergences generate trading signals when narrative and price disagree." },
              { from: "Systemic Risk", to: "Risk Management", desc: "Absorption Ratio and Turbulence Index inform position sizing, hedging triggers, and portfolio-level risk assessment." },
              { from: "Knowledge Bank", to: "All Components", desc: "Semantic memory provides historical context, established patterns, and accumulated intelligence to every analytical module." },
            ].map((flow) => (
              <div key={flow.from + flow.to} className="flex items-start gap-4 border border-navy-800/30 rounded-lg p-4 bg-navy-900/10">
                <div className="shrink-0 flex items-center gap-2">
                  <span className="font-mono text-[10px] text-accent-cyan uppercase tracking-wider">{flow.from}</span>
                  <ArrowRight className="w-3 h-3 text-navy-600" />
                  <span className="font-mono text-[10px] text-navy-300 uppercase tracking-wider">{flow.to}</span>
                </div>
                <p className="font-sans text-[11px] text-navy-500 leading-relaxed">{flow.desc}</p>
              </div>
            ))}
          </div>

          <div className={`mt-10 max-w-3xl ${anim} ${integrationReveal.visible ? shown : hidden}`} style={{ transitionDelay: "300ms" }}>
            <p className="font-sans text-[15px] text-navy-400 leading-[1.85]">
              The platform currently processes data from 15+ external APIs, runs 25+ analytical tools accessible via the AI chat interface, and maintains a self-correcting feedback loop through Brier-scored prediction tracking. Every component described in this paper runs in production, processing real data, generating real predictions, and measuring real outcomes. The system is measured by what it produces, and the accuracy record is public.
            </p>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ══════════════════════════════════════════
          CTA
      ══════════════════════════════════════════ */}
      <section className="relative px-6 py-28 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] bg-accent-cyan/[0.03] rounded-full blur-[100px] pointer-events-none" />

        <div ref={ctaReveal.ref} className="relative max-w-5xl mx-auto">
          <div className={`text-center ${anim} ${ctaReveal.visible ? shown : hidden}`}>
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="h-px w-12 bg-navy-700/50" />
              <FileText className="w-4 h-4 text-accent-cyan/40" />
              <div className="h-px w-12 bg-navy-700/50" />
            </div>

            <h2 className="font-sans text-2xl md:text-3xl font-light text-navy-100 mb-4 leading-tight">
              See the system in action.
            </h2>

            <p className="font-sans text-[15px] text-navy-400 mb-10 max-w-lg mx-auto leading-relaxed">
              Every methodology described in this paper is running in production.
              Start a free trial and interact with the full platform, every signal layer,
              every analytical tool, every prediction tracker.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-5">
              <Link
                href="/register"
                className="group inline-flex items-center gap-2.5 px-8 py-3 font-mono text-[11px] uppercase tracking-widest text-navy-950 bg-accent-cyan hover:bg-accent-cyan/90 rounded-lg transition-all font-medium"
              >
                Start Free Trial
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/research/methodology"
                className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-navy-500 hover:text-navy-300 transition-colors"
              >
                Methodology Overview
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
