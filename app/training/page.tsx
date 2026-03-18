"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { cn } from "@/lib/utils";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Crosshair,
  FileText,
  Globe,
  History,
  LayoutDashboard,
  Lock,
  Map,
  MessageSquare,
  Newspaper,
  RotateCcw,
  Route,
  Settings,
  Shield,
  Swords,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import {
  TRACKS,
  LEVELS,
  MISSIONS,
  PLAYBOOKS,
  getMissionsByTrack,
  getTrackProgress,
  getLevelForXp,
  getTotalXp,
  type TrainingProgress,
  type Mission,
  type Playbook,
} from "@/lib/training/missions";
import { useSubscription } from "@/lib/hooks/useSubscription";

// ── Icon map ──
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, MessageSquare, Newspaper, Settings, Activity, Crosshair,
  Shield, BookOpen, Swords, Globe, Target, Users, BarChart3, TrendingUp,
  FileText, Bell, History, Trophy,
};

// ── Tier access ──
const TIER_LEVELS: Record<string, number> = { free: 0, analyst: 1, operator: 2, institution: 3 };

function getLevelProgress(xp: number, levelInfo: ReturnType<typeof getLevelForXp> | null): number {
  if (!levelInfo?.nextLevel) return 1;
  const range = levelInfo.nextLevel.xpRequired - levelInfo.xpRequired;
  if (range <= 0) return 1;
  return Math.min(1, (xp - levelInfo.xpRequired) / range);
}

