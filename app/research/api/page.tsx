"use client";

import { useState } from "react";
import Link from "next/link";
import { PublicNav } from "@/components/layout/public-nav";
import { PublicFooter } from "@/components/layout/public-footer";
import {
  Radar,
  Key,
  Zap,
  Shield,
  Globe,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ── Copy button ──

function CopyBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      <pre className="bg-navy-900/60 border border-navy-700/40 rounded-lg p-4 text-[12px] font-mono text-navy-200 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
      <button
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="absolute top-3 right-3 p-1.5 rounded bg-navy-800/80 text-navy-400 hover:text-navy-200 transition-colors opacity-0 group-hover:opacity-100"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

// ── Collapsible endpoint section ──

function Endpoint({
  method,
  path,
  description,
  minTier,
  scope,
  params,
  response,
}: {
  method: string;
  path: string;
  description: string;
  minTier: string;
  scope: string;
  params?: { name: string; type: string; description: string; required?: boolean }[];
  response: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-navy-700/40 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-navy-900/40 transition-colors text-left"
      >
        <span className="text-[10px] font-mono font-semibold tracking-wider px-2 py-0.5 rounded bg-accent-emerald/15 text-accent-emerald">
          {method}
        </span>
        <span className="text-[13px] font-mono text-navy-200 flex-1">{path}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-navy-500 uppercase tracking-wider">{minTier}+</span>
          {open ? <ChevronUp className="h-4 w-4 text-navy-500" /> : <ChevronDown className="h-4 w-4 text-navy-500" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-navy-700/30">
          <p className="text-[12px] text-navy-300 pt-4 font-sans">{description}</p>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-navy-500 uppercase tracking-wider">Scope:</span>
            <code className="text-[11px] font-mono text-accent-cyan bg-accent-cyan/10 px-1.5 py-0.5 rounded">{scope}</code>
          </div>

          {params && params.length > 0 && (
            <div>
              <h4 className="text-[10px] font-mono text-navy-400 uppercase tracking-[0.2em] mb-2">Query Parameters</h4>
              <div className="space-y-1.5">
                {params.map((p) => (
                  <div key={p.name} className="flex items-baseline gap-2 text-[12px]">
                    <code className="font-mono text-navy-200">{p.name}</code>
                    <span className="text-navy-600">:</span>
                    <span className="text-navy-500 font-mono text-[11px]">{p.type}</span>
                    {p.required && <span className="text-accent-rose text-[10px] font-mono">required</span>}
                    <span className="text-navy-400 font-sans">{p.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-[10px] font-mono text-navy-400 uppercase tracking-[0.2em] mb-2">Response</h4>
            <CopyBlock code={response} language="json" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-navy-950 text-navy-200">
      <PublicNav />

      <main className="pt-28 pb-20 max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="mb-16">
          <div className="flex items-center gap-2 mb-4">
            <Radar className="h-4 w-4 text-accent-cyan" />
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-accent-cyan">Public Data API</span>
          </div>
          <h1 className="text-3xl font-semibold text-white mb-4 font-sans flex items-center gap-3">
            NEXUS Intelligence API v1
          </h1>
          <p className="text-[14px] text-navy-400 leading-relaxed max-w-2xl font-sans">
            Machine-readable access to NEXUS signal convergence scores, regime detection states,
            calibrated predictions with Brier scoring, and game theory scenario analysis.
            Built for quant models, research pipelines, and intelligence dashboards.
          </p>
        </div>

        {/* Quick start */}
        <section className="mb-16">
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2 font-sans">
            <Zap className="h-4 w-4 text-accent-amber" />
            Quick Start
          </h2>

          <div className="space-y-4">
            <div>
              <p className="text-[12px] text-navy-400 mb-2 font-sans">1. Generate an API key from your NEXUS settings page</p>
              <CopyBlock code={`# Your key is shown once at creation. Store it securely.\n# Format: sk-nxs-{32 hex characters}`} />
            </div>
            <div>
              <p className="text-[12px] text-navy-400 mb-2 font-sans">2. Make your first request</p>
              <CopyBlock code={`curl -H "Authorization: Bearer sk-nxs-your-key-here" \\\n  https://nexushq.xyz/api/v1/signals?min_intensity=3`} />
            </div>
            <div>
              <p className="text-[12px] text-navy-400 mb-2 font-sans">3. Response envelope</p>
              <CopyBlock code={`{
  "data": { ... },
  "meta": {
    "timestamp": "2026-03-13T12:00:00.000Z",
    "tier": "analyst"
  }
}`} />
            </div>
          </div>
        </section>

        {/* Auth */}
        <section className="mb-16">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 font-sans">
            <Key className="h-4 w-4 text-accent-amber" />
            Authentication
          </h2>
          <div className="bg-navy-900/40 border border-navy-700/30 rounded-lg p-5 space-y-3">
            <p className="text-[12px] text-navy-300 font-sans">
              All requests require a Bearer token in the Authorization header.
              API keys are scoped to specific endpoints. Include the required scope when generating your key.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { scope: "signals", description: "Signal convergence data" },
                { scope: "predictions", description: "Predictions + accuracy stats" },
                { scope: "regime", description: "Regime detection states" },
                { scope: "game_theory", description: "Game theory scenarios" },
                { scope: "theses", description: "Intelligence theses" },
                { scope: "market", description: "Market quotes" },
              ].map((s) => (
                <div key={s.scope} className="flex items-center gap-2 text-[11px]">
                  <code className="font-mono text-accent-cyan">{s.scope}</code>
                  <span className="text-navy-500">{s.description}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Rate limits */}
        <section className="mb-16">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 font-sans">
            <Shield className="h-4 w-4 text-accent-amber" />
            Rate Limits
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] font-mono">
              <thead>
                <tr className="border-b border-navy-700/40 text-left">
                  <th className="py-2 pr-6 text-[10px] text-navy-500 uppercase tracking-wider">Tier</th>
                  <th className="py-2 pr-6 text-[10px] text-navy-500 uppercase tracking-wider">Per Minute</th>
                  <th className="py-2 pr-6 text-[10px] text-navy-500 uppercase tracking-wider">Per Hour</th>
                  <th className="py-2 text-[10px] text-navy-500 uppercase tracking-wider">Per Day</th>
                </tr>
              </thead>
              <tbody className="text-navy-300">
                <tr className="border-b border-navy-800/50"><td className="py-2 pr-6">Analyst</td><td className="py-2 pr-6">30</td><td className="py-2 pr-6">500</td><td className="py-2">5,000</td></tr>
                <tr className="border-b border-navy-800/50"><td className="py-2 pr-6">Operator</td><td className="py-2 pr-6">120</td><td className="py-2 pr-6">2,000</td><td className="py-2">20,000</td></tr>
                <tr><td className="py-2 pr-6">Institution</td><td className="py-2 pr-6">600</td><td className="py-2 pr-6">10,000</td><td className="py-2">100,000</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-navy-500 mt-3 font-sans">
            Rate limit headers: X-RateLimit-Remaining, X-RateLimit-Reset. 429 responses include Retry-After.
          </p>
        </section>

        {/* Endpoints */}
        <section className="mb-16">
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2 font-sans">
            <Globe className="h-4 w-4 text-accent-amber" />
            Endpoints
          </h2>

          <div className="space-y-3">
            {/* Signals */}
            <Endpoint
              method="GET"
              path="/api/v1/signals"
              description="Signal convergence detections with intensity scores (1-5), layer attribution, and market sector mapping. Intensity is computed via Bayesian posterior probability fusion across geopolitical, OSINT, market, and calendar layers."
              minTier="analyst"
              scope="signals"
              params={[
                { name: "limit", type: "number", description: "Max results (default 50, max 200)" },
                { name: "offset", type: "number", description: "Pagination offset" },
                { name: "min_intensity", type: "number", description: "Minimum intensity 1-5 (default 1)" },
                { name: "status", type: "string", description: "Filter: upcoming | active | passed" },
                { name: "category", type: "string", description: "Filter: celestial | geopolitical | convergence" },
              ]}
              response={`{
  "data": {
    "signals": [
      {
        "id": "uuid",
        "title": "Iran-Israel Escalation Window",
        "description": "...",
        "date": "2026-03-15",
        "intensity": 4,
        "category": "geopolitical",
        "layers": ["GEO", "MKT", "OSI"],
        "marketSectors": ["energy", "defense"],
        "status": "upcoming",
        "createdAt": "2026-03-13T..."
      }
    ],
    "pagination": { "limit": 50, "offset": 0, "count": 12 }
  }
}`}
            />

            {/* Regime */}
            <Endpoint
              method="GET"
              path="/api/v1/regime"
              description="Current regime state across 7 dimensions (volatility, growth, monetary, risk appetite, dollar, commodity, geopolitical) plus composite score. Each dimension includes regime classification, directional score (-1 to +1), and confidence level."
              minTier="analyst"
              scope="regime"
              params={[
                { name: "history", type: "boolean", description: "Include historical regime states (default false)" },
                { name: "history_limit", type: "number", description: "Max history entries (default 30, max 90)" },
              ]}
              response={`{
  "data": {
    "regime": {
      "timestamp": "2026-03-13T...",
      "composite": "Risk-off with elevated geopolitical tension",
      "compositeScore": -0.35,
      "volatility": {
        "regime": "elevated",
        "score": -0.4,
        "confidence": 0.82
      },
      "growth": {
        "regime": "slowdown",
        "score": -0.2,
        "confidence": 0.71
      },
      "geopolitical": {
        "regime": "escalating",
        "score": -0.6,
        "confidence": 0.88
      }
    }
  }
}`}
            />

            {/* Predictions */}
            <Endpoint
              method="GET"
              path="/api/v1/predictions"
              description="Calibrated predictions with transparent Brier scoring, regime-aware tagging, and direction vs level split scoring. Pre-event predictions are locked before the event window."
              minTier="analyst"
              scope="predictions"
              params={[
                { name: "limit", type: "number", description: "Max results (default 50, max 200)" },
                { name: "offset", type: "number", description: "Pagination offset" },
                { name: "outcome", type: "string", description: "Filter: confirmed | denied | partial | expired" },
              ]}
              response={`{
  "data": {
    "predictions": [
      {
        "id": "uuid",
        "claim": "WTI crude above $85 within 14 days",
        "timeframe": "14 days",
        "deadline": "2026-03-27",
        "confidence": 0.72,
        "category": "market",
        "direction": "up",
        "priceTarget": 85,
        "referenceSymbol": "WTI",
        "outcome": null,
        "score": null,
        "regimeAtCreation": "transitional",
        "preEvent": true,
        "createdAt": "2026-03-13T..."
      }
    ]
  }
}`}
            />

            {/* Prediction Accuracy */}
            <Endpoint
              method="GET"
              path="/api/v1/predictions/accuracy"
              description="Aggregate calibration statistics: overall Brier score, accuracy rate, direction/level split accuracy, breakdown by category and regime, and calibration curve data (predicted confidence vs actual outcome rate)."
              minTier="analyst"
              scope="predictions"
              params={[
                { name: "category", type: "string", description: "Filter: market | geopolitical | celestial" },
              ]}
              response={`{
  "data": {
    "totalResolved": 142,
    "brierScore": 0.187,
    "accuracyRate": 0.68,
    "directionAccuracy": 0.74,
    "levelAccuracy": 0.41,
    "byOutcome": {
      "confirmed": 78,
      "denied": 34,
      "partial": 18,
      "expired": 12
    },
    "byCategory": {
      "market": { "count": 89, "avgBrier": 0.165 },
      "geopolitical": { "count": 53, "avgBrier": 0.221 }
    },
    "byRegime": {
      "peacetime": { "count": 98, "avgBrier": 0.171 },
      "transitional": { "count": 32, "avgBrier": 0.198 },
      "wartime": { "count": 12, "avgBrier": 0.247 }
    },
    "calibration": [
      { "confidenceBucket": 0.5, "predictions": 30, "actualRate": 0.47 },
      { "confidenceBucket": 0.7, "predictions": 45, "actualRate": 0.69 },
      { "confidenceBucket": 0.9, "predictions": 15, "actualRate": 0.87 }
    ]
  }
}`}
            />

            {/* Game Theory */}
            <Endpoint
              method="GET"
              path="/api/v1/game-theory"
              description="Active game theory scenarios with Nash equilibria, Schelling focal points, escalation ladders, dominant strategies, and market impact assessments. Includes wartime branch state tracking with threshold triggers and strategy invalidation."
              minTier="operator"
              scope="game_theory"
              params={[
                { name: "limit", type: "number", description: "Max results (default 20, max 50)" },
                { name: "offset", type: "number", description: "Pagination offset" },
                { name: "scenario_id", type: "string", description: "Fetch a specific scenario by ID" },
              ]}
              response={`{
  "data": {
    "scenarios": [
      {
        "id": "iran-nuclear-2026",
        "title": "Iran Nuclear Escalation",
        "analysis": {
          "nashEquilibria": [
            {
              "strategies": { "iran": "Accelerate", "us": "Sanctions" },
              "payoffs": { "iran": -2, "us": -3 },
              "stability": "unstable",
              "marketImpact": {
                "direction": "bearish",
                "magnitude": "high",
                "sectors": ["energy", "defense"]
              }
            }
          ],
          "escalationLadder": [
            {
              "level": 1,
              "description": "Enrichment threshold breach",
              "probability": 0.45,
              "marketImpact": {
                "direction": "bearish",
                "magnitude": "medium",
                "sectors": ["energy"]
              }
            }
          ],
          "marketAssessment": {
            "mostLikelyOutcome": "Continued brinkmanship",
            "direction": "bearish",
            "confidence": 0.62
          }
        },
        "state": {
          "regime": "transitional",
          "state": "escalating",
          "triggeredThresholds": ["Enrichment above 60%"],
          "invalidatedStrategies": [],
          "updatedAt": "2026-03-12T..."
        }
      }
    ]
  }
}`}
            />

            {/* Theses */}
            <Endpoint
              method="GET"
              path="/api/v1/theses"
              description="Intelligence theses synthesising signal convergence, regime state, and market analysis into actionable assessments with trading recommendations and risk scenarios."
              minTier="operator"
              scope="theses"
              params={[
                { name: "limit", type: "number", description: "Max results (default 20, max 50)" },
                { name: "offset", type: "number", description: "Pagination offset" },
                { name: "status", type: "string", description: "Filter: active | expired | superseded (default active)" },
              ]}
              response={`{
  "data": {
    "theses": [
      {
        "id": "uuid",
        "title": "Energy Supply Disruption Thesis",
        "status": "active",
        "marketRegime": "risk_off",
        "volatilityOutlook": "elevated",
        "overallConfidence": 0.71,
        "executiveSummary": "...",
        "tradingActions": [...],
        "symbols": ["WTI", "XOM", "LMT"]
      }
    ]
  }
}`}
            />

            {/* Market Quote */}
            <Endpoint
              method="GET"
              path="/api/v1/market/quote"
              description="Real-time market quotes via Alpha Vantage. Auto-detects crypto symbols (BTC, ETH, XRP) vs equities."
              minTier="analyst"
              scope="market"
              params={[
                { name: "symbol", type: "string", description: "Ticker symbol (e.g. AAPL, BTC, WTI)", required: true },
              ]}
              response={`{
  "data": {
    "symbol": "AAPL",
    "price": 178.52,
    "change": -1.23,
    "changePercent": "-0.68%",
    "volume": 54200000
  }
}`}
            />
          </div>
        </section>

        {/* Error codes */}
        <section className="mb-16">
          <h2 className="text-lg font-semibold text-white mb-4 font-sans">Error Codes</h2>
          <div className="bg-navy-900/40 border border-navy-700/30 rounded-lg overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-navy-700/40">
                  <th className="py-2.5 px-4 text-left text-[10px] font-mono text-navy-500 uppercase tracking-wider">Status</th>
                  <th className="py-2.5 px-4 text-left text-[10px] font-mono text-navy-500 uppercase tracking-wider">Code</th>
                  <th className="py-2.5 px-4 text-left text-[10px] font-mono text-navy-500 uppercase tracking-wider">Description</th>
                </tr>
              </thead>
              <tbody className="font-mono text-navy-300">
                {[
                  ["401", "missing_api_key", "No Authorization header provided"],
                  ["401", "invalid_api_key", "Key is malformed, revoked, or not found"],
                  ["403", "insufficient_scope", "Key lacks required scope for this endpoint"],
                  ["403", "insufficient_tier", "Subscription tier too low for this endpoint"],
                  ["403", "api_access_disabled", "API access not included in your tier"],
                  ["429", "rate_limited", "Rate limit exceeded. Check Retry-After header"],
                  ["500", "internal_error", "Server error. Contact support if persistent"],
                ].map(([status, code, desc]) => (
                  <tr key={code} className="border-b border-navy-800/40">
                    <td className="py-2 px-4 text-accent-rose">{status}</td>
                    <td className="py-2 px-4 text-navy-200">{code}</td>
                    <td className="py-2 px-4 text-navy-400 font-sans">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-12 border-t border-navy-700/30">
          <h2 className="text-xl font-semibold text-white mb-3 font-sans">Start building</h2>
          <p className="text-[13px] text-navy-400 mb-6 font-sans">
            Generate your API key and start integrating NEXUS intelligence into your pipeline.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="px-5 py-2.5 bg-white text-navy-950 text-[12px] font-semibold rounded-lg hover:bg-navy-100 transition-colors font-sans"
            >
              Create Account
            </Link>
            <Link
              href="/settings"
              className="px-5 py-2.5 border border-navy-600 text-navy-300 text-[12px] font-semibold rounded-lg hover:border-navy-400 transition-colors font-sans"
            >
              Manage API Keys
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
