import { addKnowledge } from "./engine";
import type { NewKnowledgeEntry } from "@/lib/db/schema";

type KnowledgeInput = Omit<NewKnowledgeEntry, "id" | "createdAt">;

const entries: KnowledgeInput[] = [
  // ═══════════════════════════════════════════
  // RESOURCE SCARCITY & CLIMATE THREAT MULTIPLIER
  // ═══════════════════════════════════════════
  {
    title: "Global Water Stress - Transboundary River Basin Conflict Risk",
    content: `Water scarcity is the most underpriced geopolitical risk. 2.4 billion people live in water-stressed countries. Transboundary river basins where upstream damming or diversion creates downstream conflict potential:

TIGRIS-EUPHRATES (Turkey-Syria-Iraq):
Turkey's GAP (Southeastern Anatolia Project) includes 22 dams and 19 hydroelectric plants. Has reduced downstream flow to Syria and Iraq by 40-50% during drought periods. Iraq's agricultural output has been devastated. ISIS partially emerged from drought-displaced rural populations in Syria (2006-2010 drought displaced 1.5 million Syrian farmers). Turkey uses water as strategic leverage. No binding water-sharing treaty exists.

NILE (Ethiopia-Sudan-Egypt):
Grand Ethiopian Renaissance Dam (GERD) is Africa's largest hydroelectric project. Reservoir capacity = 74 billion cubic meters (1.5x Egypt's annual Nile flow). Egypt's position: the Nile provides 97% of its freshwater. Sisi has stated GERD is an "existential threat." Ethiopia's position: sovereign right to develop. Sudan caught in between. Historical: Egypt threatened military action multiple times. Current status: no agreement on filling rate or drought protocols. This is the most likely water war flashpoint globally.

INDUS (India-Pakistan):
Indus Waters Treaty (1960, World Bank-brokered) divides rivers between India and Pakistan. India controls headwaters of western rivers allocated to Pakistan. India has periodically threatened to revoke or modify the treaty during tensions (2016 Uri attack, 2019 Pulwama). Pakistan's agriculture (and 200+ million people) depends on Indus flows. Treaty modification would be an act of economic warfare.

MEKONG (China-Southeast Asia):
China has built 11 mega-dams on the upper Mekong (Lancang). Controls water flow to Myanmar, Laos, Thailand, Cambodia, Vietnam. Downstream countries report 50-70% flow reduction during dry season. Affects fisheries (protein source for 60 million people) and agriculture. China uses dam operations as diplomatic leverage without acknowledging it.

JORDAN RIVER (Israel-Palestine-Jordan):
Israel controls 80%+ of shared water resources. Palestinians in West Bank receive 73 liters/person/day vs Israeli settlers receiving 300+ liters. Gaza aquifer is 97% unfit for human consumption due to saltwater intrusion and contamination. Jordan is the world's second most water-scarce country. Water is a core final-status issue in any peace negotiation.

MARKET IMPLICATIONS: Water stress drives food prices (agricultural failure), migration (political instability), energy (hydroelectric dependency), and conflict. Countries with >40% water stress AND >50% agricultural employment AND youth bulge are highest risk for instability. Monitor: UN FAO Food Price Index, drought indices (PDSI), satellite soil moisture data (SMAP).`,
    category: "geopolitical",
    tags: JSON.stringify(["water", "scarcity", "climate", "nile", "GERD", "tigris-euphrates", "indus", "conflict-driver"]),
    source: "World Resources Institute Aqueduct, UN Water, Pacific Institute Water Conflict Chronology",
    confidence: 0.90,
    status: "active",
    metadata: JSON.stringify({
      type: "resource-scarcity",
      highestRisk: "Nile (GERD)",
      affectedPopulation: "2.4 billion in water-stressed countries",
      flashpoints: ["GERD/Nile", "Tigris-Euphrates", "Indus", "Mekong", "Jordan"],
      marketTransmission: "Food prices, migration, energy, conflict",
    }),
  },
  {
    title: "Global Food Security - Grain Reserves, Import Dependency, and Unrest Thresholds",
    content: `Food security is the most reliable predictor of social unrest in developing nations. When food exceeds 40% of household expenditure, the probability of protests and regime-threatening instability spikes dramatically.

GLOBAL GRAIN RESERVES (months of consumption):
- Wheat: ~120 days global coverage. China holds 50%+ of global wheat stocks (strategic reserves). Excluding China, global wheat stocks are ~60-70 days.
- Rice: ~90 days. China and India hold 70%+ of global stocks. Export bans by India (2023) caused immediate price spikes.
- Corn/Maize: ~70 days. US is dominant exporter (35% of global trade). Ethanol mandate consumes 35-40% of US corn crop, creating food-fuel competition.
- Soybeans: ~60 days. Brazil is now largest producer/exporter, surpassing US. China imports 60% of globally traded soybeans.

FOOD IMPORT DEPENDENCY (most vulnerable countries):
- Egypt: Imports 60% of wheat, 40% of food. World's largest wheat importer. Bread subsidies are politically sacrosanct (bread riots toppled governments in 1977, contributed to 2011 revolution).
- Lebanon: Imports 80% of food. Port of Beirut explosion (2020) destroyed national grain silos. No strategic reserves.
- Yemen: Imports 90% of food. Blockade/conflict creates permanent famine conditions.
- Sub-Saharan Africa: 17 countries import >50% of cereal needs. Population doubling by 2050 will intensify dependency.
- MENA region overall: Most food-import-dependent region globally. Oil exporters can afford it; non-oil states cannot.

FOOD PRICE -> UNREST CORRELATION:
- FAO Food Price Index above 130 correlates with elevated protest activity globally (2008 crisis: index hit 138, food riots in 30+ countries. 2010-2011: index hit 131, Arab Spring).
- Mechanism: Urban poor spend 50-70% of income on food. Price spikes leave no margin. Governments must choose between subsidies (fiscal strain) or unrest.
- Speed matters: Rapid price increases (>20% in 3 months) trigger unrest faster than gradual increases of the same magnitude.

CLIMATE IMPACT ON PRODUCTION:
- Each 1C of warming reduces global wheat yields 6% and maize yields 7.4% (meta-analysis of field studies).
- Simultaneous breadbasket failure (US Midwest + Black Sea + South Asian monsoon failure in same year) is a tail risk estimated at 1-2% per year, rising with climate change. Would cause global food crisis affecting 1+ billion people.
- Groundwater depletion: Ogallala Aquifer (US Great Plains, 30% of US irrigation) declining at unsustainable rates. Punjab aquifer (India/Pakistan, feeds 1 billion) similar trajectory. These are multi-decade structural risks.

MONITORING: FAO Food Price Index (monthly), USDA WASDE crop reports (monthly), AMIS (Agricultural Market Information System), satellite NDVI for crop health, NOAA drought monitors, India/China export ban announcements.`,
    category: "geopolitical",
    tags: JSON.stringify(["food-security", "grain", "wheat", "famine", "unrest", "FAO", "climate", "import-dependency"]),
    source: "UN FAO, USDA, World Food Programme, Chatham House",
    confidence: 0.92,
    status: "active",
    metadata: JSON.stringify({
      type: "resource-scarcity",
      unrestThreshold: "FAO Index >130 or food >40% household spend",
      wheatReserves: "120 days (60-70 ex-China)",
      mostVulnerable: ["Egypt", "Lebanon", "Yemen", "Sub-Saharan Africa"],
      climateImpact: "-6% wheat yield per 1C warming",
      breadbasketFailureRisk: "1-2% per year",
    }),
  },
  {
    title: "Climate as Threat Multiplier - Pentagon and Intelligence Assessment Framework",
    content: `The US Department of Defense classifies climate change as a "threat multiplier" that exacerbates existing instability drivers. This is not speculative; it is the official position in the National Defense Strategy and multiple DNI threat assessments.

DIRECT MILITARY IMPACTS:
- 2/3 of US military installations face climate-related threats (flooding, wildfire, drought, extreme heat). Tyndall AFB devastated by Hurricane Michael (2018), $5B in damage.
- Arctic ice melt opening new theaters: Northern Sea Route reduces Asia-Europe shipping by 40% vs Suez. Russia building Arctic military infrastructure (13 airfields, 10 radar stations). China declared itself a "near-Arctic state."
- Rising sea levels threaten Diego Garcia (Indian Ocean strategic base), Norfolk Naval Station (world's largest naval base), multiple Pacific island facilities.

INSTABILITY TRANSMISSION CHANNELS:
1. Water scarcity -> Agricultural failure -> Rural-urban migration -> Urban unemployment -> Social unrest -> State fragility -> Conflict
2. Extreme weather -> Infrastructure destruction -> Economic loss -> Fiscal strain -> Reduced state capacity -> Governance vacuum -> Non-state actor exploitation
3. Sea level rise -> Coastal displacement -> Cross-border migration -> Host country political backlash -> Nativist politics -> Regional tension
4. Resource competition -> Inter-state tension -> Militarized disputes -> Escalation risk

DOCUMENTED CASES:
- Syria 2006-2010: Worst drought in 900 years displaced 1.5 million farmers to cities. Contributed to conditions for 2011 uprising. Not sole cause but significant amplifier.
- Lake Chad: 90% shrinkage since 1960s. Displaced fishing/farming communities. Recruitment pool for Boko Haram.
- Central American migration: Dry Corridor crop failures driving northward migration. Direct line from climate to US border policy.
- Pakistan 2022 floods: 1/3 of country underwater, $30B damage, 33 million displaced. Accelerated debt crisis and IMF dependency.

PROJECTED HOTSPOTS (2025-2040):
- Sahel band (Mali to Somalia): Desertification + population growth + weak governance
- South/Southeast Asia river deltas: Bangladesh, Myanmar, Vietnam (sea level + cyclones)
- Central America Dry Corridor: Crop failure + gang violence + migration
- Middle East/North Africa: Water stress + food import dependency + youth bulge
- Central Asia: Glacial melt (Amu Darya, Syr Darya) threatening downstream agriculture in Uzbekistan, Turkmenistan

INVESTMENT IMPLICATIONS: Climate adaptation spending ($300B+/year needed, currently $50B). Insurance/reinsurance repricing (Florida, California, coastal real estate). Stranded asset risk in fossil fuels. Water technology, drought-resistant agriculture, grid resilience as growth sectors. Defense spending increases in climate-vulnerable allies.`,
    category: "geopolitical",
    tags: JSON.stringify(["climate", "threat-multiplier", "pentagon", "instability", "migration", "adaptation", "security"]),
    source: "US DoD Climate Risk Analysis, DNI Annual Threat Assessment, IPCC AR6",
    confidence: 0.88,
    status: "active",
    metadata: JSON.stringify({
      type: "threat-assessment",
      classification: "Threat multiplier (official DoD position)",
      transmissionChannels: 4,
      hotspots2040: ["Sahel", "South Asian deltas", "Central America", "MENA", "Central Asia"],
      adaptationGap: "$300B needed vs $50B current",
      documentedCases: ["Syria drought", "Lake Chad/Boko Haram", "Pakistan floods 2022"],
    }),
  },

  // ═══════════════════════════════════════════
  // DEMOGRAPHICS AS DESTINY
  // ═══════════════════════════════════════════
  {
    title: "Demographic Time Bombs - Aging, Youth Bulges, and Structural Economic Shifts",
    content: `Demographics are the most predictable and least priced-in structural force in geopolitics and markets. Population trends are known decades in advance but consistently ignored until the effects become undeniable.

AGING CRISES (shrinking labor force, rising dependency):

CHINA: Working-age population (15-64) peaked in 2011 and is declining by 7-8 million per year. Total population started declining in 2022 (first time since Great Famine). Fertility rate: 1.0 (one of world's lowest, replacement is 2.1). By 2050: 500 million people over 60, pension system underfunded by trillions. Implications: GDP growth structurally slowing, real estate demand declining permanently, military recruitment pool shrinking, innovation window closing.

JAPAN: Median age 49 (world's oldest major economy). Population declining 500,000-700,000/year. 29% over 65. Social security spending at 33% of government budget and rising. Government debt 260% of GDP funded by domestic savings that are now being drawn down. Implication: BOJ trapped, cannot raise rates without fiscal crisis, yen structural weakness.

SOUTH KOREA: Fertility rate 0.72 (world's lowest). Population projected to halve by 2100. Military conscription pool shrinking 30% by 2040. Housing demand structural decline. Government spending increasing on elderly care.

EUROPE: EU fertility rate 1.5. Germany, Italy, Spain all below 1.4. Working-age population shrinking. Immigration is the only offset but politically toxic. Pension obligations growing as tax base shrinks. Europe's share of global GDP declining from 25% (2000) to projected 15% (2040).

YOUTH BULGES (instability risk):

SUB-SAHARAN AFRICA: Median age 19. Population doubling to 2.5 billion by 2050. 60% under 25. If economic growth creates jobs: demographic dividend (like East Asia 1970-2000). If not: instability, migration pressure, extremist recruitment. Nigeria alone will have 400 million people by 2050 (passing the US).

MIDDLE EAST/NORTH AFRICA: Median age 26, youth unemployment 25-40% in many countries. Egypt adds 2 million people/year to a water-scarce economy. The social contract (subsidized bread and fuel for political acquiescence) is fiscally unsustainable.

INDIA: Median age 28, working-age population growing by 10 million/year until ~2040. Largest potential demographic dividend in history IF education and job creation match. World's most populous country (overtook China 2023). Per capita income still low ($2,500) so enormous growth potential.

MARKET IMPLICATIONS BY TIMEFRAME:
- 5 years: Japan pension fund rebalancing flows, China property structural decline, European labor shortages driving automation investment
- 10 years: China GDP growth falling below 3%, Sub-Saharan Africa capital needs explosion, India becoming 3rd largest economy
- 20 years: Global working-age population peaks then declines, deflationary pressure from aging, healthcare/biotech structural growth, robotics/AI as labor substitute becomes critical

DEMOGRAPHIC INVESTING: Long Indian equities/infrastructure, long healthcare/biotech (aging), long robotics/automation (labor shortage), short countries with worst dependency ratios + fiscal stress (Japan sovereign risk, Korean housing). Immigration policy changes are a key variable that can accelerate or mitigate demographic trajectories.`,
    category: "geopolitical",
    tags: JSON.stringify(["demographics", "aging", "youth-bulge", "population", "fertility", "china", "japan", "africa", "india"]),
    source: "UN Population Division, World Bank, IMF Fiscal Monitor",
    confidence: 0.93,
    status: "active",
    metadata: JSON.stringify({
      type: "structural-trend",
      agingCrises: {
        china: { workingAgeDecline: "7-8M/yr", fertilityRate: 1.0 },
        japan: { medianAge: 49, populationDecline: "500-700K/yr", debtToGDP: 2.6 },
        southKorea: { fertilityRate: 0.72 },
        europe: { fertilityRate: 1.5 },
      },
      youthBulges: {
        subSaharanAfrica: { medianAge: 19, projected2050: "2.5B" },
        india: { medianAge: 28, laborForceGrowth: "10M/yr" },
        mena: { youthUnemployment: "25-40%" },
      },
    }),
  },

  // ═══════════════════════════════════════════
  // ENERGY TRANSITION CRITICAL PATH
  // ═══════════════════════════════════════════
  {
    title: "Energy Transition - Critical Mineral Supply Chains and Bottlenecks",
    content: `The energy transition creates new strategic dependencies that mirror or exceed fossil fuel dependencies. Countries that control critical mineral supply chains gain the leverage that OPEC has held over oil.

LITHIUM:
- Current production: Australia (47%), Chile (24%), China (15%). Processing: China (65% of refining).
- Demand projection: 5x increase by 2030 for EV batteries. Supply response underway but mining permits take 7-15 years.
- Price volatility: Lithium carbonate swung from $6K/tonne (2020) to $80K (2022) to $13K (2024). Boom-bust cycle driven by demand uncertainty and speculative investment.
- Strategic risk: China's dominance in refining means even Australian/Chilean ore often goes to China for processing. Western countries building alternative refining (US IRA subsidies, EU Critical Raw Materials Act) but 5+ years from scale.

COBALT:
- DRC produces 74% of global cobalt. Often mined under exploitative conditions (artisanal mining, child labor concerns). Glencore is the largest industrial producer.
- Battery chemistry shifting away from cobalt (LFP batteries, LNMO) but still critical for highest-energy-density cells (NCM).
- China's CMOC and other firms control significant DRC mining operations. Strategic relationship between China and DRC government.

COPPER:
- The energy transition's biggest bottleneck. EVs use 4x more copper than ICE vehicles. Grid upgrades, solar, wind all copper-intensive. Projected supply deficit of 5-10 million tonnes by 2030.
- Major producers: Chile (27%), Peru (10%), DRC (10%), China (8%). Grade decline at existing mines means costs rising structurally.
- New mine development: Average of 16 years from discovery to production. Political risk in producing countries (Chile's mining royalty debates, Peru instability, Panama mine closure).
- Price implication: Structural bull case for copper is the strongest of any commodity. Goldman Sachs calls it "the new oil."

RARE EARTHS:
- China controls 60% of mining, 90% of processing. Used in EV motors (neodymium), wind turbines, defense systems (guidance, radar).
- China has weaponized supply before: 2010 Japan embargo during Senkaku dispute. Export controls on germanium and gallium (2023).
- Alternative sources developing: MP Materials (US), Lynas (Australia), but processing capacity outside China remains minimal.

GRID BOTTLENECK:
- Power transformer lead times have extended from 12 months to 2-4 years. This is the physical bottleneck for grid expansion/modernization globally.
- US grid needs $2.5T in investment over 20 years to support electrification. Current pace is inadequate.
- Interconnection queues: 2,600 GW of generation capacity waiting for grid connection in the US alone (mostly solar and wind). Average wait time 5 years.
- Grid-scale battery storage: Costs have fallen 90% in a decade but deployment still insufficient for intermittency management.

ADOPTION S-CURVES:
- EVs: Global share of new car sales crossed 18% in 2023. S-curve inflection typically at 5-10%. China at 35%, Europe at 22%, US at 9%. Adoption is now self-reinforcing (infrastructure buildout, model availability, cost parity).
- Solar: Cheapest source of electricity in history in most regions. Installed capacity doubling every 3 years. China producing 80% of panels.
- Heat pumps: 10% of global heating, inflecting in Europe post-Russian gas crisis.

LOSERS: Coal miners, oil-dependent sovereigns without diversification (Angola, Nigeria, Iraq), ICE auto suppliers, natural gas in long-term (but transition fuel in medium-term).
WINNERS: Copper miners, lithium miners (at scale), grid equipment manufacturers (Eaton, Schneider, Siemens Energy), battery manufacturers (CATL, BYD, LG Energy), utilities investing in renewables.`,
    category: "market",
    tags: JSON.stringify(["energy-transition", "lithium", "copper", "rare-earths", "EV", "solar", "grid", "critical-minerals"]),
    source: "IEA World Energy Outlook, BloombergNEF, USGS, Goldman Sachs Commodities Research",
    confidence: 0.88,
    status: "active",
    metadata: JSON.stringify({
      type: "structural-trend",
      biggestBottleneck: "Copper (projected 5-10Mt deficit by 2030)",
      chinaControl: { lithiumRefining: "65%", rareEarthProcessing: "90%", solarPanels: "80%" },
      gridTransformerLeadTime: "2-4 years",
      evAdoption: { global: "18%", china: "35%", europe: "22%", us: "9%" },
      copperDemandMultiplier: "4x per EV vs ICE",
    }),
  },

  // ═══════════════════════════════════════════
  // HISTORICAL ANALOGY PATTERN DATABASE
  // ═══════════════════════════════════════════
  {
    title: "Thucydides Trap - Rising Power vs Established Power Historical Analysis",
    content: `Graham Allison's Thucydides Trap framework analyzed 16 cases over the last 500 years where a rising power threatened to displace a ruling power. Result: 12 of 16 cases ended in war (75%).

CASES THAT ENDED IN WAR:
1. Portugal vs Spain (late 15th century)
2. Habsburg vs France (16th century)
3. Habsburg vs Ottoman Empire (16th-17th century)
4. Habsburg vs Sweden (17th century)
5. Dutch Republic vs England (17th century)
6. France vs Habsburg (17th century)
7. UK vs France (18th-19th century - Napoleonic Wars)
8. France/UK vs Russia (mid-19th century - Crimean War)
9. France vs Germany (19th century - Franco-Prussian War)
10. Russia/France vs Germany (early 20th century - WWI)
11. Germany vs UK/France/Russia (WWI expanded)
12. Japan vs US (WWII Pacific)

CASES THAT AVOIDED WAR:
1. Spain vs England (late 16th century - Armada defeated but no sustained great power war)
2. US vs UK (early 20th century - peaceful transition of hegemony)
3. Soviet Union vs US (Cold War - nuclear deterrence prevented direct conflict)
4. Germany/France post-WWII (European integration model)

CURRENT APPLICATION (US-China):
Allison rates the US-China case as having "more Thucydidean dynamics than any of the past cases." Key parallels: established hegemon with alliance network vs rising power with historical grievance narrative ("century of humiliation"), economic interdependence (also existed before WWI), ideological competition, territorial flashpoint (Taiwan = Balkans analog).

KEY VARIABLES THAT PREVENTED WAR:
- Nuclear deterrence (Soviet case) - applies to US-China
- Economic integration depth (though WWI proves this isn't sufficient alone)
- Institutional mechanisms (EU model, but no such institution exists between US and China)
- Managed hegemonic transition with shared cultural/institutional heritage (US-UK case - extremely rare conditions, unlikely to repeat)

PATTERN FOR ANALYSIS: The Thucydides Trap framework suggests that structural forces push toward conflict regardless of leaders' intentions. The question is not "do leaders want war?" but "are structural forces creating conditions where miscalculation, accident, or third-party provocation triggers escalation?" Taiwan, South China Sea, and economic decoupling are the three escalation pathways. Monitor: military-to-military communication channels (open = safety valve, closed = danger), trade dependency trends (decoupling velocity), and third-party provocations (North Korea, Philippines incidents).`,
    category: "model",
    tags: JSON.stringify(["thucydides-trap", "power-transition", "US-China", "historical-analogy", "great-power", "war-probability"]),
    source: "Graham Allison 'Destined for War', Harvard Belfer Center",
    confidence: 0.85,
    status: "active",
    metadata: JSON.stringify({
      type: "historical-analogy",
      cases: 16,
      warOutcomes: 12,
      warProbability: 0.75,
      currentApplication: "US-China",
      escalationPathways: ["Taiwan", "South China Sea", "Economic decoupling"],
      warPreventionFactors: ["Nuclear deterrence", "Economic integration", "Institutional mechanisms"],
    }),
  },
  {
    title: "Financial Crisis Anatomy - Kindleberger/Minsky Model",
    content: `Charles Kindleberger and Hyman Minsky identified a recurring pattern in financial crises that has repeated with remarkable consistency across centuries and geographies.

THE FIVE STAGES:

STAGE 1 - DISPLACEMENT: An exogenous shock creates new profit opportunities. Examples: New technology (railways 1840s, internet 1990s, AI 2023), policy change (deregulation 1980s, QE 2009), or structural shift (China WTO accession 2001). This stage is fundamental and real. The profits are genuine initially.

STAGE 2 - BOOM: Credit expands. Asset prices rise. Early investors make money. Media coverage increases. New investors enter attracted by returns. Lending standards loosen. Financial innovation creates new instruments to increase leverage (CDOs in 2000s, SPACs in 2020, tokenized assets). Positive feedback loop: rising prices -> more collateral value -> more borrowing -> more buying -> rising prices.

STAGE 3 - EUPHORIA: Rational analysis replaced by momentum and narrative. "This time is different" reasoning. Price-to-fundamentals metrics dismissed as "outdated." New investors with no experience of downturns dominate marginal buying. Leverage peaks. Fraud increases (revealed later). Warning signs dismissed. Bears capitulate or are silenced.

STAGE 4 - PROFIT-TAKING / DISTRESS: Informed insiders begin selling. Prices plateau. Leveraged positions become costly to carry. First defaults in the weakest credits. Still dismissed as "isolated incidents" or "contained." Liquidity starts to thin. Bid-ask spreads widen. Volume shifts from buying to selling.

STAGE 5 - PANIC / REVULSION: Prices fall below levels that trigger margin calls, covenants, and forced liquidation. Selling begets selling. Credit freezes. Counterparty risk spikes. Contagion to related and unrelated assets. Liquidity disappears. Prices overshoot to the downside. Only resolved by lender of last resort intervention (central bank) or time.

HISTORICAL EXAMPLES:
- Tulip Mania (1637): Classic 5-stage progression in 3 years
- South Sea Bubble (1720): Government debt converted to equity, Newton lost fortune
- 1929 Crash: Displacement (mass production/electrification), boom (1920s), margin lending euphoria, insider selling summer 1929, October panic
- Japan Bubble (1989): Real estate and equities. Nikkei 39,000 to 7,000. Still recovering 35 years later.
- Dot-com (2000): Internet displacement genuine but valuations insane. Nasdaq -78%.
- GFC (2008): Housing displacement (low rates + securitization), CDO leverage boom, "housing never goes down" euphoria, Bear Stearns distress (Mar 2008), Lehman panic (Sep 2008).
- Crypto (2022): DeFi/NFT displacement, leverage boom (3AC, Celsius, FTX), Luna panic, FTX fraud revealed.

APPLICATION TO CURRENT MARKETS: For any asset class showing boom characteristics, map to the Minsky stages. Key questions: Where is the leverage? (balance sheet, margin, derivatives) Who is the marginal buyer? (experienced or novice) What is the narrative? (justified innovation or "this time is different") Where are the informed insiders? (selling or buying). The model doesn't predict timing but it identifies vulnerability. When stage 3 characteristics are present, position for tail risk.`,
    category: "model",
    tags: JSON.stringify(["minsky", "kindleberger", "financial-crisis", "bubble", "historical-analogy", "credit-cycle", "leverage"]),
    source: "Kindleberger 'Manias, Panics, and Crashes', Minsky 'Stabilizing an Unstable Economy'",
    confidence: 0.92,
    status: "active",
    metadata: JSON.stringify({
      type: "historical-analogy",
      stages: ["Displacement", "Boom", "Euphoria", "Distress", "Panic"],
      historicalExamples: ["Tulips 1637", "1929", "Japan 1989", "Dot-com 2000", "GFC 2008", "Crypto 2022"],
      keyQuestions: ["Where is leverage?", "Who is marginal buyer?", "What is the narrative?", "Where are insiders?"],
      resolution: "Lender of last resort or time",
    }),
  },
  {
    title: "Reserve Currency Transition Patterns - Historical Hegemonic Cycles",
    content: `Global reserve currencies have changed roughly every 80-120 years, following a pattern of rise, dominance, overextension, and displacement. Understanding this cycle is critical for the longest-term macro positioning.

HISTORICAL RESERVE CURRENCIES:
1. Portuguese Real (1450-1530): Spice trade dominance. Ended: overextension, Spanish competition.
2. Spanish Silver Dollar (1530-1640): New World silver. Ended: inflation from too much silver, military overstretch (80 Years War, Armada defeat).
3. Dutch Guilder (1640-1720): Trade/finance innovation (Amsterdam Exchange, VOC). Ended: military overstretch (wars with England/France), loss of naval dominance.
4. French Livre (1720-1815): Continental dominance. Ended: Revolution, Napoleonic Wars, fiscal collapse.
5. British Pound (1815-1944): Industrial Revolution, empire, City of London. Ended: Two World Wars depleted reserves, Bretton Woods formalized the transition to USD.
6. US Dollar (1944-present): Bretton Woods, petrodollar system, deepest capital markets, military dominance.

TRANSITION PATTERN:
Each transition follows a sequence: (1) Real economy leadership erodes while financial dominance persists (UK 1890-1945: lost industrial lead to US/Germany but pound remained dominant). (2) Military overstretch drains fiscal resources. (3) Debt burden rises to unsustainable levels. (4) A crisis event formalizes what has already happened structurally.

The gap between losing real economic leadership and losing reserve currency status averages 30-50 years. This "imperial lag" is because the financial infrastructure (markets, institutions, legal systems, trust) persists long after the underlying economy weakens.

CURRENT USD ASSESSMENT:
Arguments for decline: Debt/GDP above 120%, fiscal deficits 6-8% of GDP outside recession, weaponization of dollar (sanctions) encouraging alternatives, BRICS+ settlement systems, central bank gold buying accelerating, US share of global GDP declining (25% to 16% PPP-adjusted).

Arguments for persistence: No alternative has the depth (US capital markets = $50T+ equity + $50T+ bonds), liquidity (dollar in 88% of FX transactions), trust (rule of law, property rights, independent judiciary - though increasingly questioned), and network effects. Euro lacks fiscal union. Yuan lacks convertibility. Gold lacks scalability. Crypto lacks stability.

Timeline estimate: Even if structural decline has begun, the "imperial lag" suggests USD dominance persists 20-40 more years in diminished form. The transition will be gradual (multi-polar reserve system) rather than sudden (replacement by single alternative). But tail risk of acceleration exists if US political instability undermines institutional trust.

WHAT TO MONITOR: Dollar share of global reserves (IMF COFER, currently 59%), dollar share of SWIFT transactions (currently 47%), central bank gold purchases (accelerating), bilateral currency swap agreements (expanding), mBridge/CIPS transaction volumes, US fiscal trajectory.`,
    category: "model",
    tags: JSON.stringify(["reserve-currency", "USD", "hegemonic-cycle", "historical-analogy", "de-dollarization", "BRICS", "transition"]),
    source: "Ray Dalio 'Principles for Dealing with the Changing World Order', Barry Eichengreen 'Exorbitant Privilege', IMF",
    confidence: 0.83,
    status: "active",
    metadata: JSON.stringify({
      type: "historical-analogy",
      cycleLength: "80-120 years",
      usdStart: 1944,
      currentAge: 82,
      imperialLag: "30-50 years between economic and financial decline",
      usdReserveShare: "59%",
      usdSwiftShare: "47%",
      transitionType: "Multi-polar (gradual), not replacement (sudden)",
    }),
  },

  // ═══════════════════════════════════════════
  // DOMESTIC INSTABILITY INDICATORS
  // ═══════════════════════════════════════════
  {
    title: "Domestic Instability Prediction Framework - Quantified Thresholds",
    content: `Quantitative thresholds that historically predict social unrest, political instability, and regime vulnerability. These apply across political systems and geographies.

ECONOMIC TRIGGERS:
- Food expenditure > 40% of household income: High probability of food riots. Most MENA countries are near or above this threshold for bottom quintile. Sub-Saharan Africa averages 40-60%.
- Youth unemployment > 25% sustained for 2+ years: Recruitment pool for extremism, protest movements, and criminal networks. Current: Spain 28%, Greece 25%, Tunisia 36%, Egypt 30%, South Africa 46%.
- Inflation > 40% annualized: Government loses ability to maintain social contract. Currency substitution begins. Examples: Turkey (85% peak 2022), Argentina (290% 2024), Zimbabwe, Venezuela.
- Real wage decline > 10% in 2 years: Loss of middle-class support for regime. This preceded Arab Spring, French Yellow Vests, Chilean protests.
- Gini coefficient > 0.50: Extreme inequality correlates with institutional instability. Brazil (0.53), South Africa (0.63), Colombia (0.51). US at 0.39 and rising (historically high for developed nations).

POLITICAL TRIGGERS:
- V-Dem Liberal Democracy Index declining for 3+ consecutive years: "Democratic backsliding." Currently occurring in 30+ countries including India, Turkey, Hungary, Poland, Tunisia, El Salvador.
- Ethnic/sectarian fractionalization + winner-take-all political system: Structural instability. Iraq, Lebanon, Myanmar, Ethiopia, Nigeria.
- Military spending > 5% of GDP without external threat: Often indicates regime insecurity. North Korea (25%), Saudi Arabia (6%), Russia (6%+), Israel (5.6%).
- Press freedom declining (RSF index): Precedes governance deterioration. Information control signals regime fear of accountability.

SOCIAL/STRUCTURAL TRIGGERS:
- Urbanization rate > 60% + unemployment: Urban concentration makes protest organization easier and security response harder. Arab Spring cities: Tunis, Cairo, Tripoli, Damascus, Sanaa.
- Social media penetration > 50% + pre-existing grievance: Coordination costs for protest approach zero. Every major protest movement since 2010 used social media for coordination.
- Remittance dependency > 10% of GDP: Economic shock in host countries transmits instability to home countries. Philippines (9%), Egypt (8%), Pakistan (8%), Central America (15-20%). When remittances fall, economies collapse.
- Brain drain acceleration: Educated professionals emigrating signals loss of confidence. Lebanon lost 40% of doctors since 2019. Venezuela lost 7+ million people (25% of population).

COMPOSITE SCORING:
Score each category 0-3 based on severity. Countries scoring 12+ out of maximum 18 across economic (3 sub-scores), political (3 sub-scores), and social (3 sub-scores) have historically experienced regime-threatening instability within 2-5 years.

CURRENT HIGH-RISK COUNTRIES (composite scoring):
Tier 1 (Imminent risk): Myanmar, Sudan, Haiti, Yemen, Syria, Afghanistan
Tier 2 (Elevated risk): Pakistan, Egypt, Tunisia, Ethiopia, Nigeria, Lebanon, Turkey
Tier 3 (Watch list): South Africa, Kenya, Bangladesh, Iraq, Iran, Colombia, Argentina

MARKET TRANSMISSION: Instability -> capital flight -> currency collapse -> sovereign CDS widening -> EM contagion (if large enough economy). Monitor: sovereign CDS spreads, parallel market FX premiums, Google Trends for "emigrate from [country]", protest frequency data.`,
    category: "model",
    tags: JSON.stringify(["instability", "unrest", "prediction", "thresholds", "political-risk", "regime-change", "indicators"]),
    source: "Fund for Peace Fragile States Index, V-Dem, World Bank, IMF",
    confidence: 0.87,
    status: "active",
    metadata: JSON.stringify({
      type: "prediction-model",
      keyThresholds: {
        foodSpend: ">40% of income",
        youthUnemployment: ">25% for 2+ years",
        inflation: ">40% annualized",
        realWageDecline: ">10% in 2 years",
        gini: ">0.50",
      },
      tier1Risk: ["Myanmar", "Sudan", "Haiti", "Yemen", "Syria", "Afghanistan"],
      tier2Risk: ["Pakistan", "Egypt", "Tunisia", "Ethiopia", "Nigeria", "Lebanon", "Turkey"],
      compositeThreshold: "12/18 = regime-threatening instability within 2-5 years",
    }),
  },

  // ═══════════════════════════════════════════
  // ILLICIT FINANCE & SHADOW ECONOMY
  // ═══════════════════════════════════════════
  {
    title: "Illicit Finance Networks - Sanctions Evasion, Shadow Banking, and State Actor Funding",
    content: `Illicit financial flows total an estimated $1.6-2.2 trillion annually (GFI estimates). Understanding these networks is essential because they directly intersect with sanctions effectiveness, state actor financing, and market integrity.

SANCTIONS EVASION MECHANISMS:

Russian Oil Shadow Fleet:
- 600+ aging tankers operating without Western insurance, flagged in Cameroon, Gabon, Palau, and other flags of convenience.
- Ship-to-ship transfers at sea (particularly off Ceuta, Malaysia, and India) obscure origin.
- Russian oil now sold at $5-15 discount to Brent (well above the $60 cap intended by G7).
- Volume: Russia still exporting 7-8 mbpd, with India and China as primary buyers at market-adjacent prices.
- Insurance: Russian and Chinese insurers replacing Western P&I clubs. Creates environmental liability gap if these tankers spill.

Iranian Oil Evasion:
- "Dark fleet" of tankers turning off AIS transponders in approaches to Chinese ports.
- Volume: Estimated 1.3-1.8 mbpd reaching China through ship-to-ship transfers and intermediaries.
- Malaysian and UAE ports used as transshipment hubs. Oil relabeled as Malaysian or Omani origin.
- Payment: Settled in yuan, barter arrangements, or through hawala networks.

North Korean Evasion:
- Ship-to-ship coal and oil transfers. DPRK-flagged vessels use false AIS identities.
- Cyber theft: Lazarus Group has stolen $3B+ in cryptocurrency since 2017. Funds North Korean weapons programs directly.
- Overseas labor (declining due to UN sanctions enforcement but still active in China, Russia).

CRYPTOCURRENCY & DIGITAL EVASION:
- Tornado Cash (sanctioned by OFAC Aug 2022): Ethereum mixer used by North Korean hackers (Lazarus Group) to launder $455M from Axie Infinity hack.
- Tether (USDT): Largest stablecoin ($95B+). Widely used for informal value transfer. USDT on Tron network is the "new hawala" for cross-border value transfer in sanctioned jurisdictions.
- Sinbad, YoMix (mixers replacing Tornado Cash): New mixing services emerge faster than enforcement can shut them down.
- OTC desks in Dubai, Hong Kong: Convert crypto to fiat with minimal KYC. Used by sanctioned entities and criminal networks.
- Estimated $20-40B/year in illicit crypto flows (Chainalysis).

HAWALA AND INFORMAL VALUE TRANSFER:
- Hawala networks move an estimated $200-300B annually, primarily in South Asia, Middle East, and East Africa.
- Based on trust networks, no physical money crosses borders. Settled through trade invoice manipulation (over/under-invoicing), gold transfers, or periodic netting.
- Used by: Migrant workers (legitimate), terrorist financing (al-Qaeda, ISIS), sanctions evasion, tax evasion, capital flight.
- Essentially untrackable through traditional financial surveillance.

TRADE-BASED MONEY LAUNDERING:
- Largest channel for illicit finance globally ($800B-2T by some estimates).
- Mechanism: Over-invoicing imports or under-invoicing exports to transfer value across borders. Example: importing $1M of goods invoiced at $5M, with $4M representing illicit capital transfer.
- Particularly prevalent in China-Africa, China-Latin America trade corridors.
- Free Trade Zones (Dubai, Panama, Singapore) facilitate re-invoicing and transshipment.

INTELLIGENCE VALUE: Tracking illicit finance flows reveals: (1) True state of sanctions pressure on targeted regimes, (2) Hidden revenue streams funding military programs, (3) Vulnerability of financial system to money laundering, (4) Cryptocurrency adoption patterns that may become mainstream. Monitor: Chainalysis reports, ship tracking anomalies (AIS dark periods), trade flow statistical anomalies (UN Comtrade data), FATF grey/blacklist changes, FinCEN enforcement actions.`,
    category: "geopolitical",
    tags: JSON.stringify(["illicit-finance", "sanctions-evasion", "shadow-fleet", "hawala", "cryptocurrency", "money-laundering", "dark-fleet"]),
    source: "Global Financial Integrity, Chainalysis, FATF, RUSI, UN Panel of Experts reports",
    confidence: 0.85,
    status: "active",
    metadata: JSON.stringify({
      type: "financial-intelligence",
      totalIllicitFlows: "$1.6-2.2T annually",
      russianShadowFleet: "600+ tankers",
      iranianEvasion: "1.3-1.8 mbpd to China",
      nkCryptoTheft: "$3B+ since 2017",
      hawalaVolume: "$200-300B annually",
      cryptoIllicit: "$20-40B/year",
      tradeBasedML: "$800B-2T",
    }),
  },
  {
    title: "Offshore Financial Architecture - Tax Havens, Shell Companies, and Hidden Wealth",
    content: `An estimated $8-12 trillion in private financial wealth is held offshore, and approximately $600 billion in annual tax revenue is lost through corporate profit shifting. This architecture directly affects market analysis because it hides true exposure, leverage, and beneficial ownership.

KEY OFFSHORE JURISDICTIONS AND SPECIALIZATIONS:

BRITISH CROWN DEPENDENCIES/OVERSEAS TERRITORIES:
- Cayman Islands: $5.5T in fund assets. World's 5th largest financial center by AUM. 85% of world's hedge funds domiciled here. Zero tax. Preferred for fund structuring.
- British Virgin Islands (BVI): 400,000+ active companies. Corporate secrecy vehicle. ~40% of all offshore companies globally. Minimal beneficial ownership disclosure (improving under international pressure).
- Jersey/Guernsey: Trust jurisdiction. Old wealth preservation. Estimated $1T+ in trust assets.
- Bermuda: Insurance/reinsurance hub ($200B+ in premiums). Captive insurance vehicles.

EUROPEAN:
- Luxembourg: $5.5T in investment fund assets. Special Purpose Vehicles (SPVs) for EU corporate structuring. Amazon, IKEA, and many multinationals route profits through Luxembourg entities.
- Ireland: Effective corporate tax rate well below headline 12.5% (double Irish, now closing but grandfathered). Apple held $252B offshore via Irish entities.
- Netherlands: "Dutch sandwich" conduit for royalty and IP payments. Treaty network makes it ideal for holding company structures.
- Switzerland: $2.4T in cross-border wealth management. Banking secrecy reduced post-CRS (Common Reporting Standard) but still significant for non-participating countries.

ASIAN:
- Singapore: Fastest-growing wealth management hub. $4T+ in assets under management. Family office boom (4,000+ registered). Low tax, strong rule of law, geographic convenience.
- Hong Kong: $1.5T+ in fund AUM. Gateway to China wealth. Increasingly subject to mainland Chinese oversight.
- Dubai/DIFC: Rapidly growing as wealth destination for Russian (post-sanctions), Indian, and African capital. Golden visa program. Free zone structures.

INTELLIGENCE VALUE FOR MARKET ANALYSIS:
- Hidden leverage: Offshore SPVs and shell companies can hide true leverage levels. Archegos collapse (2021, $30B loss) was partially enabled by total return swap structures that avoided position disclosure requirements.
- Beneficial ownership opacity: Who actually controls assets matters for understanding market concentration, political exposure, and sanction compliance.
- Capital flight tracking: Surges in offshore company formation from specific countries signal political/economic instability. BVI company formations by Chinese nationals surged in 2022-2023.
- Sanctions effectiveness: Beneficial ownership registries (UK, EU rolling out) are critical for sanctions enforcement. Gaps in coverage create evasion opportunities.

REFORM TRAJECTORY: OECD BEPS (Base Erosion and Profit Shifting) and Pillar Two global minimum tax (15%) are structurally reducing corporate profit shifting. CRS (automatic information exchange between tax authorities) is reducing individual evasion. But enforcement is uneven and new structures emerge continuously. The system adapts faster than regulators.`,
    category: "market",
    tags: JSON.stringify(["offshore", "tax-havens", "shell-companies", "hidden-wealth", "cayman", "BVI", "beneficial-ownership"]),
    source: "Tax Justice Network, ICIJ (Panama/Pandora Papers), OECD, Gabriel Zucman research",
    confidence: 0.87,
    status: "active",
    metadata: JSON.stringify({
      type: "financial-architecture",
      offshoreWealth: "$8-12T",
      annualTaxLoss: "$600B",
      caymanAUM: "$5.5T",
      bviCompanies: "400,000+",
      singaporeAUM: "$4T+",
      hedgeFundDomicile: "85% in Cayman",
      reformTrend: "OECD BEPS, Pillar Two 15% minimum, CRS expanding",
    }),
  },
];

/**
 * Ingest final layer of knowledge entries into the database.
 */
export async function ingestFinalKnowledge(): Promise<{
  ingested: number;
  errors: number;
  details: Array<{ title: string; id?: number; error?: string }>;
}> {
  let ingested = 0;
  let errors = 0;
  const details: Array<{ title: string; id?: number; error?: string }> = [];

  for (const entry of entries) {
    try {
      const result = await addKnowledge(entry);
      ingested++;
      details.push({ title: entry.title, id: result.id });
    } catch (err) {
      errors++;
      const message = err instanceof Error ? err.message : "Unknown error";
      details.push({ title: entry.title, error: message });
      console.error(`Failed to ingest "${entry.title}":`, message);
    }
  }

  return { ingested, errors, details };
}

export const FINAL_ENTRY_COUNT = entries.length;
