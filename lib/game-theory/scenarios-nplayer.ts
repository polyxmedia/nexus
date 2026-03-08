/**
 * N-Player Sequential Scenario Definitions
 *
 * Each scenario models the actual actor complexity, not simplified 2-player.
 * Move orders reflect real decision sequencing. Utility functions encode
 * domain-specific payoff logic. Coalitions capture alliance dynamics.
 */

import type { NPlayerScenario, ActorType } from "./bayesian";

// ── Utility helper: type-conditioned payoffs ──

function typeModifier(type: ActorType, basePayoff: number): number {
  const mods: Record<ActorType, number> = {
    cooperative: basePayoff > 0 ? 1.2 : 0.8,
    hawkish: basePayoff > 0 ? 0.9 : 1.3,
    desperate: 1.5, // amplifies everything
    calculating: 1.0,
    escalatory: basePayoff < 0 ? 1.4 : 0.7,
    defensive: basePayoff > 0 ? 1.1 : 0.9,
  };
  return basePayoff * (mods[type] || 1.0);
}

// ── Iran Scenario (5+ actors) ──

export const IRAN_SCENARIO: NPlayerScenario = {
  id: "iran-nplayer",
  title: "Iran Crisis: N-Player Sequential",
  description: "US, Israel, Iran, IRGC (distinct from Iranian state), Saudi Arabia, China, Russia, Hezbollah, and Houthi actors making sequential interdependent moves with private information.",
  actors: ["us", "israel", "iran", "saudi", "china", "russia"],
  moveOrder: ["us", "iran", "israel", "china", "russia", "saudi"],
  strategies: {
    us: ["Maximum pressure", "Limited strikes", "Diplomatic engagement", "Strategic patience"],
    iran: ["Nuclear breakout", "Proxy escalation", "Negotiate", "Threshold maintenance"],
    israel: ["Preemptive strike", "Deterrence posture", "Diplomatic coordination", "Intelligence operations"],
    saudi: ["Neutrality", "Quiet alignment with US", "Independent mediation", "Energy leverage"],
    china: ["Diplomatic shield", "Economic lifeline", "Neutral observer", "Mediation bid"],
    russia: ["Military support", "Diplomatic cover", "Arms sales", "Opportunistic positioning"],
  },
  conditionalStrategies: {
    israel: [
      {
        strategy: "Full military campaign",
        availableWhen: (prior) =>
          prior.iran === "Nuclear breakout" || prior.iran === "Proxy escalation",
      },
    ],
    us: [
      {
        strategy: "Full blockade",
        availableWhen: (prior) =>
          prior.iran === "Nuclear breakout",
      },
    ],
    saudi: [
      {
        strategy: "Oil production surge",
        availableWhen: (prior) =>
          prior.iran === "Proxy escalation" || prior.us === "Maximum pressure",
      },
    ],
  },
  utilityFn: (strategies, types) => {
    const payoffs: Record<string, number> = {};
    const s = strategies;

    // US payoffs
    let usBase = 0;
    if (s.us === "Maximum pressure") usBase = s.iran === "Negotiate" ? 6 : -2;
    else if (s.us === "Limited strikes") usBase = s.iran === "Proxy escalation" ? 1 : -3;
    else if (s.us === "Diplomatic engagement") usBase = s.iran === "Negotiate" ? 4 : 0;
    else usBase = 1; // strategic patience
    payoffs.us = typeModifier(types.us, usBase);

    // Iran payoffs
    let iranBase = 0;
    if (s.iran === "Nuclear breakout") iranBase = s.us === "Strategic patience" ? 5 : -6;
    else if (s.iran === "Proxy escalation") iranBase = s.israel === "Preemptive strike" ? -7 : 2;
    else if (s.iran === "Negotiate") iranBase = s.us === "Diplomatic engagement" ? 3 : -1;
    else iranBase = 2; // threshold maintenance
    payoffs.iran = typeModifier(types.iran, iranBase);

    // Israel payoffs
    let israelBase = 0;
    if (s.israel === "Preemptive strike") israelBase = s.iran === "Nuclear breakout" ? 3 : -4;
    else if (s.israel === "Deterrence posture") israelBase = 2;
    else if (s.israel === "Diplomatic coordination") israelBase = s.us === "Diplomatic engagement" ? 3 : 1;
    else israelBase = 1;
    // Iran proxy escalation is bad for Israel regardless
    if (s.iran === "Proxy escalation") israelBase -= 3;
    payoffs.israel = typeModifier(types.israel, israelBase);

    // Saudi payoffs
    let saudiBase = 0;
    if (s.saudi === "Neutrality") saudiBase = 1;
    else if (s.saudi === "Quiet alignment with US") saudiBase = s.us === "Maximum pressure" ? 2 : 0;
    else if (s.saudi === "Independent mediation") saudiBase = s.iran === "Negotiate" ? 4 : -1;
    else saudiBase = s.iran === "Proxy escalation" ? 3 : 1;
    // Regional war is bad for Saudi
    if (s.iran === "Nuclear breakout" || s.israel === "Preemptive strike") saudiBase -= 2;
    payoffs.saudi = typeModifier(types.saudi, saudiBase);

    // China payoffs
    let chinaBase = 0;
    if (s.china === "Economic lifeline") chinaBase = s.us === "Maximum pressure" ? 2 : 1;
    else if (s.china === "Diplomatic shield") chinaBase = 1;
    else if (s.china === "Mediation bid") chinaBase = s.iran === "Negotiate" ? 4 : 0;
    else chinaBase = 0;
    // US-Iran conflict distracts from Taiwan, net positive for China
    if (s.us === "Limited strikes" || s.us === "Maximum pressure") chinaBase += 1;
    payoffs.china = typeModifier(types.china, chinaBase);

    // Russia payoffs
    let russiaBase = 0;
    if (s.russia === "Military support") russiaBase = s.iran === "Nuclear breakout" ? -2 : 1;
    else if (s.russia === "Arms sales") russiaBase = 2;
    else if (s.russia === "Diplomatic cover") russiaBase = 1;
    else russiaBase = 1;
    // Conflict raises energy prices, good for Russia
    if (s.iran === "Proxy escalation" || s.us === "Limited strikes") russiaBase += 2;
    payoffs.russia = typeModifier(types.russia, russiaBase);

    return payoffs;
  },
  coalitions: [
    {
      id: "western",
      name: "US-Israel Alliance",
      members: ["us", "israel"],
      stability: 0.85,
      fractureProbability: 0.15,
      fractureCondition: "Divergence on Iran negotiation willingness, US domestic war fatigue",
    },
    {
      id: "resistance",
      name: "Resistance Axis",
      members: ["iran", "russia"],
      stability: 0.6,
      fractureProbability: 0.35,
      fractureCondition: "Russia prioritizes Ukraine, reduces Iran support",
    },
    {
      id: "gulf",
      name: "Gulf Stability Bloc",
      members: ["saudi"],
      stability: 0.9,
      fractureProbability: 0.1,
      fractureCondition: "Direct Iranian attack on Saudi infrastructure",
    },
  ],
  marketSectors: ["Energy", "Defense", "Shipping", "Insurance", "Gold"],
  timeHorizon: "short_term",
};

