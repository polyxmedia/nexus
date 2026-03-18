/**
 * Dynamic Payoff Context
 *
 * Bridges live data (market prices, OSINT signals, wartime state) into
 * game theory payoff functions. Without this, utility functions use
 * hardcoded payoffs that never change. With it, equilibria shift in
 * real time as conditions evolve.
 *
 * When a mine hits a tanker, the payoff for "maintain Hormuz closure"
 * changes for every actor simultaneously. This module captures that.
 *
 * Architecture:
 *   Live data sources → buildDynamicContext() → DynamicPayoffContext
 *   DynamicPayoffContext → applyContextModifiers() → adjusted base payoff
 *   Scenario utilityFn calls applyContextModifiers() per actor per strategy
 */

// ── Context Interface ──

export interface DynamicPayoffContext {
  // Commodity prices relative to baseline (1.0 = normal, 1.5 = 50% above)
  oilPriceRatio: number;       // WTI / baseline ($80)
  goldPriceRatio: number;      // Gold / baseline ($2000)
  natGasPriceRatio: number;    // NatGas / baseline ($3.50)

  // Volatility & risk
  vixLevel: number;            // Raw VIX value
  vixRegime: "low" | "normal" | "elevated" | "crisis"; // <15, 15-25, 25-40, >40

  // Signal intensity from Bayesian fusion (1-5)
  signalIntensity: number;
  signalPosterior: number;     // 0-1 posterior from fusion

  // Wartime state
  wartimeRegime: "peacetime" | "transitional" | "wartime";
  activeEscalations: string[]; // e.g. ["hormuz-closure", "nuclear-strike"]

  // Recent event counts (last 7 days)
  recentAttacks: number;       // military strikes, tanker hits, etc.
  recentDiplomacy: number;     // peace talks, summits, back-channel signals
  recentSanctions: number;     // new sanctions packages

  // Shipping disruption (0 = normal, 1 = fully disrupted)
  shippingDisruption: number;

  // Timestamp
  asOf: string;
}

// ── Default / Fallback Context ──

export const DEFAULT_CONTEXT: DynamicPayoffContext = {
  oilPriceRatio: 1.0,
  goldPriceRatio: 1.0,
  natGasPriceRatio: 1.0,
  vixLevel: 20,
  vixRegime: "normal",
  signalIntensity: 1,
  signalPosterior: 0.1,
  wartimeRegime: "peacetime",
  activeEscalations: [],
  recentAttacks: 0,
  recentDiplomacy: 0,
  recentSanctions: 0,
  shippingDisruption: 0,
  asOf: new Date().toISOString(),
};

// ── Payoff Modifier Functions ──
// These apply context-dependent adjustments to base payoffs.
// Each returns a multiplier + additive shift.

interface PayoffAdjustment {
  multiplier: number;  // scales the base payoff (1.0 = no change)
  shift: number;       // additive adjustment after multiplication
}

/**
 * Compute payoff adjustment for a specific actor + strategy given live context.
 *
 * This is the core function that makes payoffs dynamic. Each scenario's
 * utilityFn calls this to modify hardcoded base payoffs based on what's
 * actually happening in the world.
 */
