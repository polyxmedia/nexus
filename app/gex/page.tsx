"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";

interface GEXLevel {
  strike: number;
  callGamma: number;
  putGamma: number;
  netGamma: number;
  callOI: number;
  putOI: number;
}

interface GEXSummary {
  ticker: string;
  spotPrice: number;
  netGEX: number;
  gexSign: "positive" | "negative";
  zeroGammaLevel: number;
  putWall: number;
  callWall: number;
  regime: "dampening" | "amplifying" | "neutral";
  flipDistance: number;
  levels: GEXLevel[];
  dataSource: "live" | "estimated";
  confidence: number;
}

interface GEXSnapshot {
  summaries: GEXSummary[];
  aggregateRegime: "dampening" | "amplifying" | "neutral";
  lastUpdated: string;
}

const REGIME_INFO: Record<string, { label: string; description: string }> = {
  dampening: {
    label: "DAMPENING",
    description:
      "Positive net gamma. Dealer hedging suppresses directional moves. Mean-reverting conditions prevail. Expect lower realized volatility and price magnetism toward high-gamma strikes.",
  },
  amplifying: {
    label: "AMPLIFYING",
    description:
      "Negative net gamma. Dealer hedging amplifies directional moves. Trending conditions prevail. Expect higher realized volatility and potential for outsized moves in either direction.",
  },
  neutral: {
    label: "NEUTRAL",
    description:
      "Net gamma near zero. Market positioned at the inflection point between dampening and amplifying regimes. Directional conviction is low. Watch for regime shifts.",
  },
};

function formatNumber(n: number): string {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(0);
}

function GammaBar({ level, maxAbsGamma }: { level: GEXLevel; maxAbsGamma: number }) {
  const normalizedNet = maxAbsGamma > 0 ? level.netGamma / maxAbsGamma : 0;
  const barWidth = Math.min(Math.abs(normalizedNet) * 100, 100);
  const isPositive = level.netGamma >= 0;

  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="w-16 text-right font-mono text-[11px] text-navy-400 tabular-nums">
        {level.strike.toFixed(0)}
      </span>
      <div className="relative flex h-4 flex-1 items-center">
        {/* Center line */}
        <div className="absolute left-1/2 top-0 h-full w-px bg-navy-700/60" />
        {/* Bar */}
        {isPositive ? (
          <div
            className="absolute left-1/2 h-3 rounded-r bg-navy-400/40"
            style={{ width: `${barWidth / 2}%` }}
          />
        ) : (
          <div
            className="absolute right-1/2 h-3 rounded-l bg-navy-500/40"
            style={{ width: `${barWidth / 2}%` }}
          />
        )}
      </div>
      <span className="w-16 font-mono text-[10px] text-navy-500 tabular-nums">
        {formatNumber(level.netGamma)}
      </span>
    </div>
  );
}

