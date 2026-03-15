/**
 * The Law of Eschatological Convergence
 *
 * Detection layer for identifying when multiple state actors simultaneously
 * pursue incompatible end-times or theologically mandated programmes over
 * the same geography. This creates non-linear risk amplification because
 * divine mandates cannot be negotiated away: traditional game theory fails
 * when actors believe they are fulfilling prophecy.
 *
 * The law states: when N >= 2 actors hold incompatible eschatological
 * commitments that converge on the same geography and time window,
 * the probability of conflict is not additive but multiplicative,
 * because each actor's theological framework excludes compromise
 * as an option. Diplomatic off-ramps collapse.
 *
 * Key insight: the danger is not that actors are religious. The danger
 * is that multiple actors hold mutually exclusive theological claims
 * to the same outcome, territory, or timeline, and that these claims
 * are politically operationalised (budgets, institutions, military
 * doctrine shaped by the theology).
 */

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

/** An actor's documented eschatological programme. */
export interface EschatologicalProgramme {
  actorId: string;
  name: string;
  /** The theological framework driving the programme */
  theology: string;
  /** Core claim: what the actor believes must happen */
  mandate: string;
  /** Geography the mandate targets */
  targetGeography: string[];
  /** Textual/doctrinal basis for the programme */
  doctrinalBasis: string[];
  /** Observable indicators that the programme is being actively pursued */
  operationalIndicators: string[];
  /** Is this programme currently active (institutional support, funding, public statements)? */
  active: boolean;
  /** Confidence that this programme materially influences state/actor policy (0-1) */
  policyInfluence: number;
  /** How incompatible is this with negotiated settlement? (0=flexible, 1=non-negotiable) */
  rigidity: number;
  /** Market sectors affected if this programme advances */
  marketSectors: string[];
}

/** A detected convergence of incompatible eschatological programmes. */
export interface EschatologicalConvergence {
  /** Actors whose programmes are converging */
  actors: string[];
  /** The programmes in tension */
  programmes: string[];
  /** Shared geography where mandates collide */
  sharedGeography: string[];
  /** Why these are incompatible */
  incompatibilityReason: string;
  /** Non-linear amplification factor (1.0 = no amplification, 2.0+ = significant) */
  amplificationFactor: number;
  /** Composite rigidity: how little room for diplomatic off-ramps */
  compositeRigidity: number;
  /** Combined policy influence */
  compositePolicyInfluence: number;
  /** Significance score for Bayesian fusion (0-9 scale) */
  significance: number;
  /** Affected market sectors */
  marketSectors: string[];
  /** Human-readable description */
  description: string;
}

/** Calendar events that carry eschatological weight for specific actors. */
export interface EschatologicalCalendarTrigger {
  actorId: string;
  programmeId: string;
  calendarEvent: string;
  calendarSystem: "hebrew" | "islamic" | "gregorian" | "chinese";
  /** How much this calendar event elevates the programme's operational probability */
  activationMultiplier: number;
  /** Historical basis for this trigger */
  historicalBasis: string;
  confidence: number;
}

// ═══════════════════════════════════════════════════════════
// ESCHATOLOGICAL PROGRAMMES DATABASE
// ═══════════════════════════════════════════════════════════

/**
 * Documented eschatological programmes currently pursued by state actors
 * or state-adjacent institutions. Each entry represents a theologically
 * driven political programme with real-world institutional support.
 *
 * Inclusion criteria:
 * 1. Institutional backing (government funding, official bodies, legislation)
 * 2. Public statements by decision-makers referencing the theology
 * 3. Observable operational steps toward fulfilment
 * 4. Material policy influence on security/economic decisions
 */