// ── Taiwan Strait (N-player) ──

export const TAIWAN_SCENARIO: NPlayerScenario = {
  id: "taiwan-nplayer",
  title: "Taiwan Strait: N-Player Sequential",
  description: "China, US, Taiwan, Japan, South Korea, and Australia in a sequential crisis over Taiwan strait control.",
  actors: ["china", "us", "taiwan", "japan"],
  moveOrder: ["china", "us", "taiwan", "japan", "us"],
  strategies: {
    china: ["Military blockade", "Gray zone escalation", "Economic coercion", "Diplomatic pressure"],
    us: ["Naval deployment", "Economic deterrence", "Diplomatic intervention", "Strategic ambiguity"],
    taiwan: ["Full mobilization", "Asymmetric defense", "Diplomatic outreach", "Status quo maintenance"],
    japan: ["Base access support", "Naval cooperation", "Diplomatic mediation", "Non-involvement"],
  },
  conditionalStrategies: {
    us: [
      {
        strategy: "Direct military intervention",
        availableWhen: (prior) => prior.china === "Military blockade",
      },
    ],
    japan: [
      {
        strategy: "Active military support",
        availableWhen: (prior) =>
          prior.china === "Military blockade" && prior.us === "Naval deployment",
      },
    ],
  },
  utilityFn: (strategies, types) => {
    const payoffs: Record<string, number> = {};
    const s = strategies;

    // China
    let chinaBase = 0;
    if (s.china === "Military blockade") chinaBase = s.us === "Strategic ambiguity" ? 4 : -5;
    else if (s.china === "Gray zone escalation") chinaBase = 2;
    else if (s.china === "Economic coercion") chinaBase = s.taiwan === "Status quo maintenance" ? 3 : 1;
    else chinaBase = 1;
    payoffs.china = typeModifier(types.china, chinaBase);

    // US
    let usBase = 0;
    if (s.us === "Naval deployment") usBase = s.china === "Military blockade" ? 1 : 2;
    else if (s.us === "Economic deterrence") usBase = 1;
    else if (s.us === "Diplomatic intervention") usBase = s.china === "Diplomatic pressure" ? 3 : 0;
    else usBase = s.china === "Military blockade" ? -4 : 1;
    payoffs.us = typeModifier(types.us, usBase);

    // Taiwan
    let twBase = 0;
    if (s.china === "Military blockade") twBase = -6;
    else if (s.china === "Economic coercion") twBase = -2;
    else twBase = 1;
    if (s.us === "Naval deployment" || s.us === "Direct military intervention") twBase += 3;
    if (s.taiwan === "Asymmetric defense") twBase += 1;
    payoffs.taiwan = typeModifier(types.taiwan || "defensive", twBase);

    // Japan
    let jpBase = 0;
    if (s.china === "Military blockade") jpBase = -3; // disrupts shipping
    if (s.japan === "Base access support" && s.us === "Naval deployment") jpBase += 2;
    else if (s.japan === "Non-involvement") jpBase = s.china === "Military blockade" ? -2 : 1;
    else jpBase = 0;
    payoffs.japan = typeModifier(types.japan || "calculating", jpBase);

    return payoffs;
  },
  coalitions: [
    {
      id: "quad",
      name: "US-Japan-Taiwan Defense",
      members: ["us", "taiwan", "japan"],
      stability: 0.75,
      fractureProbability: 0.2,
      fractureCondition: "Japan domestic opposition to military involvement, Article 9 constraints",
    },
  ],
  marketSectors: ["Semiconductors", "Tech", "Shipping", "Defense", "Currency"],
  timeHorizon: "medium_term",
};

