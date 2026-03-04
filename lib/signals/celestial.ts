import * as Astronomy from "astronomy-engine";

export interface CelestialEvent {
  date: string;
  type: string;
  title: string;
  description: string;
  significance: number; // 1-3 contribution to intensity
}

function formatDate(d: Astronomy.FlexibleDateTime): string {
  const date = new Date(
    d instanceof Astronomy.AstroTime ? d.date : d
  );
  return date.toISOString().split("T")[0];
}

export function getLunarEclipses(year: number): CelestialEvent[] {
  const events: CelestialEvent[] = [];
  let search = Astronomy.SearchLunarEclipse(new Date(`${year}-01-01`));

  while (search && new Date(search.peak.date).getFullYear() <= year) {
    if (new Date(search.peak.date).getFullYear() === year) {
      const isTotal = search.kind === "total";
      events.push({
        date: formatDate(search.peak),
        type: isTotal ? "total_lunar_eclipse" : "partial_lunar_eclipse",
        title: `${isTotal ? "Total" : "Partial"} Lunar Eclipse`,
        description: `${isTotal ? "Total" : "Partial"} lunar eclipse${isTotal ? " (Blood Moon)" : ""}`,
        significance: isTotal ? 3 : 2,
      });
    }
    search = Astronomy.NextLunarEclipse(search.peak);
  }
  return events;
}

export function getSolarEclipses(year: number): CelestialEvent[] {
  const events: CelestialEvent[] = [];
  let search = Astronomy.SearchGlobalSolarEclipse(new Date(`${year}-01-01`));

  while (search && new Date(search.peak.date).getFullYear() <= year) {
    if (new Date(search.peak.date).getFullYear() === year) {
      const isTotal = search.kind === "total";
      const isAnnular = search.kind === "annular";
      events.push({
        date: formatDate(search.peak),
        type: isTotal
          ? "total_solar_eclipse"
          : isAnnular
            ? "annular_solar_eclipse"
            : "partial_solar_eclipse",
        title: `${isTotal ? "Total" : isAnnular ? "Annular" : "Partial"} Solar Eclipse`,
        description: `${isTotal ? "Total" : isAnnular ? "Annular" : "Partial"} solar eclipse`,
        significance: isTotal ? 3 : 2,
      });
    }
    search = Astronomy.NextGlobalSolarEclipse(search.peak);
  }
  return events;
}

export function getMoonPhases(year: number): CelestialEvent[] {
  const events: CelestialEvent[] = [];
  let time = new Date(`${year}-01-01`);

  while (time.getFullYear() <= year) {
    const fullMoon = Astronomy.SearchMoonQuarter(time);
    if (!fullMoon || new Date(fullMoon.time.date).getFullYear() > year) break;

    if (fullMoon.quarter === 2) {
      // Full moon
      const perigee = Astronomy.SearchLunarApsis(time);
      const fullMoonDate = new Date(fullMoon.time.date);
      const perigeeDate = perigee ? new Date(perigee.time.date) : null;

      // Supermoon: full moon within 2 days of perigee
      const isSupermoon =
        perigeeDate &&
        perigee.kind === 0 &&
        Math.abs(fullMoonDate.getTime() - perigeeDate.getTime()) <
          2 * 24 * 60 * 60 * 1000;

      if (isSupermoon) {
        events.push({
          date: formatDate(fullMoon.time),
          type: "supermoon",
          title: "Supermoon",
          description: "Full moon at perigee - closest approach to Earth",
          significance: 2,
        });
      }
    }

    time = new Date(new Date(fullMoon.time.date).getTime() + 8 * 24 * 60 * 60 * 1000);
  }

  return events;
}

export function getEquinoxesAndSolstices(year: number): CelestialEvent[] {
  const events: CelestialEvent[] = [];

  const marchEquinox = Astronomy.Seasons(year);
  events.push(
    {
      date: formatDate(marchEquinox.mar_equinox),
      type: "vernal_equinox",
      title: "Vernal Equinox",
      description: "Spring equinox - equal day and night",
      significance: 1,
    },
    {
      date: formatDate(marchEquinox.jun_solstice),
      type: "summer_solstice",
      title: "Summer Solstice",
      description: "Longest day of the year",
      significance: 1,
    },
    {
      date: formatDate(marchEquinox.sep_equinox),
      type: "autumnal_equinox",
      title: "Autumnal Equinox",
      description: "Fall equinox - equal day and night",
      significance: 1,
    },
    {
      date: formatDate(marchEquinox.dec_solstice),
      type: "winter_solstice",
      title: "Winter Solstice",
      description: "Shortest day of the year",
      significance: 1,
    }
  );

  return events;
}

export function getPlanetaryConjunctions(year: number): CelestialEvent[] {
  const events: CelestialEvent[] = [];
  const planets = [Astronomy.Body.Mars, Astronomy.Body.Jupiter, Astronomy.Body.Saturn, Astronomy.Body.Venus];

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      // Check each month for close approaches
      for (let month = 0; month < 12; month++) {
        const date = new Date(year, month, 15);
        const pos1 = Astronomy.Ecliptic(Astronomy.GeoVector(planets[i], date, true));
        const pos2 = Astronomy.Ecliptic(Astronomy.GeoVector(planets[j], date, true));

        const separation = Math.abs(pos1.elon - pos2.elon);
        const normalizedSep = separation > 180 ? 360 - separation : separation;

        if (normalizedSep < 5) {
          events.push({
            date: date.toISOString().split("T")[0],
            type: "conjunction",
            title: `${planets[i]}-${planets[j]} Conjunction`,
            description: `${planets[i]} and ${planets[j]} within ${normalizedSep.toFixed(1)} degrees`,
            significance: normalizedSep < 2 ? 3 : 2,
          });
        }
      }
    }
  }

  return events;
}

export function getAllCelestialEvents(year: number): CelestialEvent[] {
  return [
    ...getLunarEclipses(year),
    ...getSolarEclipses(year),
    ...getMoonPhases(year),
    ...getEquinoxesAndSolstices(year),
    ...getPlanetaryConjunctions(year),
  ].sort((a, b) => a.date.localeCompare(b.date));
}
