import { describe, it, expect } from "vitest";
import {
  findNashEquilibria,
  identifySchellingPoints,
  buildEscalationLadder,
  findDominantStrategies,
  analyzeScenario,
} from "../analysis";
import { SCENARIOS } from "../actors";

// ── findNashEquilibria ──

describe("findNashEquilibria", () => {
  it("finds Nash equilibria for Taiwan scenario", () => {
    const taiwanScenario = SCENARIOS.find(s => s.id === "taiwan-strait")!;
    const equilibria = findNashEquilibria(taiwanScenario);
    expect(equilibria.length).toBeGreaterThan(0);
  });

  it("equilibria have required fields", () => {
    const taiwanScenario = SCENARIOS.find(s => s.id === "taiwan-strait")!;
    const equilibria = findNashEquilibria(taiwanScenario);

    for (const eq of equilibria) {
      expect(eq.strategies).toBeDefined();
      expect(eq.payoffs).toBeDefined();
      expect(["stable", "unstable", "mixed"]).toContain(eq.stability);
      expect(eq.marketImpact).toBeDefined();
      expect(eq.marketImpact.direction).toBeDefined();
      expect(eq.marketImpact.magnitude).toBeDefined();
    }
  });

  it("finds equilibria for all 2-player scenarios", () => {
    for (const scenario of SCENARIOS) {
      if (scenario.actors.length === 2) {
        const equilibria = findNashEquilibria(scenario);
        expect(equilibria).toBeDefined();
        // Most 2-player games should have at least one Nash equilibrium
      }
    }
  });

  it("returns empty for non-2-player scenarios (currently unsupported)", () => {
    // findNashEquilibria only supports 2-player
    const fakeScenario = {
      ...SCENARIOS[0],
      actors: ["a", "b", "c"],
    };
    const equilibria = findNashEquilibria(fakeScenario);
    expect(equilibria).toHaveLength(0);
  });
});

// ── identifySchellingPoints ──

describe("identifySchellingPoints", () => {
  it("identifies Schelling points for scenarios with cooperative outcomes", () => {
    const taiwanScenario = SCENARIOS.find(s => s.id === "taiwan-strait")!;
    const points = identifySchellingPoints(taiwanScenario);
    expect(points.length).toBeGreaterThan(0);
  });

  it("points are sorted by probability descending", () => {
    const taiwanScenario = SCENARIOS.find(s => s.id === "taiwan-strait")!;
    const points = identifySchellingPoints(taiwanScenario);
    if (points.length >= 2) {
      expect(points[0].probability).toBeGreaterThanOrEqual(points[1].probability);
    }
  });

  it("points have required fields", () => {
    const taiwanScenario = SCENARIOS.find(s => s.id === "taiwan-strait")!;
    const points = identifySchellingPoints(taiwanScenario);

    for (const point of points) {
      expect(point.strategy).toBeDefined();
      expect(point.reasoning).toBeTruthy();
      expect(point.probability).toBeGreaterThanOrEqual(0);
      expect(point.probability).toBeLessThanOrEqual(1);
    }
  });
});

// ── buildEscalationLadder ──

describe("buildEscalationLadder", () => {
  it("builds escalation ladder for all scenarios", () => {
    for (const scenario of SCENARIOS) {
      const ladder = buildEscalationLadder(scenario);
      expect(ladder.length).toBeGreaterThan(0);
    }
  });

  it("steps are sorted by escalation level", () => {
    const iranScenario = SCENARIOS.find(s => s.id === "iran-nuclear")!;
    const ladder = buildEscalationLadder(iranScenario);
    for (let i = 1; i < ladder.length; i++) {
      expect(ladder[i].level).toBeGreaterThanOrEqual(ladder[i - 1].level);
    }
  });

  it("steps have valid market impact", () => {
    const scenario = SCENARIOS[0];
    const ladder = buildEscalationLadder(scenario);

    for (const step of ladder) {
      expect(step.level).toBeGreaterThanOrEqual(1);
      expect(step.level).toBeLessThanOrEqual(5);
      expect(step.description).toBeTruthy();
      expect(step.probability).toBeGreaterThan(0);
      expect(step.probability).toBeLessThan(1);
      expect(["bullish", "bearish", "mixed"]).toContain(step.marketImpact.direction);
    }
  });
});

// ── findDominantStrategies ──

describe("findDominantStrategies", () => {
  it("returns result for all actors in scenario", () => {
    const taiwanScenario = SCENARIOS.find(s => s.id === "taiwan-strait")!;
    const dominant = findDominantStrategies(taiwanScenario);
    expect(dominant).toHaveProperty("china");
    expect(dominant).toHaveProperty("us");
  });

  it("dominant strategy (if found) is a valid strategy for that actor", () => {
    for (const scenario of SCENARIOS) {
      const dominant = findDominantStrategies(scenario);
      for (const [actorId, strategy] of Object.entries(dominant)) {
        if (strategy !== null) {
          expect(scenario.strategies[actorId]).toContain(strategy);
        }
      }
    }
  });
});

// ── analyzeScenario (full pipeline) ──

describe("analyzeScenario", () => {
  it("returns complete analysis for Taiwan scenario", () => {
    const taiwanScenario = SCENARIOS.find(s => s.id === "taiwan-strait")!;
    const analysis = analyzeScenario(taiwanScenario);

    expect(analysis.scenarioId).toBe("taiwan-strait");
    expect(analysis.nashEquilibria).toBeDefined();
    expect(analysis.schellingPoints).toBeDefined();
    expect(analysis.escalationLadder).toBeDefined();
    expect(analysis.dominantStrategies).toBeDefined();
    expect(analysis.marketAssessment).toBeDefined();
    expect(analysis.marketAssessment.mostLikelyOutcome).toBeTruthy();
    expect(["bullish", "bearish", "mixed"]).toContain(analysis.marketAssessment.direction);
    expect(analysis.marketAssessment.confidence).toBeGreaterThan(0);
  });

  it("analyzes all pre-defined scenarios without error", () => {
    for (const scenario of SCENARIOS) {
      expect(() => {
        const analysis = analyzeScenario(scenario);
        expect(analysis.scenarioId).toBe(scenario.id);
      }).not.toThrow();
    }
  });

  it("market assessment confidence is bounded", () => {
    for (const scenario of SCENARIOS) {
      const analysis = analyzeScenario(scenario);
      expect(analysis.marketAssessment.confidence).toBeGreaterThan(0);
      expect(analysis.marketAssessment.confidence).toBeLessThanOrEqual(1);
    }
  });
});
