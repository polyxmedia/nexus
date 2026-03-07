// ── Islamic (Hijri) Calendar Signal Engine ──
// Cultural decision-making framework for Muslim-majority state actors
// Iran, Saudi Arabia, Turkey, Pakistan, Egypt time military/economic decisions around these dates

import { toGregorian, toHijri } from "hijri-converter";

export interface IslamicCalendarSignal {
  date: string; // Gregorian ISO
  hijriDate: string; // e.g., "9 Ramadan 1447"
  holiday: string;
  type: string; // ramadan | eid | ashura | sacred_month | prophetic
  significance: number; // 1-3
  description: string;
  marketRelevance: string;
  geopoliticalContext: string;
}

const HIJRI_MONTHS = [
  "Muharram", "Safar", "Rabi al-Awwal", "Rabi al-Thani",
  "Jumada al-Ula", "Jumada al-Thani", "Rajab", "Shaban",
  "Ramadan", "Shawwal", "Dhul Qadah", "Dhul Hijjah",
];

// Sacred months (Al-Ashhur Al-Hurum): warfare traditionally forbidden
const SACRED_MONTHS = [1, 7, 11, 12]; // Muharram, Rajab, Dhul Qadah, Dhul Hijjah

interface HijriEvent {
  month: number;
  day: number;
  endDay?: number; // for multi-day events
  name: string;
  type: string;
  significance: number;
  description: string;
  marketRelevance: string;
  geopoliticalContext: string;
}

