/**
 * Actor-Belief Bayesian Typing for Calendar Layer
 * ═══════════════════════════════════════════════════
 * Psychohistorical Population Modelling
 *
 * This is the closest NEXUS module to Seldon's psychohistory. Psychohistory
 * worked because individual behaviour is unpredictable but population
 * behaviour follows statistical distributions. This module models the same
 * principle: individual leaders may surprise us, but actor-groups (state
 * apparatus, military doctrine, religious institutions) follow documented
 * behavioural patterns that shift predictably around calendar events.
 *
 * The calendar isn't the signal. The actor's documented pattern of behaviour
 * around the calendar is the signal.
 *
 * Research basis: Tahir 2025 - computational geopolitics with dynamic graph nodes.
 *
 * Instead of "Purim = +1 convergence bonus", the proper model is:
 * "Ben Gvir's prior(provocative action) = 0.3. On Tisha B'Av, historical
 * data shows it rises to 0.7."
 *
 * Asimov's key constraint applies here too: the population being modelled
 * must not be aware of the predictions, or their behaviour changes. NEXUS
 * respects this by modelling state-level actor-groups, not individuals,
 * and by never publishing probability estimates that could influence the
 * actors being modelled.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Behavioral mode distribution for a geopolitical actor. */
export interface TypeDistribution {
  /** P(actor is in cooperative mode) */
  cooperative: number;
  /** P(actor is in aggressive/hawkish mode) */
  hawkish: number;
  /** P(actor behavior is random/unpredictable) */
  unpredictable: number;
}

/** Base weekly action probabilities for an actor. */
export interface ActionProbabilities {
  military_action: number;
  provocative_statement: number;
  diplomatic_initiative: number;
  economic_measure: number;
  territorial_assertion: number;
}

/**
 * Profile for a geopolitical actor or actor-group, encoding their baseline
 * behavioral type distribution and action probabilities in any given week.
 */
export interface ActorProfile {
  id: string;
  name: string;
  country: string;
  /** Probability of being in each behavioral mode */
  typeDistribution: TypeDistribution;
  /** Base action probabilities (any given week) */
  baseActionProbabilities: ActionProbabilities;
}

export type CalendarSystem = "hebrew" | "islamic" | "chinese" | "gregorian";

/**
 * A documented calendar-conditioned behavioral modifier.
 * Each entry represents a historically observed shift in an actor's action
 * probability during a specific calendar event.
 */
export interface CalendarBehaviorModifier {
  actorId: string;
  /** Canonical event key, e.g. "tisha_bav", "ramadan" */
  calendarEvent: string;
  calendarSystem: CalendarSystem;
  /** Which action probability is modified */
  actionType: keyof ActionProbabilities;
  /** Multiplicative factor applied to the base probability */
  posteriorMultiplier: number;
  /** Documented evidence for this modifier */
  historicalBasis: string;
  /** Number of historical instances supporting this modifier */
  sampleSize: number;
  /** Reliability of this behavioral pattern (0-1) */
  confidence: number;
}

/**
 * A single actionable insight produced by the Bayesian update, suitable
 * for consumption by the signal engine or the chat analyst.
 */
export interface ActorInsight {
  actor: string;
  actionType: string;
  baseProbability: number;
  adjustedProbability: number;
  calendarTrigger: string;
  historicalBasis: string;
  confidence: number;
}

/** Return type for the per-actor Bayesian update. */
export interface ActorUpdateResult {
  actorId: string;
  updatedProbabilities: Record<string, number>;
  modifiersApplied: CalendarBehaviorModifier[];
  narrativeSummary: string;
}

// ---------------------------------------------------------------------------
// Actor Profiles
// ---------------------------------------------------------------------------

