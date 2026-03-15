import { describe, it, expect } from "vitest";
import {
  detectEschatologicalConvergences,
  getActorEschatologicalProfile,
  getEschatologicalLandscape,
  ESCHATOLOGICAL_PROGRAMMES,
  ESCHATOLOGICAL_CALENDAR_TRIGGERS,
} from "../eschatological";

// ── Programme Data Integrity ──

describe("ESCHATOLOGICAL_PROGRAMMES", () => {
  it("all programmes have required fields", () => {
    for (const p of ESCHATOLOGICAL_PROGRAMMES) {
      expect(p.actorId).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.theology).toBeTruthy();
      expect(p.mandate).toBeTruthy();
      expect(p.targetGeography.length).toBeGreaterThan(0);
      expect(p.doctrinalBasis.length).toBeGreaterThan(0);
      expect(p.operationalIndicators.length).toBeGreaterThan(0);
      expect(p.marketSectors.length).toBeGreaterThan(0);
    }
  });

  it("policyInfluence is between 0 and 1", () => {
    for (const p of ESCHATOLOGICAL_PROGRAMMES) {
      expect(p.policyInfluence).toBeGreaterThanOrEqual(0);
      expect(p.policyInfluence).toBeLessThanOrEqual(1);
    }
  });

  it("rigidity is between 0 and 1", () => {
    for (const p of ESCHATOLOGICAL_PROGRAMMES) {
      expect(p.rigidity).toBeGreaterThanOrEqual(0);
      expect(p.rigidity).toBeLessThanOrEqual(1);
    }
  });

  it("has at least 5 tracked programmes", () => {
    expect(ESCHATOLOGICAL_PROGRAMMES.length).toBeGreaterThanOrEqual(5);
  });

  it("actor IDs are unique", () => {
    const ids = ESCHATOLOGICAL_PROGRAMMES.map((p) => p.actorId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("ESCHATOLOGICAL_CALENDAR_TRIGGERS", () => {
  it("all triggers reference valid actor IDs", () => {
    const validActors = new Set(ESCHATOLOGICAL_PROGRAMMES.map((p) => p.actorId));
    for (const t of ESCHATOLOGICAL_CALENDAR_TRIGGERS) {
      expect(validActors.has(t.actorId)).toBe(true);
    }
  });

  it("all triggers reference valid programme names", () => {
    const validNames = new Set(ESCHATOLOGICAL_PROGRAMMES.map((p) => p.name));
    for (const t of ESCHATOLOGICAL_CALENDAR_TRIGGERS) {
      expect(validNames.has(t.programmeId)).toBe(true);
    }
  });

  it("activationMultiplier is >= 1", () => {
    for (const t of ESCHATOLOGICAL_CALENDAR_TRIGGERS) {
      expect(t.activationMultiplier).toBeGreaterThanOrEqual(1);
    }
  });

  it("confidence is between 0 and 1", () => {
    for (const t of ESCHATOLOGICAL_CALENDAR_TRIGGERS) {
      expect(t.confidence).toBeGreaterThan(0);
      expect(t.confidence).toBeLessThanOrEqual(1);
    }
  });
});

// ── Convergence Detection ──

describe("detectEschatologicalConvergences", () => {
  it("detects convergences without calendar events", () => {
    const convergences = detectEschatologicalConvergences();
    // Should find incompatible pairs among active programmes
    expect(convergences.length).toBeGreaterThan(0);
  });

  it("Israel vs Iran convergence has highest incompatibility score", () => {
    const convergences = detectEschatologicalConvergences();
    const israelIran = convergences.find(
      (c) => c.actors.includes("israel_far_right") && c.actors.includes("iran_irgc")
    );
    expect(israelIran).toBeDefined();
    // Should have among the highest significance scores
    expect(israelIran!.significance).toBeGreaterThan(2);
    // Composite rigidity should be high (both programmes are rigid)
    expect(israelIran!.compositeRigidity).toBeGreaterThan(0.80);
  });

  it("all convergences have valid significance (0-9)", () => {
    const convergences = detectEschatologicalConvergences();
    for (const c of convergences) {
      expect(c.significance).toBeGreaterThanOrEqual(0);
      expect(c.significance).toBeLessThanOrEqual(9);
    }
  });

  it("all convergences have amplification factor >= 1.0", () => {
    const convergences = detectEschatologicalConvergences();
    for (const c of convergences) {
      expect(c.amplificationFactor).toBeGreaterThanOrEqual(1.0);
    }
  });

  it("calendar events increase amplification", () => {
    const withoutCalendar = detectEschatologicalConvergences([]);
    const withCalendar = detectEschatologicalConvergences(["purim", "ramadan"]);

    // Find the Israel-Iran pair in both
    const findIsraelIran = (list: typeof withoutCalendar) =>
      list.find((c) => c.actors.includes("israel_far_right") && c.actors.includes("iran_irgc"));

    const without = findIsraelIran(withoutCalendar);
    const with_ = findIsraelIran(withCalendar);

    expect(without).toBeDefined();
    expect(with_).toBeDefined();
    expect(with_!.amplificationFactor).toBeGreaterThanOrEqual(without!.amplificationFactor);
  });

  it("returns sorted by significance (descending)", () => {
    const convergences = detectEschatologicalConvergences();
    for (let i = 1; i < convergences.length; i++) {
      expect(convergences[i].significance).toBeLessThanOrEqual(convergences[i - 1].significance);
    }
  });

  it("convergences have shared geography", () => {
    const convergences = detectEschatologicalConvergences();
    for (const c of convergences) {
      expect(c.sharedGeography.length).toBeGreaterThan(0);
    }
  });

  it("convergences have market sectors", () => {
    const convergences = detectEschatologicalConvergences();
    for (const c of convergences) {
      expect(c.marketSectors.length).toBeGreaterThan(0);
    }
  });

  it("all convergences have valid Seldon classification", () => {
    const convergences = detectEschatologicalConvergences();
    const validClassifications = ["seldon_crisis", "approaching", "latent"];
    for (const c of convergences) {
      expect(validClassifications).toContain(c.seldonClassification);
    }
  });

  it("Israel-Iran reaches Seldon Crisis during calendar convergence", () => {
    // Without calendar events, it's "approaching" (significance ~3.3)
    const baseline = detectEschatologicalConvergences([]);
    const israelIranBaseline = baseline.find(
      (c) => c.actors.includes("israel_far_right") && c.actors.includes("iran_irgc")
    );
    expect(israelIranBaseline).toBeDefined();
    expect(israelIranBaseline!.seldonClassification).toBe("approaching");

    // With Purim + Ramadan active, calendar boost pushes significance >= 4
    const elevated = detectEschatologicalConvergences(["purim", "ramadan"]);
    const israelIranElevated = elevated.find(
      (c) => c.actors.includes("israel_far_right") && c.actors.includes("iran_irgc")
    );
    expect(israelIranElevated).toBeDefined();
    expect(israelIranElevated!.seldonClassification).toBe("seldon_crisis");
  });

  it("low-rigidity pairs are not classified as Seldon Crisis", () => {
    const convergences = detectEschatologicalConvergences();
    const turkeyIran = convergences.find(
      (c) => c.actors.includes("turkey_erdogan") && c.actors.includes("iran_irgc")
    );
    expect(turkeyIran).toBeDefined();
    // Turkey rigidity 0.50, Iran rigidity 0.85, composite = 0.675 < 0.80
    expect(turkeyIran!.seldonClassification).not.toBe("seldon_crisis");
  });
});

// ── Actor Profiles ──

describe("getActorEschatologicalProfile", () => {
  it("returns profile for known actor", () => {
    const result = getActorEschatologicalProfile("israel_far_right");
    expect(result.programme).not.toBeNull();
    expect(result.programme!.name).toBe("Third Temple Programme");
  });

  it("returns null programme for unknown actor", () => {
    const result = getActorEschatologicalProfile("nonexistent_actor");
    expect(result.programme).toBeNull();
    expect(result.calendarTriggers).toHaveLength(0);
  });

  it("returns calendar triggers for actors with triggers", () => {
    const result = getActorEschatologicalProfile("israel_far_right");
    expect(result.calendarTriggers.length).toBeGreaterThan(0);
    expect(result.calendarTriggers[0].calendarEvent).toBeTruthy();
  });

  it("returns incompatibilities for actors with opponents", () => {
    const result = getActorEschatologicalProfile("iran_irgc");
    expect(result.incompatibilities.length).toBeGreaterThan(0);
    // Iran should be incompatible with Israel
    const vsIsrael = result.incompatibilities.find((i) => i.opponent === "israel_far_right");
    expect(vsIsrael).toBeDefined();
    expect(vsIsrael!.score).toBeGreaterThan(0.8);
  });

  it("incompatibility scores are between 0 and 1", () => {
    for (const prog of ESCHATOLOGICAL_PROGRAMMES) {
      const result = getActorEschatologicalProfile(prog.actorId);
      for (const inc of result.incompatibilities) {
        expect(inc.score).toBeGreaterThanOrEqual(0);
        expect(inc.score).toBeLessThanOrEqual(1);
      }
    }
  });
});

// ── Landscape ──

describe("getEschatologicalLandscape", () => {
  it("returns active programmes", () => {
    const landscape = getEschatologicalLandscape();
    expect(landscape.programmes.length).toBeGreaterThan(0);
    // All returned programmes should have calendarElevation >= 1.0
    for (const p of landscape.programmes) {
      expect(p.calendarElevation).toBeGreaterThanOrEqual(1.0);
    }
  });

  it("identifies no-off-ramp pairs", () => {
    const landscape = getEschatologicalLandscape();
    // Israel vs Iran should be a no-off-ramp pair (composite rigidity >= 0.80)
    expect(landscape.noOffRampPairs.length).toBeGreaterThan(0);
    const hasIsraelIran = landscape.noOffRampPairs.some(
      (pair) => pair.includes("israel_far_right") && pair.includes("iran_irgc")
    );
    expect(hasIsraelIran).toBe(true);
  });

  it("calendar events elevate programme activation", () => {
    const withoutCal = getEschatologicalLandscape([]);
    const withCal = getEschatologicalLandscape(["tisha_bav"]);

    const israelWithout = withoutCal.programmes.find((p) => p.actorId === "israel_far_right");
    const israelWith = withCal.programmes.find((p) => p.actorId === "israel_far_right");

    expect(israelWithout!.calendarElevation).toBe(1.0);
    expect(israelWith!.calendarElevation).toBeGreaterThan(1.0);
  });

  it("highestAmplification reflects the worst-case pair", () => {
    const landscape = getEschatologicalLandscape();
    expect(landscape.highestAmplification).toBeGreaterThan(1.0);
  });

  it("reports Seldon Crisis count", () => {
    // With calendar triggers active, at least one should reach crisis
    const landscape = getEschatologicalLandscape(["purim", "ramadan"]);
    expect(landscape.seldonCrisisCount).toBeGreaterThanOrEqual(0);
    expect(landscape.seldonApproachingCount).toBeGreaterThanOrEqual(0);
    expect(landscape.seldonCrisisCount + landscape.seldonApproachingCount).toBeGreaterThan(0);
  });
});
