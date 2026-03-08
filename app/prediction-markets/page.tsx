"use client";

import { useEffect, useState, useRef } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownRight, ExternalLink, TrendingUp, Globe, DollarSign, Vote } from "lucide-react";

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

// ── Helpers ──

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function formatDate(d: string): string {
  if (!d) return "N/A";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return d; }
}

const CATEGORIES = [
  { key: "all", label: "All Markets", icon: TrendingUp },
  { key: "geopolitical", label: "Geopolitical", icon: Globe },
  { key: "economic", label: "Economic", icon: DollarSign },
  { key: "political", label: "Political", icon: Vote },
] as const;

// ── Page ──

export default function PredictionMarketsPage() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/prediction-markets");
        const json = await res.json();
        setData(json);
      } catch { setData(null); }
      finally { setLoading(false); }
    }
    load();
    pollRef.current = setInterval(load, 60_000); // refresh every minute
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  if (loading) {
    return (
      <PageContainer title="Prediction Markets" subtitle="Polymarket + Kalshi probability pricing">
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded" />)}
        </div>
      </PageContainer>
    );
  }

  const markets = data ? (
    category === "geopolitical" ? data.geopolitical
    : category === "economic" ? data.economic
    : category === "political" ? data.political
    : data.markets
  ) : [];

  const filtered = search
    ? markets.filter(m => m.title.toLowerCase().includes(search.toLowerCase()))
    : markets;

  const movers = data?.topMovers || [];

  return (
    <PageContainer
      title="Prediction Markets"
      subtitle={`${data?.totalMarkets || 0} active markets from Polymarket and Kalshi`}
    >
      {/* Top Movers */}
      {movers.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[10px] font-mono uppercase tracking-widest text-navy-500 mb-2">Top Movers (24h)</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {movers.slice(0, 8).map((m) => (
              <div key={m.id} className="shrink-0 w-56 border border-navy-700/30 rounded-md bg-navy-900/60 p-3">
                <p className="text-[11px] text-navy-200 leading-tight mb-2 line-clamp-2">{m.title}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-mono font-bold text-navy-100">{(m.probability * 100).toFixed(0)}%</span>
                  <div className="flex items-center gap-1">
                    {m.priceChange24h > 0 ? (
                      <ArrowUpRight className="h-3 w-3 text-accent-emerald" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-accent-rose" />
                    )}
                    <span className={`text-xs font-mono ${m.priceChange24h > 0 ? "text-accent-emerald" : "text-accent-rose"}`}>
                      {m.priceChange24h > 0 ? "+" : ""}{(m.priceChange24h * 100).toFixed(1)}pp
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[9px] font-mono text-navy-500">Vol: {formatVolume(m.volume24h)}</span>
                  <span className="text-[8px] font-mono text-navy-600 uppercase">{m.source}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-1">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded border transition-colors ${
                  category === cat.key
                    ? "border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan"
                    : "border-navy-700/30 text-navy-500 hover:text-navy-300 hover:border-navy-600/40"
                }`}
              >
                <Icon className="h-3 w-3" />
                {cat.label}
              </button>
            );
          })}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search markets..."
          className="ml-auto w-64 px-3 py-1.5 rounded border border-navy-700/40 bg-navy-800/60 text-xs text-navy-100 font-mono placeholder:text-navy-600 focus:outline-none focus:border-accent-cyan/40"
        />
      </div>

      {/* Market count */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-navy-500">{filtered.length} markets</span>
        {data?.lastUpdated && (
          <span className="text-[9px] text-navy-600">Updated {formatDate(data.lastUpdated)}</span>
        )}
      </div>

      {/* Markets Table */}
      <div className="border border-navy-700/30 rounded-md overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-navy-800/40 border-b border-navy-700/20">
          <span className="col-span-5 text-[9px] font-mono uppercase tracking-wider text-navy-500">Market</span>
          <span className="col-span-1 text-[9px] font-mono uppercase tracking-wider text-navy-500 text-right">Prob</span>
          <span className="col-span-1 text-[9px] font-mono uppercase tracking-wider text-navy-500 text-right">24h</span>
          <span className="col-span-1 text-[9px] font-mono uppercase tracking-wider text-navy-500 text-right">7d</span>
          <span className="col-span-1 text-[9px] font-mono uppercase tracking-wider text-navy-500 text-right">Vol 24h</span>
          <span className="col-span-1 text-[9px] font-mono uppercase tracking-wider text-navy-500 text-right">Total Vol</span>
          <span className="col-span-1 text-[9px] font-mono uppercase tracking-wider text-navy-500 text-right">Ends</span>
          <span className="col-span-1 text-[9px] font-mono uppercase tracking-wider text-navy-500 text-right">Source</span>
        </div>

        {/* Rows */}
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-navy-500">
            {loading ? "Loading markets..." : "No markets found."}
          </div>
        )}

        {filtered.map((m) => {
          const isExpanded = expanded === m.id;
          const probPct = (m.probability * 100).toFixed(0);
          const barColor = m.probability > 0.7 ? "bg-accent-emerald" : m.probability > 0.4 ? "bg-accent-amber" : "bg-accent-rose";

          return (
            <div key={m.id}>
              <div
                className={`grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-navy-700/10 cursor-pointer hover:bg-navy-800/30 transition-colors ${isExpanded ? "bg-navy-800/20" : ""}`}
                onClick={() => setExpanded(isExpanded ? null : m.id)}
              >
                {/* Market title + probability bar */}
                <div className="col-span-5">
                  <p className="text-[11px] text-navy-200 leading-tight mb-1">{m.title}</p>
                  <div className="h-1 bg-navy-700/30 rounded-full overflow-hidden w-full max-w-[200px]">
                    <div className={`h-full ${barColor}/60 rounded-full`} style={{ width: `${probPct}%` }} />
                  </div>
                </div>

                {/* Probability */}
                <div className="col-span-1 flex items-center justify-end">
                  <span className="text-sm font-mono font-bold text-navy-100">{probPct}%</span>
                </div>

                {/* 24h change */}
                <div className="col-span-1 flex items-center justify-end">
                  {m.priceChange24h !== 0 ? (
                    <span className={`text-[11px] font-mono ${m.priceChange24h > 0 ? "text-accent-emerald" : "text-accent-rose"}`}>
                      {m.priceChange24h > 0 ? "+" : ""}{(m.priceChange24h * 100).toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono text-navy-600">--</span>
                  )}
                </div>

                {/* 7d change */}
                <div className="col-span-1 flex items-center justify-end">
                  {m.priceChange7d !== 0 ? (
                    <span className={`text-[11px] font-mono ${m.priceChange7d > 0 ? "text-accent-emerald" : "text-accent-rose"}`}>
                      {m.priceChange7d > 0 ? "+" : ""}{(m.priceChange7d * 100).toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono text-navy-600">--</span>
                  )}
                </div>

                {/* Volume 24h */}
                <div className="col-span-1 flex items-center justify-end">
                  <span className="text-[11px] font-mono text-navy-300">{formatVolume(m.volume24h)}</span>
                </div>

                {/* Total volume */}
                <div className="col-span-1 flex items-center justify-end">
                  <span className="text-[11px] font-mono text-navy-400">{formatVolume(m.totalVolume)}</span>
                </div>

                {/* End date */}
                <div className="col-span-1 flex items-center justify-end">
                  <span className="text-[10px] font-mono text-navy-500">{formatDate(m.endDate)}</span>
                </div>

                {/* Source */}
                <div className="col-span-1 flex items-center justify-end">
                  <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${
                    m.source === "polymarket" ? "bg-purple-900/30 text-purple-400" : "bg-blue-900/30 text-blue-400"
                  }`}>
                    {m.source === "polymarket" ? "POLY" : "KLSH"}
                  </span>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-6 py-3 bg-navy-800/20 border-b border-navy-700/20">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] font-mono text-navy-500 uppercase tracking-wider">Description</span>
                      <p className="text-xs text-navy-300 mt-1 leading-relaxed">{m.description || "No description available."}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-[10px] text-navy-400">Category</span>
                        <span className="text-[10px] font-mono text-navy-200 capitalize">{m.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[10px] text-navy-400">End Date</span>
                        <span className="text-[10px] font-mono text-navy-200">{formatDate(m.endDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[10px] text-navy-400">Total Volume</span>
                        <span className="text-[10px] font-mono text-navy-200">{formatVolume(m.totalVolume)}</span>
                      </div>
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-mono text-accent-cyan hover:text-accent-cyan/80 transition-colors mt-2"
                      >
                        View on {m.source === "polymarket" ? "Polymarket" : "Kalshi"}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </PageContainer>
  );
}
