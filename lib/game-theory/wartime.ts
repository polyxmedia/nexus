// Wartime Game-Theory Branch
// When thresholds fire (regime shifts to wartime), the system switches
// from peacetime negotiation models to wartime-specific analysis:
// escalation trajectories, successor dynamics, proxy activation.

import { db, schema } from "../db";
import { eq, desc } from "drizzle-orm";
import { SCENARIOS, getActor } from "./actors";
import { analyzeScenario } from "./analysis";
import { loadRegimeState } from "../regime/store";
import type { RegimeState } from "../regime/detection";
import type { StrategicScenario, GameTheoryAnalysis } from "../thesis/types";

// ── Threshold Definitions ──

export interface Threshold {
  id: string;
  scenarioId: string;
  label: string;
  condition: (regime: RegimeState) => boolean;
  invalidates: string[]; // strategies that become non-viable after this fires
  activates: EscalationTrajectory[];
}

export interface EscalationTrajectory {
  id: string;
  label: string;
  description: string;
  probability: number;
  marketImpact: {
    direction: "bullish" | "bearish" | "mixed";
    magnitude: "low" | "medium" | "high";
    sectors: string[];
  };
}

// Thresholds for Iran-Nuclear scenario
const IRAN_THRESHOLDS: Threshold[] = [
  {
    id: "iran-strikes-launched",
    scenarioId: "iran-nuclear",
    label: "Strikes launched on Iranian nuclear facilities",
    condition: (regime) => {
      // Crisis-level volatility + risk panic = likely kinetic action
      return regime.volatility.regime === "crisis" && regime.riskAppetite.regime === "panic";
    },
    invalidates: ["Negotiate", "Diplomatic pressure", "Threshold maintenance"],
    activates: [
      {
        id: "retaliation-hormuz",
        label: "Hormuz closure / tanker attacks",
        description: "Iran retaliates by disrupting oil transit through Strait of Hormuz",
        probability: 0.6,
        marketImpact: { direction: "bearish", magnitude: "high", sectors: ["energy", "shipping", "airlines"] },
      },
      {
        id: "proxy-activation",
        label: "Full proxy network activation",
        description: "Hezbollah, Houthis, PMF launch coordinated attacks on Israeli / US assets",
        probability: 0.75,
        marketImpact: { direction: "bearish", magnitude: "high", sectors: ["energy", "defense", "airlines"] },
      },
      {
        id: "successor-dynamics",
        label: "Leadership succession crisis",
        description: "Decapitation of senior leadership triggers internal power struggle",
        probability: 0.3,
        marketImpact: { direction: "mixed", magnitude: "medium", sectors: ["energy", "defense"] },
      },
    ],
  },
  {
    id: "hormuz-closure",
    scenarioId: "iran-nuclear",
    label: "Strait of Hormuz closed to shipping",
    condition: (regime) => {
      // Oil in supply-shock regime + crisis vol
      return regime.commodity.regime === "supply-shock" && regime.volatility.regime === "crisis";
    },
    invalidates: ["Negotiate", "Diplomatic pressure"],
    activates: [
      {
        id: "spr-release",
        label: "Coordinated SPR release",
        description: "US + IEA release strategic petroleum reserves",
        probability: 0.9,
        marketImpact: { direction: "mixed", magnitude: "medium", sectors: ["energy"] },
      },
      {
        id: "naval-escort",
        label: "Naval escort operations",
        description: "Multi-national naval force escorts tankers through strait",
        probability: 0.7,
        marketImpact: { direction: "bearish", magnitude: "medium", sectors: ["defense", "shipping"] },
      },
    ],
  },
];

