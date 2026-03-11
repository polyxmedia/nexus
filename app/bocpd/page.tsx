"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { UpgradeGate } from "@/components/subscription/upgrade-gate";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Clock,
  Radar,
  Shield,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Layers,
  Zap,
  ChevronDown,
  ChevronUp,
  Target,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types (mirror of lib/bocpd)
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

interface RegimeSegment {
  startDate: string;
  endDate: string;
  duration: number;
  mean: number;
  std: number;
  trend: number;
  minVal: number;
  maxVal: number;
  label: string;
}

interface PredictiveBounds {
  mean: number;
  std: number;
  upper1Sigma: number;
  lower1Sigma: number;
  upper2Sigma: number;
  lower2Sigma: number;
}

interface RunLengthDist {
  runLengths: number[];
  probabilities: number[];
  mapRunLength: number;
  stabilityScore: number;
}

interface Coincidence {
  date: string;
  streams: string[];
  changePoints: ChangePoint[];
  severity: "moderate" | "significant" | "critical";
}

interface Sparkline {
  dates: string[];
  values: number[];
}

interface StreamState {
  stream: string;
  label: string;
  currentValue: number | null;
  currentRunLength: number;
  lastChangePoint: ChangePoint | null;
  changePoints: ChangePoint[];
  regimeSegments: RegimeSegment[];
  predictive: PredictiveBounds | null;
  runLengthDist: RunLengthDist | null;
  sparkline: Sparkline;
  error?: string;
}

