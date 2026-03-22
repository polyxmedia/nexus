"use client";

import { ArrowRight } from "lucide-react";

// ── Data ──

interface Platform {
  name: string;
  price: string;
  priceNote: string;
  strength: string;
  blindSpot: string;
  isNexus?: boolean;
}

const PLATFORMS: Platform[] = [
  {
    name: "Bloomberg Terminal",
    price: "$2,665/mo",
    priceNote: "2-year contract",
    strength: "Best-in-class market data, execution, institutional chat, and exchange coverage. The standard for trading desks worldwide.",
    blindSpot: "No geopolitical signal detection, OSINT integration, prediction tracking, or conflict monitoring. Market data without the geopolitical context that moves it.",
  },
  {
    name: "Recorded Future",
    price: "$5,000+/mo",
    priceNote: "Enterprise contracts",
    strength: "Best-in-class cyber threat intelligence and enterprise risk monitoring. Deep dark web and technical indicator coverage.",
    blindSpot: "No market data, trading integration, or geopolitical-market convergence analysis. Intelligence without the market side of the equation.",
  },
  {
    name: "Stratfor / RANE",
    price: "$124+/mo",
    priceNote: "Reports and analysis",
    strength: "Experienced geopolitical analysts producing long-form intelligence reports and regional risk assessments.",
    blindSpot: "No live tooling, no real-time data feeds, no trading integration, no prediction scoring. Analysis you read, not a platform you work in.",
  },
  {
    name: "Trade Ideas",
    price: "$69-149/mo",
    priceNote: "US equities focus",
    strength: "Fast US equities scanning with AI-driven technical signals and backtested strategies for active traders.",
    blindSpot: "No geopolitical layer, no OSINT, no macro analysis, no cross-asset convergence. Pure technical, no fundamental or geopolitical context.",
  },
  {
    name: "NEXUS",
    price: "From $199/mo",
    priceNote: "Full platform access",
    strength: "Geopolitical-market convergence. Four signal layers, Brier-scored predictions, OSINT war room, AI analyst, game theory scenarios, and trade execution in one pipeline.",
    blindSpot: "Not a Bloomberg replacement for institutional execution or exchange coverage. Not a Recorded Future replacement for cyber threat intel. Built for the gap between pure market platforms and pure intelligence platforms.",
    isNexus: true,
  },
];

// ── Component ──

export function CompetitorComparison({ className }: { className?: string }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className || ""}`}>
      {PLATFORMS.map((p) => (
        <div
          key={p.name}
          className={`flex flex-col border rounded-lg p-5 transition-colors ${
            p.isNexus
              ? "border-accent-cyan/30 bg-accent-cyan/[0.03] md:col-span-2 lg:col-span-1 lg:row-span-2"
              : "border-navy-800/50 bg-navy-900/20 hover:border-navy-700/50"
          }`}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className={`text-[13px] font-medium ${p.isNexus ? "text-accent-cyan" : "text-navy-200"}`}>
                {p.name}
              </h3>
              <p className="text-[9px] font-mono text-navy-600 mt-0.5">{p.priceNote}</p>
            </div>
            <span className={`text-[12px] font-mono font-semibold shrink-0 ${p.isNexus ? "text-accent-cyan" : "text-navy-300"}`}>
              {p.price}
            </span>
          </div>

          {/* Strength */}
          <div className="mb-4">
            <div className="text-[9px] font-mono uppercase tracking-wider text-navy-600 mb-1.5">
              What it does best
            </div>
            <p className="text-[12px] text-navy-300 leading-relaxed font-sans">
              {p.strength}
            </p>
          </div>

          {/* Blind spot */}
          <div className={`mt-auto pt-3 border-t ${p.isNexus ? "border-accent-cyan/15" : "border-navy-800/30"}`}>
            <div className="text-[9px] font-mono uppercase tracking-wider text-navy-600 mb-1.5">
              {p.isNexus ? "Honest limitations" : "Blind spot"}
            </div>
            <p className="text-[11px] text-navy-500 leading-relaxed font-sans">
              {p.blindSpot}
            </p>
          </div>

          {/* NEXUS CTA */}
          {p.isNexus && (
            <div className="mt-5 pt-4 border-t border-accent-cyan/15">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-accent-cyan/70">
                <ArrowRight className="h-3 w-3" />
                <span>Complements institutional setups. Does not replace them.</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
