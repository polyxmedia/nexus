"use client";

export const dynamic = "force-dynamic";

import { useState, useRef, useEffect } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { UpgradeGate } from "@/components/subscription/upgrade-gate";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Play, Sparkles, Search, TrendingUp, ChevronDown } from "lucide-react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const POPULAR_SYMBOLS = [
  { symbol: "SPY", name: "S&P 500 ETF" },
  { symbol: "QQQ", name: "Nasdaq 100 ETF" },
  { symbol: "IWM", name: "Russell 2000 ETF" },
  { symbol: "DIA", name: "Dow Jones ETF" },
  { symbol: "AAPL", name: "Apple" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "NVDA", name: "Nvidia" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "META", name: "Meta Platforms" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "AMD", name: "AMD" },
  { symbol: "JPM", name: "JPMorgan" },
  { symbol: "GS", name: "Goldman Sachs" },
  { symbol: "XOM", name: "Exxon Mobil" },
  { symbol: "CVX", name: "Chevron" },
  { symbol: "GLD", name: "Gold ETF" },
  { symbol: "SLV", name: "Silver ETF" },
  { symbol: "TLT", name: "20+ Year Treasury ETF" },
  { symbol: "USO", name: "Oil ETF" },
  { symbol: "UNG", name: "Natural Gas ETF" },
  { symbol: "EEM", name: "Emerging Markets ETF" },
  { symbol: "HYG", name: "High Yield Bond ETF" },
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "XRP", name: "Ripple" },
  { symbol: "SOL", name: "Solana" },
];

interface ScenarioInput {
  name: string;
  probability: number;
  params: {
    dailyMeanReturn: number;
    dailyVolatility: number;
    fatTailSkew: number;
    jumpProbability: number;
    jumpMagnitude: number;
  };
}

interface ScenarioResult {
  name: string;
  probability: number;
  samplePaths: number[][];
  percentiles: { p5: number; p25: number; p50: number; p75: number; p95: number };
  expectedReturn: number;
  maxDrawdown: number;
  probabilityOfProfit: number;
  finalPriceStats: { mean: number; median: number; min: number; max: number };
}

interface SimResult {
  scenarios: ScenarioResult[];
  blended: {
    percentiles: { p5: number; p25: number; p50: number; p75: number; p95: number };
    expectedReturn: number;
    probabilityOfProfit: number;
    expectedValue: number;
  };
  config: { currentPrice: number; days: number; leverage: number };
}

interface PresetInfo {
  id: string;
  name: string;
  description: string;
  scenarios: { name: string; probability: number }[];
}

const SCENARIO_COLORS = ["#06b6d4", "#f59e0b", "#f43f5e", "#10b981", "#8b5cf6"];

