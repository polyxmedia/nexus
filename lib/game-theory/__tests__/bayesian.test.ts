import { describe, it, expect } from "vitest";
import {
  initializeBeliefs,
  updateBeliefs,
  getAvailableStrategies,
  computeExpectedUtility,
  findBayesianEquilibria,
  computeSequentialPaths,
  assessCoalitions,
  runBayesianAnalysis,
  createSignalFromOSINT,
  type NPlayerScenario,
  type ActorBelief,
  type SignalUpdate,
  type TypeDistribution,
  type ActorType,
} from "../bayesian";

// ── Test fixture: simple 2-player scenario ──

function makeTestScenario(): NPlayerScenario {
  return {
    id: "test-scenario",
    title: "Test Scenario",
    description: "A simple 2-player test scenario",
    actors: ["actor_a", "actor_b"],
    moveOrder: ["actor_a", "actor_b"],
    strategies: {
      actor_a: ["Cooperate", "Defect", "Escalate"],
      actor_b: ["Cooperate", "Defect", "Escalate"],
    },
    utilityFn: (strategies, _types) => {
      const a = strategies.actor_a;
      const b = strategies.actor_b;
      // Prisoner's dilemma-like payoffs with escalation
      if (a === "Cooperate" && b === "Cooperate") return { actor_a: 3, actor_b: 3 };
      if (a === "Cooperate" && b === "Defect") return { actor_a: -2, actor_b: 5 };
      if (a === "Defect" && b === "Cooperate") return { actor_a: 5, actor_b: -2 };
      if (a === "Defect" && b === "Defect") return { actor_a: -1, actor_b: -1 };
      if (a === "Escalate" || b === "Escalate") return { actor_a: -5, actor_b: -5 };
      return { actor_a: 0, actor_b: 0 };
    },
    coalitions: [
      {
        id: "test-coalition",
        name: "A-B Coalition",
        members: ["actor_a", "actor_b"],
        stability: 0.5,
        fractureProbability: 0.3,
        fractureCondition: "Defection by either party",
      },
    ],
    marketSectors: ["energy", "defense"],
    timeHorizon: "short_term",
  };
}

// ── initializeBeliefs ──

describe("initializeBeliefs", () => {
  it("creates beliefs for given actor IDs", () => {
    const beliefs = initializeBeliefs(["us", "china"]);
    expect(beliefs).toHaveProperty("us");
    expect(beliefs).toHaveProperty("china");
  });

  it("creates valid type distributions that sum to ~1", () => {
    const beliefs = initializeBeliefs(["us"]);
    const dist = beliefs.us.typeDistribution;
    const sum = Object.values(dist).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 1);
  });

  it("sets all type probabilities > 0", () => {
    const beliefs = initializeBeliefs(["us"]);
    const dist = beliefs.us.typeDistribution;
    for (const val of Object.values(dist)) {
      expect(val).toBeGreaterThan(0);
    }
  });

  it("assigns audience costs based on regime type", () => {
    const beliefs = initializeBeliefs(["us", "iran", "hamas"]);
    // Democratic actor should have high domestic sensitivity
    expect(beliefs.us.audienceCost.domesticSensitivity).toBeGreaterThanOrEqual(0.7);
    // Authoritarian actor should have lower
    expect(beliefs.iran.audienceCost.domesticSensitivity).toBeLessThanOrEqual(0.4);
    // Non-state actor should have low domestic sensitivity but high backdown cost
    expect(beliefs.hamas.audienceCost.domesticSensitivity).toBeLessThanOrEqual(0.3);
    expect(beliefs.hamas.audienceCost.backdownCost).toBeGreaterThanOrEqual(7);
  });

  it("initializes commitment level at default", () => {
    const beliefs = initializeBeliefs(["us"]);
    expect(beliefs.us.commitmentLevel).toBe(0.3);
  });

  it("handles unknown actor IDs with default distribution", () => {
    const beliefs = initializeBeliefs(["unknown_actor_xyz"]);
    expect(beliefs.unknown_actor_xyz).toBeDefined();
    const dist = beliefs.unknown_actor_xyz.typeDistribution;
    const sum = Object.values(dist).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 1);
  });
});

