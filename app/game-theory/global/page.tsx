"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Loader2,
  Play,
  RotateCcw,
  Shield,
  Swords,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  ChevronRight,
  Globe,
  Zap,
  Wand2,
} from "lucide-react";
import { COUNTRIES, computeTeamPower, computePowerBalance, type PowerProfile } from "@/lib/game-theory/countries";
import { UpgradeGate } from "@/components/subscription/upgrade-gate";
import Link from "next/link";

// ── Dynamic map import (SSR-safe) ──

const GlobalScenarioMap = dynamic(
  () => import("@/components/game-theory/global-scenario-map"),
  { ssr: false, loading: () => <div className="h-full w-full bg-navy-950 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-navy-600" /></div> }
);

// ── Types ──

interface NashEquilibrium {
  strategies: Record<string, string>;
  payoffs: Record<string, number>;
  stability: "stable" | "unstable" | "mixed";
  marketImpact: {
    direction: "bullish" | "bearish" | "mixed";
    magnitude: "low" | "medium" | "high";
    sectors: string[];
  };
}

interface AnalysisResult {
  scenario: {
    title: string;
    actors: { id: string; name: string; shortName: string }[];
    strategies: Record<string, string[]>;
    marketSectors: string[];
  };
  analysis: {
    nashEquilibria: NashEquilibrium[];
    schellingPoints: { strategy: Record<string, string>; reasoning: string; probability: number }[];
    escalationLadder: { level: number; description: string; trigger: string; probability: number; marketImpact: { direction: string; magnitude: string; sectors: string[] } }[];
    dominantStrategies: Record<string, string | null>;
    marketAssessment: {
      mostLikelyOutcome: string;
      direction: "bullish" | "bearish" | "mixed";
      confidence: number;
      keySectors: string[];
    };
  };
  powerBalance: {
    blue: PowerProfile;
    red: PowerProfile;
    blueAdvantages: string[];
    redAdvantages: string[];
    contested: string[];
    overallBalance: number;
  };
  intelligence?: {
    signals: { title: string; intensity: number; category: string; date: string; sectors: string[] }[];
    predictions: { claim: string; confidence: number; category: string; deadline: string; direction: string | null }[];
    systemicRisk: { regime: string; compositeStress: number; absorptionRatio: number; turbulencePercentile: number; interpretation: string } | null;
    calendarContext: unknown;
    signalCount: number;
    predictionCount: number;
    highIntensitySignals: number;
  };
}

// ── Helpers ──

const POWER_LABELS: Record<keyof PowerProfile, string> = {
  military: "MIL",
  nuclear: "NUC",
  economic: "ECON",
  energy: "ENRG",
  tech: "TECH",
  intel: "INTEL",
  cyber: "CYBER",
  proxy: "PROXY",
  diplomatic: "DIPL",
};

const DIR_ICON = {
  bullish: TrendingUp,
  bearish: TrendingDown,
  mixed: Minus,
};

const DIR_COLOR = {
  bullish: "text-accent-emerald",
  bearish: "text-accent-rose",
  mixed: "text-accent-amber",
};

const STABILITY_COLOR = {
  stable: "text-accent-emerald border-accent-emerald/30",
  unstable: "text-accent-rose border-accent-rose/30",
  mixed: "text-accent-amber border-accent-amber/30",
};

// ── Auto-Assign Presets ──

