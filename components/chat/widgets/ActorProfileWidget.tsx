"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";

// ── Types matching ExtendedActorProfile from lib/actors/profiles.ts ──

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
  actorId: string;
  calendarEvent: string;
  calendarSystem: string;
  actionType: string;
  posteriorMultiplier: number;
  historicalBasis: string;
  sampleSize?: number;
  confidence: number;
}

interface PublicStatement {
  date: string;
  quote: string;
  context: string;
  source: string;
  significance: "low" | "medium" | "high" | "critical";
}

interface ScriptureReference {
  text: string;
  source: string;
  relevance: string;
  usedBy: string;
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

interface ActorProfileData {
  // Single actor
  base?: ActorBase;
  calendarModifiers?: CalendarModifier[];
  publicStatements?: PublicStatement[];
  scriptureReferences?: ScriptureReference[];
  pastDecisions?: PastDecision[];
  beliefFramework?: string;
  decisionPattern?: string;
  knowledgeBankEntries?: number;
  // Multiple actors
  actors?: ExtendedProfile[];
  // Error
  error?: string;
}

// ── Helpers ──

const SIG_STYLE: Record<string, string> = {
  critical: "bg-accent-rose/20 text-accent-rose border-accent-rose/30",
  high: "bg-accent-amber/20 text-accent-amber border-accent-amber/30",
  medium: "bg-accent-cyan/20 text-accent-cyan border-accent-cyan/30",
  low: "bg-navy-700/30 text-navy-400 border-navy-700/40",
};

function typeColor(value: number): string {
  if (value >= 0.5) return "text-accent-rose";
  if (value >= 0.3) return "text-accent-amber";
  return "text-accent-emerald";
}

function multiplierColor(m: number): string {
  if (m >= 3) return "text-accent-rose";
  if (m >= 2) return "text-accent-amber";
  if (m >= 1.5) return "text-accent-cyan";
  return "text-navy-300";
}

function confidenceBar(value: number) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1 bg-navy-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-accent-cyan/60"
          style={{ width: `${value * 100}%` }}
        />
      </div>
      <span className="text-[9px] font-mono text-navy-500 tabular-nums">{(value * 100).toFixed(0)}%</span>
    </div>
  );
}

function formatAction(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ── Section toggle ──

function Section({ label, count, children, defaultOpen = false }: {
  label: string;
  count?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-navy-800/50">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-2 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500">{label}</span>
          {count != null && <span className="text-[9px] font-mono text-navy-600">{count}</span>}
        </div>
        <span className="text-[10px] text-navy-600">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="pb-3">{children}</div>}
    </div>
  );
}

// ── Single Profile Card ──

