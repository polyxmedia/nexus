import { describe, it, expect } from "vitest";
import { toBayesianScenario, runBayesianGameTheory } from "../engine";
import { SCENARIOS } from "../../game-theory/actors";
import {
  runBayesianAnalysis,
  initializeBeliefs,
  type NPlayerScenario,
} from "../../game-theory/bayesian";

// ── toBayesianScenario ──

describe("toBayesianScenario", () => {
  it("converts Taiwan Strait scenario to NPlayerScenario", () => {
    const taiwanScenario = SCENARIOS.find(s => s.id === "taiwan-strait")!;
    const bayesian = toBayesianScenario(taiwanScenario);

    expect(bayesian.id).toBe("taiwan-strait");
    expect(bayesian.title).toBe("Taiwan Strait Crisis");
    expect(bayesian.actors).toEqual(["china", "us"]);
    expect(bayesian.moveOrder).toEqual(["china", "us"]);
    expect(bayesian.strategies).toEqual(taiwanScenario.strategies);
    expect(bayesian.marketSectors).toEqual(taiwanScenario.marketSectors);
    expect(bayesian.timeHorizon).toBe("medium_term");
  });

  it("preserves strategy structure from original scenario", () => {
    for (const scenario of SCENARIOS) {
      const bayesian = toBayesianScenario(scenario);
      expect(bayesian.strategies).toEqual(scenario.strategies);
      expect(bayesian.actors).toEqual(scenario.actors);
    }
  });

  it("creates a working utility function from payoff matrix", () => {
    const taiwanScenario = SCENARIOS.find(s => s.id === "taiwan-strait")!;
    const bayesian = toBayesianScenario(taiwanScenario);

    // Test a known payoff from the matrix
    const payoffs = bayesian.utilityFn(
      { china: "Diplomatic pressure", us: "Strategic ambiguity" },
      {} as Record<string, any>
    );
    expect(payoffs.china).toBe(2);
    expect(payoffs.us).toBe(3);
  });

  it("utility function returns fallback for unknown strategy combinations", () => {
    const taiwanScenario = SCENARIOS.find(s => s.id === "taiwan-strait")!;
    const bayesian = toBayesianScenario(taiwanScenario);

    const payoffs = bayesian.utilityFn(
      { china: "Nonexistent Strategy", us: "Also Nonexistent" },
      {} as Record<string, any>
    );
    expect(payoffs.china).toBe(-1);
    expect(payoffs.us).toBe(-1);
  });

  it("creates coalitions for actor pairs", () => {
    const taiwanScenario = SCENARIOS.find(s => s.id === "taiwan-strait")!;
    const bayesian = toBayesianScenario(taiwanScenario);
    expect(bayesian.coalitions.length).toBeGreaterThan(0);
    expect(bayesian.coalitions[0].members).toContain("china");
    expect(bayesian.coalitions[0].members).toContain("us");
  });

  it("converts all pre-defined scenarios without error", () => {
    for (const scenario of SCENARIOS) {
      expect(() => toBayesianScenario(scenario)).not.toThrow();
    }
  });
});

// ── toBayesianScenario + runBayesianAnalysis integration ──

describe("toBayesianScenario + runBayesianAnalysis", () => {
  it("produces valid Bayesian analysis for Taiwan scenario", () => {
    const taiwanScenario = SCENARIOS.find(s => s.id === "taiwan-strait")!;
    const bayesian = toBayesianScenario(taiwanScenario);
    const beliefs = initializeBeliefs(taiwanScenario.actors);
    const analysis = runBayesianAnalysis(bayesian, beliefs);

    expect(analysis.equilibria.length).toBeGreaterThan(0);
    expect(analysis.bargainingRange).toBeGreaterThanOrEqual(0);
    expect(analysis.bargainingRange).toBeLessThanOrEqual(1);
    expect(analysis.escalationProbability).toBeGreaterThanOrEqual(0);
    expect(analysis.fearonAssessment).toBeTruthy();
    expect(analysis.marketAssessment).toBeDefined();
  });

  it("produces valid Bayesian analysis for Iran scenario", () => {
    const iranScenario = SCENARIOS.find(s => s.id === "iran-nuclear")!;
    const bayesian = toBayesianScenario(iranScenario);
    const beliefs = initializeBeliefs(iranScenario.actors);
    const analysis = runBayesianAnalysis(bayesian, beliefs);

    // Iran scenario may or may not have equilibria depending on type distributions,
    // but the analysis should always complete with valid structure
    expect(analysis.equilibria).toBeDefined();
    expect(analysis.dominantTypes).toHaveProperty("iran");
    expect(analysis.dominantTypes).toHaveProperty("israel");
    expect(analysis.bargainingRange).toBeGreaterThanOrEqual(0);
    expect(analysis.fearonAssessment).toBeTruthy();
    expect(analysis.marketAssessment).toBeDefined();
  });

  it("produces valid analysis for all pre-defined scenarios", () => {
    for (const scenario of SCENARIOS) {
      const bayesian = toBayesianScenario(scenario);
      const beliefs = initializeBeliefs(scenario.actors);

      expect(() => {
        const analysis = runBayesianAnalysis(bayesian, beliefs);
        // Basic sanity checks
        expect(analysis.equilibria).toBeDefined();
        expect(analysis.bargainingRange).toBeGreaterThanOrEqual(0);
        expect(analysis.escalationProbability).toBeGreaterThanOrEqual(0);
        expect(analysis.marketAssessment).toBeDefined();
      }).not.toThrow();
    }
  });

  it("market assessment has valid direction", () => {
    for (const scenario of SCENARIOS) {
      const bayesian = toBayesianScenario(scenario);
      const beliefs = initializeBeliefs(scenario.actors);
      const analysis = runBayesianAnalysis(bayesian, beliefs);
      expect(["bullish", "bearish", "mixed"]).toContain(analysis.marketAssessment.direction);
    }
  });
});