export default function SimulationPage() {
  const [symbol, setSymbol] = useState("USO");
  const [symbolQuery, setSymbolQuery] = useState("USO");
  const [showSymbolDropdown, setShowSymbolDropdown] = useState(false);
  const [price, setPrice] = useState("90");
  const [days, setDays] = useState(30);
  const [leverage, setLeverage] = useState(1);
  const [numPaths, setNumPaths] = useState(5000);
  const [presets, setPresets] = useState<PresetInfo[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>("oil-crisis");
  const [customScenarios, setCustomScenarios] = useState<ScenarioInput[]>([]);
  const [useCustom, setUseCustom] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeScenario, setActiveScenario] = useState<number | null>(null);
  const [presetsLoaded, setPresetsLoaded] = useState(false);
  const symbolDropdownRef = useRef<HTMLDivElement>(null);

  const filteredSymbols = POPULAR_SYMBOLS.filter(
    (s) =>
      s.symbol.toLowerCase().includes(symbolQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(symbolQuery.toLowerCase())
  ).slice(0, 8);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (symbolDropdownRef.current && !symbolDropdownRef.current.contains(e.target as Node)) {
        setShowSymbolDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadPresets = async () => {
    if (presetsLoaded) return;
    const res = await fetch("/api/simulation");
    const data = await res.json();
    setPresets(data.presets || []);
    setPresetsLoaded(true);
  };

  const runSimulation = async () => {
    setLoading(true);
    loadPresets();
    try {
      const body: Record<string, unknown> = {
        currentPrice: parseFloat(price),
        daysToSimulate: days,
        numPaths,
        leverageMultiplier: leverage,
      };
      if (useCustom && customScenarios.length > 0) {
        body.scenarios = customScenarios;
      } else {
        body.presetId = selectedPreset;
      }
      const res = await fetch("/api/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) {
        console.error(data.error);
      } else {
        setResult(data);
      }
    } catch {
      // silent
    }
    setLoading(false);
  };

  // Build fan chart data from blended percentiles
  const buildFanData = () => {
    if (!result) return [];
    // Use the first scenario's sample paths to build day-by-day percentiles
    const dayCount = result.config.days + 1;
    const data: Array<Record<string, number>> = [];

    for (let d = 0; d < dayCount; d++) {
      const allPrices: number[] = [];
      for (const sc of result.scenarios) {
        for (const path of sc.samplePaths) {
          if (path[d] != null) allPrices.push(path[d]);
        }
      }
      allPrices.sort((a, b) => a - b);
      const pct = (p: number) => {
        const idx = Math.floor((p / 100) * (allPrices.length - 1));
        return allPrices[idx] || result.config.currentPrice;
      };
      data.push({ day: d, p5: pct(5), p25: pct(25), p50: pct(50), p75: pct(75), p95: pct(95) });
    }
    return data;
  };

  // Build spaghetti paths for active scenario
  const buildPathData = () => {
    if (!result || activeScenario === null) return [];
    const sc = result.scenarios[activeScenario];
    if (!sc) return [];
    const paths = sc.samplePaths.slice(0, 50);
    const dayCount = result.config.days + 1;
    const data: Array<Record<string, number>> = [];
    for (let d = 0; d < dayCount; d++) {
      const row: Record<string, number> = { day: d };
      paths.forEach((path, i) => {
        row[`p${i}`] = path[d];
      });
      data.push(row);
    }
    return data;
  };

  if (!presetsLoaded) loadPresets();

  return (
    <PageContainer title="Monte Carlo Simulation" subtitle="Scenario-weighted probability analysis">
      <UpgradeGate minTier="operator" feature="Monte Carlo simulation" blur>
      <div className="grid grid-cols-12 gap-4">
        {/* Config Panel */}
        <div className="col-span-3 space-y-4">
          <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4 space-y-3 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-cyan/30 to-transparent" />
            <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Configuration</div>

            <div ref={symbolDropdownRef} className="relative">
              <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">Symbol</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-navy-600" />
                <input
                  value={symbolQuery}
                  onChange={(e) => {
                    setSymbolQuery(e.target.value.toUpperCase());
                    setShowSymbolDropdown(true);
                  }}
                  onFocus={() => setShowSymbolDropdown(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setSymbol(symbolQuery);
                      setShowSymbolDropdown(false);
                    }
                  }}
                  placeholder="Search symbol..."
                  className="w-full h-8 pl-8 pr-3 rounded bg-navy-800/60 border border-navy-700/50 text-[11px] font-mono text-navy-200 placeholder:text-navy-600 focus:outline-none focus:border-accent-cyan/40 focus:ring-1 focus:ring-accent-cyan/20 transition-colors"
                />
              </div>
              {showSymbolDropdown && filteredSymbols.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-navy-900 border border-navy-700/50 rounded-lg overflow-hidden shadow-xl shadow-black/40">
                  {filteredSymbols.map((s) => (
                    <button
                      key={s.symbol}
                      onClick={() => {
                        setSymbol(s.symbol);
                        setSymbolQuery(s.symbol);
                        setShowSymbolDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${
                        s.symbol === symbol
                          ? "bg-accent-cyan/10 text-accent-cyan"
                          : "text-navy-300 hover:bg-navy-800/60 hover:text-navy-100"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-3 w-3 text-navy-600" />
                        <span className="text-[11px] font-mono font-medium">{s.symbol}</span>
                      </div>
                      <span className="text-[9px] text-navy-500">{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">Current Price</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full h-8 px-3 rounded bg-navy-800/60 border border-navy-700/50 text-[11px] font-mono text-navy-200 placeholder:text-navy-600 focus:outline-none focus:border-accent-cyan/40 focus:ring-1 focus:ring-accent-cyan/20 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-navy-500 uppercase tracking-wider">Days</label>
                <span className="text-[10px] font-mono text-accent-cyan">{days}d</span>
              </div>
              <input
                type="range" min={7} max={180} value={days}
                onChange={(e) => setDays(parseInt(e.target.value))}
                className="w-full accent-accent-cyan h-1"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-navy-500 uppercase tracking-wider">Leverage</label>
                <span className="text-[10px] font-mono text-accent-cyan">{leverage}x</span>
              </div>
              <input
                type="range" min={1} max={5} value={leverage}
                onChange={(e) => setLeverage(parseInt(e.target.value))}
                className="w-full accent-accent-cyan h-1"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-navy-500 uppercase tracking-wider">Paths</label>
                <span className="text-[10px] font-mono text-accent-cyan">{numPaths.toLocaleString()}</span>
              </div>
              <input
                type="range" min={1000} max={20000} step={1000} value={numPaths}
                onChange={(e) => setNumPaths(parseInt(e.target.value))}
                className="w-full accent-accent-cyan h-1"
              />
            </div>
          </div>

          {/* Preset Selection */}
          <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4 space-y-2 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-amber/30 to-transparent" />
            <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Scenario Set</div>
            {presets.map((p) => (
              <button
                key={p.id}
                onClick={() => { setSelectedPreset(p.id); setUseCustom(false); }}
                className={`w-full text-left px-3 py-2 rounded text-[11px] transition-colors ${
                  selectedPreset === p.id && !useCustom
                    ? "bg-navy-700/60 text-navy-100"
                    : "text-navy-400 hover:bg-navy-800/50 hover:text-navy-200"
                }`}
              >
                <div className="font-medium">{p.name}</div>
                <div className="text-[9px] text-navy-500 mt-0.5">{p.description}</div>
              </button>
            ))}
          </div>

          <button
            onClick={runSimulation}
            disabled={loading}
            className="w-full h-9 flex items-center justify-center gap-2 rounded bg-navy-100 text-navy-950 text-[11px] font-mono uppercase tracking-wider font-medium hover:bg-white transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            {loading ? "Simulating..." : "Run Simulation"}
          </button>
        </div>

        {/* Results */}
        <div className="col-span-9 space-y-4">
          {loading && !result && (
            <div className="space-y-4">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}

          {result && (
            <>
              {/* Blended Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {[
                  { label: "Expected Return", value: `${(result.blended.expectedReturn * 100).toFixed(1)}%`, color: result.blended.expectedReturn >= 0 ? "text-accent-emerald" : "text-accent-rose" },
                  { label: "Prob of Profit", value: `${(result.blended.probabilityOfProfit * 100).toFixed(0)}%`, color: result.blended.probabilityOfProfit >= 0.5 ? "text-accent-emerald" : "text-accent-rose" },
                  { label: "Expected Value", value: `$${result.blended.expectedValue.toFixed(2)}`, color: "text-navy-100" },
                  { label: "5th Percentile", value: `$${result.blended.percentiles.p5.toFixed(2)}`, color: "text-accent-rose" },
                  { label: "95th Percentile", value: `$${result.blended.percentiles.p95.toFixed(2)}`, color: "text-accent-emerald" },
                ].map((stat) => (
                  <div key={stat.label} className="border border-navy-700/40 rounded-lg bg-navy-900/30 px-3 py-2.5">
                    <div className="text-[9px] font-mono uppercase tracking-wider text-navy-500">{stat.label}</div>
                    <div className={`text-lg font-mono font-bold tabular-nums ${stat.color}`}>{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* Fan Chart */}
              <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
                <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">
                  Probability Fan (Blended {result.config.days}d, {result.config.leverage}x leverage)
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={buildFanData()} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 9, fill: "#5c5c5c" }} stroke="#1a1a1a" />
                      <YAxis tick={{ fontSize: 9, fill: "#5c5c5c" }} stroke="#1a1a1a" tickFormatter={(v: number) => `$${v.toFixed(0)}`} domain={["auto", "auto"]} />
                      <Tooltip
                        contentStyle={{ background: "rgba(10,10,10,0.95)", border: "1px solid #1f1f1f", borderRadius: "4px", fontSize: "10px", fontFamily: "IBM Plex Mono" }}
                        formatter={(v: number) => [`$${v.toFixed(2)}`, ""]}
                      />
                      <ReferenceLine y={result.config.currentPrice} stroke="#555" strokeDasharray="4 4" />
                      <Area type="monotone" dataKey="p95" stackId="fan" stroke="none" fill="#06b6d4" fillOpacity={0.08} />
                      <Area type="monotone" dataKey="p75" stackId="fan2" stroke="none" fill="#06b6d4" fillOpacity={0.12} />
                      <Area type="monotone" dataKey="p50" stackId="fan3" stroke="#06b6d4" strokeWidth={1.5} fill="#06b6d4" fillOpacity={0.15} />
                      <Area type="monotone" dataKey="p25" stackId="fan4" stroke="none" fill="#06b6d4" fillOpacity={0.08} />
                      <Area type="monotone" dataKey="p5" stackId="fan5" stroke="none" fill="#06b6d4" fillOpacity={0.04} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Scenario Comparison */}
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">Scenario Breakdown</div>
                  <div className="space-y-2">
                    {result.scenarios.map((sc, i) => (
                      <button
                        key={sc.name}
                        onClick={() => setActiveScenario(activeScenario === i ? null : i)}
                        className={`w-full text-left px-3 py-2.5 rounded transition-colors ${
                          activeScenario === i ? "bg-navy-700/50" : "hover:bg-navy-800/40"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: SCENARIO_COLORS[i % SCENARIO_COLORS.length] }} />
                            <span className="text-[11px] font-medium text-navy-200">{sc.name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-navy-500">{(sc.probability * 100).toFixed(0)}%</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-1.5">
                          <div>
                            <span className="text-[8px] text-navy-600 block">E[Return]</span>
                            <span className={`text-[10px] font-mono ${sc.expectedReturn >= 0 ? "text-accent-emerald" : "text-accent-rose"}`}>
                              {(sc.expectedReturn * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-[8px] text-navy-600 block">P(Profit)</span>
                            <span className="text-[10px] font-mono text-navy-300">{(sc.probabilityOfProfit * 100).toFixed(0)}%</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-navy-600 block">Max DD</span>
                            <span className="text-[10px] font-mono text-accent-rose">{(sc.maxDrawdown * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sample Paths */}
                <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">
                    {activeScenario !== null ? `Sample Paths: ${result.scenarios[activeScenario].name}` : "Select a scenario to view paths"}
                  </div>
                  {activeScenario !== null ? (
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={buildPathData()} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                          <XAxis dataKey="day" tick={{ fontSize: 8, fill: "#5c5c5c" }} stroke="#1a1a1a" />
                          <YAxis tick={{ fontSize: 8, fill: "#5c5c5c" }} stroke="#1a1a1a" domain={["auto", "auto"]} />
                          <ReferenceLine y={result.config.currentPrice} stroke="#555" strokeDasharray="4 4" />
                          {Array.from({ length: 50 }, (_, i) => (
                            <Line
                              key={i}
                              type="monotone"
                              dataKey={`p${i}`}
                              stroke={SCENARIO_COLORS[activeScenario % SCENARIO_COLORS.length]}
                              strokeWidth={0.5}
                              strokeOpacity={0.3}
                              dot={false}
                              activeDot={false}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center">
                      <Sparkles className="h-6 w-6 text-navy-700" />
                    </div>
                  )}
                </div>
              </div>

              {/* Percentile Table */}
              <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4 overflow-x-auto">
                <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">Percentile Comparison</div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-navy-700/30">
                      <th className="px-3 py-2 text-[9px] font-mono uppercase tracking-widest text-navy-500">Scenario</th>
                      <th className="px-3 py-2 text-[9px] font-mono uppercase tracking-widest text-navy-500 text-right">5th</th>
                      <th className="px-3 py-2 text-[9px] font-mono uppercase tracking-widest text-navy-500 text-right">25th</th>
                      <th className="px-3 py-2 text-[9px] font-mono uppercase tracking-widest text-navy-500 text-right">Median</th>
                      <th className="px-3 py-2 text-[9px] font-mono uppercase tracking-widest text-navy-500 text-right">75th</th>
                      <th className="px-3 py-2 text-[9px] font-mono uppercase tracking-widest text-navy-500 text-right">95th</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.scenarios.map((sc, i) => (
                      <tr key={sc.name} className="border-b border-navy-700/20 hover:bg-navy-800/20">
                        <td className="px-3 py-2 text-[11px] text-navy-200 flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: SCENARIO_COLORS[i % SCENARIO_COLORS.length] }} />
                          {sc.name}
                        </td>
                        <td className="px-3 py-2 text-[10px] font-mono text-accent-rose text-right">${sc.percentiles.p5.toFixed(2)}</td>
                        <td className="px-3 py-2 text-[10px] font-mono text-navy-400 text-right">${sc.percentiles.p25.toFixed(2)}</td>
                        <td className="px-3 py-2 text-[10px] font-mono text-navy-100 text-right">${sc.percentiles.p50.toFixed(2)}</td>
                        <td className="px-3 py-2 text-[10px] font-mono text-navy-400 text-right">${sc.percentiles.p75.toFixed(2)}</td>
                        <td className="px-3 py-2 text-[10px] font-mono text-accent-emerald text-right">${sc.percentiles.p95.toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="bg-navy-800/20">
                      <td className="px-3 py-2 text-[11px] text-navy-100 font-medium">Blended</td>
                      <td className="px-3 py-2 text-[10px] font-mono text-accent-rose text-right font-bold">${result.blended.percentiles.p5.toFixed(2)}</td>
                      <td className="px-3 py-2 text-[10px] font-mono text-navy-300 text-right">${result.blended.percentiles.p25.toFixed(2)}</td>
                      <td className="px-3 py-2 text-[10px] font-mono text-navy-100 text-right font-bold">${result.blended.percentiles.p50.toFixed(2)}</td>
                      <td className="px-3 py-2 text-[10px] font-mono text-navy-300 text-right">${result.blended.percentiles.p75.toFixed(2)}</td>
                      <td className="px-3 py-2 text-[10px] font-mono text-accent-emerald text-right font-bold">${result.blended.percentiles.p95.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}

          {!result && !loading && (
            <div className="border border-navy-700/30 border-dashed rounded-lg p-16 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-accent-cyan/[0.02] via-transparent to-accent-amber/[0.02]" />
              <div className="relative">
                <Sparkles className="h-6 w-6 text-navy-600 mx-auto mb-4" />
                <p className="text-sm text-navy-300 mb-1.5 font-medium">Conditional Monte Carlo Simulation</p>
                <p className="text-[10px] text-navy-500 max-w-sm mx-auto leading-relaxed">
                  Select a scenario preset, configure your parameters, and run the simulation to generate probability distributions across multiple outcome paths.
                </p>
                <div className="flex items-center justify-center gap-4 mt-6">
                  {["Select Symbol", "Choose Scenario", "Run Simulation"].map((step, i) => (
                    <div key={step} className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-navy-800/60 border border-navy-700/40 flex items-center justify-center">
                        <span className="text-[8px] font-mono text-navy-500">{i + 1}</span>
                      </div>
                      <span className="text-[9px] font-mono text-navy-600 uppercase tracking-wider">{step}</span>
                      {i < 2 && <ChevronDown className="h-3 w-3 text-navy-700 -rotate-90" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      </UpgradeGate>
    </PageContainer>
  );
}
