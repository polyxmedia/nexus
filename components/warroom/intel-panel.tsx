"use client";

import { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/status-dot";
import { Markdown } from "@/components/ui/markdown";
import { OsintFeed } from "./osint-feed";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { WarRoomSignal, WarRoomThesis, OsintEvent, OsintResponse } from "@/lib/warroom/types";
import Link from "next/link";

interface IntelPanelProps {
  signals: WarRoomSignal[];
  thesis: WarRoomThesis | null;
  osintData: OsintResponse | null;
  onOsintEventClick: (event: OsintEvent) => void;
}

const SIGNAL_BORDER_COLORS: Record<number, string> = {
  1: "border-l-signal-1",
  2: "border-l-signal-2",
  3: "border-l-signal-3",
  4: "border-l-signal-4",
  5: "border-l-signal-5",
};

export function IntelPanel({ signals, thesis, osintData, onOsintEventClick }: IntelPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const sortedSignals = [...signals].sort((a, b) => b.intensity - a.intensity);
  const osintCount = osintData?.totalCount ?? 0;

  return (
    <>
      {/* Collapse toggle - outside panel so it's always visible */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 z-40 w-4 h-10 flex items-center justify-center bg-[#0a0a0a]/95 border border-[#1a1a1a] rounded-l text-navy-600 hover:text-navy-300 hover:bg-[#111] transition-all duration-300 pointer-events-auto",
          collapsed ? "right-0 border-r-0" : "right-72 border-r-0"
        )}
      >
        {collapsed ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>

      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 bg-[#080808]/95 backdrop-blur-sm border-l border-[#1a1a1a] z-30 pointer-events-auto flex flex-col wr-panel-right transition-all duration-300 ease-in-out",
          collapsed ? "w-0 overflow-hidden border-l-0" : "w-72 overflow-hidden"
        )}
      >
      <Tabs.Root defaultValue="signals" className="flex flex-col h-full">
        <Tabs.List className="flex border-b border-navy-700/30 shrink-0">
          <Tabs.Trigger
            value="signals"
            className="flex-1 px-3 py-2 text-[10px] font-medium uppercase tracking-widest text-navy-500 data-[state=active]:text-navy-200 data-[state=active]:bg-navy-800/40 transition-colors relative after:bg-accent-cyan"
          >
            Signals
          </Tabs.Trigger>
          <Tabs.Trigger
            value="osint"
            className="flex-1 px-3 py-2 text-[10px] font-medium uppercase tracking-widest text-navy-500 data-[state=active]:text-navy-200 data-[state=active]:bg-navy-800/40 transition-colors flex items-center justify-center gap-2 relative after:bg-accent-amber"
          >
            OSINT
            {osintCount > 0 && (
              <span className="text-[10px] bg-accent-amber/20 text-accent-amber border border-accent-amber/30 rounded-full px-1.5 py-0">
                {osintCount}
              </span>
            )}
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="signals" className="flex-1 overflow-y-auto p-4">
          {/* Signal Feed */}
          <h2 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-3 pb-2 border-b border-navy-700/20">
            Signal Feed
          </h2>

          <div className="space-y-2 mb-6">
            {sortedSignals.slice(0, 15).map((signal) => (
              <Link
                key={signal.id}
                href={`/signals/${signal.uuid}`}
                className={cn(
                  "block rounded-md border border-navy-700/30 bg-navy-800/40 px-3 py-2 border-l-2 transition-all duration-200 wr-card",
                  SIGNAL_BORDER_COLORS[signal.intensity] || "border-l-navy-600"
                )}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] text-navy-200 font-medium truncate mr-2">
                    {signal.title}
                  </span>
                  <StatusDot
                    color={
                      signal.status === "active"
                        ? "green"
                        : signal.status === "upcoming"
                          ? "cyan"
                          : "gray"
                    }
                    label=""
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="category" className="text-[10px]">
                    {signal.category}
                  </Badge>
                  <span className="text-[10px] text-navy-500">
                    {new Date(signal.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Thesis Summary */}
          {thesis && (
            <div>
              <h2 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-3 pb-2 border-b border-navy-700/20">
                Active Thesis
              </h2>

              <div className="border border-navy-700/30 rounded-md bg-navy-800/40 p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-navy-500 uppercase tracking-wider block">
                      Regime
                    </span>
                    <span className="text-xs text-navy-200 font-medium">
                      {thesis.marketRegime.replace("_", " ")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-navy-500 uppercase tracking-wider block">
                      Volatility
                    </span>
                    <span className="text-xs text-navy-200 font-medium">
                      {thesis.volatilityOutlook}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-navy-500 uppercase tracking-wider block">
                      Convergence
                    </span>
                    <span className="text-xs text-navy-200 font-medium">
                      {thesis.convergenceDensity.toFixed(1)}/10
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-navy-500 uppercase tracking-wider block">
                      Confidence
                    </span>
                    <span className="text-xs text-navy-200 font-medium">
                      {(thesis.overallConfidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {thesis.executiveSummary && (
                  <div className="border-t border-navy-700/30 pt-2">
                    <span className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">
                      Summary
                    </span>
                    <div className="text-[10px] leading-relaxed">
                      <Markdown>{thesis.executiveSummary}</Markdown>
                    </div>
                  </div>
                )}

                <Link
                  href={`/thesis/${thesis.uuid}`}
                  className="block text-[10px] text-accent-cyan hover:text-accent-cyan/80 text-center pt-1"
                >
                  View Full Thesis
                </Link>
              </div>
            </div>
          )}
        </Tabs.Content>

        <Tabs.Content value="osint" className="flex-1 overflow-y-auto p-4">
          <h2 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-3 pb-2 border-b border-navy-700/20">
            OSINT Intelligence Feed
          </h2>
          <OsintFeed
            events={osintData?.events ?? []}
            onEventClick={onOsintEventClick}
          />
        </Tabs.Content>
      </Tabs.Root>
    </div>
    </>
  );
}
