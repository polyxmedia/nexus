"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  X,
  Shield,
  Zap,
  Globe,
  Cpu,
  Eye,
  Users,
  Landmark,
  Atom,
  Fuel,
  TrendingUp,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import type { OsintEvent, AircraftState, VesselState } from "@/lib/warroom/types";
import type { PowerProfile } from "@/lib/game-theory/countries";
import Link from "next/link";

interface CountryData {
  country: {
    code: string;
    name: string;
    lat: number;
    lng: number;
    region: string;
    weight: number;
    actorId: string | null;
  };
  instabilityIndex: number;
  capabilities: PowerProfile;
  signals: {
    id: number;
    uuid: string;
    title: string;
    date: string;
    intensity: number;
    category: string;
    status: string;
  }[];
  predictions: {
    id: number;
    uuid: string;
    claim: string;
    confidence: number;
    deadline: string;
    outcome: string | null;
    category: string;
  }[];
  conflictZones: {
    name: string;
    escalationLevel: number;
  }[];
}

interface CountryDetailPanelProps {
  countryCode: string | null;
  onClose: () => void;
  osintEvents: OsintEvent[];
  aircraft: AircraftState[];
  vessels: VesselState[];
  newsArticles: { title: string; url: string; source: string; date: string }[];
}

const CAPABILITY_ICONS: Record<string, typeof Shield> = {
  military: Shield,
  nuclear: Atom,
  economic: TrendingUp,
  energy: Fuel,
  tech: Cpu,
  intel: Eye,
  cyber: Zap,
  proxy: Users,
  diplomatic: Landmark,
};

const CAPABILITY_COLORS: Record<string, string> = {
  military: "bg-accent-rose",
  nuclear: "bg-signal-5",
  economic: "bg-accent-emerald",
  energy: "bg-accent-amber",
  tech: "bg-accent-cyan",
  intel: "bg-navy-400",
  cyber: "bg-purple-500",
  proxy: "bg-orange-500",
  diplomatic: "bg-blue-400",
};

const INTENSITY_COLORS: Record<number, string> = {
  1: "text-signal-1",
  2: "text-signal-2",
  3: "text-signal-3",
  4: "text-signal-4",
  5: "text-signal-5",
};

