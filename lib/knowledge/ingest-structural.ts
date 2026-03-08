import { addKnowledge } from "./engine";
import type { NewKnowledgeEntry } from "@/lib/db/schema";

type KnowledgeInput = Omit<NewKnowledgeEntry, "id" | "createdAt">;

const entries: KnowledgeInput[] = [
  // =======================================
  // TREATIES & ALLIANCE FRAMEWORKS
  // =======================================
  {
    title: "NATO Article 5 - Collective Defense Mechanics",
    content: `NATO's Article 5 of the North Atlantic Treaty commits all 32 member states to collective defense: an armed attack against one Ally is treated as an attack against all.

HOW IT'S TRIGGERED:
1. An Ally sustains an "armed attack"
2. The attacked Ally requests collective action
3. All 32 members must reach unanimous consensus that the threshold has been met
4. Any single member can veto invocation

RESPONSE FLEXIBILITY:
Each Ally determines its own contribution. Assistance is not necessarily military and depends on resources and constitutional requirements. Some countries require parliamentary approval before deploying forces abroad (Article 11 of the Treaty acknowledges this).

HISTORICAL RECORD:
Invoked only once: after the 9/11 attacks on the United States in 2001. The response included AWACS surveillance flights over the US, Operation Active Endeavour (Mediterranean naval patrols), and ultimately the ISAF mission in Afghanistan.

AMBIGUITY AS STRATEGY:
NATO deliberately maintains ambiguity about what constitutes an "armed attack" and what response would follow. This "glorious ambiguity" extends deterrence to grey zone threats (cyber attacks, hybrid warfare, energy coercion) without committing to specific military responses.

KEY TENSIONS:
- Cyber attacks: NATO declared cyberspace an operational domain in 2016, but threshold for Article 5 invocation remains undefined
- Trump-era doubts about US commitment weakened deterrence signaling
- Article 5 vs EU Article 42(7): EU has its own mutual defense clause, creating parallel obligations
- Geographic scope: Article 6 limits coverage to attacks on territory in Europe/North America, complicating Indo-Pacific scenarios`,
    category: "geopolitical",
    tags: JSON.stringify(["nato", "article-5", "collective-defense", "alliance", "treaty", "deterrence"]),
    source: "NATO Official, Belfer Center Harvard, Brennan Center for Justice",
    confidence: 0.95,
    status: "active",
    metadata: JSON.stringify({
      type: "treaty-framework",
      members: 32,
      invocations: 1,
      established: 1949,
    }),
  },
  {
    title: "US Mutual Defense Treaties - Bilateral Alliance Network",
    content: `The United States maintains bilateral mutual defense treaties with key allies, forming the backbone of the rules-based international order and US force projection capability.

INDO-PACIFIC BILATERAL TREATIES:
- Japan (1960 Treaty of Mutual Cooperation and Security): ~55,000 US personnel stationed in Japan. Extended to cover Senkaku Islands. Japan's 2022 National Security Strategy doubled defense spending target to 2% GDP.
- South Korea (1953 Mutual Defense Treaty): ~28,500 US personnel. Born from Korean War. US maintains operational control of combined forces during wartime.
- Philippines (1951 Mutual Defense Treaty): Extends to armed attacks on either country's forces, aircraft, and public vessels anywhere in the Pacific, including the South China Sea. Enhanced Defense Cooperation Agreement (EDCA) added 9 Philippine bases for US access (2023).
- Australia (1951 ANZUS Treaty): Foundation for AUKUS nuclear submarine deal (2021). Pine Gap joint intelligence facility. Five Eyes integration.
- Thailand (1954 Manila Pact): Oldest US ally in Asia. Treaty ally but relationship has cooled since 2014 coup.

OTHER KEY ALLIANCES:
- NATO (32 members): Collective defense under Article 5
- Rio Treaty (Inter-American Treaty of Reciprocal Assistance): Western Hemisphere mutual defense

NEWER FRAMEWORKS (not formal treaties):
- AUKUS (2021): US-UK-Australia. Nuclear submarine technology transfer, advanced capabilities pillar
- Quad (2017 revival): US-Japan-Australia-India. Strategic dialogue, not a defense pact
- US-Japan-South Korea trilateral: Camp David agreement (August 2023) committed to regular summits and intelligence sharing
- US-Japan-Philippines-Australia quad defense meetings (2024-2025)

FORCE POSTURE:
The US maintains approximately 750-800 overseas military installations across 80+ countries. Largest concentrations: Japan (120 bases), Germany (119), South Korea (73). Total overseas personnel: ~170,000.`,
    category: "geopolitical",
    tags: JSON.stringify(["us-alliances", "mutual-defense", "japan", "south-korea", "philippines", "australia", "aukus", "quad", "nato", "force-posture"]),
    source: "Yale Avalon Project, CFR, Defense One, Congressional Research Service",
    confidence: 0.93,
    status: "active",
    metadata: JSON.stringify({
      type: "alliance-network",
      bilateralTreaties: ["Japan", "South Korea", "Philippines", "Australia", "Thailand"],
      overseasBases: "750-800",
      overseasPersonnel: "~170,000",
    }),
  },
  {
    title: "UN Security Council - Veto Power Dynamics & Patterns",
    content: `The UN Security Council's five permanent members (P5) each hold veto power over substantive resolutions. Understanding veto patterns reveals the actual power dynamics of international governance.

VETO STATISTICS (as of mid-2025):
- Russia/Soviet Union: ~159 vetoes (most frequent user)
- United States: ~93 vetoes (majority to shield Israel)
- United Kingdom: 29 vetoes (none since 1989)
- France: 16 vetoes (none since 1989)
- China: ~21 vetoes (increasing frequency in recent years)

PATTERNS:
- US vetoes overwhelmingly protect Israel from Security Council action. The US last vetoed a June 2025 resolution calling for ceasefire and humanitarian aid access to Gaza.
- Russia vetoes primarily block action on Syria, Ukraine, and investigations into its own conduct
- China has increased veto usage, joining Russia on ~75% of the resolutions China blocks
- France and UK have not vetoed since 1989 and both advocate for P5 restraint

STRUCTURAL IMPLICATIONS:
- P5 veto makes the UNSC structurally incapable of addressing conflicts involving permanent members or their close allies
- This drives action to alternative forums: "coalitions of the willing," regional organizations, General Assembly (non-binding)
- General Assembly's "Uniting for Peace" resolution (1950) allows GA to consider matters when UNSC is deadlocked, but GA resolutions are non-binding
- Reform proposals (expanding P5, limiting veto to non-atrocity situations) have zero chance of adoption because they require P5 consent

WHY THIS MATTERS FOR ANALYSIS:
The UNSC veto structure means that for any conflict involving Russia, China, or a US ally, the UN cannot authorize collective action. This makes bilateral alliances, regional pacts, and unilateral action the actual mechanisms of international security, not the UN system.`,
    category: "geopolitical",
    tags: JSON.stringify(["un", "security-council", "veto", "p5", "international-law", "governance"]),
    source: "UN Dag Hammarskjold Library, CFR, UN Security Council records",
    confidence: 0.95,
    status: "active",
    metadata: JSON.stringify({
      type: "institutional-framework",
      p5: ["US", "Russia", "China", "UK", "France"],
      totalVetoes: { russia: 159, us: 93, uk: 29, china: 21, france: 16 },
    }),
  },

  // =======================================
  // NUCLEAR WEAPONS & DOCTRINE
  // =======================================
  {
    title: "Global Nuclear Arsenal - Stockpiles, Triads & Doctrines by Country",
    content: `Nine countries possess approximately 12,241 nuclear warheads as of early 2026 (SIPRI/FAS). Of these, ~3,912 are deployed with operational forces and ~2,100 are on high alert, ready for use on short notice.

STOCKPILES BY COUNTRY:
- Russia: ~5,460 warheads. Full triad (ICBMs, SLBMs, strategic bombers). Largest arsenal globally.
- United States: ~5,180 warheads. Full triad. ~1,700 deployed strategic warheads.
- China: ~600 warheads (up from 350 in 2020). Projected to reach 1,000 by 2030. Rapidly expanding ICBM silo fields in western China.
- France: ~290 warheads. Sea-based (SSBNs) and air-launched cruise missiles. No land-based ICBMs.
- United Kingdom: ~225 warheads. Sea-based only (Trident SLBMs on Vanguard-class submarines). Announced increase in ceiling from 180 to 260.
- India: ~172 warheads. Land-based missiles, sea-based (Arihant SSBN), aircraft. Building toward triad completion.
- Pakistan: ~170 warheads. Land-based missiles, aircraft, developing sea-based capability. Fastest-growing arsenal.
- Israel: ~90 warheads (undeclared, policy of ambiguity). Believed to have land, sea, and air delivery capability.
- North Korea: ~50 warheads (estimated). ICBMs (Hwasong-17/18), MRBMs, SLBMs under development.

FIRST USE DOCTRINES:
- No-First-Use (NFU): Only China (unconditional) and India (with chemical/biological exception) maintain NFU pledges.
- First-use reserved: US, Russia, UK, France, Pakistan, North Korea all reserve the right to use nuclear weapons first.
- Pakistan's doctrine is most permissive: nuclear use authorized if conventional military defeat is imminent, territorial integrity threatened, or economic strangulation occurs.
- Russia's 2020 doctrine: Nuclear use authorized in response to nuclear attack, or conventional attack threatening "the very existence of the state."

NEW START EXPIRATION:
The New START treaty (last US-Russia arms control agreement) expired February 2026. No successor agreement is in negotiation. This removes the last constraint on deployed strategic warheads, meaning both US and Russia can expand deployed arsenals without limit for the first time since 1972.

CHINA'S BUILDUP:
China's rapid nuclear expansion (doubling in 5 years) is the most significant shift in the nuclear balance since the Cold War. The construction of ~300 new ICBM silos in Gansu and Xinjiang provinces suggests China is moving toward a launch-on-warning posture, abandoning its historical minimum deterrence approach.`,
    category: "geopolitical",
    tags: JSON.stringify(["nuclear", "warheads", "triad", "icbm", "doctrine", "first-use", "nfu", "new-start", "arms-control"]),
    source: "SIPRI Yearbook 2025, FAS Status of World Nuclear Forces, Arms Control Association, ICANW",
    confidence: 0.92,
    status: "active",
    metadata: JSON.stringify({
      type: "capability-assessment",
      totalWarheads: 12241,
      deployed: 3912,
      highAlert: 2100,
      newStartExpired: "February 2026",
      nfuCountries: ["China", "India"],
    }),
  },

  // =======================================
  // GLOBAL FINANCIAL ARCHITECTURE
  // =======================================
  {
    title: "SWIFT System - Financial Messaging & Weaponization",
    content: `SWIFT (Society for Worldwide Interbank Financial Telecommunication) is the dominant global financial messaging system, connecting ~11,000 institutions in 200+ countries. It does not settle payments but transmits authenticated instructions between banks using standardized BIC codes.

HOW SWIFT WORKS:
- Headquartered in Belgium, subject to Belgian/EU law
- Processes ~45 million messages per day
- Each bank has a unique SWIFT/BIC code for routing
- Messages are standardized (MT or ISO 20022 formats)
- SWIFT itself holds no funds, it's the communications layer

WEAPONIZATION - RUSSIA CASE STUDY:
- February 2022: EU/US disconnected 7 major Russian banks from SWIFT after Ukraine invasion
- 2025 escalation: EU proposed disconnecting 15 additional Russian banks (16th sanctions package). By July 2025, 20+ more Russian banks cut off with full transaction bans.
- Impact: Forced Russia to rely on alternative channels, increased transaction costs, slowed trade settlement

RUSSIAN ALTERNATIVES:
- SPFS (System for Transfer of Financial Messages): Russia's domestic SWIFT equivalent. Handles ruble and some foreign currency transfers. Limited to banks connected to the system.
- Bilateral agreements: Russia-China trade now conducted primarily in yuan and rubles, bypassing SWIFT entirely.

CHINESE ALTERNATIVE:
- CIPS (Cross-Border Interbank Payment System): Processed $24.47 trillion in 2024, up 43% year-over-year. Volume has tripled since 2020. Both messaging and settlement capability (unlike SWIFT which only messages).

ANALYTICAL SIGNIFICANCE:
SWIFT disconnection is the financial equivalent of a blockade. It's the most powerful non-military sanction available. But each use accelerates the development of alternatives, gradually fragmenting the global financial messaging system into competing blocs. The more SWIFT is weaponized, the faster de-dollarization infrastructure matures.`,
    category: "market",
    tags: JSON.stringify(["swift", "sanctions", "financial-infrastructure", "russia", "cips", "spfs", "de-dollarization"]),
    source: "SWIFT, Econofact, Meduza, AML Intelligence, LegalClarity",
    confidence: 0.93,
    status: "active",
    metadata: JSON.stringify({
      type: "financial-infrastructure",
      institutions: 11000,
      dailyMessages: "45M",
      russianBanksDisconnected: "40+",
      cipsVolume2024: "$24.47T",
    }),
  },
  {
    title: "De-Dollarization & Petrodollar System - BRICS Alternative Architecture",
    content: `The post-Bretton Woods petrodollar system, where oil is priced in US dollars and Gulf states recycle revenues into US Treasury debt, is under unprecedented strain from coordinated de-dollarization efforts.

PETRODOLLAR MECHANICS:
- 1974 US-Saudi agreement: Oil priced in USD in exchange for US security guarantees
- Creates structural global demand for dollars (any country buying oil needs USD)
- Petrodollar recycling: Gulf states invest oil revenues in US Treasuries, funding US deficits
- System gives the US the "exorbitant privilege" of borrowing in its own currency at lower rates

DE-DOLLARIZATION PROGRESS:
- Yuan-denominated oil deals: ~20% of daily Brent crude volumes in 2024, testing 24% by early 2025
- Countries using petroyuan: Russia, Iran, Venezuela, Saudi Arabia, China, UAE, Egypt
- China-Russia bilateral trade: Majority now settled in yuan and rubles
- Brazil-China: Yuan-real trade settlement agreement signed 2023
- India purchasing Russian oil in rupees
- BRICS removed USD from iron ore trade

IMF VOTING POWER (structural dollar privilege):
- US holds 17.4% quota share, translating to 16.5% voting power
- This gives the US veto over major IMF decisions (require 85% majority)
- China's actual quota share (6.4%) is roughly half its calculated economic weight (13.7%)
- Africa: 18% of world population, 6.5% of IMF voting power
- 50% quota increase approved December 2023, effective November 2024, but relative shares unchanged

SDR BASKET (Special Drawing Rights):
- USD: 43.38%, EUR: 29.31%, CNY: 12.28%, JPY: 7.59%, GBP: 7.44%
- Yuan inclusion (2016) was symbolic but represents limited actual usage

LIMITS OF DE-DOLLARIZATION:
- USD still ~58% of global reserves (down from 72% in 2000)
- USD involved in ~88% of forex transactions
- No alternative has the depth, liquidity, and legal infrastructure of dollar markets
- CIPS growing but still ~2% of SWIFT volume
- Full de-dollarization is a multi-decade process, not an event`,
    category: "market",
    tags: JSON.stringify(["petrodollar", "de-dollarization", "brics", "yuan", "imf", "sdr", "reserves", "cips"]),
    source: "Chicago Policy Review, OMFIF, Modern Diplomacy, IMF quota data, BIS",
    confidence: 0.88,
    status: "active",
    metadata: JSON.stringify({
      type: "financial-architecture",
      usdReserveShare: "58%",
      usdForexShare: "88%",
      yuanOilShare: "20-24%",
      imfUsVotingPower: "16.5%",
    }),
  },

  // =======================================
  // INTELLIGENCE ARCHITECTURE
  // =======================================
  {
    title: "Five Eyes / 9 Eyes / 14 Eyes - Intelligence Alliance Structure",
    content: `The Five Eyes (FVEY) intelligence alliance is the most integrated signals intelligence sharing arrangement in the world, with tiered expansion through 9 Eyes and 14 Eyes partnerships.

FIVE EYES (UKUSA Agreement, 1946):
Members: United States, United Kingdom, Canada, Australia, New Zealand
- Full intelligence sharing: Each member shares signals intelligence (SIGINT) comprehensively with all others
- Division of labor by geography: Each member monitors specific regions
  - US (NSA): Global, with focus on Middle East, Russia, China
  - UK (GCHQ): Europe, Western Russia, Africa
  - Canada (CSE): Northern Russia, China, Latin America
  - Australia (ASD): South/Southeast Asia, South Pacific
  - New Zealand (GCSB): South Pacific, Southeast Asia
- Shared infrastructure: Joint facilities (Pine Gap/Australia, Menwith Hill/UK, Waihopai/NZ)
- Edward Snowden disclosures (2013) revealed extent of mass surveillance: PRISM, XKeyscore, Tempora, MUSCULAR

NINE EYES (SIGINT Seniors Europe):
Adds: Denmark, France, Netherlands, Norway
- Share intelligence with Five Eyes but with less access to classified raw data
- Participate in specific collection programs
- Denmark controversy (2021): Danish intelligence helped NSA spy on European leaders including Merkel

FOURTEEN EYES (SSEUR):
Adds: Belgium, Germany, Italy, Spain, Sweden
- Loosest cooperation tier
- More limited intelligence access
- Intelligence sharing agreements formalized 2010
- Focus on counter-terrorism and counter-proliferation

BEYOND THE TIERS:
- Israel has significant bilateral intelligence sharing with the US (though not a formal Eyes member)
- Japan, South Korea increasingly integrated into Five Eyes adjacent cooperation
- Singapore, India, and France have bilateral arrangements with individual Five Eyes members

WHY THIS MATTERS:
The Five Eyes network means there is no communications system on Earth that is not potentially monitored by at least one member. The alliance's geographic coverage is essentially global, and the Snowden disclosures showed that even allied leaders' communications were intercepted. For any geopolitical analysis, the assumption should be that Five Eyes has signals intelligence on virtually every significant actor.`,
    category: "geopolitical",
    tags: JSON.stringify(["five-eyes", "intelligence", "sigint", "nsa", "gchq", "surveillance", "ukusa"]),
    source: "Wikipedia Five Eyes, Privacy International, Britannica, Snowden archive",
    confidence: 0.92,
    status: "active",
    metadata: JSON.stringify({
      type: "intelligence-architecture",
      fiveEyes: ["US", "UK", "Canada", "Australia", "New Zealand"],
      nineEyes: ["+ Denmark", "France", "Netherlands", "Norway"],
      fourteenEyes: ["+ Belgium", "Germany", "Italy", "Spain", "Sweden"],
      agencies: { us: "NSA", uk: "GCHQ", canada: "CSE", australia: "ASD", nz: "GCSB" },
    }),
  },

  // =======================================
  // MILITARY BASING NETWORKS
  // =======================================
  {
    title: "Global Military Basing - US, China & Russia Force Projection Networks",
    content: `Military basing networks determine power projection capability and define spheres of influence. Three major networks operate globally with distinct strategies.

UNITED STATES (~750-800 overseas installations):
- Largest overseas military footprint in history
- Key concentrations: Japan (120 bases, 55,000 personnel), Germany (119 bases), South Korea (73 bases, 28,500 personnel)
- Middle East: 40,000-50,000 troops across Kuwait, Bahrain (Fifth Fleet HQ), Qatar (Al Udeid), UAE, Iraq, Jordan, Saudi Arabia
- ~60% are major installations (>200 personnel, >$10M value), 40% are "lily pad" forward operating sites
- Diego Garcia (Indian Ocean): Strategic bomber and naval staging base
- Guam: Key Pacific hub, undergoing massive expansion for China contingency
- Strategy: Hub-and-spoke model providing rapid global force projection

CHINA (expanding from minimal base):
- Djibouti (2017): First official overseas base, $590M construction, at Red Sea/Gulf of Aden junction
- Ream Naval Base, Cambodia (2025): Second acknowledged overseas facility. "Joint logistics and training center." Provides South China Sea access and proximity to Malacca Strait.
- String of Pearls strategy: Network of port facilities and potential dual-use bases along Indian Ocean maritime routes
  - Gwadar, Pakistan (CPEC): Deep water port with potential military use
  - Hambantota, Sri Lanka: 99-year lease on port (debt-trap criticism)
  - Reported interest in Myanmar, Solomon Islands, Equatorial Guinea
- Strategy: Gradual commercial-to-military conversion of port facilities

RUSSIA (contracting and repositioning):
- Syria: Tartus naval base (Mediterranean), Hmeimim air base. Maintained post-Assad fall (2025) through agreement with new Syrian government, but significantly reduced.
- Libya (post-2025 pivot): Expanding following Syria setbacks. Now operates 4 air bases: Al-Khadim, Al-Jufra, Brak al-Shati, Al-Qardabiya. Maaten al-Sarra base (near Chad/Sudan border) provided by Haftar (January 2026).
- Sudan: Agreement with SAF to host Russian naval base at Port Sudan (February 2026).
- Armenia: 102nd military base in Gyumri (status uncertain after Armenia's Western pivot)
- Tajikistan: 201st military base (largest outside Russia)
- Africa Corps (formerly Wagner): Presence in Mali, Burkina Faso, Central African Republic, Libya. ~5,000-8,000 personnel.
- Strategy: Opportunistic access through mercenary deployments and support for embattled regimes, filling voids left by French withdrawal from Sahel`,
    category: "geopolitical",
    tags: JSON.stringify(["military-bases", "force-projection", "us-bases", "china-bases", "russia-bases", "string-of-pearls", "djibouti"]),
    source: "World Population Review, Al Jazeera, Foreign Policy, Atlantic Council, Military Africa",
    confidence: 0.90,
    status: "active",
    metadata: JSON.stringify({
      type: "force-projection",
      usBases: "750-800",
      usTopLocations: { japan: 120, germany: 119, southKorea: 73 },
      chinaBases: ["Djibouti", "Ream/Cambodia"],
      russiaBases: ["Syria/Tartus", "Syria/Hmeimim", "Libya (4 bases)", "Sudan/Port Sudan (planned)"],
    }),
  },

  // =======================================
  // ENERGY INFRASTRUCTURE
  // =======================================
  {
    title: "Global Pipeline Networks & Strategic Petroleum Reserves",
    content: `Energy infrastructure determines which countries can be sanctioned, which can be blockaded, and which hold leverage over others.

MAJOR GAS PIPELINES:
- Nord Stream 1 & 2 (Russia-Germany, Baltic Sea): Sabotaged September 2022. German investigations concluded Ukrainian operatives were responsible. Eliminated Russia's primary direct gas route to Germany.
- TurkStream (Russia-Turkey, Black Sea): Now Russia's last active pipeline to Europe. Supplied 13 billion cubic meters in 2025. Elevates Turkey as critical energy transit hub.
- TANAP (Trans-Anatolian, Azerbaijan-Turkey): Carries Azeri gas from Shah Deniz field to Turkey and onward to Europe via TAP.
- Blue Stream (Russia-Turkey, Black Sea): Secondary Russia-Turkey gas route.
- Yamal-Europe (Russia-Belarus-Poland-Germany): Flows reversed/reduced since Ukraine war.
- Power of Siberia (Russia-China): 38 bcm/year capacity. Russia's pivot to Asian gas markets.
- Power of Siberia 2 (planned, Russia-Mongolia-China): Would provide 50 bcm/year. Negotiations ongoing. China has leverage as Russia's only alternative to European market.

MAJOR OIL PIPELINES:
- Druzhba (Friendship) Pipeline: World's longest oil pipeline network. Russia to Central/Western Europe via Belarus and Ukraine. Southern branch still operational.
- BTC (Baku-Tbilisi-Ceyhan): Azeri oil bypassing Russia and Iran. Strategic US-backed route.
- ESPO (East Siberia-Pacific Ocean): Russian oil to Pacific coast for Asian export.
- Keystone/Keystone XL: Canada to US Gulf Coast. XL extension canceled by Biden (2021).
- South Sudan-Sudan: Oil transits to Port Sudan. 75% of South Sudan government revenue.

STRATEGIC PETROLEUM RESERVES (SPR):
- United States: 411 million barrels (end 2025). Maximum capacity 714M barrels. Trump administration prioritizing refill. Equivalent to ~125 days of net imports.
- Japan: ~583 million barrels (state + private stockpiles). Among the largest globally.
- China: Estimated 500-950 million barrels (opaque, not officially disclosed). Rapid buildup during low-price periods.
- IEA requirement: Participating countries must maintain 90 days of net petroleum imports.
- EU: Each member required to hold 90 days of average daily net imports.

LNG TERMINAL CAPACITY:
- US became world's largest LNG exporter (2024). Gulf Coast terminals: Sabine Pass, Cameron, Freeport, Corpus Christi.
- Europe rapidly built floating regasification (FSRU) terminals post-2022 to replace Russian pipeline gas.
- Qatar: North Field expansion will increase LNG capacity to 142 mtpa by 2030 (from 77 mtpa).
- Australia: Second largest LNG exporter. Key supplier to Japan, South Korea, China.`,
    category: "market",
    tags: JSON.stringify(["pipelines", "lng", "spr", "energy-infrastructure", "nord-stream", "turkstream", "oil", "gas"]),
    source: "EIA, IEA, Global Energy Monitor, Columbia CGEP, DOE SPR Quick Facts",
    confidence: 0.90,
    status: "active",
    metadata: JSON.stringify({
      type: "energy-infrastructure",
      usSpr: "411M barrels",
      japanSpr: "583M barrels",
      turkstreamFlow2025: "13 bcm",
      usLngExporter: "largest globally (2024)",
    }),
  },

  // =======================================
  // SECTARIAN & ETHNIC MAPS
  // =======================================
  {
    title: "Sunni-Shia Divide - Sectarian Geopolitics & Proxy Network Map",
    content: `The Sunni-Shia divide is the primary sectarian fault line in Middle Eastern geopolitics, exploited by Iran and Saudi Arabia as a framework for proxy competition. The divide originated in a 7th-century succession dispute after Prophet Muhammad's death but today functions primarily as a geopolitical alignment tool.

POPULATION DISTRIBUTION:
- Sunni: ~85-90% of world's ~1.8 billion Muslims
- Shia: ~10-15% (~200-300 million), concentrated in Iran, Iraq, Bahrain, Azerbaijan, Lebanon
- Majority Shia countries: Iran (90-95%), Iraq (60-65%), Bahrain (70%), Azerbaijan (75%)
- Significant Shia minorities: Lebanon (30-40%), Yemen (35-40%), Kuwait (30%), Saudi Arabia (10-15%, concentrated in oil-rich Eastern Province)

IRAN'S SHIA AXIS (Axis of Resistance):
- Lebanon/Hezbollah: Iran's most capable proxy. ~30,000 fighters pre-2024. Significantly degraded after Israel's 2024 campaign.
- Iraq: Shia militias (PMF/Hashd al-Shaabi) operate within Iraqi state structure. ~100,000+ fighters. Iranian-aligned parties dominate parliament.
- Syria: Assad regime (Alawite, a Shia offshoot) was Iran's critical land bridge to Hezbollah. Assad fell December 2024, severing this corridor.
- Yemen/Houthis (Ansar Allah): Zaydi Shia movement. Iranian weapons and advisory support. Red Sea shipping attacks since 2023.
- Palestine: Hamas (Sunni) was an anomalous member of Iran's axis, receiving funding and weapons despite being Sunni. Severely degraded after Gaza war (2023-2025).

SAUDI-LED SUNNI ALIGNMENT:
- Gulf states (UAE, Kuwait, Bahrain, Qatar - with tensions)
- Egypt (under Sisi)
- Jordan
- Morocco
- Supported by broader Sunni world: Turkey (independent actor), Pakistan (balances Iran-Saudi)

2023 RAPPROCHEMENT:
China brokered restoration of Iran-Saudi diplomatic relations (March 2023). This reduced overt proxy competition but did not resolve underlying rivalries. The rapprochement is transactional, not structural.

ANALYTICAL FRAMEWORK:
Sectarianism is a tool of state competition, not its cause. Iran and Saudi Arabia exploit sectarian identity to build networks of influence, recruit proxies, and justify intervention. The same populations (Iraqi Shia, Lebanese Shia, Yemeni Zaydis) would have political grievances regardless of the sectarian frame. The sectarian overlay provides organizational structure and external backing to local conflicts.`,
    category: "geopolitical",
    tags: JSON.stringify(["sunni", "shia", "iran", "saudi", "sectarian", "proxy", "hezbollah", "houthis", "middle-east"]),
    source: "CFR, PBS Frontline Bitter Rivals, Cambridge University Press, Real Instituto Elcano",
    confidence: 0.90,
    status: "active",
    metadata: JSON.stringify({
      type: "sectarian-map",
      sunniPopulation: "85-90% of Muslims",
      shiaPopulation: "10-15%",
      iranProxies: ["Hezbollah", "Iraqi PMF", "Houthis"],
      rapprochement: "March 2023, China-brokered",
    }),
  },

  // =======================================
  // HISTORICAL PRECEDENT MODELS
  // =======================================
  {
    title: "1973 Oil Embargo - Historical Precedent for Energy Weaponization",
    content: `The 1973 Arab oil embargo remains the primary historical model for understanding energy as a geopolitical weapon and its market consequences.

TRIGGER:
October 1973: OAPEC (Organization of Arab Petroleum Exporting Countries) announced total oil embargo against countries supporting Israel during the Yom Kippur War. Initially targeted: US, Canada, Japan, Netherlands, UK. Later extended to Portugal, Rhodesia, South Africa.

PRICE IMPACT:
- October 16, 1973: Oil price raised from $3.01 to $5.12/barrel at Kuwait City OPEC summit
- Late December 1973: Further increase to $11.65/barrel
- By embargo's end (March 1974): ~300% increase from $3 to ~$12/barrel
- Although only ~7% of US petroleum supply was directly affected, psychological impact was massive

ECONOMIC CONSEQUENCES:
- US economy contracted ~2.5%
- Stagflation: simultaneous high inflation and rising unemployment (previously thought impossible under Keynesian theory)
- 1973-1975 recession was among the deepest of the post-war era
- Stock market: Dow Jones fell 45% from January 1973 to December 1974
- Global GDP impact: Recession spread to all oil-importing economies

STRUCTURAL CHANGES:
- Creation of IEA (International Energy Agency) in 1974 to coordinate consumer response
- Strategic Petroleum Reserve established (US, 1975)
- 90-day import coverage requirement for IEA members
- Accelerated North Sea oil development (UK, Norway)
- CAFE fuel economy standards (US, 1975)
- Shift in oil market power from Western companies (Seven Sisters) to OPEC state producers
- Petrodollar recycling system established (1974 US-Saudi agreement)

APPLICABILITY TODAY:
- Hormuz closure scenario would have similar but larger impact (21M bbl/day vs 5M bbl/day affected in 1973)
- SPR releases and shale production provide buffer that didn't exist in 1973
- But global economy is more energy-intensive and supply chains are more complex
- Financial system transmission (derivatives, margin calls) would amplify physical supply disruption
- 1973 took months to unfold; modern markets would price the disruption in hours`,
    category: "event",
    tags: JSON.stringify(["oil-embargo", "1973", "opec", "energy-weapon", "historical-precedent", "stagflation", "iea"]),
    source: "Federal Reserve History, State Department, Britannica, Baker Institute, Columbia CGEP",
    confidence: 0.95,
    status: "active",
    metadata: JSON.stringify({
      type: "historical-precedent",
      priceChange: "$3 to $12 (300%)",
      gdpImpact: "-2.5% US",
      duration: "October 1973 - March 1974",
      structuralChanges: ["IEA created", "SPR established", "CAFE standards", "North Sea development"],
    }),
  },
  {
    title: "Arab Spring 2011 - Cascade Model for Regime Collapse",
    content: `The 2011 Arab Spring provides the primary modern model for understanding how popular uprisings cascade across regions and what conditions enable or prevent regime collapse.

TRIGGER EVENT:
December 17, 2010: Mohamed Bouazizi, a Tunisian street vendor, self-immolated after police confiscation of his cart and public humiliation. His act became the catalyst for protests that spread across the Arab world within weeks.

STRUCTURAL CONDITIONS (present across all affected countries):
1. Economic: High youth unemployment (25-40%), rising food prices, inequality, corruption
2. Political: Authoritarian regimes with decades of single-party/leader rule, no political outlet
3. Demographic: Youth bulge (60%+ of population under 30 in most affected countries)
4. Social: Educated populations with rising expectations but blocked mobility
5. Technological: Social media (Facebook, Twitter) enabled rapid coordination and bypassed state media control

CASCADE SEQUENCE:
- Tunisia (December 2010): Ben Ali fled January 14, 2011 after 23 years
- Egypt (January 2011): Mubarak resigned February 11 after 30 years
- Libya (February 2011): Civil war, NATO intervention, Gaddafi killed October 2011
- Yemen (February 2011): Saleh forced out after 33 years, civil war followed
- Syria (March 2011): Assad crackdown led to civil war (ongoing until Assad fell December 2024)
- Bahrain (February 2011): Protests crushed by Saudi military intervention
- Also significant protests in: Morocco, Jordan, Algeria, Iraq, Kuwait, Oman

CASCADE CONDITIONS (from academic research):
Regime change cascades require:
(a) Common frame of political reference (shared Arab identity, shared authoritarian grievances)
(b) Unpopular leaderships becoming "lame ducks" (perception of weakness after Tunisia/Egypt)
(c) Elites lacking alternative focal points for coordinated defection
(d) Structural conditions supporting a new regime type (civil society, educated class)

CRITICAL VARIABLE - MILITARY BEHAVIOR:
The single most important determinant of outcome was whether the military sided with the regime or the people:
- Tunisia, Egypt: Military sided with protesters, regime fell quickly
- Libya: Military split, leading to civil war
- Syria: Military core remained loyal, leading to prolonged war
- Bahrain: External military intervention (Saudi) preserved regime

OUTCOMES BY COUNTRY (as of 2026):
- Tunisia: Brief democracy, then back to authoritarian rule under Saied (2021 self-coup)
- Egypt: Brief Morsi democracy, then Sisi military coup (2013), more authoritarian than Mubarak
- Libya: Failed state, two rival governments, ongoing instability
- Yemen: Civil war, Houthi control of north, Saudi-backed government in south
- Syria: Assad finally fell December 2024, new government under Ahmed al-Sharaa
- Bahrain: No change, continued Sunni monarchy over Shia majority

ANALYTICAL LESSON:
Revolution is easier than state-building. Every country that underwent regime change in 2011 (except Syria in 2024-2025, which is still early) ended up in a condition equal to or worse than before. The structural conditions that produce uprisings (inequality, corruption, youth unemployment) are not resolved by changing the leadership.`,
    category: "event",
    tags: JSON.stringify(["arab-spring", "revolution", "cascade", "regime-change", "tunisia", "egypt", "historical-precedent"]),
    source: "Wilson Center, PONARS Eurasia/Annual Reviews, WEF, GSDRC",
    confidence: 0.92,
    status: "active",
    metadata: JSON.stringify({
      type: "historical-precedent",
      trigger: "Bouazizi self-immolation, December 17, 2010",
      countriesAffected: ["Tunisia", "Egypt", "Libya", "Yemen", "Syria", "Bahrain"],
      cascadeConditions: ["common-political-frame", "lame-duck-perception", "elite-defection", "structural-support"],
      criticalVariable: "military behavior",
    }),
  },

  // =======================================
  // TRADE ARCHITECTURE
  // =======================================
  {
    title: "Global Trade Architecture - RCEP, CPTPP, USMCA & the Brussels Effect",
    content: `The global trading system operates through overlapping multilateral, regional, and bilateral agreements. Understanding which countries are bound by which rules determines trade leverage and sanctions effectiveness.

WTO (World Trade Organization):
- 164 members covering ~98% of global trade
- Dispute settlement mechanism effectively paralyzed since 2019 (US blocked Appellate Body appointments)
- Most-Favored-Nation (MFN) principle: tariff concessions to one member must extend to all
- Exceptions: Regional trade agreements, national security (Article XXI, invoked by Trump for steel/aluminum tariffs)

RCEP (Regional Comprehensive Economic Partnership, 2022):
- Members: 15 countries (10 ASEAN + China, Japan, South Korea, Australia, New Zealand)
- Coverage: ~30% of global GDP, 30% of world population, 28.8% of global trade
- World's largest trade bloc by population and GDP
- Incremental tariff reduction, less comprehensive than CPTPP
- No labor, environment, or state-owned enterprise disciplines
- Significance: First trade agreement linking China, Japan, and South Korea

CPTPP (Comprehensive and Progressive Agreement for Trans-Pacific Partnership, 2018):
- Members: 12 countries (Australia, Brunei, Canada, Chile, Japan, Malaysia, Mexico, New Zealand, Peru, Singapore, Vietnam, UK)
- UK acceded July 2023 (first non-Pacific member)
- Coverage: ~14.5% of global GDP
- Higher standards than RCEP: labor rights, environmental protections, SOE disciplines, IP protection
- Originally TPP (designed by Obama to counter China), US withdrew under Trump (2017)
- China has applied to join (2021) but faces opposition on SOE/subsidy rules

USMCA (United States-Mexico-Canada Agreement, 2020):
- Replaced NAFTA. Covers ~28% of global GDP
- Key features: Rules of origin for auto manufacturing (75% North American content), digital trade provisions, sunset clause (16-year review)

THE BRUSSELS EFFECT:
The EU's regulatory power functions as a trade weapon without tariffs. Because the EU is the world's largest single market (~$17T GDP), companies worldwide adopt EU standards to access it:
- GDPR: Became de facto global privacy standard
- REACH: Chemical safety regulation adopted globally
- EU Carbon Border Adjustment Mechanism (CBAM): Forces carbon pricing on imports
- EU Deforestation Regulation: Requires supply chain deforestation-free certification
- European Battery Regulation (2027): Supply chain due diligence for cobalt, lithium
Result: EU exports its regulatory framework globally, shaping markets even in countries that reject its policies.

SANCTIONS AS TRADE WEAPON:
Trade architecture determines sanctions effectiveness. Countries covered by multiple Western-aligned agreements (WTO + CPTPP + bilateral) have fewer alternatives when sanctioned. Countries in RCEP but not CPTPP (e.g., China) have alternative trading partners. Russia's expulsion from Western trade frameworks pushed it into near-total dependence on China for technology imports.`,
    category: "market",
    tags: JSON.stringify(["trade", "rcep", "cptpp", "usmca", "wto", "brussels-effect", "eu-regulation", "sanctions"]),
    source: "PIIE, APEC Research, BBCIncorp, European Parliament",
    confidence: 0.90,
    status: "active",
    metadata: JSON.stringify({
      type: "trade-architecture",
      rcepGdpShare: "30%",
      cptppGdpShare: "14.5%",
      usmcaGdpShare: "28%",
      wtoMembers: 164,
      cptppMembers: 12,
      rcepMembers: 15,
    }),
  },
];

export const STRUCTURAL_ENTRY_COUNT = entries.length;

export async function ingestStructuralKnowledge(): Promise<{ count: number }> {
  let count = 0;
  for (const entry of entries) {
    try {
      await addKnowledge(entry);
      count++;
    } catch (err) {
      console.error(`[structural-ingest] Failed to add "${entry.title}":`, err);
    }
  }
  console.log(`[structural-ingest] Ingested ${count}/${entries.length} entries`);
  return { count };
}
