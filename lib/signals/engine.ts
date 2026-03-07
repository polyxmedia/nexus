import { getAllCelestialEvents } from "./celestial";
import { getHebrewCalendarEvents, getShmitaInfo } from "./hebrew-calendar";
import { getIslamicCalendarEvents } from "./islamic-calendar";
import { getGeopoliticalEvents } from "./geopolitical";
import { scoreConvergences, type ConvergenceResult } from "./intensity";
import type { NewSignal } from "../db/schema";

export interface SignalGenerationResult {
  signals: NewSignal[];
  convergences: ConvergenceResult[];
  shmitaInfo: ReturnType<typeof getShmitaInfo>;
  stats: {
    totalSignals: number;
    byIntensity: Record<number, number>;
    byCategory: Record<string, number>;
    celestialCount: number;
    hebrewCount: number;
    islamicCount: number;
    geopoliticalCount: number;
  };
}

export function generateSignals(year: number): SignalGenerationResult {
  // Gather all four layers
  const celestialEvents = getAllCelestialEvents(year);
  const hebrewEvents = getHebrewCalendarEvents(year);
  const islamicEvents = getIslamicCalendarEvents(year);
  const geopoliticalEvents = getGeopoliticalEvents(year);
  const shmitaInfo = getShmitaInfo(year);

  // Convert Islamic events into the Hebrew signal format for convergence scoring
  // (they share the same structure: date, holiday, significance, description, marketRelevance)
  const islamicAsHebrew = islamicEvents.map(e => ({
    date: e.date,
    hebrewDate: e.hijriDate,
    holiday: e.holiday,
    type: e.type,
    significance: e.significance,
    description: e.description,
    marketRelevance: e.marketRelevance,
  }));

  // Merge Hebrew and Islamic events for convergence scoring
  const allCalendarEvents = [...hebrewEvents, ...islamicAsHebrew];

  // Score convergences
  const convergences = scoreConvergences(celestialEvents, allCalendarEvents, geopoliticalEvents);

  // Convert convergences to database signals
  const signals: NewSignal[] = convergences.map((c) => ({
    title: c.title,
    description: c.description,
    date: c.date,
    intensity: c.intensity,
    category: c.category,
    celestialType: c.celestialEvents.length > 0 ? c.celestialEvents[0].type : null,
    hebrewDate: c.hebrewEvents.length > 0 ? c.hebrewEvents[0].hebrewDate : null,
    hebrewHoliday: c.hebrewEvents.length > 0 ? c.hebrewEvents[0].holiday : null,
    geopoliticalContext:
      c.geopoliticalEvents.length > 0
        ? c.geopoliticalEvents.map((e) => e.title).join(", ")
        : null,
    layers: JSON.stringify(c.layers),
    marketSectors: JSON.stringify(c.marketSectors),
    historicalPrecedent: buildHistoricalPrecedent(c),
    status: getSignalStatus(c.date),
  }));

  // Stats
  const byIntensity: Record<number, number> = {};
  const byCategory: Record<string, number> = {};
  for (const s of signals) {
    byIntensity[s.intensity] = (byIntensity[s.intensity] || 0) + 1;
    byCategory[s.category] = (byCategory[s.category] || 0) + 1;
  }

  return {
    signals,
    convergences,
    shmitaInfo,
    stats: {
      totalSignals: signals.length,
      byIntensity,
      byCategory,
      celestialCount: celestialEvents.length,
      hebrewCount: hebrewEvents.length,
      islamicCount: islamicEvents.length,
      geopoliticalCount: geopoliticalEvents.length,
    },
  };
}

function getSignalStatus(date: string): string {
  const now = new Date();
  const signalDate = new Date(date);
  const daysDiff = (signalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (daysDiff < -1) return "passed";
  if (daysDiff <= 1) return "active";
  return "upcoming";
}

function buildHistoricalPrecedent(convergence: ConvergenceResult): string | null {
  const precedents: string[] = [];

  for (const he of convergence.hebrewEvents) {
    if (he.holiday.includes("Tish'a B'Av")) {
      precedents.push(
        "Tisha B'Av: Destruction of First Temple (586 BCE), Second Temple (70 CE), Spanish Expulsion (1492), WWI (1914)"
      );
    }
    if (he.holiday.includes("Yom Kippur")) {
      precedents.push("Yom Kippur War (1973) - surprise attack on Israel, oil embargo followed");
    }
  }

  for (const ge of convergence.geopoliticalEvents) {
    if (ge.type === "conflict_anniversary" && ge.title.includes("October 7")) {
      precedents.push("October 7, 2023 - Hamas attack, regional escalation, shipping disruptions");
    }
    if (ge.type === "conflict_anniversary" && ge.title.includes("Russia-Ukraine")) {
      precedents.push("Feb 24, 2022 - Russian invasion, energy crisis, commodity supercycle");
    }
  }

  return precedents.length > 0 ? precedents.join(" | ") : null;
}
