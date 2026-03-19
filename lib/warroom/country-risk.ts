/**
 * Country Intelligence Index
 * ==========================
 * Composite risk scoring per country, aggregating:
 * - OSINT event density (conflict, protests, violence)
 * - Game theory escalation probability
 * - Chokepoint exposure
 * - Signal intensity in region
 * - Actor power and posture
 *
 * Score: 0-100 (0 = stable, 100 = critical)
 */

import { db, schema } from "@/lib/db";
import { eq, sql, gte } from "drizzle-orm";
import { COUNTRIES, computeTeamPower } from "@/lib/game-theory/countries";

export interface CountryRisk {
  code: string;
  name: string;
  region: string;
  riskScore: number; // 0-100
  riskLevel: "low" | "moderate" | "elevated" | "high" | "critical";
  components: {
    osintDensity: number;     // 0-25: recent event count normalized
    signalIntensity: number;  // 0-25: active signal intensity in region
    escalationRisk: number;   // 0-25: game theory scenario proximity
    chokepointExposure: number; // 0-15: controls/contests critical infrastructure
    powerImbalance: number;   // 0-10: military power relative to adversaries
  };
  recentEvents: number;
  activeScenarios: string[];
  lat: number;
  lng: number;
}

// Countries involved in active scenarios
const SCENARIO_COUNTRIES: Record<string, string[]> = {
  "taiwan-strait": ["TW", "CN", "US", "JP"],
  "iran-nuclear": ["IR", "IL", "US", "SA"],
  "opec-production": ["SA", "US", "RU"],
  "russia-ukraine": ["RU", "UA", "US"],
  "us-china-trade": ["US", "CN"],
  "hormuz-crisis": ["IR", "US", "SA", "AE"],
  "india-pakistan": ["IN", "PK"],
  "red-sea-shipping": ["YE", "IR", "US", "EG"],
  "eu-energy": ["DE", "FR", "RU"],
  "dprk-provocation": ["KP", "US", "KR", "JP"],
};

// Chokepoint countries (controls or contests)
const CHOKEPOINT_COUNTRIES: Record<string, number> = {
  IR: 15, // Hormuz
  EG: 12, // Suez
  YE: 10, // Bab el-Mandeb
  DJ: 8,  // Bab el-Mandeb
  MY: 6,  // Malacca
  SG: 6,  // Malacca
  ID: 5,  // Malacca
  TR: 8,  // Bosphorus
  PA: 7,  // Panama Canal
};

// Region mapping for signal aggregation
const REGION_KEYWORDS: Record<string, string[]> = {
  "Middle East": ["iran", "israel", "saudi", "iraq", "syria", "yemen", "hormuz", "opec", "oil"],
  "East Asia": ["china", "taiwan", "japan", "korea", "semiconductor", "south china sea"],
  "Europe": ["russia", "ukraine", "nato", "eu", "energy", "gas", "nord stream"],
  "South Asia": ["india", "pakistan", "kashmir", "modi"],
  "Africa": ["sahel", "sudan", "ethiopia", "libya", "niger"],
  "Americas": ["us", "trump", "fed", "dollar", "trade"],
};

function classifyRiskLevel(score: number): CountryRisk["riskLevel"] {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "elevated";
  if (score >= 20) return "moderate";
  return "low";
}

/**
 * Compute risk index for all tracked countries.
 * Aggregates OSINT events, signal intensity, game theory scenarios,
 * and chokepoint exposure into a 0-100 score.
 */
export async function computeCountryRiskIndex(): Promise<CountryRisk[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  // Fetch recent OSINT events per country
  const osintCounts = await db.execute(sql`
    SELECT
      UPPER(COALESCE(
        NULLIF(properties::json->>'country', ''),
        NULLIF(properties::json->>'sourceCountry', '')
      )) as country_code,
      count(*)::int as event_count
    FROM entities
    WHERE type = 'event'
      AND source_type = 'osint'
      AND created_at >= ${sevenDaysAgo}
    GROUP BY 1
    HAVING UPPER(COALESCE(
      NULLIF(properties::json->>'country', ''),
      NULLIF(properties::json->>'sourceCountry', '')
    )) IS NOT NULL
  `).catch(() => ({ rows: [] }));

  const osintByCountry = new Map<string, number>();
  for (const row of osintCounts.rows as Array<{ country_code: string; event_count: number }>) {
    if (row.country_code) osintByCountry.set(row.country_code, row.event_count);
  }

  // Fetch active signal intensity per region
  const activeSignals = await db.select({
    title: schema.signals.title,
    intensity: schema.signals.intensity,
    category: schema.signals.category,
  }).from(schema.signals)
    .where(eq(schema.signals.status, "active"))
    .catch(() => []);

  // Map signal intensity to regions
  const signalByRegion = new Map<string, number>();
  for (const signal of activeSignals) {
    const titleLower = (signal.title || "").toLowerCase();
    for (const [region, keywords] of Object.entries(REGION_KEYWORDS)) {
      if (keywords.some(k => titleLower.includes(k))) {
        signalByRegion.set(region, (signalByRegion.get(region) || 0) + signal.intensity);
      }
    }
  }

  // Fetch active game theory scenario states
  const scenarioStates = await db.select().from(schema.scenarioStates)
    .catch(() => []);

  const activeScenarioIds = new Set(scenarioStates.map(s => s.scenarioId));

  // Build risk profiles
  const results: CountryRisk[] = [];
  const maxOsint = Math.max(1, ...Array.from(osintByCountry.values()));
  const maxSignal = Math.max(1, ...Array.from(signalByRegion.values()));

  for (const country of COUNTRIES) {
    // OSINT density (0-25)
    const eventCount = osintByCountry.get(country.code) || 0;
    const osintDensity = Math.min(25, Math.round((eventCount / maxOsint) * 25));

    // Signal intensity in region (0-25)
    const regionSignal = signalByRegion.get(country.region) || 0;
    const signalIntensity = Math.min(25, Math.round((regionSignal / maxSignal) * 25));

    // Escalation risk from game theory (0-25)
    const countryScenarios: string[] = [];
    for (const [scenarioId, countries] of Object.entries(SCENARIO_COUNTRIES)) {
      if (countries.includes(country.code)) {
        countryScenarios.push(scenarioId);
      }
    }
    const activeForCountry = countryScenarios.filter(s => activeScenarioIds.has(s));
    const escalationRisk = Math.min(25, countryScenarios.length * 5 + activeForCountry.length * 8);

    // Chokepoint exposure (0-15)
    const chokepointExposure = CHOKEPOINT_COUNTRIES[country.code] || 0;

    // Power imbalance (0-10) - higher military capability = higher risk factor
    const power = computeTeamPower([country.code]);
    const powerImbalance = Math.min(10, Math.round(power.military / 10));

    const riskScore = Math.min(100, osintDensity + signalIntensity + escalationRisk + chokepointExposure + powerImbalance);

    results.push({
      code: country.code,
      name: country.name,
      region: country.region,
      riskScore,
      riskLevel: classifyRiskLevel(riskScore),
      components: {
        osintDensity,
        signalIntensity,
        escalationRisk,
        chokepointExposure,
        powerImbalance,
      },
      recentEvents: eventCount,
      activeScenarios: countryScenarios,
      lat: country.lat,
      lng: country.lng,
    });
  }

  return results.sort((a, b) => b.riskScore - a.riskScore);
}
