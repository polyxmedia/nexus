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
  {
    id: "russia-ukraine-endgame",
    title: "Russia-Ukraine War Endgame",
    description:
      "Protracted conflict entering potential negotiation or escalation phase. Russia weighs continued attrition vs escalation vs negotiation. US/EU weigh sustained support vs negotiated settlement pressure.",
    actors: ["russia", "us"],
    strategies: {
      russia: ["Escalate (tactical nuclear threat)", "Sustain attrition", "Negotiate from strength"],
      us: ["Increase military aid", "Push negotiated settlement", "Maintain current support"],
    },
    payoffMatrix: [
      { strategies: { russia: "Escalate (tactical nuclear threat)", us: "Increase military aid" }, payoffs: { russia: -9, us: -7 }, marketImpact: { direction: "bearish", magnitude: "high", sectors: ["energy", "defense", "finance", "agriculture"], description: "Nuclear escalation risk. Global risk-off. Energy spike. Defense rally." } },
      { strategies: { russia: "Escalate (tactical nuclear threat)", us: "Push negotiated settlement" }, payoffs: { russia: 2, us: -5 }, marketImpact: { direction: "bearish", magnitude: "high", sectors: ["energy", "defense"], description: "Escalation succeeds in forcing talks. Nuclear precedent set. Permanent risk premium." } },
      { strategies: { russia: "Escalate (tactical nuclear threat)", us: "Maintain current support" }, payoffs: { russia: -4, us: -6 }, marketImpact: { direction: "bearish", magnitude: "high", sectors: ["energy", "finance"], description: "Crisis without clear resolution. Maximum uncertainty." } },
      { strategies: { russia: "Sustain attrition", us: "Increase military aid" }, payoffs: { russia: -3, us: -2 }, marketImpact: { direction: "mixed", magnitude: "medium", sectors: ["defense", "energy", "agriculture"], description: "Prolonged conflict. Defense spending up. Energy elevated." } },
      { strategies: { russia: "Sustain attrition", us: "Push negotiated settlement" }, payoffs: { russia: 1, us: 1 }, marketImpact: { direction: "mixed", magnitude: "low", sectors: ["energy"], description: "Stalemate with diplomatic noise. Markets adapt to new normal." } },
      { strategies: { russia: "Sustain attrition", us: "Maintain current support" }, payoffs: { russia: -1, us: 0 }, marketImpact: { direction: "mixed", magnitude: "low", sectors: ["defense", "energy"], description: "Status quo continuation. Manageable for markets." } },
      { strategies: { russia: "Negotiate from strength", us: "Increase military aid" }, payoffs: { russia: -2, us: 3 }, marketImpact: { direction: "bullish", magnitude: "medium", sectors: ["energy", "agriculture", "finance"], description: "Negotiation from strong Western position. Energy risk premium eases." } },
      { strategies: { russia: "Negotiate from strength", us: "Push negotiated settlement" }, payoffs: { russia: 4, us: 3 }, marketImpact: { direction: "bullish", magnitude: "high", sectors: ["energy", "agriculture", "finance", "construction"], description: "Ceasefire pathway. Major risk-on rally. Reconstruction narrative." } },
      { strategies: { russia: "Negotiate from strength", us: "Maintain current support" }, payoffs: { russia: 2, us: 1 }, marketImpact: { direction: "bullish", magnitude: "low", sectors: ["energy"], description: "Gradual de-escalation. Slow normalization." } },
    ],
    context: "War in third year. Russian territorial gains in east. Western fatigue emerging. Nuclear rhetoric periodic.",
    marketSectors: ["energy", "defense", "agriculture", "finance"],
    timeHorizon: "medium_term",
  },
  {
    id: "us-china-trade-war",
    title: "US-China Trade War Escalation",
    description:
      "Tariff escalation and technology decoupling. US weighs between maximum pressure and selective engagement. China chooses between retaliation, domestic substitution, and concession.",
    actors: ["china", "us"],
    strategies: {
      china: ["Full retaliation (tariffs + rare earth controls)", "Targeted retaliation", "Negotiate concessions"],
      us: ["Maximum tariffs (60%+)", "Selective sector tariffs", "Negotiate deal"],
    },
    payoffMatrix: [
      { strategies: { china: "Full retaliation (tariffs + rare earth controls)", us: "Maximum tariffs (60%+)" }, payoffs: { china: -6, us: -5 }, marketImpact: { direction: "bearish", magnitude: "high", sectors: ["technology", "consumer", "industrials", "automotive"], description: "Full trade war. Supply chain crisis. Stagflation risk. Both economies contract." } },
      { strategies: { china: "Full retaliation (tariffs + rare earth controls)", us: "Selective sector tariffs" }, payoffs: { china: -2, us: -1 }, marketImpact: { direction: "bearish", magnitude: "medium", sectors: ["technology", "automotive"], description: "Targeted escalation. Rare earth controls hit defense and tech sectors." } },
      { strategies: { china: "Full retaliation (tariffs + rare earth controls)", us: "Negotiate deal" }, payoffs: { china: 3, us: -3 }, marketImpact: { direction: "mixed", magnitude: "medium", sectors: ["trade", "technology"], description: "China retaliation forces US to deal table. Seen as US weakness." } },
      { strategies: { china: "Targeted retaliation", us: "Maximum tariffs (60%+)" }, payoffs: { china: -3, us: 1 }, marketImpact: { direction: "bearish", magnitude: "medium", sectors: ["consumer", "retail", "agriculture"], description: "China absorbs pain. US consumer prices rise. Agriculture exports hit." } },
      { strategies: { china: "Targeted retaliation", us: "Selective sector tariffs" }, payoffs: { china: 0, us: 2 }, marketImpact: { direction: "mixed", magnitude: "low", sectors: ["technology", "trade"], description: "Manageable friction. Markets adapt. Sector rotation." } },
      { strategies: { china: "Targeted retaliation", us: "Negotiate deal" }, payoffs: { china: 2, us: 3 }, marketImpact: { direction: "bullish", magnitude: "medium", sectors: ["technology", "trade", "consumer"], description: "Deal framework emerges. Risk-on rally. Trade stocks surge." } },
      { strategies: { china: "Negotiate concessions", us: "Maximum tariffs (60%+)" }, payoffs: { china: -5, us: 5 }, marketImpact: { direction: "bullish", magnitude: "medium", sectors: ["industrials", "consumer"], description: "US leverage maximized. Reshoring accelerates. Consumer prices still elevated." } },
      { strategies: { china: "Negotiate concessions", us: "Selective sector tariffs" }, payoffs: { china: -1, us: 4 }, marketImpact: { direction: "bullish", magnitude: "medium", sectors: ["technology", "trade"], description: "Structured decoupling. Market clarity improves." } },
      { strategies: { china: "Negotiate concessions", us: "Negotiate deal" }, payoffs: { china: 3, us: 4 }, marketImpact: { direction: "bullish", magnitude: "high", sectors: ["technology", "trade", "consumer", "finance"], description: "Comprehensive deal. Major risk-on rotation. Global growth narrative." } },
    ],
    context: "US tariffs on China 10-25%. Semiconductor export controls. China retaliating on agriculture and rare earths.",
    marketSectors: ["technology", "consumer", "industrials", "agriculture"],
    timeHorizon: "short_term",
  },
  {
    id: "hormuz-closure",
    title: "Strait of Hormuz Crisis",
    description:
      "Iran threatens or partially closes the Strait of Hormuz in response to military strikes or maximum pressure sanctions. 20% of global oil flows through this chokepoint.",
    actors: ["iran", "us"],
    strategies: {
      iran: ["Full strait closure", "Harassment and mining", "Diplomatic brinkmanship"],
      us: ["Naval escort operations", "Retaliatory strikes on Iran", "Negotiate de-escalation"],
    },
    payoffMatrix: [
      { strategies: { iran: "Full strait closure", us: "Naval escort operations" }, payoffs: { iran: -4, us: -3 }, marketImpact: { direction: "bearish", magnitude: "high", sectors: ["energy", "shipping", "airlines", "consumer"], description: "Oil spikes to $150+. Global recession risk. Shipping rerouted. Insurance costs explode." } },
      { strategies: { iran: "Full strait closure", us: "Retaliatory strikes on Iran" }, payoffs: { iran: -8, us: -5 }, marketImpact: { direction: "bearish", magnitude: "high", sectors: ["energy", "defense", "finance"], description: "Full Middle East war. Oil supply crisis. Global risk-off. Gold/defense surge." } },
      { strategies: { iran: "Full strait closure", us: "Negotiate de-escalation" }, payoffs: { iran: 4, us: -6 }, marketImpact: { direction: "bearish", magnitude: "high", sectors: ["energy"], description: "Iran extracts concessions under duress. Oil remains elevated." } },
      { strategies: { iran: "Harassment and mining", us: "Naval escort operations" }, payoffs: { iran: 1, us: -1 }, marketImpact: { direction: "bearish", magnitude: "medium", sectors: ["energy", "shipping"], description: "Elevated insurance costs. Oil premium. Tanker war dynamics." } },
      { strategies: { iran: "Harassment and mining", us: "Retaliatory strikes on Iran" }, payoffs: { iran: -5, us: -2 }, marketImpact: { direction: "bearish", magnitude: "high", sectors: ["energy", "defense"], description: "Escalation spiral. Oil spike. Hormuz partially disrupted." } },
      { strategies: { iran: "Harassment and mining", us: "Negotiate de-escalation" }, payoffs: { iran: 3, us: 0 }, marketImpact: { direction: "mixed", magnitude: "medium", sectors: ["energy"], description: "Iran gains leverage. Sanctions relief possible. Oil moderates." } },
      { strategies: { iran: "Diplomatic brinkmanship", us: "Naval escort operations" }, payoffs: { iran: -1, us: 2 }, marketImpact: { direction: "mixed", magnitude: "low", sectors: ["energy", "defense"], description: "Show of force. Deterrence holds. Oil premium limited." } },
      { strategies: { iran: "Diplomatic brinkmanship", us: "Retaliatory strikes on Iran" }, payoffs: { iran: -3, us: -4 }, marketImpact: { direction: "bearish", magnitude: "medium", sectors: ["energy"], description: "Disproportionate response. International criticism. Oil spikes." } },
      { strategies: { iran: "Diplomatic brinkmanship", us: "Negotiate de-escalation" }, payoffs: { iran: 4, us: 3 }, marketImpact: { direction: "bullish", magnitude: "medium", sectors: ["energy", "shipping"], description: "Diplomatic resolution. Oil risk premium collapses. Shipping normalizes." } },
    ],
    context: "Hormuz carries 20% of global oil. Iran has demonstrated anti-ship missile and mine capability.",
    marketSectors: ["energy", "shipping", "defense", "airlines"],
    timeHorizon: "short_term",
  },
  {
    id: "india-pakistan-kashmir",
    title: "India-Pakistan Kashmir Escalation",
    description:
      "Terrorist attack or border incident triggers escalation between two nuclear powers. Both sides weigh military response against nuclear deterrence constraints.",
    actors: ["us", "china"],
    strategies: {
      // Modeled as India (us slot) vs Pakistan (china slot) for payoff simplicity
      us: ["Surgical strikes", "Full mobilization", "Diplomatic de-escalation"],
      china: ["Retaliatory strikes", "Nuclear signaling", "Accept international mediation"],
    },
    payoffMatrix: [
      { strategies: { us: "Surgical strikes", china: "Retaliatory strikes" }, payoffs: { us: -3, china: -4 }, marketImpact: { direction: "bearish", magnitude: "high", sectors: ["technology", "defense", "finance"], description: "Nuclear powers exchanging strikes. Global risk-off. INR/PKR crash." } },
      { strategies: { us: "Surgical strikes", china: "Nuclear signaling" }, payoffs: { us: -6, china: -8 }, marketImpact: { direction: "bearish", magnitude: "high", sectors: ["finance", "technology", "energy"], description: "Nuclear threshold approached. Maximum global risk-off." } },
      { strategies: { us: "Surgical strikes", china: "Accept international mediation" }, payoffs: { us: 4, china: -2 }, marketImpact: { direction: "mixed", magnitude: "medium", sectors: ["defense", "technology"], description: "India achieves objectives. Mediated de-escalation." } },
      { strategies: { us: "Full mobilization", china: "Retaliatory strikes" }, payoffs: { us: -5, china: -6 }, marketImpact: { direction: "bearish", magnitude: "high", sectors: ["finance", "technology", "energy"], description: "Full-scale conventional war between nuclear powers." } },
      { strategies: { us: "Full mobilization", china: "Nuclear signaling" }, payoffs: { us: -8, china: -9 }, marketImpact: { direction: "bearish", magnitude: "high", sectors: ["finance", "technology", "energy", "consumer"], description: "Nuclear war risk. Global financial system stress." } },
      { strategies: { us: "Full mobilization", china: "Accept international mediation" }, payoffs: { us: 2, china: -3 }, marketImpact: { direction: "mixed", magnitude: "medium", sectors: ["defense"], description: "Pakistan backs down. India military objectives achieved." } },
      { strategies: { us: "Diplomatic de-escalation", china: "Retaliatory strikes" }, payoffs: { us: -4, china: 1 }, marketImpact: { direction: "bearish", magnitude: "medium", sectors: ["finance", "technology"], description: "India perceived as weak. Pakistan emboldens. Regional instability." } },
      { strategies: { us: "Diplomatic de-escalation", china: "Nuclear signaling" }, payoffs: { us: -2, china: -1 }, marketImpact: { direction: "bearish", magnitude: "medium", sectors: ["finance"], description: "Diplomatic channels open but nuclear rhetoric damages confidence." } },
      { strategies: { us: "Diplomatic de-escalation", china: "Accept international mediation" }, payoffs: { us: 3, china: 2 }, marketImpact: { direction: "bullish", magnitude: "medium", sectors: ["finance", "technology"], description: "Mutual de-escalation. Markets recover. Risk premium eases." } },
    ],
    context: "India-Pakistan have fought 4 wars. Both nuclear-armed since 1998. Kashmir LOC tensions ongoing.",
    marketSectors: ["technology", "defense", "finance"],
    timeHorizon: "short_term",
  },
  {
    id: "red-sea-shipping",
    title: "Red Sea Shipping Crisis",
    description:
      "Houthi attacks disrupt Red Sea/Suez shipping. Global supply chains face rerouting around Cape of Good Hope. US/UK weigh military response.",
    actors: ["iran", "us"],
    strategies: {
      iran: ["Maintain Houthi support", "Escalate to broader blockade", "Pressure Houthis to stop"],
      us: ["Sustained strikes on Houthis", "Naval convoy escorts", "Diplomatic resolution via Iran"],
    },
    payoffMatrix: [
      { strategies: { iran: "Maintain Houthi support", us: "Sustained strikes on Houthis" }, payoffs: { iran: 2, us: -2 }, marketImpact: { direction: "bearish", magnitude: "medium", sectors: ["shipping", "consumer", "retail"], description: "Protracted disruption. Shipping costs elevated 200-300%. Supply chain delays." } },
      { strategies: { iran: "Maintain Houthi support", us: "Naval convoy escorts" }, payoffs: { iran: 1, us: -1 }, marketImpact: { direction: "mixed", magnitude: "medium", sectors: ["shipping", "defense"], description: "Partial normalization. Defense costs high. Insurance premiums elevated." } },
      { strategies: { iran: "Maintain Houthi support", us: "Diplomatic resolution via Iran" }, payoffs: { iran: 5, us: -1 }, marketImpact: { direction: "mixed", magnitude: "low", sectors: ["shipping"], description: "Iran gains diplomatic leverage. Potential sanctions concessions." } },
      { strategies: { iran: "Escalate to broader blockade", us: "Sustained strikes on Houthis" }, payoffs: { iran: -3, us: -4 }, marketImpact: { direction: "bearish", magnitude: "high", sectors: ["shipping", "energy", "consumer"], description: "Suez effectively closed. Global trade disruption. Container rates explode." } },
      { strategies: { iran: "Escalate to broader blockade", us: "Naval convoy escorts" }, payoffs: { iran: -1, us: -3 }, marketImpact: { direction: "bearish", magnitude: "high", sectors: ["shipping", "energy"], description: "Naval confrontation risk. Insurance markets seize." } },
      { strategies: { iran: "Escalate to broader blockade", us: "Diplomatic resolution via Iran" }, payoffs: { iran: 4, us: -5 }, marketImpact: { direction: "bearish", magnitude: "medium", sectors: ["shipping"], description: "Iran maximizes leverage through proxy escalation." } },
      { strategies: { iran: "Pressure Houthis to stop", us: "Sustained strikes on Houthis" }, payoffs: { iran: -2, us: 3 }, marketImpact: { direction: "bullish", magnitude: "medium", sectors: ["shipping", "consumer"], description: "Combined military and diplomatic pressure works. Shipping normalizes." } },
      { strategies: { iran: "Pressure Houthis to stop", us: "Naval convoy escorts" }, payoffs: { iran: 0, us: 3 }, marketImpact: { direction: "bullish", magnitude: "medium", sectors: ["shipping"], description: "De-escalation path. Convoy protection with reduced attacks." } },
      { strategies: { iran: "Pressure Houthis to stop", us: "Diplomatic resolution via Iran" }, payoffs: { iran: 3, us: 5 }, marketImpact: { direction: "bullish", magnitude: "high", sectors: ["shipping", "consumer", "retail"], description: "Full resolution. Shipping costs normalize. Consumer relief." } },
    ],
    context: "Houthi Red Sea attacks ongoing since November 2023. 15% of global trade passes through Suez.",
    marketSectors: ["shipping", "consumer", "energy", "retail"],
    timeHorizon: "short_term",
  },
  {
    id: "eu-energy-crisis",
    title: "European Energy Security",
    description:
      "EU manages energy transition while facing supply vulnerabilities. Russia retains residual gas leverage. LNG competition with Asia intensifies.",
    actors: ["eu", "russia"],
    strategies: {
      eu: ["Accelerate renewables", "Diversify LNG imports", "Re-engage Russia gas"],
      russia: ["Weaponize remaining gas flows", "Offer discounted supply", "Focus on Asian markets"],
    },
    payoffMatrix: [
      { strategies: { eu: "Accelerate renewables", russia: "Weaponize remaining gas flows" }, payoffs: { eu: -1, russia: -3 }, marketImpact: { direction: "mixed", magnitude: "medium", sectors: ["energy", "utilities", "industrials"], description: "Short-term pain, long-term EU independence. Gas spike. Renewables investment surge." } },
      { strategies: { eu: "Accelerate renewables", russia: "Offer discounted supply" }, payoffs: { eu: 3, russia: -2 }, marketImpact: { direction: "bullish", magnitude: "low", sectors: ["utilities", "technology"], description: "EU gets cheap transition bridge. Russia loses long-term customer." } },
      { strategies: { eu: "Accelerate renewables", russia: "Focus on Asian markets" }, payoffs: { eu: 2, russia: 1 }, marketImpact: { direction: "bullish", magnitude: "low", sectors: ["utilities"], description: "Mutual decoupling. Both find alternatives. Orderly transition." } },
      { strategies: { eu: "Diversify LNG imports", russia: "Weaponize remaining gas flows" }, payoffs: { eu: 0, russia: -1 }, marketImpact: { direction: "mixed", magnitude: "medium", sectors: ["energy", "shipping"], description: "LNG competition with Asia. Gas prices volatile. Shipping demand for LNG tankers." } },
      { strategies: { eu: "Diversify LNG imports", russia: "Offer discounted supply" }, payoffs: { eu: 2, russia: 0 }, marketImpact: { direction: "mixed", magnitude: "low", sectors: ["energy"], description: "Buyer's market for EU. Gas prices moderate." } },
      { strategies: { eu: "Diversify LNG imports", russia: "Focus on Asian markets" }, payoffs: { eu: 1, russia: 2 }, marketImpact: { direction: "mixed", magnitude: "low", sectors: ["energy"], description: "Global gas market rebalances. Prices stabilize." } },
      { strategies: { eu: "Re-engage Russia gas", russia: "Weaponize remaining gas flows" }, payoffs: { eu: -5, russia: 5 }, marketImpact: { direction: "bearish", magnitude: "medium", sectors: ["energy", "utilities"], description: "EU strategic vulnerability restored. Russia regains leverage." } },
      { strategies: { eu: "Re-engage Russia gas", russia: "Offer discounted supply" }, payoffs: { eu: 1, russia: 4 }, marketImpact: { direction: "mixed", magnitude: "low", sectors: ["energy"], description: "Cheap gas for EU but strategic dependency returns." } },
      { strategies: { eu: "Re-engage Russia gas", russia: "Focus on Asian markets" }, payoffs: { eu: -2, russia: 2 }, marketImpact: { direction: "mixed", magnitude: "low", sectors: ["energy"], description: "EU tries to re-engage but Russia already pivoted. Mixed signals." } },
    ],
    context: "EU has reduced Russian gas from 40% to ~15%. LNG imports surged. Energy prices 2-3x pre-war levels.",
    marketSectors: ["energy", "utilities", "industrials", "shipping"],
    timeHorizon: "medium_term",
  },
  {
    id: "dprk-provocation",
    title: "North Korea Provocation Cycle",
    description:
      "DPRK tests weapons or provocations to extract concessions. US/ROK must calibrate response between deterrence and avoiding escalation.",
    actors: ["dprk", "us"],
    strategies: {
      dprk: ["Nuclear test", "ICBM launch", "Diplomatic opening"],
      us: ["Enhanced deterrence deployment", "Sanctions escalation", "Engage diplomatically"],
    },
    payoffMatrix: [
      { strategies: { dprk: "Nuclear test", us: "Enhanced deterrence deployment" }, payoffs: { dprk: -2, us: -1 }, marketImpact: { direction: "bearish", magnitude: "medium", sectors: ["defense", "technology"], description: "Escalation cycle. KOSPI selloff. Defense rally. JPY safe haven bid." } },
      { strategies: { dprk: "Nuclear test", us: "Sanctions escalation" }, payoffs: { dprk: -3, us: 0 }, marketImpact: { direction: "bearish", magnitude: "low", sectors: ["defense"], description: "Familiar pattern. Markets habituated to DPRK tests. Brief risk-off." } },
      { strategies: { dprk: "Nuclear test", us: "Engage diplomatically" }, payoffs: { dprk: 4, us: -4 }, marketImpact: { direction: "mixed", magnitude: "low", sectors: ["defense"], description: "DPRK rewarded for provocation. Precedent concerns." } },
      { strategies: { dprk: "ICBM launch", us: "Enhanced deterrence deployment" }, payoffs: { dprk: 0, us: -1 }, marketImpact: { direction: "bearish", magnitude: "medium", sectors: ["defense", "technology"], description: "Missile defense focus. Regional security spending up." } },
      { strategies: { dprk: "ICBM launch", us: "Sanctions escalation" }, payoffs: { dprk: -1, us: 1 }, marketImpact: { direction: "mixed", magnitude: "low", sectors: ["defense"], description: "Standard response. Markets barely react." } },
      { strategies: { dprk: "ICBM launch", us: "Engage diplomatically" }, payoffs: { dprk: 3, us: -2 }, marketImpact: { direction: "mixed", magnitude: "low", sectors: [], description: "Summit diplomacy resumes. Markets neutral." } },
      { strategies: { dprk: "Diplomatic opening", us: "Enhanced deterrence deployment" }, payoffs: { dprk: -2, us: 2 }, marketImpact: { direction: "mixed", magnitude: "low", sectors: ["defense"], description: "Mixed signals. US maintains pressure while DPRK signals." } },
      { strategies: { dprk: "Diplomatic opening", us: "Sanctions escalation" }, payoffs: { dprk: -1, us: -1 }, marketImpact: { direction: "mixed", magnitude: "low", sectors: [], description: "Missed diplomatic opportunity. Status quo." } },
      { strategies: { dprk: "Diplomatic opening", us: "Engage diplomatically" }, payoffs: { dprk: 3, us: 4 }, marketImpact: { direction: "bullish", magnitude: "low", sectors: ["defense"], description: "De-escalation path. KOSPI rallies. Defense stocks dip." } },
    ],
    context: "DPRK has tested 6 nuclear devices and multiple ICBMs. Kim-Trump summits (2018-2019) produced no lasting deal.",
    marketSectors: ["defense", "technology"],
    timeHorizon: "short_term",
  },
];

export function getActor(id: string): GeopoliticalActor | undefined {
  return ACTORS.find((a) => a.id === id);
}

export function getScenario(id: string): StrategicScenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
