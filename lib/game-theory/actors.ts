import type {
  GeopoliticalActor,
  StrategicScenario,
  PayoffEntry,
} from "../thesis/types";

// ── Pre-configured Geopolitical Actors ──

export const ACTORS: GeopoliticalActor[] = [
  {
    id: "us",
    name: "United States",
    shortName: "US",
    objectives: [
      "Maintain global hegemony",
      "Protect dollar reserve status",
      "Contain peer competitors",
      "Secure energy supply chains",
    ],
    capabilities: [
      "Global military projection",
      "Financial sanctions regime",
      "Technology export controls",
      "Alliance network (NATO, AUKUS, Quad)",
    ],
    constraints: [
      "Domestic political polarization",
      "Fiscal deficit limits",
      "War fatigue in electorate",
      "Multi-front commitment strain",
    ],
    redLines: [
      "Direct attack on NATO territory",
      "Nuclear weapon use by adversary",
      "Closure of major shipping lanes",
    ],
    alliances: ["eu", "israel", "saudi"],
    adversaries: ["china", "russia", "iran", "dprk"],
  },
  {
    id: "china",
    name: "People's Republic of China",
    shortName: "China",
    objectives: [
      "Taiwan reunification",
      "Regional hegemony in Indo-Pacific",
      "Technology self-sufficiency",
      "Belt and Road expansion",
    ],
    capabilities: [
      "Largest navy by hull count",
      "Manufacturing dominance",
      "Rare earth monopoly",
      "Cyber warfare capabilities",
    ],
    constraints: [
      "Economic slowdown and property crisis",
      "Demographic decline",
      "Energy import dependency",
      "Limited combat experience",
    ],
    redLines: [
      "Taiwan formal independence declaration",
      "US nuclear deployment to Taiwan",
      "Trade embargo on energy imports",
    ],
    alliances: ["russia", "dprk"],
    adversaries: ["us"],
  },
  {
    id: "russia",
    name: "Russian Federation",
    shortName: "Russia",
    objectives: [
      "Restore sphere of influence",
      "Prevent NATO expansion",
      "Maintain energy leverage over Europe",
      "Regime survival",
    ],
    capabilities: [
      "Nuclear arsenal parity with US",
      "Energy export leverage",
      "Hybrid warfare expertise",
      "Arctic military presence",
    ],
    constraints: [
      "Sanctions-weakened economy",
      "Military attrition from Ukraine",
      "Brain drain",
      "Equipment losses and resupply issues",
    ],
    redLines: [
      "NATO forces in Ukraine",
      "Attack on Russian sovereign territory",
      "Regime change operations",
    ],
    alliances: ["china", "iran", "dprk"],
    adversaries: ["us", "eu"],
  },
  {
    id: "iran",
    name: "Islamic Republic of Iran",
    shortName: "Iran",
    objectives: [
      "Regional hegemony in Middle East",
      "Nuclear threshold capability",
      "Proxy network maintenance",
      "Sanctions relief",
    ],
    capabilities: [
      "Proxy network (Hezbollah, Houthis, PMF)",
      "Ballistic missile program",
      "Strait of Hormuz leverage",
      "Asymmetric warfare doctrine",
    ],
    constraints: [
      "Economic isolation",
      "Domestic unrest",
      "Conventional military weakness",
      "Proxy network degradation post-2024",
    ],
    redLines: [
      "Attack on nuclear facilities",
      "Assassination of senior leadership",
      "Full proxy network collapse",
    ],
    alliances: ["russia", "dprk"],
    adversaries: ["us", "israel", "saudi"],
  },
  {
    id: "israel",
    name: "State of Israel",
    shortName: "Israel",
    objectives: [
      "Security from existential threats",
      "Normalization with Arab states",
      "Prevent Iranian nuclear weapon",
      "Maintain qualitative military edge",
    ],
    capabilities: [
      "Advanced military technology",
      "Intelligence superiority (Mossad, Unit 8200)",
      "Undeclared nuclear deterrent",
      "Iron Dome and Arrow defense systems",
    ],
    constraints: [
      "Small strategic depth",
      "Multi-front threat environment",
      "International legitimacy pressure",
      "Reserve force dependency",
    ],
    redLines: [
      "Iranian nuclear weapon",
      "Coordinated multi-front attack",
      "WMD use against civilian population",
    ],
    alliances: ["us"],
    adversaries: ["iran"],
  },
  {
    id: "saudi",
    name: "Kingdom of Saudi Arabia",
    shortName: "Saudi",
    objectives: [
      "Vision 2030 economic transformation",
      "Regional leadership",
      "Oil market management",
      "Counter Iranian influence",
    ],
    capabilities: [
      "OPEC+ leadership and swing production",
      "Sovereign wealth (PIF)",
      "Strategic geographic position",
      "Growing defense capability",
    ],
    constraints: [
      "Oil revenue dependency during transition",
      "Yemen conflict costs",
      "Social reform pace management",
      "Water and food security",
    ],
    redLines: [
      "Attack on oil infrastructure",
      "Iranian nuclear weapon",
      "Threat to Mecca/Medina",
    ],
    alliances: ["us"],
    adversaries: ["iran"],
  },
  {
    id: "eu",
    name: "European Union",
    shortName: "EU",
    objectives: [
      "Strategic autonomy",
      "Energy transition",
      "Defense capability building",
      "Economic competitiveness",
    ],
    capabilities: [
      "Regulatory superpower",
      "Combined economic weight",
      "Diplomatic network",
      "Growing defense spending",
    ],
    constraints: [
      "Consensus-based decision making",
      "Energy dependency transition",
      "Divergent member state interests",
      "Demographic challenges",
    ],
    redLines: [
      "Attack on member state territory",
      "Complete energy supply cutoff",
      "Nuclear incident on borders",
    ],
    alliances: ["us"],
    adversaries: ["russia"],
  },
  {
    id: "dprk",
    name: "Democratic People's Republic of Korea",
    shortName: "DPRK",
    objectives: [
      "Regime survival",
      "Nuclear deterrent credibility",
      "Sanctions evasion",
      "Recognition as nuclear state",
    ],
    capabilities: [
      "Nuclear warheads (estimated 40-60)",
      "ICBM capability",
      "Cyber warfare and cryptocurrency theft",
      "Forward-deployed artillery threatening Seoul",
    ],
    constraints: [
      "Economic isolation",
      "Food insecurity",
      "Technology limitations",
      "Dependency on China",
    ],
    redLines: [
      "Regime change attempt",
      "Decapitation strike",
      "Full economic blockade",
    ],
    alliances: ["china", "russia"],
    adversaries: ["us"],
  },
];

