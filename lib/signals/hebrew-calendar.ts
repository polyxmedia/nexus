import { HebrewCalendar, HDate, Event as HebcalEvent } from "@hebcal/core";

export interface HebrewCalendarSignal {
  date: string;
  hebrewDate: string;
  holiday: string;
  type: string;
  description: string;
  significance: number; // 1-3 contribution to intensity
  marketRelevance: string;
}

const HIGH_SIGNIFICANCE_HOLIDAYS: Record<string, { significance: number; marketRelevance: string }> = {
  "Tish'a B'Av": {
    significance: 3,
    marketRelevance: "Historical day of catastrophe - destruction of both Temples, expulsions. Correlates with geopolitical escalation windows.",
  },
  "Yom Kippur": {
    significance: 3,
    marketRelevance: "Day of Atonement. 1973 Yom Kippur War precedent. Israeli markets closed, defense sector sensitivity.",
  },
  "Pesach": {
    significance: 2,
    marketRelevance: "Passover - liberation narrative. Spring geopolitical realignment window. Agricultural commodity shifts.",
  },
  "Purim": {
    significance: 2,
    marketRelevance: "Reversal of fortune narrative. Iranian geopolitical sensitivity (Persia connection).",
  },
  "Rosh Hashana": {
    significance: 2,
    marketRelevance: "Jewish New Year. September seasonality effects, institutional repositioning.",
  },
  "Sukkot": {
    significance: 1,
    marketRelevance: "Festival of Tabernacles. Harvest season, agricultural commodity relevance.",
  },
  "Shavuot": {
    significance: 1,
    marketRelevance: "Festival of Weeks. Late spring positioning window.",
  },
  "Chanukah": {
    significance: 1,
    marketRelevance: "Festival of Lights. Winter energy markets, retail season.",
  },
  "Rosh Chodesh": {
    significance: 1,
    marketRelevance: "New month. Cyclical reset point in Hebrew calendar.",
  },
};

export function getHebrewCalendarEvents(year: number): HebrewCalendarSignal[] {
  const events: HebrewCalendarSignal[] = [];

  const options = {
    year,
    isHebrewYear: false,
    candlelighting: false,
    sedrot: false,
    omer: false,
    noMinorFast: false,
    noModern: true,
    noRoshChodesh: false,
    noSpecialShabbat: true,
  };

  const hebcalEvents = HebrewCalendar.calendar(options);

  for (const ev of hebcalEvents) {
    const desc = ev.getDesc();
    const gregDate = ev.getDate().greg();
    const hdate = ev.getDate();

    // Find matching significance
    let matched = false;
    for (const [holiday, info] of Object.entries(HIGH_SIGNIFICANCE_HOLIDAYS)) {
      if (desc.includes(holiday) || desc === holiday) {
        events.push({
          date: gregDate.toISOString().split("T")[0],
          hebrewDate: hdate.toString(),
          holiday: desc,
          type: holiday.toLowerCase().replace(/[' ]/g, "_"),
          description: `${desc} - ${info.marketRelevance}`,
          significance: info.significance,
          marketRelevance: info.marketRelevance,
        });
        matched = true;
        break;
      }
    }

    // Include other major holidays with base significance
    if (!matched && ev.getFlags() & 0x1) {
      // CHAG flag
      events.push({
        date: gregDate.toISOString().split("T"),
        hebrewDate: hdate.toString(),
        holiday: desc,
        type: "hebrew_holiday",
        description: desc,
        significance: 1,
        marketRelevance: "Hebrew calendar observance",
      });
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

export function isShmitaYear(hebrewYear: number): boolean {
  return hebrewYear % 7 === 0;
}

export function getShmitaInfo(gregorianYear: number): {
  isShmita: boolean;
  hebrewYear: number;
  significance: string;
} {
  const hdate = new HDate(new Date(gregorianYear, 6, 1)); // mid-year
  const hebrewYear = hdate.getFullYear();
  const shmita = isShmitaYear(hebrewYear);

  return {
    isShmita: shmita,
    hebrewYear,
    significance: shmita
      ? "Shmita (Sabbatical) year - historical correlation with market corrections (2001, 2008, 2015)"
      : `Year ${hebrewYear % 7} of 7-year Shmita cycle`,
  };
}
