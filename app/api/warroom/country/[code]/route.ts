import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signals as signalsTable, predictions } from "@/lib/db/schema";
import { desc, sql, eq } from "drizzle-orm";
import { COUNTRIES, getCountryCapability } from "@/lib/game-theory/countries";
import { CONFLICT_ZONES } from "@/lib/warroom/geo-constants";
import { requireTier } from "@/lib/auth/require-tier";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  const { code } = await params;
  const upper = code.toUpperCase();
  const country = COUNTRIES.find((c) => c.code === upper);

  if (!country) {
    return NextResponse.json({ error: "Country not found" }, { status: 404 });
  }

  try {
    // Capability profile
    const capabilities = getCountryCapability(upper);

    // Search signals mentioning this country by name or code
    const countrySignals = await db
      .select()
      .from(signalsTable)
      .where(
        sql`(
          lower(${signalsTable.title}) LIKE ${`%${country.name.toLowerCase()}%`}
          OR lower(${signalsTable.description}) LIKE ${`%${country.name.toLowerCase()}%`}
          OR lower(${signalsTable.geopoliticalContext}) LIKE ${`%${country.name.toLowerCase()}%`}
        )`
      )
      .orderBy(desc(signalsTable.intensity))
      .limit(20);

    // Predictions mentioning this country
    const countryPredictions = await db
      .select()
      .from(predictions)
      .where(
        sql`lower(${predictions.claim}) LIKE ${`%${country.name.toLowerCase()}%`}`
      )
      .orderBy(desc(predictions.confidence))
      .limit(10);

    // Nearby conflict zones (within 2000km of country center)
    const nearbyConflictZones = CONFLICT_ZONES.filter((zone) => {
      const dlat = zone.center.lat - country.lat;
      const dlng = zone.center.lng - country.lng;
      const approxKm = Math.sqrt(dlat * dlat + dlng * dlng) * 111;
      return approxKm < 2000;
    });

    // Compute instability index (0-100)
    const signalIntensitySum = countrySignals.reduce((s, sig) => s + sig.intensity, 0);
    const maxSignalContribution = Math.min(40, signalIntensitySum * 2);
    const conflictContribution = nearbyConflictZones.reduce(
      (s, z) => s + z.escalationLevel * 5,
      0
    );
    const capabilityRisk = (capabilities.nuclear + capabilities.proxy) / 2;
    const instabilityIndex = Math.min(
      100,
      Math.round(maxSignalContribution + Math.min(30, conflictContribution) + capabilityRisk * 0.3)
    );

    // Format signals
    const formattedSignals = countrySignals.map((s) => ({
      id: s.id,
      uuid: s.uuid,
      title: s.title,
      date: s.date,
      intensity: s.intensity,
      category: s.category,
      status: s.status,
    }));

    // Format predictions
    const formattedPredictions = countryPredictions.map((p) => ({
      id: p.id,
      uuid: p.uuid,
      claim: p.claim,
      confidence: p.confidence,
      deadline: p.deadline,
      outcome: p.outcome,
      category: p.category,
    }));

    return NextResponse.json({
      country: {
        code: country.code,
        name: country.name,
        lat: country.lat,
        lng: country.lng,
        region: country.region,
        weight: country.weight,
        actorId: country.actorId || null,
      },
      instabilityIndex,
      capabilities,
      signals: formattedSignals,
      predictions: formattedPredictions,
      conflictZones: nearbyConflictZones.map((z) => ({
        name: z.name,
        escalationLevel: z.escalationLevel,
      })),
    }, {
      headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Country API error:", error);
    return NextResponse.json({ error: "Failed to load country data" }, { status: 500 });
  }
}