export const ACTOR_PROFILES: ActorProfile[] = [
  {
    id: "israel_far_right",
    name: "Israeli Far-Right Coalition",
    country: "Israel",
    typeDistribution: { cooperative: 0.15, hawkish: 0.70, unpredictable: 0.15 },
    baseActionProbabilities: {
      military_action: 0.08,
      provocative_statement: 0.25,
      diplomatic_initiative: 0.05,
      economic_measure: 0.10,
      territorial_assertion: 0.15,
    },
  },
  {
    id: "iran_irgc",
    name: "Iran IRGC",
    country: "Iran",
    typeDistribution: { cooperative: 0.20, hawkish: 0.55, unpredictable: 0.25 },
    baseActionProbabilities: {
      military_action: 0.04,
      provocative_statement: 0.30,
      diplomatic_initiative: 0.08,
      economic_measure: 0.05,
      territorial_assertion: 0.10,
    },
  },
  {
    id: "china_pla",
    name: "China PLA",
    country: "China",
    typeDistribution: { cooperative: 0.30, hawkish: 0.45, unpredictable: 0.25 },
    baseActionProbabilities: {
      military_action: 0.02,
      provocative_statement: 0.15,
      diplomatic_initiative: 0.12,
      economic_measure: 0.20,
      territorial_assertion: 0.08,
    },
  },
  {
    id: "russia_kremlin",
    name: "Russia Kremlin",
    country: "Russia",
    typeDistribution: { cooperative: 0.15, hawkish: 0.60, unpredictable: 0.25 },
    baseActionProbabilities: {
      military_action: 0.06,
      provocative_statement: 0.35,
      diplomatic_initiative: 0.05,
      economic_measure: 0.08,
      territorial_assertion: 0.12,
    },
  },
  {
    id: "dprk",
    name: "North Korea",
    country: "DPRK",
    typeDistribution: { cooperative: 0.10, hawkish: 0.50, unpredictable: 0.40 },
    baseActionProbabilities: {
      military_action: 0.03,
      provocative_statement: 0.20,
      diplomatic_initiative: 0.03,
      economic_measure: 0.02,
      territorial_assertion: 0.05,
    },
  },
  {
    id: "saudi_mbs",
    name: "Saudi Arabia (MBS)",
    country: "Saudi Arabia",
    typeDistribution: { cooperative: 0.40, hawkish: 0.35, unpredictable: 0.25 },
    baseActionProbabilities: {
      military_action: 0.03,
      provocative_statement: 0.10,
      diplomatic_initiative: 0.15,
      economic_measure: 0.25,
      territorial_assertion: 0.05,
    },
  },
  {
    id: "turkey_erdogan",
    name: "Turkey (Erdogan)",
    country: "Turkey",
    typeDistribution: { cooperative: 0.25, hawkish: 0.45, unpredictable: 0.30 },
    baseActionProbabilities: {
      military_action: 0.05,
      provocative_statement: 0.20,
      diplomatic_initiative: 0.10,
      economic_measure: 0.15,
      territorial_assertion: 0.10,
    },
  },
  {
    id: "us_executive",
    name: "United States Executive",
    country: "United States",
    typeDistribution: { cooperative: 0.35, hawkish: 0.40, unpredictable: 0.25 },
    baseActionProbabilities: {
      military_action: 0.04,
      provocative_statement: 0.15,
      diplomatic_initiative: 0.20,
      economic_measure: 0.25,
      territorial_assertion: 0.03,
    },
  },
  {
    id: "us_congress",
    name: "US Congress",
    country: "United States",
    typeDistribution: { cooperative: 0.30, hawkish: 0.35, unpredictable: 0.35 },
    baseActionProbabilities: {
      military_action: 0.01,
      provocative_statement: 0.25,
      diplomatic_initiative: 0.05,
      economic_measure: 0.30,
      territorial_assertion: 0.01,
    },
  },
  {
    id: "us_fed",
    name: "US Federal Reserve",
    country: "United States",
    typeDistribution: { cooperative: 0.60, hawkish: 0.30, unpredictable: 0.10 },
    baseActionProbabilities: {
      military_action: 0.00,
      provocative_statement: 0.05,
      diplomatic_initiative: 0.10,
      economic_measure: 0.50,
      territorial_assertion: 0.00,
    },
  },
  {
    id: "uk_government",
    name: "United Kingdom Government",
    country: "United Kingdom",
    typeDistribution: { cooperative: 0.45, hawkish: 0.30, unpredictable: 0.25 },
    baseActionProbabilities: {
      military_action: 0.02,
      provocative_statement: 0.10,
      diplomatic_initiative: 0.25,
      economic_measure: 0.20,
      territorial_assertion: 0.03,
    },
  },
  {
    id: "eu_commission",
    name: "European Union / Commission",
    country: "European Union",
    typeDistribution: { cooperative: 0.55, hawkish: 0.20, unpredictable: 0.25 },
    baseActionProbabilities: {
      military_action: 0.01,
      provocative_statement: 0.08,
      diplomatic_initiative: 0.30,
      economic_measure: 0.35,
      territorial_assertion: 0.02,
    },
  },
  {
    id: "eu_ecb",
    name: "European Central Bank",
    country: "European Union",
    typeDistribution: { cooperative: 0.55, hawkish: 0.35, unpredictable: 0.10 },
    baseActionProbabilities: {
      military_action: 0.00,
      provocative_statement: 0.05,
      diplomatic_initiative: 0.10,
      economic_measure: 0.55,
      territorial_assertion: 0.00,
    },
  },
  {
    id: "japan_government",
    name: "Japan Government",
    country: "Japan",
    typeDistribution: { cooperative: 0.55, hawkish: 0.25, unpredictable: 0.20 },
    baseActionProbabilities: {
      military_action: 0.01,
      provocative_statement: 0.05,
      diplomatic_initiative: 0.20,
      economic_measure: 0.30,
      territorial_assertion: 0.05,
    },
  },
  {
    id: "japan_boj",
    name: "Bank of Japan",
    country: "Japan",
    typeDistribution: { cooperative: 0.50, hawkish: 0.25, unpredictable: 0.25 },
    baseActionProbabilities: {
      military_action: 0.00,
      provocative_statement: 0.03,
      diplomatic_initiative: 0.05,
      economic_measure: 0.55,
      territorial_assertion: 0.00,
    },
  },
  {
    id: "south_korea",
    name: "South Korea Government",
    country: "South Korea",
    typeDistribution: { cooperative: 0.50, hawkish: 0.30, unpredictable: 0.20 },
    baseActionProbabilities: {
      military_action: 0.02,
      provocative_statement: 0.08,
      diplomatic_initiative: 0.20,
      economic_measure: 0.25,
      territorial_assertion: 0.05,
    },
  },
  {
    id: "india_modi",
    name: "India (Modi)",
    country: "India",
    typeDistribution: { cooperative: 0.35, hawkish: 0.40, unpredictable: 0.25 },
    baseActionProbabilities: {
      military_action: 0.03,
      provocative_statement: 0.15,
      diplomatic_initiative: 0.15,
      economic_measure: 0.20,
      territorial_assertion: 0.10,
    },
  },
  {
    id: "pakistan_military",
    name: "Pakistan Military Establishment",
    country: "Pakistan",
    typeDistribution: { cooperative: 0.25, hawkish: 0.45, unpredictable: 0.30 },
    baseActionProbabilities: {
      military_action: 0.05,
      provocative_statement: 0.15,
      diplomatic_initiative: 0.10,
      economic_measure: 0.08,
      territorial_assertion: 0.12,
    },
  },
  {
    id: "houthis",
    name: "Houthis (Ansar Allah)",
    country: "Yemen",
    typeDistribution: { cooperative: 0.10, hawkish: 0.65, unpredictable: 0.25 },
    baseActionProbabilities: {
      military_action: 0.12,
      provocative_statement: 0.20,
      diplomatic_initiative: 0.03,
      economic_measure: 0.02,
      territorial_assertion: 0.15,
    },
  },
  {
    id: "hezbollah",
    name: "Hezbollah",
    country: "Lebanon",
    typeDistribution: { cooperative: 0.15, hawkish: 0.60, unpredictable: 0.25 },
    baseActionProbabilities: {
      military_action: 0.06,
      provocative_statement: 0.20,
      diplomatic_initiative: 0.05,
      economic_measure: 0.02,
      territorial_assertion: 0.10,
    },
  },
  {
    id: "nato",
    name: "NATO Alliance",
    country: "International",
    typeDistribution: { cooperative: 0.45, hawkish: 0.35, unpredictable: 0.20 },
    baseActionProbabilities: {
      military_action: 0.02,
      provocative_statement: 0.10,
      diplomatic_initiative: 0.25,
      economic_measure: 0.15,
      territorial_assertion: 0.05,
    },
  },
  {
    id: "hamas",
    name: "Hamas",
    country: "Palestine",
    typeDistribution: { cooperative: 0.10, hawkish: 0.65, unpredictable: 0.25 },
    baseActionProbabilities: {
      military_action: 0.08,
      provocative_statement: 0.25,
      diplomatic_initiative: 0.05,
      economic_measure: 0.02,
      territorial_assertion: 0.15,
    },
  },
  {
    id: "al_qaeda",
    name: "Al-Qaeda (AQ Core + Affiliates)",
    country: "Transnational",
    typeDistribution: { cooperative: 0.05, hawkish: 0.70, unpredictable: 0.25 },
    baseActionProbabilities: {
      military_action: 0.03,
      provocative_statement: 0.15,
      diplomatic_initiative: 0.01,
      economic_measure: 0.01,
      territorial_assertion: 0.05,
    },
  },
  {
    id: "isis",
    name: "Islamic State (ISIS/ISIL/Daesh)",
    country: "Transnational",
    typeDistribution: { cooperative: 0.02, hawkish: 0.75, unpredictable: 0.23 },
    baseActionProbabilities: {
      military_action: 0.06,
      provocative_statement: 0.20,
      diplomatic_initiative: 0.00,
      economic_measure: 0.01,
      territorial_assertion: 0.08,
    },
  },
  {
    id: "wagner_africa_corps",
    name: "Wagner Group / Africa Corps",
    country: "Russia / Africa",
    typeDistribution: { cooperative: 0.10, hawkish: 0.60, unpredictable: 0.30 },
    baseActionProbabilities: {
      military_action: 0.10,
      provocative_statement: 0.05,
      diplomatic_initiative: 0.02,
      economic_measure: 0.15,
      territorial_assertion: 0.10,
    },
  },
  {
    id: "pmc_iran_proxies",
    name: "Iran-Backed PMCs (Iraqi Militias)",
    country: "Iraq / Syria",
    typeDistribution: { cooperative: 0.15, hawkish: 0.60, unpredictable: 0.25 },
    baseActionProbabilities: {
      military_action: 0.08,
      provocative_statement: 0.15,
      diplomatic_initiative: 0.03,
      economic_measure: 0.02,
      territorial_assertion: 0.10,
    },
  },
];