function InstabilityMeter({ value }: { value: number }) {
  const color =
    value >= 75 ? "bg-signal-5" :
    value >= 50 ? "bg-signal-4" :
    value >= 25 ? "bg-signal-3" :
    "bg-signal-2";

  const label =
    value >= 75 ? "CRITICAL" :
    value >= 50 ? "ELEVATED" :
    value >= 25 ? "MODERATE" :
    "LOW";

  const labelColor =
    value >= 75 ? "text-signal-5" :
    value >= 50 ? "text-signal-4" :
    value >= 25 ? "text-signal-3" :
    "text-signal-2";

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500">
          Instability Index
        </span>
        <div className="flex items-center gap-2">
          <span className={cn("text-[10px] font-mono font-bold", labelColor)}>
            {label}
          </span>
          <span className="text-[11px] font-mono font-bold text-navy-200 tabular-nums">
            {value}/100
          </span>
        </div>
      </div>
      <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function CapabilityBar({ dimension, value }: { dimension: string; value: number }) {
  const Icon = CAPABILITY_ICONS[dimension] || Shield;
  const barColor = CAPABILITY_COLORS[dimension] || "bg-navy-500";

  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3 w-3 text-navy-500 shrink-0" />
      <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 w-12 shrink-0">
        {dimension.slice(0, 4)}
      </span>
      <div className="flex-1 h-1 bg-navy-800 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full", barColor)}
          style={{ width: `${value}%`, opacity: Math.max(0.3, value / 100) }}
        />
      </div>
      <span className="text-[9px] font-mono text-navy-400 tabular-nums w-6 text-right">
        {value}
      </span>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function CountryDetailPanel({
  countryCode,
  onClose,
  osintEvents,
  aircraft,
  vessels,
  newsArticles,
}: CountryDetailPanelProps) {
  const [data, setData] = useState<CountryData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCountryData = useCallback(async (code: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/warroom/country/${code}`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch {
      // silent
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (countryCode) {
      fetchCountryData(countryCode);
    } else {
      setData(null);
    }
  }, [countryCode, fetchCountryData]);

  if (!countryCode) return null;

  // Filter OSINT events for this country (by country name match)
  const countryName = data?.country.name.toLowerCase() ?? "";
  const countryOsint = osintEvents.filter(
    (e) =>
      e.country.toLowerCase() === countryName ||
      e.location.toLowerCase().includes(countryName)
  ).slice(0, 15);

  // Filter nearby aircraft (within ~5 degrees)
  const lat = data?.country.lat ?? 0;
  const lng = data?.country.lng ?? 0;
  const nearbyAircraft = aircraft.filter((ac) => {
    const dlat = Math.abs(ac.lat - lat);
    const dlng = Math.abs(ac.lng - lng);
    return dlat < 5 && dlng < 5;
  });
  const militaryAircraft = nearbyAircraft.filter((ac) => ac.isMilitary);

  // Filter nearby vessels
  const nearbyVessels = vessels.filter((v) => {
    const dlat = Math.abs(v.lat - lat);
    const dlng = Math.abs(v.lng - lng);
    return dlat < 5 && dlng < 5;
  });
  const militaryVessels = nearbyVessels.filter((v) => v.vesselType === "military");

  // Filter news for this country
  const countryNews = newsArticles.filter(
    (a) => a.title.toLowerCase().includes(countryName)
  ).slice(0, 8);

  return (
    <div
      className={cn(
        "absolute right-0 top-0 bottom-0 z-50 pointer-events-auto transition-all duration-300 ease-in-out",
        "w-80 bg-navy-900/98 backdrop-blur-sm border-l border-navy-700 flex flex-col"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-navy-700 shrink-0">
        <div className="flex items-center gap-2.5">
          <Globe className="h-4 w-4 text-accent-cyan" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-navy-100">
                {data?.country.name ?? countryCode}
              </span>
              <span className="text-[9px] font-mono text-navy-600 bg-navy-800/60 px-1.5 py-0.5 rounded">
                {countryCode}
              </span>
            </div>
            {data && (
              <span className="text-[9px] font-mono text-navy-600">
                {data.country.region}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-navy-600 hover:text-navy-300 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-4 w-4 text-accent-cyan animate-spin" />
          </div>
        ) : data ? (
          <div className="p-4 space-y-5">
            {/* Instability Index */}
            <InstabilityMeter value={data.instabilityIndex} />

            {/* Nearby Conflict Zones */}
            {data.conflictZones.length > 0 && (
              <div>
                <h3 className="text-[9px] font-mono uppercase tracking-wider text-navy-500 mb-2 pb-1.5 border-b border-navy-700/20">
                  Active Conflict Zones
                </h3>
                <div className="space-y-1">
                  {data.conflictZones.map((z) => (
                    <div
                      key={z.name}
                      className="flex items-center justify-between px-2 py-1.5 rounded border border-navy-700/30 bg-navy-800/40"
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-3 w-3 text-accent-rose" />
                        <span className="text-[10px] text-navy-200">
                          {z.name}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "text-[9px] font-mono font-bold",
                          z.escalationLevel >= 4 ? "text-signal-5" :
                          z.escalationLevel >= 3 ? "text-signal-4" :
                          "text-signal-2"
                        )}
                      >
                        LVL {z.escalationLevel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Signals */}
            <div>
              <h3 className="text-[9px] font-mono uppercase tracking-wider text-navy-500 mb-2 pb-1.5 border-b border-navy-700/20">
                Active Signals ({data.signals.length})
              </h3>
              {data.signals.length === 0 ? (
                <p className="text-[10px] text-navy-600 font-mono">
                  No active signals
                </p>
              ) : (
                <div className="space-y-1">
                  {data.signals.slice(0, 10).map((sig) => (
                    <Link
                      key={sig.id}
                      href={`/signals/${sig.uuid}`}
                      className="block px-2 py-1.5 rounded border border-navy-700/30 bg-navy-800/40 hover:bg-navy-800/60 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-navy-200 truncate mr-2 group-hover:text-navy-100">
                          {sig.title}
                        </span>
                        <span
                          className={cn(
                            "text-[9px] font-mono font-bold tabular-nums shrink-0",
                            INTENSITY_COLORS[sig.intensity] || "text-navy-400"
                          )}
                        >
                          {sig.intensity}/5
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-mono text-navy-600 uppercase">
                          {sig.category}
                        </span>
                        <span className="text-[9px] font-mono text-navy-700">
                          {timeAgo(sig.date)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* OSINT Timeline */}
            <div>
              <h3 className="text-[9px] font-mono uppercase tracking-wider text-navy-500 mb-2 pb-1.5 border-b border-navy-700/20">
                OSINT Events ({countryOsint.length})
              </h3>
              {countryOsint.length === 0 ? (
                <p className="text-[10px] text-navy-600 font-mono">
                  No recent events
                </p>
              ) : (
                <div className="space-y-1">
                  {countryOsint.slice(0, 8).map((evt) => (
                    <div
                      key={evt.id}
                      className="px-2 py-1.5 rounded border border-navy-700/30 bg-navy-800/40"
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className={cn(
                            "text-[8px] font-mono font-bold uppercase px-1 py-0.5 rounded",
                            evt.eventType === "battles" ? "bg-signal-5/20 text-signal-5" :
                            evt.eventType === "explosions" ? "bg-accent-amber/20 text-accent-amber" :
                            evt.eventType === "protests" ? "bg-accent-cyan/20 text-accent-cyan" :
                            "bg-navy-700/40 text-navy-400"
                          )}
                        >
                          {evt.eventType.replace(/_/g, " ")}
                        </span>
                        <span className="text-[8px] font-mono text-navy-700">
                          {timeAgo(evt.date)}
                        </span>
                        {evt.fatalities > 0 && (
                          <span className="text-[8px] font-mono text-signal-5">
                            {evt.fatalities} KIA
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-navy-300 leading-tight line-clamp-2">
                        {evt.notes || evt.location}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top News */}
            {countryNews.length > 0 && (
              <div>
                <h3 className="text-[9px] font-mono uppercase tracking-wider text-navy-500 mb-2 pb-1.5 border-b border-navy-700/20">
                  Top News ({countryNews.length})
                </h3>
                <div className="space-y-1">
                  {countryNews.map((article, i) => (
                    <a
                      key={i}
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-2 py-1.5 rounded border border-navy-700/30 bg-navy-800/40 hover:bg-navy-800/60 transition-colors group"
                    >
                      <p className="text-[10px] text-navy-200 leading-tight line-clamp-2 group-hover:text-navy-100">
                        {article.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-mono text-navy-600">
                          {article.source}
                        </span>
                        <span className="text-[9px] font-mono text-navy-700">
                          {timeAgo(article.date)}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Military Activity */}
            <div>
              <h3 className="text-[9px] font-mono uppercase tracking-wider text-navy-500 mb-2 pb-1.5 border-b border-navy-700/20">
                Military Activity
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="px-2.5 py-2 rounded border border-navy-700/30 bg-navy-800/40">
                  <span className="text-[8px] font-mono text-navy-600 uppercase block mb-1">
                    Aircraft
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-mono font-bold text-navy-200 tabular-nums">
                      {nearbyAircraft.length}
                    </span>
                    {militaryAircraft.length > 0 && (
                      <span className="text-[9px] font-mono text-accent-rose">
                        {militaryAircraft.length} MIL
                      </span>
                    )}
                  </div>
                </div>
                <div className="px-2.5 py-2 rounded border border-navy-700/30 bg-navy-800/40">
                  <span className="text-[8px] font-mono text-navy-600 uppercase block mb-1">
                    Vessels
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-mono font-bold text-navy-200 tabular-nums">
                      {nearbyVessels.length}
                    </span>
                    {militaryVessels.length > 0 && (
                      <span className="text-[9px] font-mono text-accent-rose">
                        {militaryVessels.length} MIL
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Capability Profile */}
            <div>
              <h3 className="text-[9px] font-mono uppercase tracking-wider text-navy-500 mb-2 pb-1.5 border-b border-navy-700/20">
                Capability Profile
              </h3>
              <div className="space-y-1.5">
                {(Object.entries(data.capabilities) as [string, number][])
                  .sort(([, a], [, b]) => b - a)
                  .map(([dim, val]) => (
                    <CapabilityBar key={dim} dimension={dim} value={val} />
                  ))}
              </div>
            </div>

            {/* Predictions */}
            {data.predictions.length > 0 && (
              <div>
                <h3 className="text-[9px] font-mono uppercase tracking-wider text-navy-500 mb-2 pb-1.5 border-b border-navy-700/20">
                  Prediction Markets ({data.predictions.length})
                </h3>
                <div className="space-y-1">
                  {data.predictions.map((pred) => (
                    <Link
                      key={pred.id}
                      href={`/predictions`}
                      className="block px-2 py-1.5 rounded border border-navy-700/30 bg-navy-800/40 hover:bg-navy-800/60 transition-colors group"
                    >
                      <p className="text-[10px] text-navy-200 leading-tight line-clamp-2 group-hover:text-navy-100">
                        {pred.claim}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-mono text-accent-cyan tabular-nums">
                          {(pred.confidence * 100).toFixed(0)}%
                        </span>
                        <span className="text-[9px] font-mono text-navy-700">
                          {pred.deadline}
                        </span>
                        {pred.outcome && (
                          <span
                            className={cn(
                              "text-[8px] font-mono font-bold uppercase px-1 py-0.5 rounded",
                              pred.outcome === "confirmed"
                                ? "bg-accent-emerald/20 text-accent-emerald"
                                : pred.outcome === "denied"
                                  ? "bg-accent-rose/20 text-accent-rose"
                                  : "bg-navy-700/40 text-navy-400"
                            )}
                          >
                            {pred.outcome}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Economic Indicators placeholder */}
            <div>
              <h3 className="text-[9px] font-mono uppercase tracking-wider text-navy-500 mb-2 pb-1.5 border-b border-navy-700/20">
                Economic Indicators
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "GDP", value: data.capabilities.economic },
                  { label: "ENERGY", value: data.capabilities.energy },
                  { label: "TECH", value: data.capabilities.tech },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="text-center px-2 py-2 rounded border border-navy-700/30 bg-navy-800/40"
                  >
                    <span className="text-[8px] font-mono text-navy-600 uppercase block mb-0.5">
                      {item.label}
                    </span>
                    <span className="text-sm font-mono font-bold text-navy-200 tabular-nums">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-40">
            <span className="text-[10px] font-mono text-navy-600">
              Failed to load data
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
