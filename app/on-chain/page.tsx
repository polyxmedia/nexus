"use client";

import { useState, useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  OnChainSnapshot,
  WhaleTransaction,
  ExchangeFlow,
  DeFiTVL,
  StablecoinMetrics,
} from "@/lib/on-chain";

function formatUsd(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function formatCrypto(value: number, currency: string): string {
  if (value >= 1000) return `${value.toFixed(0)} ${currency}`;
  return `${value.toFixed(4)} ${currency}`;
}

function truncateAddr(addr: string): string {
  if (!addr || addr === "Unknown" || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ChangeIndicator({ value }: { value: number }) {
  if (value === 0) return <span className="text-navy-500 font-mono text-[11px]">0.00%</span>;
  const isPositive = value > 0;
  return (
    <span className={`font-mono text-[11px] ${isPositive ? "text-accent-emerald" : "text-accent-rose"}`}>
      {isPositive ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

function SummaryCard({
  label,
  value,
  change,
  loading,
}: {
  label: string;
  value: string | null;
  change?: number | null;
  loading: boolean;
}) {
  return (
    <div className="border border-navy-800/60 rounded bg-navy-950/80 p-4">
      <div className="text-[10px] font-mono uppercase tracking-widest text-navy-600 mb-2">
        {label}
      </div>
      {loading ? (
        <Skeleton className="h-6 w-24" />
      ) : (
        <div className="flex items-end gap-2">
          <span className="font-mono font-light text-navy-200 text-lg tabular-nums">
            {value ?? "--"}
          </span>
          {change != null && <ChangeIndicator value={change} />}
        </div>
      )}
    </div>
  );
}

// --- Whale Alerts Table ---

function WhaleAlertsSection({ whales, loading }: { whales: WhaleTransaction[] | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (!whales || whales.length === 0) {
    return <p className="text-xs font-mono text-navy-600 py-8 text-center">No whale transactions detected</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-navy-800/40">
            <th className="text-[10px] font-mono uppercase tracking-widest text-navy-600 py-2 pr-4 font-normal">Time</th>
            <th className="text-[10px] font-mono uppercase tracking-widest text-navy-600 py-2 pr-4 font-normal">Amount</th>
            <th className="text-[10px] font-mono uppercase tracking-widest text-navy-600 py-2 pr-4 font-normal">USD Value</th>
            <th className="text-[10px] font-mono uppercase tracking-widest text-navy-600 py-2 pr-4 font-normal hidden md:table-cell">From</th>
            <th className="text-[10px] font-mono uppercase tracking-widest text-navy-600 py-2 font-normal hidden md:table-cell">To</th>
          </tr>
        </thead>
        <tbody>
          {whales.map((tx) => (
            <tr key={tx.hash} className="border-b border-navy-800/20 hover:bg-navy-900/30 transition-colors">
              <td className="py-2.5 pr-4 text-[11px] font-mono text-navy-400 tabular-nums whitespace-nowrap">
                {timeAgo(tx.timestamp)}
              </td>
              <td className="py-2.5 pr-4 text-[11px] font-mono font-light text-navy-200 tabular-nums whitespace-nowrap">
                {formatCrypto(tx.amount, tx.currency)}
              </td>
              <td className="py-2.5 pr-4 text-[11px] font-mono font-light text-navy-200 tabular-nums whitespace-nowrap">
                {formatUsd(tx.usdValue)}
              </td>
              <td className="py-2.5 pr-4 text-[11px] font-mono text-navy-500 hidden md:table-cell">
                {truncateAddr(tx.fromAddress)}
              </td>
              <td className="py-2.5 text-[11px] font-mono text-navy-500 hidden md:table-cell">
                {truncateAddr(tx.toAddress)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Exchange Flows Table ---

function ExchangeFlowsSection({ exchanges, loading }: { exchanges: ExchangeFlow[] | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (!exchanges || exchanges.length === 0) {
    return <p className="text-xs font-mono text-navy-600 py-8 text-center">No exchange data available</p>;
  }

  const maxShare = Math.max(...exchanges.map((e) => e.marketShare));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-navy-800/40">
            <th className="text-[10px] font-mono uppercase tracking-widest text-navy-600 py-2 pr-4 font-normal">Exchange</th>
            <th className="text-[10px] font-mono uppercase tracking-widest text-navy-600 py-2 pr-4 font-normal">24h Volume</th>
            <th className="text-[10px] font-mono uppercase tracking-widest text-navy-600 py-2 pr-4 font-normal hidden sm:table-cell">Trust</th>
            <th className="text-[10px] font-mono uppercase tracking-widest text-navy-600 py-2 font-normal w-1/3">Market Share</th>
          </tr>
        </thead>
        <tbody>
          {exchanges.map((ex) => (
            <tr key={ex.id} className="border-b border-navy-800/20 hover:bg-navy-900/30 transition-colors">
              <td className="py-2.5 pr-4 text-[11px] font-mono font-light text-navy-200 whitespace-nowrap">
                {ex.name}
              </td>
              <td className="py-2.5 pr-4 text-[11px] font-mono font-light text-navy-200 tabular-nums whitespace-nowrap">
                {formatUsd(ex.volume24h)}
              </td>
              <td className="py-2.5 pr-4 text-[11px] font-mono text-navy-400 tabular-nums hidden sm:table-cell">
                {ex.trustScore ?? "--"}
              </td>
              <td className="py-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-navy-800/40 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-navy-500/60"
                      style={{ width: `${maxShare > 0 ? (ex.marketShare / maxShare) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-navy-500 tabular-nums w-12 text-right">
                    {ex.marketShare.toFixed(1)}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- DeFi TVL Section ---

function DeFiTVLSection({ defi, loading }: { defi: DeFiTVL | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (!defi || !defi.topProtocols.length) {
    return <p className="text-xs font-mono text-navy-600 py-8 text-center">No DeFi data available</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-navy-800/40">
            <th className="text-[10px] font-mono uppercase tracking-widest text-navy-600 py-2 pr-4 font-normal w-8">#</th>
            <th className="text-[10px] font-mono uppercase tracking-widest text-navy-600 py-2 pr-4 font-normal">Protocol</th>
            <th className="text-[10px] font-mono uppercase tracking-widest text-navy-600 py-2 pr-4 font-normal">TVL</th>
            <th className="text-[10px] font-mono uppercase tracking-widest text-navy-600 py-2 pr-4 font-normal">24h</th>
            <th className="text-[10px] font-mono uppercase tracking-widest text-navy-600 py-2 pr-4 font-normal hidden md:table-cell">Category</th>
            <th className="text-[10px] font-mono uppercase tracking-widest text-navy-600 py-2 font-normal hidden md:table-cell">Chain</th>
          </tr>
        </thead>
        <tbody>
          {defi.topProtocols.map((p, i) => (
            <tr key={p.name} className="border-b border-navy-800/20 hover:bg-navy-900/30 transition-colors">
              <td className="py-2.5 pr-4 text-[11px] font-mono text-navy-600 tabular-nums">{i + 1}</td>
              <td className="py-2.5 pr-4 text-[11px] font-mono font-light text-navy-200 whitespace-nowrap">
                {p.name}
              </td>
              <td className="py-2.5 pr-4 text-[11px] font-mono font-light text-navy-200 tabular-nums whitespace-nowrap">
                {formatUsd(p.tvl)}
              </td>
              <td className="py-2.5 pr-4">
                <ChangeIndicator value={p.tvlChange24h} />
              </td>
              <td className="py-2.5 pr-4 text-[11px] font-mono text-navy-500 hidden md:table-cell">
                {p.category}
              </td>
              <td className="py-2.5 text-[11px] font-mono text-navy-500 hidden md:table-cell">
                {p.chain}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Stablecoin Flows Section ---

function StablecoinSection({ stablecoins, loading }: { stablecoins: StablecoinMetrics[] | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!stablecoins || stablecoins.length === 0) {
    return <p className="text-xs font-mono text-navy-600 py-8 text-center">No stablecoin data available</p>;
  }

  const totalMarketCap = stablecoins.reduce((sum, s) => sum + s.marketCap, 0);

  return (
    <div className="space-y-3">
      {/* Dominance bar */}
      <div>
        <div className="flex h-2 rounded-full overflow-hidden gap-px">
          {stablecoins.map((s, i) => {
            const pct = totalMarketCap > 0 ? (s.marketCap / totalMarketCap) * 100 : 0;
            const colors = ["bg-navy-400", "bg-navy-500", "bg-navy-600", "bg-navy-700", "bg-navy-800"];
            return (
              <div
                key={s.symbol}
                className={`h-full ${colors[i] ?? "bg-navy-700"}`}
                style={{ width: `${pct}%` }}
                title={`${s.symbol}: ${pct.toFixed(1)}%`}
              />
            );
          })}
        </div>
        <div className="flex gap-4 mt-1.5">
          {stablecoins.map((s, i) => {
            const pct = totalMarketCap > 0 ? (s.marketCap / totalMarketCap) * 100 : 0;
            const colors = ["text-navy-400", "text-navy-500", "text-navy-500", "text-navy-600", "text-navy-600"];
            return (
              <span key={s.symbol} className={`text-[9px] font-mono ${colors[i] ?? "text-navy-600"}`}>
                {s.symbol} {pct.toFixed(1)}%
              </span>
            );
          })}
        </div>
      </div>

      {/* Stablecoin table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-navy-800/40">
              <th className="text-[10px] font-mono uppercase tracking-widest text-navy-600 py-2 pr-4 font-normal">Stablecoin</th>
              <th className="text-[10px] font-mono uppercase tracking-widest text-navy-600 py-2 pr-4 font-normal">Market Cap</th>
              <th className="text-[10px] font-mono uppercase tracking-widest text-navy-600 py-2 pr-4 font-normal">24h Change</th>
              <th className="text-[10px] font-mono uppercase tracking-widest text-navy-600 py-2 pr-4 font-normal hidden sm:table-cell">24h Volume</th>
              <th className="text-[10px] font-mono uppercase tracking-widest text-navy-600 py-2 font-normal hidden sm:table-cell">Peg</th>
            </tr>
          </thead>
          <tbody>
            {stablecoins.map((s) => (
              <tr key={s.symbol} className="border-b border-navy-800/20 hover:bg-navy-900/30 transition-colors">
                <td className="py-2.5 pr-4">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-mono font-light text-navy-200">{s.symbol}</span>
                    <span className="text-[9px] font-mono text-navy-600">{s.name}</span>
                  </div>
                </td>
                <td className="py-2.5 pr-4 text-[11px] font-mono font-light text-navy-200 tabular-nums whitespace-nowrap">
                  {formatUsd(s.marketCap)}
                </td>
                <td className="py-2.5 pr-4">
                  <ChangeIndicator value={s.marketCapChange24h} />
                </td>
                <td className="py-2.5 pr-4 text-[11px] font-mono text-navy-400 tabular-nums whitespace-nowrap hidden sm:table-cell">
                  {formatUsd(s.volume24h)}
                </td>
                <td className="py-2.5 text-[11px] font-mono tabular-nums hidden sm:table-cell">
                  <span className={Math.abs(s.price - 1) < 0.005 ? "text-navy-400" : "text-accent-rose"}>
                    ${s.price.toFixed(4)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Main Page ---

type Section = "whales" | "flows" | "defi" | "stablecoins";

const SECTIONS: { id: Section; label: string }[] = [
  { id: "whales", label: "Whale Alerts" },
  { id: "flows", label: "Exchange Flows" },
  { id: "defi", label: "DeFi TVL" },
  { id: "stablecoins", label: "Stablecoin Flows" },
];

export default function OnChainPage() {
  const [data, setData] = useState<OnChainSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState<Section | "all">("all");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchData() {
    try {
      const res = await fetch("/api/on-chain");
      if (!res.ok) throw new Error("Failed to fetch");
      const snapshot: OnChainSnapshot = await res.json();
      setData(snapshot);
    } catch {
      // keep existing data on failure
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 300_000); // 5 min poll
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function handleRefresh() {
    setRefreshing(true);
    fetchData();
  }

  // Compute summary values
  const totalDeFiTvl = data?.defi?.totalTvl ?? null;
  const defiChange = data?.defi?.totalChange24h ?? null;
  const totalExchangeVolume = data?.exchanges?.reduce((sum, e) => sum + e.volume24h, 0) ?? null;
  const whaleCount = data?.whales?.length ?? null;
  const totalStablecoinSupply = data?.stablecoins?.reduce((sum, s) => sum + s.marketCap, 0) ?? null;

  const showSection = (section: Section) => activeSection === "all" || activeSection === section;

  return (
    <PageContainer title="On-Chain Analytics" subtitle="Real-time blockchain intelligence across DeFi, whale activity, and exchange flows">
      {/* Controls */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setActiveSection("all")}
            className={`px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider transition-colors ${
              activeSection === "all"
                ? "bg-navy-800 text-navy-100"
                : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/40"
            }`}
          >
            All
          </button>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider transition-colors ${
                activeSection === s.id
                  ? "bg-navy-800 text-navy-100"
                  : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/40"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {data && (
            <span className="text-[9px] font-mono text-navy-600">
              {timeAgo(data.timestamp)}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-mono text-navy-500 hover:text-navy-300 hover:bg-navy-800/40 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SummaryCard
          label="DeFi TVL"
          value={totalDeFiTvl !== null ? formatUsd(totalDeFiTvl) : null}
          change={defiChange}
          loading={loading}
        />
        <SummaryCard
          label="24h Exchange Volume"
          value={totalExchangeVolume !== null ? formatUsd(totalExchangeVolume) : null}
          loading={loading}
        />
        <SummaryCard
          label="Whale Txns"
          value={whaleCount !== null ? `${whaleCount}` : null}
          loading={loading}
        />
        <SummaryCard
          label="Stablecoin Supply"
          value={totalStablecoinSupply !== null ? formatUsd(totalStablecoinSupply) : null}
          loading={loading}
        />
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {showSection("whales") && (
          <section>
            <h2 className="text-[10px] font-mono uppercase tracking-widest text-navy-600 mb-3">
              Whale Alerts
            </h2>
            <div className="border border-navy-800/60 rounded bg-navy-950/80 p-4">
              <WhaleAlertsSection whales={data?.whales ?? null} loading={loading} />
            </div>
          </section>
        )}

        {showSection("flows") && (
          <section>
            <h2 className="text-[10px] font-mono uppercase tracking-widest text-navy-600 mb-3">
              Exchange Flows
            </h2>
            <div className="border border-navy-800/60 rounded bg-navy-950/80 p-4">
              <ExchangeFlowsSection exchanges={data?.exchanges ?? null} loading={loading} />
            </div>
          </section>
        )}

        {showSection("defi") && (
          <section>
            <h2 className="text-[10px] font-mono uppercase tracking-widest text-navy-600 mb-3">
              DeFi Total Value Locked
            </h2>
            <div className="border border-navy-800/60 rounded bg-navy-950/80 p-4">
              <DeFiTVLSection defi={data?.defi ?? null} loading={loading} />
            </div>
          </section>
        )}

        {showSection("stablecoins") && (
          <section>
            <h2 className="text-[10px] font-mono uppercase tracking-widest text-navy-600 mb-3">
              Stablecoin Flows
            </h2>
            <div className="border border-navy-800/60 rounded bg-navy-950/80 p-4">
              <StablecoinSection stablecoins={data?.stablecoins ?? null} loading={loading} />
            </div>
          </section>
        )}
      </div>
    </PageContainer>
  );
}
