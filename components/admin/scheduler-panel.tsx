"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Coins, Activity, Save } from "lucide-react";
import type { SchedulerJob } from "./types";

const AI_JOB_COST_ESTIMATES: Record<string, { model: string; inputTokens: number; outputTokens: number; label: string }> = {
  "monitor-sweep": { model: "haiku", inputTokens: 2000, outputTokens: 800, label: "Sentinel scan + alert resolution" },
  "intelligence-cycle": { model: "sonnet", inputTokens: 4000, outputTokens: 1500, label: "Sentinel > Analyst > Executor chain" },
  "prediction-cycle": { model: "sonnet", inputTokens: 5000, outputTokens: 2000, label: "AI prediction resolve + generate" },
  "actor-profile-update": { model: "haiku", inputTokens: 3000, outputTokens: 1000, label: "GDELT actor extraction (per actor)" },
  "twitter-analyst": { model: "sonnet", inputTokens: 2000, outputTokens: 500, label: "Generate analyst tweet" },
  "twitter-replies": { model: "sonnet", inputTokens: 3000, outputTokens: 400, label: "Search + reply to threads (up to 3)" },
};

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  haiku: { input: 1, output: 4 },
  sonnet: { input: 3, output: 15 },
  opus: { input: 15, output: 75 },
};

function estimateDailyCost(jobName: string, intervalMs: number): number | null {
  const est = AI_JOB_COST_ESTIMATES[jobName];
  if (!est || intervalMs <= 0) return null;
  const runsPerDay = (24 * 60 * 60 * 1000) / intervalMs;
  const pricing = MODEL_PRICING[est.model];
  if (!pricing) return null;
  const costPerRun = (est.inputTokens / 1_000_000) * pricing.input + (est.outputTokens / 1_000_000) * pricing.output;
  return runsPerDay * costPerRun;
}

function formatInterval(ms: number): string {
  if (ms <= 0) return "Off";
  const mins = ms / 60_000;
  if (mins < 60) return `${mins}m`;
  const hrs = mins / 60;
  if (hrs < 24) return `${hrs}h`;
  return `${(hrs / 24).toFixed(1)}d`;
}

function JobRow({
  job,
  editedMin,
  onChangeInterval,
  disabled,
  isAi,
  aiEnabled,
}: {
  job: SchedulerJob;
  editedMin: string;
  onChangeInterval: (value: string) => void;
  disabled?: boolean;
  isAi: boolean;
  aiEnabled: boolean;
}) {
  const effectiveMs = parseFloat(editedMin || "0") * 60_000;
  const cost = isAi && aiEnabled ? estimateDailyCost(job.name, effectiveMs) : null;
  const estimate = AI_JOB_COST_ESTIMATES[job.name];
  const isDimmed = disabled || parseFloat(editedMin || "0") <= 0;

  return (
    <div
      className={`border rounded-md px-3 sm:px-4 py-3 transition-colors ${
        isDimmed
          ? "border-navy-800 bg-navy-950/50 opacity-50"
          : "border-navy-700/40 bg-navy-900/30"
      }`}
    >
      {/* Top: name + badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-mono font-medium ${isAi ? "text-navy-200" : "text-navy-300"}`}>
          {job.name}
        </span>
        {job.running && (
          <span className="text-[9px] font-mono text-accent-cyan bg-accent-cyan/10 px-1.5 py-0.5 rounded">RUNNING</span>
        )}
        {job.errors > 0 && (
          <span className="text-[9px] font-mono text-accent-rose bg-accent-rose/10 px-1.5 py-0.5 rounded">{job.errors} err</span>
        )}
        {cost !== null && cost > 0 && (
          <span className="text-[9px] font-mono text-accent-amber ml-auto">${cost.toFixed(3)}/day</span>
        )}
      </div>

      {/* Description */}
      {isAi && estimate && (
        <div className="text-[10px] text-navy-500 mt-1">
          {estimate.label}
          <span className="text-navy-600"> / {estimate.model}</span>
        </div>
      )}

      {/* Bottom: last run + interval control */}
      <div className="flex items-center justify-between mt-2 gap-3">
        <div className="text-[9px] text-navy-600 min-w-0 truncate">
          {job.lastRun
            ? `Last: ${new Date(job.lastRun).toLocaleTimeString()}`
            : "Never run"
          }
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Input
            value={editedMin}
            onChange={(e) => onChangeInterval(e.target.value)}
            type="number"
            min="0"
            step="1"
            className="w-16 sm:w-20 text-center text-xs"
            disabled={disabled}
          />
          <span className="text-[10px] text-navy-500">min</span>
          <span className="text-[9px] text-navy-600 hidden sm:inline">
            (def: {formatInterval(job.defaultIntervalMs)})
          </span>
        </div>
      </div>
    </div>
  );
}

