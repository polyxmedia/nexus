"use client";

import { useEffect, useState, useRef } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { UpgradeGate } from "@/components/subscription/upgrade-gate";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownRight, ExternalLink, Crosshair, Wallet } from "lucide-react";
import { BetModal } from "@/components/prediction-markets/bet-modal";

// ── Types ──

interface Market {
  id: string;
  source: "polymarket" | "kalshi";
  title: string;
  description: string;
  probability: number;
  volume24h: number;
  totalVolume: number;
  category: string;
  endDate: string;
  active: boolean;
  url: string;
  priceChange24h: number;
  priceChange7d: number;
  clobTokenIds?: string;
}

interface Snapshot {
  markets: Market[];
  topMovers: Market[];
  geopolitical: Market[];
  economic: Market[];
  political: Market[];
  totalMarkets: number;
  lastUpdated: string;
}

interface Divergence {
  market: Market;
  nexusConfidence: number;
  marketProbability: number;
  divergence: number;
  direction: "nexus_higher" | "nexus_lower";
}

interface DivergenceStats {
  count: number;
  avgDivergence: number;
  maxDivergence: number;
  nexusHigherCount: number;
  nexusLowerCount: number;
  arbitrageOpportunities: number;
}

interface DivergenceData {
  divergences: Divergence[];
  stats: DivergenceStats;
  marketsAnalyzed: number;
  predictionsAnalyzed: number;
  lastUpdated: string;
}

// ── Tabs ──