// ── Pre-configured Strategic Scenarios ──

export const SCENARIOS: StrategicScenario[] = [
  {
    id: "taiwan-strait",
    title: "Taiwan Strait Crisis",
    description:
      "Escalation scenario around Taiwan. China must decide between military coercion and diplomatic pressure. US must decide between direct defense commitment and strategic ambiguity.",
    actors: ["china", "us"],
    strategies: {
      china: ["Military blockade", "Diplomatic pressure", "Gray zone escalation"],
      us: ["Direct defense commitment", "Strategic ambiguity", "Economic deterrence"],
    },
    payoffMatrix: [
      {
        strategies: { china: "Military blockade", us: "Direct defense commitment" },
        payoffs: { china: -8, us: -6 },
        marketImpact: {
          direction: "bearish",
          magnitude: "high",
          sectors: ["semiconductors", "technology", "shipping", "defense"],
          description: "Global supply chain crisis. Semiconductor shortage. Flight to safety.",
        },
      },
      {
        strategies: { china: "Military blockade", us: "Strategic ambiguity" },
        payoffs: { china: 3, us: -4 },
        marketImpact: {
          direction: "bearish",
          magnitude: "high",
          sectors: ["semiconductors", "technology", "shipping"],
          description: "Major uncertainty. Tech selloff. Defense stocks rally.",
        },
      },
      {
        strategies: { china: "Military blockade", us: "Economic deterrence" },
        payoffs: { china: 1, us: -2 },
        marketImpact: {
          direction: "bearish",
          magnitude: "medium",
          sectors: ["technology", "trade", "finance"],
          description: "Trade war escalation. Decoupling acceleration.",
        },
      },
      {
        strategies: { china: "Diplomatic pressure", us: "Direct defense commitment" },
        payoffs: { china: -2, us: 2 },
        marketImpact: {
          direction: "mixed",
          magnitude: "low",
          sectors: ["defense", "semiconductors"],
          description: "Tensions contained. Defense spending increases. Status quo holds.",
        },
      },
      {
        strategies: { china: "Diplomatic pressure", us: "Strategic ambiguity" },
        payoffs: { china: 2, us: 3 },
        marketImpact: {
          direction: "bullish",
          magnitude: "low",
          sectors: ["technology", "semiconductors"],
          description: "Status quo maintained. Markets stabilize. Risk-on resumes.",
        },
      },
      {
        strategies: { china: "Diplomatic pressure", us: "Economic deterrence" },
        payoffs: { china: 0, us: 1 },
        marketImpact: {
          direction: "mixed",
          magnitude: "low",
          sectors: ["trade", "technology"],
          description: "Mild trade friction. Manageable uncertainty.",
        },
      },
      {
        strategies: { china: "Gray zone escalation", us: "Direct defense commitment" },
        payoffs: { china: -3, us: -1 },
        marketImpact: {
          direction: "bearish",
          magnitude: "medium",
          sectors: ["defense", "shipping", "semiconductors"],
          description: "Prolonged tension. Defense rally. Tech under pressure.",
        },
      },
      {
        strategies: { china: "Gray zone escalation", us: "Strategic ambiguity" },
        payoffs: { china: 4, us: -3 },
        marketImpact: {
          direction: "bearish",
          magnitude: "medium",
          sectors: ["semiconductors", "shipping"],
          description: "Gradual erosion of status quo. Supply chain diversification accelerates.",
        },
      },
      {
        strategies: { china: "Gray zone escalation", us: "Economic deterrence" },
        payoffs: { china: 2, us: -1 },
        marketImpact: {
          direction: "mixed",
          magnitude: "medium",
          sectors: ["technology", "trade"],
          description: "Ongoing friction. Decoupling narrative strengthens.",
        },
      },
    ],
    context: "Ongoing tensions with periodic escalation around Taiwan transits and military exercises",
    marketSectors: ["semiconductors", "technology", "defense", "shipping"],
    timeHorizon: "medium_term",
  },
  {
    id: "iran-nuclear",
    title: "Iran Nuclear Breakout",
    description:
      "Iran approaches nuclear weapon threshold. Israel must decide between preemptive strike and deterrence. Iran chooses between breakout and restraint.",
    actors: ["iran", "israel"],
    strategies: {
      iran: ["Nuclear breakout", "Threshold maintenance", "Negotiate"],
      israel: ["Preemptive strike", "Deterrence", "Diplomatic pressure"],
    },
    payoffMatrix: [
      {
        strategies: { iran: "Nuclear breakout", israel: "Preemptive strike" },
        payoffs: { iran: -6, israel: -3 },
        marketImpact: {
          direction: "bearish",
          magnitude: "high",
          sectors: ["energy", "defense", "airlines"],
          description: "Oil spike. Strait of Hormuz risk. Global risk-off.",
        },
      },
      {
        strategies: { iran: "Nuclear breakout", israel: "Deterrence" },
        payoffs: { iran: 5, israel: -7 },
        marketImpact: {
          direction: "bearish",
          magnitude: "high",
          sectors: ["energy", "defense"],
          description: "Nuclear proliferation cascade. Permanent risk premium in oil.",
        },
      },
      {
        strategies: { iran: "Nuclear breakout", israel: "Diplomatic pressure" },
        payoffs: { iran: 6, israel: -5 },
        marketImpact: {
          direction: "bearish",
          magnitude: "medium",
          sectors: ["energy", "defense"],
          description: "Fait accompli. Regional arms race. Energy risk premium.",
        },
      },
      {
        strategies: { iran: "Threshold maintenance", israel: "Preemptive strike" },
        payoffs: { iran: -4, israel: -5 },
        marketImpact: {
          direction: "bearish",
          magnitude: "high",
          sectors: ["energy", "defense", "airlines"],
          description: "Unjustified strike perception. Oil spike. Regional instability.",
        },
      },
      {
        strategies: { iran: "Threshold maintenance", israel: "Deterrence" },
        payoffs: { iran: 3, israel: 1 },
        marketImpact: {
          direction: "mixed",
          magnitude: "low",
          sectors: ["energy", "defense"],
          description: "Tense stability. Elevated but manageable risk premium.",
        },
      },
      {
        strategies: { iran: "Threshold maintenance", israel: "Diplomatic pressure" },
        payoffs: { iran: 2, israel: 2 },
        marketImpact: {
          direction: "bullish",
          magnitude: "low",
          sectors: ["energy"],
          description: "De-escalation path. Oil risk premium eases.",
        },
      },
      {
        strategies: { iran: "Negotiate", israel: "Preemptive strike" },
        payoffs: { iran: -3, israel: -8 },
        marketImpact: {
          direction: "bearish",
          magnitude: "high",
          sectors: ["energy", "defense"],
          description: "International backlash. Oil spike. Diplomatic isolation.",
        },
      },
      {
        strategies: { iran: "Negotiate", israel: "Deterrence" },
        payoffs: { iran: 1, israel: 4 },
        marketImpact: {
          direction: "bullish",
          magnitude: "medium",
          sectors: ["energy"],
          description: "De-escalation. Oil prices decline. Risk-on rotation.",
        },
      },
      {
        strategies: { iran: "Negotiate", israel: "Diplomatic pressure" },
        payoffs: { iran: 3, israel: 5 },
        marketImpact: {
          direction: "bullish",
          magnitude: "medium",
          sectors: ["energy", "trade"],
          description: "Deal pathway opens. Sanctions relief anticipated. Oil eases.",
        },
      },
    ],
    context: "Iran enrichment levels approaching weapons-grade thresholds",
    marketSectors: ["energy", "defense", "airlines"],
    timeHorizon: "short_term",
  },
  {
    id: "opec-production",
    title: "OPEC+ Production Decision",
    description:
      "Saudi Arabia leads OPEC+ production decisions. Must balance revenue needs vs market share vs US pressure.",
    actors: ["saudi", "us"],
    strategies: {
      saudi: ["Cut production", "Maintain quota", "Increase production"],
      us: ["Diplomatic pressure for more supply", "Accept market price", "Release SPR"],
    },
    payoffMatrix: [
      {
        strategies: { saudi: "Cut production", us: "Diplomatic pressure for more supply" },
        payoffs: { saudi: 2, us: -3 },
        marketImpact: {
          direction: "bearish",
          magnitude: "medium",
          sectors: ["energy", "airlines", "transportation"],
          description: "Oil rises. Consumer spending pressure. Inflation risk.",
        },
      },
      {
        strategies: { saudi: "Cut production", us: "Accept market price" },
        payoffs: { saudi: 5, us: -1 },
        marketImpact: {
          direction: "bearish",
          magnitude: "medium",
          sectors: ["energy"],
          description: "Higher oil. Energy stocks rally. Consumer discretionary weakens.",
        },
      },
      {
        strategies: { saudi: "Cut production", us: "Release SPR" },
        payoffs: { saudi: 1, us: 0 },
        marketImpact: {
          direction: "mixed",
          magnitude: "low",
          sectors: ["energy"],
          description: "Offsetting forces. Oil range-bound. Temporary relief.",
        },
      },
      {
        strategies: { saudi: "Maintain quota", us: "Diplomatic pressure for more supply" },
        payoffs: { saudi: 1, us: 1 },
        marketImpact: {
          direction: "mixed",
          magnitude: "low",
          sectors: ["energy"],
          description: "Status quo. Oil stable. Markets neutral on energy.",
        },
      },
      {
        strategies: { saudi: "Maintain quota", us: "Accept market price" },
        payoffs: { saudi: 3, us: 2 },
        marketImpact: {
          direction: "bullish",
          magnitude: "low",
          sectors: ["energy"],
          description: "Stable oil market. Predictable environment for planning.",
        },
      },
      {
        strategies: { saudi: "Maintain quota", us: "Release SPR" },
        payoffs: { saudi: -1, us: 1 },
        marketImpact: {
          direction: "bearish",
          magnitude: "low",
          sectors: ["energy"],
          description: "Slight oil decline. Energy stocks under mild pressure.",
        },
      },
      {
        strategies: { saudi: "Increase production", us: "Diplomatic pressure for more supply" },
        payoffs: { saudi: -2, us: 5 },
        marketImpact: {
          direction: "bullish",
          magnitude: "medium",
          sectors: ["airlines", "transportation", "consumer"],
          description: "Oil drops. Consumer boost. Energy stocks decline.",
        },
      },
      {
        strategies: { saudi: "Increase production", us: "Accept market price" },
        payoffs: { saudi: -3, us: 4 },
        marketImpact: {
          direction: "bullish",
          magnitude: "medium",
          sectors: ["airlines", "consumer"],
          description: "Lower oil. Broad market positive. Energy sector weakness.",
        },
      },
      {
        strategies: { saudi: "Increase production", us: "Release SPR" },
        payoffs: { saudi: -5, us: 3 },
        marketImpact: {
          direction: "bullish",
          magnitude: "high",
          sectors: ["energy", "airlines", "consumer"],
          description: "Oil crashes. Energy sector selloff. Consumer and transport rally.",
        },
      },
    ],
    context: "Ongoing OPEC+ production management amid global demand uncertainty",
    marketSectors: ["energy", "airlines", "transportation", "consumer"],
    timeHorizon: "short_term",
  },
];

export function getActor(id: string): GeopoliticalActor | undefined {
  return ACTORS.find((a) => a.id === id);
}

export function getScenario(id: string): StrategicScenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
