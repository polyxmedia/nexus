// ── Economic Calendar Engine ──
// Major recurring economic events: FOMC, NFP, CPI, GDP, earnings seasons

export interface EconomicEvent {
  date: string;
  holiday: string;
  type: string; // fomc | nfp | cpi | gdp | earnings | pmi | jobless | retail | housing | consumer
  significance: number; // 1-3
  description: string;
  marketRelevance: string;
  calendarSystem: "economic";
}

// Known FOMC meeting dates for 2025-2027
const FOMC_DATES: Record<number, string[]> = {
  2025: [
    "2025-01-29", "2025-03-19", "2025-05-07", "2025-06-18",
    "2025-07-30", "2025-09-17", "2025-11-05", "2025-12-17",
  ],
  2026: [
    "2026-01-28", "2026-03-18", "2026-04-29", "2026-06-17",
    "2026-07-29", "2026-09-16", "2026-11-04", "2026-12-16",
  ],
  2027: [
    "2027-01-27", "2027-03-17", "2027-04-28", "2027-06-16",
    "2027-07-28", "2027-09-15", "2027-10-27", "2027-12-15",
  ],
};

// Earnings season windows (approximate)
function getEarningsSeasonDates(year: number): EconomicEvent[] {
  return [
    {
      date: `${year}-01-13`,
      holiday: "Q4 Earnings Season Begins",
      type: "earnings",
      significance: 3,
      description: "Major banks kick off Q4 earnings season. JPM, WFC, C typically report first week.",
      marketRelevance: "Sector rotation driven by bank results. Forward guidance sets tone for entire quarter.",
      calendarSystem: "economic",
    },
    {
      date: `${year}-01-27`,
      holiday: "Q4 Mega-Cap Earnings Week",
      type: "earnings",
      significance: 3,
      description: "AAPL, MSFT, GOOG, AMZN, META typically report late January. Peak earnings volatility.",
      marketRelevance: "These 5 stocks represent ~25% of S&P 500. Results drive index-level moves and set tech sector narrative.",
      calendarSystem: "economic",
    },
    {
      date: `${year}-04-14`,
      holiday: "Q1 Earnings Season Begins",
      type: "earnings",
      significance: 3,
      description: "Q1 bank earnings kick off. Revenue seasonality patterns begin.",
      marketRelevance: "First full-quarter read on economy. Consumer credit data from bank results is leading indicator.",
      calendarSystem: "economic",
    },
    {
      date: `${year}-04-28`,
      holiday: "Q1 Mega-Cap Earnings Week",
      type: "earnings",
      significance: 3,
      description: "Big tech Q1 reports. AI capex guidance and cloud growth dominate narrative.",
      marketRelevance: "Tech earnings plus guidance shape equity risk premium for months. Options market prices largest moves here.",
      calendarSystem: "economic",
    },
    {
      date: `${year}-07-14`,
      holiday: "Q2 Earnings Season Begins",
      type: "earnings",
      significance: 3,
      description: "Mid-year bank earnings. Full first-half view of credit quality and loan demand.",
      marketRelevance: "Summer earnings set H2 positioning. Consumer health data from retail/banks critical.",
      calendarSystem: "economic",
    },
    {
      date: `${year}-07-28`,
      holiday: "Q2 Mega-Cap Earnings Week",
      type: "earnings",
      significance: 3,
      description: "Big tech Q2 reports. Ad revenue (META, GOOG) and cloud spend (AMZN, MSFT) are key.",
      marketRelevance: "Determines summer rally vs sell-off. Guidance revisions drive sector rotation.",
      calendarSystem: "economic",
    },
    {
      date: `${year}-10-13`,
      holiday: "Q3 Earnings Season Begins",
      type: "earnings",
      significance: 3,
      description: "Q3 bank earnings. Pre-holiday season guidance critical for retail sector.",
      marketRelevance: "October earnings drive year-end positioning. Credit quality signals recession risk.",
      calendarSystem: "economic",
    },
    {
      date: `${year}-10-27`,
      holiday: "Q3 Mega-Cap Earnings Week",
      type: "earnings",
      significance: 3,
      description: "Big tech Q3 reports. Holiday season outlook and AI investment trajectory.",
      marketRelevance: "Sets narrative for year-end rally or sell-off. Options expiry creates amplified moves.",
      calendarSystem: "economic",
    },
  ];
}

