export interface GeopoliticalEvent {
  date: string;
  endDate?: string;
  type: string;
  title: string;
  description: string;
  significance: number;
  region: string;
  sectors: string[];
}

export function getGeopoliticalEvents(year: number): GeopoliticalEvent[] {
  const events: GeopoliticalEvent[] = [];

  // Recurring annual patterns
  events.push(
    // OPEC meetings (typically June and November/December)
    {
      date: `${year}-06-01`,
      type: "opec_meeting",
      title: "OPEC+ Ministerial Meeting (June)",
      description: "Semi-annual OPEC+ production decision. Oil price volatility window.",
      significance: 2,
      region: "Middle East",
      sectors: ["energy", "commodities"],
    },
    {
      date: `${year}-12-01`,
      type: "opec_meeting",
      title: "OPEC+ Ministerial Meeting (December)",
      description: "Year-end OPEC+ production decision. Q1 supply outlook.",
      significance: 2,
      region: "Middle East",
      sectors: ["energy", "commodities"],
    },

    // UN General Assembly (mid-September)
    {
      date: `${year}-09-15`,
      endDate: `${year}-09-30`,
      type: "unga",
      title: "UN General Assembly",
      description: "Annual diplomatic gathering. Geopolitical tension announcements, treaty developments.",
      significance: 2,
      region: "Global",
      sectors: ["defense", "diplomacy"],
    },

    // Davos / WEF (January)
    {
      date: `${year}-01-20`,
      endDate: `${year}-01-24`,
      type: "wef",
      title: "World Economic Forum (Davos)",
      description: "Global elite convergence. Policy signal window for the year ahead.",
      significance: 1,
      region: "Global",
      sectors: ["finance", "technology", "energy"],
    },

    // G7/G20 summits (varies, typically June and November)
    {
      date: `${year}-06-15`,
      endDate: `${year}-06-17`,
      type: "g7_summit",
      title: "G7 Summit",
      description: "Major economies coordination. Sanctions, trade policy, currency signals.",
      significance: 2,
      region: "Global",
      sectors: ["finance", "trade", "currency"],
    },
    {
      date: `${year}-11-15`,
      endDate: `${year}-11-17`,
      type: "g20_summit",
      title: "G20 Summit",
      description: "Broader economic coordination including emerging markets.",
      significance: 2,
      region: "Global",
      sectors: ["finance", "trade", "emerging_markets"],
    },

    // Historical conflict anniversary patterns
    {
      date: `${year}-10-07`,
      type: "conflict_anniversary",
      title: "October 7 Anniversary",
      description: "Anniversary of 2023 Hamas attack. Heightened regional tension window.",
      significance: 3,
      region: "Middle East",
      sectors: ["defense", "energy", "shipping"],
    },
    {
      date: `${year}-02-24`,
      type: "conflict_anniversary",
      title: "Russia-Ukraine Invasion Anniversary",
      description: "Anniversary of 2022 invasion. Escalation risk assessment window.",
      significance: 2,
      region: "Eastern Europe",
      sectors: ["defense", "energy", "agriculture", "commodities"],
    },

    // Taiwan Strait tensions (April - typical exercise window)
    {
      date: `${year}-04-01`,
      endDate: `${year}-04-15`,
      type: "tension_window",
      title: "Taiwan Strait Tension Window",
      description: "Historical period for PLA exercises and cross-strait tensions.",
      significance: 2,
      region: "East Asia",
      sectors: ["semiconductors", "defense", "shipping"],
    },

    // Iran nuclear program milestones (ongoing)
    {
      date: `${year}-03-20`,
      type: "geopolitical_cycle",
      title: "Nowruz / Iran Assessment Window",
      description: "Persian New Year. Annual reassessment of Iranian nuclear timeline and sanctions.",
      significance: 2,
      region: "Middle East",
      sectors: ["energy", "defense"],
    },

    // US political calendar
    {
      date: `${year}-01-20`,
      type: "political_cycle",
      title: "US Political Cycle Assessment",
      description: "Mid-term year dynamics. Policy uncertainty and legislative gridlock patterns.",
      significance: 1,
      region: "North America",
      sectors: ["finance", "healthcare", "technology"],
    },

    // Oil embargo anniversary (October)
    {
      date: `${year}-10-17`,
      type: "historical_pattern",
      title: "1973 Oil Embargo Anniversary",
      description: "Historical pattern marker. Energy supply disruption awareness window.",
      significance: 1,
      region: "Middle East",
      sectors: ["energy"],
    },

    // North Korea provocation window (spring/fall)
    {
      date: `${year}-04-15`,
      type: "provocation_window",
      title: "Day of the Sun (DPRK)",
      description: "Kim Il-sung birthday. Historical missile/nuclear test provocation window.",
      significance: 2,
      region: "East Asia",
      sectors: ["defense", "semiconductors"],
    },

    // South China Sea tension escalation (summer)
    {
      date: `${year}-07-12`,
      type: "territorial_dispute",
      title: "South China Sea Ruling Anniversary",
      description: "Anniversary of 2016 Hague ruling. Maritime tension and shipping risk window.",
      significance: 1,
      region: "East Asia",
      sectors: ["shipping", "defense", "trade"],
    }
  );

  // Year-specific events for 2026
  if (year === 2026) {
    events.push(
      {
        date: "2026-11-03",
        type: "election",
        title: "US Midterm Elections",
        description: "US midterm elections. Policy uncertainty peak, historical volatility pattern.",
        significance: 3,
        region: "North America",
        sectors: ["finance", "healthcare", "defense", "technology", "energy"],
      },
      {
        date: "2026-05-01",
        endDate: "2026-10-31",
        type: "expo",
        title: "Expo 2025 Osaka (Extended)",
        description: "World Expo in Osaka. Japanese economic stimulus and infrastructure spending.",
        significance: 1,
        region: "East Asia",
        sectors: ["construction", "technology", "tourism"],
      }
    );
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}