// Thresholds for Taiwan scenario
const TAIWAN_THRESHOLDS: Threshold[] = [
  {
    id: "taiwan-blockade",
    scenarioId: "taiwan-strait",
    label: "China initiates naval blockade of Taiwan",
    condition: (regime) => {
      return regime.volatility.regime === "crisis" && regime.riskAppetite.regime === "panic";
    },
    invalidates: ["Diplomatic pressure", "Strategic ambiguity", "Economic deterrence"],
    activates: [
      {
        id: "semiconductor-cutoff",
        label: "TSMC production halt",
        description: "Global semiconductor supply collapses. Tech production halts within weeks.",
        probability: 0.85,
        marketImpact: { direction: "bearish", magnitude: "high", sectors: ["semiconductors", "technology", "automotive"] },
      },
      {
        id: "us-intervention",
        label: "US naval deployment to Western Pacific",
        description: "Carrier strike groups deployed. Direct confrontation risk.",
        probability: 0.6,
        marketImpact: { direction: "bearish", magnitude: "high", sectors: ["defense", "shipping", "energy"] },
      },
      {
        id: "economic-decoupling",
        label: "Emergency economic decoupling",
        description: "Full trade embargo, asset freezes, financial system bifurcation.",
        probability: 0.7,
        marketImpact: { direction: "bearish", magnitude: "high", sectors: ["finance", "technology", "trade"] },
      },
    ],
  },
];

const ALL_THRESHOLDS: Threshold[] = [...IRAN_THRESHOLDS, ...TAIWAN_THRESHOLDS];

// ── Core Functions ──

/**
 * Check all thresholds against current regime state.
 * Returns newly fired thresholds.
 */
export async function checkThresholds(): Promise<Threshold[]> {
  const regimeState = await loadRegimeState<RegimeState>("latest");
  if (!regimeState) return [];

  const fired: Threshold[] = [];

  for (const threshold of ALL_THRESHOLDS) {
    if (threshold.condition(regimeState)) {
      // Check if already recorded
      const existing = await db
        .select()
        .from(schema.scenarioStates)
        .where(eq(schema.scenarioStates.scenarioId, threshold.scenarioId))
        .orderBy(desc(schema.scenarioStates.id))
        .limit(1);

      const latestState = existing[0];
      const triggeredSoFar: string[] = latestState?.triggeredThresholds
        ? JSON.parse(latestState.triggeredThresholds)
        : [];

      if (!triggeredSoFar.includes(threshold.id)) {
        fired.push(threshold);
      }
    }
  }

  return fired;
}

/**
 * When a threshold fires, update the scenario state:
 * - Record the threshold
 * - Invalidate strategies that are no longer viable
 * - Activate wartime escalation trajectories
 * - Mark post-event predictions
 */
export async function handleThresholdFire(threshold: Threshold): Promise<void> {
  const regimeState = await loadRegimeState<RegimeState>("latest");
  const now = new Date().toISOString();

  // Load or create scenario state
  const existing = await db
    .select()
    .from(schema.scenarioStates)
    .where(eq(schema.scenarioStates.scenarioId, threshold.scenarioId))
    .orderBy(desc(schema.scenarioStates.id))
    .limit(1);

  const prev = existing[0];
  const triggeredSoFar: string[] = prev?.triggeredThresholds
    ? JSON.parse(prev.triggeredThresholds)
    : [];
  const invalidatedSoFar: string[] = prev?.invalidatedStrategies
    ? JSON.parse(prev.invalidatedStrategies)
    : [];
  const activeSoFar: EscalationTrajectory[] = prev?.activeTrajectories
    ? JSON.parse(prev.activeTrajectories)
    : [];

  // Merge new threshold data
  const updatedThresholds = [...triggeredSoFar, threshold.id];
  const updatedInvalidated = [...new Set([...invalidatedSoFar, ...threshold.invalidates])];
  const updatedTrajectories = [...activeSoFar, ...threshold.activates];

  // Determine new state
  const state = updatedThresholds.length >= 2 ? "wartime" : "escalating";

  await db.insert(schema.scenarioStates).values({
    scenarioId: threshold.scenarioId,
    regime: "wartime",
    state,
    triggeredThresholds: JSON.stringify(updatedThresholds),
    activeTrajectories: JSON.stringify(updatedTrajectories),
    invalidatedStrategies: JSON.stringify(updatedInvalidated),
    contextSnapshot: JSON.stringify({
      regime: regimeState,
      firedAt: now,
      thresholdLabel: threshold.label,
    }),
  });

  // Mark pending predictions that reference this scenario's actors as POST_EVENT
  const scenarioCfg = SCENARIOS.find((s) => s.id === threshold.scenarioId);
  if (scenarioCfg) {
    const actorNames = scenarioCfg.actors.map((id) => getActor(id)?.name || id);
    const allRows = await db.select().from(schema.predictions);
    const allPending = allRows.filter((p) => !p.outcome);

    for (const pred of allPending) {
      const claim = pred.claim.toLowerCase();
      const isRelated = actorNames.some((name) => claim.includes(name.toLowerCase())) ||
        scenarioCfg.marketSectors.some((sector) => claim.includes(sector));

      if (isRelated) {
        await db.update(schema.predictions)
          .set({
            preEvent: 0,
            outcome: "post_event",
            outcomeNotes: `Post-event: ${threshold.label}. Threshold fired, prediction overtaken by events.`,
            resolvedAt: now,
          })
          .where(eq(schema.predictions.id, pred.id));
      }
    }
  }
}