export default function TrainingPage() {
  const router = useRouter();
  const { tier, isAdmin } = useSubscription();
  const [progress, setProgress] = useState<TrainingProgress | null>(null);
  const [levelInfo, setLevelInfo] = useState<ReturnType<typeof getLevelForXp> | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"missions" | "playbooks">("missions");
  const [activeTrack, setActiveTrack] = useState<string>("foundations");
  const [expandedMission, setExpandedMission] = useState<string | null>(null);
  const [expandedPlaybook, setExpandedPlaybook] = useState<string | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);

  const userLevel = isAdmin ? 3 : (TIER_LEVELS[tier || "free"] ?? 0);

  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch("/api/training");
      const data = await res.json();
      setProgress(data.progress);
      setLevelInfo(data.levelInfo);
    } catch {
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  async function completeStep(missionId: string, stepId: string) {
    setCompleting(`${missionId}:${stepId}`);
    try {
      const res = await fetch("/api/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete_step", missionId, stepId }),
      });
      const data = await res.json();
      setProgress(data.progress);
      setLevelInfo(data.levelInfo);
    } catch { /* silent */ }
    setCompleting(null);
  }

  async function resetProgress() {
    try {
      const res = await fetch("/api/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const data = await res.json();
      setProgress(data.progress);
      setLevelInfo(data.levelInfo);
    } catch { /* silent */ }
  }

  async function completePlaybook(playbookId: string) {
    setCompleting(`playbook:${playbookId}`);
    try {
      const res = await fetch("/api/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete_playbook", playbookId }),
      });
      const data = await res.json();
      setProgress(data.progress);
      setLevelInfo(data.levelInfo);
    } catch { /* silent */ }
    setCompleting(null);
  }

  const completedMissions = progress?.completedMissions || [];
  const completedSteps = progress?.completedSteps || {};
  const xp = progress?.xp || 0;
  const totalXp = getTotalXp();

  function isMissionComplete(m: Mission) {
    return completedMissions.includes(m.id);
  }

  function isStepComplete(missionId: string, stepId: string) {
    return (completedSteps[missionId] || []).includes(stepId);
  }

  function getMissionProgress(m: Mission): number {
    const done = (completedSteps[m.id] || []).length;
    return Math.round((done / m.steps.length) * 100);
  }

  function canAccess(m: Mission): boolean {
    if (isAdmin) return true;
    return userLevel >= (TIER_LEVELS[m.minTier] ?? 0);
  }

  const trackMissions = getMissionsByTrack(activeTrack);
  const overallProgress = MISSIONS.length > 0 ? Math.round((completedMissions.length / MISSIONS.length) * 100) : 0;

  if (loading) {
    return (
      <PageContainer title="Training" subtitle="Loading...">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-navy-800/30 animate-pulse" />
          ))}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Training"
      subtitle="Master the platform through guided missions"
      actions={
        <button
          onClick={resetProgress}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded border border-navy-700/40 text-navy-400 hover:text-navy-200 hover:border-navy-600/40 transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      }
    >
      {/* ── Level & XP Bar ── */}
      <div className="mb-8 border border-navy-700/30 rounded-xl bg-navy-900/40 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Level badge */}
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0">
              <svg viewBox="0 0 64 64" className="h-full w-full">
                {/* Background ring */}
                <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="3" className="text-navy-800" />
                {/* Progress ring */}
                <circle
                  cx="32" cy="32" r="28"
                  fill="none" stroke="currentColor" strokeWidth="3"
                  className="text-accent-cyan"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - getLevelProgress(xp, levelInfo))}`}
                  strokeLinecap="round"
                  transform="rotate(-90 32 32)"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-navy-100">{levelInfo?.level || 1}</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Rank</div>
              <div className="text-sm font-bold text-navy-100">{levelInfo?.title || "Recruit"}</div>
              <div className="text-[10px] font-mono text-navy-400 mt-0.5">
                {xp} / {levelInfo?.nextLevel?.xpRequired || totalXp} XP
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex-1 grid grid-cols-3 gap-3 sm:gap-4">
            <div className="border border-navy-700/20 rounded-lg p-3 bg-navy-900/30">
              <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-1">Missions</div>
              <div className="text-lg font-bold text-navy-100">
                {completedMissions.length}
                <span className="text-xs font-normal text-navy-500">/{MISSIONS.length}</span>
              </div>
            </div>
            <div className="border border-navy-700/20 rounded-lg p-3 bg-navy-900/30">
              <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-1">Total XP</div>
              <div className="text-lg font-bold text-accent-cyan">{xp}</div>
            </div>
            <div className="border border-navy-700/20 rounded-lg p-3 bg-navy-900/30">
              <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-1">Progress</div>
              <div className="text-lg font-bold text-navy-100">{overallProgress}%</div>
            </div>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="mt-4">
          <div className="h-1.5 rounded-full bg-navy-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-cyan to-accent-emerald transition-all duration-700"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Level roadmap */}
        <div className="mt-4 flex items-center gap-1 overflow-x-auto pb-1">
          {LEVELS.map((l) => {
            const isActive = (levelInfo?.level || 1) >= l.level;
            const isCurrent = (levelInfo?.level || 1) === l.level;
            return (
              <div
                key={l.level}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-mono uppercase tracking-wider transition-colors",
                  isCurrent
                    ? "bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20"
                    : isActive
                    ? "text-navy-300"
                    : "text-navy-600"
                )}
              >
                <Zap className={cn("h-2.5 w-2.5", isCurrent ? "text-accent-cyan" : isActive ? "text-navy-400" : "text-navy-700")} />
                {l.title}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── View Mode Toggle ── */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-1 border border-navy-700/30 rounded-lg p-1 bg-navy-900/30">
          <button
            onClick={() => setViewMode("missions")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors",
              viewMode === "missions"
                ? "bg-navy-800 text-navy-100"
                : "text-navy-400 hover:text-navy-200"
            )}
          >
            <Target className="h-3 w-3" />
            Missions
          </button>
          <button
            onClick={() => setViewMode("playbooks")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors",
              viewMode === "playbooks"
                ? "bg-navy-800 text-navy-100"
                : "text-navy-400 hover:text-navy-200"
            )}
          >
            <Route className="h-3 w-3" />
            Playbooks
          </button>
        </div>

        <p className="text-[10px] text-navy-500">
          {viewMode === "missions"
            ? "Learn individual tools and features"
            : "End-to-end workflows showing how tools chain together"
          }
        </p>
      </div>

      {/* ── PLAYBOOKS VIEW ── */}
      {viewMode === "playbooks" && (
        <div className="space-y-3">
          {PLAYBOOKS.map((playbook) => {
            const isExpanded = expandedPlaybook === playbook.id;
            const isComplete = (progress?.completedPlaybooks || []).includes(playbook.id);
            const isCompletingThis = completing === `playbook:${playbook.id}`;

            return (
              <div
                key={playbook.id}
                className="group border border-navy-700/20 rounded-lg bg-navy-900/40 hover:bg-navy-900/70 hover:border-navy-600/30 transition-all duration-200"
              >
                {/* Header row - prediction card style */}
                <button
                  onClick={() => setExpandedPlaybook(isExpanded ? null : playbook.id)}
                  className="w-full text-left px-5 py-4"
                >
                  {/* Title line */}
                  <div className="flex items-start gap-3">
                    {isComplete && (
                      <Check className="h-3.5 w-3.5 text-accent-emerald mt-0.5 shrink-0" />
                    )}
                    <p className={cn(
                      "text-[13px] leading-relaxed flex-1",
                      isComplete ? "text-accent-emerald" : "text-navy-100"
                    )}>
                      {playbook.title}
                    </p>
                    <ChevronRight className={cn(
                      "h-4 w-4 shrink-0 mt-0.5 transition-transform",
                      isExpanded ? "rotate-90 text-navy-300" : "text-navy-600"
                    )} />
                  </div>

                  <p className={cn(
                    "text-[11px] text-navy-400 mt-1 leading-relaxed",
                    isComplete && "ml-[1.625rem]"
                  )}>
                    {playbook.subtitle}
                  </p>

                  {/* Meta row */}
                  <div className={cn(
                    "flex items-center gap-3 mt-3 pt-3 border-t border-navy-800/40",
                    isComplete && "ml-[1.625rem]"
                  )}>
                    <span className={cn(
                      "text-[10px] font-mono uppercase tracking-wider",
                      playbook.difficulty === "beginner" ? "text-accent-emerald" :
                      playbook.difficulty === "advanced" ? "text-accent-rose" :
                      "text-accent-amber"
                    )}>
                      {playbook.difficulty}
                    </span>

                    <span className="text-navy-800">|</span>

                    <span className="text-[10px] font-mono text-navy-500">
                      {playbook.steps.length} steps
                    </span>

                    <span className="text-navy-800">|</span>

                    <span className="text-[10px] font-mono text-navy-500">
                      {playbook.duration}
                    </span>

                    <span className="text-navy-800">|</span>

                    <span className="text-[10px] font-mono text-accent-amber">
                      +{playbook.xp} XP
                    </span>

                    <div className="flex-1" />

                    {isComplete && (
                      <span className="text-[9px] font-mono text-accent-emerald">complete</span>
                    )}
                  </div>
                </button>

                {/* Expanded steps */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-navy-800/30">
                    <p className="text-[11px] text-navy-400 leading-relaxed mt-4 mb-5">
                      {playbook.description}
                    </p>

                    {/* Steps as a clean list */}
                    <div className="space-y-3">
                      {playbook.steps.map((step, idx) => {
                        const StepIcon = ICON_MAP[step.icon] || Activity;

                        return (
                          <div key={idx} className="flex gap-3">
                            {/* Step number */}
                            <span className="text-[9px] font-mono text-navy-600 pt-0.5 w-5 shrink-0 text-right">
                              {String(idx + 1).padStart(2, "0")}
                            </span>

                            <div className="flex-1 min-w-0">
                              {/* Tool + nav */}
                              <div className="flex items-center gap-2">
                                <StepIcon className="h-3 w-3 text-navy-500" />
                                <span className="text-xs font-semibold text-navy-200">{step.tool}</span>
                                <button
                                  onClick={() => router.push(step.route)}
                                  className="text-[8px] font-mono text-navy-600 hover:text-navy-300 transition-colors uppercase tracking-wider"
                                >
                                  open
                                </button>
                              </div>

                              {/* Action */}
                              <p className="text-[11px] text-navy-400 leading-relaxed mt-1">
                                {step.action}
                              </p>

                              {/* Output */}
                              <p className="text-[10px] font-mono text-navy-600 mt-1">
                                {step.output}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Complete button */}
                    <div className="mt-5 pt-4 border-t border-navy-800/30 flex items-center gap-3">
                      <button
                        onClick={() => completePlaybook(playbook.id)}
                        disabled={isComplete || isCompletingThis}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all",
                          isComplete
                            ? "bg-accent-emerald/10 text-accent-emerald cursor-default"
                            : isCompletingThis
                            ? "bg-navy-800/60 text-navy-500 cursor-wait"
                            : "border border-navy-700/30 text-navy-400 hover:text-navy-200 hover:border-navy-600/30 active:scale-[0.98]"
                        )}
                      >
                        <Check className="h-3 w-3" />
                        {isComplete ? "Complete" : "Mark Complete"}
                      </button>
                      {isComplete && (
                        <span className="text-[10px] font-mono text-accent-emerald">+{playbook.xp} XP earned</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── MISSIONS VIEW ── */}
      {viewMode === "missions" && <>
      {/* ── Track Tabs ── */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        {TRACKS.map((track) => {
          const pct = getTrackProgress(track.id, completedMissions);
          const isActive = activeTrack === track.id;
          return (
            <button
              key={track.id}
              onClick={() => { setActiveTrack(track.id); setExpandedMission(null); }}
              className={cn(
                "shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium transition-colors",
                isActive
                  ? "bg-navy-800/80 text-navy-100 border border-navy-700/40"
                  : "text-navy-400 hover:bg-navy-800/40 hover:text-navy-200"
              )}
            >
              <span>{track.label}</span>
              {pct > 0 && (
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[9px] font-mono",
                  pct === 100 ? "bg-accent-emerald/10 text-accent-emerald" : "bg-navy-700/40 text-navy-400"
                )}>
                  {pct}%
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Track Description ── */}
      <div className="mb-4">
        <p className="text-xs text-navy-400">
          {TRACKS.find((t) => t.id === activeTrack)?.description}
        </p>
      </div>

      {/* ── Mission List ── */}
      <div className="space-y-3">
        {trackMissions.map((mission) => {
          const Icon = ICON_MAP[mission.icon] || Activity;
          const complete = isMissionComplete(mission);
          const pct = getMissionProgress(mission);
          const expanded = expandedMission === mission.id;
          const locked = !canAccess(mission);

          return (
            <div
              key={mission.id}
              className={cn(
                "border rounded-xl transition-all duration-200",
                complete
                  ? "border-accent-emerald/20 bg-accent-emerald/[0.02]"
                  : locked
                  ? "border-navy-700/15 opacity-50"
                  : "border-navy-700/30 bg-navy-900/30 hover:border-navy-600/40"
              )}
            >
              {/* Mission header */}
              <button
                onClick={() => !locked && setExpandedMission(expanded ? null : mission.id)}
                className="w-full flex items-center gap-4 p-4 text-left"
                disabled={locked}
              >
                {/* Icon */}
                <div className={cn(
                  "h-10 w-10 shrink-0 rounded-lg flex items-center justify-center",
                  complete
                    ? "bg-accent-emerald/10"
                    : locked
                    ? "bg-navy-800/30"
                    : "bg-navy-800/60"
                )}>
                  {complete ? (
                    <Check className="h-5 w-5 text-accent-emerald" />
                  ) : locked ? (
                    <Lock className="h-4 w-4 text-navy-600" />
                  ) : (
                    <Icon className="h-5 w-5 text-navy-300" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={cn(
                      "text-sm font-semibold truncate",
                      complete ? "text-accent-emerald" : locked ? "text-navy-500" : "text-navy-100"
                    )}>
                      {mission.title}
                    </h3>
                    {locked && (
                      <span className="shrink-0 px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider rounded bg-navy-800/50 text-navy-500">
                        {mission.minTier}
                      </span>
                    )}
                  </div>
                  <p className={cn("text-[11px] mt-0.5 line-clamp-1", locked ? "text-navy-600" : "text-navy-400")}>
                    {mission.description}
                  </p>
                </div>

                {/* XP badge + progress */}
                <div className="shrink-0 flex items-center gap-3">
                  {!complete && !locked && pct > 0 && (
                    <div className="w-16">
                      <div className="h-1 rounded-full bg-navy-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent-cyan transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <span className={cn(
                    "px-2 py-1 rounded text-[10px] font-mono font-medium",
                    complete
                      ? "bg-accent-emerald/10 text-accent-emerald"
                      : "bg-accent-amber/10 text-accent-amber"
                  )}>
                    +{mission.xp} XP
                  </span>
                  <ChevronRight className={cn(
                    "h-4 w-4 transition-transform",
                    expanded ? "rotate-90 text-navy-300" : "text-navy-600"
                  )} />
                </div>
              </button>

              {/* Expanded steps */}
              {expanded && (
                <div className="px-4 pb-4 pt-0">
                  <div className="ml-5 border-l border-navy-700/30 pl-8 space-y-3">
                    {mission.steps.map((step, idx) => {
                      const stepDone = isStepComplete(mission.id, step.id);
                      const isCompleting = completing === `${mission.id}:${step.id}`;

                      return (
                        <div key={step.id} className="relative">
                          {/* Connector dot */}
                          <div className={cn(
                            "absolute -left-[2.3rem] top-1.5 h-3 w-3 rounded-full border-2",
                            stepDone
                              ? "bg-accent-emerald border-accent-emerald/30"
                              : "bg-navy-900 border-navy-600"
                          )} />

                          <div className={cn(
                            "rounded-lg border p-3 transition-all",
                            stepDone
                              ? "border-accent-emerald/15 bg-accent-emerald/[0.02]"
                              : "border-navy-700/20 bg-navy-900/40"
                          )}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-mono text-navy-600">{String(idx + 1).padStart(2, "0")}</span>
                                  <h4 className={cn(
                                    "text-xs font-semibold",
                                    stepDone ? "text-accent-emerald" : "text-navy-200"
                                  )}>
                                    {step.title}
                                  </h4>
                                </div>
                                <p className="text-[10px] text-navy-400 mt-1">{step.description}</p>
                                <p className="text-[10px] text-navy-500 mt-1.5 italic">{step.action}</p>
                              </div>

                              <div className="shrink-0 flex items-center gap-2">
                                {!stepDone && (
                                  <button
                                    onClick={() => router.push(step.route)}
                                    className="px-2 py-1 text-[9px] font-mono uppercase tracking-wider rounded border border-navy-700/30 text-navy-400 hover:text-navy-200 hover:border-navy-600/30 transition-colors"
                                  >
                                    Go
                                  </button>
                                )}
                                <button
                                  onClick={() => completeStep(mission.id, step.id)}
                                  disabled={stepDone || isCompleting}
                                  className={cn(
                                    "flex items-center gap-1 px-2 py-1 rounded text-[9px] font-mono uppercase tracking-wider transition-all",
                                    stepDone
                                      ? "bg-accent-emerald/10 text-accent-emerald cursor-default"
                                      : isCompleting
                                      ? "bg-navy-800/60 text-navy-500 cursor-wait"
                                      : "border border-accent-cyan/20 text-accent-cyan hover:bg-accent-cyan/10 active:scale-95"
                                  )}
                                >
                                  <Check className="h-2.5 w-2.5" />
                                  {stepDone ? "Done" : "Mark Done"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      </>}

      {/* ── All Complete ── */}
      {overallProgress === 100 && (progress?.completedPlaybooks || []).length === PLAYBOOKS.length && (
        <div className="mt-8 border border-accent-emerald/20 rounded-xl bg-accent-emerald/[0.03] p-6 text-center">
          <div className="text-2xl font-bold text-accent-emerald mb-2">All Missions Complete</div>
          <p className="text-xs text-navy-400">
            You have mastered all training modules. You are now fully operational.
          </p>
        </div>
      )}
    </PageContainer>
  );
}
