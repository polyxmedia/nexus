"use client";

import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { UpgradeGate } from "@/components/subscription/upgrade-gate";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  ChevronDown,
  ChevronRight,
  Shield,
  BookOpen,
  Calendar,
  MessageSquare,
  Target,
  Brain,
} from "lucide-react";

interface TypeDistribution {
  cooperative: number;
  hawkish: number;
  unpredictable: number;
}

interface ActionProbabilities {
  military_action: number;
  provocative_statement: number;
  diplomatic_initiative: number;
  economic_measure: number;
  territorial_assertion: number;
}

interface ActorBase {
  id: string;
  name: string;
  country: string;
  typeDistribution: TypeDistribution;
  baseActionProbabilities: ActionProbabilities;
}

interface CalendarModifier {
  calendarEvent: string;
  calendarSystem: string;
  actionType: string;
  posteriorMultiplier: number;
  historicalBasis: string;
  sampleSize: number;
  confidence: number;
}

interface PublicStatement {
  date: string;
  quote: string;
  context: string;
  source: string;
  significance: string;
}

interface ScriptureReference {
  text: string;
  source: string;
  relevance: string;
}

interface PastDecision {
  date: string;
  action: string;
  context: string;
  outcome: string;
  calendarProximity: string | null;
}

interface ExtendedProfile {
  base: ActorBase;
  calendarModifiers: CalendarModifier[];
  publicStatements: PublicStatement[];
  scriptureReferences: ScriptureReference[];
  pastDecisions: PastDecision[];
  beliefFramework: string;
  decisionPattern: string;
  knowledgeBankEntries: number;
}