export function computePayoffAdjustment(
  actorId: string,
  strategy: string,
  context: DynamicPayoffContext
): PayoffAdjustment {
  let multiplier = 1.0;
  let shift = 0;

  const lower = strategy.toLowerCase();

  // ── Oil price effects ──
  // High oil prices benefit producers/leveragers, hurt consumers/military ops
  const oilDelta = context.oilPriceRatio - 1.0; // positive = above baseline

  if (["iran", "russia", "saudi"].includes(actorId)) {
    // Energy exporters benefit from high oil prices
    if (lower.includes("proxy") || lower.includes("escalat") || lower.includes("closure")) {
      // Escalation strategies become more attractive when oil is high
      // (Iran profits from keeping strait closed when prices spike)
      shift += oilDelta * 2.0;
    }
    if (lower.includes("negotiate") || lower.includes("ceasefire")) {
      // Negotiation becomes less attractive when you're profiting from chaos
      shift -= oilDelta * 1.0;
    }
    if (actorId === "saudi" && (lower.includes("energy") || lower.includes("production"))) {
      // Saudi energy leverage increases with oil price
      shift += oilDelta * 1.5;
    }
  }

  if (["us", "china", "japan", "eu"].includes(actorId)) {
    // Energy importers are hurt by high oil prices
    if (lower.includes("military") || lower.includes("strike") || lower.includes("blockade")) {
      // Military operations more costly with high energy prices
      shift -= oilDelta * 1.5;
    }
    if (lower.includes("diplomat") || lower.includes("negotiat") || lower.includes("settle")) {
      // Diplomatic resolution becomes more attractive to importers
      shift += oilDelta * 1.0;
    }
  }

  // ── VIX / Volatility regime effects ──
  // High volatility amplifies extreme payoffs (both positive and negative)
  if (context.vixRegime === "crisis") {
    multiplier *= 1.3; // everything matters more in crisis
  } else if (context.vixRegime === "elevated") {
    multiplier *= 1.1;
  }

  // ── Signal intensity effects ──
  // Higher signal intensity = more consequential moment
  // Amplifies the magnitude of all payoffs
  if (context.signalIntensity >= 4) {
    multiplier *= 1.0 + (context.signalIntensity - 3) * 0.1; // +10-20%
  }

  // ── Wartime regime effects ──
  if (context.wartimeRegime === "wartime") {
    // In wartime, escalation is cheaper (already at war) and
    // de-escalation is harder (commitment trap)
    if (lower.includes("escalat") || lower.includes("strike") || lower.includes("offensive")) {
      shift += 1.0; // escalation penalty reduced
    }
    if (lower.includes("negotiate") || lower.includes("ceasefire") || lower.includes("settle")) {
      shift -= 1.5; // harder to back down during active conflict
    }
    // Military operations become normalized
    if (lower.includes("military") || lower.includes("campaign")) {
      shift += 0.5;
    }
  } else if (context.wartimeRegime === "transitional") {
    if (lower.includes("escalat")) shift += 0.5;
    if (lower.includes("negotiate")) shift -= 0.5;
  }

  // ── Recent attacks effect ──
  // Each recent attack increases retaliation payoff and decreases patience payoff
  if (context.recentAttacks > 0) {
    const attackPressure = Math.min(context.recentAttacks * 0.3, 2.0);

    if (lower.includes("retaliat") || lower.includes("strike") || lower.includes("maximum")) {
      shift += attackPressure; // domestic pressure to respond
    }
    if (lower.includes("patience") || lower.includes("ambiguity") || lower.includes("non-involve")) {
      shift -= attackPressure; // inaction becomes politically costly
    }
  }

  // ── Recent diplomacy effect ──
  // Diplomatic activity increases the payoff for diplomatic strategies
  if (context.recentDiplomacy > 0) {
    const diploPressure = Math.min(context.recentDiplomacy * 0.4, 2.0);

    if (lower.includes("diplomat") || lower.includes("negotiat") || lower.includes("mediat")) {
      shift += diploPressure; // momentum for peace
    }
  }

  // ── Shipping disruption effect ──
  // Directly affects maritime strategies and global trade
  if (context.shippingDisruption > 0.3) {
    const disruptionLevel = context.shippingDisruption;

    // Hormuz closure / proxy attacks have diminishing returns if already disrupted
    if (lower.includes("proxy") || lower.includes("closure") || lower.includes("mine")) {
      shift -= disruptionLevel * 0.5; // less marginal value of more disruption
    }
    // Escort operations / reopening become more valuable
    if (lower.includes("escort") || lower.includes("patrol") || lower.includes("reopen")) {
      shift += disruptionLevel * 1.5;
    }
    // All actors feel shipping costs
    if (["us", "china", "japan", "eu"].includes(actorId)) {
      shift -= disruptionLevel * 0.5; // global trade drag
    }
  }

  // ── Sanctions effect ──
  if (context.recentSanctions > 0) {
    const sanctionPressure = Math.min(context.recentSanctions * 0.3, 1.5);

    if (actorId === "iran" || actorId === "russia") {
      // Sanctions increase desperation, make escalation more attractive
      if (lower.includes("escalat") || lower.includes("breakout") || lower.includes("proxy")) {
        shift += sanctionPressure * 0.5; // nothing left to lose
      }
      if (lower.includes("negotiate")) {
        shift += sanctionPressure * 0.3; // or drive to negotiate
      }
    }
  }

  // ── Gold price as fear indicator ──
  if (context.goldPriceRatio > 1.1) {
    // Gold spike = risk-off, safe haven demand
    // Defensive strategies become more attractive for all
    if (lower.includes("defen") || lower.includes("deter") || lower.includes("patience")) {
      shift += (context.goldPriceRatio - 1.0) * 1.0;
    }
  }

  // Clamp multiplier and shift to prevent extreme distortions.
  // Uncapped shifts were the root cause of >100% probabilities in wartime:
  // VIX crisis + wartime regime + recent attacks + oil spike could stack
  // shifts of +5 or more, producing QRE logit overflow.
  multiplier = Math.max(0.5, Math.min(2.0, multiplier));
  shift = Math.max(-4, Math.min(4, shift));

  return { multiplier, shift };
}