// ── runBayesianGameTheory ──

describe("runBayesianGameTheory", () => {
  it("returns non-empty context with no signals", () => {
    const result = runBayesianGameTheory([]);
    expect(result).toBeTruthy();
    expect(result).not.toBe("Bayesian analysis unavailable");
  });

  it("includes scenario titles in output", () => {
    const result = runBayesianGameTheory([]);
    expect(result).toContain("Taiwan Strait Crisis");
    expect(result).toContain("Iran Nuclear Breakout");
    expect(result).toContain("OPEC+ Production Decision");
  });

  it("includes Fearon bargaining range", () => {
    const result = runBayesianGameTheory([]);
    expect(result).toContain("Bargaining range:");
  });

  it("includes escalation probability", () => {
    const result = runBayesianGameTheory([]);
    expect(result).toContain("Escalation probability:");
  });

  it("includes dominant actor types", () => {
    const result = runBayesianGameTheory([]);
    expect(result).toContain("Dominant actor types:");
  });

  it("includes Fearon assessment", () => {
    const result = runBayesianGameTheory([]);
    expect(result).toContain("Fearon assessment:");
  });

  it("includes market assessment", () => {
    const result = runBayesianGameTheory([]);
    expect(result).toContain("Market assessment:");
  });

  it("processes relevant signals for matching scenarios", () => {
    const signals = [
      { title: "China military exercises near Taiwan", description: "PLA conducts live-fire exercises", intensity: 4 },
      { title: "Iran enrichment increase", description: "IAEA reports 60% enrichment", intensity: 5 },
    ];
    const result = runBayesianGameTheory(signals);
    // Should still produce valid output with signals
    expect(result).toBeTruthy();
    expect(result).toContain("Taiwan Strait Crisis");
    expect(result).toContain("Iran Nuclear Breakout");
  });

  it("handles signals that match no scenario gracefully", () => {
    const signals = [
      { title: "Weather forecast sunny", description: "Nice day ahead", intensity: 1 },
    ];
    const result = runBayesianGameTheory(signals);
    expect(result).toBeTruthy();
    expect(result).not.toBe("Bayesian analysis unavailable");
  });

  it("includes equilibrium details when available", () => {
    const result = runBayesianGameTheory([]);
    expect(result).toContain("Most likely equilibrium:");
    expect(result).toContain("Market impact:");
  });

  it("includes all pre-defined scenarios", () => {
    const result = runBayesianGameTheory([]);
    // Check for all scenario titles
    for (const scenario of SCENARIOS) {
      expect(result).toContain(scenario.title);
    }
  });
});

// ── Edge cases ──

describe("edge cases", () => {
  it("toBayesianScenario handles scenario with single actor pair", () => {
    const scenario = SCENARIOS[0]; // Taiwan
    const bayesian = toBayesianScenario(scenario);
    expect(bayesian.coalitions.length).toBe(1);
  });

  it("Bayesian analysis remains stable after multiple signal updates", () => {
    const scenario = SCENARIOS.find(s => s.id === "iran-nuclear")!;
    const bayesian = toBayesianScenario(scenario);
    const beliefs = initializeBeliefs(scenario.actors);

    // Apply 10 signals
    const signals = Array(10).fill(null).map((_, i) => ({
      timestamp: new Date().toISOString(),
      signal: `Escalation event ${i}`,
      actorId: "iran",
      typeShifts: { escalatory: 0.3, hawkish: 0.2, cooperative: -0.2 } as Record<string, number>,
      source: "osint" as const,
    }));

    const analysis = runBayesianAnalysis(bayesian, beliefs, signals);

    // Should still produce valid, bounded results
    expect(analysis.bargainingRange).toBeGreaterThanOrEqual(0);
    expect(analysis.bargainingRange).toBeLessThanOrEqual(1);
    expect(analysis.escalationProbability).toBeGreaterThanOrEqual(0);
    expect(analysis.escalationProbability).toBeLessThanOrEqual(1);
    expect(analysis.marketAssessment.confidence).toBeLessThanOrEqual(0.95);
  });

  it("runBayesianGameTheory produces output within reasonable length", () => {
    const result = runBayesianGameTheory([]);
    // Should be substantial but not enormous (prevent prompt bloat)
    expect(result.length).toBeGreaterThan(500);
    expect(result.length).toBeLessThan(50000);
  });
});