const HIJRI_EVENTS: HijriEvent[] = [
  // ── Muharram (Month 1) ──
  {
    month: 1, day: 1,
    name: "Islamic New Year (Hijri New Year)",
    type: "sacred_month",
    significance: 2,
    description: "Start of the Islamic calendar year. Muharram is one of the four sacred months.",
    marketRelevance: "Saudi markets may see reduced trading volume. Islamic finance institutions reset annual cycles.",
    geopoliticalContext: "Muharram is a sacred month where warfare is traditionally prohibited. Violations carry heavy political consequences in Muslim-majority nations.",
  },
  {
    month: 1, day: 10,
    name: "Ashura",
    type: "ashura",
    significance: 3,
    description: "Marks the martyrdom of Imam Hussein (Shia Islam) and Moses crossing the Red Sea (Sunni tradition). Day of fasting and mourning.",
    marketRelevance: "Markets in Iran, Iraq, Lebanon may close or see reduced activity. Sectarian tension can spike oil risk premium.",
    geopoliticalContext: "CRITICAL: Ashura is the single most sensitive date for Shia-Sunni tensions. Iranian IRGC often times shows of force around Ashura. Hezbollah mobilization increases. Iraq sees massive pilgrimages to Karbala. Any provocative action near this date triggers amplified response across the Shia world.",
  },
  // ── Rabi al-Awwal (Month 3) ──
  {
    month: 3, day: 12,
    name: "Mawlid al-Nabi (Prophet's Birthday)",
    type: "prophetic",
    significance: 2,
    description: "Celebration of Prophet Muhammad's birth. Public holiday in most Muslim countries.",
    marketRelevance: "Market closures across MENA region. Consumer spending spike in retail/food sectors.",
    geopoliticalContext: "Any perceived insult to the Prophet around this date triggers disproportionate political response. Diplomatic sensitivity elevated.",
  },
  // ── Rajab (Month 7) ──
  {
    month: 7, day: 27,
    name: "Isra wal-Mi'raj (Night Journey)",
    type: "prophetic",
    significance: 3,
    description: "Commemorates Prophet Muhammad's night journey from Mecca to Jerusalem (Al-Aqsa Mosque) and ascension to heaven. One of the holiest nights in Islam.",
    marketRelevance: "Jerusalem tensions often peak around this date. Tourism/pilgrimage activity in Jerusalem increases.",
    geopoliticalContext: "CRITICAL for Al-Aqsa/Temple Mount dynamics. This date directly links Islamic sacred geography to Jerusalem. Any Israeli security action at Al-Aqsa compound around this date is perceived as an attack on Islam's third holiest site. Historically triggers regional protests and diplomatic incidents.",
  },
  // ── Shaban (Month 8) ──
  {
    month: 8, day: 15,
    name: "Laylat al-Bara'at (Night of Forgiveness)",
    type: "prophetic",
    significance: 1,
    description: "Night of forgiveness and preparation for Ramadan. Observed with prayers and fasting.",
    marketRelevance: "Minor. Marks beginning of Ramadan preparation, consumer spending increases.",
    geopoliticalContext: "Signals imminent start of Ramadan. Military planners in Muslim-majority nations adjust operations.",
  },
  // ── Ramadan (Month 9) ──
  {
    month: 9, day: 1,
    name: "Ramadan Begins",
    type: "ramadan",
    significance: 3,
    description: "Start of the holy month of fasting from dawn to sunset. Observed by 1.8 billion Muslims worldwide.",
    marketRelevance: "SIGNIFICANT: Saudi GDP affected (retail hours shift, productivity changes). Oil demand patterns shift (evening consumption spikes). Consumer spending increases 20-30% on food/retail. Middle East exchanges adjust trading hours. Islamic banking activity peaks.",
    geopoliticalContext: "Military operations by Muslim-majority nations traditionally pause or reduce during Ramadan. Violations (attacking during Ramadan) carry enormous political cost and recruitment consequences for the attacker. However, some groups deliberately escalate during Ramadan for symbolic impact (Ramadan Offensive doctrine).",
  },
  {
    month: 9, day: 27,
    name: "Laylat al-Qadr (Night of Power)",
    type: "ramadan",
    significance: 3,
    description: "The holiest night in Islam. Believed to be the night the Quran was first revealed. 'Better than a thousand months.' Most commonly observed on 27th Ramadan but may fall on any odd night in the last 10 days.",
    marketRelevance: "Peak spiritual observance. Markets in Muslim-majority nations at minimal activity. Charitable giving (Zakat al-Fitr) peaks.",
    geopoliticalContext: "Maximum sensitivity window. Any military action, provocation, or insult during this night is perceived as an attack on Islam itself. Political leaders in Muslim-majority nations are under maximum public scrutiny.",
  },
  // ── Shawwal (Month 10) ──
  {
    month: 10, day: 1, endDay: 3,
    name: "Eid al-Fitr",
    type: "eid",
    significance: 3,
    description: "Festival of Breaking the Fast. Marks the end of Ramadan. Three-day celebration with feasting, gifts, and charity.",
    marketRelevance: "SIGNIFICANT: Market closures across all Muslim-majority nations (3-7 days in Saudi/UAE/Qatar). Post-Ramadan consumer spending surge. Travel and tourism spike. IMF research shows Chinese New Year-like return effects in some Islamic markets.",
    geopoliticalContext: "Traditional ceasefire period. Peace overtures and prisoner exchanges often timed to Eid. Diplomatic messaging window.",
  },
  // ── Dhul Hijjah (Month 12) ──
  {
    month: 12, day: 8, endDay: 12,
    name: "Hajj Pilgrimage",
    type: "sacred_month",
    significance: 3,
    description: "Annual pilgrimage to Mecca. One of the Five Pillars of Islam. 2-3 million pilgrims. Largest annual gathering of humans on Earth.",
    marketRelevance: "MAJOR: Saudi GDP impact (Hajj generates $12B+ annually). Hospitality, transport, retail sectors surge. Oil demand affected by pilgrim travel. Saudi Riyal demand increases.",
    geopoliticalContext: "Saudi Arabia's legitimacy as Custodian of the Two Holy Mosques is at stake. Any security incident during Hajj is an existential political crisis. Iran-Saudi tensions often manifest through Hajj quota disputes. Mass gatherings create both vulnerability and symbolic power.",
  },
  {
    month: 12, day: 10, endDay: 13,
    name: "Eid al-Adha (Festival of Sacrifice)",
    type: "eid",
    significance: 3,
    description: "Commemorates Ibrahim's willingness to sacrifice his son. Marked by animal sacrifice (Qurbani) worldwide. Holiest festival in the Islamic calendar.",
    marketRelevance: "Market closures across Muslim world (4-7 days). Livestock markets peak globally. Consumer spending surge. Gold demand increases (Eid gifts).",
    geopoliticalContext: "Peak diplomatic window. Leaders exchange greetings. Military parades in some nations. Traditional ceasefire period.",
  },
  {
    month: 12, day: 9,
    name: "Day of Arafah",
    type: "sacred_month",
    significance: 2,
    description: "The day before Eid al-Adha. Pilgrims gather at Mount Arafat. Most important day of Hajj. Fasting this day is said to expiate two years of sin.",
    marketRelevance: "Final pre-Eid trading day in many markets. Position squaring before extended holiday.",
    geopoliticalContext: "Khutbah (sermon) at Arafat is the most-watched Islamic event globally. Political messaging from Saudi leadership reaches maximum audience.",
  },
];

