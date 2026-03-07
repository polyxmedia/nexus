import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { HDate, HebrewCalendar } from "@hebcal/core";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getEsotericReading } from "@/lib/signals/numerology";
import { getHijriDateInfo } from "@/lib/signals/islamic-calendar";
import { getModel } from "@/lib/ai/model";

export async function POST(request: NextRequest) {
  const { date } = await request.json();
  if (!date) {
    return NextResponse.json({ error: "date required" }, { status: 400 });
  }

  const apiKeySetting = await db.select().from(schema.settings)
    .where(eq(schema.settings.key, "anthropic_api_key"))
    ;

  const apiKey = apiKeySetting?.value || process.env.ANTHROPIC_API_KEY;
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
  const esoteric = getEsotericReading(d);

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
- Sexagenary Cycle: ${esoteric.sexagenaryCycle.label} (Year ${esoteric.sexagenaryCycle.cycleNumber}/60)
- Element: ${esoteric.sexagenaryCycle.element} ${esoteric.sexagenaryCycle.polarity}
- Animal: ${esoteric.sexagenaryCycle.animal}
- Harmonies: ${esoteric.sexagenaryCycle.harmonies.join(", ") || "None"}
- Clashes: ${esoteric.sexagenaryCycle.clashes.join(", ") || "None"}
- Date Numerology Score: ${esoteric.chineseNumerology.totalScore} (${esoteric.chineseNumerology.sentiment})
${esoteric.chineseNumerology.patterns.length > 0 ? `- Patterns: ${esoteric.chineseNumerology.patterns.join(", ")}` : ""}

**Flying Stars (Feng Shui):**
- Annual Center Star: ${esoteric.flyingStars.centerStar} - ${esoteric.flyingStars.starInfo.name}
- Nature: ${esoteric.flyingStars.starInfo.nature}
- Financial: ${esoteric.flyingStars.starInfo.financial}

**Lunar Phase:**
- Phase: ${esoteric.lunarPhase.phase.replace(/_/g, " ")} (day ${esoteric.lunarPhase.dayInCycle.toFixed(1)} of 29.53)
- Illumination: ${(esoteric.lunarPhase.illumination * 100).toFixed(0)}%
- Market Bias: ${esoteric.lunarPhase.marketBias} (academic research: ${esoteric.lunarPhase.basisPoints}bp daily adjustment)

**Universal Year:** ${esoteric.universalYear.number} - ${esoteric.universalYear.theme}
**Kondratieff Wave:** ${esoteric.kondratieff.season} of 6th wave (year ${esoteric.kondratieff.yearInWave})

**Armstrong Pi Cycle (8.6-year ECM):**
${esoteric.piCycle.filter(p => Math.abs(p.daysFromNow) <= 365).map(p => `- ${p.label}: ${p.date} (${p.daysFromNow > 0 ? `in ${p.daysFromNow} days` : `${Math.abs(p.daysFromNow)} days ago`})`).join("\n") || "No turning points within 1 year"}

**Esoteric Composite Score:** ${esoteric.compositeScore.toFixed(1)}/10
**Composite Outlook:** ${esoteric.compositeOutlook}

Please provide a reading structured as follows:

## Historical Events
List 3-5 significant historical events that occurred on ${gregorianFormatted.replace(`, ${d.getFullYear()}`, "")} (this calendar day, any year) that are relevant to geopolitics, markets, or sacred history. Focus on events involving wars, market crashes/rallies, treaties, and religious or spiritual milestones.

## Hebrew Calendar Significance
${holidayNames.length > 0 ? `Explain the spiritual and historical significance of ${holidayNames.join(", ")}. Include the traditional Torah/scriptural readings for this date if applicable. Explain what the sages and kabbalistic tradition say about this period.` : "Explain what this day represents in the Hebrew calendar cycle. What is the energy or spiritual quality of this period according to tradition?"}

## Islamic Calendar Significance
Analyze the Islamic calendar position: ${hijri.hijriDate} (${hijri.monthName}).${hijri.isRamadan ? " Ramadan is currently active. How does this affect military decision-making by Iran, Saudi Arabia, Turkey, Pakistan? What historical military actions have occurred during Ramadan? How does Ramadan affect oil demand, consumer spending, and market trading hours across MENA?" : ""}${hijri.isSacredMonth ? ` This is a Sacred Month (${hijri.monthName}). How does the prohibition on warfare affect current geopolitical dynamics? Which state actors observe this prohibition and which do not?` : ""} Consider how Islamic calendar events interact with the Hebrew calendar events above. When do triple-calendar convergences (Hebrew + Islamic + celestial) create maximum geopolitical sensitivity?

## Chinese Calendar & Numerology Analysis
Analyze the significance of the ${esoteric.sexagenaryCycle.element} ${esoteric.sexagenaryCycle.animal} year. How does the Five Elements interaction (productive and destructive cycles) apply? What does the Flying Star ${esoteric.flyingStars.centerStar} in the center position mean for financial decisions? How would Chinese government officials, Hong Kong traders, or Feng Shui-conscious investors interpret this date? Consider that China schedules major policy announcements, military exercises, and economic decisions around numerologically auspicious timing.

## Lunar & Cycle Convergence
Analyze the lunar phase (${esoteric.lunarPhase.phase.replace(/_/g, " ")}) and its documented correlation with market returns. How does the Armstrong Pi Cycle position (8.6-year Economic Confidence Model) interact with the Kondratieff ${esoteric.kondratieff.season} phase? What does the Universal Year ${esoteric.universalYear.number} energy suggest?

## Scriptural Convergence
Analyze any convergence between the Hebrew calendar position, the Shmita cycle (year ${yearInCycle}/7), and the Chinese calendar elements. Are there patterns from Torah, Prophets, or kabbalistic texts that map to this moment? Reference specific passages where relevant. Consider cross-cultural convergence: when multiple ancient calendar systems point in the same direction, what does that suggest?

## Market Implications
Based on ALL layers (Hebrew, Chinese, celestial, numerological, cyclical, lunar), what does this date suggest for markets? Consider:
- Seasonal patterns and historical volatility
- Chinese numerological sentiment and its effect on Asian markets
- Lunar cycle bias (academic: full moon = lower returns, new moon = higher)
- Shmita cycle position (2001, 2008, 2015 correlation)
- Kondratieff wave position and long-term structural trends
- Armstrong ECM proximity to turning points
- Sector-specific implications from Five Elements analysis

## Convergence Score
Rate the overall convergence intensity of this date from 1-5:
1 = Quiet, no notable alignments across any system
2 = Minor alignment in one or two systems
3 = Moderate convergence, multiple systems agree
4 = Strong convergence, Hebrew + Chinese + celestial + cyclical align
5 = Rare convergence, all major systems point in the same direction

Provide the score as a single number and a one-line justification.`;


  try {
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: await getModel(),
      max_tokens: 3000,
      system: "You are a geopolitical-spiritual market intelligence analyst specializing in the intersection of sacred calendars (Hebrew, Chinese, celestial), numerological systems (Chinese, Pythagorean, Gann), cyclical models (Kondratieff, Armstrong ECM, lunar), and financial markets. You draw on kabbalistic tradition, Torah scholarship, Chinese metaphysics (Five Elements, Flying Stars, Ba Zi), and quantitative market history. You understand that these systems are not superstition but cultural decision-making frameworks used by state actors: Israel times military operations around Hebrew holidays, China schedules major announcements on numerologically auspicious dates (08/08/08 Olympics, IPO pricing with 8s), and institutional traders use Gann and Fibonacci. Be specific with dates, scripture references, cycle positions, and market data. Avoid vague platitudes. Write with the precision of an intelligence briefing.",
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content.type === "text" ? response.content.text : "";

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
        numerologyScore: esoteric.chineseNumerology.totalScore,
        compositeScore: esoteric.compositeScore,
      },
    });
  } catch (error) {
    console.error("Calendar reading error:", error);
    return NextResponse.json({ error: "Failed to generate reading" }, { status: 500 });
  }
}
