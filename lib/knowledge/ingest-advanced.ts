import { addKnowledge } from "./engine";
import type { NewKnowledgeEntry } from "@/lib/db/schema";

type KnowledgeInput = Omit<NewKnowledgeEntry, "id" | "createdAt">;

const entries: KnowledgeInput[] = [
  // ═══════════════════════════════════════════
  // CENTRAL BANK REACTION FUNCTIONS
  // ═══════════════════════════════════════════
  {
    title: "Federal Reserve Reaction Function - Decision Boundaries",
    content: `The Federal Reserve's monetary policy decisions follow a roughly modelable reaction function based on dual mandate variables (maximum employment, price stability) and financial conditions.

TAYLOR RULE FRAMEWORK: The Taylor Rule prescribes: r = r* + 0.5(inflation - 2%) + 0.5(output gap). Neutral rate (r*) currently estimated at 2.5-3.0% nominal. When actual Fed Funds rate is below Taylor Rule output, policy is accommodative. When above, restrictive.

CUT TRIGGERS (historically):
- Core PCE declining toward 2% with labor market softening (unemployment rising 0.5%+ from cycle low = Sahm Rule recession indicator)
- Financial stress events (credit market seizure, bank failures) trigger emergency cuts regardless of inflation
- Yield curve inversion sustained >6 months followed by steepening (bull steepener = recession pricing)
- ISM Manufacturing below 45 for 2+ consecutive months

HOLD/HIKE TRIGGERS:
- Core PCE sticky above 3% with employment still strong
- Wage growth (ECI, Atlanta Fed Wage Tracker) above 4% annually
- Inflation expectations unanchoring (5y5y breakeven above 2.8%, UMich long-term expectations above 3.5%)

FORWARD GUIDANCE TELLS: Watch the dot plot median vs market pricing (Fed Funds futures). When the gap exceeds 75bp, one side is wrong. The statement language hierarchy: "prepared to adjust" > "closely monitoring" > "strongly committed." Dissent patterns matter: 2+ dissents signal near-term policy shift.

QUANTITATIVE TIGHTENING: Balance sheet runoff at $60B Treasuries + $35B MBS monthly cap. QT stopping triggers: reserve scarcity (repo rate spikes), TGA drawdowns causing reserve volatility, or financial stability concerns. ON RRP facility usage below $200B signals reserves approaching scarcity.`,
    category: "model",
    tags: JSON.stringify(["fed", "monetary-policy", "reaction-function", "taylor-rule", "interest-rates", "central-bank"]),
    source: "Federal Reserve, Brookings Institution, NY Fed",
    confidence: 0.88,
    status: "active",
    metadata: JSON.stringify({
      type: "reaction-function",
      neutralRate: "2.5-3.0%",
      sahmRuleThreshold: "0.5% unemployment rise",
      qtCaps: { treasuries: "$60B/mo", mbs: "$35B/mo" },
      cutTriggers: ["Sahm Rule", "Credit seizure", "ISM <45 x2", "Bull steepener"],
      hikeTriggers: ["Core PCE >3%", "ECI >4%", "Expectations unanchoring"],
    }),
  },
  {
    title: "Bank of Japan Reaction Function - Yield Curve Control and Yen Defense",
    content: `The BOJ operates the most unconventional monetary policy of any major central bank. Understanding its reaction function is critical because Japan is the largest foreign holder of US Treasuries and Japanese capital flows move global bond markets.

YIELD CURVE CONTROL (YCC): Officially abandoned in March 2024 after gradual widening from +/-0.25% to +/-0.50% to +/-1.0% to elimination. The BOJ now uses JGB purchases "as needed" rather than targeting a specific yield. Any sharp JGB selloff (10Y above 1.5%) will test BOJ resolve.

RATE HIKE TRIGGERS:
- Core-core CPI (ex food and energy) sustained above 2%
- Spring wage negotiations (Shunto) delivering base pay increases above 3%
- Yen weakness threatening imported inflation (USD/JPY above 160 is intervention zone)
- Service sector inflation broadening

INTERVENTION TRIGGERS (Yen defense):
- USD/JPY above 155-160 triggers verbal warnings, then actual intervention
- BOJ/MOF has ~$1.1T in reserves for intervention but effectiveness is limited without Fed cooperation
- Rate of change matters more than level: 10 yen move in 1 month triggers response faster than gradual drift
- Intervention is always unsterilized (buying yen = selling USD Treasuries = higher US yields)

GLOBAL TRANSMISSION: When BOJ tightens, Japanese investors repatriate. Japan holds ~$1.1T in US Treasuries, ~$500B in European bonds, significant Australian/emerging market debt. A BOJ tightening cycle mechanically pushes global yields higher as Japanese capital comes home. The "carry trade unwind" (borrowing yen to buy higher-yielding assets) is a tail risk that caused a flash crash in August 2024.`,
    category: "model",
    tags: JSON.stringify(["boj", "japan", "monetary-policy", "reaction-function", "YCC", "yen", "carry-trade"]),
    source: "Bank of Japan, MOF, GPIF",
    confidence: 0.87,
    status: "active",
    metadata: JSON.stringify({
      type: "reaction-function",
      yccStatus: "Abandoned March 2024",
      interventionZone: "USD/JPY 155-160",
      reserves: "$1.1T",
      usTreasuryHoldings: "$1.1T",
      carryTradeRisk: "Flash crash Aug 2024 precedent",
      shuntoThreshold: "3% base pay",
    }),
  },
  {
    title: "European Central Bank Reaction Function - Fragmentation and Inflation",
    content: `The ECB operates with a unique constraint: it must maintain monetary policy across 20 countries with divergent fiscal positions. This creates a dual mandate that doesn't officially exist: price stability AND preventing fragmentation (sovereign spread blowouts).

RATE DECISION TRIGGERS:
- HICP headline and core both trending toward 2%. ECB is more hawkish on headline than Fed because energy/food weigh more in European consumption baskets
- Credit impulse turning negative (bank lending survey showing tightening)
- PMI composite below 48 for 2+ quarters signals recession risk

FRAGMENTATION TRIGGERS (the real constraint):
- Italian 10Y BTP spread over German Bund above 250bp triggers verbal pushback
- Above 300bp triggers Transmission Protection Instrument (TPI) activation discussions
- Above 400bp is crisis territory (2011-2012 levels, "whatever it takes" territory)
- Greek, Portuguese, Spanish spreads widening in sympathy = systemic fragmentation

TPI (Transmission Protection Instrument): Unlimited bond-buying program for countries experiencing "unwarranted" spread widening. Conditions: fiscal compliance with EU rules, no excessive macroeconomic imbalances, sustainable public debt trajectory. Never activated. Its credibility depends on never being tested. If activated and insufficient, the euro project faces existential questions.

KEY TELLS: Watch ECB staff projections (quarterly, stronger signal than statements). Governing Council "sources" leaks to Reuters/Bloomberg 2 weeks before meetings telegraph decisions. Northern hawks (Bundesbank, Netherlands, Austria) vs Southern doves (Italy, Spain, Portugal, Greece) voting dynamics. Lagarde's body language and emphasis on "data dependent" vs "determined."`,
    category: "model",
    tags: JSON.stringify(["ecb", "europe", "monetary-policy", "reaction-function", "fragmentation", "BTP-Bund", "TPI"]),
    source: "ECB, Bundesbank, European Commission",
    confidence: 0.87,
    status: "active",
    metadata: JSON.stringify({
      type: "reaction-function",
      fragmentationLevels: {
        verbal: "BTP-Bund 250bp",
        tpiDiscussion: "300bp",
        crisis: "400bp",
      },
      tpiStatus: "Never activated, credibility untested",
      memberStates: 20,
      keyTells: ["Staff projections", "Sources leaks", "Hawk-dove voting"],
    }),
  },
  {
    title: "People's Bank of China Reaction Function - Managed Devaluation and Credit Impulse",
    content: `The PBOC operates fundamentally differently from Western central banks. It uses a combination of interest rates, reserve requirements, window guidance (direct lending instructions to banks), and FX intervention. Understanding its reaction function is essential because China's credit impulse leads the global manufacturing cycle by 6-9 months.

EASING TRIGGERS:
- GDP growth falling below the annual target (currently ~5%)
- Youth unemployment rising above 20% (politically sensitive, reporting was suspended in 2023)
- Property sector stress (developer defaults, falling land sales revenue, mortgage boycotts)
- Export growth turning negative for 3+ months
- PMI manufacturing below 49 for 2+ months

TOOLS HIERARCHY (order of deployment):
1. MLF/LPR rate cuts (small, 10-25bp increments, signaling function)
2. RRR cuts (release ~$100-150B liquidity per 25bp cut, 7.0% current level)
3. Targeted relending facilities (PSL for housing, tech lending quotas)
4. Window guidance (direct instruction to banks on lending targets)
5. FX intervention (state bank USD selling, adjusting counter-cyclical factor in daily fixing)
6. Capital control tightening (last resort, signals severe stress)

YUAN MANAGEMENT: Daily fixing rate set by PBOC with +/-2% band. The "counter-cyclical factor" is an opaque adjustment that signals PBOC's desired direction. USD/CNY 7.00 is psychological. 7.35 is the recent ceiling. State banks selling USD in forwards is visible in the swap market. PBOC prefers gradual depreciation (competitive advantage) but fears capital flight from rapid moves.

CREDIT IMPULSE: The single most important leading indicator for global growth. Measured as change in new credit (Total Social Financing) as % of GDP. When China's credit impulse turns positive, global industrial metals, emerging markets, and European exporters rally with a 6-9 month lag. When it turns negative, global growth decelerates.

PROPERTY SECTOR: Accounts for ~25-30% of GDP (direct + indirect). "Three Red Lines" policy (2020) triggered developer deleveraging spiral. PBOC response: mortgage rate cuts, down payment reductions, developer financing "whitelist." If property stabilizes, the credit impulse turns positive. This is the key variable for global growth in 2024-2026.`,
    category: "model",
    tags: JSON.stringify(["pboc", "china", "monetary-policy", "reaction-function", "credit-impulse", "yuan", "property"]),
    source: "PBOC, NBS China, Goldman Sachs Research",
    confidence: 0.87,
    status: "active",
    metadata: JSON.stringify({
      type: "reaction-function",
      gdpTarget: "~5%",
      rrrLevel: "7.0%",
      yuanCeiling: "7.35",
      creditImpulseLag: "6-9 months",
      propertyGDPShare: "25-30%",
      toolsOrder: ["MLF/LPR", "RRR", "Relending", "Window guidance", "FX intervention", "Capital controls"],
    }),
  },

  // ═══════════════════════════════════════════
  // LIQUIDITY PLUMBING & MARKET MICROSTRUCTURE
  // ═══════════════════════════════════════════
  {
    title: "US Financial Plumbing - Reserves, Repo, and Liquidity Calendar",
    content: `The "plumbing" of the US financial system determines short-term market liquidity and often drives price action more than fundamentals. Key components:

TREASURY GENERAL ACCOUNT (TGA): The US government's checking account at the Fed. Balance typically $400-800B. When Treasury issues debt, TGA rises (drains reserves from banking system = tightening). When Treasury spends, TGA falls (adds reserves = easing). Debt ceiling resolution always followed by massive T-bill issuance that drains liquidity. Monitor TGA level weekly via Fed H.4.1 release.

REVERSE REPO FACILITY (ON RRP): The Fed's facility where money market funds park cash overnight at the Fed Funds rate. Peak was $2.5T (Dec 2022). As it drains toward zero, the system transitions from "abundant reserves" to "ample reserves" to potential scarcity. Below $200B signals transition zone. At zero, every dollar of QT directly reduces bank reserves.

BANK RESERVES: Currently ~$3.3T. The "lowest comfortable level of reserves" (LCLoR) is estimated at $2.5-3.0T. Below this, repo rate spikes (September 2019 repo crisis precedent). Fed will likely stop QT when reserves approach this level. Reserves = assets that banks hold at the Fed. They are the raw material of the financial system.

LIQUIDITY CALENDAR (predictable drains/adds):
- 15th of month: Corporate tax payments drain reserves
- Quarter-end (Mar 31, Jun 30, Sep 30, Dec 31): Window dressing, repo rate spikes, dealer balance sheet constraints. Worst liquidity of the quarter.
- Tax Day (April 15): Massive reserve drain ($200-400B)
- Debt ceiling X-date: TGA drawdown then massive refill = liquidity whiplash
- Options expiration (monthly 3rd Friday, quarterly "triple/quad witching"): Gamma exposure drives mechanical flows
- Month-end: Pension fund rebalancing (sell winners, buy losers), index rebalancing flows
- Year-end: Window dressing, tax-loss selling (Nov-Dec), January effect (first 5 days January historically predictive for full year)

FED FACILITIES AS STRESS SIGNALS:
- Standing Repo Facility (SRF) usage above $1B = banks need emergency liquidity
- Discount Window borrowing = stigma signal, only used in stress (SVB crisis 2023)
- BTFP (Bank Term Funding Program) was emergency facility for underwater bank portfolios, expired March 2024
- Foreign central bank repo facility usage = dollar funding stress abroad`,
    category: "model",
    tags: JSON.stringify(["liquidity", "plumbing", "TGA", "reserves", "repo", "fed", "market-microstructure", "calendar"]),
    source: "NY Fed, Federal Reserve H.4.1, Treasury.gov",
    confidence: 0.90,
    status: "active",
    metadata: JSON.stringify({
      type: "liquidity-model",
      tgaNormalRange: "$400-800B",
      onrrpPeak: "$2.5T",
      reserveScarcityLevel: "$2.5-3.0T",
      currentReserves: "~$3.3T",
      criticalDates: {
        monthlyTax: "15th",
        quarterEnd: "Mar31/Jun30/Sep30/Dec31",
        taxDay: "April 15",
        opex: "3rd Friday monthly",
      },
    }),
  },
  {
    title: "Options Market Microstructure - Gamma Exposure and Dealer Hedging",
    content: `Options dealer positioning creates mechanical, predictable price action in equity markets. This is one of the most exploitable edges in modern markets.

GAMMA EXPOSURE (GEX): When dealers are net long gamma (sold puts to hedgers, bought calls from speculators), they must buy dips and sell rallies to stay delta-neutral. This suppresses volatility and pins prices near strike concentrations. When dealers are net short gamma (sold calls, markets moving fast), they must sell into declines and buy into rallies, amplifying moves. GEX sign determines market character.

KEY LEVELS:
- "Max Pain": The strike price where the most options expire worthless. Markets gravitate toward max pain into expiration, especially for monthly/quarterly OPEX.
- "Zero Gamma Level": The price level where dealer gamma flips from positive to negative. Above = suppressed vol. Below = amplified vol. This is the single most important tactical level for intraday/intraweek trading.
- "Call Wall": Largest open interest concentration in calls. Acts as resistance through dealer hedging (they sell stock as price rises into call wall).
- "Put Wall": Largest open interest concentration in puts. Acts as support (dealers buy stock as price falls into put wall).

0DTE (Zero Days to Expiration): Daily options now account for 40-50% of total S&P 500 options volume. This creates intraday gamma effects that didn't exist before 2022. The 0DTE phenomenon compresses the vol cycle from weekly/monthly to daily.

VOL SUPPLY/DEMAND: Systematic vol-selling strategies (covered call ETFs like JEPI/JEPQ, dispersion trading, variance swaps) structurally suppress implied volatility. This keeps VIX artificially low during calm periods but creates "vol explosions" when these strategies are forced to unwind. The "short vol complex" is estimated at $1-2T in notional.

OPEX CALENDAR (increasing impact):
- Daily: 0DTE S&P 500 options
- Weekly: Friday SPX/SPY options
- Monthly: 3rd Friday (standard expiration)
- Quarterly: March/June/Sep/Dec 3rd Friday (largest, most mechanical flows)
- VIX expiration: Wednesday morning, 30 days before next monthly SPX expiration`,
    category: "model",
    tags: JSON.stringify(["options", "gamma", "GEX", "dealer-hedging", "0DTE", "volatility", "market-microstructure"]),
    source: "SpotGamma, SqueezeMetrics, CBOE",
    confidence: 0.85,
    status: "active",
    metadata: JSON.stringify({
      type: "market-microstructure",
      keyLevels: ["Zero Gamma", "Max Pain", "Call Wall", "Put Wall"],
      zeroDTEShare: "40-50% of SPX options volume",
      shortVolComplex: "$1-2T notional",
      opexImpact: "Quarterly > Monthly > Weekly > Daily",
    }),
  },

  // ═══════════════════════════════════════════
  // CREDIT STRESS INDICATORS
  // ═══════════════════════════════════════════
  {
    title: "Credit Stress Indicator Framework - Early Warning System",
    content: `Credit markets lead equity markets. Every major crash in history started with credit stress signals weeks or months before equities rolled over. This framework provides the key indicators and their threshold levels.

TIER 1 - IMMEDIATE STRESS (check daily):
- Investment Grade CDX (CDX.NA.IG): Normal 50-70bp. Elevated 80-100bp. Stress 100-150bp. Crisis >150bp.
- High Yield CDX (CDX.NA.HY): Normal 300-400bp. Elevated 450-550bp. Stress 550-700bp. Crisis >700bp.
- FRA-OIS Spread: Measures bank funding stress. Normal <15bp. Elevated 15-30bp. Stress 30-50bp. Crisis >50bp (hit 80bp in March 2023 during SVB).
- Commercial Paper spread to T-bills: Normal <30bp. Stress >75bp. Signals corporate funding market freeze.

TIER 2 - BUILDING STRESS (check weekly):
- High Yield OAS (Option-Adjusted Spread): Normal 300-400bp. Elevated 450-550bp. Stress >600bp. Recession signal >700bp.
- Leveraged Loan Default Rate: Trailing 12m. Normal <2%. Elevated 2-4%. Stress >4%. Recession >6%.
- BBB-BB Spread Compression/Expansion: When BBB-BB spread widens >150bp, it signals investment grade cliff risk (fallen angel wave incoming).
- TED Spread (3m LIBOR - 3m T-bill): Replaced by SOFR but concept remains. Interbank trust indicator.

TIER 3 - STRUCTURAL STRESS (check monthly):
- Bank Lending Standards (Fed Senior Loan Officer Survey): Tightening standards lead recessions by 2-4 quarters. Net tightening >20% = recession warning.
- Distressed Debt Ratio: Percentage of HY bonds trading >1000bp OAS. Normal <5%. Elevated 10-15%. Crisis >20%.
- Covenant-lite share of leveraged loans: Currently ~90%. Means defaults will come later but recovery rates will be lower.
- Private credit stress: Harder to observe. Watch BDC NAV discounts, CLO equity tranches, and middle-market lender earnings for early signals.

TRANSMISSION MECHANISM: Credit tightening -> reduced lending -> lower investment/hiring -> earnings miss -> equity decline -> credit tightening (reflexive loop). The loop accelerates once it starts. Speed of transmission is 3-6 months in normal cycles, days in crisis (Lehman, SVB).

HISTORICAL SIGNAL TIMING:
- 2008 GFC: Subprime CDX spiked Feb 2007, equities peaked Oct 2007 (8 month lead)
- 2020 COVID: HY OAS blew out same week as equities (simultaneous, exogenous shock)
- 2023 Banking: FRA-OIS spiked March 8, SVB failed March 10, contained within 2 weeks
- Pattern: Endogenous credit stress leads equities. Exogenous shocks hit simultaneously.`,
    category: "model",
    tags: JSON.stringify(["credit", "stress-indicators", "CDS", "high-yield", "default-rate", "early-warning", "financial-stability"]),
    source: "ICE BofA, Federal Reserve, S&P LCD, Moody's",
    confidence: 0.92,
    status: "active",
    metadata: JSON.stringify({
      type: "early-warning-system",
      tiers: 3,
      keyIndicators: ["CDX.IG", "CDX.HY", "FRA-OIS", "HY OAS", "Loan default rate", "SLOOS"],
      transmissionSpeed: { normal: "3-6 months", crisis: "days" },
      historicalLead: "Credit leads equities by 2-8 months in endogenous crises",
    }),
  },

  // ═══════════════════════════════════════════
  // POSITIONING & SENTIMENT
  // ═══════════════════════════════════════════
  {
    title: "Market Positioning and Sentiment Framework - Contrarian Signals",
    content: `Extreme positioning is the most reliable contrarian indicator. When everyone is on the same side of a trade, the reversal is mechanical because there's no one left to buy (or sell).

CFTC COMMITMENT OF TRADERS (CoT): Released every Friday for positions as of Tuesday. Key contracts to monitor:
- S&P 500 E-mini: Asset managers net long is normal. Leveraged funds (hedge funds) extreme net short = contrarian bullish (they're wrong more than right at extremes). >2 standard deviations from mean = signal.
- 10Y Treasury: Leveraged funds net short at record = bond rally setup. Has been a consistent contrarian signal.
- EUR/USD: Leveraged funds >100K net contracts in either direction = extreme.
- Gold: Managed money net long >300K contracts = crowded. <100K = washed out.
- Crude Oil: Managed money net long/short relative to 3-year range. Extreme short = supply disruption vulnerability.

SENTIMENT SURVEYS:
- AAII Bull-Bear: Spread >30% bullish = cautious. Spread >30% bearish = contrarian buy. 4-week moving average smooths noise.
- Investors Intelligence: Advisors bulls >60% = danger zone. Bears >55% = buy zone.
- CNN Fear & Greed Index: Below 20 = extreme fear (buy). Above 80 = extreme greed (reduce).
- NAAIM Exposure Index: Fund manager equity exposure. Below 25 = extreme underweight = bullish. Above 100 = leveraged long = bearish.

FUND FLOWS (EPFR/ICI):
- Equity fund outflows >$20B/week for 3+ weeks = capitulation (buy signal)
- Money market fund inflows >$100B/month = extreme risk aversion (late-stage fear)
- EM fund outflows >$10B/month = EM stress
- Sector rotation: Track weekly flows into/out of sectors for regime shift signals

OPTIONS SENTIMENT:
- Put/Call ratio (equity only, exclude index hedging): >1.0 sustained = extreme fear. <0.5 = complacency.
- SKEW index: Measures tail risk demand. Above 150 = high tail hedging demand. Below 120 = complacency.
- VIX term structure: Backwardation (near > far) = acute stress. Steep contango = complacency.

KEY RULE: Sentiment is only useful at extremes. In the middle range, it's noise. Combine with price action: sentiment extreme + price reversal = high conviction signal. Sentiment extreme + price continuation = the extreme can get more extreme.`,
    category: "model",
    tags: JSON.stringify(["positioning", "sentiment", "CFTC", "CoT", "contrarian", "fund-flows", "put-call-ratio"]),
    source: "CFTC, AAII, Investors Intelligence, EPFR",
    confidence: 0.88,
    status: "active",
    metadata: JSON.stringify({
      type: "sentiment-framework",
      cftcRelease: "Friday for Tuesday positions",
      aaiiExtreme: "+/-30% spread",
      fearGreedBuy: "<20",
      fearGreedSell: ">80",
      keyRule: "Only useful at extremes, combine with price action",
    }),
  },

  // ═══════════════════════════════════════════
  // CROSS-ASSET CORRELATION REGIMES
  // ═══════════════════════════════════════════
  {
    title: "Cross-Asset Correlation Regime Framework",
    content: `Asset correlations are not constant. They shift between regimes, and regime changes are among the most important signals in macro trading. A portfolio built on one correlation regime will blow up when the regime shifts.

STOCK-BOND CORRELATION:
- 2000-2021: Negative correlation (bonds rally when stocks sell off). This is the "60/40 portfolio" era. Driven by demand-side recessions where Fed cuts rates.
- 2022-present: Positive correlation (bonds and stocks fall together). Driven by inflation shocks where Fed hikes despite growth weakness. This regime invalidates 60/40 and most risk parity strategies.
- Regime driver: When inflation is the primary risk, correlation is positive. When growth/deflation is the primary risk, correlation is negative. Monitor breakeven inflation rates to determine which regime we're in.

USD-OIL CORRELATION:
- Normal: Inverse (-0.3 to -0.6). Strong dollar = lower oil (priced in USD, reduces EM demand).
- Supply shock: Correlation breaks. Oil spikes regardless of dollar (1973, 1979, 2022).
- Dollar crisis: Both fall (never happened at scale but is a tail scenario).

GOLD-REAL RATES:
- Strong inverse correlation (-0.7 to -0.9) over past 20 years. Gold rallies when real rates (TIPS yields) fall.
- Broke in 2022-2023: Gold rallied despite rising real rates, driven by central bank buying. This signals structural de-dollarization demand for gold that overrides the rate relationship.
- If gold-real rate correlation re-establishes, gold is overvalued. If it's permanently broken by sovereign demand, gold has further upside.

CORRELATION SPIKES IN CRISIS:
- During market stress, correlations spike toward +1.0 across risk assets (stocks, credit, EM, commodities all fall together). The only diversifiers that work in crisis: US Treasuries (if stock-bond correlation is negative), USD, and VIX/options structures.
- "Diversification fails when you need it most" is the fundamental problem of portfolio construction.

REGIME CHANGE DETECTION:
- Rolling 60-day correlation crossing zero = regime shift signal
- DCC-GARCH models for dynamic correlation estimation
- Simple heuristic: if stocks and bonds both fall for 3+ consecutive weeks, you're in a positive correlation regime. Adjust hedges accordingly.
- Monitor: TIP (real rates ETF) vs GLD, UUP (dollar) vs USO (oil), SPY vs TLT for live regime reads.`,
    category: "model",
    tags: JSON.stringify(["correlation", "regime", "cross-asset", "stock-bond", "gold", "USD", "portfolio-construction"]),
    source: "AQR, Bridgewater, BIS Working Papers",
    confidence: 0.88,
    status: "active",
    metadata: JSON.stringify({
      type: "correlation-regime",
      currentStockBond: "Positive (inflation regime)",
      currentGoldRates: "Broken (sovereign demand)",
      regimeDriver: "Inflation risk = positive, Growth risk = negative",
      detectionMethod: "Rolling 60-day correlation zero-crossing",
      crisisCorrelation: "Approaches +1.0 across risk assets",
    }),
  },

  // ═══════════════════════════════════════════
  // MACRO REGIME CLASSIFICATION
  // ═══════════════════════════════════════════
  {
    title: "Macro Regime Classification Model - Bridgewater Framework",
    content: `The macro environment can be classified into four regimes based on two dimensions: growth (rising/falling) and inflation (rising/falling). Each regime has a distinct asset allocation playbook. This is the foundation of Ray Dalio's "All Weather" and Bridgewater's systematic macro approach.

REGIME 1 - GOLDILOCKS (Growth Rising, Inflation Falling):
Best regime for risk assets. Equities rally broadly. Credit spreads tighten. Bonds rally (falling inflation = rate cut expectations). USD usually weakens. Commodities mixed (growth supports demand, falling inflation means no supply shock). Strategy: Long equities, long credit, long duration bonds. Maximum risk-on.

REGIME 2 - REFLATION (Growth Rising, Inflation Rising):
Early/mid cycle expansion. Equities rally but leadership shifts to cyclicals/value. Commodities strong (demand-pull inflation). Bonds sell off (rising inflation = rate hike expectations). USD mixed. Real assets outperform financial assets. Strategy: Long equities (cyclicals, value, EM), long commodities, short duration, inflation-linked bonds.

REGIME 3 - STAGFLATION (Growth Falling, Inflation Rising):
Worst regime for portfolios. Equities fall (earnings declining). Bonds fall (inflation keeps rates elevated). Commodities mixed (supply-driven inflation but demand destruction). USD depends on relative positioning. Cash and gold are only shelters. Strategy: Defensive. Cash, gold, commodity producers, short equities, short credit. This is the 1970s, early 2022 playbook.

REGIME 4 - DEFLATION/RECESSION (Growth Falling, Inflation Falling):
Risk-off. Equities fall sharply. Bonds rally hard (flight to safety, rate cut expectations). Credit spreads blow out. Commodities crash (demand destruction). USD rallies (safe haven). Strategy: Long bonds, long USD, long volatility, short equities, short credit, short commodities. 2008 playbook.

REGIME IDENTIFICATION SIGNALS:
- ISM Manufacturing: Above 50 = growth rising. Below 50 = falling. Direction matters more than level.
- Core CPI/PCE 3-month annualized: Rising or falling trend.
- Leading Economic Index (LEI): 6 consecutive monthly declines = recession signal (100% accuracy historically).
- Yield curve slope (2s10s): Steepening from inversion = regime 4 transition.
- Credit impulse (change in private sector credit growth): Leads real economy by 6 months.

CURRENT REGIME DETERMINATION: Map ISM direction + CPI direction to one of four quadrants. Reallocate when signals indicate regime transition. Transitions are gradual (3-6 months) but markets often price them in weeks. Being early is the same as being wrong in the short term but essential in the medium term.`,
    category: "model",
    tags: JSON.stringify(["macro-regime", "bridgewater", "all-weather", "growth", "inflation", "asset-allocation", "framework"]),
    source: "Bridgewater Associates, Ray Dalio 'Principles', BIS",
    confidence: 0.90,
    status: "active",
    metadata: JSON.stringify({
      type: "regime-classification",
      regimes: {
        goldilocks: { growth: "up", inflation: "down", bestAssets: ["equities", "bonds", "credit"] },
        reflation: { growth: "up", inflation: "up", bestAssets: ["cyclicals", "commodities", "TIPS"] },
        stagflation: { growth: "down", inflation: "up", bestAssets: ["cash", "gold", "commodity-producers"] },
        deflation: { growth: "down", inflation: "down", bestAssets: ["bonds", "USD", "volatility"] },
      },
      identifiers: ["ISM direction", "Core CPI trend", "LEI", "Yield curve", "Credit impulse"],
    }),
  },

  // ═══════════════════════════════════════════
  // TAIL RISK / BLACK SWAN CATALOG
  // ═══════════════════════════════════════════
  {
    title: "Tail Risk Scenario Catalog - Low Probability, High Impact Events",
    content: `Enumerated tail risk scenarios with estimated probability, market impact, and hedge strategies. These are events that most models assign near-zero probability but would cause 10-sigma market moves.

SCENARIO 1 - TAIWAN INVASION:
Probability: 5-10% within 5 years. Impact: Global semiconductor production halts (TSMC = 90% advanced chips). S&P 500 -25 to -40%. Oil +50-100% (shipping disruption). Gold +30-50%. USD initially rallies (safe haven) then uncertain. China equities -50%+. Defense stocks +40-100%. Economic damage estimated at $2-5 trillion globally. Every electronic device supply chain disrupted for 12-24 months.
Hedge: Long defense ETFs, long oil calls, long VIX calls, reduce semiconductor exposure, physical gold.

SCENARIO 2 - JAPAN DEBT CRISIS:
Probability: 5-15% within 5 years. Trigger: BOJ loses control of JGB market. 10Y JGB spikes above 3-4%. Yen collapses. Impact: Japanese investors forced to sell foreign assets ($3T+ in foreign bonds/equities). US Treasury yields spike 100-200bp. Global bond rout. Japanese bank solvency crisis. Deflationary for global economy.
Hedge: Short JGBs, long USD/JPY, long UST puts (rates higher), long gold.

SCENARIO 3 - EUROZONE BREAKUP:
Probability: 3-5% within 5 years. Trigger: Italian sovereign debt crisis + populist government refuses EU fiscal constraints. TPI proven insufficient. TARGET2 imbalances explode. Impact: EUR collapses -30-50%. European bank run. Global financial contagion. Redenomination risk creates legal chaos. German exposure via TARGET2 = hundreds of billions in losses.
Hedge: Long USD, short EUR, long gold, short European bank equity, long US Treasuries.

SCENARIO 4 - US CONSTITUTIONAL CRISIS:
Probability: 5-10% within 4 years. Trigger: Contested election, state non-compliance with federal authority, Supreme Court legitimacy crisis. Impact: USD -10-20%, US Treasury yields spike on confidence loss, equity market -15-25%, gold +20-30%. Capital flows to Switzerland, Singapore, gold.
Hedge: Gold, Swiss franc, Singapore assets, reduced USD allocation.

SCENARIO 5 - PANDEMIC 2.0:
Probability: 10-20% within 10 years. Higher-fatality pathogen (H5N1 variant, novel coronavirus). Impact: Depends on severity. Moderate: 2020 replay (V-shaped with massive stimulus). Severe (5%+ fatality): Supply chain collapse, social breakdown, equity -50%+, bonds rally initially then inflate on money printing.
Hedge: Long bonds, long volatility, long healthcare, cash reserves, long remote-work tech.

SCENARIO 6 - SOLAR CARRINGTON EVENT:
Probability: 1-2% per decade. Massive solar storm destroys satellite communications and power grids. Impact: Estimated $1-2T in infrastructure damage. GPS, communications, power grid failures lasting weeks to months. Modern financial system depends on all three. Markets would likely close for extended period.
Hedge: Essentially unhedgeable through financial instruments. Physical resilience is the only hedge.

SCENARIO 7 - MIDDLE EAST NUCLEAR EXCHANGE:
Probability: 1-3% within 5 years. Iran achieves weapon, Israel preemptive strike fails, or Pakistan nuclear security compromise. Impact: Oil supply permanently disrupted. Global recession. Radiation/environmental impact. Defense spending surge globally. Energy transition acceleration.
Hedge: Long oil (super-contango), long gold, long defense, long uranium, short airlines/tourism.

PORTFOLIO IMPLICATION: Nassim Taleb's barbell strategy. 85-90% in extremely safe assets (short-term government bonds, cash). 10-15% in high-convexity tail bets (deep OTM options, venture, asymmetric positions). Nothing in the middle (the "medium risk" zone is where you get killed by tails).`,
    category: "model",
    tags: JSON.stringify(["tail-risk", "black-swan", "scenarios", "hedge", "geopolitical-risk", "portfolio", "stress-test"]),
    source: "RAND Corporation, Eurasia Group Top Risks, Taleb 'Black Swan'",
    confidence: 0.75,
    status: "active",
    metadata: JSON.stringify({
      type: "tail-risk-catalog",
      scenarios: 7,
      highestProbability: { event: "Pandemic 2.0", prob: "10-20% per decade" },
      highestImpact: { event: "Taiwan invasion", damage: "$2-5T" },
      frameworkSource: "Taleb barbell strategy",
      portfolioRule: "85-90% safe, 10-15% convex bets, nothing in between",
    }),
  },

  // ═══════════════════════════════════════════
  // ESCALATION LADDERS
  // ═══════════════════════════════════════════
  {
    title: "Conflict Escalation Ladder - Phase Model with Indicator Tripwires",
    content: `Standardized escalation framework for tracking conflict intensity. Adapted from Herman Kahn's escalation ladder and modern CSIS/RAND conflict phase models. Each phase has observable indicators that signal transition.

PHASE 0 - STABLE PEACE: Normal diplomatic relations, trade, cultural exchange. Military-to-military communication channels active. No significant troop movements. Risk indicators: All green.

PHASE 1 - POLITICAL TENSION: Diplomatic protests, ambassador recalls, UN voting bloc formation. Trade complaints at WTO. Media narratives shifting to adversarial framing. Risk indicators: Monitor.
Tripwire to Phase 2: Sanctions announcement, military exercise announcement near adversary borders, alliance consultations invoked.

PHASE 2 - CRISIS: Sanctions imposed, diplomatic channels reduced, military deployments to theater, naval presence expanded, airspace probing, cyber operations increase. Public threats from leadership. Risk indicators: Elevated.
Tripwire to Phase 3: Evacuation of diplomatic personnel/nationals, pre-positioning of military logistics (fuel, munitions, medical), satellite imagery showing force concentration, "red line" rhetoric from senior leadership.

PHASE 3 - BRINK OF CONFLICT: Final diplomatic ultimatums, military forces at highest readiness, civilian evacuation ordered, information operations at full intensity, economic decoupling (asset freezes, SWIFT cutoff), allies choosing sides publicly. Risk indicators: Critical.
Tripwire to Phase 4: Any kinetic incident (shoot-down, border clash, naval confrontation), false flag operation, or pre-emptive strike announcement.

PHASE 4 - LIMITED ARMED CONFLICT: Targeted strikes, proxy engagements, naval blockade, no-fly zone enforcement, cyber attacks on infrastructure, limited ground operations. Both sides attempting to keep conflict below total war threshold. Risk indicators: Maximum.
Tripwire to Phase 5: Attacks on homeland/capital, WMD use or threat, full mobilization, strategic infrastructure targeting (power grid, dams, nuclear facilities).

PHASE 5 - MAJOR COMBAT / TOTAL WAR: Full military mobilization, strategic bombing, invasion/occupation operations, potential WMD use, global alliance activation. No off-ramp without fundamental political change. Risk indicators: Existential.

CURRENT THEATER ASSESSMENTS (update regularly):
- Russia-NATO: Phase 4 (proxy conflict in Ukraine)
- Iran-Israel: Phase 2-3 (direct strikes exchanged but contained)
- China-Taiwan: Phase 1-2 (military exercises, economic pressure)
- India-Pakistan: Phase 1 (baseline tension, periodic escalation)
- North Korea: Phase 2 (nuclear/missile tests, sanctions)

MARKET IMPACT BY PHASE:
Phase 1: No market impact unless surprise
Phase 2: Sector rotation (defense up, airlines/tourism down), oil +5-10%
Phase 3: Broad risk-off, VIX 25-30, oil +15-25%, gold +5-10%
Phase 4: Sustained risk premium, VIX 30-40, credit spreads widen, safe haven flows
Phase 5: Circuit breakers, capital controls possible, oil supply disruption, multi-sigma moves`,
    category: "model",
    tags: JSON.stringify(["escalation", "conflict", "phases", "indicators", "early-warning", "military", "geopolitical-risk"]),
    source: "Herman Kahn, CSIS, RAND Corporation, Nexus Framework",
    confidence: 0.88,
    status: "active",
    metadata: JSON.stringify({
      type: "escalation-model",
      phases: 6,
      currentAssessments: {
        "Russia-NATO": "Phase 4",
        "Iran-Israel": "Phase 2-3",
        "China-Taiwan": "Phase 1-2",
        "India-Pakistan": "Phase 1",
        "North-Korea": "Phase 2",
      },
      marketImpact: {
        phase2: "Sector rotation, oil +5-10%",
        phase3: "VIX 25-30, oil +15-25%",
        phase4: "VIX 30-40, sustained premium",
        phase5: "Circuit breakers, multi-sigma",
      },
    }),
  },

  // ═══════════════════════════════════════════
  // ALLIANCE & TREATY OBLIGATIONS
  // ═══════════════════════════════════════════
  {
    title: "Alliance and Treaty Obligation Decision Tree",
    content: `Active military alliances and mutual defense treaties that create conditional triggers for conflict expansion. These are the hardcoded if-then rules of international security.

NATO (Article 5): Attack on one = attack on all. 31 members (32 with Sweden). Invoked once (9/11). Nuclear umbrella via US, UK, France. Article 5 is deliberately ambiguous on response type (not automatically military). Key question: Would NATO invoke Article 5 for a cyber attack? Baltic state incursion? Nuclear incident in Ukraine? Gray zone attacks test the threshold.

US-JAPAN SECURITY TREATY: US obligated to defend Japan including Senkaku/Diaoyu Islands (confirmed by every president since Obama). Article 5 covers "territories under the administration of Japan." Okinawa hosts largest US military concentration in the Pacific. Japan's Article 9 constitution being reinterpreted to allow "counterstrike capability."

US-SOUTH KOREA MDT: 28,500 US troops stationed in Korea. Nuclear umbrella. Extended deterrence consultations ongoing. If North Korea attacks, US is treaty-obligated to respond. ~$50B in annual bilateral trade at risk in conflict.

US-AUSTRALIA (ANZUS/AUKUS): ANZUS treaty since 1951. AUKUS (2021) adds nuclear submarine technology transfer (SSN-AUKUS program). US-Australia-UK trilateral for Indo-Pacific. Pine Gap signals intelligence facility is critical US asset. Five Eyes intelligence sharing framework.

US-PHILIPPINES MDT: Renewed with EDCA (Enhanced Defense Cooperation Agreement). 9 Philippine bases accessible to US forces. Critical for Taiwan contingency. South China Sea disputes (Second Thomas Shoal) could trigger MDT if China attacks Philippine forces.

ABRAHAM ACCORDS: Israel-UAE, Israel-Bahrain, Israel-Morocco normalization. Not mutual defense treaties but strategic alignment. Saudi accession was being negotiated (paused after October 7). Structural shift in Middle East alignment: Arab states + Israel vs Iran axis.

SCO (Shanghai Cooperation Organization): China, Russia, India, Pakistan, Iran, Central Asian states. Not a military alliance but a framework for security cooperation. Joint exercises. Intelligence sharing. Anti-Western alignment growing. India is the swing member.

CSTO (Collective Security Treaty Organization): Russia-led: Armenia (suspended participation 2024), Belarus, Kazakhstan, Tajikistan, Kyrgyzstan. Weakened by Russia's failure to defend Armenia against Azerbaijan. Russia's ability to project power to defend members is questionable given Ukraine commitment.

DECISION TREE FOR CONFLICT EXPANSION:
IF China attacks Taiwan -> US intervenes (Taiwan Relations Act, strategic ambiguity but functionally committed) -> Japan activates (US bases in Japan = co-belligerent) -> Australia likely joins (AUKUS) -> Philippines activates (EDCA) -> South Korea neutral unless North Korea moves -> NATO Article 5 NOT triggered (Pacific, not Atlantic)

IF Russia attacks NATO Baltic -> Article 5 invoked -> All 31 NATO members obligated -> Nuclear escalation ladder activated -> China faces choice (SCO solidarity vs economic interest in Europe)

IF Iran attacks Israel -> No formal US treaty obligation BUT massive political/strategic alignment ensures US support -> Abraham Accord states face choice -> Hezbollah/proxy activation -> Oil supply disruption guaranteed -> NATO not triggered but individual members likely support Israel`,
    category: "geopolitical",
    tags: JSON.stringify(["alliances", "treaties", "NATO", "Article-5", "mutual-defense", "decision-tree", "conflict-expansion"]),
    source: "NATO HQ, US State Department, Treaty texts, CSIS analysis",
    confidence: 0.90,
    status: "active",
    metadata: JSON.stringify({
      type: "alliance-map",
      usAlliances: ["NATO", "Japan", "South Korea", "Australia/AUKUS", "Philippines"],
      russianAlliances: ["CSTO (weakened)", "SCO (framework)"],
      chineseAlliances: ["SCO", "North Korea (1961 treaty)"],
      keyAmbiguity: "Taiwan - strategic ambiguity but functional commitment",
      decisionTrees: 3,
    }),
  },

  // ═══════════════════════════════════════════
  // DUAL-USE INFRASTRUCTURE
  // ═══════════════════════════════════════════
  {
    title: "Critical Infrastructure Vulnerability Map - Undersea Cables and Energy Networks",
    content: `Dual-use infrastructure that serves both economic and military functions. Disruption creates cascading failures across multiple domains.

UNDERSEA CABLES:
- 95% of intercontinental data travels via ~400 submarine cables. Total capacity: ~800 Tbps.
- Key chokepoints: Strait of Malacca (Asia-Europe cables), Red Sea/Suez (Europe-Asia), English Channel (transatlantic), Luzon Strait (transpacific)
- Vulnerabilities: Baltic Sea cable cuts (2023, 2024 suspected sabotage), Houthi threats to Red Sea cables, Russian submarine activity near Atlantic cables
- FLAG/FALCON/SEA-ME-WE cables carry majority of Europe-Middle East-Asia traffic
- US-Europe capacity: ~200 Tbps across ~20 cables. Losing 3-4 would create severe degradation.
- Cable repair ships: Only ~60 globally, repairs take weeks. Coordinated multi-cable attack would overwhelm repair capacity.

ENERGY INFRASTRUCTURE:
- LNG terminals: Europe's new dependency (Wilhelmshaven, Brunsbuittel in Germany; Gate in Netherlands). Single point of failure for post-Russian gas energy security.
- Pipeline junctions: Baumgarten (Austria) = central European gas hub. Cushing, Oklahoma = US oil price reference point. Any attack on Cushing would disrupt WTI pricing mechanism.
- Refineries: Concentrated in US Gulf Coast (45% US capacity), Rotterdam/Antwerp (European hub), Jamnagar India (world's largest). Hurricane/conflict damage to any cluster causes fuel shortages.
- Power grid interconnectors: Cross-border power flows in Europe depend on ~300 major interconnectors. Synchronized grid failure (like 2003 Italy blackout) cascades in seconds.

FINANCIAL INFRASTRUCTURE:
- SWIFT: 11,000+ institutions in 200+ countries. Located in Belgium. Despite alternatives (CIPS, SPFS), remains dominant. Disconnection is the financial nuclear option.
- CLS Bank: Settles $6.5T in FX transactions daily. Single point of failure for global currency markets. Located in New York.
- Fedwire: $4-5T daily in US dollar transfers. Critical for settlement finality.
- CME/ICE/Eurex: Central counterparties whose failure would halt derivatives markets ($600T+ notional outstanding).

SPACE ASSETS:
- GPS/GNSS: Global navigation depends on ~30 US GPS satellites + Galileo + GLONASS + BeiDou. Spoofing/jamming already common in conflict zones (Eastern Mediterranean, Baltic, Black Sea). Financial markets use GPS for time synchronization.
- Starlink: 5,000+ satellites now critical military communications asset (proven in Ukraine). Constellation disruption would affect military C2.
- Early warning satellites: SBIRS (US), Tundra (Russia). Attack on early warning = highest escalation risk (mistaken launch detection).`,
    category: "geopolitical",
    tags: JSON.stringify(["infrastructure", "undersea-cables", "energy", "SWIFT", "vulnerability", "dual-use", "critical-infrastructure"]),
    source: "TeleGeography, IEA, BIS, NATO CCDCOE",
    confidence: 0.88,
    status: "active",
    metadata: JSON.stringify({
      type: "infrastructure-vulnerability",
      underseaCables: { total: 400, dataShare: "95% intercontinental", repairShips: 60 },
      swift: { institutions: "11,000+", countries: "200+", location: "Belgium" },
      clsBank: { dailyVolume: "$6.5T", location: "New York" },
      gps: { satellites: "~30 US + multi-constellation", vulnerability: "Jamming/spoofing active" },
    }),
  },

  // ═══════════════════════════════════════════
  // GREY ZONE / HYBRID WARFARE
  // ═══════════════════════════════════════════
  {
    title: "Grey Zone Warfare Indicator Framework - Below-Threshold Conflict Signals",
    content: `Grey zone operations exist between peace and war. They are designed to achieve strategic objectives without triggering military response. This framework identifies observable indicators of grey zone campaigns.

CYBER DOMAIN:
- APT (Advanced Persistent Threat) group attribution: APT28/29 (Russia/GRU/SVR), APT41 (China/MSS), APT33/35 (Iran/IRGC), Lazarus Group (North Korea/RGB)
- Escalation indicators: Attacks shifting from espionage to disruption (Colonial Pipeline, SolarWinds). Targeting of critical infrastructure vs. data theft. Pre-positioning of malware in power grids (Volt Typhoon in US infrastructure, attributed to China).
- Pattern: Cyber activity increases 3-6 months before conventional escalation. It's the canary.

ECONOMIC COERCION:
- Trade weaponization: China's rare earth embargo (Japan 2010), China's barley/wine/coal sanctions (Australia 2020-2023), Russian gas cutoff (Europe 2022)
- Pattern: Economic coercion follows a playbook. First informal ("slow customs processing"), then formal tariffs, then outright embargo. Escalation takes 6-18 months.
- Counter-indicators: Target country diversifying supply chains signals expected escalation.

INFORMATION OPERATIONS:
- State media narrative shifts (TASS, Xinhua, IRIB) precede military operations by weeks-months
- Social media bot network activation spikes before kinetic action
- Historical pattern: Russia's RT/Sputnik narrative buildup before Crimea (2014) and Ukraine (2022) documented by EU DisinfoLab
- Deepfake and AI-generated content accelerating since 2023

PROXY AND PARAMILITARY:
- Wagner Group/Africa Corps (Russia): Now under GRU control. Active in Mali, Niger, Burkina Faso, Libya, Syria, CAR. Provides plausible deniability for Russian power projection.
- IRGC Quds Force (Iran): Controls Hezbollah, Iraqi PMF, Houthi, Palestinian proxies. "Axis of Resistance" network. Operates through financial, arms, and advisory channels.
- Chinese Maritime Militia: "Little Blue Men" - fishing vessels operating as paramilitary in South China Sea. Used for territorial assertion without military escalation.

TERRITORIAL SALAMI-SLICING:
- China in South China Sea: Artificial island construction, fishing bans, coast guard harassment. Each step too small for military response, cumulative effect = territorial control.
- Russia in Georgia/Ukraine: Borderization (moving border fences at night), passport distribution in Donbas/South Ossetia.
- Pattern: Small incremental changes that individually don't justify military response but collectively change facts on the ground.

DETECTION FRAMEWORK:
Score each domain (cyber, economic, information, proxy, territorial) on 1-5 scale. Sum > 15 = active grey zone campaign. Sum > 20 = likely precursor to conventional conflict. Track rate of change: acceleration in any domain = transition signal.`,
    category: "model",
    tags: JSON.stringify(["grey-zone", "hybrid-warfare", "cyber", "proxy", "information-warfare", "salami-slicing", "indicators"]),
    source: "NATO CCDCOE, CSIS, Mandiant, EU DisinfoLab",
    confidence: 0.87,
    status: "active",
    metadata: JSON.stringify({
      type: "indicator-framework",
      domains: ["Cyber", "Economic coercion", "Information ops", "Proxy/paramilitary", "Territorial"],
      campaignThreshold: 15,
      conflictPrecursorThreshold: 20,
      cyberLeadTime: "3-6 months before conventional escalation",
      keyAPTs: { russia: ["APT28", "APT29"], china: ["APT41", "Volt Typhoon"], iran: ["APT33", "APT35"], northKorea: ["Lazarus"] },
    }),
  },

  // ═══════════════════════════════════════════
  // WEAPONS PROLIFERATION NETWORKS
  // ═══════════════════════════════════════════
  {
    title: "Active Weapons Proliferation Networks and Technology Transfer Chains",
    content: `Tracking weapons and dual-use technology transfer networks is essential for predicting future capability shifts and conflict dynamics.

IRAN -> RUSSIA PIPELINE:
- Shahed-136/Geran-2 drones: Iran supplies, Russia uses in Ukraine. $20,000 per unit vs $1M+ cruise missile. Changed economics of attrition warfare.
- Ballistic missiles: Fath-360 short-range ballistic missiles confirmed transferred to Russia (2024). Escalatory because it frees Russian missile stocks for strategic targets.
- Iran gets: Su-35 fighters, S-400 air defense, satellite technology, nuclear submarine technology. This fundamentally upgrades Iran's conventional deterrent.

NORTH KOREA -> RUSSIA PIPELINE:
- Artillery ammunition: Estimated 5-10 million rounds transferred. North Korea's vast Cold War stockpiles sustaining Russia's artillery-intensive strategy.
- KN-23/Hwasong-11 ballistic missiles: Close-range ballistic missiles used in Ukraine.
- North Korea gets: Cash, food, oil (above sanctions caps), satellite/space launch technology, possibly submarine-launched missile technology.

CHINA DUAL-USE TECHNOLOGY:
- Not direct weapons transfers but critical dual-use components: machine tools, ball bearings, microelectronics, drone components, satellite imagery.
- Chinese companies supply Russia's defense industrial base through Central Asian intermediaries (Kazakhstan, Kyrgyzstan, UAE as transshipment hubs).
- Pattern: Always through intermediaries for plausible deniability. Watch trade flow anomalies (e.g., Kyrgyzstan importing 10x normal microchip volume).

AQ KHAN LEGACY NETWORKS:
- Pakistani nuclear scientist A.Q. Khan's network sold centrifuge technology to Iran, Libya, North Korea. Network disrupted in 2004 but proliferation genie is out of the bottle.
- Centrifuge designs and technical knowledge persist. Countries with latent nuclear capability (Japan, South Korea, Saudi Arabia, Turkey, Egypt, Brazil) could weaponize within 1-5 years if political decision is made.

LATENT NUCLEAR STATES (could go nuclear in <5 years):
- Japan: Plutonium stockpile (46 tonnes, enough for 6,000 warheads), advanced enrichment technology, H-IIA/H3 rockets adaptable as delivery vehicles. Political constraint only.
- South Korea: Advanced nuclear power industry, missile technology. Public support for nuclear weapons ~70%. US extended deterrence commitment is the constraint.
- Saudi Arabia: Crown Prince MBS stated Saudi will acquire nuclear weapons if Iran does. Pakistani "nuclear guarantee" widely reported but unconfirmed. CSS-2 IRBMs from China (nuclear-capable).
- Turkey: NATO nuclear sharing (B61 bombs at Incirlik), indigenous missile program, research reactors. Erdogan has publicly questioned why Turkey shouldn't have nuclear weapons.

MONITORING: Track IAEA safeguards reports, dual-use export license denials, trade flow anomalies, academic publication patterns (sudden classification of previously open nuclear research), satellite imagery of enrichment/reprocessing facilities.`,
    category: "geopolitical",
    tags: JSON.stringify(["proliferation", "weapons", "technology-transfer", "nuclear", "drones", "iran-russia", "north-korea", "dual-use"]),
    source: "SIPRI, IISS, IAEA, Conflict Armament Research, Royal United Services Institute",
    confidence: 0.87,
    status: "active",
    metadata: JSON.stringify({
      type: "proliferation-network",
      activeTransfers: {
        "iran-to-russia": ["Shahed drones", "Fath-360 missiles"],
        "nk-to-russia": ["Artillery ammo (5-10M rounds)", "KN-23 missiles"],
        "china-dual-use": ["Machine tools", "Microelectronics", "via Central Asian intermediaries"],
      },
      latentNuclearStates: ["Japan", "South Korea", "Saudi Arabia", "Turkey"],
      japanPlutonium: "46 tonnes (enough for 6,000 warheads)",
    }),
  },

  // ═══════════════════════════════════════════
  // LEADER DECISION-MAKING PROFILES
  // ═══════════════════════════════════════════
  {
    title: "Leader Decision-Making Profiles - Behavioral Pattern Analysis",
    content: `Analytical profiles of key leaders' decision-making patterns under pressure. Not personality assessments but behavioral pattern analysis based on observed actions. For intelligence analysis, predicting leader behavior is more valuable than predicting state behavior.

XI JINPING (China):
- Pattern: Strategic patience with sharp, decisive action when ready. Consolidates domestically before external moves (anti-corruption campaign preceded South China Sea assertiveness). Does not bluff, rarely makes threats he can't follow through on.
- Risk tolerance: Medium-high. Willing to accept short-term economic pain for strategic objectives (Hong Kong crackdown despite financial cost, Zero-COVID despite economic damage).
- Decision style: Centralized, small circle of trusted advisors. Potential weakness: information filtering (subordinates afraid to deliver bad news). Xi may be operating on optimistic intelligence assessments.
- Escalation pattern: Gradual, reversible steps until committed (salami-slicing), then all-in. Watch for irreversible actions as commitment signal.
- Taiwan tell: The preparation timeline is industrial (shipbuilding, amphibious capacity, grain stockpiling), not rhetorical. Watch actions, not words.

VLADIMIR PUTIN (Russia):
- Pattern: Probes for weakness, escalates when he perceives irresolution, accepts ceasefire when genuinely deterred. Repeated pattern: Georgia 2008, Crimea 2014, Syria 2015, Ukraine 2022.
- Risk tolerance: High. Has miscalculated (Ukraine 2022 full invasion based on faulty intelligence about Ukrainian resistance). Willing to accept massive casualties and economic damage.
- Decision style: Increasingly isolated and paranoid. Small inner circle of security service veterans. Historical analogies dominate thinking (obsessed with NATO expansion, color revolutions, Russian imperial legacy).
- Escalation pattern: Nuclear threats are tactical communication, not operational intent (so far). Red line is existential threat to regime, not territorial loss. Will not use nuclear weapons over Ukrainian territory but might over Crimea or Russian homeland.
- Off-ramp behavior: Putin needs to be able to claim some form of victory domestically. A deal that he can present as achieving objectives (even if reality is different) is essential for de-escalation.

BENJAMIN NETANYAHU (Israel):
- Pattern: Political survival drives all decisions. Security operations correlate with domestic political pressure (corruption trials, coalition instability). Will take military action to shift political narrative.
- Risk tolerance: High for military operations, risk-averse on strategic gambles. Prefers contained operations with clear superiority.
- Decision style: Transactional, alliance management focused. Extremely sensitive to US political dynamics. Historically avoids actions that genuinely threaten US relationship but has been pushing boundaries.
- Pattern under pressure: When cornered (coalition collapse, criminal conviction risk), increases external threat rhetoric and military operations. October 7 aftermath eliminated domestic opposition and unified coalition behind war footing.
- Constraint: IDF and intelligence community can push back (historically has). Post-October 7 intelligence failure may have reduced this constraint.

KIM JONG UN (North Korea):
- Pattern: Rational provocation cycle. Escalation (missile tests, threats) followed by negotiation demands. Provocations are calculated, not irrational. Each cycle extracts concessions or tests new capability.
- Risk tolerance: Very high tolerance for international isolation, low tolerance for regime-threatening actions. Will not start a war he cannot survive but will push as close to the edge as possible.
- Decision style: Sole decision-maker with purge of potential challengers. No institutional check on decisions.
- Tell: Missile test tempo and type signals intent. Political missiles (demonstrated capability) vs military missiles (operational deployment) distinction. ICBM tests signal US-facing messaging. Short-range signals Korea-facing operational capability.

ANALYTICAL FRAMEWORK: For any leader, assess four dimensions:
1. Risk tolerance (willingness to accept costs)
2. Information environment (quality of intelligence reaching them)
3. Domestic constraints (what they need politically)
4. Historical pattern (do they bluff or follow through?)`,
    category: "actor",
    tags: JSON.stringify(["leaders", "decision-making", "behavioral-analysis", "xi-jinping", "putin", "netanyahu", "kim-jong-un"]),
    source: "CIA World Leaders Archive, RAND, Brookings, Chatham House analysis",
    confidence: 0.80,
    status: "active",
    metadata: JSON.stringify({
      type: "leader-profiles",
      profiles: ["Xi Jinping", "Vladimir Putin", "Benjamin Netanyahu", "Kim Jong Un"],
      framework: ["Risk tolerance", "Information environment", "Domestic constraints", "Historical pattern"],
      keyInsight: "Leader behavior prediction > state behavior prediction",
    }),
  },

  // ═══════════════════════════════════════════
  // REGULATORY CALENDAR
  // ═══════════════════════════════════════════
  {
    title: "Regulatory and Policy Calendar - Market-Moving Rule Changes",
    content: `Regulatory changes alter the rules of the game. Markets that anticipate regulatory shifts capture the move. Markets that don't get caught.

US FISCAL POLICY:
- TCJA (Tax Cuts and Jobs Act) provisions sunset December 31, 2025. Corporate tax rate could rise from 21% to 28% (Biden proposal) or remain. Individual rates revert to higher pre-2017 levels. SALT deduction cap ($10,000) expires. This is a $4T+ fiscal decision.
- Debt ceiling: Recurring crisis every 1-2 years. Treasury uses "extraordinary measures" for 3-6 months. X-date creates market volatility. Pattern: Last-minute resolution with short-term extension. Risk of accidental default is low but non-zero.
- Government shutdown: Continuing resolutions expire periodically. Shutdowns have minimal direct market impact but signal governance dysfunction.

FINANCIAL REGULATION:
- Basel III Endgame: US implementation delayed, likely watered down from initial proposal. Affects bank capital requirements, trading book rules. Higher capital requirements = less market-making capacity = lower liquidity. Big banks lobbying hard against. Timeline uncertain.
- SEC climate disclosure rules: Scaled back but still significant for ESG-exposed companies. Legal challenges ongoing.
- SEC private fund regulations: Increased disclosure for hedge funds and private equity. Industry fighting in courts.
- Crypto regulation: SEC enforcement-focused approach. Spot Bitcoin ETF approved (Jan 2024). Ethereum ETF approved. Regulatory clarity still lacking for DeFi, stablecoins, other tokens.

TRADE POLICY:
- US-China tariffs: Section 301 tariffs remain in place (25% on $250B of Chinese goods). Additional tariffs on EVs (100%), semiconductors (50%), solar cells (50%), steel/aluminum (25%). Tariff review dates create binary events.
- EU Carbon Border Adjustment Mechanism (CBAM): Transitional phase 2023-2025, full implementation 2026. Tariff on carbon-intensive imports (steel, cement, aluminum, fertilizer, hydrogen, electricity). Will reshape global trade flows for industrial goods.
- US industrial policy: CHIPS Act ($52B for semiconductor manufacturing), IRA (Inflation Reduction Act, ~$400B in clean energy subsidies over 10 years). These create winners (US-based manufacturing, clean energy) and losers (competing foreign facilities).

CENTRAL BANK CALENDARS:
- Fed FOMC: 8 meetings per year (Jan, Mar, May, Jun, Jul, Sep, Nov, Dec). Dot plot released quarterly (Mar, Jun, Sep, Dec). Jackson Hole symposium (August) used for major policy signals.
- ECB: 8 meetings per year. Staff projections quarterly (Mar, Jun, Sep, Dec).
- BOJ: 8 meetings per year. Quarterly outlook report (Jan, Apr, Jul, Oct).
- PBOC: No fixed schedule but MLF operations mid-month and LPR fixing 20th of each month are key dates.

KEY DATES PATTERN: Markets move most on FOMC decision days (2pm ET), NFP release (first Friday of month, 8:30am ET), CPI release (typically mid-month, 8:30am ET), and quarterly earnings windows (2 weeks starting mid-Jan, mid-Apr, mid-Jul, mid-Oct). Position sizing should account for these binary event days.`,
    category: "market",
    tags: JSON.stringify(["regulatory", "calendar", "TCJA", "Basel-III", "tariffs", "FOMC", "policy", "fiscal"]),
    source: "Congressional Research Service, SEC, Federal Register, BIS",
    confidence: 0.88,
    status: "active",
    metadata: JSON.stringify({
      type: "regulatory-calendar",
      highImpact: [
        "TCJA sunset Dec 2025 ($4T+ decision)",
        "Basel III Endgame (delayed)",
        "EU CBAM full implementation 2026",
        "China tariff review dates",
      ],
      fomcDates: 8,
      keyDataReleases: ["FOMC 2pm ET", "NFP 1st Friday 8:30am", "CPI mid-month 8:30am"],
    }),
  },

  // ═══════════════════════════════════════════
  // FLOW OF FUNDS / CAPITAL ACCOUNT
  // ═══════════════════════════════════════════
  {
    title: "Sovereign Wealth and Institutional Capital Flow Tracking",
    content: `The largest pools of capital in the world are sovereign wealth funds and institutional investors. Their allocation shifts move markets because of sheer size. Tracking these flows provides a structural edge.

SOVEREIGN WEALTH FUNDS (by AUM):
1. Norway GPFG: $1.7T. World's largest. Equity-heavy (~70%). Publishes full holdings quarterly. Ethical exclusion list is a leading indicator of ESG trends. Mandate changes (like increasing EM allocation) move billions.
2. China CIC: $1.3T. Opaque. Invests through subsidiaries. Closely tied to state strategic objectives. Likely to increase allocation to Belt and Road countries and reduce US exposure over time.
3. Abu Dhabi ADIA: $990B. One of the most sophisticated. Multi-asset, heavy alternatives allocation. Contrarian investor (bought aggressively in 2008-2009).
4. Saudi PIF: $930B. Aggressive growth strategy under MBS. Vision 2030 domestic investments + international portfolio (Lucid, Jio, Nintendo stakes). Will be funded by Aramco secondary offerings and asset transfers.
5. Kuwait KIA: $920B. Conservative, diversified. Provided fiscal buffer during oil price crashes.
6. Singapore GIC: $770B. Long-term, multi-asset. Known for sophisticated risk management. Canary for Asian risk sentiment.
7. Singapore Temasek: $380B. More concentrated, higher risk. Active portfolio management with public portfolio reporting.

JAPAN GPIF ($1.6T):
The world's largest pension fund. Asset allocation: 25% domestic bonds, 25% foreign bonds, 25% domestic equities, 25% foreign equities. Quarterly rebalancing mechanically generates flows. When Japanese equities outperform, GPIF sells and buys underperforming assets. Currency hedging decisions on foreign bond portfolio move USD/JPY.

TRACKING METHODS:
- Norway: Full quarterly disclosure (nbim.no). Searchable by company, country, sector.
- Japan GPIF: Quarterly results publication. Asset allocation shifts announced.
- Saudi PIF: 13F filings for US holdings. International holdings via news/disclosures.
- Sovereign CDS: Widening sovereign CDS can signal SWF forced selling (need to repatriate for fiscal support).
- TIC Data (US Treasury International Capital): Monthly report of foreign official and private capital flows in/out of US. Japanese and Chinese holdings of Treasuries. Released with 2-month lag.
- Custodial holdings at Federal Reserve: Foreign official institutions' US Treasury and agency holdings. Weekly data, more timely than TIC.

CAPITAL FLOW SIGNALS:
- Chinese reserves declining = PBOC selling UST to support yuan = US yield pressure
- Japanese lifers unhedging = selling USD/JPY = yen strength
- Oil price crash = Gulf SWFs may sell equities for fiscal needs (2014-2016 pattern)
- Norwegian GPFG equity allocation approaching upper limit = forced selling into rallies
- EM central bank reserve accumulation = USD buying = dollar strength support`,
    category: "market",
    tags: JSON.stringify(["sovereign-wealth", "capital-flows", "GPIF", "SWF", "TIC", "institutional", "flow-tracking"]),
    source: "SWFI, NBIM, GPIF, US Treasury TIC Data",
    confidence: 0.88,
    status: "active",
    metadata: JSON.stringify({
      type: "capital-flow-tracking",
      totalSWFAssets: "$10T+",
      topFunds: {
        "Norway GPFG": "$1.7T",
        "China CIC": "$1.3T",
        "Japan GPIF": "$1.6T",
        "Abu Dhabi ADIA": "$990B",
        "Saudi PIF": "$930B",
      },
      trackingMethods: ["13F filings", "TIC data", "NBIM quarterly", "Fed custodial", "Sovereign CDS"],
    }),
  },

  // ═══════════════════════════════════════════
  // ALTERNATIVE DATA SIGNALS
  // ═══════════════════════════════════════════
  {
    title: "Alternative Data Signal Catalog - Non-Traditional Intelligence Sources",
    content: `Alternative data sources that hedge funds pay $50K-$5M annually to access. Many have free or low-cost proxies that provide 60-80% of the signal value.

SATELLITE/GEOSPATIAL:
- Oil storage tank shadows: Floating roof tanks cast shadows proportional to fill level. Orbital Insight, Kayrros track global crude inventories weekly. Free proxy: DOE/EIA weekly inventory report (US only, Wednesday 10:30am ET).
- Parking lot fill rates: Retail sales predictor (Walmart, Target store traffic). RS Metrics tracks. Free proxy: credit card transaction data from bank earnings.
- Nighttime light intensity: Economic activity proxy, especially useful for countries with unreliable GDP data (China, India, Nigeria). VIIRS satellite data freely available with processing.
- Shipping/port congestion: AIS (Automatic Identification System) data tracks every vessel. MarineTraffic, VessleTracker provide free basic tracking. Container ship waiting times at major ports = supply chain stress indicator.
- Agricultural crop health: NDVI (Normalized Difference Vegetation Index) from Landsat/Sentinel satellites. Free data, predicts crop yields before USDA reports.

DIGITAL EXHAUST:
- Job postings: Indeed, LinkedIn, Glassdoor hiring trends. Company-level hiring/firing 1-2 quarters ahead of earnings. Layoffs.fyi tracks tech layoffs in real-time.
- App downloads/usage: Sensor Tower, App Annie. Usage data for consumer apps predicts revenue (Netflix, Uber, DoorDash).
- Web traffic: SimilarWeb, SEMrush. E-commerce traffic predicts retail earnings. Competitor traffic share shows market share shifts.
- Social media sentiment: Twitter/X firehose, Reddit (WSB), StockTwits. Retail sentiment is a contrarian indicator at extremes. Unusual volume precedes events.

ECONOMIC ACTIVITY PROXIES:
- Electricity consumption: Real-time industrial activity proxy. Grid operator data is public in many jurisdictions (ERCOT, PJM in US, Entsoe in Europe).
- Freight/trucking: Cass Freight Index, ATA Trucking Tonnage. Leading indicators for industrial production. DAT spot rates for real-time trucking demand.
- Railroad traffic: AAR weekly carloading data. Intermodal volumes, grain, coal, chemicals. Free weekly report.
- TSA checkpoint data: Air travel demand in real-time. Daily data published by TSA. Predicts airline earnings and consumer confidence.
- Restaurant bookings: OpenTable data (seated diners vs 2019 baseline). Published free, leads consumer spending data.
- Hotel occupancy: STR weekly data. Tourism/business travel leading indicator.

GOVERNMENT/INSTITUTIONAL:
- Patent filings: Technology direction indicator. Sudden spike in battery chemistry patents = EV breakthrough approaching. Freely searchable via USPTO, EPO.
- FDA calendar: Drug approval dates (PDUFA dates) are binary events for biotech. ClinicalTrials.gov tracks pipeline.
- FCC filings: Device certifications reveal unreleased hardware. New iPhone FCC filing = imminent launch.
- Building permits: Leading indicator for construction activity (6-12 month lead). Census Bureau monthly data.

COST-EFFECTIVE IMPLEMENTATION: You don't need to buy expensive alternative data to get an edge. The free proxies (EIA inventories, TSA data, AAR carloadings, OpenTable, job postings, AIS shipping, NDVI satellite) provide most of the signal. The expensive data provides marginal improvement and speed advantage.`,
    category: "model",
    tags: JSON.stringify(["alternative-data", "satellite", "geospatial", "digital-exhaust", "proxy-indicators", "non-traditional"]),
    source: "Various alternative data providers, academic research on alternative data alpha",
    confidence: 0.85,
    status: "active",
    metadata: JSON.stringify({
      type: "data-source-catalog",
      categories: ["Satellite/Geospatial", "Digital Exhaust", "Economic Proxies", "Government/Institutional"],
      freeProxies: [
        "EIA weekly inventories",
        "TSA checkpoint data",
        "AAR carloadings",
        "OpenTable seated diners",
        "NDVI satellite imagery",
        "AIS vessel tracking",
        "Job posting aggregators",
        "Building permits (Census)",
      ],
      costRange: "$0 (free proxies) to $5M/year (premium satellite/transaction data)",
    }),
  },
];

/**
 * Ingest all advanced knowledge entries into the database.
 */
export async function ingestAdvancedKnowledge(): Promise<{
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

export const ADVANCED_ENTRY_COUNT = entries.length;