function TickerCard({ summary }: { summary: GEXSummary }) {
  const maxAbsGamma = Math.max(
    ...summary.levels.map((l) => Math.abs(l.netGamma)),
    1
  );

  return (
    <div className="border border-navy-800/60 rounded bg-navy-950/80 p-4">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-base font-semibold text-navy-100 tracking-wide">
              {summary.ticker}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
                summary.dataSource === "live"
                  ? "bg-accent-emerald/15 text-accent-emerald"
                  : "bg-accent-amber/15 text-accent-amber"
              }`}
            >
              {summary.dataSource === "live" ? "LIVE" : "ESTIMATED"}
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-navy-600 mt-1 block">
            {summary.regime}
          </span>
        </div>
        <span className="font-mono text-lg font-light text-navy-200 tabular-nums">
          ${summary.spotPrice.toFixed(2)}
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-3">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600">
            Net GEX
          </span>
          <div className="font-mono font-light text-navy-200 tabular-nums">
            {summary.gexSign === "positive" ? "+" : "-"}
            {formatNumber(Math.abs(summary.netGEX))}
          </div>
        </div>
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600">
            Zero Gamma
          </span>
          <div className="font-mono font-light text-navy-200 tabular-nums">
            ${summary.zeroGammaLevel.toFixed(0)}{" "}
            <span className="text-[10px] text-navy-500">
              ({summary.flipDistance}% from spot)
            </span>
          </div>
        </div>
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600">
            Put Wall
          </span>
          <div className="font-mono font-light text-navy-200 tabular-nums">
            ${summary.putWall.toFixed(0)}
          </div>
        </div>
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600">
            Call Wall
          </span>
          <div className="font-mono font-light text-navy-200 tabular-nums">
            ${summary.callWall.toFixed(0)}
          </div>
        </div>
      </div>

      {/* Confidence */}
      {summary.dataSource === "estimated" && (
        <div className="mb-4">
          <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600">
            Confidence
          </span>
          <div className="mt-1 h-1 w-full rounded-full bg-navy-800">
            <div
              className="h-1 rounded-full bg-navy-500"
              style={{ width: `${summary.confidence * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-navy-600 mt-0.5 block">
            {(summary.confidence * 100).toFixed(0)}%
          </span>
        </div>
      )}

      {/* Gamma Profile */}
      {summary.levels.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600">
              Gamma Profile
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-mono text-navy-600">
                NEG
              </span>
              <span className="text-[9px] font-mono text-navy-600">
                POS
              </span>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {summary.levels.map((level) => (
              <GammaBar
                key={level.strike}
                level={level}
                maxAbsGamma={maxAbsGamma}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GEXPage() {
  const [snapshot, setSnapshot] = useState<GEXSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchGEX = useCallback(async () => {
    try {
      const res = await fetch("/api/gex");
      if (!res.ok) throw new Error("Failed to fetch GEX data");
      const data: GEXSnapshot = await res.json();
      setSnapshot(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGEX();
    intervalRef.current = setInterval(fetchGEX, 15 * 60 * 1000); // refresh every 15 min
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchGEX]);

  const regimeInfo = snapshot
    ? REGIME_INFO[snapshot.aggregateRegime]
    : REGIME_INFO.neutral;

  return (
    <PageContainer
      title="Gamma Exposure"
      subtitle="Net dealer gamma positioning across major ETFs"
    >
      {/* Aggregate Regime Card */}
      <div className="mb-6 border border-navy-800/60 rounded bg-navy-950/80 p-5">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600">
              Aggregate Regime
            </span>
            {loading ? (
              <Skeleton className="mt-2 h-6 w-40" />
            ) : (
              <div className="mt-1 font-mono text-lg font-light tracking-wider text-navy-200">
                {regimeInfo.label}
              </div>
            )}
          </div>
          {snapshot && (
            <span className="font-mono text-[10px] text-navy-600">
              {new Date(snapshot.lastUpdated).toLocaleTimeString()}
            </span>
          )}
        </div>
        {!loading && (
          <p className="mt-3 max-w-2xl text-xs leading-relaxed text-navy-400">
            {regimeInfo.description}
          </p>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 border border-navy-800/60 rounded bg-navy-950/80 p-4">
          <span className="font-mono text-xs text-accent-rose">{error}</span>
        </div>
      )}

      {/* Ticker Cards */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border border-navy-800/60 rounded bg-navy-950/80 p-4"
            >
              <Skeleton className="mb-3 h-5 w-20" />
              <Skeleton className="mb-2 h-4 w-32" />
              <Skeleton className="mb-2 h-4 w-24" />
              <Skeleton className="mb-4 h-4 w-28" />
              <Skeleton className="h-40 w-full" />
            </div>
          ))}
        </div>
      ) : snapshot ? (
        <div className="grid gap-4 md:grid-cols-3">
          {snapshot.summaries.map((s) => (
            <TickerCard key={s.ticker} summary={s} />
          ))}
        </div>
      ) : null}
    </PageContainer>
  );
}