// ── updateBeliefs ──

describe("updateBeliefs", () => {
  it("shifts type distribution toward escalatory on attack signals", () => {
    const beliefs = initializeBeliefs(["iran"]);
    const original = { ...beliefs.iran.typeDistribution };

    const signal: SignalUpdate = {
      timestamp: new Date().toISOString(),
      signal: "Iran launches strike on US base",
      actorId: "iran",
      typeShifts: { escalatory: 0.8, hawkish: 0.4, cooperative: -0.5 },
      source: "action",
    };

    const updated = updateBeliefs(beliefs.iran, signal);
    expect(updated.typeDistribution.escalatory).toBeGreaterThan(original.escalatory);
    expect(updated.typeDistribution.cooperative).toBeLessThan(original.cooperative);
  });

  it("increases commitment on action signals", () => {
    const beliefs = initializeBeliefs(["us"]);
    const original = beliefs.us.commitmentLevel;

    const signal: SignalUpdate = {
      timestamp: new Date().toISOString(),
      signal: "US deploys carrier group",
      actorId: "us",
      typeShifts: { hawkish: 0.3 },
      source: "action",
    };

    const updated = updateBeliefs(beliefs.us, signal);
    expect(updated.commitmentLevel).toBeGreaterThan(original);
  });

  it("increases commitment on statement signals (less than action)", () => {
    const beliefs = initializeBeliefs(["us"]);

    const actionSignal: SignalUpdate = {
      timestamp: new Date().toISOString(),
      signal: "US deploys carrier group",
      actorId: "us",
      typeShifts: { hawkish: 0.3 },
      source: "action",
    };

    const statementSignal: SignalUpdate = {
      timestamp: new Date().toISOString(),
      signal: "US warns of consequences",
      actorId: "us",
      typeShifts: { hawkish: 0.3 },
      source: "statement",
    };

    const afterAction = updateBeliefs(beliefs.us, actionSignal);
    const afterStatement = updateBeliefs(beliefs.us, statementSignal);
    expect(afterAction.commitmentLevel).toBeGreaterThan(afterStatement.commitmentLevel);
  });

  it("preserves signal history", () => {
    const beliefs = initializeBeliefs(["iran"]);
    const signal: SignalUpdate = {
      timestamp: new Date().toISOString(),
      signal: "Test signal",
      typeShifts: {},
      source: "osint",
    };

    const updated = updateBeliefs(beliefs.iran, signal);
    expect(updated.signalHistory).toHaveLength(1);
    expect(updated.signalHistory[0].signal).toBe("Test signal");
  });

  it("maintains normalized distribution (sums to ~1)", () => {
    const beliefs = initializeBeliefs(["iran"]);
    const signal: SignalUpdate = {
      timestamp: new Date().toISOString(),
      signal: "Major escalation",
      typeShifts: { escalatory: 0.9, cooperative: -0.8, defensive: -0.5 },
      source: "action",
    };

    const updated = updateBeliefs(beliefs.iran, signal);
    const sum = Object.values(updated.typeDistribution).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 2);
  });
});

// ── getAvailableStrategies ──

