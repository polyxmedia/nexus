/**
 * Actor-Belief Profile Builder
 *
 * Extended actor profiles with public statements, scripture references,
 * past decisions, calendar sensitivities, and belief system modeling.
 * Builds on the Bayesian actor-belief system in lib/signals/actor-beliefs.ts.
 */

import {
  ACTOR_PROFILES,
  CALENDAR_BEHAVIOR_MODIFIERS,
  type ActorProfile,
  type CalendarBehaviorModifier,
} from "@/lib/signals/actor-beliefs";
import { searchKnowledge } from "@/lib/knowledge/engine";

// ── Types ──

export interface PublicStatement {
  date: string;
  quote: string;
  context: string;
  source: string;
  significance: "low" | "medium" | "high" | "critical";
}

export interface ScriptureReference {
  text: string;
  source: string; // e.g. "Book of Esther 9:1", "Quran 2:194"
  relevance: string;
  usedBy: string; // actor ID
}

export interface PastDecision {
  date: string;
  action: string;
  context: string;
  outcome: string;
  calendarProximity: string | null; // was it near a calendar event?
}

export interface ExtendedActorProfile {
  base: ActorProfile;
  calendarModifiers: CalendarBehaviorModifier[];
  publicStatements: PublicStatement[];
  scriptureReferences: ScriptureReference[];
  pastDecisions: PastDecision[];
  beliefFramework: string; // narrative description of their worldview
  decisionPattern: string; // how they tend to make decisions
  knowledgeBankEntries: number; // count of related KB entries
}

// ── Built-in Extended Profiles ──

const EXTENDED_DATA: Record<
  string,
  {
    publicStatements: PublicStatement[];
    scriptureReferences: ScriptureReference[];
    pastDecisions: PastDecision[];
    beliefFramework: string;
    decisionPattern: string;
  }
