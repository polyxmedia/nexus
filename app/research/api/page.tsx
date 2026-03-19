"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Radar,
  Key,
  Zap,
  Shield,
  Globe,
  Copy,
  Check,
  ChevronRight,
  AlertTriangle,
  BarChart3,
  Target,
  Brain,
  TrendingUp,
  Menu,
  X,
} from "lucide-react";

// ── Copy Block ──

function CopyBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      <pre className="bg-[#0a0e1a] border border-navy-700/40 rounded-lg p-4 text-[12px] font-mono text-navy-200 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
      <button
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="absolute top-3 right-3 p-1.5 rounded bg-navy-800/80 text-navy-500 hover:text-navy-200 transition-colors opacity-0 group-hover:opacity-100"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-accent-emerald" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

// ── Method Badge ──

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-accent-emerald/15 text-accent-emerald border-accent-emerald/20",
    POST: "bg-accent-cyan/15 text-accent-cyan border-accent-cyan/20",
    PATCH: "bg-accent-amber/15 text-accent-amber border-accent-amber/20",
    DELETE: "bg-accent-rose/15 text-accent-rose border-accent-rose/20",
  };
  return (
    <span className={`text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded border ${colors[method] || "bg-navy-800 text-navy-300 border-navy-700"}`}>
      {method}
    </span>
  );
}

// ── Param Table ──