export const ESCHATOLOGICAL_PROGRAMMES: EschatologicalProgramme[] = [
  // ── ISRAEL: TEMPLE RECONSTRUCTION ──
  {
    actorId: "israel_far_right",
    name: "Third Temple Programme",
    theology: "Messianic Judaism / Temple restoration theology",
    mandate: "Rebuild the Third Temple on the Temple Mount in Jerusalem, reinstate sacrificial worship as precondition for messianic redemption",
    targetGeography: ["Jerusalem", "Temple Mount", "Israel"],
    doctrinalBasis: [
      "Ezekiel 40-48 (Third Temple prophecy)",
      "Maimonides: Temple construction as one of the 613 commandments",
      "Temple Institute: 35+ years institutional preparation",
    ],
    operationalIndicators: [
      "Red heifer purification programme (5 candidates imported from Texas, 2022)",
      "Temple Institute has manufactured all 102 sacred vessels",
      "Sanhedrin reconvened (2004-present) to provide halachic authority",
      "Ben Gvir police authority over Temple Mount (2023-present)",
      "Incremental status quo erosion: Jewish prayer sheets, pilgrimage road, police escorts",
      "Altar construction and placement rehearsals",
    ],
    active: true,
    policyInfluence: 0.70,
    rigidity: 0.90,
    marketSectors: ["energy", "defense", "commodities"],
  },

  // ── IRAN: MAHDI RETURN THEOLOGY ──
  {
    actorId: "iran_irgc",
    name: "Mahdist Programme",
    theology: "Twelver Shia eschatology / Hidden Imam return",
    mandate: "Create conditions for the return of the Twelfth Imam (Mahdi) through resistance against oppression and defence of Islamic holy sites, particularly Al-Aqsa",
    targetGeography: ["Jerusalem", "Iraq", "Iran", "Levant"],
    doctrinalBasis: [
      "Hadith of the Mahdi (Sahih Muslim, Sunan Abu Dawud)",
      "Khamenei speeches referencing divine promise of Zionist regime collapse",
      "IRGC doctrine: resistance axis as precondition for Mahdi's appearance",
      "Constitutional preamble: Islamic government as precursor to Hidden Imam's return",
    ],
    operationalIndicators: [
      "Quds Force mandate explicitly tied to Jerusalem liberation theology",
      "Proxy network (Hezbollah, Hamas, Houthis, PMCs) framed as eschatological duty",
      "Nuclear programme provides existential deterrent to protect the mission",
      "State media regularly references end-times narratives during escalation",
      "Isfahan (prophesied battleground) features prominently in military planning",
    ],
    active: true,
    policyInfluence: 0.75,
    rigidity: 0.85,
    marketSectors: ["energy", "defense", "commodities", "shipping"],
  },

  // ── US CHRISTIAN ZIONISM ──
  {
    actorId: "us_executive",
    name: "Evangelical Fulfilment Theology",
    theology: "Dispensationalist premillennialism / Christian Zionism",
    mandate: "Support Israel's territorial maximalism and Temple reconstruction as necessary preconditions for the Second Coming of Christ",
    targetGeography: ["Jerusalem", "Israel", "Middle East"],
    doctrinalBasis: [
      "Genesis 12:3 (bless Israel = be blessed)",
      "Revelation: Temple rebuilding precedes end times",
      "Hal Lindsey 'Late Great Planet Earth' (1970) / Tim LaHaye 'Left Behind' series",
      "CUFI (Christians United for Israel): 10M+ members, largest Israel lobby",
    ],
    operationalIndicators: [
      "Embassy move to Jerusalem (2017)",
      "Abraham Accords structured around evangelical coalition support",
      "Congressional voting bloc: 25-30% of US electorate identifies as evangelical",
      "Military aid to Israel partly sustained by theological constituency pressure",
      "Golan Heights recognition, settlement expansion support",
    ],
    active: true,
    policyInfluence: 0.55,
    rigidity: 0.60,
    marketSectors: ["defense", "energy"],
  },

  // ── RUSSIA: THIRD ROME / ORTHODOX NATIONALISM ──
  {
    actorId: "russia_kremlin",
    name: "Third Rome Doctrine",
    theology: "Russian Orthodox messianism / Katechon theology",
    mandate: "Russia as the Katechon (restrainer of Antichrist), defender of traditional Christian civilisation against Western liberal apostasy",
    targetGeography: ["Eastern Europe", "Holy Land", "Global"],
    doctrinalBasis: [
      "Philotheus of Pskov (1510): 'Two Romes have fallen, the third stands'",
      "Patriarch Kirill's 'Holy War' declaration (2022)",
      "Dugin's Fourth Political Theory: civilisational-spiritual conflict framing",
      "Putin speeches referencing spiritual sovereignty and civilisational mission",
    ],
    operationalIndicators: [
      "ROC blessing of military operations in Ukraine",
      "Holy War framing of Ukraine conflict by Patriarch Kirill",
      "Wagner Group naming (Wagnerian/Teutonic mythological framing)",
      "Nuclear doctrine framed as civilisational defence, not just deterrence",
      "Orthodox church construction in occupied territories",
    ],
    active: true,
    policyInfluence: 0.50,
    rigidity: 0.55,
    marketSectors: ["energy", "defense", "agriculture"],
  },

  // ── ISIS / SALAFI-JIHADIST CALIPHATE ──
  {
    actorId: "isis",
    name: "Caliphate Eschatology",
    theology: "Salafi-Jihadist apocalypticism / Dabiq prophecy",
    mandate: "Establish territorial caliphate as precursor to end-times battle at Dabiq (Syria), defeat of Rome (the West), and arrival of the Mahdi",
    targetGeography: ["Syria", "Iraq", "Levant", "Global"],
    doctrinalBasis: [
      "Hadith of Dabiq: final battle between Muslims and Romans",
      "Abu Musab al-Zarqawi's apocalyptic framework",
      "Dabiq magazine: named after prophesied battleground",
      "Black flag prophecies (Khorasan)",
    ],
    operationalIndicators: [
      "Territorial control attempts (2014-2019, ongoing insurgency)",
      "Propaganda explicitly references end-times timeline",
      "Recruitment framed as participation in prophesied final battle",
      "Attacks timed to symbolic dates (Ramadan operations)",
    ],
    active: true,
    policyInfluence: 0.25,
    rigidity: 0.95,
    marketSectors: ["energy", "defense"],
  },

  // ── TURKEY: NEO-OTTOMAN / ISLAMIC LEADERSHIP ──
  {
    actorId: "turkey_erdogan",
    name: "Neo-Ottoman Islamic Leadership",
    theology: "Sunni Islamic revivalism / Ottoman succession theology",
    mandate: "Restore Turkey as leader of the Sunni Islamic world, protector of Al-Aqsa and Islamic holy sites, successor to Ottoman Caliphate",
    targetGeography: ["Jerusalem", "Balkans", "Central Asia", "Middle East"],
    doctrinalBasis: [
      "Ottoman Caliphate legacy (abolished 1924, Erdogan seeks spiritual succession)",
      "Hagia Sophia reconversion (2020) as symbolic restoration",
      "Erdogan speeches: 'Jerusalem is our city' (2017)",
      "Diyanet (state religious authority) expanding globally",
    ],
    operationalIndicators: [
      "Hagia Sophia mosque reconversion",
      "Military operations framed with Islamic duty language",
      "Erdogan positioning as voice of Muslim world on Palestine",
      "TIKA (development agency) expanding Ottoman-era mosque network",
    ],
    active: true,
    policyInfluence: 0.45,
    rigidity: 0.50,
    marketSectors: ["defense", "energy"],
  },
];