export function SchedulerPanel() {
  const [jobs, setJobs] = useState<SchedulerJob[]>([]);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editedIntervals, setEditedIntervals] = useState<Record<string, string>>({});
  const [pendingAiEnabled, setPendingAiEnabled] = useState(true);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/scheduler");
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
        setAiEnabled(data.aiEnabled ?? true);
        setPendingAiEnabled(data.aiEnabled ?? true);
        const intervals: Record<string, string> = {};
        for (const job of data.jobs || []) {
          intervals[job.name] = String(job.intervalMs / 60_000);
        }
        setEditedIntervals(intervals);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const saveChanges = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const intervals: Record<string, number> = {};
      for (const job of jobs) {
        const editedMin = parseFloat(editedIntervals[job.name] ?? "");
        const currentMin = job.defaultIntervalMs / 60_000;
        if (!Number.isNaN(editedMin) && editedMin !== currentMin) {
          intervals[job.name] = editedMin;
        }
      }

      const res = await fetch("/api/scheduler", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiEnabled: pendingAiEnabled,
          intervals: Object.keys(intervals).length > 0 ? intervals : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
        setAiEnabled(pendingAiEnabled);
        setMessage({ type: "success", text: "Scheduler settings saved and restarted" });
      } else {
        setMessage({ type: "error", text: "Failed to save scheduler settings" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save scheduler settings" });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = pendingAiEnabled !== aiEnabled ||
    jobs.some((job) => {
      const edited = parseFloat(editedIntervals[job.name] ?? "");
      return !Number.isNaN(edited) && edited !== job.intervalMs / 60_000;
    });

  const totalDailyCost = jobs
    .filter((j) => j.ai && pendingAiEnabled)
    .reduce((sum, j) => {
      const mins = parseFloat(editedIntervals[j.name] ?? "0");
      const ms = mins * 60_000;
      return sum + (estimateDailyCost(j.name, ms) || 0);
    }, 0);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded" />
        ))}
      </div>
    );
  }

  const aiJobs = jobs.filter((j) => j.ai);
  const dataJobs = jobs.filter((j) => !j.ai);

  return (
    <div className="space-y-6">
      <p className="text-[11px] text-navy-400">
        Control background automation jobs. AI jobs consume Anthropic API credits. Adjust intervals or disable to manage costs.
      </p>

      {message && (
        <div className={`text-[11px] font-mono px-3 py-2 rounded border ${
          message.type === "success"
            ? "text-accent-emerald border-accent-emerald/30 bg-accent-emerald/5"
            : "text-accent-rose border-accent-rose/30 bg-accent-rose/5"
        }`}>
          {message.text}
        </div>
      )}

      {/* Cost Summary */}
      <div className="border border-navy-700/50 rounded-lg bg-navy-900/30 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-1">Estimated Daily AI Cost</div>
            <div className="text-2xl font-mono font-bold text-navy-100">
              ${pendingAiEnabled ? totalDailyCost.toFixed(2) : "0.00"}
            </div>
            <div className="text-[10px] text-navy-500 mt-0.5">
              ~${pendingAiEnabled ? (totalDailyCost * 30).toFixed(0) : "0"}/month at current intervals
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-navy-400">AI Jobs</span>
            <button
              onClick={() => setPendingAiEnabled(!pendingAiEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                pendingAiEnabled ? "bg-accent-emerald" : "bg-navy-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  pendingAiEnabled ? "translate-x-[22px]" : "translate-x-[3px]"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* AI Jobs */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Coins className="h-3.5 w-3.5 text-accent-amber" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">AI Jobs (consume credits)</span>
        </div>
        <div className="space-y-1.5">
          {aiJobs.map((job) => (
            <JobRow
              key={job.name}
              job={job}
              editedMin={editedIntervals[job.name] ?? ""}
              onChangeInterval={(v) => setEditedIntervals((prev) => ({ ...prev, [job.name]: v }))}
              disabled={!pendingAiEnabled}
              isAi
              aiEnabled={pendingAiEnabled}
            />
          ))}
        </div>
      </div>

      {/* Data Jobs */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-3.5 w-3.5 text-accent-cyan" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Data Jobs (no AI cost)</span>
        </div>
        <div className="space-y-1.5">
          {dataJobs.map((job) => (
            <JobRow
              key={job.name}
              job={job}
              editedMin={editedIntervals[job.name] ?? ""}
              onChangeInterval={(v) => setEditedIntervals((prev) => ({ ...prev, [job.name]: v }))}
              isAi={false}
              aiEnabled={pendingAiEnabled}
            />
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={saveChanges}
          disabled={saving || !hasChanges}
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
          Save &amp; Restart
        </Button>
        {hasChanges && (
          <span className="text-[10px] text-accent-amber font-mono">Unsaved changes</span>
        )}
      </div>
    </div>
  );
}
