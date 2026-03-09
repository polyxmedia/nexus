"use client";

import { useEffect, useState, useCallback } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { UpgradeGate } from "@/components/subscription/upgrade-gate";
import { Skeleton } from "@/components/ui/skeleton";

interface ShortInterestEntry {
  ticker: string;
  shortInterest: number;
  shortRatio: number;
  shortPercentFloat: number;
  previousShortInterest: number;
  change: number;
  sector: string;
}

interface SectorShortInterest {
  sector: string;
  avgShortPercent: number;
  tickers: string[];
  trend: "increasing" | "decreasing" | "stable";
  signal: "contrarian_bullish" | "contrarian_bearish" | "neutral";
}

interface ShortInterestSnapshot {
  entries: ShortInterestEntry[];
  bySector: SectorShortInterest[];
  aggregateRatio: number;
  aggregateSignal: "contrarian_bullish" | "contrarian_bearish" | "neutral";
  zscore52w: number;
  lastUpdated: string;
}

const SIGNAL_LABELS: Record<string, string> = {
  contrarian_bullish: "CONTRARIAN BULLISH",
  contrarian_bearish: "CONTRARIAN BEARISH",
  neutral: "NEUTRAL",
};

const TREND_LABELS: Record<string, string> = {
  increasing: "INCREASING",
  decreasing: "DECREASING",
  stable: "STABLE",
};

const SECTOR_LABELS: Record<string, string> = {
  broad_market: "Broad Market",
  technology: "Technology",
  small_cap: "Small Cap",
  financials: "Financials",
  energy: "Energy",
  healthcare: "Healthcare",
  industrials: "Industrials",
  utilities: "Utilities",
  innovation: "Innovation/Disruptive",
};

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