> = {
  israel_far_right: {
    publicStatements: [
      {
        date: "2023-07-25",
        quote:
          "I went up to the Temple Mount, the most important place for the people of Israel.",
        context: "After Tisha B'Av Temple Mount visit",
        source: "Ben Gvir public statement",
        significance: "critical",
      },
      {
        date: "2024-01-15",
        quote:
          "We need to encourage voluntary emigration of Palestinians from Gaza.",
        context: "Conference on settlement of Gaza",
        source: "Smotrich address",
        significance: "high",
      },
      {
        date: "2024-10-07",
        quote:
          "The enemy will pay a price it has never known.",
        context: "Anniversary of October 7 attacks",
        source: "Coalition joint statement",
        significance: "high",
      },
    ],
    scriptureReferences: [
      {
        text: "The Jews had light, and gladness, and joy, and honour.",
        source: "Esther 8:16",
        relevance:
          "Purim narrative of preemptive self-defense used to justify military action timing.",
        usedBy: "israel_far_right",
      },
      {
        text: "If I forget thee, O Jerusalem, let my right hand forget her cunning.",
        source: "Psalm 137:5",
        relevance:
          "Temple Mount sovereignty claims tied to territorial assertion probability.",
        usedBy: "israel_far_right",
      },
    ],
    pastDecisions: [
      {
        date: "2023-07-25",
        action: "Temple Mount visit during Tisha B'Av",
        context: "Annual provocative visit during mourning period",
        outcome:
          "International condemnation, Palestinian protests, brief escalation",
        calendarProximity: "tisha_bav",
      },
      {
        date: "2024-04-01",
        action: "Damascus consulate strike",
        context: "Escalation against Iranian proxies",
        outcome: "Iranian retaliatory drone/missile attack April 13-14",
        calendarProximity: null,
      },
    ],
    beliefFramework:
      "Religious-nationalist coalition driven by biblical land claims, messianic settlement ideology, and existential threat framing. Calendar events (Purim, Tisha B'Av) are not just cultural but operationally significant.",
    decisionPattern:
      "Provocative actions cluster around religious calendar events. Military decisions framed through existential lens. Coalition dynamics mean hardline positions win internal debates.",
  },

  iran_irgc: {
    publicStatements: [
      {
        date: "2024-04-14",
        quote: "The era of patience with the Zionist regime is over.",
        context: "Statement before Operation True Promise",
        source: "IRGC official statement",
        significance: "critical",
      },
      {
        date: "2024-01-03",
        quote:
          "The blood of Martyr Soleimani will not go unavenged.",
        context: "Anniversary of Soleimani assassination",
        source: "Supreme Leader address",
        significance: "high",
      },
    ],
    scriptureReferences: [
      {
        text: "Fight in the way of Allah those who fight you, but do not transgress.",
        source: "Quran 2:190",
        relevance:
          "Defensive jihad framing for retaliatory operations. Shapes timing around Ramadan (reduced operations) and Quds Day (heightened rhetoric).",
        usedBy: "iran_irgc",
      },
    ],
    pastDecisions: [
      {
        date: "2024-04-13",
        action: "Operation True Promise, 300+ drones and missiles at Israel",
        context: "Retaliation for Damascus consulate strike",
        outcome: "Most intercepted, limited damage, strategic deterrence message sent",
        calendarProximity: null,
      },
      {
        date: "2020-01-08",
        action: "Missile strike on Ain al-Asad airbase",
        context: "Retaliation for Soleimani killing",
        outcome: "Calibrated response, no US casualties, de-escalation",
        calendarProximity: null,
      },
    ],
    beliefFramework:
      "Resistance axis ideology. Strategic patience combined with calibrated retaliation. Religious calendar (Ramadan) genuinely constrains offensive operations. Quds Day is a mobilization multiplier.",
    decisionPattern:
      "Retaliatory, not initiating. Calibrated to send message without triggering full escalation. Timing influenced by Islamic calendar and regional proxy readiness.",
  },

  china_pla: {
    publicStatements: [
      {
        date: "2024-10-14",
        quote: "Joint Sword-2024B exercises are a stern warning to separatists.",
        context: "Military exercises around Taiwan",
        source: "PLA Eastern Theater Command",
        significance: "high",
      },
    ],
    scriptureReferences: [],
    pastDecisions: [
      {
        date: "2022-08-04",
        action: "Unprecedented military exercises around Taiwan",
        context: "Response to Pelosi visit",
        outcome: "New normal established for PLA operations near Taiwan median line",
        calendarProximity: null,
      },
    ],
    beliefFramework:
      "Century of humiliation narrative. Taiwan as core interest non-negotiable. Economic development as primary legitimacy source. Military action reserved for existential sovereignty threats.",
    decisionPattern:
      "Gradual salami tactics with periodic shows of force. NPC sessions produce economic policy shifts. National Day linked to military displays. Spring Festival is a genuine operational pause.",
  },

  russia_kremlin: {
    publicStatements: [
      {
        date: "2024-05-09",
        quote: "Russia's strategic forces are always in a state of combat readiness.",
        context: "Victory Day parade",
        source: "Putin address",
        significance: "high",
      },
    ],
    scriptureReferences: [],
    pastDecisions: [
      {
        date: "2022-02-24",
        action: "Full-scale invasion of Ukraine",
        context: "Post-Olympics, pre-spring thaw",
        outcome: "Protracted conflict, sanctions regime, global energy restructuring",
        calendarProximity: null,
      },
    ],
    beliefFramework:
      "Great power revisionism. NATO expansion as existential threat. Victory Day as central mobilization narrative. Orthodox Christmas used for ceasefire signaling.",
    decisionPattern:
      "Major operations launched in winter/early spring (ground conditions). Victory Day used for narrative escalation. Orthodox holidays create temporary diplomatic windows.",
  },

  dprk: {
    publicStatements: [
      {
        date: "2024-04-15",
        quote: "Our nuclear deterrent will be further strengthened.",
        context: "Day of the Sun celebrations",
        source: "KCNA",
        significance: "medium",
      },
    ],
    scriptureReferences: [],
    pastDecisions: [
      {
        date: "2017-09-03",
        action: "Sixth nuclear test",
        context: "Escalation cycle with Trump administration",
        outcome: "Sanctions tightened, eventually led to Singapore summit",
        calendarProximity: "party_founding",
      },
    ],
    beliefFramework:
      "Juche ideology. Regime survival as sole objective. Nuclear weapons as existential guarantee. Personality cult calendar drives provocation timing.",
    decisionPattern:
      "Provocation peaks around Kim Il-sung birthday (April 15) and Party founding (Oct 10). Missile tests as attention-seeking mechanism. Diplomatic openings as sanctions relief plays.",
  },

  saudi_mbs: {
    publicStatements: [],
    scriptureReferences: [],
    pastDecisions: [
      {
        date: "2023-10-01",
        action: "OPEC+ production cuts extended",
        context: "Oil price management",
        outcome: "Oil prices stabilized above $80",
        calendarProximity: null,
      },
    ],
    beliefFramework:
      "Vision 2030 modernization. Pragmatic balancing between US alliance and diversification. Hajj season used for quiet diplomacy. OPEC decisions avoid Ramadan.",
    decisionPattern:
      "Economic decisions dominate. Military adventurism has decreased post-Yemen. Hajj period enables backchannel diplomacy. Oil output decisions timed around OPEC meetings, avoiding sacred periods.",
  },

  turkey_erdogan: {
    publicStatements: [],
    scriptureReferences: [],
    pastDecisions: [
      {
        date: "2019-10-09",
        action: "Operation Peace Spring in northeast Syria",
        context: "Post-US withdrawal from northern Syria",
        outcome: "Buffer zone established, Kurdish forces displaced",
        calendarProximity: null,
      },
    ],
    beliefFramework:
      "Neo-Ottoman regional influence. Balancing NATO membership with independent foreign policy. Domestic political survival drives external actions. Islamic identity as soft power tool.",
    decisionPattern:
      "Military operations in Syria/Iraq driven by domestic politics and Kurdish threat perception. Economic volatility creates pressure for external distractions. Ramadan reduces military tempo.",
  },

  us_executive: {
    publicStatements: [
      {
        date: "2025-02-01",
        quote: "We're putting America first, and that means tariffs on everyone who's been ripping us off.",
        context: "Tariff escalation on Canada, Mexico, China, EU",
        source: "Presidential remarks",
        significance: "critical",
      },
      {
        date: "2024-10-01",
        quote: "Iran will face consequences if it attacks Israel.",
        context: "Middle East escalation",
        source: "White House statement",
        significance: "high",
      },
    ],
    scriptureReferences: [],
    pastDecisions: [
      {
        date: "2025-02-04",
        action: "25% tariffs on Canada and Mexico, 10% on China",
        context: "Trade war escalation, fentanyl pretext",
        outcome: "Market sell-off, retaliatory tariffs, supply chain disruption",
        calendarProximity: null,
      },
      {
        date: "2024-04-14",
        action: "Coordinated defense of Israel against Iranian drone/missile attack",
        context: "Operation True Promise response",
        outcome: "Most projectiles intercepted, coalition defense demonstrated",
        calendarProximity: null,
      },
      {
        date: "2022-08-09",
        action: "CHIPS Act signed, semiconductor export controls on China",
        context: "US-China tech competition",
        outcome: "Reshoring investment wave, TSMC Arizona fab, China chip development accelerated",
        calendarProximity: null,
      },
    ],
    beliefFramework:
      "American exceptionalism and primacy. Oscillates between internationalism and isolationism depending on administration. Currently in economic nationalist phase with tariff-centric foreign policy. Israel alliance as bipartisan constant. China as primary strategic competitor.",
    decisionPattern:
      "Election cycles dominate timing. Tariff and sanctions actions cluster in politically useful windows. Military action requires Congressional consultation theater but executive has wide latitude. First 100 days of new administration produce maximum policy change velocity.",
  },

  us_congress: {
    publicStatements: [
      {
        date: "2024-04-20",
        quote: "We will not fund endless wars while our border remains open.",
        context: "Ukraine/Israel funding debate",
        source: "House Republican caucus",
        significance: "high",
      },
    ],
    scriptureReferences: [],
    pastDecisions: [
      {
        date: "2023-10-01",
        action: "Government shutdown over spending disagreements",
        context: "Debt ceiling and appropriations fight",
        outcome: "45-day CR, Speaker McCarthy ousted",
        calendarProximity: "debt_ceiling",
      },
      {
        date: "2024-04-24",
        action: "Passed $95B aid package for Ukraine, Israel, Taiwan",
        context: "Months of delay, bipartisan coalition",
        outcome: "Aid delivered, political cost to Speaker Johnson from right flank",
        calendarProximity: null,
      },
    ],
    beliefFramework:
      "Institutional dysfunction as feature. Polarization creates policy paralysis except in crisis. Debt ceiling as recurring leverage point. Foreign aid increasingly partisan. Defense spending bipartisan floor. Midterm elections create 2-year action windows.",
    decisionPattern:
      "Legislative calendar drives everything. Debt ceiling deadlines create fiscal brinkmanship (X-date pressure). Government funding expires September 30 annually. NDAA passage is annual defense policy vehicle. Recess periods reduce legislative output but increase constituent pressure.",
  },

  us_fed: {
    publicStatements: [
      {
        date: "2024-08-23",
        quote: "The time has come for policy to adjust.",
        context: "Jackson Hole speech signaling rate cuts",
        source: "Fed Chair Powell",
        significance: "critical",
      },
      {
        date: "2022-08-26",
        quote: "We must keep at it until the job is done.",
        context: "Jackson Hole, inflation fighting commitment",
        source: "Fed Chair Powell",
        significance: "critical",
      },
    ],
    scriptureReferences: [],
    pastDecisions: [
      {
        date: "2024-09-18",
        action: "50bp rate cut (first cut since 2020)",
        context: "Inflation declining, labor market softening",
        outcome: "Markets rallied, dollar weakened, rate cut cycle begun",
        calendarProximity: "fomc_meeting",
      },
      {
        date: "2022-03-16",
        action: "First rate hike of tightening cycle",
        context: "Inflation at 40-year highs post-COVID",
        outcome: "525bp total hikes over 16 months, SVB collapse, bond market carnage",
        calendarProximity: "fomc_meeting",
      },
    ],
    beliefFramework:
      "Dual mandate: price stability and maximum employment. Independence from political pressure (tested but maintained). Data-dependent decision making with forward guidance as tool. Dot plot as expectations management. Balance sheet as second policy lever.",
    decisionPattern:
      "Almost exclusively acts at scheduled FOMC meetings (8x/year). Emergency inter-meeting actions only in genuine crises (March 2020). Jackson Hole used for major framework signals. Press conferences after every meeting since 2019. Dot plot projections in March, June, September, December.",
  },

  uk_government: {
    publicStatements: [
      {
        date: "2024-10-30",
        quote: "This budget fixes the foundations of our economy.",
        context: "First Labour budget in 14 years",
        source: "Chancellor Rachel Reeves",
        significance: "high",
      },
    ],
    scriptureReferences: [],
    pastDecisions: [
      {
        date: "2022-09-23",
        action: "Truss mini-budget with unfunded tax cuts",
        context: "New PM Liz Truss first fiscal event",
        outcome: "Gilt market crash, GBP collapse, pension fund crisis, PM resignation in 45 days",
        calendarProximity: "uk_budget",
      },
      {
        date: "2024-07-04",
        action: "General election, Labour landslide",
        context: "14 years of Conservative government",
        outcome: "Massive majority, fiscal tightening, public investment pivot",
        calendarProximity: null,
      },
    ],
    beliefFramework:
      "Post-Brexit identity recalibration. Special relationship with US as anchor. Five Eyes intelligence sharing as force multiplier. Global Britain aspiration vs fiscal constraints. City of London as financial hub defense. NHS and public services as political third rail.",
    decisionPattern:
      "Budget/Autumn Statement as primary economic policy vehicle. BOE operates independently but government fiscal policy constrains monetary space. Foreign policy follows US lead on major issues. Defense spending under NATO 2% pressure. General elections every 4-5 years create uncertainty windows.",
  },

  eu_commission: {
    publicStatements: [
      {
        date: "2024-06-12",
        quote: "We are imposing definitive countervailing duties on Chinese electric vehicles.",
        context: "EU-China trade tensions",
        source: "European Commission",
        significance: "high",
      },
    ],
    scriptureReferences: [],
    pastDecisions: [
      {
        date: "2022-02-25",
        action: "Swift sanctions on Russia, energy import restrictions",
        context: "Response to Ukraine invasion",
        outcome: "Energy crisis, industrial restructuring, LNG dependence shift",
        calendarProximity: null,
      },
      {
        date: "2024-06-01",
        action: "EU election produced rightward shift",
        context: "European Parliament elections",
        outcome: "Greens lost seats, far-right gained. Policy shift on migration, green deal slowdown.",
        calendarProximity: "eu_elections",
      },
    ],
    beliefFramework:
      "Rules-based multilateral order. Strategic autonomy aspiration vs transatlantic dependence reality. Single market as primary tool of influence. Regulatory superpower (Brussels effect). Consensus-based decision making creates slow but sticky policy. Energy security as post-Ukraine existential priority.",
    decisionPattern:
      "EU Council summits (quarterly minimum) produce collective decisions. Unanimous requirements for foreign policy create vetoes (Hungary). Commission proposes, Council disposes. European Parliament increasingly assertive. Budget cycle (7-year MFF) constrains spending. European elections every 5 years reshuffle priorities.",
  },

  eu_ecb: {
    publicStatements: [
      {
        date: "2024-06-06",
        quote: "The Governing Council today decided to lower the three key ECB interest rates by 25 basis points.",
        context: "First rate cut after historic tightening cycle",
        source: "ECB press release",
        significance: "critical",
      },
      {
        date: "2012-07-26",
        quote: "Within our mandate, the ECB is ready to do whatever it takes to preserve the euro. And believe me, it will be enough.",
        context: "Eurozone sovereign debt crisis",
        source: "ECB President Draghi",
        significance: "critical",
      },
    ],
    scriptureReferences: [],
    pastDecisions: [
      {
        date: "2022-07-21",
        action: "First rate hike in 11 years (50bp)",
        context: "Inflation spike post-COVID, energy crisis",
        outcome: "450bp total hikes, peripheral spread management via TPI",
        calendarProximity: "ecb_meeting",
      },
    ],
    beliefFramework:
      "Price stability mandate (2% target). Transmission Protection Instrument as anti-fragmentation tool. Navigating diverse economies with single monetary policy. Independence from political pressure (stronger than Fed historically). Quantitative tightening as parallel tool.",
    decisionPattern:
      "Governing Council meetings every 6 weeks. Staff projections in March, June, September, December inform decisions. Press conferences are primary communication tool. Lagarde tends to signal ahead more than Draghi. Minutes released with 4-week lag.",
  },

  japan_government: {
    publicStatements: [
      {
        date: "2024-04-10",
        quote: "Japan-US alliance has never been stronger.",
        context: "PM Kishida address to US Congress",
        source: "Japanese PM",
        significance: "high",
      },
    ],
    scriptureReferences: [],
    pastDecisions: [
      {
        date: "2022-12-16",
        action: "Doubling defense budget to 2% GDP over 5 years",
        context: "China threat, North Korea missiles, Russia-Ukraine",
        outcome: "Largest military buildup since WWII, counterstrike capability acquired",
        calendarProximity: null,
      },
      {
        date: "2024-04-01",
        action: "JPY intervention after breach of 152",
        context: "Yen weakness threatening inflation imports",
        outcome: "Temporary JPY strengthening, estimated $60B+ intervention",
        calendarProximity: null,
      },
    ],
    beliefFramework:
      "Post-WWII pacifist constitution evolving toward 'normal country' defense posture. US alliance as cornerstone. China and DPRK as primary threats. Senkaku sovereignty non-negotiable. Economic security doctrine (supply chain resilience). Demographic crisis shaping all policy.",
    decisionPattern:
      "Consensus-driven decision making. BOJ independence but government pressure on YCC and intervention. Defense budget decisions annual. JPY intervention coordinated with MOF. Diet (parliament) sessions constrain legislative calendar. LDP leadership elections create policy pivot windows.",
  },

  japan_boj: {
    publicStatements: [
      {
        date: "2024-03-19",
        quote: "We judged it appropriate to revise our monetary policy framework.",
        context: "End of negative interest rates and YCC",
        source: "BOJ Governor Ueda",
        significance: "critical",
      },
    ],
    scriptureReferences: [],
    pastDecisions: [
      {
        date: "2024-03-19",
        action: "Ended negative interest rates and YCC after 8 years",
        context: "Inflation finally reaching 2% target sustainably",
        outcome: "JPY initially strengthened then weakened further. Historic policy normalization.",
        calendarProximity: "boj_meeting",
      },
      {
        date: "2024-07-31",
        action: "Surprise rate hike to 0.25%",
        context: "JPY weakness, inflation persistence",
        outcome: "Global carry trade unwind, Nikkei crashed 12% in single day, VIX spiked to 65",
        calendarProximity: "boj_meeting",
      },
    ],
    beliefFramework:
      "Decades of deflation trauma. 2% inflation target treated as aspiration not ceiling. Yield curve control as unique policy innovation. Government bond market functioning as constraint. JPY as unintended policy transmission channel. Carry trade dynamics as systemic risk.",
    decisionPattern:
      "BOJ meetings 8x/year. Surprise policy shifts more common than Fed (YCC tweak Dec 2022, rate hike Jul 2024). Tankan survey quarterly shapes expectations. Governor press conferences after every meeting. Summary of Opinions released with delay. MOF-BOJ coordination on intervention.",
  },

  south_korea: {
    publicStatements: [
      {
        date: "2024-01-01",
        quote: "If provoked, we will punish North Korea many times over.",
        context: "New Year address after DPRK satellite launches",
        source: "President Yoon",
        significance: "high",
      },
    ],
    scriptureReferences: [],
    pastDecisions: [
      {
        date: "2023-04-26",
        action: "Washington Declaration, US nuclear umbrella extension",
        context: "Strengthening deterrence against DPRK",
        outcome: "Nuclear Consultative Group established, SSBN port visits",
        calendarProximity: null,
      },
      {
        date: "2024-12-03",
        action: "President Yoon declared martial law (6 hours)",
        context: "Political crisis, opposition majority in National Assembly",
        outcome: "Martial law reversed, impeachment proceedings, KRW crashed, KOSPI volatility",
        calendarProximity: null,
      },
    ],
    beliefFramework:
      "DPRK existential threat as national consensus. US alliance as security cornerstone. Semiconductor/shipbuilding as strategic industries. Japan relationship complicated by historical grievances. China as largest trade partner but security threat. Domestic political polarization between progressive and conservative camps.",
    decisionPattern:
      "Joint US-ROK exercises (spring, summer) create regular tension cycles with DPRK. Presidential single 5-year term creates urgency. National Assembly elections (every 4 years) constrain policy. BOK follows Fed with lag. Chaebols influence economic policy. Domestic political crises can produce extreme actions (martial law).",
  },

  india_modi: {
    publicStatements: [
      {
        date: "2024-02-22",
        quote: "India is the mother of democracy and the pharmacy of the world.",
        context: "Addressing business leaders",
        source: "PM Modi",
        significance: "medium",
      },
    ],
    scriptureReferences: [],
    pastDecisions: [
      {
        date: "2019-02-26",
        action: "Balakot airstrike in Pakistan",
        context: "Retaliation for Pulwama attack, election season",
        outcome: "Aerial engagement, Pakistan retaliation, tensions de-escalated, Modi won election",
        calendarProximity: "indian_elections",
      },
      {
        date: "2020-06-15",
        action: "Galwan Valley clash with China PLA",
        context: "Border dispute in Ladakh",
        outcome: "20 Indian soldiers killed, China casualties undisclosed, relations frozen",
        calendarProximity: null,
      },
    ],
    beliefFramework:
      "Hindu nationalist civilizational state narrative. Strategic autonomy (multi-alignment, not non-alignment). Quad participation but BRICS membership. Oil buyer pragmatism (Russia, Iran, Saudi). Kashmir as integral territory. Pakistan as permanent threat. China as primary border challenge. Digital India and manufacturing as development strategy.",
    decisionPattern:
      "Election cycle dominates (general elections every 5 years, state elections continuous). Surgical strikes and military actions used for electoral benefit. Republic Day as diplomatic signaling (chief guest selection). Budget session (February) for economic policy. Look East/Act East for ASEAN engagement. G20 presidency (2023) elevated global positioning.",
  },

  pakistan_military: {
    publicStatements: [],
    scriptureReferences: [],
    pastDecisions: [
      {
        date: "2019-02-27",
        action: "Shot down Indian MiG-21, captured pilot Wing Commander Abhinandan",
        context: "Response to Balakot airstrike",
        outcome: "Pilot returned as 'peace gesture', de-escalation, both sides claimed victory",
        calendarProximity: null,
      },
    ],
    beliefFramework:
      "Military as guardian of national security and nuclear deterrent. India as existential rival. Kashmir as core issue. Afghanistan as strategic depth (disrupted by Taliban). China as 'iron brother' and CPEC partner. US relationship transactional. Nuclear weapons as equalizer against conventionally superior India.",
    decisionPattern:
      "Military establishment makes foreign policy and security decisions regardless of civilian government. Nuclear deterrent creates crisis stability ceiling. Kashmir escalation followed by backchannel de-escalation is standard pattern. CPEC projects create China dependency. IMF bailouts create fiscal pressure windows.",
  },

  houthis: {
    publicStatements: [
      {
        date: "2024-01-12",
        quote: "We will continue to target ships heading to Israeli ports until the aggression on Gaza stops.",
        context: "Red Sea shipping attacks",
        source: "Ansar Allah military spokesman",
        significance: "critical",
      },
    ],
    scriptureReferences: [
      {
        text: "And fight in the way of Allah those who fight you.",
        source: "Quran 2:190",
        relevance: "Defensive jihad framing for Red Sea operations. Positions shipping attacks as defense of Palestinian cause.",
        usedBy: "houthis",
      },
    ],
    pastDecisions: [
      {
        date: "2024-01-11",
        action: "Sustained Red Sea shipping attacks, anti-ship missiles and drones",
        context: "Gaza war solidarity, Bab el-Mandeb chokepoint leverage",
        outcome: "Global shipping rerouted around Cape of Good Hope, insurance costs spiked, Suez revenue collapsed",
        calendarProximity: null,
      },
      {
        date: "2024-10-19",
        action: "Ballistic missile fired at central Israel",
        context: "Escalation of support for Gaza/Lebanon fronts",
        outcome: "Intercepted, but demonstrated increased range and capability",
        calendarProximity: null,
      },
    ],
    beliefFramework:
      "Resistance axis member. Anti-Saudi and anti-Israel positioning as identity. Red Sea chokepoint as asymmetric leverage. Iranian material and strategic support. Zaidi Shia identity distinct from Iranian Twelver Shiism but aligned politically. 'Death to America, death to Israel' as institutional slogan.",
    decisionPattern:
      "Asymmetric warfare specialist. Red Sea attacks calibrated to maintain pressure without triggering full US engagement. Coordinates with Iran and Hezbollah on escalation timing. Drone and missile technology steadily improving. Ramadan produces slight reduction in tempo but not cessation. Quds Day produces spike in attacks.",
  },

  hezbollah: {
    publicStatements: [
      {
        date: "2024-09-19",
        quote: "We have entered a new phase of the battle.",
        context: "After pager/radio explosions attributed to Israel",
        source: "Hezbollah leadership",
        significance: "critical",
      },
    ],
    scriptureReferences: [
      {
        text: "The party of Allah will be victorious.",
        source: "Quran 5:56",
        relevance: "Organizational name derives from this verse. Victory narrative central to institutional identity and recruitment.",
        usedBy: "hezbollah",
      },
    ],
    pastDecisions: [
      {
        date: "2024-10-08",
        action: "Cross-border rocket attacks on northern Israel",
        context: "Support front for Gaza, tit-for-tat escalation",
        outcome: "Israeli ground invasion of southern Lebanon, massive displacement",
        calendarProximity: null,
      },
      {
        date: "2006-07-12",
        action: "Cross-border raid capturing two IDF soldiers",
        context: "Deterrence and prisoner exchange leverage",
        outcome: "34-day war, massive destruction in Lebanon, UN Resolution 1701",
        calendarProximity: null,
      },
    ],
    beliefFramework:
      "Resistance axis senior member. Lebanese political party and military organization simultaneously. Iranian strategic ally and proxy. Anti-Israel resistance as raison d'etre. Deterrence through precision missile arsenal. Ashura as peak mobilization narrative.",
    decisionPattern:
      "Strategic patience with calibrated escalation. Does not initiate all-out war without Iranian green light. Tit-for-tat responses to Israeli strikes maintain deterrence equilibrium. Ashura speeches as strategic communication vehicle. Ramadan reduces offensive tempo. Post-2024 war significantly degraded but rebuilding.",
  },

  hamas: {
    publicStatements: [
      {
        date: "2023-10-07",
        quote: "This is the day of the greatest battle to end the last occupation on earth.",
        context: "October 7 Al-Aqsa Flood operation launch",
        source: "Muhammad Deif, Izz ad-Din al-Qassam Brigades",
        significance: "critical",
      },
    ],
    scriptureReferences: [
      {
        text: "And prepare against them whatever you are able of power and of steeds of war by which you may terrify the enemy of Allah.",
        source: "Quran 8:60",
        relevance: "Military preparation as religious obligation. Frames armed resistance as divine mandate.",
        usedBy: "hamas",
      },
    ],
    pastDecisions: [
      {
        date: "2023-10-07",
        action: "Al-Aqsa Flood, multi-front assault on southern Israel",
        context: "Normalization deals, Al-Aqsa tensions, siege fatigue",
        outcome: "1,200 Israelis killed, hostages taken. Triggered massive IDF Gaza operation, tens of thousands of Palestinian casualties.",
        calendarProximity: null,
      },
      {
        date: "2021-05-10",
        action: "Rocket barrage on Jerusalem and central Israel",
        context: "Sheikh Jarrah evictions, Al-Aqsa Ramadan clashes",
        outcome: "11-day conflict, ceasefire brokered",
        calendarProximity: "ramadan",
      },
    ],
    beliefFramework:
      "Islamic resistance movement. Armed struggle for Palestinian liberation and return. Al-Aqsa Mosque as central mobilization symbol. Rejection of Oslo framework. Normalization deals (Abraham Accords) as existential threat. Martyrdom culture. Ramadan as tension amplifier around Al-Aqsa. Nakba Day as annual mobilization anchor.",
    decisionPattern:
      "Surprise attacks designed for strategic shock. Ramadan Al-Aqsa tensions as escalation trigger. Nakba Day (May 15) as annual mobilization point. Hostage-taking as leverage strategy. Rocket barrages calibrated to provoke overreaction. Tunnel infrastructure as asymmetric advantage.",
  },

  al_qaeda: {
    publicStatements: [
      {
        date: "2024-09-11",
        quote: "Strike the enemies of Islam wherever you find them.",
        context: "Anniversary call for attacks",
        source: "Al-Qaeda central media",
        significance: "medium",
      },
    ],
    scriptureReferences: [
      {
        text: "Fight them until there is no more fitnah and worship is for Allah alone.",
        source: "Quran 2:193",
        relevance: "Offensive jihad framing. AQ interpretation extends fighting obligation globally, unlike most Islamic scholars.",
        usedBy: "al_qaeda",
      },
    ],
    pastDecisions: [
      {
        date: "2001-09-11",
        action: "September 11 attacks on US homeland",
        context: "Strategic shock to draw US into prolonged Middle East wars",
        outcome: "Global War on Terror, Afghanistan invasion, Iraq invasion, AQ core degraded but ideology spread",
        calendarProximity: null,
      },
    ],
    beliefFramework:
      "Global jihadist ideology (far enemy strategy). Targets Western powers directly rather than local regimes (unlike original Islamic insurgencies). Franchise model through AQAP, AQIM, JNIM, Al-Shabaab. Zawahiri death (2022) created leadership vacuum. Anniversary attacks as signature. Weakened but franchise affiliates active in Sahel and Yemen.",
    decisionPattern:
      "Spectacular attacks on symbolic dates and targets. Anniversary pattern (9/11 as recurring threat window). Franchise affiliates operate semi-independently. AQAP in Yemen most operational. Sahel affiliates (JNIM) expanding. Competes with ISIS for jihadist recruits. Long planning cycles for major operations.",
  },

  isis: {
    publicStatements: [
      {
        date: "2024-03-22",
        quote: "Soldiers of the Caliphate carried out the attack.",
        context: "Crocus City Hall attack, Moscow",
        source: "Amaq News Agency",
        significance: "critical",
      },
    ],
    scriptureReferences: [
      {
        text: "And kill them wherever you find them.",
        source: "Quran 2:191 (decontextualized)",
        relevance: "ISIS strips defensive context from Quranic verses to justify offensive violence. Most Islamic scholars reject this interpretation.",
        usedBy: "isis",
      },
    ],
    pastDecisions: [
      {
        date: "2024-03-22",
        action: "Crocus City Hall attack, Moscow (ISIS-K)",
        context: "ISIS-Khorasan demonstrating global reach",
        outcome: "145 killed, Russia initially blamed Ukraine, eventual acknowledgment of ISIS-K",
        calendarProximity: "ramadan",
      },
      {
        date: "2024-01-03",
        action: "Twin bombings in Kerman, Iran (ISIS)",
        context: "Soleimani anniversary commemoration",
        outcome: "95 killed at Soleimani memorial, demonstrated ability to strike inside Iran",
        calendarProximity: "soleimani_anniversary",
      },
    ],
    beliefFramework:
      "Apocalyptic Salafi-jihadism. Caliphate as theological requirement (unlike AQ which defers). ISIS-K (Khorasan) as most active branch. Takfiri ideology (declares other Muslims apostates). Ramadan as 'month of conquest' (opposite of most Islamic groups). Targets Shia as primary 'near enemy'. Territorial caliphate lost but insurgency continues in Syria/Iraq. Global franchise model: ISIS-K, ISIS-W (West Africa), ISIS-M (Mozambique).",
    decisionPattern:
      "Ramadan produces INCREASED attacks (unique among Islamic groups, they frame it as sacred warfare month). Anniversary attacks at Soleimani shrine. ISIS-K most operationally capable branch. Targets designed for maximum civilian casualties and media impact. Self-radicalized lone actors as force multiplier. Amaq news agency claims operations.",
  },

  wagner_africa_corps: {
    publicStatements: [],
    scriptureReferences: [],
    pastDecisions: [
      {
        date: "2023-06-24",
        action: "Prigozhin mutiny, march on Moscow",
        context: "Dispute with Russian MOD over Ukraine war management",
        outcome: "Aborted march, Prigozhin killed August 2023, Wagner rebranded as Africa Corps under GRU control",
        calendarProximity: null,
      },
      {
        date: "2024-07-27",
        action: "Mali rebels destroyed Wagner column in Tinzaouaten",
        context: "Wagner supporting Malian junta against Tuareg rebels",
        outcome: "Significant casualties, exposed Africa Corps vulnerabilities without Prigozhin leadership",
        calendarProximity: null,
      },
    ],
    beliefFramework:
      "Russian state proxy rebranded after Prigozhin death. Resource extraction (gold, diamonds, oil) as funding model. Security services for autocratic regimes in exchange for mining rights. GRU oversight post-2023. Active in Mali, Burkina Faso, Niger, CAR, Libya, Syria. Anti-Western narrative as partnership offering to post-colonial African states.",
    decisionPattern:
      "Deploys to countries that expel French/Western forces. Mining concessions as payment. Training local militaries while extracting resources. Operates in information warfare alongside military deployment. Post-Prigozhin, more disciplined but less entrepreneurial. Africa Corps expansion driven by Sahel coup wave (2020-2023).",
  },

  pmc_iran_proxies: {
    publicStatements: [
      {
        date: "2024-01-28",
        quote: "The Islamic Resistance in Iraq will continue to target American occupation forces.",
        context: "After drone attack killed 3 US soldiers at Tower 22, Jordan",
        source: "Islamic Resistance in Iraq umbrella",
        significance: "critical",
      },
    ],
    scriptureReferences: [],
    pastDecisions: [
      {
        date: "2024-01-28",
        action: "Drone attack on Tower 22 base, Jordan, killing 3 US soldiers",
        context: "Resistance Axis escalation during Gaza war",
        outcome: "US retaliatory strikes on 85 targets in Iraq and Syria, temporary attack pause",
        calendarProximity: null,
      },
    ],
    beliefFramework:
      "Resistance axis members operating under Iranian strategic umbrella. Kataib Hezbollah, Harakat al-Nujaba, Asaib Ahl al-Haq as primary groups. Anti-US occupation narrative. Shia identity linked to Iranian revolutionary ideology. Operate within Iraqi political system simultaneously (ministers, parliament members). Use 'Islamic Resistance in Iraq' brand for deniability.",
    decisionPattern:
      "Attacks on US bases in Iraq/Syria coordinated with broader Iranian strategic signaling. Quds Day and Soleimani anniversary as peak provocation windows. Temporarily pause when Iran signals de-escalation. Escalate when Iran wants pressure on US without direct confrontation. Iranian IRGC Quds Force as command structure.",
  },

  nato: {
    publicStatements: [
      {
        date: "2024-07-10",
        quote: "Ukraine's future is in NATO.",
        context: "Washington Summit declaration",
        source: "NATO communique",
        significance: "high",
      },
    ],
    scriptureReferences: [],
    pastDecisions: [
      {
        date: "2023-04-04",
        action: "Finland joined NATO (31st member)",
        context: "Russia-Ukraine war driving Nordic expansion",
        outcome: "Russia's border with NATO doubled, strategic failure for Putin's stated war aims",
        calendarProximity: null,
      },
      {
        date: "2024-03-07",
        action: "Sweden joined NATO (32nd member)",
        context: "Post-Erdogan deal, Turkey lifted veto",
        outcome: "Baltic Sea effectively becomes NATO lake, Russian Kaliningrad further isolated",
        calendarProximity: null,
      },
    ],
    beliefFramework:
      "Collective defense under Article 5. Consensus-based decision making (all 32 members). Transatlantic unity as core value. 2% GDP defense spending target. Nuclear sharing arrangements. Deterrence through conventional and nuclear capability. Rules-based international order.",
    decisionPattern:
      "Summits (annual) produce major strategic decisions. Secretary General as consensus builder. Consensus requirement means single member can block (Turkey pattern). Rapid response forces on rotation. Enhanced Forward Presence in Baltics and Poland. Nuclear posture reviews periodic. Defense spending reviews annual.",
  },
};

