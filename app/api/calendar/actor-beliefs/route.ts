import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import {
  getCalendarActorInsights,
  ACTOR_PROFILES,
  CALENDAR_BEHAVIOR_MODIFIERS,
} from "@/lib/signals/actor-beliefs";

/**
 * GET /api/calendar/actor-beliefs?date=2025-06-15
 *
 * Returns actor-belief Bayesian updates for a given date.
 * Maps calendar events on that date to actor behavioral modifiers.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dateParam = request.nextUrl.searchParams.get("date");
  if (!dateParam) {
    return NextResponse.json({ error: "date parameter required" }, { status: 400 });
  }

  try {
    const targetDate = new Date(dateParam + "T12:00:00");

    // Resolve hebrew and islamic event keys from the calendar events on this date
    // We need to map from holiday names to the event keys used by actor-beliefs
    const hebrewEventKeys = resolveHebrewEventKeys(dateParam);
    const islamicEventKeys = resolveIslamicEventKeys(dateParam);

    const insights = getCalendarActorInsights(
      hebrewEventKeys,
      islamicEventKeys,
      targetDate
    );

    return NextResponse.json({
      date: dateParam,
      insights,
      actorCount: ACTOR_PROFILES.length,
      modifierCount: CALENDAR_BEHAVIOR_MODIFIERS.length,
    });
  } catch (error) {
    console.error("Actor beliefs API error:", error);
    return NextResponse.json({ date: dateParam, insights: [], actorCount: 0, modifierCount: 0 });
  }
}

/**
 * Map calendar holiday names to actor-belief event keys for Hebrew calendar.
 * The actor-beliefs module uses canonical keys like "tisha_bav", "purim", etc.
 */
function resolveHebrewEventKeys(dateStr: string): string[] {
  // We use the hebcal library to find what Hebrew holidays fall on this date
  // For simplicity, we resolve based on known date patterns
  try {
    const { HDate } = require("@hebcal/core");
    const date = new Date(dateStr + "T12:00:00");
    const hd = new HDate(date);
    const holidays = hd.holidays();

    const keyMap: Record<string, string> = {
      "Tish'a B'Av": "tisha_bav",
      "Erev Tish'a B'Av": "tisha_bav",
      "Purim": "purim",
      "Shushan Purim": "purim",
      "Yom Kippur": "yom_kippur",
      "Erev Yom Kippur": "yom_kippur",
      "Rosh Hashana": "rosh_hashana",
      "Rosh Hashana I": "rosh_hashana",
      "Rosh Hashana II": "rosh_hashana",
      "Pesach": "pesach",
      "Pesach I": "pesach",
      "Pesach VII": "pesach",
      "Shavuot": "shavuot",
      "Shavuot I": "shavuot",
      "Sukkot": "sukkot",
      "Sukkot I": "sukkot",
      "Simchat Torah": "simchat_torah",
      "Chanukah": "chanukah",
      "Chanukah: 1 Candle": "chanukah",
    };

    const keys: string[] = [];
    for (const h of holidays) {
      const desc = h.getDesc("en");
      for (const [pattern, key] of Object.entries(keyMap)) {
        if (desc.includes(pattern) && !keys.includes(key)) {
          keys.push(key);
        }
      }
    }
    return keys;
  } catch {
    return [];
  }
}

/**
 * Map Islamic calendar context to actor-belief event keys.
 */
function resolveIslamicEventKeys(dateStr: string): string[] {
  // Use the islamic-calendar module's date info
  try {
    const { getHijriDateInfo } = require("@/lib/signals/islamic-calendar");
    const date = new Date(dateStr + "T12:00:00");
    const info = getHijriDateInfo(date);

    const keys: string[] = [];

    if (info.isRamadan) keys.push("ramadan");
    if (info.isSacredMonth) keys.push("sacred_month");

    // Check for specific Islamic events
    // Ashura: 10th of Muharram
    if (info.hijriMonth === 1 && info.hijriDay >= 9 && info.hijriDay <= 11) {
      keys.push("ashura");
    }

    // Al-Quds Day: last Friday of Ramadan
    if (info.isRamadan) {
      const d = new Date(dateStr + "T12:00:00");
      if (d.getDay() === 5) { // Friday
        // Check if next Friday would still be Ramadan
        const nextFriday = new Date(d);
        nextFriday.setDate(nextFriday.getDate() + 7);
        const nextInfo = getHijriDateInfo(nextFriday);
        if (!nextInfo.isRamadan) {
          keys.push("quds_day");
        }
      }
    }

    // Hajj: 8-12 Dhul Hijjah
    if (info.hijriMonth === 12 && info.hijriDay >= 8 && info.hijriDay <= 12) {
      keys.push("hajj");
    }

    return keys;
  } catch {
    return [];
  }
}