const PRESETS = {
  "nato-vs-csto": {
    label: "NATO vs CSTO",
    desc: "Western alliance vs Russia-led bloc",
    blue: ["US", "CA", "GB", "FR", "DE", "IT", "ES", "PL", "NL", "SE", "NO", "FI", "RO", "GR", "TR"],
    red: ["RU", "BY", "KZ", "UZ", "SY", "IR"],
  },
  "us-china": {
    label: "US-China Rivalry",
    desc: "Pacific theatre + economic blocs",
    blue: ["US", "JP", "KR", "TW", "AU", "NZ", "PH", "GB", "CA"],
    red: ["CN", "RU", "KP", "MM", "PK", "IR"],
  },
  "middle-east": {
    label: "Middle East Axis",
    desc: "Israel-Gulf coalition vs Iran axis",
    blue: ["IL", "SA", "AE", "JO", "EG", "US", "GB"],
    red: ["IR", "SY", "YE", "IQ", "LB", "RU"],
  },
  "global-south": {
    label: "Global Realignment",
    desc: "G7 vs BRICS+",
    blue: ["US", "GB", "FR", "DE", "IT", "JP", "CA", "AU", "KR", "NL", "ES", "PL"],
    red: ["CN", "RU", "IN", "BR", "ZA", "IR", "SA", "EG", "ET", "AE"],
  },
  "taiwan-strait": {
    label: "Taiwan Strait Crisis",
    desc: "US-led defense vs PRC reunification",
    blue: ["US", "TW", "JP", "AU", "KR", "PH", "GB"],
    red: ["CN", "RU", "KP"],
  },
} as const;

// ── Component ──