function formatHijriDate(month: number, day: number, year: number): string {
  return `${day} ${HIJRI_MONTHS[month - 1]} ${year}`;
}

export function getIslamicCalendarEvents(gregorianYear: number): IslamicCalendarSignal[] {
  const results: IslamicCalendarSignal[] = [];

  // Determine which Hijri years overlap with this Gregorian year
  const janHijri = toHijri(gregorianYear, 1, 1);
  const decHijri = toHijri(gregorianYear, 12, 31);
  const hijriYears = new Set<number>();
  for (let hy = janHijri.hy; hy <= decHijri.hy; hy++) {
    hijriYears.add(hy);
  }

  for (const hijriYear of hijriYears) {
    for (const event of HIJRI_EVENTS) {
      try {
        const greg = toGregorian(hijriYear, event.month, event.day);
        const dateStr = `${greg.gy}-${String(greg.gm).padStart(2, "0")}-${String(greg.gd).padStart(2, "0")}`;

        // Only include if within the target Gregorian year
        if (greg.gy !== gregorianYear) continue;

        results.push({
          date: dateStr,
          hijriDate: formatHijriDate(event.month, event.day, hijriYear),
          holiday: event.name,
          type: event.type,
          significance: event.significance,
          description: event.description,
          marketRelevance: event.marketRelevance,
          geopoliticalContext: event.geopoliticalContext,
        });
      } catch {
        // Invalid date combination, skip
      }
    }

    // Add sacred month markers
    for (const sacredMonth of SACRED_MONTHS) {
      try {
        const greg = toGregorian(hijriYear, sacredMonth, 1);
        if (greg.gy !== gregorianYear) continue;
        const dateStr = `${greg.gy}-${String(greg.gm).padStart(2, "0")}-${String(greg.gd).padStart(2, "0")}`;

        results.push({
          date: dateStr,
          hijriDate: formatHijriDate(sacredMonth, 1, hijriYear),
          holiday: `Sacred Month: ${HIJRI_MONTHS[sacredMonth - 1]} begins`,
          type: "sacred_month",
          significance: 1,
          description: `${HIJRI_MONTHS[sacredMonth - 1]} is one of the four sacred months (Al-Ashhur Al-Hurum) in Islam where warfare is traditionally prohibited.`,
          marketRelevance: "Military de-escalation expected in Muslim-majority conflicts. Defense stocks may see reduced momentum.",
          geopoliticalContext: `Violation of the sacred month prohibition carries heavy reputational cost. State actors in Muslim-majority nations face domestic pressure to maintain peace.`,
        });
      } catch {
        // skip
      }
    }
  }

  return results.sort((a, b) => a.date.localeCompare(b.date));
}

// Get the current Hijri date info
export function getHijriDateInfo(date: Date): {
  hijriDate: string;
  hijriYear: number;
  hijriMonth: number;
  hijriDay: number;
  monthName: string;
  isSacredMonth: boolean;
  isRamadan: boolean;
} {
  const h = toHijri(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return {
    hijriDate: formatHijriDate(h.hm, h.hd, h.hy),
    hijriYear: h.hy,
    hijriMonth: h.hm,
    hijriDay: h.hd,
    monthName: HIJRI_MONTHS[h.hm - 1],
    isSacredMonth: SACRED_MONTHS.includes(h.hm),
    isRamadan: h.hm === 9,
  };
}
