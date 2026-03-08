// Indications & Warnings (I&W) Threat Scenarios
// Modeled after Pentagon I&W systems with predefined indicator checklists

export type IndicatorCategory = "military" | "diplomatic" | "economic" | "cyber" | "intelligence" | "social";
export type IndicatorStatus = "inactive" | "watching" | "active" | "confirmed";

export interface Indicator {
  id: string;
  title: string;
  description: string;
  category: IndicatorCategory;
  weight: number; // 1-10
  sources: string[];
  detectionQuery: string; // keywords for auto-detection from GDELT/OSINT
}

export interface EscalationLevel {
  level: number; // 1-5
  name: string;
  description: string;
  thresholdPercent: number; // % of max weighted score to trigger
  marketImpact: string;
}

export interface ThreatScenario {
  id: string;
  name: string;
  description: string;
  region: string;
  actors: string[];
  indicators: Indicator[];
  escalationLevels: EscalationLevel[];
  marketSectors: string[];
  historicalPrecedent: string;
}

const STANDARD_ESCALATION: EscalationLevel[] = [
  { level: 1, name: "ROUTINE", description: "Normal background activity. No concerning indicators.", thresholdPercent: 0, marketImpact: "No immediate market impact expected." },
  { level: 2, name: "GUARDED", description: "Early indicators emerging. Situation bears monitoring.", thresholdPercent: 15, marketImpact: "Mild risk premium in affected sectors. Options activity may increase." },
  { level: 3, name: "ELEVATED", description: "Multiple indicators active. Pattern suggests escalation trajectory.", thresholdPercent: 35, marketImpact: "Sector rotation into defensives. Safe-haven flows beginning. Volatility rising." },
  { level: 4, name: "HIGH", description: "Significant escalation underway. Critical threshold approaching.", thresholdPercent: 60, marketImpact: "Broad risk-off. Flight to quality. Energy/defense spikes. Credit spreads widening." },
  { level: 5, name: "CRITICAL", description: "Imminent or active crisis. Maximum alert.", thresholdPercent: 80, marketImpact: "Market dislocation likely. Circuit breakers possible. Liquidity crisis risk." },
];