function ParamTable({ params }: { params: { name: string; type: string; description: string; required?: boolean }[] }) {
  return (
    <div className="border border-navy-700/30 rounded-lg overflow-hidden mt-4">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-navy-700/30 bg-navy-900/40">
            <th className="py-2 px-3 text-left text-[9px] font-mono text-navy-500 uppercase tracking-wider">Name</th>
            <th className="py-2 px-3 text-left text-[9px] font-mono text-navy-500 uppercase tracking-wider">Type</th>
            <th className="py-2 px-3 text-left text-[9px] font-mono text-navy-500 uppercase tracking-wider">Description</th>
          </tr>
        </thead>
        <tbody>
          {params.map((p) => (
            <tr key={p.name} className="border-b border-navy-800/30 last:border-0">
              <td className="py-2 px-3 font-mono text-navy-200">
                {p.name}
                {p.required && <span className="text-accent-rose ml-1">*</span>}
              </td>
              <td className="py-2 px-3 font-mono text-accent-cyan/70">{p.type}</td>
              <td className="py-2 px-3 text-navy-400 font-sans">{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Section IDs for sidebar nav ──

const NAV_SECTIONS = [
  { id: "introduction", label: "Introduction", icon: Radar },
  { id: "authentication", label: "Authentication", icon: Key },
  { id: "rate-limits", label: "Rate Limits", icon: Shield },
  { id: "signals", label: "GET /signals", icon: Zap },
  { id: "regime", label: "GET /regime", icon: BarChart3 },
  { id: "predictions", label: "GET /predictions", icon: Target },
  { id: "accuracy", label: "GET /predictions/accuracy", icon: Target },
  { id: "game-theory", label: "GET /game-theory", icon: Brain },
  { id: "theses", label: "GET /theses", icon: Brain },
  { id: "market-quote", label: "GET /market/quote", icon: TrendingUp },
  { id: "errors", label: "Error Codes", icon: AlertTriangle },
];

// ── Page ──

export default function ApiDocsPage() {
  const [activeSection, setActiveSection] = useState("introduction");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Track which section is in view
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    NAV_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setMobileNavOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 text-navy-200">
      {/* Mobile nav toggle */}
      <button
        onClick={() => setMobileNavOpen(!mobileNavOpen)}
        className="fixed top-20 right-4 z-50 lg:hidden p-2 rounded-lg bg-navy-900 border border-navy-700/50 text-navy-400"
      >
        {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      <div className="max-w-7xl mx-auto flex">
        {/* ── Sidebar ── */}
        <aside className={`
          fixed lg:sticky top-0 pt-24 lg:pt-28 z-40
          w-64 h-screen shrink-0 overflow-y-auto
          border-r border-navy-800/50 bg-navy-950/95 backdrop-blur-md
          transition-transform duration-200
          ${mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}>
          <div className="px-5 pb-4 mb-4 border-b border-navy-800/40">
            <div className="flex items-center gap-2 mb-1">
              <Radar className="h-4 w-4 text-accent-cyan" />
              <span className="font-mono text-[11px] font-bold text-navy-200 tracking-wider">NEXUS API</span>
            </div>
            <span className="font-mono text-[10px] text-navy-600">v1 Reference</span>
          </div>

          <nav className="px-3 pb-8">
            {NAV_SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[12px] transition-colors mb-0.5 ${
                  activeSection === id
                    ? "bg-accent-cyan/8 text-accent-cyan"
                    : "text-navy-500 hover:text-navy-300 hover:bg-navy-900/60"
                }`}
              >
                <Icon className="h-3 w-3 shrink-0" />
                <span className="font-mono truncate">{label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Overlay for mobile nav */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setMobileNavOpen(false)} />
        )}

        {/* ── Content ── */}
        <main className="flex-1 min-w-0 pt-28 pb-20 px-6 lg:px-12 lg:ml-0">
          <div className="max-w-3xl">

            {/* ════ Introduction ════ */}
            <section id="introduction" className="mb-20 scroll-mt-24">
              <div className="flex items-center gap-2 mb-4">
                <Radar className="h-4 w-4 text-accent-cyan" />
                <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-accent-cyan">Public Data API</span>
              </div>
              <h1 className="text-3xl font-semibold text-white mb-4 font-sans">
                NEXUS Intelligence API
              </h1>
              <p className="text-[14px] text-navy-400 leading-relaxed font-sans mb-8">
                Machine-readable access to NEXUS signal convergence scores, regime detection states,
                calibrated predictions with Brier scoring, and game theory scenario analysis.
                Built for quant models, research pipelines, and intelligence dashboards.
              </p>

              <div className="border border-navy-700/30 rounded-lg bg-navy-900/30 p-5 mb-6">
                <h3 className="text-[10px] font-mono text-navy-500 uppercase tracking-wider mb-3">Base URL</h3>
                <CopyBlock code="https://nexushq.xyz/api/v1" />
              </div>

              <h3 className="text-sm font-semibold text-white mb-3 font-sans">Quick Start</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-[12px] text-navy-400 mb-2 font-sans">
                    <span className="font-mono text-accent-cyan bg-accent-cyan/10 px-1.5 py-0.5 rounded mr-2">1</span>
                    Generate an API key from your settings page
                  </p>
                  <CopyBlock code={`# Your key is shown once at creation. Store it securely.\n# Format: sk-nxs-{32 hex characters}`} />
                </div>
                <div>
                  <p className="text-[12px] text-navy-400 mb-2 font-sans">
                    <span className="font-mono text-accent-cyan bg-accent-cyan/10 px-1.5 py-0.5 rounded mr-2">2</span>
                    Make your first request
                  </p>
                  <CopyBlock code={`curl -H "Authorization: Bearer sk-nxs-your-key-here" \\\n  https://nexushq.xyz/api/v1/signals?min_intensity=3`} />
                </div>
                <div>
                  <p className="text-[12px] text-navy-400 mb-2 font-sans">
                    <span className="font-mono text-accent-cyan bg-accent-cyan/10 px-1.5 py-0.5 rounded mr-2">3</span>
                    Response envelope
                  </p>
                  <CopyBlock code={`{\n  "data": { ... },\n  "meta": {\n    "timestamp": "2026-03-13T12:00:00.000Z",\n    "tier": "analyst"\n  }\n}`} />
                </div>
              </div>
            </section>

            <div className="h-px bg-navy-800/50 mb-20" />

            {/* ════ Authentication ════ */}
            <section id="authentication" className="mb-20 scroll-mt-24">
              <h2 className="text-xl font-semibold text-white mb-4 font-sans flex items-center gap-2">
                <Key className="h-4 w-4 text-accent-amber" />
                Authentication
              </h2>
              <p className="text-[13px] text-navy-400 leading-relaxed font-sans mb-6">
                All requests require a Bearer token in the <code className="font-mono text-accent-cyan bg-accent-cyan/10 px-1 py-0.5 rounded text-[12px]">Authorization</code> header.
                Keys are scoped to specific endpoints. Include the required scope when generating your key.
              </p>

              <CopyBlock code={`Authorization: Bearer sk-nxs-your-key-here`} />

              <h3 className="text-sm font-semibold text-white mt-8 mb-3 font-sans">Available Scopes</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { scope: "signals", description: "Signal convergence data" },
                  { scope: "predictions", description: "Predictions + accuracy stats" },
                  { scope: "regime", description: "Regime detection states" },
                  { scope: "game_theory", description: "Game theory scenarios" },
                  { scope: "theses", description: "Intelligence theses" },
                  { scope: "market", description: "Market quotes" },
                ].map((s) => (
                  <div key={s.scope} className="flex items-center gap-2.5 border border-navy-800/40 rounded-lg px-3 py-2.5">
                    <code className="font-mono text-[11px] text-accent-cyan font-bold">{s.scope}</code>
                    <span className="text-[11px] text-navy-500">{s.description}</span>
                  </div>
                ))}
              </div>
            </section>

            <div className="h-px bg-navy-800/50 mb-20" />

            {/* ════ Rate Limits ════ */}
            <section id="rate-limits" className="mb-20 scroll-mt-24">
              <h2 className="text-xl font-semibold text-white mb-4 font-sans flex items-center gap-2">
                <Shield className="h-4 w-4 text-accent-amber" />
                Rate Limits
              </h2>
              <p className="text-[13px] text-navy-400 leading-relaxed font-sans mb-6">
                Rate limits are enforced per API key. Exceeding limits returns <code className="font-mono text-accent-rose bg-accent-rose/10 px-1 py-0.5 rounded text-[12px]">429</code> with
                a <code className="font-mono text-navy-300 text-[12px]">Retry-After</code> header.
              </p>

              <div className="border border-navy-700/30 rounded-lg overflow-hidden">
                <table className="w-full text-[12px] font-mono">
                  <thead>
                    <tr className="border-b border-navy-700/30 bg-navy-900/40">
                      <th className="py-2.5 px-4 text-left text-[9px] text-navy-500 uppercase tracking-wider">Tier</th>
                      <th className="py-2.5 px-4 text-left text-[9px] text-navy-500 uppercase tracking-wider">Per Minute</th>
                      <th className="py-2.5 px-4 text-left text-[9px] text-navy-500 uppercase tracking-wider">Per Hour</th>
                      <th className="py-2.5 px-4 text-left text-[9px] text-navy-500 uppercase tracking-wider">Per Day</th>
                    </tr>
                  </thead>
                  <tbody className="text-navy-300">
                    <tr className="border-b border-navy-800/30"><td className="py-2.5 px-4">Analyst</td><td className="py-2.5 px-4">30</td><td className="py-2.5 px-4">500</td><td className="py-2.5 px-4">5,000</td></tr>
                    <tr className="border-b border-navy-800/30"><td className="py-2.5 px-4">Operator</td><td className="py-2.5 px-4">120</td><td className="py-2.5 px-4">2,000</td><td className="py-2.5 px-4">20,000</td></tr>
                    <tr><td className="py-2.5 px-4">Institution</td><td className="py-2.5 px-4">600</td><td className="py-2.5 px-4">10,000</td><td className="py-2.5 px-4">100,000</td></tr>
                  </tbody>
                </table>
              </div>

              <p className="text-[11px] text-navy-600 mt-3 font-mono">
                Headers: X-RateLimit-Remaining, X-RateLimit-Reset
              </p>
            </section>

            <div className="h-px bg-navy-800/50 mb-20" />

            {/* ════ Endpoints ════ */}

            {/* Signals */}
            <section id="signals" className="mb-20 scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <MethodBadge method="GET" />
                <code className="text-[14px] font-mono text-navy-100">/api/v1/signals</code>
                <span className="text-[9px] font-mono text-navy-600 uppercase tracking-wider ml-auto">analyst+</span>
              </div>
              <p className="text-[13px] text-navy-400 leading-relaxed font-sans mb-4">
                Signal convergence detections with intensity scores (1-5), layer attribution, and market sector mapping.
                Intensity is computed via Bayesian posterior probability fusion across geopolitical, OSINT, market, and calendar layers.
              </p>
              <div className="text-[10px] font-mono text-navy-500 mb-2 uppercase tracking-wider">Scope: <code className="text-accent-cyan">signals</code></div>

              <ParamTable params={[
                { name: "limit", type: "number", description: "Max results (default 50, max 200)" },
                { name: "offset", type: "number", description: "Pagination offset" },
                { name: "min_intensity", type: "number", description: "Minimum intensity 1-5 (default 1)" },
                { name: "status", type: "string", description: "Filter: upcoming | active | passed" },
                { name: "category", type: "string", description: "Filter: celestial | geopolitical | convergence" },
              ]} />

              <h4 className="text-[10px] font-mono text-navy-500 uppercase tracking-wider mt-6 mb-2">Response</h4>
              <CopyBlock code={`{
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
}`} />
            </section>

            <div className="h-px bg-navy-800/50 mb-20" />

            {/* Regime */}
            <section id="regime" className="mb-20 scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <MethodBadge method="GET" />
                <code className="text-[14px] font-mono text-navy-100">/api/v1/regime</code>
                <span className="text-[9px] font-mono text-navy-600 uppercase tracking-wider ml-auto">analyst+</span>
              </div>
              <p className="text-[13px] text-navy-400 leading-relaxed font-sans mb-4">
                Current regime state across 7 dimensions (volatility, growth, monetary, risk appetite, dollar, commodity, geopolitical)
                plus composite score. Each dimension includes regime classification, directional score (-1 to +1), and confidence level.
              </p>
              <div className="text-[10px] font-mono text-navy-500 mb-2 uppercase tracking-wider">Scope: <code className="text-accent-cyan">regime</code></div>

              <ParamTable params={[
                { name: "history", type: "boolean", description: "Include historical regime states (default false)" },
                { name: "history_limit", type: "number", description: "Max history entries (default 30, max 90)" },
              ]} />

              <h4 className="text-[10px] font-mono text-navy-500 uppercase tracking-wider mt-6 mb-2">Response</h4>
              <CopyBlock code={`{
  "data": {
    "regime": {
      "timestamp": "2026-03-13T...",
      "composite": "Risk-off with elevated geopolitical tension",
      "compositeScore": -0.35,
      "volatility": { "regime": "elevated", "score": -0.4, "confidence": 0.82 },
      "growth": { "regime": "slowdown", "score": -0.2, "confidence": 0.71 },
      "geopolitical": { "regime": "escalating", "score": -0.6, "confidence": 0.88 }
    }
  }
}`} />
            </section>

            <div className="h-px bg-navy-800/50 mb-20" />

            {/* Predictions */}
            <section id="predictions" className="mb-20 scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <MethodBadge method="GET" />
                <code className="text-[14px] font-mono text-navy-100">/api/v1/predictions</code>
                <span className="text-[9px] font-mono text-navy-600 uppercase tracking-wider ml-auto">analyst+</span>
              </div>
              <p className="text-[13px] text-navy-400 leading-relaxed font-sans mb-4">
                Calibrated predictions with transparent Brier scoring, regime-aware tagging, and direction vs level split scoring.
                Pre-event predictions are locked before the event window.
              </p>
              <div className="text-[10px] font-mono text-navy-500 mb-2 uppercase tracking-wider">Scope: <code className="text-accent-cyan">predictions</code></div>

              <ParamTable params={[
                { name: "limit", type: "number", description: "Max results (default 50, max 200)" },
                { name: "offset", type: "number", description: "Pagination offset" },
                { name: "outcome", type: "string", description: "Filter: confirmed | denied | partial | expired" },
              ]} />

              <h4 className="text-[10px] font-mono text-navy-500 uppercase tracking-wider mt-6 mb-2">Response</h4>
              <CopyBlock code={`{
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
}`} />
            </section>

            <div className="h-px bg-navy-800/50 mb-20" />

            {/* Prediction Accuracy */}
            <section id="accuracy" className="mb-20 scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <MethodBadge method="GET" />
                <code className="text-[14px] font-mono text-navy-100">/api/v1/predictions/accuracy</code>
                <span className="text-[9px] font-mono text-navy-600 uppercase tracking-wider ml-auto">analyst+</span>
              </div>
              <p className="text-[13px] text-navy-400 leading-relaxed font-sans mb-4">
                Aggregate calibration statistics: overall Brier score, accuracy rate, direction/level split accuracy,
                breakdown by category and regime, and calibration curve data.
              </p>
              <div className="text-[10px] font-mono text-navy-500 mb-2 uppercase tracking-wider">Scope: <code className="text-accent-cyan">predictions</code></div>

              <ParamTable params={[
                { name: "category", type: "string", description: "Filter: market | geopolitical" },
              ]} />

              <h4 className="text-[10px] font-mono text-navy-500 uppercase tracking-wider mt-6 mb-2">Response</h4>
              <CopyBlock code={`{
  "data": {
    "totalResolved": 142,
    "brierScore": 0.187,
    "accuracyRate": 0.68,
    "directionAccuracy": 0.74,
    "levelAccuracy": 0.41,
    "byOutcome": { "confirmed": 78, "denied": 34, "partial": 18, "expired": 12 },
    "byCategory": {
      "market": { "count": 89, "avgBrier": 0.165 },
      "geopolitical": { "count": 53, "avgBrier": 0.221 }
    },
    "calibration": [
      { "confidenceBucket": 0.5, "predictions": 30, "actualRate": 0.47 },
      { "confidenceBucket": 0.7, "predictions": 45, "actualRate": 0.69 }
    ]
  }
}`} />
            </section>

            <div className="h-px bg-navy-800/50 mb-20" />

            {/* Game Theory */}
            <section id="game-theory" className="mb-20 scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <MethodBadge method="GET" />
                <code className="text-[14px] font-mono text-navy-100">/api/v1/game-theory</code>
                <span className="text-[9px] font-mono text-navy-600 uppercase tracking-wider ml-auto">operator+</span>
              </div>
              <p className="text-[13px] text-navy-400 leading-relaxed font-sans mb-4">
                Active game theory scenarios with Nash equilibria, Schelling focal points, escalation ladders,
                dominant strategies, and market impact assessments. Includes wartime branch state tracking.
              </p>
              <div className="text-[10px] font-mono text-navy-500 mb-2 uppercase tracking-wider">Scope: <code className="text-accent-cyan">game_theory</code></div>

              <ParamTable params={[
                { name: "limit", type: "number", description: "Max results (default 20, max 50)" },
                { name: "offset", type: "number", description: "Pagination offset" },
                { name: "scenario_id", type: "string", description: "Fetch a specific scenario by ID" },
              ]} />

              <h4 className="text-[10px] font-mono text-navy-500 uppercase tracking-wider mt-6 mb-2">Response</h4>
              <CopyBlock code={`{
  "data": {
    "scenarios": [
      {
        "id": "iran-nuclear-2026",
        "title": "Iran Nuclear Escalation",
        "analysis": {
          "nashEquilibria": [{
            "strategies": { "iran": "Accelerate", "us": "Sanctions" },
            "payoffs": { "iran": -2, "us": -3 },
            "stability": "unstable",
            "marketImpact": { "direction": "bearish", "magnitude": "high", "sectors": ["energy", "defense"] }
          }],
          "escalationLadder": [{
            "level": 1,
            "description": "Enrichment threshold breach",
            "probability": 0.45,
            "marketImpact": { "direction": "bearish", "magnitude": "medium" }
          }]
        },
        "state": {
          "regime": "transitional",
          "triggeredThresholds": ["Enrichment above 60%"],
          "updatedAt": "2026-03-12T..."
        }
      }
    ]
  }
}`} />
            </section>

            <div className="h-px bg-navy-800/50 mb-20" />

            {/* Theses */}
            <section id="theses" className="mb-20 scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <MethodBadge method="GET" />
                <code className="text-[14px] font-mono text-navy-100">/api/v1/theses</code>
                <span className="text-[9px] font-mono text-navy-600 uppercase tracking-wider ml-auto">operator+</span>
              </div>
              <p className="text-[13px] text-navy-400 leading-relaxed font-sans mb-4">
                Intelligence theses synthesising signal convergence, regime state, and market analysis into
                actionable assessments with trading recommendations and risk scenarios.
              </p>
              <div className="text-[10px] font-mono text-navy-500 mb-2 uppercase tracking-wider">Scope: <code className="text-accent-cyan">theses</code></div>

              <ParamTable params={[
                { name: "limit", type: "number", description: "Max results (default 20, max 50)" },
                { name: "offset", type: "number", description: "Pagination offset" },
                { name: "status", type: "string", description: "Filter: active | expired | superseded" },
              ]} />

              <h4 className="text-[10px] font-mono text-navy-500 uppercase tracking-wider mt-6 mb-2">Response</h4>
              <CopyBlock code={`{
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
}`} />
            </section>

            <div className="h-px bg-navy-800/50 mb-20" />

            {/* Market Quote */}
            <section id="market-quote" className="mb-20 scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <MethodBadge method="GET" />
                <code className="text-[14px] font-mono text-navy-100">/api/v1/market/quote</code>
                <span className="text-[9px] font-mono text-navy-600 uppercase tracking-wider ml-auto">analyst+</span>
              </div>
              <p className="text-[13px] text-navy-400 leading-relaxed font-sans mb-4">
                Real-time market quotes via Alpha Vantage. Auto-detects crypto symbols (BTC, ETH, XRP) vs equities.
              </p>
              <div className="text-[10px] font-mono text-navy-500 mb-2 uppercase tracking-wider">Scope: <code className="text-accent-cyan">market</code></div>

              <ParamTable params={[
                { name: "symbol", type: "string", description: "Ticker symbol (e.g. AAPL, BTC, WTI)", required: true },
              ]} />

              <h4 className="text-[10px] font-mono text-navy-500 uppercase tracking-wider mt-6 mb-2">Response</h4>
              <CopyBlock code={`{
  "data": {
    "symbol": "AAPL",
    "price": 178.52,
    "change": -1.23,
    "changePercent": "-0.68%",
    "volume": 54200000
  }
}`} />
            </section>

            <div className="h-px bg-navy-800/50 mb-20" />

            {/* ════ Error Codes ════ */}
            <section id="errors" className="mb-20 scroll-mt-24">
              <h2 className="text-xl font-semibold text-white mb-4 font-sans flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-accent-amber" />
                Error Codes
              </h2>

              <div className="border border-navy-700/30 rounded-lg overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-navy-700/30 bg-navy-900/40">
                      <th className="py-2.5 px-4 text-left text-[9px] font-mono text-navy-500 uppercase tracking-wider">Status</th>
                      <th className="py-2.5 px-4 text-left text-[9px] font-mono text-navy-500 uppercase tracking-wider">Code</th>
                      <th className="py-2.5 px-4 text-left text-[9px] font-mono text-navy-500 uppercase tracking-wider">Description</th>
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
                      <tr key={code} className="border-b border-navy-800/30 last:border-0">
                        <td className="py-2.5 px-4 text-accent-rose">{status}</td>
                        <td className="py-2.5 px-4 text-navy-200">{code}</td>
                        <td className="py-2.5 px-4 text-navy-400 font-sans">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h4 className="text-[10px] font-mono text-navy-500 uppercase tracking-wider mt-6 mb-2">Error Response Format</h4>
              <CopyBlock code={`{\n  "error": "rate_limited",\n  "message": "Rate limit exceeded. Try again in 12 seconds.",\n  "retryAfter": 12\n}`} />
            </section>

            {/* ════ CTA ════ */}
            <section className="text-center py-12 border-t border-navy-700/30">
              <h2 className="text-xl font-semibold text-white mb-3 font-sans">Start building</h2>
              <p className="text-[13px] text-navy-400 mb-6 font-sans">
                Generate your API key and start integrating NEXUS intelligence into your pipeline.
              </p>
              <div className="flex items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="group inline-flex items-center gap-2 px-5 py-2.5 bg-white text-navy-950 text-[12px] font-semibold rounded-lg hover:bg-navy-100 transition-colors font-sans"
                >
                  Create Account
                  <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link
                  href="/settings"
                  className="px-5 py-2.5 border border-navy-600 text-navy-300 text-[12px] font-semibold rounded-lg hover:border-navy-400 transition-colors font-sans"
                >
                  Manage API Keys
                </Link>
              </div>
            </section>

          </div>
        </main>
      </div>
    </div>
  );
}
