import "server-only";

interface FireDataPoint {
  lat: number;
  lng: number;
  brightness: number;
  confidence: string;
  acqDate: string;
}

/**
 * Fetch fire/thermal anomaly data from NASA FIRMS.
 * Uses VIIRS SNPP near-real-time data.
 */
export async function getFireData(
  bbox: { north: number; south: number; east: number; west: number },
  days = 7,
): Promise<FireDataPoint[]> {
  const mapKey = process.env.NASA_FIRMS_KEY || "DEMO_KEY";
  const area = `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`;

  try {
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/VIIRS_SNPP_NRT/${area}/${days}`;
    const response = await fetch(url, { next: { revalidate: 3600 } });

    if (!response.ok) return [];

    const csv = await response.text();
    const lines = csv.split("\n").slice(1); // Skip header

    return lines.filter(l => l.trim()).map(line => {
      const cols = line.split(",");
      return {
        lat: parseFloat(cols[0]),
        lng: parseFloat(cols[1]),
        brightness: parseFloat(cols[2]),
        confidence: cols[9] || "nominal",
        acqDate: cols[5] || "",
      };
    }).filter(p => !isNaN(p.lat) && !isNaN(p.lng));
  } catch {
    return [];
  }
}

/**
 * Analyze fire/light data to estimate activity levels in a region.
 */
export async function getNightlightActivity(
  bbox: { north: number; south: number; east: number; west: number },
): Promise<{ activityLevel: string; anomalyCount: number; hotspots: FireDataPoint[] }> {
  const data = await getFireData(bbox, 3);

  const highConfidence = data.filter(d => d.confidence === "high" || d.confidence === "h");

  let activityLevel = "low";
  if (data.length > 50) activityLevel = "high";
  else if (data.length > 20) activityLevel = "moderate";
  else if (data.length > 5) activityLevel = "normal";

  return {
    activityLevel,
    anomalyCount: data.length,
    hotspots: highConfidence.slice(0, 20),
  };
}