// ═══════════════════════════════════════════════════════════
// CALENDAR TRIGGERS
// ═══════════════════════════════════════════════════════════

/**
 * Calendar events that specifically elevate eschatological programme
 * activation probability. These go beyond the actor-beliefs calendar
 * modifiers by tracking when theological timing creates urgency.
 */
export const ESCHATOLOGICAL_CALENDAR_TRIGGERS: EschatologicalCalendarTrigger[] = [
  // Temple programme triggers
  { actorId: "israel_far_right", programmeId: "Third Temple Programme", calendarEvent: "tisha_bav", calendarSystem: "hebrew", activationMultiplier: 4.0, historicalBasis: "9th of Av: both Temples destroyed. Theological imperative to rebuild reaches peak intensity.", confidence: 0.80 },
  { actorId: "israel_far_right", programmeId: "Third Temple Programme", calendarEvent: "pesach", calendarSystem: "hebrew", activationMultiplier: 3.0, historicalBasis: "Passover sacrifice rehearsals near Temple Mount, annual provocation cycle.", confidence: 0.75 },
  { actorId: "israel_far_right", programmeId: "Third Temple Programme", calendarEvent: "sukkot", calendarSystem: "hebrew", activationMultiplier: 2.5, historicalBasis: "Temple pilgrimage festival. Status quo challenges historically peak.", confidence: 0.70 },
  { actorId: "israel_far_right", programmeId: "Third Temple Programme", calendarEvent: "purim", calendarSystem: "hebrew", activationMultiplier: 2.0, historicalBasis: "Pre-emptive action narrative (Esther). Military operations timed to Purim historically.", confidence: 0.65 },

  // Mahdist programme triggers
  { actorId: "iran_irgc", programmeId: "Mahdist Programme", calendarEvent: "quds_day", calendarSystem: "islamic", activationMultiplier: 4.5, historicalBasis: "Al-Quds Day: annual mobilisation for Jerusalem liberation, proxy activation peak.", confidence: 0.85 },
  { actorId: "iran_irgc", programmeId: "Mahdist Programme", calendarEvent: "ramadan", calendarSystem: "islamic", activationMultiplier: 2.5, historicalBasis: "Ramadan escalation cycle: heightened religious sentiment + proxy operations.", confidence: 0.75 },
  { actorId: "iran_irgc", programmeId: "Mahdist Programme", calendarEvent: "ashura", calendarSystem: "islamic", activationMultiplier: 3.5, historicalBasis: "Ashura: martyrdom theology peak. Hezbollah/IRGC rhetoric intensifies.", confidence: 0.80 },
  { actorId: "iran_irgc", programmeId: "Mahdist Programme", calendarEvent: "laylat_al_qadr", calendarSystem: "islamic", activationMultiplier: 3.0, historicalBasis: "Night of Power: divine decree theology. Operations framed as divinely timed.", confidence: 0.70 },

  // Christian Zionism triggers
  { actorId: "us_executive", programmeId: "Evangelical Fulfilment Theology", calendarEvent: "blood_moon", calendarSystem: "gregorian", activationMultiplier: 2.0, historicalBasis: "Blood moon tetrad theology (Hagee). Policy announcements timed to astronomical events.", confidence: 0.45 },
  { actorId: "us_executive", programmeId: "Evangelical Fulfilment Theology", calendarEvent: "easter", calendarSystem: "gregorian", activationMultiplier: 1.5, historicalBasis: "Easter week: evangelical constituency attention peak. Israel-related announcements.", confidence: 0.40 },

  // ISIS triggers
  { actorId: "isis", programmeId: "Caliphate Eschatology", calendarEvent: "ramadan", calendarSystem: "islamic", activationMultiplier: 4.0, historicalBasis: "Ramadan operations: ISIS historically launches major attacks during Ramadan for theological amplification.", confidence: 0.85 },

  // Third Rome triggers
  { actorId: "russia_kremlin", programmeId: "Third Rome Doctrine", calendarEvent: "orthodox_easter", calendarSystem: "gregorian", activationMultiplier: 2.0, historicalBasis: "Orthodox Easter: civilisational framing peaks. Military pause/escalation decisions.", confidence: 0.55 },
  { actorId: "russia_kremlin", programmeId: "Third Rome Doctrine", calendarEvent: "victory_day", calendarSystem: "gregorian", activationMultiplier: 2.5, historicalBasis: "May 9 Victory Day: sacred narrative of defeating evil. Escalation announcements historically timed here.", confidence: 0.70 },
];

