import { describe, it, expect } from "vitest";
import {
  computeLayerLikelihood,
  adjustForDependency,
  bayesianUpdate,
  posteriorToIntensity,
  bayesianFusion,
  scoreBayesianConvergences,
  SCENARIO_PRIORS,
  DEPENDENCY_MATRIX,
} from "../bayesian-fusion";
import type { CelestialEvent } from "../celestial";
import type { HebrewCalendarSignal } from "../hebrew-calendar";
import type { GeopoliticalEvent } from "../geopolitical";

// ── Helpers ──

function makeCelestial(overrides: Partial<CelestialEvent> = {}): CelestialEvent {
  return {
    date: "2025-01-15",
    title: "Full Moon",
    type: "full_moon",
    significance: 2,
    description: "Full Moon in Cancer",
    ...overrides,
  };
}

function makeHebrew(overrides: Partial<HebrewCalendarSignal> = {}): HebrewCalendarSignal {
  return {
    date: "2025-01-15",
    hebrewDate: "15 Tevet 5785",
    holiday: "Fast Day",
    type: "fast",
    significance: 2,
    description: "Minor fast day",
    marketRelevance: "defense",
    ...overrides,
  };
}

function makeGeopolitical(overrides: Partial<GeopoliticalEvent> = {}): GeopoliticalEvent {
  return {
    date: "2025-01-15",
    title: "Military Exercise",
    type: "military",
    significance: 3,
    description: "Major military exercise near border",
    region: "Middle East",
    sectors: ["defense", "energy"],
    ...overrides,
  };
}

// ── Tests ──

describe("computeLayerLikelihood", () => {
  it("returns LR=1 for zero significance (no evidence)", () => {
    const { likelihoodRatio } = computeLayerLikelihood(0, "geopolitical");
    expect(likelihoodRatio).toBe(1);
  });

  it("returns LR > 1 for positive significance", () => {
    const { likelihoodRatio } = computeLayerLikelihood(3, "geopolitical");
    expect(likelihoodRatio).toBeGreaterThan(1);
  });

  it("higher significance produces higher LR", () => {
    const low = computeLayerLikelihood(1, "geopolitical");
    const high = computeLayerLikelihood(5, "geopolitical");
    expect(high.likelihoodRatio).toBeGreaterThan(low.likelihoodRatio);
  });

  it("more reliable layers produce higher LR for same significance", () => {
    const geo = computeLayerLikelihood(3, "geopolitical"); // reliability 0.85
    const cel = computeLayerLikelihood(3, "celestial");    // reliability 0.35
    expect(geo.likelihoodRatio).toBeGreaterThan(cel.likelihoodRatio);
  });

  it("caps significance to prevent extreme values", () => {
    const extreme = computeLayerLikelihood(100, "geopolitical");
    // Should be capped at significance=9, so LR should be finite and reasonable
    expect(extreme.likelihoodRatio).toBeLessThan(100);
    expect(isFinite(extreme.likelihoodRatio)).toBe(true);
  });
});

describe("adjustForDependency", () => {
  it("returns raw LR when no previous layers", () => {
    const adjusted = adjustForDependency(4.0, "geopolitical", []);
    expect(adjusted).toBe(4.0);
  });

  it("discounts LR when correlated layer was already processed", () => {
    // Geopolitical and OSINT have independence factor 0.50
    const adjusted = adjustForDependency(3.5, "osint", ["geopolitical"]);
    // Expected: 1 + 0.50 * (3.5 - 1) = 2.25
    expect(adjusted).toBeCloseTo(2.25, 2);
  });

  it("uses minimum independence factor across all previous layers", () => {
    // OSINT with both geopolitical (0.50) and market (0.65) already seen
    // Should use the minimum: 0.50
    const adjusted = adjustForDependency(3.0, "osint", ["geopolitical", "market"]);
    // Expected: 1 + 0.50 * (3.0 - 1) = 2.0
    expect(adjusted).toBeCloseTo(2.0, 2);
  });

  it("applies minimal discounting for independent layers", () => {
    // Celestial and geopolitical have independence factor 0.95
    const adjusted = adjustForDependency(3.0, "celestial", ["geopolitical"]);
    // Expected: 1 + 0.95 * (3.0 - 1) = 2.9
    expect(adjusted).toBeCloseTo(2.9, 2);
  });
});

