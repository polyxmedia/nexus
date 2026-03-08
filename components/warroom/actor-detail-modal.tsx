"use client";

import { X } from "lucide-react";
import type { ActorWithGeo } from "@/lib/warroom/types";
import { ACTORS } from "@/lib/game-theory/actors";

interface ActorDetailModalProps {
  actorId: string | null;
  actors: ActorWithGeo[];
  onClose: () => void;
}

export function ActorDetailModal({ actorId, actors, onClose }: ActorDetailModalProps) {
  const actor = actors.find((a) => a.id === actorId);
  if (!actor) return null;

  const getActorName = (id: string) => {
    const a = ACTORS.find((x) => x.id === id);
    return a?.shortName || id.toUpperCase();
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-40 animate-[slideUp_200ms_ease-out]">
      <div className="mx-auto max-w-4xl border-t border-x border-navy-700/60 rounded-t-lg bg-navy-950/95 backdrop-blur-md wr-shadow-lg">
        {/* Terminal header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-navy-800/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-accent-cyan/60" />
              <div className="w-2 h-2 rounded-full bg-navy-700/60" />
              <div className="w-2 h-2 rounded-full bg-navy-700/60" />
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-navy-500">
              actor profile
            </span>
            <span className="font-mono text-[10px] text-navy-600">
              //
            </span>
            <span className="font-mono text-[10px] text-navy-300 font-medium">
              {actor.name}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                actor.colorGroup === "ally"
                  ? "bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20"
                  : actor.colorGroup === "adversary"
                    ? "bg-accent-rose/10 text-accent-rose border-accent-rose/20"
                    : "bg-navy-700/30 text-navy-400 border-navy-700/40"
              }`}
            >
              {actor.colorGroup === "ally"
                ? "US-ALIGNED"
                : actor.colorGroup === "adversary"
                  ? "ADVERSARY"
                  : "NON-ALIGNED"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-navy-500 hover:text-navy-300 hover:bg-navy-800/60 rounded p-1 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-4 gap-4 p-4 max-h-[35vh] overflow-y-auto">
          {/* Objectives */}
          <section>
            <h4 className="text-[9px] uppercase tracking-wider text-navy-600 mb-2 font-mono">
              Objectives
            </h4>
            <ul className="space-y-1">
              {actor.objectives.map((obj, i) => (
                <li key={i} className="text-[11px] text-navy-300 flex items-start gap-1.5 leading-snug">
                  <span className="text-accent-cyan mt-px shrink-0 font-mono text-[10px]">&gt;</span>
                  {obj}
                </li>
              ))}
            </ul>
          </section>

          {/* Capabilities */}
          <section>
            <h4 className="text-[9px] uppercase tracking-wider text-navy-600 mb-2 font-mono">
              Capabilities
            </h4>
            <ul className="space-y-1">
              {actor.capabilities.map((cap, i) => (
                <li key={i} className="text-[11px] text-navy-300 flex items-start gap-1.5 leading-snug">
                  <span className="text-navy-500 mt-px shrink-0 font-mono text-[10px]">&gt;</span>
                  {cap}
                </li>
              ))}
            </ul>
          </section>

          {/* Constraints + Red Lines */}
          <section>
            <h4 className="text-[9px] uppercase tracking-wider text-navy-600 mb-2 font-mono">
              Constraints
            </h4>
            <ul className="space-y-1 mb-3">
              {actor.constraints.map((con, i) => (
                <li key={i} className="text-[11px] text-navy-400 flex items-start gap-1.5 leading-snug">
                  <span className="text-navy-600 mt-px shrink-0 font-mono text-[10px]">&gt;</span>
                  {con}
                </li>
              ))}
            </ul>
            <h4 className="text-[9px] uppercase tracking-wider text-accent-rose/70 mb-2 font-mono">
              Red Lines
            </h4>
            <ul className="space-y-1">
              {actor.redLines.map((line, i) => (
                <li
                  key={i}
                  className="text-[11px] text-navy-200 border-l border-accent-rose/40 pl-2 leading-snug"
                >
                  {line}
                </li>
              ))}
            </ul>
          </section>

          {/* Alliances & Adversaries */}
          <section>
            <h4 className="text-[9px] uppercase tracking-wider text-navy-600 mb-2 font-mono">
              Alliances
            </h4>
            <div className="flex flex-wrap gap-1 mb-3">
              {actor.alliances.map((id) => (
                <span
                  key={id}
                  className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20"
                >
                  {getActorName(id)}
                </span>
              ))}
            </div>
            <h4 className="text-[9px] uppercase tracking-wider text-navy-600 mb-2 font-mono">
              Adversaries
            </h4>
            <div className="flex flex-wrap gap-1">
              {actor.adversaries.map((id) => (
                <span
                  key={id}
                  className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-accent-rose/10 text-accent-rose border border-accent-rose/20"
                >
                  {getActorName(id)}
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