export default function ActorsPage() {
  const [profiles, setProfiles] = useState<ExtendedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    Record<string, "overview" | "calendar" | "statements" | "decisions">
  >({});

  useEffect(() => {
    fetch("/api/actors")
      .then((res) => res.json())
      .then((data) => {
        setProfiles(data.actors || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getTab = (actorId: string) => activeTab[actorId] || "overview";
  const setTab = (actorId: string, tab: "overview" | "calendar" | "statements" | "decisions") =>
    setActiveTab((prev) => ({ ...prev, [actorId]: tab }));

  const typeColor = (type: string) => {
    switch (type) {
      case "hawkish": return "text-red-400";
      case "cooperative": return "text-emerald-400";
      default: return "text-amber-400";
    }
  };

  const significanceColor = (sig: string) => {
    switch (sig) {
      case "critical": return "bg-red-900/30 border-red-800/50 text-red-300";
      case "high": return "bg-amber-900/20 border-amber-800/50 text-amber-300";
      default: return "bg-neutral-800/30 border-neutral-700/50 text-neutral-300";
    }
  };

  if (loading) {
    return (
      <PageContainer title="Actor Profiles">
        <UpgradeGate minTier="analyst" feature="Actor tracking and analysis" blur>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        </UpgradeGate>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Actor-Belief Profiles">
      <UpgradeGate minTier="analyst" feature="Actor tracking and analysis" blur>
      <div className="space-y-4">
        <div className="mb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
            Bayesian Actor Typing / {profiles.length} actors tracked
          </span>
        </div>

        {profiles.map((profile) => {
          const isExpanded = expanded === profile.base.id;
          const tab = getTab(profile.base.id);
          const dominant = Object.entries(profile.base.typeDistribution).sort(
            (a, b) => b[1] - a[1]
          )[0];

          return (
            <div
              key={profile.base.id}
              className="rounded-lg border border-neutral-800 bg-neutral-900/50 overflow-hidden"
            >
              {/* Header */}
              <button
                onClick={() =>
                  setExpanded(isExpanded ? null : profile.base.id)
                }
                className="w-full flex items-center justify-between p-4 hover:bg-neutral-800/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-neutral-500" />
                  <div className="text-left">
                    <div className="text-sm font-medium text-neutral-200">
                      {profile.base.name}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {profile.base.country}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`text-[10px] font-mono uppercase tracking-wider ${typeColor(dominant[0])}`}
                  >
                    {dominant[0]} ({(dominant[1] * 100).toFixed(0)}%)
                  </span>
                  <span className="text-[10px] font-mono text-neutral-600">
                    {profile.calendarModifiers.length} cal modifiers
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-neutral-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-neutral-500" />
                  )}
                </div>
              </button>

              {/* Expanded */}
              {isExpanded && (
                <div className="border-t border-neutral-800">
                  {/* Tab Bar */}
                  <div className="flex border-b border-neutral-800">
                    {(
                      [
                        { key: "overview", label: "Overview", icon: Brain },
                        { key: "calendar", label: "Calendar", icon: Calendar },
                        { key: "statements", label: "Statements", icon: MessageSquare },
                        { key: "decisions", label: "Decisions", icon: Target },
                      ] as const
                    ).map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        onClick={() => setTab(profile.base.id, key)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-mono transition-colors ${
                          tab === key
                            ? "text-cyan-400 border-b border-cyan-400"
                            : "text-neutral-500 hover:text-neutral-300"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="p-4">
                    {/* Overview Tab */}
                    {tab === "overview" && (
                      <div className="space-y-4">
                        {/* Type Distribution */}
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                            Behavioral Type Distribution
                          </span>
                          <div className="mt-2 grid grid-cols-3 gap-3">
                            {Object.entries(
                              profile.base.typeDistribution
                            ).map(([type, prob]) => (
                              <div
                                key={type}
                                className="rounded border border-neutral-800 p-3"
                              >
                                <div
                                  className={`text-xs font-mono uppercase ${typeColor(type)}`}
                                >
                                  {type}
                                </div>
                                <div className="text-lg font-mono text-neutral-200 mt-1">
                                  {(prob * 100).toFixed(0)}%
                                </div>
                                <div className="h-1 bg-neutral-800 rounded-full mt-2 overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${prob * 100}%`,
                                      backgroundColor:
                                        type === "hawkish"
                                          ? "#f87171"
                                          : type === "cooperative"
                                            ? "#34d399"
                                            : "#fbbf24",
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action Probabilities */}
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                            Base Weekly Action Probabilities
                          </span>
                          <div className="mt-2 space-y-2">
                            {Object.entries(
                              profile.base.baseActionProbabilities
                            ).map(([action, prob]) => (
                              <div
                                key={action}
                                className="flex items-center gap-3"
                              >
                                <span className="text-xs text-neutral-400 w-40">
                                  {action.replace(/_/g, " ")}
                                </span>
                                <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-cyan-500/60 rounded-full"
                                    style={{ width: `${prob * 100 * 3}%` }}
                                  />
                                </div>
                                <span className="text-xs font-mono text-neutral-500 w-12 text-right">
                                  {(prob * 100).toFixed(1)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Belief Framework */}
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                            Belief Framework
                          </span>
                          <p className="text-sm text-neutral-300 mt-1 leading-relaxed">
                            {profile.beliefFramework}
                          </p>
                        </div>

                        {/* Decision Pattern */}
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                            Decision Pattern
                          </span>
                          <p className="text-sm text-neutral-300 mt-1 leading-relaxed">
                            {profile.decisionPattern}
                          </p>
                        </div>

                        {/* Scripture References */}
                        {profile.scriptureReferences.length > 0 && (
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                              Scripture / Doctrinal References
                            </span>
                            <div className="mt-2 space-y-2">
                              {profile.scriptureReferences.map((ref, i) => (
                                <div
                                  key={i}
                                  className="rounded border border-neutral-800 p-3"
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                                    <span className="text-xs font-mono text-amber-400">
                                      {ref.source}
                                    </span>
                                  </div>
                                  <p className="text-xs text-neutral-400 italic">
                                    &ldquo;{ref.text}&rdquo;
                                  </p>
                                  <p className="text-xs text-neutral-500 mt-1">
                                    {ref.relevance}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Calendar Tab */}
                    {tab === "calendar" && (
                      <div className="space-y-3">
                        {profile.calendarModifiers.length === 0 ? (
                          <p className="text-sm text-neutral-500">
                            No calendar modifiers for this actor.
                          </p>
                        ) : (
                          profile.calendarModifiers.map((mod, i) => {
                            const isElevated = mod.posteriorMultiplier > 1;
                            return (
                              <div
                                key={i}
                                className="rounded border border-neutral-800 p-3"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                                    <span className="text-xs font-mono text-cyan-400">
                                      {mod.calendarEvent.replace(/_/g, " ")}
                                    </span>
                                    <span className="text-[10px] font-mono text-neutral-600">
                                      ({mod.calendarSystem})
                                    </span>
                                  </div>
                                  <span
                                    className={`text-xs font-mono ${isElevated ? "text-red-400" : "text-emerald-400"}`}
                                  >
                                    {mod.posteriorMultiplier.toFixed(1)}x{" "}
                                    {mod.actionType.replace(/_/g, " ")}
                                  </span>
                                </div>
                                <p className="text-xs text-neutral-400">
                                  {mod.historicalBasis}
                                </p>
                                <div className="flex items-center gap-3 mt-2">
                                  <span className="text-[10px] font-mono text-neutral-600">
                                    n={mod.sampleSize}
                                  </span>
                                  <span className="text-[10px] font-mono text-neutral-600">
                                    confidence:{" "}
                                    {(mod.confidence * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* Statements Tab */}
                    {tab === "statements" && (
                      <div className="space-y-3">
                        {profile.publicStatements.length === 0 ? (
                          <p className="text-sm text-neutral-500">
                            No public statements recorded.
                          </p>
                        ) : (
                          profile.publicStatements.map((stmt, i) => (
                            <div
                              key={i}
                              className={`rounded border p-3 ${significanceColor(stmt.significance)}`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-mono text-neutral-500">
                                  {stmt.date}
                                </span>
                                <span className="text-[10px] font-mono uppercase tracking-wider">
                                  {stmt.significance}
                                </span>
                              </div>
                              <p className="text-sm italic">
                                &ldquo;{stmt.quote}&rdquo;
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-[10px] text-neutral-500">
                                  {stmt.context}
                                </span>
                                <span className="text-[10px] text-neutral-600">
                                  {stmt.source}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Decisions Tab */}
                    {tab === "decisions" && (
                      <div className="space-y-3">
                        {profile.pastDecisions.length === 0 ? (
                          <p className="text-sm text-neutral-500">
                            No past decisions recorded.
                          </p>
                        ) : (
                          profile.pastDecisions.map((dec, i) => (
                            <div
                              key={i}
                              className="rounded border border-neutral-800 p-3"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-neutral-200">
                                  {dec.action}
                                </span>
                                <span className="text-[10px] font-mono text-neutral-500">
                                  {dec.date}
                                </span>
                              </div>
                              <p className="text-xs text-neutral-400 mb-2">
                                {dec.context}
                              </p>
                              <div className="rounded bg-neutral-800/50 p-2">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                                  Outcome
                                </span>
                                <p className="text-xs text-neutral-300 mt-0.5">
                                  {dec.outcome}
                                </p>
                              </div>
                              {dec.calendarProximity && (
                                <div className="flex items-center gap-1.5 mt-2">
                                  <Calendar className="w-3 h-3 text-amber-500" />
                                  <span className="text-[10px] font-mono text-amber-400">
                                    Near {dec.calendarProximity.replace(/_/g, " ")}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      </UpgradeGate>
    </PageContainer>
  );
}
