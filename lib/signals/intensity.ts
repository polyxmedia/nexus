import type { CelestialEvent } from "./celestial";
import type { HebrewCalendarSignal } from "./hebrew-calendar";
import type { GeopoliticalEvent } from "./geopolitical";
import { getEsotericReading, type EsotericReading } from "./numerology";

export interface ConvergenceResult {
  date: string;
  intensity: number; // 1-5
  layers: string[];
  celestialEvents: CelestialEvent[];
  hebrewEvents: HebrewCalendarSignal[];
  geopoliticalEvents: GeopoliticalEvent[];
  esoteric?: EsotericReading;
  title: string;
  description: string;
  category: string;
  marketSectors: string[];
}

const PROXIMITY_DAYS = 3; // Events within 3 days are considered convergent

function daysBetween(a: string, b: string): number {
  const da = new Date(a);
  const db = new Date(b);
  return Math.abs(da.getTime() - db.getTime()) / (1000 * 60 * 60 * 24);
}

export function scoreConvergences(
  celestial: CelestialEvent[],
  hebrew: HebrewCalendarSignal[],
  geopolitical: GeopoliticalEvent[]
): ConvergenceResult[] {
  const results: ConvergenceResult[] = [];

  // Collect all unique date clusters
  const allDates = new Set<string>();
  celestial.forEach((e) => allDates.add(e.date));
  hebrew.forEach((e) => allDates.add(e.date));
  geopolitical.forEach((e) => allDates.add(e.date));

  const sortedDates = Array.from(allDates).sort();

  // Cluster nearby dates
  const clusters: string[][] = [];
  let currentCluster: string[] = [];

  for (const date of sortedDates) {
    if (
      currentCluster.length === 0 ||
      daysBetween(currentCluster[currentCluster.length - 1], date) <= PROXIMITY_DAYS
    ) {
      currentCluster.push(date);
    } else {
      clusters.push([...currentCluster]);
      currentCluster = [date];
    }
  }
  if (currentCluster.length > 0) clusters.push(currentCluster);

  for (const cluster of clusters) {
    const clusterStart = cluster[0];
    const clusterEnd = cluster[cluster.length - 1];

    // Find all events in this cluster
    const ce = celestial.filter((e) =>
      cluster.some((d) => daysBetween(e.date, d) <= PROXIMITY_DAYS)
    );
    const he = hebrew.filter((e) =>
      cluster.some((d) => daysBetween(e.date, d) <= PROXIMITY_DAYS)
    );
    const ge = geopolitical.filter((e) =>
      cluster.some((d) => daysBetween(e.date, d) <= PROXIMITY_DAYS)
    );

    // Count active layers
    const layers: string[] = [];
    if (ce.length > 0) layers.push("celestial");
    if (he.length > 0) layers.push("hebrew");
    if (ge.length > 0) layers.push("geopolitical");

    if (layers.length === 0) continue;

    // Esoteric reading for this date
    const esoteric = getEsotericReading(new Date(clusterStart + "T12:00:00Z"));

    // Base score from individual event significance
    const baseScore =
      ce.reduce((s, e) => s + e.significance, 0) +
      he.reduce((s, e) => s + e.significance, 0) +
      ge.reduce((s, e) => s + e.significance, 0);

    // Convergence bonus: +1 for each additional layer beyond the first
    const convergenceBonus = Math.max(0, layers.length - 1);

    // Esoteric reading kept for cultural context only — does NOT feed trading intensity.
    // Stripped from composite per analysis: lunar phase, Chinese zodiac, numerology,
    // flying stars, Kondratieff. Hebrew/Islamic calendars already feed as first-class
    // event layers above.

    // Raw intensity (no esoteric adjustment)
    const rawIntensity = Math.min(baseScore + convergenceBonus, 10);

    // Normalize to 1-5 scale
    const intensity = Math.max(1, Math.min(5, Math.ceil(rawIntensity / 2)));

    // Build title and description
    const allTitles = [
      ...ce.map((e) => e.title),
      ...he.map((e) => e.holiday),
      ...ge.map((e) => e.title),
    ];

    const title =
      allTitles.length <= 2
        ? allTitles.join(" + ")
        : `${allTitles[0]} + ${allTitles.length - 1} convergent events`;

    const descriptions = [
      ...ce.map((e) => e.description),
      ...he.map((e) => e.description),
      ...ge.map((e) => e.description),
    ];

    const category =
      layers.length > 1
        ? "convergence"
        : layers[0];

    const sectors = new Set<string>();
    ge.forEach((e) => e.sectors.forEach((s) => sectors.add(s)));
    he.forEach((e) => {
      if (e.marketRelevance.includes("energy")) sectors.add("energy");
      if (e.marketRelevance.includes("defense")) sectors.add("defense");
      if (e.marketRelevance.includes("agricultural")) sectors.add("agriculture");
    });

    results.push({
      date: clusterStart,
      intensity,
      layers,
      celestialEvents: ce,
      hebrewEvents: he,
      geopoliticalEvents: ge,
      esoteric,
      title,
      description: descriptions.join(" | "),
      category,
      marketSectors: Array.from(sectors),
    });
  }

  return results.sort((a, b) => a.date.localeCompare(b.date));
}