// ═══════════════════════════════════════════════════════════
// INCOMPATIBILITY MATRIX
// ═══════════════════════════════════════════════════════════

/**
 * Pairwise theological incompatibilities between eschatological programmes.
 * A high score means the two programmes' mandates are mutually exclusive
 * over the same geography, making compromise structurally impossible.
 *
 * Scale: 0.0 = compatible, 1.0 = completely irreconcilable.
 */
interface IncompatibilityEntry {
  actor1: string;
  actor2: string;
  score: number;
  reason: string;
  sharedGeography: string[];
}

const INCOMPATIBILITY_MATRIX: IncompatibilityEntry[] = [
  // Temple vs Mahdi: the core collision
  {
    actor1: "israel_far_right",
    actor2: "iran_irgc",
    score: 0.95,
    reason: "Third Temple requires Jewish sovereignty over Temple Mount/Al-Aqsa. Mahdist programme requires its defence under Islamic control. Both mandates are non-negotiable and target the same 35 acres.",
    sharedGeography: ["Jerusalem", "Temple Mount"],
  },
  // Temple vs ISIS Caliphate
  {
    actor1: "israel_far_right",
    actor2: "isis",
    score: 0.90,
    reason: "Both claim divine mandate over the Levant. ISIS end-times narrative requires destruction of Israel. Temple programme requires territorial control.",
    sharedGeography: ["Jerusalem", "Levant"],
  },
  // Temple + US evangelical alignment (reinforcing, not incompatible)
  // Not included: these are COMPATIBLE, which is itself a signal
  // (two actors reinforcing the same programme compounds the collision with Iran)

  // Mahdi vs Christian Zionism
  {
    actor1: "iran_irgc",
    actor2: "us_executive",
    score: 0.80,
    reason: "US evangelical support for Israel's Temple programme directly opposes Iran's mandate to protect Islamic holy sites. US military posture in Middle East seen through eschatological lens by both sides.",
    sharedGeography: ["Jerusalem", "Middle East"],
  },
  // Mahdi vs Caliphate (intra-Islamic eschatological conflict)
  {
    actor1: "iran_irgc",
    actor2: "isis",
    score: 0.75,
    reason: "Competing Mahdi narratives. Shia and Sunni eschatologies identify different preconditions and different protagonists for the end times.",
    sharedGeography: ["Iraq", "Syria", "Levant"],
  },
  // Third Rome vs NATO/Western
  {
    actor1: "russia_kremlin",
    actor2: "us_executive",
    score: 0.55,
    reason: "Katechon theology frames the West as spiritually fallen. US evangelical framework largely ignores Russia's theological claims. Lower direct geographical overlap on core eschatological sites.",
    sharedGeography: ["Eastern Europe", "Global"],
  },
  // Turkey vs Israel
  {
    actor1: "turkey_erdogan",
    actor2: "israel_far_right",
    score: 0.70,
    reason: "Ottoman succession theology claims custodianship of Al-Aqsa. Temple programme requires changing Al-Aqsa status quo. Erdogan has explicitly called Jerusalem 'our city'.",
    sharedGeography: ["Jerusalem"],
  },
  // Turkey vs Iran (Sunni vs Shia leadership over Islamic world)
  {
    actor1: "turkey_erdogan",
    actor2: "iran_irgc",
    score: 0.50,
    reason: "Competing claims to leadership of the Islamic world. Lower intensity because both oppose Israel, creating temporary alignment despite theological differences.",
    sharedGeography: ["Middle East", "Jerusalem"],
  },
];

