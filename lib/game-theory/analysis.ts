import type {
  StrategicScenario,
  NashEquilibrium,
  SchellingPoint,
  EscalationStep,
  GameTheoryAnalysis,
  PayoffEntry,
} from "../thesis/types";
import { getActor } from "./actors";

// ── Nash Equilibrium Finder (Brute Force) ──

export function findNashEquilibria(
  scenario: StrategicScenario
): NashEquilibrium[] {
  const actorIds = scenario.actors;
  if (actorIds.length !== 2) return []; // Only supports 2-player for now

  const [a1, a2] = actorIds;
  const s1 = scenario.strategies[a1];
  const s2 = scenario.strategies[a2];
  const equilibria: NashEquilibrium[] = [];

  for (const strat1 of s1) {
    for (const strat2 of s2) {
      const currentEntry = findPayoffEntry(scenario, { [a1]: strat1, [a2]: strat2 });
      if (!currentEntry) continue;

      // Check if a1 has incentive to deviate
      let a1BestResponse = true;
      for (const altStrat1 of s1) {
        if (altStrat1 === strat1) continue;
        const altEntry = findPayoffEntry(scenario, { [a1]: altStrat1, [a2]: strat2 });
        if (altEntry && altEntry.payoffs[a1] > currentEntry.payoffs[a1]) {
          a1BestResponse = false;
          break;
        }
      }

      // Check if a2 has incentive to deviate
      let a2BestResponse = true;
      for (const altStrat2 of s2) {
        if (altStrat2 === strat2) continue;
        const altEntry = findPayoffEntry(scenario, { [a1]: strat1, [a2]: altStrat2 });
        if (altEntry && altEntry.payoffs[a2] > currentEntry.payoffs[a2]) {
          a2BestResponse = false;
          break;
        }
      }

      if (a1BestResponse && a2BestResponse) {
        // Determine stability
        const totalPayoff = currentEntry.payoffs[a1] + currentEntry.payoffs[a2];
        const stability: NashEquilibrium["stability"] =
          totalPayoff > 0 ? "stable" : totalPayoff < -4 ? "unstable" : "mixed";

        equilibria.push({
          strategies: { [a1]: strat1, [a2]: strat2 },
          payoffs: currentEntry.payoffs,
          stability,
          marketImpact: currentEntry.marketImpact,
        });
      }
    }
  }

  return equilibria;
}

// ── Schelling Point Identification ──

export function identifySchellingPoints(
  scenario: StrategicScenario
): SchellingPoint[] {
  const actorIds = scenario.actors;
  const points: SchellingPoint[] = [];

  // Schelling points: outcomes that are "focal" due to mutual benefit or convention
  // Heuristic 1: Pareto-optimal outcomes where both actors gain
  const paretoOptimal = findParetoOptimal(scenario);
  for (const entry of paretoOptimal) {
    const totalPayoff = Object.values(entry.payoffs).reduce((a, b) => a + b, 0);
    const allPositive = Object.values(entry.payoffs).every((p) => p >= 0);

    if (allPositive) {
      points.push({
        strategy: entry.strategies,
        reasoning: `Mutual gain outcome (total payoff: ${totalPayoff}). Both actors benefit from coordination on this outcome.`,
        probability: Math.min(0.7, 0.3 + totalPayoff * 0.05),
      });
    }
  }

  // Heuristic 2: Status quo / least escalatory options
  for (const actorId of actorIds) {
    const strategies = scenario.strategies[actorId];
    const leastEscalatory = strategies.find(
      (s) =>
        s.toLowerCase().includes("maintain") ||
        s.toLowerCase().includes("diplomatic") ||
        s.toLowerCase().includes("negotiate") ||
        s.toLowerCase().includes("ambiguity")
    );
    if (leastEscalatory) {
      const otherActor = actorIds.find((a) => a !== actorId);
      if (!otherActor) continue;
      const otherLeast = scenario.strategies[otherActor].find(
        (s) =>
          s.toLowerCase().includes("maintain") ||
          s.toLowerCase().includes("diplomatic") ||
          s.toLowerCase().includes("negotiate") ||
          s.toLowerCase().includes("accept") ||
          s.toLowerCase().includes("deterrence")
      );
      if (otherLeast) {
        const entry = findPayoffEntry(scenario, {
          [actorId]: leastEscalatory,
          [otherActor]: otherLeast,
        });
        if (entry) {
          const exists = points.some(
            (p) =>
              JSON.stringify(p.strategy) === JSON.stringify(entry.strategies)
          );
          if (!exists) {
            points.push({
              strategy: entry.strategies,
              reasoning:
                "Status quo focal point. Both actors default to least escalatory option absent strong pressure to deviate.",
              probability: 0.4,
            });
          }
        }
      }
    }
  }

  return points.sort((a, b) => b.probability - a.probability);
}

// ── Escalation Ladder ──

