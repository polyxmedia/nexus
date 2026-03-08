import Link from "next/link";
import { PublicNav } from "@/components/layout/public-nav";
import { PublicFooter } from "@/components/layout/public-footer";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Brain,
  Globe,
  Layers,
  Lock,
  Radar,
  Shield,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Investors | NEXUS Intelligence",
  description: "Investment case for NEXUS — the geopolitical-market convergence intelligence platform. Market opportunity, technology differentiation, business model, and team.",
  robots: { index: false, follow: false },
};

function Rule() {
  return <div className="h-px w-8 bg-navy-700" />;
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-10">
      <Rule />
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-navy-500">{label}</span>
    </div>
  );
}

function Stat({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div className="border border-navy-700/30 rounded-lg bg-navy-900/40 p-5">
      <div className="font-mono text-2xl font-bold text-navy-100 mb-1">{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-navy-400">{label}</div>
      {sub && <div className="font-mono text-[10px] text-navy-600 mt-1">{sub}</div>}
    </div>
  );
}

function DiffRow({ label, nexus, rest }: { label: string; nexus: string; rest: string }) {
  return (
    <tr className="border-b border-navy-800/60 last:border-0">
      <td className="py-3 pr-6 font-mono text-[11px] text-navy-400 align-top">{label}</td>
      <td className="py-3 pr-6 font-mono text-[11px] text-accent-cyan align-top">{nexus}</td>
      <td className="py-3 font-mono text-[11px] text-navy-600 align-top">{rest}</td>
    </tr>
  );
}

export default function InvestorsPage() {
  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">
      <PublicNav />

      <main className="flex-1 pt-14">
        {/* ── Hero ── */}
        <section className="relative border-b border-navy-800/40">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute inset-0 opacity-[0.025]"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(6,182,212,0.5) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(6,182,212,0.5) 1px, transparent 1px)
                `,
                backgroundSize: "60px 60px",
              }}
            />
          </div>

          <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-20">
            <div className="flex items-center gap-3 mb-8">
              <Radar className="h-4 w-4 text-navy-500" />
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-navy-500">Investor Relations</span>
            </div>

            <h1 className="font-sans text-4xl md:text-5xl font-light text-navy-100 leading-tight mb-6">
              The intelligence layer<br />institutional capital is missing
            </h1>
            <p className="font-sans text-base text-navy-400 max-w-xl leading-relaxed mb-10">
              NEXUS is a geopolitical-market convergence intelligence platform. It detects alpha signals across layers that institutional desks currently track in isolation — and delivers them as backtested, executable theses.
            </p>

            <div className="flex items-center gap-4">
              <a
                href="mailto:andre@polyxmedia.com"
                className="group flex items-center gap-2 px-5 py-2.5 text-[11px] font-mono tracking-widest uppercase text-navy-100 bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.1] hover:border-white/[0.15] transition-all"
              >
                Request a briefing
                <ArrowRight className="h-3 w-3" />
              </a>
              <Link
                href="/about"
                className="text-[11px] font-mono tracking-widest uppercase text-navy-500 hover:text-navy-300 transition-colors"
              >
                About the team
              </Link>
            </div>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-6 py-20 space-y-24">

          {/* ── The Problem ── */}
          <section>
            <SectionLabel label="01 — The Problem" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
              <div>
                <h2 className="font-sans text-2xl font-light text-navy-100 mb-5 leading-snug">
                  Fragmented intelligence is not an information problem. It is a synthesis problem.
                </h2>
                <p className="font-sans text-sm text-navy-400 leading-relaxed mb-4">
                  A macro desk watches Fed language. A geopolitical team tracks Middle East escalation. A quant monitors VIX structure and calendar anomalies. These teams rarely sit in the same room, let alone feed their signals into a shared model.
                </p>
                <p className="font-sans text-sm text-navy-400 leading-relaxed">
                  The result: positions sized on incomplete pictures. Events that were visible in advance — in the convergence of signals — arrive as surprises. Capital is deployed reactively instead of ahead of the move.
                </p>
              </div>
              <div className="space-y-3">
                {[
                  { icon: Layers, text: "Geopolitical, macro, and celestial signals tracked by separate teams with no cross-synthesis" },
                  { icon: BarChart3, text: "Market positioning decisions made without access to real-time OSINT or escalation modeling" },
                  { icon: Brain, text: "No systematic way to score, backtest, or validate analyst predictions against market outcomes" },
                  { icon: Globe, text: "Calendar anomalies (FOMC, OPEX, Hebrew/Islamic cycles) largely ignored as data inputs" },
                ].map(({ icon: Icon, text }, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 border border-navy-800/40 rounded-lg bg-navy-900/20">
                    <Icon className="h-4 w-4 text-navy-600 mt-0.5 shrink-0" />
                    <p className="font-sans text-[12px] text-navy-400 leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── The Platform ── */}
          <section>
            <SectionLabel label="02 — The Platform" />
            <h2 className="font-sans text-2xl font-light text-navy-100 mb-5 leading-snug max-w-2xl">
              Six signal layers. One synthesis engine. One actionable output.
            </h2>
            <p className="font-sans text-sm text-navy-400 leading-relaxed mb-10 max-w-2xl">
              NEXUS runs a continuous convergence engine across geopolitical, market structure, celestial-cyclical, calendar, OSINT, and economic layers. When signals align, the system scores the event, generates a structured thesis, and connects it directly to execution.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              {[
                {
                  icon: Shield,
                  label: "War Room",
                  color: "text-accent-rose",
                  desc: "Live military aircraft tracking, GDELT OSINT feeds, conflict zone mapping. Escalation patterns visible before they reach the wire.",
                },
                {
                  icon: Zap,
                  label: "Signal Engine",
                  color: "text-accent-amber",
                  desc: "Convergence events scored 1–5 across 6 layers. Intensity threshold alerts. Full signal history with market correlation.",
                },
                {
                  icon: Brain,
                  label: "AI Analyst",
                  color: "text-accent-cyan",
                  desc: "Claude-powered analyst with 20+ live tools: market regime, options flow, on-chain, shipping intelligence, game theory modeling.",
                },
                {
                  icon: BarChart3,
                  label: "Backtesting Engine",
                  color: "text-accent-emerald",
                  desc: "Time-gated prediction simulation. Brier scoring, log-loss, p-value significance testing against random baseline. No look-ahead bias.",
                },
                {
                  icon: TrendingUp,
                  label: "Execution Layer",
                  color: "text-accent-cyan",
                  desc: "Direct integration with Trading 212 and Coinbase. Thesis converts to trade without leaving the platform.",
                },
                {
                  icon: Lock,
                  label: "Knowledge Bank",
                  color: "text-navy-400",
                  desc: "pgvector-powered semantic memory. Actor profiles, world models, historical theses — searchable and referenced in every AI response.",
                },
              ].map(({ icon: Icon, label, color, desc }) => (
                <div key={label} className="border border-navy-700/30 rounded-lg bg-navy-900/40 p-5">
                  <div className={`flex items-center gap-2 mb-3`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                    <span className={`font-mono text-[10px] uppercase tracking-wider ${color}`}>{label}</span>
                  </div>
                  <p className="font-sans text-[12px] text-navy-400 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Differentiation ── */}
          <section>
            <SectionLabel label="03 — Differentiation" />
            <h2 className="font-sans text-2xl font-light text-navy-100 mb-8 leading-snug">
              What NEXUS does that nothing else does
            </h2>
            <div className="border border-navy-700/30 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-navy-800/60 bg-navy-900/40">
                    <th className="text-left py-3 px-5 font-mono text-[9px] uppercase tracking-widest text-navy-600">Dimension</th>
                    <th className="text-left py-3 px-5 font-mono text-[9px] uppercase tracking-widest text-accent-cyan">NEXUS</th>
                    <th className="text-left py-3 px-5 font-mono text-[9px] uppercase tracking-widest text-navy-600">Incumbents (Bloomberg, Reuters Eikon)</th>
                  </tr>
                </thead>
                <tbody className="px-5">
                  <tr className="border-b border-navy-800/60">
                    <td className="py-3 px-5 font-mono text-[11px] text-navy-400">Signal synthesis</td>
                    <td className="py-3 px-5 font-mono text-[11px] text-accent-cyan">6 layers fused into scored convergence events</td>
                    <td className="py-3 px-5 font-mono text-[11px] text-navy-600">Data terminals; no cross-layer synthesis</td>
                  </tr>
                  <tr className="border-b border-navy-800/60">
                    <td className="py-3 px-5 font-mono text-[11px] text-navy-400">Prediction validation</td>
                    <td className="py-3 px-5 font-mono text-[11px] text-accent-cyan">Brier score, p-value, time-gated backtests</td>
                    <td className="py-3 px-5 font-mono text-[11px] text-navy-600">Analyst reports; no systematic accuracy tracking</td>
                  </tr>
                  <tr className="border-b border-navy-800/60">
                    <td className="py-3 px-5 font-mono text-[11px] text-navy-400">Geopolitical + market</td>
                    <td className="py-3 px-5 font-mono text-[11px] text-accent-cyan">Unified: war room feeds directly into thesis</td>
                    <td className="py-3 px-5 font-mono text-[11px] text-navy-600">Separate products; no causal linkage</td>
                  </tr>
                  <tr className="border-b border-navy-800/60">
                    <td className="py-3 px-5 font-mono text-[11px] text-navy-400">Calendar signals</td>
                    <td className="py-3 px-5 font-mono text-[11px] text-accent-cyan">Hebrew, Islamic, FOMC, OPEX, Chinese convergence</td>
                    <td className="py-3 px-5 font-mono text-[11px] text-navy-600">FOMC dates only; no esoteric calendar research</td>
                  </tr>
                  <tr className="border-b border-navy-800/60">
                    <td className="py-3 px-5 font-mono text-[11px] text-navy-400">Execution integration</td>
                    <td className="py-3 px-5 font-mono text-[11px] text-accent-cyan">Direct broker execution from within the thesis</td>
                    <td className="py-3 px-5 font-mono text-[11px] text-navy-600">Data only; no execution layer</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 font-mono text-[11px] text-navy-400">Cost</td>
                    <td className="py-3 px-5 font-mono text-[11px] text-accent-cyan">$299–$999/mo (institutional: custom)</td>
                    <td className="py-3 px-5 font-mono text-[11px] text-navy-600">$2,000–$25,000+/mo per seat</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Market ── */}
          <section>
            <SectionLabel label="04 — Market Opportunity" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
              <div>
                <h2 className="font-sans text-2xl font-light text-navy-100 mb-5 leading-snug">
                  A large market that has not seen meaningful disruption in 20 years
                </h2>
                <p className="font-sans text-sm text-navy-400 leading-relaxed mb-4">
                  The global financial data and analytics market is valued at over $40B, growing at 12% annually. Bloomberg and Refinitiv capture the majority of institutional spend — at price points that make them inaccessible to the long tail of professional allocators, family offices, and independent funds.
                </p>
                <p className="font-sans text-sm text-navy-400 leading-relaxed">
                  The alternative data segment — geopolitical risk, OSINT feeds, satellite imagery, sentiment analytics — is separately valued at $2.7B and growing at 28%. NEXUS sits at the intersection, combining these data types into a single synthesis layer at a fraction of incumbent cost.
                </p>
              </div>
              <div className="space-y-3">
                <Stat value="$40B+" label="Financial data & analytics market" sub="12% CAGR" />
                <Stat value="$2.7B" label="Alternative data segment" sub="28% CAGR — fastest growing layer" />
                <Stat value="500K+" label="Professional allocators globally" sub="Family offices, independent funds, prop desks" />
                <Stat value="$2K–25K" label="Monthly per-seat cost, incumbents" sub="NEXUS: $299–$999. 10–80x cheaper." />
              </div>
            </div>
          </section>

          {/* ── Business Model ── */}
          <section>
            <SectionLabel label="05 — Business Model" />
            <h2 className="font-sans text-2xl font-light text-navy-100 mb-8 leading-snug">
              Recurring SaaS. Three tiers. Institutional expansion path.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {[
                {
                  tier: "Analyst",
                  price: "$299/mo",
                  target: "Individual professionals, researchers",
                  items: ["Signal engine", "AI analyst (100 msg/day)", "Daily thesis", "Prediction tracking"],
                },
                {
                  tier: "Operator",
                  price: "$999/mo",
                  target: "Active allocators, prop desks",
                  items: ["Unlimited AI access", "Trading integration", "War Room + OSINT", "On-chain, GEX, shipping intel", "Portfolio risk analytics"],
                  highlight: true,
                },
                {
                  tier: "Institution",
                  price: "Custom",
                  target: "Multi-seat deployment",
                  items: ["Unlimited seats", "Custom data integrations", "Dedicated infrastructure", "White-label option", "SLA + direct support"],
                },
              ].map(({ tier, price, target, items, highlight }) => (
                <div
                  key={tier}
                  className={`border rounded-lg p-5 ${
                    highlight
                      ? "border-navy-500/40 bg-navy-900/60"
                      : "border-navy-700/30 bg-navy-900/40"
                  }`}
                >
                  <div className="font-mono text-[10px] uppercase tracking-wider text-navy-500 mb-1">{tier}</div>
                  <div className="font-mono text-xl font-bold text-navy-100 mb-1">{price}</div>
                  <div className="font-sans text-[11px] text-navy-500 mb-4">{target}</div>
                  <div className="space-y-1.5">
                    {items.map((item) => (
                      <div key={item} className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-navy-600 shrink-0" />
                        <span className="font-sans text-[11px] text-navy-400">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="font-sans text-sm text-navy-500 leading-relaxed max-w-2xl">
              Near-term revenue path is individual and small-fund SaaS. The Institution tier and API licensing represent the high-value expansion opportunity — embedding NEXUS signals into existing quantitative workflows at fund level.
            </p>
          </section>

          {/* ── Traction ── */}
          <section>
            <SectionLabel label="06 — Where We Are" />
            <h2 className="font-sans text-2xl font-light text-navy-100 mb-8 leading-snug">
              Platform built. Core capabilities live. Ready for capital to accelerate.
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <Stat value="6" label="Signal layers live" sub="GEO, CAL, CEL, MKT, OSI, ECO" />
              <Stat value="20+" label="AI analyst tools" sub="Market regime, on-chain, shipping, game theory..." />
              <Stat value="73%" label="Prediction accuracy" sub="Backtested with temporal isolation" />
              <Stat value="3" label="Subscription tiers" sub="Seeded and live in Stripe" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                "Signal convergence engine operational across all 6 layers",
                "AI analyst with 20+ live intelligence tools (Claude Opus 4.6)",
                "Backtesting engine with Brier score + p-value significance testing",
                "War Room with live aircraft tracking (OpenSky) and GDELT OSINT",
                "Trading integration: Trading 212 stocks + Coinbase crypto",
                "Knowledge bank with pgvector semantic memory (Voyage AI embeddings)",
                "Shipping intelligence: 5 chokepoints, freight proxies, maritime OSINT",
                "Full subscription stack: Stripe Checkout, portal, webhooks, admin tier management",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 py-2.5 border-b border-navy-800/40 last:border-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent-emerald mt-1.5 shrink-0" />
                  <span className="font-sans text-[12px] text-navy-400">{item}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── Technology ── */}
          <section>
            <SectionLabel label="07 — Technology" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
              <div>
                <h2 className="font-sans text-2xl font-light text-navy-100 mb-5 leading-snug">
                  Purpose-built. Not assembled from third-party widgets.
                </h2>
                <p className="font-sans text-sm text-navy-400 leading-relaxed mb-4">
                  The signal convergence engine is proprietary — a multi-layer scoring system that correlates geopolitical, celestial, economic, and OSINT events across historical time series to detect statistically meaningful convergence points.
                </p>
                <p className="font-sans text-sm text-navy-400 leading-relaxed">
                  The AI layer runs on Anthropic Claude, with Voyage AI embeddings and pgvector for semantic retrieval. The architecture is built for institutional-grade reliability: Next.js 15, PostgreSQL on Neon (serverless), Stripe for billing, and a modular API layer that supports white-label and custom data integration.
                </p>
              </div>
              <div className="space-y-2">
                {[
                  ["Signal Engine", "Proprietary convergence scoring across 6 layers"],
                  ["AI", "Anthropic Claude Opus 4.6 + 20+ custom tool definitions"],
                  ["Embeddings", "Voyage AI + pgvector semantic knowledge retrieval"],
                  ["Infrastructure", "Next.js 15, PostgreSQL (Neon), Vercel-ready"],
                  ["Payments", "Stripe Checkout + Portal + Webhooks"],
                  ["Market Data", "Alpha Vantage, FRED, Yahoo Finance, GDELT, OpenSky"],
                  ["Execution", "Trading 212 API + Coinbase Advanced Trade API"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-6 py-2.5 border-b border-navy-800/40 last:border-0">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-navy-600 shrink-0">{label}</span>
                    <span className="font-sans text-[12px] text-navy-400 text-right">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Team ── */}
          <section>
            <SectionLabel label="08 — Team" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
              <div className="border border-navy-700/30 rounded-lg bg-navy-900/40 p-6">
                <div className="font-mono text-[10px] uppercase tracking-widest text-navy-500 mb-1">Founder</div>
                <div className="font-sans text-lg font-semibold text-navy-100 mb-0.5">Andre Figueira</div>
                <div className="font-mono text-[10px] text-navy-500 mb-4">London, UK</div>
                <p className="font-sans text-[13px] text-navy-400 leading-relaxed mb-4">
                  Senior Software Architect with 20 years of experience across financial services, data infrastructure, and platform engineering. Founded Polyxmedia as a product studio building intelligent systems at the intersection of data and capital markets.
                </p>
                <p className="font-sans text-[13px] text-navy-400 leading-relaxed">
                  NEXUS is the product of a conviction that geopolitical signal synthesis can be done systematically, and that the gap between intelligence and execution is a solvable engineering problem.
                </p>
                <div className="mt-5 pt-4 border-t border-navy-800/40">
                  <a
                    href="mailto:andre@polyxmedia.com"
                    className="font-mono text-[10px] text-accent-cyan hover:text-accent-cyan/80 transition-colors"
                  >
                    andre@polyxmedia.com
                  </a>
                </div>
              </div>
              <div>
                <div className="border border-navy-700/30 rounded-lg bg-navy-900/40 p-6 mb-4">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-navy-500 mb-2">Operating Company</div>
                  <div className="font-sans text-base font-semibold text-navy-100 mb-3">Polyxmedia</div>
                  <p className="font-sans text-[13px] text-navy-400 leading-relaxed">
                    London-based product studio. Specialises in intelligent systems, data platforms, and financial technology. NEXUS is the flagship product.
                  </p>
                </div>
                <div className="border border-navy-700/30 rounded-lg bg-navy-900/40 p-6">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-navy-500 mb-2">What we are looking for</div>
                  <div className="space-y-3">
                    {[
                      "Strategic capital aligned with intelligence, fintech, or data infrastructure",
                      "Domain expertise in institutional trading or geopolitical research",
                      "Distribution relationships: family offices, hedge funds, prop desks",
                      "Partnership opportunities: data providers, white-label deployments",
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <div className="w-1 h-1 rounded-full bg-navy-600 mt-1.5 shrink-0" />
                        <span className="font-sans text-[12px] text-navy-400">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── CTA ── */}
          <section className="border border-navy-700/30 rounded-lg bg-navy-900/40 p-10 text-center">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-navy-500 mb-4">Next Step</div>
            <h2 className="font-sans text-2xl font-light text-navy-100 mb-4">
              Let&apos;s have a direct conversation
            </h2>
            <p className="font-sans text-sm text-navy-400 max-w-md mx-auto mb-8 leading-relaxed">
              If the opportunity makes sense, I would rather spend 30 minutes in a live demo than send a deck. You can see exactly what the platform does, what the data looks like, and where it is going.
            </p>
            <div className="flex items-center justify-center gap-4">
              <a
                href="mailto:andre@polyxmedia.com?subject=NEXUS — Investor Enquiry"
                className="group flex items-center gap-2 px-6 py-3 text-[11px] font-mono tracking-widest uppercase text-navy-100 bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.1] hover:border-white/[0.15] transition-all"
              >
                Request a demo
                <ArrowRight className="h-3 w-3" />
              </a>
              <Link
                href="/research/methodology"
                className="flex items-center gap-1.5 text-[11px] font-mono tracking-widest uppercase text-navy-500 hover:text-navy-300 transition-colors"
              >
                Read the methodology
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </section>

        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
