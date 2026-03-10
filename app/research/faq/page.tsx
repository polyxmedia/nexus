"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  HelpCircle,
  ChevronDown,
  CreditCard,
  Cpu,
  Layers,
  Shield,
  Zap,
  ArrowRight,
  BarChart3,
  Globe,
  Eye,
} from "lucide-react";

// ── Scroll reveal ──
function useReveal(threshold = 0.12) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ── Scan line background ──
function ScanLines() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-[0.03]">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(6,182,212,0.15) 2px, rgba(6,182,212,0.15) 3px)",
          backgroundSize: "100% 4px",
          animation: "scan-drift 8s linear infinite",
        }}
      />
    </div>
  );
}

// ── FAQ Item ──
function FAQItem({ question, children, index, color = "#06b6d4" }: {
  question: string;
  children: React.ReactNode;
  index: number;
  color?: string;
}) {
  const [open, setOpen] = useState(false);
  const { ref, visible } = useReveal(0.08);

  return (
    <div
      ref={ref}
      className="border-b border-navy-800/40 transition-all duration-700"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transitionDelay: `${index * 60}ms`,
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full py-6 flex items-start gap-4 text-left group cursor-pointer"
      >
        <span
          className="text-[10px] font-mono tracking-wider mt-1 shrink-0 w-8"
          style={{ color }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="flex-1 text-[15px] text-navy-200 font-sans leading-relaxed group-hover:text-white transition-colors">
          {question}
        </span>
        <ChevronDown
          className="h-4 w-4 text-navy-500 mt-1 shrink-0 transition-transform duration-300"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-400"
        style={{
          maxHeight: open ? "600px" : "0px",
          opacity: open ? 1 : 0,
        }}
      >
        <div className="pl-12 pb-6 text-[13px] text-navy-400 font-sans leading-relaxed space-y-3">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Section ──
function FAQSection({ title, tag, icon: Icon, color, children }: {
  title: string;
  tag: string;
  icon: React.ElementType;
  color: string;
  children: React.ReactNode;
}) {
  const { ref, visible } = useReveal(0.08);

  return (
    <section className="mb-16">
      <div
        ref={ref}
        className="flex items-center gap-3 mb-2 transition-all duration-700"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateX(0)" : "translateX(-12px)",
        }}
      >
        <Icon className="h-4 w-4" style={{ color }} />
        <span className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color }}>
          {tag}
        </span>
      </div>
      <h2
        className="text-[18px] font-sans text-navy-200 mb-6 transition-all duration-700"
        style={{
          opacity: visible ? 1 : 0,
          transitionDelay: "100ms",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

// ── Credit Tier Table ──
function CreditTable() {
  const { ref, visible } = useReveal(0.08);

  const tiers = [
    { name: "Free Trial", credits: "5,000", price: "$0", perCredit: "$0.001", highlight: false },
    { name: "Analyst", credits: "50,000", price: "$150/mo", perCredit: "$0.001", highlight: false },
    { name: "Operator", credits: "250,000", price: "$450/mo", perCredit: "$0.001", highlight: true },
    { name: "Institution", credits: "Unlimited", price: "Custom", perCredit: "N/A", highlight: false },
  ];

  return (
    <div
      ref={ref}
      className="border border-navy-800/50 rounded-lg overflow-hidden transition-all duration-700"
      style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)" }}
    >
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-navy-800/50 bg-navy-900/30">
            <th className="px-4 py-3 text-[10px] font-mono uppercase tracking-[0.15em] text-navy-500">Tier</th>
            <th className="px-4 py-3 text-[10px] font-mono uppercase tracking-[0.15em] text-navy-500">Monthly Credits</th>
            <th className="px-4 py-3 text-[10px] font-mono uppercase tracking-[0.15em] text-navy-500">Price</th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((t) => (
            <tr
              key={t.name}
              className={`border-b border-navy-800/30 ${t.highlight ? "bg-accent-cyan/[0.03]" : ""}`}
            >
              <td className="px-4 py-3 text-[13px] font-sans text-navy-200">{t.name}</td>
              <td className="px-4 py-3 text-[13px] font-mono text-navy-300">{t.credits}</td>
              <td className="px-4 py-3 text-[13px] font-mono text-navy-300">{t.price}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Cost Examples Table ──
function CostExamplesTable() {
  const { ref, visible } = useReveal(0.08);

  const examples = [
    { task: "Quick question to the analyst", range: "20-50 credits", cost: "$0.02-$0.05" },
    { task: "Detailed analysis with data pulls", range: "80-200 credits", cost: "$0.08-$0.20" },
    { task: "Deep multi-step research", range: "200-500 credits", cost: "$0.20-$0.50" },
  ];

  return (
    <div
      ref={ref}
      className="border border-navy-800/50 rounded-lg overflow-hidden transition-all duration-700"
      style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)" }}
    >
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-navy-800/50 bg-navy-900/30">
            <th className="px-4 py-3 text-[10px] font-mono uppercase tracking-[0.15em] text-navy-500">Task</th>
            <th className="px-4 py-3 text-[10px] font-mono uppercase tracking-[0.15em] text-navy-500">Credits</th>
            <th className="px-4 py-3 text-[10px] font-mono uppercase tracking-[0.15em] text-navy-500">Approx. Cost</th>
          </tr>
        </thead>
        <tbody>
          {examples.map((e) => (
            <tr key={e.task} className="border-b border-navy-800/30">
              <td className="px-4 py-3 text-[13px] font-sans text-navy-200">{e.task}</td>
              <td className="px-4 py-3 text-[13px] font-mono text-navy-300">{e.range}</td>
              <td className="px-4 py-3 text-[13px] font-mono text-accent-cyan">{e.cost}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Top-up Table ──
function TopUpTable() {
  const { ref, visible } = useReveal(0.08);

  const packs = [
    { credits: "10,000", price: "$10", perCredit: "$0.0010" },
    { credits: "50,000", price: "$45", perCredit: "$0.0009" },
    { credits: "100,000", price: "$80", perCredit: "$0.0008" },
    { credits: "500,000", price: "$350", perCredit: "$0.0007" },
  ];

  return (
    <div
      ref={ref}
      className="border border-navy-800/50 rounded-lg overflow-hidden transition-all duration-700"
      style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)" }}
    >
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-navy-800/50 bg-navy-900/30">
            <th className="px-4 py-3 text-[10px] font-mono uppercase tracking-[0.15em] text-navy-500">Credits</th>
            <th className="px-4 py-3 text-[10px] font-mono uppercase tracking-[0.15em] text-navy-500">Price</th>
            <th className="px-4 py-3 text-[10px] font-mono uppercase tracking-[0.15em] text-navy-500">Per Credit</th>
          </tr>
        </thead>
        <tbody>
          {packs.map((p) => (
            <tr key={p.credits} className="border-b border-navy-800/30">
              <td className="px-4 py-3 text-[13px] font-mono text-navy-200">{p.credits}</td>
              <td className="px-4 py-3 text-[13px] font-mono text-navy-300">{p.price}</td>
              <td className="px-4 py-3 text-[13px] font-mono text-accent-emerald">{p.perCredit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ──
export default function FAQPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    setHeroVisible(true);
  }, []);

  return (
    <div className="min-h-screen bg-navy-950 relative">
      <ScanLines />

      {/* Hero */}
      <div className="relative z-10 pt-28 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div
            ref={heroRef}
            className="transition-all duration-1000"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? "translateY(0)" : "translateY(20px)",
            }}
          >
            <div className="flex items-center gap-2.5 mb-4">
              <HelpCircle className="h-4 w-4 text-accent-cyan" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-accent-cyan">
                FAQ
              </span>
            </div>
            <h1 className="text-[28px] md:text-[36px] font-sans text-white mb-4 leading-tight">
              Frequently Asked Questions
            </h1>
            <p className="text-[14px] text-navy-400 font-sans leading-relaxed max-w-xl">
              Everything you need to know about the platform, pricing, credits, and how NEXUS intelligence analysis works.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-6 pb-24">
        <div className="max-w-3xl mx-auto">

          {/* ── Platform ── */}
          <FAQSection title="Platform Overview" tag="Platform" icon={Globe} color="#06b6d4">
            <FAQItem question="What is NEXUS?" index={0}>
              <p>
                NEXUS is a signal intelligence platform that monitors geopolitical, market, open-source intelligence, and systemic risk signals across global events. It identifies convergence patterns across independent data layers, generates predictive assessments, and provides structured intelligence briefs you can act on.
              </p>
            </FAQItem>
            <FAQItem question="What kind of signals does NEXUS track?" index={1}>
              <p>
                Four primary signal layers, each running independent detection engines:
              </p>
              <ul className="list-none space-y-2 mt-2">
                <li className="flex items-start gap-2">
                  <Globe className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                  <span><span className="text-navy-200 font-mono text-[11px]">GEO</span> &mdash; Conflicts, sanctions, diplomatic shifts, military posture changes.</span>
                </li>
                <li className="flex items-start gap-2">
                  <BarChart3 className="h-3.5 w-3.5 text-accent-cyan mt-0.5 shrink-0" />
                  <span><span className="text-navy-200 font-mono text-[11px]">MKT</span> &mdash; Options flow anomalies, volatility shifts, credit spreads, cross-asset divergences.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Eye className="h-3.5 w-3.5 text-accent-amber mt-0.5 shrink-0" />
                  <span><span className="text-navy-200 font-mono text-[11px]">OSI</span> &mdash; Flight tracking, shipping data, social media, event wires.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Layers className="h-3.5 w-3.5 text-accent-emerald mt-0.5 shrink-0" />
                  <span><span className="text-navy-200 font-mono text-[11px]">SYS</span> &mdash; Regime detection, macro indicator surprises, cross-correlation breakdowns.</span>
                </li>
              </ul>
              <p className="mt-2">
                A narrative overlay layer adds calendar and actor-belief context as supplementary intelligence.
              </p>
            </FAQItem>
            <FAQItem question="What can the AI analyst do?" index={2}>
              <p>
                The analyst understands macro, geopolitics, and market structure. You can ask it to pull signals, run game theory scenarios, search the knowledge bank, generate predictions, analyse market data, and execute trades. It works with the platform's full data layer, so every answer is grounded in real information.
              </p>
            </FAQItem>
            <FAQItem question="Does NEXUS use AI? How do you handle hallucinations?" index={3}>
              <p>
                Yes. AI is central to the platform. The analyst, thesis generation, prediction engine, and signal synthesis all run on large language models. We take hallucination risk seriously. Every AI output is grounded in the platform's actual data layer: real signals, real market data, real OSINT feeds. The analyst cites specific sources and data points in its responses, and predictions are tracked against outcomes with published accuracy scores. Where the system is uncertain, it says so explicitly with confidence ranges. We do not generate speculative commentary or unanchored analysis.
              </p>
            </FAQItem>
            <FAQItem question="How are predictions scored?" index={4}>
              <p>
                Every prediction is falsifiable and tracked with Brier scores, measuring calibration accuracy on a 0 to 1 scale (lower is better). The scoring system separates directional calls from level estimates, filters out stale predictions, and caps active volume to maintain statistical rigour. Full methodology is published on the <a href="/research/prediction-accuracy" className="text-accent-cyan hover:underline">Prediction Accuracy</a> page.
              </p>
            </FAQItem>
          </FAQSection>

          {/* ── Pricing & Credits ── */}
          <FAQSection title="Pricing & Credits" tag="Credits" icon={CreditCard} color="#f59e0b">
            <FAQItem question="How much does it cost to run analysis?" index={0} color="#f59e0b">
              <p>
                Every AI-powered operation consumes credits. The platform selects the right model for each task automatically, so simple queries cost less than deep multi-step analysis.
              </p>
              <p>
                Typical costs: a standard chat question runs 20-80 credits. A deep analysis with multiple data pulls may run 100-300 credits. At $0.001 per credit, even a complex analysis session costs pennies.
              </p>
              <div className="mt-4">
                <CostExamplesTable />
              </div>
              <p className="mt-3">
                Your credit balance and usage history are always visible in the platform settings.
              </p>
            </FAQItem>
            <FAQItem question="What subscription tiers are available?" index={1} color="#f59e0b">
              <p>
                NEXUS offers three subscription tiers, each with a monthly credit allocation. All new accounts start with a free trial of 5,000 credits.
              </p>
              <div className="mt-4">
                <CreditTable />
              </div>
              <p className="mt-3">
                Annual billing is available at a reduced rate: $125/month for Analyst and $375/month for Operator.
              </p>
            </FAQItem>
            <FAQItem question="What features does each tier include?" index={2} color="#f59e0b">
              <p className="text-navy-300 font-mono text-[11px] mb-2">ANALYST ($150/month)</p>
              <p>
                Signal detection, daily thesis generation, prediction tracking, War Room with OSINT, game theory scenarios, calendar intelligence, timeline and graph analysis, and multi-channel alerts (email, Telegram, SMS).
              </p>
              <p className="text-navy-300 font-mono text-[11px] mb-2 mt-4">OPERATOR ($450/month)</p>
              <p>
                Everything in Analyst, plus portfolio tracking, broker integration, on-chain analytics, GEX data, GPR decomposition, BOCPD change-point detection, short interest, options flow, shipping and dark fleet intelligence, Monte Carlo simulation, congressional trading signals, prediction markets divergence, and API access.
              </p>
              <p className="text-navy-300 font-mono text-[11px] mb-2 mt-4">INSTITUTION (Custom)</p>
              <p>
                Everything in Operator with unlimited credits, unlimited seats, custom data integrations, dedicated infrastructure, white-label option, SLA guarantee, direct engineering support, and on-premise deployment available.
              </p>
            </FAQItem>
            <FAQItem question="Can I buy additional credits?" index={3} color="#f59e0b">
              <p>
                Yes. Credit top-up packs are available as one-time purchases, processed through Stripe. Larger packs come with volume discounts of up to 30% off the base rate.
              </p>
              <div className="mt-4">
                <TopUpTable />
              </div>
              <p className="mt-3">
                Credits from top-ups are added to your balance immediately and do not expire at the end of the billing cycle.
              </p>
            </FAQItem>
            <FAQItem question="What happens when I run out of credits?" index={4} color="#f59e0b">
              <p>
                When your credit balance reaches zero, AI-powered features (chat, analysis, predictions, thesis generation) will return a prompt to either upgrade your tier or purchase a top-up pack. Non-AI features like the War Room map, signal browsing, and news feed remain accessible.
              </p>
            </FAQItem>
            <FAQItem question="Do unused credits roll over?" index={5} color="#f59e0b">
              <p>
                Monthly subscription credits reset at the start of each billing period and do not roll over. Credits purchased through top-up packs persist until used.
              </p>
            </FAQItem>
          </FAQSection>

          {/* ── Technical ── */}
          <FAQSection title="Technical Details" tag="Technical" icon={Cpu} color="#10b981">
            <FAQItem question="What AI powers the analysis?" index={0} color="#10b981">
              <p>
                NEXUS runs on Anthropic's Claude model family. The platform automatically selects the right model for each task: faster models for lightweight operations, more capable models for deep analysis and reasoning.
              </p>
            </FAQItem>
            <FAQItem question="How current is the data?" index={1} color="#10b981">
              <p>
                Data freshness varies by source. Aircraft tracking and OSINT feeds update in near real-time. Market data is pulled on demand. News feeds aggregate continuously from multiple sources. The War Room map reflects live conditions.
              </p>
            </FAQItem>
            <FAQItem question="Is my data secure?" index={2} color="#10b981">
              <p>
                All data is encrypted in transit and at rest. API keys for external services are stored securely and never exposed to the frontend. Institution-tier deployments run on isolated infrastructure with no shared tenancy. On-premise deployment is available.
              </p>
            </FAQItem>
          </FAQSection>

          {/* ── Trading ── */}
          <FAQSection title="Trading Integration" tag="Trading" icon={Zap} color="#f43f5e">
            <FAQItem question="Which brokers does NEXUS support?" index={0} color="#f43f5e">
              <p>
                NEXUS currently integrates with Trading 212 for equities and Coinbase for cryptocurrency. Both support demo and live trading modes. Additional broker integrations are on the roadmap.
              </p>
            </FAQItem>
            <FAQItem question="Can the AI execute trades automatically?" index={1} color="#f43f5e">
              <p>
                The AI analyst can place trades through the chat interface when given explicit instructions. It does not execute trades autonomously. Every trade action requires user initiation through the chat or trading interface. Demo mode is available for testing strategies without real capital.
              </p>
            </FAQItem>
          </FAQSection>

          {/* ── Getting Started ── */}
          <FAQSection title="Getting Started" tag="Access" icon={Shield} color="#8b5cf6">
            <FAQItem question="How do I get started?" index={0} color="#8b5cf6">
              <p>
                Register for an account to receive 5,000 free credits. This gives you enough to explore the platform, run several analysis sessions, and evaluate the intelligence output before committing to a subscription.
              </p>
            </FAQItem>
            <FAQItem question="Is there a free trial?" index={1} color="#8b5cf6">
              <p>
                Yes. Every new account receives 5,000 credits at no cost. At the base rate of $0.001 per credit, that is equivalent to $5 of analysis. Enough for approximately 60-250 chat interactions depending on complexity.
              </p>
            </FAQItem>
          </FAQSection>

          {/* CTA */}
          <div className="mt-16 pt-12 border-t border-navy-800/30">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <p className="text-[14px] text-navy-300 font-sans">Still have questions?</p>
                <p className="text-[12px] text-navy-500 font-sans mt-1">
                  Reach out through the contact page or start a conversation with the AI analyst.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/contact"
                  className="px-4 py-2 text-[11px] font-mono tracking-widest uppercase text-navy-300 border border-navy-700/50 rounded-lg hover:border-navy-600 hover:text-navy-200 transition-all"
                >
                  Contact
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-[11px] font-mono tracking-widest uppercase text-navy-100 bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.1] hover:border-white/[0.15] transition-all flex items-center gap-2"
                >
                  Get Started <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