/**
 * Get wartime-adjusted game theory analysis.
 * If a scenario is in wartime state, filter out invalidated strategies
 * and focus on escalation trajectories instead.
 */
export async function getWartimeAnalysis(scenarioId: string): Promise<{
  analysis: GameTheoryAnalysis;
  scenarioState: {
    regime: string;
    state: string;
    triggeredThresholds: string[];
    invalidatedStrategies: string[];
    activeTrajectories: EscalationTrajectory[];
  } | null;
  isWartime: boolean;
}> {
  // Get latest scenario state
  const stateRows = await db
    .select()
    .from(schema.scenarioStates)
    .where(eq(schema.scenarioStates.scenarioId, scenarioId))
    .orderBy(desc(schema.scenarioStates.id))
    .limit(1);

  const scenarioState = stateRows[0];
  const isWartime = scenarioState?.regime === "wartime";

  const scenario = SCENARIOS.find((s) => s.id === scenarioId);
  if (!scenario) {
    throw new Error(`Scenario ${scenarioId} not found`);
  }

  if (!isWartime || !scenarioState) {
    // Peacetime: standard analysis
    const analysis = analyzeScenario(scenario);
    return { analysis, scenarioState: null, isWartime: false };
  }

  // Wartime: filter invalidated strategies from the scenario
  const invalidated: string[] = scenarioState.invalidatedStrategies
    ? JSON.parse(scenarioState.invalidatedStrategies)
    : [];
  const trajectories: EscalationTrajectory[] = scenarioState.activeTrajectories
    ? JSON.parse(scenarioState.activeTrajectories)
    : [];
  const thresholds: string[] = scenarioState.triggeredThresholds
    ? JSON.parse(scenarioState.triggeredThresholds)
    : [];

  // Create a filtered scenario with invalidated strategies removed
  const filteredScenario: StrategicScenario = {
    ...scenario,
    strategies: Object.fromEntries(
      Object.entries(scenario.strategies).map(([actorId, strategies]) => [
        actorId,
        strategies.filter((s) => !invalidated.includes(s)),
      ])
    ),
    payoffMatrix: scenario.payoffMatrix.filter((entry) =>
      Object.values(entry.strategies).every((s) => !invalidated.includes(s))
    ),
  };

  // Run analysis on filtered scenario
  const analysis = analyzeScenario(filteredScenario);

  return {
    analysis,
    scenarioState: {
      regime: scenarioState.regime,
      state: scenarioState.state,
      triggeredThresholds: thresholds,
      invalidatedStrategies: invalidated,
      activeTrajectories: trajectories,
    },
    isWartime,
  };
}

/**
 * Run wartime check as part of the daily cycle.
 * Checks thresholds, fires handlers, returns summary.
 */
export async function runWartimeCheck(): Promise<{
  thresholdsFired: number;
  details: string[];
}> {
  const fired = await checkThresholds();
  const details: string[] = [];

  for (const threshold of fired) {
    await handleThresholdFire(threshold);
    details.push(`[${threshold.scenarioId}] ${threshold.label}`);
  }

  return {
    thresholdsFired: fired.length,
    details,
  };
}