function ProfileCard({ profile, compact = false }: { profile: ExtendedProfile; compact?: boolean }) {
  const { base } = profile;
  const dominantType = Object.entries(base.typeDistribution).sort((a, b) => b[1] - a[1])[0];
  const topAction = Object.entries(base.baseActionProbabilities).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="border border-navy-700 rounded bg-navy-900/60 p-3">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-navy-100">{base.name}</span>
            <Badge className="bg-navy-700/40 text-navy-400 border-navy-700/50">
              {base.country}
            </Badge>
          </div>
          <span className="text-[9px] font-mono text-navy-600 uppercase tracking-wider">{base.id}</span>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-mono font-bold uppercase ${
              dominantType[0] === "hawkish" ? "text-accent-rose" :
              dominantType[0] === "cooperative" ? "text-accent-emerald" :
              "text-accent-amber"
            }`}>{dominantType[0]}</span>
            <span className="text-[9px] font-mono text-navy-500 tabular-nums">{(dominantType[1] * 100).toFixed(0)}%</span>
          </div>
          {profile.knowledgeBankEntries > 0 && (
            <span className="text-[9px] font-mono text-navy-600">{profile.knowledgeBankEntries} KB entries</span>
          )}
        </div>
      </div>

      {/* Type distribution bar */}
      <div className="mb-3">
        <div className="text-[9px] font-mono uppercase tracking-wider text-navy-600 mb-1">Behavioral Type Distribution</div>
        <div className="flex h-1.5 rounded-full overflow-hidden bg-navy-800">
          <div className="bg-accent-emerald/70" style={{ width: `${base.typeDistribution.cooperative * 100}%` }} title={`Cooperative ${(base.typeDistribution.cooperative * 100).toFixed(0)}%`} />
          <div className="bg-accent-rose/70" style={{ width: `${base.typeDistribution.hawkish * 100}%` }} title={`Hawkish ${(base.typeDistribution.hawkish * 100).toFixed(0)}%`} />
          <div className="bg-accent-amber/70" style={{ width: `${base.typeDistribution.unpredictable * 100}%` }} title={`Unpredictable ${(base.typeDistribution.unpredictable * 100).toFixed(0)}%`} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[8px] font-mono text-accent-emerald/60">Cooperative {(base.typeDistribution.cooperative * 100).toFixed(0)}%</span>
          <span className="text-[8px] font-mono text-accent-rose/60">Hawkish {(base.typeDistribution.hawkish * 100).toFixed(0)}%</span>
          <span className="text-[8px] font-mono text-accent-amber/60">Unpredictable {(base.typeDistribution.unpredictable * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Action probabilities */}
      <div className="mb-3">
        <div className="text-[9px] font-mono uppercase tracking-wider text-navy-600 mb-1.5">Base Weekly Action Probabilities</div>
        <div className="grid grid-cols-5 gap-1.5">
          {Object.entries(base.baseActionProbabilities).map(([key, val]) => (
            <div key={key} className="text-center">
              <div className={`text-[11px] font-mono font-bold tabular-nums ${typeColor(val)}`}>
                {(val * 100).toFixed(0)}%
              </div>
              <div className="text-[7px] font-mono text-navy-600 uppercase leading-tight mt-0.5">
                {key.replace(/_/g, "\n")}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Belief framework */}
      {profile.beliefFramework && (
        <div className="mb-2 p-2 bg-navy-900/40 rounded border border-navy-800/30">
          <div className="text-[9px] font-mono uppercase tracking-wider text-navy-600 mb-1">Belief Framework</div>
          <p className="text-[11px] text-navy-300 leading-relaxed">{profile.beliefFramework}</p>
        </div>
      )}

      {/* Decision pattern */}
      {profile.decisionPattern && (
        <div className="mb-2 p-2 bg-navy-900/40 rounded border border-navy-800/30">
          <div className="text-[9px] font-mono uppercase tracking-wider text-navy-600 mb-1">Decision Pattern</div>
          <p className="text-[11px] text-navy-300 leading-relaxed">{profile.decisionPattern}</p>
        </div>
      )}

      {/* Collapsible sections */}
      {!compact && (
        <>
          {/* Public statements */}
          {profile.publicStatements.length > 0 && (
            <Section label="Public Statements" count={profile.publicStatements.length} defaultOpen={profile.publicStatements.length <= 3}>
              <div className="space-y-2">
                {profile.publicStatements.map((stmt, i) => (
                  <div key={i} className="border-l-2 pl-2.5 py-1" style={{
                    borderColor: stmt.significance === "critical" ? "#f43f5e" :
                                 stmt.significance === "high" ? "#f59e0b" :
                                 stmt.significance === "medium" ? "#06b6d4" : "#3d3d3d"
                  }}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[9px] font-mono text-navy-500">{stmt.date}</span>
                      <Badge className={SIG_STYLE[stmt.significance]}>{stmt.significance}</Badge>
                    </div>
                    <p className="text-[11px] text-navy-200 italic leading-relaxed">&ldquo;{stmt.quote}&rdquo;</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] text-navy-500">{stmt.context}</span>
                      <span className="text-[8px] font-mono text-navy-600">{stmt.source}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Scripture references */}
          {profile.scriptureReferences.length > 0 && (
            <Section label="Scripture References" count={profile.scriptureReferences.length}>
              <div className="space-y-2">
                {profile.scriptureReferences.map((ref, i) => (
                  <div key={i} className="p-2 bg-navy-900/40 rounded border border-navy-800/30">
                    <p className="text-[11px] text-navy-200 italic">&ldquo;{ref.text}&rdquo;</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-mono text-accent-cyan/70">{ref.source}</span>
                    </div>
                    <p className="text-[10px] text-navy-400 mt-1 leading-relaxed">{ref.relevance}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Past decisions */}
          {profile.pastDecisions.length > 0 && (
            <Section label="Past Decisions" count={profile.pastDecisions.length}>
              <div className="space-y-2">
                {profile.pastDecisions.map((dec, i) => (
                  <div key={i} className="border border-navy-800/40 rounded p-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-mono text-navy-500">{dec.date}</span>
                      {dec.calendarProximity && (
                        <Badge className="bg-accent-amber/10 text-accent-amber/70 border-accent-amber/20">
                          {dec.calendarProximity.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-navy-200 font-medium mb-0.5">{dec.action}</div>
                    <div className="text-[10px] text-navy-400">{dec.context}</div>
                    <div className="text-[10px] text-navy-300 mt-1">
                      <span className="text-[8px] font-mono uppercase text-navy-600 mr-1.5">Outcome</span>
                      {dec.outcome}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Calendar modifiers */}
          {profile.calendarModifiers.length > 0 && (
            <Section label="Calendar Behavior Modifiers" count={profile.calendarModifiers.length}>
              <div className="space-y-1.5">
                {profile.calendarModifiers.map((mod, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center py-1.5 border-b border-navy-800/30 last:border-0">
                    <div className="col-span-3">
                      <div className="text-[10px] text-navy-200">{mod.calendarEvent.replace(/_/g, " ")}</div>
                      <div className="text-[8px] font-mono text-navy-600 uppercase">{mod.calendarSystem}</div>
                    </div>
                    <div className="col-span-3 text-[10px] text-navy-400">{formatAction(mod.actionType)}</div>
                    <div className="col-span-2">
                      <span className={`text-[11px] font-mono font-bold tabular-nums ${multiplierColor(mod.posteriorMultiplier)}`}>
                        {mod.posteriorMultiplier.toFixed(1)}x
                      </span>
                    </div>
                    <div className="col-span-4">
                      {confidenceBar(mod.confidence)}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

// ── Main Widget ──

export function ActorProfileWidget({ data }: { data: ActorProfileData }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  // Multiple actors
  if (data.actors) {
    return (
      <div className="my-2">
        <div className="text-[10px] uppercase tracking-wider text-navy-500 font-mono mb-2">
          Actor Profiles ({data.actors.length} actors)
        </div>
        <div className="space-y-2">
          {data.actors.map((actor) => (
            <ProfileCard key={actor.base.id} profile={actor} compact />
          ))}
        </div>
      </div>
    );
  }

  // Single actor
  if (data.base) {
    const profile: ExtendedProfile = {
      base: data.base,
      calendarModifiers: data.calendarModifiers || [],
      publicStatements: data.publicStatements || [],
      scriptureReferences: data.scriptureReferences || [],
      pastDecisions: data.pastDecisions || [],
      beliefFramework: data.beliefFramework || "",
      decisionPattern: data.decisionPattern || "",
      knowledgeBankEntries: data.knowledgeBankEntries || 0,
    };

    return (
      <div className="my-2">
        <div className="text-[10px] uppercase tracking-wider text-navy-500 font-mono mb-2">
          Actor Profile
        </div>
        <ProfileCard profile={profile} />
      </div>
    );
  }

  return null;
}