// ---------------------------------------------------------------------------
// Calendar Behavior Modifiers (documented historical patterns)
// ---------------------------------------------------------------------------

export const CALENDAR_BEHAVIOR_MODIFIERS: CalendarBehaviorModifier[] = [
  // ── Israel ────────────────────────────────────────────────────────────
  {
    actorId: "israel_far_right",
    calendarEvent: "tisha_bav",
    calendarSystem: "hebrew",
    actionType: "territorial_assertion",
    posteriorMultiplier: 3.5,
    historicalBasis:
      "Ben Gvir Temple Mount visits on Tisha B'Av documented 2023, 2024, 2025. Provocation probability significantly elevated.",
    sampleSize: 3,
    confidence: 0.75,
  },
  {
    actorId: "israel_far_right",
    calendarEvent: "purim",
    calendarSystem: "hebrew",
    actionType: "military_action",
    posteriorMultiplier: 2.0,
    historicalBasis:
      "Multiple Israeli military operations launched near Purim. Cultural significance of preemptive action narrative (Esther).",
    sampleSize: 5,
    confidence: 0.6,
  },
  {
    actorId: "israel_far_right",
    calendarEvent: "yom_kippur",
    calendarSystem: "hebrew",
    actionType: "military_action",
    posteriorMultiplier: 0.3,
    historicalBasis:
      "Yom Kippur War trauma. Israel unlikely to initiate on this day. Defensive posture elevated instead.",
    sampleSize: 4,
    confidence: 0.8,
  },

  // ── Iran ──────────────────────────────────────────────────────────────
  {
    actorId: "iran_irgc",
    calendarEvent: "ramadan",
    calendarSystem: "islamic",
    actionType: "military_action",
    posteriorMultiplier: 0.5,
    historicalBasis:
      "Iran historically avoids major military action during Ramadan. Sacred month observance reduces offensive operations.",
    sampleSize: 10,
    confidence: 0.7,
  },
  {
    actorId: "iran_irgc",
    calendarEvent: "quds_day",
    calendarSystem: "islamic",
    actionType: "provocative_statement",
    posteriorMultiplier: 4.0,
    historicalBasis:
      "Al-Quds Day (last Friday of Ramadan) consistently produces major anti-Israel rhetoric and proxy mobilization.",
    sampleSize: 15,
    confidence: 0.9,
  },
  {
    actorId: "iran_irgc",
    calendarEvent: "ashura",
    calendarSystem: "islamic",
    actionType: "provocative_statement",
    posteriorMultiplier: 2.5,
    historicalBasis:
      "Ashura commemorations frequently include military displays and martyrdom rhetoric.",
    sampleSize: 12,
    confidence: 0.8,
  },

  // ── China ─────────────────────────────────────────────────────────────
  {
    actorId: "china_pla",
    calendarEvent: "chinese_new_year",
    calendarSystem: "chinese",
    actionType: "military_action",
    posteriorMultiplier: 0.2,
    historicalBasis:
      "China avoids military provocation during Spring Festival period. Economic focus.",
    sampleSize: 15,
    confidence: 0.85,
  },
  {
    actorId: "china_pla",
    calendarEvent: "national_day",
    calendarSystem: "gregorian",
    actionType: "territorial_assertion",
    posteriorMultiplier: 3.0,
    historicalBasis:
      "Oct 1 National Day celebrations frequently accompanied by military exercises, especially Taiwan Strait.",
    sampleSize: 10,
    confidence: 0.8,
  },
  {
    actorId: "china_pla",
    calendarEvent: "npc_session",
    calendarSystem: "gregorian",
    actionType: "economic_measure",
    posteriorMultiplier: 3.5,
    historicalBasis:
      "Major economic announcements cluster around March NPC sessions. Budget, GDP targets, stimulus.",
    sampleSize: 20,
    confidence: 0.9,
  },

  // ── Russia ────────────────────────────────────────────────────────────
  {
    actorId: "russia_kremlin",
    calendarEvent: "victory_day",
    calendarSystem: "gregorian",
    actionType: "provocative_statement",
    posteriorMultiplier: 3.0,
    historicalBasis:
      "May 9 Victory Day consistently produces bellicose rhetoric and military displays.",
    sampleSize: 15,
    confidence: 0.85,
  },
  {
    actorId: "russia_kremlin",
    calendarEvent: "orthodox_christmas",
    calendarSystem: "gregorian",
    actionType: "military_action",
    posteriorMultiplier: 0.4,
    historicalBasis:
      "Ceasefire attempts around Orthodox Christmas (Jan 7). Offensive operations typically paused.",
    sampleSize: 5,
    confidence: 0.55,
  },

  // ── DPRK ──────────────────────────────────────────────────────────────
  {
    actorId: "dprk",
    calendarEvent: "sun_day",
    calendarSystem: "gregorian",
    actionType: "military_action",
    posteriorMultiplier: 4.0,
    historicalBasis:
      "Day of the Sun (Kim Il-sung birthday, April 15) is peak provocation window. Multiple missile/nuclear tests around this date.",
    sampleSize: 8,
    confidence: 0.8,
  },
  {
    actorId: "dprk",
    calendarEvent: "party_founding",
    calendarSystem: "gregorian",
    actionType: "military_action",
    posteriorMultiplier: 2.5,
    historicalBasis:
      "Oct 10 Workers' Party founding anniversary frequently marked by weapons tests.",
    sampleSize: 7,
    confidence: 0.75,
  },

  // ── Saudi Arabia ──────────────────────────────────────────────────────
  {
    actorId: "saudi_mbs",
    calendarEvent: "ramadan",
    calendarSystem: "islamic",
    actionType: "economic_measure",
    posteriorMultiplier: 0.5,
    historicalBasis:
      "OPEC+ decisions typically avoided during Ramadan. Oil demand patterns shift.",
    sampleSize: 8,
    confidence: 0.65,
  },
  {
    actorId: "saudi_mbs",
    calendarEvent: "hajj",
    calendarSystem: "islamic",
    actionType: "diplomatic_initiative",
    posteriorMultiplier: 2.0,
    historicalBasis:
      "Hajj period used for diplomatic meetings. Saudi hosts world leaders during pilgrimage season.",
    sampleSize: 10,
    confidence: 0.7,
  },

  // ── United States ──────────────────────────────────────────────────
  {
    actorId: "us_executive",
    calendarEvent: "us_election_season",
    calendarSystem: "gregorian",
    actionType: "provocative_statement",
    posteriorMultiplier: 2.5,
    historicalBasis:
      "Presidential election years (June-November) produce heightened foreign policy rhetoric. Rally-around-the-flag dynamics.",
    sampleSize: 12,
    confidence: 0.8,
  },
  {
    actorId: "us_executive",
    calendarEvent: "us_election_season",
    calendarSystem: "gregorian",
    actionType: "economic_measure",
    posteriorMultiplier: 2.0,
    historicalBasis:
      "Tariff announcements, sanctions, and trade actions cluster in election years. Economic nationalism as campaign tool.",
    sampleSize: 8,
    confidence: 0.75,
  },
  {
    actorId: "us_executive",
    calendarEvent: "us_inauguration",
    calendarSystem: "gregorian",
    actionType: "diplomatic_initiative",
    posteriorMultiplier: 3.0,
    historicalBasis:
      "First 100 days of new administration produces major policy shifts. Executive orders, treaty reviews, alliance restructuring.",
    sampleSize: 10,
    confidence: 0.85,
  },
  {
    actorId: "us_fed",
    calendarEvent: "fomc_meeting",
    calendarSystem: "gregorian",
    actionType: "economic_measure",
    posteriorMultiplier: 5.0,
    historicalBasis:
      "FOMC meetings (8x/year) are the primary rate decision mechanism. Policy shifts are almost exclusively announced at scheduled meetings.",
    sampleSize: 50,
    confidence: 0.95,
  },
  {
    actorId: "us_fed",
    calendarEvent: "jackson_hole",
    calendarSystem: "gregorian",
    actionType: "provocative_statement",
    posteriorMultiplier: 4.0,
    historicalBasis:
      "Jackson Hole symposium (late August) historically used for major policy pivot signals. Bernanke QE signal (2010), Powell framework shift (2020).",
    sampleSize: 15,
    confidence: 0.85,
  },
  {
    actorId: "us_congress",
    calendarEvent: "debt_ceiling",
    calendarSystem: "gregorian",
    actionType: "economic_measure",
    posteriorMultiplier: 4.0,
    historicalBasis:
      "Debt ceiling deadlines produce fiscal brinkmanship. Government shutdowns, credit downgrades, and market volatility cluster around these dates.",
    sampleSize: 8,
    confidence: 0.8,
  },

  // ── United Kingdom ─────────────────────────────────────────────────
  {
    actorId: "uk_government",
    calendarEvent: "uk_budget",
    calendarSystem: "gregorian",
    actionType: "economic_measure",
    posteriorMultiplier: 4.0,
    historicalBasis:
      "UK Budget/Autumn Statement produces major fiscal policy shifts. Truss mini-budget (2022) crashed gilt market. Spring Budget historically moves GBP.",
    sampleSize: 20,
    confidence: 0.9,
  },
  {
    actorId: "uk_government",
    calendarEvent: "boe_meeting",
    calendarSystem: "gregorian",
    actionType: "economic_measure",
    posteriorMultiplier: 3.5,
    historicalBasis:
      "Bank of England MPC meetings (8x/year). Rate decisions and gilt purchase adjustments.",
    sampleSize: 40,
    confidence: 0.9,
  },

  // ── European Union ─────────────────────────────────────────────────
  {
    actorId: "eu_commission",
    calendarEvent: "eu_council_summit",
    calendarSystem: "gregorian",
    actionType: "diplomatic_initiative",
    posteriorMultiplier: 3.5,
    historicalBasis:
      "EU Council summits (4x/year minimum) produce major collective decisions on sanctions, trade, and foreign policy. Unanimous decision requirements create drama.",
    sampleSize: 30,
    confidence: 0.85,
  },
  {
    actorId: "eu_commission",
    calendarEvent: "eu_elections",
    calendarSystem: "gregorian",
    actionType: "provocative_statement",
    posteriorMultiplier: 2.5,
    historicalBasis:
      "European Parliament elections (every 5 years) and national elections in major members produce policy uncertainty and populist rhetoric.",
    sampleSize: 8,
    confidence: 0.7,
  },
  {
    actorId: "eu_ecb",
    calendarEvent: "ecb_meeting",
    calendarSystem: "gregorian",
    actionType: "economic_measure",
    posteriorMultiplier: 5.0,
    historicalBasis:
      "ECB Governing Council meetings (6-week cycle). Rate decisions, TLTRO, APP adjustments. Draghi 'whatever it takes' (2012) was at an ECB presser.",
    sampleSize: 50,
    confidence: 0.95,
  },

  // ── Japan ──────────────────────────────────────────────────────────
  {
    actorId: "japan_boj",
    calendarEvent: "boj_meeting",
    calendarSystem: "gregorian",
    actionType: "economic_measure",
    posteriorMultiplier: 5.0,
    historicalBasis:
      "BOJ policy meetings (8x/year). YCC adjustments, rate changes. BOJ surprise moves cause massive JPY and JGB volatility.",
    sampleSize: 40,
    confidence: 0.9,
  },
  {
    actorId: "japan_boj",
    calendarEvent: "boj_tankan",
    calendarSystem: "gregorian",
    actionType: "economic_measure",
    posteriorMultiplier: 2.0,
    historicalBasis:
      "Tankan survey (quarterly) shapes BOJ policy expectations. Large manufacturer sentiment is a key input to policy decisions.",
    sampleSize: 20,
    confidence: 0.75,
  },
  {
    actorId: "japan_government",
    calendarEvent: "national_day",
    calendarSystem: "gregorian",
    actionType: "territorial_assertion",
    posteriorMultiplier: 2.0,
    historicalBasis:
      "Senkaku/Diaoyu tensions often flare around Japanese national days. China PLA correspondingly increases East China Sea patrols.",
    sampleSize: 8,
    confidence: 0.6,
  },

  // ── South Korea ────────────────────────────────────────────────────
  {
    actorId: "south_korea",
    calendarEvent: "korean_war_anniversary",
    calendarSystem: "gregorian",
    actionType: "military_action",
    posteriorMultiplier: 2.0,
    historicalBasis:
      "June 25 Korean War anniversary produces joint US-ROK military exercises and DPRK provocations. Elevated tension window.",
    sampleSize: 15,
    confidence: 0.7,
  },
  {
    actorId: "south_korea",
    calendarEvent: "ulchi_exercises",
    calendarSystem: "gregorian",
    actionType: "military_action",
    posteriorMultiplier: 2.5,
    historicalBasis:
      "Ulchi Freedom Shield (August) and other US-ROK joint exercises trigger DPRK counter-provocations. Escalation risk window.",
    sampleSize: 12,
    confidence: 0.75,
  },

  // ── India ──────────────────────────────────────────────────────────
  {
    actorId: "india_modi",
    calendarEvent: "indian_elections",
    calendarSystem: "gregorian",
    actionType: "provocative_statement",
    posteriorMultiplier: 2.5,
    historicalBasis:
      "Indian general/state elections produce nationalist rhetoric and Kashmir tensions. Pulwama/Balakot (2019) occurred during election season.",
    sampleSize: 6,
    confidence: 0.7,
  },
  {
    actorId: "india_modi",
    calendarEvent: "republic_day",
    calendarSystem: "gregorian",
    actionType: "territorial_assertion",
    posteriorMultiplier: 2.0,
    historicalBasis:
      "January 26 Republic Day military parade. Diplomatic signaling through chief guest selection. Military hardware displays.",
    sampleSize: 10,
    confidence: 0.7,
  },

  // ── Houthis ────────────────────────────────────────────────────────
  {
    actorId: "houthis",
    calendarEvent: "ramadan",
    calendarSystem: "islamic",
    actionType: "military_action",
    posteriorMultiplier: 0.6,
    historicalBasis:
      "Reduced offensive operations during Ramadan, though Red Sea shipping attacks continued at lower intensity in 2024.",
    sampleSize: 5,
    confidence: 0.5,
  },
  {
    actorId: "houthis",
    calendarEvent: "quds_day",
    calendarSystem: "islamic",
    actionType: "military_action",
    posteriorMultiplier: 3.0,
    historicalBasis:
      "Al-Quds Day produces coordinated Resistance Axis escalation. Houthi attacks on shipping and Saudi targets spike.",
    sampleSize: 6,
    confidence: 0.7,
  },

  // ── Hezbollah ──────────────────────────────────────────────────────
  {
    actorId: "hezbollah",
    calendarEvent: "ashura",
    calendarSystem: "islamic",
    actionType: "provocative_statement",
    posteriorMultiplier: 3.0,
    historicalBasis:
      "Ashura commemorations are peak mobilization events. Nasrallah historically used Ashura speeches for strategic messaging.",
    sampleSize: 15,
    confidence: 0.85,
  },
  {
    actorId: "hezbollah",
    calendarEvent: "ramadan",
    calendarSystem: "islamic",
    actionType: "military_action",
    posteriorMultiplier: 0.4,
    historicalBasis:
      "Hezbollah reduces offensive operations during Ramadan. Sacred month observance genuine, though defensive posture maintained.",
    sampleSize: 12,
    confidence: 0.75,
  },

  // ── Hamas ──────────────────────────────────────────────────────────
  {
    actorId: "hamas",
    calendarEvent: "ramadan",
    calendarSystem: "islamic",
    actionType: "provocative_statement",
    posteriorMultiplier: 2.5,
    historicalBasis:
      "Ramadan historically produces heightened Temple Mount tensions and Hamas rhetoric. Al-Aqsa clashes during Ramadan (2021, 2022, 2023) preceded escalation cycles.",
    sampleSize: 10,
    confidence: 0.8,
  },
  {
    actorId: "hamas",
    calendarEvent: "nakba_day",
    calendarSystem: "gregorian",
    actionType: "provocative_statement",
    posteriorMultiplier: 3.0,
    historicalBasis:
      "May 15 Nakba Day produces mass mobilization, border protests, and rocket fire from Gaza. Great March of Return (2018-2019) centered on Nakba commemoration.",
    sampleSize: 15,
    confidence: 0.85,
  },

  // ── ISIS ───────────────────────────────────────────────────────────
  {
    actorId: "isis",
    calendarEvent: "ramadan",
    calendarSystem: "islamic",
    actionType: "military_action",
    posteriorMultiplier: 3.0,
    historicalBasis:
      "ISIS explicitly calls for attacks during Ramadan as 'month of conquest'. Major attacks in Ramadan 2016 (Orlando, Istanbul, Dhaka, Baghdad). Contrary to most Islamic groups, ISIS elevates violence during sacred month.",
    sampleSize: 8,
    confidence: 0.75,
  },

  // ── Iran-backed PMCs ───────────────────────────────────────────────
  {
    actorId: "pmc_iran_proxies",
    calendarEvent: "quds_day",
    calendarSystem: "islamic",
    actionType: "military_action",
    posteriorMultiplier: 3.0,
    historicalBasis:
      "Iraqi militias (Kataib Hezbollah, etc.) increase attacks on US bases around Quds Day. Coordinated with broader Resistance Axis escalation.",
    sampleSize: 8,
    confidence: 0.7,
  },
  {
    actorId: "pmc_iran_proxies",
    calendarEvent: "soleimani_anniversary",
    calendarSystem: "gregorian",
    actionType: "military_action",
    posteriorMultiplier: 2.5,
    historicalBasis:
      "January 3 anniversary of Soleimani killing produces commemorative attacks on US positions in Iraq and Syria.",
    sampleSize: 4,
    confidence: 0.65,
  },
];