interface Snapshot {
  streams: StreamState[];
  recentChangePoints: ChangePoint[];
  coincidences: Coincidence[];
  activeRegimes: number;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STREAM_META: Record<string, { label: string; color: string; accent: string }> = {
  vix: { label: "VIX", color: "#f43f5e", accent: "accent-rose" },
  gold: { label: "GOLD", color: "#eab308", accent: "accent-amber" },
  oil: { label: "OIL WTI", color: "#06b6d4", accent: "accent-cyan" },
  yield: { label: "US 10Y", color: "#22c55e", accent: "accent-emerald" },
  dxy: { label: "DXY", color: "#a78bfa", accent: "purple-400" },
  signals: { label: "SIG INT", color: "#94a3b8", accent: "navy-400" },
};

const SEVERITY_STYLES = {
  moderate: { bg: "bg-accent-amber/8", border: "border-accent-amber/30", text: "text-accent-amber", label: "MODERATE" },
  significant: { bg: "bg-accent-rose/8", border: "border-accent-rose/30", text: "text-accent-rose", label: "SIGNIFICANT" },
  critical: { bg: "bg-signal-5/10", border: "border-signal-5/40", text: "text-signal-5", label: "CRITICAL" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BOCPDPage() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStream, setExpandedStream] = useState<string | null>(null);
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
    // 4hr poll (matches server cache TTL), pause when tab hidden
    const startPolling = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (document.visibilityState === "visible") {
        intervalRef.current = setInterval(fetchData, 4 * 60 * 60 * 1000);
      }
    };
    startPolling();
    document.addEventListener("visibilitychange", startPolling);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", startPolling);
    };
  }, [fetchData]);

  // Summary stats
  const streamsMonitored = snapshot?.streams.length ?? 0;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentCPs = snapshot?.recentChangePoints.filter(
    (cp) => new Date(cp.date) >= thirtyDaysAgo
  ).length ?? 0;
  const longestRun = snapshot?.streams.reduce(
    (max, s) => Math.max(max, s.currentRunLength), 0
  ) ?? 0;
  const avgStability = snapshot?.streams.reduce(
    (sum, s) => sum + (s.runLengthDist?.stabilityScore ?? 0), 0
  ) ?? 0;
  const avgStabilityPct = streamsMonitored > 0 ? Math.round((avgStability / streamsMonitored) * 100) : 0;
  const recentCoincidences = snapshot?.coincidences.filter(
    (c) => new Date(c.date) >= thirtyDaysAgo
  ) ?? [];
  const criticalCoincidences = recentCoincidences.filter((c) => c.severity === "critical" || c.severity === "significant");

  return (
    <PageContainer
      title="Change-Point Detection"
      subtitle="Bayesian Online Change-Point Detection (Adams & MacKay 2007) with cross-stream coincidence analysis"
    >
      <UpgradeGate minTier="operator" feature="Bayesian change-point detection with regime analysis" blur>

      {/* Cross-Stream Coincidence Alert Banner */}
      {criticalCoincidences.length > 0 && (
        <div className="mb-6 rounded-lg border border-signal-5/30 bg-signal-5/[0.04] p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-signal-5" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-signal-5 font-bold">
              Structural Break Alert
            </span>
          </div>
          <div className="space-y-2">
            {criticalCoincidences.slice(0, 3).map((c, i) => {
              const sev = SEVERITY_STYLES[c.severity];
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className={cn("text-[9px] font-mono font-bold px-1.5 py-0.5 rounded", sev.bg, sev.border, sev.text, "border")}>
                    {sev.label}
                  </span>
                  <span className="text-xs text-navy-300 font-mono tabular-nums">{c.date}</span>
                  <span className="text-[10px] text-navy-400">
                    {c.streams.map((s) => STREAM_META[s]?.label || s).join(" + ")} broke simultaneously
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary KPI Row */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KPICard label="Streams" value={loading ? null : streamsMonitored} icon={<Activity className="h-3.5 w-3.5" />} />
        <KPICard label="Breaks (30d)" value={loading ? null : recentCPs} icon={<Radar className="h-3.5 w-3.5" />} color={recentCPs > 5 ? "rose" : undefined} />
        <KPICard label="Longest Run" value={loading ? null : `${longestRun}d`} icon={<Clock className="h-3.5 w-3.5" />} />
        <KPICard label="Stability" value={loading ? null : `${avgStabilityPct}%`} icon={<Shield className="h-3.5 w-3.5" />} color={avgStabilityPct < 40 ? "rose" : avgStabilityPct < 60 ? "amber" : "emerald"} />
        <KPICard label="Coincidences" value={loading ? null : recentCoincidences.length} icon={<Layers className="h-3.5 w-3.5" />} color={criticalCoincidences.length > 0 ? "rose" : undefined} />
        <KPICard label="Active Regimes" value={loading ? null : snapshot?.activeRegimes ?? 0} icon={<BarChart3 className="h-3.5 w-3.5" />} />
      </div>

      {error && (
        <div className="mb-6 rounded border border-accent-rose/30 bg-accent-rose/5 px-4 py-3 text-xs text-accent-rose font-mono">
          {error}
        </div>
      )}

      {loading && (
        <div className="mb-6 rounded border border-navy-700/40 bg-navy-900/40 px-4 py-3 text-xs text-navy-400 font-mono">
          Loading market data streams. Some streams may show errors if the API rate limit is hit.
        </div>
      )}

      {/* Multi-Stream Regime Map */}
      <div className="mb-6">
        <SectionHeader label="Multi-Stream Regime Map" icon={<Layers className="h-3 w-3" />} />
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : snapshot?.streams ? (
          <div className="rounded-lg border border-navy-800/60 bg-navy-950/80 overflow-hidden">
            {snapshot.streams.map((stream) => (
              <RegimeMapRow key={stream.stream} stream={stream} allDates={getDateRange(snapshot.streams)} />
            ))}
          </div>
        ) : null}
      </div>

      {/* Stream Detail Cards */}
      <div className="mb-6">
        <SectionHeader label="Stream Analysis" icon={<Activity className="h-3 w-3" />} />
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-72 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {snapshot?.streams.map((stream) => (
              <StreamDetailCard
                key={stream.stream}
                stream={stream}
                expanded={expandedStream === stream.stream}
                onToggle={() => setExpandedStream(expandedStream === stream.stream ? null : stream.stream)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Cross-Stream Coincidences */}
      {(snapshot?.coincidences.length ?? 0) > 0 && (
        <div className="mb-6">
          <SectionHeader label="Cross-Stream Coincidences" icon={<Zap className="h-3 w-3" />} />
          <div className="rounded-lg border border-navy-800/60 bg-navy-950/80 divide-y divide-navy-800/30">
            {snapshot?.coincidences.map((c, i) => {
              const sev = SEVERITY_STYLES[c.severity];
              return (
                <div key={i} className="px-4 py-3 flex items-start gap-4">
                  <div className="shrink-0 mt-0.5">
                    <span className={cn("text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border", sev.bg, sev.border, sev.text)}>
                      {sev.label}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs text-navy-200 font-mono tabular-nums">{c.date}</span>
                      <div className="flex gap-1.5">
                        {c.streams.map((s) => {
                          const meta = STREAM_META[s];
                          return (
                            <span key={s} className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm border border-navy-700/40 bg-navy-800/40" style={{ color: meta?.color }}>
                              {meta?.label || s}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {c.changePoints.map((cp, j) => (
                        <span key={j} className="text-[10px] text-navy-500">
                          <span style={{ color: STREAM_META[cp.dataStream]?.color }}>{STREAM_META[cp.dataStream]?.label}</span>
                          {" "}{cp.direction === "up" ? "+" : "-"}{cp.magnitude.toFixed(2)} (P={Math.round(cp.probability * 100)}%)
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Change-Points Table */}
      <div>
        <SectionHeader label="Recent Change-Points" icon={<Target className="h-3 w-3" />} />
        <div className="overflow-x-auto rounded-lg border border-navy-800/60 bg-navy-950/80">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-navy-800/40">
                {["Date", "Stream", "Probability", "Direction", "Prior", "Post", "Magnitude", "Run"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-[9px] font-mono font-medium uppercase tracking-wider text-navy-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-navy-800/20">
                    <td colSpan={8} className="px-4 py-2.5"><Skeleton className="h-4 w-full" /></td>
                  </tr>
                ))
              ) : snapshot?.recentChangePoints.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-xs text-navy-600 font-mono">No change-points detected</td>
                </tr>
              ) : (
                snapshot?.recentChangePoints.slice(0, 30).map((cp, i) => {
                  const meta = STREAM_META[cp.dataStream];
                  return (
                    <tr key={`${cp.date}-${cp.dataStream}-${i}`} className="border-b border-navy-800/20 transition-colors hover:bg-navy-900/30">
                      <td className="px-4 py-2 font-mono text-[11px] tabular-nums text-navy-300">{cp.date}</td>
                      <td className="px-4 py-2">
                        <span className="text-[10px] font-mono font-medium" style={{ color: meta?.color }}>
                          {meta?.label || cp.dataStream}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <ProbabilityBar value={cp.probability} />
                      </td>
                      <td className="px-4 py-2">
                        <DirectionBadge direction={cp.direction} magnitude={cp.magnitude} />
                      </td>
                      <td className="px-4 py-2 font-mono text-[11px] tabular-nums text-navy-400">{cp.priorMean.toFixed(2)}</td>
                      <td className="px-4 py-2 font-mono text-[11px] tabular-nums text-navy-200">{cp.postMean.toFixed(2)}</td>
                      <td className="px-4 py-2 font-mono text-[11px] tabular-nums text-navy-200">{cp.magnitude.toFixed(2)}</td>
                      <td className="px-4 py-2 font-mono text-[11px] tabular-nums text-navy-500">{cp.runLength}d</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Methodology Note */}
      <div className="mt-6 pt-4 border-t border-navy-800/30">
        <p className="text-[9px] font-mono text-navy-700 leading-relaxed">
          Adams, R.P. and MacKay, D.J.C. (2007). "Bayesian Online Changepoint Detection." arXiv:0710.3742.
          Student-t predictive distribution with Lanczos log-gamma. Hazard rate 1/250. Threshold P &gt; 0.50.
          Cross-stream coincidences detected within 5-day windows. Stability score derived from posterior entropy.
        </p>
      </div>

      </UpgradeGate>
    </PageContainer>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="text-navy-600">{icon}</span>
      <span className="text-[10px] font-mono uppercase tracking-widest text-navy-600">{label}</span>
    </div>
  );
}

function KPICard({
  label, value, icon, color,
}: {
  label: string;
  value: string | number | null;
  icon: React.ReactNode;
  color?: "rose" | "amber" | "emerald" | "cyan";
}) {
  const colorClass = color === "rose" ? "text-accent-rose" : color === "amber" ? "text-accent-amber" : color === "emerald" ? "text-accent-emerald" : color === "cyan" ? "text-accent-cyan" : "text-navy-200";
  return (
    <div className="rounded-lg border border-navy-800/60 bg-navy-950/80 px-3 py-3">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="text-navy-600">{icon}</span>
        <span className="text-[9px] font-mono uppercase tracking-widest text-navy-600">{label}</span>
      </div>
      {value === null ? (
        <Skeleton className="h-6 w-12" />
      ) : (
        <span className={cn("font-mono text-xl font-light tabular-nums", colorClass)}>{value}</span>
      )}
    </div>
  );
}

function ProbabilityBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="w-12 h-1.5 bg-navy-800 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full", pct > 80 ? "bg-accent-rose" : pct > 60 ? "bg-accent-amber" : "bg-accent-cyan")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[10px] tabular-nums text-navy-300">{pct}%</span>
    </div>
  );
}

function DirectionBadge({ direction, magnitude }: { direction: "up" | "down"; magnitude: number }) {
  const isUp = direction === "up";
  const intensity = magnitude > 5 ? "high" : magnitude > 1 ? "mid" : "low";
  return (
    <div className={cn(
      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-medium",
      isUp
        ? intensity === "high" ? "bg-accent-rose/15 text-accent-rose" : "bg-accent-amber/15 text-accent-amber"
        : intensity === "high" ? "bg-accent-emerald/15 text-accent-emerald" : "bg-accent-cyan/15 text-accent-cyan"
    )}>
      {isUp ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
      {direction.toUpperCase()}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Regime Map Row (multi-stream timeline)
// ---------------------------------------------------------------------------

function getDateRange(streams: StreamState[]): { minDate: number; maxDate: number } {
  let minDate = Date.now();
  let maxDate = 0;
  for (const s of streams) {
    for (const seg of s.regimeSegments) {
      const start = new Date(seg.startDate).getTime();
      const end = new Date(seg.endDate).getTime();
      if (start < minDate) minDate = start;
      if (end > maxDate) maxDate = end;
    }
  }
  if (maxDate === 0) maxDate = Date.now();
  if (minDate >= maxDate) minDate = maxDate - 90 * 86400000;
  return { minDate, maxDate };
}

function RegimeMapRow({ stream, allDates }: { stream: StreamState; allDates: { minDate: number; maxDate: number } }) {
  const meta = STREAM_META[stream.stream] || { label: stream.stream, color: "#94a3b8" };
  const range = allDates.maxDate - allDates.minDate || 1;

  return (
    <div className="flex items-center border-b border-navy-800/20 last:border-b-0">
      {/* Label */}
      <div className="w-20 shrink-0 px-3 py-2.5">
        <span className="text-[9px] font-mono font-medium uppercase tracking-wider" style={{ color: meta.color }}>
          {meta.label}
        </span>
      </div>

      {/* Timeline */}
      <div className="flex-1 relative h-7 mx-2">
        {/* Background track */}
        <div className="absolute inset-0 bg-navy-900/30 rounded-sm" />

        {/* Regime segments */}
        {stream.regimeSegments.map((seg, i) => {
          const start = new Date(seg.startDate).getTime();
          const end = new Date(seg.endDate).getTime();
          const left = ((start - allDates.minDate) / range) * 100;
          const width = Math.max(0.5, ((end - start) / range) * 100);

          // Color by trend
          const bgColor = seg.trend > 0.001 ? `${meta.color}30` : seg.trend < -0.001 ? `${meta.color}15` : `${meta.color}20`;
          const borderColor = `${meta.color}50`;

          return (
            <div
              key={i}
              className="absolute top-0.5 bottom-0.5 rounded-sm border-l"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: bgColor,
                borderLeftColor: borderColor,
              }}
              title={`${seg.startDate} - ${seg.endDate} | ${seg.label} | mean: ${seg.mean}`}
            />
          );
        })}

        {/* Change-point markers */}
        {stream.changePoints.map((cp, i) => {
          const t = new Date(cp.date).getTime();
          const pct = ((t - allDates.minDate) / range) * 100;
          if (pct < 0 || pct > 100) return null;
          return (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px"
              style={{ left: `${pct}%`, backgroundColor: meta.color, opacity: 0.7 }}
              title={`CP: ${cp.date} P=${Math.round(cp.probability * 100)}%`}
            />
          );
        })}
      </div>

      {/* Current run */}
      <div className="w-16 shrink-0 px-2 text-right">
        <span className="text-[10px] font-mono tabular-nums text-navy-500">
          {stream.currentRunLength}d
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stream Detail Card
// ---------------------------------------------------------------------------

function StreamDetailCard({
  stream, expanded, onToggle,
}: {
  stream: StreamState;
  expanded: boolean;
  onToggle: () => void;
}) {
  const meta = STREAM_META[stream.stream] || { label: stream.stream, color: "#94a3b8" };
  const lastCP = stream.lastChangePoint;
  const stability = stream.runLengthDist?.stabilityScore ?? 0;

  // Sparkline SVG
  const sparklineSVG = useMemo(() => {
    const vals = stream.sparkline.values;
    if (vals.length < 2) return null;
    const w = 200;
    const h = 40;
    const padding = 2;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;

    const points = vals.map((v, i) => {
      const x = padding + (i / (vals.length - 1)) * (w - padding * 2);
      const y = padding + (1 - (v - min) / range) * (h - padding * 2);
      return `${x},${y}`;
    }).join(" ");

    // Find change-point indices in the sparkline date range
    const sparkDates = new Set(stream.sparkline.dates);
    const cpIndices = stream.changePoints
      .map((cp) => stream.sparkline.dates.indexOf(cp.date))
      .filter((idx) => idx >= 0);

    return { points, w, h, cpIndices, valsLen: vals.length, padding, min, max, range };
  }, [stream.sparkline, stream.changePoints]);

  return (
    <div className="rounded-lg border border-navy-800/60 bg-navy-950/80 p-4 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: meta.color }}>
            {meta.label}
          </span>
          {stream.currentValue !== null && (
            <div className="mt-1 font-mono text-xl font-light tabular-nums text-navy-200">
              {stream.currentValue.toFixed(2)}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono text-navy-600 uppercase">Stability</span>
            <StabilityDots score={stability} />
          </div>
          <div className="mt-1 font-mono text-sm tabular-nums text-navy-400">
            {stream.currentRunLength}d run
          </div>
        </div>
      </div>

      {/* Error state */}
      {stream.error && (
        <div className="mb-3 rounded bg-rose-950/30 border border-rose-900/30 px-3 py-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span className="text-[10px] font-mono text-rose-400 uppercase tracking-wider">Data unavailable</span>
          </div>
          <p className="text-[10px] font-mono text-rose-400/60 mt-1">{stream.error}</p>
        </div>
      )}

      {/* Sparkline with change-points */}
      {sparklineSVG && (
        <div className="mb-3 rounded bg-navy-900/30 p-2">
          <svg viewBox={`0 0 ${sparklineSVG.w} ${sparklineSVG.h}`} className="w-full h-10">
            {/* Price line */}
            <polyline
              points={sparklineSVG.points}
              fill="none"
              stroke={meta.color}
              strokeWidth="1.2"
              strokeLinejoin="round"
              opacity="0.7"
            />
            {/* Change-point markers */}
            {sparklineSVG.cpIndices.map((idx, i) => {
              const x = sparklineSVG.padding + (idx / (sparklineSVG.valsLen - 1)) * (sparklineSVG.w - sparklineSVG.padding * 2);
              return (
                <line key={i} x1={x} y1={0} x2={x} y2={sparklineSVG.h} stroke={meta.color} strokeWidth="0.5" strokeDasharray="2 2" opacity="0.5" />
              );
            })}
          </svg>
        </div>
      )}

      {/* Predictive Bounds */}
      {stream.predictive && (
        <div className="mb-3 rounded bg-navy-900/30 px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-mono uppercase tracking-wider text-navy-600">Predictive Bounds</span>
            <TrendingUp className="h-2.5 w-2.5 text-navy-600" />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="text-[8px] font-mono text-navy-700 block">2-sigma</span>
              <span className="text-[10px] font-mono tabular-nums text-navy-500">{stream.predictive.lower2Sigma.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[8px] font-mono text-accent-cyan block">MEAN</span>
              <span className="text-xs font-mono tabular-nums text-navy-200 font-medium">{stream.predictive.mean.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[8px] font-mono text-navy-700 block">2-sigma</span>
              <span className="text-[10px] font-mono tabular-nums text-navy-500">{stream.predictive.upper2Sigma.toFixed(2)}</span>
            </div>
          </div>
          {/* Deviation indicator */}
          {stream.currentValue !== null && stream.predictive.std > 0 && (
            <div className="mt-2 pt-2 border-t border-navy-800/30">
              {(() => {
                const zScore = (stream.currentValue - stream.predictive.mean) / stream.predictive.std;
                const absZ = Math.abs(zScore);
                const label = absZ > 2 ? "EXTREME" : absZ > 1 ? "ELEVATED" : "NORMAL";
                const color = absZ > 2 ? "text-signal-5" : absZ > 1 ? "text-accent-amber" : "text-navy-500";
                return (
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-navy-600">Current deviation</span>
                    <span className={cn("text-[10px] font-mono font-bold tabular-nums", color)}>
                      {zScore > 0 ? "+" : ""}{zScore.toFixed(2)}z ({label})
                    </span>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Last Change-Point */}
      {lastCP ? (
        <div className="mb-3 rounded bg-navy-900/30 px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-mono uppercase tracking-wider text-navy-600">Last Break</span>
            <DirectionBadge direction={lastCP.direction} magnitude={lastCP.magnitude} />
          </div>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[11px] tabular-nums text-navy-300">{lastCP.date}</span>
            <span className="font-mono text-[10px] tabular-nums text-navy-500">P={Math.round(lastCP.probability * 100)}%</span>
            <span className="font-mono text-[10px] tabular-nums text-navy-500">{lastCP.priorMean.toFixed(2)} &rarr; {lastCP.postMean.toFixed(2)}</span>
          </div>
        </div>
      ) : (
        <div className="mb-3 rounded bg-navy-900/30 px-3 py-2">
          <span className="text-[10px] font-mono text-navy-600">No change-points detected</span>
        </div>
      )}

      {/* Expand toggle */}
      <button
        onClick={onToggle}
        className="mt-auto flex items-center justify-center gap-1 pt-2 border-t border-navy-800/30 text-[9px] font-mono text-navy-600 hover:text-navy-400 transition-colors"
      >
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {expanded ? "COLLAPSE" : "REGIME SEGMENTS"}
      </button>

      {/* Expanded: Regime Segments + Run-Length Distribution */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-navy-800/30 space-y-3">
          {/* Regime Segments */}
          {stream.regimeSegments.length > 0 && (
            <div>
              <span className="text-[9px] font-mono uppercase tracking-wider text-navy-600 block mb-2">Regime Segments</span>
              <div className="space-y-1">
                {stream.regimeSegments.slice(-5).reverse().map((seg, i) => (
                  <div key={i} className="rounded bg-navy-900/40 px-2.5 py-1.5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-navy-300">{seg.label}</span>
                      <span className="text-[9px] font-mono text-navy-600 ml-2">{seg.duration}d</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-mono tabular-nums text-navy-500">
                        mean: {seg.mean.toFixed(2)}
                      </span>
                      <span className="text-[9px] font-mono tabular-nums text-navy-600">
                        vol: {seg.std.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Run-Length Distribution */}
          {stream.runLengthDist && stream.runLengthDist.runLengths.length > 0 && (
            <div>
              <span className="text-[9px] font-mono uppercase tracking-wider text-navy-600 block mb-2">Run-Length Posterior</span>
              <div className="flex items-end gap-px h-12">
                {stream.runLengthDist.runLengths.slice(0, 30).map((rl, i) => {
                  const p = stream.runLengthDist!.probabilities[i];
                  const maxP = Math.max(...stream.runLengthDist!.probabilities.slice(0, 30));
                  const h = maxP > 0 ? (p / maxP) * 100 : 0;
                  const isMAP = rl === stream.runLengthDist!.mapRunLength;
                  return (
                    <div
                      key={i}
                      className="flex-1 min-w-[3px] rounded-t-sm transition-all"
                      style={{
                        height: `${h}%`,
                        backgroundColor: isMAP ? meta.color : `${meta.color}40`,
                      }}
                      title={`r=${rl}: P=${(p * 100).toFixed(1)}%`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[8px] font-mono text-navy-700">r=0</span>
                <span className="text-[8px] font-mono text-navy-700">
                  MAP: r={stream.runLengthDist.mapRunLength}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StabilityDots({ score }: { score: number }) {
  const filled = Math.round(score * 5);
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            i < filled
              ? filled >= 4 ? "bg-accent-emerald" : filled >= 2 ? "bg-accent-amber" : "bg-accent-rose"
              : "bg-navy-800"
          )}
        />
      ))}
    </div>
  );
}
