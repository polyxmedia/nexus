import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { requireTier } from "@/lib/auth/require-tier";
import { validateOrigin } from "@/lib/security/csrf";

// POST - auto-create relationships between a source and entities mentioned in its content
export async function POST(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const { sourceType, sourceId } = await req.json();
    if (!sourceType || !sourceId) {
      return NextResponse.json({ error: "sourceType and sourceId required" }, { status: 400 });
    }

    // Get source content
    let sourceText = "";
    let sourceEntityName = "";

    switch (sourceType) {
      case "signal": {
        const [signal] = await db.select().from(schema.signals).where(eq(schema.signals.id, sourceId));
        if (!signal) return NextResponse.json({ error: "Signal not found" }, { status: 404 });
        sourceText = `${signal.title} ${signal.description} ${signal.geopoliticalContext || ""} ${signal.historicalPrecedent || ""}`;
        sourceEntityName = signal.title;
        break;
      }
      case "thesis": {
        const [thesis] = await db.select().from(schema.theses).where(eq(schema.theses.id, sourceId));
        if (!thesis) return NextResponse.json({ error: "Thesis not found" }, { status: 404 });
        sourceText = `${thesis.executiveSummary} ${thesis.situationAssessment} ${thesis.riskScenarios}`;
        sourceEntityName = `Thesis: ${thesis.executiveSummary.slice(0, 50)}`;
        break;
      }
      case "prediction": {
        const [prediction] = await db.select().from(schema.predictions).where(eq(schema.predictions.id, sourceId));
        if (!prediction) return NextResponse.json({ error: "Prediction not found" }, { status: 404 });
        sourceText = prediction.claim;
        sourceEntityName = `Prediction: ${prediction.claim.slice(0, 50)}`;
        break;
      }
      default:
        return NextResponse.json({ error: "sourceType must be signal, thesis, or prediction" }, { status: 400 });
    }

    // Find or create source entity
    let [sourceEntity] = await db
      .select()
      .from(schema.entities)
      .where(eq(schema.entities.name, sourceEntityName));

    if (!sourceEntity) {
      [sourceEntity] = await db
        .insert(schema.entities)
        .values({
          name: sourceEntityName,
          type: sourceType,
          properties: JSON.stringify({ sourceId, sourceType }),
        })
        .returning();
    }

    // Find all existing entities mentioned in the source text
    const allEntities = await db.select().from(schema.entities);
    const mentioned = allEntities.filter(
      (e) => e.id !== sourceEntity.id && e.name.length > 2 && sourceText.toLowerCase().includes(e.name.toLowerCase())
    );

    // Create relationships
    let created = 0;
    for (const target of mentioned) {
      // Check if relationship already exists
      const existing = await db
        .select()
        .from(schema.relationships)
        .where(
          and(
            eq(schema.relationships.fromEntityId, sourceEntity.id),
            eq(schema.relationships.toEntityId, target.id)
          )
        );

      if (existing.length === 0) {
        await db.insert(schema.relationships).values({
          fromEntityId: sourceEntity.id,
          toEntityId: target.id,
          type: "mentions",
          weight: 1,
        });
        created++;
      }
    }

    return NextResponse.json({
      sourceEntity: { id: sourceEntity.id, name: sourceEntity.name },
      linkedEntities: mentioned.map((e) => ({ id: e.id, name: e.name, type: e.type })),
      created,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
