import { NextResponse } from "next/server";
import type { OsintEvent, OsintEventType, OsintResponse } from "@/lib/warroom/types";
import { requireTier } from "@/lib/auth/require-tier";
import { docSearch, geoSearch, clusterGeoFeatures, type GdeltArticle } from "@/lib/gdelt/client";

function classifyEventType(title: string): OsintEventType {
  const t = title.toLowerCase();
  if (t.includes("battle") || t.includes("clash") || t.includes("fighting") || t.includes("combat")) return "battles";
  if (t.includes("explo") || t.includes("bomb") || t.includes("shell") || t.includes("airstrike") || t.includes("missile")) return "explosions";
  if (t.includes("protest") || t.includes("demonstrat")) return "protests";
  if (t.includes("riot") || t.includes("mob")) return "riots";
  if (t.includes("civilian") || t.includes("kidnap") || t.includes("massacre") || t.includes("abduct")) return "violence_against_civilians";
  return "strategic_developments";
}

function extractFatalities(title: string): number {
  const match = title.match(/(\d+)\s*(?:killed|dead|die|fatalities|casualties)/i);
  return match ? parseInt(match[1], 10) : 0;
}

function parseGdeltDate(seendate: string): string {
  try {
    return new Date(seendate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, "$1-$2-$3T$4:$5:$6Z")).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

// Conflict hotspot seed data - augmented by live GDELT when available
const SEED_EVENTS: OsintEvent[] = [
  { id: "seed-ua-1", date: new Date().toISOString(), eventType: "battles", actors: "Ukrainian Armed Forces; Russian Forces", location: "Bakhmut, Donetsk Oblast", country: "Ukraine", lat: 48.5953, lng: 37.9995, fatalities: 0, notes: "Ongoing frontline engagements in eastern Donetsk", source: "OSINT aggregation", sourceUrl: "" },
  { id: "seed-ua-2", date: new Date().toISOString(), eventType: "explosions", actors: "Russian Forces", location: "Kherson Oblast", country: "Ukraine", lat: 46.6354, lng: 32.6169, fatalities: 0, notes: "Artillery and drone strikes reported across Kherson region", source: "OSINT aggregation", sourceUrl: "" },
  { id: "seed-ua-3", date: new Date().toISOString(), eventType: "battles", actors: "Ukrainian Forces; Russian Forces", location: "Zaporizhzhia Front", country: "Ukraine", lat: 47.8388, lng: 35.1396, fatalities: 0, notes: "Positional warfare along the Zaporizhzhia line of contact", source: "OSINT aggregation", sourceUrl: "" },
  { id: "seed-ua-4", date: new Date().toISOString(), eventType: "explosions", actors: "Russian Forces", location: "Kharkiv Oblast", country: "Ukraine", lat: 49.9935, lng: 36.2304, fatalities: 0, notes: "Missile and glide bomb strikes on Kharkiv infrastructure", source: "OSINT aggregation", sourceUrl: "" },
  { id: "seed-me-1", date: new Date().toISOString(), eventType: "explosions", actors: "Israeli Defense Forces", location: "Gaza Strip", country: "Palestine", lat: 31.3547, lng: 34.3088, fatalities: 0, notes: "IDF operations in central Gaza Strip", source: "OSINT aggregation", sourceUrl: "" },
  { id: "seed-me-2", date: new Date().toISOString(), eventType: "battles", actors: "IDF; Hezbollah", location: "Southern Lebanon", country: "Lebanon", lat: 33.2721, lng: 35.2033, fatalities: 0, notes: "Cross-border exchanges along the Blue Line", source: "OSINT aggregation", sourceUrl: "" },
  { id: "seed-me-3", date: new Date().toISOString(), eventType: "strategic_developments", actors: "Houthi Forces; US Navy", location: "Red Sea, Bab el-Mandeb", country: "Yemen", lat: 12.9, lng: 43.3, fatalities: 0, notes: "Houthi anti-shipping operations in the Bab el-Mandeb strait", source: "OSINT aggregation", sourceUrl: "" },
  { id: "seed-me-4", date: new Date().toISOString(), eventType: "explosions", actors: "US Forces; Iran-backed militia", location: "Eastern Syria", country: "Syria", lat: 35.3, lng: 40.1, fatalities: 0, notes: "Strikes near US base at al-Tanf and Deir ez-Zor", source: "OSINT aggregation", sourceUrl: "" },
  { id: "seed-af-1", date: new Date().toISOString(), eventType: "battles", actors: "RSF; Sudanese Armed Forces", location: "Khartoum, Sudan", country: "Sudan", lat: 15.5007, lng: 32.5599, fatalities: 0, notes: "Urban fighting between SAF and RSF in Greater Khartoum", source: "OSINT aggregation", sourceUrl: "" },
  { id: "seed-af-2", date: new Date().toISOString(), eventType: "violence_against_civilians", actors: "Armed militias", location: "North Kivu, DRC", country: "DRC", lat: -1.5, lng: 29.0, fatalities: 0, notes: "M23 and allied militia activity in eastern Congo", source: "OSINT aggregation", sourceUrl: "" },
  { id: "seed-af-3", date: new Date().toISOString(), eventType: "battles", actors: "Al-Shabaab; Somali Forces", location: "Lower Shabelle, Somalia", country: "Somalia", lat: 2.0469, lng: 45.3182, fatalities: 0, notes: "Al-Shabaab insurgency operations in southern Somalia", source: "OSINT aggregation", sourceUrl: "" },
  { id: "seed-as-1", date: new Date().toISOString(), eventType: "strategic_developments", actors: "PLA Navy; US Navy", location: "Taiwan Strait", country: "Taiwan", lat: 24.5, lng: 118.5, fatalities: 0, notes: "Increased naval patrols and air incursion activity", source: "OSINT aggregation", sourceUrl: "" },
  { id: "seed-as-2", date: new Date().toISOString(), eventType: "strategic_developments", actors: "PLA; Indian Armed Forces", location: "Aksai Chin / LAC", country: "China/India", lat: 35.0, lng: 79.0, fatalities: 0, notes: "Troop buildup along the Line of Actual Control", source: "OSINT aggregation", sourceUrl: "" },
  { id: "seed-as-3", date: new Date().toISOString(), eventType: "protests", actors: "Pro-democracy activists", location: "Dhaka, Bangladesh", country: "Bangladesh", lat: 23.8103, lng: 90.4125, fatalities: 0, notes: "Mass protests and political unrest", source: "OSINT aggregation", sourceUrl: "" },
  { id: "seed-mm-1", date: new Date().toISOString(), eventType: "battles", actors: "Resistance Forces; Myanmar Military", location: "Shan State, Myanmar", country: "Myanmar", lat: 20.7, lng: 97.0, fatalities: 0, notes: "Ethnic armed organizations advance against junta positions", source: "OSINT aggregation", sourceUrl: "" },
];

function articleToEvent(article: GdeltArticle, index: number): OsintEvent | null {
  const title = article.title || "";
  const geoLat = article.actiongeo_lat;
  const geoLng = article.actiongeo_long;

  if (!geoLat && !geoLng) return null;
  if (geoLat === 0 && geoLng === 0) return null;

  const seenDate = article.seendate || "";
  const id = `gdelt-${Buffer.from(title.slice(0, 50) + seenDate).toString("base64url").slice(0, 16)}`;

  return {
    id,
    date: seenDate ? parseGdeltDate(seenDate) : new Date().toISOString(),
    eventType: classifyEventType(title),
    actors: "",
    location: title.length > 80 ? title.slice(0, 77) + "..." : title,
    country: article.sourcecountry || article.domain?.split(".").pop()?.toUpperCase() || "",
    lat: geoLat!,
    lng: geoLng!,
    fatalities: extractFatalities(title),
    notes: title,
    source: article.domain || "GDELT",
    sourceUrl: article.url || "",
    tone: article.tone,
  };
}

async function fetchGdeltEvents(): Promise<{ events: OsintEvent[]; clusters: ReturnType<typeof clusterGeoFeatures> }> {
  const query = "conflict OR military OR attack OR bombing";

  // Fetch articles and geo data in parallel
  const [articles, geoFeatures] = await Promise.all([
    docSearch({ query, maxRecords: 100, timespan: "7d", timeoutMs: 8000 }),
    geoSearch({ query, timespan: "7d", timeoutMs: 8000 }),
  ]);

  // Convert articles to events
  const seen = new Set<string>();
  const events: OsintEvent[] = [];
  for (const article of articles) {
    const event = articleToEvent(article, events.length);
    if (event && !seen.has(event.id)) {
      seen.add(event.id);
      events.push(event);
    }
  }

  // Cluster geo features to detect geographic convergence
  const clusters = clusterGeoFeatures(geoFeatures, 50);

  return { events, clusters };
}

export async function GET() {
  const tierCheck = await requireTier("free");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const { events: liveEvents, clusters } = await fetchGdeltEvents();
    const events = liveEvents.length > 0 ? liveEvents : SEED_EVENTS;

    const response: OsintResponse & { clusters?: unknown } = {
      events,
      timestamp: Date.now(),
      totalCount: events.length,
    };

    // Include geographic clusters when available
    if (clusters.length > 0) {
      response.clusters = clusters.map((c) => ({
        center: { lat: c.center[1], lng: c.center[0] },
        articleCount: c.count,
        totalMentions: c.totalMentions,
        locations: c.features.map((f) => f.properties.name).filter(Boolean),
      }));
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("OSINT API error:", error);
    return NextResponse.json({
      events: SEED_EVENTS,
      timestamp: Date.now(),
      totalCount: SEED_EVENTS.length,
    } as OsintResponse);
  }
}
