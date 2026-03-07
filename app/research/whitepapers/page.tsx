"use client";


import { FileText } from "lucide-react";

interface Whitepaper {
  title: string;
  date: string;
  pages: number;
  abstract: string;
  tags: string[];
}

const whitepapers: Whitepaper[] = [
  {
    title:
      "Multi-Layer Signal Convergence: A Framework for Geopolitical-Market Analysis",
    date: "March 2026",
    pages: 24,
    abstract:
      "Proposes a unified framework for fusing geopolitical risk signals with quantitative market indicators. Demonstrates that layered convergence scoring outperforms single-domain models in forecasting volatility spikes across energy and defence sectors.",
    tags: ["Signal Analysis", "Market Risk", "Framework"],
  },
  {
    title: "Shmita Cycles and Market Corrections: Statistical Analysis",
    date: "February 2026",
    pages: 18,
    abstract:
      "A rigorous statistical examination of seven-year Shmita cycle correlations with US equity drawdowns from 1900 to 2025. Applies Monte Carlo permutation testing to isolate cycle effects from secular trend noise.",
    tags: ["Calendar Systems", "Equities", "Statistics"],
  },
  {
    title:
      "Modelling Strait of Hormuz Closure: Monte Carlo Simulation Results",
    date: "February 2026",
    pages: 31,
    abstract:
      "Simulates 50,000 closure scenarios varying duration, coalition response, and inventory drawdown rates. Quantifies tail-risk price paths for Brent crude and downstream impacts on shipping indices and regional GDP.",
    tags: ["Geopolitical Risk", "Energy", "Simulation"],
  },
  {
    title: "Calendar Convergence Effects on VIX: 2010-2025 Retrospective",
    date: "January 2026",
    pages: 22,
    abstract:
      "Investigates whether overlapping dates across Islamic, Hebrew, and lunar calendars produce statistically significant VIX anomalies. Finds elevated implied volatility during triple-convergence windows, with effect sizes strongest in Q4.",
    tags: ["Volatility", "Calendar Systems", "Retrospective"],
  },
  {
    title: "Nash Equilibrium in Multi-Actor Conflict Scenarios",
    date: "January 2026",
    pages: 27,
    abstract:
      "Applies game-theoretic Nash equilibrium analysis to three active conflict theatres. Models actor payoff matrices under varying resource constraints and alliance structures to identify stable and unstable equilibria.",
    tags: ["Game Theory", "Conflict Analysis", "Modelling"],
  },
  {
    title:
      "OSINT Pipeline Architecture for Real-Time Geopolitical Intelligence",
    date: "December 2025",
    pages: 15,
    abstract:
      "Documents the design of a low-latency OSINT ingestion pipeline combining GDELT, ADS-B, and maritime AIS feeds. Covers deduplication, entity resolution, and geocoding stages with benchmarks on throughput and signal freshness.",
    tags: ["OSINT", "Architecture", "Data Engineering"],
  },
];

export default function WhitepapersPage() {
  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto pt-24">
      <div className="mb-10">
        <h1 className="text-lg font-bold uppercase tracking-widest text-navy-100">Research Publications</h1>
        <p className="mt-1 text-xs text-navy-400">NEXUS whitepapers and technical research</p>
      </div>
      <div className="grid gap-4">
        {whitepapers.map((paper, i) => (
          <div
            key={i}
            className="rounded border border-navy-700/40 bg-navy-900/50 p-5 transition-colors hover:border-navy-600/60"
          >
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex-shrink-0 text-navy-500">
                <FileText size={20} />
              </div>
              <div className="flex-1 space-y-2">
                <h2 className="font-sans text-sm font-semibold text-navy-100">
                  {paper.title}
                </h2>
                <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-navy-500">
                  <span>{paper.date}</span>
                  <span className="text-navy-700">|</span>
                  <span>{paper.pages} pages</span>
                </div>
                <p className="font-sans text-xs leading-relaxed text-navy-400">
                  {paper.abstract}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {paper.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded border border-navy-700/40 bg-navy-800/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-navy-400"
                    >
                      {tag}
                    </span>
                  ))}
                  <a
                    href="#"
                    className="ml-auto font-mono text-[10px] uppercase tracking-wider text-navy-300 transition-colors hover:text-navy-100"
                  >
                    Read Paper
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-8 rounded border border-navy-700/40 bg-navy-900/50 p-8 text-center">
        <h3 className="font-mono text-sm font-semibold uppercase tracking-widest text-navy-100 mb-2">
          Access the full research library
        </h3>
        <p className="font-sans text-sm text-navy-400 mb-5 max-w-lg mx-auto">
          Platform members get full access to all whitepapers, appendix data, and the underlying models used in each publication.
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