// ---------------------------------------------------------------------------
// Bayesian Update
// ---------------------------------------------------------------------------

/** Hard cap so no probability exceeds this value after update. */
const PROBABILITY_CAP = 0.95;

/**
 * Apply calendar-conditioned Bayesian updates to an actor's action probabilities.
 *
 * For each matching modifier the effective multiplier is damped by confidence:
 *   effective_multiplier = 1 + (posteriorMultiplier - 1) * confidence
 *
 * When multiple modifiers target the same action type they compose
 * multiplicatively (each successive observation updates the posterior).
 *
 * @param actor - The actor profile to update
 * @param activeCalendarEvents - Currently active calendar event keys
 * @param calendarSystem - Which calendar system the events belong to
 * @returns Updated probabilities, applied modifiers, and narrative explanation
 */
export function updateActorProbabilities(
  actor: ActorProfile,
  activeCalendarEvents: string[],
  calendarSystem: CalendarSystem
): ActorUpdateResult {
  // Clone base probabilities so we don't mutate the original
  const updated: Record<string, number> = { ...actor.baseActionProbabilities };

  // Find all modifiers that match this actor + active events + calendar system
  const applied: CalendarBehaviorModifier[] = [];

  for (const modifier of CALENDAR_BEHAVIOR_MODIFIERS) {
    if (
      modifier.actorId !== actor.id ||
      modifier.calendarSystem !== calendarSystem ||
      !activeCalendarEvents.includes(modifier.calendarEvent)
    ) {
      continue;
    }

    applied.push(modifier);

    // Confidence-damped multiplier: at confidence=1 you get the full
    // posteriorMultiplier; at confidence=0 you get 1 (no change).
    const effectiveMultiplier =
      1 + (modifier.posteriorMultiplier - 1) * modifier.confidence;

    const key = modifier.actionType;
    const current = updated[key] ?? 0;
    updated[key] = Math.min(current * effectiveMultiplier, PROBABILITY_CAP);
  }

  // Build narrative summary
  const narrativeSummary = buildNarrative(actor, applied, updated);

  return {
    actorId: actor.id,
    updatedProbabilities: updated,
    modifiersApplied: applied,
    narrativeSummary,
  };
}