// ── Core Functions ──

/**
 * Get the full extended profile for an actor, including knowledge bank data.
 */
export async function getExtendedActorProfile(
  actorId: string,
  options?: { skipKnowledge?: boolean }
): Promise<ExtendedActorProfile | null> {
  const base = ACTOR_PROFILES.find((a) => a.id === actorId);
  if (!base) return null;

  const calendarModifiers = CALENDAR_BEHAVIOR_MODIFIERS.filter(
    (m) => m.actorId === actorId
  );

  const extended = EXTENDED_DATA[actorId] || {
    publicStatements: [],
    scriptureReferences: [],
    pastDecisions: [],
    beliefFramework: "No extended profile data available.",
    decisionPattern: "No decision pattern data available.",
  };

  // Search knowledge bank for related entries (skip when loading all profiles
  // to avoid 26 sequential vector searches that cause timeouts)
  let knowledgeCount = 0;
  if (!options?.skipKnowledge) {
    try {
      const knowledgeResults = await searchKnowledge(base.name, {
        limit: 5,
        useVector: false, // text search only -- vector search is too slow per-actor
      });
      knowledgeCount = knowledgeResults.length;
    } catch {
      // best effort
    }
  }

  return {
    base,
    calendarModifiers,
    publicStatements: extended.publicStatements,
    scriptureReferences: extended.scriptureReferences,
    pastDecisions: extended.pastDecisions,
    beliefFramework: extended.beliefFramework,
    decisionPattern: extended.decisionPattern,
    knowledgeBankEntries: knowledgeCount,
  };
}

/**
 * Get all actor profiles with their extended data.
 */
export async function getAllExtendedProfiles(): Promise<ExtendedActorProfile[]> {
  // Parallel with skipKnowledge to avoid 26 sequential vector searches
  const results = await Promise.all(
    ACTOR_PROFILES.map((actor) => getExtendedActorProfile(actor.id, { skipKnowledge: true }))
  );
  return results.filter((p): p is ExtendedActorProfile => p !== null);
}

/**
 * Search actors by relevance to a query (e.g. "Iran nuclear" returns iran_irgc).
 */
export function searchActors(query: string): ActorProfile[] {
  const lower = query.toLowerCase();
  return ACTOR_PROFILES.filter(
    (a) =>
      a.name.toLowerCase().includes(lower) ||
      a.country.toLowerCase().includes(lower) ||
      a.id.toLowerCase().includes(lower)
  );
}