interface KalshiPortfolio {
  configured: boolean;
  balance: { available_balance: number; portfolio_value: number } | null;
  positions: Array<{
    ticker: string;
    market_exposure: number;
    resting_orders_count: number;
    total_traded: number;
    realized_pnl: number;
  }>;
}

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "geopolitical", label: "Geopolitical" },
  { key: "economic", label: "Economic" },
  { key: "political", label: "Political" },
  { key: "divergences", label: "Divergences" },
  { key: "portfolio", label: "Portfolio" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ── Helpers ──

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function formatDate(d: string): string {
  if (!d) return "--";
  try {
    return new Date(d).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return d;
  }
}

function formatPct(v: number): string {
  return (v * 100).toFixed(1);
}

// ── Market Table Row ──

function MarketRow({ market, onBet }: { market: Market; onBet?: (m: Market) => void }) {
  const probPct = (market.probability * 100).toFixed(0);

  return (
    <tr className="border-b border-navy-800/20 last:border-0 hover:bg-navy-900/30 transition-colors">
      {/* Title */}
      <td className="py-2.5 px-4 max-w-[320px]">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-navy-200 leading-tight truncate">
              {market.title}
            </p>
            <div className="mt-1.5 h-[3px] bg-navy-800/40 rounded-full overflow-hidden max-w-[160px]">
              <div
                className="h-full bg-navy-500/40 rounded-full"
                style={{ width: `${probPct}%` }}
              />
            </div>
          </div>
        </div>
      </td>

      {/* Source */}
      <td className="py-2.5 px-3">
        <span className="text-[8px] font-mono uppercase border border-navy-800/40 px-1.5 py-0.5 rounded text-navy-500">
          {market.source === "polymarket" ? "POLY" : "KLSH"}
        </span>
      </td>

      {/* Probability */}
      <td className="py-2.5 px-3 text-right">
        <span className="font-mono font-light text-navy-200 tabular-nums text-sm">
          {probPct}%
        </span>
      </td>

      {/* 24h Change */}
      <td className="py-2.5 px-3 text-right">
        {market.priceChange24h !== 0 ? (
          <span
            className={`text-[11px] font-mono tabular-nums flex items-center justify-end gap-0.5 ${
              market.priceChange24h > 0 ? "text-navy-300" : "text-navy-500"
            }`}
          >
            {market.priceChange24h > 0 ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {market.priceChange24h > 0 ? "+" : ""}
            {formatPct(market.priceChange24h)}
          </span>
        ) : (
          <span className="text-[11px] font-mono text-navy-600">--</span>
        )}
      </td>

      {/* 7d Change */}
      <td className="py-2.5 px-3 text-right">
        {market.priceChange7d !== 0 ? (
          <span
            className={`text-[11px] font-mono tabular-nums ${
              market.priceChange7d > 0 ? "text-navy-300" : "text-navy-500"
            }`}
          >
            {market.priceChange7d > 0 ? "+" : ""}
            {formatPct(market.priceChange7d)}
          </span>
        ) : (
          <span className="text-[11px] font-mono text-navy-600">--</span>
        )}
      </td>

      {/* Volume */}
      <td className="py-2.5 px-3 text-right">
        <span className="text-[11px] font-mono text-navy-400 tabular-nums">
          {formatVolume(market.volume24h)}
        </span>
      </td>

      {/* End Date */}
      <td className="py-2.5 px-3 text-right">
        <span className="text-[10px] font-mono text-navy-600">
          {formatDate(market.endDate)}
        </span>
      </td>

      {/* Bet + Link */}
      <td className="py-2.5 px-3 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {onBet && (
            <button
              onClick={(e) => { e.stopPropagation(); onBet(market); }}
              className="text-[8px] font-mono uppercase tracking-wider px-2 py-1 rounded border border-navy-700/40 text-navy-400 hover:text-navy-200 hover:border-navy-600/40 transition-colors"
            >
              <Crosshair className="h-3 w-3" />
            </button>
          )}
          <a
            href={market.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-navy-600 hover:text-navy-400 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </td>
    </tr>
  );
}

// ── Market Table ──

function MarketTable({ markets, onBet }: { markets: Market[]; onBet?: (m: Market) => void }) {
  if (markets.length === 0) {
    return (
      <div className="border border-navy-800/60 rounded bg-navy-950/80 p-8 text-center">
        <p className="text-sm text-navy-500">No markets available.</p>
      </div>
    );
  }

  return (
    <div className="border border-navy-800/60 rounded bg-navy-950/80 overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr className="border-b border-navy-800/40">
            <th className="text-left text-[9px] font-mono font-normal text-navy-600 uppercase tracking-wider px-4 py-2.5">
              Market
            </th>
            <th className="text-left text-[9px] font-mono font-normal text-navy-600 uppercase tracking-wider px-3 py-2.5">
              Src
            </th>
            <th className="text-right text-[9px] font-mono font-normal text-navy-600 uppercase tracking-wider px-3 py-2.5">
              Prob
            </th>
            <th className="text-right text-[9px] font-mono font-normal text-navy-600 uppercase tracking-wider px-3 py-2.5">
              24h
            </th>
            <th className="text-right text-[9px] font-mono font-normal text-navy-600 uppercase tracking-wider px-3 py-2.5">
              7d
            </th>
            <th className="text-right text-[9px] font-mono font-normal text-navy-600 uppercase tracking-wider px-3 py-2.5">
              Vol 24h
            </th>
            <th className="text-right text-[9px] font-mono font-normal text-navy-600 uppercase tracking-wider px-3 py-2.5">
              Ends
            </th>
            <th className="text-right text-[9px] font-mono font-normal text-navy-600 uppercase tracking-wider px-3 py-2.5 w-12" />
          </tr>
        </thead>
        <tbody>
          {markets.map((m) => (
            <MarketRow key={m.id} market={m} onBet={onBet} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Summary Stat ──

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-navy-950/80 p-4">
      <span className="text-[9px] font-mono uppercase tracking-wider text-navy-600 block mb-1">
        {label}
      </span>
      <span className="text-lg font-mono font-light text-navy-200 tabular-nums block">
        {value}
      </span>
      {sub && (
        <span className="text-[9px] font-mono text-navy-700 mt-1 block">
          {sub}
        </span>
      )}
    </div>
  );
}

// ── Page ──

export default function PredictionMarketsPage() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [divData, setDivData] = useState<DivergenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [divLoading, setDivLoading] = useState(false);
  const [tab, setTab] = useState<TabKey>("overview");
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const [betMarket, setBetMarket] = useState<Market | null>(null);
  const [portfolio, setPortfolio] = useState<KalshiPortfolio | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);

  // Fetch market data
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/prediction-markets");
        const json = await res.json();
        setData(json);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    load();
    pollRef.current = setInterval(load, 60_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Fetch portfolio when tab activates
  useEffect(() => {
    if (tab !== "portfolio" || portfolio) return;
    setPortfolioLoading(true);
    fetch("/api/prediction-markets/portfolio")
      .then((r) => r.json())
      .then((d) => setPortfolio(d))
      .catch(() => setPortfolio(null))
      .finally(() => setPortfolioLoading(false));
  }, [tab, portfolio]);

  // Fetch divergences when tab activates
  useEffect(() => {
    if (tab !== "divergences" || divData) return;
    setDivLoading(true);
    fetch("/api/prediction-markets/divergence")
      .then((r) => r.json())
      .then((d) => setDivData(d))
      .catch(() => setDivData(null))
      .finally(() => setDivLoading(false));
  }, [tab, divData]);

  if (loading) {
    return (
      <PageContainer
        title="Prediction Markets"
        subtitle="Polymarket + Kalshi probability pricing"
      >
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded" />
          ))}
        </div>
      </PageContainer>
    );
  }

  if (!data) {
    return (
      <PageContainer
        title="Prediction Markets"
        subtitle="Polymarket + Kalshi probability pricing"
      >
        <p className="text-sm text-navy-500">
          Failed to load prediction market data.
        </p>
      </PageContainer>
    );
  }

  // Compute overview stats
  const avgShift =
    data.markets.length > 0
      ? data.markets.reduce(
          (sum, m) => sum + Math.abs(m.priceChange24h),
          0
        ) / data.markets.length
      : 0;

  const categoryBreakdown = {
    geopolitical: data.geopolitical.length,
    economic: data.economic.length,
    political: data.political.length,
  };
  const topCategory = Object.entries(categoryBreakdown).sort(
    (a, b) => b[1] - a[1]
  )[0];

  return (
    <PageContainer
      title="Prediction Markets"
      subtitle={`${data.totalMarkets} active markets from Polymarket and Kalshi`}
    >
      <UpgradeGate minTier="operator" feature="Prediction markets divergence" blur>
      {/* ── Tabs ── */}
      <div className="flex items-center gap-0 border-b border-navy-800/40 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-xs font-medium uppercase tracking-wider transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? "text-navy-200 border-navy-400"
                : "text-navy-600 border-transparent hover:text-navy-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {tab === "overview" && (
        <div className="space-y-8">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-navy-800/30 rounded overflow-hidden">
            <StatCard
              label="Total Markets"
              value={String(data.totalMarkets)}
              sub="Polymarket + Kalshi"
            />
            <StatCard
              label="Avg Probability Shift (24h)"
              value={`${formatPct(avgShift)}pp`}
              sub="Absolute average"
            />
            <StatCard
              label="Top Category"
              value={topCategory ? topCategory[0] : "--"}
              sub={
                topCategory ? `${topCategory[1]} active markets` : undefined
              }
            />
          </div>

          {/* Top Movers */}
          {data.topMovers.length > 0 && (
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600 block mb-3">
                Top Movers (24h)
              </span>
              <MarketTable markets={data.topMovers} onBet={setBetMarket} />
            </div>
          )}

          {/* All Markets */}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600 block mb-3">
              All Markets by Volume
            </span>
            <MarketTable markets={data.markets} onBet={setBetMarket} />
          </div>
        </div>
      )}

      {/* ── Geopolitical Tab ── */}
      {tab === "geopolitical" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600">
              Geopolitical Markets
            </span>
            <span className="text-[9px] font-mono text-navy-700">
              {data.geopolitical.length} markets
            </span>
          </div>
          <MarketTable markets={data.geopolitical} onBet={setBetMarket} />
        </div>
      )}

      {/* ── Economic Tab ── */}
      {tab === "economic" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600">
              Economic Markets
            </span>
            <span className="text-[9px] font-mono text-navy-700">
              {data.economic.length} markets
            </span>
          </div>
          <MarketTable markets={data.economic} onBet={setBetMarket} />
        </div>
      )}

      {/* ── Political Tab ── */}
      {tab === "political" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600">
              Political Markets
            </span>
            <span className="text-[9px] font-mono text-navy-700">
              {data.political.length} markets
            </span>
          </div>
          <MarketTable markets={data.political} onBet={setBetMarket} />
        </div>
      )}

      {/* ── Divergences Tab ── */}
      {tab === "divergences" && (
        <div className="space-y-6">
          {divLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded" />
              ))}
            </div>
          ) : divData ? (
            <>
              {/* Divergence Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-navy-800/30 rounded overflow-hidden">
                <StatCard
                  label="Divergences Found"
                  value={String(divData.stats.count)}
                  sub={`${divData.marketsAnalyzed} markets vs ${divData.predictionsAnalyzed} predictions`}
                />
                <StatCard
                  label="Avg Divergence"
                  value={`${(divData.stats.avgDivergence * 100).toFixed(1)}pp`}
                />
                <StatCard
                  label="Max Divergence"
                  value={`${(divData.stats.maxDivergence * 100).toFixed(1)}pp`}
                />
                <StatCard
                  label="Arbitrage Signals"
                  value={String(divData.stats.arbitrageOpportunities)}
                  sub=">25pp divergence"
                />
              </div>

              {/* Direction Breakdown */}
              {divData.stats.count > 0 && (
                <div className="grid grid-cols-2 gap-px bg-navy-800/30 rounded overflow-hidden">
                  <StatCard
                    label="NEXUS Higher"
                    value={String(divData.stats.nexusHigherCount)}
                    sub="NEXUS confidence exceeds market price"
                  />
                  <StatCard
                    label="NEXUS Lower"
                    value={String(divData.stats.nexusLowerCount)}
                    sub="Market price exceeds NEXUS confidence"
                  />
                </div>
              )}

              {/* Divergence Table */}
              {divData.divergences.length > 0 ? (
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600 block mb-3">
                    Divergences by Magnitude
                  </span>
                  <div className="border border-navy-800/60 rounded bg-navy-950/80 overflow-x-auto">
                    <table className="w-full min-w-[640px]">
                      <thead>
                        <tr className="border-b border-navy-800/40">
                          <th className="text-left text-[9px] font-mono font-normal text-navy-600 uppercase tracking-wider px-4 py-2.5">
                            Market
                          </th>
                          <th className="text-left text-[9px] font-mono font-normal text-navy-600 uppercase tracking-wider px-3 py-2.5">
                            Src
                          </th>
                          <th className="text-right text-[9px] font-mono font-normal text-navy-600 uppercase tracking-wider px-3 py-2.5">
                            Market Prob
                          </th>
                          <th className="text-right text-[9px] font-mono font-normal text-navy-600 uppercase tracking-wider px-3 py-2.5">
                            NEXUS Conf
                          </th>
                          <th className="text-right text-[9px] font-mono font-normal text-navy-600 uppercase tracking-wider px-3 py-2.5">
                            Divergence
                          </th>
                          <th className="text-right text-[9px] font-mono font-normal text-navy-600 uppercase tracking-wider px-3 py-2.5">
                            Direction
                          </th>
                          <th className="text-right text-[9px] font-mono font-normal text-navy-600 uppercase tracking-wider px-3 py-2.5 w-8" />
                        </tr>
                      </thead>
                      <tbody>
                        {divData.divergences.map((d, i) => {
                          const divPct = (d.divergence * 100).toFixed(1);
                          const isArbitrage = d.divergence > 0.25;

                          return (
                            <tr
                              key={`${d.market.id}-${i}`}
                              className="border-b border-navy-800/20 last:border-0 hover:bg-navy-900/30 transition-colors"
                            >
                              {/* Title */}
                              <td className="py-2.5 px-4 max-w-[280px]">
                                <p className="text-[11px] text-navy-200 leading-tight truncate">
                                  {d.market.title}
                                </p>
                              </td>

                              {/* Source */}
                              <td className="py-2.5 px-3">
                                <span className="text-[8px] font-mono uppercase border border-navy-800/40 px-1.5 py-0.5 rounded text-navy-500">
                                  {d.market.source === "polymarket"
                                    ? "POLY"
                                    : "KLSH"}
                                </span>
                              </td>

                              {/* Market Probability */}
                              <td className="py-2.5 px-3 text-right">
                                <span className="font-mono font-light text-navy-400 tabular-nums text-sm">
                                  {(d.marketProbability * 100).toFixed(0)}%
                                </span>
                              </td>

                              {/* NEXUS Confidence */}
                              <td className="py-2.5 px-3 text-right">
                                <span className="font-mono font-light text-navy-200 tabular-nums text-sm">
                                  {(d.nexusConfidence * 100).toFixed(0)}%
                                </span>
                              </td>

                              {/* Divergence */}
                              <td className="py-2.5 px-3 text-right">
                                <span
                                  className={`font-mono font-light tabular-nums text-sm ${
                                    isArbitrage
                                      ? "text-navy-200"
                                      : "text-navy-300"
                                  }`}
                                >
                                  {divPct}pp
                                </span>
                              </td>

                              {/* Direction */}
                              <td className="py-2.5 px-3 text-right">
                                <span
                                  className={`text-[9px] font-mono uppercase ${
                                    d.direction === "nexus_higher"
                                      ? "text-navy-300"
                                      : "text-navy-500"
                                  }`}
                                >
                                  {d.direction === "nexus_higher" ? (
                                    <span className="flex items-center justify-end gap-1">
                                      <ArrowUpRight className="h-3 w-3" />
                                      NEXUS +
                                    </span>
                                  ) : (
                                    <span className="flex items-center justify-end gap-1">
                                      <ArrowDownRight className="h-3 w-3" />
                                      NEXUS -
                                    </span>
                                  )}
                                </span>
                              </td>

                              {/* Link */}
                              <td className="py-2.5 px-3 text-right">
                                <a
                                  href={d.market.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-navy-600 hover:text-navy-400 transition-colors"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="border border-navy-800/60 rounded bg-navy-950/80 p-8 text-center">
                  <p className="text-sm text-navy-500 mb-1">
                    No divergences detected.
                  </p>
                  <p className="text-[11px] text-navy-600">
                    Divergences appear when NEXUS prediction confidence differs
                    from market probability by more than 15 percentage points on
                    matching topics.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="border border-navy-800/60 rounded bg-navy-950/80 p-8 text-center">
              <p className="text-sm text-navy-500">
                Failed to load divergence data.
              </p>
            </div>
          )}
        </div>
      )}
      {/* ── Portfolio Tab ── */}
      {tab === "portfolio" && (
        <div className="space-y-6">
          {portfolioLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded" />
              ))}
            </div>
          ) : portfolio && portfolio.configured ? (
            <>
              {/* Balance */}
              {portfolio.balance && (
                <div className="grid grid-cols-2 gap-px bg-navy-800/30 rounded overflow-hidden">
                  <StatCard
                    label="Available Balance"
                    value={`$${(portfolio.balance.available_balance / 100).toFixed(2)}`}
                    sub="Kalshi account"
                  />
                  <StatCard
                    label="Portfolio Value"
                    value={`$${(portfolio.balance.portfolio_value / 100).toFixed(2)}`}
                  />
                </div>
              )}

              {/* Positions */}
              {portfolio.positions.length > 0 ? (
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600 block mb-3">
                    Open Positions
                  </span>
                  <div className="border border-navy-800/60 rounded bg-navy-950/80 overflow-x-auto">
                    <table className="w-full min-w-[500px]">
                      <thead>
                        <tr className="border-b border-navy-800/40">
                          <th className="text-left text-[9px] font-mono font-normal text-navy-600 uppercase tracking-wider px-4 py-2.5">Ticker</th>
                          <th className="text-right text-[9px] font-mono font-normal text-navy-600 uppercase tracking-wider px-3 py-2.5">Exposure</th>
                          <th className="text-right text-[9px] font-mono font-normal text-navy-600 uppercase tracking-wider px-3 py-2.5">Traded</th>
                          <th className="text-right text-[9px] font-mono font-normal text-navy-600 uppercase tracking-wider px-3 py-2.5">Realized P&L</th>
                          <th className="text-right text-[9px] font-mono font-normal text-navy-600 uppercase tracking-wider px-3 py-2.5">Orders</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portfolio.positions.map((p) => (
                          <tr key={p.ticker} className="border-b border-navy-800/20 last:border-0">
                            <td className="py-2 px-4 text-[11px] font-mono text-navy-200">{p.ticker}</td>
                            <td className="py-2 px-3 text-right text-[11px] font-mono text-navy-300">${(p.market_exposure / 100).toFixed(2)}</td>
                            <td className="py-2 px-3 text-right text-[11px] font-mono text-navy-400">${(p.total_traded / 100).toFixed(2)}</td>
                            <td className={`py-2 px-3 text-right text-[11px] font-mono ${p.realized_pnl >= 0 ? "text-accent-emerald" : "text-accent-rose"}`}>
                              {p.realized_pnl >= 0 ? "+" : ""}${(p.realized_pnl / 100).toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right text-[11px] font-mono text-navy-500">{p.resting_orders_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="border border-navy-800/60 rounded bg-navy-950/80 p-8 text-center">
                  <Wallet className="h-5 w-5 text-navy-600 mx-auto mb-2" />
                  <p className="text-sm text-navy-500">No open positions.</p>
                  <p className="text-[11px] text-navy-600 mt-1">Place a bet from any market tab to get started.</p>
                </div>
              )}
            </>
          ) : (
            <div className="border border-navy-800/60 rounded bg-navy-950/80 p-8 text-center">
              <Wallet className="h-5 w-5 text-navy-600 mx-auto mb-2" />
              <p className="text-sm text-navy-400 mb-1">Kalshi not connected</p>
              <p className="text-[11px] text-navy-600">
                Add your Kalshi API Key ID and Private Key in Settings to enable trading.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Bet Modal ── */}
      {betMarket && (
        <BetModal
          market={betMarket}
          open={!!betMarket}
          onClose={() => setBetMarket(null)}
          onSuccess={() => setPortfolio(null)}
        />
      )}
      </UpgradeGate>
    </PageContainer>
  );
}
