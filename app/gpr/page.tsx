"use client";

import { useEffect, useState, useCallback } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";

interface GPRReading {
  date: string;
  composite: number;
  threats: number;
  acts: number;
  threatsToActsRatio: number;
}

interface RegionalGPR {
  region: string;
  score: number;
  trend: "rising" | "falling" | "stable";
  topEvents: string[];
  assetExposure: string[];
}

interface ThresholdCrossing {
  date: string;
  level: "elevated" | "crisis" | "extreme";
  value: number;
  direction: "crossed_above" | "crossed_below";
}

interface GPRSnapshot {
  current: GPRReading;
  history: GPRReading[];
  regional: RegionalGPR[];
  thresholdCrossings: ThresholdCrossing[];
  lastUpdated: string;
}

function classifyRatio(ratio: number): {
  label: string;
  description: string;
} {
  if (ratio > 2) return { label: "HIGH TENSION", description: "Threats far exceed acts. Tension building phase." };
  if (ratio > 1.3) return { label: "TENSION BUILDING", description: "Threat rhetoric outpacing actual events." };
  if (ratio > 0.7) return { label: "EQUILIBRIUM", description: "Threats and acts roughly balanced." };
  return { label: "DE-ESCALATION", description: "Acts subsiding relative to threat posture." };
}

function classifyLevel(value: number): string {
  if (value >= 300) return "EXTREME";
  if (value >= 200) return "CRISIS";
  if (value >= 150) return "ELEVATED";
  if (value >= 100) return "MODERATE";
  return "BASELINE";
}