describe("bayesianUpdate", () => {
  it("increases posterior when LR > 1", () => {
    const posterior = bayesianUpdate(0.10, 4.0);
    expect(posterior).toBeGreaterThan(0.10);
  });

  it("decreases posterior when LR < 1", () => {
    const posterior = bayesianUpdate(0.50, 0.5);
    expect(posterior).toBeLessThan(0.50);
  });

  it("leaves posterior unchanged when LR = 1", () => {
    const posterior = bayesianUpdate(0.30, 1.0);
    expect(posterior).toBeCloseTo(0.30, 10);
  });

  it("produces correct value for known inputs", () => {
    // P(H)=0.10, LR=4 -> P(H|E) = (0.1*4)/(0.1*4 + 0.9) = 0.4/1.3 ≈ 0.3077
    const posterior = bayesianUpdate(0.10, 4.0);
    expect(posterior).toBeCloseTo(0.4 / 1.3, 4);
  });

  it("approaches 1 for very high LR", () => {
    const posterior = bayesianUpdate(0.10, 100);
    expect(posterior).toBeGreaterThan(0.90);
  });
});

describe("posteriorToIntensity", () => {
  it("maps low posterior to intensity 1", () => {
    expect(posteriorToIntensity(0.05)).toBe(1);
    expect(posteriorToIntensity(0.11)).toBe(1);
  });

  it("maps moderate posterior to intensity 2-3", () => {
    expect(posteriorToIntensity(0.15)).toBe(2);
    expect(posteriorToIntensity(0.30)).toBe(3);
  });

  it("maps high posterior to intensity 4-5", () => {
    expect(posteriorToIntensity(0.45)).toBe(4);
    expect(posteriorToIntensity(0.70)).toBe(5);
  });

  it("boundary values", () => {
    expect(posteriorToIntensity(0.12)).toBe(2);
    expect(posteriorToIntensity(0.22)).toBe(3);
    expect(posteriorToIntensity(0.35)).toBe(4);
    expect(posteriorToIntensity(0.55)).toBe(5);
  });
});

describe("bayesianFusion", () => {
  it("returns prior when no layers have evidence", () => {
    const result = bayesianFusion(0.10, []);
    expect(result.posterior).toBe(0.10);
    expect(result.intensity).toBe(1);
  });

  it("updates posterior with single layer evidence", () => {
    const result = bayesianFusion(0.10, [
      { type: "geopolitical", significance: 3, events: [{ significance: 3 }] },
    ]);
    expect(result.posterior).toBeGreaterThan(0.10);
    expect(result.layerContributions["geopolitical"]).toBeGreaterThan(0);
  });

  it("multi-layer evidence produces higher posterior than single layer", () => {
    const single = bayesianFusion(0.10, [
      { type: "geopolitical", significance: 3, events: [{ significance: 3 }] },
    ]);
    const multi = bayesianFusion(0.10, [
      { type: "geopolitical", significance: 3, events: [{ significance: 3 }] },
      { type: "market", significance: 3, events: [{ significance: 3 }] },
    ]);
    expect(multi.posterior).toBeGreaterThan(single.posterior);
  });

  it("processes layers in order of reliability (strongest first)", () => {
    const result = bayesianFusion(0.10, [
      { type: "celestial", significance: 3, events: [{ significance: 3 }] },
      { type: "geopolitical", significance: 3, events: [{ significance: 3 }] },
    ]);
    // Geopolitical should contribute more because it's processed first (higher reliability)
    expect(result.layerContributions["geopolitical"]).toBeGreaterThan(
      result.layerContributions["celestial"]
    );
  });

  it("skips layers with zero total significance", () => {
    const result = bayesianFusion(0.10, [
      { type: "geopolitical", significance: 0, events: [{ significance: 0 }] },
    ]);
    expect(result.posterior).toBe(0.10);
    expect(result.layerContributions).toEqual({});
  });
});

describe("SCENARIO_PRIORS", () => {
  it("all priors are between 0 and 1", () => {
    for (const [, prior] of Object.entries(SCENARIO_PRIORS)) {
      expect(prior).toBeGreaterThan(0);
      expect(prior).toBeLessThan(1);
    }
  });

  it("military escalation has lower prior than market disruption", () => {
    expect(SCENARIO_PRIORS.military_escalation).toBeLessThan(
      SCENARIO_PRIORS.market_disruption
    );
  });
});

