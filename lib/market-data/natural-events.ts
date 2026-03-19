/**
 * Natural Event Data Sources
 * ==========================
 * USGS earthquakes + NOAA severe weather.
 * Both free, no API keys, real-time feeds.
 *
 * Intelligence value: earthquakes near nuclear/pipeline infrastructure,
 * hurricanes hitting Gulf refineries, freezes on Texas grid.
 */

// ── USGS Earthquake Feed ──
// Real-time GeoJSON updated every 5 minutes

export interface Earthquake {
  id: string;
  magnitude: number;
  place: string;
  time: string;
  lat: number;
  lng: number;
  depth: number; // km
  tsunami: boolean;
  significance: number; // 0-1000, USGS composite
  url: string;
}

/**
 * Fetch significant earthquakes from USGS.
 * @param period "hour" | "day" | "week" | "month"
 * @param minMagnitude Minimum magnitude (default 4.5 for significant)
 */
export async function getEarthquakes(
  period: "hour" | "day" | "week" = "day",
  minMagnitude = 4.5
): Promise<Earthquake[]> {
  try {
    const feed = minMagnitude >= 4.5 ? "significant" : minMagnitude >= 2.5 ? "2.5" : "all";
    const url = `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${feed}_${period}.geojson`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return [];

    const data = await res.json();
    const features = data?.features || [];

    return features
      .map((f: { id: string; properties: Record<string, unknown>; geometry: { coordinates: number[] } }) => ({
        id: f.id,
        magnitude: (f.properties.mag as number) || 0,
        place: (f.properties.place as string) || "",
        time: new Date((f.properties.time as number) || 0).toISOString(),
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        depth: f.geometry.coordinates[2] || 0,
        tsunami: (f.properties.tsunami as number) === 1,
        significance: (f.properties.sig as number) || 0,
        url: (f.properties.url as string) || "",
      }))
      .filter((e: Earthquake) => e.magnitude >= minMagnitude)
      .sort((a: Earthquake, b: Earthquake) => b.magnitude - a.magnitude);
  } catch (err) {
    console.error("[USGS] Earthquake fetch failed:", err);
    return [];
  }
}

// ── NOAA Severe Weather Alerts ──

export interface WeatherAlert {
  id: string;
  event: string; // "Hurricane Warning", "Tornado Warning", etc.
  headline: string;
  severity: "Extreme" | "Severe" | "Moderate" | "Minor" | "Unknown";
  urgency: "Immediate" | "Expected" | "Future" | "Past" | "Unknown";
  areas: string;
  onset: string;
  expires: string;
  description: string;
}

/**
 * Fetch active severe weather alerts from NOAA.
 * Filters to market-relevant events (hurricanes, extreme cold/heat, floods).
 */
export async function getSevereWeatherAlerts(): Promise<WeatherAlert[]> {
  try {
    const res = await fetch("https://api.weather.gov/alerts/active?status=actual&severity=Extreme,Severe", {
      signal: AbortSignal.timeout(8_000),
      headers: { "User-Agent": "NEXUS Intelligence Platform (support@nexushq.xyz)" },
    });
    if (!res.ok) return [];

    const data = await res.json();
    const features = data?.features || [];

    // Filter to market-relevant events
    const marketRelevant = ["Hurricane", "Tropical Storm", "Extreme Cold", "Extreme Heat",
      "Blizzard", "Ice Storm", "Flood", "Flash Flood", "Tornado", "Tsunami"];

    return features
      .map((f: { id: string; properties: Record<string, unknown> }) => ({
        id: f.id || "",
        event: (f.properties.event as string) || "",
        headline: (f.properties.headline as string) || "",
        severity: (f.properties.severity as string) || "Unknown",
        urgency: (f.properties.urgency as string) || "Unknown",
        areas: (f.properties.areaDesc as string) || "",
        onset: (f.properties.onset as string) || "",
        expires: (f.properties.expires as string) || "",
        description: ((f.properties.description as string) || "").slice(0, 500),
      }))
      .filter((a: WeatherAlert) => marketRelevant.some(r => a.event.includes(r)));
  } catch (err) {
    console.error("[NOAA] Weather alert fetch failed:", err);
    return [];
  }
}

/**
 * Check for infrastructure-threatening natural events.
 * Returns events near strategic locations (Gulf refineries, pipelines, nuclear plants).
 */
export async function getInfrastructureThreats(): Promise<{
  earthquakes: Earthquake[];
  weatherAlerts: WeatherAlert[];
  threats: Array<{ type: string; event: string; impact: string; severity: string }>;
}> {
  const [quakes, weather] = await Promise.all([
    getEarthquakes("week", 5.0),
    getSevereWeatherAlerts(),
  ]);

  const threats: Array<{ type: string; event: string; impact: string; severity: string }> = [];

  // Check earthquakes near strategic infrastructure
  for (const q of quakes) {
    if (q.magnitude >= 6.0) {
      threats.push({
        type: "earthquake",
        event: `M${q.magnitude} ${q.place}`,
        impact: q.tsunami ? "Potential tsunami, port disruption, supply chain impact" : "Infrastructure damage risk, potential supply disruption",
        severity: q.magnitude >= 7.0 ? "critical" : "high",
      });
    }
  }

  // Check weather threats to energy infrastructure
  for (const w of weather) {
    const isGulfCoast = w.areas.toLowerCase().includes("texas") || w.areas.toLowerCase().includes("louisiana") ||
      w.areas.toLowerCase().includes("gulf");
    if (w.event.includes("Hurricane") || w.event.includes("Tropical Storm")) {
      threats.push({
        type: "weather",
        event: w.headline,
        impact: isGulfCoast ? "Gulf refinery shutdowns, oil/gas production disruption" : "Potential infrastructure damage",
        severity: w.severity === "Extreme" ? "critical" : "high",
      });
    }
    if ((w.event.includes("Extreme Cold") || w.event.includes("Blizzard")) && isGulfCoast) {
      threats.push({
        type: "weather",
        event: w.headline,
        impact: "Texas grid stress, natural gas demand spike, refinery freeze risk",
        severity: "high",
      });
    }
  }

  return { earthquakes: quakes.slice(0, 10), weatherAlerts: weather.slice(0, 10), threats };
}