export default function ShortInterestPage() {
  const [data, setData] = useState<ShortInterestSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/short-interest");
      if (!res.ok) throw new Error("Failed to fetch short interest data");
      const snapshot: ShortInterestSnapshot = await res.json();
      setData(snapshot);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const maxShortPercent = data
    ? Math.max(...data.entries.map((e) => e.shortPercentFloat), 1)
    : 1;

  const elevatedSectors = data
    ? data.bySector.filter((s) => s.avgShortPercent > 3).length
    : 0;

  return (
    <PageContainer
      title="Short Interest"
      subtitle="Aggregate short interest signal across sector ETF proxies"
    >
      <UpgradeGate minTier="operator" feature="Short interest signals" blur>
      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="border border-navy-800/60 rounded bg-navy-950/80 p-6">
          <p className="text-xs font-mono text-navy-400">{error}</p>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Aggregate Stats */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              label="Aggregate Short Ratio"
              value={data.aggregateRatio.toFixed(2)}
              suffix="days"
            />
            <StatCard
              label="52-Week Z-Score"
              value={data.zscore52w > 0 ? `+${data.zscore52w.toFixed(2)}` : data.zscore52w.toFixed(2)}
            />
            <StatCard
              label="Signal"
              value={SIGNAL_LABELS[data.aggregateSignal]}
              valueClass={
                data.aggregateSignal === "contrarian_bullish"
                  ? "text-navy-300"
                  : data.aggregateSignal === "contrarian_bearish"
                  ? "text-navy-400"
                  : "text-navy-500"
              }
            />
            <StatCard
              label="Sectors Elevated"
              value={`${elevatedSectors}`}
              suffix={`of ${data.bySector.length}`}
            />
          </div>

          {/* Last Updated */}
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-navy-600" />
            <span className="text-[10px] font-mono text-navy-600">
              Last updated {new Date(data.lastUpdated).toLocaleString()}
            </span>
          </div>

          {/* By Sector */}
          <section>
            <h2 className="text-[10px] font-mono uppercase tracking-widest text-navy-600 mb-3">
              By Sector
            </h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {data.bySector.map((sector) => (
                <div
                  key={sector.sector}
                  className="border border-navy-800/60 rounded bg-navy-950/80 p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xs font-mono font-medium text-navy-200">
                        {sector.sector}
                      </h3>
                      <p className="text-[10px] font-mono text-navy-500 mt-0.5">
                        {sector.tickers.join(", ")}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-mono uppercase tracking-wider ${
                        sector.signal === "contrarian_bullish"
                          ? "text-navy-300"
                          : sector.signal === "contrarian_bearish"
                          ? "text-navy-400"
                          : "text-navy-500"
                      }`}
                    >
                      {SIGNAL_LABELS[sector.signal]}
                    </span>
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <span className="font-mono font-light text-lg text-navy-200 tabular-nums">
                        {sector.avgShortPercent.toFixed(2)}%
                      </span>
                      <span className="text-[10px] font-mono text-navy-500 ml-1.5">
                        avg short
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-mono uppercase ${
                        sector.trend === "increasing"
                          ? "text-navy-300"
                          : sector.trend === "decreasing"
                          ? "text-navy-500"
                          : "text-navy-600"
                      }`}
                    >
                      {TREND_LABELS[sector.trend]}
                    </span>
                  </div>

                  {/* Short percent bar */}
                  <div className="mt-3 h-1 bg-navy-800/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-navy-500/40 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (sector.avgShortPercent / maxShortPercent) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Individual Tickers */}
          <section>
            <h2 className="text-[10px] font-mono uppercase tracking-widest text-navy-600 mb-3">
              Individual Tickers
            </h2>
            <div className="border border-navy-800/60 rounded bg-navy-950/80 overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-[80px_1fr_100px_100px_100px_120px] gap-2 px-4 py-2.5 border-b border-navy-800/40">
                <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600">
                  Ticker
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600">
                  Short %
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600 text-right">
                  Short Ratio
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600 text-right">
                  Shares Short
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600 text-right">
                  Change
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600 text-right">
                  Sector
                </span>
              </div>

              {/* Table Rows */}
              {data.entries.map((entry) => (
                <div
                  key={entry.ticker}
                  className="grid grid-cols-[80px_1fr_100px_100px_100px_120px] gap-2 px-4 py-2.5 border-b border-navy-800/20 last:border-b-0 hover:bg-navy-900/30 transition-colors"
                >
                  <span className="font-mono text-xs font-medium text-navy-200">
                    {entry.ticker}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-light text-xs text-navy-200 tabular-nums w-12 shrink-0">
                      {entry.shortPercentFloat.toFixed(2)}%
                    </span>
                    <div className="flex-1 h-1 bg-navy-800/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-navy-500/40 rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            (entry.shortPercentFloat / maxShortPercent) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="font-mono font-light text-xs text-navy-300 tabular-nums text-right">
                    {entry.shortRatio.toFixed(2)}
                  </span>
                  <span className="font-mono font-light text-xs text-navy-400 tabular-nums text-right">
                    {formatNumber(entry.shortInterest)}
                  </span>
                  <span
                    className={`font-mono font-light text-xs tabular-nums text-right ${
                      entry.change > 0
                        ? "text-navy-300"
                        : entry.change < 0
                        ? "text-navy-500"
                        : "text-navy-600"
                    }`}
                  >
                    {entry.change > 0 ? "+" : ""}
                    {entry.change.toFixed(2)}%
                  </span>
                  <span className="font-mono text-[10px] text-navy-500 text-right uppercase tracking-wider self-center">
                    {SECTOR_LABELS[entry.sector] || entry.sector}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
      </UpgradeGate>
    </PageContainer>
  );
}

function StatCard({
  label,
  value,
  suffix,
  valueClass,
}: {
  label: string;
  value: string;
  suffix?: string;
  valueClass?: string;
}) {
  return (
    <div className="border border-navy-800/60 rounded bg-navy-950/80 p-4">
      <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600">
        {label}
      </span>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span
          className={`font-mono font-light text-xl tabular-nums ${
            valueClass || "text-navy-200"
          }`}
        >
          {value}
        </span>
        {suffix && (
          <span className="text-[10px] font-mono text-navy-500">{suffix}</span>
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="border border-navy-800/60 rounded bg-navy-950/80 p-4"
          >
            <Skeleton className="h-3 w-24 mb-3" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
      <div>
        <Skeleton className="h-3 w-20 mb-3" />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="border border-navy-800/60 rounded bg-navy-950/80 p-4"
            >
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-3 w-32 mb-3" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </div>
      <div>
        <Skeleton className="h-3 w-28 mb-3" />
        <div className="border border-navy-800/60 rounded bg-navy-950/80 p-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full mb-1" />
          ))}
        </div>
      </div>
    </div>
  );
}
