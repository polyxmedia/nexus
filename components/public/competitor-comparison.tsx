"use client";

import { Check, X, Minus } from "lucide-react";

// ── Data ──

interface Competitor {
  name: string;
  price: string;
  priceNote: string;
  features: Record<string, "yes" | "no" | "partial">;
}

const FEATURE_KEYS = [
  "AI-driven signal detection",
  "Geopolitical intelligence",
  "Market data and technicals",
  "Monte Carlo simulation",
  "Prediction tracking (Brier scored)",
  "Game theory scenarios",
  "Trading integration",
  "Shipping and dark fleet monitoring",
  "Knowledge bank with embeddings",
  "OSINT and conflict data",
  "War room with live map",
  "Regime detection",
];

const COMPETITORS: Competitor[] = [
  {
    name: "Bloomberg Terminal",
    price: "$2,665/mo",
    priceNote: "2-year contract, $32K/yr",
    features: {
      "AI-driven signal detection": "no",
      "Geopolitical intelligence": "partial",
      "Market data and technicals": "yes",
      "Monte Carlo simulation": "no",
      "Prediction tracking (Brier scored)": "no",
      "Game theory scenarios": "no",
      "Trading integration": "yes",
      "Shipping and dark fleet monitoring": "partial",
      "Knowledge bank with embeddings": "no",
      "OSINT and conflict data": "no",
      "War room with live map": "no",
      "Regime detection": "no",
    },
  },
  {
    name: "Recorded Future",
    price: "$5,000+/mo",
    priceNote: "Enterprise only, $60-100K/yr",
    features: {
      "AI-driven signal detection": "partial",
      "Geopolitical intelligence": "yes",
      "Market data and technicals": "no",
      "Monte Carlo simulation": "no",
      "Prediction tracking (Brier scored)": "no",
      "Game theory scenarios": "no",
      "Trading integration": "no",
      "Shipping and dark fleet monitoring": "no",
      "Knowledge bank with embeddings": "partial",
      "OSINT and conflict data": "yes",
      "War room with live map": "no",
      "Regime detection": "no",
    },
  },
  {
    name: "Stratfor / RANE",
    price: "$124+/mo",
    priceNote: "Reports only, no tooling",
    features: {
      "AI-driven signal detection": "no",
      "Geopolitical intelligence": "yes",
      "Market data and technicals": "no",
      "Monte Carlo simulation": "no",
      "Prediction tracking (Brier scored)": "no",
      "Game theory scenarios": "no",
      "Trading integration": "no",
      "Shipping and dark fleet monitoring": "no",
      "Knowledge bank with embeddings": "no",
      "OSINT and conflict data": "partial",
      "War room with live map": "no",
      "Regime detection": "no",
    },
  },
  {
    name: "Trade Ideas",
    price: "$69-149/mo",
    priceNote: "US equities scanning only",
    features: {
      "AI-driven signal detection": "partial",
      "Geopolitical intelligence": "no",
      "Market data and technicals": "yes",
      "Monte Carlo simulation": "no",
      "Prediction tracking (Brier scored)": "no",
      "Game theory scenarios": "no",
      "Trading integration": "partial",
      "Shipping and dark fleet monitoring": "no",
      "Knowledge bank with embeddings": "no",
      "OSINT and conflict data": "no",
      "War room with live map": "no",
      "Regime detection": "no",
    },
  },
  {
    name: "NEXUS",
    price: "From $199/mo",
    priceNote: "Full platform, 3 tiers",
    features: {
      "AI-driven signal detection": "yes",
      "Geopolitical intelligence": "yes",
      "Market data and technicals": "yes",
      "Monte Carlo simulation": "yes",
      "Prediction tracking (Brier scored)": "yes",
      "Game theory scenarios": "yes",
      "Trading integration": "yes",
      "Shipping and dark fleet monitoring": "yes",
      "Knowledge bank with embeddings": "yes",
      "OSINT and conflict data": "yes",
      "War room with live map": "yes",
      "Regime detection": "yes",
    },
  },
];

// ── Components ──

function FeatureIcon({ status }: { status: "yes" | "no" | "partial" }) {
  if (status === "yes") return <Check className="h-3.5 w-3.5 text-accent-emerald" />;
  if (status === "partial") return <Minus className="h-3.5 w-3.5 text-accent-amber" />;
  return <X className="h-3.5 w-3.5 text-navy-700" />;
}

function featureChipClass(status: "yes" | "no" | "partial", isNexus: boolean): string {
  if (status === "yes") {
    return isNexus ? "bg-accent-cyan/10 text-accent-cyan" : "bg-accent-emerald/10 text-accent-emerald";
  }
  if (status === "partial") return "bg-accent-amber/10 text-accent-amber";
  return "bg-navy-800/40 text-navy-700";
}

// ── Exported Component ──

export function CompetitorComparison({ className }: { className?: string }) {
  return (
    <div className={className}>
      {/* Desktop table */}
      <div className="hidden lg:block border border-navy-800/60 rounded-lg bg-navy-900/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-navy-800/40">
                <th className="text-left text-[9px] font-mono font-normal text-navy-600 uppercase tracking-wider px-4 py-3 w-56">
                  Feature
                </th>
                {COMPETITORS.map((c) => (
                  <th
                    key={c.name}
                    className={`text-center text-[9px] font-mono font-normal uppercase tracking-wider px-3 py-3 ${
                      c.name === "NEXUS" ? "text-accent-cyan bg-accent-cyan/[0.04]" : "text-navy-600"
                    }`}
                  >
                    <div>{c.name}</div>
                    <div className={`text-[10px] font-bold mt-1 ${c.name === "NEXUS" ? "text-accent-cyan" : "text-navy-400"}`}>
                      {c.price}
                    </div>
                    <div className="text-[8px] text-navy-700 font-normal mt-0.5">{c.priceNote}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_KEYS.map((feature) => (
                <tr key={feature} className="border-b border-navy-800/20 last:border-0">
                  <td className="text-[11px] text-navy-400 px-4 py-2.5">{feature}</td>
                  {COMPETITORS.map((c) => (
                    <td
                      key={c.name}
                      className={`text-center px-3 py-2.5 ${c.name === "NEXUS" ? "bg-accent-cyan/[0.04]" : ""}`}
                    >
                      <div className="flex justify-center">
                        <FeatureIcon status={c.features[feature]} />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: card layout */}
      <div className="lg:hidden space-y-4">
        {COMPETITORS.map((c) => {
          const yesCount = Object.values(c.features).filter((v) => v === "yes").length;
          const isNexus = c.name === "NEXUS";
          return (
            <div
              key={c.name}
              className={`border rounded-lg p-4 ${
                isNexus
                  ? "border-accent-cyan/30 bg-accent-cyan/[0.04]"
                  : "border-navy-800/60 bg-navy-900/30"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className={`text-sm font-medium ${isNexus ? "text-accent-cyan" : "text-navy-200"}`}>
                    {c.name}
                  </h4>
                  <p className="text-[9px] text-navy-600 mt-0.5">{c.priceNote}</p>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-mono font-bold ${isNexus ? "text-accent-cyan" : "text-navy-300"}`}>
                    {c.price}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-1.5 rounded-full bg-navy-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isNexus ? "bg-accent-cyan" : "bg-navy-500"}`}
                    style={{ width: `${(yesCount / FEATURE_KEYS.length) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-navy-500">
                  {yesCount}/{FEATURE_KEYS.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {FEATURE_KEYS.map((feature) => (
                  <span
                    key={feature}
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${featureChipClass(c.features[feature], isNexus)}`}
                  >
                    {feature.split("(")[0].trim()}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