export default function GlobalScenarioPage() {
  const [teams, setTeams] = useState<Record<string, "blue" | "red">>({});
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"balance" | "matrix" | "nash" | "escalation" | "intel">("balance");

  const blueTeam = useMemo(() => Object.entries(teams).filter(([, t]) => t === "blue").map(([c]) => c), [teams]);
  const redTeam = useMemo(() => Object.entries(teams).filter(([, t]) => t === "red").map(([c]) => c), [teams]);

  // Live power balance (before running analysis)
  const liveBluePower = useMemo(() => computeTeamPower(blueTeam), [blueTeam]);
  const liveRedPower = useMemo(() => computeTeamPower(redTeam), [redTeam]);
  const liveBalance = useMemo(() => computePowerBalance(liveBluePower, liveRedPower), [liveBluePower, liveRedPower]);

  const handleCountryClick = useCallback((code: string) => {
    setTeams(prev => {
      const current = prev[code];
      const next = { ...prev };
      if (!current) next[code] = "blue";
      else if (current === "blue") next[code] = "red";
      else delete next[code];
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setTeams({});
    setAnalysis(null);
  }, []);

  const handleRemove = useCallback((code: string) => {
    setTeams(prev => {
      const next = { ...prev };
      delete next[code];
      return next;
    });
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (blueTeam.length === 0 || redTeam.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/game-theory/global", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blueTeam, redTeam }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data);
        setTab("balance");
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [blueTeam, redTeam]);

  const handlePreset = useCallback((preset: keyof typeof PRESETS) => {
    const p = PRESETS[preset];
    const next: Record<string, "blue" | "red"> = {};
    for (const code of p.blue) next[code] = "blue";
    for (const code of p.red) next[code] = "red";
    setTeams(next);
    setAnalysis(null);
  }, []);

  const getCountryName = (code: string) => COUNTRIES.find(c => c.code === code)?.name || code;

  return (
    <UpgradeGate minTier="analyst" feature="Global Scenario Planner">
      <div className="ml-0 md:ml-48 h-screen flex flex-col bg-navy-950">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-navy-700/20 bg-navy-900/50 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <Globe className="h-4 w-4 text-accent-cyan" />
            <div>
              <h1 className="text-sm font-bold uppercase tracking-widest text-navy-100">
                Global Scenario
              </h1>
              <p className="text-[10px] text-navy-500 mt-0.5">
                Assign nations to teams. Run game theory analysis.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/game-theory"
              className="text-[10px] font-mono uppercase tracking-wider text-navy-500 hover:text-navy-300 transition-colors"
            >
              Scenarios
            </Link>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-navy-400 hover:text-navy-200 border border-navy-700/30 rounded hover:bg-navy-800/40 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
            <button
              onClick={handleAnalyze}
              disabled={blueTeam.length === 0 || redTeam.length === 0 || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 rounded hover:bg-accent-cyan/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              Analyze
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-1 min-h-0">
          {/* Left panel */}
          <div className="w-72 shrink-0 border-r border-navy-700/20 overflow-y-auto">
            {/* Team rosters */}
            <div className="p-3 space-y-4">
              {/* Click instruction */}
              <div className="text-[10px] text-navy-600 font-mono text-center py-1">
                Click country: neutral &rarr; blue &rarr; red &rarr; neutral
              </div>

              {/* Auto-Assign Presets */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Wand2 className="h-3.5 w-3.5 text-accent-amber" />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-navy-400 font-semibold">
                    Quick Assign
                  </span>
                </div>
                <div className="space-y-1">
                  {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map(key => {
                    const p = PRESETS[key];
                    return (
                      <button
                        key={key}
                        onClick={() => handlePreset(key)}
                        className="w-full text-left px-2.5 py-2 rounded border border-navy-700/20 hover:border-navy-600/40 hover:bg-navy-800/30 transition-colors group"
                      >
                        <div className="text-[11px] text-navy-200 group-hover:text-navy-100 font-medium">{p.label}</div>
                        <div className="text-[9px] text-navy-600 mt-0.5">{p.desc}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[8px] font-mono text-accent-cyan/60">{p.blue.length} BLUE</span>
                          <span className="text-[8px] font-mono text-navy-700">vs</span>
                          <span className="text-[8px] font-mono text-accent-rose/60">{p.red.length} RED</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Blue Force */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-3.5 w-3.5 text-accent-cyan" />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-accent-cyan font-semibold">
                    Blue Force
                  </span>
                  <span className="text-[10px] font-mono text-navy-500 ml-auto">{blueTeam.length}</span>
                </div>
                {blueTeam.length === 0 ? (
                  <p className="text-[10px] text-navy-600 pl-5">No nations assigned</p>
                ) : (
                  <div className="space-y-0.5">
                    {blueTeam.map(code => (
                      <div key={code} className="flex items-center justify-between pl-5 pr-1 py-1 rounded hover:bg-navy-800/30 group">
                        <span className="text-[11px] text-navy-200">{getCountryName(code)}</span>
                        <button
                          onClick={() => handleRemove(code)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-navy-600 hover:text-navy-400 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Red Force */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Swords className="h-3.5 w-3.5 text-accent-rose" />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-accent-rose font-semibold">
                    Red Force
                  </span>
                  <span className="text-[10px] font-mono text-navy-500 ml-auto">{redTeam.length}</span>
                </div>
                {redTeam.length === 0 ? (
                  <p className="text-[10px] text-navy-600 pl-5">No nations assigned</p>
                ) : (
                  <div className="space-y-0.5">
                    {redTeam.map(code => (
                      <div key={code} className="flex items-center justify-between pl-5 pr-1 py-1 rounded hover:bg-navy-800/30 group">
                        <span className="text-[11px] text-navy-200">{getCountryName(code)}</span>
                        <button
                          onClick={() => handleRemove(code)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-navy-600 hover:text-navy-400 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Live power balance */}
              {(blueTeam.length > 0 || redTeam.length > 0) && (
                <div className="border-t border-navy-700/20 pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-3.5 w-3.5 text-accent-amber" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-navy-400 font-semibold">
                      Power Balance
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {(Object.keys(POWER_LABELS) as (keyof PowerProfile)[]).map(dim => {
                      const bv = liveBluePower[dim];
                      const rv = liveRedPower[dim];
                      const total = bv + rv || 1;
                      const bluePct = (bv / total) * 100;
                      return (
                        <div key={dim}>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[9px] font-mono text-navy-500 w-10">{POWER_LABELS[dim]}</span>
                            <div className="flex gap-2 text-[9px] font-mono">
                              <span className="text-accent-cyan w-6 text-right">{bv}</span>
                              <span className="text-navy-600">/</span>
                              <span className="text-accent-rose w-6">{rv}</span>
                            </div>
                          </div>
                          <div className="h-1 bg-navy-800 rounded-full overflow-hidden flex">
                            <div
                              className="h-full bg-accent-cyan/60 transition-all duration-300"
                              style={{ width: `${bluePct}%` }}
                            />
                            <div
                              className="h-full bg-accent-rose/60 transition-all duration-300"
                              style={{ width: `${100 - bluePct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Overall balance indicator */}
                  <div className="mt-3 text-center">
                    <div className="text-[10px] font-mono text-navy-500 mb-1">OVERALL</div>
                    <div className="h-2 bg-navy-800 rounded-full overflow-hidden flex mx-4">
                      <div
                        className="h-full bg-accent-cyan/50 transition-all duration-300"
                        style={{ width: `${50 + liveBalance.overallBalance * 50}%` }}
                      />
                      <div
                        className="h-full bg-accent-rose/50 transition-all duration-300"
                        style={{ width: `${50 - liveBalance.overallBalance * 50}%` }}
                      />
                    </div>
                    <div className="text-[9px] font-mono mt-1 text-navy-500">
                      {liveBalance.overallBalance > 0.1
                        ? "Blue advantage"
                        : liveBalance.overallBalance < -0.1
                        ? "Red advantage"
                        : "Contested"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Map + Analysis */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Map */}
            <div className="flex-1 min-h-0 relative">
              <GlobalScenarioMap
                countries={COUNTRIES}
                teams={teams}
                onCountryClick={handleCountryClick}
              />

              {/* Legend */}
              <div className="absolute bottom-3 left-3 z-[400] bg-navy-900/90 backdrop-blur-sm border border-navy-700/30 rounded px-3 py-2 pointer-events-none">
                <div className="flex items-center gap-4 text-[9px] font-mono">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-2 rounded-[2px] bg-accent-cyan/50 border border-accent-cyan/60" />
                    <span className="text-navy-400">Blue Force</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-2 rounded-[2px] bg-accent-rose/50 border border-accent-rose/60" />
                    <span className="text-navy-400">Red Force</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-2 rounded-[2px] bg-navy-700/40 border border-navy-600/40" />
                    <span className="text-navy-500">Unaligned</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Analysis panel (appears after running) */}
            {analysis && (
              <div className="shrink-0 border-t border-navy-700/20 bg-navy-900/80 backdrop-blur-sm max-h-[45vh] overflow-y-auto">
                {/* Assessment header */}
                <div className="px-4 py-3 border-b border-navy-700/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-navy-400">
                      Assessment
                    </span>
                    {(() => {
                      const dir = analysis.analysis.marketAssessment.direction;
                      const Icon = DIR_ICON[dir];
                      return (
                        <span className={`flex items-center gap-1 text-[10px] font-mono font-semibold ${DIR_COLOR[dir]}`}>
                          <Icon className="h-3 w-3" />
                          {dir.toUpperCase()}
                        </span>
                      );
                    })()}
                    <span className="text-[10px] font-mono text-navy-500">
                      {Math.round(analysis.analysis.marketAssessment.confidence * 100)}% conf
                    </span>
                  </div>

                  {/* Tabs */}
                  <div className="flex items-center gap-1">
                    {(["balance", "matrix", "nash", "escalation", "intel"] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-2 py-1 text-[9px] font-mono uppercase tracking-wider rounded transition-colors ${
                          tab === t
                            ? "bg-accent-cyan/10 text-accent-cyan"
                            : "text-navy-500 hover:text-navy-300"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4">
                  {/* Outcome summary */}
                  <div className="mb-4 text-[11px] text-navy-300 leading-relaxed">
                    {analysis.analysis.marketAssessment.mostLikelyOutcome}
                  </div>

                  {/* Sectors */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {analysis.analysis.marketAssessment.keySectors.map(s => (
                      <span key={s} className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-navy-700/30 text-navy-400">
                        {s}
                      </span>
                    ))}
                  </div>

                  {/* Tab content */}
                  {tab === "balance" && <BalanceTab balance={analysis.powerBalance} />}
                  {tab === "matrix" && <MatrixTab analysis={analysis} />}
                  {tab === "nash" && <NashTab equilibria={analysis.analysis.nashEquilibria} />}
                  {tab === "escalation" && <EscalationTab ladder={analysis.analysis.escalationLadder} />}
                  {tab === "intel" && analysis.intelligence && <IntelTab intelligence={analysis.intelligence} />}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </UpgradeGate>
  );
}

// ── Balance Tab ──

function BalanceTab({ balance }: { balance: AnalysisResult["powerBalance"] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-accent-cyan mb-2">Blue Advantages</div>
        {balance.blueAdvantages.length === 0 ? (
          <p className="text-[10px] text-navy-600">None</p>
        ) : (
          <div className="space-y-1">
            {balance.blueAdvantages.map(d => (
              <div key={d} className="flex items-center gap-2 text-[11px]">
                <ChevronRight className="h-3 w-3 text-accent-cyan/60" />
                <span className="text-navy-200 font-mono">{POWER_LABELS[d as keyof PowerProfile]}</span>
                <span className="text-navy-500 text-[9px]">{balance.blue[d as keyof PowerProfile]} vs {balance.red[d as keyof PowerProfile]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-accent-rose mb-2">Red Advantages</div>
        {balance.redAdvantages.length === 0 ? (
          <p className="text-[10px] text-navy-600">None</p>
        ) : (
          <div className="space-y-1">
            {balance.redAdvantages.map(d => (
              <div key={d} className="flex items-center gap-2 text-[11px]">
                <ChevronRight className="h-3 w-3 text-accent-rose/60" />
                <span className="text-navy-200 font-mono">{POWER_LABELS[d as keyof PowerProfile]}</span>
                <span className="text-navy-500 text-[9px]">{balance.red[d as keyof PowerProfile]} vs {balance.blue[d as keyof PowerProfile]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-accent-amber mb-2">Contested</div>
        {balance.contested.length === 0 ? (
          <p className="text-[10px] text-navy-600">None</p>
        ) : (
          <div className="space-y-1">
            {balance.contested.map(d => (
              <div key={d} className="flex items-center gap-2 text-[11px]">
                <Minus className="h-3 w-3 text-accent-amber/40" />
                <span className="text-navy-300 font-mono">{POWER_LABELS[d as keyof PowerProfile]}</span>
                <span className="text-navy-500 text-[9px]">{balance.blue[d as keyof PowerProfile]} vs {balance.red[d as keyof PowerProfile]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Matrix Tab ──

function MatrixTab({ analysis }: { analysis: AnalysisResult }) {
  const blueStrats = analysis.scenario.strategies.blue;
  const redStrats = analysis.scenario.strategies.red;
  const nashSet = new Set(
    analysis.analysis.nashEquilibria.map(n => `${n.strategies.blue}|${n.strategies.red}`)
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[10px] font-mono">
        <thead>
          <tr>
            <th className="text-left text-navy-500 p-1.5 font-normal">Blue / Red</th>
            {redStrats.map(rs => (
              <th key={rs} className="text-center text-accent-rose/70 p-1.5 font-normal whitespace-nowrap">{rs}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {blueStrats.map(bs => (
            <tr key={bs}>
              <td className="text-accent-cyan/70 p-1.5 whitespace-nowrap">{bs}</td>
              {redStrats.map(rs => {
                const entry = analysis.analysis.nashEquilibria.find(
                  n => n.strategies.blue === bs && n.strategies.red === rs
                );
                // Find from escalation ladder or payoff data
                const isNash = nashSet.has(`${bs}|${rs}`);
                const payoff = findPayoff(analysis, bs, rs);

                return (
                  <td
                    key={rs}
                    className={`text-center p-1.5 border border-navy-700/10 ${
                      isNash ? "bg-accent-cyan/5" : ""
                    }`}
                  >
                    {payoff ? (
                      <div>
                        <span className="text-accent-cyan">{payoff.blue > 0 ? "+" : ""}{payoff.blue}</span>
                        <span className="text-navy-600 mx-1">/</span>
                        <span className="text-accent-rose">{payoff.red > 0 ? "+" : ""}{payoff.red}</span>
                        {isNash && (
                          <div className="text-[8px] text-accent-cyan mt-0.5">NASH</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-navy-700">--</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function findPayoff(analysis: AnalysisResult, blue: string, red: string): { blue: number; red: number } | null {
  // Check Nash equilibria first
  const nash = analysis.analysis.nashEquilibria.find(
    n => n.strategies.blue === blue && n.strategies.red === red
  );
  if (nash) return { blue: nash.payoffs.blue, red: nash.payoffs.red };

  // Check escalation ladder
  const step = analysis.analysis.escalationLadder.find(
    s => s.description.includes(blue) && s.description.includes(red)
  );
  if (step) {
    // Derive approximate payoffs from probability
    const v = Math.round((0.5 - step.probability) * 10);
    return { blue: v, red: -v };
  }

  return null;
}

// ── Nash Tab ──

function NashTab({ equilibria }: { equilibria: NashEquilibrium[] }) {
  if (equilibria.length === 0) {
    return <p className="text-[11px] text-navy-500">No Nash equilibria found. High strategic uncertainty.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {equilibria.map((eq, i) => {
        const Icon = DIR_ICON[eq.marketImpact.direction];
        return (
          <div key={i} className="border border-navy-700/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-navy-400">
                Equilibrium {i + 1}
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-mono border px-1.5 py-0.5 rounded ${STABILITY_COLOR[eq.stability]}`}>
                  {eq.stability}
                </span>
                <span className={`flex items-center gap-1 text-[9px] font-mono ${DIR_COLOR[eq.marketImpact.direction]}`}>
                  <Icon className="h-3 w-3" />
                  {eq.marketImpact.magnitude}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-[9px] text-accent-cyan/60 font-mono">BLUE</span>
                <div className="text-navy-200">{eq.strategies.blue}</div>
                <div className="text-accent-cyan font-mono text-[10px]">{eq.payoffs.blue > 0 ? "+" : ""}{eq.payoffs.blue}</div>
              </div>
              <div>
                <span className="text-[9px] text-accent-rose/60 font-mono">RED</span>
                <div className="text-navy-200">{eq.strategies.red}</div>
                <div className="text-accent-rose font-mono text-[10px]">{eq.payoffs.red > 0 ? "+" : ""}{eq.payoffs.red}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Escalation Tab ──

function EscalationTab({ ladder }: { ladder: AnalysisResult["analysis"]["escalationLadder"] }) {
  const LEVEL_COLORS = ["", "text-signal-1", "text-signal-2", "text-signal-3", "text-signal-4", "text-signal-5"];
  const LEVEL_BG = ["", "bg-signal-1/15", "bg-signal-2/15", "bg-signal-3/15", "bg-signal-4/15", "bg-signal-5/15"];

  // Deduplicate by level, take highest probability per level
  const byLevel = new Map<number, typeof ladder[number]>();
  for (const step of ladder) {
    const existing = byLevel.get(step.level);
    if (!existing || step.probability > existing.probability) {
      byLevel.set(step.level, step);
    }
  }
  const steps = Array.from(byLevel.values()).sort((a, b) => a.level - b.level);

  return (
    <div className="space-y-2">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-mono font-bold ${LEVEL_BG[step.level]} ${LEVEL_COLORS[step.level]}`}>
            {step.level}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-navy-200 mb-0.5 truncate">{step.description}</div>
            <div className="text-[10px] text-navy-500 mb-1">{step.trigger}</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 bg-navy-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${LEVEL_BG[step.level].replace("/15", "/50")}`}
                  style={{ width: `${step.probability * 100}%` }}
                />
              </div>
              <span className="text-[9px] font-mono text-navy-500 w-8 text-right">
                {Math.round(step.probability * 100)}%
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Intel Tab ──

const INTENSITY_COLORS = ["", "text-signal-1", "text-signal-2", "text-signal-3", "text-signal-4", "text-signal-5"];
const REGIME_COLORS: Record<string, string> = {
  stable: "text-accent-emerald",
  elevated: "text-accent-amber",
  fragile: "text-signal-4",
  critical: "text-signal-5",
};

function IntelTab({ intelligence }: { intelligence: NonNullable<AnalysisResult["intelligence"]> }) {
  const hasSignals = intelligence.signals.length > 0;
  const hasPredictions = intelligence.predictions.length > 0;
  const hasRisk = !!intelligence.systemicRisk;

  if (!hasSignals && !hasPredictions && !hasRisk) {
    return (
      <p className="text-[11px] text-navy-500">
        No live intelligence data available for the selected countries. Signals and predictions will appear here as the system processes data relevant to this scenario.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {/* Systemic Risk State */}
      {hasRisk && intelligence.systemicRisk && (
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-400 mb-2">Market Regime</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="border border-navy-700/30 rounded p-2.5">
              <div className="text-[9px] font-mono text-navy-600 mb-1">REGIME</div>
              <div className={`text-[13px] font-mono font-bold uppercase ${REGIME_COLORS[intelligence.systemicRisk.regime] || "text-navy-300"}`}>
                {intelligence.systemicRisk.regime}
              </div>
            </div>
            <div className="border border-navy-700/30 rounded p-2.5">
              <div className="text-[9px] font-mono text-navy-600 mb-1">STRESS</div>
              <div className={`text-[13px] font-mono font-bold tabular-nums ${intelligence.systemicRisk.compositeStress > 50 ? "text-signal-5" : intelligence.systemicRisk.compositeStress > 30 ? "text-accent-amber" : "text-accent-emerald"}`}>
                {intelligence.systemicRisk.compositeStress.toFixed(0)}/100
              </div>
            </div>
            <div className="border border-navy-700/30 rounded p-2.5">
              <div className="text-[9px] font-mono text-navy-600 mb-1">ABSORPTION</div>
              <div className="text-[13px] font-mono font-bold tabular-nums text-navy-200">
                {intelligence.systemicRisk.absorptionRatio.toFixed(2)}
              </div>
            </div>
            <div className="border border-navy-700/30 rounded p-2.5">
              <div className="text-[9px] font-mono text-navy-600 mb-1">TURBULENCE</div>
              <div className="text-[13px] font-mono font-bold tabular-nums text-navy-200">
                P{intelligence.systemicRisk.turbulencePercentile.toFixed(0)}
              </div>
            </div>
          </div>
          <p className="text-[10px] text-navy-500 mt-2 leading-relaxed">
            {intelligence.systemicRisk.interpretation}
          </p>
        </div>
      )}

      {/* Active Signals */}
      {hasSignals && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-navy-400">
              Relevant Signals
            </div>
            <div className="text-[9px] font-mono text-navy-600">
              {intelligence.highIntensitySignals} high-intensity / {intelligence.signalCount} total
            </div>
          </div>
          <div className="space-y-1">
            {intelligence.signals.map((sig, i) => (
              <div key={i} className="flex items-start gap-2 py-1.5 border-b border-navy-800/30 last:border-0">
                <span className={`text-[10px] font-mono font-bold w-4 text-center shrink-0 mt-px ${INTENSITY_COLORS[sig.intensity]}`}>
                  {sig.intensity}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-navy-200 leading-snug truncate">{sig.title}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] font-mono text-navy-600">{sig.date}</span>
                    <span className="text-[9px] font-mono text-navy-600">{sig.category}</span>
                    {sig.sectors.length > 0 && (
                      <span className="text-[9px] font-mono text-navy-700">{sig.sectors.slice(0, 2).join(", ")}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Predictions */}
      {hasPredictions && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-navy-400">
              Active Predictions
            </div>
            <div className="text-[9px] font-mono text-navy-600">
              {intelligence.predictionCount} relevant
            </div>
          </div>
          <div className="space-y-1">
            {intelligence.predictions.map((pred, i) => (
              <div key={i} className="flex items-start gap-2 py-1.5 border-b border-navy-800/30 last:border-0">
                <span className={`text-[10px] font-mono font-bold w-8 text-right shrink-0 mt-px tabular-nums ${
                  pred.confidence >= 0.7 ? "text-accent-emerald" : pred.confidence >= 0.5 ? "text-accent-cyan" : "text-navy-400"
                }`}>
                  {Math.round(pred.confidence * 100)}%
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-navy-200 leading-snug">{pred.claim}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {pred.direction && (
                      <span className={`text-[9px] font-mono font-medium ${
                        pred.direction === "up" ? "text-accent-emerald" : pred.direction === "down" ? "text-accent-rose" : "text-accent-amber"
                      }`}>
                        {pred.direction.toUpperCase()}
                      </span>
                    )}
                    <span className="text-[9px] font-mono text-navy-600">by {pred.deadline}</span>
                    <span className="text-[9px] font-mono text-navy-600">{pred.category}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