// NFP (Non-Farm Payrolls) - first Friday of each month
function getNFPDates(year: number): EconomicEvent[] {
  const events: EconomicEvent[] = [];
  for (let month = 0; month < 12; month++) {
    // Find first Friday
    const d = new Date(year, month, 1);
    while (d.getDay() !== 5) d.setDate(d.getDate() + 1);
    const dateStr = d.toISOString().split("T");
    events.push({
      date: dateStr,
      holiday: `NFP Report (${d.toLocaleDateString("en-US", { month: "short" })})`,
      type: "nfp",
      significance: 3,
      description: "Non-Farm Payrolls. Most market-moving US economic release. Published 8:30am ET.",
      marketRelevance: "Drives Fed rate expectations, bond yields, USD. Equities react to 'goldilocks' vs too-hot/cold readings. VIX typically elevated day before.",
      calendarSystem: "economic",
    });
  }
  return events;
}

// CPI releases - typically 2nd or 3rd week of month
function getCPIDates(year: number): EconomicEvent[] {
  const events: EconomicEvent[] = [];
  // CPI is released around 10th-14th of each month for prior month's data
  for (let month = 0; month < 12; month++) {
    // Approximate: 2nd Tuesday-Thursday of month
    const d = new Date(year, month, 10);
    // Find next Wednesday near the 10th
    while (d.getDay() !== 3) d.setDate(d.getDate() + 1);
    if (d.getDate() > 16) d.setDate(d.getDate() - 7);
    const dateStr = d.toISOString().split("T");
    events.push({
      date: dateStr,
      holiday: `CPI Report (${d.toLocaleDateString("en-US", { month: "short" })})`,
      type: "cpi",
      significance: 3,
      description: "Consumer Price Index. Key inflation gauge driving Fed policy decisions.",
      marketRelevance: "Core CPI (ex food/energy) is the number. Hot CPI = rate hike fears, bond sell-off. Cool CPI = risk-on rally. 0.1% surprise moves markets 1-2%.",
      calendarSystem: "economic",
    });
  }
  return events;
}

// GDP releases - quarterly
function getGDPDates(year: number): EconomicEvent[] {
  return [
    {
      date: `${year}-01-30`,
      holiday: "Q4 GDP (Advance)",
      type: "gdp",
      significance: 2,
      description: "First estimate of Q4 GDP growth. Sets economic narrative for the year.",
      marketRelevance: "Advance estimate has largest market impact. Deviation from consensus drives bond/equity repricing.",
      calendarSystem: "economic",
    },
    {
      date: `${year}-04-30`,
      holiday: "Q1 GDP (Advance)",
      type: "gdp",
      significance: 2,
      description: "First estimate of Q1 GDP. Spring seasonal adjustments can distort data.",
      marketRelevance: "Q1 GDP historically weakest (residual seasonality). Markets discount weak readings but react to negative prints.",
      calendarSystem: "economic",
    },
    {
      date: `${year}-07-30`,
      holiday: "Q2 GDP (Advance)",
      type: "gdp",
      significance: 2,
      description: "Mid-year GDP assessment. Two consecutive negative quarters = technical recession.",
      marketRelevance: "Critical for recession/expansion narrative. Drives H2 investment strategy and Fed path.",
      calendarSystem: "economic",
    },
    {
      date: `${year}-10-30`,
      holiday: "Q3 GDP (Advance)",
      type: "gdp",
      significance: 2,
      description: "Q3 GDP provides pre-holiday economic health check.",
      marketRelevance: "Sets tone for year-end rally vs defensive positioning. Consumer spending component most watched.",
      calendarSystem: "economic",
    },
  ];
}