export function buildEscalationLadder(
  scenario: StrategicScenario
): EscalationStep[] {
  const steps: EscalationStep[] = [];
  const entries = [...scenario.payoffMatrix];

  // Sort by average payoff (worst outcomes = highest escalation)
  entries.sort((a, b) => {
    const avgA = Object.values(a.payoffs).reduce((s, v) => s + v, 0) / Object.values(a.payoffs).length;
    const avgB = Object.values(b.payoffs).reduce((s, v) => s + v, 0) / Object.values(b.payoffs).length;
    return avgB - avgA; // Best to worst
  });

  const magnitudeOrder = { low: 1, medium: 2, high: 3 };

  // Group into escalation levels
  entries.forEach((entry, index) => {
    const avgPayoff =
      Object.values(entry.payoffs).reduce((s, v) => s + v, 0) /
      Object.values(entry.payoffs).length;

    const level = Math.min(
      5,
      magnitudeOrder[entry.marketImpact.magnitude] +
        (avgPayoff < -3 ? 2 : avgPayoff < 0 ? 1 : 0)
    );

    const strategyDesc = Object.entries(entry.strategies)
      .map(([actorId, strat]) => {
        const actor = getActor(actorId);
        return `${actor?.shortName || actorId}: ${strat}`;
      })
      .join(" vs ");

    steps.push({
      level,
      description: strategyDesc,
      trigger: entry.marketImpact.description,
      probability: Math.max(0.05, Math.min(0.8, 0.5 - avgPayoff * 0.05)),
      marketImpact: {
        direction: entry.marketImpact.direction,
        magnitude: entry.marketImpact.magnitude,
        sectors: entry.marketImpact.sectors,
      },
    });
  });

  return steps.sort((a, b) => a.level - b.level);
}

// ── Dominant Strategy Detection ──

export function findDominantStrategies(
  scenario: StrategicScenario
): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  const actorIds = scenario.actors;

  for (const actorId of actorIds) {
    const strategies = scenario.strategies[actorId];
    const otherActors = actorIds.filter((a) => a !== actorId);

    let dominant: string | null = null;

    for (const candidateStrat of strategies) {
      let isDominant = true;

      for (const otherStrat of strategies) {
        if (otherStrat === candidateStrat) continue;

        // Check if candidate always beats other against all opponent strategies
        let alwaysBetter = true;
        for (const opponentId of otherActors) {
          for (const oppStrat of scenario.strategies[opponentId]) {
            const candidateEntry = findPayoffEntry(scenario, {
              ...Object.fromEntries(otherActors.map((a) => [a, oppStrat])),
              [actorId]: candidateStrat,
            });
            const otherEntry = findPayoffEntry(scenario, {
              ...Object.fromEntries(otherActors.map((a) => [a, oppStrat])),
              [actorId]: otherStrat,
            });

            if (
              candidateEntry &&
              otherEntry &&
              candidateEntry.payoffs[actorId] <= otherEntry.payoffs[actorId]
            ) {
              alwaysBetter = false;
              break;
            }
          }
          if (!alwaysBetter) break;
        }

        if (!alwaysBetter) {
          isDominant = false;
          break;
        }
      }

      if (isDominant) {
        dominant = candidateStrat;
        break;
      }
    }

    result[actorId] = dominant;
  }

  return result;
}

// ── Full Scenario Analysis ──

export function analyzeScenario(
  scenario: StrategicScenario
): GameTheoryAnalysis {
  const nashEquilibria = findNashEquilibria(scenario);
  const schellingPoints = identifySchellingPoints(scenario);
  const escalationLadder = buildEscalationLadder(scenario);
  const dominantStrategies = findDominantStrategies(scenario);

  // Determine most likely outcome
  let mostLikelyOutcome: string;
  let direction: GameTheoryAnalysis["marketAssessment"]["direction"];
  let confidence: number;
  let keySectors: string[];

  if (nashEquilibria.length > 0) {
    const stableNash = nashEquilibria.find((n) => n.stability === "stable");
    const bestNash = stableNash || nashEquilibria;
    const stratDesc = Object.entries(bestNash.strategies)
      .map(([actorId, strat]) => {
        const actor = getActor(actorId);
        return `${actor?.shortName || actorId} chooses ${strat}`;
      })
      .join("; ");
    mostLikelyOutcome = stratDesc;
    direction = bestNash.marketImpact.direction;
    confidence = stableNash ? 0.7 : 0.5;
    keySectors = bestNash.marketImpact.sectors;
  } else if (schellingPoints.length > 0) {
    const bestPoint = schellingPoints;
    const stratDesc = Object.entries(bestPoint.strategy)
      .map(([actorId, strat]) => {
        const actor = getActor(actorId);
        return `${actor?.shortName || actorId} chooses ${strat}`;
      })
      .join("; ");
    mostLikelyOutcome = stratDesc;
    const entry = findPayoffEntry(scenario, bestPoint.strategy);
    direction = entry?.marketImpact.direction || "mixed";
    confidence = bestPoint.probability;
    keySectors = entry?.marketImpact.sectors || scenario.marketSectors;
  } else {
    mostLikelyOutcome = "No clear equilibrium; high uncertainty";
    direction = "mixed";
    confidence = 0.3;
    keySectors = scenario.marketSectors;
  }

  return {
    scenarioId: scenario.id,
    nashEquilibria,
    schellingPoints,
    escalationLadder,
    dominantStrategies,
    marketAssessment: {
      mostLikelyOutcome,
      direction,
      confidence,
      keySectors,
    },
  };
}

// ── Helpers ──

function findPayoffEntry(
  scenario: StrategicScenario,
  strategies: Record<string, string>
): PayoffEntry | undefined {
  return scenario.payoffMatrix.find((entry) =>
    Object.entries(strategies).every(
      ([actorId, strat]) => entry.strategies[actorId] === strat
    )
  );
}

function findParetoOptimal(scenario: StrategicScenario): PayoffEntry[] {
  const entries = scenario.payoffMatrix;
  return entries.filter((entry) => {
    // An entry is Pareto optimal if no other entry makes all actors at least as well off
    // and at least one strictly better off
    return !entries.some(
      (other) =>
        other !== entry &&
        scenario.actors.every(
          (a) => other.payoffs[a] >= entry.payoffs[a]
        ) &&
        scenario.actors.some((a) => other.payoffs[a] > entry.payoffs[a])
    );
  });
}