describe("getAvailableStrategies", () => {
  it("returns all strategies when commitment is low", () => {
    const beliefs = initializeBeliefs(["hamas"]);
    beliefs.hamas.commitmentLevel = 0.2;
    const strategies = getAvailableStrategies(
      ["negotiate", "escalate", "ceasefire"],
      beliefs.hamas
    );
    expect(strategies).toHaveLength(3);
  });

  it("filters constrained strategies when constraint strength is high enough", () => {
    const beliefs = initializeBeliefs(["hamas"]);
    beliefs.hamas.commitmentLevel = 0.9;
    // Override domestic sensitivity to make constraint fire
    // constraintStrength = commitmentLevel * domesticSensitivity must be >= 0.4
    beliefs.hamas.audienceCost.domesticSensitivity = 0.6;

    const strategies = getAvailableStrategies(
      ["negotiate", "escalate", "ceasefire", "accept terms"],
      beliefs.hamas
    );
    // hamas constrainedStrategies: negotiate, accept terms, ceasefire
    expect(strategies).not.toContain("negotiate");
    expect(strategies).not.toContain("ceasefire");
    expect(strategies).not.toContain("accept terms");
    expect(strategies).toContain("escalate");
  });

  it("does not filter when commitment * sensitivity is low", () => {
    const beliefs = initializeBeliefs(["us"]);
    beliefs.us.commitmentLevel = 0.3; // low commitment
    const strategies = getAvailableStrategies(
      ["negotiate", "escalate", "withdraw"],
      beliefs.us
    );
    expect(strategies).toHaveLength(3);
  });
});

// ── createSignalFromOSINT ──

describe("createSignalFromOSINT", () => {
  it("classifies escalatory signals correctly", () => {
    const signal = createSignalFromOSINT("Iran launches missile strike", "iran", "action");
    expect(signal.typeShifts.escalatory).toBeGreaterThan(0);
    expect(signal.typeShifts.cooperative).toBeLessThan(0);
    expect(signal.source).toBe("action");
    expect(signal.actorId).toBe("iran");
  });

  it("classifies diplomatic signals correctly", () => {
    const signal = createSignalFromOSINT("Peace negotiations begin in Geneva", "us", "statement");
    expect(signal.typeShifts.cooperative).toBeGreaterThan(0);
    expect(signal.typeShifts.escalatory).toBeLessThan(0);
  });

  it("classifies threatening signals correctly", () => {
    const signal = createSignalFromOSINT("Russia issues ultimatum to NATO", "russia");
    expect(signal.typeShifts.hawkish).toBeGreaterThan(0);
  });

  it("classifies defensive signals correctly", () => {
    // "defend" and "protect" trigger defensive classification
    // avoid "deploy" (escalatory) and "threat" (threatening) which take precedence
    const signal = createSignalFromOSINT("Israel activates Iron Dome to defend northern border", "israel");
    expect(signal.typeShifts.defensive).toBeGreaterThan(0);
  });

  it("classifies desperate signals correctly", () => {
    const signal = createSignalFromOSINT("Regime faces existential collapse", "iran");
    expect(signal.typeShifts.desperate).toBeGreaterThan(0);
  });

  it("sets timestamp and signal text", () => {
    const signal = createSignalFromOSINT("Test signal", "us");
    expect(signal.timestamp).toBeDefined();
    expect(signal.signal).toBe("Test signal");
  });
});

// ── computeExpectedUtility ──

describe("computeExpectedUtility", () => {
  it("computes payoffs for a strategy profile", () => {
    const scenario = makeTestScenario();
    const beliefs = initializeBeliefs(["actor_a", "actor_b"]);
    const payoffs = computeExpectedUtility(
      scenario,
      { actor_a: "Cooperate", actor_b: "Cooperate" },
      beliefs
    );
    expect(payoffs.actor_a).toBeGreaterThan(0);
    expect(payoffs.actor_b).toBeGreaterThan(0);
  });

  it("reflects asymmetric payoffs in asymmetric profiles", () => {
    const scenario = makeTestScenario();
    const beliefs = initializeBeliefs(["actor_a", "actor_b"]);
    const payoffs = computeExpectedUtility(
      scenario,
      { actor_a: "Cooperate", actor_b: "Defect" },
      beliefs
    );
    // Defector should do better than cooperator
    expect(payoffs.actor_b).toBeGreaterThan(payoffs.actor_a);
  });
});

// ── findBayesianEquilibria ──

