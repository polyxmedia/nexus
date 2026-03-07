import { addKnowledge } from "./engine";
import type { NewKnowledgeEntry } from "@/lib/db/schema";

type KnowledgeInput = Omit<NewKnowledgeEntry, "id" | "createdAt">;

const entries: KnowledgeInput[] = [
  // ═══════════════════════════════════════════
  // TIER 1: STRATEGIC CHOKEPOINTS
  // ═══════════════════════════════════════════
  {
    title: "Strait of Hormuz - Strategic Chokepoint Profile",
    content: `The Strait of Hormuz is a narrow waterway between Iran and Oman connecting the Persian Gulf to the Gulf of Oman and the Arabian Sea. Approximately 21 million barrels of oil per day transit the strait (roughly 21% of global petroleum consumption). The navigable channel is only 3.2km wide in each direction. Iran controls the northern shore and has repeatedly threatened closure during tensions. Key military assets in the area include Iranian fast-attack craft, anti-ship missiles (Noor, Qader), and mine-laying capability. The US Fifth Fleet is based in Bahrain to counter threats. Any disruption would immediately spike Brent crude 15-30% based on historical precedent. LNG shipments through Hormuz account for approximately 25-30% of global LNG trade, primarily from Qatar.`,
    category: "geopolitical",
    tags: JSON.stringify(["chokepoint", "oil", "iran", "middle-east", "energy", "hormuz", "naval"]),
    source: "EIA, IISS Strategic Survey",
    confidence: 0.95,
    status: "active",
    metadata: JSON.stringify({
      type: "chokepoint",
      dailyBarrels: 21000000,
      globalOilShare: 0.21,
      channelWidthKm: 3.2,
      primaryThreat: "Iran",
      marketImpact: { brentSpike: "15-30%", timeframe: "immediate" },
    }),
  },
  {
    title: "Strait of Malacca - Strategic Chokepoint Profile",
    content: `The Strait of Malacca runs between Malaysia, Singapore, and Indonesia, serving as the shortest sea route between the Indian and Pacific Oceans. Approximately 16 million barrels of oil per day transit the strait. At its narrowest point (Phillips Channel near Singapore), it is only 2.8km wide. This is the primary energy supply route for China, Japan, South Korea, and Taiwan. Over 60,000 vessels transit annually, carrying roughly 25% of all global trade by value. Piracy remains a concern though reduced from historical peaks. Any blockade would force rerouting via Lombok or Sunda Straits, adding 2-3 days transit time and significant cost. China's "Malacca Dilemma" drives its investment in overland pipelines through Myanmar and Pakistan (CPEC/Gwadar).`,
    category: "geopolitical",
    tags: JSON.stringify(["chokepoint", "oil", "china", "asia-pacific", "trade", "malacca", "naval"]),
    source: "UNCTAD, S&P Global",
    confidence: 0.95,
    status: "active",
    metadata: JSON.stringify({
      type: "chokepoint",
      dailyBarrels: 16000000,
      annualVessels: 60000,
      narrowestWidthKm: 2.8,
      rerouteDelayDays: 3,
      dependentEconomies: ["China", "Japan", "South Korea", "Taiwan"],
    }),
  },
  {
    title: "Suez Canal - Strategic Chokepoint Profile",
    content: `The Suez Canal connects the Mediterranean Sea to the Red Sea through Egypt. Approximately 5.5 million barrels of oil equivalent per day transit the canal (including petroleum, LNG, and refined products). Around 12-15% of global trade passes through. The canal was expanded in 2015 to allow two-way traffic along part of its length. Revenue to Egypt is approximately $9-10 billion annually. The Ever Given blockage (March 2021) demonstrated vulnerability: 6 days of blockage held up an estimated $9.6 billion in daily trade. Alternative routing via Cape of Good Hope adds 10-15 days. Houthi attacks on Red Sea shipping (2023-2024) forced major rerouting, effectively reducing Suez traffic by 40-50% and increasing shipping costs 200-300%.`,
    category: "geopolitical",
    tags: JSON.stringify(["chokepoint", "oil", "egypt", "trade", "suez", "red-sea", "houthi"]),
    source: "Suez Canal Authority, Lloyd's List",
    confidence: 0.95,
    status: "active",
    metadata: JSON.stringify({
      type: "chokepoint",
      dailyBarrels: 5500000,
      globalTradeShare: 0.13,
      annualRevenue: "$9-10B",
      rerouteDelayDays: 12,
      houthiImpact: { trafficReduction: "40-50%", costIncrease: "200-300%" },
    }),
  },
  {
    title: "Bab el-Mandeb - Strategic Chokepoint Profile",
    content: `Bab el-Mandeb ("Gate of Tears") connects the Red Sea to the Gulf of Aden between Yemen and Djibouti/Eritrea. Approximately 6.2 million barrels of oil per day transit the strait. The navigable channel is only 25km wide. All Suez Canal traffic must pass through Bab el-Mandeb. Yemen's civil war and Houthi control of the eastern shore create ongoing threat. Iran-backed Houthi forces have demonstrated anti-ship missile and drone capability against commercial vessels. The US, France, China, and Japan all maintain military bases in Djibouti on the western shore. Disruption at Bab el-Mandeb effectively closes the Suez route entirely.`,
    category: "geopolitical",
    tags: JSON.stringify(["chokepoint", "oil", "yemen", "houthi", "red-sea", "bab-el-mandeb", "naval"]),
    source: "EIA, CENTCOM",
    confidence: 0.93,
    status: "active",
    metadata: JSON.stringify({
      type: "chokepoint",
      dailyBarrels: 6200000,
      channelWidthKm: 25,
      primaryThreat: "Houthi/Iran",
      militaryBases: ["US/Djibouti", "France/Djibouti", "China/Djibouti", "Japan/Djibouti"],
    }),
  },
  {
    title: "Turkish Straits (Bosporus/Dardanelles) - Strategic Chokepoint Profile",
    content: `The Turkish Straits system (Bosporus and Dardanelles) connects the Black Sea to the Mediterranean via the Sea of Marmara. Approximately 3 million barrels of oil per day transit northbound and southbound. The Bosporus is one of the world's narrowest straits used for international navigation at 700 meters at its tightest point. Turkey controls both straits and regulates transit under the 1936 Montreux Convention, which gives Turkey authority to restrict warship passage. Critical for Russian and Caspian oil exports. The Russia-Ukraine conflict elevated the strategic importance as Black Sea grain and energy exports depend on Turkish strait access.`,
    category: "geopolitical",
    tags: JSON.stringify(["chokepoint", "oil", "turkey", "russia", "black-sea", "bosporus", "montreux"]),
    source: "Turkish Maritime Authority, EIA",
    confidence: 0.93,
    status: "active",
    metadata: JSON.stringify({
      type: "chokepoint",
      dailyBarrels: 3000000,
      narrowestWidthM: 700,
      controllingTreaty: "Montreux Convention 1936",
      controllingState: "Turkey",
    }),
  },

  // ═══════════════════════════════════════════
  // TIER 1: NUCLEAR PROGRAMS
  // ═══════════════════════════════════════════
  {
    title: "Iran Nuclear Program - Current Status",
    content: `Iran's nuclear program has escalated significantly since the US withdrawal from the JCPOA in 2018. As of latest IAEA reports, Iran is enriching uranium to 60% purity (weapons-grade is 90%) at both Natanz and Fordow facilities. Iran's stockpile of enriched uranium exceeds 30 times the JCPOA limit. Breakout time (time to produce enough weapons-grade material for one device) is estimated at 1-2 weeks, down from approximately 12 months under the JCPOA. Iran operates advanced IR-6 and IR-8 centrifuges. The Fordow facility is built inside a mountain, making it highly resistant to conventional military strikes. Key facilities: Natanz (primary enrichment), Fordow (hardened enrichment), Isfahan (conversion), Arak (heavy water reactor, modified), Parchin (suspected weapons research). IAEA inspectors have been denied access to monitoring equipment since February 2021.`,
    category: "geopolitical",
    tags: JSON.stringify(["nuclear", "iran", "JCPOA", "enrichment", "IAEA", "proliferation", "middle-east"]),
    source: "IAEA Reports, ISIS (Institute for Science and International Security)",
    confidence: 0.90,
    status: "active",
    validFrom: "2024-01-01",
    metadata: JSON.stringify({
      enrichmentLevel: "60%",
      breakoutTimeWeeks: "1-2",
      keyFacilities: ["Natanz", "Fordow", "Isfahan", "Arak", "Parchin"],
      advancedCentrifuges: ["IR-6", "IR-8"],
      marketImpact: {
        escalation: "Oil +15-25%, Gold +5-10%, Defense stocks +8-15%",
        deescalation: "Oil -10%, Iran-exposed assets rally",
      },
    }),
  },
  {
    title: "North Korea Nuclear Arsenal - Current Status",
    content: `North Korea possesses an estimated 40-60 nuclear warheads with continued production of fissile material at Yongbyon. The country has demonstrated thermonuclear (hydrogen bomb) capability with the September 2017 test estimated at 100-370 kilotons. ICBM program includes Hwasong-15 (range 13,000km, covers entire US mainland), Hwasong-17 (range 15,000km+), and Hwasong-18 (solid-fuel, reduced launch preparation time). Tactical nuclear weapons program announced in 2022 with multiple short-range delivery systems. North Korea also maintains one of the world's largest chemical weapons stockpiles (estimated 2,500-5,000 tons) and a biological weapons capability. Sanctions regime is the most comprehensive in UN history but enforcement has weakened, particularly from China and Russia.`,
    category: "geopolitical",
    tags: JSON.stringify(["nuclear", "north-korea", "ICBM", "proliferation", "asia-pacific", "sanctions"]),
    source: "SIPRI, 38 North, RAND Corporation",
    confidence: 0.85,
    status: "active",
    metadata: JSON.stringify({
      estimatedWarheads: "40-60",
      maxYield: "100-370kt",
      icbmRange: "15000km+",
      solidFuelICBM: "Hwasong-18",
    }),
  },

  // ═══════════════════════════════════════════
  // TIER 1: OPEC+ PRODUCTION
  // ═══════════════════════════════════════════
  {
    title: "OPEC+ Production Quotas and Spare Capacity",
    content: `OPEC+ (OPEC plus Russia-led allies) controls approximately 40% of global oil production and over 80% of proven reserves. Saudi Arabia is the swing producer with estimated spare capacity of 2-3 million barrels per day. Total OPEC+ spare capacity is approximately 4-5 million bpd, almost entirely concentrated in Saudi Arabia and UAE. Key quota allocations (approximate baseline): Saudi Arabia 10.5 mbpd, Russia 10.5 mbpd, Iraq 4.4 mbpd, UAE 3.2 mbpd, Kuwait 2.7 mbpd. Voluntary cuts have kept actual production below quotas. The group meets regularly (typically monthly) to adjust production levels. Saudi Arabia's fiscal breakeven oil price is estimated at $80-85/barrel. Russia's is approximately $60-70/barrel. Compliance monitoring is done via secondary sources (Platts, Argus, IEA).`,
    category: "market",
    tags: JSON.stringify(["OPEC", "oil", "production", "saudi-arabia", "russia", "energy", "commodities"]),
    source: "OPEC Monthly Oil Market Report, IEA",
    confidence: 0.90,
    status: "active",
    metadata: JSON.stringify({
      globalProductionShare: 0.40,
      saudiSpareCapacity: "2-3 mbpd",
      totalSpareCapacity: "4-5 mbpd",
      saudiFiscalBreakeven: "$80-85",
      russiaFiscalBreakeven: "$60-70",
      meetingFrequency: "monthly",
    }),
  },

  // ═══════════════════════════════════════════
  // TIER 1: SANCTIONS REGIMES
  // ═══════════════════════════════════════════
  {
    title: "Active Sanctions Regimes - Comprehensive Overview",
    content: `Major active sanctions programs and their market implications:

RUSSIA: Most comprehensive Western sanctions since 2022. Oil price cap at $60/barrel (G7). SWIFT disconnection for major banks. Central bank reserves frozen (~$300B). Export controls on semiconductors, advanced tech. Shadow fleet of 600+ tankers circumventing oil cap. India and China remain major buyers at discounted prices.

IRAN: Comprehensive US sanctions (reimposed 2018). Oil exports officially restricted but significant evasion via China (~1.5 mbpd). Central bank sanctioned. SWIFT access restricted. Secondary sanctions threat on third-party entities.

CHINA: Targeted export controls on advanced semiconductors (October 2022, expanded 2023). Entity List restrictions on Huawei, SMIC, others. Chip fabrication equipment restrictions (ASML, applied jointly with Netherlands/Japan). Investment screening for AI, quantum, semiconductors.

NORTH KOREA: Most comprehensive UN sanctions regime. Near-total trade embargo. Coal, iron, textiles banned. Oil imports capped at 500,000 barrels/year. Significant evasion via ship-to-ship transfers.

VENEZUELA: Oil sector sanctions with licenses for specific operations. Chevron license allows limited production/export. Political conditions tied to democratic benchmarks.`,
    category: "geopolitical",
    tags: JSON.stringify(["sanctions", "russia", "iran", "china", "trade-war", "SWIFT", "oil-cap"]),
    source: "US Treasury OFAC, EU Council, UN Security Council",
    confidence: 0.90,
    status: "active",
    metadata: JSON.stringify({
      regimes: {
        russia: { frozenReserves: "$300B", oilCap: "$60/bbl", shadowFleet: "600+" },
        iran: { oilExportsToChina: "1.5 mbpd" },
        china: { focus: "semiconductors, AI, quantum" },
        northKorea: { oilCap: "500000 bbl/yr" },
      },
    }),
  },

  // ═══════════════════════════════════════════
  // TIER 1: CENTRAL BANK RESERVES
  // ═══════════════════════════════════════════
  {
    title: "Global Central Bank Reserve Composition",
    content: `Global foreign exchange reserves total approximately $12.4 trillion. US Dollar share has declined from 71% (2001) to approximately 58-59% (latest IMF COFER data), still dominant but trending down. Euro holds approximately 20%. Japanese Yen approximately 5.5%. British Pound approximately 4.8%. Chinese Yuan approximately 2.3% (up from near zero in 2016). Central bank gold purchases have accelerated significantly: 1,037 tonnes in 2023 (second consecutive year above 1,000t). China, Poland, Singapore, India, and Turkey are largest recent gold buyers. China officially holds 2,264 tonnes but actual holdings likely higher. De-dollarization is a structural trend but USD remains irreplaceable for trade settlement and deep capital markets. Key to monitor: BRICS+ push for alternative settlement systems, digital currencies (mBridge project).`,
    category: "market",
    tags: JSON.stringify(["central-banks", "reserves", "USD", "gold", "de-dollarization", "BRICS", "forex"]),
    source: "IMF COFER, World Gold Council, BIS",
    confidence: 0.90,
    status: "active",
    metadata: JSON.stringify({
      totalReserves: "$12.4T",
      usdShare: 0.59,
      euroShare: 0.20,
      yuanShare: 0.023,
      goldPurchases2023: "1037 tonnes",
      topGoldBuyers: ["China", "Poland", "Singapore", "India", "Turkey"],
    }),
  },

  // ═══════════════════════════════════════════
  // TIER 2: HISTORICAL MARKET REACTIONS
  // ═══════════════════════════════════════════
  {
    title: "Historical Market Reactions to Geopolitical Events",
    content: `Reference database of market reactions to major geopolitical events:

GULF WAR I (Aug 1990 - Jan 1991): Oil doubled from $21 to $41. S&P 500 fell 16.9% in 3 months. Recovery began before ground war started. Gold +8%.

9/11 ATTACKS (Sep 2001): S&P 500 fell 11.6% in first week. Markets closed 4 trading days. Full recovery within 2 months. Airlines -30 to -50%. Defense stocks +15-30%.

IRAQ INVASION (Mar 2003): "Sell the rumor, buy the invasion." S&P 500 rallied 2.3% on invasion day. Oil fell from $37 to $28 within weeks. Markets had priced in the conflict during buildup.

CRIMEA ANNEXATION (Mar 2014): Russian markets fell 12% in one day. Ruble fell 10%. S&P 500 impact minimal (-1.3%). European markets fell 2-3%. Energy sector initially volatile then stabilized.

RUSSIA-UKRAINE FULL INVASION (Feb 2022): Brent crude spiked to $130. European natural gas up 400% from pre-crisis. S&P 500 fell 2.1% on day one. MOEX (Russian exchange) fell 33%, then closed for a month. Wheat futures hit record highs.

OCTOBER 7 HAMAS ATTACK (Oct 2023): Oil initially +4%. Israeli shekel fell 3%. Tel Aviv 35 index fell 6.4%. Global equity impact muted. Gold +2%.

PATTERN: Markets typically overreact to initial shock, then recover within 1-3 months unless the event causes sustained supply disruption or broader economic contagion. The "buy the invasion" pattern holds in most cases where the conflict is geographically contained.`,
    category: "market",
    tags: JSON.stringify(["historical", "market-reaction", "geopolitical-risk", "crisis", "pattern", "reference"]),
    source: "Bloomberg, S&P Global, Federal Reserve Economic Data",
    confidence: 0.92,
    status: "active",
    metadata: JSON.stringify({
      pattern: "Initial overreaction, 1-3 month recovery for contained conflicts",
      keyRule: "Buy the invasion when geographically contained",
      exceptions: "Sustained supply disruptions (1973 oil embargo, 2022 natgas)",
    }),
  },

  // ═══════════════════════════════════════════
  // TIER 2: VIX REFERENCE LEVELS
  // ═══════════════════════════════════════════
  {
    title: "VIX Historical Reference Levels and Regime Classification",
    content: `VIX (CBOE Volatility Index) reference levels for regime classification:

COMPLACENCY (VIX < 13): Historically precedes corrections. Extended periods below 13 often end with sharp spikes. 2017 averaged 11.1, followed by Volmageddon (Feb 2018, VIX to 50).

LOW VOLATILITY (VIX 13-16): Normal bull market conditions. Favors carry trades and short vol strategies.

NORMAL (VIX 16-20): Typical range during mixed conditions. Markets functioning normally with standard uncertainty.

ELEVATED (VIX 20-25): Heightened concern. Often during earnings uncertainty, geopolitical tensions, or policy shifts. Increased hedging demand.

HIGH (VIX 25-30): Significant stress. Usually corresponds to 5-10% market corrections. Options premiums significantly elevated.

CRISIS (VIX 30-40): Major dislocations. Liquidity deteriorating. Correlations spike toward 1.0. 2022 Russia invasion peaked at 36.5.

EXTREME (VIX > 40): Rare panic events. Financial Crisis 2008: peaked at 80.86. COVID March 2020: peaked at 82.69. Flash Crash 2010: briefly hit 40.

KEY INSIGHT: VIX term structure (contango vs backwardation) matters as much as level. Backwardation (near-term > far-term) signals acute stress. Contango is normal. VIX futures basis (VVIX) provides volatility-of-volatility signal.`,
    category: "market",
    tags: JSON.stringify(["VIX", "volatility", "risk", "regime", "reference", "options"]),
    source: "CBOE, Bloomberg",
    confidence: 0.95,
    status: "active",
    metadata: JSON.stringify({
      regimes: {
        complacency: { range: "<13", signal: "Correction risk" },
        low: { range: "13-16", signal: "Bull market" },
        normal: { range: "16-20", signal: "Mixed" },
        elevated: { range: "20-25", signal: "Heightened concern" },
        high: { range: "25-30", signal: "Significant stress" },
        crisis: { range: "30-40", signal: "Major dislocation" },
        extreme: { range: ">40", signal: "Panic" },
      },
      historicalPeaks: { GFC2008: 80.86, COVID2020: 82.69, Volmageddon2018: 50 },
    }),
  },

  // ═══════════════════════════════════════════
  // TIER 2: COMMODITY SEASONALITY
  // ═══════════════════════════════════════════
  {
    title: "Commodity Seasonality Patterns",
    content: `Documented seasonal patterns in major commodities:

CRUDE OIL: Tends to rally Q1-Q2 (refinery maintenance ends, summer driving season demand builds). "Sell in May" effect less pronounced for oil than equities. Hurricane season (Jun-Nov) adds Gulf of Mexico production risk. Winter heating demand supports Q4 prices.

NATURAL GAS: Strongest seasonal pattern of any major commodity. Injection season (Apr-Oct) typically sees lower prices. Withdrawal season (Nov-Mar) drives price spikes, especially with cold weather. Storage levels relative to 5-year average are the key metric.

GOLD: Historically strongest Sep-Jan (Indian wedding season demand, Chinese New Year buying, portfolio rebalancing). Weakest Jun-Jul. However, macro factors (rates, USD, geopolitics) dominate seasonal patterns.

AGRICULTURAL: Corn and soybeans follow US growing season. "Weather market" period May-August when crop uncertainty is highest. Harvest pressure (Sep-Nov) typically depresses prices. "Buy the rumor, sell the fact" on USDA crop reports.

COPPER: Often called "Dr. Copper" for economic sensitivity. Tends to rally with Chinese construction season (Mar-Jun). Weakens during Northern Hemisphere winter. Chinese PMI and credit impulse are leading indicators.`,
    category: "market",
    tags: JSON.stringify(["commodities", "seasonality", "oil", "gold", "natural-gas", "copper", "pattern"]),
    source: "CME Group, Seasonal Charts, MRCI",
    confidence: 0.85,
    status: "active",
    metadata: JSON.stringify({
      oilStrong: "Q1-Q2",
      natgasStrong: "Nov-Mar",
      goldStrong: "Sep-Jan",
      copperStrong: "Mar-Jun",
      agWeatherMarket: "May-Aug",
    }),
  },

  // ═══════════════════════════════════════════
  // TIER 2: MAJOR DEBT MATURITY CALENDARS
  // ═══════════════════════════════════════════
  {
    title: "Sovereign and Corporate Debt Maturity Risk Calendar",
    content: `Key debt maturity walls and refinancing risks:

US TREASURY: $8-9 trillion in debt matures annually, requiring constant refinancing. Treasury auction calendar is critical. Failed auctions or tail spreads signal stress. 10Y/2Y inversion has preceded every recession since 1970 (with variable lead time of 6-24 months).

CHINA: Local government financing vehicles (LGFVs) have approximately $9 trillion in debt, much of it maturing 2024-2026. Property developer defaults (Evergrande, Country Garden) remain ongoing. Offshore dollar bonds are the canary.

EMERGING MARKETS: $4+ trillion in EM external debt. Dollar-denominated debt becomes harder to service when USD strengthens. Key watchlist: Turkey, Egypt, Pakistan, Sri Lanka, Ghana, Ethiopia (already defaulted or restructuring).

CORPORATE HIGH YIELD: Maturity wall of approximately $1.5 trillion in US HY bonds coming due 2025-2027. Refinancing at higher rates squeezes leveraged companies. Default rates rising from cyclical lows. Leveraged loans (floating rate) already feeling pain.

JAPAN: Government debt at 260% of GDP (highest developed nation). BOJ holds ~50% of JGB market. Any shift from yield curve control could trigger global bond repricing. Japanese investors are largest foreign holders of US Treasuries.`,
    category: "market",
    tags: JSON.stringify(["debt", "bonds", "treasury", "maturity", "refinancing", "sovereign-risk", "credit"]),
    source: "BIS, IMF Global Financial Stability Report, Bloomberg",
    confidence: 0.88,
    status: "active",
    metadata: JSON.stringify({
      usAnnualMaturity: "$8-9T",
      chinaLGFV: "$9T",
      emExternalDebt: "$4T+",
      usHYMaturityWall: "$1.5T (2025-2027)",
      japanDebtToGDP: 2.6,
    }),
  },

  // ═══════════════════════════════════════════
  // TIER 2: CURRENCY PEG REFERENCE
  // ═══════════════════════════════════════════
  {
    title: "Major Currency Pegs and Managed Exchange Rates",
    content: `Active currency pegs and managed exchange rates to monitor for break risk:

HONG KONG DOLLAR (HKD): Pegged to USD at 7.75-7.85 since 1983. Defended by $420B+ in reserves. The peg's credibility is tested during capital outflow periods. A break would signal major China/US financial decoupling.

SAUDI RIYAL (SAR): Pegged to USD at 3.75 since 1986. Backed by $430B+ in reserves and oil revenues. The peg anchors the petrodollar system. Any move away would be seismic for USD reserve status.

UAE DIRHAM (AED): Pegged to USD at 3.6725 since 1997. Supported by sovereign wealth and oil revenues.

CHINESE YUAN (CNY): Managed float against basket of currencies. PBOC sets daily fixing rate with +/- 2% band. Intervention via state banks when depreciation pressure builds. 7.00 is a psychological level. Capital controls prevent free convertibility.

EGYPTIAN POUND (EGP): Multiple devaluations since 2022 (from 15.7 to 50+). IMF program tied to exchange rate flexibility. Parallel market premium is a stress indicator.

TURKISH LIRA (TRY): Managed depreciation after period of unorthodox policy (rate cuts during high inflation 2021-2023). Return to orthodox monetary policy in 2023. Still vulnerable to capital flight.

PATTERN: Pegs that break tend to break suddenly and violently. Defend, defend, defend, then collapse. Forward points and NDF premiums are early warning signals.`,
    category: "market",
    tags: JSON.stringify(["forex", "currency-peg", "HKD", "SAR", "CNY", "exchange-rate", "risk"]),
    source: "BIS, Central Bank Publications",
    confidence: 0.90,
    status: "active",
    metadata: JSON.stringify({
      pegs: {
        HKD: { rate: "7.75-7.85", since: 1983, reserves: "$420B+" },
        SAR: { rate: 3.75, since: 1986, reserves: "$430B+" },
        AED: { rate: 3.6725, since: 1997 },
        CNY: { band: "+/- 2%", psychLevel: 7.0 },
      },
      pattern: "Sudden collapse after extended defense period",
    }),
  },

  // ═══════════════════════════════════════════
  // GEOPOLITICAL POWER ARCHITECTURE
  // (from "The Architecture of Impunity")
  // ═══════════════════════════════════════════
  {
    title: "Balfour Declaration - Financial Architecture of State Formation",
    content: `The Balfour Declaration (November 2, 1917) represents a case study in financial-political architecture influencing state formation. The declaration was a letter from British Foreign Secretary Arthur Balfour to Lord Walter Rothschild, a leader of the British Jewish community. The Rothschild banking family had provided critical war financing to Britain. The declaration pledged British support for "a national home for the Jewish people" in Palestine. At the time, Palestine was part of the Ottoman Empire, and its population was approximately 90% Arab. The declaration included the caveat that "nothing shall be done which may prejudice the civil and religious rights of existing non-Jewish communities in Palestine." This represents one of the clearest historical examples of financial leverage translating into geopolitical outcomes: a private banking family's war financing role directly influenced imperial policy on territorial disposition. The structural pattern (financial leverage converting to political outcomes) recurs throughout modern geopolitics.`,
    category: "geopolitical",
    tags: JSON.stringify(["historical", "israel-palestine", "financial-architecture", "rothschild", "balfour", "state-formation", "power-structure"]),
    source: "The Architecture of Impunity (Andre Figueira), British National Archives",
    confidence: 0.92,
    status: "active",
    validFrom: "1917-11-02",
    metadata: JSON.stringify({
      type: "historical-power-architecture",
      pattern: "Financial leverage -> political outcomes",
      primaryActors: ["Rothschild family", "British Empire", "Zionist movement"],
      structuralLesson: "Private financial power can redirect imperial territorial policy",
    }),
  },
  {
    title: "AIPAC Lobbying Infrastructure - Quantified Political Influence",
    content: `The American Israel Public Affairs Committee (AIPAC) represents the most well-documented case of organized political lobbying in US politics. Quantified metrics: AIPAC and affiliated PACs spent over $100 million in the 2024 election cycle. The organization maintains relationships with virtually every member of Congress. AIPAC's political action committee, United Democracy Project, has defeated primary challengers who criticized Israel policy. Structural mechanism: AIPAC bundles individual donations rather than giving directly in most cases, making its influence harder to track through standard FEC filings. The organization holds an annual policy conference attended by the majority of Congress. Members who break with AIPAC positions face well-funded primary challengers. This creates a structural incentive alignment where political survival correlates with policy alignment. The lobbying model has been studied as a template by other interest groups for its effectiveness in converting financial resources into durable policy outcomes.`,
    category: "geopolitical",
    tags: JSON.stringify(["lobbying", "AIPAC", "US-politics", "israel", "political-influence", "power-structure"]),
    source: "The Architecture of Impunity (Andre Figueira), OpenSecrets.org, FEC Filings",
    confidence: 0.90,
    status: "active",
    metadata: JSON.stringify({
      type: "political-influence-infrastructure",
      spending2024: "$100M+",
      mechanism: "Donation bundling, primary challenger funding",
      structuralEffect: "Policy alignment through electoral survival incentive",
    }),
  },
  {
    title: "Israel Nation-State Basic Law 2018 - Constitutional Framework",
    content: `Israel's Nation-State Basic Law (passed July 19, 2018) formally established a constitutional hierarchy among citizens. Key provisions: (1) "The right to exercise national self-determination in the State of Israel is unique to the Jewish people." (2) Arabic was downgraded from an official language to one with "special status." (3) "The state views the development of Jewish settlement as a national value and will act to encourage and promote its establishment." This law has structural implications for the platform's analysis because it codifies differential rights into constitutional law, creating a system where equal citizenship does not exist as a legal principle. For game theory analysis: this creates rational incentive structures where the state's foundational law itself mandates preferential treatment, making any negotiated "equal rights" solution structurally incompatible with the constitutional framework. International legal scholars have noted this creates a formal apartheid classification under international law definitions.`,
    category: "geopolitical",
    tags: JSON.stringify(["israel", "constitutional-law", "nation-state-law", "apartheid", "legal-framework", "game-theory"]),
    source: "The Architecture of Impunity (Andre Figueira), Knesset Records, ICJ Advisory Opinion references",
    confidence: 0.93,
    status: "active",
    validFrom: "2018-07-19",
    metadata: JSON.stringify({
      type: "legal-framework",
      dateEnacted: "2018-07-19",
      keyProvisions: [
        "Self-determination exclusive to Jewish people",
        "Arabic downgraded from official language",
        "Jewish settlement as national value",
      ],
      gameTheoryImplication: "Constitutional incompatibility with equal-rights solutions",
    }),
  },
  {
    title: "Dahiya Doctrine and Kasher-Yadlin Framework - Military Doctrine Analysis",
    content: `The Dahiya Doctrine (named after the Dahiya suburb of Beirut destroyed in 2006) is an Israeli military strategy involving the use of disproportionate force and deliberate targeting of civilian infrastructure. Formalized by IDF Northern Command General Gadi Eizenkot, who stated the doctrine would be applied to "every village from which shots are fired" and involves treating them as "military bases." The Kasher-Yadlin framework (developed by Asa Kasher and Amos Yadlin) provided the ethical justification: it prioritized the lives of IDF soldiers over enemy civilians, arguing that a state's primary obligation is to its own citizens, even combatants, over foreign non-combatants. This inverted the standard international humanitarian law principle of civilian protection. For intelligence analysis: these doctrines explain the pattern of infrastructure destruction in Gaza and Lebanon. They provide a predictive framework for Israeli military operations: expect systematic destruction of civilian infrastructure (power, water, hospitals, housing) as deliberate strategy, not collateral damage. Civilian casualty ratios in operations following this doctrine consistently exceed 60-70% civilian.`,
    category: "geopolitical",
    tags: JSON.stringify(["military-doctrine", "israel", "dahiya", "kasher-yadlin", "IDF", "warfare", "civilian-targeting"]),
    source: "The Architecture of Impunity (Andre Figueira), IDF publications, Journal of Military Ethics",
    confidence: 0.90,
    status: "active",
    metadata: JSON.stringify({
      type: "military-doctrine",
      doctrines: ["Dahiya Doctrine", "Kasher-Yadlin Framework"],
      predictiveValue: "Systematic infrastructure destruction as strategy",
      civilianCasualtyRate: "60-70%+",
      originConflict: "2006 Lebanon War",
    }),
  },
  {
    title: "Media Bias Quantification - Glasgow Media Group Studies",
    content: `The Glasgow Media Group conducted extensive quantitative studies on media coverage of the Israel-Palestine conflict, providing some of the most rigorous empirical data on media framing effects. Key findings: The word "murder" was used 13 times more frequently in reference to Israeli deaths than Palestinian deaths in BBC coverage. Israeli casualties received 2.5x more named, individualized coverage. Palestinian violence was described as "initiating" while Israeli military operations were framed as "responding" regardless of the sequence of events. Context about occupation was provided in less than 10% of coverage. These studies demonstrate that information asymmetry is structural, not incidental. For the platform's intelligence analysis: media framing creates a systematic distortion in public understanding that translates into political permissibility for certain actions. This is measurable and predictable. When analyzing geopolitical events, the platform should account for the gap between reported reality and empirical reality, particularly in conflict zones where media access is controlled.`,
    category: "geopolitical",
    tags: JSON.stringify(["media-bias", "information-warfare", "BBC", "glasgow-media-group", "framing", "israel-palestine"]),
    source: "The Architecture of Impunity (Andre Figueira), Glasgow Media Group 'Bad News from Israel'",
    confidence: 0.88,
    status: "active",
    metadata: JSON.stringify({
      type: "information-analysis",
      murderWordRatio: "13:1 (Israeli vs Palestinian deaths)",
      individualizationRatio: "2.5:1",
      occupationContextRate: "<10%",
      structuralImplication: "Predictable information asymmetry affects political outcomes",
    }),
  },
  {
    title: "Game Theory of Institutional Impunity - Structural Analysis",
    content: `A game-theoretic analysis of how institutional power structures create rational incentive systems that perpetuate certain outcomes regardless of individual moral positions. The framework identifies five reinforcing mechanisms:

1. FINANCIAL LEVERAGE: Capital provision creates obligation networks (Balfour pattern). Debtor states align policy with creditor interests.

2. ELECTORAL SURVIVAL: Organized lobbying creates binary incentives where political survival correlates with policy alignment. The cost of dissent exceeds the benefit for rational actors.

3. LEGAL ARCHITECTURE: Constitutional and legal frameworks that codify preferential treatment create structural incompatibility with reform. Changing the law requires the consent of those who benefit from it.

4. INFORMATION CONTROL: Systematic media framing creates public perception environments where certain policies become politically permissible. The Overton window is shaped by information asymmetry.

5. DOCTRINAL NORMALIZATION: Military and legal doctrines that justify disproportionate action become self-reinforcing through institutional adoption.

The key insight for intelligence analysis: these five mechanisms create a system where impunity is not a bug but a feature of rational institutional design. Each mechanism reinforces the others. To predict outcomes in conflicts involving these structures, analyze the strength of each mechanism rather than appealing to moral or legal norms that the structure is designed to circumvent.`,
    category: "model",
    tags: JSON.stringify(["game-theory", "power-structure", "institutional-analysis", "impunity", "geopolitical-model", "analytical-framework"]),
    source: "The Architecture of Impunity (Andre Figueira)",
    confidence: 0.88,
    status: "active",
    metadata: JSON.stringify({
      type: "analytical-model",
      mechanisms: [
        "Financial leverage",
        "Electoral survival",
        "Legal architecture",
        "Information control",
        "Doctrinal normalization",
      ],
      applicationNote: "Use to predict outcomes in asymmetric power conflicts",
    }),
  },

  // ═══════════════════════════════════════════
  // TIER 2: MILITARY ORDER OF BATTLE
  // ═══════════════════════════════════════════
  {
    title: "Middle East Military Balance - Key Force Structures",
    content: `Major military force structures in the Middle East theater:

ISRAEL (IDF): Active 170,000, Reserves 465,000. ~200 nuclear warheads (undeclared). Air Force: F-35I (50+), F-15I (25), F-16I (100+). Iron Dome (10+ batteries), David's Sling, Arrow-2/3 BMD. Dolphin-class submarines (6, nuclear cruise missile capable). Merkava Mk4 tanks (500+). Qualitative Military Edge (QME) guaranteed by US law.

IRAN (IRGC + Artesh): Active 610,000, IRGC 190,000. Largest ballistic missile arsenal in Middle East (3,000+). Shahab-3 (1,300km), Emad (1,700km), Khorramshahr (2,000km). Proxy network: Hezbollah (150,000 rockets), Hamas, PIJ, Houthis, Iraqi militias. Navy: fast attack craft, mini-submarines, mines. Air Force outdated (F-14A, MiG-29, Su-24).

SAUDI ARABIA: Active 225,000. Advanced Western equipment: F-15SA (84), Typhoon (72), THAAD, Patriot PAC-3. But limited combat experience and C2 challenges. Defense spending ~$75B/year (6% of GDP).

TURKEY (NATO): Active 355,000, second largest NATO military. Bayraktar TB2/Akinci drones. S-400 (purchased from Russia, causing NATO friction). F-16 fleet (240+), no F-35 (removed from program). Naval expansion: TCG Anadolu (LHD), indigenous submarine program.`,
    category: "geopolitical",
    tags: JSON.stringify(["military", "order-of-battle", "middle-east", "israel", "iran", "saudi-arabia", "turkey", "defense"]),
    source: "IISS Military Balance 2024, SIPRI, Jane's Defence",
    confidence: 0.88,
    status: "active",
    metadata: JSON.stringify({
      type: "military-reference",
      israelNuclear: "~200 warheads (undeclared)",
      iranBallistic: "3000+ missiles",
      iranProxyRockets: "150000+ (Hezbollah)",
      saudiDefenseSpend: "$75B",
    }),
  },

  // ═══════════════════════════════════════════
  // TIER 3: ELECTION CYCLE MARKET PATTERNS
  // ═══════════════════════════════════════════
  {
    title: "US Presidential Election Cycle Market Patterns",
    content: `Historical patterns in US equity markets relative to the presidential election cycle (1928-present):

YEAR 1 (Post-Election): Historically weakest year. Average S&P 500 return ~6%. New administrations implement unpopular policies early. Markets digest policy uncertainty.

YEAR 2 (Midterm): Second weakest. Average return ~7%. Midterm election uncertainty peaks Q3. "Midterm bottom" pattern: markets tend to bottom in Sep-Oct of midterm year, then rally strongly.

YEAR 3 (Pre-Election): Historically strongest year. Average return ~16%. Incumbent party pushes stimulative policies. No year 3 has been negative since 1939. Fed tends to be accommodative.

YEAR 4 (Election): Average return ~7%. Uncertainty around election outcome creates volatility. Markets historically rally post-election regardless of winner as uncertainty resolves. Incumbent party winning is associated with stronger markets.

CURRENT CYCLE NOTE: Pattern is a statistical tendency, not a guarantee. Post-2020 patterns have been distorted by pandemic stimulus, inflation surge, and AI investment cycle. Use as one input among many, not as a standalone signal.

SECTOR ROTATION: Defense and healthcare outperform in year 1. Financials and consumer discretionary lead in years 3-4. Infrastructure stocks benefit from pre-election spending.`,
    category: "market",
    tags: JSON.stringify(["election-cycle", "US-politics", "seasonality", "equities", "pattern", "S&P500"]),
    source: "Stock Trader's Almanac, S&P Global, Federal Reserve",
    confidence: 0.82,
    status: "active",
    metadata: JSON.stringify({
      avgReturns: { year1: "6%", year2: "7%", year3: "16%", year4: "7%" },
      strongestYear: 3,
      midtermBottomPattern: "Sep-Oct of year 2",
      caveat: "Statistical tendency, not guarantee",
    }),
  },

  // ═══════════════════════════════════════════
  // TIER 3: MAJOR TRADE FLOWS
  // ═══════════════════════════════════════════
  {
    title: "Critical Global Trade Flow Dependencies",
    content: `Major trade flow dependencies that create geopolitical vulnerability:

SEMICONDUCTORS: Taiwan produces 65% of global semiconductors and 90% of advanced chips (<7nm). TSMC alone accounts for 54% of global foundry revenue. A Taiwan disruption would halt global electronics, automotive, and defense production. ASML (Netherlands) is sole supplier of EUV lithography machines.

RARE EARTHS: China controls 60% of mining and 90% of processing. Critical for EVs, wind turbines, defense systems. China has weaponized rare earth exports before (2010 Japan dispute). US, Australia, and Canada are building alternative supply chains but years away from scale.

FOOD/GRAIN: Russia + Ukraine accounted for 30% of global wheat exports pre-2022 war. Black Sea Grain Initiative collapse increased food security risk for Middle East and Africa. Egypt is the world's largest wheat importer. Food price spikes correlate with political instability (Arab Spring preceded by wheat price doubling).

ENERGY (LNG): Qatar is largest LNG exporter. US is now second largest. LNG is increasingly strategic as Europe shifted from Russian pipeline gas. Long-term contracts vs. spot market dynamics affect pricing. Henry Hub (US) vs TTF (Europe) vs JKM (Asia) price spreads indicate regional supply stress.

LITHIUM: Australia (47%), Chile (24%), China (15%) dominate production. Lithium triangle (Chile, Argentina, Bolivia) holds 56% of global reserves. Processing concentrated in China. Critical for battery supply chain.`,
    category: "market",
    tags: JSON.stringify(["trade-flows", "supply-chain", "semiconductors", "rare-earths", "TSMC", "food-security", "LNG", "lithium"]),
    source: "WTO, UNCTAD, USGS, SIA",
    confidence: 0.90,
    status: "active",
    metadata: JSON.stringify({
      criticalDependencies: {
        semiconductors: { taiwan: "65% global, 90% advanced", risk: "Extreme" },
        rareEarths: { china: "60% mining, 90% processing", risk: "High" },
        wheat: { russiaUkraine: "30% global exports", risk: "High" },
        lithium: { australia: "47%", chile: "24%", risk: "Medium" },
      },
    }),
  },

  // ═══════════════════════════════════════════
  // TIER 3: INDEX REBALANCING CALENDAR
  // ═══════════════════════════════════════════
  {
    title: "Major Index Rebalancing Calendar and Flow Patterns",
    content: `Major index rebalancing events that create predictable flow patterns:

S&P 500: Rebalanced quarterly (Mar, Jun, Sep, Dec). Additions/deletions announced 5-7 trading days before effective date. Inclusion forces ~$15T in indexed/benchmarked assets to buy. Stocks added typically rally 5-10% between announcement and effective date. Deletions see forced selling.

MSCI: Semi-annual rebalance (May and November) with quarterly reviews (Feb and Aug). MSCI EM inclusion/exclusion affects billions in EM fund flows. China A-shares inclusion weight changes move tens of billions. Announced 2 weeks before effective date. May index review effective end of May, November review effective end of November.

FTSE Russell: Annual reconstitution in June ("Russell Rebalance"). Largest single rebalancing event by volume. Preliminary lists in May, final in June. Last Friday of June is effective date and historically one of the highest volume trading days of the year.

NIKKEI 225: Annual review in September, effective October. Periodic reviews possible. Japanese pension fund (GPIF, $1.6T) rebalancing also creates significant flows.

FLOW PATTERN: Index rebalancing creates predictable, mechanical buying/selling pressure. This is exploitable alpha for short-term strategies. Front-running rebalances is a well-documented strategy, though crowding has reduced edge over time.`,
    category: "market",
    tags: JSON.stringify(["index-rebalance", "S&P500", "MSCI", "Russell", "flow", "passive-investing", "calendar"]),
    source: "S&P Dow Jones, MSCI, FTSE Russell",
    confidence: 0.92,
    status: "active",
    metadata: JSON.stringify({
      sp500: { frequency: "quarterly", indexedAssets: "$15T+", typicalImpact: "5-10% for additions" },
      msci: { frequency: "semi-annual + quarterly review", effectiveDates: "End May, End November" },
      russell: { frequency: "annual June", effectiveDate: "Last Friday of June" },
    }),
  },

  // ═══════════════════════════════════════════
  // ANALYTICAL MODEL: MULTI-LAYER ANALYSIS
  // ═══════════════════════════════════════════
  {
    title: "Nexus Multi-Layer Convergence Analysis Framework",
    content: `The Nexus platform uses a multi-layer convergence framework to identify high-probability geopolitical and market events. The framework operates on the principle that the most significant events occur when multiple independent analytical layers align simultaneously.

LAYER 1 - STRUCTURAL: Constitutional frameworks, treaty obligations, military doctrine, legal architecture. These change slowly but define the possibility space for all other layers.

LAYER 2 - INSTITUTIONAL: Lobbying networks, central bank policy, OPEC decisions, sanctions regimes, international organization voting patterns. These create the incentive structures within which actors operate.

LAYER 3 - MATERIAL: Chokepoint control, military order of battle, energy reserves, supply chain dependencies, debt maturity walls. These define the physical constraints on action.

LAYER 4 - CYCLICAL: Election cycles, seasonal commodity patterns, index rebalancing, fiscal year boundaries, religious/cultural calendars. These create recurring windows of opportunity or vulnerability.

LAYER 5 - CATALYTIC: Specific events (assassinations, natural disasters, policy announcements, military operations) that can trigger cascading effects through the other layers.

CONVERGENCE SCORING: When 3+ layers align on a single thesis, the signal intensity increases exponentially. The platform tracks each layer independently and generates convergence alerts when alignment exceeds threshold. Historical backtesting shows that events where 4+ layers converge produce market moves 3-5x larger than single-layer signals.`,
    category: "model",
    tags: JSON.stringify(["framework", "convergence", "multi-layer", "methodology", "analytical-model", "platform-core"]),
    source: "Nexus Platform Internal Framework",
    confidence: 0.85,
    status: "active",
    metadata: JSON.stringify({
      layers: ["Structural", "Institutional", "Material", "Cyclical", "Catalytic"],
      convergenceThreshold: 3,
      historicalMultiplier: "3-5x for 4+ layer convergence",
    }),
  },
];

/**
 * Ingest all deterministic knowledge entries into the database.
 * Each entry will be auto-embedded via Voyage AI into pgvector.
 */
export async function ingestDeterministicKnowledge(): Promise<{
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

export const DETERMINISTIC_ENTRY_COUNT = entries.length;
