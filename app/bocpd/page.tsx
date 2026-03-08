"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Clock,
  Radar,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChangePoint {
  date: string;
  dataStream: string;
  probability: number;
  runLength: number;
  magnitude: number;
  direction: "up" | "down";
  priorMean: number;
  postMean: number;
}

interface StreamState {
  stream: string;
  label: string;
  currentValue: number | null;
  currentRunLength: number;
  lastChangePoint: ChangePoint | null;
  changePoints: ChangePoint[];
}

interface Snapshot {
  streams: StreamState[];
  recentChangePoints: ChangePoint[];
  activeRegimes: number;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Stream label mapping
// ---------------------------------------------------------------------------

const STREAM_LABELS: Record<string, string> = {
  vix: "VIX",
  gold: "GOLD",
  oil: "OIL WTI",
  yield: "US 10Y",
  dxy: "DXY",
  signals: "SIG INT",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BOCPDPage() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/bocpd");
      if (!res.ok) throw new Error("Failed to fetch BOCPD data");
      const data = await res.json();
      setSnapshot(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 30 * 60 * 1000); // 30 min refresh
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  // Summary stats
  const streamsMonitored = snapshot?.streams.length ?? 0;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentCPs =
    snapshot?.recentChangePoints.filter(
      (cp) => new Date(cp.date) >= thirtyDaysAgo
    ).length ?? 0;
  const longestRun =
    snapshot?.streams.reduce(
      (max, s) => Math.max(max, s.currentRunLength),
      0
    ) ?? 0;

  return (
    <PageContainer
      title="Change-Point Detection"
      subtitle="Bayesian Online Change-Point Detection (Adams & MacKay 2007)"
    >
      {/* Summary Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Streams Monitored"
          value={loading ? null : streamsMonitored}
          icon={<Activity className="h-3.5 w-3.5 text-navy-500" />}
        />
        <SummaryCard
          label="Change-Points (30d)"
          value={loading ? null : recentCPs}
          icon={<Radar className="h-3.5 w-3.5 text-navy-500" />}
        />
        <SummaryCard
          label="Longest Current Run"
          value={loading ? null : `${longestRun}d`}
          icon={<Clock className="h-3.5 w-3.5 text-navy-500" />}
        />
      </div>

      {error && (
        <div className="mb-6 rounded border border-accent-rose/30 bg-accent-rose/5 px-4 py-3 text-xs text-accent-rose">
          {error}
        </div>
      )}

      {/* Stream Cards */}
      <div className="mb-8">
        <div className="mb-3">
          <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600">
            Active Streams
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {snapshot?.streams.map((stream) => (
              <StreamCard key={stream.stream} stream={stream} />
            ))}
          </div>
        )}
      </div>

      {/* Recent Change-Points Table */}
      <div>
        <div className="mb-3">
          <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600">
            Recent Change-Points
          </span>
        </div>

