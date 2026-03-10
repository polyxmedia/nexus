"use client";

import { useState, useCallback } from "react";
import {
  Shield,
  BarChart3,
  Target,
  AlertTriangle,
  Briefcase,
  Radar,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Clock,
} from "lucide-react";
import { Markdown } from "@/components/ui/markdown";
import { Skeleton } from "@/components/ui/skeleton";
import { useSwrFetch } from "@/lib/hooks/use-swr-fetch";
import { cn } from "@/lib/utils";

// ── Types ──

interface ReportSection {
  id: string;
  title: string;
  icon: string;
  severity: number;
  summary: string;
  content: string;
}

interface DailyReportData {
  report: {
    date: string;
    sections: ReportSection[];
    generatedAt: string;
    cached: boolean;
  } | null;
}

// ── Helpers ──

const ICON_MAP: Record<string, typeof Shield> = {
  shield: Shield,
  chart: BarChart3,
  target: Target,
  alert: AlertTriangle,
  briefcase: Briefcase,
  radar: Radar,
};

const SEVERITY_COLORS: Record<number, { border: string; bg: string; text: string; dot: string }> = {
  1: { border: "border-accent-emerald/30", bg: "bg-accent-emerald/5", text: "text-accent-emerald", dot: "bg-accent-emerald" },
  2: { border: "border-accent-cyan/30", bg: "bg-accent-cyan/5", text: "text-accent-cyan", dot: "bg-accent-cyan" },
  3: { border: "border-accent-amber/30", bg: "bg-accent-amber/5", text: "text-accent-amber", dot: "bg-accent-amber" },
  4: { border: "border-accent-rose/30", bg: "bg-accent-rose/5", text: "text-accent-rose", dot: "bg-accent-rose" },
  5: { border: "border-signal-5/30", bg: "bg-signal-5/5", text: "text-signal-5", dot: "bg-signal-5" },
};

function severityStyle(s: number) {
  return SEVERITY_COLORS[Math.min(Math.max(s, 1), 5)] || SEVERITY_COLORS[2];
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Section Component ──

function ReportSectionCard({ section }: { section: ReportSection }) {
  const [expanded, setExpanded] = useState(false);
  const style = severityStyle(section.severity);
  const Icon = ICON_MAP[section.icon] || Shield;

  return (
    <div className={cn("border rounded-md transition-all", style.border, expanded ? style.bg : "bg-navy-900/40")}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left group"
      >
        <div className={cn("flex-shrink-0 w-6 h-6 rounded flex items-center justify-center", style.bg)}>
          <Icon className={cn("h-3.5 w-3.5", style.text)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-semibold text-navy-200 uppercase tracking-wider">{section.title}</h4>
            <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", style.dot)} />
          </div>
          {!expanded && (
            <p className="text-xs text-navy-400 mt-0.5 truncate">{section.summary}</p>
          )}
        </div>
        <div className="flex-shrink-0 text-navy-600 group-hover:text-navy-400 transition-colors">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-navy-700/20">
          <div className="mt-3 text-xs text-navy-300 leading-relaxed prose-navy">
            <Markdown>{section.content}</Markdown>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Loading skeleton ──

function ReportSkeleton() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-3 w-3 rounded-full" />
        <Skeleton className="h-3 w-32 rounded" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="border border-navy-700/20 rounded-md p-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6 rounded" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-28 rounded" />
              <Skeleton className="h-2.5 w-48 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Widget ──

export function DailyReportWidget() {
  const { data, isLoading, mutate } = useSwrFetch<DailyReportData>("/api/dashboard/daily-report", {
    dedupingInterval: 300_000, // 5 min dedup
    revalidateOnFocus: false,
  });
  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerate = useCallback(async () => {
    setRegenerating(true);
    try {
      await fetch("/api/dashboard/daily-report", { method: "POST" });
      await mutate();
    } finally {
      setRegenerating(false);
    }
  }, [mutate]);

  if (isLoading) return <ReportSkeleton />;

  const report = data?.report;

  if (!report) {
    return (
      <div className="text-center py-6">
        <Shield className="h-8 w-8 text-navy-700 mx-auto mb-2" />
        <p className="text-xs text-navy-500 mb-1">Daily report unavailable</p>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="text-xs text-accent-cyan hover:text-accent-cyan/80 transition-colors"
        >
          {regenerating ? "Generating..." : "Generate now"}
        </button>
      </div>
    );
  }

  const maxSeverity = Math.max(...report.sections.map((s) => s.severity));
  const overallStyle = severityStyle(maxSeverity);

  return (
    <div className="space-y-2">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", overallStyle.dot)} />
          <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
            {new Date(report.date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-navy-600 flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {relativeTime(report.generatedAt)}
          </span>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="text-navy-600 hover:text-navy-300 transition-colors p-0.5 rounded hover:bg-navy-800/60"
            title="Regenerate report"
          >
            <RefreshCw className={cn("h-3 w-3", regenerating && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-1.5">
        {report.sections.map((section) => (
          <ReportSectionCard key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}