// ═══════════════════════════════════════════════════════════
// CONVERGENCE DETECTION
// ═══════════════════════════════════════════════════════════

/**
 * Detects active eschatological convergences by checking which programmes
 * are currently active, finding incompatible pairs, and computing the
 * non-linear amplification factor.
 *
 * The amplification factor models the "no off-ramp" phenomenon:
 * when actors cannot negotiate because their mandates are divinely
 * ordained, the probability of escalation is not just higher, it
 * follows a different distribution (fat-tailed, not Gaussian).
 *
 * @param activeCalendarEvents - Currently active calendar events (hebrew, islamic, etc.)
 * @returns Array of detected eschatological convergences
 */
export function detectEschatologicalConvergences(
  activeCalendarEvents: string[] = []
): EschatologicalConvergence[] {
  const convergences: EschatologicalConvergence[] = [];

  // Only consider active programmes
  const activeProgrammes = ESCHATOLOGICAL_PROGRAMMES.filter((p) => p.active);

  // Check all incompatible pairs
  for (const entry of INCOMPATIBILITY_MATRIX) {
    const prog1 = activeProgrammes.find((p) => p.actorId === entry.actor1);
    const prog2 = activeProgrammes.find((p) => p.actorId === entry.actor2);

    if (!prog1 || !prog2) continue;

    // Base amplification from incompatibility and rigidity
    const compositeRigidity = (prog1.rigidity + prog2.rigidity) / 2;
    const compositePolicyInfluence = (prog1.policyInfluence + prog2.policyInfluence) / 2;

    // Non-linear amplification: incompatibility * rigidity * policy influence
    // Two highly rigid, highly influential, highly incompatible programmes
    // produce amplification well above 1.0
    let amplification = 1.0 + entry.score * compositeRigidity * compositePolicyInfluence;

    // Calendar trigger elevation: if current calendar events match either
    // programme's triggers, amplification increases further
    let calendarBoost = 0;
    for (const trigger of ESCHATOLOGICAL_CALENDAR_TRIGGERS) {
      if (
        (trigger.actorId === entry.actor1 || trigger.actorId === entry.actor2) &&
        activeCalendarEvents.includes(trigger.calendarEvent)
      ) {
        // Confidence-damped calendar boost
        const effectiveMultiplier = 1 + (trigger.activationMultiplier - 1) * trigger.confidence;
        calendarBoost = Math.max(calendarBoost, effectiveMultiplier - 1);
      }
    }
    amplification += calendarBoost * 0.5; // Calendar adds up to ~1.0 extra amplification

    // Compute significance for Bayesian fusion (0-9 scale)
    // Based on incompatibility * rigidity * policy influence * calendar context
    const rawSignificance = entry.score * compositeRigidity * 4 + calendarBoost * 2;
    const significance = Math.min(rawSignificance, 9);

    // Merge market sectors
    const sectors = new Set<string>([...prog1.marketSectors, ...prog2.marketSectors]);

    convergences.push({
      actors: [entry.actor1, entry.actor2],
      programmes: [prog1.name, prog2.name],
      sharedGeography: entry.sharedGeography,
      incompatibilityReason: entry.reason,
      amplificationFactor: Math.round(amplification * 100) / 100,
      compositeRigidity,
      compositePolicyInfluence,
      significance,
      marketSectors: Array.from(sectors),
      description: `${prog1.name} (${prog1.actorId}) vs ${prog2.name} (${prog2.actorId}): ${entry.reason}`,
    });
  }

  // Sort by significance (highest first)
  return convergences.sort((a, b) => b.significance - a.significance);
}

