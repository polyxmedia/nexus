"use client";

import { Ship } from "lucide-react";

interface Vessel {
  name: string;
  mmsi: string;
  flag: string;
  vesselType: string;
  lat: number;
  lng: number;
  speed: number;
  course: number;
  destination: string;
}

interface VesselTrackingData {
  totalVessels?: number;
  militaryCount?: number;
  byFlag?: Record<string, number>;
  byType?: Record<string, number>;
  vessels?: Vessel[];
  filters?: {
    flag: string;
    vesselType: string;
    region: string;
  };
  note?: string;
  error?: string;
}

function typeColor(type: string): string {
  if (type === "military") return "text-accent-rose";
  if (type === "tanker") return "text-accent-amber";
  if (type === "cargo") return "text-accent-cyan";
  if (type === "passenger") return "text-purple-400";
  if (type === "fishing") return "text-navy-400";
  return "text-navy-300";
}

function typeBadge(type: string): string {
  if (type === "military") return "bg-accent-rose/10 border-accent-rose/20 text-accent-rose";
  if (type === "tanker") return "bg-accent-amber/10 border-accent-amber/20 text-accent-amber";
  if (type === "cargo") return "bg-accent-cyan/10 border-accent-cyan/20 text-accent-cyan";
  if (type === "passenger") return "bg-purple-500/10 border-purple-500/20 text-purple-400";
  return "bg-navy-800/40 border-navy-700/30 text-navy-400";
}

function regionLabel(region: string): string {
  const labels: Record<string, string> = {
    hormuz: "Strait of Hormuz",
    suez: "Suez Canal",
    mandeb: "Bab el-Mandeb",
    south_china_sea: "South China Sea",
    taiwan_strait: "Taiwan Strait",
    mediterranean: "Mediterranean",
    malacca: "Malacca Strait",
    all: "Global",
  };
  return labels[region] || region;
}

export function VesselTrackingWidget({ data }: { data: VesselTrackingData }) {
  if (data?.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        Vessel tracking error: {data.error}
      </div>
    );
  }

  const vessels = data?.vessels || [];
  const byFlag = data?.byFlag || {};
  const byType = data?.byType || {};
  const filters = data?.filters;
  const militaryCount = data?.militaryCount || 0;
  const totalVessels = data?.totalVessels || 0;

  const flagEntries = Object.entries(byFlag).sort((a, b) => b[1] - a[1]);
  const typeEntries = Object.entries(byType).sort((a, b) => b[1] - a[1]);

  return (
    <div className="my-2 space-y-3">
      {/* Header */}
      <div className="border border-navy-700/40 rounded bg-navy-900/60 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Ship className="h-3.5 w-3.5 text-accent-cyan" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
              Vessel Tracking
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-navy-400">
              <span className="text-navy-200 tabular-nums">{totalVessels}</span> vessels
            </span>
            {militaryCount > 0 && (
              <span className="text-[10px] font-mono text-accent-rose">
                <span className="tabular-nums">{militaryCount}</span> military
              </span>
            )}
          </div>
        </div>

        {/* Active filters */}
        {filters && (filters.flag !== "all" || filters.vesselType !== "all" || filters.region !== "all") && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {filters.region !== "all" && (
              <span className="text-[9px] font-mono text-accent-cyan bg-accent-cyan/10 border border-accent-cyan/20 rounded px-1.5 py-0.5">
                {regionLabel(filters.region)}
              </span>
            )}
            {filters.flag !== "all" && (
              <span className="text-[9px] font-mono text-accent-amber bg-accent-amber/10 border border-accent-amber/20 rounded px-1.5 py-0.5">
                {filters.flag}
              </span>
            )}
            {filters.vesselType !== "all" && (
              <span className="text-[9px] font-mono text-navy-300 bg-navy-800/40 border border-navy-700/30 rounded px-1.5 py-0.5">
                {filters.vesselType}
              </span>
            )}
          </div>
        )}

        {/* Breakdown by type */}
        {typeEntries.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {typeEntries.map(([type, count]) => (
              <div key={type} className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${type === "military" ? "bg-accent-rose" : type === "tanker" ? "bg-accent-amber" : type === "cargo" ? "bg-accent-cyan" : type === "passenger" ? "bg-purple-400" : "bg-navy-500"}`} />
                <span className={`text-[10px] font-mono ${typeColor(type)}`}>
                  {type}
                </span>
                <span className="text-[10px] font-mono text-navy-600 tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* By flag breakdown */}
      {flagEntries.length > 1 && (
        <div className="border border-navy-700/40 rounded bg-navy-900/60 p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-2">
            By Flag
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
            {flagEntries.map(([flag, count]) => (
              <div key={flag} className="flex items-center justify-between">
                <span className={`text-[10px] font-mono ${flag.includes("Navy") ? "text-accent-rose" : "text-navy-300"}`}>
                  {flag}
                </span>
                <span className="text-[10px] font-mono text-navy-500 tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vessel list */}
      {vessels.length > 0 && (
        <div className="border border-navy-700/40 rounded bg-navy-900/60 p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-2">
            Vessels
          </div>
          <div className="space-y-1.5">
            {vessels.slice(0, 20).map((v) => (
              <div
                key={v.mmsi}
                className="flex items-center gap-2 group"
              >
                <span className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${typeBadge(v.vesselType)}`}>
                  {v.vesselType.slice(0, 3)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-navy-200 truncate">
                      {v.name}
                    </span>
                    <span className="text-[9px] font-mono text-navy-600">
                      {v.flag}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[9px] font-mono text-navy-500 tabular-nums">
                    {v.speed}kn
                  </span>
                  <span className="text-[9px] font-mono text-navy-500 tabular-nums">
                    {v.course}&deg;
                  </span>
                  {v.destination && (
                    <span className="text-[9px] font-mono text-navy-600 truncate max-w-[80px]">
                      {v.destination}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {vessels.length > 20 && (
              <div className="text-[9px] font-mono text-navy-600 pt-1">
                +{vessels.length - 20} more vessels
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {vessels.length === 0 && !data?.error && (
        <div className="border border-navy-700/40 rounded bg-navy-900/60 p-3 text-center">
          <span className="text-[10px] font-mono text-navy-500">
            No vessels matching filters
          </span>
        </div>
      )}
    </div>
  );
}