describe("SCENARIO_PRIORS - eschatological", () => {
  it("has eschatological_collision prior", () => {
    expect(SCENARIO_PRIORS.eschatological_collision).toBeDefined();
    expect(SCENARIO_PRIORS.eschatological_collision).toBeGreaterThan(0);
    expect(SCENARIO_PRIORS.eschatological_collision).toBeLessThan(0.10);
  });
});

describe("DEPENDENCY_MATRIX", () => {
  it("geopolitical-osint are highly correlated (low independence)", () => {
    expect(DEPENDENCY_MATRIX.geopolitical.osint).toBeLessThan(0.6);
  });

  it("celestial-geopolitical are nearly independent", () => {
    expect(DEPENDENCY_MATRIX.celestial.geopolitical).toBeGreaterThan(0.9);
  });

  it("eschatological layer has entries for all other layers", () => {
    const eschaRow = DEPENDENCY_MATRIX.eschatological;
    expect(eschaRow).toBeDefined();
    expect(eschaRow.geopolitical).toBeDefined();
    expect(eschaRow.celestial).toBeDefined();
    expect(eschaRow.hebrew).toBeDefined();
    expect(eschaRow.market).toBeDefined();
    expect(eschaRow.osint).toBeDefined();
  });

  it("eschatological-hebrew have moderate correlation (shared calendar basis)", () => {
    expect(DEPENDENCY_MATRIX.eschatological.hebrew).toBeLessThan(0.70);
  });

  it("eschatological-market are mostly independent", () => {
    expect(DEPENDENCY_MATRIX.eschatological.market).toBeGreaterThan(0.70);
  });

  it("matrix is approximately symmetric", () => {
    for (const [a, deps] of Object.entries(DEPENDENCY_MATRIX)) {
      for (const [b, val] of Object.entries(deps)) {
        const reverse = DEPENDENCY_MATRIX[b]?.[a];
        if (reverse !== undefined) {
          expect(val).toBeCloseTo(reverse, 2);
        }
      }
    }
  });
});

describe("bayesianFusion - eschatological layer", () => {
  it("eschatological evidence moves posterior", () => {
    const result = bayesianFusion(0.04, [
      { type: "eschatological", significance: 5, events: [{ significance: 5 }] },
    ]);
    expect(result.posterior).toBeGreaterThan(0.04);
    expect(result.layerContributions["eschatological"]).toBeGreaterThan(0);
  });

  it("eschatological + geopolitical produces higher posterior than either alone", () => {
    const eschaOnly = bayesianFusion(0.04, [
      { type: "eschatological", significance: 4, events: [{ significance: 4 }] },
    ]);
    const geoOnly = bayesianFusion(0.04, [
      { type: "geopolitical", significance: 4, events: [{ significance: 4 }] },
    ]);
    const combined = bayesianFusion(0.04, [
      { type: "eschatological", significance: 4, events: [{ significance: 4 }] },
      { type: "geopolitical", significance: 4, events: [{ significance: 4 }] },
    ]);
    expect(combined.posterior).toBeGreaterThan(eschaOnly.posterior);
    expect(combined.posterior).toBeGreaterThan(geoOnly.posterior);
  });

  it("all three layers contribute when combined", () => {
    // Reliability order: geopolitical (0.85) > eschatological (0.65) > hebrew (0.45)
    const result = bayesianFusion(0.04, [
      { type: "hebrew", significance: 3, events: [{ significance: 3 }] },
      { type: "eschatological", significance: 3, events: [{ significance: 3 }] },
      { type: "geopolitical", significance: 3, events: [{ significance: 3 }] },
    ]);
    // All three should contribute to moving the posterior
    expect(result.layerContributions["geopolitical"]).toBeGreaterThan(0);
    expect(result.layerContributions["eschatological"]).toBeGreaterThan(0);
    expect(result.layerContributions["hebrew"]).toBeGreaterThan(0);
    // Combined posterior should be well above the prior
    expect(result.posterior).toBeGreaterThan(0.20);
  });
});