// ── Russia-Ukraine (N-player) ──

export const UKRAINE_SCENARIO: NPlayerScenario = {
  id: "ukraine-nplayer",
  title: "Russia-Ukraine: N-Player Sequential",
  description: "Russia, Ukraine, US/NATO, EU, China in sequential escalation with coalition dynamics.",
  actors: ["russia", "us", "china"],
  moveOrder: ["russia", "us", "china", "russia", "us"],
  strategies: {
    russia: ["Escalate offensive", "Attrition warfare", "Nuclear signaling", "Negotiate from strength"],
    us: ["Increase military aid", "Direct NATO involvement", "Push settlement", "Maintain current support"],
    china: ["Diplomatic mediation", "Economic support Russia", "Neutral positioning", "Peace plan push"],
  },
  conditionalStrategies: {
    us: [
      {
        strategy: "Article 5 activation",
        availableWhen: (prior) => prior.russia === "Nuclear signaling",
      },
    ],
  },
  utilityFn: (strategies, types) => {
    const payoffs: Record<string, number> = {};
    const s = strategies;

    let ruBase = 0;
    if (s.russia === "Escalate offensive") ruBase = s.us === "Maintain current support" ? 3 : -3;
    else if (s.russia === "Nuclear signaling") ruBase = -4; // massive cost
    else if (s.russia === "Negotiate from strength") ruBase = s.us === "Push settlement" ? 4 : 1;
    else ruBase = 0;
    if (s.china === "Economic support Russia") ruBase += 2;
    payoffs.russia = typeModifier(types.russia, ruBase);

    let usBase = 0;
    if (s.us === "Increase military aid") usBase = s.russia === "Attrition warfare" ? 1 : 2;
    else if (s.us === "Push settlement") usBase = s.russia === "Negotiate from strength" ? 3 : -1;
    else if (s.us === "Direct NATO involvement") usBase = -2;
    else usBase = 0;
    payoffs.us = typeModifier(types.us, usBase);

    let cnBase = 0;
    if (s.china === "Diplomatic mediation") cnBase = 3;
    else if (s.china === "Economic support Russia") cnBase = s.us === "Increase military aid" ? -1 : 2;
    else cnBase = 1;
    // Prolonged conflict benefits China by distracting US
    if (s.russia === "Attrition warfare") cnBase += 1;
    payoffs.china = typeModifier(types.china, cnBase);

    return payoffs;
  },
  coalitions: [
    {
      id: "nato",
      name: "NATO Support Coalition",
      members: ["us"],
      stability: 0.7,
      fractureProbability: 0.3,
      fractureCondition: "European energy costs, US domestic fatigue, election cycle pressure",
    },
    {
      id: "sino-russian",
      name: "Sino-Russian Alignment",
      members: ["russia", "china"],
      stability: 0.55,
      fractureProbability: 0.4,
      fractureCondition: "China unwilling to be sanctioned for Russia, limits on support",
    },
  ],
  marketSectors: ["Energy", "Defense", "Agriculture", "Rare Earths", "European Equities"],
  timeHorizon: "medium_term",
};

// ── Scenario Registry ──

export const N_PLAYER_SCENARIOS: NPlayerScenario[] = [
  IRAN_SCENARIO,
  TAIWAN_SCENARIO,
  UKRAINE_SCENARIO,
];

export function getNPlayerScenario(id: string): NPlayerScenario | undefined {
  return N_PLAYER_SCENARIOS.find(s => s.id === id);
}
