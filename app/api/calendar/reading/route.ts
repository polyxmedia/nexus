export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { HDate, HebrewCalendar } from "@hebcal/core";
import { db, schema } from "@/lib/db";
import { getCyclicalReading } from "@/lib/signals/structural-cycles";
import { getHijriDateInfo } from "@/lib/signals/islamic-calendar";
import { getModel } from "@/lib/ai/model";
import { requireTier } from "@/lib/auth/require-tier";
import { creditGate } from "@/lib/credits/gate";
import { validateOrigin } from "@/lib/security/csrf";
import { getSettingValue } from "@/lib/settings/get-setting";

export async function POST(request: NextRequest) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;
  const gate = await creditGate();
  if (gate.response) return gate.response;
  try {
    const { date } = await request.json();
    if (!date) {
      return NextResponse.json({ error: "date required" }, { status: 400 });
    }

    const apiKey = await getSettingValue("anthropic_api_key", process.env.ANTHROPIC_API_KEY);
    if (!apiKey) {
      return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 400 });
    }

    // Build context about this date
    const d = new Date(date + "T12:00:00Z");
    const hdate = new HDate(d);
    const hebrewDateStr = hdate.toString();
    const hebrewYear = hdate.getFullYear();
    const dayOfWeek = d.toLocaleDateString("en-US", { weekday: "long" });
    const gregorianFormatted = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    // Get Hebrew calendar events for this date
    const startAbs = hdate.abs();
    const calEvents = HebrewCalendar.calendar({
      start: new HDate(startAbs),
      end: new HDate(startAbs),
      il: false,
      noMinorFast: false,
      noModern: false,
      noRoshChodesh: false,
      noSpecialShabbat: false,
      sedrot: true,
      omer: true,
    });

    const holidays = calEvents.map(ev => ({
      name: ev.render("en"),
      category: ev.getFlags(),
      desc: ev.getDesc(),
    }));

    const holidayNames = holidays.map(h => h.name);

    // Check for signals on or near this date
    const allSignals = await db.select().from(schema.signals);
    const signals = allSignals.filter(s => {
      const diff = Math.abs(new Date(s.date).getTime() - d.getTime());
      return diff < 3 * 24 * 60 * 60 * 1000; // within 3 days
    });

    const signalContext = signals.map(s => `- ${s.title} (intensity ${s.intensity}/5, category: ${s.category})`).join("\n");

    // Shmita check
    const shmitaYear = (hebrewYear % 7 === 0);
    const yearInCycle = hebrewYear % 7;

    // Islamic calendar
    const hijri = getHijriDateInfo(d);

    // Esoteric reading (Chinese numerology, Gann, lunar, pi cycle, etc.)
    const cyclical = getCyclicalReading(d);

    const prompt = `Provide a comprehensive intelligence reading for this date:

**Gregorian:** ${dayOfWeek}, ${gregorianFormatted}
**Hebrew:** ${hebrewDateStr} (Year ${hebrewYear})
**Shmita Cycle:** Year ${yearInCycle}/7${shmitaYear ? " (SHMITA YEAR - sabbatical)" : ""}

**Hebrew Calendar Events on this date:**
${holidayNames.length > 0 ? holidayNames.map(h => `- ${h}`).join("\n") : "No major holidays"}

**Islamic (Hijri) Calendar:**
- Date: ${hijri.hijriDate}
- Month: ${hijri.monthName} (Year ${hijri.hijriYear})
${hijri.isRamadan ? "- STATUS: RAMADAN IS ACTIVE - fasting month, 1.8B Muslims observing" : ""}
${hijri.isSacredMonth ? `- STATUS: SACRED MONTH (${hijri.monthName}) - warfare traditionally prohibited in Islam` : ""}

${signalContext ? `**Active Signals near this date:**\n${signalContext}` : ""}

**Chinese Calendar & Numerology:**
- Sexagenary Cycle: ${cyclical.sexagenaryCycle.label} (Year ${cyclical.sexagenaryCycle.cycleNumber}/60)
- Element: ${cyclical.sexagenaryCycle.element} ${cyclical.sexagenaryCycle.polarity}
- Animal: ${cyclical.sexagenaryCycle.animal}
- Harmonies: ${cyclical.sexagenaryCycle.harmonies.join(", ") || "None"}
- Clashes: ${cyclical.sexagenaryCycle.clashes.join(", ") || "None"}
- Date Numerology Score: ${cyclical.chineseNumerology.totalScore} (${cyclical.chineseNumerology.sentiment})
${cyclical.chineseNumerology.patterns.length > 0 ? `- Patterns: ${cyclical.chineseNumerology.patterns.join(", ")}` : ""}

**Flying Stars (Feng Shui):**
- Annual Center Star: ${cyclical.flyingStars.centerStar} - ${cyclical.flyingStars.starInfo.name}
- Nature: ${cyclical.flyingStars.starInfo.nature}
- Financial: ${cyclical.flyingStars.starInfo.financial}

**Lunar Phase:**
- Phase: ${cyclical.lunarPhase.phase.replace(/_/g, " ")} (day ${cyclical.lunarPhase.dayInCycle.toFixed(1)} of 29.53)
- Illumination: ${(cyclical.lunarPhase.illumination * 100).toFixed(0)}%
- Market Bias: ${cyclical.lunarPhase.marketBias} (academic research: ${cyclical.lunarPhase.basisPoints}bp daily adjustment)

**Universal Year:** ${cyclical.universalYear.number} - ${cyclical.universalYear.theme}
**Kondratieff Wave:** ${cyclical.kondratieff.season} of 6th wave (year ${cyclical.kondratieff.yearInWave})

**Armstrong Pi Cycle (8.6-year ECM):**
${cyclical.piCycle.filter(p => Math.abs(p.daysFromNow) <= 365).map(p => `- ${p.label}: ${p.date} (${p.daysFromNow > 0 ? `in ${p.daysFromNow} days` : `${Math.abs(p.daysFromNow)} days ago`})`).join("\n") || "No turning points within 1 year"}

**Cyclical Composite Score:** ${cyclical.compositeScore.toFixed(1)}/10
**Composite Outlook:** ${cyclical.compositeOutlook}

Please provide a reading structured as follows:

## Historical Events
List 3-5 significant historical events that occurred on ${gregorianFormatted.replace(`, ${d.getFullYear()}`, "")} (this calendar day, any year) that are relevant to geopolitics, markets, or international relations. Focus on events involving wars, market crashes/rallies, treaties, and major policy shifts.

## Hebrew Calendar Significance
${holidayNames.length > 0 ? `Analyze the geopolitical and market significance of ${holidayNames.join(", ")}. What historical military operations, policy decisions, or market events have coincided with this date? How does this period affect Israeli government decision-making, settlement activity, and regional tensions?` : "Analyze this period in the Hebrew calendar cycle. What documented behavioral patterns exist around this time (military posture, diplomatic activity, market liquidity)?"}

## Islamic Calendar Significance
Analyze the Islamic calendar position: ${hijri.hijriDate} (${hijri.monthName}).${hijri.isRamadan ? " Ramadan is currently active. How does this affect military decision-making by Iran, Saudi Arabia, Turkey, Pakistan? What historical military actions have occurred during Ramadan? How does Ramadan affect oil demand, consumer spending, and market trading hours across MENA?" : ""}${hijri.isSacredMonth ? ` This is a Sacred Month (${hijri.monthName}). How does the prohibition on warfare affect current geopolitical dynamics? Which state actors observe this prohibition and which do not?` : ""} Consider how Islamic calendar events interact with the Hebrew calendar events above. When do triple-calendar convergences (Hebrew + Islamic + celestial) create maximum geopolitical sensitivity?

## Chinese Cultural Timing Analysis
Analyze the ${cyclical.sexagenaryCycle.element} ${cyclical.sexagenaryCycle.animal} year in the context of documented Chinese state behavior. How has China historically timed major policy announcements, military exercises, and economic decisions around culturally significant dates? What patterns exist in Hong Kong and mainland market behavior around these periods? Reference specific examples (e.g., 08/08/08 Olympics, major IPO pricing conventions, PLA exercise timing).

## Lunar & Cycle Convergence
Analyze the lunar phase (${cyclical.lunarPhase.phase.replace(/_/g, " ")}) and its documented correlation with market returns. How does the Armstrong Pi Cycle position (8.6-year Economic Confidence Model) interact with the Kondratieff ${cyclical.kondratieff.season} phase? What does the Universal Year ${cyclical.universalYear.number} cycle position suggest?

## Cross-Calendar Convergence
Analyze convergence between the Hebrew calendar position, Islamic calendar position, Shmita cycle (year ${yearInCycle}/7), and Chinese cultural calendar. When multiple calendar systems create overlapping periods of cultural significance, what documented behavioral effects emerge? Reference the historical convergence data: three-system convergences show 18% mean VIX elevation (per internal backtest). Focus on actionable patterns, not symbolic interpretation.

## Market Implications
Based on ALL layers (Hebrew, Islamic, Chinese cultural timing, astronomical, cyclical, lunar), what does this date suggest for markets? Consider:
- Seasonal patterns and historical volatility
- Chinese cultural timing conventions and their effect on Asian markets
- Lunar cycle bias (academic: full moon = lower returns, new moon = higher)
- Shmita cycle position (2001, 2008, 2015 correlation)
- Kondratieff wave position and long-term structural trends
- Armstrong ECM proximity to turning points
- Sector-specific implications from cross-calendar analysis

## Convergence Score
Rate the overall convergence intensity of this date from 1-5:
1 = Quiet, no notable calendar events across any system
2 = Minor activity in one or two calendar systems
3 = Moderate convergence, multiple calendar systems have significant events
4 = Strong convergence, Hebrew + Islamic + economic + cyclical events cluster
5 = Rare convergence, all major calendar systems have concurrent high-significance events

Provide the score as a single number and a one-line justification.`;

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: await getModel(),
      max_tokens: 4096,
      system: "You are a geopolitical market intelligence analyst specializing in cultural decision-making frameworks and their documented influence on state-actor timing. Your analysis covers: (1) Hebrew and Islamic calendar events that historically correlate with military operations and policy decisions (e.g., Yom Kippur War 1973, Ramadan offensives); (2) Chinese cultural timing conventions documented in state behavior (Beijing Olympics 08/08/08, IPO pricing, policy announcement scheduling); (3) Published cyclical models used by institutional investors (Kondratieff long waves, Armstrong Economic Confidence Model, Gann cycles, lunar return studies per Yuan et al. 2006); (4) Economic calendar events with quantified market impact (FOMC pre-announcement drift per Lucca & Moench 2015, options expiry gamma effects). You treat these as behavioral data about how actors make decisions, not as causal predictors. Cite specific historical precedents, academic references, and quantified effects. Write with the precision of an intelligence briefing. Avoid mystical or spiritual framing.",
      messages: [{ role: "user", content: prompt }],
    });

    await gate.debit(await getModel(), response.usage.input_tokens, response.usage.output_tokens, "calendar_reading");

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({
      date,
      gregorian: gregorianFormatted,
      hebrew: hebrewDateStr,
      hebrewYear,
      holidays: holidayNames,
      shmitaCycle: yearInCycle,
      isShmita: shmitaYear,
      reading: text,
      signalCount: signals.length,
      cyclical: {
        sexagenaryCycle: cyclical.sexagenaryCycle.label,
        animal: cyclical.sexagenaryCycle.animal,
        element: cyclical.sexagenaryCycle.element,
        flyingStar: cyclical.flyingStars.centerStar,
        flyingStarName: cyclical.flyingStars.starInfo.name,
        lunarPhase: cyclical.lunarPhase.phase,
        lunarBias: cyclical.lunarPhase.marketBias,
        universalYear: cyclical.universalYear.number,
        kondratieffSeason: cyclical.kondratieff.season,
        numerologyScore: cyclical.chineseNumerology.totalScore,
        compositeScore: cyclical.compositeScore,
      },
    });
  } catch (error) {
    const { generateRequestId, errorResponse } = await import("@/lib/request-id");
    const reqId = generateRequestId();
    console.error(`[calendar-reading] ${reqId}`, error);
    return errorResponse("Failed to generate reading", 500, reqId);
  }
}