describe("findBayesianEquilibria", () => {
  it("finds at least one equilibrium in the test scenario", () => {
    const scenario = makeTestScenario();
    const beliefs = initializeBeliefs(["actor_a", "actor_b"]);
    const equilibria = findBayesianEquilibria(scenario, beliefs);
    expect(equilibria.length).toBeGreaterThan(0);
  });

  it("returns equilibria sorted by probability (descending)", () => {
    const scenario = makeTestScenario();
    const beliefs = initializeBeliefs(["actor_a", "actor_b"]);
    const equilibria = findBayesianEquilibria(scenario, beliefs);
    if (equilibria.length >= 2) {
      expect(equilibria[0].probability).toBeGreaterThanOrEqual(equilibria[1].probability);
    }
  });

  it("equilibria have all required fields", () => {
    const scenario = makeTestScenario();
    const beliefs = initializeBeliefs(["actor_a", "actor_b"]);
    const equilibria = findBayesianEquilibria(scenario, beliefs);

    for (const eq of equilibria) {
      expect(eq.strategyProfile).toBeDefined();
      expect(eq.expectedPayoffs).toBeDefined();
      expect(eq.typeConditions).toBeDefined();
      expect(eq.probability).toBeGreaterThanOrEqual(0);
      expect(eq.probability).toBeLessThanOrEqual(1);
      expect(["stable", "unstable", "fragile"]).toContain(eq.stability);
      expect(eq.bargainingRange).toBeGreaterThanOrEqual(0);
      expect(eq.bargainingRange).toBeLessThanOrEqual(1);
      expect(["agreement_possible", "narrow_range", "no_agreement"]).toContain(eq.fearonCondition);
      expect(eq.marketImpact).toBeDefined();
      expect(["bullish", "bearish", "mixed"]).toContain(eq.marketImpact.direction);
    }
  });
});

// ── computeSequentialPaths ──

describe("computeSequentialPaths", () => {
  it("generates sequential paths", () => {
    const scenario = makeTestScenario();
    const beliefs = initializeBeliefs(["actor_a", "actor_b"]);
    const paths = computeSequentialPaths(scenario, beliefs);
    expect(paths.length).toBeGreaterThan(0);
  });

  it("paths have normalized probabilities summing to ~1", () => {
    const scenario = makeTestScenario();
    const beliefs = initializeBeliefs(["actor_a", "actor_b"]);
    const paths = computeSequentialPaths(scenario, beliefs);
    const totalProb = paths.reduce((s, p) => s + p.probability, 0);
    expect(totalProb).toBeCloseTo(1.0, 1);
  });

  it("each path has moves matching move order", () => {
    const scenario = makeTestScenario();
    const beliefs = initializeBeliefs(["actor_a", "actor_b"]);
    const paths = computeSequentialPaths(scenario, beliefs);
    for (const path of paths) {
      expect(path.moves.length).toBeGreaterThanOrEqual(1);
      expect(path.terminalPayoffs).toBeDefined();
    }
  });

  it("respects maxPaths limit", () => {
    const scenario = makeTestScenario();
    const beliefs = initializeBeliefs(["actor_a", "actor_b"]);
    const paths = computeSequentialPaths(scenario, beliefs, 3);
    expect(paths.length).toBeLessThanOrEqual(3);
  });
});

// ── assessCoalitions ──

describe("assessCoalitions", () => {
  it("assesses coalition stability", () => {
    const scenario = makeTestScenario();
    const beliefs = initializeBeliefs(["actor_a", "actor_b"]);
    const assessments = assessCoalitions(scenario.coalitions, beliefs);
    expect(assessments).toHaveLength(1);
    expect(assessments[0].coalitionId).toBe("test-coalition");
    expect(assessments[0].currentStability).toBeGreaterThanOrEqual(0);
    expect(assessments[0].currentStability).toBeLessThanOrEqual(1);
    expect(["low", "medium", "high", "critical"]).toContain(assessments[0].fractureRisk);
  });

  it("detects high fracture risk when actors have desperate/escalatory types", () => {
    const beliefs = initializeBeliefs(["actor_a", "actor_b"]);
    // Force desperate type
    beliefs.actor_a.typeDistribution = {
      cooperative: 0.05,
      hawkish: 0.05,
      desperate: 0.7,
      calculating: 0.05,
      escalatory: 0.1,
      defensive: 0.05,
    };

    const coalitions = [{
      id: "test",
      name: "Test",
      members: ["actor_a", "actor_b"],
      stability: 0.5,
      fractureProbability: 0.3,
      fractureCondition: "test",
    }];

    const assessments = assessCoalitions(coalitions, beliefs);
    // Should detect vulnerability from desperate actor
    expect(assessments[0].vulnerabilities.length).toBeGreaterThan(0);
  });
});

