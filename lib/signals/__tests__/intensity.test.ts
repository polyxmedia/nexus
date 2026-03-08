import { describe, it, expect } from "vitest";
import { scoreConvergences } from "../intensity";
import type { CelestialEvent } from "../celestial";
import type { HebrewCalendarSignal } from "../hebrew-calendar";
import type { GeopoliticalEvent } from "../geopolitical";

function makeCelestial(overrides: Partial<CelestialEvent> = {}): CelestialEvent {
  return {
    date: "2025-06-15",
    title: "Full Moon",
    description: "Full Moon in Sagittarius",
    type: "full_moon",
    significance: 2,
    ...overrides,
  };
}

function makeHebrew(overrides: Partial<HebrewCalendarSignal> = {}): HebrewCalendarSignal {
  return {
    date: "2025-06-15",
    hebrewDate: "6 Sivan 5785",
    holiday: "Shavuot",
    type: "major",
    description: "Festival of Weeks",
    significance: 3,
    marketRelevance: "agricultural commodities historically affected",
    ...overrides,
  };
}

function makeGeopolitical(overrides: Partial<GeopoliticalEvent> = {}): GeopoliticalEvent {
  return {
    date: "2025-06-15",
    title: "OPEC+ Meeting",
    description: "OPEC+ production decision expected",
    type: "economic",
    significance: 3,
    region: "Global",
    sectors: ["energy"],
    ...overrides,
  };
}

describe("scoreConvergences", () => {
  it("returns empty array for no events", () => {
    const result = scoreConvergences([], [], []);
    expect(result).toEqual([]);
  });

  it("creates a single-layer result for one celestial event", () => {
    const result = scoreConvergences([makeCelestial()], [], []);
    expect(result.length).toBe(1);
    expect(result[0].layers).toEqual(["celestial"]);
    expect(result[0].category).toBe("celestial");
  });

  it("creates a convergence when multiple layers share the same date", () => {
    const result = scoreConvergences(
      [makeCelestial()],
      [makeHebrew()],
      [makeGeopolitical()]
    );
    expect(result.length).toBe(1);
    expect(result[0].layers).toContain("celestial");
    expect(result[0].layers).toContain("hebrew");
    expect(result[0].layers).toContain("geopolitical");
    expect(result[0].category).toBe("convergence");
  });

  it("clusters events within 3 days of each other", () => {
    const result = scoreConvergences(
      [makeCelestial({ date: "2025-06-15" })],
      [makeHebrew({ date: "2025-06-17" })],
      []
    );
    // Should be clustered together (2 days apart)
    expect(result.length).toBe(1);
    expect(result[0].layers.length).toBe(2);
  });

  it("separates events more than 3 days apart", () => {
    const result = scoreConvergences(
      [makeCelestial({ date: "2025-06-10" })],
      [makeHebrew({ date: "2025-06-20" })],
      []
    );
    expect(result.length).toBe(2);
    expect(result[0].layers.length).toBe(1);
    expect(result[1].layers.length).toBe(1);
  });

  it("intensity is bounded between 1 and 5", () => {
    // Low significance single event
    const low = scoreConvergences([makeCelestial({ significance: 1 })], [], []);
    expect(low[0].intensity).toBeGreaterThanOrEqual(1);
    expect(low[0].intensity).toBeLessThanOrEqual(5);

    // High significance multi-layer convergence
    const high = scoreConvergences(
      [makeCelestial({ significance: 5 })],
      [makeHebrew({ significance: 5 })],
      [makeGeopolitical({ significance: 5 })]
    );
    expect(high[0].intensity).toBeGreaterThanOrEqual(3);
    expect(high[0].intensity).toBeLessThanOrEqual(5);
  });

  it("convergence bonus increases intensity", () => {
    const singleLayer = scoreConvergences(
      [makeCelestial({ significance: 2 })],
      [],
      []
    );
    const multiLayer = scoreConvergences(
      [makeCelestial({ significance: 2 })],
      [makeHebrew({ significance: 2 })],
      [makeGeopolitical({ significance: 2 })]
    );
    expect(multiLayer[0].intensity).toBeGreaterThanOrEqual(singleLayer[0].intensity);
  });

  it("results are sorted by date", () => {
    const result = scoreConvergences(
      [
        makeCelestial({ date: "2025-07-01" }),
        makeCelestial({ date: "2025-06-01" }),
      ],
      [],
      []
    );
    expect(result.length).toBe(2);
    expect(result[0].date).toBe("2025-06-01");
    expect(result[1].date).toBe("2025-07-01");
  });

  it("collects market sectors from geopolitical events", () => {
    const result = scoreConvergences(
      [],
      [],
      [makeGeopolitical({ sectors: ["energy", "defense"] })]
    );
    expect(result[0].marketSectors).toContain("energy");
    expect(result[0].marketSectors).toContain("defense");
  });

  it("builds title from event titles", () => {
    const result = scoreConvergences(
      [makeCelestial({ title: "Solar Eclipse" })],
      [makeHebrew({ holiday: "Yom Kippur" })],
      []
    );
    expect(result[0].title).toBe("Solar Eclipse + Yom Kippur");
  });

  it("truncates title for 3+ events", () => {
    const result = scoreConvergences(
      [makeCelestial({ title: "Eclipse" })],
      [makeHebrew({ holiday: "Pesach" })],
      [makeGeopolitical({ title: "NATO Summit" })]
    );
    expect(result[0].title).toContain("Eclipse");
    expect(result[0].title).toContain("2 convergent events");
  });
});
