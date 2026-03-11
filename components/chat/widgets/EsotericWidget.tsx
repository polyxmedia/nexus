"use client";

import { Moon, Star, Compass, Hash, Calendar, TrendingUp, Waves } from "lucide-react";

interface EsotericData {
  date: string;
  hijri?: {
    date: string;
    month: string;
    isRamadan: boolean;
    isSacredMonth: boolean;
  };
  chinese?: {
    cycle: string;
    animal: string;
    element: string;
    polarity: string;
    harmonies: string[];
    clashes: string[];
  };
  flyingStars?: {
    center: number;
    name: string;
    nature: string;
    financial: string;
  };
  lunar?: {
    phase: string;
    dayInCycle: number;
    illumination: string;
    marketBias: string;
    basisPoints: number;
  };
  numerology?: {
    score: number;
    sentiment: string;
    patterns: string[];
  };
  universalYear?: {
    number: number;
    theme: string;
  };
  kondratieff?: {
    season: string;
    yearInWave: number;
  };
  piCycle?: Array<{
    label: string;
    date: string;
    daysFromNow: number;
  }>;
  compositeScore: number;
  compositeOutlook: string;
  error?: string;
}

const outlookColor: Record<string, string> = {
  bullish: "text-accent-emerald",
  "mildly bullish": "text-accent-emerald",
  bearish: "text-accent-rose",
  "mildly bearish": "text-accent-rose",
  neutral: "text-navy-300",
  cautious: "text-accent-amber",
  volatile: "text-accent-amber",
};

const seasonColor: Record<string, string> = {
  spring: "text-accent-emerald",
  summer: "text-accent-amber",
  autumn: "text-accent-rose",
  winter: "text-accent-cyan",
};

function scoreColor(score: number): string {
  if (score >= 7) return "text-accent-emerald";
  if (score >= 5) return "text-accent-amber";
  if (score >= 3) return "text-navy-300";
  return "text-accent-rose";
}

function biasColor(bias: string): string {
  if (bias.includes("bull")) return "text-accent-emerald";
  if (bias.includes("bear")) return "text-accent-rose";
  return "text-navy-400";
}

function Card({ icon: Icon, title, children }: { icon: typeof Moon; title: string; children: React.ReactNode }) {
  return (
    <div className="border border-navy-700 rounded bg-navy-900/80 p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="h-3 w-3 text-navy-500" />
        <span className="text-[10px] uppercase tracking-wider text-navy-500 font-mono">{title}</span>
      </div>
      {children}
    </div>
  );
}

