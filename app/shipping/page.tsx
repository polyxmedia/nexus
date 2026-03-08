"use client";

import { useState, useEffect, useRef } from "react";
import {
  Anchor,
  AlertTriangle,
  Eye,
  RefreshCw,
  ExternalLink,
  Droplets,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";

// ── Types (mirror lib/shipping) ────────────────────────────────────────────────

type ChokepointId = "hormuz" | "suez" | "malacca" | "mandeb" | "panama";
type ChokepointStatus = "normal" | "elevated" | "disrupted";
type AnomalySeverity = "low" | "medium" | "high" | "critical";

interface Chokepoint {
  id: ChokepointId;
  name: string;
  lat: number;
  lng: number;
  baselineDailyTransits: number;
  estimatedDailyTransits: number;
  status: ChokepointStatus;
  riskFactors: string[];
  riskScore: number;
}

interface TrafficAnomaly {
  id: string;
  chokepoint: ChokepointId;
  chokepointName: string;
  type: string;
  severity: AnomalySeverity;
  detected: string;
  description: string;
}

interface DarkFleetAlert {
  id: string;
  description: string;
  source: string;
  confidence: number;
  commodities: string[];
  detected: string;
  chokepoint?: ChokepointId;
}

interface GdeltMaritimeEvent {
  title: string;
  url: string;
  source: string;
  date: string;
  relevance: number;
}

interface ShippingSnapshot {
  timestamp: string;
  chokepoints: Chokepoint[];
  anomalies: TrafficAnomaly[];
  darkFleetAlerts: DarkFleetAlert[];
  gdeltEvents: GdeltMaritimeEvent[];
  oilPrice: number | null;
  oilPriceChange: number | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_DOT: Record<ChokepointStatus, string> = {
  normal: "bg-navy-500",
  elevated: "bg-accent-amber",
  disrupted: "bg-accent-rose",
};

const STATUS_LABEL: Record<ChokepointStatus, string> = {
  normal: "Normal",
  elevated: "Elevated",
  disrupted: "Disrupted",
};

const STATUS_TEXT_COLOR: Record<ChokepointStatus, string> = {
  normal: "text-navy-400",
  elevated: "text-accent-amber",
  disrupted: "text-accent-rose",
};

const SEVERITY_COLOR: Record<AnomalySeverity, string> = {
  low: "text-navy-400",
  medium: "text-accent-amber",
  high: "text-accent-rose",
  critical: "text-accent-rose font-semibold",
};

const SEVERITY_DOT: Record<AnomalySeverity, string> = {
  low: "bg-navy-500",
  medium: "bg-accent-amber",
  high: "bg-accent-rose",
  critical: "bg-accent-rose animate-pulse",
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ShippingPage() {
  const [snapshot, setSnapshot] = useState<ShippingSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchData() {
    try {
      const res = await fetch("/api/shipping");
      if (!res.ok) throw new Error("Failed to fetch");
      const data: ShippingSnapshot = await res.json();
      setSnapshot(data);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 600_000); // 10 min
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function handleRefresh() {
    setRefreshing(true);
    fetchData();
  }

  const oilLabel =
    snapshot?.oilPrice != null
      ? `WTI $${snapshot.oilPrice.toFixed(2)}${
          snapshot.oilPriceChange != null
            ? ` (${snapshot.oilPriceChange >= 0 ? "+" : ""}${snapshot.oilPriceChange.toFixed(1)}%)`
            : ""
        }`
      : null;

  return (
    <PageContainer
      title="Shipping Intelligence"
      subtitle="Chokepoint monitoring, traffic anomalies, and dark fleet detection"
      actions={
        <div className="flex items-center gap-3">
          {oilLabel && (
            <span className="text-[10px] font-mono text-navy-500">
              <Droplets className="inline h-3 w-3 mr-1 opacity-50" />
              {oilLabel}
            </span>
          )}
          {snapshot && (
            <span className="text-[9px] font-mono text-navy-600">
              {timeAgo(snapshot.timestamp)}
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
      }
    >
      {loading ? (
        <LoadingSkeleton />
      ) : !snapshot ? (
        <div className="text-center py-20">
          <Anchor className="h-5 w-5 text-navy-700 mx-auto mb-3" />
          <p className="text-xs text-navy-500 font-mono">
            Unable to load shipping data
          </p>
        </div>
      ) : (
        <>
          {/* Chokepoint Status Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
            {snapshot.chokepoints.map((cp) => (
              <div
                key={cp.id}
                className="border border-navy-800/60 rounded bg-navy-950/80 p-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`h-2 w-2 rounded-full ${STATUS_DOT[cp.status]}`} />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-navy-400 truncate">
                    {cp.name}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 mb-1.5">
                  <span className="font-mono font-light text-navy-200 text-lg tabular-nums">
                    {cp.estimatedDailyTransits}
                  </span>
                  <span className="text-[9px] font-mono text-navy-600">
                    / {cp.baselineDailyTransits}
                  </span>
                  <span className="text-[9px] font-mono text-navy-600 ml-auto">
                    transits/d
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-mono uppercase tracking-wider ${STATUS_TEXT_COLOR[cp.status]}`}
                  >
                    {STATUS_LABEL[cp.status]}
                  </span>
                  <span className="text-[10px] font-mono tabular-nums text-navy-600">
                    Risk {cp.riskScore}
                  </span>
                </div>
                {cp.riskFactors.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-navy-800/40">
                    {cp.riskFactors.map((rf, i) => (
                      <p
                        key={i}
                        className="text-[10px] font-mono text-navy-600 leading-relaxed"
                      >
                        {rf}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Traffic Anomalies */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-3.5 w-3.5 text-navy-600" />
              <h2 className="text-[10px] font-mono uppercase tracking-widest text-navy-600">
                Traffic Anomalies
              </h2>
              <span className="text-[9px] font-mono text-navy-700 ml-1">
                {snapshot.anomalies.length}
              </span>
            </div>
            {snapshot.anomalies.length === 0 ? (
              <p className="text-[11px] font-mono text-navy-700 py-4 px-3">
                No anomalies detected
              </p>
            ) : (
              <div className="border border-navy-800/60 rounded bg-navy-950/80 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-navy-800/40">
                      <th className="text-left text-[9px] font-mono uppercase tracking-widest text-navy-600 px-3 py-2">
                        Chokepoint
                      </th>
                      <th className="text-left text-[9px] font-mono uppercase tracking-widest text-navy-600 px-3 py-2">
                        Type
                      </th>
                      <th className="text-left text-[9px] font-mono uppercase tracking-widest text-navy-600 px-3 py-2">
                        Severity
                      </th>
                      <th className="text-left text-[9px] font-mono uppercase tracking-widest text-navy-600 px-3 py-2 hidden md:table-cell">
                        Detected
                      </th>
                      <th className="text-left text-[9px] font-mono uppercase tracking-widest text-navy-600 px-3 py-2 hidden lg:table-cell">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.anomalies.map((a) => (
                      <tr
                        key={a.id}
                        className="border-b border-navy-800/20 last:border-0"
                      >
                        <td className="px-3 py-2.5 text-[11px] font-mono text-navy-300">
                          {a.chokepointName}
                        </td>
                        <td className="px-3 py-2.5 text-[11px] font-mono text-navy-400">
                          {a.type}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${SEVERITY_DOT[a.severity]}`}
                            />
                            <span
                              className={`text-[11px] font-mono uppercase tracking-wider ${SEVERITY_COLOR[a.severity]}`}
                            >
                              {a.severity}
                            </span>
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[10px] font-mono text-navy-600 hidden md:table-cell">
                          {timeAgo(a.detected)}
                        </td>
                        <td className="px-3 py-2.5 text-[10px] font-mono text-navy-500 max-w-xs truncate hidden lg:table-cell">
                          {a.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Dark Fleet Alerts */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="h-3.5 w-3.5 text-navy-600" />
              <h2 className="text-[10px] font-mono uppercase tracking-widest text-navy-600">
                Dark Fleet Alerts
              </h2>
              <span className="text-[9px] font-mono text-navy-700 ml-1">
                {snapshot.darkFleetAlerts.length}
              </span>
            </div>
            {snapshot.darkFleetAlerts.length === 0 ? (
              <p className="text-[11px] font-mono text-navy-700 py-4 px-3">
                No dark fleet activity detected
              </p>
            ) : (
              <div className="border border-navy-800/60 rounded bg-navy-950/80 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-navy-800/40">
                      <th className="text-left text-[9px] font-mono uppercase tracking-widest text-navy-600 px-3 py-2">
                        Event
                      </th>
                      <th className="text-left text-[9px] font-mono uppercase tracking-widest text-navy-600 px-3 py-2 hidden md:table-cell">
                        Source
                      </th>
                      <th className="text-left text-[9px] font-mono uppercase tracking-widest text-navy-600 px-3 py-2">
                        Confidence
                      </th>
                      <th className="text-left text-[9px] font-mono uppercase tracking-widest text-navy-600 px-3 py-2 hidden lg:table-cell">
                        Commodities
                      </th>
                      <th className="text-left text-[9px] font-mono uppercase tracking-widest text-navy-600 px-3 py-2 hidden md:table-cell">
                        Detected
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.darkFleetAlerts.map((alert) => (
                      <tr
                        key={alert.id}
                        className="border-b border-navy-800/20 last:border-0"
                      >
                        <td className="px-3 py-2.5 text-[11px] font-mono text-navy-300 max-w-sm">
                          <span className="line-clamp-2">{alert.description}</span>
                        </td>
                        <td className="px-3 py-2.5 text-[10px] font-mono text-navy-500 hidden md:table-cell">
                          {alert.source}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-[11px] font-mono tabular-nums text-navy-300">
                            {(alert.confidence * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-3 py-2.5 hidden lg:table-cell">
                          <div className="flex gap-1 flex-wrap">
                            {alert.commodities.map((c) => (
                              <span
                                key={c}
                                className="text-[9px] font-mono text-navy-500 border border-navy-800/40 rounded px-1.5 py-0.5"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-[10px] font-mono text-navy-600 hidden md:table-cell">
                          {timeAgo(alert.detected)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* GDELT Maritime Events */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Anchor className="h-3.5 w-3.5 text-navy-600" />
              <h2 className="text-[10px] font-mono uppercase tracking-widest text-navy-600">
                Related GDELT Events
              </h2>
              <span className="text-[9px] font-mono text-navy-700 ml-1">
                {snapshot.gdeltEvents.length}
              </span>
            </div>
            {snapshot.gdeltEvents.length === 0 ? (
              <p className="text-[11px] font-mono text-navy-700 py-4 px-3">
                No maritime events found
              </p>
            ) : (
              <div className="divide-y divide-navy-800/40">
                {snapshot.gdeltEvents.map((event, idx) => (
                  <a
                    key={idx}
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-3 py-2.5 px-2 hover:bg-navy-900/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-mono text-navy-300 group-hover:text-navy-100 transition-colors line-clamp-2 leading-relaxed">
                        {event.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-mono text-navy-600">
                          {event.source}
                        </span>
                        <span className="text-navy-800">·</span>
                        <span className="text-[9px] font-mono text-navy-600">
                          {timeAgo(event.date)}
                        </span>
                        {event.relevance > 0.3 && (
                          <>
                            <span className="text-navy-800">·</span>
                            <span className="text-[9px] font-mono tabular-nums text-navy-600">
                              rel {(event.relevance * 100).toFixed(0)}%
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="h-3 w-3 text-navy-800 group-hover:text-navy-500 transition-colors mt-0.5 shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </PageContainer>
  );
}

// ── Loading Skeleton ───────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="border border-navy-800/60 rounded bg-navy-950/80 p-3"
          >
            <Skeleton className="h-3 w-24 mb-3" />
            <Skeleton className="h-6 w-16 mb-2" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="mb-8">
        <Skeleton className="h-3 w-32 mb-3" />
        <div className="border border-navy-800/60 rounded bg-navy-950/80 p-3 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
      <div className="mb-8">
        <Skeleton className="h-3 w-32 mb-3" />
        <div className="border border-navy-800/60 rounded bg-navy-950/80 p-3 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    </>
  );
}