/**
 * Get the eschatological profile for a specific actor, including
 * their programme details, calendar triggers, and current incompatibilities.
 */
export function getActorEschatologicalProfile(actorId: string): {
  programme: EschatologicalProgramme | null;
  calendarTriggers: EschatologicalCalendarTrigger[];
  incompatibilities: Array<{ opponent: string; score: number; reason: string; sharedGeography: string[] }>;
} {
  const programme = ESCHATOLOGICAL_PROGRAMMES.find((p) => p.actorId === actorId) || null;
  const calendarTriggers = ESCHATOLOGICAL_CALENDAR_TRIGGERS.filter((t) => t.actorId === actorId);
  const incompatibilities = INCOMPATIBILITY_MATRIX
    .filter((e) => e.actor1 === actorId || e.actor2 === actorId)
    .map((e) => ({
      opponent: e.actor1 === actorId ? e.actor2 : e.actor1,
      score: e.score,
      reason: e.reason,
      sharedGeography: e.sharedGeography,
    }));

  return { programme, calendarTriggers, incompatibilities };
}

/**
 * Get all active eschatological programmes with their current
 * amplification context. Useful for the chat analyst to understand
 * the full eschatological landscape.
 */
export function getEschatologicalLandscape(activeCalendarEvents: string[] = []): {
  programmes: Array<EschatologicalProgramme & { calendarElevation: number }>;
  convergences: EschatologicalConvergence[];
  highestAmplification: number;
  noOffRampPairs: string[];
} {
  const convergences = detectEschatologicalConvergences(activeCalendarEvents);

  const programmes = ESCHATOLOGICAL_PROGRAMMES.filter((p) => p.active).map((p) => {
    // Calculate calendar elevation for this programme
    const triggers = ESCHATOLOGICAL_CALENDAR_TRIGGERS.filter(
      (t) => t.actorId === p.actorId && activeCalendarEvents.includes(t.calendarEvent)
    );
    const calendarElevation = triggers.reduce((max, t) => {
      const effective = 1 + (t.activationMultiplier - 1) * t.confidence;
      return Math.max(max, effective);
    }, 1.0);

    return { ...p, calendarElevation };
  });

  const highestAmplification = convergences.length > 0
    ? Math.max(...convergences.map((c) => c.amplificationFactor))
    : 1.0;

  // "No off-ramp" pairs: convergences with composite rigidity >= 0.80
  const noOffRampPairs = convergences
    .filter((c) => c.compositeRigidity >= 0.80)
    .map((c) => `${c.actors[0]} vs ${c.actors[1]}`);

  return { programmes, convergences, highestAmplification, noOffRampPairs };
}