describe("scoreBayesianConvergences", () => {
  it("returns empty array for no events", () => {
    const result = scoreBayesianConvergences([], [], []);
    expect(result).toEqual([]);
  });

  it("creates results for single-layer events", () => {
    const result = scoreBayesianConvergences([makeCelestial()], [], []);
    expect(result).toHaveLength(1);
    expect(result[0].layers).toContain("celestial");
    expect(result[0].intensity).toBeGreaterThanOrEqual(1);
    expect(result[0].intensity).toBeLessThanOrEqual(5);
  });

  it("multi-layer convergence produces higher intensity than single layer", () => {
    const single = scoreBayesianConvergences(
      [makeCelestial({ significance: 3 })],
      [],
      []
    );
    const multi = scoreBayesianConvergences(
      [makeCelestial({ significance: 3 })],
      [makeHebrew({ significance: 3 })],
      [makeGeopolitical({ significance: 3 })]
    );
    expect(multi[0].intensity).toBeGreaterThanOrEqual(single[0].intensity);
  });

  it("clusters events within 3 days", () => {
    const result = scoreBayesianConvergences(
      [makeCelestial({ date: "2025-01-15" })],
      [makeHebrew({ date: "2025-01-17" })],
      []
    );
    expect(result).toHaveLength(1);
    expect(result[0].layers).toContain("celestial");
    expect(result[0].layers).toContain("hebrew");
  });

  it("separates events more than 3 days apart", () => {
    const result = scoreBayesianConvergences(
      [makeCelestial({ date: "2025-01-15" })],
      [makeHebrew({ date: "2025-01-25" })],
      []
    );
    expect(result).toHaveLength(2);
  });

  it("returns results sorted by date", () => {
    const result = scoreBayesianConvergences(
      [makeCelestial({ date: "2025-03-01" })],
      [makeHebrew({ date: "2025-01-15" })],
      [makeGeopolitical({ date: "2025-06-01" })]
    );
    for (let i = 1; i < result.length; i++) {
      expect(result[i].date >= result[i - 1].date).toBe(true);
    }
  });

  it("preserves ConvergenceResult shape", () => {
    const result = scoreBayesianConvergences(
      [makeCelestial()],
      [makeHebrew()],
      [makeGeopolitical()]
    );
    const r = result[0];
    expect(r).toHaveProperty("date");
    expect(r).toHaveProperty("intensity");
    expect(r).toHaveProperty("layers");
    expect(r).toHaveProperty("celestialEvents");
    expect(r).toHaveProperty("hebrewEvents");
    expect(r).toHaveProperty("geopoliticalEvents");
    expect(r).toHaveProperty("title");
    expect(r).toHaveProperty("description");
    expect(r).toHaveProperty("category");
    expect(r).toHaveProperty("marketSectors");
  });

  it("injects eschatological layer when calendar events with triggers are present", () => {
    // Purim triggers the eschatological layer for israel_far_right
    const result = scoreBayesianConvergences(
      [],
      [makeHebrew({ holiday: "Purim", significance: 3 })],
      [makeGeopolitical({ significance: 3 })]
    );
    expect(result.length).toBeGreaterThan(0);
    // The eschatological layer should be injected
    expect(result[0].layers).toContain("eschatological");
  });

  it("does not inject eschatological layer for non-trigger holidays", () => {
    // "Fast Day" is not a known trigger key
    const result = scoreBayesianConvergences(
      [],
      [makeHebrew({ holiday: "Fast Day", significance: 2 })],
      []
    );
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].layers).not.toContain("eschatological");
  });

  it("eschatological injection increases intensity vs without", () => {
    // With Purim (triggers eschatological)
    const withTrigger = scoreBayesianConvergences(
      [],
      [makeHebrew({ holiday: "Purim", significance: 3 })],
      [makeGeopolitical({ significance: 3 })]
    );
    // With generic holiday (no trigger)
    const withoutTrigger = scoreBayesianConvergences(
      [],
      [makeHebrew({ holiday: "Minor Shabbat", significance: 3 })],
      [makeGeopolitical({ significance: 3 })]
    );
    expect(withTrigger[0].intensity).toBeGreaterThanOrEqual(withoutTrigger[0].intensity);
  });
});