export const THREAT_SCENARIOS: ThreatScenario[] = [
  {
    id: "taiwan-strait",
    name: "Taiwan Strait Crisis",
    description: "PLA military action against Taiwan disrupting global semiconductor supply and triggering US/allied response.",
    region: "Indo-Pacific",
    actors: ["China", "Taiwan", "United States", "Japan", "Australia", "Philippines"],
    marketSectors: ["semiconductors", "technology", "defense", "shipping", "energy"],
    historicalPrecedent: "1995-96 Taiwan Strait Crisis, 2022 Pelosi visit escalation",
    escalationLevels: STANDARD_ESCALATION,
    indicators: [
      { id: "tw-01", title: "PLA amphibious exercises", description: "Large-scale amphibious landing exercises in Fujian province or South China Sea", category: "military", weight: 9, sources: ["OpenSky", "OSINT", "Defense media"], detectionQuery: "china amphibious exercise taiwan fujian" },
      { id: "tw-02", title: "TSMC contingency activation", description: "Reports of TSMC activating chip destruction protocols or evacuation plans", category: "economic", weight: 10, sources: ["Industry sources", "Taiwan media"], detectionQuery: "TSMC evacuation contingency chip destruction" },
      { id: "tw-03", title: "US carrier group deployments", description: "Multiple US carrier strike groups repositioning to Western Pacific", category: "military", weight: 8, sources: ["OpenSky", "Naval tracking", "DoD announcements"], detectionQuery: "US carrier strike group pacific taiwan deploy" },
      { id: "tw-04", title: "Diplomatic recalls", description: "China recalling diplomats from Taiwan-allied nations or US/allied diplomatic withdrawals", category: "diplomatic", weight: 7, sources: ["State department", "News"], detectionQuery: "china diplomat recall embassy taiwan" },
      { id: "tw-05", title: "Semiconductor stockpiling", description: "Abnormal chip inventory buildup by major manufacturers or governments", category: "economic", weight: 6, sources: ["Industry data", "Trade data"], detectionQuery: "semiconductor stockpile chip shortage inventory" },
      { id: "tw-06", title: "Chinese ADIZ incursions spike", description: "Significant increase in PLA aircraft entering Taiwan ADIZ beyond baseline", category: "military", weight: 7, sources: ["Taiwan MoD", "OSINT"], detectionQuery: "china ADIZ taiwan incursion aircraft PLA" },
      { id: "tw-07", title: "Cyber attacks on Taiwan infrastructure", description: "Coordinated cyber attacks targeting Taiwan government, military, or critical infrastructure", category: "cyber", weight: 8, sources: ["Cybersecurity firms", "Taiwan CERT"], detectionQuery: "cyber attack taiwan infrastructure hack government" },
      { id: "tw-08", title: "PLA Rocket Force movements", description: "DF-series missile deployments or Rocket Force repositioning near coast", category: "military", weight: 9, sources: ["Satellite imagery", "OSINT"], detectionQuery: "PLA rocket force missile deployment coastal" },
      { id: "tw-09", title: "Chinese national evacuations", description: "China advising nationals to leave Taiwan or nearby countries", category: "intelligence", weight: 9, sources: ["Chinese embassy notices", "Social media"], detectionQuery: "china nationals evacuate leave taiwan" },
      { id: "tw-10", title: "UN emergency sessions", description: "Emergency UNSC meetings called regarding Taiwan situation", category: "diplomatic", weight: 6, sources: ["UN", "News"], detectionQuery: "UN security council emergency taiwan" },
      { id: "tw-11", title: "Japan Self-Defense Force alerts", description: "JSDF raised alert status or mobilization of reserves", category: "military", weight: 7, sources: ["Japan MoD", "News"], detectionQuery: "japan self defense force alert mobilization taiwan" },
      { id: "tw-12", title: "Philippines base activations", description: "Enhanced Defense Cooperation Agreement bases activated or US forces surging to Philippines", category: "military", weight: 6, sources: ["Philippines DND", "US DoD"], detectionQuery: "philippines military base EDCA activation US forces" },
      { id: "tw-13", title: "SWIFT disconnection threats", description: "Discussions about disconnecting Chinese banks from SWIFT or financial sanctions preparation", category: "economic", weight: 8, sources: ["Government statements", "Financial media"], detectionQuery: "china SWIFT sanctions disconnect financial" },
      { id: "tw-14", title: "Blood reserve mobilization", description: "PLA hospitals or Chinese Red Cross blood drive surges indicating combat preparation", category: "intelligence", weight: 8, sources: ["OSINT", "Social media analysis"], detectionQuery: "china blood donation drive military hospital PLA" },
      { id: "tw-15", title: "Maritime exclusion zones", description: "China declaring maritime or aerial exclusion zones in Taiwan Strait", category: "military", weight: 10, sources: ["PLA announcements", "Maritime notices"], detectionQuery: "china exclusion zone taiwan strait maritime" },
    ],
  },
  {
    id: "iran-nuclear",
    name: "Iran Nuclear Breakout",
    description: "Iran achieves nuclear weapon capability triggering Israeli preemptive strike or regional war.",
    region: "Middle East",
    actors: ["Iran", "Israel", "United States", "Saudi Arabia", "Russia"],
    marketSectors: ["energy", "defense", "shipping", "gold"],
    historicalPrecedent: "2015 JCPOA collapse, Israeli strikes on Iraqi/Syrian reactors",
    escalationLevels: STANDARD_ESCALATION,
    indicators: [
      { id: "ir-01", title: "Enrichment level increases", description: "Iran enriching uranium above 60% or approaching 90% weapons-grade", category: "intelligence", weight: 10, sources: ["IAEA reports", "News"], detectionQuery: "iran uranium enrichment 60 90 percent weapons grade" },
      { id: "ir-02", title: "IAEA inspector expulsions", description: "Iran restricting or expelling IAEA inspectors from nuclear facilities", category: "diplomatic", weight: 9, sources: ["IAEA", "News"], detectionQuery: "iran IAEA inspector expel restrict access" },
      { id: "ir-03", title: "Underground facility construction", description: "New underground nuclear facility construction detected via satellite", category: "military", weight: 8, sources: ["Satellite imagery", "OSINT"], detectionQuery: "iran underground nuclear facility construction fordow" },
      { id: "ir-04", title: "Missile test acceleration", description: "Increased cadence of ballistic missile tests, especially MRBM/IRBM", category: "military", weight: 7, sources: ["OSINT", "Defense media"], detectionQuery: "iran missile test ballistic launch" },
      { id: "ir-05", title: "Proxy network activation", description: "Hezbollah, Hamas, Houthis, Iraqi militias showing coordinated mobilization", category: "military", weight: 8, sources: ["OSINT", "GDELT"], detectionQuery: "hezbollah houthi militia iran proxy mobilization" },
      { id: "ir-06", title: "Oil tanker seizures", description: "IRGC Navy seizing tankers in Strait of Hormuz", category: "military", weight: 7, sources: ["Maritime tracking", "News"], detectionQuery: "iran tanker seizure hormuz IRGC navy" },
      { id: "ir-07", title: "Strait of Hormuz incidents", description: "Military confrontations or mine-laying in Strait of Hormuz", category: "military", weight: 9, sources: ["Maritime tracking", "Navy reports"], detectionQuery: "hormuz incident military confrontation mine" },
      { id: "ir-08", title: "Israeli military exercises", description: "IDF conducting long-range strike exercises or aerial refueling drills", category: "military", weight: 7, sources: ["IDF", "Aviation tracking"], detectionQuery: "israel military exercise strike long range refueling" },
      { id: "ir-09", title: "US B-52/B-2 deployments", description: "US strategic bombers deployed to Middle East bases", category: "military", weight: 7, sources: ["DoD", "Aviation tracking"], detectionQuery: "B-52 B-2 bomber middle east deploy" },
      { id: "ir-10", title: "Gulf state diplomatic shifts", description: "Saudi Arabia or UAE changing diplomatic posture toward Iran", category: "diplomatic", weight: 5, sources: ["News", "Government statements"], detectionQuery: "saudi UAE iran diplomatic relations embassy" },
      { id: "ir-11", title: "Russian diplomatic cover", description: "Russia/China blocking UNSC resolutions or providing diplomatic shield", category: "diplomatic", weight: 5, sources: ["UN", "News"], detectionQuery: "russia china veto UN iran nuclear" },
      { id: "ir-12", title: "Sanctions escalation", description: "New rounds of maximum pressure sanctions on Iranian oil/banking", category: "economic", weight: 6, sources: ["OFAC", "Treasury", "News"], detectionQuery: "iran sanctions oil banking maximum pressure" },
    ],
  },
  {
    id: "russia-nato",
    name: "Russia-NATO Confrontation",
    description: "Direct military confrontation between Russia and NATO member state.",
    region: "Europe",
    actors: ["Russia", "NATO", "United States", "Poland", "Baltic States", "United Kingdom"],
    marketSectors: ["defense", "energy", "agriculture", "gold", "european-equities"],
    historicalPrecedent: "Cold War close calls, 2014 Crimea annexation, 2022 Ukraine invasion",
    escalationLevels: STANDARD_ESCALATION,
    indicators: [
      { id: "rn-01", title: "Troop buildup on NATO borders", description: "Russian forces massing near Baltic states, Poland, or Finland border", category: "military", weight: 9, sources: ["Satellite imagery", "NATO reports"], detectionQuery: "russia troops border baltic poland finland buildup" },
      { id: "rn-02", title: "Nuclear rhetoric escalation", description: "Russian leadership making explicit nuclear threats or changing nuclear doctrine", category: "military", weight: 10, sources: ["Russian government statements", "News"], detectionQuery: "russia nuclear threat doctrine tactical weapon" },
      { id: "rn-03", title: "Baltic state provocations", description: "Airspace violations, territorial water incursions, or hybrid attacks on Baltic states", category: "military", weight: 8, sources: ["NATO", "Baltic defense ministries"], detectionQuery: "russia baltic airspace violation provocation" },
      { id: "rn-04", title: "Cyber attacks on NATO infrastructure", description: "Major cyber operations against NATO member critical infrastructure", category: "cyber", weight: 8, sources: ["Cybersecurity agencies", "News"], detectionQuery: "cyber attack NATO infrastructure russia" },
      { id: "rn-05", title: "Submarine activity spikes", description: "Unusual Russian submarine deployments in Atlantic, Baltic, or Arctic", category: "military", weight: 7, sources: ["Naval intelligence", "OSINT"], detectionQuery: "russia submarine atlantic baltic deployment activity" },
      { id: "rn-06", title: "GPS jamming incidents", description: "GPS/GNSS interference affecting NATO countries aviation and military", category: "cyber", weight: 6, sources: ["Aviation authorities", "News"], detectionQuery: "GPS jamming interference russia baltic aviation" },
      { id: "rn-07", title: "Large-scale military exercises", description: "Russia conducting Zapad/Vostok-scale exercises near NATO borders", category: "military", weight: 7, sources: ["Russian MoD", "NATO"], detectionQuery: "russia military exercise zapad vostok large scale" },
      { id: "rn-08", title: "Energy supply weaponization", description: "Russia cutting gas/oil supplies to European nations", category: "economic", weight: 7, sources: ["Energy markets", "News"], detectionQuery: "russia gas oil supply cut europe pipeline" },
      { id: "rn-09", title: "Diplomatic expulsions", description: "Mass diplomatic expulsions between Russia and NATO countries", category: "diplomatic", weight: 6, sources: ["Government statements", "News"], detectionQuery: "russia diplomat expulsion embassy NATO" },
      { id: "rn-10", title: "Article 5 test incidents", description: "Incidents testing NATO's Article 5 commitment (attacks on territory, assassinations)", category: "military", weight: 9, sources: ["NATO", "News"], detectionQuery: "NATO article 5 attack territory alliance" },
      { id: "rn-11", title: "Space/satellite threats", description: "Russian anti-satellite tests or interference with NATO space assets", category: "military", weight: 7, sources: ["Space agencies", "Military"], detectionQuery: "russia anti-satellite ASAT space weapon test" },
      { id: "rn-12", title: "Information warfare campaigns", description: "Coordinated disinformation campaigns targeting NATO cohesion", category: "intelligence", weight: 5, sources: ["EU DisinfoLab", "Social media analysis"], detectionQuery: "russia disinformation campaign NATO propaganda" },
    ],
  },
  {
    id: "energy-crisis",
    name: "Global Energy Crisis",
    description: "Cascading energy supply disruptions creating global economic shock.",
    region: "Global",
    actors: ["OPEC+", "Russia", "Saudi Arabia", "Iran", "United States"],
    marketSectors: ["energy", "utilities", "transportation", "industrials", "consumer"],
    historicalPrecedent: "1973 Oil Embargo, 2022 European energy crisis",
    escalationLevels: STANDARD_ESCALATION,
    indicators: [
      { id: "ec-01", title: "OPEC+ production cuts", description: "Significant unscheduled production cuts beyond quota adjustments", category: "economic", weight: 8, sources: ["OPEC", "Energy media"], detectionQuery: "OPEC production cut output reduce barrel" },
      { id: "ec-02", title: "SPR drawdowns", description: "Major strategic petroleum reserve releases by US or IEA members", category: "economic", weight: 6, sources: ["DOE", "IEA"], detectionQuery: "strategic petroleum reserve SPR release drawdown" },
      { id: "ec-03", title: "Pipeline disruptions", description: "Physical attacks or sabotage on major oil/gas pipelines", category: "military", weight: 9, sources: ["News", "Energy media"], detectionQuery: "pipeline attack sabotage disruption oil gas" },
      { id: "ec-04", title: "Refinery attacks", description: "Attacks on major refinery complexes (Abqaiq-style)", category: "military", weight: 9, sources: ["News", "Energy media"], detectionQuery: "refinery attack drone strike oil facility" },
      { id: "ec-05", title: "LNG terminal incidents", description: "Disruptions at major LNG export/import terminals", category: "economic", weight: 7, sources: ["Energy media", "News"], detectionQuery: "LNG terminal disruption incident explosion" },
      { id: "ec-06", title: "Tanker insurance spikes", description: "War risk insurance premiums surging for key shipping routes", category: "economic", weight: 6, sources: ["Shipping data", "Insurance market"], detectionQuery: "tanker insurance premium war risk shipping" },
      { id: "ec-07", title: "Electricity grid failures", description: "Major grid instability or blackouts in large economies", category: "economic", weight: 7, sources: ["News", "Utility reports"], detectionQuery: "electricity grid failure blackout power outage" },
      { id: "ec-08", title: "Coal/gas price spikes", description: "Extreme price moves in natural gas or thermal coal markets", category: "economic", weight: 6, sources: ["Commodity markets"], detectionQuery: "natural gas coal price spike surge record" },
      { id: "ec-09", title: "Export ban cascade", description: "Multiple energy producers imposing export restrictions", category: "economic", weight: 8, sources: ["Government announcements", "News"], detectionQuery: "oil gas export ban restrict energy" },
      { id: "ec-10", title: "Political unrest in producers", description: "Instability in major oil/gas producing nations (Nigeria, Libya, Iraq, Venezuela)", category: "social", weight: 7, sources: ["GDELT", "News"], detectionQuery: "oil producer unrest protest Libya Nigeria Iraq Venezuela" },
    ],
  },
  {
    id: "china-collapse",
    name: "Chinese Economic Collapse",
    description: "Systemic financial crisis in China with global contagion.",
    region: "Asia-Pacific",
    actors: ["China", "United States", "Japan", "Australia", "EU"],
    marketSectors: ["commodities", "luxury", "industrials", "emerging-markets", "real-estate"],
    historicalPrecedent: "2015 Chinese stock crash, Japan 1990 bubble burst, Evergrande 2021",
    escalationLevels: STANDARD_ESCALATION,
    indicators: [
      { id: "cc-01", title: "Property developer defaults", description: "Major property developers defaulting on bonds beyond Evergrande precedent", category: "economic", weight: 8, sources: ["Financial media", "Bond markets"], detectionQuery: "china property developer default bond evergrande country garden" },
      { id: "cc-02", title: "Bank runs", description: "Depositor runs on Chinese banks, especially regional/shadow banks", category: "economic", weight: 9, sources: ["Social media", "News"], detectionQuery: "china bank run depositor withdrawal protest" },
      { id: "cc-03", title: "Capital flight indicators", description: "Unusual outflows from Chinese markets, crypto premium spike in China", category: "economic", weight: 7, sources: ["Capital flow data", "Crypto markets"], detectionQuery: "china capital outflow flight foreign exchange reserve" },
      { id: "cc-04", title: "Yuan devaluation pressure", description: "PBOC allowing or unable to prevent significant yuan weakening", category: "economic", weight: 8, sources: ["Forex markets", "PBOC"], detectionQuery: "yuan devaluation weaken PBOC intervention currency" },
      { id: "cc-05", title: "Trade data deterioration", description: "Sharp decline in Chinese imports/exports indicating demand collapse", category: "economic", weight: 7, sources: ["China customs data", "Trade partners"], detectionQuery: "china trade export import decline collapse" },
      { id: "cc-06", title: "Manufacturing PMI contraction", description: "Sustained manufacturing PMI below 50 for 3+ consecutive months", category: "economic", weight: 6, sources: ["NBS", "Caixin"], detectionQuery: "china PMI manufacturing contraction below 50" },
      { id: "cc-07", title: "Social unrest reports", description: "Worker protests, property buyer demonstrations at unusual scale", category: "social", weight: 7, sources: ["Social media", "OSINT"], detectionQuery: "china protest worker demonstration unrest property" },
      { id: "cc-08", title: "Tech sector crackdowns", description: "Renewed aggressive regulatory actions against major tech companies", category: "economic", weight: 5, sources: ["Government announcements", "News"], detectionQuery: "china tech crackdown regulation fine alibaba tencent" },
      { id: "cc-09", title: "Foreign investment withdrawal", description: "Major foreign firms or investors pulling out of China", category: "economic", weight: 7, sources: ["Financial media", "Corporate announcements"], detectionQuery: "foreign investment withdraw china exit pull out" },
      { id: "cc-10", title: "Commodity demand collapse", description: "Sharp decline in Chinese iron ore, copper, or oil imports", category: "economic", weight: 7, sources: ["Trade data", "Commodity markets"], detectionQuery: "china commodity demand iron ore copper oil import decline" },
    ],
  },
  {
    id: "mideast-regional-war",
    name: "Middle East Regional War",
    description: "Multi-front regional conflict involving Israel, Iran, and proxy networks.",
    region: "Middle East",
    actors: ["Israel", "Iran", "Hezbollah", "Hamas", "Houthis", "United States", "Saudi Arabia"],
    marketSectors: ["energy", "defense", "shipping", "gold", "airlines"],
    historicalPrecedent: "1973 Yom Kippur War, 2006 Lebanon War, October 7 2023",
    escalationLevels: STANDARD_ESCALATION,
    indicators: [
      { id: "me-01", title: "Hezbollah rocket barrages", description: "Large-scale Hezbollah rocket/missile attacks on northern Israel", category: "military", weight: 9, sources: ["IDF", "News", "OSINT"], detectionQuery: "hezbollah rocket missile attack israel lebanon" },
      { id: "me-02", title: "Iranian direct strikes", description: "Iran launching direct missile/drone attacks on Israel", category: "military", weight: 10, sources: ["News", "OSINT"], detectionQuery: "iran direct attack strike israel missile drone" },
      { id: "me-03", title: "Houthi shipping attacks", description: "Escalation of Houthi attacks on commercial shipping in Red Sea/Gulf of Aden", category: "military", weight: 7, sources: ["Maritime tracking", "News"], detectionQuery: "houthi attack ship red sea commercial vessel" },
      { id: "me-04", title: "Iraqi militia activation", description: "Iran-backed Iraqi militias attacking US bases or launching cross-border operations", category: "military", weight: 7, sources: ["CENTCOM", "News"], detectionQuery: "iraq militia attack US base Iran-backed" },
      { id: "me-05", title: "Israeli full mobilization", description: "IDF calling up all reserve divisions indicating multi-front war preparation", category: "military", weight: 9, sources: ["IDF", "Israeli media"], detectionQuery: "israel mobilization reserve IDF multi-front war" },
      { id: "me-06", title: "US military surge to region", description: "Additional US carrier groups, aircraft, or troops deployed to Middle East", category: "military", weight: 7, sources: ["DoD", "Naval tracking"], detectionQuery: "US military deploy middle east carrier troops" },
      { id: "me-07", title: "Oil infrastructure targeting", description: "Attacks on Gulf state oil facilities or pipelines", category: "military", weight: 9, sources: ["News", "Energy media"], detectionQuery: "oil infrastructure attack gulf saudi aramco pipeline" },
      { id: "me-08", title: "Egypt border activity", description: "Egyptian military mobilization or Rafah crossing crisis", category: "military", weight: 6, sources: ["OSINT", "News"], detectionQuery: "egypt military border sinai rafah mobilization" },
      { id: "me-09", title: "Refugee surge", description: "Mass displacement events indicating widening conflict", category: "social", weight: 5, sources: ["UNHCR", "News"], detectionQuery: "refugee displacement surge middle east flee" },
      { id: "me-10", title: "Gulf state positioning", description: "Saudi Arabia or UAE military posture changes or diplomatic alignment shifts", category: "diplomatic", weight: 6, sources: ["Government statements", "News"], detectionQuery: "saudi UAE military posture diplomatic shift iran israel" },
      { id: "me-11", title: "Syrian front activity", description: "Military escalation on Israel-Syria border or Golan Heights", category: "military", weight: 7, sources: ["OSINT", "News"], detectionQuery: "syria golan heights border escalation military" },
      { id: "me-12", title: "Strait of Hormuz blockade", description: "Iran threatening or executing naval blockade of Strait of Hormuz", category: "military", weight: 10, sources: ["Naval tracking", "News"], detectionQuery: "hormuz blockade iran navy close strait" },
    ],
  },
  {
    id: "cyber-infrastructure",
    name: "Critical Infrastructure Cyber Attack",
    description: "Nation-state cyber attack on critical infrastructure causing widespread disruption.",
    region: "Global",
    actors: ["Russia", "China", "Iran", "North Korea", "United States"],
    marketSectors: ["technology", "utilities", "financials", "insurance", "defense"],
    historicalPrecedent: "2021 Colonial Pipeline, 2017 NotPetya, 2015 Ukraine grid attack",
    escalationLevels: STANDARD_ESCALATION,
    indicators: [
      { id: "cy-01", title: "Zero-day exploitation reports", description: "Active exploitation of critical zero-day vulnerabilities in infrastructure software", category: "cyber", weight: 8, sources: ["CISA", "Cybersecurity firms"], detectionQuery: "zero day vulnerability exploit critical infrastructure CVE" },
      { id: "cy-02", title: "Banking system outages", description: "Coordinated outages or disruptions in major banking systems", category: "cyber", weight: 9, sources: ["Financial news", "Bank statements"], detectionQuery: "bank outage system disruption cyber attack financial" },
      { id: "cy-03", title: "Power grid anomalies", description: "Unexplained power grid instability or control system compromises", category: "cyber", weight: 9, sources: ["Grid operators", "News"], detectionQuery: "power grid anomaly attack control system SCADA" },
      { id: "cy-04", title: "Telecom disruptions", description: "Major telecommunications network failures or compromises", category: "cyber", weight: 7, sources: ["Telecom providers", "News"], detectionQuery: "telecom disruption outage network attack" },
      { id: "cy-05", title: "Water treatment incidents", description: "Cyber attacks on water treatment or distribution systems", category: "cyber", weight: 8, sources: ["EPA", "Local news"], detectionQuery: "water treatment cyber attack hack system" },
      { id: "cy-06", title: "APT activity spikes", description: "Significant increase in nation-state APT group activity detected", category: "intelligence", weight: 7, sources: ["Cybersecurity firms", "Government CERTs"], detectionQuery: "APT nation state cyber campaign activity threat" },
      { id: "cy-07", title: "State-sponsored attribution", description: "Government formal attribution of cyber attacks to nation-state actors", category: "diplomatic", weight: 6, sources: ["Government statements", "News"], detectionQuery: "cyber attack attribution state-sponsored government blame" },
      { id: "cy-08", title: "Retaliatory threats", description: "Threatened cyber retaliation between nations", category: "diplomatic", weight: 7, sources: ["Government statements"], detectionQuery: "cyber retaliation threat response attack" },
      { id: "cy-09", title: "Insurance market shifts", description: "Cyber insurance premium spikes or coverage restrictions", category: "economic", weight: 5, sources: ["Insurance industry", "Financial news"], detectionQuery: "cyber insurance premium increase coverage restrict" },
      { id: "cy-10", title: "Transportation system failures", description: "Disruptions to air traffic control, rail, or port management systems", category: "cyber", weight: 8, sources: ["Transportation authorities", "News"], detectionQuery: "transportation cyber attack air traffic rail port system" },
    ],
  },
  {
    id: "food-security",
    name: "Global Food Security Crisis",
    description: "Cascading food supply disruptions threatening mass hunger and social instability.",
    region: "Global",
    actors: ["Russia", "Ukraine", "China", "India", "United States", "EU"],
    marketSectors: ["agriculture", "fertilizers", "consumer-staples", "emerging-markets"],
    historicalPrecedent: "2007-08 food crisis, 2022 Black Sea grain blockade",
    escalationLevels: STANDARD_ESCALATION,
    indicators: [
      { id: "fs-01", title: "Crop failure reports", description: "Major crop failures in key agricultural regions (US Midwest, Brazil, Ukraine, India)", category: "economic", weight: 8, sources: ["USDA", "FAO", "Agricultural media"], detectionQuery: "crop failure harvest drought flood agriculture" },
      { id: "fs-02", title: "Fertilizer supply disruptions", description: "Disruptions to global fertilizer supply chains (Russia, Belarus, China)", category: "economic", weight: 7, sources: ["Trade data", "Agricultural media"], detectionQuery: "fertilizer supply shortage disruption export ban" },
      { id: "fs-03", title: "Grain export bans", description: "Countries imposing export restrictions on wheat, rice, or other staples", category: "economic", weight: 9, sources: ["Government announcements", "News"], detectionQuery: "grain wheat rice export ban restrict" },
      { id: "fs-04", title: "Grain price spikes", description: "Wheat, corn, or rice futures hitting multi-year highs", category: "economic", weight: 7, sources: ["Commodity markets"], detectionQuery: "wheat corn rice price spike surge record high" },
      { id: "fs-05", title: "Shipping route disruptions", description: "Black Sea corridor or other key grain shipping routes disrupted", category: "military", weight: 8, sources: ["Maritime tracking", "News"], detectionQuery: "grain shipping route disruption black sea corridor" },
      { id: "fs-06", title: "Water stress escalation", description: "Critical water shortages in major agricultural regions", category: "economic", weight: 7, sources: ["Climate data", "News"], detectionQuery: "water shortage drought stress agriculture irrigation" },
      { id: "fs-07", title: "Conflict in agricultural zones", description: "Armed conflict disrupting farming in major food-producing regions", category: "military", weight: 8, sources: ["GDELT", "ACLED"], detectionQuery: "conflict war agriculture farm food production region" },
      { id: "fs-08", title: "Climate event severity", description: "Extreme weather events (El Nino, drought, flooding) affecting multiple breadbaskets simultaneously", category: "economic", weight: 7, sources: ["NOAA", "Climate services"], detectionQuery: "el nino drought flood extreme weather agriculture" },
      { id: "fs-09", title: "Strategic reserve drawdowns", description: "Nations drawing down strategic food reserves at unusual rates", category: "economic", weight: 6, sources: ["Government data", "News"], detectionQuery: "strategic food reserve drawdown grain stockpile" },
      { id: "fs-10", title: "Social unrest in food-importing nations", description: "Protests and instability driven by food prices in MENA, Sub-Saharan Africa", category: "social", weight: 8, sources: ["GDELT", "News"], detectionQuery: "food protest bread riot price unrest hunger" },
    ],
  },
];

export function getScenario(id: string): ThreatScenario | undefined {
  return THREAT_SCENARIOS.find(s => s.id === id);
}

export function getAllScenarios(): ThreatScenario[] {
  return THREAT_SCENARIOS;
}
