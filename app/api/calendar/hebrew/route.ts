import { NextResponse } from "next/server";
import { getHebrewCalendarEvents, getShmitaInfo } from "@/lib/signals/hebrew-calendar";
import { getIslamicCalendarEvents, getHijriDateInfo } from "@/lib/signals/islamic-calendar";
import { getEconomicCalendarEvents } from "@/lib/signals/economic-calendar";
import { getCyclicalReading } from "@/lib/signals/structural-cycles";
import { HDate } from "@hebcal/core";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const now = new Date();
    const year = now.getFullYear();
    const hdate = new HDate(now);
    const hijri = getHijriDateInfo(now);
    const esoteric = getCyclicalReading(now);

    const hebrewEvents = [
      ...getHebrewCalendarEvents(year),
      ...getHebrewCalendarEvents(year + 1),
    ];

    const islamicEvents = [
      ...getIslamicCalendarEvents(year),
      ...getIslamicCalendarEvents(year + 1),
    ];

    const economicEvents = [
      ...getEconomicCalendarEvents(year),
      ...getEconomicCalendarEvents(year + 1),
    ];

    // Merge and deduplicate all calendar events
    const allEvents = [
      ...hebrewEvents.map(e => ({ ...e, calendarSystem: "hebrew" as const })),
      ...islamicEvents.map(e => ({
        date: e.date,
        hebrewDate: e.hijriDate,
        holiday: e.holiday,
        type: e.type,
        significance: e.significance,
        description: e.description,
        marketRelevance: e.marketRelevance,
        calendarSystem: "islamic" as const,
      })),
      ...economicEvents.map(e => ({
        date: e.date,
        hebrewDate: "",
        holiday: e.holiday,
        type: e.type,
        significance: e.significance,
        description: e.description,
        marketRelevance: e.marketRelevance,
        calendarSystem: "economic" as const,
      })),
    ];

    const seen = new Set<string>();
    const unique = allEvents.filter((e) => {
      const key = `${e.date}:${e.holiday}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const shmita = getShmitaInfo(year);

    return NextResponse.json({
      today: {
        gregorian: now.toISOString().split("T"),
        hebrew: hdate.toString(),
        hebrewYear: hdate.getFullYear(),
        hijri: hijri.hijriDate,
        hijriYear: hijri.hijriYear,
        isRamadan: hijri.isRamadan,
        isSacredMonth: hijri.isSacredMonth,
        hijriMonthName: hijri.monthName,
      },
      shmita,
      esoteric: {
        sexagenaryCycle: esoteric.sexagenaryCycle.label,
        animal: esoteric.sexagenaryCycle.animal,
        element: esoteric.sexagenaryCycle.element,
        flyingStar: esoteric.flyingStars.centerStar,
        flyingStarName: esoteric.flyingStars.starInfo.name,
        lunarPhase: esoteric.lunarPhase.phase,
        lunarBias: esoteric.lunarPhase.marketBias,
        universalYear: esoteric.universalYear.number,
        kondratieffSeason: esoteric.kondratieff.season,
        compositeScore: esoteric.compositeScore,
      },
      events: unique,
    });
  } catch (error) {
    console.error("Calendar API error:", error);
    return NextResponse.json({ today: null, shmita: null, esoteric: null, events: [] });
  }
}