// Options expiry (OPEX) - 3rd Friday of each month
// Triple witching months (Mar, Jun, Sep, Dec) get upgraded
const WITCHING_MONTHS = new Set([2, 5, 8, 11]); // 0-indexed

function getOPEXDates(year: number): EconomicEvent[] {
  const events: EconomicEvent[] = [];
  for (let month = 0; month < 12; month++) {
    // Find 3rd Friday: first Friday + 14 days
    const d = new Date(year, month, 1);
    while (d.getDay() !== 5) d.setDate(d.getDate() + 1);
    d.setDate(d.getDate() + 14); // 3rd Friday
    const dateStr = d.toISOString().split("T");

    if (WITCHING_MONTHS.has(month)) {
      events.push({
        date: dateStr,
        holiday: `Triple Witching (${d.toLocaleDateString("en-US", { month: "short" })})`,
        type: "witching",
        significance: 3,
        description: "Quarterly expiry of stock options, index options, and index futures simultaneously. ~$3-4T notional expiry.",
        marketRelevance: "Massive volume spike (2-3x normal). Gamma exposure unwinds cause violent intraday swings. Pin risk on major strikes. Rebalancing flows dominate final hour.",
        calendarSystem: "economic",
      });
    } else {
      events.push({
        date: dateStr,
        holiday: `Monthly OPEX (${d.toLocaleDateString("en-US", { month: "short" })})`,
        type: "opex",
        significance: 2,
        description: "Monthly equity options expiration. Open interest unwinds and gamma exposure shifts.",
        marketRelevance: "Increased volume and volatility around max pain levels. Dealer hedging flows can pin prices to high OI strikes. Watch for post-OPEX directional moves.",
        calendarSystem: "economic",
      });
    }
  }
  return events;
}

// VIX expiry - 3rd Wednesday of each month (30 days before next month's 3rd Friday)
function getVIXExpiryDates(year: number): EconomicEvent[] {
  const events: EconomicEvent[] = [];
  for (let month = 0; month < 12; month++) {
    // Find 3rd Wednesday
    const d = new Date(year, month, 1);
    while (d.getDay() !== 3) d.setDate(d.getDate() + 1);
    d.setDate(d.getDate() + 14); // 3rd Wednesday
    const dateStr = d.toISOString().split("T");
    events.push({
      date: dateStr,
      holiday: `VIX Expiry (${d.toLocaleDateString("en-US", { month: "short" })})`,
      type: "vix_expiry",
      significance: 2,
      description: "VIX futures and options settlement. Based on Special Opening Quotation (SOQ) of VIX.",
      marketRelevance: "VIX settlement can diverge from spot VIX. Volatility term structure shifts as front-month rolls. Watch for VIX crush or spike around settlement.",
      calendarSystem: "economic",
    });
  }
  return events;
}

export function getEconomicCalendarEvents(year: number): EconomicEvent[] {
  const events: EconomicEvent[] = [];

  // FOMC
  const fomcDates = FOMC_DATES[year] || [];
  for (const date of fomcDates) {
    events.push({
      date,
      holiday: "FOMC Decision",
      type: "fomc",
      significance: 3,
      description: "Federal Reserve interest rate decision and policy statement. Press conference follows.",
      marketRelevance: "THE most important recurring market event. Rate decisions, dot plot, forward guidance move all asset classes. VIX typically spikes pre-FOMC.",
      calendarSystem: "economic",
    });
  }

  events.push(...getEarningsSeasonDates(year));
  events.push(...getNFPDates(year));
  events.push(...getCPIDates(year));
  events.push(...getGDPDates(year));
  events.push(...getOPEXDates(year));
  events.push(...getVIXExpiryDates(year));

  return events.sort((a, b) => a.date.localeCompare(b.date));
}