function Tag({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-block rounded-full border border-navy-700/50 bg-navy-800/60 px-2 py-0.5 text-[10px] font-mono ${className}`}>
      {children}
    </span>
  );
}

export function EsotericWidget({ data }: { data: EsotericData }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  return (
    <div className="my-2 space-y-2">
      {/* Header: Composite Score */}
      <div className="border border-navy-700 rounded bg-navy-900/80 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] uppercase tracking-wider text-navy-500 font-mono">
            Cyclical Analysis - {data.date}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-navy-500 font-mono">Composite</span>
            <span className={`text-lg font-bold font-mono ${scoreColor(data.compositeScore)}`}>
              {data.compositeScore}/10
            </span>
          </div>
        </div>
        <div className={`text-xs font-mono ${outlookColor[data.compositeOutlook?.toLowerCase()] || "text-navy-300"}`}>
          Outlook: {data.compositeOutlook}
        </div>
      </div>

      {/* Grid of cards */}
      <div className="grid grid-cols-2 gap-2">
        {/* Lunar Phase */}
        {data.lunar && (
          <Card icon={Moon} title="Lunar Phase">
            <div className="text-sm font-mono text-navy-200 mb-1">
              {data.lunar.phase.replace(/_/g, " ")}
            </div>
            <div className="space-y-0.5 text-[11px] font-mono">
              <div className="flex justify-between">
                <span className="text-navy-500">Illumination</span>
                <span className="text-navy-300">{data.lunar.illumination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-500">Day in Cycle</span>
                <span className="text-navy-300">{data.lunar.dayInCycle}/29.5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-500">Market Bias</span>
                <span className={biasColor(data.lunar.marketBias)}>{data.lunar.marketBias}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-500">Basis Points</span>
                <span className="text-navy-300">{data.lunar.basisPoints}bp</span>
              </div>
            </div>
          </Card>
        )}

        {/* Chinese Calendar */}
        {data.chinese && (
          <Card icon={Star} title="Chinese Calendar">
            <div className="text-sm font-mono text-navy-200 mb-1">
              {data.chinese.element} {data.chinese.animal}
            </div>
            <div className="space-y-0.5 text-[11px] font-mono">
              <div className="flex justify-between">
                <span className="text-navy-500">Cycle</span>
                <span className="text-navy-300">{data.chinese.cycle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-500">Polarity</span>
                <span className="text-navy-300">{data.chinese.polarity}</span>
              </div>
            </div>
            {data.chinese.harmonies.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {data.chinese.harmonies.map((h) => (
                  <Tag key={h} className="text-accent-emerald">{h}</Tag>
                ))}
              </div>
            )}
            {data.chinese.clashes.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {data.chinese.clashes.map((c) => (
                  <Tag key={c} className="text-accent-rose">{c}</Tag>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Flying Stars */}
        {data.flyingStars && (
          <Card icon={Compass} title="Flying Stars">
            <div className="text-sm font-mono text-navy-200 mb-1">
              Star {data.flyingStars.center} - {data.flyingStars.name}
            </div>
            <div className="space-y-0.5 text-[11px] font-mono">
              <div className="flex justify-between">
                <span className="text-navy-500">Nature</span>
                <span className="text-navy-300">{data.flyingStars.nature}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-500">Financial</span>
                <span className="text-navy-300">{data.flyingStars.financial}</span>
              </div>
            </div>
          </Card>
        )}

        {/* Numerology */}
        {data.numerology && (
          <Card icon={Hash} title="Numerology">
            <div className="flex items-baseline gap-2 mb-1">
              <span className={`text-sm font-mono font-bold ${scoreColor(data.numerology.score / 10)}`}>
                {data.numerology.score}
              </span>
              <span className="text-[11px] font-mono text-navy-400">{data.numerology.sentiment}</span>
            </div>
            {data.numerology.patterns.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {data.numerology.patterns.map((p) => (
                  <Tag key={p} className="text-accent-cyan">{p}</Tag>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Hijri Calendar */}
        {data.hijri && (
          <Card icon={Calendar} title="Hijri Calendar">
            <div className="text-sm font-mono text-navy-200 mb-1">
              {data.hijri.date}
            </div>
            <div className="text-[11px] font-mono text-navy-400 mb-1.5">
              {data.hijri.month}
            </div>
            <div className="flex flex-wrap gap-1">
              {data.hijri.isRamadan && <Tag className="text-accent-amber">Ramadan</Tag>}
              {data.hijri.isSacredMonth && <Tag className="text-accent-rose">Sacred Month</Tag>}
              {!data.hijri.isRamadan && !data.hijri.isSacredMonth && (
                <Tag className="text-navy-400">Standard Period</Tag>
              )}
            </div>
          </Card>
        )}

        {/* Cycles */}
        <Card icon={Waves} title="Long Cycles">
          {data.universalYear && (
            <div className="space-y-0.5 text-[11px] font-mono mb-2">
              <div className="flex justify-between">
                <span className="text-navy-500">Universal Year</span>
                <span className="text-navy-300">{data.universalYear.number}</span>
              </div>
              <div className="text-[10px] text-navy-500">{data.universalYear.theme}</div>
            </div>
          )}
          {data.kondratieff && (
            <div className="space-y-0.5 text-[11px] font-mono mb-2">
              <div className="flex justify-between">
                <span className="text-navy-500">Kondratieff</span>
                <span className={seasonColor[data.kondratieff.season.toLowerCase()] || "text-navy-300"}>
                  {data.kondratieff.season}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-500">Year in Wave</span>
                <span className="text-navy-300">{data.kondratieff.yearInWave}</span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Pi Cycle turning points */}
      {data.piCycle && data.piCycle.length > 0 && (
        <div className="border border-navy-700 rounded bg-navy-900/80 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="h-3 w-3 text-navy-500" />
            <span className="text-[10px] uppercase tracking-wider text-navy-500 font-mono">
              Armstrong Pi Cycle (8.6yr ECM)
            </span>
          </div>
          <div className="space-y-1">
            {data.piCycle.map((p) => (
              <div key={p.label} className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-navy-300">{p.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-navy-500">{p.date}</span>
                  <span className={p.daysFromNow > 0 ? "text-accent-cyan" : "text-navy-500"}>
                    {p.daysFromNow > 0 ? `in ${p.daysFromNow}d` : `${Math.abs(p.daysFromNow)}d ago`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