        <div className="overflow-x-auto rounded border border-navy-800/60 bg-navy-950/80">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-navy-800/40">
                <th className="px-4 py-2.5 text-[10px] font-mono font-medium uppercase tracking-wider text-navy-500">
                  Date
                </th>
                <th className="px-4 py-2.5 text-[10px] font-mono font-medium uppercase tracking-wider text-navy-500">
                  Stream
                </th>
                <th className="px-4 py-2.5 text-[10px] font-mono font-medium uppercase tracking-wider text-navy-500">
                  Probability
                </th>
                <th className="px-4 py-2.5 text-[10px] font-mono font-medium uppercase tracking-wider text-navy-500">
                  Direction
                </th>
                <th className="px-4 py-2.5 text-[10px] font-mono font-medium uppercase tracking-wider text-navy-500">
                  Prior Mean
                </th>
                <th className="px-4 py-2.5 text-[10px] font-mono font-medium uppercase tracking-wider text-navy-500">
                  Post Mean
                </th>
                <th className="px-4 py-2.5 text-[10px] font-mono font-medium uppercase tracking-wider text-navy-500">
                  Magnitude
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-navy-800/20">
                    <td colSpan={7} className="px-4 py-2.5">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  </tr>
                ))
              ) : snapshot?.recentChangePoints.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-xs text-navy-500"
                  >
                    No change-points detected
                  </td>
                </tr>
              ) : (
                snapshot?.recentChangePoints.map((cp, i) => (
                  <tr
                    key={`${cp.date}-${cp.dataStream}-${i}`}
                    className="border-b border-navy-800/20 transition-colors hover:bg-navy-900/30"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs font-light tabular-nums text-navy-200">
                      {cp.date}
                    </td>
                    <td className="px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-navy-400">
                      {STREAM_LABELS[cp.dataStream] || cp.dataStream}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs font-light tabular-nums text-navy-200">
                      {(cp.probability * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-2.5">
                      <DirectionIndicator direction={cp.direction} />
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs font-light tabular-nums text-navy-200">
                      {cp.priorMean.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs font-light tabular-nums text-navy-200">
                      {cp.postMean.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs font-light tabular-nums text-navy-200">
                      {cp.magnitude.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageContainer>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number | null;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded border border-navy-800/60 bg-navy-950/80 px-4 py-4">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600">
          {label}
        </span>
      </div>
      {value === null ? (
        <Skeleton className="h-7 w-16" />
      ) : (
        <span className="font-mono text-2xl font-light tabular-nums text-navy-200">
          {value}
        </span>
      )}
    </div>
  );
}

function StreamCard({ stream }: { stream: StreamState }) {
  const label = STREAM_LABELS[stream.stream] || stream.stream;
  const lastCP = stream.lastChangePoint;
  const cps = stream.changePoints;

  // Build timeline
  const timelineWidth = 100; // percent
  const minDate =
    cps.length > 0
      ? new Date(cps[0].date).getTime()
      : Date.now() - 90 * 86400000;
  const maxDate = Date.now();
  const range = maxDate - minDate || 1;

  return (
    <div className="rounded border border-navy-800/60 bg-navy-950/80 p-4">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600">
            {label}
          </span>
          {stream.currentValue !== null && (
            <div className="mt-1 font-mono text-lg font-light tabular-nums text-navy-200">
              {stream.currentValue.toFixed(2)}
            </div>
          )}
        </div>
        <div className="text-right">
          <span className="text-[10px] font-mono uppercase tracking-wider text-navy-600">
            Run Length
          </span>
          <div className="mt-1 font-mono text-lg font-light tabular-nums text-navy-300">
            {stream.currentRunLength}d
          </div>
        </div>
      </div>

      {/* Last Change-Point */}
      {lastCP ? (
        <div className="mb-3 rounded bg-navy-900/40 px-3 py-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
              Last Change-Point
            </span>
            <DirectionIndicator direction={lastCP.direction} />
          </div>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-xs font-light tabular-nums text-navy-300">
              {lastCP.date}
            </span>
            <span className="font-mono text-[10px] tabular-nums text-navy-500">
              P={(lastCP.probability * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      ) : (
        <div className="mb-3 rounded bg-navy-900/40 px-3 py-2">
          <span className="text-[10px] font-mono text-navy-600">
            No change-points detected
          </span>
        </div>
      )}

      {/* Timeline */}
      <div className="relative h-6">
        {/* Baseline */}
        <div className="absolute left-0 right-0 top-1/2 h-px bg-navy-800/60" />

        {/* Change-point dots */}
        {cps.map((cp, i) => {
          const t = new Date(cp.date).getTime();
          const pct = ((t - minDate) / range) * timelineWidth;
          return (
            <div
              key={`${cp.date}-${i}`}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${Math.min(Math.max(pct, 1), 99)}%` }}
              title={`${cp.date} | P=${(cp.probability * 100).toFixed(1)}% | ${cp.direction}`}
            >
              <div className="h-1.5 w-1.5 rounded-full bg-navy-400" />
            </div>
          );
        })}
      </div>

      {/* Timeline labels */}
      <div className="mt-1 flex justify-between">
        <span className="text-[9px] font-mono tabular-nums text-navy-700">
          {cps.length > 0 ? cps[0].date : ""}
        </span>
        <span className="text-[9px] font-mono tabular-nums text-navy-700">
          {cps.length > 0 ? "now" : ""}
        </span>
      </div>
    </div>
  );
}

function DirectionIndicator({ direction }: { direction: "up" | "down" }) {
  return direction === "up" ? (
    <div className="flex items-center gap-1">
      <ArrowUpRight className="h-3 w-3 text-navy-400" />
      <span className="text-[10px] font-mono uppercase text-navy-400">Up</span>
    </div>
  ) : (
    <div className="flex items-center gap-1">
      <ArrowDownRight className="h-3 w-3 text-navy-600" />
      <span className="text-[10px] font-mono uppercase text-navy-600">
        Down
      </span>
    </div>
  );
}