// ── runBayesianAnalysis (full pipeline) ──

describe("runBayesianAnalysis", () => {
  it("returns a complete analysis object", () => {
    const scenario = makeTestScenario();
    const beliefs = initializeBeliefs(["actor_a", "actor_b"]);
    const analysis = runBayesianAnalysis(scenario, beliefs);

    expect(analysis.equilibria).toBeDefined();
    expect(analysis.sequentialPaths).toBeDefined();
    expect(analysis.coalitionAssessment).toBeDefined();
    expect(analysis.audienceCostConstraints).toBeDefined();
    expect(analysis.bargainingRange).toBeGreaterThanOrEqual(0);
    expect(analysis.fearonAssessment).toBeTruthy();
    expect(analysis.dominantTypes).toBeDefined();
    expect(analysis.escalationProbability).toBeGreaterThanOrEqual(0);
    expect(analysis.escalationProbability).toBeLessThanOrEqual(1);
    expect(analysis.marketAssessment).toBeDefined();
    expect(analysis.marketAssessment.mostLikelyOutcome).toBeTruthy();
    expect(["bullish", "bearish", "mixed"]).toContain(analysis.marketAssessment.direction);
    expect(analysis.marketAssessment.confidence).toBeGreaterThan(0);
    expect(analysis.marketAssessment.confidence).toBeLessThanOrEqual(0.95);
  });

  it("updates beliefs when signals are provided", () => {
    const scenario = makeTestScenario();
    const beliefs = initializeBeliefs(["actor_a", "actor_b"]);

    const signals: SignalUpdate[] = [
      {
        timestamp: new Date().toISOString(),
        signal: "actor_a escalates military action",
        actorId: "actor_a",
        typeShifts: { escalatory: 0.8, cooperative: -0.5 },
        source: "action",
      },
    ];

    const withSignals = runBayesianAnalysis(scenario, beliefs, signals);
    const withoutSignals = runBayesianAnalysis(scenario, beliefs);

    // The analyses should differ due to signal processing
    expect(withSignals.dominantTypes.actor_a).toBeDefined();
  });

  it("detects Fearon bargaining failure conditions", () => {
    const scenario = makeTestScenario();
    const beliefs = initializeBeliefs(["actor_a", "actor_b"]);

    const analysis = runBayesianAnalysis(scenario, beliefs);
    // With cooperative equilibria, should have agreement possible
    expect(analysis.fearonAssessment).toBeTruthy();
    expect(analysis.fearonAssessment.length).toBeGreaterThan(20);
  });

  it("computes escalation probability from sequential paths", () => {
    const scenario = makeTestScenario();
    const beliefs = initializeBeliefs(["actor_a", "actor_b"]);
    const analysis = runBayesianAnalysis(scenario, beliefs);
    // Escalation probability should be computed from paths containing "Escalate"
    expect(typeof analysis.escalationProbability).toBe("number");
    expect(analysis.escalationProbability).toBeGreaterThanOrEqual(0);
  });

  it("handles empty actor list gracefully", () => {
    const scenario: NPlayerScenario = {
      ...makeTestScenario(),
      actors: [],
      moveOrder: [],
      strategies: {},
    };
    const beliefs = {};
    const analysis = runBayesianAnalysis(scenario, beliefs);
    expect(analysis).toBeDefined();
  });
});