/**
 * Apply dynamic context to a base payoff.
 * Called from within scenario utilityFn functions.
 */
export function applyContextToPayoff(
  basePayoff: number,
  actorId: string,
  strategy: string,
  context: DynamicPayoffContext | undefined
): number {
  if (!context || !strategy) return basePayoff;

  const adj = computePayoffAdjustment(actorId, strategy, context);
  const adjusted = basePayoff * adj.multiplier + adj.shift;

  // Clamp final payoff to prevent QRE overflow.
  // Without this, wartime + crisis conditions stack shifts that produce
  // payoffs of +7 or higher, which QRE exponentiates into probabilities >1.
  // Base payoffs in NEXUS scenarios range from -5 to +5, so [-8, +8] gives
  // generous room for dynamic adjustment without breaking the math.
  return Math.max(-8, Math.min(8, adjusted));
}

// ── Context Builder ──
// Constructs DynamicPayoffContext from available data sources.
// This is the integration point with the rest of the system.

/**
 * Build a DynamicPayoffContext from raw inputs.
 * In production, these inputs come from:
 *   - Market data provider (getQuote)
 *   - Signal fusion (convergence results)
 *   - Scenario state table (wartime regime)
 *   - OSINT event counts
 *
 * This function is intentionally synchronous and takes pre-fetched data
 * so it can be used without async/await in the game theory pipeline.
 */
export function buildDynamicContext(inputs: {
  wtiPrice?: number;
  goldPrice?: number;
  natGasPrice?: number;
  vix?: number;
  signalIntensity?: number;
  signalPosterior?: number;
  wartimeRegime?: "peacetime" | "transitional" | "wartime";
  activeEscalations?: string[];
  recentAttacks?: number;
  recentDiplomacy?: number;
  recentSanctions?: number;
  shippingDisruption?: number;
}): DynamicPayoffContext {
  const WTI_BASELINE = 80;
  const GOLD_BASELINE = 2000;
  const NATGAS_BASELINE = 3.50;

  const vix = inputs.vix ?? 20;
  let vixRegime: DynamicPayoffContext["vixRegime"] = "normal";
  if (vix > 40) vixRegime = "crisis";
  else if (vix > 25) vixRegime = "elevated";
  else if (vix < 15) vixRegime = "low";

  return {
    oilPriceRatio: (inputs.wtiPrice ?? WTI_BASELINE) / WTI_BASELINE,
    goldPriceRatio: (inputs.goldPrice ?? GOLD_BASELINE) / GOLD_BASELINE,
    natGasPriceRatio: (inputs.natGasPrice ?? NATGAS_BASELINE) / NATGAS_BASELINE,
    vixLevel: vix,
    vixRegime,
    signalIntensity: inputs.signalIntensity ?? 1,
    signalPosterior: inputs.signalPosterior ?? 0.1,
    wartimeRegime: inputs.wartimeRegime ?? "peacetime",
    activeEscalations: inputs.activeEscalations ?? [],
    recentAttacks: inputs.recentAttacks ?? 0,
    recentDiplomacy: inputs.recentDiplomacy ?? 0,
    recentSanctions: inputs.recentSanctions ?? 0,
    shippingDisruption: inputs.shippingDisruption ?? 0,
    asOf: new Date().toISOString(),
  };
}