export default function GPRPage() {
  const [data, setData] = useState<GPRSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/gpr");
      if (!res.ok) throw new Error("Failed to fetch GPR data");
      const snapshot: GPRSnapshot = await res.json();
      setData(snapshot);
    } catch (err) {
      console.error("[GPR] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <PageContainer title="GPR Index" subtitle="Geopolitical Risk Decomposition">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-20" />
          <Skeleton className="h-64" />
        </div>
      </PageContainer>
    );
  }

  if (!data) {
    return (
      <PageContainer title="GPR Index" subtitle="Geopolitical Risk Decomposition">
        <div className="border border-navy-800/60 rounded bg-navy-950/80 p-6">
          <p className="text-sm text-navy-400 font-mono">No GPR data available.</p>
        </div>
      </PageContainer>
    );
  }

  const { current, history, regional, thresholdCrossings } = data;
  const ratioInfo = classifyRatio(current.threatsToActsRatio);
  const levelLabel = classifyLevel(current.composite);

  return (
    <PageContainer title="GPR Index" subtitle="Threats vs Acts Decomposition // Caldara-Iacoviello">
      {/* Top Cards: Composite, Threats, Acts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="border border-navy-800/60 rounded bg-navy-950/80 p-5">
          <div className="text-[10px] font-mono uppercase tracking-widest text-navy-600 mb-3">
            Composite GPR
          </div>
          <div className="font-mono font-light text-3xl text-navy-200 tabular-nums">
            {current.composite.toFixed(1)}
          </div>
          <div className="mt-2 text-[10px] font-mono uppercase tracking-wider text-navy-500">
            {levelLabel} // {current.date}
          </div>
        </div>

        <div className="border border-navy-800/60 rounded bg-navy-950/80 p-5">
          <div className="text-[10px] font-mono uppercase tracking-widest text-navy-600 mb-3">
            Threats Sub-Index
          </div>
          <div className="font-mono font-light text-3xl text-navy-200 tabular-nums">
            {current.threats.toFixed(1)}
          </div>
          <div className="mt-2 text-[10px] font-mono uppercase tracking-wider text-navy-500">
            Threat rhetoric and posturing
          </div>
        </div>

        <div className="border border-navy-800/60 rounded bg-navy-950/80 p-5">
          <div className="text-[10px] font-mono uppercase tracking-widest text-navy-600 mb-3">
            Acts Sub-Index
          </div>
          <div className="font-mono font-light text-3xl text-navy-200 tabular-nums">
            {current.acts.toFixed(1)}
          </div>
          <div className="mt-2 text-[10px] font-mono uppercase tracking-wider text-navy-500">
            Realized geopolitical events
          </div>
        </div>
      </div>

      {/* Threats-to-Acts Ratio */}
      <div className="border border-navy-800/60 rounded bg-navy-950/80 p-5 mb-6">
        <div className="text-[10px] font-mono uppercase tracking-widest text-navy-600 mb-3">
          Threats-to-Acts Ratio
        </div>
        <div className="flex items-baseline gap-4">
          <span className="font-mono font-light text-2xl text-navy-200 tabular-nums">
            {current.threatsToActsRatio.toFixed(2)}
          </span>
          <span className="font-mono text-xs text-navy-400">
            {ratioInfo.label}
          </span>
        </div>
        <div className="mt-2 text-xs text-navy-500">
          {ratioInfo.description}
        </div>
        <div className="mt-3 flex items-center gap-4 text-[10px] font-mono text-navy-600">
          <span>&gt;1.0 = tension building</span>
          <span>&lt;1.0 = de-escalation</span>
          <span>&gt;2.0 = high divergence</span>
        </div>
      </div>

      {/* 30-Day History */}
      <div className="mb-6">
        <div className="text-[10px] font-mono uppercase tracking-widest text-navy-600 mb-3">
          30-Day History
        </div>
        <div className="border border-navy-800/60 rounded bg-navy-950/80 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-navy-800/40">
                <th className="text-left text-[10px] font-mono uppercase tracking-wider text-navy-600 px-4 py-2">
                  Date
                </th>
                <th className="text-right text-[10px] font-mono uppercase tracking-wider text-navy-600 px-4 py-2">
                  Composite
                </th>
                <th className="text-right text-[10px] font-mono uppercase tracking-wider text-navy-600 px-4 py-2">
                  Threats
                </th>
                <th className="text-right text-[10px] font-mono uppercase tracking-wider text-navy-600 px-4 py-2">
                  Acts
                </th>
                <th className="text-right text-[10px] font-mono uppercase tracking-wider text-navy-600 px-4 py-2">
                  T/A Ratio
                </th>
              </tr>
            </thead>
            <tbody>
              {history.map((r, i) => (
                <tr
                  key={r.date + i}
                  className="border-b border-navy-800/20 last:border-0"
                >
                  <td className="px-4 py-1.5 font-mono text-xs text-navy-400 tabular-nums">
                    {r.date}
                  </td>
                  <td className="px-4 py-1.5 font-mono text-xs text-navy-200 tabular-nums text-right">
                    {r.composite.toFixed(1)}
                  </td>
                  <td className="px-4 py-1.5 font-mono text-xs text-navy-300 tabular-nums text-right">
                    {r.threats.toFixed(1)}
                  </td>
                  <td className="px-4 py-1.5 font-mono text-xs text-navy-300 tabular-nums text-right">
                    {r.acts.toFixed(1)}
                  </td>
                  <td className="px-4 py-1.5 font-mono text-xs text-navy-400 tabular-nums text-right">
                    {r.threatsToActsRatio.toFixed(2)}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-4 font-mono text-xs text-navy-500 text-center"
                  >
                    No history available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Regional GPR */}
      <div className="mb-6">
        <div className="text-[10px] font-mono uppercase tracking-widest text-navy-600 mb-3">
          Regional GPR Proxies
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {regional.map((r) => (
            <div
              key={r.region}
              className="border border-navy-800/60 rounded bg-navy-950/80 p-4"
            >
              <div className="flex items-baseline justify-between mb-2">
                <span className="font-mono text-xs text-navy-300 uppercase tracking-wider">
                  {r.region}
                </span>
                <span className="font-mono text-xs text-navy-500">
                  {r.trend}
                </span>
              </div>
              <div className="font-mono font-light text-2xl text-navy-200 tabular-nums mb-3">
                {r.score}
              </div>
              {r.topEvents.length > 0 && (
                <div className="mb-3 space-y-1">
                  {r.topEvents.map((event, i) => (
                    <div
                      key={i}
                      className="text-[11px] text-navy-400 leading-tight truncate"
                    >
                      {event}
                    </div>
                  ))}
                </div>
              )}
              <div className="text-[10px] font-mono text-navy-600 uppercase tracking-wider">
                {r.assetExposure.join(", ")}
              </div>
            </div>
          ))}
          {regional.length === 0 && (
            <div className="col-span-full border border-navy-800/60 rounded bg-navy-950/80 p-4">
              <p className="font-mono text-xs text-navy-500">
                No regional data available
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Threshold Crossings */}
      <div className="mb-6">
        <div className="text-[10px] font-mono uppercase tracking-widest text-navy-600 mb-3">
          Threshold Crossings
        </div>
        <div className="border border-navy-800/60 rounded bg-navy-950/80">
          {thresholdCrossings.length > 0 ? (
            <div className="divide-y divide-navy-800/20">
              {thresholdCrossings.map((tc, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-xs text-navy-400 tabular-nums">
                      {tc.date}
                    </span>
                    <span
                      className={
                        tc.level === "extreme"
                          ? "font-mono text-[10px] uppercase tracking-wider text-navy-300"
                          : tc.level === "crisis"
                          ? "font-mono text-[10px] uppercase tracking-wider text-navy-300"
                          : "font-mono text-[10px] uppercase tracking-wider text-navy-400"
                      }
                    >
                      {tc.level}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-navy-200 tabular-nums">
                      {tc.value.toFixed(1)}
                    </span>
                    <span className="font-mono text-[10px] text-navy-500">
                      {tc.direction === "crossed_above" ? "above" : "below"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-4">
              <p className="font-mono text-xs text-navy-500">
                No recent threshold crossings detected
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-[10px] font-mono text-navy-700 mt-4">
        Last updated: {new Date(data.lastUpdated).toLocaleString()} // Source: Caldara-Iacoviello GPR Index + GDELT
      </div>
    </PageContainer>
  );
}