/**
 * Build a human-readable narrative explaining the Bayesian update.
 */
function buildNarrative(
  actor: ActorProfile,
  modifiers: CalendarBehaviorModifier[],
  updatedProbs: Record<string, number>
): string {
  if (modifiers.length === 0) {
    return `No calendar-conditioned behavioral modifiers active for ${actor.name}.`;
  }

  const lines: string[] = [
    `${actor.name} (${actor.country}) -- ${modifiers.length} calendar modifier(s) active:`,
  ];

  for (const mod of modifiers) {
    const base =
      actor.baseActionProbabilities[
        mod.actionType as keyof ActionProbabilities
      ];
    const adjusted = updatedProbs[mod.actionType] ?? base;
    const direction = adjusted > base ? "elevated" : "suppressed";
    const actionLabel = mod.actionType.replace(/_/g, " ");

    lines.push(
      `  [${mod.calendarEvent}] P(${actionLabel}) ${direction}: ` +
        `${(base * 100).toFixed(1)}% -> ${(adjusted * 100).toFixed(1)}% ` +
        `(confidence ${(mod.confidence * 100).toFixed(0)}%, n=${mod.sampleSize}). ` +
        `Basis: ${mod.historicalBasis}`
    );
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Convenience: Signal Engine Integration
// ---------------------------------------------------------------------------

/**
 * Produce calendar-actor insights across all tracked actors and all
 * active calendar systems. This is the main entry point for the signal
 * engine's calendar layer.
 *
 * Gregorian events are resolved from the provided date; hebrew and islamic
 * events must be passed in by the caller (since conversion requires
 * external calendar logic).
 *
 * @param hebrewEvents - Active Hebrew calendar event keys
 * @param islamicEvents - Active Islamic calendar event keys
 * @param gregorianDate - Current date (used to resolve gregorian event keys)
 * @returns Array of actor insights with adjusted probabilities
 */
export function getCalendarActorInsights(
  hebrewEvents: string[],
  islamicEvents: string[],
  gregorianDate: Date
): ActorInsight[] {
  const gregorianEvents = resolveGregorianEvents(gregorianDate);
  const chineseEvents = resolveChineseEvents(gregorianDate);

  const insights: ActorInsight[] = [];

  for (const actor of ACTOR_PROFILES) {
    // Run updates for each calendar system
    const systems: { system: CalendarSystem; events: string[] }[] = [
      { system: "hebrew", events: hebrewEvents },
      { system: "islamic", events: islamicEvents },
      { system: "gregorian", events: gregorianEvents },
      { system: "chinese", events: chineseEvents },
    ];

    for (const { system, events } of systems) {
      if (events.length === 0) continue;

      const result = updateActorProbabilities(actor, events, system);

      for (const modifier of result.modifiersApplied) {
        const base =
          actor.baseActionProbabilities[
            modifier.actionType as keyof ActionProbabilities
          ];
        const adjusted = result.updatedProbabilities[modifier.actionType] ?? base;

        // Only surface insights where the probability actually shifted
        if (Math.abs(adjusted - base) < 0.001) continue;

        insights.push({
          actor: actor.name,
          actionType: modifier.actionType,
          baseProbability: base,
          adjustedProbability: adjusted,
          calendarTrigger: modifier.calendarEvent,
          historicalBasis: modifier.historicalBasis,
          confidence: modifier.confidence,
        });
      }
    }
  }

  // Sort by magnitude of probability shift (largest first)
  insights.sort(
    (a, b) =>
      Math.abs(b.adjustedProbability - b.baseProbability) -
      Math.abs(a.adjustedProbability - a.baseProbability)
  );

  return insights;
}

// ---------------------------------------------------------------------------
// Gregorian & Chinese Event Resolution
// ---------------------------------------------------------------------------

/**
 * Resolve which gregorian-calendar event keys are active for a given date.
 * Uses a window approach: events are active within a configurable number
 * of days around the canonical date.
 */
function resolveGregorianEvents(date: Date): string[] {
  const month = date.getMonth() + 1; // 1-indexed
  const day = date.getDate();
  const active: string[] = [];

  // Each entry: [event_key, month, day, window_days]
  const gregorianCalendar: [string, number, number, number][] = [
    ["orthodox_christmas", 1, 7, 2],
    ["us_inauguration", 1, 20, 5],
    ["republic_day", 1, 26, 2], // India Republic Day
    ["npc_session", 3, 5, 10], // NPC typically runs early-mid March
    ["uk_budget", 3, 15, 7], // Spring Budget, approximate
    ["sun_day", 4, 15, 3],
    ["victory_day", 5, 9, 2],
    ["korean_war_anniversary", 6, 25, 3],
    ["ulchi_exercises", 8, 15, 10], // Ulchi Freedom Shield, mid-August
    ["jackson_hole", 8, 25, 3], // Jackson Hole symposium
    ["soleimani_anniversary", 1, 3, 2],
    ["nakba_day", 5, 15, 2],
    ["national_day", 10, 1, 3],
    ["party_founding", 10, 10, 2],
    // Note: FOMC, ECB, BOJ, BOE meetings are on variable schedules
    // and need to be resolved from a calendar feed rather than fixed dates.
    // For now they are matched when passed in as activeCalendarEvents.
  ];

  for (const [key, m, d, window] of gregorianCalendar) {
    const eventDate = new Date(date.getFullYear(), m - 1, d);
    const diff = Math.abs(date.getTime() - eventDate.getTime());
    const diffDays = diff / (1000 * 60 * 60 * 24);
    if (diffDays <= window) {
      active.push(key);
    }
  }

  return active;
}

/**
 * Resolve Chinese calendar events from a gregorian date.
 * Chinese New Year falls between Jan 21 and Feb 20; we use a broad
 * window since the exact date varies by year. A proper implementation
 * would use a lunisolar calendar library.
 */
function resolveChineseEvents(date: Date): string[] {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const active: string[] = [];

  // Chinese New Year window: roughly late January through mid February
  if (
    (month === 1 && day >= 21) ||
    (month === 2 && day <= 20)
  ) {
    active.push("chinese_new_year");
  }

  return active;
}
