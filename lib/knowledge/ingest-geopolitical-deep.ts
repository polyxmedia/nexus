import { addKnowledge } from "./engine";
import type { NewKnowledgeEntry } from "@/lib/db/schema";

type KnowledgeInput = Omit<NewKnowledgeEntry, "id" | "createdAt">;

const entries: KnowledgeInput[] = [
  // =======================================
  // CHINA-TAIWAN: INVASION SCENARIOS
  // =======================================
  {
    title: "Taiwan Strait - Invasion Scenario Framework & Timeline Analysis",
    content: `Comprehensive analysis of potential Chinese military action against Taiwan, including scenario variants, force requirements, and market implications.

SCENARIO 1: FULL AMPHIBIOUS INVASION
- PLA would need to move ~400,000 troops across 130km of open water
- Only feasible during April-May or October-November weather windows
- CSIS 2023 war game: PLA takes heavy losses, Taiwan holds with US intervention, but at massive cost to all parties
- Required mobilization would be visible 60-90 days in advance through satellite imagery of troop concentrations in Fujian province, requisitioning of civilian ferries and roll-on/roll-off vessels
- Indicators: mass cancellation of military leave, blood bank stockpiling, evacuation of coastal civilian areas

SCENARIO 2: BLOCKADE/QUARANTINE
- More likely near-term scenario. PLA Navy + Coast Guard encircle Taiwan
- Framed as "customs inspection zone" or "exclusion zone" to avoid triggering Article 5-type responses
- Taiwan has ~6 months of strategic petroleum reserves, ~3 months of natural gas
- 90% of Taiwan's trade moves by sea. Blockade would collapse economy within weeks
- Grey zone: difficult for US to justify military response to a "customs inspection"

SCENARIO 3: DECAPITATION STRIKE
- Targeted missile strikes on command infrastructure, airfields, and political leadership
- Combined with special forces insertion and cyber attacks on power grid and communications
- Fastest scenario but highest risk of escalation and failure
- PLA Rocket Force has ~1,500 short-range ballistic missiles aimed at Taiwan

SEMICONDUCTOR DISRUPTION (ALL SCENARIOS):
- TSMC produces ~90% of world's advanced chips (<7nm)
- Any military action immediately halts production (facilities require clean rooms, stable power, specialized chemicals)
- Global auto production, data centers, AI training, consumer electronics all affected
- No substitute capacity exists. Intel, Samsung combined cannot cover >20% of TSMC output
- Estimated global GDP impact: 2-5% contraction in first year
- TSMC has stated it would destroy its own fabs rather than let them fall to PLA intact

MARKET IMPACT FRAMEWORK:
- Phase 1 (mobilization signals): Gradual risk-on to risk-off rotation. TSM -30-50%, semiconductor index -20%, defense stocks +15-25%
- Phase 2 (blockade/strike): Oil spike 20-40% (Malacca fears), gold +15-25%, US treasuries rally, USD strengthens, EM currencies collapse, VIX >50
- Phase 3 (sustained conflict): Supply chain restructuring, permanent reshoring premium, deglobalization acceleration

KEY DETERRENT: US ambiguity policy + Japan's 2022 security doctrine shift + Australian AUKUS submarines create escalation matrix China must calculate against.`,
    category: "geopolitical",
    tags: JSON.stringify(["taiwan", "china", "invasion", "semiconductor", "tsmc", "pla", "blockade", "scenario-analysis"]),
    source: "CSIS War Game 2023, IISS Military Balance, RAND Corp, Congressional Research Service",
    confidence: 0.85,
    status: "active",
    metadata: JSON.stringify({
      type: "scenario-framework",
      scenarios: ["amphibious-invasion", "blockade-quarantine", "decapitation-strike"],
      keyTickers: ["TSM", "INTC", "ASML", "SMH", "GLD", "USO", "TLT"],
      weatherWindows: ["April-May", "October-November"],
    }),
  },
  {
    title: "ASML & Semiconductor Export Controls - Chokepoint Technology",
    content: `ASML Holding (Netherlands) is the sole manufacturer of Extreme Ultraviolet (EUV) lithography machines required to produce chips at 7nm and below. This makes ASML one of the most strategically important companies on Earth.

TECHNOLOGY MONOPOLY:
- Each EUV machine costs ~$200M, weighs ~180 tons, and requires 40 freight containers to ship
- Contains ~100,000 components from 5,000+ suppliers across 60 countries
- No competitor exists. Canon and Nikon make older DUV machines but cannot produce EUV
- Lead time for new machines: 18-24 months
- ASML ships ~50-60 EUV systems per year globally

EXPORT CONTROL REGIME:
- US pressured Netherlands to block ASML EUV exports to China since 2019
- January 2024: Netherlands implemented formal export controls banning EUV and advanced DUV shipments to China
- Japan aligned with similar controls on Tokyo Electron and Nikon equipment
- China's SMIC has achieved 7nm chips using older DUV through multi-patterning (slower, lower yield, higher cost)
- Huawei's Kirin 9000S chip (found in Mate 60 Pro) demonstrated this workaround capability

CHINA'S RESPONSE:
- Massive investment in domestic lithography (SMEE in Shanghai), currently at 28nm capability
- Stockpiling older ASML DUV machines before controls took full effect
- Investing in alternative architectures (chiplets, advanced packaging)
- Estimated 5-10 year gap to replicate EUV independently, if achievable at all

MARKET IMPLICATIONS:
- ASML is effectively a geopolitical chokepoint disguised as a company
- Any escalation in US-China tech war directly impacts ASML order book
- European sovereignty concerns: US dictating what a European company can sell
- If China invades Taiwan and TSMC fabs are destroyed, ASML becomes even more critical as the bottleneck for rebuilding global chip capacity elsewhere`,
    category: "technical",
    tags: JSON.stringify(["asml", "semiconductor", "export-controls", "euv", "lithography", "china", "netherlands", "chokepoint"]),
    source: "ASML Annual Reports, BIS Entity List, Dutch export control regulations, CSIS",
    confidence: 0.92,
    status: "active",
    metadata: JSON.stringify({
      type: "chokepoint-technology",
      company: "ASML",
      ticker: "ASML",
      machinePrice: "$200M",
      annualOutput: "50-60 EUV systems",
      chinaGap: "5-10 years",
    }),
  },

  // =======================================
  // OPEC+ COALITION DYNAMICS
  // =======================================
  {
    title: "OPEC+ Internal Politics - Saudi-Russia-UAE Coalition Dynamics",
    content: `The OPEC+ alliance (OPEC + 10 non-OPEC producers led by Russia) is structurally fragile because its members have divergent long-term interests masked by short-term price alignment.

SAUDI ARABIA (de facto leader):
- Needs ~$80-85/bbl to fund Vision 2030 diversification and NEOM
- Has ~2-3M bbl/day spare capacity (largest swing producer)
- Strategic calculation: maintain price floor vs. maintain market share
- Aramco IPO (2019) and subsequent secondary offering create incentive to support prices
- MBS's political survival tied to economic transformation success

RUSSIA:
- Needs ~$60-70/bbl to balance federal budget
- Sanctions and price cap ($60/bbl on seaborne exports) create shadow fleet and discount dynamics
- Russia's compliance with cuts is persistently questionable (overproduction estimated at 200-500K bbl/day)
- Strategic interest: revenue maximization given wartime spending needs
- Long-term: Russia benefits from instability that keeps prices elevated

UAE:
- Most restive OPEC member. Has 4M+ bbl/day capacity but restricted to ~3M by quotas
- Adnoc investing heavily in expansion (5M bbl/day target by 2027)
- UAE wants larger quota to monetize reserves before energy transition reduces demand
- Has threatened to leave OPEC+ multiple times since 2021
- Key tension: UAE invested in downstream capacity and wants volume, not just price

BREAKUP SCENARIOS:
1. UAE exit: Would add 1M+ bbl/day to market, crash prices 15-25%, force Saudi response (price war 2020 repeat)
2. Russia non-compliance crisis: If Russia openly ignores quotas, Saudi may abandon cuts (2014 playbook)
3. Demand destruction: If global recession cuts demand by 2M+ bbl/day, alliance fractures as members fight for share
4. US shale surge: If US production exceeds 14M bbl/day, OPEC+ cuts become futile

MARKET SIGNALS TO WATCH:
- OPEC+ meeting outcomes vs. actual compliance (satellite tanker tracking data)
- UAE capacity investment pace
- Saudi OSP (Official Selling Price) changes to Asian buyers
- Russian Urals-Brent spread (indicates sanctions effectiveness)
- JMMC (Joint Ministerial Monitoring Committee) rhetoric shifts`,
    category: "market",
    tags: JSON.stringify(["opec", "saudi", "russia", "uae", "oil", "energy", "coalition", "production-cuts", "spare-capacity"]),
    source: "OPEC Monthly Oil Market Report, IEA, EIA, Kpler tanker tracking, S&P Global Platts",
    confidence: 0.88,
    status: "active",
    metadata: JSON.stringify({
      type: "coalition-analysis",
      members: ["Saudi Arabia", "Russia", "UAE", "Iraq", "Kuwait"],
      saudiFiscalBreakeven: "$80-85/bbl",
      russiaFiscalBreakeven: "$60-70/bbl",
      uaeCapacityTarget: "5M bbl/day by 2027",
      keyTickers: ["USO", "BNO", "XLE", "ARAMCO"],
    }),
  },

  // =======================================
  // STATE CYBER CAPABILITIES
  // =======================================
  {
    title: "State Cyber Actor Profiles - Capabilities & Doctrines",
    content: `Major state-sponsored cyber programs ranked by capability, with known operational patterns and market-relevant targeting history.

TIER 1: FULL-SPECTRUM CAPABILITY

UNITED STATES (NSA/Cyber Command + Five Eyes):
- Largest signals intelligence apparatus globally
- Equation Group (attributed): Stuxnet, Flame, Duqu targeting Iran nuclear program
- PRISM, XKeyscore mass surveillance programs (Snowden disclosures)
- Offensive capability: Can disable infrastructure, manipulate financial systems
- Five Eyes integration (US, UK, Canada, Australia, New Zealand) provides global coverage

RUSSIA (GRU Units 26165/74455, FSB, SVR):
- GRU Unit 74455 "Sandworm": NotPetya (2017, $10B+ global damage, hit Maersk, Merck, FedEx), Ukraine power grid attacks (2015, 2016), Olympic Destroyer
- GRU Unit 26165 "Fancy Bear": DNC hack (2016), WADA hack, election interference operations
- FSB "Turla/Snake": Espionage focus, long-duration network infiltration
- Doctrine: Cyber as component of hybrid warfare, information operations paired with technical attacks
- Key pattern: Escalatory during geopolitical tensions, destructive attacks disguised as ransomware

CHINA (PLA Strategic Support Force, MSS):
- PLA Unit 61398 (APT1): Industrial espionage, IP theft from defense contractors, energy companies
- APT41 (MSS-linked): Dual espionage/criminal operations, supply chain attacks
- Volt Typhoon: Pre-positioning in US critical infrastructure (water, energy, transport) for potential wartime disruption
- Hafnium: Microsoft Exchange mass exploitation (2021)
- Doctrine: Peacetime espionage and IP theft, wartime infrastructure disruption capability
- Scale: Estimated 100,000+ personnel in cyber operations

TIER 2: SIGNIFICANT CAPABILITY

ISRAEL (Unit 8200):
- One of most capable signals intelligence units globally relative to size
- Stuxnet (joint US-Israel), Pegasus/NSO Group spyware (sold to 40+ governments)
- Duqu 2.0 targeted Kaspersky Lab and Iran nuclear negotiations
- Commercial spin-offs: NSO Group, Cellebrite, Check Point (Unit 8200 alumni)
- Doctrine: Aggressive offensive operations, commercial exploitation of surveillance tools

IRAN (IRGC Cyber Command):
- Shamoon (2012): Wiped 30,000 Saudi Aramco workstations
- Operation Ababil: DDoS attacks on US banking sector (2012-2013)
- Dam breach attempt on NY infrastructure (2013)
- Growing capability but lower sophistication than Tier 1
- Doctrine: Asymmetric retaliation, targeting critical infrastructure of adversaries

NORTH KOREA (Lazarus Group/RGB):
- Sony Pictures hack (2014)
- SWIFT banking attacks ($81M Bangladesh Bank heist, 2016)
- WannaCry ransomware ($4B+ global damage, 2017)
- Cryptocurrency theft: Estimated $1.7B stolen in 2022 alone (Chainalysis)
- Doctrine: Revenue generation to fund nuclear program, destructive attacks for deterrence

MARKET IMPLICATIONS:
- Cyber attacks on financial infrastructure can trigger flash crashes and settlement failures
- NotPetya demonstrated that a single attack can cause $10B+ in corporate losses globally
- Ransomware targeting energy (Colonial Pipeline 2021) directly impacts commodity prices
- Volt Typhoon pre-positioning suggests China has a "break glass" option for wartime infrastructure disruption
- Cyber insurance market hardening reflects growing systemic risk`,
    category: "geopolitical",
    tags: JSON.stringify(["cyber", "nsa", "gru", "pla", "unit-8200", "lazarus", "sandworm", "infrastructure", "espionage"]),
    source: "Mandiant/Google TAG, CrowdStrike, CISA advisories, Snowden archive, DOJ indictments",
    confidence: 0.88,
    status: "active",
    metadata: JSON.stringify({
      type: "capability-assessment",
      tier1: ["USA", "Russia", "China"],
      tier2: ["Israel", "Iran", "North Korea"],
      notableAttacks: {
        notPetya: { damage: "$10B+", attribution: "Russia/Sandworm" },
        wannaCry: { damage: "$4B+", attribution: "North Korea/Lazarus" },
        solarWinds: { scope: "18000+ organizations", attribution: "Russia/SVR" },
        colonialPipeline: { impact: "US East Coast fuel shortage", attribution: "DarkSide/Russia-based" },
      },
    }),
  },

  // =======================================
  // AFRICA: STRATEGIC HOTSPOTS
  // =======================================
  {
    title: "Sahel Crisis - Coup Belt & Great Power Competition",
    content: `The Sahel region (Mali, Burkina Faso, Niger, Chad, Sudan) has experienced a cascade of military coups since 2020, representing a fundamental realignment of African geopolitics with direct implications for resource access, migration, and great power competition.

COUP TIMELINE:
- Mali: August 2020 (Goita), second coup May 2021
- Guinea: September 2021 (Doumbouya)
- Burkina Faso: January 2022 (Damiba), second coup September 2022 (Traore)
- Niger: July 2023 (Tchiani)
- Gabon: August 2023 (Oligui Nguema)
- Chad: Transitional military council since 2021

FRANCE EXPULSION PATTERN:
- All coup governments expelled French military forces
- Operation Barkhane (French counter-terrorism) withdrawn from Mali (2022), Burkina Faso (2023), Niger (2023)
- French uranium supply from Niger (~15% of French nuclear fuel) disrupted
- End of Francafrique: 60 years of French post-colonial influence collapsing in <3 years

RUSSIA/WAGNER EXPANSION:
- Wagner Group (now Africa Corps after Prigozhin's death) deployed to Mali, Burkina Faso, Central African Republic, Libya, Sudan
- Provides security services in exchange for mining concessions (gold, diamonds, rare earths)
- Russia gains UN voting bloc alignment, resource access, and Mediterranean/Atlantic staging
- Limited capacity: Wagner/Africa Corps estimated at 5,000-8,000 personnel across continent

RESOURCE STAKES:
- Niger: Uranium (7th largest reserves globally), oil production beginning
- DRC: 70% of global cobalt production (critical for EV batteries)
- Guinea: Largest untapped iron ore deposit (Simandou, $20B development)
- Sahel gold belt: Mali, Burkina Faso among top African gold producers
- Rare earths potential across multiple Sahel states

CHINA'S APPROACH:
- Infrastructure investment via Belt and Road (ports, railways, roads)
- DRC cobalt supply chain control (~70% of artisanal cobalt flows to Chinese processors)
- Non-interference doctrine: works with whoever holds power (coup governments included)
- Djibouti: China's first overseas military base (adjacent to US Camp Lemonnier)

MIGRATION VECTOR:
- Sahel instability drives displacement northward through Libya/Tunisia to Mediterranean
- 2023-2025: Record irregular Mediterranean crossings correlate with coup instability
- European far-right political gains linked to migration pressure
- Turkey leverages refugee flows as diplomatic tool against EU`,
    category: "geopolitical",
    tags: JSON.stringify(["sahel", "africa", "coups", "wagner", "france", "uranium", "cobalt", "migration", "china", "russia"]),
    source: "ACLED, ICG, IISS Africa reports, UN OCHA, French MOD",
    confidence: 0.87,
    status: "active",
    metadata: JSON.stringify({
      type: "regional-analysis",
      countries: ["Mali", "Burkina Faso", "Niger", "Chad", "Sudan", "Guinea", "DRC"],
      greatPowerPresence: { france: "withdrawing", russia: "expanding", china: "investing", us: "limited" },
      keyResources: ["uranium", "cobalt", "gold", "iron-ore", "rare-earths"],
    }),
  },
  {
    title: "DRC Cobalt & Critical Minerals - Supply Chain Vulnerability",
    content: `The Democratic Republic of Congo produces approximately 70% of global cobalt, a critical mineral for lithium-ion batteries, making it one of the most strategically significant supply chain chokepoints in the energy transition.

SUPPLY CONCENTRATION:
- DRC cobalt production: ~130,000 tonnes/year (70% global share)
- Second largest producer: Indonesia (~10,000 tonnes) - from nickel laterite byproduct
- Australia, Philippines, Cuba produce small amounts
- No substitute exists for cobalt in high-energy-density battery cathodes (NMC chemistry)
- LFP batteries (cobalt-free) gaining share but lower energy density, unsuitable for some applications

CHINESE CONTROL:
- Chinese companies (CMOC, Huayou Cobalt, CATL supply chain) control ~70% of DRC cobalt processing
- Tenke Fungurume mine (world's largest): owned by CMOC (Chinese)
- Artisanal mining (~20-30% of DRC cobalt) mostly feeds Chinese middlemen
- Chinese firms own 15 of the 19 largest cobalt operations in DRC
- Processing: 80%+ of cobalt refining occurs in China regardless of origin

RISKS:
- Artisanal mining involves estimated 40,000 child laborers (human rights supply chain risk)
- DRC political instability: Eastern DRC conflict (M23, ADF) ongoing since 2022 escalation
- Resource nationalism: DRC raised mining royalties (2018 mining code), may restrict raw exports
- Export bans: Indonesia model (ban raw ore exports, force domestic processing) could be applied
- ESG pressure: European Battery Regulation requires supply chain due diligence by 2027

MARKET IMPLICATIONS:
- Any DRC supply disruption immediately impacts EV production globally
- Cobalt price historically volatile: $30K-$80K/tonne range over 5 years
- Tesla's shift toward LFP reduces cobalt dependence but doesn't eliminate it for premium vehicles
- Recycling: Urban mining could provide 15-25% of cobalt supply by 2035, not enough near-term
- Geopolitical risk: DRC instability + Chinese processing dominance = dual chokepoint`,
    category: "market",
    tags: JSON.stringify(["cobalt", "drc", "congo", "critical-minerals", "ev", "battery", "china", "supply-chain", "mining"]),
    source: "USGS Mineral Commodity Summaries, Cobalt Institute, IEA Critical Minerals Report, Amnesty International",
    confidence: 0.90,
    status: "active",
    metadata: JSON.stringify({
      type: "supply-chain-analysis",
      mineral: "cobalt",
      drcShare: "70%",
      chineseProcessingShare: "80%+",
      keyTickers: ["CMOC", "CATL", "ALB", "SQM", "MP"],
    }),
  },

  // =======================================
  // CHINA FINANCIAL FRAGILITY
  // =======================================
  {
    title: "China Property Crisis - Shadow Banking & Local Government Debt",
    content: `China's property sector represents approximately 25-30% of GDP when including construction, materials, and related services. The ongoing crisis that began with Evergrande's default in 2021 exposes structural fragilities in China's financial system.

PROPERTY SECTOR COLLAPSE:
- Evergrande: $300B in liabilities, defaulted December 2021, liquidation ordered January 2024
- Country Garden: $200B in liabilities, defaulted October 2023
- New home sales declined ~40-50% from 2021 peak through 2024-2025
- 60+ developers have defaulted or restructured since 2021
- Estimated 50-65 million pre-sold but unfinished apartments (affecting ~150 million people)
- Land sale revenue (primary income for local governments) collapsed 40%+

LOCAL GOVERNMENT FINANCING VEHICLES (LGFVs):
- Total LGFV debt estimated at $7-9 trillion (50-60% of GDP)
- LGFVs were created to circumvent local government borrowing restrictions
- Revenue model depended on land sales and infrastructure investment returns
- With property market collapse, many LGFVs cannot service debt
- Central government has allowed $1.4T in LGFV debt swaps (2023-2025) but total exposure dwarfs interventions
- Hidden debt: Actual LGFV liabilities may be 30-50% higher than official estimates

SHADOW BANKING:
- Wealth Management Products (WMPs): ~$4T outstanding, implicit bank guarantees
- Trust companies: Several defaults since 2023 (Zhongzhi Enterprise Group, $64B collapse)
- Informal lending between corporates and through fintech platforms
- Total shadow banking estimated at $12-15T
- Interconnection with formal banking system creates contagion risk

DEFLATION SPIRAL:
- CPI negative or near-zero for extended periods (2023-2025)
- Producer Price Index negative for 18+ consecutive months
- Youth unemployment peaked at 21.3% (June 2023, then methodology changed)
- Consumer confidence at record lows
- "Balance sheet recession" comparisons to Japan 1990s increasingly apt

PBOC CONSTRAINTS:
- Cannot aggressively cut rates: yuan depreciation pressure, capital flight risk
- RRR cuts have limited effect when credit demand is weak (pushing on a string)
- $3T in foreign reserves provides buffer but declining
- Capital controls prevent full-scale flight but grey channels (crypto, over-invoicing trade) active

MARKET IMPLICATIONS:
- Chinese property developers' USD bonds: most trading at 5-15 cents on the dollar
- Commodity demand impact: China consumes 50%+ of global steel, cement, copper
- If construction doesn't recover, commodity supercycle thesis weakens
- Contagion channels: Asian banks with China exposure, commodity exporters (Australia, Brazil, Chile)
- Long-term: Demographic decline (population peaked 2022) means no structural recovery in housing demand`,
    category: "market",
    tags: JSON.stringify(["china", "property", "evergrande", "lgfv", "shadow-banking", "deflation", "pboc", "debt-crisis"]),
    source: "PBOC, NBS, IMF Article IV, Rhodium Group, Logan Wright/CSIS",
    confidence: 0.90,
    status: "active",
    metadata: JSON.stringify({
      type: "financial-fragility",
      propertyGdpShare: "25-30%",
      lgfvDebt: "$7-9T",
      shadowBanking: "$12-15T",
      evergrandeDefault: "December 2021",
      keyTickers: ["FXI", "KWEB", "GXC", "BABA", "PDD"],
    }),
  },

  // =======================================
  // MIGRATION AS GEOPOLITICAL WEAPON
  // =======================================
  {
    title: "Weaponized Migration - States Using Refugee Flows as Leverage",
    content: `Multiple states have developed the deliberate manipulation of migration flows as a tool of geopolitical pressure. This represents a form of hybrid warfare that exploits humanitarian obligations against target states.

TURKEY - EU LEVERAGE:
- Hosts 3.5-4 million Syrian refugees (largest refugee population globally)
- 2016 EU-Turkey Deal: EU pays 6B EUR, Turkey prevents crossings to Greece
- Erdogan has repeatedly threatened to "open the gates" during diplomatic disputes
- March 2020: Turkey opened borders, causing crisis at Greek border
- Mechanism: Turkey's geographic position gives it permanent leverage over EU immigration policy
- Effect: EU constrained from criticizing Turkish military operations, human rights record

BELARUS-POLAND (2021):
- Lukashenko regime organized flights from Iraq/Syria to Minsk, then bused migrants to Polish/Lithuanian borders
- Direct retaliation for EU sanctions on Belarus after 2020 election crackdown
- Forced EU to fund border walls (contradicting its own values rhetoric)
- Russia implicitly supported as it destabilized NATO's eastern flank

LIBYA - MEDITERRANEAN:
- Whoever controls Libya controls the Central Mediterranean migration route
- Various Libyan factions have weaponized migrant flows for international recognition and funding
- EU funds Libyan Coast Guard (documented human rights abuses) to intercept boats
- Haftar (LNA) has used migrant flows as bargaining chip with European governments

MOROCCO - SPAIN (Ceuta/Melilla):
- May 2021: Morocco allowed 8,000+ migrants to cross into Ceuta
- Direct retaliation for Spain hosting Western Sahara independence leader for medical treatment
- Resolved when Spain shifted position on Western Sahara sovereignty

SAHEL-EUROPE PIPELINE:
- Coup belt instability drives displacement through Niger-Libya-Mediterranean corridor
- Niger was EU's primary partner for migration management in Sahel; post-coup cooperation collapsed
- Wagner presence correlates with increased displacement in Mali, Burkina Faso

MARKET IMPLICATIONS:
- European far-right electoral gains directly correlate with migration pressure waves
- Anti-immigration governments shift fiscal policy (border spending, welfare restrictions)
- EU political fragmentation weakens coordinated economic/foreign policy response
- Defense sector benefits from border security spending
- Agricultural labor shortages in aging European economies create counter-pressure

ANALYTICAL FRAMEWORK:
Migration weaponization works because liberal democracies face asymmetric vulnerability: they cannot respond with equivalent measures without violating their own legal and moral frameworks. The attacker exploits humanitarian law against the defender. This makes it a low-cost, high-impact tool available even to relatively weak states.`,
    category: "geopolitical",
    tags: JSON.stringify(["migration", "refugees", "turkey", "eu", "belarus", "libya", "hybrid-warfare", "leverage", "borders"]),
    source: "UNHCR, Frontex, Kelly Greenhill 'Weapons of Mass Migration', ECFR",
    confidence: 0.87,
    status: "active",
    metadata: JSON.stringify({
      type: "hybrid-warfare-model",
      practitioners: ["Turkey", "Belarus", "Libya", "Morocco"],
      targets: ["EU", "Greece", "Poland", "Spain"],
      mechanism: "exploiting-humanitarian-obligations",
    }),
  },

  // =======================================
  // DERIVATIVE MARKET FRAGILITY
  // =======================================
  {
    title: "Hidden Leverage - Basis Trade, CDS & Structured Credit Fragility",
    content: `The global derivatives market ($632 trillion notional, BIS) contains several concentrated risk nodes that have historically produced systemic crises. Understanding these mechanisms is critical for anticipating the next financial stress event.

TREASURY BASIS TRADE:
- Hedge funds exploit small price differences between Treasury futures and cash bonds
- Levered 50-100x through repo markets
- Estimated $800B-$1T in basis trade positions (2024-2025)
- Risk: If spreads widen suddenly, forced unwind creates Treasury market dislocation
- March 2020: Basis trade unwind caused Treasury market to seize, requiring $1.6T Fed intervention
- Mechanism: Hedge fund sells futures, buys cash bond, pockets spread. Works until repo funding dries up or margin calls force liquidation
- Fed is aware but has not restricted: "shadow banking in plain sight"

CREDIT DEFAULT SWAPS (CDS):
- CDS market ~$3.8T (single-name) + $6T (index)
- Concentrated among 5-6 dealer banks (JPM, Goldman, Citi, BofA, Deutsche, Barclays)
- Interconnection: failure of one major dealer creates chain reaction
- AIG 2008: $440B in CDS written without adequate reserves, required $182B bailout
- Basis package trades: Buying bond + buying CDS creates "riskless" position but requires continuous funding
- Sovereign CDS: watch spreads on France, Italy, Japan as fiscal stress indicators

ARCHEGOS-TYPE HIDDEN LEVERAGE:
- Bill Hwang's Archegos Capital: $36B in exposure through total return swaps
- Banks (Credit Suisse, Nomura) didn't know total exposure because swaps don't require public disclosure
- Credit Suisse lost $5.5B, contributing to its eventual collapse
- Problem remains: family offices and hedge funds can build enormous positions through OTC derivatives without transparency
- SEC Rule 13F doesn't capture swap positions

MARGIN CALL CASCADE MECHANICS:
1. Asset price drops trigger margin calls on leveraged positions
2. Forced selling of collateral depresses prices further
3. Other positions using same collateral face margin calls (cross-collateral contagion)
4. Repo market freezes as lenders demand higher haircuts
5. Money market funds break the buck or gate redemptions
6. Central bank must intervene as lender/dealer of last resort

CURRENT STRESS INDICATORS TO WATCH:
- FRA-OIS spread (interbank lending stress)
- Treasury bid-ask spreads (market liquidity)
- Cross-currency basis swaps (dollar funding stress for non-US banks)
- MOVE index (bond market volatility, equivalent of VIX for rates)
- Commercial paper rates vs. overnight rates (funding market stress)
- Reverse repo facility usage (excess liquidity indicator)

SYSTEMIC RISK: The common thread across LTCM (1998), AIG (2008), March 2020, Archegos (2021), UK gilt crisis (2022), and SVB (2023) is that leverage was hidden until the crisis revealed it. The next crisis will follow the same pattern: a leverage structure nobody was monitoring will unwind in a market that assumed it was liquid.`,
    category: "market",
    tags: JSON.stringify(["derivatives", "basis-trade", "cds", "leverage", "systemic-risk", "margin-calls", "repo", "shadow-banking"]),
    source: "BIS Quarterly Review, OFR Annual Report, Fed Financial Stability Report, Pozsar/Credit Suisse research",
    confidence: 0.90,
    status: "active",
    metadata: JSON.stringify({
      type: "financial-fragility",
      globalDerivativesNotional: "$632T",
      basisTradeEstimate: "$800B-$1T",
      cdsMarket: "$9.8T",
      historicalBlowups: ["LTCM 1998", "AIG 2008", "March 2020", "Archegos 2021", "UK Gilts 2022"],
      stressIndicators: ["FRA-OIS", "MOVE", "Treasury bid-ask", "cross-currency basis"],
    }),
  },
  {
    title: "Sudan Civil War - Humanitarian Crisis & Regional Destabilization",
    content: `The Sudan civil war (April 2023-present) between the Sudanese Armed Forces (SAF, Gen. Burhan) and the Rapid Support Forces (RSF, Gen. Hemedti) represents one of the largest humanitarian crises globally, with significant implications for regional stability, migration, and resource access.

CONFLICT OVERVIEW:
- Began April 15, 2023 when SAF-RSF power sharing collapsed
- RSF controls most of Khartoum, Darfur, and Kordofan
- SAF controls Port Sudan (de facto capital), eastern regions, and parts of central Sudan
- Estimated 15,000+ killed (likely severe undercount), 10+ million displaced (largest displacement crisis globally)
- 25 million people (half the population) face acute food insecurity

EXTERNAL ACTORS:
- UAE: Provides weapons and funding to RSF through Chad and Libya, motivated by gold mining interests and Red Sea port access
- Egypt: Supports SAF, concerned about Nile water access and border security
- Russia: Wagner/Africa Corps presence, gold mining concessions from RSF in Darfur
- Saudi Arabia: Mediation attempts through Jeddah process, limited success
- Iran: Seeking Port Sudan naval facility agreement with SAF
- Ethiopia: Distracted by own Tigray recovery, border tensions with Sudan over al-Fashaga

RESOURCE DIMENSIONS:
- Gold: Sudan is Africa's 3rd largest gold producer. RSF controls most artisanal gold mining in Darfur
- Gold revenues estimated at $1-2B annually, funding RSF war effort
- UAE-linked companies process Sudanese gold, providing RSF access to international finance
- Oil: South Sudan oil transits through Sudan (Port Sudan pipeline), 75% of South Sudan revenue
- Agricultural: Sudan's Gezira irrigation scheme (one of world's largest) largely non-functional due to conflict
- Red Sea coastline: Strategic for naval basing (Iran, Russia both interested)

REGIONAL CONTAGION:
- Chad: Hosting 600,000+ Sudanese refugees, RSF recruitment among Chadian Arabs
- South Sudan: Oil revenue threatened, refugee returns impossible
- Ethiopia: Eastern border tensions, refugee flows
- Egypt: Concerns about Nile dam (GERD) negotiations with Sudan absent from table
- Libya: Weapons flows through southern Libya to RSF
- Central African Republic: Wagner supply route overlap

MARKET RELEVANCE:
- Gold supply chain: Artisanal Sudanese gold enters global market through UAE, creating sanctions evasion channel
- Red Sea shipping: Conflict spillover compounds Houthi disruption risks
- Food security: Sudan's agricultural collapse contributes to regional food price pressure
- Migration: Displacement feeds into Libya-Mediterranean corridor to Europe`,
    category: "geopolitical",
    tags: JSON.stringify(["sudan", "civil-war", "rsf", "saf", "darfur", "gold", "uae", "wagner", "red-sea", "humanitarian"]),
    source: "ACLED, UN OCHA, UNHCR, ICG Sudan reports, Global Witness gold tracking",
    confidence: 0.88,
    status: "active",
    metadata: JSON.stringify({
      type: "conflict-analysis",
      parties: ["SAF/Burhan", "RSF/Hemedti"],
      displaced: "10M+",
      foodInsecure: "25M",
      externalActors: { uae: "RSF", egypt: "SAF", russia: "RSF/gold", iran: "SAF/ports" },
      keyResources: ["gold", "oil-transit", "agricultural-land", "red-sea-ports"],
    }),
  },
];

export const DEEP_GEOPOLITICAL_ENTRY_COUNT = entries.length;

export async function ingestDeepGeopolitical(): Promise<{ count: number }> {
  let count = 0;
  for (const entry of entries) {
    try {
      await addKnowledge(entry);
      count++;
    } catch (err) {
      console.error(`[deep-geo-ingest] Failed to add "${entry.title}":`, err);
    }
  }
  console.log(`[deep-geo-ingest] Ingested ${count}/${entries.length} entries`);
  return { count };
}
